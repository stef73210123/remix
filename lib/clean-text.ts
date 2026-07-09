/**
 * Clean news headline/description text for display.
 *
 * Feeds arrive with HTML entities (`&#8217;`, `&amp;`, `&#8230;`) and, when a
 * source was mis-encoded, Windows-1252-as-UTF-8 mojibake (`â€™` for ’, `Â` for
 * a stray non-breaking space, etc.). This decodes both so the ticker and the
 * lightbox render clean punctuation.
 */

// Common named HTML entities (numeric ones are handled generically below).
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rsquo: "’",
  lsquo: "‘",
  ldquo: "“",
  rdquo: "”",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  copy: "©",
  reg: "®",
  trade: "™",
  deg: "°",
};

function fromCodePointSafe(cp: number): string {
  try {
    if (cp <= 0 || cp > 0x10ffff) return "";
    return String.fromCodePoint(cp);
  } catch {
    return "";
  }
}

// Windows-1252 printable characters in the 0x80–0x9F block map to these
// Unicode code points. When UTF-8 bytes are mis-decoded as cp1252, bytes like
// 0x80/0x99 surface as € / ™ (code points > 255), so we map them back to their
// original byte before re-decoding as UTF-8.
const CP1252_TO_BYTE: Record<number, number> = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a,
  0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92,
  0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c,
  0x017e: 0x9e, 0x0178: 0x9f,
};

/**
 * Reverse "UTF-8 bytes decoded as Latin-1 / Windows-1252" mojibake: map each
 * character back to its byte (directly for ≤0xFF, via the cp1252 table for the
 * smart-quote/dash block) and decode the bytes as UTF-8. If any character isn't
 * representable as a single byte, or the result isn't clean UTF-8, the original
 * is returned untouched so genuine Unicode is never corrupted.
 */
function fixMojibake(s: string): string {
  if (!/[ÂÃ]|â€/.test(s)) return s;
  const bytes: number[] = [];
  for (const ch of s) {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp <= 0xff) bytes.push(cp);
    else if (cp in CP1252_TO_BYTE) bytes.push(CP1252_TO_BYTE[cp]);
    else return s; // genuine multi-byte Unicode present — leave it alone
  }
  try {
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(
      new Uint8Array(bytes)
    );
    // A replacement char means these weren't cleanly mojibaked bytes.
    if (decoded.includes("�")) return s;
    return decoded;
  } catch {
    return s;
  }
}

export function cleanText(input: string | null | undefined): string {
  if (!input) return "";
  let s = String(input);

  // Fix mojibake first — before entity decoding, which would introduce
  // multi-byte characters that block the Latin-1 re-decode.
  s = fixMojibake(s);

  // A lone "Â" left over (e.g. a stripped non-breaking space) reads as noise —
  // drop it when it sits before whitespace or at the end.
  s = s.replace(/Â(?=\s|$)/g, "");

  // Strip real HTML tags BEFORE decoding entities, so entity-encoded angle
  // brackets (&lt;…&gt;) survive as literal text instead of looking like tags.
  s = s.replace(/<[^>]+>/g, "");

  // Numeric entities: decimal and hex.
  s = s.replace(/&#(\d+);/g, (_, n) => fromCodePointSafe(parseInt(n, 10)));
  s = s.replace(/&#x([0-9a-fA-F]+);/g, (_, h) => fromCodePointSafe(parseInt(h, 16)));

  // Named entities.
  s = s.replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (m, name: string) => {
    const v = NAMED_ENTITIES[name] ?? NAMED_ENTITIES[name.toLowerCase()];
    return v ?? m;
  });

  // Collapse whitespace.
  s = s.replace(/\s+/g, " ").trim();
  return s;
}
