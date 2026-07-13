/**
 * Key reference documents shown near the top of each board/department page —
 * the actual code/plan text a resident needs, distinct from the departmental
 * contact links in departments.ts/permits.ts (staff & portals, not documents).
 */

export interface KeyDoc {
  label: string
  href: string
  sub?: string
}

const NC_KEY_DOCS: Record<string, KeyDoc[]> = {
  town_board: [
    { label: 'Town Code', href: 'https://ecode360.com/NO0492', sub: 'General Code · eCode360' },
    { label: 'Code of Ethics', href: 'https://ecode360.com/29155311', sub: 'Chapter 27 · eCode360' },
    { label: 'Board of Ethics Internal Guidelines', href: 'https://www.northcastleny.com/DocumentCenter/View/496/Internal-Guidelines-PDF', sub: 'PDF' },
    { label: 'Agendas & Minutes', href: 'https://www.northcastleny.com/129/Agendas-Minutes', sub: 'CivicClerk portal' },
  ],
  planning: [
    { label: 'Comprehensive Plan', href: 'https://www.northcastleny.com/201/Comprehensive-Plan-Information' },
    { label: 'Zoning Code', href: 'https://ecode360.com/36929254', sub: 'Chapter 355 · eCode360' },
    { label: 'Subdivision of Land', href: 'https://ecode360.com/29140298', sub: 'Chapter 275 · eCode360' },
    { label: 'Application Forms & Checklists', href: 'https://www.northcastleny.com/198/Application-Forms-Checklists' },
    { label: 'Site Development Plan Application', href: 'https://www.northcastleny.com/DocumentCenter/View/180/Site-Development-Plan-PDF', sub: 'PDF' },
  ],
  building: [
    { label: 'Building Code', href: 'https://ecode360.com/29139563', sub: 'Chapter 127 · eCode360' },
    { label: 'Zoning Code', href: 'https://ecode360.com/36929254', sub: 'Chapter 355 · eCode360' },
    { label: 'Fee Schedule', href: 'https://www.northcastleny.com/212/Building-Department-Fee-Schedule-2024-PD', sub: 'PDF' },
    { label: "Customer's Guide to the Building Permit Process", href: 'https://www.northcastleny.com/213/Customers-Guide-to-the-Building-Permit-P' },
    { label: 'Residential Building Permit Application', href: 'https://www.northcastleny.com/DocumentCenter/View/233/Building-Permit-Application-Residential-PDF', sub: 'PDF' },
  ],
  finance: [
    { label: 'Budgets & Annual Financial Reports', href: 'https://www.northcastleny.com/160/Budgets-Annual-Financial-Reports', sub: 'Budget & audit archive' },
    { label: "Independent Auditor's Report", href: 'https://www.northcastleny.com/Archive/ViewFile/Item/429', sub: 'PDF · Audited financial statements' },
  ],
}

const KEY_DOCS: Record<string, Record<string, KeyDoc[]>> = { nc: NC_KEY_DOCS }

/** Key documents for a board/department page, or [] when none configured. */
export function getKeyDocs(muniKey: string, bodyKey: string): KeyDoc[] {
  return KEY_DOCS[muniKey]?.[bodyKey] ?? []
}
