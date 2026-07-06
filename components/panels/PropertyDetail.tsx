"use client";

import { useMemo, useRef, useState } from "react";
import { useCesium } from "@/components/cesium/CesiumContext";
import { MOCK_PROPERTIES } from "@/lib/data/properties";
import { PROPERTY_TYPE_COLORS } from "@/types/cesium";
import type { Property } from "@/types/cesium";
import DemographicsReport from "./DemographicsReport";
import FinancingTab from "./FinancingTab";
import { X, Star, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "market", label: "Market" },
  { id: "financing", label: "Financing" },
] as const;
type TabId = (typeof TABS)[number]["id"];

function streetViewSrc(p: Property) {
  return `https://maps.google.com/maps?q=&layer=c&cbll=${p.lat},${p.lng}&cbp=11,0,0,0,0&ll=${p.lat},${p.lng}&z=18&output=svembed`;
}

function fmt(n?: number) {
  return typeof n === "number" ? n.toLocaleString() : "—";
}

export default function PropertyDetail() {
  const {
    selectedProperty,
    leftPanelOpen,
    setLeftPanelOpen,
    setSelectedProperty,
    flyToProperty,
  } = useCesium();
  const [tab, setTab] = useState<TabId>("overview");
  const [starred, setStarred] = useState(false);

  // Mobile bottom-sheet state: half (default) → full, draggable via the handle.
  const [expanded, setExpanded] = useState(false);
  const [dragY, setDragY] = useState(0);
  const drag = useRef({ startY: 0, active: false });

  // Nearest other properties for the carousel (Google "nearby" analog).
  const nearby = useMemo(() => {
    if (!selectedProperty) return [];
    return MOCK_PROPERTIES.filter((p) => p.id !== selectedProperty.id)
      .map((p) => ({
        p,
        d: (p.lat - selectedProperty.lat) ** 2 + (p.lng - selectedProperty.lng) ** 2,
      }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 8)
      .map((x) => x.p);
  }, [selectedProperty]);

  if (!leftPanelOpen || !selectedProperty) return null;
  const p = selectedProperty;

  const onHandleDown = (e: React.PointerEvent) => {
    drag.current = { startY: e.clientY, active: true };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onHandleMove = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    setDragY(Math.max(e.clientY - drag.current.startY, -120));
  };
  const onHandleUp = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    const dy = e.clientY - drag.current.startY;
    drag.current.active = false;
    setDragY(0);
    if (dy < -55) setExpanded(true);
    else if (dy > 55) {
      if (expanded) setExpanded(false);
      else setLeftPanelOpen(false);
    } else setExpanded((v) => !v); // treat a tap as toggle
  };

  const openProperty = (np: Property) => {
    setSelectedProperty(np);
    setLeftPanelOpen(true);
    flyToProperty(np);
    setTab("overview");
  };

  const details: [string, string][] = [
    ["Type", p.propertyUse || p.propertyType],
    ["Building size", `${fmt(p.buildingSize ?? p.squareFeet)} SF`],
    ["Units", p.units ? fmt(p.units) : "—"],
    ["Stories", p.stories ? fmt(p.stories) : "—"],
    ["Year built", p.yearBuilt ? String(p.yearBuilt) : "—"],
    ["Land area", `${p.landArea.acres.toFixed(2)} ac · ${fmt(p.landArea.sqft)} SF`],
    ["Zoning", p.zoningDistrict || "—"],
    ["Neighborhood", p.neighborhood || "—"],
    ["Jurisdiction", p.jurisdiction || "—"],
    ["Owner", p.owner?.name || "—"],
  ];

  return (
    <div
      style={dragY ? { transform: `translateY(${dragY}px)` } : undefined}
      className={cn(
        "absolute z-30 bg-white text-gray-900 shadow-2xl flex flex-col overflow-hidden",
        // Mobile: drag-up bottom sheet (half → full)
        "left-0 right-0 bottom-0 rounded-t-2xl transition-[height,transform] duration-300",
        expanded ? "h-[88dvh]" : "h-[46dvh]",
        // Desktop: floating left card (Google Maps style)
        "md:left-3 md:right-auto md:top-16 md:bottom-4 md:h-auto md:w-[370px] md:max-w-[85vw] md:rounded-2xl"
      )}
    >
      {/* Drag handle (mobile only) */}
      <div
        onPointerDown={onHandleDown}
        onPointerMove={onHandleMove}
        onPointerUp={onHandleUp}
        className="md:hidden shrink-0 pt-2 pb-1 flex justify-center cursor-grab active:cursor-grabbing touch-none"
      >
        <div className="w-10 h-1.5 rounded-full bg-gray-300" />
      </div>

      {/* Header */}
      <div className="shrink-0 px-4 pt-2 md:pt-4 pb-3 flex items-start gap-2 border-b border-gray-100">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold leading-tight truncate">{p.address}</h2>
          <p className="text-sm text-gray-500 truncate">
            {p.neighborhood ? `${p.neighborhood} · ` : ""}
            {p.jurisdiction || p.propertyType}
          </p>
        </div>
        <button
          onClick={() => setStarred((v) => !v)}
          className={cn("p-1.5 rounded-full hover:bg-gray-100", starred ? "text-[#ca615f]" : "text-gray-400")}
          title="Save"
        >
          <Star className="w-5 h-5" fill={starred ? "currentColor" : "none"} />
        </button>
        <button
          onClick={() => setLeftPanelOpen(false)}
          className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scroll body — scrolling the content up grows the half sheet to full
          (mobile only; on desktop md:h-auto makes the expand a no-op). */}
      <div
        className="flex-1 overflow-y-auto overscroll-contain"
        onScroll={(e) => {
          if (!expanded && e.currentTarget.scrollTop > 4) setExpanded(true);
        }}
      >
        {/* Nearby carousel */}
        {nearby.length > 0 && (
          <div className="px-4 pt-3">
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Nearby properties
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {nearby.map((n) => (
                <button
                  key={n.id}
                  onClick={() => openProperty(n)}
                  className="shrink-0 w-40 text-left rounded-xl border border-gray-200 hover:border-[#ca615f] hover:shadow-md transition bg-white overflow-hidden"
                >
                  <div
                    className="h-16 flex items-center justify-center"
                    style={{ backgroundColor: (PROPERTY_TYPE_COLORS[n.propertyType] || "#8899aa") + "22" }}
                  >
                    <Building2 className="w-6 h-6" style={{ color: PROPERTY_TYPE_COLORS[n.propertyType] || "#8899aa" }} />
                  </div>
                  <div className="p-2">
                    <div className="text-xs font-semibold truncate">{n.address}</div>
                    <div className="text-[10px] text-gray-500 truncate">
                      {n.propertyType} · {fmt(n.squareFeet)} SF
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Street View photo */}
        <div className="px-4 pt-3">
          <div className="h-44 rounded-xl overflow-hidden bg-gray-200">
            <iframe
              src={streetViewSrc(p)}
              title="Street View"
              className="w-full h-full border-0"
              loading="lazy"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="sticky top-0 bg-white z-10 mt-3 px-4 flex gap-5 border-b border-gray-200">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                tab === t.id
                  ? "border-[#ca615f] text-[#ca615f]"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "overview" && (
          <div className="px-4 py-2">
            <div className="flex items-center gap-2 py-2">
              <span
                className="w-3 h-3 rounded-sm shrink-0"
                style={{ backgroundColor: PROPERTY_TYPE_COLORS[p.propertyType] || "#8899aa" }}
              />
              <span className="text-sm font-semibold">{p.propertyType}</span>
              <span className="ml-auto text-sm text-gray-600">{fmt(p.squareFeet)} SF</span>
            </div>
            <dl className="divide-y divide-gray-100">
              {details.map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-3 py-2">
                  <dt className="text-xs text-gray-500">{k}</dt>
                  <dd className="text-xs font-medium text-right text-gray-900 max-w-[60%] truncate">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
        {tab === "market" && (
          <div className="[&_*]:!text-inherit">
            <DemographicsReport property={p} />
          </div>
        )}
        {tab === "financing" && <FinancingTab property={p} />}
      </div>
    </div>
  );
}
