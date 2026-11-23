/* Isochronen im ÖPNV · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD, ST = Modell.STUFEN;
  const de = () => document.documentElement.lang !== "en";
  const zahl = (v, n = 0) => v.toLocaleString(de() ? "de" : "en", { minimumFractionDigits: n, maximumFractionDigits: n });
  const LUECKE = 80;                       // Abstand der Tafeln A | B (m)
  const BAND = k => Karte.farbeRGB(1 - (k + 0.5) / ST, "spektral");
  const SZ_NAME = { neu: { de: "mit neuer Linie N", en: "with new line N" }, takt: { de: "doppelt so oft (Takt halbiert)", en: "twice as often (headway halved)" },
                    tempo: { de: "1,5 × schneller", en: "1.5 × faster" }, ohne1: { de: "ohne Linie 1", en: "without line 1" } };
  const ART = { bahn: { de: "Stadtbahn", en: "rapid tram" }, tram: { de: "Straßenbahn", en: "tram" }, bus: { de: "Bus", en: "bus" } };
  let zug = null, merk = null;

  /* ---- Bearbeitetes Netz über „Zurück“ hinweg behalten (gleiche Saat = gleiche Stadt) */
  const schluessel = z => z.N.knoten.length + ":" + z.N.knoten[0].map(Math.round) + ":" + z.N.knoten[z.N.knoten.length - 1].map(Math.round);
  const merke = z => { merk = { s: schluessel(z), linien: z.linien.map(l => ({ id: l.id, halte: l.halte.slice() })), starts: z.starts.map(q => q.slice()) }; };
  const modell = Object.assign({}, Modell, {
    erzeuge(p, zufall) {
      const z = Modell.erzeuge(p, zufall);
      if (merk && merk.s === schluessel(z)) {
        for (const m of merk.linien) { const l = z.linien.find(x => x.id === m.id); l.halte = m.halte.slice(); Modell.verlege(z.N, z.adj, l); }
        z.starts = merk.starts.map(q => q.slice()); Modell.baue(z, p);
      }
      return z;
    }
  });

  const groesse = (z, p) => p.ansicht === "ab" ? { b: 2 * z.b + LUECKE, h: z.h } : { b: z.b, h: z.h };
  /** Greifradius: 14 Bildschirmpixel in Metern */
  function radius(z, p) { const c = document.getElementById("leinwand"); return 14 * groesse(z, p).b / Math.max(100, c.clientWidth); }

  /* ---- Zeichnen einer Tafel (welches: "a", "b" oder "diff") */
  function tafel(ctx, z, p, F, welches) {
    const px = F.px, R = z.R, A = Modell.ergebnis(z, "a"), B = Modell.ergebnis(z, "b"), hm = Modell.hmax(p);
    const X = welches === "a" ? A : B, deckel = hm + p.stufe;
    const dunkel = F.dunkel;
    ctx.fillStyle = F.flaeche; ctx.fillRect(0, 0, z.b, z.h);
    // Farbe einer Zeit bzw. einer Differenz → [r, g, b, a] oder null
    const farbeZeit = t => { const k = Modell.stufeVon(t, p.stufe); return k < 0 || k >= ST ? null : BAND(k); };
    const farbeDiff = (ta, tb) => {
      if (ta === Infinity && tb === Infinity) return null;
      if (ta === Infinity) return Karte.farbeRGB(0, "kaltwarm");
      if (tb === Infinity) return Karte.farbeRGB(1, "kaltwarm");
      const d = Math.min(ta, deckel) - Math.min(tb, deckel);
      if (Math.abs(d) < 0.25) return null;
      return Karte.farbeRGB(0.5 - 0.5 * Math.max(-1, Math.min(1, d / p.stufe)) * 0.92 - Math.sign(d) * 0.04, "kaltwarm");
    };
    const zelleFarbe = o => welches === "diff" ? farbeDiff(A.T[o], B.T[o]) : farbeZeit(X.T[o]);
    if (p.darstellung === "flaechen") {
      const alpha = dunkel ? 190 : 175;
      Sim.raster(ctx, R.nx, R.ny, d => {
        for (let o = 0; o < R.nx * R.ny; o++) {
          const c = zelleFarbe(o), i = 4 * o;
          if (c) { d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = alpha; } else d[i + 3] = 0;
        }
      }, 0, 0, R.nx * R.zelle, R.ny * R.zelle);
    }
    // Gebäude: neutral über den Flächen oder selbst gefärbt
    const neutral = dunkel ? "#26262c" : "#dcdce2";
    if (p.darstellung === "gebaeude") {
      const graues = dunkel ? "#2a2a30" : "#d8d8de";
      z.szene.gebaeude.forEach((g, gi) => { const c = zelleFarbe(z.geb[gi].zelle); Karte.poly(ctx, g, c ? Sim.css(c) : graues, null); });
    } else {
      // je Gebäude ein eigener Pfad: ein einziger Pfad mit Tausenden Teilpfaden füllt der Browser viel langsamer
      const c = p.darstellung === "flaechen" ? (dunkel ? "rgba(0,0,0,0.42)" : "rgba(0,0,0,0.14)") : neutral;
      for (const g of z.szene.gebaeude) Karte.poly(ctx, g, c, null);
    }
    // Straßen
    const N = z.N;
    ctx.lineCap = "round";
    if (p.darstellung === "strassen") {
      const sk = new Map(); for (const a of z.anker) { if (!sk.has(a.kante)) sk.set(a.kante, []); sk.get(a.kante).push(a); }
      Karte.segmente(ctx, N.kanten.map(e => [N.knoten[e.a], N.knoten[e.b]]), dunkel ? "#4a4a52" : "#b4b4bc", px * 2);
      const tA = A.tK, tB = B.tK;
      N.kanten.forEach((e, k) => {
        const a = N.knoten[e.a], b = N.knoten[e.b], n = Math.max(1, Math.ceil(e.l / 12));
        for (let q = 0; q < n; q++) {
          const s = (q + 0.5) / n * e.l;
          const ta = Modell.zeitAufKante(N, k, s, tA, sk, A.G.v), tb = Modell.zeitAufKante(N, k, s, tB, sk, B.G.v);
          const c = welches === "diff" ? farbeDiff(ta <= z.horizont ? ta : Infinity, tb <= z.horizont ? tb : Infinity) : farbeZeit((welches === "a" ? ta : tb) <= z.horizont ? (welches === "a" ? ta : tb) : Infinity);
          if (!c) continue;
          ctx.beginPath(); ctx.moveTo(a[0] + (b[0] - a[0]) * q / n, a[1] + (b[1] - a[1]) * q / n); ctx.lineTo(a[0] + (b[0] - a[0]) * (q + 1) / n, a[1] + (b[1] - a[1]) * (q + 1) / n);
          ctx.strokeStyle = Sim.css(c); ctx.lineWidth = px * 4.5; ctx.stroke();
        }
      });
    } else Karte.segmente(ctx, N.kanten.map(e => [N.knoten[e.a], N.knoten[e.b]]), dunkel ? "#55555e" : "#a4a4ae", px);
    // Isochronen (Konturen) bzw. Vergleich der äußeren Isochrone
    if (welches !== "diff" && p.darstellung !== "strassen") {
      for (let k = 1; k <= ST; k++) if (k * p.stufe <= z.horizont + 1e-9) Karte.segmente(ctx, Modell.kontur(X.T, R, k * p.stufe, deckel), F.tinte, px * (k === ST ? 1.6 : 1.1));
    } else if (welches === "diff") {
      const w = Math.min(z.horizont, 3 * p.stufe);
      if (w > 0) {
        ctx.setLineDash([5 * px, 4 * px]); Karte.segmente(ctx, Modell.kontur(A.T, R, w, deckel), F.tinte, px * 1.2); ctx.setLineDash([]);
        Karte.segmente(ctx, Modell.kontur(B.T, R, w, deckel), F.tinte, px * 1.6);
      }
    }
    // Linien: die des Szenarios kräftig, die übrigen (geplant bzw. entfallen) gestrichelt und blass
    const aktiv = new Set(Modell.wirksameLinien(z.linien, p, welches === "a" ? "a" : "b").map(l => l.id));
    const bearbeitet = p.maus === "linie" ? p.bearbeite : null;
    const reihe = z.linien.slice().sort((l1, l2) => (aktiv.has(l1.id) - aktiv.has(l2.id)) || ((l1.id === bearbeitet) - (l2.id === bearbeitet)));
    for (const l of reihe) {
      if (!l.halte.length) continue;
      const an = aktiv.has(l.id), farbe = l.id === "N" ? F.akzent : F.tinte;
      const P = []; l.abschnitte.forEach((r, i) => r.knoten.forEach((k, j) => { if (i === 0 || j > 0) P.push(N.knoten[k]); }));
      if (P.length === 0) P.push(N.knoten[l.halte[0]]);
      ctx.lineJoin = "round";
      ctx.globalAlpha = an ? 1 : 0.6;
      if (P.length > 1) {
        Karte.linie(ctx, P, F.flaeche, px * (l.art === "bus" ? 6 : 7.5));
        Karte.linie(ctx, P, farbe, px * (l.art === "bus" ? 2.4 : l.art === "bahn" ? 4 : 3.2), an ? (l.art === "bus" ? [7 * px, 4 * px] : null) : [3 * px, 4 * px]);
      }
      const rH = px * (l.id === bearbeitet ? 5.5 : 3.8);
      for (const h of l.halte) Karte.punkt(ctx, N.knoten[h], rH, F.flaeche, l.id === bearbeitet ? F.akzent : farbe, px * (l.id === bearbeitet ? 2.4 : 1.8));
      // Liniennummer am ersten Halt
      const q0 = N.knoten[l.halte[0]], w = 9 * px, m = 3 * px;
      const bx = Math.max(w + m, Math.min(z.b - w - m, q0[0])), by0 = q0[1] - 15 * px, by = by0 - w < 26 * px ? q0[1] + 15 * px : by0;
      ctx.fillStyle = farbe; ctx.fillRect(bx - w, by - w, 2 * w, 2 * w);
      Karte.text(ctx, l.id, [bx, by + 0.5 * px], F.flaeche, px, 11, "center");
      ctx.globalAlpha = 1;
    }
    // Startpunkte mit Weg zur Straße
    for (const a of z.anker) {
      Karte.linie(ctx, [a.q, a.fuss], F.tinte, px, [3 * px, 3 * px]);
      Karte.punkt(ctx, a.q, 7 * px, F.tinte, F.flaeche, px * 2);
    }
    // Beschriftung der Tafel
    const titel = welches === "a" ? (de() ? "A · Bestand" : "A · current") : welches === "b" ? "B · " + SZ_NAME[p.szenario][de() ? "de" : "en"]
      : (de() ? "B − A · Gewinn an Zeit" : "B − A · time gained");
    ctx.globalAlpha = 0.9; ctx.fillStyle = F.flaeche; ctx.fillRect(0, 0, Math.min(z.b, (titel.length * 7.2 + 20) * px), 24 * px); ctx.globalAlpha = 1;
    Karte.text(ctx, titel, [10 * px, 12 * px], F.tinte, px, 12);
    ctx.strokeStyle = F.linie; ctx.lineWidth = px; ctx.strokeRect(0, 0, z.b, z.h);
  }

  Sim.starte({
    modell,
    saat: 1,
    tempo: { min: 1, max: 10, wert: 1 },
    parameter: [
      { id: "szenario", gruppe: { de: "Szenarien", en: "Scenarios" }, art: "auswahl", name: { de: "Szenario B", en: "Scenario B" }, wert: S.szenario,
        optionen: Modell.SZENARIEN.map(w => ({ wert: w, name: SZ_NAME[w] })) },
      { id: "ansicht", art: "auswahl", name: { de: "Ansicht", en: "View" }, wert: S.ansicht, groesseNeu: true,
        optionen: [{ wert: "a", name: { de: "A – Bestand", en: "A – current" } }, { wert: "b", name: { de: "B – Szenario", en: "B – scenario" } },
                   { wert: "ab", name: { de: "A und B nebeneinander", en: "A and B side by side" } }, { wert: "diff", name: { de: "Differenz B − A", en: "difference B − A" } }] },
      { id: "darstellung", art: "auswahl", name: { de: "Reisezeit auf", en: "Travel time on" }, wert: S.darstellung,
        optionen: [{ wert: "flaechen", name: { de: "Flächen mit Isochronen", en: "areas with isochrones" } }, { wert: "strassen", name: { de: "Straßen", en: "streets" } },
                   { wert: "gebaeude", name: { de: "Gebäude", en: "buildings" } }] },
      { id: "stufe", art: "regler", name: { de: "Isochronen alle … min (vier Stufen)", en: "Isochrones every … min (four steps)" }, min: 1, max: 15, schritt: 1, wert: S.stufe },
      { id: "dt", name: { de: "Zeitintervall je Schritt (min)", en: "Time interval per step (min)" }, min: 0.25, max: 5, schritt: 0.25, wert: S.dt },
      { id: "gehen", gruppe: { de: "Gehen, Warten, Umsteigen", en: "Walking, waiting, transfers" }, name: { de: "Gehgeschwindigkeit km/h (walking speed)", en: "Walking speed km/h" }, min: 3, max: 6, schritt: 0.1, wert: S.gehen },
      { id: "warte", name: { de: "Wartezeit = Anteil × Takt (0,5 = Takt/2)", en: "Waiting time = share × headway (0.5 = headway/2)" }, min: 0, max: 1, schritt: 0.05, wert: S.warte },
      { id: "umstieg", name: { de: "Zuschlag je Umstieg (min)", en: "Penalty per transfer (min)" }, min: 0, max: 10, schritt: 0.5, wert: S.umstieg },
      { id: "halt", name: { de: "Haltezeit je Haltestelle (min)", en: "Dwell time per stop (min)" }, min: 0, max: 2, schritt: 0.1, wert: S.halt },
      { id: "takt1", gruppe: { de: "Linien: Takt (frequency) und Tempo (speed)", en: "Lines: headway (frequency) and speed" }, name: { de: "Takt Linie 1 – Stadtbahn (min)", en: "Headway line 1 – rapid tram (min)" }, min: 2, max: 30, schritt: 1, wert: S.takt1 },
      { id: "takt2", name: { de: "Takt Linie 2 – Straßenbahn (min)", en: "Headway line 2 – tram (min)" }, min: 2, max: 30, schritt: 1, wert: S.takt2 },
      { id: "takt3", name: { de: "Takt Linie 3 – Bus (min)", en: "Headway line 3 – bus (min)" }, min: 2, max: 30, schritt: 1, wert: S.takt3 },
      { id: "taktN", name: { de: "Takt Linie N – neu (min)", en: "Headway line N – new (min)" }, min: 2, max: 30, schritt: 1, wert: S.taktN },
      { id: "tempoBahn", name: { de: "Tempo Stadtbahn (km/h)", en: "Speed rapid tram (km/h)" }, min: 10, max: 60, schritt: 1, wert: S.tempoBahn },
      { id: "tempoTram", name: { de: "Tempo Straßenbahn (km/h)", en: "Speed tram (km/h)" }, min: 8, max: 40, schritt: 1, wert: S.tempoTram },
      { id: "tempoBus", name: { de: "Tempo Bus (km/h)", en: "Speed bus (km/h)" }, min: 8, max: 40, schritt: 1, wert: S.tempoBus },
      { id: "maus", gruppe: { de: "Maus", en: "Mouse" }, art: "auswahl", name: { de: "Klick setzt", en: "Click sets" }, wert: S.maus,
        optionen: [{ wert: "start", name: { de: "Startpunkt (Umschalt: weiterer/entfernen)", en: "start point (shift: add/remove)" } },
                   { wert: "linie", name: { de: "Haltestelle (Umschalt: entfernen)", en: "stop (shift: remove)" } }] },
      { id: "bearbeite", art: "auswahl", name: { de: "Linie bearbeiten", en: "Edit line" }, wert: S.bearbeite,
        optionen: [{ wert: "1", name: { de: "1 – Stadtbahn", en: "1 – rapid tram" } }, { wert: "2", name: { de: "2 – Straßenbahn", en: "2 – tram" } },
                   { wert: "3", name: { de: "3 – Bus", en: "3 – bus" } }, { wert: "N", name: { de: "N – neue Linie (Szenario B)", en: "N – new line (scenario B)" } }] }
    ],
    groesse,
    klick(z, p, x, y, taste, phase) {
      const r = radius(z, p);
      if (p.ansicht === "ab" && x > z.b + LUECKE / 2) x -= z.b + LUECKE;
      const q = [Math.max(0, Math.min(z.b, x)), Math.max(0, Math.min(z.h, y))];
      if (phase === "unten") {
        zug = null;
        if (p.maus === "start") {
          if (taste === "rechts") Modell.setzeStart(z, p, q, true, r);
          else {
            const i = z.starts.findIndex(s => Geo.abstand(s, q) <= r);
            if (i >= 0) zug = { art: "start", i }; else { Modell.setzeStart(z, p, q); zug = { art: "start", i: 0 }; }
          }
        } else {
          const id = p.bearbeite, i = Modell.haltBei(z, id, q, r);
          if (taste === "rechts") { if (i >= 0) Modell.entferneHalt(z, p, id, i); }
          else zug = { art: "halt", id, i: i >= 0 ? i : Modell.setzeHalt(z, p, id, q) };
        }
        merke(z);
        return;
      }
      if (!zug) return;
      if (zug.art === "start") Modell.verschiebeStart(z, p, zug.i, q);
      else zug.i = Modell.verschiebeHalt(z, p, zug.id, zug.i, q);
      merke(z);
    },
    aktionen: [
      { name: { de: "Leeren", en: "Clear" }, tue: (z, p) => { Modell.leereLinie(z, p, p.bearbeite); merke(z); } },
      { name: { de: "Standard", en: "Default" }, tue: (z, p) => {
        merk = null; z.linien = Modell.standardLinien(z.szene, z.N, z.adj); z.starts = [Modell.standardStart(z.szene)]; Modell.sofort(z, p); } }
    ],
    ende: (z, p) => Modell.fertig(z, p),
    zeichne(ctx, z, p, F) {
      const tafeln = p.ansicht === "ab" ? ["a", "b"] : [p.ansicht];
      tafeln.forEach((w, i) => {
        ctx.save(); ctx.translate(i * (z.b + LUECKE), 0);
        ctx.beginPath(); ctx.rect(0, 0, z.b, z.h); ctx.clip();
        tafel(ctx, z, p, F, w);
        ctx.restore();
      });
      if (z.t === 0) {
        const px = F.px, g = groesse(z, p);
        const lang = de() ? "Start: die Front wächst Minute um Minute · Klick: Startpunkt" : "Start: the front grows minute by minute · click: start point";
        const kurz = de() ? "Start: die Front wächst" : "Start: the front grows";
        ctx.fillStyle = F.flaeche; ctx.globalAlpha = 0.85; ctx.fillRect(0, g.h - 24 * px, g.b, 24 * px); ctx.globalAlpha = 1;
        Karte.text(ctx, lang.length * 7.4 < g.b / px - 24 ? lang : kurz, [g.b / 2, g.h - 12 * px], F.tinte2, px, 12, "center");
      }
    },
    legende(F, p) {
      const L = [];
      if (p.ansicht === "diff") L.push([Sim.css(Karte.farbeRGB(0.1, "kaltwarm")), { de: "B schneller", en: "B faster" }], [Sim.css(Karte.farbeRGB(0, "kaltwarm")), { de: "nur in B erreicht", en: "reached in B only" }],
                                       [Sim.css(Karte.farbeRGB(0.9, "kaltwarm")), { de: "B langsamer", en: "B slower" }]);
      else for (let k = 0; k < ST; k++) L.push([Sim.css(BAND(k)), { de: `${k * p.stufe}–${(k + 1) * p.stufe} min`, en: `${k * p.stufe}–${(k + 1) * p.stufe} min` }]);
      L.push([F.tinte, { de: "Linien 1–3", en: "lines 1–3" }], [F.akzent, { de: "neue Linie N", en: "new line N" }]);
      return L;
    },
    kennzahlen(z, p) {
      const w15 = 3 * p.stufe, w20 = Modell.hmax(p);
      const A = Modell.bilanz(z, "a", w15), B = Modell.bilanz(z, "b", w15), A2 = Modell.bilanz(z, "a", w20), B2 = Modell.bilanz(z, "b", w20);
      const pro = (a, b) => a > 0 ? " (" + (b >= a ? "+" : "−") + zahl(Math.abs(b / a - 1) * 100, 0) + " %)" : "";
      const ew = v => zahl(Math.round(v / 100) * 100);
      const l = z.linien.find(x => x.id === p.bearbeite), wl = Modell.wirksameLinien([l], Object.assign({}, p, { szenario: "neu" }), "b")[0];
      const fahrzeit = wl ? wl.laengen.reduce((s, m) => s + m / (wl.tempo * 1000 / 60) + p.halt, 0) : 0;
      return [
        [{ de: "Horizont der Front", en: "Front horizon" }, zahl(z.horizont, z.horizont % 1 ? 2 : 0) + " / " + zahl(w20) + " min"],
        [{ de: "Szenario B", en: "Scenario B" }, SZ_NAME[p.szenario]],
        [{ de: `Fläche ≤ ${w15} min (A → B)`, en: `Area ≤ ${w15} min (A → B)` }, zahl(A.flaeche, 2) + " → " + zahl(B.flaeche, 2) + " km²" + pro(A.flaeche, B.flaeche)],
        [{ de: `Einwohner ≤ ${w15} min (A → B)`, en: `Residents ≤ ${w15} min (A → B)` }, ew(A.ew) + " → " + ew(B.ew) + pro(A.ew, B.ew)],
        [{ de: `Fläche ≤ ${w20} min (A → B)`, en: `Area ≤ ${w20} min (A → B)` }, zahl(A2.flaeche, 2) + " → " + zahl(B2.flaeche, 2) + " km²" + pro(A2.flaeche, B2.flaeche)],
        [{ de: "Haltestellen erreicht (A → B)", en: "Stops reached (A → B)" }, A2.halte + " → " + B2.halte],
        [{ de: "Knoten fest (A | B)", en: "Settled nodes (A | B)" }, A2.fest + " / " + A2.knoten + " | " + B2.fest + " / " + B2.knoten],
        [{ de: "Startpunkte", en: "Start points" }, String(z.starts.length)],
        [{ de: "Linie " + l.id + " (" + ART[l.art].de + ")", en: "Line " + l.id + " (" + ART[l.art].en + ")" },
          l.halte.length >= 2 ? { de: l.halte.length + " Halte · " + zahl(l.laenge / 1000, 2) + " km · " + zahl(fahrzeit, 1) + " min", en: l.halte.length + " stops · " + zahl(l.laenge / 1000, 2) + " km · " + zahl(fahrzeit, 1) + " min" }
            : { de: "weniger als zwei Halte", en: "fewer than two stops" }],
        [{ de: "Einwohner gesamt (Schätzung)", en: "Residents total (estimate)" }, ew(z.ewGesamt)]
      ];
    }
  });
})();
