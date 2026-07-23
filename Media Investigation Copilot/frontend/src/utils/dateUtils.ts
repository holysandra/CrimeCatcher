export type RecencyBucket =
  | "0_to_1_year"
  | "1_to_3_years"
  | "3_to_5_years"
  | "over_5_years"
  | "unknown";

function validUtcDate(year: number, month: number, day: number, hour = 0, minute = 0, second = 0) {
  const parsed = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }
  return parsed;
}

export function parseSourceDate(rawDate?: string | null): Date | null {
  if (!rawDate) return null;
  const value = String(rawDate).trim();
  if (!value || /^unknown/i.test(value)) return null;

  const compactDateTime = value.match(/^(\d{4})(\d{2})(\d{2})T?(\d{2})(\d{2})(\d{2})Z?$/);
  if (compactDateTime) {
    const [, year, month, day, hour, minute, second] = compactDateTime;
    return validUtcDate(Number(year), Number(month), Number(day), Number(hour), Number(minute), Number(second));
  }

  const compactDate = value.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compactDate) {
    const [, year, month, day] = compactDate;
    return validUtcDate(Number(year), Number(month), Number(day));
  }

  const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
  if (isoDate) {
    const [, year, month, day] = isoDate;
    return validUtcDate(Number(year), Number(month), Number(day));
  }

  const slashDate = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashDate) {
    const [, first, second, year] = slashDate;
    const a = Number(first);
    const b = Number(second);
    if (a > 12) return validUtcDate(Number(year), b, a);
    return validUtcDate(Number(year), a, b);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function normalizeDateToISO(rawDate?: string | null): string | null {
  const parsed = parseSourceDate(rawDate);
  if (!parsed) return null;
  return parsed.toISOString().slice(0, 10);
}

export function formatDateForDisplay(rawDate?: string | null): string {
  const parsed = parseSourceDate(rawDate);
  if (!parsed) return "Unknown date";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  }).format(parsed);
}

export function isValidDateString(rawDate?: string | null): boolean {
  return parseSourceDate(rawDate) !== null;
}

export function getRecencyBucket(rawDate?: string | null): RecencyBucket {
  const parsed = parseSourceDate(rawDate);
  if (!parsed) return "unknown";
  const now = new Date();
  const ageMs = now.getTime() - parsed.getTime();
  const years = ageMs / (365.25 * 24 * 60 * 60 * 1000);
  if (years <= 1) return "0_to_1_year";
  if (years <= 3) return "1_to_3_years";
  if (years <= 5) return "3_to_5_years";
  return "over_5_years";
}

export function compareDatesDescending(a?: string | null, b?: string | null) {
  const aDate = parseSourceDate(a);
  const bDate = parseSourceDate(b);
  if (!aDate && !bDate) return 0;
  if (!aDate) return 1;
  if (!bDate) return -1;
  return bDate.getTime() - aDate.getTime();
}
