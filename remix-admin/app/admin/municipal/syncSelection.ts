function findScrollableAncestor(el: Element): HTMLElement | null {
  let node = el.parentElement
  while (node) {
    const style = getComputedStyle(node)
    const scrollsY = (style.overflowY === 'auto' || style.overflowY === 'scroll') && node.scrollHeight > node.clientHeight
    const scrollsX = (style.overflowX === 'auto' || style.overflowX === 'scroll') && node.scrollWidth > node.clientWidth
    if (scrollsY || scrollsX) return node
    node = node.parentElement
  }
  return null
}

/**
 * Scrolls a registered item to the top of its own scroll container, without
 * dragging the whole page along. `Element.scrollIntoView` looks like the
 * obvious tool for this, but its alignment (`block`/`inline`) is satisfied by
 * scrolling *every* scrollable ancestor in the chain — including the page
 * itself — so `block: 'start'` ends up scrolling the whole page until the
 * item sits at the top of the browser window, not just the top of its own
 * list. Scrolling only the nearest scrollable ancestor by the exact delta
 * needed keeps the effect contained to that one container, e.g. pinning the
 * default-selected next-upcoming meeting to the top of the Meetings list
 * while the rest of the page stays put.
 */
export function syncScrollIntoView(el: Element | undefined | null) {
  if (!el) return
  const container = findScrollableAncestor(el)
  if (!container) { el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); return }
  const elRect = el.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()
  container.scrollBy({
    top: elRect.top - containerRect.top,
    left: (elRect.left + elRect.width / 2) - (containerRect.left + containerRect.width / 2),
    behavior: 'smooth',
  })
}
