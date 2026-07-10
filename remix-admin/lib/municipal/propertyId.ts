/**
 * Pure address→id helpers, safe to import from client components (no fs).
 * Shared by the property federation lib and the case views that link to it.
 */

/** Normalize an address to a federation key: leading street portion, lowercased,
 *  parentheticals and municipality/state suffixes stripped. */
export function addressKey(raw: string): string {
  let k = (raw || '').toLowerCase()
  k = k.replace(/\(.*?\)/g, ' ')
  k = k.split(',')[0]
  k = k.replace(/[^a-z0-9 ]/g, ' ')
  k = k.replace(/\s+/g, ' ').trim()
  return k
}

/** Property id (URL slug) for an address, or '' when there's no usable address. */
export function propertyId(address: string): string {
  const k = addressKey(address)
  if (!k || k.length < 3) return ''
  return k.replace(/\s+/g, '-').slice(0, 80)
}
