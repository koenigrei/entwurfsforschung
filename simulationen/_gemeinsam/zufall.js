/* Zufallszahlen mit fester Saat (mulberry32) – gleiche Saat, gleicher Ablauf.
   Läuft im Browser (globales Objekt „Zufall“) und in Node (require).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function (wurzel, fabrik) {
  const Z = fabrik();
  if (typeof module === "object" && module.exports) module.exports = Z;
  else wurzel.Zufall = Z;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /** Liefert eine Funktion () => Zahl in [0, 1), bestimmt durch die Saat. */
  function zufall(saat) {
    let a = (Number(saat) >>> 0) || 1;
    const f = function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    /** ganze Zahl in [0, n) */
    f.ganz = n => Math.floor(f() * n);
    /** Zahl in [a, b) */
    f.zwischen = (u, o) => u + f() * (o - u);
    /** Delphi-Muster random(3) - 1 → −1, 0 oder 1 */
    f.dreh = () => Math.floor(f() * 3) - 1;
    return f;
  }
  return { zufall };
});
