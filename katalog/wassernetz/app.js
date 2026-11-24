/* Wassernetz: Erzeugung und Analyse · Bedienung und Darstellung (Modelllogik in modell.js, Löser in ../_gemeinsam/hydraulik.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const en = () => document.documentElement.lang === "en";
  const zahl = (v, n = 0) => v == null || !isFinite(v) ? "–" : v.toLocaleString(en() ? "en" : "de", { minimumFractionDigits: n, maximumFractionDigits: n });
  const ROHR = { q: { de: "Durchfluss (Flow rate) L/s", en: "Flow rate (L/s)" }, v: { de: "Geschwindigkeit (Flow velocity) m/s", en: "Flow velocity (m/s)" },
                 verlust: { de: "Verlust (Head loss) m/km", en: "Head loss (m/km)" }, status: { de: "Status (Actual link status)", en: "Actual link status" },
                 C: { de: "Rauheit (Roughness)", en: "Roughness" }, energie: { de: "Energie (Energy expended) kW", en: "Energy expended (kW)" } };
  const KNOTEN = { bedarf: { de: "Entnahme (Actual demand) L/s", en: "Actual demand (L/s)", n: 2 }, kopf: { de: "Druckhöhe (Hydraulic head) m", en: "Hydraulic head (m)", n: 0 },
                   druck: { de: "Druck (Pressure) bar", en: "Pressure (bar)", n: 1 } };
  const EINHEIT = { q: "L/s", v: "m/s", verlust: "m/km", status: "", C: "", energie: "kW" };
  const ROT = "#e8333c", GRUEN = "#2fb84f", LILA = "#a34be0";
  const tankFarbe = F => F.dunkel ? "#4f9bff" : "#1f5fd1";
  const wegFarbe = (F, h) => h ? (F.dunkel ? "rgba(240,80,127,0.85)" : "rgba(200,20,90,0.8)") : (F.dunkel ? "rgba(79,208,234,0.85)" : "rgba(11,125,151,0.85)");
  const druckFarbe = b => b == null ? null : b < Modell.DRUCK_MIN ? ROT : b > Modell.DRUCK_MAX ? LILA : GRUEN;
  /** Farbskala der Rohre (Grasshopper-Gradient, Karte „spektral“), im Hellen abgedunkelt */
  const rohrFarbe = (t, F) => { const c = Karte.farbeRGB(t, "spektral"), k = F.dunkel ? 1 : 0.78; return `rgb(${c.map(v => Math.round(v * k)).join(",")})`; };
  const strasseFarbe = F => F.dunkel ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.25)";

  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 20, wert: 1 },
    parameter: [
      { id: "tankHoehe", gruppe: { de: "Geometry Setup", en: "Geometry setup" }, name: { de: "Wasserstand im Hochbehälter (Tank Height) m", en: "Tank height (m)" }, min: 0, max: 100, schritt: 1, wert: S.tankHoehe },
      { id: "bedarfHaushalt", name: { de: "Bedarf je Haushalt (DemandPerHousehold) L/Tag", en: "Demand per household (L/day)" }, min: 0, max: 100, schritt: 1, wert: S.bedarfHaushalt },
      { id: "spitzenfaktor", name: { de: "Spitzenfaktor (in der Datei fest 5)", en: "Peak factor (fixed 5 in the file)" }, min: 1, max: 10, schritt: 0.5, wert: S.spitzenfaktor },
      { id: "flaecheHaushalt", name: { de: "Fläche je Haushalt (AreaPerHousehold) m²", en: "Area per household (m²)" }, min: 50, max: 1000, schritt: 1, wert: S.flaecheHaushalt },
      { id: "gP", gruppe: { de: "Kürzeste Wege (Weights per Street Hierarchy)", en: "Shortest paths (weights per street hierarchy)" }, name: { de: "Gewicht Primary", en: "Weight primary" }, min: 0.5, max: 5, schritt: 0.5, wert: S.gP },
      { id: "gS", name: { de: "Gewicht Secondary", en: "Weight secondary" }, min: 0.5, max: 5, schritt: 0.5, wert: S.gS },
      { id: "gT", name: { de: "Gewicht Tertiary", en: "Weight tertiary" }, min: 0.5, max: 5, schritt: 0.5, wert: S.gT },
      { id: "schwelle", name: { de: "Schwelle Zusatzlänge (Number Slider, Remap ≤)", en: "Extra-length threshold (remap ≤)" }, min: 0, max: 1, schritt: 0.1, wert: S.schwelle },
      { id: "iterationen", gruppe: { de: "Rohrdimensionierung (Loop)", en: "Pipe dimensioning (loop)" }, name: { de: "Durchgänge (Iterations)", en: "Iterations" }, min: 0, max: 5, schritt: 1, wert: S.iterationen },
      { id: "vMax", name: { de: "Höchstgeschwindigkeit (Max. Velocity) m/s", en: "Max. velocity (m/s)" }, min: 0, max: 10, schritt: 0.1, wert: S.vMax },
      { id: "rohrWert", gruppe: { de: "Darstellung", en: "Display" }, art: "auswahl", name: { de: "Rohre (Pipe values)", en: "Pipe values" }, wert: S.rohrWert,
        optionen: Object.keys(ROHR).map(w => ({ wert: w, name: ROHR[w] })) },
      { id: "farbGrenze", name: { de: "Obergrenze Farbskala (Number Slider)", en: "Upper colour limit" }, min: 0, max: 10, schritt: 0.1, wert: S.farbGrenze },
      { id: "linie", name: { de: "Linienstärke (Durchmesser × Number Slider)", en: "Line weight (diameter × slider)" }, min: 0, max: 1000, schritt: 10, wert: S.linie },
      { id: "knotenWert", art: "auswahl", name: { de: "Verbraucher (Node values)", en: "Node values" }, wert: S.knotenWert,
        optionen: Object.keys(KNOTEN).map(w => ({ wert: w, name: KNOTEN[w] })) },
      { id: "kontur", name: { de: "Höhenlinien (Contour) m", en: "Contour interval (m)" }, min: 0, max: 20, schritt: 1, wert: S.kontur },
      { id: "beschriftung", art: "schalter", name: { de: "Werte beschriften", en: "Label values" }, wert: S.beschriftung }
    ],
    groesse: z => ({ b: z.b, h: z.h }),
    klick(z, p, x, y) { Modell.setzeTank(z, p, [Math.max(0, Math.min(z.b, x)), Math.max(0, Math.min(z.h, y))]); },
    aktionen: [{ name: { de: "Rechnen", en: "Compute" }, tue: (z, p) => Modell.rechneAlles(z, p) }],
    ende: z => Modell.fertig(z),
    zeichne(ctx, z, p, F) {
      const px = F.px, Sz = z.Sz, N = Sz.N;
      Karte.gelaende(ctx, Sz.G, F, { hoehenlinien: p.kontur > 0 ? p.kontur : 0 });
      ctx.lineCap = "round";
      // Straßen nach Hierarchie (dünn, Hintergrund)
      const BR = [0.8, 1.3, 2.2];
      for (const c of [0, 1, 2]) {
        ctx.beginPath();
        N.kanten.forEach((e, k) => { if (Sz.klasse[k] === c || (c === 0 && Sz.klasse[k] < 0)) { const a = N.knoten[e.a], b = N.knoten[e.b]; ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); } });
        ctx.strokeStyle = strasseFarbe(F); ctx.lineWidth = px * BR[c]; ctx.stroke();
      }
      const kante = (k, farbe, lw) => { const e = N.kanten[k], a = N.knoten[e.a], b = N.knoten[e.b]; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.strokeStyle = farbe; ctx.lineWidth = lw; ctx.stroke(); };
      if (!z.rohre) {
        // Phase „wege“: die beiden kürzesten Wege je Verbraucher
        const H = new Set(), L = new Set();
        z.wegeH.forEach(w => w && w.forEach(k => H.add(k))); z.wegeL.forEach(w => w && w.forEach(k => L.add(k)));
        L.forEach(k => kante(k, wegFarbe(F, false), px * 3.2));
        H.forEach(k => kante(k, wegFarbe(F, true), px * 1.6));
        const v = z.verbraucher[z.k - 1];
        if (v) Karte.punkt(ctx, v.c, px * 6, null, F.tinte, px * 1.6);
      } else {
        // Wassernetz: Farbe nach dem gewählten Rohrwert (Gradient 0 … Obergrenze), Stärke = Durchmesser × Number Slider
        const werte = z.erg ? z.erg.leitungen.map(l => l[p.rohrWert]) : null;
        const ord = z.rohre.map((k, r) => r).sort((a, b) => (werte ? werte[a] - werte[b] : 0));
        for (const r of ord) {
          const t = werte && p.farbGrenze > 0 ? werte[r] / p.farbGrenze : 0;
          const farbe = werte ? rohrFarbe(t, F) : (F.dunkel ? "#9ab" : "#567");
          kante(z.rohre[r], farbe, px * (1 + Modell.DURCHMESSER[z.dIdx[r]] * p.linie / 6));
        }
      }
      // Verbraucher (öffentliche Zapfstellen): rot unter 1 bar, lila über 16 bar, grün dazwischen
      const art = p.knotenWert, viele = z.verbraucher.length > 0;
      z.verbraucher.forEach((v, c) => {
        const b = Modell.druckBar(z, c), f = druckFarbe(b);
        Karte.punkt(ctx, v.c, px * 3.6, f || F.flaeche, F.tinte, px * 0.8);
        if (p.beschriftung && b != null && viele) {
          const w = art === "druck" ? b : Modell.knotenWert(z, c, art);
          Karte.text(ctx, zahl(w, KNOTEN[art].n) + (art === "druck" ? " bar" : ""), [v.c[0] + 6 * px, v.c[1] - 6 * px], F.tinte, px, 9);
        }
      });
      // Hochbehälter (verschiebbar): blau, Beschriftung mit Druck am Behälter (= Wasserstand)
      const tk = N.knoten[z.tankKnoten];
      ctx.beginPath(); ctx.moveTo(z.tank[0], z.tank[1]); ctx.lineTo(tk[0], tk[1]); ctx.strokeStyle = tankFarbe(F); ctx.lineWidth = px; ctx.stroke();
      Karte.punkt(ctx, tk, px * 9, tankFarbe(F), F.papier, px * 2);
      const tb = z.erg ? Math.round(p.tankHoehe) / 10 : null;
      Karte.text(ctx, (en() ? "Water tank" : "Hochbehälter") + (tb != null ? " · " + zahl(tb, 1) + " bar" : ""), [tk[0] + 14 * px, tk[1] + 2 * px], F.tinte, px, 12);
      if (z.t === 0) {
        const lang = en() ? "Start: paths to one consumer per step, then network, pipe sizing, analysis · click: move the tank" : "Start: Wege zu einem Verbraucher je Schritt, dann Netz, Dimensionierung, Analyse · Klick: Hochbehälter versetzen";
        const kurz = en() ? "Start · click: move the tank" : "Start · Klick: Behälter versetzen";
        Karte.text(ctx, lang.length * 6.8 < z.b / px - 24 ? lang : kurz, [z.b / 2, z.h - 20 * px], F.tinte, px, 11, "center");
      }
    },
    legende: (F, p, z) => (z && !z.rohre
      ? [[wegFarbe(F, false), { de: "kürzester Weg nach Länge", en: "Shortest path by length" }], [wegFarbe(F, true), { de: "kürzester Weg nach Hierarchie", en: "Shortest path by hierarchy" }]]
      : [0, 0.25, 0.5, 0.75, 1].map((t, i) => [rohrFarbe(t, F), i === 0 ? { de: "Rohr: 0", en: "Pipe: 0" } : i === 4 ? { de: zahl(p.farbGrenze, 1) + " " + EINHEIT[p.rohrWert], en: zahl(p.farbGrenze, 1) + " " + EINHEIT[p.rohrWert] } : ""]))
      .concat([[GRUEN, { de: "1–16 bar", en: "1–16 bar" }], [ROT, { de: "unter 1 bar", en: "below 1 bar" }], [LILA, { de: "über 16 bar", en: "above 16 bar" }], [tankFarbe(F), { de: "Hochbehälter", en: "Water tank" }]]),
    kennzahlen(z, p) {
      const b = Modell.bilanz(z, p);
      const phase = { wege: { de: "Wege " + z.k + " / " + b.verbraucher, en: "paths " + z.k + " / " + b.verbraucher }, netz: { de: "Netz kombinieren", en: "combine network" },
                      dimension: { de: "Dimensionierung " + z.durchgang + " / " + p.iterationen, en: "sizing " + z.durchgang + " / " + p.iterationen },
                      analyse: { de: z.fertig ? "fertig ✓" : "Analyse", en: z.fertig ? "done ✓" : "analysis" } }[z.phase];
      const dm = b.durchmesser ? Modell.DURCHMESSER.map((d, j) => b.durchmesser[j] ? zahl(d * 1000) + ":" + b.durchmesser[j] : "").filter(Boolean).join(" ") : "–";
      return [
        [{ de: "Ablauf", en: "Stage" }, phase],
        [{ de: "Verbraucher · Haushalte", en: "Consumers · households" }, zahl(b.verbraucher) + " · " + zahl(b.haushalte)],
        [{ de: "Bedarf gesamt", en: "Total demand" }, zahl(b.bedarf, 2) + " L/s"],
        [{ de: "Rohre · Länge", en: "Pipes · length" }, b.rohre != null ? zahl(b.rohre) + " · " + zahl(b.laenge / 1000, 2) + " km" : "–"],
        [{ de: "Maschen", en: "Loops" }, b.maschen != null ? zahl(b.maschen) : "–"],
        [{ de: "Zusatzwege behalten", en: "Extra paths kept" }, b.zusatzBehalten != null ? zahl(b.zusatzBehalten) + " / " + zahl(b.verbraucher) : "–"],
        [{ de: "Durchmesser mm : Rohre", en: "Diameter mm : pipes" }, dm],
        [{ de: "vergrößert je Durchgang", en: "Enlarged per pass" }, z.vergroessert.length ? z.vergroessert.join(" · ") : "–"],
        [{ de: "Druck min … max", en: "Pressure min … max" }, b.druckMin != null ? zahl(b.druckMin, 1) + " … " + zahl(b.druckMax, 1) + " bar" : "–"],
        [{ de: "unter 1 · über 16 bar", en: "below 1 · above 16 bar" }, b.zuWenig != null ? zahl(b.zuWenig) + " · " + zahl(b.zuViel) : "–"],
        [{ de: "größte Geschwindigkeit", en: "Max. velocity" }, b.vMax != null ? zahl(b.vMax, 2) + " m/s" : "–"],
        [{ de: "Iterationen (Gradientenverfahren)", en: "Iterations (gradient method)" }, b.iter != null ? zahl(b.iter) : "–"]
      ];
    }
  });
})();
