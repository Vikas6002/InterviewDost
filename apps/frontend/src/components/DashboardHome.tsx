import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import axios from "axios";
import { BACKEND_URL } from "@/lib/config";
import { useAuth } from "@/lib/auth";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
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
  FileText,
  Github,
  Loader2,
  Trophy,
  TrendingUp,
  Calendar,
} from "lucide-react";

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

  const chartData = stats.scoresOverTime.reduce<Record<string, any>>((acc, item) => {
    if (!acc[item.date]) {
      acc[item.date] = { date: item.date };
    }
    acc[item.date][item.type] = item.score;
    return acc;
  }, {});

  const chartValues = Object.values(chartData).sort(
    (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Header */}
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

      {/* Stat cards */}
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
                (s) => s.date >= new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0],
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Interviews this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bar Chart */}
      <Card className="rounded-none">
        <CardHeader>
          <CardTitle>Performance Trend</CardTitle>
          <CardDescription>
            Your interview scores over time, broken down by type.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chartValues.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <BarChart className="size-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm font-medium text-muted-foreground">
                No interview data yet
              </p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                Complete an interview to see your performance chart.
              </p>
            </div>
          ) : (
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartValues}
                  margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis
                    domain={[0, 10]}
                    tickCount={6}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.3 }} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                  />
                  <Bar
                    dataKey="GitHub"
                    fill={CHART_COLORS.GitHub}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={48}
                  />
                  <Bar
                    dataKey="Resume"
                    fill={CHART_COLORS.Resume}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
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
