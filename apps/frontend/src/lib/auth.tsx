import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");
    if (urlToken) {
      localStorage.setItem("session_token", urlToken);
      window.history.replaceState({}, "", window.location.pathname);
    }

    const saved = localStorage.getItem("session_token");
    if (saved) {
      setToken(saved);
      fetch(`${BACKEND_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${saved}` },
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.user) setUser(data.user);
          else {
            localStorage.removeItem("session_token");
            setToken(null);
          }
        })
        .catch(() => {
          localStorage.removeItem("session_token");
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

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
