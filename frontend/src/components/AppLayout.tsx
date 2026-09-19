import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  CalendarDays,
  CheckSquare,
  CookingPot,
  CreditCard,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Receipt,
  ShoppingCart,
  Sparkles,
  Sun,
  UtensilsCrossed,
  WalletCards,
} from "lucide-react";
import { endSession, useMe } from "@/lib/session";
import { cn } from "@/lib/utils";
import { ManshokWordmark } from "@/components/decor";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const NAV = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard, testid: "nav-dashboard" },
  { name: "Daily Expenses", path: "/expenses", icon: Receipt, testid: "nav-expenses" },
  { name: "Budget & Income", path: "/budget", icon: WalletCards, testid: "nav-budget" },
  { name: "Cards & Sources", path: "/cards", icon: CreditCard, testid: "nav-cards" },
  { name: "Kitchen Board", path: "/kitchen", icon: CookingPot, testid: "nav-kitchen" },
  { name: "Menu Planner", path: "/menu", icon: CalendarDays, testid: "nav-menu" },
  { name: "Recipe Vault", path: "/recipes", icon: UtensilsCrossed, testid: "nav-recipes" },
  { name: "Grocery List", path: "/grocery", icon: ShoppingCart, testid: "nav-grocery" },
  { name: "Chores & Service", path: "/chores", icon: CheckSquare, testid: "nav-chores" },
  { name: "AI Copilot", path: "/copilot", icon: Sparkles, testid: "nav-copilot" },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          onClick={onNavigate}
          data-testid={item.testid}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-[inset_3px_0_0_#E4B45A]"
                : "text-[#9BAE9F] hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            )
          }
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {item.name}
        </NavLink>
      ))}
    </nav>
  );
}

function SidebarInner({ onNavigate }: { onNavigate?: () => void }) {
  const { resolvedTheme, setTheme } = useTheme();
  const me = useMe();

  return (
    <div className="flex h-full flex-col justify-between overflow-y-auto bg-sidebar p-5 text-sidebar-foreground">
      <div>
        <div className="mb-7 px-1">
          <ManshokWordmark />
        </div>
        <NavLinks onNavigate={onNavigate} />
      </div>
      <div className="mt-6 flex flex-col gap-3">
        <a
          href="/cook"
          data-testid="nav-cook-link"
          className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#D0663C] to-[#E4B45A] px-4 py-2.5 text-sm font-semibold text-[#1A1008] transition-transform hover:scale-[1.02]"
        >
          <ExternalLink className="h-4 w-4" /> Open Cook View
        </a>
        <div className="flex items-center justify-between rounded-xl bg-sidebar-accent/60 px-4 py-2.5">
          <span className="truncate text-sm font-medium" data-testid="member-badge">
            {me.data?.name ?? "…"}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              data-testid="theme-toggle-button"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="text-[#9BAE9F] hover:text-sidebar-foreground"
            >
              {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              data-testid="nav-logout-button"
              onClick={() => endSession()}
              className="text-[#9BAE9F] hover:text-[#E4854F]"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AppLayout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-svh">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <SidebarInner />
      </aside>

      {/* mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-sidebar px-4 py-3 text-sidebar-foreground lg:hidden">
        <ManshokWordmark compact />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={<Button variant="ghost" size="icon" data-testid="mobile-menu-button" className="text-sidebar-foreground" />}
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarInner onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </header>

      <main className="relative min-h-svh lg:pl-64">
        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
