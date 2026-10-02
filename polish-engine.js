/* polish-engine.js — pronunciation engine (port of tools/pl_fix.py; keep in sync).
   Replaces the old syllable splitter that broke on words like kawa, kino, dziękuję. */
(function (root) {
  const VOW = "aąeęioóuy";
  const VSND = { a: "ah", e: "eh", i: "ee", o: "oh", "ó": "oo", u: "oo", y: "ih" };
  const CONS = { b: "b", c: "ts", d: "d", f: "f", g: "g", h: "h", j: "y", k: "k", l: "l", "ł": "w", m: "m", n: "n", p: "p", r: "r", s: "s", t: "t", w: "v", z: "z", "ż": "zh", "ś": "sh", "ć": "ch", "ź": "zh", q: "k", v: "v", x: "ks" };
  const DIG = { "dź": "j", "dż": "j", cz: "ch", sz: "sh", rz: "zh", ch: "h", dz: "dz" };
  const SOFT = { ci: "ch", si: "sh", zi: "zh", ni: "ny", dzi: "dz" };
  const DEVOICE = { b: "p", d: "t", g: "k", v: "f", z: "s", zh: "sh", dz: "ts", j: "ch" };
  const VOICELESS = new Set(["p", "t", "k", "f", "s", "sh", "ch", "h", "ts"]);
  const NOTES = { "ą": "nasal o", "ę": "nasal e", "ł": "like w in water", "ó": "same as u", w: "like v", c: "like ts in cats", j: "like y in yes", y: "like i in bit", i: "like ee", "ć": "soft ch", "ś": "soft sh", "ź": "soft zh", "ń": "soft ny", "ż": "like s in measure", cz: "like ch in chair", sz: "like sh in shoe", rz: "like ż", ch: "like h", dz: "like ds in roads", "dź": "soft j", "dż": "like j in jungle", h: "like h", r: "rolled r", u: "like oo", e: "like e in bed", o: "like o in hot", a: "like a in father" };
  const ANTE = new Set(["uniwersytet", "uniwersytety"]);
  const isv = c => !!c && VOW.includes(c);

  function nasal(ch, nxt) {
    if (!nxt) return ch === "ą" ? "oh" : "eh";
    if ("bp".includes(nxt)) return ch === "ą" ? "om" : "em";
    if ("lł".includes(nxt)) return ch === "ą" ? "oh" : "eh";
    return ch === "ą" ? "on" : "en";
  }

  function tokenize(word) {
    const w = word.toLowerCase(), n = w.length, u = [];
    let i = 0;
    while (i < n) {
      const c = w[i], t3 = w.substr(i, 3), t2 = w.substr(i, 2), nxt = w[i + 1] || "", n2 = w[i + 2] || "";
      if (t3 === "dzi" && isv(w[i + 3])) { u.push({ g: "dzi", s: "dz", k: "C" }); i += 3; continue; }
      if (DIG[t2]) { u.push({ g: t2, s: DIG[t2], k: "C" }); i += 2; continue; }
      if (SOFT[t2] && t2 !== "dzi" && isv(n2)) { u.push({ g: t2, s: SOFT[t2], k: "C" }); i += 2; continue; }
      if (SOFT[t2] && t2 !== "dzi") { u.push({ g: t2, s: t2 === "ni" ? "n" : SOFT[t2], k: "C" }, { g: "", s: "ee", k: "V", join: true }); i += 2; continue; }
      if (c === "ń") { u.push({ g: c, s: isv(nxt) ? "ny" : "n", k: "C" }); i++; continue; }
      if (c === "ą" || c === "ę") { u.push({ g: c, s: nasal(c, nxt), k: "V" }); i++; continue; }
      if (VSND[c]) { u.push({ g: c, s: VSND[c], k: "V" }); i++; continue; }
      if (CONS[c]) {
        if (isv(n2) && nxt === "i" && "bpwfkgmlht".includes(c)) { u.push({ g: c + "i", s: CONS[c] + "y", k: "C" }); i += 2; continue; }
        u.push({ g: c, s: CONS[c], k: "C" }); i++; continue;
      }
      u.push({ g: c, s: c, k: "C" }); i++;
    }
    for (let j = 1; j < u.length; j++)
      if (u[j].g === "rz" && u[j - 1].k === "C" && VOICELESS.has(u[j - 1].s)) u[j].s = "sh";
    const last = u[u.length - 1];
    if (u.length > 1 && last.k === "C" && DEVOICE[last.s]) last.s = DEVOICE[last.s];
    return u;
  }

  const STOPS = new Set(["p", "b", "t", "d", "k", "g"]);
  const base = s => (s.length === 2 && s[1] === "y" && "bpvfkgmlht".includes(s[0])) ? s[0] : s;
  function ok2(a, b) {
    a = base(a); b = base(b);
    if ((b === "r" || b === "l") && !["r", "l", "m", "n", "y"].includes(a)) return true;
    return ["s", "z", "sh", "zh"].includes(a) && (STOPS.has(b) || ["m", "n", "f", "v", "k"].includes(b));
  }

  function syllabify(u) {
    const nuc = [];
    u.forEach((x, i) => { if (x.k === "V" && !x.join) nuc.push(i); });
    if (!nuc.length) return [u.map((_, i) => i)];
    const cuts = [];
    for (let q = 0; q < nuc.length - 1; q++) {
      const a = nuc[q], b = nuc[q + 1], cons = [];
      for (let i = a + 1; i < b; i++) if (u[i].k === "C") cons.push(i);
      const n = cons.length;
      let k = n ? 1 : 0;
      if (n >= 3 && ok2(u[cons[n - 3]].s, u[cons[n - 2]].s) && ok2(u[cons[n - 2]].s, u[cons[n - 1]].s)) k = 3;
      else if (n >= 2 && ok2(u[cons[n - 2]].s, u[cons[n - 1]].s)) k = 2;
      cuts.push(n ? cons[n - k] : b);
    }
    const out = []; let start = 0;
    cuts.forEach(c => { out.push(range(start, c)); start = c; });
    out.push(range(start, u.length));
    return out;
  }
  const range = (a, b) => Array.from({ length: b - a }, (_, i) => a + i);

  function pronOne(word) {
    const clean = word.replace(/[^\p{L}\p{N}]/gu, "");
    if (!clean) return "";
    if (/\d/.test(clean)) return clean;
    const u = tokenize(clean), sy = syllabify(u);
    const t = sy.map(s => s.map(i => u[i].s).join(""));
    if (t.length === 1) return t[0];
    const low = clean.toLowerCase();
    let idx = t.length - 2;
    if (ANTE.has(low) || (/(yka|ika)$/.test(low) && t.length >= 3)) idx = Math.max(0, t.length - 3);
    return t.map((x, i) => i === idx ? x.toUpperCase() : x).join("-");
  }
  function pronounceWord(word) {
    const parts = word.split(/[-–]/).filter(Boolean);
    return parts.length > 1 ? parts.map(pronOne).join("-") : pronOne(word);
  }
  function pronounceText(text) {
    return text.split(/\s+/).map(pronounceWord).filter(Boolean).join(" ");
  }
  function breakdown(text) {
    const chips = [];
    (text.match(/\p{L}+/gu) || []).forEach(tok => tokenize(tok).forEach(x => {
      if (x.join && chips.length) { const l = chips[chips.length - 1]; l.s += x.s; l.n = "soft + ee"; return; }
      let note = NOTES[x.g] || ("bdfgklmnpstz".includes(x.g) && x.g.length === 1 ? "as in English" : "");
      if (SOFT[x.g]) note = "soft, i only softens";
      chips.push({ l: x.g, s: x.s, n: note });
    }));
    return chips;
  }

  root.PLX = { pronounceWord, pronounceText, breakdown, tokenize, syllabify };
  /* Override the old broken helpers from the main script. */
  root.autoPronounceWord = pronounceWord;
  root.autoPronouncePhrase = pronounceText;
  root.autoBreakdown = breakdown;
  root.autoLettersText = t => breakdown(t).map(x => `${x.l} | ${x.s} | ${x.n}`).join("\n");
})(typeof window !== "undefined" ? window : globalThis);
