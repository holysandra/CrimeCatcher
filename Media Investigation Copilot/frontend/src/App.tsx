import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ClipboardCopy,
  Download,
  FileText,
  Filter,
  Flag,
  Landmark,
  Loader2,
  MessageSquare,
  Moon,
  Network,
  Newspaper,
  Search,
  ShieldAlert,
  Sparkles,
  Sun,
  TableProperties,
  ThumbsUp,
  Timer,
  TriangleAlert
} from "lucide-react";

import type { InvestigationResponse } from "@shared/investigation";
import { InteractiveGeographyRiskMap } from "@/components/InteractiveGeographyRiskMap";
import { ScoringMethodologyPanel } from "@/components/ScoringMethodologyPanel";
import { riskTypologies, typologyById } from "@/data/riskTypologies";
import { answerInvestigationQuestion } from "@/utils/chatbotEngine";
import { compareDatesDescending, formatDateForDisplay, getRecencyBucket, normalizeDateToISO } from "@/utils/dateUtils";
import { generateCaseReport, generateSeniorSummary } from "@/utils/reportGenerator";
import type {
  EnhancedInvestigation,
  EntityType,
  FlagColor,
  InvestigationFinding,
  RiskRating,
  Severity
} from "@/types/investigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

const STATUS_MESSAGES = [
  "Searching live public sources...",
  "Searching official/regulatory links...",
  "Deduplicating news results...",
  "Running deterministic evidence extraction...",
  "Inferring entity profile...",
  "Calculating Weighted Score...",
  "Running Guardrails...",
  "Preparing Analyst Report..."
];

type ChatMessage = { role: "analyst" | "copilot"; text: string };
type FeedbackState = "Accurate" | "Needs Review" | "False Positive" | "Escalate" | null;

function flagVariant(flag: FlagColor): "red" | "orange" | "green" {
  if (flag === "Red") return "red";
  if (flag === "Yellow") return "orange";
  return "green";
}

function ratingVariant(rating: RiskRating): "red" | "orange" | "green" {
  if (rating === "Critical" || rating === "High") return "red";
  if (rating === "Moderate") return "orange";
  return "green";
}

export default function App() {
  const [query, setQuery] = useState("Wirecard");
  const [lookbackDays, setLookbackDays] = useState("1095");
  const [investigation, setInvestigation] = useState<EnhancedInvestigation | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [chatQuestion, setChatQuestion] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [flagFilter, setFlagFilter] = useState<"All" | FlagColor>("All");
  const [typologyFilter, setTypologyFilter] = useState("All");
  const [reliabilityFilter, setReliabilityFilter] = useState("All");
  const [recencyFilter, setRecencyFilter] = useState("All");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [feedbackComment, setFeedbackComment] = useState("");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (!loading) return;
    const interval = window.setInterval(() => {
      setStatusIndex((current) => (current + 1) % STATUS_MESSAGES.length);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [loading]);

  const progress = useMemo(() => {
    if (!loading) return investigation ? 100 : 0;
    return Math.min(96, ((statusIndex + 1) / STATUS_MESSAGES.length) * 100);
  }, [investigation, loading, statusIndex]);

  const filteredFindings = useMemo(() => {
    return (investigation?.findings ?? []).filter((finding) => {
      const flagMatch = flagFilter === "All" || finding.flag === flagFilter;
      const typologyMatch = typologyFilter === "All" || finding.typologyIds.includes(typologyFilter);
      const reliabilityMatch = reliabilityFilter === "All" || finding.sourceReliability === reliabilityFilter;
      const recencyMatch = recencyFilter === "All" || isRecent(finding.sourceDate, Number(recencyFilter));
      return flagMatch && typologyMatch && reliabilityMatch && recencyMatch;
    });
  }, [flagFilter, investigation, recencyFilter, reliabilityFilter, typologyFilter]);

  async function investigate(event?: FormEvent) {
    event?.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setError("Enter a company or person to investigate.");
      return;
    }

    setLoading(true);
    setError(null);
    setCopied(null);
    setStatusIndex(0);
    setChatMessages([]);

    try {
      const response = await fetch(`${API_BASE_URL}/investigate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed, lookback_days: Number(lookbackDays) })
      });

      if (!response.ok) {
        const problem = await response.json().catch(() => null);
        throw new Error(problem?.detail ?? `Backend unavailable: ${response.status}`);
      }

      const data = (await response.json()) as InvestigationResponse;
      setInvestigation(buildInvestigationFromApi(data, trimmed));
    } catch (caught) {
      setInvestigation(null);
      setError(caught instanceof Error ? caught.message : "Live investigation failed. No synthetic result was generated.");
    } finally {
      setLoading(false);
    }
  }

  async function copyText(label: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1800);
  }

  function askCopilot(event: FormEvent) {
    event.preventDefault();
    if (!investigation || !chatQuestion.trim()) return;
    const question = chatQuestion.trim();
    const answer = answerInvestigationQuestion(question, investigation);
    setChatMessages((messages) => [
      ...messages,
      { role: "analyst", text: question },
      { role: "copilot", text: answer }
    ]);
    setChatQuestion("");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_34%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--secondary)))]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-lg border bg-card/90 p-4 shadow-terminal backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <ShieldAlert className="h-7 w-7" aria-hidden="true" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-foreground md:text-2xl">
                  AI Adverse Media Investigation Copilot
                </h1>
                <Badge variant="secondary">AFC / Fraud MVP</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Human-in-the-loop adverse media, sanctions, AML, and fraud investigation support.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 no-print">
            <Button variant="outline" size="icon" onClick={() => setDarkMode((value) => !value)} title="Toggle dark mode">
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="outline" onClick={() => window.print()} disabled={!investigation}>
              <Download className="h-4 w-4" />
              PDF
            </Button>
          </div>
        </header>

        <ResponsibleAiNotice />

        <section>
          <SearchPanel
            query={query}
            setQuery={setQuery}
            lookbackDays={lookbackDays}
            setLookbackDays={setLookbackDays}
            loading={loading}
            investigate={investigate}
          />
        </section>

        {error ? (
          <div className="rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-700 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-200">
            {error}
          </div>
        ) : null}
        <LoadingPanel loading={loading} status={STATUS_MESSAGES[statusIndex]} progress={progress} />

        {investigation ? (
          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <InvestigationDashboard investigation={investigation} />

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
              <div className="space-y-6">
                <ExecutiveSummary investigation={investigation} copyText={copyText} copied={copied} />
                <RetrievedSourcesPanel investigation={investigation} />
                <TypologyPanel investigation={investigation} />
                <FindingsPanel
                  findings={filteredFindings}
                  flagFilter={flagFilter}
                  setFlagFilter={setFlagFilter}
                  typologyFilter={typologyFilter}
                  setTypologyFilter={setTypologyFilter}
                  reliabilityFilter={reliabilityFilter}
                  setReliabilityFilter={setReliabilityFilter}
                  recencyFilter={recencyFilter}
                  setRecencyFilter={setRecencyFilter}
                />
                <RiskScoreBreakdownPanel investigation={investigation} />
                <ScoringMethodologyPanel investigation={investigation} />
                <TimelinePanel investigation={investigation} />
                <CaseReportPanel investigation={investigation} copyText={copyText} copied={copied} />
              </div>

              <aside className="space-y-6">
                <InteractiveGeographyRiskMap investigation={investigation} />
                <SourceReliabilityPanel investigation={investigation} />
                <HallucinationGuardrailPanel investigation={investigation} />
                <InnovationFeaturesPanel investigation={investigation} />
                <ChatbotPanel
                  investigation={investigation}
                  chatQuestion={chatQuestion}
                  setChatQuestion={setChatQuestion}
                  chatMessages={chatMessages}
                  askCopilot={askCopilot}
                />
                <AnalystFeedbackPanel
                  feedback={feedback}
                  setFeedback={setFeedback}
                  feedbackComment={feedbackComment}
                  setFeedbackComment={setFeedbackComment}
                />
              </aside>
            </div>
          </section>
        ) : (
          <EmptyState />
        )}
      </div>
    </main>
  );
}

function SearchPanel({
  query,
  setQuery,
  lookbackDays,
  setLookbackDays,
  loading,
  investigate
}: {
  query: string;
  setQuery: (value: string) => void;
  lookbackDays: string;
  setLookbackDays: (value: string) => void;
  loading: boolean;
  investigate: (event?: FormEvent) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-secondary/50">
        <CardTitle>Investigation Search Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]" onSubmit={investigate}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search Company or Person..."
              className="pl-10"
              disabled={loading}
            />
          </div>
          <Select value={lookbackDays} onChange={setLookbackDays} disabled={loading}>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
            <option value="365">1 year</option>
            <option value="1095">3 years</option>
            <option value="1825">5 years</option>
          </Select>
          <Button className="h-11" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Run Live Investigation
          </Button>
        </form>
        <p className="text-xs leading-5 text-muted-foreground">
          Production flow uses live public sources plus deterministic entity inference, typology detection, and weighted scoring. If no evidence is found, the app shows a no-results state instead of fake findings.
        </p>
      </CardContent>
    </Card>
  );
}

function InvestigationDashboard({ investigation }: { investigation: EnhancedInvestigation }) {
  const red = investigation.findings.filter((finding) => finding.flag === "Red").length;
  const yellow = investigation.findings.filter((finding) => finding.flag === "Yellow").length;
  const green = investigation.findings.filter((finding) => finding.flag === "Green").length;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <SummaryCard icon={<Landmark className="h-5 w-5" />} label="Entity" value={investigation.entityProfile.name} />
      <SummaryCard icon={<AlertTriangle className="h-5 w-5" />} label="Weighted Score" value={`${investigation.riskScore.totalScore}`} valueClass="text-4xl" />
      <SummaryCard
        icon={<ShieldAlert className="h-5 w-5" />}
        label="Final Rating"
        value={investigation.riskScore.finalRiskRating.toUpperCase()}
        badge={ratingVariant(investigation.riskScore.finalRiskRating)}
      />
      <SummaryCard icon={<CheckCircle2 className="h-5 w-5" />} label="Confidence" value={`${investigation.riskScore.confidencePercent}%`} />
      <SummaryCard icon={<Flag className="h-5 w-5" />} label="Flags" value={`${red}R / ${yellow}Y / ${green}G`} />
    </div>
  );
}

function ExecutiveSummary({
  investigation,
  copyText,
  copied
}: {
  investigation: EnhancedInvestigation;
  copyText: (label: string, text: string) => void;
  copied: string | null;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between border-b bg-secondary/50">
        <CardTitle>Investigation Summary Dashboard</CardTitle>
        <Button variant="outline" size="sm" onClick={() => copyText("summary", investigation.executiveSummary)} className="no-print">
          <ClipboardCopy className="h-4 w-4" />
          {copied === "summary" ? "Copied" : "Copy"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        <p className="text-base leading-7">{investigation.executiveSummary}</p>
        <div className="grid gap-3 md:grid-cols-3">
          <Metric label="Inferred Entity Type" value={investigation.entityProfile.entityType} />
          <Metric
            label="Entity Type Confidence"
            value={
              investigation.entityProfile.entityTypeConfidence
                ? `${investigation.entityProfile.entityTypeConfidence.confidenceLabel} ${investigation.entityProfile.entityTypeConfidence.confidencePercent}%`
                : "Unknown"
            }
          />
          <Metric label="Inferred Primary Jurisdiction" value={investigation.entityProfile.jurisdiction} />
          <Metric
            label="Jurisdiction Confidence"
            value={
              investigation.entityProfile.jurisdictionConfidence
                ? `${investigation.entityProfile.jurisdictionConfidence.confidenceLabel} ${investigation.entityProfile.jurisdictionConfidence.confidencePercent}%`
                : "Unknown"
            }
          />
          <Metric label="Sources Reviewed" value={`${investigation.sourcesReviewed}`} />
          <Metric label="Source Mode" value={investigation.entityProfile.mode ?? "Live/Fallback"} />
          <Metric label="Recommended Action" value={investigation.recommendedAction} />
          <Metric label="Typologies Detected" value={`${investigation.keyTypologies.length}`} />
          <Metric label="Human Review" value={investigation.humanReviewRequired ? "Required" : "Optional"} />
        </div>
        {investigation.entityProfile.ambiguityWarning ? (
          <div className="rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-700 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-200">
            {investigation.entityProfile.ambiguityWarning}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function TypologyPanel({ investigation }: { investigation: EnhancedInvestigation }) {
  const visible = investigation.typologyAssessments.filter((assessment) => assessment.detectionStatus !== "Not Detected");
  return (
    <Card>
      <CardHeader className="border-b bg-secondary/50">
        <CardTitle>Risk Typology Classification</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 pt-5 md:grid-cols-2">
        {visible.map((assessment) => (
          <div key={assessment.typologyId} className="rounded-lg border bg-background p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="font-semibold">{assessment.name}</h3>
              <Badge variant={assessment.severity === "Critical" || assessment.severity === "High" ? "red" : "orange"}>
                {assessment.detectionStatus}
              </Badge>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{assessment.explanation}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="secondary">Severity: {assessment.severity}</Badge>
              <Badge variant="secondary">{assessment.sourceCount} source(s)</Badge>
            </div>
            <p className="mt-3 text-xs font-semibold uppercase text-muted-foreground">Suggested follow-up</p>
            <p className="mt-1 text-sm">{assessment.suggestedFollowUps[0]}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function RetrievedSourcesPanel({ investigation }: { investigation: EnhancedInvestigation }) {
  const sources = investigation.publicSources ?? [];
  return (
    <Card>
      <CardHeader className="border-b bg-secondary/50">
        <CardTitle>Retrieved Public Sources</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-5">
        {sources.length === 0 ? (
          <p className="rounded-lg border border-dashed bg-background p-4 text-sm text-muted-foreground">
            No relevant public source results found. Try expanding the lookback period or checking the entity name.
          </p>
        ) : null}
        {sources.map((source) => (
          <article key={source.id} className="rounded-lg border bg-background p-4">
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              {source.title}
            </a>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{source.summaryText}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="secondary">{source.sourceName}</Badge>
              <Badge variant="secondary">{source.sourceType}</Badge>
              <Badge variant={source.sourceReliability === "High" ? "green" : source.sourceReliability === "Medium" ? "orange" : "red"}>
                {source.sourceReliability} Reliability
              </Badge>
              <Badge variant="secondary">{source.displayDate}</Badge>
              <Badge variant="secondary">{source.provider || "PublicSearch"}</Badge>
              <Badge variant="secondary">Entity match {source.entityMatchConfidence}%</Badge>
            </div>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              Open news link
            </a>
            <details className="mt-3 rounded-md border bg-secondary/40 p-3 text-xs">
              <summary className="cursor-pointer font-semibold">Debug date parsing</summary>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <MiniFact label="Raw provider date" value={source.rawPublishedAt || "Unavailable"} />
                <MiniFact label="Normalized date" value={source.publishedAt || "Unknown"} />
                <MiniFact label="Display date" value={source.displayDate} />
                <MiniFact label="Provider" value={source.provider || "PublicSearch"} />
              </div>
            </details>
          </article>
        ))}
      </CardContent>
    </Card>
  );
}

function FindingsPanel({
  findings,
  flagFilter,
  setFlagFilter,
  typologyFilter,
  setTypologyFilter,
  reliabilityFilter,
  setReliabilityFilter,
  recencyFilter,
  setRecencyFilter
}: {
  findings: InvestigationFinding[];
  flagFilter: "All" | FlagColor;
  setFlagFilter: (value: "All" | FlagColor) => void;
  typologyFilter: string;
  setTypologyFilter: (value: string) => void;
  reliabilityFilter: string;
  setReliabilityFilter: (value: string) => void;
  recencyFilter: string;
  setRecencyFilter: (value: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="border-b bg-secondary/50">
        <CardTitle>Structured Findings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        <div className="grid gap-3 md:grid-cols-4 no-print">
          <Select value={flagFilter} onChange={(value) => setFlagFilter(value as "All" | FlagColor)}>
            <option>All</option>
            <option>Red</option>
            <option>Yellow</option>
            <option>Green</option>
          </Select>
          <Select value={typologyFilter} onChange={setTypologyFilter}>
            <option value="All">All typologies</option>
            {riskTypologies.map((typology) => (
              <option value={typology.id} key={typology.id}>
                {typology.name}
              </option>
            ))}
          </Select>
          <Select value={reliabilityFilter} onChange={setReliabilityFilter}>
            <option>All</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </Select>
          <Select value={recencyFilter} onChange={setRecencyFilter}>
            <option value="All">All dates</option>
            <option value="2">Last 2 years</option>
            <option value="5">Last 5 years</option>
          </Select>
        </div>
        <div className="space-y-3">
          {findings.map((finding) => (
            <FindingCard key={finding.id} finding={finding} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function FindingCard({ finding }: { finding: InvestigationFinding }) {
  const typologyNames = finding.typologyIds
    .map((id) => riskTypologies.find((typology) => typology.id === id)?.name ?? id)
    .join(", ");

  return (
    <article className="rounded-lg border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{finding.title}</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{finding.summary}</p>
        </div>
        <Badge variant={flagVariant(finding.flag)}>{finding.flag} Flag</Badge>
      </div>
      <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
        <MiniFact label="Typology" value={typologyNames} />
        <MiniFact label="Source" value={`${finding.sourceName} (${finding.sourceReliability})`} />
        <MiniFact label="Date" value={finding.displayDate ?? formatDateForDisplay(finding.sourceDate)} />
        <MiniFact label="Jurisdiction" value={finding.jurisdiction ?? "Unknown"} />
        <MiniFact label="Evidence" value={finding.evidenceStrength} />
        <MiniFact label="Status / Weight" value={`${finding.allegationStatus} / ${finding.weight > 0 ? "+" : ""}${finding.weight}`} />
      </div>
      <p className="mt-3 text-sm font-medium">{finding.rationale}</p>
      {finding.sourceLinks?.length ? (
        <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
          {finding.sourceLinks.map((link) => (
            <a
              key={`${finding.id}-${link.url}`}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border bg-card px-3 py-1 text-xs font-semibold text-primary underline-offset-4 hover:underline"
            >
              {link.sourceName}: {link.title}
            </a>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function RiskScoreBreakdownPanel({ investigation }: { investigation: EnhancedInvestigation }) {
  const rows = investigation.riskScore.appliedFindingBreakdown ?? [];
  return (
    <Card>
      <CardHeader className="border-b bg-secondary/50">
        <CardTitle>Risk Score Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        <p className="text-sm leading-6 text-muted-foreground">{investigation.riskScore.explanation}</p>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-secondary/70 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Finding</th>
                <th className="p-3">Typology</th>
                <th className="p-3 text-right">Base</th>
                <th className="p-3">Multipliers</th>
                <th className="p-3 text-right">Adjusted</th>
                <th className="p-3">Source</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="p-3 text-muted-foreground" colSpan={6}>
                    No scored adverse findings. No synthetic score rows were generated.
                  </td>
                </tr>
              ) : null}
              {rows.map((row) => (
                <tr key={row.findingId} className="border-t align-top">
                  <td className="p-3 font-medium">{row.title}</td>
                  <td className="p-3 text-muted-foreground">{row.typology ?? "General Risk"}</td>
                  <td className="p-3 text-right">{row.rawBaseWeight}</td>
                  <td className="p-3 text-xs leading-5 text-muted-foreground">
                    {Object.entries(row.multipliers).map(([key, value]) => (
                      <span key={key} className="mr-2 inline-block">
                        {key}: {value}
                      </span>
                    ))}
                  </td>
                  <td className="p-3 text-right font-bold">{row.adjustedScore}</td>
                  <td className="space-y-1 p-3">
                    {row.sourceLinks.map((link) => (
                      <a
                        key={`${row.findingId}-${link.url}`}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-primary underline-offset-4 hover:underline"
                      >
                        {link.sourceName}
                      </a>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Metric label="Risk Score" value={`${investigation.riskScore.totalScore}/100`} />
          <Metric label="Confidence" value={`${investigation.riskScore.confidenceLevel} ${investigation.riskScore.confidencePercent}/100`} />
          <Metric label="Recommended Action" value={investigation.recommendedAction} />
        </div>
      </CardContent>
    </Card>
  );
}

function TimelinePanel({ investigation }: { investigation: EnhancedInvestigation }) {
  const sourceByName = new Map((investigation.publicSources ?? []).map((source) => [source.sourceName, source]));
  return (
    <Card>
      <CardHeader className="border-b bg-secondary/50">
        <CardTitle>Adverse Event Timeline</CardTitle>
      </CardHeader>
      <CardContent className="pt-5">
        <div className="relative pl-7">
          <div className="absolute bottom-2 left-[13px] top-2 w-px bg-border" />
          {[...investigation.timeline].sort((a, b) => compareDatesDescending(a.date, b.date)).map((event, index) => (
            <div key={`${event.date}-${event.title}`} className="relative pb-6 last:pb-0">
              <div className="absolute -left-7 top-1 grid h-7 w-7 place-items-center rounded-full border bg-card text-xs font-bold text-primary">
                {index + 1}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-bold text-primary">{event.displayDate}</p>
                <Badge variant={flagVariant(event.flag)}>{event.flag}</Badge>
                <Badge variant="secondary">{event.typology}</Badge>
              </div>
              <h3 className="mt-1 font-semibold">{event.title}</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{event.description}</p>
              <p className="mt-1 text-xs text-muted-foreground">{event.source} - {event.jurisdiction ?? "Unknown"}</p>
              {event.sourceUrl || sourceByName.get(event.source) ? (
                <a
                  href={event.sourceUrl || sourceByName.get(event.source)?.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-xs font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Open timeline source
                </a>
              ) : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SourceReliabilityPanel({ investigation }: { investigation: EnhancedInvestigation }) {
  const high = investigation.findings.filter((finding) => finding.sourceReliability === "High").length;
  const medium = investigation.findings.filter((finding) => finding.sourceReliability === "Medium").length;
  const low = investigation.findings.filter((finding) => finding.sourceReliability === "Low").length;

  return (
    <Card>
      <CardHeader className="border-b bg-secondary/50">
        <CardTitle>Source Reliability</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-5">
        <p className="text-sm leading-6 text-muted-foreground">{investigation.sourceAssessment}</p>
        <div className="grid grid-cols-3 gap-2">
          <Metric label="High" value={`${high}`} />
          <Metric label="Medium" value={`${medium}`} />
          <Metric label="Low" value={`${low}`} />
        </div>
      </CardContent>
    </Card>
  );
}

function HallucinationGuardrailPanel({ investigation }: { investigation: EnhancedInvestigation }) {
  return (
    <Card>
      <CardHeader className="border-b bg-secondary/50">
        <CardTitle>Hallucination Guardrails</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-5">
        {investigation.hallucinationChecks.map((check) => (
          <div key={check.label} className="flex items-start gap-3 rounded-lg border bg-background p-3">
            {check.passed ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
            ) : (
              <TriangleAlert className="mt-0.5 h-4 w-4 text-orange-600" />
            )}
            <div>
              <p className="text-sm font-semibold">{check.label}</p>
              <p className="text-xs leading-5 text-muted-foreground">{check.detail}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function InnovationFeaturesPanel({ investigation }: { investigation: EnhancedInvestigation }) {
  const plans = [
    "Verify beneficial ownership and aliases.",
    "Review sanctions screening results and close-match identifiers.",
    "Request enhanced due diligence documents.",
    "Check related entities, directors, and transaction monitoring alerts.",
    "Confirm official regulatory, court, or law enforcement sources."
  ];
  const patterns = [
    "Pattern resembles shell company layering typology.",
    "Pattern resembles sanctions evasion through related-party network.",
    "Pattern resembles fraud-related adverse media with unresolved litigation."
  ];

  return (
    <Card>
      <CardHeader className="border-b bg-secondary/50">
        <CardTitle>Innovation Features</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        <MiniList title="AI Investigation Plan" items={plans} icon={<Network className="h-4 w-4 text-primary" />} />
        <MiniList title="Similar Case Pattern" items={patterns.slice(0, investigation.riskScore.finalRiskRating === "Low" ? 1 : 3)} icon={<TableProperties className="h-4 w-4 text-primary" />} />
        <MiniList title="Follow-up Questions" items={investigation.followUpQuestions.slice(0, 4)} icon={<Filter className="h-4 w-4 text-primary" />} />
      </CardContent>
    </Card>
  );
}

function ChatbotPanel({
  investigation,
  chatQuestion,
  setChatQuestion,
  chatMessages,
  askCopilot
}: {
  investigation: EnhancedInvestigation;
  chatQuestion: string;
  setChatQuestion: (value: string) => void;
  chatMessages: ChatMessage[];
  askCopilot: (event: FormEvent) => void;
}) {
  const starter = "Which findings contributed most to the risk score?";
  return (
    <Card>
      <CardHeader className="border-b bg-secondary/50">
        <CardTitle>Investigation Copilot Chat</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-5">
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100">
          No evidence, no conclusion.
        </div>
        <div className="max-h-96 space-y-3 overflow-y-auto rounded-lg border bg-background p-3">
          {chatMessages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ask: why is this entity high risk, show sanctions concerns, strongest sources, weak evidence, or draft a summary.
            </p>
          ) : null}
          {chatMessages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={cn("rounded-lg p-3 text-sm", message.role === "analyst" ? "bg-secondary" : "bg-card border")}>
              <p className="mb-1 flex items-center gap-2 font-semibold">
                {message.role === "analyst" ? <MessageSquare className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                {message.role === "analyst" ? "Analyst" : "Copilot"}
              </p>
              <pre className="whitespace-pre-wrap font-sans leading-6">{message.text}</pre>
            </div>
          ))}
        </div>
        <form className="flex gap-2" onSubmit={askCopilot}>
          <Input value={chatQuestion} onChange={(event) => setChatQuestion(event.target.value)} placeholder={starter} />
          <Button disabled={!investigation}>
            <Bot className="h-4 w-4" />
            Ask
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function CaseReportPanel({
  investigation,
  copyText,
  copied
}: {
  investigation: EnhancedInvestigation;
  copyText: (label: string, text: string) => void;
  copied: string | null;
}) {
  const report = generateCaseReport(investigation);
  const senior = generateSeniorSummary(investigation);
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between border-b bg-secondary/50">
        <CardTitle>Case Report Generator</CardTitle>
        <div className="flex gap-2 no-print">
          <Button variant="outline" size="sm" onClick={() => copyText("senior", senior)}>
            <FileText className="h-4 w-4" />
            {copied === "senior" ? "Copied" : "Senior"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => copyText("report", report)}>
            <ClipboardCopy className="h-4 w-4" />
            {copied === "report" ? "Copied" : "Copy Report"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        <pre className="max-h-96 overflow-auto rounded-lg border bg-background p-4 whitespace-pre-wrap font-sans text-sm leading-6">
          {report}
        </pre>
      </CardContent>
    </Card>
  );
}

function AnalystFeedbackPanel({
  feedback,
  setFeedback,
  feedbackComment,
  setFeedbackComment
}: {
  feedback: FeedbackState;
  setFeedback: (value: FeedbackState) => void;
  feedbackComment: string;
  setFeedbackComment: (value: string) => void;
}) {
  const options: Exclude<FeedbackState, null>[] = ["Accurate", "Needs Review", "False Positive", "Escalate"];
  return (
    <Card>
      <CardHeader className="border-b bg-secondary/50">
        <CardTitle>Analyst Feedback</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-5">
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <Button key={option} variant={feedback === option ? "default" : "outline"} size="sm" onClick={() => setFeedback(option)}>
              <ThumbsUp className="h-4 w-4" />
              {option}
            </Button>
          ))}
        </div>
        <Input value={feedbackComment} onChange={(event) => setFeedbackComment(event.target.value)} placeholder="Add analyst comment..." />
        {feedback ? <p className="text-sm text-muted-foreground">Feedback captured locally: {feedback}</p> : null}
      </CardContent>
    </Card>
  );
}

function ResponsibleAiNotice() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="rounded-lg border bg-card p-3 text-sm text-muted-foreground">
        <strong className="text-foreground">Human-in-the-loop:</strong> This tool supports analyst review and does not make final compliance decisions.
      </div>
      <div className="rounded-lg border bg-card p-3 text-sm text-muted-foreground">
        <strong className="text-foreground">Evidence-based:</strong> Risk ratings are generated from available evidence and should be validated by a human investigator.
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
          <Newspaper className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-xl font-bold">Ready for AFC adverse media review</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Run a live search to classify typologies, score risk, inspect sources, ask follow-up questions, and generate an analyst report.
        </p>
      </div>
    </section>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  badge,
  valueClass
}: {
  icon: ReactNode;
  label: string;
  value: string;
  badge?: "red" | "orange" | "green";
  valueClass?: string;
}) {
  return (
    <Card className="transition-transform duration-200 hover:-translate-y-0.5">
      <CardContent className="pt-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</div>
          {badge ? <Badge variant={badge}>{value}</Badge> : null}
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        {!badge ? <p className={cn("mt-2 truncate text-2xl font-bold", valueClass)}>{value}</p> : null}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

function MiniFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-secondary/70 p-2">
      <p className="text-[11px] font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}

function MiniList({ title, items, icon }: { title: string; items: string[]; icon: ReactNode }) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </p>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="rounded-md border bg-background p-2 text-sm text-muted-foreground">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Select({
  value,
  onChange,
  children,
  disabled
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      className="flex h-11 w-full rounded-md border bg-card px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </select>
  );
}

function isRecent(date: string, years: number) {
  const bucket = getRecencyBucket(date);
  if (years <= 2) return bucket === "0_to_1_year" || bucket === "1_to_3_years";
  return bucket !== "over_5_years" && bucket !== "unknown";
}

function buildInvestigationFromApi(
  data: InvestigationResponse,
  fallbackName: string
): EnhancedInvestigation {
  const inferredEntityType = normalizeEntityType(data.entity_inference?.entity_type);
  const inferredJurisdiction = data.jurisdiction_inference?.primary_jurisdiction || data.evidence?.[0]?.jurisdiction || "Unknown";
  const publicSources = (data.evidence ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    url: item.source_url,
    sourceName: item.source_name,
    sourceType: normalizeSourceType(item.source_type),
    sourceReliability: item.source_reliability,
    rawPublishedAt: item.raw_source_date || item.source_date,
    publishedAt: normalizeDateToISO(item.source_date || item.raw_source_date),
    displayDate: formatDateForDisplay(item.source_date || item.raw_source_date),
    provider: item.provider || "PublicSearch",
    summaryText: item.summary,
    jurisdiction: item.jurisdiction,
    entityMatchConfidence: item.entity_match_confidence
  }));

  if (!data.risk_score_breakdown || !data.risk_findings?.length) {
    return buildNoFindingInvestigation(data, fallbackName, inferredEntityType, inferredJurisdiction, publicSources);
  }

  const evidenceById = new Map((data.evidence ?? []).map((item) => [item.id, item]));
  const findings: InvestigationFinding[] = data.risk_findings.map((finding) => {
    const evidence = evidenceById.get(finding.evidence_id);
    return {
      id: finding.id,
      title: finding.title,
      summary: finding.description,
      typologyIds: [finding.typology_id],
      indicatorRuleIds: [],
      flag: finding.flag,
      severity: finding.severity,
      sourceName: evidence?.source_name ?? "Unknown Source",
      sourceType: normalizeSourceType(evidence?.source_type),
      sourceReliability: finding.source_reliability,
      rawSourceDate: evidence?.raw_source_date || evidence?.source_date,
      sourceDate: normalizeDateToISO(evidence?.source_date || evidence?.raw_source_date) || "Unknown",
      displayDate: formatDateForDisplay(evidence?.source_date || evidence?.raw_source_date),
      jurisdiction: evidence?.jurisdiction,
      evidenceStrength:
        finding.source_reliability === "High" && (evidence?.entity_match_confidence ?? 0) >= 80
          ? "Strong"
          : finding.source_reliability === "Low"
            ? "Weak"
            : "Moderate",
      allegationStatus: normalizeAllegationStatus(finding.allegation_status),
      weight: finding.adjusted_weight,
      rationale: finding.rationale,
      sourceLinks: (finding.source_links ?? []).map((link) => ({
        title: link.title,
        url: link.url,
        sourceName: link.source_name
      }))
    };
  });

  const keyTypologies = Array.from(
    new Set(findings.map((finding) => typologyById[finding.typologyIds[0]]?.name ?? finding.typologyIds[0]))
  ).slice(0, 8);

  const typologyAssessments = riskTypologies.map((typology) => {
    const related = findings.filter((finding) => finding.typologyIds.includes(typology.id));
    return {
      typologyId: typology.id,
      name: typology.name,
      detectionStatus: related.length ? "Detected" as const : "Not Detected" as const,
      severity: related[0]?.severity ?? "Low" as const,
      supportingEvidence: related.map((finding) => finding.title),
      sourceCount: new Set(related.map((finding) => finding.sourceName)).size,
      explanation: related.length
        ? `${related.length} live or cached public-source finding(s) mapped to this typology.`
        : "No source-supported finding in current evidence.",
      suggestedFollowUps: typology.suggestedFollowUps
    };
  });

  return {
    entityProfile: {
      name: data.company,
      entityType: inferredEntityType,
      entityTypeConfidence: data.entity_inference
        ? {
            value: inferredEntityType,
            confidencePercent: data.entity_inference.confidence,
            confidenceLabel: data.entity_inference.confidence_label,
            rationale: data.entity_inference.rationale
          }
        : undefined,
      jurisdiction: inferredJurisdiction,
      jurisdictionConfidence: data.jurisdiction_inference
        ? {
            value: data.jurisdiction_inference.primary_jurisdiction || "Unknown",
            confidencePercent: data.jurisdiction_inference.confidence,
            confidenceLabel: data.jurisdiction_inference.confidence_label,
            rationale: data.jurisdiction_inference.rationale
          }
        : undefined,
      knownAliases: data.mode ? [data.mode] : [],
      ambiguityWarning: data.ambiguity_warning ?? "",
      mode: data.mode ?? "Live/Fallback"
    },
    executiveSummary: data.summary,
    riskScore: {
      totalScore: data.risk_score_breakdown.total_score,
      finalRiskRating: data.risk_score_breakdown.final_rating,
      appliedIndicators: [],
      positiveMitigatingIndicators: [],
      autoEscalationTriggers: data.risk_score_breakdown.auto_escalation_triggers,
      confidenceLevel: data.confidence >= 76 ? "High" : data.confidence >= 55 ? "Medium" : "Low",
      confidencePercent: data.confidence,
      explanation: data.risk_score_breakdown.explanation
      ,
      appliedFindingBreakdown: data.risk_findings.map((finding) => ({
        findingId: finding.id,
        title: finding.title,
        typology: typologyById[finding.typology_id]?.name ?? finding.typology_id,
        rawBaseWeight: finding.base_weight,
        adjustedScore: finding.adjusted_weight,
        multipliers: {
          sourceReliability: finding.source_reliability_multiplier,
          recency: finding.recency_multiplier,
          corroboration: finding.corroboration_multiplier,
          entityMatch: finding.entity_match_multiplier,
          jurisdiction: finding.jurisdiction_multiplier
        },
        sourceLinks: (finding.source_links ?? []).map((link) => ({
          title: link.title,
          url: link.url,
          sourceName: link.source_name
        }))
      }))
    },
    keyTypologies,
    findings,
    typologyAssessments,
    geographyExposure: (data.geography_exposure ?? []).map((geo) => {
      const countryFindings = findings.filter((finding) => finding.jurisdiction === geo.country);
      return {
        country: geo.country,
        riskLevel: geo.risk_level,
        findingCount: geo.finding_count,
        highestSeverity: geo.risk_level === "Red" ? "High" : geo.risk_level === "Yellow" ? "Medium" : "Low",
        typologies: geo.top_typologies,
        sourceCount: geo.source_count,
        rationale: `${geo.explanation} Jurisdiction risk: ${geo.jurisdiction_risk_type}.`,
        findings: countryFindings.map((finding) => ({
          id: finding.id,
          title: finding.title,
          flag: finding.flag,
          severity: finding.severity,
          sourceLinks: finding.sourceLinks ?? []
        }))
      };
    }),
    timeline: (data.investigation_timeline ?? [])
      .map((event) => {
        const source = publicSources.find((item) => item.sourceName === event.source);
        const normalizedDate = normalizeDateToISO(event.date || source?.publishedAt || source?.rawPublishedAt);
        return {
          date: normalizedDate || "Unknown",
          displayDate: formatDateForDisplay(normalizedDate || event.date || source?.rawPublishedAt),
          title: event.event,
          typology: event.typology,
          flag: event.flag,
          source: event.source,
          sourceUrl: source?.url,
          jurisdiction: event.jurisdiction,
          description: event.summary
        };
      })
      .sort((a, b) => compareDatesDescending(a.date, b.date)),
    sourceAssessment:
      data.source_retrieval_status ||
      `Reviewed ${data.evidence?.length ?? 0} public-source evidence item(s).`,
    hallucinationChecks: (data.hallucination_checks ?? []).map((check) => ({
      label: check.label,
      passed: Boolean(check.passed),
      detail: check.detail
    })),
    recommendedAction: normalizeRecommendedAction(data.recommendation, data.risk_score_breakdown.final_rating),
    followUpQuestions: data.follow_up_questions?.length
      ? data.follow_up_questions
      : ["Validate entity identifiers and official source records before a final compliance decision."],
    humanReviewRequired: true,
    sourcesReviewed: new Set((data.evidence ?? []).map((item) => item.source_name)).size,
    publicSources
  };
}

function buildNoFindingInvestigation(
  data: InvestigationResponse,
  fallbackName: string,
  fallbackEntityType: EntityType,
  fallbackJurisdiction: string,
  publicSources: EnhancedInvestigation["publicSources"]
): EnhancedInvestigation {
  return {
    entityProfile: {
      name: data.company || fallbackName,
      entityType: fallbackEntityType,
      entityTypeConfidence: data.entity_inference
        ? {
            value: fallbackEntityType,
            confidencePercent: data.entity_inference.confidence,
            confidenceLabel: data.entity_inference.confidence_label,
            rationale: data.entity_inference.rationale
          }
        : undefined,
      jurisdiction: fallbackJurisdiction || "Unknown",
      jurisdictionConfidence: data.jurisdiction_inference
        ? {
            value: data.jurisdiction_inference.primary_jurisdiction || "Unknown",
            confidencePercent: data.jurisdiction_inference.confidence,
            confidenceLabel: data.jurisdiction_inference.confidence_label,
            rationale: data.jurisdiction_inference.rationale
          }
        : undefined,
      knownAliases: [],
      ambiguityWarning: data.ambiguity_warning ?? "",
      mode: data.mode ?? "No Relevant Public Sources"
    },
    executiveSummary: data.summary || "No relevant public source results found.",
    riskScore: {
      totalScore: data.risk_score ?? 0,
      finalRiskRating: "Low",
      appliedIndicators: [],
      positiveMitigatingIndicators: [],
      autoEscalationTriggers: [],
      confidenceLevel: data.confidence >= 70 ? "High" : data.confidence >= 40 ? "Medium" : "Low",
      confidencePercent: data.confidence ?? 0,
      explanation: data.reasoning || "No evidence-supported findings were extracted from retrieved public sources.",
      appliedFindingBreakdown: []
    },
    keyTypologies: [],
    findings: [],
    typologyAssessments: riskTypologies.map((typology) => ({
      typologyId: typology.id,
      name: typology.name,
      detectionStatus: "Not Detected",
      severity: "Low",
      supportingEvidence: [],
      sourceCount: 0,
      explanation: "No source-supported finding in current evidence.",
      suggestedFollowUps: typology.suggestedFollowUps
    })),
    geographyExposure: [],
    timeline: [],
    sourceAssessment: data.source_retrieval_status || "No relevant public source results found.",
    hallucinationChecks: (data.hallucination_checks ?? []).map((check) => ({
      label: check.label,
      passed: Boolean(check.passed),
      detail: check.detail
    })),
    recommendedAction: "Monitor",
    followUpQuestions: data.follow_up_questions ?? [],
    humanReviewRequired: true,
    sourcesReviewed: publicSources?.length ?? 0,
    publicSources
  };
}

function normalizeSourceType(value?: string): InvestigationFinding["sourceType"] {
  const allowed: InvestigationFinding["sourceType"][] = [
    "Official",
    "Regulatory",
    "Court",
    "Law Enforcement",
    "Sanctions List",
    "Major Media",
    "Local Media",
    "NGO",
    "Company Disclosure",
    "Unverified"
  ];
  return allowed.includes(value as InvestigationFinding["sourceType"]) ? value as InvestigationFinding["sourceType"] : "Unverified";
}

function normalizeEntityType(value?: string): EntityType {
  const allowed: EntityType[] = [
    "Company",
    "Individual",
    "Financial Institution",
    "Payment / E-money Firm",
    "Fintech",
    "Fintech / Payment Company",
    "Crypto Company",
    "Charity / NGO",
    "Government-related Entity",
    "Trust / Foundation",
    "Unknown"
  ];
  return allowed.includes(value as EntityType) ? value as EntityType : "Unknown";
}

function normalizeAllegationStatus(value: string): InvestigationFinding["allegationStatus"] {
  const allowed: InvestigationFinding["allegationStatus"][] = [
    "Rumor",
    "Unverified Allegation",
    "Allegation",
    "Investigation",
    "Charge",
    "Civil Litigation",
    "Regulatory Action",
    "Conviction",
    "Enforcement",
    "Sanctions Match",
    "Cleared",
    "Unknown"
  ];
  return allowed.includes(value as InvestigationFinding["allegationStatus"]) ? value as InvestigationFinding["allegationStatus"] : "Unknown";
}

function normalizeRecommendedAction(recommendation: string, rating: RiskRating): EnhancedInvestigation["recommendedAction"] {
  if (recommendation === "Escalate") return rating === "Critical" ? "Senior Review" : "Escalate";
  if (recommendation === "Enhanced Due Diligence") return "Enhanced Due Diligence";
  if (recommendation === "Review") return "Monitor";
  if (recommendation === "Reject") return "Senior Review";
  return "Close";
}
