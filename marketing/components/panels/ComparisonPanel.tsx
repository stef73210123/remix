"use client";

import { useCesium } from "@/components/cesium/CesiumContext";
import { PROPERTY_TYPE_COLORS, LAND_USE_COLORS, PROPERTY_TYPE_TO_LAND_USE } from "@/types/cesium";
import { X } from "lucide-react";

export default function ComparisonPanel({ onClose }: { onClose: () => void }) {
  const { comparisonProperties, removeFromComparison, flyToProperty, setSelectedProperty, setLeftPanelOpen } = useCesium();

  if (comparisonProperties.length === 0) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="px-3 py-2 bg-[#f0f0f0] border-b flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800">COMPARE PROPERTIES</h3>
          <button onClick={onClose} className="p-0.5 hover:bg-gray-300 rounded">
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div>
            <p className="text-sm text-gray-500 mb-2">No properties selected</p>
            <p className="text-xs text-gray-400">
              Hold <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Shift</kbd> + click on properties to add them for comparison (up to 4).
            </p>
          </div>
        </div>
      </div>
    );
  }

  const fields: { label: string; getValue: (p: typeof comparisonProperties[0]) => string }[] = [
    { label: "Type", getValue: (p) => p.propertyType },
    { label: "Category", getValue: (p) => PROPERTY_TYPE_TO_LAND_USE[p.propertyType] },
    { label: "Square Feet", getValue: (p) => p.squareFeet.toLocaleString() },
    { label: "Neighborhood", getValue: (p) => p.neighborhood },
    { label: "Zoning", getValue: (p) => p.zoningDistrict },
    { label: "Land Area (SF)", getValue: (p) => p.landArea.sqft.toLocaleString() },
    { label: "Land Area (Acres)", getValue: (p) => String(p.landArea.acres) },
    { label: "Year Built", getValue: (p) => p.yearBuilt ? String(p.yearBuilt) : "N/A" },
    { label: "Units", getValue: (p) => p.units ? String(p.units) : "N/A" },
    { label: "Stories", getValue: (p) => p.stories ? String(p.stories) : "N/A" },
    { label: "Bedrooms", getValue: (p) => p.bedrooms ? String(p.bedrooms) : "N/A" },
    { label: "Jurisdiction", getValue: (p) => p.jurisdiction },
    { label: "Owner", getValue: (p) => p.owner.name },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 bg-[#f0f0f0] border-b flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-800">
          COMPARE ({comparisonProperties.length})
        </h3>
        <button onClick={onClose} className="p-0.5 hover:bg-gray-300 rounded">
          <X className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="bg-[#1a2332]">
              <th className="text-left text-white/60 px-2 py-1.5 font-medium sticky left-0 bg-[#1a2332] min-w-[70px]">
                Field
              </th>
              {comparisonProperties.map((prop) => (
                <th key={prop.id} className="text-left text-white px-2 py-1.5 font-medium min-w-[100px]">
                  <div className="flex items-center gap-1">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: PROPERTY_TYPE_COLORS[prop.propertyType] }}
                    />
                    <button
                      onClick={() => {
                        setSelectedProperty(prop);
                        setLeftPanelOpen(true);
                        flyToProperty(prop);
                      }}
                      className="truncate hover:underline"
                      title={prop.address}
                    >
                      {prop.address.split(",")[0]}
                    </button>
                    <button
                      onClick={() => removeFromComparison(prop.id)}
                      className="text-white/40 hover:text-red-400 flex-shrink-0"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fields.map((field, i) => (
              <tr key={field.label} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-2 py-1.5 text-gray-500 font-medium sticky left-0" style={{ backgroundColor: i % 2 === 0 ? "white" : "#f9fafb" }}>
                  {field.label}
                </td>
                {comparisonProperties.map((prop) => (
                  <td key={prop.id} className="px-2 py-1.5 text-gray-800 font-semibold">
                    {field.getValue(prop)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
