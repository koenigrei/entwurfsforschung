/* Interaktionsmodell Standortwahl und Skalenerträge · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const SKALEN = { de: "Skalenerträge", en: "Economies of scale" };
  const SEGR = { de: "Segregation", en: "Segregation" };
  const DARST = { de: "Darstellung", en: "Display" };

  // Farben der Einzugsgebiete wie im Original (TCell.Paint, indM 0–9): clSkyBlue, clBlue, clYellow, clGreen, clTeal,
  // clOlive, clLime, clFuchsia, clAqua, clPurple; Zellen sonst grau 180, Märkte mit rotem Rand, Agenten schwarz/weiß
  const GEBIET = ["#a6caf0", "#0000ff", "#ffff00", "#008000", "#008080", "#808000", "#00ff00", "#ff00ff", "#00ffff", "#800080"].map(Sim.rgb);
  const GRAU = [180, 180, 180], ROT = "#e5484d";
  const UNTEN = 13, RECHTS = 30, LUECKE = 2;
  const quer = () => window.innerWidth > 900;
  const pz = v => (100 * v).toFixed(1).replace(".", ",") + " %";
  const zahl = (v, n = 1) => v.toFixed(n).replace(".", ",");
  const linienFarbe = (m, F) => Sim.css(F.dunkel ? Sim.mische(GEBIET[m], [255, 255, 255], 0.3) : Sim.mische(GEBIET[m], [0, 0, 0], 0.15));

  const modell = Object.assign({}, Modell, {
    aendere(z, p, id) { Modell.aendere(z, p, id); if (id === "verlauf") window.dispatchEvent(new Event("resize")); }
  });

  function diagramm(ctx, z, F, x0, y0, w, h) {
    const fs = 10 * F.px, l = x0, b = x0 + w, o = y0 + fs * 1.6, u = y0 + h - fs * 1.4, hh = u - o;
    const X = Math.max(100, z.t), sx = t => l + w * t / X, sy = v => u - hh * v;
    const T = z.verlauf.length, schritt = Math.max(1, Math.ceil(T / 600));          // lange Läufe ausdünnen
    ctx.save();
    ctx.font = `${fs}px "Geist Mono", ui-monospace, monospace`; ctx.textBaseline = "alphabetic";
    ctx.strokeStyle = F.linie; ctx.lineWidth = F.px;
    ctx.beginPath(); ctx.moveTo(l, o); ctx.lineTo(l, u); ctx.lineTo(b, u); ctx.stroke();
    ctx.setLineDash([2 * F.px, 3 * F.px]); ctx.beginPath(); ctx.moveTo(l, o); ctx.lineTo(b, o); ctx.stroke(); ctx.setLineDash([]);
    const n = Math.max(1, z.n);
    for (let m = 0; m < Modell.MAERKTE; m++) {
      ctx.strokeStyle = linienFarbe(m, F); ctx.lineWidth = 1.5 * F.px; ctx.beginPath();
      for (let t = 0; ; t = Math.min(T - 1, t + schritt)) {
        const x = sx(t), y = sy(z.verlauf[t][0][m] / n); t ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        if (t === T - 1) break;
      }
      ctx.stroke();
    }
    const en = document.documentElement.lang === "en";
    ctx.fillStyle = F.gedaempft; ctx.textAlign = "left";
    ctx.fillText(`${z.n} · 100 %`, l + 3 * F.px, o - 4 * F.px);
    ctx.fillText("0", l + 3 * F.px, u + fs * 1.15);
    ctx.textAlign = "right"; ctx.fillText(String(X), b, u + fs * 1.15);
    ctx.fillText(en ? "customers per market" : "Kunden je Markt", b, o - 4 * F.px);
    ctx.restore();
  }

  Sim.starte({
    modell,
    saat: 1,
    tempo: { min: 1, max: 20, wert: 1 },
    parameter: [
      { id: "produktionskosten", gruppe: SKALEN, name: { de: "Produktionskosten", en: "Production costs" }, min: 1, max: 500, schritt: 1, wert: S.produktionskosten },
      { id: "fahrtkosten", gruppe: SKALEN, name: { de: "Fahrtkosten je Zelle", en: "Travel expenses per cell" }, min: 0.02, max: 2, schritt: 0.02, wert: S.fahrtkosten },
      { id: "skalen", gruppe: SKALEN, name: { de: "Skalenertrag S", en: "Returns to scale S" }, min: 0.9, max: 1.3, schritt: 0.001, wert: S.skalen },
      { id: "segregation", gruppe: SEGR, name: { de: "Segregation aktiv", en: "Segregation active" }, art: "schalter", wert: S.segregation },
      { id: "zentren", gruppe: SEGR, name: { de: "günstigere Orte suchen", en: "look for cheaper places" }, art: "schalter", wert: S.zentren },
      { id: "schwelle", gruppe: SEGR, name: { de: "Schwellenwert (gleiche von 8)", en: "Threshold (like out of 8)" }, min: 0, max: 8, schritt: 1, wert: S.schwelle,
        format: v => `${v}/8 = ${Sim.fmt(v * 12.5, 0.1)} %` },
      { id: "anzahl", gruppe: SEGR, name: { de: "Anzahl Agenten für Setup", en: "Number of agents for setup" }, min: 100, max: 1500, schritt: 10, wert: S.anzahl, neustart: true },
      { id: "ansicht", gruppe: DARST, name: { de: "Zellen", en: "Cells" }, art: "auswahl", wert: S.ansicht,
        optionen: [{ wert: "gebiete", name: { de: "Einzugsgebiete", en: "Catchment areas" } }, { wert: "preise", name: { de: "Ortspreise", en: "Local prices" } }, { wert: "grau", name: { de: "grau", en: "grey" } }] },
      { id: "verlauf", gruppe: DARST, name: { de: "Verlauf zeigen", en: "Show chart" }, art: "schalter", wert: S.verlauf }
    ],
    groesse: (z, p) => !p.verlauf ? { b: z.breite, h: z.hoehe } : quer() ? { b: z.breite + LUECKE + RECHTS, h: z.hoehe } : { b: z.breite, h: z.hoehe + UNTEN },
    zeichne(ctx, z, p, F) {
      let lo = Infinity, hi = -Infinity;
      if (p.ansicht === "preise") for (let c = 0; c < z.ortspreis.length; c++) { lo = Math.min(lo, z.ortspreis[c]); hi = Math.max(hi, z.ortspreis[c]); }
      Sim.raster(ctx, z.spalten, z.zeilen, d => {
        for (let c = 0; c < z.gebiet.length; c++) {
          const f = p.ansicht === "gebiete" ? GEBIET[z.gebiet[c]] : p.ansicht === "preise"
            ? Sim.mische([20, 20, 20], [235, 235, 235], hi > lo ? (z.ortspreis[c] - lo) / (hi - lo) : 0) : GRAU;
          d[4 * c] = f[0]; d[4 * c + 1] = f[1]; d[4 * c + 2] = f[2]; d[4 * c + 3] = 255;
        }
      }, 0, 0, z.breite, z.hoehe);
      ctx.strokeStyle = "rgba(128,128,128,0.6)"; ctx.lineWidth = F.px; ctx.beginPath();
      for (let k = 1; k < z.spalten; k++) { ctx.moveTo(k, 0); ctx.lineTo(k, z.hoehe); }
      for (let i = 1; i < z.zeilen; i++) { ctx.moveTo(0, i); ctx.lineTo(z.breite, i); }
      ctx.stroke();
      const r = 0.38;                                          // AgSize 4 bei cellScal 10
      ["#000000", "#ffffff"].forEach((farbe, g) => {
        ctx.fillStyle = farbe; ctx.beginPath();
        for (let i = 0; i < z.n; i++) {
          if (z.typ[i] !== g) continue;
          const cx = z.x[i] + 0.5, cy = z.y[i] + 0.5;
          ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, 2 * Math.PI);
        }
        ctx.fill();
      });
      ctx.strokeStyle = ROT; ctx.lineWidth = Math.max(0.15, 2.5 * F.px);
      for (const [x, y] of z.maerkte) ctx.strokeRect(x + 0.08, y + 0.08, 0.84, 0.84);
      if (p.verlauf) {
        if (ctx.canvas.width > ctx.canvas.height * 1.2) diagramm(ctx, z, F, z.breite + LUECKE, 0, RECHTS, z.hoehe);
        else diagramm(ctx, z, F, 0, z.hoehe, z.breite, UNTEN);
      }
    },
    legende(F, p) {
      const L = [["#000000", { de: "schwarz", en: "black" }], ["#ffffff", { de: "weiß", en: "white" }], [ROT, { de: "Markt (Rand)", en: "market (outline)" }]];
      if (p.ansicht === "gebiete") L.push([Sim.css(GEBIET[2]), { de: "Farbe: Einzugsgebiet des Marktes", en: "colour: catchment area of the market" }]);
      else if (p.ansicht === "preise") L.push(["#ebebeb", { de: "hoher Ortspreis", en: "high local price" }], ["#141414", { de: "niedriger", en: "low" }]);
      return L;
    },
    kennzahlen(z) {
      const n = Math.max(1, z.n), a = z.n - z.suchend;
      let gross = 0; for (let m = 1; m < Modell.MAERKTE; m++) if (z.kunden[m] > z.kunden[gross]) gross = m;
      return [
        [{ de: "Märkte mit Kunden", en: "Markets with customers" }, `${Modell.aktiveMaerkte(z)} / ${Modell.MAERKTE}`],
        [{ de: "größter Markt (Kunden)", en: "largest market (customers)" }, `${z.kunden[gross]} · ${pz(Modell.groessterAnteil(z))}`],
        [{ de: "dessen Angebotspreis", en: "its bid price" }, zahl(z.preis[gross])],
        [{ de: "Ortspreis der Agenten (Mittel)", en: "local price of agents (mean)" }, zahl(Modell.mittlererOrtspreis(z))],
        [{ de: "angelagert", en: "settled" }, `${a} · ${pz(a / n)}`],
        [{ de: "gleiche Nachbarn (Mittel)", en: "like neighbours (mean)" }, Modell.gleicheNachbarn(z).toFixed(1).replace(".", ",") + " %"]
      ];
    }
  });
  document.querySelectorAll(".sprache").forEach(b => b.addEventListener("click", () => window.SIM && window.SIM.zeichne()));
})();
