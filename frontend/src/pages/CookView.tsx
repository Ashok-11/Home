import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Minus, Plus, Printer } from "lucide-react";
import { apiGet } from "@/lib/api";
import { addDays, formatDate, todayIso } from "@/lib/format";
import { HERO_IMAGES, SLOTS, SLOT_LABELS } from "@/lib/constants";
import type { CookMenu } from "@/lib/types";
import { Steam } from "@/components/decor";
import ScaledIngredients from "@/components/ScaledIngredients";
import { Button } from "@/components/ui/button";

/**
 * PUBLIC cook view — no login. Shared with the cook/maid. Works with no backend
 * too (shell + friendly empty state), per the static-preview rule.
 */
export default function CookView() {
  const params = useParams();
  const [date, setDate] = useState(params.date ?? todayIso());
  const [servingsOverride, setServingsOverride] = useState<Record<string, number>>({});
  const [doneSteps, setDoneSteps] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (params.date) setDate(params.date);
  }, [params.date]);

  const menu = useQuery({
    queryKey: ["cook", date],
    queryFn: () => apiGet<CookMenu>(`/cook/${date}`),
    retry: false,
  });

  const shift = (delta: number) => setDate((d) => addDays(d, delta));

  return (
    <div className="min-h-svh bg-[#FBF7EE]">
      {/* hero header */}
      <div className="relative overflow-hidden bg-[#112217]">
        <img src={HERO_IMAGES.cook} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#112217]/85 to-[#112217]/95" />
        <div className="relative mx-auto max-w-5xl px-4 py-10 text-center sm:px-6">
          <p className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#E88A68]">
            <Steam className="text-[#E88A68]" /> Today's cooking plan
          </p>
          <h1 className="mt-3 font-heading text-4xl font-bold text-[#FBF7EE] sm:text-5xl" data-testid="cook-date-heading">
            {formatDate(date)}
          </h1>
          <div className="mt-6 flex items-center justify-center gap-2">
            <Button variant="ghost" size="icon" data-testid="cook-prev-day" onClick={() => shift(-1)} className="text-[#FBF7EE] hover:bg-white/10">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <button
              data-testid="cook-today-button"
              onClick={() => setDate(todayIso())}
              className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white ring-1 ring-white/25 transition-colors hover:bg-white/20"
            >
              Today
            </button>
            <Button variant="ghost" size="icon" data-testid="cook-next-day" onClick={() => shift(1)} className="text-[#FBF7EE] hover:bg-white/10">
              <ChevronRight className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" data-testid="cook-print-button" onClick={() => window.print()} className="text-[#FBF7EE] hover:bg-white/10">
              <Printer className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {menu.data && menu.data.entries.length > 0 ? (
          <div className="grid gap-6">
            {SLOTS.map((slot) => {
              const entries = menu.data!.entries.filter((e) => e.slot === slot.value);
              if (entries.length === 0) return null;
              return (
                <section key={slot.value}>
                  <h2 className="mb-3 font-heading text-2xl font-semibold text-[#245C3F]" data-testid="cook-slot-heading">
                    {slot.label}
                  </h2>
                  <div className="grid gap-4 lg:grid-cols-2">
                    {entries.map((entry) => {
                      const servings = servingsOverride[entry.id] ?? entry.servings;
                      const recipe = entry.recipe;
                      return (
                        <div key={entry.id} className="card-lift rounded-2xl border border-[#E7E5E4] bg-white p-6" data-testid="cook-recipe-card">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="font-heading text-xl font-bold text-[#1C1917]">
                                {recipe?.name ?? "Recipe removed"}
                              </h3>
                              {entry.notes && (
                                <p className="mt-1 rounded-full bg-[#EBF2EC] px-3 py-0.5 text-xs font-medium text-[#1E3A2B]">
                                  {entry.notes}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 rounded-full bg-[#F3ECE0] px-2 py-1">
                              <button data-testid="cook-servings-minus" onClick={() => setServingsOverride((s) => ({ ...s, [entry.id]: Math.max(1, servings - 1) }))} className="rounded-full p-1 hover:bg-white">
                                <Minus className="h-4 w-4 text-[#473A2B]" />
                              </button>
                              <span className="font-display-num w-14 text-center text-base font-semibold text-[#1C1917]" data-testid="cook-servings-value">
                                x{servings}
                              </span>
                              <button data-testid="cook-servings-plus" onClick={() => setServingsOverride((s) => ({ ...s, [entry.id]: servings + 1 }))} className="rounded-full p-1 hover:bg-white">
                                <Plus className="h-4 w-4 text-[#473A2B]" />
                              </button>
                            </div>
                          </div>

                          {recipe && recipe.ingredients.length > 0 && (
                            <div className="mt-4">
                              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#57534E]">
                                Ingredients (scaled for {servings})
                              </p>
                              <ScaledIngredients recipe={recipe} servings={servings} />
                            </div>
                          )}

                          {recipe && recipe.steps.length > 0 && (
                            <div className="mt-4">
                              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#57534E]">
                                Steps — tap to tick off
                              </p>
                              <ol className="grid gap-1.5">
                                {recipe.steps.map((step, i) => {
                                  const key = `${entry.id}-${i}`;
                                  const done = !!doneSteps[key];
                                  return (
                                    <li key={key}>
                                      <button
                                        data-testid="cook-step-button"
                                        onClick={() => setDoneSteps((s) => ({ ...s, [key]: !s[key] }))}
                                        className={`flex w-full items-start gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                                          done ? "bg-[#EBF2EC] text-[#7FB08F] line-through" : "bg-[#F5F3EF] text-[#1C1917] hover:bg-[#F3ECE0]"
                                        }`}
                                      >
                                        <span className={`font-display-num font-semibold ${done ? "text-[#7FB08F]" : "text-[#C85A32]"}`}>
                                          {i + 1}.
                                        </span>
                                        {step}
                                      </button>
                                    </li>
                                  );
                                })}
                              </ol>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="mx-auto max-w-md rounded-2xl border border-dashed border-[#E7E5E4] bg-white p-10 text-center" data-testid="cook-empty-state">
            <p className="font-heading text-xl font-semibold text-[#1C1917]">
              {menu.isError ? "Can't reach the kitchen board" : "No menu for this day"}
            </p>
            <p className="mt-2 text-sm text-[#57534E]">
              {menu.isError
                ? "Check the connection — the plan will appear here as soon as the household updates it."
                : "The family hasn't planned meals for this date yet. Check another day."}
            </p>
          </div>
        )}

        <div className="mt-10 text-center">
          <Link to="/login" data-testid="cook-login-link" className="text-sm font-medium text-[#C85A32] hover:underline">
            Household member? Sign in to manage the plan →
          </Link>
        </div>
      </div>
    </div>
  );
}
