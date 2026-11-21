/* nodeGarden – Interaktion von Nodes · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung des AutoCAD-VBA-Makros „nodeGarden“ (Sub traffic, run, ball; spätestens 2004, Reinhard König).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Regeln (VBA-Text auf der Seite 05nodeGarden.htm):
   - amount = 10 Kugeln (nodes) mit Radius 1 an zufälligen Punkten random(10, 100) = (100 − 10 + 1) · Rnd + 10, z = 0,
     jede mit eigenem Bewegungsvektor loser(i) = ((Rnd · 10 − 5) / 2, (Rnd · 10 − 5) / 2).
   - Ein Durchlauf (For i = 1 To 10): für jede Kugel u nacheinander werden alle späteren Kugeln j > u verglichen.
     Ist der Abstand kleiner als maxDist = 30, ändern beide ihren Vektor und bremsen:
       loser(u) = (loser(u) − d · 0,01) · bremse,  loser(j) = (loser(j) + d · 0,01) · bremse,  d = Mitte(u) − Mitte(j), bremse = 0,98
     – die beiden ziehen sich also an und werden langsamer. Danach bewegt sich u um loser(u) (Sub run);
     wer den Rahmen 10 … 100 verlässt, springt an die Gegenseite. Die Farbe einer Kugel ist ihre Nummer (AutoCAD-Farbindex). */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const UNIMIN = 10, UNIMAX = 100;   // Const unimin, unimax
  const SPUR = 160;                  // Länge der Spur in Schritten (nur Darstellung)

  /** Voreinstellungen wie im Original (Konstanten im VBA-Text) */
  const STANDARD = {
    amount: 10,       // amount = 10 'howmany() – Eingabe „How many balls“, Vorgabe 10
    maxDist: 30,      // Const maxDist = 30
    bremse: 0.98,     // bremse = 0.98
    zug: 0.01,        // dx * 0.01
    spuren: true,     // Darstellung (neu): Bewegungsbahnen zeigen
    paare: false      // Darstellung (neu): Paare im Abstand < maxDist verbinden
  };

  /** Function random(bn, tn) = (tn − bn + 1) · Rnd + bn */
  const random = (zufall, bn, tn) => (tn - bn + 1) * zufall() + bn;

  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const n = Math.max(1, Math.round(p.amount));
    const z = { t: 0, zufall, n, x: new Float64Array(n), y: new Float64Array(n), vx: new Float64Array(n), vy: new Float64Array(n),
                spur: new Float32Array(n * SPUR * 2), spurLaenge: 0, spurKopf: 0 };
    for (let i = 0; i < n; i++) {
      z.vx[i] = (zufall() * 10 - 5) / 2;          // moveKoord(0) = (Rnd() * 10 - 5) / 2
      z.vy[i] = (zufall() * 10 - 5) / 2;
      z.x[i] = random(zufall, UNIMIN, UNIMAX);     // cp(j) = random(unimin, unimax)
      z.y[i] = random(zufall, UNIMIN, UNIMAX);
    }
    merkeSpur(z);
    return z;
  }

  /** Sub run: Mitte + Vektor, Rahmen: > unimax → unimin, < unimin → unimax */
  function bewege(z, u) {
    let x = z.x[u] + z.vx[u], y = z.y[u] + z.vy[u];
    if (x > UNIMAX) x = UNIMIN;
    if (x < UNIMIN) x = UNIMAX;
    if (y > UNIMAX) y = UNIMIN;
    if (y < UNIMIN) y = UNIMAX;
    z.x[u] = x; z.y[u] = y;
  }

  /** Vergleich zweier Kugeln (innere Schleife For j = u + 1): Anziehung und Bremsen bei Abstand < maxDist.
      ax, ay: Mitte von u, gelesen vor der Schleife (nodeA = dude.Centroid). Liefert true, wenn sie wechselwirken. */
  function vergleiche(z, u, j, ax, ay, p) {
    const dx = ax - z.x[j], dy = ay - z.y[j];
    if (!(Math.sqrt(dx * dx + dy * dy) < p.maxDist)) return false;
    z.vx[u] = (z.vx[u] - dx * p.zug) * p.bremse;
    z.vy[u] = (z.vy[u] - dy * p.zug) * p.bremse;
    z.vx[j] = (z.vx[j] + dx * p.zug) * p.bremse;
    z.vy[j] = (z.vy[j] + dy * p.zug) * p.bremse;
    return true;
  }

  function merkeSpur(z) {
    const k = z.spurKopf, n = z.n;
    for (let i = 0; i < n; i++) { z.spur[(k * n + i) * 2] = z.x[i]; z.spur[(k * n + i) * 2 + 1] = z.y[i]; }
    z.spurKopf = (k + 1) % SPUR; z.spurLaenge = Math.min(SPUR, z.spurLaenge + 1);
  }
  /** Punkt der Spur: Kugel i, a Schritte zurück (0 = jetzt) */
  function spurPunkt(z, i, a) { const k = ((z.spurKopf - 1 - a) % SPUR + SPUR) % SPUR; return [z.spur[(k * z.n + i) * 2], z.spur[(k * z.n + i) * 2 + 1]]; }

  /** Ein Durchlauf der äußeren Schleife (For i = 1 To 10 im Original) */
  function schritt(z, param) {
    const p = Object.assign({}, STANDARD, param);
    for (let u = 0; u < z.n; u++) {
      const ax = z.x[u], ay = z.y[u];
      for (let j = u + 1; j < z.n; j++) vergleiche(z, u, j, ax, ay, p);
      bewege(z, u);
    }
    merkeSpur(z);
    z.t++;
    return z;
  }

  /** Kennzahlen: mittlere Geschwindigkeit, Gruppen (Kugeln mit Abstand < r verbunden, Standard 5 Einheiten), größte Gruppe */
  function tempo(z) { let s = 0; for (let i = 0; i < z.n; i++) s += Math.hypot(z.vx[i], z.vy[i]); return s / z.n; }
  function gruppen(z, r = 5) {
    const teil = Int32Array.from({ length: z.n }, (_, i) => i);
    const wurzel = i => { while (teil[i] !== i) i = teil[i] = teil[teil[i]]; return i; };
    for (let i = 0; i < z.n; i++) for (let j = i + 1; j < z.n; j++)
      if (Math.hypot(z.x[i] - z.x[j], z.y[i] - z.y[j]) < r) teil[wurzel(i)] = wurzel(j);
    const groesse = new Map();
    for (let i = 0; i < z.n; i++) { const w = wurzel(i); groesse.set(w, (groesse.get(w) || 0) + 1); }
    let mehr = 0, max = 0; for (const g of groesse.values()) { if (g > 1) mehr++; if (g > max) max = g; }
    return { zahl: groesse.size, gruppen: mehr, groesste: max };
  }

  return { STANDARD, UNIMIN, UNIMAX, SPUR, random, erzeuge, bewege, vergleiche, schritt, spurPunkt, tempo, gruppen };
});
