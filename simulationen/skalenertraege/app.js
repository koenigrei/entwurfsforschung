/* Skalenerträge · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const EIN = { de: "Einstellungen", en: "Settings" }, DARST = { de: "Darstellung", en: "Display" };
  // Farben der Märkte wie im Original (TAgent.Paint): clSkyBlue, clBlue, clYellow, clGreen, clTeal, clNavy, clLime, clFuchsia, clAqua, clPurple;
  // weitere (per Klick gesetzte) Märkte bekommen Farben aus einem Farbkreis
  const DELPHI = [[166, 202, 240], [0, 0, 255], [255, 255, 0], [0, 128, 0], [0, 128, 128], [0, 0, 128], [0, 255, 0], [255, 0, 255], [0, 255, 255], [128, 0, 128]];
  function marktFarbe(i) {
    if (i < DELPHI.length) return DELPHI[i];
    const h = (i * 137.5) % 360, f = n => { const k = (n + h / 30) % 12; return Math.round(255 * (0.55 - 0.4 * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
    return [f(0), f(8), f(4)];
  }
  const ROT = "#e5484d";
  const zahl = (v, n = 0) => v.toLocaleString(document.documentElement.lang === "en" ? "en" : "de", { maximumFractionDigits: n, minimumFractionDigits: n });

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 20, wert: 1 },
    parameter: [
      { id: "produktionskosten", gruppe: EIN, name: { de: "Produktionskosten", en: "Production cost" }, min: 1, max: 1000, wert: S.produktionskosten },
      { id: "fahrtkosten", gruppe: EIN, name: { de: "Fahrtkosten", en: "Travel cost" }, min: 0.001, max: 0.1, schritt: 0.001, wert: S.fahrtkosten },
      { id: "skalenertrag", gruppe: EIN, name: { de: "Skalenertrag", en: "Returns to scale" }, min: 0.996, max: 1.026, schritt: 0.0002, wert: S.skalenertrag },
      { id: "maerkte", gruppe: EIN, name: { de: "Anzahl Märkte", en: "Number of markets" }, min: 2, max: 20, wert: S.maerkte, neustart: true },
      { id: "ansicht", gruppe: DARST, name: { de: "Anzeige", en: "Show" }, art: "auswahl", wert: S.ansicht,
        optionen: [{ wert: "gebiete", name: { de: "Einzugsgebiete", en: "Market areas" } }, { wert: "preise", name: { de: "relativer Preis", en: "Relative price" } }] },
      { id: "bewegen", gruppe: DARST, name: { de: "Märkte bewegen", en: "Move markets" }, art: "schalter", wert: S.bewegen }
    ],
    groesse: z => ({ b: z.breite, h: z.hoehe }),
    ende: z => z.ruhig,                                         // Gleichgewicht: kein Kunde wechselt mehr den Markt
    klick(z, p, x, y, taste, phase) {
      if (phase !== "unten") return;
      if (taste === "rechts") Modell.entferneMarkt(z, x, y); else Modell.setzeMarkt(z, p, x, y);
      Modell.einzugsgebiete(z, p, true);
    },
    zeichne(ctx, z, p, F) {
      const leer = F.rgb.flaeche, farben = z.maerkte.map(m => marktFarbe(m.farbe));
      let lo = Infinity, hi = -Infinity;
      if (p.ansicht === "preise") for (let c = 0; c < z.kosten.length; c++) { if (z.markt[c] < 0) continue; lo = Math.min(lo, z.kosten[c]); hi = Math.max(hi, z.kosten[c]); }
      Sim.raster(ctx, z.spalten, z.zeilen, d => {
        for (let c = 0; c < z.markt.length; c++) {
          const u = z.markt[c];
          const f = u < 0 ? leer : p.ansicht === "preise" ? Sim.mische(F.rgb.tinte, leer, hi > lo ? (z.kosten[c] - lo) / (hi - lo) : 0) : farben[u];
          d[4 * c] = f[0]; d[4 * c + 1] = f[1]; d[4 * c + 2] = f[2]; d[4 * c + 3] = 255;
        }
      }, 0, 0, z.breite, z.hoehe);
      ctx.strokeStyle = "#000"; ctx.globalAlpha = 0.25; ctx.lineWidth = F.px; ctx.beginPath();   // schwarze Zellränder des Originals, abgeschwächt
      for (let k = 1; k < z.spalten; k++) { ctx.moveTo(k * z.zelle, 0); ctx.lineTo(k * z.zelle, z.hoehe); }
      for (let i = 1; i < z.zeilen; i++) { ctx.moveTo(0, i * z.zelle); ctx.lineTo(z.breite, i * z.zelle); }
      ctx.stroke(); ctx.globalAlpha = 1;
      z.maerkte.forEach((m, i) => {                              // Markt: roter Ring, innen die Farbe seines Gebiets
        ctx.fillStyle = ROT; ctx.beginPath(); ctx.arc(m.x, m.y, 6, 0, 2 * Math.PI); ctx.fill();
        ctx.fillStyle = Sim.css(farben[i]); ctx.beginPath(); ctx.arc(m.x, m.y, 3.5, 0, 2 * Math.PI); ctx.fill();
      });
    },
    legende(F, p) {
      if (p.ansicht === "preise") return [[F.tinte, { de: "billig", en: "cheap" }], [F.flaeche, { de: "teuer", en: "expensive" }], [ROT, { de: "Markt", en: "Market" }]];
      return [[Sim.css(DELPHI[2]), { de: "Farbe = Einzugsgebiet eines Marktes", en: "colour = market area" }], [ROT, { de: "Markt", en: "Market" }]];
    },
    kennzahlen(z) {
      const a = Modell.anteile(z), aktiv = a.filter(v => v > 0).length;
      const preise = z.maerkte.map(m => m.preis), lo = Math.min(...preise), hi = Math.max(...preise);
      return [
        [{ de: "Märkte mit Kunden", en: "Markets with customers" }, `${aktiv} / ${z.maerkte.length}`],
        [{ de: "größtes Einzugsgebiet", en: "largest market area" }, a.length ? zahl(a[0], 1) + " %" : "–"],
        [{ de: "drei größte zusammen", en: "three largest together" }, a.length ? zahl(a.slice(0, 3).reduce((s, v) => s + v, 0), 1) + " %" : "–"],
        [{ de: "Angebotspreise", en: "Offer prices" }, z.maerkte.length ? `${zahl(lo, 2)} – ${zahl(hi, 2)}` : "–"],
        [{ de: "Kunden mit Wechsel", en: "Customers switching" }, z.t ? String(z.wechsel) : "–"],
        [{ de: "Gleichgewicht", en: "Equilibrium" }, z.ruhig ? { de: "erreicht", en: "reached" } : { de: "noch nicht", en: "not yet" }]
      ];
    }
  });
})();
