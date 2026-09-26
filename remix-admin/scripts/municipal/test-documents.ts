import assert from 'node:assert/strict'
import { meetingDocuments, packetCatalog } from '../../lib/municipal/documents'

const row=packetCatalog.find(r=>r.event_id==='1976')!
assert.ok(row)
const old=[{kind:'agenda',sourceUrl:row.packet_url,blobUrl:'https://example.com/cached.pdf',pageCount:90}]
const result=meetingDocuments('nc',row.event_url,old)
assert.equal(result.find(r=>r.sourceUrl===row.packet_url)?.kind,'agenda_packet')
assert.equal(result.find(r=>r.sourceUrl===row.packet_url)?.blobUrl,old[0].blobUrl)
assert.equal(result.find(r=>r.sourceUrl===row.agenda_url)?.kind,'agenda')
assert.deepEqual(meetingDocuments('nc',row.event_url,result),result)
assert.deepEqual(meetingDocuments('rockland',row.event_url,old),old)
assert.deepEqual(meetingDocuments('nc','https://example.com/event/999999/overview',old),old)
const future=meetingDocuments('nc','https://northcastleny.portal.civicclerk.com/event/999999/overview',[],{documentLinks:{agenda:'https://example.com/a.pdf',packet:'https://example.com/p.pdf'}})
assert.equal(future.length,2)
assert.equal(future[0].kind,'agenda_packet')
const supporting=meetingDocuments('nc','https://northcastleny.portal.civicclerk.com/event/2077/overview',[])
assert.equal(supporting.filter(r=>r.kind==='supporting_documents').length,1)
assert.ok(supporting.find(r=>r.kind==='supporting_documents')?.sourceUrl?.includes('event=2077'))
assert.deepEqual(meetingDocuments('nc','https://northcastleny.portal.civicclerk.com/event/2077/overview',supporting),supporting)
console.log('Document identity, packet relabeling, agenda preservation, idempotency and future metadata tests passed.')
