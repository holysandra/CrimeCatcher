import {
  buildGeographyExposure,
  buildHallucinationChecks,
  buildTimeline,
  buildTypologyAssessments,
  calculateRiskScore,
  recommendedActionFor
} from "@/utils/riskScoring";
import type { EnhancedInvestigation, EntityType, InvestigationFinding } from "@/types/investigation";

type DemoCaseSeed = {
  id: string;
  label: string;
  entityName: string;
  entityType: EntityType;
  jurisdiction: string;
  summary: string;
  findings: InvestigationFinding[];
  aliases?: string[];
};

const demoSeeds: DemoCaseSeed[] = [
  {
    id: "low-public-company",
    label: "Low-risk public company",
    entityName: "Northstar Public Utilities plc",
    entityType: "Company",
    jurisdiction: "United Kingdom",
    summary:
      "Synthetic review identified a transparent public company profile with audited disclosures, clear ownership, and no material adverse media across reviewed sources.",
    aliases: ["Northstar Utilities"],
    findings: [
      {
        id: "low-1",
        title: "Audited public disclosures support transparent profile",
        summary: "Annual filings and audited disclosures provide clear ownership, governance, and operating activity.",
        typologyIds: ["reputational_adverse_media"],
        indicatorRuleIds: ["audited_public_company", "transparent_ownership", "strong_governance"],
        flag: "Green",
        severity: "Low",
        sourceName: "Synthetic Company Disclosure",
        sourceType: "Company Disclosure",
        sourceReliability: "Medium",
        sourceDate: "2026-03-15",
        jurisdiction: "United Kingdom",
        evidenceStrength: "Strong",
        allegationStatus: "Cleared",
        weight: -18,
        rationale: "Public disclosures and governance materials are mitigating indicators."
      },
      {
        id: "low-2",
        title: "No relevant adverse media found in synthetic public-source review",
        summary: "Search results did not identify sanctions, fraud, enforcement, or credible AML concerns.",
        typologyIds: ["reputational_adverse_media"],
        indicatorRuleIds: ["no_adverse_media"],
        flag: "Green",
        severity: "Low",
        sourceName: "Synthetic Open Source Review",
        sourceType: "Major Media",
        sourceReliability: "Medium",
        sourceDate: "2026-06-01",
        jurisdiction: "United Kingdom",
        evidenceStrength: "Moderate",
        allegationStatus: "Cleared",
        weight: -10,
        rationale: "No relevant adverse media was identified across reviewed synthetic sources."
      }
    ]
  },
  {
    id: "moderate-fintech",
    label: "Moderate-risk fintech",
    entityName: "BlueBridge Payments Ltd",
    entityType: "Fintech / Payment Company",
    jurisdiction: "Singapore",
    summary:
      "Synthetic review identified a fintech with a regulatory warning, customer fraud complaints, and limited high-risk corridor exposure. No sanctions or criminal conviction indicators were found.",
    aliases: ["BlueBridge Pay"],
    findings: [
      {
        id: "mod-1",
        title: "Regulatory warning on customer fraud controls",
        summary: "A payment regulator issued a warning about customer fraud complaint handling and remediation.",
        typologyIds: ["regulatory_enforcement", "fraud"],
        indicatorRuleIds: ["regulatory_enforcement", "fraud_allegation"],
        flag: "Red",
        severity: "High",
        sourceName: "Synthetic Payment Regulator Notice",
        sourceType: "Regulatory",
        sourceReliability: "High",
        sourceDate: "2025-09-20",
        jurisdiction: "Singapore",
        evidenceStrength: "Strong",
        allegationStatus: "Enforcement",
        weight: 25,
        rationale: "Official regulatory warning supports elevated but not sanctions-level risk."
      },
      {
        id: "mod-2",
        title: "Customer complaints reference account takeover fraud",
        summary: "Major media described repeated consumer complaints involving account takeover and reimbursement disputes.",
        typologyIds: ["fraud", "reputational_adverse_media"],
        indicatorRuleIds: ["repeated_adverse_media"],
        flag: "Yellow",
        severity: "Medium",
        sourceName: "Synthetic Major Media",
        sourceType: "Major Media",
        sourceReliability: "Medium",
        sourceDate: "2025-12-04",
        jurisdiction: "Singapore",
        evidenceStrength: "Moderate",
        allegationStatus: "Allegation",
        weight: 10,
        rationale: "Repeated media complaints indicate conduct risk but require corroboration."
      },
      {
        id: "mod-3",
        title: "Limited high-risk corridor exposure",
        summary: "The entity processes remittances involving a higher-risk corridor but has documented controls.",
        typologyIds: ["high_risk_geography"],
        indicatorRuleIds: ["high_risk_geography"],
        flag: "Yellow",
        severity: "Medium",
        sourceName: "Synthetic Transaction Corridor Review",
        sourceType: "Company Disclosure",
        sourceReliability: "Medium",
        sourceDate: "2026-01-18",
        jurisdiction: "Philippines",
        evidenceStrength: "Moderate",
        allegationStatus: "Unknown",
        weight: 12,
        rationale: "Geography exposure is relevant, but no sanctions or confirmed criminal link is present."
      },
      {
        id: "mod-4",
        title: "Ownership and licensing records are transparent",
        summary: "Licensing documents and ownership disclosures identify directors and beneficial owners.",
        typologyIds: ["shell_company"],
        indicatorRuleIds: ["transparent_ownership"],
        flag: "Green",
        severity: "Low",
        sourceName: "Synthetic Licensing Register",
        sourceType: "Official",
        sourceReliability: "High",
        sourceDate: "2026-02-02",
        jurisdiction: "Singapore",
        evidenceStrength: "Strong",
        allegationStatus: "Cleared",
        weight: -5,
        rationale: "Transparent ownership mitigates shell-company concern."
      }
    ]
  },
  {
    id: "critical-private-company",
    label: "Critical private company",
    entityName: "Orion Meridian Trading LLC",
    entityType: "Company",
    jurisdiction: "United Arab Emirates",
    summary:
      "Synthetic review identified a private trading company with opaque ownership, related entities in higher-risk jurisdictions, sanctions-evasion adverse media, and fraud allegations. Human escalation is required.",
    aliases: ["Orion Meridian", "OM Trading"],
    findings: [
      {
        id: "crit-1",
        title: "Sanctions-evasion concern involving related-party network",
        summary: "A regulatory source described suspected use of related entities to route restricted payments.",
        typologyIds: ["sanctions_evasion", "sanctions_exposure", "corporate_layering"],
        indicatorRuleIds: ["sanctions_evasion_concern"],
        flag: "Red",
        severity: "Critical",
        sourceName: "Synthetic Sanctions Enforcement Bulletin",
        sourceType: "Regulatory",
        sourceReliability: "High",
        sourceDate: "2026-04-11",
        jurisdiction: "United Arab Emirates",
        evidenceStrength: "Strong",
        allegationStatus: "Investigation",
        weight: 30,
        rationale: "High-reliability regulatory source supports sanctions-evasion concern."
      },
      {
        id: "crit-2",
        title: "Opaque ownership and nominee director indicators",
        summary: "Corporate registry review identified nominee directors and limited evidence of operating activity.",
        typologyIds: ["shell_company", "corporate_layering"],
        indicatorRuleIds: ["shell_company_indicator", "complex_layering"],
        flag: "Yellow",
        severity: "High",
        sourceName: "Synthetic Corporate Registry Review",
        sourceType: "Official",
        sourceReliability: "High",
        sourceDate: "2026-02-22",
        jurisdiction: "British Virgin Islands",
        evidenceStrength: "Strong",
        allegationStatus: "Unknown",
        weight: 27,
        rationale: "Ownership opacity and complex layering increase beneficial ownership risk."
      },
      {
        id: "crit-3",
        title: "Fraud allegation from independent investigative media",
        summary: "Major media linked the entity to false invoices and related-party procurement concerns.",
        typologyIds: ["fraud", "trade_based_ml", "reputational_adverse_media"],
        indicatorRuleIds: ["fraud_allegation", "repeated_adverse_media"],
        flag: "Red",
        severity: "High",
        sourceName: "Synthetic Investigative Media",
        sourceType: "Major Media",
        sourceReliability: "Medium",
        sourceDate: "2025-10-08",
        jurisdiction: "Turkey",
        evidenceStrength: "Moderate",
        allegationStatus: "Allegation",
        weight: 28,
        rationale: "Independent adverse media supports fraud and trade-based laundering follow-up."
      },
      {
        id: "crit-4",
        title: "High-risk geography and corruption exposure",
        summary: "Related entities were connected to higher-risk corridors and procurement intermediaries.",
        typologyIds: ["high_risk_geography", "corruption_bribery"],
        indicatorRuleIds: ["high_risk_geography", "corruption_bribery_allegation"],
        flag: "Red",
        severity: "High",
        sourceName: "Synthetic NGO Procurement Report",
        sourceType: "NGO",
        sourceReliability: "Medium",
        sourceDate: "2024-07-12",
        jurisdiction: "Turkey",
        evidenceStrength: "Moderate",
        allegationStatus: "Allegation",
        weight: 30,
        rationale: "Geography and corruption indicators require enhanced due diligence and source validation."
      }
    ]
  }
];

export function getDemoCases() {
  return demoSeeds.map((seed) => ({ id: seed.id, label: seed.label, entityName: seed.entityName }));
}

export function buildDemoInvestigation(id: string): EnhancedInvestigation {
  const seed = demoSeeds.find((demo) => demo.id === id) ?? demoSeeds[1];
  return assembleInvestigation(seed);
}

export function buildSyntheticInvestigation(
  entityName: string,
  entityType: EntityType,
  jurisdiction: string,
  backendSummary?: string,
  backendFlags: string[] = []
): EnhancedInvestigation {
  const lowered = entityName.toLowerCase();
  const critical = lowered.includes("wirecard") || lowered.includes("orion") || backendFlags.some((flag) => /sanction|arrest|laundering/i.test(flag));
  const moderate = /fintech|pay|payment|crypto|exchange/i.test(entityName) || entityType.includes("Fintech") || entityType.includes("Crypto");
  const seed = critical ? demoSeeds[2] : moderate ? demoSeeds[1] : demoSeeds[0];
  return assembleInvestigation({
    ...seed,
    entityName,
    entityType,
    jurisdiction: jurisdiction || seed.jurisdiction,
    summary:
      backendSummary ||
      `Synthetic adverse media investigation generated for ${entityName}. Findings are based on public financial-crime typologies and deterministic demo logic.`
  });
}

function assembleInvestigation(seed: DemoCaseSeed): EnhancedInvestigation {
  const riskScore = calculateRiskScore(seed.findings);
  const typologyAssessments = buildTypologyAssessments(seed.findings);
  const keyTypologies = typologyAssessments
    .filter((assessment) => assessment.detectionStatus !== "Not Detected")
    .sort((a, b) => b.sourceCount - a.sourceCount)
    .slice(0, 6)
    .map((assessment) => assessment.name);
  const followUpQuestions = Array.from(
    new Set(typologyAssessments.flatMap((assessment) => assessment.suggestedFollowUps).slice(0, 10))
  );

  return {
    entityProfile: {
      name: seed.entityName,
      entityType: seed.entityType,
      jurisdiction: seed.jurisdiction,
      knownAliases: seed.aliases ?? [],
      ambiguityWarning:
        seed.entityName.split(" ").length <= 2
          ? "Entity name may match multiple subjects. Analyst should verify jurisdiction, registration number, address, and beneficial owner."
          : ""
    },
    executiveSummary: seed.summary,
    riskScore,
    keyTypologies,
    findings: seed.findings,
    typologyAssessments,
    geographyExposure: buildGeographyExposure(seed.findings),
    timeline: buildTimeline(seed.findings),
    sourceAssessment: `Reviewed ${seed.findings.length} synthetic public-source evidence item(s). Official, regulatory, and court-style sources are treated as higher reliability than media or unverified reporting.`,
    hallucinationChecks: buildHallucinationChecks(seed.findings),
    recommendedAction: recommendedActionFor(riskScore.finalRiskRating, seed.findings),
    followUpQuestions,
    humanReviewRequired: true,
    sourcesReviewed: new Set(seed.findings.map((finding) => finding.sourceName)).size
  };
}
