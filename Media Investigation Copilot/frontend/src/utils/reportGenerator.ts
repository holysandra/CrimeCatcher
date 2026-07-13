import type { EnhancedInvestigation } from "@/types/investigation";

export function generateCaseReport(investigation: EnhancedInvestigation): string {
  const topFindings = investigation.findings
    .slice(0, 8)
    .map((finding) => `- [${finding.flag}] ${finding.title} (${finding.sourceName}, ${finding.displayDate ?? finding.sourceDate}): ${finding.rationale}`)
    .join("\n");

  const typologies = investigation.keyTypologies.map((typology) => `- ${typology}`).join("\n");
  const timeline = investigation.timeline
    .map((event) => `- ${event.displayDate}: ${event.title} (${event.flag}, ${event.source})`)
    .join("\n");
  const geography = investigation.geographyExposure
    .map((geo) => `- ${geo.country}: ${geo.riskLevel}, ${geo.findingCount} finding(s), typologies: ${geo.typologies.join(", ")}`)
    .join("\n");
  const sourceLinks = (investigation.publicSources ?? [])
    .slice(0, 20)
    .map((source) => `- ${source.title} (${source.sourceName}, ${source.sourceReliability}, ${source.provider ?? "PublicSearch"}): ${source.url}`)
    .join("\n");

  return `AI Adverse Media Investigation Case Report

Human-in-the-loop notice: This tool supports analyst review and does not make final compliance decisions.

Executive Summary
${investigation.executiveSummary}

Inferred Entity Profile
- Name: ${investigation.entityProfile.name}
- Inferred type: ${investigation.entityProfile.entityType}
- Type confidence: ${investigation.entityProfile.entityTypeConfidence?.confidenceLabel ?? "Unknown"} (${investigation.entityProfile.entityTypeConfidence?.confidencePercent ?? 0}%)
- Inferred primary jurisdiction: ${investigation.entityProfile.jurisdiction}
- Jurisdiction confidence: ${investigation.entityProfile.jurisdictionConfidence?.confidenceLabel ?? "Unknown"} (${investigation.entityProfile.jurisdictionConfidence?.confidencePercent ?? 0}%)
- Ambiguity warning: ${investigation.entityProfile.ambiguityWarning || "No ambiguity warning generated."}

Source Coverage
- Sources reviewed: ${investigation.sourcesReviewed}
- Public source cards: ${investigation.publicSources?.length ?? 0}

Risk Assessment
- Final rating: ${investigation.riskScore.finalRiskRating}
- Weighted score: ${investigation.riskScore.totalScore}
- Confidence: ${investigation.riskScore.confidenceLevel} (${investigation.riskScore.confidencePercent}%)
- Recommended action: ${investigation.recommendedAction}
- Scoring logic: ${investigation.riskScore.explanation}
- Methodology: Adjusted Finding Score = Base Typology Weight x Source Reliability x Evidence Status x Evidence Strength x Recency x Corroboration x Entity Match x Jurisdiction. Final Risk Score = Sum of Adjusted Finding Scores + Pattern Bonus + Sector Risk Bonus - Mitigating Factors, capped at 100.
- Confidence methodology: Source coverage + reliability share + corroboration + entity inference + jurisdiction inference + recency - limitation penalties.

Key Typologies
${typologies || "- No typologies detected."}

Key Findings
${topFindings || "- No adverse findings."}

Timeline
${timeline || "- No timeline events."}

Geography Exposure
${geography || "- No geography exposure detected."}

Follow-up Questions
${investigation.followUpQuestions.map((question) => `- ${question}`).join("\n")}

Human Review Notes
- Validate identifiers, jurisdiction, registration number, ownership, and source recency.
- Confirm any sanctions, court, regulatory, or law enforcement references against official records.
- Treat allegations as allegations unless supported by enforcement, charge, conviction, or official finding.

Limitations
- Source retrieval may miss paywalled content, non-English sources, or records unavailable through public feeds.
- The deterministic model scores retrieved public text only and does not replace sanctions screening, KYC, or legal review.

Source Links
${sourceLinks || "- No source links returned."}`;
}

export function generateSeniorSummary(investigation: EnhancedInvestigation): string {
  const concerns = investigation.findings
    .filter((finding) => finding.flag !== "Green")
    .slice(0, 3)
    .map((finding) => `- ${finding.title}: ${finding.rationale}`)
    .join("\n");

  return `Senior Management Summary

${investigation.entityProfile.name} is rated ${investigation.riskScore.finalRiskRating} with a weighted score of ${investigation.riskScore.totalScore}. Recommended action: ${investigation.recommendedAction}.

Top concerns:
${concerns || "- No material adverse findings identified."}

Key evidence base: ${investigation.sourcesReviewed} source(s), confidence ${investigation.riskScore.confidenceLevel} (${investigation.riskScore.confidencePercent}%).

Open question: ${investigation.followUpQuestions[0] ?? "No open questions generated."}`;
}
