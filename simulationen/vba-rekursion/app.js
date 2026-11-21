/* Rekursive Strukturen 01 – Verzweigungsstrukturen · Bedienung und Darstellung (Modelllogik in modell.js)
   Würfel und Linien in Axonometrie: eigene kleine Parallelprojektion, Zeichenreihenfolge von hinten nach vorn.
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function () {
  "use strict";
  const S = Modell.STANDARD;
  const B = 1000, H = 720;                     // Zeichenfläche in Modelleinheiten (die Struktur wird eingepasst wie ZoomAll)
  const D2R = Math.PI / 180;

  /* ---------------------------------------------------------------- AutoCAD-Farbindex (ACI) */
  const ACI_GRUND = { 1: [255, 0, 0], 2: [255, 255, 0], 3: [0, 255, 0], 4: [0, 255, 255], 5: [0, 0, 255], 6: [255, 0, 255], 8: [128, 128, 128], 9: [192, 192, 192],
                      250: [51, 51, 51], 251: [80, 80, 80], 252: [105, 105, 105], 253: [130, 130, 130], 254: [190, 190, 190], 255: [255, 255, 255] };
  /** RGB einer AutoCAD-Farbnummer; 7 = Weiß bzw. Schwarz je nach Hintergrund; 10–249: 24 Farbtöne × 5 Helligkeiten × voll/blass */
  function aci(n, F) {
    if (n === 7) return F.dunkel ? [255, 255, 255] : [23, 23, 23];
    if (ACI_GRUND[n]) return ACI_GRUND[n];
    const ton = Math.floor((n - 10) / 10) * 15, v = [1, 0.65, 0.5, 0.3, 0.15][Math.floor((n % 10) / 2)], s = n % 2 ? 0.5 : 1;
    const k = q => { const kk = (q + ton / 60) % 6; return v * (1 - s * Math.max(0, Math.min(kk, 4 - kk, 1))); };
    return [k(5), k(3), k(1)].map(c => Math.round(c * 255));
  }

  /** Grundfarbe eines Würfels: Stufenfarbe nach durchlauf + 1 oder Grauton (oben heller); im Dunkeln sehr dunkle Töne angehoben */
  function grundfarbe(d, dmax, p, F) {
    if (p.farbe === "grau") { const g = Math.round(255 * (0.42 + 0.53 * (dmax ? d / dmax : 1))); return [g, g, g]; }
    const c = aci(Modell.farbNummer(d), F), hell = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
    return F.dunkel && hell < 80 ? Sim.mische(c, [255, 255, 255], 0.22) : c;
  }
  const schatten = (c, f) => [Math.round(c[0] * f), Math.round(c[1] * f), Math.round(c[2] * f)];

  /* ---------------------------------------------------------------- Projektion */
  /** Ansicht: Drehung θ um die Hochachse, Neigung φ über der Ebene; Massstab und Mitte wie ZoomAll, drehungsunabhängig */
  function ansicht(z, p) {
    const th = p.drehung * D2R, ph = p.neigung * D2R, c = Math.cos(th), s = Math.sin(th), cp = Math.cos(ph), sp = Math.sin(ph);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    const h = z.kante / 2;
    for (const w of z.wuerfel) {
      if (w.x < x0) x0 = w.x; if (w.x > x1) x1 = w.x; if (w.y < y0) y0 = w.y; if (w.y > y1) y1 = w.y;
      if (w.z - h < z0) z0 = w.z - h; if (w.z + h > z1) z1 = w.z + h;
    }
    for (const l of z.linien) { if (l.b[2] > z1) z1 = l.b[2]; }
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, mz = (z0 + z1) / 2;
    let r = 0;
    for (const w of z.wuerfel) r = Math.max(r, Math.hypot(w.x - mx, w.y - my));
    r += h * Math.SQRT2;
    const breite = 2 * r, hoehe = 2 * r * sp + (z1 - z0) * cp;
    const k = Math.min(4, (B * 0.9) / breite, (H * 0.86) / hoehe);
    return {
      c, s, cp, sp, k,
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
      if (nv >= -1e-9) continue;                                   // zeigt vom Betrachter weg (Betrachter auf −v)
      const [a, b] = sd.e, q = [A.p(w.x + a[0] * h, w.y + a[1] * h, w.z + h), A.p(w.x + b[0] * h, w.y + b[1] * h, w.z + h),
                                A.p(w.x + b[0] * h, w.y + b[1] * h, w.z - h), A.p(w.x + a[0] * h, w.y + a[1] * h, w.z - h)];
      ctx.fillStyle = Sim.css(schatten(farbe, 0.69 - 0.13 * nu));  // links heller, rechts dunkler (wie die Schattierung in AutoCAD)
      ctx.beginPath(); q.forEach((pt, i) => i ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1])); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = Sim.css(farbe);
    ctx.beginPath(); oben.forEach((pt, i) => i ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1])); ctx.closePath(); ctx.fill(); ctx.stroke();
    return oben;
  }

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
  Sim.starte({
    modell: Modell,
    saat: 1,
    tempo: { min: 1, max: 20, wert: 1 },
    parameter: [
      { id: "variante", gruppe: WACHSTUM, name: { de: "Fassung", en: "Version" }, art: "auswahl", wert: S.variante, neustart: true,
        optionen: [{ wert: "geschosse", name: { de: "01 Geschosse", en: "01 storeys" } },
                   { wert: "ebene", name: { de: "02 Ebene", en: "02 plane" } },
                   { wert: "staffel", name: { de: "03 Staffelung", en: "03 staggering" } }] },
      { id: "mengeWuerfel", gruppe: WACHSTUM, name: { de: "mengeWuerfel", en: "mengeWuerfel (cubes)" }, min: 1, max: 1000, wert: S.mengeWuerfel },
      { id: "astZahl", gruppe: WACHSTUM, name: { de: "astZahl (Verzweigungen)", en: "astZahl (branches)" }, min: 1, max: 6, wert: S.astZahl, neustart: true },
      { id: "farbe", gruppe: ANSICHT, name: { de: "Farben", en: "Colours" }, art: "auswahl", wert: S.farbe,
        optionen: [{ wert: "stufen", name: { de: "AutoCAD", en: "AutoCAD" } }, { wert: "grau", name: { de: "Grautöne", en: "Greys" } }] },
      { id: "drehung", gruppe: ANSICHT, name: { de: "Drehung", en: "Rotation" }, min: 0, max: 359, wert: S.drehung, format: v => v + "°" },
      { id: "neigung", gruppe: ANSICHT, name: { de: "Neigung", en: "Elevation" }, min: 5, max: 90, wert: S.neigung, format: v => v + "°" }
    ],
    groesse: () => ({ b: B, h: H }),
    ende: (z, p) => Modell.fertig(z, p),
    klick,
    zeichne(ctx, z, p, F) {
      const A = ansicht(z, p), h = z.kante / 2, dmax = Modell.hoechsterDurchlauf(z), lw = 0.8 * F.px;
      const teile = [];                                                // [Tiefe, Art, Daten]
      z.wuerfel.forEach((w, i) => teile.push([A.p(w.x, w.y, w.z)[2], 0, i]));
      const innen = (w, x, y, q) => Math.abs(x - w.x) < h && Math.abs(y - w.y) < h && Math.abs(q - w.z) < h;
      for (const l of z.linien) {                                      // Linien in Stücke teilen; Stücke im Inneren eines Würfels entfallen
        const e = z.wuerfel[l.eltern], k = z.wuerfel[l.kind], N = 8;
        for (let j = 0; j < N; j++) {
          const t0 = j / N, t1 = (j + 1) / N, tm = (t0 + t1) / 2;
          const at = t => [l.a[0] + (l.b[0] - l.a[0]) * t, l.a[1] + (l.b[1] - l.a[1]) * t, l.a[2] + (l.b[2] - l.a[2]) * t];
          const m = at(tm);
          if (innen(e, m[0], m[1], m[2]) || innen(k, m[0], m[1], m[2])) continue;
          const a = A.p(...at(t0)), b = A.p(...at(t1));
          teile.push([A.p(...m)[2] - 1e-6, 1, [a, b, l.d]]);
        }
      }
      teile.sort((u, v) => v[0] - u[0]);                               // von hinten nach vorn
      const kanteFarbe = c => F.dunkel ? Sim.css(schatten(c, 0.35)) : Sim.css(schatten(c, 0.45));
      ctx.lineCap = "round";
      let neu = null;
      for (const [, art, d] of teile) {
        if (art === 0) {
          const w = z.wuerfel[d], c = grundfarbe(w.d, dmax, p, F);
          const o = zeichneWuerfel(ctx, A, w, h, c, kanteFarbe(c), lw);
          if (d === z.wuerfel.length - 1) neu = o;
        } else {
          const [a, b, dd] = d, c = grundfarbe(dd, dmax, p, F);
          ctx.strokeStyle = Sim.css(F.dunkel ? c : schatten(c, 0.7)); ctx.lineWidth = 1.1 * F.px;
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        }
      }
      if (neu && !Modell.fertig(z, p) && z.wuerfel.length > 1) {      // jüngster Würfel: Oberseite im Akzent umrandet
        ctx.strokeStyle = F.akzentText; ctx.lineWidth = 2 * F.px;
        ctx.beginPath(); neu.forEach((pt, i) => i ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1])); ctx.closePath(); ctx.stroke();
      }
    },
    legende(F, p) {
      const z = window.SIM && window.SIM.zustand, dmax = z ? Modell.hoechsterDurchlauf(z) : 0, L = [];
      for (let d = 0; d <= Math.min(dmax, 6); d++) L.push([Sim.css(grundfarbe(d, dmax, p, F)), { de: "durchlauf " + d, en: "pass " + d }]);
      if (dmax > 6) L.push([Sim.css(grundfarbe(dmax, dmax, p, F)), { de: "… " + dmax, en: "… " + dmax }]);
      return L;
    },
    kennzahlen(z, p) {
      const zu = Modell.fertig(z, p) ? (z.fertig ? { de: "abgestorben", en: "died out" } : { de: "fertig", en: "complete" }) : { de: "wächst", en: "growing" };
      const k = [[{ de: "Würfel", en: "Cubes" }, `${z.wuerfel.length} / ${p.mengeWuerfel}`],
                 [{ de: "durchlauf", en: "Pass" }, String(Modell.hoechsterDurchlauf(z))],
                 [{ de: "Geschosse", en: "Storeys" }, String(Modell.geschosse(z))],
                 [{ de: "Verbindungslinien", en: "Connecting lines" }, String(z.linien.length)]];
      if (z.variante === "geschosse") k.push([{ de: "doppelt belegt", en: "duplicate positions" }, String(z.doppelt)]);
      else k.push([{ de: "verworfene Äste", en: "rejected branches" }, String(z.verworfen)]);
      k.push([{ de: "Zustand", en: "State" }, document.documentElement.lang === "en" ? zu.en : zu.de]);
      return k;
    }
  });
  // Kennzahl „Zustand“ ist ein Wort: nach dem Sprachwechsel neu zeichnen (der Rahmen zeichnet dabei nicht neu)
  document.querySelectorAll(".sprache").forEach(b => b.addEventListener("click", () => { if (window.SIM) window.SIM.zeichne(); }));
})();
