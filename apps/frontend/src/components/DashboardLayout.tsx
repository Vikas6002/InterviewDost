import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router";
import { useAuth } from "@/lib/auth";
import { BACKEND_URL } from "@/lib/config";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Home,
  FileText,
  Github,
  History,
  LogOut,
  Menu,
  X,
  ChevronRight,
  GraduationCap,
  BarChart3,
  Coins,
  Zap,
  Loader2,
  ScrollText,
} from "lucide-react";

const sidebarItems = [
  { to: "/dashboard", icon: Home, label: "Home", end: true },
  { to: "/dashboard/analytics", icon: BarChart3, label: "Analytics", end: false },
  { to: "/dashboard/resume", icon: FileText, label: "Resume", end: false },
  { to: "/dashboard/github", icon: Github, label: "GitHub", end: false },
  { to: "/dashboard/history", icon: History, label: "History", end: false },
  { to: "/dashboard/ats", icon: ScrollText, label: "ATS Check", end: false },
  { to: "/dashboard/pricing", icon: Coins, label: "Pricing", end: false },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [creditInfo, setCreditInfo] = useState<{ credits: number; isUnlimited: boolean } | null>(null);
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  function loadCredits() {
    if (!token) return;
    fetch(`${BACKEND_URL}/api/v1/credits`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setCreditInfo)
      .catch(() => {});
  }

  useEffect(() => {
    loadCredits();
    const handler = () => loadCredits();
    window.addEventListener("credits-updated", handler);
    return () => window.removeEventListener("credits-updated", handler);
  }, [token]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-sidebar transition-transform duration-200 ease-in-out lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-5">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 font-semibold text-sidebar-foreground"
          >
            <GraduationCap className="size-5 text-primary" />
            <span>InterviewDost</span>
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-sidebar-foreground/60 hover:text-sidebar-foreground lg:hidden"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {sidebarItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-none px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )
              }
            >
              <item.icon className="size-4 shrink-0" />
              <span>{item.label}</span>
              <ChevronRight className="ml-auto size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
            </NavLink>
          ))}
        </nav>

        {creditInfo && (
          <div className="border-t border-border px-3 py-2">
            <NavLink
              to="/dashboard/pricing"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-2 rounded-none px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent/50"
            >
              {creditInfo.isUnlimited ? (
                <Zap className="size-4 text-amber-500" />
              ) : (
                <Coins className="size-4 text-amber-500" />
              )}
              <span className="text-sidebar-foreground/70">
                {creditInfo.isUnlimited ? "Unlimited" : `${creditInfo.credits} credits`}
              </span>
            </NavLink>
          </div>
        )}

        <div className="border-t border-border p-3">
          <div className="mb-3 flex items-center gap-3 rounded-none px-3 py-2">
            <div className="size-8 shrink-0 overflow-hidden rounded-full bg-sidebar-accent">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.username}
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-sm font-medium text-sidebar-foreground">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {user?.username}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground"
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-border px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Menu className="size-5" />
          </button>
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <GraduationCap className="size-5 text-primary" />
            <span>InterviewDost</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
