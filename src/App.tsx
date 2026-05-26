import { useState, useMemo, useCallback } from "react";
import { useEvents } from "./useEvents";
import { SketchMap } from "./SketchMap";
import { FilterPanel } from "./FilterPanel";
import { EventCard } from "./EventCard";
import type { Filters, SketchMapEvent } from "./types";

function App() {
  const { events, loading } = useEvents();
  const [filters, setFilters] = useState<Filters>({
    season: "all",
    year: "all",
    borough: "all",
    day: "all",
    search: "",
  });
  const [selectedEvents, setSelectedEvents] = useState<SketchMapEvent[]>([]);

  const filtered = useMemo(() => {
    let result = events;
    if (filters.season !== "all") {
      result = result.filter((e) => e.season === filters.season);
    }
    if (filters.year !== "all") {
      result = result.filter((e) => e.year === filters.year);
    }
    if (filters.borough !== "all") {
      result = result.filter((e) => e.borough === filters.borough);
    }
    if (filters.day !== "all") {
      result = result.filter((e) => {
        const d = new Date(e.date + "T12:00:00");
        return d.getDay() === filters.day;
      });
    }
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.locationText?.toLowerCase().includes(q) ||
          e.addressText?.toLowerCase().includes(q) ||
          e.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    return result;
  }, [events, filters]);

  const locationRanks = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of filtered) {
      if (e.lat == null || e.lng == null) continue;
      const key = `${e.lat},${e.lng}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const sorted = [...counts.entries()]
      .filter(([, c]) => c > 1)
      .sort((a, b) => b[1] - a[1]);

    const tiesPerCount = new Map<number, number>();
    for (const [, count] of sorted) {
      tiesPerCount.set(count, (tiesPerCount.get(count) ?? 0) + 1);
    }

    const ranks = new Map<string, { rank: number; tiedWith: number }>();
    let rank = 0;
    let prevCount = -1;
    for (const [key, count] of sorted) {
      if (count !== prevCount) {
        rank++;
        prevCount = count;
      }
      if (rank > 3) break;
      ranks.set(key, { rank, tiedWith: tiesPerCount.get(count)! - 1 });
    }
    return ranks;
  }, [filtered]);

  const selectedRankInfo = useMemo(() => {
    if (selectedEvents.length < 2) return undefined;
    const first = selectedEvents[0];
    if (first.lat == null || first.lng == null) return undefined;
    const allSameLocation = selectedEvents.every(
      (e) => e.lat === first.lat && e.lng === first.lng
    );
    if (!allSameLocation) return undefined;
    return locationRanks.get(`${first.lat},${first.lng}`);
  }, [selectedEvents, locationRanks]);

  const handleSelectEvents = useCallback((evts: SketchMapEvent[]) => {
    setSelectedEvents(evts);
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-gray-500">
        Loading sketch map...
      </div>
    );
  }

  return (
    <div className="h-screen w-screen relative">
      <SketchMap events={filtered} onSelectEvents={handleSelectEvents} />
      <FilterPanel
        filters={filters}
        onChange={setFilters}
        events={events}
        filteredCount={filtered.length}
      />
      {selectedEvents.length > 0 && (
        <EventCard
          events={selectedEvents}
          rank={selectedRankInfo?.rank}
          tiedWith={selectedRankInfo?.tiedWith}
          onClose={() => setSelectedEvents([])}
        />
      )}
    </div>
  );
}

export default App;
