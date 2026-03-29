"use client";

import { Property } from "@/types/cesium";
import { DollarSign, TrendingUp, BarChart3, Calculator } from "lucide-react";

export default function FinancingTab({ property }: { property: Property }) {
  const pricePerSqft = Math.round(250 + (parseInt(property.id) % 10) * 50);
  const estimatedValue = property.squareFeet * pricePerSqft;
  const capRate = (4.5 + (parseInt(property.id) % 5) * 0.5).toFixed(1);
  const noi = Math.round(estimatedValue * (parseFloat(capRate) / 100));

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#f5f5f5]">
      {/* Header */}
      <div className="px-3 py-2 bg-[#1a2332]">
        <h2 className="text-sm font-bold text-white truncate">
          {property.address}
        </h2>
      </div>

      <div className="bg-[#0088aa] px-3 py-1">
        <span className="text-white text-xs font-bold">
          FINANCIAL OVERVIEW
        </span>
      </div>

      <div className="p-3 space-y-3">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-2">
          <MetricCard
            icon={<DollarSign className="w-4 h-4" />}
            label="Est. Value"
            value={`$${(estimatedValue / 1000000).toFixed(1)}M`}
          />
          <MetricCard
            icon={<TrendingUp className="w-4 h-4" />}
            label="Cap Rate"
            value={`${capRate}%`}
          />
          <MetricCard
            icon={<BarChart3 className="w-4 h-4" />}
            label="NOI"
            value={`$${(noi / 1000).toFixed(0)}K`}
          />
          <MetricCard
            icon={<Calculator className="w-4 h-4" />}
            label="Price/SF"
            value={`$${pricePerSqft}`}
          />
        </div>

        {/* Comparable Sales */}
        <div className="bg-white rounded-lg p-3">
          <h4 className="text-[10px] font-bold text-gray-700 mb-2 uppercase">
            Recent Comparable Sales
          </h4>
          <div className="space-y-2 text-[10px]">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex justify-between items-center py-1 border-b border-gray-100 last:border-0"
              >
                <div>
                  <div className="font-medium text-gray-800">
                    {100 + i * 20} {property.neighborhood} St
                  </div>
                  <div className="text-gray-500">
                    {(property.squareFeet * (0.7 + i * 0.15)).toLocaleString(undefined, { maximumFractionDigits: 0 })}{" "}
                    SF
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-800">
                    ${((estimatedValue * (0.8 + i * 0.1)) / 1000000).toFixed(1)}
                    M
                  </div>
                  <div className="text-gray-500">
                    ${Math.round(pricePerSqft * (0.9 + i * 0.05))}/SF
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mortgage Calculator placeholder */}
        <div className="bg-white rounded-lg p-3">
          <h4 className="text-[10px] font-bold text-gray-700 mb-2 uppercase">
            Financing Assumptions
          </h4>
          <div className="space-y-1 text-[10px]">
            <div className="flex justify-between">
              <span className="text-gray-500">LTV</span>
              <span className="font-medium">65%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Interest Rate</span>
              <span className="font-medium">6.25%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Loan Term</span>
              <span className="font-medium">30 years</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">DSCR</span>
              <span className="font-medium">1.25x</span>
            </div>
            <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between font-bold">
              <span className="text-gray-700">Annual Debt Service</span>
              <span className="text-gray-800">
                $
                {(
                  ((estimatedValue * 0.65 * 0.0625) / 12 +
                    (estimatedValue * 0.65) / 360) *
                  12 /
                  1000
                ).toFixed(0)}
                K
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white rounded-lg p-2.5 flex flex-col items-center">
      <div className="text-[#0088aa] mb-1">{icon}</div>
      <div className="text-[9px] text-gray-500 uppercase">{label}</div>
      <div className="text-sm font-bold text-gray-800">{value}</div>
    </div>
  );
}
