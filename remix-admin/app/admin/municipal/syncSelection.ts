/**
 * Scrolls a registered item into view within its own scroll container,
 * without dragging the whole page along (block: 'nearest' keeps ancestor
 * scroll containers, e.g. the page body, untouched).
 */
export function syncScrollIntoView(el: Element | undefined | null) {
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
}
