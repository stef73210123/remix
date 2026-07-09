/**
 * Town of North Castle budget data for the financial-analysis panel.
 *
 * REAL figures, parsed from the Town of North Castle 2025 Annual Comprehensive
 * Financial Report (ACFR/AUD, year ended 12/31/2025). Three views:
 *   - "All funds · FY2025": all governmental funds combined (actual), every
 *     revenue source and expenditure function drilling down by fund.
 *   - "General Fund · FY2025" / "· FY2024": the town's main operating fund,
 *     with real year-over-year change (FY2025 vs FY2024 actual).
 *
 * A budget year holds two ranked lists of line items — revenue and expenditure
 * — each optionally split into `children`. The Sankey view is derived from the
 * selected year on the fly (see `yearToSankey`). Values are whole dollars.
 *
 * The adopted FY2026 budget the town provided is a scanned PDF with no text
 * layer, so it is not yet included; a text version (or the summary schedule)
 * would drop straight in as another BudgetYear.
 */

export interface BudgetChild {
  label: string
  value: number
}
export interface BudgetLine {
  /** Stable id — matches a line across years for year-over-year change. */
  id: string
  label: string
  color: string | null
  value: number
  children?: BudgetChild[]
}
export interface BudgetYear {
  /** Unique key for the year toggle. */
  key: string
  /** Toggle label, e.g. "General Fund · FY2025". */
  label: string
  fiscalYear: string
  /** "All governmental funds" | "General Fund" — YoY compares within a scope. */
  scope: string
  status: string
  revenue: BudgetLine[]
  expense: BudgetLine[]
  totalRevenue: number
  totalExpenditure: number
  note?: string
}
export interface TownBudget {
  townKey: string
  townName: string
  /** True only while any figure is a placeholder rather than the real budget. */
  placeholder: boolean
  sourceNote: string
  years: BudgetYear[]
}

// ── Sankey adapter ────────────────────────────────────────────────────────
export interface BudgetNode {
  id: string
  label: string
  layer: number
  parent?: string
  color: string | null
}
export interface BudgetLink {
  source: string
  target: string
  value: number
}

/** Build the revenue → total → spending Sankey graph for one fiscal year.
 *  Expenditure children become layer-3 drill-down; revenue children surface in
 *  the revenue breakdown list instead. */
export function yearToSankey(y: BudgetYear): { nodes: BudgetNode[]; links: BudgetLink[] } {
  const nodes: BudgetNode[] = [{ id: 'total', label: 'Total', layer: 1, color: null }]
  const links: BudgetLink[] = []
  for (const r of y.revenue) {
    nodes.push({ id: `rev_${r.id}`, label: r.label, layer: 0, color: r.color })
    links.push({ source: `rev_${r.id}`, target: 'total', value: r.value })
  }
  for (const e of y.expense) {
    nodes.push({ id: `exp_${e.id}`, label: e.label, layer: 2, color: e.color })
    links.push({ source: 'total', target: `exp_${e.id}`, value: e.value })
    ;(e.children || []).forEach((c, i) => {
      const cid = `exp_${e.id}__${i}`
      nodes.push({ id: cid, label: c.label, layer: 3, parent: `exp_${e.id}`, color: e.color })
      links.push({ source: `exp_${e.id}`, target: cid, value: c.value })
    })
  }
  return { nodes, links }
}

const NORTH_CASTLE: TownBudget = {
  townKey: 'nc',
  townName: 'Town of North Castle',
  placeholder: false,
  sourceNote:
    'Source: Town of North Castle 2025 Annual Comprehensive Financial Report (year ended 12/31/2025) — Statement of Revenues, Expenditures and Changes in Fund Balance (all governmental funds) and the General Fund comparative schedule. Figures are actuals; the FY2026 adopted budget provided as a scanned PDF is not yet machine-readable and is pending.',
  years: [
    {
      key: "allfunds-2025",
      label: "All funds \u00b7 FY2025",
      fiscalYear: "2025",
      scope: "All governmental funds",
      status: "actual (ACFR)",
      revenue: [
        {
          id: "x_real_property_taxes",
          label: "Real property taxes",
          color: "#12a6b8",
          value: 24366519,
          children: [
            {
              label: "General Fund",
              value: 12183504
            },
            {
              label: "Highway Fund",
              value: 7295300
            },
            {
              label: "Public Library Fund",
              value: 1739125
            },
            {
              label: "Special Districts",
              value: 3148590
            }
          ]
        },
        {
          id: "x_other_tax_items",
          label: "Other tax items",
          color: "#12a6b8",
          value: 1232753
        },
        {
          id: "x_nonproperty_tax_items",
          label: "Nonproperty tax items",
          color: "#12a6b8",
          value: 3746111
        },
        {
          id: "x_departmental_income",
          label: "Departmental income",
          color: "#12a6b8",
          value: 3626757,
          children: [
            {
              label: "General Fund",
              value: 2159945
            },
            {
              label: "Public Library Fund",
              value: 1106
            },
            {
              label: "Special Districts",
              value: 1465706
            }
          ]
        },
        {
          id: "x_intergovernmental_charges",
          label: "Intergovernmental charges",
          color: "#12a6b8",
          value: 40079
        },
        {
          id: "x_use_of_money_and_property",
          label: "Use of money and property",
          color: "#12a6b8",
          value: 2458582,
          children: [
            {
              label: "General Fund",
              value: 2144242
            },
            {
              label: "Public Library Fund",
              value: 13820
            },
            {
              label: "Special Districts",
              value: 300520
            }
          ]
        },
        {
          id: "x_licenses_and_permits",
          label: "Licenses and permits",
          color: "#12a6b8",
          value: 1717560
        },
        {
          id: "x_fines_and_forfeitures",
          label: "Fines and forfeitures",
          color: "#12a6b8",
          value: 115075
        },
        {
          id: "x_sale_of_property_and_compensation_for_loss",
          label: "Sale of property and compensation for loss",
          color: "#12a6b8",
          value: 181355,
          children: [
            {
              label: "General Fund",
              value: 71390
            },
            {
              label: "Highway Fund",
              value: 99314
            },
            {
              label: "Public Library Fund",
              value: 651
            },
            {
              label: "Special Districts",
              value: 10000
            }
          ]
        },
        {
          id: "x_state_aid",
          label: "State aid",
          color: "#12a6b8",
          value: 1488065,
          children: [
            {
              label: "General Fund",
              value: 1029769
            },
            {
              label: "Highway Fund",
              value: 450721
            },
            {
              label: "Public Library Fund",
              value: 7575
            }
          ]
        },
        {
          id: "x_federal_aid",
          label: "Federal aid",
          color: "#12a6b8",
          value: 374254
        },
        {
          id: "x_miscellaneous",
          label: "Miscellaneous",
          color: "#12a6b8",
          value: 363607,
          children: [
            {
              label: "General Fund",
              value: 363154
            },
            {
              label: "Highway Fund",
              value: 20
            },
            {
              label: "Public Library Fund",
              value: 433
            }
          ]
        }
      ],
      expense: [
        {
          id: "x_general_governmental_support",
          label: "General governmental support",
          color: "#5a9bd4",
          value: 8689013,
          children: [
            {
              label: "General Fund",
              value: 5142774
            },
            {
              label: "Special Districts",
              value: 1349
            },
            {
              label: "Capital Projects",
              value: 3544890
            }
          ]
        },
        {
          id: "x_public_safety",
          label: "Public safety",
          color: "#ca615f",
          value: 13637441,
          children: [
            {
              label: "General Fund",
              value: 13158246
            },
            {
              label: "Special Districts",
              value: 479195
            }
          ]
        },
        {
          id: "x_health",
          label: "Health",
          color: "#9b7fd4",
          value: 511549,
          children: [
            {
              label: "General Fund",
              value: 4995
            },
            {
              label: "Special Districts",
              value: 506554
            }
          ]
        },
        {
          id: "x_transportation",
          label: "Transportation",
          color: "#b0862f",
          value: 8093814,
          children: [
            {
              label: "General Fund",
              value: 424520
            },
            {
              label: "Highway Fund",
              value: 7421386
            },
            {
              label: "Special Districts",
              value: 247908
            }
          ]
        },
        {
          id: "x_economic_opportunity_and_development",
          label: "Economic opportunity and development",
          color: null,
          value: 206965
        },
        {
          id: "x_culture_and_recreation",
          label: "Culture and recreation",
          color: "#3d9c72",
          value: 6125249,
          children: [
            {
              label: "General Fund",
              value: 4456899
            },
            {
              label: "Public Library Fund",
              value: 1652350
            },
            {
              label: "Special Districts",
              value: 16000
            }
          ]
        },
        {
          id: "x_home_and_community_services",
          label: "Home and community services",
          color: "#12a6b8",
          value: 5341525,
          children: [
            {
              label: "General Fund",
              value: 2537968
            },
            {
              label: "Special Districts",
              value: 2803557
            }
          ]
        },
        {
          id: "x_debt_service_principal",
          label: "Debt service - Principal",
          color: null,
          value: 1804000,
          children: [
            {
              label: "General Fund",
              value: 91457
            },
            {
              label: "Highway Fund",
              value: 1050000
            },
            {
              label: "Special Districts",
              value: 662543
            }
          ]
        },
        {
          id: "x_debt_service_interest",
          label: "Debt service - Interest",
          color: null,
          value: 586539,
          children: [
            {
              label: "General Fund",
              value: 6582
            },
            {
              label: "Highway Fund",
              value: 270481
            },
            {
              label: "Special Districts",
              value: 309476
            }
          ]
        }
      ],
      totalRevenue: 39710717,
      totalExpenditure: 44996095,
      note: "All governmental funds combined, FY2025 actual. Expenditures exceed revenues by $5.3M, funded from reserves (largely capital). Each line drills down by fund. Final adopted appropriations were $46.7M."
    },
    {
      key: "genfund-2025",
      label: "General Fund \u00b7 FY2025",
      fiscalYear: "2025",
      scope: "General Fund",
      status: "actual (ACFR)",
      revenue: [
        {
          id: "x_real_property_taxes",
          label: "Real property taxes",
          color: "#12a6b8",
          value: 12183504
        },
        {
          id: "x_other_tax_items",
          label: "Other tax items",
          color: "#12a6b8",
          value: 1232753
        },
        {
          id: "x_nonproperty_tax_items",
          label: "Nonproperty tax items",
          color: "#12a6b8",
          value: 3746111
        },
        {
          id: "x_departmental_income",
          label: "Departmental income",
          color: "#12a6b8",
          value: 2159945
        },
        {
          id: "x_use_of_money_and_property",
          label: "Use of money and property",
          color: "#12a6b8",
          value: 2144242
        },
        {
          id: "x_licenses_and_permits",
          label: "Licenses and permits",
          color: "#12a6b8",
          value: 1717560
        },
        {
          id: "x_fines_and_forfeitures",
          label: "Fines and forfeitures",
          color: "#12a6b8",
          value: 115075
        },
        {
          id: "x_sale_of_property_and_compensation_for_loss",
          label: "Sale of property and compensation for loss",
          color: "#12a6b8",
          value: 71390
        },
        {
          id: "x_state_aid",
          label: "State aid",
          color: "#12a6b8",
          value: 1029769
        },
        {
          id: "x_federal_aid",
          label: "Federal aid",
          color: "#12a6b8",
          value: 374254
        },
        {
          id: "x_miscellaneous",
          label: "Miscellaneous",
          color: "#12a6b8",
          value: 363154
        }
      ],
      expense: [
        {
          id: "x_general_governmental_support",
          label: "General governmental support",
          color: "#5a9bd4",
          value: 5142774
        },
        {
          id: "x_public_safety",
          label: "Public safety",
          color: "#ca615f",
          value: 13158246
        },
        {
          id: "x_health",
          label: "Health",
          color: "#9b7fd4",
          value: 4995
        },
        {
          id: "x_transportation",
          label: "Transportation",
          color: "#b0862f",
          value: 424520
        },
        {
          id: "x_economic_opportunity_and_development",
          label: "Economic opportunity and development",
          color: null,
          value: 206965
        },
        {
          id: "x_culture_and_recreation",
          label: "Culture and recreation",
          color: "#3d9c72",
          value: 4456899
        },
        {
          id: "x_home_and_community_services",
          label: "Home and community services",
          color: "#12a6b8",
          value: 2537968
        },
        {
          id: "x_debt_service_principal",
          label: "Debt service \u2013 Principal",
          color: null,
          value: 91457
        },
        {
          id: "x_debt_service_interest",
          label: "Debt service \u2013 Interest",
          color: null,
          value: 6582
        }
      ],
      totalRevenue: 25137757,
      totalExpenditure: 26030406,
      note: "The town\u2019s main operating fund. Year-over-year change is vs FY2024 actual."
    },
    {
      key: "genfund-2024",
      label: "General Fund \u00b7 FY2024",
      fiscalYear: "2024",
      scope: "General Fund",
      status: "actual (ACFR)",
      revenue: [
        {
          id: "x_real_property_taxes",
          label: "Real property taxes",
          color: "#12a6b8",
          value: 12994439
        },
        {
          id: "x_other_tax_items",
          label: "Other tax items",
          color: "#12a6b8",
          value: 1478663
        },
        {
          id: "x_nonproperty_tax_items",
          label: "Nonproperty tax items",
          color: "#12a6b8",
          value: 3607430
        },
        {
          id: "x_departmental_income",
          label: "Departmental income",
          color: "#12a6b8",
          value: 2163087
        },
        {
          id: "x_use_of_money_and_property",
          label: "Use of money and property",
          color: "#12a6b8",
          value: 2647096
        },
        {
          id: "x_licenses_and_permits",
          label: "Licenses and permits",
          color: "#12a6b8",
          value: 2192021
        },
        {
          id: "x_fines_and_forfeitures",
          label: "Fines and forfeitures",
          color: "#12a6b8",
          value: 144411
        },
        {
          id: "x_sale_of_property_and_compensation_for_loss",
          label: "Sale of property and compensation for loss",
          color: "#12a6b8",
          value: 129278
        },
        {
          id: "x_state_aid",
          label: "State aid",
          color: "#12a6b8",
          value: 1032394
        },
        {
          id: "x_federal_aid",
          label: "Federal aid",
          color: "#12a6b8",
          value: 8197
        },
        {
          id: "x_miscellaneous",
          label: "Miscellaneous",
          color: "#12a6b8",
          value: 32955
        }
      ],
      expense: [
        {
          id: "x_general_governmental_support",
          label: "General governmental support",
          color: "#5a9bd4",
          value: 4315335
        },
        {
          id: "x_public_safety",
          label: "Public safety",
          color: "#ca615f",
          value: 12552563
        },
        {
          id: "x_health",
          label: "Health",
          color: "#9b7fd4",
          value: 5003
        },
        {
          id: "x_transportation",
          label: "Transportation",
          color: "#b0862f",
          value: 425928
        },
        {
          id: "x_economic_opportunity_and_development",
          label: "Economic opportunity and development",
          color: null,
          value: 232674
        },
        {
          id: "x_culture_and_recreation",
          label: "Culture and recreation",
          color: "#3d9c72",
          value: 4150781
        },
        {
          id: "x_home_and_community_services",
          label: "Home and community services",
          color: "#12a6b8",
          value: 2356843
        },
        {
          id: "x_debt_service_principal",
          label: "Debt service \u2013 Principal",
          color: null,
          value: 163311
        },
        {
          id: "x_debt_service_interest",
          label: "Debt service \u2013 Interest",
          color: null,
          value: 13160
        }
      ],
      totalRevenue: 26429971,
      totalExpenditure: 24215598,
      note: "The town\u2019s main operating fund, FY2024 actual."
    }
  ],
}

export const TOWN_BUDGETS: Record<string, TownBudget> = {
  nc: NORTH_CASTLE,
}

export function getBudget(townKey: string): TownBudget | undefined {
  return TOWN_BUDGETS[townKey]
}
