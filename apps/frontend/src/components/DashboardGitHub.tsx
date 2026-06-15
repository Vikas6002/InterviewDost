import { useState } from "react";
import { useNavigate } from "react-router";
import axios from "axios";
import { BACKEND_URL } from "@/lib/config";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ArrowRight,
  Github,
  Loader2,
  Mic,
  Code2,
  Coins,
} from "lucide-react";

export function DashboardGitHub() {
  const [github, setGithub] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { token } = useAuth();

  async function onSubmit() {
    if (!github.trim()) {
      toast("Please provide a valid GitHub URL");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/v1/pre-interview/github`,
        { github: github.trim() },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      window.dispatchEvent(new Event("credits-updated"));
      navigate(`/interview/${response.data.id}`);
    } catch (err: any) {
      if (err?.response?.status === 402) {
        toast("Insufficient credits. Please purchase more credits.");
        navigate("/dashboard/pricing");
      } else {
        toast("Something went wrong starting your interview. Please try again.");
      }
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          GitHub-Based Interview
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Drop your GitHub profile and start a live, voice-driven interview
          tailored to your work.
        </p>
      </div>

      <div className="space-y-5 rounded-none border border-border bg-card/50 p-6 backdrop-blur">
        <div className="space-y-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Mic className="size-3.5 text-primary" />
            Voice-based technical interview
          </span>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            GitHub Profile URL
            <span className="ml-1 text-destructive">*</span>
          </label>
          <div className="flex items-center gap-2 rounded-none border border-border bg-card/30 p-2 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/30">
            <div className="flex items-center pl-2 text-muted-foreground">
              <Github className="size-5" />
            </div>
            <Input
              value={github}
              placeholder="https://github.com/your-username"
              onChange={(e) => setGithub(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && onSubmit()}
              disabled={loading}
              className="border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
            <Button
              disabled={loading || !github.trim()}
              onClick={onSubmit}
              size="lg"
              className="shrink-0 gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Starting
                </>
              ) : (
                <>
                  <Coins className="size-4" />
                  Start (5 credits)
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            We'll analyze your public repositories to craft relevant questions.
          </p>
        </div>
      </div>

      <div className="rounded-none border border-border bg-card/30 p-5">
        <div className="flex items-start gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10">
            <Code2 className="size-4 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">How it works</p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>1. Enter your GitHub profile URL</li>
              <li>2. We'll scrape your public repos and activity</li>
              <li>3. Questions are generated based on your actual code and projects</li>
              <li>4. Complete the interview and get AI-powered feedback</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
