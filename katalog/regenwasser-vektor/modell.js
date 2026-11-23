/* Regenwasserabfluss (Vektor) · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung des Grasshopper-Moduls „Rainwater Rundown (Vector)“ aus dem Parametric Planning Catalogue. Das Modul besteht
   aus der Komponente „Flow Paths“ des Plugins Gismo von Djordje Spasić (GPL-3.0, https://github.com/stgeorges/gismo).
   Hier ist kein Gismo-Code übernommen: Das Verfahren ist nach dem Quelltext der Komponente in eigenen Worten nachgebaut.
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Verfahren (Gismo „Flow Paths“, Eingänge numOfInitialPts_, initialPtsSpread_, stepSize_):
   1. Startpunkte: auf der Oberseite des Begrenzungsrahmens im Rechteckraster (Spalten und Zeilen aus der gewünschten Zahl und dem
      Seitenverhältnis, Ränder eingeschlossen) oder zufällig verteilt, senkrecht auf das Gelände gelegt.
   2. Fließweg: Von jedem Punkt aus wiederholt einen Schritt der Länge stepSize in Richtung des steilsten Gefälles in der
      Tangentialebene des Geländes gehen (Senkrechte nach unten, in die Ebene der Flächennormale projiziert) und den neuen Punkt
      wieder auf das Gelände legen.
   3. Abbruch, wenn der neue Punkt mit dem vorigen zusammenfällt (keine Richtung mehr, oder am Rand festgehalten) oder nach
      5000 Schritten. Ergebnis je Startpunkt eine Polylinie (ein Vektorzug), keine Gruppierung. */
(function (wurzel, fabrik) {
  const node = typeof module === "object" && module.exports;
  const M = fabrik(node ? require("../_gemeinsam/geo.js") : wurzel.Geo, node ? require("../_gemeinsam/szenen.js") : wurzel.Szenen);
  if (node) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Geo, Szenen) {
  "use strict";

  /** Voreinstellungen der .gh-Datei: Number of Points 300 (0…1000), Grid:False Random:True = false (Raster),
      stepSize_ 1 (Voreinstellung der Komponente, Rhino-Einheiten = m). */
  const STANDARD = { punkte: 300, zufaellig: false, schrittweite: 1, zeigeStart: true };
  /** Beispielgelände – dasselbe wie in „Regenwasserabfluss (Raster)“ */
  const GELAENDE = { n: 101, groesse: 2000, hoehe: 300 };
  /** höchstens so viele Schritte je Fließweg (wie die Komponente) */
  const MAX_SCHRITTE = 5000;
  /** zwei Punkte gelten als gleich (Abbruch „Stillstand“) */
  const EPS = 1e-4;
  /** Senke: liegt der Punkt nach SENKE_SCHRITTE Schritten waagerecht weniger als SENKE_RADIUS Schrittweiten vom damaligen
      Punkt entfernt, pendelt der Weg in einer Mulde; er endet an seinem Tiefpunkt */
  const SENKE_SCHRITTE = 25;
  const SENKE_RADIUS = 2;

  /** Rasterteilung wie die Komponente: Spalten ≈ √(Seitenverhältnis · n), Zeilen = n / Spalten, Spalten neu = n / Zeilen
      (je gerundet, mindestens 2 – die Komponente teilt bei 1 durch null). → [Spalten, Zeilen] */
  function rasterTeilung(n, b, h) {
    const r = Math.max(b / h, h / b), u0 = Math.round(Math.sqrt(r * n)), v = Math.max(2, Math.round(n / Math.max(1, u0))), u = Math.max(2, Math.round(n / v));
    return b >= h ? [u, v] : [v, u];
  }

  /** Startpunkte auf dem Gelände: Raster (Ränder eingeschlossen) oder gleichverteilt zufällig; mindestens 2 Punkte */
  function startpunkte(G, n, zufaellig, zufall) {
    n = Math.max(2, Math.round(n));
    const L = G.groesse, P = [];
    if (zufaellig) for (let i = 0; i < n; i++) P.push([zufall() * L, zufall() * L]);
    else {
      const [U, V] = rasterTeilung(n, L, L);
      for (let i = 0; i < U; i++) for (let k = 0; k < V; k++) P.push([i / (U - 1) * L, k / (V - 1) * L]);
    }
    return P;
  }

  /** Richtung des steilsten Gefälles in der Tangentialebene, als Einheitsvektor [dx, dy, dz] (dz < 0), oder null in der Ebene.
      Für die Fläche z = h(x, y) mit Gradient g und Normale n = (−gx, −gy, 1)/√(1 + |g|²) ist die Projektion von (0, 0, −1) in die
      Tangentialebene proportional zu (−gx, −gy, −|g|²); waagerecht kommt also der Anteil 1/√(1 + |g|²) eines Schritts an. */
  function gefaelle(G, x, y) {
    const g = Szenen.gradient(G, x, y), b = Math.hypot(g[0], g[1]);
    if (b < 1e-12) return null;
    const L = Math.sqrt(1 + b * b);
    return [-g[0] / (b * L), -g[1] / (b * L), -b / L];
  }

  /** neuer Fließweg ab (x, y) */
  function fliessweg(G, x, y, eigen = false) {
    x = Math.max(0, Math.min(G.groesse, x)); y = Math.max(0, Math.min(G.groesse, y));
    return { pkt: [[x, y, Szenen.hoehe(G, x, y)]], aktiv: true, grund: null, laenge: 0, eigen, iTief: 0, lTief: 0 };
  }

  /** ein Schritt eines Fließwegs (der Länge s entlang der Fläche). Abbruchgründe: „flach“ (kein Gefälle), „stillstand“
      (neuer Punkt = alter, z. B. am Rand festgehalten), „max“ (5000 Schritte) wie die Komponente; dazu „senke“: seit
      SENKE_SCHRITTE Schritten kaum vom Fleck gekommen (pendelt in einer Mulde) → Weg endet an seinem Tiefpunkt.
      Ein Schritt darf kurz bergauf führen (Zickzack quer über eine Rinne), wie bei der Komponente. */
  function schreite(G, w, s) {
    if (!w.aktiv) return w;
    const a = w.pkt[w.pkt.length - 1], d = gefaelle(G, a[0], a[1]);
    if (!d) { w.aktiv = false; w.grund = "flach"; return w; }
    const x = Math.max(0, Math.min(G.groesse, a[0] + d[0] * s)), y = Math.max(0, Math.min(G.groesse, a[1] + d[1] * s)), h = Szenen.hoehe(G, x, y);
    const l = Math.hypot(x - a[0], y - a[1], h - a[2]);
    if (l < EPS) { w.aktiv = false; w.grund = "stillstand"; return w; }
    w.pkt.push([x, y, h]); w.laenge += l;
    if (h < w.pkt[w.iTief][2]) { w.iTief = w.pkt.length - 1; w.lTief = w.laenge; }
    const n = w.pkt.length - 1, alt = n >= SENKE_SCHRITTE ? w.pkt[n - SENKE_SCHRITTE] : null;
    if (alt && Math.hypot(x - alt[0], y - alt[1]) < SENKE_RADIUS * s) {
      w.pkt.length = w.iTief + 1; w.laenge = w.lTief; w.aktiv = false; w.grund = "senke"; return w;
    }
    if (w.pkt.length - 1 >= MAX_SCHRITTE) { w.aktiv = false; w.grund = "max"; }
    return w;
  }

  /** Neuer Zustand: Gelände, Startpunkte, je Startpunkt ein (noch leerer) Fließweg */
  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const G = Szenen.gelaende(zufall, GELAENDE);
    const z = { t: 0, G, b: G.groesse, h: G.groesse, zufall };
    z.start = startpunkte(G, p.punkte, p.zufaellig, zufall);
    z.wege = z.start.map(q => fliessweg(G, q[0], q[1]));
    z.aktiv = z.wege.length;
    return z;
  }

  /** Ein Schritt: jeder noch laufende Fließweg wächst um einen Schritt der Schrittweite */
  function schritt(z, p) {
    const s = Math.max(0.01, (p && p.schrittweite) || STANDARD.schrittweite);
    let a = 0;
    for (const w of z.wege) { schreite(z.G, w, s); if (w.aktiv) a++; }
    z.aktiv = a; z.t++;
    return z;
  }

  /** zusätzlichen Regentropfen setzen (wächst bei den folgenden Schritten mit) */
  function tropfen(z, x, y) { const w = fliessweg(z.G, x, y, true); z.wege.push(w); z.aktiv++; return w; }

  const fertig = z => z.aktiv === 0;

  /** Kennzahlen aller Fließwege: Zahl, mittlere und größte Länge (m, entlang der Fläche), mittlerer Höhenverlust, Abbruchgründe */
  function auswertung(z) {
    let summe = 0, max = 0, fall = 0; const gruende = { senke: 0, stillstand: 0, flach: 0, max: 0 };
    for (const w of z.wege) {
      summe += w.laenge; if (w.laenge > max) max = w.laenge;
      fall += w.pkt[0][2] - w.pkt[w.pkt.length - 1][2];
      if (w.grund) gruende[w.grund]++;
    }
    const n = z.wege.length || 1;
    return { anzahl: z.wege.length, mittel: summe / n, max, fall: fall / n, gruende };
  }

  /** Schrittweite ohne Neustart (wirkt auf die folgenden Schritte) */
  function aendere() {}

  return { STANDARD, GELAENDE, MAX_SCHRITTE, EPS, SENKE_SCHRITTE, SENKE_RADIUS, rasterTeilung, startpunkte, gefaelle, fliessweg, schreite, erzeuge, schritt, tropfen, fertig, auswertung, aendere };
});
