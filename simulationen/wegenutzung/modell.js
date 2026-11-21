/* Wegenutzung und das Finden kürzester Pfade · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung von 342_kuerzestePfade = 15_Wegenutzung („Rythmen im städtischen Verkehr“, Version 1.0 vom 26.07.2005; Projekt rhythmen.dpr,
   Units facsSteer.pas, agenten.pas) mit der Vorgängerfassung 14_graphPath („A* in Graph“, 25.07.2005); Delphi, Reinhard König.
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Regeln (ApplicationEvents1Idle, ein Durchlauf = ein Schritt):
     1. Swarming / NeigborCheck – je Knoten: alte Position merken; Nutzungswerte seiner Verbindungen um Verfallsrate/100 verringern (15);
        alle Knoten näher als „Anlager Dist.“ sind Nachbarn = Kanten des Graphen; ist der nächste Nachbar näher als „Anlager Dist.“,
        hält der Knoten an (Anlagern), ist er näher als „Anlager Dist.“ − „RepelDist.“, weicht er aus: Schritt = random(3) − 1 + (eigene − dessen Position) / 20.
     2. Maus (Radius): Knoten im Radius springen um ±round((Position − Maus) · 0,1); Torus; Position += round(Schritt).
     3. 15: zufällige Start- und Zielknoten (rndWays); 14: Start/Ziel per Klick. A* im Graphen (findPath): G = G(Vorgänger) + Strecke,
        H = Luftlinie, offene Liste absteigend nach F, der letzte Eintrag wird expandiert, Ziel gefunden beim Aufnehmen.
     4. Verbinden – entlang des gefundenen Pfades steigt die Nutzung jedes Abschnitts um „Stärke der Weg-Markierung“/10, solange sie unter 15 liegt;
        Linienstärke der Verbindungen 1 + round(Nutzung).
   Delphis Round rundet ,5 zur geraden Zahl (rundeD). */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const BREITE = 770, HOEHE = 451;                         // ImagePaint 770 × 451 px
  const LINKS = 7 - 5, OBEN = 11 - 5, RECHTS = BREITE - 5, UNTEN = HOEHE - 5;   // LEFT_BORDER … BOTTOM_BORDER (ImagePaint.Left/Top = 7/11)
  const NUTZUNG_MAX = 15;                                  // If Usage < 15 then …

  /** Voreinstellungen von 15_Wegenutzung (facsSteer.dfm); Mausradius und Werkzeug neu */
  const STANDARD = { fassung: "15", anzahl: 50, anlDist: 90, repelDist: 20, mark: 3, decr: 1, mausRad: 60, werkzeug: "punkte" };
  /** Voreinstellungen von 14_graphPath */
  const FASSUNG14 = { anzahl: 40, anlDist: 115, repelDist: 30 };

  /** Delphi Round: kaufmännisch, aber ,5 zur geraden Zahl (Banker's Rounding) */
  function rundeD(x) {
    const f = Math.floor(x), d = x - f;
    if (d > 0.5) return f + 1;
    if (d < 0.5) return f;
    return f % 2 === 0 ? f : f + 1;
  }
  const dist = (ax, ay, bx, by) => rundeD(Math.sqrt((ax - bx) * (ax - bx) + (ay - by) * (ay - by)));   // CalcDistance

  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const z = { t: 0, zufall, breite: BREITE, hoehe: HOEHE, n: 0, x: [], y: [], sx: [], sy: [], ox: [], oy: [], nb: [], nutzung: new Float64Array(0),
                start: -1, ziel: -1, pfad: [], gefunden: false, maus: null, fassung: p.fassung };
    erstelleKnoten(z, p, p.anzahl);
    return z;
  }

  /** Button_CreateClick: anzahl Knoten an zufälligen Orten mit Schritt random(3) − 1; Start = erster, Ziel = letzter Knoten */
  function erstelleKnoten(z, p, anzahl) {
    for (let i = 0; i < anzahl; i++) neuerKnoten(z, z.zufall.ganz(BREITE), z.zufall.ganz(HOEHE));
    if (z.n > 0) { z.start = 0; z.ziel = z.n - 1; }
    nurNachbarn(z, p);
  }
  /** Nachbarlisten ohne Anlagern (zum Zeichnen des Graphen vor dem ersten Schritt) */
  function nurNachbarn(z, p) {
    for (let i = 0; i < z.n; i++) {
      z.nb[i] = [];
      for (let k = 0; k < z.n; k++) if (k !== i && dist(z.x[k], z.y[k], z.x[i], z.y[i]) < p.anlDist) z.nb[i].push(k);
    }
  }
  /** erstelleNode + erstelleEdges (Nutzungsmatrix auf n × n erweitern) */
  function neuerKnoten(z, x, y) {
    z.x.push(Math.round(x)); z.y.push(Math.round(y)); z.sx.push(z.zufall.dreh()); z.sy.push(z.zufall.dreh());
    z.ox.push(Math.round(x)); z.oy.push(Math.round(y)); z.nb.push([]);
    const n = z.n + 1, alt = z.nutzung, neu = new Float64Array(n * n);
    for (let a = 0; a < z.n; a++) for (let b = 0; b < z.n; b++) neu[a * n + b] = alt[a * z.n + b];
    z.nutzung = neu; z.n = n;
    return n - 1;
  }
  /** Button_DeleteClick: die letzten 10 Knoten entfernen (nur bei mindestens 10) */
  function loesche10(z) {
    if (z.n < 10) return false;
    const n = z.n - 10, neu = new Float64Array(n * n);
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) neu[a * n + b] = z.nutzung[a * z.n + b];
    for (const k of ["x", "y", "sx", "sy", "ox", "oy", "nb"]) z[k].length = n;
    z.nutzung = neu; z.n = n;
    for (let i = 0; i < n; i++) z.nb[i] = z.nb[i].filter(k => k < n);
    if (z.start >= n) z.start = n - 1; if (z.ziel >= n) z.ziel = n - 1;
    z.pfad = []; z.gefunden = false;
    return true;
  }

  /** NeigborCheck + Anlagern für Knoten i (Nachbarn nach den Positionen zu Beginn des Durchlaufs) */
  function nachbarCheck(z, i, p, verfall) {
    const n = z.n, u = z.nutzung;
    if (verfall) for (let k = 0; k < n; k++) if (u[i * n + k] > 0) u[i * n + k] -= p.decr / 100;
    const nb = [];
    let kurz = 1000, naechster = -1;
    for (let k = 0; k < n; k++) {
      if (k === i) continue;
      const d = dist(z.x[k], z.y[k], z.x[i], z.y[i]);
      if (d < p.anlDist) nb.push(k);
      if (d < kurz) { kurz = d; naechster = k; }
    }
    z.nb[i] = nb;
    if (kurz < p.anlDist) {                                         // Anlagern: für jeden Nachbarn anhalten, ggf. abstoßen
      for (let j = 0; j < nb.length; j++) {
        z.sx[i] = 0; z.sy[i] = 0;
        if (kurz < p.anlDist - p.repelDist) {
          z.sx[i] = z.zufall.dreh() + (-1 * (z.x[naechster] - z.x[i])) / 20;
          z.sy[i] = z.zufall.dreh() + (-1 * (z.y[naechster] - z.y[i])) / 20;
        }
      }
    }
  }

  /** Maus, Torus und Bewegung eines Knotens */
  function bewege(z, i, p) {
    const m = z.maus;
    if (m && p.mausRad > 0 && dist(z.x[i], z.y[i], m.x, m.y) < p.mausRad) {
      z.sx[i] = m.dir * rundeD((z.x[i] - m.x) * 0.1);
      z.sy[i] = m.dir * rundeD((z.y[i] - m.y) * 0.1);
    }
    if (z.x[i] < LINKS) z.x[i] = RECHTS; else if (z.x[i] > RECHTS) z.x[i] = LINKS;     // Randlos Torus (vor der Bewegung)
    if (z.y[i] < OBEN) z.y[i] = UNTEN; else if (z.y[i] > UNTEN) z.y[i] = OBEN;
    z.x[i] += rundeD(z.sx[i]); z.y[i] += rundeD(z.sy[i]);
  }

  /** findPath: A* vom Start zum Ziel über die Nachbarlisten; liefert pfadList (vom Ziel zurück, ohne Start) oder [] */
  function findePfad(z, s, ziel) {
    const n = z.n;
    if (s < 0 || ziel < 0 || s >= n || ziel >= n) return [];
    const F = new Float64Array(n), G = new Float64Array(n), H = new Float64Array(n), vorg = new Int32Array(n).fill(-1);
    const zu = new Uint8Array(n), inOffen = new Uint8Array(n), offen = [s];
    inOffen[s] = 1;
    const calcF = (v, me) => { G[me] = G[v] + dist(z.x[v], z.y[v], z.x[me], z.y[me]); H[me] = dist(z.x[ziel], z.y[ziel], z.x[me], z.y[me]); F[me] = G[me] + H[me]; };
    let gefunden = false;
    while (offen.length && !gefunden) {
      const expl = offen[offen.length - 1];
      zu[expl] = 1;
      for (const c of z.nb[expl]) {
        if (zu[c]) continue;
        if (!inOffen[c]) { calcF(expl, c); vorg[c] = expl; offen.push(c); inOffen[c] = 1; if (c === ziel) gefunden = true; }
        else { const aG = G[c], aH = H[c], aF = F[c]; calcF(expl, c); if (aG < G[c]) { G[c] = aG; H[c] = aH; F[c] = aF; } else vorg[c] = expl; }
      }
      offen.sort((a, b) => F[b] - F[a]);
      offen.splice(offen.indexOf(expl), 1); inOffen[expl] = 0;
    }
    const pfad = [];
    if (gefunden) { let k = ziel; while (k !== s && k >= 0 && pfad.length <= n) { pfad.push(k); k = vorg[k]; } pfad.push(s); }
    return pfad;                                                    // hier mit dem Start am Ende (zum Zeichnen)
  }

  /** Verbinden: Nutzung der Abschnitte des Pfades erhöhen (Vorgänger → Knoten), solange unter 15 */
  function markiere(z, pfad, p) {
    const n = z.n;
    for (let j = 0; j + 1 < pfad.length; j++) {
      const a = pfad[j], b = pfad[j + 1];                           // b = a.vorg
      if (z.nutzung[b * n + a] < NUTZUNG_MAX) z.nutzung[b * n + a] += p.mark / 10;
    }
  }

  /** Ein Durchlauf von ApplicationEvents1Idle; erhöht z.t */
  function schritt(z, p) {
    const n = z.n, mitNutzung = p.fassung !== "14";
    for (let i = 0; i < n; i++) { z.ox[i] = z.x[i]; z.oy[i] = z.y[i]; nachbarCheck(z, i, p, mitNutzung); }
    for (let i = 0; i < n; i++) bewege(z, i, p);
    z.gefunden = false; z.pfad = [];
    if (n > 1) {
      if (mitNutzung) { z.start = z.zufall.ganz(n); z.ziel = z.zufall.ganz(n); }   // rndWays
      z.pfad = findePfad(z, z.start, z.ziel);
      z.gefunden = z.pfad.length > 0;
      if (z.gefunden && mitNutzung) markiere(z, z.pfad, p);
    }
    z.t++;
    return z;
  }

  /** Parameter ohne Neustart: „Anlager Dist.“ setzt alle Knoten wieder in Bewegung (ScrollBar_DistRotChange) */
  function aendere(z, p, id) {
    if (id === "anlDist") for (let i = 0; i < z.n; i++) { z.sx[i] = z.zufall.dreh(); z.sy[i] = z.zufall.dreh(); }
  }

  /** nächster Knoten zu (x, y) (ImagePaintMouseUp) */
  function naechster(z, x, y) {
    let best = 10000, k = -1;
    for (let i = 0; i < z.n; i++) { const d = dist(x, y, z.x[i], z.y[i]); if (d < best) { best = d; k = i; } }
    return k;
  }

  /** Kanten als ungerichtete Paare [a, b] (a < b) mit der größeren der beiden Nutzungen */
  function kanten(z) {
    const n = z.n, L = [];
    for (let a = 0; a < n; a++) for (const b of z.nb[a]) if (a < b) L.push([a, b, Math.max(z.nutzung[a * n + b], z.nutzung[b * n + a])]);
    return L;
  }

  /** Auswertung: Knoten in Ruhe, Kanten, mittlere Nutzung, Lage der Nutzung zur Mitte (genutzt gewichteter / einfacher mittlerer Abstand der Kantenmitten) */
  function auswertung(z) {
    let ruhe = 0;
    for (let i = 0; i < z.n; i++) if (z.sx[i] === 0 && z.sy[i] === 0) ruhe++;
    const K = kanten(z), cx = BREITE / 2, cy = HOEHE / 2;
    let s = 0, sw = 0, w = 0, max = 0;
    for (const [a, b, u] of K) {
      const d = Math.hypot((z.ox[a] + z.ox[b]) / 2 - cx, (z.oy[a] + z.oy[b]) / 2 - cy);
      s += d; const q = Math.max(0, u); sw += q * d; w += q; if (u > max) max = u;
    }
    return { ruhe: z.n ? ruhe / z.n : 0, kanten: K.length, maxNutzung: max, mittelNutzung: K.length ? w / K.length : 0,
             mitte: w > 0 && K.length ? (sw / w) / (s / K.length) : null };
  }

  return { STANDARD, FASSUNG14, BREITE, HOEHE, LINKS, OBEN, RECHTS, UNTEN, NUTZUNG_MAX, rundeD, dist, erzeuge, schritt, aendere,
           erstelleKnoten, neuerKnoten, loesche10, nachbarCheck, bewege, findePfad, markiere, naechster, kanten, auswertung };
});
