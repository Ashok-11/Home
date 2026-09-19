import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CalendarDays, ChefHat, ExternalLink, ShoppingCart, Trash2, UtensilsCrossed } from "lucide-react";
import { apiDelete, apiGet, apiPatch } from "@/lib/api";
import { formatDate, todayIso } from "@/lib/format";
import { SLOT_LABELS } from "@/lib/constants";
import type { Chore, CookMenu, GroceryItem, Recipe } from "@/lib/types";
import { BackgroundBlobs, PageHeader, Steam } from "@/components/decor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

/** Cooking-side dashboard: today's menu, cooking chores, recipe + grocery shortcuts. */
export default function Kitchen() {
  const qc = useQueryClient();
  const today = todayIso();

  const menu = useQuery({ queryKey: ["cook", today], queryFn: () => apiGet<CookMenu>(`/cook/${today}`), retry: false });
  const chores = useQuery({ queryKey: ["chores", "cooking"], queryFn: () => apiGet<Chore[]>("/chores?area=cooking") });
  const recipes = useQuery({ queryKey: ["recipes"], queryFn: () => apiGet<Recipe[]>("/recipes") });
  const grocery = useQuery({ queryKey: ["grocery"], queryFn: () => apiGet<GroceryItem[]>("/grocery") });

  const toggle = useMutation({
    mutationFn: (c: Chore) => apiPatch<Chore>(`/chores/${c.id}`, { done: !c.done }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chores"] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete<void>(`/chores/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chores"] }),
  });

  const pendingGrocery = (grocery.data ?? []).filter((g) => !g.checked).length;
  const cookingChores = [...(chores.data ?? [])].sort((a, b) => Number(a.done) - Number(b.done));

  return (
    <div className="relative">
      <BackgroundBlobs hero />
      <PageHeader
        title="Kitchen Board"
        subtitle={`${formatDate(today)} — today's menu, cooking duties and the recipe vault.`}
        actions={
          <a href="/cook" target="_blank" rel="noreferrer">
            <Button data-testid="kitchen-cook-view-button" className="bg-[#D0663C] text-white hover:bg-[#B8552F]">
              <ExternalLink className="h-4 w-4" /> Cook view
            </Button>
          </a>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* today's menu */}
        <div className="gold-edge jewel rounded-2xl p-6 lg:col-span-7" data-testid="kitchen-menu-card">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-2xl font-bold text-[#F6F1E4]">Today's kitchen</h2>
            <Steam className="text-[#E4B45A]" />
          </div>
          {menu.data && menu.data.entries.length > 0 ? (
            <ul className="mt-4 grid gap-2">
              {menu.data.entries.map((e) => (
                <li key={e.id} className="flex items-center justify-between rounded-xl bg-white/8 px-4 py-3 ring-1 ring-white/10" data-testid="kitchen-menu-row">
                  <span className="flex items-center gap-2 text-sm text-[#F6F1E4]">
                    <UtensilsCrossed className="h-4 w-4 text-[#E4B45A]" />
                    {e.recipe?.name ?? "Recipe removed"}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="rounded-full bg-[#E4B45A]/15 px-2 py-0.5 text-[11px] font-semibold text-[#E4B45A]">
                      {SLOT_LABELS[e.slot] ?? e.slot}
                    </span>
                    <span className="font-display-num text-sm font-bold text-[#F6F1E4]">x{e.servings}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-xl bg-white/8 px-4 py-8 text-center text-sm text-[#A9BCAE]">
              Nothing planned for today yet.
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/menu">
              <Button variant="outline" data-testid="kitchen-plan-menu-link" className="border-white/25 bg-white/5 text-[#F6F1E4] hover:bg-white/15">
                <CalendarDays className="h-4 w-4" /> Plan the week
              </Button>
            </Link>
            <Link to="/recipes">
              <Button variant="outline" data-testid="kitchen-recipes-link" className="border-white/25 bg-white/5 text-[#F6F1E4] hover:bg-white/15">
                <ChefHat className="h-4 w-4" /> Recipe vault ({recipes.data?.length ?? 0})
              </Button>
            </Link>
            <Link to="/grocery">
              <Button variant="outline" data-testid="kitchen-grocery-link" className="border-white/25 bg-white/5 text-[#F6F1E4] hover:bg-white/15">
                <ShoppingCart className="h-4 w-4" /> Grocery ({pendingGrocery})
              </Button>
            </Link>
          </div>
        </div>

        {/* cooking chores */}
        <Card className="rounded-2xl lg:col-span-5" data-testid="kitchen-chores-card">
          <CardHeader>
            <CardTitle className="font-heading text-xl">Cooking duties</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {cookingChores.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2.5" data-testid="kitchen-chore-row">
                <Checkbox checked={c.done} onCheckedChange={() => toggle.mutate(c)} data-testid="kitchen-chore-checkbox" />
                <span className={`flex-1 text-sm ${c.done ? "text-muted-foreground line-through" : "font-medium"}`}>
                  {c.title.split(" @")[0]}
                </span>
                <Badge variant="outline">{c.frequency}</Badge>
                <Badge variant="secondary">{c.assignee}</Badge>
                <Button variant="ghost" size="icon-xs" data-testid="kitchen-chore-delete" onClick={() => remove.mutate(c.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-[#B93826]" />
                </Button>
              </div>
            ))}
            {cookingChores.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No cooking duties yet — add them from the Chores page (area: Cooking).
              </p>
            )}
            <Link to="/chores" className="mt-1">
              <Button variant="ghost" size="sm" className="w-full" data-testid="kitchen-manage-chores-link">
                Manage chores
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* recipe strip */}
      <div className="mt-4">
        <h2 className="font-heading mb-3 text-xl font-semibold">From the vault</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {(recipes.data ?? []).slice(0, 8).map((r, i) => (
            <Link
              key={r.id}
              to="/recipes"
              data-testid="kitchen-recipe-chip"
              className="card-lift animate-pop-in glass rounded-2xl p-4"
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              <p className="font-heading font-semibold">{r.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {r.category} · serves {r.base_servings} · {r.prep_minutes + r.cook_minutes} min
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
