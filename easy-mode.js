/* easy-mode.js — Easy Mode (story + dialogue by topic), Dictionary tab, and My Polish repair/export tools.
   Needs: polish-engine.js, polish-db.js (load both before this file). Injects its own tabs/panels. */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = s => (typeof escapeHtml === "function" ? escapeHtml(s) : String(s));
  const pron = t => PLX.pronounceText(t);

  /* ---------- dictionary data ---------- */
  const DB = PL_DB_RAW.trim().split("\n").map(l => {
    const [pl, en, pos, cat, ex] = l.split("|");
    const [xp, xe] = (ex || "").split(" = ");
    return { pl, en, pos, cat, xp, xe, pron: pron(pl) };
  });
  const byPl = {}; DB.forEach(d => byPl[d.pl] = d);
  const fold = s => s.toLowerCase().replace(/ł/g, "l").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const entryOf = (pl, en, tip, g) => ({ pl, en, pron: pron(pl), letters: PLX.breakdown(pl), tip: tip || "", grammar: g || null });
  const speak = t => (typeof speakPl === "function" ? speakPl(t) : null);

  /* ---------- Easy Mode scenarios (A1) ---------- */
  const SC = [
    { id: "bank", emoji: "🏦", title: "At the bank", kw: "bank account money atm card cash konto pieniądze karta bankomat", roles: ["Clerk", "Customer"],
      story: [["Tom jest w banku.", "Tom is at the bank."], ["Chce otworzyć konto.", "He wants to open an account."], ["Pracownik pyta: „Ma pan paszport?”", "The clerk asks: “Do you have a passport?”"], ["Tom ma paszport.", "Tom has a passport."], ["Potem Tom wypłaca pieniądze w bankomacie.", "Then Tom withdraws money at the ATM."], ["Tom mówi: „Dziękuję. Do widzenia!”", "Tom says: “Thank you. Goodbye!”"]],
      grammar: [["g-modal", "Chcę / mogę + infinitive: Chcę otworzyć konto."], ["g-poprosze", "Poproszę = polite “I’d like”."], ["g-formal-informal", "Use pan / pani with strangers."], ["g-accusative", "konto, kartę, paszport: objects change their ending."]],
      vocab: "bank konto karta paszport pieniądze bankomat gotówka adres otworzyć wypłacić",
      talk: [["Dzień dobry. W czym mogę pomóc?", "Good morning. How can I help?"], ["Dzień dobry. Chcę otworzyć konto.", "Good morning. I want to open an account."], ["Poproszę o paszport.", "Your passport, please."], ["Proszę bardzo.", "Here you are."], ["Gdzie pan mieszka?", "Where do you live?"], ["Mieszkam w Warszawie.", "I live in Warsaw."], ["Dobrze. Karta będzie gotowa w piątek.", "Good. The card will be ready on Friday."], ["Ile to kosztuje?", "How much does it cost?"], ["To jest za darmo.", "It is free."], ["Dziękuję. Do widzenia!", "Thank you. Goodbye!"]] },
    { id: "cafe", emoji: "☕", title: "In a café", kw: "cafe café coffee tea restaurant order drink food eat kawa kawiarnia herbata", roles: ["Waiter", "Customer"],
      story: [["Anna jest w kawiarni.", "Anna is in a café."], ["Anna lubi kawę.", "Anna likes coffee."], ["Kelner pyta: „Co podać?”", "The waiter asks: “What can I get you?”"], ["Anna mówi: „Poproszę kawę i ciastko.”", "Anna says: “A coffee and a cookie, please.”"], ["Potem prosi o rachunek.", "Then she asks for the bill."], ["Płaci kartą.", "She pays by card."]],
      grammar: [["g-poprosze", "Poproszę + thing = ordering."], ["g-accusative", "kawa → kawę, herbata → herbatę."], ["g-modal", "Mogę zapłacić kartą? = May I pay by card?"], ["g-politeness", "proszę, dziękuję, smacznego."]],
      vocab: "kawa herbata mleko ciastko woda rachunek karta smacznego menu cukier",
      talk: [["Dzień dobry. Co podać?", "Good morning. What can I get you?"], ["Dzień dobry. Poproszę kawę.", "Good morning. A coffee, please."], ["Z mlekiem?", "With milk?"], ["Tak, z mlekiem. I jedno ciastko.", "Yes, with milk. And one cookie."], ["Proszę. To jest dwanaście złotych.", "Here you go. That is twelve zloty."], ["Mogę zapłacić kartą?", "Can I pay by card?"], ["Tak, oczywiście.", "Yes, of course."], ["Dziękuję.", "Thank you."], ["Smacznego!", "Enjoy!"]] },
    { id: "shop", emoji: "🛒", title: "In a shop", kw: "shop store buy shopping grocery supermarket market food sklep kupuję", roles: ["Seller", "Customer"],
      story: [["Marek jest w sklepie.", "Marek is in a shop."], ["Chce kupić chleb i mleko.", "He wants to buy bread and milk."], ["Pyta: „Ile to kosztuje?”", "He asks: “How much is it?”"], ["Chleb kosztuje cztery złote.", "The bread costs four zloty."], ["Mleko kosztuje pięć złotych.", "The milk costs five zloty."], ["Marek płaci i mówi: „Dziękuję!”", "Marek pays and says: “Thank you!”"]],
      grammar: [["g-ile", "Ile to kosztuje? = how much?"], ["g-numbers", "1 złoty, 2–4 złote, 5+ złotych."], ["g-accusative", "chleb stays, mleko stays; kawa → kawę."], ["g-questions", "co, ile, gdzie = question words."]],
      vocab: "sklep chleb mleko ser jajko jabłko tanio drogo złoty gotówka",
      talk: [["Dzień dobry. Słucham?", "Good morning. May I help you?"], ["Poproszę chleb i mleko.", "Bread and milk, please."], ["Proszę. Coś jeszcze?", "Here you go. Anything else?"], ["Nie, dziękuję. Ile płacę?", "No, thank you. How much do I pay?"], ["Dziewięć złotych.", "Nine zloty."], ["Proszę bardzo.", "Here you are."], ["Dziękuję. Do widzenia!", "Thank you. Goodbye!"], ["Do widzenia!", "Goodbye!"]] },
    { id: "doctor", emoji: "🩺", title: "At the doctor", kw: "doctor health sick ill pharmacy hospital hurt pain lekarz apteka boli chory", roles: ["Doctor", "Patient"],
      story: [["Ewa jest chora.", "Ewa is sick."], ["Boli ją gardło.", "Her throat hurts."], ["Idzie do lekarza.", "She goes to the doctor."], ["Lekarz pyta: „Co panią boli?”", "The doctor asks: “What hurts?”"], ["Ewa mówi: „Boli mnie gardło i głowa.”", "Ewa says: “My throat and head hurt.”"], ["Lekarz mówi: „Proszę pić dużo wody.”", "The doctor says: “Please drink a lot of water.”"]],
      grammar: [["g-questions", "Co boli? = what hurts?"], ["g-modal", "Czy mogę…? = may I…?"], ["g-politeness", "Proszę + infinitive = please do."], ["g-formal-informal", "pani / pan with a doctor."]],
      vocab: "lekarz boli głowa gardło brzuch chory leki apteka woda szpital",
      talk: [["Dzień dobry. Co panią boli?", "Good morning. What hurts?"], ["Boli mnie gardło i głowa.", "My throat and head hurt."], ["Od kiedy?", "Since when?"], ["Od wczoraj.", "Since yesterday."], ["Proszę pić dużo wody.", "Please drink a lot of water."], ["Czy mogę iść do pracy?", "Can I go to work?"], ["Nie, proszę zostać w domu.", "No, please stay at home."], ["Dziękuję bardzo.", "Thank you very much."]] },
    { id: "way", emoji: "🧭", title: "Asking the way", kw: "direction directions way lost station train bus street where taxi transport dworzec ulica gdzie", roles: ["Tourist", "Passer-by"],
      story: [["Kasia jest na ulicy.", "Kasia is on the street."], ["Szuka dworca.", "She is looking for the station."], ["Pyta: „Przepraszam, gdzie jest dworzec?”", "She asks: “Excuse me, where is the station?”"], ["Mężczyzna mówi: „Idź prosto, a potem w lewo.”", "A man says: “Go straight, then left.”"], ["Dworzec jest blisko.", "The station is near."], ["Kasia mówi: „Dziękuję!”", "Kasia says: “Thank you!”"]],
      grammar: [["g-gdzie", "Gdzie jest…? = Where is…?"], ["g-yesno", "Czy to jest daleko? = yes/no question."], ["g-prepositions", "w lewo, w prawo, na ulicy."], ["g-numbers", "Pięć minut = five minutes."]],
      vocab: "dworzec ulica prosto w lewo w prawo blisko daleko tutaj tam autobus bilet",
      talk: [["Przepraszam, gdzie jest dworzec?", "Excuse me, where is the station?"], ["Dzień dobry. Dworzec jest tam. Idź prosto.", "Hello. The station is there. Go straight."], ["Czy to jest daleko?", "Is it far?"], ["Nie, blisko. Pięć minut.", "No, near. Five minutes."], ["A potem?", "And then?"], ["Potem w lewo.", "Then left."], ["Dziękuję bardzo!", "Thank you very much!"], ["Proszę bardzo. Do widzenia!", "You’re welcome. Goodbye!"]] }
  ];

  /* ---------- injection helpers ---------- */
  const css = document.createElement("style");
  css.textContent = `.em-box{background:var(--card);border:1px solid rgba(255,255,255,.08);border-radius:var(--radius);padding:14px;margin-bottom:16px}
  .em-box h3{font-size:.95rem;margin-bottom:8px;color:var(--good)}.em-in{display:flex;gap:8px}.em-in input,.dc-in{flex:1;width:100%;padding:11px;border-radius:10px;border:1px solid #39404f;background:var(--card2);color:var(--text);font-size:.95rem}
  .em-go{padding:0 16px;border:none;border-radius:10px;background:var(--good);color:#06210f;font-weight:700;cursor:pointer}
  .em-chips{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}.em-chip{padding:6px 11px;border-radius:999px;border:1px solid #39404f;background:var(--card2);color:var(--text);font-size:.8rem;cursor:pointer}
  .em-chip.on{background:var(--good);color:#06210f;border-color:var(--good)}
  .em-line{display:flex;gap:10px;align-items:flex-start;padding:9px 10px;border-radius:10px;background:var(--card2);margin-bottom:6px;cursor:pointer}
  .em-line.b{margin-left:18px;border-left:3px solid var(--user)}.em-line.a{border-left:3px solid var(--accent)}
  .em-who{font-size:.65rem;font-weight:800;color:var(--muted);text-transform:uppercase;min-width:52px;padding-top:3px}
  .em-pl{font-weight:600}.em-pr{color:var(--blue);font-size:.8rem}.em-en{color:var(--muted);font-size:.82rem}.em-body{flex:1}
  .em-gr{font-size:.85rem;margin:6px 0;color:var(--muted)}.em-gr b{color:var(--grammar);cursor:pointer}
  .dc-card{background:var(--card);border-radius:12px;padding:12px;margin-bottom:8px;border-left:3px solid var(--good)}
  .dc-top{display:flex;justify-content:space-between;gap:8px}.dc-tag{font-size:.68rem;color:var(--muted);margin-top:2px}
  .dc-act{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap}.dc-act button{padding:5px 10px;border-radius:8px;border:1px solid #39404f;background:var(--card2);color:var(--text);font-size:.75rem;cursor:pointer}
  .dc-ex{font-size:.82rem;color:var(--muted);margin-top:6px}`;
  document.head.appendChild(css);

  function addTab(id, label, panelHtml) {
    const btn = document.createElement("button");
    btn.className = "tab"; btn.dataset.tabid = id; btn.textContent = label;
    btn.onclick = e => switchTab(e, id);
    const anchor = $('.tab[data-tabid="user"]');
    anchor.parentNode.insertBefore(btn, anchor);
    const p = document.createElement("div");
    p.className = "panel"; p.id = id; p.innerHTML = panelHtml;
    $("#user").parentNode.insertBefore(p, $("#user").nextSibling);
  }

  /* ---------- EASY MODE ---------- */
  addTab("easy", "🌱 Easy Mode", `
    <div class="em-box"><h3>🌱 Easy Mode — what do you want to learn and say?</h3>
      <div class="hint" style="color:var(--muted);font-size:.85rem;margin-bottom:10px">Type a situation (bank, coffee, doctor, shop, directions…) and get a short A1 story, the grammar behind it, key words, and a real conversation.</div>
      <div class="em-in"><input id="em-q" placeholder="e.g. I want to go to the bank" /><button class="em-go" id="em-go">Go</button></div>
      <div class="em-chips" id="em-chips"></div></div>
    <div id="em-out"></div>`);

  const chips = $("#em-chips");
  SC.forEach(s => { const b = document.createElement("button"); b.className = "em-chip"; b.textContent = s.emoji + " " + s.title; b.onclick = () => { $("#em-q").value = s.title; render(s); }; chips.appendChild(b); });

  function pick(q) {
    const f = fold(q), words = f.split(/[^a-z0-9]+/).filter(w => w.length > 2);
    let best = null, top = 0;
    SC.forEach(s => {
      const kws = fold(s.kw).split(" ");
      const sc = words.reduce((n, w) => n + (kws.some(k => k === w || (w.length > 3 && (k.startsWith(w) || w.startsWith(k)))) ? 1 : 0), 0);
      if (sc > top) { top = sc; best = s; }
    });
    return best;
  }

  const line = (pl, en, who, cls, g) => `<div class="em-line ${cls || ""}" data-pl="${esc(pl)}" data-en="${esc(en)}" data-g="${g || ""}">
    ${who ? `<div class="em-who">${who}</div>` : ""}<div class="em-body"><div class="em-pl">${esc(pl)}</div><div class="em-pr">${esc(pron(pl.replace(/[„”“”"]/g, "")))}</div><div class="em-en">${esc(en)}</div></div>
    <button class="row-speak" data-say="${esc(pl)}">🔊</button></div>`;

  function render(s) {
    const out = $("#em-out");
    const vocab = s.vocab.split(" ").length ? s.vocab.split(/ (?=[^ ]+(?: |$))/) : [];
    const keys = []; // multi-word entries (w lewo, w prawo)
    let rest = s.vocab;
    Object.keys(byPl).filter(k => k.includes(" ")).sort((a, b) => b.length - a.length).forEach(k => { if (rest.includes(k)) { keys.push(k); rest = rest.replace(k, ""); } });
    rest.split(" ").filter(Boolean).forEach(k => keys.push(k));
    out.innerHTML = `
      <div class="em-box"><h3>${s.emoji} ${s.title} — short story</h3>${s.story.map(x => line(x[0], x[1])).join("")}</div>
      <div class="em-box"><h3>ƒ A1 grammar in this story</h3>${s.grammar.map(g => `<div class="em-gr"><b data-g="${g[0]}">ƒ</b> ${esc(g[1])}</div>`).join("")}</div>
      <div class="em-box"><h3>🔑 Key words</h3>${keys.map(k => byPl[k]).filter(Boolean).map(d => `<div class="em-line" data-dict="${esc(d.pl)}"><div class="em-body"><div class="em-pl">${esc(d.pl)} <span class="em-pr">· ${esc(d.pron)}</span></div><div class="em-en">${esc(d.en)}</div></div><button class="row-speak" data-say="${esc(d.pl)}">🔊</button></div>`).join("")}</div>
      <div class="em-box"><h3>💬 Conversation — ${s.roles[0]} &amp; ${s.roles[1]}</h3>${s.talk.map((x, i) => line(x[0], x[1], s.roles[i % 2], i % 2 ? "b" : "a")).join("")}</div>`;
    chips.querySelectorAll(".em-chip").forEach((c, i) => c.classList.toggle("on", SC[i] === s));
    out.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  $("#em-go").onclick = () => {
    const q = $("#em-q").value.trim(); if (!q) return;
    const s = pick(q);
    if (s) return render(s);
    const hits = DB.filter(d => fold(d.en + " " + d.pl).includes(fold(q))).slice(0, 8);
    $("#em-out").innerHTML = `<div class="em-box"><h3>🤔 I don’t have a story for “${esc(q)}” yet</h3><div class="em-en">Easy Mode works offline with ready-made scenarios. Pick one above${hits.length ? ", or look at related words:" : "."}</div>
      ${hits.map(d => `<div class="em-line" data-dict="${esc(d.pl)}"><div class="em-body"><div class="em-pl">${esc(d.pl)} <span class="em-pr">· ${esc(d.pron)}</span></div><div class="em-en">${esc(d.en)}</div></div></div>`).join("")}</div>`;
  };
  $("#em-q").addEventListener("keydown", e => { if (e.key === "Enter") $("#em-go").click(); });

  $("#easy").addEventListener("click", e => {
    const say = e.target.closest("[data-say]"); if (say) { e.stopPropagation(); return speak(say.dataset.say); }
    const g = e.target.closest("b[data-g]"); if (g) return openGrammar(g.dataset.g);
    const dct = e.target.closest("[data-dict]"); if (dct) return showDict(byPl[dct.dataset.dict]);
    const l = e.target.closest(".em-line[data-pl]");
    if (l) showEntry(entryOf(l.dataset.pl.replace(/[„”“”]/g, ""), l.dataset.en, "", l.dataset.g), false);
  });

  /* ---------- DICTIONARY ---------- */
  const cats = ["All"].concat([...new Set(DB.map(d => d.cat))]);
  addTab("dictionary", "📚 Dictionary", `
    <div class="em-box"><h3>📚 Dictionary <span style="color:var(--muted);font-weight:400;font-size:.8rem">· ${DB.length} words</span></h3>
      <input class="dc-in" id="dc-q" placeholder="Search Polish or English… (no accents needed)" />
      <div class="em-chips" id="dc-cats"></div></div><div id="dc-list"></div>`);
  let cat = "All";
  const catBox = $("#dc-cats");
  cats.forEach(c => { const b = document.createElement("button"); b.className = "em-chip" + (c === "All" ? " on" : ""); b.textContent = c; b.onclick = () => { cat = c; catBox.querySelectorAll(".em-chip").forEach(x => x.classList.toggle("on", x === b)); list(); }; catBox.appendChild(b); });

  function showDict(d) {
    if (!d) return;
    const tip = `<strong>${esc(d.pos)}</strong> · ${esc(d.cat)}` + (d.xp ? `<br>Example: <em>${esc(d.xp)}</em> — ${esc(d.xe)}<br><span style="color:var(--blue)">${esc(pron(d.xp))}</span>` : "");
    showEntry({ pl: d.pl, en: d.en, pron: d.pron, letters: PLX.breakdown(d.pl), tip, grammar: null }, false);
  }
  let shown = [];
  function list() {
    const q = fold($("#dc-q").value.trim());
    shown = DB.filter(d => (cat === "All" || d.cat === cat) && (!q || fold(d.pl).includes(q) || fold(d.en).includes(q))).slice(0, 80);
    $("#dc-list").innerHTML = shown.length ? shown.map((d, i) => `<div class="dc-card" data-i="${i}">
      <div class="dc-top"><div><div class="em-pl">${esc(d.pl)} <span class="em-pr">· ${esc(d.pron)}</span></div><div class="em-en">${esc(d.en)}</div><div class="dc-tag">${esc(d.pos)} · ${esc(d.cat)}</div></div></div>
      ${d.xp ? `<div class="dc-ex">${esc(d.xp)}<br>${esc(d.xe)}</div>` : ""}
      <div class="dc-act"><button data-a="say">🔊 Listen</button><button data-a="more">Details</button><button data-a="add">＋ My Polish</button></div></div>`).join("")
      : `<div class="em-box em-en">No match. Add it yourself in <b>My Polish</b> — pronunciation fills in automatically.</div>`;
  }
  $("#dc-q").addEventListener("input", list);
  $("#dc-list").addEventListener("click", e => {
    const b = e.target.closest("button[data-a]"); if (!b) return;
    const d = shown[+b.closest(".dc-card").dataset.i];
    if (b.dataset.a === "say") speak(d.pl);
    else if (b.dataset.a === "more") showDict(d);
    else {
      if (userData.words.some(w => w.pl === d.pl)) { b.textContent = "✓ Already added"; return; }
      userData.words.push({ id: uid(), type: "word", pl: d.pl, en: d.en, pron: d.pron, letters: PLX.breakdown(d.pl), tip: `${d.pos} · ${d.cat}` + (d.xp ? ` — ${d.xp} = ${d.xe}` : ""), grammar: null });
      saveUserData(); renderUser(); b.textContent = "✓ Added";
    }
  });
  list();

  /* ---------- My Polish: repair / export / import ---------- */
  const BAD = /soft|hard|rolled|nasal|like|\?/;
  function oldWord(w) { /* output of the old buggy engine (functions still in the main script) */
    const c = w.replace(/[^\p{L}]/gu, ""); if (!c) return "";
    const sn = plSyllables(c).map(syllableToSound).filter(Boolean);
    if (!sn.length) return c.toLowerCase(); if (sn.length === 1) return sn[0];
    return sn.map((x, i) => i === sn.length - 2 ? x.toUpperCase() : x).join("-");
  }
  const oldPhrase = t => t.split(/\s+/).filter(Boolean).map(oldWord).join(" ");
  const looksBroken = it => (it.pron === oldPhrase(it.pl) && it.pron !== pron(it.pl)) || !it.pron || it.pron === "—" || BAD.test(it.pron) || it.pron.split(/\s+/).length !== it.pl.split(/\s+/).length;
  const items = () => userData.words.concat(...userData.convos.map(c => c.lines));
  function repair(force) {
    let n = 0;
    items().forEach(it => {
      if (!it.pl) return;
      const bad = force || looksBroken(it) || !it.letters || it.letters.some(x => BAD.test(x.s || "?"));
      if (!bad) return;
      it.pron = pron(it.pl); it.letters = PLX.breakdown(it.pl); n++;
    });
    saveUserData(); renderUser(); return n;
  }
  const box = document.createElement("div");
  box.className = "add-form";
  box.innerHTML = `<h3>🔧 Pronunciation repair &amp; backup</h3>
    <p style="color:var(--muted);font-size:.85rem;margin-bottom:10px">Fix words saved with a broken pronunciation, or back up / restore your entries (works with <code>tools/pl_fix.py</code>).</p>
    <div class="form-actions" style="flex-wrap:wrap"><button class="btn btn-user" id="rp-fix">Fix broken ones</button><button class="btn btn-secondary" id="rp-all">Regenerate all</button>
    <button class="btn btn-secondary" id="rp-exp">Export</button><button class="btn btn-secondary" id="rp-imp">Import</button><input type="file" id="rp-file" accept=".json" hidden></div>`;
  const danger = [...document.querySelectorAll("#user .add-form")].pop();
  danger.parentNode.insertBefore(box, danger);
  $("#rp-fix").onclick = () => alert(`Repaired ${repair(false)} entries.`);
  $("#rp-all").onclick = () => { if (confirm("Regenerate pronunciation + letters for ALL your entries? Manual edits will be replaced.")) alert(`Regenerated ${repair(true)} entries.`); };
  $("#rp-exp").onclick = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(userData, null, 2)], { type: "application/json" }));
    a.download = "my-polish-export.json"; a.click();
  };
  $("#rp-imp").onclick = () => $("#rp-file").click();
  $("#rp-file").onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    f.text().then(t => {
      const d = JSON.parse(t), ids = new Set(userData.words.map(w => w.id)), cids = new Set(userData.convos.map(c => c.id));
      (d.words || []).forEach(w => { if (!ids.has(w.id)) userData.words.push(w); });
      (d.convos || []).forEach(c => { if (!cids.has(c.id)) userData.convos.push(c); });
      saveUserData(); renderUser(); alert("Imported.");
    }).catch(() => alert("That file is not a valid export."));
    e.target.value = "";
  };
})();
