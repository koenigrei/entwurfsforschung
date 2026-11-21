/* Verteilung verschiedener Flächennutzungen · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung von 422_Flaechenverteilung (Delphi „Settlement Patterns“ 5.0, Oktober 2006, Reinhard König), Kapitel 4.2.2
   der Dissertation „Dynamische Simulation und Visualisierung räumlicher Prozesse“ (2008), nach M. Batty (2005).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Drei Potentialfelder (Wohnen, Dienstleistung, Industrie) auf 202 × 202 Zellen. Je Schritt (CellForm.pas, calculate):
     1. diffuse: P ← P + μ · (Mittel der 8 Nachbarn) + ε · Zufall, dann jedes Feld auf 0…10 skaliert (rescalePot).
     2. Bis 2400 Agenten: je Schritt 3 Wohnstandorte, 1 Dienstleistung, 1 Industrie auf der freien Zelle mit dem höchsten
        Potential ihres Feldes (maxPotPlace); jede neue Nutzung erhöht die Felder um ihre Gewichte (setOrigins, setNewDestinations).
     3. Jeder Wohnstandort ist Ausgangsort eines Agenten, der Ressourcen (Ziele, Dienstleistung, Industrie) sucht, mit
        Wahrscheinlichkeit 0,1 zugreift und heimkehrt; Heimwege markieren Spuren, denen andere folgen (calcAgents, checkArea).
     4. Optional Migration: Ausgangsort an einen belebten Ort verlegen (migrationTest). Alle 100 Schritte Rang-Größen-Analyse. */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const ZELLE = 2, S = 202, N = S * S;      // cellScal 2 im 404 × 404 großen ZeichenPanel
  const LEER = 0, HINDERNIS = 1, WOHNEN = 2, ZIEL = 3, DIENST = 4, INDUSTRIE = 5;
  const KACHEL = 20;                         // UpD_tileSz: Kachelgröße der Rang-Größen-Analyse

  /** Voreinstellungen wie im Original (CellForm.dfm, setupGrid) */
  const STANDARD = {
    agenten: 2400, jeSchrittWohnen: 3, jeSchrittDienst: 1, jeSchrittIndustrie: 1, stopp: 800,
    diffW: 1, diffD: 1, diffI: 1,                      // Diffusionskoeffizienten μ
    wWW: 1.0, wWD: 0.5, wWI: 0.0,                      // Gewichte im Wohnfeld für Wohnen, Dienstleistung, Industrie
    wDW: 0.5, wDD: 1.0, wDI: 0.0,                      // … im Dienstleistungsfeld
    wIW: 0.5, wID: 0.0, wII: 1.0,                      // … im Industriefeld
    rauschW: 6.0, rauschD: 5.0, rauschI: 4.8,          // noise ε
    horizont: 22, wackeln: 20, rauschen: 30, zugriff: 0.1, heimweg: "spuren", wahl: "berg",
    migration: false, migSchwelle: 2, verfall: false, verfallsrate: 0.99,
    anzeige: "nutzungen", agentenZeigen: false
  };
  const FELD = ["W", "D", "I"];
  /** Gewicht der Nutzung u (0 Wohnen, 1 Dienstleistung, 2 Industrie) im Feld f */
  const gewicht = (p, f, u) => p["w" + FELD[f] + FELD[u]];

  // Moore-Nachbarn mit Torus (checkNei, torus)
  const NB = new Int32Array(N * 8);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let q = 0;
    for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++) { if (!u && !v) continue; NB[(y * S + x) * 8 + q++] = ((y + v + S) % S) * S + (x + u + S) % S; }
  }
  const torus = v => (v + S) % S;
  const winkelGrenze = a => a < 0 ? a + 360 : a > 360 ? a - 360 : a;   // angelBorder (nur ein Umlauf)
  /** Delphis random(n + 1) · (random(2) · 2 − 1): ganze Zahl in −n…n */
  const pm = (z, n) => z.zufall.ganz(n + 1) * (z.zufall.ganz(2) * 2 - 1);
  const RICHTUNG = [null, [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0]];   // Sektoren 1…8 (checkArea)
  /** Sektor eines Winkels: 0–45 → 1, 46–90 → 2 … 316–360 → 8 */
  function sektor(a) { const r = Math.round(a); return r <= 45 ? 1 : r <= 90 ? 2 : r <= 135 ? 3 : r <= 180 ? 4 : r <= 225 ? 5 : r <= 270 ? 6 : r <= 315 ? 7 : 8; }
  /** Nachbarzellen im Blickfeld Richtung ± Horizont (checkArea): Liste von [dx, dy] */
  function blickfeld(richtung, horizont) {
    const von = sektor(winkelGrenze(richtung - horizont - 22.5)), bis = sektor(winkelGrenze(richtung + horizont - 22.5));
    const L = []; let k = von - 1;
    do { k++; if (k > 8) k = 1; L.push(RICHTUNG[k]); } while (k !== bis);
    return L;
  }

  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const z = { t: 0, zufall, spalten: S, zeilen: S, zelle: ZELLE, breite: S * ZELLE, hoehe: S * ZELLE,
                pot: [new Float64Array(N), new Float64Array(N), new Float64Array(N)], tmp: new Float64Array(N),
                zustand: new Int8Array(N), ziel: new Int8Array(N).fill(-1), besetzt: new Int16Array(N),
                markA: new Float64Array(N), markB: new Float64Array(N), ag: [], ziele: [],
                verlauf: [], rangGroesse: null, anzahl: [0, 0, 0, 0, 0, 0] };
    for (let m = 0; m < 10; m++) {                                  // setDestinations: 10 Ziele aus je 3 × 3 Zellen
      const px = zufall.ganz(S), py = zufall.ganz(S);
      z.ziele.push({ x: px, y: py, zahl: 0 });
      for (let i = -1; i <= 1; i++) for (let k = -1; k <= 1; k++) {
        const c = torus(py + i) * S + torus(px + k);
        z.zustand[c] = ZIEL; z.ziel[c] = m; z.pot[2][c] += 1;
      }
    }
    zaehle(z);
    return z;
  }

  /** freie Zelle mit dem höchsten Potential im Feld f (maxPotPlace; Zeilenfolge, erster Treffer, Start bei 0) */
  function bestePlatz(z, f) {
    let max = 0, best = 0; const P = z.pot[f];
    for (let c = 0; c < N; c++) if (P[c] > max && z.zustand[c] === LEER) { max = P[c]; best = c; }
    return best;
  }

  /** neue Nutzung u auf Zelle c: Zustand setzen, alle drei Felder um die Gewichte erhöhen */
  function platziere(z, p, c, u) {
    z.zustand[c] = [WOHNEN, DIENST, INDUSTRIE][u];
    for (let f = 0; f < 3; f++) z.pot[f][c] += gewicht(p, f, u);
  }

  /** CreateAgents + setNewDestinations */
  function neueNutzungen(z, p) {
    for (let l = 0; l < p.jeSchrittWohnen; l++) {
      const c = bestePlatz(z, 0);
      z.besetzt[c]++;
      z.ag.push({ x: c % S, y: (c / S) | 0, hx: c % S, hy: (c / S) | 0, dx: 0, dy: 0, richtung: z.zufall.ganz(360),
                  modus: 0, erfolg: 0, migriert: 0, reise: 0, ziel: 0 });
      platziere(z, p, c, 0);
    }
    for (let l = 0; l < p.jeSchrittDienst; l++) platziere(z, p, bestePlatz(z, 1), 1);
    for (let l = 0; l < p.jeSchrittIndustrie; l++) platziere(z, p, bestePlatz(z, 2), 2);
  }

  /** diffuse: P ← P + μ · Mittel der 8 Nachbarn + Zufall · ε (eine Zufallszahl je Zelle für alle drei Felder) */
  function diffundiere(z, p) {
    const mu = [p.diffW, p.diffD, p.diffI], eps = [p.rauschW, p.rauschD, p.rauschI];
    const r = new Float64Array(N); for (let c = 0; c < N; c++) r[c] = z.zufall();
    for (let f = 0; f < 3; f++) {
      const P = z.pot[f], T = z.tmp;
      for (let c = 0; c < N; c++) { let s = 0; const o = c * 8; for (let q = 0; q < 8; q++) s += P[NB[o + q]]; T[c] = s / 8; }
      for (let c = 0; c < N; c++) P[c] += mu[f] * T[c] + r[c] * eps[f];
    }
  }

  /** rescalePot: jedes Feld auf 0…10 */
  function skaliere(z) {
    for (const P of z.pot) {
      let max = 0.00000001, min = 9999999999;
      for (let c = 0; c < N; c++) { if (P[c] > max) max = P[c]; if (P[c] < min) min = P[c]; }
      const k = 10 / (max - min);
      for (let c = 0; c < N; c++) P[c] = (P[c] - min) * k;
    }
  }

  /** Bewegung eines Agenten (calcAgents mit checkArea und TAgent.ChangeHeading) */
  function bewege(z, p, a) {
    if (a.modus === 1) a.richtung = Math.round(Math.atan2(a.hy - a.y, a.hx - a.x) * 180 / Math.PI);
    // checkArea: Gewichte aus den Heimwegspuren (markB) der Zellen im Blickfeld, mit kleinem Rauschen
    const L = blickfeld(a.richtung, p.horizont), w = [];
    let summe = 0;
    for (const [dx, dy] of L) { const v = z.markB[torus(a.y + dy) * S + torus(a.x + dx)] + 0.1 * (z.zufall() - 0.5); w.push(v); summe += v; }
    const gew = w.map(v => v / summe * 100);
    const folgeSpur = () => {                                        // rouletteWheel bzw. hillClimbing
      let k = -1;
      if (p.wahl === "roulette") { const r = z.zufall.ganz(100); let s = 0, m = 0; do { s += gew[m]; k = m; m++; } while (s < r && m < gew.length); }
      else { let max = 0; gew.forEach((g, m) => { if (g > max) { max = g; k = m; } }); }
      if (k >= 0) { a.dx = L[k][0]; a.dy = L[k][1]; }                 // (im Original sonst undefiniert: hier bleibt der letzte Schritt)
      a.richtung = Math.round(Math.atan2(a.dy, a.dx) * 180 / Math.PI) + pm(z, p.wackeln);
    };
    const geradeaus = n => { a.richtung += pm(z, n); const r = a.richtung * Math.PI / 180; a.dx = Math.round(Math.cos(r)); a.dy = Math.round(Math.sin(r)); };
    if (a.modus === 1) { if (p.heimweg === "spuren" && summe > 0) folgeSpur(); else geradeaus(p.rauschen); }
    else if (summe > 0) folgeSpur(); else geradeaus(p.horizont);    // randomWalk(wiggle, degree = Horizont)
    a.richtung = winkelGrenze(a.richtung);
    // Schritt ausführen
    const nx = torus(a.x + a.dx), ny = torus(a.y + a.dy), von = a.y * S + a.x, nach = ny * S + nx;
    a.reise++;
    if (a.modus === 1) z.markB[von] += 10;                           // Heimweg markieren
    if (a.modus === 1 && a.x === a.hx && a.y === a.hy) {             // zu Hause angekommen
      a.modus = 0; a.erfolg = 1; a.richtung += 180; z.ziele[a.ziel] && z.ziele[a.ziel].zahl++; a.reise = 0;
    }
    if (z.zustand[nach] >= ZIEL && a.modus === 0 && p.zugriff >= z.zufall()) { a.modus = 1; a.ziel = z.ziel[nach]; }
    if (z.zustand[nach] !== HINDERNIS) {
      z.markA[von] += 1; a.x = nx; a.y = ny; z.besetzt[von]--; z.besetzt[nach]++;
    } else a.richtung = winkelGrenze(a.richtung + z.zufall.ganz(360));
    if (!a.migriert && p.migration) migriere(z, a, p);
  }

  /** migrationTest: genug andere Agenten in der Moore-Nachbarschaft und freie Zelle → Ausgangsort hierher verlegen (einmal je Agent) */
  function migriere(z, a, p) {
    const c = a.y * S + a.x; let s = z.besetzt[c];
    for (let q = 0; q < 8; q++) s += z.besetzt[NB[c * 8 + q]];
    if (s - 1 >= p.migSchwelle && z.zustand[c] === LEER) {
      const alt = a.hy * S + a.hx, st = z.zustand[alt];
      z.zustand[alt] = LEER;
      if (st >= WOHNEN && st !== ZIEL) { const f = st === WOHNEN ? 0 : st - 3; z.pot[f][alt] = z.pot[f][alt] > 1 ? z.pot[f][alt] - 1 : 0; }
      a.hx = a.x; a.hy = a.y; a.migriert = 1;
      z.zustand[c] = st; z.pot[0][c] += 1;
    }
  }

  /** rescaleMarks: Spuren je Schritt auf 0…255 (ohne Verfall) */
  function skaliereSpuren(z) {
    let maxA = 0.1, minA = 99999999999, maxB = 0.1, minB = 99999999999;
    for (let c = 0; c < N; c++) { const a = z.markA[c], b = z.markB[c]; if (a > maxA) maxA = a; if (a < minA) minA = a; if (b > maxB) maxB = b; if (b < minB) minB = b; }
    const kA = 255 / (maxA - minA), kB = 255 / (maxB - minB);
    for (let c = 0; c < N; c++) { if (z.markB[c] > 0) z.markB[c] = (z.markB[c] - minB) * kB; z.markA[c] = (z.markA[c] - minA) * kA; }
  }

  /** Rang-Größen-Analyse (rankSize): bebaute Zellen (Zustand > 1, ohne Ziele) je Kachel, absteigend; Regression log–log */
  function rangGroesse(z, kachel = KACHEL) {
    const n = Math.floor(S / kachel), werte = [];
    for (let ty = 0; ty < n; ty++) for (let tx = 0; tx < n; tx++) {
      let c = 0;
      for (let y = ty * kachel; y < (ty + 1) * kachel; y++) for (let x = tx * kachel; x < (tx + 1) * kachel; x++) { const s = z.zustand[y * S + x]; if (s > 1 && s !== ZIEL) c++; }
      werte.push(c);
    }
    werte.sort((a, b) => b - a);
    const pkt = []; werte.forEach((v, i) => { if (v > 1) pkt.push([Math.log10(i + 1), Math.log10(v)]); });
    let steigung = NaN, achse = NaN, r2 = NaN;
    if (pkt.length >= 2) {
      const m = pkt.length, sx = pkt.reduce((s, q) => s + q[0], 0), sy = pkt.reduce((s, q) => s + q[1], 0);
      const sxx = pkt.reduce((s, q) => s + q[0] * q[0], 0), sxy = pkt.reduce((s, q) => s + q[0] * q[1], 0), syy = pkt.reduce((s, q) => s + q[1] * q[1], 0);
      steigung = (m * sxy - sx * sy) / (m * sxx - sx * sx); achse = (sy - steigung * sx) / m;
      const r = (m * sxy - sx * sy) / Math.sqrt((m * sxx - sx * sx) * (m * syy - sy * sy)); r2 = r * r;
    }
    return { werte, pkt, steigung, achse, r2 };
  }

  function zaehle(z) { const a = [0, 0, 0, 0, 0, 0]; for (let c = 0; c < N; c++) a[z.zustand[c]]++; z.anzahl = a; }

  function schritt(z, param) {
    const p = Object.assign({}, STANDARD, param);                  // nicht jede Einstellung hat einen Regler (z. B. μ, Nutzungen je Schritt)
    if (z.t >= p.stopp) { z.t++; return z; }                         // nach der Stoppzeit ruht das Modell (Timer aus)
    diffundiere(z, p);
    if (z.ag.length < p.agenten) neueNutzungen(z, p);
    skaliere(z);
    for (const a of z.ag) bewege(z, p, a);
    if (p.verfall) for (let c = 0; c < N; c++) { z.markA[c] *= p.verfallsrate; z.markB[c] *= p.verfallsrate; }
    else skaliereSpuren(z);
    z.t++;
    // calcGraph: erfolgreiche Agenten, mittlere Reisezeit, Migrierte, Heimkehrende
    let erf = 0, reise = 0, mig = 0, heim = 0; const n = z.ag.length || 1;
    for (const a of z.ag) { erf += a.erfolg; reise += a.reise; mig += a.migriert; heim += a.modus; }
    z.verlauf.push([100 * erf / n, reise / n, 100 * mig / n, 100 * heim / n]);
    if (z.t % 100 === 0) z.rangGroesse = rangGroesse(z);
    zaehle(z);
    return z;
  }

  /** Hindernis zeichnen (markCell, linke Maustaste: 3 × 3 Zellen) bzw. entfernen */
  function hindernis(z, x, y, setzen) {
    const cx = Math.round(x / ZELLE), cy = Math.round(y / ZELLE);
    for (let i = -1; i <= 1; i++) for (let k = -1; k <= 1; k++) {
      const c = torus(cy + i) * S + torus(cx + k);
      if (setzen && z.zustand[c] === LEER) z.zustand[c] = HINDERNIS;
      if (!setzen && z.zustand[c] === HINDERNIS) z.zustand[c] = LEER;
    }
  }

  function aendere() {}

  return { STANDARD, ZELLE, S, N, LEER, HINDERNIS, WOHNEN, ZIEL, DIENST, INDUSTRIE, KACHEL, gewicht, sektor, blickfeld,
           erzeuge, schritt, aendere, bestePlatz, platziere, diffundiere, skaliere, bewege, rangGroesse, hindernis };
});
