/* Alonsos Modell der Standortwahl der Betriebe · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const NUTZ = { de: "Eigenschaften der Nutzung", en: "Properties of the land use" }, BODEN = { de: "Bodenpreisfunktion", en: "Land price function" }, DARST = { de: "Darstellung", en: "Display" };
  const RECHTS = 270, UNTEN = 480, LUECKE = 12;                 // Diagramme rechts (breit) oder unten (schmal), in Bildpunkten des Originals
  const quer = () => window.innerWidth > 900;
  const en = () => document.documentElement.lang === "en";
  const zehntel = v => (v / 10).toLocaleString(en() ? "en" : "de", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  const GELB = "#ffd600", ROT = "#e5484d";
  const farbe = F => ({ V: F.dunkel ? "#5b8cff" : "#1f4fe0", C: F.dunkel ? "#ff6b6b" : "#c92a2a", B: F.dunkel ? "#4cc764" : "#2b8a3e", P: F.dunkel ? "#c8b400" : "#8a7a00" });

  // Die drei Diagramme des Originals (Graph1–3): Verlauf über 21 Zellen = 0…126 px Entfernung vom Markt
  function diagramme(ctx, p, F, x0, y0, w, h) {          // drei Tafeln untereinander
    const FA = farbe(F), fs = 10 * F.px, DMAX = 126;
    const tafeln = [
      { titel: en() ? "Revenue curve V" : "Umsatzkurve V", max: 216, linien: [["V", FA.V]] },
      { titel: en() ? "Production cost C" : "Produktionskosten C", max: 104, linien: [["C", FA.C]] },
      { titel: en() ? "Bid-price curve and land price" : "Bid-Preis-Kurve und Bodenpreis", max: 104, linien: [["B", FA.B], ["P", FA.P]] }
    ];
    const ringe = Modell.standortRinge(p, DMAX);
    ctx.save(); ctx.font = `${fs}px "Geist Mono", ui-monospace, monospace`;
    tafeln.forEach((t, i) => {
      const tw = w, th = (h - 2 * LUECKE) / 3;
      const l = x0 + 2.8 * fs, o = y0 + i * (th + LUECKE) + 1.6 * fs;
      const r = l + tw - 2.8 * fs - 2, u = o + th - 3.2 * fs;
      const sx = d => l + (r - l) * d / DMAX, sy = v => u - (u - o) * Math.max(0, Math.min(t.max, v)) / t.max;
      ctx.strokeStyle = F.linie; ctx.lineWidth = F.px; ctx.beginPath(); ctx.moveTo(l, o); ctx.lineTo(l, u); ctx.lineTo(r, u); ctx.stroke();
      ctx.fillStyle = F.tinte2; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; ctx.fillText(t.titel, l - 2.8 * fs, o - 0.6 * fs);
      ctx.fillStyle = F.gedaempft; ctx.textAlign = "right"; ctx.textBaseline = "middle";
      ctx.fillText(String(t.max), l - 3 * F.px, o); ctx.fillText("0", l - 3 * F.px, u);
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.textAlign = "left"; ctx.fillText("0", l, u + 3 * F.px); ctx.textAlign = "right"; ctx.fillText(String(DMAX), r, u + 3 * F.px); ctx.textAlign = "center";
      ctx.fillText(en() ? "distance (px)" : "Entfernung (px)", (l + r) / 2, u + 3 * F.px);
      ctx.save(); ctx.beginPath(); ctx.rect(l, o - 2, r - l, u - o + 4); ctx.clip();
      for (const [g, f] of t.linien) {
        ctx.strokeStyle = f; ctx.lineWidth = (g === "P" ? 2 : 1.5) * F.px; ctx.beginPath();
        for (let d = 0; d <= DMAX; d++) { const v = Modell.werte(p, d)[g]; d ? ctx.lineTo(sx(d), sy(v)) : ctx.moveTo(sx(d), sy(v)); }
        ctx.stroke();
      }
      if (i === 2) for (const d of ringe) { ctx.fillStyle = GELB; ctx.beginPath(); ctx.arc(sx(d), sy(Modell.werte(p, d).B), 3 * F.px, 0, 2 * Math.PI); ctx.fill(); }
      ctx.restore();
    });
    ctx.restore();
  }

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 10, wert: 1 },
    parameter: [
      { id: "betriebsgroesse", gruppe: NUTZ, name: { de: "Betriebsgröße q", en: "Firm size q" }, min: 1, max: 100, wert: S.betriebsgroesse },
      { id: "transport", gruppe: NUTZ, name: { de: "Transportkosten-Abh. vtrans", en: "Transport cost factor vtrans" }, min: 1, max: 300, wert: S.transport, format: zehntel },
      { id: "kundensens", gruppe: NUTZ, name: { de: "Kundensensibilität vkund", en: "Customer sensitivity vkund" }, min: 1, max: 300, wert: S.kundensens, format: zehntel },
      { id: "gewinn", gruppe: NUTZ, name: { de: "Gewinn G", en: "Profit G" }, min: 1, max: 200, wert: S.gewinn },
      { id: "maxPreis", gruppe: BODEN, name: { de: "Maximalpreis mp", en: "Maximum price mp" }, min: 1, max: 2000, wert: S.maxPreis },
      { id: "preisAbnahme", gruppe: BODEN, name: { de: "Preisabnahme vpt", en: "Price decline vpt" }, min: 1, max: 20, wert: S.preisAbnahme, format: zehntel },
      { id: "anzeige", gruppe: DARST, name: { de: "Anzeige", en: "Show" }, art: "auswahl", wert: S.anzeige,
        optionen: [{ wert: "bid", name: { de: "Bid-Price (Angebote)", en: "Bid price (offers)" } }, { wert: "umsatz", name: { de: "Umsatz", en: "Revenue" } },
                   { wert: "kosten", name: { de: "Produktionskosten", en: "Production cost" } }, { wert: "distanz", name: { de: "Distanzen", en: "Distances" } }] },
      { id: "standorte", gruppe: DARST, name: { de: "Mögliche Standorte (gelb)", en: "Possible locations (yellow)" }, art: "schalter", wert: S.standorte },
      { id: "bewegen", gruppe: DARST, name: { de: "Märkte bewegen", en: "Move markets" }, art: "schalter", wert: S.bewegen },
      { id: "maerkte", gruppe: DARST, name: { de: "Märkte zu Beginn", en: "Markets at start" }, min: 0, max: 12, wert: S.maerkte, neustart: true }
    ],
    aktionen: [{ name: { de: "Märkte löschen", en: "Delete markets" }, tue: (z, p) => { z.maerkte.length = 0; Modell.berechne(z, p); } }],
    groesse: z => quer() ? { b: z.breite + LUECKE + RECHTS, h: z.hoehe } : { b: z.breite, h: z.hoehe + LUECKE + UNTEN },
    klick(z, p, x, y, taste, phase) {
      if (phase !== "unten" || x > z.breite || y > z.hoehe) return;
      if (taste === "rechts") Modell.entferneMarkt(z, x, y); else Modell.setzeMarkt(z, x, y);
      Modell.berechne(z, p);
    },
    zeichne(ctx, z, p, F) {
      const leer = F.rgb.flaeche, tinte = F.rgb.tinte;
      Sim.raster(ctx, z.spalten, z.zeilen, d => {             // RectanglPaint: Graustufe/Grün/Gelb/Rot wie im Original, gelbe Standortzellen
        for (let n = 0; n < z.distanz.length; n++) {
          let c;
          if (p.standorte && z.standort[n]) c = [255, 214, 0];
          else if (p.anzeige === "distanz") c = Sim.mische(leer, tinte, Math.max(0, 255 - z.distanz[n] / 2) / 255);
          else if (p.anzeige === "kosten") c = Sim.mische(leer, [230, 40, 40], Math.max(0, 255 - z.C[n]) / 255);
          else if (p.anzeige === "umsatz") c = Sim.mische(leer, [230, 220, 0], Math.max(0, Math.min(255, z.V[n] * 2)) / 255);
          else c = Sim.mische(leer, F.dunkel ? [40, 220, 70] : [30, 150, 60], Math.max(0, Math.min(255, z.B[n] * 3)) / 255);
          d[4 * n] = c[0]; d[4 * n + 1] = c[1]; d[4 * n + 2] = c[2]; d[4 * n + 3] = 255;
        }
      }, 0, 0, z.breite, z.hoehe);
      for (const m of z.maerkte) { ctx.fillStyle = ROT; ctx.beginPath(); ctx.arc(m.x, m.y, 5, 0, 2 * Math.PI); ctx.fill(); ctx.strokeStyle = F.papier; ctx.lineWidth = 1.5 * F.px; ctx.stroke(); }
      if (ctx.canvas.width > ctx.canvas.height * 1.75) diagramme(ctx, p, F, z.breite + LUECKE, 0, RECHTS, z.hoehe);
      else diagramme(ctx, p, F, 0, z.hoehe + LUECKE, z.breite, UNTEN);
    },
    legende(F, p) {
      const FA = farbe(F), L = [];
      const n = { bid: [F.dunkel ? "#28dc46" : "#1e963c", { de: "hoher Bid-Price", en: "high bid price" }], umsatz: ["#e6dc00", { de: "hoher Umsatz", en: "high revenue" }],
                  kosten: ["#e62828", { de: "niedrige Produktionskosten", en: "low production cost" }], distanz: [F.tinte, { de: "nah am Markt", en: "close to market" }] }[p.anzeige];
      L.push(n);
      if (p.standorte) L.push([GELB, { de: "möglicher Standort (Bid-Price = Bodenpreis)", en: "possible location (bid price = land price)" }]);
      L.push([ROT, { de: "Markt", en: "Market" }], [FA.V, { de: "V", en: "V" }], [FA.C, { de: "C", en: "C" }], [FA.B, { de: "Bid-Price", en: "bid price" }], [FA.P, { de: "Bodenpreis", en: "land price" }]);
      return L;
    },
    kennzahlen(z, p) {
      const r = Modell.standortRinge(p, 1000), w0 = Modell.werte(p, 0);
      return [
        [{ de: "Märkte", en: "Markets" }, String(z.maerkte.length)],
        [{ de: "mögliche Standorte (Zellen)", en: "possible locations (cells)" }, String(z.anzahl)],
        [{ de: "Entfernung der Standorte (px)", en: "distance of locations (px)" }, r.length ? (r.length > 1 ? `${r[0]} – ${r[r.length - 1]}` : String(r[0])) : "–"],
        [{ de: "am Markt: V · C · Bid-Price", en: "at the market: V · C · bid price" }, `${w0.V} · ${w0.C} · ${w0.B}`],
        [{ de: "Bodenpreis am Markt", en: "land price at the market" }, String(w0.P)]
      ];
    }
  });
})();
