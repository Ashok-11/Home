import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  ArrowUpRight,
  Banknote,
  Building2,
  CalendarDays,
  CreditCard,
  Home,
  PiggyBank,
  Plus,
  Sparkles,
  Wallet,
} from "lucide-react";
import { apiGet, apiPut } from "@/lib/api";
import { useMe } from "@/lib/session";
import { currentMonth, formatDate, formatINR, monthLabel, todayIso } from "@/lib/format";
import { CARD_TYPE_LABELS, CHART_COLORS } from "@/lib/constants";
import type { Allowance, DashboardData } from "@/lib/types";
import { BackgroundBlobs, RingGauge } from "@/components/decor";
import ExpenseDialog from "@/components/ExpenseDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Scope = "month" | "fy" | "cal";

function fyOf(iso: string): string {
  const year = Number(iso.slice(0, 4));
  return String(Number(iso.slice(5, 7)) >= 4 ? year : year - 1);
}

function shiftMonth(m: string, delta: number): string {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function Dashboard() {
  const me = useMe();
  const qc = useQueryClient();
  const today = todayIso();

  const [scope, setScope] = useState<Scope>("month");
  const [monthKey, setMonthKey] = useState(currentMonth());
  const [fyKey, setFyKey] = useState(fyOf(today));
  const [calKey, setCalKey] = useState(today.slice(0, 4));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [allowanceInput, setAllowanceInput] = useState("");

  const key = scope === "month" ? monthKey : scope === "fy" ? fyKey : calKey;

  const dash = useQuery({
    queryKey: ["dashboard", scope, key],
    queryFn: () => apiGet<DashboardData>(`/dashboard?scope=${scope}&key=${key}`),
  });

  const allowance = useQuery({
    queryKey: ["allowance", monthKey],
    queryFn: () => apiGet<Allowance>(`/allowance?month=${monthKey}`),
  });

  const saveAllowance = useMutation({
    mutationFn: () => apiPut<Allowance>("/allowance", { month: monthKey, amount: Number(allowanceInput) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allowance"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setAllowanceInput("");
    },
  });

  const d = dash.data;
  const years = useMemo(() => {
    const y = Number(today.slice(0, 4));
    return [y - 2, y - 1, y, y + 1];
  }, [today]);

  const personalUsed = (d?.personal.ashok_used ?? 0) + (d?.personal.manasa_used ?? 0);
  const personalTotal = (d?.personal.allowance ?? 0) * 2; // per-member fund
  const personalPct = personalTotal > 0 ? (personalUsed / personalTotal) * 100 : 0;
  const budgetPct = d && d.budget > 0 ? (d.expense_total / d.budget) * 100 : 0;

  const incomeCards = [
    { label: "Ashok's Income", value: d?.income.ashok ?? 0, icon: Wallet, testid: "dashboard-income-ashok" },
    { label: "Manasa's Income", value: d?.income.manasa ?? 0, icon: PiggyBank, testid: "dashboard-income-manasa" },
    { label: "Rental Income", value: d?.income.rental ?? 0, icon: Building2, testid: "dashboard-income-rental" },
    { label: "Other Sources", value: d?.income.other ?? 0, icon: Banknote, testid: "dashboard-income-other" },
  ];

  return (
    <div className="relative">
      <BackgroundBlobs hero />
      <div className="animate-fade-up">
        {/* header + period switcher */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {formatDate(today)}
            </p>
            <h1 className="mt-1 font-heading text-4xl font-bold tracking-tight text-foreground">
              Namaste, {me.data?.name} <Home className="mb-1 inline h-7 w-7 text-[#D0663C]" />
            </h1>
            <p className="mt-1 text-sm text-muted-foreground" data-testid="dashboard-scope-label">
              Showing <span className="font-semibold text-foreground">{d?.label ?? "…"}</span>
            </p>
          </div>
          <Button
            data-testid="dashboard-add-expense-button"
            onClick={() => setDialogOpen(true)}
            className="bg-[#D0663C] text-white hover:bg-[#B8552F]"
          >
            <Plus className="h-4 w-4" /> Add expense
          </Button>
        </div>

        <div className="glass mb-6 flex flex-wrap items-center gap-3 rounded-2xl p-3">
          <Tabs value={scope} onValueChange={(v: string) => setScope(v as Scope)}>
            <TabsList variant="line">
              <TabsTrigger value="month" data-testid="scope-tab-month">
                Monthly
              </TabsTrigger>
              <TabsTrigger value="fy" data-testid="scope-tab-fy">
                Financial year
              </TabsTrigger>
              <TabsTrigger value="cal" data-testid="scope-tab-cal">
                Calendar year
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {scope === "month" && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" data-testid="dashboard-prev-month" onClick={() => setMonthKey((m) => shiftMonth(m, -1))}>
                ‹
              </Button>
              <input
                type="month"
                data-testid="dashboard-month-picker"
                value={monthKey}
                onChange={(e) => e.target.value && setMonthKey(e.target.value)}
                className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
              />
              <Button variant="outline" size="sm" data-testid="dashboard-next-month" onClick={() => setMonthKey((m) => shiftMonth(m, 1))}>
                ›
              </Button>
            </div>
          )}
          {scope === "fy" && (
            <select
              data-testid="dashboard-fy-picker"
              value={fyKey}
              onChange={(e) => setFyKey(e.target.value)}
              className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
            >
              {years.map((y) => (
                <option key={y} value={String(y)}>
                  FY {y}-{String(y + 1).slice(2)}
                </option>
              ))}
            </select>
          )}
          {scope === "cal" && (
            <select
              data-testid="dashboard-cal-picker"
              value={calKey}
              onChange={(e) => setCalKey(e.target.value)}
              className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
            >
              {years.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* income sources */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {incomeCards.map((c, i) => (
            <div
              key={c.label}
              data-testid={c.testid}
              className="card-lift gold-edge animate-pop-in jewel relative overflow-hidden rounded-2xl p-5"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A9BCAE]">{c.label}</p>
                <c.icon className="h-4 w-4 text-[#E4B45A]" />
              </div>
              <p className="font-display-num mt-3 text-2xl font-bold text-[#F6F1E4]">{formatINR(c.value)}</p>
            </div>
          ))}
        </div>

        {/* totals + gauges */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="glass rounded-2xl p-6 lg:col-span-5" data-testid="dashboard-totals-card">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Total income</p>
            <p className="font-display-num animate-count-glow mt-1 text-4xl font-bold text-[#1E4030] dark:text-[#8FBF9C]" data-testid="dashboard-income-total">
              {formatINR(d?.income.total ?? 0)}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#FDF0EB] p-4 text-[#5C200C]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">Spent</p>
                <p className="font-display-num mt-1 text-xl font-bold" data-testid="dashboard-expense-total">
                  {formatINR(d?.expense_total ?? 0)}
                </p>
              </div>
              <div className="rounded-xl bg-[#EBF2EC] p-4 text-[#1E3A2B]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">Saved</p>
                <p className="font-display-num mt-1 text-xl font-bold" data-testid="dashboard-saved-total">
                  {formatINR((d?.income.total ?? 0) - (d?.expense_total ?? 0))}
                </p>
              </div>
            </div>
          </div>

          <div className="glass flex flex-wrap items-center justify-around gap-4 rounded-2xl p-6 lg:col-span-7">
            <div className="text-center" data-testid="dashboard-budget-gauge">
              <RingGauge
                value={budgetPct}
                label={`${Math.round(budgetPct)}%`}
                sub="of budget"
                tone={budgetPct > 90 ? "danger" : "green"}
              />
              <p className="mt-2 text-sm font-medium">
                {formatINR(d?.expense_total ?? 0)} / {formatINR(d?.budget ?? 0)}
              </p>
            </div>
            <div className="text-center" data-testid="dashboard-personal-gauge">
              <RingGauge
                value={personalPct}
                label={`${Math.round(personalPct)}%`}
                sub="personal fund"
                tone={personalPct > 90 ? "danger" : "gold"}
              />
              <p className="mt-2 text-sm font-medium">
                {formatINR(personalUsed)} / {formatINR(personalTotal)} used
              </p>
              <div className="mt-1 flex justify-center gap-3 text-xs text-muted-foreground">
                <span data-testid="dashboard-personal-ashok">Ashok {formatINR(d?.personal.ashok_used ?? 0)}</span>
                <span data-testid="dashboard-personal-manasa">Manasa {formatINR(d?.personal.manasa_used ?? 0)}</span>
              </div>
            </div>
            {scope === "month" && (
              <div className="w-full sm:w-auto">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Personal fund / person ({monthLabel(monthKey)})
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    data-testid="dashboard-allowance-input"
                    type="number"
                    min="0"
                    value={allowanceInput}
                    onChange={(e) => setAllowanceInput(e.target.value)}
                    placeholder={String(allowance.data?.amount ?? 15000)}
                    className="w-28"
                  />
                  <Button
                    size="sm"
                    data-testid="dashboard-allowance-save"
                    disabled={!allowanceInput || saveAllowance.isPending}
                    onClick={() => saveAllowance.mutate()}
                  >
                    Set
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* cards spend + category chart */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Card className="rounded-2xl lg:col-span-7" data-testid="dashboard-cards-panel">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 font-heading text-xl">
                <CreditCard className="h-5 w-5 text-[#D0663C]" /> Spend by card / source
              </CardTitle>
              <Link to="/cards">
                <Button variant="ghost" size="sm" data-testid="dashboard-manage-cards-link">
                  Manage
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="grid gap-2">
              {(d?.cards ?? []).map((c) => (
                <div key={c.card_id ?? c.name} className="rounded-xl bg-muted/60 p-3" data-testid="dashboard-card-row">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {c.name}
                        {c.last4 && <span className="ml-1 font-mono text-xs text-muted-foreground">•••• {c.last4}</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {[c.bank, CARD_TYPE_LABELS[c.type] ?? c.type, c.owner].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <span className="font-display-num shrink-0 font-bold" data-testid="dashboard-card-total">
                      {formatINR(c.total)}
                    </span>
                  </div>
                  {c.total > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {Object.entries(c.by_member)
                        .filter(([, v]) => v > 0)
                        .map(([member, v]) => (
                          <span
                            key={member}
                            data-testid="dashboard-card-member-chip"
                            className="rounded-full bg-card px-2 py-0.5 text-[11px] font-medium ring-1 ring-border"
                          >
                            {member}: {formatINR(v)}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              ))}
              {d && d.cards.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No cards yet — add them so nothing is missed.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="glass rounded-2xl p-6 lg:col-span-5" data-testid="dashboard-expense-chart">
            <h2 className="font-heading text-xl font-semibold">Where the money went</h2>
            {d && d.by_category.length > 0 ? (
              <>
                <div className="mt-2 h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={d.by_category} dataKey="total" nameKey="category" innerRadius={52} outerRadius={80} paddingAngle={3} stroke="none">
                        {d.by_category.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number, name: string) => [formatINR(value), name]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  {d.by_category.slice(0, 6).map((c, i) => (
                    <span key={c.category} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      {c.category}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className="py-16 text-center text-sm text-muted-foreground">No expenses in this period.</p>
            )}
          </div>
        </div>

        {/* recent expenses */}
        <Card className="mt-4 rounded-2xl">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="font-heading text-xl">Recent expenses</CardTitle>
            <Link to="/expenses">
              <Button variant="ghost" size="sm" data-testid="dashboard-all-expenses-link">
                View all
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="grid gap-2">
            {(d?.recent_expenses ?? []).map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 px-4 py-2.5" data-testid="dashboard-recent-expense-row">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{e.note || e.category}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(e.date)} · {e.category} · {e.member}
                    {e.source_label ? ` · ${e.source_label}` : ""}
                    {e.is_personal ? " · personal" : ""}
                  </p>
                </div>
                <span className="font-display-num shrink-0 font-semibold">{formatINR(e.amount)}</span>
              </div>
            ))}
            {d && d.recent_expenses.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">Nothing logged in this period.</p>
            )}
          </CardContent>
        </Card>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link to="/chores" data-testid="dashboard-chores-link" className="card-lift glass flex items-center gap-3 rounded-2xl p-5">
            <CalendarDays className="h-5 w-5 text-[#1E4030] dark:text-[#8FBF9C]" />
            <div>
              <p className="font-heading font-semibold">Chores & schedules</p>
              <p className="text-xs text-muted-foreground">Daily, weekly and monthly duties</p>
            </div>
          </Link>
          <Link to="/kitchen" data-testid="dashboard-kitchen-link" className="card-lift glass flex items-center gap-3 rounded-2xl p-5">
            <ArrowUpRight className="h-5 w-5 text-[#D0663C]" />
            <div>
              <p className="font-heading font-semibold">Kitchen board</p>
              <p className="text-xs text-muted-foreground">Menu, recipes & cooking chores</p>
            </div>
          </Link>
          <Link to="/copilot" data-testid="dashboard-copilot-banner" className="card-lift gold-edge flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#FDF0EB] to-[#F1E9DA] p-5">
            <Sparkles className="h-5 w-5 text-[#D0663C]" />
            <div>
              <p className="font-heading font-semibold text-foreground">Ask the AI Copilot</p>
              <p className="text-xs text-muted-foreground">"How much did we spend on dining out?"</p>
            </div>
          </Link>
        </div>
      </div>

      <ExpenseDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
