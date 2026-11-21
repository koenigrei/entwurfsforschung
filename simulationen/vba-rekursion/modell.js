/* Rekursive Strukturen 01 – Verzweigungsstrukturen · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung des AutoCAD-VBA-Skripts auf iteration01.htm (Reinhard König, vor 2004), dazu die Fassungen
   iteration02.htm (Ebene mit Belegungsprüfung) und iteration03.htm (Höhenstaffelung) als Variante.
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Regel (Sub create): Ab einem Samen verzweigt jeder Würfel in astZahl neue Würfel. Richtung des m-ten Astes:
     angle = Round(Rnd() · num + 1) · 2π/num  (num = 4),  Abstand (m + 2) · 11,  Koordinaten auf ganze Zahlen gerundet.
   Jede Iterationsstufe (durchlauf) liegt ein Geschoss höher (etage + 22) und bekommt die Farbe durchlauf + 1.
   Der Index-Mechanismus des Originals (loser(), f, u, max; create(f − ((u·astZahl − u) + max))) ruft die Würfel
   genau in der Reihenfolge ihrer Entstehung als Basisast auf – das ist eine Breitensuche (Warteschlange) und steht
   hier als solche: z.i = Index des Basisastes, z.m = Nummer des Astes. Ein Schritt = ein neuer Würfel.
   Abbruch, sobald mengeWuerfel Würfel stehen (setzeQuad: If f = mengeWuerfel Then End; der Samen zählt mit). */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const NUM = 4;                          // num = 4 → oneSlice = 2π / 4
  const RASTER = 11;                      // Grundabstand 11 (Würfel 10 + Fuge 1)
  const ETAGE = 22;                       // etage = etage + 22 je durchlauf (iteration01)
  const GESCHOSSE_STAFFEL = 4;            // geschoss = 4 (iteration03)

  /** Voreinstellungen wie im Original (InputBox-Vorgaben 300 und 3; die Fassungen 02/03 schlagen astZahl 2 vor) */
  const STANDARD = { variante: "geschosse", mengeWuerfel: 300, astZahl: 3, farbe: "stufen", drehung: 30, neigung: 35 };

  /** Varianten: kante = Würfelkante, linien = Verbindungslinien, samen = Mittelpunkt des Samens */
  const VARIANTEN = {
    geschosse: { kante: 10, linien: true, samen: [0, 0, -15] },   // iteration01: startTrip (0, 0, −10), Mitte um elevation/2 tiefer
    ebene:     { kante: 6,  linien: true, samen: [0, 0, 40] },    // iteration02: startTrip (0, 0, 40), Würfel 6
    staffel:   { kante: 10, linien: false, samen: [0, 0, 0] }     // iteration03: startTrip (0, 0, 0), draw_line auskommentiert
  };

  /** VBA-Round: bei genau .5 zur geraden Zahl („Banker's Rounding“), sonst zur nächsten ganzen Zahl */
  function vbaRound(x) {
    const f = Math.floor(x), r = x - f;
    if (Math.abs(r - 0.5) < 1e-12) return f % 2 === 0 ? f : f + 1;
    return r < 0.5 ? f : f + 1;
  }

  /** Richtungsfaktor k = Round(Rnd · num + 1) ∈ {1 … 5}; k = 1 und k = 5 zeigen beide nach +y (90° und 450°) */
  const richtungsFaktor = r => vbaRound(r * NUM + 1);

  /** Versatz [dx, dy] für Richtungsfaktor k und Abstand a: Round(Cos(k · 2π/num) · a, 0), Round(Sin(…) · a, 0) */
  function versatz(k, a) {
    const w = k * 2 * Math.PI / NUM;
    return [vbaRound(Math.cos(w) * a) + 0, vbaRound(Math.sin(w) * a) + 0];   // + 0 macht aus −0 eine 0
  }

  /** Abstand des m-ten Astes: (m + 2) · 11 in iteration01, sonst 11 */
  const abstand = (variante, m) => variante === "geschosse" ? (m + 2) * RASTER : RASTER;

  /** Mittelpunkthöhe eines Würfels im durchlauf d (iteration01: Mitte = etage − elevation/2, etage = 22 · d) */
  const hoeheGeschoss = d => ETAGE * d - 5;

  /** AutoCAD-Farbnummer eines durchlaufs: durchlauf + 1 (über 255 wieder von vorn) */
  const farbNummer = d => (d % 255) + 1;

  const schluessel = (x, y, h) => x + "," + y + "," + h;

  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const variante = VARIANTEN[p.variante] ? p.variante : "geschosse", V = VARIANTEN[variante];
    const z = {
      t: 0, zufall, variante, kante: V.kante, linienAn: V.linien, astZahl: Math.max(1, Math.round(p.astZahl)),
      wuerfel: [], linien: [], belegt: new Map(), i: 0, m: 0, verworfen: 0, doppelt: 0, fertig: false
    };
    setze(z, V.samen[0], V.samen[1], V.samen[2], 0, 0, -1);   // setzeQuad startTrip – der Samen
    return z;
  }

  /** Würfel eintragen (setzeQuad): d = durchlauf (Farbe d + 1), g = Generation, eltern = Index des Basisastes */
  function setze(z, x, y, h, d, g, eltern) {
    const k = schluessel(x, y, h);
    if (z.belegt.has(k)) z.doppelt++; else z.belegt.set(k, z.wuerfel.length);
    z.wuerfel.push({ x, y, z: h, d, g, eltern });
  }
  const frei = (z, x, y, h) => !z.belegt.has(schluessel(x, y, h));

  /** Ziel des nächsten Astes nach der Regel der Variante; null = verworfen (Ktod im Original) */
  function ziel(z, b, dx, dy) {
    const x = b.x + dx, y = b.y + dy;
    if (z.variante === "geschosse") return [x, y, hoeheGeschoss(b.g)];            // mitte(2) = etage
    if (z.variante === "ebene") return frei(z, x, y, b.z) ? [x, y, b.z] : null;   // Doppelbelegung → verwerfen
    // staffel (iteration03): frei → am Boden oder nur auf einem Würfel darunter; besetzt → ein Geschoss höher (unter geschoss · 11)
    if (frei(z, x, y, b.z)) return b.z === 0 || !frei(z, x, y, b.z - RASTER) ? [x, y, b.z] : null;
    const oben = b.z + RASTER;
    return frei(z, x, y, oben) && oben < GESCHOSSE_STAFFEL * RASTER ? [x, y, oben] : null;
  }

  /** Ist das Wachstum zu Ende? mengeWuerfel erreicht oder (Fassungen 02/03) kein Basisast mehr übrig */
  const fertig = (z, p) => z.fertig || z.wuerfel.length >= Math.max(1, p.mengeWuerfel);

  /** Ein Schritt = ein neuer Würfel (verworfene Äste werden im selben Schritt übersprungen). Erhöht z.t. */
  function schritt(z, p) {
    if (fertig(z, p)) return z;
    while (z.i < z.wuerfel.length) {
      const bi = z.i, b = z.wuerfel[bi], m = z.m;
      const [dx, dy] = versatz(richtungsFaktor(z.zufall()), abstand(z.variante, m));
      if (++z.m >= z.astZahl) { z.m = 0; z.i++; }            // nächster Basisast in Entstehungsreihenfolge
      const q = ziel(z, b, dx, dy);
      if (!q) { z.verworfen++; continue; }
      const nr = z.wuerfel.length;
      setze(z, q[0], q[1], q[2], b.g, b.g + 1, bi);            // durchlauf des Kindes = Generation des Basisastes
      if (z.linienAn) {                                        // draw_line Centroid → (koord, etage), Farbe durchlauf + 1
        const ende = z.variante === "geschosse" ? [q[0], q[1], ETAGE * b.g] : q.slice();
        z.linien.push({ eltern: bi, kind: nr, d: b.g, a: [b.x, b.y, b.z], b: ende });
      }
      z.t++;
      return z;
    }
    z.fertig = true;                                           // Warteschlange leer: Struktur abgestorben
    return z;
  }

  /** Parameter ohne Neustart: mengeWuerfel wird in schritt/fertig live gelesen (Erhöhen lässt eine fertige Struktur weiterwachsen) */
  function aendere(z, p, id) {}

  /** Kennzahlen */
  const geschosse = z => new Set(z.wuerfel.map(w => w.z)).size;
  function hoechsterDurchlauf(z) { let d = 0; for (const w of z.wuerfel) if (w.d > d) d = w.d; return d; }

  return { STANDARD, VARIANTEN, NUM, RASTER, ETAGE, GESCHOSSE_STAFFEL, vbaRound, richtungsFaktor, versatz, abstand,
           hoeheGeschoss, farbNummer, erzeuge, schritt, aendere, fertig, geschosse, hoechsterDurchlauf };
});
