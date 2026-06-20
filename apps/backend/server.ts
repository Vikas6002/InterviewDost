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
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return null; }
  return user;
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

const PRICING_PLANS = [
  { id: "free", name: "Free", credits: 50, price: 0, popular: false },
  { id: "starter", name: "Starter", credits: 500, price: 499, popular: true },
  { id: "pro", name: "Professional", credits: 2000, price: 1499, popular: false },
  { id: "unlimited", name: "Unlimited", credits: -1, price: 2999, popular: false },
];

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
    const shortId = crypto.randomBytes(6).toString("hex");
    const receipt = `${shortId}_${Date.now()}`.slice(0, 40);
    const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
      body: JSON.stringify({ amount: plan.price * 100, currency: "INR", receipt, notes: { userId: user.id, tier: plan.id, credits: plan.credits } }),
      signal: controller.signal,
    });
    if (!rzpRes.ok) { const body = await rzpRes.text().catch(() => ""); console.error("Razorpay error:", rzpRes.status, body); res.status(502).json({ error: "Failed to create Razorpay order" }); return; }
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
  if (plan?.id === "unlimited") { await withDb(() => prisma.user.update({ where: { id: user.id }, data: { isUnlimited: true } })); }
  else if (plan && plan.credits > 0) { await withDb(() => prisma.user.update({ where: { id: user.id }, data: { credits: { increment: plan.credits } } })); }
  res.json({ ok: true, credits: plan?.credits ?? 0, isUnlimited: plan?.id === "unlimited" });
});

app.post("/api/v1/ats/check", sensitiveLimiter, async (req, res) => {
  const user = await authenticatedUser(req, res);
  if (!user) return;
  const { resumeText, jobDescription } = req.body;
  if (!resumeText || !jobDescription || resumeText.length > 50000 || jobDescription.length > 5000) { res.status(400).json({ error: "Invalid input" }); return; }

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
  res.json({ checks: checks.map((c: any) => ({ id: c.id, score: c.score, summary: c.summary, keywordMatches: (() => { try { return Array.isArray(c.keywordMatches) ? c.keywordMatches : JSON.parse(c.keywordMatches ?? "[]"); } catch { return []; } })(), missingSkills: (() => { try { return Array.isArray(c.missingSkills) ? c.missingSkills : JSON.parse(c.missingSkills ?? "[]"); } catch { return []; } })(), createdAt: c.createdAt })) });
});

app.get("/api/v1/ats/:id", sensitiveLimiter, async (req, res) => {
  const user = await authenticatedUser(req, res);
  if (!user) return;
  const id = req.params.id;
  if (!id || id.length > 100 || !/^[a-zA-Z0-9-]+$/.test(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const check = await withDb(() => prisma.atsCheck.findFirst({ where: { id, userId: user.id } }));
  if (!check) { res.status(404).json({ error: "Check not found" }); return; }
  res.json({ id: check.id, score: check.score, keywordMatches: (() => { try { return Array.isArray(check.keywordMatches) ? check.keywordMatches : JSON.parse(check.keywordMatches ?? "[]"); } catch { return []; } })(), missingSkills: (() => { try { return Array.isArray(check.missingSkills) ? check.missingSkills : JSON.parse(check.missingSkills ?? "[]"); } catch { return []; } })(), suggestions: check.suggestions, summary: check.summary, resumeText: check.resumeText, jobDescription: check.jobDescription, createdAt: check.createdAt });
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
