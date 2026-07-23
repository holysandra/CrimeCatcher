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
import { DbBrand } from "@/components/DbBrand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { isRujaDemoQuery, RUJA_DEMO_REPORT } from "@/data/rujaDemoReport";
import { cn } from "@/lib/utils";
import { Link } from "@/router";
import type { EntityKind } from "@/store/caseStore";
import type { AgentReport } from "@/types/agentReport";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
const RUJA_DEMO_DELAY_MS = 8000;

type LoadedReport = AgentReport & { mode: "local" | "demo" };

type WorkflowError = {
  code: string;
  title: string;
  message: string;
  hint?: string;
};

class WorkflowRequestError extends Error {
  detail: WorkflowError;

  constructor(detail: WorkflowError) {
    super(detail.message);
    this.detail = detail;
  }
}

const STATUS_MESSAGES = [
  "Starting live public-source investigation...",
  "Retrieving current public sources...",
  "Resolving entity identity and geography...",
  "Classifying adverse-media findings...",
  "Applying deterministic risk scoring...",
  "Formatting the investigation report..."
];

export default function App() {
  const [query, setQuery] = useState("Binance");
  const [entityKind, setEntityKind] = useState<EntityKind>("Entity");
  const [geographicRegion, setGeographicRegion] = useState("");
  const [report, setReport] = useState<LoadedReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);
  const [error, setError] = useState<WorkflowError | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (!loading) return;
    const interval = window.setInterval(() => {
      setStatusIndex((current) => Math.min(current + 1, STATUS_MESSAGES.length - 1));
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
      setError({
        code: "INPUT_REQUIRED",
        title: "Enter a subject",
        message: "Enter a company or person to investigate."
      });
      return;
    }

    setLoading(true);
    setReport(null);
    setError(null);
    setStatusIndex(0);

    try {
      if (isRujaDemoQuery(trimmed)) {
        setEntityKind("Individual");
        setGeographicRegion("Bulgaria / Europe");
        await new Promise((resolve) => window.setTimeout(resolve, RUJA_DEMO_DELAY_MS));
        setReport(RUJA_DEMO_REPORT);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/agents/investigate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: trimmed })
      });

      if (!response.ok) {
        const problem = await response.json().catch(() => null);
        const detail = problem?.detail;
        if (detail && typeof detail === "object") {
          throw new WorkflowRequestError({
            code: detail.code ?? "WORKFLOW_REQUEST_FAILED",
            title: detail.title ?? "Investigation failed",
            message: detail.message ?? `The backend returned status ${response.status}.`,
            hint: detail.hint
          });
        }
        throw new WorkflowRequestError({
          code: "BACKEND_UNAVAILABLE",
          title: "Investigation service unavailable",
          message: typeof detail === "string" ? detail : `The backend returned status ${response.status}.`,
          hint: "Check that the backend is running and can reach public sources."
        });
      }

      const data = (await response.json()) as LoadedReport;
      setReport(data);
    } catch (caught) {
      setReport(null);
      setError(
        caught instanceof WorkflowRequestError
          ? caught.detail
          : {
              code: "BACKEND_UNAVAILABLE",
              title: "Cannot reach the investigation service",
              message: caught instanceof Error ? caught.message : "The investigation request failed.",
              hint: "Check that the backend is running and try again."
            }
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(0,24,168,0.10),transparent_34%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--secondary)))]">
      <NavBar
        hasReport={Boolean(report)}
        darkMode={darkMode}
        toggleDarkMode={() => setDarkMode((value) => !value)}
        onPrint={() => window.print()}
      />

      <div
        className={cn(
          "mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-6 sm:px-6 lg:px-8",
          report ? "pb-24 sm:pb-28" : "pb-8"
        )}
      >
        <section className="flex flex-col gap-2 rounded-xl border bg-card/90 p-5 shadow-terminal backdrop-blur">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-xl font-bold tracking-tight text-foreground md:text-2xl">
              dbCrimeCatcher
            </h1>
            <Badge variant="secondary">AFC / Fraud MVP</Badge>
            {report ? <ModeBadge report={report} /> : null}
          </div>
          <p className="text-sm text-muted-foreground">
            Human-in-the-loop adverse media investigation using live public sources and transparent deterministic scoring.
          </p>
        </section>

        <ResponsibleAiNotice />

        <section id="search" className="scroll-mt-28">
          <SearchPanel
            query={query}
            setQuery={setQuery}
            entityKind={entityKind}
            setEntityKind={setEntityKind}
            geographicRegion={geographicRegion}
            setGeographicRegion={setGeographicRegion}
            loading={loading}
            investigate={investigate}
          />
        </section>

        {error ? <WorkflowErrorPanel error={error} retry={() => investigate()} /> : null}

        <LoadingPanel loading={loading} status={STATUS_MESSAGES[statusIndex]} progress={progress} />

        {report ? (
          <AgentDashboard report={report} entityKind={entityKind} geographicRegion={geographicRegion} />
        ) : loading ? null : (
          <EmptyState />
        )}
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
        <DbBrand compact />

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
  entityKind,
  setEntityKind,
  geographicRegion,
  setGeographicRegion,
  loading,
  investigate
}: {
  query: string;
  setQuery: (value: string) => void;
  entityKind: EntityKind;
  setEntityKind: (value: EntityKind) => void;
  geographicRegion: string;
  setGeographicRegion: (value: string) => void;
  loading: boolean;
  investigate: (event?: FormEvent) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-secondary/50">
        <CardTitle>Investigation Search Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        <form className="grid gap-3 lg:grid-cols-[190px_minmax(0,1fr)_minmax(0,1fr)_auto]" onSubmit={investigate}>
          <label className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Subject type <span className="text-destructive">*</span>
            </span>
            <select
              aria-label="Subject type"
              required
              value={entityKind}
              onChange={(event) => setEntityKind(event.target.value as EntityKind)}
              disabled={loading}
              className="h-11 w-full rounded-md border bg-background px-3 text-sm font-semibold shadow-inset-soft outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="Entity">Entity</option>
              <option value="Individual">Individual</option>
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Name</span>
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
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Geographic region <span className="font-normal normal-case">(optional)</span>
            </span>
            <div className="relative">
              <MapPinned className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={geographicRegion}
                onChange={(event) => setGeographicRegion(event.target.value)}
                placeholder="e.g. Europe, Germany"
                className="pl-10"
                disabled={loading}
              />
            </div>
          </label>
          <Button className="h-11 self-end" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
            Run Live Investigation
          </Button>
        </form>
        <p className="text-xs leading-5 text-muted-foreground">
          Subject type and geographic region are review metadata only and are not sent to the investigation service. The
          name is used to retrieve public sources and populate the dashboard below.
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

function WorkflowErrorPanel({ error, retry }: { error: WorkflowError; retry: () => void }) {
  return (
    <section
      role="alert"
      className="overflow-hidden rounded-xl border-2 border-red-600 bg-red-50 shadow-lg dark:border-red-500 dark:bg-red-950"
    >
      <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-start">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-red-600 text-white">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-red-700 dark:text-red-300">
            Live investigation failed
          </p>
          <h2 className="mt-1 font-display text-2xl font-black text-red-950 dark:text-red-50">{error.title}</h2>
          <p className="mt-2 text-base leading-7 text-red-900 dark:text-red-100">{error.message}</p>
          {error.hint ? (
            <div className="mt-4 rounded-lg border border-red-300 bg-white/70 p-3 text-sm leading-6 text-red-900 dark:border-red-800 dark:bg-black/20 dark:text-red-100">
              <strong>How to fix it:</strong> {error.hint}
            </div>
          ) : null}
          <p className="mt-3 font-mono text-xs font-semibold text-red-700 dark:text-red-300">Error code: {error.code}</p>
        </div>
        <Button type="button" variant="outline" onClick={retry} className="border-red-400 text-red-800 dark:text-red-100">
          Retry investigation
        </Button>
      </div>
    </section>
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
        <h2 className="mt-4 font-display text-xl font-bold">Ready to run a live investigation</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Choose Individual or Entity, enter a name, and press Run Live Investigation. The service will retrieve public sources, build the
          profile, classify matters and typologies, score risk, and populate this dashboard.
        </p>
      </div>
    </section>
  );
}
