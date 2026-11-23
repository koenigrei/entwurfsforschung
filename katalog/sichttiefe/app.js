/* Sichttiefe (Visibility Step Depth) · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const de = () => document.documentElement.lang !== "en";
  const zahl = (v, n = 0) => isFinite(v) ? v.toLocaleString(de() ? "de" : "en", { minimumFractionDigits: n, maximumFractionDigits: n }) : "–";
  const css = c => `rgb(${c[0]},${c[1]},${c[2]})`;
  /** feste Farbe je Sichttiefe: 1 blau … 5 rot (Skala „spektral“), ab 6 dunkelrot */
  const TIEFE = [1, 2, 3, 4, 5].map(d => Karte.farbeRGB((d - 1) / 4, "spektral")).concat([[128, 0, 38]]);
  const farbeTiefe = d => TIEFE[Math.min(TIEFE.length, d) - 1];
  const OFFEN = F => F.dunkel ? [34, 35, 66] : [229, 230, 251];
  const UNERREICHT = F => F.dunkel ? [70, 70, 76] : [176, 176, 184];
  const gebFarbe = F => F.dunkel ? "#2c2c31" : "#d9d9de", gebStrich = F => F.dunkel ? "#55555d" : "#a9a9b1";

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 5, wert: 1 },
    parameter: [
      { id: "zelle", gruppe: { de: "visualGraphGrid", en: "visualGraphGrid" }, name: { de: "Zellgröße (gridSize) m", en: "Grid size (m)" }, min: 1, max: 10, schritt: 0.5, wert: S.zelle },
      { id: "szene", gruppe: { de: "Szene", en: "Scene" }, art: "auswahl", name: { de: "Hindernisse", en: "Obstacles" }, wert: S.szene, neustart: true,
        optionen: [{ wert: "stadt", name: { de: "Beispielstadt", en: "Sample city" } }, { wert: "rechtecke", name: { de: "Zufallsrechtecke (synthetize buildings)", en: "Random rectangles (synthetize buildings)" } }] },
      { id: "rechtecke", name: { de: "Zahl der Rechtecke (Populate 2D)", en: "Number of rectangles (Populate 2D)" }, min: 0, max: 100, schritt: 1, wert: S.rechtecke, neustart: true },
      { id: "mehrere", gruppe: { de: "Startpunkte", en: "Start points" }, art: "schalter", name: { de: "Klick fügt Startpunkt hinzu", en: "Click adds a start point" }, wert: S.mehrere },
      { id: "zeigeWeg", gruppe: { de: "Darstellung", en: "Display" }, art: "schalter", name: { de: "Weg der wenigsten Richtungswechsel", en: "Path with fewest turns" }, wert: S.zeigeWeg }
    ],
    aktionen: [
      { name: { de: "Alle Stufen", en: "All levels" }, tue: z => Modell.rechneAlle(z) },
      { name: { de: "Ein Startpunkt", en: "Single start" }, tue: z => { z.startPunkte = z.startPunkte.slice(0, 1); Modell.neu(z); } }
    ],
    groesse: z => ({ b: z.b, h: z.h }),
    klick(z, p, x, y, taste, phase) {
      if (taste === "rechts") { Modell.waehleZiel(z, [x, y]); return; }
      if (phase === "unten") Modell.setzeStart(z, [x, y], p.mehrere);
      else Modell.verschiebeStart(z, [x, y]);
    },
    ende: z => Modell.fertig(z),
    zeichne(ctx, z, p, F) {
      const px = F.px, R = z.R, fertig = Modell.fertig(z), offen = fertig ? UNERREICHT(F) : OFFEN(F);
      Sim.raster(ctx, R.nx, R.ny, d => {
        for (let k = 0; k < R.nx * R.ny; k++) {
          const i = 4 * k;
          if (R.gesperrt[k]) { d[i + 3] = 0; continue; }
          const t = z.tiefe[k], f = t < 0 ? offen : t === 0 ? F.rgb.akzent : farbeTiefe(t);
          d[i] = f[0]; d[i + 1] = f[1]; d[i + 2] = f[2]; d[i + 3] = 255;
        }
      }, 0, 0, R.nx * R.cs, R.ny * R.cs);
      for (const g of z.szene.gebaeude) Karte.poly(ctx, g, gebFarbe(F), gebStrich(F), px * 0.6);
      ctx.strokeStyle = F.gedaempft; ctx.lineWidth = px; ctx.strokeRect(0, 0, z.b, z.h);
      // Weg der wenigsten Richtungswechsel (Sichtlinien über die Vorgänger der Breitensuche)
      const ziel = Modell.zielZelle(z);
      if (p.zeigeWeg && ziel >= 0) {
        const W = Modell.weg(z, ziel).map(k => Modell.zellMitte(R, k));
        Karte.linie(ctx, W, F.dunkel ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.85)", px * 4.5);
        Karte.linie(ctx, W, F.tinte, px * 2);
        for (let i = 1; i < W.length - 1; i++) Karte.punkt(ctx, W[i], 3.5 * px, F.papier, F.tinte, px * 1.5);
        const q = W[W.length - 1], d = z.tiefe[ziel];
        Karte.punkt(ctx, q, 4 * px, F.tinte);
        const txt = de() ? `Tiefe ${d} · ${Math.max(0, d - 1)} Richtungswechsel` : `depth ${d} · ${Math.max(0, d - 1)} turn${d - 1 === 1 ? "" : "s"}`;
        const links = q[0] > z.b * 0.7;
        ctx.save(); ctx.font = `500 12px "Geist Mono", ui-monospace, monospace`; const w = ctx.measureText(txt).width; ctx.restore();
        const x0 = links ? q[0] - (w + 18) * px : q[0] + 8 * px, y0 = q[1] - 22 * px;
        ctx.fillStyle = F.dunkel ? "rgba(0,0,0,0.75)" : "rgba(255,255,255,0.88)"; ctx.fillRect(x0, y0, (w + 10) * px, 18 * px);
        Karte.text(ctx, txt, [x0 + 5 * px, y0 + 9 * px], F.tinte, px, 12);
      }
      // Startpunkte (Start points) und ihre Zellen
      for (const k of z.start) { const m = Modell.zellMitte(R, k); ctx.strokeStyle = F.tinte; ctx.lineWidth = px * 1.5; ctx.strokeRect(m[0] - R.cs / 2, m[1] - R.cs / 2, R.cs, R.cs); }
      for (const q of z.startPunkte) Karte.punkt(ctx, q, 5 * px, F.akzent, F.tinte, px * 1.2);
    },
    legende: (F, p, z) => {
      const L = [[F.akzent, { de: "Start (0)", en: "Start (0)" }]];
      for (let d = 1; d <= Math.max(1, Math.min(6, z.stufe)); d++) L.push([css(farbeTiefe(d)), d === 6 ? "6+" : String(d)]);
      L.push([css(Modell.fertig(z) ? UNERREICHT(F) : OFFEN(F)), Modell.fertig(z) ? { de: "nicht erreichbar (+∞)", en: "unreachable (+∞)" } : { de: "noch offen", en: "pending" }],
        [gebFarbe(F), { de: "Gebäude", en: "Buildings" }]);
      return L;
    },
    kennzahlen: (z) => {
      const R = z.R, ziel = Modell.zielZelle(z);
      const L = [
        [{ de: "Zellen im Graphen (vertexCount)", en: "Cells in graph (vertexCount)" }, zahl(R.frei)],
        [{ de: "Startzellen", en: "Start cells" }, zahl(z.start.length)],
        [{ de: "Tiefenstufe", en: "Depth level" }, zahl(z.stufe) + (Modell.fertig(z) ? (de() ? " (fertig)" : " (done)") : "")],
        [{ de: "erreicht", en: "Reached" }, `${zahl(z.erreicht)} · ${zahl(R.frei ? 100 * z.erreicht / R.frei : 0)} %`],
        [{ de: "mittlere Sichttiefe", en: "Mean step depth" }, zahl(Modell.mittel(z), 2)]
      ];
      if (Modell.fertig(z)) L.push([{ de: "nicht erreichbar (+∞)", en: "Unreachable (+∞)" }, zahl(R.frei - z.erreicht)]);
      z.jeStufe.forEach((n, d) => { if (d > 0) L.push([{ de: `Tiefe ${d} (${d - 1} Richtungsw.)`, en: `Depth ${d} (${d - 1} turn${d === 2 ? "" : "s"})` }, zahl(n)]); });
      if (ziel >= 0) L.push([z.ziel >= 0 ? { de: "gewählte Zelle: Tiefe", en: "Selected cell: depth" } : { de: "tiefste Zelle: Tiefe", en: "Deepest cell: depth" }, zahl(z.tiefe[ziel])],
        [{ de: "… Richtungswechsel", en: "… turns" }, zahl(z.tiefe[ziel] - 1)]);
      return L;
    }
  });
})();
