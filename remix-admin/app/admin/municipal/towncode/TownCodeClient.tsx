'use client'

import { useEffect, useMemo, useState } from 'react'
import MuniHeader from '@/app/admin/municipal/MuniHeader'
import MuniTabs from '@/app/admin/municipal/MuniTabs'
import Breadcrumbs, { type Crumb } from '../Breadcrumbs'
import { isOpen } from '@/lib/flavor'
import { sentimentColor } from '../sentiment'
import ClearableInput from '@/app/ClearableInput'
import type { CodeChapter, TownCodeDataset } from '@/lib/municipal/townCode'

const RATINGS = ['Good shape', 'Standard', 'Needs work'] as const
type Sort = 'attention' | 'chapter' | 'title'

function scoreColor(score: number): string {
  return sentimentColor(Math.max(-1, Math.min(1, (score - 50) / 50)))
}

function RatingBadge({ rating, score }: { rating: string; score: number }) {
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700,
        padding: '3px 9px', borderRadius: 999, background: scoreColor(score), color: '#0a0a0a',
        whiteSpace: 'nowrap',
      }}
    >
      {rating} <span style={{ opacity: 0.75, fontVariantNumeric: 'tabular-nums' }}>· {score}</span>
    </span>
  )
}

function ChapterRow({ ch, open, onToggle }: { ch: CodeChapter; open: boolean; onToggle: () => void }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 10 }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
          padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12, color: 'inherit',
        }}
      >
        <span className="muted" style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums', minWidth: 34, marginTop: 2 }}>
          §{ch.chapter}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{ch.title}</span>
            <RatingBadge rating={ch.rating} score={ch.progressScore} />
          </div>
          <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
            {ch.category}{ch.lastAmendment ? ` · Last amended ${ch.lastAmendment}` : ''}
          </div>
          {!open && (
            <div className="muted" style={{ fontSize: 12.5, marginTop: 6, lineHeight: 1.5 }}>{ch.summary}</div>
          )}
        </div>
        <span className="muted" style={{ fontSize: 18, lineHeight: 1, marginTop: 2, flexShrink: 0 }}>{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div style={{ padding: '0 16px 18px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, lineHeight: 1.6, margin: '14px 0' }}>{ch.summary}</div>

          <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
            Why this rating
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>{ch.ratingRationale}</div>

          {(ch.strengths?.length || ch.concerns?.length) ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 16 }}>
              {!!ch.strengths?.length && (
                <div>
                  <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Strengths</div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6 }}>
                    {ch.strengths.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
              {!!ch.concerns?.length && (
                <div>
                  <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Concerns</div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6 }}>
                    {ch.concerns.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
            </div>
          ) : null}

          {!!ch.recommendations?.length && (
            <div style={{ marginBottom: 16 }}>
              <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Recommendations
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ch.recommendations.map((r, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, lineHeight: 1.6 }}>
                    <span
                      style={{
                        flexShrink: 0, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
                        padding: '3px 8px', borderRadius: 999, background: 'var(--panel-2)', border: '1px solid var(--border)',
                        marginTop: 2, whiteSpace: 'nowrap',
                      }}
                    >
                      {r.lens}
                    </span>
                    <span>{r.suggestion}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
            How this compares
          </div>
          <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.6 }}>{ch.peerComparison}</div>
        </div>
      )}
    </div>
  )
}

export default function TownCodeClient({ userName }: { userName: string }) {
  const [muni, setMuni] = useState('')
  const [data, setData] = useState<TownCodeDataset | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('')
  const [rating, setRating] = useState<string>('')
  const [sort, setSort] = useState<Sort>('attention')
  const [openChapter, setOpenChapter] = useState<string | null>(null)

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const m = p.get('muni') || 'nc'
    setMuni(m)
    setLoading(true)
    fetch(`/admin/api/municipal/town-code?muni=${encodeURIComponent(m)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load'))))
      .then((d) => setData(d && d.available !== false ? d : null))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  const categories = useMemo(() => {
    if (!data) return []
    return Object.keys(data.meta.categoryCounts).sort((a, b) => data.meta.categoryCounts[b] - data.meta.categoryCounts[a])
  }, [data])

  const visible = useMemo(() => {
    if (!data) return []
    const q = query.trim().toLowerCase()
    let list = data.chapters.filter((c) => {
      if (category && c.category !== category) return false
      if (rating && c.rating !== rating) return false
      if (q && !(`${c.chapter} ${c.title}`.toLowerCase().includes(q))) return false
      return true
    })
    list = [...list]
    if (sort === 'attention') list.sort((a, b) => a.progressScore - b.progressScore)
    else if (sort === 'chapter') list.sort((a, b) => Number(a.chapter) - Number(b.chapter))
    else list.sort((a, b) => a.title.localeCompare(b.title))
    return list
  }, [data, query, category, rating, sort])

  const crumbs: Crumb[] = [
    { label: 'Dashboard', href: isOpen ? '/' : '/admin/municipal' },
    { label: 'Town Code' },
  ]

  return (
    <div className="container">
      <MuniHeader userName={userName} />
      <MuniTabs muni={muni || 'nc'} active="towncode" />

      {!isOpen && (
        <div style={{ marginBottom: 12 }}>
          <Breadcrumbs items={crumbs} />
        </div>
      )}

      <h1 className="page-title" style={{ marginBottom: 6 }}>Town Code</h1>

      {loading && <div className="muted" style={{ padding: 20 }}>Loading…</div>}

      {!loading && !data && (
        <div className="card"><div className="muted" style={{ padding: 20, fontSize: 13 }}>No Town Code review available for this town yet.</div></div>
      )}

      {data && (
        <>
          <div className="muted" style={{ fontSize: 13, lineHeight: 1.6, maxWidth: 760, marginBottom: 4 }}>
            An AI-generated, chapter-by-chapter review of the {data.meta.town} municipal code — {data.meta.source}.
            Each chapter is rated for clarity and currency, scored 0-100, and given recommendations tagged with
            whichever priority (business friendliness, government efficiency, fiscal impact, environmental
            protection, etc.) actually fits that chapter's substance.
          </div>
          <div className="muted" style={{ fontSize: 11.5, lineHeight: 1.6, maxWidth: 760, marginBottom: 22, fontStyle: 'italic' }}>
            {data.meta.methodologyNote}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 22 }}>
            <div className="card" style={{ padding: 14 }}>
              <div className="muted" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Chapters reviewed</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{data.meta.totalChapters}</div>
            </div>
            <div className="card" style={{ padding: 14 }}>
              <div className="muted" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Average score</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: scoreColor(data.meta.avgProgressScore) }}>{data.meta.avgProgressScore}</div>
            </div>
            {RATINGS.map((r) => (
              <div key={r} className="card" style={{ padding: 14 }}>
                <div className="muted" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{r}</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{data.meta.ratingCounts[r] ?? 0}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
            <ClearableInput
              value={query}
              onChange={setQuery}
              placeholder="Search chapters…"
              wrapperStyle={{ minWidth: 200 }}
              style={{ fontSize: 16, padding: '6px 10px', borderRadius: 6, background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
            <div className="pill-strip" style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {(['attention', 'chapter', 'title'] as Sort[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSort(s)}
                  className="btn secondary"
                  style={{ padding: '5px 10px', fontSize: 12, ...(sort === s ? { background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' } : {}) }}
                >
                  {s === 'attention' ? 'Needs attention first' : s === 'chapter' ? 'Chapter #' : 'A–Z'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            <button onClick={() => setRating('')} className="btn secondary" style={{ padding: '4px 10px', fontSize: 11.5, ...(rating === '' ? { background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' } : {}) }}>All ratings</button>
            {RATINGS.map((r) => (
              <button key={r} onClick={() => setRating(r === rating ? '' : r)} className="btn secondary" style={{ padding: '4px 10px', fontSize: 11.5, ...(rating === r ? { background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' } : {}) }}>{r}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
            <button onClick={() => setCategory('')} className="btn secondary" style={{ padding: '4px 10px', fontSize: 11.5, ...(category === '' ? { background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' } : {}) }}>All categories</button>
            {categories.map((c) => (
              <button key={c} onClick={() => setCategory(c === category ? '' : c)} className="btn secondary" style={{ padding: '4px 10px', fontSize: 11.5, ...(category === c ? { background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' } : {}) }}>
                {c} <span style={{ opacity: 0.7 }}>({data.meta.categoryCounts[c]})</span>
              </button>
            ))}
          </div>

          <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>{visible.length} of {data.meta.totalChapters} chapters</div>

          {visible.length === 0 ? (
            <div className="card"><div className="muted" style={{ padding: 20, fontSize: 13 }}>No chapters match your filters.</div></div>
          ) : (
            visible.map((ch) => (
              <ChapterRow
                key={ch.chapter}
                ch={ch}
                open={openChapter === ch.chapter}
                onToggle={() => setOpenChapter(openChapter === ch.chapter ? null : ch.chapter)}
              />
            ))
          )}

          {!isOpen && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
              <Breadcrumbs items={crumbs} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
