/* Regenwasserabfluss (Vektor) · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const en = () => document.documentElement.lang === "en";
  const zahl = (v, n = 0) => v.toLocaleString(en() ? "en" : "de", { minimumFractionDigits: n, maximumFractionDigits: n });
  const strich = F => F.dunkel ? "rgba(235,235,240,0.9)" : "rgba(20,20,24,0.88)";

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 100, wert: 10 },
    parameter: [
      { id: "punkte", gruppe: { de: "Flow Paths (Gismo)", en: "Flow Paths (Gismo)" }, name: { de: "Zahl der Punkte (Number of Points)", en: "Number of points" }, min: 0, max: 1000, schritt: 1, wert: S.punkte, neustart: true },
      { id: "zufaellig", art: "schalter", name: { de: "Zufällig statt Raster (Grid:False Random:True)", en: "Random instead of grid (Grid:False Random:True)" }, wert: S.zufaellig, neustart: true },
      { id: "schrittweite", name: { de: "Schrittweite (stepSize_) m", en: "Step size (stepSize_) m" }, min: 0.1, max: 20, schritt: 0.1, wert: S.schrittweite },
      { id: "zeigeStart", gruppe: { de: "Darstellung", en: "Display" }, art: "schalter", name: { de: "Startpunkte zeigen", en: "Show start points" }, wert: S.zeigeStart }
    ],
    groesse: z => ({ b: z.b, h: z.h }),
    klick(z, p, x, y, taste, phase) { if (phase === "unten") Modell.tropfen(z, x, y); },
    ende: z => Modell.fertig(z),
    zeichne(ctx, z, p, F) {
      const px = F.px;
      Karte.gelaendeGespeichert(ctx, z.G, F, { hoehenlinien: 20 });   // Gelände nur bei Änderung neu rechnen
      if (p.zeigeStart) {
        ctx.fillStyle = F.dunkel ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)"; ctx.beginPath();
        for (const w of z.wege) if (!w.eigen) { const q = w.pkt[0]; ctx.moveTo(q[0] + px, q[1]); ctx.arc(q[0], q[1], px, 0, 2 * Math.PI); }
        ctx.fill();
      }
      // Fließwege als Polylinien (Vektorzüge)
      ctx.lineJoin = "round"; ctx.lineCap = "round";
      ctx.beginPath();
      for (const w of z.wege) {
        const P = w.pkt; if (P.length < 2) continue;
        const k = P.length > 400 ? 2 : 1;
        ctx.moveTo(P[0][0], P[0][1]);
        for (let i = k; i < P.length; i += k) ctx.lineTo(P[i][0], P[i][1]);
        ctx.lineTo(P[P.length - 1][0], P[P.length - 1][1]);
      }
      ctx.strokeStyle = strich(F); ctx.lineWidth = px * 1.1; ctx.stroke();
      ctx.lineJoin = "miter"; ctx.lineCap = "butt";
      // Köpfe der laufenden Wege, Endpunkte der fertigen
      ctx.fillStyle = F.akzent; ctx.beginPath();
      for (const w of z.wege) if (w.aktiv) { const q = w.pkt[w.pkt.length - 1]; ctx.moveTo(q[0] + px * 1.8, q[1]); ctx.arc(q[0], q[1], px * 1.8, 0, 2 * Math.PI); }
      ctx.fill();
      for (const w of z.wege) if (w.eigen) Karte.punkt(ctx, w.pkt[0], px * 4, null, F.akzent, px * 1.6);
    },
    legende: F => [[strich(F), { de: "Fließweg (Polylinie)", en: "Flow path (polyline)" }], [F.akzent, { de: "Tropfen unterwegs", en: "Moving drop" }],
      [F.dunkel ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)", { de: "Startpunkt", en: "Start point" }]],
    kennzahlen(z, p) {
      const A = Modell.auswertung(z), g = A.gruende;
      const [U, V] = Modell.rasterTeilung(Math.max(2, p.punkte), 1, 1);
      return [
        [{ de: "Startpunkte", en: "Start points" }, p.zufaellig ? `${zahl(z.start.length)} ${en() ? "random" : "zufällig"}` : `${U} × ${V} = ${zahl(z.start.length)}`],
        [{ de: "Fließwege", en: "Flow paths" }, zahl(A.anzahl)],
        [{ de: "noch unterwegs", en: "still moving" }, zahl(z.aktiv)],
        [{ de: "mittlere Länge", en: "Mean length" }, zahl(A.mittel) + " m"],
        [{ de: "längster Weg", en: "Longest path" }, zahl(A.max) + " m"],
        [{ de: "mittlerer Höhenverlust", en: "Mean drop in elevation" }, zahl(A.fall, 1) + " m"],
        [{ de: "Ende in Senke", en: "Ended in sink" }, zahl(g.senke)],
        [{ de: "Ende am Rand / Stillstand", en: "Ended at edge / standstill" }, zahl(g.stillstand + g.flach)],
        [{ de: "Ende nach 5000 Schritten", en: "Ended after 5000 steps" }, zahl(g.max)]
      ];
    }
  });
})();
