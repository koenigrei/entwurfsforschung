/* Regenwasserabfluss (Raster) · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung des Grasshopper-Moduls „Rainwater Rundown (Raster)“ aus dem Parametric Planning Catalogue
   (DeCodingSpaces – Martin Dennemark).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Verfahren wie in der .gh-Datei: Die DeCodingSpaces-Komponente „Flow Paths“ (Eingänge Terrain, Smooth, U Count, V Count)
   tastet das (geglättete) Gelände in einem Raster von Resolution × Resolution Feldern ab. Jeder Rasterpunkt gibt sein Wasser
   an den Nachbarn mit dem steilsten Gefälle ab (acht Nachbarn, D8 – im Katalogbild laufen die Fließwege waagerecht,
   senkrecht und diagonal im Raster). Ein Abschnitt Punkt → Nachbar ist ein kurzer Fließweg („Flow Paths (Short)“), die Kette
   bis zur Senke oder zum Rand ein langer („Flow Paths (Long)“). „End Points“ + „Point Groups“ (Distance 0,1) fassen lange
   Fließwege mit gleichem Endpunkt zusammen: Sie gehören zum selben Einzugsgebiet (water shed). „Local Analysis“: an einem
   verschiebbaren Punkt zeigt der Pfeil (Normale in die Ebene projiziert, × 300) die Fließrichtung = negativer Gradient. */
(function (wurzel, fabrik) {
  const node = typeof module === "object" && module.exports;
  const M = fabrik(node ? require("../_gemeinsam/geo.js") : wurzel.Geo, node ? require("../_gemeinsam/szenen.js") : wurzel.Szenen);
  if (node) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Geo, Szenen) {
  "use strict";

  /** Voreinstellungen der .gh-Datei: Resolution 50 (0…100), Smooth 0,5 (0…1), Point Groups Distance 0,1 (0…0,1 Rhino-Einheiten;
      hier in m, Bereich erweitert), Pfeillänge = Multiplication B 300 (0…1000). */
  const STANDARD = { aufloesung: 50, glaettung: 0.5, abstand: 0.1, pfeil: 300, zeigeKurz: true, zeigeGebiete: true };
  /** Beispielgelände (gleich in „Regenwasserabfluss (Vektor)“): 2 km × 2 km, bis 300 m Höhenunterschied */
  const GELAENDE = { n: 101, groesse: 2000, hoehe: 300 };
  /** höchstens so viele Glättungsdurchgänge bei Smooth = 0 */
  const GLAETTUNG_MAX = 8;
  /** Schritte je Abschnitt (die Fließwege wachsen sichtbar; nur Darstellung des Ablaufs) */
  const TEILE = 4;
  /** Nachbarn im Raster (D8): dx, dy, Abstand in Feldern */
  const D8 = [[1, 0, 1], [1, 1, Math.SQRT2], [0, 1, 1], [-1, 1, Math.SQRT2], [-1, 0, 1], [-1, -1, Math.SQRT2], [0, -1, 1], [1, -1, Math.SQRT2]];

  /** Smooth (0 = glatt, 1 = genau) → Zahl der Glättungsdurchgänge (Mittel der 3 × 3 Nachbarn) */
  const durchgaenge = s => Math.round((1 - Math.max(0, Math.min(1, s))) * GLAETTUNG_MAX);

  /** Raster der Analyse: (R + 1)² Punkte auf dem Gelände (U Count = V Count = Resolution Felder) */
  function abtasten(G, R) {
    const m = Math.max(1, Math.round(R)) + 1, d = G.groesse / (m - 1), H = new Float64Array(m * m);
    for (let j = 0; j < m; j++) for (let i = 0; i < m; i++) H[j * m + i] = Szenen.hoehe(G, i * d, j * d);
    return { m, d, H };
  }

  /** D8: Nachbar mit dem steilsten Gefälle (Höhenunterschied / Abstand) oder −1, wenn kein Nachbar tiefer liegt (Senke) */
  function abfluss(H, m, d) {
    const nach = new Int32Array(m * m).fill(-1);
    for (let j = 0; j < m; j++) for (let i = 0; i < m; i++) {
      const k = j * m + i; let best = 0;
      for (const [dx, dy, l] of D8) {
        const x = i + dx, y = j + dy; if (x < 0 || y < 0 || x >= m || y >= m) continue;
        const g = (H[k] - H[y * m + x]) / (l * d);
        if (g > best) { best = g; nach[k] = y * m + x; }
      }
    }
    return nach;
  }

  /** Lange Fließwege: Endpunkt (Senke) und Länge in Abschnitten je Startpunkt. Die Höhe fällt streng → keine Kreise. */
  function endpunkte(nach) {
    const n = nach.length, ende = new Int32Array(n).fill(-1), laenge = new Int32Array(n), stapel = [];
    for (let k = 0; k < n; k++) {
      let q = k;
      while (ende[q] < 0 && nach[q] >= 0) { stapel.push(q); q = nach[q]; }
      if (ende[q] < 0) { ende[q] = q; laenge[q] = 0; }
      while (stapel.length) { const s = stapel.pop(); ende[s] = ende[nach[s]]; laenge[s] = laenge[nach[s]] + 1; }
    }
    return { ende, laenge };
  }

  /** Point Groups: Endpunkte (3D) mit Abstand ≤ dist gehören zu einer Gruppe (transitiv, Union-Find).
      P: [[x, y, z]] → Gruppennummer je Punkt (0 … G−1, in der Reihenfolge des ersten Auftretens) */
  function gruppiere(P, dist) {
    const n = P.length, v = Array.from({ length: n }, (_, i) => i);
    const f = i => { while (v[i] !== i) { v[i] = v[v[i]]; i = v[i]; } return i; };
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
      if (Math.hypot(P[a][0] - P[b][0], P[a][1] - P[b][1], P[a][2] - P[b][2]) <= dist) { const ra = f(a), rb = f(b); if (ra !== rb) v[rb] = ra; }
    }
    const nr = new Map(), g = new Int32Array(n);
    for (let i = 0; i < n; i++) { const r = f(i); if (!nr.has(r)) nr.set(r, nr.size); g[i] = nr.get(r); }
    return g;
  }

  /** Jitter (Seed 2) der .gh-Datei: Farbreihenfolge der Einzugsgebiete mischen, damit Nachbargebiete verschieden aussehen */
  function farbfolge(G, saat = 2) {
    let a = saat >>> 0; const r = () => { a = (Math.imul(a, 1664525) + 1013904223) >>> 0; return a / 4294967296; };
    const f = Array.from({ length: G }, (_, i) => G > 1 ? i / (G - 1) : 0.5);
    for (let i = G - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = f[i]; f[i] = f[j]; f[j] = t; }
    return f;
  }

  /** ganze Analyse für die Parameter: geglättetes Gelände, Raster, D8, Endpunkte, Gruppen */
  function analysiere(z, p) {
    z.G = Szenen.glaette(z.G0, durchgaenge(p.glaettung));
    const A = abtasten(z.G, p.aufloesung);
    z.m = A.m; z.d = A.d; z.H = A.H;
    z.nach = abfluss(z.H, z.m, z.d);
    const E = endpunkte(z.nach);
    z.ende = E.ende; z.laenge = E.laenge;
    z.senken = []; for (let k = 0; k < z.nach.length; k++) if (z.nach[k] < 0) z.senken.push(k);
    gruppen(z, p);
    z.maxLaenge = 0; for (const l of z.laenge) if (l > z.maxLaenge) z.maxLaenge = l;
    neuerLauf(z);
    return z;
  }

  /** End Points + Point Groups: Senken im Abstand ≤ „abstand“ zusammenfassen, jedem Rasterpunkt sein Einzugsgebiet geben */
  function gruppen(z, p) {
    const P = z.senken.map(k => [(k % z.m) * z.d, Math.floor(k / z.m) * z.d, z.H[k]]);
    const gs = gruppiere(P, p.abstand), zuG = new Map();
    z.senken.forEach((k, i) => zuG.set(k, gs[i]));
    z.anzahlGebiete = z.senken.length ? Math.max(...gs) + 1 : 0;
    z.gebiet = new Int32Array(z.nach.length);
    for (let k = 0; k < z.nach.length; k++) z.gebiet[k] = zuG.get(z.ende[k]);
    z.farbe = farbfolge(z.anzahlGebiete);
    z.groesseGebiet = new Int32Array(z.anzahlGebiete); for (const g of z.gebiet) z.groesseGebiet[g]++;
    return z;
  }

  /** Ablauf zurück auf Anfang: in jedem Rasterpunkt ein Tropfen, kein Abschnitt durchflossen */
  function neuerLauf(z) {
    z.t = 0; z.pos = new Int32Array(z.nach.length); for (let k = 0; k < z.pos.length; k++) z.pos[k] = k;
    z.durch = new Int32Array(z.nach.length); z.aktiv = z.nach.reduce((s, q) => s + (q >= 0 ? 1 : 0), 0); z.gruppiert = false; z.teil = 0; z.abschnitte = 0;
  }

  /** Neuer Zustand: Gelände, Analyse; Analysepunkt in der Mitte */
  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const G0 = Szenen.gelaende(zufall, GELAENDE);
    const z = { t: 0, G0, b: G0.groesse, h: G0.groesse, punkt: [G0.groesse * 0.42, G0.groesse * 0.55] };
    return analysiere(z, p);
  }

  /** Ein Schritt: alle Fließwege wachsen um 1/TEILE eines Abschnitts; nach TEILE Schritten rücken alle Tropfen zum D8-Nachbarn
      (Abschnitt durchflossen). Stehen alle, folgt ein letzter Schritt „Point Groups“: Gruppierung nach Endpunkt → Einzugsgebiete. */
  function schritt(z) {
    if (z.aktiv > 0) {
      z.teil++;
      if (z.teil >= TEILE) {
        let a = 0;
        for (let k = 0; k < z.pos.length; k++) {
          const q = z.pos[k], n = z.nach[q]; if (n < 0) continue;
          z.durch[q]++; z.pos[k] = n; if (z.nach[n] >= 0) a++;
        }
        z.aktiv = a; z.teil = 0; z.abschnitte++;
      }
    } else z.gruppiert = true;
    z.t++;
    return z;
  }

  /** fertig, wenn alle Tropfen stehen und gruppiert ist */
  const fertig = z => z.gruppiert;

  /** Lokale Analyse (Evaluate Surface → Normale, Project auf XY): Fließrichtung = −Gradient, Neigung, Höhe */
  function lokal(z, q) {
    const g = Szenen.gradient(z.G, q[0], q[1]), b = Math.hypot(g[0], g[1]);
    return { richtung: b > 1e-12 ? [-g[0] / b, -g[1] / b] : [0, 0], neigung: Math.atan(b) * 180 / Math.PI, hoehe: Szenen.hoehe(z.G, q[0], q[1]), gefaelle: b };
  }

  /** Analysepunkt setzen (auf das Gelände begrenzt) */
  function setzePunkt(z, q) { z.punkt = [Math.max(0, Math.min(z.b, q[0])), Math.max(0, Math.min(z.h, q[1]))]; }

  /** Parameter ohne Neustart: Gruppierungsabstand gruppiert neu (Ablauf bleibt), Glättung und Auflösung rechnen neu (Ablauf von vorn) */
  function aendere(z, p, id) {
    if (id === "glaettung" || id === "aufloesung") analysiere(z, p);
    else if (id === "abstand") gruppen(z, p);
  }

  return { STANDARD, GELAENDE, GLAETTUNG_MAX, TEILE, D8, durchgaenge, abtasten, abfluss, endpunkte, gruppiere, farbfolge, analysiere, gruppen, neuerLauf, erzeuge, schritt, fertig, lokal, setzePunkt, aendere };
});
