/* Stadtdynamik · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD, FS = Modell.FASSUNGEN;
  const de = () => document.documentElement.lang !== "en";
  const zahl = (v, n = 0) => Number.isFinite(v) ? v.toLocaleString(de() ? "de" : "en", { minimumFractionDigits: n, maximumFractionDigits: n }) : "–";
  const STANDORT = ["raster", "netz"], SD = ["wolfschaf", "stadtsystem"];

  // Farben (in Hell und Dunkel lesbar): Wohnen blau, Arbeit orange, Nahrung/Schafe grün, Wölfe rot
  const farbe = {
    wohnen: F => F.dunkel ? "#7b9cff" : "#3b66e0",
    arbeit: F => F.dunkel ? "#f5a300" : "#d97a00",
    gruen: F => F.dunkel ? "#4cc764" : "#2b8a3e",
    rot: F => F.dunkel ? "#ff6b6b" : "#d63a3f"
  };
  const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mischRgb = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const rgbS = c => `rgb(${c[0]},${c[1]},${c[2]})`;

  /* ---------------------------------------------------------------- Aufteilung der Zeichenfläche */
  const quer = () => window.innerWidth > 900;
  const KOMPR = 0.6, SCHER = 0.35;              // Säulen: Schrägansicht von Südwesten – Tiefe gestaucht und nach rechts versetzt
  /** Maße der Karte (Modelleinheiten): Raster in Zellen, Netz in Metern */
  function karte(z, p) {
    const raster = z.modell === "raster", saeulen = p.darstellung === "saeulen";
    const rand = raster ? 0.35 : 8, hoch = raster ? 2.6 : 70;           // Höhe einer vollen Säule (maxDensity)
    const k = saeulen ? KOMPR : 1, kopf = saeulen ? hoch : 0, sch = saeulen ? SCHER : 0;
    const K = { rand, hoch, k, sch, tiefe: z.h, kopf, w: z.b + z.h * sch + 2 * rand, h: z.h * k + kopf + 2 * rand, ox: rand, oy: rand + kopf };
    // Grundriss → Zeichenfläche (Höhe h nach oben); rueck: Zeichenfläche → Grundriss (auf Höhe 0)
    K.pr = (q, h = 0) => [K.ox + q[0] + (K.tiefe - q[1]) * K.sch, K.oy + q[1] * K.k - h];
    K.rueck = (x, y) => { const gy = (y - K.oy) / K.k; return [x - K.ox - (K.tiefe - gy) * K.sch, gy]; };
    return K;
  }
  /** Gesamtlayout: Karte bzw. Flächen + Diagramm(e), auf breiten Bildschirmen nebeneinander */
  function layout(z, p) {
    if (STANDORT.includes(z.modell)) {
      const K = karte(z, p), dw = K.w * (quer() ? 0.62 : 1), dh = quer() ? K.h : K.w * 0.42;
      return quer() ? { K, b: K.w + dw, h: K.h, d: [K.w, 0, dw, dh] } : { K, b: K.w, h: K.h + dh, d: [0, K.h, dw, dh] };
    }
    if (z.modell === "wolfschaf") {
      return quer() ? { b: 170, h: 62, d: [0, 0, 104, 62], ph: [108, 0, 62, 62] } : { b: 100, h: 132, d: [0, 0, 100, 62], ph: [19, 68, 62, 62] };
    }
    const wG = p.wohnGroesse, iG = p.industrieGroesse, aG = p.agrarGroesse, r = 6;
    const fw = wG + iG + 2 * r, fh = wG + aG + 2 * r + 8;
    const dw = quer() ? Math.max(120, fw * 1.1) : fw, dh = quer() ? fh : Math.max(70, fw * 0.6);
    return quer() ? { b: fw + dw, h: Math.max(fh, 80), d: [fw, 0, dw, Math.max(fh, 80)], fl: [r, r] } : { b: fw, h: fh + dh, d: [0, fh, dw, dh], fl: [r, r] };
  }

  /* ---------------------------------------------------------------- Säulen (Extrude) */
  /** Prisma über dem Grundriss poly von Höhe h0 bis h1, Schrägansicht: Bildpunkt = (x, oy + y·k − h) */
  function prisma(ctx, poly, h0, h1, K, oben, seite, linie, lw) {
    const pr = K.pr, blick = [-K.sch, 1];
    const c = Geo.schwerpunkt(poly);
    ctx.lineJoin = "round";
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      let n = [-(b[1] - a[1]), b[0] - a[0]];
      const m = [(a[0] + b[0]) / 2 - c[0], (a[1] + b[1]) / 2 - c[1]];
      if (n[0] * m[0] + n[1] * m[1] < 0) n = [-n[0], -n[1]];
      if (n[0] * blick[0] + n[1] * blick[1] <= 1e-9) continue;    // nur Seiten, die zum Betrachter (Südwesten) zeigen
      Karte.poly(ctx, [pr(a, h0), pr(b, h0), pr(b, h1), pr(a, h1)], seite, linie, lw);
    }
    Karte.poly(ctx, poly.map(q => pr(q, h1)), oben, linie, lw);
  }

  /* ---------------------------------------------------------------- Farbflächen (Custom Preview + Gradient) */
  function flaechenFarbe(z, p, i, F, wert, mn, mx) {
    const d = p.darstellung;
    if (d === "mischung") {
      const s = z.P[i] + z.W[i]; if (!s) return null;
      const c = mischRgb(hexRgb(farbe.wohnen(F)), hexRgb(farbe.arbeit(F)), z.W[i] / s);
      const t = Math.min(1, s / Math.max(1, p.maxDichte));
      return rgbS(mischRgb(F.rgb.flaeche || [0, 0, 0], c, 0.25 + 0.75 * Math.sqrt(t)));
    }
    const v = wert(i);
    return Karte.farbe(mx > mn ? (v - mn) / (mx - mn) : 0, "spektral");        // Gradient: Grenzen = Min und Max der Liste
  }
  const wertFn = (z, d) => d === "einwohner" ? i => z.P[i] : d === "arbeit" ? i => z.W[i] : d === "attrWohnen" ? i => z.attP[i] : i => z.attW[i];

  function zeichneKarte(ctx, z, p, F, K) {
    const px = F.px, saeulen = p.darstellung === "saeulen", pr = q => K.pr(q);
    const grund = F.dunkel ? "#2a2a30" : "#e4e4e8", grundLinie = F.dunkel ? "#3c3c44" : "#c9c9d0";
    if (z.modell === "netz") Karte.segmente(ctx, z.strassen.map(s => [pr(s[0]), pr(s[1])]), F.linie, px * (saeulen ? 2 : 3));
    if (saeulen) {
      const ordnung = z.orte.map((o, i) => i).sort((a, b) => z.orte[a].mitte[1] - z.orte[b].mitte[1] || z.orte[b].mitte[0] - z.orte[a].mitte[0]);   // von hinten (Nordosten) nach vorn
      for (const i of ordnung) Karte.poly(ctx, z.orte[i].poly.map(pr), grund, grundLinie, px * 0.6);
      const hk = K.hoch / Math.max(1, p.maxDichte), cW = hexRgb(farbe.wohnen(F)), cA = hexRgb(farbe.arbeit(F));
      const dunkler = c => rgbS(mischRgb(c, [0, 0, 0], F.dunkel ? 0.38 : 0.28)), kante = F.dunkel ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.45)";
      // je Ort zwei Säulen nebeneinander (Grundriss senkrecht durch den Schwerpunkt geteilt): West Einwohner, Ost Arbeitsplätze;
      // die östliche liegt vom Betrachter (Südwesten) aus weiter hinten und wird zuerst gezeichnet
      for (const i of ordnung) {
        const o = z.orte[i], hP = z.P[i] * hk, hW = z.W[i] * hk;
        if (!o.haelften) o.haelften = Geo.teilePolygon(o.poly, Geo.schwerpunkt(o.poly), [0, 1]);
        const [west, ost] = o.haelften;
        if (hW > 0 && ost.length >= 3) prisma(ctx, ost, 0, hW, K, rgbS(cA), dunkler(cA), kante, px * 0.5);
        if (hP > 0 && west.length >= 3) prisma(ctx, west, 0, hP, K, rgbS(cW), dunkler(cW), kante, px * 0.5);
      }
    } else {
      const w = wertFn(z, p.darstellung); let mn = Infinity, mx = -Infinity;
      if (p.darstellung !== "mischung") for (let i = 0; i < z.n; i++) { const v = w(i); if (v < mn) mn = v; if (v > mx) mx = v; }
      z.orte.forEach((o, i) => Karte.poly(ctx, o.poly.map(pr), flaechenFarbe(z, p, i, F, w, mn, mx) || grund, grundLinie, px * 0.6));
    }
    // Startort (RefPoint)
    const r = z.orte[z.ref], c = pr(r.mitte), rr = z.modell === "raster" ? 0.22 : 6;
    Karte.punkt(ctx, [c[0], c[1]], rr, null, F.tinte, px * 1.6);
    Karte.text(ctx, de() ? "Start" : "start", [c[0] + rr + 4 * px, c[1]], F.tinte, px, 10);
  }

  /* ---------------------------------------------------------------- Zeitreihen (Quick Graph) */
  function diagramm(ctx, F, box, reihen, X, titel, rechts) {
    const [x0, y0, w, h] = box, fs = 10 * F.px, l = x0 + fs * 0.6, b = x0 + w - fs * 0.6, o = y0 + fs * 2.4, u = y0 + h - fs * 1.8;
    ctx.save();
    ctx.font = `${fs}px "Geist Mono", ui-monospace, monospace`; ctx.textBaseline = "alphabetic";
    ctx.strokeStyle = F.linie; ctx.lineWidth = F.px;
    ctx.beginPath(); ctx.moveTo(l, o); ctx.lineTo(l, u); ctx.lineTo(b, u); ctx.stroke();
    ctx.setLineDash([2 * F.px, 3 * F.px]); ctx.beginPath(); ctx.moveTo(l, o); ctx.lineTo(b, o); ctx.stroke(); ctx.setLineDash([]);
    const sx = t => l + (b - l) * t / Math.max(1, X);
    for (const r of reihen) {
      const sy = v => u - (u - o) * (r.max > 0 ? v / r.max : 0);
      ctx.strokeStyle = r.farbe; ctx.lineWidth = (r.dick || 1.6) * F.px; ctx.setLineDash(r.strich ? [4 * F.px, 3 * F.px] : []);
      ctx.beginPath(); r.werte.forEach((v, t) => t ? ctx.lineTo(sx(t), sy(v)) : ctx.moveTo(sx(t), sy(v))); ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.fillStyle = F.tinte2; ctx.textAlign = "left"; ctx.fillText(titel, l, y0 + fs * 1.0);
    ctx.fillStyle = F.gedaempft; ctx.fillText(reihen[0] ? zahl(reihen[0].max) : "", l + 3 * F.px, o - 4 * F.px);
    if (rechts) { ctx.textAlign = "right"; ctx.fillText(rechts, b, o - 4 * F.px); }
    ctx.textAlign = "left"; ctx.fillText("0", l, u + fs * 1.3);
    ctx.textAlign = "right"; ctx.fillText((de() ? "Iteration " : "iteration ") + X, b, u + fs * 1.3);
    ctx.restore();
  }
  const spalte = (V, j) => V.map(v => v[j]);
  const maxV = a => a.reduce((m, v) => v > m ? v : m, 0);

  function phasendiagramm(ctx, F, box, z) {
    const [x0, y0, w, h] = box, fs = 10 * F.px, l = x0 + fs * 3.2, b = x0 + w - fs * 0.6, o = y0 + fs * 2.4, u = y0 + h - fs * 1.8;
    const S = spalte(z.verlauf, 0), W = spalte(z.verlauf, 1), mS = maxV(S) || 1, mW = maxV(W) || 1;
    const sx = v => l + (b - l) * v / mS, sy = v => u - (u - o) * v / mW;
    ctx.save(); ctx.font = `${fs}px "Geist Mono", ui-monospace, monospace`;
    ctx.strokeStyle = F.linie; ctx.lineWidth = F.px; ctx.beginPath(); ctx.moveTo(l, o); ctx.lineTo(l, u); ctx.lineTo(b, u); ctx.stroke();
    ctx.strokeStyle = F.tinte2; ctx.lineWidth = 1.2 * F.px; ctx.beginPath();
    S.forEach((s, t) => t ? ctx.lineTo(sx(s), sy(W[t])) : ctx.moveTo(sx(s), sy(W[t]))); ctx.stroke();
    Karte.punkt(ctx, [sx(S[S.length - 1]), sy(W[W.length - 1])], 3 * F.px, F.akzent, F.tinte, F.px);
    ctx.fillStyle = F.tinte2; ctx.textAlign = "left"; ctx.fillText(de() ? "Phasenbild" : "Phase plot", x0, y0 + fs);
    ctx.fillStyle = F.gedaempft; ctx.fillText((de() ? "Wölfe " : "wolves ") + zahl(mW), x0, o - 4 * F.px);
    ctx.textAlign = "right"; ctx.fillText((de() ? "Schafe " : "sheep ") + zahl(mS), b, u + fs * 1.3);
    ctx.restore();
  }

  /** Flächenquadrate des Stadtsystems (Rectangle: CitySize, IndustrySize, AgricultureSize); Füllung = Bestand im Verhältnis zur Fläche */
  function flaechen(ctx, z, p, F, L) {
    const [x0, y0] = L.fl, wG = p.wohnGroesse, iG = p.industrieGroesse, aG = p.agrarGroesse, px = F.px;
    const quad = (x, y, s, voll, c, name, wert) => {
      Karte.poly(ctx, [[x, y], [x + s, y], [x + s, y + s], [x, y + s]], F.dunkel ? "#202026" : "#f1f1f4", F.linie, px);
      const t = Math.max(0, Math.min(1, voll)), hh = s * t;
      if (hh > 0) Karte.poly(ctx, [[x, y + s - hh], [x + s, y + s - hh], [x + s, y + s], [x, y + s]], c, null);
      Karte.text(ctx, name, [x + 3 * px, y + 9 * px], F.tinte, px, 10);
      Karte.text(ctx, wert, [x + 3 * px, y + 22 * px], F.tinte2, px, 10);
    };
    // Lage wie in Rhino: Industrie rechts neben der Wohnfläche (Move X = CitySize), Landwirtschaft darunter (Move Y = −AgricultureSize)
    quad(x0, y0, wG, z.P / (wG * wG), farbe.wohnen(F), de() ? "Wohnen" : "Residential", (de() ? "P " : "P ") + zahl(z.P));
    quad(x0 + wG, y0 + wG - iG, iG, z.J * p.jobDichteEff / (iG * iG), farbe.arbeit(F), de() ? "Industrie" : "Industry", "J " + zahl(z.J));
    quad(x0, y0 + wG, aG, z.F / (aG * aG), farbe.gruen(F), de() ? "Landwirtschaft" : "Agriculture", "F " + zahl(z.F));
    Karte.text(ctx, de() ? "Füllung: P/Fläche · J·JobDenseEff/Fläche · F/Fläche" : "Fill: P/area · J·JobDenseEff/area · F/area",
               [x0, y0 + wG + aG + 6 * px], F.gedaempft, px, 9);
  }

  /* ---------------------------------------------------------------- Parameter */
  const G = {
    modell: { de: "Modell", en: "Model" },
    wachs: { de: "Wachstum (C#_Grow&Move)", en: "Growth (C#_Grow&Move)" },
    pp: { de: "Wohnen ← Wohnen (Population)", en: "Residents ← residents" },
    pw: { de: "Wohnen ← Arbeit (Population–Work)", en: "Residents ← workplaces" },
    wp: { de: "Arbeit ← Wohnen (Work–Population)", en: "Workplaces ← residents" },
    ww: { de: "Arbeit ← Arbeit (Work–Work)", en: "Workplaces ← workplaces" },
    netz: { de: "Netzstadt (CityGraph, Parcels)", en: "Net city (CityGraph, Parcels)" },
    ws: { de: "Wolf-Schaf (System Dynamics)", en: "Wolf–sheep (system dynamics)" },
    ss: { de: "Stadtsystem (Urban Dynamics Model)", en: "Urban system (urban dynamics model)" },
    darst: { de: "Darstellung (Visualizations)", en: "Display (visualizations)" }
  };
  const ARTEN = [{ wert: "sucht", name: { de: "sucht Nähe: p", en: "seeks proximity: p" } }, { wert: "meidet", name: { de: "meidet Nähe: 1 − p", en: "avoids proximity: 1 − p" } }];
  const beziehung = b => [
    { id: b + "Art", gruppe: G[b], nur: STANDORT, art: "auswahl", name: { de: "Art", en: "Kind" }, optionen: ARTEN, wert: S[b + "Art"] },
    { id: b + "Exp", gruppe: G[b], nur: STANDORT, name: { de: "Exponent a in (1 − d)^a", en: "Exponent a in (1 − d)^a" }, min: 0, max: 10, schritt: 0.5, wert: S[b + "Exp"] },
    { id: b + "Schwelle", gruppe: G[b], nur: STANDORT, name: { de: "Schwelle (p darunter → 0)", en: "Threshold (p below → 0)" }, min: 0, max: 1, schritt: 0.01, wert: S[b + "Schwelle"] },
    { id: b + "Gewicht", gruppe: G[b], nur: STANDORT, name: { de: "Gewicht (weightImport)", en: "Weight (weightImport)" }, min: 0, max: 1, schritt: 0.05, wert: S[b + "Gewicht"] }
  ];
  const PARAM = [
    { id: "modell", gruppe: G.modell, art: "auswahl", neustart: true, groesseNeu: true, name: { de: "Modell", en: "Model" }, wert: S.modell, folgen: FS,
      optionen: [{ wert: "raster", name: { de: "3 · Rasterstadt 12 × 8 (Grid City)", en: "3 · Grid city 12 × 8" } },
                 { wert: "netz", name: { de: "4 · Netzstadt (Net City)", en: "4 · Net city" } },
                 { wert: "wolfschaf", name: { de: "1 · Wolf-Schaf (Wolves Sheep)", en: "1 · Wolves and sheep" } },
                 { wert: "stadtsystem", name: { de: "2 · Stadtsystem P/J/F (Abstract Urban Dynamics)", en: "2 · Urban system P/J/F (abstract urban dynamics)" } }] },
    { id: "iterationen", gruppe: G.modell, name: { de: "Iterationen (Repeat)", en: "Iterations (repeat)" }, min: 0, max: 1000, schritt: 1, wert: S.iterationen },
    { id: "neuWohnen", gruppe: G.wachs, nur: STANDORT, name: { de: "neue Einwohner je Iteration (newPop)", en: "New residents per iteration (newPop)" }, min: 0, max: 200, schritt: 1, wert: S.neuWohnen },
    { id: "neuArbeit", gruppe: G.wachs, nur: STANDORT, name: { de: "neue Arbeitsplätze je Iteration (newWork)", en: "New workplaces per iteration (newWork)" }, min: 0, max: 200, schritt: 1, wert: S.neuArbeit },
    { id: "maxDichte", gruppe: G.wachs, nur: STANDORT, name: { de: "Kapazität je Ort (maxDensity)", en: "Capacity per location (maxDensity)" }, min: 0, max: 100, schritt: 1, wert: S.maxDichte },
    ...beziehung("pp"), ...beziehung("pw"), ...beziehung("wp"), ...beziehung("ww"),
    { id: "laengeKoeff", gruppe: G.netz, nur: ["netz"], name: { de: "Längenkoeffizient (Length Coefficient)", en: "Length coefficient" }, min: 0, max: 1, schritt: 0.05, wert: S.laengeKoeff },
    { id: "winkelKoeff", gruppe: G.netz, nur: ["netz"], name: { de: "Winkelkoeffizient (Angular Coefficient)", en: "Angular coefficient" }, min: 0, max: 1, schritt: 0.05, wert: S.winkelKoeff },
    { id: "parzellenBreite", gruppe: G.netz, nur: ["netz"], neustart: true, name: { de: "Parzellenbreite m (PlotWidthThreshold)", en: "Plot width m (PlotWidthThreshold)" }, min: 15, max: 60, schritt: 1, wert: S.parzellenBreite },
    { id: "schafe0", gruppe: G.ws, nur: ["wolfschaf"], neustart: true, name: { de: "Schafe am Anfang (Initial Sheep Stock)", en: "Initial sheep stock" }, min: 0, max: 1000, schritt: 1, wert: S.schafe0 },
    { id: "woelfe0", gruppe: G.ws, nur: ["wolfschaf"], neustart: true, name: { de: "Wölfe am Anfang (Initial Wolves Stock)", en: "Initial wolves stock" }, min: 0, max: 100, schritt: 1, wert: S.woelfe0 },
    { id: "geburtSchafe", gruppe: G.ws, nur: ["wolfschaf"], name: { de: "Geburtenrate Schafe (Sheep Birth Rate)", en: "Sheep birth rate" }, min: 0, max: 0.1, schritt: 0.01, wert: S.geburtSchafe },
    { id: "rissRate", gruppe: G.ws, nur: ["wolfschaf"], name: { de: "Rissrate (Predation Rate)", en: "Predation rate" }, min: 0, max: 0.001, schritt: 0.0001, wert: S.rissRate },
    { id: "effizienz", gruppe: G.ws, nur: ["wolfschaf"], name: { de: "Effizienz der Wölfe (Predator Efficiency)", en: "Predator efficiency" }, min: 0, max: 2, schritt: 0.1, wert: S.effizienz },
    { id: "sterbeWoelfe", gruppe: G.ws, nur: ["wolfschaf"], name: { de: "Sterberate Wölfe (WolfDeathRate)", en: "Wolf death rate" }, min: 0, max: 1, schritt: 0.01, wert: S.sterbeWoelfe },
    { id: "p0", gruppe: G.ss, nur: ["stadtsystem"], neustart: true, name: { de: "Bevölkerung am Anfang (Initial Population)", en: "Initial population" }, min: 0, max: 1000, schritt: 1, wert: S.p0 },
    { id: "j0", gruppe: G.ss, nur: ["stadtsystem"], neustart: true, name: { de: "Arbeitsplätze am Anfang (Initial Jobs)", en: "Initial jobs" }, min: 0, max: 100, schritt: 1, wert: S.j0 },
    { id: "f0", gruppe: G.ss, nur: ["stadtsystem"], neustart: true, name: { de: "Nahrung am Anfang (Initial Food)", en: "Initial food" }, min: 0, max: 100, schritt: 1, wert: S.f0 },
    { id: "wohnGroesse", gruppe: G.ss, nur: ["stadtsystem"], groesseNeu: true, name: { de: "Seite Wohnfläche (CitySize)", en: "Residential area side (CitySize)" }, min: 1, max: 100, schritt: 1, wert: S.wohnGroesse },
    { id: "industrieGroesse", gruppe: G.ss, nur: ["stadtsystem"], groesseNeu: true, name: { de: "Seite Industriefläche (IndustrySize)", en: "Industrial area side (IndustrySize)" }, min: 1, max: 100, schritt: 1, wert: S.industrieGroesse },
    { id: "agrarGroesse", gruppe: G.ss, nur: ["stadtsystem"], groesseNeu: true, name: { de: "Seite Agrarfläche (AgricultureSize)", en: "Agricultural area side (AgricultureSize)" }, min: 1, max: 100, schritt: 1, wert: S.agrarGroesse },
    { id: "dichteGewicht", gruppe: G.ss, nur: ["stadtsystem"], name: { de: "Dichtegewicht (DensityWeight)", en: "Density weight" }, min: 0.01, max: 1, schritt: 0.01, wert: S.dichteGewicht },
    { id: "jobDichteEff", gruppe: G.ss, nur: ["stadtsystem"], name: { de: "Fläche je Arbeitsplatz (JobDenseEff)", en: "Area per job (JobDenseEff)" }, min: 0, max: 1, schritt: 0.01, wert: S.jobDichteEff },
    { id: "darstellung", gruppe: G.darst, nur: STANDORT, art: "auswahl", groesseNeu: true, name: { de: "Darstellung", en: "Display" }, wert: S.darstellung,
      optionen: [{ wert: "saeulen", name: { de: "Säulen: Einwohner und Arbeitsplätze", en: "Columns: residents and workplaces" } },
                 { wert: "mischung", name: { de: "Farbflächen: Mischung", en: "Colour areas: mix" } },
                 { wert: "einwohner", name: { de: "Farbflächen: Einwohner", en: "Colour areas: residents" } },
                 { wert: "arbeit", name: { de: "Farbflächen: Arbeitsplätze", en: "Colour areas: workplaces" } },
                 { wert: "attrWohnen", name: { de: "Farbflächen: Attraktivität Wohnen", en: "Colour areas: attractivity residents" } },
                 { wert: "attrArbeit", name: { de: "Farbflächen: Attraktivität Arbeit", en: "Colour areas: attractivity workplaces" } }] }
  ];

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 20, wert: 1 },
    parameter: PARAM,
    groesse: (z, p) => { const L = layout(z, p); return { b: L.b, h: L.h }; },
    ende: (z, p) => Modell.fertig(z, p),
    klick(z, p, x, y) {
      if (!STANDORT.includes(z.modell)) return;
      const K = layout(z, p).K;
      if (x > K.w || y > K.h) return;
      Modell.setzeStart(z, p, K.rueck(x, y));
    },
    zeichne(ctx, z, p, F) {
      const L = layout(z, p), X = Math.max(p.iterationen, z.t, 1);
      if (STANDORT.includes(z.modell)) {
        zeichneKarte(ctx, z, p, F, L.K);
        // Zeitreihen des C#_Recorder (Population, Workplaces) und – gestrichelt, eigene Skala – Verkehr je Einwohner (EstimTripDist / Σ P)
        const V = z.verlauf, P = spalte(V, 0), W = spalte(V, 1), T = V.map(v => v[0] ? v[2] / v[0] : 0), m = Math.max(maxV(P), maxV(W));
        const e = z.modell === "raster" ? "" : " m";
        diagramm(ctx, F, L.d, [{ werte: P, max: m, farbe: farbe.wohnen(F), dick: 3 }, { werte: W, max: m, farbe: farbe.arbeit(F) }, { werte: T, max: maxV(T), farbe: F.tinte2, strich: true }],
                 X, de() ? "Einwohner, Arbeitsplätze · Weg je Einwohner (gestrichelt)" : "Residents, workplaces · trip per resident (dashed)",
                 (de() ? "Weg " : "trip ") + zahl(maxV(T), 1) + e);
      } else if (z.modell === "wolfschaf") {
        const S_ = spalte(z.verlauf, 0), W = spalte(z.verlauf, 1), m = Math.max(maxV(S_), maxV(W));
        diagramm(ctx, F, L.d, [{ werte: S_, max: m, farbe: farbe.gruen(F) }, { werte: W, max: m, farbe: farbe.rot(F) }], X, de() ? "Bestände: Schafe, Wölfe" : "Stocks: sheep, wolves");
        phasendiagramm(ctx, F, L.ph, z);
      } else {
        flaechen(ctx, z, p, F, L);
        const P = spalte(z.verlauf, 0), J = spalte(z.verlauf, 1), Fo = spalte(z.verlauf, 2), m = Math.max(maxV(P), maxV(J), maxV(Fo));
        diagramm(ctx, F, L.d, [{ werte: P, max: m, farbe: farbe.wohnen(F) }, { werte: J, max: m, farbe: farbe.arbeit(F) }, { werte: Fo, max: m, farbe: farbe.gruen(F) }],
                 X, de() ? "Bestände: Bevölkerung, Arbeitsplätze, Nahrung" : "Stocks: population, jobs, food");
      }
    },
    legende(F, p, z) {
      const m = z ? z.modell : p.modell;
      if (m === "wolfschaf") return [[farbe.gruen(F), { de: "Schafe", en: "Sheep" }], [farbe.rot(F), { de: "Wölfe", en: "Wolves" }]];
      if (m === "stadtsystem") return [[farbe.wohnen(F), { de: "Bevölkerung P", en: "Population P" }], [farbe.arbeit(F), { de: "Arbeitsplätze J", en: "Jobs J" }], [farbe.gruen(F), { de: "Nahrung F", en: "Food F" }]];
      const L = [[farbe.wohnen(F), { de: "Einwohner", en: "Residents" }], [farbe.arbeit(F), { de: "Arbeitsplätze", en: "Workplaces" }], [F.tinte2, { de: "Weg je Einwohner", en: "Trip per resident" }]];
      if (!["saeulen", "mischung"].includes(p.darstellung)) L.push(...Karte.skalenLegende("spektral", { de: "wenig", en: "low" }, { de: "viel", en: "high" }));
      return L;
    },
    kennzahlen(z, p) {
      if (z.modell === "wolfschaf") {
        return [[{ de: "Schafe", en: "Sheep" }, zahl(z.S, 1)], [{ de: "Wölfe", en: "Wolves" }, zahl(z.W, 1)],
                [{ de: "Gleichgewicht Schafe = m/(r·e)", en: "Equilibrium sheep = m/(r·e)" }, zahl(p.sterbeWoelfe / (p.rissRate * p.effizienz), 0)],
                [{ de: "Gleichgewicht Wölfe = b/r", en: "Equilibrium wolves = b/r" }, zahl(p.geburtSchafe / p.rissRate, 0)]];
      }
      if (z.modell === "stadtsystem") {
        return [[{ de: "Bevölkerung P", en: "Population P" }, zahl(z.P, 1)], [{ de: "Arbeitsplätze J", en: "Jobs J" }, zahl(z.J, 1)], [{ de: "Nahrung F", en: "Food F" }, zahl(z.F, 1)],
                [{ de: "Dichte P / Wohnfläche", en: "Density P / residential area" }, zahl(z.P / (p.wohnGroesse * p.wohnGroesse), 3)],
                [{ de: "Arbeitsplätze je Einwohner J/P", en: "Jobs per resident J/P" }, zahl(z.J / z.P, 3)]];
      }
      const B = Modell.bilanz(z, p.maxDichte), e = z.modell === "raster" ? (de() ? " Zellen" : " cells") : " m";
      return [[{ de: "Einwohner", en: "Residents" }, zahl(B.einwohner)], [{ de: "Arbeitsplätze", en: "Workplaces" }, zahl(B.arbeit)],
              [{ de: "Verkehr Σ d·P·W/ΣW (EstimTripDist)", en: "Traffic Σ d·P·W/ΣW (EstimTripDist)" }, zahl(B.verkehr)],
              [{ de: "mittlerer Arbeitsweg", en: "Mean commute" }, zahl(B.weg, 2) + e],
              [{ de: "Orte besetzt", en: "Locations occupied" }, `${B.besetzt} / ${z.n}`],
              [{ de: "volle Orte (≥ maxDensity)", en: "Full locations (≥ maxDensity)" }, String(B.voll)],
              [{ de: "dichtester Ort P + W", en: "Densest location P + W" }, zahl(B.max)],
              [{ de: "Abstand zur Mitte: Wohnen / Arbeit", en: "Distance to centre: residents / workplaces" }, zahl(B.zentralP, z.modell === "raster" ? 2 : 0) + " / " + zahl(B.zentralW, z.modell === "raster" ? 2 : 0) + e],
              [{ de: "größte Distanz d_max", en: "Largest distance d_max" }, zahl(z.dmax, z.modell === "raster" ? 0 : 0) + e],
              [{ de: "Fehlversuche Roulette", en: "Failed roulette draws" }, String(z.fehl)]];
    }
  });

  /* ---------------------------------------------------------------- nur die Regler des gewählten Modells zeigen */
  function sichtbarkeit() {
    const m = window.SIM ? window.SIM.param.modell : S.modell;
    PARAM.forEach(d => { const el = document.getElementById("p-" + d.id), zeile = el && el.closest(".zeile"); if (zeile) zeile.style.display = !d.nur || d.nur.includes(m) ? "" : "none"; });
    const block = document.getElementById("b-param"); if (!block) return;
    let kopf = null, sichtbar = false;
    const schliesse = () => { if (kopf) kopf.style.display = sichtbar ? "" : "none"; };
    for (const el of block.children) {
      if (el.classList.contains("gruppe")) { schliesse(); kopf = el; sichtbar = false; }
      else if (el.classList.contains("zeile") && el.style.display !== "none") sichtbar = true;
    }
    schliesse();
  }
  const wahl = document.getElementById("p-modell");
  if (wahl) wahl.addEventListener("change", sichtbarkeit);
  sichtbarkeit();
  // Beschriftungen im Canvas folgen der Sprache; neu zeichnen nach dem Umschalten
  document.querySelectorAll(".sprache").forEach(b => b.addEventListener("click", () => window.SIM && window.SIM.zeichne()));
})();
