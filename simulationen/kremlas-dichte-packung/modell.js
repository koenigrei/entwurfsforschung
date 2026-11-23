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
     (örtliche Suche, memetisch) und wählt möglichst verschiedene aus (Maximin).
   Ein Schritt = eine Generation (REvo.Run). */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /** Zeichenfläche pictureBox1 (Form1.Designer.cs: 500 × 430) = Umgebungsrechteck REvo.Canvas */
  const BREITE = 500, HOEHE = 430;

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
                  repForce: 0.25, repRate: 1, propForce: 0.25, propRate: 1, daempfung: 0.5, rlap: 50, federRunden: 2, mindest: false },
    kollision:  { ablauf: "einpassung", topologie: "stern", belegung: 0.75, minSeite: 0.75, grundrissTopo: "stern", raeume: 10, mu: 1, druck: 1, plus: true, elite: false, kreuzung: false, kreuzRate: 0.75,
                  repForce: 0.5, repRate: 1, propForce: 0.1, propRate: 0.5, daempfung: 0.5, rlap: 50, federRunden: 2, mindest: false },
    topologie:  { ablauf: "topologie", topologie: "stern", belegung: 0.75, minSeite: 0.75, grundrissTopo: "stern", raeume: 8, mu: 10, druck: 2, plus: true, elite: false, kreuzung: true, kreuzRate: 0.75,
                  repForce: 0.25, repRate: 1, propForce: 0.25, propRate: 1, daempfung: 0.5, rlap: 50, federRunden: 10, mindest: false },
    gang:       { ablauf: "topologie", topologie: "gang", belegung: 0.75, minSeite: 0.75, grundrissTopo: "stern", raeume: 16, mu: 10, druck: 2, plus: true, elite: false, kreuzung: true, kreuzRate: 0.75,
                  repForce: 0.25, repRate: 1, propForce: 0.25, propRate: 1, daempfung: 0.5, rlap: 50, federRunden: 10, mindest: false },
    grundriss6: { ablauf: "topologie", topologie: "programm", programm: "sechs", belegung: 0.96, minSeite: 0.4, grundrissTopo: "stern", raeume: 6, mu: 20, druck: 2, plus: true, elite: false, kreuzung: true, kreuzRate: 0.75,
                  repForce: 0.25, repRate: 1, propForce: 0.25, propRate: 1, daempfung: 0.5, rlap: 50, federRunden: 5, mindest: true },
    grundriss8: { ablauf: "topologie", topologie: "programm", programm: "acht", belegung: 0.96, minSeite: 0.4, grundrissTopo: "stern", raeume: 8, mu: 20, druck: 2, plus: true, elite: false, kreuzung: true, kreuzRate: 0.75,
                  repForce: 0.25, repRate: 1, propForce: 0.25, propRate: 1, daempfung: 0.5, rlap: 50, federRunden: 5, mindest: true },
    grundriss10:{ ablauf: "topologie", topologie: "programm", programm: "zehn", belegung: 0.96, minSeite: 0.4, grundrissTopo: "stern", raeume: 10, mu: 20, druck: 2, plus: true, elite: false, kreuzung: true, kreuzRate: 0.75,
                  repForce: 0.25, repRate: 1, propForce: 0.25, propRate: 1, daempfung: 0.5, rlap: 50, federRunden: 5, mindest: true }
  };

  /** Maßstab der Grundrisse: 50 px = 1 m. Das Feld 500 × 430 ist also 10 × 8,6 m = 86 m² – genau die Summe der Raumprogramme
      (REvo.GrowPolys, auskommentiert: „1000 x 860 Pixel => 500 x 430“, total = 86). */
  const PX_M = 50;

  /** Raumprogramme für den Grundriss-Generator: Flächen aus REvo.GrowPolys (auskommentiert, je 86 m²) = Buch Tab. 8 und 9
      (Szenarien nach Flemming et al. 1992). Nachbarschaften wie im Buch (Kap. 9.1): Sterntopologie, alle Räume grenzen an den
      Flur (grundrissTopo "stern", Voreinstellung). Wahlweise ("wohnung") hier angenommene Nachbarschaften einer Wohnung: Flur (hall) liegt an der Außenwand (Eingang, Nachbar −1)
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
  const REGLER = ["belegung", "minSeite", "grundrissTopo", "raeume", "mu", "druck", "plus", "elite", "kreuzung", "kreuzRate", "repForce", "repRate", "propForce", "propRate", "daempfung", "rlap", "federRunden", "mindest"];

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
  /** mb: Mindestbreite in px (neu, nur mit Mindestmaßen; 0 = keine) */
  const gen = (id, x, y, w, h, a, ms, mb) => ({ id, x, y, w, h, a: a == null ? w * h : a, vx: 0, vy: 0, ms: ms || 0.75, mb: mb || 0 });
  const kopieGen = g => ({ id: g.id, x: g.x, y: g.y, w: g.w, h: g.h, a: g.a, vx: 0, vy: 0, ms: g.ms, mb: g.mb });
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
  const FELD = { x: BREITE / 2, y: HOEHE / 2, w: BREITE, h: HOEHE };

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
  function startPopulation(mu, n, zufall, belegung, programm, minSeite, mindest) {
    const A = flaechen(n, belegung == null ? 0.75 : belegung, programm), P = [];
    for (let k = 0; k < mu; k++) {
      const G = [];
      for (let i = 0; i < n; i++) {
        const a = A[i], x = zufall.ganz(BREITE), y = zufall.ganz(HOEHE);
        let w = Math.sqrt(a) + zufall.ganz(20) - 10;
        if (w > Math.trunc(BREITE / 2)) w = Math.trunc(BREITE / 2);
        const mb = programm && mindest ? (PROGRAMME[programm].raeume[i][3] || 0) * PX_M : 0;
        const g = gen(i, x, y, w, a / w, a, minSeite, mb);
        if (mb) setzeBreite(g, g.w);                                     // Mindestbreite gleich am Start
        G.push(g);
      }
      P.push(bewerte({ g: G, fo: 0, fd: 0 }));
    }
    return P;
  }

  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param), F = FASSUNGEN[p.fassung] || FASSUNGEN.einpassung;
    const prog = F.programm || null, n = prog ? PROGRAMME[prog].raeume.length : Math.max(2, Math.round(p.raeume)), mu = Math.max(1, Math.round(p.mu));
    const bel = Math.min(1, Math.max(0.05, p.belegung == null ? 0.75 : p.belegung));
    const z = { t: 0, zufall, n, mu, ablauf: F.ablauf, topologie: F.topologie, programm: prog, belegung: bel,
                paare: prog ? (p.grundrissTopo === "wohnung" ? PROGRAMME[prog].paare.map(q => q.slice()) : nachbarn(n, "stern")) : nachbarn(n, F.topologie),
                eltern: startPopulation(mu, n, zufall, bel, prog, p.minSeite, p.mindest), kinder: 0, aufteilung: null, gesperrt: -1, verlauf: [], verlaufD: [], dichte: 1, rlap: p.rlap,
                mindest: !!(prog && p.mindest) };
    for (const e of z.eltern) { e.fd = distanzen(e, z.paare, p.rlap); if (z.mindest) e.f3 = planPruefung(e, z.paare, prog).f3; }
    merke(z);
    return z;
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
        for (let r = 0; r < runden; r++) {
          federn(c, P, p.daempfung, p.rlap, ges);
          entwickle(c, zuf, ges, p.propForce, p.propRate, p.repForce, p.repRate);
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
    const p = Object.assign({}, STANDARD, param);
    z.rlap = p.rlap;
    if (z.ablauf === "topologie") generationTopologie(z, p); else generationEinpassung(z, p);
    z.t++;
    merke(z);
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
    const R = ind.g.map(g => ({ id: g.id, x1: links(g), y1: oben(g), x2: rechts(g), y2: unten(g) }));
    for (const r of R) { r.x1 = Math.max(0, r.x1); r.y1 = Math.max(0, r.y1); r.x2 = Math.min(BREITE, r.x2); r.y2 = Math.min(HOEHE, r.y2); }
    const quer = (a1, a2, b1, b2) => Math.min(a2, b2) - Math.max(a1, b1) > 0.5;   // Projektionen überdecken sich echt
    // neu (Mindestmaße): Überlappungen bis „teile“ px Tiefe werden geteilt – die Wand rückt in die Mitte der Überlappung
    if (teile) for (let runde = 0; runde < 3; runde++) for (let i = 0; i < R.length; i++) for (let k = i + 1; k < R.length; k++) {
      const A = R[i], C = R[k], ox = Math.min(A.x2, C.x2) - Math.max(A.x1, C.x1), oy = Math.min(A.y2, C.y2) - Math.max(A.y1, C.y1);
      if (ox <= 0 || oy <= 0 || Math.min(ox, oy) > teile) continue;
      if (ox <= oy) { const m = (Math.max(A.x1, C.x1) + Math.min(A.x2, C.x2)) / 2; if (A.x1 + A.x2 < C.x1 + C.x2) { A.x2 = m; C.x1 = m; } else { C.x2 = m; A.x1 = m; } }
      else { const m = (Math.max(A.y1, C.y1) + Math.min(A.y2, C.y2)) / 2; if (A.y1 + A.y2 < C.y1 + C.y2) { A.y2 = m; C.y1 = m; } else { C.y2 = m; A.y1 = m; } }
    }
    for (let d = 0; d < (durchgaenge || 300); d++) {
      let bewegt = false;
      // nacheinander (sonst wachsen zwei Räume zugleich in dieselbe Ecke), die Reihenfolge wechselt je Durchgang
      for (const r of d % 2 ? R.slice().reverse() : R) {
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
  function tueren(R, paare, breite) {
    const T = [], f = id => R.find(r => r.id === id), tol = 2, min = breite + 10;
    for (const [a, b] of paare) {
      const A = f(a); if (!A) continue;
      if (b === -1) {
        const kanten = [[A.x1 <= tol, true, 0, A.y1, A.y2], [A.x2 >= BREITE - tol, true, BREITE, A.y1, A.y2],
                        [A.y1 <= tol, false, 0, A.x1, A.x2], [A.y2 >= HOEHE - tol, false, HOEHE, A.x1, A.x2]];
        const k = kanten.filter(q => q[0] && q[4] - q[3] >= min).sort((p, q) => (q[4] - q[3]) - (p[4] - p[3]))[0];
        if (k) T.push(k[1] ? { a, b, senkrecht: true, x: k[2], y: (k[3] + k[4]) / 2, l: breite } : { a, b, senkrecht: false, x: (k[3] + k[4]) / 2, y: k[2], l: breite });
        continue;
      }
      const B = f(b); if (!B) continue;
      const oy = Math.min(A.y2, B.y2) - Math.max(A.y1, B.y1), ox = Math.min(A.x2, B.x2) - Math.max(A.x1, B.x1);
      const my = (Math.max(A.y1, B.y1) + Math.min(A.y2, B.y2)) / 2, mx = (Math.max(A.x1, B.x1) + Math.min(A.x2, B.x2)) / 2;
      if (oy >= min && Math.abs(A.x2 - B.x1) <= tol) T.push({ a, b, senkrecht: true, x: (A.x2 + B.x1) / 2, y: my, l: breite });
      else if (oy >= min && Math.abs(B.x2 - A.x1) <= tol) T.push({ a, b, senkrecht: true, x: (B.x2 + A.x1) / 2, y: my, l: breite });
      else if (ox >= min && Math.abs(A.y2 - B.y1) <= tol) T.push({ a, b, senkrecht: false, x: mx, y: (A.y2 + B.y1) / 2, l: breite });
      else if (ox >= min && Math.abs(B.y2 - A.y1) <= tol) T.push({ a, b, senkrecht: false, x: mx, y: (B.y2 + A.y1) / 2, l: breite });
    }
    return T;
  }

  /* ---------------------------------------------------------------- Plan prüfen und Lösungen suchen (neu, 23.11.2026) */
  const TUER_PX = 45;                                                    // Türbreite 0,9 m
  const TEILE_PX = 25;                                                   // Überlappungen bis 0,5 m Tiefe teilt der Plan
  const PLAN_DURCHGAENGE = 120;                                          // Wachsen in der Bewertung (Ansicht: 300)
  /** Prüft den abgeleiteten Plan eines Individuums: Türen aller geforderten Nachbarschaften, Mindestbreite und Fläche
      (≥ 95 % der Programmfläche) je Raum, Überlappung. f3 = gewichtete Summe der Fehlbeträge; Türen gleitend gemessen
      (Abstand der Räume + fehlende Länge der gemeinsamen Wand, in m), damit die Selektion auch kleine Fortschritte sieht.
      gueltig: alle Türen, Breiten und Flächen auf 1 cm bzw. 0,01 m² genau, Überlappung unter 0,05 m². */
  function planPruefung(ind, paare, programm, durchgaenge) {
    const R = grundriss(ind, durchgaenge || PLAN_DURCHGAENGE, TEILE_PX), T = tueren(R, paare, TUER_PX), P = PROGRAMME[programm].raeume;
    const raeume = [];
    let breite = 0, flaeche = 0, ue = 0, tuer = 0;
    for (const r of R) {
      const w = Math.min(r.x2 - r.x1, r.y2 - r.y1) / PX_M, a = (r.x2 - r.x1) * (r.y2 - r.y1) / (PX_M * PX_M);
      const db = Math.max(0, (P[r.id][3] || 0) - w), da = Math.max(0, P[r.id][2] * 0.95 - a);
      breite += db; flaeche += da;
      raeume.push({ id: r.id, breite: w, flaeche: a, zuSchmal: db > 0.01, zuKlein: da > 0.01 });
    }
    for (let i = 0; i < R.length; i++) for (let k = i + 1; k < R.length; k++) {
      const a = R[i], c = R[k], ox = Math.min(a.x2, c.x2) - Math.max(a.x1, c.x1), oy = Math.min(a.y2, c.y2) - Math.max(a.y1, c.y1);
      if (ox > 0 && oy > 0) ue += ox * oy / (PX_M * PX_M);
    }
    const noetig = TUER_PX + 10, f = id => R.find(r => r.id === id);
    for (const [a, b] of paare) {
      const A = f(a); if (!A) continue;
      if (b === -1) {                                                     // Eingang: Abstand zur Außenwand + fehlende Wandlänge
        const d = Math.min(A.x1, BREITE - A.x2, A.y1, HOEHE - A.y2), l = Math.max(A.x2 - A.x1, A.y2 - A.y1);
        tuer += (Math.max(0, d) + Math.max(0, noetig - l)) / PX_M; continue;
      }
      const B = f(b); if (!B) continue;
      const gx = Math.max(A.x1, B.x1) - Math.min(A.x2, B.x2), gy = Math.max(A.y1, B.y1) - Math.min(A.y2, B.y2);   // > 0 Lücke, < 0 Überdeckung
      tuer += Math.min(Math.max(0, gx) + Math.max(0, noetig + gy), Math.max(0, gy) + Math.max(0, noetig + gx)) / PX_M;
    }
    const fehlt = paare.length - T.length;
    return { f3: fehlt * 2 + tuer * 3 + breite * 10 + flaeche + ue * 5, fehlt, tuer, breite, flaeche, ue, raeume,
             gueltig: fehlt === 0 && breite < 0.01 && flaeche < 0.01 && ue < 0.05 };
  }

  /** Örtliche Nachbesserung (memetisch): einzelne Räume ein wenig verschieben oder ihre Proportion ändern, behalten, was f3 nicht
      verschlechtert; Schrittweite nimmt ab. Bricht ab, sobald der Plan gültig ist. */
  function nachbessern(ind, paare, programm, zufall, versuche) {
    let best = kopie(ind), w = planPruefung(best, paare, programm);
    for (let v = 0; v < versuche && !w.gueltig; v++) {
      const c = kopie(best), g = c.g[zufall.ganz(c.g.length)], s = 20 * (1 - v / versuche) + 2, art = zufall.ganz(3);
      if (art === 0) g.x += (zufall() * 2 - 1) * s; else if (art === 1) g.y += (zufall() * 2 - 1) * s; else setzeBreite(g, g.w + (zufall() * 2 - 1) * s);
      const wc = planPruefung(c, paare, programm);
      if (wc.f3 <= w.f3) { best = c; w = wc; }
    }
    best.fo = ueberlappung(best); best.f3 = w.f3;
    return { ind: best, wert: w };
  }

  /** Mittlerer Abstand der Raummittelpunkte zweier Pläne in m (Maß der Verschiedenheit) */
  function planAbstand(A, B) {
    let s = 0;
    for (const a of A) { const b = B.find(q => q.id === a.id); s += Math.hypot((a.x1 + a.x2 - b.x1 - b.x2) / 2, (a.y1 + a.y2 - b.y1 - b.y2) / 2); }
    return s / A.length / PX_M;
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
             generationen: 0, lauf: null, treffer: [], fertig: false };
  }
  function sucheWeiter(S, budget) {
    let rest = budget;
    while (!S.fertig && rest > 0) {
      if (!S.lauf) {
        if (S.laeufe >= S.o.laeufe) { S.fertig = true; break; }
        const zuf = S.neueZufall(S.saat);
        S.lauf = { saat: S.saat, zuf, z: erzeuge(S.param, zuf) };
        S.saat++; S.laeufe++;
        if (!S.lauf.z.mindest) { S.fertig = true; S.lauf = null; break; }   // nur mit Raumprogramm und Mindestmaßen
      }
      const L = S.lauf, z = L.z;
      schritt(z, S.param); rest--; S.generationen++;
      let treffer = null;
      if (z.t % S.o.pruefen === 0) for (const e of z.eltern) { const w = planPruefung(e, z.paare, z.programm); if (w.gueltig) { treffer = { ind: kopie(e), wert: w, nachgebessert: false }; break; } }
      if (!treffer && z.t >= S.o.generationen) {
        const E = z.eltern.slice().sort((a, b) => a.f3 - b.f3).slice(0, 3);
        for (const e of E) { const r = nachbessern(e, z.paare, z.programm, L.zuf, S.o.versuche); if (r.wert.gueltig) { treffer = { ind: r.ind, wert: r.wert, nachgebessert: true }; break; } }
        if (!treffer) { S.lauf = null; continue; }
      }
      if (treffer) {
        const plan = grundriss(treffer.ind, 300, TEILE_PX);
        if (!S.treffer.some(t => planAbstand(t.plan, plan) < 0.3)) {      // fast gleiche Pläne nur einmal
          S.treffer.push({ saat: L.saat, t: z.t, ind: treffer.ind, eltern: z.eltern.map(kopie), wert: treffer.wert, plan, nachgebessert: treffer.nachgebessert,
                           programm: z.programm, paare: z.paare.map(q => q.slice()) });
        }
        S.lauf = null;
        if (S.treffer.length >= S.ziel) S.fertig = true;
      }
    }
    return S;
  }
  /** Zustand für die Einzelansicht aus einem Treffer: neuer Lauf derselben Saat, Eltern und Generation des Treffers,
      der gefundene Grundriss als erster Elter (so lässt er sich weiterentwickeln und mit der Maus bearbeiten) */
  function zustandAusTreffer(param, T, zufall) {
    const z = erzeuge(Object.assign({}, STANDARD, param), zufall);
    z.eltern = [kopie(T.ind), ...T.eltern.slice(0, z.mu - 1).map(kopie)];
    for (const e of z.eltern) { e.fo = ueberlappung(e); e.fd = distanzen(e, z.paare, z.rlap); if (z.mindest) e.f3 = planPruefung(e, z.paare, z.programm).f3; }
    z.t = T.t; z.verlauf = []; z.verlaufD = []; z.dichte = 1; merke(z);
    return z;
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
    for (const e of z.eltern) { const g = finde(e, z.gesperrt); if (g) { g.x = x; g.y = y; } bewerte(e); if (z.mindest) e.f3 = planPruefung(e, z.paare, z.programm).f3; }
    return true;
  }
  /** Maustaste los: Sperre aufheben */
  function loslassen(z) { z.gesperrt = -1; }

  return { BREITE, HOEHE, PX_M, TUER_PX, TEILE_PX, PROGRAMME, flaechen, FASSUNGEN, REGLER, STANDARD, rundeBank, normal, gen, kopie, kollision, schnittRechteck, ueberlappung,
           setzeBreite, setzeBreite50, pruefeRand, proportion, abstossen, entwickle, verschiebe, variiereGroesse, variiereGroesseVoll,
           inversion, kreuzung, nachbarn, ringAbstand, zusatzAbstand, zusatzUeberlappung, paarDistanz, distanzen, erfuellt,
           federVektor, federn, aussen, grundriss, tueren, planPruefung, nachbessern, planAbstand, waehleVerschiedene,
           sucheNeu, sucheWeiter, zustandAusTreffer, startPopulation, erzeuge, schritt, aendere, beste, ziehe, loslassen };
});
