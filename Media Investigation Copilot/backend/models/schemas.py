from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


RiskLevel = Literal["Low", "Medium", "High"]
Recommendation = Literal[
    "Approve",
    "Review",
    "Enhanced Due Diligence",
    "Escalate",
    "Reject",
]


class InvestigationRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=160)
    entity_type: Optional[str] = None
    jurisdiction: Optional[str] = None
    lookback_days: Optional[int] = Field(default=1095, ge=1, le=3650)


class AgentInvestigationRequest(BaseModel):
    """Request body for the Azure AI Foundry 4-agent workflow."""

    company: str = Field(..., min_length=2, max_length=160)


class TimelineEvent(BaseModel):
    year: str
    title: str
    description: str


class EntityGroups(BaseModel):
    people: List[str] = []
    companies: List[str] = []
    countries: List[str] = []
    banks: List[str] = []
    government_agencies: List[str] = []


class Article(BaseModel):
    title: str
    source: str
    date: str
    summary: str
    link: str
    content: Optional[str] = None


class EvidenceItem(BaseModel):
    id: str
    entity_name: str
    title: str
    summary: str
    source_name: str
    source_url: str
    source_domain: Optional[str] = None
    source_type: str
    source_reliability: Literal["High", "Medium", "Low"]
    raw_source_date: Optional[str] = None
    source_date: Optional[str] = None
    retrieved_at: str
    provider: str = "Other"
    jurisdiction: Optional[str] = None
    mentioned_countries: List[str] = []
    matched_keywords: List[str] = []
    extracted_risk_phrases: List[str] = []
    entity_match_confidence: int = Field(..., ge=0, le=100)
    duplicate_group_id: Optional[str] = None


class SourceLink(BaseModel):
    source_id: str
    title: str
    url: str
    source_name: str
    published_at: Optional[str] = None


class RiskFinding(BaseModel):
    id: str
    evidence_id: str
    source_ids: List[str] = []
    source_links: List[SourceLink] = []
    typology_id: str
    title: str
    description: str
    flag: Literal["Red", "Yellow", "Green"]
    base_weight: int
    adjusted_weight: int
    severity: Literal["Low", "Medium", "High", "Critical"]
    allegation_status: str
    source_reliability: Literal["High", "Medium", "Low"]
    source_reliability_multiplier: float
    recency_multiplier: float
    corroboration_multiplier: float
    entity_match_multiplier: float
    jurisdiction_multiplier: float
    rationale: str


class GeographyExposure(BaseModel):
    country: str
    risk_level: Literal["Red", "Yellow", "Green"]
    finding_count: int
    top_typologies: List[str] = []
    source_count: int
    jurisdiction_risk_type: str = "Unknown"
    explanation: str


class TimelineItem(BaseModel):
    date: str
    event: str
    source: str
    typology: str
    flag: Literal["Red", "Yellow", "Green"]
    severity: Literal["Low", "Medium", "High", "Critical"]
    jurisdiction: Optional[str] = None
    summary: str


class EntityInferenceResult(BaseModel):
    entity_type: str = "Unknown"
    confidence: int = Field(default=0, ge=0, le=100)
    confidence_label: Literal["Low", "Medium", "High"] = "Low"
    rationale: str = ""
    matched_signals: List[str] = []


class RelatedJurisdiction(BaseModel):
    jurisdiction: str
    confidence: int = Field(..., ge=0, le=100)
    evidence_count: int = 0
    matched_signals: List[str] = []


class JurisdictionInferenceResult(BaseModel):
    primary_jurisdiction: Optional[str] = None
    confidence: int = Field(default=0, ge=0, le=100)
    confidence_label: Literal["Low", "Medium", "High"] = "Low"
    related_jurisdictions: List[RelatedJurisdiction] = []
    rationale: str = ""


class RiskScoreBreakdown(BaseModel):
    total_score: int = Field(..., ge=0, le=100)
    final_rating: Literal["Low", "Moderate", "High", "Critical"]
    pattern_bonus: int = 0
    sector_risk_bonus: int = 0
    mitigating_factor_total: int = 0
    auto_escalation_triggers: List[str] = []
    explanation: str


class InvestigationResponse(BaseModel):
    company: str
    risk_score: int = Field(..., ge=0, le=100)
    risk_level: RiskLevel
    confidence: int = Field(..., ge=0, le=100)
    summary: str
    timeline: List[TimelineEvent]
    entities: EntityGroups
    flags: List[str]
    articles: List[Article]
    recommendation: Recommendation
    reasoning: str
    mode: Literal[
        "Live Public Source Retrieval",
        "No Relevant Public Sources",
    ] = "Live Public Source Retrieval"
    source_retrieval_status: str = ""
    evidence: List[EvidenceItem] = []
    risk_findings: List[RiskFinding] = []
    risk_score_breakdown: Optional[RiskScoreBreakdown] = None
    geography_exposure: List[GeographyExposure] = []
    investigation_timeline: List[TimelineItem] = []
    source_reliability_summary: Dict[str, int] = {}
    ambiguity_warning: str = ""
    follow_up_questions: List[str] = []
    hallucination_checks: List[Dict[str, Any]] = []
    entity_inference: Optional[EntityInferenceResult] = None
    jurisdiction_inference: Optional[JurisdictionInferenceResult] = None
    unique_source_count: int = 0
    duplicate_source_count: int = 0
