/* Thünen-Ringe · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const G = [{ de: "Produkt A · Gelb", en: "Product A · yellow" }, { de: "Produkt B · Grün", en: "Product B · green" }, { de: "Produkt C · Weiß", en: "Product C · white" }];
  const regler = [];
  ["A", "B", "C"].forEach((n, j) => regler.push(
    { id: "ertrag" + n, gruppe: G[j], name: { de: "Anbauertrag", en: "Yield" }, min: 1, max: 10000, wert: S["ertrag" + n] },
    { id: "kosten" + n, gruppe: G[j], name: { de: "Erzeugungskosten", en: "Production cost" }, min: 1, max: 1000, wert: S["kosten" + n] },
    { id: "preis" + n, gruppe: G[j], name: { de: "Marktpreis", en: "Market price" }, min: 1, max: 1000, wert: S["preis" + n] },
    { id: "transport" + n, gruppe: G[j], name: { de: "Transportkosten", en: "Transport cost" }, min: 1, max: 50, wert: S["transport" + n] }));

  // Farben der Produkte wie im Original (Gelb, Grün, Weiß); in heller Darstellung wird „Weiß“ als helles Grau gezeigt
  const produktFarben = F => [[232, 212, 77], [63, 163, 77], F.dunkel ? [242, 242, 242] : [176, 176, 182]];

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 10, wert: 1 },
    parameter: [
      { id: "ansicht", gruppe: { de: "Darstellung", en: "Display" }, name: { de: "Anzeige", en: "Show" }, art: "auswahl", wert: S.ansicht,
        optionen: [{ wert: "ringe", name: { de: "Thünensche Ringe", en: "Thünen rings" } }, { wert: "rente", name: { de: "Lagerente", en: "Location rent" } }, { wert: "distanz", name: { de: "Distanzen", en: "Distances" } }] },
      { id: "bewegen", gruppe: { de: "Darstellung", en: "Display" }, name: { de: "Märkte bewegen", en: "Move markets" }, art: "schalter", wert: S.bewegen },
      { id: "maerkte", gruppe: { de: "Darstellung", en: "Display" }, name: { de: "Märkte zu Beginn", en: "Markets at start" }, min: 0, max: 12, wert: S.maerkte, neustart: true },
      ...regler
    ],
    aktionen: [{ name: { de: "Märkte löschen", en: "Delete markets" }, tue: (z, p) => { z.maerkte.length = 0; Modell.berechne(z, p); } }],
    groesse: z => ({ b: z.breite, h: z.hoehe }),
    klick(z, p, x, y, taste, phase) {
      if (phase !== "unten") return;
      if (taste === "rechts") Modell.entferneMarkt(z, x, y); else Modell.setzeMarkt(z, x, y);
      Modell.berechne(z, p);
    },
    zeichne(ctx, z, p, F) {
      const PF = produktFarben(F), leer = F.rgb.flaeche;
      let rmax = 1; if (p.ansicht === "rente") for (let n = 0; n < z.rente.length; n++) rmax = Math.max(rmax, z.rente[n]);
      Sim.raster(ctx, z.spalten, z.zeilen, (d) => {
        for (let n = 0; n < z.nutzung.length; n++) {
          let c;
          if (p.ansicht === "distanz") { const v = Math.max(0, 255 - z.distanz[n] / 2) / 255; c = Sim.mische(leer, F.rgb.tinte, v); }
          else if (p.ansicht === "rente") c = Sim.mische(leer, F.rgb.tinte, z.rente[n] / rmax);
          else c = z.nutzung[n] === Modell.KEINE ? leer : PF[z.nutzung[n]];
          d[4 * n] = c[0]; d[4 * n + 1] = c[1]; d[4 * n + 2] = c[2]; d[4 * n + 3] = 255;
        }
      }, 0, 0, z.breite, z.hoehe);
      for (const m of z.maerkte) {                       // Märkte: roter Punkt wie im Original, mit Ring im Akzent
        ctx.fillStyle = "#e5484d"; ctx.beginPath(); ctx.arc(m.x, m.y, 4, 0, 2 * Math.PI); ctx.fill();
        ctx.strokeStyle = F.papier; ctx.lineWidth = 1.5 * F.px; ctx.stroke();
      }
    },
    legende(F, p) {
      if (p.ansicht !== "ringe") return [[F.tinte, p.ansicht === "rente" ? { de: "hohe Lagerente", en: "high rent" } : { de: "nah am Markt", en: "close to market" }], ["#e5484d", { de: "Markt", en: "Market" }]];
      const PF = produktFarben(F).map(Sim.css);
      return [[PF[0], { de: "A", en: "A" }], [PF[1], { de: "B", en: "B" }], [PF[2], { de: "C", en: "C" }], [F.flaeche, { de: "ungenutzt", en: "unused" }], ["#e5484d", { de: "Markt", en: "Market" }]];
    },
    kennzahlen(z, p) {
      const a = Modell.anteile(z), f = v => v.toFixed(1).replace(".", ",") + " %";
      const r = Modell.ringfolge(p).map(q => `${Modell.PRODUKTE[q.produkt]} ${q.von}–${q.bis}`).join(" · ") || "–";
      return [[{ de: "Märkte", en: "Markets" }, String(z.maerkte.length)], [{ de: "Fläche A", en: "Area A" }, f(a[0])], [{ de: "Fläche B", en: "Area B" }, f(a[1])],
              [{ de: "Fläche C", en: "Area C" }, f(a[2])], [{ de: "ungenutzt", en: "unused" }, f(a[3])], [{ de: "Ringe (px)", en: "Rings (px)" }, r]];
    }
  });
})();
