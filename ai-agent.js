/* ai-agent.js — floating Polish tutor on every tab (chat bubble → panel with quick replies).
   Same AI backend as the My Polish assistant (PLAI.ask → your Worker, login + subscription rules apply).
   Load after ai-helper.js. */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const HKEY = "pl_agent_hist_v1";
  const AUTH = () => !!(window.PLAUTH && PLAUTH.enabled);

  const SYS = `You are "Pan Tutor", a warm, concise Polish tutor inside a Polish A1 learning app. Reply in simple English, max ~90 words.
Rules: put EVERY Polish word or phrase in **bold** (bold is only for Polish), and right after it give easy pronunciation in (brackets) with the stressed syllable in CAPS, then the English meaning, e.g. **Dziękuję** (dzen-KOO-yeh) = thank you.
Keep to A1 level. For a quiz, ask ONE question at a time, wait for the answer, then correct kindly and ask the next. End most replies with one tiny follow-up question. If asked about something unrelated to learning Polish, gently steer back.`;

  const BASE_CHIPS = ["👋 Teach me a phrase", "🎯 Quiz me", "ƒ Explain grammar", "🗣 How do I say…", "📌 Save last word"];
  const BY_TAB = { alphabet: "🔤 Hardest letters?", grammar: "ƒ Explain this simply", dictionary: "📚 5 useful words", flirt: "💘 Cute A1 phrases", street: "🤬 Slang to know", user: "✏ Check my word", exam: "🧪 Exam practice", easy: "🌱 Plan a topic for me" };

  const css = document.createElement("style");
  css.textContent = `
  #ag-fab{position:fixed;right:14px;bottom:calc(84px + env(safe-area-inset-bottom,0px));width:56px;height:56px;border-radius:50%;border:none;
    background:linear-gradient(135deg,var(--accent),#ff5c7a);color:#fff;font-size:1.6rem;cursor:pointer;z-index:90;box-shadow:0 6px 22px rgba(0,0,0,.45)}
  #ag-fab.open{display:none}
  #ag-panel{position:fixed;right:12px;bottom:calc(84px + env(safe-area-inset-bottom,0px));width:min(400px,calc(100vw - 24px));height:min(72vh,560px);
    background:var(--card);border:1px solid rgba(255,255,255,.1);border-radius:18px;box-shadow:0 10px 40px rgba(0,0,0,.55);z-index:150;
    display:flex;flex-direction:column;overflow:hidden;transform:translateY(20px);opacity:0;visibility:hidden;transition:all .25s ease}
  #ag-panel.open{transform:none;opacity:1;visibility:visible}
  .ag-h{display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--accent);color:#fff}
  .ag-h .t{flex:1;line-height:1.2}.ag-h b{font-size:.98rem}.ag-h small{display:block;opacity:.85;font-size:.7rem}
  .ag-h button{background:none;border:none;color:#fff;font-size:1.05rem;cursor:pointer;padding:4px 6px}
  .ag-b{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:8px;background:var(--bg)}
  .ag-m{max-width:86%;padding:9px 13px;border-radius:16px;font-size:.88rem;line-height:1.45;word-wrap:break-word}
  .ag-m.a{background:var(--card2);border-top-left-radius:4px;align-self:flex-start}
  .ag-m.u{background:var(--user);color:#0a0a0a;border-top-right-radius:4px;align-self:flex-end}
  .ag-m b{color:var(--good);cursor:pointer}.ag-m b::after{content:" 🔊";font-size:.7em}
  .ag-m.err{color:#ff8a9b}
  .ag-m .ag-go{display:inline-block;margin-top:8px;padding:8px 12px;border-radius:10px;border:none;background:var(--user);color:#0a0a0a;font-weight:700;cursor:pointer}
  .ag-typing{display:flex;gap:4px;padding:11px 14px;background:var(--card2);border-radius:16px;border-top-left-radius:4px;align-self:flex-start}
  .ag-typing i{width:7px;height:7px;border-radius:50%;background:var(--muted);animation:agdot 1.3s infinite ease-in-out}
  .ag-typing i:nth-child(2){animation-delay:.2s}.ag-typing i:nth-child(3){animation-delay:.4s}
  @keyframes agdot{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}
  .ag-q{display:flex;flex-wrap:wrap;gap:6px;padding:8px 12px 0;background:var(--card)}
  .ag-q button{padding:6px 11px;border-radius:999px;border:1px solid #39404f;background:var(--card2);color:var(--text);font-size:.76rem;cursor:pointer}
  .ag-q button:active{background:var(--accent);border-color:var(--accent)}
  .ag-f{display:flex;gap:8px;padding:10px 12px;background:var(--card)}
  .ag-f input{flex:1;padding:10px 14px;border-radius:999px;border:1px solid #39404f;background:var(--card2);color:var(--text);font-size:.9rem;outline:none}
  .ag-f button{width:40px;height:40px;border-radius:50%;border:none;background:var(--accent);color:#fff;font-size:1rem;cursor:pointer}
  .ag-f button:disabled{opacity:.5}`;
  document.head.appendChild(css);

  const fab = document.createElement("button");
  fab.id = "ag-fab"; fab.setAttribute("aria-label", "Open Polish tutor"); fab.textContent = "💬";
  const panel = document.createElement("div");
  panel.id = "ag-panel"; panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", "Polish tutor");
  panel.innerHTML = `<div class="ag-h"><div class="t"><b>🇵🇱 Pan Tutor</b><small id="ag-ctx">Ask me anything about Polish</small></div>
    <button id="ag-new" title="New chat" aria-label="New chat">🗑</button><button id="ag-x" title="Close" aria-label="Close">✕</button></div>
    <div class="ag-b" id="ag-body"></div><div class="ag-q" id="ag-q"></div>
    <div class="ag-f"><input id="ag-in" placeholder="Type your message…" autocomplete="off"><button id="ag-send" aria-label="Send">➤</button></div>`;
  document.body.appendChild(fab); document.body.appendChild(panel);

  const body = $("#ag-body"), input = $("#ag-in"), sendBtn = $("#ag-send");
  let hist = [], busy = false;
  try { hist = JSON.parse(localStorage.getItem(HKEY) || "[]").slice(-20); } catch (e) {}
  const persist = () => { try { localStorage.setItem(HKEY, JSON.stringify(hist.slice(-20))); } catch (e) {} };

  const tabLabel = () => { const t = $(".tab.active"); return t ? t.firstChild.textContent.trim() : ""; };
  const tabId = () => { const t = $(".tab.active"); return t ? t.dataset.tabid : ""; };

  function fmt(t) {
    return esc(t).replace(/\*\*(.+?)\*\*/g, (m, x) => `<b data-say="${x.replace(/"/g, "&quot;")}">${x}</b>`).replace(/\n/g, "<br>");
  }
  function bubble(cls, html) {
    const d = document.createElement("div"); d.className = "ag-m " + cls; d.innerHTML = html;
    body.appendChild(d); body.scrollTop = body.scrollHeight; return d;
  }
  function typing(on) {
    const old = $("#ag-typing"); if (old) old.remove();
    if (on) { const d = document.createElement("div"); d.className = "ag-typing"; d.id = "ag-typing"; d.innerHTML = "<i></i><i></i><i></i>"; body.appendChild(d); body.scrollTop = body.scrollHeight; }
  }
  function chips() {
    const first = BY_TAB[tabId()];
    const list = first ? [first].concat(BASE_CHIPS.slice(1)) : BASE_CHIPS;
    $("#ag-q").innerHTML = list.map(c => `<button>${esc(c)}</button>`).join("");
  }
  function welcome() {
    bubble("a", fmt("Cześć! I'm Pan Tutor. Ask me how to say something, get a quick quiz, or learn a new phrase. For example: **Dzień dobry** (dzhen DOH-brih) = good morning."));
  }
  function renderAll() {
    body.innerHTML = ""; if (!hist.length) welcome();
    hist.forEach(m => bubble(m.role === "user" ? "u" : "a", m.role === "user" ? esc(m.content) : fmt(m.content)));
    chips();
  }
  function gateBubble(kind) {
    typing(false);
    bubble("a", (kind === "subscribe" ? "🔒 The tutor needs an active subscription." : "🔒 Please log in to chat with the tutor.") +
      '<br><button class="ag-go">Open My Polish</button>');
  }

  async function ensureAccess() {
    if (!AUTH()) return true;
    if (!PLAUTH.session()) { gateBubble("login"); return false; }
    if (!PLAUTH.subscribed()) { await PLAUTH.refreshSub(); if (!PLAUTH.subscribed()) { gateBubble("subscribe"); return false; } }
    return true;
  }

  async function send(text) {
    text = (text || "").trim();
    if (!text || busy) return;
    if (!window.PLAI) return bubble("a err", "The AI helper isn't loaded on this page.");
    input.value = ""; bubble("u", esc(text));
    if (!(await ensureAccess())) return;
    busy = true; sendBtn.disabled = true; typing(true);
    hist.push({ role: "user", content: text });
    const f = $("#f-pl"), ctx = "\nThe learner is currently in the app section: " + (tabLabel() || "unknown") +
      (f && f.value.trim() ? '. In the My Polish form they typed: "' + f.value.trim() + '"' : ".");
    try {
      const a = await PLAI.ask([{ role: "system", content: SYS + ctx }].concat(hist.slice(-10)), { max: 450 });
      hist.push({ role: "assistant", content: a }); persist(); typing(false); bubble("a", fmt(a));
    } catch (e) {
      hist.pop(); typing(false);
      if (e.message === "LOGIN") gateBubble("login"); else if (e.message === "SUBSCRIBE") gateBubble("subscribe");
      else bubble("a err", esc(PLAI.errText ? PLAI.errText(e) : "Something went wrong."));
    }
    busy = false; sendBtn.disabled = false; chips();
  }

  async function saveLast() {
    const last = [...hist].reverse().find(m => m.role === "assistant");
    if (!last) return bubble("a", "Ask me about a word first, then I can save it for you.");
    if (!(await ensureAccess())) return;
    busy = true; typing(true);
    try {
      const raw = await PLAI.ask([{ role: "system", content: 'From the tutor message, pick the single most useful Polish word or short phrase. Reply with ONE JSON object only (json): {"pl":"Polish with correct diacritics","en":"short English meaning"}. If there is none, {"pl":"","en":""}.' }, { role: "user", content: last.content }], { json: true, max: 120 });
      const j = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
      typing(false);
      if (!j.pl) bubble("a", "I couldn't find a word to save in my last answer.");
      else if (typeof addDictToMyPolish !== "function") bubble("a err", "Saving isn't available on this page.");
      else {
        const r = addDictToMyPolish({ pl: j.pl, en: j.en || "", pos: "", cat: "Tutor" });
        bubble("a", r === "added" ? "📌 Saved <b data-say=\"" + esc(j.pl) + "\">" + esc(j.pl) + "</b> to My Polish." : r === "dupe" ? "That one is already in My Polish ✓" : "Couldn't save it.");
      }
    } catch (e) { typing(false); bubble("a err", esc(PLAI.errText ? PLAI.errText(e) : "Something went wrong.")); }
    busy = false; chips();
  }

  function open() {
    panel.classList.add("open"); fab.classList.add("open");
    $("#ag-ctx").textContent = tabLabel() ? "Now in: " + tabLabel() : "Ask me anything about Polish";
    renderAll();
    if (window.matchMedia && matchMedia("(pointer:fine)").matches) input.focus();
  }
  function close() { panel.classList.remove("open"); fab.classList.remove("open"); }

  fab.onclick = open;
  $("#ag-x").onclick = close;
  $("#ag-new").onclick = () => { hist = []; persist(); renderAll(); };
  sendBtn.onclick = () => send(input.value);
  input.addEventListener("keydown", e => { if (e.key === "Enter") send(input.value); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && panel.classList.contains("open")) close(); });
  $("#ag-q").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    const t = b.textContent;
    if (/Save last word/.test(t)) return saveLast();
    if (/How do I say/.test(t)) { input.value = "How do I say "; input.focus(); return; }
    send(t.replace(/^[^\p{L}]+/u, ""));
  });
  body.addEventListener("click", e => {
    const s = e.target.closest("b[data-say]");
    if (s && typeof speakPl === "function") return speakPl(s.dataset.say.replace(/&quot;/g, '"'));
    if (e.target.closest(".ag-go")) { close(); if (typeof switchTabById === "function") switchTabById("user"); window.scrollTo({ top: 0, behavior: "smooth" }); }
  });
})();
