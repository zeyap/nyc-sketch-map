import type { SketchMapEvent } from "./types";
import { SEASON_COLORS } from "./colors";

type Props = {
  events: SketchMapEvent[];
  rank?: number;
  tiedWith?: number;
  onClose: () => void;
};

const RANK_LABELS: Record<number, { icon: string; label: string }> = {
  1: { icon: "🥇", label: "Most sketched spot" },
  2: { icon: "🥈", label: "2nd most sketched" },
  3: { icon: "🥉", label: "3rd most sketched" },
};

function SingleCard({ event }: { event: SketchMapEvent }) {
  const color = SEASON_COLORS[event.season];

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4 w-72 flex-shrink-0 snap-start">
      <div className="flex items-center gap-2 mb-2">
        <span
          className="inline-block w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="text-xs font-medium text-gray-500 capitalize">
          {event.season} {event.year}
        </span>
      </div>

      <h2 className="text-sm font-semibold text-gray-900 leading-snug">
        {event.title}
      </h2>

      {event.locationText && (
        <p className="text-xs text-gray-600 mt-1">{event.locationText}</p>
      )}
      {event.addressText && (
        <p className="text-xs text-gray-400 mt-0.5">{event.addressText}</p>
      )}

      <p className="text-xs text-gray-500 mt-2">
        {new Date(event.date + "T12:00:00").toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>

      {event.tags && event.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {event.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {event.source.url && (
        <a
          href={event.source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-2 text-xs text-blue-600 hover:underline"
        >
          View source &rarr;
        </a>
      )}
    </div>
  );
}

export function EventCard({ events, rank, tiedWith, onClose }: Props) {
  const isMultiple = events.length > 1;
  const rankInfo = rank != null ? RANK_LABELS[rank] : undefined;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 max-w-[calc(100vw-2rem)]">
      {isMultiple && (
        <div className="flex items-center justify-between mb-2 px-1 gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 bg-white/90 px-2 py-0.5 rounded-full">
              {events.length} events
            </span>
            {rankInfo && (
              <span className="text-xs text-amber-700 bg-amber-50/90 px-2 py-0.5 rounded-full">
                {rankInfo.icon} {rankInfo.label}
                {tiedWith != null && tiedWith > 0 && (
                  <span className="text-amber-500"> (tied with {tiedWith} other{tiedWith > 1 ? "s" : ""})</span>
                )}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-sm bg-white/90 w-6 h-6 flex items-center justify-center rounded-full cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      <div
        className={`flex gap-3 ${
          isMultiple
            ? "overflow-x-auto snap-x snap-mandatory pb-2"
            : ""
        }`}
      >
        {events.map((event) => (
          <div key={event.id} className="relative">
            {!isMultiple && (
              <button
                onClick={onClose}
                className="absolute top-2 right-3 text-gray-400 hover:text-gray-600 text-lg cursor-pointer z-10"
              >
                &times;
              </button>
            )}
            <SingleCard event={event} />
          </div>
        ))}
      </div>
    </div>
  );
}
