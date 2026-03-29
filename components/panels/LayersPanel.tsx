"use client";

import { useState } from "react";
import {
  PROPERTY_TYPE_COLORS,
  LAND_USE_COLORS,
  PROPERTY_TYPE_TO_LAND_USE,
  PropertyType,
  LandUseCategory,
} from "@/types/cesium";
import { GIS_SERVICES, LAYER_CATEGORIES, GISLayer } from "@/lib/data/gis-layers";
import {
  CENSUS_LAYERS,
  CENSUS_CATEGORY_COLORS,
  PARCEL_DATA_SOURCES,
  type CensusLayer,
} from "@/lib/data/census-layers";
import { ZONING_LAYERS, type ZoningLayer } from "@/lib/data/zoning-layers";
import {
  X,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  Map as MapIcon,
  BookOpen,
  Scale,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCesium } from "@/components/cesium/CesiumContext";

const ALL_PROPERTY_TYPES = Object.entries(PROPERTY_TYPE_COLORS) as [
  PropertyType,
  string,
][];

const STATES = [
  { id: "NY", label: "New York" },
  { id: "CT", label: "Connecticut" },
  { id: "MA", label: "Massachusetts" },
  { id: "US", label: "Federal / National" },
];

export default function LayersPanel({ onClose }: { onClose: () => void }) {
  const { activeLayers, setActiveLayers } = useCesium();
  const [expandedStates, setExpandedStates] = useState<Set<string>>(
    new Set(["NY"])
  );
  const [expandedServices, setExpandedServices] = useState<Set<string>>(
    new Set()
  );

  function toggleLayer(id: string) {
    setActiveLayers((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleState(stateId: string) {
    setExpandedStates((prev) => {
      const next = new Set(prev);
      if (next.has(stateId)) next.delete(stateId);
      else next.add(stateId);
      return next;
    });
  }

  function toggleService(serviceId: string) {
    setExpandedServices((prev) => {
      const next = new Set(prev);
      if (next.has(serviceId)) next.delete(serviceId);
      else next.add(serviceId);
      return next;
    });
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 bg-[#f0f0f0] border-b flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-800">LEGENDS & LAYERS</h3>
        <button onClick={onClose} className="p-0.5 hover:bg-gray-300 rounded">
          <X className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      <div className="overflow-y-auto flex-1 bg-white">
        {/* Land Use Color System */}
        <div className="px-3 py-2 border-b">
          <div className="text-[10px] font-bold text-gray-600 mb-2 uppercase">
            Land Use Categories
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {(Object.entries(LAND_USE_COLORS) as [LandUseCategory, string][]).map(
              ([category, color]) => (
                <div key={category} className="flex items-center gap-1.5">
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-[10px] font-medium text-gray-700">
                    {category}
                  </span>
                </div>
              )
            )}
          </div>
        </div>

        {/* Property Types by Category */}
        <div className="px-3 py-2 border-b">
          <div className="text-[10px] font-bold text-gray-600 mb-2 uppercase">
            Property Types
          </div>
          {(
            Object.entries(LAND_USE_COLORS) as [LandUseCategory, string][]
          ).map(([category, catColor]) => {
            const types = ALL_PROPERTY_TYPES.filter(
              ([type]) => PROPERTY_TYPE_TO_LAND_USE[type] === category
            );
            if (types.length === 0) return null;
            return (
              <div key={category} className="mb-1.5">
                <div className="flex flex-wrap gap-1">
                  {types.map(([type]) => (
                    <span
                      key={type}
                      className="text-[9px] font-medium px-1.5 py-0.5 rounded border text-gray-700"
                      style={{ borderColor: catColor, color: catColor }}
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Active layers summary */}
        {activeLayers.size > 0 && (
          <div className="px-3 py-2 bg-blue-50 border-b flex flex-wrap gap-1">
            <span className="text-[9px] text-blue-600 font-bold w-full mb-0.5">
              Active Layers ({activeLayers.size}):
            </span>
            {[...activeLayers].map((id) => {
              const layer = GIS_SERVICES.flatMap((s) => s.layers).find(
                (l) => l.id === id
              );
              if (!layer) return null;
              const cat =
                LAYER_CATEGORIES[layer.category as keyof typeof LAYER_CATEGORIES];
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-0.5 text-[8px] text-white font-bold px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: cat?.color || "#666" }}
                >
                  {layer.name.replace(/^(NYS|NYC|CT|MA|Sullivan Co\.|Westchester Co\.|Dutchess Co\.|Orange Co\.|FEMA|USGS|USDA)\s*/, "").substring(0, 20)}
                  <button onClick={() => toggleLayer(id)}>
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        {/* GIS Layer Library */}
        <div className="px-3 py-1.5 bg-[#1a2332]">
          <span className="text-[10px] font-bold text-white uppercase">
            GIS Layer Library
          </span>
        </div>

        {/* ─── CENSUS DATA LAYERS ─── */}
        <div className="px-3 py-1.5 bg-[#1a2332]">
          <span className="text-[10px] font-bold text-white uppercase">
            Census Data
          </span>
        </div>
        {(["boundaries", "demographics", "economic", "housing"] as const).map(
          (cat) => {
            const layers = CENSUS_LAYERS.filter((l) => l.category === cat);
            if (layers.length === 0) return null;
            const isExpanded = expandedServices.has(`census-${cat}`);
            return (
              <div key={cat}>
                <button
                  onClick={() => toggleService(`census-${cat}`)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 border-b hover:bg-gray-50 text-left"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3 h-3 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-gray-400" />
                  )}
                  <span
                    className="text-[8px] font-bold text-white px-1 py-0.5 rounded"
                    style={{
                      backgroundColor: CENSUS_CATEGORY_COLORS[cat],
                    }}
                  >
                    {cat.substring(0, 4).toUpperCase()}
                  </span>
                  <span className="text-[10px] font-semibold text-gray-600 capitalize">
                    {cat}
                  </span>
                  <span className="text-[9px] text-gray-400 ml-auto">
                    {layers.length}
                  </span>
                </button>
                {isExpanded &&
                  layers.map((layer) => (
                    <CensusLayerRow
                      key={layer.id}
                      layer={layer}
                      active={activeLayers.has(layer.id)}
                      onToggle={() => toggleLayer(layer.id)}
                    />
                  ))}
              </div>
            );
          }
        )}

        {/* ─── PARCEL DATA LAYERS ─── */}
        <div className="px-3 py-1.5 bg-[#1a2332]">
          <span className="text-[10px] font-bold text-white uppercase">
            Parcel Data
          </span>
        </div>
        {STATES.map((state) => {
          const parcels = PARCEL_DATA_SOURCES.filter(
            (p) => p.state === state.id
          );
          if (parcels.length === 0) return null;
          const isExpanded = expandedStates.has(`parcels-${state.id}`);
          return (
            <div key={`parcels-${state.id}`}>
              <button
                onClick={() => toggleState(`parcels-${state.id}`)}
                className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 border-b hover:bg-gray-100 text-left"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3 text-gray-500" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-gray-500" />
                )}
                <span className="text-[11px] font-bold text-gray-700">
                  {state.label}
                </span>
                <span className="text-[9px] text-gray-400 ml-auto">
                  {parcels.length}
                </span>
              </button>
              {isExpanded &&
                parcels.map((parcel) => (
                  <button
                    key={parcel.id}
                    onClick={() => toggleLayer(parcel.id)}
                    className={cn(
                      "w-full flex items-center gap-2 pl-8 pr-3 py-1.5 text-left border-b border-gray-100 transition-colors",
                      activeLayers.has(parcel.id) ? "bg-blue-50" : "hover:bg-gray-50"
                    )}
                  >
                    <div
                      className={cn(
                        "w-3 h-3 rounded-sm border-2 flex items-center justify-center",
                        activeLayers.has(parcel.id)
                          ? "border-[#e67e22] bg-[#e67e22]"
                          : "border-gray-300"
                      )}
                    >
                      {activeLayers.has(parcel.id) && (
                        <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-gray-700 truncate">
                        {parcel.name}
                      </div>
                      <div className="text-[8px] text-gray-400 truncate">
                        {parcel.description}
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          );
        })}

        {/* ─── ZONING LAYERS ─── */}
        <div className="px-3 py-1.5 bg-[#1a2332]">
          <span className="text-[10px] font-bold text-white uppercase">
            Zoning Districts
          </span>
        </div>
        {[...STATES, { id: "DC", label: "Washington DC" }].map((state) => {
          const zoningLayers = ZONING_LAYERS.filter(
            (z) => z.state === state.id
          );
          if (zoningLayers.length === 0) return null;
          const isExpanded = expandedStates.has(`zoning-${state.id}`);
          return (
            <div key={`zoning-${state.id}`}>
              <button
                onClick={() => toggleState(`zoning-${state.id}`)}
                className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 border-b hover:bg-gray-100 text-left"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3 text-gray-500" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-gray-500" />
                )}
                <span className="text-[11px] font-bold text-gray-700">
                  {state.label}
                </span>
                <span className="text-[9px] text-gray-400 ml-auto">
                  {zoningLayers.length} zones
                </span>
              </button>
              {isExpanded &&
                zoningLayers.map((zLayer) => (
                  <ZoningLayerRow
                    key={zLayer.id}
                    layer={zLayer}
                    active={activeLayers.has(zLayer.id)}
                    onToggle={() => toggleLayer(zLayer.id)}
                  />
                ))}
            </div>
          );
        })}

        {/* ─── ENVIRONMENTAL / GIS LAYERS ─── */}
        <div className="px-3 py-1.5 bg-[#1a2332]">
          <span className="text-[10px] font-bold text-white uppercase">
            Environmental & GIS
          </span>
        </div>
        {STATES.map((state) => {
          const stateServices = GIS_SERVICES.filter(
            (s) => s.state === state.id
          );
          if (stateServices.length === 0) return null;
          const isExpanded = expandedStates.has(state.id);

          return (
            <div key={state.id}>
              <button
                onClick={() => toggleState(state.id)}
                className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 border-b hover:bg-gray-100 text-left"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3 text-gray-500" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-gray-500" />
                )}
                <span className="text-[11px] font-bold text-gray-700">
                  {state.label}
                </span>
                <span className="text-[9px] text-gray-400 ml-auto">
                  {stateServices.flatMap((s) => s.layers).length} layers
                </span>
              </button>

              {isExpanded &&
                stateServices.map((service) => {
                  const isServiceExpanded = expandedServices.has(service.id);
                  return (
                    <div key={service.id}>
                      <button
                        onClick={() => toggleService(service.id)}
                        className="w-full flex items-center gap-2 px-5 py-1.5 border-b hover:bg-gray-50 text-left"
                      >
                        {isServiceExpanded ? (
                          <ChevronDown className="w-3 h-3 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-3 h-3 text-gray-400" />
                        )}
                        <span className="text-[10px] font-semibold text-gray-600">
                          {service.name}
                          {service.county && (
                            <span className="text-gray-400 font-normal">
                              {" "}
                              ({service.county})
                            </span>
                          )}
                        </span>
                      </button>

                      {isServiceExpanded &&
                        service.layers.map((layer) => (
                          <LayerRow
                            key={layer.id}
                            layer={layer}
                            active={activeLayers.has(layer.id)}
                            onToggle={() => toggleLayer(layer.id)}
                          />
                        ))}
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CensusLayerRow({
  layer,
  active,
  onToggle,
}: {
  layer: CensusLayer;
  active: boolean;
  onToggle: () => void;
}) {
  const catColor = CENSUS_CATEGORY_COLORS[layer.category];

  return (
    <button
      onClick={onToggle}
      className={cn(
        "w-full flex items-center gap-2 pl-8 pr-3 py-1.5 text-left border-b border-gray-100 transition-colors",
        active ? "bg-blue-50" : "hover:bg-gray-50"
      )}
    >
      <div
        className={cn(
          "w-3 h-3 rounded-sm border-2 flex items-center justify-center",
          active ? "bg-[#3498db] border-[#3498db]" : "border-gray-300"
        )}
        style={active ? { backgroundColor: catColor, borderColor: catColor } : {}}
      >
        {active && (
          <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-gray-700 truncate">{layer.name}</div>
        <div className="text-[8px] text-gray-400 truncate">
          {layer.description}
        </div>
      </div>
    </button>
  );
}

function ZoningLayerRow({
  layer,
  active,
  onToggle,
}: {
  layer: ZoningLayer;
  active: boolean;
  onToggle: () => void;
}) {
  const hasLinks =
    layer.eCodeUrl || layer.compPlanUrl || layer.zoningMapUrl || layer.zoningCodeUrl;

  return (
    <div className="border-b border-gray-100">
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center gap-2 pl-8 pr-3 py-1.5 text-left transition-colors",
          active ? "bg-blue-50" : "hover:bg-gray-50"
        )}
      >
        <div
          className={cn(
            "w-3 h-3 rounded-sm border-2 flex items-center justify-center",
            active
              ? "border-[#9b59b6] bg-[#9b59b6]"
              : "border-gray-300"
          )}
        >
          {active && (
            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-gray-700 truncate">
            {layer.name}
            {layer.municipality && (
              <span className="text-gray-400 font-normal">
                {" "}
                — {layer.municipality}
              </span>
            )}
          </div>
          <div className="text-[8px] text-gray-400 truncate">
            {layer.description}
          </div>
        </div>
      </button>

      {hasLinks && (
        <div className="flex items-center gap-1 pl-12 pr-3 pb-1.5">
          {layer.eCodeUrl && (
            <a
              href={layer.eCodeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-[8px] text-blue-600 hover:text-blue-800 hover:underline"
              title="eCode / Municipal Code"
              onClick={(e) => e.stopPropagation()}
            >
              <Scale className="w-2.5 h-2.5" />
              eCode
            </a>
          )}
          {layer.compPlanUrl && (
            <a
              href={layer.compPlanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-[8px] text-blue-600 hover:text-blue-800 hover:underline"
              title="Comprehensive Plan"
              onClick={(e) => e.stopPropagation()}
            >
              <BookOpen className="w-2.5 h-2.5" />
              Comp Plan
            </a>
          )}
          {layer.zoningMapUrl && (
            <a
              href={layer.zoningMapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-[8px] text-blue-600 hover:text-blue-800 hover:underline"
              title="Zoning Map"
              onClick={(e) => e.stopPropagation()}
            >
              <MapIcon className="w-2.5 h-2.5" />
              Map
            </a>
          )}
          {layer.zoningCodeUrl && (
            <a
              href={layer.zoningCodeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-[8px] text-blue-600 hover:text-blue-800 hover:underline"
              title="Zoning Code / Regulations"
              onClick={(e) => e.stopPropagation()}
            >
              <FileText className="w-2.5 h-2.5" />
              Code
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function LayerRow({
  layer,
  active,
  onToggle,
}: {
  layer: GISLayer;
  active: boolean;
  onToggle: () => void;
}) {
  const cat =
    LAYER_CATEGORIES[layer.category as keyof typeof LAYER_CATEGORIES];

  return (
    <button
      onClick={onToggle}
      className={cn(
        "w-full flex items-center gap-2 pl-10 pr-3 py-1.5 text-left border-b border-gray-100 transition-colors",
        active ? "bg-blue-50" : "hover:bg-gray-50"
      )}
    >
      <div
        className={cn(
          "w-3 h-3 rounded-sm border-2 flex items-center justify-center",
          active ? "border-[#0088aa] bg-[#0088aa]" : "border-gray-300"
        )}
      >
        {active && (
          <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
          </svg>
        )}
      </div>
      <span
        className="text-[8px] font-bold text-white px-1 py-0.5 rounded"
        style={{ backgroundColor: cat?.color || "#666" }}
      >
        {cat?.label?.substring(0, 4).toUpperCase() || "?"}
      </span>
      <span className="text-[10px] text-gray-700 truncate">{layer.name}</span>
    </button>
  );
}
