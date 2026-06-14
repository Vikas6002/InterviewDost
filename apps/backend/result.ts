import { z } from "zod";
import { GROQ_API_KEY } from "./env";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

const outputSchema = z.object({
  feedback: z.string(),
  score: z.number().int().min(0).max(10),
});

const RESULT_PROMPT = `
You are an expert evaluator. Your job is to evaluate the users interview. Give them a score out of 10
and also let them know any feedback you have about their interview.

Please return only a JSON object with the following structure (no other text):
{
    "feedback": "your feedback here",
    "score": <number between 0 and 10>
}

Transcript:
{{USER_TRANSCRIPT}}
`;

export async function calculateResult(
  messages: { type: "Assistant" | "User"; message: string; createdAt: Date }[]
) {
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        {
          role: "system",
          content: RESULT_PROMPT.replace(
            "{{USER_TRANSCRIPT}}",
            JSON.stringify(messages)
          ),
        },
      ],
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
