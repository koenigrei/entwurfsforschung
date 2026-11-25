/* KREMLAS · Dichte Packung · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung des Layoutsolvers „Dichte Packung“ (Einpassung, C#/WinForms, Reinhard König, DFG-Projekt KREMLAS 2009–2011),
   Quelle: cpg_all, Source/Kremlas/ (REvo.cs, RChromosome.cs, RGen.cs, RPopulation.cs, RSpring.cs, Collision.cs, Form1.cs).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Ein Individuum ist ein Grundriss: n Rechtecke (Räume, „Gene“) mit fester Fläche in einem Umgebungsrechteck 500 × 430.
   Eine Evolutionsstrategie (μ+λ) bzw. (μ,λ) sucht Anordnungen mit möglichst kleiner Überlappung Sg (RChromosome.Overlap):
   - Mutation: zufällige Verschiebung N(0, σ) einzelner Räume, große Sprünge mit kleiner Wahrscheinlichkeit (MoveRandon),
     in den Fassungen mit Topologie auch Änderung der Proportion (VarySize, VarySizeFull) und Inversion der Genreihenfolge.
   - Rekombination: Kreuzung zweier Eltern über einen Abschnitt der Genliste mit Erhalt der Raumnummern (CrossoverTopo, PMX).
   - „Entwicklung“ jedes Kindes durch Kollisionserkennung (DevelopIndividual): Rand (CheckBorder), Proportionsänderung
     (ChangeProportion) und Abstoßen (RepelPolys) nach dem Separating Axis Theorem – das Verfahren nach Cozic (2006),
     hier für achsparallele Rechtecke eigenständig formuliert.
   - Topologie (RunTopo, NextGenerationProportionate): virtuelle Federn ziehen Räume zusammen, die benachbart sein
     sollen (RSpring), zweites Kriterium f2 = Summe der Distanzen (RChromosome.Distances), Selektion getrennt nach f1 und f2.
   - Neu (23.11.2026, nicht im Original): In den Grundriss-Fassungen mit „Mindestmaße“ gelten Mindestbreiten je Raum im Erbgut,
     ein drittes Kriterium f3 bewertet den abgeleiteten Plan (Türen, Breiten, Flächen, Überlappung) und ersetzt f2 in der Selektion;
     eine Suche (sucheNeu, sucheWeiter) sammelt gültige Grundrisse aus vielen kurzen Läufen, bessert Beinahe-Lösungen nach
     (örtliche Suche, memetisch) und wählt möglichst verschiedene aus (Maximin). L-förmige Räume (wählbar je Raum, Regler lform):
     ein Raum aus zwei Rechtecken (Hauptteil + Schenkel), eine innere Feder hält sie an einer Ecke bündig zusammen.
   Ein Schritt = eine Generation (REvo.Run). */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /** Zeichenfläche pictureBox1 (Form1.Designer.cs: 500 × 430) = Umgebungsrechteck REvo.Canvas */
  let BREITE = 500, HOEHE = 430;                                       // neu (23.11.2026): je Programm einstellbar (setzeFeld), Voreinstellung wie im Original

  /** Fassungen: Ablauf (RunAdjust oder RunTopo) und Voreinstellungen der Regler.
      einpassung: Stand des Programms (REvo.Run → RunAdjust; Form1.Designer.cs: Rooms 25, Population 1, Pressure 2,
                  Cross-Rate 75 %, repel/proport. Force 25 %, Rate 100 %, Rooms Overlap 50, spring Damp 50 %).
      kollision:  Kollisionserkennung allein (Buch Abschn. 5.1.1): μ = 1, Druck 1 → kein Kind wird erzeugt, nur der Elter
                  „entwickelt“ sich; α = 0,1, ρG = 0,5, β = 0,5, ρL = 1, zehn Räume.
      topologie:  RunTopo + NextGenerationProportionate mit Sterntopologie (SetNeighbours), acht Räume (rB_8Rooms),
                  μ = 10 wie die einfache MOES im Buch (Abschn. 5.2.3).
      gang:       wie topologie mit dem Testszenario (SetSzenario): ein Gang, drei Wohnungen zu je fünf Räumen (16 Räume).
      federRunden: wie oft je Kind Federn und Kollisionserkennung abwechseln (Original: zweimal Federn; neu einstellbar,
                  Voreinstellung nach Messung: 10 bei Topologie und Gang, 5 im Grundriss bei 100 % Belegung).
      grundriss6/8/10: Grundriss-Generator mit Raumprogramm (8 und 10 Räume nach dem Buch, 6 Räume angenommen, Voreinstellung der App).
      mindest:    neu (23.11.2026) – Mindestbreiten je Raum im Erbgut, Plan-Bewertung f3 statt f2 in der Selektion, Belegung 96 %
                  (Spielraum, damit nach dem Aufteilen kleiner Überlappungen jeder Raum seine Fläche behält); aus = Stand wie im Buch
                  (dann mit Belegung 100 %). */
  const FASSUNGEN = {
    einpassung: { ablauf: "einpassung", topologie: "stern", belegung: 0.75, minSeite: 0.75, grundrissTopo: "stern", raeume: 25, mu: 1, druck: 2, plus: true, elite: false, kreuzung: true, kreuzRate: 0.75,
                  repForce: 0.25, repRate: 1, propForce: 0.25, propRate: 1, daempfung: 0.5, rlap: 50, federRunden: 2, mindest: false, lform: 0, naehe: 0, starr: false, cluster: 0, wand: false },
    kollision:  { ablauf: "einpassung", topologie: "stern", belegung: 0.75, minSeite: 0.75, grundrissTopo: "stern", raeume: 10, mu: 1, druck: 1, plus: true, elite: false, kreuzung: false, kreuzRate: 0.75,
                  repForce: 0.5, repRate: 1, propForce: 0.1, propRate: 0.5, daempfung: 0.5, rlap: 50, federRunden: 2, mindest: false, lform: 0, naehe: 0, starr: false, cluster: 0, wand: false },
    topologie:  { ablauf: "topologie", topologie: "stern", belegung: 0.75, minSeite: 0.75, grundrissTopo: "stern", raeume: 8, mu: 10, druck: 2, plus: true, elite: false, kreuzung: true, kreuzRate: 0.75,
                  repForce: 0.25, repRate: 1, propForce: 0.25, propRate: 1, daempfung: 0.5, rlap: 50, federRunden: 10, mindest: false, lform: 0, naehe: 0, starr: false, cluster: 0, wand: false },
    gang:       { ablauf: "topologie", topologie: "gang", belegung: 0.75, minSeite: 0.75, grundrissTopo: "stern", raeume: 16, mu: 10, druck: 2, plus: true, elite: false, kreuzung: true, kreuzRate: 0.75,
                  repForce: 0.25, repRate: 1, propForce: 0.25, propRate: 1, daempfung: 0.5, rlap: 50, federRunden: 10, mindest: false, lform: 0, naehe: 0, starr: false, cluster: 0, wand: false },
    grundriss6: { ablauf: "topologie", topologie: "programm", programm: "sechs", belegung: 0.96, minSeite: 0.4, grundrissTopo: "wohnung", raeume: 6, mu: 20, druck: 2, plus: true, elite: false, kreuzung: true, kreuzRate: 0.75,
                  repForce: 0.25, repRate: 1, propForce: 0.25, propRate: 1, daempfung: 0.5, rlap: 50, federRunden: 5, mindest: true, lform: 0, naehe: 0, starr: false, cluster: 0, wand: false },
    grundriss8: { ablauf: "topologie", topologie: "programm", programm: "acht", belegung: 0.96, minSeite: 0.4, grundrissTopo: "wohnung", raeume: 8, mu: 20, druck: 2, plus: true, elite: false, kreuzung: true, kreuzRate: 0.75,
                  repForce: 0.25, repRate: 1, propForce: 0.25, propRate: 1, daempfung: 0.5, rlap: 50, federRunden: 5, mindest: true, lform: 0, naehe: 0, starr: false, cluster: 0, wand: false },
    grundriss10:{ ablauf: "topologie", topologie: "programm", programm: "zehn", belegung: 0.96, minSeite: 0.4, grundrissTopo: "wohnung", raeume: 10, mu: 20, druck: 2, plus: true, elite: false, kreuzung: true, kreuzRate: 0.75,
                  repForce: 0.25, repRate: 1, propForce: 0.25, propRate: 1, daempfung: 0.5, rlap: 50, federRunden: 5, mindest: true, lform: 0, naehe: 0, starr: false, cluster: 0, wand: false }
  };

  /** Maßstab der Grundrisse: 50 px = 1 m. Das Feld 500 × 430 ist also 10 × 8,6 m = 86 m² – genau die Summe der Raumprogramme
      (REvo.GrowPolys, auskommentiert: „1000 x 860 Pixel => 500 x 430“, total = 86). */
  let PX_M = 50;

  /** Raumprogramme für den Grundriss-Generator: Flächen aus REvo.GrowPolys (auskommentiert, je 86 m²) = Buch Tab. 8 und 9
      (Szenarien nach Flemming et al. 1992). Nachbarschaften wie im Buch (Kap. 9.1): Sterntopologie, alle Räume grenzen an den
      Flur (grundrissTopo "stern"). Voreinstellung (Reinhard 23.11.2026) ist "wohnung": hier angenommene Nachbarschaften einer Wohnung: Flur (hall) liegt an der Außenwand (Eingang, Nachbar −1)
      und erschließt Wohnen, Schlafräume und Bad,
      Wohnen grenzt an Hof und Küche (bzw. Essen, Essen an Küche), das zweite Bad gehört zum Elternschlafzimmer.
      Je Raum: [Name, name, Fläche m², Mindestbreite m]. Mindestbreiten (neu, 23.11.2026) sind Annahmen, keine Norm: Flur 1,20 m nach
      DIN 18040-2 (barrierefreie Wohnungen); die übrigen nach üblichen Möblierungen (Wohnen 3,00, Eltern 2,80, Zimmer und Essen 2,40,
      Küche 1,80, Bad 1,60, Bad 2 1,40, Hof 2,50 m). Eine geltende Norm mit Mindestbreiten je Raumart gibt es nicht (DIN 18011 zurückgezogen).
      sechs: angenommenes Programm mit sechs Räumen (Reinhard 23.11.2026), gleiche 86 m² wie das Buch, ohne Hof. */
  const PROGRAMME = {
    sechs: {
      raeume: [["Flur", "Hall", 10, 1.2], ["Wohnen", "Living", 28, 3.0], ["Küche", "Kitchen", 10, 1.8], ["Eltern", "Master bedroom", 16, 2.8],
               ["Zimmer", "Bedroom", 14, 2.4], ["Bad", "Bathroom", 8, 1.6]],
      paare: [[0, -1], [0, 1], [0, 3], [0, 4], [0, 5], [1, 2]] },
    acht: {
      raeume: [["Flur", "Hall", 10, 1.2], ["Hof", "Court", 7, 2.5], ["Wohnen", "Living", 22, 3.0], ["Eltern", "Master bedroom", 14, 2.8],
               ["Zimmer 1", "Bedroom 1", 10, 2.4], ["Zimmer 2", "Bedroom 2", 10, 2.4], ["Küche", "Kitchen", 8, 1.8], ["Bad", "Bathroom", 5, 1.6]],
      paare: [[0, -1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 7], [2, 1], [2, 6]] },
    zehn: {
      raeume: [["Flur", "Hall", 10, 1.2], ["Hof", "Court", 7, 2.5], ["Wohnen", "Living", 12, 3.0], ["Eltern", "Master bedroom", 12, 2.8],
               ["Zimmer 1", "Bedroom 1", 10, 2.4], ["Zimmer 2", "Bedroom 2", 8, 2.4], ["Küche", "Kitchen", 8, 1.8], ["Bad", "Bathroom", 5, 1.6],
               ["Bad 2", "Bathroom 2", 4, 1.4], ["Essen", "Dining", 10, 2.4]],
      paare: [[0, -1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 7], [2, 1], [2, 9], [9, 6], [3, 8]] }
  };
  const REGLER = ["belegung", "minSeite", "grundrissTopo", "raeume", "mu", "druck", "plus", "elite", "kreuzung", "kreuzRate", "repForce", "repRate", "propForce", "propRate", "daempfung", "rlap", "federRunden", "mindest", "lform", "naehe", "starr", "cluster", "wand"];

  function pick(o, ks) { const r = {}; ks.forEach(k => { r[k] = o[k]; }); return r; }

  /** Voreinstellungen: Grundriss mit sechs Räumen als abgeleiteter Plan (Wunsch Reinhard 23.11.2026); Stand des Programms ist „einpassung“ */
  const STANDARD = Object.assign({ fassung: "grundriss6", topo: false, plan: true, nummern: false, verlauf: true }, pick(FASSUNGEN.grundriss6, REGLER));

  /** Math.Round(decimal) bzw. Math.Round(double) in C#: bei genau .5 zur geraden Zahl */
  function rundeBank(x) {
    const f = Math.floor(x), r = x - f;
    if (Math.abs(r - 0.5) < 1e-9) return f % 2 === 0 ? f : f + 1;
    return r < 0.5 ? f : f + 1;
  }

  /** Normalverteilte Zufallszahl N(0, σ) (Box-Muller). Im Original Troschuetz NormalDistribution (μ = 1) mit „NextDouble() − 1“. */
  function normal(zufall, sigma) {
    let u = 0; while (u === 0) u = zufall();
    return sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * zufall());
  }

  /* ---------------------------------------------------------------- Räume (Gene) */
  /** Gen: Raumnummer id, Mittelpunkt (x, y), Breite w, Höhe h, Fläche a (bleibt fest), Geschwindigkeit (vx, vy) für die Federn */
  /** mb: Mindestbreite in px (neu, nur mit Mindestmaßen; 0 = keine); r: Raum, zu dem das Gen gehört (sonst id; beim Schenkel
      eines L-förmigen Raums dessen Raumnummer) */
  const gen = (id, x, y, w, h, a, ms, mb, r) => ({ id, x, y, w, h, a: a == null ? w * h : a, vx: 0, vy: 0, ms: ms || 0.75, mb: mb || 0, r: r == null ? id : r });
  const kopieGen = g => ({ id: g.id, x: g.x, y: g.y, w: g.w, h: g.h, a: g.a, vx: 0, vy: 0, ms: g.ms, mb: g.mb, r: g.r, bd: g.bd, an: g.an, tr: g.tr, zg: g.zg, zh: g.zh, fp: g.fp });
  const kopie = ind => ({ g: ind.g.map(kopieGen), fo: ind.fo, fd: ind.fd, f3: ind.f3 });
  const links = g => g.x - g.w / 2, oben = g => g.y - g.h / 2, rechts = g => g.x + g.w / 2, unten = g => g.y + g.h / 2;

  /** Kollision zweier achsparalleler Rechtecke nach dem Separating Axis Theorem (Collision.PolygonCollision, Verfahren nach Cozic).
      null, wenn eine Achse sie trennt (Abstand > 0); sonst der kleinste Verschiebungsvektor für A (weg von B).
      Berühren zählt als Kollision mit Vektor 0. Geprüft werden die Achsen in der Reihenfolge der Kanten von A:
      (0,1), (−1,0), (0,−1), (1,0) – bei gleicher Eindringtiefe gewinnt die erste, also y vor x. */
  function kollision(A, B) {
    const aL = links(A), aR = rechts(A), aO = oben(A), aU = unten(A), bL = links(B), bR = rechts(B), bO = oben(B), bU = unten(B);
    const abst = (minA, maxA, minB, maxB) => minA < minB ? minB - maxA : minA - maxB;     // IntervalDistance, negativ bei Überlappung
    if (abst(aL, aR, bL, bR) > 0 || abst(aO, aU, bO, bU) > 0) return null;
    // Projektion auf die vier Achsen; auf den negativen Achsen sind die Intervalle gespiegelt
    const achsen = [[0, 1, Math.abs(abst(aO, aU, bO, bU))], [-1, 0, Math.abs(abst(-aR, -aL, -bR, -bL))],
                    [0, -1, Math.abs(abst(-aU, -aO, -bU, -bO))], [1, 0, Math.abs(abst(aL, aR, bL, bR))]];
    let best = achsen[0];
    for (let k = 1; k < 4; k++) if (achsen[k][2] < best[2]) best = achsen[k];
    let ax = best[0], ay = best[1];
    if ((A.x - B.x) * ax + (A.y - B.y) * ay < 0) { ax = -ax; ay = -ay; }
    return { x: ax * best[2] + 0, y: ay * best[2] + 0 };
  }

  /** Schnittrechteck (RectangleF.Intersect; leer → null) */
  function schnittRechteck(A, B) {
    const x1 = Math.max(links(A), links(B)), x2 = Math.min(rechts(A), rechts(B));
    const y1 = Math.max(oben(A), oben(B)), y2 = Math.min(unten(A), unten(B));
    return x2 > x1 && y2 > y1 ? { x1, y1, x2, y2, w: x2 - x1, h: y2 - y1 } : null;
  }
  const schnitt = (A, B) => { const r = schnittRechteck(A, B); return r ? r.w * r.h : 0; };
  const FELD = { x: BREITE / 2, y: HOEHE / 2, w: BREITE, h: HOEHE };   // folgt setzeFeld (behoben 24.11.2026: vorher fest 500 × 430)

  /** Fitness f1 = Sg (RChromosome.Overlap): Summe der paarweisen Schnittflächen plus die Flächenanteile außerhalb des Umgebungsrechtecks */
  function ueberlappung(ind) {
    const G = ind.g, n = G.length; let s = 0;
    for (let i = 0; i < n; i++) {
      for (let k = i + 1; k < n; k++) s += schnitt(G[i], G[k]);
      s += G[i].w * G[i].h - schnitt(G[i], FELD);
    }
    return s;
  }

  /** Breite setzen und Höhe aus der Fläche ableiten (RGen.CheckWidtHeight): kürzeste Seite ≥ 0,75·√Fläche, höchstens Feldbreite/-höhe;
      mit Mindestmaßen zusätzlich ≥ Mindestbreite des Raums */
  function setzeBreite(g, w) {
    const min = Math.max(Math.sqrt(g.a) * (g.ms || 0.75), g.mb || 0);  // Mindestseite (Original fest 0,75 · √Fläche)
    if (w < min) w = min; else if (w > BREITE) w = BREITE;
    let h = g.a / w;
    if (h < min) { h = min; w = g.a / h; }
    if (h > HOEHE) { h = HOEHE; w = g.a / h; }
    g.w = w; g.h = h;
  }

  /** Breite variieren mit fester Untergrenze 50 (RChromosome.VarySize/VarySizeFull); mit Mindestmaßen die Mindestbreite, wenn größer */
  function setzeBreite50(g, w) {
    const min = Math.max(50, g.mb || 0);
    if (w < min) w = min; else if (w > BREITE) w = BREITE;
    g.h = g.a / w; g.w = w;
    if (g.h < min) { g.h = min; g.w = g.a / g.h; }
    if (g.h > HOEHE) { g.h = HOEHE; g.w = g.a / g.h; }
  }

  /* ---------------------------------------------------------------- Kollisionserkennung (DevelopIndividual) */
  /** Rand (RChromosome.CheckBorder): Eckpunkte in der Reihenfolge links oben, rechts oben, rechts unten, links unten;
      ragt einer hinaus, wird der Raum um genau diesen Betrag zurückgeschoben. Gesperrte (gezogene) Räume bleiben. */
  function pruefeRand(ind, gesperrt) {
    for (const g of ind.g) {
      if (g.id === gesperrt) continue;
      g.vx = 0; g.vy = 0;
      for (let j = 0; j < 4; j++) {
        const px = j === 0 || j === 3 ? links(g) : rechts(g), py = j < 2 ? oben(g) : unten(g);
        if (px < 0) g.x += -px; else if (px > BREITE) g.x += BREITE - px;
        if (py < 0) g.y += -py; else if (py > HOEHE) g.y += HOEHE - py;
      }
    }
  }

  /** Proportionsänderung (RChromosome.ChangeProportion/VaryOnesSize): für jedes kollidierende Paar wird mit Wahrscheinlichkeit
      rate je Raum die Breite um |Abprallvektor · force| verringert, wenn die Mittelpunkte waagerecht weiter auseinander liegen
      als senkrecht, sonst vergrößert; die Höhe folgt aus der Fläche. */
  function proportion(ind, force, rate, zufall, gesperrt) {
    const G = ind.g, n = G.length;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const A = G[i], B = G[j], r = kollision(A, B);
      if (!r) continue;
      const mag = Math.hypot(r.x, r.y) * force, mx = Math.abs(B.x - A.x), my = Math.abs(B.y - A.y);
      for (const g of [A, B]) {
        if (g.id === gesperrt) continue;
        if (zufall() < rate) setzeBreite(g, mx > my ? g.w - mag : g.w + mag);
      }
    }
  }

  /** Abstoßen (RChromosome.RepelPolys): je Raum i mit Wahrscheinlichkeit rate gegen alle j > i; A wird um Abprallvektor · force
      verschoben, B um das Gegenteil (bei force 0,5 sind beide danach getrennt). */
  function abstossen(ind, force, rate, zufall, gesperrt) {
    const G = ind.g, n = G.length;
    for (let i = 0; i < n; i++) {
      if (!(zufall() < rate)) continue;
      const A = G[i];
      for (let j = i + 1; j < n; j++) {
        const B = G[j], r = kollision(A, B);
        if (!r) continue;
        const tx = r.x * force, ty = r.y * force;
        if (A.id !== gesperrt) { A.x += tx; A.y += ty; }
        if (B.id !== gesperrt) { B.x -= tx; B.y -= ty; }
      }
    }
  }

  /** REvo.DevelopIndividual: Rand, Proportionsänderung, Abstoßen */
  function entwickle(ind, zufall, gesperrt, propForce, propRate, repForce, repRate) {
    pruefeRand(ind, gesperrt);
    proportion(ind, propForce, propRate, zufall, gesperrt);
    if (repRate > 0) abstossen(ind, repForce, repRate, zufall, gesperrt);
  }

  /* ---------------------------------------------------------------- Mutation */
  /** Zufällige Verschiebung (RChromosome.MoveRandon): je Raum mit Wahrscheinlichkeit rate um (N(0,σ), N(0,σ)) */
  function verschiebe(ind, rate, sigma, zufall, gesperrt) {
    for (const g of ind.g) if (zufall() < rate && g.id !== gesperrt) { g.x += normal(zufall, sigma); g.y += normal(zufall, sigma); }
  }

  /** Proportion variieren (RChromosome.VarySize): σ = Sg / round(Fläche des Feldes / 180), selten (1 %) / 10 */
  function variiereGroesse(ind, rate, zufall, gesperrt) {
    for (const g of ind.g) {
      if (!(zufall() < rate)) continue;
      const teiler = zufall() < 0.01 ? rundeBank(HOEHE * BREITE / 10) : rundeBank(HOEHE * BREITE / 180);
      if (g.id !== gesperrt) setzeBreite50(g, g.w + normal(zufall, ind.fo / teiler));
    }
  }

  /** Proportion variieren mit festem σ (RChromosome.VarySizeFull(rate, sigma)) */
  function variiereGroesseVoll(ind, rate, sigma, zufall, gesperrt) {
    for (const g of ind.g) if (zufall() < rate && g.id !== gesperrt) setzeBreite50(g, g.w + normal(zufall, sigma));
  }

  /** Inversion (RChromosome.Inversion): mit Wahrscheinlichkeit rate wird ein Abschnitt der Genreihenfolge umgekehrt
      (ändert keine Geometrie, nur welche Räume bei der nächsten Kreuzung zusammen getauscht werden) */
  function inversion(ind, rate, zufall) {
    const n = ind.g.length;
    if (n < 2 || !(zufall() < rate)) return;
    const r1 = zufall.ganz(Math.max(0, n - 2)), r2 = r1 + zufall.ganz(n - r1 - 1) + 1;
    const teil = ind.g.slice(r1, r2 + 1).reverse();
    for (let i = r1; i <= r2; i++) ind.g[i] = teil[i - r1];
  }

  /* ---------------------------------------------------------------- Rekombination */
  /** Kreuzung (REvo.CrossoverTopo, „Partially Mapped Crossover“): zwei zufällige Eltern, Abschnitt [r1, r2] der Genliste wird
      getauscht, außerhalb behalten die Kinder ihre eigenen Gene, sofern deren Raumnummer noch frei ist; Lücken füllt die
      erste unbenutzte Raumnummer, mit dem Gen des eigenen Elters. Jede Raumnummer kommt im Kind genau einmal vor. */
  function kreuzung(eltern, zufall) {
    const n = eltern[0].g.length;
    const P = [eltern[zufall.ganz(eltern.length)], eltern[zufall.ganz(eltern.length)]];
    const r1 = zufall.ganz(Math.max(0, n - 1)), r2 = r1 + zufall.ganz(n - r1);
    const kind = [new Array(n).fill(null), new Array(n).fill(null)], frei = [P[0].g.map(g => g.id), P[1].g.map(g => g.id)];
    const nimm = (l, id) => { const k = l.indexOf(id); if (k >= 0) l.splice(k, 1); };
    for (let i = r1; i <= r2; i++) {                                // Mittelteil tauschen
      kind[0][i] = kopieGen(P[1].g[i]); nimm(frei[0], P[1].g[i].id);
      kind[1][i] = kopieGen(P[0].g[i]); nimm(frei[1], P[0].g[i].id);
    }
    for (let c = 0; c < 2; c++) {
      for (let i = 0; i < n; i++) {                                 // eigene Gene behalten, wo die Nummer noch frei ist
        if (i >= r1 && i <= r2) continue;
        const id = P[c].g[i].id;
        if (frei[c].includes(id)) { kind[c][i] = kopieGen(P[c].g[i]); nimm(frei[c], id); }
      }
      for (let i = 0; i < n; i++) {                                 // Lücken: erste noch freie Nummer, Gen des eigenen Elters
        if (kind[c][i]) continue;
        const g = P[c].g.find(q => q.id === frei[c][0]);
        kind[c][i] = kopieGen(g); nimm(frei[c], g.id);
      }
    }
    return kind.map((g, c) => ({ g, fo: P[c].fo, fd: P[c].fd }));
  }

  /* ---------------------------------------------------------------- Topologie */
  /** Nachbarschaften als Paare [Raum, Nachbar] wie RChromosome.SetNeighbours (Stern um Raum 0) bzw. SetSzenario
      (Gang 0 mit den Wohnungsfluren 1–3, an jedem vier Räume: 4–7, 8–11, 12–15) */
  function nachbarn(n, art) {
    const P = [];
    if (art === "gang") {
      for (let i = 1; i < 4; i++) if (i < n) P.push([0, i]);
      let c = 4;
      for (let i = 1; i < 4 && i < n; i++) { for (let j = c; j < c + 4; j++) if (j < n) P.push([i, j]); c += 4; }
    } else for (let i = 1; i < n; i++) P.push([0, i]);
    return P;
  }

  /** Kürzester Abstand der Umrisse zweier Rechtecke (Ring.Distance der LinearRings, NetTopologySuite):
      getrennt → Abstand der Rechtecke; Umrisse schneiden oder berühren sich → 0; liegt eines ganz im anderen → Abstand der Kanten */
  function ringAbstand(A, B) {
    const gx = Math.max(links(B) - rechts(A), links(A) - rechts(B)), gy = Math.max(oben(B) - unten(A), oben(A) - unten(B));
    if (gx > 0 || gy > 0) return Math.hypot(Math.max(gx, 0), Math.max(gy, 0));
    const innen = (I, O) => links(I) > links(O) && rechts(I) < rechts(O) && oben(I) > oben(O) && unten(I) < unten(O)
      ? Math.min(links(I) - links(O), rechts(O) - rechts(I), oben(I) - oben(O), unten(O) - unten(I)) : 0;
    return innen(A, B) || innen(B, A);
  }

  /** Fehlende Durchgangsbreite (RChromosome.AdditionalDist): rlap minus Summe der Überdeckungen der Projektionen in x und y,
      mit ganzzahligen Eckpunkten wie im Original (Vector → Point schneidet ab); nie negativ */
  function zusatzAbstand(A, B, rlap) {
    const t = Math.trunc, a = [t(links(A)), t(rechts(A)), t(oben(A)), t(unten(A))], b = [t(links(B)), t(rechts(B)), t(oben(B)), t(unten(B))];
    let innen = 0;
    const dx = a[0] < b[0] ? b[0] - a[1] : a[0] - b[1]; if (dx < 0) innen -= dx;
    const dy = a[2] < b[2] ? b[2] - a[3] : a[2] - b[3]; if (dy < 0) innen -= dy;
    return Math.max(0, rlap - innen);
  }

  /** Zuschlag für tiefe Überlappung zweier Nachbarn (RChromosome.AdditionalDistFromOverlap): kürzere Seite der Schnittfläche minus rlap, nie negativ */
  function zusatzUeberlappung(A, B, rlap) {
    const r = schnittRechteck(A, B), d = r ? Math.min(r.w, r.h) : 0;
    return d <= rlap ? 0 : d - rlap;
  }

  /** Distanzterm eines Nachbarpaars (Summand in RChromosome.Distances); 0 = Nachbarschaft erfüllt */
  function paarDistanz(A, B, rlap) {
    return Math.max(0, ringAbstand(A, B) + zusatzAbstand(A, B, rlap)) + zusatzUeberlappung(A, B, rlap);
  }

  /** Außenraum als Nachbar (Raumnummer −1, Eingang des Flurs): ein Streifen vor der Feldkante, die dem Raum A am nächsten liegt */
  function aussen(A) {
    const d = [links(A), BREITE - rechts(A), oben(A), HOEHE - unten(A)], k = d.indexOf(Math.min(...d)), T = 1000;
    return k === 0 ? gen(-1, -T / 2, HOEHE / 2, T, 3 * HOEHE) : k === 1 ? gen(-1, BREITE + T / 2, HOEHE / 2, T, 3 * HOEHE)
         : k === 2 ? gen(-1, BREITE / 2, -T / 2, 3 * BREITE, T) : gen(-1, BREITE / 2, HOEHE + T / 2, 3 * BREITE, T);
  }
  const finde = (ind, id, A) => id === -1 ? (A ? aussen(A) : null) : ind.g.find(g => g.id === id);

  /** Fitness f2 (RChromosome.Distances): Summe der Distanzterme aller geforderten Nachbarschaften, gerundet */
  function distanzen(ind, paare, rlap) {
    let s = 0;
    for (const [a, b] of paare) { const A = finde(ind, a), B = A && finde(ind, b, A); if (A && B) s += paarDistanz(A, B, rlap); }
    return rundeBank(s);
  }

  /** Zahl der erfüllten Nachbarschaften (Distanzterm < 1: berühren sich mit Durchgangsbreite ≥ rlap, ohne tiefe Überlappung) */
  function erfuellt(ind, paare, rlap) {
    let k = 0;
    for (const [a, b] of paare) { const A = finde(ind, a), B = A && finde(ind, b, A); if (A && B && paarDistanz(A, B, rlap) < 1) k++; }
    return k;
  }

  /** Federvektor (RSpring.CalcSpringVector + AdditionalVector): Abstand der Rechtecke je Achse (vorzeichenbehaftet) plus ein
      Zuschlag für fehlende Durchgangsbreite. Im Original ist der Zuschlag immer positiv: Er schob Raum A stets nach rechts/unten
      und den Nachbarn nach links/oben, gleich wo der Nachbar lag – die Hälfte der Federn zog in die falsche Richtung.
      Hier zeigt er zum Nachbarn hin (behoben 22.11.2026). Außerdem wirkt er auch, wenn sich die Räume berühren oder nur
      leicht überlappen, dem Normalfall nach der Kollisionserkennung: Im Original fielen beide Fälle durch alle Abfragen
      (nur > 0 geprüft), die Feder war tot, obwohl die gemeinsame Kante kürzer als die Durchgangsbreite war. Jetzt gilt die
      kleinere Überdeckung als Berührrichtung und die größere als gemeinsame Kante (behoben 23.11.2026). */
  function federVektor(A, B, rlap) {
    const aL = links(A), aR = rechts(A), aO = oben(A), aU = unten(A), bL = links(B), bR = rechts(B), bO = oben(B), bU = unten(B);
    const x = aR < bL ? bL - aR : bR < aL ? -(aL - bR) : 0;
    const y = aU < bO ? bO - aU : bU < aO ? -(aO - bU) : 0;
    let ox = aL < bL ? bL - aR : aL - bR, oy = aO < bO ? bO - aU : aO - bU;   // negativ bei Überdeckung der Projektionen, 0 beim Berühren
    if (ox >= 0 && oy >= 0) { ox = rlap; oy = rlap; }                          // diagonal (auch Ecke an Ecke)
    else if (ox < 0 && (oy >= 0 || oy > ox)) { ox = -ox < rlap ? rlap + ox : 0; oy = 0; }   // gemeinsame Kante waagerecht
    else { oy = -oy < rlap ? rlap + oy : 0; ox = 0; }                          // gemeinsame Kante senkrecht
    const rx = B.x >= A.x ? 1 : -1, ry = B.y >= A.y ? 1 : -1;               // Richtung zum Nachbarn
    return { x: x + rx * ox, y: y + ry * oy };
  }

  /** Virtuelle Federn (RChromosome.RunSprings, RSpring.update): je Paar nur die größere Komponente, · 0,5 · (1 − Dämpfung),
      Raum + / Nachbar −; erst nach allen Federn werden die Räume bewegt (UpdatePos) */
  function federn(ind, paare, daempfung, rlap, gesperrt) {
    const k = 0.5 * (1 - daempfung);
    for (const [a, b] of paare) {
      const A = finde(ind, a), B = A && finde(ind, b, A);
      if (!A || !B) continue;
      const v = federVektor(A, B, rlap);
      if (Math.abs(v.x) > Math.abs(v.y)) v.y = 0; else v.x = 0;
      if (A.id !== gesperrt) { A.vx += v.x * k; A.vy += v.y * k; }
      if (B.id !== gesperrt) { B.vx -= v.x * k; B.vy -= v.y * k; }
    }
    for (const g of ind.g) { g.x += g.vx; g.y += g.vy; g.vx = 0; g.vy = 0; }
  }

  /* ---------------------------------------------------------------- Bewertung und Selektion */
  /** EvaluationOverlap/EvaluationDist: Sortierschlüssel wie FitOverl = 1/Sg (Sg ≥ 1), sonst 1 → Werte unter 1 gelten als gleich gut */
  const schluessel = v => Math.max(1, v);
  const sortiere = (L, feld) => L.sort((a, b) => schluessel(a[feld]) - schluessel(b[feld]));   // stabil
  const bewerte = ind => { ind.fo = ueberlappung(ind); return ind; };

  /** μ Individuen aus einer sortierten Liste; fehlen Kinder, wird von vorn wiederholt (das Original bricht dann ab) */
  function nimmBeste(L, mu) { const R = []; for (let i = 0; i < mu && L.length; i++) R.push(kopie(L[i % L.length])); return R; }

  /** Flächen der Räume: ohne Raumprogramm alle gleich, Belegung · (499 · 429) / n (GrowPolys, im Original fest 0,75);
      mit Raumprogramm m² · 2500 px² · Belegung (bei 100 % füllen die Räume das Feld genau) */
  function flaechen(n, belegung, programm) {
    if (programm) return PROGRAMME[programm].raeume.map(r => r[2] * PX_M * PX_M * belegung);
    return new Array(n).fill(((BREITE - 1) * (HOEHE - 1) / n) * belegung);
  }

  /** Startpopulation (REvo-Konstruktor, GrowPolys): Mittelpunkte zufällig im Feld, Flächen siehe flaechen();
      Breite √Fläche + Zufall −10 … 9 (höchstens Feldbreite / 2), Höhe aus der Fläche – je Individuum neu */
  /* ---------------------------------------------------------------- L-förmige Räume (neu, 23.11.2026) */
  /** Ein L-Raum besteht aus Hauptteil (Gen id = Raumnummer, 60 % der Fläche) und Schenkel (Gen id = Räume + k, r = Raumnummer, 40 %).
      Möglich nur mit Mindestmaßen und wenn die Fläche für zwei Teile reicht, die beide in jeder Richtung die Mindestbreite haben
      (Fläche ≥ 2,2 · Mindestbreite²). lform ist eine Bitmaske der Raumnummern (Bit i = Raum i darf L-förmig sein). */
  const L_ANTEIL = 0.6;
  function lMoeglich(programm, i) { const q = programm && PROGRAMME[programm].raeume[i]; return !!q && q[3] > 0 && q[2] >= 2.2 * q[3] * q[3]; }
  function lRaeume(programm, maske) {
    if (!programm || !maske) return [];
    return PROGRAMME[programm].raeume.map((_, i) => i).filter(i => Math.floor(maske / 2 ** i) % 2 === 1 && lMoeglich(programm, i));
  }
  /** Fläche zwischen Hauptteil und Schenkel verschieben (Mutation, Summe bleibt), jeder Teil behält mindestens 1,05 · Mindestbreite² */
  function variiereAnteil(ind, rate, zufall, gesperrt) {
    for (const S of ind.g) {
      if (S.r === S.id || !(zufall() < rate)) continue;
      const H = ind.g.find(g => g.id === S.r); if (!H || H.id === gesperrt || S.id === gesperrt) continue;
      const summe = H.a + S.a, min = 1.05 * S.mb * S.mb;
      H.a = Math.min(summe - min, Math.max(min, H.a + normal(zufall, 0.08 * summe))); S.a = summe - H.a;
      setzeBreite(H, H.w); setzeBreite(S, S.w);
    }
  }
  /** Innere Federn der L-Räume: [Hauptteil, Schenkel, Mindestbreite px] */
  const innere = ind => ind.g.filter(g => g.r !== g.id).map(g => [g.an == null ? g.r : g.an, g.id, g.mb]);   // Teil hängt an seinem Anker (sonst am Hauptteil)

  /** Teile je Raum: [Anteile …], erster = Hauptteil; vorgegeben im Programm (Vorbilder: Kreuz, T, I) oder L per lform (60/40, bündig) */
  function teileVon(programm, i, L) {
    const o = programm && PROGRAMME[programm].raeume[i][4];
    if (o && o.teile && o.teile.length > 1) return { anteile: o.teile, bd: !!o.buendig, anker: o.anker || null };
    if ((L || []).includes(i)) return { anteile: [L_ANTEIL, 1 - L_ANTEIL], bd: true };
    return { anteile: [1], bd: false };
  }
  /** Gene der Räume: [Gen, Raum, Fläche, bündig]; Hauptteile tragen die Raumnummer, weitere Teile fortlaufend ab n */
  function geneListe(n, A, programm, L) {
    // [Gen, Raum, Fläche, bündig, Anker-Gen]; Anker: Teil, an dem ein Teil hängt (Kette wie beim Flur bei Siza), sonst der Hauptteil
    const T = [], weitere = [], je = [];
    for (let i = 0; i < n; i++) {
      const t = teileVon(programm, i, L);
      T.push([i, i, A[i] * t.anteile[0], false, null]);
      je[i] = { ids: [i], anker: t.anker };
      t.anteile.slice(1).forEach(a => { const w = [0, i, A[i] * a, t.bd, null]; weitere.push(w); je[i].ids.push(w); });
    }
    weitere.forEach((w, k) => { w[0] = n + k; T.push(w); });
    for (const e of je) {
      const ids = e.ids.map(x => typeof x === "number" ? x : x[0]);
      e.ids.forEach((x, k) => { if (k && typeof x !== "number") x[4] = e.anker && e.anker[k] != null && e.anker[k] >= 0 ? ids[e.anker[k]] : ids[0]; });
    }
    return T;
  }
  /** Spiegelsymmetrie (neu, Vorbilder Palladio): Genpaare und Achsengene aus symmetrie {achse: [Räume], paare: [[Raum, Raum]]} */
  function symmetrieGene(programm, T) {
    const S = programm && PROGRAMME[programm].symmetrie; if (!S) return null;
    const teile = raum => T.filter(t => t[1] === raum).map(t => t[0]);
    return { achse: S.achse.flatMap(teile), paare: S.paare.flatMap(([a, b]) => { const A = teile(a), B = teile(b); return A.map((g, k) => [g, B[k]]); }) };
  }
  /** Raumtausch (neu, Mutation): zwei Räume ähnlicher Fläche (höchstens Faktor 1,6) tauschen ihre Mittelpunkte samt Teilen;
      mit Symmetrie tauschen Spiegelpaare mit Spiegelpaaren (beide Seiten) und Achsenräume mit Achsenräumen. */
  function tauscheRaeume(ind, sym, rate, zufall, gesperrt) {
    if (!(zufall() < rate)) return;
    const haupt = ind.g.filter(g => g.r === g.id && g.id !== gesperrt && !FEST.has(g.id));
    if (haupt.length < 2) return;
    const A = haupt[zufall.ganz(haupt.length)], kand = haupt.filter(g => g !== A && Math.max(g.a, A.a) / Math.min(g.a, A.a) <= 1.6);
    if (!kand.length) return;
    const B = kand[zufall.ganz(kand.length)];
    const partner = g => { if (!sym) return null; const q = sym.paare.find(([a, b]) => a === g.id || b === g.id); return q ? (q[0] === g.id ? q[1] : q[0]) : null; };
    const istAchse = g => !!sym && sym.achse.includes(g.id);
    if (sym && istAchse(A) !== istAchse(B)) return;
    const verschiebe = (g, dx, dy) => { for (const t of ind.g) if (t.r === g.id && t.id !== gesperrt) { t.x += dx; t.y += dy; } };
    const tausch = (X, Y) => { const dx = Y.x - X.x, dy = Y.y - X.y; verschiebe(X, dx, dy); verschiebe(Y, -dx, -dy); };
    tausch(A, B);
    const pA = partner(A), pB = partner(B);
    if (pA != null && pB != null && pA !== B.id) tausch(ind.g.find(g => g.id === pA), ind.g.find(g => g.id === pB));
  }

  /** Raumgruppe spiegeln (neu, Mutation; nach „Spaces Cluster Mirror“ in EPSAP, Rodrigues, Gaspar und Gomes 2013, hier vereinfacht
      nachgebaut): die geforderte Nachbarschaft mit der größten Distanz suchen; von ihren beiden Räumen den mit mehr Nachbarn samt seinen
      Nachbarn (ohne den Partner) am Mittelpunkt des Partners spiegeln, waagerecht oder senkrecht. Mit Symmetrie nur senkrecht
      (vorn/hinten), Paare danach symmetrisiert. Feste Räume bleiben. Regler „cluster“ = Rate je Kind (gemessen hilfreich: 2 %). */
  function clusterSpiegeln(ind, z, P, rlap, rate, zufall) {
    if (!(zufall() < rate)) return;
    const f = id => ind.g.find(q => q.id === id), grad = id => P.filter(([a, b]) => a === id || b === id).length;
    let schlecht = null, dmax = 0;
    for (const [a, b] of P) { if (b < 0) continue; const A = f(a), B = f(b); if (!A || !B) continue; const d = paarDistanz(A, B, rlap); if (d > dmax) { dmax = d; schlecht = [a, b]; } }
    if (!schlecht) return;
    const [a, b] = grad(schlecht[0]) >= grad(schlecht[1]) ? schlecht : [schlecht[1], schlecht[0]];
    const Bp = f(b), raeume = new Set([a, ...P.filter(([u, v]) => (u === a || v === a)).map(([u, v]) => (u === a ? v : u)).filter(x => x >= 0 && x !== b)]);
    const senkrecht = z.sym ? true : zufall() < 0.5;
    for (const g of ind.g) {
      if (!raeume.has(g.r) || FEST.has(g.id)) continue;
      if (senkrecht) g.y = 2 * Bp.y - g.y; else g.x = 2 * Bp.x - g.x;
    }
  }

  /** Treppe an den Zugang (neu, 25.11.2026, Mutation): die Treppe mit ihrer Zugangskante an einen erschließenden Nachbarraum legen
      (Antritt im EG, Austritt im OG); ist die Treppe fest (OG), rückt stattdessen der Nachbarraum samt Teilen vor die Zugangskante.
      Nutzt nur die Nachbarschaften und die Angabe der Treppe – generisch für jedes Programm mit Treppe. */
  function treppeZugang(ind, P, rate, zufall) {
    if (!(zufall() < rate)) return false;
    const S = ind.g.find(g => g.tr && g.zg); if (!S) return false;
    const id = S.id, raum = S.r, kante = S.zg;
    const nb = P.filter(q => q.includes(raum)).map(q => (q[0] === raum ? q[1] : q[0])).filter(r => r >= 0); if (!nb.length) return false;
    const r = nb[zufall.ganz(nb.length)], T = ind.g.filter(g => g.r === r), A = T[zufall.ganz(T.length)]; if (!A) return false;
    const quer = kante[0] === "y", spiel = (lo, hi, l) => hi - lo <= l ? (lo + hi) / 2 : lo + l / 2 + zufall() * (hi - lo - l);
    // Ziel: Mittelpunkt der Treppe, wenn sie an A liegt (Zugangskante zeigt zu A)
    let x, y;
    if (quer) { x = spiel(links(A), rechts(A), S.w); y = kante === "y0" ? unten(A) + S.h / 2 : oben(A) - S.h / 2; }
    else { y = spiel(oben(A), unten(A), S.h); x = kante === "x0" ? rechts(A) + S.w / 2 : links(A) - S.w / 2; }
    if (!FEST.has(id)) { S.x = Math.min(BREITE - S.w / 2, Math.max(S.w / 2, x)); S.y = Math.min(HOEHE - S.h / 2, Math.max(S.h / 2, y)); return true; }
    const dx = S.x - x, dy = S.y - y;                                     // Treppe fest: Nachbarraum verschieben
    for (const g of T) if (!FEST.has(g.id)) { g.x += dx; g.y += dy; }
    return true;
  }

  /** Feste Räume (neu, Vorbilder Siza: Treppe, Luftraum im Obergeschoss): Gene mit Zielrechteck in m aus dem Vorbild */
  let FEST = new Set();
  function festGene(programm, T) {
    const P = programm && PROGRAMME[programm]; if (!P || !P.vorbild) return null;
    const F = [];
    P.raeume.forEach((q, raum) => { if (!(q[4] && q[4].fest)) return; T.filter(t => t[1] === raum).forEach((t, k) => { const v = P.vorbild[raum][k]; if (v) F.push([t[0], ...v]); }); });
    return F.length ? F : null;
  }
  /** Feste Räume zurück an ihre Stelle (nach jeder Entwicklung, wie das Symmetrisieren); Fläche = Fläche im Vorbild */
  function fixiere(ind, fest) {
    if (!fest) return;
    for (const [id, x0, y0, x1, y1] of fest) {
      const g = ind.g.find(q => q.id === id); if (!g) continue;
      g.w = (x1 - x0) * PX_M; g.h = (y1 - y0) * PX_M; g.a = g.w * g.h; g.x = (x0 + x1) / 2 * PX_M; g.y = (y0 + y1) / 2 * PX_M;
    }
  }

  /** Starre Raumformen (neu, Vorbilder): ein zusammengesetzter Raum (Kreuz, T, I, Flur aus Teilen) behält Form und Maße des Vorbilds,
      frei ist nur seine Lage. Je Teil [Gen, Hauptteil-Gen, dx, dy, w, h] in m relativ zum Mittelpunkt des Hauptteils. */
  function starreFormen(programm, T) {
    const P = programm && PROGRAMME[programm]; if (!P || !P.vorbild) return null;
    const F = [];
    P.raeume.forEach((q, raum) => {
      const ids = T.filter(t => t[1] === raum).map(t => t[0]), V = P.vorbild[raum];
      if (ids.length < 2 || (q[4] && q[4].fest)) return;
      const m = V[0], mx = (m[0] + m[2]) / 2, my = (m[1] + m[3]) / 2;
      ids.forEach((id, k) => { const v = V[k]; F.push([id, ids[0], (v[0] + v[2]) / 2 - mx, (v[1] + v[3]) / 2 - my, v[2] - v[0], v[3] - v[1]]); });
    });
    return F.length ? F : null;
  }
  function formen(ind, starr) {
    if (!starr) return;
    const f = id => ind.g.find(q => q.id === id);
    for (const [id, haupt, dx, dy, w, h] of starr) {
      const g = f(id), H = f(haupt); if (!g || !H) continue;
      g.w = w * PX_M; g.h = h * PX_M; g.a = g.w * g.h;
      if (id !== haupt) { g.x = H.x + dx * PX_M; g.y = H.y + dy * PX_M; }
    }
  }

  /** Symmetrisieren: Paare auf ihre gemittelte, gespiegelte Lage und Proportion, Achsengene mittig */
  function symmetrisiere(ind, sym, gesperrt) {
    if (!sym) return;
    const f = id => ind.g.find(g => g.id === id);
    for (const [a, b] of sym.paare) {
      const A = f(a), B = f(b); if (!A || !B) continue;
      const x = A.id === gesperrt ? A.x : B.id === gesperrt ? BREITE - B.x : (A.x + BREITE - B.x) / 2, y = A.id === gesperrt ? A.y : B.id === gesperrt ? B.y : (A.y + B.y) / 2;
      const w = A.id === gesperrt ? A.w : B.id === gesperrt ? B.w : (A.w + B.w) / 2;
      setzeBreite(A, w); setzeBreite(B, w); A.x = x; A.y = y; B.x = BREITE - x; B.y = y;
    }
    for (const id of sym.achse) { const g = f(id); if (g) g.x = BREITE / 2; }
  }

  /** Treppe eines Raums (neu, 25.11.2026, Häuser Siza): {typ, antritt, austritt, halb} aus dem Programm; kante = Zugang im Geschoss:
      im EG der Antritt, im OG (Treppe fest) der Austritt */
  function treppeVon(programm, raum) {
    const q = PROGRAMME[programm] && PROGRAMME[programm].raeume[raum], o = q && q[4];
    if (!o || !o.treppe) return null;
    // U-Treppe: im EG zählt der Antrittslauf (Hälfte halb), im OG der Austrittslauf (die andere Hälfte)
    const andere = h => h && h[0] + (h[1] === "0" ? "1" : "0"), lauf = o.treppe.typ === "U" ? (o.fest ? andere(o.treppe.halb) : o.treppe.halb) : null;
    return Object.assign({}, o.treppe, { kante: o.fest ? o.treppe.austritt : o.treppe.antritt, lauf });
  }
  /** Treppen behalten ihre Maße aus dem Vorbild (Lauf und Breite), frei ist nur die Lage – wie eine starre Form mit einem Teil */
  function treppenFormen(programm, T) {
    const P = programm && PROGRAMME[programm]; if (!P || !P.vorbild) return [];
    const F = [];
    P.raeume.forEach((q, raum) => { if (!(q[4] && q[4].treppe)) return; const v = P.vorbild[raum][0], id = T.find(t => t[1] === raum)[0]; F.push([id, id, 0, 0, v[2] - v[0], v[3] - v[1]]); });
    return F;
  }
  function startPopulation(mu, n, zufall, belegung, programm, minSeite, mindest, L, sym, fest, starr) {
    const A = flaechen(n, belegung == null ? 0.75 : belegung, programm), P = [];
    const T = geneListe(n, A, programm, L);
    for (let k = 0; k < mu; k++) {
      const G = [];
      for (const [id, raum, a, bd, an] of T) {
        const x = zufall.ganz(BREITE), y = zufall.ganz(HOEHE);
        let w = Math.sqrt(a) + zufall.ganz(20) - 10;
        if (w > Math.trunc(BREITE / 2)) w = Math.trunc(BREITE / 2);
        const mb = programm && mindest ? (PROGRAMME[programm].raeume[raum][3] || 0) * PX_M : 0;
        const g = gen(id, x, y, w, a / w, a, minSeite, mb, raum);
        g.bd = !!bd; if (an != null) g.an = an;
        const tp = programm && treppeVon(programm, raum); if (tp) { g.tr = true; g.zg = tp.kante; if (tp.lauf) g.zh = tp.lauf; }
        if (programm && PROGRAMME[programm].raeume[raum][1] === "Open to sky" && PROGRAMME[programm].raeume[raum][4] && PROGRAMME[programm].raeume[raum][4].fest) g.fp = true;   // Luftraum über dem Hof: im Plan unantastbar   // Treppe (neu, Haus): feste Maße, Zugang an einer Kante                                                     // Teile: bündig (L) oder nicht (Kreuz, T, I)
        if (mb) setzeBreite(g, g.w);                                     // Mindestbreite gleich am Start
        G.push(g);
      }
      const I = { g: G, fo: 0, fd: 0 };
      formen(I, starr); symmetrisiere(I, sym, -1); formen(I, starr); fixiere(I, fest);
      P.push(bewerte(I));
    }
    return P;
  }

  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param), F = FASSUNGEN[p.fassung] || FASSUNGEN.einpassung;
    const prog = F.programm || null, nR = prog ? PROGRAMME[prog].raeume.length : Math.max(2, Math.round(p.raeume)), mu = Math.max(1, Math.round(p.mu));
    setzeFeld(feldVon(prog));                                            // neu: Feld je Programm (Vorbilder), sonst 500 × 430
    NAEHE = +p.naehe || 0;
    const L = prog && p.mindest ? lRaeume(prog, p.lform) : [];
    const Tg = prog ? geneListe(nR, new Array(nR).fill(0), prog, L) : [], n = prog ? Tg.length : nR;   // n = Gene (Räume + Teile)
    const sym = prog ? symmetrieGene(prog, Tg) : null, fest = prog ? festGene(prog, Tg) : null;
    const starr0 = [...(prog && p.starr ? starreFormen(prog, Tg) || [] : []), ...(prog ? treppenFormen(prog, Tg) : [])], starr = starr0.length ? starr0 : null;
    FEST = new Set((fest || []).map(f => f[0]));
    const bel = Math.min(1, Math.max(0.05, p.belegung == null ? 0.75 : p.belegung));
    const z = { t: 0, zufall, n, nRaeume: nR, lraeume: L, mu, ablauf: F.ablauf, topologie: F.topologie, programm: prog, belegung: bel,
                paare: prog ? (p.grundrissTopo === "wohnung" ? PROGRAMME[prog].paare.map(q => q.slice()) : nachbarn(nR, "stern")) : nachbarn(n, F.topologie),
                eltern: startPopulation(mu, nR, zufall, bel, prog, p.minSeite, p.mindest, L, sym, fest, starr), kinder: 0, aufteilung: null, gesperrt: -1, verlauf: [], verlaufD: [], dichte: 1, rlap: p.rlap,
                mindest: !!(prog && p.mindest), feld: feldVon(prog), sym, fest, starr };
    const stR = prog ? PROGRAMME[prog].raeume.findIndex(q => q[4] && q[4].treppe) : -1;   // Treppe (Haus): Gen, Raum, Zugangskante
    z.treppe = stR >= 0 ? { id: Tg.find(t => t[1] === stR)[0], raum: stR, kante: treppeVon(prog, stR).kante } : null;
    for (const e of z.eltern) { e.fd = distanzen(e, z.paare, p.rlap); if (z.mindest) e.f3 = planPruefung(e, z.paare, prog).f3; }
    merke(z);
    if (F.og && FASSUNGEN[F.og]) {                                        // Haus (neu): Obergeschoss als zweiter Lauf, an das EG gekoppelt
      z.og = erzeuge(ogParam(p), zufall);
      setzeFeld(z.feld); FEST = new Set((z.fest || []).map(f => f[0]));
      kopple(z, beste(z));
    }
    return z;
  }
  /** Kopplung der Geschosse (neu, 25.11.2026, Wunsch Reinhard): Treppe und Hof des EG-Plans werden im OG zu festen Räumen –
      Treppe an derselben Stelle, Luftraum genau über dem Hof (Teil für Teil). Danach die Eltern des OG neu bewerten. */
  /** Parameter des Obergeschosses: Regler der Ansicht, aber Raumform, Federn, Belegung und Schalter aus der eigenen (abgestimmten) Fassung */
  const OG_EIGEN = ["starr", "federRunden", "belegung", "cluster", "wand"];
  function ogParam(param) { const og = FASSUNGEN[param.fassung] && FASSUNGEN[param.fassung].og; if (!og) return param; return Object.assign({}, param, pick(FASSUNGEN[og], OG_EIGEN), { fassung: og }); }
  function raumMit(programm, test) { return PROGRAMME[programm].raeume.findIndex(test); }
  function geneVon(z, raum) { return z.eltern[0].g.filter(g => g.r === raum).map(g => g.id).sort((a, b) => a - b); }
  function ogFest(z, egInd, Oz) {
    const O = Oz || z.og, R = grundriss(egInd, 300, TEILE_PX), k = PX_M;
    const stE = raumMit(z.programm, q => q[4] && q[4].treppe), hofE = raumMit(z.programm, q => q[1] === "Court");
    const stO = raumMit(O.programm, q => q[4] && q[4].treppe), luftO = raumMit(O.programm, q => q[1] === "Open to sky");
    const F = [], rechteck = id => { const r = R.find(q => q.id === id); return r ? [r.x1 / k, r.y1 / k, r.x2 / k, r.y2 / k] : null; };
    if (stE >= 0 && stO >= 0) { const r = rechteck(geneVon(z, stE)[0]); if (r) F.push([geneVon(O, stO)[0], ...r]); }
    if (hofE >= 0 && luftO >= 0) { const a = geneVon(z, hofE), b = geneVon(O, luftO); a.forEach((id, j) => { const r = rechteck(id); if (r && b[j] != null) F.push([b[j], ...r]); }); }
    return F;
  }
  function kopple(z, egInd) {
    const O = z.og; if (!O) return;
    O.fest = ogFest(z, egInd);
    setzeFeld(O.feld); FEST = new Set(O.fest.map(f => f[0]));
    for (const e of O.eltern) { fixiere(e, O.fest); bewerte(e); e.fd = distanzen(e, O.paare, O.rlap); if (O.mindest) e.f3 = planPruefung(e, O.paare, O.programm).f3; }
    setzeFeld(z.feld); FEST = new Set((z.fest || []).map(f => f[0]));
  }

  /** Beste Lösung. Ohne Topologie wie RPopulation.FindFittestOverlap: erstes Individuum mit kleinstem Sg.
      Mit Topologie (neu): zuerst Lösungen mit Sg unter 1 % der Raumfläche, darunter die mit den meisten erfüllten
      Nachbarschaften, dann kleinstes Sg – sonst zeigte die App oft eine überlappungsarme Lösung ohne die Nachbarschaften. */
  function beste(z) {
    if (z.mindest) {                                                      // neu: kleinstes f3 (Plan), bei Gleichstand kleinstes Sg
      let b = z.eltern[0];
      for (const e of z.eltern) if (e.f3 < b.f3 || (e.f3 === b.f3 && e.fo < b.fo)) b = e;
      return b;
    }
    if (z.ablauf !== "topologie") { let b = z.eltern[0]; for (const e of z.eltern) if (e.fo < b.fo) b = e; return b; }
    const rl = z.rlap == null ? 50 : z.rlap;
    const A = z.eltern[0].g.reduce((s, g) => s + g.a, 0);
    const k = e => [e.fo < 0.01 * A ? 0 : 1, -erfuellt(e, z.paare, rl), e.fo];
    let b = z.eltern[0], kb = k(b);
    for (const e of z.eltern) { const ke = k(e); if (ke[0] < kb[0] || (ke[0] === kb[0] && (ke[1] < kb[1] || (ke[1] === kb[1] && ke[2] < kb[2])))) { b = e; kb = ke; } }
    return b;
  }
  /** Verlauf der besten Werte f1 und f2 je Generation (Diagramm chart1); lange Läufe werden ausgedünnt */
  function merke(z) {
    const b = beste(z);
    if (z.t % z.dichte === 0) { z.verlauf.push(b.fo); z.verlaufD.push(b.fd); }
    if (z.verlauf.length > 4000) { z.verlauf = z.verlauf.filter((_, i) => i % 2 === 0); z.verlaufD = z.verlaufD.filter((_, i) => i % 2 === 0); z.dichte *= 2; }
  }

  /** REvo.RunAdjust + NextGeneration (Fassungen einpassung und kollision) */
  function generationEinpassung(z, p) {
    const zuf = z.zufall, n = z.n, ges = z.gesperrt, E = z.eltern;
    const moveDist = rundeBank((HOEHE + BREITE) / n);
    let nrCopy = Math.trunc(E.length * p.druck / 2);
    const K = [];
    E.forEach(bewerte); sortiere(E, "fo");
    if (p.elite) K.push(kopie(E[0]));
    if (p.plus) {
      nrCopy -= Math.trunc(E.length / 2);
      for (const e of E) { const c = kopie(e); entwickle(c, zuf, ges, p.propForce, p.propRate, p.repForce, p.repRate); K.push(c); }
    }
    for (let i = 0; i < nrCopy; i++) {
      const paar = p.kreuzung && zuf() < p.kreuzRate ? kreuzung(E, zuf) : [kopie(E[zuf.ganz(E.length)]), kopie(E[zuf.ganz(E.length)])];
      for (const c of paar) {
        verschiebe(c, n / 1000, moveDist * n, zuf, ges);                  // große Sprünge
        verschiebe(c, n / 1000, Math.trunc(moveDist / 10), zuf, ges);     // kleine Schritte
        entwickle(c, zuf, ges, p.propForce, p.propRate, p.repForce, p.repRate);
        K.push(c);
      }
    }
    K.forEach(bewerte);
    z.kinder = K.length; z.aufteilung = null;
    if (!K.length) return;                                                // (μ,λ) ohne Kinder: Eltern bleiben
    sortiere(K, "fo");
    z.eltern = nimmBeste(K, z.mu);
    for (const e of z.eltern) e.fd = distanzen(e, z.paare, p.rlap);
  }

  /** REvo.RunTopo + NextGenerationProportionate (Fassungen topologie und gang) */
  function generationTopologie(z, p) {
    const zuf = z.zufall, n = z.n, ges = z.gesperrt, E = z.eltern, P = z.paare;
    const moveDist = rundeBank((HOEHE + BREITE) / n), schwelle = n * 1.25;
    const K = [];
    if (p.elite) K.push(kopie(E[0]));
    sortiere(E, "fo");
    if (p.elite) K.push(kopie(E[0]));
    if (p.plus) for (const e of E) {                                      // (+)-Selektion nur für Eltern mit f2 < 1,25 · Räume
      e.fd = distanzen(e, P, p.rlap);
      if (e.fd < schwelle) K.push(kopie(e));
    }
    const nrCopy = Math.trunc(E.length * Math.trunc(p.druck) / 2) - Math.trunc(E.length / 2);
    for (let i = 0; i < nrCopy; i++) {
      const paar = p.kreuzung && zuf() < p.kreuzRate ? kreuzung(E, zuf) : [kopie(E[zuf.ganz(E.length)]), kopie(E[zuf.ganz(E.length)])];
      for (const c of paar) {
        verschiebe(c, n / 1000, moveDist * 3, zuf, ges);
        variiereGroesse(c, 0.25, zuf, ges);
        variiereGroesseVoll(c, n / 1000, moveDist, zuf, ges);
        verschiebe(c, n / 1000, moveDist * 0.01, zuf, ges);
        inversion(c, 0.05, zuf);
        entwickle(c, zuf, ges, 0.7, 0.1, 0, 0);
        // Federn und Kollisionserkennung im Wechsel (Original: Federn, Kollision, Federn; neu: jede Federrunde endet mit Kollision,
        // sonst bleiben die Überlappungen der Federn stehen; mit federRunden = 2 genau der bisherige Ablauf)
        const runden = Math.max(1, Math.round(p.federRunden == null ? 2 : p.federRunden));
        const mitTeilen = z.n > (z.nRaeume || z.n);
        if (z.mindest) tauscheRaeume(c, z.sym, 0.15, zuf, ges);
        if (z.mindest && +p.cluster > 0) clusterSpiegeln(c, z, P, p.rlap, +p.cluster, zuf);
        if (z.mindest && z.treppe) treppeZugang(c, P, 0.1, zuf);
        if (mitTeilen && !z.sym) variiereAnteil(c, 0.2, zuf, ges);
        formen(c, z.starr); symmetrisiere(c, z.sym, ges); formen(c, z.starr); fixiere(c, z.fest);
        for (let r = 0; r < runden; r++) {
          federn(c, P, p.daempfung, p.rlap, ges);
          if (mitTeilen) for (const [a, b, rl] of innere(c)) federn(c, [[a, b]], p.daempfung, rl, ges);   // Teile eines Raums zusammenhalten
          entwickle(c, zuf, ges, p.propForce, p.propRate, p.repForce, p.repRate);
          formen(c, z.starr); symmetrisiere(c, z.sym, ges); formen(c, z.starr); fixiere(c, z.fest);
        }
        K.push(c);
      }
    }
    z.kinder = K.length;
    if (!K.length) { z.aufteilung = null; return; }
    // NextGenerationProportionate: 1 nach f1, μ − 1 nach f2; sobald die beste Lösung nach f1 auch f2 < 1,5 · Räume erreicht: 60 % / 40 %
    for (const c of K) { bewerte(c); c.fd = distanzen(c, P, p.rlap); if (z.mindest) c.f3 = planPruefung(c, P, z.programm).f3; }
    const mu = z.mu;
    sortiere(K, "fo");
    let nachD = mu - 1;
    if (K[0].fd < n * 1.5) nachD = rundeBank(mu * 0.4);
    const nachO = mu - nachD, neu = nimmBeste(K, nachO);
    if (z.mindest) K.sort((a, b) => a.f3 - b.f3);                        // neu: Plan-Bewertung f3 statt f2 (ohne Untergrenze 1)
    else sortiere(K, "fd");
    neu.push(...nimmBeste(K, nachD));
    sortiere(neu, "fo");
    z.eltern = neu; z.aufteilung = [nachO, nachD];
  }

  /** Ein Schritt = eine Generation (REvo.Run) */
  function schritt(z, param) {
    setzeFeld(z.feld); FEST = new Set((z.fest || []).map(f => f[0]));
    const p = Object.assign({}, STANDARD, param);
    NAEHE = +p.naehe || 0;
    z.rlap = p.rlap;
    if (z.ablauf === "topologie") generationTopologie(z, p); else generationEinpassung(z, p);
    z.t++;
    merke(z);
    if (z.og && !z.ogAus) { kopple(z, beste(z)); schritt(z.og, ogParam(Object.assign({}, STANDARD, param))); setzeFeld(z.feld); FEST = new Set((z.fest || []).map(f => f[0])); }
    return z;
  }

  /** Durchgangsbreite ohne Neustart: f2 der Eltern neu berechnen (alle anderen Regler wirken ab der nächsten Generation) */
  function aendere(z, param, id) {
    if (id === "rlap") { z.rlap = param.rlap; for (const e of z.eltern) e.fd = distanzen(e, z.paare, param.rlap); }
  }

  /* ---------------------------------------------------------------- Grundriss ableiten (neu, nicht im Original) */
  /** Aus der dichten Packung wird ein Grundriss: Jeder Raum wächst mit seinen Kanten in die freie Fläche, bis er an einen
      anderen Raum oder an das Umgebungsrechteck stößt. Stehen sich zwei Räume gegenüber, wachsen beide in kleinen Schritten
      (höchstens 4 px je Durchgang, Reihenfolge wechselnd), bis sie sich etwa in der Mitte treffen. Überlappungen bleiben, wie sie sind. Ergebnis: Rechtecke {id, x1, y1, x2, y2}. */
  function grundriss(ind, durchgaenge, teile) {
    const R = ind.g.map(g => ({ id: g.id, r: g.r == null ? g.id : g.r, x1: links(g), y1: oben(g), x2: rechts(g), y2: unten(g), tr: !!g.tr, zg: g.zg, zh: g.zh, fp: !!(g.tr || g.fp) }));
    for (const r of R) { r.x1 = Math.max(0, r.x1); r.y1 = Math.max(0, r.y1); r.x2 = Math.min(BREITE, r.x2); r.y2 = Math.min(HOEHE, r.y2); }
    const quer = (a1, a2, b1, b2) => Math.min(a2, b2) - Math.max(a1, b1) > 0.5;   // Projektionen überdecken sich echt
    // neu (Mindestmaße): Überlappungen bis „teile“ px Tiefe werden geteilt – die Wand rückt in die Mitte der Überlappung
    if (teile) for (let runde = 0; runde < 3; runde++) for (let i = 0; i < R.length; i++) for (let k = i + 1; k < R.length; k++) {
      const A = R[i], C = R[k], ox = Math.min(A.x2, C.x2) - Math.max(A.x1, C.x1), oy = Math.min(A.y2, C.y2) - Math.max(A.y1, C.y1);
      // feste Räume (Treppe, Luftraum) werden im Plan wie andere behandelt: gemessen besser als ganz ausweichen (24.11.2026)
      if (ox <= 0 || oy <= 0) continue;
      if (A.fp && C.fp) continue;
      if (A.fp !== C.fp) {                                                // Treppe, Luftraum (neu): behalten ihre Maße, der andere Raum weicht ganz aus
        const T_ = A.fp ? A : C, O = A.fp ? C : A;
        if (ox <= oy) { if (O.x1 + O.x2 < T_.x1 + T_.x2) O.x2 = Math.min(O.x2, T_.x1); else O.x1 = Math.max(O.x1, T_.x2); }
        else { if (O.y1 + O.y2 < T_.y1 + T_.y2) O.y2 = Math.min(O.y2, T_.y1); else O.y1 = Math.max(O.y1, T_.y2); }
        continue;
      }
      if (Math.min(ox, oy) > teile) continue;
      if (ox <= oy) { const m = (Math.max(A.x1, C.x1) + Math.min(A.x2, C.x2)) / 2; if (A.x1 + A.x2 < C.x1 + C.x2) { A.x2 = m; C.x1 = m; } else { C.x2 = m; A.x1 = m; } }
      else { const m = (Math.max(A.y1, C.y1) + Math.min(A.y2, C.y2)) / 2; if (A.y1 + A.y2 < C.y1 + C.y2) { A.y2 = m; C.y1 = m; } else { C.y2 = m; A.y1 = m; } }
    }
    for (let d = 0; d < (durchgaenge || 300); d++) {
      let bewegt = false;
      // nacheinander (sonst wachsen zwei Räume zugleich in dieselbe Ecke), die Reihenfolge wechselt je Durchgang
      for (const r of d % 2 ? R.slice().reverse() : R) {
        if (r.fp) continue;                                                // Treppe und Luftraum wachsen nicht
        // Freiraum je Seite: [Abstand, stößt an einen Raum?]
        let L = [r.x1, false], Rt = [BREITE - r.x2, false], O = [r.y1, false], U = [HOEHE - r.y2, false];
        for (const q of R) {
          if (q === r) continue;
          // Räume, die schon überlappen, blockieren die Seite ganz (Abstand 0), damit niemand durch sie hindurchwächst
          if (quer(r.y1, r.y2, q.y1, q.y2)) {
            if (q.x1 < r.x1 - 0.01) { const a = Math.max(0, r.x1 - q.x2); if (a < L[0]) L = [a, true]; }
            if (q.x2 > r.x2 + 0.01) { const a = Math.max(0, q.x1 - r.x2); if (a < Rt[0]) Rt = [a, true]; }
          }
          if (quer(r.x1, r.x2, q.x1, q.x2)) {
            if (q.y1 < r.y1 - 0.01) { const a = Math.max(0, r.y1 - q.y2); if (a < O[0]) O = [a, true]; }
            if (q.y2 > r.y2 + 0.01) { const a = Math.max(0, q.y1 - r.y2); if (a < U[0]) U = [a, true]; }
          }
        }
        const s = ([a, raum]) => Math.max(0, raum ? Math.min(a / 2, 4) : a);   // zur Wand ganz, zum Nachbarn in kleinen Schritten (beide gleich schnell)
        const dl = s(L), dr = s(Rt), dob = s(O), du = s(U);
        if (dl > 0.01 || dr > 0.01 || dob > 0.01 || du > 0.01) bewegt = true;
        r.x1 -= dl; r.x2 += dr; r.y1 -= dob; r.y2 += du;
      }
      if (!bewegt) break;
    }
    return R;
  }

  /** Türen an den gemeinsamen Kanten der geforderten Nachbarn im Grundriss (vgl. RSpring.FindDoors, im Original nie aufgerufen):
      Kante gilt als gemeinsam, wenn die Rechtecke höchstens 2 px auseinander liegen und sich auf mindestens breite + 10 px
      überdecken; die Tür (Breite breite) sitzt in der Mitte der gemeinsamen Kante. Nachbar −1: Eingang in der Außenwand.
      Ergebnis: [{a, b, senkrecht, x, y, l}] – Mittelpunkt, Länge, senkrecht = Tür in einer senkrechten Wand. */
  /** Treppe: Spanne des Zugangs entlang der Zugangskante – ganze Treppenbreite, bei der U-Treppe nur der Lauf (Hälfte zh) */
  function zugSpanne(S) { const senk = S.zg[0] === "x", lo = senk ? S.y1 : S.x1, hi = senk ? S.y2 : S.x2, m = (lo + hi) / 2;
    return !S.zh ? [lo, hi] : S.zh[1] === "0" ? [lo, m] : [m, hi]; }
  function tueren(R, paare, breite) {
    const T = [], teile = id => R.filter(q => (q.r == null ? q.id : q.r) === id), tol = 2, min = breite + RAND_PX;
    // je Paar von Rechtecken die Tür an der gemeinsamen Kante; bei L-Räumen (mehrere Rechtecke) die längste Kante
    const zwischen = (A, B, a, b) => {
      if (A.tr || B.tr) return zurTreppe(A.tr ? A : B, A.tr ? B : A, a, b);
      const oy = Math.min(A.y2, B.y2) - Math.max(A.y1, B.y1), ox = Math.min(A.x2, B.x2) - Math.max(A.x1, B.x1);
      const my = (Math.max(A.y1, B.y1) + Math.min(A.y2, B.y2)) / 2, mx = (Math.max(A.x1, B.x1) + Math.min(A.x2, B.x2)) / 2;
      if (oy >= min && Math.abs(A.x2 - B.x1) <= tol) return [oy, { a, b, senkrecht: true, x: (A.x2 + B.x1) / 2, y: my, l: breite }];
      if (oy >= min && Math.abs(B.x2 - A.x1) <= tol) return [oy, { a, b, senkrecht: true, x: (B.x2 + A.x1) / 2, y: my, l: breite }];
      if (ox >= min && Math.abs(A.y2 - B.y1) <= tol) return [ox, { a, b, senkrecht: false, x: mx, y: (A.y2 + B.y1) / 2, l: breite }];
      if (ox >= min && Math.abs(B.y2 - A.y1) <= tol) return [ox, { a, b, senkrecht: false, x: mx, y: (B.y2 + A.y1) / 2, l: breite }];
      return null;
    };
    // Treppe (neu): Öffnung nur an der Zugangskante (Antritt im EG, Austritt im OG), so breit wie die gemeinsame Kante, höchstens die Treppe
    const zurTreppe = (S, O, a, b) => {
      const k = S.zg; if (!k) return null;
      const senk = k[0] === "x", c = { x0: S.x1, x1: S.x2, y0: S.y1, y1: S.y2 }[k], oc = { x0: O.x2, x1: O.x1, y0: O.y2, y1: O.y1 }[k];
      if (Math.abs(c - oc) > tol) return null;
      const [s1, s2] = zugSpanne(S), lo = Math.max(s1, senk ? O.y1 : O.x1), hi = Math.min(s2, senk ? O.y2 : O.x2), l = hi - lo;
      if (l < Math.min(breite, s2 - s1 - 1)) return null;
      return [l + 1e6, senk ? { a, b, senkrecht: true, x: c, y: (lo + hi) / 2, l, treppe: true } : { a, b, senkrecht: false, x: (lo + hi) / 2, y: c, l, treppe: true }];
    };
    const eingang = (A, a, b) => {
      const kanten = [[A.x1 <= tol, true, 0, A.y1, A.y2], [A.x2 >= BREITE - tol, true, BREITE, A.y1, A.y2],
                      [A.y1 <= tol, false, 0, A.x1, A.x2], [A.y2 >= HOEHE - tol, false, HOEHE, A.x1, A.x2]];
      const k = kanten.filter(q => q[0] && q[4] - q[3] >= min).sort((p, q) => (q[4] - q[3]) - (p[4] - p[3]))[0];
      if (!k) return null;
      return [k[4] - k[3], k[1] ? { a, b, senkrecht: true, x: k[2], y: (k[3] + k[4]) / 2, l: breite } : { a, b, senkrecht: false, x: (k[3] + k[4]) / 2, y: k[2], l: breite }];
    };
    for (const [a, b] of paare) {
      const AA = teile(a); if (!AA.length) continue;
      let best = null;
      if (b === -1) for (const A of AA) { const t = eingang(A, a, b); if (t && (!best || t[0] > best[0])) best = t; }
      else for (const A of AA) for (const B of teile(b)) { const t = zwischen(A, B, a, b); if (t && (!best || t[0] > best[0])) best = t; }
      if (best) T.push(best[1]);
    }
    return T;
  }


  /* ---------------------------------------------------------------- Plan prüfen und Lösungen suchen (neu, 23.11.2026) */
  let TUER_PX = 45;                                                      // Türbreite 0,9 m
  let TEILE_PX = 25;                                                     // Überlappungen bis 0,5 m Tiefe teilt der Plan
  let RAND_PX = 10;                                                      // Zugabe zur Türbreite für die gemeinsame Wand (0,2 m)
  /** Feld und Maßstab setzen (neu): ohne Angabe wie im Original 500 × 430 px, 50 px = 1 m; mit Programm-Feld {b, h} in m
      wird die längere Seite auf 500 px gebracht. Türbreite 0,9 m und Teilungstiefe 0,5 m folgen dem Maßstab. */
  function setzeFeld(f) {
    if (!f) { BREITE = 500; HOEHE = 430; PX_M = 50; }
    else { PX_M = 500 / Math.max(f.b, f.h); BREITE = f.b * PX_M; HOEHE = f.h * PX_M; }
    TUER_PX = (f && f.tuer || 0.9) * PX_M; TEILE_PX = 0.5 * PX_M;          // Türbreite je Programm (Siza 0,8 m), sonst 0,9 m
    RAND_PX = (f && f.tuerRand != null ? f.tuerRand : 0.2) * PX_M;
    if (typeof FELD !== "undefined") { FELD.x = BREITE / 2; FELD.y = HOEHE / 2; FELD.w = BREITE; FELD.h = HOEHE; }
  }
  const feldVon = programm => programm && PROGRAMME[programm] && PROGRAMME[programm].feld || null;
  const PLAN_DURCHGAENGE = 120;                                          // Wachsen in der Bewertung (Ansicht: 300)
  /** Prüft den abgeleiteten Plan eines Individuums: Türen aller geforderten Nachbarschaften, Mindestbreite und Fläche
      (≥ 95 % der Programmfläche) je Raum, Überlappung. f3 = gewichtete Summe der Fehlbeträge; Türen gleitend gemessen
      (Abstand der Räume + fehlende Länge der gemeinsamen Wand, in m), damit die Selektion auch kleine Fortschritte sieht.
      gueltig: alle Türen, Breiten und Flächen auf 1 cm bzw. 0,01 m² genau, Überlappung unter 0,05 m². */
  let NAEHE = 0;                                                         // Gewicht der Nähe zum Vorbild in f3 (Regler „naehe“, je Lauf gesetzt)
  function planPruefung(ind, paare, programm, durchgaenge) {
    const R = grundriss(ind, durchgaenge || PLAN_DURCHGAENGE, TEILE_PX), T = tueren(R, paare, TUER_PX), P = PROGRAMME[programm].raeume;
    const raeume = [], schnitt = (a, c) => Math.max(0, Math.min(a.x2, c.x2) - Math.max(a.x1, c.x1)) * Math.max(0, Math.min(a.y2, c.y2) - Math.max(a.y1, c.y1));
    let breite = 0, flaeche = 0, ue = 0, tuer = 0, lform = 0;
    const teile = id => R.filter(q => q.r === id), raumIds = [...new Set(R.map(q => q.r))];
    const istFlaeche = {};
    for (const id of raumIds) {                                           // Fläche je Raum: alle Teile, ohne ihre gegenseitige Überlappung
      const T2 = teile(id); let a = T2.reduce((q, t) => q + (t.x2 - t.x1) * (t.y2 - t.y1), 0);
      for (let i = 0; i < T2.length; i++) for (let k = i + 1; k < T2.length; k++) a -= schnitt(T2[i], T2[k]);
      istFlaeche[id] = a / (PX_M * PX_M);
      flaeche += Math.max(0, P[id][2] * 0.95 - istFlaeche[id]);
    }
    for (const r of R) {
      const w = Math.min(r.x2 - r.x1, r.y2 - r.y1) / PX_M, db = Math.max(0, (P[r.r][3] || 0) - w);
      breite += db;
      raeume.push({ id: r.id, raum: r.r, breite: w, flaeche: istFlaeche[r.r], zuSchmal: db > 0.01, zuKlein: P[r.r][2] * 0.95 - istFlaeche[r.r] > 0.01 });
    }
    for (let i = 0; i < R.length; i++) for (let k = i + 1; k < R.length; k++) ue += schnitt(R[i], R[k]) / (PX_M * PX_M);
    // Fehlbetrag einer Kontaktkante in px: Abstand + fehlende Länge der gemeinsamen Kante (gleitend)
    const kontakt = (A, B, noetig) => {
      const gx = Math.max(A.x1, B.x1) - Math.min(A.x2, B.x2), gy = Math.max(A.y1, B.y1) - Math.min(A.y2, B.y2);   // > 0 Lücke, < 0 Überdeckung
      return Math.min(Math.max(0, gx) + Math.max(0, noetig + gy), Math.max(0, gy) + Math.max(0, noetig + gx));
    };
    const noetig = TUER_PX + RAND_PX;
    for (const [a, b] of paare) {
      const AA = teile(a); if (!AA.length) continue;
      let d = Infinity;
      if (b === -1) for (const A of AA) {                                 // Eingang: Abstand zur Außenwand + fehlende Wandlänge
        const ab = Math.min(A.x1, BREITE - A.x2, A.y1, HOEHE - A.y2), l = Math.max(A.x2 - A.x1, A.y2 - A.y1);
        d = Math.min(d, Math.max(0, ab) + Math.max(0, noetig - l));
      }
      else for (const A of AA) for (const B of teile(b)) d = Math.min(d, kontakt(A, B, noetig));
      if (d < Infinity) tuer += d / PX_M;
    }
    // L-Räume: Hauptteil und Schenkel berühren sich auf mindestens der Mindestbreite und liegen an einem Ende bündig
    for (const S of R) {
      if (S.r === S.id) continue;
      const gS = ind.g.find(g => g.id === S.id), anker = gS && gS.an != null ? gS.an : S.r;
      const H = R.find(q => q.id === anker); if (!H) continue;
      const mb = (P[S.r][3] || 0) * PX_M;
      lform += kontakt(H, S, mb) / PX_M;
      if (gS && gS.bd === false) continue;                               // vorgegebene Teile (Kreuz, T, I): nur Kontakt, nicht bündig
      const gx = Math.max(H.x1, S.x1) - Math.min(H.x2, S.x2), gy = Math.max(H.y1, S.y1) - Math.min(H.y2, S.y2);
      if (Math.abs(gx) <= 2 && gy < 0) lform += Math.min(Math.abs(H.y1 - S.y1), Math.abs(H.y2 - S.y2)) / PX_M;       // senkrechte Kontaktkante
      else if (Math.abs(gy) <= 2 && gx < 0) lform += Math.min(Math.abs(H.x1 - S.x1), Math.abs(H.x2 - S.x2)) / PX_M;  // waagerechte
    }
    // Treppe (neu, 25.11.2026): vor der Zugangskante ein Podest über die Breite des Laufs (gerade Treppe: ganze Breite; U-Treppe: im EG
    // der Antritts-, im OG der Austrittslauf), so tief wie der Lauf breit ist, mindestens 0,8 m (DIN 18065: Podesttiefe ≥ nutzbare
    // Laufbreite); es muss in den erschließenden Räumen (Nachbarn der Treppe) und im Feld liegen.
    // Fehlbetrag = nicht gedeckter Anteil + fehlende Länge der Öffnung (m)
    let treppe = 0;
    for (const S of R) {
      if (!S.tr || !S.zg) continue;
      const k = S.zg, senk = k[0] === "x", [s1, s2] = zugSpanne(S), d = Math.max(0.8 * PX_M, s2 - s1);
      const Lr = { x0: { x1: S.x1 - d, x2: S.x1, y1: s1, y2: s2 }, x1: { x1: S.x2, x2: S.x2 + d, y1: s1, y2: s2 }, y0: { x1: s1, x2: s2, y1: S.y1 - d, y2: S.y1 }, y1: { x1: s1, x2: s2, y1: S.y2, y2: S.y2 + d } }[k];
      const nb = new Set(paare.filter(q => q.includes(S.r)).map(q => (q[0] === S.r ? q[1] : q[0])));
      const A0 = (Lr.x2 - Lr.x1) * (Lr.y2 - Lr.y1);
      let gedeckt = 0; for (const q of R) if (nb.has(q.r)) gedeckt += schnitt(Lr, q);
      treppe += Math.max(0, 1 - Math.min(gedeckt, A0) / A0) * 3;
      const tt = T.find(t => t.treppe && (t.a === S.r || t.b === S.r)), soll = s2 - s1;
      treppe += Math.max(0, soll - (tt ? tt.l : 0)) / PX_M;
    }
    const fehlt = paare.length - T.length;
    const nah = NAEHE > 0 && PROGRAMME[programm].vorbild ? aehnlichkeit(ind, programm, R).mittel : null;   // Rekonstruktion: Abweichung vom Vorbild zählt mit
    return { f3: fehlt * 2 + tuer * 3 + breite * 10 + flaeche + ue * 5 + lform * 3 + treppe * 5 + (nah == null ? 0 : NAEHE * 20 * (1 - nah)), fehlt, tuer, breite, flaeche, ue, lform, treppe, raeume, aehnlich: nah,
             gueltig: fehlt === 0 && breite < 0.01 && flaeche < 0.01 && ue < 0.05 && lform < 0.02 && treppe < 0.05 };
  }

  /** Wände verschieben (neu, Nachbesserung am fertigen Plan; Zug nach Merrell, Schkufza und Koltun 2010, hier vereinfacht nachgebaut):
      am abgeleiteten, überlappungsfreien Plan eine Kante eines Raums samt aller Kanten, die auf derselben Linie an sie grenzen, um d
      verschieben – der Plan bleibt lückenlos. Feste Räume bleiben. Angenommen wird, was f3 nicht verschlechtert (bei weiter nur
      Schritte, die gültig bleiben). Ergebnis: Individuum aus den Planrechtecken. Schalter „wand“. */
  function wandSchieben(ind, paare, programm, zufall, versuche, weiter) {
    const R0 = grundriss(ind, 300, TEILE_PX), alsInd = R => ({ g: R.map(q => Object.assign(gen(q.id, (q.x1 + q.x2) / 2, (q.y1 + q.y2) / 2, q.x2 - q.x1, q.y2 - q.y1, null, 0.4, 0, q.r), q.tr ? { tr: true, zg: q.zg, zh: q.zh } : q.fp ? { fp: true } : {})), fo: 0, fd: 0 });
    let R = R0.map(q => Object.assign({}, q)), w = planPruefung(alsInd(R), paare, programm);
    const tol = 1;
    for (let v = 0; v < versuche && (weiter || !w.gueltig); v++) {
      const q = R[zufall.ganz(R.length)], seite = zufall.ganz(4), d = (zufall() * 2 - 1) * PX_M * (0.6 * (1 - v / versuche) + 0.05);
      if (FEST.has(q.id) || q.fp) continue;
      const waag = seite % 2 === 1, kante = [q.y1, q.x2, q.y2, q.x1][seite];      // 0 oben, 1 rechts, 2 unten, 3 links
      const lo = waag ? q.y1 : q.x1, hi = waag ? q.y2 : q.x2;
      const C = R.map(u => Object.assign({}, u)); let ok = true;
      for (const u of C) {
        for (const k of (waag ? ["x1", "x2"] : ["y1", "y2"])) {
          if (Math.abs(u[k] - kante) > tol) continue;
          const ulo = waag ? u.y1 : u.x1, uhi = waag ? u.y2 : u.x2;
          if (Math.min(hi, uhi) - Math.max(lo, ulo) <= 0 && u.id !== q.id) continue;   // nur Kanten, die an dieser Stelle anliegen
          if (FEST.has(u.id) || u.fp) { ok = false; break; }
          u[k] += d;
        }
        if (!ok) break;
        if (u.x2 - u.x1 < 2 || u.y2 - u.y1 < 2 || u.x1 < -0.5 || u.y1 < -0.5 || u.x2 > BREITE + 0.5 || u.y2 > HOEHE + 0.5) { ok = false; break; }
      }
      if (!ok) continue;
      const wc = planPruefung(alsInd(C), paare, programm);
      if (wc.f3 <= w.f3 && (!weiter || !w.gueltig || wc.gueltig)) { R = C; w = wc; }
    }
    const I = alsInd(R); I.fo = ueberlappung(I); I.f3 = w.f3;
    return { ind: I, wert: w };
  }

  /** Örtliche Nachbesserung (memetisch): einzelne Räume ein wenig verschieben oder ihre Proportion ändern, behalten, was f3 nicht
      verschlechtert; Schrittweite nimmt ab. Bricht ab, sobald der Plan gültig ist. */
  function nachbessern(ind, paare, programm, zufall, versuche, sym, fest, starr, weiter) {
    // weiter (Rekonstruktion): auch einen gültigen Plan weiter verbessern; angenommen wird nur, was gültig bleibt und f3 (mit Nähe) senkt
    let best = kopie(ind), w = planPruefung(best, paare, programm);
    const mitTreppe = ind.g.some(g => g.tr && g.zg);
    for (let v = 0; v < versuche && (weiter || !w.gueltig); v++) {
      const c = kopie(best), g = c.g[zufall.ganz(c.g.length)], s = 20 * (1 - v / versuche) + 2, art = zufall.ganz(mitTreppe ? 4 : 3);
      if (art === 0) g.x += (zufall() * 2 - 1) * s; else if (art === 1) g.y += (zufall() * 2 - 1) * s; else if (art === 2) setzeBreite(g, g.w + (zufall() * 2 - 1) * s); else treppeZugang(c, paare, 1, zufall);   // Treppe (neu): an den Zugang legen
      formen(c, starr);
      if (sym) symmetrisiere(c, sym, g.id);
      formen(c, starr); fixiere(c, fest);
      const wc = planPruefung(c, paare, programm);
      if (wc.f3 <= w.f3 && (!weiter || !w.gueltig || wc.gueltig)) { best = c; w = wc; }
    }
    best.fo = ueberlappung(best); best.f3 = w.f3;
    return { ind: best, wert: w };
  }

  /** Ähnlichkeit zum Vorbild (neu): je Raum Überdeckung (Schnitt / Vereinigung) seiner Planfläche mit der Fläche im Vorbild
      (PROGRAMME[…].vorbild: je Raum Rechtecke in m), gemittelt über die Räume; Raster 0,25 m. 1 = deckungsgleich. */
  function aehnlichkeit(ind, programm, R) {
    const V = programm && PROGRAMME[programm].vorbild; if (!V) return null;
    R = R || grundriss(ind, 300, TEILE_PX);
    const m = 1 / PX_M, je = [];
    const schnitt = (a, b) => Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
    const fl = a => (a[2] - a[0]) * (a[3] - a[1]);
    // Gespiegelte Grundrisse gelten als gleich (Reinhard 23.11.2026): Vergleich mit dem Plan selbst und seinen Spiegelungen
    // links/rechts, vorn/hinten und beiden; es zählt die beste Lage
    const B = BREITE * m, H = HOEHE * m;
    const lagen = [[false, false], [true, false], [false, true], [true, true]];
    let best = null;
    for (const [sx, sy] of lagen) {
      const je = [];
      for (let raum = 0; raum < V.length; raum++) {
        const P = R.filter(q => q.r === raum).map(q => { const x1 = q.x1 * m, x2 = q.x2 * m, y1 = q.y1 * m, y2 = q.y2 * m;   // Teile eines Raums überlappen sich nach dem Teilen nicht
          return [sx ? B - x2 : x1, sy ? H - y2 : y1, sx ? B - x1 : x2, sy ? H - y1 : y2]; });
        let s_ = 0; for (const a of P) for (const b of V[raum]) s_ += schnitt(a, b);
        const u = P.reduce((q, a) => q + fl(a), 0) + V[raum].reduce((q, b) => q + fl(b), 0) - s_;
        je.push(u > 0 ? s_ / u : 0);
      }
      const mittel = je.reduce((q, v) => q + v, 0) / je.length;
      if (!best || mittel > best.mittel) best = { mittel, je, gespiegelt: { x: sx, y: sy } };
    }
    return best;
  }


  /** Mittlerer Abstand der Raummittelpunkte zweier Pläne in m (Maß der Verschiedenheit) */
  function planAbstand(A, B) {
    // gespiegelte Pläne gelten als gleich (wie bei der Ähnlichkeit): kleinster Abstand über Plan, links/rechts, vorn/hinten, beides
    let best = Infinity;
    for (const [sx, sy] of [[false, false], [true, false], [false, true], [true, true]]) {
      let s = 0;
      for (const a of A) {
        const b = B.find(q => q.id === a.id), bx = (b.x1 + b.x2) / 2, by = (b.y1 + b.y2) / 2;
        s += Math.hypot((a.x1 + a.x2) / 2 - (sx ? BREITE - bx : bx), (a.y1 + a.y2) / 2 - (sy ? HOEHE - by : by));
      }
      best = Math.min(best, s / A.length / PX_M);
    }
    return best;
  }
  /** Maximin: erst der früheste Treffer, dann jeweils der, dessen kleinster Abstand zu den gewählten am größten ist */
  function waehleVerschiedene(treffer, n) {
    if (treffer.length <= n) return treffer.slice();
    const W = [treffer[0]], rest = treffer.slice(1);
    while (W.length < n) {
      let bi = 0, bd = -1;
      rest.forEach((t, i) => { const d = Math.min(...W.map(w => planAbstand(t.plan, w.plan))); if (d > bd) { bd = d; bi = i; } });
      W.push(rest.splice(bi, 1)[0]);
    }
    return W;
  }

  /** Suche nach gültigen Grundrissen: viele kurze Läufe mit neuen Saaten (Neustart statt Stillstand), jeder Lauf endet beim
      ersten gültigen Elter oder nach „generationen“; dann werden die drei besten Eltern nachgebessert. Gesammelt wird bis
      „ziel“ Treffer (Voreinstellung doppelt so viele wie gewünscht, damit Maximin wählen kann) oder „laeufe“ Läufe.
      Zufallsquelle: neueZufall(saat). sucheWeiter rechnet höchstens „budget“ Generationen und kehrt dann zurück (Zeitscheiben). */
  function sucheNeu(param, neueZufall, o) {
    o = Object.assign({ anzahl: 3, saat: 1, generationen: 200, pruefen: 10, versuche: 800, laeufe: 400 }, o);
    return { param: Object.assign({}, STANDARD, param), neueZufall, o, ziel: o.ziel || o.anzahl * 2, saat: o.saat, laeufe: 0,
             generationen: 0, lauf: null, treffer: [], doppelt: 0, fertig: false };
  }
  /** Haus (neu): passendes Obergeschoss zu einem EG-Plan – Treppe und Hof aus diesem Plan fest, die Eltern des OG (bzw. die
      gegebenen Kandidaten) daraufhin prüfen, bei nachbessern örtlich verbessern. Ergebnis {ind, wert, fest, eltern} oder null. */
  function ogPassend(z, egInd, o) {
    const O = z.og, fest = ogFest(z, egInd), K = (o && o.kandidaten) || O.eltern.slice().sort((a, b) => a.f3 - b.f3);
    setzeFeld(O.feld); FEST = new Set(fest.map(f => f[0]));
    let best = null;
    for (const e of K) {
      let c = kopie(e); fixiere(c, fest); let w = planPruefung(c, O.paare, O.programm);
      if (!w.gueltig && o && o.nachbessern) { const r = nachbessern(c, O.paare, O.programm, o.zuf, o.versuche, O.sym, fest, O.starr, false); c = r.ind; w = r.wert; }
      if (w.gueltig && (!best || (w.aehnlich != null && w.aehnlich > best.wert.aehnlich))) { best = { ind: c, wert: w, fest, eltern: O.eltern.map(kopie) }; if (!(o && o.alle)) break; }
    }
    if (best && o && o.weiter) { const r = nachbessern(best.ind, O.paare, O.programm, o.zuf, o.versuche, O.sym, fest, O.starr, true); if (r.wert.gueltig && r.wert.f3 <= best.wert.f3) Object.assign(best, { ind: r.ind, wert: r.wert }); }
    setzeFeld(z.feld); FEST = new Set((z.fest || []).map(f => f[0]));
    return best;
  }
  const hausAehnlich = (w, og) => og ? (w.aehnlich + og.wert.aehnlich) / 2 : w.aehnlich;
  /** Ein Geschoss eine Generation weiter in der Suche: prüfen, bei Rekonstruktion den ähnlichsten gültigen Plan merken, am Ende
      nachbessern. Ergebnis {fertig, treffer} (treffer null: Lauf ohne gültigen Plan). P hält den Stand der Phase (bester). */
  function etageSchritt(S, P, zz, zuf) {
    schritt(zz, S.param); S.generationen++;                              // schritt setzt das Feld des Laufs
    const rek = +S.param.naehe > 0 && zz.programm && PROGRAMME[zz.programm].vorbild;
    let treffer = null;
    if (zz.t % S.o.pruefen === 0) for (const e of zz.eltern) {
      const w = planPruefung(e, zz.paare, zz.programm);
      if (!w.gueltig) continue;
      if (!rek) { treffer = { ind: kopie(e), wert: w, nachgebessert: false }; break; }
      if (!P.bester || w.aehnlich > P.bester.wert.aehnlich) P.bester = { ind: kopie(e), wert: w, nachgebessert: false, t: zz.t };   // Rekonstruktion: bis zum Ende laufen, ähnlichsten gültigen merken
    }
    if (rek && zz.t >= S.o.generationen && P.bester) {                    // ähnlichsten gültigen Plan zum Schluss noch nachbessern
      const nb = nachbessern(P.bester.ind, zz.paare, zz.programm, zuf, S.o.versuche, zz.sym, zz.fest, zz.starr, true);
      treffer = nb.wert.gueltig && nb.wert.f3 <= P.bester.wert.f3 ? { ind: nb.ind, wert: nb.wert, nachgebessert: true } : P.bester;
      if (S.param.wand) { const w2 = wandSchieben(treffer.ind, zz.paare, zz.programm, zuf, S.o.versuche, true); if (w2.wert.gueltig && w2.wert.f3 <= treffer.wert.f3) treffer = { ind: w2.ind, wert: w2.wert, nachgebessert: true }; }
    }
    if (!treffer && zz.t >= S.o.generationen) {
      for (const e of zz.eltern.slice().sort((a, b) => a.f3 - b.f3).slice(0, 3)) {
        const r = nachbessern(e, zz.paare, zz.programm, zuf, S.o.versuche, zz.sym, zz.fest, zz.starr);
        if (r.wert.gueltig) { treffer = { ind: r.ind, wert: r.wert, nachgebessert: true }; break; }
        if (S.param.wand) { const r2 = wandSchieben(r.ind, zz.paare, zz.programm, zuf, S.o.versuche); if (r2.wert.gueltig) { treffer = { ind: r2.ind, wert: r2.wert, nachgebessert: true }; break; } }
      }
      return { fertig: true, treffer };
    }
    return { fertig: !!treffer, treffer };
  }
  /** Obergeschoss zu einem EG-Plan (Haus): neuer Lauf, Treppe und Luftraum fest aus dem EG-Plan */
  function ogZustand(z, egInd, param, zuf) {
    const O = erzeuge(ogParam(param), zuf);
    O.fest = ogFest(z, egInd, O); FEST = new Set(O.fest.map(f => f[0]));
    for (const e of O.eltern) { fixiere(e, O.fest); bewerte(e); e.fd = distanzen(e, O.paare, O.rlap); e.f3 = planPruefung(e, O.paare, O.programm).f3; }
    return O;
  }
  /** Suche (Haus, neu 25.11.2026): erst das EG (eigener Lauf ohne OG), dann zu jedem gültigen EG ein eigener OG-Lauf mit Treppe und Hof
      dieses EG; ein Treffer ist nur ein Haus mit beiden gültigen Geschossen */
  const OG_VERSUCHE = 3;                                                 // Läufe für das OG je gültigem EG
  function sucheWeiter(S, budget) {
    let rest = budget;
    while (!S.fertig && rest > 0) {
      if (!S.lauf) {
        if (S.laeufe >= S.o.laeufe) { S.fertig = true; break; }
        const zuf = S.neueZufall(S.saat);
        S.lauf = { saat: S.saat, zuf, z: erzeuge(S.param, zuf), eg: {}, og: null };
        S.lauf.z.ogAus = true;                                             // in der Suche läuft das OG erst nach dem EG
        S.saat++; S.laeufe++;
        if (!S.lauf.z.mindest) { S.fertig = true; S.lauf = null; break; }   // nur mit Raumprogramm und Mindestmaßen
      }
      const L = S.lauf, z = L.z;
      rest--;
      if (!L.og) {
        const r = etageSchritt(S, L.eg, z, L.zuf);
        if (!r.fertig) continue;
        if (!r.treffer) { S.lauf = null; continue; }
        L.egTreffer = r.treffer;
        if (z.og) { L.og = { P: {}, z: ogZustand(z, r.treffer.ind, S.param, L.zuf), versuch: 1 }; setzeFeld(z.feld); FEST = new Set((z.fest || []).map(f => f[0])); continue; }
      } else {
        const r = etageSchritt(Object.assign({}, S, { param: ogParam(S.param) }), L.og.P, L.og.z, L.zuf); S.generationen++;
        setzeFeld(z.feld); FEST = new Set((z.fest || []).map(f => f[0]));
        if (!r.fertig) continue;
        if (!r.treffer && L.og.versuch < OG_VERSUCHE) {                    // OG knapp verfehlt: neuer OG-Lauf zum selben EG
          L.og = { P: {}, z: ogZustand(z, L.egTreffer.ind, S.param, L.zuf), versuch: L.og.versuch + 1 }; setzeFeld(z.feld); FEST = new Set((z.fest || []).map(f => f[0])); continue;
        }
        if (!r.treffer) { S.lauf = null; continue; }
        L.ogTreffer = r.treffer;
      }
      const treffer = L.egTreffer, plan = grundriss(treffer.ind, 300, TEILE_PX);
      if (S.treffer.some(t => planAbstand(t.plan, plan) < 0.3)) S.doppelt++;   // fast gleiche (auch gespiegelte) Pläne nur einmal
      else {
        let og = null;
        if (L.og) {
          const O = L.og.z; setzeFeld(O.feld); FEST = new Set(O.fest.map(f => f[0]));
          og = { ind: L.ogTreffer.ind, wert: L.ogTreffer.wert, fest: O.fest, eltern: O.eltern.map(kopie), plan: grundriss(L.ogTreffer.ind, 300, TEILE_PX), programm: O.programm, paare: O.paare.map(q => q.slice()), t: O.t };
          setzeFeld(z.feld); FEST = new Set((z.fest || []).map(f => f[0]));
        }
        S.treffer.push({ saat: L.saat, t: z.t, ind: treffer.ind, eltern: z.eltern.map(kopie), wert: treffer.wert, plan, nachgebessert: treffer.nachgebessert,
                         programm: z.programm, paare: z.paare.map(q => q.slice()), og });
      }
      S.lauf = null;
      // fertig, wenn genug verschiedene Treffer da sind oder nur noch Gleiche kommen (Rekonstruktion: oft ein einziger Plan)
      if (S.treffer.length >= S.ziel || (S.treffer.length && S.doppelt >= 2 * (S.o.anzahl || 1))) S.fertig = true;
    }
    return S;
  }
  /** Zustand für die Einzelansicht aus einem Treffer: neuer Lauf derselben Saat, Eltern und Generation des Treffers,
      der gefundene Grundriss als erster Elter (so lässt er sich weiterentwickeln und mit der Maus bearbeiten) */
  function zustandAusTreffer(param, T, zufall) {
    const z = erzeuge(Object.assign({}, STANDARD, param), zufall);        // setzt auch das Feld
    z.eltern = [kopie(T.ind), ...T.eltern.slice(0, z.mu - 1).map(kopie)];
    for (const e of z.eltern) { e.fo = ueberlappung(e); e.fd = distanzen(e, z.paare, z.rlap); if (z.mindest) e.f3 = planPruefung(e, z.paare, z.programm).f3; }
    z.t = T.t; z.verlauf = []; z.verlaufD = []; z.dichte = 1; merke(z);
    if (z.og && T.og) {                                                   // Haus: Obergeschoss des Treffers dazu
      const O = z.og; O.fest = T.og.fest; setzeFeld(O.feld); FEST = new Set(O.fest.map(f => f[0]));
      O.eltern = [kopie(T.og.ind), ...T.og.eltern.slice(0, O.mu - 1).map(kopie)];
      for (const e of O.eltern) { fixiere(e, O.fest); e.fo = ueberlappung(e); e.fd = distanzen(e, O.paare, O.rlap); if (O.mindest) e.f3 = planPruefung(e, O.paare, O.programm).f3; }
      O.t = T.t; O.verlauf = []; O.verlaufD = []; O.dichte = 1; merke(O);
      setzeFeld(z.feld); FEST = new Set((z.fest || []).map(f => f[0]));
    }
    return z;
  }

  /* ---------------------------------------------------------------- Vorbilder (neu): Programme und Fassungen aus Daten-Dateien */
  /** Vorbilder aufnehmen: {programme: {id: {titel, feld, raeume, paare, symmetrie, vorbild}}, fassungen: {id: {programm}}};
      jede Fassung läuft wie ein Grundriss mit Mindestmaßen und den Nachbarschaften des Vorbilds. */
  function registriere(D) {
    if (!D) return;
    Object.assign(PROGRAMME, D.programme || {});
    for (const f of Object.values(D.fassungen || {}))                     // Haus: das Obergeschoss läuft als eigene, versteckte Fassung mit
      if (f.og && !(D.fassungen || {})[f.og]) D.fassungen[f.og] = Object.assign({}, f, { programm: f.og, og: undefined, versteckt: true });
    for (const [id, f] of Object.entries(D.fassungen || {}))
      FASSUNGEN[id] = Object.assign({}, FASSUNGEN.grundriss8, { versteckt: false, programm: f.programm, raeume: PROGRAMME[f.programm].raeume.length, grundrissTopo: "wohnung", mindest: true, lform: 0, naehe: 1, starr: true, cluster: 0, wand: false }, f);   // Vorbilder: rekonstruieren voreingestellt
  }

  /* ---------------------------------------------------------------- Maus (Form1.pictureBox1_Mouse*) */
  /** Linke Maustaste über einem Raum der besten Lösung: Raum sperren und in allen Eltern an die Mausposition setzen */
  function ziehe(z, x, y, phase) {
    if (phase === "unten") {
      z.gesperrt = -1;
      const g = beste(z).g.find(q => x >= links(q) && x <= rechts(q) && y >= oben(q) && y <= unten(q));
      if (!g) return false;
      z.gesperrt = g.id;
    }
    if (z.gesperrt < 0) return false;
    setzeFeld(z.feld);
    for (const e of z.eltern) { const g = finde(e, z.gesperrt); if (g) { g.x = x; g.y = y; } formen(e, z.starr); symmetrisiere(e, z.sym, z.gesperrt); formen(e, z.starr); fixiere(e, z.fest); bewerte(e); if (z.mindest) e.f3 = planPruefung(e, z.paare, z.programm).f3; }
    return true;
  }
  /** Maustaste los: Sperre aufheben */
  function loslassen(z) { z.gesperrt = -1; }

  const M = { get BREITE() { return BREITE; }, get HOEHE() { return HOEHE; }, get PX_M() { return PX_M; }, get TUER_PX() { return TUER_PX; }, get TEILE_PX() { return TEILE_PX; },
           setzeFeld, registriere, aehnlichkeit, symmetrisiere, fixiere, PROGRAMME, flaechen, FASSUNGEN, REGLER, STANDARD, rundeBank, normal, gen, kopie, kollision, schnittRechteck, ueberlappung,
           setzeBreite, setzeBreite50, pruefeRand, proportion, abstossen, entwickle, verschiebe, variiereGroesse, variiereGroesseVoll,
           inversion, kreuzung, nachbarn, ringAbstand, zusatzAbstand, zusatzUeberlappung, paarDistanz, distanzen, erfuellt,
           federVektor, federn, aussen, grundriss, tueren, planPruefung, nachbessern, planAbstand, waehleVerschiedene,
           sucheNeu, sucheWeiter, zustandAusTreffer, ogPassend, kopple, treppeVon, lMoeglich, lRaeume, variiereAnteil, startPopulation, erzeuge, schritt, aendere, beste, ziehe, loslassen };
  if (typeof globalThis !== "undefined" && globalThis.KREMLAS_VORBILDER) for (const D of Object.values(globalThis.KREMLAS_VORBILDER)) registriere(D);
  return M;
});
