interface ScrollableAncestor {
  node: HTMLElement
  /** Which axes this ancestor actually overflows on — CSS forces overflow-x
   *  and overflow-y to the same computed keyword when only one is set
   *  explicitly (e.g. `overflowX: 'auto'` alone also computes overflow-y to
   *  'auto'), so the keyword alone can't be trusted; only real content
   *  overflow (scrollHeight/Width > client-) counts. */
  scrollsX: boolean
  scrollsY: boolean
}

function findScrollableAncestor(el: Element): ScrollableAncestor | null {
  let node = el.parentElement
  while (node) {
    const style = getComputedStyle(node)
    const scrollsY = (style.overflowY === 'auto' || style.overflowY === 'scroll') && node.scrollHeight > node.clientHeight
    const scrollsX = (style.overflowX === 'auto' || style.overflowX === 'scroll') && node.scrollWidth > node.clientWidth
    if (scrollsY || scrollsX) return { node, scrollsX, scrollsY }
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
 *
 * When a scrollable ancestor isn't found (e.g. a board's timeline has too few
 * entries to actually overflow), there's nothing to scroll into place — the
 * item is already fully in the page's normal flow. Falling back to the
 * native `scrollIntoView` here would satisfy itself by scrolling the *page*
 * instead, which is exactly the whole-page drag this function exists to
 * avoid, so it's simply a no-op instead.
 *
 * Only the axis a container actually overflows on ever gets a nonzero delta —
 * a horizontal-only strip like the Meetings timeline never receives a
 * vertical nudge, even though the CSS quirk above makes its computed
 * overflow-y read 'auto' too.
 */
export function syncScrollIntoView(el: Element | undefined | null) {
  if (!el) return
  const found = findScrollableAncestor(el)
  if (!found) return
  const { node: container, scrollsX, scrollsY } = found
  const elRect = el.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()
  container.scrollBy({
    top: scrollsY ? elRect.top - containerRect.top : 0,
    left: scrollsX ? (elRect.left + elRect.width / 2) - (containerRect.left + containerRect.width / 2) : 0,
    behavior: 'smooth',
  })
}
