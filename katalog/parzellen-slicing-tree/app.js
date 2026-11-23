/* Parzellierung mit Slicing Tree · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const de = () => document.documentElement.lang !== "en";
  const zahl = (v, n = 0) => v.toLocaleString(de() ? "de" : "en", { minimumFractionDigits: n, maximumFractionDigits: n });
  const violett = F => F.dunkel ? "#b77cff" : "#8a2be2";
  const tonung = (F, k) => F.dunkel ? (k % 2 ? "rgba(183,124,255,0.13)" : "rgba(183,124,255,0.06)") : (k % 2 ? "rgba(138,43,226,0.10)" : "rgba(138,43,226,0.04)");
  const ORANGE = "#f5a300";
  const PANEL = 160;                                    // Höhe des Baumdiagramms unter dem Plan (m im Modellmaßstab)
  const EBENE_HELL = ["#3437c9", "#0b8a78", "#4f9a1f", "#b07d00", "#d04a1c", "#b0144f", "#6c35a3", "#5b5b66", "#2d6c9e", "#7a5c2e"];
  const EBENE_DUNKEL = ["#8b8df5", "#3fd0b8", "#8fd65a", "#f0c040", "#ff8a5c", "#ff6f9f", "#c79bff", "#b5b5c0", "#72b6ee", "#d6b27a"];
  const ebeneFarbe = (F, e) => (F.dunkel ? EBENE_DUNKEL : EBENE_HELL)[e % 10];

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 20, wert: 2 },
    parameter: [
      { id: "breite", gruppe: { de: "Slicing Tree", en: "Slicing tree" }, name: { de: "Parzellenbreite (parcelWidth) m", en: "Parcel width (parcelWidth) m" }, min: 10, max: 100, schritt: 1, wert: S.breite, neustart: true },
      { id: "teilung", name: { de: "Teilungsverhältnis (splitRate)", en: "Split rate (splitRate)" }, min: 0.1, max: 0.9, schritt: 0.05, wert: S.teilung, neustart: true },
      { id: "skalierung", gruppe: { de: "Toleranzen (Customized Parameters)", en: "Tolerances (Customized Parameters)" }, name: { de: "Kollinearität (scalingFactor) m", en: "Collinearity (scalingFactor) m" }, min: 0.1, max: 5, schritt: 0.1, wert: S.skalierung, neustart: true },
      { id: "minAbstand", name: { de: "Mindestabstand Gegenseite (minDistance) m", en: "Opposite side distance (minDistance) m" }, min: 0, max: 50, schritt: 1, wert: S.minAbstand, neustart: true },
      { id: "nummern", gruppe: { de: "Darstellung", en: "Display" }, art: "schalter", name: { de: "Schnittreihenfolge im gewählten Block", en: "Cut order in the selected block" }, wert: true }
    ],
    groesse: z => ({ b: z.b, h: z.h + PANEL }),
    klick(z, p, x, y, taste, phase) {
      if (phase !== "unten" || y > z.h) return;
      const i = Modell.blockBei(z, [x, y]);
      if (i >= 0) z.wahl = i;
    },
    ende: z => Modell.fertig(z),
    zeichne(ctx, z, p, F) {
      const px = F.px, V = violett(F), t = z.t, L = Modell.letzter(z);
      Karte.segmente(ctx, z.szene.strassen, F.dunkel ? "#3a3a42" : "#c8c8cf", px);
      z.bloecke.forEach((b, bi) => {
        Karte.poly(ctx, b.poly, F.dunkel ? "#0f0f13" : "#fafafb", null);
        Modell.teileZurZeit(b, t).forEach((k, i) => Karte.poly(ctx, k.poly, tonung(F, i), null));
        for (const k of b.knoten) if (Modell.geschnitten(k, t))
          Karte.linie(ctx, k.linie, bi === z.wahl ? ebeneFarbe(F, k.ebene) : V, px * Math.max(1, 2.6 - 0.35 * k.ebene));
      });
      if (L) Karte.linie(ctx, L.knoten.linie, ORANGE, px * 3.2);
      for (const b of z.bloecke) Karte.poly(ctx, b.poly, null, F.tinte, px * 1.8);
      const w = z.bloecke[z.wahl];
      if (!w) return;
      Karte.poly(ctx, w.poly, null, F.akzent, px * 3.5);
      const gross = Geo.bbox(w.poly).b / px > 110;
      if (p.nummern && gross) for (const k of w.knoten) if (Modell.geschnitten(k, t)) {
        const m = Geo.lerp(k.linie[0], k.linie[1], 0.5);
        Karte.punkt(ctx, m, 7 * px, F.dunkel ? "#000" : "#fff", ebeneFarbe(F, k.ebene), px * 1.4);
        Karte.text(ctx, String(k.nrImBlock), m, F.tinte, px, 9, "center");
      }
      // Baumdiagramm des gewählten Blocks
      const y0 = z.h + 8, x0 = 24, x1 = z.b - 24, pos = Modell.baumLayout(w.knoten);
      const maxE = Math.max(1, ...w.knoten.map(k => k.ebene)), yT = y0 + 34, yB = y0 + PANEL - 18, dy = (yB - yT) / maxE;
      const P = id => [x0 + pos[id][0] * (x1 - x0), yT + pos[id][1] * dy];
      ctx.fillStyle = F.dunkel ? "#0b0b0e" : "#f6f6f8"; ctx.fillRect(0, z.h + 2, z.b, PANEL - 2);
      const nb = Modell.blaetter(w.knoten).length, breitePx = (x1 - x0) / px, platz = breitePx / nb >= 20;
      const titel = breitePx > 520 ? (de() ? `Slicing Tree des gewählten Blocks · ${nb} Parzellen · Ebenen 0–${maxE}` : `Slicing tree of the selected block · ${nb} parcels · levels 0–${maxE}`)
        : (de() ? `Baum · ${nb} Parzellen · Ebenen 0–${maxE}` : `Tree · ${nb} parcels · levels 0–${maxE}`);
      Karte.text(ctx, titel, [x0, y0 + 12], F.gedaempft, px, breitePx > 520 ? 11 : 10);
      for (const k of w.knoten) if (k.kinder) for (const c of k.kinder) {
        const a = P(k.id), b = P(c), an = Modell.geschnitten(k, t);
        Karte.linie(ctx, [a, [b[0], a[1]], b], an ? ebeneFarbe(F, k.ebene) : (F.dunkel ? "#34343c" : "#d6d6dc"), px * (an ? 1.6 : 1));
      }
      for (const k of w.knoten) {
        const q = P(k.id), sichtbar = k.eltern < 0 || w.knoten[k.eltern].nr < t;
        if (!sichtbar) { Karte.punkt(ctx, q, 2 * px, F.dunkel ? "#34343c" : "#d6d6dc", null); continue; }
        if (k.kinder && Modell.geschnitten(k, t)) {
          Karte.punkt(ctx, q, (platz ? 7 : 3.5) * px, platz ? (F.dunkel ? "#000" : "#fff") : ebeneFarbe(F, k.ebene), ebeneFarbe(F, k.ebene), px * 1.4);
          if (p.nummern && platz) Karte.text(ctx, String(k.nrImBlock), q, F.tinte, px, 9, "center");
        } else Karte.punkt(ctx, q, 3.5 * px, k.kinder ? F.gedaempft : V, null);
      }
    },
    legende: F => [[violett(F), { de: "Parzellengrenze (Schnitt)", en: "Parcel border (cut)" }], [ebeneFarbe(F, 0), { de: "Baumebene 0, 1, 2 … im gewählten Block", en: "Tree level 0, 1, 2 … in the selected block" }], [ORANGE, { de: "letzter Schnitt", en: "last cut" }]],
    kennzahlen(z, p) {
      let teile = 0, fertigBl = 0, fr = 0, A = 0, anschluss = 0;
      for (const b of z.bloecke) {
        const T = Modell.teileZurZeit(b, z.t); teile += T.length;
        for (const k of T) if (!k.kinder) { fertigBl++; fr += k.front; A += k.A; if (k.front > 0.01) anschluss++; }
      }
      const w = z.bloecke[z.wahl], k = [
        [{ de: "Schnitte", en: "Cuts" }, `${Math.min(z.t, z.schnitte.length)} / ${z.schnitte.length}`],
        [{ de: "Teile", en: "Parts" }, String(teile)],
        [{ de: "fertige Parzellen", en: "Finished parcels" }, String(fertigBl)],
        [{ de: "mittlere Straßenfront", en: "Mean street frontage" }, fertigBl ? zahl(fr / fertigBl, 1) + " m" : "–"],
        [{ de: "mittlere Parzellenfläche", en: "Mean parcel area" }, fertigBl ? zahl(A / fertigBl) + " m²" : "–"],
        [{ de: "mit Straßenanschluss", en: "Connected to street" }, fertigBl ? zahl(100 * anschluss / fertigBl) + " %" : "–"]
      ];
      if (w) {
        const bl = Modell.blaetter(w.knoten);
        k.push([{ de: "gewählter Block", en: "Selected block" }, `${zahl(w.A)} m² · ${bl.length} ` + (de() ? "Parzellen" : "parcels")]);
        k.push([{ de: "Baumtiefe im Block", en: "Tree depth in block" }, String(Math.max(...w.knoten.map(x => x.ebene)))]);
      }
      return k;
    }
  });
})();
