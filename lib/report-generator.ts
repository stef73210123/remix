// PDF Report generator for property summaries
// Uses jsPDF for PDF creation

import React from "react";
import { Property, PROPERTY_TYPE_TO_LAND_USE } from "@/types/cesium";
import { getDemographicsForProperty } from "@/lib/data/demographics";

export async function generatePropertyPDF(property: Property): Promise<void> {
  // Dynamic import to keep bundle size small
  const { default: jsPDF } = await import("jspdf");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  // Header
  doc.setFillColor(26, 35, 50); // #1a2332
  doc.rect(0, 0, pageWidth, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Property Report", margin, 15);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, 23);
  y = 40;

  // Property address
  doc.setTextColor(26, 35, 50);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(property.address, margin, y);
  y += 10;

  // Property type badge
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const landUse = PROPERTY_TYPE_TO_LAND_USE[property.propertyType];
  doc.text(`${property.propertyType} (${landUse})`, margin, y);
  doc.text(`${property.squareFeet.toLocaleString()} SF`, pageWidth - margin, y, { align: "right" });
  y += 10;

  // Divider
  doc.setDrawColor(0, 136, 170); // #0088aa
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Details section
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 136, 170);
  doc.text("PROPERTY DETAILS", margin, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);

  const details: [string, string][] = [
    ["Location", `${property.lat}, ${property.lng}`],
    ["Neighborhood", property.neighborhood],
    ["Zoning District", property.zoningDistrict],
    ["Land Area", `${property.landArea.sqft.toLocaleString()} SF / ${property.landArea.acres} Acres`],
    ["Jurisdiction", property.jurisdiction],
    ["Book/Page", property.bookPageNo],
    ["Property Use", property.propertyUse],
    ["Owner", property.owner.name],
    ["Owner Address", property.owner.address],
  ];

  if (property.yearBuilt) details.push(["Year Built", String(property.yearBuilt)]);
  if (property.units) details.push(["Units", String(property.units)]);
  if (property.stories) details.push(["Stories", String(property.stories)]);
  if (property.bedrooms) details.push(["Bedrooms", String(property.bedrooms)]);

  for (const [label, value] of details) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(120, 120, 120);
    doc.text(label + ":", margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    doc.text(value, margin + 40, y);
    y += 5;
  }

  y += 5;

  // Demographics section
  doc.setDrawColor(0, 136, 170);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 136, 170);
  doc.text("DEMOGRAPHICS (1/2 mile radius)", margin, y);
  y += 8;

  const demographics = getDemographicsForProperty(property.id);
  const halfMile = demographics.find((d) => d.radius === "1/2 mile");
  if (halfMile) {
    doc.setFontSize(9);
    const demoDetails: [string, string][] = [
      ["Total Population", halfMile.totalPopulation.toLocaleString()],
      ["Median Age", String(halfMile.medianAge)],
      ["Male/Female", `${halfMile.maleFemaleRatio[0]}% / ${halfMile.maleFemaleRatio[1]}%`],
      ["Total Households", halfMile.totalHouseholds.toLocaleString()],
      ["Avg Household Size", String(halfMile.avgHouseholdSize)],
    ];

    for (const [label, value] of demoDetails) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(120, 120, 120);
      doc.text(label + ":", margin, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(40, 40, 40);
      doc.text(value, margin + 40, y);
      y += 5;
    }
  }

  y += 5;

  // Financing section
  doc.setDrawColor(0, 136, 170);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 136, 170);
  doc.text("FINANCING ESTIMATES", margin, y);
  y += 8;

  const seed = parseInt(property.id, 10) || 1;
  const estimatedValue = 250000 + seed * 150000;
  const capRate = 4.5 + (seed % 4) * 0.5;
  const noi = estimatedValue * (capRate / 100);
  const loanAmount = estimatedValue * 0.65;
  const annualDebt = loanAmount * 0.0625 * (1.0625 ** 30) / (1.0625 ** 30 - 1);

  doc.setFontSize(9);
  const finDetails: [string, string][] = [
    ["Estimated Value", `$${estimatedValue.toLocaleString()}`],
    ["Cap Rate", `${capRate.toFixed(1)}%`],
    ["NOI", `$${Math.round(noi).toLocaleString()}`],
    ["Loan Amount (65% LTV)", `$${Math.round(loanAmount).toLocaleString()}`],
    ["Annual Debt Service", `$${Math.round(annualDebt).toLocaleString()}`],
  ];

  for (const [label, value] of finDetails) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(120, 120, 120);
    doc.text(label + ":", margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    doc.text(value, margin + 50, y);
    y += 5;
  }

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(
    "Generated by CesiumJS Real Estate Analysis Platform | Data for informational purposes only",
    pageWidth / 2,
    pageHeight - 10,
    { align: "center" }
  );

  // Download
  doc.save(`property-report-${property.id}.pdf`);
}

export async function captureMapSnapshot(
  viewerRef: React.MutableRefObject<any>
): Promise<string | null> {
  try {
    const viewer = viewerRef.current;
    const canvas = viewer.scene.canvas as HTMLCanvasElement;
    viewer.scene.render();
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

export async function copySnapshotToClipboard(
  viewerRef: React.MutableRefObject<any>
): Promise<boolean> {
  try {
    const dataUrl = await captureMapSnapshot(viewerRef);
    if (!dataUrl) return false;

    const res = await fetch(dataUrl);
    const blob = await res.blob();
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob }),
    ]);
    return true;
  } catch {
    return false;
  }
}

export async function downloadSnapshot(
  viewerRef: React.MutableRefObject<any>,
  filename?: string
): Promise<void> {
  const dataUrl = await captureMapSnapshot(viewerRef);
  if (!dataUrl) return;

  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename ?? `map-snapshot-${Date.now()}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
