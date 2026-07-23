"""Validated response contract for the Azure adverse-media workflow."""

from typing import Any, List, Literal, Optional, Union

from pydantic import BaseModel, ConfigDict, Field


class WorkflowModel(BaseModel):
    """Allow future Azure workflow fields without breaking the dashboard."""

    model_config = ConfigDict(extra="allow")


class AgentSource(WorkflowModel):
    source_id: Optional[str] = None
    article_id: Optional[str] = None
    title: str
    publisher: str
    url: str
    retrieval_date: Optional[str] = None
    publication_date: Optional[str] = None
    supported_information: Optional[str] = None
    supports: Optional[str] = None


class ProfileField(WorkflowModel):
    field_name: str
    value: Union[str, List[str]]
    evidence_note: Optional[str] = None
    supporting_sources: List[AgentSource] = Field(default_factory=list)


class AgentTimelineEvent(WorkflowModel):
    date: str
    event_type: str
    stage: str
    description: str
    supporting_sources: List[AgentSource] = Field(default_factory=list)


class EventGeography(WorkflowModel):
    country: Optional[str] = None
    city_or_region: Optional[str] = None
    jurisdiction_or_authority: Optional[str] = None


class RiskComponents(WorkflowModel):
    typology_score: int
    stage_score: int
    attribution_adjustment: int
    recency_adjustment: int


class Matter(WorkflowModel):
    matter_id: str
    matter_summary: str
    event_geography: Optional[EventGeography] = None
    timeline: List[AgentTimelineEvent] = Field(default_factory=list)
    current_stage: str
    typologies: List[str] = Field(default_factory=list)
    attribution: str
    confidence: str
    risk_components: Optional[RiskComponents] = None
    matter_risk_score: int = Field(ge=0, le=100)
    risk_level: str
    risk_calculation: Optional[str] = None
    key_evidence: Optional[str] = None
    key_facts: Optional[str] = None
    supporting_sources: List[AgentSource] = Field(default_factory=list)


class FinalProfile(WorkflowModel):
    profile_type: str
    sourced_profile_fields: List[ProfileField] = Field(default_factory=list)
    profile_summary: str


class FocalGeography(WorkflowModel):
    primary_country: Optional[str] = None
    jurisdiction: Optional[str] = None
    business_locations: List[str] = Field(default_factory=list)
    geography_confidence: Optional[str] = None
    geography_reason: Optional[str] = None
    supporting_sources: List[AgentSource] = Field(default_factory=list)


class SubjectRiskAssessment(WorkflowModel):
    subject_risk_score: int = Field(ge=0, le=100)
    risk_level: str
    highest_matter_risk_score: int = Field(ge=0, le=100)
    pattern_adjustment: int
    risk_calculation: str
    risk_driving_matter_ids: List[str] = Field(default_factory=list)


class PlainEnglishSummary(WorkflowModel):
    subject_profile_summary: str
    geography_summary: str
    overall_risk_assessment: str
    timeline_summary: str
    main_risk_drivers: str
    confidence_note: str


class HumanReview(WorkflowModel):
    human_review_required: bool
    review_reasons: List[str] = Field(default_factory=list)


class ExcludedMatter(WorkflowModel):
    matter_id: str
    reason: str


class SubjectReport(WorkflowModel):
    subject_id: str
    matched_name: str
    subject_type: str
    match_status: str
    identity_confidence: str
    final_profile: FinalProfile
    focal_geography: FocalGeography
    subject_risk_assessment: SubjectRiskAssessment
    matters: List[Matter] = Field(default_factory=list)
    excluded_matters: List[ExcludedMatter] = Field(default_factory=list)
    plain_english_summary: PlainEnglishSummary
    limitations: List[str] = Field(default_factory=list)
    human_review: Optional[HumanReview] = None
    final_conclusion: str


class AgentReport(WorkflowModel):
    case_id: str
    input_name: str
    assessment_date: str
    subject_reports: List[SubjectReport] = Field(min_length=1)
    qa_status: str
    qa_warnings: List[str] = Field(default_factory=list)
    mode: Literal["live"] = "live"


def validate_agent_report(data: dict[str, Any]) -> dict[str, Any]:
    """Validate and normalize Azure JSON into the frontend report contract."""

    return AgentReport.model_validate(data).model_dump(mode="json")
