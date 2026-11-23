/* Straßenhierarchie · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const de = () => document.documentElement.lang !== "en";
  const zahl = (v, n = 0) => v.toLocaleString(de() ? "de" : "en", { minimumFractionDigits: n, maximumFractionDigits: n });
  /** Farben der drei Klassen wie im Katalogbild (Tertiary blaugrün, Secondary gelbgrün, Primary rot), in Hell etwas kräftiger */
  const farbeKlasse = (k, F) => [F.dunkel ? "#3aa8c8" : "#1f86a6", F.dunkel ? "#c6dd3c" : "#86a80c", F.dunkel ? "#f0507f" : "#d81b60"][k];
  const BREITE = [1.3, 2.3, 3.8];
  const POI = "#e0323c";
  const R_GRIFF = 12;                       // Fangradius für Punkte in m
  let zug = null;                           // gerade gezogener Punkt {art, i}

  const punkte = (z, art) => art === "poi" ? z.poi : z.eingang;

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 20, wert: 1 },
    parameter: [
      { id: "fang", gruppe: { de: "Netz (Network Smooth, 2. BuildGraph)", en: "Network (Network Smooth, 2. BuildGraph)" }, name: { de: "Fangabstand (Snap threshold) m", en: "Snap threshold (m)" }, min: 0, max: 10, schritt: 0.1, wert: S.fang },
      { id: "kL", name: { de: "Längenkoeffizient (Length Coefficient)", en: "Length coefficient" }, min: 0, max: 1, schritt: 0.1, wert: S.kL },
      { id: "kW", name: { de: "Winkelkoeffizient (Angular Coefficient)", en: "Angular coefficient" }, min: 0, max: 1, schritt: 0.1, wert: S.kW },
      { id: "grund", gruppe: { de: "Gewichte (Custom edge weights)", en: "Weights (Custom edge weights)" }, name: { de: "Grundgewicht je Segment (0/1)", en: "Base weight per segment (0/1)" }, min: 0, max: 1, schritt: 1, wert: S.grund },
      { id: "wEingang", name: { de: "Gewicht Stadteingang (Weight City Entrance)", en: "Weight city entrance" }, min: 0, max: 1, schritt: 0.1, wert: S.wEingang },
      { id: "wPoi", name: { de: "Gewicht PoI (Weight Point Of Interest)", en: "Weight point of interest" }, min: 0, max: 1, schritt: 0.1, wert: S.wPoi },
      { id: "wPrimaer", gruppe: { de: "Straßenhierarchie (Street Hierarchy Weights)", en: "Street hierarchy weights" }, name: { de: "Gewicht Hauptstraße (Weight Primary Road)", en: "Weight primary road" }, min: 0, max: 1, schritt: 0.01, wert: S.wPrimaer },
      { id: "wSekundaer", name: { de: "Gewicht Nebenstraße (Weight Secondary Road)", en: "Weight secondary road" }, min: 0, max: 1, schritt: 0.01, wert: S.wSekundaer },
      { id: "wTertiaer", name: { de: "Gewicht Anliegerstraße (Weight Tertiary Road)", en: "Weight tertiary road" }, min: 0, max: 1, schritt: 0.01, wert: S.wTertiaer },
      { id: "faktor", name: { de: "Bereichsfaktor (Number Slider)", en: "Domain factor (number slider)" }, min: 0, max: 10, schritt: 0.001, wert: S.faktor },
      { id: "darstellung", gruppe: { de: "Darstellung", en: "Display" }, art: "auswahl", name: { de: "Färbung", en: "Colouring" }, wert: S.darstellung,
        optionen: [{ wert: "hierarchie", name: { de: "Straßenhierarchie (3 Klassen)", en: "Street hierarchy (3 classes)" } },
                   { wert: "betweenness", name: { de: "Betweenness (log, 0…1)", en: "Betweenness (log, 0…1)" } }] },
      { id: "gebaeude", art: "schalter", name: { de: "Gebäude zeigen", en: "Show buildings" }, wert: S.gebaeude }
    ],
    groesse: z => ({ b: z.b, h: z.h }),
    klick(z, p, x, y, taste, phase) {
      const q = [Math.max(0, Math.min(z.b, x)), Math.max(0, Math.min(z.h, y))];
      if (phase === "unten") {
        const hit = Modell.punktBei(z, q, R_GRIFF);
        if (taste === "rechts") {
          if (hit) { punkte(z, hit.art).splice(hit.i, 1); zug = null; }
          else { z.eingang.push(q); zug = { art: "eingang", i: z.eingang.length - 1 }; }
        } else if (hit) { zug = hit; return; }
        else { z.poi.push(q); zug = { art: "poi", i: z.poi.length - 1 }; }
        Modell.punkteGeaendert(z, p);
      } else if (zug) {
        const L = punkte(z, zug.art); if (!L[zug.i]) return;
        L[zug.i] = q; Modell.punkteGeaendert(z, p);
      }
    },
    aktionen: [
      { name: { de: "Rechnen", en: "Compute" }, tue: (z, p) => Modell.rechneAlles(z, p) },
      { name: { de: "Neu", en: "Restart" }, tue: (z, p) => Modell.leere(z, p) },
      { name: { de: "PoI ✕", en: "PoI ✕" }, tue: (z, p) => { z.poi.length = 0; Modell.punkteGeaendert(z, p); } },
      { name: { de: "Eing. ✕", en: "Entr. ✕" }, tue: (z, p) => { z.eingang.length = 0; Modell.punkteGeaendert(z, p); } }
    ],
    ende: z => Modell.fertig(z),
    zeichne(ctx, z, p, F) {
      const px = F.px, N = z.N, K = z.K;
      if (p.gebaeude) { const c = F.dunkel ? "#1b1b20" : "#e9e9ed"; for (const g of z.szene.gebaeude) Karte.poly(ctx, g, c, c, px * 0.8); }
      ctx.lineCap = "round";
      const kante = (k, farbe, lw) => { const e = N.kanten[k], a = N.knoten[e.a], b = N.knoten[e.b];
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.strokeStyle = farbe; ctx.lineWidth = lw; ctx.stroke(); };
      // noch nicht klassifiziert: graues Netz
      for (let k = 0; k < N.kanten.length; k++) if (K.klasse[k] < 0) kante(k, F.dunkel ? "#5a5a62" : "#a4a4ac", px * 1.1);
      if (p.darstellung === "betweenness") {
        const ord = [...N.kanten.keys()].filter(k => K.klasse[k] >= 0).sort((a, b) => K.wert[a] - K.wert[b]);
        for (const k of ord) kante(k, Karte.farbe(K.wert[k], "spektral"), px * (1.1 + 3 * K.wert[k]));
      } else {
        for (const c of [0, 1, 2]) for (let k = 0; k < N.kanten.length; k++) if (K.klasse[k] === c) kante(k, farbeKlasse(c, F), px * BREITE[c]);
      }
      if (z.letzter >= 0 && !Modell.fertig(z)) kante(z.letzter, F.tinte, px * 4.5);
      // Stadteingänge: Quadrat mit Rahmen; PoI: roter Punkt
      for (const q of z.eingang) {
        const r = 5.5 * px; ctx.beginPath(); ctx.rect(q[0] - r, q[1] - r, 2 * r, 2 * r);
        ctx.fillStyle = F.akzent; ctx.fill(); ctx.strokeStyle = F.tinte; ctx.lineWidth = px * 1.2; ctx.stroke();
      }
      for (const q of z.poi) Karte.punkt(ctx, q, 6 * px, POI, F.tinte, px * 1.2);
      if (z.t === 0) {
        const lang = de() ? "Start rechnet die Betweenness – ein Schritt je Ursprungssegment" : "Start computes betweenness – one step per origin segment";
        const kurz = de() ? "Start: ein Schritt je Segment" : "Start: one step per segment";
        Karte.text(ctx, lang.length * 7.4 < z.b / px - 24 ? lang : kurz, [z.b / 2, z.h - 14 * px], F.tinte2, px, 12, "center");
      }
    },
    legende: (F, p) => (p.darstellung === "betweenness"
      ? Karte.skalenLegende("spektral", { de: "Betweenness gering", en: "low betweenness" }, { de: "hoch", en: "high" })
      : [[farbeKlasse(2, F), { de: "Primary (Hauptstraße)", en: "Primary street" }], [farbeKlasse(1, F), { de: "Secondary", en: "Secondary street" }], [farbeKlasse(0, F), { de: "Tertiary", en: "Tertiary street" }]])
      .concat([[POI, { de: "Point of Interest", en: "Point of interest" }], [F.akzent, { de: "Stadteingang", en: "City entrance" }]]),
    kennzahlen(z, p) {
      const b = Modell.bilanz(z), B = Modell.bereiche(p), L = b.len[0] + b.len[1] + b.len[2] || 1;
      const zeile = c => zahl(b.anz[c]) + " · " + zahl(b.len[c]) + " m · " + zahl(100 * b.len[c] / L) + " %";
      return [
        [{ de: "Straßensegmente", en: "Street segments" }, zahl(z.G.n)],
        [{ de: "Ursprünge gerechnet", en: "Origins computed" }, zahl(z.fertig) + " / " + zahl(z.G.n)],
        [{ de: "Primary", en: "Primary" }, zeile(2)],
        [{ de: "Secondary", en: "Secondary" }, zeile(1)],
        [{ de: "Tertiary", en: "Tertiary" }, zeile(0)],
        [{ de: "Grenzen T | S | P", en: "Bounds T | S | P" }, B ? zahl(B[0][1], 2) + " | " + zahl(B[1][1], 2) + " | " + zahl(B[2][1], 3) : "–"],
        [{ de: "PoI · Stadteingänge", en: "PoI · city entrances" }, zahl(z.poi.length) + " · " + zahl(z.eingang.length)]
      ];
    }
  });
})();
