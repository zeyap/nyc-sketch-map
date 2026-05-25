import { useEffect, useState } from "react";
import type { SketchMapEvent, EventsPayload } from "./types";

export function useEvents() {
  const [events, setEvents] = useState<SketchMapEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/data/events.json")
      .then((r) => r.json())
      .then((data: EventsPayload) => {
        setEvents(data.events.filter((e) => e.lat != null && e.lng != null));
      })
      .catch((err) => console.error("Failed to load events:", err))
      .finally(() => setLoading(false));
  }, []);

  return { events, loading };
}
