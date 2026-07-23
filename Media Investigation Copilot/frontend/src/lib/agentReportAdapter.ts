import type {
  AgentReport,
  AgentSource,
  Matter,
  ProfileField,
  SubjectReport
} from "@/types/agentReport";

export type BadgeVariant = "red" | "orange" | "green" | "secondary";

/** Map an agent risk level to the shared Badge colour variants. */
export function riskVariant(level: string): "red" | "orange" | "green" {
  const value = level.toLowerCase();
  if (value === "critical" || value === "high") return "red";
  if (value === "moderate" || value === "medium" || value === "elevated") return "orange";
  return "green";
}

/** Map a matter's current stage to a colour. */
export function stageVariant(stage: string): "red" | "orange" | "green" | "secondary" {
  const value = stage.toUpperCase();
  if (value === "CONFIRMED") return "red";
  if (value === "FORMAL") return "orange";
  if (value === "CLEARED") return "green";
  return "secondary";
}

/** R / Y / G counts across matters, based on each matter's risk level. */
export function flagCounts(matters: Matter[]) {
  let red = 0;
  let yellow = 0;
  let green = 0;
  for (const matter of matters) {
    const variant = riskVariant(matter.risk_level);
    if (variant === "red") red += 1;
    else if (variant === "orange") yellow += 1;
    else green += 1;
  }
  return { red, yellow, green };
}

/** Normalise the two source shapes (profile sources vs matter/article sources). */
function normaliseSource(source: AgentSource) {
  return {
    key: source.url || `${source.publisher}-${source.title}`,
    title: source.title,
    publisher: source.publisher,
    url: source.url,
    date: source.publication_date || source.retrieval_date || "",
    detail: source.supports || source.supported_information || ""
  };
}

export type FlatSource = ReturnType<typeof normaliseSource>;

/** Collect every source referenced anywhere in the subject report, de-duplicated by URL. */
export function collectSources(subject: SubjectReport): FlatSource[] {
  const all: AgentSource[] = [];
  for (const field of subject.final_profile.sourced_profile_fields) {
    all.push(...(field.supporting_sources ?? []));
  }
  all.push(...(subject.focal_geography.supporting_sources ?? []));
  for (const matter of subject.matters) {
    all.push(...(matter.supporting_sources ?? []));
    for (const event of matter.timeline ?? []) {
      all.push(...(event.supporting_sources ?? []));
    }
  }
  const seen = new Map<string, FlatSource>();
  for (const source of all) {
    const flat = normaliseSource(source);
    if (!seen.has(flat.key)) seen.set(flat.key, flat);
  }
  return Array.from(seen.values());
}

export type TimelineRow = {
  date: string;
  eventType: string;
  stage: string;
  description: string;
  matterId: string;
  typologies: string[];
  source?: FlatSource;
};

/** Flatten every matter's timeline into one chronological list (newest first). */
export function flattenTimeline(matters: Matter[]): TimelineRow[] {
  const rows: TimelineRow[] = [];
  for (const matter of matters) {
    for (const event of matter.timeline ?? []) {
      rows.push({
        date: event.date,
        eventType: event.event_type,
        stage: event.stage,
        description: event.description,
        matterId: matter.matter_id,
        typologies: matter.typologies,
        source: event.supporting_sources?.[0] ? normaliseSource(event.supporting_sources[0]) : undefined
      });
    }
  }
  return rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/** Aggregate typologies across matters with the highest associated stage/severity. */
export function aggregateTypologies(matters: Matter[]) {
  const map = new Map<string, { name: string; matterIds: string[]; topLevel: string }>();
  for (const matter of matters) {
    for (const typology of matter.typologies) {
      const existing = map.get(typology);
      if (existing) {
        existing.matterIds.push(matter.matter_id);
        if (riskWeight(matter.risk_level) > riskWeight(existing.topLevel)) existing.topLevel = matter.risk_level;
      } else {
        map.set(typology, { name: typology, matterIds: [matter.matter_id], topLevel: matter.risk_level });
      }
    }
  }
  return Array.from(map.values());
}

function riskWeight(level: string): number {
  const value = level.toLowerCase();
  if (value === "critical") return 4;
  if (value === "high") return 3;
  if (value === "moderate" || value === "medium") return 2;
  if (value === "low") return 1;
  return 0;
}

/** Look up a single profile field's value as a display string. */
export function profileValue(fields: ProfileField[], name: string): string {
  const field = fields.find((item) => item.field_name === name);
  if (!field) return "—";
  return Array.isArray(field.value) ? field.value.join(", ") : field.value;
}

export function findField(fields: ProfileField[], name: string): ProfileField | undefined {
  return fields.find((item) => item.field_name === name);
}

export function formatDate(value: string): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/** Confidence label → rough percentage, only for display parity with the original page. */
export function confidencePercent(label: string): number {
  const value = label.toLowerCase();
  if (value === "high") return 90;
  if (value === "medium") return 65;
  if (value === "low") return 40;
  return 0;
}

export function getSubject(report: AgentReport): SubjectReport | undefined {
  return report.subject_reports?.[0];
}
