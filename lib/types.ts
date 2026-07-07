export interface Profile {
  name?: string;
  /** ISO date, e.g. "1990-04-17" */
  birthDate: string;
  /** "HH:MM" 24h local time, optional */
  birthTime?: string;
  birthPlace?: string;
  /** free-text focus, e.g. "career change" */
  focus?: string;
}

export type AspectId = "career" | "wealth" | "relationships" | "health" | "growth";

export interface Aspect {
  id: AspectId;
  name: string;
  /** categorical palette slot 1-8 */
  slot: number;
}

export const ASPECTS: Aspect[] = [
  { id: "career", name: "Career & Purpose", slot: 1 },
  { id: "wealth", name: "Wealth & Resources", slot: 2 },
  { id: "relationships", name: "Relationships", slot: 3 },
  { id: "health", name: "Health & Vitality", slot: 4 },
  { id: "growth", name: "Growth & Wisdom", slot: 5 },
];

export interface TransitPoint {
  year: number;
  /** 0-100 supportiveness score */
  value: number;
}

export interface TransitSeries {
  aspect: AspectId;
  name: string;
  slot: number;
  points: TransitPoint[];
}

/** Chart directive the oracle agent (or demo engine) can embed in a reply. */
export interface ChartDirective {
  kind: "transit";
  title?: string;
  aspects?: AspectId[];
  startYear?: number;
  endYear?: number;
  annotations?: { year: number; label: string }[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
