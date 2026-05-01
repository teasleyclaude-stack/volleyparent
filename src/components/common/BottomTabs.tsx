import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    try {
      const seen = window.localStorage.getItem("courtsideview_practice_seen");
      setShowNew(seen !== "completed");
    } catch {
      /* noop */
    }
  }, [loc.pathname]);

  return (
    <nav
      className="sticky bottom-0 z-30 grid grid-cols-4 border-t border-border bg-popover/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      aria-label="Primary"
    >
      {tabs.map(({ to, label, icon: Icon }) => {
        const active = loc.pathname === to;
        const isSettings = to === "/settings";
        return (
          <Link
            key={to}
            to={to}
            className={cn(
              "relative flex flex-col items-center justify-center gap-1 py-3 text-[11px] font-medium tracking-wide",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
            <span className="uppercase">{label}</span>
            {isSettings && showNew && (
              <span
                className="absolute right-3 top-2 rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest"
                style={{ backgroundColor: "#39FF14", color: "#0A0E1A" }}
              >
                New
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
