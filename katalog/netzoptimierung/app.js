/* Straßennetz-Optimierung · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0
   Zeichenfläche wie die Bildschirmanzeige der .gh-Datei (Render … to Screen): gezeigte Variante (Show Variant) als Karte,
   2D-Diagramm der Fitnesswerte aller Individuen (Street Length × Centrality), Leiste der besten Varianten (Visualise best Phenotypes). */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const de = () => document.documentElement.lang !== "en";
  const zahl = (v, n = 0) => (isFinite(v) ? v : 0).toLocaleString(de() ? "de" : "en", { minimumFractionDigits: n, maximumFractionDigits: n });
  const MINI = 10;                                   // Show Variant 0 … 9
  const R_GRIFF = 14;                                // Fangradius der Griffe in m
  let zug = null;                                    // gezogener Griff

  /** Aufteilung der Zeichenfläche (Modelleinheiten; die Karte ist 680 × 540 m): breit nebeneinander, schmal untereinander */
  function lage() {
    if (window.innerWidth < 700) return { b: 680, h: 1200,
      karte: { x: 0, y: 0 }, dia: { x: 78, y: 590, w: 580, h: 300 }, leiste: { x: 0, y: 940, w: 680, h: 260, spalten: 5 } };
    return { b: 1110, h: 700,
      karte: { x: 0, y: 0 }, dia: { x: 768, y: 34, w: 322, h: 440 }, leiste: { x: 0, y: 556, w: 1110, h: 144, spalten: 10 } };
  }
  /** Farbe einer Generation: türkis (früh) – violett – magenta (spät), lesbar auf hell und dunkel (Farben wie im Katalogbild) */
  const GEN = [[30, 178, 214], [112, 98, 232], [214, 46, 190]];
  function genFarbe(g, G, a = 1) {
    const t = G > 0 ? Math.max(0, Math.min(1, g / G)) : 0, x = t * 2, i = Math.min(1, Math.floor(x)), u = x - i;
    const c = [0, 1, 2].map(k => Math.round(GEN[i][k] + (GEN[i + 1][k] - GEN[i][k]) * u));
    return a < 1 ? `rgba(${c[0]},${c[1]},${c[2]},${a})` : `rgb(${c[0]},${c[1]},${c[2]})`;
  }
  /** Wertebereich des Diagramms: Bounds aller Fitnesswerte mit etwas Rand */
  function bereich(z) {
    let a1 = Infinity, b1 = -Infinity, a2 = Infinity, b2 = -Infinity;
    for (const x of z.alle) { a1 = Math.min(a1, x.f1); b1 = Math.max(b1, x.f1); a2 = Math.min(a2, x.f2); b2 = Math.max(b2, x.f2); }
    const r1 = Math.max(b1 - a1, 1e-6) * 0.06, r2 = Math.max(b2 - a2, 1e-6) * 0.06;
    return { a1: a1 - r1, b1: b1 + r1, a2: a2 - r2, b2: b2 + r2 };
  }
  const imDia = (D, B, x) => [D.x + (x.f1 - B.a1) / (B.b1 - B.a1) * D.w, D.y + D.h - (x.f2 - B.a2) / (B.b2 - B.a2) * D.h];
  /** Zellen der Leiste: {x, y, w, h} je Platz */
  function zellen(Lg, n) {
    const L = Lg.leiste, sp = L.spalten, zeilen = Math.ceil(MINI / sp), w = L.w / sp, h = L.h / zeilen, Z = [];
    for (let i = 0; i < n; i++) Z.push({ x: L.x + (i % sp) * w, y: L.y + Math.floor(i / sp) * h, w, h });
    return Z;
  }

  /** Segmente eines Individuums zeichnen; farbe(k) → Farbe je Segment oder eine Farbe für alle */
  function netz(ctx, ind, farbe, lw) {
    const s = ind.seg;
    if (typeof farbe === "string") {
      ctx.beginPath(); for (let k = 0; k < ind.n; k++) { ctx.moveTo(s[4 * k], s[4 * k + 1]); ctx.lineTo(s[4 * k + 2], s[4 * k + 3]); }
      ctx.strokeStyle = farbe; ctx.lineWidth = lw; ctx.stroke(); return;
    }
    for (const k of farbe.ord) {
      ctx.beginPath(); ctx.moveTo(s[4 * k], s[4 * k + 1]); ctx.lineTo(s[4 * k + 2], s[4 * k + 3]);
      ctx.strokeStyle = farbe.f(k); ctx.lineWidth = lw; ctx.stroke();
    }
  }
  /** Farbskala der Closeness: „spektral“ wie der Grasshopper-Gradient; auf hellem Grund mit kräftigerer Mitte (statt Blassgelb) */
  const SKALA_HELL = [[43, 131, 186], [92, 168, 98], [222, 172, 20], [240, 112, 36], [215, 25, 28]];
  let skala = "spektral";
  /** Closeness der gezeigten Variante: Logarithmus → Bounds → Remap auf 0…1 → Gradient (wie „Visualize network centrality“) */
  function naeheFarben(ind) {
    const L = Array.from(ind.cc, c => (c > 0 ? Math.log(c) : NaN)), ok = L.filter(isFinite);
    const mn = ok.length ? Math.min(...ok) : 0, mx = ok.length ? Math.max(...ok) : 1, sp = mx - mn > 1e-12 ? mx - mn : 1;
    const t = L.map(v => (isFinite(v) ? (v - mn) / sp : 0));
    return { t, ord: [...t.keys()].sort((a, b) => t[a] - t[b]), f: k => Karte.farbe(t[k], skala) };
  }

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 5, wert: 1 },
    parameter: [
      { id: "generationen", gruppe: { de: "Genetischer Algorithmus", en: "Genetic algorithm" }, name: { de: "Generationen (Iterations/Generations)", en: "Generations (iterations)" }, min: 0, max: 100, schritt: 1, wert: S.generationen },
      { id: "nachkommen", name: { de: "Nachkommen (Nr Offsprings)", en: "Offspring (Nr Offsprings)" }, min: 0, max: 100, schritt: 1, wert: S.nachkommen },
      { id: "eltern", name: { de: "Eltern (Nr Parents)", en: "Parents (Nr Parents)" }, min: 1, max: 100, schritt: 1, wert: S.eltern },
      { id: "kreuzung", name: { de: "Kreuzungsrate (Crossover Rate)", en: "Crossover rate" }, min: 0, max: 1, schritt: 0.1, wert: S.kreuzung },
      { id: "mutation", name: { de: "Mutationsrate (Mutation Rate)", en: "Mutation rate" }, min: 0, max: 1, schritt: 0.1, wert: S.mutation },
      { id: "neuAnteil", name: { de: "Neue Zufallsnetze (Random Generation)", en: "Random generation" }, min: 0, max: 1, schritt: 0.1, wert: S.neuAnteil },
      { id: "mischen", art: "schalter", name: { de: "Chromosomen mischen (Shuffle Chromosomes)", en: "Shuffle chromosomes" }, wert: S.mischen },
      { id: "baumtiefe", gruppe: { de: "Straßennetz-Chromosom (Street Network Chromosome)", en: "Street network chromosome" }, name: { de: "Baumtiefe (TreeDepth)", en: "Tree depth (TreeDepth)" }, min: 0, max: 20, schritt: 1, wert: S.baumtiefe, neustart: true },
      { id: "minLaenge", name: { de: "kleinste Länge (MinLength) m", en: "Minimum length (MinLength), m" }, min: 10, max: 100, schritt: 1, wert: S.minLaenge, neustart: true },
      { id: "maxLaenge", name: { de: "Längenspanne (MaxLength) m", en: "Length range (MaxLength), m" }, min: 10, max: 200, schritt: 1, wert: S.maxLaenge, neustart: true },
      { id: "minAbstand", name: { de: "Fangabstand (MinDist) m", en: "Snap distance (MinDist), m" }, min: 1, max: 50, schritt: 1, wert: S.minAbstand, neustart: true },
      { id: "zufallsWinkel", name: { de: "Zufallswinkel (RandomAngle) °", en: "Random angle (RandomAngle), °" }, min: 0, max: 90, schritt: 1, wert: S.zufallsWinkel, neustart: true },
      { id: "maxArme", name: { de: "Arme je Kreuzung (MaxArms)", en: "Arms per crossing (MaxArms)" }, min: 2, max: 8, schritt: 1, wert: S.maxArme, neustart: true },
      { id: "kL", gruppe: { de: "Fitness (2. BuildGraph)", en: "Fitness (2. BuildGraph)" }, name: { de: "Längenkoeffizient (Length Coefficient)", en: "Length coefficient" }, min: 0, max: 1, schritt: 0.001, wert: S.kL, neustart: true },
      { id: "kW", name: { de: "Winkelkoeffizient (Angular Coefficient)", en: "Angular coefficient" }, min: 0, max: 1, schritt: 0.01, wert: S.kW, neustart: true },
      { id: "variante", gruppe: { de: "Anzeige", en: "Display" }, name: { de: "Variante zeigen (Show Variant)", en: "Show variant" }, min: 0, max: MINI - 1, schritt: 1, wert: S.variante }
    ],
    groesse: () => { const L = lage(); return { b: L.b, h: L.h }; },
    klick(z, p, x, y, taste, phase) {
      const Lg = lage(), cv = document.getElementById("leinwand"), px = Lg.b / cv.getBoundingClientRect().width;
      if (phase === "ziehen") { if (zug) Modell.verschiebe(z, p, zug, [x - Lg.karte.x, y - Lg.karte.y]); return; }
      zug = null;
      const D = Lg.dia;
      if (x >= D.x - 20 * px && x <= D.x + D.w + 20 * px && y >= D.y - 20 * px && y <= D.y + D.h + 20 * px && z.alle.length) {
        const B = bereich(z); let best = null, bd = 14 * px;
        for (const ind of z.alle) { const q = imDia(D, B, ind); const d = Math.hypot(q[0] - x, q[1] - y); if (d < bd) { bd = d; best = ind; } }
        if (best) Modell.waehle(z, best.id);
        return;
      }
      const A = Modell.sortiert(z).slice(0, MINI), Z = zellen(Lg, A.length);
      const i = Z.findIndex(c => x >= c.x && x < c.x + c.w && y >= c.y && y < c.y + c.h);
      if (i >= 0) { Modell.waehle(z, A[i].id); return; }
      const q = [x - Lg.karte.x, y - Lg.karte.y];
      if (q[0] >= 0 && q[0] <= z.S.b && q[1] >= 0 && q[1] <= z.S.h) zug = Modell.griffBei(z, q, Math.max(R_GRIFF, 9 * px));
    },
    ende: (z, p) => Modell.fertig(z, p),
    zeichne(ctx, z, p, F) {
      const Lg = lage(), px = F.px, Sz = z.S, ind = Modell.finde(z, z.wahl);
      const G = Math.max(1, z.gen);
      skala = F.dunkel ? "spektral" : SKALA_HELL;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      // ---- Karte: Umgebung, Baufeld, gezeigte Variante (Closeness logarithmisch, Farbskala wie der Grasshopper-Gradient)
      ctx.save(); ctx.translate(Lg.karte.x, Lg.karte.y);
      Karte.poly(ctx, Sz.rand, F.dunkel ? "#17171c" : "#f0f0f4", null);
      Karte.segmente(ctx, Sz.umgebung, F.dunkel ? "#3c3c44" : "#c4c4cc", px * 1.2);
      if (ind) netz(ctx, ind, naeheFarben(ind), px * 2.4);
      // Griffe: Ecken des Rands (Quadrate), Stützpunkte der Startstraßen (Kreise)
      for (const q of Sz.rand) { const r = 3.5 * px; ctx.beginPath(); ctx.rect(q[0] - r, q[1] - r, 2 * r, 2 * r); ctx.fillStyle = F.papier; ctx.fill(); ctx.strokeStyle = F.tinte; ctx.lineWidth = px * 1.2; ctx.stroke(); }
      for (const pl of Sz.start) for (const q of pl) Karte.punkt(ctx, q, 3 * px, F.papier, F.tinte2, px * 1.1);
      if (ind) {
        const t = (de() ? "Variante #" : "Variant #") + ind.id + " · Gen " + ind.g + " · L = " + zahl(ind.L) + " m";
        Karte.text(ctx, t, [8 * px, 14 * px], F.tinte2, px, 12, "left");
      }
      ctx.restore();

      // ---- 2D-Diagramm: alle Individuen (Generation farbig), Archiv groß, Pareto-Front, gewählte Variante
      const D = Lg.dia, B = bereich(z);
      ctx.strokeStyle = F.tinte2; ctx.lineWidth = px * 1.2;
      ctx.beginPath(); ctx.moveTo(D.x, D.y); ctx.lineTo(D.x, D.y + D.h); ctx.lineTo(D.x + D.w, D.y + D.h); ctx.stroke();
      Karte.text(ctx, de() ? "f₂ Zentralität (Centrality)" : "f₂ centrality", [D.x, D.y - 16 * px], F.tinte, px, 12, "left");
      Karte.text(ctx, de() ? "f₁ = 10 000 / Straßenlänge" : "f₁ = 10,000 / street length", [D.x + D.w / 2, D.y + D.h + 14 * px], F.tinte, px, 12, "center");
      Karte.text(ctx, zahl(B.a1, 2), [D.x, D.y + D.h + 14 * px], F.tinte2, px, 10, "left");
      Karte.text(ctx, zahl(B.b1, 2), [D.x + D.w, D.y + D.h + 14 * px], F.tinte2, px, 10, "right");
      Karte.text(ctx, zahl(B.a2, 3), [D.x - 5 * px, D.y + D.h - 6 * px], F.tinte2, px, 10, "right");
      Karte.text(ctx, zahl(B.b2, 3), [D.x - 5 * px, D.y + 6 * px], F.tinte2, px, 10, "right");
      Karte.text(ctx, de() ? "↙ besser (beide Ziele klein)" : "↙ better (both objectives small)", [D.x + D.w, D.y + 6 * px], F.gedaempft, px, 10, "right");
      for (const x of z.alle) Karte.punkt(ctx, imDia(D, B, x), 2.2 * px, genFarbe(x.g, G, 0.6), null);
      const Fr = z.front.map(x => imDia(D, B, x));
      if (Fr.length > 1) { ctx.beginPath(); Fr.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.strokeStyle = F.akzent; ctx.lineWidth = px * 1.6; ctx.stroke(); }
      for (const x of z.archiv) Karte.punkt(ctx, imDia(D, B, x), 4.2 * px, genFarbe(x.g, G), F.papier, px);
      for (const q of Fr) Karte.punkt(ctx, q, 5.2 * px, null, F.akzent, px * 1.6);
      if (ind) Karte.punkt(ctx, imDia(D, B, ind), 8 * px, null, F.tinte, px * 1.6);

      // ---- Leiste der besten Varianten (Archiv sortiert wie Show Variant: Summe f1 + f2 aufsteigend)
      const A = Modell.sortiert(z).slice(0, MINI), Z = zellen(Lg, A.length);
      A.forEach((x, i) => {
        const c = Z[i], s = Math.min((c.w - 10 * px) / Sz.b, (c.h - 24 * px) / Sz.h), ox = c.x + (c.w - Sz.b * s) / 2, oy = c.y + 18 * px;
        const gewaehlt = x.id === z.wahl;
        ctx.strokeStyle = gewaehlt ? F.akzent : F.linie; ctx.lineWidth = px * (gewaehlt ? 2 : 1);
        ctx.strokeRect(c.x + 2 * px, c.y + 2 * px, c.w - 4 * px, c.h - 4 * px);
        Karte.text(ctx, String(i), [c.x + 8 * px, c.y + 11 * px], gewaehlt ? F.akzentText : F.tinte2, px, 10, "left");
        Karte.text(ctx, "G" + x.g, [c.x + c.w - 8 * px, c.y + 11 * px], F.gedaempft, px, 10, "right");
        ctx.save(); ctx.translate(ox, oy); ctx.scale(s, s);
        netz(ctx, x, genFarbe(x.g, G), px * 1.1 / s);
        ctx.restore();
      });
      if (z.t === 0) {
        const k = de() ? "Start: eine Generation je Schritt" : "Start: one generation per step";
        Karte.text(ctx, k, [Lg.karte.x + Sz.b / 2, Lg.karte.y + Sz.h - 12 * px], F.tinte2, px, 12, "center");
      }
    },
    legende: (F, p, z) => Karte.skalenLegende(F.dunkel ? "spektral" : SKALA_HELL, { de: "Closeness (log) gering", en: "low closeness (log)" }, { de: "hoch", en: "high" })
      .concat([[genFarbe(0, 1), { de: "Generation 0", en: "Generation 0" }], [genFarbe(1, 1), { de: "letzte Generation", en: "latest generation" }],
               [F.akzent, { de: "Pareto-Front", en: "Pareto front" }]]),
    kennzahlen(z, p) {
      const ind = Modell.finde(z, z.wahl), A = z.archiv;
      const min = f => A.length ? Math.min(...A.map(x => x[f])) : NaN;
      return [
        [{ de: "Generation", en: "Generation" }, zahl(z.gen) + " / " + zahl(p.generationen)],
        [{ de: "Bewertete Netze", en: "Evaluated networks" }, zahl(z.alle.length)],
        [{ de: "Archiv (Parents) · Pareto-Front", en: "Archive (parents) · Pareto front" }, zahl(A.length) + " · " + zahl(z.front.length)],
        [{ de: "Bestes f₁ · f₂ im Archiv", en: "Best f₁ · f₂ in archive" }, zahl(min("f1"), 3) + " · " + zahl(min("f2"), 4)],
        [{ de: "Gezeigte Variante", en: "Shown variant" }, ind ? "#" + ind.id + " · Gen " + ind.g + " · " + ind.herkunft : "–"],
        [{ de: "Straßenlänge · Segmente", en: "Street length · segments" }, ind ? zahl(ind.L) + " m · " + zahl(ind.n) : "–"],
        [{ de: "f₁ · f₂ (max. Closeness)", en: "f₁ · f₂ (max. closeness)" }, ind ? zahl(ind.f1, 3) + " · " + zahl(ind.f2, 4) : "–"]
      ];
    }
  });
})();
