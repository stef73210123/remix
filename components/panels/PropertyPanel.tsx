"use client";

import { useState } from "react";
import { useCesium } from "@/components/cesium/CesiumContext";
import PropertyTab from "./PropertyTab";
import DemographicsReport from "./DemographicsReport";
import FinancingTab from "./FinancingTab";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "property", label: "PROPERTY" },
  { id: "market", label: "MARKET" },
  { id: "financing", label: "FINANCING" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function PropertyPanel() {
  const { selectedProperty, leftPanelOpen, setLeftPanelOpen } = useCesium();
  const [activeTab, setActiveTab] = useState<TabId>("property");

  if (!leftPanelOpen || !selectedProperty) return null;

  return (
    <div className="absolute left-0 top-0 bottom-0 z-30 flex">
      {/* Vertical Tab Strip */}
      <div className="flex flex-col bg-[#1a2332] border-r border-white/10">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-1 py-4 text-[10px] font-bold tracking-wider transition-colors",
              "[writing-mode:vertical-lr] rotate-180",
              activeTab === tab.id
                ? "bg-[#0088aa] text-white"
                : "text-white/60 hover:text-white hover:bg-white/10"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Panel Content */}
      <div className="w-[260px] bg-[#f5f5f5] flex flex-col overflow-hidden shadow-xl relative">
        <button
          onClick={() => setLeftPanelOpen(false)}
          className="absolute top-1 right-1 z-10 p-0.5 bg-black/30 rounded hover:bg-black/50 text-white"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {activeTab === "property" && (
          <PropertyTab property={selectedProperty} />
        )}
        {activeTab === "market" && <DemographicsReport property={selectedProperty} />}
        {activeTab === "financing" && (
          <FinancingTab property={selectedProperty} />
        )}
      </div>
    </div>
  );
}
