import express from "express";
import { PreInterviewBody } from "./types";
import { scrapeGithub } from "./scrapers/github";
import cors from "cors";
import { prisma } from "./db";
import { getGroqChatCompletion } from "./sideband";
import { calculateResult } from "./result";
import { DEEPGRAM_API_KEY } from "./env";
import http from "http";
import { WebSocketServer } from "ws";

const app = express();
app.use(express.json());
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url!, `http://${request.headers.host}`);
  if (url.pathname === "/api/v1/ws") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      ws.on("error", () => {});
      (ws as any).interviewId = url.searchParams.get("interviewId");
      wss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on("connection", async (ws) => {
  const interviewId = (ws as any).interviewId as string;
  if (!interviewId) {
    ws.close(4000, "Missing interviewId");
    return;
  }

  const messages = await prisma.message.findMany({ where: { interviewId } });
  if (messages.length === 0) {
    try {
      const greeting = await getGroqChatCompletion(interviewId);
      ws.send(JSON.stringify({ type: "ai_message", text: greeting }));
    } catch (error) {
      console.error("Greeting error:", error);
      ws.send(JSON.stringify({ type: "error", message: "Failed to start interview" }));
    }
  }

  ws.on("message", async (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === "user_message" && msg.text?.trim()) {
        await prisma.message.create({
          data: { interviewId, type: "User", message: msg.text },
        });
        const aiText = await getGroqChatCompletion(interviewId);
        ws.send(JSON.stringify({ type: "ai_message", text: aiText }));
      }
    } catch (error) {
      console.error("WebSocket message error:", error);
      ws.send(JSON.stringify({ type: "error", message: "Failed to process message" }));
    }
  });

  ws.on("close", () => {
    console.log("WebSocket closed for interview:", interviewId);
  });
});

app.post("/api/v1/tts", async (req, res) => {
  const { text } = req.body;
  if (!text) {
    res.status(400).json({ error: "Missing text" });
    return;
  }
  try {
    const response = await fetch("https://api.deepgram.com/v1/speak", {
      method: "POST",
      headers: {
        Authorization: `Token ${DEEPGRAM_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) {
      const err = await response.text();
      res.status(500).json({ error: `Deepgram TTS error: ${err}` });
      return;
    }
    const audioBuffer = await response.arrayBuffer();
    res.set("Content-Type", "audio/mpeg");
    res.send(Buffer.from(audioBuffer));
  } catch (error) {
    console.error("TTS error:", error);
    res.status(500).json({ error: "TTS failed" });
  }
});

app.get("/api/v1/config", async (_req, res) => {
  res.json({ deepgramApiKey: DEEPGRAM_API_KEY });
});

app.post("/api/v1/pre-interview", async (req, res) => {
  const { success, data } = PreInterviewBody.safeParse(req.body);

  if (!success) {
    res.status(411).json({
      message: "Incorrect body",
    });
    return;
  }

  const githubUrl = data.github.endsWith("/") ? data.github.slice(0, -1) : data.github;
  const githubUsername = githubUrl.split("/").pop()!;
  const githubData = await scrapeGithub(githubUsername);

  const interview = await prisma.interview.create({
    data: {
      githubMetadata: JSON.stringify(githubData),
      status: "Pre",
    },
  });

  res.json({ id: interview.id });
});

app.post("/api/v1/session/user/response/:interviewId", async (req, res) => {
  const { message } = req.body;
  await prisma.message.create({
    data: {
      interviewId: req.params.interviewId!,
      type: "User",
      message: message,
    },
  });

  res.json({ message: "Message saved" });
});

app.get("/api/v1/result/:interviewId", async (req, res) => {
  const interview = await prisma.interview.findFirst({
    where: {
      id: req.params.interviewId,
    },
    include: {
      conversations: true,
    },
  });

  if (!interview) {
    res.status(411).json({
      message: "Interview not found",
    });
    return;
  }

  res.json({
    score: interview?.score,
    feedback: interview?.feedback,
    transcript: interview?.conversations.map((c: { type: string; message: string; createdAt: Date }) => ({
      type: c.type,
      content: c.message,
      createdAt: c.createdAt,
    })),
    status: interview.status,
  });

  if (interview.status != "Done") {
    const result = await calculateResult(interview.conversations);

    await prisma.interview.update({
      where: {
        id: req.params.interviewId,
      },
      data: {
        status: "Done",
        feedback: result.feedback,
        score: result.score,
      },
    });
  }
});

server.listen(3001);
