/**
 * Records the Town released under the Freedom of Information Law.
 *
 * Everything else the site links to lives on the Town's own servers, and
 * BoardKeyDocs says so plainly — nothing rehosted, nothing edited. These are
 * the exception, and they need their own section rather than a row in that
 * list, because the provenance is genuinely different: the Town does not
 * publish these anywhere. They exist online only because they were asked for.
 *
 * Two consequences worth being explicit about:
 *
 *  - **We host them, so we are responsible for their fidelity.** Each file is
 *    committed byte-for-byte as released — no compression, no re-rendering, no
 *    OCR pass. A scanned page stays a scanned page.
 *  - **`href` is a single field per document.** Today it points at a path under
 *    `public/foil`. The project already runs Vercel Blob for meeting documents
 *    (lib/municipal/blob.ts), so moving these off the repo later is a change to
 *    this data and nothing else.
 *
 * Dates on the minutes come from the first page of each document, not from the
 * filename — the Town's filenames are unreliable. Two were plainly wrong:
 * "zba-minutes-10-2024.pdf" is the meeting of 5 October *2023*, and
 * "zba-mintes-12-7-202.pdf" is 7 December 2023.
 */

export interface FoilDoc {
  label: string
  /** Where the file is served from. The only thing to change to rehost. */
  href: string
  /** The document's own date, not the date it was released to us. */
  date?: string
  sub?: string
  note?: string
}

export interface FoilRequest {
  /** The Town's own request number. */
  id: string
  title: string
  /** Board/department pages this request's records belong on. */
  bodyKeys: string[]
  /** One line on what was asked for and why the records aren't otherwise online. */
  summary: string
  docs: FoilDoc[]
}

const NC_FOIL: FoilRequest[] = [
  {
    id: '26-547',
    title: 'Town Attorney retainers',
    bodyKeys: ['town_board'],
    summary:
      "The Town's current legal-services agreements. The Town publishes the resolutions appointing counsel each January but not the agreements themselves, so the rates were not previously public.",
    docs: [
      {
        label: 'Abrams Fensterman — Town Attorney retainer',
        href: '/foil/26-547-attorney-retainers/abrams-fensterman-town-attorney-2026.pdf',
        date: '2026',
        sub: 'PDF · 1.1 MB',
        note: 'The current general Town Attorney engagement.',
      },
      {
        label: 'Baroni to Abrams Fensterman — assignment of the retainer',
        href: '/foil/26-547-attorney-retainers/baroni-to-abrams-fensterman-assignment-2024-07-10.pdf',
        date: '10 July 2024',
        sub: 'PDF · 896 KB',
        note: 'How the Town Attorney work moved from Roland Baroni to Abrams Fensterman mid-term, without a new procurement.',
      },
      {
        label: 'Bond, Schoeneck & King — labour counsel retainer',
        href: '/foil/26-547-attorney-retainers/bond-schoeneck-king-labor-counsel-2026.pdf',
        date: '2026',
        sub: 'PDF · 4.3 MB',
        note: 'Separate counsel for employment and union matters — the PBA negotiations run through this engagement.',
      },
      {
        label: 'Patrick J. Bliss — Town Prosecutor retainer',
        href: '/foil/26-547-attorney-retainers/bliss-town-prosecutor-2026.pdf',
        date: '1 January 2026',
        sub: 'PDF · 116 KB',
        note: 'Prosecution of Town ordinances and traffic matters at $475 per court appearance, plus $250 an hour for Red Flag Law work.',
      },
      {
        label: 'Stephens, Baroni, Reilly & Lewis — legal services',
        href: '/foil/26-547-attorney-retainers/stephens-baroni-reilly-lewis-2024.pdf',
        date: '2024',
        sub: 'PDF · 84 KB',
        note: 'The prior arrangement, useful for comparing what the Town paid before and after the change of firm.',
      },
    ],
  },
  {
    id: '24-48',
    title: 'Zoning Board of Appeals minutes',
    bodyKeys: ['zba'],
    summary:
      'Five consecutive ZBA meetings. Each of these meetings appears in the Town’s meeting portal carrying no files at all — no agenda, no minutes — so this is the only record of what the Board decided.',
    docs: [
      { label: 'ZBA minutes — 7 September 2023', href: '/foil/24-48-zba-minutes/zba-2023-09-07-minutes.pdf', date: '7 Sep 2023', sub: 'PDF · 2.0 MB' },
      { label: 'ZBA minutes — 5 October 2023', href: '/foil/24-48-zba-minutes/zba-2023-10-05-minutes.pdf', date: '5 Oct 2023', sub: 'PDF · 1.1 MB' },
      { label: 'ZBA minutes — 2 November 2023', href: '/foil/24-48-zba-minutes/zba-2023-11-02-minutes.pdf', date: '2 Nov 2023', sub: 'PDF · 2.1 MB' },
      { label: 'ZBA minutes — 7 December 2023', href: '/foil/24-48-zba-minutes/zba-2023-12-07-minutes.pdf', date: '7 Dec 2023', sub: 'PDF · 2.2 MB' },
      { label: 'ZBA minutes — 4 January 2024', href: '/foil/24-48-zba-minutes/zba-2024-01-04-minutes.pdf', date: '4 Jan 2024', sub: 'PDF · 1.3 MB' },
    ],
  },
  {
    id: '24-49',
    title: 'Planning Board minutes',
    bodyKeys: ['planning'],
    summary:
      'The Planning Board publishes no minutes to the Town’s meeting portal at all. This is the draft record of one meeting, including the two applications the Board sent on for resolutions.',
    docs: [
      {
        label: 'Planning Board draft minutes — 12 February 2024',
        href: '/foil/24-49-planning-minutes/planning-board-2024-02-12-draft-minutes.pdf',
        date: '12 Feb 2024',
        sub: 'PDF · 136 KB',
        note: 'Marked DRAFT by the Town. Records an executive session being convened and returned from; no content of that session is disclosed in it.',
      },
    ],
  },
  {
    id: '26-558',
    title: 'Building permits, 2025–26',
    bodyKeys: ['building'],
    summary:
      'The Building Department’s M5 permit report for the most recent period, which the Town does not publish. Record-level rows carry owner names, addresses and contractor details, so only the report itself is linked here — the site does not republish it as searchable rows.',
    docs: [
      {
        label: 'M5 permit report — May 2025 to July 2026',
        href: '/foil/26-558-permit-report/m5-permit-report-2025-05-to-2026-07.pdf',
        date: 'May 2025 – Jul 2026',
        sub: 'PDF · 5.2 MB',
        note: 'Every permit applied for and issued in the period, with type, parcel, cost of construction and fee.',
      },
    ],
  },
]

const BY_MUNI: Record<string, FoilRequest[]> = { nc: NC_FOIL }

/** FOIL requests whose records belong on a given board or department page. */
export function getFoilRequests(muniKey: string, bodyKey: string): FoilRequest[] {
  return (BY_MUNI[muniKey] || []).filter((r) => r.bodyKeys.includes(bodyKey))
}
