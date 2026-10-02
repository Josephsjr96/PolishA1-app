#!/usr/bin/env python3
"""
pl_fix.py - companion tool for the Polish A1 web app.

Same pronunciation engine as polish-engine.js (kept in sync), usable offline.

  python pl_fix.py pron "Dziękuję bardzo"        # easy pronunciation
  python pl_fix.py letters "szkoła"              # letter-by-letter chips
  python pl_fix.py check export.json             # report broken entries
  python pl_fix.py fix export.json -o fixed.json # repair pron + letters
  python pl_fix.py fix export.json --force       # regenerate EVERYTHING
  python pl_fix.py db words.csv -o polish-db.js  # CSV -> dictionary DB file

export.json = file from the app: My Polish -> "Export my data".
CSV columns for `db`: pl,en,pos,cat,example_pl,example_en  (last two optional)
"""
import argparse, csv, json, re, sys

VOW = "aąeęioóuy"
VSND = {"a": "ah", "e": "eh", "i": "ee", "o": "oh", "ó": "oo", "u": "oo", "y": "ih"}
CONS = {"b": "b", "c": "ts", "d": "d", "f": "f", "g": "g", "h": "h", "j": "y", "k": "k",
        "l": "l", "ł": "w", "m": "m", "n": "n", "p": "p", "r": "r", "s": "s", "t": "t",
        "w": "v", "z": "z", "ż": "zh", "ś": "sh", "ć": "ch", "ź": "zh", "q": "k", "v": "v", "x": "ks"}
DIG = {"dź": "j", "dż": "j", "cz": "ch", "sz": "sh", "rz": "zh", "ch": "h", "dz": "dz"}
SOFT = {"ci": "ch", "si": "sh", "zi": "zh", "ni": "ny", "dzi": "dz"}
FINAL_DEVOICE = {"b": "p", "d": "t", "g": "k", "v": "f", "z": "s", "zh": "sh", "dz": "ts", "j": "ch"}
VOICELESS = {"p", "t", "k", "f", "s", "sh", "ch", "h", "ts"}
NOTES = {"ą": "nasal o", "ę": "nasal e", "ł": "like w in water", "ó": "same as u", "w": "like v",
         "c": "like ts in cats", "j": "like y in yes", "y": "like i in bit", "i": "like ee",
         "ć": "soft ch", "ś": "soft sh", "ź": "soft zh", "ń": "soft ny", "ż": "like s in measure",
         "cz": "like ch in chair", "sz": "like sh in shoe", "rz": "like ż", "ch": "like h",
         "dz": "like ds in roads", "dź": "soft j", "dż": "like j in jungle", "h": "like h",
         "r": "rolled r", "u": "like oo", "e": "like e in bed", "o": "like o in hot", "a": "like a in father"}
STRESS_ANTE_END = ("yka", "ika")
STRESS_ANTE = {"uniwersytet", "uniwersytety"}


def _nasal(ch, nxt, nxt2):
    base, full = ("on", "o") if ch == "ą" else ("en", "e")
    if not nxt:
        return "oh" if ch == "ą" else "eh"
    if nxt in "bp":
        return base[0] + "m" if ch == "ę" else "om"
    if nxt in "lł":
        return "oh" if ch == "ą" else "eh"
    return base


def tokenize(w):
    """word -> list of units {g, s, k('V'/'C'), join}"""
    w = w.lower()
    u, i, n = [], 0, len(w)
    isv = lambda c: c != "" and c in VOW
    while i < n:
        c = w[i]
        t3, t2 = w[i:i + 3], w[i:i + 2]
        nxt = w[i + 1] if i + 1 < n else ""
        if t3 == "dzi" and isv(w[i + 3] if i + 3 < n else ""):
            u.append(dict(g="dzi", s="dz", k="C")); i += 3; continue
        if t2 in DIG:
            u.append(dict(g=t2, s=DIG[t2], k="C")); i += 2; continue
        if t2 in SOFT and isv(w[i + 2] if i + 2 < n else ""):
            u.append(dict(g=t2, s=SOFT[t2], k="C")); i += 2; continue
        if t2 in SOFT and t2 != "dzi":
            u.append(dict(g=t2, s="n" if t2 == "ni" else SOFT[t2], k="C"))
            u.append(dict(g="", s="ee", k="V", join=True)); i += 2; continue
        if c == "ń":
            u.append(dict(g=c, s="ny" if isv(nxt) else "n", k="C")); i += 1; continue
        if c in "ąę":
            u.append(dict(g=c, s=_nasal(c, nxt, w[i + 2:i + 3]), k="V")); i += 1; continue
        if c in VSND:
            u.append(dict(g=c, s=VSND[c], k="V")); i += 1; continue
        if c in CONS:
            # consonant + i + vowel -> soft glide (mia -> myah)
            if isv(w[i + 2] if i + 2 < n else "") and nxt == "i" and c in "bpwfkgmlht":
                u.append(dict(g=c + "i", s=CONS[c] + "y", k="C")); i += 2; continue
            u.append(dict(g=c, s=CONS[c], k="C")); i += 1; continue
        u.append(dict(g=c, s=c, k="C")); i += 1
    # rz after a voiceless consonant -> sh
    for j in range(1, len(u)):
        if u[j]["g"] == "rz" and u[j - 1]["k"] == "C" and u[j - 1]["s"] in VOICELESS:
            u[j]["s"] = "sh"
    # final devoicing
    if len(u) > 1 and u[-1]["k"] == "C" and u[-1]["s"] in FINAL_DEVOICE:
        u[-1]["s"] = FINAL_DEVOICE[u[-1]["s"]]
    return u


STOPS = {"p", "b", "t", "d", "k", "g"}


def _base(s):
    return s[:-1] if len(s) == 2 and s.endswith("y") and s[0] in "bpvfkgmlht" else s


def _ok2(a, b):
    a, b = _base(a), _base(b)
    if b in ("r", "l") and a not in ("r", "l", "m", "n", "y"):
        return True
    if a in ("s", "z", "sh", "zh") and (b in STOPS or b in ("m", "n", "f", "v", "k")):
        return True
    return False


def syllabify(units):
    nuc = [i for i, x in enumerate(units) if x["k"] == "V" and not x.get("join")]
    if not nuc:
        return [list(range(len(units)))]
    cuts = []
    for a, b in zip(nuc, nuc[1:]):
        cl = [i for i in range(a + 1, b) if not units[i].get("join")]
        # include join vowels belonging to previous consonant inside cluster
        cl = list(range(a + 1, b))
        cons = [i for i in cl if units[i]["k"] == "C"]
        n = len(cons)
        k = 1 if n else 0
        if n >= 3 and _ok2(units[cons[-3]]["s"], units[cons[-2]]["s"]) and _ok2(units[cons[-2]]["s"], units[cons[-1]]["s"]):
            k = 3
        elif n >= 2 and _ok2(units[cons[-2]]["s"], units[cons[-1]]["s"]):
            k = 2
        cuts.append(cons[n - k] if n else b)
    sylls, start = [], 0
    for c in cuts:
        sylls.append(list(range(start, c))); start = c
    sylls.append(list(range(start, len(units))))
    return sylls


def pronounce_word(word):
    parts = re.split(r"[-–]", word)
    return "-".join(_pron_one(p) for p in parts if p) if len(parts) > 1 else _pron_one(word)


def _pron_one(word):
    clean = re.sub(r"[^\w]", "", word, flags=re.U).replace("_", "")
    if not clean:
        return ""
    if re.search(r"\d", clean):
        return clean
    units = tokenize(clean)
    sy = syllabify(units)
    texts = ["".join(units[i]["s"] for i in s) for s in sy]
    if len(texts) == 1:
        return texts[0]
    low = clean.lower()
    idx = len(texts) - 2
    if low in STRESS_ANTE or (low.endswith(STRESS_ANTE_END) and len(texts) >= 3):
        idx = max(0, len(texts) - 3)
    return "-".join(t.upper() if i == idx else t for i, t in enumerate(texts))


def pronounce_phrase(text):
    return " ".join(pronounce_word(w) for w in text.split() if pronounce_word(w))


def breakdown(text):
    chips = []
    for tok in re.findall(r"[^\W\d_]+", text, flags=re.U):
        for x in tokenize(tok):
            if x.get("join") and chips:
                chips[-1]["s"] += x["s"]; chips[-1]["n"] = "soft + ee"; continue
            g = x["g"]
            note = NOTES.get(g, "as in English" if len(g) == 1 and g in "bdfgklmnpstz" else "")
            if g in SOFT and not x.get("join"):
                note = "soft, i only softens"
            chips.append(dict(l=g, s=x["s"], n=note))
    return chips


def letters_text(text):
    return "\n".join(f"{c['l']} | {c['s']} | {c['n']}" for c in breakdown(text))


# --- the OLD (buggy) engine, so we can tell auto-generated pronunciations from hand-typed ones ---
_OS = dict(a="ah", ą="nasal on", b="b", c="ts", ć="soft ch", d="d", e="eh", ę="nasal en", f="f", g="g", h="h",
           i="ee", j="y", k="k", l="l", ł="w", m="m", n="n", ń="soft ny", o="oh", ó="oo", p="p", r="rolled r",
           s="s", ś="soft sh", t="t", u="oo", w="v", y="ih", z="z", ź="soft zh", ż="hard zh", ch="h", cz="hard ch",
           sz="hard sh", rz="hard zh", dz="dz", dź="soft dj", dż="hard j", dzi="soft dj", ci="soft ch", si="soft sh",
           zi="soft zh", ni="soft ny", mi="my", bi="by", pi="py", fi="fy", wi="vy", ki="ky", gi="gy", li="lee")
_OC = ["dzi", "dź", "dż", "cz", "sz", "rz", "dz", "ch", "ci", "si", "zi", "ni", "mi", "ki", "gi", "bi", "pi", "fi", "wi", "li"]


def _old_word(word):
    w = re.sub(r"[^\w]", "", word, flags=re.U).lower()
    if not w:
        return ""
    syl, cur, i = [], "", 0
    while i < len(w):
        ch = next((c for c in _OC if w.startswith(c, i)), None)
        if ch:
            cur += ch; i += len(ch); continue
        cur += w[i]
        if w[i] in VOW:
            j = i + 1
            if j < len(w) and w[j] not in VOW:
                cur += w[j]; j += 1
            syl.append(cur); cur = ""; i = j; continue
        i += 1
    if cur:
        syl.append(cur)
    snd = []
    for sy in syl or [w]:
        out, k = "", 0
        combos = _OC + list("ąęćśźżóńł")
        while k < len(sy):
            m = next((c for c in combos if sy.startswith(c, k)), None)
            if m:
                out += re.sub(r"[^a-z]", "", _OS.get(m, "")).replace("nasal", "n"); k += len(m); continue
            if sy[k] in _OS:
                out += re.sub(r"[^a-z]", "", _OS[sy[k]])
            elif re.match(r"[a-z]", sy[k]):
                out += sy[k]
            k += 1
        if out:
            snd.append(out)
    if len(snd) <= 1:
        return snd[0] if snd else w
    return "-".join(x.upper() if i == len(snd) - 2 else x for i, x in enumerate(snd))


def old_phrase(text):
    return " ".join(_old_word(w) for w in text.split() if _old_word(w))


BROKEN = re.compile(r"soft|hard|rolled|nasal|like|\?")


def is_broken(pron, pl):
    if not pron or pron == "—":
        return True
    if pron == old_phrase(pl) and pron != pronounce_phrase(pl):
        return True  # produced by the old buggy engine (not hand-typed)
    if BROKEN.search(pron):
        return True
    return len(pron.split()) != len(pl.split())


def _fix_item(it, force):
    changed = False
    new = pronounce_phrase(it.get("pl", ""))
    if new and (force or is_broken(it.get("pron", ""), it.get("pl", ""))):
        if it.get("pron") != new:
            it["pron"] = new; changed = True
    lt = it.get("letters") or []
    bad = any(x.get("s") in ("?", None) or BROKEN.search(str(x.get("s", ""))) for x in lt)
    if it.get("pl") and (force or bad or not lt):
        it["letters"] = breakdown(it["pl"]); changed = True
    return changed


def iter_items(data):
    for w in data.get("words", []):
        yield w
    for c in data.get("convos", []):
        for ln in c.get("lines", []):
            yield ln


def cmd_check(path):
    data = json.load(open(path, encoding="utf-8"))
    bad = [(x["pl"], x.get("pron")) for x in iter_items(data) if is_broken(x.get("pron", ""), x.get("pl", ""))]
    print(f"{len(bad)} suspicious entr{'y' if len(bad)==1 else 'ies'}")
    for pl, p in bad:
        print(f"  {pl!r}: {p!r} -> {pronounce_phrase(pl)!r}")


def cmd_fix(path, out, force):
    data = json.load(open(path, encoding="utf-8"))
    n = sum(_fix_item(x, force) for x in iter_items(data))
    out = out or re.sub(r"\.json$", "", path) + ".fixed.json"
    json.dump(data, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"Fixed {n} entries -> {out}\nImport it in the app: My Polish -> Import my data")


def cmd_db(path, out):
    rows, seen = [], set()
    for r in csv.reader(open(path, encoding="utf-8")):
        if len(r) < 2 or r[0].strip().lower() == "pl":
            continue
        r = [c.strip().replace("|", "/").replace("`", "'") for c in r] + [""] * 6
        if r[0].lower() in seen:
            continue
        seen.add(r[0].lower())
        ex = f"{r[4]} = {r[5]}" if r[4] and r[5] else ""
        rows.append("|".join([r[0], r[1], r[2], r[3], ex]).rstrip("|"))
    out = out or "polish-db.js"
    body = "\n".join(rows)
    open(out, "w", encoding="utf-8").write(
        "/* generated by pl_fix.py db */\nwindow.PL_DB_RAW = `\n" + body + "\n`;\n")
    print(f"{len(rows)} words -> {out}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest="cmd", required=True)
    for name in ("pron", "letters"):
        sp.add_parser(name).add_argument("text")
    sp.add_parser("check").add_argument("file")
    f = sp.add_parser("fix"); f.add_argument("file"); f.add_argument("-o"); f.add_argument("--force", action="store_true")
    d = sp.add_parser("db"); d.add_argument("file"); d.add_argument("-o")
    a = ap.parse_args()
    if a.cmd == "pron": print(pronounce_phrase(a.text))
    elif a.cmd == "letters": print(letters_text(a.text))
    elif a.cmd == "check": cmd_check(a.file)
    elif a.cmd == "fix": cmd_fix(a.file, a.o, a.force)
    else: cmd_db(a.file, a.o)


if __name__ == "__main__":
    main()
