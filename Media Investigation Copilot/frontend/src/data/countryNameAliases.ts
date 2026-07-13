export const countryAliases: Record<string, string> = {
  "United States": "USA",
  "U.S.": "USA",
  US: "USA",
  USA: "USA",
  America: "USA",
  "United Kingdom": "GBR",
  UK: "GBR",
  Britain: "GBR",
  England: "GBR",
  Germany: "DEU",
  Deutschland: "DEU",
  "Hong Kong": "HKG",
  China: "CHN",
  "Mainland China": "CHN",
  Singapore: "SGP",
  Russia: "RUS",
  "Russian Federation": "RUS",
  Iran: "IRN",
  "North Korea": "PRK",
  Syria: "SYR",
  Belarus: "BLR",
  "United Arab Emirates": "ARE",
  UAE: "ARE",
  Turkey: "TUR",
  Nigeria: "NGA",
  "South Africa": "ZAF",
  India: "IND",
  Brazil: "BRA",
  Mexico: "MEX",
  France: "FRA",
  Italy: "ITA",
  Spain: "ESP",
  Switzerland: "CHE",
  "European Union": "EUR",
  International: "INT",
  "United Nations": "INT"
};

export const countryNamesByCode = Object.entries(countryAliases).reduce<Record<string, string>>((acc, [name, code]) => {
  acc[code] ||= name;
  return acc;
}, {});

export function countryCodeForName(country?: string | null) {
  if (!country) return "UNK";
  const exact = countryAliases[country];
  if (exact) return exact;
  const lowered = country.toLowerCase();
  const match = Object.entries(countryAliases).find(([alias]) => alias.toLowerCase() === lowered);
  return match?.[1] ?? country.slice(0, 3).toUpperCase();
}
