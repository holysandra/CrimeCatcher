import { typologyById } from "@/data/riskTypologies";
import type { EnhancedInvestigation } from "@/types/investigation";

export function answerInvestigationQuestion(question: string, investigation: EnhancedInvestigation): string {
  const q = question.toLowerCase();
  const adverseFindings = investigation.findings.filter((finding) => finding.flag !== "Green");
  const redFindings = investigation.findings.filter((finding) => finding.flag === "Red");
  const sanctionsFindings = investigation.findings.filter((finding) =>
    finding.typologyIds.some((id) => id.includes("sanctions"))
  );
  const fraudFindings = investigation.findings.filter((finding) => finding.typologyIds.includes("fraud"));
  const strongestSources = [...investigation.findings]
    .filter((finding) => finding.sourceReliability === "High" || finding.evidenceStrength === "Strong")
    .slice(0, 4);
  const weakFindings = investigation.findings.filter((finding) =>
    ["Weak", "Insufficient"].includes(finding.evidenceStrength)
  );
  const topScoreFinding = [...investigation.findings].sort((a, b) => b.weight - a.weight)[0];

  if ((q.includes("why") && !q.includes("confidence") && !q.includes("country") && !q.includes("map") && !q.includes("date")) || q.includes("high risk") || q.includes("critical")) {
    return withSections(
      `The rating is driven by a weighted score of ${investigation.riskScore.totalScore} and ${redFindings.length} red flag(s).`,
      adverseFindings.slice(0, 4).map(formatFact),
      investigation.riskScore.explanation,
      `Human review should validate official records and identifiers before acting on the ${investigation.recommendedAction} recommendation.`
    );
  }

  if (q.includes("contributed") || q.includes("most")) {
    const top = [...investigation.findings].sort((a, b) => b.weight - a.weight).slice(0, 5);
    return top.length ? withSections("Top scoring findings:", top.map(formatFact), "Weights are additive with override rules for sanctions and severe confirmed misconduct.", "Analyst should confirm source reliability and recency.") : "Insufficient evidence in the current investigation data.";
  }

  if (q.includes("risk score") || q.includes("calculated") || q.includes("multiplier")) {
    const topBreakdown = investigation.riskScore.appliedFindingBreakdown?.[0];
    const multiplierText = topBreakdown
      ? Object.entries(topBreakdown.multipliers).sort((a, b) => b[1] - a[1])[0]
      : null;
    return withSections(
      `The weighted score is ${investigation.riskScore.totalScore}/100 and the rating is ${investigation.riskScore.finalRiskRating}.`,
      topScoreFinding ? [formatFact(topScoreFinding)] : [],
      `Adjusted scores use base typology weight x source reliability x evidence status x evidence strength x recency x corroboration x entity match x jurisdiction. ${multiplierText ? `The largest visible multiplier on the top row is ${multiplierText[0]} (${multiplierText[1]}).` : "No multiplier row is available for this case."}`,
      "Use the Risk Score Breakdown and How Scoring Works panels to inspect each factor and source link."
    );
  }

  if (q.includes("confidence")) {
    return withSections(
      `Confidence is ${investigation.riskScore.confidenceLevel} (${investigation.riskScore.confidencePercent}/100).`,
      adverseFindings.slice(0, 3).map(formatFact),
      "Confidence is separate from risk. It reflects source coverage, high-reliability source share, corroboration, entity inference, jurisdiction inference, recency, and penalties for ambiguity or limited sources.",
      "Check whether official sources, independent corroboration, and entity identifiers are strong enough for final analyst reliance."
    );
  }

  if (q.includes("country") || q.includes("map") || q.includes("highlight")) {
    const topCountry = investigation.geographyExposure[0];
    return topCountry
      ? withSections(
          `${topCountry.country} is highlighted because it has ${topCountry.findingCount} finding(s) and ${topCountry.sourceCount} source(s).`,
          adverseFindings.filter((finding) => finding.jurisdiction === topCountry.country).slice(0, 4).map(formatFact),
          `Mapped typologies: ${topCountry.typologies.join(", ") || "None"}. ${topCountry.rationale}`,
          "Review the map detail panel and supporting source links before relying on geography exposure."
        )
      : "Insufficient evidence in the retrieved investigation data.";
  }

  if (q.includes("date") || q.includes("timeline")) {
    const firstEvent = investigation.timeline[0];
    return firstEvent
      ? withSections(
          `The first timeline event uses ${firstEvent.displayDate} (${firstEvent.date}).`,
          adverseFindings.slice(0, 3).map(formatFact),
          "Dates are normalized to YYYY-MM-DD and displayed in a readable format. Unknown dates are placed at the bottom of the timeline.",
          "Use the source date debug panel to compare raw provider date, normalized date, and display date."
        )
      : "Insufficient evidence in the retrieved investigation data.";
  }

  if (q.includes("sanction")) {
    return sanctionsFindings.length ? withSections("Sanctions-related concerns found:", sanctionsFindings.map(formatFact), "Rules-based interpretation: sanctions exposure requires exact-match validation and ownership/control analysis.", "Route to sanctions review if identifiers match.") : "Insufficient evidence in the current investigation data.";
  }

  if (q.includes("fraud")) {
    return fraudFindings.length ? withSections("Fraud-related adverse media found:", fraudFindings.map(formatFact), "Rules-based interpretation: allegations should be separated from confirmed enforcement or convictions.", "Review court/regulatory records and management responses.") : "Insufficient evidence in the current investigation data.";
  }

  if (q.includes("strongest") || q.includes("source")) {
    return strongestSources.length ? withSections("Strongest sources:", strongestSources.map(formatFact), "Rules-based interpretation: official, regulatory, court, and major media sources carry higher reliability.", "Confirm official source links where possible.") : "Insufficient evidence in the current investigation data.";
  }

  if (q.includes("weak") || q.includes("unverified")) {
    return weakFindings.length ? withSections("Weak or unverified evidence:", weakFindings.map(formatFact), "Rules-based interpretation: weak evidence should not support a high-risk conclusion alone.", "Seek independent corroboration.") : "Insufficient evidence in the current investigation data.";
  }

  if (q.includes("follow")) {
    return investigation.followUpQuestions.map((questionItem) => `- ${questionItem}`).join("\n");
  }

  if (q.includes("summary")) {
    return withSections(
      investigation.executiveSummary,
      adverseFindings.slice(0, 3).map(formatFact),
      `Recommended action is ${investigation.recommendedAction}.`,
      "Final compliance decision remains human-in-the-loop."
    );
  }

  return withSections(
    "No evidence, no conclusion. I can answer from the current investigation data only.",
    adverseFindings.slice(0, 3).map(formatFact),
    `Detected typologies: ${investigation.keyTypologies.join(", ") || "None"}.`,
    "Ask about sanctions, fraud, strongest sources, weak evidence, top score contributors, or follow-up questions."
  );
}

function formatFact(finding: { title: string; sourceName: string; allegationStatus: string; typologyIds: string[]; rationale: string; displayDate?: string }) {
  const typology = typologyById[finding.typologyIds[0]]?.name ?? "General";
  return `${finding.title} (${typology}, ${finding.sourceName}, ${finding.displayDate ?? "Unknown date"}, ${finding.allegationStatus}): ${finding.rationale}`;
}

function withSections(factsIntro: string, facts: string[], interpretation: string, review: string) {
  return `Confirmed facts / sourced findings:
${factsIntro}
${facts.length ? facts.map((fact) => `- ${fact}`).join("\n") : "- Insufficient evidence in the current investigation data."}

Allegations:
${facts.filter((fact) => fact.includes("Allegation") || fact.includes("Investigation")).map((fact) => `- ${fact}`).join("\n") || "- No separate allegation-only findings identified."}

Rules-based interpretation:
${interpretation}

Recommended human review:
${review}`;
}
