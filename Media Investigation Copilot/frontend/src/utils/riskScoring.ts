import { riskRuleById } from "@/data/riskScoring";
import { riskTypologies, typologyById } from "@/data/riskTypologies";
import { compareDatesDescending, getRecencyBucket } from "@/utils/dateUtils";
import type {
  ConfidenceLevel,
  FlagColor,
  GeographyExposure,
  HallucinationCheck,
  InvestigationFinding,
  InvestigationTimelineEvent,
  RiskIndicatorRule,
  RiskRating,
  RiskScoreResult,
  Severity,
  TypologyAssessment
} from "@/types/investigation";

const severityRank: Record<Severity, number> = { Low: 1, Medium: 2, High: 3, Critical: 4 };

export function classifyFlag(indicator: RiskIndicatorRule): FlagColor {
  return indicator.severity;
}

export function classifyRiskRating(score: number, findings: InvestigationFinding[]): RiskRating {
  const hasExactSanctions = findings.some((finding) => finding.indicatorRuleIds.includes("exact_sanctions_match"));
  if (hasExactSanctions) return "Critical";

  const hasFinancialCrimeConviction = findings.some(
    (finding) => finding.indicatorRuleIds.includes("criminal_conviction") && finding.allegationStatus === "Conviction"
  );
  const hasRelevantEnforcement = findings.some((finding) => finding.indicatorRuleIds.includes("regulatory_enforcement"));

  let rating: RiskRating = "Low";
  if (score >= 70) rating = "Critical";
  else if (score >= 40) rating = "High";
  else if (score >= 20) rating = "Moderate";

  if ((hasFinancialCrimeConviction || hasRelevantEnforcement) && rating === "Low") rating = "High";
  if ((hasFinancialCrimeConviction || hasRelevantEnforcement) && rating === "Moderate") rating = "High";

  const credibleRedFlag = findings.some(
    (finding) => finding.flag === "Red" && finding.sourceReliability !== "Low" && finding.evidenceStrength !== "Insufficient"
  );
  if ((rating === "High" || rating === "Critical") && !credibleRedFlag) return "Moderate";

  return rating;
}

export function calculateConfidence(sources: number, findings: InvestigationFinding[]): { level: ConfidenceLevel; percent: number } {
  const reliableSources = findings.filter((finding) => finding.sourceReliability === "High").length;
  const strongEvidence = findings.filter((finding) => finding.evidenceStrength === "Strong").length;
  const weakEvidence = findings.filter((finding) => ["Weak", "Insufficient"].includes(finding.evidenceStrength)).length;
  const base = Math.min(60, sources * 8);
  const score = Math.max(35, Math.min(98, base + reliableSources * 8 + strongEvidence * 6 - weakEvidence * 5));
  return { level: score >= 76 ? "High" : score >= 55 ? "Medium" : "Low", percent: score };
}

export function calculateRiskScore(findings: InvestigationFinding[]): RiskScoreResult {
  const uniqueFindings = dedupeFindings(findings);
  const totalScore = Math.max(0, uniqueFindings.reduce((sum, finding) => sum + finding.weight, 0));
  const appliedIndicators = uniqueFindings
    .flatMap((finding) => finding.indicatorRuleIds)
    .map((id) => riskRuleById[id])
    .filter((rule): rule is RiskIndicatorRule => Boolean(rule && rule.weight > 0));
  const positiveMitigatingIndicators = uniqueFindings
    .flatMap((finding) => finding.indicatorRuleIds)
    .map((id) => riskRuleById[id])
    .filter((rule): rule is RiskIndicatorRule => Boolean(rule && rule.weight < 0));
  const autoEscalationTriggers = appliedIndicators
    .filter((rule) => rule.autoEscalate)
    .map((rule) => rule.label);
  const finalRiskRating = classifyRiskRating(totalScore, uniqueFindings);
  const confidence = calculateConfidence(uniqueFindings.length, uniqueFindings);

  return {
    totalScore,
    finalRiskRating,
    appliedIndicators,
    positiveMitigatingIndicators,
    autoEscalationTriggers,
    confidenceLevel: confidence.level,
    confidencePercent: confidence.percent,
    explanation: `Weighted score is ${totalScore}. Rating is ${finalRiskRating} using public-source evidence, duplicate-source controls, reliability weighting, and human-review override rules.`
  };
}

export function buildTypologyAssessments(findings: InvestigationFinding[]): TypologyAssessment[] {
  return riskTypologies.map((typology) => {
    const related = findings.filter((finding) => finding.typologyIds.includes(typology.id));
    const highest = related.reduce<Severity>((current, finding) => {
      return severityRank[finding.severity] > severityRank[current] ? finding.severity : current;
    }, typology.severityDefault);
    const redOrStrong = related.some((finding) => finding.flag === "Red" || finding.evidenceStrength === "Strong");

    return {
      typologyId: typology.id,
      name: typology.name,
      detectionStatus: related.length === 0 ? "Not Detected" : redOrStrong ? "Detected" : "Possible",
      severity: related.length === 0 ? "Low" : highest,
      supportingEvidence: related.map((finding) => finding.title),
      sourceCount: new Set(related.map((finding) => finding.sourceName)).size,
      explanation:
        related.length === 0
          ? "No source-supported finding in the current investigation data."
          : `${related.length} source-supported finding(s) mapped to this typology.`,
      suggestedFollowUps: typology.suggestedFollowUps
    };
  });
}

export function buildGeographyExposure(findings: InvestigationFinding[]): GeographyExposure[] {
  const byCountry = new Map<string, InvestigationFinding[]>();
  findings.forEach((finding) => {
    const country = finding.jurisdiction || "Unknown";
    byCountry.set(country, [...(byCountry.get(country) ?? []), finding]);
  });

  return Array.from(byCountry.entries()).map(([country, countryFindings]) => {
    const highestSeverity = countryFindings.reduce<Severity>(
      (current, finding) => (severityRank[finding.severity] > severityRank[current] ? finding.severity : current),
      "Low"
    );
    const hasRed = countryFindings.some((finding) => finding.flag === "Red");
    const hasYellow = countryFindings.some((finding) => finding.flag === "Yellow");
    const typologies = Array.from(new Set(countryFindings.flatMap((finding) => finding.typologyIds)))
      .map((id) => typologyById[id]?.name ?? id)
      .slice(0, 4);

    return {
      country,
      riskLevel: hasRed ? "Red" : hasYellow ? "Yellow" : "Green",
      findingCount: countryFindings.length,
      highestSeverity,
      typologies,
      sourceCount: new Set(countryFindings.map((finding) => finding.sourceName)).size,
      rationale: hasRed
        ? "Exposure includes at least one red-flag source-supported finding."
        : hasYellow
          ? "Exposure includes unresolved or possible-risk indicators."
          : "Exposure is primarily supported by transparent or mitigating evidence."
    };
  });
}

export function buildTimeline(findings: InvestigationFinding[]): InvestigationTimelineEvent[] {
  return [...findings]
    .sort((a, b) => compareDatesDescending(a.sourceDate, b.sourceDate))
    .map((finding) => ({
      date: finding.sourceDate,
      displayDate: finding.displayDate ?? finding.sourceDate,
      title: finding.title,
      typology: typologyById[finding.typologyIds[0]]?.name ?? "General Risk",
      flag: finding.flag,
      source: finding.sourceName,
      jurisdiction: finding.jurisdiction,
      description: finding.summary
    }));
}

export function buildHallucinationChecks(findings: InvestigationFinding[]): HallucinationCheck[] {
  const hasSources = findings.every((finding) => finding.sourceName && finding.rationale);
  const labelsAllegations = findings.every((finding) => finding.allegationStatus !== "Unknown");
  const duplicateKeys = findings.map((finding) => `${finding.sourceName}-${finding.title}`);
  const deduped = new Set(duplicateKeys).size === duplicateKeys.length;
  const oldDownWeighted = findings
    .filter((finding) => getRecencyBucket(finding.sourceDate) === "over_5_years")
    .every((finding) => finding.weight <= 6 || finding.flag === "Green");

  return [
    { label: "Source-cited findings only", passed: hasSources, detail: "Every risk claim in the dashboard is tied to a named retrieved source." },
    { label: "Allegation vs confirmed status", passed: labelsAllegations, detail: "Findings display allegation, investigation, enforcement, conviction, or cleared status." },
    { label: "Human review required", passed: true, detail: "The tool supports analyst review and does not make final compliance decisions." },
    { label: "Duplicate source handling", passed: deduped, detail: "Duplicate syndicated items are treated as one evidence point in scoring." },
    { label: "Old articles down-weighted", passed: oldDownWeighted, detail: "Historical unresolved media receives lower weight unless severe or repeated." },
    { label: "Evidence strength rating", passed: findings.every((finding) => finding.evidenceStrength), detail: "Each finding is labeled Strong, Moderate, Weak, or Insufficient." }
  ];
}

export function recommendedActionFor(rating: RiskRating, findings: InvestigationFinding[]) {
  if (findings.some((finding) => finding.indicatorRuleIds.includes("exact_sanctions_match"))) return "Sanctions Review";
  if (rating === "Critical") return "Senior Review";
  if (rating === "High") return "Escalate";
  if (rating === "Moderate") return "Enhanced Due Diligence";
  if (findings.some((finding) => finding.flag === "Yellow")) return "Monitor";
  return "Close";
}

export function dedupeFindings(findings: InvestigationFinding[]) {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = `${finding.sourceName}-${finding.title}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
