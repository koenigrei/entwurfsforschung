/* Erreichbarkeit und Gravitationsmodell · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung von 310_Gravitation = 18_Gravitation („Erreichbarkeitsanalyse“ Version 1.1 vom 23.11.2005, Unit GravForm.pas)
   mit der Vorgängerfassung 17_Erreichbarkeit (Version 1.0 vom 17.11.2005, Unit Erreichbarkeit.pas); Delphi, Reinhard König.
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Regeln:
     Erreichbarkeit (TB_findPathClick) – Für jedes geordnete Knotenpaar (i, j), i ≠ j, sucht A* (findPath) einen Weg im gezeichneten
       Graphen; die Anzahl der Knoten im gefundenen Pfad ohne den Startknoten (pfadList.Count, also die Zahl der Kanten) ist die
       Entfernung k_ij, ohne Weg 0. Zeilensumme Σ_j k_ij = Verknüpftheit des Knotens (niedriger = besser erreichbar),
       dLänge = Zeilensumme / Zahl der positiven Werte; Gesamtsumme = Streuwert; mittlere Verbindungslänge = Streuwert / alle positiven Werte.
     A* (checkNeighbour, calcF) – G = G(Vorgänger) + gerundete Strecke, H = gerundete Luftlinie zum Ziel, F = G + H; offene Liste absteigend
       nach F sortiert, der letzte Eintrag wird expandiert; Ziel gefunden, sobald es in die offene Liste kommt.
     Gravitationsmodell (verbindeNodes, Schalter TB_Stoeme) – für jede gezeichnete Verbindung F_ij = P_i · P_j / d_ij
       (d = gerundete Strecke in Bildpunkten); Linienstärke 1 + round(F_ij). Die Formel der Beschreibung teilt durch d²
       (Auswahl „Distanzexponent“). */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const BREITE = 500, HOEHE = 400;      // ZeichenPanel 500 × 400 px
  const ZELLE = 20;                     // cellScal: Zellenraster im Hintergrund
  const P_START = 20, P_MIN = 15, P_MAX = 200;   // TNode.Create: Popul 20; Strg + Ziehen: 15 … 200

  /** Voreinstellungen (Originalwerte; Knoten zu Beginn und Werkzeug sind neu) */
  const STANDARD = { knoten: 9, stroeme: true, exponent: "1", faktor: 1, werkzeug: "knoten", sofort: true };

  const dist = (a, b) => Math.round(Math.hypot(a.x - b.x, a.y - b.y));   // CalcDistance: round(sqrt(…))

  /** Neuer Zustand: Graph aus p.knoten zufälligen Knoten (neu – das Original begann leer), je mit den zwei nächsten verbunden, zusammenhängend */
  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const z = { t: 0, zufall, breite: BREITE, hoehe: HOEHE, nodes: [], kanten: [], analyse: null, wahl: -1 };
    let versuche = 0;
    while (z.nodes.length < p.knoten && versuche++ < 5000) {
      const n = { x: Math.round(zufall.zwischen(40, BREITE - 40)), y: Math.round(zufall.zwischen(40, HOEHE - 40)), P: P_MIN + zufall.ganz(26) };
      if (z.nodes.every(m => dist(m, n) >= 70)) z.nodes.push(n);
    }
    const N = z.nodes.length;
    for (let i = 0; i < N; i++) {
      const nah = z.nodes.map((m, j) => [dist(z.nodes[i], m), j]).filter(e => e[1] !== i).sort((a, b) => a[0] - b[0]).slice(0, 2);
      for (const [, j] of nah) verbinde(z, i, j);
    }
    // Komponenten über die kürzeste fehlende Verbindung zusammenfügen
    for (;;) {
      const k = komponenten(z); if (Math.max(...k, 0) === 0) break;
      let best = null;
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (k[i] === 0 && k[j] !== 0) { const d = dist(z.nodes[i], z.nodes[j]); if (!best || d < best[0]) best = [d, i, j]; }
      verbinde(z, best[1], best[2]);
    }
    z.analyse = neueAnalyse(z);
    return z;
  }

  /** Komponentennummer je Knoten (Breitensuche) */
  function komponenten(z) {
    const N = z.nodes.length, k = new Array(N).fill(-1), nb = nachbarn(z);
    let c = 0;
    for (let s = 0; s < N; s++) {
      if (k[s] >= 0) continue;
      const q = [s]; k[s] = c;
      while (q.length) { const u = q.pop(); for (const v of nb[u]) if (k[v] < 0) { k[v] = c; q.push(v); } }
      c++;
    }
    return k;
  }

  /** NachbList je Knoten in der Reihenfolge, in der die Verbindungen gezogen wurden (beide Richtungen) */
  function nachbarn(z) {
    const nb = z.nodes.map(() => []);
    for (const [a, b] of z.kanten) { nb[a].push(b); nb[b].push(a); }
    return nb;
  }

  /** Verbindung herstellen (Node_MouseUp mit ALT); doppelte Verbindungen werden nicht angelegt. true bei Änderung */
  function verbinde(z, a, b) {
    if (a === b || a < 0 || b < 0 || hatKante(z, a, b) >= 0) return false;
    z.kanten.push([a, b]); return true;
  }
  const hatKante = (z, a, b) => z.kanten.findIndex(([u, v]) => (u === a && v === b) || (u === b && v === a));
  function trenne(z, a, b) { const k = hatKante(z, a, b); if (k < 0) return false; z.kanten.splice(k, 1); return true; }

  /** findPath: A* von s nach ziel im Graphen; liefert die pfadList (Knoten vom Ziel zurück, ohne den Start) oder [] */
  function findePfad(z, s, ziel, nb) {
    nb = nb || nachbarn(z);
    const N = z.nodes.length, F = new Float64Array(N), G = new Float64Array(N), H = new Float64Array(N);
    const vorg = new Int32Array(N).fill(-1), zu = new Uint8Array(N), inOffen = new Uint8Array(N);
    const nd = z.nodes, offen = [s]; inOffen[s] = 1;
    const calcF = (v, me) => { G[me] = G[v] + dist(nd[v], nd[me]); H[me] = dist(nd[ziel], nd[me]); F[me] = G[me] + H[me]; };
    let gefunden = false;
    while (offen.length && !gefunden) {
      const expl = offen[offen.length - 1];
      zu[expl] = 1;
      for (const c of nb[expl]) {                                    // checkNeighbour
        if (zu[c]) continue;
        if (!inOffen[c]) { calcF(expl, c); vorg[c] = expl; offen.push(c); inOffen[c] = 1; if (c === ziel) gefunden = true; }
        else { const aG = G[c], aH = H[c], aF = F[c]; calcF(expl, c); if (aG < G[c]) { G[c] = aG; H[c] = aH; F[c] = aF; } else vorg[c] = expl; }
      }
      offen.sort((a, b) => F[b] - F[a]);                             // compareByF, absteigend
      offen.splice(offen.indexOf(expl), 1); inOffen[expl] = 0;
    }
    const pfad = [];
    if (gefunden) { let k = ziel; while (k !== s && k >= 0 && pfad.length <= N) { pfad.push(k); k = vorg[k]; } }
    return pfad;
  }

  /** leere Analyse: Matrix k_ij, Fortschritt (Zahl der berechneten geordneten Paare) */
  function neueAnalyse(z) {
    const N = z.nodes.length;
    return { n: N, k: Array.from({ length: N }, () => new Array(N).fill(0)), paar: 0, gesamt: N > 1 ? N * (N - 1) : 0, pfad: [], von: -1, nach: -1 };
  }

  /** Paar Nummer q (0 … N·(N−1)−1) in der Reihenfolge der Schleifen I (außen) und J (innen), J ≠ I */
  function paar(N, q) { const i = Math.floor(q / (N - 1)); let j = q % (N - 1); if (j >= i) j++; return [i, j]; }

  /** ein Knotenpaar der Erreichbarkeitsanalyse berechnen; false, wenn alle Paare fertig sind */
  function analyseSchritt(z, nb) {
    const a = z.analyse;
    if (a.paar >= a.gesamt) return false;
    const [i, j] = paar(a.n, a.paar);
    const pfad = findePfad(z, i, j, nb);
    a.k[i][j] = pfad.length;
    a.pfad = pfad; a.von = i; a.nach = j; a.paar++;
    return true;
  }
  function analyseGanz(z) { const nb = nachbarn(z); while (analyseSchritt(z, nb)); return z; }
  const fertig = z => z.analyse.paar >= z.analyse.gesamt && z.analyse.gesamt > 0;

  /** Auswertung wie DataView: Zeilensumme, Zahl der positiven Werte, dLänge (auf 2 Stellen) je Knoten; Streuwert, mittlere Länge */
  function auswertung(z) {
    const a = z.analyse, zeilen = [];
    let streu = 0, alle = 0;
    for (let i = 0; i < a.n; i++) {
      let s = 0, c = 0;
      for (let j = 0; j < a.n; j++) { s += a.k[i][j]; if (a.k[i][j] > 0) c++; }
      zeilen.push({ summe: s, positiv: c, dLaenge: c > 0 ? Math.round(s / c * 100) / 100 : 0 });
      streu += s; alle += c;
    }
    return { zeilen, streuwert: streu, mittel: alle > 0 ? Math.round(streu / alle * 100) / 100 : 0 };
  }

  /** Gravitationsmodell: Strom über eine Verbindung F = P_i · P_j / d^β (d gerundet; d = 0 → 0) */
  function strom(a, b, beta) {
    const d = dist(a, b);
    return d === 0 ? 0 : a.P * b.P / Math.pow(d, beta);
  }
  /** Linienstärke in Bildpunkten: 1 + round(faktor · F) (Original: Pen.Width := 1 + round(Usage)) */
  const linie = (F, faktor) => 1 + Math.round(faktor * F);

  /** Ein Schritt: ein Knotenpaar der Erreichbarkeitsanalyse; erhöht z.t */
  function schritt(z, p) { analyseSchritt(z); z.t++; return z; }

  /** nach einer Änderung am Graphen: Analyse zurücksetzen und bei „sofort“ ganz berechnen (Original: Knopf „fP“) */
  function geaendert(z, p) { z.analyse = neueAnalyse(z); if (p && p.sofort) analyseGanz(z); }

  /** Knoten an (x, y) (innerhalb seines Kreises, Durchmesser P), sonst −1; der oberste (zuletzt gezeichnete) gewinnt */
  function knotenBei(z, x, y) {
    for (let i = z.nodes.length - 1; i >= 0; i--) { const n = z.nodes[i]; if (Math.hypot(n.x - x, n.y - y) <= Math.max(10, n.P / 2)) return i; }
    return -1;
  }
  function neuerKnoten(z, x, y) {                                    // NodeCreate: Popul 20
    z.nodes.push({ x: Math.round(Math.max(0, Math.min(BREITE, x))), y: Math.round(Math.max(0, Math.min(HOEHE, y))), P: P_START });
    return z.nodes.length - 1;
  }
  function loescheKnoten(z, i) {                                     // neu: Knoten entfernen (Verbindungen mit)
    if (i < 0) return false;
    z.nodes.splice(i, 1);
    z.kanten = z.kanten.filter(([a, b]) => a !== i && b !== i).map(([a, b]) => [a > i ? a - 1 : a, b > i ? b - 1 : b]);
    return true;
  }
  /** Strg + Ziehen: Maus unterhalb der Knotenmitte → P + 1, oberhalb → P − 1 (15 … 200) */
  function groesse(z, i, y) {
    const n = z.nodes[i]; if (!n) return false;
    if (y > n.y && n.P < P_MAX) n.P++; else if (y < n.y && n.P > P_MIN) n.P--; else return false;
    return true;
  }

  function aendere(z, p, id) {}

  return { STANDARD, BREITE, HOEHE, ZELLE, P_START, P_MIN, P_MAX, dist, erzeuge, schritt, aendere, nachbarn, komponenten, verbinde, trenne, hatKante,
           findePfad, neueAnalyse, paar, analyseSchritt, analyseGanz, fertig, auswertung, strom, linie, geaendert, knotenBei, neuerKnoten, loescheKnoten, groesse };
});
