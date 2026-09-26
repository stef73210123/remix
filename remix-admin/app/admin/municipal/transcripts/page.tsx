import { listTranscriptDates } from '@/lib/municipal/analysis'

export const dynamic = 'force-dynamic'
export default function TranscriptsPage() {
  const boards = { planning:'Planning Board', town_board:'Town Board', zba:'Zoning Board of Appeals', ethics:'Board of Ethics' }
  const rows = Object.entries(boards).flatMap(([key,name])=>listTranscriptDates('nc',key).map(date=>({key,name,date}))).sort((a,b)=>b.date.localeCompare(a.date))
  return <main style={{ padding:'32px 20px', maxWidth:1000, margin:'0 auto' }}>
    <a href="/admin/municipal">← Municipal archive</a>
    <h1>Meeting transcripts</h1>
    <p>Automated transcripts are not official minutes. Speaker identities, names, and figures may be inaccurate and should be checked against the recordings. <a href="/admin/municipal/packets">Browse full packets</a>.</p>
    <p>{rows.length} meeting transcripts available.</p>
    <ul>{rows.map(r=><li key={`${r.key}-${r.date}`} style={{ padding:'8px 0' }}>
      <a href={`/admin/api/municipal/transcript?muni=nc&body=${r.key}&date=${r.date}`}>{r.date} · {r.name}</a>
    </li>)}</ul>
  </main>
}
