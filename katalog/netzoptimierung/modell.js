/* Straßennetz-Optimierung · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung des Grasshopper-Moduls „Street Network Optimization“ aus dem Parametric Planning Catalogue
   (DeCodingSpaces – Reinhard König, Martin Bielik, Ekaterina Fuchkina).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Ablauf wie die Schaltung der .gh-Datei:
   Street Network Chromosome (Instruktionsbaum je Knoten der Startstraßen) → ChromosomeFactory (Nr Parents Zufallsnetze)
   → Schleife je Generation (Loop Start/End): OffspringGenerator (Nr Offsprings, Crossover/Mutation Rate, Random Generation,
   Shuffle Chromosomes) → ChromosomeMapper (Baum → Straßengeometrie) → Fitness (Length → Mass Addition → (1/(x+0.000001))*10000;
   Network Smooth → 1. ProcessGeometry → 2. BuildGraph (Length Coefficient 0.219, Angular Coefficient 1) → 3./4. Floyd–Warshall
   → Closeness Centrality → größter Wert) → ChromosomeInfo (Set Fitness Values) → Selection (PISA, 2 Ziele, beide werden
   minimiert; hier SPEA2) → Parents/Archive. Ein Schritt = eine Generation.

   Abbildung Chromosom → Straßennetz: Abgleich mit dem Quelltext der DeCodingSpaces-Toolbox (Bauhaus-InfAU/decoding-spaces-toolbox,
   GPL-3.0; Ablauf, Voreinstellungen und Randfälle aus docs/research/legacy-generation.md §1 abgelesen; kein Code übernommen). */
(function (wurzel, fabrik) {
  const node = typeof module === "object" && module.exports;
  const M = fabrik(node ? require("../_gemeinsam/geo.js") : wurzel.Geo, node ? require("../_gemeinsam/generierung.js") : wurzel.Generierung);
  if (node) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Geo, Generierung) {
  "use strict";

  /** Voreinstellungen (Schieberegler der .gh-Datei: Wert [Bereich]; feste Eingänge „PD“):
      generationen: Iterations/Generations 1 [0..100] – in der App 20, damit Start einen sichtbaren Lauf zeigt
      nachkommen: Nr Offsprings 30 [0..100] (= Lambda) · eltern: Nr Parents 10 [0..100] (= Mu, auch ChromosomeFactory Number)
      kreuzung: Crossover Rate 0.8 [0..1] · mutation: Mutation Rate 0.1 [0..1] · neuAnteil: Random Generation 0.1 [0..1]
      mischen: Shuffle Chromosomes false
      baumtiefe: TreeDepth 7 [0..20] · minLaenge: MinLength 30 · maxLaenge: MaxLength 100 (Spanne: Länge ∈ [30, 130) m)
      minAbstand: MinDist 20 · zufallsWinkel: RandomAngle 10 (Abweichung ∈ [−5°, +5°)) · maxArme: MaxArms 4
      kL: Length Coefficient 0.219 [0..1] · kW: Angular Coefficient 1 [0..1] (2. BuildGraph)
      variante: Show Variant 0 [0..9]
      ziel2: Lesart von f₂ – "closeness" = größte Closeness n / Σd (Quelltext der Legacy-Komponente, Voreinstellung) oder
             "weglaenge" = größte mittlere Weglänge Σd / n (Beschreibung im Panel: „average length of the shortest path“) */
  const STANDARD = {
    generationen: 20, nachkommen: 30, eltern: 10, kreuzung: 0.8, mutation: 0.1, neuAnteil: 0.1, mischen: false,
    baumtiefe: 7, minLaenge: 30, maxLaenge: 100, minAbstand: 20, zufallsWinkel: 10, maxArme: 4,
    kL: 0.219, kW: 1, variante: 0, ziel2: "closeness"
  };
  /** die beiden Lesarten von f₂ (beide werden minimiert: kleine größte Closeness bzw. kurze größte mittlere Weglänge) */
  const ZIELE2 = ["closeness", "weglaenge"];
  /** feste Werte im Inneren der kompilierten Komponenten (legacy-generation.md §1; freier Winkel 80°, drei Arm-Plätze und Grad 4 an
      den Wurzeln, 1 m Fang, Arme ≥ 1 m, höchstens 20 000 Baumknoten: Generierung.INTERN) und eigene Werte der App */
  const INTERN = Object.assign({}, Generierung.INTERN, {
    glaetten: 1,         // Network Smooth: Snap threshold 1
    pGen: 0.05           // Anteil der Knoten, deren Gene eine Mutation neu zieht
  });
  const ART = Generierung.ART;

  /* ---------------------------------------------------------------- Szene */
  /** Beispielszene (Meter, y nach unten): fünfeckiges Baufeld in einer Stadt wie im Katalogbild, drei Startstraßen
      (zwei Achsen von West nach Ost, eine Zufahrt von Nordosten), Umgebungsstraßen nur als Hintergrund. */
  function szene() {
    const rand = [[120, 408], [258, 62], [445, 42], [652, 175], [420, 500]];
    const start = [
      [[30, 232], [188, 238], [290, 247], [395, 256], [490, 262], [584, 270]],
      [[170, 106], [236.5, 116], [330, 129], [430, 142], [540, 157], [652, 175]],
      [[610, 60], [572, 112], [548, 128]]
    ];
    const ring = Geo.versetze(rand, -48);
    const umgebung = [];
    ring.forEach((q, i) => { umgebung.push([q, ring[(i + 1) % ring.length]]); umgebung.push([rand[i], q]); });
    umgebung.push([[0, 228], [30, 232]], [[170, 106], [70, 86]], [[70, 86], [0, 96]], [[610, 60], [640, 0]],
                  [[420, 500], [380, 540]], [[652, 175], [680, 168]], [[120, 408], [0, 452]], [[258, 62], [230, 0]], [[445, 42], [470, 0]]);
    return { b: 680, h: 540, rand, start, umgebung };
  }

  /* ---------------------------------------------------------------- Straßengraph, Instruktionsbaum und Wachstum (_gemeinsam/generierung.js)
     Grundnetz aus Rand und Startstraßen, Arm mit geordneten Fangregeln, Richtung in die größte freie Lücke, Gene je Knoten und
     der zufällige Instruktionsbaum (Street Network Chromosome) stehen in Generierung und gelten gleich für stadtsynthese und
     gebaeude-generierung. */
  const { netzNeu, knotenNeu, kanteNeu, kanteTeilen, fuegeStreckeEin, grundnetz, imAussenrand, arm, richtung, armRichtung, gene } = Generierung;
  /** Zufälliger Instruktionsbaum (Street Network Chromosome) → {wurzeln: [{kinder: [...]}], anzahl} */
  const baum = (zufall, nWurzeln, p) => Generierung.baum(zufall, nWurzeln, p);

  /* ---------------------------------------------------------------- Chromosom: Kreuzung und Mutation */
  function kopiereKnoten(k) { return { winkel: k.winkel, laenge: k.laenge, maxArme: k.maxArme, teiler: k.teiler, kinder: k.kinder.map(kopiereKnoten) }; }
  const kopiereBaum = b => ({ wurzeln: b.wurzeln.map(w => ({ kinder: w.kinder.map(kopiereKnoten) })), anzahl: b.anzahl });
  /** Kreuzung: Wurzeln sind bei allen Chromosomen dieselben (Knoten der Startstraßen); je Arm-Platz einer Wurzel stammt der ganze
      Teilbaum zufällig vom einen oder anderen Elternteil (gleichmäßige Kreuzung über die Teilbäume). */
  function kreuze(a, b, zufall) {
    const wurzeln = a.wurzeln.map((wa, i) => {
      const wb = b.wurzeln[i] || wa, n = Math.max(wa.kinder.length, wb.kinder.length), kinder = [];
      for (let j = 0; j < n; j++) { const q = zufall() < 0.5 ? wa : wb, k = q.kinder[j] || (q === wa ? wb : wa).kinder[j]; if (k) kinder.push(kopiereKnoten(k)); }
      return { kinder };
    });
    return { wurzeln, anzahl: zaehle({ wurzeln }) };
  }
  function zaehle(b) { let n = 0; const st = b.wurzeln.slice(); while (st.length) { const k = st.pop(); for (const c of k.kinder) { n++; st.push(c); } } return n; }
  /** Mutation: jeder Knoten zieht mit Wahrscheinlichkeit pGen neue Gene (Winkel, Länge, Grad, Teiler) – in beide Richtungen */
  function mutiere(b, zufall, p, pGen = INTERN.pGen) {
    const st = b.wurzeln.slice();
    while (st.length) { const k = st.pop(); for (const c of k.kinder) { if (zufall() < pGen) Object.assign(c, gene(zufall, p)); st.push(c); } }
    return b;
  }

  /** ChromosomeMapper: Baum → Straßennetz (Generierung.wachse). Die Knoten werden breitenweise abgearbeitet (alle Wurzeln je Ebene
      verschränkt); ein Knoten wächst vom Endpunkt seines Elternknotens aus, wenn dieser offen ist, dessen Grad unter maxArme liegt
      und eine Lücke ≥ 80° frei ist. stat zählt die Ablehnungsgründe. → {segmente: [[a, b]], art: [ART], gesetzt: Zahl der gesetzten Arme} */
  function wachse(b, S, p, stat) {
    const w = Generierung.wachse(b, S, p, { stat });
    return { segmente: w.segmente, art: w.art, gesetzt: w.gesetzt };
  }

  /* ---------------------------------------------------------------- Fitness */
  /** Closeness je Segment wie die Legacy-Komponente 4. FWGetPaths: n / Σd (n erreichte Segmente, d kürzeste Wegkosten im gerichteten
      Segmentgraphen, ohne Radius); isolierte Segmente 0. Eigene schnelle Dijkstra-Suche über die Zustände von Geo.richtungsGraph
      (gleiches Ergebnis wie Geo.segmentClosenessVon(G, s).dcs2020). → Float64Array */
  function naehe(G, art = "closeness") {
    const z = G.z, n = G.n;
    let m = 0; for (let s = 0; s < z; s++) m += G.nb[s].length;
    const off = new Int32Array(z + 1), zi = new Int32Array(m), ko = new Float64Array(m);
    for (let s = 0, j = 0; s < z; s++) { off[s] = j; for (const x of G.nb[s]) { zi[j] = x[0]; ko[j] = x[1]; j++; } off[z] = j; }
    const dist = new Float64Array(z), fest = new Uint8Array(z), cc = new Float64Array(n);
    const hk = new Float64Array(m + 2 * z + 2), hv = new Int32Array(m + 2 * z + 2);
    for (let s = 0; s < n; s++) {
      dist.fill(Infinity); fest.fill(0);
      let hn = 0;
      const push = (k, v) => { let i = hn++; while (i > 0) { const q = (i - 1) >> 1; if (hk[q] <= k) break; hk[i] = hk[q]; hv[i] = hv[q]; i = q; } hk[i] = k; hv[i] = v; };
      const pop = () => {
        const top = hv[0], lk = hk[--hn], lv = hv[hn]; let i = 0;
        while (true) { let c = 2 * i + 1; if (c >= hn) break; if (c + 1 < hn && hk[c + 1] < hk[c]) c++; if (hk[c] >= lk) break; hk[i] = hk[c]; hv[i] = hv[c]; i = c; }
        hk[i] = lk; hv[i] = lv; return top;
      };
      dist[2 * s] = 0; dist[2 * s + 1] = 0; push(0, 2 * s); push(0, 2 * s + 1);
      while (hn > 0) {
        const v = pop(); if (fest[v]) continue; fest[v] = 1;
        const dv = dist[v];
        for (let j = off[v]; j < off[v + 1]; j++) { const w = zi[j], d = dv + ko[j]; if (d < dist[w]) { dist[w] = d; push(d, w); } }
      }
      let cnt = 0, sum = 0;
      for (let t = 0; t < n; t++) { if (t === s) continue; const d = Math.min(dist[2 * t], dist[2 * t + 1]); if (d < Infinity) { cnt++; sum += d; } }
      cc[s] = art === "weglaenge" ? (cnt > 0 ? sum / cnt : NaN) : (sum > 0 ? cnt / sum : 0);
    }
    return cc;
  }

  /** Fitness eines Straßennetzes (Set Fitness Values): f1 = (1/(L + 0.000001))·10000 (L = Gesamtlänge, Number-Ausdruck der .gh),
      f2 = größter Wert je Segment (C#_Normalize → maxValue) – je nach p.ziel2 der Closeness n / Σd oder der mittleren Weglänge
      Σd / n. Beide Ziele werden minimiert. cc enthält den Wert je Segment in der gewählten Lesart. → {N, cc, L, f1, f2} */
  function bewerte(segmente, p) {
    const N = Geo.netz(segmente, INTERN.glaetten);
    const G = Geo.richtungsGraph(N, { kL: p.kL, kW: p.kW, norm: "dcs2020" });
    const cc = naehe(G, p.ziel2 === "weglaenge" ? "weglaenge" : "closeness");
    let L = 0; for (const e of N.kanten) L += e.l;
    let f2 = 0; for (const c of cc) if (c > f2) f2 = c;             // NaN (isoliert) zählt nicht
    return { N, cc, L, f1: (1 / (L + 0.000001)) * 10000, f2 };
  }

  /* ---------------------------------------------------------------- Auswahl (zwei Ziele, minimiert) */
  /** a dominiert b: in keinem Ziel schlechter, in einem besser (beide Ziele klein = gut) */
  const dominiert = (a, b) => a.f1 <= b.f1 && a.f2 <= b.f2 && (a.f1 < b.f1 || a.f2 < b.f2);
  /** nicht dominierte Individuen (Pareto-Front), nach f1 sortiert */
  function front(liste) {
    const L = liste.slice().sort((a, b) => a.f1 - b.f1 || a.f2 - b.f2 || a.id - b.id), F = [];
    let best = Infinity;
    for (const x of L) if (x.f2 < best) { F.push(x); best = x.f2; }
    return F;
  }
  /** SPEA2 (Zitzler, Laumanns & Thiele 2001) als Auswahl aus der PISA-Sammlung: Stärke S = Zahl der Dominierten, Rohfitness R =
      Σ S der Dominierenden, Dichte D = 1 / (σ_k + 2) mit dem Abstand zum k-ten Nachbarn (k = ⌊√N⌋, Ziele auf 0…1 normiert),
      Fitness F = R + D. Archiv: alle mit F < 1 (nicht dominiert); zu wenige → mit den besten Dominierten auffüllen, zu viele →
      Ausdünnen (wiederholt das Individuum mit dem kleinsten Abstand zum nächsten Nachbarn entfernen). → {archiv (nach F sortiert), F} */
  function spea2(pop, mu) {
    const n = pop.length, F = new Map();
    if (!n) return { archiv: [], F };
    let a1 = Infinity, b1 = -Infinity, a2 = Infinity, b2 = -Infinity;
    for (const x of pop) { a1 = Math.min(a1, x.f1); b1 = Math.max(b1, x.f1); a2 = Math.min(a2, x.f2); b2 = Math.max(b2, x.f2); }
    const s1 = b1 - a1 > 1e-12 ? b1 - a1 : 1, s2 = b2 - a2 > 1e-12 ? b2 - a2 : 1;
    const X = pop.map(x => [(x.f1 - a1) / s1, (x.f2 - a2) / s2]);
    const D = Array.from({ length: n }, () => new Float64Array(n));
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) D[i][j] = D[j][i] = Math.hypot(X[i][0] - X[j][0], X[i][1] - X[j][1]);
    const S = new Float64Array(n);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j && dominiert(pop[i], pop[j])) S[i]++;
    const k = Math.max(1, Math.min(n - 1, Math.floor(Math.sqrt(n))));
    const fit = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let R = 0; for (let j = 0; j < n; j++) if (i !== j && dominiert(pop[j], pop[i])) R += S[j];
      const d = Array.from(D[i]).filter((_, j) => j !== i).sort((x, y) => x - y), sk = n > 1 ? d[k - 1] : 0;
      fit[i] = R + 1 / (sk + 2);
      F.set(pop[i].id, fit[i]);
    }
    const ord = [...pop.keys()].sort((i, j) => fit[i] - fit[j] || pop[i].id - pop[j].id);
    let A = ord.filter(i => fit[i] < 1);
    if (A.length < mu) A = ord.slice(0, Math.min(mu, n));
    else {
      while (A.length > mu) {
        let weg = -1, bestL = null;
        for (const i of A) {
          const L = A.filter(j => j !== i).map(j => D[i][j]).sort((x, y) => x - y);
          if (!bestL || kleinerLex(L, bestL)) { bestL = L; weg = i; }
        }
        A = A.filter(i => i !== weg);
      }
    }
    A.sort((i, j) => fit[i] - fit[j] || pop[i].id - pop[j].id);
    return { archiv: A.map(i => pop[i]), F };
  }
  function kleinerLex(a, b) { for (let i = 0; i < a.length && i < b.length; i++) { if (a[i] < b[i] - 1e-12) return true; if (a[i] > b[i] + 1e-12) return false; } return false; }

  /** OffspringGenerator: Nachkommen aus den Eltern. Je Nachkomme: mit Random Generation ein ganz neues Zufallsnetz, sonst Eltern
      i und i + 1 der (bei Shuffle Chromosomes gemischten) Elternliste; mit Crossover Rate gekreuzt, sonst Kopie des ersten;
      danach mit Mutation Rate mutiert. → [{baum, herkunft}] */
  function nachkommen(eltern, p, zufall, nWurzeln) {
    const n = Math.max(0, Math.round(p.nachkommen)), E = eltern.slice(), out = [];
    if (p.mischen) for (let i = E.length - 1; i > 0; i--) { const j = zufall.ganz(i + 1); [E[i], E[j]] = [E[j], E[i]]; }
    for (let i = 0; i < n; i++) {
      if (!E.length || zufall() < p.neuAnteil) { out.push({ baum: baum(zufall, nWurzeln, p), herkunft: "neu" }); continue; }
      const a = E[i % E.length].baum, b = E[(i + 1) % E.length].baum;
      let kind, herkunft;
      if (zufall() < p.kreuzung) { kind = kreuze(a, b, zufall); herkunft = "kreuzung"; } else { kind = kopiereBaum(a); herkunft = "kopie"; }
      if (zufall() < p.mutation) { mutiere(kind, zufall, p); herkunft += "+mutation"; }
      out.push({ baum: kind, herkunft });
    }
    return out;
  }

  /* ---------------------------------------------------------------- Ablauf */
  /** ein Individuum: Baum → Netz → Fitness; Geometrie kompakt gespeichert (für Diagramm, Miniaturen, Anzeige) */
  function individuum(z, b, herkunft, gen, p) {
    const ph = wachse(b, z.S, p), B = bewerte(ph.segmente, p), N = B.N, m = N.kanten.length;
    const seg = new Float32Array(4 * m), cc = new Float32Array(m);
    N.kanten.forEach((e, k) => { const a = N.knoten[e.a], c = N.knoten[e.b]; seg.set([a[0], a[1], c[0], c[1]], 4 * k); cc[k] = B.cc[k]; });
    return { id: z.naechsteId++, g: gen, herkunft, baum: b, f1: B.f1, f2: B.f2, L: B.L, n: m, seg, cc, gesetzt: ph.gesetzt };
  }
  function nWurzeln(S) { return S.start.reduce((s, pl) => s + pl.length, 0); }

  /** Generation 0: ChromosomeFactory erzeugt Nr Parents Zufallsnetze; sie werden bewertet und bilden das erste Archiv */
  function generationNull(z, p) {
    z.alle = []; z.gen = 0; z.t = 0; z.wahlFest = false; z.naechsteId = 0;
    const mu = Math.max(1, Math.round(p.eltern));
    const start = [];
    for (let i = 0; i < mu; i++) start.push(individuum(z, baum(z.zufall, nWurzeln(z.S), p), "neu", 0, p));
    z.alle.push(...start);
    z.archiv = spea2(start, mu).archiv;
    nachAuswahl(z, p);
  }
  function nachAuswahl(z, p) {
    const im = new Set(z.archiv.map(x => x.id));
    for (const x of z.alle) if (!im.has(x.id)) x.baum = null;          // Gene nur für das Archiv aufheben
    z.front = front(z.alle);
    if (!z.wahlFest) z.wahl = variante(z, p.variante);
  }
  /** Archiv sortiert wie „Show Variant“ (Sort List nach der Summe f1 + f2, aufsteigend) */
  function sortiert(z) { return z.archiv.slice().sort((a, b) => (a.f1 + a.f2) - (b.f1 + b.f2) || a.id - b.id); }
  function variante(z, i) { const A = sortiert(z); return A.length ? A[Math.max(0, Math.min(A.length - 1, Math.round(i)))].id : -1; }
  const finde = (z, id) => z.alle.find(x => x.id === id) || null;

  /** neuer Zustand: Szene, Generation 0 */
  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const z = { t: 0, S: szene(), zufall, alle: [], archiv: [], front: [], gen: 0, wahl: -1, wahlFest: false, naechsteId: 0 };
    generationNull(z, p);
    return z;
  }
  /** Ein Schritt = eine Generation: Nachkommen erzeugen und bewerten, mit dem Archiv zusammen auswählen (SPEA2, Mu = Nr Parents) */
  function schritt(z, p) {
    if (!fertig(z, p)) {
      const mu = Math.max(1, Math.round(p.eltern)), g = z.gen + 1;
      const kinder = nachkommen(z.archiv, p, z.zufall, nWurzeln(z.S)).map(k => individuum(z, k.baum, k.herkunft, g, p));
      z.alle.push(...kinder);
      z.archiv = spea2(z.archiv.concat(kinder), mu).archiv;
      z.gen = g;
      nachAuswahl(z, p);
    }
    z.t++;
    return z;
  }
  const fertig = (z, p) => z.gen >= Math.round(p.generationen);

  /** Parameter ohne Neustart: GA-Parameter gelten ab der nächsten Generation; Show Variant wählt die Variante im Archiv */
  function aendere(z, p, id) {
    if (id === "variante") { z.wahlFest = false; z.wahl = variante(z, p.variante); }
  }
  /** Variante direkt wählen (Klick in Diagramm oder Leiste) */
  function waehle(z, id) { if (finde(z, id)) { z.wahl = id; z.wahlFest = true; } }
  /** Rand- oder Startstraßenpunkt verschieben (wie in Rhino) und die Optimierung neu beginnen */
  function verschiebe(z, p, griff, q) {
    const L = griff.art === "rand" ? z.S.rand : z.S.start[griff.i];
    const j = griff.art === "rand" ? griff.i : griff.j;
    L[j] = [Math.max(0, Math.min(z.S.b, q[0])), Math.max(0, Math.min(z.S.h, q[1]))];
    generationNull(z, p);
  }
  /** Griff (Randecke oder Stützpunkt einer Startstraße) im Umkreis r → {art, i, j} | null */
  function griffBei(z, q, r) {
    let best = null, bd = r;
    z.S.rand.forEach((x, i) => { const d = Geo.abstand(x, q); if (d <= bd) { bd = d; best = { art: "rand", i }; } });
    z.S.start.forEach((pl, i) => pl.forEach((x, j) => { const d = Geo.abstand(x, q); if (d <= bd) { bd = d; best = { art: "start", i, j }; } }));
    return best;
  }

  return { STANDARD, ZIELE2, INTERN, ART, szene, netzNeu, knotenNeu, kanteNeu, kanteTeilen, fuegeStreckeEin, grundnetz, imAussenrand, arm,
           richtung, armRichtung, gene, baum, kopiereBaum, kreuze, zaehle, mutiere, wachse, naehe, bewerte, dominiert, front, spea2,
           nachkommen, individuum, generationNull, sortiert, variante, finde, erzeuge, schritt, fertig, aendere, waehle, verschiebe, griffBei };
});
