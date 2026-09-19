import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CalendarDays, ExternalLink, ShoppingCart, UtensilsCrossed } from "lucide-react";
import { apiGet, apiPatch } from "@/lib/api";
import { todayIso } from "@/lib/format";
import type { Chore, CookMenu, GroceryItem } from "@/lib/types";
import { Steam } from "@/components/decor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

/** Kitchen tab of the dashboard: today's dishes per station + cooking duties. */
export default function KitchenPanel() {
  const qc = useQueryClient();
  const date = todayIso();

  const cook = useQuery({ queryKey: ["station", "cook", date], queryFn: () => apiGet<CookMenu>(`/station/cook/${date}`), retry: false });
  const salad = useQuery({ queryKey: ["station", "salad", date], queryFn: () => apiGet<CookMenu>(`/station/salad/${date}`), retry: false });
  const chores = useQuery({ queryKey: ["chores", "cooking"], queryFn: () => apiGet<Chore[]>("/chores?area=cooking") });
  const grocery = useQuery({ queryKey: ["grocery"], queryFn: () => apiGet<GroceryItem[]>("/grocery") });

  const toggle = useMutation({
    mutationFn: (c: Chore) => apiPatch<Chore>(`/chores/${c.id}`, { done: !c.done }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chores"] }),
  });

  const pendingGrocery = (grocery.data ?? []).filter((g) => !g.checked).length;
  const stations = [
    { key: "cook", title: "Kitchen station", data: cook.data, href: "/cook", testid: "kitchen-panel-cook" },
    { key: "salad", title: "Salad station", data: salad.data, href: "/salad", testid: "kitchen-panel-salad" },
  ];

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {stations.map((st) => (
          <div key={st.key} className="gold-edge jewel rounded-2xl p-6" data-testid={st.testid}>
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-xl font-bold text-[#F6F1E4]">{st.title}</h3>
              <Steam className="text-[#E4B45A]" />
            </div>
            {st.data && st.data.entries.length > 0 ? (
              <ul className="mt-4 grid gap-2">
                {st.data.entries.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/8 px-4 py-2.5 ring-1 ring-white/10" data-testid="kitchen-panel-dish">
                    <span className="flex min-w-0 items-center gap-2 text-sm text-[#F6F1E4]">
                      <UtensilsCrossed className="h-4 w-4 shrink-0 text-[#E4B45A]" />
                      <span className="truncate">{e.recipe?.name ?? "Recipe removed"}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full bg-[#E4B45A]/15 px-2 py-0.5 text-[11px] font-semibold text-[#E4B45A]">
                        {e.timing_label || "Anytime"}
                      </span>
                      <span className="font-display-num text-sm font-bold text-[#F6F1E4]">x{e.servings}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 rounded-xl bg-white/8 px-4 py-6 text-center text-sm text-[#A9BCAE]">Nothing planned today.</p>
            )}
            <a href={st.href} target="_blank" rel="noreferrer" className="mt-4 inline-flex">
              <Button variant="outline" size="sm" className="border-white/25 bg-white/5 text-[#F6F1E4] hover:bg-white/15" data-testid={`${st.testid}-open`}>
                <ExternalLink className="h-3.5 w-3.5" /> Open board
              </Button>
            </a>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="font-heading text-xl">Cooking duties</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {(chores.data ?? []).map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2.5" data-testid="kitchen-panel-chore">
                <Checkbox checked={c.done} onCheckedChange={() => toggle.mutate(c)} data-testid="kitchen-panel-chore-checkbox" />
                <span className={`flex-1 text-sm ${c.done ? "text-muted-foreground line-through" : "font-medium"}`}>
                  {c.title.split(" @")[0]}
                </span>
                <Badge variant="outline">{c.frequency}</Badge>
                <Badge variant="secondary">{c.assignee}</Badge>
              </div>
            ))}
            {(chores.data ?? []).length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No cooking duties yet.</p>
            )}
          </CardContent>
        </Card>

        <div className="grid content-start gap-3">
          <Link to="/menu" className="card-lift glass flex items-center gap-3 rounded-2xl p-5" data-testid="kitchen-panel-menu-link">
            <CalendarDays className="h-5 w-5 text-[#1E4030] dark:text-[#8FBF9C]" />
            <div>
              <p className="font-heading font-semibold">Menu planner</p>
              <p className="text-xs text-muted-foreground">Set dishes per timing, per day</p>
            </div>
          </Link>
          <Link to="/recipes" className="card-lift glass flex items-center gap-3 rounded-2xl p-5" data-testid="kitchen-panel-recipes-link">
            <UtensilsCrossed className="h-5 w-5 text-[#D0663C]" />
            <div>
              <p className="font-heading font-semibold">Recipe vault</p>
              <p className="text-xs text-muted-foreground">Photos, ingredients, steps, station</p>
            </div>
          </Link>
          <Link to="/grocery" className="card-lift glass flex items-center gap-3 rounded-2xl p-5" data-testid="kitchen-panel-grocery-link">
            <ShoppingCart className="h-5 w-5 text-[#B08432]" />
            <div>
              <p className="font-heading font-semibold">Grocery list</p>
              <p className="text-xs text-muted-foreground">{pendingGrocery} items pending</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
