import PacketTable from './PacketTable'

export default function PacketsPage() {
  return <main className="container" style={{ padding: '32px 20px', maxWidth: 1100, margin: '0 auto' }}>
    <a href="/admin/municipal">← Municipal archive</a>
    <h1>Full meeting packets</h1>
    <p>Published North Castle meeting packets, with separate agendas retained. These are source documents, not transcripts or official minutes. This index covers published packets found in the CivicClerk historical sweep.</p>
    <p>Meetings without a published packet are not listed. <a href="/admin/municipal/transcripts">Browse transcripts</a>.</p>
    <p>For Planning Board meetings that publish materials separately, <a href="/admin/municipal/supporting-documents">browse applicant submissions and supporting documents</a>. Blank files and “no agenda” placeholders have been excluded from this packet index.</p>
    <PacketTable />
  </main>
}
