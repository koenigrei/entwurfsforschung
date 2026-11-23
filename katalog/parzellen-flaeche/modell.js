/* Parzellierung nach Fläche · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung des Grasshopper-Moduls „Parcellation By Area“ aus dem Parametric Planning Catalogue (DeCodingSpaces – Martin Dennemark).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Verfahren wie die drei C#-Skripte der .gh-Datei (EqualAreaGreedy, EqualAreaVector, AreaListGreedy), die auf polysplit von
   Gediminas Rimša beruhen (https://github.com/grimsa/polysplit, MIT, nach Sumit Khetarpal): In jedem Schritt werden alle Paare
   nicht benachbarter Kanten des Restpolygons geprüft. Für jedes Paar wird eine Schnittlinie von Kante A nach Kante B gesucht,
   die genau die Zielfläche abtrennt; unter den gültigen Linien (schneidet den Rand nur an ihren Endpunkten) gewinnt die kürzeste
   („cut by minimal distance“) oder die mit dem kleinsten Winkel zur Richtung dir („cut by vector direction“, dir = längste
   Blockkante × Z). Das abgetrennte Stück ist eine Parzelle, mit dem Rest geht es weiter.
   Vereinfachung gegenüber polysplit: statt der Dreieck-/Trapez-Formeln wird für jedes Kantenpaar die ganze Schar der Linien
   pA(u)–pB(v) betrachtet; die Fläche ist bei festem u linear in v, v(u) folgt geschlossen, u wird abgetastet und verfeinert. */
(function (wurzel, fabrik) {
  const node = typeof module === "object" && module.exports;
  const M = fabrik(node ? require("../_gemeinsam/geo.js") : wurzel.Geo, node ? require("../_gemeinsam/szenen.js") : wurzel.Szenen);
  if (node) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Geo, Szenen) {
  "use strict";

  /** Voreinstellungen der .gh-Datei: Werteliste „Parcellation Option“ = Equal Area – cut by minimal distance;
      n = 5 [0..10] (je ein Regler für EqualAreaGreedy und EqualAreaVector, beide 5); Range Steps = 7 [0..10] für die Flächenliste */
  const STANDARD = { option: "greedy", n: 5, stufen: 7 };
  const OPTIONEN = [
    ["greedy", "Equal Area - cut by minimal distance"],
    ["vektor", "Equal Area - cut by vector direction"],
    ["liste", "Inidividual Area - cut by minimal distance"]
  ];

  /** Beispielquartier: verzogenes Straßenraster, nur Blöcke (Gebäude und Platz aus) – an Stelle von „Polygons from lines“ der .gh-Datei */
  function quartier(zufall) {
    const s = Szenen.stadt(zufall, { b: 720, h: 500, nx: 7, ny: 6, strasse: 14, gebaeude: false, platz: false, kirche: false });
    s.bloecke = s.bloecke.map(b => Geo.flaecheS(b) < 0 ? b.slice().reverse() : b);
    return s;
  }

  /* ---------------------------------------------------------------- Flächenliste (AreaListGreedy) */
  /** Range(0..1, Steps) → Consecutive Domains (Additive) → Remap Numbers (Quelle 0..Mass Addition, Ziel 0..1):
      Die Domänen [S(k−1), S(k)] der aufsummierten Range-Werte haben die Längen k/Steps; geteilt durch die Summe aller Range-Werte
      ergibt das die Anteile k / (1 + 2 + … + Steps), k = 1 … Steps – Summe 1 („Sum of areas needs to be 1 = 100%“). */
  function flaechenListe(stufen) {
    const s = Math.round(stufen);
    if (s < 1) return [];
    const range = []; for (let k = 0; k <= s; k++) range.push(k / s);           // Range: Steps + 1 Werte
    const summe = range.reduce((a, b) => a + b, 0);                              // Mass Addition
    const domaenen = []; let S = range[0];
    for (let k = 1; k < range.length; k++) { domaenen.push([S, S + range[k]]); S += range[k]; }   // Consecutive Domains, additiv
    return domaenen.map(d => (d[1] - d[0]) / summe);                             // Remap Numbers (Länge der Domäne)
  }

  /** „Simplified approach to get the vector of a polygon pointing away from longest line“: längste Kante × Z (Cross Product, Unit Z) */
  function richtungVonLaengsterKante(poly) {
    let best = -1, e = [1, 0];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length], l = Geo.abstand(a, b);
      if (l > best) { best = l; e = [b[0] - a[0], b[1] - a[1]]; }
    }
    const v = [e[1], -e[0]], l = Math.hypot(v[0], v[1]) || 1;   // (ex, ey, 0) × (0, 0, 1) = (ey, −ex, 0)
    return [v[0] / l, v[1] / l];
  }

  /* ---------------------------------------------------------------- Schnitt (polysplit, vereinfacht) */
  const kreuz = (a, b) => a[0] * b[1] - a[1] * b[0];
  /** echter Schnitt der Strecken pq und ab (Berührung an Endpunkten zählt nicht) */
  function kreuzen(p, q, a, b, eps) {
    const o = (x, y, z) => (y[0] - x[0]) * (z[1] - x[1]) - (y[1] - x[1]) * (z[0] - x[0]);
    const d1 = o(p, q, a), d2 = o(p, q, b), d3 = o(a, b, p), d4 = o(a, b, q);
    return ((d1 > eps && d2 < -eps) || (d1 < -eps && d2 > eps)) && ((d3 > eps && d4 < -eps) || (d3 < -eps && d4 > eps));
  }
  /** Ist die Linie pA–pB ein gültiger Schnitt? Kreuzt keine Kante außer i und j, Mitte liegt im Polygon
      (entspricht „höchstens 2 Schnittpunkte mit dem Polygon“ der Skripte) */
  function gueltig(P, i, j, pA, pB) {
    const n = P.length, L = Geo.abstand(pA, pB);
    if (L < 1e-6) return false;
    const eps = 1e-9 * L * L;
    for (let k = 0; k < n; k++) {
      if (k === i || k === j) continue;
      if (kreuzen(pA, pB, P[k], P[(k + 1) % n], eps)) return false;
    }
    return Geo.punktInPoly(Geo.lerp(pA, pB, 0.5), P);
  }

  /** Alle Kandidaten eines Kantenpaares (i, j) für die Fläche T der Seite „zwischen“ A und B, also [pA, P[i+1] … P[j], pB].
      pA(u) = P[i+1] + u·(P[i] − P[i+1]),  pB(v) = P[j] + v·(P[j+1] − P[j]).
      2·Fläche = C + (b0 × a0) + u·K1 + v·(L0 + u·L1)  → v(u) geschlossen. Rückgabe: Funktion u → {pA, pB, u, v} oder null */
  function schar(P, i, j, T) {
    const n = P.length, a0 = P[(i + 1) % n], b0 = P[j], da = [P[i][0] - a0[0], P[i][1] - a0[1]], db = [P[(j + 1) % n][0] - b0[0], P[(j + 1) % n][1] - b0[1]];
    let C = 0; for (let k = i + 1; k < j; k++) C += kreuz(P[k], P[k + 1]);
    const K0 = C + kreuz(b0, a0), K1 = kreuz(da, a0) + kreuz(b0, da), L0 = kreuz(b0, db) + kreuz(db, a0), L1 = kreuz(db, da);
    return u => {
      const nenner = L0 + u * L1;
      if (Math.abs(nenner) < 1e-12) return null;
      const v = (2 * T - K0 - u * K1) / nenner;
      if (v < -1e-9 || v > 1 + 1e-9) return null;
      const vv = Math.max(0, Math.min(1, v));
      return { u, v: vv, pA: [a0[0] + u * da[0], a0[1] + u * da[1]], pB: [b0[0] + vv * db[0], b0[1] + vv * db[1]] };
    };
  }

  /** Bewertung eines Schnitts: Länge (minimal distance) oder Winkel zu dir (vector direction, ohne Vorzeichen der Richtung) */
  function bewerte(pA, pB, modus, dir) {
    const L = Geo.abstand(pA, pB);
    if (modus !== "vektor") return L;
    const c = Math.abs(((pB[0] - pA[0]) * dir[0] + (pB[1] - pA[1]) * dir[1]) / (L || 1));
    return Math.acos(Math.min(1, c)) + 1e-9 * L;
  }

  /** Beste Linie eines Kantenpaares für die Seitenfläche T: u abtasten (N Stellen), dann um das beste u verfeinern (Goldener Schnitt) */
  function besterSchnittPaar(P, i, j, T, modus, dir, N = 48) {
    const f = schar(P, i, j, T);
    const wert = u => { const k = f(u); if (!k || !gueltig(P, i, j, k.pA, k.pB)) return null; k.w = bewerte(k.pA, k.pB, modus, dir); return k; };
    let best = null, bu = -1;
    for (let s = 0; s <= N; s++) { const k = wert(s / N); if (k && (!best || k.w < best.w)) { best = k; bu = s / N; } }
    if (!best) return null;
    let lo = Math.max(0, bu - 1 / N), hi = Math.min(1, bu + 1 / N);
    const g = (Math.sqrt(5) - 1) / 2, w = u => { const k = wert(u); return k ? k : { w: Infinity }; };
    let x1 = hi - g * (hi - lo), x2 = lo + g * (hi - lo), k1 = w(x1), k2 = w(x2);
    for (let it = 0; it < 28; it++) {
      if (k1.w < k2.w) { hi = x2; x2 = x1; k2 = k1; x1 = hi - g * (hi - lo); k1 = w(x1); }
      else { lo = x1; x1 = x2; k1 = k2; x2 = lo + g * (hi - lo); k2 = w(x2); }
    }
    for (const k of [k1, k2]) if (k.w < best.w) best = k;
    return best;
  }

  /** Polygon an der Linie pA (auf Kante i) – pB (auf Kante j) teilen → [zwischen, aussen]; „zwischen“ = Seite mit P[i+1] … P[j] */
  function teileAn(P, i, j, pA, pB) {
    const n = P.length, zwischen = [pA], aussen = [pB];
    for (let k = i + 1; k <= j; k++) zwischen.push(P[k]);
    zwischen.push(pB);
    for (let k = j + 1; k <= i + n; k++) aussen.push(P[k % n]);
    aussen.push(pA);
    return [Geo.bereinige(zwischen, 1e-7), Geo.bereinige(aussen, 1e-7)];
  }

  /** Ein Schnitt (split der Skripte): trennt die Fläche ziel vom Polygon ab.
      modus "greedy"/"liste": kürzeste gültige Linie; "vektor": kleinster Winkel zu dir.
      → {parzelle, rest, linie: [pA, pB], laenge, kandidaten} oder null, wenn kein gültiger Schnitt existiert */
  function schneide(P, ziel, modus = "greedy", dir = [1, 0]) {
    const n = P.length, A = Geo.flaeche(P);
    if (n < 4 || !(ziel > 1e-9 * A) || ziel >= A * (1 - 1e-9)) return null;
    let best = null, kandidaten = 0;
    for (let i = 0; i < n - 2; i++) for (let j = i + 2; j < n; j++) {
      if (j - i + 1 === n) break;                       // Kanten benachbart über den Anfang (wie segmentsCovered == Count)
      for (const seite of [0, 1]) {                     // 0: abgetrennt wird „zwischen“ A und B; 1: die andere Seite
        const T = seite === 0 ? ziel : A - ziel;
        const k = besterSchnittPaar(P, i, j, T, modus, dir);
        if (!k) continue;
        kandidaten++;
        if (!best || k.w < best.w - 1e-12) best = Object.assign(k, { i, j, seite });
      }
    }
    if (!best) return null;
    const [zw, au] = teileAn(P, best.i, best.j, best.pA, best.pB);
    const parzelle = best.seite === 0 ? zw : au, rest = best.seite === 0 ? au : zw;
    return { parzelle, rest, linie: [best.pA, best.pB], laenge: Geo.abstand(best.pA, best.pB), kandidaten };
  }

  /** Zielflächen eines Blocks: gleich (A/n, n − 1 Schnitte) oder Liste (Anteil × A; der letzte Anteil ist der Rest) */
  function zielflaechen(A, p) {
    if (p.option === "liste") {
      const f = flaechenListe(p.stufen), z = []; let summe = 0;
      if (f.reduce((a, b) => a + b, 0) > 1 + 1e-9) return [];       // „Sum of area should be less than 1!“
      for (const x of f) { summe += x; if (summe < 1 - 1e-9) z.push(x * A); }
      return z;
    }
    const n = Math.round(p.n);
    if (n < 2) return [];                                            // „Number of parts should be greater than 1!“
    return new Array(n - 1).fill(A / n);
  }

  /** ganzen Block parzellieren (für Tests und Nachrechnen) */
  function parzelliere(poly, param) {
    const p = Object.assign({}, STANDARD, param), A = Geo.flaeche(poly), dir = richtungVonLaengsterKante(poly);
    let rest = poly; const parzellen = [], linien = [];
    for (const ziel of zielflaechen(A, p)) {
      const s = schneide(rest, ziel, p.option === "vektor" ? "vektor" : "greedy", dir);
      if (!s) break;
      parzellen.push(s.parzelle); linien.push(s.linie); rest = s.rest;
    }
    parzellen.push(rest);
    return { parzellen, linien, dir };
  }

  /* ---------------------------------------------------------------- Zustand und Ablauf */
  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const szene = quartier(zufall);
    const bloecke = szene.bloecke.map(poly => {
      const A = Geo.flaeche(poly);
      return { poly, A, dir: richtungVonLaengsterKante(poly), ziele: zielflaechen(A, p), rest: poly, parzellen: [], linien: [], fehl: false };
    });
    // Ablaufplan: erst der erste Schnitt in allen Blöcken, dann der zweite …
    const plan = [], maxZ = Math.max(0, ...bloecke.map(b => b.ziele.length));
    for (let k = 0; k < maxZ; k++) bloecke.forEach((b, bi) => { if (k < b.ziele.length) plan.push([bi, k]); });
    return { t: 0, szene, b: szene.b, h: szene.h, bloecke, plan, pos: 0, wahl: -1, letzter: null };
  }

  /** Ein Schritt = ein Schnitt in einem Block (Blöcke reihum) */
  function schritt(z, param) {
    const p = Object.assign({}, STANDARD, param);
    while (z.pos < z.plan.length) {
      const [bi, k] = z.plan[z.pos++], b = z.bloecke[bi];
      if (b.fehl) continue;
      const s = schneide(b.rest, b.ziele[k], p.option === "vektor" ? "vektor" : "greedy", b.dir);
      if (!s) { b.fehl = true; continue; }
      b.parzellen.push(s.parzelle); b.linien.push(s.linie); b.rest = s.rest;
      z.letzter = { bi, linie: s.linie, laenge: s.laenge };
      break;
    }
    z.t++;
    return z;
  }

  const fertig = z => z.pos >= z.plan.length;
  /** Parzellen eines Blocks im aktuellen Zustand (abgetrennte Stücke und der Rest) */
  const parzellenVon = b => b.parzellen.concat([b.rest]);
  /** Block unter dem Punkt q (Index oder −1) */
  function blockBei(z, q) { return z.bloecke.findIndex(b => Geo.punktInPoly(q, b.poly)); }

  function aendere() {}

  return { STANDARD, OPTIONEN, quartier, flaechenListe, richtungVonLaengsterKante, schar, gueltig, besterSchnittPaar, teileAn, schneide,
           zielflaechen, parzelliere, erzeuge, schritt, aendere, fertig, parzellenVon, blockBei };
});
