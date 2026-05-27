"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ParcelInfoPopupProps {
  parcelData: Record<string, any> | null;
  onClose: () => void;
  position?: { x: number; y: number };
}

/** Well-known parcel attribute keys mapped to display labels. */
const KNOWN_FIELDS: Record<string, string> = {
  owner: "Owner",
  owner_name: "Owner",
  ownername: "Owner",
  owner1: "Owner",
  address: "Address",
  siteaddr: "Address",
  site_addr: "Address",
  siteaddress: "Address",
  site_address: "Address",
  mailingaddr: "Mailing Addr",
  assessed_value: "Assessed Value",
  assessedvalue: "Assessed Value",
  totalvalue: "Total Value",
  total_value: "Total Value",
  totalassessed: "Total Assessed",
  landvalue: "Land Value",
  land_value: "Land Value",
  improvvalue: "Improvement Value",
  improv_value: "Improvement Value",
  improvementvalue: "Improvement Value",
  improvement_value: "Improvement Value",
  bldgvalue: "Building Value",
  acreage: "Lot Size (ac)",
  acres: "Lot Size (ac)",
  lot_acres: "Lot Size (ac)",
  lotsqft: "Lot Size (SF)",
  lot_sqft: "Lot Size (SF)",
  lotsizearea: "Lot Size",
  lotsize: "Lot Size",
  lot_size: "Lot Size",
  zoning: "Zoning",
  zone: "Zoning",
  zonecode: "Zoning",
  zone_code: "Zoning",
  zoning_code: "Zoning",
  zoningdesc: "Zoning Desc",
  taxid: "Tax ID",
  tax_id: "Tax ID",
  parcelid: "Parcel ID",
  parcel_id: "Parcel ID",
  parcelnumber: "Parcel ID",
  parcel_number: "Parcel ID",
  pin: "PIN",
  yearbuilt: "Year Built",
  year_built: "Year Built",
  yrbuilt: "Year Built",
  yr_built: "Year Built",
};

/** Priority ordering for known fields (lower = higher priority). */
const FIELD_PRIORITY: string[] = [
  "Owner",
  "Address",
  "Mailing Addr",
  "Parcel ID",
  "Tax ID",
  "PIN",
  "Zoning",
  "Zoning Desc",
  "Land Value",
  "Improvement Value",
  "Building Value",
  "Assessed Value",
  "Total Value",
  "Total Assessed",
  "Lot Size (ac)",
  "Lot Size (SF)",
  "Lot Size",
  "Year Built",
];

function formatValue(key: string, value: any): string {
  if (value == null || value === "") return "—";
  const label = typeof key === "string" ? key.toLowerCase() : "";
  // Format currency values
  if (
    label.includes("value") ||
    label.includes("assessed") ||
    label.includes("price")
  ) {
    const num = Number(value);
    if (!isNaN(num)) {
      return num.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      });
    }
  }
  // Format acreage
  if (label.includes("acre")) {
    const num = Number(value);
    if (!isNaN(num)) return `${num.toFixed(2)} ac`;
  }
  // Format sqft
  if (label.includes("sqft") || label.includes("sq_ft")) {
    const num = Number(value);
    if (!isNaN(num)) return `${num.toLocaleString()} SF`;
  }
  return String(value);
}

function buildDisplayRows(
  data: Record<string, any>
): { label: string; value: string }[] {
  const seen = new Set<string>();
  const prioritized: { label: string; value: string; order: number }[] = [];
  const extras: { label: string; value: string }[] = [];

  for (const [rawKey, rawValue] of Object.entries(data)) {
    // Skip internal / geometry fields
    const lk = rawKey.toLowerCase();
    if (
      lk === "objectid" ||
      lk === "shape" ||
      lk === "shape_area" ||
      lk === "shape_length" ||
      lk === "shape.area" ||
      lk === "shape.len" ||
      lk === "globalid" ||
      lk === "geometry" ||
      lk === "geom"
    )
      continue;

    const knownLabel = KNOWN_FIELDS[lk];
    if (knownLabel && !seen.has(knownLabel)) {
      seen.add(knownLabel);
      const order = FIELD_PRIORITY.indexOf(knownLabel);
      prioritized.push({
        label: knownLabel,
        value: formatValue(knownLabel, rawValue),
        order: order >= 0 ? order : 999,
      });
    } else if (!knownLabel) {
      extras.push({
        label: rawKey,
        value: formatValue(rawKey, rawValue),
      });
    }
  }

  prioritized.sort((a, b) => a.order - b.order);
  const rows = prioritized.map(({ label, value }) => ({ label, value }));

  // Append remaining unknown fields up to total of 10
  const remaining = 10 - rows.length;
  if (remaining > 0) {
    rows.push(...extras.slice(0, remaining));
  }

  return rows;
}

export default function ParcelInfoPopup({
  parcelData,
  onClose,
  position,
}: ParcelInfoPopupProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [clampedPos, setClampedPos] = useState<{
    left: number;
    top: number;
  } | null>(null);

  // Animate in on mount / data change
  useEffect(() => {
    if (parcelData) {
      // Small delay so the initial opacity-0 frame renders first
      const t = setTimeout(() => setVisible(true), 20);
      return () => clearTimeout(t);
    }
    setVisible(false);
  }, [parcelData]);

  // Clamp position to viewport once card dimensions are known
  useEffect(() => {
    if (!parcelData || !position) {
      setClampedPos(null);
      return;
    }

    const clamp = () => {
      const card = cardRef.current;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const pad = 8;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let left = position.x - rect.width / 2;
      let top = position.y + 12; // slightly below click point

      // Clamp horizontal
      if (left < pad) left = pad;
      if (left + rect.width > vw - pad) left = vw - pad - rect.width;

      // Clamp vertical
      if (top + rect.height > vh - pad) top = position.y - rect.height - 12;
      if (top < pad) top = pad;

      setClampedPos({ left, top });
    };

    // Delay to let render settle
    requestAnimationFrame(clamp);
  }, [parcelData, position]);

  if (!parcelData) return null;

  const rows = buildDisplayRows(parcelData);

  // Position style: if position prop supplied use clamped absolute, else center at top
  const positionStyle: React.CSSProperties = position
    ? {
        position: "absolute" as const,
        left: clampedPos?.left ?? position.x,
        top: clampedPos?.top ?? position.y,
      }
    : {
        position: "absolute" as const,
        top: 12,
        left: "50%",
        transform: "translateX(-50%)",
      };

  return (
    <div
      ref={cardRef}
      style={positionStyle}
      className={cn(
        "z-50 w-[280px] max-h-[320px] overflow-y-auto rounded-lg",
        "bg-[#1a2332] text-white shadow-xl border border-white/10",
        "transition-all duration-200 ease-out",
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 -translate-y-2 pointer-events-none"
      )}
    >
      {/* Header */}
      <div className="sticky top-0 flex items-center justify-between bg-[#1a2332] px-3 py-2 border-b border-white/10">
        <span className="text-xs font-semibold tracking-wide uppercase text-white/80">
          Parcel Info
        </span>
        <button
          onClick={onClose}
          className="p-0.5 rounded hover:bg-white/10 transition-colors"
          aria-label="Close parcel info"
        >
          <X className="w-3.5 h-3.5 text-white/60 hover:text-white" />
        </button>
      </div>

      {/* Body */}
      <div className="px-3 py-2 space-y-1">
        {rows.length === 0 && (
          <p className="text-[10px] text-white/40 italic">
            No attribute data available.
          </p>
        )}
        {rows.map(({ label, value }, i) => (
          <div key={i} className="flex justify-between gap-2">
            <span className="text-[10px] text-white/50 shrink-0 leading-4">
              {label}
            </span>
            <span className="text-[10px] text-white/90 text-right leading-4 truncate">
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
