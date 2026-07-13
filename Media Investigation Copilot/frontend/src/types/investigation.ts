export type EntityType =
  | "Company"
  | "Individual"
  | "Financial Institution"
  | "Payment / E-money Firm"
  | "Fintech"
  | "Fintech / Payment Company"
  | "Crypto Company"
  | "Charity / NGO"
  | "Government-related Entity"
  | "Trust / Foundation"
  | "Unknown";

export type RiskRating = "Low" | "Moderate" | "High" | "Critical";
export type FlagColor = "Red" | "Yellow" | "Green";
export type Severity = "Low" | "Medium" | "High" | "Critical";
export type DetectionStatus = "Detected" | "Possible" | "Not Detected" | "Insufficient Evidence";
export type ConfidenceLevel = "Low" | "Medium" | "High";
export type EvidenceStrength = "Strong" | "Moderate" | "Weak" | "Insufficient";
export type AllegationStatus =
  | "Rumor"
  | "Unverified Allegation"
  | "Allegation"
  | "Investigation"
  | "Charge"
  | "Civil Litigation"
  | "Regulatory Action"
  | "Conviction"
  | "Enforcement"
  | "Sanctions Match"
  | "Cleared"
  | "Unknown";
export type SourceType =
  | "Official"
  | "Regulatory"
  | "Court"
  | "Law Enforcement"
  | "Sanctions List"
  | "Major Media"
  | "Local Media"
  | "NGO"
  | "Company Disclosure"
  | "Unverified";
export type SourceReliability = "High" | "Medium" | "Low";
export type RecommendedAction =
  | "Close"
  | "Monitor"
  | "Enhanced Due Diligence"
  | "Escalate"
  | "Sanctions Review"
  | "Senior Review";

export type RiskTypology = {
  id: string;
  name: string;
  description: string;
  exampleIndicators: string[];
  commonKeywords: string[];
  severityDefault: Severity;
  suggestedFollowUps: string[];
};

export type RiskIndicatorRule = {
  id: string;
  label: string;
  description: string;
  weight: number;
  severity: FlagColor;
  category: string;
  autoEscalate?: boolean;
};

export type InvestigationFinding = {
  id: string;
  title: string;
  summary: string;
  typologyIds: string[];
  indicatorRuleIds: string[];
  flag: FlagColor;
  severity: Severity;
  sourceName: string;
  sourceType: SourceType;
  sourceReliability: SourceReliability;
  rawSourceDate?: string;
  sourceDate: string;
  displayDate?: string;
  jurisdiction?: string;
  evidenceStrength: EvidenceStrength;
  allegationStatus: AllegationStatus;
  weight: number;
  rationale: string;
  sourceLinks?: {
    title: string;
    url: string;
    sourceName: string;
  }[];
};

export type PublicSource = {
  id: string;
  title: string;
  url: string;
  sourceName: string;
  sourceType: SourceType;
  sourceReliability: SourceReliability;
  rawPublishedAt?: string | null;
  publishedAt?: string | null;
  displayDate: string;
  provider?: string;
  summaryText: string;
  jurisdiction?: string;
  entityMatchConfidence: number;
};

export type InferenceDetail = {
  value: string;
  confidencePercent: number;
  confidenceLabel: ConfidenceLevel;
  rationale: string;
};

export type TypologyAssessment = {
  typologyId: string;
  name: string;
  detectionStatus: DetectionStatus;
  severity: Severity;
  supportingEvidence: string[];
  sourceCount: number;
  explanation: string;
  suggestedFollowUps: string[];
};

export type GeographyExposure = {
  country: string;
  countryCode?: string;
  riskLevel: FlagColor;
  riskRating?: RiskRating | "Unknown";
  findingCount: number;
  highestSeverity: Severity;
  typologies: string[];
  sourceCount: number;
  rationale: string;
  findings?: {
    id: string;
    title: string;
    flag: FlagColor;
    severity: Severity;
    sourceLinks: {
      title: string;
      url: string;
      sourceName: string;
    }[];
  }[];
};

export type InvestigationTimelineEvent = {
  date: string;
  displayDate: string;
  title: string;
  typology: string;
  flag: FlagColor;
  source: string;
  sourceUrl?: string;
  jurisdiction?: string;
  description: string;
};

export type RiskScoreResult = {
  totalScore: number;
  finalRiskRating: RiskRating;
  appliedIndicators: RiskIndicatorRule[];
  positiveMitigatingIndicators: RiskIndicatorRule[];
  autoEscalationTriggers: string[];
  confidenceLevel: ConfidenceLevel;
  confidencePercent: number;
  explanation: string;
  appliedFindingBreakdown?: {
    findingId: string;
    title: string;
    typology?: string;
    rawBaseWeight: number;
    adjustedScore: number;
    multipliers: Record<string, number>;
    sourceLinks: {
      title: string;
      url: string;
      sourceName: string;
    }[];
  }[];
};

export type HallucinationCheck = {
  label: string;
  passed: boolean;
  detail: string;
};

export type EntityProfile = {
  name: string;
  entityType: EntityType;
  entityTypeConfidence?: InferenceDetail;
  jurisdiction: string;
  jurisdictionConfidence?: InferenceDetail;
  knownAliases: string[];
  ambiguityWarning: string;
  mode?: string;
};

export type EnhancedInvestigation = {
  entityProfile: EntityProfile;
  executiveSummary: string;
  riskScore: RiskScoreResult;
  keyTypologies: string[];
  findings: InvestigationFinding[];
  typologyAssessments: TypologyAssessment[];
  geographyExposure: GeographyExposure[];
  timeline: InvestigationTimelineEvent[];
  sourceAssessment: string;
  hallucinationChecks: HallucinationCheck[];
  recommendedAction: RecommendedAction;
  followUpQuestions: string[];
  humanReviewRequired: boolean;
  sourcesReviewed: number;
  publicSources?: PublicSource[];
};
