/* Hochwasser: steigender Pegel · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const de = () => document.documentElement.lang !== "en";
  const zahl = (v, n = 0) => isFinite(v) ? v.toLocaleString(de() ? "de" : "en", { minimumFractionDigits: n, maximumFractionDigits: n }) : "–";
  const css = c => `rgb(${c[0]},${c[1]},${c[2]})`;
  /** Rottöne nach Wassertiefe (hell → dunkel), wie im Paper */
  const ROT = [[252, 174, 145], [251, 106, 74], [222, 45, 38], [140, 10, 20]];
  const rotStufe = (s, K) => ROT[Math.min(ROT.length - 1, Math.round((s - 1) / Math.max(1, K - 1) * (ROT.length - 1)))];
  /** mittleres Risiko: grau (niedrig) → rot (hoch), wie Abb. 7 des Papers */
  const risikoFarbe = r => [Math.round(150 + (200 - 150) * r), Math.round(150 - 130 * r), Math.round(156 - 126 * r)];
  const trocken = F => F.dunkel ? "#3a3a41" : "#ececef", trockenStrich = F => F.dunkel ? "#6a6a73" : "#8a8a93";
  const BAUM = "#3f9b4a";
  /** Regenrisiko: Partikel je m², ab 0,2 dunkelste Stufe */
  const REGEN_MAX = 0.2;

  // Gelände (Schummerung + Höhenlinien) einmal je Zustand, Version und Darstellung vorzeichnen
  let vorrat = null;
  function gelaendeBild(z, F) {
    if (vorrat && vorrat.z === z && vorrat.v === z.version && vorrat.d === F.dunkel) return vorrat.c;
    const c = (vorrat && vorrat.c) || document.createElement("canvas"); c.width = c.height = 800;
    const x = c.getContext("2d"); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, 800, 800); x.setTransform(800 / z.b, 0, 0, 800 / z.b, 0, 0);
    Karte.gelaende(x, z.G, Object.assign({}, F, { px: z.b / 800 }), { hoehenlinien: 1, aufloesung: 400 });
    vorrat = { z, v: z.version, d: F.dunkel, c };
    return c;
  }

  function wasser(ctx, z, L, risiko) {
    const G = z.G, n = G.n, N = z.stufen.N;
    Sim.raster(ctx, n, n, d => {
      for (let k = 0; k < n * n; k++) {
        const i = 4 * k, w = z.W[k];
        if (risiko) {
          const r = Modell.mittleresRisiko(Modell.ersterSchrittZelle(z.stufen, w), N);
          if (r <= 0 || G.fluss[k]) { d[i + 3] = G.fluss[k] ? 200 : 0; d[i] = 40; d[i + 1] = 110; d[i + 2] = 190; continue; }
          const f = risikoFarbe(r); d[i] = f[0]; d[i + 1] = f[1]; d[i + 2] = f[2]; d[i + 3] = Math.round(50 + 100 * r); continue;
        }
        if (!(w < L)) { d[i + 3] = 0; continue; }
        const t = Math.min(1, (L - G.h[k]) / 5), f = Karte.farbeRGB(0.3 + 0.6 * t, "wasser");
        d[i] = f[0]; d[i + 1] = f[1]; d[i + 2] = f[2]; d[i + 3] = Math.round(150 + 90 * t);
      }
    }, -G.zelle / 2, -G.zelle / 2, n * G.zelle, n * G.zelle);
  }

  function kurve(ctx, z, F) {
    const px = F.px, x0 = 12, y0 = 352, w = 150, h = 38, N = z.stufen.N, n = z.gebaeude.length || 1;
    ctx.fillStyle = F.dunkel ? "rgba(0,0,0,0.72)" : "rgba(255,255,255,0.85)"; ctx.fillRect(x0 - 4, y0 - 16, w + 8, h + 26);
    ctx.strokeStyle = F.gedaempft; ctx.lineWidth = px; ctx.strokeRect(x0, y0, w, h);
    ctx.beginPath();
    for (let k = 0; k <= N; k++) { const X = x0 + w * k / N, Y = y0 + h - h * z.kurve[k] / n; k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
    ctx.strokeStyle = css(ROT[2]); ctx.lineWidth = px * 1.6; ctx.stroke();
    const X = x0 + w * z.k / N; ctx.strokeStyle = F.tinte; ctx.lineWidth = px; ctx.beginPath(); ctx.moveTo(X, y0); ctx.lineTo(X, y0 + h); ctx.stroke();
    Karte.punkt(ctx, [X, y0 + h - h * z.kurve[z.k] / n], 2.5 * px, F.tinte);
    Karte.text(ctx, de() ? "überflutete Gebäude je Pegel" : "flooded buildings per level", [x0, y0 - 8], F.tinte, px, 10);
    Karte.text(ctx, `${zahl(z.stufen.start, 1)} m`, [x0, y0 + h + 6], F.gedaempft, px, 9);
    Karte.text(ctx, `${zahl(Modell.pegelBei(z.stufen, N), 1)} m`, [x0 + w, y0 + h + 6], F.gedaempft, px, 9, "right");
  }

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 10, wert: 1 },
    parameter: [
      { id: "modus", gruppe: { de: "Simulation", en: "Simulation" }, art: "auswahl", name: { de: "Simulation", en: "Simulation" }, wert: S.modus,
        optionen: [{ wert: "pegel", name: { de: "Fluss- und Gezeitenhochwasser (Pegel)", en: "Tidal & river flooding (water level)" } },
                   { wert: "regen", name: { de: "Regenabfluss (Partikel)", en: "Rain runoff (particles)" } }] },
      { id: "startpegel", gruppe: { de: "Pegel", en: "Water level" }, name: { de: "Startpegel m", en: "Start level (m)" }, min: -1, max: 4, schritt: 0.1, wert: S.startpegel },
      { id: "maxpegel", name: { de: "Höchstpegel m", en: "Peak level (m)" }, min: 1, max: 15, schritt: 0.5, wert: S.maxpegel },
      { id: "schrittweite", name: { de: "Anstieg je Schritt (Frame) cm", en: "Rise per step (frame) cm" }, min: 1, max: 50, schritt: 1, wert: S.schrittweite },
      { id: "tiefenschwelle", name: { de: "Tiefen gleich ab cm", en: "Depths equal from cm" }, min: 8, max: 100, schritt: 1, wert: S.tiefenschwelle },
      { id: "sockel", name: { de: "Sockelhöhe (Platform) m", en: "Platform height (m)" }, min: 0, max: 2, schritt: 0.05, wert: S.sockel },
      { id: "ansicht", art: "auswahl", name: { de: "Ansicht", en: "View" }, wert: S.ansicht,
        optionen: [{ wert: "zustand", name: { de: "aktueller Pegel", en: "Current level" } }, { wert: "risiko", name: { de: "mittleres Risiko aller Pegel", en: "Mean risk of all levels" } }] },
      { id: "partikel", gruppe: { de: "Regen", en: "Rain" }, name: { de: "Zahl der Partikel", en: "Number of particles" }, min: 100, max: 5000, schritt: 100, wert: S.partikel },
      { id: "iterationen", name: { de: "Schritte (Iterationen)", en: "Steps (iterations)" }, min: 50, max: 2000, schritt: 50, wert: S.iterationen },
      { id: "umkreis", name: { de: "Umkreis (Range) m", en: "Range (m)" }, min: 0.5, max: 10, schritt: 0.5, wert: S.umkreis },
      { id: "erosion", name: { de: "Erosion ab m je 10 Schritte", en: "Erosion from m per 10 steps" }, min: 1, max: 20, schritt: 0.5, wert: S.erosion },
      { id: "werkzeug", gruppe: { de: "Maßnahmen", en: "Measures" }, art: "auswahl", name: { de: "Klick", en: "Click" }, wert: S.werkzeug,
        optionen: [{ wert: "anheben", name: { de: "Gebäude anheben (+0,5 m)", en: "Raise building (+0.5 m)" } },
                   { wert: "graben", name: { de: "Graben ziehen", en: "Dig ditch" } }, { wert: "aufforsten", name: { de: "Aufforsten", en: "Afforest" } }] }
    ],
    aktionen: [{ name: { de: "Maßnahmen zurücksetzen", en: "Clear measures" }, tue: (z, p) => Modell.massnahmenWeg(z, p) }],
    groesse: z => ({ b: z.b, h: z.h }),
    klick(z, p, x, y, taste, phase) {
      const q = [x, y];
      if (p.werkzeug === "anheben") { if (phase === "unten") Modell.hebeAn(z, p, q, taste === "rechts"); }
      else if (p.werkzeug === "graben") { if (taste !== "rechts") Modell.graben(z, p, q, phase === "unten"); }
      else if (taste !== "rechts") Modell.forste(z, q);
    },
    ende: (z, p) => Modell.fertig(z, p),
    zeichne(ctx, z, p, F) {
      const px = F.px, regen = p.modus === "regen", risiko = !regen && p.ansicht === "risiko";
      ctx.drawImage(gelaendeBild(z, F), 0, 0, z.b, z.h);
      const L = regen ? 0 : Modell.pegel(z);
      wasser(ctx, z, L, risiko);
      // Gräben und Wald
      for (const G of z.graeben) Karte.linie(ctx, G, F.dunkel ? "rgba(130,180,240,0.9)" : "rgba(30,90,170,0.85)", px * 1.6, [4 * px, 3 * px]);
      ctx.fillStyle = BAUM; ctx.beginPath();
      for (const b of z.baeume) { ctx.moveTo(b[0] + 1.3, b[1]); ctx.arc(b[0], b[1], 1.3, 0, 2 * Math.PI); }
      ctx.fill();
      // Regen: Fließwege, erosionsgefährdete Abschnitte, Partikel
      if (regen) {
        ctx.beginPath();
        for (const q of z.regen) { const W = q.weg; ctx.moveTo(W[0][0], W[0][1]); for (let i = 1; i < W.length; i++) ctx.lineTo(W[i][0], W[i][1]); ctx.lineTo(q.x, q.y); }
        ctx.strokeStyle = F.dunkel ? "rgba(120,170,235,0.28)" : "rgba(30,90,170,0.25)"; ctx.lineWidth = px * 0.8; ctx.stroke();
        ctx.beginPath();
        for (const q of z.regen) for (let i = 1; i < q.weg.length; i++) {
          const a = q.weg[i - 1], b = q.weg[i];
          if (Math.hypot(b[0] - a[0], b[1] - a[1]) >= p.erosion) { ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
        }
        ctx.strokeStyle = "rgba(240,110,20,0.75)"; ctx.lineWidth = px * 1.1; ctx.stroke();
        ctx.fillStyle = F.dunkel ? "#8fc3ff" : "#1f5fb0"; ctx.beginPath();
        for (const q of z.regen) if (q.aktiv) { ctx.moveTo(q.x + 0.9, q.y); ctx.arc(q.x, q.y, 0.9, 0, 2 * Math.PI); }
        ctx.fill();
      }
      // Straßensegmente
      const K = Math.max(1, Math.round(p.tiefenschwelle / p.schrittweite)) + 1;
      z.strassen.forEach((s, i) => {
        let f = null;
        if (regen) { const r = z.risiko.strassen[i]; if (r > 0) f = Karte.farbe(Math.min(1, r / REGEN_MAX), "gelbrot"); }
        else if (risiko) { const r = Modell.mittleresRisiko(z.kStr[i], z.stufen.N); if (r > 0) f = css(risikoFarbe(r)); }
        else { const st = Modell.tiefenStufe(z.kStr[i], z.k, p); if (st) f = css(rotStufe(st, K)); }
        Karte.linie(ctx, [s.a, s.b], f || (F.dunkel ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.3)"), px * (f ? 3 : 1.4));
      });
      // Gebäude
      z.gebaeude.forEach((g, i) => {
        let f = null;
        if (regen) { const r = z.risiko.gebaeude[i]; if (r > 0) f = Karte.farbe(Math.min(1, r / REGEN_MAX), "gelbrot"); }
        else if (risiko) { const r = Modell.mittleresRisiko(z.kGeb[i], z.stufen.N); if (r > 0) f = css(risikoFarbe(r)); }
        else { const st = Modell.tiefenStufe(z.kGeb[i], z.k, p); if (st) f = css(rotStufe(st, K)); }
        Karte.poly(ctx, g.poly, f || trocken(F), g.extra > 0 ? F.akzentText || F.akzent : trockenStrich(F), px * (g.extra > 0 ? 2 : 0.6));
      });
      if (!regen) kurve(ctx, z, F);
      const t = regen ? `${de() ? "Regen" : "Rain"} · ${z.t} / ${p.iterationen}` : risiko ? (de() ? "mittleres Risiko" : "mean risk") : `${de() ? "Pegel" : "Level"} ${zahl(L, 2)} m`;
      ctx.fillStyle = F.dunkel ? "rgba(0,0,0,0.72)" : "rgba(255,255,255,0.85)"; ctx.fillRect(6 * px, 6 * px, (t.length * 7.4 + 12) * px, 20 * px);
      Karte.text(ctx, t, [12 * px, 16 * px], F.tinte, px, 12);
    },
    legende: (F, p) => {
      if (p.modus === "regen") return [0, 0.5, 1].map((t, i) => [Karte.farbe(t, "gelbrot"), i === 0 ? (de() ? "Risiko gering" : "low risk") : i === 2 ? `≥ ${zahl(REGEN_MAX, 1)} ${de() ? "Partikel/m²" : "particles/m²"}` : ""])
        .concat([[F.dunkel ? "#8fc3ff" : "#1f5fb0", { de: "Partikel", en: "Particles" }], ["rgb(240,110,20)", { de: "Erosionsrisiko", en: "Erosion risk" }],
                 [trocken(F), { de: "trocken", en: "dry" }], [BAUM, { de: "Wald", en: "Forest" }]]);
      if (p.ansicht === "risiko") return [0, 0.5, 1].map((r, i) => [css(risikoFarbe(r)), i === 0 ? "0 %" : i === 2 ? "100 %" : ""])
        .concat([[trocken(F), { de: "nie überflutet", en: "never flooded" }]]);
      const K = Math.max(1, Math.round(p.tiefenschwelle / p.schrittweite)) + 1, dz = p.schrittweite;
      const L = []; for (let s = 1; s <= K; s++) L.push([css(rotStufe(s, K)), s === K ? `≥ ${zahl((K - 1) * dz)} cm` : `${zahl((s - 1) * dz)} cm`]);
      return L.concat([[css(Karte.farbeRGB(0.7, "wasser")), { de: "Wasser", en: "Water" }], [trocken(F), { de: "trocken", en: "dry" }], [F.akzentText || F.akzent, { de: "angehoben", en: "raised" }]]);
    },
    kennzahlen: (z, p) => {
      const nG = z.gebaeude.length, nS = z.strassen.length, angehoben = z.gebaeude.filter(g => g.extra > 0).length;
      const M = [[{ de: "angehobene Gebäude", en: "Raised buildings" }, String(angehoben)], [{ de: "Gräben", en: "Ditches" }, String(z.graeben.length)],
        [{ de: "Wald", en: "Forest" }, zahl(z.wald.reduce((a, b) => a + b, 0) * z.G.zelle * z.G.zelle / 1e4, 2) + " ha"]];
      if (p.modus === "regen") {
        const A = Modell.regenAuswertung(z);
        return [
          [{ de: "Schritt", en: "Step" }, `${z.t} / ${p.iterationen}`],
          [{ de: "Partikel auf dem Gelände", en: "Particles on terrain" }, zahl(A.aktiv)],
          [{ de: "in den Fluss abgeflossen", en: "Drained into the river" }, zahl(A.abgeflossen)],
          [{ de: `Gebäude mit Wasser im Umkreis ${zahl(p.umkreis, 1)} m`, en: `Buildings with water within ${zahl(p.umkreis, 1)} m` }, `${A.mit} / ${nG}`],
          [{ de: "… davon ≥ 0,05 Partikel/m²", en: "… of which ≥ 0.05 particles/m²" }, String(A.hoch)],
          [{ de: "höchstes Risiko (Partikel/m²)", en: "Highest risk (particles/m²)" }, zahl(A.max, 3)],
          [{ de: "Straßensegmente mit Wasser", en: "Street segments with water" }, `${A.str} / ${nS}`],
          [{ de: "Fläche mit Erosionsrisiko", en: "Area at risk of erosion" }, zahl(A.erosion, 2) + " ha"]
        ].concat(M);
      }
      const A = Modell.auswertung(z, p);
      return [
        [{ de: "Pegel", en: "Water level" }, `${zahl(Modell.pegel(z), 2)} m · ${z.k} / ${z.stufen.N}`],
        [{ de: "überflutete Gebäude", en: "Flooded buildings" }, `${A.geb} / ${nG}`],
        [{ de: `… davon ≥ ${zahl(p.tiefenschwelle)} cm tief`, en: `… of which ≥ ${zahl(p.tiefenschwelle)} cm deep` }, String(A.tief)],
        [{ de: "überflutete Straßensegmente", en: "Flooded street segments" }, `${A.str} / ${nS}`],
        [{ de: "überflutete Fläche (ohne Fluss)", en: "Flooded area (without river)" }, zahl(A.flaeche, 2) + " ha"],
        [{ de: `überflutet bei ${zahl(p.maxpegel, 1)} m`, en: `Flooded at ${zahl(p.maxpegel, 1)} m` }, String(A.maxGeb)],
        [{ de: "mittleres Risiko der Gebäude", en: "Mean risk of buildings" }, zahl(100 * A.risiko, 1) + " %"],
        [{ de: "Gebäude mit Risiko > 50 %", en: "Buildings with risk > 50 %" }, String(A.ueber50)],
        [{ de: "mittleres Risiko der Straßen", en: "Mean risk of streets" }, zahl(100 * A.risikoStr, 1) + " %"]
      ].concat(M);
    }
  });
})();
