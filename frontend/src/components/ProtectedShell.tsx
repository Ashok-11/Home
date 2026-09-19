import { Navigate } from "react-router-dom";
import { useMe } from "@/lib/session";
import { BackgroundBlobs, ManshokMark } from "@/components/decor";
import AppLayout from "@/components/AppLayout";

/** Gate for all private routes: branded loader while checking, redirect to /login on 401. */
export default function ProtectedShell() {
  const me = useMe();

  if (me.isPending) {
    return (
      <div className="relative flex min-h-svh flex-col items-center justify-center bg-background">
        <BackgroundBlobs />
        <div className="animate-pulse">
          <ManshokMark className="h-16 w-16" />
        </div>
        <p className="mt-4 font-heading text-lg text-muted-foreground">Opening Manshok…</p>
      </div>
    );
  }

  if (me.isError) {
    return <Navigate to="/login" replace />;
  }

  return <AppLayout />;
}
