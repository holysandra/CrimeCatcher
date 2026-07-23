import { useMemo, useState } from "react";
import { Globe2, MapPinned, Minus, Plus } from "lucide-react";

import { countryCoordinates } from "@/data/countryCoordinates";
import { buildCountryRiskExposure, type CountryRiskExposure } from "@/utils/geographyUtils";
import type { EnhancedInvestigation, FlagColor, RiskRating } from "@/types/investigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function flagVariant(flag: FlagColor): "red" | "orange" | "green" {
  if (flag === "Red") return "red";
  if (flag === "Yellow") return "orange";
  return "green";
}

function riskColor(rating: RiskRating | "Unknown") {
  if (rating === "Critical") return "fill-red-700 stroke-red-950 text-red-700";
  if (rating === "High") return "fill-red-500 stroke-red-900 text-red-600";
  if (rating === "Moderate") return "fill-orange-400 stroke-orange-800 text-orange-600";
  if (rating === "Low") return "fill-green-500 stroke-green-800 text-green-600";
  return "fill-slate-300 stroke-slate-500 text-slate-500";
}

function riskBadge(rating: RiskRating | "Unknown") {
  if (rating === "Critical" || rating === "High") return "red";
  if (rating === "Moderate") return "orange";
  if (rating === "Low") return "green";
  return "secondary";
}

function coordinateFor(country: CountryRiskExposure) {
  return countryCoordinates[country.countryCode] ?? countryCoordinates.UNK;
}

export function InteractiveGeographyRiskMap({ investigation }: { investigation: EnhancedInvestigation }) {
  const exposures = useMemo(
    () =>
      buildCountryRiskExposure({
        geography: investigation.geographyExposure,
        findings: investigation.findings,
        sources: investigation.publicSources ?? []
      }),
    [investigation]
  );
  const [selectedCode, setSelectedCode] = useState(exposures[0]?.countryCode ?? "");
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const selected = exposures.find((country) => country.countryCode === selectedCode) ?? exposures[0];
  const hovered = exposures.find((country) => country.countryCode === hoveredCode);

  return (
    <Card>
      <CardHeader className="border-b bg-secondary/50">
        <CardTitle>Interactive Geography Risk Map</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        {exposures.length === 0 ? (
          <p className="rounded-lg border border-dashed bg-background p-4 text-sm text-muted-foreground">
            No geography exposure could be inferred from retrieved sources.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2 text-xs">
                {[
                  ["Critical", "bg-red-700"],
                  ["High", "bg-red-500"],
                  ["Moderate", "bg-orange-400"],
                  ["Low", "bg-green-500"],
                  ["No data", "bg-slate-300"]
                ].map(([label, color]) => (
                  <span key={label} className="inline-flex items-center gap-1 rounded-full border bg-card px-2 py-1">
                    <span className={cn("h-2.5 w-2.5 rounded-full", color)} />
                    {label}
                  </span>
                ))}
              </div>
              <div className="flex gap-2 no-print">
                <Button type="button" variant="outline" size="icon" onClick={() => setZoom((value) => Math.max(1, value - 0.2))} title="Zoom out">
                  <Minus className="h-4 w-4" />
                </Button>
                <Button type="button" variant="outline" size="icon" onClick={() => setZoom((value) => Math.min(1.8, value + 0.2))} title="Zoom in">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-lg border bg-[linear-gradient(180deg,rgba(219,234,254,0.9),rgba(240,249,255,0.72))] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(30,41,59,0.9))]">
              <svg
                viewBox="0 0 1000 520"
                role="img"
                aria-label="World map showing country-level adverse media risk exposure"
                className="h-[320px] w-full"
              >
                <g transform={`translate(${500 - 500 * zoom} ${260 - 260 * zoom}) scale(${zoom})`}>
                  <rect x="0" y="0" width="1000" height="520" className="fill-sky-50 dark:fill-slate-950" />
                  <path d="M100 138 L180 88 L285 110 L330 170 L275 245 L190 248 L130 212 Z" className="fill-slate-200 stroke-white dark:fill-slate-700 dark:stroke-slate-900" />
                  <path d="M240 260 L310 292 L350 368 L322 460 L260 430 L230 350 Z" className="fill-slate-200 stroke-white dark:fill-slate-700 dark:stroke-slate-900" />
                  <path d="M415 116 L520 86 L660 108 L725 170 L690 245 L590 252 L520 220 L420 235 L365 182 Z" className="fill-slate-200 stroke-white dark:fill-slate-700 dark:stroke-slate-900" />
                  <path d="M520 240 L610 255 L650 335 L620 435 L545 418 L500 330 Z" className="fill-slate-200 stroke-white dark:fill-slate-700 dark:stroke-slate-900" />
                  <path d="M650 180 L785 130 L900 166 L940 258 L850 318 L725 286 L670 238 Z" className="fill-slate-200 stroke-white dark:fill-slate-700 dark:stroke-slate-900" />
                  <path d="M790 350 L892 380 L920 455 L835 470 L760 430 Z" className="fill-slate-200 stroke-white dark:fill-slate-700 dark:stroke-slate-900" />
                  <path d="M470 92 L518 102 L500 124 L452 118 Z" className="fill-slate-200 stroke-white dark:fill-slate-700 dark:stroke-slate-900" />
                  {exposures.map((country) => {
                    const point = coordinateFor(country);
                    const x = point.x * 10;
                    const y = point.y * 5.2;
                    const active = selected?.countryCode === country.countryCode;
                    return (
                      <g key={country.countryCode}>
                        <circle
                          cx={x}
                          cy={y}
                          r={active ? 19 : 14}
                          className={cn("stroke-2 opacity-90 transition-all", riskColor(country.riskRating))}
                        />
                        <foreignObject x={x - 17} y={y - 17} width="34" height="34">
                          <button
                            type="button"
                            aria-label={`${country.country} ${country.riskRating} risk, ${country.findingCount} findings`}
                            title={`${country.country}: ${country.riskRating} risk, ${country.findingCount} finding(s), ${country.typologies.join(", ")}`}
                            onMouseEnter={() => setHoveredCode(country.countryCode)}
                            onMouseLeave={() => setHoveredCode(null)}
                            onFocus={() => setHoveredCode(country.countryCode)}
                            onBlur={() => setHoveredCode(null)}
                            onClick={() => setSelectedCode(country.countryCode)}
                            className="grid h-8 w-8 place-items-center rounded-full text-xs font-bold text-white outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            {country.findingCount}
                          </button>
                        </foreignObject>
                      </g>
                    );
                  })}
                </g>
              </svg>
              {hovered ? (
                <div className="absolute left-3 top-3 max-w-xs rounded-md border bg-card/95 p-3 text-xs shadow-lg">
                  <p className="font-display font-semibold">{hovered.country}</p>
                  <p className={cn("mt-1 font-display font-semibold", riskColor(hovered.riskRating))}>{hovered.riskRating} risk</p>
                  <p className="mt-1 text-muted-foreground">{hovered.findingCount} finding(s), {hovered.sourceCount} source(s)</p>
                  <p className="mt-1 text-muted-foreground">{hovered.typologies.slice(0, 3).join(", ") || "No typology mapped"}</p>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              {exposures.map((country) => (
                <Button
                  key={country.countryCode}
                  type="button"
                  variant={selected?.countryCode === country.countryCode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCode(country.countryCode)}
                >
                  <MapPinned className="h-4 w-4" />
                  {country.country}
                </Button>
              ))}
            </div>

            {selected ? (
              <div className="rounded-lg border bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 font-display font-semibold">
                    <Globe2 className="h-4 w-4 text-primary" />
                    {selected.country}
                  </div>
                  <Badge variant={riskBadge(selected.riskRating)}>{selected.riskRating}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{selected.rationale}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant={flagVariant(selected.riskLevel)}>Highest flag: {selected.riskLevel}</Badge>
                  <Badge variant="secondary">{selected.findingCount} finding(s)</Badge>
                  <Badge variant="secondary">{selected.sourceCount} source(s)</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selected.typologies.map((typology) => (
                    <Badge key={typology} variant="secondary">{typology}</Badge>
                  ))}
                </div>
                <div className="mt-4 space-y-3">
                  {selected.findings.length ? selected.findings.map((finding) => (
                    <div key={finding.id} className="rounded-md border bg-card p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-display text-sm font-semibold">{finding.title}</p>
                        <Badge variant={flagVariant(finding.flag)}>{finding.flag}</Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {finding.sourceLinks.map((link) => (
                          <a
                            key={`${finding.id}-${link.url}`}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-primary underline-offset-4 hover:underline"
                          >
                            {link.sourceName}
                          </a>
                        ))}
                      </div>
                    </div>
                  )) : (
                    <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                      This geography was inferred from source metadata, but no scored finding was linked directly to it.
                    </p>
                  )}
                </div>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
