/* app-nav.js — simpler navigation, nothing removed.
   The 12-tab strip (horizontal scrolling, scrollbars) is replaced by:
     • a fixed bottom bar with 5 big buttons (no scrolling), and
     • a small wrapping chip row for the sections inside a group (no scrolling).
   The original tab buttons stay in the page (hidden) so every existing feature, badge and
   switchTabById() call keeps working. Load LAST. */
(function () {
  const GROUPS = [
    { id: "learn", icon: "🎓", label: "Learn", tabs: ["daily", "alphabet", "words", "lessons", "grammar"] },
    { id: "easy", icon: "🌱", label: "Easy", tabs: ["easy"] },
    { id: "dict", icon: "📚", label: "Dictionary", tabs: ["dictionary"] },
    { id: "fun", icon: "🎮", label: "Practice", tabs: ["funmode", "exam", "flirt", "street"] },
    { id: "mine", icon: "👤", label: "My Polish", tabs: ["user"] }
  ];

  const css = document.createElement("style");
  css.textContent = `
  .tabs{display:none!important}
  body{padding-bottom:calc(92px + env(safe-area-inset-bottom,0px))!important}
  #subnav{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 16px}
  #subnav:empty{display:none}
  #subnav button{padding:7px 12px;border-radius:999px;border:1px solid #39404f;background:var(--card);color:var(--muted);font-size:.8rem;font-weight:600;cursor:pointer}
  #subnav button.on{background:var(--accent);color:#fff;border-color:var(--accent)}
  #subnav button .tab-badge{display:none}#subnav button .tab-badge.show{display:inline}
  #botnav{position:fixed;left:0;right:0;bottom:0;z-index:80;display:flex;justify-content:center;
    background:rgba(20,22,28,.94);backdrop-filter:blur(10px);border-top:1px solid rgba(255,255,255,.08);
    padding-bottom:env(safe-area-inset-bottom,0px)}
  #botnav .in{display:flex;width:100%;max-width:640px}
  #botnav button{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 2px 9px;border:none;background:none;color:var(--muted);cursor:pointer;font-size:.66rem;font-weight:600}
  #botnav button .ic{font-size:1.25rem;line-height:1}
  #botnav button.on{color:var(--text)}
  #botnav button.on .ic{transform:translateY(-1px)}
  #botnav button.on::after{content:"";width:18px;height:3px;border-radius:3px;background:var(--accent);margin-top:2px}
  #botnav button:not(.on)::after{content:"";height:3px;margin-top:2px}
  details.pn-fold{margin-bottom:16px}
  details.pn-fold>summary{cursor:pointer;padding:12px 14px;background:var(--card);border-radius:var(--radius);color:var(--muted);font-size:.85rem;font-weight:600;list-style:none}
  details.pn-fold>summary::-webkit-details-marker{display:none}
  details.pn-fold[open]>summary{border-bottom-left-radius:0;border-bottom-right-radius:0}
  #dc-cats{display:none!important}
  .dc-select{width:100%;padding:11px;border-radius:10px;border:1px solid #39404f;background:var(--card2);color:var(--text);font-size:.9rem;margin-top:8px}`;
  document.head.appendChild(css);

  function init() {
    const strip = document.querySelector(".tabs");
    if (!strip || document.getElementById("botnav")) return;
    const tabBtn = id => strip.querySelector('.tab[data-tabid="' + id + '"]');
    const known = new Set(GROUPS.flatMap(g => g.tabs));
    strip.querySelectorAll(".tab[data-tabid]").forEach(b => { if (!known.has(b.dataset.tabid)) GROUPS[0].tabs.push(b.dataset.tabid); });
    const groups = GROUPS.map(g => Object.assign({}, g, { tabs: g.tabs.filter(tabBtn) })).filter(g => g.tabs.length);
    const last = {};
    const labelOf = b => { const n = b.firstChild; return (n && n.nodeType === 3 ? n.textContent : b.textContent).trim(); };

    const sub = document.createElement("div"); sub.id = "subnav";
    strip.parentNode.insertBefore(sub, strip);
    const nav = document.createElement("nav"); nav.id = "botnav"; nav.setAttribute("aria-label", "Main");
    nav.innerHTML = '<div class="in"></div>';
    document.body.appendChild(nav);
    const inner = nav.firstChild;

    groups.forEach(g => {
      const b = document.createElement("button");
      b.dataset.g = g.id; b.innerHTML = '<span class="ic">' + g.icon + "</span><span>" + g.label + "</span>";
      b.onclick = () => go(last[g.id] || g.tabs[0]);
      inner.appendChild(b);
    });

    function go(id) { const b = tabBtn(id); if (b) b.click(); }

    function sync() {
      const act = strip.querySelector(".tab.active");
      const id = act && act.dataset.tabid;
      const g = groups.find(x => x.tabs.includes(id)) || groups[0];
      if (id) last[g.id] = id;
      inner.querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.g === g.id));
      sub.innerHTML = "";
      if (g.tabs.length > 1) g.tabs.forEach(t => {
        const src = tabBtn(t), c = document.createElement("button");
        c.textContent = labelOf(src); c.className = t === id ? "on" : "";
        const bd = src.querySelector(".tab-badge");
        if (bd) { const s = document.createElement("span"); s.className = bd.className; s.textContent = bd.textContent; c.appendChild(s); }
        c.onclick = () => go(t);
        sub.appendChild(c);
      });
    }
    new MutationObserver(sync).observe(strip, { attributes: true, subtree: true, attributeFilter: ["class"], childList: false });
    sync();

    /* My Polish: tuck the repair / backup tools away */
    const rp = document.getElementById("rp-fix");
    const rbox = rp && rp.closest(".add-form");
    if (rbox && !rbox.closest("details")) {
      const d = document.createElement("details"); d.className = "pn-fold";
      d.innerHTML = "<summary>🔧 Repair &amp; backup tools</summary>";
      rbox.parentNode.insertBefore(d, rbox); d.appendChild(rbox);
    }

    /* Dictionary: 20+ category chips -> one dropdown. The dictionary panel is rebuilt a moment after
       page load by polish-db-additions.js, so keep checking briefly until the chips exist. */
    function dictSelect() {
      const chips = document.getElementById("dc-cats");
      if (!chips || !chips.querySelector(".em-chip") || document.getElementById("dc-select")) return !!document.getElementById("dc-select");
      const sel = document.createElement("select"); sel.id = "dc-select"; sel.className = "dc-select";
      chips.querySelectorAll(".em-chip").forEach(c => { const o = document.createElement("option"); o.textContent = c.textContent === "All" ? "All categories" : c.textContent; o.value = c.textContent; sel.appendChild(o); });
      sel.onchange = () => { const c = [...chips.querySelectorAll(".em-chip")].find(x => x.textContent === sel.value); if (c) c.click(); };
      chips.parentNode.insertBefore(sel, chips);
      return true;
    }
    let tries = 0;
    const iv = setInterval(() => { if (dictSelect() && tries > 3 || ++tries > 25) clearInterval(iv); }, 200);
    dictSelect();
  }
  if (document.readyState === "complete") init(); else window.addEventListener("load", init);
})();
