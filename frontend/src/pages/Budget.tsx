import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus, Target, Trash2, TrendingUp } from "lucide-react";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import { currentMonth, formatINR, monthLabel, todayIso } from "@/lib/format";
import type { FinanceSummary, Income } from "@/lib/types";
import { BackgroundBlobs, PageHeader } from "@/components/decor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Budget() {
  const qc = useQueryClient();
  const [month, setMonth] = useState(currentMonth());
  const [budgetInput, setBudgetInput] = useState("");
  const [source, setSource] = useState("");
  const [incomeAmount, setIncomeAmount] = useState("");

  const summary = useQuery({
    queryKey: ["summary", month],
    queryFn: () => apiGet<FinanceSummary>(`/summary?month=${month}`),
  });
  const incomes = useQuery({
    queryKey: ["incomes", month],
    queryFn: () => apiGet<Income[]>(`/incomes?month=${month}`),
  });

  const saveBudget = useMutation({
    mutationFn: () => apiPut("/budget", { month, amount: Number(budgetInput) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["summary", month] });
      toast.success("Budget saved");
      setBudgetInput("");
    },
    onError: (err) => toast.error(`Could not save budget: ${err.message}`),
  });

  const addIncome = useMutation({
    mutationFn: () =>
      apiPost<Income>("/incomes", { source, amount: Number(incomeAmount), date: `${month}-01` }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incomes", month] });
      qc.invalidateQueries({ queryKey: ["summary", month] });
      setSource("");
      setIncomeAmount("");
      toast.success("Income added");
    },
    onError: (err) => toast.error(`Could not add income: ${err.message}`),
  });

  const deleteIncome = useMutation({
    mutationFn: (id: string) => apiDelete<void>(`/incomes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incomes", month] });
      qc.invalidateQueries({ queryKey: ["summary", month] });
    },
  });

  const s = summary.data;
  const maxCategory = Math.max(1, ...(s?.by_category ?? []).map((c) => c.total));
  const spentPct = s && s.budget > 0 ? Math.min((s.expense_total / s.budget) * 100, 100) : 0;
  const savings = (s?.income_total ?? 0) - (s?.expense_total ?? 0);

  return (
    <div className="relative">
      <BackgroundBlobs />
      <PageHeader
        title="Income & Budget"
        subtitle="Give your income, set the monthly budget, watch it hold."
        actions={
          <div className="flex items-center rounded-full border border-border bg-card">
            <Button variant="ghost" size="icon-xs" data-testid="budget-prev-month" onClick={() => shift(month, -1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 text-sm font-medium" data-testid="budget-month-label">
              {monthLabel(month)}
            </span>
            <Button variant="ghost" size="icon-xs" data-testid="budget-next-month" onClick={() => shift(month, 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {/* budget gauge */}
      <div className="glass rounded-2xl p-6" data-testid="budget-gauge-card">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Monthly budget</p>
            <p className="font-display-num mt-1 text-4xl font-semibold" data-testid="budget-amount-display">
              {formatINR(s?.budget ?? 0)}
            </p>
          </div>
          <div className="flex items-end gap-2">
            <div className="grid gap-1">
              <Label htmlFor="budget-input" className="text-xs">
                Set budget (₹)
              </Label>
              <Input
                id="budget-input"
                data-testid="budget-amount-input"
                type="number"
                min="0"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                placeholder={String(Math.round(s?.budget ?? 0) || 60000)}
                className="w-36"
              />
            </div>
            <Button
              data-testid="budget-save-button"
              disabled={!budgetInput || saveBudget.isPending}
              onClick={() => saveBudget.mutate()}
              className="bg-[#1E4030] text-white hover:bg-[#23492F]"
            >
              <Target className="h-4 w-4" /> Save
            </Button>
          </div>
        </div>
        <div className="mt-5">
          <div className="h-3 overflow-hidden rounded-full bg-muted" data-testid="budget-progress-bar">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${spentPct}%`,
                background: spentPct >= 90 ? "#B93826" : "linear-gradient(to right, #1E4030, #758E4F)",
              }}
            />
          </div>
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-muted-foreground">
              {formatINR(s?.expense_total ?? 0)} spent
              {s && s.budget > 0 && (
                <span className={(s.expense_total / s.budget) > 0.9 ? "font-semibold text-[#B93826]" : ""}>
                  {" "}
                  · {Math.round((s.expense_total / s.budget) * 100)}% of budget
                </span>
              )}
            </span>
            <span className="font-medium" data-testid="budget-remaining-display">
              {s && s.budget > 0 ? `${formatINR(s.remaining)} left` : "No budget set yet"}
            </span>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-[#EBF2EC] p-4 text-[#1E3A2B]">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#4B6B59]">Income this month</p>
            <p className="font-display-num mt-1 text-2xl font-semibold">{formatINR(s?.income_total ?? 0)}</p>
          </div>
          <div className="rounded-xl bg-[#FDF0EB] p-4 text-[#5C200C]">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#8C4328]">Net savings (income − spent)</p>
            <p className="font-display-num mt-1 text-2xl font-semibold" data-testid="budget-savings-display">
              {formatINR(savings)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* income */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-xl">
              <TrendingUp className="h-5 w-5 text-[#1E4030]" /> Income entries
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="flex flex-wrap items-end gap-2">
              <div className="grid flex-1 gap-1">
                <Label htmlFor="income-source" className="text-xs">
                  Source
                </Label>
                <Input
                  id="income-source"
                  data-testid="income-source-input"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="Salary, rental, freelance…"
                />
              </div>
              <div className="grid w-32 gap-1">
                <Label htmlFor="income-amount" className="text-xs">
                  Amount (₹)
                </Label>
                <Input
                  id="income-amount"
                  data-testid="income-amount-input"
                  type="number"
                  min="1"
                  value={incomeAmount}
                  onChange={(e) => setIncomeAmount(e.target.value)}
                  placeholder="85000"
                />
              </div>
              <Button
                data-testid="income-add-button"
                disabled={!source || !(Number(incomeAmount) > 0) || addIncome.isPending}
                onClick={() => addIncome.mutate()}
              >
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
            <div className="grid gap-2">
              {(incomes.data ?? []).map((inc) => (
                <div key={inc.id} className="flex items-center justify-between rounded-xl bg-muted/60 px-4 py-2.5" data-testid="income-row">
                  <div>
                    <p className="text-sm font-medium">{inc.source}</p>
                    <p className="text-xs text-muted-foreground">{monthLabel(inc.month)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-display-num font-semibold">{formatINR(inc.amount)}</span>
                    <Button variant="ghost" size="icon-xs" data-testid="income-delete-button" onClick={() => deleteIncome.mutate(inc.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-[#B93826]" />
                    </Button>
                  </div>
                </div>
              ))}
              {incomes.data && incomes.data.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">No income entries for this month.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* category bars */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="font-heading text-xl">Spending by category</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3" data-testid="budget-category-bars">
            {(s?.by_category ?? []).map((c, i) => (
              <div key={c.category}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium">{c.category}</span>
                  <span className="font-display-num">{formatINR(c.total)}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(c.total / maxCategory) * 100}%`,
                      background: ["#1E4030", "#D0663C", "#D99B26", "#3D7B80", "#87537D", "#758E4F"][i % 6],
                    }}
                  />
                </div>
              </div>
            ))}
            {s && s.by_category.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No spending recorded this month.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function shift(m: string, delta: number): string {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
