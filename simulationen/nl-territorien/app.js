/* 10 territory fight 01 · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const SETUP = { de: "Setup", en: "Setup" };
  const DARST = { de: "Darstellung", en: "Display" };
  // NetLogo-Grundfarben 5, 15, … 135 (gray, red, orange, brown, yellow, green, lime, turquoise, cyan, sky, blue, violet, magenta, pink)
  const BASIS = [[141, 141, 141], [215, 50, 41], [241, 105, 19], [156, 109, 70], [237, 237, 49], [89, 176, 60], [44, 209, 59],
                 [29, 159, 120], [84, 196, 196], [45, 141, 190], [52, 93, 169], [124, 80, 164], [167, 27, 106], [224, 127, 150]];
  /** NetLogo-Farbzahl → RGB: x5 ist die Grundfarbe, darunter dunkler bis schwarz, darüber heller bis weiß */
  function nlFarbe(c) {
    const b = BASIS[Math.floor(c / 10) % 14], o = c % 10;
    return o <= 5 ? b.map(v => Math.round(v * o / 5)) : b.map(v => Math.round(v + (255 - v) * (o - 5) / 5));
  }
  const UNTEN = 60, RECHTS = 150, LUECKE = 10;
  const quer = () => window.innerWidth > 900;
  const pz = v => (100 * v).toFixed(1).replace(".", ",") + " %";
  const cache = new Map();
  const farbe = c => { if (!cache.has(c)) cache.set(c, nlFarbe(c)); return cache.get(c); };

  const modell = Object.assign({}, Modell, {
    aendere(z, p, id) { Modell.aendere(z, p, id); if (id === "verlauf") window.dispatchEvent(new Event("resize")); }
  });

  function diagramm(ctx, z, F, x0, y0, w, h) {
    const fs = 10 * F.px, l = x0, b = x0 + w, o = y0 + fs * 1.6, u = y0 + h - fs * 1.4, hh = u - o;
    const X = Math.max(500, z.t), sx = t => l + w * t / X, T = z.verlauf.length, sch = Math.max(1, Math.ceil(T / 600));
    let max = 0.05; for (const v of z.verlauf[T - 1]) max = Math.max(max, v);
    const oben = Math.ceil(max * 20) / 20, sy = v => u - hh * v / oben;
    ctx.save();
    ctx.font = `${fs}px "Geist Mono", ui-monospace, monospace`; ctx.textBaseline = "alphabetic";
    ctx.strokeStyle = F.linie; ctx.lineWidth = F.px;
    ctx.beginPath(); ctx.moveTo(l, o); ctx.lineTo(l, u); ctx.lineTo(b, u); ctx.stroke();
    ctx.setLineDash([2 * F.px, 3 * F.px]); ctx.beginPath(); ctx.moveTo(l, o); ctx.lineTo(b, o); ctx.stroke(); ctx.setLineDash([]);
    z.farben.forEach((f, k) => {
      ctx.strokeStyle = Sim.css(farbe(f)); ctx.lineWidth = 1.5 * F.px; ctx.beginPath();
      for (let t = 0; ; t = Math.min(T - 1, t + sch)) { const x = sx(t), y = sy(z.verlauf[t][k]); t ? ctx.lineTo(x, y) : ctx.moveTo(x, y); if (t === T - 1) break; }
      ctx.stroke();
    });
    const en = document.documentElement.lang === "en";
    ctx.fillStyle = F.gedaempft; ctx.textAlign = "left";
    ctx.fillText(Math.round(oben * 100) + " %", l + 3 * F.px, o - 4 * F.px);
    ctx.fillText("0", l + 3 * F.px, u + fs * 1.15);
    ctx.textAlign = "right"; ctx.fillText(String(X), b, u + fs * 1.15);
    ctx.fillText(en ? "area per colour" : "Fläche je Farbe", b, o - 4 * F.px);
    ctx.restore();
  }

  Sim.starte({
    modell,
    saat: 1,
    tempo: { min: 1, max: 100, wert: 20 },
    parameter: [
      { id: "anzahl", gruppe: SETUP, name: { de: "num-turtles", en: "num-turtles" }, min: 0, max: 500, schritt: 1, wert: S.anzahl, neustart: true },
      { id: "farben", gruppe: SETUP, name: { de: "number-of-colors", en: "number-of-colors" }, min: 1, max: 100, schritt: 1, wert: S.farben, neustart: true },
      { id: "startfarbe", gruppe: SETUP, name: { de: "start-with-color", en: "start-with-color" }, min: 0, max: 14, schritt: 1, wert: S.startfarbe, neustart: true },
      { id: "turtlesZeigen", gruppe: DARST, name: { de: "turtles zeigen", en: "show turtles" }, art: "schalter", wert: S.turtlesZeigen },
      { id: "verlauf", gruppe: DARST, name: { de: "Verlauf zeigen", en: "Show chart" }, art: "schalter", wert: S.verlauf }
    ],
    groesse: (z, p) => !p.verlauf ? { b: z.breite, h: z.hoehe } : quer() ? { b: z.breite + LUECKE + RECHTS, h: z.hoehe } : { b: z.breite, h: z.hoehe + UNTEN },
    zeichne(ctx, z, p, F) {
      const leer = F.rgb.flaeche;
      Sim.raster(ctx, z.seite, z.seite, d => {
        for (let n = 0; n < z.mark.length; n++) {
          const m = z.mark[n], c = m === Modell.LEER ? leer : farbe(m);
          d[4 * n] = c[0]; d[4 * n + 1] = c[1]; d[4 * n + 2] = c[2]; d[4 * n + 3] = 255;
        }
      }, 0, 0, z.breite, z.hoehe);
      if (p.turtlesZeigen) {                                    // turtles: color 0 (schwarz), Heimat als Ring
        const K = Modell.KANTE, r = 1.1;
        ctx.fillStyle = "#000000"; ctx.beginPath();
        for (let i = 0; i < z.n; i++) { const x = z.x[i] + K + 0.5, y = K - z.y[i] + 0.5; ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, 2 * Math.PI); }
        ctx.fill();
        ctx.strokeStyle = F.dunkel ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.7)"; ctx.lineWidth = F.px; ctx.beginPath();
        for (let i = 0; i < z.n; i++) { const x = z.hx[i] + K + 0.5, y = K - z.hy[i] + 0.5; ctx.moveTo(x + 2, y); ctx.arc(x, y, 2, 0, 2 * Math.PI); }
        ctx.stroke();
      }
      if (p.verlauf) {
        if (ctx.canvas.width > ctx.canvas.height * 1.2) diagramm(ctx, z, F, z.breite + LUECKE, 0, RECHTS, z.hoehe);
        else diagramm(ctx, z, F, 0, z.hoehe, z.breite, UNTEN);
      }
    },
    legende(F, p, z) {
      const L = [["#000000", { de: "turtle (Ring: Heimat)", en: "turtle (ring: home)" }], [F.flaeche, { de: "ohne Farbe", en: "no colour" }]];
      if (z && z.farben.length) L.push([Sim.css(farbe(z.farben[0])), { de: `${z.farben.length} Territoriumsfarben (tMark)`, en: `${z.farben.length} territory colours (tMark)` }]);
      return L;
    },
    kennzahlen(z) {
      const a = z.verlauf[z.verlauf.length - 1];
      let k = 0; a.forEach((v, i) => { if (v > a[k]) k = i; });
      return [
        [{ de: "Clock (ticks)", en: "Clock (ticks)" }, String(z.t)],
        [{ de: "gefärbte Patches", en: "coloured patches" }, pz(z.gefaerbt / z.mark.length)],
        [{ de: "Farben (Territorien)", en: "colours (territories)" }, `${a.filter(v => v > 0).length} / ${z.farben.length}`],
        [{ de: "größtes Territorium", en: "largest territory" }, a.length ? `${Math.round(z.farben[k] * 10) / 10} · ${pz(a[k])}` : "–"]
      ];
    }
  });
  document.querySelectorAll(".sprache").forEach(b => b.addEventListener("click", () => window.SIM && window.SIM.zeichne()));
})();
