/* Wassernetz: Erzeugung und Analyse · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung des Grasshopper-Moduls „Water Network Generation and Analysis“ aus dem Parametric Planning Catalogue
   (DeCodingSpaces – Martin Dennemark).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Verfahren wie die Schaltung der .gh-Datei:
   1. Geometry Setup: Straßen (Primary/Secondary/Tertiary) und Hochbehälter werden aufs Gelände projiziert (ProjectPtToSrf);
      jede Straßenkante bekommt das Gewicht ihrer Klasse (Panel „Weights per Street Hierarchy“ 1, 2, 3); die Blöcke
      (Polygons from lines → Area) bekommen Haushalte (Fläche / AreaPerHousehold) und Wasserbedarf
      (DemandPerHousehold × Haushalte × 0.00005787).
   2. Kürzeste Wege vom Hochbehälter zu allen Verbrauchern (ShortestPathBetweenPoints, Cross Reference): einmal nach Länge,
      einmal nach Länge × Gewicht (Hauptstraßen bevorzugt). Wassernetz = alle Wege nach Hierarchie plus die Teile der
      Längenwege, die nicht schon darin liegen – außer für Verbraucher, deren Zusatzlänge (Mass Addition, Remap auf 0…1)
      über der Schwelle 0.8 liegt (Set Difference, Cull Pattern, Network to Segments). So entstehen Maschen.
   3. Write/Analyse Hydrology Network (EPANET) in einer Schleife (Loop Start/End, Iterations): ist die Geschwindigkeit in
      einem Rohr größer als Max. Velocity, nimmt es den nächsten Durchmesser aus „Used Pipe Diameters“ (0.03 … 0.15 m).
   Die Rohrnetzberechnung steht in hydraulik.js. Die Straßenhierarchie wird wie in ../strassenhierarchie/modell.js berechnet
   (Funktionen von dort übernommen, weil Apps einander nicht aufrufen). */
(function (wurzel, fabrik) {
  const node = typeof module === "object" && module.exports;
  const M = fabrik(node ? require("../_gemeinsam/geo.js") : wurzel.Geo, node ? require("../_gemeinsam/szenen.js") : wurzel.Szenen,
                   node ? require("./hydraulik.js") : wurzel.Hydraulik);
  if (node) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Geo, Szenen, Hydraulik) {
  "use strict";

  /** Voreinstellungen der .gh-Datei (Schieberegler: Wert [Bereich]):
      iterationen Iterations 4 [0..5] · vMax Max. Velocity 1.5 [0..10] m/s · tankHoehe Tank Height 10 [0..100] m ·
      bedarfHaushalt DemandPerHousehold 20 [0..100] · flaecheHaushalt AreaPerHousehold 1000 [50..1000] m² ·
      schwelle Number Slider 0.8 [0..1] (Smaller Than vor Cull Pattern) · gP, gS, gT Panel „Weights per Street Hierarchy“ 1, 2, 3 ·
      rauheit Line Roughness 140 (fester Wert am Eingang von Write Hydrology Network) ·
      rohrWert Value List „Pipe values“ (Flow velocity) · knotenWert Value List „Node values“ (Pressure) ·
      farbGrenze Number Slider 4 [0..10] (obere Grenze des Gradienten der Rohre) · linie Number Slider 300 [0..1000] (Linienstärke = Durchmesser × 300) ·
      kontur Number Slider 20 [0..20] (Abstand der Höhenlinien, Contour) */
  const STANDARD = { iterationen: 4, vMax: 1.5, tankHoehe: 10, bedarfHaushalt: 20, flaecheHaushalt: 1000, schwelle: 0.8,
                     gP: 1, gS: 2, gT: 3, rauheit: 140, rohrWert: "v", knotenWert: "druck", farbGrenze: 4, linie: 300, kontur: 20,
                     beschriftung: true };
  /** Gene Pool „Used Pipe Diameters“ (m) */
  const DURCHMESSER = [0.03, 0.06, 0.09, 0.12, 0.15];
  /** Panel „Liters Per Second To Liters Per Day“ (so beschriftet; Faktor wie in der Datei) */
  const UMRECHNUNG = 0.00005787;
  /** Druckgrenzen (Panel: unter 1 bar rot, über 16 bar lila; Gradient 0.99 … 16.01) */
  const DRUCK_MIN = 1, DRUCK_MAX = 16;
  /** Voreinstellungen der Straßenhierarchie (wie ../strassenhierarchie, STANDARD) */
  const HIERARCHIE = { kL: 0.5, kW: 0.5, grund: 1, wEingang: 1, wPoi: 0.5, wTertiaer: 1, wSekundaer: 1, wPrimaer: 1, faktor: 1.001 };

  /* ------------------------------------------------ Straßenhierarchie (übernommen aus ../strassenhierarchie/modell.js) */
  function naechstesSegment(N, q) {
    let best = -1, bd = Infinity;
    N.kanten.forEach((e, k) => { const d = Geo.abstandSegment(q, N.knoten[e.a], N.knoten[e.b]).d; if (d < bd) { bd = d; best = k; } });
    return best;
  }
  function gewichteHierarchie(N, poi, eingang, h) {
    const m = N.kanten.length, w = new Float64Array(m).fill(2 * h.grund);
    for (const q of eingang) { const k = naechstesSegment(N, q); if (k >= 0) w[k] += h.wEingang * m; }
    for (const q of poi) { const k = naechstesSegment(N, q); if (k >= 0) w[k] += h.wPoi * m; }
    return w;
  }
  function betweenness(G, g) {
    const bc = new Float64Array(G.n);
    for (let s = 0; s < G.n; s++) {
      if (!g[s]) continue;
      const dist = Geo.betweennessVon(G.n, i => G.adj[i], s, g, g, bc);
      for (let t = 0; t < G.n; t++) if (t !== s && dist[t] !== Infinity) { bc[s] += g[s] * g[t]; bc[t] += g[s] * g[t]; }
    }
    return bc;
  }
  /** Logarithmus → Remap 0…1 → Consecutive Domains / Find Domain → 0 Tertiary, 1 Secondary, 2 Primary */
  function klassifiziere(bc, h) {
    const w = [h.wTertiaer, h.wSekundaer, h.wPrimaer], s = w[0] + w[1] + w[2], c = [0];
    for (let i = 0; i < 3; i++) c.push(c[i] + w[i] / s * h.faktor);
    const L = Array.from(bc, v => v > 0 ? Math.log(v) : NaN), def = L.filter(Number.isFinite);
    const mn = Math.min(...def), sp = Math.max(...def) - mn;
    return Int8Array.from(L, v => {
      const x = Number.isFinite(v) && sp > 1e-12 ? (v - mn) / sp : 0;
      for (let i = 0; i < 3; i++) if (x >= c[i] - 1e-12 && x <= c[i + 1] + 1e-12) return i;
      return -1;
    });
  }
  /** Straßenhierarchie der Beispielstadt: PoI in der Mitte, Stadteingänge an den Rändern links und rechts */
  function strassenhierarchie(N, poi, eingang, h = HIERARCHIE) {
    const G = Geo.segmentGraph(N, h.kL, h.kW);
    return klassifiziere(betweenness(G, gewichteHierarchie(N, poi, eingang, h)), h);
  }

  /* ------------------------------------------------ Szene */
  /** Gelände (1600 m × 1600 m, davon 1600 × 1200 sichtbar) und Stadt (verzogenes Raster 13 × 10, Blöcke ohne Gebäude).
      → {G, stadt, N (Netz), zK (Höhe je Knoten), L3 (Kantenlänge im Raum), klasse, bloecke [{poly, c, A, knoten}], b, h} */
  function szene(zufall) {
    const b = 1600, h = 1200;
    const G = Szenen.glaette(Szenen.gelaende(zufall, { n: 101, groesse: 1600, hoehe: 160 }), 1);
    const stadt = Szenen.stadt(zufall, { b, h, nx: 13, ny: 10, rand: 130, jitter: 0.3, zusammen: 0.22, strasse: 16, gebaeude: false, platz: false, kirche: false });
    const N = Geo.netz(stadt.strassen, 0.5);
    const zK = N.knoten.map(k => Szenen.hoehe(G, k[0], k[1]));                        // ProjectPtToSrf
    const L3 = N.kanten.map(e => Math.hypot(e.l, zK[e.a] - zK[e.b]));
    const mitteY = h / 2, ys = N.knoten.map(k => k[1]);
    const randKnoten = x0 => { let best = 0, bd = Infinity; N.knoten.forEach((k, i) => { const d = Math.abs(k[0] - x0) * 4 + Math.abs(k[1] - mitteY); if (d < bd) { bd = d; best = i; } }); return N.knoten[best]; };
    const xs = N.knoten.map(k => k[0]), poi = [[b / 2, mitteY]], eingang = [randKnoten(Math.min(...xs)), randKnoten(Math.max(...xs))];
    void ys;
    const klasse = strassenhierarchie(N, poi, eingang);
    const bloecke = stadt.bloecke.map(poly => {
      const c = Geo.schwerpunkt(poly);
      return { poly, c, A: Geo.flaeche(poly), knoten: naechsterKnoten(N, c) };
    });
    return { G, stadt, N, zK, L3, klasse, poi, eingang, bloecke, b, h };
  }
  /** Closest Point (Cloud = Punkte des Graphen) */
  function naechsterKnoten(N, q) {
    let best = -1, bd = Infinity;
    N.knoten.forEach((k, i) => { const d = (k[0] - q[0]) ** 2 + (k[1] - q[1]) ** 2; if (d < bd) { bd = d; best = i; } });
    return best;
  }
  /** Gewicht einer Straßenkante nach ihrer Klasse (Primary gP, Secondary gS, Tertiary gT; ohne Klasse wie Tertiary) */
  const kantenGewicht = (klasse, p) => klasse === 2 ? p.gP : klasse === 1 ? p.gS : p.gT;
  /** Bedarf eines Blocks in L/s: DemandPerHousehold × (Fläche / AreaPerHousehold) × 0.00005787 */
  const bedarfBlock = (A, p) => p.bedarfHaushalt * (A / p.flaecheHaushalt) * UMRECHNUNG;

  /** Kürzeste-Wege-Baum vom Knoten s: Kosten je Kante cost(k). → {dist, vorKante} */
  function wegebaum(Sz, s, cost) {
    const adj = Geo.adjazenz(Sz.N);
    return Geo.dijkstra(Sz.N.knoten.length, i => adj[i].map(({ j, k }) => [j, cost(k), k]), s);
  }
  /** Kanten des Weges vom Baumursprung zu Knoten t (graphEdgeIndex); null, wenn nicht erreichbar */
  function kantenweg(baum, N, t) {
    if (baum.dist[t] === Infinity) return null;
    const w = [];
    for (let i = t; baum.vorKante[i] >= 0; ) { const k = baum.vorKante[i]; w.push(k); const e = N.kanten[k]; i = e.a === i ? e.b : e.a; if (w.length > N.kanten.length) break; }
    return w.reverse();
  }

  /** Wassernetz aus den beiden Wegemengen (Set Difference, Mass Addition, Bounds/Remap, Smaller Than ≤ schwelle, Cull Pattern):
      wegeL[c], wegeH[c]: Kantenlisten je Verbraucher (nach Länge, nach Hierarchie). → {kanten: Set, extra: [[k]], zusatz: [m], behalten: [bool]} */
  function kombiniere(wegeL, wegeH, laenge, schwelle) {
    const B = new Set(); for (const w of wegeH) if (w) for (const k of w) B.add(k);   // Create Set (flach)
    const extra = wegeL.map(w => w ? w.filter(k => !B.has(k)) : []);                     // Set Difference je Verbraucher
    const zusatz = extra.map(w => w.reduce((s, k) => s + laenge[k], 0));                 // Mass Addition der Längen
    const mn = Math.min(...zusatz), mx = Math.max(...zusatz), sp = mx - mn;
    const behalten = zusatz.map(v => (sp > 1e-12 ? (v - mn) / sp : 0) <= schwelle + 1e-12);
    const kanten = new Set(B);
    extra.forEach((w, c) => { if (behalten[c]) for (const k of w) kanten.add(k); });
    return { kanten, extra, zusatz, behalten };
  }

  /** Hydraulisches Netz (Write Hydrology Network): Knoten des Wassernetzes, Behälter am Knoten des Hochbehälters (Höhe + Tank Height),
      jeder Verbraucher am nächsten Netzknoten (Bedarf summiert), Rohre mit den aktuellen Durchmessern und Rauheit 140. */
  function hydraulikNetz(z, p) {
    const Sz = z.Sz, idx = new Map(), knoten = [], leitungen = [];
    const nimm = i => { if (!idx.has(i)) { idx.set(i, knoten.length); knoten.push(i === z.tankKnoten ? { z: Sz.zK[i], behaelter: true, kopf: Sz.zK[i] + p.tankHoehe } : { z: Sz.zK[i], bedarf: 0 }); } return idx.get(i); };
    nimm(z.tankKnoten);
    z.rohre.forEach((k, r) => {
      const e = Sz.N.kanten[k];
      leitungen.push({ a: nimm(e.a), b: nimm(e.b), art: "rohr", L: Sz.L3[k], d: DURCHMESSER[z.dIdx[r]], C: p.rauheit != null ? p.rauheit : STANDARD.rauheit, kante: k });
    });
    z.verbraucher.forEach(v => { const i = idx.get(v.knoten); if (i != null && !knoten[i].behaelter) knoten[i].bedarf += v.bedarf / 1000; });
    return { knoten, leitungen, idx };
  }

  /** Neuer Zustand: Szene, Hochbehälter am höchsten Straßenknoten */
  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const Sz = szene(zufall);
    let hoch = 0; Sz.zK.forEach((h, i) => { if (h > Sz.zK[hoch]) hoch = i; });
    const z = { t: 0, Sz, b: Sz.b, h: Sz.h, tank: Sz.N.knoten[hoch].slice() };
    baue(z, p);
    return z;
  }

  /** Verbraucher, Wegebäume und Ablauf neu (Phase „wege“, nichts gerechnet) */
  function baue(z, p) {
    const Sz = z.Sz;
    z.tankKnoten = naechsterKnoten(Sz.N, z.tank);
    z.verbraucher = Sz.bloecke.map(b => ({ knoten: b.knoten, c: b.c, A: b.A, haushalte: b.A / p.flaecheHaushalt, bedarf: bedarfBlock(b.A, p) }));
    z.baumL = wegebaum(Sz, z.tankKnoten, k => Sz.L3[k]);
    z.baumH = wegebaum(Sz, z.tankKnoten, k => Sz.L3[k] * kantenGewicht(Sz.klasse[k], p));
    z.wegeL = []; z.wegeH = [];
    z.phase = "wege"; z.k = 0; z.durchgang = 0; z.rohre = null; z.dIdx = null; z.netz = null; z.S = null; z.erg = null;
    z.vergroessert = []; z.fertig = false;
  }

  /** ein Dimensionierungsdurchgang: Analyse (bis zur Genauigkeit), dann jedes Rohr mit v > Max. Velocity einen Durchmesser größer */
  function dimensioniere(z, p) {
    z.netz = hydraulikNetz(z, p); z.S = Hydraulik.loese(z.netz); z.erg = Hydraulik.ergebnisse(z.netz, z.S);
    let n = 0;
    z.erg.leitungen.forEach((l, r) => { if (l.v > p.vMax && z.dIdx[r] < DURCHMESSER.length - 1) { z.dIdx[r]++; n++; } });
    z.vergroessert.push(n);
    return n;
  }

  /** Ein Schritt: Phase „wege“ – Wege zu einem weiteren Verbraucher; „netz“ – Wassernetz kombinieren;
      „dimension“ – ein Durchgang der Schleife; „analyse“ – Analyse mit den endgültigen Durchmessern. Danach zählt nur t weiter. */
  function schritt(z, p) {
    z.t++;
    if (z.fertig) return z;
    const Sz = z.Sz;
    if (z.phase === "wege") {
      const v = z.verbraucher[z.k];
      z.wegeL.push(kantenweg(z.baumL, Sz.N, v.knoten)); z.wegeH.push(kantenweg(z.baumH, Sz.N, v.knoten));
      if (++z.k >= z.verbraucher.length) z.phase = "netz";
    } else if (z.phase === "netz") {
      z.K = kombiniere(z.wegeL, z.wegeH, Sz.L3, p.schwelle);
      z.rohre = [...z.K.kanten].sort((a, b) => a - b);
      z.dIdx = new Int8Array(z.rohre.length);                                        // Duplicate Data (Panel 0)
      z.phase = p.iterationen > 0 ? "dimension" : "analyse";
    } else if (z.phase === "dimension") {
      z.durchgang++; dimensioniere(z, p);
      if (z.durchgang >= p.iterationen) z.phase = "analyse";
    } else if (z.phase === "analyse") {
      z.netz = hydraulikNetz(z, p); z.S = Hydraulik.loese(z.netz); z.erg = Hydraulik.ergebnisse(z.netz, z.S);
      z.fertig = true;
    }
    return z;
  }
  const fertig = z => z.fertig;
  function rechneAlles(z, p) { let n = 0; while (!z.fertig && n < 10000) { schritt(z, p); n++; } }

  const NUR_DARSTELLUNG = new Set(["rohrWert", "knotenWert", "farbGrenze", "linie", "kontur", "beschriftung"]);
  /** Parameter ohne Neustart: neu aufbauen; war schon gerechnet, sofort ganz rechnen (t bleibt mindestens so groß) */
  function aendere(z, p, id) {
    if (NUR_DARSTELLUNG.has(id)) return;
    const t = z.t; baue(z, p);
    if (t > 0) { rechneAlles(z, p); z.t = Math.max(t, z.t); }
  }
  /** Hochbehälter versetzen (Klick/Ziehen): nächster Straßenknoten, dann wie aendere */
  function setzeTank(z, p, q) { z.tank = [q[0], q[1]]; aendere(z, p, "tank"); }

  /** Druck eines Verbrauchers in bar wie in der Datei: Round(Druck in m) / 10 */
  function druckBar(z, c) {
    if (!z.erg) return null;
    const i = z.netz.idx.get(z.verbraucher[c].knoten);
    return i == null ? null : Math.round(z.erg.knoten[i].druck) / 10;
  }
  /** Wert am Knoten eines Verbrauchers (Node values) */
  function knotenWert(z, c, art) {
    if (!z.erg) return null;
    const i = z.netz.idx.get(z.verbraucher[c].knoten);
    return i == null ? null : z.erg.knoten[i][art];
  }

  /** Kennzahlen */
  function bilanz(z, p) {
    const R = { verbraucher: z.verbraucher.length, haushalte: z.verbraucher.reduce((s, v) => s + v.haushalte, 0),
                bedarf: z.verbraucher.reduce((s, v) => s + v.bedarf, 0),
                bedarfNetz: z.verbraucher.reduce((s, v) => s + (v.knoten === z.tankKnoten ? 0 : v.bedarf), 0) };   // ohne Verbraucher direkt am Behälter
    if (z.rohre) {
      const V = new Set(); z.rohre.forEach(k => { const e = z.Sz.N.kanten[k]; V.add(e.a); V.add(e.b); });
      R.rohre = z.rohre.length; R.laenge = z.rohre.reduce((s, k) => s + z.Sz.L3[k], 0); R.maschen = z.rohre.length - V.size + 1;
      R.durchmesser = DURCHMESSER.map((_, j) => z.dIdx.filter(x => x === j).length);
      R.zusatzBehalten = z.K.behalten.filter(Boolean).length;
    }
    if (z.erg) {
      const bar = z.verbraucher.map((_, c) => druckBar(z, c)).filter(v => v != null);
      R.druckMin = Math.min(...bar); R.druckMax = Math.max(...bar);
      R.zuWenig = bar.filter(v => v < DRUCK_MIN).length; R.zuViel = bar.filter(v => v > DRUCK_MAX).length;
      R.vMax = Math.max(...z.erg.leitungen.map(l => l.v)); R.iter = z.S.iter;
      R.zufluss = -z.erg.knoten[0].bedarf;
    }
    return R;
  }

  return { STANDARD, DURCHMESSER, UMRECHNUNG, DRUCK_MIN, DRUCK_MAX, HIERARCHIE, naechstesSegment, gewichteHierarchie, betweenness, klassifiziere,
           strassenhierarchie, szene, naechsterKnoten, kantenGewicht, bedarfBlock, wegebaum, kantenweg, kombiniere, hydraulikNetz,
           erzeuge, baue, dimensioniere, schritt, fertig, rechneAlles, aendere, setzeTank, druckBar, knotenWert, bilanz };
});
