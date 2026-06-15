import { Router } from "express";
import crypto from "crypto";
import { prisma, withDb } from "./db";
import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, FRONTEND_URL, BACKEND_URL, NODE_ENV } from "./env";
import rateLimit from "express-rate-limit";

export const authRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many requests" },
  standardHeaders: true,
  legacyHeaders: false,
});

authRouter.use(authLimiter);

const TOKEN_HEADER_REGEX = /^Bearer\s+(.+)$/;

function extractToken(req: import("express").Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const match = header.match(TOKEN_HEADER_REGEX);
  return match?.[1]?.trim() ?? null;
}

function generateToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

authRouter.get("/github", (_req, res) => {
  const state = generateToken();
  const redirectUri = `${BACKEND_URL}/api/v1/auth/github/callback`;
  const url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user&state=${state}`;
  res.cookie("oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 10 * 60 * 1000,
    secure: NODE_ENV === "production",
  });
  res.redirect(url);
});

authRouter.post("/logout", async (req, res) => {
  const token = extractToken(req);
  if (token) {
    await withDb(() => prisma.session.deleteMany({ where: { token } }));
  }
  res.json({ ok: true });
});

authRouter.get("/github/callback", async (req, res) => {
  const { code, state } = req.query;
  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "Missing authorization code" });
    return;
  }

  const cookieState = req.cookies?.oauth_state;
  if (cookieState && state !== cookieState) {
    res.status(400).json({ error: "Invalid state parameter" });
    return;
  }

  const controller1 = new AbortController();
  const t1 = setTimeout(() => controller1.abort(), 10000);
  let tokenRes;
  try {
    tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      }),
      signal: controller1.signal,
    });
  } finally {
    clearTimeout(t1);
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token as string;
  if (!accessToken) {
    res.redirect(`${FRONTEND_URL}/login?error=github_auth_failed`);
    return;
  }

  const controller2 = new AbortController();
  const t2 = setTimeout(() => controller2.abort(), 10000);
  let userRes;
  try {
    userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller2.signal,
    });
  } finally {
    clearTimeout(t2);
  }

  if (!userRes.ok) {
    res.redirect(`${FRONTEND_URL}/login?error=github_api_failed`);
    return;
  }
  const githubUser = await userRes.json();

  if (!githubUser.id || !githubUser.login) {
    res.redirect(`${FRONTEND_URL}/login?error=invalid_github_response`);
    return;
  }

  let user = await withDb(() =>
    prisma.user.findUnique({
      where: { githubId: String(githubUser.id) },
    }),
  );

  if (!user) {
    user = await withDb(() =>
      prisma.user.create({
        data: {
          githubId: String(githubUser.id),
          username: String(githubUser.login).slice(0, 100),
          avatarUrl: githubUser.avatar_url
            ? String(githubUser.avatar_url).slice(0, 500)
            : "",
        },
      }),
    );
  }

  const session = await withDb(() =>
    prisma.session.create({
      data: {
        userId: user.id,
        token: generateToken(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    }),
  );

  res.redirect(`${FRONTEND_URL}?token=${session.token}`);
});

authRouter.get("/me", async (req, res) => {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: "No token" });
    return;
  }

  const session = await withDb(() =>
    prisma.session.findUnique({
      where: { token },
      include: { user: true },
    }),
  );

  if (!session || session.expiresAt < new Date()) {
    res.status(401).json({ error: "Invalid or expired session" });
    return;
  }

  res.json({
    user: {
      id: session.user.id,
      username: session.user.username,
      avatarUrl: session.user.avatarUrl,
    },
  });
});
