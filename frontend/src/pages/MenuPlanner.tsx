import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus, ShoppingBasket, Trash2, WandSparkles } from "lucide-react";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { addDays, formatDate, todayIso } from "@/lib/format";
import { useTimings } from "@/lib/config";
import type { MenuEntry, Recipe } from "@/lib/types";
import { BackgroundBlobs, PageHeader } from "@/components/decor";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

function mondayOf(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const diff = (day + 6) % 7; // days since Monday
  d.setDate(d.getDate() - diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface PickerState {
  date: string;
  timingId: string;
  entry: MenuEntry | null;
}

export default function MenuPlanner() {
  const qc = useQueryClient();
  const timings = useTimings();
  const SLOTS = (timings.data ?? []).map((t) => ({ value: t.id, label: t.name }));
  const [weekStart, setWeekStart] = useState(() => mondayOf(todayIso()));
  const [picker, setPicker] = useState<PickerState | null>(null);
  const [station, setStation] = useState<"cook" | "salad">("cook");
  const [recipeId, setRecipeId] = useState("");
  const [servings, setServings] = useState("2");
  const [notes, setNotes] = useState("");

  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const recipes = useQuery({ queryKey: ["recipes"], queryFn: () => apiGet<Recipe[]>("/recipes") });
  const menu = useQuery({
    queryKey: ["menu", weekStart, weekEnd],
    queryFn: () => apiGet<MenuEntry[]>(`/menu?start=${weekStart}&end=${weekEnd}`),
  });

  const invalidateMenu = () => {
    qc.invalidateQueries({ queryKey: ["menu"] });
    qc.invalidateQueries({ queryKey: ["cook"] });
  };

  const saveEntry = useMutation({
    mutationFn: async () => {
      if (picker?.entry) {
        return apiPatch<MenuEntry>(`/menu/${picker.entry.id}`, { servings: Number(servings), notes });
      }
      return apiPost<MenuEntry>("/menu", { date: picker!.date, timing_id: picker!.timingId, recipe_id: recipeId, servings: Number(servings), notes });
    },
    onSuccess: () => {
      invalidateMenu();
      setPicker(null);
      toast.success("Menu updated");
    },
    onError: (err) => toast.error(`Could not save: ${err.message}`),
  });

  const deleteEntry = useMutation({
    mutationFn: (id: string) => apiDelete<void>(`/menu/${id}`),
    onSuccess: () => {
      invalidateMenu();
      setPicker(null);
      toast.success("Removed from menu");
    },
  });

  const aiFill = useMutation({
    mutationFn: () => apiPost<{ created: number }>("/ai/plan-menu", { start_date: weekStart }),
    onSuccess: (res) => {
      invalidateMenu();
      toast.success(res.created > 0 ? `AI planned ${res.created} meals for the week` : "Week already fully planned");
    },
    onError: (err) => toast.error(`AI planning failed: ${err.message}`),
  });

  const genGrocery = useMutation({
    mutationFn: () => apiPost<{ created: number }>("/grocery/generate", { start_date: weekStart, end_date: weekEnd }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["grocery"] });
      toast.success(`${res.created} grocery items added from this week's menu`);
    },
    onError: (err) => toast.error(`Could not generate list: ${err.message}`),
  });

  const openPicker = (date: string, timingId: string, entry: MenuEntry | null) => {
    setPicker({ date, timingId, entry });
    setRecipeId(entry ? "" : (stationRecipes[0]?.id ?? ""));
    setServings(String(entry?.servings ?? 2));
    setNotes(entry?.notes ?? "");
  };

  const entriesBy = (date: string, timingId: string) =>
    (menu.data ?? []).filter((e) => e.date === date && e.timing_id === timingId && (e.station || "cook") === station);

  const stationRecipes = (recipes.data ?? []).filter((r) => (r.station || "cook") === station);

  return (
    <div className="relative">
      <BackgroundBlobs />
      <PageHeader
        title="Menu Planner"
        subtitle="Pick recipes for each meal — the cook view stays in sync instantly."
        actions={
          <>
            <div className="flex items-center rounded-full border border-border bg-card">
              <Button variant="ghost" size="icon-xs" data-testid="menu-prev-week" onClick={() => setWeekStart((w) => addDays(w, -7))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-3 text-xs font-medium" data-testid="menu-week-label">
                {formatDate(weekStart)} – {formatDate(weekEnd)}
              </span>
              <Button variant="ghost" size="icon-xs" data-testid="menu-next-week" onClick={() => setWeekStart((w) => addDays(w, 7))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              data-testid="menu-ai-fill-button"
              disabled={aiFill.isPending || (recipes.data?.length ?? 0) === 0}
              onClick={() => aiFill.mutate()}
            >
              <WandSparkles className="h-4 w-4 text-[#D0663C]" /> {aiFill.isPending ? "Planning…" : "AI week menu"}
            </Button>
            <Button
              data-testid="menu-generate-grocery-button"
              disabled={genGrocery.isPending}
              onClick={() => genGrocery.mutate()}
              className="bg-[#1E4030] text-white hover:bg-[#23492F]"
            >
              <ShoppingBasket className="h-4 w-4" /> Generate grocery list
            </Button>
          </>
        }
      />

      <div className="mb-4 inline-flex rounded-full border border-border bg-card p-1" data-testid="menu-station-tabs">
        {([
          { id: "cook", label: "Cook station" },
          { id: "salad", label: "Salad station" },
        ] as const).map((s) => (
          <button
            key={s.id}
            data-testid={`menu-station-tab-${s.id}`}
            onClick={() => setStation(s.id)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors sm:text-sm ${
              station === s.id ? "bg-[#1E4030] text-[#F6F1E4]" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {recipes.data && recipes.data.length === 0 && (
        <p className="mb-4 rounded-xl border border-[#D0663C]/40 bg-[#FDF0EB] px-4 py-3 text-sm text-[#5C200C]">
          Add a few recipes to the vault first — then slot them here.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {days.map((date) => {
          const isToday = date === todayIso();
          return (
            <Card key={date} className={`rounded-2xl p-4 ${isToday ? "border-2 border-[#D0663C]/60" : ""}`} data-testid="menu-day-card">
              <p className="font-heading text-base font-semibold" data-testid="menu-day-label">
                {formatDate(date)}
                {isToday && <span className="ml-2 rounded-full bg-[#D0663C] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Today</span>}
              </p>
              <div className="mt-3 grid gap-2">
                {SLOTS.map((slot) => {
                  const entries = entriesBy(date, slot.value);
                  return (
                    <div key={slot.value} className="rounded-xl bg-muted/60 p-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {slot.label}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          data-testid={`menu-add-${date}-${slot.value}`}
                          onClick={() => openPicker(date, slot.value, null)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      {entries.map((e) => (
                        <button
                          key={e.id}
                          data-testid="menu-entry-chip"
                          onClick={() => openPicker(date, slot.value, e)}
                          className="mt-1 block w-full rounded-lg bg-card px-3 py-2 text-left shadow-sm transition-transform hover:scale-[1.02]"
                        >
                          <span className="block text-sm font-medium">{e.recipe_name}</span>
                          <span className="block text-xs text-muted-foreground">
                            x{e.servings} {e.notes ? `· ${e.notes}` : ""}
                          </span>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!picker} onOpenChange={(o) => !o && setPicker(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {picker?.entry ? "Edit meal" : `Add to ${SLOTS.find((x) => x.value === picker?.timingId)?.label ?? ""} · ${picker ? formatDate(picker.date) : ""}`}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {!picker?.entry && (
              <div className="grid gap-1.5">
                <Label>Recipe</Label>
                <Select value={recipeId} onValueChange={(v: string) => setRecipeId(v)}>
                  <SelectTrigger data-testid="menu-recipe-select">
                    <SelectValue>{recipes.data?.find((r) => r.id === recipeId)?.name ?? "Choose a recipe"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {stationRecipes.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="menu-servings">Servings</Label>
                <Input
                  id="menu-servings"
                  data-testid="menu-servings-input"
                  type="number"
                  min="1"
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="menu-notes">Cook notes</Label>
                <Input
                  id="menu-notes"
                  data-testid="menu-notes-input"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="less spicy"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            {picker?.entry && (
              <Button
                variant="ghost"
                data-testid="menu-entry-delete-button"
                onClick={() => picker && deleteEntry.mutate(picker.entry!.id)}
                className="text-[#B93826]"
              >
                <Trash2 className="h-4 w-4" /> Remove
              </Button>
            )}
            <Button variant="outline" onClick={() => setPicker(null)}>
              Cancel
            </Button>
            <Button
              data-testid="menu-entry-save-button"
              disabled={saveEntry.isPending || (!picker?.entry && !recipeId)}
              onClick={() => saveEntry.mutate()}
              className="bg-[#D0663C] text-white hover:bg-[#B8552F]"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
