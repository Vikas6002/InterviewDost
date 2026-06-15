import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import axios from "axios";
import { BACKEND_URL } from "@/lib/config";
import { useAuth } from "@/lib/auth";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BrainCircuit,
  TrendingUp,
  Trophy,
  Target,
  Lightbulb,
  Loader2,
  Sparkles,
  ExternalLink,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RadarItem {
  skill: string;
  score: number;
  interviews: number;
}

interface AnalyticsData {
  totalCompleted: number;
  bestScore: number;
  averageScore: number;
  recentAverage: number;
  improvement: number;
  scoreList: number[];
  radarData: RadarItem[];
  feedbacks: string[];
  recentInterviews: {
    id: string;
    score: number;
    type: string;
    jobRole: string | null;
    createdAt: string;
  }[];
}

function CustomRadarTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded-none border border-border bg-card px-3 py-2 shadow-lg">
      <p className="text-sm font-medium">{data.skill}</p>
      <p className="text-xs text-muted-foreground">
        Score: {data.score}/10 ({data.interviews} interviews)
      </p>
    </div>
  );
}

function CustomTrendTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-none border border-border bg-card px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground">Interview #{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm font-medium" style={{ color: entry.color }}>
          Score: {entry.value}/10
        </p>
      ))}
    </div>
  );
}

export function DashboardAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedInsight, setSelectedInsight] = useState<number | null>(null);
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get(`${BACKEND_URL}/api/v1/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setData(res.data))
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

  if (!data || data.totalCompleted === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <BrainCircuit className="size-12 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">
          Complete at least one interview to see analytics
        </p>
        <Button variant="outline" onClick={() => navigate("/dashboard/github")}>
          Start your first interview
        </Button>
      </div>
    );
  }

  const trendData = data.scoreList.map((score, i) => ({
    index: i + 1,
    score,
  }));

  const weakestSkills = data.radarData.filter((s) => s.score > 0).slice(0, 2);
  const strongestSkills = data.radarData.filter((s) => s.score > 0).slice(-2).reverse();

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Performance Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AI-powered insights into your interview performance across all sessions.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <BrainCircuit className="size-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.averageScore}
              <span className="text-sm font-normal text-muted-foreground">/10</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Across {data.totalCompleted} completed interviews
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Best Score</CardTitle>
            <Trophy className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.bestScore}
              <span className="text-sm font-normal text-muted-foreground">/10</span>
            </div>
            <p className="text-xs text-muted-foreground">Your highest performance</p>
          </CardContent>
        </Card>

        <Card className="rounded-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Recent Average</CardTitle>
            <Target className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.recentAverage}
              <span className="text-sm font-normal text-muted-foreground">/10</span>
            </div>
            <p className="text-xs text-muted-foreground">Last 3 interviews</p>
          </CardContent>
        </Card>

        <Card className="rounded-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Improvement</CardTitle>
            <TrendingUp className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1.5">
              <div className="text-2xl font-bold">
                {data.improvement > 0 ? "+" : ""}{data.improvement}
              </div>
              {data.improvement > 0 ? (
                <ArrowUp className="size-4 text-emerald-500" />
              ) : data.improvement < 0 ? (
                <ArrowDown className="size-4 text-red-500" />
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              From first to latest interview
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4 text-primary" />
              Skill Radar
            </CardTitle>
            <CardDescription>
              Your proficiency across different skill areas based on interview performance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.radarData.filter((s) => s.score > 0).length === 0 ? (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                Not enough data to generate radar.
              </div>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={data.radarData.filter((s) => s.score > 0)}>
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
                    <Tooltip content={<CustomRadarTooltip />} />
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

        <Card className="rounded-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4 text-primary" />
              Score Trend
            </CardTitle>
            <CardDescription>
              Your score progression across all interviews.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trendData.length < 2 ? (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                Complete more interviews to see your trend.
              </div>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="index"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                      label={{ value: "Interview #", position: "insideBottomRight", offset: -8, fontSize: 11, fill: "var(--muted-foreground)" }}
                    />
                    <YAxis
                      domain={[0, 10]}
                      tickCount={6}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    />
                    <Tooltip content={<CustomTrendTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="var(--chart-1)"
                      fill="url(#scoreGradient)"
                      strokeWidth={2.5}
                      dot={{ fill: "var(--chart-1)", strokeWidth: 0, r: 4 }}
                      activeDot={{ r: 6, fill: "var(--chart-1)" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {weakestSkills.length > 0 && (
          <Card className="rounded-none border-l-4 border-l-rose-500/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ArrowDown className="size-4 text-rose-500" />
                Areas to Improve
              </CardTitle>
              <CardDescription>
                Focus on these skills to boost your interview performance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {weakestSkills.map((skill) => (
                  <div key={skill.skill} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{skill.skill}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-none bg-muted">
                        <div
                          className="h-full rounded-none bg-rose-500"
                          style={{ width: `${(skill.score / 10) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-6 text-right">
                        {skill.score}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        {strongestSkills.length > 0 && (
          <Card className="rounded-none border-l-4 border-l-emerald-500/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ArrowUp className="size-4 text-emerald-500" />
                Strongest Areas
              </CardTitle>
              <CardDescription>
                These are your strongest skill areas. Keep it up!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {strongestSkills.map((skill) => (
                  <div key={skill.skill} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{skill.skill}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-none bg-muted">
                        <div
                          className="h-full rounded-none bg-emerald-500"
                          style={{ width: `${(skill.score / 10) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-6 text-right">
                        {skill.score}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {data.feedbacks.length > 0 && (
        <Card className="rounded-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="size-4 text-amber-500" />
              AI-Generated Insights
            </CardTitle>
            <CardDescription>
              Key takeaways extracted from your interview feedback across all sessions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.feedbacks.slice(-5).reverse().map((fb, i) => {
                const snippet = fb.length > 200 ? fb.slice(0, 200) + "..." : fb;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedInsight(selectedInsight === i ? null : i)}
                    className={cn(
                      "w-full rounded-none border border-border p-4 text-left transition-colors hover:bg-accent/50",
                      selectedInsight === i && "border-primary",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {selectedInsight === i ? fb : snippet}
                      </p>
                      <Sparkles className="size-4 shrink-0 text-amber-500" />
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {data.recentInterviews.length > 0 && (
        <Card className="rounded-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BrainCircuit className="size-4 text-primary" />
              Recent Interviews
            </CardTitle>
            <CardDescription>
              Your most recent interview results.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {data.recentInterviews.map((iv) => (
                <div
                  key={iv.id}
                  className="flex items-center justify-between py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm">
                      {iv.type === "GitHub" ? "GitHub" : iv.jobRole ? (iv.jobRole.length > 60 ? iv.jobRole.slice(0, 60) + "..." : iv.jobRole) : "Resume"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(iv.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "text-sm font-medium",
                      iv.score >= 7 ? "text-emerald-500" : iv.score >= 4 ? "text-amber-500" : "text-rose-500",
                    )}>
                      {iv.score}/10
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => navigate(`/result/${iv.id}`)}
                    >
                      <ExternalLink className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
