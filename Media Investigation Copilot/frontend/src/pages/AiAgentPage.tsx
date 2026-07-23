import { useMemo, useState, type ReactNode } from "react";
import {
  Archive,
  FilePlus2,
  Filter,
  Search,
  SearchCheck,
  Siren,
  TableProperties,
  Trash2,
  UserRound
} from "lucide-react";

import { SiteNav } from "@/components/SiteNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Link } from "@/router";
import {
  DEMO_ASSIGNEES,
  removeCase,
  updateCaseRecommendation,
  useCases,
  type CasePriority,
  type CaseRecommendation,
  type CaseStatus,
  type EntityKind,
  type InvestigationCase
} from "@/store/caseStore";

type All<T extends string> = "All" | T;

function formatDate(value: string) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function statusVariant(status: CaseStatus): "green" | "orange" | "red" | "secondary" {
  if (status === "Closed") return "green";
  if (status === "Escalated") return "red";
  if (status === "In Review") return "orange";
  return "secondary";
}

function priorityVariant(priority: CasePriority): "green" | "orange" | "red" | "secondary" {
  if (priority === "Critical") return "red";
  if (priority === "High") return "orange";
  if (priority === "Low") return "green";
  return "secondary";
}

export default function AiAgentPage() {
  const cases = useCases();
  const [status, setStatus] = useState<All<CaseStatus>>("All");
  const [priority, setPriority] = useState<All<CasePriority>>("All");
  const [assignee, setAssignee] = useState("All");
  const [entityKind, setEntityKind] = useState<All<EntityKind>>("All");
  const [search, setSearch] = useState("");
  const [selectedCaseNumber, setSelectedCaseNumber] = useState<number | null>(null);

  const rows = useMemo(
    () =>
      [...cases]
        .filter((item) => status === "All" || item.status === status)
        .filter((item) => priority === "All" || item.priority === priority)
        .filter((item) => assignee === "All" || item.assignee === assignee)
        .filter((item) => entityKind === "All" || item.entityKind === entityKind)
        .filter((item) => item.subjectName.toLowerCase().includes(search.trim().toLowerCase()))
        .sort((a, b) => b.caseNumber - a.caseNumber),
    [assignee, cases, entityKind, priority, search, status]
  );

  const selected = cases.find((item) => item.caseNumber === selectedCaseNumber) ?? null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(0,24,168,0.10),transparent_34%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--secondary)))]">
      <SiteNav />

      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card/95 p-5 shadow-terminal backdrop-blur">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-extrabold tracking-tight text-foreground md:text-2xl">
                dbCrimeCatcher Investigation Queue
              </h1>
              <Badge variant="secondary">{cases.length} demo cases</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Prioritise people and companies, assign Deutsche Bank demo analysts, and record the final review disposition.
            </p>
          </div>
          <Link to="/form">
            <Button>
              <FilePlus2 className="h-4 w-4" />
              New Investigation
            </Button>
          </Link>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Cases" value={`${cases.length}`} tone="blue" />
          <StatCard label="In Review" value={`${cases.filter((item) => item.status === "In Review").length}`} tone="amber" />
          <StatCard label="Escalated" value={`${cases.filter((item) => item.status === "Escalated").length}`} tone="red" />
          <StatCard label="Closed" value={`${cases.filter((item) => item.status === "Closed").length}`} tone="green" />
        </div>

        {selected ? (
          <CaseReview caseItem={selected} close={() => setSelectedCaseNumber(null)} />
        ) : null}

        <Card className="overflow-hidden">
          <CardHeader className="space-y-4 border-b bg-secondary/50">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>Investigation Queue</CardTitle>
              <span className="text-sm font-semibold text-muted-foreground">{rows.length} visible</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_repeat(4,minmax(145px,1fr))]">
              <label className="space-y-1.5">
                <span className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">Name search</span>
                <span className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="People or companies" className="pl-9" />
                </span>
              </label>
              <QueueSelect label="Status" value={status} onChange={(value) => setStatus(value as All<CaseStatus>)}>
                <option>All</option><option>Queued</option><option>In Review</option><option>Escalated</option><option>Closed</option>
              </QueueSelect>
              <QueueSelect label="Priority" value={priority} onChange={(value) => setPriority(value as All<CasePriority>)}>
                <option>All</option><option>Critical</option><option>High</option><option>Medium</option><option>Low</option>
              </QueueSelect>
              <QueueSelect label="Assignee" value={assignee} onChange={setAssignee}>
                <option>All</option>
                {DEMO_ASSIGNEES.map((name) => <option key={name}>{name}</option>)}
              </QueueSelect>
              <QueueSelect label="Subject" value={entityKind} onChange={(value) => setEntityKind(value as All<EntityKind>)}>
                <option>All</option><option>Individual</option><option>Entity</option>
              </QueueSelect>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            {rows.length === 0 ? (
              <div className="grid place-items-center rounded-lg border border-dashed bg-background p-10 text-center">
                <Filter className="h-7 w-7 text-primary" />
                <p className="mt-3 font-display font-semibold">No cases match these filters</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    setStatus("All"); setPriority("All"); setAssignee("All"); setEntityKind("All"); setSearch("");
                  }}
                >
                  Clear filters
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[1160px] text-left text-sm">
                  <thead className="bg-secondary/70 font-display text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="p-3">Case</th>
                      <th className="p-3">Subject</th>
                      <th className="p-3">Region</th>
                      <th className="p-3">Risk</th>
                      <th className="p-3">Assignee</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Recommendation</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((item) => (
                      <tr key={item.caseNumber} className="border-t align-top transition-colors hover:bg-primary/[0.025]">
                        <td className="p-3">
                          <p className="font-mono font-bold tabular-nums text-primary">#{item.caseNumber}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{formatDate(item.reportDate)}</p>
                        </td>
                        <td className="p-3">
                          <p className="font-bold">{item.subjectName}</p>
                          <Badge variant="outline" className="mt-1">{item.entityKind}</Badge>
                        </td>
                        <td className="p-3 text-muted-foreground">{item.geographicRegion || "Global"}</td>
                        <td className="p-3">
                          <Badge variant={priorityVariant(item.priority)}>{item.priority}</Badge>
                          <p className="mt-1 text-xs text-muted-foreground">{item.riskScore ?? "—"}/100 · {item.riskTypology}</p>
                        </td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            <UserRound className="h-3.5 w-3.5 text-primary" />{item.assignee}
                          </span>
                        </td>
                        <td className="p-3"><Badge variant={statusVariant(item.status)}>{item.status}</Badge></td>
                        <td className="max-w-[220px] p-3 text-xs leading-5 text-muted-foreground">
                          {item.recommendation ?? "Awaiting analyst decision"}
                        </td>
                        <td className="p-3">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => setSelectedCaseNumber(item.caseNumber)}>
                              Review
                            </Button>
                            <Button variant="outline" size="icon" title="Delete case" onClick={() => removeCase(item.caseNumber)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function CaseReview({ caseItem, close }: { caseItem: InvestigationCase; close: () => void }) {
  const recommendations: { value: CaseRecommendation; label: string; icon: ReactNode; style: string }[] = [
    { value: "Recommend for closure with minimum risk", label: "Recommend closure with minimum risk", icon: <Archive className="h-4 w-4" />, style: "border-emerald-300 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950" },
    { value: "Recommend for investigator review", label: "Recommend investigator review", icon: <SearchCheck className="h-4 w-4" />, style: "border-amber-300 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-950" },
    { value: "Recommend for escalation", label: "Recommend escalation", icon: <Siren className="h-4 w-4" />, style: "border-red-300 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950" }
  ];
  return (
    <Card className="border-primary/30">
      <CardHeader className="flex-row items-start justify-between gap-3 border-b bg-primary/[0.06]">
        <div>
          <CardTitle>AI Agent Review · {caseItem.subjectName}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {caseItem.entityKind} · {caseItem.geographicRegion} · {caseItem.assignee} · {caseItem.priority} priority
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={close}>Close</Button>
      </CardHeader>
      <CardContent className="pt-5">
        <div className="grid gap-3 md:grid-cols-3">
          {recommendations.map((item) => (
            <button
              type="button"
              key={item.value}
              onClick={() => updateCaseRecommendation(caseItem.caseNumber, item.value)}
              className={cn(
                "flex min-h-20 items-center gap-3 rounded-xl border bg-background p-4 text-left text-sm font-bold transition-colors",
                item.style,
                caseItem.recommendation === item.value && "ring-2 ring-primary ring-offset-2"
              )}
            >
              {item.icon}{item.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Choosing an outcome automatically moves this case to Closed, In Review, or Escalated.
        </p>
      </CardContent>
    </Card>
  );
}

function QueueSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-md border bg-background px-3 text-sm font-medium shadow-inset-soft outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {children}
      </select>
    </label>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: "blue" | "amber" | "red" | "green" }) {
  const toneClass = { blue: "text-primary", amber: "text-amber-700 dark:text-amber-300", red: "text-red-700 dark:text-red-300", green: "text-emerald-700 dark:text-emerald-300" }[tone];
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="font-display text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={cn("mt-2 font-display text-3xl font-extrabold", toneClass)}>{value}</p>
      </CardContent>
    </Card>
  );
}
