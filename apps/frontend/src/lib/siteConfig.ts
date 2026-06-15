import {
  Mic,
  Bot,
  BarChart3,
  Zap,
  Shield,
  Clock,
  Github,
  FileText,
  CheckSquare,
  TrendingUp,
  CreditCard,
  Volume2,
  Activity,
  Award,
  Sparkles,
  Star,
  ArrowRight,
  Code,
} from "lucide-react";

export const siteConfig = {
  name: "InterviewDost",
  tagline: "AI-powered technical interview simulator",
  hero: {
    title: ["Master technical", "interviews with AI"],
    subtitle:
      "Practice with an AI interviewer that studies your GitHub profile or resume. Real-time voice conversations, tailored questions, instant feedback, and ATS resume checking. No forms, no scheduling.",
  },
  features: [
    {
      icon: Mic,
      title: "Voice-Based Conversations",
      desc: "Speak naturally. The AI listens, understands, and responds in real time using Deepgram's speech-to-text and text-to-speech. No typing during the interview.",
    },
    {
      icon: Github,
      title: "GitHub Profile Analysis",
      desc: "Connect your GitHub profile and get interview questions tailored to your actual projects, languages, and tech stack. Every interview is unique to you.",
    },
    {
      icon: FileText,
      title: "Resume-Based Interviews",
      desc: "Upload your resume and let the AI generate personalized interview questions based on your experience, skills, and project history.",
    },
    {
      icon: CheckSquare,
      title: "ATS Resume Checker",
      desc: "Upload your resume alongside a job description to get an ATS compatibility score with detailed actionable insights to improve your chances.",
    },
    {
      icon: Bot,
      title: "Personalized Questions",
      desc: "Every interview is dynamically generated. Questions adapt to your GitHub projects, resume content, and the technologies you actually use.",
    },
    {
      icon: Zap,
      title: "Real-Time AI Responses",
      desc: "Powered by Groq's blazing-fast inference. The AI responds in milliseconds over WebSocket for a natural, lag-free conversation flow.",
    },
    {
      icon: TrendingUp,
      title: "Detailed Analytics",
      desc: "Comprehensive dashboard with radar charts, performance trends over time, skill breakdown, and full interview history to track your growth.",
    },
    {
      icon: Award,
      title: "Instant Scoring",
      desc: "Receive a score out of 10 with detailed, actionable feedback immediately after your interview ends, powered by AI evaluation.",
    },
    {
      icon: Activity,
      title: "Real-Time Speech-to-Text",
      desc: "Your voice is transcribed in real time via Deepgram's WebSocket API. The AI understands context, nuance, and technical terminology.",
    },
    {
      icon: Volume2,
      title: "Natural Text-to-Speech",
      desc: "The AI interviewer speaks back with natural-sounding voice synthesis. The conversation flows naturally, just like a real interview.",
    },
    {
      icon: Shield,
      title: "Privacy First",
      desc: "We only read your public GitHub data. Your audio is processed in real time and never stored. Your data stays yours.",
    },
    {
      icon: CreditCard,
      title: "Flexible Credit System",
      desc: "Pay only for what you use with our credit-based pricing. Start with 50 free credits and top up as needed via Razorpay.",
    },
  ],
  stats: [
    { value: "100%", label: "Voice-Based Interviews" },
    { value: "< 5 min", label: "Average Interview Time" },
    { value: "500+", label: "Questions Generated" },
    { value: "Real-time", label: "AI Response Speed" },
  ],
  paths: [
    {
      icon: Github,
      title: "GitHub Path",
      desc: "Enter your GitHub profile URL. We analyze your public repos, languages, and contributions to generate tailored technical questions.",
      points: [
        "Scrapes public repositories",
        "Analyzes tech stack & languages",
        "Generates code-specific questions",
        "Tracks your open source work",
      ],
    },
    {
      icon: FileText,
      title: "Resume Path",
      desc: "Upload your resume (PDF) and let the AI parse your experience, skills, and projects to create a personalized interview.",
      points: [
        "Parses PDF resumes instantly",
        "Extracts skills & experience",
        "Generates role-specific questions",
        "Matches against job descriptions",
      ],
    },
  ],
  pricing: [
    {
      name: "Starter",
      price: "Free",
      credits: "50",
      features: [
        "50 free credits on signup",
        "GitHub & Resume interviews",
        "Basic scoring & feedback",
        "Standard AI response speed",
      ],
      cta: "Get Started",
      popular: false,
    },
    {
      name: "Pro",
      price: "₹499",
      credits: "500/mo",
      features: [
        "500 credits per month",
        "Priority AI processing",
        "Detailed analytics dashboard",
        "ATS resume checker included",
        "Priority support",
      ],
      cta: "Go Pro",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      credits: "Unlimited",
      features: [
        "Unlimited interviews",
        "Custom question banks",
        "Team dashboard & reports",
        "Dedicated support",
        "Custom integrations",
      ],
      cta: "Contact Us",
      popular: false,
    },
  ],
  faq: [
    {
      q: "How does the AI interview work?",
      a: "The AI interviewer asks you technical questions based on your GitHub profile or resume. You respond using your microphone in real time. The AI listens, understands, and follows up naturally.",
    },
    {
      q: "Do I need a microphone?",
      a: "Yes, the interview is entirely voice-based. We ask for microphone permission before starting. A standard headset or laptop microphone works perfectly.",
    },
    {
      q: "How are questions generated?",
      a: "We analyze your public GitHub repositories or uploaded resume and dynamically generate questions tailored to your specific projects, languages, and experience level.",
    },
    {
      q: "What is the ATS resume checker?",
      a: "Upload your resume and a job description, and we'll analyze how well your resume matches the role. You get a compatibility score and specific, actionable suggestions to improve.",
    },
    {
      q: "How long does an interview take?",
      a: "Most interviews take 5-10 minutes. The AI asks 3-4 questions and wraps up with detailed feedback and a score out of 10.",
    },
    {
      q: "Can I use both GitHub and resume?",
      a: "Absolutely! You can start interviews from either your GitHub profile or your resume. They generate different types of questions based on the source material.",
    },
    {
      q: "How does the credit system work?",
      a: "Each interview costs 5-10 credits depending on the type. You get 50 free credits on signup. Purchase more credits anytime via Razorpay.",
    },
    {
      q: "Is my data private?",
      a: "We only read your public GitHub data. Your audio is processed in real time and never stored or shared. We do not train AI models on your data.",
    },
  ],
};
