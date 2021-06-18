export type Locale = "en-gb" | "en-us" | "ja-jp" | "en-(gb+us)";
export type Site = "nintendo" | "xbox" | "playstation";

export interface Game {
  name: string;
  url: string;
  availability: "available" | "unavailable";
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
