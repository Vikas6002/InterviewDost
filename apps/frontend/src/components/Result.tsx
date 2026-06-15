import { BACKEND_URL } from "@/lib/config";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import {
  Bot,
  Loader2,
  Sparkles,
  User,
  Trophy,
  MessageSquare,
  TrendingUp,
  BrainCircuit,
  Target,
  ArrowUp,
  ArrowDown,
  Lightbulb,
} from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface TranscriptEntry {
  type: "Assistant" | "User";
  content: string;
  createdAt: string;
}

interface ResultData {
  transcript: TranscriptEntry[];
  score: number;
  feedback: string;
  status: "Done" | "InProgress" | "Pre";
}

interface AnalyticsData {
  totalCompleted: number;
  bestScore: number;
  averageScore: number;
  scoreList: number[];
}

const skillKeywords: Record<string, RegExp> = {
  "Data Structures": /array|linked list|stack|queue|tree|graph|hash|heap|trie/i,
  Algorithms: /sort|search|recursion|dp|dynamic.program|greedy|backtrack|divide|conquer/i,
  "System Design": /scalab|distributed|microservice|load.balanc|cache|database.shard|consistenthash/i,
  Databases: /sql|nosql|index|query|normaliz|transaction|acid|mongodb|postgres|mysql/i,
  "Web Dev": /react|api|rest|graphql|http|frontend|backend|full.stack|express|next/i,
  "Problem Solving": /complexity|optimize|refactor|edge.case|brute.force|efficient/i,
};

function extractSkills(text: string | null, score: number): { skill: string; score: number }[] {
  if (!text) return [];
  return Object.entries(skillKeywords)
    .map(([skill, regex]) => {
      const matches = (text.match(regex) || []).length;
      const s = matches > 0 ? Math.min(10, Math.round((score * matches * 0.15 + matches * 1.2) * 10) / 10) : 0;
      return { skill, score: s };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
}

function ScoreRing({ score, size = 160 }: { score: number; size?: number }) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = score / 10;
  const dash = circumference * progress;

  const color =
    score >= 7 ? "var(--chart-1)" : score >= 4 ? "var(--chart-3)" : "var(--chart-2)";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold tracking-tight">{score}</span>
        <span className="text-xs text-muted-foreground">/ 10</span>
      </div>
    </div>
  );
}

export function Result() {
  const { interviewId } = useParams();
  const { token } = useAuth();
  const [result, setResult] = useState<ResultData>({
    score: 0,
    feedback: "",
    transcript: [],
    status: "Pre",
  });
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    if (!token) return;
    const fetchResult = () =>
      axios
        .get(`${BACKEND_URL}/api/v1/result/${interviewId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((response) => {
          setResult(response.data);
          return response.data.status as ResultData["status"];
        });

    fetchResult();
    const intervalId = setInterval(async () => {
      const s = await fetchResult();
      if (s === "Done") clearInterval(intervalId);
    }, 5000);

    return () => clearInterval(intervalId);
  }, [interviewId, token]);

  useEffect(() => {
    if (!token) return;
    axios
      .get(`${BACKEND_URL}/api/v1/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setAnalytics({
          totalCompleted: res.data.totalCompleted,
          bestScore: res.data.bestScore,
          averageScore: res.data.averageScore,
          scoreList: res.data.scoreList,
        });
      })
      .catch(() => {});
  }, [token]);

  const skills = useMemo(
    () => extractSkills(result.feedback, result.score),
    [result.feedback, result.score],
  );

  const ready = result.status === "Done";
  const messageCount = result.transcript.length;
  const vsAverage =
    analytics && analytics.averageScore > 0
      ? Math.round((result.score - analytics.averageScore) * 10) / 10
      : null;
  const weakest = skills.slice(0, 2);
  const strongest = skills.filter((s) => s.score > 0).slice(-2).reverse();
  const rankInList =
    analytics && analytics.scoreList.length > 0
      ? analytics.scoreList.filter((s) => s >= result.score).length
      : 0;

  return (
    <div className="mx-auto min-h-full w-full max-w-5xl space-y-6 p-6">
      {!ready && (
        <div className="flex flex-col items-center justify-center gap-4 py-32 text-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <div>
            <p className="font-medium">Analyzing your interview&hellip;</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {result.status === "Pre"
                ? "Waiting for the interview to complete."
                : "Processing your responses and generating feedback."}
            </p>
          </div>
        </div>
      )}

      {ready && (
        <>
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Interview Results</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                AI-powered feedback and performance analysis for this session.
              </p>
            </div>
            <ScoreRing score={result.score} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="rounded-none border-border/60">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Score</CardTitle>
                <Trophy className="size-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {result.score}
                  <span className="text-sm font-normal text-muted-foreground">/10</span>
                </div>
                {rankInList > 0 && analytics && analytics.totalCompleted > 1 && (
                  <p className="text-xs text-muted-foreground">
                    #{rankInList} of {analytics.totalCompleted} interviews
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-none border-border/60">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Messages</CardTitle>
                <MessageSquare className="size-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{messageCount}</div>
                <p className="text-xs text-muted-foreground">
                  {messageCount === 1 ? "exchange" : "exchanges"} in this interview
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-none border-border/60">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Best Score</CardTitle>
                <BrainCircuit className="size-4 text-violet-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics?.bestScore ?? "—"}
                  <span className="text-sm font-normal text-muted-foreground">/10</span>
                </div>
                <p className="text-xs text-muted-foreground">Across all your interviews</p>
              </CardContent>
            </Card>

            <Card className="rounded-none border-border/60">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">vs Average</CardTitle>
                <Target className="size-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                {vsAverage !== null ? (
                  <>
                    <div className="flex items-baseline gap-1.5">
                      <div className="text-2xl font-bold">
                        {vsAverage > 0 ? "+" : ""}{vsAverage}
                      </div>
                      {vsAverage > 0 ? (
                        <ArrowUp className="size-4 text-emerald-500" />
                      ) : vsAverage < 0 ? (
                        <ArrowDown className="size-4 text-rose-500" />
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      vs your average ({analytics?.averageScore})
                    </p>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">Complete more interviews</div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-none border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="size-4 text-violet-400" />
                AI Feedback
              </CardTitle>
              <CardDescription>
                Detailed analysis of your performance in this interview.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {result.feedback}
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="rounded-none border-border/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BrainCircuit className="size-4 text-primary" />
                  Skill Radar
                </CardTitle>
                <CardDescription>
                  Estimated proficiency areas detected from your responses.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {skills.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                    Not enough data to generate skill analysis.
                  </div>
                ) : (
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={skills}>
                        <PolarGrid stroke="var(--border)" />
                        <PolarAngleAxis
                          dataKey="skill"
                          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                        />
                        <PolarRadiusAxis
                          domain={[0, 10]}
                          tickCount={6}
                          tick={false}
                          axisLine={false}
                        />
                        <Radar
                          name="Score"
                          dataKey="score"
                          stroke="var(--chart-1)"
                          fill="var(--chart-1)"
                          fillOpacity={0.2}
                          strokeWidth={2}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-col gap-6">
              {weakest.length > 0 && (
                <Card className="rounded-none border-l-4 border-l-rose-500/50 border-border/60">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ArrowDown className="size-4 text-rose-500" />
                      Areas to Improve
                    </CardTitle>
                    <CardDescription>
                      Focus on these to boost your score.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {weakest.map((s) => (
                        <div key={s.skill} className="flex items-center justify-between">
                          <span className="text-sm font-medium">{s.skill}</span>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 overflow-hidden rounded-none bg-muted">
                              <div
                                className="h-full rounded-none bg-rose-500"
                                style={{ width: `${(s.score / 10) * 100}%` }}
                              />
                            </div>
                            <span className="w-6 text-right text-xs text-muted-foreground">
                              {s.score}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              {strongest.length > 0 && (
                <Card className="rounded-none border-l-4 border-l-emerald-500/50 border-border/60">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ArrowUp className="size-4 text-emerald-500" />
                      Strongest Areas
                    </CardTitle>
                    <CardDescription>
                      Your best-performing skills.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {strongest.map((s) => (
                        <div key={s.skill} className="flex items-center justify-between">
                          <span className="text-sm font-medium">{s.skill}</span>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 overflow-hidden rounded-none bg-muted">
                              <div
                                className="h-full rounded-none bg-emerald-500"
                                style={{ width: `${(s.score / 10) * 100}%` }}
                              />
                            </div>
                            <span className="w-6 text-right text-xs text-muted-foreground">
                              {s.score}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              {weakest.length === 0 && strongest.length === 0 && (
                <Card className="rounded-none border-border/60">
                  <CardContent className="flex flex-col items-center justify-center gap-2 py-12">
                    <Lightbulb className="size-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      Complete more interviews to see skill analysis.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <Card className="rounded-none border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="size-4 text-primary" />
                Conversation
              </CardTitle>
              <CardDescription>
                The full transcript of your interview session.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {result.transcript.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No messages were recorded for this interview.
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  {result.transcript.map((m, i) => {
                    const isAi = m.type === "Assistant";
                    return (
                      <div
                        key={i}
                        className={cn(
                          "flex gap-3",
                          isAi ? "justify-start" : "flex-row-reverse",
                        )}
                      >
                        <div
                          className={cn(
                            "grid size-8 shrink-0 place-items-center rounded-full text-white",
                            isAi
                              ? "bg-gradient-to-br from-violet-400 to-indigo-600"
                              : "bg-gradient-to-br from-emerald-300 to-teal-600",
                          )}
                        >
                          {isAi ? <Bot className="size-4" /> : <User className="size-4" />}
                        </div>
                        <div
                          className={cn(
                            "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                            isAi
                              ? "rounded-tl-sm bg-card text-foreground"
                              : "rounded-tr-sm bg-primary text-primary-foreground",
                          )}
                        >
                          {m.content}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
