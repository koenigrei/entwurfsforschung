/* Nutzungsverteilung · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD, NAMEN = Modell.NAMEN;
  const de = () => document.documentElement.lang !== "en";
  const zahl = (v, n = 0) => Number.isFinite(v) ? v.toLocaleString(de() ? "de" : "en", { minimumFractionDigits: n, maximumFractionDigits: n }) : "–";
  /** Farben der Nutzungen wie in der Legende des Katalogbilds (Residential orange, Commercial rot, Industry violett) */
  const farbeProfil = (i, F) => (F.dunkel ? ["#f6a64a", "#f0605f", "#b48af2"] : ["#ee8f22", "#dc3a3f", "#8a4fd8"])[i];
  // Diagramme: auf breiten Bildschirmen rechts neben dem Plan, sonst darunter (Modelleinheiten = m)
  const RECHTS = 380, UNTEN = 360, LUECKE = 24;
  const quer = () => window.innerWidth > 900;

  /** Parameter je Profil: Max Population, Gewichte der drei Kriterien (die Beziehungen stehen in der Gewichtsmatrix) */
  const profilParameter = (a, i) => {
    const g = { de: NAMEN[i].de + " (" + NAMEN[i].en + ")", en: NAMEN[i].en };
    return [
      { id: "pop" + a, gruppe: g, name: { de: "Max. Bevölkerung/Arbeitsplätze (Max Population)", en: "Max population" }, min: 0, max: 20000, schritt: 100, wert: S["pop" + a] },
      { id: "w" + a + "0", gruppe: g, name: { de: "Gewicht Zentralität (Centrality, Closeness)", en: "Weight centrality (closeness)" }, min: -1, max: 1, schritt: 0.05, wert: S["w" + a + "0"] },
      { id: "w" + a + "1", gruppe: g, name: { de: "Gewicht Erreichbarkeit (Accessibility, Betweeness)", en: "Weight accessibility (betweenness)" }, min: -1, max: 1, schritt: 0.05, wert: S["w" + a + "1"] },
      { id: "w" + a + "2", gruppe: g, name: { de: "Gewicht flache Lage (Flat Area, Slope)", en: "Weight flat area (slope)" }, min: -1, max: 1, schritt: 0.05, wert: S["w" + a + "2"] }
    ];
  };
  const SIMU = { de: "Simulation (Land Use Simulation Iterations)", en: "Simulation (iterations)" };
  const WAHR = { de: "Wahrgenommene Entfernung (Perceived Distance)", en: "Perceived distance" };
  const NETZ = { de: "Straßennetz (2. BuildGraph)", en: "Street network (2. BuildGraph)" };
  const DARST = { de: "Darstellung (Visualisation)", en: "Display (visualisation)" };
  const MATRIX = { de: "Gewichtsmatrix Nutzung × Nutzung (Relations)", en: "Weight matrix land use × land use (relations)" };
  const KURZ = [{ de: "Wohnen", en: "Resid." }, { de: "Gewerbe", en: "Comm." }, { de: "Industrie", en: "Industry" }];
  const zw = t => `<span lang="de">${t.de}</span><span lang="en">${t.en}</span>`;

  /** Gewichtsmatrix als Tabelle: Zeile = Nutzung, Spalte = Bezug (wie wichtig ist die Spalten-Nutzung für die Zeilen-Nutzung?).
      Sie steht statt der (versteckten) Zeile des Parameters „m“ (Text der Matrix, den sim.js in der Adresse speichert), Werte −1…1 in Schritten von 0.05. */
  function matrixTabelle() {
    const sel = document.getElementById("p-m"); if (!sel) return;
    const zeile = sel.closest(".zeile");
    const box = document.createElement("div"); box.className = "matrix";
    const kopf = `<tr><th class="mono"><span lang="de">Nutzung ↓ · Bezug →</span><span lang="en">use ↓ · relation to →</span></th>${KURZ.map(k => `<th class="mono">${zw(k)}</th>`).join("")}</tr>`;
    const zeilen = [0, 1, 2].map(i => `<tr><th>${zw(KURZ[i])}</th>${[0, 1, 2].map(n => `<td><input type="number" min="-1" max="1" step="${Modell.RASTER_MATRIX}" data-i="${i}" data-n="${n}" aria-label="${NAMEN[i].de} → ${NAMEN[n].de}"></td>`).join("")}</tr>`).join("");
    box.innerHTML = `<table>${kopf}${zeilen}</table><div class="knoepfe"><button class="knopf" type="button" id="m-zurueck">${zw({ de: "Zurücksetzen (Original)", en: "Reset (original)" })}</button></div>`;
    zeile.after(box); zeile.hidden = true; zeile.style.display = "none";   // Auswahlliste bleibt (unsichtbar) für sim.js (Sprache, Adresse)
    const felder = [...box.querySelectorAll("input")];
    const zeige = () => { const M = Modell.matrixAusText(SIM.param.m); felder.forEach(f => { const v = M[+f.dataset.i][+f.dataset.n]; f.value = v; f.dataset.vz = v > 0 ? "plus" : v < 0 ? "minus" : "null"; }); };
    felder.forEach(f => f.addEventListener("change", () => { SIM.setze("m", Modell.setzeMatrix(SIM.param.m, +f.dataset.i, +f.dataset.n, f.value)); zeige(); }));
    box.querySelector("#m-zurueck").addEventListener("click", () => { SIM.setze("m", S.m); zeige(); });
    zeige();
    // Gestaltung der Tabelle (nur Farben aus sim.css-Variablen)
    const st = document.createElement("style");
    st.textContent = `.matrix table { width: 100%; border-collapse: collapse; margin: 4px 0 6px; table-layout: fixed; }
      .matrix th { font-weight: 400; font-size: 11px; color: var(--ink-2); text-align: left; padding: 3px 2px; overflow-wrap: anywhere; }
      .matrix tr:first-child th { color: var(--muted); }
      .matrix tr:first-child th:first-child { font-size: 9px; }
      .matrix td { padding: 2px; }
      .matrix input { width: 100%; box-sizing: border-box; background: var(--paper); color: var(--ink); border: 1px solid var(--line); border-radius: 6px; padding: 3px 4px; font-family: var(--mono); font-size: 12px; }
      .matrix input[data-vz="plus"] { border-color: #3b9d5d; } .matrix input[data-vz="minus"] { border-color: #d9534f; }`;
    document.head.appendChild(st);
  }

  /** Kreisdiagramm einer Parzelle (Arc mit Consecutive Domains der Anteile, Radius √(Fläche · Radius Factor / π)) */
  function torte(ctx, z, j, r, F) {
    const q = z.parz[j].mitte, D = z.D, tot = D[0][j] + D[1][j] + D[2][j];
    if (!tot) return;
    let a = -Math.PI / 2;
    for (let i = 0; i < 3; i++) {
      const w = D[i][j] / tot * 2 * Math.PI; if (w <= 0) continue;
      ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.arc(q[0], q[1], r, a, a + w); ctx.closePath();
      ctx.fillStyle = farbeProfil(i, F); ctx.fill(); a += w;
    }
    ctx.beginPath(); ctx.arc(q[0], q[1], r, 0, 2 * Math.PI); ctx.strokeStyle = F.papier; ctx.lineWidth = F.px * 0.8; ctx.stroke();
  }

  /** Kurve einer Liste in einem Kasten */
  function diagramme(ctx, z, p, F, x0, y0, w, h, nebeneinander) {
    const fs = 10 * F.px, gap = nebeneinander ? 30 : 34;
    const boxen = nebeneinander ? [[x0, y0, (w - gap) / 2, h], [x0 + (w + gap) / 2, y0, (w - gap) / 2, h]]
                                : [[x0, y0, w, (h - gap) / 2], [x0, y0 + (h + gap) / 2, w, (h - gap) / 2]];
    ctx.save();
    ctx.font = `${fs}px "Geist Mono", ui-monospace, monospace`; ctx.textBaseline = "alphabetic";
    const rahmen = ([l, o, bw, bh], titel, xl, xr, yo) => {
      const ob = o + fs * 2.2, u = o + bh - fs * 1.5;
      ctx.strokeStyle = F.linie; ctx.lineWidth = F.px; ctx.beginPath(); ctx.moveTo(l, ob); ctx.lineTo(l, u); ctx.lineTo(l + bw, u); ctx.stroke();
      ctx.setLineDash([2 * F.px, 3 * F.px]); ctx.beginPath(); ctx.moveTo(l, ob); ctx.lineTo(l + bw, ob); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = F.tinte2; ctx.textAlign = "left"; ctx.fillText(titel, l, o + fs * 0.9);
      ctx.fillStyle = F.gedaempft; ctx.fillText(yo, l + 3 * F.px, ob - 3 * F.px);
      ctx.fillText(xl, l, u + fs * 1.2); ctx.textAlign = "right"; ctx.fillText(xr, l + bw, u + fs * 1.2);
      return { l, ob, u, bw, hh: u - ob };
    };
    // 1. Wahrnehmungsfunktion (Quick Graph über Range 0…1, 100 Schritte)
    {
      const R = rahmen(boxen[0], nebeneinander ? (de() ? "Wahrnehmung f(dist)" : "Perception f(dist)") : (de() ? "Wahrnehmung: " : "Perception: ") + Modell.formel(p), "dist 0", "1", "1");
      ctx.strokeStyle = F.dunkel ? "#9d9bff" : F.akzent; ctx.lineWidth = 1.8 * F.px; ctx.beginPath();
      for (let k = 0; k <= 100; k++) { const d = k / 100, x = R.l + R.bw * d, y = R.u - R.hh * Modell.wahrnehmung(d, p); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
    }
    // 2. Verlauf (C#_Recorder): Summe je Profil in % der Max Population, Wegeschätzung / gleichmäßige Verteilung (gestrichelt)
    {
      const X = Math.max(1, Math.round(p.iterationen)), V = z.verlauf;
      const R = rahmen(boxen[1], nebeneinander ? (de() ? "Verlauf" : "Progress") : (de() ? "Verlauf je Iteration" : "Progress per iteration"), "0", String(X), "100 %");
      const sx = t => R.l + R.bw * Math.min(1, t / X), sy = v => R.u - R.hh * Math.max(0, Math.min(1.05, v));
      const linie = (farbe, wert, strich) => {
        ctx.strokeStyle = farbe; ctx.lineWidth = 1.6 * F.px; ctx.setLineDash(strich || []); ctx.beginPath();
        V.forEach((v, t) => { const x = sx(t), y = sy(wert(v)); t ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
        ctx.stroke(); ctx.setLineDash([]);
      };
      for (let i = 0; i < 3; i++) if (z.pr.maxPop[i] > 0) linie(farbeProfil(i, F), v => v.summe[i] / z.pr.maxPop[i]);
      linie(F.tinte2, v => v.gleich > 0 ? v.wege / v.gleich : 0, [4 * F.px, 3 * F.px]);
      ctx.fillStyle = F.gedaempft; ctx.textAlign = "right";
      ctx.fillText(nebeneinander ? (de() ? "--- Wege" : "--- trips") : (de() ? "gestrichelt: Wege / gleichmäßig" : "dashed: trips / equal"), R.l + R.bw, R.ob - 3 * F.px);
    }
    ctx.restore();
  }

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 10, wert: 1 },
    parameter: [
      { id: "iterationen", gruppe: SIMU, name: { de: "Iterationen (Iterations)", en: "Iterations" }, min: 0, max: 1000, schritt: 1, wert: S.iterationen },
      { id: "leer", gruppe: SIMU, name: { de: "Anteil frei (Percent Cells not filled)", en: "Percent cells not filled" }, min: 0, max: 0.9, schritt: 0.1, wert: S.leer },
      { id: "det", gruppe: SIMU, art: "schalter", name: { de: "deterministisch (deterministic)", en: "Deterministic" }, wert: S.det },
      ...Modell.PROFILE.flatMap(profilParameter),
      { id: "m", gruppe: MATRIX, art: "auswahl", name: { de: "Matrix", en: "Matrix" }, wert: S.m, optionen: [{ wert: S.m, name: S.m }] },
      { id: "funktion", gruppe: WAHR, art: "auswahl", name: { de: "Funktion (Perceived Distance Function)", en: "Perceived distance function" }, wert: S.funktion,
        optionen: [{ wert: "linear", name: { de: "Linear", en: "Linear" } }, { wert: "exponential", name: { de: "Exponentiell (Exponential)", en: "Exponential" } }] },
      { id: "wichtig", gruppe: WAHR, art: "auswahl", name: { de: "Wichtig ist (Distance Importance)", en: "Distance importance" }, wert: S.wichtig,
        optionen: [{ wert: "close", name: { de: "Nähe (Close)", en: "Close" } }, { wert: "far", name: { de: "Ferne (Far)", en: "Far" } }] },
      { id: "falloff", gruppe: WAHR, name: { de: "Schwelle (Falloff Value)", en: "Falloff value" }, min: 0, max: 1, schritt: 0.1, wert: S.falloff },
      { id: "exponent", gruppe: WAHR, name: { de: "Exponent (Exponent)", en: "Exponent" }, min: 2, max: 6, schritt: 0.1, wert: S.exponent },
      { id: "kL", gruppe: NETZ, name: { de: "Längenkoeffizient (Length Coefficient)", en: "Length coefficient" }, min: 0, max: 1, schritt: 0.05, wert: S.kL },
      { id: "kW", gruppe: NETZ, name: { de: "Winkelkoeffizient (Angular Coefficient)", en: "Angular coefficient" }, min: 0, max: 1, schritt: 0.05, wert: S.kW },
      { id: "kH", gruppe: NETZ, name: { de: "Hierarchiegewicht (Hierarchy Weighting)", en: "Hierarchy weighting" }, min: 0, max: 1, schritt: 0.1, wert: S.kH },
      { id: "variante", gruppe: NETZ, art: "auswahl", name: { de: "Abstände (Variant)", en: "Distances (variant)" }, wert: S.variante,
        optionen: [{ wert: "direkt", name: { de: "Luftlinie (Simplified Direct Distance)", en: "Simplified direct distance" } },
                   { wert: "netz", name: { de: "Netzdistanz (Precise Distance)", en: "Precise (network) distance" } }] },
      { id: "darstellung", gruppe: DARST, art: "auswahl", name: { de: "Zeigen (Visualisation)", en: "Show (visualisation)" }, wert: S.darstellung,
        optionen: [{ wert: "verteilung", name: { de: "Nutzungsverteilung (Profile Distribution)", en: "Profile distribution" } },
                   { wert: "attraktivitaet", name: { de: "Attraktivität (Plot Attractivity)", en: "Plot attractivity" } },
                   { wert: "gewichtet", name: { de: "Gewichtete Werte (Weighted Values)", en: "Weighted values" } },
                   { wert: "k0", name: { de: "Zentralität (Closeness)", en: "Centrality (closeness)" } },
                   { wert: "k1", name: { de: "Erreichbarkeit (Betweenness)", en: "Accessibility (betweenness)" } },
                   { wert: "k2", name: { de: "Flache Lage (Slope)", en: "Flat area (slope)" } }] },
      { id: "profil", gruppe: DARST, name: { de: "Profil (Proifle)", en: "Profile" }, min: 0, max: 2, schritt: 1, wert: S.profil,
        format: v => (de() ? NAMEN[v].de : NAMEN[v].en) },
      { id: "radius", gruppe: DARST, name: { de: "Kreisgröße (Radius Factor)", en: "Radius factor" }, min: 0, max: 1, schritt: 0.1, wert: S.radius },
      { id: "gelaende", gruppe: DARST, art: "schalter", name: { de: "Gelände zeigen", en: "Show terrain" }, wert: S.gelaende },
      { id: "diagramme", gruppe: DARST, art: "schalter", name: { de: "Diagramme zeigen", en: "Show charts" }, wert: S.diagramme, groesseNeu: true }
    ],
    groesse: (z, p) => !p.diagramme ? { b: z.b, h: z.h } : quer() ? { b: z.b + LUECKE + RECHTS, h: z.h } : { b: z.b, h: z.h + LUECKE + UNTEN },
    klick(z, p, x, y, taste, phase) {
      if (phase !== "unten") return;
      z.auswahl = taste === "rechts" ? -1 : Modell.parzelleBei(z, [x, y]);
    },
    ende: (z, p) => Modell.fertig(z, p),
    zeichne(ctx, z, p, F) {
      const px = F.px, nP = z.parz.length, pr = Math.round(p.profil), art = p.darstellung;
      // Hintergrund: Gelände (Schummerung, Höhenlinien) auf die Fläche des Plans beschränkt
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, z.b, z.h); ctx.clip();
      if (p.gelaende) { Karte.gelaende(ctx, z.sz.G, F, { hoehenlinien: 5 }); ctx.globalAlpha = 0.45; ctx.fillStyle = F.flaeche; ctx.fillRect(0, 0, z.b, z.h); ctx.globalAlpha = 1; }
      else { ctx.fillStyle = F.flaeche; ctx.fillRect(0, 0, z.b, z.h); }
      // Parzellen
      const mxA = Math.max(1e-12, ...z.att[pr]);              // Attraktivität kann nach (x − min)/max über 1 liegen → für die Farbe auf 0…1
      const wert = art === "attraktivitaet" ? z.att[pr].map(v => v / mxA) : art === "gewichtet" ? z.W[pr] : art[0] === "k" ? z.V[+art[1]] : null;
      const skala = art === "attraktivitaet" ? "gelbrot" : "spektral";
      for (let j = 0; j < nP; j++) {
        const q = z.parz[j];
        if (wert) Karte.poly(ctx, q.poly, Karte.farbe(wert[j], skala, 0.9), F.papier, px * 0.8);
        else {
          const tot = z.D[0][j] + z.D[1][j] + z.D[2][j], f = Math.min(1, tot / Math.max(1e-9, z.dichte[j]));
          Karte.poly(ctx, q.poly, F.dunkel ? `rgba(235,235,240,${0.08 + 0.32 * f})` : `rgba(40,40,52,${0.06 + 0.26 * f})`, F.dunkel ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.22)", px * 0.8);
        }
      }
      // Straßen: Hauptstraßen breiter; bei Netzkennwerten nach Wert gefärbt
      const N = z.netz.N, Kn = z.netz.hier;
      let sw = null;
      if (art === "k0" || art === "k1") {
        const roh = Array.from(art === "k0" ? z.K.cc : z.K.bc, v => art === "k1" ? (v > 0 ? Math.log(v) : NaN) : (v > 0 ? v : NaN));
        const ok = roh.filter(Number.isFinite), mn = Math.min(...ok), mx = Math.max(...ok);
        sw = roh.map(v => Number.isFinite(v) && mx > mn ? (v - mn) / (mx - mn) : -1);
      }
      ctx.lineCap = "round";
      N.kanten.forEach((e, k) => {
        const a = N.knoten[e.a], b = N.knoten[e.b];
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
        ctx.strokeStyle = sw && sw[k] >= 0 ? Karte.farbe(sw[k], "spektral") : (F.dunkel ? "#8a8a94" : "#6d6d78");
        ctx.lineWidth = px * (Kn[k] === 1 ? 2.8 : 1.4); ctx.stroke();
      });
      // Kreisdiagramme der Nutzungen
      if (art === "verteilung" || art === "attraktivitaet" || art === "gewichtet") {
        for (let j = 0; j < nP; j++) torte(ctx, z, j, Math.sqrt(z.parz[j].flaeche * p.radius * (art === "verteilung" ? 1 : 0.35) / Math.PI), F);
      }
      // ausgewählte Parzelle und ihr Straßensegment
      if (z.auswahl >= 0) {
        const j = z.auswahl, e = N.kanten[z.seg[j]];
        Karte.poly(ctx, z.parz[j].poly, null, F.akzent, px * 2.5);
        if (e) Karte.linie(ctx, [N.knoten[e.a], N.knoten[e.b]], F.akzent, px * 4);
      }
      if (z.t === 0 && z.iter === 0) {
        const lang = de() ? "Erste Verteilung – Start verteilt die Nutzungen, eine Iteration je Schritt" : "First distribution – Start distributes the land uses, one iteration per step";
        const kurz = de() ? "Start: eine Iteration je Schritt" : "Start: one iteration per step";
        Karte.text(ctx, lang.length * 7.4 < z.b / px - 24 ? lang : kurz, [z.b / 2, z.h - 14 * px], F.tinte, px, 12, "center");
      }
      ctx.restore();
      if (p.diagramme) {
        if (quer()) diagramme(ctx, z, p, F, z.b + LUECKE, 4, RECHTS, z.h - 8, false);
        else diagramme(ctx, z, p, F, 0, z.h + LUECKE, z.b, UNTEN, true);
      }
    },
    legende(F, p) {
      const art = p.darstellung, pr = Math.round(p.profil), n = de() ? NAMEN[pr].de : NAMEN[pr].en;
      const L = [0, 1, 2].map(i => [farbeProfil(i, F), NAMEN[i]]);
      if (art === "attraktivitaet") return L.concat(Karte.skalenLegende("gelbrot", { de: "Attraktivität " + n + " gering", en: "attractivity " + n + " low" }, { de: "hoch", en: "high" }));
      if (art === "gewichtet") return L.concat(Karte.skalenLegende("spektral", { de: "gewichteter Wert " + n + " gering", en: "weighted value " + n + " low" }, { de: "hoch", en: "high" }));
      if (art[0] === "k") return Karte.skalenLegende("spektral", Modell.KRITERIEN[+art[1]], { de: "hoch", en: "high" });
      return L.concat([[F.dunkel ? "rgba(235,235,240,0.4)" : "rgba(40,40,52,0.32)", { de: "Parzelle voll (maxDensity)", en: "plot full (maxDensity)" }]]);
    },
    kennzahlen(z, p) {
      const b = Modell.bilanz(z), it = Math.round(p.iterationen);
      const zeile = i => zahl(b.summe[i]) + " / " + zahl(z.pr.maxPop[i]) + " · " + zahl(b.parzellen[i]) + (de() ? " Parz. · " : " plots · ") + zahl(b.flaeche[i] / 10000, 1) + " ha";
      const K = [
        [{ de: "Iteration", en: "Iteration" }, zahl(z.iter) + " / " + zahl(it)],
        [{ de: "Parz. · Segm.", en: "Plots · segm." }, zahl(z.parz.length) + " · " + zahl(z.netz.G.n)],
        [{ de: "Je Iteration R|C|I", en: "Per iteration R|C|I" }, z.add.map(v => zahl(v)).join(" | ")],
        [NAMEN[0], zeile(0)], [NAMEN[1], zeile(1)], [NAMEN[2], zeile(2)],
        [{ de: "Zentralität R|C|I", en: "Centrality R|C|I" }, b.zentral.map(v => zahl(v, 2)).join(" | ")],
        [{ de: "Voll · gemischt", en: "Full · mixed" }, zahl(b.voll) + " · " + zahl(b.gemischt)],
        [{ de: "Verfallen", en: "Dropped" }, zahl(z.verfallen[0] + z.verfallen[1] + z.verfallen[2])],
        [{ de: "Wege / gleichmäßig", en: "Trips / equal" }, zahl(b.wege) + " / " + zahl(b.gleich) + " · " + zahl(100 * b.verhaeltnis) + " %"],
        [{ de: "Wahrnehmung", en: "Perception" }, Modell.formel(p)]
      ];
      if (z.auswahl >= 0) {
        const j = z.auswahl, q = z.parz[j];
        K.push([{ de: "Parzelle " + (j + 1), en: "Plot " + (j + 1) }, zahl(q.flaeche) + " m² · " + zahl(z.D[0][j] + z.D[1][j] + z.D[2][j]) + " / " + zahl(z.dichte[j])],
               [{ de: "Belegung R|C|I", en: "Units R|C|I" }, z.D.map(a => zahl(a[j])).join(" | ")],
               [{ de: "Kriterien Z|E|F", en: "Criteria C|A|F" }, z.V.map(a => zahl(a[j], 2)).join(" | ")],
               [{ de: "Gewichtet R|C|I", en: "Weighted R|C|I" }, z.W.map(a => zahl(a[j], 2)).join(" | ")],
               [{ de: "Attraktiv. R|C|I", en: "Attract. R|C|I" }, z.att.map(a => zahl(a[j], 2)).join(" | ")]);
      }
      return K;
    }
  });
  matrixTabelle();
})();
