import { countryCodeForName } from "@/data/countryNameAliases";
import type { GeographyExposure, InvestigationFinding, PublicSource, RiskRating } from "@/types/investigation";

export type CountryRiskExposure = GeographyExposure & {
  countryCode: string;
  riskRating: RiskRating | "Unknown";
  findings: NonNullable<GeographyExposure["findings"]>;
};

export function calculateCountryRiskRating(findings: InvestigationFinding[]): RiskRating | "Unknown" {
  if (findings.some((finding) => finding.severity === "Critical")) return "Critical";
  if (findings.some((finding) => finding.flag === "Red")) return "High";
  if (findings.filter((finding) => finding.flag === "Yellow").length >= 2) return "High";
  if (findings.some((finding) => finding.flag === "Yellow")) return "Moderate";
  if (findings.some((finding) => finding.flag === "Green")) return "Low";
  return "Unknown";
}

export function riskRatingFromFlag(flag: GeographyExposure["riskLevel"]): RiskRating | "Unknown" {
  if (flag === "Red") return "High";
  if (flag === "Yellow") return "Moderate";
  if (flag === "Green") return "Low";
  return "Unknown";
}

export function buildCountryRiskExposure(params: {
  geography: GeographyExposure[];
  findings: InvestigationFinding[];
  sources: PublicSource[];
}): CountryRiskExposure[] {
  const byCountry = new Map<string, InvestigationFinding[]>();
  params.findings.forEach((finding) => {
    const country = finding.jurisdiction || "Unknown";
    byCountry.set(country, [...(byCountry.get(country) ?? []), finding]);
  });

  return params.geography.map((geo) => {
    const countryFindings = byCountry.get(geo.country) ?? [];
    const sourceNames = new Set(countryFindings.map((finding) => finding.sourceName));
    const linkedSources = params.sources.filter((source) => source.jurisdiction === geo.country || sourceNames.has(source.sourceName));
    const findings = countryFindings.map((finding) => ({
      id: finding.id,
      title: finding.title,
      flag: finding.flag,
      severity: finding.severity,
      sourceLinks: finding.sourceLinks?.length
        ? finding.sourceLinks
        : linkedSources.map((source) => ({
            title: source.title,
            url: source.url,
            sourceName: source.sourceName
          }))
    }));

    return {
      ...geo,
      countryCode: countryCodeForName(geo.country),
      riskRating: calculateCountryRiskRating(countryFindings) === "Unknown" ? riskRatingFromFlag(geo.riskLevel) : calculateCountryRiskRating(countryFindings),
      findings,
      sourceCount: Math.max(geo.sourceCount, linkedSources.length)
    };
  });
}
