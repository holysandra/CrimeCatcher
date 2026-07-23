/**
 * Types for the JSON report produced by the 4-agent Azure workflow.
 * Only the fields consumed by the agent dashboard are typed here; the raw
 * JSON may contain additional fields, which are preserved but ignored.
 */

export interface AgentSource {
  source_id?: string;
  article_id?: string;
  title: string;
  publisher: string;
  url: string;
  retrieval_date?: string;
  publication_date?: string;
  supported_information?: string;
  supports?: string;
}

export interface ProfileField {
  field_name: string;
  value: string | string[];
  evidence_note?: string;
  supporting_sources?: AgentSource[];
}

export interface AgentTimelineEvent {
  date: string;
  event_type: string;
  stage: string;
  description: string;
  supporting_sources?: AgentSource[];
}

export interface EventGeography {
  country?: string;
  city_or_region?: string;
  jurisdiction_or_authority?: string;
}

export interface RiskComponents {
  typology_score: number;
  stage_score: number;
  attribution_adjustment: number;
  recency_adjustment: number;
}

export interface Matter {
  matter_id: string;
  matter_summary: string;
  event_geography?: EventGeography;
  timeline?: AgentTimelineEvent[];
  current_stage: string;
  typologies: string[];
  attribution: string;
  confidence: string;
  risk_components?: RiskComponents;
  matter_risk_score: number;
  risk_level: string;
  risk_calculation?: string;
  key_evidence?: string;
  key_facts?: string;
  supporting_sources?: AgentSource[];
}

export interface FinalProfile {
  profile_type: string;
  sourced_profile_fields: ProfileField[];
  profile_summary: string;
}

export interface FocalGeography {
  primary_country?: string;
  jurisdiction?: string;
  business_locations?: string[];
  geography_confidence?: string;
  geography_reason?: string;
  supporting_sources?: AgentSource[];
}

export interface SubjectRiskAssessment {
  subject_risk_score: number;
  risk_level: string;
  highest_matter_risk_score: number;
  pattern_adjustment: number;
  risk_calculation: string;
  risk_driving_matter_ids: string[];
}

export interface PlainEnglishSummary {
  subject_profile_summary: string;
  geography_summary: string;
  overall_risk_assessment: string;
  timeline_summary: string;
  main_risk_drivers: string;
  confidence_note: string;
}

export interface HumanReview {
  human_review_required: boolean;
  review_reasons: string[];
}

export interface ExcludedMatter {
  matter_id: string;
  reason: string;
}

export interface SubjectReport {
  subject_id: string;
  matched_name: string;
  subject_type: string;
  match_status: string;
  identity_confidence: string;
  final_profile: FinalProfile;
  focal_geography: FocalGeography;
  subject_risk_assessment: SubjectRiskAssessment;
  matters: Matter[];
  excluded_matters?: ExcludedMatter[];
  plain_english_summary: PlainEnglishSummary;
  limitations?: string[];
  human_review?: HumanReview;
  final_conclusion: string;
}

export interface AgentReport {
  case_id: string;
  input_name: string;
  assessment_date: string;
  subject_reports: SubjectReport[];
  qa_status: string;
  qa_warnings?: string[];
}
