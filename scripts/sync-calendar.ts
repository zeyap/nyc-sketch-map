import fs from "node:fs";
import path from "node:path";
import ICAL from "ical.js";

const CALENDAR_ID =
  "c_d4a7ad61b25193d8b865d8d644c6c2d1b8e177e514c3c2944b3169a770d7527a@group.calendar.google.com";
const ICAL_URL = `https://calendar.google.com/calendar/ical/${encodeURIComponent(CALENDAR_ID)}/public/basic.ics`;

const ROOT = path.resolve(import.meta.dirname, "..");
const RAW_PATH = path.join(ROOT, "data", "raw", "calendar-events.json");
const GEOCODE_CACHE_PATH = path.join(ROOT, "data", "geocode-cache.json");
const VENUE_LOOKUP_PATH = path.join(ROOT, "data", "venue-lookup.json");
const OUTPUT_PATH = path.join(ROOT, "public", "data", "events.json");

type Season = "winter" | "spring" | "summer" | "fall";

function getSeason(month: number): Season {
  if ([12, 1, 2].includes(month)) return "winter";
  if ([3, 4, 5].includes(month)) return "spring";
  if ([6, 7, 8].includes(month)) return "summer";
  return "fall";
}

function normalizeLocationKey(loc: string): string {
  return loc.trim().replace(/\s+/g, " ");
}

type RawEvent = {
  uid: string;
  summary: string;
  dtstart: string;
  location?: string;
  description?: string;
};

type SketchMapEvent = {
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
    type: "google_calendar";
    title: string;
    googleEventId: string;
    url?: string;
  };
  tags?: string[];
};

type GeocodeEntry = {
  lat: number | null;
  lng: number | null;
  borough?: string;
  provider: string;
  updatedAt: string;
};

async function fetchIcal(): Promise<string> {
  console.log("Fetching iCal feed...");
  const res = await fetch(ICAL_URL);
  if (!res.ok) throw new Error(`Failed to fetch iCal: ${res.status} ${res.statusText}`);
  return res.text();
}

function parseIcal(icsText: string): RawEvent[] {
  const jcal = ICAL.parse(icsText);
  const comp = new ICAL.Component(jcal);
  const vevents = comp.getAllSubcomponents("vevent");

  const events: RawEvent[] = [];

  for (const vevent of vevents) {
    const event = new ICAL.Event(vevent);
    const dtstart = event.startDate;
    if (!dtstart) continue;

    events.push({
      uid: event.uid,
      summary: event.summary || "(untitled)",
      dtstart: dtstart.toJSDate().toISOString(),
      location: event.location || undefined,
      description: event.description || undefined,
    });
  }

  return events;
}

type VenueLookupEntry = {
  lat: number;
  lng: number;
  borough?: string;
  name: string;
};

function loadGeocodeCache(): Record<string, GeocodeEntry> {
  try {
    return JSON.parse(fs.readFileSync(GEOCODE_CACHE_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function loadVenueLookup(): Record<string, VenueLookupEntry> {
  try {
    return JSON.parse(fs.readFileSync(VENUE_LOOKUP_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function matchVenue(
  title: string,
  venueLookup: Record<string, VenueLookupEntry>
): VenueLookupEntry | undefined {
  const lower = title.toLowerCase();
  let bestMatch: VenueLookupEntry | undefined;
  let bestLen = 0;
  for (const [key, entry] of Object.entries(venueLookup)) {
    if (lower.includes(key) && key.length > bestLen) {
      bestMatch = entry;
      bestLen = key.length;
    }
  }
  return bestMatch;
}

function normalizeEvents(
  raw: RawEvent[],
  geocodeCache: Record<string, GeocodeEntry>,
  venueLookup: Record<string, VenueLookupEntry>
): SketchMapEvent[] {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 24);

  return raw
    .filter((e) => new Date(e.dtstart) >= cutoff)
    .sort((a, b) => new Date(b.dtstart).getTime() - new Date(a.dtstart).getTime())
    .map((e) => {
      const dt = new Date(e.dtstart);
      const date = dt.toISOString().split("T")[0];
      const year = dt.getFullYear();
      const month = dt.getMonth() + 1;

      const locationKey = e.location ? normalizeLocationKey(e.location) : undefined;
      const geo = locationKey ? geocodeCache[locationKey] : undefined;
      const isUrlLocation = locationKey?.startsWith("http");

      const venueMatch = matchVenue(e.summary, venueLookup);

      let resolvedLat: number | undefined;
      let resolvedLng: number | undefined;
      let resolvedBorough: string | undefined;
      let resolvedLocationText: string | undefined;
      let geocodeStatus: SketchMapEvent["geocodeStatus"];

      if (geo && geo.lat != null) {
        resolvedLat = geo.lat;
        resolvedLng = geo.lng;
        resolvedBorough = geo.borough;
        resolvedLocationText = isUrlLocation ? undefined : e.location;
        geocodeStatus = "manual";
      } else if (geo && geo.lat == null) {
        geocodeStatus = "failed";
      } else if (venueMatch) {
        resolvedLat = venueMatch.lat;
        resolvedLng = venueMatch.lng;
        resolvedBorough = venueMatch.borough;
        resolvedLocationText = venueMatch.name;
        geocodeStatus = "auto";
      } else if (isUrlLocation || e.location) {
        geocodeStatus = "needs_review";
      } else {
        geocodeStatus = "failed";
      }

      const event: SketchMapEvent = {
        id: e.uid,
        title: e.summary,
        date,
        year,
        month,
        season: getSeason(month),
        locationText: resolvedLocationText ?? (isUrlLocation ? undefined : e.location || undefined),
        lat: resolvedLat,
        lng: resolvedLng,
        borough: resolvedBorough,
        geocodeStatus,
        source: {
          type: "google_calendar",
          title: e.summary,
          googleEventId: e.uid,
          url: isUrlLocation ? e.location : undefined,
        },
      };

      return event;
    });
}

async function main() {
  const icsText = await fetchIcal();
  const raw = parseIcal(icsText);
  console.log(`Parsed ${raw.length} events from iCal feed`);

  fs.mkdirSync(path.dirname(RAW_PATH), { recursive: true });
  fs.writeFileSync(RAW_PATH, JSON.stringify(raw, null, 2) + "\n");
  console.log(`Saved raw events to ${RAW_PATH}`);

  const geocodeCache = loadGeocodeCache();
  const venueLookup = loadVenueLookup();
  console.log(`Geocode cache has ${Object.keys(geocodeCache).length} entries`);
  console.log(`Venue lookup has ${Object.keys(venueLookup).length} entries`);

  const events = normalizeEvents(raw, geocodeCache, venueLookup);
  const withCoords = events.filter((e) => e.lat != null);
  const fromCache = events.filter((e) => e.geocodeStatus === "manual");
  const fromVenue = events.filter((e) => e.geocodeStatus === "auto");
  const needsReview = events.filter((e) => e.geocodeStatus === "needs_review");

  console.log(`Normalized ${events.length} events (last 24 months)`);
  console.log(`  ${withCoords.length} geocoded (${fromCache.length} from cache, ${fromVenue.length} from title match)`);
  console.log(`  ${needsReview.length} need review`);

  if (needsReview.length > 0) {
    console.log("\nLocations needing geocoding:");
    const unique = [...new Set(needsReview.map((e) => e.locationText).filter(Boolean))];
    for (const loc of unique) {
      console.log(`  - ${loc}`);
    }
  }

  const now = new Date();
  const from = new Date(now);
  from.setMonth(from.getMonth() - 24);

  const payload = {
    generatedAt: now.toISOString(),
    range: {
      from: from.toISOString().split("T")[0],
      to: now.toISOString().split("T")[0],
    },
    source: "google_calendar",
    events,
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2) + "\n");
  console.log(`\nWrote ${events.length} events to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error("Sync failed:", err);
  process.exit(1);
});
