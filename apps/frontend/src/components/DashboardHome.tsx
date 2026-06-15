import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import axios from "axios";
import { BACKEND_URL } from "@/lib/config";
import { useAuth } from "@/lib/auth";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BrainCircuit,
  FileText,
  Github,
  Loader2,
  Trophy,
  TrendingUp,
  Calendar,
} from "lucide-react";

type FilterPeriod = "day" | "month" | "year";

interface Stats {
  totalInterviews: number;
  completedInterviews: number;
  averageScore: number;
  scoresOverTime: { date: string; score: number; type: string }[];
  typeBreakdown: { github: number; resume: number };
  statusCount: { completed: number; inProgress: number; pre: number };
}

const CHART_COLORS = {
  GitHub: "var(--chart-1)",
  Resume: "var(--chart-2)",
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-none border border-border bg-card px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm font-medium" style={{ color: entry.color }}>
          {entry.name}: {entry.value}/10
        </p>
      ))}
    </div>
  );
}

export function DashboardHome() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<FilterPeriod>("day");
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get(`${BACKEND_URL}/api/v1/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  function computeChartValues() {
    if (!stats) return [];
    const now = Date.now();
    const day = 86400000;

    const filtered = stats.scoresOverTime.filter((s) => {
      const t = new Date(s.date).getTime();
      if (period === "day") return t >= now - day;
      if (period === "month") return t >= now - 30 * day;
      return t >= now - 365 * day;
    });

    if (period === "year") {
      const grouped: Record<string, any> = {};
      for (const item of filtered) {
        const key = new Date(item.date).toLocaleString("en-US", { month: "short", year: "2-digit" });
        if (!grouped[key]) grouped[key] = { date: key, count: 0 };
        grouped[key][item.type] = (grouped[key][item.type] ?? 0) + item.score;
        grouped[key].count++;
      }
      for (const g of Object.values(grouped) as any[]) {
        if (g.GitHub !== undefined) g.GitHub = Math.round((g.GitHub / g.count) * 10) / 10;
        if (g.Resume !== undefined) g.Resume = Math.round((g.Resume / g.count) * 10) / 10;
      }
      return Object.values(grouped);
    }

    if (period === "day") {
      const grouped: Record<string, any> = {};
      for (const item of filtered) {
        const key = new Date(item.date).toLocaleString("en-US", { hour: "2-digit", hour12: false });
        if (!grouped[key]) grouped[key] = { date: key, count: 0 };
        grouped[key][item.type] = (grouped[key][item.type] ?? 0) + item.score;
        grouped[key].count++;
      }
      for (const g of Object.values(grouped) as any[]) {
        if (g.GitHub !== undefined) g.GitHub = Math.round((g.GitHub / g.count) * 10) / 10;
        if (g.Resume !== undefined) g.Resume = Math.round((g.Resume / g.count) * 10) / 10;
      }
      return Object.values(grouped);
    }

    const grouped: Record<string, any> = {};
    for (const item of filtered) {
      const key = item.date.slice(0, 10);
      if (!grouped[key]) grouped[key] = { date: key, count: 0 };
      grouped[key][item.type] = (grouped[key][item.type] ?? 0) + item.score;
      grouped[key].count++;
    }
    for (const g of Object.values(grouped) as any[]) {
      if (g.GitHub !== undefined) g.GitHub = Math.round((g.GitHub / g.count) * 10) / 10;
      if (g.Resume !== undefined) g.Resume = Math.round((g.Resume / g.count) * 10) / 10;
    }
    return Object.values(grouped).sort(
      (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }

  const chartValues = useMemo(computeChartValues, [stats, period]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-muted-foreground">Failed to load dashboard data.</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your interview progress and performance overview.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/github")}>
            <Github className="mr-1.5 size-4" />
            GitHub
          </Button>
          <Button size="sm" onClick={() => navigate("/dashboard/resume")}>
            <FileText className="mr-1.5 size-4" />
            Resume
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Interviews</CardTitle>
            <BrainCircuit className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInterviews}</div>
            <p className="text-xs text-muted-foreground">
              {stats.statusCount.completed} completed, {stats.statusCount.inProgress} in progress
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Trophy className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedInterviews}</div>
            <p className="text-xs text-muted-foreground">
              {((stats.completedInterviews / Math.max(stats.totalInterviews, 1)) * 100).toFixed(0)}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg. Score</CardTitle>
            <TrendingUp className="size-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.averageScore}
              <span className="text-sm font-normal text-muted-foreground">/10</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Across {stats.completedInterviews} completed interviews
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.scoresOverTime.filter(
                (s) => new Date(s.date).getTime() >= Date.now() - 30 * 86400000,
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Interviews this month
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-none overflow-hidden border-border/60">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold tracking-tight">
                Performance Trend
              </CardTitle>
              <CardDescription>
                Your interview scores over time, broken down by type.
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex overflow-hidden rounded-md border border-border text-xs font-medium">
                {(["day", "month", "year"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={cn(
                      "px-3 py-1.5 transition-colors",
                      period === p
                        ? "bg-primary text-primary-foreground"
                        : "bg-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {p === "day" ? "Today" : p === "month" ? "Month" : "Year"}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: "var(--chart-1)" }} />
                  GitHub
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: "var(--chart-2)" }} />
                  Resume
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {chartValues.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <TrendingUp className="size-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm font-medium text-muted-foreground">
                No interview data yet
              </p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                Complete an interview to see your performance chart.
              </p>
            </div>
          ) : (
            <div className="h-[320px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartValues}
                  margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="githubGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="resumeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="4 4"
                    stroke="var(--border)"
                    vertical={false}
                    strokeOpacity={0.4}
                  />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickFormatter={(val) => {
                      if (period === "month") {
                        const d = new Date(val);
                        return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                      }
                      if (period === "day") return val + ":00";
                      return val;
                    }}
                  />
                  <YAxis
                    domain={[0, 10]}
                    tickCount={6}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "4 4", strokeOpacity: 0.3 }} />
                  <Area
                    type="monotone"
                    dataKey="GitHub"
                    stroke="var(--chart-1)"
                    strokeWidth={2.5}
                    fill="url(#githubGrad)"
                    dot={{ fill: "var(--chart-1)", strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6, strokeWidth: 0, fill: "var(--chart-1)" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="Resume"
                    stroke="var(--chart-2)"
                    strokeWidth={2.5}
                    fill="url(#resumeGrad)"
                    dot={{ fill: "var(--chart-2)", strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6, strokeWidth: 0, fill: "var(--chart-2)" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="rounded-none cursor-pointer transition-colors hover:bg-accent/50" onClick={() => navigate("/dashboard/github")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Github className="size-5" />
              GitHub Interview
            </CardTitle>
            <CardDescription>
              Start an interview based on your GitHub profile and repositories.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className="rounded-none cursor-pointer transition-colors hover:bg-accent/50" onClick={() => navigate("/dashboard/resume")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-5" />
              Resume Interview
            </CardTitle>
            <CardDescription>
              Start an interview tailored to your resume and target job role.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
