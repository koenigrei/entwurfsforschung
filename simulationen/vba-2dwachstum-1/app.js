/* 2Dwachstum 01–03 · Bedienung und Darstellung (Modelllogik in modell.js)
   Würfel in Axonometrie: eigene kleine Parallelprojektion, Zeichenreihenfolge von hinten nach vorn
   (Projektion und AutoCAD-Farbindex wie in der App „Rekursive Strukturen“).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const B = 1000, H = 720;                     // Zeichenfläche in Modelleinheiten (die Struktur wird eingepasst wie ZoomAll)
  const D2R = Math.PI / 180;

  /* ---------------------------------------------------------------- AutoCAD-Farbindex (ACI) */
  const ACI_GRUND = { 1: [255, 0, 0], 2: [255, 255, 0], 3: [0, 255, 0], 4: [0, 255, 255], 5: [0, 0, 255], 6: [255, 0, 255], 8: [128, 128, 128], 9: [192, 192, 192],
                      250: [51, 51, 51], 251: [80, 80, 80], 252: [105, 105, 105], 253: [130, 130, 130], 254: [190, 190, 190], 255: [255, 255, 255] };
  /** RGB einer AutoCAD-Farbnummer; 0 (VONBLOCK) und 7 = Weiß bzw. Schwarz je nach Hintergrund; 10–249: 24 Farbtöne × 5 Helligkeiten × voll/blass */
  function aci(n, F) {
    if (n === 7 || n === 0) return F.dunkel ? [255, 255, 255] : [23, 23, 23];
    if (ACI_GRUND[n]) return ACI_GRUND[n];
    const ton = Math.floor((n - 10) / 10) * 15, v = [1, 0.65, 0.5, 0.3, 0.15][Math.floor((n % 10) / 2)], s = n % 2 ? 0.5 : 1;
    const k = q => { const kk = (q + ton / 60) % 6; return v * (1 - s * Math.max(0, Math.min(kk, 4 - kk, 1))); };
    return [k(5), k(3), k(1)].map(c => Math.round(c * 255));
  }

  /** Grundfarbe eines Würfels: seine zufällige AutoCAD-Farbe oder Grauton nach Höhe (oben heller); sehr dunkle Töne im Dunkeln angehoben */
  function grundfarbe(w, z0, z1, p, F) {
    if (p.farbe === "hoehe") { const g = Math.round(255 * (0.35 + 0.6 * (z1 > z0 ? (w.z - z0) / (z1 - z0) : 1))); return [g, g, g]; }
    const c = aci(w.farbe, F), hell = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
    return F.dunkel && hell < 70 ? Sim.mische(c, [255, 255, 255], 0.25) : !F.dunkel && hell > 235 ? Sim.mische(c, [0, 0, 0], 0.15) : c;
  }
  const schatten = (c, f) => [Math.round(c[0] * f), Math.round(c[1] * f), Math.round(c[2] * f)];

  /* ---------------------------------------------------------------- Projektion */
  /** Ansicht: Drehung θ um die Hochachse, Neigung φ über der Ebene; Massstab und Mitte wie ZoomAll, drehungsunabhängig */
  function ansicht(z, p) {
    const th = p.drehung * D2R, ph = p.neigung * D2R, c = Math.cos(th), s = Math.sin(th), cp = Math.cos(ph), sp = Math.sin(ph);
    let x0 = 0, x1 = 0, y0 = 0, y1 = 0, z0 = 0, z1 = 10;
    const h = Modell.KANTE / 2;
    if (z.wuerfel.length) { x0 = y0 = z0 = Infinity; x1 = y1 = z1 = -Infinity; }
    for (const w of z.wuerfel) {
      if (w.x < x0) x0 = w.x; if (w.x > x1) x1 = w.x; if (w.y < y0) y0 = w.y; if (w.y > y1) y1 = w.y;
      if (w.z - h < z0) z0 = w.z - h; if (w.z + h > z1) z1 = w.z + h;
    }
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, mz = (z0 + z1) / 2;
    let r = 0;
    for (const w of z.wuerfel) r = Math.max(r, Math.hypot(w.x - mx, w.y - my));
    r += h * Math.SQRT2;
    const breite = 2 * r, hoehe = 2 * r * sp + (z1 - z0) * cp;
    const k = Math.min(6, (B * 0.9) / breite, (H * 0.86) / hoehe);
    return {
      c, s, cp, sp, k, z0, z1,
      /** Bildpunkt [x, y] und Tiefe (größer = weiter hinten) eines Raumpunkts */
      p(x, y, zz) {
        const u = (x - mx) * c - (y - my) * s, v = (x - mx) * s + (y - my) * c, q = zz - mz;
        return [B / 2 + k * u, H / 2 - k * (q * cp + v * sp), v * cp - q * sp];
      }
    };
  }

  // Seitenflächen eines Würfels: Normale in der Ebene und Eckfolge (Vorzeichen der Ecken relativ zur Mitte)
  const SEITEN = [
    { n: [1, 0], e: [[1, -1], [1, 1]] }, { n: [-1, 0], e: [[-1, 1], [-1, -1]] },
    { n: [0, 1], e: [[1, 1], [-1, 1]] }, { n: [0, -1], e: [[-1, -1], [1, -1]] }
  ];

  function zeichneWuerfel(ctx, A, w, h, farbe, kante, lw) {
    const oben = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => A.p(w.x + a * h, w.y + b * h, w.z + h));
    ctx.lineWidth = lw; ctx.strokeStyle = kante; ctx.lineJoin = "round";
    for (const sd of SEITEN) {
      const nu = sd.n[0] * A.c - sd.n[1] * A.s, nv = sd.n[0] * A.s + sd.n[1] * A.c;
      if (nv >= -1e-9) continue;                                   // zeigt vom Betrachter weg
      const [a, b] = sd.e, q = [A.p(w.x + a[0] * h, w.y + a[1] * h, w.z + h), A.p(w.x + b[0] * h, w.y + b[1] * h, w.z + h),
                                A.p(w.x + b[0] * h, w.y + b[1] * h, w.z - h), A.p(w.x + a[0] * h, w.y + a[1] * h, w.z - h)];
      ctx.fillStyle = Sim.css(schatten(farbe, 0.69 - 0.13 * nu));  // Seiten dunkler, links heller als rechts
      ctx.beginPath(); q.forEach((pt, i) => i ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1])); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = Sim.css(farbe);
    ctx.beginPath(); oben.forEach((pt, i) => i ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1])); ctx.closePath(); ctx.fill(); ctx.stroke();
    return oben;
  }
  const umrande = (ctx, o) => { ctx.beginPath(); o.forEach((pt, i) => i ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1])); ctx.closePath(); ctx.stroke(); };

  /* ---------------------------------------------------------------- Ziehen dreht die Ansicht */
  let zug = null;
  function klick(z, p, x, y, taste, phase) {
    if (phase === "unten") { zug = { x, y, d: p.drehung, n: p.neigung }; return; }
    if (!zug || !window.SIM) return;
    const d = Math.round(((zug.d - (x - zug.x) * 0.36) % 360 + 360) % 360), n = Math.round(Math.max(5, Math.min(90, zug.n + (y - zug.y) * 0.2)));
    if (d !== p.drehung) window.SIM.setze("drehung", d);
    if (n !== p.neigung) window.SIM.setze("neigung", n);
  }

  const ANSICHT = { de: "Ansicht", en: "View" }, WACHSTUM = { de: "Wachstum", en: "Growth" };
  const F01 = Modell.FASSUNGEN;
  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 20, wert: 2 },
    parameter: [
      { id: "fassung", gruppe: WACHSTUM, name: { de: "Fassung", en: "Version" }, art: "auswahl", wert: S.fassung, neustart: true,
        optionen: [{ wert: "01", name: { de: "01 zehn Ebenen", en: "01 ten layers" } },
                   { wert: "02", name: { de: "02 Ebenenwechsel", en: "02 changing level" } },
                   { wert: "03", name: { de: "03 Wanderwürfel", en: "03 wandering cubes" } }],
        folgen: { "01": { loops: F01["01"].loops }, "02": { loops: F01["02"].loops }, "03": { loops: F01["03"].loops } } },
      { id: "loops", gruppe: WACHSTUM, name: { de: "loops (Durchgänge)", en: "loops (passes)" }, min: 1, max: 1000, wert: S.loops, neustart: true },
      { id: "ebenen", gruppe: WACHSTUM, name: { de: "Ebenen (nur 01)", en: "Layers (01 only)" }, min: 1, max: 20, wert: S.ebenen, neustart: true },
      { id: "num", gruppe: WACHSTUM, name: { de: "num (Richtungen)", en: "num (directions)" }, min: 2, max: 8, wert: S.num, neustart: true },
      { id: "farbe", gruppe: ANSICHT, name: { de: "Farben", en: "Colours" }, art: "auswahl", wert: S.farbe,
        optionen: [{ wert: "zufall", name: { de: "AutoCAD, zufällig", en: "AutoCAD, random" } }, { wert: "hoehe", name: { de: "Grautöne nach Höhe", en: "Greys by height" } }] },
      { id: "doppelte", gruppe: ANSICHT, name: { de: "Doppelbelegung markieren", en: "Mark double occupancy" }, art: "schalter", wert: S.doppelte },
      { id: "drehung", gruppe: ANSICHT, name: { de: "Drehung", en: "Rotation" }, min: 0, max: 359, wert: S.drehung, format: v => v + "°" },
      { id: "neigung", gruppe: ANSICHT, name: { de: "Neigung", en: "Elevation" }, min: 5, max: 90, wert: S.neigung, format: v => v + "°" }
    ],
    groesse: () => ({ b: B, h: H }),
    ende: z => z.fertig,
    klick,
    zeichne(ctx, z, p, F) {
      const A = ansicht(z, p), h = Modell.KANTE / 2, lw = 0.8 * F.px;
      const reihe = z.wuerfel.map((w, i) => [A.p(w.x, w.y, w.z)[2], i]).sort((a, b) => b[0] - a[0]);   // von hinten nach vorn
      const kanteFarbe = c => Sim.css(schatten(c, F.dunkel ? 0.35 : 0.45));
      const markiert = [];
      let neu = null;
      for (const [, i] of reihe) {
        const w = z.wuerfel[i], c = grundfarbe(w, A.z0 + h, A.z1 - h, p, F);
        const o = zeichneWuerfel(ctx, A, w, h, c, kanteFarbe(c), lw);
        if (p.doppelte && w.doppelt) markiert.push(o);
        if (i === z.wuerfel.length - 1) neu = o;
      }
      if (markiert.length) { ctx.strokeStyle = F.akzentText; ctx.lineWidth = 1.6 * F.px; markiert.forEach(o => umrande(ctx, o)); }
      if (neu && !z.fertig) { ctx.strokeStyle = F.tinte; ctx.lineWidth = 2 * F.px; umrande(ctx, neu); }   // jüngster Würfel
    },
    legende(F, p) {
      const L = p.farbe === "hoehe" ? [[Sim.css([105, 105, 105]), { de: "unten", en: "low" }], [Sim.css([242, 242, 242]), { de: "oben", en: "high" }]]
                                    : [[Sim.css(aci(1, F)), { de: "zufällige AutoCAD-Farbe je Würfel", en: "random AutoCAD colour per cube" }]];
      if (p.doppelte) L.push([F.akzentText, { de: "doppelt belegt", en: "double occupancy" }]);
      return L;
    },
    kennzahlen(z, p) {
      const k = [[{ de: "Würfel", en: "Cubes" }, String(z.wuerfel.length)],
                 [{ de: "Durchgang", en: "Pass" }, `${Math.min(z.t, Modell.durchgaenge(z))} / ${Modell.durchgaenge(z)}`]];
      if (z.fassung === "01") k.push([{ de: "Ebene u", en: "Layer u" }, String(Math.min(z.u, z.ebenen))]);
      k.push([{ de: "doppelt belegt", en: "double occupancy" }, String(z.doppelt)],
             [{ de: "belegte Plätze", en: "occupied places" }, String(Modell.plaetze(z))],
             [{ de: "Geschosse", en: "Storeys" }, String(Modell.geschosse(z))]);
      if (z.fassung !== "01") k.push([{ de: "Ebenenwechsel", en: "Level changes" }, String(z.hoehenwechsel)]);
      if (z.fassung === "03") k.push([{ de: "Durchgänge ohne Würfel", en: "Passes without cube" }, String(z.leer)]);
      k.push([{ de: "Zustand", en: "State" }, z.fertig ? { de: "fertig", en: "complete" } : { de: "wächst", en: "growing" }]);
      return k;
    }
  });
})();
