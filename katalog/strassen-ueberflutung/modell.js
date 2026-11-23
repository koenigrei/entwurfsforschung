/* Straßen und Starkregen · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung des Grasshopper-Moduls „Street Flood Risk“ aus dem Parametric Planning Catalogue (DeCodingSpaces – Martin Dennemark).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Verfahren wie in StreetFloodRisk.gh:
   1. „Data Preparation“: Straßen auf das Gelände projiziert (Project) und in Segmente zerlegt (Explode); je Segment an der Stelle
      „Number Slider“ 0,5 (Evaluate Curve) Punkt und Tangente, dort die Geländenormale (Surface Closest Point, Evaluate Surface).
      StreetDirection = Tangente, WaterFlowDirection = Normale, beide waagerecht projiziert (Project auf World XY).
   2. „Calculating Deviation of Street to Waterflow Direction“: Angle(StreetDirection, WaterFlowDirection), dann
      Evaluate `if(x>0.5*PI,PI-x,x)` („Inverts Street Direction if necessary“) und Remap mit Source 0…π·0,5 auf 0…1.
   3. „Calculating Steepness of Terrain with Angle between Normal and Z-Direction“, Remap mit Source 0…Radians(„Max Degrees“ 15).
   4. Risiko = NormalisedDeviationStreetToWaterflow × NormalisedSteepness → Gradient (0 … „Number Slider“ 1): rot = steil und quer zum Fluss,
      blau = flach oder in Fließrichtung. Graue Pfeile: WaterFlowDirection × „Number Slider“ 50 am Segmentmittelpunkt. */
(function (wurzel, fabrik) {
  const node = typeof module === "object" && module.exports;
  const M = fabrik(node ? require("../_gemeinsam/geo.js") : wurzel.Geo, node ? require("../_gemeinsam/szenen.js") : wurzel.Szenen);
  if (node) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Geo, Szenen) {
  "use strict";

  /** Voreinstellungen der .gh-Datei: Max Degrees 15 [0..90], Evaluate Curve 0,5 [0..1], Pfeillänge 50 [0..100], Gradient-Obergrenze 1 [0..1],
      Höhenlinien (Contour) 20 [0..100]; nur in der App: Segmentlänge 25 m, Straßen je Schritt */
  const STANDARD = { maxGrad: 15, messpunkt: 0.5, pfeil: 50, obergrenze: 1, hoehenlinien: 20, segment: 25 };
  const GELAENDE = { n: 101, groesse: 1000, hoehe: 160 };
  /** Straßennetz: Szenen.stadt ohne Gebäude, auf einen Ausschnitt des Geländes gelegt */
  const STADT = { b: 900, h: 760, nx: 19, ny: 16, rand: 0, jitter: 0.3, zusammen: 0.22, platz: false, kirche: false, gebaeude: false };

  /* ---------------------------------------------------------------- 2./3. Winkel und Normierung */
  /** Winkel zwischen zwei ebenen Vektoren (0…π); Nullvektor → 0 */
  function winkel(a, b) {
    const la = Math.hypot(a[0], a[1]), lb = Math.hypot(b[0], b[1]);
    if (la < 1e-12 || lb < 1e-12) return 0;
    return Math.acos(Math.max(-1, Math.min(1, (a[0] * b[0] + a[1] * b[1]) / (la * lb))));
  }
  /** Evaluate `if(x>0.5*PI,PI-x,x)`: Straßenrichtung bei Bedarf umkehren → 0…π/2 */
  const umkehren = x => x > 0.5 * Math.PI ? Math.PI - x : x;
  /** Geländenormale (Einheitsvektor) aus dem Gefälle [∂h/∂x, ∂h/∂y] */
  function normale(g) { const l = Math.hypot(g[0], g[1], 1); return [-g[0] / l, -g[1] / l, 1 / l]; }
  /** Bewertung eines Segments von a nach b: Werte an der Stelle t (Evaluate Curve) */
  function bewerteSegment(G, a, b, p) {
    const t = p.messpunkt, m = Geo.lerp(a, b, t), n = normale(Szenen.gradient(G, m[0], m[1]));
    const strasse = [b[0] - a[0], b[1] - a[1]];                 // Tangente, waagerecht projiziert
    const fluss = [n[0], n[1]];                                  // Normale, waagerecht projiziert: zeigt hangabwärts, Länge sin(Neigung)
    const abweichung = umkehren(winkel(strasse, fluss));          // 0 = in Fließrichtung, π/2 = quer
    const steil = Math.acos(Math.max(-1, Math.min(1, n[2])));     // Angle(Normale, Z)
    const nAbw = abweichung / (Math.PI * 0.5);                     // Remap Source 0…π·0,5 → 0…1
    const maxRad = Math.max(1e-9, p.maxGrad * Math.PI / 180), nSteil = steil / maxRad;   // Remap Source 0…Radians(Max Degrees), nicht gekappt
    return { a, b, m, fluss, abweichung, steil, nAbw, nSteil, risiko: nAbw * nSteil, laenge: Geo.abstand(a, b) };
  }
  /** Gradient-Parameter 0…1 (Obergrenze „Number Slider“ 1; darüber volle Farbe) */
  const farbwert = (risiko, obergrenze) => Math.max(0, Math.min(1, risiko / Math.max(1e-6, obergrenze)));

  /* ---------------------------------------------------------------- 1. Straßen und Segmente */
  /** Straße [p, q] in gleich lange Segmente von höchstens L Metern teilen */
  function teile(s, L) {
    const n = Math.max(1, Math.ceil(Geo.abstand(s[0], s[1]) / Math.max(1, L) - 1e-9)), out = [];
    for (let i = 0; i < n; i++) out.push([Geo.lerp(s[0], s[1], i / n), Geo.lerp(s[0], s[1], (i + 1) / n)]);
    return out;
  }
  /** Straßennetz der Beispielstadt, auf das Gelände verschoben und auf einen unregelmäßigen Umriss (Ellipse mit gewelltem Rand)
      beschnitten, damit kein rechteckiger Rahmen bleibt: eine Straße bleibt, wenn beide Enden im Umriss liegen */
  function netz(zufall, G) {
    const st = Szenen.stadt(zufall, STADT), ox = (G.groesse - STADT.b) / 2, oy = G.groesse - STADT.h - 20;
    const cx = G.groesse / 2, cy = oy + STADT.h / 2, rx = STADT.b * 0.49, ry = STADT.h * 0.49;
    const welle = [1, 2, 3, 5].map(k => [k, 0.06 * zufall() + 0.02, zufall() * 2 * Math.PI]);
    const innen = q => { const dx = (q[0] - cx) / rx, dy = (q[1] - cy) / ry, w = Math.atan2(dy, dx);
      let r = 0.86; for (const [k, a, ph] of welle) r += a * Math.sin(k * w + ph); return Math.hypot(dx, dy) <= r; };
    return st.strassen.map(([p, q]) => [[p[0] + ox, p[1] + oy], [q[0] + ox, q[1] + oy]]).filter(([p, q]) => innen(p) && innen(q));
  }
  /** Reihenfolge der Bewertung: Straßen von oben nach unten (Höhe der Mitte absteigend), wie das Regenwasser läuft */
  function reihenfolge(G, strassen) {
    const h = strassen.map(s => { const m = Geo.lerp(s[0], s[1], 0.5); return Szenen.hoehe(G, m[0], m[1]); });
    return [...strassen.keys()].sort((a, b) => h[b] - h[a] || a - b);
  }

  /* ---------------------------------------------------------------- Zustand */
  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const G = Szenen.gelaende(zufall, GELAENDE), strassen = netz(zufall, G);
    const z = { t: 0, k: 0, G, b: G.groesse, h: G.groesse, strassen, folge: reihenfolge(G, strassen), wahl: -1 };
    rechne(z, p);
    return z;
  }
  /** alle Segmente bewerten (je Straße eine Liste) */
  function rechne(z, p) {
    z.seg = z.strassen.map(s => teile(s, p.segment).map(([a, b]) => bewerteSegment(z.G, a, b, p)));
  }
  /** Ein Schritt: die nächste Straße (von oben nach unten) wird bewertet und eingefärbt */
  function schritt(z, p) { if (z.k < z.strassen.length) z.k++; z.t++; return z; }
  const fertig = z => z.k >= z.strassen.length;
  /** bewertete Segmente (die ersten k Straßen der Reihenfolge) */
  function bewertet(z) { const out = []; for (let i = 0; i < z.k; i++) out.push(...z.seg[z.folge[i]]); return out; }
  /** Kennzahlen der bewerteten Segmente, längengewichtet */
  function auswertung(z, p) {
    const S = bewertet(z); let L = 0, stark = 0, kaum = 0, risiko = 0, steilL = 0, neig = 0, maxSteil = 0;
    for (const s of S) {
      const f = farbwert(s.risiko, p.obergrenze); L += s.laenge; risiko += s.laenge * f; neig += s.laenge * s.steil;
      if (f >= 0.5) stark += s.laenge; if (f < 0.2) kaum += s.laenge;
      if (s.steil > p.maxGrad * Math.PI / 180) steilL += s.laenge; if (s.steil > maxSteil) maxSteil = s.steil;
    }
    const q = v => L > 0 ? v / L : 0;
    return { segmente: S.length, laenge: L, stark: q(stark), kaum: q(kaum), mittel: q(risiko), steiler: q(steilL), neigung: q(neig), maxSteil };
  }
  /** Regler: Segmentlänge, Max Degrees, Messpunkt → neu bewerten, sofort fertig (wie Grasshopper); reine Darstellung → nichts */
  function aendere(z, p, id) {
    if (["pfeil", "obergrenze", "hoehenlinien"].includes(id) || (id && id.startsWith("zeige"))) return;
    rechne(z, p); z.k = z.strassen.length; z.wahl = -1;
  }
  /** Segment nächst q auswählen (seine Werte erscheinen in den Kennzahlen) */
  function waehle(z, q) {
    let best = -1, bd = Infinity, i = 0;
    for (const L of z.seg) for (const s of L) { const d = Geo.abstandSegment(q, s.a, s.b).d; if (d < bd) { bd = d; best = i; } i++; }
    z.wahl = bd < 40 ? best : -1;
    return z.wahl;
  }
  function segmentNr(z, nr) { let i = 0; for (const L of z.seg) for (const s of L) { if (i === nr) return s; i++; } return null; }
  /** Bewertung von vorn zeigen */
  function abspielen(z) { z.k = 0; z.t = 0; }

  return { STANDARD, GELAENDE, STADT, winkel, umkehren, normale, bewerteSegment, farbwert, teile, netz, reihenfolge,
           erzeuge, rechne, schritt, fertig, bewertet, auswertung, aendere, waehle, segmentNr, abspielen };
});
