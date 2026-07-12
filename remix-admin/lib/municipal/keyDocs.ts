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
  ],
  planning: [
    { label: 'Comprehensive Plan', href: 'https://www.northcastleny.com/201/Comprehensive-Plan-Information' },
    { label: 'Zoning Code', href: 'https://ecode360.com/36929254', sub: 'Chapter 355 · eCode360' },
  ],
  building: [
    { label: 'Building Code', href: 'https://ecode360.com/29139563', sub: 'Chapter 127 · eCode360' },
    { label: 'Zoning Code', href: 'https://ecode360.com/36929254', sub: 'Chapter 355 · eCode360' },
  ],
}

const KEY_DOCS: Record<string, Record<string, KeyDoc[]>> = { nc: NC_KEY_DOCS }

/** Key documents for a board/department page, or [] when none configured. */
export function getKeyDocs(muniKey: string, bodyKey: string): KeyDoc[] {
  return KEY_DOCS[muniKey]?.[bodyKey] ?? []
}
