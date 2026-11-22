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
      gang:       wie topologie mit dem Testszenario (SetSzenario): ein Gang, drei Wohnungen zu je fünf Räumen (16 Räume). */
  const FASSUNGEN = {
    einpassung: { ablauf: "einpassung", topologie: "stern", belegung: 0.75, raeume: 25, mu: 1, druck: 2, plus: true, elite: false, kreuzung: true, kreuzRate: 0.75,
                  repForce: 0.25, repRate: 1, propForce: 0.25, propRate: 1, daempfung: 0.5, rlap: 50 },
    kollision:  { ablauf: "einpassung", topologie: "stern", belegung: 0.75, raeume: 10, mu: 1, druck: 1, plus: true, elite: false, kreuzung: false, kreuzRate: 0.75,
                  repForce: 0.5, repRate: 1, propForce: 0.1, propRate: 0.5, daempfung: 0.5, rlap: 50 },
    topologie:  { ablauf: "topologie", topologie: "stern", belegung: 0.75, raeume: 8, mu: 10, druck: 2, plus: true, elite: false, kreuzung: true, kreuzRate: 0.75,
                  repForce: 0.25, repRate: 1, propForce: 0.25, propRate: 1, daempfung: 0.5, rlap: 50 },
    gang:       { ablauf: "topologie", topologie: "gang", belegung: 0.75, raeume: 16, mu: 10, druck: 2, plus: true, elite: false, kreuzung: true, kreuzRate: 0.75,
                  repForce: 0.25, repRate: 1, propForce: 0.25, propRate: 1, daempfung: 0.5, rlap: 50 },
    grundriss8: { ablauf: "topologie", topologie: "programm", programm: "acht", belegung: 0.85, raeume: 8, mu: 20, druck: 2, plus: true, elite: false, kreuzung: true, kreuzRate: 0.75,
                  repForce: 0.25, repRate: 1, propForce: 0.25, propRate: 1, daempfung: 0.5, rlap: 50 },
    grundriss10:{ ablauf: "topologie", topologie: "programm", programm: "zehn", belegung: 0.85, raeume: 10, mu: 20, druck: 2, plus: true, elite: false, kreuzung: true, kreuzRate: 0.75,
                  repForce: 0.25, repRate: 1, propForce: 0.25, propRate: 1, daempfung: 0.5, rlap: 50 }
  };

  /** Maßstab der Grundrisse: 50 px = 1 m. Das Feld 500 × 430 ist also 10 × 8,6 m = 86 m² – genau die Summe der Raumprogramme
      (REvo.GrowPolys, auskommentiert: „1000 x 860 Pixel => 500 x 430“, total = 86). */
  const PX_M = 50;

  /** Raumprogramme für den Grundriss-Generator: Flächen aus REvo.GrowPolys (auskommentiert, je 86 m²). Die Nachbarschaften
      stehen nicht im Code; sie sind hier für eine Wohnung angenommen: Flur (hall) liegt an der Außenwand (Eingang, Nachbar −1)
      und erschließt Wohnen, Schlafräume und Bad,
      Wohnen grenzt an Hof und Küche (bzw. Essen, Essen an Küche), das zweite Bad gehört zum Elternschlafzimmer. */
  const PROGRAMME = {
    acht: {
      raeume: [["Flur", "Hall", 10], ["Hof", "Court", 7], ["Wohnen", "Living", 22], ["Eltern", "Master bedroom", 14],
               ["Zimmer 1", "Bedroom 1", 10], ["Zimmer 2", "Bedroom 2", 10], ["Küche", "Kitchen", 8], ["Bad", "Bathroom", 5]],
      paare: [[0, -1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 7], [2, 1], [2, 6]] },
    zehn: {
      raeume: [["Flur", "Hall", 10], ["Hof", "Court", 7], ["Wohnen", "Living", 12], ["Eltern", "Master bedroom", 12],
               ["Zimmer 1", "Bedroom 1", 10], ["Zimmer 2", "Bedroom 2", 8], ["Küche", "Kitchen", 8], ["Bad", "Bathroom", 5],
               ["Bad 2", "Bathroom 2", 4], ["Essen", "Dining", 10]],
      paare: [[0, -1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 7], [2, 1], [2, 9], [9, 6], [3, 8]] }
  };
  const REGLER = ["belegung", "raeume", "mu", "druck", "plus", "elite", "kreuzung", "kreuzRate", "repForce", "repRate", "propForce", "propRate", "daempfung", "rlap"];

  function pick(o, ks) { const r = {}; ks.forEach(k => { r[k] = o[k]; }); return r; }

  /** Voreinstellungen: Fassung „einpassung“ (Stand des Programms) */
  const STANDARD = Object.assign({ fassung: "einpassung", topo: false, plan: false, nummern: false, verlauf: true }, pick(FASSUNGEN.einpassung, REGLER));

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
  const gen = (id, x, y, w, h, a) => ({ id, x, y, w, h, a: a == null ? w * h : a, vx: 0, vy: 0 });
  const kopieGen = g => ({ id: g.id, x: g.x, y: g.y, w: g.w, h: g.h, a: g.a, vx: 0, vy: 0 });
  const kopie = ind => ({ g: ind.g.map(kopieGen), fo: ind.fo, fd: ind.fd });
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

  /** Breite setzen und Höhe aus der Fläche ableiten (RGen.CheckWidtHeight): kürzeste Seite ≥ 0,75·√Fläche, höchstens Feldbreite/-höhe */
  function setzeBreite(g, w) {
    const min = Math.sqrt(g.a) * 0.75;
    if (w < min) w = min; else if (w > BREITE) w = BREITE;
    let h = g.a / w;
    if (h < min) { h = min; w = g.a / h; }
    if (h > HOEHE) { h = HOEHE; w = g.a / h; }
    g.w = w; g.h = h;
  }

  /** Breite variieren mit fester Untergrenze 50 (RChromosome.VarySize/VarySizeFull) */
  function setzeBreite50(g, w) {
    const min = 50;
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
      Hier zeigt er zum Nachbarn hin (behoben 22.11.2026). */
  function federVektor(A, B, rlap) {
    const aL = links(A), aR = rechts(A), aO = oben(A), aU = unten(A), bL = links(B), bR = rechts(B), bO = oben(B), bU = unten(B);
    const x = aR < bL ? bL - aR : bR < aL ? -(aL - bR) : 0;
    const y = aU < bO ? bO - aU : bU < aO ? -(aO - bU) : 0;
    let ox = aL < bL ? bL - aR : aL - bR, oy = aO < bO ? bO - aU : aO - bU;   // negativ bei Überdeckung der Projektionen
    if (ox < 0 && oy > 0) { ox = Math.abs(ox) < rlap ? rlap + ox : 0; oy = 0; }
    else if (ox > 0 && oy < 0) { oy = Math.abs(oy) < rlap ? rlap + oy : 0; ox = 0; }
    else if (ox > 0 && oy > 0) { ox = rlap; oy = rlap; }
    else { ox = 0; oy = 0; }
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
  function startPopulation(mu, n, zufall, belegung, programm) {
    const A = flaechen(n, belegung == null ? 0.75 : belegung, programm), P = [];
    for (let k = 0; k < mu; k++) {
      const G = [];
      for (let i = 0; i < n; i++) {
        const a = A[i], x = zufall.ganz(BREITE), y = zufall.ganz(HOEHE);
        let w = Math.sqrt(a) + zufall.ganz(20) - 10;
        if (w > Math.trunc(BREITE / 2)) w = Math.trunc(BREITE / 2);
        G.push(gen(i, x, y, w, a / w, a));
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
                paare: prog ? PROGRAMME[prog].paare.map(q => q.slice()) : nachbarn(n, F.topologie),
                eltern: startPopulation(mu, n, zufall, bel, prog), kinder: 0, aufteilung: null, gesperrt: -1, verlauf: [], verlaufD: [], dichte: 1, rlap: p.rlap };
    for (const e of z.eltern) e.fd = distanzen(e, z.paare, p.rlap);
    merke(z);
    return z;
  }

  /** Beste Lösung. Ohne Topologie wie RPopulation.FindFittestOverlap: erstes Individuum mit kleinstem Sg.
      Mit Topologie (neu): zuerst Lösungen mit Sg unter 1 % der Raumfläche, darunter die mit den meisten erfüllten
      Nachbarschaften, dann kleinstes Sg – sonst zeigte die App oft eine überlappungsarme Lösung ohne die Nachbarschaften. */
  function beste(z) {
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
        federn(c, P, p.daempfung, p.rlap, ges);
        entwickle(c, zuf, ges, p.propForce, p.propRate, p.repForce, p.repRate);
        federn(c, P, p.daempfung, p.rlap, ges);
        entwickle(c, zuf, ges, p.propForce, p.propRate, p.repForce, p.repRate);   // neu: zum Schluss noch einmal Kollision (sonst bleiben die Überlappungen der Federn stehen)
        K.push(c);
      }
    }
    z.kinder = K.length;
    if (!K.length) { z.aufteilung = null; return; }
    // NextGenerationProportionate: 1 nach f1, μ − 1 nach f2; sobald die beste Lösung nach f1 auch f2 < 1,5 · Räume erreicht: 60 % / 40 %
    for (const c of K) { bewerte(c); c.fd = distanzen(c, P, p.rlap); }
    const mu = z.mu;
    sortiere(K, "fo");
    let nachD = mu - 1;
    if (K[0].fd < n * 1.5) nachD = rundeBank(mu * 0.4);
    const nachO = mu - nachD, neu = nimmBeste(K, nachO);
    sortiere(K, "fd");
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
  function grundriss(ind, durchgaenge) {
    const R = ind.g.map(g => ({ id: g.id, x1: links(g), y1: oben(g), x2: rechts(g), y2: unten(g) }));
    for (const r of R) { r.x1 = Math.max(0, r.x1); r.y1 = Math.max(0, r.y1); r.x2 = Math.min(BREITE, r.x2); r.y2 = Math.min(HOEHE, r.y2); }
    const quer = (a1, a2, b1, b2) => Math.min(a2, b2) - Math.max(a1, b1) > 0.5;   // Projektionen überdecken sich echt
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
    for (const e of z.eltern) { const g = finde(e, z.gesperrt); if (g) { g.x = x; g.y = y; } bewerte(e); }
    return true;
  }
  /** Maustaste los: Sperre aufheben */
  function loslassen(z) { z.gesperrt = -1; }

  return { BREITE, HOEHE, PX_M, PROGRAMME, flaechen, FASSUNGEN, REGLER, STANDARD, rundeBank, normal, gen, kopie, kollision, schnittRechteck, ueberlappung,
           setzeBreite, setzeBreite50, pruefeRand, proportion, abstossen, entwickle, verschiebe, variiereGroesse, variiereGroesseVoll,
           inversion, kreuzung, nachbarn, ringAbstand, zusatzAbstand, zusatzUeberlappung, paarDistanz, distanzen, erfuellt,
           federVektor, federn, aussen, grundriss, tueren, startPopulation, erzeuge, schritt, aendere, beste, ziehe, loslassen };
});
