import type { RiskIndicatorRule } from "@/types/investigation";

export const riskIndicatorRules: RiskIndicatorRule[] = [
  { id: "exact_sanctions_match", label: "Exact sanctions match", description: "Target or verified beneficial owner appears to match a sanctions list entry.", weight: 40, severity: "Red", category: "Sanctions", autoEscalate: true },
  { id: "sanctions_evasion_concern", label: "Sanctions-related enforcement or evasion concern", description: "Credible concern involving sanctions evasion, front entities, or restricted counterparties.", weight: 30, severity: "Red", category: "Sanctions", autoEscalate: true },
  { id: "criminal_conviction", label: "Criminal conviction or guilty plea", description: "Confirmed conviction or guilty plea involving relevant misconduct.", weight: 30, severity: "Red", category: "Criminal" },
  { id: "regulatory_enforcement", label: "Regulatory enforcement action", description: "Final or active regulatory action involving AML, fraud, sanctions, bribery, or related controls.", weight: 25, severity: "Red" , category: "Regulatory" },
  { id: "active_criminal_investigation", label: "Active criminal investigation", description: "Active law enforcement or prosecutor investigation.", weight: 22, severity: "Red", category: "Criminal" },
  { id: "money_laundering_allegation", label: "Money laundering allegation", description: "Credible allegation involving laundering or suspicious transaction flows.", weight: 20, severity: "Red", category: "AML" },
  { id: "terrorist_financing_concern", label: "Terrorist financing concern", description: "Potential terrorist financing exposure or prohibited support concern.", weight: 30, severity: "Red", category: "Terrorist Financing", autoEscalate: true },
  { id: "human_trafficking_concern", label: "Human trafficking / modern slavery concern", description: "Credible concern involving trafficking, exploitation, or modern slavery proceeds.", weight: 25, severity: "Red", category: "Human Trafficking" },
  { id: "fraud_allegation", label: "Fraud allegation from credible source", description: "Fraud allegation from a credible source or repeated independent reporting.", weight: 18, severity: "Red", category: "Fraud" },
  { id: "corruption_bribery_allegation", label: "Corruption or bribery allegation", description: "Credible allegation involving bribery, kickbacks, or public corruption.", weight: 18, severity: "Red", category: "Corruption" },
  { id: "organized_crime_association", label: "Organized crime association", description: "Credible link to organized criminal networks or associates.", weight: 22, severity: "Red", category: "Criminal" },
  { id: "shell_company_indicator", label: "Shell company / opaque ownership indicator", description: "Opacity in beneficial ownership, nominee directors, or minimal business footprint.", weight: 15, severity: "Yellow", category: "Ownership" },
  { id: "complex_layering", label: "Complex corporate layering", description: "Complex ownership or related-party network obscures control or funds flow.", weight: 12, severity: "Yellow", category: "Ownership" },
  { id: "high_risk_geography", label: "High-risk geography exposure", description: "Material exposure to high-risk jurisdictions or corridors.", weight: 12, severity: "Yellow", category: "Geography" },
  { id: "pep_exposure", label: "PEP or political exposure", description: "Current or material relationship to politically exposed persons.", weight: 10, severity: "Yellow", category: "PEP" },
  { id: "repeated_adverse_media", label: "Repeated adverse media from independent sources", description: "Repeated negative media from independent sources after duplicate removal.", weight: 10, severity: "Yellow", category: "Media" },
  { id: "negative_litigation", label: "Negative litigation history", description: "Unresolved or relevant litigation involving misconduct or customer harm.", weight: 8, severity: "Yellow", category: "Litigation" },
  { id: "old_unresolved_media", label: "Old unresolved adverse media", description: "Historical adverse media older than five years that remains unresolved or severe.", weight: 6, severity: "Yellow", category: "Media" },
  { id: "single_unverified_allegation", label: "Single unverified allegation", description: "One uncorroborated allegation from a lower-reliability source.", weight: 4, severity: "Yellow", category: "Media" },
  { id: "transparent_ownership", label: "Transparent ownership", description: "Beneficial ownership is transparent and verifiable.", weight: -5, severity: "Green", category: "Mitigating" },
  { id: "audited_public_company", label: "Public company with audited disclosures", description: "Audited public disclosures provide transparency and governance evidence.", weight: -5, severity: "Green", category: "Mitigating" },
  { id: "no_adverse_media", label: "No adverse media found across credible sources", description: "Credible searches did not identify relevant adverse media.", weight: -10, severity: "Green", category: "Mitigating" },
  { id: "strong_governance", label: "Strong governance / clean regulatory history", description: "Documented governance and no material regulatory history.", weight: -8, severity: "Green", category: "Mitigating" }
];

export const riskRuleById = Object.fromEntries(riskIndicatorRules.map((rule) => [rule.id, rule]));
