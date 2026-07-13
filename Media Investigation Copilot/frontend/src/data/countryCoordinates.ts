export type CountryMapPoint = {
  code: string;
  name: string;
  x: number;
  y: number;
};

export const countryCoordinates: Record<string, CountryMapPoint> = {
  USA: { code: "USA", name: "United States", x: 24, y: 40 },
  GBR: { code: "GBR", name: "United Kingdom", x: 47, y: 34 },
  DEU: { code: "DEU", name: "Germany", x: 50, y: 36 },
  FRA: { code: "FRA", name: "France", x: 48.5, y: 39 },
  ITA: { code: "ITA", name: "Italy", x: 51, y: 43 },
  ESP: { code: "ESP", name: "Spain", x: 46, y: 43 },
  CHE: { code: "CHE", name: "Switzerland", x: 49.5, y: 39.5 },
  EUR: { code: "EUR", name: "European Union", x: 50, y: 38 },
  RUS: { code: "RUS", name: "Russia", x: 66, y: 31 },
  BLR: { code: "BLR", name: "Belarus", x: 56, y: 35 },
  TUR: { code: "TUR", name: "Turkey", x: 56, y: 45 },
  IRN: { code: "IRN", name: "Iran", x: 62, y: 48 },
  SYR: { code: "SYR", name: "Syria", x: 58.5, y: 47 },
  ARE: { code: "ARE", name: "United Arab Emirates", x: 63.5, y: 53 },
  IND: { code: "IND", name: "India", x: 69, y: 56 },
  CHN: { code: "CHN", name: "China", x: 75, y: 45 },
  HKG: { code: "HKG", name: "Hong Kong", x: 78.8, y: 51.5 },
  SGP: { code: "SGP", name: "Singapore", x: 75.5, y: 65 },
  PRK: { code: "PRK", name: "North Korea", x: 81, y: 42.5 },
  NGA: { code: "NGA", name: "Nigeria", x: 49.5, y: 58 },
  ZAF: { code: "ZAF", name: "South Africa", x: 52.5, y: 78 },
  BRA: { code: "BRA", name: "Brazil", x: 35, y: 70 },
  MEX: { code: "MEX", name: "Mexico", x: 20, y: 51 },
  INT: { code: "INT", name: "International", x: 50, y: 14 },
  UNK: { code: "UNK", name: "Unknown", x: 50, y: 88 }
};
