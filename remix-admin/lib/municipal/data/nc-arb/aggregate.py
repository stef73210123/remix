#!/usr/bin/env python3
"""Aggregate per-meeting NC Architectural Review Board analyses into one canonical dataset.

Same pipeline as ../nc-townboard and ../nc-planning, but this board currently
has only a single meeting in the source archive (broader ARB coverage wasn't
recoverable) and no confirmed board-member roster — no individual was named
with even low confidence in that meeting, so MEMBERS is intentionally empty.

Reads scratchpad/backfill/arb/<date>.json (one per meeting), validates loosely, and
emits the same AnalysisDataset shape as the other boards.

Output -> remix-admin/lib/municipal/data/nc-arb/analysis.json
"""
import os, sys, json, glob, statistics, re
from collections import defaultdict

ANALYSIS_DIR = sys.argv[1] if len(sys.argv) > 1 else \
    "/tmp/claude-0/-home-user-remix/b0a705c0-ebcc-5843-9285-596a9c2102ea/scratchpad/backfill/arb"
OUT = sys.argv[2] if len(sys.argv) > 2 else \
    "/home/user/remix/remix-admin/lib/municipal/data/nc-arb/analysis.json"

# No board-member roster yet — the sole meeting in this archive never named an
# individual member with even low confidence. Add names here once a future
# meeting confirms them.
MEMBERS = []
INACTIVE = []
MEMBER_ALIAS = {}

def canon_member(name):
    n = re.sub(r"\s+", " ", str(name or "").strip()).lower()
    if n in MEMBER_ALIAS:
        return MEMBER_ALIAS[n]
    for k, v in MEMBER_ALIAS.items():
        if k in n:
            return v
    return None

THEME_RULES = [
    ("Land use, zoning & special permits", ["zoning", "special permit", "special use", "site plan",
                                             "setback", "subdivision", "land use", "height/zoning"]),
    ("Architectural design & exteriors", ["architectural", "design", "facade", "roofline", "siding",
                                            "exterior", "second-story", "second story", "addition",
                                            "renovation", "garage", "accessory structure"]),
    ("Open government & procedure", ["procedure", "remote", "zoom", "meeting administration", "recording"]),
    ("Resident concerns & quality of life", ["resident concern", "quality of life", "complaint",
                                              "neighbor", "nuisance", "decoration"]),
    ("Permits & licensing", ["permit", "license", "code enforcement"]),
]

def canon_theme(raw):
    t = re.sub(r"\s+", " ", str(raw).strip().lower())
    if not t:
        return None
    for canon, kws in THEME_RULES:
        for kw in kws:
            if kw in t:
                return canon
    return "Other"

def clamp(x):
    try:
        x = float(x)
    except (TypeError, ValueError):
        return 0.0
    return max(-1.0, min(1.0, x))

def load():
    files = sorted(glob.glob(os.path.join(ANALYSIS_DIR, "20*.json")))
    meetings, errors = [], []
    for f in files:
        try:
            with open(f) as fh:
                d = json.load(fh)
            d.setdefault("date", os.path.basename(f)[:10])
            d.setdefault("cases", [])
            d.setdefault("themes", [])
            d.setdefault("staffInput", [])
            meetings.append(d)
        except Exception as e:
            errors.append(f"{os.path.basename(f)}: {e}")
    meetings.sort(key=lambda m: m["date"])
    return meetings, errors

def roll_themes(meetings):
    agg = defaultdict(lambda: {"count": 0, "sentiments": [], "saliences": [], "timeline": []})
    for m in meetings:
        per = defaultdict(lambda: {"sent": [], "sal": []})
        for t in m.get("themes", []):
            key = canon_theme(t.get("theme", ""))
            if not key:
                continue
            per[key]["sent"].append(clamp(t.get("sentiment", 0)))
            per[key]["sal"].append(max(0.0, clamp(t.get("salience", 0))))
        for key, v in per.items():
            s = statistics.mean(v["sent"]) if v["sent"] else 0.0
            sal = statistics.mean(v["sal"]) if v["sal"] else 0.0
            a = agg[key]
            a["count"] += 1
            a["sentiments"].append(s)
            a["saliences"].append(sal)
            a["timeline"].append({"date": m["date"], "sentiment": round(s, 3), "salience": round(sal, 3)})
    out = []
    for k, a in agg.items():
        out.append({
            "theme": k,
            "meetings": a["count"],
            "avgSentiment": round(statistics.mean(a["sentiments"]), 3) if a["sentiments"] else 0.0,
            "avgSalience": round(statistics.mean(a["saliences"]), 3) if a["saliences"] else 0.0,
            "timeline": sorted(a["timeline"], key=lambda x: x["date"]),
        })
    out.sort(key=lambda x: (-x["meetings"], -x["avgSalience"]))
    return out

def case_key(c):
    base = c.get("address") or c.get("name") or c.get("id") or ""
    k = str(base).lower()
    k = re.sub(r"\(.*?\)", " ", k)
    k = re.split(r"[—–\-:]| discussion| extension| amended| subdivision", k)[0]
    k = re.sub(r"[^a-z0-9 ]", " ", k)
    k = re.sub(r"\s+", " ", k).strip()
    return k or (c.get("id") or "")

def slugify(k):
    return re.sub(r"\s+", "-", str(k).strip())[:80] or "case"

_BOILERPLATE = re.compile(
    r"approval of .*minutes|adoption of .*minutes|pledge of allegiance|roll call|"
    r"call to order|moment of silence|adjournment|adjourn\b|executive session|"
    r"approval of the agenda|approval of agenda|correspondence|announcements",
    re.I,
)
def is_boilerplate(c):
    return bool(_BOILERPLATE.search(str(c.get("name", "")) + " " + str(c.get("id", ""))))

def resolve_case(c):
    cur = slugify(case_key(c))
    return {"id": cur, "name": c.get("name", cur), "address": c.get("address", ""),
            "type": c.get("applicationType", "")}

def roll_cases(meetings):
    agg = defaultdict(lambda: {"id": "", "name": "", "address": "", "type": "", "applicant": "",
                               "themes": set(), "appearances": [], "sentiments": []})
    for m in meetings:
        for c in m.get("cases", []):
            if is_boilerplate(c):
                continue
            rc = resolve_case(c)
            cid = rc["id"]
            if not cid:
                continue
            a = agg[cid]
            a["id"] = rc["id"]
            a["name"] = rc["name"] or a["name"] or c.get("name", cid)
            a["address"] = rc["address"] or a["address"] or c.get("address", "")
            a["type"] = rc["type"] or a["type"] or c.get("applicationType", "")
            a["applicant"] = a["applicant"] or c.get("applicant", "")
            for t in c.get("themes", []):
                ct = canon_theme(t)
                if ct:
                    a["themes"].add(ct)
            s = clamp(c.get("sentimentScore", 0))
            a["sentiments"].append(s)
            a["appearances"].append({
                "date": m["date"], "status": c.get("status", ""),
                "sentiment": s, "summary": c.get("summary", ""),
            })
    out = []
    for cid, a in agg.items():
        a["appearances"].sort(key=lambda x: x["date"])
        out.append({
            "id": slugify(cid), "name": a["name"], "address": a["address"],
            "applicationType": a["type"], "applicant": a["applicant"],
            "themes": sorted(a["themes"]),
            "appearances": len(a["appearances"]),
            "firstSeen": a["appearances"][0]["date"] if a["appearances"] else "",
            "lastSeen": a["appearances"][-1]["date"] if a["appearances"] else "",
            "lastStatus": a["appearances"][-1]["status"] if a["appearances"] else "",
            "avgSentiment": round(statistics.mean(a["sentiments"]), 3) if a["sentiments"] else 0.0,
            "trajectory": [{"date": ap["date"], "sentiment": ap["sentiment"], "status": ap["status"]}
                           for ap in a["appearances"]],
            "timeline": a["appearances"],
        })
    out.sort(key=lambda x: (-x["appearances"], x["firstSeen"]))
    return out

def roll_members(meetings):
    prof = {m: {"positions": [], "byTheme": defaultdict(list), "byCase": defaultdict(list),
                "evidence": [], "confidence": defaultdict(int)} for m in MEMBERS}
    for m in meetings:
        for c in m.get("cases", []):
            if is_boilerplate(c):
                continue
            rc = resolve_case(c)
            cid = rc["id"]
            cname = rc["name"] or c.get("name", cid)
            for p in c.get("memberPositions", []):
                who = canon_member(p.get("member", ""))
                if not who:
                    continue
                score = clamp(p.get("score", 0))
                conf = str(p.get("confidence", "low")).lower()
                prof[who]["positions"].append(score)
                prof[who]["confidence"][conf] += 1
                cthemes = [ct for ct in (canon_theme(t) for t in p.get("themes", [])) if ct]
                for ct in set(cthemes):
                    prof[who]["byTheme"][ct].append(score)
                prof[who]["byCase"][cid].append(score)
                if p.get("evidence"):
                    prof[who]["evidence"].append({
                        "date": m["date"], "case": cname, "caseId": cid,
                        "stance": p.get("stance", ""), "score": score,
                        "themes": sorted(set(cthemes)),
                        "evidence": p.get("evidence", ""), "confidence": conf,
                    })
    out = []
    for who, d in prof.items():
        by_theme = [{"theme": t, "count": len(v), "avgSentiment": round(statistics.mean(v), 3)}
                    for t, v in d["byTheme"].items()]
        by_theme.sort(key=lambda x: (-x["count"], x["theme"]))
        by_case = [{"caseId": c, "count": len(v), "avgSentiment": round(statistics.mean(v), 3)}
                   for c, v in d["byCase"].items()]
        by_case.sort(key=lambda x: -x["count"])
        out.append({
            "member": who,
            "totalPositions": len(d["positions"]),
            "avgSentiment": round(statistics.mean(d["positions"]), 3) if d["positions"] else 0.0,
            "confidenceMix": dict(d["confidence"]),
            "byTheme": by_theme,
            "byCase": by_case,
            "evidence": sorted(d["evidence"], key=lambda x: x["date"]),
        })
    out.sort(key=lambda x: -x["totalPositions"])
    return out

def canonicalize_meeting_themes(meetings):
    for m in meetings:
        for c in m.get("cases", []):
            c["themes"] = sorted({ct for ct in (canon_theme(t) for t in c.get("themes", [])) if ct})
        merged = {}
        for t in m.get("themes", []):
            ct = canon_theme(t.get("theme", ""))
            if not ct:
                continue
            cur = merged.get(ct)
            if not cur:
                merged[ct] = {"theme": ct, "salience": clamp(t.get("salience", 0)),
                              "sentiment": clamp(t.get("sentiment", 0)), "note": t.get("note", "")}
            else:
                cur["salience"] = max(cur["salience"], clamp(t.get("salience", 0)))
        m["themes"] = sorted(merged.values(), key=lambda x: -x["salience"])

def canonicalize_meeting_members(meetings):
    for m in meetings:
        for c in m.get("cases", []):
            merged = {}
            for p in c.get("memberPositions", []):
                who = canon_member(p.get("member", ""))
                if not who:
                    continue
                if who not in merged:
                    merged[who] = {
                        "member": who, "stance": p.get("stance", ""),
                        "score": clamp(p.get("score", 0)),
                        "themes": list(p.get("themes", [])),
                        "evidence": p.get("evidence", ""),
                        "confidence": str(p.get("confidence", "low")).lower(),
                        "_n": 1,
                    }
                else:
                    e = merged[who]
                    n = e["_n"]
                    e["score"] = round((e["score"] * n + clamp(p.get("score", 0))) / (n + 1), 3)
                    e["_n"] = n + 1
                    if p.get("evidence") and len(p.get("evidence", "")) > len(e["evidence"]):
                        e["evidence"] = p["evidence"]
                        e["stance"] = p.get("stance", e["stance"])
                    for t in p.get("themes", []):
                        if t not in e["themes"]:
                            e["themes"].append(t)
            for e in merged.values():
                e.pop("_n", None)
            c["memberPositions"] = list(merged.values())

def main():
    meetings, errors = load()
    canonicalize_meeting_themes(meetings)
    canonicalize_meeting_members(meetings)
    themes = roll_themes(meetings)
    cases = roll_cases(meetings)
    members = roll_members(meetings)
    meeting_summary = []
    for m in meetings:
        cs = [clamp(c.get("sentimentScore", 0)) for c in m.get("cases", [])]
        meeting_summary.append({
            "date": m["date"],
            "cases": len(m.get("cases", [])),
            "avgSentiment": round(statistics.mean(cs), 3) if cs else 0.0,
            "attributionCoverage": m.get("attributionCoverage", "unknown"),
        })
    total_positions = sum(mem["totalPositions"] for mem in members)
    dataset = {
        "meta": {
            "board": "Architectural Review Board",
            "muniKey": "nc",
            "bodyKey": "arb",
            "town": "Town of North Castle",
            "meetings": len(meetings),
            "cases": len(cases),
            "themes": len(themes),
            "memberPositions": total_positions,
            "roster": MEMBERS,
            "inactiveMembers": INACTIVE,
            "source": "Meeting video transcripts (ASR, un-diarized); member attribution is name-based with per-position confidence.",
            "errors": errors,
        },
        "meetingTimeline": meeting_summary,
        "themes": themes,
        "cases": cases,
        "members": members,
        "meetings": meetings,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as fh:
        json.dump(dataset, fh, indent=2)
    print(f"meetings={len(meetings)} cases={len(cases)} themes={len(themes)} memberPositions={total_positions}")
    if errors:
        print("ERRORS:", errors)
    print("wrote", OUT)

if __name__ == "__main__":
    main()
