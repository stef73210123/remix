"use client";

import { useState, useRef, useEffect } from "react";
import { Property, DemographicData } from "@/types/cesium";
import { getDemographicsForProperty, DC_DEMOGRAPHICS } from "@/lib/data/demographics";
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
import { Bar, Doughnut, Line } from "react-chartjs-2";

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

export default function DemographicsReport({
  property,
}: {
  property: Property;
}) {
  const [selectedRadius, setSelectedRadius] = useState<(typeof RADIUS_OPTIONS)[number]>("1/2 mile");
  const [boundaryType, setBoundaryType] = useState<(typeof BOUNDARY_TYPES)[number]>("radius");
  const [isochroneMode, setIsochroneMode] = useState<(typeof ISOCHRONE_MODES)[number]>("drive");
  const [isochroneMinutes, setIsochroneMinutes] = useState(15);
  const d3ContainerRef = useRef<SVGSVGElement>(null);

  const allDemographics = getDemographicsForProperty(property.id);
  const demographics = allDemographics.find((d) => d.radius === selectedRadius)!;
  const city = DC_DEMOGRAPHICS;

  // D3 Population Pyramid
  useEffect(() => {
    if (!d3ContainerRef.current) return;

    const svg = d3.select(d3ContainerRef.current);
    svg.selectAll("*").remove();

    const width = 230;
    const height = 180;
    const margin = { top: 10, right: 30, bottom: 20, left: 70 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const data = demographics.populationByAge;
    const maxValue = d3.max(data, (d) => d.count) || 1;

    const y = d3
      .scaleBand()
      .domain(data.map((d) => d.ageGroup))
      .range([0, innerHeight])
      .padding(0.15);

    const x = d3.scaleLinear().domain([0, maxValue]).range([0, innerWidth]);

    // Bars
    g.selectAll("rect")
      .data(data)
      .enter()
      .append("rect")
      .attr("x", 0)
      .attr("y", (d) => y(d.ageGroup)!)
      .attr("width", (d) => x(d.count))
      .attr("height", y.bandwidth())
      .attr("fill", "#5dade2")
      .attr("rx", 2)
      .attr("opacity", 0.8);

    // Value labels
    g.selectAll(".value")
      .data(data)
      .enter()
      .append("text")
      .attr("x", (d) => x(d.count) + 3)
      .attr("y", (d) => y(d.ageGroup)! + y.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("font-size", "8px")
      .attr("fill", "#666")
      .text((d) => d.count.toLocaleString());

    // Y-axis
    g.append("g")
      .call(d3.axisLeft(y).tickSize(0))
      .selectAll("text")
      .attr("font-size", "7px")
      .attr("fill", "#888");

    g.select(".domain").remove();
  }, [demographics]);

  // Chart.js - Population Growth Line Chart
  const populationChartData = {
    labels: demographics.populationByYear.map((d) => String(d.year)),
    datasets: RADIUS_OPTIONS.map((radius, i) => {
      const radiusData = allDemographics.find((d) => d.radius === radius)!;
      return {
        label: radius,
        data: radiusData.populationByYear.map((d) => d.population),
        borderColor: RADIUS_COLORS[i],
        backgroundColor: RADIUS_COLORS[i] + "20",
        fill: radius === selectedRadius,
        tension: 0.3,
        pointRadius: 3,
        borderWidth: radius === selectedRadius ? 2.5 : 1,
      };
    }),
  };

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

  // Chart.js - Income Distribution Bar Chart
  const incomeData = {
    labels: ["<$25K", "$25-50K", "$50-75K", "$75-100K", "$100-150K", "$150K+"],
    datasets: [
      {
        label: selectedRadius,
        data: [8, 14, 18, 22, 24, 14].map((v) => v + (parseInt(property.id) % 5)),
        backgroundColor: "#5dade2",
        borderRadius: 3,
      },
      {
        label: "City Average",
        data: [12, 16, 19, 20, 19, 14],
        backgroundColor: "#bdc3c7",
        borderRadius: 3,
      },
    ],
  };

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
            Census Tract: 0062.02 (based on {property.lat.toFixed(4)}, {property.lng.toFixed(4)})
          </div>
        )}
        {boundaryType === "zip-code" && (
          <div className="text-[10px] text-gray-500">
            ZIP Code: 200{(parseInt(property.id) % 9) + 1}
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
              <td className="px-3 py-1 text-right font-bold">{demographics.totalPopulation.toLocaleString()}</td>
              <td className="px-3 py-1 text-right text-gray-500">{city.totalPopulation.toLocaleString()}</td>
            </tr>
            <tr>
              <td className="px-3 py-1 text-gray-700">Median Age</td>
              <td className="px-3 py-1 text-right font-bold">{demographics.medianAge.toFixed(1)}</td>
              <td className="px-3 py-1 text-right text-gray-500">{city.medianAge.toFixed(1)}</td>
            </tr>
            <tr>
              <td className="px-3 py-1 text-gray-700">Male/Female %</td>
              <td className="px-3 py-1 text-right font-bold">{demographics.maleFemaleRatio[0]}% / {demographics.maleFemaleRatio[1]}%</td>
              <td className="px-3 py-1 text-right text-gray-500">{city.maleFemaleRatio[0]}% / {city.maleFemaleRatio[1]}%</td>
            </tr>
            <tr>
              <td className="px-3 py-1 text-gray-700">Households</td>
              <td className="px-3 py-1 text-right font-bold">{demographics.totalHouseholds.toLocaleString()}</td>
              <td className="px-3 py-1 text-right text-gray-500">{city.totalHouseholds.toLocaleString()}</td>
            </tr>
            <tr>
              <td className="px-3 py-1 text-gray-700">Avg HH Size</td>
              <td className="px-3 py-1 text-right font-bold">{demographics.avgHouseholdSize.toFixed(2)}</td>
              <td className="px-3 py-1 text-right text-gray-500">{city.avgHouseholdSize.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Population Growth - Chart.js Line */}
      <div className="bg-white mt-2 px-3 py-2">
        <h3 className="text-[10px] font-bold text-gray-700 mb-2">
          POPULATION GROWTH TREND
        </h3>
        <div className="h-[140px]">
          <Line
            data={populationChartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: true, labels: { font: { size: 8 }, boxWidth: 12 } },
              },
              scales: {
                x: { ticks: { font: { size: 9 } } },
                y: {
                  ticks: {
                    font: { size: 9 },
                    callback: (v) => `${(Number(v) / 1000).toFixed(0)}k`,
                  },
                },
              },
            }}
          />
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
