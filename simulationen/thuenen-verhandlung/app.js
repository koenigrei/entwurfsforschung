/* Verhandlungsmodell für die Landnutzung nach v. Thünen · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const G = [{ de: "Produkt A · Gelb", en: "Product A · yellow" }, { de: "Produkt B · Grün", en: "Product B · green" }, { de: "Produkt C · Weiß", en: "Product C · white" }];
  const VERT = { de: "Verhandlung", en: "Negotiation" }, DARST = { de: "Darstellung", en: "Display" };
  const regler = [];
  ["A", "B", "C"].forEach((n, j) => regler.push(
    { id: "ertrag" + n, gruppe: G[j], name: { de: "Anbauertrag", en: "Yield" }, min: 1, max: 10000, wert: S["ertrag" + n] },
    { id: "kosten" + n, gruppe: G[j], name: { de: "Erzeugungskosten", en: "Production cost" }, min: 1, max: 1000, wert: S["kosten" + n] },
    { id: "preis" + n, gruppe: G[j], name: { de: "Marktpreis", en: "Market price" }, min: 1, max: 1000, wert: S["preis" + n] },
    { id: "transport" + n, gruppe: G[j], name: { de: "Transportkosten", en: "Transport cost" }, min: 1, max: 500, wert: S["transport" + n] }));

  // Beispiele aus der Dissertation (Abb. 28 und 29): jeweils vollständige Einstellung, damit der Wechsel eindeutig ist
  const grund = { anteilA: 25, anteilB: 25, anteilC: 25, tauschradius: 40, maerkte: 1,
    ertragA: 2500, kostenA: 10, preisA: 400, transportA: 5, ertragB: 500, kostenB: 1, preisB: 900, transportB: 6, ertragC: 2000, kostenC: 6, preisC: 400, transportC: 3 };
  const abb29 = Object.assign({}, grund, { maerkte: 3, ertragA: 2726, transportA: 3, transportB: 4, transportC: 2 });
  const beispiele = {
    abb28l: grund,
    abb28m: Object.assign({}, grund, { maerkte: 5, anteilA: 92, anteilB: 4, anteilC: 4 }),
    abb28r: Object.assign({}, grund, { maerkte: 12, ertragB: 499, kostenB: 375 }),
    abb29a: Object.assign({}, abb29, { tauschradius: 2 }),
    abb29b: Object.assign({}, abb29, { tauschradius: 5 }),
    abb29c: Object.assign({}, abb29, { tauschradius: 10 })
  };

  // Farben wie im Original (RectanglPaint): Helligkeit = Lagerente, begrenzt auf 110…255 → hell nur bei positiver Rente.
  // A: (h, h, 0), B: (10, h, 10), C: (h, h, h); in heller Darstellung wird „Weiß“ etwas abgedunkelt.
  function farbe(u, r, dunkel) {
    const h = r > 255 ? 255 : r < 110 ? 110 : Math.round(r);
    if (u === 0) return [h, h, 0];
    if (u === 1) return [10, h, 10];
    const w = dunkel ? h : Math.round(h * 0.72);
    return [w, w, w];
  }
  const ROT = "#e5484d";
  const zahl = (v, n = 0) => v.toLocaleString(document.documentElement.lang === "en" ? "en" : "de", { maximumFractionDigits: n, minimumFractionDigits: n });

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 10, wert: 1 },
    parameter: [
      { id: "beispiel", gruppe: VERT, name: { de: "Beispiel", en: "Example" }, art: "auswahl", wert: S.beispiel,
        optionen: [
          { wert: "eigen", name: { de: "eigene Einstellung", en: "own settings" } },
          { wert: "abb28l", name: { de: "Abb. 28 links: 1 Markt, je 25 %", en: "Fig. 28 left: 1 market, 25 % each" } },
          { wert: "abb28m", name: { de: "Abb. 28 Mitte: 5 Märkte, 92/4/4 %", en: "Fig. 28 centre: 5 markets, 92/4/4 %" } },
          { wert: "abb28r", name: { de: "Abb. 28 rechts: 12 Märkte", en: "Fig. 28 right: 12 markets" } },
          { wert: "abb29a", name: { de: "Abb. 29: Tauschradius 2", en: "Fig. 29: exchange radius 2" } },
          { wert: "abb29b", name: { de: "Abb. 29: Tauschradius 5", en: "Fig. 29: exchange radius 5" } },
          { wert: "abb29c", name: { de: "Abb. 29: Tauschradius 10", en: "Fig. 29: exchange radius 10" } }
        ],
        folgen: beispiele },
      { id: "maerkte", gruppe: VERT, name: { de: "Märkte zu Beginn", en: "Markets at start" }, min: 0, max: 12, wert: S.maerkte, neustart: true },
      { id: "anteilA", gruppe: VERT, name: { de: "Anzahl Gelb in %", en: "Share yellow %" }, min: 0, max: 100, wert: S.anteilA, neustart: true },
      { id: "anteilB", gruppe: VERT, name: { de: "Anzahl Grün in %", en: "Share green %" }, min: 0, max: 100, wert: S.anteilB, neustart: true },
      { id: "anteilC", gruppe: VERT, name: { de: "Anzahl Weiß in %", en: "Share white %" }, min: 0, max: 100, wert: S.anteilC, neustart: true },
      { id: "tauschradius", gruppe: VERT, name: { de: "Tauschradius (Zellen)", en: "Exchange radius (cells)" }, min: 1, max: 200, wert: S.tauschradius },
      { id: "ansicht", gruppe: DARST, name: { de: "Anzeige", en: "Show" }, art: "auswahl", wert: S.ansicht,
        optionen: [{ wert: "nutzung", name: { de: "Nutzungen", en: "Land uses" } }, { wert: "rente", name: { de: "pos. Lagerente", en: "Positive rent" } }, { wert: "distanz", name: { de: "Distanzen", en: "Distances" } }] },
      { id: "bewegen", gruppe: DARST, name: { de: "Märkte bewegen", en: "Move markets" }, art: "schalter", wert: S.bewegen },
      ...regler
    ],
    aktionen: [{ name: { de: "Märkte löschen", en: "Delete markets" }, tue: (z, p) => { z.maerkte.length = 0; Modell.aendere(z, p); } }],
    groesse: z => ({ b: z.breite, h: z.hoehe }),
    ende: (z, p) => !p.bewegen && z.ruhe >= 25,                // stabiler Zustand: 25 Schritte ohne Tausch
    klick(z, p, x, y, taste, phase) {
      if (phase !== "unten") return;
      if (taste === "rechts") Modell.entferneMarkt(z, x, y); else Modell.setzeMarkt(z, x, y);
      Modell.aendere(z, p);
    },
    zeichne(ctx, z, p, F) {
      const leer = F.rgb.flaeche;
      let rmax = 1; if (p.ansicht === "rente") for (let n = 0; n < z.rente.length; n++) if (z.rente[n] > rmax) rmax = z.rente[n];
      Sim.raster(ctx, z.spalten, z.zeilen, d => {
        for (let n = 0; n < z.nutzung.length; n++) {
          const u = z.nutzung[n]; let c;
          if (p.ansicht === "distanz") c = Sim.mische(leer, F.rgb.tinte, Math.max(0, 255 - z.distanz[n] / 2) / 255);
          else if (p.ansicht === "rente") c = z.rente[n] > 0 ? Sim.mische(leer, F.rgb.tinte, 0.15 + 0.85 * z.rente[n] / rmax) : leer;
          else c = u === Modell.LEER ? leer : farbe(u, z.rente[n], F.dunkel);
          d[4 * n] = c[0]; d[4 * n + 1] = c[1]; d[4 * n + 2] = c[2]; d[4 * n + 3] = 255;
        }
      }, 0, 0, z.breite, z.hoehe);
      ctx.strokeStyle = F.papier; ctx.globalAlpha = 0.35; ctx.lineWidth = F.px; ctx.beginPath();   // Zellraster wie im Original (feine Linien)
      for (let k = 1; k < z.spalten; k++) { ctx.moveTo(k * z.zelle, 0); ctx.lineTo(k * z.zelle, z.hoehe); }
      for (let i = 1; i < z.zeilen; i++) { ctx.moveTo(0, i * z.zelle); ctx.lineTo(z.breite, i * z.zelle); }
      ctx.stroke(); ctx.globalAlpha = 1;
      for (const m of z.maerkte) {
        ctx.fillStyle = ROT; ctx.beginPath(); ctx.arc(m.x, m.y, 5, 0, 2 * Math.PI); ctx.fill();
        ctx.strokeStyle = F.papier; ctx.lineWidth = 1.5 * F.px; ctx.stroke();
      }
    },
    legende(F, p) {
      if (p.ansicht !== "nutzung") return [[F.tinte, p.ansicht === "rente" ? { de: "hohe Lagerente", en: "high rent" } : { de: "nah am Markt", en: "close to market" }], [ROT, { de: "Markt", en: "Market" }]];
      const c = j => Sim.css(farbe(j, 1e9, F.dunkel)), d = j => Sim.css(farbe(j, 0, F.dunkel));
      return [[c(0), { de: "A", en: "A" }], [c(1), { de: "B", en: "B" }], [c(2), { de: "C", en: "C" }],
              [d(0), { de: "gedämpft: Lagerente ≤ 0", en: "dimmed: rent ≤ 0" }], [F.flaeche, { de: "leer", en: "empty" }], [ROT, { de: "Markt", en: "Market" }]];
    },
    kennzahlen(z) {
      const a = Modell.anteile(z), e = Modell.mittlereEntfernung(z), pz = v => zahl(v, 1) + " %";
      const ent = j => isNaN(e[j]) ? "–" : zahl(e[j]);
      return [
        [{ de: "Märkte", en: "Markets" }, String(z.maerkte.length)],
        [{ de: "Tausche im Schritt", en: "Exchanges this step" }, String(z.tausche)],
        [{ de: "Fläche A · B · C", en: "Area A · B · C" }, `${zahl(a[0])} · ${zahl(a[1])} · ${zahl(a[2])} %`],
        [{ de: "positive Lagerente", en: "positive rent" }, z.besetzt ? pz(100 * z.positiv / z.besetzt) : "–"],
        [{ de: "Summe Lagerenten (Mio.)", en: "Sum of rents (million)" }, zahl(z.gesamt / 1e6, 1)],
        [{ de: "mittl. Entfernung A · B · C (px)", en: "mean distance A · B · C (px)" }, `${ent(0)} · ${ent(1)} · ${ent(2)}`],
        [{ de: "ohne Tausch seit", en: "no exchange for" }, z.ruhe ? String(z.ruhe) : "–"]
      ];
    }
  });
})();
