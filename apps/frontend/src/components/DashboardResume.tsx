import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import axios from "axios";
import { BACKEND_URL } from "@/lib/config";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
  import {
  ArrowRight,
  FileText,
  Loader2,
  Upload,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Coins,
} from "lucide-react";

GlobalWorkerOptions.workerSrc = "https://unpkg.com/pdfjs-dist@6.0.227/build/pdf.worker.min.mjs";

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

export function DashboardResume() {
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { token } = useAuth();

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

    try {
      const text = await extractTextFromPDF(file);
      if (!text.trim()) {
        toast("Could not extract text from this PDF. The file may be scanned or image-based.");
        setFileName(null);
      } else {
        setResumeText(text);
        toast(`Extracted ${text.split(/\s+/).length} words from resume`);
      }
    } catch {
      toast("Failed to parse PDF. Please try a different file.");
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
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/v1/pre-interview/resume`,
        {
          resumeText: resumeText.trim(),
          jobRole: jobDescription.trim(),
        },
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
          Resume-Based Interview
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload your resume PDF and paste the job description to get a
          tailored interview experience.
        </p>
      </div>

      <div className="space-y-5 rounded-none border border-border bg-card/50 p-6 backdrop-blur">
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Upload Resume (PDF)
            <span className="ml-1 text-destructive">*</span>
          </label>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={parsing}
              className="gap-2"
            >
              {parsing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              {parsing ? "Parsing..." : resumeText ? "Replace PDF" : "Upload PDF"}
            </Button>
            {fileName && !parsing && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-500">
                <CheckCircle2 className="size-4" />
                {fileName}
              </span>
            )}
            {parsing && (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Extracting text...
              </span>
            )}
          </div>
          {resumeText && !parsing && (
            <p className="text-xs text-muted-foreground">
              {resumeText.split(/\s+/).length} words extracted. PDF parsed
              locally — no data leaves your browser.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Job Description
            <span className="ml-1 text-destructive">*</span>
          </label>
          <Textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job description here... We'll use it to tailor interview questions to the specific role."
            className="min-h-[180px] resize-y"
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
            <>
              <Loader2 className="size-4 animate-spin" />
              Starting interview...
            </>
          ) : (
            <>
              <Coins className="size-4" />
              Start (10 credits)
            </>
          )}
        </Button>
      </div>

      <div className="rounded-none border border-border bg-card/30 p-5">
        <div className="flex items-start gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10">
            <FileText className="size-4 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">How it works</p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>1. Upload your resume PDF — text is extracted locally using Mozilla's PDF.js</li>
              <li>2. Paste the job description you're targeting</li>
              <li>3. We'll generate interview questions tailored to your resume and the role</li>
              <li>4. Complete the interview and get AI-powered feedback</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
