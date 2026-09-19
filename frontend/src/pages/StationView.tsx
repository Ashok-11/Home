import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Clock, Salad, Soup, Users, UtensilsCrossed, X } from "lucide-react";
import { apiGet } from "@/lib/api";
import { formatDate, todayIso } from "@/lib/format";
import { HERO_IMAGES } from "@/lib/constants";
import type { CookEntry, CookMenu } from "@/lib/types";
import { ManshokMark, Steam } from "@/components/decor";
import ScaledIngredients from "@/components/ScaledIngredients";
import DishImage from "@/components/DishImage";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

/**
 * PUBLIC station board — shared with the helpers. `station` is "cook" or "salad".
 * Shows ONLY today's dishes for that station: photo, name, servings, notes.
 * Tapping a dish opens the ingredients (scaled) and the steps.
 */
export default function StationView({ station: fixedStation }: { station?: string }) {
  const params = useParams();
  const station = fixedStation ?? params.station ?? "cook";
  const date = todayIso();
  const [open, setOpen] = useState<CookEntry | null>(null);
  const [servings, setServings] = useState(2);
  const [doneSteps, setDoneSteps] = useState<Record<string, boolean>>({});

  const menu = useQuery({
    queryKey: ["station", station, date],
    queryFn: () => apiGet<CookMenu>(`/station/${station}/${date}`),
    retry: false,
    refetchInterval: 60_000, // the board refreshes itself through the day
  });

  useEffect(() => {
    if (open) setServings(open.servings);
  }, [open]);

  const isSalad = station === "salad";
  const title = isSalad ? "Salad Station" : "Kitchen Station";
  const StationIcon = isSalad ? Salad : Soup;

  // group by timing, preserving the server's order
  const groups: { label: string; entries: CookEntry[] }[] = [];
  for (const e of menu.data?.entries ?? []) {
    const label = e.timing_label || "Anytime";
    const found = groups.find((g) => g.label === label);
    if (found) found.entries.push(e);
    else groups.push({ label, entries: [e] });
  }

  return (
    <div className="min-h-svh bg-[#FAF6EE]">
      {/* hero */}
      <div className="relative overflow-hidden bg-[#14261B]">
        <img src={isSalad ? HERO_IMAGES.spices : HERO_IMAGES.cook} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#14261B]/85 to-[#14261B]/96" />
        <div className="relative mx-auto max-w-5xl px-4 py-9 text-center sm:px-6">
          <div className="mb-3 flex items-center justify-center gap-3">
            <ManshokMark className="h-9 w-9" />
            <span className="font-heading text-lg font-bold text-[#F6F1E4]">Manshok</span>
          </div>
          <p className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#E4B45A]">
            <StationIcon className="h-4 w-4" /> {title}
            <Steam className="text-[#E4B45A]" />
          </p>
          <h1 className="mt-2 font-heading text-3xl font-bold text-[#F6F1E4] sm:text-4xl" data-testid="station-date-heading">
            {formatDate(date)}
          </h1>
          <p className="mt-2 text-sm text-[#A9BCAE]">Today's dishes only — tap a dish for the recipe.</p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {groups.length > 0 ? (
          <div className="grid gap-8">
            {groups.map((group) => (
              <section key={group.label}>
                <h2 className="mb-3 flex items-center gap-2 font-heading text-2xl font-semibold text-[#1E4030]" data-testid="station-timing-heading">
                  <Clock className="h-5 w-5 text-[#D0663C]" /> {group.label}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.entries.map((entry) => (
                    <button
                      key={entry.id}
                      data-testid="station-dish-card"
                      onClick={() => setOpen(entry)}
                      className="card-lift gold-edge overflow-hidden rounded-2xl bg-white text-left shadow-sm"
                    >
                      <div className="relative h-44 w-full bg-[#F1E9DA]">
                        <DishImage
                          src={entry.recipe?.image_url}
                          alt={entry.recipe?.name ?? "dish"}
                          testid="station-dish-image"
                          className="h-full w-full"
                        />
                        <span className="absolute right-2 top-2 rounded-full bg-[#14261B]/85 px-3 py-1 text-xs font-bold text-[#E4B45A]" data-testid="station-dish-servings">
                          {entry.servings} servings
                        </span>
                      </div>
                      <div className="p-4">
                        <h3 className="font-heading text-lg font-bold text-[#1A211B]" data-testid="station-dish-name">
                          {entry.recipe?.name ?? "Recipe removed"}
                        </h3>
                        {entry.notes && (
                          <p className="mt-1.5 inline-block rounded-full bg-[#FDF0EB] px-3 py-0.5 text-xs font-medium text-[#8C4328]" data-testid="station-dish-note">
                            {entry.notes}
                          </p>
                        )}
                        <p className="mt-2 text-xs font-medium text-[#D0663C]">Tap for recipe →</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="mx-auto max-w-md rounded-2xl border border-dashed border-[#E3DACB] bg-white p-10 text-center" data-testid="station-empty-state">
            <p className="font-heading text-xl font-semibold text-[#1A211B]">
              {menu.isError ? "Can't reach the board" : "Nothing planned for today"}
            </p>
            <p className="mt-2 text-sm text-[#5E6A5C]">
              {menu.isError
                ? "Check the connection — dishes appear as soon as the family plans them."
                : `No ${isSalad ? "salads" : "dishes"} assigned to this station today.`}
            </p>
          </div>
        )}

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4 text-sm">
          <Link to={isSalad ? "/cook" : "/salad"} data-testid="station-switch-link" className="font-medium text-[#D0663C] hover:underline">
            {isSalad ? "Kitchen station →" : "Salad station →"}
          </Link>
          <Link to="/login" data-testid="station-login-link" className="font-medium text-[#5E6A5C] hover:underline">
            Family sign in
          </Link>
        </div>
      </div>

      {/* recipe detail */}
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[88svh] overflow-y-auto sm:max-w-lg" showCloseButton={false}>
          {open?.recipe && (
            <div>
              {open.recipe.image_url && (
                <DishImage src={open.recipe.image_url} alt={open.recipe.name} testid="station-detail-image" className="-mx-6 -mt-6 mb-4 h-48 w-[calc(100%+3rem)]" />
              )}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-heading text-2xl font-bold" data-testid="station-detail-name">
                    {open.recipe.name}
                  </h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">{open.recipe.description}</p>
                </div>
                <Button variant="ghost" size="icon-sm" data-testid="station-detail-close" onClick={() => setOpen(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl bg-[#F1E9DA] px-4 py-3">
                <span className="flex items-center gap-2 text-sm font-semibold text-[#45382A]">
                  <Users className="h-4 w-4" /> Servings
                </span>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="icon-xs" data-testid="station-servings-minus" onClick={() => setServings((n) => Math.max(1, n - 1))}>
                    −
                  </Button>
                  <span className="font-display-num w-8 text-center text-lg font-bold" data-testid="station-servings-value">
                    {servings}
                  </span>
                  <Button variant="outline" size="icon-xs" data-testid="station-servings-plus" onClick={() => setServings((n) => n + 1)}>
                    +
                  </Button>
                </div>
              </div>

              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Ingredients</p>
                <ScaledIngredients recipe={open.recipe} servings={servings} />
              </div>

              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Steps — tap to tick off</p>
                <ol className="grid gap-1.5">
                  {open.recipe.steps.map((step, i) => {
                    const key = `${open.id}-${i}`;
                    const done = !!doneSteps[key];
                    return (
                      <li key={key}>
                        <button
                          data-testid="station-step-button"
                          onClick={() => setDoneSteps((s) => ({ ...s, [key]: !s[key] }))}
                          className={`flex w-full items-start gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                            done ? "bg-[#EBF2EC] text-[#7FB08F] line-through" : "bg-muted text-foreground hover:bg-muted/70"
                          }`}
                        >
                          <span className={`font-display-num font-bold ${done ? "text-[#7FB08F]" : "text-[#D0663C]"}`}>{i + 1}.</span>
                          {step}
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
