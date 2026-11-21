/* Segregation durch Eigenschaftsanpassung · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const MODELL = { de: "Modell", en: "Model" };
  const DARST = { de: "Darstellung", en: "Display" };

  // Farben wie im Original (cell_P.Paint: RGB(colr) mit colr = 255 · State, leere Zellen 125): schwarz, weiß, grau
  const FARBE = [[0, 0, 0], [255, 255, 255], [125, 125, 125]];
  const ROT = "#e5484d";
  const gruen = F => F.dunkel ? "#4cc764" : "#2b8a3e";       // clGreen des Diagramms, im Dunkeln heller
  // Diagramm wie RChart1: auf breiten Bildschirmen rechts neben dem Feld, sonst darunter (in Zellen; Feld 101 × 101)
  const UNTEN = 32, RECHTS = 75, LUECKE = 5;
  const quer = () => window.innerWidth > 900;
  const pz = v => (100 * v).toFixed(1).replace(".", ",") + " %";

  // Modell mit einer Ergänzung: „Verlauf zeigen“ ändert die Größe der Zeichenfläche → Größe neu berechnen lassen
  const modell = Object.assign({}, Modell, {
    aendere(z, p, id) { Modell.aendere(z, p, id); if (id === "verlauf") window.dispatchEvent(new Event("resize")); }
  });

  function diagramm(ctx, z, F, x0, y0, w, h) {
    const fs = 10 * F.px, l = x0, b = x0 + w, o = y0 + fs * 1.6, u = y0 + h - fs * 1.4, hh = u - o;
    const X = Math.max(30, z.t), sx = t => l + w * t / X, sy = v => u - hh * v;   // x bis 30 Schritte wie RChart1, dann mitwachsend
    ctx.save();
    ctx.font = `${fs}px "Geist Mono", ui-monospace, monospace`; ctx.textBaseline = "alphabetic";
    ctx.strokeStyle = F.linie; ctx.lineWidth = F.px;
    ctx.beginPath(); ctx.moveTo(l, o); ctx.lineTo(l, u); ctx.lineTo(b, u); ctx.stroke();
    ctx.setLineDash([2 * F.px, 3 * F.px]); ctx.beginPath(); ctx.moveTo(l, o); ctx.lineTo(b, o);
    for (const s of z.stoerungen) { ctx.moveTo(sx(s), o); ctx.lineTo(sx(s), u); }     // Störungen als senkrechte Linie
    ctx.stroke(); ctx.setLineDash([]);
    const linie = (farbe, wert, strich, ab = 0) => {
      ctx.strokeStyle = farbe; ctx.lineWidth = 1.5 * F.px; ctx.setLineDash(strich || []); ctx.beginPath();
      z.verlauf.forEach((v, t) => { if (t < ab) return; const x = sx(t), y = sy(wert(v)); t === ab ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
      ctx.stroke(); ctx.setLineDash([]);
    };
    linie(F.tinte2, v => v[1], [3 * F.px, 2 * F.px]);
    linie(gruen(F), v => v[2], null, 1);
    linie(ROT, v => v[0]);
    ctx.fillStyle = F.gedaempft; ctx.textAlign = "left";
    ctx.fillText("100 %", l + 3 * F.px, o - 4 * F.px);
    ctx.fillText("0", l + 3 * F.px, u + fs * 1.15);
    ctx.textAlign = "right"; ctx.fillText(String(X), b, u + fs * 1.15);
    const en = document.documentElement.lang === "en";
    ctx.fillText(en ? "dashed: like neighbours" : "gestrichelt: gleiche Nachbarn", b, o - 4 * F.px);
    ctx.restore();
  }

  Sim.starte({
    modell,
    saat: 1,
    tempo: { min: 1, max: 10, wert: 1 },
    parameter: [
      { id: "schwelle", gruppe: MODELL, name: { de: "Schwellenwert (ohne leere Zellen)", en: "Threshold (without empty cells)" }, min: 0, max: 8, schritt: 1, wert: S.schwelle },
      { id: "leer", gruppe: MODELL, name: { de: "mit leeren Zellen", en: "with empty cells" }, art: "schalter", wert: S.leer, neustart: true },
      { id: "stoerwert", gruppe: MODELL, name: { de: "Störwert", en: "Disturbance" }, min: 0, max: 1, schritt: 0.01, wert: S.stoerwert },
      { id: "verlauf", gruppe: DARST, name: { de: "Verlauf zeigen", en: "Show chart" }, art: "schalter", wert: S.verlauf }
    ],
    aktionen: [{ name: { de: "Störung", en: "Disturb" }, tue: (z, p) => Modell.stoere(z, p) }],
    groesse: (z, p) => !p.verlauf ? { b: z.breite, h: z.hoehe } : quer() ? { b: z.breite + LUECKE + RECHTS, h: z.hoehe } : { b: z.breite, h: z.hoehe + UNTEN },
    ende: z => z.t > 0 && z.geaendert === 0,                  // eigene Ergänzung: Halt, sobald keine Zelle mehr wechselt
    klick(z, p, x, y, taste) { if (x < z.breite && y < z.hoehe) Modell.setze(z, x, y, taste === "rechts" ? Modell.SCHWARZ : Modell.WEISS); },
    zeichne(ctx, z, p, F) {
      Sim.raster(ctx, z.spalten, z.zeilen, d => {
        for (let n = 0; n < z.feld.length; n++) { const c = FARBE[z.feld[n]]; d[4 * n] = c[0]; d[4 * n + 1] = c[1]; d[4 * n + 2] = c[2]; d[4 * n + 3] = 255; }
      }, 0, 0, z.breite, z.hoehe);
      if (p.verlauf) {                                          // Anordnung aus dem Seitenverhältnis der Zeichenfläche (folgt groesse)
        if (ctx.canvas.width > ctx.canvas.height * 1.2) diagramm(ctx, z, F, z.breite + LUECKE, 0, RECHTS, z.hoehe);
        else diagramm(ctx, z, F, 0, z.hoehe, z.breite, UNTEN);
      }
    },
    legende(F, p) {
      const L = [["#000000", { de: "schwarz · Weintrinker", en: "black · wine drinkers" }], ["#ffffff", { de: "weiß · Biertrinker", en: "white · beer drinkers" }]];
      if (p.leer) L.push(["#7d7d7d", { de: "leer", en: "empty" }]);
      if (p.verlauf) L.push([ROT, { de: "Anteil weiß", en: "share white" }], [gruen(F), { de: "Änderungsrate", en: "rate of change" }]);
      return L;
    },
    kennzahlen(z) {
      const v = z.verlauf[z.verlauf.length - 1];
      return [
        [{ de: "Zellen (ohne leere)", en: "Cells (not empty)" }, String(Modell.zellen(z))],
        [{ de: "Anteil weiß (Durchschnitt)", en: "Share white (mean)" }, pz(v[0])],
        [{ de: "gleiche Nachbarn (Mittel)", en: "like neighbours (mean)" }, pz(v[1])],
        [{ de: "gewechselt im letzten Schritt", en: "changed in last step" }, String(z.geaendert)],
        [{ de: "Ruhe nach Schritt", en: "At rest after step" }, z.fertig != null ? String(z.fertig) : "–"]
      ];
    }
  });
  // Beschriftung im Diagramm folgt der Sprache: nach dem Umschalten neu zeichnen
  document.querySelectorAll(".sprache").forEach(b => b.addEventListener("click", () => window.SIM && window.SIM.zeichne()));
})();
