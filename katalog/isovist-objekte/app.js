/* Sichtbarkeit von Objekten · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const de = () => document.documentElement.lang !== "en";
  const zahl = (v, n = 1) => isFinite(v) ? v.toLocaleString(de() ? "de" : "en", { minimumFractionDigits: n, maximumFractionDigits: n }) : "–";
  const css = c => `rgb(${c[0]},${c[1]},${c[2]})`;
  /** Farbe des Gradient; in der dunklen Darstellung ist das Dunkelblau des Originals etwas aufgehellt, damit es sich vom Schwarz abhebt */
  const farbe = (t, F, V = Modell.VERLAUF) => { const c = Modell.verlauf(t, V), f1 = V.faktoren[1]; return css(F.dunkel && t <= f1 ? c.map((v, i) => Math.round(v + [30, 42, 40][i] * (1 - t / f1))) : c); };

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 10, wert: 1 },
    parameter: [
      { id: "richtung", gruppe: { de: "Isovist", en: "Isovist" }, name: { de: "Blickrichtung (Angle Direction) rad", en: "Angle direction (rad)" }, min: 0, max: 6.28, schritt: 0.01, wert: S.richtung },
      { id: "reichweite", name: { de: "Reichweite (Viewing Range) m", en: "Viewing range (m)" }, min: 1, max: 200, schritt: 1, wert: S.reichweite },
      { id: "winkel", name: { de: "Blickwinkel (Viewing Angle) °", en: "Viewing angle °" }, min: 0, max: 360, schritt: 1, wert: S.winkel },
      { id: "strahlen", name: { de: "Strahlen (Isovist Rays)", en: "Isovist rays" }, min: 1, max: 720, schritt: 1, wert: S.strahlen },
      { id: "mass", gruppe: { de: "Sichtbarkeit je Gebäude", en: "Visibility per building" }, art: "auswahl", name: { de: "Maß (Obstacle Visibility)", en: "Measure (obstacle visibility)" }, wert: S.mass,
        optionen: [{ wert: "strahlen", name: { de: "Strahltreffer (Original)", en: "ray hits (original)" } }, { wert: "laenge", name: { de: "sichtbare Länge (Toolbox v2)", en: "visible length (toolbox v2)" } }] },
      { id: "bezug", art: "auswahl", name: { de: "geteilt durch", en: "divided by" }, wert: S.bezug,
        optionen: [{ wert: "flaeche", name: { de: "Grundfläche (Original)", en: "footprint (original)" } }, { wert: "umfang", name: { de: "Umfang", en: "perimeter" } }] },
      { id: "schrittweite", gruppe: { de: "Abspielen", en: "Playback" }, name: { de: "Weg je Schritt (Anteil)", en: "Path per step (fraction)" }, min: 0.001, max: 0.02, schritt: 0.001, wert: S.schrittweite },
      { id: "faerbeGebaeude", gruppe: { de: "Darstellung", en: "Display" }, art: "schalter", name: { de: "Gebäude färben", en: "Colour buildings" }, wert: true },
      { id: "faerbeKanten", art: "schalter", name: { de: "Kanten färben", en: "Colour edges" }, wert: true },
      { id: "zeigeIsovist", art: "schalter", name: { de: "Isovist zeigen", en: "Show isovist" }, wert: true },
      { id: "zeigeWeg", art: "schalter", name: { de: "Weg zeigen", en: "Show path" }, wert: true }
    ],
    groesse: z => ({ b: z.b, h: z.h }),
    klick(z, p, x, y, taste) {
      if (taste === "rechts") window.SIM.setze("richtung", Math.round(Modell.richtungZu(z.o, [x, y]) * 100) / 100);
      else Modell.setzeStandpunkt(z, p, [x, y]);
    },
    zeichne(ctx, z, p, F) {
      const px = F.px, s = z.s, O = z.O, V = Modell.verlaufFuer(p.mass);
      const grau = F.dunkel ? "#2c2c31" : "#d9d9de", strich = F.dunkel ? "#55555d" : "#a9a9b1";
      z.szene.gebaeude.forEach((g, i) => Karte.poly(ctx, g, p.faerbeGebaeude ? farbe(s.maxG > 0 ? s.gebN[i] / s.maxG : 0, F, V) : grau, p.faerbeKanten ? null : strich, px * 0.6));
      if (p.zeigeWeg) Karte.linie(ctx, z.pfad.concat([z.pfad[0]]), F.dunkel ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.25)", px * 1, [4 * px, 4 * px]);
      if (p.zeigeIsovist) Karte.poly(ctx, Geo.isovistPolygon(z.iso), F.dunkel ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", F.dunkel ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)", px * 1);
      if (p.faerbeKanten) {
        // Kanten wie die Gruppe „Normalizing the number of ray hits by the length of the obstacle“: Treffer ÷ Länge
        // Sind die Gebäude gefärbt, nur gesehene Kanten zeichnen, mit einem Rand in der Papierfarbe, damit sie sich von der Füllung abheben
        ctx.lineCap = "round";
        for (const durchgang of p.faerbeGebaeude ? [0, 1] : [1]) for (let k = 0; k < O.segmente.length; k++) {
          const t = s.maxK > 0 ? s.kanteN[k] / s.maxK : 0;
          if (p.faerbeGebaeude && t === 0) continue;
          const q = O.segmente[k];
          ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]); ctx.lineTo(q[1][0], q[1][1]);
          ctx.strokeStyle = durchgang ? farbe(t, F, V) : F.papier; ctx.lineWidth = (durchgang ? 2.2 : 4.4) * px; ctx.stroke();
        }
        ctx.lineCap = "butt";
      }
      const a = Modell.auswertung(z);
      if (a.bester >= 0) Karte.poly(ctx, z.szene.gebaeude[a.bester], null, F.tinte, px * 2.4);
      const r = Modell.blick(p.richtung);
      if (p.winkel < 360) Karte.pfeil(ctx, z.o, [Math.cos(r), Math.sin(r)], 16 * px, F.tinte, px * 1.6);
      Karte.punkt(ctx, z.o, 4.5 * px, F.akzent, F.tinte, px * 1.2);
    },
    legende: (F, p, z) => {
      const VV = Modell.verlaufFuer(p.mass), V = VV.faktoren, L = [[farbe(0, F, VV), { de: "nicht gesehen", en: "not seen" }]];
      if (p.mass === "laenge") {
        // linearer Verlauf: Werte der Griffe für die Gebäude (Anteil des Umfangs bzw. sichtbare m je 100 m² Grundfläche)
        const mx = z.s.maxG, w = f => p.bezug === "umfang" ? zahl(100 * f * mx, 0) + " %" : zahl(100 * f * mx, 1);
        V.slice(1).forEach((f, i) => L.push([farbe(f, F, VV), i === V.length - 2
          ? (p.bezug === "umfang" ? { de: `${w(f)} des Umfangs sichtbar`, en: `${w(f)} of perimeter visible` } : { de: `${w(f)} m je 100 m²`, en: `${w(f)} m per 100 m²` })
          : w(f)]));
      } else V.slice(1).forEach((f, i) => L.push([farbe(f, F, VV), i === V.length - 2 ? { de: "stark gesehen", en: "highly visible" } : ""]));
      return L.concat([[F.akzent, { de: "Standpunkt", en: "Viewpoint" }]]);
    },
    kennzahlen: (z, p) => {
      const a = Modell.auswertung(z), s = z.s, b = a.bester;
      const L = [
        [{ de: "sichtbare Gebäude", en: "Visible buildings" }, `${a.sichtbar} / ${a.gebaeude}`],
        [{ de: "sichtbare Kanten", en: "Visible edges" }, `${a.kanten} / ${s.kante.length}`],
        [{ de: "Strahlen auf Gebäuden", en: "Rays hitting buildings" }, `${a.treffer} / ${z.iso.treffer.length}`],
        [{ de: "Strahlen ins Freie", en: "Rays into the open" }, String(a.frei)]
      ];
      if (b >= 0) L.push(
        [{ de: "sichtbarstes Gebäude", en: "Most visible building" }, (b === z.szene.gebaeude.length - 1 && z.szene.kirche ? (de() ? "Kirche" : "church") : "#" + (b + 1))],
        [{ de: "… Treffer", en: "… hits" }, String(s.geb[b])],
        [{ de: "… sichtbare Länge", en: "… visible length" }, zahl(s.gebL[b], 1) + " m"],
        [p.mass === "laenge"
          ? (p.bezug === "umfang" ? { de: "… sichtbarer Anteil des Umfangs", en: "… visible share of perimeter" } : { de: "… sichtbare m je 100 m² Fläche", en: "… visible m per 100 m² area" })
          : (p.bezug === "umfang" ? { de: "… Treffer je m Umfang", en: "… hits per m perimeter" } : { de: "… Treffer je 100 m² Fläche", en: "… hits per 100 m² area" }),
         zahl(p.bezug === "umfang" ? s.gebN[b] : s.gebN[b] * 100, 2)],
        [{ de: "… Grundfläche", en: "… footprint" }, zahl(z.O.flaeche[b], 0) + " m²"]
      );
      if (z.szene.kirche) { const k = z.szene.gebaeude.length - 1; L.push([{ de: "Kirche: Treffer", en: "Church: hits" }, String(s.geb[k])]); }
      L.push([{ de: "Isovist-Fläche", en: "Isovist area" }, zahl(Geo.isovistMasse(z.iso).area, 0) + " m²"]);
      return L;
    }
  });
})();
