/* Verkehrsaufkommen · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD, B = Modell.BREITE, H = Modell.HOEHE, D = Modell.DATEN, SP = Modell.SPALTEN, ZE = Modell.ZEILEN;
  const G1 = { de: "graph", en: "graph" }, G2 = { de: "commutation to and from work", en: "commutation to and from work" },
        G3 = { de: "traffic", en: "traffic" }, G4 = { de: "Darstellung", en: "Display" };
  const ROT = "#ff2020", GELB = "#ffe000", KNOTEN = "#e5484d";
  const quer = () => window.innerWidth > 900;
  const k1 = v => v.toFixed(1).replace(".", ",");
  const uhr = h => { const m = Math.round(h * 60); return String(Math.floor(m / 60) % 24).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); };

  function zellFarbe(k, zeige) {                                    // CellsPaint: RGB(Arbeiter, Arbeitsplätze, Einzelhandel)
    const r = D.arbeiter[k], g = D.arbeitsplaetze[k], b = D.einzelhandel[k];
    return zeige === "rot" ? [r, 0, 0] : zeige === "gruen" ? [0, g, 0] : zeige === "blau" ? [0, 0, b] : [r, g, b];
  }

  // Form2 „Abfahrten“ über „Uhrzeit“ mit der aktuellen Zeit als Linie (ChartTool1); dazu neu: Reisende unterwegs
  function diagramm(ctx, z, p, F, x0, y0, w, h) {
    const fs = 10 * F.px, l = x0 + fs * 0.4, b = x0 + w, o = y0 + fs * 2.2, u = y0 + h - fs * 1.6, hh = u - o;
    const sx = t => l + (b - l) * t / 24;
    let hm = 1; for (const v of z.histogramm) if (v > hm) hm = v;
    let um = 1; for (const v of z.verlaufUnterwegs) if (v > um) um = v;
    ctx.save();
    ctx.font = `${fs}px "Geist Mono", ui-monospace, monospace`;
    ctx.strokeStyle = F.linie; ctx.lineWidth = F.px; ctx.beginPath(); ctx.moveTo(l, o); ctx.lineTo(l, u); ctx.lineTo(b, u); ctx.stroke();
    ctx.fillStyle = F.gedaempft;
    for (let i = 0; i <= 240; i++) { const v = z.histogramm[i]; if (v) { const y = u - hh * v / hm; ctx.fillRect(sx(i / 10) - 0.4 * F.px, y, 1.4 * F.px, u - y); } }
    ctx.strokeStyle = F.dunkel ? GELB : "#c79a00"; ctx.lineWidth = 1.5 * F.px; ctx.beginPath();
    let erst = true;
    for (let s = 1; s < z.tag; s++) { const v = z.verlaufUnterwegs[s]; if (v == null) { erst = true; continue; } const x = sx(Modell.uhrzeit(s, p.timeScale)), y = u - hh * v / um; erst ? ctx.moveTo(x, y) : ctx.lineTo(x, y); erst = false; }
    ctx.stroke();
    ctx.strokeStyle = F.akzentText; ctx.lineWidth = F.px; ctx.beginPath(); ctx.moveTo(sx(z.zeit), o - fs * 0.5); ctx.lineTo(sx(z.zeit), u); ctx.stroke();
    const en = document.documentElement.lang === "en";
    ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
    ctx.fillText(en ? "departures (grey) · on the road (yellow)" : "Abfahrten (grau) · unterwegs (gelb)", l, o - fs * 0.9);
    for (const t of [0, 6, 12, 18, 24]) { ctx.textAlign = t === 0 ? "left" : t === 24 ? "right" : "center"; ctx.fillText(String(t), sx(t), u + fs * 1.3); }
    ctx.restore();
  }

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 12, wert: 1 },
    parameter: [
      { id: "knoten", gruppe: G1, name: { de: "number (+1)", en: "number (+1)" }, min: 2, max: 100, wert: S.knoten, neustart: true },
      { id: "conDist", gruppe: G1, name: { de: "connect distance", en: "connect distance" }, min: 20, max: 300, wert: S.conDist, neustart: true },
      { id: "repDist", gruppe: G1, name: { de: "repel distance", en: "repel distance" }, min: 0, max: 100, wert: S.repDist, neustart: true },
      { id: "morgens", gruppe: G2, name: { de: "morning dep.", en: "morning dep." }, min: 4, max: 12, schritt: 0.5, wert: S.morgens, neustart: true, format: v => k1(v) + " h" },
      { id: "abends", gruppe: G2, name: { de: "evening dep.", en: "evening dep." }, min: 13, max: 22, schritt: 0.5, wert: S.abends, neustart: true, format: v => k1(v) + " h" },
      { id: "std", gruppe: G2, name: { de: "STD", en: "STD" }, min: 0.1, max: 3, schritt: 0.1, wert: S.std, neustart: true, format: v => k1(v) + " h" },
      { id: "timeScale", gruppe: G3, name: { de: "time scale: hour /", en: "time scale: hour /" }, min: 1, max: 30, wert: S.timeScale,
        format: v => `${v} = ${Math.round(60 / v)} min` },
      { id: "tScale", gruppe: G3, name: { de: "scale: no. /", en: "scale: no. /" }, min: 1, max: 100, wert: S.tScale },
      { id: "zeige", gruppe: G4, name: { de: "show", en: "show" }, art: "auswahl", wert: S.zeige,
        optionen: [{ wert: "alle", name: { de: "all", en: "all" } }, { wert: "rot", name: { de: "red: Arbeitsbevölkerung", en: "red: working population" } },
                   { wert: "gruen", name: { de: "green: Arbeitsplätze", en: "green: workplaces" } }, { wert: "blau", name: { de: "blue: Einzelhandel", en: "blue: retail" } }] },
      { id: "linien", gruppe: G4, name: { de: "lines to work", en: "lines to work" }, art: "schalter", wert: S.linien },
      { id: "diagramm", gruppe: G4, name: { de: "Diagramm zeigen", en: "Show chart" }, art: "schalter", wert: S.diagramm, groesseNeu: true }
    ],
    groesse: (z, p) => !p.diagramm ? { b: B, h: H } : quer() ? { b: B * 1.62, h: H } : { b: B, h: H * 1.38 },
    zeichne(ctx, z, p, F) {
      Sim.raster(ctx, SP, ZE, d => {
        for (let k = 0; k < SP * ZE; k++) { const c = zellFarbe(k, p.zeige); d[4 * k] = c[0]; d[4 * k + 1] = c[1]; d[4 * k + 2] = c[2]; d[4 * k + 3] = 255; }
      }, 0, 0, Modell.RECHTS, Modell.UNTEN);
      ctx.strokeStyle = "rgba(192,192,192,0.55)"; ctx.lineWidth = F.px; ctx.beginPath();     // Zellränder clSilver
      for (let k = 0; k <= SP; k++) { ctx.moveTo(k * 30, 0); ctx.lineTo(k * 30, Modell.UNTEN); }
      for (let i = 0; i <= ZE; i++) { ctx.moveTo(0, i * 30); ctx.lineTo(Modell.RECHTS, i * 30); }
      ctx.stroke();
      if (p.linien) {                                                // LineToWork, je Paar von Zellen zusammengefasst
        if (!z._linien) { const m = new Map(); for (let w = 0; w < z.W; w++) if (z.arbeit[w] >= 0) { const k = z.heim[w] * 1000 + z.arbeit[w]; m.set(k, (m.get(k) || 0) + 1); } z._linien = m; }
        ctx.lineWidth = F.px;
        for (const [k, c] of z._linien) {
          const a = Math.floor(k / 1000), b = k % 1000, f = zellFarbe(a, "alle");
          ctx.strokeStyle = `rgba(${f[0]},${f[1]},${f[2]},${Math.min(0.9, 0.08 + c / 40)})`;
          ctx.beginPath(); ctx.moveTo(Modell.zx(a), Modell.zy(a)); ctx.lineTo(Modell.zx(b), Modell.zy(b)); ctx.stroke();
        }
      }
      const n = z.n, u = z.belastung;
      ctx.lineCap = "round"; ctx.strokeStyle = GELB;                 // drawTraffic
      for (let j = 0; j < n; j++) for (const k of z.nb[j]) {
        const v = u[j * n + k]; if (!v) continue;
        ctx.lineWidth = Modell.linie(v, p.tScale);
        ctx.beginPath(); ctx.moveTo(z.ox[j], z.oy[j]); ctx.lineTo(z.ox[k], z.oy[k]); ctx.stroke();
      }
      ctx.strokeStyle = ROT; ctx.lineWidth = 2; ctx.beginPath();     // Verbinden: Graph rot, Stärke 2
      for (let j = 0; j < n; j++) for (const k of z.nb[j]) if (j < k) { ctx.moveTo(z.ox[j], z.oy[j]); ctx.lineTo(z.ox[k], z.oy[k]); }
      ctx.stroke();
      ctx.fillStyle = KNOTEN; ctx.strokeStyle = "#008000"; ctx.lineWidth = 1;
      for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.arc(z.x[i], z.y[i], 3, 0, 2 * Math.PI); ctx.fill(); ctx.stroke(); }
      if (p.diagramm) {
        if (ctx.canvas.width > ctx.canvas.height * 1.2) diagramm(ctx, z, p, F, B + 20, H * 0.15, B * 0.58, H * 0.6);
        else diagramm(ctx, z, p, F, 0, H + 10, B, H * 0.36);
      }
    },
    legende: (F, p) => [["rgb(175,0,0)", { de: "Arbeitsbevölkerung (rot)", en: "working population (red)" }], ["rgb(0,200,0)", { de: "Arbeitsplätze (grün)", en: "workplaces (green)" }],
                        ["rgb(0,0,230)", { de: "Einzelhandel (blau)", en: "retail (blue)" }], [ROT, { de: "Graph", en: "graph" }], [GELB, { de: "Verkehr (Stärke = Reisende / scale)", en: "traffic (width = travellers / scale)" }]],
    kennzahlen(z, p) {
      const s = Modell.summen(), f = v => v.toLocaleString("de-DE");
      return [[{ de: "time", en: "time" }, `${uhr(z.zeit)} · ${k1(z.zeit)} h`],
              [{ de: "steps", en: "steps" }, String(z.t)],
              [{ de: "traffic (onRoad)", en: "traffic (on road)" }, f(z.unterwegs)],
              [{ de: "größte Kantenbelastung", en: "largest edge load" }, f(Modell.maxBelastung(z))],
              [{ de: "Arbeitsbevölkerung", en: "working population" }, f(s.arbeiter)],
              [{ de: "Arbeitsplätze", en: "workplaces" }, f(s.plaetze)],
              [{ de: "Einzelhandelseinheiten", en: "retail units" }, f(s.handel)],
              [{ de: "Pendler mit Weg im Graphen", en: "commuters with a route" }, f(z.pendler)]];
    }
  });
  document.querySelectorAll(".sprache").forEach(b => b.addEventListener("click", () => window.SIM && window.SIM.zeichne()));
})();
