/* Multiplikatoreffekt · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const de = () => document.documentElement.lang !== "en";
  const zahl = (v, n = 0) => Number.isFinite(v) ? v.toLocaleString(de() ? "de" : "en", { minimumFractionDigits: n, maximumFractionDigits: n }) : "–";
  const kurzZahl = v => !Number.isFinite(v) ? "–" : Math.abs(v) >= 100 ? zahl(v) : Math.abs(v) >= 1 ? zahl(v, 1) : zahl(v, 2);
  const ROT = "#e0323c";                  // Disruptoren (rote Punkte wie in den Abbildungen des Papers)
  const FANG = 35;                        // Fangradius für Disruptoren in m
  // Diagramme: auf breiten Bildschirmen rechts neben dem Plan, sonst darunter (Modelleinheiten = m)
  const RECHTS = 560, UNTEN = 700, LUECKE = 50;
  const quer = () => window.innerWidth > 900;
  /** Zahl als tiefgestellte Ziffern (MPC₂₉) */
  const tief = n => String(n).replace(/\d/g, c => "₀₁₂₃₄₅₆₇₈₉"[c]);

  const SIMU = { de: "Rückkopplung (simulation control)", en: "Feedback loop (simulation control)" };
  const GEW = { de: "Nutzungen (Custom weighting of Origins and Destinations)", en: "Land use (custom weighting of origins and destinations)" };
  const NETZ = { de: "Netz (2. BuildGraph)", en: "Network (2. BuildGraph)" };
  const DARST = { de: "Darstellung (visualize centrality values)", en: "Display (visualize centrality values)" };

  /** Werte der gezeigten Iteration j: MPC_j (j ≥ 1) oder Nutzungen w_j; null, wenn noch kein MPC gerechnet ist */
  function werteVon(z, p, j) {
    if (p.zeige === "w") return z.gew[j];
    return j >= 1 ? z.mpc[j - 1] : null;
  }
  /** Darstellungswert (display log values: ln(x + 3) − ln 3) */
  const darst = (v, p) => p.darstellung === "log" ? Modell.logWert(v) : v;
  /** Werte → 0…1 (Bounds → Remap) */
  function aufEins(W, p) {
    if (!W) return null;
    const D = Array.from(W, v => darst(v, p));
    let mn = Infinity, mx = -Infinity; for (const v of D) { if (v < mn) mn = v; if (v > mx) mx = v; }
    const sp = mx - mn;
    return D.map(v => sp > 1e-12 ? (v - mn) / sp : 0.5);
  }

  /** Streudiagramm MPC_1 → MPC_j und Verlauf der Maße Me, Ch, Ne über die Iterationen */
  function diagramme(ctx, z, p, F, x0, y0, w, h, nebeneinander) {
    const fs = 10 * F.px, gap = nebeneinander ? 90 : 110, j = Modell.gezeigt(z, p), N = Math.max(1, Math.round(p.iterationen));
    const boxen = nebeneinander ? [[x0, y0, (w - gap) / 2, h], [x0 + (w + gap) / 2, y0, (w - gap) / 2, h]]
                                : [[x0, y0, w, (h - gap) / 2], [x0, y0 + (h + gap) / 2, w, (h - gap) / 2]];
    const eng = boxen[0][2] / F.px < 220;            // schmale Kästen (Telefon): kurze Beschriftungen
    ctx.save();
    ctx.font = `${fs}px "Geist Mono", ui-monospace, monospace`; ctx.textBaseline = "alphabetic";
    const rahmen = ([l, o, bw, bh], titel, xl, xr, yo, yu) => {
      const ob = o + fs * 2.4, u = o + bh - fs * 1.6;
      ctx.strokeStyle = F.linie; ctx.lineWidth = F.px; ctx.beginPath(); ctx.moveTo(l, ob); ctx.lineTo(l, u); ctx.lineTo(l + bw, u); ctx.stroke();
      ctx.setLineDash([2 * F.px, 3 * F.px]); ctx.beginPath(); ctx.moveTo(l, ob); ctx.lineTo(l + bw, ob); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = F.tinte2; ctx.textAlign = "left"; ctx.fillText(titel, l, o + fs * 0.9);
      ctx.fillStyle = F.gedaempft; ctx.fillText(yo, l + 3 * F.px, ob - 3 * F.px);
      if (yu) ctx.fillText(yu, l + 3 * F.px, u - 3 * F.px);
      ctx.fillText(xl, l, u + fs * 1.25); ctx.textAlign = "right"; ctx.fillText(xr, l + bw, u + fs * 1.25);
      return { l, ob, u, bw, hh: u - ob };
    };
    // 1. Streudiagramm (Vollversion: R.NET Lm Optimizer, Paper Abb. 7/10)
    {
      const me = j ? z.me[j - 1] : NaN;
      const titel = (eng ? "" : de() ? "Multiplikatoreffekt " : "Multiplier effect ") + "Me = R² " + (j ? zahl(me, 2) : "–");
      const R = rahmen(boxen[0], titel, "MPC₁ →", p.darstellung === "log" && !eng ? "ln(x+3) − ln 3" : "", "MPC" + (j ? tief(j) : "ᵢ"), "");
      if (j >= 1) {
        const X = aufEins(z.mpc[0], p), Y = aufEins(z.mpc[j - 1], p), r = 2.4 * F.px;
        for (let i = 0; i < X.length; i++) {
          ctx.beginPath(); ctx.arc(R.l + R.bw * X[i], R.u - R.hh * Y[i], r, 0, 2 * Math.PI);
          ctx.fillStyle = Karte.farbe(Y[i], "spektral", 0.85); ctx.fill();
        }
      } else {
        ctx.fillStyle = F.gedaempft; ctx.textAlign = "center";
        ctx.fillText(de() ? "nach der ersten Iteration" : "after the first iteration", R.l + R.bw / 2, R.ob + R.hh / 2);
      }
    }
    // 2. Verlauf der Maße (Paper Abb. 6/9 und 11)
    {
      const R = rahmen(boxen[1], eng ? (de() ? "Verlauf" : "Measures") : de() ? "Verlauf je Iteration" : "Measures per iteration", "1", String(N), "1", "0");
      const sx = i => R.l + R.bw * (N > 1 ? (i - 1) / (N - 1) : 0.5), sy = v => R.u - R.hh * Math.max(0, Math.min(1, v));
      if (j >= 1) { ctx.strokeStyle = F.linie; ctx.lineWidth = F.px; ctx.beginPath(); ctx.moveTo(sx(j), R.ob); ctx.lineTo(sx(j), R.u); ctx.stroke(); }
      const linie = (L, farbe, strich) => {
        ctx.strokeStyle = farbe; ctx.lineWidth = 1.7 * F.px; ctx.setLineDash(strich || []); ctx.beginPath();
        let auf = false;
        L.forEach((v, k) => { if (k + 1 > N || !Number.isFinite(v)) { auf = false; return; } const x = sx(k + 1), y = sy(v); auf ? ctx.lineTo(x, y) : ctx.moveTo(x, y); auf = true; });
        ctx.stroke(); ctx.setLineDash([]);
      };
      const fMe = F.dunkel ? "#9ea0f3" : F.akzent, fNe = F.dunkel ? "#f07a5a" : "#d0452b";
      linie(z.ch, F.tinte2, [4 * F.px, 3 * F.px]);
      if (z.dSeg.length) linie(z.ne, fNe);
      linie(z.me, fMe);
      ctx.textAlign = "right";
      const zeilen = eng ? [[fMe, "Me"], [F.tinte2, "Ch ---"]] : [[fMe, "Me = R²(MPC₁, MPCᵢ)"], [F.tinte2, "Ch = 1 − R²(MPCᵢ₋₁, MPCᵢ) ---"]];
      if (z.dSeg.length) zeilen.push([fNe, eng ? "Ne" : de() ? "Ne = R²(MPC₁ gleich, MPCᵢ)" : "Ne = R²(MPC₁ equal, MPCᵢ)"]);
      zeilen.forEach(([c, s], k) => { ctx.fillStyle = c; ctx.fillText(s, R.l + R.bw - 3 * F.px, R.ob + fs * (1.4 + 1.3 * k)); });
    }
    ctx.restore();
  }

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 5, wert: 1 },
    parameter: [
      { id: "iterationen", gruppe: SIMU, name: { de: "Iterationen (Loop Start, Repeat)", en: "Iterations (loop start, repeat)" }, min: 0, max: 100, schritt: 1, wert: S.iterationen },
      { id: "mass", gruppe: SIMU, art: "auswahl", name: { de: "Zentralität MPC (List)", en: "Centrality MPC (list)" }, wert: S.mass,
        optionen: [{ wert: "closeness", name: { de: "Closeness (Closennes)", en: "Closeness" } }, { wert: "betweenness", name: { de: "Betweenness", en: "Betweenness" } }] },
      { id: "radius", gruppe: SIMU, art: "auswahl", name: { de: "Radius (List)", en: "Radius (list)" }, wert: S.radius,
        optionen: [{ wert: "r600", name: { de: "Fußgänger R600 m (Pedestrian radius R600m)", en: "Pedestrian radius R600m" } },
                   { wert: "rn", name: { de: "Global Rn (Global radius N)", en: "Global radius N" } }] },
      { id: "modus", gruppe: SIMU, art: "auswahl", name: { de: "Nachführen (update)", en: "Update" }, wert: S.modus,
        optionen: [{ wert: "beide", name: { de: "Ursprünge und Ziele (update origins & destinations)", en: "Update origins & destinations" } },
                   { wert: "ziele", name: { de: "nur Ziele (update destinations)", en: "Update destinations" } }] },
      { id: "stoerung", gruppe: SIMU, art: "auswahl", name: { de: "Störung (disruption)", en: "Disruption" }, wert: S.stoerung,
        optionen: [{ wert: "temporaer", name: { de: "temporär (Temporal disruption)", en: "Temporal disruption" } },
                   { wert: "dauerhaft", name: { de: "dauerhaft (Permanent disruption)", en: "Permanent disruption" } }] },
      { id: "k", gruppe: GEW, name: { de: "Grundgewicht (k, konstant weight)", en: "Base weight (k, konstant weight)" }, min: 0, max: 10, schritt: 0.1, wert: S.k },
      { id: "d", gruppe: GEW, name: { de: "Disruptorstärke (d, disruptor force)", en: "Disruptor force (d)" }, min: 0, max: 5000, schritt: 1, wert: S.d },
      { id: "definition", gruppe: NETZ, art: "auswahl", name: { de: "Definition", en: "Definition" }, wert: S.definition,
        optionen: [{ wert: "dcs2020", name: { de: "DeCodingSpaces 2019 (Original)", en: "DeCodingSpaces 2019 (original)" } },
                   { wert: "standard", name: { de: "Standard (Toolbox v2)", en: "standard (toolbox v2)" } }] },
      { id: "zeige", gruppe: DARST, art: "auswahl", name: { de: "Färbung", en: "Colouring" }, wert: S.zeige,
        optionen: [{ wert: "mpc", name: { de: "Bewegungspotenzial MPC (centrality)", en: "Movement potential MPC (centrality)" } },
                   { wert: "w", name: { de: "Nutzungen w (Attractors/segment)", en: "Land use w (attractors/segment)" } }] },
      { id: "darstellung", gruppe: DARST, art: "auswahl", name: { de: "Werte (List)", en: "Values (list)" }, wert: S.darstellung,
        optionen: [{ wert: "log", name: { de: "logarithmisch (display log values)", en: "Display log values" } },
                   { wert: "original", name: { de: "Originalwerte (display original values)", en: "Display original values" } }] },
      { id: "verlauf", gruppe: DARST, name: { de: "Iteration zeigen (Browse History)", en: "Show iteration (browse history)" }, min: 0, max: 100, schritt: 1, wert: S.verlauf,
        format: v => v > 0 ? String(v) : (de() ? "laufende" : "current") },
      { id: "werte", gruppe: DARST, art: "schalter", name: { de: "Werte zeigen (value preview)", en: "Show values (value preview)" }, wert: S.werte },
      { id: "diagramme", gruppe: DARST, art: "schalter", name: { de: "Diagramme zeigen", en: "Show charts" }, wert: S.diagramme, groesseNeu: true }
    ],
    groesse: (z, p) => !p.diagramme ? { b: z.b, h: z.h } : quer() ? { b: z.b + LUECKE + RECHTS, h: z.h } : { b: z.b, h: z.h + LUECKE + UNTEN },
    klick(z, p, x, y, taste, phase) {
      if (phase !== "unten" || x < 0 || y < 0 || x > z.b || y > z.h) return;
      if (taste === "rechts") { const i = Modell.disruptorBei(z, [x, y], FANG); if (i >= 0) { z.disruptoren.splice(i, 1); Modell.leere(z, p); } return; }
      Modell.schalteDisruptor(z, p, [x, y], FANG);
    },
    aktionen: [
      { name: { de: "Rechnen", en: "Compute" }, tue: (z, p) => { while (!Modell.fertig(z, p)) Modell.schritt(z, p); } },
      { name: { de: "Neu", en: "Restart" }, tue: (z, p) => Modell.leere(z, p) },
      { name: { de: "Disruptoren ✕", en: "Disruptors ✕" }, tue: (z, p) => { z.disruptoren.length = 0; Modell.leere(z, p); } }
    ],
    ende: (z, p) => Modell.fertig(z, p),
    zeichne(ctx, z, p, F) {
      const px = F.px, N = z.N, j = Modell.gezeigt(z, p);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, z.b, z.h); ctx.clip();
      ctx.fillStyle = F.flaeche; ctx.fillRect(0, 0, z.b, z.h);
      ctx.lineCap = "round";
      const kante = (k, farbe, lw) => { const e = N.kanten[k], a = N.knoten[e.a], b = N.knoten[e.b];
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.strokeStyle = farbe; ctx.lineWidth = lw; ctx.stroke(); };
      // Segmente der Disruptoren mit Rand (dort liegt d)
      for (const k of z.dSeg) kante(k, F.dunkel ? "rgba(240,80,90,0.55)" : "rgba(224,50,60,0.45)", px * 8);
      const W = werteVon(z, p, j), T = aufEins(W, p);
      if (!T) for (let k = 0; k < N.kanten.length; k++) kante(k, F.dunkel ? "#6a6a74" : "#9a9aa4", px * 1.4);
      else {
        const ord = [...N.kanten.keys()].sort((a, b) => T[a] - T[b]);
        // in Hell eine feine dunkle Kontur, damit die hellen Mitteltöne der Skala auf hellem Grund lesbar bleiben
        if (!F.dunkel) for (const k of ord) kante(k, "rgba(30,30,40,0.35)", px * (2.4 + 3.4 * T[k]));
        for (const k of ord) kante(k, Karte.farbe(T[k], "spektral"), px * (1.2 + 3.4 * T[k]));
      }
      if (p.werte && W) {
        z.G.mitte.forEach((m, k) => Karte.text(ctx, kurzZahl(W[k]), [m[0], m[1] - 6 * px], F.tinte, px, 8.5, "center"));
      }
      for (const q of z.disruptoren) Karte.punkt(ctx, q, 6.5 * px, ROT, F.tinte, px * 1.4);
      if (z.t === 0) {
        const lang = de() ? "Start: eine Rückkopplungsrunde je Schritt · Klick setzt oder entfernt Disruptoren" : "Start: one feedback round per step · click sets or removes disruptors";
        const kurz = de() ? "Start: eine Runde je Schritt" : "Start: one round per step";
        const b = Math.min(lang.length * 7.2 + 24, z.b / px - 16) * px;
        ctx.fillStyle = F.papier; ctx.globalAlpha = 0.82; ctx.fillRect(z.b / 2 - b / 2, z.h - 26 * px, b, 22 * px); ctx.globalAlpha = 1;
        Karte.text(ctx, lang.length * 7.2 < z.b / px - 24 ? lang : kurz, [z.b / 2, z.h - 15 * px], F.tinte, px, 12, "center");
      }
      ctx.restore();
      if (p.diagramme) {
        if (quer()) diagramme(ctx, z, p, F, z.b + LUECKE, 6, RECHTS, z.h - 12, false);
        else diagramme(ctx, z, p, F, 0, z.h + LUECKE * 0.6, z.b, UNTEN, true);
      }
    },
    legende(F, p) {
      const was = p.zeige === "w" ? { de: "Nutzungen w", en: "land use w" } : { de: "MPC", en: "MPC" };
      return Karte.skalenLegende("spektral", { de: was.de + " gering", en: "low " + was.en }, { de: "hoch", en: "high" })
        .concat([[ROT, { de: "Disruptor (d)", en: "Disruptor (d)" }]]);
    },
    kennzahlen(z, p) {
      const j = Modell.gezeigt(z, p), K = Modell.kennwerte(z, j), N = Math.round(p.iterationen);
      return [
        [{ de: "Iteration", en: "Iteration" }, zahl(z.iter) + " / " + zahl(N) + (j !== z.iter ? (de() ? " · gezeigt " : " · shown ") + zahl(j) : "")],
        [{ de: "Segmente · Disruptoren", en: "Segments · disruptors" }, zahl(z.G.n) + " · " + zahl(z.dSeg.length)],
        [{ de: "Σ Nutzungen (konstant)", en: "Σ land use (constant)" }, zahl(K.summe, 1)],
        [{ de: "Me Multiplikatoreffekt", en: "Me multiplier effect" }, zahl(K.me, 3)],
        [{ de: "Ch Systemänderung", en: "Ch system change" }, zahl(K.ch, 3)],
        [{ de: "Ne natürliche Bewegung", en: "Ne natural movement" }, zahl(K.ne, 3)],
        [{ de: "Nutzungen auf Top 10 %", en: "Land use on top 10 %" }, zahl(100 * K.top10, 1) + " %"],
        [{ de: "Nutzungen an Disruptoren", en: "Land use at disruptors" }, z.dSeg.length ? zahl(100 * K.disruptorAnteil, 1) + " %" : "–"]
      ];
    }
  });
})();
