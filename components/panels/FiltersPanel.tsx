"use client";

import { useState, useCallback } from "react";
import {
  ShoppingCart,
  KeyRound,
  Landmark,
  Square,
  Building2,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from "lucide-react";
import {
  LAND_USE_COLORS,
  ZONING_DISTRICTS,
  type LandUseCategory,
  type PropertyType,
} from "@/types/cesium";
import { cn } from "@/lib/utils";
import { useCesium } from "@/components/cesium/CesiumContext";

// Use Type tabs with icons matching the design
const USE_TYPE_TABS: {
  id: LandUseCategory;
  label: string;
  icon: React.ReactNode;
}[] = [
  { id: "Commercial", label: "Commercial", icon: <ShoppingCart className="w-4 h-4" /> },
  { id: "Residential", label: "Residential", icon: <KeyRound className="w-4 h-4" /> },
  { id: "Institutional", label: "Institutional", icon: <Landmark className="w-4 h-4" /> },
  { id: "Vacant", label: "Vacant", icon: <Square className="w-4 h-4" /> },
];

// Property subtypes grouped by land use tab
const COMMERCIAL_TYPES: PropertyType[] = [
  "Office",
  "Lodging",
  "Parking",
  "Mixed Use",
  "Industrial",
  "Special Purpose",
  "Retail",
];
const RESIDENTIAL_TYPES: PropertyType[] = [
  "Apartment",
  "Condo/Co-op",
  "Flats",
  "Single Family",
];
const INSTITUTIONAL_TYPES: PropertyType[] = [
  "Government",
  "Health/Education",
  "Cultural/Religious",
  "Recreation/Misc",
];
const VACANT_TYPES: PropertyType[] = ["Vacant", "Empty Parcel"];

const SUBTYPES_BY_TAB: Record<LandUseCategory, PropertyType[]> = {
  Commercial: COMMERCIAL_TYPES,
  Residential: RESIDENTIAL_TYPES,
  Institutional: INSTITUTIONAL_TYPES,
  Vacant: VACANT_TYPES,
  "Mixed Use": ["Mixed Use"],
  Industrial: ["Industrial"],
  "Special Purpose": ["Special Purpose", "Parking"],
};

// Zoning districts grouped
const COMMERCIAL_ZONES = [
  "C-1",
  "C-2-A",
  "C-2-B",
  "C-2-C",
  "C-3-A",
  "C-3-B",
  "C-3-C",
  "C-4",
  "C-5",
];
const RESIDENTIAL_ZONES = [
  "R-1-A",
  "R-1-B",
  "R-3",
  "R-4",
  "R-5-A",
  "R-5-B",
  "R-5-C",
  "R-5-D",
  "R-5-E",
];
const OTHER_ZONES = [
  "CR",
  "HE-1",
  "HE-2",
  "HE-3",
  "HE-4",
  "CM-1",
  "M",
  "SP-1",
  "SP-2",
  "W-0",
  "W-1",
  "W-2",
  "W-3",
  "Un-zoned",
];
const MOST_COMMON_ZONES = ["C-1", "C-2-A", "C-2-B", "C-2-C", "C-3-A", "C-3-B"];

interface FilterState {
  parcelSizeMin: number;
  parcelSizeMax: number;
  activeUseTab: LandUseCategory;
  selectedPropertyTypes: Set<PropertyType>;
  sizeMin: number;
  sizeMax: number;
  availability: string;
  selectedZones: Set<string>;
  yearMin: number;
  yearMax: number;
  showAllZones: boolean;
  showOptions: boolean;
}

export default function FiltersPanel({ onClose }: { onClose: () => void }) {
  const { setFilterState: applyFilterToMap } = useCesium();
  const [filters, setFilters] = useState<FilterState>({
    parcelSizeMin: 50,
    parcelSizeMax: 50000,
    activeUseTab: "Commercial",
    selectedPropertyTypes: new Set(["Office", "Retail"]),
    sizeMin: 50,
    sizeMax: 50000,
    availability: "flexible",
    selectedZones: new Set(["C-1"]),
    yearMin: 1800,
    yearMax: 2015,
    showAllZones: false,
    showOptions: true,
  });

  const togglePropertyType = useCallback((type: PropertyType) => {
    setFilters((prev) => {
      const next = new Set(prev.selectedPropertyTypes);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return { ...prev, selectedPropertyTypes: next };
    });
  }, []);

  const toggleZone = useCallback((zone: string) => {
    setFilters((prev) => {
      const next = new Set(prev.selectedZones);
      if (next.has(zone)) next.delete(zone);
      else next.add(zone);
      return { ...prev, selectedZones: next };
    });
  }, []);

  const currentSubtypes = SUBTYPES_BY_TAB[filters.activeUseTab] || [];
  const activeColor = LAND_USE_COLORS[filters.activeUseTab];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-white border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-[#2A364A]" />
          <span className="text-sm font-bold text-[#2A364A] tracking-wide">
            FILTER PROPERTIES
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setFilters((prev) => ({
                ...prev,
                selectedPropertyTypes: new Set(),
                selectedZones: new Set(),
              }));
              applyFilterToMap(null);
            }}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Clear Filters
          </button>
          <button
            onClick={() => {
              applyFilterToMap({
                propertyTypes: filters.selectedPropertyTypes.size > 0
                  ? [...filters.selectedPropertyTypes]
                  : undefined,
                parcelSizeMin: filters.parcelSizeMin > 50 ? filters.parcelSizeMin : undefined,
                parcelSizeMax: filters.parcelSizeMax < 50000 ? filters.parcelSizeMax : undefined,
                yearBuiltMin: filters.yearMin > 1800 ? filters.yearMin : undefined,
                yearBuiltMax: filters.yearMax < 2025 ? filters.yearMax : undefined,
                buildingSizeMin: filters.sizeMin > 50 ? filters.sizeMin : undefined,
                buildingSizeMax: filters.sizeMax < 50000 ? filters.sizeMax : undefined,
                zoningDistrict: filters.selectedZones.size === 1
                  ? [...filters.selectedZones][0]
                  : undefined,
              });
            }}
            className="bg-[#2A364A] text-white text-xs font-bold px-4 py-1.5 rounded hover:bg-[#1a2332]"
          >
            Apply Filters
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-white">
        {/* PARCEL Section */}
        <div className="px-4 py-3 border-b">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-[#2A364A] rounded flex items-center justify-center">
              <Square className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-[#2A364A]">PARCEL</span>
          </div>
          <RangeSlider
            label="SIZE"
            min={50}
            max={50000}
            valueMin={filters.parcelSizeMin}
            valueMax={filters.parcelSizeMax}
            formatValue={(v) => (v >= 50000 ? "50K+ Sf." : `${v.toLocaleString()} Sf.`)}
            onChange={(min, max) =>
              setFilters((prev) => ({
                ...prev,
                parcelSizeMin: min,
                parcelSizeMax: max,
              }))
            }
          />
        </div>

        {/* USE TYPE Section */}
        <div className="px-4 py-3 border-b">
          <h3 className="text-xs font-bold text-[#F05959] mb-3 tracking-wide">
            USE TYPE
          </h3>

          {/* Tab strip */}
          <div className="flex border-b">
            {USE_TYPE_TABS.map((tab) => {
              const isActive = filters.activeUseTab === tab.id;
              const tabColor = LAND_USE_COLORS[tab.id];
              return (
                <button
                  key={tab.id}
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, activeUseTab: tab.id }))
                  }
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 pb-2 text-[11px] font-medium transition-colors border-b-2",
                    isActive
                      ? "border-current"
                      : "border-transparent text-gray-400 hover:text-gray-600"
                  )}
                  style={isActive ? { color: tabColor } : undefined}
                >
                  <span style={isActive ? { color: tabColor } : undefined}>
                    {tab.icon}
                  </span>
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Subtype checkboxes */}
          <div className="grid grid-cols-3 gap-x-3 gap-y-2 mt-3">
            {currentSubtypes.map((type) => {
              const checked = filters.selectedPropertyTypes.has(type);
              return (
                <label
                  key={type}
                  className="flex items-center gap-1.5 cursor-pointer"
                >
                  <div
                    className={cn(
                      "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                      checked ? "border-transparent" : "border-gray-300"
                    )}
                    style={checked ? { backgroundColor: activeColor } : undefined}
                  >
                    {checked && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs text-gray-700">{type}</span>
                </label>
              );
            })}
          </div>

          {/* Options expandable */}
          <button
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                showOptions: !prev.showOptions,
              }))
            }
            className="flex items-center gap-1 mt-3 text-xs text-gray-500 hover:text-gray-700"
          >
            Options
            {filters.showOptions ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>

          {filters.showOptions && (
            <div className="mt-2 space-y-3 pl-1">
              <RangeSlider
                label="Size"
                min={50}
                max={50000}
                valueMin={filters.sizeMin}
                valueMax={filters.sizeMax}
                formatValue={(v) =>
                  v >= 50000 ? "50K+ Sf." : `${v.toLocaleString()} Sf.`
                }
                onChange={(min, max) =>
                  setFilters((prev) => ({
                    ...prev,
                    sizeMin: min,
                    sizeMax: max,
                  }))
                }
              />
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-600 w-20">Availability</span>
                <select
                  value={filters.availability}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      availability: e.target.value,
                    }))
                  }
                  className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs text-gray-600"
                >
                  <option value="flexible">I&apos;m Flexible</option>
                  <option value="available">Available Now</option>
                  <option value="soon">Available Soon</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ZONING DISTRICTS Section */}
        <div className="px-4 py-3 border-b">
          <h3 className="text-xs font-bold text-[#2A364A] mb-2 tracking-wide">
            ZONING DISTRICTS
          </h3>
          <p className="text-[10px] text-gray-500 mb-2">Most Common</p>

          {/* Most common zone badges */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {MOST_COMMON_ZONES.map((zone) => {
              const zoneData = ZONING_DISTRICTS[zone];
              const isSelected = filters.selectedZones.has(zone);
              return (
                <button
                  key={zone}
                  onClick={() => toggleZone(zone)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
                    isSelected
                      ? "text-white border-transparent"
                      : "text-gray-600 border-gray-200 bg-white hover:bg-gray-50"
                  )}
                  style={
                    isSelected
                      ? { backgroundColor: zoneData?.color || "#666" }
                      : undefined
                  }
                >
                  {zone}
                </button>
              );
            })}
          </div>

          {/* Expand all zones */}
          <button
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                showAllZones: !prev.showAllZones,
              }))
            }
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
          >
            Expand All
            {filters.showAllZones ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>

          {filters.showAllZones && (
            <div className="mt-2 space-y-2">
              <ZoneGroup
                label="Commercial"
                zones={COMMERCIAL_ZONES}
                selectedZones={filters.selectedZones}
                onToggle={toggleZone}
              />
              <ZoneGroup
                label="Residential"
                zones={RESIDENTIAL_ZONES}
                selectedZones={filters.selectedZones}
                onToggle={toggleZone}
              />
              <ZoneGroup
                label="Other"
                zones={OTHER_ZONES}
                selectedZones={filters.selectedZones}
                onToggle={toggleZone}
              />
            </div>
          )}
        </div>

        {/* BUILDING Section */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-[#2A364A] rounded flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-[#2A364A]">BUILDING</span>
          </div>
          <RangeSlider
            label="YEAR"
            min={1800}
            max={2025}
            valueMin={filters.yearMin}
            valueMax={filters.yearMax}
            formatValue={(v) => String(v)}
            onChange={(min, max) =>
              setFilters((prev) => ({ ...prev, yearMin: min, yearMax: max }))
            }
          />
        </div>
      </div>
    </div>
  );
}

// Range slider component matching the design
function RangeSlider({
  label,
  min,
  max,
  valueMin,
  valueMax,
  formatValue,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
  formatValue: (v: number) => string;
  onChange: (min: number, max: number) => void;
}) {
  const pctMin = ((valueMin - min) / (max - min)) * 100;
  const pctMax = ((valueMax - min) / (max - min)) * 100;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold text-gray-700">{label}</span>
        <span className="text-[10px] text-gray-400">
          {formatValue(valueMin)}
        </span>
      </div>
      <div className="relative h-6 flex items-center">
        {/* Track */}
        <div className="absolute w-full h-0.5 bg-gray-200 rounded" />
        {/* Active range */}
        <div
          className="absolute h-0.5 bg-gray-400 rounded"
          style={{ left: `${pctMin}%`, width: `${pctMax - pctMin}%` }}
        />
        {/* Min thumb */}
        <input
          type="range"
          min={min}
          max={max}
          value={valueMin}
          onChange={(e) => {
            const v = parseInt(e.target.value);
            if (v < valueMax) onChange(v, valueMax);
          }}
          className="absolute w-full appearance-none bg-transparent pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-gray-400 [&::-webkit-slider-thumb]:cursor-pointer"
        />
        {/* Max thumb */}
        <input
          type="range"
          min={min}
          max={max}
          value={valueMax}
          onChange={(e) => {
            const v = parseInt(e.target.value);
            if (v > valueMin) onChange(valueMin, v);
          }}
          className="absolute w-full appearance-none bg-transparent pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-gray-400 [&::-webkit-slider-thumb]:cursor-pointer"
        />
      </div>
      <div className="flex justify-end">
        <span className="text-[10px] text-gray-400">
          {formatValue(valueMax)}
        </span>
      </div>
    </div>
  );
}

// Zoning district group
function ZoneGroup({
  label,
  zones,
  selectedZones,
  onToggle,
}: {
  label: string;
  zones: string[];
  selectedZones: Set<string>;
  onToggle: (zone: string) => void;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold text-gray-500 mb-1">{label}</p>
      <div className="flex flex-wrap gap-1">
        {zones.map((zone) => {
          const zoneData = ZONING_DISTRICTS[zone];
          const isSelected = selectedZones.has(zone);
          return (
            <button
              key={zone}
              onClick={() => onToggle(zone)}
              className={cn(
                "px-2 py-0.5 rounded text-[10px] font-medium transition-colors border",
                isSelected
                  ? "text-white border-transparent"
                  : "text-gray-600 border-gray-200 bg-white hover:bg-gray-50"
              )}
              style={
                isSelected
                  ? { backgroundColor: zoneData?.color || "#666" }
                  : undefined
              }
            >
              {zone}
            </button>
          );
        })}
      </div>
    </div>
  );
}
