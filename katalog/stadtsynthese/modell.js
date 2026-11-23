/* Stadtsynthese · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung der Generierungskette aus dem Workshop „SSS12 Workshop | Parametric urban planning with Space Syntax and
   DeCodingSpaces-toolbox for Grasshopper“ (12th Space Syntax Symposium, Peking 2019; Reinhard König, Martin Bielik, Yufan Miao),
   Dateien 190705_DS_01–03 (Generative Streets → StreetsParcels → StreetsParcelsBuildings), ergänzt um die Kennzahlen des
   eCAADe-2018-Workshops („180917_Computational Urban Synthesis“).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Kette wie die Schaltung von 190705_DS_03:
   1. Street Network Synthesis (InstructionTree): von den Anschlussstraßen (IniStreets) wachsen Äste nach dem Instruktionsbaum
      ins Gebiet (MinLength 30, MaxLength 100, MinDist 20, RandomAngle 20, MaxArms 4, TreeDepth 7, SeedForRandom 3).
   2. Network to Segments → Network Smooth (Snap threshold 1) → Cul de sac removal (Iterations 2).
   3. CityGraph (Length Coefficient 1, Angular Coefficient 0): Betweenness je Segment.
   4. Polygons from lines (MinBlockSize 2000, Line values = Betweenness) → Power (ExpScaling 0.5) → Multiplication
      (LinearScaling 0.12) → Custom offset (jede Blockkante um ihren eigenen Wert = halbe Straßenbreite) → Polyline Collapse
      und Simplify Curve (Toleranz 12).
   5. Slicing Tree Structure for Parcels (Customized Parameters: length 10, angle 90, nChildren 2, treeDepth 7, minDistance 1,
      maxRank 4; parcelWidth 35 oder größte √Betweenness des Blocks / 3) → kleine Parzellen filtern.
   6. Buildable Area (RoadSetback 5, SideSetback 3, BackSetback 3, Tolerance π/4).
   7. Building Generation (BuildingDepth 10, BuildingLength 30, BuildingType = Round(Zentralität · 3), FAR = Zentralität,
      FloorHeight 3) → min building area 60 m²; Höhe höchstens 27 m (BHMax aus eCAADe 2018).
   8. Kennzahlen wie im eCAADe-Workshop (Netzlänge, Geschossfläche, Geschäftsstraßen, öffentlich/privat, T- zu X-Kreuzungen,
      Konnektivität, relative Integration, Wege zu Bildung, ÖPNV und Freiraum).
   Ein Schritt = eine Stufe der Kette; das Straßenwachstum braucht je Ebene des Instruktionsbaums einen Schritt.

   Die Bausteine stammen aus den Apps dieses Katalogs (Verweis je Funktion): Instruktionsbaum und Wachstum aus
   ../netzoptimierung/modell.js, Flächen aus Linien und Kantenversatz aus ../parzellen-versatz/modell.js, Slicing Tree aus
   ../parzellen-slicing-tree/modell.js. Verfahren abgeglichen mit der DeCodingSpaces-Toolbox (Bauhaus-InfAU/decoding-spaces-toolbox,
   GPL-3.0; docs/research/legacy-generation.md §1, §6–§8, docs/generation.md); kein Code übernommen. */
(function (wurzel, fabrik) {
  const node = typeof module === "object" && module.exports;
  const M = fabrik(node ? require("../_gemeinsam/geo.js") : wurzel.Geo, node ? require("../_gemeinsam/szenen.js") : wurzel.Szenen);
  if (node) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Geo, Szenen) {
  "use strict";
  const { sub, add, mul, dot, kreuz, norm, abstand } = Geo;

  /** Voreinstellungen (Schieberegler der .gh-Dateien: Wert [Bereich]; feste Eingänge „PD“):
      1 Straßennetz – minLaenge: MinLength 30 [0..100] · maxLaenge: MaxLength 100 [0..120] (Spanne: Länge ∈ [30, 130) m)
        minAbstand: MinDist 20 (PD) · zufallsWinkel: RandomAngle 20 [0..60] · maxArme: MaxArms 4 (PD) · baumtiefe: TreeDepth 7 [0..20]
        saatStrassen: SeedForRandom 3 [0..100] · anschluss: Länge der Anschlussstücke im Gebiet (Extend Curve 80 m, siehe QUELLE.md)
      2 Bereinigen – sackgassen: Cul de sac removal Iterations 2 (PD)
      3/4 Zentralität und Blöcke – expSkalierung: ExpScaling 0.5 [0..1] · linSkalierung: LinearScaling 0.12 [0..1]
        minBlock: MinBlockSize 2000 [0..10000] · vereinfachen: Toleranz von Polyline Collapse / Simplify Curve 12 [0..15]
      5 Parzellen – parzellenModus: "zentralitaet" (parcelWidth = größte √BC des Blocks / teiler) oder "fest" (parcelWidth)
        parzellenBreite: parcelWidth 35 [0..100] · teiler: Division B 3 [0..10] · minParzelle: Larger Than 1 [0..1000] m²
      6 Baufenster – rStrasse/rSeite/rHinten: RoadSetback 5, SideSetback 3, BackSetback 3 (PD, in der Datei negativ)
      7 Gebäude – tiefe: BuildingDepth 10 [0..100] · laenge: BuildingLength 30 [0..100] · gfzFaktor: FAR = Zentralität × Faktor (1)
        geschoss: FloorHeight 3 (PD) · maxHoehe: BHMax 27 [0..100] (eCAADe 2018) · minGrundflaeche: min building area 60 [0..1000]
      8 Kennzahlen – geschaeft: Anteil der größten Betweenness, ab dem ein Segment Geschäftsstraße ist (eCAADe: Larger Than 700) */
  const STANDARD = {
    minLaenge: 30, maxLaenge: 100, minAbstand: 20, zufallsWinkel: 20, maxArme: 4, baumtiefe: 7, saatStrassen: 3, anschluss: 40,
    sackgassen: 2,
    expSkalierung: 0.5, linSkalierung: 0.12, minBlock: 2000, vereinfachen: 12,
    parzellenModus: "zentralitaet", parzellenBreite: 35, teiler: 3, minParzelle: 1,
    rStrasse: 5, rSeite: 3, rHinten: 3,
    tiefe: 10, laenge: 30, gfzFaktor: 1, geschoss: 3, maxHoehe: 27, minGrundflaeche: 60,
    geschaeft: 0.3,
    zeigeZentralitaet: true, zeigeParzellen: true, drehung: 35
  };
  /** Parameter, die nur die Darstellung betreffen (keine Neuberechnung) */
  const DARSTELLUNG = new Set(["zeigeZentralitaet", "zeigeParzellen", "drehung"]);
  /** feste Werte im Inneren der kompilierten Komponenten (legacy-generation.md) und eigene Grenzen der App */
  const INTERN = {
    freiwinkel: 80, wurzelArme: 3, wurzelMaxArme: 4, fangStart: 1, minSegment: 1, maxKnoten: 20000,   // Street Network Synthesis
    glaetten: 1,                 // Network Smooth: Snap threshold 1
    toleranzWinkel: Math.PI / 4, // Buildable Area: Tolerance 0.785398
    frontAbstand: 0.5,           // Buildable Area: Frontkante = Start, Ende und Mitte ≤ 0,5 m vom Block
    simplifyWinkel: 10,          // Simplify Curve: Angle Tolerance 10°
    minBreite: 4,                // kleinste Parzellenbreite der App (Schutz gegen sehr feine Teilung)
    teilung: 0.5,                // splitRate des Slicing Tree (registrierte Voreinstellung)
    maxEbene: 40                 // Schutz gegen endlose Rekursion im Slicing Tree
  };
  const ART = { RAND: 0, START: 1, NEU: 2 };
  /** Stufen der Kette (z.stufe = letzte fertige Stufe) */
  const STUFEN = [
    { id: "start", de: "Gebiet und Anschlussstraßen", en: "Site and connecting streets" },
    { id: "wachstum", de: "Straßennetz wächst (Instruktionsbaum)", en: "Street network grows (instruction tree)" },
    { id: "sackgassen", de: "Sackgassen entfernt", en: "Cul-de-sacs removed" },
    { id: "zentralitaet", de: "Betweenness (CityGraph)", en: "Betweenness (CityGraph)" },
    { id: "bloecke", de: "Blöcke mit Straßenbreite aus der Zentralität", en: "Blocks with street width from centrality" },
    { id: "parzellen", de: "Parzellen (Slicing Tree)", en: "Parcels (slicing tree)" },
    { id: "baufenster", de: "Baufenster (Buildable Area)", en: "Buildable areas" },
    { id: "gebaeude", de: "Gebäude (Building Generation)", en: "Buildings (building generation)" },
    { id: "kennzahlen", de: "Kennzahlen", en: "Measures" }
  ];
  const TYPEN = [{ de: "freistehend", en: "detached" }, { de: "Zeile", en: "row" }, { de: "Blockrand", en: "perimeter block" }];

  /* ================================================================ Zufall der Straßensaat */
  /** eigener Zufallsgenerator für SeedForRandom (mulberry32, wie simulationen/_gemeinsam/zufall.js), damit die Straßensaat
      unabhängig von der Saat der Szene ist. → () => [0, 1) mit .ganz(n) */
  function prng(saat) {
    let a = (Math.round(Number(saat)) >>> 0) + 0x9E3779B9 >>> 0;
    const f = function () {
      a = (a + 0x6D2B79F5) >>> 0; let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.ganz = n => Math.floor(f() * n);
    return f;
  }

  /* ================================================================ Szene */
  /** Umgebung (Szenen.stadt, 900 × 640 m) mit einem Baugebiet in der Mitte (Sechseck ≈ 15 ha, Ecken etwas verzogen).
      Freiraum (Park), Hochschule und Haltestelle liegen in der Umgebung (Ziele der Kennzahlen). → S (Umgebung ungeschnitten) */
  function szene(zufall) {
    const stadt = Szenen.stadt(zufall, { b: 900, h: 640, nx: 11, ny: 8, rand: 0, jitter: 0.18, strasse: 10, tiefe: 11, breite: [8, 16],
                                         luecke: 0.12, zusammen: 0.12, platz: false, kirche: false, gebaeude: true });
    const j = () => (zufall() - 0.5) * 40;
    const rand = [[235 + j(), 160 + j()], [505 + j(), 128 + j()], [690 + j(), 215 + j()], [680 + j(), 465 + j()], [440 + j(), 515 + j()], [215 + j(), 430 + j()]];
    const S = { b: 900, h: 640, stadt, rand };
    teileSzene(S);
    return S;
  }
  /** Schnitt der Umgebung mit dem Gebiet (ohne Zufall, nach jedem Verschieben einer Ecke neu):
      Umgebungsstraßen außerhalb (am Rand gekappt), Gebäude außerhalb, Anschlussstraßen (Kreuzungen der Umgebungsstraßen mit dem
      Rand, Abstand ≥ 110 m entlang des Rands; je eine Strecke von anschluss m ins Gebiet), Park, Hochschule, Haltestelle. */
  function teileSzene(S, anschluss = STANDARD.anschluss) {
    const R = S.rand, st = S.stadt, aussen = [], kreuz = [];
    const drin = q => Geo.punktInPoly(q, R);
    for (const s of st.strassen) {
      const T = [];
      for (let i = 0; i < R.length; i++) { const c = Geo.segmentSchnitt(s[0], s[1], R[i], R[(i + 1) % R.length]); if (c && c.t > 1e-9 && c.t < 1 - 1e-9) T.push({ t: c.t, p: c.p }); }
      T.sort((a, b) => a.t - b.t);
      const ts = [0].concat(T.map(x => x.t), [1]);
      for (let k = 0; k + 1 < ts.length; k++) {
        const a = Geo.lerp(s[0], s[1], ts[k]), b = Geo.lerp(s[0], s[1], ts[k + 1]);
        if (!drin(Geo.lerp(a, b, 0.5)) && abstand(a, b) > 1e-6) aussen.push([a, b]);
      }
      for (const x of T) {
        const d = norm(sub(s[1], s[0])), r = drin(add(x.p, mul(d, 1))) ? d : mul(d, -1);
        kreuz.push({ p: x.p, r });
      }
    }
    // Kreuzungen entlang des Rands ordnen und mit Mindestabstand auswählen (wie die Auswahl „connecting streets IDs“)
    const lauf = q => { let s = 0, best = { d: Infinity, s: 0 }; for (let i = 0; i < R.length; i++) { const a = R[i], b = R[(i + 1) % R.length], r = Geo.abstandSegment(q, a, b); if (r.d < best.d) best = { d: r.d, s: s + r.t * abstand(a, b) }; s += abstand(a, b); } return best.s; };
    const U = Geo.umfang(R);
    kreuz.forEach(k => { k.s = lauf(k.p); });
    kreuz.sort((a, b) => a.s - b.s);
    const wahl = [];
    for (const k of kreuz) if (!wahl.length || (k.s - wahl[wahl.length - 1].s >= 110 && U - k.s + wahl[0].s >= 110)) wahl.push(k);
    S.start = wahl.map(k => [k.p, add(k.p, mul(k.r, anschluss))]).filter(pl => drin(pl[1]));
    S.umgebung = aussen;
    const puffer = Geo.versetze(R, -8);
    S.gebaeude = st.gebaeude.filter(g => !g.some(q => Geo.punktInPoly(q, puffer)));
    // Ziele der Kennzahlen: Park oben links, Hochschule rechts, Haltestelle unten (jeweils der nächste Block bzw. Knoten außerhalb)
    const ausserhalb = st.bloecke.filter(b => !b.some(q => Geo.punktInPoly(q, puffer)));
    const naechsterBlock = (q, ohne) => ausserhalb.filter(b => b !== ohne).reduce((best, b) => (!best || abstand(Geo.schwerpunkt(b), q) < abstand(Geo.schwerpunkt(best), q) ? b : best), null);
    S.park = naechsterBlock([120, 110]);
    S.hochschule = naechsterBlock([820, 330], S.park);
    S.gebaeude = S.gebaeude.filter(g => !(S.park && Geo.punktInPoly(Geo.schwerpunkt(g), S.park)));
    const kn = st.knoten.filter(q => !Geo.punktInPoly(q, puffer));
    S.haltestelle = kn.reduce((best, q) => (!best || abstand(q, [470, 570]) < abstand(best, [470, 570]) ? q : best), null);
    return S;
  }

  /* ================================================================ 1. Street Network Synthesis (aus ../netzoptimierung/modell.js) */
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
    for (let i = 0; i < G.P.length; i++) { if (i === ohne) continue; const di = Math.hypot(G.P[i][0] - q[0], G.P[i][1] - q[1]); if (di < d) { d = di; v = i; } }
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
  /** Strecke a–b (Rand oder Anschlussstraße) mit Fangabstand tol einfügen, gekreuzte Kanten teilen → [Knoten a, Knoten b] */
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
  /** Grundnetz: Rand (Boundary) und Anschlussstraßen (IniStreets) mit 1 m Fang; eine Wurzel je Stützpunkt der Anschlussstraßen */
  function grundnetz(S) {
    const G = netzNeu(), R = S.rand;
    for (let i = 0; i < R.length; i++) fuegeStreckeEin(G, R[i], R[(i + 1) % R.length], ART.RAND, INTERN.fangStart);
    for (const pl of S.start) for (let i = 0; i + 1 < pl.length; i++) fuegeStreckeEin(G, pl[i], pl[i + 1], ART.START, INTERN.fangStart);
    const wurzeln = [];
    for (const pl of S.start) for (const q of pl) wurzeln.push(naechsterKnoten(G, q).v);
    return { G, wurzeln };
  }
  function imAussenrand(S, q) {
    if (Geo.punktInPoly(q, S.rand)) return true;
    const R = S.rand;
    for (let i = 0; i < R.length; i++) if (Geo.abstandSegment(q, R[i], R[(i + 1) % R.length]).d <= 1) return true;
    return false;
  }
  /** Einen Arm vom Knoten pv zum Zielpunkt einfügen (geordnete Fangregeln wie ../netzoptimierung: Knoten, Kante, erster Schnitt,
      Knoten an der Strecke; Rand schließt; außerhalb des äußeren Rands verworfen) → {v, zu} | null */
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
  /** Richtung des neuen Arms (Grad relativ zur Herkunft): ein Nachbar → 180°; sonst Winkelhalbierende der größten freien Lücke;
      Lücke < 80° → null; Lücke ≥ 260° → 45°/90°/135°/… vom Lückenanfang (teiler) */
  function armRichtung(P, pv, ref, nb, teiler) {
    if (nb.length <= 1) return 180;
    const a0 = richtung(P[pv], P[ref]);
    const W = [0];
    for (const v of nb) { const w = ((richtung(P[pv], P[v]) - a0) % 360 + 360) % 360; if (w > 1e-9 && w < 360 - 1e-9) W.push(w); }
    W.sort((x, y) => x - y);
    let luecke = -1, anfang = 0;
    for (let i = 0; i < W.length; i++) { const g = (i + 1 < W.length ? W[i + 1] : 360) - W[i]; if (g > luecke + 1e-9) { luecke = g; anfang = W[i]; } }
    if (luecke < INTERN.freiwinkel) return null;
    if (luecke >= 260) luecke = 90 + 90 * Math.floor(teiler * Math.ceil(luecke / 90));
    return anfang + luecke / 2;
  }
  /** Gene eines Knotens: Winkel = Next(RandomAngle) − RandomAngle/2, Länge = Next(MaxLength) + MinLength, maxArme = Next(MaxArms − 1) + 2 */
  function gene(zufall, p) {
    const ra = Math.max(0, Math.round(p.zufallsWinkel)), ml = Math.max(1, Math.round(p.maxLaenge)), ma = Math.max(1, Math.round(p.maxArme));
    return { winkel: zufall.ganz(ra) - ra / 2, laenge: zufall.ganz(ml) + p.minLaenge, maxArme: zufall.ganz(ma - 1) + 2, teiler: zufall() };
  }
  /** Instruktionsbaum: je Wurzel drei Arm-Plätze, TreeDepth Ebenen breitenweise; je Knoten ein sicherer und k − 1 weitere Plätze
      (k = Next(MaxArms − 1) + 1), ab Ebene 4 jeder weitere nur mit Wahrscheinlichkeit (k + 1) / Ebene → {wurzeln, anzahl} */
  function baum(zufall, nWurzeln, p) {
    const ma = Math.max(1, Math.round(p.maxArme)), tiefe = Math.max(0, Math.round(p.baumtiefe));
    const wurzeln = [];
    let plaetze = [], anzahl = 0;
    for (let i = 0; i < nWurzeln; i++) { const w = { kinder: [] }; wurzeln.push(w); for (let j = 0; j < INTERN.wurzelArme; j++) plaetze.push(w); }
    for (let ebene = 1; ebene <= tiefe && plaetze.length; ebene++) {
      const naechste = [];
      for (const e of plaetze) {
        if (anzahl >= INTERN.maxKnoten) break;
        const c = Object.assign({ kinder: [] }, gene(zufall, p));
        e.kinder.push(c); anzahl++; naechste.push(c);
        const k = zufall.ganz(ma - 1) + 1;
        for (let x = 1; x < k; x++) if (ebene <= 3 || zufall() <= (k + 1) / ebene) naechste.push(c);
      }
      plaetze = naechste;
    }
    return { wurzeln, anzahl };
  }
  /** Wachstum vorbereiten: Grundnetz, Instruktionsbaum aus SeedForRandom, Ebene 0 = Wurzeln */
  function wachstumStart(S, p) {
    const { G, wurzeln } = grundnetz(S);
    const B = baum(prng(p.saatStrassen), wurzeln.length, p);
    return { G, B, ebene: B.wurzeln.map((w, i) => ({ k: w, e: null, pos: wurzeln[i] != null ? wurzeln[i] : -1, zu: false, wurzel: true })), nr: 0, gesetzt: 0, neu: [] };
  }
  /** eine Ebene des Instruktionsbaums wachsen lassen (Knoten in Indexfolge, alle Wurzeln verschränkt) → Zahl der gesetzten Arme */
  function wachstumEbene(W, S, p) {
    const G = W.G, md = Math.max(0, p.minAbstand), maxArme = Math.max(2, Math.round(p.maxArme));
    const naechste = [];
    for (const r of W.ebene) for (const c of r.k.kinder) naechste.push({ k: c, e: r, pos: -1, zu: false });
    let n = 0; const k0 = G.E.length;
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
      c.pos = a.v; c.zu = a.zu; n++;
    }
    W.ebene = naechste; W.nr++; W.gesetzt += n;
    W.neu = G.E.slice(k0).filter(e => e.lebt && e.art === ART.NEU).map(e => [G.P[e.a], G.P[e.b]]);
    return n;
  }
  /** lebende Kanten des Wachstumsgraphen als Strecken */
  const segmenteVon = G => G.E.filter(e => e.lebt).map(e => [G.P[e.a], G.P[e.b]]);

  /* ================================================================ 2. Network Smooth, Cul de sac removal */
  /** Cul de sac removal: in jedem Durchgang (Iterations) fallen alle Segmente mit einem Endknoten vom Grad 1 weg.
      → {N (Geo.netz-Form), weg: entfernte Strecken} */
  function sackgassenEntfernen(N, iterationen) {
    let K = N.kanten.slice(); const weg = [];
    for (let it = 0; it < iterationen; it++) {
      const g = new Int32Array(N.knoten.length);
      for (const e of K) { g[e.a]++; g[e.b]++; }
      const bleibt = K.filter(e => g[e.a] > 1 && g[e.b] > 1);
      if (bleibt.length === K.length) break;
      for (const e of K) if (!(g[e.a] > 1 && g[e.b] > 1)) weg.push([N.knoten[e.a], N.knoten[e.b]]);
      K = bleibt;
    }
    return { N: Geo.netz(K.map(e => [N.knoten[e.a], N.knoten[e.b]]), 1e-6), weg };
  }

  /* ================================================================ 3. CityGraph: Betweenness */
  /** Betweenness je Segment (Length Coefficient 1, Angular Coefficient 0, alle Segmente Ursprung und Ziel, ohne Radius) im
      gerichteten Segmentgraphen (Geo.richtungsGraph, Legacy-Kosten „dcs2020“, Start- und Zielsegment zählen mit). */
  function betweenness(N) {
    const G = Geo.richtungsGraph(N, { kL: 1, kW: 0, norm: "dcs2020" }), bc = new Float64Array(G.n);
    for (let s = 0; s < G.n; s++) Geo.segmentBetweennessVon(G, s, null, null, bc, { enden: true });
    return bc;
  }

  /* ================================================================ 4. Polygons from lines, Custom offset (aus ../parzellen-versatz/modell.js) */
  /** Geschlossene Flächen eines ebenen Liniennetzes (Sackgassen abgeschnitten, kleinster Zyklus links der Laufrichtung).
      → [{poly (positive Fläche), kanten: Netzkante unter poly[i] → poly[i+1]}] */
  function flaechenAusLinien(N, minFlaeche = 1e-6) {
    const n = N.knoten.length, m = N.kanten.length, adj = Geo.adjazenz(N), g = new Int32Array(n), aktiv = new Uint8Array(m).fill(1);
    N.kanten.forEach(e => { g[e.a]++; g[e.b]++; });
    const stapel = []; for (let v = 0; v < n; v++) if (g[v] === 1) stapel.push(v);
    while (stapel.length) {
      const v = stapel.pop(); if (g[v] !== 1) continue;
      for (const { j, k } of adj[v]) if (aktiv[k]) { aktiv[k] = 0; g[v]--; g[j]--; if (g[j] === 1) stapel.push(j); break; }
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
  /** Custom offset: jede Kante i um d[i] parallel verschieben (d > 0 nach außen, d < 0 nach innen), Nachbarkanten schneiden;
      verschwundene Kanten fallen heraus. → Polygon (positive Fläche) oder null */
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
      if (schlimm < 0) { const P = [].concat(...V); return Geo.flaecheS(P) > 1e-6 ? P : null; }
      E.splice(schlimm, 1);
    }
    return null;
  }
  /** Polyline Collapse (Kanten kürzer als tol zu ihrem Mittelpunkt zusammenziehen) und Simplify Curve (Ecken mit weniger als
      10° Richtungsänderung entfernen). → Polygon (mindestens drei Ecken) */
  function vereinfache(poly, tol, winkel = INTERN.simplifyWinkel) {
    let P = Geo.bereinige(poly, 1e-6);
    while (P.length > 3 && tol > 0) {
      let i0 = -1, lmin = tol;
      for (let i = 0; i < P.length; i++) { const l = abstand(P[i], P[(i + 1) % P.length]); if (l < lmin) { lmin = l; i0 = i; } }
      if (i0 < 0) break;
      const j = (i0 + 1) % P.length, m = Geo.lerp(P[i0], P[j], 0.5);
      P[i0] = m; P.splice(j, 1);
    }
    let weiter = true;
    while (weiter && P.length > 3) {
      weiter = false;
      for (let i = 0; i < P.length; i++) {
        const a = P[(i + P.length - 1) % P.length], b = P[i], c = P[(i + 1) % P.length];
        const w = Math.abs(Math.atan2(kreuz(sub(b, a), sub(c, b)), dot(sub(b, a), sub(c, b)))) * 180 / Math.PI;
        if (w < winkel) { P.splice(i, 1); weiter = true; break; }
      }
    }
    return P;
  }
  /** Blöcke aus dem Netz: Flächen ≥ MinBlockSize; Versatz je Kante = BC^ExpScaling · LinearScaling (halbe Straßenbreite);
      Zentralität des Blocks = größte BC^ExpScaling seiner Kanten. Kleinere Flächen bleiben öffentlicher Raum (Plätze, Grün).
      → {bloecke: [{roh, poly, kanten, versatz, c, z}], plaetze: [poly]} */
  function bloeckeAusNetz(N, bc, p) {
    const F = flaechenAusLinien(N), bloecke = [], plaetze = [];
    for (const f of F) {
      if (Geo.flaeche(f.poly) < p.minBlock) { plaetze.push(f.poly); continue; }
      const w = f.kanten.map(k => Math.pow(Math.max(0, bc[k]), p.expSkalierung));
      const d = w.map(x => -x * p.linSkalierung);
      let poly = versetzeKanten(f.poly, d);
      if (!poly) continue;
      poly = vereinfache(poly, p.vereinfachen);
      if (poly.length < 3 || Geo.flaecheS(poly) <= 1) continue;
      bloecke.push({ roh: f.poly, poly, kanten: f.kanten, versatz: d.map(x => -x), c: Math.max(...w), z: 0 });
    }
    let lo = Infinity, hi = -Infinity;
    for (const b of bloecke) { lo = Math.min(lo, b.c); hi = Math.max(hi, b.c); }
    for (const b of bloecke) b.z = hi - lo > 1e-12 ? (b.c - lo) / (hi - lo) : 0;   // Bounds → Remap Numbers (0…1)
    return { bloecke, plaetze };
  }

  /* ================================================================ 5. Slicing Tree (aus ../parzellen-slicing-tree/modell.js) */
  const WINKEL_TOL = 0.01;
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
  function kantenVon(poly) { return poly.map((a, i) => { const b = poly[(i + 1) % poly.length]; return { a, b, l: abstand(a, b) }; }); }
  const winkelDiff = (u, v) => { let d = Math.abs(Math.atan2(u[1], u[0]) - Math.atan2(v[1], v[0])) % Math.PI; return Math.min(d, Math.PI - d); };
  function istStrasse(k, wurzel, skal) {
    const m = Geo.lerp(k.a, k.b, 0.5), d = sub(k.b, k.a);
    return wurzel.some(r => winkelDiff(d, sub(r.b, r.a)) < WINKEL_TOL && Geo.abstandSegment(m, r.a, r.b).d < skal);
  }
  function teileKanten(poly, wurzel, skal) {
    const K = kantenVon(poly).filter(k => k.l > 1e-9), strasse = [], innen = [];
    for (const k of K) (istStrasse(k, wurzel, skal) ? strasse : innen).push(k);
    strasse.sort((x, y) => y.l - x.l); innen.sort((x, y) => y.l - x.l);
    return { strasse, innen };
  }
  const senkrecht = k => { const w = Math.abs(Math.atan2(k.b[1] - k.a[1], k.b[0] - k.a[0])) * 180 / Math.PI; return w > 45 && w < 135; };
  const beruehren = (k, e, tol = 1e-6) => [k.a, k.b].some(q => Geo.abstandSegment(q, e.a, e.b).d < tol) || [e.a, e.b].some(q => Geo.abstandSegment(q, k.a, k.b).d < tol);
  function parallelAbstand(k, e) {
    if (winkelDiff(sub(k.b, k.a), sub(e.b, e.a)) >= WINKEL_TOL) return -1;
    const n = norm([-(e.b[1] - e.a[1]), e.b[0] - e.a[0]]);
    return Math.abs(dot(sub(Geo.lerp(k.a, k.b, 0.5), e.a), n));
  }
  /** Teilungsregel (gedrehter Rahmen): längste Straßenkante e mit splitRate·|e| > parcelWidth, Schnitt senkrecht zu ihr bei
      bbox.min + splitRate·bbox.größe; „Rücken an Rücken“ bei durchgehenden Streifen. → {op, x|y} | null (Blatt) */
  function regel(poly, wurzel, q) {
    const { strasse, innen } = teileKanten(poly, wurzel, q.skalierung);
    if (!strasse.length) return null;
    const kandidaten = strasse.slice();
    if (strasse.length >= 2 && innen.length >= 2) {
      const [i1, i2] = innen, abst = parallelAbstand(i2, i1);
      const gg = strasse.some(k => !beruehren(k, strasse[0]));
      if (abst >= q.minAbstand * q.teilung && gg && i1.l > 2 * q.breite) kandidaten.push(i1);
    }
    const e = kandidaten.find(k => q.teilung * k.l > q.breite);
    if (!e) return null;
    const bb = Geo.bbox(poly), op = senkrecht(e) ? "H" : "V";
    return op === "V" ? { op, x: bb.x0 + q.teilung * bb.b } : { op, y: bb.y0 + q.teilung * bb.h };
  }
  function teile(poly, r) {
    const q = r.op === "V" ? [r.x, 0] : [0, r.y], n = r.op === "V" ? [1, 0] : [0, 1];
    const a = Geo.bereinige(Geo.schneideHalbebene(poly, q, n), 1e-7), b = Geo.bereinige(Geo.schneideHalbebene(poly, q, [-n[0], -n[1]]), 1e-7);
    const A = Geo.flaeche(poly);
    if (a.length < 3 || b.length < 3 || Geo.flaeche(a) < 1e-6 * A || Geo.flaeche(b) < 1e-6 * A) return null;
    return [a, b];
  }
  /** Slicing Tree eines Blocks → Blätter (Parzellen, Weltkoordinaten, positive Fläche) */
  function parzelliere(block, breite) {
    const q = { breite, teilung: INTERN.teilung, skalierung: 1, minAbstand: 1 };
    const c = Geo.schwerpunkt(block), w = rechteckWinkel(block);
    const wurzelPoly = block.map(x => dreh(x, c, w)), wurzel = kantenVon(wurzelPoly), out = [];
    (function rek(poly, ebene) {
      const r = ebene < INTERN.maxEbene ? regel(poly, wurzel, q) : null, s = r && teile(poly, r);
      if (s) { rek(s[0], ebene + 1); rek(s[1], ebene + 1); }
      else { const P = poly.map(x => dreh(x, c, -w)); out.push(Geo.flaecheS(P) < 0 ? P.reverse() : P); }
    })(wurzelPoly, 0);
    return out;
  }
  /** parcelWidth eines Blocks: „fest“ = Regler parcelWidth; „zentralitaet“ = größte √BC des Blocks / Teiler (Division A/B) */
  function parzellenBreite(b, p) {
    const w = p.parzellenModus === "fest" ? p.parzellenBreite : b.c / Math.max(1e-9, p.teiler);
    return Math.max(INTERN.minBreite, w);
  }

  /* ================================================================ 6. Buildable Area */
  /** Abstand eines Punktes vom Rand eines Polygons */
  function abstandRand(q, poly) {
    let d = Infinity;
    for (let i = 0; i < poly.length; i++) d = Math.min(d, Geo.abstandSegment(q, poly[i], poly[(i + 1) % poly.length]).d);
    return d;
  }
  /** Kantenrollen einer Parzelle: "front" (Start, Ende und Mitte ≤ 0,5 m vom Blockrand), sonst Vergleich der Normalen mit den
      Frontkanten (Toleranz π/4): entgegengesetzt → "back", senkrecht → "side"; "back", wenn es keine Front gibt oder die Kante
      einer Front gegenüberliegt und zu keiner senkrecht steht, sonst "side". */
  function kantenRollen(parzelle, block) {
    const K = kantenVon(parzelle), tol = INTERN.toleranzWinkel;
    const front = K.map(k => k.l > 1e-6 && [k.a, k.b, Geo.lerp(k.a, k.b, 0.5)].every(q => abstandRand(q, block) <= INTERN.frontAbstand));
    const nrm = k => { const t = norm(sub(k.b, k.a)); return [t[1], -t[0]]; };
    const F = K.filter((k, i) => front[i]).map(nrm);
    return K.map((k, i) => {
      if (front[i]) return "front";
      if (!F.length) return "back";
      const n = nrm(k), W = F.map(f => Math.acos(Math.max(-1, Math.min(1, dot(f, n)))));
      const gegen = W.some(w => Math.abs(w - Math.PI) < tol), seitlich = W.some(w => Math.abs(w - Math.PI / 2) < tol);
      return gegen && !seitlich ? "back" : "side";
    });
  }
  const ruecksprung = (rolle, p) => (rolle === "front" ? p.rStrasse : rolle === "side" ? p.rSeite : p.rHinten);
  /** Baufenster: jede Kante um ihren Rücksprung nach innen versetzt → Polygon | null */
  function baufenster(parzelle, rollen, p) { return versetzeKanten(parzelle, rollen.map(r => -ruecksprung(r, p))); }

  /* ================================================================ 7. Building Generation */
  /** Typ aus der Zentralität: BuildingType = Round(Zentralität · 3); 1 = Zeile, 2 = Blockrand, sonst (0 und 3) freistehend
      (die Komponente behandelt jeden anderen Wert als freistehend) */
  function gebaeudeTyp(z) { const t = Math.round(z * 3); return t === 1 || t === 2 ? t : 0; }
  /** Geschosse wie die Komponente: FAR 0 → 1, sonst ⌈FAR · Parzelle / Grundfläche⌉; höchstens ⌊BHMax / FloorHeight⌋ */
  function geschosse(far, aParzelle, aGrund, p) {
    const max = Math.max(1, Math.floor(p.maxHoehe / p.geschoss + 1e-9));
    if (!(aGrund > 0)) return 0;
    const n = far > 0 ? Math.ceil(far * aParzelle / aGrund - 1e-9) : 1;
    return Math.max(1, Math.min(max, n));
  }
  /** Polygon mit konvexem Polygon C schneiden (Sutherland–Hodgman über die Kanten von C) */
  function schneideKonvex(P, C) {
    const H = Geo.flaecheS(C) > 0 ? C : C.slice().reverse();
    let Q = P;
    for (let i = 0; i < H.length && Q.length >= 3; i++) {
      const a = H[i], d = sub(H[(i + 1) % H.length], a);
      Q = Geo.schneideHalbebene(Q, a, [d[1], -d[0]]);
    }
    return Q.length >= 3 ? Q : [];
  }
  /** P ohne konvexes C: disjunkte Stücke P ∩ außen(e_i) ∩ innen(e_1 … e_{i−1}) */
  function ohneKonvex(P, C) {
    const H = Geo.flaecheS(C) > 0 ? C : C.slice().reverse(), out = [];
    let rest = P;
    for (let i = 0; i < H.length && rest.length >= 3; i++) {
      const a = H[i], d = sub(H[(i + 1) % H.length], a), aus = [d[1], -d[0]];
      const stueck = Geo.schneideHalbebene(rest, a, mul(aus, -1));
      if (stueck.length >= 3 && Geo.flaeche(stueck) > 1) out.push(Geo.bereinige(stueck, 1e-6));
      rest = Geo.schneideHalbebene(rest, a, aus);
    }
    return out;
  }
  /** Frontlinie einer Parzelle: längste Frontkante (a, Richtung t, Normale n nach innen); ohne Front die längste Kante */
  function frontLinie(parzelle, rollen) {
    const K = kantenVon(parzelle);
    let best = -1;
    K.forEach((k, i) => { if (rollen[i] === "front" && (best < 0 || k.l > K[best].l)) best = i; });
    const ohne = best < 0;
    if (ohne) K.forEach((k, i) => { if (best < 0 || k.l > K[best].l) best = i; });
    const k = K[best], t = norm(sub(k.b, k.a));
    return { a: k.a, b: k.b, t, n: [-t[1], t[0]], ohne };
  }
  /** Grundriss nach Typ (Building Generation): freistehend = BuildingLength × BuildingDepth mittig an der Baulinie (Frontlinie
      um RoadSetback versetzt), Zeile = Streifen der Tiefe BuildingDepth über die ganze Breite des Baufensters an der Baulinie,
      Blockrand = Baufenster ohne den Hof (Frontkanten um RoadSetback + BuildingDepth versetzt). Immer auf das Baufenster
      beschnitten. → [Polygone] */
  function grundriss(typ, parzelle, rollen, ba, p) {
    const L = frontLinie(parzelle, rollen), vor = L.ohne ? 0 : p.rStrasse;
    const a1 = add(L.a, mul(L.n, vor));
    if (typ === 2) {
      const hof = versetzeKanten(parzelle, rollen.map(r => -(ruecksprung(r, p) + (r === "front" ? p.tiefe : 0))));
      if (!hof || Geo.flaeche(hof) < 1) return [ba];
      return ohneKonvex(ba, Geo.konvexeHuelle(hof));
    }
    if (typ === 1) {
      const Q = Geo.schneideHalbebene(ba, add(a1, mul(L.n, p.tiefe)), L.n);
      return Q.length >= 3 && Geo.flaeche(Q) > 1 ? [Geo.bereinige(Q, 1e-6)] : [];
    }
    const S = Geo.geradeSchnittPoly(ba, a1, L.t);
    let mitte;
    if (S.length >= 2) mitte = add(a1, mul(L.t, (S[0] + S[S.length - 1]) / 2));
    else { const c = Geo.schwerpunkt(ba); mitte = add(a1, mul(L.t, dot(sub(c, a1), L.t))); }
    const c = add(mitte, mul(L.n, p.tiefe / 2)), hl = p.laenge / 2, hd = p.tiefe / 2;
    const R = [add(add(c, mul(L.t, -hl)), mul(L.n, -hd)), add(add(c, mul(L.t, hl)), mul(L.n, -hd)), add(add(c, mul(L.t, hl)), mul(L.n, hd)), add(add(c, mul(L.t, -hl)), mul(L.n, hd))];
    const Q = schneideKonvex(ba, R);
    return Q.length >= 3 && Geo.flaeche(Q) > 1 ? [Geo.bereinige(Q, 1e-6)] : [];
  }

  /* ================================================================ 8. Kennzahlen */
  /** Strecken an allen Schnitt- und Berührpunkten teilen (aus ../parzellen-versatz/modell.js), damit Netze verknüpft sind */
  function teileAnSchnitten(S, eps = 1e-9) {
    const T = S.map(() => []), bb = S.map(s => [Math.min(s[0][0], s[1][0]), Math.min(s[0][1], s[1][1]), Math.max(s[0][0], s[1][0]), Math.max(s[0][1], s[1][1])]);
    for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) {
      const A = bb[i], C = bb[j];
      if (A[0] > C[2] + 1e-6 || C[0] > A[2] + 1e-6 || A[1] > C[3] + 1e-6 || C[1] > A[3] + 1e-6) continue;
      const a = S[i][0], r = sub(S[i][1], a), c = S[j][0], s = sub(S[j][1], c), den = kreuz(r, s);
      if (Math.abs(den) < 1e-12) continue;
      const w = sub(c, a), t = kreuz(w, s) / den, u = kreuz(w, r) / den;
      if (t < -eps || t > 1 + eps || u < -eps || u > 1 + eps) continue;
      if (t > eps && t < 1 - eps) T[i].push(t);
      if (u > eps && u < 1 - eps) T[j].push(u);
    }
    const out = [];
    S.forEach((s, i) => {
      const ts = [0].concat(T[i].sort((x, y) => x - y), [1]);
      for (let k = 0; k < ts.length - 1; k++) { const a = Geo.lerp(s[0], s[1], ts[k]), b = Geo.lerp(s[0], s[1], ts[k + 1]); if (abstand(a, b) > 1e-6) out.push([a, b]); }
    });
    return out;
  }
  /** verknüpftes Netz aus Strecken (geteilt, Knoten im Abstand 0,5 m zusammengelegt) */
  const verknuepft = S => Geo.netz(teileAnSchnitten(S), 0.5);
  /** Kreuzungen: T = Knoten vom Grad 3, X = Grad 4 (und mehr); Konnektivität = Kanten / Knoten */
  function kreuzungen(N) {
    const g = new Int32Array(N.knoten.length); for (const e of N.kanten) { g[e.a]++; g[e.b]++; }
    let t = 0, x = 0; for (const v of g) { if (v === 3) t++; else if (v >= 4) x++; }
    return { t, x, verhaeltnis: x ? t / x : Infinity, konnektivitaet: N.knoten.length ? N.kanten.length / N.knoten.length : 0 };
  }
  /** mittlere normalisierte Winkelintegration (NAIN = NC^1.2 / (TD + 2), Toolbox v2, measures.md §4) im Segmentgraphen mit
      Winkelkosten (Length Coefficient 0, Angular Coefficient 1 wie „2. BuildGraph“ im eCAADe-Workshop) */
  function mittlereIntegration(N) {
    const G = Geo.richtungsGraph(N, { kL: 0, kW: 1, norm: "standard" });
    let s = 0; for (let i = 0; i < G.n; i++) s += Geo.segmentClosenessVon(G, i).nain;
    return G.n ? s / G.n : 0;
  }
  /** mittlerer Netzweg (Meter) von den Mitten der Strecken M zum nächsten Ziel (Knoten nahe den Zielpunkten) im Netz N */
  function mittlererWeg(N, M, ziele) {
    const adj = Geo.adjazenz(N), nb = i => adj[i].map(({ j, k }) => [j, N.kanten[k].l, k]);
    const starts = []; for (const q of ziele) { let v = -1, d = Infinity; N.knoten.forEach((x, i) => { const di = abstand(x, q); if (di < d) { d = di; v = i; } }); if (v >= 0) starts.push(v); }
    if (!starts.length || !M.length) return NaN;
    const D = Geo.dijkstra(N.knoten.length, nb, starts).dist;
    let s = 0, n = 0;
    for (const m of M) {
      const q = Geo.lerp(m[0], m[1], 0.5), k = Geo.naechstesSegment(N, q); if (k < 0) continue;
      const e = N.kanten[k], d = Math.min(D[e.a] + abstand(q, N.knoten[e.a]), D[e.b] + abstand(q, N.knoten[e.b]));
      if (isFinite(d)) { s += d; n++; }
    }
    return n ? s / n : NaN;
  }
  /** „ohne Quartier“: Umgebung + Rand + Anschlussstraßen (die Vorgaben des Generators); einmal je Szene gerechnet */
  function vorher(z) {
    const schl = JSON.stringify(z.S.rand) + "|" + z.S.start.length;
    if (z.S.vorher && z.S.vorher.schl === schl) return z.S.vorher;
    const R = z.S.rand, seg = z.S.umgebung.concat(R.map((q, i) => [q, R[(i + 1) % R.length]]), z.S.start.map(pl => [pl[0], pl[1]]));
    const N = verknuepft(seg);
    z.S.vorher = { schl, N, kr: kreuzungen(N), nain: mittlereIntegration(N) };
    return z.S.vorher;
  }
  /** Kennzahlen des Workshops (soweit die Stufen fertig sind) */
  function kennzahlen(z, param) {
    const p = voll(param), K = { stufe: z.stufe };
    const A = Geo.flaeche(z.S.rand); K.gebiet = A;
    if (z.N) {
      let L = 0; for (const e of z.N.kanten) L += e.l; K.netzLaenge = L; K.segmente = z.N.kanten.length;
      Object.assign(K, kreuzungen(z.N));
    }
    if (z.bc) {
      let mx = 0; for (const v of z.bc) mx = Math.max(mx, v);
      let g = 0; z.N.kanten.forEach((e, k) => { if (mx > 0 && z.bc[k] >= p.geschaeft * mx) g += e.l; });
      K.geschaeft = g; K.bcMax = mx;
    }
    if (z.bloecke) K.bloecke = z.bloecke.length;
    if (z.parzellen) {
      let ap = 0; for (const q of z.parzellen) ap += q.A;
      K.parzellen = z.parzellen.length; K.bauland = ap; K.oeffentlichPrivat = ap > 0 ? (A - ap) / ap : Infinity;
    }
    if (z.gebaeude) {
      let gr = 0, gf = 0; const typ = [0, 0, 0];
      for (const b of z.gebaeude) { gr += b.A; gf += b.A * b.geschosse; typ[b.typ]++; }
      K.gebaeude = z.gebaeude.length; K.grundflaeche = gr; K.geschossflaeche = gf; K.typen = typ;
      K.grz = K.bauland > 0 ? gr / K.bauland : 0; K.gfz = K.bauland > 0 ? gf / K.bauland : 0;
    }
    if (z.stufe >= 8) Object.assign(K, z.kz);
    return K;
  }
  /** aufwendige Kennzahlen der letzten Stufe: Integration und Konnektivität mit/ohne Quartier, Wege zu Bildung, ÖPNV, Freiraum */
  function netzKennzahlen(z) {
    const V = vorher(z), Nm = verknuepft(z.S.umgebung.concat(z.N.kanten.map(e => [z.N.knoten[e.a], z.N.knoten[e.b]])));
    const kr = kreuzungen(Nm), nain = mittlereIntegration(Nm), M = z.N.kanten.map(e => [z.N.knoten[e.a], z.N.knoten[e.b]]);
    const frei = [];
    if (z.S.park) frei.push(...z.S.park);
    for (const pl of z.plaetze || []) frei.push(...pl);
    return {
      nainVorher: V.nain, nainNachher: nain, relIntegration: V.nain > 0 ? nain / V.nain : NaN,
      konnVorher: V.kr.konnektivitaet, konnNachher: kr.konnektivitaet, relKonnektivitaet: V.kr.konnektivitaet > 0 ? kr.konnektivitaet / V.kr.konnektivitaet : NaN,
      wegBildung: z.S.hochschule ? mittlererWeg(Nm, M, [Geo.schwerpunkt(z.S.hochschule)]) : NaN,
      wegOepnv: z.S.haltestelle ? mittlererWeg(Nm, M, [z.S.haltestelle]) : NaN,
      wegFreiraum: frei.length ? mittlererWeg(Nm, M, frei) : NaN,
      plaetze: (z.plaetze || []).length
    };
  }

  /* ================================================================ Ablauf */
  /** Zustand auf die Ausgangslage zurücksetzen (Szene bleibt) */
  function leere(z) {
    z.t = 0; z.stufe = 0; z.W = null; z.G = null; z.N = null; z.weg = null; z.bc = null; z.farbwert = null;
    z.bloecke = null; z.plaetze = null; z.parzellen = null; z.gebaeude = null; z.kz = null; z.letzteNeu = [];
  }
  function erzeuge(param, zufall) {
    const p = voll(param);
    const S = szene(zufall);
    if (p.anschluss !== STANDARD.anschluss) teileSzene(S, p.anschluss);
    const z = { S, b: S.b, h: S.h };
    leere(z);
    return z;
  }
  const fertig = z => z.stufe >= 8;
  /** Parameter mit den Voreinstellungen ergänzen (das Bedienfeld kennt nur die Regler, nicht die festen Werte wie FloorHeight) */
  const voll = param => Object.assign({}, STANDARD, param);
  /** Ein Schritt = die nächste Stufe der Kette (beim Wachstum: die nächste Ebene des Instruktionsbaums) */
  function schritt(z, param) {
    if (!fertig(z)) naechsteStufe(z, voll(param));
    z.t++;
    return z;
  }
  function naechsteStufe(z, p) {
    if (z.stufe === 0 || (z.stufe === 1 && z.W && z.W.ebene.some(r => r.k.kinder.length) && z.W.nr < Math.round(p.baumtiefe))) {
      if (!z.W) z.W = wachstumStart(z.S, p);
      wachstumEbene(z.W, z.S, p);
      z.letzteNeu = z.W.neu; z.stufe = 1; z.G = z.W.G;
      return;
    }
    z.letzteNeu = [];
    if (z.stufe === 1) {                                      // Network to Segments → Network Smooth → Cul de sac removal
      const N0 = Geo.netz(z.W ? segmenteVon(z.W.G) : [], INTERN.glaetten);
      const r = sackgassenEntfernen(N0, Math.max(0, Math.round(p.sackgassen)));
      z.N = r.N; z.weg = r.weg; z.stufe = 2;
    } else if (z.stufe === 2) {                               // CityGraph
      z.bc = betweenness(z.N);
      let a = Infinity, b = -Infinity; const L = Array.from(z.bc, v => (v > 0 ? Math.log(v) : NaN));
      for (const v of L) if (v === v) { a = Math.min(a, v); b = Math.max(b, v); }
      z.farbwert = L.map(v => (v === v && b - a > 1e-12 ? (v - a) / (b - a) : 0));   // Logarithm → Bounds → Remap (Gradient)
      z.stufe = 3;
    } else if (z.stufe === 3) {                               // Polygons from lines → Custom offset → Simplify
      const r = bloeckeAusNetz(z.N, z.bc, p);
      z.bloecke = r.bloecke; z.plaetze = r.plaetze; z.stufe = 4;
    } else if (z.stufe === 4) {                               // Slicing Tree → kleine Parzellen filtern
      z.parzellen = [];
      z.bloecke.forEach((b, bi) => {
        b.breite = parzellenBreite(b, p);
        for (const poly of parzelliere(b.poly, b.breite)) { const A = Geo.flaeche(poly); if (A > p.minParzelle) z.parzellen.push({ poly, A, block: bi }); }
      });
      z.stufe = 5;
    } else if (z.stufe === 5) {                               // Buildable Area
      for (const q of z.parzellen) { q.rollen = kantenRollen(q.poly, z.bloecke[q.block].poly); q.ba = baufenster(q.poly, q.rollen, p); }
      z.stufe = 6;
    } else if (z.stufe === 6) {                               // Building Generation → min building area
      z.gebaeude = [];
      z.parzellen.forEach((q, qi) => {
        if (!q.ba) return;
        const bz = z.bloecke[q.block].z, typ = gebaeudeTyp(bz), far = bz * p.gfzFaktor;
        const teile = grundriss(typ, q.poly, q.rollen, q.ba, p), A = teile.reduce((s, t) => s + Geo.flaeche(t), 0);
        if (A < p.minGrundflaeche) return;
        const n = geschosse(far, q.A, A, p);
        z.gebaeude.push({ teile, A, typ, far, geschosse: n, hoehe: n * p.geschoss, parzelle: qi, z: bz });
      });
      z.stufe = 7;
    } else if (z.stufe === 7) {
      z.kz = netzKennzahlen(z); z.stufe = 8;
    }
  }
  /** neu rechnen bis zur Schrittzahl t (nach Parameteränderung oder Verschieben einer Ecke) */
  function rechneBis(z, p, t) {
    leere(z);
    for (let i = 0; i < t; i++) schritt(z, p);
    return z;
  }
  /** ganze Kette auf einmal */
  function rechneAlles(z, p) { let n = 0; while (!fertig(z) && n++ < 200) schritt(z, p); return z; }
  /** Parameter ohne Neustart: die Kette wird bis zum aktuellen Schritt neu gerechnet (Darstellung: nichts zu tun) */
  function aendere(z, param, id) {
    if (DARSTELLUNG.has(id)) return;
    const p = voll(param);
    if (id === "anschluss") teileSzene(z.S, p.anschluss);
    rechneBis(z, p, z.t);
  }
  /** Griff (Ecke des Gebiets) im Umkreis r → Index | −1 */
  function griffBei(z, q, r) {
    let best = -1, bd = r;
    z.S.rand.forEach((x, i) => { const d = abstand(x, q); if (d <= bd) { bd = d; best = i; } });
    return best;
  }
  /** Ecke i des Gebiets verschieben (wie die Boundary in Rhino) und die Kette bis zum aktuellen Schritt neu rechnen */
  function verschiebe(z, param, i, q) {
    const p = voll(param);
    z.S.rand[i] = [Math.max(20, Math.min(z.S.b - 20, q[0])), Math.max(20, Math.min(z.S.h - 20, q[1]))];
    teileSzene(z.S, p.anschluss);
    rechneBis(z, p, z.t);
  }

  return { STANDARD, DARSTELLUNG, voll, INTERN, ART, STUFEN, TYPEN, prng, szene, teileSzene, grundnetz, arm, armRichtung, gene, baum,
           wachstumStart, wachstumEbene, segmenteVon, sackgassenEntfernen, betweenness, flaechenAusLinien, versetzeKanten, vereinfache,
           bloeckeAusNetz, rechteckWinkel, parzelliere, parzellenBreite, kantenRollen, baufenster, gebaeudeTyp, geschosse, schneideKonvex,
           ohneKonvex, frontLinie, grundriss, teileAnSchnitten, verknuepft, kreuzungen, mittlereIntegration, mittlererWeg, kennzahlen,
           netzKennzahlen, leere, erzeuge, schritt, fertig, rechneBis, rechneAlles, aendere, griffBei, verschiebe };
});
