import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarClock, Plus, Trash2 } from "lucide-react";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { formatDate, todayIso } from "@/lib/format";
import { FREQUENCIES, MEMBERS } from "@/lib/constants";
import type { Chore } from "@/lib/types";
import { BackgroundBlobs, PageHeader } from "@/components/decor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

export default function Chores() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState<string>("Shared");
  const [frequency, setFrequency] = useState<string>("Daily");
  const [dueDate, setDueDate] = useState("");

  const chores = useQuery({ queryKey: ["chores"], queryFn: () => apiGet<Chore[]>("/chores") });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["chores"] });

  const create = useMutation({
    mutationFn: () =>
      apiPost<Chore>("/chores", {
        title,
        assignee,
        frequency,
        due_date: dueDate || null,
      }),
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setTitle("");
      setDueDate("");
      toast.success("Chore added");
    },
    onError: (err) => toast.error(`Could not add: ${err.message}`),
  });

  const toggle = useMutation({
    mutationFn: (c: Chore) => apiPatch<Chore>(`/chores/${c.id}`, { done: !c.done }),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete<void>(`/chores/${id}`),
    onSuccess: invalidate,
  });

  const today = todayIso();
  const sorted = [...(chores.data ?? [])].sort((a, b) => Number(a.done) - Number(b.done));

  return (
    <div className="relative">
      <BackgroundBlobs />
      <PageHeader
        title="Chores Tracker"
        subtitle="Who does what, and by when."
        actions={
          <Button data-testid="chores-add-button" onClick={() => setOpen(true)} className="bg-[#C85A32] text-white hover:bg-[#B24C26]">
            <Plus className="h-4 w-4" /> Add chore
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {sorted.map((c, idx) => {
          const overdue = !c.done && c.due_date != null && c.due_date < today;
          return (
            <Card
              key={c.id}
              data-testid="chore-card"
              className={`card-lift animate-fade-up rounded-2xl p-5 ${c.done ? "opacity-60" : ""} ${overdue ? "border-[#B93826]/50 bg-[#FDF0EB]" : ""}`}
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              <div className="flex items-start gap-3">
                <Checkbox checked={c.done} onCheckedChange={() => toggle.mutate(c)} data-testid="chore-done-checkbox" />
                <div className="flex-1">
                  <p className={`font-medium ${c.done ? "text-muted-foreground line-through" : ""}`}>{c.title}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">{c.assignee}</Badge>
                    <Badge variant="outline">{c.frequency}</Badge>
                    {c.due_date && (
                      <span className={`flex items-center gap-1 ${overdue ? "font-semibold text-[#B93826]" : ""}`}>
                        <CalendarClock className="h-3.5 w-3.5" /> {formatDate(c.due_date)}
                        {overdue ? " · overdue" : ""}
                      </span>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="icon-xs" data-testid="chore-delete-button" onClick={() => remove.mutate(c.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-[#B93826]" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
      {chores.data && chores.data.length === 0 && (
        <div className="glass rounded-2xl p-10 text-center">
          <p className="font-heading text-lg">No chores yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Add the recurring rhythm of the house.</p>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Add chore</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="chore-title">What needs doing?</Label>
              <Input id="chore-title" data-testid="chore-title-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Pay the milk bill" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Assignee</Label>
                <Select value={assignee} onValueChange={(v: string) => setAssignee(v)}>
                  <SelectTrigger data-testid="chore-assignee-select">
                    <SelectValue>{assignee}</SelectValue>
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
              <div className="grid gap-1.5">
                <Label>Frequency</Label>
                <Select value={frequency} onValueChange={(v: string) => setFrequency(v)}>
                  <SelectTrigger data-testid="chore-frequency-select">
                    <SelectValue>{frequency}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="chore-due">Due date (optional)</Label>
              <Input id="chore-due" data-testid="chore-due-input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button data-testid="chore-save-button" disabled={!title || create.isPending} onClick={() => create.mutate()} className="bg-[#C85A32] text-white hover:bg-[#B24C26]">
              Add chore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
