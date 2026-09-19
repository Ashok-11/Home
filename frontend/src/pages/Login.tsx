import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChefHat, ExternalLink, Loader2 } from "lucide-react";
import { apiPost } from "@/lib/api";
import { beginSession, useMe } from "@/lib/session";
import { HERO_IMAGES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const me = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [email, setEmail] = useState("husband@homeboard.app");
  const [password, setPassword] = useState("kitchen123");
  const [busy, setBusy] = useState(false);

  if (me.isSuccess) return <Navigate to="/dashboard" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await apiPost("/auth/login", { email, password });
      beginSession();
      navigate("/dashboard", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error && err.message.includes("401") ? "Wrong email or password" : "Could not sign in — try again");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-svh" data-testid="login-page">
      {/* hero side */}
      <div className="relative hidden w-1/2 lg:block">
        <img src={HERO_IMAGES.login} alt="Warm kitchen" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#112217]/90 via-[#112217]/70 to-[#C85A32]/60" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              <ChefHat className="h-6 w-6" />
            </div>
            <span className="font-heading text-xl font-bold">HomeBoard</span>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-white/70">Warm Home Kitchen</p>
            <h2 className="mt-3 font-heading text-4xl font-bold leading-snug">
              Every rupee, every meal,
              <br />
              every chore — home at ease.
            </h2>
          </div>
        </div>
      </div>

      {/* form side */}
      <div className="relative flex w-full items-center justify-center bg-background px-6 lg:w-1/2">
        <div
          aria-hidden
          className="blob left-10 top-16 h-72 w-72"
          style={{ background: "radial-gradient(circle, #7FB08F 0%, transparent 70%)" }}
        />
        <div
          aria-hidden
          className="blob bottom-10 right-0 h-80 w-80"
          style={{ background: "radial-gradient(circle, #E8A47F 0%, transparent 70%)" }}
        />
        <div className="glass relative w-full max-w-md rounded-3xl p-8">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#C85A32] text-white">
              <ChefHat className="h-5 w-5" />
            </div>
            <span className="font-heading text-lg font-bold">HomeBoard</span>
          </div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">Welcome home</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to manage your household.</p>
          <form onSubmit={submit} className="mt-6 grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                data-testid="login-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                data-testid="login-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <Button
              type="submit"
              data-testid="login-submit-button"
              disabled={busy}
              className="mt-2 bg-[#245C3F] text-white hover:bg-[#1E4A33]"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
            </Button>
          </form>
          <p className="mt-4 text-xs text-muted-foreground">
            Household is invite-only — only the two member accounts can sign in.
          </p>
          <Link
            to="/cook"
            data-testid="login-cook-link"
            className="mt-4 flex items-center justify-center gap-2 rounded-full border border-[#C85A32]/40 px-4 py-2 text-sm font-semibold text-[#C85A32] transition-colors hover:bg-[#C85A32]/10"
          >
            <ExternalLink className="h-4 w-4" /> Open Cook View (no login)
          </Link>
        </div>
      </div>
    </div>
  );
}
