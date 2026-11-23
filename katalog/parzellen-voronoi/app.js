/* Parzellierung mit Voronoi · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const de = () => document.documentElement.lang !== "en";
  const zahl = (v, n = 0) => v.toLocaleString(de() ? "de" : "en", { minimumFractionDigits: n, maximumFractionDigits: n });
  const violett = F => F.dunkel ? "#b77cff" : "#8a2be2";
  const tonung = (F, k) => F.dunkel ? (k % 2 ? "rgba(183,124,255,0.13)" : "rgba(183,124,255,0.06)") : (k % 2 ? "rgba(138,43,226,0.10)" : "rgba(138,43,226,0.04)");
  const ORANGE = "#f5a300";

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 20, wert: 1 },
    parameter: [
      { id: "abstand", gruppe: { de: "Voronoi", en: "Voronoi" }, name: { de: "Zellabstand (Cell Distance) m", en: "Cell distance (m)" }, min: 10, max: 100, schritt: 1, wert: S.abstand, neustart: true },
      { id: "snapping", name: { de: "Fangen (Snapping) × Zellabstand", en: "Snapping × cell distance" }, min: 0.1, max: 0.5, schritt: 0.1, wert: S.snapping },
      { id: "glaetten", art: "schalter", name: { de: "Glätten (Network Smooth)", en: "Smooth (Network Smooth)" }, wert: S.glaetten },
      { id: "roh", gruppe: { de: "Darstellung", en: "Display" }, art: "schalter", name: { de: "ungeglättete Zellen zeigen", en: "Show unsmoothed cells" }, wert: true }
    ],
    groesse: z => ({ b: z.b, h: z.h }),
    klick(z, p, x, y, taste, phase) {
      if (phase !== "unten") return;
      const i = Modell.blockBei(z, [x, y]);
      z.wahl = i === z.wahl ? -1 : i;
    },
    ende: (z, p) => Modell.fertig(z, p),
    zeichne(ctx, z, p, F) {
      const px = F.px, V = violett(F), fertig = Modell.fertig(z, p);
      Karte.segmente(ctx, z.szene.strassen, F.dunkel ? "#3a3a42" : "#c8c8cf", px);
      z.bloecke.forEach((b, bi) => {
        Karte.poly(ctx, b.poly, F.dunkel ? "#0f0f13" : "#fafafb", null);
        if (b.zellen) b.zellen.forEach((q, k) => Karte.poly(ctx, q, tonung(F, k), null));
        if (p.roh && b.roh && b.phase >= 3) for (const q of b.roh) Karte.linie(ctx, q.concat([q[0]]), F.gedaempft, px * 0.8, [3 * px, 3 * px]);
        if (b.zellen) for (const q of b.zellen) Karte.poly(ctx, q, null, V, px * 1.3);
        if (b.punkte && (b.phase < 3 || (bi === z.aktuell && !fertig))) for (const q of b.punkte) Karte.punkt(ctx, q, 2.6 * px, V, null);
      });
      const a = fertig ? null : z.bloecke[z.aktuell];
      if (a && a.phase >= 3 && a.anker) {
        const s = p.abstand * p.snapping;
        for (const q of a.anker) {
          Karte.punkt(ctx, q, s, null, "rgba(245,163,0,0.45)", px);
          ctx.strokeStyle = F.tinte; ctx.lineWidth = px; ctx.strokeRect(q[0] - 2.5 * px, q[1] - 2.5 * px, 5 * px, 5 * px);
        }
      }
      for (const b of z.bloecke) Karte.poly(ctx, b.poly, null, F.tinte, px * 1.8);
      if (a) Karte.poly(ctx, a.poly, null, ORANGE, px * 2.4);
      const w = z.bloecke[z.wahl];
      if (w) {
        Karte.poly(ctx, w.poly, null, F.akzent, px * 3.5);
        Modell.parzellenVon(w).forEach(q => Karte.text(ctx, zahl(Geo.flaeche(q)) + " m²", Geo.schwerpunkt(q), F.tinte, px, 10, "center"));
      }
    },
    legende: F => [[violett(F), { de: "Erzeugerpunkt, Parzellengrenze", en: "Generator point, parcel border" }], [F.gedaempft, { de: "ungeglättet", en: "unsmoothed" }], [F.tinte, { de: "Blockrand, Anker", en: "Block edge, anchors" }], [ORANGE, { de: "aktueller Block, Fangradius", en: "current block, snap radius" }]],
    kennzahlen(z, p) {
      let punkte = 0, parz = 0, bewegt = 0, front = 0, A = 0, fertigB = 0;
      for (const b of z.bloecke) {
        if (b.punkte) punkte += b.punkte.length;
        if (b.zellen) { parz += b.zellen.length; A += b.A; fertigB++; front += b.zellen.filter(q => Modell.strassenfront(q, b.poly) > 0.01).length; }
        bewegt += b.bewegt;
      }
      const ph = ["–", { de: "Punkte (Divide Distance)", en: "Points (Divide Distance)" }, { de: "Zellen (Voronoi, Trim)", en: "Cells (Voronoi, trim)" }, { de: "Glätten (Network Smooth)", en: "Smoothing (Network Smooth)" }];
      const a = z.bloecke[z.aktuell];
      const k = [
        [{ de: "Phase", en: "Phase" }, a ? ph[a.phase] : "–"],
        [{ de: "Blöcke mit Zellen", en: "Blocks with cells" }, `${fertigB} / ${z.bloecke.length}`],
        [{ de: "Erzeugerpunkte", en: "Generator points" }, String(punkte)],
        [{ de: "Parzellen", en: "Parcels" }, String(parz)],
        [{ de: "mittlere Parzellenfläche", en: "Mean parcel area" }, parz ? zahl(A / parz) + " m²" : "–"],
        [{ de: "mit Straßenanschluss", en: "Connected to street" }, parz ? zahl(100 * front / parz) + " %" : "–"],
        [{ de: "Fangschwelle", en: "Snap threshold" }, zahl(p.abstand * p.snapping, 1) + " m"],
        [{ de: "verschobene Ecken", en: "Moved vertices" }, String(bewegt)]
      ];
      const w = z.bloecke[z.wahl];
      if (w) k.push([{ de: "gewählter Block", en: "Selected block" }, `${zahl(w.A)} m² · ${Modell.parzellenVon(w).length} ` + (de() ? "Parzellen" : "parcels")]);
      else k.push([{ de: "Block wählen", en: "Select block" }, { de: "Klick in einen Block", en: "click a block" }]);
      return k;
    }
  });
})();
