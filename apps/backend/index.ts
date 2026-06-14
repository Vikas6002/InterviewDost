import express from "express";
import { PreInterviewBody } from "./types";
import { scrapeGithub } from "./scrapers/github";
import cors from "cors";
import { prisma, withDb } from "./db";
import { getGroqChatCompletion } from "./sideband";
import { calculateResult } from "./result";
import { DEEPGRAM_API_KEY } from "./env";
import http from "http";
import { WebSocketServer, WebSocket as WsWebSocket } from "ws";
import { authRouter } from "./auth";

const app = express();
app.use(express.json());
app.use(cors());
app.use("/api/v1/auth", authRouter);

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

async function getUserFromToken(token: string | undefined) {
  if (!token) return null;
  const session = await withDb(() =>
    prisma.session.findUnique({
      where: { token },
      include: { user: true },
    })
  );
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url!, `http://${request.headers.host}`);

  if (url.pathname === "/api/v1/ws") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      ws.on("error", () => {});
      (ws as any).interviewId = url.searchParams.get("interviewId");
      wss.emit("connection", ws, request);
    });
    return;
  }

  if (url.pathname === "/api/v1/stt") {
    wss.handleUpgrade(request, socket, head, (clientWs) => {
      clientWs.on("error", () => {});

      const dgWs = new WsWebSocket("wss://api.deepgram.com/v1/listen", {
        headers: { Authorization: `Token ${DEEPGRAM_API_KEY}` },
      });

      dgWs.on("open", () => {
        dgWs.send(JSON.stringify({ type: "Settings", configuration: { encoding: "linear16", sample_rate: 16000, channels: 1 } }));
        clientWs.send(JSON.stringify({ type: "connected" }));
      });

      dgWs.on("message", (data) => {
        if (clientWs.readyState === WsWebSocket.OPEN) {
          clientWs.send(data);
        }
      });

      dgWs.on("error", () => {});

      dgWs.on("close", () => {
        if (clientWs.readyState === WsWebSocket.OPEN) clientWs.close();
      });

      clientWs.on("message", (data) => {
        if (dgWs.readyState === WsWebSocket.OPEN) {
          dgWs.send(data);
        }
      });

      clientWs.on("close", () => {
        if (dgWs.readyState === WsWebSocket.OPEN) dgWs.close();
      });
    });
    return;
  }

  socket.destroy();
});

wss.on("connection", async (ws) => {
  const interviewId = (ws as any).interviewId as string;
  if (!interviewId) {
    ws.close(4000, "Missing interviewId");
    return;
  }

  const messages = await withDb(() => prisma.message.findMany({ where: { interviewId } }));
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
        await withDb(() =>
          prisma.message.create({
            data: { interviewId, type: "User", message: msg.text },
          })
        );
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

app.post("/api/v1/pre-interview", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = await getUserFromToken(token);
  if (!user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const { success, data } = PreInterviewBody.safeParse(req.body);
  if (!success) {
    res.status(411).json({ message: "Incorrect body" });
    return;
  }

  const githubUrl = data.github.endsWith("/") ? data.github.slice(0, -1) : data.github;
  const githubUsername = githubUrl.split("/").pop()!;
  const githubData = await scrapeGithub(githubUsername);

  const interview = await withDb(() =>
    prisma.interview.create({
      data: {
        userId: user.id,
        githubMetadata: JSON.stringify(githubData),
        status: "Pre",
      },
    })
  );

  res.json({ id: interview.id });
});

app.get("/api/v1/result/:interviewId", async (req, res) => {
  const interview = await withDb(() =>
    prisma.interview.findFirst({
      where: { id: req.params.interviewId },
      include: { conversations: true },
    })
  );

  if (!interview) {
    res.status(411).json({ message: "Interview not found" });
    return;
  }

  res.json({
    score: interview.score,
    feedback: interview.feedback,
    transcript: interview.conversations.map((c) => ({
      type: c.type,
      content: c.message,
      createdAt: c.createdAt,
    })),
    status: interview.status,
  });

  if (interview.status !== "Done") {
    const result = await calculateResult(interview.conversations);
    await withDb(() =>
      prisma.interview.update({
        where: { id: req.params.interviewId },
        data: { status: "Done", feedback: result.feedback, score: result.score },
      })
    );
  }
});

server.listen(3001);
