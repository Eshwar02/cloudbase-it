import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Spinner } from "../components/ui/Spinner";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading, isError } = useAuth();
  if (isLoading) return <div className="flex h-full items-center justify-center"><Spinner /></div>;
  if (isError || !user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
