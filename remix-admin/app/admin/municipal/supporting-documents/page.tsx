import SupportingDocuments from './SupportingDocuments'
export default async function SupportingPage({searchParams}:{searchParams:Promise<{event?:string}>}) {
  return <main style={{padding:'32px 20px',maxWidth:1100,margin:'0 auto'}}>
    <a href="/admin/municipal/packets">← Full packet archive</a>
    <h1>Planning Board supporting documents</h1>
    <p>Direct links extracted from the Town’s published agendas: applicant submissions, review memos, notices, resolutions and minutes. These are separate source documents, not a Town-issued combined packet. External availability may change.</p>
    <SupportingDocuments eventId={(await searchParams).event}/>
  </main>
}
