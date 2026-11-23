/* Vom Straßennetz zum Gebäude · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung des Grasshopper-Moduls „Building Generation“ aus dem Parametric Planning Catalogue (DeCodingSpaces) mit dem Modul
   „Placement on Parcel“ (BuildingPlacementOnParcels, DeCodingSpaces – Martin Dennemark) als Option „Gebäude aus Vorlagen“.
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Kette wie die Schaltung der .gh-Datei:
   1. Street Network Generator (Boundary, IniStreets → Instruktionsbaum, Wachstum in die größte freie Lücke) → Lines
   2. Blocks (Customized Parameters: minBlockArea, blockOffset = Negative(Block Offset)) → geschlossene Flächen, nach innen versetzt
   3. Parcels (PlotWidthThreshold, StreetOffset 0) → rekursive Zweiteilung, gesteuert von der Straßenfront
   4. Buildable Area (RoadSetback, SideSetback, BackSetback, Tolerance π/4) → Baufenster je Parzelle
   5. Building Generation (BuildingDepth, BuildingLength 20, BuildingType, Orientation, FAR, FloorHeight 4) → Grundflächen, Geschosse,
      Höhe → Area/Larger Than MinBuildingFootprintArea → Cull Pattern → Extrude (Unit Z × BuildingHeight)
   Option „Gebäude aus Vorlagen“ (Placement on Parcel): rechteckige Vorlagen-Blöcke mit Baukörpern; jeder Baukörper gehört zur
   nächsten Kante der Vorlage, Kante i der Parzelle übernimmt die Baukörper der Vorlagenkante i mod 4 an derselben Längsposition;
   zu lange und den Parzellenrand schneidende Baukörper fallen weg; die Vorlage je Parzelle ist zufällig (Random, Round).
   Ein Schritt ist ein Element der jeweiligen Stufe: ein Straßenarm, ein Block, die Parzellen, Baufenster bzw. Gebäude eines Blocks.

   Die DeCodingSpaces-Komponenten sind kompiliert. Abgleich mit dem rekonstruierten Quelltext der DeCodingSpaces-Toolbox
   (Bauhaus-InfAU/decoding-spaces-toolbox, GPL-3.0; Ablauf, Voreinstellungen und Randfälle aus docs/research/legacy-generation.md
   §1, §2, §5–§8 und src/DecodingSpaces.Grasshopper/Components/Legacy/LegacySynthesisComponents.cs abgelesen; kein Code übernommen). */
(function (wurzel, fabrik) {
  const node = typeof module === "object" && module.exports;
  const M = fabrik(node ? require("../_gemeinsam/geo.js") : wurzel.Geo, node ? require("../../simulationen/_gemeinsam/zufall.js") : wurzel.Zufall);
  if (node) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Geo, Zufall) {
  "use strict";
  const { sub, add, mul, dot, kreuz, norm, abstand } = Geo;

  /** Voreinstellungen der .gh-Datei (Schieberegler: Wert [Bereich]; feste Eingänge „PD“):
      Street Network Generator: TreeDepth 9 [0..20]; MinLength 30, MaxLength 100 (Spanne: Länge ∈ [30, 130) m), MinDist 20,
        RandomAngle 10, MaxArms 4, ProbabilityToAddArms 1 (wirkungslos), SeedForRandom −1 (hier: Saat der App)
      Customized Parameters → Blocks: minBlockArea 1920 [0..10000], blockOffset = Negative(10 [0..10]) = −10
      Parcels: PlotWidthThreshold 40 [0..100], StreetOffset 0 (Notiz: „better keep it at 0“), ConnectionDistance 1, Precision 100
      Buildable Area: RoadSetback 8 [0..10], SideSetback 8 [0..10], BackSetback 8 [0..10], Tolerance 0.785 (π/4)
      Building Generation: BuildingDepth 14 [0..100], BuildingLength 20, BuildingType 2 [0..10], Orientation 1 [0..1] (rad),
        FAR 0.5 [0..1], FloorHeight 4; MinBuildingFootprintArea 50 [0..100]
      Placement on Parcel: Random Seed 2 → hier mit der Saat verknüpft; vorlage „alle“ = zufällig je Parzelle */
  const STANDARD = {
    baumtiefe: 9, minLaenge: 30, maxLaenge: 100, minAbstand: 20, zufallsWinkel: 10, maxArme: 4,
    minBlockFlaeche: 1920, blockVersatz: 10,
    parzellenBreite: 40,
    strassenAbstand: 8, seitenAbstand: 8, rueckAbstand: 8, toleranz: 45,
    typ: "2", tiefe: 14, laenge: 20, orientierung: 1, orientierungAn: true, gfz: 0.5, geschossHoehe: 4, minGrundflaeche: 50,
    vorlagen: false, vorlage: "alle",
    drehung: 30, neigung: 40
  };
  /** feste Werte im Inneren der kompilierten Komponenten (legacy-generation.md) und eigene Grenzen der App */
  const INTERN = {
    freiwinkel: 80,        // SNG: kleinster freier Winkel für einen neuen Arm (_minAngle = 80°)
    wurzelArme: 3,         // SNG: drei Arm-Plätze je Knoten der Startstraßen
    wurzelMaxArme: 4,      // SNG: höchster Grad an den Wurzeln
    fangStart: 1,          // SNG: Rand und Startstraßen werden mit 1 m Fangabstand eingefügt
    maxKnoten: 20000,      // Obergrenze des Instruktionsbaums (bei TreeDepth 20 wüchse er sonst auf Millionen Knoten)
    minSegment: 1,         // kürzere Arme werden verworfen
    winkelTol: 0.01,       // Parcels: „quasi-kollinear“ (rad)
    kollinear: 1,          // Parcels: Abstand < 1 m zur Blockkante = Straßenkante
    frontTol: 0.5,         // Buildable Area / Building Generation: Front = Anfang, Ende und Mitte ≤ 0,5 m vom Block
    maxEbene: 30,          // Parcels: Schutz gegen endlose Rekursion (im Original Stapelüberlauf bei Schnitt der Länge 0)
    minBreite: 5,          // Parcels: kleinste wirksame PlotWidthThreshold
    zielSaat: 2            // Placement: Seed der Komponente Random
  };
  const ART = { RAND: 0, START: 1, NEU: 2 };
  const MASSSTAB = 1.8;                    // Szene: Katalogbild in Metern (1 Bildpunkt ≈ 1,8 m)
  const STUFEN = [
    { id: "strassen", name: { de: "1 Straßen", en: "1 Streets" } },
    { id: "bloecke", name: { de: "2 Blöcke", en: "2 Blocks" } },
    { id: "parzellen", name: { de: "3 Parzellen", en: "3 Parcels" } },
    { id: "baufenster", name: { de: "4 Baufenster", en: "4 Buildable area" } },
    { id: "gebaeude", name: { de: "5 Gebäude", en: "5 Buildings" } }
  ];

  /* ---------------------------------------------------------------- Szene */
  /** Beispielszene (Meter, y nach unten) nach dem Katalogbild: viereckiges Baufeld mit abgeschrägter Ecke am Stadtrand,
      drei Startstraßen (IniStreets) von außen an den Rand, Umgebungsstraßen nur als Hintergrund. */
  function szene() {
    const rand = [[160, 58], [560, 102], [572, 112], [272, 417], [42, 348]];
    const start = [
      [[90, 230], [175, 222], [260, 228], [345, 246], [422, 265]],
      [[470, 0], [430, 88]]
    ];
    const ring = Geo.versetze(rand, -40), umgebung = [];
    ring.forEach((q, i) => { umgebung.push([q, ring[(i + 1) % ring.length]]); });
    umgebung.push([rand[0], ring[0]], [rand[1], ring[1]], [rand[3], ring[3]], [rand[4], ring[4]],
                  [ring[0], [120, 0]], [ring[1], [620, 40]], [ring[3], [300, 450]], [ring[4], [0, 400]], [ring[2], [620, 160]],
                  [[0, 110], [60, 130]], [[60, 130], ring[0]], [[620, 250], [560, 230]], [[330, 450], [420, 380]], [[420, 380], [500, 300]]);
    const k = MASSSTAB, sk = P => P.map(q => [q[0] * k, q[1] * k]);
    return { b: 620 * k, h: 450 * k, rand: sk(rand), start: start.map(sk), umgebung: umgebung.map(sk) };
  }

  /* ---------------------------------------------------------------- 1. Street Network Generator
     Die folgenden Funktionen bis „wachse“ sind aus katalog/netzoptimierung/modell.js übernommen (gleiche Mapper-Logik
     „Chromosom → Straßennetz“, dort mit Tests); „wachse“ schreibt hier zusätzlich die Reihenfolge der Arme mit. */
  function netzNeu() { return { P: [], adj: [], E: [] }; }
  function knotenNeu(G, q) { G.P.push([q[0], q[1]]); G.adj.push([]); return G.P.length - 1; }
  function kanteNeu(G, a, b, art) { const k = G.E.length; G.E.push({ a, b, art, lebt: true }); G.adj[a].push(k); G.adj[b].push(k); return k; }
  const gegenueber = (G, v, k) => (G.E[k].a === v ? G.E[k].b : G.E[k].a);
  const grad = (G, v) => G.adj[v].length;
  const nachbarn = (G, v) => G.adj[v].map(k => gegenueber(G, v, k));
  const verbunden = (G, a, b) => G.adj[a].some(k => gegenueber(G, a, k) === b);
  const amRand = (G, v) => G.adj[v].some(k => G.E[k].art === ART.RAND);
  function kanteTeilen(G, k, v) {
    const e = G.E[k]; e.lebt = false;
    G.adj[e.a] = G.adj[e.a].filter(x => x !== k); G.adj[e.b] = G.adj[e.b].filter(x => x !== k);
    kanteNeu(G, e.a, v, e.art); kanteNeu(G, v, e.b, e.art);
  }
  function naechsterKnoten(G, q, ohne = -1) {
    let v = -1, d = Infinity;
    for (let i = 0; i < G.P.length; i++) {
      if (i === ohne) continue;
      const di = Math.hypot(G.P[i][0] - q[0], G.P[i][1] - q[1]); if (di < d) { d = di; v = i; }
    }
    return { v, d };
  }
  function naechsteKante(G, q, ohne = -1) {
    let best = { k: -1, d: Infinity, q: null, t: 0 };
    for (let k = 0; k < G.E.length; k++) {
      const e = G.E[k]; if (!e.lebt || e.a === ohne || e.b === ohne) continue;
      const r = Geo.abstandSegment(q, G.P[e.a], G.P[e.b]); if (r.d < best.d) best = { k, d: r.d, q: r.q, t: r.t };
    }
    return best;
  }
  function ersterSchnitt(G, a, b, v1, v2, k0) {
    let best = null;
    for (let k = 0; k < G.E.length; k++) {
      const e = G.E[k];
      if (!e.lebt || k === k0 || e.a === v1 || e.b === v1 || (v2 >= 0 && (e.a === v2 || e.b === v2))) continue;
      const s = Geo.segmentSchnitt(a, b, G.P[e.a], G.P[e.b]);
      if (s && s.t > 1e-9 && s.t < 1 - 1e-9 && (!best || s.t < best.t)) best = { k, t: s.t, p: s.p };
    }
    return best;
  }
  function knotenAnStrecke(G, a, b, v1, v2, md) {
    let best = null;
    for (let i = 0; i < G.P.length; i++) {
      if (i === v1 || i === v2 || !G.adj[i].length) continue;
      const r = Geo.abstandSegment(G.P[i], a, b);
      if (r.d < md && r.t > 1e-9 && r.t < 1 - 1e-9 && (!best || r.t < best.t)) best = { v: i, t: r.t };
    }
    return best;
  }
  /** Strecke a–b (Rand oder Startstraße) mit Fangabstand tol einfügen; gekreuzte Kanten werden geteilt */
  function fuegeStreckeEin(G, a, b, art, tol) {
    const ende = q => {
      const nv = naechsterKnoten(G, q); if (nv.v >= 0 && nv.d <= tol) return nv.v;
      const ne = naechsteKante(G, q); const v = knotenNeu(G, ne.k >= 0 && ne.d <= tol ? ne.q : q);
      if (ne.k >= 0 && ne.d <= tol) kanteTeilen(G, ne.k, v);
      return v;
    };
    const va = ende(a), vb = ende(b);
    if (va === vb) return [va, vb];
    const pa = G.P[va], pb = G.P[vb], kette = [];
    for (let k = 0; k < G.E.length; k++) {
      const e = G.E[k]; if (!e.lebt || e.a === va || e.b === va || e.a === vb || e.b === vb) continue;
      const s = Geo.segmentSchnitt(pa, pb, G.P[e.a], G.P[e.b]);
      if (s && s.t > 1e-9 && s.t < 1 - 1e-9) kette.push({ t: s.t, k, p: s.p });
    }
    kette.sort((x, y) => x.t - y.t);
    let u = va;
    for (const c of kette) {
      const e = G.E[c.k]; let v;
      if (abstand(c.p, G.P[e.a]) <= tol) v = e.a; else if (abstand(c.p, G.P[e.b]) <= tol) v = e.b;
      else { v = knotenNeu(G, c.p); kanteTeilen(G, c.k, v); }
      if (v !== u && !verbunden(G, u, v)) kanteNeu(G, u, v, art);
      u = v;
    }
    if (u !== vb && !verbunden(G, u, vb)) kanteNeu(G, u, vb, art);
    return [va, vb];
  }
  /** Grundnetz: Rand (geschlossen) und Startstraßen mit 1 m Fangabstand; eine Wurzel je Stützpunkt der Startstraßen */
  function grundnetz(S) {
    const G = netzNeu(), R = S.rand;
    for (let i = 0; i < R.length; i++) fuegeStreckeEin(G, R[i], R[(i + 1) % R.length], ART.RAND, INTERN.fangStart);
    for (const pl of S.start) for (let i = 0; i + 1 < pl.length; i++) fuegeStreckeEin(G, pl[i], pl[i + 1], ART.START, INTERN.fangStart);
    const wurzeln = [];
    for (const pl of S.start) for (const q of pl) wurzeln.push(naechsterKnoten(G, q).v);
    return { G, wurzeln };
  }
  /** Punkt im äußeren Rand (OuterBoundary fehlt → Rand + 1 m) */
  function imAussenrand(S, q) {
    if (Geo.punktInPoly(q, S.rand)) return true;
    const R = S.rand;
    for (let i = 0; i < R.length; i++) if (Geo.abstandSegment(q, R[i], R[(i + 1) % R.length]).d <= 1) return true;
    return false;
  }
  /** Einen Arm von pv zum Zielpunkt einfügen (Fangen an Knoten/Kanten im Abstand MinDist, Schnitt an der ersten gekreuzten
      Straße, Ziel außerhalb des äußeren Rands → verworfen). → {v, zu} oder null */
  function arm(G, S, pv, ziel, md, maxArme) {
    let q = ziel, zielV = -1, teilK = -1, zu = false;
    const nv = naechsterKnoten(G, q, pv);
    if (nv.v >= 0 && nv.d < md) { if (grad(G, nv.v) >= maxArme) return null; zielV = nv.v; q = G.P[zielV]; }
    else { const ne = naechsteKante(G, q, pv); if (ne.k >= 0 && ne.d < md && ne.t > 0 && ne.t < 1) { q = ne.q; teilK = ne.k; } }
    for (let runde = 0; runde < 6; runde++) {
      let geaendert = false;
      const s = ersterSchnitt(G, G.P[pv], q, pv, zielV, teilK);
      if (s) {
        const e = G.E[s.k], da = abstand(s.p, G.P[e.a]), db = abstand(s.p, G.P[e.b]);
        if (Math.min(da, db) <= INTERN.fangStart) { zielV = da <= db ? e.a : e.b; q = G.P[zielV]; teilK = -1; }
        else { zielV = -1; q = s.p; teilK = s.k; }
        geaendert = true;
      }
      const w = knotenAnStrecke(G, G.P[pv], q, pv, zielV, md);
      if (w) { zielV = w.v; q = G.P[zielV]; teilK = -1; geaendert = true; }
      if (zielV === pv) return null;
      if (zielV >= 0 && grad(G, zielV) >= maxArme) return null;
      if (!geaendert) break;
    }
    if (zielV < 0 && teilK < 0 && !imAussenrand(S, q)) return null;
    if (abstand(G.P[pv], q) < INTERN.minSegment) return null;
    if (zielV >= 0 && verbunden(G, pv, zielV)) return null;
    let v = zielV;
    if (v < 0) { v = knotenNeu(G, q); if (teilK >= 0) { if (G.E[teilK].art === ART.RAND) zu = true; kanteTeilen(G, teilK, v); } }
    else if (amRand(G, v)) zu = true;
    kanteNeu(G, pv, v, ART.NEU);
    return { v, zu };
  }
  const richtung = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
  /** Richtung des neuen Arms relativ zur Herkunft: ein Nachbar → 180° (geradeaus); sonst Winkelhalbierende der größten freien
      Lücke; Lücke < 80° → null; Lücke ≥ 260° → Versatz 45°/90°/135°/… vom Lückenanfang (teiler) */
  function armRichtung(P, pv, ref, nb, teiler) {
    if (nb.length <= 1) return 180;
    const a0 = richtung(P[pv], P[ref]);
    const W = [0];
    for (const v of nb) { const w = ((richtung(P[pv], P[v]) - a0) % 360 + 360) % 360; if (w > 1e-9 && w < 360 - 1e-9) W.push(w); }
    W.sort((x, y) => x - y);
    let luecke = -1, anfang = 0;
    for (let i = 0; i < W.length; i++) {
      const g = (i + 1 < W.length ? W[i + 1] : 360) - W[i];
      if (g > luecke + 1e-9) { luecke = g; anfang = W[i]; }
    }
    if (luecke < INTERN.freiwinkel) return null;
    if (luecke >= 260) luecke = 90 + 90 * Math.floor(teiler * Math.ceil(luecke / 90));
    return anfang + luecke / 2;
  }
  /** Gene eines Knotens: Winkel = Next(RandomAngle) − RandomAngle/2, Länge = Next(MaxLength) + MinLength, maxArme = Next(MaxArms − 1) + 2 */
  function gene(zufall, p) {
    const ra = Math.max(0, Math.round(p.zufallsWinkel)), ml = Math.max(1, Math.round(p.maxLaenge)), ma = Math.max(1, Math.round(p.maxArme));
    return { winkel: zufall.ganz(ra) - ra / 2, laenge: zufall.ganz(ml) + p.minLaenge, maxArme: zufall.ganz(ma - 1) + 2, teiler: zufall() };
  }
  /** Instruktionsbaum: je Knoten der Startstraßen eine Wurzel mit drei Arm-Plätzen, TreeDepth Ebenen breitenweise; jeder Knoten
      einen sicheren Platz und k − 1 weitere (k = Next(MaxArms − 1) + 1), ab Ebene 4 nur mit Wahrscheinlichkeit (k + 1)/Ebene */
  function baum(zufall, nWurzeln, p) {
    const ma = Math.max(1, Math.round(p.maxArme)), tiefe = Math.max(0, Math.round(p.baumtiefe));
    const wurzeln = [];
    let plaetze = [], anzahl = 0;
    for (let i = 0; i < nWurzeln; i++) { const w = { kinder: [] }; wurzeln.push(w); for (let j = 0; j < INTERN.wurzelArme; j++) plaetze.push(w); }
    for (let ebene = 1; ebene <= tiefe && plaetze.length; ebene++) {
      const naechste = [];
      for (const e of plaetze) {
        if (anzahl >= INTERN.maxKnoten) break;
        const c = Object.assign({ kinder: [], ebene }, gene(zufall, p));
        e.kinder.push(c); anzahl++; naechste.push(c);
        const k = zufall.ganz(ma - 1) + 1;
        for (let x = 1; x < k; x++) if (ebene <= 3 || zufall() <= (k + 1) / ebene) naechste.push(c);
      }
      plaetze = naechste;
    }
    return { wurzeln, anzahl };
  }
  /** Wachstum (StreetPattern.GrowStreetPatternNew): Knoten breitenweise; ein Knoten wächst vom Endpunkt seines Elternknotens,
      wenn dieser offen ist, dessen Grad unter maxArme liegt und eine Lücke ≥ 80° frei ist.
      → {G, segmente, art, arme: [{a, b, ebene}] in der Reihenfolge des Setzens} */
  function wachse(b, S, p) {
    const { G, wurzeln } = grundnetz(S);
    const md = Math.max(0, p.minAbstand), maxArme = Math.max(2, Math.round(p.maxArme)), arme = [];
    let ebene = b.wurzeln.map((w, i) => ({ k: w, e: null, pos: wurzeln[i] != null ? wurzeln[i] : -1, zu: false, wurzel: true }));
    while (ebene.length) {
      const naechste = [];
      for (const r of ebene) for (const c of r.k.kinder) naechste.push({ k: c, e: r, pos: -1, zu: false });
      for (const c of naechste) {
        const e = c.e;
        if (e.zu || e.pos < 0) { c.zu = true; continue; }
        const pv = e.pos, cap = e.wurzel ? INTERN.wurzelMaxArme : e.k.maxArme;
        if (grad(G, pv) >= cap) { e.zu = c.zu = true; continue; }
        const nb = nachbarn(G, pv);
        if (!nb.length) { c.zu = true; continue; }
        let ref = e.e && e.e.pos >= 0 && e.e.pos !== pv ? e.e.pos : nb[0];
        if (nb.length === 1) ref = nb[0];
        const dir = armRichtung(G.P, pv, ref, nb, c.k.teiler);
        if (dir === null) { c.zu = true; continue; }
        const th = (richtung(G.P[pv], G.P[ref]) + dir + c.k.winkel) * Math.PI / 180;
        const ziel = [G.P[pv][0] + c.k.laenge * Math.cos(th), G.P[pv][1] + c.k.laenge * Math.sin(th)];
        const a = arm(G, S, pv, ziel, md, maxArme);
        if (!a) { c.zu = true; continue; }
        c.pos = a.v; c.zu = a.zu;
        arme.push({ a: G.P[pv].slice(), b: G.P[a.v].slice(), ebene: c.k.ebene });
      }
      ebene = naechste;
    }
    const segmente = [], art = [];
    for (const e of G.E) if (e.lebt) { segmente.push([G.P[e.a], G.P[e.b]]); art.push(e.art); }
    return { G, segmente, art, arme };
  }

  /* ---------------------------------------------------------------- 2. Blocks */
  /** Geschlossene Flächen eines ebenen Liniennetzes (Sackgassen weg, Halbkanten, kleinste Zyklen; aus
      katalog/strassen-zu-parzellen/modell.js übernommen). Begrenzte Flächen haben positive Fläche (Geo.flaecheS). → [{poly, kanten}] */
  function flaechenAusLinien(N, minFlaeche = 1e-6) {
    const n = N.knoten.length, m = N.kanten.length, adj = Geo.adjazenz(N), gr = new Int32Array(n), aktiv = new Uint8Array(m).fill(1);
    N.kanten.forEach(e => { gr[e.a]++; gr[e.b]++; });
    const stapel = []; for (let v = 0; v < n; v++) if (gr[v] === 1) stapel.push(v);
    while (stapel.length) {
      const v = stapel.pop(); if (gr[v] !== 1) continue;
      for (const { j, k } of adj[v]) if (aktiv[k]) { aktiv[k] = 0; gr[v]--; gr[j]--; if (gr[j] === 1) stapel.push(j); break; }
    }
    const rund = N.knoten.map((q, v) => adj[v].filter(x => aktiv[x.k]).map(x => ({ j: x.j, k: x.k, w: Math.atan2(N.knoten[x.j][1] - q[1], N.knoten[x.j][0] - q[0]) }))
      .sort((a, b) => a.w - b.w));
    const lage = rund.map(L => { const Mp = new Map(); L.forEach((x, i) => Mp.set(x.k, i)); return Mp; });
    const halb = (u, k) => 2 * k + (N.kanten[k].a === u ? 0 : 1), besucht = new Uint8Array(2 * m), out = [];
    for (let k0 = 0; k0 < m; k0++) {
      if (!aktiv[k0]) continue;
      for (const u0 of [N.kanten[k0].a, N.kanten[k0].b]) {
        if (besucht[halb(u0, k0)]) continue;
        const Z = []; let u = u0, k = k0, sicher = 0;
        do {
          besucht[halb(u, k)] = 1; Z.push({ v: u, k });
          const e = N.kanten[k], v = e.a === u ? e.b : e.a, L = rund[v], nx = L[(lage[v].get(k) - 1 + L.length) % L.length];
          u = v; k = nx.k;
        } while (halb(u, k) !== halb(u0, k0) && ++sicher <= 2 * m);
        let weiter = true;
        while (weiter && Z.length > 2) {
          weiter = false;
          for (let i = 0; i < Z.length; i++) { const j = (i + 1) % Z.length; if (Z[i].k === Z[j].k) { Z.splice(Math.max(i, j), 1); Z.splice(Math.min(i, j), 1); weiter = true; break; } }
        }
        if (Z.length < 3) continue;
        const poly = Z.map(x => N.knoten[x.v]);
        if (Geo.flaecheS(poly) > minFlaeche) out.push({ poly, kanten: Z.map(x => x.k) });
      }
    }
    return out;
  }

  /** Jede Kante i des Polygons (positive Fläche) um d[i] parallel verschieben – d > 0 nach außen, d < 0 nach innen – und
      Nachbarkanten schneiden; verschwindende Kanten fallen heraus (aus katalog/parzellen-versatz/modell.js übernommen). → Polygon | null */
  function versetzeKanten(poly, d, grenze = 4) {
    const n = poly.length;
    let E = [];
    for (let i = 0; i < n; i++) {
      const a = poly[i], b = poly[(i + 1) % n], t = norm(sub(b, a)), o = [t[1], -t[0]];
      E.push({ p: add(a, mul(o, d[i])), t, o, d: d[i], a, i });
    }
    const fuss = (q, e) => add(e.p, mul(e.t, dot(sub(q, e.p), e.t)));
    const ecke = (e1, e2) => {
      const q = e2.a, cr = kreuz(e1.t, e2.t), f1 = fuss(q, e1), f2 = fuss(q, e2);
      if (Math.abs(cr) < 1e-9) return abstand(f1, f2) < 1e-9 ? [f1] : [f1, f2];
      const s = kreuz(sub(e2.p, e1.p), e2.t) / cr, x = add(e1.p, mul(e1.t, s));
      const auseinander = dot(sub(x, f1), e1.t) > 1e-9;
      if (auseinander && abstand(x, q) > grenze * Math.max(Math.abs(e1.d), Math.abs(e2.d), 1e-9)) return [f1, f2];
      return [x];
    };
    for (let runde = 0; runde <= n; runde++) {
      const m = E.length;
      if (m < 3) return null;
      const V = E.map((e, j) => ecke(E[(j + m - 1) % m], e));
      let schlimm = -1, wert = -1e-9;
      for (let j = 0; j < m; j++) {
        const von = V[j][V[j].length - 1], bis = V[(j + 1) % m][0], v = dot(sub(bis, von), E[j].t);
        if (v < wert) { wert = v; schlimm = j; }
      }
      if (schlimm < 0) {
        const P = [].concat(...V);
        return Geo.flaecheS(P) > 1e-6 ? P : null;
      }
      E.splice(schlimm, 1);
    }
    return null;
  }
  /** einfaches Polygon: keine zwei nicht benachbarten Kanten schneiden sich */
  function einfach(P) {
    const n = P.length;
    for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      const s = Geo.segmentSchnitt(P[i], P[(i + 1) % n], P[j], P[(j + 1) % n]);
      if (s && s.t > 1e-7 && s.t < 1 - 1e-7 && s.u > 1e-7 && s.u < 1 - 1e-7) return false;
    }
    return true;
  }
  /** liegt Q (bis auf tol) in P? (alle Ecken innen oder auf dem Rand) */
  function liegtIn(Q, P, tol = 0.05) {
    return Q.every(q => Geo.punktInPoly(q, P) || P.some((a, i) => Geo.abstandSegment(q, a, P[(i + 1) % P.length]).d <= tol));
  }
  /** Blocks: Flächen aus den Straßenlinien (Polygonize), Versatz blockOffset (< 0 verkleinert), Fläche < minBlockArea entfällt,
      sortiert nach Fläche absteigend. → [{roh, poly, A, behalten, grund}] (behaltene zuerst) */
  function bloeckeAus(G, p) {
    const N = { knoten: G.P, kanten: G.E.filter(e => e.lebt).map(e => ({ a: e.a, b: e.b })) };
    const out = flaechenAusLinien(N).map(f => {
      const roh = Geo.bereinige(f.poly, 1e-6), off = -Math.max(0, p.blockVersatz);
      let poly = Math.abs(off) < 1e-9 ? roh.slice() : versetzeKanten(roh, roh.map(() => off));
      if (poly) poly = Geo.bereinige(poly, 1e-6);
      const gueltig = !!poly && poly.length >= 3 && einfach(poly) && liegtIn(poly, roh, 0.05 + Math.abs(off) * 1e-6);
      const A = gueltig ? Geo.flaeche(poly) : 0;
      const behalten = gueltig && A >= p.minBlockFlaeche;
      return { roh, poly: gueltig ? poly : null, A, behalten, grund: !gueltig ? "versatz" : behalten ? "" : "flaeche" };
    });
    out.sort((x, y) => (y.behalten - x.behalten) || (y.A - x.A) || (Geo.flaeche(y.roh) - Geo.flaeche(x.roh)));
    return out;
  }

  /* ---------------------------------------------------------------- 3. Parcels (rekursive Zweiteilung nach Straßenfront)
     Verfahren nach legacy-generation.md §6.2 (PG): Block so drehen, dass die lange Seite seines kleinsten umschließenden Rechtecks
     waagrecht liegt; Straßenkanten = quasi-kollinear (< 0,01 rad, Abstand < 1 m) mit einer Blockkante; ohne Straßenkante → Blatt;
     Rücken an Rücken bei durchgehenden Streifen; die längste Kante mit 0,5·|e| ≥ PlotWidthThreshold bestimmt die Schnittrichtung
     (senkrecht zu ihr), Schnitt auf der Mittellinie des Hüllrechtecks. Hilfsfunktionen nach katalog/parzellen-slicing-tree/modell.js. */
  const dreh = (q, c, w) => { const co = Math.cos(w), si = Math.sin(w), x = q[0] - c[0], y = q[1] - c[1]; return [c[0] + co * x - si * y, c[1] + si * x + co * y]; };
  function rechteckWinkel(poly) {
    const H = Geo.konvexeHuelle(poly);
    let best = { A: Infinity, w: 0 };
    for (let i = 0; i < H.length; i++) {
      const a = H[i], b = H[(i + 1) % H.length], phi = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const Q = H.map(q => dreh(q, [0, 0], -phi)), bb = Geo.bbox(Q), A = bb.b * bb.h;
      if (A < best.A - 1e-9) best = { A, w: bb.b >= bb.h ? -phi : -phi + Math.PI / 2 };
    }
    return best.w;
  }
  function kantenVon(poly) { return poly.map((a, i) => { const b = poly[(i + 1) % poly.length]; return { a, b, l: abstand(a, b), i }; }); }
  const winkelDiff = (u, v) => { let d = Math.abs(Math.atan2(u[1], u[0]) - Math.atan2(v[1], v[0])) % Math.PI; return Math.min(d, Math.PI - d); };
  function istStrasse(k, wurzel) {
    const m = Geo.lerp(k.a, k.b, 0.5), d = sub(k.b, k.a);
    return wurzel.some(r => winkelDiff(d, sub(r.b, r.a)) < INTERN.winkelTol && Geo.abstandSegment(m, r.a, r.b).d < INTERN.kollinear);
  }
  function teileKanten(poly, wurzel) {
    const K = kantenVon(poly).filter(k => k.l > 1e-9), strasse = [], innen = [];
    for (const k of K) (istStrasse(k, wurzel) ? strasse : innen).push(k);
    strasse.sort((x, y) => y.l - x.l); innen.sort((x, y) => y.l - x.l);
    return { strasse, innen };
  }
  const senkrecht = k => { const w = Math.abs(Math.atan2(k.b[1] - k.a[1], k.b[0] - k.a[0])) * 180 / Math.PI; return w > 45 && w < 135; };
  const beruehren = (k, e, tol = 1e-6) => [k.a, k.b].some(q => Geo.abstandSegment(q, e.a, e.b).d < tol) || [e.a, e.b].some(q => Geo.abstandSegment(q, k.a, k.b).d < tol);
  function parallelAbstand(k, e) {
    if (winkelDiff(sub(k.b, k.a), sub(e.b, e.a)) >= INTERN.winkelTol) return -1;
    const n = norm([-(e.b[1] - e.a[1]), e.b[0] - e.a[0]]);
    return Math.abs(dot(sub(Geo.lerp(k.a, k.b, 0.5), e.a), n));
  }
  /** Teilungsregel eines Teils im gedrehten Rahmen → {op: "V"|"H", x|y} oder null (Blatt) */
  function regel(poly, wurzel, pwt) {
    const { strasse, innen } = teileKanten(poly, wurzel);
    if (!strasse.length) return null;
    let kandidaten = strasse.slice();
    if (strasse.length >= 2 && innen.length >= 2) {
      const [i1, i2] = innen, abst = parallelAbstand(i2, i1), gegen = strasse.some(k => !beruehren(k, strasse[0]));
      if (abst >= pwt && gegen && i1.l > 2 * pwt) kandidaten = kandidaten.concat([i2, i1]).sort((x, y) => y.l - x.l);
    }
    const e = kandidaten.find(k => 0.5 * k.l >= pwt);
    if (!e) return null;
    const bb = Geo.bbox(poly);
    return senkrecht(e) ? { op: "H", y: bb.y0 + 0.5 * bb.h } : { op: "V", x: bb.x0 + 0.5 * bb.b };
  }
  function teileAchse(poly, r) {
    const q = r.op === "V" ? [r.x, 0] : [0, r.y], n = r.op === "V" ? [1, 0] : [0, 1];
    const a = Geo.bereinige(Geo.schneideHalbebene(poly, q, n), 1e-7), b = Geo.bereinige(Geo.schneideHalbebene(poly, q, [-n[0], -n[1]]), 1e-7);
    const A = Geo.flaeche(poly);
    if (a.length < 3 || b.length < 3 || Geo.flaeche(a) < 1e-6 * A || Geo.flaeche(b) < 1e-6 * A) return null;
    return [a, b];
  }
  /** Parzellen eines Blocks (Blätter der Zweiteilung) in Weltkoordinaten, Kante 0 = längste Straßenkante */
  function parzellen(block, p) {
    const pwt = Math.max(INTERN.minBreite, p.parzellenBreite), c = Geo.schwerpunkt(block), w = rechteckWinkel(block);
    const wurzelPoly = block.map(q => dreh(q, c, w)), wurzel = kantenVon(wurzelPoly), out = [];
    (function rek(poly, ebene) {
      const r = ebene < INTERN.maxEbene ? regel(poly, wurzel, pwt) : null, s = r && teileAchse(poly, r);
      if (s) { rek(s[0], ebene + 1); rek(s[1], ebene + 1); return; }
      out.push(poly.map(q => dreh(q, c, -w)));
    })(wurzelPoly, 0);
    return out.map(P => parzelle(Geo.bereinige(P, 1e-6), block));
  }
  /** Front einer Kante: Anfang, Ende und Mitte höchstens 0,5 m vom Blockrand (Buildable Area / Building Generation) */
  function amBlock(a, b, block) {
    const d = q => { let m = Infinity; for (let i = 0; i < block.length; i++) m = Math.min(m, Geo.abstandSegment(q, block[i], block[(i + 1) % block.length]).d); return m; };
    return d(a) <= INTERN.frontTol && d(b) <= INTERN.frontTol && d(Geo.lerp(a, b, 0.5)) <= INTERN.frontTol;
  }
  /** Parzelle mit Frontkanten; Eckfolge so gedreht, dass Kante 0 die längste Frontkante ist → {poly, front, A, frontLaenge} */
  function parzelle(P, block) {
    let front = P.map((a, i) => amBlock(a, P[(i + 1) % P.length], block));
    let i0 = -1, l0 = -1;
    front.forEach((f, i) => { const l = abstand(P[i], P[(i + 1) % P.length]); if (f && l > l0) { l0 = l; i0 = i; } });
    if (i0 > 0) { P = P.slice(i0).concat(P.slice(0, i0)); front = front.slice(i0).concat(front.slice(0, i0)); }
    let fl = 0; front.forEach((f, i) => { if (f) fl += abstand(P[i], P[(i + 1) % P.length]); });
    return { poly: P, front, A: Geo.flaeche(P), frontLaenge: fl };
  }

  /* ---------------------------------------------------------------- 4. Buildable Area */
  /** Außennormale der Kante a→b eines Polygons mit positiver Fläche */
  const aussenNormale = (a, b) => { const t = norm(sub(b, a)); return [t[1], -t[0]]; };
  /** Winkel von u nach v in [0, 2π) */
  const winkelVonNach = (u, v) => { let w = Math.atan2(v[1], v[0]) - Math.atan2(u[1], u[0]); while (w < 0) w += 2 * Math.PI; while (w >= 2 * Math.PI) w -= 2 * Math.PI; return w; };
  /** Rolle jeder Kante: "front" | "seite" | "hinten". Nicht-Front-Kanten: Normale gegenüber einer Frontnormalen (≈ π) → hinten,
      ≈ π/2 bzw. 3π/2 → Seite (links/rechts), je ± Tolerance; hinten, wenn keine Front da ist oder die Kante einer Front gegenüberliegt
      und zu keiner Front quer steht; sonst Seite. */
  function kantenRollen(P, front, tolGrad) {
    const tol = tolGrad * Math.PI / 180, n = P.length, N = P.map((a, i) => aussenNormale(a, P[(i + 1) % n]));
    const F = []; front.forEach((f, i) => { if (f) F.push(i); });
    const nahe = (w, ziel) => Math.abs(w - ziel) <= tol;
    return P.map((_, i) => {
      if (front[i]) return "front";
      if (!F.length) return "hinten";
      let gegen = false, quer = false;
      for (const f of F) {
        const w = winkelVonNach(N[f], N[i]);
        if (nahe(w, Math.PI)) gegen = true;
        if (nahe(w, Math.PI / 2) || nahe(w, 3 * Math.PI / 2)) quer = true;
      }
      return gegen && !quer ? "hinten" : "seite";
    });
  }
  /** Baufenster einer Parzelle: jede Kante um ihren Abstand (Straße/Seite/hinten) nach innen versetzen und neu schneiden.
      → {poly, rollen} oder {poly: null, rollen} (Parzelle zu klein) */
  function baufenster(par, p) {
    const rollen = kantenRollen(par.poly, par.front, p.toleranz);
    const ab = { front: p.strassenAbstand, seite: p.seitenAbstand, hinten: p.rueckAbstand };
    const d = rollen.map(r => -Math.max(0, ab[r]));
    let poly = d.every(x => x === 0) ? par.poly.slice() : versetzeKanten(par.poly, d);
    if (poly) poly = Geo.bereinige(poly, 1e-6);
    if (!poly || poly.length < 3 || !einfach(poly) || !liegtIn(poly, par.poly) || Geo.flaeche(poly) < 1) return { poly: null, rollen };
    return { poly, rollen };
  }

  /* ---------------------------------------------------------------- 5. Building Generation */
  /** Frontkanten des Baufensters: parallel (< 0,01 rad) zu einer Frontkante der Parzelle im Abstand RoadSetback (± 0,5 m)
      („parallel tangents“ wie CheckIndices) */
  function baufensterFront(B, par, road) {
    const F = kantenVon(par.poly).filter(k => par.front[k.i]);
    return kantenVon(B).map(k => k.l > 1e-6 && F.some(f => winkelDiff(sub(k.b, k.a), sub(f.b, f.a)) < INTERN.winkelTol &&
      Math.abs(Math.abs(dot(sub(Geo.lerp(k.a, k.b, 0.5), f.a), norm([-(f.b[1] - f.a[1]), f.b[0] - f.a[0]]))) - road) <= INTERN.frontTol));
  }
  /** Polygon P mit dem konvexen Polygon K beschneiden (Halbebenen der Kanten von K, positive Fläche) */
  function beschneide(P, K) {
    let Q = P;
    for (let i = 0; i < K.length && Q.length >= 3; i++) Q = Geo.schneideHalbebene(Q, K[i], aussenNormale(K[i], K[(i + 1) % K.length]));
    Q = Q.length >= 3 ? Geo.bereinige(Q, 1e-6) : [];
    return Q.length >= 3 && Geo.flaeche(Q) > 1e-3 ? Q : null;
  }
  /** Rechteck Länge × Tiefe um m, Achse u (Einheitsvektor) → Polygon mit positiver Fläche */
  function rechteck(m, u, L, D) {
    const v = [-u[1], u[0]], a = mul(u, L / 2), b = mul(v, D / 2);
    const R = [sub(sub(m, a), b), sub(add(m, a), b), add(add(m, a), b), add(sub(m, a), b)];
    return Geo.flaecheS(R) > 0 ? R : R.reverse();
  }
  /** Grundfläche(n) einer Parzelle nach BuildingType: 0 (und alle anderen Werte) freistehend, 1 Zeile, 2 Blockrand.
      → {aussen, loch|null, seg} oder {aussen: null, grund} */
  function grundflaeche(B, par, p) {
    const fr = baufensterFront(B, par, Math.max(0, p.strassenAbstand));
    let s = -1, l = -1;
    kantenVon(B).forEach((k, i) => { if (fr[i] && k.l > l) { l = k.l; s = i; } });
    if (s < 0) return { aussen: null, grund: "front" };                         // Parzelle ohne Frontkante: kein Gebäude (wie im Original)
    const a = B[s], b = B[(s + 1) % B.length], t = norm(sub(b, a)), nIn = [-t[1], t[0]], loc = Geo.lerp(a, b, 0.5);
    const typ = Math.round(Number(p.typ));
    if (typ === 2) {
      const d = fr.map(f => (f ? -Math.max(0, p.tiefe) : 0));
      let hof = versetzeKanten(B, d);
      if (hof) hof = Geo.bereinige(hof, 1e-6);
      if (!hof || hof.length < 3 || Geo.flaeche(hof) < 1 || !einfach(hof) || !liegtIn(hof, B)) hof = null;   // nichts gefunden → ganzes Baufenster
      return { aussen: B, loch: hof, seg: [a, b] };
    }
    const o = ((Number(p.orientierung) % Math.PI) + Math.PI) % Math.PI;
    const u = p.orientierungAn ? [Math.cos(o), Math.sin(o)] : t;
    let R = rechteck(loc, u, Math.max(0.1, p.laenge), Math.max(0.1, p.tiefe));
    const vor = Math.max(...R.map(c => -dot(sub(c, loc), nIn)));               // Fassade auf die Frontlinie schieben
    R = R.map(c => add(c, mul(nIn, vor)));
    let K = R;
    if (typ === 1) {                                                             // Zeile: lange Seiten durch das Hüllrechteck verlängert
      const bb = Geo.bbox(B), weit = 2 * Math.hypot(bb.b, bb.h) + p.laenge, m = Geo.lerp(R[0], R[2], 0.5);
      K = rechteck(m, u, weit, Math.max(0.1, p.tiefe));
    }
    const Q = beschneide(B, K);
    return Q ? { aussen: Q, loch: null, seg: [a, b] } : { aussen: null, grund: "leer" };
  }
  /** Geschosse wie das Original: ceil(FAR · A_Parzelle / A_Grundfläche), FAR = 0 → 1; GFA, erreichte FAR, Höhe */
  function geschosse(far, Aparzelle, Agrund, fh) {
    const n = far <= 0 || Agrund <= 0 ? 1 : Math.max(1, Math.ceil(far * Aparzelle / Agrund - 1e-9));
    return { n, gfa: n * Agrund, far: Aparzelle > 0 ? n * Agrund / Aparzelle : 0, hoehe: n * fh };
  }

  /* ---------------------------------------------------------------- Placement on Parcel: Vorlagen */
  /** Vorlagen-Blöcke: rechteckige Grundfläche b × t (Kante 0 von (0,0) nach (b,0), Inneres bei y > 0) mit Baukörpern [Polygon, Höhe] */
  const r4 = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const VORLAGEN = [
    { id: "riegel", name: { de: "Riegel", en: "Slab" }, b: 48, t: 40, objekte: [[r4(5, 4, 37, 16), 13], [r4(8, 28, 26, 37), 7]] },
    { id: "winkel", name: { de: "Winkel", en: "L-block" }, b: 48, t: 40, objekte: [[[[4, 4], [36, 4], [36, 15], [15, 15], [15, 30], [4, 30]], 16]] },
    { id: "punkt", name: { de: "Punkthäuser", en: "Point houses" }, b: 48, t: 40, objekte: [[r4(5, 5, 19, 19), 22], [r4(25, 5, 39, 19), 19], [r4(29, 24, 41, 36), 13]] },
    { id: "reihe", name: { de: "Reihenhäuser", en: "Row houses" }, b: 48, t: 40,
      objekte: [3, 10, 17, 24, 31, 38].map(x => [r4(x, 4, x + 7, 14), 8]) }
  ];
  /** Rahmen der Kante i (Horizontal Frame am Anfang): Ursprung, Richtung, Innennormale, Länge */
  function kantenRahmen(P, i) { const a = P[i], b = P[(i + 1) % P.length], t = norm(sub(b, a)); return { o: a, t, n: [-t[1], t[0]], l: abstand(a, b) }; }
  /** Baukörper einer Vorlage ihren Kanten zuordnen (Curve Closest Point vom Mittelpunkt des Hüllquaders, kleinster Abstand):
      → [{kante, pos (Längsposition), lokal: Ecken im Rahmen der Kante, hoehe}] nach Kante und Position sortiert */
  function vorlageZuordnen(V) {
    const basis = r4(0, 0, V.b, V.t), R = basis.map((_, i) => kantenRahmen(basis, i));
    return V.objekte.map(([poly, hoehe]) => {
      const bb = Geo.bbox(poly), m = [(bb.x0 + bb.x1) / 2, (bb.y0 + bb.y1) / 2];
      let k = 0, dk = Infinity, pos = 0;
      R.forEach((r, i) => { const q = Geo.abstandSegment(m, r.o, add(r.o, mul(r.t, r.l))); if (q.d < dk - 1e-9) { dk = q.d; k = i; pos = q.t * r.l; } });
      const r = R[k];
      return { kante: k, pos, hoehe, lokal: poly.map(q => [dot(sub(q, r.o), r.t), dot(sub(q, r.o), r.n)]) };
    }).sort((x, y) => x.kante - y.kante || x.pos - y.pos);
  }
  /** Schneidet der Rand von A den Rand von B? */
  function raenderSchneiden(A, B) {
    for (let i = 0; i < A.length; i++) for (let j = 0; j < B.length; j++)
      if (Geo.segmentSchnitt(A[i], A[(i + 1) % A.length], B[j], B[(j + 1) % B.length])) return true;
    return false;
  }
  /** Vorlage auf eine Parzelle setzen: Kante i der Parzelle nimmt die Baukörper der Vorlagenkante i mod 4 (Orient vom Rahmen der
      Vorlagenkante in den der Parzellenkante); Längsposition ≥ Kantenlänge (Smaller Than) und Schnitt mit dem Parzellenrand
      (Collision One|Many) fallen weg; dazu (ergänzt) Baukörper, deren Mitte außerhalb liegt. → {objekte: [{poly, hoehe, kante}], verworfen} */
  function setzeVorlage(par, Z) {
    const P = par.poly, objekte = []; let verworfen = 0;
    for (let i = 0; i < P.length; i++) {
      const r = kantenRahmen(P, i), k = i % 4;
      for (const o of Z) {
        if (o.kante !== k) continue;
        if (!(o.pos < r.l)) { verworfen++; continue; }
        const poly = o.lokal.map(([x, y]) => add(r.o, add(mul(r.t, x), mul(r.n, y))));
        if (raenderSchneiden(poly, P) || !Geo.punktInPoly(Geo.schwerpunkt(poly), P)) { verworfen++; continue; }
        objekte.push({ poly, hoehe: o.hoehe, kante: i });
      }
    }
    return { objekte, verworfen };
  }

  /* ---------------------------------------------------------------- Kette */
  const strassenSchluessel = (S, p) => JSON.stringify([S.rand, S.start, p.baumtiefe, p.minLaenge, p.maxLaenge, p.minAbstand, p.zufallsWinkel, p.maxArme]);
  /** Straßennetz (mit Zwischenspeicher, damit spätere Stufen ohne neues Wachstum neu rechnen) */
  function strassen(z, p) {
    const key = strassenSchluessel(z.S, p);
    if (z.cache && z.cache.key === key) return z.cache.wert;
    const zuf = Zufall.zufall(z.saatIntern);
    const nW = z.S.start.reduce((s, pl) => s + pl.length, 0);
    const wert = wachse(baum(zuf, nW, p), z.S, p);
    wert.laenge = wert.segmente.reduce((s, q, i) => s + (wert.art[i] === ART.NEU ? abstand(q[0], q[1]) : 0), 0);
    z.cache = { key, wert };
    return wert;
  }
  /** ganze Kette rechnen → z.K = {strassen, bloecke, behalten, je: [{parzellen, baufenster, gebaeude}], summe}, z.T, z.grenzen */
  function rechne(z, p) {
    const St = strassen(z, p), bloecke = bloeckeAus(St.G, p), behalten = bloecke.filter(b => b.behalten);
    const Zuordnung = VORLAGEN.map(vorlageZuordnen), zv = Zufall.zufall((z.saatIntern ^ INTERN.zielSaat) >>> 0 || 1);
    const gebaeude = [];
    const je = behalten.map((b, bi) => {
      const P = parzellen(b.poly, p), BF = P.map(par => baufenster(par, p)), G = [];
      P.forEach((par, pi) => {
        if (p.vorlagen) {
          const wahl = p.vorlage === "alle" ? Math.round(zv() * (VORLAGEN.length - 1)) : Math.max(0, VORLAGEN.findIndex(v => v.id === p.vorlage));
          const s = setzeVorlage(par, Zuordnung[wahl]);
          for (const o of s.objekte) {
            const Ag = Geo.flaeche(o.poly), n = Math.max(1, Math.round(o.hoehe / Math.max(0.1, p.geschossHoehe)));
            const g = { block: bi, parzelle: pi, aussen: o.poly, loch: null, A: Ag, n, gfa: n * Ag, hoehe: o.hoehe, vorlage: VORLAGEN[wahl].id, behalten: true };
            G.push(g); gebaeude.push(g);
          }
          return;
        }
        const B = BF[pi].poly;
        if (!B) return;
        const gf = grundflaeche(B, par, p);
        if (!gf.aussen) return;
        const Ag = Geo.flaeche(gf.aussen) - (gf.loch ? Geo.flaeche(gf.loch) : 0), ge = geschosse(p.gfz, par.A, Ag, p.geschossHoehe);
        const g = { block: bi, parzelle: pi, aussen: gf.aussen, loch: gf.loch, A: Ag, n: ge.n, gfa: ge.gfa, far: ge.far, hoehe: ge.hoehe, seg: gf.seg,
                    behalten: Ag > p.minGrundflaeche };                          // Area → Larger Than MinBuildingFootprintArea → Cull Pattern
        G.push(g); gebaeude.push(g);
      });
      return { parzellen: P, baufenster: BF, gebaeude: G };
    });
    const nP = je.reduce((s, x) => s + x.parzellen.length, 0), Ap = je.reduce((s, x) => s + x.parzellen.reduce((u, q) => u + q.A, 0), 0);
    const steh = gebaeude.filter(g => g.behalten);
    z.K = { strassen: St, bloecke, behalten, je, gebaeude,
            summe: { parzellen: nP, flaecheParzellen: Ap, front: je.reduce((s, x) => s + x.parzellen.reduce((u, q) => u + q.frontLaenge, 0), 0) / Math.max(1, nP),
                     baufenster: je.reduce((s, x) => s + x.baufenster.filter(b => b.poly).length, 0),
                     gebaeude: steh.length, aussortiert: gebaeude.length - steh.length,
                     gfa: steh.reduce((s, g) => s + g.gfa, 0), grund: steh.reduce((s, g) => s + g.A, 0),
                     maxN: steh.reduce((s, g) => Math.max(s, g.n), 0), maxH: steh.reduce((s, g) => Math.max(s, g.hoehe), 0) } };
    const n = [St.arme.length, bloecke.length, behalten.length, behalten.length, behalten.length];
    z.grenzen = []; let s = 0; for (const x of n) { s += x; z.grenzen.push(s); }
    z.T = s;
    return z;
  }

  /* ---------------------------------------------------------------- Zustand und Ablauf */
  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const S = szene();
    const z = { t: 0, S, b: S.b, h: S.h, saatIntern: Math.floor(zufall() * 2147483646) + 1, cache: null };
    return rechne(z, p);
  }
  /** Ein Schritt: das nächste Element der aktuellen Stufe (Straßenarm, Block, Parzellen/Baufenster/Gebäude eines Blocks) */
  function schritt(z) { z.t++; return z; }
  const fertig = z => z.t >= z.T;
  /** Stand zur Zeit t: {stufe (0–4, 5 = fertig), k (Elemente der Stufe fertig), n (Elemente der Stufe)} */
  function stand(z, t = z.t) {
    let a = 0;
    for (let s = 0; s < 5; s++) {
      const e = z.grenzen[s];
      if (t < e) return { stufe: s, k: t - a, n: e - a };
      a = e;
    }
    return { stufe: 5, k: 0, n: 0 };
  }
  /** wie viele Elemente der Stufe s zur Zeit t sichtbar sind */
  function sichtbar(z, s, t = z.t) { const a = s ? z.grenzen[s - 1] : 0; return Math.max(0, Math.min(z.grenzen[s] - a, t - a)); }
  /** zur nächsten Stufe springen (Aktion) */
  function naechsteStufe(z) { const st = stand(z); z.t = st.stufe >= 5 ? z.T : z.grenzen[st.stufe]; while (stand(z).stufe < 5 && stand(z).n === 0) z.t = z.grenzen[stand(z).stufe]; }
  /** Parameter ohne Neustart: die Kette wird neu gerechnet (gleiches Straßenwachstum, solange dessen Werte gleich bleiben);
      war der Lauf fertig, bleibt er fertig, sonst bleibt die Stufe erhalten */
  const ANSICHT = new Set(["drehung", "neigung"]);
  function aendere(z, p, id) {
    if (ANSICHT.has(id)) return;
    const war = fertig(z), st = stand(z);
    rechne(z, p);
    if (war) z.t = z.T;
    else z.t = Math.min(z.T, (st.stufe ? z.grenzen[st.stufe - 1] : 0) + Math.min(st.k, (z.grenzen[st.stufe] || 0) - (st.stufe ? z.grenzen[st.stufe - 1] : 0)));
  }
  /** Randecke oder Stützpunkt einer Startstraße verschieben (wie in Rhino) und die Kette neu rechnen */
  function verschiebe(z, p, griff, q) {
    const L = griff.art === "rand" ? z.S.rand : z.S.start[griff.i], j = griff.art === "rand" ? griff.i : griff.j;
    L[j] = [Math.max(0, Math.min(z.S.b, q[0])), Math.max(0, Math.min(z.S.h, q[1]))];
    const war = fertig(z);
    rechne(z, p);
    z.t = war ? z.T : Math.min(z.t, z.T);
  }
  function griffBei(z, q, r) {
    let best = null, bd = r;
    z.S.rand.forEach((x, i) => { const d = abstand(x, q); if (d <= bd) { bd = d; best = { art: "rand", i }; } });
    z.S.start.forEach((pl, i) => pl.forEach((x, j) => { const d = abstand(x, q); if (d <= bd) { bd = d; best = { art: "start", i, j }; } }));
    return best;
  }

  return { STANDARD, INTERN, ART, STUFEN, VORLAGEN, szene, netzNeu, knotenNeu, kanteNeu, kanteTeilen, fuegeStreckeEin, grundnetz, imAussenrand,
           arm, richtung, armRichtung, gene, baum, wachse, flaechenAusLinien, versetzeKanten, einfach, liegtIn, bloeckeAus,
           rechteckWinkel, kantenVon, istStrasse, teileKanten, regel, teileAchse, parzellen, amBlock, parzelle,
           kantenRollen, baufenster, baufensterFront, beschneide, rechteck, grundflaeche, geschosse,
           kantenRahmen, vorlageZuordnen, raenderSchneiden, setzeVorlage, rechne, erzeuge, schritt, fertig, stand, sichtbar,
           naechsteStufe, aendere, verschiebe, griffBei };
});
