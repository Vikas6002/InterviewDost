import { prisma, withDb } from "./db";
import { GROQ_API_KEY } from "./env";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

export async function getGroqChatCompletion(
  interviewId: string,
): Promise<string> {
  const interview = await withDb(() =>
    prisma.interview.findFirst({
      where: { id: interviewId },
      include: { conversations: { orderBy: { createdAt: "asc" } } },
    }),
  );
  if (!interview) throw new Error("Interview not found");

  const systemMessage = {
    role: "system" as const,
    content: `You are an AI interviewer conducting a computer science interview. Use English only.

Here is the candidate's GitHub metadata for context:
${interview.githubMetadata}

CRITICAL RULES - FOLLOW THESE EXACTLY:
1. Ask ONLY ONE question at a time. Never ask multiple questions in a single message.
2. Start with a brief greeting and ONE opening question.
3. Wait for the candidate's answer before asking the next question.
4. Keep your responses SHORT - at most 2-3 sentences.
5. If the candidate gives a short or unclear answer, ask a friendly follow-up to help them elaborate.
6. Do NOT repeat the same question if it wasn't answered. Instead, rephrase it gently.
7. After the candidate answers, acknowledge their response briefly, then ask ONE follow-up or move to the next topic.
8. Ask 3-4 questions total, one at a time. After the last answer, thank them and wrap up.`,
  };

  const messages = [
    systemMessage,
    ...interview.conversations.map(
      (c: { type: string; message: string; createdAt: Date }) => ({
        role: (c.type === "User" ? "user" : "assistant") as
          | "user"
          | "assistant",
        content: c.message,
      }),
    ),
  ];

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from Groq");

  await withDb(() =>
    prisma.message.create({
      data: { interviewId, type: "Assistant", message: content },
    }),
  );

  return content;
}
