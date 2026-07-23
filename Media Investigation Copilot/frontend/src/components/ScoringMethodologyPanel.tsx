import { BookOpen, Calculator, ShieldCheck } from "lucide-react";

import { typologyById } from "@/data/riskTypologies";
import type { EnhancedInvestigation } from "@/types/investigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const baseTypologyWeights: Record<string, number> = {
  sanctions_exposure: 35,
  sanctions_evasion: 35,
  terrorist_financing: 35,
  organized_crime: 28,
  human_trafficking: 28,
  regulatory_enforcement: 26,
  money_laundering: 25,
  corruption_bribery: 22,
  fraud: 20,
  payment_firm_money_transmitter_risk: 20,
  safeguarding_client_money_weakness: 18,
  shell_company: 18,
  cash_structuring: 18,
  smurfing: 18,
  governance_ownership_weakness: 16,
  corporate_layering: 15,
  trade_based_ml: 15,
  high_risk_geography: 14,
  crypto_financial_crime: 14,
  pep_exposure: 12,
  tax_evasion: 12,
  negative_litigation: 10,
  reputational_adverse_media: 8
};

const multiplierRows = [
  ["Source reliability", "High 1.20, Medium 1.00, Low 0.60"],
  ["Evidence status", "Sanctions Match 1.45, Conviction 1.35, Enforcement 1.30, Regulatory Action 1.25, Charge 1.15, Investigation 1.05, Civil Litigation 0.85, Allegation 0.75, Unverified 0.50, Rumor 0.25, Cleared -0.50"],
  ["Evidence strength", "Strong 1.15, Moderate 1.00, Weak 0.60, Insufficient 0.20"],
  ["Recency", "0-1 year 1.00, 1-3 years 0.85, 3-5 years 0.65, over 5 years 0.40, unknown 0.75"],
  ["Corroboration", "Official/regulatory 1.20, three or more sources 1.15, two sources 1.00, one source 0.75, duplicate only 0.50"],
  ["Entity match", "High 1.00, medium 0.75, low 0.40"],
  ["Jurisdiction", "FATF call for action 1.25, FATF increased monitoring 1.15, sanctions-sensitive 1.20, standard/unknown 1.00"]
];

const patternBonusRows = [
  ["Payment Firm + Regulatory Enforcement + Safeguarding Weakness", "+15"],
  ["Sanctions Exposure + Shell Company + High-Risk Geography", "+15"],
  ["Fraud + Regulatory Action + Repeated Adverse Media", "+12"],
  ["PEP + Corruption + High-Risk Geography", "+12"],
  ["Crypto + Sanctions + Money Laundering", "+15"]
];

function confidenceBreakdown(investigation: EnhancedInvestigation) {
  const sourceCoverage = Math.min((investigation.publicSources?.length ?? 0) * 8, 25);
  const highReliability = investigation.publicSources?.filter((source) => source.sourceReliability === "High").length ?? 0;
  const sourceReliability = Math.round(((investigation.publicSources?.length ? highReliability / investigation.publicSources.length : 0) * 20));
  const uniqueFindingSources = new Set(investigation.findings.map((finding) => finding.sourceName)).size;
  const corroboration = uniqueFindingSources >= 3 ? 15 : uniqueFindingSources === 2 ? 10 : uniqueFindingSources === 1 ? 5 : 0;
  const entityInference = Math.round(((investigation.entityProfile.entityTypeConfidence?.confidencePercent ?? 0) / 100) * 15);
  const jurisdictionInference = Math.round(((investigation.entityProfile.jurisdictionConfidence?.confidencePercent ?? 0) / 100) * 10);
  const recentFindings = investigation.findings.filter((finding) => finding.sourceDate && finding.sourceDate !== "Unknown").length;
  const recency = recentFindings ? 10 : 4;
  const subtotal = sourceCoverage + sourceReliability + corroboration + entityInference + jurisdictionInference + recency;
  const penalties = Math.max(0, subtotal - investigation.riskScore.confidencePercent);
  const penaltyReasons = [
    investigation.entityProfile.ambiguityWarning ? "Entity or jurisdiction inference warning is present." : "",
    uniqueFindingSources <= 1 && investigation.findings.length ? "Only one independent source supports scored findings." : "",
    highReliability === 0 && investigation.findings.length ? "No high-reliability source supports the current findings." : ""
  ].filter(Boolean);

  return {
    sourceCoverage,
    sourceReliability,
    corroboration,
    entityInference,
    jurisdictionInference,
    recency,
    penalties,
    penaltyReasons
  };
}

export function ScoringMethodologyPanel({ investigation }: { investigation: EnhancedInvestigation }) {
  const breakdown = confidenceBreakdown(investigation);
  const appliedPatternBonus = investigation.riskScore.appliedFindingBreakdown?.length ? investigation.riskScore.totalScore : 0;

  return (
    <Card>
      <CardHeader className="border-b bg-secondary/50">
        <CardTitle>How Scoring Works</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border bg-background p-4">
            <p className="flex items-center gap-2 font-display font-semibold"><Calculator className="h-4 w-4 text-primary" />Weighted Risk Score</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Each evidence-supported finding maps to AFC/Fraud typologies. Base typology weights are multiplied by source reliability,
              status, evidence strength, recency, corroboration, entity match, and jurisdiction risk. The final score is capped at 100.
            </p>
          </div>
          <div className="rounded-lg border bg-background p-4">
            <p className="flex items-center gap-2 font-display font-semibold"><ShieldCheck className="h-4 w-4 text-primary" />Confidence Score</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Confidence measures reliability of the result, separate from risk. A high-risk case may have medium confidence if evidence is severe but limited.
            </p>
          </div>
          <div className="rounded-lg border bg-background p-4">
            <p className="flex items-center gap-2 font-display font-semibold"><BookOpen className="h-4 w-4 text-primary" />Human Review</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              The model prioritizes analyst review. It does not make final compliance decisions or invent findings when sources are unavailable.
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-background p-4 text-sm leading-6">
          <p className="font-display font-semibold">Formula</p>
          <pre className="mt-2 whitespace-pre-wrap font-sans text-muted-foreground">{`Adjusted Finding Score =
Base Typology Weight x Source Reliability x Evidence Status x Evidence Strength x Recency x Corroboration x Entity Match x Jurisdiction

Final Risk Score =
Sum of Adjusted Finding Scores + Pattern Bonus + Sector Risk Bonus - Mitigating Factors`}</pre>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <MethodTable
            title="Risk Rating Thresholds"
            rows={[
              ["0-19", "Low"],
              ["20-39", "Moderate"],
              ["40-69", "High"],
              ["70-100", "Critical"]
            ]}
          />
          <MethodTable title="Multiplier Summary" rows={multiplierRows} />
        </div>

        <MethodTable
          title="Base Typology Weights"
          rows={Object.entries(baseTypologyWeights).map(([id, weight]) => [typologyById[id]?.name ?? id, String(weight)])}
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <MethodTable title="Pattern Bonus Rules" rows={patternBonusRows} />
          <div className="rounded-lg border bg-background p-4">
            <p className="font-display font-semibold">Current Pattern / Override Status</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant={investigation.riskScore.autoEscalationTriggers.length ? "red" : "secondary"}>
                {investigation.riskScore.autoEscalationTriggers.length ? "Override applied" : "No override applied"}
              </Badge>
              <Badge variant={appliedPatternBonus ? "orange" : "secondary"}>
                Pattern bonus: {investigation.riskScore.appliedFindingBreakdown?.length ? "See score explanation" : "None"}
              </Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Override rules ensure severe confirmed events receive appropriate escalation. Examples include high-reliability sanctions matches,
              terrorist financing, official regulatory restrictions, and financial-crime convictions. Ratings may be capped when all evidence is weak,
              old, low reliability, or entity match confidence is low.
            </p>
            {investigation.riskScore.autoEscalationTriggers.length ? (
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {investigation.riskScore.autoEscalationTriggers.map((trigger) => <li key={trigger}>- {trigger}</li>)}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">No pattern bonus or override is explicitly flagged for this investigation.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-background p-4">
          <p className="font-display font-semibold">Confidence Breakdown</p>
          <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
            <ScoreLine label="Source Coverage" value={breakdown.sourceCoverage} max={25} />
            <ScoreLine label="Source Reliability" value={breakdown.sourceReliability} max={20} />
            <ScoreLine label="Corroboration" value={breakdown.corroboration} max={15} />
            <ScoreLine label="Entity Inference" value={breakdown.entityInference} max={15} />
            <ScoreLine label="Jurisdiction Inference" value={breakdown.jurisdictionInference} max={10} />
            <ScoreLine label="Recency" value={breakdown.recency} max={10} />
            <ScoreLine label="Limitation Penalties" value={-breakdown.penalties} max={0} />
            <ScoreLine label="Final Confidence" value={investigation.riskScore.confidencePercent} max={100} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="secondary">Label: {investigation.riskScore.confidenceLevel}</Badge>
            <Badge variant="secondary">0-39 Low</Badge>
            <Badge variant="secondary">40-69 Medium</Badge>
            <Badge variant="secondary">70-100 High</Badge>
          </div>
          {breakdown.penaltyReasons.length ? (
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              {breakdown.penaltyReasons.map((reason) => <li key={reason}>Penalty signal: {reason}</li>)}
            </ul>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function MethodTable({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-background">
      <div className="border-b bg-secondary/60 px-4 py-3 font-display font-semibold">{title}</div>
      <div className="max-h-72 overflow-auto">
        <table className="w-full text-left text-sm">
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={`${title}-${label}`} className="border-b last:border-b-0">
                <td className="p-3 font-medium">{label}</td>
                <td className="p-3 text-muted-foreground">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScoreLine({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="flex items-center justify-between rounded-md border bg-card px-3 py-2">
      <span>{label}</span>
      <span className="font-semibold">{value} {max ? `/ ${max}` : ""}</span>
    </div>
  );
}
