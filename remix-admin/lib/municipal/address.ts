/**
 * Pulling a street out of the address line the boards actually write.
 *
 * Addresses in the transcript analysis are typed by whoever kept the record, so
 * one street arrives in several shapes — "45 Bedford Road", "570 Bedford Road,
 * Armonk, NY", "486 Bedford Rd." — and plenty of matters have no street at all
 * ("Wampus Brook Park", "Summit Golf Club"). Grouping on the raw string gives
 * 250-odd groups of one, which is not grouping.
 *
 * So the line is reduced to a street name and a house number:
 *
 *  - Only the first `;` segment counts. A few matters list several properties
 *    ("Bedford Banksville Road; 130 Old Orchard…; 3 North Castle Drive") and the
 *    first is the one the matter is filed under.
 *  - Parentheses go — they carry asides like "(corner lot fronting Grove Road)".
 *  - Trailing hamlet and state segments go, so ", Armonk, NY" stops splitting a
 *    street from its unsuffixed twin.
 *  - A leading house number is lifted off, including the ranges and pairs the
 *    record uses: "92 & 94", "428-436".
 *  - The name is cut at its street suffix, which is expanded to one spelling
 *    (Rd → Road). The cut is what merges "Old Mount Kisco Road & 585 Main
 *    Street" into Old Mount Kisco Road instead of stranding it alone. A
 *    direction *after* the suffix is kept, because Sterling Road North and
 *    Sterling Road South are two streets.
 *  - No suffix but a house number still means a street — a number is what
 *    distinguishes an address from a park, and it catches suffixes no table has.
 *  - No suffix and no number is a named place, kept whole.
 *
 * What this deliberately does not do is fuzzy-match. The record contains both
 * "Whippoorwill Road" and "Whipperwill Lane", and any edit-distance rule loose
 * enough to merge that typo also merges Seymour Place East with Seymour Place
 * West, which are genuinely different streets. A misspelling shows as its own
 * group; a wrongly merged street would be a quiet lie.
 */

/** Suffix spellings → the one form used for grouping and display. */
const SUFFIXES: Record<string, string> = {
  rd: 'Road', road: 'Road',
  ave: 'Avenue', av: 'Avenue', avenue: 'Avenue',
  st: 'Street', street: 'Street',
  dr: 'Drive', drive: 'Drive',
  ln: 'Lane', lane: 'Lane',
  ct: 'Court', court: 'Court',
  pl: 'Place', place: 'Place',
  ter: 'Terrace', terrace: 'Terrace',
  blvd: 'Boulevard', boulevard: 'Boulevard',
  cir: 'Circle', circle: 'Circle',
  hwy: 'Highway', highway: 'Highway',
  tpke: 'Turnpike', turnpike: 'Turnpike',
  way: 'Way',
  rte: 'Route', route: 'Route',
  trl: 'Trail', trail: 'Trail',
  row: 'Row',
  sq: 'Square', square: 'Square',
  xing: 'Crossing', crossing: 'Crossing',
  pkwy: 'Parkway', parkway: 'Parkway',
  bypass: 'Bypass',
  // Carries no suffix of its own but is unmistakably a street here.
  broadway: 'Broadway',
}

/** Kept when it follows the suffix: "Sterling Road North" is its own street. */
const DIRECTIONS = new Set(['north', 'south', 'east', 'west', 'n', 's', 'e', 'w'])

/** Hamlets and the state — dropped from the tail of the line, never the head. */
const LOCALITIES = new Set([
  'north castle', 'armonk', 'banksville', 'north white plains', 'white plains',
  'bedford', 'mount kisco', 'pleasantville', 'purchase', 'valhalla',
  'ny', 'n.y.', 'new york',
])

/** Leading house number, including "92 & 94" and "428-436". */
const HOUSE_NUMBER = /^(\d+[\dA-Za-z]*(?:\s*(?:&|and|-|–|\/|,)\s*\d+[\dA-Za-z]*)*)\s+(.*)$/i

/**
 * Some address fields are a note that the address is missing — "Address not
 * specified in the excerpted transcript segment", "[street name garbled in
 * ASR…]". Left alone they become group headings, and they sort above every real
 * street because of the bracket. Both halves have to be present: "Bedford
 * Banksville Road (exact house number unclear in recording)" names a real
 * street and keeps it.
 */
const ABSENCE = /\b(unclear|unspecified|not specified|not stated|not given|garbled|unknown|not identified|n\/a)\b/i
const ABOUT_ADDRESS = /\b(address|street name|location)\b/i

export interface ParsedAddress {
  /** A street line, or a named place like a park or club. */
  kind: 'street' | 'place'
  /** House number as written — "12", "92 & 94". Null when the line has none. */
  number: string | null
  /** Street or place name, suffix expanded. What a group is headed with. */
  name: string
  /** Lowercased `name`, for grouping and comparison. */
  key: string
  /** Leading digits of `number`, for ordering within a street. */
  numeric: number
}

/**
 * Street and house number from a board's address line, or null when there is
 * nothing to work with.
 */
export function parseAddress(raw: string | null | undefined): ParsedAddress | null {
  if (!raw) return null

  let line = raw.split(';')[0].replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim()
  const segments = line.split(',').map((s) => s.trim()).filter(Boolean)
  while (segments.length > 1 && LOCALITIES.has(segments[segments.length - 1].toLowerCase().replace(/\.$/, ''))) {
    segments.pop()
  }
  line = (segments[0] || '').trim().replace(/^[["'\s]+|[\]"'\s]+$/g, '')
  if (!line) return null
  if (ABOUT_ADDRESS.test(line) && ABSENCE.test(line)) return null

  let number: string | null = null
  const m = HOUSE_NUMBER.exec(line)
  if (m) {
    number = m[1].trim()
    line = m[2].trim()
  }

  // Abbreviation dots go ("Bedford Rd." → "Bedford Rd"); decimal points stay,
  // because a tax-parcel number like 107.04 is the only handle some matters have.
  const tokens = line.replace(/-/g, ' ').replace(/([A-Za-z])\./g, '$1').split(' ').filter(Boolean)
  if (tokens.length === 0) return null

  const cut = tokens.findIndex((t) => t.toLowerCase() in SUFFIXES)
  if (cut === -1) {
    const name = titleCase(tokens)
    // A house number means an address even when the suffix isn't one we know.
    return finish(number === null ? 'place' : 'street', number, name)
  }

  let end = cut + 1
  if (end < tokens.length && DIRECTIONS.has(tokens[end].toLowerCase())) end += 1
  const kept = tokens.slice(0, end)
  kept[cut] = SUFFIXES[kept[cut].toLowerCase()]
  return finish('street', number, titleCase(kept))
}

function finish(kind: ParsedAddress['kind'], number: string | null, name: string): ParsedAddress {
  return {
    kind,
    number,
    name,
    key: name.toLowerCase(),
    numeric: number ? parseInt(number, 10) || 0 : 0,
  }
}

function titleCase(tokens: string[]): string {
  return tokens.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

/**
 * Whether a parsed street name ends in a suffix we recognise. Used to spot the
 * addresses the record wrote short — "9 Barnard" for Barnard Road — which can
 * be folded into the full name when only one street could be meant.
 */
export function hasStreetSuffix(name: string): boolean {
  const tokens = name.trim().split(/\s+/)
  if (tokens.length === 0) return false
  const last = tokens[tokens.length - 1].toLowerCase()
  if (last in SUFFIXES) return true
  // "Sterling Road North" — the direction trails the suffix.
  return tokens.length > 1 && DIRECTIONS.has(last) && tokens[tokens.length - 2].toLowerCase() in SUFFIXES
}

/**
 * A case name with any leading house number taken off, for sorting and for
 * picking the letter it files under.
 *
 * Most matters are named after their address — "9 Barnard Road", "45 Bedford
 * Road — NCD Acquisitions", "113 King Street (RCLA Enclave at Armonk)" — so an
 * A–Z on the raw name files 388 of the town's 1,260 matters under "#", which
 * tells a reader nothing. Filing them under the word people would actually
 * look for puts 9 Barnard Road under B, next to the rest of the street.
 *
 * Only the sort key changes; a row still shows the name as written.
 */
export function sortableName(raw: string | null | undefined): string {
  const s = (raw || '').trim()
  const m = HOUSE_NUMBER.exec(s)
  return (m ? m[2] : s).trim()
}

/**
 * Order two address lines the way a street list reads: by street name, then up
 * the street by house number. Anything unaddressed sorts last, so a sorted list
 * still ends somewhere predictable rather than leading with its gaps.
 */
export function compareAddress(a: string | null | undefined, b: string | null | undefined): number {
  const pa = parseAddress(a)
  const pb = parseAddress(b)
  if (!pa && !pb) return 0
  if (!pa) return 1
  if (!pb) return -1
  if (pa.key !== pb.key) return pa.key.localeCompare(pb.key)
  if (pa.numeric !== pb.numeric) return pa.numeric - pb.numeric
  return (pa.number || '').localeCompare(pb.number || '')
}
