import { Navigate, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import ProtectedShell from "@/components/ProtectedShell";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Expenses from "@/pages/Expenses";
import Budget from "@/pages/Budget";
import MenuPlanner from "@/pages/MenuPlanner";
import Recipes from "@/pages/Recipes";
import Grocery from "@/pages/Grocery";
import Chores from "@/pages/Chores";
import Copilot from "@/pages/Copilot";
import CookView from "@/pages/CookView";
import Cards from "@/pages/Cards";
import Kitchen from "@/pages/Kitchen";

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />
        {/* public, shareable cook view — never gated */}
        <Route path="/cook" element={<CookView />} />
        <Route path="/cook/:date" element={<CookView />} />
        {/* household members only */}
        <Route element={<ProtectedShell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/budget" element={<Budget />} />
          <Route path="/cards" element={<Cards />} />
          <Route path="/kitchen" element={<Kitchen />} />
          <Route path="/menu" element={<MenuPlanner />} />
          <Route path="/recipes" element={<Recipes />} />
          <Route path="/grocery" element={<Grocery />} />
          <Route path="/chores" element={<Chores />} />
          <Route path="/copilot" element={<Copilot />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster richColors />
    </ThemeProvider>
  );
}
