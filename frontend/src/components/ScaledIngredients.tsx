import type { Recipe } from "@/lib/types";
import { formatQty } from "@/lib/format";

/** Ingredient rows scaled from the recipe's base servings to `servings`. */
export default function ScaledIngredients({
  recipe,
  servings,
  className = "",
}: {
  recipe: Recipe;
  servings: number;
  className?: string;
}) {
  const factor = servings / Math.max(recipe.base_servings, 1);
  return (
    <ul className={`grid gap-1.5 ${className}`} data-testid="scaled-ingredients">
      {recipe.ingredients.map((ing, i) => (
        <li
          key={`${ing.name}-${i}`}
          className="flex items-baseline justify-between gap-3 rounded-lg bg-muted/60 px-3 py-1.5 text-sm"
        >
          <span className="text-foreground">{ing.name}</span>
          <span className="font-mono font-semibold text-foreground" data-testid="scaled-ingredient-qty">
            {formatQty(ing.qty * factor, ing.unit)}
          </span>
        </li>
      ))}
    </ul>
  );
}
