import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Clock, Minus, Plus, Sparkles, Trash2, Users, WandSparkles } from "lucide-react";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import type { Recipe, RecipeDraft } from "@/lib/types";
import { UNITS } from "@/lib/constants";
import { BackgroundBlobs, PageHeader } from "@/components/decor";
import ScaledIngredients from "@/components/ScaledIngredients";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

interface IngredientRow {
  qty: string;
  unit: string;
  name: string;
}

const blankForm = {
  name: "",
  description: "",
  category: "Main Course",
  base_servings: "2",
  prep_minutes: "10",
  cook_minutes: "20",
  ingredients: [{ qty: "", unit: "g", name: "" }] as IngredientRow[],
  steps: [""],
};

export default function Recipes() {
  const qc = useQueryClient();
  const recipes = useQuery({ queryKey: ["recipes"], queryFn: () => apiGet<Recipe[]>("/recipes") });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [form, setForm] = useState(blankForm);

  const [detail, setDetail] = useState<Recipe | null>(null);
  const [detailServings, setDetailServings] = useState(2);

  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [drafts, setDrafts] = useState<RecipeDraft[]>([]);

  const openCreate = () => {
    setEditing(null);
    setForm(blankForm);
    setSheetOpen(true);
  };

  const openEdit = (r: Recipe) => {
    setEditing(r);
    setForm({
      name: r.name,
      description: r.description,
      category: r.category,
      base_servings: String(r.base_servings),
      prep_minutes: String(r.prep_minutes),
      cook_minutes: String(r.cook_minutes),
      ingredients: r.ingredients.map((i) => ({ qty: String(i.qty), unit: i.unit, name: i.name })),
      steps: r.steps.length ? [...r.steps] : [""],
    });
    setSheetOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        name: form.name,
        description: form.description,
        category: form.category,
        base_servings: Number(form.base_servings),
        prep_minutes: Number(form.prep_minutes),
        cook_minutes: Number(form.cook_minutes),
        ingredients: form.ingredients
          .filter((i) => i.name && Number(i.qty) > 0)
          .map((i) => ({ qty: Number(i.qty), unit: i.unit, name: i.name })),
        steps: form.steps.map((s) => s.trim()).filter(Boolean),
      };
      if (editing) return apiPut<Recipe>(`/recipes/${editing.id}`, body);
      return apiPost<Recipe>("/recipes", body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recipes"] });
      setSheetOpen(false);
      toast.success(editing ? "Recipe updated" : "Recipe added to vault");
    },
    onError: (err) => toast.error(`Could not save: ${err.message}`),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete<void>(`/recipes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recipes"] });
      toast.success("Recipe deleted");
    },
  });

  const generate = useMutation({
    mutationFn: () => apiPost<RecipeDraft[]>("/ai/recipe-ideas", { prompt: aiPrompt, count: 3 }),
    onSuccess: (rows) => {
      setDrafts(rows);
      toast.success(`${rows.length} ideas ready — save the ones you like`);
    },
    onError: (err) => toast.error(`AI ideas failed: ${err.message}`),
  });

  const saveDraft = useMutation({
    mutationFn: async (draft: RecipeDraft) => {
      await apiPost<Recipe>("/recipes", draft);
      return draft;
    },
    onSuccess: (draft) => {
      qc.invalidateQueries({ queryKey: ["recipes"] });
      setDrafts((rows) => rows.filter((r) => r.name !== draft.name));
      toast.success(`${draft.name} saved to vault`);
    },
    onError: () => toast.error("Could not save that one"),
  });

  const setIng = (i: number, patch: Partial<IngredientRow>) =>
    setForm((f) => ({ ...f, ingredients: f.ingredients.map((row, j) => (j === i ? { ...row, ...patch } : row)) }));

  return (
    <div className="relative">
      <BackgroundBlobs />
      <PageHeader
        title="Recipe Vault"
        subtitle="Your family cookbook — with AI ideas when inspiration runs dry."
        actions={
          <>
            <Button variant="outline" data-testid="recipes-ai-ideas-button" onClick={() => setAiOpen(true)}>
              <WandSparkles className="h-4 w-4 text-[#C85A32]" /> AI ideas
            </Button>
            <Button data-testid="recipes-new-button" onClick={openCreate} className="bg-[#C85A32] text-white hover:bg-[#B24C26]">
              <Plus className="h-4 w-4" /> New recipe
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {(recipes.data ?? []).map((r, idx) => (
          <Card
            key={r.id}
            data-testid="recipe-card"
            className="card-lift animate-fade-up cursor-pointer rounded-2xl p-5"
            style={{ animationDelay: `${idx * 0.05}s` }}
            onClick={() => {
              setDetail(r);
              setDetailServings(r.base_servings);
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-heading text-lg font-semibold">{r.name}</h3>
                <p className="mt-0.5 line-clamp-2 min-h-10 text-sm text-muted-foreground">{r.description || "—"}</p>
              </div>
              <Badge variant="secondary" className="shrink-0">
                {r.category}
              </Badge>
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> {r.base_servings} servings
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {r.prep_minutes + r.cook_minutes} min
              </span>
              <span>{r.ingredients.length} ingredients</span>
            </div>
          </Card>
        ))}
      </div>
      {recipes.data && recipes.data.length === 0 && (
        <div className="glass rounded-2xl p-10 text-center">
          <p className="font-heading text-lg">The vault is empty</p>
          <p className="mt-1 text-sm text-muted-foreground">Add grandma's classics or let the AI suggest something new.</p>
        </div>
      )}

      {/* create / edit sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg" side="right">
          <SheetHeader>
            <SheetTitle className="font-heading">{editing ? "Edit recipe" : "New recipe"}</SheetTitle>
          </SheetHeader>
          <div className="grid gap-4 px-4 pb-6">
            <div className="grid gap-1.5">
              <Label htmlFor="recipe-name">Name</Label>
              <Input id="recipe-name" data-testid="recipe-name-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="grid gap-1.5">
                <Label htmlFor="recipe-category">Category</Label>
                <Input id="recipe-category" data-testid="recipe-category-input" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="recipe-servings">Servings</Label>
                <Input id="recipe-servings" data-testid="recipe-servings-input" type="number" min="1" value={form.base_servings} onChange={(e) => setForm((f) => ({ ...f, base_servings: e.target.value }))} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="recipe-time">Total min</Label>
                <Input
                  id="recipe-time"
                  data-testid="recipe-time-input"
                  type="number"
                  min="0"
                  value={String(Number(form.prep_minutes) + Number(form.cook_minutes))}
                  onChange={(e) => setForm((f) => ({ ...f, cook_minutes: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="recipe-desc">Description</Label>
              <Textarea id="recipe-desc" data-testid="recipe-desc-input" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>

            <div className="grid gap-2">
              <Label>Ingredients</Label>
              {form.ingredients.map((ing, i) => (
                <div key={i} className="flex items-center gap-1.5" data-testid="recipe-ingredient-row">
                  <Input
                    className="w-20"
                    data-testid="recipe-ingredient-qty"
                    type="number"
                    min="0"
                    step="any"
                    placeholder="qty"
                    value={ing.qty}
                    onChange={(e) => setIng(i, { qty: e.target.value })}
                  />
                  <select
                    className="h-9 rounded-md border border-input bg-card px-2 text-sm"
                    data-testid="recipe-ingredient-unit"
                    value={ing.unit}
                    onChange={(e) => setIng(i, { unit: e.target.value })}
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                  <Input
                    className="flex-1"
                    data-testid="recipe-ingredient-name"
                    placeholder="ingredient"
                    value={ing.name}
                    onChange={(e) => setIng(i, { name: e.target.value })}
                  />
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    data-testid="recipe-ingredient-remove"
                    onClick={() => setForm((f) => ({ ...f, ingredients: f.ingredients.filter((_, j) => j !== i) }))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                data-testid="recipe-ingredient-add"
                onClick={() => setForm((f) => ({ ...f, ingredients: [...f.ingredients, { qty: "", unit: "g", name: "" }] }))}
              >
                <Plus className="h-3.5 w-3.5" /> Add ingredient
              </Button>
            </div>

            <div className="grid gap-2">
              <Label>Steps</Label>
              {form.steps.map((step, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <span className="mt-2.5 text-xs font-semibold text-muted-foreground">{i + 1}.</span>
                  <Textarea
                    rows={2}
                    data-testid="recipe-step-input"
                    value={step}
                    onChange={(e) => setForm((f) => ({ ...f, steps: f.steps.map((s, j) => (j === i ? e.target.value : s)) }))}
                  />
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    data-testid="recipe-step-remove"
                    onClick={() => setForm((f) => ({ ...f, steps: f.steps.filter((_, j) => j !== i) }))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                data-testid="recipe-step-add"
                onClick={() => setForm((f) => ({ ...f, steps: [...f.steps, ""] }))}
              >
                <Plus className="h-3.5 w-3.5" /> Add step
              </Button>
            </div>

            <SheetFooter>
              <Button
                data-testid="recipe-save-button"
                disabled={!form.name || save.isPending}
                onClick={() => save.mutate()}
                className="bg-[#C85A32] text-white hover:bg-[#B24C26]"
              >
                {editing ? "Update recipe" : "Save to vault"}
              </Button>
            </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>

      {/* detail dialog with serving scaler */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">{detail?.name}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="grid gap-4">
              <p className="text-sm text-muted-foreground">{detail.description}</p>
              <div className="flex items-center justify-between rounded-xl bg-[#EBF2EC] px-4 py-3">
                <span className="flex items-center gap-2 text-sm font-medium text-[#1E3A2B]">
                  <Users className="h-4 w-4" /> Servings
                </span>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="icon-xs" data-testid="recipe-detail-servings-minus" onClick={() => setDetailServings((n) => Math.max(1, n - 1))}>
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="font-display-num w-8 text-center text-lg font-semibold" data-testid="recipe-detail-servings-value">
                    {detailServings}
                  </span>
                  <Button variant="outline" size="icon-xs" data-testid="recipe-detail-servings-plus" onClick={() => setDetailServings((n) => n + 1)}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <ScaledIngredients recipe={detail} servings={detailServings} />
              <div>
                <p className="mb-2 font-heading font-semibold">Steps</p>
                <ol className="grid gap-2">
                  {detail.steps.map((s, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <span className="font-display-num text-[#C85A32]">{i + 1}.</span> {s}
                    </li>
                  ))}
                </ol>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  data-testid="recipe-detail-edit-button"
                  onClick={() => {
                    setDetail(null);
                    openEdit(detail);
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1 text-[#B93826]"
                  data-testid="recipe-detail-delete-button"
                  onClick={() => {
                    remove.mutate(detail.id);
                    setDetail(null);
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* AI ideas dialog */}
      <Dialog open={aiOpen} onOpenChange={(o) => { setAiOpen(o); if (!o) setDrafts([]); }}>
        <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-heading">
              <Sparkles className="h-5 w-5 text-[#C85A32]" /> AI recipe ideas
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Textarea
              data-testid="ai-ideas-prompt-input"
              rows={2}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g. quick South Indian dinner under 30 minutes, mildly spicy"
            />
            <Button data-testid="ai-ideas-generate-button" disabled={generate.isPending} onClick={() => generate.mutate()} className="bg-[#245C3F] text-white hover:bg-[#1E4A33]">
              <WandSparkles className="h-4 w-4" /> {generate.isPending ? "Thinking…" : "Generate ideas"}
            </Button>
            {drafts.map((d, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4" data-testid="ai-idea-card">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-heading font-semibold">{d.name}</h4>
                  <Badge variant="secondary">{d.category}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{d.description}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {d.ingredients.length} ingredients · {d.steps.length} steps · serves {d.base_servings}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  data-testid="ai-idea-save-button"
                  disabled={saveDraft.isPending}
                  onClick={() => saveDraft.mutate(d)}
                >
                  Save to vault
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
