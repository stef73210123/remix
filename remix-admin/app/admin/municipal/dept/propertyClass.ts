// NYS ORPTS property classification system groups every 3-digit class code
// under a first-digit category (210 "Residential — one family" rolls up to
// "200 Residential", etc.) — the parcel service only carries the raw code,
// not a description field, so the group label is derived client-side.
export const CLASS_GROUPS: Record<string, string> = {
  '1': 'Agricultural', '2': 'Residential', '3': 'Vacant land', '4': 'Commercial',
  '5': 'Recreation & entertainment', '6': 'Community services', '7': 'Industrial',
  '8': 'Public services', '9': 'Wild, forest & parks',
}

export function classGroupLabel(code: string): string {
  const digit = code.trim()[0]
  return (digit && CLASS_GROUPS[digit]) || 'Other/unclassified'
}

/** Reverse lookup — the leading class-code digit(s) for a given group label,
 *  used to build a `PROP_CLASS LIKE 'D%'` filter clause from a set of
 *  selected group labels. 'Other/unclassified' has no digit of its own. */
export const CLASS_GROUP_DIGITS: Record<string, string> = Object.fromEntries(
  Object.entries(CLASS_GROUPS).map(([digit, label]) => [label, digit])
)

export const ALL_CLASS_GROUP_LABELS: string[] = [...Object.values(CLASS_GROUPS), 'Other/unclassified']
