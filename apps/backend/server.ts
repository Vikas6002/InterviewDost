// @ts-nocheck
import { createServer } from "http";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.js";
import { Router } from "express";
import { WebSocketServer, WebSocket as WsWebSocket } from "ws";

const PORT = Number(process.env.PORT ?? 3001);

const required = ["GROQ_API_KEY", "DEEPGRAM_API_KEY", "DATABASE_URL", "GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"] as const;
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required env variable: ${key}`);
}
const GROQ_API_KEY = process.env.GROQ_API_KEY!;
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY!;
const DATABASE_URL = process.env.DATABASE_URL!;
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!;
const FRONTEND_URL = process.env.FRONTEND_URL ?? "https://frontend-bice-one-8o0ryl9h02.vercel.app";
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3001";
const NODE_ENV = process.env.NODE_ENV ?? "development";
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID ?? "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? "";

const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 5, idleTimeoutMillis: 60000, connectionTimeoutMillis: 30000 });
pool.on("error", (err) => console.error("DB pool error:", err.message));
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: NODE_ENV === "development" ? ["warn", "error"] : ["error"] });

const MAX_RETRIES = 2;
async function withDb<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < MAX_RETRIES; i++) {
    try { return await fn(); }
    catch (e) {
      lastErr = e;
      const msg = (e as Error).message ?? "";
      if (msg.includes("Connection terminated") || msg.includes("socket") || msg.includes("timeout")) {
        if (i < MAX_RETRIES - 1) { await new Promise((r) => setTimeout(r, 200 * (i + 1))); continue; }
      }
      throw e;
    }
  }
  throw lastErr;
}

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
app.use(helmet({ contentSecurityPolicy: NODE_ENV === "production" ? { directives: cspDirectives } : false, crossOriginEmbedderPolicy: false, hsts: NODE_ENV === "production" ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false }));
app.disable("x-powered-by");
app.use(cors({ origin: FRONTEND_URL, credentials: true, methods: ["GET", "POST"], allowedHeaders: ["Content-Type", "Authorization"], maxAge: 600 }));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: { error: "Too many requests" }, standardHeaders: true, legacyHeaders: false });
app.use(globalLimiter);
const sensitiveLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: { error: "Too many requests" }, standardHeaders: true, legacyHeaders: false });

const CREDIT_COST = { GitHub: 5, Resume: 10, ATS: 2 };
const PRICING_PLANS = [
  { id: "free", name: "Free", credits: 50, price: 0, popular: false },
  { id: "starter", name: "Starter", credits: 500, price: 499, popular: true },
  { id: "pro", name: "Professional", credits: 2000, price: 1499, popular: false },
  { id: "unlimited", name: "Unlimited", credits: -1, price: 2999, popular: false },
];

function generateToken(): string { return crypto.randomBytes(48).toString("hex"); }
const TOKEN_HEADER_REGEX = /^Bearer\s+(.+)$/;
function extractToken(req: express.Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const match = header.match(TOKEN_HEADER_REGEX);
  return match?.[1]?.trim() ?? null;
}
async function getUserFromToken(token: string | null | undefined) {
  if (!token || token.length > 200) return null;
  const session = await withDb(() => prisma.session.findUnique({ where: { token }, include: { user: true } }));
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}
async function authenticatedUser(req: express.Request, res: express.Response): Promise<any | null> {
  const token = extractToken(req);
  const user = await getUserFromToken(token);
  if (!user) { res.status(401).json({ error: "Authentication required" }); return null; }
  return user;
}
async function deductCredits(userId: string, amount: number) {
  await withDb(() => prisma.user.update({ where: { id: userId }, data: { credits: { decrement: amount } } }));
}

function safeJsonArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === "string") try { const p = JSON.parse(val); return Array.isArray(p) ? p.map(String) : []; } catch { return []; }
  return [];
}

const authRouter = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: "Too many requests" }, standardHeaders: true, legacyHeaders: false });
authRouter.use(authLimiter);

authRouter.get("/github", (_req, res) => {
  const state = generateToken();
  const redirectUri = `${BACKEND_URL}/api/v1/auth/github/callback`;
  const url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user&state=${state}`;
  res.cookie("oauth_state", state, { httpOnly: true, sameSite: "lax", maxAge: 10 * 60 * 1000, secure: NODE_ENV === "production" });
  res.redirect(url);
});

authRouter.post("/logout", async (req, res) => {
  const token = extractToken(req);
  if (token) await withDb(() => prisma.session.deleteMany({ where: { token } }));
  res.json({ ok: true });
});

authRouter.get("/github/callback", async (req, res) => {
  const { code, state } = req.query;
  if (!code || typeof code !== "string") { res.status(400).json({ error: "Missing authorization code" }); return; }
  const cookieState = req.cookies?.oauth_state;
  if (cookieState && state !== cookieState) { res.status(400).json({ error: "Invalid state parameter" }); return; }

  const c1 = new AbortController(); const t1 = setTimeout(() => c1.abort(), 10000);
  let tokenRes;
  try { tokenRes = await fetch("https://github.com/login/oauth/access_token", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, client_secret: GITHUB_CLIENT_SECRET, code }), signal: c1.signal }); }
  finally { clearTimeout(t1); }
  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token as string;
  if (!accessToken) { res.redirect(`${FRONTEND_URL}/login?error=github_auth_failed`); return; }

  const c2 = new AbortController(); const t2 = setTimeout(() => c2.abort(), 10000);
  let userRes;
  try { userRes = await fetch("https://api.github.com/user", { headers: { Authorization: `Bearer ${accessToken}` }, signal: c2.signal }); }
  finally { clearTimeout(t2); }
  if (!userRes.ok) { res.redirect(`${FRONTEND_URL}/login?error=github_api_failed`); return; }
  const githubUser = await userRes.json();
  if (!githubUser.id || !githubUser.login) { res.redirect(`${FRONTEND_URL}/login?error=invalid_github_response`); return; }

  let user = await withDb(() => prisma.user.findUnique({ where: { githubId: String(githubUser.id) } }));
  if (!user) {
    user = await withDb(() => prisma.user.create({ data: { githubId: String(githubUser.id), username: String(githubUser.login).slice(0, 100), avatarUrl: githubUser.avatar_url ? String(githubUser.avatar_url).slice(0, 500) : "", credits: 50 } }));
  }
  const session = await withDb(() => prisma.session.create({ data: { userId: user.id, token: generateToken(), expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } }));
  res.redirect(`${FRONTEND_URL}?token=${session.token}`);
});

authRouter.get("/me", async (req, res) => {
  const token = extractToken(req);
  if (!token) { res.status(401).json({ error: "No token" }); return; }
  const session = await withDb(() => prisma.session.findUnique({ where: { token }, include: { user: true } }));
  if (!session || session.expiresAt < new Date()) { res.status(401).json({ error: "Invalid or expired session" }); return; }
  res.json({ user: { id: session.user.id, username: session.user.username, avatarUrl: session.user.avatarUrl, credits: session.user.credits, isUnlimited: session.user.isUnlimited } });
});

app.use("/api/v1/auth", authRouter);

const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", async (request, socket, head) => {
  const url = new URL(request.url!, `http://${request.headers.host}`);

  if (url.pathname === "/api/v1/ws") {
    socket.on("error", () => {});
    const token = extractToken({ headers: request.headers } as any);
    if (!token) { socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n"); socket.destroy(); return; }
    const user = await getUserFromToken(token);
    if (!user) { socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n"); socket.destroy(); return; }

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
        dgWs.send(JSON.stringify({ type: "Settings", configuration: { encoding: "linear16", sample_rate: 16000, channels: 1 } }));
        clientWs.send(JSON.stringify({ type: "connected" }));
      });
      dgWs.on("message", (data) => { if (clientWs.readyState === WsWebSocket.OPEN) clientWs.send(data); });
      dgWs.on("error", () => {});
      dgWs.on("close", () => { if (clientWs.readyState === WsWebSocket.OPEN) clientWs.close(); });
      clientWs.on("message", (data) => { if (dgWs.readyState === WsWebSocket.OPEN) dgWs.send(data); });
      clientWs.on("close", () => { if (dgWs.readyState === WsWebSocket.OPEN) dgWs.close(); });
    });
    return;
  }

  socket.destroy();
});

wss.on("connection", async (ws) => {
  const interviewId = (ws as any).interviewId as string;
  const userId = (ws as any).userId as string;

  if (!interviewId) { ws.close(4000, "Missing interviewId"); return; }

  const interview = await withDb(() => prisma.interview.findUnique({ where: { id: interviewId } }));
  if (!interview || interview.userId !== userId) { ws.close(4001, "Unauthorized"); return; }

  const messages = await withDb(() => prisma.message.findMany({ where: { interviewId }, orderBy: { createdAt: "asc" } }));
  if (messages.length === 0) {
    try { const greeting = await getGroqChatCompletion(interviewId); ws.send(JSON.stringify({ type: "ai_message", text: greeting })); }
    catch { ws.send(JSON.stringify({ type: "error", message: "Failed to start interview" })); }
  }

  ws.on("message", async (data) => {
    try {
      const raw = JSON.parse(data.toString());
      if (raw.type !== "user_message" || !raw.text || typeof raw.text !== "string") {
        ws.send(JSON.stringify({ type: "error", message: "Invalid message format" }));
        return;
      }
      const sanitized = raw.text.replace(/<[^>]*>/g, "").slice(0, 2000);
      await withDb(() => prisma.message.create({ data: { interviewId, type: "User", message: sanitized } }));
      const aiText = await getGroqChatCompletion(interviewId);
      ws.send(JSON.stringify({ type: "ai_message", text: aiText }));
    } catch { ws.send(JSON.stringify({ type: "error", message: "Failed to process message" })); }
  });

  ws.on("close", () => {});
});

async function getGroqChatCompletion(interviewId: string): Promise<string> {
  const interview = await withDb(() => prisma.interview.findFirst({ where: { id: interviewId }, include: { conversations: { orderBy: { createdAt: "asc" } } } }));
  if (!interview) throw new Error("Interview not found");

  const contextBlock = interview.type === "GitHub" && interview.githubMetadata
    ? `Here is the candidate's GitHub metadata for context:\n${interview.githubMetadata}`
    : interview.type === "Resume" && interview.resumeText && interview.jobRole
      ? `Here is the candidate's resume:\n${interview.resumeText}\n\nJob role they're applying for:\n${interview.jobRole}`
      : "No additional context available.";

  const systemMsg = {
    role: "system",
    content: `You are an AI interviewer conducting a technical interview. Use English only.\n\n${contextBlock}\n\nCRITICAL RULES - FOLLOW THESE EXACTLY:\n1. Ask ONLY ONE question at a time. Never ask multiple questions in a single message.\n2. Start with a brief greeting and ONE opening question.\n3. Wait for the candidate's answer before asking the next question.\n4. Keep your responses SHORT - at most 2-3 sentences.\n5. If the candidate gives a short or unclear answer, ask a friendly follow-up to help them elaborate.\n6. Do NOT repeat the same question if it wasn't answered. Instead, rephrase it gently.\n7. After the candidate answers, acknowledge their response briefly, then ask ONE follow-up or move to the next topic.\n8. Ask 3-4 questions total, one at a time. After the last answer, thank them and wrap up.`,
  };

  const msgs = [systemMsg, ...interview.conversations.map((c) => ({ role: c.type === "User" ? "user" : "assistant", content: c.message }))];

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: msgs, temperature: 0.7, max_tokens: 2048 }),
  });
  if (!res.ok) { const err = await res.text().catch(() => ""); throw new Error(`Groq API error (${res.status}): ${err}`); }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from Groq");

  await withDb(() => prisma.message.create({ data: { interviewId, type: "Assistant", message: content } }));
  return content;
}

async function calculateResult(messages: { type: "Assistant" | "User"; message: string; createdAt: Date }[], context?: { type: "GitHub" | "Resume"; jobRole?: string | null; githubMetadata?: any; resumeText?: string | null }) {
  const interviewContextStr = context ? `Type: ${context.type}${context.jobRole ? `, Job Description Provided` : ""}${context.type === "GitHub" && context.githubMetadata ? `, GitHub Repos analyzed` : ""}` : "General interview";
  const prompt = `You are an expert evaluator. Your job is to evaluate the user's interview. Give them a score out of 10 and also let them know any feedback you have about their interview.\n\nInterview context: ${interviewContextStr}\n\nPlease return only a JSON object with the following structure (no other text):\n{\n    "feedback": "your feedback here",\n    "score": <number between 0 and 10>\n}\n\nTranscript:\n${JSON.stringify(messages)}`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "system", content: prompt }], temperature: 0.3, max_tokens: 1024 }),
  });
  if (!res.ok) throw new Error(`Groq API error (${res.status})`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty response from Groq");
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const result = JSON.parse(cleaned);
  if (typeof result.score !== "number" || typeof result.feedback !== "string") throw new Error("Invalid result format");
  return { score: Math.max(0, Math.min(10, Math.round(result.score))), feedback: result.feedback.slice(0, 5000) };
}

async function scrapeGithub(username: string) {
  const res = await fetch(`https://api.github.com/users/${username}/repos`);
  if (!res.ok) return [];
  const data: any = await res.json();
  return data.map((x: any) => ({ description: x.description, name: x.name, fullName: x.full_name, starCount: x.stargazers_count }));
}

app.post("/api/v1/tts", sensitiveLimiter, async (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== "string" || text.length < 1 || text.length > 500) { res.status(400).json({ error: "Invalid request body" }); return; }
  try {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), 10000);
    const response = await fetch("https://api.deepgram.com/v1/speak", {
      method: "POST",
      headers: { Authorization: `Token ${DEEPGRAM_API_KEY}`, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({ text }),
      signal: c.signal,
    });
    clearTimeout(t);
    if (!response.ok) { res.status(502).json({ error: "TTS service error" }); return; }
    const audioBuffer = await response.arrayBuffer();
    res.set("Content-Type", "audio/mpeg");
    res.set("X-Content-Type-Options", "nosniff");
    res.send(Buffer.from(audioBuffer));
  } catch (error: unknown) {
    const msg = (error as Error).message ?? "";
    if (msg.includes("abort")) res.status(504).json({ error: "TTS request timed out" });
    else res.status(500).json({ error: "TTS failed" });
  }
});

app.post("/api/v1/pre-interview/github", sensitiveLimiter, async (req, res) => {
  const user = await authenticatedUser(req, res);
  if (!user) return;
  if (!user.isUnlimited && user.credits < CREDIT_COST.GitHub) { res.status(402).json({ error: "Insufficient credits" }); return; }

  const { github } = req.body;
  if (!github || typeof github !== "string" || !/^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9_-]+\/?$/.test(github)) {
    res.status(400).json({ error: "Valid GitHub profile URL required" }); return;
  }

  const githubUsername = github.replace(/\/$/, "").split("/").pop()!;
  if (!/^[a-zA-Z0-9_-]+$/.test(githubUsername)) { res.status(400).json({ error: "Invalid GitHub username" }); return; }

  const c = new AbortController(); const t = setTimeout(() => c.abort(), 15000);
  let githubData;
  try { githubData = await scrapeGithub(githubUsername); } finally { clearTimeout(t); }
  if (!githubData || githubData.length === 0) { res.status(404).json({ error: "GitHub profile not found or has no public repos" }); return; }

  if (!user.isUnlimited) await deductCredits(user.id, CREDIT_COST.GitHub);

  const interview = await withDb(() => prisma.interview.create({ data: { userId: user.id, type: "GitHub", githubMetadata: JSON.stringify(githubData), status: "Pre" } }));
  res.status(201).json({ id: interview.id });
});

app.post("/api/v1/pre-interview/resume", sensitiveLimiter, async (req, res) => {
  const user = await authenticatedUser(req, res);
  if (!user) return;
  if (!user.isUnlimited && user.credits < CREDIT_COST.Resume) { res.status(402).json({ error: "Insufficient credits" }); return; }

  const { resumeText, jobRole } = req.body;
  if (!resumeText || !jobRole || typeof resumeText !== "string" || typeof jobRole !== "string" || resumeText.length > 50000 || jobRole.length > 10000) {
    res.status(400).json({ error: "Invalid request body" }); return;
  }

  if (!user.isUnlimited) await deductCredits(user.id, CREDIT_COST.Resume);

  const interview = await withDb(() => prisma.interview.create({ data: { userId: user.id, type: "Resume", jobRole, resumeText, status: "Pre" } }));
  res.status(201).json({ id: interview.id });
});

app.get("/api/v1/interviews", sensitiveLimiter, async (req, res) => {
  const user = await authenticatedUser(req, res);
  if (!user) return;
  const interviews = await withDb(() => prisma.interview.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: { conversations: true } }));
  res.json({
    interviews: interviews.map((i) => ({
      id: i.id, type: i.type, score: i.score, feedback: i.feedback, status: i.status, jobRole: i.jobRole, createdAt: i.createdAt, messageCount: i.conversations.length,
    })),
  });
});

app.get("/api/v1/dashboard/stats", sensitiveLimiter, async (req, res) => {
  const user = await authenticatedUser(req, res);
  if (!user) return;
  const interviews = await withDb(() => prisma.interview.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }));
  const completed = interviews.filter((i) => i.status === "Done");
  const totalScore = completed.reduce((sum, i) => sum + i.score, 0);
  const averageScore = completed.length > 0 ? Math.round((totalScore / completed.length) * 10) / 10 : 0;
  res.json({
    totalInterviews: interviews.length,
    completedInterviews: completed.length,
    averageScore,
    scoresOverTime: completed.map((i) => ({ date: i.createdAt.toISOString(), score: i.score, type: i.type })),
    typeBreakdown: { github: interviews.filter((i) => i.type === "GitHub").length, resume: interviews.filter((i) => i.type === "Resume").length },
    statusCount: { completed: completed.length, inProgress: interviews.filter((i) => i.status === "InProgress").length, pre: interviews.filter((i) => i.status === "Pre").length },
  });
});

app.get("/api/v1/analytics", sensitiveLimiter, async (req, res) => {
  const user = await authenticatedUser(req, res);
  if (!user) return;
  const interviews = await withDb(() => prisma.interview.findMany({ where: { userId: user.id, status: "Done" }, orderBy: { createdAt: "asc" } }));

  const totalCompleted = interviews.length;
  const scoreList = interviews.map((i) => i.score);
  const bestScore = scoreList.length > 0 ? Math.max(...scoreList) : 0;
  const avgScore = scoreList.length > 0 ? Math.round((scoreList.reduce((a, b) => a + b, 0) / scoreList.length) * 10) / 10 : 0;
  const recentAvg = scoreList.slice(-3).length > 0 ? Math.round((scoreList.slice(-3).reduce((a, b) => a + b, 0) / scoreList.slice(-3).length) * 10) / 10 : 0;
  const improvement = scoreList.length >= 2 ? Math.round(((scoreList[scoreList.length - 1] ?? 0) - (scoreList[0] ?? 0)) * 10) / 10 : 0;

  const skillKeywords: Record<string, RegExp> = {
    "Data Structures": /array|linked list|stack|queue|tree|graph|hash|heap|trie/i,
    Algorithms: /sort|search|recursion|dp|dynamic.program|greedy|backtrack|divide|conquer/i,
    "System Design": /scalab|distributed|microservice|load.balanc|cache|database.shard|consistenthash/i,
    Databases: /sql|nosql|index|query|normaliz|transaction|acid|mongodb|postgres|mysql/i,
    "Web Dev": /react|api|rest|graphql|http|frontend|backend|full.stack|express|next/i,
    "Problem Solving": /complexity|optimize|refactor|edge.case|brute.force|efficient/i,
  };

  const skillScores: Record<string, number[]> = {};
  for (const key of Object.keys(skillKeywords)) skillScores[key] = [];
  for (const interview of interviews) {
    const combined = `${interview.feedback ?? ""} ${interview.jobRole ?? ""} ${interview.resumeText ?? ""}`;
    for (const [skill, regex] of Object.entries(skillKeywords)) {
      if (regex.test(combined)) (skillScores[skill] ?? (skillScores[skill] = [])).push(interview.score);
    }
  }

  res.json({
    totalCompleted, bestScore, averageScore: avgScore, recentAverage: recentAvg, improvement, scoreList,
    radarData: Object.entries(skillScores).map(([skill, scores]) => ({ skill, score: scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0, interviews: scores.length })).sort((a, b) => b.score - a.score),
    feedbacks: interviews.filter((i) => i.feedback).map((i) => i.feedback!),
    recentInterviews: interviews.slice(-5).reverse().map((i) => ({ id: i.id, score: i.score, type: i.type, jobRole: i.jobRole, createdAt: i.createdAt })),
  });
});

app.get("/api/v1/result/:interviewId", sensitiveLimiter, async (req, res) => {
  const user = await authenticatedUser(req, res);
  if (!user) return;
  const interviewId = req.params.interviewId;
  if (!interviewId || interviewId.length > 100 || !/^[a-zA-Z0-9-]+$/.test(interviewId)) { res.status(400).json({ error: "Invalid interview ID" }); return; }

  const interview = await withDb(() => prisma.interview.findFirst({ where: { id: interviewId, userId: user.id }, include: { conversations: true } }));
  if (!interview) { res.status(404).json({ error: "Interview not found" }); return; }

  res.json({
    score: interview.score,
    feedback: interview.feedback,
    transcript: interview.conversations.map((c) => ({ type: c.type, content: c.message, createdAt: c.createdAt })),
    status: interview.status,
  });

  if (interview.status !== "Done") {
    try {
      const result = await calculateResult(interview.conversations, { type: interview.type as any, jobRole: interview.jobRole, githubMetadata: interview.githubMetadata, resumeText: interview.resumeText });
      await withDb(() => prisma.interview.update({ where: { id: interviewId }, data: { status: "Done", feedback: result.feedback, score: result.score } }));
    } catch { console.error("Result calculation error for interview:", interviewId); }
  }
});

app.get("/api/v1/pricing", (_req, res) => { res.json({ plans: PRICING_PLANS }); });

app.get("/api/v1/credits", sensitiveLimiter, async (req, res) => {
  const user = await authenticatedUser(req, res);
  if (!user) return;
  const fresh = await withDb(() => prisma.user.findUnique({ where: { id: user.id }, select: { credits: true, isUnlimited: true } }));
  res.json({ credits: fresh?.credits ?? 0, isUnlimited: fresh?.isUnlimited ?? false, costs: CREDIT_COST });
});

app.post("/api/v1/payments/create-order", sensitiveLimiter, async (req, res) => {
  const user = await authenticatedUser(req, res);
  if (!user) return;
  const { tier } = req.body;
  const plan = PRICING_PLANS.find((p) => p.id === tier);
  if (!plan || plan.price === 0 || !RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) { res.status(400).json({ error: "Invalid plan or payments not configured" }); return; }
  const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  try {
    const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
      body: JSON.stringify({ amount: plan.price * 100, currency: "INR", receipt: `${user.id}_${Date.now()}`, notes: { userId: user.id, tier: plan.id, credits: plan.credits } }),
      signal: controller.signal,
    });
    if (!rzpRes.ok) { res.status(502).json({ error: "Failed to create Razorpay order" }); return; }
    const order = await rzpRes.json();
    await withDb(() => prisma.payment.create({ data: { userId: user.id, razorpayId: order.id, amount: plan.price, credits: plan.credits, tier: plan.id } }));
    res.json({ orderId: order.id, amount: plan.price * 100, key: RAZORPAY_KEY_ID });
  } finally { clearTimeout(timeoutId); }
});

app.post("/api/v1/payments/verify", sensitiveLimiter, async (req, res) => {
  const user = await authenticatedUser(req, res);
  if (!user) return;
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) { res.status(400).json({ error: "Missing payment verification fields" }); return; }
  const payment = await withDb(() => prisma.payment.findUnique({ where: { razorpayId: razorpay_order_id } }));
  if (!payment || payment.userId !== user.id) { res.status(404).json({ error: "Payment not found" }); return; }
  const generated = crypto.createHmac("sha256", RAZORPAY_KEY_SECRET).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");
  if (generated !== razorpay_signature) { res.status(400).json({ error: "Invalid signature" }); return; }
  await withDb(() => prisma.payment.update({ where: { id: payment.id }, data: { status: "captured" } }));
  const plan = PRICING_PLANS.find((p) => p.id === payment.tier);
  if (plan?.id === "unlimited") await withDb(() => prisma.user.update({ where: { id: user.id }, data: { isUnlimited: true } }));
  else if (plan && plan.credits > 0) await withDb(() => prisma.user.update({ where: { id: user.id }, data: { credits: { increment: plan.credits } } }));
  res.json({ ok: true, credits: plan?.credits ?? 0, isUnlimited: plan?.id === "unlimited" });
});

app.post("/api/v1/ats/check", sensitiveLimiter, async (req, res) => {
  const user = await authenticatedUser(req, res);
  if (!user) return;
  if (!user.isUnlimited && user.credits < CREDIT_COST.ATS) { res.status(402).json({ error: "Insufficient credits" }); return; }
  const { resumeText, jobDescription } = req.body;
  if (!resumeText || !jobDescription || resumeText.length > 50000 || jobDescription.length > 5000) { res.status(400).json({ error: "Invalid input" }); return; }
  if (!user.isUnlimited) await deductCredits(user.id, CREDIT_COST.ATS);

  const escapedResume = resumeText.replace(/<[^>]*>/g, "").slice(0, 30000);
  const escapedJob = jobDescription.replace(/<[^>]*>/g, "").slice(0, 3000);
  const prompt = `You are an expert ATS resume checker. Analyze the resume against the job description and provide:
1. An overall score (0-100)
2. List of keyword matches found
3. Missing important skills/keywords
4. 3-5 specific suggestions for improvement
5. A brief summary (2-3 sentences)

Resume:
${escapedResume}

Job Description:
${escapedJob}

Respond in JSON format: { "score": number, "keywordMatches": string[], "missingSkills": string[], "suggestions": string[], "summary": string }`;

  const c = new AbortController(); const t = setTimeout(() => c.abort(), 30000);
  try {
    const aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: prompt }], temperature: 0.3, max_tokens: 2000 }),
      signal: c.signal,
    });
    if (!aiRes.ok) { console.error("Groq error:", aiRes.status); res.status(502).json({ error: "AI service unavailable" }); return; }
    const aiData: any = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content ?? "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) { res.status(502).json({ error: "Invalid AI response" }); return; }
    const parsed = JSON.parse(jsonMatch[0]);
    const score = Math.max(0, Math.min(100, parsed.score ?? 0));
    const keywordMatches = Array.isArray(parsed.keywordMatches) ? parsed.keywordMatches.slice(0, 50).map((k: any) => String(k).slice(0, 200)) : [];
    const missingSkills = Array.isArray(parsed.missingSkills) ? parsed.missingSkills.slice(0, 50).map((k: any) => String(k).slice(0, 200)) : [];
    const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 10).map((k: any) => String(k).slice(0, 500)) : [];
    const summary = String(parsed.summary ?? "").slice(0, 1000);

    const check = await withDb(() => prisma.atsCheck.create({ data: { userId: user.id, score, keywordMatches, missingSkills, suggestions, summary, resumeText: escapedResume.slice(0, 10000), jobDescription: escapedJob } }));
    res.json({ id: check.id, score, keywordMatches, missingSkills, suggestions, summary });
  } finally { clearTimeout(t); }
});

app.get("/api/v1/ats", sensitiveLimiter, async (req, res) => {
  const user = await authenticatedUser(req, res);
  if (!user) return;
  const checks = await withDb(() => prisma.atsCheck.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 }));
  res.json({ checks: checks.map((c) => ({ id: c.id, score: c.score, summary: c.summary, keywordMatches: safeJsonArray(c.keywordMatches), missingSkills: safeJsonArray(c.missingSkills), createdAt: c.createdAt })) });
});

app.get("/api/v1/ats/history", sensitiveLimiter, async (req, res) => {
  const user = await authenticatedUser(req, res);
  if (!user) return;
  const checks = await withDb(() => prisma.atsCheck.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 }));
  res.json({ checks: checks.map((c) => ({ id: c.id, score: c.score, summary: c.summary, keywordMatches: safeJsonArray(c.keywordMatches), missingSkills: safeJsonArray(c.missingSkills), createdAt: c.createdAt })) });
});

app.get("/api/v1/ats/:id", sensitiveLimiter, async (req, res) => {
  const user = await authenticatedUser(req, res);
  if (!user) return;
  const id = req.params.id;
  if (!id || id.length > 100 || !/^[a-zA-Z0-9-]+$/.test(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const check = await withDb(() => prisma.atsCheck.findFirst({ where: { id, userId: user.id } }));
  if (!check) { res.status(404).json({ error: "Check not found" }); return; }
  res.json({ id: check.id, score: check.score, keywordMatches: safeJsonArray(check.keywordMatches), missingSkills: safeJsonArray(check.missingSkills), suggestions: check.suggestions, summary: check.summary, resumeText: check.resumeText, jobDescription: check.jobDescription, createdAt: check.createdAt });
});

app.get("/api/v1/ping", (_req, res) => res.json({ ok: true }));

app.use((_req, res) => { res.status(404).json({ error: "Not found" }); });
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

server.listen(PORT, () => {
  console.log("Backend server running on port", PORT);
});
