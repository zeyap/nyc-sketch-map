export type Season = "winter" | "spring" | "summer" | "fall";

export type SketchMapEvent = {
  id: string;
  title: string;
  date: string;
  year: number;
  month: number;
  season: Season;
  locationText?: string;
  addressText?: string;
  borough?: string;
  lat?: number;
  lng?: number;
  geocodeStatus: "manual" | "auto" | "needs_review" | "failed";
  source: {
    type: "google_calendar" | "nycusk_blog" | "manual";
    url?: string;
    title?: string;
  };
  tags?: string[];
};

export type EventsPayload = {
  generatedAt: string;
  range: { from: string; to: string };
  source: string;
  events: SketchMapEvent[];
};

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type Filters = {
  season: Season | "all";
  year: number | "all";
  borough: string | "all";
  day: DayOfWeek | "all";
  search: string;
};
