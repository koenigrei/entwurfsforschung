/* Kürzester Weg im Straßennetz · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung des Grasshopper-Moduls „Street Network Shortest Path“ aus dem Parametric Planning Catalogue
   (DeCodingSpaces – Reinhard König, Martin Bielik, Ekaterina Fuchkina).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Wie in der .gh-Datei: Straßensegmente werden zum gerichteten Segmentgraphen (2. BuildGraph: je Segment zwei Fahrtrichtungen,
   Schritte zwischen Segmenten an gemeinsamen Knoten, keine Wende auf demselben Segment; Kosten aus Längen- und Winkelkoeffizient –
   Geo.richtungsGraph, abgeglichen mit der DeCodingSpaces-Toolbox, GPL-3.0, kein Code übernommen). Ursprung und Ziel sind Punkte;
   es zählt das jeweils nächste Segment, beide Fahrtrichtungen. Der kürzeste Weg wird auf drei Arten gesucht:
   „1. Shortest Path Simple“ (CityGraph – hier Dijkstra mit linearer Suche des nächsten Zustands, ohne Vorrangwarteschlange),
   „2. Shortest Path Dijkstra“ (3. ShortestDijkstra – mit Vorrangwarteschlange, bricht am Ziel ab) und „3. Floyd Warshal“
   (3. ShortestFloydWarshal + 4. FWGetPaths – alle Paare von Zuständen vorab, danach ist jeder Weg sofort ablesbar).
   Ein Schritt = ein Expansionsschritt: bei Dijkstra wird der nächste Zustand fest, bei Floyd–Warshall eine Runde k (Geo.floydSchritt).
   „Run Calculation“ rechnet zusätzlich die Betweenness Centrality aller Segmente. */
(function (wurzel, fabrik) {
  const node = typeof module === "object" && module.exports;
  const M = fabrik(node ? require("../_gemeinsam/geo.js") : wurzel.Geo, node ? require("../_gemeinsam/szenen.js") : wurzel.Szenen);
  if (node) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Geo, Szenen) {
  "use strict";

  /** Voreinstellungen der .gh-Datei: Length Coefficient 0, Angular Coefficient 1 [0..1] (beide BuildGraph und CityGraph),
      Werteliste „shortest path segment IDs“, Toggle „Run Calculation“ = false. verfahren: 1./2./3. der Datei.
      definition: "dcs2020" = Kosten der Legacy-Komponenten (kL·m/l_max + kW·θ/180°), "standard" = Toolbox v2 (kL·m + kW·θ/90°). */
  const STANDARD = { verfahren: "dijkstra", kosten: "winkel", kL: 0, kW: 1, definition: "dcs2020", betweenness: false, gebaeude: true };
  const VERFAHREN = ["einfach", "dijkstra", "floyd"];
  /** kleiner Längenanteil, der gleich teure Wege eindeutig macht (sonst wählen die Verfahren unter Gleichstand verschiedene Wege) */
  const GLEICHSTAND = 1e-6;

  /** Straßennetz der Beispielstadt (verzogenes Raster, Szenen.stadt) → {szene, segmente, b, h} */
  function strassennetz(zufall, opt = {}) {
    const o = Object.assign({ b: 600, h: 420, nx: 11, ny: 8, jitter: 0.3, zusammen: 0.25, rand: 10, gebaeude: true, kirche: false, breite: [7, 13], tiefe: 10 }, opt);
    const szene = Szenen.stadt(zufall, o);
    return { szene, segmente: szene.strassen, b: o.b, h: o.h };
  }

  /** gerichteter Segmentgraph (Geo.richtungsGraph wie 2. BuildGraph) für die Suche: nb[zustand] = [[ziel, kosten, meter, grad]],
      Kosten mit kleinem Gleichstandsanteil; roh = Graph ohne diesen Anteil (für die Betweenness) */
  function graph(N, kL, kW, definition = "dcs2020") {
    const roh = Geo.richtungsGraph(N, { kL, kW, norm: definition === "standard" ? "standard" : "dcs2020" });
    const lm = roh.laenge.reduce((s, l) => s + l, 0) / Math.max(1, roh.n);
    const nb = roh.nb.map(liste => liste.map(([j, c, meter, grad]) => [j, c + GLEICHSTAND * meter / lm, meter, grad]));
    return { n: roh.n, z: roh.z, nb, roh, mitte: roh.mitte, laenge: roh.laenge, lm, lmax: roh.lmax, norm: roh.norm };
  }

  /** gerichtete Kantenliste der Zustände für Floyd–Warshall */
  function kantenListe(G) {
    const K = [];
    G.nb.forEach((liste, a) => liste.forEach(([b, c]) => K.push({ a, b, c })));
    return K;
  }

  /* ---------------------------------------------------------------- Suchen, schrittweise (auf Zuständen) */
  /** neue Suche von Segment a nach b. Für Floyd–Warshall wird die Matrix fw (alle Paare von Zuständen) benutzt und nur bei Bedarf neu angelegt. */
  function neueSuche(G, art, a, b, fw) {
    const n = G.z, S = { art, a, b, n, fertig: false, schritte: 0, weg: [], zustaende: [] };
    if (art === "floyd") {
      S.fw = fw && fw.n === n ? fw : neueMatrix(G);
      if (S.fw.k >= n) beende(G, S);
      return S;
    }
    S.dist = new Float64Array(n).fill(Infinity); S.vor = new Int32Array(n).fill(-1); S.fest = new Uint8Array(n);
    S.dist[2 * a] = S.dist[2 * a + 1] = 0;
    if (art === "dijkstra") { S.H = new Geo.Heap(); S.H.push(0, 2 * a); S.H.push(0, 2 * a + 1); }
    return S;
  }
  /** Floyd–Warshall-Matrix vor der ersten Runde (gerichtete Schrittkosten, Diagonale 0) */
  function neueMatrix(G) {
    const n = G.z, D = new Float64Array(n * n).fill(Infinity), NX = new Int32Array(n * n).fill(-1);
    for (let i = 0; i < n; i++) { D[i * n + i] = 0; NX[i * n + i] = i; }
    for (const e of kantenListe(G)) if (e.c < D[e.a * n + e.b]) { D[e.a * n + e.b] = e.c; NX[e.a * n + e.b] = e.b; }
    return { n, D, NX, k: 0 };
  }
  /** bester Zustandsweg aus der fertigen Floyd–Warshall-Matrix: Minimum über die zwei Richtungen von Start und Ziel */
  function floydBeste(S) {
    const n = S.n, D = S.fw.D; let best = null, bd = Infinity;
    for (const i of [2 * S.a, 2 * S.a + 1]) for (const j of [2 * S.b, 2 * S.b + 1]) if (D[i * n + j] < bd) { bd = D[i * n + j]; best = [i, j]; }
    return best;
  }
  function beende(G, S, ziel) {
    S.fertig = true;
    if (S.a === S.b) { S.zustaende = [2 * S.a]; S.weg = [S.a]; return; }
    if (S.art === "floyd") { const B = floydBeste(S); S.zustaende = B ? Geo.floydWeg(S.n, S.fw.NX, B[0], B[1]) : []; }
    else S.zustaende = ziel != null ? Geo.weg(S.vor, ziel) : [];
    S.weg = S.zustaende.map(st => st >> 1);
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
    if (v < 0) { beende(G, S, null); return true; }           // Ziel nicht erreichbar
    S.fest[v] = 1; S.zuletzt = v >> 1; S.zuletztZustand = v;
    if ((v >> 1) === S.b) { beende(G, S, v); return true; }  // erster fester Zustand des Zielsegments ist optimal
    for (const [j, c] of G.nb[v]) {
      const d = S.dist[v] + c;
      if (d < S.dist[j]) { S.dist[j] = d; S.vor[j] = v; if (S.H) S.H.push(d, j); }
    }
    return false;
  }
  function loese(G, S) { while (!sucheSchritt(G, S)) { /* weiter */ } return S; }

  /** Weg von a nach b mit einem Verfahren auf einmal → Liste der Segment-IDs („shortest path segment IDs“) */
  function kuerzesterWeg(G, art, a, b, fw) { return loese(G, neueSuche(G, art, a, b, fw)).weg; }

  /** Kosten eines Zustandsweges: custom costs (Graphkosten ohne Gleichstandsanteil), metric costs (m, Mitte zu Mitte), Summe der Richtungsänderungen (°) */
  function wegKosten(G, zustaende) {
    let kosten = 0, meter = 0, grad = 0;
    for (let i = 0; i + 1 < zustaende.length; i++) {
      const e = G.roh.nb[zustaende[i]].find(x => x[0] === zustaende[i + 1]);
      kosten += e[1]; meter += e[2]; grad += e[3];
    }
    return { kosten, meter, grad, segmente: zustaende.length };
  }

  /** Betweenness Centrality aller Segmente (Brandes über beide Fahrtrichtungen, „Run Calculation“). dcs2020: Start- und Zielsegment
      zählen mit wie in den Legacy-Komponenten; standard: nur Segmente dazwischen (Toolbox v2, Choice). */
  function betweenness(G) {
    const bc = new Float64Array(G.n), enden = G.norm === "dcs2020";
    for (let s = 0; s < G.n; s++) Geo.segmentBetweennessVon(G.roh, s, null, null, bc, { enden });
    return bc;
  }

  /* ---------------------------------------------------------------- Zustand */
  /** Segment am nächsten zum Punkt (Geo.naechstesSegment, ../_gemeinsam/geo.js) */
  const naechstesSegment = Geo.naechstesSegment;

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
    z.G = graph(z.N, p.kL, p.kW, p.definition);
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

  /** Parameter ohne Neustart; Verfahren und Kosten rechnen den Weg gleich ganz (wie Grasshopper), Start zeigt ihn dann nach „Zurück“ oder „Suchen“ schrittweise */
  function aendere(z, p, id) {
    if (id === "kL" || id === "kW" || id === "kosten" || id === "definition") { baueGraph(z, p); sofort(z, p); }
    else if (id === "verfahren") sofort(z, p);
    else if (id === "betweenness") z.bc = p.betweenness ? betweenness(z.G) : null;
  }

  /** Ursprung ("o") oder Ziel ("d") versetzen und den Weg sofort neu rechnen */
  function setzePunkt(z, p, art, q) {
    z[art] = [q[0], q[1]];
    z.so = naechstesSegment(z.N, z.o); z.sd = naechstesSegment(z.N, z.d);
    return sofort(z, p);
  }

  /** Was die Suche je Segment schon weiß: dist = kleinster bekannter Abstand vom Ursprung (min über beide Richtungen; Floyd–Warshall:
      Zeilen der Ursprungszustände nach k Runden), fest = Segment mit festem Zustand (nur Dijkstra/Simple, sonst null) */
  function bekannt(z) {
    const S = z.suche, m = z.G.n, dist = new Float64Array(m).fill(Infinity);
    let fest = null;
    if (S.art === "floyd") {
      const n = S.n, D = S.fw.D;
      for (const i of [2 * S.a, 2 * S.a + 1]) for (let j = 0; j < n; j++) { const d = D[i * n + j]; if (d < dist[j >> 1]) dist[j >> 1] = d; }
    } else {
      fest = new Uint8Array(m);
      for (let j = 0; j < S.n; j++) { if (S.dist[j] < dist[j >> 1]) dist[j >> 1] = S.dist[j]; if (S.fest[j]) fest[j >> 1] = 1; }
    }
    return { dist, fest };
  }

  return { STANDARD, VERFAHREN, GLEICHSTAND, strassennetz, graph, kantenListe, neueSuche, neueMatrix, sucheSchritt, loese, kuerzesterWeg, wegKosten,
           betweenness, naechstesSegment, erzeuge, baueGraph, starteSuche, sofort, schritt, fertig, aendere, setzePunkt, bekannt };
});
