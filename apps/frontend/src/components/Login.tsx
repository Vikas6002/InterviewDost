import { Button } from "../components/ui/button";
import { Github } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router";

export function Login() {
  const { login, loading, user } = useAuth();
  const navigate = useNavigate();

  if (loading) return null;
  if (user) {
    navigate("/dashboard", { replace: true });
    return null;
  }

  return (
    <main className="flex h-screen w-screen items-center justify-center px-6 bg-background">
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <h1 className="text-3xl font-bold tracking-tight">Sign in</h1>
        <p className="mt-2 text-muted-foreground">
          Sign in with GitHub to start an interview.
        </p>
        <Button onClick={login} size="lg" className="mt-8 w-full gap-2">
          <Github className="size-5" />
          Sign in with GitHub
        </Button>
      </div>
    </main>
  );
}
