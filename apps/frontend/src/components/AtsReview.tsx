import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { BACKEND_URL } from "@/lib/config";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, CheckCircle2, AlertTriangle, Lightbulb, Sparkles, Target } from "lucide-react";
import { useNavigate } from "react-router";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell } from "recharts";

interface AtsDetail {
  id: string;
  score: number;
  keywordMatches: string[];
  missingSkills: string[];
  suggestions: string;
  summary: string;
  resumeText: string;
  jobDescription: string;
  createdAt: string;
}

export function AtsReview() {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<AtsDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !id) return;
    fetch(`${BACKEND_URL}/api/v1/ats/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, id]);

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <Loader2 className="size-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-muted-foreground">ATS check not found.</p>
        <Button variant="outline" onClick={() => navigate("/dashboard/ats")}>
          Back to ATS Checker
        </Button>
      </div>
    );
  }

  const matchedCount = data.keywordMatches.length;
  const missingCount = data.missingSkills.length;
  const totalKeywords = matchedCount + missingCount;
  const matchRate = totalKeywords > 0 ? Math.round((matchedCount / totalKeywords) * 100) : 0;

  const chartData = [
    { name: "Matched", value: matchedCount, fill: "var(--chart-1)" },
    { name: "Missing", value: missingCount, fill: "var(--chart-2)" },
  ];

  const scoreColor = data.score >= 80 ? "text-emerald-500" : data.score >= 50 ? "text-amber-500" : "text-rose-500";
  const scoreBg = data.score >= 80 ? "bg-emerald-500/10 border-emerald-500/30" : data.score >= 50 ? "bg-amber-500/10 border-amber-500/30" : "bg-rose-500/10 border-rose-500/30";

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/ats")}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">ATS Review</h1>
          <p className="text-xs text-muted-foreground">{new Date(data.createdAt).toLocaleString()}</p>
        </div>
      </div>

      {/* Score hero */}
      <Card className={cn("rounded-none border-2", scoreBg)}>
        <CardContent className="flex flex-col items-center gap-4 py-8 sm:flex-row sm:gap-8">
          <div className="flex flex-col items-center">
            <div className={cn("text-6xl font-bold tracking-tight", scoreColor)}>{data.score}</div>
            <p className={cn("text-xs font-medium mt-1", scoreColor)}>
              {data.score >= 80 ? "Strong Match" : data.score >= 50 ? "Moderate Match" : "Weak Match"}
            </p>
          </div>
          <div className="flex-1 space-y-2 text-center sm:text-left">
            <p className="text-sm leading-relaxed text-foreground/90">{data.summary}</p>
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground sm:justify-start">
              <span>{matchedCount} keywords matched</span>
              <span className="text-muted-foreground/30">|</span>
              <span>{missingCount} missing</span>
              <span className="text-muted-foreground/30">|</span>
              <span>{matchRate}% match rate</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts + keywords grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bar chart */}
        <Card className="rounded-none border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Target className="size-4 text-primary" />
              Keyword Match Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {totalKeywords === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No keywords detected.</p>
            ) : (
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} allowDecimals={false} />
                    <Tooltip content={({ active, payload }) => {
                      if (!active || !payload?.length || !payload[0]) return null;
                      return (
                        <div className="rounded-none border border-border bg-card px-3 py-2 shadow-lg text-sm">
                          {payload[0].name}: {payload[0].value}
                        </div>
                      );
                    }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={80}>
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Suggestions */}
        <Card className="rounded-none border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Lightbulb className="size-4 text-amber-500" />
              How to Improve
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-foreground/90">{data.suggestions}</p>
            <div className="mt-4 space-y-2">
              {data.missingSkills.slice(0, 5).map((skill) => (
                <div key={skill} className="flex items-center gap-2 rounded border border-border/40 bg-card/30 px-3 py-2 text-sm">
                  <AlertTriangle className="size-3.5 shrink-0 text-rose-500" />
                  <span className="text-muted-foreground">Add experience with <span className="font-medium text-foreground">{skill}</span></span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Keywords detail */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-none border-border/60 border-l-4 border-l-emerald-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="size-4 text-emerald-500" />
              Keywords Found ({matchedCount})
            </CardTitle>
            <CardDescription>Terms from the job description present in your resume</CardDescription>
          </CardHeader>
          <CardContent>
            {data.keywordMatches.length === 0 ? (
              <p className="text-sm text-muted-foreground">None detected</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {data.keywordMatches.map((kw) => (
                  <span key={kw} className="rounded bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-500">
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-none border-border/60 border-l-4 border-l-rose-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="size-4 text-rose-500" />
              Missing Skills ({missingCount})
            </CardTitle>
            <CardDescription>Critical keywords missing from your resume</CardDescription>
          </CardHeader>
          <CardContent>
            {data.missingSkills.length === 0 ? (
              <p className="text-sm text-muted-foreground">None detected</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {data.missingSkills.map((kw) => (
                  <span key={kw} className="rounded bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-500">
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resume & JD preview */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-none border-border/60">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Resume Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground line-clamp-[15]">
              {data.resumeText}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-none border-border/60">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Job Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground line-clamp-[15]">
              {data.jobDescription}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
