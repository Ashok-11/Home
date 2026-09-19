// Hand-written mirrors of the Pydantic models in backend/ — keep both sides in sync in the same edit.

export interface UserPublic {
  id: string;
  name: string;
  email: string;
}

export interface Expense {
  id: string;
  amount: number;
  category: string;
  note: string;
  date: string;
  month: string;
  member: string;
  created_by: string;
  created_at: string;
}

export interface ParsedExpense {
  amount: number;
  category: string;
  note: string;
  date: string;
}

export interface Income {
  id: string;
  source: string;
  amount: number;
  date: string;
  month: string;
  created_at: string;
}

export interface CategoryTotal {
  category: string;
  total: number;
}

export interface FinanceSummary {
  month: string;
  income_total: number;
  expense_total: number;
  budget: number;
  remaining: number;
  by_category: CategoryTotal[];
  recent_expenses: Expense[];
}

export interface Ingredient {
  qty: number;
  unit: string;
  name: string;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  category: string;
  base_servings: number;
  prep_minutes: number;
  cook_minutes: number;
  ingredients: Ingredient[];
  steps: string[];
  created_by: string;
  created_at: string;
}

export interface RecipeDraft {
  name: string;
  description: string;
  category: string;
  base_servings: number;
  prep_minutes: number;
  cook_minutes: number;
  ingredients: Ingredient[];
  steps: string[];
}

export interface MenuEntry {
  id: string;
  date: string;
  slot: string;
  recipe_id: string;
  recipe_name: string;
  servings: number;
  notes: string;
  created_at: string;
}

export interface CookEntry {
  id: string;
  slot: string;
  servings: number;
  notes: string;
  recipe: Recipe | null;
}

export interface CookMenu {
  date: string;
  entries: CookEntry[];
}

export interface GroceryItem {
  id: string;
  name: string;
  qty: number | null;
  unit: string;
  aisle: string;
  checked: boolean;
  source: string;
  created_at: string;
}

export interface Chore {
  id: string;
  title: string;
  assignee: string;
  frequency: string;
  due_date: string | null;
  done: boolean;
  created_at: string;
}

export interface CopilotMessage {
  role: "user" | "assistant";
  content: string;
}
