# September 2026 archive sweep

The September 26 refresh inspected 1,150 CivicClerk event records dated January 2018 through September 26, 2026. The source API was paginated by 15 records with duplicate-page checks. The catalog is a dated snapshot, not a claim that every historical packet was published or remains available.

## Documents

- `nc-packets.json` contains 87 non-placeholder published packet links. Separate agenda links are retained. Of 222 files labeled “Agenda Packet,” 126 contained only a no-agenda notice and nine rendered as blank pages; those 135 are excluded.
- The sweep examined all 130 published Planning Board agenda PDFs in this range. `nc-supporting-documents.json` exposes 884 source hyperlinks from 39 agendas, with the original agenda page number. These are separate submissions and supporting records, not newly assembled official packets. External linked documents were indexed, not individually content-reviewed.
- Packet files can be very large, including one approximately 299 MB file. 79 completed full-body HTTP PDF checks; six additional large files were confirmed by PDF response headers/signature. Two large published links timed out during the content check and remain source-published links, not content-verified documents.
- Future CivicClerk discovery now preserves both plain-agenda and packet URLs in meeting metadata. The read layer relabels previously stored packets as “Full packet” and adds the separate agenda without altering source files or overwriting stored assets.

Sources: [CivicClerk portal](https://northcastleny.portal.civicclerk.com/), [September 14 Planning Board agenda](https://northcastleny.api.civicclerk.com/v1/Meetings/GetMeetingFileStream(fileId=2541,plainText=false)).

## Transcripts

New transcripts use local `Systran/faster-distil-whisper-large-v3` automatic speech recognition, English, int8, voice-activity detection, five-minute checkpoints. Earlier checkpoints used beam decoding; resumed work uses bounded greedy decoding. They are not official minutes and do not assert verified speaker identities.

Recording duration, timestamp sequence, source board/date, and opening/closing content are checked before integration. Proper names, numbers and ASR wording remain unverified. Existing transcripts and analytical datasets are not overwritten or reinterpreted.

## Verification

The document identity tests cover exact CivicClerk event matching, retaining cached PDF assets, separate agendas, idempotent merging, unrelated municipalities, and future import metadata. Browser checks cover packet search, reset and empty states, both date-sort directions, separate packet and agenda targets, transcript retrieval, supporting-document access, and mobile overflow.
