/* Dichte Packungen · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD, FI = Modell.FASSUNGEN.I, FII = Modell.FASSUNGEN.II;
  // Farben wie im Original: Rechtecke rot (clRed), Überschneidungen blau (clBlue), Umriss grün (Pen clGreen)
  const ROT = "#e03131", BLAU = "#3b5bdb", gruen = F => F.dunkel ? "#2f9e44" : "#237032";
  const ES = { de: "Evolutionäre Strategie", en: "Evolutionary strategy" }, DARST = { de: "Darstellung", en: "Display" };
  const en = () => document.documentElement.lang === "en";
  const zahl = v => v.toLocaleString(en() ? "en" : "de");
  // Verlauf der kleinsten Überlagerungsfläche: auf breiten Bildschirmen rechts neben dem Feld, sonst darunter (Modelleinheiten)
  const RECHTS = 170, UNTEN = 110, LUECKE = 14;
  const quer = () => window.innerWidth > 900;

  function diagramm(ctx, z, F, x0, y0, w, h) {
    const fs = 10 * F.px, l = x0, r = x0 + w, o = y0 + fs * 1.8, u = y0 + h - fs * 1.6, hh = u - o, V = z.verlauf;
    const vmax = Math.max(1000, V[0] || 0), lg = v => Math.log10(Math.max(1, v));      // logarithmisch: 1 … Startwert
    const X = Math.max(100, V.length - 1), sx = t => l + w * t / X, sy = v => u - hh * lg(v) / lg(vmax);
    ctx.save();
    ctx.font = `${fs}px "Geist Mono", ui-monospace, monospace`;
    ctx.strokeStyle = F.linie; ctx.lineWidth = F.px;
    ctx.beginPath(); ctx.moveTo(l, o); ctx.lineTo(l, u); ctx.lineTo(r, u); ctx.stroke();
    ctx.setLineDash([2 * F.px, 3 * F.px]); ctx.beginPath(); ctx.moveTo(l, sy(Modell.ZIEL)); ctx.lineTo(r, sy(Modell.ZIEL)); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = BLAU; ctx.lineWidth = 1.5 * F.px; ctx.beginPath();
    const schritt = Math.max(1, Math.floor(V.length / 400));                            // höchstens rund 400 Stützpunkte
    for (let t = 0; t < V.length; t += schritt) { const x = sx(t), y = sy(V[t]); t ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    if (V.length) ctx.lineTo(sx(V.length - 1), sy(V[V.length - 1]));
    ctx.stroke();
    ctx.fillStyle = F.gedaempft; ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
    ctx.fillText(zahl(vmax), l + 3 * F.px, o - 4 * F.px);
    ctx.fillText("100", l + 3 * F.px, sy(Modell.ZIEL) - 3 * F.px);
    ctx.fillText("0", l, u + fs * 1.2);
    ctx.textAlign = "right"; ctx.fillText(zahl(X), r, u + fs * 1.2);
    ctx.fillText(en() ? "min. overlap (log)" : "min. Überlagerung (log)", r, o - 4 * F.px);
    ctx.restore();
  }

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 50, wert: 1 },
    parameter: [
      { id: "fassung", gruppe: ES, name: { de: "Fassung", en: "Version" }, art: "auswahl", wert: S.fassung, neustart: true, groesseNeu: true,
        optionen: [{ wert: "I", name: { de: "I · Quadrate (06)", en: "I · squares (06)" } }, { wert: "II", name: { de: "II · Seiten variabel (07)", en: "II · variable sides (07)" } }],
        folgen: { I: { numbers: FI.numbers, groesse: FI.groesse, variation: FI.variation, mutation: FI.mutation },
                  II: { numbers: FII.numbers, groesse: FII.groesse, variation: FII.variation, mutation: FII.mutation } } },
      { id: "numbers", gruppe: ES, name: { de: "Rechtecke (generate per Click)", en: "Rectangles (generate per click)" }, min: 1, max: 100, wert: S.numbers, neustart: true },
      { id: "groesse", gruppe: ES, name: { de: "Rechteckgröße (halbe Seite)", en: "Rectangle size (half side)" }, min: 1, max: 100, wert: S.groesse, neustart: true },
      { id: "variation", gruppe: ES, name: { de: "Variationsweite", en: "Variation range" }, min: 1, max: 100, wert: S.variation },
      { id: "mutation", gruppe: ES, name: { de: "Mutationsrate", en: "Mutation rate" }, min: 0, max: 50, wert: S.mutation, format: v => v + " %" },
      { id: "verlauf", gruppe: DARST, name: { de: "Verlauf zeigen", en: "Show chart" }, art: "schalter", wert: S.verlauf, groesseNeu: true }
    ],
    groesse: (z, p) => !p.verlauf ? { b: z.breite, h: z.hoehe } : quer() ? { b: z.breite + LUECKE + RECHTS, h: z.hoehe } : { b: z.breite, h: z.hoehe + UNTEN },
    ende: z => z.fertig,                                          // Idle: If area <= 100 Then done
    zeichne(ctx, z, p, F) {
      ctx.fillStyle = F.papier; ctx.fillRect(0, 0, z.breite, z.hoehe);
      const v = z.pop[z.best], g = gruen(F);
      ctx.lineWidth = F.px;
      for (let i = 0; i < z.n; i++) {
        const x = v.px[i] - v.cx[i], y = v.py[i] - v.cy[i], w = 2 * v.cx[i], h = 2 * v.cy[i];
        ctx.fillStyle = ROT; ctx.fillRect(x, y, w, h); ctx.strokeStyle = g; ctx.strokeRect(x, y, w, h);
      }
      for (const r of z.laps) {
        ctx.fillStyle = BLAU; ctx.fillRect(r.x1, r.y1, r.x2 - r.x1, r.y2 - r.y1); ctx.strokeStyle = g; ctx.strokeRect(r.x1, r.y1, r.x2 - r.x1, r.y2 - r.y1);
      }
      ctx.strokeStyle = F.linie; ctx.strokeRect(0, 0, z.breite, z.hoehe);
      if (p.verlauf) {                                            // Anordnung wie in groesse (die Größe wird bei jeder Fensteränderung neu berechnet)
        if (quer()) diagramm(ctx, z, F, z.breite + LUECKE, 0, RECHTS, z.hoehe);
        else diagramm(ctx, z, F, 0, z.hoehe + 8, z.breite, UNTEN - 8);
      }
    },
    legende: () => [[ROT, { de: "Rechteck", en: "Rectangle" }], [BLAU, { de: "Überschneidung", en: "Overlap" }]],
    kennzahlen(z, p) {
      const k = [[{ de: "Generation", en: "Generation" }, zahl(z.t)],
                 [{ de: "min. Überlagerungsfläche", en: "min. overlapping area" }, zahl(z.flaeche)],
                 [{ de: "beste Variante", en: "best variant" }, `${z.best + 1} / ${z.F.nrPop}`]];
      if (z.fassung === "II") k.push([{ de: "Eltern (area_ind 0–3)", en: "parents (area_ind 0–3)" }, z.eltern.map(e => e + 1).join(" · ")]);
      const soll = Modell.sollFlaeche(z), feld = Modell.feldFlaeche(z);
      k.push([{ de: "Feldfläche ges.", en: "Total field area" }, zahl(feld)],
             [{ de: "Rechteckfläche ges.", en: "Total rectangle area" }, zahl(soll)],
             [{ de: "Belegung", en: "Coverage" }, (100 * soll / feld).toFixed(1).replace(".", en() ? "." : ",") + " %"],
             [{ de: "Zustand", en: "State" }, z.fertig ? { de: "Programm bereit (≤ 100)", en: "ready (≤ 100)" } : { de: "Optimierung läuft …", en: "optimising …" }]);
      return k;
    }
  });
})();
