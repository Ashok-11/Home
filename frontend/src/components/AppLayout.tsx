import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  CalendarDays,
  CheckSquare,
  ChefHat,
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
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const NAV = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard, testid: "nav-dashboard" },
  { name: "Daily Expenses", path: "/expenses", icon: Receipt, testid: "nav-expenses" },
  { name: "Budget & Income", path: "/budget", icon: WalletCards, testid: "nav-budget" },
  { name: "Menu Planner", path: "/menu", icon: CalendarDays, testid: "nav-menu" },
  { name: "Recipe Vault", path: "/recipes", icon: UtensilsCrossed, testid: "nav-recipes" },
  { name: "Grocery List", path: "/grocery", icon: ShoppingCart, testid: "nav-grocery" },
  { name: "Chores Tracker", path: "/chores", icon: CheckSquare, testid: "nav-chores" },
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
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-[inset_3px_0_0_#C85A32]"
                : "text-[#9CB5A2] hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
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
    <div className="flex h-full flex-col justify-between bg-sidebar p-5 text-sidebar-foreground">
      <div>
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#C85A32] text-white shadow-lg">
            <ChefHat className="h-5 w-5" />
          </div>
          <div>
            <p className="font-heading text-lg font-bold leading-tight">HomeBoard</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#9CB5A2]">Warm Home Kitchen</p>
          </div>
        </div>
        <NavLinks onNavigate={onNavigate} />
      </div>
      <div className="flex flex-col gap-3">
        <a
          href="/cook"
          data-testid="nav-cook-link"
          className="flex items-center justify-center gap-2 rounded-full bg-[#C85A32] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#B24C26]"
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
              className="text-[#9CB5A2] hover:text-sidebar-foreground"
            >
              {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              data-testid="nav-logout-button"
              onClick={() => endSession()}
              className="text-[#9CB5A2] hover:text-[#E87C52]"
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
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#C85A32]">
            <ChefHat className="h-4 w-4 text-white" />
          </div>
          <span className="font-heading text-base font-bold">HomeBoard</span>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button variant="ghost" size="icon" data-testid="mobile-menu-button" className="text-sidebar-foreground" />}>
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
