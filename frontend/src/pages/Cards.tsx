import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreditCard, Plus, Trash2, Wallet } from "lucide-react";
import { apiDelete, apiGet, apiPost } from "@/lib/api";
import { CARD_TYPES, CARD_TYPE_LABELS, MEMBERS } from "@/lib/constants";
import { formatINR } from "@/lib/format";
import type { Card as PaymentCard, DashboardData } from "@/lib/types";
import { BackgroundBlobs, PageHeader } from "@/components/decor";
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

const GRADIENTS = [
  "linear-gradient(135deg,#1B3225 0%,#14261B 55%,#0F1D14 100%)",
  "linear-gradient(135deg,#7A2E16 0%,#D0663C 60%,#8A3A1C 100%)",
  "linear-gradient(135deg,#2B3A4A 0%,#1B2733 60%,#121A22 100%)",
  "linear-gradient(135deg,#4A3A17 0%,#E4B45A 65%,#8A6A22 100%)",
  "linear-gradient(135deg,#2F2340 0%,#4A3760 60%,#231A31 100%)",
  "linear-gradient(135deg,#123A32 0%,#1E5E4F 60%,#0E2A24 100%)",
];

export default function Cards() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [bank, setBank] = useState("");
  const [last4, setLast4] = useState("");
  const [type, setType] = useState<string>("credit");
  const [owner, setOwner] = useState<string>("Common");

  const cards = useQuery({ queryKey: ["cards"], queryFn: () => apiGet<PaymentCard[]>("/cards") });
  const dash = useQuery({
    queryKey: ["dashboard", "month", "current"],
    queryFn: () => apiGet<DashboardData>("/dashboard?scope=month"),
  });

  const spendFor = (id: string) => dash.data?.cards.find((c) => c.card_id === id)?.total ?? 0;
  const membersFor = (id: string) => dash.data?.cards.find((c) => c.card_id === id)?.by_member ?? {};

  const create = useMutation({
    mutationFn: () => apiPost<PaymentCard>("/cards", { name, bank, last4, type, owner }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cards"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
      setName("");
      setBank("");
      setLast4("");
      toast.success("Payment source added");
    },
    onError: (err) => toast.error(`Could not add: ${err.message}`),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete<void>(`/cards/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cards"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Source removed");
    },
  });

  return (
    <div className="relative">
      <BackgroundBlobs />
      <PageHeader
        title="Cards & Money Sources"
        subtitle="Keep every card, UPI handle and cash pocket on record — and see this month's spend on each."
        actions={
          <Button data-testid="cards-add-button" onClick={() => setOpen(true)} className="bg-[#D0663C] text-white hover:bg-[#B8552F]">
            <Plus className="h-4 w-4" /> Add source
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {(cards.data ?? []).map((c, i) => {
          const members = membersFor(c.id);
          return (
            <div
              key={c.id}
              data-testid="card-tile"
              className="card-lift gold-edge animate-pop-in relative overflow-hidden rounded-2xl p-5 text-[#F6F1E4]"
              style={{ background: GRADIENTS[i % GRADIENTS.length], animationDelay: `${i * 0.05}s` }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E4B45A]">
                    {CARD_TYPE_LABELS[c.type] ?? c.type}
                  </p>
                  <p className="font-heading mt-1 text-lg font-bold" data-testid="card-tile-name">
                    {c.name}
                  </p>
                  <p className="text-xs text-white/70">{c.bank || "—"}</p>
                </div>
                {c.type === "upi" || c.type === "cash" ? (
                  <Wallet className="h-6 w-6 text-[#E4B45A]" />
                ) : (
                  <CreditCard className="h-6 w-6 text-[#E4B45A]" />
                )}
              </div>

              <p className="font-display-num mt-6 text-lg tracking-[0.18em] text-white/90">
                {c.last4 ? `•••• •••• •••• ${c.last4}` : "— — — —"}
              </p>

              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/60">Owner</p>
                  <p className="text-sm font-semibold">{c.owner}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/60">This month</p>
                  <p className="font-display-num text-lg font-bold" data-testid="card-tile-spend">
                    {formatINR(spendFor(c.id))}
                  </p>
                </div>
              </div>

              {Object.entries(members).filter(([, v]) => v > 0).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {Object.entries(members)
                    .filter(([, v]) => v > 0)
                    .map(([m, v]) => (
                      <span key={m} className="rounded-full bg-white/12 px-2 py-0.5 text-[11px] font-medium ring-1 ring-white/20">
                        {m}: {formatINR(v)}
                      </span>
                    ))}
                </div>
              )}

              <Button
                variant="ghost"
                size="icon-xs"
                data-testid="card-delete-button"
                onClick={() => remove.mutate(c.id)}
                className="absolute bottom-3 right-3 text-white/50 hover:bg-white/10 hover:text-white"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        })}
      </div>

      {cards.data && cards.data.length === 0 && (
        <div className="glass rounded-2xl p-10 text-center">
          <p className="font-heading text-lg">No money sources yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Add your cards, UPI handles and cash so expenses can be tagged.</p>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Add money source</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="card-name">Name</Label>
              <Input id="card-name" data-testid="card-name-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="HDFC Regalia" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="card-bank">Bank / provider</Label>
                <Input id="card-bank" data-testid="card-bank-input" value={bank} onChange={(e) => setBank(e.target.value)} placeholder="HDFC Bank" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="card-last4">Last 4 digits</Label>
                <Input
                  id="card-last4"
                  data-testid="card-last4-input"
                  value={last4}
                  onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="4412"
                  inputMode="numeric"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v: string) => setType(v)}>
                  <SelectTrigger data-testid="card-type-select">
                    <SelectValue>{CARD_TYPE_LABELS[type]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {CARD_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Owner</Label>
                <Select value={owner} onValueChange={(v: string) => setOwner(v)}>
                  <SelectTrigger data-testid="card-owner-select">
                    <SelectValue>{owner}</SelectValue>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button data-testid="card-save-button" disabled={!name || create.isPending} onClick={() => create.mutate()} className="bg-[#D0663C] text-white hover:bg-[#B8552F]">
              Add source
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
