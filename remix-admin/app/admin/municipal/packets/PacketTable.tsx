'use client'
import { useState } from 'react'
import { packetCatalog } from '@/lib/municipal/documents'

export default function PacketTable() {
  const [query, setQuery] = useState('')
  const [ascending, setAscending] = useState(false)
  const rows = packetCatalog.filter(p => `${p.date} ${p.board} ${p.packet_name}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a,b) => (ascending ? 1 : -1) * a.date.localeCompare(b.date))
  return <>
    <label htmlFor="packet-search">Find a date, board, or packet</label>
    <input id="packet-search" type="search" value={query} onChange={e=>setQuery(e.target.value)} style={{ display:'block', width:'100%', padding:12, margin:'8px 0 16px', color:'inherit', background:'transparent', border:'1px solid #888', borderRadius:6 }} />
    <p aria-live="polite">{rows.length} of {packetCatalog.length} packets</p>
    <div style={{ overflowX:'auto' }}><table style={{ width:'100%', textAlign:'left', borderCollapse:'collapse' }}>
      <thead><tr><th aria-sort={ascending ? 'ascending' : 'descending'}><button onClick={()=>setAscending(!ascending)}>Date {ascending ? '↑' : '↓'}</button></th><th>Board</th><th>Documents</th></tr></thead>
      <tbody>{rows.map(p=><tr key={`${p.event_id}-${p.packet_file_id}`}>
        <td style={{ padding:'12px 8px', whiteSpace:'nowrap' }}>{p.date}</td>
        <td style={{ padding:'12px 8px' }}>{p.board}</td>
        <td style={{ padding:'12px 8px' }}><a href={p.packet_url} target="_blank" rel="noopener noreferrer">Full packet ↗</a>
          {p.agenda_url && <> · <a href={p.agenda_url} target="_blank" rel="noopener noreferrer">Agenda ↗</a></>}
          {' · '}<a href={p.event_url} target="_blank" rel="noopener noreferrer">Meeting ↗</a></td>
      </tr>)}</tbody>
    </table></div>
  </>
}
