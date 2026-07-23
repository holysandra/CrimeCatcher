import { useMemo, useState } from "react";
import { CheckCircle2, FilePlus2, Loader2, TableProperties, Trash2 } from "lucide-react";

import { SiteNav } from "@/components/SiteNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/router";
import { removeCase, toggleStatus, useCases } from "@/store/caseStore";

type StatusFilter = "All" | "Complete" | "In Progress";

function formatDate(value: string) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function AiAgentPage() {
  const cases = useCases();
  const [filter, setFilter] = useState<StatusFilter>("All");

  const rows = useMemo(() => {
    const list = filter === "All" ? cases : cases.filter((item) => item.status === filter);
    return [...list].sort((a, b) => a.caseNumber - b.caseNumber);
  }, [cases, filter]);

  const complete = cases.filter((item) => item.status === "Complete").length;
  const inProgress = cases.length - complete;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_34%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--secondary)))]">
      <SiteNav />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card/90 p-5 shadow-terminal backdrop-blur">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-bold tracking-tight text-foreground md:text-2xl">
                AI Agent — Investigation Queue
              </h1>
              <Badge variant="secondary">{cases.length} case(s)</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Every investigation submitted from the form lands here. Toggle a case between In Progress and Complete.
            </p>
          </div>
          <Link to="/form">
            <Button>
              <FilePlus2 className="h-4 w-4" />
              New Investigation
            </Button>
          </Link>
        </section>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Total Cases" value={`${cases.length}`} />
          <StatCard label="In Progress" value={`${inProgress}`} />
          <StatCard label="Complete" value={`${complete}`} />
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 border-b bg-secondary/50">
            <CardTitle>Case Data Table</CardTitle>
            <div className="flex gap-2">
              {(["All", "In Progress", "Complete"] as StatusFilter[]).map((option) => (
                <Button
                  key={option}
                  variant={filter === option ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(option)}
                >
                  {option}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            {rows.length === 0 ? (
              <div className="grid place-items-center rounded-lg border border-dashed bg-background p-10 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-primary/10 text-primary">
                  <TableProperties className="h-6 w-6" />
                </div>
                <p className="mt-3 font-display font-semibold">No cases yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Submit an investigation from the form to populate this table.
                </p>
                <Link to="/form" className="mt-4 inline-block">
                  <Button size="sm">
                    <FilePlus2 className="h-4 w-4" />
                    Open Form
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="bg-secondary/70 font-display text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="p-3">Number</th>
                      <th className="p-3">Task</th>
                      <th className="p-3">Company</th>
                      <th className="p-3">Report Date</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((item) => (
                      <tr key={item.caseNumber} className="border-t align-top">
                        <td className="p-3 font-mono font-bold tabular-nums text-primary">#{item.caseNumber}</td>
                        <td className="p-3">
                          <p className="font-medium">{item.task}</p>
                          {item.riskTypology ? (
                            <p className="mt-0.5 text-xs text-muted-foreground">{item.riskTypology}</p>
                          ) : null}
                        </td>
                        <td className="p-3">
                          <p className="font-medium">{item.company || "—"}</p>
                          {item.headquarters ? (
                            <p className="mt-0.5 text-xs text-muted-foreground">{item.headquarters}</p>
                          ) : null}
                        </td>
                        <td className="p-3 whitespace-nowrap tabular-nums">{formatDate(item.reportDate)}</td>
                        <td className="p-3">
                          <Badge variant={item.status === "Complete" ? "green" : "orange"}>
                            {item.status === "Complete" ? (
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                            ) : (
                              <Loader2 className="mr-1 h-3 w-3" />
                            )}
                            {item.status}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => toggleStatus(item.caseNumber)}>
                              {item.status === "Complete" ? "Reopen" : "Mark Complete"}
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              title="Delete case"
                              onClick={() => removeCase(item.caseNumber)}
                            >
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-2 font-display text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
