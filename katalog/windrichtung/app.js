/* Windrichtung und Luftbelastung · Bedienung und Darstellung (Modelllogik in modell.js)
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const en = () => document.documentElement.lang === "en";
  const zahl = (v, n = 1) => v.toLocaleString(en() ? "en" : "de", { minimumFractionDigits: n, maximumFractionDigits: n });
  const wissen = v => v === 0 ? "0" : Math.abs(v) >= 0.01 ? zahl(v, 3) : v.toExponential(2).replace(".", en() ? "." : ",");
  /** Farbverlauf des Gradient-Bausteins der .gh-Datei (fünf Griffe 0 / 0,25 / 0,5 / 0,75 / 1) */
  const VERLAUF = [[0, 61, 89], [0, 155, 180], [148, 193, 28], [243, 154, 0], [183, 26, 73]];
  const ROSE = "#d6283c";
  const himmel = g => { const H = en() ? ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] : ["N", "NO", "O", "SO", "S", "SW", "W", "NW"]; return H[Math.round(((g % 360) + 360) % 360 / 45) % 8]; };

  // Gelände einmal als Bild rechnen (je Szene und Darstellung; Karte.gelaendeGespeichert, Bild 720 × 720 Bildpunkte)
  const gelaende = (ctx, z, F) => Karte.gelaendeGespeichert(ctx, z.sz.G, F, { hoehenlinien: 10, aufloesung: 360, bild: 720, pxBild: true });

  /** Windrose wie in der .gh-Datei: Radial-Raster (Ringe, Speichen auf den Sektorgrenzen), je Sektor ein Keil mit der
      bezogenen Häufigkeit als Radius, Beschriftung N/O/S/W; gezeichnet in Herkunftsrichtung (center_degrees + Drehung − 180) */
  function zeichneRose(ctx, z, p, F) {
    const R = z.rose, O = z.roseO, s = p.massstab, px = F.px, w = R.breite, dreh = p.drehung - 180, lauf = Modell.laufend(z, p);
    const auf = (g, r) => { const v = Modell.peilungZuVektor(g); return [O[0] + v[0] * r, O[1] + v[1] * r]; };
    ctx.save();
    Karte.punkt(ctx, O, s, F.dunkel ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.55)", null);
    const ringe = Math.max(1, Math.round(p.ringe));
    for (let k = 1; k <= ringe; k++) Karte.punkt(ctx, O, s * k / ringe, null, "rgba(214,40,60,0.45)", px * 0.8);
    ctx.beginPath();
    for (let i = 0; i < R.n; i++) { const q = auf(R.mitten[i] + dreh + w / 2, s); ctx.moveTo(O[0], O[1]); ctx.lineTo(q[0], q[1]); }
    ctx.strokeStyle = "rgba(214,40,60,0.45)"; ctx.lineWidth = px * 0.8; ctx.stroke();
    for (let i = 0; i < R.n; i++) {
      const c = R.mitten[i] + dreh, r = z.f[i] * s, an = i < z.aktiv, jetzt = lauf && lauf.i === i;
      const K = [O, auf(c - w / 2, r), auf(c + w / 2, r)];
      Karte.poly(ctx, K, jetzt ? F.akzent : an ? "rgba(214,40,60,0.55)" : "rgba(214,40,60,0.12)", jetzt ? F.akzent : ROSE, px * (an || jetzt ? 1.3 : 0.8));
    }
    Karte.punkt(ctx, O, px * 4, ROSE, null);
    for (const [g, t] of [[0, "N"], [90, en() ? "E" : "O"], [180, "S"], [270, "W"]]) Karte.text(ctx, t, auf(g, s + 16 * px), F.tinte, px, 12, "center");
    const iMax = R.werte.indexOf(Math.max(...R.werte));
    Karte.text(ctx, (en() ? "wind rose · max " : "Windrose · max ") + zahl(R.werte[iMax], 1) + " % " + (en() ? "from " : "aus ") + himmel(R.mitten[iMax]), [O[0], O[1] + s + 38 * px], F.gedaempft, px, 11, "center");
    ctx.restore();
  }

  /** Kleiner Funktionsgraph wie „Quick Graph“ der .gh-Datei: Exp(−k·x) über Range(0 … Falloff Radius, 10 Schritte) */
  function zeichneAbfall(ctx, z, p, F) {
    const px = F.px, b = 200 * px, h = 90 * px, x0 = z.b - b - 30 * px, y0 = z.h - h - 30 * px, R = Math.max(1, p.radius);
    Karte.poly(ctx, [[x0 - 8 * px, y0 - 24 * px], [x0 + b + 8 * px, y0 - 24 * px], [x0 + b + 8 * px, y0 + h + 22 * px], [x0 - 8 * px, y0 + h + 22 * px]], F.dunkel ? "rgba(0,0,0,0.72)" : "rgba(255,255,255,0.85)", F.linie, px);
    Karte.linie(ctx, [[x0, y0], [x0, y0 + h], [x0 + b, y0 + h]], F.gedaempft, px);
    const P = []; for (let i = 0; i <= 10; i++) { const x = R * i / 10; P.push([x0 + b * i / 10, y0 + h * (1 - Modell.abfall(x, p.abfallK))]); }
    Karte.linie(ctx, P, F.akzent, px * 1.6);
    for (const q of P) Karte.punkt(ctx, q, px * 2, F.akzent, null);
    Karte.text(ctx, "Exp(−" + String(p.abfallK).replace(".", en() ? "." : ",") + "·x)", [x0, y0 - 12 * px], F.tinte, px, 11);
    Karte.text(ctx, "0", [x0, y0 + h + 11 * px], F.gedaempft, px, 10, "center");
    Karte.text(ctx, zahl(R, 0) + " m", [x0 + b, y0 + h + 11 * px], F.gedaempft, px, 10, "right");
    Karte.text(ctx, "F(R) = " + wissen(z.max), [x0 + b, y0 + 6 * px], F.gedaempft, px, 10, "right");
  }

  Sim.starte({
    modell: Modell,
    saat: 1,
    autostart: true,
    tempo: { min: 1, max: 20, wert: 1 },
    parameter: [
      { id: "modus", art: "auswahl", gruppe: { de: "Berechnung", en: "Calculation" }, name: { de: "Rechnung (Toggle)", en: "Calculation (toggle)" }, wert: S.modus,
        optionen: [{ wert: "wind", name: { de: "Windrichtung (windDirection)", en: "Wind direction" } }, { wert: "belastung", name: { de: "Luftbelastung (pollution)", en: "Air pollution" } }] },
      { id: "parzelle", name: { de: "Parzelle (Parcel Index)", en: "Parcel index" }, min: 0, max: 100, schritt: 1, wert: S.parzelle },
      { id: "tauschen", art: "schalter", name: { de: "Wind From ↔ Wind To tauschen", en: "Swap Wind From ↔ Wind To" }, wert: S.tauschen },
      { id: "faktor", name: { de: "Sektorfaktor (Number Slider 1.25)", en: "Sector factor (number slider 1.25)" }, min: 0, max: 10, schritt: 0.05, wert: S.faktor },
      { id: "skala", art: "auswahl", name: { de: "Farbskala bis", en: "Colour scale up to" }, wert: S.skala,
        optionen: [{ wert: "gh", name: { de: "Max der .gh (1 bzw. Abfall bei Reichweite)", en: "Max of the .gh (1 or falloff at radius)" } }, { wert: "groesster", name: { de: "größter Wert", en: "largest value" } }] },
      { id: "abfallK", gruppe: { de: "Abfall (Distance Falloff)", en: "Distance falloff" }, name: { de: "k in Exp(−k·x)", en: "k in Exp(−k·x)" }, min: 0, max: 0.1, schritt: 0.001, wert: S.abfallK },
      { id: "radius", name: { de: "Reichweite (Falloff Radius) m", en: "Falloff radius (m)" }, min: 0, max: 1000, schritt: 1, wert: S.radius },
      { id: "rose", art: "auswahl", gruppe: { de: "Windrose (windFrequencyRose.json)", en: "Wind rose (windFrequencyRose.json)" }, name: { de: "Windrose", en: "Wind rose" }, wert: S.rose,
        optionen: [{ wert: "weimar", name: { de: "Beispiel: West/Südwest (Weimar-typisch)", en: "Example: west/south-west (typical of Weimar)" } },
                   { wert: "gleich", name: { de: "Beispiel: gleichverteilt", en: "Example: uniform" } },
                   { wert: "nordost", name: { de: "Beispiel: Nordost, 16 Sektoren", en: "Example: north-east, 16 sectors" } },
                   { wert: "eigen", name: { de: "Eingefügte Datei", en: "Pasted file" } }] },
      { id: "drehung", name: { de: "Drehung (Number Slider 180) °", en: "Rotation (number slider 180) °" }, min: 0, max: 360, schritt: 1, wert: S.drehung },
      { id: "massstab", name: { de: "Maßstab (WindRoseScale) m", en: "Scale (WindRoseScale) m" }, min: 0, max: 1000, schritt: 1, wert: S.massstab },
      { id: "ringe", name: { de: "Ringe (Radial Extent R)", en: "Rings (radial extent R)" }, min: 1, max: 10, schritt: 1, wert: S.ringe },
      { id: "takt", gruppe: { de: "Abspielen", en: "Playback" }, name: { de: "Schritte je Sektor", en: "Steps per sector" }, min: 1, max: 30, schritt: 1, wert: S.takt },
      { id: "kegel", art: "schalter", name: { de: "Suchkegel zeigen", en: "Show search cone" }, wert: S.kegel }
    ],
    aktionen: [
      { name: { de: "Alle", en: "All" }, tue(z, p) { z.t = z.rose.n * Math.max(1, Math.round(p.takt)); Modell.rechne(z, p); } },
      { name: { de: "JSON…", en: "JSON…" }, tue(z, p) {
        const s = window.prompt(en() ? "Paste the content of windFrequencyRose.json (Global Wind Atlas → Plot data):" : "Inhalt von windFrequencyRose.json einfügen (Global Wind Atlas → Plot data):", "");
        if (!s) return;
        try { Modell.roseAusJSON(s); p.eigeneRose = s; window.SIM.setze("rose", "eigen"); }
        catch (e) { window.alert((en() ? "Could not read the file: " : "Datei nicht lesbar: ") + e.message); }
      } }
    ],
    groesse: z => ({ b: z.b, h: z.h }),
    ende: (z, p) => Modell.fertig(z, p),
    klick(z, p, x, y, taste, phase) {
      const q = [x, y];
      if (phase === "unten") z.zieheRose = taste === "rechts" || Math.hypot(x - z.roseO[0], y - z.roseO[1]) < Math.max(60, p.massstab * 0.3);
      if (z.zieheRose) { z.roseO = [Math.max(0, Math.min(z.b, x)), Math.max(0, Math.min(z.h, y))]; return; }
      Modell.waehle(z, p, Modell.parzelleAn(z, q));
    },
    zeichne(ctx, z, p, F) {
      const px = F.px, sz = z.sz, lauf = Modell.laufend(z, p);
      gelaende(ctx, z, F);
      const rand = F.dunkel ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)", leer = F.dunkel ? "#5b5b62" : "#a4a4ab";
      sz.parzellen.forEach((P, j) => {
        const v = z.werte[j];
        Karte.poly(ctx, P, v == null ? leer : Karte.farbe(v / (z.max || 1), VERLAUF, 0.94), rand, px * 0.7);
      });
      const s = sz.schwerpunkte[z.auswahl];
      // Suchkegel des laufenden Sektors: alle Parzellen, deren Richtung höchstens Sektorbreite·Faktor/2 abweicht
      if (p.kegel && lauf && lauf.i < z.rose.n) {
        const d = z.richtungen[lauf.i] + (p.tauschen ? 180 : 0), L = 1800 * lauf.anteil, g = Math.min(179, z.grenze);
        const K = [s]; for (let k = 0; k <= 16; k++) { const v = Modell.peilungZuVektor(d - g + 2 * g * k / 16); K.push([s[0] + v[0] * L, s[1] + v[1] * L]); }
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, z.b, z.h); ctx.clip();
        Karte.poly(ctx, K, F.dunkel ? "rgba(158,160,243,0.16)" : "rgba(70,73,225,0.12)", F.akzent, px * 1.2);
        ctx.restore();
      }
      Karte.poly(ctx, sz.parzellen[z.auswahl], null, F.akzent, px * 3);
      Karte.punkt(ctx, s, px * 6, F.akzent, F.tinte, px * 1.2);
      // Hauptwindrichtung als Pfeil an der gewählten Parzelle
      const iMax = z.rose.werte.indexOf(Math.max(...z.rose.werte)), dv = Modell.peilungZuVektor(z.richtungen[iMax]);
      Karte.pfeil(ctx, s, p.tauschen ? [-dv[0], -dv[1]] : dv, 60 * px, F.tinte, px * 1.6);
      Karte.text(ctx, (p.tauschen ? "Wind To · #" : "Wind From · #") + z.auswahl, [s[0] + 12 * px, s[1] + 16 * px], F.tinte, px, 12);
      zeichneRose(ctx, z, p, F);
      if (p.modus === "belastung") zeichneAbfall(ctx, z, p, F);
      if (z.aktiv === 0) Karte.text(ctx, en() ? "Start / Step: add the wind sectors one by one" : "Start / Schritt: Windsektoren nacheinander addieren", [30 * px, 30 * px], F.tinte, px, 13);
    },
    legende: (F, p, z) => Karte.skalenLegende(VERLAUF, "0", wissen(z ? z.max : 1)).concat([[F.dunkel ? "#5b5b62" : "#a4a4ab", { de: "kein Wert (kein Sektor trifft)", en: "no value (no sector hits)" }], [F.akzent, { de: p.tauschen ? "gewählte Parzelle (Wind To)" : "gewählte Parzelle (Wind From)", en: p.tauschen ? "selected parcel (Wind To)" : "selected parcel (Wind From)" }], [ROSE, { de: "Windrose", en: "Wind rose" }]]),
    kennzahlen(z, p) {
      const R = z.rose, ll = Modell.leeLuv(z), iMax = R.werte.indexOf(Math.max(...R.werte));
      return [
        [{ de: "Rechnung", en: "Calculation" }, p.modus === "belastung" ? { de: "Luftbelastung", en: "Air pollution" } : { de: "Windrichtung", en: "Wind direction" }],
        [{ de: "Sektoren geprüft", en: "Sectors checked" }, z.aktiv + " / " + R.n],
        [{ de: "Sektorbreite · Grenzwinkel", en: "Sector width · limit angle" }, zahl(R.breite, 1) + "° · " + zahl(z.grenze, 2) + "°"],
        [{ de: "Hauptwind", en: "Prevailing wind" }, (en() ? "from " : "aus ") + himmel(R.mitten[iMax]) + " (" + zahl(R.werte[iMax], 1) + " %)"],
        [{ de: "Gewählte Parzelle", en: "Selected parcel" }, "#" + z.auswahl + " / " + z.sz.parzellen.length],
        [{ de: "Parzellen mit Wert", en: "Parcels with value" }, String(z.mitWert)],
        [{ de: "Mittel · größter Wert", en: "Mean · largest value" }, z.mittel == null ? "–" : wissen(z.mittel) + " · " + wissen(z.groesster)],
        [{ de: "Obergrenze Farbe (Max)", en: "Colour upper limit (Max)" }, wissen(z.max)],
        [{ de: "Mittel Lee · Luv (±45°)", en: "Mean lee · windward (±45°)" }, (ll.lee == null ? "–" : wissen(ll.lee)) + " · " + (ll.luv == null ? "–" : wissen(ll.luv))]
      ];
    }
  });
})();
