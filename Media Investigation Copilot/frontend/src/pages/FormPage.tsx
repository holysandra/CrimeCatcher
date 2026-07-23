import { useState, type FormEvent, type ReactNode } from "react";
import { CheckCircle2, FilePlus2 } from "lucide-react";

import { SiteNav } from "@/components/SiteNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { navigate } from "@/router";
import {
  DEMO_ASSIGNEES,
  addCase,
  type CasePriority,
  type CaseStatus,
  type EntityKind
} from "@/store/caseStore";

const ENTITY_TYPES: EntityKind[] = ["Entity", "Individual"];

const RISK_TYPOLOGIES = [
  "Money Laundering",
  "Sanctions Evasion",
  "Fraud",
  "Accounting Fraud",
  "Bribery & Corruption",
  "Terrorist Financing",
  "Tax Evasion",
  "Market Manipulation",
  "Cybercrime",
  "Other"
];

const todayISO = () => new Date().toISOString().slice(0, 10);

type FormState = {
  subjectName: string;
  geographicRegion: string;
  entityKind: EntityKind;
  reportDate: string;
  status: CaseStatus;
  priority: CasePriority;
  assignee: string;
  riskTypology: string;
  notes: string;
};

const EMPTY: FormState = {
  subjectName: "",
  geographicRegion: "",
  entityKind: "Entity",
  reportDate: todayISO(),
  status: "Queued",
  priority: "Medium",
  assignee: DEMO_ASSIGNEES[0],
  riskTypology: "Money Laundering",
  notes: ""
};

export default function FormPage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.subjectName.trim()) {
      setError("Person or entity name is required.");
      return;
    }
    addCase({
      subjectName: form.subjectName.trim(),
      geographicRegion: form.geographicRegion.trim(),
      entityKind: form.entityKind,
      reportDate: form.reportDate,
      status: form.status,
      priority: form.priority,
      assignee: form.assignee,
      riskTypology: form.riskTypology,
      riskScore: undefined,
      recommendation: undefined,
      notes: form.notes.trim()
    });
    navigate("/aiagent");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_34%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--secondary)))]">
      <SiteNav />

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="flex flex-col gap-2 rounded-xl border bg-card/90 p-5 shadow-terminal backdrop-blur">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-xl font-bold tracking-tight text-foreground md:text-2xl">
              New Financial Crime Investigation
            </h1>
            <Badge variant="secondary">Case Intake</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Fill in the entity and case details. On submit, the case is added to the AI Agent queue.
          </p>
        </section>

        <Card>
          <CardHeader className="border-b bg-secondary/50">
            <CardTitle>Investigation Details</CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            {error ? (
              <div className="mb-4 rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-700 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-200">
                {error}
              </div>
            ) : null}

            <form className="space-y-5" onSubmit={submit}>
              <Fieldset legend="Subject">
                <Field label="Person or entity name" required>
                  <Input
                    value={form.subjectName}
                    onChange={(event) => update("subjectName", event.target.value)}
                    placeholder="e.g. Northgate Trading Ltd or Jane Smith"
                  />
                </Field>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Geographic region">
                    <Input
                      value={form.geographicRegion}
                      onChange={(event) => update("geographicRegion", event.target.value)}
                      placeholder="e.g. Europe, Cyprus"
                    />
                  </Field>
                  <Field label="Subject type" required>
                    <Select value={form.entityKind} onChange={(value) => update("entityKind", value as EntityKind)}>
                      {ENTITY_TYPES.map((type) => (
                        <option key={type}>{type}</option>
                      ))}
                    </Select>
                  </Field>
                </div>
              </Fieldset>

              <Fieldset legend="Case">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Risk typology">
                    <Select value={form.riskTypology} onChange={(value) => update("riskTypology", value)}>
                      {RISK_TYPOLOGIES.map((type) => (
                        <option key={type}>{type}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Assigned investigator">
                    <Select value={form.assignee} onChange={(value) => update("assignee", value)}>
                      {DEMO_ASSIGNEES.map((name) => <option key={name}>{name}</option>)}
                    </Select>
                  </Field>
                  <Field label="Priority">
                    <Select value={form.priority} onChange={(value) => update("priority", value as CasePriority)}>
                      <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
                    </Select>
                  </Field>
                  <Field label="Report date">
                    <Input
                      type="date"
                      value={form.reportDate}
                      onChange={(event) => update("reportDate", event.target.value)}
                    />
                  </Field>
                  <Field label="Status">
                    <Select value={form.status} onChange={(value) => update("status", value as CaseStatus)}>
                      <option>Queued</option>
                      <option>In Review</option>
                      <option>Escalated</option>
                      <option>Closed</option>
                    </Select>
                  </Field>
                </div>
                <Field label="Notes">
                  <textarea
                    value={form.notes}
                    onChange={(event) => update("notes", event.target.value)}
                    placeholder="Context, sources, next steps..."
                    rows={4}
                    className="flex w-full rounded-md border bg-background px-4 py-2 text-sm shadow-inset-soft outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </Field>
              </Fieldset>

              <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={() => setForm(EMPTY)}>
                  Reset
                </Button>
                <Button type="submit">
                  <FilePlus2 className="h-4 w-4" />
                  Submit &amp; Add to Queue
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="flex items-center gap-2 rounded-lg border bg-card p-3 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          Submitted cases appear instantly on the AI Agent page and persist in your browser.
        </div>
      </div>
    </main>
  );
}

function Fieldset({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {legend}
      </legend>
      {children}
    </fieldset>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </span>
      {children}
    </label>
  );
}

function Select({
  value,
  onChange,
  children,
  className
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        "flex h-11 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-inset-soft outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      {children}
    </select>
  );
}
