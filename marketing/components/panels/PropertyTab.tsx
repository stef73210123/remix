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
  const [walkData, setWalkData] = useState<any>(null);
  const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

  useEffect(() => {
    setStarred(isFavorite(property.id));
    addRecent(property.id);
  }, [property.id]);

  useEffect(() => {
    let cancelled = false;
    import("@/lib/walkscore").then(({ getWalkabilityData }) => {
      getWalkabilityData(property.lat, property.lng).then(data => {
        if (!cancelled) setWalkData(data);
      });
    });
    return () => { cancelled = true; };
  }, [property.lat, property.lng]);

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

        {/* Walkability & Transit */}
        <div className="bg-[#1e2d3d] px-3 py-1.5">
          <span className="text-[#0088aa] text-xs font-bold">WALKABILITY &amp; TRANSIT</span>
        </div>
        {walkData ? (
          <div className="bg-white px-3 py-3">
            {/* Score circles */}
            <div className="flex justify-around mb-3">
              {([
                { label: "Walk Score", score: walkData.walkScore, desc: walkData.walkDescription },
                { label: "Transit Score", score: walkData.transitScore, desc: walkData.transitDescription },
                { label: "Bike Score", score: walkData.bikeScore, desc: walkData.bikeDescription },
              ] as const).map((item) => (
                <div key={item.label} className="flex flex-col items-center">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{
                      backgroundColor:
                        item.score >= 70 ? "#22c55e" : item.score >= 50 ? "#eab308" : "#ef4444",
                    }}
                  >
                    {item.score}
                  </div>
                  <span className="text-[10px] font-semibold text-gray-700 mt-1">{item.label}</span>
                  <span className="text-[9px] text-gray-500">{item.desc}</span>
                </div>
              ))}
            </div>

            {/* Nearby Transit */}
            {walkData.nearbyTransit.length > 0 && (
              <div className="mb-3">
                <div className="text-[10px] font-bold text-gray-600 mb-1">Nearby Transit</div>
                {walkData.nearbyTransit.slice(0, 5).map((stop: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-0.5 text-[10px]">
                    <span className="text-gray-800 truncate flex-1">{stop.name}</span>
                    <span className="text-gray-500 mx-2">{stop.type.replace("_", " ")}</span>
                    <span className="text-gray-400 whitespace-nowrap">{stop.distance}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Nearby Amenities */}
            <div>
              <div className="text-[10px] font-bold text-gray-600 mb-1">Nearby Amenities</div>
              <div className="flex justify-between text-[10px]">
                {([
                  { label: "Restaurants", count: walkData.nearbyAmenities.restaurants },
                  { label: "Groceries", count: walkData.nearbyAmenities.groceries },
                  { label: "Parks", count: walkData.nearbyAmenities.parks },
                  { label: "Schools", count: walkData.nearbyAmenities.schools },
                ] as const).map((a) => (
                  <div key={a.label} className="text-center">
                    <div className="font-bold text-gray-800">{a.count}</div>
                    <div className="text-gray-500">{a.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white px-3 py-4 text-center text-[10px] text-gray-400">
            Loading walkability data...
          </div>
        )}
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
