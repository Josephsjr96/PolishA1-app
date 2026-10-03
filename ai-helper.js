/* ai-helper.js — AI assistant for the My Polish tab (DeepSeek, OpenAI-compatible API).
   - "Check my entry": fixes spelling, fills English / tip / grammar topic, flags mistakes.
   - "Review my words": scans saved entries for wrong spelling or translations.
   - Chat: ask anything about Polish; it sees what you're typing in the form.
   The API key is NEVER stored in this file. You paste it in the app (saved in your browser only),
   or you point the app at a proxy (see deepseek-proxy-worker.js) so no key lives in the browser.
   Load AFTER easy-mode.js. */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  /* ===== PUBLISHING: paste your Cloudflare Worker URL here (it is NOT a secret). =====
     With this set, visitors just chat — no key, no settings. The real DeepSeek key lives only
     inside the Worker. Add #aidev to the page URL to reveal the settings for your own testing. */
  const PROXY_URL = "https://flat-waterfall-436c.josephsanjari1996.workers.dev";
  const LOCKED = !!PROXY_URL && location.hash !== "#aidev";
  const CFG_KEY = "pl_ai_cfg_v1";
  const DEFAULTS = { key: "", model: "deepseek-chat", base: "https://api.deepseek.com", proxy: "" };
  const GRAMMAR_IDS = "g-cz-sz-rz g-c-letter g-l-letter g-nasal g-stress g-greetings g-formal-informal g-sie g-a-ty g-byc g-mam-na-imie g-accusative g-adjective-acc g-poprosze g-ile g-numbers g-questions g-gdzie g-prepositions g-yesno g-modal g-genitive g-z-preposition g-politeness g-adverbs";

  const load = () => { try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(CFG_KEY) || "{}")); } catch (e) { return Object.assign({}, DEFAULTS); } };
  const save = c => { try { localStorage.setItem(CFG_KEY, JSON.stringify(c)); } catch (e) {} };
  let cfg = load();
  const ready = () => !!(cfg.key || cfg.proxy || PROXY_URL);

  /* ---------- API ---------- */
  async function ask(messages, opts) {
    opts = opts || {};
    if (!ready()) throw new Error("NOKEY");
    const proxy = cfg.proxy || PROXY_URL;
    const url = proxy ? proxy : cfg.base.replace(/\/$/, "") + "/chat/completions";
    const headers = { "Content-Type": "application/json" };
    if (cfg.key && !PROXY_URL) headers.Authorization = "Bearer " + cfg.key;
    const body = { model: cfg.model || DEFAULTS.model, messages, temperature: opts.json ? 0.2 : 0.5, max_tokens: opts.max || 700 };
    if (opts.json) body.response_format = { type: "json_object" };
    let res;
    try { res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) }); }
    catch (e) { console.error("[AI] request failed (offline or CORS). url:", url, "| this page origin:", location.origin); throw new Error("NETWORK"); }
    if (!res.ok) {
      let detail = "";
      try { const j = await res.json(); detail = String((j.error && (j.error.message || j.error)) || j.message || ""); } catch (e) {}
      let code = "HTTP";
      if (/origin not allowed/i.test(detail)) code = "ORIGIN";
      else if (/secret is not set|not configured/i.test(detail)) code = "NOSECRET";
      else if (res.status === 401) code = "AUTH";
      else if (res.status === 402) code = "BALANCE";
      else if (res.status === 429) code = "RATE";
      const err = new Error(code); err.status = res.status; err.detail = detail;
      console.error("[AI] HTTP", res.status, detail, "| url:", url, "| origin:", location.origin);
      throw err;
    }
    const data = await res.json();
    const txt = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!txt) throw new Error("EMPTY");
    return txt.trim();
  }
  const parseJSON = t => { t = t.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim(); const a = t.indexOf("{"), b = t.lastIndexOf("}"); return JSON.parse(t.slice(a, b + 1)); };
  /* Visitors get a friendly line plus a short reason code (so a problem can be reported); the owner
     (open the page with #aidev) gets full instructions. */
  const REASON = e => ({
    NETWORK: "cannot reach the AI server — network or site not allowed",
    ORIGIN: "this site is not in the Worker's ALLOWED_ORIGINS (needs: " + location.origin + ")",
    NOSECRET: "the Worker has no DEEPSEEK_KEY secret",
    AUTH: "the DeepSeek key was rejected (401)",
    BALANCE: "the DeepSeek account has no balance (402)",
    HTTP: "server error " + (e.status || "") + (e.detail ? ": " + e.detail.slice(0, 120) : "")
  }[e.message] || e.message);
  const errText = e => {
    if (e.message === "RATE") return "You're asking very fast — wait a few seconds and try again.";
    if (e.message === "EMPTY") return "The AI sent an empty answer. Try again.";
    if (e.message === "NOKEY") return "Add your DeepSeek API key in ⚙ Settings first.";
    if (LOCKED) return "The AI helper is unavailable right now (" + REASON(e) + "). Please try again later.";
    return "Problem: " + REASON(e) + (e.message === "NETWORK" && (cfg.proxy || PROXY_URL)
      ? ". This page's origin is " + location.origin + " — set the Worker variable ALLOWED_ORIGINS to exactly that (no path, no trailing slash), then press 🩺 Test connection." : ".");
  };

  const SYS_CHECK = `You are a careful Polish teacher for an A1 learner whose first language is not English-only (keep English simple).
You receive a Polish word or sentence the learner typed, plus what they filled in. Reply with ONE JSON object only (json):
{"ok":true|false,"corrected":"Polish with correct spelling/diacritics (same text if already right)","english":"short natural English meaning","type":"word"|"sentence","pronunciation":"easy English-style spelling, syllables joined by hyphens, STRESSED syllable in CAPS, e.g. dzen-KOO-yeh","grammar":"one id from the list or empty string","tip":"one short useful A1 note (max 25 words)","issues":["short plain-English problems you found, empty if none"]}
Grammar ids: ${GRAMMAR_IDS}.
If the learner's English meaning is wrong, correct it and add an issue. Never invent words; if the Polish is not real, set ok=false and explain in issues.`;

  const SYS_CHAT = `You are a friendly Polish tutor inside a Polish A1 learning app. Answer in simple English, briefly (under 120 words unless asked for more).
When you give Polish, add an easy pronunciation in brackets like (dzen-KOO-yeh) with the stressed syllable in CAPS. Keep to A1 level, give 1 short example when useful. If asked something unrelated to learning Polish, gently steer back.`;

  /* ---------- UI ---------- */
  const css = document.createElement("style");
  css.textContent = `
  .ai-box{background:linear-gradient(135deg,rgba(167,139,250,.14),rgba(167,139,250,.03));border:1px solid rgba(167,139,250,.35);border-radius:var(--radius);padding:14px;margin-bottom:16px}
  .ai-box h3{color:var(--user);font-size:1rem;margin-bottom:4px;display:flex;align-items:center;gap:8px}
  .ai-sub{color:var(--muted);font-size:.82rem;margin-bottom:10px}
  .ai-row{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}
  .ai-btn{padding:9px 13px;border-radius:10px;border:1px solid #39404f;background:var(--card2);color:var(--text);font-size:.82rem;font-weight:600;cursor:pointer}
  .ai-btn.pri{background:var(--user);color:#0a0a0a;border-color:var(--user)}
  .ai-btn:disabled{opacity:.5;cursor:wait}
  .ai-set{display:none;background:var(--card);border-radius:10px;padding:10px;margin:8px 0}
  .ai-set.open{display:block}
  .ai-set label{display:block;font-size:.75rem;color:var(--muted);margin:6px 0 3px}
  .ai-set input{width:100%;padding:9px;border-radius:8px;border:1px solid #39404f;background:var(--card2);color:var(--text);font-size:.85rem}
  .ai-warn{font-size:.74rem;color:var(--grammar);margin-top:6px}
  .ai-res{background:var(--card);border-radius:10px;padding:12px;margin:8px 0;font-size:.88rem}
  .ai-res .k{color:var(--muted);font-size:.72rem;text-transform:uppercase;letter-spacing:.5px;margin-top:6px}
  .ai-res .bad{color:#ff8a9b}.ai-res .good{color:var(--good)}
  .ai-log{max-height:300px;overflow:auto;margin:8px 0}
  .ai-msg{padding:8px 11px;border-radius:12px;margin-bottom:6px;font-size:.88rem;line-height:1.45;max-width:92%}
  .ai-msg.u{background:var(--user);color:#0a0a0a;margin-left:auto}
  .ai-msg.a{background:var(--card2)}
  .ai-in{display:flex;gap:8px}.ai-in input{flex:1;padding:10px;border-radius:10px;border:1px solid #39404f;background:var(--card2);color:var(--text);font-size:.9rem}
  .ai-item{border-top:1px solid rgba(255,255,255,.07);padding:8px 0}`;
  document.head.appendChild(css);

  const host = $("#user");
  if (!host) return;
  const box = document.createElement("div");
  box.className = "ai-box";
  box.innerHTML = `
    <h3>🤖 AI Assistant <span class="smart-badge" id="ai-state"></span></h3>
    <div class="ai-sub">Checks what you type in the form below, reviews your saved words, and answers questions about Polish.</div>
    <div class="ai-row">
      <button class="ai-btn pri" id="ai-check">✨ Check my entry</button>
      <button class="ai-btn" id="ai-review">🔍 Review my words</button>
      <button class="ai-btn" id="ai-cfgbtn">⚙ Settings</button>
    </div>
    <div class="ai-set" id="ai-set">
      <label>DeepSeek API key</label><input id="ai-key" type="password" placeholder="sk-..." autocomplete="off">
      <label>Model</label><input id="ai-model" placeholder="deepseek-chat">
      <label>Proxy URL (optional — leave empty to call DeepSeek directly)</label><input id="ai-proxy" placeholder="https://your-worker.workers.dev">
      <div class="ai-row"><button class="ai-btn pri" id="ai-save">Save</button><button class="ai-btn" id="ai-test">🩺 Test connection</button><button class="ai-btn" id="ai-clear">Remove key</button></div>
      <div class="ai-warn">The key is stored only in this browser (localStorage) and sent only to DeepSeek / your proxy. Anyone using this browser profile could read it — don't use it on a shared device.</div>
    </div>
    <div id="ai-out"></div>
    <div class="ai-log" id="ai-log"></div>
    <div class="ai-in"><input id="ai-q" placeholder="Ask: why is it 'kawę' not 'kawa'?"><button class="ai-btn pri" id="ai-send">Ask</button></div>`;
  const form = $("#user .add-form");
  form.parentNode.insertBefore(box, form);

  if (LOCKED) { $("#ai-cfgbtn").style.display = "none"; $("#ai-set").remove(); }
  const state = () => { const s = $("#ai-state"); s.textContent = ready() ? "🟢 ready" : "🔴 no key"; s.classList.toggle("off", !ready()); };
  state();
  if (!LOCKED) {
  $("#ai-key").value = cfg.key; $("#ai-model").value = cfg.model; $("#ai-proxy").value = cfg.proxy;
  $("#ai-cfgbtn").onclick = () => $("#ai-set").classList.toggle("open");
  $("#ai-save").onclick = () => {
    cfg = { key: $("#ai-key").value.trim(), model: $("#ai-model").value.trim() || DEFAULTS.model, base: DEFAULTS.base, proxy: $("#ai-proxy").value.trim() };
    save(cfg); state(); $("#ai-set").classList.remove("open");
    out(`<div class="ai-res good">Saved.</div>`);
  };
  $("#ai-test").onclick = async () => {
    const proxy = ($("#ai-proxy").value.trim() || PROXY_URL);
    if (!proxy) return out(`<div class="ai-res">No proxy set — direct mode needs a key and a browser that allows DeepSeek calls.</div>`);
    out(`<div class="ai-res">Testing…</div>`);
    try {
      const r = await (await fetch(proxy)).json();
      out(`<div class="ai-res"><b class="${r.keyConfigured && r.yourOriginAllowed ? "good" : "bad"}">${r.keyConfigured && r.yourOriginAllowed ? "✓ Worker is ready" : "⚠ Worker needs setup"}</b>
        <div class="k">DeepSeek key on Worker</div><div>${r.keyConfigured ? "set ✓" : "MISSING — add the DEEPSEEK_KEY secret"}</div>
        <div class="k">This page's origin</div><div>${esc(location.origin)} — ${r.yourOriginAllowed ? "allowed ✓" : "NOT allowed ✗"}</div>
        <div class="k">Worker allows</div><div>${esc((r.allowedOrigins || []).join(", "))}</div>
        <div class="k">Hint</div><div>${esc(r.hint || "")}</div></div>`);
    } catch (e) { out(`<div class="ai-res bad">Can't open the Worker URL at all (${esc(proxy)}). Check the address, and that the Worker is deployed.</div>`); }
  };
  $("#ai-clear").onclick = () => { cfg = Object.assign({}, cfg, { key: "" }); save(cfg); $("#ai-key").value = ""; state(); };
  }

  const out = h => { $("#ai-out").innerHTML = h; };
  const val = id => ($("#" + id) ? $("#" + id).value.trim() : "");
  const fmt = t => esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");

  /* ---------- Check my entry ---------- */
  let last = null;
  $("#ai-check").onclick = async () => {
    const pl = val("f-pl");
    if (!pl) return out(`<div class="ai-res bad">Type a Polish word or sentence in the form first.</div>`);
    const btn = $("#ai-check"); btn.disabled = true; btn.textContent = "Checking…";
    out(`<div class="ai-res">Asking the AI…</div>`);
    try {
      const user = JSON.stringify({ polish: pl, english_typed: val("f-en"), tip_typed: val("f-tip") });
      const r = parseJSON(await ask([{ role: "system", content: SYS_CHECK }, { role: "user", content: user }], { json: true, max: 500 }));
      last = r; showCheck(r, pl);
    } catch (e) { out(`<div class="ai-res bad">${esc(errText(e))}</div>`); }
    btn.disabled = false; btn.textContent = "✨ Check my entry";
  };

  function showCheck(r, orig) {
    const changed = r.corrected && r.corrected !== orig;
    const mine = window.PLX ? PLX.pronounceText(r.corrected || orig) : "";
    const iss = (r.issues || []).filter(Boolean);
    out(`<div class="ai-res">
      <div class="${r.ok ? "good" : "bad"}"><b>${r.ok ? "✓ Looks right" : "⚠ Needs attention"}</b></div>
      ${iss.length ? `<ul style="margin:6px 0 0 18px">${iss.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
      <div class="k">Polish</div><div>${esc(r.corrected || orig)}${changed ? ` <span class="bad">(you typed: ${esc(orig)})</span>` : ""}</div>
      <div class="k">English</div><div>${esc(r.english || "")}</div>
      <div class="k">Pronunciation (app engine)</div><div>${esc(mine)}</div>
      ${r.pronunciation && r.pronunciation.toLowerCase() !== mine.toLowerCase() ? `<div class="k">AI pronunciation (differs — check)</div><div>${esc(r.pronunciation)} <button class="ai-btn" id="ai-usepron" style="padding:3px 8px">use this</button></div>` : ""}
      <div class="k">Tip</div><div>${esc(r.tip || "")}</div>
      ${r.grammar ? `<div class="k">Grammar topic</div><div>${esc(r.grammar)}</div>` : ""}
      <div class="ai-row"><button class="ai-btn pri" id="ai-apply">Apply to form</button></div></div>`);
    $("#ai-apply").onclick = () => applyToForm(r, orig);
    const up = $("#ai-usepron"); if (up) up.onclick = () => { setF("f-pron", r.pronunciation); up.textContent = "✓"; };
  }

  function setF(id, v) {
    const el = $("#" + id); if (!el) return;
    el.value = v; if (el.dataset) el.dataset.userEdited = "1";
  }
  function applyToForm(r, orig) {
    const pl = r.corrected || orig;
    setF("f-pl", pl);
    $("#f-pl").dispatchEvent(new Event("input")); /* let the smart helper recompute pron + letters */
    setTimeout(() => {
      ["f-pron", "f-letters"].forEach(id => { const el = $("#" + id); if (el) delete el.dataset.userEdited; });
      if (window.PLX) { setF("f-pron", PLX.pronounceText(pl)); setF("f-letters", PLX.breakdown(pl).map(x => `${x.l} | ${x.s} | ${x.n}`).join("\n")); }
      if (r.english) setF("f-en", r.english);
      if (r.tip && !val("f-tip")) setF("f-tip", r.tip);
      const t = $("#f-type"); if (t && t.value !== "dialogue" && (r.type === "word" || r.type === "sentence")) { t.value = r.type; if (typeof toggleFormType === "function") toggleFormType(); }
      const g = $("#f-grammar"); if (g && r.grammar && g.querySelector(`option[value="${r.grammar}"]`)) g.value = r.grammar;
      out(`<div class="ai-res good">Applied. Review the form and tap <b>Add to My Polish</b>.</div>`);
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  /* ---------- Review my words ---------- */
  $("#ai-review").onclick = async () => {
    const words = (typeof userData !== "undefined" && userData.words || []).filter(w => w.type !== "dialogue").slice(0, 40);
    if (!words.length) return out(`<div class="ai-res">You have no saved entries yet.</div>`);
    const btn = $("#ai-review"); btn.disabled = true; btn.textContent = "Reviewing…";
    out(`<div class="ai-res">Reviewing ${words.length} entries…</div>`);
    const sys = `You proofread a Polish A1 learner's saved entries. Reply with ONE JSON object only (json): {"items":[{"i":number,"ok":true|false,"pl":"corrected Polish","en":"corrected English","note":"very short reason"}]}. Include only entries that have a real problem (misspelling, missing diacritics, wrong/misleading translation). If all are fine return {"items":[]}.`;
    try {
      const r = parseJSON(await ask([{ role: "system", content: sys }, { role: "user", content: JSON.stringify(words.map((w, i) => ({ i, pl: w.pl, en: w.en }))) }], { json: true, max: 1200 }));
      const items = (r.items || []).filter(x => x && words[x.i] && !x.ok);
      if (!items.length) out(`<div class="ai-res good">✓ All ${words.length} entries look fine.</div>`);
      else {
        out(`<div class="ai-res"><b>${items.length} possible problem${items.length > 1 ? "s" : ""}</b>${items.map(x => `
          <div class="ai-item"><div><span class="bad">${esc(words[x.i].pl)}</span> → <b>${esc(x.pl || words[x.i].pl)}</b></div>
          <div style="color:var(--muted)">${esc(words[x.i].en)} → ${esc(x.en || words[x.i].en)}</div><div>${esc(x.note || "")}</div>
          <button class="ai-btn" data-fix="${x.i}" style="margin-top:6px">Fix this entry</button></div>`).join("")}</div>`);
        $("#ai-out").querySelectorAll("[data-fix]").forEach(b => b.onclick = () => {
          const x = items.find(q => String(q.i) === b.dataset.fix), w = words[x.i];
          if (x.pl) { w.pl = x.pl; w.pron = PLX.pronounceText(x.pl); w.letters = PLX.breakdown(x.pl); }
          if (x.en) w.en = x.en;
          saveUserData(); renderUser(); b.textContent = "✓ Fixed"; b.disabled = true;
        });
      }
    } catch (e) { out(`<div class="ai-res bad">${esc(errText(e))}</div>`); }
    btn.disabled = false; btn.textContent = "🔍 Review my words";
  };

  /* ---------- Chat ---------- */
  const hist = [];
  const bubble = (cls, html) => { const d = document.createElement("div"); d.className = "ai-msg " + cls; d.innerHTML = html; $("#ai-log").appendChild(d); $("#ai-log").scrollTop = 1e6; return d; };
  async function send() {
    const q = $("#ai-q").value.trim(); if (!q) return;
    $("#ai-q").value = ""; bubble("u", esc(q));
    const wait = bubble("a", "…");
    const ctx = val("f-pl") ? `\n(The learner is currently typing in the form: Polish="${val("f-pl")}", English="${val("f-en")}")` : "";
    hist.push({ role: "user", content: q });
    try {
      const a = await ask([{ role: "system", content: SYS_CHAT + ctx }].concat(hist.slice(-10)), { max: 500 });
      hist.push({ role: "assistant", content: a }); wait.innerHTML = fmt(a);
    } catch (e) { hist.pop(); wait.innerHTML = `<span class="bad">${esc(errText(e))}</span>`; }
    $("#ai-log").scrollTop = 1e6;
  }
  $("#ai-send").onclick = send;
  $("#ai-q").addEventListener("keydown", e => { if (e.key === "Enter") send(); });
  window.PLAI = { ask, ready };
})();
