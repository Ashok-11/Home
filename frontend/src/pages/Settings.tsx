import { BackgroundBlobs, PageHeader } from "@/components/decor";
import ListEditor from "@/components/ListEditor";
import { useAisles, useCategories, useTimings } from "@/lib/config";

/** One place to configure the lists the rest of the app uses. */
export default function Settings() {
  const categories = useCategories();
  const aisles = useAisles();
  const timings = useTimings();

  return (
    <div className="relative">
      <BackgroundBlobs />
      <PageHeader
        title="Settings"
        subtitle="Configure spending categories, grocery aisles and meal timings — they drive every dropdown."
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ListEditor
          title="Spending categories"
          description="Used by expenses and the dashboard breakdown. Renaming updates existing expenses."
          endpoint="/categories"
          queryKey="categories"
          rows={categories.data ?? []}
          placeholder="e.g. Fuel"
          testid="category"
        />
        <ListEditor
          title="Grocery aisles"
          description="Groups the shopping list. Renaming moves existing items across."
          endpoint="/aisles"
          queryKey="aisles"
          rows={aisles.data ?? []}
          placeholder="e.g. Bakery"
          testid="aisle"
        />
        <ListEditor
          title="Meal timings"
          description="Breakfast, lunch, dinner… add any timing, then slot dishes into it per day."
          endpoint="/timings"
          queryKey="timings"
          rows={timings.data ?? []}
          placeholder="e.g. Midnight Snack"
          ordered
          testid="timing"
        />
      </div>
    </div>
  );
}
