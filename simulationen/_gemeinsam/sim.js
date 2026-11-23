/* Frühe Simulationen · gemeinsamer Rahmen für alle Apps (Bedienung, Ablauf, Zeichenfläche, Sprache, Hell/Dunkel).
   Eine App ruft Sim.starte({...}) aus ihrer app.js auf; die Modelllogik steht getrennt in modell.js (ohne DOM).
   Beschreibung der Schnittstelle: ../REZEPT.md im Repo bzw. AGENTS.md jeder App.
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const $ = s => document.querySelector(s);
  const lies = (k, d) => { try { return localStorage.getItem(k) || d; } catch (e) { return d; } };
  const merke = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  /** Zweisprachiger Text: {de, en} oder Zeichenkette → zwei <span lang> (die Sprache schaltet per CSS um) */
  const zwei = t => (t && typeof t === "object") ? `<span lang="de">${esc(t.de)}</span><span lang="en">${esc(t.en || t.de)}</span>` : esc(t == null ? "" : t);
  const SUN = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="3"/><path d="M8 1v1.6M8 13.4V15M1 8h1.6M13.4 8H15M3 3l1.1 1.1M11.9 11.9 13 13M3 13l1.1-1.1M11.9 4.1 13 3"/></svg>';
  const MOON = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13.5 9.6A5.8 5.8 0 0 1 6.4 2.5a5.8 5.8 0 1 0 7.1 7.1Z"/></svg>';

  /* ---------------------------------------------------------------- Farben */
  function rgb(hex) {
    const h = String(hex).trim().replace("#", "");
    const v = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
    return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
  }
  const mische = (a, b, t) => [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * t));
  const css = c => `rgb(${c[0]},${c[1]},${c[2]})`;
  function farben() {
    const s = getComputedStyle(document.documentElement), g = n => s.getPropertyValue(n).trim();
    const F = { papier: g("--paper"), flaeche: g("--surface"), tinte: g("--ink"), tinte2: g("--ink-2"), gedaempft: g("--muted"),
                linie: g("--line"), akzent: g("--accent"), akzentText: g("--accent-text"),
                dunkel: document.documentElement.dataset.theme !== "light" };
    F.rgb = {}; for (const k of Object.keys(F)) if (typeof F[k] === "string" && F[k][0] === "#") F.rgb[k] = rgb(F[k]);
    return F;
  }

  /* ---------------------------------------------------------------- Sprache und Darstellung */
  function sprache(l) {
    l = l === "en" ? "en" : "de"; merke("entwurfsforschung-sprache", l); document.documentElement.lang = l;
    document.querySelectorAll(".sprache").forEach(b => b.setAttribute("aria-pressed", b.dataset.lang === l));
    malThema();
  }
  const istDunkel = () => document.documentElement.dataset.theme !== "light";
  function malThema() {
    const b = $("#theme"); if (!b) return;
    const d = istDunkel(), en = document.documentElement.lang === "en";
    b.innerHTML = (d ? SUN : MOON) + `<span class="t-txt">${d ? (en ? "Light" : "Hell") : (en ? "Dark" : "Dunkel")}</span>`;
    b.setAttribute("aria-label", en ? (d ? "Switch to light" : "Switch to dark") : (d ? "Zur hellen Darstellung wechseln" : "Zur dunklen Darstellung wechseln"));
  }

  /* ---------------------------------------------------------------- Rasterbild (schnell für Zellenfelder) */
  const puffer = {};
  /** Zeichnet ein Zellenfeld b × h; fuelle(daten, b, h) schreibt RGBA-Werte (Uint8ClampedArray, 4 je Zelle). */
  function raster(ctx, b, h, fuelle, x = 0, y = 0, w = b, hh = h) {
    const k = b + "x" + h;
    if (!puffer[k]) { const c = document.createElement("canvas"); c.width = b; c.height = h; puffer[k] = { c, x: c.getContext("2d"), bild: null }; }
    const p = puffer[k]; if (!p.bild) p.bild = p.x.createImageData(b, h);
    fuelle(p.bild.data, b, h); p.x.putImageData(p.bild, 0, 0);
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(p.c, x, y, w, hh); ctx.restore();
  }

  /* ---------------------------------------------------------------- App */
  function starte(cfg) {
    const M = cfg.modell, P = cfg.parameter || [];
    const canvas = $("#leinwand"), ctx = canvas.getContext("2d"), steuer = $("#steuerung");
    const p = {}; P.forEach(d => { p[d.id] = d.wert; });
    let saat = cfg.saat || 1, tempo = (cfg.tempo || {}).wert || 1, laeuft = false, z = null, massstab = 1, bildPlan = false;

    // Werte aus der Adresse (#saat=7&dichte=0.4) – so lässt sich ein Lauf teilen und wiederholen
    try {
      const h = new URLSearchParams(location.hash.slice(1));
      h.forEach((v, k) => {
        if (k === "saat") saat = parseInt(v, 10) || saat;
        const d = P.find(q => q.id === k);
        if (d) p[k] = d.art === "schalter" ? v === "1" : d.art === "auswahl" ? v : Number(v);
      });
      // Voreinstellungen einer gewählten Auswahl (folgen) gelten auch beim Aufruf über die Adresse, sofern dort nicht selbst gesetzt
      P.forEach(d => { const f = d.folgen && h.has(d.id) && d.folgen[p[d.id]]; if (f) Object.keys(f).forEach(k => { if (!h.has(k)) p[k] = f[k]; }); });
    } catch (e) {}
    const adresse = () => {
      const q = new URLSearchParams(); q.set("saat", saat);
      // Bezug ist die Voreinstellung der gewählten Fassung (folgen), sonst der Startwert – so bleibt der Link kurz und eindeutig
      const bezug = {}; P.forEach(d => { bezug[d.id] = d.wert; });
      P.forEach(d => { const f = d.folgen && p[d.id] !== d.wert && d.folgen[p[d.id]]; if (f) Object.keys(f).forEach(k => { bezug[k] = f[k]; }); });
      P.forEach(d => { if (p[d.id] !== bezug[d.id]) q.set(d.id, d.art === "schalter" ? (p[d.id] ? "1" : "0") : p[d.id]); });
      try { history.replaceState(null, "", "#" + q.toString()); } catch (e) {}
    };

    // ---- Bedienfeld
    const t = cfg.tempo || { min: 1, max: 20, wert: 1 };
    let h = `<div class="block"><h2 class="mono">${zwei({ de: "Ablauf", en: "Run" })}</h2>
      <div class="knoepfe">
        <button class="knopf haupt" type="button" id="k-start">${zwei({ de: "Start", en: "Start" })}</button>
        <button class="knopf" type="button" id="k-pause">${zwei({ de: "Pause", en: "Pause" })}</button>
        <button class="knopf" type="button" id="k-schritt">${zwei({ de: "Schritt", en: "Step" })}</button>
        <button class="knopf" type="button" id="k-neu" title="Zurücksetzen">${zwei({ de: "Zurück", en: "Reset" })}</button>
      </div>${(cfg.aktionen || []).length ? `<div class="knoepfe">${cfg.aktionen.map((a, i) => `<button class="knopf" type="button" data-aktion="${i}">${zwei(a.name)}</button>`).join("")}</div>` : ""}
      <div class="zeile"><label class="mono" for="p-saat">${zwei({ de: "Saat", en: "Seed" })}</label><input type="number" id="p-saat" min="1" max="999999" step="1" value="${saat}"></div>
      <div class="zeile"><label class="mono" for="p-tempo">${zwei({ de: "Schritte je Bild", en: "Steps per frame" })}</label><output id="o-tempo">${tempo}</output>
        <input type="range" id="p-tempo" min="${t.min}" max="${t.max}" step="1" value="${tempo}"></div>
    </div><div class="block" id="b-param"><h2 class="mono">${zwei({ de: "Parameter", en: "Parameters" })}</h2>`;
    let gruppe = null;
    P.forEach(d => {
      if (d.gruppe && JSON.stringify(d.gruppe) !== JSON.stringify(gruppe)) { gruppe = d.gruppe; h += `<div class="gruppe mono">${zwei(d.gruppe)}</div>`; }
      const id = "p-" + d.id, name = zwei(d.name) + (d.neustart ? ' <span class="hinweis" title="setzt zurück">↺</span>' : "");
      if (d.art === "schalter") h += `<div class="zeile"><label for="${id}">${name}</label><input type="checkbox" id="${id}"${p[d.id] ? " checked" : ""}></div>`;
      else if (d.art === "auswahl") h += `<div class="zeile"><label for="${id}">${name}</label><select id="${id}">${d.optionen.map(o => `<option value="${esc(o.wert)}"${o.wert === p[d.id] ? " selected" : ""}>${esc(typeof o.name === "object" ? o.name.de : o.name)}</option>`).join("")}</select></div>`;
      else h += `<div class="zeile"><label for="${id}">${name}</label><output id="o-${d.id}"></output><input type="range" id="${id}" min="${d.min}" max="${d.max}" step="${d.schritt || 1}" value="${p[d.id]}"></div>`;
    });
    h += `</div><div class="block"><h2 class="mono">${zwei({ de: "Kennzahlen", en: "Measures" })}</h2><dl class="kennzahlen" id="kennzahlen"></dl></div>`;
    steuer.innerHTML = h;
    if (!P.length) $("#b-param").remove();
    const zeigeWert = d => { const o = $("#o-" + d.id); if (o) o.textContent = d.format ? d.format(p[d.id]) : fmt(p[d.id], d.schritt); };
    P.forEach(zeigeWert);

    // Auswahllisten zweisprachig halten
    const optionenSprache = () => P.filter(d => d.art === "auswahl").forEach(d => {
      const s = $("#p-" + d.id), l = document.documentElement.lang === "en" ? "en" : "de";
      [...s.options].forEach((o, i) => { const n = d.optionen[i].name; o.textContent = typeof n === "object" ? (n[l] || n.de) : n; });
    });

    // ---- Ablauf
    function neu() {
      z = M.erzeuge(Object.assign({}, p), Zufall.zufall(saat));
      groesse(); zeichne(); adresse();
    }
    function schritt(n = 1) {
      for (let i = 0; i < n; i++) {
        M.schritt(z, p);
        if (cfg.ende && cfg.ende(z, p)) { laeuft = false; knoepfe(); break; }
      }
    }
    function knoepfe() { $("#k-start").setAttribute("aria-pressed", laeuft); $("#k-pause").setAttribute("aria-pressed", false); }
    function schleife() {
      if (laeuft) { schritt(tempo); zeichne(); }
      requestAnimationFrame(schleife);
    }
    function groesse() {
      const g = cfg.groesse(z, p), dpr = Math.min(window.devicePixelRatio || 1, 2);
      const stage = canvas.parentElement, sb = stage.clientWidth - parseFloat(getComputedStyle(stage).paddingLeft) * 2;
      let w = Math.max(200, sb), hmax = Math.max(260, window.innerHeight - 170);
      if (window.innerWidth > 900 && w * g.h / g.b > hmax) w = hmax * g.b / g.h;
      w = Math.floor(Math.min(w, sb));
      canvas.style.width = w + "px"; canvas.style.height = Math.round(w * g.h / g.b) + "px";
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(w * g.h / g.b * dpr);
      massstab = canvas.width / g.b; canvas._b = g.b; canvas._cssK = w / g.b;
    }
    function zeichne() {
      const F = farben(); F.px = 1 / canvas._cssK;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(massstab, 0, 0, massstab, 0, 0);
      cfg.zeichne(ctx, z, p, F);
      $("#status").innerHTML = `${zwei({ de: "Schritt", en: "Step" })} ${z.t != null ? z.t : ""} · ${zwei({ de: "Saat", en: "Seed" })} ${saat}`;
      if (cfg.kennzahlen) $("#kennzahlen").innerHTML = cfg.kennzahlen(z, p).map(([n, w]) => `<dt>${zwei(n)}</dt><dd>${w && typeof w === "object" ? zwei(w) : esc(w)}</dd>`).join("");
      if (cfg.legende) $("#legende").innerHTML = cfg.legende(F, p, z).map(([f, n]) => `<span><i style="background:${esc(f)}"></i>${zwei(n)}</span>`).join("");
    }
    const bitteZeichnen = () => { if (!bildPlan) { bildPlan = true; requestAnimationFrame(() => { bildPlan = false; zeichne(); }); } };

    $("#k-start").addEventListener("click", () => { laeuft = true; knoepfe(); });
    $("#k-pause").addEventListener("click", () => { laeuft = false; knoepfe(); $("#k-pause").setAttribute("aria-pressed", true); });
    $("#k-schritt").addEventListener("click", () => { laeuft = false; knoepfe(); schritt(1); zeichne(); });
    $("#k-neu").addEventListener("click", () => { laeuft = false; knoepfe(); neu(); });
    $("#p-saat").addEventListener("change", e => { saat = Math.max(1, parseInt(e.target.value, 10) || 1); e.target.value = saat; laeuft = false; knoepfe(); neu(); });
    document.querySelectorAll("[data-aktion]").forEach(b => b.addEventListener("click", () => { cfg.aktionen[+b.dataset.aktion].tue(z, p); zeichne(); }));
    $("#p-tempo").addEventListener("input", e => { tempo = +e.target.value; $("#o-tempo").textContent = tempo; });
    /** Wert eines Parameters setzen und das Bedienelement nachführen (ohne Neustart) */
    function setzeWert(id, wert) {
      const d = P.find(q => q.id === id); p[id] = wert; if (!d) return;
      const el = $("#p-" + id); if (el) { if (d.art === "schalter") el.checked = !!wert; else el.value = wert; }
      zeigeWert(d);
    }
    /** Folgen einer Änderung: abhängige Voreinstellungen (folgen), neue Größe (groesseNeu), Neustart oder aendere */
    function geaendert(d) {
      let neustart = !!d.neustart, gr = !!d.groesseNeu;
      const f = d.folgen && d.folgen[p[d.id]];
      if (f) Object.keys(f).forEach(k => { setzeWert(k, f[k]); const q = P.find(x => x.id === k); if (q && q.neustart) neustart = true; if (q && q.groesseNeu) gr = true; });
      adresse();
      if (neustart) { neu(); return; }
      if (M.aendere) { M.aendere(z, p, d.id); if (f) Object.keys(f).forEach(k => M.aendere(z, p, k)); }
      if (gr) groesse();
      bitteZeichnen();
    }
    P.forEach(d => {
      const el = $("#p-" + d.id);
      el.addEventListener(d.art === "schalter" || d.art === "auswahl" ? "change" : "input", () => {
        p[d.id] = d.art === "schalter" ? el.checked : d.art === "auswahl" ? el.value : Number(el.value);
        zeigeWert(d); geaendert(d);
      });
    });

    // ---- Maus und Finger: Koordinaten im Modellmaßstab
    if (cfg.klick) {
      let unten = false;
      const pos = e => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) / canvas._cssK, (e.clientY - r.top) / canvas._cssK]; };
      canvas.addEventListener("contextmenu", e => e.preventDefault());
      canvas.addEventListener("pointerdown", e => { unten = e.button === 2 || e.shiftKey ? "rechts" : "links"; canvas.setPointerCapture(e.pointerId); const [x, y] = pos(e); cfg.klick(z, p, x, y, unten, "unten"); bitteZeichnen(); });
      canvas.addEventListener("pointermove", e => { if (!unten) return; const [x, y] = pos(e); cfg.klick(z, p, x, y, unten, "ziehen"); bitteZeichnen(); });
      const los = () => { unten = false; };
      canvas.addEventListener("pointerup", los); canvas.addEventListener("pointercancel", los);
    }

    // ---- Sprache, Darstellung, Größe
    document.querySelectorAll(".sprache").forEach(b => b.addEventListener("click", () => { sprache(b.dataset.lang); optionenSprache(); zeichne(); }));
    const tb = $("#theme");
    if (tb) tb.addEventListener("click", () => { const th = istDunkel() ? "light" : "dark"; document.documentElement.dataset.theme = th; merke("entwurfsforschung-theme", th); malThema(); zeichne(); });
    sprache(lies("entwurfsforschung-sprache", "de")); optionenSprache();
    let rz = 0; window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { groesse(); zeichne(); }, 80); });
    neu();
    if (cfg.autostart) { laeuft = true; knoepfe(); }
    requestAnimationFrame(schleife);

    // Schnittstelle für Prüfungen (pruefe_apps.py) und für die Konsole
    window.SIM = {
      get zustand() { return z; }, get param() { return p; }, get saat() { return saat; },
      schritt(n = 1) { schritt(n); zeichne(); return z.t; },
      zuruecksetzen(s) { if (s) { saat = s; $("#p-saat").value = s; } laeuft = false; knoepfe(); neu(); },
      /** fertigen Zustand übernehmen (z. B. eine gefundene Lösung), ohne neu zu rechnen; s = zugehörige Saat */
      lade(zNeu, s) { if (s) { saat = s; $("#p-saat").value = s; } laeuft = false; knoepfe(); z = zNeu; groesse(); zeichne(); adresse(); },
      setze(id, wert) { const d = P.find(q => q.id === id); setzeWert(id, wert); if (d) geaendert(d); else { if (M.aendere) M.aendere(z, p, id); adresse(); } zeichne(); },
      groesse() { groesse(); zeichne(); },
      start() { laeuft = true; knoepfe(); }, pause() { laeuft = false; knoepfe(); }, get laeuft() { return laeuft; }, zeichne
    };
  }
  function fmt(v, schritt) {
    if (typeof v !== "number") return String(v);
    const n = schritt && schritt < 1 ? Math.min(4, String(schritt).split(".")[1].length) : 0;
    return v.toLocaleString(document.documentElement.lang === "en" ? "en" : "de", { minimumFractionDigits: n, maximumFractionDigits: n });
  }

  window.Sim = { starte, raster, rgb, mische, css, farben, zwei, fmt };
})();
