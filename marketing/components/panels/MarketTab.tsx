"use client";

import { useState } from "react";
import { Property, DemographicData } from "@/types/cesium";
import {
  getDemographicsForProperty,
  DC_DEMOGRAPHICS,
} from "@/lib/data/demographics";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const RADIUS_OPTIONS = ["1/4 mile", "1/2 mile", "1 mile", "3 mile"] as const;
const RADIUS_COLORS: Record<string, string> = {
  "1/4 mile": "#1a5276",
  "1/2 mile": "#5dade2",
  "1 mile": "#e67e22",
  "3 mile": "#27ae60",
};

export default function MarketTab({ property }: { property: Property }) {
  const [selectedRadius, setSelectedRadius] = useState<
    (typeof RADIUS_OPTIONS)[number]
  >("1/2 mile");

  const allDemographics = getDemographicsForProperty(property.id);
  const demographics = allDemographics.find(
    (d) => d.radius === selectedRadius
  )!;
  const city = DC_DEMOGRAPHICS;

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#f5f5f5]">
      {/* Header */}
      <div className="px-3 py-2 bg-[#1a2332]">
        <h2 className="text-sm font-bold text-white truncate">
          {property.address}
        </h2>
      </div>

      {/* Select Area */}
      <div className="px-3 py-2 bg-white border-b">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-gray-600">
            SELECT AREA:
          </span>
          <select
            value={selectedRadius}
            onChange={(e) =>
              setSelectedRadius(
                e.target.value as (typeof RADIUS_OPTIONS)[number]
              )
            }
            className="text-xs border border-gray-300 rounded px-2 py-0.5 bg-[#1a2332] text-white"
          >
            {RADIUS_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Demographics Overview */}
      <div className="bg-[#0088aa] px-3 py-1">
        <span className="text-white text-xs font-bold">
          DEMOGRAPHICS OVERVIEW
        </span>
      </div>

      <div className="bg-white">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left px-3 py-1 font-bold text-gray-700">
                SELECTED AREA:
              </th>
              <th className="text-right px-3 py-1 font-bold text-gray-700">
                {selectedRadius.toUpperCase()} RADIUS
              </th>
              <th className="text-right px-3 py-1 font-bold text-gray-700">
                WASHINGTON, DC
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <StatRow
              label="Total Population"
              local={demographics.totalPopulation.toLocaleString()}
              city={city.totalPopulation.toLocaleString()}
            />
            <StatRow
              label="Median Age"
              local={demographics.medianAge.toFixed(1)}
              city={city.medianAge.toFixed(1)}
            />
            <StatRow
              label="Male/Female %"
              local={`${demographics.maleFemaleRatio[0]}% / ${demographics.maleFemaleRatio[1]}%`}
              city={`${city.maleFemaleRatio[0]}% / ${city.maleFemaleRatio[1]}%`}
            />
            <StatRow
              label="Total Households"
              local={demographics.totalHouseholds.toLocaleString()}
              city={city.totalHouseholds.toLocaleString()}
            />
            <StatRow
              label="Avg Household Size"
              local={demographics.avgHouseholdSize.toFixed(2)}
              city={city.avgHouseholdSize.toFixed(2)}
            />
          </tbody>
        </table>
      </div>

      {/* Population Chart */}
      <div className="bg-white mt-2 px-3 py-2">
        <h3 className="text-[10px] font-bold text-gray-700 mb-2">
          Total Population{" "}
          <span className="text-gray-400">{selectedRadius}</span>
        </h3>
        <div className="flex flex-wrap gap-2 mb-2">
          {RADIUS_OPTIONS.map((r) => (
            <div key={r} className="flex items-center gap-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: RADIUS_COLORS[r] }}
              />
              <span className="text-[9px] text-gray-600">{r} Radius</span>
            </div>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={demographics.populationByYear}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="year" tick={{ fontSize: 9 }} />
            <YAxis
              tick={{ fontSize: 9 }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value) => Number(value).toLocaleString()}
              labelStyle={{ fontSize: 10 }}
              contentStyle={{ fontSize: 10 }}
            />
            <Bar
              dataKey="population"
              fill={RADIUS_COLORS[selectedRadius]}
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Population by Age */}
      <div className="bg-white mt-2 px-3 py-2 mb-2">
        <h3 className="text-[10px] font-bold text-gray-700 mb-2">
          Population Breakdown By Age and Gender{" "}
          <span className="text-gray-400">{selectedRadius}</span>
        </h3>
        <div className="space-y-1">
          {demographics.populationByAge.map((row) => (
            <div key={row.ageGroup} className="flex items-center gap-2">
              <span className="text-[9px] text-gray-600 w-20 flex-shrink-0">
                {row.ageGroup}
              </span>
              <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min((row.count / (demographics.populationByAge.reduce((max, r) => Math.max(max, r.count), 0))) * 100, 100)}%`,
                    backgroundColor: RADIUS_COLORS[selectedRadius],
                  }}
                />
              </div>
              <span className="text-[9px] text-gray-500 w-8 text-right">
                {row.count.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatRow({
  label,
  local,
  city,
}: {
  label: string;
  local: string;
  city: string;
}) {
  return (
    <tr>
      <td className="px-3 py-1 text-gray-700 font-medium">{label}</td>
      <td className="px-3 py-1 text-right font-bold text-gray-800">
        {local}
      </td>
      <td className="px-3 py-1 text-right text-gray-600">{city}</td>
    </tr>
  );
}
