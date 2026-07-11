'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { BudgetNode, BudgetLink } from '@/lib/municipal/budget'

const NEUTRAL = '#7a8590'

const W = 1040
const H = 720
const PAD = { top: 24, bottom: 24, left: 150, right: 170 }
const NODE_W = 16
const GAP = 16

function fmtUSD(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(v >= 10_000_000 ? 1 : 2)}M`
  if (v >= 1_000) return `$${Math.round(v / 1000)}K`
  return `$${v}`
}

interface Laid {
  node: BudgetNode
  x: number
  y: number
  h: number
  value: number
  sOff: number // running offset for outgoing ribbons
  tOff: number // running offset for incoming ribbons
}

interface Ribbon {
  key: string
  d: string
  color: string
  value: number
  label: string
  midX: number
  midY: number
}

export default function Sankey({
  nodes, links, totalRevenue, totalExpenditure,
}: {
  nodes: BudgetNode[]
  links: BudgetLink[]
  totalRevenue?: number
  totalExpenditure?: number
}) {
  const [hoverLink, setHoverLink] = useState<string | null>(null)
  const [hoverNode, setHoverNode] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const scrollRef = useRef<HTMLDivElement>(null)

  // When the chart overflows horizontally (narrow viewports), open on the
  // spending (right) side so expenditures are visible without scrolling.
  useEffect(() => {
    const el = scrollRef.current
    if (el && el.scrollWidth > el.clientWidth) el.scrollLeft = el.scrollWidth - el.clientWidth
  }, [expanded])

  // Which nodes can be drilled into (have detail children).
  const expandable = useMemo(() => new Set(nodes.filter((n) => n.parent).map((n) => n.parent!)), [nodes])

  function toggle(id: string) {
    if (!expandable.has(id)) return
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const { laid, ribbons, maxLayer, minLayer } = useMemo(() => {
    // Only show a detail child when its parent is expanded.
    const nodesV = nodes.filter((n) => !n.parent || expanded.has(n.parent))
    const visIds = new Set(nodesV.map((n) => n.id))
    const linksV = links.filter((l) => visIds.has(l.source) && visIds.has(l.target))

    const byId = new Map<string, Laid>()
    for (const n of nodesV) {
      byId.set(n.id, { node: n, x: 0, y: 0, h: 0, value: 0, sOff: 0, tOff: 0 })
    }
    // Node value = max(incoming, outgoing) over visible links.
    for (const n of nodesV) {
      const inc = linksV.filter((l) => l.target === n.id).reduce((s, l) => s + l.value, 0)
      const out = linksV.filter((l) => l.source === n.id).reduce((s, l) => s + l.value, 0)
      byId.get(n.id)!.value = Math.max(inc, out)
    }
    const nodes2 = nodesV
    const links2 = linksV
    // Position columns by the ORDER of present layers (not raw value), so a
    // missing layer (e.g. no revenue detail expanded) collapses its gap and
    // negative layers (revenue drill-down) sit cleanly to the left.
    const layers = Array.from(new Set(nodes2.map((n) => n.layer))).sort((a, b) => a - b)
    const layerIndex = new Map(layers.map((L, i) => [L, i]))
    const lastIdx = layers.length - 1
    const maxLayer = layers[layers.length - 1] || 0
    const plotH = H - PAD.top - PAD.bottom

    // Scale so the fullest column fits vertically (accounting for gaps).
    let scale = Infinity
    const byLayer = new Map<number, Laid[]>()
    for (const L of layers) {
      const col = nodes2.filter((n) => n.layer === L).map((n) => byId.get(n.id)!)
      col.sort((a, b) => b.value - a.value)
      byLayer.set(L, col)
      const sum = col.reduce((s, c) => s + c.value, 0)
      const avail = plotH - (col.length - 1) * GAP
      if (sum > 0) scale = Math.min(scale, avail / sum)
    }
    if (!isFinite(scale)) scale = 1

    // Position each column, vertically centered.
    for (const L of layers) {
      const col = byLayer.get(L)!
      const totalH = col.reduce((s, c) => s + c.value * scale, 0) + (col.length - 1) * GAP
      let y = PAD.top + (plotH - totalH) / 2
      const x = PAD.left + (lastIdx === 0 ? 0 : (layerIndex.get(L)! / lastIdx) * (W - PAD.left - PAD.right - NODE_W))
      for (const c of col) {
        c.x = x
        c.y = y
        c.h = c.value * scale
        c.sOff = y
        c.tOff = y
        y += c.h + GAP
      }
    }

    // Build ribbons. Order each node's links by the other end's y to reduce crossings.
    const ordered = [...links2].sort((a, b) => {
      const ay = byId.get(a.source)!.y + byId.get(a.target)!.y
      const by = byId.get(b.source)!.y + byId.get(b.target)!.y
      return ay - by
    })
    const ribbons: Ribbon[] = []
    for (const l of ordered) {
      const s = byId.get(l.source)!
      const t = byId.get(l.target)!
      const th = l.value * scale
      const x0 = s.x + NODE_W
      const x1 = t.x
      const sy = s.sOff
      const ty = t.tOff
      const mx = (x0 + x1) / 2
      const d = `M ${x0} ${sy} C ${mx} ${sy}, ${mx} ${ty}, ${x1} ${ty} L ${x1} ${ty + th} C ${mx} ${ty + th}, ${mx} ${sy + th}, ${x0} ${sy + th} Z`
      // Link takes the color of its non-hub endpoint (source unless source is the hub).
      const colorNode = s.node.layer === 1 ? t.node : s.node
      ribbons.push({
        key: `${l.source}->${l.target}`,
        d,
        color: colorNode.color ?? NEUTRAL,
        value: l.value,
        label: `${s.node.label} → ${t.node.label}`,
        midX: mx,
        midY: (sy + ty) / 2 + th / 2,
      })
      s.sOff += th
      t.tOff += th
    }

    return { laid: [...byId.values()], ribbons, maxLayer, minLayer: layers[0] ?? 0 }
  }, [nodes, links, expanded])

  const active = hoverLink || hoverNode
  const hovered =
    (hoverLink && ribbons.find((r) => r.key === hoverLink)) ||
    (hoverNode && laid.find((l) => l.node.id === hoverNode)) ||
    null

  return (
    <div>
      {/* Pinned header: totals + hint stay put while the chart scrolls beneath. */}
      {(totalRevenue != null || totalExpenditure != null) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
          {totalRevenue != null && (
            <div>
              <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Revenue in</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#12a6b8', fontVariantNumeric: 'tabular-nums' }}>{fmtUSD(totalRevenue)}</div>
            </div>
          )}
          {totalExpenditure != null && (
            <div style={{ textAlign: 'right' }}>
              <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Spending out</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#ca615f', fontVariantNumeric: 'tabular-nums' }}>{fmtUSD(totalExpenditure)}</div>
            </div>
          )}
        </div>
      )}
      <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
        Click any item marked ⊕ to break it down; click ⊖ to roll it back up.
      </div>
      <div ref={scrollRef} style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', minWidth: 760, display: 'block' }}
        role="img"
        aria-label="Town budget flow: revenue sources to spending areas"
      >
        {/* Ribbons */}
        {ribbons.map((r) => {
          const dim = active && hoverLink !== r.key && !(hoverNode && r.key.includes(hoverNode))
          return (
            <path
              key={r.key}
              d={r.d}
              fill={r.color}
              opacity={hoverLink === r.key ? 0.85 : dim ? 0.12 : 0.5}
              style={{ cursor: 'pointer', transition: 'opacity 0.12s' }}
              onMouseEnter={() => setHoverLink(r.key)}
              onMouseLeave={() => setHoverLink(null)}
            />
          )
        })}

        {/* Nodes + labels */}
        {laid.map((n) => {
          // Leftmost present column labels to the left; rightmost to the right;
          // interior columns (hub, expanded parents) label above.
          const isLeft = n.node.layer === minLayer
          const isMiddle = n.node.layer > minLayer && n.node.layer < maxLayer
          const labelX = isLeft ? n.x - 8 : isMiddle ? n.x + NODE_W / 2 : n.x + NODE_W + 8
          const anchor = isLeft ? 'end' : isMiddle ? 'middle' : 'start'
          const canDrill = expandable.has(n.node.id)
          const drillMark = canDrill ? (expanded.has(n.node.id) ? ' ⊖' : ' ⊕') : ''
          return (
            <g key={n.node.id}>
              <rect
                x={n.x}
                y={n.y}
                width={NODE_W}
                height={Math.max(1, n.h)}
                rx={2}
                fill={n.node.color ?? NEUTRAL}
                opacity={active && hoverNode !== n.node.id && !(hoverLink && hoverLink.includes(n.node.id)) ? 0.4 : 1}
                style={{ cursor: canDrill ? 'pointer' : 'default' }}
                onMouseEnter={() => setHoverNode(n.node.id)}
                onMouseLeave={() => setHoverNode(null)}
                onClick={() => toggle(n.node.id)}
              />
              {isMiddle ? (
                <text
                  x={labelX}
                  y={n.y - 8}
                  textAnchor="middle"
                  fontSize={13}
                  fontWeight={600}
                  fill="var(--text)"
                  style={{ cursor: canDrill ? 'pointer' : 'default' }}
                  onClick={() => toggle(n.node.id)}
                >
                  {n.node.label}{drillMark}
                </text>
              ) : (
                <>
                  <text
                    x={labelX}
                    y={n.y + n.h / 2 - 2}
                    textAnchor={anchor}
                    dominantBaseline="middle"
                    fontSize={13}
                    fontWeight={600}
                    fill="var(--text)"
                    style={{ cursor: canDrill ? 'pointer' : 'default' }}
                    onClick={() => toggle(n.node.id)}
                  >
                    {n.node.label}{drillMark}
                  </text>
                  <text
                    x={labelX}
                    y={n.y + n.h / 2 + 13}
                    textAnchor={anchor}
                    dominantBaseline="middle"
                    fontSize={11}
                    fill="#9a9a9a"
                    style={{ pointerEvents: 'none' }}
                  >
                    {fmtUSD(n.value)}
                  </text>
                </>
              )}
            </g>
          )
        })}

        {/* Tooltip */}
        {hovered && 'midX' in hovered && (
          <Tooltip x={hovered.midX} y={hovered.midY} lines={[hovered.label, fmtUSD(hovered.value)]} />
        )}
        {hovered && 'node' in hovered && (
          <Tooltip x={hovered.x + NODE_W / 2} y={hovered.y + hovered.h / 2} lines={[hovered.node.label, fmtUSD(hovered.value)]} />
        )}
      </svg>
      </div>
    </div>
  )
}

function Tooltip({ x, y, lines }: { x: number; y: number; lines: string[] }) {
  const w = Math.max(...lines.map((l) => l.length)) * 7.2 + 20
  const h = 18 * lines.length + 12
  const tx = Math.min(Math.max(x - w / 2, 4), W - w - 4)
  const ty = Math.max(y - h - 12, 4)
  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect x={tx} y={ty} width={w} height={h} rx={7} fill="var(--panel)" stroke="var(--border)" opacity={0.97} />
      {lines.map((l, i) => (
        <text
          key={i}
          x={tx + 10}
          y={ty + 20 + i * 18}
          fontSize={i === 0 ? 12.5 : 12}
          fontWeight={i === 0 ? 600 : 400}
          fill={i === 0 ? 'var(--text)' : 'var(--muted)'}
        >
          {l}
        </text>
      ))}
    </g>
  )
}
