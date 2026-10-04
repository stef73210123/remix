'use client'

import { useEffect, useState } from 'react'
import { Mail, Building2 } from 'lucide-react'

/**
 * "Write to this board" actions, directly under the board page title.
 *
 * Two deliberately distinct routes, because they are not the same thing:
 *   • the board itself — a mailto addressed to every sitting member, so a
 *     resident can reach the people who actually vote; and
 *   • the office that keeps the board's file (Planning Department for the
 *     land-use boards, Town Clerk for the Town Board) — the official,
 *     always-published channel, and the one that puts a letter in the record.
 *
 * Where a board's member addresses are personal or business inboxes rather
 * than municipal ones (North Castle assigns none to its appointed boards), the
 * caveat travels with the button rather than being left for the reader to
 * discover on a member's profile page.
 */

interface Recipient { name: string; role: string; email: string; note: string }
interface Office { label: string; email: string; blurb: string }
interface Payload { board: { label: string; members: Recipient[] }; office: Office | null }

const BTN: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600,
  padding: '7px 13px', borderRadius: 8, textDecoration: 'none', whiteSpace: 'nowrap',
}

export default function BoardContactActions({ muni, body }: { muni: string; body: string }) {
  const [data, setData] = useState<Payload | null>(null)

  useEffect(() => {
    if (!muni || !body) return
    let live = true
    fetch(`/admin/api/municipal/board-contacts?muni=${encodeURIComponent(muni)}&body=${encodeURIComponent(body)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Payload | null) => { if (live && d && !('error' in d)) setData(d) })
      .catch(() => {})
    return () => { live = false }
  }, [muni, body])

  if (!data) return null
  const { board, office } = data
  const members = board.members
  if (members.length === 0 && !office) return null

  // The per-member note is written for a single profile card ("...to this
  // member"); at board level the same fact needs its plural form, said once.
  const unofficial = members.some((m) => m.note)
  const roster = members.map((m) => (m.role ? `${m.name} (${m.role})` : m.name)).join(', ')

  return (
    <div style={{ margin: '0 0 18px' }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {members.length > 0 && (
          <a
            href={`mailto:${members.map((m) => m.email).join(',')}`}
            className="btn"
            style={BTN}
            title={`Opens a new message addressed to all ${members.length} sitting members: ${roster}`}
          >
            <Mail size={14} aria-hidden />
            Email the {board.label}
            <span style={{ fontWeight: 400, opacity: 0.75 }}>· {members.length} members</span>
          </a>
        )}
        {office && (
          <a href={`mailto:${office.email}`} className="btn secondary" style={BTN} title={office.blurb}>
            <Building2 size={14} aria-hidden />
            Contact the {office.label}
          </a>
        )}
      </div>
      {(unofficial || office) && (
        <div className="muted" style={{ fontSize: 11.5, marginTop: 7, lineHeight: 1.5, maxWidth: 760 }}>
          {unofficial && (
            <>
              The Town publishes no individual email addresses for {board.label} members; these are the
              inboxes at which they actually receive board correspondence.{' '}
            </>
          )}
          {office && <>Writing to the {office.label} ({office.email}) puts your message in the official file.</>}
        </div>
      )}
    </div>
  )
}
