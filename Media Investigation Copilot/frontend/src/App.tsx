import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  AlertTriangle,
  Bot,
  Building2,
  Download,
  FileText,
  Loader2,
  MapPinned,
  Moon,
  Newspaper,
  Search,
  ShieldAlert,
  Sun,
  TableProperties,
  Timer
} from "lucide-react";

import { AgentDashboard, ModeBadge } from "@/components/AgentDashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Link } from "@/router";
import type { AgentReport } from "@/types/agentReport";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

type LoadedReport = AgentReport & { mode?: string };

const STATUS_MESSAGES = [
  "Dispatching Azure agent workflow...",
  "Agent 1 — resolving identity and entity profile...",
  "Agent 2 — retrieving official sources and geography...",
  "Agent 3 — analysing matters, typologies, and stages...",
  "Agent 4 — scoring risk and running QA guardrails...",
  "Formatting agent report..."
];

export default function App() {
  const [query, setQuery] = useState("Binance");
  const [report, setReport] = useState<LoadedReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (!loading) return;
    const interval = window.setInterval(() => {
      setStatusIndex((current) => (current + 1) % STATUS_MESSAGES.length);
    }, 1200);
    return () => window.clearInterval(interval);
  }, [loading]);

  const progress = useMemo(() => {
    if (!loading) return report ? 100 : 0;
    return Math.min(96, ((statusIndex + 1) / STATUS_MESSAGES.length) * 100);
  }, [loading, report, statusIndex]);

  async function investigate(event?: FormEvent) {
    event?.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setError("Enter a company or person to investigate.");
      return;
    }

    setLoading(true);
    setError(null);
    setStatusIndex(0);

    try {
      const response = await fetch(`${API_BASE_URL}/agents/investigate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: trimmed })
      });

      if (!response.ok) {
        const problem = await response.json().catch(() => null);
        throw new Error(problem?.detail ?? `Backend unavailable: ${response.status}`);
      }

      const data = (await response.json()) as LoadedReport;
      setReport(data);
    } catch (caught) {
      setReport(null);
      setError(
        caught instanceof Error
          ? caught.message
          : "Agent workflow failed. Check that the backend is running and Azure is configured."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_34%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--secondary)))]">
      <NavBar
        hasReport={Boolean(report)}
        darkMode={darkMode}
        toggleDarkMode={() => setDarkMode((value) => !value)}
        onPrint={() => window.print()}
      />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="flex flex-col gap-2 rounded-xl border bg-card/90 p-5 shadow-terminal backdrop-blur">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-xl font-bold tracking-tight text-foreground md:text-2xl">
              AI Adverse Media Investigation Copilot
            </h1>
            <Badge variant="secondary">AFC / Fraud MVP</Badge>
            {report ? <ModeBadge report={report} /> : null}
          </div>
          <p className="text-sm text-muted-foreground">
            Human-in-the-loop adverse media investigation, powered by a 4-agent Microsoft Azure workflow.
          </p>
        </section>

        <ResponsibleAiNotice />

        <section id="search" className="scroll-mt-28">
          <SearchPanel query={query} setQuery={setQuery} loading={loading} investigate={investigate} />
        </section>

        {error ? (
          <div className="rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-700 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-200">
            {error}
          </div>
        ) : null}

        <LoadingPanel loading={loading} status={STATUS_MESSAGES[statusIndex]} progress={progress} />

        {report ? <AgentDashboard report={report} /> : loading ? null : <EmptyState />}
      </div>
    </main>
  );
}

type NavItem = { id: string; label: string; icon: (props: { className?: string }) => ReactNode };

const BASE_NAV_ITEMS: NavItem[] = [{ id: "search", label: "Search", icon: Search }];

const REPORT_NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Overview", icon: ShieldAlert },
  { id: "summary", label: "Summary", icon: FileText },
  { id: "profile", label: "Profile", icon: Building2 },
  { id: "matters", label: "Matters", icon: AlertTriangle },
  { id: "risk-score", label: "Risk Score", icon: TableProperties },
  { id: "timeline", label: "Timeline", icon: Timer },
  { id: "sources", label: "Sources", icon: Newspaper },
  { id: "map", label: "Geography", icon: MapPinned }
];

function NavBar({
  hasReport,
  darkMode,
  toggleDarkMode,
  onPrint
}: {
  hasReport: boolean;
  darkMode: boolean;
  toggleDarkMode: () => void;
  onPrint: () => void;
}) {
  const navItems = hasReport ? [...BASE_NAV_ITEMS, ...REPORT_NAV_ITEMS] : BASE_NAV_ITEMS;
  const [activeId, setActiveId] = useState("search");

  useEffect(() => {
    const sections = navItems
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => Boolean(element));
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-112px 0px -65% 0px", threshold: [0, 1] }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasReport]);

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
        <div className="flex shrink-0 items-center gap-2.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <ShieldAlert className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="hidden sm:block">
            <p className="font-display text-sm font-bold leading-tight text-foreground">Adverse Media Copilot</p>
            <p className="text-[11px] font-medium leading-tight text-muted-foreground">AFC / Fraud MVP</p>
          </div>
        </div>

        <nav className="flex flex-1 items-center gap-1 overflow-x-auto no-print [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSection(item.id)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 font-display text-sm font-semibold transition-colors",
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2 no-print">
          <Link
            to="/aiagent"
            className="hidden items-center gap-1.5 rounded-md px-2.5 py-1.5 font-display text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:flex"
          >
            <TableProperties className="h-3.5 w-3.5" />
            Queue
          </Link>
          <Button variant="outline" size="icon" onClick={toggleDarkMode} title="Toggle dark mode">
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="outline" onClick={onPrint} disabled={!hasReport}>
            <Download className="h-4 w-4" />
            <span className="hidden md:inline">PDF</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

function SearchPanel({
  query,
  setQuery,
  loading,
  investigate
}: {
  query: string;
  setQuery: (value: string) => void;
  loading: boolean;
  investigate: (event?: FormEvent) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-secondary/50">
        <CardTitle>Investigation Search Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]" onSubmit={investigate}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="search-query-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search Company or Person..."
              className="pl-10"
              disabled={loading}
            />
          </div>
          <Button className="h-11" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
            Run Live Investigation
          </Button>
        </form>
        <p className="text-xs leading-5 text-muted-foreground">
          Pressing run triggers the 4-agent Azure AI Foundry workflow. It returns a structured JSON report that populates
          the dashboard below. Until Azure credentials are set in the backend, a bundled sample report is used.
        </p>
      </CardContent>
    </Card>
  );
}

function ResponsibleAiNotice() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="rounded-lg border bg-card p-3 text-sm text-muted-foreground">
        <strong className="font-display text-foreground">Human-in-the-loop:</strong> This tool supports analyst review and
        does not make final compliance decisions.
      </div>
      <div className="rounded-lg border bg-card p-3 text-sm text-muted-foreground">
        <strong className="font-display text-foreground">Evidence-based:</strong> Risk ratings are generated by the agents
        from cited sources and should be validated by a human investigator.
      </div>
    </div>
  );
}

function LoadingPanel({ loading, status, progress }: { loading: boolean; status: string; progress: number }) {
  if (!loading) return null;
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-sm font-semibold">{status}</p>
            <span className="text-xs font-semibold text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress className="mt-2" value={progress} />
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <section className="grid min-h-[340px] place-items-center rounded-lg border border-dashed bg-card p-8 text-center">
      <div className="max-w-lg">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg bg-primary/10 text-primary">
          <Bot className="h-7 w-7" />
        </div>
        <h2 className="mt-4 font-display text-xl font-bold">Ready to run the agent workflow</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Enter a company or person and press Run Live Investigation. The 4-agent Azure workflow will build the profile,
          retrieve sources, classify matters and typologies, score risk, and return a report to populate this dashboard.
        </p>
      </div>
    </section>
  );
}
