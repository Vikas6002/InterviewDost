import { Router } from "express";
import { prisma, withDb } from "./db";
import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, FRONTEND_URL } from "./env";

export const authRouter = Router();

authRouter.get("/github", (_req, res) => {
  const url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent("http://localhost:3001/api/v1/auth/github/callback")}&scope=read:user`;
  res.redirect(url);
});

authRouter.get("/github/callback", async (req, res) => {
  const { code } = req.query;
  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "Missing code" });
    return;
  }

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
    }),
  });
  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token as string;
  if (!accessToken) {
    res.redirect(`${FRONTEND_URL}/login?error=github_auth_failed`);
    return;
  }

  const userRes = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const githubUser = await userRes.json();

  let user = await withDb(() =>
    prisma.user.findUnique({
      where: { githubId: String(githubUser.id) },
    })
  );

  if (!user) {
    user = await withDb(() =>
      prisma.user.create({
        data: {
          githubId: String(githubUser.id),
          username: githubUser.login,
          avatarUrl: githubUser.avatar_url,
        },
      })
    );
  }

  const session = await withDb(() =>
    prisma.session.create({
      data: {
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })
  );

  res.redirect(`${FRONTEND_URL}?token=${session.token}`);
});

authRouter.get("/me", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ error: "No token" });
    return;
  }
  const session = await withDb(() =>
    prisma.session.findUnique({
      where: { token },
      include: { user: true },
    })
  );
  if (!session || session.expiresAt < new Date()) {
    res.status(401).json({ error: "Invalid or expired session" });
    return;
  }
  res.json({ user: { id: session.user.id, username: session.user.username, avatarUrl: session.user.avatarUrl } });
});

authRouter.post("/logout", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (token) {
    await withDb(() => prisma.session.deleteMany({ where: { token } }));
  }
  res.json({ ok: true });
});
