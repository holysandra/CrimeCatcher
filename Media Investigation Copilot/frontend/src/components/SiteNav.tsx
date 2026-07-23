import { FilePlus2, ShieldAlert, TableProperties } from "lucide-react";

import { Link, usePath } from "@/router";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/aiagent", label: "AI Agent", icon: TableProperties },
  { to: "/form", label: "New Investigation", icon: FilePlus2 }
];

export function SiteNav() {
  const path = usePath();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <ShieldAlert className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="hidden sm:block">
            <p className="font-display text-sm font-bold leading-tight text-foreground">Adverse Media Copilot</p>
            <p className="text-[11px] font-medium leading-tight text-muted-foreground">AFC / Fraud MVP</p>
          </div>
        </Link>

        <nav className="flex flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = path === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 font-display text-sm font-semibold transition-colors",
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
