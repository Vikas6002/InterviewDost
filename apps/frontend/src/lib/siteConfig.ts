import { Bot, Mic, BarChart3, Zap, Shield, Clock } from "lucide-react";

export const siteConfig = {
  name: "InterviewDost",
  tagline: "AI-powered technical interview simulator",
  hero: {
    title: ["Master technical", "interviews with AI"],
    subtitle:
      "Practice with an AI interviewer that studies your GitHub profile. Real-time voice conversations, tailored questions, and instant feedback. No forms, no scheduling.",
  },
  features: [
    {
      icon: Mic,
      title: "Voice-based conversation",
      desc: "Speak naturally. The AI listens, understands, and responds in real time. No typing during the interview.",
    },
    {
      icon: Bot,
      title: "Personalized questions",
      desc: "Questions are based on your actual GitHub projects and tech stack. Every interview is unique to you.",
    },
    {
      icon: BarChart3,
      title: "Instant scoring & feedback",
      desc: "Get a detailed score and actionable feedback immediately after your interview ends.",
    },
    {
      icon: Zap,
      title: "Real-time responses",
      desc: "Powered by Groq's blazing-fast inference. The AI responds in milliseconds, not seconds.",
    },
    {
      icon: Shield,
      title: "Privacy first",
      desc: "We only read public GitHub data. Your audio never leaves your device during transcription.",
    },
    {
      icon: Clock,
      title: "5-minute interviews",
      desc: "Quick, focused sessions that fit into your schedule. No hour-long commitments needed.",
    },
  ],
  steps: [
    {
      num: "01",
      title: "Connect GitHub",
      desc: "Enter your GitHub profile URL. We analyze your repos to tailor your interview questions.",
    },
    {
      num: "02",
      title: "Start the interview",
      desc: "Grant microphone access and begin a live voice conversation with the AI interviewer.",
    },
    {
      num: "03",
      title: "Get results",
      desc: "Receive a score out of 10 and detailed feedback on your performance immediately.",
    },
  ],
  stats: [
    { value: "100%", label: "Voice-based interviews" },
    { value: "< 10 min", label: "Average interview time" },
    { value: "1", label: "GitHub profile needed" },
  ],
  faq: [
    {
      q: "How does the AI interview work?",
      a: "The AI interviewer asks you technical questions based on your GitHub profile. You respond using your microphone in real time.",
    },
    {
      q: "Do I need a microphone?",
      a: "Yes, the interview is entirely voice-based. We ask for microphone permission before starting.",
    },
    {
      q: "How are questions generated?",
      a: "We analyze your public GitHub repositories and tailor questions to the languages and projects you've worked on.",
    },
    {
      q: "How long does an interview take?",
      a: "Most interviews take 5-10 minutes. The AI asks 3-4 questions and wraps up with feedback.",
    },
    {
      q: "Is my data private?",
      a: "We only read your public GitHub profile and repos. We don't store your audio or share your data.",
    },
    {
      q: "Can I retake an interview?",
      a: "Yes, you can start a new interview anytime. Each session generates fresh questions.",
    },
  ],
};
