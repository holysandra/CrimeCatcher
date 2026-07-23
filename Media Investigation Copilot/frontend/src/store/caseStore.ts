import { useSyncExternalStore } from "react";

export type CaseStatus = "Complete" | "In Progress";

export type InvestigationCase = {
  /** Unique numerical case number, auto-incremented. */
  caseNumber: number;
  task: string;
  reportDate: string;
  status: CaseStatus;
  company: string;
  headquarters: string;
  jurisdiction: string;
  entityType: string;
  industry: string;
  investigator: string;
  riskTypology: string;
  notes: string;
  createdAt: string;
};

const STORAGE_KEY = "crimecatcher.cases.v1";

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
    // ignore write failures (e.g. private mode)
  }
}

function emit() {
  persist();
  listeners.forEach((listener) => listener());
}

/** A couple of example rows so the table isn't empty on first load. */
function seed(): InvestigationCase[] {
  return [
    {
      caseNumber: 1001,
      task: "Adverse media review — Wirecard AG",
      reportDate: "2026-07-20",
      status: "Complete",
      company: "Wirecard AG",
      headquarters: "Aschheim, Germany",
      jurisdiction: "Germany",
      entityType: "Payment / E-money Firm",
      industry: "Fintech / Payments",
      investigator: "A. Nowak",
      riskTypology: "Accounting Fraud",
      notes: "Historic insolvency and fraud case. Closed for reference.",
      createdAt: new Date("2026-07-20").toISOString()
    },
    {
      caseNumber: 1002,
      task: "Sanctions & AML screening — Northgate Trading Ltd",
      reportDate: "2026-07-22",
      status: "In Progress",
      company: "Northgate Trading Ltd",
      headquarters: "Nicosia, Cyprus",
      jurisdiction: "Cyprus",
      entityType: "Company",
      industry: "Commodities Trading",
      investigator: "R. Silva",
      riskTypology: "Sanctions Evasion",
      notes: "Awaiting beneficial ownership confirmation.",
      createdAt: new Date("2026-07-22").toISOString()
    }
  ];
}

function nextCaseNumber(): number {
  if (cases.length === 0) return 1001;
  return Math.max(...cases.map((item) => item.caseNumber)) + 1;
}

export type NewCaseInput = Omit<InvestigationCase, "caseNumber" | "createdAt">;

export function addCase(input: NewCaseInput): InvestigationCase {
  const created: InvestigationCase = {
    ...input,
    caseNumber: nextCaseNumber(),
    createdAt: new Date().toISOString()
  };
  cases = [created, ...cases];
  emit();
  return created;
}

export function removeCase(caseNumber: number) {
  cases = cases.filter((item) => item.caseNumber !== caseNumber);
  emit();
}

export function toggleStatus(caseNumber: number) {
  cases = cases.map((item) =>
    item.caseNumber === caseNumber
      ? { ...item, status: item.status === "Complete" ? "In Progress" : "Complete" }
      : item
  );
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return cases;
}

/** Reactive hook — any component using it re-renders when the case list changes. */
export function useCases(): InvestigationCase[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
