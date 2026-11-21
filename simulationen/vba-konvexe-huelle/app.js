/* convexHull – Hülle um beliebig verteilte Punkte · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const RAND = 24, W = Modell.BREITE, H = Modell.HOEHE;      // Zeichenfläche: Feld 1000 × 800 mit Rand; y nach oben wie in AutoCAD
  const X = x => RAND + x, Y = y => RAND + H - y;

  /* AutoCAD-Farbindex (ACI): Kante z bekommt die Farbe z; 0 (VONBLOCK) und 7 = Weiß bzw. Schwarz je nach Hintergrund */
  const ACI_GRUND = { 1: [255, 0, 0], 2: [255, 255, 0], 3: [0, 255, 0], 4: [0, 255, 255], 5: [0, 0, 255], 6: [255, 0, 255], 8: [128, 128, 128], 9: [192, 192, 192] };
  function aci(n, F) {
    n = n % 256;
    if (n === 7 || n === 0) return F.dunkel ? [255, 255, 255] : [23, 23, 23];
    let c = ACI_GRUND[n];
    if (!c) {
      const ton = Math.floor((n - 10) / 10) * 15, v = [1, 0.65, 0.5, 0.3, 0.15][Math.floor((n % 10) / 2)], s = n % 2 ? 0.5 : 1;
      const k = q => { const kk = (q + ton / 60) % 6; return v * (1 - s * Math.max(0, Math.min(kk, 4 - kk, 1))); };
      c = [k(5), k(3), k(1)].map(x => Math.round(x * 255));
    }
    const hell = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];   // lesbar halten: im Dunkeln dunkle, im Hellen helle Töne anpassen
    return F.dunkel && hell < 70 ? Sim.mische(c, [255, 255, 255], 0.3) : !F.dunkel && hell > 170 ? Sim.mische(c, [0, 0, 0], 0.35) : c;
  }
  const gelb = F => Sim.css(aci(2, F));                       // Kugeln: color 2 (Gelb)

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 200, wert: 8 },
    parameter: [
      { id: "anzahl", gruppe: { de: "Punkte", en: "Points" }, name: { de: "anzahl (Punkte − 1)", en: "anzahl (points − 1)" }, min: 1, max: 1000, wert: S.anzahl, neustart: true },
      { id: "suche", gruppe: { de: "Darstellung", en: "Display" }, name: { de: "Suche zeigen", en: "Show search" }, art: "schalter", wert: S.suche }
    ],
    aktionen: [{ name: { de: "Hülle fertig", en: "Finish hull" }, tue: z => Modell.rechneAlle(z) }],
    groesse: () => ({ b: W + 2 * RAND, h: H + 2 * RAND }),
    ende: z => z.fertig,
    klick(z, p, x, y, taste, phase) {
      if (phase !== "unten") return;
      const mx = x - RAND, my = H - (y - RAND);
      if (taste === "rechts") Modell.entfernePunkt(z, mx, my, 14); else Modell.setzePunkt(z, mx, my);
    },
    zeichne(ctx, z, p, F) {
      ctx.fillStyle = F.papier; ctx.fillRect(0, 0, W + 2 * RAND, H + 2 * RAND);
      ctx.strokeStyle = F.linie; ctx.lineWidth = F.px; ctx.setLineDash([2 * F.px, 3 * F.px]);
      ctx.strokeRect(X(0), Y(H), W, H); ctx.setLineDash([]);
      // Suche: Strahl zum gerade geprüften Punkt, gestrichelt zum bisher besten (highP)
      if (p.suche && !z.fertig && z.start) {
        const q = z.letzter != null ? z.punkte[z.letzter] : null;
        if (q) { ctx.strokeStyle = F.tinte2; ctx.lineWidth = F.px; ctx.beginPath(); ctx.moveTo(X(z.start[0]), Y(z.start[1])); ctx.lineTo(X(q[0]), Y(q[1])); ctx.stroke(); }
        if (z.high) {
          ctx.strokeStyle = F.akzentText; ctx.lineWidth = 1.6 * F.px; ctx.setLineDash([5 * F.px, 4 * F.px]);
          ctx.beginPath(); ctx.moveTo(X(z.start[0]), Y(z.start[1])); ctx.lineTo(X(z.high[0]), Y(z.high[1])); ctx.stroke(); ctx.setLineDash([]);
        }
      }
      ctx.lineWidth = 2.2 * F.px; ctx.lineCap = "round";
      for (const k of z.kanten) {
        ctx.strokeStyle = Sim.css(aci(k.farbe, F));
        ctx.beginPath(); ctx.moveTo(X(k.a[0]), Y(k.a[1])); ctx.lineTo(X(k.b[0]), Y(k.b[1])); ctx.stroke();
      }
      const r = Math.max(2, 2.6 * F.px);
      ctx.fillStyle = gelb(F);
      for (const q of z.punkte) { ctx.beginPath(); ctx.arc(X(q[0]), Y(q[1]), r, 0, 2 * Math.PI); ctx.fill(); }
      if (p.suche && !z.fertig && z.start) {                    // startP im Akzent umringt
        ctx.strokeStyle = F.akzentText; ctx.lineWidth = 2 * F.px;
        ctx.beginPath(); ctx.arc(X(z.start[0]), Y(z.start[1]), 3 * r, 0, 2 * Math.PI); ctx.stroke();
      }
    },
    legende(F, p) {
      const L = [[gelb(F), { de: "Punkt (kugel, color 2)", en: "point (kugel, colour 2)" }],
                 [Sim.css(aci(1, F)), { de: "Kante z in Farbe z", en: "edge z in colour z" }]];
      if (p.suche) L.push([F.akzentText, { de: "startP und bester Kandidat", en: "startP and best candidate" }]);
      return L;
    },
    kennzahlen(z, p) {
      const n = z.punkte.length, en = document.documentElement.lang === "en";
      const k = [[{ de: "Punkte", en: "Points" }, String(n)],
                 [{ de: "Hüllkanten", en: "Hull edges" }, String(z.kanten.length)]];
      if (!z.fertig) k.push([{ de: "geprüft (For i)", en: "checked (For i)" }, `${z.i} / ${n}`],
                            [{ de: "Kette", en: "Chain" }, z.richtung ? { de: "Hinweg (oben, nach rechts)", en: "outward (top, to the right)" } : { de: "Rückweg (unten, nach links)", en: "return (bottom, to the left)" }]);
      const f = Modell.flaeche(z);
      k.push([{ de: "Fläche der Hülle", en: "Hull area" }, (100 * f / (W * H)).toFixed(1).replace(".", en ? "." : ",") + " %"]);
      if (z.fertig && !z.fehler) k.push([{ de: "Punkte außerhalb", en: "Points outside" }, String(Modell.ausserhalb(z))]);
      k.push([{ de: "Zustand", en: "State" }, z.fehler ? { de: "keine Hülle (zu wenige Punkte)", en: "no hull (too few points)" }
                                              : z.fertig ? { de: "Hülle geschlossen", en: "hull closed" } : { de: "sucht", en: "searching" }]);
      return k;
    }
  });
})();
