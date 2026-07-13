export type RiskLevel = "Low" | "Medium" | "High";

export type Recommendation =
  | "Approve"
  | "Review"
  | "Enhanced Due Diligence"
  | "Escalate"
  | "Reject";

export interface TimelineEvent {
  year: string;
  title: string;
  description: string;
}

export interface EntityGroups {
  people: string[];
  companies: string[];
  countries: string[];
  banks: string[];
  government_agencies: string[];
}

export interface Article {
  title: string;
  source: string;
  date: string;
  summary: string;
  link: string;
  content?: string;
}

export interface EvidenceItem {
  id: string;
  entity_name: string;
  title: string;
  summary: string;
  source_name: string;
  source_url: string;
  source_domain?: string;
  source_type: string;
  source_reliability: "High" | "Medium" | "Low";
  raw_source_date?: string;
  source_date?: string;
  retrieved_at: string;
  provider: string;
  jurisdiction?: string;
  mentioned_countries: string[];
  matched_keywords: string[];
  extracted_risk_phrases: string[];
  entity_match_confidence: number;
  duplicate_group_id?: string;
}

export interface RiskFinding {
  id: string;
  evidence_id: string;
  source_ids?: string[];
  source_links?: Array<{
    source_id: string;
    title: string;
    url: string;
    source_name: string;
    published_at?: string;
  }>;
  typology_id: string;
  title: string;
  description: string;
  flag: "Red" | "Yellow" | "Green";
  base_weight: number;
  adjusted_weight: number;
  severity: "Low" | "Medium" | "High" | "Critical";
  allegation_status: string;
  source_reliability: "High" | "Medium" | "Low";
  source_reliability_multiplier: number;
  recency_multiplier: number;
  corroboration_multiplier: number;
  entity_match_multiplier: number;
  jurisdiction_multiplier: number;
  rationale: string;
}

export interface RiskScoreBreakdown {
  total_score: number;
  final_rating: "Low" | "Moderate" | "High" | "Critical";
  pattern_bonus: number;
  sector_risk_bonus: number;
  mitigating_factor_total: number;
  auto_escalation_triggers: string[];
  explanation: string;
}

export interface GeographyExposureApi {
  country: string;
  risk_level: "Red" | "Yellow" | "Green";
  finding_count: number;
  top_typologies: string[];
  source_count: number;
  jurisdiction_risk_type: string;
  explanation: string;
}

export interface TimelineItemApi {
  date: string;
  event: string;
  source: string;
  typology: string;
  flag: "Red" | "Yellow" | "Green";
  severity: "Low" | "Medium" | "High" | "Critical";
  jurisdiction?: string;
  summary: string;
}

export interface EntityInferenceResult {
  entity_type: string;
  confidence: number;
  confidence_label: "Low" | "Medium" | "High";
  rationale: string;
  matched_signals: string[];
}

export interface RelatedJurisdictionApi {
  jurisdiction: string;
  confidence: number;
  evidence_count: number;
  matched_signals: string[];
}

export interface JurisdictionInferenceResult {
  primary_jurisdiction?: string | null;
  confidence: number;
  confidence_label: "Low" | "Medium" | "High";
  related_jurisdictions: RelatedJurisdictionApi[];
  rationale: string;
}

export interface InvestigationResponse {
  company: string;
  risk_score: number;
  risk_level: RiskLevel;
  confidence: number;
  summary: string;
  timeline: TimelineEvent[];
  entities: EntityGroups;
  flags: string[];
  articles: Article[];
  recommendation: Recommendation;
  reasoning: string;
  mode?: "Live Public Source Retrieval" | "No Relevant Public Sources";
  source_retrieval_status?: string;
  evidence?: EvidenceItem[];
  risk_findings?: RiskFinding[];
  risk_score_breakdown?: RiskScoreBreakdown;
  geography_exposure?: GeographyExposureApi[];
  investigation_timeline?: TimelineItemApi[];
  source_reliability_summary?: Record<string, number>;
  ambiguity_warning?: string;
  follow_up_questions?: string[];
  hallucination_checks?: Array<{ label: string; passed: boolean; detail: string }>;
  entity_inference?: EntityInferenceResult;
  jurisdiction_inference?: JurisdictionInferenceResult;
  unique_source_count?: number;
  duplicate_source_count?: number;
}
