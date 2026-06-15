import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import axios from "axios";
import { BACKEND_URL } from "@/lib/config";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Clock,
  FileText,
  Github,
  Loader2,
  MessageSquare,
  Sparkles,
  Trophy,
  ExternalLink,
} from "lucide-react";

interface Interview {
  id: string;
  type: "GitHub" | "Resume";
  score: number;
  feedback: string | null;
  status: "Pre" | "InProgress" | "Done";
  jobRole: string | null;
  createdAt: string;
  messageCount: number;
}

export function DashboardHistory() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get(`${BACKEND_URL}/api/v1/interviews`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setInterviews(res.data.interviews))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Interview History
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All your past interviews and their results.
        </p>
      </div>

      {interviews.length === 0 ? (
        <Card className="rounded-none">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquare className="size-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm font-medium text-muted-foreground">
              No interviews yet
            </p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Start your first interview to see your history here.
            </p>
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/dashboard/github")}
              >
                <Github className="mr-1.5 size-4" />
                GitHub Interview
              </Button>
              <Button
                size="sm"
                onClick={() => navigate("/dashboard/resume")}
              >
                <FileText className="mr-1.5 size-4" />
                Resume Interview
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {interviews.map((interview) => (
            <Card
              key={interview.id}
              className="rounded-none transition-colors hover:bg-accent/30"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10">
                      {interview.type === "GitHub" ? (
                        <Github className="size-4 text-primary" />
                      ) : (
                        <FileText className="size-4 text-primary" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {interview.type === "GitHub"
                          ? "GitHub Interview"
                          : `Resume Interview${interview.jobRole ? ` — ${interview.jobRole.length > 80 ? interview.jobRole.slice(0, 80) + "..." : interview.jobRole}` : ""}`}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-0.5">
                        <Clock className="size-3" />
                        {new Date(interview.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {interview.status === "Done" && (
                      <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-500">
                        <Trophy className="size-3" />
                        {interview.score}/10
                      </div>
                    )}
                    {interview.status === "Pre" && (
                      <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-500">
                        Ready
                      </span>
                    )}
                    {interview.status === "InProgress" && (
                      <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-500">
                        In Progress
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="size-3" />
                      {interview.messageCount} messages
                    </span>
                    {interview.feedback && (
                      <span className="flex items-center gap-1">
                        <Sparkles className="size-3" />
                        Feedback available
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/result/${interview.id}`)}
                    className="gap-1.5 text-xs"
                  >
                    View details
                    <ExternalLink className="size-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
