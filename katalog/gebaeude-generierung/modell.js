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
   §1, §2, §5–§8 und src/DecodingSpaces.Grasshopper/Components/Legacy/LegacySynthesisComponents.cs abgelesen; kein Code übernommen).
   Gemeinsame Bausteine (katalog/_gemeinsam/): Straßenwachstum und Parzellenteilung aus generierung.js, Flächen aus Linien,
   Kantenversatz, Prüfungen und konvexes Beschneiden aus flaechen.js. */
(function (wurzel, fabrik) {
  const node = typeof module === "object" && module.exports;
  const M = fabrik(node ? require("../_gemeinsam/geo.js") : wurzel.Geo, node ? require("../../simulationen/_gemeinsam/zufall.js") : wurzel.Zufall,
                   node ? require("../_gemeinsam/flaechen.js") : wurzel.Flaechen, node ? require("../_gemeinsam/generierung.js") : wurzel.Generierung);
  if (node) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Geo, Zufall, Flaechen, Generierung) {
  "use strict";
  const { sub, add, mul, dot, norm, abstand } = Geo;

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
  const INTERN = Object.assign({}, Generierung.INTERN, {   // SNG: Generierung.INTERN (freiwinkel 80, wurzelArme 3, wurzelMaxArme 4, fangStart 1, minSegment 1, maxKnoten 20000)
    winkelTol: 0.01,       // Parcels: „quasi-kollinear“ (rad)
    kollinear: 1,          // Parcels: Abstand < 1 m zur Blockkante = Straßenkante
    frontTol: 0.5,         // Buildable Area / Building Generation: Front = Anfang, Ende und Mitte ≤ 0,5 m vom Block
    maxEbene: 30,          // Parcels: Schutz gegen endlose Rekursion (im Original Stapelüberlauf bei Schnitt der Länge 0)
    minBreite: 5,          // Parcels: kleinste wirksame PlotWidthThreshold
    zielSaat: 2            // Placement: Seed der Komponente Random
  });
  const ART = Generierung.ART;
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

  /* ---------------------------------------------------------------- 1. Street Network Generator (_gemeinsam/generierung.js)
     Grundnetz, Arm, Armrichtung, Gene und Instruktionsbaum wie in netzoptimierung und stadtsynthese; die Knoten merken ihre
     Ebene, „wachse“ schreibt die Reihenfolge der Arme mit (für den Ablauf je Arm). */
  const { netzNeu, knotenNeu, kanteNeu, kanteTeilen, fuegeStreckeEin, grundnetz, imAussenrand, arm, richtung, armRichtung, gene } = Generierung;
  /** Instruktionsbaum (Knoten mit Ebene) → {wurzeln, anzahl} */
  const baum = (zufall, nWurzeln, p) => Generierung.baum(zufall, nWurzeln, p, { ebene: true });
  /** Wachstum (StreetPattern.GrowStreetPatternNew) → {G, segmente, art, arme: [{a, b, ebene}] in der Reihenfolge des Setzens} */
  function wachse(b, S, p) {
    const w = Generierung.wachse(b, S, p, { arme: true });
    return { G: w.G, segmente: w.segmente, art: w.art, arme: w.arme };
  }

  /* ---------------------------------------------------------------- 2. Blocks */
  /** Geschlossene Flächen eines ebenen Liniennetzes, Kantenversatz je Kante, einfaches Polygon, Enthaltensein (_gemeinsam/flaechen.js) */
  const { flaechenAusLinien, versetzeKanten, einfach, liegtIn } = Flaechen;
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
     (senkrecht zu ihr), Schnitt auf der Mittellinie des Hüllrechtecks. Generierung.sliceBaum mit der Variante „pg“. */
  const { rechteckWinkel, kantenVon, winkelDiff } = Generierung;
  const istStrasse = (k, wurzel) => Generierung.istStrasse(k, wurzel, INTERN.kollinear);
  const teileKanten = (poly, wurzel) => Generierung.teileKanten(poly, wurzel, INTERN.kollinear);
  const PG = pwt => ({ breite: pwt, teilung: 0.5, skalierung: INTERN.kollinear, variante: "pg", maxEbene: INTERN.maxEbene });
  /** Teilungsregel eines Teils im gedrehten Rahmen → {op: "V"|"H", x|y, …} oder null (Blatt) */
  const regel = (poly, wurzel, pwt) => Generierung.sliceRegel(poly, wurzel, PG(pwt));
  function teileAchse(poly, r) { const s = Generierung.sliceTeile(poly, r); return s && s.kinder; }
  /** Parzellen eines Blocks (Blätter der Zweiteilung) in Weltkoordinaten, Kante 0 = längste Straßenkante */
  function parzellen(block, p) {
    const pwt = Math.max(INTERN.minBreite, p.parzellenBreite);
    return Generierung.sliceBlaetter(Generierung.sliceBaum(block, PG(pwt))).map(k => parzelle(Geo.bereinige(k.poly, 1e-6), block));
  }
  /** Front einer Kante: Anfang, Ende und Mitte höchstens 0,5 m vom Blockrand (Buildable Area / Building Generation) */
  function amBlock(a, b, block) {
    const d = q => Flaechen.randAbstand(q, block);
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
  /** Polygon P mit dem konvexen Polygon K beschneiden (Halbebenen der Kanten von K, positive Fläche; Flaechen.clip) */
  function beschneide(P, K) {
    let Q = Flaechen.clip(P, Flaechen.halbebenen(K));
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
