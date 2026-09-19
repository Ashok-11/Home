import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Pencil, Plus, Sparkles, Trash2, WandSparkles } from "lucide-react";
import { apiDelete, apiGet, apiPost } from "@/lib/api";
import { currentMonth, formatDate, formatINR, monthLabel, todayIso } from "@/lib/format";
import { CATEGORIES, MEMBERS } from "@/lib/constants";
import type { Expense, ParsedExpense } from "@/lib/types";
import { BackgroundBlobs, PageHeader } from "@/components/decor";
import ExpenseDialog from "@/components/ExpenseDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

interface DraftRow extends ParsedExpense {
  member: string;
}

export default function Expenses() {
  const qc = useQueryClient();
  const [month, setMonth] = useState(currentMonth());
  const [category, setCategory] = useState("all");
  const [member, setMember] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [smartText, setSmartText] = useState("");
  const [drafts, setDrafts] = useState<DraftRow[]>([]);

  const params = new URLSearchParams({ month });
  if (category !== "all") params.set("category", category);
  if (member !== "all") params.set("member", member);
  const expenses = useQuery({
    queryKey: ["expenses", month, category, member],
    queryFn: () => apiGet<Expense[]>(`/expenses?${params.toString()}`),
  });

  const parse = useMutation({
    mutationFn: () => apiPost<ParsedExpense[]>("/ai/parse-expenses", { text: smartText, date: todayIso() }),
    onSuccess: (rows) => {
      if (rows.length === 0) {
        toast.error("Could not find any expenses in that text");
        return;
      }
      setDrafts(rows.map((r) => ({ ...r, member: "Shared" })));
      toast.success(`Found ${rows.length} expense${rows.length > 1 ? "s" : ""} — review and save`);
    },
    onError: (err) => toast.error(`AI parse failed: ${err.message}`),
  });

  const saveDrafts = useMutation({
    mutationFn: async () => {
      for (const d of drafts) {
        await apiPost("/expenses", { amount: d.amount, category: d.category, note: d.note, date: d.date, member: d.member });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
      setDrafts([]);
      setSmartText("");
      toast.success("Expenses saved");
    },
    onError: (err) => toast.error(`Save failed: ${err.message}`),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete<void>(`/expenses/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
      toast.success("Expense deleted");
    },
  });

  const total = useMemo(() => (expenses.data ?? []).reduce((sum, e) => sum + e.amount, 0), [expenses.data]);

  return (
    <div className="relative">
      <BackgroundBlobs />
      <PageHeader
        title="Daily Expenses"
        subtitle={`${monthLabel(month)} · ${formatINR(total)} spent`}
        actions={
          <>
            <div className="flex items-center rounded-full border border-border bg-card">
              <Button variant="ghost" size="icon-xs" data-testid="expenses-prev-month" onClick={() => setMonth((m) => prevMonth(m))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-3 text-sm font-medium" data-testid="expenses-month-label">
                {monthLabel(month)}
              </span>
              <Button variant="ghost" size="icon-xs" data-testid="expenses-next-month" onClick={() => setMonth((m) => nextMonth(m))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              data-testid="expenses-filter-category"
              className="hidden sm:inline-flex"
              onClick={() => setCategory(category === "all" ? "Groceries" : "all")}
            >
              {category === "all" ? "All categories" : `Only ${category}`}
            </Button>
            <Button
              data-testid="expenses-add-button"
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
              className="bg-[#D0663C] text-white hover:bg-[#B8552F]"
            >
              <Plus className="h-4 w-4" /> Add expense
            </Button>
          </>
        }
      />

      {/* AI smart entry */}
      <Card className="glass rounded-2xl border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-xl">
            <Sparkles className="h-5 w-5 text-[#D0663C]" /> Smart expense entry
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            data-testid="smart-entry-input"
            value={smartText}
            onChange={(e) => setSmartText(e.target.value)}
            rows={2}
            placeholder={'e.g. "spent 250 on vegetables and 120 auto fare, plus 60 milk yesterday"'}
            className="bg-card/80"
          />
          <div className="mt-3 flex justify-end">
            <Button
              data-testid="smart-entry-parse-button"
              disabled={smartText.trim().length < 3 || parse.isPending}
              onClick={() => parse.mutate()}
              className="bg-[#1E4030] text-white hover:bg-[#23492F]"
            >
              <WandSparkles className="h-4 w-4" /> {parse.isPending ? "Reading…" : "Parse with AI"}
            </Button>
          </div>
          {drafts.length > 0 && (
            <div className="mt-4 grid gap-2" data-testid="smart-entry-drafts">
              {drafts.map((d, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
                  <span className="font-display-num min-w-20 font-semibold">{formatINR(d.amount)}</span>
                  <Select
                    value={d.category}
                    onValueChange={(v: string) => setDrafts((rows) => rows.map((r, j) => (j === i ? { ...r, category: v } : r)))}
                  >
                    <SelectTrigger size="sm" data-testid="smart-draft-category-select" className="w-40">
                      <SelectValue>{d.category}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={d.member}
                    onValueChange={(v: string) => setDrafts((rows) => rows.map((r, j) => (j === i ? { ...r, member: v } : r)))}
                  >
                    <SelectTrigger size="sm" data-testid="smart-draft-member-select" className="w-32">
                      <SelectValue>{d.member}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {MEMBERS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="flex-1 truncate text-sm text-muted-foreground">{d.note}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(d.date)}</span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    data-testid="smart-draft-remove-button"
                    onClick={() => setDrafts((rows) => rows.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex justify-end">
                <Button data-testid="smart-entry-save-button" disabled={saveDrafts.isPending} onClick={() => saveDrafts.mutate()}>
                  {saveDrafts.isPending ? "Saving…" : `Save ${drafts.length} expense${drafts.length > 1 ? "s" : ""}`}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* filters + table */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Select value={category} onValueChange={(v: string) => setCategory(v)}>
          <SelectTrigger data-testid="expenses-category-filter" className="w-48">
            <SelectValue>{category === "all" ? "All categories" : category}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={member} onValueChange={(v: string) => setMember(v)}>
          <SelectTrigger data-testid="expenses-member-filter" className="w-40">
            <SelectValue>{member === "all" ? "All members" : member}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All members</SelectItem>
            {MEMBERS.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="glass mt-3 rounded-2xl border-0 p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Note</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Who</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(expenses.data ?? []).map((e) => (
              <TableRow key={e.id} data-testid="expense-row">
                <TableCell className="whitespace-nowrap text-sm">{formatDate(e.date)}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{e.category}</Badge>
                </TableCell>
                <TableCell className="max-w-56 truncate text-sm text-muted-foreground">{e.note || "—"}</TableCell>
                <TableCell className="text-sm">
                  {e.source_label || "—"}
                  {e.is_personal && (
                    <span className="ml-1.5 rounded-full bg-[#F1E9DA] px-1.5 py-0.5 text-[10px] font-semibold text-[#6B5426]">
                      personal
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-sm">{e.member}</TableCell>
                <TableCell className="font-display-num text-right font-semibold">{formatINR(e.amount)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      data-testid="expense-edit-button"
                      onClick={() => {
                        setEditing(e);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-xs" data-testid="expense-delete-button" onClick={() => remove.mutate(e.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-[#B93826]" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {expenses.data && expenses.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  No expenses for this filter yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <ExpenseDialog open={dialogOpen} onOpenChange={setDialogOpen} expense={editing} defaultDate={todayIso()} />
    </div>
  );
}

function prevMonth(m: string): string {
  const [y, mo] = m.split("-").map(Number);
  return mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, "0")}`;
}
function nextMonth(m: string): string {
  const [y, mo] = m.split("-").map(Number);
  return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, "0")}`;
}
