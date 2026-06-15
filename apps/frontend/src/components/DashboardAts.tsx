import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { BACKEND_URL } from "@/lib/config";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import { cn } from "@/lib/utils";
import {
  Upload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  FileText,
  Coins,
  Clock,
  Sparkles,
  ExternalLink,
} from "lucide-react";

GlobalWorkerOptions.workerSrc = "https://unpkg.com/pdfjs-dist@6.0.227/build/pdf.worker.min.mjs";

interface AtsResult {
  id: string;
  score: number;
  keywordMatches: string[];
  missingSkills: string[];
  suggestions: string;
  summary: string;
}

interface AtsHistoryItem {
  id: string;
  score: number;
  summary: string;
  keywordMatches: string[];
  missingSkills: string[];
  createdAt: string;
}

async function extractTextFromPDF(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: buffer }).promise;
  const parts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item: any) => item.str).join(" ");
    parts.push(text);
  }
  return parts.join("\n\n");
}

export function DashboardAts() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<AtsResult | null>(null);
  const [history, setHistory] = useState<AtsHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshHistory = () => {
    if (!token) return;
    fetch(`${BACKEND_URL}/api/v1/ats/history`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setHistory(data.checks ?? []))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  };

  useEffect(refreshHistory, [token]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.endsWith("pdf")) {
      toast("Please upload a PDF file.");
      if (e.target) e.target.value = "";
      return;
    }
    setParsing(true);
    setFileName(file.name);
    setResult(null);
    try {
      const text = await extractTextFromPDF(file);
      if (!text.trim()) {
        toast("Could not extract text from this PDF.");
        setFileName(null);
      } else {
        setResumeText(text);
        toast(`Extracted ${text.split(/\s+/).length} words from resume`);
      }
    } catch {
      toast("Failed to parse PDF.");
      setFileName(null);
    } finally {
      setParsing(false);
      if (e.target) e.target.value = "";
    }
  }

  async function onSubmit() {
    if (!resumeText.trim()) {
      toast("Please upload your resume PDF first");
      return;
    }
    if (!jobDescription.trim()) {
      toast("Please paste the job description");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/ats/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ resumeText: resumeText.trim(), jobDescription: jobDescription.trim() }),
      });
      if (res.status === 402) {
        toast("Insufficient credits. Please purchase more credits.");
        return;
      }
      if (!res.ok) {
        toast("ATS check failed. Please try again.");
        return;
      }
      const data = await res.json();
      setResult(data);
      window.dispatchEvent(new Event("credits-updated"));
      refreshHistory();
    } catch {
      toast("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const scoreColor = result
    ? result.score >= 80 ? "text-emerald-500" : result.score >= 50 ? "text-amber-500" : "text-rose-500"
    : "";
  const scoreBarColor = result
    ? result.score >= 80 ? "bg-emerald-500" : result.score >= 50 ? "bg-amber-500" : "bg-rose-500"
    : "";

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">ATS Resume Checker</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload your resume and paste a job description to check ATS compatibility. Each check costs <span className="font-medium text-foreground">2 credits</span>.
        </p>
      </div>

      {/* Input */}
      <Card className="rounded-none border-border/60">
        <CardContent className="space-y-5 p-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Resume (PDF)</label>
            <div className="flex items-center gap-3">
              <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" onChange={handleFileUpload} className="hidden" />
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={parsing} className="gap-2">
                {parsing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                {parsing ? "Parsing..." : resumeText ? "Replace PDF" : "Upload PDF"}
              </Button>
              {fileName && !parsing && (
                <span className="flex items-center gap-1.5 text-sm text-emerald-500">
                  <CheckCircle2 className="size-4" /> {fileName}
                </span>
              )}
              {parsing && (
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Extracting text...
                </span>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Job Description</label>
            <Textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here..."
              className="min-h-[130px] resize-y"
              disabled={loading}
            />
          </div>
          <Button
            disabled={loading || parsing || !resumeText.trim() || !jobDescription.trim()}
            onClick={onSubmit}
            size="lg"
            className="w-full gap-2"
          >
            {loading ? (
              <><Loader2 className="size-4 animate-spin" /> Analyzing...</>
            ) : (
              <><Coins className="size-4" /> Check ATS (2 credits)</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <Card className="rounded-none border-border/60">
          <CardContent className="p-6">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
              <div className="flex flex-col items-center gap-1">
                <div className={cn("text-5xl font-bold tracking-tight", scoreColor)}>{result.score}</div>
                <div className={cn("h-1.5 w-24 rounded-full bg-muted overflow-hidden")}>
                  <div className={cn("h-full rounded-full transition-all duration-700", scoreBarColor)} style={{ width: `${result.score}%` }} />
                </div>
                <p className={cn("text-xs font-medium mt-0.5", scoreColor)}>
                  {result.score >= 80 ? "Strong Match" : result.score >= 50 ? "Moderate Match" : "Weak Match"}
                </p>
              </div>
              <div className="flex-1 space-y-2 text-center sm:text-left">
                <p className="text-sm leading-relaxed text-foreground/90">{result.summary}</p>
                <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-500">
                    <CheckCircle2 className="size-3" /> {result.keywordMatches.length} keywords
                  </span>
                  <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-500">
                    <AlertTriangle className="size-3" /> {result.missingSkills.length} missing
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/dashboard/ats-review/${result.id}`)}
                  className="gap-1.5 mt-2"
                >
                  Full report <ArrowRight className="size-3.5" />
                </Button>
              </div>
            </div>

            {/* Quick keywords */}
            {(result.keywordMatches.length > 0 || result.missingSkills.length > 0) && (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {result.keywordMatches.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium text-emerald-500">Found in resume</p>
                    <div className="flex flex-wrap gap-1">
                      {result.keywordMatches.map((kw) => (
                        <span key={kw} className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-500">{kw}</span>
                      ))}
                    </div>
                  </div>
                )}
                {result.missingSkills.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium text-rose-500">Missing from resume</p>
                    <div className="flex flex-wrap gap-1">
                      {result.missingSkills.map((kw) => (
                        <span key={kw} className="rounded bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-500">{kw}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* History */}
      <Card className="rounded-none border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="size-4 text-primary" />
            Check History
          </CardTitle>
          <CardDescription>Your past ATS resume checks.</CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
          ) : history.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No ATS checks yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="flex cursor-pointer items-center justify-between py-3 transition-colors hover:bg-accent/30 px-2 -mx-2"
                  onClick={() => navigate(`/dashboard/ats-review/${item.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "text-lg font-bold tabular-nums min-w-[2ch]",
                      item.score >= 80 ? "text-emerald-500" : item.score >= 50 ? "text-amber-500" : "text-rose-500",
                    )}>
                      {item.score}
                    </span>
                    <div className="min-w-0 max-w-[400px]">
                      <p className="truncate text-sm text-foreground/80">{item.summary}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.keywordMatches.length} matched · {item.missingSkills.length} missing · {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
