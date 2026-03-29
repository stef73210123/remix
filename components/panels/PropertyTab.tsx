"use client";

import { useState, useEffect } from "react";
import { Property } from "@/types/cesium";
import { Star, FileText, Download } from "lucide-react";
import { PROPERTY_TYPE_COLORS } from "@/types/cesium";
import { isFavorite, toggleFavorite, addRecent } from "@/lib/favorites";

export default function PropertyTab({ property }: { property: Property }) {
  const color = PROPERTY_TYPE_COLORS[property.propertyType];
  const [starred, setStarred] = useState(false);
  const [generating, setGenerating] = useState(false);
  const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

  useEffect(() => {
    setStarred(isFavorite(property.id));
    addRecent(property.id);
  }, [property.id]);

  function handleStar() {
    const nowFav = toggleFavorite(property.id);
    setStarred(nowFav);
  }

  async function handleReport() {
    setGenerating(true);
    try {
      const { generatePropertyPDF } = await import("@/lib/report-generator");
      await generatePropertyPDF(property);
    } catch (e) {
      console.warn("PDF generation failed:", e);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 bg-[#1a2332]">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-white truncate">
              {property.address}
            </h2>
          </div>
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={handleStar}
              className={starred ? "text-yellow-400 hover:text-yellow-300" : "text-white/40 hover:text-yellow-400"}
            >
              <Star className="w-4 h-4" fill={starred ? "currentColor" : "none"} />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between mt-1">
          <button
            onClick={handleReport}
            disabled={generating}
            className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded flex items-center gap-1 hover:bg-red-700 disabled:opacity-50"
          >
            {generating ? (
              <>GENERATING...</>
            ) : (
              <>REPORTS <Download className="w-3 h-3" /></>
            )}
          </button>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <div
            className="w-3 h-3 rounded-sm flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="text-white text-xs">{property.propertyUse}</span>
          <span className="text-white/70 text-xs ml-auto">
            {property.squareFeet.toLocaleString()} SF
          </span>
        </div>
      </div>

      {/* Property Section */}
      <div className="bg-[#0088aa] px-3 py-1">
        <span className="text-white text-xs font-bold">Property</span>
      </div>

      {/* Street View */}
      <div className="bg-[#2a3444] px-3 py-1">
        <span className="text-[#0088aa] text-xs font-semibold">
          STREET VIEW
        </span>
      </div>
      <div className="h-32 bg-gray-700 relative overflow-hidden">
        {googleKey ? (
          <iframe
            src={`https://www.google.com/maps/embed/v1/streetview?location=${property.lat},${property.lng}&key=${googleKey}&heading=0&pitch=0&fov=90`}
            className="absolute inset-0 w-full h-full border-0"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <iframe
            src={`https://maps.google.com/maps?q=&layer=c&cbll=${property.lat},${property.lng}&cbp=11,0,0,0,0&ll=${property.lat},${property.lng}&z=18&output=svembed`}
            className="absolute inset-0 w-full h-full border-0"
            allowFullScreen
            loading="lazy"
          />
        )}
      </div>

      {/* Details */}
      <div className="bg-[#1e2d3d] px-3 py-1.5">
        <span className="text-[#0088aa] text-xs font-bold">DETAILS</span>
      </div>
      <div className="flex-1 overflow-y-auto bg-[#f5f5f5] text-[11px]">
        <div className="divide-y divide-gray-200">
          <DetailRow label="Lat/Long:" value={`${property.lat}/${property.lng}`} />
          <DetailRow label="Neighborhood:" value={property.neighborhood} />
          <DetailRow label="Square Suffix Lot:" value={property.squareSuffixLot} />
          <DetailRow label="Zoning District:" value={property.zoningDistrict} />
          <DetailRow
            label="Neighborhood Cluster:"
            value={property.neighborhoodCluster.join(", ")}
          />
          <DetailRow
            label="Land Area:"
            value={`${property.landArea.sqft.toLocaleString()} SF / ${property.landArea.acres} Acres`}
          />
          <DetailRow label="Jurisdiction:" value={property.jurisdiction} />
          <DetailRow label="Book No, Page No:" value={property.bookPageNo} />
          <DetailRow label="Property Use:" value={property.propertyUse} />
          <div className="px-3 py-2">
            <div className="text-gray-500 text-[10px] mb-0.5">Owner:</div>
            <div className="font-semibold text-gray-800">
              {property.owner.name}
            </div>
            <div className="text-gray-600 mt-0.5">{property.owner.address}</div>
          </div>
          {property.yearBuilt && (
            <DetailRow label="Year Built:" value={String(property.yearBuilt)} />
          )}
          {property.units && (
            <DetailRow label="Units:" value={String(property.units)} />
          )}
          {property.stories && (
            <DetailRow label="Stories:" value={String(property.stories)} />
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-1.5 flex gap-2">
      <span className="text-gray-500 text-[10px] whitespace-nowrap">
        {label}
      </span>
      <span className="font-semibold text-gray-800">{value}</span>
    </div>
  );
}
