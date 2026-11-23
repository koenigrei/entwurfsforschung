/* Magnetischer Grundrissgenerator · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD, B = Modell.BEISPIELE, ROT = "#e5484d";
  const en = () => document.documentElement.lang === "en";
  const zahl = (v, n = 0) => v.toLocaleString(en() ? "en" : "de", { minimumFractionDigits: n, maximumFractionDigits: n });
  const schmal = () => window.innerWidth < 760;

  /* ---- Farben: je Raum ein Farbton (goldener Winkel), hell und dunkel getrennt abgestimmt */
  function hsl(h, s, l) {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
  }
  const raumRGB = (i, F) => hsl((i * 137.508 + 20) % 360, F.dunkel ? 48 : 62, F.dunkel ? 40 : 74);
  const css = c => `rgb(${c[0]},${c[1]},${c[2]})`;
  const flurRGB = F => F.dunkel ? [74, 74, 82] : [212, 212, 218];
  const sperrRGB = F => F.dunkel ? [34, 34, 38] : [236, 236, 240];
  const mische = (a, b, t) => a.map((v, k) => Math.round(v + (b[k] - v) * t));

  /* ---- Aufteilung der Zeichenfläche: Plan links, rechts Graph und Bestenliste (schmal: untereinander) */
  function aufteilung(z) {
    const W = z.W, H = z.H;
    if (schmal()) {
      const gap = Math.max(1, W * 0.05), gh = W * 0.7, tw = (W - 4 * gap * 0.5) / 5, th = tw * H / W;
      return { b: W, h: H + gap + gh + gap + th + gap * 0.9, graph: [0, H + gap, W, gh], daumen: [0, H + gap + gh + gap * 1.6, W, th], gap };
    }
    const gap = Math.max(1, W * 0.05), P = Math.max(H * 0.9, W * 0.55), gh = H * 0.68;
    const tw = Math.min((P - 4 * gap * 0.5) / 5, (H - gh - gap * 1.6) * W / H), th = tw * H / W;
    return { b: W + gap + P, h: H, graph: [W + gap, 0, P, gh], daumen: [W + gap, H - th, P, th], gap };
  }

  /* ---- Rasterbild einer Lösung */
  function rasterFarben(gitter, z, F, gesperrt) {
    const prog = z.prog, fl = flurRGB(F), sp = sperrRGB(F), farben = prog.raeume.map((r, i) => r.halle ? mische(raumRGB(i, F), fl, 0.55) : raumRGB(i, F));
    const pap = F.rgb.papier || (F.dunkel ? [0, 0, 0] : [255, 255, 255]);
    return (d) => {
      for (let i = 0; i < gitter.length; i++) {
        const v = gitter[i];
        const c = v === Modell.FLUR ? fl : v > 0 ? farben[v - 1] : v === Modell.AUSSEN ? (gesperrt && gesperrt.has(i) ? sp : pap) : pap;
        d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = 255;
      }
    };
  }

  /** Wände: Linien zwischen Zellen verschiedener Räume bzw. zwischen Raum und Flur/außen */
  function waende(ctx, g, W, H, F, lw, x0 = 0, y0 = 0, s = 1) {
    ctx.beginPath();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const v = g[y * W + x];
      if (x < W - 1) { const u = g[y * W + x + 1]; if (u !== v && (u > 0 || v > 0)) { ctx.moveTo(x0 + (x + 1) * s, y0 + y * s); ctx.lineTo(x0 + (x + 1) * s, y0 + (y + 1) * s); } }
      if (y < H - 1) { const u = g[(y + 1) * W + x]; if (u !== v && (u > 0 || v > 0)) { ctx.moveTo(x0 + x * s, y0 + (y + 1) * s); ctx.lineTo(x0 + (x + 1) * s, y0 + (y + 1) * s); } }
      if (v > 0 || v === Modell.FLUR) {                               // Außenkante zum Rand bzw. zu außen/frei
        if (x === 0) { ctx.moveTo(x0, y0 + y * s); ctx.lineTo(x0, y0 + (y + 1) * s); }
        if (x === W - 1) { ctx.moveTo(x0 + W * s, y0 + y * s); ctx.lineTo(x0 + W * s, y0 + (y + 1) * s); }
        if (y === 0) { ctx.moveTo(x0 + x * s, y0); ctx.lineTo(x0 + (x + 1) * s, y0); }
        if (y === H - 1) { ctx.moveTo(x0 + x * s, y0 + H * s); ctx.lineTo(x0 + (x + 1) * s, y0 + H * s); }
      }
    }
    ctx.strokeStyle = F.tinte; ctx.lineWidth = lw; ctx.stroke();
  }

  function zeichnePlan(ctx, z, p, F, A) {
    const W = z.W, H = z.H, px = F.px, g = A.gitter || A.L.gitter;
    const gesperrt = new Set(p.sperre && p.sperre.schluessel === z.schluessel ? p.sperre.zellen : []);
    Sim.raster(ctx, W, H, rasterFarben(g, z, F, gesperrt), 0, 0, W, H);
    // Raster der freien Zellen und Umriss
    ctx.beginPath();
    for (let x = 0; x <= W; x++) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = 0; y <= H; y++) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.strokeStyle = F.dunkel ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"; ctx.lineWidth = px * 0.6; ctx.stroke();
    // gesperrte Zellen schraffiert
    if (gesperrt.size) {
      ctx.beginPath();
      for (const i of gesperrt) { const x = i % W, y = (i - x) / W; ctx.moveTo(x + 0.15, y + 0.15); ctx.lineTo(x + 0.85, y + 0.85); ctx.moveTo(x + 0.85, y + 0.15); ctx.lineTo(x + 0.15, y + 0.85); }
      ctx.strokeStyle = F.gedaempft; ctx.lineWidth = px; ctx.stroke();
    }
    // Umriss (Grenze zwischen außen und innen)
    ctx.beginPath();
    const aussen = (x, y) => x < 0 || y < 0 || x >= W || y >= H || (z.basis[y * W + x] === Modell.AUSSEN && !gesperrt.has(y * W + x));
    for (let y = 0; y <= H; y++) for (let x = 0; x <= W; x++) {
      if (aussen(x, y) !== aussen(x - 1, y) && y < H) { ctx.moveTo(x, y); ctx.lineTo(x, y + 1); }
      if (aussen(x, y) !== aussen(x, y - 1) && x < W) { ctx.moveTo(x, y); ctx.lineTo(x + 1, y); }
    }
    ctx.strokeStyle = F.gedaempft; ctx.lineWidth = px * 1.2; ctx.setLineDash([px * 5, px * 4]); ctx.stroke(); ctx.setLineDash([]);
    waende(ctx, g, W, H, F, px * 1.3);
    // zuletzt gesetzter Raum
    const L = A.L;
    if (!A.endgueltig && L.zuletzt != null && L.kasten[L.zuletzt]) {
      const [x0, y0, w, h] = L.kasten[L.zuletzt];
      ctx.strokeStyle = F.akzent; ctx.lineWidth = px * 2.6; ctx.strokeRect(x0, y0, w, h);
    }
    // Namen und rote Punkte
    const fehlt = Modell.fehlendeNachbarn(L, z.prog);
    for (const r of L.folge) {
      let sx = 0, sy = 0, n = 0, mx = Infinity, Mx = -Infinity;
      for (let i = 0; i < g.length; i++) if (g[i] === r + 1) { const x = i % W, y = (i - x) / W; sx += x + 0.5; sy += y + 0.5; n++; mx = Math.min(mx, x); Mx = Math.max(Mx, x + 1); }
      if (!n) continue;
      const c = [sx / n, sy / n], breitePx = (Mx - mx) / px;
      if (p.zeigeNamen) {
        let s = z.prog.raeume[r].name;
        if (s.length * 6.4 + 6 > breitePx) s = s.slice(0, Math.max(2, Math.floor((breitePx - 6) / 6.4) - 1)) + ".";
        if (breitePx > 18) Karte.text(ctx, s, c, F.tinte, px, 10.5, "center");
      }
      if (fehlt[r] > 0 && (A.endgueltig || L === z.letzte)) Karte.punkt(ctx, [c[0], c[1] - 10 * px], 3.6 * px, ROT, F.papier, px);
    }
    // Eingangspunkt
    const [ex, ey] = z.eingangsPunkt;
    Karte.punkt(ctx, [ex + 0.5, ey + 0.5], Math.max(0.32, 5 * px), null, F.akzent, px * 2);
    Karte.punkt(ctx, [ex + 0.5, ey + 0.5], Math.max(0.12, 2 * px), F.akzent, null);
  }

  function zeichneGraph(ctx, z, F, A, rect) {
    const [gx, gy, gw, gh] = rect, px = F.px, prog = z.prog, L = A.L;
    Karte.text(ctx, en() ? "ADJACENCY GRAPH" : "NACHBARSCHAFTSGRAPH", [gx, gy + 7 * px], F.gedaempft, px, 10);
    const pad = 30 * px, sw = Math.max(1, gw - 2 * pad - 30 * px), sh = Math.max(1, gh - 2 * pad - 14 * px), s = Math.min(sw, sh);
    const ox = gx + pad + 15 * px, oy = gy + pad + 4 * px;
    const P = z.lage.map(([x, y]) => [ox + x * sw, oy + y * sh]);
    const maxF = Math.max(...prog.raeume.map(r => r.flaeche)), R = Math.min(s * 0.075, 22 * px);
    const rad = i => Math.max(3 * px, R * Math.sqrt(prog.raeume[i].flaeche / maxF));
    const fertig = A.endgueltig || L === z.letzte;                    // abgeschlossene Lösung: fehlende Räume rot
    for (const [a, b] of prog.kanten) {
      const da = (L.kasten[a] ? 1 : 0) + (L.kasten[b] ? 1 : 0);
      if (da === 2) Karte.linie(ctx, [P[a], P[b]], F.gedaempft, px);
      else Karte.linie(ctx, [P[a], P[b]], da === 1 && fertig ? ROT : F.linie, px * 1.2, [px * 4, px * 3]);
    }
    const fehlt = Modell.fehlendeNachbarn(L, prog);
    prog.raeume.forEach((r, i) => {
      const c = css(raumRGB(i, F)), da = !!L.kasten[i];
      Karte.punkt(ctx, P[i], rad(i), da ? c : F.papier, da ? F.tinte : c, px * (da ? 0.8 : 1.6));
      if (fehlt[i] > 0 && da && fertig) Karte.punkt(ctx, [P[i][0] + rad(i) * 0.75, P[i][1] - rad(i) * 0.75], 3.4 * px, ROT, F.papier, px);
      if (!da && fertig) Karte.punkt(ctx, P[i], 2.6 * px, ROT, null);
      Karte.text(ctx, r.name + (prog.eingang === i ? " ▸" : ""), [P[i][0], P[i][1] + rad(i) + 7 * px], da ? F.tinte : F.gedaempft, px, 9, "center");
    });
  }

  function zeichneDaumen(ctx, z, p, F, rect) {
    const [dx, dy, dw, dh] = rect, px = F.px, W = z.W, H = z.H, n = Modell.KAPAZITAET, gap = (dw - n * dh * W / H) / (n - 1);
    const tw = dh * W / H;
    Karte.text(ctx, en() ? `BEST ${n} SOLUTIONS` : `BESTE ${n} LÖSUNGEN`, [dx, dy - 16 * px], F.gedaempft, px, 10);
    for (let k = 0; k < n; k++) {
      const x0 = dx + k * (tw + gap), L = z.best[k];
      ctx.strokeStyle = F.linie; ctx.lineWidth = px; ctx.strokeRect(x0, dy, tw, dh);
      if (!L) continue;
      Sim.raster(ctx, W, H, rasterFarben(L.gitter, z, F, null), x0, dy, tw, dh);
      const s = tw / W;
      waende(ctx, L.gitter, W, H, F, px * 0.6, x0, dy, s);
      if (z.lauf && z.lauf.art === "verbessern" && z.lauf.slot === k) { ctx.strokeStyle = F.akzent; ctx.lineWidth = px * 2; ctx.strokeRect(x0, dy, tw, dh); }
      Karte.text(ctx, `${L.folge.length}/${z.prog.N}`, [x0 + tw / 2, dy - 6 * px], F.tinte, px, 9.5, "center");
    }
  }

  const folgen = {};
  for (const k of Object.keys(B)) folgen[k] = { breite: B[k].b, tiefe: B[k].h };

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 200, wert: 8 },
    parameter: [
      { id: "beispiel", gruppe: { de: "Raumprogramm und Umriss", en: "Room programme and boundary" }, art: "auswahl", name: { de: "Beispiel (House Instance)", en: "Example (House Instance)" },
        wert: S.beispiel, neustart: true, groesseNeu: true, folgen, optionen: Object.keys(B).map(k => ({ wert: k, name: B[k].name })) },
      { id: "breite", name: { de: "Breite des Umrisses (Boundary) m", en: "Boundary width (m)" }, min: 6, max: 100, schritt: 1, wert: S.breite, neustart: true, groesseNeu: true },
      { id: "tiefe", name: { de: "Tiefe des Umrisses (Boundary) m", en: "Boundary depth (m)" }, min: 6, max: 100, schritt: 1, wert: S.tiefe, neustart: true, groesseNeu: true },
      { id: "form", art: "auswahl", name: { de: "Form des Umrisses", en: "Boundary shape" }, wert: S.form, neustart: true,
        optionen: [{ wert: "rechteck", name: { de: "Rechteck", en: "Rectangle" } }, { wert: "L", name: { de: "L-Form", en: "L shape" } }, { wert: "hof", name: { de: "mit Innenhof", en: "With courtyard" } }] },
      { id: "iterationen", gruppe: { de: "Generator (MagnetizingRooms_ES)", en: "Generator (MagnetizingRooms_ES)" }, name: { de: "Iterationen (Iterations)", en: "Iterations" }, min: 1, max: 10000, schritt: 1, wert: S.iterationen },
      { id: "maxAdj", name: { de: "Max. Nachbarabstand (MaxAdjDistance) m", en: "MaxAdjDistance (m)" }, min: 1, max: 5, schritt: 0.1, wert: S.maxAdj, neustart: true },
      { id: "maxRatio", name: { de: "Max. Seitenverhältnis (MaxRatio)", en: "Max. aspect ratio (MaxRatio)" }, min: 1, max: 3, schritt: 0.1, wert: S.maxRatio, neustart: true },
      { id: "flurmodus", art: "auswahl", name: { de: "Flure (Corridors)", en: "Corridors" }, wert: S.flurmodus, neustart: true,
        optionen: [{ wert: "ein", name: { de: "an einer Seite (One-side)", en: "One-side" } }, { wert: "zwei", name: { de: "an zwei Seiten (Two-sides)", en: "Two-sides" } }, { wert: "alle", name: { de: "an allen Seiten (All-sides)", en: "All-sides" } }] },
      { id: "flurZusatz", art: "schalter", name: { de: "Flur zusätzlich zur Raumfläche (Corridors as additional spaces)", en: "Corridors as additional spaces" }, wert: S.flurZusatz, neustart: true },
      { id: "bewertung", art: "auswahl", name: { de: "Bewertung", en: "Evaluation" }, wert: S.bewertung, neustart: true,
        optionen: [{ wert: "anzahl", name: { de: "Zahl der platzierten Räume", en: "Number of rooms placed" } }, { wert: "flaeche", name: { de: "Fläche der platzierten Räume", en: "Area of rooms placed" } }] },
      { id: "nachbearbeitung", art: "auswahl", name: { de: "Nachbearbeitung am Ende", en: "Post-processing at the end" }, wert: S.nachbearbeitung,
        optionen: [{ wert: "sackgassen", name: { de: "Sackgassen entfernen (Remove Dead Ends)", en: "Remove Dead Ends" } }, { wert: "keine", name: { de: "keine", en: "none" } }, { wert: "alleFlure", name: { de: "alle Flure den Räumen zuschlagen (Remove All Corridors)", en: "Remove All Corridors" } }] },
      { id: "ablauf", gruppe: { de: "Abspielen und Darstellung", en: "Playback and display" }, art: "auswahl", name: { de: "Ein Schritt ist", en: "One step is" }, wert: S.ablauf,
        optionen: [{ wert: "raum", name: { de: "ein platzierter Raum", en: "one placed room" } }, { wert: "iteration", name: { de: "eine Iteration (5 Lösungen)", en: "one iteration (5 solutions)" } }] },
      { id: "zeigeNamen", art: "schalter", name: { de: "Raumnamen zeigen", en: "Show room names" }, wert: true }
    ],
    groesse: z => { const a = aufteilung(z); return { b: a.b, h: a.h }; },
    klick(z, p, x, y, taste, phase) {
      if (x < 0 || y < 0 || x >= z.W || y >= z.H) return;
      if (taste === "rechts") { if (phase === "unten") Modell.setzeEingang(z, p, x, y); }
      else Modell.malen(z, p, x, y, phase);
    },
    aktionen: [
      { name: { de: "Zum Ende", en: "To the end" }, tue(z, p) { let n = 0; while (!z.fertig && n++ < 2e6) Modell.schritt(z, Object.assign({}, p, { ablauf: "iteration" })); } },
      { name: { de: "Sperren aufheben", en: "Unblock all" }, tue(z, p) { Modell.sperrenLoeschen(z, p); } }
    ],
    ende: z => z.fertig,
    zeichne(ctx, z, p, F) {
      const a = aufteilung(z), A = Modell.anzeige(z, p);
      zeichnePlan(ctx, z, p, F, A);
      zeichneGraph(ctx, z, F, A, a.graph);
      zeichneDaumen(ctx, z, p, F, a.daumen);
    },
    legende: (F) => [[css(raumRGB(0, F)), { de: "Raum", en: "Room" }], [css(mische(raumRGB(3, F), flurRGB(F), 0.55)), { de: "Halle", en: "Hall" }],
      [css(flurRGB(F)), { de: "Flur", en: "Corridor" }], [css(sperrRGB(F)), { de: "gesperrt", en: "blocked" }], [F.akzent, { de: "Eingangspunkt / zuletzt gesetzt", en: "Entrance point / last placed" }],
      [ROT, { de: "fehlende Nachbarschaft", en: "missing adjacency" }]],
    kennzahlen(z, p) {
      const A = Modell.anzeige(z, p), L = A.L, prog = z.prog, best = z.best[0];
      const fehlt = Modell.fehlendeNachbarn(L, prog), kantenOk = prog.kanten.filter(([a, b]) => L.kasten[a] && L.kasten[b]).length;
      const g = A.gitter || L.gitter, flur = g.reduce((s, v) => s + (v === Modell.FLUR ? 1 : 0), 0);
      const raumFl = L.folge.reduce((s, r) => s + prog.raeume[r].flaeche, 0);
      const stand = z.fertig ? { de: "fertig – beste Lösung", en: "done – best solution" }
        : L.art === "verbessern" ? { de: `verbessern (−${L.entfernt} Räume)`, en: `improve (−${L.entfernt} rooms)` } : { de: "neue Lösung", en: "new solution" };
      return [
        [{ de: "Iteration", en: "Iteration" }, `${zahl(Math.min(z.it + (z.fertig ? 0 : 1), p.iterationen))} / ${zahl(p.iterationen)}`],
        [{ de: "Lösung", en: "Solution" }, z.fertig ? "1" : `${z.slot + 1} / ${Modell.KAPAZITAET}`],
        [{ de: "Stand", en: "State" }, stand],
        [{ de: "Platzierte Räume (gezeigt)", en: "Rooms placed (shown)" }, `${L.folge.length} / ${prog.N}`],
        [{ de: "Raumfläche platziert", en: "Room area placed" }, `${zahl(raumFl)} / ${zahl(prog.flaeche)} m²`],
        [{ de: "Nachbarschaften erfüllt", en: "Adjacencies fulfilled" }, `${kantenOk} / ${prog.kanten.length}`],
        [{ de: "Räume mit fehlender Nachbarschaft", en: "Rooms with missing adjacency" }, String(L.folge.filter(r => fehlt[r] > 0).length)],
        [{ de: "Flurfläche", en: "Corridor area" }, `${zahl(flur)} m²`],
        [{ de: "Beste Lösung", en: "Best solution" }, best ? `${best.folge.length} / ${prog.N} ${en() ? "rooms" : "Räume"}` : "–"],
        [{ de: "Bewertete Lösungen", en: "Solutions evaluated" }, zahl(z.bewertet)],
        [{ de: "Übernommene Verbesserungen", en: "Improvements accepted" }, zahl(z.verbessert)]
      ];
    }
  });
})();
