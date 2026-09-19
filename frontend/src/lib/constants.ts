export const CATEGORIES = [
  "Groceries",
  "Utilities",
  "Maid/Cook Salary",
  "Dining Out",
  "Home Maintenance",
  "Kids",
  "Healthcare",
  "Transport",
  "Misc",
] as const;

export const MEMBERS = ["Husband", "Wife", "Shared"] as const;

export const FREQUENCIES = ["Daily", "Weekly", "Monthly", "Seasonal"] as const;

export const AISLES = [
  "Vegetables & Greens",
  "Dairy",
  "Spices & Staples",
  "Household & Cleaning",
  "Other",
] as const;

export const SLOTS = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "snacks", label: "Evening Snacks" },
  { value: "dinner", label: "Dinner" },
] as const;

export const SLOT_LABELS: Record<string, string> = Object.fromEntries(
  SLOTS.map((s) => [s.value, s.label]),
);

export const UNITS = ["g", "kg", "ml", "l", "tbsp", "tsp", "cup", "piece", "pinch"] as const;

export const CHART_COLORS = ["#245C3F", "#C85A32", "#D99B26", "#3D7B80", "#87537D", "#758E4F"];

export const HERO_IMAGES = {
  login:
    "https://images.unsplash.com/photo-1773098587028-370ff3c207d0?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
  cook:
    "https://images.unsplash.com/photo-1547573854-74d2a71d0826?crop=entropy&cs=srgb&fm=jpg&q=85&w=2000",
  pan: "https://images.unsplash.com/photo-1766422526750-6099697a2dd5?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
  spices:
    "https://images.pexels.com/photos/14721901/pexels-photo-14721901.jpeg?auto=compress&cs=tinysrgb&w=1200",
};
