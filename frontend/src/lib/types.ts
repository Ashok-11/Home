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
  source_id: string | null;
  source_label: string;
  is_personal: boolean;
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
  source_type: string;
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

export interface IncomeBreakdown {
  ashok: number;
  manasa: number;
  rental: number;
  other: number;
  total: number;
}

export interface PersonalFund {
  allowance: number;
  ashok_used: number;
  manasa_used: number;
}

export interface CardSpend {
  card_id: string | null;
  name: string;
  bank: string;
  last4: string;
  type: string;
  owner: string;
  total: number;
  by_member: Record<string, number>;
}

export interface DashboardData {
  scope: string;
  key: string;
  label: string;
  income: IncomeBreakdown;
  expense_total: number;
  budget: number;
  remaining: number;
  by_category: CategoryTotal[];
  personal: PersonalFund;
  cards: CardSpend[];
  recent_expenses: Expense[];
}

export interface Allowance {
  id: string;
  month: string;
  amount: number;
}

export interface Card {
  id: string;
  name: string;
  bank: string;
  last4: string;
  type: string;
  owner: string;
  created_at: string;
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
  area: string;
  done: boolean;
  created_at: string;
}

export interface ServiceRecord {
  id: string;
  appliance_id: string;
  date: string;
  vendor: string;
  cost: number;
  notes: string;
  created_at: string;
}

export interface Appliance {
  id: string;
  name: string;
  location: string;
  service_interval_months: number;
  last_serviced_on: string | null;
  notes: string;
  created_at: string;
  next_due: string | null;
  overdue: boolean;
  records: ServiceRecord[];
}

export interface CopilotMessage {
  role: "user" | "assistant";
  content: string;
}
