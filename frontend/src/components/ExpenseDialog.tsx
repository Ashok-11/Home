import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiPatch, apiPost } from "@/lib/api";
import { MEMBERS } from "@/lib/constants";
import { useCards, useCategories } from "@/lib/config";
import { todayIso } from "@/lib/format";
import type { Expense } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface ExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense | null; // present = edit mode
  defaultDate?: string;
}

export default function ExpenseDialog({ open, onOpenChange, expense, defaultDate }: ExpenseDialogProps) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("Groceries");
  const [member, setMember] = useState<string>("Common");
  const [date, setDate] = useState(defaultDate ?? todayIso());
  const [note, setNote] = useState("");
  const [sourceId, setSourceId] = useState<string>("");
  const [isPersonal, setIsPersonal] = useState(false);

  const cards = useCards();
  const categories = useCategories();

  useEffect(() => {
    if (open) {
      setAmount(expense ? String(expense.amount) : "");
      setCategory(expense?.category ?? "Groceries");
      setMember(expense?.member ?? "Common");
      setDate(expense?.date ?? defaultDate ?? todayIso());
      setNote(expense?.note ?? "");
      setSourceId(expense?.source_id ?? "");
      setIsPersonal(expense?.is_personal ?? false);
    }
  }, [open, expense, defaultDate]);

  const save = useMutation({
    mutationFn: async () => {
      const card = (cards.data ?? []).find((c) => c.id === sourceId);
      const body = {
        amount: Number(amount),
        category,
        note,
        date,
        member,
        source_id: sourceId || null,
        source_label: card ? card.name : "",
        is_personal: isPersonal,
      };
      if (expense) return apiPatch<Expense>(`/expenses/${expense.id}`, body);
      return apiPost<Expense>("/expenses", body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(expense ? "Expense updated" : "Expense added");
      onOpenChange(false);
    },
    onError: (err) => toast.error(`Could not save: ${err.message}`),
  });

  const valid = Number(amount) > 0 && !!date;
  const sourceLabel =
    (cards.data ?? []).find((c) => c.id === sourceId)?.name ?? "Not specified";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">{expense ? "Edit expense" : "Add expense"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="expense-amount">Amount (₹)</Label>
              <Input
                id="expense-amount"
                data-testid="expense-amount-input"
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="250"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="expense-date">Date</Label>
              <Input
                id="expense-date"
                data-testid="expense-date-input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v: string) => setCategory(v)}>
                <SelectTrigger data-testid="expense-category-select">
                  <SelectValue>{category}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(categories.data ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Who spent</Label>
              <Select value={member} onValueChange={(v: string) => setMember(v)}>
                <SelectTrigger data-testid="expense-member-select">
                  <SelectValue>{member}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {MEMBERS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Money source (card / UPI / cash)</Label>
            <Select value={sourceId} onValueChange={(v: string) => setSourceId(v)}>
              <SelectTrigger data-testid="expense-source-select">
                <SelectValue>{sourceLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(cards.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                    {c.last4 ? ` •••• ${c.last4}` : ""} — {c.owner}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(cards.data ?? []).length === 0 && (
              <p className="text-xs text-muted-foreground">
                No sources yet — add your cards on the Cards page.
              </p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="expense-note">Note</Label>
            <Textarea
              id="expense-note"
              data-testid="expense-note-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Weekly vegetables from the market"
              rows={2}
            />
          </div>
          <label className="flex items-center gap-2.5 rounded-xl bg-muted/60 px-3 py-2.5">
            <Checkbox
              checked={isPersonal}
              onCheckedChange={(v) => setIsPersonal(v === true)}
              data-testid="expense-personal-checkbox"
            />
            <span className="text-sm">
              Counts against the personal fund
              <span className="block text-xs text-muted-foreground">
                Tick for own spending money (₹15,000/month each by default)
              </span>
            </span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            data-testid="expense-save-button"
            disabled={!valid || save.isPending}
            onClick={() => save.mutate()}
            className="bg-[#D0663C] text-white hover:bg-[#B8552F]"
          >
            {save.isPending ? "Saving…" : expense ? "Update" : "Add expense"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
