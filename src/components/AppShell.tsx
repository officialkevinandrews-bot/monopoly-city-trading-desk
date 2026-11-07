import { Link } from "@tanstack/react-router";
import { Cpu, Calculator, Trophy, BookOpen } from "lucide-react";
import type { ReactNode } from "react";

const tabs = [
  { to: "/", label: "Trading Unit", icon: Cpu },
  { to: "/rent", label: "Rent Calculator", icon: Calculator },
  { to: "/scoreboard", label: "Scoreboard", icon: Trophy },
  { to: "/rules", label: "Rules / Referee", icon: BookOpen },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="font-display text-lg tracking-widest">
            <span className="text-primary led-text">MONOPOLY</span> <span className="text-muted-foreground">CITY</span>
          </div>
          <nav className="hidden gap-1 md:flex">
            {tabs.map((t) => (
              <Link key={t.to} to={t.to} activeOptions={{ exact: true }}
                className="rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "bg-secondary text-primary" }}>
                {t.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-border bg-card md:hidden">
        {tabs.map((t) => (
          <Link key={t.to} to={t.to} activeOptions={{ exact: true }}
            className="flex flex-col items-center gap-1 py-2 text-[11px] font-semibold text-muted-foreground"
            activeProps={{ className: "text-primary" }}>
            <t.icon className="h-5 w-5" />
            {t.label.split(" ")[0]}
          </Link>
        ))}
      </nav>
    </div>
  );
}
