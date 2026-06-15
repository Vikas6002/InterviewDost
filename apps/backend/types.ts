import { z } from "zod";

export const PreInterviewBody = z.object({
  github: z
    .string()
    .min(1, "GitHub URL is required")
    .max(200, "GitHub URL too long")
    .regex(
      /^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9_-]+\/?$/,
      "Must be a valid GitHub profile URL",
    ),
});

export const TTSBody = z.object({
  text: z.string().min(1, "Text is required").max(500, "Text too long"),
});

export const WSMessageSchema = z.object({
  type: z.enum(["user_message"]),
  text: z.string().min(1).max(2000, "Message too long"),
});
