import { useSyncExternalStore } from "react";

export type EntityKind = "Individual" | "Entity";
export type CasePriority = "Low" | "Medium" | "High" | "Critical";
export type CaseStatus = "Queued" | "In Review" | "Closed" | "Escalated";
export type CaseRecommendation =
  | "Recommend for closure with minimum risk"
  | "Recommend for investigator review"
  | "Recommend for escalation";

export const DEMO_ASSIGNEES = [
  "Anna Keller",
  "David Okafor",
  "Helena Fischer",
  "Jonas Meyer",
  "Lukas Weber",
  "Priya Shah",
  "Sofia Marin"
] as const;

export type InvestigationCase = {
  caseNumber: number;
  subjectName: string;
  entityKind: EntityKind;
  geographicRegion: string;
  reportDate: string;
  status: CaseStatus;
  priority: CasePriority;
  assignee: string;
  riskTypology: string;
  riskScore?: number;
  recommendation?: CaseRecommendation;
  notes: string;
  createdAt: string;
};

const STORAGE_KEY = "dbcrimecatcher.cases.v2";

let cases: InvestigationCase[] = loadFromStorage();
const listeners = new Set<() => void>();

function loadFromStorage(): InvestigationCase[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as InvestigationCase[];
    return Array.isArray(parsed) ? parsed : seed();
  } catch {
    return seed();
  }
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
  } catch {
    // Browser storage can be unavailable in private mode.
  }
}

function emit() {
  persist();
  listeners.forEach((listener) => listener());
}

function demoCase(
  caseNumber: number,
  subjectName: string,
  entityKind: EntityKind,
  geographicRegion: string,
  reportDate: string,
  status: CaseStatus,
  priority: CasePriority,
  assignee: string,
  riskTypology: string,
  riskScore: number,
  recommendation?: CaseRecommendation
): InvestigationCase {
  return {
    caseNumber,
    subjectName,
    entityKind,
    geographicRegion,
    reportDate,
    status,
    priority,
    assignee,
    riskTypology,
    riskScore,
    recommendation,
    notes: "Demo investigation record for the dbCrimeCatcher review experience.",
    createdAt: new Date(`${reportDate}T09:00:00Z`).toISOString()
  };
}

function seed(): InvestigationCase[] {
  return [
    demoCase(1001, "Ruja Ignatova", "Individual", "Europe", "2026-07-23", "Escalated", "Critical", "Anna Keller", "Fraud / Money Laundering", 96, "Recommend for escalation"),
    demoCase(1002, "Wirecard AG", "Entity", "Germany", "2026-07-22", "In Review", "Critical", "David Okafor", "Accounting Fraud", 94, "Recommend for investigator review"),
    demoCase(1003, "Binance", "Entity", "Global", "2026-07-22", "Escalated", "Critical", "Priya Shah", "Money Laundering / Sanctions", 91, "Recommend for escalation"),
    demoCase(1004, "Nova Meridian Holdings", "Entity", "Middle East", "2026-07-21", "Queued", "High", "Sofia Marin", "Sanctions Evasion", 78),
    demoCase(1005, "Viktor Petrov", "Individual", "Eastern Europe", "2026-07-21", "In Review", "High", "Lukas Weber", "Bribery & Corruption", 74, "Recommend for investigator review"),
    demoCase(1006, "Elbe Renewables GmbH", "Entity", "Germany", "2026-07-20", "Closed", "Low", "Helena Fischer", "Environmental Crime", 18, "Recommend for closure with minimum risk"),
    demoCase(1007, "Camila Duarte", "Individual", "Latin America", "2026-07-20", "Queued", "Medium", "Jonas Meyer", "Tax Evasion", 46),
    demoCase(1008, "Atlas Commodities BV", "Entity", "Benelux", "2026-07-19", "In Review", "High", "Anna Keller", "Trade-based Money Laundering", 71, "Recommend for investigator review"),
    demoCase(1009, "Kenji Mori", "Individual", "Asia Pacific", "2026-07-19", "Closed", "Low", "Priya Shah", "Fraud", 21, "Recommend for closure with minimum risk"),
    demoCase(1010, "Northstar Digital Assets", "Entity", "United Kingdom", "2026-07-18", "Queued", "Medium", "David Okafor", "Cybercrime", 54),
    demoCase(1011, "Amara Okonkwo", "Individual", "West Africa", "2026-07-18", "In Review", "Medium", "Sofia Marin", "Embezzlement", 59, "Recommend for investigator review"),
    demoCase(1012, "Baltic Horizon Logistics", "Entity", "Northern Europe", "2026-07-17", "Escalated", "High", "Lukas Weber", "Smuggling", 82, "Recommend for escalation"),
    demoCase(1013, "Orchid Health Foundation", "Entity", "Southeast Asia", "2026-07-16", "Closed", "Low", "Helena Fischer", "None", 12, "Recommend for closure with minimum risk"),
    demoCase(1014, "Matteo Rinaldi", "Individual", "Southern Europe", "2026-07-16", "Queued", "Medium", "Jonas Meyer", "Organized Crime", 63),
    demoCase(1015, "Caspian Industrial Group", "Entity", "Central Asia", "2026-07-15", "In Review", "High", "Anna Keller", "Proliferation Financing", 76, "Recommend for investigator review"),
    demoCase(1016, "Leila Haddad", "Individual", "North Africa", "2026-07-15", "Closed", "Low", "David Okafor", "Fraud", 24, "Recommend for closure with minimum risk"),
    demoCase(1017, "Silverline Payments Ltd", "Entity", "Ireland", "2026-07-14", "Queued", "Medium", "Priya Shah", "Money Laundering", 57),
    demoCase(1018, "Aleksander Novak", "Individual", "Central Europe", "2026-07-14", "Escalated", "Critical", "Sofia Marin", "Terrorist Financing", 89, "Recommend for escalation")
  ];
}

function nextCaseNumber(): number {
  return cases.length === 0 ? 1001 : Math.max(...cases.map((item) => item.caseNumber)) + 1;
}

export type NewCaseInput = Omit<InvestigationCase, "caseNumber" | "createdAt">;

export function addCase(input: NewCaseInput): InvestigationCase {
  const created = { ...input, caseNumber: nextCaseNumber(), createdAt: new Date().toISOString() };
  cases = [created, ...cases];
  emit();
  return created;
}

export function removeCase(caseNumber: number) {
  cases = cases.filter((item) => item.caseNumber !== caseNumber);
  emit();
}

export function updateCaseRecommendation(caseNumber: number, recommendation: CaseRecommendation) {
  const status: CaseStatus =
    recommendation === "Recommend for escalation"
      ? "Escalated"
      : recommendation === "Recommend for investigator review"
        ? "In Review"
        : "Closed";
  cases = cases.map((item) => (item.caseNumber === caseNumber ? { ...item, recommendation, status } : item));
  emit();
}

export function upsertReviewedCase(input: {
  subjectName: string;
  entityKind: EntityKind;
  geographicRegion: string;
  priority: CasePriority;
  riskTypology: string;
  riskScore: number;
  recommendation: CaseRecommendation;
}) {
  const existing = cases.find((item) => item.subjectName.toLowerCase() === input.subjectName.toLowerCase());
  if (existing) {
    cases = cases.map((item) =>
      item.caseNumber === existing.caseNumber
        ? { ...item, ...input, reportDate: new Date().toISOString().slice(0, 10) }
        : item
    );
    updateCaseRecommendation(existing.caseNumber, input.recommendation);
    return existing.caseNumber;
  }
  const assignee = DEMO_ASSIGNEES[nextCaseNumber() % DEMO_ASSIGNEES.length];
  const created = addCase({
    ...input,
    reportDate: new Date().toISOString().slice(0, 10),
    status: "Queued",
    assignee,
    notes: "Created from a completed live investigation review."
  });
  updateCaseRecommendation(created.caseNumber, input.recommendation);
  return created.caseNumber;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return cases;
}

export function useCases(): InvestigationCase[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
