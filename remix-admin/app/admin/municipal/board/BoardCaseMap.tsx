'use client'

import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import type { AnalysisDataset } from '@/lib/municipal/analysis'
import { sentimentColor } from '../sentiment'
import type { PermitMarker } from '../JurisdictionMap'

const JurisdictionMap = dynamic(() => import('../JurisdictionMap'), {
  ssr: false,
  loading: () => <div className="card" style={{ height: 380, marginBottom: 20 }} />,
})

/**
 * Board's case/agenda-item map — pulled out of TranscriptAnalysis so it (and
 * the Meetings section right below it) can sit at the top of the page,
 * instead of the map being a separate section at the very bottom after all
 * the sentiment analysis. Single layer, always on (no menu), matching the
 * Building Department's permit map.
 */
export default function BoardCaseMap({ dataset, muni }: { dataset: AnalysisDataset | null; muni: string }) {
  const [mapYear, setMapYear] = useState<number | 'ALL'>('ALL')

  const isTownBoard = dataset?.meta.bodyKey === 'town_board'
  const itemNounTitle = isTownBoard ? 'agenda items' : 'applications'

  const mapYears = useMemo(() => {
    const ys = new Set<number>()
    for (const c of dataset?.cases ?? []) for (const ap of c.timeline) {
      const y = Number(ap.date.slice(0, 4))
      if (y) ys.add(y)
    }
    return Array.from(ys).sort((a, b) => b - a)
  }, [dataset])

  const caseMarkers = useMemo<PermitMarker[]>(() => {
    return (dataset?.cases ?? [])
      .filter((c) => c.address && /\d/.test(c.address))
      .filter((c) => mapYear === 'ALL' || c.timeline.some((ap) => Number(ap.date.slice(0, 4)) === mapYear))
      .map((c) => ({
        id: c.id,
        address: c.address as string,
        title: c.name,
        sub: [c.applicationType, c.lastStatus, `seen ${c.appearances}×`].filter(Boolean).join(' · '),
        color: sentimentColor(c.avgSentiment),
      }))
  }, [dataset, mapYear])

  if (!dataset) return null

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 0 10px' }}>
        <h3 style={{ fontSize: 14, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
          Map
          <span className="muted" style={{ fontSize: 12, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
            {' '}· {caseMarkers.length} {itemNounTitle} with a street address · pin color = sentiment
          </span>
        </h3>
        <select
          value={mapYear}
          onChange={(e) => setMapYear(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
          aria-label="Filter map by year"
          style={{ fontSize: 13, padding: '5px 10px', borderRadius: 6, background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
        >
          <option value="ALL">All years</option>
          {mapYears.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <JurisdictionMap
        muni={muni}
        permits={caseMarkers}
        permitsLabel={`${itemNounTitle[0].toUpperCase()}${itemNounTitle.slice(1)}`}
        permitsGroup="This board"
        onlyPermits
        height={380}
      />
    </div>
  )
}
