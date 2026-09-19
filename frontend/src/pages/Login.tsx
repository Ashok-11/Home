import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ExternalLink, Loader2, Lock, Smartphone } from "lucide-react";
import { apiPost } from "@/lib/api";
import { beginSession, useMe } from "@/lib/session";
import { HERO_IMAGES } from "@/lib/constants";
import { ManshokMark } from "@/components/decor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const me = useMe();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (me.isSuccess) return <Navigate to="/dashboard" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await apiPost("/auth/login", { email, password });
      beginSession();
      navigate("/dashboard", { replace: true });
    } catch {
      toast.error("Those credentials don't match — only Ashok and Manasa can sign in.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[#0E1A12] px-4 py-10" data-testid="login-page">
      {/* layered backdrop */}
      <img src={HERO_IMAGES.login} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
      <div className="absolute inset-0 bg-gradient-to-br from-[#0E1A12]/95 via-[#14261B]/90 to-[#2A1409]/90" />
      <div aria-hidden className="aurora absolute -left-40 top-[-10rem] h-[38rem] w-[38rem] rounded-full" />
      <div aria-hidden className="grain absolute inset-0" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-[#E4B45A]/25 bg-[#101B13]/70 shadow-[0_30px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl lg:grid-cols-2">
        {/* brand panel */}
        <div className="relative hidden flex-col justify-between p-10 lg:flex">
          <div className="flex items-center gap-3">
            <ManshokMark className="h-12 w-12" />
            <div>
              <p className="font-heading text-2xl font-bold text-[#F6F1E4]">Manshok</p>
              <p className="text-[11px] uppercase tracking-[0.28em] text-[#E4B45A]">Manasa + Ashok</p>
            </div>
          </div>
          <div>
            <h2 className="font-heading text-4xl font-bold leading-tight text-[#F6F1E4]">
              One home,
              <br />
              <span className="text-gradient-gold">one command centre.</span>
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#A9BCAE]">
              Every rupee, every card, every meal and every service date — kept in one warm,
              private place for the two of you.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Expenses & cards", "Income & budget", "Menu & recipes", "Service history"].map((chip) => (
                <span key={chip} className="rounded-full border border-[#E4B45A]/25 bg-white/5 px-3 py-1 text-xs text-[#E7DFCE]">
                  {chip}
                </span>
              ))}
            </div>
          </div>
          <p className="flex items-center gap-2 text-xs text-[#8FA394]">
            <Smartphone className="h-3.5 w-3.5" /> Installable on your phone — open the browser menu and tap "Add to Home screen".
          </p>
        </div>

        {/* form panel */}
        <div className="gold-edge relative rounded-3xl bg-[#FAF6EE] p-8 sm:p-10">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <ManshokMark className="h-10 w-10" />
            <div>
              <p className="font-heading text-lg font-bold">Manshok</p>
              <p className="text-[10px] uppercase tracking-[0.22em] text-[#B08432]">Manasa + Ashok</p>
            </div>
          </div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-[#1A211B]">Welcome home</h1>
          <p className="mt-1 text-sm text-[#5E6A5C]">Sign in to your household.</p>

          <form onSubmit={submit} className="mt-7 grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                data-testid="login-email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@gmail.com"
                autoComplete="email"
                className="bg-white"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                data-testid="login-password-input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="bg-white"
              />
            </div>
            <Button
              type="submit"
              data-testid="login-submit-button"
              disabled={busy}
              className="mt-2 h-11 bg-gradient-to-r from-[#1E4030] to-[#2C5A41] text-[#F6F1E4] transition-transform hover:scale-[1.01] hover:from-[#23492F] hover:to-[#336548]"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in to Manshok"}
            </Button>
          </form>

          <div className="mt-5 flex items-start gap-2 rounded-xl bg-[#F1E9DA] px-3 py-2.5 text-xs text-[#5E6A5C]">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#B08432]" />
            <span>
              Private household — only <strong>Ashok</strong> and <strong>Manasa</strong> have accounts.
            </span>
          </div>

          <Link
            to="/cook"
            data-testid="login-cook-link"
            className="mt-4 flex items-center justify-center gap-2 rounded-full border border-[#D0663C]/40 px-4 py-2.5 text-sm font-semibold text-[#D0663C] transition-colors hover:bg-[#D0663C]/10"
          >
            <ExternalLink className="h-4 w-4" /> Cook view — no login needed
          </Link>
        </div>
      </div>
    </div>
  );
}
