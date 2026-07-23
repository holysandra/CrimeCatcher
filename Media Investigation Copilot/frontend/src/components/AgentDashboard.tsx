import { useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Archive,
  Bot,
  Building2,
  CheckCircle2,
  ClipboardCopy,
  Flag,
  Landmark,
  MapPinned,
  SearchCheck,
  ShieldAlert,
  Siren,
  TriangleAlert,
  UserCheck,
  UserRound
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Link } from "@/router";
import {
  upsertReviewedCase,
  type CasePriority,
  type CaseRecommendation,
  type EntityKind
} from "@/store/caseStore";
import type { AgentReport, Matter, SubjectReport } from "@/types/agentReport";
import {
  aggregateTypologies,
  collectSources,
  confidencePercent,
  flagCounts,
  flattenTimeline,
  formatDate,
  getSubject,
  riskVariant,
  stageVariant
} from "@/lib/agentReportAdapter";

/**
 * Renders a full adverse-media dashboard from a structured investigation report.
 * Mirrors the layout of the original deterministic dashboard so the two are
 * directly comparable.
 */
export function AgentDashboard({
  report,
  entityKind = "Entity",
  geographicRegion = ""
}: {
  report: AgentReport;
  entityKind?: EntityKind;
  geographicRegion?: string;
}) {
  const subject = getSubject(report);
  const [copied, setCopied] = useState<string | null>(null);
  const [savedRecommendation, setSavedRecommendation] = useState<CaseRecommendation | null>(null);

  async function copyText(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      /* clipboard unavailable */
    }
  }

  if (!subject) {
    return (
      <section className="grid min-h-[240px] place-items-center rounded-lg border border-dashed bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">The agent workflow returned no subject report.</p>
      </section>
    );
  }

  return (
    <section className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div id="overview" className="scroll-mt-28">
        <SummaryDashboard subject={subject} qaStatus={report.qa_status} entityKind={entityKind} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="space-y-6">
          <div id="summary" className="scroll-mt-28">
            <ExecutiveSummary
              subject={subject}
              report={report}
              entityKind={entityKind}
              copyText={copyText}
              copied={copied}
            />
          </div>
          <FinalConclusionPanel subject={subject} copyText={copyText} copied={copied} />
          <div id="profile" className="scroll-mt-28">
            <EntityProfilePanel entityKind={entityKind} />
          </div>
          <div id="matters" className="scroll-mt-28">
            <MattersPanel matters={subject.matters} />
          </div>
          <div id="risk-score" className="scroll-mt-28">
            <RiskScoreBreakdownPanel subject={subject} />
          </div>
          <TypologyPanel matters={subject.matters} />
          <div id="timeline" className="scroll-mt-28">
            <TimelinePanel matters={subject.matters} />
          </div>
          <div id="sources" className="scroll-mt-28">
            <SourcesPanel subject={subject} />
          </div>
        </div>

        <aside className="space-y-6">
          <div id="map" className="scroll-mt-28">
            <GeographyPanel subject={subject} />
          </div>
          <QaGuardrailPanel report={report} />
          <HumanReviewPanel subject={subject} />
          <LimitationsPanel subject={subject} />
          <ExcludedMattersPanel subject={subject} />
        </aside>
      </div>
      <ReviewRecommendationPanel
        subject={subject}
        entityKind={entityKind}
        geographicRegion={geographicRegion}
        savedRecommendation={savedRecommendation}
        onRecommend={(recommendation) => {
          const level = subject.subject_risk_assessment.risk_level.toLowerCase();
          const priority: CasePriority =
            level.includes("critical") ? "Critical" : level.includes("high") ? "High" : level.includes("medium") ? "Medium" : "Low";
          upsertReviewedCase({
            subjectName: subject.matched_name,
            entityKind,
            geographicRegion: geographicRegion || subject.focal_geography.jurisdiction || "Global",
            priority,
            riskTypology: aggregateTypologies(subject.matters)
              .map((typology) => typology.name)
              .slice(0, 3)
              .join(" / ") || "Adverse media",
            riskScore: subject.subject_risk_assessment.subject_risk_score,
            recommendation
          });
          setSavedRecommendation(recommendation);
        }}
      />
    </section>
  );
}

function ReviewRecommendationPanel({
  subject,
  entityKind,
  geographicRegion,
  savedRecommendation,
  onRecommend
}: {
  subject: SubjectReport;
  entityKind: EntityKind;
  geographicRegion: string;
  savedRecommendation: CaseRecommendation | null;
  onRecommend: (recommendation: CaseRecommendation) => void;
}) {
  const actions: {
    value: CaseRecommendation;
    title: string;
    detail: string;
    icon: ReactNode;
    className: string;
  }[] = [
    {
      value: "Recommend for closure with minimum risk",
      title: "Recommend closure",
      detail: "Minimum risk; move the case to Closed.",
      icon: <Archive className="h-5 w-5" />,
      className: "border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100"
    },
    {
      value: "Recommend for investigator review",
      title: "Investigator review",
      detail: "Keep the case active for human review.",
      icon: <SearchCheck className="h-5 w-5" />,
      className: "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
    },
    {
      value: "Recommend for escalation",
      title: "Recommend escalation",
      detail: "Move the case to the escalation queue.",
      icon: <Siren className="h-5 w-5" />,
      className: "border-red-300 bg-red-50 text-red-900 hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:text-red-100"
    }
  ];

  return (
    <Card className="overflow-hidden border-primary/25">
      <CardHeader className="border-b bg-primary/[0.06]">
        <CardTitle>AI Agent Review Recommendation</CardTitle>
        <p className="text-sm text-muted-foreground">
          Record the final analyst recommendation for {subject.matched_name} ({entityKind}
          {geographicRegion ? ` · ${geographicRegion}` : ""}). The selection immediately updates the investigation queue.
        </p>
      </CardHeader>
      <CardContent className="min-w-0 pt-5">
        <div className="grid gap-3 md:grid-cols-3">
          {actions.map((action) => (
            <button
              key={action.value}
              type="button"
              onClick={() => onRecommend(action.value)}
              className={cn(
                "rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md",
                action.className,
                savedRecommendation === action.value && "ring-2 ring-primary ring-offset-2"
              )}
            >
              <span className="flex items-center gap-2 font-display font-bold">
                {action.icon}
                {action.title}
              </span>
              <span className="mt-2 block text-xs leading-5 opacity-80">{action.detail}</span>
            </button>
          ))}
        </div>
        {savedRecommendation ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/[0.05] p-3">
            <p className="text-sm font-semibold">Saved: {savedRecommendation}</p>
            <Link to="/aiagent" className="text-sm font-bold text-primary hover:underline">
              View updated queue →
            </Link>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SummaryDashboard({
  subject,
  qaStatus,
  entityKind
}: {
  subject: SubjectReport;
  qaStatus: string;
  entityKind: EntityKind;
}) {
  const { red, yellow, green } = flagCounts(subject.matters);
  const risk = subject.subject_risk_assessment;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <SummaryCard
        icon={entityKind === "Individual" ? <UserRound className="h-5 w-5" /> : <Landmark className="h-5 w-5" />}
        label={entityKind}
        value={subject.matched_name}
      />
      <SummaryCard
        icon={<AlertTriangle className="h-5 w-5" />}
        label="Subject Risk Score"
        value={`${risk.subject_risk_score}`}
        valueClass="text-4xl"
      />
      <SummaryCard
        icon={<ShieldAlert className="h-5 w-5" />}
        label="Risk Level"
        value={risk.risk_level.toUpperCase()}
        badge={riskVariant(risk.risk_level)}
      />
      <SummaryCard icon={<CheckCircle2 className="h-5 w-5" />} label="Identity Confidence" value={subject.identity_confidence} />
      <SummaryCard icon={<Flag className="h-5 w-5" />} label="Matter Flags" value={`${red}R / ${yellow}Y / ${green}G`} sub={qaStatus} />
    </div>
  );
}

function ExecutiveSummary({
  subject,
  report,
  entityKind,
  copyText,
  copied
}: {
  subject: SubjectReport;
  report: AgentReport;
  entityKind: EntityKind;
  copyText: (label: string, text: string) => void;
  copied: string | null;
}) {
  const pe = subject.plain_english_summary;
  const sourceCount = collectSources(subject).length;
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between border-b bg-secondary/50">
        <CardTitle>Investigation Summary Dashboard</CardTitle>
        <Button variant="outline" size="sm" onClick={() => copyText("summary", pe.overall_risk_assessment)}>
          <ClipboardCopy className="h-4 w-4" />
          {copied === "summary" ? "Copied" : "Copy"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        <p className="text-base leading-7">{pe.overall_risk_assessment}</p>
        <div className="grid gap-3 md:grid-cols-3">
          <Metric label="Profile Type" value={entityKind} />
          <Metric label="Subject Type" value={entityKind} />
          <Metric label="Match Status" value={subject.match_status} />
          <Metric
            label="Identity Confidence"
            value={`${subject.identity_confidence} (${confidencePercent(subject.identity_confidence)}%)`}
          />
          <Metric label="Focal Jurisdiction" value={subject.focal_geography.jurisdiction ?? "Unknown"} />
          <Metric label="Geography Confidence" value={subject.focal_geography.geography_confidence ?? "Unknown"} />
          <Metric label="Sources Reviewed" value={`${sourceCount}`} />
          <Metric label="Matters Scored" value={`${subject.matters.length}`} />
          <Metric label="QA Status" value={report.qa_status} />
        </div>
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm leading-6 text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100">
          <strong className="font-display">Main risk drivers: </strong>
          {pe.main_risk_drivers}
        </div>
      </CardContent>
    </Card>
  );
}

function EntityProfilePanel({ entityKind }: { entityKind: EntityKind }) {
  return (
    <Card>
      <CardHeader className="border-b bg-secondary/50">
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            {entityKind === "Individual" ? <UserRound className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
            {entityKind} Profile
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-5">
        <Metric label="Subject Type" value={entityKind} />
      </CardContent>
    </Card>
  );
}

function MattersPanel({ matters }: { matters: Matter[] }) {
  return (
    <Card>
      <CardHeader className="border-b bg-secondary/50">
        <CardTitle>Structured Matters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-5">
        {matters.map((matter) => (
          <MatterCard key={matter.matter_id} matter={matter} />
        ))}
      </CardContent>
    </Card>
  );
}

function MatterCard({ matter }: { matter: Matter }) {
  const geo = matter.event_geography;
  return (
    <article className="rounded-lg border bg-background shadow-inset-soft p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display font-semibold">{matter.matter_id}</h3>
            {matter.typologies.map((typology) => (
              <Badge key={typology} variant="secondary">
                {typology}
              </Badge>
            ))}
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{matter.matter_summary}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge variant={riskVariant(matter.risk_level)}>{matter.risk_level}</Badge>
          <Badge variant={stageVariant(matter.current_stage)}>{matter.current_stage}</Badge>
        </div>
      </div>
      <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
        <MiniFact label="Matter Score" value={`${matter.matter_risk_score}`} />
        <MiniFact label="Attribution" value={matter.attribution} />
        <MiniFact label="Evidence Confidence" value={matter.confidence} />
        <MiniFact label="Country" value={geo?.country ?? "Unknown"} />
        <MiniFact label="Authority" value={geo?.jurisdiction_or_authority ?? "Unknown"} />
        <MiniFact label="Region" value={geo?.city_or_region ?? "—"} />
      </div>
      {matter.key_facts ? <p className="mt-3 text-sm font-medium">{matter.key_facts}</p> : null}
      {matter.timeline?.length ? (
        <div className="mt-3 border-t pt-3">
          <p className="mb-2 font-display text-xs font-semibold uppercase text-muted-foreground">Matter timeline</p>
          <div className="space-y-1.5">
            {matter.timeline.map((event) => (
              <div
                key={`${matter.matter_id}-${event.date}-${event.event_type}`}
                className="flex flex-wrap items-center gap-2 text-xs"
              >
                <span className="font-mono font-semibold tabular-nums text-primary">{formatDate(event.date)}</span>
                <Badge variant={stageVariant(event.stage)}>{event.stage}</Badge>
                <span className="text-muted-foreground">{event.event_type}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {matter.supporting_sources?.length ? (
        <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
          {matter.supporting_sources.map((source) => (
            <a
              key={`${matter.matter_id}-${source.url}`}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border bg-card px-3 py-1 text-xs font-semibold text-primary underline-offset-4 hover:underline"
            >
              {source.publisher}: {source.title}
            </a>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function RiskScoreBreakdownPanel({ subject }: { subject: SubjectReport }) {
  const risk = subject.subject_risk_assessment;
  return (
    <Card>
      <CardHeader className="border-b bg-secondary/50">
        <CardTitle>Risk Score Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        <p className="text-sm leading-6 text-muted-foreground">{risk.risk_calculation}</p>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-secondary/70 font-display text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Matter</th>
                <th className="p-3">Typologies</th>
                <th className="p-3 text-right">Typology</th>
                <th className="p-3 text-right">Stage</th>
                <th className="p-3 text-right">Attribution</th>
                <th className="p-3 text-right">Recency</th>
                <th className="p-3 text-right">Score</th>
              </tr>
            </thead>
            <tbody>
              {subject.matters.map((matter) => {
                const rc = matter.risk_components;
                return (
                  <tr key={matter.matter_id} className="border-t align-top">
                    <td className="p-3 font-medium">{matter.matter_id}</td>
                    <td className="p-3 text-muted-foreground">{matter.typologies.join(", ")}</td>
                    <td className="p-3 text-right tabular-nums">{rc?.typology_score ?? 0}</td>
                    <td className="p-3 text-right tabular-nums">{rc?.stage_score ?? 0}</td>
                    <td className="p-3 text-right tabular-nums">{rc?.attribution_adjustment ?? 0}</td>
                    <td className="p-3 text-right tabular-nums">{rc?.recency_adjustment ?? 0}</td>
                    <td className="p-3 text-right font-bold tabular-nums">{matter.matter_risk_score}</td>
                  </tr>
                );
              })}
              <tr className="border-t bg-secondary/40">
                <td className="p-3 font-semibold" colSpan={6}>
                  Highest matter {risk.highest_matter_risk_score} + pattern adjustment {risk.pattern_adjustment}
                </td>
                <td className="p-3 text-right font-bold tabular-nums text-primary">{risk.subject_risk_score}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Metric label="Subject Risk Score" value={`${risk.subject_risk_score}/100`} />
          <Metric label="Risk Level" value={risk.risk_level} />
          <Metric label="Risk-Driving Matters" value={risk.risk_driving_matter_ids.join(", ")} />
        </div>
      </CardContent>
    </Card>
  );
}

function TypologyPanel({ matters }: { matters: Matter[] }) {
  const typologies = aggregateTypologies(matters);
  return (
    <Card>
      <CardHeader className="border-b bg-secondary/50">
        <CardTitle>Risk Typology Classification</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 pt-5 md:grid-cols-2">
        {typologies.map((typology) => (
          <div key={typology.name} className="rounded-lg border bg-background shadow-inset-soft p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="font-display font-semibold">{typology.name}</h3>
              <Badge variant={riskVariant(typology.topLevel)}>{typology.topLevel}</Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Detected in {typology.matterIds.length} matter(s): {typology.matterIds.join(", ")}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function TimelinePanel({ matters }: { matters: Matter[] }) {
  const rows = flattenTimeline(matters);
  return (
    <Card>
      <CardHeader className="border-b bg-secondary/50">
        <CardTitle>Adverse Event Timeline</CardTitle>
      </CardHeader>
      <CardContent className="pt-5">
        <div className="relative pl-7">
          <div className="absolute bottom-2 left-[13px] top-2 w-px bg-border" />
          {rows.map((event, index) => (
            <div key={`${event.matterId}-${event.date}-${index}`} className="relative pb-6 last:pb-0">
              <div className="absolute -left-7 top-1 grid h-7 w-7 place-items-center rounded-full border bg-card text-xs font-bold text-primary">
                {index + 1}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-display text-sm font-bold text-primary">{formatDate(event.date)}</p>
                <Badge variant={stageVariant(event.stage)}>{event.stage}</Badge>
                <Badge variant="secondary">{event.eventType}</Badge>
                {event.typologies.map((typology) => (
                  <Badge key={typology} variant="secondary">
                    {typology}
                  </Badge>
                ))}
              </div>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{event.description}</p>
              {event.source ? (
                <a
                  href={event.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-xs font-semibold text-primary underline-offset-4 hover:underline"
                >
                  {event.source.publisher} — open source
                </a>
              ) : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SourcesPanel({ subject }: { subject: SubjectReport }) {
  const sources = collectSources(subject);
  return (
    <Card>
      <CardHeader className="border-b bg-secondary/50">
        <CardTitle>Retrieved Sources</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-5">
        {sources.map((source) => (
          <article key={source.key} className="rounded-lg border bg-background shadow-inset-soft p-4">
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-display font-semibold text-primary underline-offset-4 hover:underline"
            >
              {source.title}
            </a>
            {source.detail ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{source.detail}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="secondary">{source.publisher}</Badge>
              {source.date ? <Badge variant="secondary">{formatDate(source.date)}</Badge> : null}
            </div>
          </article>
        ))}
      </CardContent>
    </Card>
  );
}

function FinalConclusionPanel({
  subject,
  copyText,
  copied
}: {
  subject: SubjectReport;
  copyText: (label: string, text: string) => void;
  copied: string | null;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between border-b bg-secondary/50">
        <CardTitle>Final Conclusion</CardTitle>
        <Button variant="outline" size="sm" onClick={() => copyText("conclusion", subject.final_conclusion)}>
          <ClipboardCopy className="h-4 w-4" />
          {copied === "conclusion" ? "Copied" : "Copy"}
        </Button>
      </CardHeader>
      <CardContent className="pt-5">
        <p className="text-base leading-7">{subject.final_conclusion}</p>
      </CardContent>
    </Card>
  );
}

function GeographyPanel({ subject }: { subject: SubjectReport }) {
  const geo = subject.focal_geography;
  const matterCountries = Array.from(
    new Set(subject.matters.map((matter) => matter.event_geography?.country).filter(Boolean) as string[])
  );
  return (
    <Card>
      <CardHeader className="border-b bg-secondary/50">
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <MapPinned className="h-4 w-4" />
            Geography Exposure
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-5">
        <Metric label="Focal Jurisdiction" value={geo.jurisdiction ?? "Unknown"} />
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase text-muted-foreground">Business Locations</p>
          <div className="flex flex-wrap gap-2">
            {(geo.business_locations ?? []).map((location) => (
              <Badge key={location} variant="secondary">
                {location}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase text-muted-foreground">Adverse Matter Countries</p>
          <div className="flex flex-wrap gap-2">
            {matterCountries.map((country) => (
              <Badge key={country} variant="red">
                {country}
              </Badge>
            ))}
          </div>
        </div>
        {geo.geography_reason ? <p className="text-sm leading-6 text-muted-foreground">{geo.geography_reason}</p> : null}
      </CardContent>
    </Card>
  );
}

function QaGuardrailPanel({ report }: { report: AgentReport }) {
  const passed = report.qa_status.toLowerCase().startsWith("passed");
  return (
    <Card>
      <CardHeader className="border-b bg-secondary/50">
        <CardTitle>QA Guardrails</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-5">
        <div className="flex items-center gap-2">
          {passed ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <TriangleAlert className="h-4 w-4 text-orange-600" />
          )}
          <Badge variant={passed ? "green" : "orange"}>{report.qa_status}</Badge>
        </div>
        {(report.qa_warnings ?? []).map((warning, index) => (
          <div key={index} className="flex items-start gap-3 rounded-lg border bg-background shadow-inset-soft p-3">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
            <p className="text-xs leading-5 text-muted-foreground">{warning}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function HumanReviewPanel({ subject }: { subject: SubjectReport }) {
  const review = subject.human_review;
  if (!review) return null;
  return (
    <Card>
      <CardHeader className="border-b bg-secondary/50">
        <CardTitle>
          <span className="inline-flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Human Review
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-5">
        <Badge variant={review.human_review_required ? "orange" : "green"}>
          {review.human_review_required ? "Review Required" : "Optional"}
        </Badge>
        <ul className="space-y-2">
          {review.review_reasons.map((reason, index) => (
            <li key={index} className="rounded-md border bg-background p-2 text-sm text-muted-foreground">
              {reason}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function LimitationsPanel({ subject }: { subject: SubjectReport }) {
  if (!subject.limitations?.length) return null;
  return (
    <Card>
      <CardHeader className="border-b bg-secondary/50">
        <CardTitle>Limitations</CardTitle>
      </CardHeader>
      <CardContent className="pt-5">
        <ul className="space-y-2">
          {subject.limitations.map((item, index) => (
            <li key={index} className="rounded-md border bg-background p-2 text-sm text-muted-foreground">
              {item}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function ExcludedMattersPanel({ subject }: { subject: SubjectReport }) {
  if (!subject.excluded_matters?.length) return null;
  return (
    <Card>
      <CardHeader className="border-b bg-secondary/50">
        <CardTitle>Excluded Matters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-5">
        {subject.excluded_matters.map((matter) => (
          <div key={matter.matter_id} className="rounded-md border bg-background p-3 text-sm">
            <p className="font-display font-semibold">{matter.matter_id}</p>
            <p className="mt-1 text-muted-foreground">{matter.reason}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  badge,
  valueClass,
  sub
}: {
  icon: ReactNode;
  label: string;
  value: string;
  badge?: "red" | "orange" | "green";
  valueClass?: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="min-w-0 overflow-hidden pt-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</div>
          {badge ? <Badge variant={badge}>{value}</Badge> : null}
        </div>
        <p className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={cn("mt-2 min-w-0 font-display text-2xl font-bold [overflow-wrap:anywhere]", valueClass)}>
          {value}
        </p>
        {sub ? <p className="mt-1 min-w-0 text-xs text-muted-foreground [overflow-wrap:anywhere]">{sub}</p> : null}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border bg-background shadow-inset-soft p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 max-w-full text-lg font-bold [overflow-wrap:anywhere]">{value}</p>
    </div>
  );
}

function MiniFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-md bg-secondary/70 p-2 shadow-inset-soft">
      <p className="text-[11px] font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 max-w-full text-sm [overflow-wrap:anywhere]">{value}</p>
    </div>
  );
}

/** Small badge shown in the header for the local public-source workflow. */
export function ModeBadge({ report }: { report: AgentReport & { mode?: string } }) {
  if (report.mode === "demo") {
    return (
      <Badge variant="orange">
        <Bot className="mr-1 h-3 w-3" />
        Curated demo data
      </Badge>
    );
  }
  return (
    <Badge variant="green">
      <Bot className="mr-1 h-3 w-3" />
      Live public sources
    </Badge>
  );
}
