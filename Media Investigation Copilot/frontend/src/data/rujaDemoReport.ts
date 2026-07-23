import type { AgentReport, AgentSource, Matter } from "@/types/agentReport";

const FBI_WANTED: AgentSource = {
  source_id: "SRC-FBI-WANTED",
  title: "Ruja Ignatova — FBI Ten Most Wanted Fugitive",
  publisher: "Federal Bureau of Investigation",
  url: "https://www.fbi.gov/wanted/topten/ruja-ignatova/download.pdf",
  publication_date: "2024-06-27",
  retrieval_date: "2026-07-23",
  supported_information:
    "FBI wanted notice lists Ruja Ignatova, her aliases, Bulgarian birthplace, alleged OneCoin fraud, federal charges, travel information, and reward."
};

const DOJ_CHARGES: AgentSource = {
  source_id: "SRC-DOJ-CHARGES",
  title: "Manhattan U.S. Attorney Announces Charges Against Leaders of OneCoin",
  publisher: "U.S. Department of Justice — Southern District of New York",
  url: "https://www.justice.gov/usao-sdny/pr/manhattan-us-attorney-announces-charges-against-leaders-onecoin-multibillion-dollar",
  publication_date: "2019-03-08",
  retrieval_date: "2026-07-23",
  supported_information:
    "DOJ release describes the alleged multibillion-dollar OneCoin scheme and charges against Ruja Ignatova."
};

const FBI_TOP_TEN: AgentSource = {
  source_id: "SRC-FBI-TOP-TEN",
  title: "Ruja Ignatova Added to FBI’s Ten Most Wanted Fugitives List",
  publisher: "Federal Bureau of Investigation",
  url: "https://www.fbi.gov/news/stories/ruja-ignatova-added-to-fbis-ten-most-wanted-fugitives-list",
  publication_date: "2022-06-30",
  retrieval_date: "2026-07-23",
  supported_information:
    "FBI announcement describes Ignatova's alleged leadership of OneCoin, the charges, known travel, and international connections."
};

const DOJ_CASE: AgentSource = {
  source_id: "SRC-DOJ-CASE",
  title: "United States v. Ruja Ignatova et al.",
  publisher: "U.S. Department of Justice — Southern District of New York",
  url: "https://www.justice.gov/usao-sdny/united-states-v-ruja-ignatova-et-al-and-gilbert-armenta",
  publication_date: "2023-08-29",
  retrieval_date: "2026-07-23",
  supported_information:
    "DOJ case page identifies the OneCoin-related federal proceedings and Ruja Ignatova as an FBI fugitive."
};

const matters: Matter[] = [
  {
    matter_id: "M001",
    matter_summary:
      "U.S. authorities allege that Ruja Ignatova co-founded and led OneCoin, marketed as a cryptocurrency, and used false representations to solicit investments worldwide.",
    event_geography: {
      country: "Bulgaria / United States",
      city_or_region: "Sofia / New York",
      jurisdiction_or_authority: "U.S. District Court, Southern District of New York"
    },
    timeline: [
      {
        date: "2014",
        event_type: "Allegation",
        stage: "REPORTED",
        description: "Ignatova and a partner allegedly founded OneCoin in Bulgaria and began soliciting global investments.",
        supporting_sources: [DOJ_CHARGES, FBI_WANTED]
      },
      {
        date: "2017-10-12",
        event_type: "Charge",
        stage: "FORMAL",
        description: "Ignatova was charged in the Southern District of New York and a federal arrest warrant was issued.",
        supporting_sources: [FBI_WANTED]
      }
    ],
    current_stage: "FORMAL",
    typologies: ["Fraud"],
    attribution: "Direct",
    confidence: "High",
    risk_components: {
      typology_score: 30,
      stage_score: 25,
      attribution_adjustment: 10,
      recency_adjustment: 5
    },
    matter_risk_score: 70,
    risk_level: "High",
    risk_calculation: "Fraud 30 + formal charge 25 + direct attribution 10 + recency 5 = 70.",
    key_evidence: "DOJ charging release and FBI wanted notice.",
    key_facts:
      "Authorities allege that OneCoin generated billions in investor funds through false representations; the allegations remain subject to adjudication as to Ignatova.",
    supporting_sources: [DOJ_CHARGES, FBI_WANTED]
  },
  {
    matter_id: "M002",
    matter_summary:
      "A superseding federal indictment charged Ignatova with conspiracy to commit money laundering alongside wire-fraud and securities-fraud offenses.",
    event_geography: {
      country: "United States",
      city_or_region: "New York",
      jurisdiction_or_authority: "U.S. District Court, Southern District of New York"
    },
    timeline: [
      {
        date: "2018-02-06",
        event_type: "Charge",
        stage: "FORMAL",
        description:
          "A superseding indictment charged Ignatova with conspiracy to commit wire fraud, wire fraud, conspiracy to commit money laundering, conspiracy to commit securities fraud, and securities fraud.",
        supporting_sources: [FBI_WANTED, FBI_TOP_TEN]
      }
    ],
    current_stage: "FORMAL",
    typologies: ["Money Laundering", "Fraud"],
    attribution: "Direct",
    confidence: "High",
    risk_components: {
      typology_score: 35,
      stage_score: 25,
      attribution_adjustment: 10,
      recency_adjustment: 5
    },
    matter_risk_score: 75,
    risk_level: "High",
    risk_calculation: "Money laundering/fraud 35 + formal indictment 25 + direct attribution 10 + recency 5 = 75.",
    key_evidence: "FBI wanted notice and FBI Ten Most Wanted announcement.",
    key_facts: "The cited sources document pending federal charges, not a conviction of Ignatova.",
    supporting_sources: [FBI_WANTED, FBI_TOP_TEN]
  },
  {
    matter_id: "M003",
    matter_summary:
      "Ignatova remains the subject of an international fugitive effort connected to the OneCoin allegations and was added to the FBI Ten Most Wanted list.",
    event_geography: {
      country: "International",
      city_or_region: "Europe / Middle East",
      jurisdiction_or_authority: "Federal Bureau of Investigation / U.S. Department of State"
    },
    timeline: [
      {
        date: "2017-10-25",
        event_type: "Investigation",
        stage: "FORMAL",
        description:
          "The FBI states that Ignatova travelled from Sofia, Bulgaria, to Athens, Greece, and has not been publicly located since.",
        supporting_sources: [FBI_WANTED]
      },
      {
        date: "2022-06-30",
        event_type: "Enforcement",
        stage: "FORMAL",
        description: "The FBI added Ignatova to its Ten Most Wanted Fugitives list.",
        supporting_sources: [FBI_TOP_TEN]
      },
      {
        date: "2024-06-27",
        event_type: "Enforcement",
        stage: "FORMAL",
        description:
          "The U.S. reward offer was increased to up to $5 million for information leading to her arrest and/or conviction.",
        supporting_sources: [FBI_WANTED]
      }
    ],
    current_stage: "FORMAL",
    typologies: ["Fraud", "Money Laundering"],
    attribution: "Direct",
    confidence: "High",
    risk_components: {
      typology_score: 35,
      stage_score: 30,
      attribution_adjustment: 10,
      recency_adjustment: 9
    },
    matter_risk_score: 84,
    risk_level: "Critical",
    risk_calculation: "Financial-crime typology 35 + active fugitive action 30 + direct attribution 10 + recency 9 = 84.",
    key_evidence: "Current FBI wanted notice, FBI announcement, and DOJ case page.",
    key_facts:
      "FBI materials identify aliases including Dr. Ruja Ignatova, Ruja Plamenova Ignatova, Ruja P. Ignatova, and CryptoQueen.",
    supporting_sources: [FBI_WANTED, FBI_TOP_TEN, DOJ_CASE]
  }
];

export const RUJA_DEMO_REPORT: AgentReport & { mode: "demo" } = {
  case_id: "DEMO-RUJA-IGNATOVA-2026",
  input_name: "Ruja Ignatova",
  assessment_date: "2026-07-23",
  mode: "demo",
  subject_reports: [
    {
      subject_id: "S001",
      matched_name: "Ruja Ignatova",
      subject_type: "Individual",
      match_status: "Confirmed",
      identity_confidence: "High",
      final_profile: {
        profile_type: "Individual",
        profile_summary:
          "Ruja Ignatova, also known as the CryptoQueen, is a Bulgarian-born individual identified by U.S. authorities as a OneCoin co-founder and federal fugitive.",
        sourced_profile_fields: [
          {
            field_name: "entity_type_or_legal_form",
            value: "Individual",
            evidence_note: "FBI wanted notice identifies a natural person.",
            supporting_sources: [FBI_WANTED]
          }
        ]
      },
      focal_geography: {
        primary_country: "Bulgaria",
        jurisdiction: "Bulgaria",
        business_locations: [
          "Sofia, Bulgaria",
          "Athens, Greece",
          "Germany",
          "United Arab Emirates",
          "Southern District of New York, United States"
        ],
        geography_confidence: "High",
        geography_reason:
          "The FBI identifies Bulgaria as Ignatova's birthplace, OneCoin as Bulgaria-based, travel from Sofia to Athens, and connections to Germany, Greece, Russia, Bulgaria, and the UAE. The federal case is in New York.",
        supporting_sources: [FBI_WANTED, FBI_TOP_TEN, DOJ_CHARGES]
      },
      subject_risk_assessment: {
        subject_risk_score: 92,
        risk_level: "Critical",
        highest_matter_risk_score: 84,
        pattern_adjustment: 8,
        risk_calculation:
          "Highest matter score 84 + 8-point pattern adjustment for multiple related formal financial-crime matters = 92/100.",
        risk_driving_matter_ids: ["M001", "M002", "M003"]
      },
      matters,
      excluded_matters: [],
      plain_english_summary: {
        subject_profile_summary:
          "Ruja Ignatova is a Bulgarian-born individual and alleged OneCoin co-founder known as the CryptoQueen.",
        geography_summary:
          "Primary geography is Bulgaria, with relevant exposure in Greece, Germany, the United Arab Emirates, and the United States.",
        overall_risk_assessment:
          "Critical demo risk. Authoritative U.S. sources document pending fraud, money-laundering, wire-fraud, and securities-fraud charges and an active international fugitive effort. Charges are allegations and do not constitute a conviction.",
        timeline_summary:
          "The alleged OneCoin conduct began around 2014; federal charges and a warrant followed in 2017, a superseding indictment in 2018, FBI Ten Most Wanted designation in 2022, and a larger reward offer in 2024.",
        main_risk_drivers:
          "Direct alleged leadership of a multibillion-dollar global fraud scheme, formal money-laundering-related charges, and continuing fugitive status.",
        confidence_note:
          "High confidence in identity and procedural status because the demo relies on FBI and DOJ sources. No conclusion of guilt is made."
      },
      limitations: [
        "This is a curated demonstration report, not a fresh exhaustive media search.",
        "Pending charges and wanted status are not convictions; a human investigator must verify current court status before a decision."
      ],
      human_review: {
        human_review_required: true,
        review_reasons: [
          "Critical risk score and active fugitive status require escalation.",
          "Confirm the latest procedural status and identity against current official records."
        ]
      },
      final_conclusion:
        "Recommend escalation for enhanced human review. The recommendation is based on documented formal charges, an active FBI fugitive notice, and multiple directly attributed financial-crime allegations. It is not a finding of guilt."
    }
  ],
  qa_status: "Passed — curated demo",
  qa_warnings: [
    "Demo fixture based on cited FBI and DOJ records; verify current official status before operational use.",
    "Allegations and charges have not been represented as convictions."
  ]
};

export function isRujaDemoQuery(value: string): boolean {
  const normalized = value.toLowerCase().replace(/[^a-z]/g, "");
  return /^(ruja|raja)i?ignatov[ae]?$/.test(normalized);
}
