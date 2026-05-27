import { DemographicData, CityDemographics } from "@/types/cesium";

export const DC_DEMOGRAPHICS: CityDemographics = {
  totalPopulation: 619371,
  medianAge: 33.8,
  maleFemaleRatio: [47.3, 52.7],
  totalHouseholds: 263649,
  avgHouseholdSize: 2.2,
};

export function getDemographicsForProperty(
  propertyId: string
): DemographicData[] {
  const seed = parseInt(propertyId, 10) || 1;

  return [
    {
      radius: "1/4 mile",
      totalPopulation: 4200 + seed * 312,
      medianAge: 31.5 + (seed % 5),
      maleFemaleRatio: [48.2, 51.8],
      totalHouseholds: 2100 + seed * 156,
      avgHouseholdSize: 1.4 + (seed % 3) * 0.1,
      populationByYear: [
        { year: 2000, population: 3100 + seed * 200 },
        { year: 2010, population: 3600 + seed * 250 },
        { year: 2015, population: 3900 + seed * 280 },
        { year: 2020, population: 4200 + seed * 312 },
      ],
      populationByAge: [
        { ageGroup: "0 to 4 years", count: 36 + seed },
        { ageGroup: "5 to 9 years", count: 18 + seed },
        { ageGroup: "10 to 14 years", count: 15 + seed },
        { ageGroup: "15 to 19 years", count: 42 + seed * 2 },
        { ageGroup: "20 to 24 years", count: 180 + seed * 10 },
        { ageGroup: "25 to 34 years", count: 450 + seed * 20 },
        { ageGroup: "35 to 44 years", count: 320 + seed * 15 },
        { ageGroup: "45 to 54 years", count: 210 + seed * 8 },
        { ageGroup: "55 to 64 years", count: 160 + seed * 5 },
        { ageGroup: "65 to 74 years", count: 95 + seed * 3 },
        { ageGroup: "75+ years", count: 55 + seed * 2 },
      ],
    },
    {
      radius: "1/2 mile",
      totalPopulation: 26827 + seed * 800,
      medianAge: 33.6 + (seed % 4),
      maleFemaleRatio: [54.0, 46.0],
      totalHouseholds: 17247 + seed * 500,
      avgHouseholdSize: 1.53 + (seed % 3) * 0.05,
      populationByYear: [
        { year: 2000, population: 18500 + seed * 500 },
        { year: 2010, population: 22000 + seed * 600 },
        { year: 2015, population: 24800 + seed * 720 },
        { year: 2020, population: 26827 + seed * 800 },
      ],
      populationByAge: [
        { ageGroup: "0 to 4 years", count: 320 + seed * 5 },
        { ageGroup: "5 to 9 years", count: 180 + seed * 3 },
        { ageGroup: "10 to 14 years", count: 150 + seed * 3 },
        { ageGroup: "15 to 19 years", count: 420 + seed * 8 },
        { ageGroup: "20 to 24 years", count: 2400 + seed * 50 },
        { ageGroup: "25 to 34 years", count: 6200 + seed * 100 },
        { ageGroup: "35 to 44 years", count: 4100 + seed * 60 },
        { ageGroup: "45 to 54 years", count: 2800 + seed * 40 },
        { ageGroup: "55 to 64 years", count: 2100 + seed * 30 },
        { ageGroup: "65 to 74 years", count: 1200 + seed * 15 },
        { ageGroup: "75+ years", count: 700 + seed * 10 },
      ],
    },
    {
      radius: "1 mile",
      totalPopulation: 85000 + seed * 2500,
      medianAge: 34.2 + (seed % 3),
      maleFemaleRatio: [48.8, 51.2],
      totalHouseholds: 42000 + seed * 1200,
      avgHouseholdSize: 1.8 + (seed % 4) * 0.05,
      populationByYear: [
        { year: 2000, population: 60000 + seed * 1500 },
        { year: 2010, population: 72000 + seed * 2000 },
        { year: 2015, population: 79000 + seed * 2200 },
        { year: 2020, population: 85000 + seed * 2500 },
      ],
      populationByAge: [
        { ageGroup: "0 to 4 years", count: 1200 + seed * 20 },
        { ageGroup: "5 to 9 years", count: 900 + seed * 15 },
        { ageGroup: "10 to 14 years", count: 750 + seed * 12 },
        { ageGroup: "15 to 19 years", count: 2100 + seed * 30 },
        { ageGroup: "20 to 24 years", count: 9500 + seed * 200 },
        { ageGroup: "25 to 34 years", count: 22000 + seed * 400 },
        { ageGroup: "35 to 44 years", count: 15000 + seed * 250 },
        { ageGroup: "45 to 54 years", count: 10000 + seed * 150 },
        { ageGroup: "55 to 64 years", count: 7500 + seed * 100 },
        { ageGroup: "65 to 74 years", count: 4200 + seed * 50 },
        { ageGroup: "75+ years", count: 2500 + seed * 30 },
      ],
    },
    {
      radius: "3 mile",
      totalPopulation: 379672 + seed * 5000,
      medianAge: 33.8 + (seed % 2),
      maleFemaleRatio: [47.5, 52.5],
      totalHouseholds: 165000 + seed * 3000,
      avgHouseholdSize: 2.0 + (seed % 5) * 0.04,
      populationByYear: [
        { year: 2000, population: 280000 + seed * 3000 },
        { year: 2010, population: 330000 + seed * 4000 },
        { year: 2015, population: 360000 + seed * 4500 },
        { year: 2020, population: 379672 + seed * 5000 },
      ],
      populationByAge: [
        { ageGroup: "0 to 4 years", count: 8500 + seed * 100 },
        { ageGroup: "5 to 9 years", count: 6200 + seed * 80 },
        { ageGroup: "10 to 14 years", count: 5100 + seed * 60 },
        { ageGroup: "15 to 19 years", count: 15000 + seed * 200 },
        { ageGroup: "20 to 24 years", count: 42000 + seed * 500 },
        { ageGroup: "25 to 34 years", count: 95000 + seed * 1200 },
        { ageGroup: "35 to 44 years", count: 62000 + seed * 800 },
        { ageGroup: "45 to 54 years", count: 45000 + seed * 500 },
        { ageGroup: "55 to 64 years", count: 32000 + seed * 350 },
        { ageGroup: "65 to 74 years", count: 18000 + seed * 200 },
        { ageGroup: "75+ years", count: 12000 + seed * 150 },
      ],
    },
  ];
}
