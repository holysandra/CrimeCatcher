import type { RiskTypology } from "@/types/investigation";

export const riskTypologies: RiskTypology[] = [
  {
    id: "money_laundering",
    name: "Money Laundering",
    description: "Use of transactions, accounts, or entities to conceal the origin, ownership, or control of illicit proceeds.",
    exampleIndicators: ["Suspicious cross-border transfers", "Unusual payment flows", "Layering through intermediaries"],
    commonKeywords: ["money laundering", "AML", "suspicious transaction", "layering", "proceeds of crime"],
    severityDefault: "High",
    suggestedFollowUps: ["Are suspicious transactions confirmed by official records?", "Do transaction patterns show layering or integration?"]
  },
  {
    id: "cash_structuring",
    name: "Cash Structuring",
    description: "Breaking transactions into smaller amounts to avoid reporting thresholds or monitoring controls.",
    exampleIndicators: ["Repeated small cash deposits", "Threshold avoidance", "Multiple branches or accounts"],
    commonKeywords: ["structuring", "threshold", "cash deposits", "reporting limit"],
    severityDefault: "Medium",
    suggestedFollowUps: ["Are transaction amounts clustered below reporting thresholds?", "Is there a legitimate cash business rationale?"]
  },
  {
    id: "smurfing",
    name: "Smurfing",
    description: "Use of multiple individuals or accounts to place funds into the financial system in smaller increments.",
    exampleIndicators: ["Many third-party deposits", "Common beneficiaries", "Coordinated small transactions"],
    commonKeywords: ["smurfing", "third-party deposits", "multiple individuals", "cash couriers"],
    severityDefault: "Medium",
    suggestedFollowUps: ["Are depositors connected?", "Do payments converge to a common beneficiary?"]
  },
  {
    id: "shell_company",
    name: "Shell Company Indicators",
    description: "Indicators that an entity may exist primarily to obscure ownership, facilitate transactions, or layer funds rather than conduct legitimate commercial activity.",
    exampleIndicators: ["Opaque beneficial ownership", "Nominee directors", "Registered at mass incorporation address", "Minimal operating history", "No clear commercial activity", "Complex offshore ownership chain"],
    commonKeywords: ["shell company", "nominee director", "beneficial ownership", "offshore entity", "paper company", "corporate layering"],
    severityDefault: "High",
    suggestedFollowUps: ["Can beneficial ownership be verified?", "Are there related entities in offshore jurisdictions?", "Is there evidence of legitimate business activity?"]
  },
  {
    id: "corporate_layering",
    name: "Complex Corporate Layering",
    description: "Use of multiple legal entities, nominees, or jurisdictions that obscures control or source of funds.",
    exampleIndicators: ["Nested ownership", "Related-party entities", "Offshore holding companies"],
    commonKeywords: ["layering", "holding company", "related party", "offshore chain"],
    severityDefault: "Medium",
    suggestedFollowUps: ["Can the full ownership chain be mapped?", "Are related-party payments commercially justified?"]
  },
  {
    id: "sanctions_exposure",
    name: "Sanctions Exposure",
    description: "Potential direct or indirect connection to sanctioned parties, jurisdictions, vessels, sectors, or ownership networks.",
    exampleIndicators: ["Sanctions list reference", "Related sanctioned entity", "Restricted jurisdiction exposure"],
    commonKeywords: ["sanctions", "OFAC", "SDN", "asset freeze", "restricted party"],
    severityDefault: "Critical",
    suggestedFollowUps: ["Is there an exact sanctions match?", "Are ownership and control links within sanctions thresholds?"]
  },
  {
    id: "sanctions_evasion",
    name: "Sanctions Evasion",
    description: "Activity intended to disguise sanctioned ownership, restricted trade, or prohibited financial flows.",
    exampleIndicators: ["Front companies", "False end users", "Shipping route manipulation"],
    commonKeywords: ["sanctions evasion", "front company", "transshipment", "restricted goods"],
    severityDefault: "Critical",
    suggestedFollowUps: ["Are related entities acting as fronts?", "Do trade routes or counterparties indicate evasion?"]
  },
  {
    id: "high_risk_geography",
    name: "High-risk Geography Exposure",
    description: "Material operations, ownership, transactions, or counterparties connected to higher-risk jurisdictions.",
    exampleIndicators: ["High-risk correspondent corridors", "Sanctions-adjacent jurisdictions", "Opaque offshore centers"],
    commonKeywords: ["high-risk jurisdiction", "offshore", "cross-border", "corridor"],
    severityDefault: "Medium",
    suggestedFollowUps: ["Which jurisdictions drive exposure?", "Is there a legitimate business purpose for the exposure?"]
  },
  {
    id: "pep_exposure",
    name: "PEP / Political Exposure",
    description: "Connection to politically exposed persons or state-linked decision makers that may increase corruption or influence risk.",
    exampleIndicators: ["Government official ownership", "State contract influence", "Family member of PEP"],
    commonKeywords: ["PEP", "politically exposed", "minister", "state-owned", "government-linked"],
    severityDefault: "Medium",
    suggestedFollowUps: ["Is the PEP link current?", "Are source-of-wealth and source-of-funds documented?"]
  },
  {
    id: "fraud",
    name: "Fraud Allegations",
    description: "Allegations or findings involving deception, false statements, misappropriation, or accounting misconduct.",
    exampleIndicators: ["Accounting irregularities", "Investor deception", "False invoices"],
    commonKeywords: ["fraud", "false statement", "misrepresentation", "accounting irregularity"],
    severityDefault: "High",
    suggestedFollowUps: ["Are allegations confirmed by court or regulator records?", "Are executives named?"]
  },
  {
    id: "regulatory_enforcement",
    name: "Regulatory Enforcement",
    description: "Regulatory action, fine, warning, license restriction, or enforcement related to financial crime controls.",
    exampleIndicators: ["Regulatory fine", "Consent order", "AML control failure"],
    commonKeywords: ["enforcement", "regulator", "fine", "consent order", "AML controls"],
    severityDefault: "High",
    suggestedFollowUps: ["Is the enforcement action final?", "Have remediation measures been independently verified?"]
  },
  {
    id: "human_trafficking",
    name: "Human Trafficking / Modern Slavery",
    description: "Indicators connecting the entity to exploitation, forced labor, trafficking networks, or related proceeds.",
    exampleIndicators: ["Forced labor claims", "Exploitation-linked suppliers", "NGO allegations"],
    commonKeywords: ["human trafficking", "modern slavery", "forced labor", "exploitation"],
    severityDefault: "Critical",
    suggestedFollowUps: ["Are claims supported by official or NGO sources?", "Which suppliers or geographies are implicated?"]
  },
  {
    id: "organized_crime",
    name: "Criminal Association / Organized Crime Links",
    description: "Potential relationship with organized criminal groups, convicted individuals, or illicit networks.",
    exampleIndicators: ["Known criminal associate", "Organized crime investigation", "Network-linked payments"],
    commonKeywords: ["organized crime", "criminal network", "mafia", "cartel", "criminal association"],
    severityDefault: "Critical",
    suggestedFollowUps: ["Is the connection direct or indirect?", "Is the association current and source-supported?"]
  },
  {
    id: "corruption_bribery",
    name: "Corruption / Bribery",
    description: "Alleged or confirmed bribery, improper payments, kickbacks, public procurement abuse, or influence peddling.",
    exampleIndicators: ["Bribe payments", "Kickback scheme", "Public contract irregularities"],
    commonKeywords: ["bribery", "corruption", "kickback", "improper payment", "public contract"],
    severityDefault: "High",
    suggestedFollowUps: ["Were public officials involved?", "Are payments reflected in books and records?"]
  },
  {
    id: "tax_evasion",
    name: "Tax Evasion",
    description: "Alleged or confirmed concealment of taxable income, abusive structures, or false tax reporting.",
    exampleIndicators: ["False tax filing", "Offshore tax scheme", "Unpaid tax charge"],
    commonKeywords: ["tax evasion", "tax fraud", "offshore tax", "false return"],
    severityDefault: "High",
    suggestedFollowUps: ["Is the issue civil, criminal, or resolved?", "Are offshore entities involved?"]
  },
  {
    id: "terrorist_financing",
    name: "Terrorist Financing",
    description: "Potential connection to terrorist groups, extremist financing channels, or prohibited support.",
    exampleIndicators: ["Listed extremist links", "Suspicious donations", "Law enforcement concern"],
    commonKeywords: ["terrorist financing", "extremist", "designated group", "TF"],
    severityDefault: "Critical",
    suggestedFollowUps: ["Is there an official designation?", "Are funds or beneficiaries traceable to prohibited groups?"]
  },
  {
    id: "trade_based_ml",
    name: "Trade-based Money Laundering",
    description: "Use of trade transactions, invoices, goods, or shipping documentation to move or disguise value.",
    exampleIndicators: ["False invoicing", "Over/under-invoicing", "Unusual shipping route"],
    commonKeywords: ["trade-based money laundering", "false invoice", "over-invoicing", "transshipment"],
    severityDefault: "High",
    suggestedFollowUps: ["Do invoices match goods and market prices?", "Are trade routes commercially plausible?"]
  },
  {
    id: "crypto_financial_crime",
    name: "Crypto-related Financial Crime",
    description: "Use of crypto assets, exchanges, mixers, wallets, or protocols connected to fraud, laundering, or sanctions risk.",
    exampleIndicators: ["Mixer exposure", "Exchange enforcement", "Wallet linked to scam"],
    commonKeywords: ["crypto", "wallet", "mixer", "exchange", "blockchain", "ransomware"],
    severityDefault: "High",
    suggestedFollowUps: ["Are wallet addresses known?", "Can blockchain analytics confirm exposure?"]
  },
  {
    id: "negative_litigation",
    name: "Negative Litigation History",
    description: "Civil or criminal litigation that may indicate fraud, misconduct, consumer harm, or unresolved legal exposure.",
    exampleIndicators: ["Civil lawsuit", "Class action", "Unresolved claims"],
    commonKeywords: ["lawsuit", "litigation", "class action", "complaint", "settlement"],
    severityDefault: "Medium",
    suggestedFollowUps: ["Is litigation settled, dismissed, or active?", "Does it involve financial crime allegations?"]
  },
  {
    id: "reputational_adverse_media",
    name: "Reputational Risk / Adverse Media",
    description: "Repeated or credible negative public reporting that may affect onboarding, monitoring, or escalation decisions.",
    exampleIndicators: ["Repeated adverse reports", "Credible investigative journalism", "Public controversy"],
    commonKeywords: ["adverse media", "controversy", "negative media", "investigative report"],
    severityDefault: "Medium",
    suggestedFollowUps: ["Are reports independent or syndicated duplicates?", "Are claims corroborated by official sources?"]
  },
  {
    id: "payment_firm_money_transmitter_risk",
    name: "Payment Firm / Money Transmitter Risk",
    description: "Risk that a payment institution, e-money firm, exchange business, or money transmitter may be used to move, layer, or obscure funds for illicit purposes.",
    exampleIndicators: ["Regulator required the firm to stop payment services", "Weak AML or financial crime framework", "Customer funds frozen", "High-risk customer or corridor exposure"],
    commonKeywords: ["payment firm", "money transmitter", "e-money", "money service business", "MSB", "remittance", "financial crime risk"],
    severityDefault: "High",
    suggestedFollowUps: ["Was the firm subject to regulatory restrictions?", "Were customer funds frozen or safeguarded?", "Did the regulator identify AML or financial crime framework weaknesses?"]
  },
  {
    id: "safeguarding_client_money_weakness",
    name: "Safeguarding / Client-money Control Weakness",
    description: "Weaknesses in controls designed to protect client or customer funds, especially at payment, e-money, or investment firms.",
    exampleIndicators: ["Customer funds frozen", "Special administrators appointed", "Safeguarding arrangements criticized"],
    commonKeywords: ["safeguarding", "client money", "customer funds", "funds frozen", "special administrators"],
    severityDefault: "High",
    suggestedFollowUps: ["Were customer funds frozen?", "Have administrators or regulators confirmed fund status?", "Are safeguarding reconciliations available?"]
  },
  {
    id: "governance_ownership_weakness",
    name: "Governance and Ownership Weakness",
    description: "Weaknesses in ownership transparency, governance, board oversight, or control environment that can amplify financial crime risk.",
    exampleIndicators: ["Ownership concerns", "Governance weaknesses", "Unclear controllers", "Weak board oversight"],
    commonKeywords: ["governance", "ownership", "control weakness", "directors", "beneficial owner"],
    severityDefault: "High",
    suggestedFollowUps: ["Can controllers and beneficial owners be verified?", "Were governance weaknesses identified by an official source?", "What remediation has occurred?"]
  }
];

export const typologyById = Object.fromEntries(riskTypologies.map((typology) => [typology.id, typology]));
