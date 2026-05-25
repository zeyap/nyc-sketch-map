# NYC Sketch Map — Working Plan

## Concept

Create a map-based archive of NYC Urban Sketchers meetups. The first version focuses on **locations and dates**, not individual drawings.

Each map point represents a sketching event/location. Users can filter by season, year, month, borough, and eventually location type.

The product idea is less “personal portfolio” and more **community sketching memory map**: where the community has gathered to observe and draw the city over time.

## Key Technical Decisions

- **Map engine:** MapLibre GL JS
- **Basemap source for v1:** OpenFreeMap, likely starting from Positron
- **Basemap styling tool:** Maputnik
- **Event data layer:** GeoJSON source rendered with MapLibre circle/cluster layers
- **Main data store for v1:** JSON files in the GitHub repo
- **Update mechanism:** weekly GitHub Action that refreshes cached calendar data
- **Backend:** no live backend for v1; serve cached `/public/data/events.json`
- **D3:** not used as the main map engine; only optional later for supporting charts/timelines
- **deck.gl:** optional later only for advanced/heavy map visualizations

## MVP Scope

### Include

- Past sketching event locations
- Event dates
- Season derived from date
- Year and month filters
- Map pins
- Clickable event cards
- Link back to the original source, such as NYC Urban Sketchers blog post or Google Calendar event
- Manual review before publishing extracted events

### Exclude for MVP

- Individual artists’ drawings
- Scraping Instagram images
- User accounts
- Submissions
- Complex backend/database
- Full-text search
- AI chatbot or recommendation layer

These can come later.

## Data Sources

### Preferred source: Google Calendar

If calendar access is available, use Google Calendar as the main source because it already has structured fields:

- title
- date/time
- location
- description
- event link
- recurrence metadata
- updated timestamp

This should be treated as **calendar syncing**, not scraping.

Possible access methods:

1. **Public or secret iCal feed**

   - Easiest MVP path
   - Fetch `.ics` on a schedule
   - Parse events into normalized data
   - Keep secret calendar URL out of the frontend/repo

2. **Google Calendar API**

   - Better long-term path
   - Use `events.list`
   - Use `singleEvents=true` to expand recurring events
   - Store `nextSyncToken` for incremental updates
   - Fall back to full sync if sync token expires

3. **Manual ****************.ics**************** export**

   - Useful for one-time import
   - Not ideal for ongoing updates

### Secondary source: NYC Urban Sketchers blog

Use the blog later or as backup. Blog posts may include date, location, address, meeting point, show-and-tell location, and notes, but extraction is messier than calendar data.

## Recommended Architecture

Start without a live backend.

Use the GitHub repo as the data store and GitHub Actions as the batch update worker.

```txt
Google Calendar / iCal
        ↓
weekly GitHub Action
        ↓
raw source cache + geocode cache + manual overrides in repo
        ↓
generated public events.json
        ↓
static map website
```

This means the first version does **not** need a backend server or database. The “backend” is only a scheduled script that runs weekly and commits a generated JSON file.

Frontend can be:

```txt
Vite / Next.js / Astro
+ MapLibre GL JS
+ OpenFreeMap or Protomaps basemap
+ static JSON data
+ client-side filters
```

Map rendering decision:

- Use **MapLibre GL JS** as the main interactive map engine.
- Do **not** use D3 as the main map engine.
- Use D3 only later for small supporting visualizations, such as a timeline, histogram, legend, or non-map chart.
- Add deck.gl only later if the project needs heavier geospatial visualization, such as animated timelines, heatmaps, arcs, or very large datasets.

For MVP, serve data from:

```txt
/public/data/events.json
```

Recommended repo data files:

```txt
/data
  raw/
    calendar-events.json
  geocode-cache.json
  location-overrides.json
  event-overrides.json
  ignored-events.json
  sync-state.json

/public/data
  events.json
```

Purpose of each file:

- `raw/calendar-events.json`: raw fetched calendar events, useful for debugging
- `geocode-cache.json`: saved coordinates by normalized location name
- `location-overrides.json`: manual corrections for ambiguous locations
- `event-overrides.json`: manual fixes to event title/date/location/tags
- `ignored-events.json`: events that should not appear on the map
- `sync-state.json`: metadata about last successful sync
- `public/data/events.json`: final public payload consumed by the frontend

If using a private API key or secret iCal URL, store it in GitHub Actions secrets, not in the frontend. The generated public JSON should contain only safe public fields.

Later, split by year if the file grows:

```txt
/public/data/manifest.json
/public/data/events-2023.json
/public/data/events-2024.json
/public/data/events-2025.json
/public/data/events-2026.json
```

## Do We Need a Backend?

No, not for v1.

Use this rule:

```txt
Static JSON in repo is enough when:
  - data updates weekly or daily
  - users only browse/filter the map
  - no login is needed
  - no user submissions are needed
  - event count is modest
```

A backend/database becomes useful when:

```txt
Need backend/database when:
  - users submit sketch links
  - artists opt in and manage their own drawings
  - moderation/admin UI is needed
  - private data must be protected at request time
  - the app needs live updates
  - the dataset gets large enough for server-side search
```

Best v1 storage decision:

```txt
Data store: GitHub repo JSON files
Updater: weekly GitHub Action
Serving: static /public/data/events.json
Frontend: static site with client-side filtering
```

This gives the project a dynamic source of truth without needing a live backend.

## Data Model

```ts
type SketchMapEvent = {
  id: string;
  title: string;
  date: string;
  year: number;
  month: number;
  season: "winter" | "spring" | "summer" | "fall";

  locationText?: string;
  addressText?: string;
  borough?: string;

  lat?: number;
  lng?: number;
  geocodeStatus: "manual" | "auto" | "needs_review" | "failed";

  source: {
    type: "google_calendar" | "nycusk_blog" | "manual";
    url?: string;
    googleEventId?: string;
    blogPostId?: string;
    title?: string;
    published?: string;
    updated?: string;
  };

  tags?: string[];
};
```

Season can be derived from month:

```ts
function getSeason(month: number) {
  if ([12, 1, 2].includes(month)) return "winter";
  if ([3, 4, 5].includes(month)) return "spring";
  if ([6, 7, 8].includes(month)) return "summer";
  return "fall";
}
```

## Suggested Repo Structure

```txt
/scripts
  sync-google-calendar.ts
  parse-ics.ts
  fetch-blog-posts.ts
  normalize-events.ts
  geocode-new-events.ts
  build-public-data.ts
  validate-data.ts

/data
  raw/
    google-calendar-events.json
    blogger-posts.jsonl
  events.pending.json
  events.approved.json
  geocode-cache.json
  sync-state.json

/public/data
  events.json
```

## Update Strategy

Preferred default: fetch from the calendar **weekly**, cache the normalized result, and serve that cached result for the rest of the week.

This keeps the app simple and reliable:

```txt
Weekly scheduled job
  ↓
fetch last 24 months + next 3 months from calendar
  ↓
normalize events
  ↓
geocode new locations using cache
  ↓
validate result
  ↓
write cached events payload
  ↓
frontend/API serves cached payload all week
```

Default cache window:

```txt
from = today minus 24 months
to = today plus 3 months
```

Public/cache output:

```txt
/public/data/events.json
```

or, if using a server/API layer:

```txt
/cache/events-default.json
/api/events → returns cached events-default.json
```

Recommended cached payload shape:

```ts
type CachedEventsPayload = {
  generatedAt: string;
  validUntil?: string;
  range: {
    from: string;
    to: string;
  };
  source: {
    type: "google_calendar" | "ical";
    calendarId: string;
  };
  events: SketchMapEvent[];
};
```

Frontend default behavior:

```txt
Load cached default dataset
Filter season/year/month client-side
Do not call Google Calendar directly
```

Possible cache storage options:

1. **Static JSON committed by GitHub Action**

   - Simplest and very reliable
   - Weekly job updates `public/data/events.json`
   - Good for static hosting

2. **Vercel/Netlify serverless function + blob/KV/file cache**

   - API endpoint returns cached payload
   - Better if adding server-only geocoding or private secrets

3. **Cloudflare Worker + KV/R2**

   - Good lightweight edge option
   - API returns cached JSON

Best MVP recommendation:

```txt
GitHub Action weekly updates events.json
Frontend fetches /data/events.json
```

Fallback behavior:

- If weekly calendar fetch fails, keep serving the previous successful cached file.
- The updater should not overwrite the cache with an empty or invalid result.
- Validation should check that events have valid dates, stable IDs, and reasonable lat/lng if coordinates are present.

For Google Calendar API, store sync state only if later maintaining a full mirror. For the default weekly cached 1–2 year window, a bounded refetch is simpler than incremental sync.

Use GitHub Actions or another scheduled job.

A weekly update is enough for MVP.

```txt
Scheduled job:
  fetch calendar updates
  normalize events
  geocode only new locations
  validate data
  write cache
  commit changes or deploy updated cache
```

For iCal, store hashes per event UID to detect changes:

```json
{
  "eventUid": "abc123",
  "lastSeenHash": "..."
}
```

## Manual Review Queue

Do not auto-publish all extracted events.

Some sources may contain multiple locations:

- sketching location
- meeting location
- rain location
- lunch location
- show-and-tell location

Use a review queue:

```txt
new source event/post
  ↓
extract candidate map event
  ↓
if confidence high → events.pending.json
  ↓
manual review/edit
  ↓
events.approved.json
  ↓
public events.json
```

Candidate example:

```json
{
  "date": "2025-08-13",
  "locationText": "Snug Harbor Cultural Center",
  "confidence": 0.82,
  "reason": "Matched event location field from calendar",
  "sourceUrl": "..."
}
```

## Geocoding Strategy

Geocode during the update pipeline, not in the browser.

Store coordinates permanently only when allowed by the provider’s terms.

Practical MVP approach:

1. Extract event date and location.
2. Manually geocode the first set of locations.
3. Store lat/lng in `geocode-cache.json`.
4. Reuse cached coordinates for repeated locations.
5. Only auto-geocode truly new locations.
6. Mark uncertain results as `needs_review`.

Example cache:

```json
{
  "Snug Harbor Cultural Center, Staten Island, NY": {
    "lat": 40.6426,
    "lng": -74.1019,
    "provider": "manual",
    "updatedAt": "2026-05-25"
  }
}
```

## Privacy and Permissions

If using a public calendar or public blog, publishing date/title/location/source link is reasonable.

If using a private organizer calendar, strip anything private before publishing:

- attendee names/emails
- organizer emails
- Zoom links
- private notes
- internal planning comments
- anything not meant for public event discovery

Public data should ideally include only:

- date
- title
- location
- source link, if public
- optional public description summary

## Map Rendering and Styling Decision

Use this v1 stack:

```txt
Renderer: MapLibre GL JS
Basemap tiles: OpenFreeMap for v1
Style editor: Maputnik
Basemap style: start from OpenFreeMap Positron, then customize to a warmer/quieter sketchbook-like style
Event overlay: GeoJSON source + MapLibre circle/cluster layers
UI: React + Tailwind/shadcn-style components
```

Why MapLibre:

- Good open-source default for modern interactive web maps
- Supports styled vector basemaps through style JSON
- Supports GeoJSON sources, data-driven styling, clustering, hover, click, and filtering
- Better fit than Leaflet when custom basemap styling matters
- Much simpler than building map interaction from scratch with D3

Do not use D3 as the main map layer. D3 is better for custom SVG/geographic visualizations and supporting charts, not for a normal slippy map with pan, zoom, basemap styling, and mobile gestures.

Use deck.gl only if needed later for advanced visualization:

- heatmaps
- animated timeline playback
- thousands/tens of thousands of points
- 3D columns by visit frequency
- arcs/routes between sketch locations

Recommended styling workflow:

```txt
1. Start with OpenFreeMap Positron in MapLibre.
2. Add sketch events as a GeoJSON source.
3. Style event points by season with MapLibre circle layers.
4. Add clustering for repeated/nearby locations.
5. Customize the basemap in Maputnik.
6. Export and host the customized style JSON in the repo.
7. Keep event cards, filters, and side panels in normal React/CSS.
```

Possible v2 self-hosting path:

```txt
MapLibre GL JS
+ Protomaps PMTiles
+ custom Protomaps flavor
+ same GeoJSON event layer
```

This would make the project more self-contained, but OpenFreeMap is faster for v1.

## Frontend MVP

Core UI:

- Map of points
- Season filter
- Year filter
- Month filter
- Search box
- Event detail popup/card
- Link to source

Nice later additions:

- Borough filter
- Indoor/outdoor filter
- Waterfront/park/museum/architecture tags
- “Repeated locations” view
- Timeline slider
- Heatmap by season
- Artist opt-in links
- Instagram/sketch links
- Route suggestions for sketch walks

## Current Recommendation

Start with:

1. Dynamic calendar-backed data source
2. Default query window of the last 1–2 years, plus optionally upcoming events
3. Server-side calendar fetching, not direct browser calls to Google Calendar
4. Normalized event API for the frontend
5. Cached geocoding and manual review for uncertain locations
6. Season/year/month filters

Avoid a full user-facing database until there are submissions, moderation, accounts, or rich search needs.

## Updated Direction: Dynamic Calendar Source

Instead of publishing only a static `events.json`, prefer a dynamic data source with caching.

Recommended flow:

```txt
Frontend
  ↓
/api/events?from=YYYY-MM-DD&to=YYYY-MM-DD
  ↓
server-side calendar sync/fetch layer
  ↓
normalize calendar events
  ↓
geocode from cache
  ↓
return map-ready events
```

Default frontend behavior:

```txt
Load last 24 months of events by default
Optionally include next 1–3 months for upcoming sketch events
Allow users to widen/narrow by year or season later
```

The API should return already-normalized objects, not raw Google Calendar events.

Example endpoint response:

```ts
type EventsApiResponse = {
  range: {
    from: string;
    to: string;
  };
  generatedAt: string;
  source: "google_calendar" | "ical" | "cache";
  events: SketchMapEvent[];
};
```

## Calendar ID Discovery

The NYC Urban Sketchers calendar iframe exposes this Google Calendar ID:

```txt
c_d4a7ad61b25193d8b865d8d644c6c2d1b8e177e514c3c2944b3169a770d7527a@group.calendar.google.com
```

Original iframe:

```html
<iframe src="https://calendar.google.com/calendar/embed?src=c_d4a7ad61b25193d8b865d8d644c6c2d1b8e177e514c3c2944b3169a770d7527a%40group.calendar.google.com&amp;ctz=America%2FNew_York" style="border: 0" width="700" height="600" frameborder="0" scrolling="no"></iframe>
```

Decoded calendar source:

```txt
c_d4a7ad61b25193d8b865d8d644c6c2d1b8e177e514c3c2944b3169a770d7527a@group.calendar.google.com
```

Likely public iCal URL:

```txt
https://calendar.google.com/calendar/ical/c_d4a7ad61b25193d8b865d8d644c6c2d1b8e177e514c3c2944b3169a770d7527a%40group.calendar.google.com/public/basic.ics
```

Calendar embed URL:

```txt
https://calendar.google.com/calendar/embed?src=c_d4a7ad61b25193d8b865d8d644c6c2d1b8e177e514c3c2944b3169a770d7527a%40group.calendar.google.com&ctz=America%2FNew_York
```

For Google Calendar API, use the decoded calendar ID as `calendarId`.

Do not expose a secret iCal URL in frontend code. This one appears to be a public group-calendar ID from a public iframe, but server-side fetching is still preferred so the frontend depends only on the app’s normalized `/api/events` endpoint.

## Dynamic Fetching vs Static JSON

Use static JSON only for the earliest prototype or for generated cache artifacts.

Better long-term MVP:

```txt
/api/events
  - server-only calendar credentials or iCal URL
  - default last 24 months
  - optional from/to query params
  - response cached for a day or a week
```

Possible deployment options:

- Next.js API route on Vercel
- Cloudflare Worker + KV cache
- Netlify Function
- GitHub Action-generated JSON if avoiding server cost entirely

A good compromise:

```txt
Dynamic API for current/default window
Nightly or weekly cache refresh
Fallback to last successful cached JSON if calendar fetch fails
```

## Google Calendar Fetch Strategy

For a dynamic 1–2 year window, the simplest approach is not incremental sync. Use:

```txt
timeMin = today minus 24 months
timeMax = today plus 3 months
singleEvents = true
orderBy = startTime
```

Incremental sync with `nextSyncToken` is useful if maintaining a complete local mirror, but it is less convenient for arbitrary sliding windows because Google Calendar API restricts combining `syncToken` with parameters like `timeMin` and `timeMax`.

So the practical MVP approach is:

1. Fetch a bounded date window.
2. Cache the normalized response.
3. Use calendar `updated`/event IDs to detect changes if needed.
4. Only geocode locations missing from the cache.
5. Fall back to cached results if upstream fetch fails.

## Suggested API Contract

```ts
GET /api/events
GET /api/events?from=2024-01-01&to=2026-12-31
GET /api/events?season=summer&from=2024-01-01
```

Default behavior when no query params are passed:

```ts
const now = new Date();
const from = subtractMonths(now, 24);
const to = addMonths(now, 3);
```

The frontend should be able to filter client-side after receiving the default 1–2 year dataset.

