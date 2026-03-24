'use client'

import { useState, useRef, useEffect } from 'react'

// Curated CSI MasterFormat codes relevant to construction/renovation projects
export const CSI_CODES: { code: string; label: string }[] = [
  // Division 01 – General Requirements
  { code: '01 10 00', label: 'Summary of Work' },
  { code: '01 20 00', label: 'Price & Payment Procedures' },
  { code: '01 21 00', label: 'Allowances' },
  { code: '01 22 00', label: 'Unit Prices' },
  { code: '01 23 00', label: 'Alternates' },
  { code: '01 25 00', label: 'Substitution Procedures' },
  { code: '01 26 00', label: 'Contract Modification Procedures' },
  { code: '01 29 00', label: 'Payment Procedures' },
  { code: '01 31 00', label: 'Project Management & Coordination' },
  { code: '01 32 00', label: 'Construction Progress Documentation' },
  { code: '01 33 00', label: 'Submittal Procedures' },
  { code: '01 40 00', label: 'Quality Requirements' },
  { code: '01 41 00', label: 'Regulatory Requirements' },
  { code: '01 50 00', label: 'Temporary Facilities & Controls' },
  { code: '01 51 00', label: 'Temporary Utilities' },
  { code: '01 52 00', label: 'Construction Facilities' },
  { code: '01 54 00', label: 'Construction Aids' },
  { code: '01 56 00', label: 'Temporary Barriers & Enclosures' },
  { code: '01 57 00', label: 'Temporary Controls' },
  { code: '01 58 00', label: 'Project Identification' },
  { code: '01 60 00', label: 'Product Requirements' },
  { code: '01 70 00', label: 'Execution & Closeout Requirements' },
  { code: '01 74 00', label: 'Cleaning & Waste Management' },
  { code: '01 77 00', label: 'Closeout Procedures' },
  { code: '01 78 00', label: 'Closeout Submittals' },
  { code: '01 91 00', label: 'Commissioning' },
  // Division 02 – Existing Conditions
  { code: '02 10 00', label: 'Subsurface Investigation' },
  { code: '02 20 00', label: 'Assessment' },
  { code: '02 21 00', label: 'Surveys' },
  { code: '02 30 00', label: 'Subsurface Investigation' },
  { code: '02 40 00', label: 'Demolition & Structure Moving' },
  { code: '02 41 00', label: 'Demolition' },
  { code: '02 42 00', label: 'Removal & Salvage of Construction Materials' },
  { code: '02 43 00', label: 'Structure Moving' },
  { code: '02 50 00', label: 'Site Remediation' },
  { code: '02 60 00', label: 'Contaminated Site Material Removal' },
  { code: '02 80 00', label: 'Facility Remediation' },
  // Division 03 – Concrete
  { code: '03 00 00', label: 'Concrete' },
  { code: '03 10 00', label: 'Concrete Forming & Accessories' },
  { code: '03 11 00', label: 'Concrete Forming' },
  { code: '03 20 00', label: 'Concrete Reinforcing' },
  { code: '03 30 00', label: 'Cast-in-Place Concrete' },
  { code: '03 31 00', label: 'Structural Concrete' },
  { code: '03 35 00', label: 'Concrete Finishing' },
  { code: '03 37 00', label: 'Specialty Placed Concrete' },
  { code: '03 40 00', label: 'Precast Concrete' },
  { code: '03 50 00', label: 'Cast Decks & Underlayment' },
  // Division 04 – Masonry
  { code: '04 00 00', label: 'Masonry' },
  { code: '04 20 00', label: 'Unit Masonry' },
  { code: '04 21 00', label: 'Clay Unit Masonry' },
  { code: '04 22 00', label: 'Concrete Unit Masonry' },
  { code: '04 40 00', label: 'Stone Assemblies' },
  { code: '04 43 00', label: 'Stone Masonry' },
  { code: '04 70 00', label: 'Manufactured Masonry' },
  // Division 05 – Metals
  { code: '05 00 00', label: 'Metals' },
  { code: '05 10 00', label: 'Structural Metal Framing' },
  { code: '05 12 00', label: 'Structural Steel Framing' },
  { code: '05 20 00', label: 'Metal Joists' },
  { code: '05 30 00', label: 'Metal Decking' },
  { code: '05 40 00', label: 'Cold-Formed Metal Framing' },
  { code: '05 50 00', label: 'Metal Fabrications' },
  { code: '05 51 00', label: 'Metal Stairs' },
  { code: '05 52 00', label: 'Metal Railings' },
  { code: '05 73 00', label: 'Decorative Metal Railings' },
  // Division 06 – Wood, Plastics & Composites
  { code: '06 00 00', label: 'Wood, Plastics & Composites' },
  { code: '06 10 00', label: 'Rough Carpentry' },
  { code: '06 11 00', label: 'Wood Framing' },
  { code: '06 15 00', label: 'Wood Decking' },
  { code: '06 16 00', label: 'Sheathing' },
  { code: '06 17 00', label: 'Shop-Fabricated Structural Wood' },
  { code: '06 18 00', label: 'Glued-Laminated Construction' },
  { code: '06 20 00', label: 'Finish Carpentry' },
  { code: '06 22 00', label: 'Millwork' },
  { code: '06 40 00', label: 'Architectural Woodwork' },
  { code: '06 41 00', label: 'Architectural Wood Casework' },
  { code: '06 42 00', label: 'Wood Paneling' },
  { code: '06 43 00', label: 'Wood Stairs & Railings' },
  // Division 07 – Thermal & Moisture Protection
  { code: '07 00 00', label: 'Thermal & Moisture Protection' },
  { code: '07 10 00', label: 'Dampproofing & Waterproofing' },
  { code: '07 11 00', label: 'Dampproofing' },
  { code: '07 13 00', label: 'Sheet Waterproofing' },
  { code: '07 14 00', label: 'Fluid-Applied Waterproofing' },
  { code: '07 20 00', label: 'Thermal Protection' },
  { code: '07 21 00', label: 'Thermal Insulation' },
  { code: '07 24 00', label: 'Exterior Insulation & Finish Systems (EIFS)' },
  { code: '07 25 00', label: 'Weather Barriers' },
  { code: '07 30 00', label: 'Steep Slope Roofing' },
  { code: '07 31 00', label: 'Shingles & Shakes' },
  { code: '07 32 00', label: 'Roof Tiles' },
  { code: '07 40 00', label: 'Roofing & Siding Panels' },
  { code: '07 41 00', label: 'Roof Panels' },
  { code: '07 42 00', label: 'Wall Panels' },
  { code: '07 50 00', label: 'Membrane Roofing' },
  { code: '07 51 00', label: 'Built-Up Bituminous Roofing' },
  { code: '07 52 00', label: 'Modified Bituminous Membrane Roofing' },
  { code: '07 53 00', label: 'Elastomeric Membrane Roofing' },
  { code: '07 54 00', label: 'Thermoplastic Membrane Roofing' },
  { code: '07 60 00', label: 'Flashing & Sheet Metal' },
  { code: '07 70 00', label: 'Roof & Wall Specialties & Accessories' },
  { code: '07 72 00', label: 'Roof Accessories' },
  { code: '07 80 00', label: 'Fire & Smoke Protection' },
  { code: '07 84 00', label: 'Firestopping' },
  { code: '07 90 00', label: 'Joint Protection' },
  { code: '07 92 00', label: 'Joint Sealants' },
  // Division 08 – Openings
  { code: '08 00 00', label: 'Openings' },
  { code: '08 10 00', label: 'Doors & Frames' },
  { code: '08 11 00', label: 'Metal Doors & Frames' },
  { code: '08 14 00', label: 'Wood Doors' },
  { code: '08 16 00', label: 'Composite Doors' },
  { code: '08 17 00', label: 'Integrated Door Opening Assemblies' },
  { code: '08 30 00', label: 'Specialty Doors & Frames' },
  { code: '08 31 00', label: 'Access Doors & Panels' },
  { code: '08 33 00', label: 'Coiling Doors & Grilles' },
  { code: '08 36 00', label: 'Panel Doors' },
  { code: '08 38 00', label: 'Traffic Doors' },
  { code: '08 40 00', label: 'Entrances, Storefronts & Curtain Walls' },
  { code: '08 41 00', label: 'Entrances & Storefronts' },
  { code: '08 44 00', label: 'Curtain Wall & Glazed Assemblies' },
  { code: '08 50 00', label: 'Windows' },
  { code: '08 51 00', label: 'Metal Windows' },
  { code: '08 52 00', label: 'Wood Windows' },
  { code: '08 55 00', label: 'Pressure-Resistant Windows' },
  { code: '08 60 00', label: 'Roof Windows & Skylights' },
  { code: '08 70 00', label: 'Hardware' },
  { code: '08 71 00', label: 'Door Hardware' },
  { code: '08 74 00', label: 'Access Control Hardware' },
  { code: '08 80 00', label: 'Glazing' },
  { code: '08 81 00', label: 'Glass Glazing' },
  { code: '08 83 00', label: 'Mirrors' },
  // Division 09 – Finishes
  { code: '09 00 00', label: 'Finishes' },
  { code: '09 20 00', label: 'Plaster & Gypsum Board' },
  { code: '09 21 00', label: 'Gypsum Board Assemblies' },
  { code: '09 22 00', label: 'Supports for Plaster & Gypsum Board' },
  { code: '09 24 00', label: 'Cement Plastering' },
  { code: '09 25 00', label: 'Other Plastering' },
  { code: '09 26 00', label: 'Veneer Plastering' },
  { code: '09 29 00', label: 'Gypsum Board' },
  { code: '09 30 00', label: 'Tiling' },
  { code: '09 31 00', label: 'Ceramic Tiling' },
  { code: '09 32 00', label: 'Glass Tiling' },
  { code: '09 33 00', label: 'Conductive Flooring' },
  { code: '09 35 00', label: 'Chemical-Resistant Tiling' },
  { code: '09 50 00', label: 'Ceilings' },
  { code: '09 51 00', label: 'Acoustical Ceilings' },
  { code: '09 53 00', label: 'Acoustical Ceiling Suspension Assemblies' },
  { code: '09 54 00', label: 'Specialty Ceilings' },
  { code: '09 57 00', label: 'Special Function Ceilings' },
  { code: '09 58 00', label: 'Integrated Ceiling Assemblies' },
  { code: '09 60 00', label: 'Flooring' },
  { code: '09 61 00', label: 'Flooring Treatment' },
  { code: '09 62 00', label: 'Specialty Flooring' },
  { code: '09 63 00', label: 'Masonry Flooring' },
  { code: '09 64 00', label: 'Wood Flooring' },
  { code: '09 65 00', label: 'Resilient Flooring' },
  { code: '09 66 00', label: 'Terrazzo Flooring' },
  { code: '09 68 00', label: 'Carpeting' },
  { code: '09 69 00', label: 'Access Flooring' },
  { code: '09 70 00', label: 'Wall Finishes' },
  { code: '09 72 00', label: 'Wall Coverings' },
  { code: '09 74 00', label: 'Flexible Wood Sheets' },
  { code: '09 77 00', label: 'Special Wall Surfacing' },
  { code: '09 80 00', label: 'Acoustic Treatment' },
  { code: '09 90 00', label: 'Paints & Coatings' },
  { code: '09 91 00', label: 'Painting' },
  { code: '09 93 00', label: 'Staining & Transparent Finishing' },
  { code: '09 96 00', label: 'High-Performance Coatings' },
  // Division 10 – Specialties
  { code: '10 00 00', label: 'Specialties' },
  { code: '10 10 00', label: 'Information Specialties' },
  { code: '10 11 00', label: 'Visual Display Units' },
  { code: '10 14 00', label: 'Signage' },
  { code: '10 20 00', label: 'Interior Specialties' },
  { code: '10 21 00', label: 'Compartments & Cubicles' },
  { code: '10 22 00', label: 'Partitions' },
  { code: '10 26 00', label: 'Wall & Door Protection' },
  { code: '10 28 00', label: 'Toilet, Bath & Laundry Accessories' },
  { code: '10 30 00', label: 'Fireplaces & Stoves' },
  { code: '10 31 00', label: 'Manufactured Fireplaces' },
  { code: '10 44 00', label: 'Fire Protection Specialties' },
  { code: '10 51 00', label: 'Lockers' },
  { code: '10 56 00', label: 'Storage Assemblies' },
  { code: '10 57 00', label: 'Wardrobe & Closet Specialties' },
  { code: '10 70 00', label: 'Exterior Specialties' },
  { code: '10 71 00', label: 'Exterior Protection' },
  { code: '10 73 00', label: 'Protective Covers' },
  { code: '10 75 00', label: 'Flagpoles' },
  // Division 11 – Equipment
  { code: '11 00 00', label: 'Equipment' },
  { code: '11 11 00', label: 'Vehicle & Pedestrian Equipment' },
  { code: '11 12 00', label: 'Parking Control Equipment' },
  { code: '11 13 00', label: 'Loading Dock Equipment' },
  { code: '11 19 00', label: 'Detention Equipment' },
  { code: '11 20 00', label: 'Commercial Equipment' },
  { code: '11 23 00', label: 'Commercial Laundry & Dry Cleaning Equipment' },
  { code: '11 24 00', label: 'Hospitality Equipment' },
  { code: '11 25 00', label: 'Warewashing & Disposal Equipment' },
  { code: '11 26 00', label: 'Unit Kitchens' },
  { code: '11 30 00', label: 'Residential Equipment' },
  { code: '11 31 00', label: 'Residential Appliances' },
  { code: '11 40 00', label: 'Foodservice Equipment' },
  { code: '11 41 00', label: 'Foodservice Storage Equipment' },
  { code: '11 42 00', label: 'Food Preparation Equipment' },
  { code: '11 43 00', label: 'Food Delivery Carts & Conveyors' },
  { code: '11 44 00', label: 'Food Cooking Equipment' },
  { code: '11 46 00', label: 'Food Dispensing Equipment' },
  { code: '11 47 00', label: 'Ice Machines' },
  { code: '11 48 00', label: 'Cleaning & Disposal Equipment' },
  { code: '11 52 00', label: 'Audio-Visual Equipment' },
  { code: '11 53 00', label: 'Laboratory Equipment' },
  { code: '11 61 00', label: 'Theater & Stage Equipment' },
  { code: '11 62 00', label: 'Athletic & Recreational Equipment' },
  { code: '11 66 00', label: 'Athletic Equipment' },
  { code: '11 68 00', label: 'Play Field Equipment & Structures' },
  { code: '11 71 00', label: 'Medical Sterilizing Equipment' },
  { code: '11 82 00', label: 'Solid Waste Handling Equipment' },
  // Division 12 – Furnishings
  { code: '12 00 00', label: 'Furnishings' },
  { code: '12 05 00', label: 'Common Work Results for Furnishings' },
  { code: '12 10 00', label: 'Art' },
  { code: '12 20 00', label: 'Window Treatments' },
  { code: '12 21 00', label: 'Window Blinds' },
  { code: '12 22 00', label: 'Curtains & Drapes' },
  { code: '12 24 00', label: 'Window Shades' },
  { code: '12 30 00', label: 'Casework' },
  { code: '12 31 00', label: 'Manufactured Metal Casework' },
  { code: '12 32 00', label: 'Manufactured Wood Casework' },
  { code: '12 34 00', label: 'Manufactured Plastic Casework' },
  { code: '12 35 00', label: 'Specialty Casework' },
  { code: '12 36 00', label: 'Countertops' },
  { code: '12 40 00', label: 'Furnishings & Accessories' },
  { code: '12 41 00', label: 'Decorative Furnishings' },
  { code: '12 42 00', label: 'Furnishing Accessories' },
  { code: '12 43 00', label: 'Portable Lamps' },
  { code: '12 44 00', label: 'Rugs & Mats' },
  { code: '12 46 00', label: 'Furnishing Accessories' },
  { code: '12 48 00', label: 'Rugs & Mats' },
  { code: '12 50 00', label: 'Furniture' },
  { code: '12 51 00', label: 'Office Furniture' },
  { code: '12 52 00', label: 'Seating' },
  { code: '12 53 00', label: 'Retail Furniture' },
  { code: '12 54 00', label: 'Hospitality Furniture' },
  { code: '12 55 00', label: 'Residential Furniture' },
  { code: '12 56 00', label: 'Institutional Furniture' },
  { code: '12 57 00', label: 'Industrial & Commercial Furniture' },
  { code: '12 60 00', label: 'Multiple Seating' },
  { code: '12 61 00', label: 'Fixed Audience Seating' },
  { code: '12 63 00', label: 'Stadium & Arena Seating' },
  { code: '12 66 00', label: 'Telescoping Stands' },
  { code: '12 67 00', label: 'Pews & Benches' },
  { code: '12 92 00', label: 'Interior Plants & Planters' },
  { code: '12 93 00', label: 'Site Furnishings' },
  { code: '12 93 13', label: 'Bicycle Racks' },
  { code: '12 93 43', label: 'Site Seating & Tables' },
  // Division 13 – Special Construction
  { code: '13 00 00', label: 'Special Construction' },
  { code: '13 10 00', label: 'Special Facility Components' },
  { code: '13 11 00', label: 'Swimming Pools' },
  { code: '13 12 00', label: 'Fountains' },
  { code: '13 13 00', label: 'Hot Tubs & Spas' },
  { code: '13 17 00', label: 'Tubs & Pools' },
  { code: '13 18 00', label: 'Ice Rinks' },
  { code: '13 30 00', label: 'Special Structures' },
  { code: '13 31 00', label: 'Fabric Structures' },
  { code: '13 32 00', label: 'Space Frame Structures' },
  { code: '13 34 00', label: 'Fabricated Engineered Structures' },
  // Division 14 – Conveying Equipment
  { code: '14 00 00', label: 'Conveying Equipment' },
  { code: '14 20 00', label: 'Elevators' },
  { code: '14 21 00', label: 'Electric Traction Elevators' },
  { code: '14 24 00', label: 'Hydraulic Elevators' },
  { code: '14 30 00', label: 'Escalators & Moving Walks' },
  { code: '14 40 00', label: 'Lifts' },
  // Division 21 – Fire Suppression
  { code: '21 00 00', label: 'Fire Suppression' },
  { code: '21 10 00', label: 'Water-Based Fire-Suppression Systems' },
  { code: '21 12 00', label: 'Fire-Suppression Standpipes' },
  { code: '21 13 00', label: 'Wet-Pipe Sprinkler Systems' },
  { code: '21 14 00', label: 'Dry-Pipe Sprinkler Systems' },
  // Division 22 – Plumbing
  { code: '22 00 00', label: 'Plumbing' },
  { code: '22 05 00', label: 'Common Work Results for Plumbing' },
  { code: '22 07 00', label: 'Plumbing Insulation' },
  { code: '22 10 00', label: 'Plumbing Piping & Pumps' },
  { code: '22 11 00', label: 'Facility Water Distribution' },
  { code: '22 13 00', label: 'Facility Sanitary Sewerage' },
  { code: '22 14 00', label: 'Facility Storm Drainage' },
  { code: '22 30 00', label: 'Plumbing Equipment' },
  { code: '22 31 00', label: 'Domestic Water Softeners' },
  { code: '22 33 00', label: 'Electric Domestic Water Heaters' },
  { code: '22 34 00', label: 'Fuel-Fired Domestic Water Heaters' },
  { code: '22 40 00', label: 'Plumbing Fixtures' },
  { code: '22 41 00', label: 'Residential Plumbing Fixtures' },
  { code: '22 42 00', label: 'Commercial Plumbing Fixtures' },
  { code: '22 45 00', label: 'Emergency Plumbing Fixtures' },
  { code: '22 47 00', label: 'Drinking Fountains & Water Coolers' },
  // Division 23 – HVAC
  { code: '23 00 00', label: 'Heating, Ventilating & Air-Conditioning (HVAC)' },
  { code: '23 05 00', label: 'Common Work Results for HVAC' },
  { code: '23 07 00', label: 'HVAC Insulation' },
  { code: '23 09 00', label: 'Instrumentation & Control for HVAC' },
  { code: '23 11 00', label: 'Facility Fuel Systems' },
  { code: '23 20 00', label: 'HVAC Piping & Pumps' },
  { code: '23 21 00', label: 'Hydronic Piping & Pumps' },
  { code: '23 22 00', label: 'Steam & Condensate Piping & Pumps' },
  { code: '23 23 00', label: 'Refrigerant Piping' },
  { code: '23 25 00', label: 'HVAC Water Treatment' },
  { code: '23 30 00', label: 'HVAC Air Distribution' },
  { code: '23 31 00', label: 'HVAC Ducts & Casings' },
  { code: '23 33 00', label: 'Air Duct Accessories' },
  { code: '23 34 00', label: 'HVAC Fans' },
  { code: '23 36 00', label: 'Air Terminal Units' },
  { code: '23 37 00', label: 'Air Outlets & Inlets' },
  { code: '23 40 00', label: 'HVAC Air Cleaning Devices' },
  { code: '23 41 00', label: 'Particulate Air Filtration' },
  { code: '23 50 00', label: 'Central Heating Equipment' },
  { code: '23 51 00', label: 'Breechings, Chimneys & Stacks' },
  { code: '23 52 00', label: 'Heating Boilers' },
  { code: '23 54 00', label: 'Furnaces' },
  { code: '23 55 00', label: 'Fuel-Fired Heaters' },
  { code: '23 60 00', label: 'Central Cooling Equipment' },
  { code: '23 61 00', label: 'Refrigerant Compressors' },
  { code: '23 62 00', label: 'Packaged Compressor & Condenser Units' },
  { code: '23 64 00', label: 'Packaged Water Chillers' },
  { code: '23 65 00', label: 'Cooling Towers' },
  { code: '23 70 00', label: 'Central HVAC Equipment' },
  { code: '23 72 00', label: 'Air-to-Air Energy Recovery Equipment' },
  { code: '23 73 00', label: 'Indoor Central-Station Air-Handling Units' },
  { code: '23 74 00', label: 'Packaged Outdoor HVAC Equipment' },
  { code: '23 75 00', label: 'Custom-Packaged Outdoor HVAC Equipment' },
  { code: '23 81 00', label: 'Decentralized Unitary HVAC Equipment' },
  { code: '23 82 00', label: 'Convection Heating & Cooling Units' },
  // Division 25 – Integrated Automation
  { code: '25 00 00', label: 'Integrated Automation' },
  { code: '25 10 00', label: 'Integrated Automation Network Equipment' },
  { code: '25 50 00', label: 'Integrated Automation Facility Controls' },
  // Division 26 – Electrical
  { code: '26 00 00', label: 'Electrical' },
  { code: '26 05 00', label: 'Common Work Results for Electrical' },
  { code: '26 05 19', label: 'Low-Voltage Electrical Power Conductors & Cables' },
  { code: '26 05 26', label: 'Grounding & Bonding for Electrical Systems' },
  { code: '26 05 29', label: 'Hangers & Supports for Electrical Systems' },
  { code: '26 05 33', label: 'Raceway & Boxes for Electrical Systems' },
  { code: '26 05 43', label: 'Underground Ducts & Raceways for Electrical Systems' },
  { code: '26 05 53', label: 'Identification for Electrical Systems' },
  { code: '26 06 00', label: 'Schedules for Electrical' },
  { code: '26 07 00', label: 'Electrical Insulation' },
  { code: '26 09 00', label: 'Instrumentation & Control for Electrical Systems' },
  { code: '26 09 23', label: 'Lighting Control Devices' },
  { code: '26 11 00', label: 'Substations' },
  { code: '26 12 00', label: 'Medium-Voltage Transformers' },
  { code: '26 13 00', label: 'Medium-Voltage Switchgear' },
  { code: '26 18 00', label: 'Medium-Voltage Circuit Protection Devices' },
  { code: '26 20 00', label: 'Low-Voltage Electrical Transmission' },
  { code: '26 22 00', label: 'Low-Voltage Transformers' },
  { code: '26 23 00', label: 'Low-Voltage Switchgear' },
  { code: '26 24 00', label: 'Switchboards, Panelboards & Load Centers' },
  { code: '26 25 00', label: 'Enclosed Bus Assemblies' },
  { code: '26 27 00', label: 'Low-Voltage Distribution Equipment' },
  { code: '26 28 00', label: 'Low-Voltage Circuit Protective Devices' },
  { code: '26 29 00', label: 'Low-Voltage Controllers' },
  { code: '26 32 00', label: 'Packaged Generator Assemblies' },
  { code: '26 33 00', label: 'Battery Equipment' },
  { code: '26 35 00', label: 'Power Filters & Conditioners' },
  { code: '26 36 00', label: 'Transfer Switches' },
  { code: '26 40 00', label: 'Electrical & Cathodic Protection' },
  { code: '26 41 00', label: 'Lightning Protection' },
  { code: '26 43 00', label: 'Transient Voltage Suppression' },
  { code: '26 50 00', label: 'Lighting' },
  { code: '26 51 00', label: 'Interior Lighting' },
  { code: '26 52 00', label: 'Emergency Lighting' },
  { code: '26 53 00', label: 'Exit Signs' },
  { code: '26 54 00', label: 'Classified Location Lighting' },
  { code: '26 55 00', label: 'Special Purpose Lighting' },
  { code: '26 56 00', label: 'Exterior Lighting' },
  // Division 27 – Communications
  { code: '27 00 00', label: 'Communications' },
  { code: '27 05 00', label: 'Common Work Results for Communications' },
  { code: '27 08 00', label: 'Commissioning of Communications' },
  { code: '27 10 00', label: 'Structured Cabling' },
  { code: '27 11 00', label: 'Communications Equipment Room Fittings' },
  { code: '27 13 00', label: 'Communications Backbone Cabling' },
  { code: '27 15 00', label: 'Communications Horizontal Cabling' },
  { code: '27 16 00', label: 'Communications Connecting Hardware' },
  { code: '27 20 00', label: 'Data Communications' },
  { code: '27 21 00', label: 'Data Communications Network Equipment' },
  { code: '27 22 00', label: 'Data Communications Hardware' },
  { code: '27 30 00', label: 'Voice Communications' },
  { code: '27 31 00', label: 'Voice Communications Switching & Routing Equipment' },
  { code: '27 32 00', label: 'Voice Communications Terminal Equipment' },
  { code: '27 40 00', label: 'Audio-Video Communications' },
  { code: '27 41 00', label: 'Audio-Video Systems' },
  { code: '27 41 16', label: 'Integrated Audio-Video Systems' },
  { code: '27 42 00', label: 'Electronic Digital Systems' },
  { code: '27 51 00', label: 'Distributed Audio-Video Communications Systems' },
  { code: '27 52 00', label: 'Healthcare Communications & Monitoring Systems' },
  { code: '27 53 00', label: 'Distributed Systems' },
  // Division 28 – Electronic Safety & Security
  { code: '28 00 00', label: 'Electronic Safety & Security' },
  { code: '28 05 00', label: 'Common Work Results for Electronic Safety & Security' },
  { code: '28 10 00', label: 'Electronic Access Control & Intrusion Detection' },
  { code: '28 13 00', label: 'Access Control' },
  { code: '28 16 00', label: 'Intrusion Detection' },
  { code: '28 20 00', label: 'Electronic Surveillance' },
  { code: '28 23 00', label: 'Video Surveillance' },
  { code: '28 26 00', label: 'Electronic Personal Protection Systems' },
  { code: '28 30 00', label: 'Electronic Detection & Alarm' },
  { code: '28 31 00', label: 'Fire Detection & Alarm' },
  { code: '28 32 00', label: 'Radiation Detection & Alarm' },
  { code: '28 33 00', label: 'Fuel-Gas Detection & Alarm' },
  { code: '28 34 00', label: 'Carbon-Monoxide Detection & Alarm' },
  // Division 31 – Earthwork
  { code: '31 00 00', label: 'Earthwork' },
  { code: '31 10 00', label: 'Site Clearing' },
  { code: '31 11 00', label: 'Clearing & Grubbing' },
  { code: '31 12 00', label: 'Selective Clearing' },
  { code: '31 13 00', label: 'Selective Tree & Shrub Removal & Trimming' },
  { code: '31 20 00', label: 'Earth Moving' },
  { code: '31 22 00', label: 'Grading' },
  { code: '31 23 00', label: 'Excavation & Fill' },
  { code: '31 24 00', label: 'Embankments' },
  { code: '31 25 00', label: 'Erosion & Sedimentation Controls' },
  { code: '31 30 00', label: 'Earthwork Methods' },
  { code: '31 31 00', label: 'Soil Treatment' },
  { code: '31 32 00', label: 'Soil Stabilization' },
  { code: '31 35 00', label: 'Slope Protection' },
  { code: '31 40 00', label: 'Shoring & Underpinning' },
  { code: '31 50 00', label: 'Excavation Support & Protection' },
  { code: '31 60 00', label: 'Special Foundations & Load-Bearing Elements' },
  { code: '31 62 00', label: 'Driven Piles' },
  { code: '31 63 00', label: 'Bored Piles' },
  { code: '31 66 00', label: 'Special Foundations' },
  { code: '31 68 00', label: 'Vibration Controls' },
  // Division 32 – Exterior Improvements
  { code: '32 00 00', label: 'Exterior Improvements' },
  { code: '32 10 00', label: 'Bases, Ballasts & Paving' },
  { code: '32 11 00', label: 'Base Courses' },
  { code: '32 12 00', label: 'Flexible Paving' },
  { code: '32 13 00', label: 'Rigid Paving' },
  { code: '32 14 00', label: 'Unit Paving' },
  { code: '32 15 00', label: 'Aggregate Surfacing' },
  { code: '32 16 00', label: 'Curbs & Gutters' },
  { code: '32 17 00', label: 'Paving Specialties' },
  { code: '32 18 00', label: 'Athletic & Recreational Surfacing' },
  { code: '32 30 00', label: 'Site Improvements' },
  { code: '32 31 00', label: 'Fences & Gates' },
  { code: '32 32 00', label: 'Retaining Walls' },
  { code: '32 33 00', label: 'Site Furnishings' },
  { code: '32 34 00', label: 'Fabricated Bridges' },
  { code: '32 35 00', label: 'Screening Devices' },
  { code: '32 36 00', label: 'Gabions' },
  { code: '32 37 00', label: 'Riprap' },
  { code: '32 39 00', label: 'Constructed Ponds & Reservoirs' },
  { code: '32 40 00', label: 'Irrigation Systems' },
  { code: '32 41 00', label: 'Hydraulic Systems & Equipment' },
  { code: '32 43 00', label: 'Drip & Bubbler Irrigation' },
  { code: '32 44 00', label: 'Sprinkler Irrigation' },
  { code: '32 80 00', label: 'Irrigation' },
  { code: '32 84 00', label: 'Planting Irrigation' },
  { code: '32 90 00', label: 'Planting' },
  { code: '32 91 00', label: 'Planting Preparation' },
  { code: '32 92 00', label: 'Turf & Grasses' },
  { code: '32 93 00', label: 'Plants' },
  { code: '32 94 00', label: 'Planting Accessories' },
  { code: '32 96 00', label: 'Transplanting' },
  // Division 33 – Utilities
  { code: '33 00 00', label: 'Utilities' },
  { code: '33 10 00', label: 'Water Utilities' },
  { code: '33 11 00', label: 'Water Utility Distribution Piping' },
  { code: '33 12 00', label: 'Water Utility Distribution Equipment' },
  { code: '33 13 00', label: 'Disinfecting of Water Utility Distribution' },
  { code: '33 30 00', label: 'Sanitary Sewerage Utilities' },
  { code: '33 31 00', label: 'Sanitary Utility Sewerage Piping' },
  { code: '33 32 00', label: 'Wastewater Utility Pumping Stations' },
  { code: '33 36 00', label: 'Utility Septic Tanks' },
  { code: '33 40 00', label: 'Storm Drainage Utilities' },
  { code: '33 41 00', label: 'Storm Utility Drainage Piping' },
  { code: '33 42 00', label: 'Culverts' },
  { code: '33 44 00', label: 'Storm Utility Water Drains' },
  { code: '33 46 00', label: 'Subdrainage' },
  { code: '33 49 00', label: 'Storm Drainage Structures' },
  { code: '33 50 00', label: 'Fuel Distribution Utilities' },
  { code: '33 51 00', label: 'Natural-Gas Distribution' },
  { code: '33 56 00', label: 'Fuel-Storage Tanks' },
  { code: '33 70 00', label: 'Electrical Utilities' },
  { code: '33 71 00', label: 'Electrical Utility Transmission & Distribution' },
  { code: '33 73 00', label: 'Utility Transformers' },
  { code: '33 75 00', label: 'High-Voltage Switchgear & Protection' },
  { code: '33 77 00', label: 'Medium-Voltage Utility Switching & Protection' },
  { code: '33 79 00', label: 'Site Grounding' },
  { code: '33 80 00', label: 'Communications Utilities' },
  { code: '33 81 00', label: 'Communications Structures' },
  { code: '33 82 00', label: 'Communications Distribution' },
]

// Map from internal category labels → suggested CSI code
export const CATEGORY_TO_CSI: Record<string, string> = {
  'Site Work': '31 00 00',
  'Foundation & Structure': '03 00 00',
  'Exterior': '07 00 00',
  'Interior Finishes': '09 00 00',
  'MEP': '22 00 00',
  'FF&E': '12 00 00',
  'Kitchen Equipment': '11 40 00',
  'Technology & AV': '27 00 00',
  'Permits & Fees': '01 10 00',
  'Soft Costs': '01 20 00',
  'Contingency': '01 21 00',
  'General Conditions': '01 50 00',
}

interface Props {
  value: string
  onChange: (code: string) => void
  placeholder?: string
}

export function CsiCombobox({ value, onChange, placeholder = 'Search CSI code or description…' }: Props) {
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Keep input in sync when value changes externally
  useEffect(() => {
    if (!open) {
      const found = CSI_CODES.find((c) => c.code === value)
      setQuery(value ? (found ? `${found.code} – ${found.label}` : value) : '')
    }
  }, [value, open])

  const filtered = query.trim() === '' || open === false
    ? []
    : CSI_CODES.filter((c) => {
        const q = query.toLowerCase()
        return c.code.toLowerCase().includes(q) || c.label.toLowerCase().includes(q)
      }).slice(0, 30)

  const select = (code: string) => {
    onChange(code)
    const found = CSI_CODES.find((c) => c.code === code)
    setQuery(found ? `${found.code} – ${found.label}` : code)
    setOpen(false)
  }

  const clear = () => {
    onChange('')
    setQuery('')
    setOpen(false)
  }

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        inputRef.current && !inputRef.current.contains(e.target as Node) &&
        listRef.current && !listRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
        // Reset display to current value
        const found = CSI_CODES.find((c) => c.code === value)
        setQuery(value ? (found ? `${found.code} – ${found.label}` : value) : '')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [value])

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 pr-7"
        />
        {value && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {open && filtered.length > 0 && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-md border bg-popover shadow-md"
        >
          {filtered.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => select(c.code)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex items-baseline gap-2"
            >
              <span className="font-mono text-xs text-muted-foreground shrink-0">{c.code}</span>
              <span className="truncate">{c.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
