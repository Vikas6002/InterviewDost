import "styles/globals.css";
import { Landing } from "./components/Landing";
import { Login } from "./components/Login";
import { DashboardLayout } from "./components/DashboardLayout";
import { DashboardHome } from "./components/DashboardHome";
import { DashboardResume } from "./components/DashboardResume";
import { DashboardGitHub } from "./components/DashboardGitHub";
import { DashboardAnalytics } from "./components/DashboardAnalytics";
import { DashboardHistory } from "./components/DashboardHistory";
import { DashboardPricing } from "./components/DashboardPricing";
import { DashboardAts } from "./components/DashboardAts";
import { AtsReview } from "./components/AtsReview";
import { MouseFollower } from "./components/MouseFollower";
import { Interview } from "./components/Interview";
import { Result } from "./components/Result";
import { Toaster } from "sonner";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { AuthProvider, useAuth } from "@/lib/auth";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  if (loading) return null;
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <DashboardLayout>{children}</DashboardLayout>
    </ProtectedRoute>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MouseFollower />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />

          <Route
            path="/dashboard"
            element={
              <DashboardShell>
                <DashboardHome />
              </DashboardShell>
            }
          />
          <Route
            path="/dashboard/analytics"
            element={
              <DashboardShell>
                <DashboardAnalytics />
              </DashboardShell>
            }
          />
          <Route
            path="/dashboard/resume"
            element={
              <DashboardShell>
                <DashboardResume />
              </DashboardShell>
            }
          />
          <Route
            path="/dashboard/github"
            element={
              <DashboardShell>
                <DashboardGitHub />
              </DashboardShell>
            }
          />
          <Route
            path="/dashboard/history"
            element={
              <DashboardShell>
                <DashboardHistory />
              </DashboardShell>
            }
          />
          <Route
            path="/dashboard/ats"
            element={
              <DashboardShell>
                <DashboardAts />
              </DashboardShell>
            }
          />
          <Route
            path="/dashboard/ats-review/:id"
            element={
              <DashboardShell>
                <AtsReview />
              </DashboardShell>
            }
          />
          <Route
            path="/dashboard/pricing"
            element={
              <DashboardShell>
                <DashboardPricing />
              </DashboardShell>
            }
          />

          <Route
            path="/interview/:interviewId"
            element={
              <ProtectedRoute>
                <Interview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/result/:interviewId"
            element={
              <DashboardShell>
                <Result />
              </DashboardShell>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="bottom-left" />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
