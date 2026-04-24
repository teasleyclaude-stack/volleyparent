import { Link, useLocation } from "@tanstack/react-router";
import { Home, History, Users, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", label: "Home", icon: Home },
  { to: "/history", label: "History", icon: History },
  { to: "/roster", label: "Roster", icon: Users },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

export function BottomTabs() {
  const loc = useLocation();
  return (
    <nav
      className="sticky bottom-0 z-30 grid grid-cols-4 border-t border-border bg-popover/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      aria-label="Primary"
    >
      {tabs.map(({ to, label, icon: Icon }) => {
        const active = loc.pathname === to;
        return (
          <Link
            key={to}
            to={to}
            className={cn(
              "flex flex-col items-center justify-center gap-1 py-3 text-[11px] font-medium tracking-wide",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
            <span className="uppercase">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
