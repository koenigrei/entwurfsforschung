/* Magnetischer Grundrissgenerator · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung des Werkzeugs „Magnetizing Floor Plan Generator“ aus dem DeCodingSpaces Lab
   (Egor Gavrilov; Betreuung Reinhard König, Sven Schneider, Martin Dennemark; 2019/2020).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Verfahren (nach der Beschreibung im Lab, dem Paper Gavrilov et al. 2020 und dem Nachlesen des Quellcodes
   hellguz/Magnetizing_FloorPlanGenerator, Komponente „MagnetizingRooms_ES“ – Repository ohne Lizenz, daher
   kein Code übernommen, alles eigenständig geschrieben):
   Ein Raster aus 1-m-Zellen (frei / Flur / Raum n / außen) liegt über dem Umriss. Räume werden nacheinander
   „angedockt“: zuerst der Eingangsraum am Eingangspunkt, dann jeweils der Raum mit den meisten Nachbarschaften zu
   schon platzierten Räumen. Jeder Raum bringt einen Flurstreifen mit (an einer, zwei oder allen Seiten); seine
   Ecke muss an das bestehende Flursystem grenzen, und geforderte Nachbarn dürfen über Flurzellen höchstens
   MaxAdjDistance entfernt sein. Unter allen möglichen Lagen gewinnt die mit den meisten belegten Zellen in Verlängerung
   der Raumkanten („Magnet“). Passt ein Raum nicht mehr, endet die Lösung. Je Iteration entstehen fünf Lösungen;
   jede dritte Iteration werden stattdessen die fünf besten genommen, ihre letzten 1–5 Räume entfernt und neu
   gesetzt (quasi-evolutionär). Am Ende werden Sackgassen im Flur entfernt. */
(function (wurzel, fabrik) {
  const node = typeof module === "object" && module.exports;
  const M = fabrik();
  if (node) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /* Zellzustände wie im Original (dort -1 Flur, 0 frei, n Raum, 9999 außen) */
  const FREI = 0, FLUR = -1, AUSSEN = -2;
  const KAPAZITAET = 5;            // gridSolutionCapacity: so viele beste Lösungen bleiben
  const NEU_HAEUFIGKEIT = 3;       // newSolutionsFrequency: jede dritte Iteration wird verbessert

  /** Raumprogramme aus der Datei Magnetizing_FPG_Preview.gh (RoomInstance: Name, Fläche m², Verbindungen).
      Typ „Halle“ und Umriss sind eigene Annahmen (die Datei speichert den Typ nicht lesbar, die Umrisse liegen in der .3dm). */
  const BEISPIELE = {
    horn: {
      name: { de: "Haus am Horn (Weimar, 1923)", en: "Haus am Horn (Weimar, 1923)" }, b: 21, h: 21, eingang: [10, 20],   // 21 m: kleinster Umriss, in dem „Kinder 50 m²“ in der Regel passt (QUELLE.md)
      raeume: [["Kinder", 50], ["Dame", 12], ["Flur", 2], ["Herr", 9], ["Bad", 5], ["Nische", 7], ["Wohnzimmer", 30], ["Esszimmer", 7],
        ["Küche", 9], ["Flur", 9, "halle"], ["WC", 2], ["Fremdenz.", 8], ["Windfang", 1, "eingang"], ["Treppe", 2]],
      kanten: [[0, 1], [0, 7], [1, 2], [2, 3], [2, 6], [3, 4], [3, 5], [3, 6], [5, 6], [6, 7], [6, 9], [7, 8], [8, 9], [9, 10], [9, 11], [9, 12], [9, 13]]
    },
    savoye: {
      name: { de: "Villa Savoye (Poissy, 1931)", en: "Villa Savoye (Poissy, 1931)" }, b: 26, h: 24, eingang: [13, 23],
      raeume: [["Terrace", 7], ["Kitchen", 26], ["Living Room", 80], ["Roof Terrace", 96], ["Bedroom", 19], ["Bedroom", 26], ["Bathroom", 16], ["WC", 1],
        ["Hall", 25, "halle"], ["Ramp", 19, "eingang"], ["Bedroom", 25], ["Bathroom", 4], ["Bathroom", 5], ["Bedroom", 10]],
      kanten: [[0, 1], [1, 2], [1, 8], [2, 3], [2, 8], [3, 4], [3, 8], [4, 5], [5, 6], [6, 7], [6, 8], [8, 9], [8, 10], [8, 12], [10, 11], [12, 13]]
    },
    miller: {
      name: { de: "Miller House (Columbus, 1957)", en: "Miller House (Columbus, 1957)" }, b: 38, h: 34, eingang: [0, 17],
      raeume: [["Children", 120], ["TV-Recreation", 35], ["Guest", 31], ["Servant", 28], ["Carport", 77], ["Entrance", 13, "eingang"], ["Service", 101],
        ["Dining", 32], ["Master", 95], ["Lounge Pit", 45], ["Living Room", 100, "halle"]],
      kanten: [[0, 1], [0, 9], [1, 2], [1, 10], [2, 3], [3, 4], [4, 5], [5, 6], [5, 10], [6, 7], [7, 8], [7, 10], [8, 9], [9, 10]]
    },
    bad: {
      name: { de: "Hallenbad mit Sauna", en: "Indoor pool with sauna" }, b: 78, h: 66, eingang: [39, 65],
      raeume: [["Haupteingang", 12, "eingang"], ["Wartebereich", 38, "halle"], ["Gastronomie", 75], ["Küche", 18], ["Eingangshalle", 21, "halle"], ["Kasse/Shop", 36],
        ["Zugang Sauna", 64], ["Alter Ruheraum", 56], ["Kuppelraum", 56], ["Tepidarium", 38], ["Sauna-Bar", 27], ["Saunahof", 74], ["Schwallduschen", 18],
        ["Biosauna", 32], ["Ruhezone", 63], ["Dampfbad", 27], ["Finnische Sauna", 20], ["Alte Schwimmhalle", 460], ["Aufenthaltsbereich", 225, "halle"],
        ["Tribüne", 64], ["Neue Schwimmhalle", 1570]],
      kanten: [[0, 1], [1, 2], [1, 4], [1, 7], [2, 3], [4, 5], [5, 6], [5, 17], [6, 7], [6, 9], [6, 10], [7, 8], [8, 9], [10, 11], [10, 13], [11, 12], [11, 16],
        [12, 13], [12, 14], [12, 15], [13, 14], [14, 15], [15, 16], [17, 18], [18, 19], [19, 20]]
    }
  };

  /** Voreinstellungen: Iterations 250 [1..10000] und MaxAdjDistance 3 [1..5] wie die Schieberegler der .gh-Datei;
      MaxRatio 1.9, zweiseitige Flure, „Corridors as additional spaces“ und „Remove Dead Ends“ wie im Plugin. */
  const STANDARD = {
    beispiel: "horn", breite: 21, tiefe: 21, form: "rechteck",
    iterationen: 250, maxAdj: 3, maxRatio: 1.9, flurmodus: "zwei", flurZusatz: true,
    bewertung: "anzahl", nachbearbeitung: "sackgassen", ablauf: "raum"
  };

  /* ------------------------------------------------------------------ Raumprogramm */

  /** Raumprogramm aus einem Beispiel: Räume {name, flaeche, halle, eingang}, Kanten, Nachbarlisten, Eingangsraum. */
  function programm(schluessel) {
    const B = BEISPIELE[schluessel] || BEISPIELE.horn;
    const raeume = B.raeume.map(([name, flaeche, art]) => ({ name, flaeche, halle: art === "halle", eingang: art === "eingang" }));
    const nachbarn = raeume.map(() => []);
    for (const [a, b] of B.kanten) { nachbarn[a].push(b); nachbarn[b].push(a); }
    return { raeume, kanten: B.kanten.map(k => k.slice()), nachbarn, eingang: raeume.findIndex(r => r.eingang), N: raeume.length,
      flaeche: raeume.reduce((s, r) => s + r.flaeche, 0) };
  }

  /* ------------------------------------------------------------------ Raster */

  /** Grundraster W × H: Zellen außerhalb des Umrisses (Form) und gesperrte Zellen sind AUSSEN. */
  function grundraster(W, H, form, gesperrt) {
    const g = new Int16Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let aussen = false;
      if (form === "L") aussen = x >= Math.round(W * 0.55) && y < Math.round(H * 0.45);
      else if (form === "hof") aussen = x >= Math.round(W * 0.36) && x < Math.round(W * 0.64) && y >= Math.round(H * 0.36) && y < Math.round(H * 0.64);
      if (aussen) g[y * W + x] = AUSSEN;
    }
    for (const i of gesperrt || []) if (i >= 0 && i < W * H) g[i] = AUSSEN;
    return g;
  }

  /** Nächste freie Zelle zum Punkt (für den Eingangspunkt, falls er gesperrt oder außerhalb liegt); -1 wenn keine. */
  function naechsteFreie(g, W, H, x, y) {
    let best = -1, bd = Infinity;
    for (let i = 0; i < W * H; i++) if (g[i] === FREI) {
      const d = (i % W - x) ** 2 + (Math.floor(i / W) - y) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  /* ------------------------------------------------------------------ Raum mit Flurstreifen */

  /** Raumgröße aus Fläche und zufälligem Seitenverhältnis 1 … MaxRatio, wie im Plugin gerundet; zufällig gedreht. */
  function abmessungen(flaeche, maxRatio, zufall) {
    const ratio = 1 + zufall() * (maxRatio - 1);
    let a = Math.max(1, Math.round(Math.sqrt(flaeche / ratio))), b = Math.max(1, Math.round(ratio * Math.sqrt(flaeche / ratio)));
    if (zufall() < 0.5) [a, b] = [b, a];
    return [a, b];
  }

  /** Schablone eines Raums samt Flur: {w, h, flur(i, j)}; Zelle (0, 0) ist immer Flur (dort dockt der Raum an).
      modus "ein": Flur an einer Seite (zufällig Spalte 0 oder Zeile 0), "zwei": Spalte 0 und Zeile 0, "alle" oder Halle: Ring.
      zusatz = „Corridors as additional spaces“: Flur kommt zur Raumfläche hinzu, sonst wird er von ihr abgezogen. */
  function schablone(a, b, modus, zusatz, halle, zufall) {
    if (modus === "alle" || halle) {
      if (!zusatz) { a -= 2; b -= 2; }
      a = Math.max(1, a); b = Math.max(1, b);
      return { w: a + 2, h: b + 2, flur: (i, j) => i === 0 || j === 0 || i === a + 1 || j === b + 1 };
    }
    if (modus === "ein") {
      if (zufall() < 0.5) {
        if (!zusatz) a--;
        a = Math.max(1, a); b = Math.max(1, b);
        return { w: a + 1, h: b, flur: (i) => i === 0 };
      }
      if (!zusatz) b--;
      a = Math.max(1, a); b = Math.max(1, b);
      return { w: a, h: b + 1, flur: (i, j) => j === 0 };
    }
    if (!zusatz) { a--; b--; }
    a = Math.max(1, a); b = Math.max(1, b);
    return { w: a + 1, h: b + 1, flur: (i, j) => i === 0 || j === 0 };
  }

  /* ------------------------------------------------------------------ Abstand über Flure */

  /** Abstandsfeld von den Zellen eines Raums: Wege über Flurzellen (8er-Nachbarschaft, diagonal √2), höchstens maxD.
      Eine freie Zelle erhält einen Wert, wenn sie direkt oder über eine Kette von Flurzellen erreichbar ist
      (wie CellIsNearerThan im Plugin, nur von der Zielseite her gerechnet). Ergebnis: Map Zellindex → Abstand. */
  function flurAbstand(g, W, H, raumWert, kasten, maxD) {
    const d = new Map(), schlange = [];
    const [kx, ky, kw, kh] = kasten;
    for (let y = ky; y < ky + kh; y++) for (let x = kx; x < kx + kw; x++) {
      const i = y * W + x;
      if (g[i] === raumWert) { d.set(i, 0); schlange.push(i); }
    }
    while (schlange.length) {
      const i = schlange.shift(), di = d.get(i), x = i % W, y = (i - x) / W;
      if (di > 0 && g[i] !== FLUR) continue;                  // nur über Flurzellen weiter
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx, nd = di + (dx && dy ? Math.SQRT2 : 1);
        if (nd > maxD + 1e-9 || g[j] === raumWert) continue;
        if (!d.has(j) || nd < d.get(j) - 1e-12) { d.set(j, nd); schlange.push(j); }
      }
    }
    return d;
  }

  /** Andockzellen: freie Zellen, die seitlich an eine Flurzelle grenzen und zu allen schon platzierten
      geforderten Nachbarn einen Flurabstand ≤ maxD haben (availableCellsGrid). */
  function andockzellen(g, W, H, felder, maxD) {
    const z = [];
    for (let i = 0; i < W * H; i++) {
      if (g[i] !== FREI) continue;
      const x = i % W, y = (i - x) / W;
      if (!((x > 0 && g[i - 1] === FLUR) || (x < W - 1 && g[i + 1] === FLUR) || (y > 0 && g[i - W] === FLUR) || (y < H - 1 && g[i + W] === FLUR))) continue;
      if (felder.every(f => f.has(i) && f.get(i) <= maxD + 1e-9)) z.push(i);
    }
    return z;
  }

  /* ------------------------------------------------------------------ Lage bewerten und setzen */

  /** Summentabellen für schnelle Prüfungen: S = 2D-Summe belegter Zellen (nicht frei), Z/Sp = Zeilen-/Spaltensummen
      der Zellen mit Raum oder Flur (für die „Magnet“-Bewertung). */
  function tabellen(g, W, H) {
    const S = new Int32Array((W + 1) * (H + 1)), Z = new Int32Array((W + 1) * H), Sp = new Int32Array(W * (H + 1));
    for (let y = 0; y < H; y++) {
      let zeile = 0;
      for (let x = 0; x < W; x++) {
        const v = g[y * W + x], belegt = v !== FREI ? 1 : 0, voll = v !== FREI && v !== AUSSEN ? 1 : 0;
        zeile += belegt;
        S[(y + 1) * (W + 1) + x + 1] = S[y * (W + 1) + x + 1] + zeile;
        Z[y * (W + 1) + x + 1] = Z[y * (W + 1) + x] + voll;
        Sp[(y + 1) * W + x] = Sp[y * W + x] + voll;
      }
    }
    return { S, Z, Sp, W, H };
  }
  const rechteckBelegt = (T, x0, y0, x1, y1) => {     // inklusive Grenzen
    const w = T.W + 1;
    return T.S[(y1 + 1) * w + x1 + 1] - T.S[y0 * w + x1 + 1] - T.S[(y1 + 1) * w + x0] + T.S[y0 * w + x0];
  };
  const zeileVoll = (T, y, x0, x1) => (y < 0 || y >= T.H || x1 < x0) ? 0 : T.Z[y * (T.W + 1) + x1 + 1] - T.Z[y * (T.W + 1) + x0];
  const spalteVoll = (T, x, y0, y1) => (x < 0 || x >= T.W || y1 < y0) ? 0 : T.Sp[(y1 + 1) * T.W + x] - T.Sp[y0 * T.W + x];

  /** Kasten (x0, y0, w, h) einer Schablone, die mit Zelle (0, 0) an (ax, ay) liegt und in Richtung (sx, sy) wächst. */
  function kastenVon(ax, ay, sx, sy, s) {
    return [sx > 0 ? ax : ax - s.w + 1, sy > 0 ? ay : ay - s.h + 1, s.w, s.h];
  }

  /** „Magnet“-Bewertung einer Lage (GetRoomPlacementRating): belegte Zellen (Raum oder Flur) auf den vier Linien direkt
      neben dem Kasten, jeweils vom Andockpunkt über den Raum hinaus bis zum Rasterrand. Mehr Nachbarschaft = kompakter. */
  function bewerteLage(T, ax, ay, sx, sy, s) {
    const [x0, y0, w, h] = kastenVon(ax, ay, sx, sy, s), x1 = x0 + w - 1, y1 = y0 + h - 1;
    const [lx0, lx1] = sx > 0 ? [ax, T.W - 1] : [0, ax], [ly0, ly1] = sy > 0 ? [ay, T.H - 1] : [0, ay];
    return zeileVoll(T, y0 - 1, lx0, lx1) + zeileVoll(T, y1 + 1, lx0, lx1) + spalteVoll(T, x0 - 1, ly0, ly1) + spalteVoll(T, x1 + 1, ly0, ly1);
  }

  /** Versucht, Raum r in Lösung L zu setzen (TryPlaceNewRoomToTheGrid). true bei Erfolg; L.gitter und L.kasten ändern sich. */
  function platziere(L, W, H, prog, r, p, zufall) {
    const g = L.gitter, raum = prog.raeume[r];
    const felder = prog.nachbarn[r].filter(q => L.kasten[q]).map(q => flurAbstand(g, W, H, q + 1, L.kasten[q], p.maxAdj));
    const [a, b] = abmessungen(raum.flaeche, p.maxRatio, zufall);
    const s = schablone(a, b, p.flurmodus, p.flurZusatz, raum.halle, zufall);
    const kand = andockzellen(g, W, H, felder, p.maxAdj);
    if (!kand.length) return false;
    const T = tabellen(g, W, H);
    let bestWert = -1, wahl = null, gleich = 0;
    for (const i of kand) {
      const ax = i % W, ay = (i - ax) / W;
      for (const [sx, sy] of [[1, 1], [1, -1], [-1, -1], [-1, 1]]) {
        const [x0, y0, w, h] = kastenVon(ax, ay, sx, sy, s);
        if (x0 < 0 || y0 < 0 || x0 + w > W || y0 + h > H) continue;
        if (rechteckBelegt(T, x0, y0, x0 + w - 1, y0 + h - 1) !== 0) continue;
        const v = bewerteLage(T, ax, ay, sx, sy, s);
        if (v > bestWert) { bestWert = v; wahl = [ax, ay, sx, sy]; gleich = 1; }
        else if (v === bestWert && zufall() * ++gleich < 1) wahl = [ax, ay, sx, sy];   // Gleichstand: zufällig
      }
    }
    if (!wahl) return false;
    const [ax, ay, sx, sy] = wahl;
    for (let j = 0; j < s.h; j++) for (let i = 0; i < s.w; i++) g[(ay + sy * j) * W + ax + sx * i] = s.flur(i, j) ? FLUR : r + 1;
    L.kasten[r] = kastenVon(ax, ay, sx, sy, s);
    L.anker[r] = ay * W + ax;
    return true;
  }

  /* ------------------------------------------------------------------ Reihenfolge */

  /** Nächster Raum: Eingangsraum zuerst; sonst der unplatzierte Raum mit den meisten Verbindungen zu platzierten
      (je Verbindung 1 + 0,1·Zufall, wie im Plugin); hat keiner solche, der insgesamt am stärksten vernetzte. −1 = alle platziert. */
  function naechsterRaum(prog, L, zufall) {
    const offen = prog.raeume.map((_, i) => !L.kasten[i]);
    if (!offen.some(Boolean)) return -1;
    if (prog.eingang >= 0 && offen[prog.eingang] && !L.folge.length) return prog.eingang;
    const prio = prog.raeume.map(() => 0);
    for (const [a, b] of prog.kanten) {
      if (!offen[a] && offen[b]) prio[b] += 1 + zufall() * 0.1;
      if (!offen[b] && offen[a]) prio[a] += 1 + zufall() * 0.1;
    }
    let best = -1;
    for (let i = 0; i < prog.N; i++) if (offen[i] && (best < 0 || prio[i] > prio[best])) best = i;
    if (prio[best] > 0) return best;
    for (let i = 0; i < prog.N; i++) prio[i] = 0;
    for (const [a, b] of prog.kanten) {
      if (offen[a]) prio[a] += 1 + zufall() * 0.1;
      if (offen[b]) prio[b] += 1 + zufall() * 0.1;
    }
    best = -1;
    for (let i = 0; i < prog.N; i++) if (offen[i] && (best < 0 || prio[i] > prio[best])) best = i;
    return best;
  }

  /* ------------------------------------------------------------------ Lösungen */

  function leereLoesung(z, art, slot) {
    const g = z.basis.slice();
    if (z.start >= 0) g[z.start] = FLUR;      // Startpunkt als erste Flurzelle
    return { gitter: g, kasten: z.prog.raeume.map(() => null), anker: z.prog.raeume.map(() => -1), folge: [], art, slot, entfernt: 0 };
  }
  function kopie(L, art, slot) {
    return { gitter: L.gitter.slice(), kasten: L.kasten.map(k => k && k.slice()), anker: L.anker.slice(), folge: L.folge.slice(), art, slot, entfernt: 0 };
  }

  /** Entfernt die letzten k platzierten Räume samt ihren Flurstreifen (mindestens einer bleibt). */
  function entferneLetzte(L, W, k) {
    let n = 0;
    while (n < k && L.folge.length > 1) {
      const r = L.folge.pop(), [x0, y0, w, h] = L.kasten[r];
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) L.gitter[y * W + x] = FREI;
      L.kasten[r] = null; L.anker[r] = -1; n++;
    }
    return n;
  }

  /** Bewertung: Zahl der platzierten Räume oder ihre Fläche (m², Raumzellen ohne Flur); die andere Größe entscheidet bei Gleichstand. */
  function wert(L, prog, bewertung) {
    const anzahl = L.folge.length, flaeche = L.folge.reduce((s, r) => s + prog.raeume[r].flaeche, 0);
    return bewertung === "flaeche" ? [flaeche, anzahl] : [anzahl, flaeche];
  }
  const besser = (a, b) => a[0] > b[0] || (a[0] === b[0] && a[1] > b[1]);

  /** Fehlende Nachbarschaften je Raum (MissingRoomAdjacences): geforderte Nachbarn, die nicht platziert sind. */
  function fehlendeNachbarn(L, prog) {
    const f = prog.raeume.map(() => 0);
    for (const [a, b] of prog.kanten) {
      if (!L.kasten[b]) f[a]++;
      if (!L.kasten[a]) f[b]++;
    }
    return f;
  }

  /* ------------------------------------------------------------------ Nachbearbeitung */

  const istZirk = (v, prog) => v === FLUR || (v > 0 && prog.raeume[v - 1].halle);
  function hatZugang(g, W, H, kasten, wertR, prog) {
    const [x0, y0, w, h] = kasten;
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      if (g[y * W + x] !== wertR) continue;
      if ((x > 0 && istZirk(g[y * W + x - 1], prog) && g[y * W + x - 1] !== wertR) || (x < W - 1 && istZirk(g[y * W + x + 1], prog) && g[y * W + x + 1] !== wertR) ||
          (y > 0 && istZirk(g[(y - 1) * W + x], prog) && g[(y - 1) * W + x] !== wertR) || (y < H - 1 && istZirk(g[(y + 1) * W + x], prog) && g[(y + 1) * W + x] !== wertR)) return true;
    }
    return false;
  }
  function besitzer(L, i, W) {
    const x = i % W, y = (i - x) / W;
    for (let r = 0; r < L.kasten.length; r++) {
      const k = L.kasten[r];
      if (k && x >= k[0] && x < k[0] + k[2] && y >= k[1] && y < k[1] + k[3]) return r;
    }
    return -1;
  }

  /** Sackgassen entfernen (Remove Dead Ends): Flurzellen mit höchstens einer Erschließungs-Nachbarzelle werden wiederholt dem
      Raum zugeschlagen, der sie mitgebracht hat – solange jeder angrenzende Raum weiter an Flur oder Halle grenzt.
      Liefert ein neues Gitter. */
  function entferneSackgassen(L, W, H, prog) {
    const g = L.gitter.slice();
    let geaendert = true;
    while (geaendert) {
      geaendert = false;
      for (let i = 0; i < W * H; i++) {
        if (g[i] !== FLUR) continue;
        const x = i % W, y = (i - x) / W, nb = [];
        if (x > 0) nb.push(i - 1); if (x < W - 1) nb.push(i + 1); if (y > 0) nb.push(i - W); if (y < H - 1) nb.push(i + W);
        if (nb.filter(j => istZirk(g[j], prog)).length > 1) continue;
        const r = besitzer(L, i, W);
        if (r < 0 || prog.raeume[r].halle) continue;
        g[i] = r + 1;
        const betroffen = new Set([r]);
        for (const j of nb) if (g[j] > 0 && !prog.raeume[g[j] - 1].halle) betroffen.add(g[j] - 1);
        let ok = true;
        for (const q of betroffen) if (!hatZugang(g, W, H, L.kasten[q], q + 1, prog)) { ok = false; break; }
        if (ok) geaendert = true; else g[i] = FLUR;
      }
    }
    return g;
  }

  /** Alle Flure den Räumen zuschlagen (Remove All Corridors). */
  function alleFlureZuRaeumen(L, W, H) {
    const g = L.gitter.slice();
    for (let i = 0; i < W * H; i++) if (g[i] === FLUR) { const r = besitzer(L, i, W); if (r >= 0) g[i] = r + 1; }
    return g;
  }

  function nachbearbeite(L, W, H, prog, modus) {
    if (modus === "sackgassen") return entferneSackgassen(L, W, H, prog);
    if (modus === "alleFlure") return alleFlureZuRaeumen(L, W, H);
    return L.gitter.slice();
  }

  /* ------------------------------------------------------------------ Prüfgrößen */

  /** Ist das Erschließungsnetz (Flur + Hallen) zusammenhängend und grenzt jeder platzierte Raum daran? */
  function erschliessung(g, W, H, L, prog) {
    let start = -1, n = 0;
    for (let i = 0; i < W * H; i++) if (istZirk(g[i], prog)) { n++; if (start < 0) start = i; }
    let erreicht = 0;
    if (start >= 0) {
      const gesehen = new Uint8Array(W * H), s = [start]; gesehen[start] = 1;
      while (s.length) {
        const i = s.pop(); erreicht++;
        const x = i % W, y = (i - x) / W;
        for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1])
          if (j >= 0 && !gesehen[j] && istZirk(g[j], prog)) { gesehen[j] = 1; s.push(j); }
      }
    }
    const ohneZugang = L.folge.filter(r => !prog.raeume[r].halle && !hatZugang(g, W, H, L.kasten[r], r + 1, prog));
    return { zusammenhaengend: erreicht === n, flurZellen: g.reduce((s, v) => s + (v === FLUR ? 1 : 0), 0), ohneZugang };
  }

  /** Feste Anordnung des Nachbarschaftsgraphen ohne Zufall: Stress-Majorisierung über die Schrittzahl im Graphen
      (Gansner, Koren, North 2004), Start auf einem Kreis; danach jede Achse für sich auf [0, 1] gestreckt. */
  const lagen = {};
  function graphLage(schluessel) {
    if (lagen[schluessel]) return lagen[schluessel];
    const P = programm(schluessel), n = P.N;
    const D = P.raeume.map((_, s) => {                         // Schrittzahlen (Breitensuche); getrennte Teile: n
      const d = new Array(n).fill(Infinity), q = [s]; d[s] = 0;
      while (q.length) { const i = q.shift(); for (const j of P.nachbarn[i]) if (d[j] === Infinity) { d[j] = d[i] + 1; q.push(j); } }
      return d.map(v => v === Infinity ? n : v);
    });
    const pos = P.raeume.map((_, i) => [Math.cos(2 * Math.PI * i / n) * n / 4, Math.sin(2 * Math.PI * i / n) * n / 4]);
    for (let it = 0; it < 300; it++) for (let i = 0; i < n; i++) {
      let sx = 0, sy = 0, sw = 0;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const w = 1 / (D[i][j] * D[i][j]), dx = pos[i][0] - pos[j][0], dy = pos[i][1] - pos[j][1], l = Math.hypot(dx, dy) || 1e-6;
        sx += w * (pos[j][0] + D[i][j] * dx / l); sy += w * (pos[j][1] + D[i][j] * dy / l); sw += w;
      }
      pos[i] = [sx / sw, sy / sw];
    }
    const norm = k => { const v = pos.map(q => q[k]), a = Math.min(...v), b = Math.max(...v); return v.map(x => b > a ? (x - a) / (b - a) : 0.5); };
    const X = norm(0), Y = norm(1);
    return (lagen[schluessel] = X.map((x, i) => [x, Y[i]]));
  }

  /* ------------------------------------------------------------------ Ablauf */

  /** Schlüssel für Sperrungen und Eingangspunkt: gelten nur für denselben Umriss. */
  const umrissSchluessel = p => [p.beispiel, p.breite, p.tiefe, p.form].join("|");

  /** Neuer Zustand. p.sperre = {schluessel, zellen: [Index …]}, p.eingangsPunkt = {schluessel, x, y} (von der Maus, optional). */
  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const W = Math.max(4, Math.round(p.breite)), H = Math.max(4, Math.round(p.tiefe)), key = umrissSchluessel(p);
    const gesperrt = p.sperre && p.sperre.schluessel === key ? p.sperre.zellen : [];
    const basis = grundraster(W, H, p.form, gesperrt);
    const B = BEISPIELE[p.beispiel] || BEISPIELE.horn;
    let ex, ey;
    if (p.eingangsPunkt && p.eingangsPunkt.schluessel === key) { ex = p.eingangsPunkt.x; ey = p.eingangsPunkt.y; }
    else { ex = Math.round(B.eingang[0] * (W - 1) / (B.b - 1)); ey = Math.round(B.eingang[1] * (H - 1) / (B.h - 1)); }
    const start = naechsteFreie(basis, W, H, ex, ey);
    const z = { t: 0, zufall, W, H, b: W, h: H, basis, start, eingangsPunkt: [ex, ey], prog: programm(p.beispiel), beispiel: p.beispiel,
      it: 0, slot: 0, best: [], lauf: null, letzte: null, fertig: false, bewertet: 0, verbessert: 0, verlauf: [], schluessel: key };
    z.lage = graphLage(p.beispiel);
    return z;
  }

  /** Beginnt die nächste Lösung: neu oder (jede dritte Iteration) Verbesserung einer der besten. */
  function beginne(z, p) {
    if (z.it > 0 && z.it % NEU_HAEUFIGKEIT === 0 && z.slot < z.best.length) {
      const L = kopie(z.best[z.slot], "verbessern", z.slot);
      L.entfernt = entferneLetzte(L, z.W, 1 + Math.floor(z.zufall() * 5));
      z.lauf = L;
    } else z.lauf = leereLoesung(z, "neu", z.slot);
  }

  /** Lösung abschließen: bewerten, in die Bestenliste aufnehmen bzw. die verbesserte ersetzen, weiterzählen. */
  function schliesse(z, p) {
    const L = z.lauf;
    L.wert = wert(L, z.prog, p.bewertung);
    z.bewertet++;
    if (L.art === "verbessern") {
      if (besser(L.wert, z.best[L.slot].wert)) { z.best[L.slot] = L; z.verbessert++; }
    } else z.best.push(L);
    z.letzte = L; z.lauf = null;
    if (++z.slot >= KAPAZITAET) {
      z.slot = 0; z.it++;
      z.best.sort((a, b) => besser(a.wert, b.wert) ? -1 : besser(b.wert, a.wert) ? 1 : 0);
      z.best.length = Math.min(z.best.length, KAPAZITAET);
      z.verlauf.push(z.best[0].wert[0]);
      if (z.it >= p.iterationen) { z.fertig = true; z.ergebnis = null; }
    }
  }

  /** Ein platzierter Raum (bzw. ein Fehlversuch, der die Lösung beendet). */
  function raumSchritt(z, p) {
    if (z.fertig) return;
    if (!z.lauf) beginne(z, p);
    const L = z.lauf, r = naechsterRaum(z.prog, L, z.zufall);
    let ok = false;
    if (r >= 0 && z.start >= 0) ok = platziere(L, z.W, z.H, z.prog, r, p, z.zufall);
    if (ok) {
      L.folge.push(r); L.zuletzt = r;
      if (L.folge.length === 1 && L.gitter[z.start] === FLUR) L.gitter[z.start] = FREI;   // Startzelle wieder frei (wie im Plugin)
    }
    if (!ok || L.folge.length === z.prog.N) schliesse(z, p);
  }

  /** Ein Schritt: ein platzierter Raum (Ablauf „raum“) oder eine ganze Iteration mit fünf Lösungen (Ablauf „iteration“). */
  function schritt(z, param) {
    const p = Object.assign({}, STANDARD, param);
    z.t++;
    if (p.ablauf === "iteration") {
      const it = z.it;
      while (!z.fertig && z.it === it) raumSchritt(z, p);
    } else raumSchritt(z, p);
    return z;
  }

  /** Gezeigte Lösung: während des Laufs die gerade entstehende, am Ende die beste mit Nachbearbeitung. */
  function anzeige(z, param) {
    const p = Object.assign({}, STANDARD, param);
    if (z.fertig && z.best.length) {
      if (!z.ergebnis || z.ergebnis.modus !== p.nachbearbeitung)
        z.ergebnis = { modus: p.nachbearbeitung, gitter: nachbearbeite(z.best[0], z.W, z.H, z.prog, p.nachbearbeitung) };
      return { L: z.best[0], gitter: z.ergebnis.gitter, endgueltig: true };
    }
    const L = z.lauf || z.letzte;
    if (!L) return { L: leereLoesung(z, "neu", 0), gitter: null, endgueltig: false };
    return { L, gitter: L.gitter, endgueltig: false };
  }

  /** Parameter ohne Neustart: Nachbearbeitung und Ablauf wirken sofort. */
  function aendere(z, param, id) {
    const p = Object.assign({}, STANDARD, param);
    if (id === "nachbearbeitung") z.ergebnis = null;
    if (id === "iterationen") {
      if (z.it < p.iterationen) z.fertig = false;                     // mehr Iterationen: weiterrechnen
      else if (!z.lauf && z.slot === 0 && z.best.length) { z.fertig = true; z.ergebnis = null; }
    }
  }

  /* ------------------------------------------------------------------ Maus */

  /** Zelle sperren oder freigeben (Umriss ändern); phase "unten" legt fest, ob gesperrt oder freigegeben wird. Startet neu. */
  function malen(z, p, x, y, phase) {
    const cx = Math.floor(x), cy = Math.floor(y);
    if (cx < 0 || cy < 0 || cx >= z.W || cy >= z.H) return false;
    const key = umrissSchluessel(p);
    if (!p.sperre || p.sperre.schluessel !== key) p.sperre = { schluessel: key, zellen: [] };
    const i = cy * z.W + cx, set = new Set(p.sperre.zellen);
    if (phase === "unten") z.malModus = set.has(i) ? "frei" : "sperren";
    if (z.malModus === "frei") { if (!set.has(i)) return false; set.delete(i); }
    else { if (set.has(i)) return false; set.add(i); }
    p.sperre.zellen = [...set];
    neuAufbau(z, p);
    return true;
  }

  /** Eingangspunkt setzen (Rechtsklick); startet neu. */
  function setzeEingang(z, p, x, y) {
    const cx = Math.floor(x), cy = Math.floor(y);
    if (cx < 0 || cy < 0 || cx >= z.W || cy >= z.H) return false;
    p.eingangsPunkt = { schluessel: umrissSchluessel(p), x: cx, y: cy };
    neuAufbau(z, p);
    return true;
  }

  /** Alle Sperrungen aufheben; startet neu. */
  function sperrenLoeschen(z, p) { p.sperre = null; neuAufbau(z, p); }

  /** Zustand mit gleichem Zufallsstrom neu aufbauen (nach Mausänderungen). */
  function neuAufbau(z, p) {
    const n = erzeuge(p, z.zufall), modus = z.malModus;
    for (const k of Object.keys(z)) delete z[k];
    Object.assign(z, n); z.malModus = modus;
  }

  return {
    FREI, FLUR, AUSSEN, KAPAZITAET, NEU_HAEUFIGKEIT, BEISPIELE, STANDARD,
    programm, grundraster, naechsteFreie, abmessungen, schablone, flurAbstand, andockzellen, tabellen, bewerteLage, kastenVon,
    platziere, naechsterRaum, leereLoesung, entferneLetzte, wert, besser, fehlendeNachbarn, entferneSackgassen, alleFlureZuRaeumen,
    nachbearbeite, erschliessung, hatZugang, graphLage, erzeuge, schritt, raumSchritt, anzeige, aendere, malen, setzeEingang, sperrenLoeschen
  };
});
