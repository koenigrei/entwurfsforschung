/* Parametric Planning Catalogue · Zeichenhilfen für die Zeichenfläche (Canvas 2D, im Modellmaßstab von Sim.starte)
   Farbskalen, Polygone, Linien, Pfeile, Gelände mit Schummerung und Höhenlinien.
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function (wurzel, fabrik) {
  const K = fabrik();
  if (typeof module === "object" && module.exports) module.exports = K;
  else wurzel.Karte = K;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  /** Farbskalen als Stützstellen [r, g, b]: „spektral“ wie der Grasshopper-Gradient (blau – grün – gelb – rot), „kaltwarm“, „grau“ */
  const SKALEN = {
    spektral: [[43, 131, 186], [171, 221, 164], [255, 255, 191], [253, 174, 97], [215, 25, 28]],
    kaltwarm: [[49, 54, 149], [116, 173, 209], [224, 243, 248], [253, 174, 97], [165, 0, 38]],
    gelbrot: [[255, 237, 160], [254, 178, 76], [240, 59, 32], [128, 0, 38]],
    wasser: [[222, 235, 247], [107, 174, 214], [33, 113, 181], [8, 48, 107]]
  };
  function farbeRGB(t, skala = "spektral") {
    const S = SKALEN[skala] || skala, x = Math.max(0, Math.min(1, isFinite(t) ? t : 0)) * (S.length - 1), i = Math.min(S.length - 2, Math.floor(x)), u = x - i;
    return [0, 1, 2].map(k => Math.round(S[i][k] + (S[i + 1][k] - S[i][k]) * u));
  }
  const farbe = (t, skala, a = 1) => { const c = farbeRGB(t, skala); return a < 1 ? `rgba(${c[0]},${c[1]},${c[2]},${a})` : `rgb(${c[0]},${c[1]},${c[2]})`; };
  /** Legende einer Farbskala für Sim (fünf Stufen mit Beschriftung von–bis) */
  function skalenLegende(skala, von, bis) {
    return [0, 0.25, 0.5, 0.75, 1].map((t, i) => [farbe(t, skala), i === 0 ? von : i === 4 ? bis : ""]);
  }

  /** Farben der Grasshopper-Komponente „Gradient“ in den Isovist-Modulen: dunkelblau – hellblau – grün – gelb – rot */
  const GRADIENT_GH = [[0, 0, 139], [50, 178, 206], [87, 166, 31], [255, 215, 0], [255, 0, 0]];
  /** Farbe eines Verlaufs mit frei liegenden (auch ungleich verteilten) Griffen wie die Grasshopper-Komponente „Gradient“ bei
      t ∈ [0, 1] → [r, g, b]. V = {farben: [[r, g, b] …], faktoren: [Lage der Griffe, aufsteigend]}: linear zwischen den Griffen,
      vor dem ersten und hinter dem letzten Griff dessen Farbe; t wird auf 0…1 begrenzt, nicht endliche Werte gelten als 0.
      Herkunft: katalog/isovist-feld, isovist-objekte, isovist-3d */
  function verlauf(t, V) {
    const f = V.faktoren, c = V.farben;
    t = Math.max(0, Math.min(1, isFinite(t) ? t : 0));
    if (t <= f[0]) return c[0].slice();
    for (let i = 1; i < f.length; i++) if (t <= f[i]) {
      const u = (t - f[i - 1]) / ((f[i] - f[i - 1]) || 1);
      return [0, 1, 2].map(k => Math.round(c[i - 1][k] + (c[i][k] - c[i - 1][k]) * u));
    }
    return c[c.length - 1].slice();
  }

  function pfad(ctx, P, zu = true) { ctx.beginPath(); P.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); if (zu) ctx.closePath(); }
  function poly(ctx, P, fuellung, strich, lw) {
    if (!P || P.length < 2) return;
    pfad(ctx, P, true);
    if (fuellung) { ctx.fillStyle = fuellung; ctx.fill(); }
    if (strich) { ctx.strokeStyle = strich; ctx.lineWidth = lw || 1; ctx.stroke(); }
  }
  function linie(ctx, P, strich, lw, gestrichelt) {
    if (!P || P.length < 2) return;
    pfad(ctx, P, false); ctx.strokeStyle = strich; ctx.lineWidth = lw || 1;
    if (gestrichelt) ctx.setLineDash(gestrichelt); ctx.stroke(); if (gestrichelt) ctx.setLineDash([]);
  }
  function segmente(ctx, S, strich, lw) {
    ctx.beginPath(); for (const s of S) { ctx.moveTo(s[0][0], s[0][1]); ctx.lineTo(s[1][0], s[1][1]); }
    ctx.strokeStyle = strich; ctx.lineWidth = lw || 1; ctx.stroke();
  }
  function punkt(ctx, p, r, fuellung, strich, lw) {
    ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 2 * Math.PI);
    if (fuellung) { ctx.fillStyle = fuellung; ctx.fill(); }
    if (strich) { ctx.strokeStyle = strich; ctx.lineWidth = lw || 1; ctx.stroke(); }
  }
  function pfeil(ctx, p, d, l, farbe_, lw) {
    const n = Math.hypot(d[0], d[1]) || 1, u = [d[0] / n, d[1] / n], q = [p[0] + u[0] * l, p[1] + u[1] * l], s = l * 0.32;
    ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]);
    ctx.moveTo(q[0] - u[0] * s - u[1] * s * 0.6, q[1] - u[1] * s + u[0] * s * 0.6); ctx.lineTo(q[0], q[1]); ctx.lineTo(q[0] - u[0] * s + u[1] * s * 0.6, q[1] - u[1] * s - u[0] * s * 0.6);
    ctx.strokeStyle = farbe_; ctx.lineWidth = lw || 1; ctx.stroke();
  }
  /** Text im Modellmaßstab mit fester Bildschirmgröße (px = Modelleinheiten je Bildschirmpixel) */
  function text(ctx, s, p, farbe_, px, groesse = 11, ausr = "left") {
    ctx.save(); ctx.translate(p[0], p[1]); ctx.scale(px, px);
    ctx.font = `500 ${groesse}px "Geist Mono", ui-monospace, monospace`; ctx.fillStyle = farbe_; ctx.textAlign = ausr; ctx.textBaseline = "middle";
    ctx.fillText(s, 0, 0); ctx.restore();
  }

  /** Gelände als Bild: Schummerung (Licht aus Nordwest) über einer Höhenfärbung, gezeichnet auf [0, groesse]².
      G: {n, groesse, zelle, h, max}; F: Farben des Rahmens; aufloesung: Bildpunkte je Seite. */
  function gelaende(ctx, G, F, opt = {}) {
    const n = opt.aufloesung || Math.min(320, G.n * 3), papier = F.rgb.flaeche, dunkel = F.dunkel;
    const hh = (x, y) => { const fx = Math.max(0, Math.min(G.n - 1.0001, x)), fy = Math.max(0, Math.min(G.n - 1.0001, y)), i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j, H = G.h, m = G.n;
      return (H[j * m + i] * (1 - u) + H[j * m + i + 1] * u) * (1 - v) + (H[(j + 1) * m + i] * (1 - u) + H[(j + 1) * m + i + 1] * u) * v; };
    Sim.raster(ctx, n, n, d => {
      const s = (G.n - 1) / (n - 1), lx = -0.6, ly = -0.6, lz = 0.53;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const gx = x * s, gy = y * s;
        const dzx = (hh(gx + 0.5, gy) - hh(gx - 0.5, gy)) / G.zelle, dzy = (hh(gx, gy + 0.5) - hh(gx, gy - 0.5)) / G.zelle;
        const nn = Math.hypot(dzx, dzy, 1), licht = Math.max(0, (-dzx * lx - dzy * ly + lz) / nn / Math.hypot(lx, ly, lz));
        const t = hh(gx, gy) / (G.max || 1);
        const basis = dunkel ? 34 + 70 * t : 250 - 40 * t;
        const k = dunkel ? basis * (0.45 + 0.75 * licht) : basis * (0.62 + 0.42 * licht);
        const i = 4 * (y * n + x);
        d[i] = Math.min(255, k * (opt.ton ? opt.ton[0] : 1)); d[i + 1] = Math.min(255, k * (opt.ton ? opt.ton[1] : 1)); d[i + 2] = Math.min(255, k * (opt.ton ? opt.ton[2] : 1.02)); d[i + 3] = 255;
      }
    }, 0, 0, G.groesse, G.groesse);
    if (opt.hoehenlinien) hoehenlinien(ctx, G, opt.hoehenlinien, dunkel ? "rgba(255,255,255,0.13)" : "rgba(0,0,0,0.14)", F.px * 0.8);
    void papier;
  }
  /** Zwischenspeicher für gelaendeGespeichert (eine Seite = eine App; zeigt eine Seite mehrere Gelände, gibt sie je eines opt.speicher) */
  const SPEICHER = {};
  /** Gelände über einen Zwischenspeicher zeichnen: das Bild von gelaende() wird nur neu gerechnet, wenn sich Bildgröße,
      Darstellung (hell/dunkel), Höhenraster (Objekt oder Stichproben der Höhen) oder Optionen ändern, sonst nur eingesetzt.
      opt wie gelaende, dazu: bild (feste Bildpunkte je Seite; ohne: Auflösung der Zeichenfläche, groesse × Maßstab des ctx),
      pxBild (true: F.px = Modelleinheiten je Bildpunkt des Zwischenbilds, für die Linienstärke der Höhenlinien),
      speicher (eigenes Objekt statt des gemeinsamen). Braucht den Browser (document.createElement).
      Herkunft: app.js von serpentinen, ringstrassen, strassen-ueberflutung, wasserbasiertes-wachstum, windrichtung */
  function gelaendeGespeichert(ctx, G, F, opt = {}) {
    const sp = opt.speicher || SPEICHER, a = ctx.getTransform().a;
    const W = opt.bild || Math.max(1, Math.round(G.groesse * a)), s = opt.bild ? opt.bild / G.groesse : a, H = G.h;
    const k = [W, F.dunkel, opt.hoehenlinien || 0, opt.aufloesung || 0, opt.ton ? opt.ton.join(",") : "", H.length, H[7], H[H.length >> 1], H[H.length - 1], G.max].join("|");
    if (sp.k !== k || sp.G !== G) {
      const c = sp.c || document.createElement("canvas"); c.width = W; c.height = W;
      const x = c.getContext("2d"); x.setTransform(s, 0, 0, s, 0, 0);
      gelaende(x, G, opt.pxBild ? Object.assign({}, F, { px: 1 / s }) : F, opt);
      sp.c = c; sp.k = k; sp.G = G;
    }
    ctx.drawImage(sp.c, 0, 0, G.groesse, G.groesse);
    return sp.c;
  }
  /** Höhenlinien im Abstand dz (marching squares auf dem Höhenraster) */
  function hoehenlinien(ctx, G, dz, farbe_, lw) {
    const n = G.n, H = G.h, z = G.zelle;
    ctx.beginPath();
    for (let lvl = dz; lvl < G.max; lvl += dz) {
      for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
        const a = H[j * n + i], b = H[j * n + i + 1], c = H[(j + 1) * n + i + 1], d = H[(j + 1) * n + i];
        const P = [];
        const kante = (h1, h2, x1, y1, x2, y2) => { if ((h1 < lvl) !== (h2 < lvl)) { const t = (lvl - h1) / (h2 - h1); P.push([(x1 + (x2 - x1) * t) * z, (y1 + (y2 - y1) * t) * z]); } };
        kante(a, b, i, j, i + 1, j); kante(b, c, i + 1, j, i + 1, j + 1); kante(c, d, i + 1, j + 1, i, j + 1); kante(d, a, i, j + 1, i, j);
        if (P.length >= 2) { ctx.moveTo(P[0][0], P[0][1]); ctx.lineTo(P[1][0], P[1][1]); }
        if (P.length === 4) { ctx.moveTo(P[2][0], P[2][1]); ctx.lineTo(P[3][0], P[3][1]); }
      }
    }
    ctx.strokeStyle = farbe_; ctx.lineWidth = lw; ctx.stroke();
  }

  return { SKALEN, farbeRGB, farbe, skalenLegende, GRADIENT_GH, verlauf, pfad, poly, linie, segmente, punkt, pfeil, text, gelaende, gelaendeGespeichert, hoehenlinien };
});
