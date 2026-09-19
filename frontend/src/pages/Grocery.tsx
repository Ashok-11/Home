import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCheck, Plus, RefreshCw, Trash2 } from "lucide-react";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { addDays, todayIso } from "@/lib/format";
import { AISLES } from "@/lib/constants";
import type { GroceryItem } from "@/lib/types";
import { BackgroundBlobs, PageHeader } from "@/components/decor";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Grocery() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [aisle, setAisle] = useState<string>("Spices & Staples");

  const grocery = useQuery({ queryKey: ["grocery"], queryFn: () => apiGet<GroceryItem[]>("/grocery") });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["grocery"] });

  const add = useMutation({
    mutationFn: () => apiPost<GroceryItem>("/grocery", { name, aisle }),
    onSuccess: () => {
      invalidate();
      setName("");
      toast.success("Item added");
    },
  });

  const toggle = useMutation({
    mutationFn: (item: GroceryItem) => apiPatch<GroceryItem>(`/grocery/${item.id}`, { checked: !item.checked }),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete<void>(`/grocery/${id}`),
    onSuccess: invalidate,
  });

  const clearChecked = useMutation({
    mutationFn: () => apiPost<void>("/grocery/clear-checked"),
    onSuccess: () => {
      invalidate();
      toast.success("Checked items cleared");
    },
  });

  const generate = useMutation({
    mutationFn: () =>
      apiPost<{ created: number }>("/grocery/generate", { start_date: todayIso(), end_date: addDays(todayIso(), 7) }),
    onSuccess: (res) => {
      invalidate();
      toast.success(`${res.created} items added from the coming week's menu`);
    },
    onError: (err) => toast.error(`Could not generate: ${err.message}`),
  });

  const byAisle = (a: string) => (grocery.data ?? []).filter((i) => (i.aisle || "Other") === a);
  const uncheckedCount = (grocery.data ?? []).filter((i) => !i.checked).length;

  return (
    <div className="relative">
      <BackgroundBlobs />
      <PageHeader
        title="Grocery List"
        subtitle={`${uncheckedCount} item${uncheckedCount === 1 ? "" : "s"} left to pick up`}
        actions={
          <>
            <Button variant="outline" data-testid="grocery-generate-button" disabled={generate.isPending} onClick={() => generate.mutate()}>
              <RefreshCw className="h-4 w-4" /> {generate.isPending ? "Gathering…" : "Build from week's menu"}
            </Button>
            <Button variant="ghost" data-testid="grocery-clear-checked-button" onClick={() => clearChecked.mutate()}>
              <CheckCheck className="h-4 w-4" /> Clear checked
            </Button>
          </>
        }
      />

      <div className="glass flex flex-wrap items-end gap-2 rounded-2xl p-4">
        <div className="grid flex-1 gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">Add item</label>
          <Input
            data-testid="grocery-name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dish soap, milk, tomatoes…"
            onKeyDown={(e) => e.key === "Enter" && name && add.mutate()}
          />
        </div>
        <div className="grid w-48 gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">Aisle</label>
          <Select value={aisle} onValueChange={(v: string) => setAisle(v)}>
            <SelectTrigger data-testid="grocery-aisle-select">
              <SelectValue>{aisle}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {AISLES.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button data-testid="grocery-add-button" disabled={!name || add.isPending} onClick={() => add.mutate()} className="bg-[#D0663C] text-white hover:bg-[#B8552F]">
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {AISLES.map((a) => {
          const items = byAisle(a);
          if (items.length === 0) return null;
          return (
            <Card key={a} className="rounded-2xl p-5" data-testid="grocery-aisle-card">
              <h3 className="font-heading text-lg font-semibold">{a}</h3>
              <div className="mt-3 grid gap-1.5">
                {items.map((item) => (
                  <label key={item.id} className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2" data-testid="grocery-item-row">
                    <Checkbox
                      checked={item.checked}
                      onCheckedChange={() => toggle.mutate(item)}
                      data-testid="grocery-item-checkbox"
                    />
                    <span className={`flex-1 text-sm ${item.checked ? "text-muted-foreground line-through" : "font-medium"}`}>
                      {item.name}
                      {item.qty != null && (
                        <span className="ml-2 font-mono text-xs text-muted-foreground">
                          {item.qty} {item.unit}
                        </span>
                      )}
                    </span>
                    {item.source === "menu" && (
                      <span className="rounded-full bg-[#EBF2EC] px-2 py-0.5 text-[10px] font-semibold text-[#1E3A2B]">menu</span>
                    )}
                    <Button variant="ghost" size="icon-xs" data-testid="grocery-item-delete-button" onClick={() => remove.mutate(item.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-[#B93826]" />
                    </Button>
                  </label>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
      {grocery.data && grocery.data.length === 0 && (
        <div className="glass mt-4 rounded-2xl p-10 text-center">
          <p className="font-heading text-lg">The list is empty</p>
          <p className="mt-1 text-sm text-muted-foreground">Build it from the week's menu or add items manually.</p>
        </div>
      )}
    </div>
  );
}
