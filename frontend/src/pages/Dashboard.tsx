import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ArrowUpRight, CalendarDays, CheckSquare, Plus, Receipt, Sparkles, UtensilsCrossed } from "lucide-react";
import { apiGet, apiPatch } from "@/lib/api";
import { useMe } from "@/lib/session";
import { currentMonth, formatDate, formatINR, monthLabel, todayIso } from "@/lib/format";
import { CHART_COLORS, SLOT_LABELS } from "@/lib/constants";
import type { Chore, CookMenu, FinanceSummary } from "@/lib/types";
import { BackgroundBlobs, Steam } from "@/components/decor";
import ExpenseDialog from "@/components/ExpenseDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

export default function Dashboard() {
  const me = useMe();
  const qc = useQueryClient();
  const month = currentMonth();
  const [dialogOpen, setDialogOpen] = useState(false);

  const summary = useQuery({
    queryKey: ["summary", month],
    queryFn: () => apiGet<FinanceSummary>(`/summary?month=${month}`),
  });
  const menu = useQuery({
    queryKey: ["cook", "today"],
    queryFn: () => apiGet<CookMenu>("/cook/today"),
    retry: false,
  });
  const chores = useQuery({
    queryKey: ["chores"],
    queryFn: () => apiGet<Chore[]>("/chores"),
  });

  const toggleChore = useMutation({
    mutationFn: (chore: Chore) => apiPatch<Chore>(`/chores/${chore.id}`, { done: !chore.done }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chores"] }),
  });

  const s = summary.data;
  const spentPct = s && s.budget > 0 ? Math.min(Math.round((s.expense_total / s.budget) * 100), 999) : null;
  const pendingChores = (chores.data ?? []).filter((c) => !c.done).slice(0, 5);

  return (
    <div className="relative">
      <BackgroundBlobs hero />
      <div className="animate-fade-up">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {formatDate(todayIso())} · {monthLabel(month)}
            </p>
            <h1 className="mt-1 font-heading text-4xl font-bold tracking-tight text-foreground">
              Namaste, {me.data?.name} 🏡
            </h1>
          </div>
          <Button
            data-testid="dashboard-add-expense-button"
            onClick={() => setDialogOpen(true)}
            className="bg-[#C85A32] text-white hover:bg-[#B24C26]"
          >
            <Plus className="h-4 w-4" /> Add expense
          </Button>
        </div>

        {/* metric row */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div
            data-testid="dashboard-metric-income"
            className="card-lift rounded-2xl border border-[#C7DCCB] bg-[#EBF2EC] p-6 text-[#1E3A2B]"
          >
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#4B6B59]">Income this month</p>
            <p className="font-display-num mt-2 text-3xl font-semibold">{formatINR(s?.income_total ?? 0)}</p>
            <p className="mt-1 text-sm text-[#4B6B59]">{s?.income_total ? "Across all sources" : "No income added yet"}</p>
          </div>
          <div
            data-testid="dashboard-metric-expenses"
            className="card-lift rounded-2xl border border-[#F3CEBF] bg-[#FDF0EB] p-6 text-[#5C200C]"
          >
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#8C4328]">Spent this month</p>
            <p className="font-display-num mt-2 text-3xl font-semibold">{formatINR(s?.expense_total ?? 0)}</p>
            <p className="mt-1 text-sm text-[#8C4328]">
              {spentPct !== null ? `${spentPct}% of monthly budget` : "Set a budget to track %"}
            </p>
          </div>
          <div data-testid="dashboard-metric-remaining" className="card-lift glass rounded-2xl p-6 text-foreground">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Remaining budget</p>
            <p className={`font-display-num mt-2 text-3xl font-semibold ${(s?.remaining ?? 0) < 0 ? "text-[#B93826]" : ""}`}>
              {formatINR(s?.remaining ?? 0)}
            </p>
            {spentPct !== null && spentPct > 90 && (
              <p className="mt-1 text-sm font-medium text-[#B93826]">Budget nearly used up</p>
            )}
          </div>
        </div>

        {/* chart + today's menu */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div data-testid="dashboard-expense-chart" className="glass rounded-2xl p-6 lg:col-span-7">
            <h2 className="font-heading text-xl font-semibold">Where the money went</h2>
            {s && s.by_category.length > 0 ? (
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={s.by_category}
                      dataKey="total"
                      nameKey="category"
                      innerRadius={62}
                      outerRadius={95}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {s.by_category.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number, name: string) => [formatINR(value), name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  {s.by_category.slice(0, 6).map((c, i) => (
                    <span key={c.category} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      {c.category}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-4 flex h-64 flex-col items-center justify-center text-center text-muted-foreground">
                <Receipt className="mb-2 h-8 w-8" />
                <p className="text-sm">No expenses yet this month.</p>
              </div>
            )}
          </div>

          <div data-testid="dashboard-today-menu-card" className="glass rounded-2xl p-6 lg:col-span-5">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-xl font-semibold">Today's kitchen</h2>
              <Steam className="text-[#C85A32]" />
            </div>
            {menu.data && menu.data.entries.length > 0 ? (
              <ul className="mt-4 grid gap-2">
                {menu.data.entries.map((e) => (
                  <li key={e.id} className="flex items-center justify-between rounded-xl bg-muted/70 px-4 py-2.5">
                    <span className="flex items-center gap-2 text-sm">
                      <UtensilsCrossed className="h-4 w-4 text-[#245C3F]" />
                      {e.recipe?.name ?? "Recipe removed"}
                    </span>
                    <span className="flex items-center gap-2">
                      <Badge variant="secondary">{SLOT_LABELS[e.slot] ?? e.slot}</Badge>
                      <span className="font-mono text-sm font-semibold">x{e.servings}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 rounded-xl bg-muted/70 px-4 py-6 text-center text-sm text-muted-foreground">
                Nothing planned for today — visit the Menu Planner.
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <Link to="/menu" className="flex-1">
                <Button variant="outline" className="w-full" data-testid="dashboard-plan-menu-link">
                  <CalendarDays className="h-4 w-4" /> Plan menu
                </Button>
              </Link>
              <Link to="/cook" className="flex-1">
                <Button className="w-full bg-[#C85A32] text-white hover:bg-[#B24C26]" data-testid="dashboard-open-cook-link">
                  Cook view <ArrowUpRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* recent expenses + chores */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="rounded-2xl border-border">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="font-heading text-xl">Recent expenses</CardTitle>
              <Link to="/expenses">
                <Button variant="ghost" size="sm" data-testid="dashboard-all-expenses-link">
                  View all
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="grid gap-2">
              {(s?.recent_expenses ?? []).map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded-xl bg-muted/60 px-4 py-2.5" data-testid="dashboard-recent-expense-row">
                  <div>
                    <p className="text-sm font-medium">{e.note || e.category}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(e.date)} · {e.category}
                    </p>
                  </div>
                  <span className="font-display-num font-semibold">{formatINR(e.amount)}</span>
                </div>
              ))}
              {s && s.recent_expenses.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">Nothing logged yet.</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="font-heading text-xl">Pending chores</CardTitle>
              <Link to="/chores">
                <Button variant="ghost" size="sm" data-testid="dashboard-all-chores-link">
                  View all
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="grid gap-2">
              {pendingChores.map((c) => (
                <label key={c.id} className="flex items-center gap-3 rounded-xl bg-muted/60 px-4 py-2.5" data-testid="dashboard-chore-row">
                  <Checkbox
                    checked={false}
                    onCheckedChange={() => toggleChore.mutate(c)}
                    data-testid="dashboard-chore-checkbox"
                  />
                  <CheckSquare className="h-4 w-4 text-[#245C3F]" />
                  <span className="text-sm font-medium">{c.title}</span>
                  <Badge variant="outline" className="ml-auto">
                    {c.assignee}
                  </Badge>
                </label>
              ))}
              {pendingChores.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">All chores done — lovely!</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Link
          to="/copilot"
          data-testid="dashboard-copilot-banner"
          className="card-lift mt-6 flex items-center gap-3 rounded-2xl border border-[#C85A32]/30 bg-gradient-to-r from-[#FDF0EB] to-[#EBF2EC] p-5"
        >
          <Sparkles className="h-5 w-5 text-[#C85A32]" />
          <div>
            <p className="font-heading font-semibold text-foreground">Ask the AI Copilot</p>
            <p className="text-sm text-muted-foreground">"How much did we spend on dining out?" — instant answers.</p>
          </div>
        </Link>
      </div>

      <ExpenseDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
