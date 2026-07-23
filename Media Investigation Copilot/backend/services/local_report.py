"""Adapt the non-Azure public-source investigation into the dashboard report."""

from __future__ import annotations

import re
from datetime import date
from typing import Any

from models.agent_report import validate_agent_report
from models.schemas import InvestigationResponse


def _source_from_evidence(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "source_id": item.get("id"),
        "title": item.get("title") or "Public source",
        "publisher": item.get("source_name") or item.get("provider") or "Unknown publisher",
        "url": item.get("source_url") or "",
        "retrieval_date": (item.get("retrieved_at") or "")[:10] or None,
        "publication_date": item.get("source_date") or item.get("raw_source_date"),
        "supported_information": item.get("summary") or "",
        "supports": item.get("summary") or "",
    }


def _risk_level(score: int) -> str:
    if score >= 80:
        return "Critical"
    if score >= 60:
        return "High"
    if score >= 40:
        return "Moderate"
    if score >= 20:
        return "Low"
    return "Minimal"


def _stage(allegation_status: str) -> str:
    value = allegation_status.lower()
    if value in {"conviction", "enforcement", "sanctions match"}:
        return "CONFIRMED"
    if value in {"charge", "investigation", "regulatory action"}:
        return "FORMAL"
    if value == "cleared":
        return "CLEARED"
    return "REPORTED"


def adapt_local_investigation(result: InvestigationResponse) -> dict[str, Any]:
    """Return the same report contract the current dashboard already renders."""

    data = result.model_dump(mode="json")
    evidence = data.get("evidence") or []
    findings = data.get("risk_findings") or []
    evidence_by_id = {item.get("id"): item for item in evidence}
    all_sources = [_source_from_evidence(item) for item in evidence]
    primary_sources = all_sources[:5]

    entity_inference = data.get("entity_inference") or {}
    jurisdiction_inference = data.get("jurisdiction_inference") or {}
    entity_type = entity_inference.get("entity_type") or "Unknown"
    jurisdiction = jurisdiction_inference.get("primary_jurisdiction") or "Unknown"

    profile_values = [
        (
            "legal_name",
            data["company"],
            "The submitted investigation name; analysts should validate the exact legal entity.",
        ),
        (
            "entity_type_or_legal_form",
            entity_type,
            entity_inference.get("rationale") or "Inferred from retrieved public-source signals.",
        ),
        (
            "operating_countries",
            sorted(
                {
                    item.get("jurisdiction")
                    for item in evidence
                    if item.get("jurisdiction")
                }
            )
            or [jurisdiction],
            jurisdiction_inference.get("rationale")
            or "Derived from jurisdictions mentioned in retrieved public sources.",
        ),
    ]
    profile_fields = [
        {
            "field_name": name,
            "value": value,
            "evidence_note": note,
            "supporting_sources": primary_sources,
        }
        for name, value, note in profile_values
    ]

    timeline_items = data.get("investigation_timeline") or []
    matters: list[dict[str, Any]] = []
    for index, finding in enumerate(findings, start=1):
        evidence_item = evidence_by_id.get(finding.get("evidence_id"), {})
        finding_sources = finding.get("source_links") or []
        sources = [
            {
                "source_id": link.get("source_id"),
                "article_id": link.get("source_id"),
                "title": link.get("title") or "Public source",
                "publisher": link.get("source_name") or "Unknown publisher",
                "url": link.get("url") or "",
                "publication_date": link.get("published_at"),
                "supports": finding.get("description") or "",
            }
            for link in finding_sources
        ]
        if not sources and evidence_item:
            sources = [_source_from_evidence(evidence_item)]

        related_timeline = [
            event
            for event in timeline_items
            if event.get("typology") == finding.get("typology_id")
            or event.get("event") == finding.get("title")
        ]
        if not related_timeline and evidence_item:
            related_timeline = [
                {
                    "date": evidence_item.get("source_date")
                    or evidence_item.get("raw_source_date")
                    or "Not stated",
                    "event": finding.get("allegation_status") or "Adverse media",
                    "summary": finding.get("description") or "",
                }
            ]
        stage = _stage(finding.get("allegation_status") or "")
        score = max(0, min(100, int(finding.get("adjusted_weight") or 0)))
        matters.append(
            {
                "matter_id": finding.get("id") or f"M{index:03d}",
                "matter_summary": finding.get("description") or finding.get("title") or "",
                "event_geography": {
                    "country": evidence_item.get("jurisdiction") or jurisdiction,
                    "jurisdiction_or_authority": evidence_item.get("jurisdiction") or jurisdiction,
                },
                "timeline": [
                    {
                        "date": event.get("date") or "Not stated",
                        "event_type": event.get("event") or finding.get("allegation_status") or "Other",
                        "stage": stage,
                        "description": event.get("summary") or finding.get("description") or "",
                        "supporting_sources": sources,
                    }
                    for event in related_timeline
                ],
                "current_stage": stage,
                "typologies": [finding.get("typology_id") or "Adverse media"],
                "attribution": "Direct",
                "confidence": finding.get("source_reliability") or "Low",
                "matter_risk_score": score,
                "risk_level": _risk_level(score),
                "risk_calculation": (
                    f"Base {finding.get('base_weight', 0)}; adjusted to {score} using source "
                    "reliability, recency, corroboration, entity-match, and jurisdiction multipliers."
                ),
                "key_evidence": finding.get("description") or "",
                "key_facts": finding.get("rationale") or "",
                "supporting_sources": sources,
            }
        )

    score_breakdown = data.get("risk_score_breakdown") or {}
    subject_score = int(score_breakdown.get("total_score") or data.get("risk_score") or 0)
    highest_matter = max((matter["matter_risk_score"] for matter in matters), default=0)
    pattern_adjustment = int(score_breakdown.get("pattern_bonus") or 0)
    failed_checks = [
        check
        for check in data.get("hallucination_checks") or []
        if not check.get("passed")
    ]
    warnings = [check.get("detail") or check.get("label") for check in failed_checks]
    if data.get("ambiguity_warning"):
        warnings.append(data["ambiguity_warning"])

    slug = re.sub(r"[^A-Za-z0-9]+", "-", data["company"]).strip("-").upper() or "CASE"
    today = date.today().isoformat()
    report = {
        "case_id": f"LOCAL-{today}-{slug}",
        "input_name": data["company"],
        "assessment_date": today,
        "subject_reports": [
            {
                "subject_id": "S001",
                "matched_name": data["company"],
                "subject_type": entity_type,
                "match_status": "Confirmed" if not data.get("ambiguity_warning") else "Possible",
                "identity_confidence": entity_inference.get("confidence_label") or "Low",
                "final_profile": {
                    "profile_type": entity_type,
                    "sourced_profile_fields": profile_fields,
                    "profile_summary": (
                        f"{data['company']} was assessed using {len(evidence)} retrieved public-source "
                        f"record(s). {entity_inference.get('rationale') or ''}"
                    ).strip(),
                },
                "focal_geography": {
                    "primary_country": jurisdiction,
                    "jurisdiction": jurisdiction,
                    "business_locations": [
                        item.get("jurisdiction")
                        for item in evidence
                        if item.get("jurisdiction")
                    ],
                    "geography_confidence": jurisdiction_inference.get("confidence_label") or "Low",
                    "geography_reason": jurisdiction_inference.get("rationale") or "",
                    "supporting_sources": primary_sources,
                },
                "subject_risk_assessment": {
                    "subject_risk_score": subject_score,
                    "risk_level": score_breakdown.get("final_rating") or _risk_level(subject_score),
                    "highest_matter_risk_score": highest_matter,
                    "pattern_adjustment": pattern_adjustment,
                    "risk_calculation": score_breakdown.get("explanation") or data.get("reasoning") or "",
                    "risk_driving_matter_ids": [
                        matter["matter_id"]
                        for matter in matters
                        if matter["matter_risk_score"] == highest_matter and highest_matter > 0
                    ],
                },
                "matters": matters,
                "excluded_matters": [],
                "plain_english_summary": {
                    "subject_profile_summary": data.get("summary") or "",
                    "geography_summary": (
                        f"Primary inferred jurisdiction: {jurisdiction}. "
                        f"{jurisdiction_inference.get('rationale') or ''}"
                    ).strip(),
                    "overall_risk_assessment": data.get("summary") or "",
                    "timeline_summary": (
                        f"{len(timeline_items)} dated investigation event(s) were assembled from "
                        "the retrieved evidence."
                    ),
                    "main_risk_drivers": ", ".join(data.get("flags") or [])
                    or "No source-supported adverse risk drivers were identified.",
                    "confidence_note": (
                        f"Evidence confidence score: {data.get('confidence', 0)}%. "
                        "Human verification of identity and source records is required."
                    ),
                },
                "limitations": [
                    value
                    for value in [
                        data.get("source_retrieval_status"),
                        data.get("ambiguity_warning"),
                        "This local workflow uses deterministic public-source rules and does not make a final compliance decision.",
                    ]
                    if value
                ],
                "human_review": {
                    "human_review_required": True,
                    "review_reasons": data.get("follow_up_questions")
                    or ["Validate official records and exact entity identifiers before acting."],
                },
                "final_conclusion": (
                    f"{data.get('summary') or ''} Recommended action: {data.get('recommendation') or 'Review'}."
                ).strip(),
            }
        ],
        "qa_status": "Passed with Warnings" if warnings else "Passed",
        "qa_warnings": warnings,
        "mode": "local",
    }
    return validate_agent_report(report)
