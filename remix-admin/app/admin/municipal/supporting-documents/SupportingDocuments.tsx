'use client'
import {useState} from 'react'
import catalog from '@/lib/municipal/data/nc-supporting-documents.json'
export default function SupportingDocuments({eventId}:{eventId?:string}) {
  const [query,setQuery]=useState('')
  const [selected,setSelected]=useState(eventId || '')
  const rows=catalog.filter(r=>(!selected || r.event_id===selected) && `${r.date} ${r.documents.map(d=>d.name+' '+d.label).join(' ')}`.toLowerCase().includes(query.toLowerCase()))
  return <>
    <label htmlFor="support-search">Find a date, address, or document</label>
    <input id="support-search" type="search" value={query} onChange={e=>setQuery(e.target.value)} style={{display:'block',width:'100%',padding:12,margin:'8px 0 16px',background:'transparent',color:'inherit',border:'1px solid #888',borderRadius:6}}/>
    {selected && <button className="btn secondary" onClick={()=>setSelected('')}>Show all meetings</button>}
    <p aria-live="polite">{rows.length} {rows.length===1?'meeting':'meetings'} · {rows.reduce((n,r)=>n+r.documents.length,0)} linked documents</p>
    {rows.map(r=><details key={r.event_id} open={!!selected} style={{padding:'14px 0',borderBottom:'1px solid #ccc'}}>
      <summary style={{cursor:'pointer'}}>{r.date} · Planning Board · {r.documents.length} documents</summary>
      <p><a href={r.agenda_url} target="_blank" rel="noopener noreferrer">Original agenda ↗</a>{' · '}<a href={r.event_url} target="_blank" rel="noopener noreferrer">Meeting source ↗</a></p>
      <ul>{r.documents.map(d=><li key={d.url} style={{padding:'8px 0',overflowWrap:'anywhere'}}>
        <a href={d.url} target="_blank" rel="noopener noreferrer">{d.label} · {d.name.replace(/\.pdf$/i,'')}</a>
        <small style={{display:'block'}}>Linked on agenda page {d.agenda_page}</small>
      </li>)}</ul>
    </details>)}
  </>
}
