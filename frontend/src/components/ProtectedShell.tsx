import { Navigate, Outlet } from "react-router-dom";
import { ChefHat } from "lucide-react";
import { useMe } from "@/lib/session";
import { BackgroundBlobs } from "@/components/decor";
import AppLayout from "@/components/AppLayout";

/** Gate for all private routes: warm loader while checking, redirect to /login on 401. */
export default function ProtectedShell() {
  const me = useMe();

  if (me.isPending) {
    return (
      <div className="relative flex min-h-svh flex-col items-center justify-center bg-background">
        <BackgroundBlobs />
        <div className="flex h-16 w-16 animate-pulse items-center justify-center rounded-3xl bg-[#C85A32] text-white shadow-xl">
          <ChefHat className="h-8 w-8" />
        </div>
        <p className="mt-4 font-heading text-lg text-muted-foreground">Warming the kitchen…</p>
      </div>
    );
  }

  if (me.isError) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppLayout />
  );
}
