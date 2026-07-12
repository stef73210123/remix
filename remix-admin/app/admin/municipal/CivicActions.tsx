'use client'

import { useState } from 'react'
import Lightbox from './Lightbox'

/**
 * Resident quick-actions: file a FOIL (records) request and report a local
 * issue. Both open the relevant Town portal in a lightbox (with an
 * open-in-new-tab fallback). Rendered on the dashboard and the Building
 * Department page.
 */
const FOIL_URL = 'https://townofnorthcastleny.nextrequest.com/requests/new'
const ISSUE_URL = 'https://seeclickfix.com/web_portal/xySqEvzKUB7M2o5JGPYaBdMG/report/category'

export default function CivicActions({ style }: { style?: React.CSSProperties }) {
  const [open, setOpen] = useState<null | { url: string; title: string }>(null)
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', ...style }}>
      <a
        href={FOIL_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="btn"
        style={{ padding: '8px 14px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 7, textDecoration: 'none' }}
      >
        <span aria-hidden>📄</span> File a FOIL request ↗
      </a>
      <button
        className="btn secondary"
        style={{ padding: '8px 14px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 7 }}
        onClick={() => setOpen({ url: ISSUE_URL, title: 'Report an issue — North Castle (SeeClickFix)' })}
      >
        <span aria-hidden>📍</span> Report an issue
      </button>
      {open && <Lightbox url={open.url} title={open.title} onClose={() => setOpen(null)} />}
    </div>
  )
}
