import "styles/globals.css"
import { Landing } from "./components/Landing";
import { Login } from "./components/Login";
import { Form } from "./components/Form";
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

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/interview" element={
            <ProtectedRoute><Form /></ProtectedRoute>
          } />
          <Route path="/interview/:interviewId" element={
            <ProtectedRoute><Interview /></ProtectedRoute>
          } />
          <Route path="/result/:interviewId" element={
            <ProtectedRoute><Result /></ProtectedRoute>
          } />
        </Routes>
        <Toaster position="bottom-left" />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
