import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import http from "http";
import { WebSocketServer, WebSocket as WsWebSocket } from "ws";

import { PreInterviewBody, ResumeInterviewBody, TTSBody, WSMessageSchema } from "./types";
import { scrapeGithub } from "./scrapers/github";
import { prisma, withDb } from "./db";
import { getGroqChatCompletion } from "./sideband";
import { calculateResult } from "./result";
import { DEEPGRAM_API_KEY, FRONTEND_URL, NODE_ENV } from "./env";
import { authRouter } from "./auth";

const app = express();

const cspDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-inline'"],
  styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  fontSrc: ["'self'", "https://fonts.gstatic.com"],
  connectSrc: ["'self'", FRONTEND_URL, "wss://api.deepgram.com"],
  imgSrc: ["'self'", "data:", "https://*.githubusercontent.com", "https://images.unsplash.com"],
  frameSrc: ["'none'"],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
};

app.use(
  helmet({
    contentSecurityPolicy: NODE_ENV === "production" ? { directives: cspDirectives } : false,
    crossOriginEmbedderPolicy: false,
    hsts: NODE_ENV === "production" ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  }),
);

app.disable("x-powered-by");

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

const TOKEN_HEADER_REGEX = /^Bearer\s+(.+)$/;

function extractToken(req: express.Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const match = header.match(TOKEN_HEADER_REGEX);
  return match?.[1]?.trim() ?? null;
}

async function getUserFromToken(token: string | null | undefined) {
  if (!token || token.length > 200) return null;
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
    if (match?.[1]) return match[1];
  }
  const url = new URL(request.url!, `http://${request.headers.host}`);
  return url.searchParams.get("token");
}

server.on("upgrade", async (request, socket, head) => {
  const url = new URL(request.url!, `http://${request.headers.host}`);

  if (url.pathname === "/api/v1/ws") {
    socket.on("error", () => {});

    const token = getTokenFromRequest(request);
    if (!token) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }
    const user = await getUserFromToken(token);
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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch("https://api.deepgram.com/v1/speak", {
      method: "POST",
      headers: {
        Authorization: `Token ${DEEPGRAM_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({ text: parsed.data.text }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      res.status(502).json({ error: "TTS service error" });
      return;
    }

    const audioBuffer = await response.arrayBuffer();
    res.set("Content-Type", "audio/mpeg");
    res.set("X-Content-Type-Options", "nosniff");
    res.send(Buffer.from(audioBuffer));
  } catch (error: unknown) {
    const msg = (error as Error).message ?? "";
    if (msg.includes("abort")) {
      res.status(504).json({ error: "TTS request timed out" });
    } else {
      res.status(500).json({ error: "TTS failed" });
    }
  }
});

const AUTH_REQUIRED = "Authentication required" as const;
const INVALID_REQUEST = "Invalid request body" as const;

async function authenticatedUser(req: express.Request, res: express.Response): Promise<{ id: string; username: string; avatarUrl: string | null } | null> {
  const token = extractToken(req);
  const user = await getUserFromToken(token);
  if (!user) {
    res.status(401).json({ error: AUTH_REQUIRED });
    return null;
  }
  return user;
}

app.post("/api/v1/pre-interview/github", sensitiveLimiter, async (req, res) => {
  const user = await authenticatedUser(req, res);
  if (!user) return;

  const parsed = PreInterviewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? INVALID_REQUEST });
    return;
  }

  const githubUrl = parsed.data.github.replace(/\/$/, "");
  const githubUsername = githubUrl.split("/").pop()!;

  const allowedChars = /^[a-zA-Z0-9_-]+$/;
  if (!allowedChars.test(githubUsername)) {
    res.status(400).json({ error: "Invalid GitHub username" });
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let githubData;
  try {
    githubData = await scrapeGithub(githubUsername);
  } finally {
    clearTimeout(timeout);
  }

  if (!githubData || (Array.isArray(githubData) && githubData.length === 0)) {
    res.status(404).json({ error: "GitHub profile not found or has no public repos" });
    return;
  }

  const interview = await withDb(() =>
    prisma.interview.create({
      data: {
        userId: user.id,
        type: "GitHub",
        githubMetadata: JSON.stringify(githubData),
        status: "Pre",
      },
    }),
  );

  res.status(201).json({ id: interview.id });
});

app.post("/api/v1/pre-interview/resume", sensitiveLimiter, async (req, res) => {
  const user = await authenticatedUser(req, res);
  if (!user) return;

  const parsed = ResumeInterviewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? INVALID_REQUEST });
    return;
  }

  const interview = await withDb(() =>
    prisma.interview.create({
      data: {
        userId: user.id,
        type: "Resume",
        jobRole: parsed.data.jobRole,
        resumeText: parsed.data.resumeText,
        status: "Pre",
      },
    }),
  );

  res.status(201).json({ id: interview.id });
});

app.get("/api/v1/interviews", sensitiveLimiter, async (req, res) => {
  const user = await authenticatedUser(req, res);
  if (!user) return;

  const interviews = await withDb(() =>
    prisma.interview.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { conversations: true },
    }),
  );

  res.json({
    interviews: interviews.map((i) => ({
      id: i.id,
      type: i.type,
      score: i.score,
      feedback: i.feedback,
      status: i.status,
      jobRole: i.jobRole,
      createdAt: i.createdAt,
      messageCount: i.conversations.length,
    })),
  });
});

app.get("/api/v1/dashboard/stats", sensitiveLimiter, async (req, res) => {
  const user = await authenticatedUser(req, res);
  if (!user) return;

  const interviews = await withDb(() =>
    prisma.interview.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    }),
  );

  const completed = interviews.filter((i) => i.status === "Done");
  const totalScore = completed.reduce((sum, i) => sum + i.score, 0);
  const averageScore = completed.length > 0
    ? Math.round((totalScore / completed.length) * 10) / 10
    : 0;

  const scoresOverTime = completed.map((i) => ({
    date: i.createdAt.toISOString(),
    score: i.score,
    type: i.type,
  }));

  const typeBreakdown = {
    github: interviews.filter((i) => i.type === "GitHub").length,
    resume: interviews.filter((i) => i.type === "Resume").length,
  };

  const statusCount = {
    completed: completed.length,
    inProgress: interviews.filter((i) => i.status === "InProgress").length,
    pre: interviews.filter((i) => i.status === "Pre").length,
  };

  res.json({
    totalInterviews: interviews.length,
    completedInterviews: completed.length,
    averageScore,
    scoresOverTime,
    typeBreakdown,
    statusCount,
  });
});

app.get("/api/v1/analytics", sensitiveLimiter, async (req, res) => {
  const user = await authenticatedUser(req, res);
  if (!user) return;

  const interviews = await withDb(() =>
    prisma.interview.findMany({
      where: { userId: user.id, status: "Done" },
      orderBy: { createdAt: "asc" },
    }),
  );

  const totalCompleted = interviews.length;
  const scoreList = interviews.map((i) => i.score);
  const bestScore = scoreList.length > 0 ? Math.max(...scoreList) : 0;
  const avgScore = scoreList.length > 0
    ? Math.round((scoreList.reduce((a, b) => a + b, 0) / scoreList.length) * 10) / 10
    : 0;
  const recentAvg = scoreList.slice(-3).length > 0
    ? Math.round((scoreList.slice(-3).reduce((a, b) => a + b, 0) / scoreList.slice(-3).length) * 10) / 10
    : 0;
  const improvement = scoreList.length >= 2
    ? Math.round(((scoreList[scoreList.length - 1] ?? 0) - (scoreList[0] ?? 0)) * 10) / 10
    : 0;

  const skillKeywords: Record<string, RegExp> = {
    "Data Structures": /array|linked list|stack|queue|tree|graph|hash|heap|trie/i,
    Algorithms: /sort|search|recursion|dp|dynamic.program|greedy|backtrack|divide|conquer/i,
    "System Design": /scalab|distributed|microservice|load.balanc|cache|database.shard|consistenthash/i,
    Databases: /sql|nosql|index|query|normaliz|transaction|acid|mongodb|postgres|mysql/i,
    "Web Dev": /react|api|rest|graphql|http|frontend|backend|full.stack|express|next/i,
    "Problem Solving": /complexity|optimize|refactor|edge.case|brute.force|efficient/i,
  };

  const skillScores: Record<string, number[]> = {};
  for (const key of Object.keys(skillKeywords)) {
    skillScores[key] = [];
  }

  for (const interview of interviews) {
    const combined = `${interview.feedback ?? ""} ${interview.jobRole ?? ""} ${interview.resumeText ?? ""}`;
    for (const [skill, regex] of Object.entries(skillKeywords)) {
      if (regex.test(combined)) {
        (skillScores[skill] ?? (skillScores[skill] = [])).push(interview.score);
      }
    }
  }

  const radarData = Object.entries(skillScores)
    .map(([skill, scores]) => ({
      skill,
      score: scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
        : 0,
      interviews: scores.length,
    }))
    .sort((a, b) => b.score - a.score);

  const feedbacks = interviews
    .filter((i) => i.feedback)
    .map((i) => i.feedback!);

  res.json({
    totalCompleted,
    bestScore,
    averageScore: avgScore,
    recentAverage: recentAvg,
    improvement,
    scoreList,
    radarData,
    feedbacks,
    recentInterviews: interviews.slice(-5).reverse().map((i) => ({
      id: i.id,
      score: i.score,
      type: i.type,
      jobRole: i.jobRole,
      createdAt: i.createdAt,
    })),
  });
});

app.get("/api/v1/result/:interviewId", sensitiveLimiter, async (req, res) => {
  const user = await authenticatedUser(req, res);
  if (!user) return;

  const interviewId = req.params.interviewId as string;
  if (
    !interviewId ||
    interviewId.length > 100 ||
    !/^[a-zA-Z0-9-]+$/.test(interviewId)
  ) {
    res.status(400).json({ error: "Invalid interview ID" });
    return;
  }

  const interview = await withDb(() =>
    prisma.interview.findFirst({
      where: { id: interviewId, userId: user.id },
      include: { conversations: true },
    }),
  ) as {
    id: string;
    userId: string;
    type: string;
    githubMetadata: any;
    jobRole: string | null;
    resumeText: string | null;
    status: string;
    score: number;
    feedback: string | null;
    createdAt: Date;
    conversations: { id: string; type: string; message: string; createdAt: Date }[];
  } | null;

  if (!interview) {
    res.status(404).json({ error: "Interview not found" });
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
    try {
      const result = await calculateResult(interview.conversations as { type: "User" | "Assistant"; message: string; createdAt: Date }[], {
        type: interview.type as "GitHub" | "Resume",
        jobRole: interview.jobRole,
        githubMetadata: interview.githubMetadata,
        resumeText: interview.resumeText,
      });
      await withDb(() =>
        prisma.interview.update({
          where: { id: interviewId },
          data: { status: "Done", feedback: result.feedback, score: result.score },
        }),
      );
    } catch {
      console.error("Result calculation error for interview:", interviewId);
    }
  }
});

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

server.listen(3001, () => {
  console.log("Backend server running on port 3001");
});
