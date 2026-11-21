/* Überlagerungsflächen · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung von 05_rechtClipping (Delphi, Reinhard König, 15.05.2005) mit der Fassung 04_rechtClipping
   (Cohen-Sutherland-Clipcodes, vom selben Tag).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Regeln (main.pas):
   - Button_createRechtClick: je Klick entstehen „numbers“ Rechtecke. Mittelpunkt (random(410), random(394)),
     Ecken Mittelpunkt − 10 − random(50) und Mittelpunkt + 10 + random(50) – jede Seite mit eigenem Zufall.
   - 05 schneideRecht: jedes Paar I < K wird mit IntersectRect geschnitten; jede nicht leere Schnittfläche ist ein
     blaues Überlagerungsrechteck. sumAreas addiert (Höhe · Breite) aller Überlagerungsrechtecke.
   - 04 checkOverlap: dasselbe Paar über die Clipcodes der vier Ecken von B relativ zu A (Bits: unten 8, oben 4,
     rechts 2, links 1), Fallunterscheidung je Kante (a: beide innen, b: beide außen auf derselben Seite,
     c: Kante schneidet A), Schnittpunkte mit Schnittpunkt(), danach Sortieren im Uhrzeigersinn.
   Ein Schritt = ein geprüftes Paar; sind alle Paare geprüft, erzeugt der nächste Schritt neue Rechtecke (wie ein
   weiterer Klick auf „Rechtecke erstellen“). */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const BREITE = 410, HOEHE = 394;          // ImagePaint 410 × 394 (main.dfm)

  /** Voreinstellungen wie im Original: ScrollBar_Numbers Min 1, Max 50, Position 10 */
  const STANDARD = { fassung: "05", numbers: 10, zeigen: true, codes: true };

  /* ------------------------------------------------------------------ Rechtecke */

  /** Ein Rechteck wie Button_createRechtClick: Mittelpunkt, dann links, oben, rechts, unten (Reihenfolge der Zufallszahlen).
      px, py vorgegeben (Mausklick): nur die Ausdehnung ist zufällig. */
  function neuesRechteck(zufall, px, py) {
    if (px == null) { px = zufall.ganz(BREITE); py = zufall.ganz(HOEHE); }
    const x1 = px - 10 - zufall.ganz(50), y1 = py - 10 - zufall.ganz(50);
    const x2 = px + 10 + zufall.ganz(50), y2 = py + 10 + zufall.ganz(50);
    return { px, py, x1, y1, x2, y2 };
  }

  /** Eckpunkte wie TBaseRecht.SetKoordinates: 0 links oben, 1 rechts oben, 2 rechts unten, 3 links unten */
  const ecken = r => [[r.x1, r.y1], [r.x2, r.y1], [r.x2, r.y2], [r.x1, r.y2]];

  /** Fläche wie sumAreas: (Points[3,1] − Points[0,1]) · (Points[1,0] − Points[0,0]) */
  const flaeche = r => (r.y2 - r.y1) * (r.x2 - r.x1);

  /* ------------------------------------------------------------------ 05: IntersectRect */

  /** Windows-IntersectRect: Schnittrechteck oder null, wenn es leer ist (auch bei bloßer Berührung) */
  function intersectRect(a, b) {
    const x1 = Math.max(a.x1, b.x1), y1 = Math.max(a.y1, b.y1), x2 = Math.min(a.x2, b.x2), y2 = Math.min(a.y2, b.y2);
    return x2 > x1 && y2 > y1 ? { x1, y1, x2, y2 } : null;
  }

  /* ------------------------------------------------------------------ 04: Cohen-Sutherland-Clipcodes */

  /** Clipcode eines Punkts relativ zu A: Bit 8 y > ymax (unten), 4 y < ymin (oben), 2 x > xmax (rechts), 1 x < xmin (links).
      Im Original ein Text '0000' mit den Stellen 1–4; BinToInt macht daraus diese Zahl. */
  function clipCode(a, x, y) {
    return (y > a.y2 ? 8 : 0) | (y < a.y1 ? 4 : 0) | (x > a.x2 ? 2 : 0) | (x < a.x1 ? 1 : 0);
  }
  /** Code als vierstelliger Binärtext wie im Original (IntToBin) */
  const binaer = c => [8, 4, 2, 1].map(b => (c & b ? "1" : "0")).join("");

  /** Schnittpunkt(): nur für rechte Winkel – Achse a1–a2 senkrecht → (a1x, b1y), Kante b1–b2 senkrecht → (b1x, a1y), sonst nichts */
  function schnittpunkt(a1, a2, b1, b2) {
    if (a2[0] - a1[0] === 0) return [a1[0], b1[1]];
    if (b2[0] - b1[0] === 0) return [b1[0], a1[1]];
    return null;                                  // beide waagerecht: das Original lässt lapKoord unverändert
  }

  /** Sortieren im Uhrzeigersinn wie in checkOverlap (tempKoord wird schrittweise ersetzt) */
  function sortiere(lap) {
    const t = lap.map(q => q.slice());
    for (let n = 0; n < 4; n++) {
      const x = lap[n][0], y = lap[n][1];
      if (x <= t[0][0] && y <= t[0][1]) t[0] = [x, y];
      if (x >= t[1][0] && y <= t[1][1]) t[1] = [x, y];
      if (x >= t[2][0] && y >= t[2][1]) t[2] = [x, y];
      if (x <= t[3][0] && y >= t[3][1]) t[3] = [x, y];
    }
    for (let n = 0; n < 4; n++) lap[n] = t[n];
  }

  /** checkOverlap für ein Paar (A = Basis-Rechteck I, B = Vergleichs-Clipping-Rechteck K).
      lap = lapKoord (4 × 2): wird wie im Original verändert und behält Werte aus früheren Paaren (nicht neu belegt).
      Ergebnis: { codes, lapped, punkte, rechtecke } – rechtecke: die neuen Überlagerungsrechtecke (0 oder 1). */
  function cohenSutherland(a, b, lap) {
    const A = ecken(a), B = ecken(b), c = B.map(q => clipCode(a, q[0], q[1]));
    let lapped = false;
    for (let u = 0; u < 4; u++) {                 // Prüfen, ob sich die Rechtecke überlagern
      const p0 = c[u], p1 = c[(u + 1) % 4];
      if (p0 === 0 || (p0 | p1) === 3 || (p0 | p1) === 12) lapped = true;
    }
    const rechtecke = [];
    if ((c[0] | c[1] | c[2] | c[3]) === 15) {     // Fall 0: B überdeckt A vollständig → Kopie von A
      for (let u = 0; u < 4; u++) lap[u] = A[u].slice();
      rechtecke.push({ x1: lap[0][0], y1: lap[0][1], x2: lap[2][0], y2: lap[2][1] });
    }
    let nr = 0;
    const setze = q => { if (q && nr < 4) lap[nr] = q.slice(); nr++; };   // über Index 3 hinaus: verworfen (im Original Speicherüberlauf)
    if (lapped) for (let u = 0; u < 4; u++) {
      const v = (u + 1) % 4, p0 = c[u], p1 = c[v];
      if ((p0 | p1) === 0) setze(B[u]);                                     // Fall a: beide Punkte innen
      else if ((p0 & p1) !== 0) {                                           // Fall b: beide außen auf derselben Seite
        if (c[v] === 5) setze(A[0]); else if (c[v] === 6) setze(A[1]);      // '0101' links oben, '0110' rechts oben
        else if (c[v] === 10) setze(A[2]); else if (c[v] === 9) setze(A[3]); // '1010' rechts unten, '1001' links unten
      } else {                                                              // Fall c: Kante schneidet das Fenster
        const t = p0 | p1;
        if (p0 === 0) setze(B[u]);
        if (t & 8) setze(schnittpunkt(A[2], A[3], B[u], B[v]));             // untere Kante
        if (t & 4) setze(schnittpunkt(A[0], A[1], B[u], B[v]));             // obere Kante
        if (t & 2) setze(schnittpunkt(A[1], A[2], B[u], B[v]));             // rechte Kante
        if (t & 1) setze(schnittpunkt(A[3], A[0], B[u], B[v]));             // linke Kante
      }
    }
    if (lapped) {
      sortiere(lap);
      rechtecke.push({ x1: lap[0][0], y1: lap[0][1], x2: lap[2][0], y2: lap[2][1] });
    }
    return { codes: c, lapped, punkte: nr, rechtecke };
  }

  /* ------------------------------------------------------------------ Zustand und Ablauf */

  const NULL_LAP = () => [[0, 0], [0, 0], [0, 0], [0, 0]];

  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const z = { t: 0, zufall, breite: BREITE, hoehe: HOEHE, fassung: p.fassung === "04" ? "04" : "05",
                rechtecke: [], laps: [], summe: 0, exakt: 0, geprueft: 0, alt: 0, i: 0, k: 0, offen: false,
                lap: NULL_LAP(), letztes: null };
    erstelle(z, Math.max(1, Math.round(p.numbers)));   // wie ein erster Klick auf „Rechtecke erstellen“
    return z;
  }

  const paare = n => n * (n - 1) / 2;

  /** Zeiger auf das erste offene Paar: Schleife For I … For K := I + 1 …, beschränkt auf K ≥ alt (die neuen Rechtecke) */
  function setzeZeiger(z) {
    const n = z.rechtecke.length;
    z.i = 0; z.k = Math.max(1, z.alt);
    z.offen = n > 1 && z.k < n;
  }
  function weiter(z) {
    const n = z.rechtecke.length;
    if (++z.k >= n) { z.i++; z.k = Math.max(z.i + 1, z.alt); }
    if (z.i >= n - 1 || z.k >= n) z.offen = false;
  }

  /** „Rechtecke erstellen“: offene Paare zuerst fertig rechnen, dann anzahl neue Rechtecke anhängen */
  function erstelle(z, anzahl, px, py) {
    rechneAlle(z);
    z.alt = z.rechtecke.length;
    for (let i = 0; i < anzahl; i++) z.rechtecke.push(neuesRechteck(z.zufall, px, py));
    z.letztes = null;
    setzeZeiger(z);
  }

  /** Ein Paar (I, K) prüfen – mit der gewählten Fassung; die exakte Fläche (IntersectRect) läuft zum Vergleich mit. Erhöht z.t. */
  function vergleiche(z) {
    const a = z.rechtecke[z.i], b = z.rechtecke[z.k];
    const ex = intersectRect(a, b);
    if (ex) z.exakt += flaeche(ex);
    let neu, codes = null, punkte = 0;
    if (z.fassung === "04") { const e = cohenSutherland(a, b, z.lap); neu = e.rechtecke; codes = e.codes; punkte = e.punkte; }
    else neu = ex ? [ex] : [];
    for (const r of neu) { z.laps.push(Object.assign({ a: z.i, b: z.k }, r)); z.summe += flaeche(r); }
    z.letztes = { a: z.i, b: z.k, codes, punkte, neu: neu.length };
    z.geprueft++;
    weiter(z);
    z.t++;
  }

  /** „Überlagerungsflächen“: alle offenen Paare auf einmal */
  function rechneAlle(z) { while (z.offen) vergleiche(z); }

  /** Ein Schritt: ein Paar prüfen; ist keins mehr offen, neue Rechtecke erzeugen (nächster Klick). Erhöht z.t. */
  function schritt(z, p) {
    if (z.offen) { vergleiche(z); return z; }
    erstelle(z, Math.max(1, Math.round(p.numbers)));
    z.t++;
    return z;
  }

  /** Alle Überlagerungen von vorn berechnen lassen (Paar für Paar) */
  function neuBerechnen(z) {
    z.laps = []; z.summe = 0; z.exakt = 0; z.geprueft = 0; z.alt = 0; z.letztes = null; z.lap = NULL_LAP();
    setzeZeiger(z);
  }

  /** Parameter ohne Neustart: die Fassung wechseln rechnet dieselben Rechtecke von vorn mit dem anderen Verfahren */
  function aendere(z, p, id) {
    const f = p.fassung === "04" ? "04" : "05";
    if (id === "fassung" && f !== z.fassung) { z.fassung = f; neuBerechnen(z); }
  }

  /** „Rechtecke löschen“ */
  function loesche(z) { z.rechtecke = []; neuBerechnen(z); }

  /** Oberstes Rechteck an der Stelle (x, y) entfernen und die Überlagerungen sofort neu berechnen (ohne Schrittzählung) */
  function entferne(z, x, y) {
    for (let i = z.rechtecke.length - 1; i >= 0; i--) {
      const r = z.rechtecke[i];
      if (x >= r.x1 && x <= r.x2 && y >= r.y1 && y <= r.y2) {
        z.rechtecke.splice(i, 1); neuBerechnen(z);
        const t = z.t; rechneAlle(z); z.t = t; z.letztes = null;
        return true;
      }
    }
    return false;
  }

  /** Summe der Rechteckflächen (ohne Abzug der Überlagerungen) */
  const rechteckFlaeche = z => z.rechtecke.reduce((s, r) => s + flaeche(r), 0);

  return { STANDARD, BREITE, HOEHE, neuesRechteck, ecken, flaeche, intersectRect, clipCode, binaer, schnittpunkt, sortiere,
           cohenSutherland, erzeuge, schritt, aendere, erstelle, rechneAlle, loesche, entferne, paare, rechteckFlaeche };
});
