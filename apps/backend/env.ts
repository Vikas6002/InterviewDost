const required = [
  "GROQ_API_KEY",
  "DEEPGRAM_API_KEY",
  "DATABASE_URL",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
] as const;

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required env variable: ${key}`);
  }
}

export const GROQ_API_KEY = process.env.GROQ_API_KEY!;
export const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY!;
export const DATABASE_URL = process.env.DATABASE_URL!;
export const PROXY_URL = process.env.PROXY_URL ?? "";
export const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!;
export const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!;
export const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:3000";
export const NODE_ENV = process.env.NODE_ENV ?? "development";
