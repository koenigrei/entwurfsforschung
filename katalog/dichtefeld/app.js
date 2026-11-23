/* Dichtefeld · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const de = () => document.documentElement.lang !== "en";
  const zahl = (v, n = 2) => isFinite(v) ? v.toLocaleString(de() ? "de" : "en", { minimumFractionDigits: n, maximumFractionDigits: n }) : "–";
  const css = c => `rgb(${c[0]},${c[1]},${c[2]})`;
  /** Abstand der beiden Karten in m */
  const LUECKE = 40;
  const OFFEN = F => F.dunkel ? [30, 31, 52] : [229, 230, 251];
  const gebFarbe = F => F.dunkel ? "rgba(12,12,14,0.78)" : "rgba(28,28,34,0.55)";
  const gebStrich = F => F.dunkel ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.3)";
  /** obere Grenze der Farbskala: 1 wie „Gradient“ der .gh-Datei oder größter Wert beider Karten */
  function obergrenze(z, p) {
    if (p.skala !== "spanne") return 1;
    const a = Modell.statistik(z, 0).max, b = p.vergleich ? Modell.statistik(z, 1).max : -Infinity, m = Math.max(a, b);
    return isFinite(m) && m > 0 ? m : 1;
  }

  function karte(ctx, z, p, F, m, ox, oben) {
    const px = F.px, R = z.R, W = z.werte[m], r = m === 0 ? p.radius : p.radius2, leer = OFFEN(F);
    ctx.save(); ctx.translate(ox, 0);
    Sim.raster(ctx, R.nx, R.ny, d => {
      for (let k = 0; k < R.nx * R.ny; k++) {
        const v = W[k], f = isFinite(v) ? Modell.verlauf(v / oben) : leer, i = 4 * k;
        d[i] = f[0]; d[i + 1] = f[1]; d[i + 2] = f[2]; d[i + 3] = 255;
      }
    }, 0, 0, z.b, z.h);
    if (!Modell.fertig(z)) { ctx.fillStyle = F.akzent; ctx.globalAlpha = 0.8; ctx.fillRect(0, z.zeile * R.ch, z.b, R.ch); ctx.globalAlpha = 1; }
    if (R.cw / px >= 5) {
      ctx.beginPath();
      for (let i = 1; i < R.nx; i++) { ctx.moveTo(i * R.cw, 0); ctx.lineTo(i * R.cw, z.h); }
      for (let j = 1; j < R.ny; j++) { ctx.moveTo(0, j * R.ch); ctx.lineTo(z.b, j * R.ch); }
      ctx.strokeStyle = F.dunkel ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.5)"; ctx.lineWidth = px * 0.6; ctx.stroke();
    }
    for (const g of z.szene.gebaeude) Karte.poly(ctx, g, gebFarbe(F), null);
    ctx.beginPath(); for (const g of z.szene.gebaeude) Karte.pfad(ctx, g, true);
    ctx.strokeStyle = gebStrich(F); ctx.lineWidth = px * 0.5; ctx.stroke();
    ctx.strokeStyle = F.gedaempft; ctx.lineWidth = px; ctx.strokeRect(0, 0, z.b, z.h);
    // gewählte Zelle: Suchradius und die Gebäude, deren Schwerpunkt darin liegt
    if (z.auswahl >= 0) {
      const q = Modell.zellMitte(R, z.auswahl);
      for (const i of Modell.gezaehlte(z, z.auswahl, r)) Karte.poly(ctx, z.szene.gebaeude[i], "rgba(255,255,255,0.85)", F.dunkel ? null : "rgba(0,0,0,0.6)", px * 0.6);
      Karte.punkt(ctx, q, r, F.dunkel ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", F.tinte, px * 1.5);
      ctx.strokeStyle = F.tinte; ctx.lineWidth = px * 1.5; ctx.strokeRect(q[0] - R.cw / 2, q[1] - R.ch / 2, R.cw, R.ch);
      Karte.punkt(ctx, q, 3 * px, F.tinte);
      Karte.text(ctx, `GSI ${zahl(W[z.auswahl])}`, [q[0] + 8 * px, q[1] - 12 * px], F.tinte, px, 12);
    }
    // Beschriftung der Karte
    const t = `R = ${zahl(r, 0)} m`;
    ctx.fillStyle = F.dunkel ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.85)"; ctx.fillRect(6 * px, 6 * px, (t.length * 7.4 + 12) * px, 20 * px);
    Karte.text(ctx, t, [12 * px, 16 * px], F.tinte, px, 12);
    ctx.restore();
  }

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 20, wert: 1 },
    parameter: [
      { id: "zelleX", gruppe: { de: "Raster", en: "Grid" }, name: { de: "Zellmaß X (Grid X Dimension) m", en: "Grid X dimension (m)" }, min: 5, max: 100, schritt: 1, wert: S.zelleX },
      { id: "zelleY", name: { de: "Zellmaß Y (Grid Y Dimension) m", en: "Grid Y dimension (m)" }, min: 5, max: 100, schritt: 1, wert: S.zelleY },
      { id: "radius", gruppe: { de: "Suchradius", en: "Search radius" }, name: { de: "Suchradius (Search Redius) m", en: "Search radius (m)" }, min: 10, max: 1000, schritt: 5, wert: S.radius },
      { id: "vergleich", art: "schalter", name: { de: "Vergleich mit zweitem Radius", en: "Compare with second radius" }, wert: S.vergleich, groesseNeu: true },
      { id: "radius2", name: { de: "zweiter Radius m", en: "Second radius (m)" }, min: 10, max: 1000, schritt: 5, wert: S.radius2 },
      { id: "skala", gruppe: { de: "Darstellung", en: "Display" }, art: "auswahl", name: { de: "Farbskala", en: "Colour scale" }, wert: S.skala,
        optionen: [{ wert: "fest", name: { de: "0 … 1 (wie „Gradient“)", en: "0 … 1 (as “Gradient”)" } }, { wert: "spanne", name: { de: "0 … größter Wert", en: "0 … largest value" } }] }
    ],
    groesse: (z, p) => ({ b: p.vergleich ? 2 * z.b + LUECKE : z.b, h: z.h }),
    klick(z, p, x, y) {
      if (p.vergleich && x > z.b + LUECKE / 2) x -= z.b + LUECKE;
      Modell.waehle(z, Modell.zelleBei(z.R, [x, y]));
    },
    ende: z => Modell.fertig(z),
    zeichne(ctx, z, p, F) {
      const oben = obergrenze(z, p);
      karte(ctx, z, p, F, 0, 0, oben);
      if (p.vergleich) karte(ctx, z, p, F, 1, z.b + LUECKE, oben);
    },
    legende: (F, p, z) => {
      const oben = obergrenze(z, p);
      return [0, 0.25, 0.5, 0.75, 1].map((t, i) => [css(Modell.verlauf(t)), i === 0 ? "GSI 0" : i === 4 ? zahl(oben) : ""])
        .concat([[gebFarbe(F), { de: "Gebäude", en: "Buildings" }], [css(OFFEN(F)), { de: "noch offen", en: "pending" }]]);
    },
    kennzahlen: (z, p) => {
      const R = z.R, a = Modell.statistik(z, 0), b = Modell.statistik(z, 1);
      const L = [
        [{ de: "Zellen", en: "Cells" }, `${R.nx} × ${R.ny} = ${R.nx * R.ny}`],
        [{ de: "Zellgröße", en: "Cell size" }, `${zahl(R.cw, 1)} × ${zahl(R.ch, 1)} m`],
        [{ de: "berechnete Zeilen", en: "Rows computed" }, `${Math.min(z.zeile, R.ny)} / ${R.ny}`],
        [{ de: "Gebäude", en: "Buildings" }, String(z.D.n)],
        [{ de: "GSI des ganzen Gebiets", en: "GSI of the whole area" }, zahl(z.gsiGesamt)],
        [{ de: `R ${zahl(p.radius, 0)} m: Mittel`, en: `R ${zahl(p.radius, 0)} m: mean` }, zahl(a.mittel)],
        [{ de: "… Streuung (σ)", en: "… deviation (σ)" }, zahl(a.std)],
        [{ de: "… kleinster – größter", en: "… min – max" }, `${zahl(a.min)} – ${zahl(a.max)}`]
      ];
      if (p.vergleich) L.push(
        [{ de: `R ${zahl(p.radius2, 0)} m: Mittel`, en: `R ${zahl(p.radius2, 0)} m: mean` }, zahl(b.mittel)],
        [{ de: "… Streuung (σ)", en: "… deviation (σ)" }, zahl(b.std)],
        [{ de: "… kleinster – größter", en: "… min – max" }, `${zahl(b.min)} – ${zahl(b.max)}`]);
      if (z.auswahl >= 0) {
        const q = Modell.zellMitte(R, z.auswahl);
        for (const r of (p.vergleich ? [p.radius, p.radius2] : [p.radius])) {
          const s = Modell.summeImRadius(z.D, q, r);
          L.push([{ de: `gewählte Zelle, R ${zahl(r, 0)} m: Gebäude`, en: `Selected cell, R ${zahl(r, 0)} m: buildings` }, String(s.anzahl)],
            [{ de: "… Σ Grundflächen", en: "… Σ footprints" }, zahl(s.summe, 0) + " m²"],
            [{ de: `… GSI = Σ / (π · ${zahl(r, 0)}²)`, en: `… GSI = Σ / (π · ${zahl(r, 0)}²)` }, zahl(Modell.gsi(z.D, q, r))]);
        }
      }
      return L;
    }
  });
})();
