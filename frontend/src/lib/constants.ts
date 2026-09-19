export const CATEGORIES = [
  "Groceries",
  "Utilities",
  "Maid/Cook Salary",
  "Dining Out",
  "Home Maintenance",
  "Personal",
  "Kids",
  "Healthcare",
  "Transport",
  "Misc",
] as const;

// The household: Ashok + Manasa (Manshok), plus shared spends.
export const MEMBERS = ["Ashok", "Manasa", "Common"] as const;

export const INCOME_TYPES = [
  { value: "ashok", label: "Ashok's Income" },
  { value: "manasa", label: "Manasa's Income" },
  { value: "rental", label: "Rental Income" },
  { value: "other", label: "Other Sources" },
] as const;

export const CARD_TYPES = [
  { value: "credit", label: "Credit card" },
  { value: "debit", label: "Debit card" },
  { value: "upi", label: "UPI / wallet" },
  { value: "cash", label: "Cash" },
] as const;

export const CARD_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  CARD_TYPES.map((c) => [c.value, c.label]),
);

export const FREQUENCIES = ["Daily", "Weekly", "Monthly", "Seasonal"] as const;

export const CHORE_AREAS = [
  { value: "household", label: "Household" },
  { value: "cooking", label: "Cooking" },
] as const;

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export const AISLES = [
  "Vegetables & Greens",
  "Dairy",
  "Spices & Staples",
  "Household & Cleaning",
  "Other",
] as const;

export const UNITS = ["g", "kg", "ml", "l", "tbsp", "tsp", "cup", "piece", "pinch"] as const;

export const CHART_COLORS = ["#1E4030", "#D0663C", "#E4B45A", "#3D7B80", "#87537D", "#758E4F"];

export const BRAND = {
  name: "Manshok",
  tagline: "Manasa + Ashok",
  green: "#14261B",
  greenSoft: "#1E4030",
  terracotta: "#D0663C",
  gold: "#E4B45A",
  cream: "#FAF6EE",
};

export const HERO_IMAGES = {
  login:
    "https://images.unsplash.com/photo-1773098587028-370ff3c207d0?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
  cook:
    "https://images.unsplash.com/photo-1547573854-74d2a71d0826?crop=entropy&cs=srgb&fm=jpg&q=85&w=2000",
  pan: "https://images.unsplash.com/photo-1766422526750-6099697a2dd5?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
  spices:
    "https://images.pexels.com/photos/14721901/pexels-photo-14721901.jpeg?auto=compress&cs=tinysrgb&w=1200",
};
