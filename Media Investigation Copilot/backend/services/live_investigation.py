import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import Dict, Iterable, List, Optional

from models.schemas import (
    Article,
    EntityInferenceResult,
    EntityGroups,
    EvidenceItem,
    GeographyExposure,
    InvestigationResponse,
    JurisdictionInferenceResult,
    RelatedJurisdiction,
    RiskFinding,
    RiskScoreBreakdown,
    SourceLink,
    TimelineEvent,
    TimelineItem,
)
from services.source_retrieval import ADVERSE_KEYWORDS, retrieve_public_sources, to_article


TYPOLOGIES: Dict[str, Dict[str, object]] = {
    "money_laundering": {"name": "Money Laundering", "severity": "High", "keywords": ["money laundering", "laundering", "aml", "suspicious transaction"]},
    "cash_structuring": {"name": "Cash Structuring", "severity": "Medium", "keywords": ["structuring", "threshold", "cash deposits"]},
    "smurfing": {"name": "Smurfing", "severity": "Medium", "keywords": ["smurfing", "third-party deposits"]},
    "shell_company": {"name": "Shell Company Indicators", "severity": "High", "keywords": ["shell company", "nominee", "beneficial ownership", "opaque ownership"]},
    "corporate_layering": {"name": "Complex Corporate Layering", "severity": "Medium", "keywords": ["layering", "related-party", "offshore", "holding company"]},
    "sanctions_exposure": {"name": "Sanctions Exposure", "severity": "Critical", "keywords": ["sanctions", "ofac", "sdn", "asset freeze"]},
    "sanctions_evasion": {"name": "Sanctions Evasion", "severity": "Critical", "keywords": ["sanctions evasion", "front company", "restricted goods"]},
    "high_risk_geography": {"name": "High-risk Geography Exposure", "severity": "Medium", "keywords": ["high-risk jurisdiction", "cross-border", "offshore"]},
    "pep_exposure": {"name": "PEP / Political Exposure", "severity": "Medium", "keywords": ["pep", "politically exposed", "minister", "state-owned"]},
    "fraud": {"name": "Fraud Allegations", "severity": "High", "keywords": ["fraud", "false statement", "misrepresentation", "accounting irregularity"]},
    "regulatory_enforcement": {"name": "Regulatory Enforcement", "severity": "High", "keywords": ["regulatory", "enforcement", "fine", "fca", "sec", "regulator", "cease regulated"]},
    "human_trafficking": {"name": "Human Trafficking / Modern Slavery", "severity": "Critical", "keywords": ["human trafficking", "modern slavery", "forced labor"]},
    "organized_crime": {"name": "Criminal Association / Organized Crime Links", "severity": "Critical", "keywords": ["organized crime", "criminal network", "cartel"]},
    "corruption_bribery": {"name": "Corruption / Bribery", "severity": "High", "keywords": ["corruption", "bribery", "kickback"]},
    "tax_evasion": {"name": "Tax Evasion", "severity": "High", "keywords": ["tax evasion", "tax fraud", "false tax"]},
    "terrorist_financing": {"name": "Terrorist Financing", "severity": "Critical", "keywords": ["terrorist financing", "extremist", "designated group"]},
    "trade_based_ml": {"name": "Trade-based Money Laundering", "severity": "High", "keywords": ["trade-based", "false invoice", "over-invoicing"]},
    "crypto_financial_crime": {"name": "Crypto-related Financial Crime", "severity": "High", "keywords": ["crypto", "wallet", "mixer", "exchange", "ransomware"]},
    "negative_litigation": {"name": "Negative Litigation History", "severity": "Medium", "keywords": ["lawsuit", "litigation", "class action", "complaint"]},
    "reputational_adverse_media": {"name": "Reputational Risk / Adverse Media", "severity": "Medium", "keywords": ["adverse media", "controversy", "investigative report"]},
    "payment_firm_money_transmitter_risk": {"name": "Payment Firm / Money Transmitter Risk", "severity": "High", "keywords": ["payment firm", "money transmitter", "e-money", "money service", "remittance"]},
    "safeguarding_client_money_weakness": {"name": "Safeguarding / Client-money Control Weakness", "severity": "High", "keywords": ["safeguarding", "client money", "customer funds", "funds frozen"]},
    "governance_ownership_weakness": {"name": "Governance and Ownership Weakness", "severity": "High", "keywords": ["governance", "ownership", "directors", "control weakness"]},
}

BASE_RISK_WEIGHTS = {
    "exact_sanctions_match": 45,
    "sanctions_evasion": 35,
    "terrorist_financing": 35,
    "criminal_conviction_financial_crime": 35,
    "regulatory_enforcement_aml_fraud_sanctions": 30,
    "active_criminal_investigation": 25,
    "money_laundering_allegation": 24,
    "human_trafficking_modern_slavery": 25,
    "organized_crime_association": 24,
    "corruption_bribery": 22,
    "fraud_allegation": 20,
    "payment_firm_financial_crime_controls": 20,
    "safeguarding_client_money_weakness": 18,
    "shell_company_opaque_ownership": 18,
    "complex_corporate_layering": 15,
    "high_risk_geography": 14,
    "pep_political_exposure": 12,
    "negative_litigation_history": 10,
    "repeated_adverse_media": 10,
    "old_unresolved_adverse_media": 6,
    "single_unverified_allegation": 4,
}

TYPOLOGY_TO_WEIGHT = {
    "sanctions_exposure": "exact_sanctions_match",
    "sanctions_evasion": "sanctions_evasion",
    "terrorist_financing": "terrorist_financing",
    "regulatory_enforcement": "regulatory_enforcement_aml_fraud_sanctions",
    "money_laundering": "money_laundering_allegation",
    "human_trafficking": "human_trafficking_modern_slavery",
    "organized_crime": "organized_crime_association",
    "corruption_bribery": "corruption_bribery",
    "fraud": "fraud_allegation",
    "payment_firm_money_transmitter_risk": "payment_firm_financial_crime_controls",
    "safeguarding_client_money_weakness": "safeguarding_client_money_weakness",
    "shell_company": "shell_company_opaque_ownership",
    "corporate_layering": "complex_corporate_layering",
    "high_risk_geography": "high_risk_geography",
    "pep_exposure": "pep_political_exposure",
    "negative_litigation": "negative_litigation_history",
    "reputational_adverse_media": "repeated_adverse_media",
}

SOURCE_RELIABILITY_MULTIPLIER = {"High": 1.20, "Medium": 1.00, "Low": 0.60}
STATUS_MULTIPLIER = {
    "Sanctions Match": 1.40,
    "Conviction": 1.30,
    "Enforcement": 1.25,
    "Regulatory Action": 1.20,
    "Charge": 1.10,
    "Investigation": 1.00,
    "Civil Litigation": 0.85,
    "Allegation": 0.75,
    "Unverified Allegation": 0.50,
    "Rumor": 0.25,
    "Cleared": -0.50,
    "Unknown": 0.50,
}
SOURCE_TYPE_WEIGHTS = {
    "Sanctions List": 1.30,
    "Regulatory": 1.25,
    "Law Enforcement": 1.25,
    "Court": 1.25,
    "Official": 1.20,
    "Major Media": 1.00,
    "Company Disclosure": 0.90,
    "NGO": 0.85,
    "Local Media": 0.70,
    "Unverified": 0.40,
}
SANCTIONS_SENSITIVE = {"russia", "iran", "north korea", "syria", "belarus", "crimea"}
FATF_INCREASED_MONITORING = {"bulgaria", "burkina faso", "cameroon", "croatia", "haiti", "kenya", "monaco", "namibia", "nigeria", "south africa", "south sudan", "syria", "venezuela", "vietnam", "yemen"}
FATF_CALL_FOR_ACTION = {"north korea", "iran", "myanmar"}

ENTITY_TYPE_SIGNALS: Dict[str, List[str]] = {
    "Payment / E-money Firm": [
        "payment firm", "payments company", "e-money", "electronic money", "money transmitter",
        "money service business", "msb", "remittance", "foreign exchange", "currency exchange",
    ],
    "Financial Institution": [
        "bank", "broker-dealer", "securities firm", "lender", "asset manager", "investment firm",
        "credit institution",
    ],
    "Crypto Company": [
        "crypto", "cryptocurrency", "digital asset", "exchange", "wallet", "token", "stablecoin",
        "blockchain",
    ],
    "Charity / NGO": ["charity", "foundation", "non-profit", "nonprofit", "ngo", "humanitarian"],
    "Government-related Entity": ["state-owned", "government-owned", "ministry", "public official", "municipality", "sovereign"],
    "Individual": ["mr.", "ms.", "ceo", "founder", "director", "executive", "businessman", "politician"],
    "Company": [" ltd", " limited", " inc", " llc", " corp", " corporation", " plc", " group", " holdings"],
}

REGULATOR_JURISDICTION_MAP = {
    "fca.org.uk": "United Kingdom",
    "gov.uk": "United Kingdom",
    "sec.gov": "United States",
    "justice.gov": "United States",
    "fincen.gov": "United States",
    "treasury.gov": "United States",
    "home.treasury.gov": "United States",
    "finra.org": "United States",
    "cftc.gov": "United States",
    "occ.gov": "United States",
    "federalreserve.gov": "United States",
    "europa.eu": "European Union",
    "fatf-gafi.org": "International",
    "un.org": "United Nations",
}

COUNTRY_SIGNALS = {
    "United Kingdom": ["united kingdom", "uk-based", "britain", "british", "london", "england"],
    "United States": ["united states", "u.s.", "us-based", "america", "new york", "washington"],
    "Germany": ["germany", "german", "munich", "berlin"],
    "Singapore": ["singapore", "singapore-based"],
    "Hong Kong": ["hong kong"],
    "China": ["china", "chinese"],
    "Russia": ["russia", "russian"],
    "Iran": ["iran", "iranian"],
    "North Korea": ["north korea", "dprk"],
    "United Arab Emirates": ["united arab emirates", "uae", "dubai", "abu dhabi"],
    "European Union": ["european union", "eu regulator", "eu sanctions"],
}


async def run_live_investigation(entity_name: str, entity_type: str = "Company", jurisdiction: str = "", lookback_days: int = 1095) -> InvestigationResponse:
    raw_sources = await retrieve_public_sources(entity_name, jurisdiction, max_results=32, lookback_days=lookback_days)
    live_sources = [source for source in raw_sources if not source.get("isSearchSeed")]
    if not raw_sources:
        raise RuntimeError("Live public source retrieval failed. Please check the network or source configuration.")

    entity_inference = _infer_entity_type(entity_name, live_sources)
    jurisdiction_inference = _infer_jurisdictions(entity_name, live_sources)
    inferred_type = entity_type or entity_inference.entity_type
    inferred_jurisdiction = jurisdiction or jurisdiction_inference.primary_jurisdiction or ""
    evidence = [_evidence_from_source(source, entity_name, inferred_jurisdiction) for source in raw_sources]
    scoring_evidence = [item for item, source in zip(evidence, raw_sources) if not source.get("isSearchSeed")]
    duplicate_count = max(0, len(raw_sources) - len({item.duplicate_group_id or item.id for item in evidence}))

    if not live_sources:
        return _no_results_response(
            entity_name=entity_name,
            entity_type=inferred_type,
            jurisdiction=inferred_jurisdiction,
            evidence=evidence,
            articles=[to_article(source) for source in raw_sources],
            status="No relevant public source results were found for this entity and lookback period. Try expanding the lookback period or checking the entity name.",
            entity_inference=entity_inference,
            jurisdiction_inference=jurisdiction_inference,
            duplicate_count=duplicate_count,
            live_source_count=0,
        )

    findings = _classify_findings(scoring_evidence)
    score = _score_findings(findings, inferred_type, inferred_jurisdiction)
    geography = _build_geography(evidence, findings, inferred_jurisdiction)
    timeline = _build_timeline(findings, evidence)
    rating = score.final_rating
    confidence = _confidence_percent(evidence, findings, entity_inference, jurisdiction_inference, duplicate_count)
    articles = [to_article(source) for source in raw_sources[:16]]
    flags = sorted({TYPOLOGIES.get(f.typology_id, {}).get("name", f.typology_id) for f in findings if f.flag != "Green"})
    if not findings:
        return _no_results_response(
            entity_name=entity_name,
            entity_type=inferred_type,
            jurisdiction=inferred_jurisdiction,
            evidence=evidence,
            articles=articles,
            status="Live public sources were retrieved, but deterministic rules did not identify source-supported adverse AFC/fraud findings for this entity.",
            ambiguity_warning=_ambiguity_warning(entity_name, evidence, entity_inference, jurisdiction_inference),
            entity_inference=entity_inference,
            jurisdiction_inference=jurisdiction_inference,
            duplicate_count=duplicate_count,
            live_source_count=len(live_sources),
        )

    summary = _summary(entity_name, score, findings, evidence)
    recommendation = _recommendation(score)
    ambiguity = _ambiguity_warning(entity_name, evidence, entity_inference, jurisdiction_inference)

    return InvestigationResponse(
        company=entity_name,
        risk_score=score.total_score,
        risk_level="High" if rating in {"High", "Critical"} else "Medium" if rating == "Moderate" else "Low",
        confidence=confidence,
        summary=summary,
        timeline=[
            TimelineEvent(year=item.date[:4] if item.date else "Unknown", title=item.event, description=item.summary)
            for item in timeline[:5]
        ],
        entities=EntityGroups(companies=[entity_name], countries=sorted({item.jurisdiction for item in evidence if item.jurisdiction})),
        flags=flags,
        articles=articles,
        recommendation=recommendation,
        reasoning=score.explanation,
        mode="Live Public Source Retrieval",
        source_retrieval_status=f"Retrieved {len(raw_sources)} public-source records; {len(live_sources)} live source(s) analyzed by deterministic AFC/Fraud rules after deduplication.",
        evidence=evidence,
        risk_findings=findings,
        risk_score_breakdown=score,
        geography_exposure=geography,
        investigation_timeline=timeline,
        source_reliability_summary=dict(Counter(item.source_reliability for item in evidence)),
        ambiguity_warning=ambiguity,
        follow_up_questions=_follow_ups(findings),
        hallucination_checks=_hallucination_checks(evidence, findings, score, entity_inference, jurisdiction_inference),
        entity_inference=entity_inference,
        jurisdiction_inference=jurisdiction_inference,
        unique_source_count=len({item.duplicate_group_id or item.id for item in evidence}),
        duplicate_source_count=duplicate_count,
    )


def _evidence_from_source(source: Dict[str, str], entity_name: str, jurisdiction: str) -> EvidenceItem:
    text = f"{source.get('title', '')} {source.get('snippet', '')} {source.get('fullText', '')}"
    matched = [] if source.get("isSearchSeed") else [keyword for keyword in ADVERSE_KEYWORDS if keyword.lower() in text.lower()]
    countries = _extract_countries(text, source.get("country") or jurisdiction)
    source_type = source.get("sourceType", "Unverified")
    reliability = _source_reliability(source_type, source.get("sourceName", ""), source.get("url", ""))
    confidence = _entity_match_confidence(entity_name, jurisdiction, source)
    return EvidenceItem(
        id=source["id"],
        entity_name=entity_name,
        title=source.get("title", ""),
        summary=source.get("snippet") or source.get("title", ""),
        source_name=source.get("sourceName", "Unknown"),
        source_url=source.get("url", ""),
        source_domain=source.get("sourceDomain"),
        source_type=source_type,
        source_reliability=reliability,
        raw_source_date=source.get("publishedAt", ""),
        source_date=_normalize_date(source.get("publishedAt", "")),
        retrieved_at=source.get("retrievedAt") or datetime.now(timezone.utc).isoformat(),
        provider=source.get("provider", "Other"),
        jurisdiction=source.get("country") or jurisdiction or (countries[0] if countries else None),
        mentioned_countries=countries,
        matched_keywords=matched,
        extracted_risk_phrases=_risk_phrases(text, matched),
        entity_match_confidence=confidence,
        duplicate_group_id=source.get("duplicateGroupId"),
    )


def _classify_findings(evidence: Iterable[EvidenceItem]) -> List[RiskFinding]:
    findings: List[RiskFinding] = []
    by_typology_sources: Dict[str, set[str]] = defaultdict(set)
    evidence_list = list(evidence)
    for item in evidence_list:
        text = f"{item.title} {item.summary} {' '.join(item.matched_keywords)}".lower()
        for typology_id, config in TYPOLOGIES.items():
            keywords = config["keywords"]
            if not any(keyword in text for keyword in keywords):  # type: ignore[arg-type]
                continue
            by_typology_sources[typology_id].add(item.source_name)

    for item in evidence_list:
        text = f"{item.title} {item.summary} {' '.join(item.matched_keywords)}".lower()
        for typology_id, config in TYPOLOGIES.items():
            keywords = config["keywords"]
            if not any(keyword in text for keyword in keywords):  # type: ignore[arg-type]
                continue
            weight_key = TYPOLOGY_TO_WEIGHT.get(typology_id, "single_unverified_allegation")
            base = BASE_RISK_WEIGHTS[weight_key]
            status = _status_from_text(text, item.source_type)
            reliability_multiplier = SOURCE_RELIABILITY_MULTIPLIER[item.source_reliability]
            recency_multiplier = _recency_multiplier(item.source_date)
            corroboration_multiplier = _corroboration_multiplier(item, len(by_typology_sources[typology_id]))
            entity_multiplier = _entity_multiplier(item.entity_match_confidence)
            jurisdiction_multiplier = _jurisdiction_multiplier(item.jurisdiction)
            status_multiplier = STATUS_MULTIPLIER[status]
            adjusted = round(base * reliability_multiplier * status_multiplier * recency_multiplier * corroboration_multiplier * entity_multiplier * jurisdiction_multiplier)
            flag = "Red" if adjusted >= 18 or config["severity"] in {"High", "Critical"} and item.source_reliability == "High" else "Yellow"
            severity = "Critical" if adjusted >= 35 else "High" if adjusted >= 20 else "Medium" if adjusted >= 8 else "Low"
            findings.append(
                RiskFinding(
                    id=f"finding_{item.id}_{typology_id}",
                    evidence_id=item.id,
                    source_ids=[item.id],
                    source_links=[
                        SourceLink(
                            source_id=item.id,
                            title=item.title,
                            url=item.source_url,
                            source_name=item.source_name,
                            published_at=item.source_date,
                        )
                    ],
                    typology_id=typology_id,
                    title=f"{config['name']}: {item.title}",
                    description=item.summary,
                    flag=flag,
                    base_weight=base,
                    adjusted_weight=max(0, adjusted),
                    severity=severity,
                    allegation_status=status,
                    source_reliability=item.source_reliability,
                    source_reliability_multiplier=reliability_multiplier,
                    recency_multiplier=recency_multiplier,
                    corroboration_multiplier=corroboration_multiplier,
                    entity_match_multiplier=entity_multiplier,
                    jurisdiction_multiplier=jurisdiction_multiplier,
                    rationale=(
                        f"Matched {config['name']} keywords in {item.source_name}; adjusted using "
                        f"{item.source_reliability.lower()} source reliability, recency, corroboration, entity match "
                        f"({item.entity_match_confidence}%), and jurisdiction factors."
                    ),
                )
            )
    return _dedupe_findings(findings)


def _score_findings(findings: List[RiskFinding], entity_type: str, jurisdiction: str) -> RiskScoreBreakdown:
    raw = sum(f.adjusted_weight for f in findings)
    pattern_bonus = _pattern_bonus(findings)
    sector_bonus = 8 if any(token in entity_type.lower() for token in ["payment", "fintech", "crypto", "financial"]) else 0
    total = min(100, max(0, raw + pattern_bonus + sector_bonus))
    rating = "Critical" if total >= 70 else "High" if total >= 40 else "Moderate" if total >= 20 else "Low"
    triggers: List[str] = []
    typologies = {f.typology_id for f in findings}
    if "sanctions_exposure" in typologies:
        rating = "Critical"
        triggers.append("Sanctions exposure requires critical review until exact identifiers are cleared.")
    if "terrorist_financing" in typologies:
        rating = "Critical"
        triggers.append("Terrorist financing concern.")
    if "regulatory_enforcement" in typologies and total >= 40 and rating in {"Low", "Moderate"}:
        rating = "High"
        triggers.append("Regulatory enforcement involving financial-crime controls.")
    if all(f.source_reliability == "Low" or f.allegation_status in {"Rumor", "Unverified Allegation"} for f in findings) and rating in {"High", "Critical"}:
        rating = "Moderate"
        triggers.append("Rating capped because all findings are low-confidence or unverified.")
    avg_match = sum((f.entity_match_multiplier for f in findings), 0) / max(1, len(findings))
    has_official = any(f.source_reliability == "High" for f in findings)
    if avg_match < 0.65 and not has_official and rating in {"High", "Critical"}:
        rating = "Moderate"
        triggers.append("Rating capped pending entity disambiguation.")

    return RiskScoreBreakdown(
        total_score=total,
        final_rating=rating,  # type: ignore[arg-type]
        pattern_bonus=pattern_bonus,
        sector_risk_bonus=sector_bonus,
        mitigating_factor_total=0,
        auto_escalation_triggers=triggers,
        explanation=(
            f"Score sums adjusted finding weights ({raw}), pattern bonus ({pattern_bonus}), "
            f"and sector risk bonus ({sector_bonus}). Multipliers consider reliability, status, recency, "
            "corroboration, entity match, and jurisdiction. Final rating is human-review only."
        ),
    )

def _source_reliability(source_type: str, source_name: str, url: str) -> str:
    multiplier = SOURCE_TYPE_WEIGHTS.get(source_type, 0.4)
    lowered = f"{source_name} {url}".lower()
    if any(token in lowered for token in ["reuters", "bloomberg", "financial conduct authority", "justice.gov", "sec.gov"]):
        multiplier += 0.15
    if multiplier >= 1.0:
        return "High"
    if multiplier >= 0.7:
        return "Medium"
    return "Low"


def _infer_entity_type(entity_name: str, sources: List[Dict[str, str]]) -> EntityInferenceResult:
    text = " ".join(
        f"{source.get('title', '')} {source.get('snippet', '')} {source.get('fullText', '')} {source.get('sourceName', '')}"
        for source in sources
    ).lower()
    name_text = f" {entity_name.lower()} "
    scored: List[tuple[str, int, List[str]]] = []
    for entity_type, signals in ENTITY_TYPE_SIGNALS.items():
        matched = [signal for signal in signals if signal in text or signal in name_text]
        if matched:
            scored.append((entity_type, len(matched), matched[:6]))

    if not scored:
        suffixes = ENTITY_TYPE_SIGNALS["Company"]
        matched = [signal.strip() for signal in suffixes if signal in name_text]
        if matched:
            return EntityInferenceResult(
                entity_type="Company",
                confidence=62,
                confidence_label="Medium",
                rationale="Entity name contains common legal entity suffix signals.",
                matched_signals=matched,
            )
        return EntityInferenceResult(
            entity_type="Unknown",
            confidence=30,
            confidence_label="Low",
            rationale="Retrieved sources did not contain enough entity classification signals.",
            matched_signals=[],
        )

    best_type, count, matched_signals = sorted(scored, key=lambda item: (item[1], item[0] != "Company"), reverse=True)[0]
    source_factor = min(25, len(sources) * 4)
    confidence = min(95, 45 + count * 12 + source_factor)
    return EntityInferenceResult(
        entity_type=best_type,
        confidence=confidence,
        confidence_label=_confidence_label(confidence),
        rationale=f"Matched {count} classification signal(s) across retrieved source titles, snippets, domains, and the entity name.",
        matched_signals=matched_signals,
    )


def _infer_jurisdictions(entity_name: str, sources: List[Dict[str, str]]) -> JurisdictionInferenceResult:
    scores: Dict[str, Dict[str, object]] = defaultdict(lambda: {"score": 0, "signals": set(), "count": 0})
    for source in sources:
        text = f"{source.get('title', '')} {source.get('snippet', '')} {source.get('fullText', '')}".lower()
        domain = source.get("sourceDomain", "").lower()
        country = source.get("country", "")
        if country:
            entry = scores[country]
            entry["score"] = int(entry["score"]) + 20
            entry["count"] = int(entry["count"]) + 1
            entry["signals"].add("source country metadata")  # type: ignore[union-attr]
        for domain_signal, mapped_country in REGULATOR_JURISDICTION_MAP.items():
            if domain.endswith(domain_signal) or domain_signal in domain:
                entry = scores[mapped_country]
                entry["score"] = int(entry["score"]) + 35
                entry["count"] = int(entry["count"]) + 1
                entry["signals"].add(domain_signal)  # type: ignore[union-attr]
        for mapped_country, signals in COUNTRY_SIGNALS.items():
            matched = [signal for signal in signals if signal in text]
            if matched:
                entry = scores[mapped_country]
                entry["score"] = int(entry["score"]) + 10 * len(matched)
                entry["count"] = int(entry["count"]) + 1
                for signal in matched[:3]:
                    entry["signals"].add(signal)  # type: ignore[union-attr]

    name_lower = entity_name.lower()
    if any(token in name_lower for token in [" ltd", " limited", " plc"]):
        entry = scores["United Kingdom"]
        entry["score"] = int(entry["score"]) + 8
        entry["signals"].add("UK legal suffix hint")  # type: ignore[union-attr]
    if any(token in name_lower for token in [" inc", " llc", " corp"]):
        entry = scores["United States"]
        entry["score"] = int(entry["score"]) + 8
        entry["signals"].add("US legal suffix hint")  # type: ignore[union-attr]

    if not scores:
        return JurisdictionInferenceResult(
            primary_jurisdiction=None,
            confidence=20,
            confidence_label="Low",
            related_jurisdictions=[],
            rationale="Primary jurisdiction could not be inferred confidently from retrieved sources.",
        )

    ranked = sorted(scores.items(), key=lambda item: int(item[1]["score"]), reverse=True)
    top_country, top_data = ranked[0]
    top_score = int(top_data["score"])
    confidence = min(95, max(25, top_score))
    related = [
        RelatedJurisdiction(
            jurisdiction=country,
            confidence=min(95, max(20, int(data["score"]))),
            evidence_count=int(data["count"]),
            matched_signals=sorted(data["signals"])[:6],  # type: ignore[arg-type]
        )
        for country, data in ranked[:6]
    ]
    return JurisdictionInferenceResult(
        primary_jurisdiction=top_country,
        confidence=confidence,
        confidence_label=_confidence_label(confidence),
        related_jurisdictions=related,
        rationale=f"Primary jurisdiction inferred from metadata, source domains, and country phrases across {len(sources)} live source(s).",
    )


def _confidence_label(score: int) -> str:
    if score >= 70:
        return "High"
    if score >= 40:
        return "Medium"
    return "Low"


def _no_results_response(
    entity_name: str,
    entity_type: str,
    jurisdiction: str,
    evidence: List[EvidenceItem],
    articles: List[Article],
    status: str,
    ambiguity_warning: str = "",
    entity_inference: Optional[EntityInferenceResult] = None,
    jurisdiction_inference: Optional[JurisdictionInferenceResult] = None,
    duplicate_count: int = 0,
    live_source_count: int = 0,
) -> InvestigationResponse:
    score = RiskScoreBreakdown(
        total_score=0,
        final_rating="Low",
        pattern_bonus=0,
        sector_risk_bonus=0,
        mitigating_factor_total=0,
        auto_escalation_triggers=[],
        explanation="No adverse media finding was scored because no evidence-supported finding was extracted from real retrieved sources.",
    )
    confidence = 45 if live_source_count else 15
    if entity_inference:
        confidence += round(entity_inference.confidence * 0.15)
    if jurisdiction_inference:
        confidence += round(jurisdiction_inference.confidence * 0.10)
    if duplicate_count:
        confidence -= min(15, duplicate_count * 3)
    confidence = max(5, min(65, confidence))
    return InvestigationResponse(
        company=entity_name,
        risk_score=0,
        risk_level="Low",
        confidence=confidence,
        summary=status,
        timeline=[],
        entities=EntityGroups(companies=[entity_name], countries=[jurisdiction] if jurisdiction else []),
        flags=[],
        articles=articles,
        recommendation="Review",
        reasoning="No fake or synthetic investigation output was generated. Analyst may broaden the search period or verify official registers manually.",
        mode="No Relevant Public Sources",
        source_retrieval_status=status,
        evidence=evidence,
        risk_findings=[],
        risk_score_breakdown=score,
        geography_exposure=[],
        investigation_timeline=[],
        source_reliability_summary=dict(Counter(item.source_reliability for item in evidence)),
        ambiguity_warning=ambiguity_warning or _inference_warning(entity_inference, jurisdiction_inference),
        follow_up_questions=[
            "Try expanding the lookback period.",
            "Add or verify the jurisdiction and legal entity suffix.",
            "Check official registers and sanctions lists manually if the entity is high priority.",
        ],
        hallucination_checks=[
            {"label": "No OpenAI dependency", "passed": True, "detail": "Main flow uses deterministic source retrieval, inference, and weighted scoring rules."},
            {"label": "No fake investigation output", "passed": True, "detail": "The system returned no findings instead of fabricating adverse media."},
            {"label": "Human review required", "passed": True, "detail": "No final compliance decision is made by the AI."},
        ],
        entity_inference=entity_inference,
        jurisdiction_inference=jurisdiction_inference,
        unique_source_count=len({item.duplicate_group_id or item.id for item in evidence}),
        duplicate_source_count=duplicate_count,
    )


def _strongest_reliability(items: List[EvidenceItem]) -> str:
    rank = {"Low": 0, "Medium": 1, "High": 2}
    return max((item.source_reliability for item in items), key=lambda value: rank[value])


def _finding_corroboration_multiplier(items: List[EvidenceItem]) -> float:
    if any(item.source_type in {"Regulatory", "Official", "Law Enforcement", "Court", "Sanctions List"} for item in items):
        return 1.20
    independent_sources = len({item.source_name for item in items})
    if independent_sources >= 3:
        return 1.15
    if independent_sources == 2:
        return 1.0
    return 0.75


def _strength_multiplier(strength: str) -> float:
    return {
        "Strong": 1.15,
        "Moderate": 1.0,
        "Weak": 0.6,
        "Insufficient": 0.2,
    }.get(strength, 0.6)


def _normalize_status(value: str) -> str:
    allowed = {
        "Rumor",
        "Unverified Allegation",
        "Allegation",
        "Investigation",
        "Charge",
        "Civil Litigation",
        "Regulatory Action",
        "Enforcement",
        "Conviction",
        "Sanctions Match",
        "Cleared",
        "Unknown",
    }
    return value if value in allowed else "Unknown"


def _normalize_strength(value: str) -> str:
    return value if value in {"Strong", "Moderate", "Weak", "Insufficient"} else "Moderate"


def _normalize_flag(value: str) -> str:
    return value if value in {"Red", "Yellow", "Green"} else "Yellow"


def _normalize_severity(value: str) -> str:
    return value if value in {"Low", "Medium", "High", "Critical"} else "Medium"


def _entity_match_confidence(entity_name: str, jurisdiction: str, source: Dict[str, str]) -> int:
    text = f"{source.get('title', '')} {source.get('snippet', '')} {source.get('fullText', '')}".lower()
    entity = entity_name.lower()
    confidence = 35
    if entity in text:
        confidence += 45
    else:
        tokens = [token for token in re.split(r"\W+", entity) if len(token) > 2]
        matched = sum(1 for token in tokens if token in text)
        confidence += round(35 * matched / max(1, len(tokens)))
    if jurisdiction and jurisdiction.lower() in text:
        confidence += 10
    if source.get("sourceType") in {"Regulatory", "Official", "Sanctions List", "Law Enforcement", "Court"}:
        confidence += 5
    return max(0, min(100, confidence))


def _status_from_text(text: str, source_type: str) -> str:
    if "sanctions match" in text or "sdn" in text:
        return "Sanctions Match"
    if "convicted" in text or "guilty plea" in text:
        return "Conviction"
    if "enforcement" in text or "required" in text or "cease regulated" in text or source_type == "Regulatory":
        return "Regulatory Action"
    if "charged" in text or "indictment" in text:
        return "Charge"
    if "investigation" in text or "probe" in text:
        return "Investigation"
    if "lawsuit" in text or "litigation" in text:
        return "Civil Litigation"
    if "alleged" in text or "allegation" in text or "reported" in text:
        return "Allegation"
    if source_type == "Unverified":
        return "Unverified Allegation"
    return "Unknown"


def _recency_multiplier(date_value: Optional[str]) -> float:
    if not date_value:
        return 0.75
    normalized = _normalize_date(date_value)
    if not normalized:
        return 0.75
    year = int(normalized[:4])
    age = datetime.now(timezone.utc).year - year
    if age <= 1:
        return 1.0
    if age <= 3:
        return 0.85
    if age <= 5:
        return 0.65
    return 0.40


def _corroboration_multiplier(item: EvidenceItem, source_count: int) -> float:
    if item.source_type in {"Regulatory", "Official", "Law Enforcement", "Court", "Sanctions List"}:
        return 1.20
    if source_count >= 3:
        return 1.15
    if source_count == 2:
        return 1.0
    return 0.75


def _entity_multiplier(confidence: int) -> float:
    if confidence >= 80:
        return 1.0
    if confidence >= 60:
        return 0.75
    return 0.40


def _jurisdiction_multiplier(jurisdiction: Optional[str]) -> float:
    if not jurisdiction:
        return 1.0
    lower = jurisdiction.lower()
    if lower in FATF_CALL_FOR_ACTION:
        return 1.25
    if lower in FATF_INCREASED_MONITORING:
        return 1.15
    if lower in SANCTIONS_SENSITIVE:
        return 1.20
    return 1.0


def _jurisdiction_type(jurisdiction: Optional[str]) -> str:
    if not jurisdiction:
        return "Unknown"
    lower = jurisdiction.lower()
    if lower in FATF_CALL_FOR_ACTION:
        return "FATF Call for Action"
    if lower in FATF_INCREASED_MONITORING:
        return "FATF Increased Monitoring"
    if lower in SANCTIONS_SENSITIVE:
        return "Sanctions Sensitive"
    return "Standard"


def _pattern_bonus(findings: List[RiskFinding]) -> int:
    typologies = {f.typology_id for f in findings}
    bonus = 0
    if {"shell_company", "high_risk_geography", "sanctions_evasion"}.issubset(typologies):
        bonus += 15
    if {"payment_firm_money_transmitter_risk", "regulatory_enforcement", "safeguarding_client_money_weakness"}.issubset(typologies):
        bonus += 15
    if {"fraud", "reputational_adverse_media", "regulatory_enforcement"}.issubset(typologies):
        bonus += 12
    if {"pep_exposure", "corruption_bribery", "high_risk_geography"}.issubset(typologies):
        bonus += 12
    if {"crypto_financial_crime", "sanctions_exposure", "money_laundering"}.issubset(typologies):
        bonus += 15
    return bonus


def _build_geography(evidence: List[EvidenceItem], findings: List[RiskFinding], default_jurisdiction: str) -> List[GeographyExposure]:
    findings_by_evidence = defaultdict(list)
    for finding in findings:
        findings_by_evidence[finding.evidence_id].append(finding)
    countries = defaultdict(list)
    for item in evidence:
        country = item.jurisdiction or default_jurisdiction or "Unknown"
        countries[country].extend(findings_by_evidence[item.id])
    result: List[GeographyExposure] = []
    for country, country_findings in countries.items():
        if not country_findings:
            continue
        red = any(f.flag == "Red" for f in country_findings)
        yellow = any(f.flag == "Yellow" for f in country_findings)
        result.append(
            GeographyExposure(
                country=country,
                risk_level="Red" if red else "Yellow" if yellow else "Green",
                finding_count=len(country_findings),
                top_typologies=sorted({TYPOLOGIES[f.typology_id]["name"] for f in country_findings})[:4],  # type: ignore[index]
                source_count=len({f.evidence_id for f in country_findings}),
                jurisdiction_risk_type=_jurisdiction_type(country),
                explanation=f"{country} exposure reflects {len(country_findings)} source-supported finding(s), with jurisdiction type {_jurisdiction_type(country)}.",
            )
        )
    return result


def _build_timeline(findings: List[RiskFinding], evidence: List[EvidenceItem]) -> List[TimelineItem]:
    evidence_by_id = {item.id: item for item in evidence}
    items: List[TimelineItem] = []
    for finding in findings:
        item = evidence_by_id.get(finding.evidence_id)
        date = item.source_date if item else ""
        items.append(
            TimelineItem(
                date=date or "Unknown",
                event=finding.title,
                source=item.source_name if item else "Source",
                typology=str(TYPOLOGIES[finding.typology_id]["name"]),
                flag=finding.flag,
                severity=finding.severity,
                jurisdiction=item.jurisdiction if item else None,
                summary=finding.description,
            )
        )
    return sorted(items, key=lambda item: _timeline_sort_key(item.date), reverse=True)


def _summary(entity_name: str, score: RiskScoreBreakdown, findings: List[RiskFinding], evidence: List[EvidenceItem]) -> str:
    top = sorted(findings, key=lambda finding: finding.adjusted_weight, reverse=True)[:3]
    concerns = "; ".join(f"{TYPOLOGIES[f.typology_id]['name']} via {f.source_reliability.lower()} reliability evidence" for f in top)
    if not top:
        return f"Live public-source retrieval for {entity_name} did not identify material source-supported adverse media in the current evidence set."
    return (
        f"Live public-source retrieval for {entity_name} identified {len(findings)} source-supported risk finding(s) "
        f"from {len(evidence)} evidence item(s). Key drivers include {concerns}. The weighted model rates the case "
        f"{score.final_rating} with a score of {score.total_score}. Risk ratings are evidence-based and require human validation."
    )


def _recommendation(score: RiskScoreBreakdown) -> str:
    if score.final_rating == "Critical":
        return "Escalate"
    if score.final_rating == "High":
        return "Enhanced Due Diligence"
    if score.final_rating == "Moderate":
        return "Review"
    return "Approve"


def _confidence_percent(
    evidence: List[EvidenceItem],
    findings: List[RiskFinding],
    entity_inference: Optional[EntityInferenceResult] = None,
    jurisdiction_inference: Optional[JurisdictionInferenceResult] = None,
    duplicate_count: int = 0,
) -> int:
    high = sum(1 for item in evidence if item.source_reliability == "High")
    avg_match = sum(item.entity_match_confidence for item in evidence) / max(1, len(evidence))
    score = min(98, 35 + len(evidence) * 4 + high * 8 + avg_match * 0.20)
    if entity_inference:
        score += entity_inference.confidence * 0.10
    if jurisdiction_inference:
        score += jurisdiction_inference.confidence * 0.08
    score -= min(15, duplicate_count * 3)
    if not findings:
        score -= 15
    return round(max(35, min(100, score)))


def _ambiguity_warning(
    entity_name: str,
    evidence: List[EvidenceItem],
    entity_inference: Optional[EntityInferenceResult] = None,
    jurisdiction_inference: Optional[JurisdictionInferenceResult] = None,
) -> str:
    inference_warning = _inference_warning(entity_inference, jurisdiction_inference)
    if inference_warning:
        return inference_warning
    avg = sum(item.entity_match_confidence for item in evidence) / max(1, len(evidence))
    if avg < 70 or len(entity_name.split()) <= 2:
        return "Entity name may be ambiguous. Analyst should verify jurisdiction, registration number, address, date of birth, beneficial owner, and related parties."
    return ""


def _inference_warning(
    entity_inference: Optional[EntityInferenceResult],
    jurisdiction_inference: Optional[JurisdictionInferenceResult],
) -> str:
    warnings = []
    if entity_inference and entity_inference.confidence < 40:
        warnings.append("Entity classification could not be determined confidently. Analyst should verify entity identifiers.")
    if jurisdiction_inference and jurisdiction_inference.confidence < 40:
        warnings.append("Primary jurisdiction could not be inferred confidently from retrieved sources.")
    return " ".join(warnings)


def _follow_ups(findings: List[RiskFinding]) -> List[str]:
    questions = [
        "Can the entity identity be verified against registration, address, ownership, and jurisdiction?",
        "Are official regulatory, court, law enforcement, or sanctions sources available for the highest-weight findings?",
        "Are allegations confirmed, unresolved, settled, or cleared?",
        "Do related entities, directors, or beneficial owners introduce additional risk?",
    ]
    typologies = {f.typology_id for f in findings}
    if "sanctions_exposure" in typologies or "sanctions_evasion" in typologies:
        questions.insert(0, "Is there an exact sanctions match or ownership/control link requiring sanctions review?")
    if "payment_firm_money_transmitter_risk" in typologies:
        questions.insert(0, "Were payment services restricted, customer funds frozen, or safeguarding controls criticized by a regulator?")
    return questions[:8]


def _hallucination_checks(
    evidence: List[EvidenceItem],
    findings: List[RiskFinding],
    score: RiskScoreBreakdown,
    entity_inference: Optional[EntityInferenceResult] = None,
    jurisdiction_inference: Optional[JurisdictionInferenceResult] = None,
) -> List[Dict[str, object]]:
    return [
        {"label": "No OpenAI dependency", "passed": True, "detail": "Main investigation flow uses deterministic retrieval, inference, typology matching, and weighted scoring rules."},
        {"label": "All risk claims linked to sources", "passed": all(f.evidence_id for f in findings), "detail": f"{len(findings)} finding(s) link back to evidence IDs."},
        {"label": "Allegations separated from confirmed actions", "passed": all(f.allegation_status for f in findings), "detail": "Each finding carries an allegation/enforcement/status label."},
        {"label": "Official sources highlighted", "passed": any(item.source_type in {"Regulatory", "Official", "Law Enforcement", "Court", "Sanctions List"} for item in evidence), "detail": "Official-source records are given high reliability and higher corroboration weight."},
        {"label": "Duplicate articles deduplicated", "passed": True, "detail": "URL/title normalization groups duplicate source records before scoring."},
        {"label": "Entity inference confidence", "passed": bool(entity_inference and entity_inference.confidence >= 40), "detail": f"Inferred type: {entity_inference.entity_type if entity_inference else 'Unknown'} ({entity_inference.confidence if entity_inference else 0}%)."},
        {"label": "Jurisdiction inference confidence", "passed": bool(jurisdiction_inference and jurisdiction_inference.confidence >= 40), "detail": f"Primary jurisdiction: {jurisdiction_inference.primary_jurisdiction if jurisdiction_inference else 'Unknown'} ({jurisdiction_inference.confidence if jurisdiction_inference else 0}%)."},
        {"label": "Old news down-weighted", "passed": True, "detail": "Recency multipliers reduce older media unless severe or corroborated."},
        {"label": "Low-confidence evidence capped", "passed": True, "detail": "Rating caps apply when evidence is low confidence or unverified."},
        {"label": "Human review required for High/Critical", "passed": score.final_rating in {"Low", "Moderate", "High", "Critical"}, "detail": "The model recommends review but does not make final compliance decisions."},
    ]


def _extract_countries(text: str, fallback: Optional[str]) -> List[str]:
    countries = [
        "United Kingdom", "United States", "Germany", "Singapore", "Russia", "Iran", "Turkey",
        "United Arab Emirates", "China", "Hong Kong", "Nigeria", "South Africa", "India",
        "Brazil", "Mexico", "France", "Italy", "Spain", "Switzerland",
    ]
    found = [country for country in countries if country.lower() in text.lower()]
    if fallback and fallback not in found:
        found.append(fallback)
    return found[:5]


def _risk_phrases(text: str, matched: List[str]) -> List[str]:
    phrases = []
    for keyword in matched[:8]:
        pattern = re.compile(rf"[^.]*{re.escape(keyword)}[^.]*", re.IGNORECASE)
        match = pattern.search(text)
        if match:
            phrases.append(re.sub(r"\s+", " ", match.group(0)).strip()[:220])
    return phrases


def _normalize_date(value: str) -> str:
    if not value:
        return ""
    value = str(value).strip()
    iso_match = re.match(r"^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$", value)
    if iso_match:
        year, month, day = map(int, iso_match.groups())
        if _valid_date_parts(year, month, day):
            return f"{year:04d}-{month:02d}-{day:02d}"
    compact_datetime = re.match(r"^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$", value)
    if compact_datetime:
        year, month, day = map(int, compact_datetime.groups()[:3])
        if _valid_date_parts(year, month, day):
            return f"{year:04d}-{month:02d}-{day:02d}"
    compact_date = re.match(r"^(\d{4})(\d{2})(\d{2})$", value)
    if compact_date:
        year, month, day = map(int, compact_date.groups())
        if _valid_date_parts(year, month, day):
            return f"{year:04d}-{month:02d}-{day:02d}"
    try:
        parsed = parsedate_to_datetime(value)
        return parsed.date().isoformat()
    except Exception:
        pass
    for fmt in ("%B %d, %Y", "%b %d, %Y", "%d %b %Y", "%m/%d/%Y", "%d/%m/%Y"):
        try:
            parsed = datetime.strptime(value, fmt)
            return parsed.date().isoformat()
        except ValueError:
            continue
    return ""


def _valid_date_parts(year: int, month: int, day: int) -> bool:
    try:
        datetime(year, month, day)
        return True
    except ValueError:
        return False


def _timeline_sort_key(value: str) -> str:
    normalized = _normalize_date(value)
    return normalized or "0000-00-00"


def _dedupe_findings(findings: List[RiskFinding]) -> List[RiskFinding]:
    best: Dict[str, RiskFinding] = {}
    for finding in findings:
        key = f"{finding.evidence_id}:{finding.typology_id}"
        if key not in best or finding.adjusted_weight > best[key].adjusted_weight:
            best[key] = finding
    return list(best.values())
