/* KREMLAS · Dichte Packung · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD, FA = Modell.FASSUNGEN, B = Modell.BREITE, H = Modell.HOEHE;
  const G_F = { de: "Fassung", en: "Version" }, G_ES = { de: "Evolutionsstrategie", en: "Evolution strategy" },
        G_K = { de: "Kollisionserkennung", en: "Collision detection" }, G_T = { de: "Topologie", en: "Topology" }, G_D = { de: "Darstellung", en: "Display" };
  const en = () => document.documentElement.lang === "en";
  const zahl = v => Math.round(v).toLocaleString(en() ? "en" : "de");
  const proz = v => Math.round(v * 100) + " %";
  // Farben: Räume grau mit dunklen Wänden wie im Original (Color.Gray, Pen Black), Nachbarschaften orange (Color.Orange)
  const ORANGE = "#f08c00", GRUEN = F => F.dunkel ? "#40c057" : "#2b8a3e", BLAU = F => F.dunkel ? "#748ffc" : "#3b5bdb";
  const raumFarbe = F => F.dunkel ? "#6f6f74" : "#9b9b9f";
  const RECHTS = 170, UNTEN = 110, LUECKE = 14;
  const quer = () => window.innerWidth > 900;
  const mitTopo = z => z.ablauf === "topologie";

  /** Verlauf: kleinste Überlappung Sg (grün) und in den Fassungen mit Topologie die Distanzen f2 (blau, gestrichelt), logarithmisch */
  function diagramm(ctx, z, F, x0, y0, w, h) {
    const fs = 10 * F.px, l = x0, r = x0 + w, o = y0 + fs * 1.8, u = y0 + h - fs * 1.6, hh = u - o;
    const V = z.verlauf, D = z.verlaufD, topo = mitTopo(z);
    const vmax = Math.max(1000, ...V.slice(0, 50)), lg = v => Math.log10(Math.max(1, v));
    const X = Math.max(100, (V.length - 1) * z.dichte), sx = i => l + w * i * z.dichte / X;
    const sy = v => u - hh * Math.min(1, lg(v) / lg(vmax));
    ctx.save();
    ctx.font = `${fs}px "Geist Mono", ui-monospace, monospace`;
    ctx.strokeStyle = F.linie; ctx.lineWidth = F.px;
    ctx.beginPath(); ctx.moveTo(l, o); ctx.lineTo(l, u); ctx.lineTo(r, u); ctx.stroke();
    const linie = (L, farbe, strich) => {
      ctx.strokeStyle = farbe; ctx.lineWidth = 1.5 * F.px; ctx.setLineDash(strich ? [4 * F.px, 3 * F.px] : []); ctx.beginPath();
      const s = Math.max(1, Math.floor(L.length / 400));
      for (let i = 0; i < L.length; i += s) { const x = sx(i), y = sy(L[i]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      if (L.length) ctx.lineTo(sx(L.length - 1), sy(L[L.length - 1]));
      ctx.stroke(); ctx.setLineDash([]);
    };
    linie(V, GRUEN(F), false);
    if (topo) linie(D, BLAU(F), true);
    ctx.fillStyle = F.gedaempft; ctx.textAlign = "left";
    ctx.fillText(zahl(vmax), l + 3 * F.px, o - 4 * F.px);
    ctx.fillText("0", l, u + fs * 1.2);
    ctx.textAlign = "right"; ctx.fillText(zahl(X), r, u + fs * 1.2);
    ctx.fillText(en() ? (topo ? "Sg · f2 (log)" : "overlap Sg (log)") : (topo ? "Sg · f2 (log)" : "Überlappung Sg (log)"), r, o - 4 * F.px);
    ctx.restore();
  }

  const fassungen = Object.keys(FA);
  const folgen = {};
  fassungen.forEach(f => { folgen[f] = { topo: FA[f].ablauf === "topologie" }; Modell.REGLER.forEach(k => { folgen[f][k] = FA[f][k]; }); });   // show topology: im Original aus

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 30, wert: 1 },
    parameter: [
      { id: "fassung", gruppe: G_F, name: { de: "Fassung", en: "Version" }, art: "auswahl", wert: S.fassung, neustart: true, folgen,
        optionen: [{ wert: "einpassung", name: { de: "Einpassung", en: "Fitting" } },
                   { wert: "kollision", name: { de: "Kollision allein", en: "Collision only" } },
                   { wert: "topologie", name: { de: "Topologie: Stern", en: "Topology: star" } },
                   { wert: "gang", name: { de: "Topologie: Gang", en: "Topology: corridor" } }] },
      { id: "raeume", gruppe: G_ES, name: { de: "Räume (Rooms)", en: "Rooms" }, min: 2, max: 40, wert: S.raeume, neustart: true },
      { id: "mu", gruppe: G_ES, name: { de: "Eltern μ (Population)", en: "Parents μ (population)" }, min: 1, max: 30, wert: S.mu, neustart: true },
      { id: "druck", gruppe: G_ES, name: { de: "Druck (Pressure) λ ≈ μ · Druck", en: "Pressure λ ≈ μ · pressure" }, min: 1, max: 20, wert: S.druck },
      { id: "plus", gruppe: G_ES, name: { de: "(μ+λ)-ES (aus: (μ,λ))", en: "(μ+λ)-ES (off: (μ,λ))" }, art: "schalter", wert: S.plus },
      { id: "elite", gruppe: G_ES, name: { de: "Elite", en: "Elite" }, art: "schalter", wert: S.elite },
      { id: "kreuzung", gruppe: G_ES, name: { de: "Rekombination (Crossover)", en: "Recombination (crossover)" }, art: "schalter", wert: S.kreuzung },
      { id: "kreuzRate", gruppe: G_ES, name: { de: "Rekombinationsrate", en: "Crossover rate" }, min: 0, max: 1, schritt: 0.01, wert: S.kreuzRate, format: proz },
      { id: "repForce", gruppe: G_K, name: { de: "Abstoßen: Kraft β", en: "Repel force β" }, min: 0, max: 1, schritt: 0.01, wert: S.repForce, format: proz },
      { id: "repRate", gruppe: G_K, name: { de: "Abstoßen: Rate ρL", en: "Repel rate ρL" }, min: 0, max: 1, schritt: 0.01, wert: S.repRate, format: proz },
      { id: "propForce", gruppe: G_K, name: { de: "Proportion: Kraft α", en: "Proportion force α" }, min: 0, max: 1, schritt: 0.01, wert: S.propForce, format: proz },
      { id: "propRate", gruppe: G_K, name: { de: "Proportion: Rate ρG", en: "Proportion rate ρG" }, min: 0, max: 1, schritt: 0.01, wert: S.propRate, format: proz },
      { id: "daempfung", gruppe: G_T, name: { de: "Federdämpfung (spring Damp)", en: "Spring damping" }, min: -1, max: 1, schritt: 0.01, wert: S.daempfung, format: proz },
      { id: "rlap", gruppe: G_T, name: { de: "Durchgangsbreite (Rooms Overlap)", en: "Passage width (rooms overlap)" }, min: 0, max: 100, wert: S.rlap },
      { id: "topo", gruppe: G_D, name: { de: "Topologie zeigen", en: "Show topology" }, art: "schalter", wert: S.topo },
      { id: "nummern", gruppe: G_D, name: { de: "Raumnummern", en: "Room numbers" }, art: "schalter", wert: S.nummern },
      { id: "verlauf", gruppe: G_D, name: { de: "Verlauf zeigen", en: "Show chart" }, art: "schalter", wert: S.verlauf, groesseNeu: true }
    ],
    groesse: (z, p) => !p.verlauf ? { b: B, h: H } : quer() ? { b: B + LUECKE + RECHTS, h: H } : { b: B, h: H + UNTEN },
    klick(z, p, x, y, taste, phase) { if (taste === "links") Modell.ziehe(z, x, y, phase); },
    zeichne(ctx, z, p, F) {
      const b = Modell.beste(z), G = b.g;
      ctx.fillStyle = F.dunkel ? F.flaeche : F.papier; ctx.fillRect(0, 0, B, H);
      // Räume der besten Lösung (PhenotypeGdi): grau, Wände in Papierfarbe (dunkel) bzw. schwarz (hell)
      ctx.lineWidth = 2; ctx.strokeStyle = F.dunkel ? F.papier : F.tinte;
      for (const g of G) {
        ctx.fillStyle = raumFarbe(F); ctx.fillRect(g.x - g.w / 2, g.y - g.h / 2, g.w, g.h);
        ctx.strokeRect(g.x - g.w / 2, g.y - g.h / 2, g.w, g.h);
      }
      // Überlappungen
      ctx.fillStyle = F.akzent; ctx.globalAlpha = 0.75;
      for (let i = 0; i < G.length; i++) for (let k = i + 1; k < G.length; k++) {
        const r = Modell.schnittRechteck(G[i], G[k]); if (r) ctx.fillRect(r.x1, r.y1, r.w, r.h);
      }
      ctx.globalAlpha = 1;
      if (z.gesperrt >= 0) {
        const g = G.find(q => q.id === z.gesperrt);
        if (g) { ctx.strokeStyle = F.akzentText; ctx.lineWidth = 3; ctx.strokeRect(g.x - g.w / 2, g.y - g.h / 2, g.w, g.h); }
      }
      // Nachbarschaften (DrawConnections): Linien zwischen den Mittelpunkten, erfüllte durchgezogen, offene gestrichelt
      if (p.topo) {
        ctx.strokeStyle = ORANGE; ctx.fillStyle = ORANGE; ctx.lineWidth = 1.5 * F.px;
        for (const [a, c] of z.paare) {
          const A = G.find(q => q.id === a), C = G.find(q => q.id === c);
          if (!A || !C) continue;
          ctx.setLineDash(Modell.paarDistanz(A, C, p.rlap) < 1 ? [] : [4 * F.px, 3 * F.px]);
          ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(C.x, C.y); ctx.stroke();
        }
        ctx.setLineDash([]);
        for (const g of G) { ctx.beginPath(); ctx.arc(g.x, g.y, 2.5 * F.px, 0, 2 * Math.PI); ctx.fill(); }
      }
      if (p.nummern) {
        ctx.font = `${11 * F.px}px "Geist Mono", ui-monospace, monospace`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillStyle = F.dunkel ? F.tinte : F.papier;
        for (const g of G) ctx.fillText(String(g.id), g.x + 8 * F.px, g.y - 8 * F.px);
        ctx.textBaseline = "alphabetic";
      }
      // Umgebungsrechteck (dicker Rahmen wie im Original)
      ctx.strokeStyle = F.tinte; ctx.lineWidth = 4; ctx.strokeRect(0, 0, B, H);
      if (p.verlauf) {
        if (quer()) diagramm(ctx, z, F, B + LUECKE, 0, RECHTS, H);
        else diagramm(ctx, z, F, 0, H + 8, B, UNTEN - 8);
      }
    },
    legende: (F, p, z) => {
      const L = [[raumFarbe(F), { de: "Raum", en: "Room" }], [F.akzent, { de: "Überlappung", en: "Overlap" }]];
      if (p.topo) L.push([ORANGE, { de: "Nachbarschaft (gestrichelt: offen)", en: "Adjacency (dashed: open)" }]);
      if (p.verlauf) { L.push([GRUEN(F), { de: "Verlauf Sg", en: "chart Sg" }]); if (z && mitTopo(z)) L.push([BLAU(F), { de: "Verlauf f2", en: "chart f2" }]); }
      return L;
    },
    kennzahlen(z, p) {
      const b = Modell.beste(z), m = z.paare.length;
      const k = [[{ de: "Generation", en: "Generation" }, zahl(z.t)],
                 [{ de: "Überlappung Sg (f1)", en: "Overlap Sg (f1)" }, zahl(b.fo)],
                 [{ de: "Distanzen f2", en: "Distances f2" }, zahl(b.fd)],
                 [{ de: "Nachbarschaften erfüllt", en: "Adjacencies satisfied" }, `${Modell.erfuellt(b, z.paare, p.rlap)} / ${m}`],
                 [{ de: "Selektion", en: "Selection" }, `(${z.mu}${p.plus ? "+" : ","}λ)`],
                 [{ de: "Kinder je Generation", en: "Children per generation" }, zahl(z.kinder)]];
      if (z.aufteilung) k.push([{ de: "Auswahl nach f1 · f2", en: "Selected by f1 · f2" }, `${z.aufteilung[0]} · ${z.aufteilung[1]}`]);
      k.push([{ de: "Belegung", en: "Coverage" }, "75 %"]);
      if (z.gesperrt >= 0) k.push([{ de: "Gezogen", en: "Dragged" }, { de: `Raum ${z.gesperrt}`, en: `room ${z.gesperrt}` }]);
      return k;
    }
  });

  // Maustaste los (pictureBox1_MouseUp): Sperre des gezogenen Raums aufheben
  const los = () => { if (window.SIM && SIM.zustand) { Modell.loslassen(SIM.zustand); SIM.zeichne(); } };
  const c = document.getElementById("leinwand");
  c.addEventListener("pointerup", los); c.addEventListener("pointercancel", los);
})();
