import { useState, useMemo } from "react";
import type { DayOfWeek, Filters, Season, SketchMapEvent } from "./types";
import { SEASON_COLORS } from "./colors";

const SEASONS: Season[] = ["spring", "summer", "fall", "winter"];
const DAY_LABELS: [DayOfWeek, string][] = [
  [0, "S"], [1, "M"], [2, "T"], [3, "W"], [4, "T"], [5, "F"], [6, "S"],
];

type Props = {
  filters: Filters;
  onChange: (f: Filters) => void;
  events: SketchMapEvent[];
  filteredCount: number;
  onSelectEvent: (event: SketchMapEvent) => void;
};

export function FilterPanel({ filters, onChange, events, filteredCount, onSelectEvent }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [weekCollapsed, setWeekCollapsed] = useState(false);
  const years = [...new Set(events.map((e) => e.year))].sort((a, b) => b - a);
  const boroughs = [...new Set(events.map((e) => e.borough).filter(Boolean))].sort() as string[];

  const upcoming = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
    return events
      .filter((e) => {
        const d = new Date(e.date + "T12:00:00");
        return d >= today && d <= endOfWeek;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [events]);

  return (
    <div className="absolute top-4 left-4 z-10 w-72">
    <div className="bg-white/50 backdrop-blur-sm rounded-xl shadow-lg p-4">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div>
          <h1 className="text-lg font-semibold text-gray-900 leading-tight">
            Where NYC Sketches
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {filteredCount} of {events.length} locations
          </p>
        </div>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${collapsed ? "" : "rotate-180"}`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6l5 3 5-3" /></svg>
      </div>

      {!collapsed && <div className="space-y-3 mt-3">

      <input
        type="text"
        placeholder="Search locations..."
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
      />

      <div>
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Season
        </label>
        <div className="flex gap-1.5 mt-1">
          <SeasonBtn
            label="All"
            active={filters.season === "all"}
            onClick={() => onChange({ ...filters, season: "all" })}
          />
          {SEASONS.map((s) => (
            <SeasonBtn
              key={s}
              label={s.charAt(0).toUpperCase() + s.slice(1)}
              color={SEASON_COLORS[s]}
              active={filters.season === s}
              onClick={() => onChange({ ...filters, season: s })}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Day
        </label>
        <div className="flex gap-1 mt-1">
          <DayBtn
            label="All"
            active={filters.day === "all"}
            onClick={() => onChange({ ...filters, day: "all" })}
          />
          {DAY_LABELS.map(([value, label]) => (
            <DayBtn
              key={value}
              label={label}
              active={filters.day === value}
              onClick={() => onChange({ ...filters, day: value })}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Year
          </label>
          <select
            value={filters.year}
            onChange={(e) =>
              onChange({
                ...filters,
                year: e.target.value === "all" ? "all" : Number(e.target.value),
              })
            }
            className="w-full mt-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="all">All</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Borough
          </label>
          <select
            value={filters.borough}
            onChange={(e) => onChange({ ...filters, borough: e.target.value })}
            className="w-full mt-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="all">All</option>
            {boroughs.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      </div>
      </div>}

    </div>

      {upcoming.length > 0 && (
        <div className="bg-white/50 backdrop-blur-sm rounded-xl shadow-lg mt-2 p-4">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setWeekCollapsed(!weekCollapsed)}
          >
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide flex items-center gap-2">This week <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span></p>
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${weekCollapsed ? "" : "rotate-180"}`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6l5 3 5-3" /></svg>
          </div>
          {!weekCollapsed && (
            <div className="space-y-2 mt-2">
              {upcoming.map((e) => <NextUpItem key={e.id} event={e} onClick={() => onSelectEvent(e)} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NextUpItem({ event, onClick }: { event: SketchMapEvent; onClick: () => void }) {
  const d = new Date(event.date + "T12:00:00");
  const label = d.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" });
  return (
    <div className="flex gap-2 items-baseline cursor-pointer hover:bg-gray-100 rounded px-1 -mx-1" onClick={onClick}>
      <span className="text-[11px] text-gray-400 w-16 flex-shrink-0">{label}</span>
      <span className="text-xs text-gray-700 truncate">{event.title}</span>
    </div>
  );
}

function SeasonBtn({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
        active
          ? "text-white shadow-sm"
          : "text-gray-600 bg-gray-100 hover:bg-gray-200"
      }`}
      style={active ? { backgroundColor: color ?? "#6b7280" } : undefined}
    >
      {label}
    </button>
  );
}

function DayBtn({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-1.5 py-1 text-[11px] rounded-md font-medium transition-colors cursor-pointer ${
        active
          ? "text-white bg-gray-600 shadow-sm"
          : "text-gray-600 bg-gray-100 hover:bg-gray-200"
      }`}
    >
      {label}
    </button>
  );
}
