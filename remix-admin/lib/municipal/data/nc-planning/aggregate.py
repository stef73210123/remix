#!/usr/bin/env python3
"""Aggregate per-meeting NC Planning Board analyses into one canonical dataset.

Reads scratchpad/analysis/<date>.json (one per meeting), validates loosely, and
emits:
  - meetings: the per-meeting analyses (sorted by date)
  - themes: roll-up across all meetings (frequency, avg sentiment, salience, timeline)
  - cases: roll-up per case id (appearances across meetings, sentiment trajectory, themes)
  - members: per-member sentiment profile (overall, by theme, by case, evidence samples)
  - meta: counts, coverage, generatedFor

Output → remix-admin/lib/municipal/data/nc-planning-analysis.json
"""
import os, sys, json, glob, statistics, re
from collections import defaultdict

ANALYSIS_DIR = sys.argv[1] if len(sys.argv) > 1 else \
    "/tmp/claude-0/-home-user-remix/ac57f52e-f832-54fb-b274-8c9820094f5b/scratchpad/analysis"
OUT = sys.argv[2] if len(sys.argv) > 2 else \
    "/home/user/remix/remix-admin/lib/municipal/data/nc-planning/analysis.json"

# Canonical board roster (from the town's official Board Members list). The
# per-meeting analyses used provisional labels before the roster was confirmed;
# ALIAS maps those to the real names. Notably the presiding "Chair" and the
# member addressed as "Christopher" are the SAME person — Christopher Carthy.
MEMBERS = ["Christopher Carthy", "Steven Sauro", "Michael Pollack", "Thomas Crispi", "Lawrence Ruisi"]
MEMBER_ALIAS = {
    "chair": "Christopher Carthy",
    "christopher": "Christopher Carthy",
    "christopher carthy": "Christopher Carthy",
    "chris": "Christopher Carthy",
    "larry ruizi": "Lawrence Ruisi",
    "lawrence ruisi": "Lawrence Ruisi",
    "larry": "Lawrence Ruisi",
    "michael pollock": "Michael Pollack",
    "michael pollack": "Michael Pollack",
    "mike": "Michael Pollack",
    "steve sorrell": "Steven Sauro",
    "steven sauro": "Steven Sauro",
    "steve": "Steven Sauro",
    "thomas crispi": "Thomas Crispi",
    "tom crispi": "Thomas Crispi",
    "tom": "Thomas Crispi",
}

def canon_member(name):
    n = re.sub(r"\s+", " ", str(name or "").strip()).lower()
    if n in MEMBER_ALIAS:
        return MEMBER_ALIAS[n]
    for k, v in MEMBER_ALIAS.items():
        if k in n:
            return v
    return None

# Canonical theme vocabulary. Each raw theme string (from a per-meeting agent) is
# scanned for keywords in THIS ORDER; first match wins. Keeps the theme list tight
# instead of 100+ near-duplicate phrasings ("stormwater" vs "stormwater / drainage").
THEME_RULES = [
    ("Wetlands & buffers", ["wetland", "buffer"]),
    ("Stormwater & drainage", ["stormwater", "drainage", "erosion", "runoff", "soil erosion"]),
    ("Steep slopes & rock removal", ["steep slope", "rock", "grading", "geotech", "blast",
                                      "seismic", "vibration", "excavat", "hammer", "fill", "quarry"]),
    ("Retaining walls", ["retaining wall", "wall height", "wall"]),
    ("Tree removal & screening", ["tree", "screening", "landscap", "vegetation", "planting",
                                   "buffer plant", "invasive", "clearing"]),
    ("Parking, traffic & access", ["parking", "traffic", "circulation", "curb cut", "driveway",
                                    "access", "easement", "sidewalk", "road width"]),
    ("Septic & water supply", ["septic", "sanitary", "well", "water supply", "contamination",
                                "soil test", "sewer"]),
    ("Lighting", ["lighting", "photometric", "light "]),
    ("Signage", ["sign", "signage"]),
    ("Historic & scenic character", ["historic", "scenic", "viewshed", "view shed", "character", "aesthetic"]),
    ("Neighbor concerns & safety", ["neighbor", "privacy", "safety", "golf ball", "netting",
                                     "liability", "insurance", "nuisance", "noise", "hazard",
                                     "dust", "truck", "construction logistics"]),
    ("Bonding & maintenance", ["bond", "deed restriction", "maintenance", "enforceab", "escrow"]),
    ("Process & procedure", ["procedure", "process", "precedent", "rprc", "arb sequenc",
                              "meeting procedure", "clean-up", "clean up", "referral sequenc"]),
    ("Time extensions & conditions", ["extension", "expiration", "resolution condition",
                                       "approval condition", "renewal", "conditions"]),
    ("Zoning & land use", ["zoning", "special permit", "special use", "variance", "subdivision",
                            "lot line", "density", "coverage", "setback", "use ", "nonconform", "bulk"]),
    ("Environmental review (SEQRA)", ["seqra", "environmental review", "negative declaration",
                                       "eaf", "environmental assessment"]),
    ("Stormwater & drainage", ["water"]),  # late catch-all for bare "water"
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
    meetings = []
    errors = []
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

def norm_theme(t):
    return re.sub(r"\s+", " ", str(t).strip().lower())

def roll_themes(meetings):
    agg = defaultdict(lambda: {"count": 0, "sentiments": [], "saliences": [], "timeline": []})
    for m in meetings:
        # Collapse this meeting's raw themes to canonical, averaging within the meeting
        # so each meeting contributes ONE point per canonical theme.
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
    """Merge the same property across meetings despite slug drift: normalize the
    name to its leading street address (or cleaned name), dropping parentheticals
    and trailing qualifiers."""
    base = c.get("address") or c.get("name") or c.get("id") or ""
    k = str(base).lower()
    k = re.sub(r"\(.*?\)", " ", k)            # drop parentheticals
    k = re.split(r"[—–\-:]| discussion| extension| amended| subdivision", k)[0]
    k = re.sub(r"[^a-z0-9 ]", " ", k)
    k = re.sub(r"\s+", " ", k).strip()
    return k or (c.get("id") or "")

def slugify(k):
    return re.sub(r"\s+", "-", str(k).strip())[:80] or "case"

def roll_cases(meetings):
    agg = defaultdict(lambda: {"id": "", "name": "", "address": "", "type": "", "applicant": "",
                               "themes": set(), "appearances": [], "sentiments": []})
    for m in meetings:
        for c in m.get("cases", []):
            cid = case_key(c)
            if not cid:
                continue
            a = agg[cid]
            a["id"] = a["id"] or (c.get("id") or cid)
            a["name"] = a["name"] or c.get("name", cid)
            a["address"] = a["address"] or c.get("address", "")
            a["type"] = a["type"] or c.get("applicationType", "")
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
            cid = slugify(case_key(c))
            cname = c.get("name", cid)
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
    """Rewrite each meeting's case themes + theme tags to the canonical vocabulary
    so the per-meeting view matches the roll-ups."""
    for m in meetings:
        for c in m.get("cases", []):
            c["themes"] = sorted({ct for ct in (canon_theme(t) for t in c.get("themes", [])) if ct})
        # collapse meeting.themes to canonical, keeping best salience/sentiment per canon
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
    """Rewrite each case's memberPositions to canonical member names, merging any
    duplicates that collapse to the same person (e.g. 'Chair' + 'Christopher' both
    → Christopher Carthy) into one averaged position."""
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
                    # keep the higher-confidence, longer evidence
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
    # Meeting-level sentiment summary for a timeline chart.
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
            "board": "Planning Board",
            "muniKey": "nc",
            "bodyKey": "planning",
            "town": "Town of North Castle",
            "meetings": len(meetings),
            "cases": len(cases),
            "themes": len(themes),
            "memberPositions": total_positions,
            "roster": MEMBERS,
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
