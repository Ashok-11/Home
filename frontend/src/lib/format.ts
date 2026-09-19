export function formatINR(amount: number): string {
  const n = Number(amount) || 0;
  const hasPaise = Math.round(n * 100) % 100 !== 0;
  return (
    "₹" +
    n.toLocaleString("en-IN", {
      minimumFractionDigits: hasPaise ? 2 : 0,
      maximumFractionDigits: hasPaise ? 2 : 0,
    })
  );
}

// "2025-06-05" -> "5 Jun 2025" (parsed as local midnight to stay date-stable)
export function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function monthLabel(month: string): string {
  const d = new Date(`${month}-01T00:00:00`);
  if (Number.isNaN(d.getTime())) return month;
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function currentMonth(): string {
  return todayIso().slice(0, 7);
}

export function addMonths(month: string, delta: number): string {
  const d = new Date(`${month}-01T00:00:00`);
  d.setMonth(d.getMonth() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function addDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Ingredient qty scaled by a factor, trimmed to a friendly precision.
export function formatQty(qty: number, unit: string): string {
  const scaled = qty * 1;
  const rounded = scaled >= 100 ? Math.round(scaled) : Math.round(scaled * 100) / 100;
  const text = rounded.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  return unit ? `${text} ${unit}` : text;
}
