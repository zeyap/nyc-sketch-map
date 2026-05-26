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
          onClose={() => setSelectedEvents([])}
        />
      )}
    </div>
  );
}

export default App;
