"use client";

import { useState } from "react";
import { Plus, Trash2, Play, RotateCcw, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

type GeoShape = "radius" | "polygon" | "rectangle" | "isochrone";
type LogicalOp = "AND" | "OR" | "NOT";
type CompareOp = "=" | "!=" | ">" | "<" | ">=" | "<=" | "contains" | "in";

interface FilterCondition {
  id: string;
  field: string;
  operator: CompareOp;
  value: string;
  logicalOp: LogicalOp;
}

interface GeoFilter {
  shape: GeoShape;
  center?: { lat: number; lng: number };
  radiusMiles?: number;
  isochroneMinutes?: number;
  isochroneMode?: "drive" | "walk" | "transit";
  conditions: FilterCondition[];
}

const FIELDS = [
  { value: "propertyType", label: "Property Type" },
  { value: "squareFeet", label: "Square Feet" },
  { value: "yearBuilt", label: "Year Built" },
  { value: "units", label: "Units" },
  { value: "stories", label: "Stories" },
  { value: "zoningDistrict", label: "Zoning District" },
  { value: "landArea.sqft", label: "Land Area (SF)" },
  { value: "landArea.acres", label: "Land Area (Acres)" },
  { value: "propertyUse", label: "Property Use" },
  { value: "neighborhood", label: "Neighborhood" },
  { value: "owner.name", label: "Owner Name" },
];

const OPERATORS: { value: CompareOp; label: string }[] = [
  { value: "=", label: "equals" },
  { value: "!=", label: "not equals" },
  { value: ">", label: "greater than" },
  { value: "<", label: "less than" },
  { value: ">=", label: "greater or equal" },
  { value: "<=", label: "less or equal" },
  { value: "contains", label: "contains" },
  { value: "in", label: "in list" },
];

let conditionCounter = 0;
function newCondition(logicalOp: LogicalOp = "AND"): FilterCondition {
  return {
    id: `c-${++conditionCounter}`,
    field: "propertyType",
    operator: "=",
    value: "",
    logicalOp,
  };
}

export default function GeoFilterBuilder({
  onClose,
}: {
  onClose: () => void;
}) {
  const [geoFilter, setGeoFilter] = useState<GeoFilter>({
    shape: "radius",
    center: { lat: 38.9072, lng: -77.0369 },
    radiusMiles: 1,
    conditions: [newCondition("AND")],
  });

  const [resultCount, setResultCount] = useState<number | null>(null);

  function addCondition() {
    setGeoFilter((prev) => ({
      ...prev,
      conditions: [...prev.conditions, newCondition("AND")],
    }));
  }

  function removeCondition(id: string) {
    setGeoFilter((prev) => ({
      ...prev,
      conditions: prev.conditions.filter((c) => c.id !== id),
    }));
  }

  function updateCondition(id: string, updates: Partial<FilterCondition>) {
    setGeoFilter((prev) => ({
      ...prev,
      conditions: prev.conditions.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }));
  }

  function runQuery() {
    // Mock query execution
    setResultCount(Math.floor(Math.random() * 50) + 5);
  }

  function resetQuery() {
    setGeoFilter({
      shape: "radius",
      center: { lat: 38.9072, lng: -77.0369 },
      radiusMiles: 1,
      conditions: [newCondition("AND")],
    });
    setResultCount(null);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 bg-[#1a2332] flex items-center justify-between">
        <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-[#0088aa]" />
          GEO QUERY BUILDER
        </h3>
        <button onClick={onClose} className="text-white/50 hover:text-white text-xs">
          &times;
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-white">
        {/* Geo Boundary Selection */}
        <div className="px-3 py-2 border-b">
          <label className="text-[10px] font-bold text-gray-600 uppercase block mb-1">
            Geographic Boundary
          </label>
          <div className="flex gap-1 mb-2">
            {(["radius", "polygon", "rectangle", "isochrone"] as GeoShape[]).map(
              (shape) => (
                <button
                  key={shape}
                  onClick={() =>
                    setGeoFilter((prev) => ({ ...prev, shape }))
                  }
                  className={cn(
                    "text-[9px] font-medium px-2 py-1 rounded capitalize",
                    geoFilter.shape === shape
                      ? "bg-[#0088aa] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  {shape}
                </button>
              )
            )}
          </div>

          {/* Shape-specific params */}
          {geoFilter.shape === "radius" && (
            <div className="flex gap-2 items-center">
              <div className="flex-1">
                <label className="text-[9px] text-gray-500 block">Center (lat, lng)</label>
                <input
                  type="text"
                  value={`${geoFilter.center?.lat}, ${geoFilter.center?.lng}`}
                  onChange={(e) => {
                    const [lat, lng] = e.target.value.split(",").map((s) => parseFloat(s.trim()));
                    if (!isNaN(lat) && !isNaN(lng)) {
                      setGeoFilter((prev) => ({ ...prev, center: { lat, lng } }));
                    }
                  }}
                  className="w-full border border-gray-300 rounded px-1.5 py-1 text-[10px]"
                />
              </div>
              <div className="w-20">
                <label className="text-[9px] text-gray-500 block">Radius (mi)</label>
                <input
                  type="number"
                  value={geoFilter.radiusMiles}
                  onChange={(e) =>
                    setGeoFilter((prev) => ({
                      ...prev,
                      radiusMiles: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full border border-gray-300 rounded px-1.5 py-1 text-[10px]"
                  step={0.25}
                  min={0.1}
                />
              </div>
            </div>
          )}

          {geoFilter.shape === "isochrone" && (
            <div className="flex gap-2 items-center flex-wrap">
              <div>
                <label className="text-[9px] text-gray-500 block">Mode</label>
                <select
                  value={geoFilter.isochroneMode || "drive"}
                  onChange={(e) =>
                    setGeoFilter((prev) => ({
                      ...prev,
                      isochroneMode: e.target.value as "drive" | "walk" | "transit",
                    }))
                  }
                  className="border border-gray-300 rounded px-1.5 py-1 text-[10px]"
                >
                  <option value="drive">Drive</option>
                  <option value="walk">Walk</option>
                  <option value="transit">Transit</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] text-gray-500 block">Minutes</label>
                <input
                  type="number"
                  value={geoFilter.isochroneMinutes || 15}
                  onChange={(e) =>
                    setGeoFilter((prev) => ({
                      ...prev,
                      isochroneMinutes: parseInt(e.target.value),
                    }))
                  }
                  className="w-16 border border-gray-300 rounded px-1.5 py-1 text-[10px]"
                  min={1}
                  max={120}
                />
              </div>
            </div>
          )}

          {(geoFilter.shape === "polygon" || geoFilter.shape === "rectangle") && (
            <div className="text-[10px] text-gray-500 italic mt-1">
              Click on the map to draw a {geoFilter.shape}
            </div>
          )}
        </div>

        {/* Conditions */}
        <div className="px-3 py-2 border-b bg-gray-50">
          <label className="text-[10px] font-bold text-gray-600 uppercase">
            Filter Conditions
          </label>
        </div>

        <div className="px-3 py-2 space-y-2">
          {geoFilter.conditions.map((condition, index) => (
            <div key={condition.id} className="space-y-1">
              {/* Logical operator between conditions */}
              {index > 0 && (
                <div className="flex items-center gap-2 py-1">
                  <div className="flex-1 h-px bg-gray-200" />
                  <select
                    value={condition.logicalOp}
                    onChange={(e) =>
                      updateCondition(condition.id, {
                        logicalOp: e.target.value as LogicalOp,
                      })
                    }
                    className="text-[9px] font-bold px-2 py-0.5 rounded border border-[#0088aa] text-[#0088aa] bg-white"
                  >
                    <option value="AND">AND</option>
                    <option value="OR">OR</option>
                    <option value="NOT">NOT</option>
                  </select>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
              )}

              <div className="flex gap-1 items-end">
                {/* Field */}
                <div className="flex-1">
                  {index === 0 && (
                    <label className="text-[8px] text-gray-400 block">Field</label>
                  )}
                  <select
                    value={condition.field}
                    onChange={(e) =>
                      updateCondition(condition.id, { field: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded px-1 py-1 text-[10px]"
                  >
                    {FIELDS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Operator */}
                <div className="w-24">
                  {index === 0 && (
                    <label className="text-[8px] text-gray-400 block">Op</label>
                  )}
                  <select
                    value={condition.operator}
                    onChange={(e) =>
                      updateCondition(condition.id, {
                        operator: e.target.value as CompareOp,
                      })
                    }
                    className="w-full border border-gray-300 rounded px-1 py-1 text-[10px]"
                  >
                    {OPERATORS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Value */}
                <div className="flex-1">
                  {index === 0 && (
                    <label className="text-[8px] text-gray-400 block">Value</label>
                  )}
                  <input
                    type="text"
                    value={condition.value}
                    onChange={(e) =>
                      updateCondition(condition.id, { value: e.target.value })
                    }
                    placeholder="value"
                    className="w-full border border-gray-300 rounded px-1.5 py-1 text-[10px]"
                  />
                </div>

                {/* Delete */}
                <button
                  onClick={() => removeCondition(condition.id)}
                  className="p-1 text-gray-400 hover:text-red-500"
                  disabled={geoFilter.conditions.length === 1}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={addCondition}
            className="flex items-center gap-1 text-[10px] text-[#0088aa] font-medium hover:text-[#006b88] mt-1"
          >
            <Plus className="w-3 h-3" /> Add condition
          </button>
        </div>

        {/* Query Preview */}
        <div className="px-3 py-2 border-t bg-gray-50">
          <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">
            Query Preview
          </label>
          <pre className="text-[9px] text-gray-700 bg-white border border-gray-200 rounded p-2 overflow-x-auto whitespace-pre-wrap font-mono">
            {`SELECT * FROM properties\nWHERE ST_Within(geom, ST_Buffer(\n  ST_Point(${geoFilter.center?.lng}, ${geoFilter.center?.lat}),\n  ${geoFilter.radiusMiles || 1} miles\n))`}
            {geoFilter.conditions
              .filter((c) => c.value)
              .map(
                (c, i) =>
                  `\n${i === 0 ? "AND" : c.logicalOp} ${c.field} ${c.operator} '${c.value}'`
              )
              .join("")}
          </pre>
        </div>

        {/* Results */}
        {resultCount !== null && (
          <div className="px-3 py-2 bg-[#0088aa]/10 border-t border-[#0088aa]/20">
            <span className="text-[10px] font-bold text-[#0088aa]">
              {resultCount} properties found
            </span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-3 py-2 bg-white border-t flex gap-2">
        <button
          onClick={runQuery}
          className="flex-1 flex items-center justify-center gap-1 bg-[#0088aa] text-white text-xs font-bold py-2 rounded hover:bg-[#006b88]"
        >
          <Play className="w-3 h-3" /> Run Query
        </button>
        <button
          onClick={resetQuery}
          className="px-3 flex items-center gap-1 bg-gray-200 text-gray-700 text-xs font-bold py-2 rounded hover:bg-gray-300"
        >
          <RotateCcw className="w-3 h-3" /> Reset
        </button>
      </div>
    </div>
  );
}
