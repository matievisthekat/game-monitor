export type Locale = "en-gb" | "en-us" | "ja-jp";
export type Site = "nintendo" | "xbox";
export type Availability = "available" | "unavailable" | "unknown";

export interface Game {
  name: string;
  url: string;
  availability: Availability;
  img?: string;
}

export interface BasicInfo {
  name: string;
  url: string;
  img?: string;
}

export interface BasicInfoSearch extends BasicInfo {
  similarity: number;
}

export interface JsonFile {
  games: Game[];
}
