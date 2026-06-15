import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router";
import { BACKEND_URL } from "./config";

interface User {
  id: string;
  username: string;
  avatarUrl: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  token: string | null;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  token: null,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const navigate = useNavigate();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");

    if (urlToken) {
      localStorage.setItem("session_token", urlToken);
      window.history.replaceState({}, "", window.location.pathname);
      setToken(urlToken);
      validateToken(urlToken, true);
      navigate("/dashboard", { replace: true });
      return;
    }

    const saved = localStorage.getItem("session_token");
    if (saved) {
      setToken(saved);
      validateToken(saved, false);
    } else {
      setLoading(false);
    }
  }, [navigate]);

  async function validateToken(t: string, isNew: boolean) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${t}` },
        signal: controller.signal,
      });

      if (res.status === 401) {
        localStorage.removeItem("session_token");
        setToken(null);
        setUser(null);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (data.user) {
        setUser(data.user);
      }
    } catch {
      if (isNew) {
        localStorage.removeItem("session_token");
        setToken(null);
        setUser(null);
      }
    } finally {
      clearTimeout(id);
      setLoading(false);
    }
  }

  function login() {
    window.location.href = `${BACKEND_URL}/api/v1/auth/github`;
  }

  function logout() {
    if (token) {
      fetch(`${BACKEND_URL}/api/v1/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    localStorage.removeItem("session_token");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
