/* polish-db-additions.js — extra dictionary entries + "add to My Polish" upgrade.
   Load AFTER polish-db.js and easy-mode.js. Touches nothing else. */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = s => (typeof escapeHtml === "function" ? escapeHtml(s) : String(s));
  const pron = t => (window.PLX ? PLX.pronounceText(t) : "");
  const brk = t => (window.PLX ? PLX.breakdown(t) : []);

  /* ---------- extra words ---------- */
  /* Same format as polish-db.js: pl|english|pos|cat|example pl = example en */
  const EXTRA = `
proszę bardzo|you're welcome|phrase|Politeness
nie ma za co|don't mention it|phrase|Politeness
miło mi|nice to meet you|phrase|Greetings|Miło mi, jestem Anna. = Nice to meet you, I'm Anna.
jak się masz?|how are you? (informal)|phrase|Greetings
jak się pan/pani ma?|how are you? (formal)|phrase|Greetings
skąd jesteś?|where are you from?|phrase|Greetings|Skąd jesteś? Jestem z Iranu. = Where are you from? I'm from Iran.
mam na imię|my name is|phrase|Greetings|Mam na imię Ali. = My name is Ali.
nazywam się|I am called|phrase|Greetings|Nazywam się Ali. = My name is Ali.
do zobaczenia|see you|phrase|Greetings
miłego dnia|have a nice day|phrase|Greetings
smacznego|enjoy your meal|interj|Food
na zdrowie|cheers / bless you|phrase|Food
sto lat|happy birthday (lit. 100 years)|phrase|Greetings
wszystkiego najlepszego|all the best|phrase|Greetings
przepraszam bardzo|I'm very sorry|phrase|Politeness
nie szkodzi|never mind|phrase|Politeness
nic nie szkodzi|it's no trouble|phrase|Politeness
oczywiście|of course|adv|Politeness|Oczywiście, proszę. = Of course, here you go.
jasne|sure|adv|Politeness
fajnie|cool / nice|adv|Politeness
świetnie|great|adv|Politeness
zgadzam się|I agree|phrase|Politeness
nie zgadzam się|I don't agree|phrase|Politeness
rozumiem|I understand|verb|Basics
nie rozumiem|I don't understand|phrase|Basics|Nie rozumiem, proszę powtórzyć. = I don't understand, please repeat.
możesz powtórzyć?|can you repeat?|phrase|Basics
mów wolniej, proszę|speak slower, please|phrase|Basics
nie wiem|I don't know|phrase|Basics
może być|it's OK / it'll do|phrase|Basics
w porządku|all right|phrase|Basics
tak, oczywiście|yes, of course|phrase|Basics
nie, dziękuję|no, thank you|phrase|Basics
tak, proszę|yes, please|phrase|Basics
gdzie jest toaleta?|where is the toilet?|phrase|Directions|Gdzie jest toaleta? = Where is the toilet?
gdzie jest dworzec?|where is the station?|phrase|Directions
jak dojść do...?|how do I get to...?|phrase|Directions
jak dojechać do...?|how do I get (by vehicle) to...?|phrase|Directions
to daleko?|is it far?|phrase|Directions
to blisko|it's close|phrase|Directions
idź prosto|go straight|phrase|Directions
skręć w lewo|turn left|phrase|Directions
skręć w prawo|turn right|phrase|Directions
na końcu ulicy|at the end of the street|phrase|Directions
za rogiem|around the corner|phrase|Directions
naprzeciwko|opposite|prep|Directions
obok|next to|prep|Directions
między|between|prep|Directions
przy|by / at|prep|Directions
nad|above|prep|Directions
pod|under|prep|Directions
przed|in front of|prep|Directions
za|behind|prep|Directions
ile to kosztuje?|how much does it cost?|phrase|Money
to jest drogie|that's expensive|phrase|Money
to jest tanie|that's cheap|phrase|Money
mam kartę|I have a card|phrase|Money
płacę kartą|I'm paying by card|phrase|Money
płacę gotówką|I'm paying cash|phrase|Money
poproszę rachunek|the bill, please|phrase|Money
razem czy osobno?|together or separately?|phrase|Money
razem|together|adv|Money
osobno|separately|adv|Money
reszta|change (money back)|noun|Money
paragon|receipt|noun|Money
faktura|invoice|noun|Money
bankomat|ATM|noun|Money|Gdzie jest bankomat? = Where is the ATM?
kantor|currency exchange|noun|Money
kurs|exchange rate|noun|Money
złoty|zloty|noun|Money
grosz|grosz (1/100 zloty)|noun|Money
euro|euro|noun|Money
dolar|dollar|noun|Money
chcę kupić|I want to buy|phrase|Shopping
chcę zobaczyć|I want to see|phrase|Shopping
tylko patrzę|just looking|phrase|Shopping
poproszę to|I'd like that one|phrase|Shopping
to wszystko|that's all|phrase|Shopping
coś jeszcze?|anything else?|phrase|Shopping
nie, to wszystko|no, that's all|phrase|Shopping
jaki rozmiar?|what size?|phrase|Shopping
jaki kolor?|what colour?|phrase|Shopping
ma pan/pani...?|do you have...? (formal)|phrase|Shopping
szukam...|I'm looking for...|phrase|Shopping
przymierzalnia|changing room|noun|Shopping
wyprzedaż|sale|noun|Shopping
promocja|special offer|noun|Shopping
rabat|discount|noun|Shopping
torebka|bag (small)|noun|Shopping
torba|bag (large)|noun|Shopping
buty|shoes|noun|Shopping
koszula|shirt|noun|Shopping
spodnie|trousers|noun|Shopping
sukienka|dress|noun|Shopping
kurtka|jacket|noun|Shopping
sweter|sweater|noun|Shopping
czapka|hat / beanie|noun|Shopping
szalik|scarf|noun|Shopping
rękawiczki|gloves|noun|Shopping
chcę kawę|I'd like a coffee|phrase|Food
chcę herbatę|I'd like a tea|phrase|Food
kawa z mlekiem|coffee with milk|phrase|Food
kawa bez cukru|coffee without sugar|phrase|Food
dużą czy małą?|large or small?|phrase|Food
dużą, proszę|large, please|phrase|Food
małą, proszę|small, please|phrase|Food
na wynos|takeaway|phrase|Food
na miejscu|eat in|phrase|Food
co polecacie?|what do you recommend?|phrase|Food
dla mnie...|for me...|phrase|Food
dla niego...|for him...|phrase|Food
dla niej...|for her...|phrase|Food
smakuje mi|it tastes good to me|phrase|Food
nie smakuje mi|I don't like the taste|phrase|Food
jestem głodny|I'm hungry (man speaking)|phrase|Food
jestem głodna|I'm hungry (woman speaking)|phrase|Food
jestem spragniony|I'm thirsty (man speaking)|phrase|Food
jestem spragniona|I'm thirsty (woman speaking)|phrase|Food
śniadanie|breakfast|noun|Food
obiad|lunch / main meal|noun|Food
kolacja|supper|noun|Food
przekąska|snack|noun|Food
deser|dessert|noun|Food
lody|ice cream|noun|Food
ciasto|cake|noun|Food
tort|layer cake|noun|Food
cukiernia|cake shop|noun|Food
piekarnia|bakery|noun|Food
mięsny|meat (adj)|adj|Food
wegetariański|vegetarian|adj|Food
ostry|spicy|adj|Food
słodki|sweet|adj|Food
słony|salty|adj|Food
kwaśny|sour|adj|Food
gorzki|bitter|adj|Food
ciepły|warm|adj|Food
zimny|cold|adj|Food
świeży|fresh|adj|Food
gorący|hot|adj|Food
gotowany|boiled|adj|Food
smażony|fried|adj|Food
pieczony|baked|adj|Food
grillowany|grilled|adj|Food
zupa pomidorowa|tomato soup|noun|Food
rosół|clear chicken broth|noun|Food
żurek|sour rye soup|noun|Food
barszcz|beetroot soup|noun|Food
pierogi|dumplings|noun|Food
kotlet schabowy|breaded pork cutlet|noun|Food
bigos|hunter's stew|noun|Food
gołąbki|cabbage rolls|noun|Food
naleśniki|pancakes|noun|Food
placki ziemniaczane|potato pancakes|noun|Food
sernik|cheesecake|noun|Food
szarlotka|apple cake|noun|Food
pączek|doughnut|noun|Food
chcę iść do lekarza|I want to go to the doctor|phrase|Health
boli mnie głowa|my head hurts|phrase|Health
boli mnie gardło|my throat hurts|phrase|Health
boli mnie brzuch|my stomach hurts|phrase|Health
boli mnie ząb|my tooth hurts|phrase|Health
mam gorączkę|I have a fever|phrase|Health
mam katar|I have a runny nose|phrase|Health
mam kaszel|I have a cough|phrase|Health
jestem chory|I'm sick (man speaking)|phrase|Health
jestem chora|I'm sick (woman speaking)|phrase|Health
czuję się dobrze|I feel well|phrase|Health
czuję się źle|I feel bad|phrase|Health
potrzebuję pomocy|I need help|phrase|Health
wezwać karetkę|to call an ambulance|phrase|Health
apteka|pharmacy|noun|Health
recepta|prescription|noun|Health
tabletka|tablet / pill|noun|Health
syrop|syrup|noun|Health
zastrzyk|injection|noun|Health
badanie|test / examination|noun|Health
krew|blood|noun|Health
ciśnienie|blood pressure|noun|Health
temperatura|temperature|noun|Health
przeziębienie|cold (illness)|noun|Health
grypa|flu|noun|Health
ból|pain|noun|Health
lekarz rodzinny|family doctor|noun|Health
pogotowie|emergency service|noun|Health
szpital|hospital|noun|Health
przychodnia|clinic|noun|Health
numerek|queue number|noun|Health
ubezpieczenie|insurance|noun|Health
mam ubezpieczenie|I have insurance|phrase|Health
nie mam ubezpieczenia|I don't have insurance|phrase|Health
nazywam się...|my name is...|phrase|Introductions
mam... lat|I am ... years old|phrase|Introductions|Mam trzydzieści lat. = I am thirty years old.
jestem z Iranu|I'm from Iran|phrase|Introductions
jestem z Polski|I'm from Poland|phrase|Introductions
mieszkam w...|I live in...|phrase|Introductions
pracuję w...|I work in...|phrase|Introductions
uczę się polskiego|I'm learning Polish|phrase|Introductions
mówię po angielsku|I speak English|phrase|Introductions
mówię po persku|I speak Persian|phrase|Introductions
nie mówię po polsku|I don't speak Polish|phrase|Introductions
mówię trochę po polsku|I speak a little Polish|phrase|Introductions
miło mi pana/panią poznać|nice to meet you (formal)|phrase|Introductions
do usłyszenia|until we hear each other (phone)|phrase|Greetings
trzymaj się|take care|phrase|Greetings
powodzenia|good luck|phrase|Greetings
gratulacje|congratulations|noun|Greetings
wszystkiego dobrego|all the best|phrase|Greetings
wesołych świąt|happy holidays|phrase|Greetings
szczęśliwego Nowego Roku|happy New Year|phrase|Greetings
jak leci?|how's it going?|phrase|Greetings
co słychać?|what's up?|phrase|Greetings
wszystko w porządku|everything's fine|phrase|Greetings
tak sobie|so-so|phrase|Greetings
źle|badly|adv|Greetings
dobrze|well|adv|Greetings
`;

  /* merge into the dictionary the app already loaded */
  if (typeof window !== "undefined") {
    if (!window.PL_DB_RAW) window.PL_DB_RAW = "";
    window.PL_DB_RAW = window.PL_DB_RAW.trimEnd() + "\n" + EXTRA.trim() + "\n";
  }

  /* ---------- add a dictionary word straight into My Polish ----------
     BUG FIXED: the old version looked userData up on the window object, but userData is
     declared with `let` in the main script, so it is not a window property -> the function
     silently returned and nothing was ever added. We now use the shared global binding. */
  function addToMyPolish(d) {
    if (typeof userData === "undefined" || !userData || !userData.words) return "error";
    if (userData.words.some(w => (w.pl || "").toLowerCase() === d.pl.toLowerCase())) return "dupe";
    const tip = `${d.pos || ""}${d.cat ? " · " + d.cat : ""}${d.xp ? " — " + d.xp + " = " + d.xe : ""}`.trim();
    let g = null;
    try { g = typeof suggestGrammar === "function" ? suggestGrammar(d.pl) : null; } catch (e) {}
    userData.words.push({
      id: uid(),
      type: d.pl.trim().split(/\s+/).length > 2 ? "sentence" : "word",
      pl: d.pl, en: d.en,
      pron: pron(d.pl),
      letters: brk(d.pl),
      tip: tip || "From the dictionary.",
      grammar: g ? g.id : null
    });
    saveUserData();
    renderUser();
    if (typeof playSound === "function") { try { playSound("points"); } catch (e) {} }
    return "added";
  }
  window.addDictToMyPolish = addToMyPolish;

  /* Remove easy-mode.js's click listener from the ORIGINAL #dc-list by
     replacing the element with a clean clone. easy-mode.js attaches its
     listener directly to the element, so cloning drops it. */
  function killStaleListener() {
    const stale = document.getElementById("dc-list");
    if (!stale || !stale.parentNode) return;
    const clone = stale.cloneNode(true);
    stale.parentNode.replaceChild(clone, stale);
  }

  /* ---------- rebuild the Dictionary tab from the merged DB ---------- */
  /* Rebuilds the whole panel so old listeners are thrown away, then
     attaches one clean listener. Fixes the "wrong word gets added" bug
     caused by two listeners sharing the same #dc-list element. */
  function patchDictionaryList() {
    const oldPanel = document.getElementById("dictionary");
    if (!oldPanel || !window.PL_DB_RAW) return;

    /* --- parse the merged DB the same way easy-mode.js does --- */
    const parse = t => t.trim().split("\n").map(l => {
      const [pl, en, pos, cat, ex] = l.split("|");
      const [xp, xe] = (ex || "").split(" = ");
      return { pl, en, pos, cat, xp, xe, pron: pron(pl) };
    });
    const all = parse(window.PL_DB_RAW);
    const seen = new Set();
    const db = all.filter(d => {
      if (!d.pl || seen.has(d.pl.toLowerCase())) return false;
      seen.add(d.pl.toLowerCase());
      return true;
    });
    const fold = s => String(s).toLowerCase().replace(/ł/g, "l")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    /* --- build a brand-new panel with the same markup --- */
    const fresh = document.createElement("div");
    fresh.className = "panel";
    fresh.id = "dictionary";
    fresh.innerHTML = `
      <div class="em-box">
        <h3>📚 Dictionary <span style="color:var(--muted);font-weight:400;font-size:.8rem">· ${db.length} words</span></h3>
        <input class="dc-in" id="dc-q" placeholder="Search Polish or English… (no accents needed)" />
        <div class="em-chips" id="dc-cats"></div>
      </div>
      <div id="dc-list"></div>`;

    oldPanel.parentNode.replaceChild(fresh, oldPanel);

    const list = fresh.querySelector("#dc-list");
    const q = fresh.querySelector("#dc-q");
    const chips = fresh.querySelector("#dc-cats");

    let cat = "All";
    const cats = ["All"].concat([...new Set(db.map(d => d.cat))].filter(Boolean));
    cats.forEach(c => {
      const b = document.createElement("button");
      b.className = "em-chip" + (c === "All" ? " on" : "");
      b.textContent = c;
      b.onclick = () => {
        cat = c;
        chips.querySelectorAll(".em-chip").forEach(x => x.classList.toggle("on", x === b));
        render();
      };
      chips.appendChild(b);
    });

    let shown = [];
    function render() {
      const needle = fold(q.value.trim());
      shown = db.filter(d => (cat === "All" || d.cat === cat) &&
        (!needle || fold(d.pl).includes(needle) || fold(d.en).includes(needle))).slice(0, 120);
      list.innerHTML = shown.length ? shown.map((d, i) => `<div class="dc-card" data-i="${i}">
        <div class="dc-top"><div><div class="em-pl">${esc(d.pl)} <span class="em-pr">· ${esc(d.pron)}</span></div><div class="em-en">${esc(d.en)}</div><div class="dc-tag">${esc(d.pos || "")}${d.cat ? " · " + esc(d.cat) : ""}</div></div></div>
        ${d.xp ? `<div class="dc-ex">${esc(d.xp)}<br>${esc(d.xe)}</div>` : ""}
        <div class="dc-act">
          <button data-a="say">🔊 Listen</button>
          <button data-a="more">Details</button>
          <button data-a="add">＋ My Polish</button>
        </div></div>`).join("")
        : `<div class="em-box em-en">No match. Add it yourself in <b>My Polish</b> — pronunciation fills in automatically.</div>`;
    }
    render();

    /* one listener, on the fresh list element */
    list.addEventListener("click", e => {
      const b = e.target.closest("button[data-a]");
      if (!b) return;
      const d = shown[+b.closest(".dc-card").dataset.i];
      if (!d) return;
      if (b.dataset.a === "say") {
        if (typeof speakPl === "function") speakPl(d.pl);
      } else if (b.dataset.a === "more") {
        if (typeof showEntry === "function") {
          showEntry({
            pl: d.pl, en: d.en, pron: d.pron,
            letters: brk(d.pl),
            tip: `<strong>${esc(d.pos || "")}</strong>${d.cat ? " · " + esc(d.cat) : ""}` +
                 (d.xp ? `<br>Example: <em>${esc(d.xp)}</em> — ${esc(d.xe)}` : ""),
            grammar: null
          }, false);
        }
      } else if (b.dataset.a === "add") {
        const r = addToMyPolish(d);
        b.textContent = r === "added" ? "✓ Added to My Polish" : r === "dupe" ? "✓ Already in My Polish" : "⚠ Could not add";
        b.disabled = r !== "error";
      }
    });
  }

  /* Wait until easy-mode.js has had a chance to build the list, then patch. */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(killStaleListener, 0);
      setTimeout(patchDictionaryList, 0);
    });
  } else {
    setTimeout(killStaleListener, 0);
    setTimeout(patchDictionaryList, 0);
  }
})();