/* Modell „Circle City“ · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const NETZ = { de: "Netz (Setup)", en: "Network (setup)" };
  const STEUER = { de: "Gewichte und Schwellen", en: "Weights and thresholds" };
  const DARST = { de: "Darstellung", en: "Display" };
  // Farben der Gruppen wie ColPalet: clRed, clLime, clBlue, clYellow, clPurple, clAqua, clFuchsia, clTeal, clMaroon, clNavy, clOlive, clSkyBlue, clGreen, clMoneyGreen
  const GRUPPE = ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#800080", "#00ffff", "#ff00ff", "#008080", "#800000", "#000080", "#808000", "#a6caf0", "#008000", "#c0dcc0"];
  const SILBER = "#c0c0c0", ROT = "#e5484d";
  const gruen = F => F.dunkel ? "#4cc764" : "#2b8a3e";
  const UNTEN = 300, RECHTS = 560, LUECKE = 30;
  const quer = () => window.innerWidth > 900;
  const zahl = (v, n = 1) => v.toFixed(n).replace(".", ",");

  const modell = Object.assign({}, Modell, {
    aendere(z, p, id) { Modell.aendere(z, p, id); if (id === "verlauf") window.dispatchEvent(new Event("resize")); }
  });

  function diagramm(ctx, z, F, x0, y0, w, h) {
    const fs = 10 * F.px, l = x0, b = x0 + w, o = y0 + fs * 1.6, u = y0 + h - fs * 1.4, hh = u - o;
    const X = Math.max(30, z.t), sx = t => l + w * t / X, sy = v => u - hh * v / 100;
    ctx.save();
    ctx.font = `${fs}px "Geist Mono", ui-monospace, monospace`; ctx.textBaseline = "alphabetic";
    ctx.strokeStyle = F.linie; ctx.lineWidth = F.px;
    ctx.beginPath(); ctx.moveTo(l, o); ctx.lineTo(l, u); ctx.lineTo(b, u); ctx.stroke();
    ctx.setLineDash([2 * F.px, 3 * F.px]); ctx.beginPath(); ctx.moveTo(l, o); ctx.lineTo(b, o); ctx.stroke(); ctx.setLineDash([]);
    const linie = (farbe, k, strich, ab = 0) => {
      ctx.strokeStyle = farbe; ctx.lineWidth = 1.5 * F.px; ctx.setLineDash(strich || []); ctx.beginPath();
      z.verlauf.forEach((v, t) => { if (t < ab) return; const x = sx(t), y = sy(v[k]); t === ab ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
      ctx.stroke(); ctx.setLineDash([]);
    };
    linie(F.tinte2, 2, [3 * F.px, 2 * F.px]);
    linie(gruen(F), 1, null, 1);
    linie(ROT, 0, null, 1);
    const en = document.documentElement.lang === "en";
    ctx.fillStyle = F.gedaempft; ctx.textAlign = "left";
    ctx.fillText("100 %", l + 3 * F.px, o - 4 * F.px);
    ctx.fillText("0", l + 3 * F.px, u + fs * 1.15);
    ctx.textAlign = "right"; ctx.fillText(String(X), b, u + fs * 1.15);
    ctx.fillText(en ? "dashed: segregation index (streets)" : "gestrichelt: Segregationsindex (Straßen)", b, o - 4 * F.px);
    ctx.restore();
  }

  /** Verbindungen wie DrawLinks: Straße–Straße 3 px, nicht benachbarte als Bogen zur Mitte (BowWth 0,7), Straße–Haus 2 px, Haus–Wohnung 1 px */
  function netz(ctx, z, F) {
    const g = z.geo, m = z.mitte, bog = 0.7, zu = q => [m + Math.round((q[0] - m) * bog), m + Math.round((q[1] - m) * bog)];
    ctx.strokeStyle = F.gedaempft; ctx.lineCap = "round";
    ctx.lineWidth = 1; ctx.beginPath();
    g.wohnungen.forEach(w => { const h = g.haeuser[w.haus].pos; ctx.moveTo(h[0], h[1]); ctx.lineTo(w.pos[0], w.pos[1]); });
    ctx.stroke();
    ctx.lineWidth = 2; ctx.beginPath();
    g.haeuser.forEach(h => { const s = g.strassen[h.strasse]; ctx.moveTo(s[0], s[1]); ctx.lineTo(h.pos[0], h.pos[1]); });
    ctx.stroke();
    ctx.lineWidth = 3; ctx.beginPath();
    for (const [a, b] of z.kanten) {
      const A = g.strassen[a], B = g.strassen[b], d = Math.abs(a - b);
      ctx.moveTo(A[0], A[1]);
      if (d > 1 && d < z.S - 1) { const c1 = zu(A), c2 = zu(B); ctx.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], B[0], B[1]); }
      else ctx.lineTo(B[0], B[1]);
    }
    ctx.stroke();
  }

  Sim.starte({
    modell,
    saat: 1,
    tempo: { min: 1, max: 10, wert: 1 },
    parameter: [
      { id: "strassen", gruppe: NETZ, name: { de: "Zahl der Straßen", en: "number of streets" }, min: 5, max: 24, schritt: 1, wert: S.strassen, neustart: true },
      { id: "haeuser", gruppe: NETZ, name: { de: "Häuser je Straße", en: "houses per street" }, min: 1, max: 13, schritt: 1, wert: S.haeuser, neustart: true },
      { id: "wohnungen", gruppe: NETZ, name: { de: "Wohnungen je Haus", en: "flats per house" }, min: 1, max: 20, schritt: 1, wert: S.wohnungen, neustart: true },
      { id: "verbindungen", gruppe: NETZ, name: { de: "Straßenverbindungen je Straße", en: "street connections per street" }, min: 2, max: 12, schritt: 2, wert: S.verbindungen, neustart: true },
      { id: "gruppen", gruppe: NETZ, name: { de: "Zahl der Gruppen", en: "number of groups" }, min: 2, max: 13, schritt: 1, wert: S.gruppen, neustart: true },
      { id: "frei", gruppe: NETZ, name: { de: "freie Wohnungen", en: "free flats" }, min: 1, max: 50, schritt: 1, wert: S.frei, neustart: true, format: v => v + " %" },
      { id: "gewichtStrasse", gruppe: STEUER, name: { de: "weigthStreets", en: "weigthStreets" }, min: 0, max: 1, schritt: 0.05, wert: S.gewichtStrasse },
      { id: "gewichtHaus", gruppe: STEUER, name: { de: "weigthHouses", en: "weigthHouses" }, min: 0, max: 2, schritt: 0.05, wert: S.gewichtHaus },
      { id: "wegziehen", gruppe: STEUER, name: { de: "leavePlace (wegziehen unter)", en: "leavePlace (leave below)" }, min: 0, max: 1, schritt: 0.01, wert: S.wegziehen },
      { id: "ansiedeln", gruppe: STEUER, name: { de: "settleDown (einziehen über)", en: "settleDown (settle above)" }, min: 0, max: 1, schritt: 0.01, wert: S.ansiedeln },
      { id: "loeschen", gruppe: STEUER, name: { de: "Verbindungen je Löschen", en: "connections per deletion" }, min: 1, max: 20, schritt: 1, wert: S.loeschen },
      { id: "verlauf", gruppe: DARST, name: { de: "Verlauf zeigen", en: "Show chart" }, art: "schalter", wert: S.verlauf }
    ],
    aktionen: [{ name: { de: "Verbindungen löschen", en: "Delete connections" }, tue: (z, p) => Modell.loesche(z, p) }],
    groesse: (z, p) => !p.verlauf ? { b: z.breite, h: z.hoehe } : quer() ? { b: z.breite + LUECKE + RECHTS, h: z.hoehe } : { b: z.breite, h: z.hoehe + UNTEN },
    ende: z => z.fertig != null,
    zeichne(ctx, z, p, F) {
      netz(ctx, z, F);
      const g = z.geo;
      ctx.lineWidth = 1;
      ctx.fillStyle = F.tinte; ctx.beginPath();                       // Straßen: schwarz, Größe 8
      for (const s of g.strassen) { ctx.moveTo(s[0] + 8, s[1]); ctx.arc(s[0], s[1], 8, 0, 2 * Math.PI); }
      ctx.fill();
      ctx.fillStyle = F.papier; ctx.strokeStyle = F.tinte; ctx.beginPath();   // Häuser: weiß mit Rand, Größe 4
      for (const h of g.haeuser) { ctx.moveTo(h.pos[0] + 4, h.pos[1]); ctx.arc(h.pos[0], h.pos[1], 4, 0, 2 * Math.PI); }
      ctx.fill(); ctx.stroke();
      for (let k = -1; k < z.G; k++) {                                // Wohnungen: frei silbern, sonst Farbe der Gruppe
        ctx.fillStyle = k < 0 ? SILBER : GRUPPE[k % GRUPPE.length]; ctx.beginPath();
        g.wohnungen.forEach((w, f) => { if (z.zustand[f] !== k) return; ctx.moveTo(w.pos[0] + 4, w.pos[1]); ctx.arc(w.pos[0], w.pos[1], 4, 0, 2 * Math.PI); });
        ctx.fill();
      }
      if (p.verlauf) {
        if (ctx.canvas.width > ctx.canvas.height * 1.2) diagramm(ctx, z, F, z.breite + LUECKE, 0, RECHTS, z.hoehe);
        else diagramm(ctx, z, F, 0, z.hoehe, z.breite, UNTEN);
      }
    },
    legende(F, p, z) {
      const G = z ? z.G : p.gruppen, L = [];
      for (let k = 0; k < G; k++) L.push([GRUPPE[k % GRUPPE.length], { de: "Gruppe " + (k + 1), en: "Group " + (k + 1) }]);
      L.push([SILBER, { de: "freie Wohnung", en: "free flat" }], [F.tinte, { de: "Straße", en: "street" }]);
      if (p.verlauf) L.push([ROT, { de: "unzufrieden", en: "unhappy" }], [gruen(F), { de: "umgezogen", en: "moved" }]);
      return L;
    },
    kennzahlen(z, p) {
      const v = z.verlauf[z.verlauf.length - 1];
      return [
        [{ de: "Straßen · Häuser · Wohnungen", en: "Streets · houses · flats" }, `${z.S} · ${z.geo.haeuser.length} · ${z.geo.wohnungen.length}`],
        [{ de: "Agenten · frei", en: "Agents · free" }, `${z.agenten.length} · ${z.frei.length}`],
        [{ de: "unzufrieden · umgezogen", en: "unhappy · moved" }, `${z.unzufrieden} · ${z.umzuege}`],
        [{ de: "Anteil gleicher (Mittel)", en: "share of like (mean)" }, zahl(100 * Modell.mittlererAnteil(z, p)) + " %"],
        [{ de: "Segregationsindex (Straßen)", en: "Segregation index (streets)" }, zahl(v[2]) + " %"],
        [{ de: "Verbindungen · mittlere Weglänge", en: "Connections · mean path length" }, `${z.kanten.length} · ${zahl(Modell.mittlereWeglaenge(z), 2)}`],
        [{ de: "Ruhe nach Schritt", en: "At rest after step" }, z.fertig != null ? String(z.fertig) : "–"]
      ];
    }
  });
  document.querySelectorAll(".sprache").forEach(b => b.addEventListener("click", () => window.SIM && window.SIM.zeichne()));
})();
