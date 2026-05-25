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
};

export function FilterPanel({ filters, onChange, events, filteredCount }: Props) {
  const years = [...new Set(events.map((e) => e.year))].sort((a, b) => b - a);
  const boroughs = [...new Set(events.map((e) => e.borough).filter(Boolean))].sort() as string[];

  return (
    <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4 w-72 space-y-3">
      <div>
        <h1 className="text-lg font-semibold text-gray-900 leading-tight">
          NYC Sketch Map
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {filteredCount} of {events.length} locations
        </p>
      </div>

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
