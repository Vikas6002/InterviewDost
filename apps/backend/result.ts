import { z } from "zod";
import { GROQ_API_KEY } from "./env";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

const outputSchema = z.object({
  feedback: z.string(),
  score: z.number().int().min(0).max(10),
});

const RESULT_PROMPT = `
You are an expert evaluator. Your job is to evaluate the user's interview. Give them a score out of 10
and also let them know any feedback you have about their interview.

Interview context: {{INTERVIEW_CONTEXT}}

Please return only a JSON object with the following structure (no other text):
{
    "feedback": "your feedback here",
    "score": <number between 0 and 10>
}

Transcript:
{{USER_TRANSCRIPT}}
`;

interface InterviewContext {
  type: "GitHub" | "Resume";
  jobRole?: string | null;
  githubMetadata?: any;
  resumeText?: string | null;
}

export async function calculateResult(
  messages: { type: "Assistant" | "User"; message: string; createdAt: Date }[],
  context?: InterviewContext,
) {
  const interviewContextStr = context
    ? `Type: ${context.type}${context.jobRole ? `, Job Description Provided` : ""}${
        context.type === "GitHub" && context.githubMetadata
          ? `, GitHub Repos analyzed`
          : ""
      }`
    : "General interview";

  const prompt = RESULT_PROMPT.replace(
    "{{USER_TRANSCRIPT}}",
    JSON.stringify(messages),
  ).replace("{{INTERVIEW_CONTEXT}}", interviewContextStr);

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: "system", content: prompt }],
      temperature: 0.3,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty response from Groq");

  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  const result = outputSchema.parse(JSON.parse(cleaned));
  return result;
}
