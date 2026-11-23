/* Parzellierung nach Fläche · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const de = () => document.documentElement.lang !== "en";
  const zahl = (v, n = 0) => v.toLocaleString(de() ? "de" : "en", { minimumFractionDigits: n, maximumFractionDigits: n });
  const violett = F => F.dunkel ? "#b77cff" : "#8a2be2";
  const tonung = (F, k) => F.dunkel ? (k % 2 ? "rgba(183,124,255,0.13)" : "rgba(183,124,255,0.06)") : (k % 2 ? "rgba(138,43,226,0.10)" : "rgba(138,43,226,0.04)");
  const NAMEN = {
    greedy: { de: "Gleiche Fläche – kürzester Schnitt (Equal Area – cut by minimal distance)", en: "Equal Area – cut by minimal distance" },
    vektor: { de: "Gleiche Fläche – Schnitt in Vektorrichtung (Equal Area – cut by vector direction)", en: "Equal Area – cut by vector direction" },
    liste: { de: "Einzelne Flächen – kürzester Schnitt (Individual Area – cut by minimal distance)", en: "Individual Area – cut by minimal distance" }
  };

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 20, wert: 2 },
    parameter: [
      { id: "option", art: "auswahl", gruppe: { de: "Parzellierung", en: "Parcellation" }, name: { de: "Verfahren (Parcellation Option)", en: "Parcellation option" },
        wert: S.option, neustart: true, optionen: Modell.OPTIONEN.map(([w]) => ({ wert: w, name: NAMEN[w] })) },
      { id: "n", name: { de: "Parzellen je Block (n)", en: "Parcels per block (n)" }, min: 0, max: 10, schritt: 1, wert: S.n, neustart: true },
      { id: "stufen", name: { de: "Stufen der Flächenliste (Range Steps)", en: "Steps of the area list (Range steps)" }, min: 0, max: 10, schritt: 1, wert: S.stufen, neustart: true },
      { id: "beschriften", gruppe: { de: "Darstellung", en: "Display" }, art: "schalter", name: { de: "Flächen im gewählten Block beschriften", en: "Label areas in the selected block" }, wert: true },
      { id: "richtung", art: "schalter", name: { de: "Schnittrichtung dir zeigen", en: "Show cut direction dir" }, wert: true }
    ],
    groesse: z => ({ b: z.b, h: z.h }),
    klick(z, p, x, y, taste, phase) {
      if (phase !== "unten") return;
      const i = Modell.blockBei(z, [x, y]);
      z.wahl = i === z.wahl ? -1 : i;
    },
    ende: z => Modell.fertig(z),
    zeichne(ctx, z, p, F) {
      const px = F.px, V = violett(F);
      Karte.segmente(ctx, z.szene.strassen, F.dunkel ? "#3a3a42" : "#c8c8cf", px * 1);
      z.bloecke.forEach(b => {
        Karte.poly(ctx, b.poly, F.dunkel ? "#0f0f13" : "#fafafb", null);
        Modell.parzellenVon(b).forEach((q, k) => Karte.poly(ctx, q, tonung(F, k), null));
        for (const l of b.linien) Karte.linie(ctx, l, V, px * 1.3);
      });
      if (p.richtung && p.option === "vektor") for (const b of z.bloecke) {
        const c = Geo.schwerpunkt(b.poly);
        Karte.pfeil(ctx, [c[0] - b.dir[0] * 9, c[1] - b.dir[1] * 9], b.dir, 18, F.gedaempft, px * 1.2);
      }
      if (z.letzter) Karte.linie(ctx, z.letzter.linie, "#f5a300", px * 3);
      for (const b of z.bloecke) Karte.poly(ctx, b.poly, null, F.tinte, px * 1.8);
      const w = z.bloecke[z.wahl];
      if (w) {
        Karte.poly(ctx, w.poly, null, F.akzent, px * 3.5);
        if (p.beschriften) Modell.parzellenVon(w).forEach(q => Karte.text(ctx, zahl(Geo.flaeche(q)) + " m²", Geo.schwerpunkt(q), F.tinte, px, 10, "center"));
      }
    },
    legende: F => [[violett(F), { de: "Parzellengrenze", en: "Parcel border" }], [F.tinte, { de: "Blockrand", en: "Block edge" }], ["#f5a300", { de: "letzter Schnitt", en: "last cut" }]],
    kennzahlen(z, p) {
      let parz = 0, fehl = 0, L = 0, nL = 0;
      for (const b of z.bloecke) { parz += b.parzellen.length + 1; if (b.fehl) fehl++; for (const l of b.linien) { L += Geo.abstand(l[0], l[1]); nL++; } }
      const k = [
        [{ de: "Schnitte", en: "Cuts" }, `${nL} / ${z.plan.length}`],
        [{ de: "Blöcke", en: "Blocks" }, String(z.bloecke.length)],
        [{ de: "Parzellen", en: "Parcels" }, String(parz)],
        [{ de: "mittlere Schnittlänge", en: "Mean cut length" }, nL ? zahl(L / nL, 1) + " m" : "–"]
      ];
      if (fehl) k.push([{ de: "Blöcke ohne gültigen Schnitt", en: "Blocks without valid cut" }, String(fehl)]);
      const w = z.bloecke[z.wahl];
      if (w) {
        const fl = Modell.parzellenVon(w).map(Geo.flaeche);
        k.push([{ de: "gewählter Block", en: "Selected block" }, zahl(w.A) + " m²"]);
        k.push([{ de: "Zielflächen", en: "Target areas" }, w.ziele.length ? w.ziele.map(a => zahl(a)).join(" · ") + " m²" : "–"]);
        k.push([{ de: "Parzellenflächen", en: "Parcel areas" }, fl.map(a => zahl(a)).join(" · ") + " m²"]);
      } else k.push([{ de: "Block wählen", en: "Select block" }, { de: "Klick in einen Block", en: "click a block" }]);
      return k;
    }
  });
})();
