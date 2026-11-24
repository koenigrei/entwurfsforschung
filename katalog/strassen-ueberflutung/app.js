/* Straßen und Starkregen · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const de = () => document.documentElement.lang !== "en";
  const zahl = (v, n = 0) => v.toLocaleString(de() ? "de" : "en", { minimumFractionDigits: n, maximumFractionDigits: n });
  const pz = v => zahl(v * 100, 0) + " %", grad = v => zahl(v * 180 / Math.PI, 1) + "°";
  const PFEIL = F => F.dunkel ? "rgba(200,200,205,0.75)" : "rgba(70,70,78,0.7)";

  /** Gelände einmal je Größe, Darstellung und Höhenlinienabstand in ein Bild rechnen und danach nur noch einsetzen (Karte.gelaendeGespeichert) */
  const gelaende = (ctx, G, F, dz) => Karte.gelaendeGespeichert(ctx, G, F, { hoehenlinien: dz > 0 ? dz : 0 });

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 30, wert: 3 },
    parameter: [
      { id: "maxGrad", gruppe: { de: "Bewertung", en: "Assessment" }, name: { de: "Größte Neigung (Max Degrees) °", en: "Max degrees °" }, min: 1, max: 90, schritt: 1, wert: S.maxGrad },
      { id: "segment", name: { de: "Segmentlänge m", en: "Segment length (m)" }, min: 5, max: 100, schritt: 1, wert: S.segment },
      { id: "messpunkt", name: { de: "Messpunkt im Segment (Evaluate Curve)", en: "Sample point on segment (Evaluate Curve)" }, min: 0, max: 1, schritt: 0.01, wert: S.messpunkt },
      { id: "obergrenze", gruppe: { de: "Darstellung", en: "Display" }, name: { de: "Farbskala bis (Gradient Upper Limit)", en: "Colour scale up to (gradient upper limit)" }, min: 0.05, max: 1, schritt: 0.01, wert: S.obergrenze },
      { id: "pfeil", name: { de: "Pfeillänge Fließrichtung (× sin Neigung) m", en: "Flow arrow length (× sin slope) m" }, min: 0, max: 100, schritt: 1, wert: S.pfeil },
      { id: "hoehenlinien", name: { de: "Höhenlinien (Contour) m", en: "Contour lines (m)" }, min: 0, max: 100, schritt: 1, wert: S.hoehenlinien },
      { id: "zeigePfeile", art: "schalter", name: { de: "Fließrichtung zeigen (graue Pfeile)", en: "Show flow direction (grey arrows)" }, wert: true }
    ],
    aktionen: [{ name: { de: "Bewertung abspielen", en: "Replay assessment" }, tue: z => Modell.abspielen(z) }],
    groesse: z => ({ b: z.b, h: z.h }),
    klick(z, p, x, y) { Modell.waehle(z, [x, y]); },
    ende: z => Modell.fertig(z),
    zeichne(ctx, z, p, F) {
      const px = F.px;
      gelaende(ctx, z.G, F, p.hoehenlinien);
      Karte.segmente(ctx, z.strassen, F.dunkel ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.25)", px * 1.2);
      const B = Modell.bewertet(z);
      ctx.lineCap = "round";
      for (const s of B) Karte.linie(ctx, [s.a, s.b], Karte.farbe(Modell.farbwert(s.risiko, p.obergrenze), "spektral"), px * 3.2);
      ctx.lineCap = "butt";
      if (p.zeigePfeile && p.pfeil > 0) for (const s of B) { const l = Math.hypot(s.fluss[0], s.fluss[1]) * p.pfeil; if (l > px * 2) Karte.pfeil(ctx, s.m, s.fluss, l, PFEIL(F), px * 0.9); }
      const w = z.wahl >= 0 ? Modell.segmentNr(z, z.wahl) : null;
      if (w) { Karte.linie(ctx, [w.a, w.b], F.tinte, px * 7); Karte.linie(ctx, [w.a, w.b], Karte.farbe(Modell.farbwert(w.risiko, p.obergrenze), "spektral"), px * 4); Karte.punkt(ctx, w.m, px * 3, F.tinte, null); }
    },
    legende: F => Karte.skalenLegende("spektral", { de: "flach oder in Fließrichtung", en: "flat or along the flow" }, { de: "steil und quer zum Fluss", en: "steep and across the flow" })
      .concat([[PFEIL(F), { de: "Fließrichtung", en: "Flow direction" }]]),
    kennzahlen(z, p) {
      const a = Modell.auswertung(z, p), k = [];
      k.push([{ de: "Straßen bewertet", en: "Streets assessed" }, `${zahl(z.k)} / ${zahl(z.strassen.length)}`]);
      k.push([{ de: "Segmente · Länge", en: "Segments · length" }, `${zahl(a.segmente)} · ${zahl(a.laenge / 1000, 1)} km`]);
      k.push([{ de: "Stark betroffen (rote Hälfte)", en: "Highly affected (red half)" }, pz(a.stark)]);
      k.push([{ de: "Kaum betroffen (unter 0,2)", en: "Sparsely affected (below 0.2)" }, pz(a.kaum)]);
      k.push([{ de: "Mittleres Risiko", en: "Mean risk" }, zahl(a.mittel, 2)]);
      k.push([{ de: "Mittlere Neigung an Straßen", en: "Mean slope at streets" }, grad(a.neigung)]);
      k.push([{ de: "Steiler als Max Degrees", en: "Steeper than max degrees" }, pz(a.steiler)]);
      k.push([{ de: "Steilste Stelle", en: "Steepest point" }, grad(a.maxSteil)]);
      const w = z.wahl >= 0 ? Modell.segmentNr(z, z.wahl) : null;
      if (w) {
        k.push([{ de: "▸ Segment: Abweichung", en: "▸ Segment: deviation" }, grad(w.abweichung)]);
        k.push([{ de: "▸ Segment: Neigung", en: "▸ Segment: slope" }, grad(w.steil)]);
        k.push([{ de: "▸ Segment: Risiko", en: "▸ Segment: risk" }, `${zahl(w.nAbw, 2)} × ${zahl(w.nSteil, 2)} = ${zahl(w.risiko, 2)}`]);
      }
      return k;
    }
  });
})();
