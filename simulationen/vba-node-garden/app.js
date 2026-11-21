/* nodeGarden – Interaktion von Nodes · Bedienung und Darstellung (Modelllogik in modell.js)
   Draufsicht auf die Ebene z = 0 wie in AutoCAD (y nach oben), Kugeln schattiert (SHADE), Farbe = Nummer der Kugel.
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD, LO = Modell.UNIMIN - 5, HI = Modell.UNIMAX + 6, B = HI - LO;   // Zeichnung 5 … 106
  const G1 = { de: "Modell", en: "Model" }, G2 = { de: "Darstellung", en: "Display" };

  /* AutoCAD-Farbindex (ACI) wie in vba-rekursion: 1–9 Grundfarben, 10–249 Farbtöne, 250–255 Grautöne; 0 (VonBlock) und 7 je nach Hintergrund */
  const ACI_GRUND = { 1: [255, 0, 0], 2: [255, 255, 0], 3: [0, 255, 0], 4: [0, 255, 255], 5: [0, 0, 255], 6: [255, 0, 255], 8: [128, 128, 128], 9: [192, 192, 192],
                      250: [51, 51, 51], 251: [80, 80, 80], 252: [105, 105, 105], 253: [130, 130, 130], 254: [190, 190, 190], 255: [255, 255, 255] };
  function aci(n, F) {
    n = n % 256;
    if (n === 7 || n === 0) return F.dunkel ? [235, 235, 235] : [40, 40, 40];
    if (ACI_GRUND[n]) return ACI_GRUND[n];
    const ton = Math.floor((n - 10) / 10) * 15, v = [1, 0.65, 0.5, 0.3, 0.15][Math.floor((n % 10) / 2)], s = n % 2 ? 0.5 : 1;
    const k = q => { const kk = (q + ton / 60) % 6; return v * (1 - s * Math.max(0, Math.min(kk, 4 - kk, 1))); };
    return [k(5), k(3), k(1)].map(c => Math.round(c * 255));
  }
  const css = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const zahl = (v, n = 2) => v.toFixed(n).replace(".", document.documentElement.lang === "en" ? "." : ",");

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 10, wert: 1 },
    parameter: [
      { id: "amount", gruppe: G1, name: { de: "How many balls (amount)", en: "How many balls (amount)" }, min: 2, max: 60, wert: S.amount, neustart: true },
      { id: "maxDist", gruppe: G1, name: { de: "maxDist", en: "maxDist" }, min: 0, max: 90, wert: S.maxDist },
      { id: "bremse", gruppe: G1, name: { de: "bremse", en: "bremse (brake)" }, min: 0.9, max: 1, schritt: 0.005, wert: S.bremse },
      { id: "zug", gruppe: G1, name: { de: "Anziehung (dx · 0,01)", en: "attraction (dx · 0.01)" }, min: 0, max: 0.05, schritt: 0.001, wert: S.zug },
      { id: "spuren", gruppe: G2, name: { de: "Bewegungsbahnen zeigen", en: "Show trajectories" }, art: "schalter", wert: S.spuren },
      { id: "paare", gruppe: G2, name: { de: "Paare unter maxDist verbinden", en: "Connect pairs below maxDist" }, art: "schalter", wert: S.paare }
    ],
    groesse: () => ({ b: B, h: B }),
    ende: z => z.t > 0 && Modell.tempo(z) < 1e-4,                 // alle Kugeln stehen
    zeichne(ctx, z, p, F) {
      const X = x => x - LO, Y = y => HI - y;                     // AutoCAD: y nach oben
      ctx.fillStyle = F.dunkel ? "#000000" : "#ffffff"; ctx.fillRect(0, 0, B, B);
      // Rahmen unimin … unimax
      ctx.strokeStyle = F.linie; ctx.lineWidth = F.px; ctx.setLineDash([4 * F.px, 4 * F.px]);
      ctx.strokeRect(X(Modell.UNIMIN), Y(Modell.UNIMAX), Modell.UNIMAX - Modell.UNIMIN, Modell.UNIMAX - Modell.UNIMIN);
      ctx.setLineDash([]);
      if (p.paare) {
        ctx.strokeStyle = F.gedaempft; ctx.lineWidth = F.px; ctx.beginPath();
        for (let i = 0; i < z.n; i++) for (let j = i + 1; j < z.n; j++)
          if (Math.hypot(z.x[i] - z.x[j], z.y[i] - z.y[j]) < p.maxDist) { ctx.moveTo(X(z.x[i]), Y(z.y[i])); ctx.lineTo(X(z.x[j]), Y(z.y[j])); }
        ctx.stroke();
      }
      if (p.spuren && z.spurLaenge > 1) {                         // Bahn der letzten Schritte, ohne Linie über den Sprung am Rahmen
        ctx.lineWidth = 1.2 * F.px;
        for (let i = 0; i < z.n; i++) {
          ctx.strokeStyle = css(aci(i, F), 0.55); ctx.beginPath();
          let [ax, ay] = Modell.spurPunkt(z, i, 0); ctx.moveTo(X(ax), Y(ay));
          for (let a = 1; a < z.spurLaenge; a++) {
            const [bx, by] = Modell.spurPunkt(z, i, a);
            if (Math.abs(bx - ax) > 40 || Math.abs(by - ay) > 40) ctx.moveTo(X(bx), Y(by)); else ctx.lineTo(X(bx), Y(by));
            ax = bx; ay = by;
          }
          ctx.stroke();
        }
      }
      // Kugeln: Radius 1, schattiert (Licht von links oben), Farbe = Nummer (duder.color = col)
      const r = 1;
      for (let i = 0; i < z.n; i++) {
        const cx = X(z.x[i]), cy = Y(z.y[i]), c = aci(i, F);
        const g = ctx.createRadialGradient(cx - 0.35 * r, cy - 0.4 * r, 0.1 * r, cx, cy, r);
        g.addColorStop(0, css(c.map(v => Math.round(v + (255 - v) * 0.7))));
        g.addColorStop(0.45, css(c));
        g.addColorStop(1, css(c.map(v => Math.round(v * 0.35))));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI); ctx.fill();
      }
    },
    legende: (F, p) => {
      const L = [[css(aci(1, F)), { de: "Kugel (node), Farbe = Nummer", en: "sphere (node), colour = number" }], [F.linie, { de: "Rahmen 10 … 100", en: "frame 10 … 100" }]];
      if (p.paare) L.push([F.gedaempft, { de: "Abstand < maxDist", en: "distance < maxDist" }]);
      return L;
    },
    kennzahlen(z) {
      const g = Modell.gruppen(z);
      return [
        [{ de: "Kugeln", en: "spheres" }, String(z.n)],
        [{ de: "mittlere Geschwindigkeit", en: "mean speed" }, zahl(Modell.tempo(z), 3)],
        [{ de: "Gruppen (Abstand < 5)", en: "groups (distance < 5)" }, String(g.gruppen)],
        [{ de: "größte Gruppe", en: "largest group" }, String(g.groesste)],
        [{ de: "einzeln", en: "single" }, String(g.zahl - g.gruppen)]
      ];
    }
  });
})();
