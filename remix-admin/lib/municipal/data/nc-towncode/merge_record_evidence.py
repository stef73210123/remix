#!/usr/bin/env python3
"""Fold Town Code evidence from newly ingested meeting transcripts into analysis.json.

The original recordEvidence layer (PR #200) was a one-off three-pass extraction
over a 263-transcript archive, with no committed script. This is the minimum
needed to keep it current as the weekly transcript ingest adds meetings:

    python3 merge_record_evidence.py <candidates_dir>

<candidates_dir> holds one `<board-dir>-<YYYY-MM-DD>.towncode.json` per new
meeting, of the form
    {"citations": [{"chapter", "section", "timestamp", "basis": "spoken"|"inferred", "context"}],
     "findings":  [{"chapter", "section"?, "sectionBasis": "spoken"|"inferred", "flawType",
                    "quote", "attribution", "meeting", "corroboration"?}],
     "episodes":  {"<chapter>": <int>}}            # optional; default 1 per chapter with findings

Rules it applies:
  - Only *spoken* citations count toward citingUtterances / meetingsCiting, matching
    the original citation pass ("verified citing utterances"). Inferred ones are
    recorded nowhere but the candidate file.
  - Every merged finding keeps `sectionBasis` so the page can say whether the
    chapter/section was cited aloud or inferred from the subject matter.
  - A chapter with no recordEvidence block gets one created.
  - Idempotent: meetings already listed in record_ingest_log.json are skipped.
"""
import json, os, sys, glob, re

HERE = os.path.dirname(os.path.abspath(__file__))
ANALYSIS = os.path.join(HERE, "analysis.json")
LOG = os.path.join(HERE, "record_ingest_log.json")
BOARD_NAMES = {"nc-townboard": "Town Board", "nc-planning": "Planning Board",
               "nc-zba": "Zoning Board of Appeals", "nc-arb": "Architectural Review Board"}


def main(cand_dir):
    data = json.load(open(ANALYSIS))
    log = json.load(open(LOG)) if os.path.exists(LOG) else {"meetings": []}
    done = set(log["meetings"])
    chapters = {c["chapter"]: c for c in data["chapters"]}
    corpus = data.get("recordCorpus")

    for path in sorted(glob.glob(os.path.join(cand_dir, "*.towncode.json"))):
        m = re.match(r"(nc-[a-z]+)-(\d{4}-\d{2}-\d{2})\.towncode\.json$", os.path.basename(path))
        if not m:
            continue
        board_dir, date = m.groups()
        key = f"{board_dir}/{date}"
        if key in done:
            print(f"skip {key} (already merged)")
            continue
        cand = json.load(open(path))

        spoken = {}
        for c in cand.get("citations", []):
            if c.get("basis") == "spoken":
                spoken[c["chapter"]] = spoken.get(c["chapter"], 0) + 1
        by_ch = {}
        for f in cand.get("findings", []):
            if f["chapter"] not in chapters:
                sys.exit(f"{path}: unknown chapter {f['chapter']}")
            if f.get("sectionBasis") not in ("spoken", "inferred"):
                sys.exit(f"{path}: finding without sectionBasis spoken|inferred")
            by_ch.setdefault(f["chapter"], []).append(f)

        for ch_no in set(spoken) | set(by_ch):
            ch = chapters.get(ch_no)
            if ch is None:
                print(f"  {key}: citation of unknown chapter {ch_no} ignored")
                continue
            ev = ch.get("recordEvidence")
            if ev is None:
                ev = ch["recordEvidence"] = {
                    "verdict": "First criticism on the record (weekly transcript ingest)",
                    "criticismEpisodes": 0, "citingUtterances": 0, "meetingsCiting": 0, "findings": []}
            if ch_no in spoken:
                ev["citingUtterances"] += spoken[ch_no]
                ev["meetingsCiting"] += 1
            if ch_no in by_ch:
                ev["criticismEpisodes"] += int(cand.get("episodes", {}).get(ch_no, 1))
                for f in by_ch[ch_no]:
                    ev["findings"].append({k: f[k] for k in
                        ("section", "sectionBasis", "flawType", "quote", "attribution", "meeting", "corroboration")
                        if f.get(k)})
            print(f"  {key}: ch {ch_no} +{spoken.get(ch_no, 0)} spoken citations, +{len(by_ch.get(ch_no, []))} findings")

        if corpus:
            corpus["totalTranscripts"] += 1
            name = BOARD_NAMES[board_dir]
            corpus["byBoard"][name] = corpus["byBoard"].get(name, 0) + 1
        log["meetings"].append(key)

    with open(ANALYSIS, "w") as fh:
        json.dump(data, fh, indent=2, ensure_ascii=False)  # matches the committed file's format
    with open(LOG, "w") as fh:
        json.dump(log, fh, indent=2)
        fh.write("\n")


if __name__ == "__main__":
    main(sys.argv[1])
