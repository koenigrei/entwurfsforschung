/* Kürzester Weg im Straßennetz · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung des Grasshopper-Moduls „Street Network Shortest Path“ aus dem Parametric Planning Catalogue
   (DeCodingSpaces – Reinhard König, Martin Bielik, Ekaterina Fuchkina).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Wie in der .gh-Datei: Straßensegmente werden zum dualen Graphen (2. BuildGraph: Knoten = Segmente, Kosten aus Längen- und
   Winkelkoeffizient). Ursprung und Ziel sind Punkte; es zählt das jeweils nächste Segment. Der kürzeste Weg wird auf drei Arten
   gesucht: „1. Shortest Path Simple“ (CityGraph – hier Dijkstra mit linearer Suche des nächsten Knotens, ohne Vorrangwarteschlange),
   „2. Shortest Path Dijkstra“ (3. ShortestDijkstra – mit Vorrangwarteschlange, bricht am Ziel ab) und „3. Floyd Warshal“
   (3. ShortestFloydWarshal + 4. FWGetPaths – alle Paare vorab, danach ist jeder Weg sofort ablesbar). Ein Schritt = ein
   Expansionsschritt: bei Dijkstra wird der nächste Knoten fest, bei Floyd–Warshall eine Runde k (Geo.floydSchritt).
   „Run Calculation“ rechnet zusätzlich die Betweenness Centrality aller Segmente. */
(function (wurzel, fabrik) {
  const node = typeof module === "object" && module.exports;
  const M = fabrik(node ? require("../_gemeinsam/geo.js") : wurzel.Geo, node ? require("../_gemeinsam/szenen.js") : wurzel.Szenen);
  if (node) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Geo, Szenen) {
  "use strict";

  /** Voreinstellungen der .gh-Datei: Length Coefficient 0, Angular Coefficient 1 [0..1] (beide BuildGraph und CityGraph),
      Werteliste „shortest path segment IDs“, Toggle „Run Calculation“ = false. verfahren: 1./2./3. der Datei. */
  const STANDARD = { verfahren: "dijkstra", kosten: "winkel", kL: 0, kW: 1, betweenness: false, gebaeude: true };
  const VERFAHREN = ["einfach", "dijkstra", "floyd"];
  /** kleiner Längenanteil, der gleich teure Wege eindeutig macht (sonst wählen die Verfahren unter Gleichstand verschiedene Wege) */
  const GLEICHSTAND = 1e-6;

  /** Straßennetz der Beispielstadt (verzogenes Raster, Szenen.stadt) → {szene, segmente, b, h} */
  function strassennetz(zufall, opt = {}) {
    const o = Object.assign({ b: 600, h: 420, nx: 11, ny: 8, jitter: 0.3, zusammen: 0.25, rand: 10, gebaeude: true, kirche: false, breite: [7, 13], tiefe: 10 }, opt);
    const szene = Szenen.stadt(zufall, o);
    return { szene, segmente: szene.strassen, b: o.b, h: o.h };
  }

  /** dualer Graph mit Kosten (Geo.segmentGraph wie 2. BuildGraph) und den Anteilen je Kante:
      nb[i] = [[j, kosten, meter, grad]] – meter = (l_i + l_j) / 2 (von Segmentmitte zu Segmentmitte), grad = Richtungsänderung */
  function graph(N, kL, kW) {
    const G = Geo.segmentGraph(N, kL, kW), L = N.kanten.map(e => e.l);
    const nb = G.adj.map((liste, i) => liste.map(([j, c, wink]) => {
      const m = (L[i] + L[j]) / 2;
      return [j, c + GLEICHSTAND * m / G.lm, m, wink];
    }));
    return { n: G.n, nb, mitte: G.mitte, lm: G.lm, laenge: L };
  }

  /** Kantenliste für Floyd–Warshall (ungerichtet, jede Kante einmal) */
  function kantenListe(G) {
    const K = [];
    G.nb.forEach((liste, a) => liste.forEach(([b, c]) => { if (a < b) K.push({ a, b, c }); }));
    return K;
  }

  /* ---------------------------------------------------------------- Suchen, schrittweise */
  /** neue Suche von Segment a nach b. Für Floyd–Warshall wird die Matrix fw (alle Paare) benutzt und nur bei Bedarf neu angelegt. */
  function neueSuche(G, art, a, b, fw) {
    const n = G.n, S = { art, a, b, n, fertig: false, schritte: 0, weg: [] };
    if (art === "floyd") {
      S.fw = fw && fw.n === n ? fw : neueMatrix(G);
      if (S.fw.k >= n) beende(G, S);
      return S;
    }
    S.dist = new Float64Array(n).fill(Infinity); S.vor = new Int32Array(n).fill(-1); S.fest = new Uint8Array(n);
    S.dist[a] = 0;
    if (art === "dijkstra") { S.H = new Geo.Heap(); S.H.push(0, a); }
    return S;
  }
  /** Floyd–Warshall-Matrix vor der ersten Runde (Kantenkosten, Diagonale 0) */
  function neueMatrix(G) {
    const n = G.n, D = new Float64Array(n * n).fill(Infinity), NX = new Int32Array(n * n).fill(-1);
    for (let i = 0; i < n; i++) { D[i * n + i] = 0; NX[i * n + i] = i; }
    for (const e of kantenListe(G)) if (e.c < D[e.a * n + e.b]) { D[e.a * n + e.b] = D[e.b * n + e.a] = e.c; NX[e.a * n + e.b] = e.b; NX[e.b * n + e.a] = e.a; }
    return { n, D, NX, k: 0 };
  }
  function beende(G, S) {
    S.fertig = true;
    if (S.art === "floyd") S.weg = Geo.floydWeg(S.n, S.fw.NX, S.a, S.b);
    else S.weg = S.dist[S.b] < Infinity ? Geo.weg(S.vor, S.b) : [];
  }
  /** ein Expansionsschritt; true, wenn die Suche danach fertig ist */
  function sucheSchritt(G, S) {
    if (S.fertig) return true;
    S.schritte++;
    if (S.art === "floyd") {
      Geo.floydSchritt(S.n, S.fw.D, S.fw.NX, S.fw.k++);
      if (S.fw.k >= S.n) beende(G, S);
      return S.fertig;
    }
    let v = -1;
    if (S.art === "dijkstra") {
      while (!S.H.leer) { const i = S.H.pop(); if (!S.fest[i]) { v = i; break; } }
    } else {                                                   // einfach: kleinsten Abstand linear suchen
      let bd = Infinity;
      for (let i = 0; i < S.n; i++) if (!S.fest[i] && S.dist[i] < bd) { bd = S.dist[i]; v = i; }
    }
    if (v < 0) { beende(G, S); return true; }                 // Ziel nicht erreichbar
    S.fest[v] = 1; S.zuletzt = v;
    if (v === S.b) { beende(G, S); return true; }
    for (const [j, c] of G.nb[v]) {
      const d = S.dist[v] + c;
      if (d < S.dist[j]) { S.dist[j] = d; S.vor[j] = v; if (S.H) S.H.push(d, j); }
    }
    return false;
  }
  function loese(G, S) { while (!sucheSchritt(G, S)) { /* weiter */ } return S; }

  /** Weg von a nach b mit einem Verfahren auf einmal → Liste der Segment-IDs („shortest path segment IDs“) */
  function kuerzesterWeg(G, art, a, b, fw) { return loese(G, neueSuche(G, art, a, b, fw)).weg; }

  /** Kosten eines Weges: custom costs (Summe der Graphkosten ohne Gleichstandsanteil), metric costs (m, Mitte zu Mitte), Summe der Richtungsänderungen (°) */
  function wegKosten(G, weg, kL, kW) {
    let meter = 0, grad = 0;
    for (let i = 0; i + 1 < weg.length; i++) {
      const e = G.nb[weg[i]].find(x => x[0] === weg[i + 1]);
      meter += e[2]; grad += e[3];
    }
    return { kosten: kL * meter / G.lm + kW * grad / 90, meter, grad, segmente: weg.length };
  }

  /** Betweenness Centrality aller Segmente (Brandes über alle Ursprünge, „Run Calculation“) */
  function betweenness(G) {
    const bc = new Float64Array(G.n), nb = i => G.nb[i];
    for (let s = 0; s < G.n; s++) Geo.betweennessVon(G.n, nb, s, null, null, bc);
    return bc;
  }

  /* ---------------------------------------------------------------- Zustand */
  function naechstesSegment(N, q) {
    let best = -1, bd = Infinity;
    N.kanten.forEach((e, k) => { const d = Geo.abstandSegment(q, N.knoten[e.a], N.knoten[e.b]).d; if (d < bd) { bd = d; best = k; } });
    return best;
  }

  /** Neuer Zustand: Ursprung unten links, Ziel oben rechts; Suche noch nicht begonnen */
  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const S = strassennetz(zufall);
    const z = { t: 0, S, szene: S.szene, b: S.b, h: S.h, o: [S.b * 0.12, S.h * 0.82], d: [S.b * 0.86, S.h * 0.16], bc: null, fw: null };
    z.N = Geo.netz(S.segmente);
    baueGraph(z, p);
    return z;
  }
  function baueGraph(z, p) {
    z.G = graph(z.N, p.kL, p.kW);
    z.fw = null;
    z.bc = p.betweenness ? betweenness(z.G) : null;
    z.so = naechstesSegment(z.N, z.o); z.sd = naechstesSegment(z.N, z.d);
    starteSuche(z, p);
  }
  /** Suche für das gewählte Verfahren neu anlegen (t = 0); neueMatrix = true legt auch die Floyd–Warshall-Matrix neu an */
  function starteSuche(z, p, neueMatrix_) {
    if (neueMatrix_) z.fw = null;
    z.suche = neueSuche(z.G, p.verfahren, z.so, z.sd, z.fw);
    if (z.suche.fw) z.fw = z.suche.fw;
    z.t = 0; z.vorbereitet = false;
    return z.suche;
  }
  /** Suche sofort zu Ende rechnen (beim Ziehen von Ursprung/Ziel und nach Änderungen). z.t = Zahl der Expansionsschritte.
      vorbereitet = true, wenn dabei Floyd–Warshall-Runden nachgeholt werden mussten (die langsame Vorbereitung). */
  function sofort(z, p) {
    const S = starteSuche(z, p), k0 = S.fw ? S.fw.k : 0;
    loese(z.G, S);
    z.vorbereitet = !!S.fw && k0 < S.n;
    z.t = S.art === "floyd" ? S.fw.k : S.schritte;
    return S;
  }

  /** Ein Schritt = ein Expansionsschritt der Suche (danach nichts mehr) */
  function schritt(z, p) {
    sucheSchritt(z.G, z.suche);
    z.t++;
    return z;
  }
  const fertig = z => z.suche.fertig;

  /** Parameter ohne Neustart; Verfahren und Kosten rechnen den Weg gleich ganz (wie Grasshopper), Start zeigt ihn dann nach „Zurück“ oder „Suche zeigen“ schrittweise */
  function aendere(z, p, id) {
    if (id === "kL" || id === "kW" || id === "kosten") { baueGraph(z, p); sofort(z, p); }
    else if (id === "verfahren") sofort(z, p);
    else if (id === "betweenness") z.bc = p.betweenness ? betweenness(z.G) : null;
  }

  /** Ursprung ("o") oder Ziel ("d") versetzen und den Weg sofort neu rechnen */
  function setzePunkt(z, p, art, q) {
    z[art] = [q[0], q[1]];
    z.so = naechstesSegment(z.N, z.o); z.sd = naechstesSegment(z.N, z.d);
    return sofort(z, p);
  }

  /** Abstände vom Ursprung, so weit die Suche sie kennt (Dijkstra: dist; Floyd–Warshall: Zeile des Ursprungs nach k Runden) */
  function bekannt(z) {
    const S = z.suche;
    if (S.art !== "floyd") return S.dist;
    const n = S.n; return S.fw.D.subarray(S.a * n, S.a * n + n);
  }

  return { STANDARD, VERFAHREN, GLEICHSTAND, strassennetz, graph, kantenListe, neueSuche, neueMatrix, sucheSchritt, loese, kuerzesterWeg, wegKosten,
           betweenness, naechstesSegment, erzeuge, baueGraph, starteSuche, sofort, schritt, fertig, aendere, setzePunkt, bekannt };
});
