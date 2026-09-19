import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiPatch, apiPost } from "@/lib/api";
import { CATEGORIES, MEMBERS } from "@/lib/constants";
import { todayIso } from "@/lib/format";
import type { Expense } from "@/lib/types";
import { Button } from "@/components/ui/button";
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
  const [member, setMember] = useState<string>("Shared");
  const [date, setDate] = useState(defaultDate ?? todayIso());
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setAmount(expense ? String(expense.amount) : "");
      setCategory(expense?.category ?? "Groceries");
      setMember(expense?.member ?? "Shared");
      setDate(expense?.date ?? defaultDate ?? todayIso());
      setNote(expense?.note ?? "");
    }
  }, [open, expense, defaultDate]);

  const save = useMutation({
    mutationFn: async () => {
      const body = { amount: Number(amount), category, note, date, member };
      if (expense) return apiPatch<Expense>(`/expenses/${expense.id}`, body);
      return apiPost<Expense>("/expenses", body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
      toast.success(expense ? "Expense updated" : "Expense added");
      onOpenChange(false);
    },
    onError: (err) => toast.error(`Could not save: ${err.message}`),
  });

  const valid = Number(amount) > 0 && !!date;

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
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Member</Label>
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            data-testid="expense-save-button"
            disabled={!valid || save.isPending}
            onClick={() => save.mutate()}
            className="bg-[#C85A32] text-white hover:bg-[#B24C26]"
          >
            {save.isPending ? "Saving…" : expense ? "Update" : "Add expense"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
