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

   Gemeinsame Bausteine (katalog/_gemeinsam/): Instruktionsbaum, Wachstum und Slicing Tree aus generierung.js (gleich in
   netzoptimierung, gebaeude-generierung, parzellen-slicing-tree), Flächen aus Linien, Kantenversatz, Teilen an Schnitten und
   konvexe Polygonoperationen aus flaechen.js. Verfahren abgeglichen mit der DeCodingSpaces-Toolbox (Bauhaus-InfAU/decoding-spaces-toolbox,
   GPL-3.0; docs/research/legacy-generation.md §1, §6–§8, docs/generation.md); kein Code übernommen. */
(function (wurzel, fabrik) {
  const node = typeof module === "object" && module.exports;
  const M = fabrik(node ? require("../_gemeinsam/geo.js") : wurzel.Geo, node ? require("../_gemeinsam/szenen.js") : wurzel.Szenen,
                   node ? require("../_gemeinsam/flaechen.js") : wurzel.Flaechen, node ? require("../_gemeinsam/generierung.js") : wurzel.Generierung);
  if (node) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Geo, Szenen, Flaechen, Generierung) {
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
  const INTERN = Object.assign({}, Generierung.INTERN, {   // Street Network Synthesis: Generierung.INTERN (freiwinkel 80, wurzelArme 3, wurzelMaxArme 4, fangStart 1, minSegment 1, maxKnoten 20000)
    glaetten: 1,                 // Network Smooth: Snap threshold 1
    toleranzWinkel: Math.PI / 4, // Buildable Area: Tolerance 0.785398
    frontAbstand: 0.5,           // Buildable Area: Frontkante = Start, Ende und Mitte ≤ 0,5 m vom Block
    simplifyWinkel: 10,          // Simplify Curve: Angle Tolerance 10°
    minBreite: 4,                // kleinste Parzellenbreite der App (Schutz gegen sehr feine Teilung)
    teilung: 0.5,                // splitRate des Slicing Tree (registrierte Voreinstellung)
    maxEbene: 40                 // Schutz gegen endlose Rekursion im Slicing Tree
  });
  const ART = Generierung.ART;
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

  /* ================================================================ 1. Street Network Synthesis (_gemeinsam/generierung.js) */
  /** Grundnetz (Rand und Anschlussstraßen mit 1 m Fang), Arm mit geordneten Fangregeln, Richtung in die größte freie Lücke,
      Gene je Knoten und Instruktionsbaum: Generierung (gleich in netzoptimierung und gebaeude-generierung) */
  const { grundnetz, arm, armRichtung, gene, segmenteVon } = Generierung;
  /** Instruktionsbaum: je Wurzel drei Arm-Plätze, TreeDepth Ebenen breitenweise → {wurzeln, anzahl} */
  const baum = (zufall, nWurzeln, p) => Generierung.baum(zufall, nWurzeln, p);
  /** Wachstum vorbereiten: Grundnetz, Instruktionsbaum aus SeedForRandom, Ebene 0 = Wurzeln */
  function wachstumStart(S, p) {
    const { G, wurzeln } = grundnetz(S);
    return Generierung.wachstumBeginn(G, wurzeln, baum(prng(p.saatStrassen), wurzeln.length, p));
  }
  /** eine Ebene des Instruktionsbaums wachsen lassen (Knoten in Indexfolge, alle Wurzeln verschränkt) → Zahl der gesetzten Arme */
  const wachstumEbene = (W, S, p) => Generierung.wachstumEbene(W, S, p);

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

  /* ================================================================ 4. Polygons from lines, Custom offset (_gemeinsam/flaechen.js) */
  /** Geschlossene Flächen eines ebenen Liniennetzes → [{poly (positive Fläche), kanten: Netzkante unter poly[i] → poly[i+1]}] */
  const flaechenAusLinien = Flaechen.flaechenAusLinien;
  /** Custom offset: jede Kante i um d[i] parallel verschieben (d > 0 nach außen, d < 0 nach innen) → Polygon oder null */
  const versetzeKanten = Flaechen.versetzeKanten;
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

  /* ================================================================ 5. Slicing Tree (_gemeinsam/generierung.js, Variante „stx“) */
  const { rechteckWinkel, kantenVon } = Generierung;
  /** Slicing Tree eines Blocks (splitRate 0,5, scalingFactor 1, minDistance 1) → Blätter (Parzellen, Weltkoordinaten, positive Fläche) */
  function parzelliere(block, breite) {
    const K = Generierung.sliceBaum(block, { breite, teilung: INTERN.teilung, skalierung: 1, minAbstand: 1, maxEbene: INTERN.maxEbene });
    return Generierung.sliceBlaetter(K).map(k => { const P = k.poly; return Geo.flaecheS(P) < 0 ? P.reverse() : P; });
  }
  /** parcelWidth eines Blocks: „fest“ = Regler parcelWidth; „zentralitaet“ = größte √BC des Blocks / Teiler (Division A/B) */
  function parzellenBreite(b, p) {
    const w = p.parzellenModus === "fest" ? p.parzellenBreite : b.c / Math.max(1e-9, p.teiler);
    return Math.max(INTERN.minBreite, w);
  }

  /* ================================================================ 6. Buildable Area */
  /** Abstand eines Punktes vom Rand eines Polygons (Flaechen.randAbstand) */
  const abstandRand = Flaechen.randAbstand;
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
  /** Polygon mit konvexem Polygon C schneiden (Sutherland–Hodgman über die Kanten von C, Flaechen.clip) */
  function schneideKonvex(P, C) {
    const H = Geo.flaecheS(C) > 0 ? C : C.slice().reverse();
    return Flaechen.clip(P, Flaechen.halbebenen(H, false));
  }
  /** P ohne konvexes C: disjunkte Stücke P ∩ außen(e_i) ∩ innen(e_1 … e_{i−1}), Stücke über 1 m² (Flaechen.ohne) */
  function ohneKonvex(P, C) {
    const H = Geo.flaecheS(C) > 0 ? C : C.slice().reverse();
    return Flaechen.ohne(P, Flaechen.halbebenen(H, false), 1, null).map(q => Geo.bereinige(q, 1e-6));
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
  /** Strecken an allen Schnitt- und Berührpunkten teilen (Flaechen.teileAnSchnitten), damit Netze verknüpft sind */
  const teileAnSchnitten = Flaechen.teileAnSchnitten;
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
