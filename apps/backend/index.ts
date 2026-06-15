import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import http from "http";
import { WebSocketServer, WebSocket as WsWebSocket } from "ws";

import { PreInterviewBody, TTSBody, WSMessageSchema } from "./types";
import { scrapeGithub } from "./scrapers/github";
import { prisma, withDb } from "./db";
import { getGroqChatCompletion } from "./sideband";
import { calculateResult } from "./result";
import { DEEPGRAM_API_KEY, FRONTEND_URL, NODE_ENV } from "./env";
import { authRouter } from "./auth";

const app = express();

app.use(
  helmet({
    contentSecurityPolicy:
      NODE_ENV === "production"
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'", "'unsafe-inline'"],
              styleSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://fonts.googleapis.com",
              ],
              fontSrc: ["'self'", "https://fonts.gstatic.com"],
              connectSrc: ["'self'", FRONTEND_URL, "wss://api.deepgram.com"],
              imgSrc: [
                "'self'",
                "data:",
                "https://*.githubusercontent.com",
                "https://images.unsplash.com",
              ],
              frameSrc: ["'none'"],
              objectSrc: ["'none'"],
            },
          }
        : false,
  }),
);

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 600,
  }),
);

app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests" },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: "Too many requests" },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/v1/auth", authRouter);

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

async function getUserFromToken(token: string | undefined) {
  if (!token) return null;
  const session = await withDb(() =>
    prisma.session.findUnique({
      where: { token },
      include: { user: true },
    }),
  );
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

function getTokenFromRequest(request: http.IncomingMessage): string | null {
  const cookieHeader = request.headers.cookie;
  if (cookieHeader) {
    const match = cookieHeader.match(/session_token=([^;]+)/);
    if (match) return match[1];
  }
  const url = new URL(request.url!, `http://${request.headers.host}`);
  return url.searchParams.get("token");
}

server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url!, `http://${request.headers.host}`);

  if (url.pathname === "/api/v1/ws") {
    socket.on("error", () => {});

    getTokenFromRequest(request).then((token) => {
      if (!token) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }
      getUserFromToken(token).then((user) => {
        if (!user) {
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
          return;
        }

        wss.handleUpgrade(request, socket, head, (ws) => {
          ws.on("error", () => {});
          (ws as any).interviewId = url.searchParams.get("interviewId");
          (ws as any).userId = user.id;
          wss.emit("connection", ws, request);
        });
      });
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
        dgWs.send(
          JSON.stringify({
            type: "Settings",
            configuration: {
              encoding: "linear16",
              sample_rate: 16000,
              channels: 1,
            },
          }),
        );
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
  const userId = (ws as any).userId as string;

  if (!interviewId) {
    ws.close(4000, "Missing interviewId");
    return;
  }

  const interview = await withDb(() =>
    prisma.interview.findUnique({
      where: { id: interviewId },
    }),
  );

  if (!interview || interview.userId !== userId) {
    ws.close(4001, "Unauthorized");
    return;
  }

  const messages = await withDb(() =>
    prisma.message.findMany({
      where: { interviewId },
      orderBy: { createdAt: "asc" },
    }),
  );

  if (messages.length === 0) {
    try {
      const greeting = await getGroqChatCompletion(interviewId);
      ws.send(JSON.stringify({ type: "ai_message", text: greeting }));
    } catch (error) {
      console.error("Greeting error:", error);
      ws.send(
        JSON.stringify({ type: "error", message: "Failed to start interview" }),
      );
    }
  }

  ws.on("message", async (data) => {
    try {
      const raw = JSON.parse(data.toString());
      const parsed = WSMessageSchema.safeParse(raw);
      if (!parsed.success) {
        ws.send(
          JSON.stringify({ type: "error", message: "Invalid message format" }),
        );
        return;
      }

      const { text } = parsed.data;
      const sanitized = text.replace(/<[^>]*>/g, "").slice(0, 2000);

      await withDb(() =>
        prisma.message.create({
          data: { interviewId, type: "User", message: sanitized },
        }),
      );

      const aiText = await getGroqChatCompletion(interviewId);
      ws.send(JSON.stringify({ type: "ai_message", text: aiText }));
    } catch (error) {
      console.error("WebSocket message error:", error);
      ws.send(
        JSON.stringify({ type: "error", message: "Failed to process message" }),
      );
    }
  });

  ws.on("close", () => {
    console.log("WebSocket closed for interview:", interviewId);
  });
});

app.post("/api/v1/tts", sensitiveLimiter, async (req, res) => {
  const parsed = TTSBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
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
      body: JSON.stringify({ text: parsed.data.text }),
    });

    if (!response.ok) {
      const err = await response.text();
      res.status(502).json({ error: "TTS service error" });
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

app.post("/api/v1/pre-interview", sensitiveLimiter, async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = await getUserFromToken(token);
  if (!user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const parsed = PreInterviewBody.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({
        error: parsed.error.issues[0]?.message ?? "Invalid request body",
      });
    return;
  }

  const githubUrl = parsed.data.github.replace(/\/$/, "");
  const githubUsername = githubUrl.split("/").pop()!;

  const allowedChars = /^[a-zA-Z0-9_-]+$/;
  if (!allowedChars.test(githubUsername)) {
    res.status(400).json({ error: "Invalid GitHub username" });
    return;
  }

  const githubData = await scrapeGithub(githubUsername);

  if (!githubData || (Array.isArray(githubData) && githubData.length === 0)) {
    res
      .status(404)
      .json({ error: "GitHub profile not found or has no public repos" });
    return;
  }

  const interview = await withDb(() =>
    prisma.interview.create({
      data: {
        userId: user.id,
        githubMetadata: JSON.stringify(githubData),
        status: "Pre",
      },
    }),
  );

  res.json({ id: interview.id });
});

app.get("/api/v1/result/:interviewId", sensitiveLimiter, async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = await getUserFromToken(token);
  if (!user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  if (
    typeof req.params.interviewId !== "string" ||
    req.params.interviewId.length > 100
  ) {
    res.status(400).json({ error: "Invalid interview ID" });
    return;
  }

  const interview = await withDb(() =>
    prisma.interview.findFirst({
      where: {
        id: req.params.interviewId,
        userId: user.id,
      },
      include: { conversations: true },
    }),
  );

  if (!interview) {
    res.status(404).json({ message: "Interview not found" });
    return;
  }

  res.json({
    score: interview.score,
    feedback: interview.feedback,
    transcript: interview.conversations.map(
      (c: { type: string; message: string; createdAt: Date }) => ({
        type: c.type,
        content: c.message,
        createdAt: c.createdAt,
      }),
    ),
    status: interview.status,
  });

  if (interview.status !== "Done") {
    try {
      const result = await calculateResult(interview.conversations);
      await withDb(() =>
        prisma.interview.update({
          where: { id: req.params.interviewId },
          data: {
            status: "Done",
            feedback: result.feedback,
            score: result.score,
          },
        }),
      );
    } catch (error) {
      console.error("Result calculation error:", error);
    }
  }
});

server.listen(3001, () => {
  console.log("Backend server running on port 3001");
});
