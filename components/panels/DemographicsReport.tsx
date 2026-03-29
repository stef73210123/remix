"use client";

import { useState, useRef, useEffect } from "react";
import { Property } from "@/types/cesium";
import * as d3 from "d3";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const RADIUS_OPTIONS = ["1/4 mile", "1/2 mile", "1 mile", "3 mile"] as const;
const RADIUS_COLORS = ["#1a5276", "#5dade2", "#e67e22", "#27ae60"];
const BOUNDARY_TYPES = ["radius", "census-tract", "zip-code", "isochrone"] as const;
const ISOCHRONE_MODES = ["drive", "walk", "transit"] as const;

interface CensusApiResponse {
  fips: { state: string; county: string; tract: string };
  location: { lat: number; lng: number; stateName: string; countyName: string };
  demographics: {
    totalPopulation: number;
    medianAge: number;
    totalHouseholds: number;
    medianHouseholdIncome: number;
    housingUnits: number;
  };
}

// DC baseline reference data for comparison column
const DC_BASELINE = {
  totalPopulation: 689545,
  medianAge: 34.0,
  maleFemaleRatio: [47, 53] as [number, number],
  totalHouseholds: 308200,
  avgHouseholdSize: 2.11,
};

/**
 * Given a median household income, approximate a percentage distribution
 * across income brackets: <$25K, $25-50K, $50-75K, $75-100K, $100-150K, $150K+
 */
function estimateIncomeDistribution(median: number): number[] {
  // Use a log-normal-inspired heuristic centered on the median
  const brackets = [12500, 37500, 62500, 87500, 125000, 175000];
  const raw = brackets.map((mid) => {
    const logDiff = Math.log(mid / median);
    return Math.exp(-0.5 * logDiff * logDiff);
  });
  const total = raw.reduce((a, b) => a + b, 0);
  return raw.map((v) => Math.round((v / total) * 100));
}

export default function DemographicsReport({
  property,
}: {
  property: Property;
}) {
  const [selectedRadius, setSelectedRadius] = useState<(typeof RADIUS_OPTIONS)[number]>("1/2 mile");
  const [boundaryType, setBoundaryType] = useState<(typeof BOUNDARY_TYPES)[number]>("radius");
  const [isochroneMode, setIsochroneMode] = useState<(typeof ISOCHRONE_MODES)[number]>("drive");
  const [isochroneMinutes, setIsochroneMinutes] = useState(15);
  const [censusData, setCensusData] = useState<CensusApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const d3ContainerRef = useRef<SVGSVGElement>(null);

  // Fetch census data from API
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/census?lat=${property.lat}&lng=${property.lng}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Census API returned ${res.status}`);
        return res.json();
      })
      .then((data: CensusApiResponse) => {
        if (!cancelled) {
          setCensusData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [property.lat, property.lng]);

  const city = DC_BASELINE;

  // D3 Population Pyramid - Census API only returns a snapshot, no age breakdown
  useEffect(() => {
    if (!d3ContainerRef.current) return;
    const svg = d3.select(d3ContainerRef.current);
    svg.selectAll("*").remove();

    if (!censusData) return;

    const width = 230;
    const height = 40;
    svg.attr("width", width).attr("height", height);

    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .attr("font-size", "9px")
      .attr("fill", "#888")
      .text("Age breakdown not available from Census API");
  }, [censusData]);

  // Chart.js - Property Type Distribution Doughnut
  const doughnutData = {
    labels: ["Residential", "Commercial", "Mixed Use", "Industrial", "Other"],
    datasets: [
      {
        data: [42, 28, 15, 8, 7],
        backgroundColor: ["#27ae60", "#2980b9", "#e74c3c", "#7f8c8d", "#f39c12"],
        borderWidth: 0,
      },
    ],
  };

  // Chart.js - Income Distribution Bar Chart (estimated from median)
  const areaIncomeDist = censusData
    ? estimateIncomeDistribution(censusData.demographics.medianHouseholdIncome)
    : [0, 0, 0, 0, 0, 0];
  const cityIncomeDist = estimateIncomeDistribution(82604); // DC median household income baseline

  const incomeData = {
    labels: ["<$25K", "$25-50K", "$50-75K", "$75-100K", "$100-150K", "$150K+"],
    datasets: [
      {
        label: "Census Tract",
        data: areaIncomeDist,
        backgroundColor: "#5dade2",
        borderRadius: 3,
      },
      {
        label: "DC Average",
        data: cityIncomeDist,
        backgroundColor: "#bdc3c7",
        borderRadius: 3,
      },
    ],
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full overflow-y-auto bg-[#f5f5f5]">
        <div className="px-3 py-2 bg-[#1a2332]">
          <h2 className="text-sm font-bold text-white truncate">{property.address}</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-[#0088aa] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-gray-500">Loading census data...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !censusData) {
    return (
      <div className="flex flex-col h-full overflow-y-auto bg-[#f5f5f5]">
        <div className="px-3 py-2 bg-[#1a2332]">
          <h2 className="text-sm font-bold text-white truncate">{property.address}</h2>
        </div>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-xs text-red-600 text-center">
            Failed to load census data{error ? `: ${error}` : ""}
          </div>
        </div>
      </div>
    );
  }

  const demo = censusData.demographics;

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#f5f5f5]">
      {/* Header */}
      <div className="px-3 py-2 bg-[#1a2332]">
        <h2 className="text-sm font-bold text-white truncate">
          {property.address}
        </h2>
      </div>

      {/* Boundary Type Selector */}
      <div className="px-3 py-2 bg-white border-b flex flex-wrap gap-1">
        {BOUNDARY_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => setBoundaryType(type)}
            className={`text-[9px] font-medium px-2 py-1 rounded ${
              boundaryType === type
                ? "bg-[#0088aa] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {type === "census-tract"
              ? "Census Tract"
              : type === "zip-code"
                ? "ZIP Code"
                : type === "isochrone"
                  ? "Isochrone"
                  : "Radius"}
          </button>
        ))}
      </div>

      {/* Radius or Isochrone Selector */}
      <div className="px-3 py-2 bg-white border-b">
        {boundaryType === "radius" && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-600">RADIUS:</span>
            <select
              value={selectedRadius}
              onChange={(e) =>
                setSelectedRadius(e.target.value as (typeof RADIUS_OPTIONS)[number])
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
        )}
        {boundaryType === "isochrone" && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-gray-600">MODE:</span>
            {ISOCHRONE_MODES.map((mode) => (
              <button
                key={mode}
                onClick={() => setIsochroneMode(mode)}
                className={`text-[9px] px-2 py-0.5 rounded ${
                  isochroneMode === mode
                    ? "bg-[#0088aa] text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {mode}
              </button>
            ))}
            <span className="text-[10px] font-bold text-gray-600 ml-2">TIME:</span>
            <select
              value={isochroneMinutes}
              onChange={(e) => setIsochroneMinutes(parseInt(e.target.value))}
              className="text-xs border border-gray-300 rounded px-1 py-0.5"
            >
              {[5, 10, 15, 20, 30, 45, 60].map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
            </select>
          </div>
        )}
        {boundaryType === "census-tract" && (
          <div className="text-[10px] text-gray-500">
            Census Tract: {censusData?.fips.tract || "N/A"} (based on {property.lat.toFixed(4)}, {property.lng.toFixed(4)})
          </div>
        )}
        {boundaryType === "zip-code" && (
          <div className="text-[10px] text-gray-500">
            ZIP Code: {censusData?.fips.tract || "N/A"}
          </div>
        )}
      </div>

      {/* Demographics Overview */}
      <div className="bg-[#0088aa] px-3 py-1">
        <span className="text-white text-xs font-bold">DEMOGRAPHICS OVERVIEW</span>
      </div>

      <div className="bg-white">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left px-3 py-1 font-bold text-gray-700">METRIC</th>
              <th className="text-right px-3 py-1 font-bold text-gray-700">AREA</th>
              <th className="text-right px-3 py-1 font-bold text-gray-700">DC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr>
              <td className="px-3 py-1 text-gray-700">Total Population</td>
              <td className="px-3 py-1 text-right font-bold">{demo.totalPopulation.toLocaleString()}</td>
              <td className="px-3 py-1 text-right text-gray-500">{city.totalPopulation.toLocaleString()}</td>
            </tr>
            <tr>
              <td className="px-3 py-1 text-gray-700">Median Age</td>
              <td className="px-3 py-1 text-right font-bold">{demo.medianAge.toFixed(1)}</td>
              <td className="px-3 py-1 text-right text-gray-500">{city.medianAge.toFixed(1)}</td>
            </tr>
            <tr>
              <td className="px-3 py-1 text-gray-700">Male/Female %</td>
              <td className="px-3 py-1 text-right font-bold">N/A</td>
              <td className="px-3 py-1 text-right text-gray-500">{city.maleFemaleRatio[0]}% / {city.maleFemaleRatio[1]}%</td>
            </tr>
            <tr>
              <td className="px-3 py-1 text-gray-700">Households</td>
              <td className="px-3 py-1 text-right font-bold">{demo.totalHouseholds.toLocaleString()}</td>
              <td className="px-3 py-1 text-right text-gray-500">{city.totalHouseholds.toLocaleString()}</td>
            </tr>
            <tr>
              <td className="px-3 py-1 text-gray-700">Housing Units</td>
              <td className="px-3 py-1 text-right font-bold">{demo.housingUnits.toLocaleString()}</td>
              <td className="px-3 py-1 text-right text-gray-500">—</td>
            </tr>
            <tr>
              <td className="px-3 py-1 text-gray-700">Median HH Income</td>
              <td className="px-3 py-1 text-right font-bold">${demo.medianHouseholdIncome.toLocaleString()}</td>
              <td className="px-3 py-1 text-right text-gray-500">$82,604</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Population Growth - Historical data not available from Census API */}
      <div className="bg-white mt-2 px-3 py-2">
        <h3 className="text-[10px] font-bold text-gray-700 mb-2">
          POPULATION GROWTH TREND
        </h3>
        <div className="h-[40px] flex items-center justify-center">
          <span className="text-[10px] text-gray-400 italic">
            Historical data not available from Census API
          </span>
        </div>
      </div>

      {/* D3 Population Pyramid */}
      <div className="bg-white mt-2 px-3 py-2">
        <h3 className="text-[10px] font-bold text-gray-700 mb-1">
          POPULATION BY AGE (D3)
        </h3>
        <svg ref={d3ContainerRef} />
      </div>

      {/* Income Distribution - Chart.js Bar */}
      <div className="bg-white mt-2 px-3 py-2">
        <h3 className="text-[10px] font-bold text-gray-700 mb-2">
          HOUSEHOLD INCOME DISTRIBUTION
        </h3>
        <div className="h-[130px]">
          <Bar
            data={incomeData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: true, labels: { font: { size: 8 }, boxWidth: 12 } },
              },
              scales: {
                x: { ticks: { font: { size: 8 } } },
                y: { ticks: { font: { size: 8 } }, beginAtZero: true },
              },
            }}
          />
        </div>
      </div>

      {/* Property Type Mix - Chart.js Doughnut */}
      <div className="bg-white mt-2 px-3 py-2 mb-2">
        <h3 className="text-[10px] font-bold text-gray-700 mb-2">
          PROPERTY TYPE MIX
        </h3>
        <div className="h-[130px] flex items-center justify-center">
          <Doughnut
            data={doughnutData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              cutout: "60%",
              plugins: {
                legend: {
                  position: "right",
                  labels: { font: { size: 8 }, boxWidth: 10, padding: 6 },
                },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
