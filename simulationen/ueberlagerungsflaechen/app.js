/* Überlagerungsflächen · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  // Farben wie im Original: Rechtecke rot (clRed), Überlagerungsflächen blau (clBlue), Umriss grün (Pen clGreen)
  const ROT = "#e03131", BLAU = "#3b5bdb", gruen = F => F.dunkel ? "#2f9e44" : "#237032";
  const RECHNUNG = { de: "Rechnung", en: "Computation" }, DARST = { de: "Darstellung", en: "Display" };
  const en = () => document.documentElement.lang === "en";
  const zahl = v => v.toLocaleString(en() ? "en" : "de");

  function rechteck(ctx, r, fuell, rand, lw) {
    const w = r.x2 - r.x1, h = r.y2 - r.y1;
    if (w <= 0 || h <= 0) {                                    // Fläche 0 (Berührung, nur Fassung 04): als Linie
      ctx.strokeStyle = fuell; ctx.lineWidth = 2.5 * lw; ctx.beginPath(); ctx.moveTo(r.x1, r.y1); ctx.lineTo(r.x2, r.y2); ctx.stroke(); return;
    }
    ctx.fillStyle = fuell; ctx.fillRect(r.x1, r.y1, w, h);
    ctx.strokeStyle = rand; ctx.lineWidth = lw; ctx.strokeRect(r.x1, r.y1, w, h);
  }

  /** Geprüftes Paar: A durchgezogen, B gestrichelt; in Fassung 04 die neun Gebiete um A und die Clipcodes der Ecken von B */
  function paar(ctx, z, p, F) {
    const l = z.letztes; if (!l || !z.offen) return;              // nach der letzten Prüfung nichts mehr hervorheben
    const a = z.rechtecke[l.a], b = z.rechtecke[l.b]; if (!a || !b) return;
    ctx.save();
    if (l.codes && p.codes) {
      ctx.strokeStyle = F.tinte2; ctx.lineWidth = F.px; ctx.setLineDash([2 * F.px, 3 * F.px]); ctx.beginPath();
      for (const x of [a.x1, a.x2]) { ctx.moveTo(x, 0); ctx.lineTo(x, z.hoehe); }
      for (const y of [a.y1, a.y2]) { ctx.moveTo(0, y); ctx.lineTo(z.breite, y); }
      ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.strokeStyle = F.akzentText; ctx.lineWidth = 2 * F.px; ctx.strokeRect(a.x1, a.y1, a.x2 - a.x1, a.y2 - a.y1);
    ctx.setLineDash([4 * F.px, 3 * F.px]); ctx.strokeRect(b.x1, b.y1, b.x2 - b.x1, b.y2 - b.y1); ctx.setLineDash([]);
    if (l.codes && p.codes) {
      const fs = 10 * F.px, E = Modell.ecken(b);
      ctx.font = `${fs}px "Geist Mono", ui-monospace, monospace`; ctx.textBaseline = "middle"; ctx.textAlign = "center";
      E.forEach((q, u) => {
        const t = Modell.binaer(l.codes[u]), w = ctx.measureText(t).width + 4 * F.px, h = fs * 1.3;
        const x = Math.max(w / 2, Math.min(z.breite - w / 2, q[0] + (u === 0 || u === 3 ? -1 : 1) * (w / 2 + 2 * F.px)));
        const y = Math.max(h / 2, Math.min(z.hoehe - h / 2, q[1] + (u < 2 ? -1 : 1) * (h / 2 + 2 * F.px)));
        ctx.fillStyle = F.papier; ctx.fillRect(x - w / 2, y - h / 2, w, h);
        ctx.fillStyle = l.codes[u] === 0 ? F.akzentText : F.tinte; ctx.fillText(t, x, y);
      });
    }
    ctx.restore();
  }

  // Knöpfe des Originals: „Rechtecke erstellen“, „Überlagerungsflächen“, „Rechtecke löschen“ (kurz beschriftet, vier passen in eine Zeile)
  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 200, wert: 1 },
    parameter: [
      { id: "fassung", gruppe: RECHNUNG, name: { de: "Fassung", en: "Version" }, art: "auswahl", wert: S.fassung,
        optionen: [{ wert: "05", name: { de: "05 IntersectRect", en: "05 IntersectRect" } },
                   { wert: "04", name: { de: "04 Cohen-Sutherland", en: "04 Cohen-Sutherland" } }] },
      { id: "numbers", gruppe: RECHNUNG, name: { de: "Rechtecke je Klick (numbers)", en: "Generate per click (numbers)" }, min: 1, max: 50, wert: S.numbers, neustart: true },
      { id: "zeigen", gruppe: DARST, name: { de: "Überlagerungen zeigen", en: "Show overlaps" }, art: "schalter", wert: S.zeigen },
      { id: "codes", gruppe: DARST, name: { de: "Clipcodes zeigen (04)", en: "Show clip codes (04)" }, art: "schalter", wert: S.codes }
    ],
    aktionen: [
      { name: { de: "Erstellen", en: "Create" }, tue: (z, p) => Modell.erstelle(z, p.numbers) },
      { name: { de: "Flächen", en: "Areas" }, tue: z => Modell.rechneAlle(z) },
      { name: { de: "Löschen", en: "Delete" }, tue: z => Modell.loesche(z) }
    ],
    groesse: z => ({ b: z.breite, h: z.hoehe }),
    ende: z => !z.offen,                                        // alle Paare geprüft – der nächste Schritt erzeugt neue Rechtecke
    klick(z, p, x, y, taste, phase) {
      if (phase !== "unten") return;
      if (taste === "rechts") Modell.entferne(z, x, y);
      else Modell.erstelle(z, 1, Math.round(x), Math.round(y));
    },
    zeichne(ctx, z, p, F) {
      ctx.fillStyle = F.papier; ctx.fillRect(0, 0, z.breite, z.hoehe);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, z.breite, z.hoehe); ctx.clip();
      const g = gruen(F), lw = F.px;
      for (const r of z.rechtecke) rechteck(ctx, r, ROT, g, lw);
      if (p.zeigen) for (const r of z.laps) rechteck(ctx, r, BLAU, g, lw);
      paar(ctx, z, p, F);
      ctx.restore();
      ctx.strokeStyle = F.linie; ctx.lineWidth = F.px; ctx.strokeRect(0, 0, z.breite, z.hoehe);
    },
    legende: F => [[ROT, { de: "Rechteck", en: "Rectangle" }], [BLAU, { de: "Überlagerungsfläche", en: "Overlapping area" }],
                   [F.akzentText, { de: "geprüftes Paar", en: "pair being checked" }]],
    kennzahlen(z, p) {
      const n = z.rechtecke.length, l = z.letztes;
      const k = [[{ de: "Rechtecke", en: "Rectangles" }, String(n)],
                 [{ de: "Paare geprüft", en: "Pairs checked" }, `${zahl(z.geprueft)} / ${zahl(Modell.paare(n))}`],
                 [{ de: "Überlagerungen", en: "Overlaps" }, String(z.laps.length)],
                 [{ de: "Überlagerungsfläche (px²)", en: "Overlapping area (px²)" }, zahl(z.summe)]];
      if (z.fassung === "04") k.push([{ de: "zum Vergleich 05", en: "for comparison 05" }, zahl(z.exakt)]);
      k.push([{ de: "Rechteckfläche gesamt", en: "Total rectangle area" }, zahl(Modell.rechteckFlaeche(z))]);
      k.push([{ de: "Zustand", en: "State" }, z.offen ? (l ? { de: `Paar ${l.a}–${l.b}`, en: `pair ${l.a}–${l.b}` } : { de: "bereit", en: "ready" })
                                                    : { de: "alle Paare geprüft", en: "all pairs checked" }]);
      return k;
    }
  });
})();
