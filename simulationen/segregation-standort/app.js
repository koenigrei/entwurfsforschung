/* Segregation durch Standortwahl · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const GRUND = { de: "Grundmodell", en: "Basic model" };
  const ERW = { de: "Erweitert (Fassung 2)", en: "Extended (version 2)" };
  const DARST = { de: "Darstellung", en: "Display" };

  // Farben wie im Original: Zellen grau 125 mit grauem Rand (cell_P.Paint), Agenten 255 · State (agenten.pas: schwarz, weiß).
  // Mehr als zwei Gruppen: Farbband wie chooseCol der erweiterten Fassung (Rot → Gelb → Grün → Cyan → Blau → Magenta).
  const BODEN = "#7d7d7d", RASTER = "#8c8c8c", ROT = "#e5484d";
  const gruen = F => F.dunkel ? "#4cc764" : "#2b8a3e";       // clGreen des Diagramms, im Dunkeln heller
  function farbband(n) {
    const f = [], schritt = 1275 / (n - 1);
    for (let i = 0; i < n; i++) {
      const k = Math.round(i * schritt); let r = 0, g = 0, b = 0;
      if (k <= 255) { r = 255; g = k; } else if (k <= 510) { r = 510 - k; g = 255; } else if (k <= 765) { g = 255; b = k - 510; }
      else if (k <= 1020) { g = 1020 - k; b = 255; } else { r = Math.min(255, k - 1020); b = 255; }
      f.push(`rgb(${r},${g},${b})`);
    }
    return f;
  }
  const typFarben = n => n <= 2 ? ["#000000", "#ffffff"] : farbband(n);
  const typNamen = n => n <= 2 ? [{ de: "schwarz", en: "black" }, { de: "weiß", en: "white" }]
                               : Array.from({ length: n }, (_, i) => ({ de: "Gruppe " + (i + 1), en: "Group " + (i + 1) }));
  // Diagramm wie RChart1: auf breiten Bildschirmen rechts neben dem Feld (wie im Fenster des Originals), sonst darunter (in Zellen)
  const UNTEN = 13, RECHTS = 30, LUECKE = 2;
  const quer = () => window.innerWidth > 900;
  const pz = v => v.toFixed(1).replace(".", ",") + " %";

  // Modell mit einer Ergänzung: „Verlauf zeigen“ ändert die Größe der Zeichenfläche → Größe neu berechnen lassen
  const modell = Object.assign({}, Modell, {
    aendere(z, p, id) { Modell.aendere(z, p, id); if (id === "verlauf") window.dispatchEvent(new Event("resize")); }
  });

  function diagramm(ctx, z, F, x0, y0, w, h) {
    const fs = 10 * F.px, l = x0, b = x0 + w, o = y0 + fs * 1.6, u = y0 + h - fs * 1.4, hh = u - o;
    const X = Math.max(100, z.t), sx = t => l + w * t / X, sy = v => u - hh * v;   // x bis 100 Schritte wie RChart1, dann mitwachsend
    ctx.save();
    ctx.font = `${fs}px "Geist Mono", ui-monospace, monospace`; ctx.textBaseline = "alphabetic";
    ctx.strokeStyle = F.linie; ctx.lineWidth = F.px;
    ctx.beginPath(); ctx.moveTo(l, o); ctx.lineTo(l, u); ctx.lineTo(b, u); ctx.stroke();
    ctx.setLineDash([2 * F.px, 3 * F.px]); ctx.beginPath(); ctx.moveTo(l, o); ctx.lineTo(b, o); ctx.stroke(); ctx.setLineDash([]);
    const linie = (farbe, wert, strich) => {
      ctx.strokeStyle = farbe; ctx.lineWidth = 1.5 * F.px; ctx.setLineDash(strich || []); ctx.beginPath();
      z.verlauf.forEach((v, t) => { const x = sx(t), y = sy(wert(v)); t ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.stroke(); ctx.setLineDash([]);
    };
    const n = Math.max(1, z.n);
    linie(F.tinte2, v => v[2] / 100, [3 * F.px, 2 * F.px]);
    linie(gruen(F), v => v[1] / n);
    linie(ROT, v => v[0] / n);
    ctx.fillStyle = F.gedaempft; ctx.textAlign = "left";
    ctx.fillText(`${z.n} · 100 %`, l + 3 * F.px, o - 4 * F.px);
    ctx.fillText("0", l + 3 * F.px, u + fs * 1.15);
    ctx.textAlign = "right"; ctx.fillText(String(X), b, u + fs * 1.15);
    const en = document.documentElement.lang === "en";
    ctx.fillText(en ? "dashed: like neighbours %" : "gestrichelt: gleiche Nachbarn %", b, o - 4 * F.px);
    ctx.restore();
  }

  Sim.starte({
    modell,
    saat: 1,
    tempo: { min: 1, max: 20, wert: 1 },
    parameter: [
      { id: "schwelle", gruppe: GRUND, name: { de: "Schwellenwert", en: "Threshold" }, min: 0, max: 100, schritt: 1, wert: S.schwelle, format: v => v + " %" },
      { id: "anzahl", gruppe: GRUND, name: { de: "Anzahl Agenten für Setup", en: "Number of agents for setup" }, min: 100, max: 1500, schritt: 10, wert: S.anzahl, neustart: true },
      { id: "gruppen", gruppe: ERW, name: { de: "Anzahl Gruppen", en: "Number of groups" }, min: 2, max: 6, schritt: 1, wert: S.gruppen, neustart: true },
      { id: "radius", gruppe: ERW, name: { de: "Radius Nachbarschaft", en: "Neighbourhood radius" }, min: 1, max: 5, schritt: 1, wert: S.radius },
      { id: "weite", gruppe: ERW, name: { de: "Umzugsweite (Zellen)", en: "Move distance (cells)" }, min: 1, max: 20, schritt: 1, wert: S.weite },
      { id: "nurBesser", gruppe: ERW, name: { de: "nur in bessere Lage umziehen", en: "move only to a better place" }, art: "schalter", wert: S.nurBesser },
      { id: "verlauf", gruppe: DARST, name: { de: "Verlauf zeigen", en: "Show chart" }, art: "schalter", wert: S.verlauf }
    ],
    groesse: (z, p) => !p.verlauf ? { b: z.breite, h: z.hoehe } : quer() ? { b: z.breite + LUECKE + RECHTS, h: z.hoehe } : { b: z.breite, h: z.hoehe + UNTEN },
    ende: z => z.t > 0 && z.suchend === 0,                     // Timer1.enabled := false, wenn kein Agent mehr sucht
    zeichne(ctx, z, p, F) {
      ctx.fillStyle = BODEN; ctx.fillRect(0, 0, z.breite, z.hoehe);
      ctx.strokeStyle = RASTER; ctx.lineWidth = F.px; ctx.beginPath();
      for (let k = 1; k < z.spalten; k++) { ctx.moveTo(k, 0); ctx.lineTo(k, z.hoehe); }
      for (let i = 1; i < z.zeilen; i++) { ctx.moveTo(0, i); ctx.lineTo(z.breite, i); }
      ctx.stroke();
      const farben = typFarben(z.gruppen), r = 0.4;            // AgSize 4 bei cellScal 10
      for (let g = 0; g < z.gruppen; g++) {
        ctx.fillStyle = farben[g]; ctx.beginPath();
        for (let i = 0; i < z.n; i++) {
          if (z.typ[i] !== g) continue;
          const cx = z.x[i] + 0.5, cy = z.y[i] + 0.5;
          ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, 2 * Math.PI);
        }
        ctx.fill();
      }
      if (p.verlauf) {                                          // Anordnung aus dem Seitenverhältnis der Zeichenfläche (folgt groesse)
        if (ctx.canvas.width > ctx.canvas.height * 1.2) diagramm(ctx, z, F, z.breite + LUECKE, 0, RECHTS, z.hoehe);
        else diagramm(ctx, z, F, 0, z.hoehe, z.breite, UNTEN);
      }
    },
    legende(F, p) {
      const n = Math.round(p.gruppen), f = typFarben(n), t = typNamen(n);
      const L = t.map((name, i) => [f[i], name]);
      L.push([BODEN, { de: "frei", en: "empty" }]);
      if (p.verlauf) L.push([ROT, { de: "angelagert", en: "settled" }], [gruen(F), { de: "suchend", en: "searching" }]);
      return L;
    },
    kennzahlen(z) {
      const n = Math.max(1, z.n), a = z.n - z.suchend;
      return [
        [{ de: "Agenten", en: "Agents" }, String(z.n)],
        [{ de: "angelagert", en: "settled" }, `${a} · ${pz(100 * a / n)}`],
        [{ de: "suchend (unzufrieden)", en: "searching (unhappy)" }, `${z.suchend} · ${pz(100 * z.suchend / n)}`],
        [{ de: "gleiche Nachbarn (Mittel)", en: "like neighbours (mean)" }, pz(Modell.gleicheNachbarn(z))],
        [{ de: "Ruhe nach Schritt", en: "At rest after step" }, z.fertig != null ? String(z.fertig) : "–"]
      ];
    }
  });
  // Beschriftung im Diagramm folgt der Sprache: nach dem Umschalten neu zeichnen (der Rahmen zeichnet dabei nicht neu)
  document.querySelectorAll(".sprache").forEach(b => b.addEventListener("click", () => window.SIM && window.SIM.zeichne()));
})();
