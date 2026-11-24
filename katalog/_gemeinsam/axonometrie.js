/* Parametric Planning Catalogue · Prismen in Axonometrie (Zeichenhilfe für Canvas 2D wie karte.js; Projektion und Ordnung ohne DOM)
   Vorher in mehreren app.js als Kopie (Runde 3, 23.11.2026): gebaeude-generierung, stadtsynthese, baublock-generator, isovist-3d
   (gedrehte Parallelprojektion) und stadtdynamik (Schrägansicht der Säulen).
   – ansicht: Parallelprojektion mit Drehung θ um die Hochachse und Neigung φ (x nach Osten, y nach Süden, z nach oben; φ = 90° ist der Plan)
   – schraeg: Schrägansicht (Kavalierperspektive) mit gestauchter, seitlich versetzter Tiefe
   – maler: Malerverfahren (von hinten nach vorn ordnen, stabil)
   – waende: sichtbare Seitenflächen eines Prismas; prisma: Wände und Dach zeichnen (Farbe je Wand über eine Funktion der App)
   – drehen: Ziehen mit der Maus → neue Drehung und Neigung
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0 */
(function (wurzel, fabrik) {
  const node = typeof module === "object" && module.exports;
  const A = fabrik(node ? require("./geo.js") : wurzel.Geo);
  if (node) module.exports = A;
  else wurzel.Axo = A;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Geo) {
  "use strict";
  const D2R = Math.PI / 180;

  /** Parallelprojektion. o = {drehung, neigung (Grad) oder th, ph (Bogenmaß), mitte: [mx, my], mz (Höhe der Bildmitte, 0),
      k (Maßstab), ox, oy (Bildpunkt der Mitte)}. Bildpunkt: u = (x − mx)·cos θ − (y − my)·sin θ, v = (x − mx)·sin θ + (y − my)·cos θ,
      [ox + k·u, oy + k·(v·sin φ − (h − mz)·cos φ)].
      → {c, s, cp, sp, k, p(x, y, h) → [X, Y], v(x, y) Nähe (größer = näher), tiefe(x, y, h) (größer = weiter hinten),
         blick(nx, ny) Anteil einer waagerechten Normale zum Betrachter, vorn(nx, ny)} */
  function ansicht(o) {
    const th = o.th != null ? o.th : o.drehung * D2R, ph = o.ph != null ? o.ph : o.neigung * D2R;
    const c = Math.cos(th), s = Math.sin(th), cp = Math.cos(ph), sp = Math.sin(ph);
    const mx = o.mitte[0], my = o.mitte[1], mz = o.mz || 0, k = o.k, ox = o.ox, oy = o.oy;
    return {
      c, s, cp, sp, k,
      p(x, y, h = 0) { const u = (x - mx) * c - (y - my) * s, v = (x - mx) * s + (y - my) * c; return [ox + k * u, oy + k * (v * sp - (h - mz) * cp)]; },
      v(x, y) { return (x - mx) * s + (y - my) * c; },
      tiefe(x, y, h = 0) { const v = (x - mx) * s + (y - my) * c; return -(v * cp + (h - mz) * sp); },
      blick(nx, ny) { return nx * s + ny * c; },
      vorn(nx, ny) { return nx * s + ny * c > 1e-9; }
    };
  }
  /** Schrägansicht: Bildpunkt [ox + x + (tiefe − y)·sch, oy + y·k − h] (Betrachter im Süden, Tiefe gestaucht um k und um sch nach
      rechts versetzt); rueck(X, Y) liefert den Grundrisspunkt auf Höhe 0. → {k, sch, p(x, y, h), pq(q, h), rueck, blick, vorn} */
  function schraeg(o) {
    const ox = o.ox, oy = o.oy, k = o.k, sch = o.sch, T = o.tiefe, bx = -sch;
    return {
      k, sch,
      p(x, y, h = 0) { return [ox + x + (T - y) * sch, oy + y * k - h]; },
      pq(q, h = 0) { return [ox + q[0] + (T - q[1]) * sch, oy + q[1] * k - h]; },
      rueck(X, Y) { const gy = (Y - oy) / k; return [X - ox - (T - gy) * sch, gy]; },
      blick(nx, ny) { return nx * bx + ny * 1; },
      vorn(nx, ny) { return nx * bx + ny * 1 > 1e-9; }
    };
  }

  /** Malerverfahren: Liste nach schluessel(element, i) ordnen, aufsteigend (zuerst gezeichnet = kleinster Schlüssel) oder
      absteigend; gleiche Schlüssel behalten ihre Reihenfolge. → neue Liste */
  function maler(liste, schluessel, absteigend = false) {
    const L = liste.map((x, i) => [schluessel(x, i), x]);
    L.sort(absteigend ? (a, b) => b[0] - a[0] : (a, b) => a[0] - b[0]);
    return L.map(x => x[1]);
  }

  /** Sichtbare Seitenflächen über dem Polygon P in der Ansicht A. opt.normale: "positiv" (P hat positive Fläche, Außennormale
      [dy, −dx]/l), "auto" (Umlaufsinn aus der Fläche), "innen" (Hofring: Normale nach innen), "schwerpunkt" (ungenormte Normale,
      vom Schwerpunkt weg); opt.schwelle: sichtbar, wenn blick > schwelle (1e-9); opt.kurz: Kanten kürzer als kurz entfallen;
      opt.ohne(a, b): Kante überspringen (innere Schnittkante). → [{a, b, i, d: [dx, dy], l, n: [nx, ny], vb (Blickanteil)}] */
  function waende(P, A, opt = {}) {
    const art = opt.normale || "positiv", schwelle = opt.schwelle != null ? opt.schwelle : 1e-9, n = P.length, out = [];
    const um = art === "innen" || (art === "auto" && !(Geo.flaecheS(P) > 0));
    const c = art === "schwerpunkt" ? Geo.schwerpunkt(P) : null;
    for (let i = 0; i < n; i++) {
      const a = P[i], b = P[(i + 1) % n];
      if (opt.ohne && opt.ohne(a, b)) continue;
      const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy);
      if (opt.kurz != null && l < opt.kurz) continue;
      let nx, ny;
      if (c) {
        nx = -dy; ny = dx;
        if (nx * ((a[0] + b[0]) / 2 - c[0]) + ny * ((a[1] + b[1]) / 2 - c[1]) < 0) { nx = -nx; ny = -ny; }
      } else {
        const L = l || 1; nx = dy / L; ny = -dx / L;
        if (um) { nx = -nx; ny = -ny; }
      }
      const vb = A.blick(nx, ny);
      if (vb <= schwelle) continue;
      out.push({ a, b, i, d: [dx, dy], l, n: [nx, ny], vb });
    }
    return out;
  }

  function ring(ctx, Q) { Q.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath(); }
  /** Prisma über dem Polygon P von Höhe h0 bis h1 zeichnen: sichtbare Wände, dann das Dach.
      opt: h0 (0), h1, seite(w) → Füllfarbe einer Wand (w aus waende), dach (Füllfarbe), kante, lw, join (lineJoin, sonst
      unverändert), loch (Hofring, Dach mit Loch), regel ("evenodd" beim Füllen des Dachs), sortiere ("nah": Wände nach
      A.v der Kantenmitte aufsteigend; "fern": nach A.tiefe(Mitte, hMitte) absteigend; sonst Reihenfolge der Kanten),
      hMitte, obenZuerst (Umriss der Wand beginnt oben statt unten – nur Kantenglättung), und die Wahl der Wände wie in waende (normale, schwelle, kurz, ohne – ohne lässt auch die Dachkante weg). */
  function prisma(ctx, A, P, opt) {
    const h0 = opt.h0 || 0, h1 = opt.h1;
    let W = waende(P, A, opt);
    if (opt.loch) W = W.concat(waende(opt.loch, A, Object.assign({}, opt, { normale: "innen", ohne: null })));
    if (opt.sortiere === "nah") W = maler(W, w => A.v((w.a[0] + w.b[0]) / 2, (w.a[1] + w.b[1]) / 2));
    else if (opt.sortiere === "fern") W = maler(W, w => A.tiefe((w.a[0] + w.b[0]) / 2, (w.a[1] + w.b[1]) / 2, opt.hMitte), true);
    if (opt.join) ctx.lineJoin = opt.join;
    if (opt.kante) { ctx.strokeStyle = opt.kante; ctx.lineWidth = opt.lw; }
    for (const w of W) {
      const unten = [A.p(w.a[0], w.a[1], h0), A.p(w.b[0], w.b[1], h0)], o = [A.p(w.a[0], w.a[1], h1), A.p(w.b[0], w.b[1], h1)];
      ctx.beginPath(); ring(ctx, opt.obenZuerst ? [o[0], o[1], unten[1], unten[0]] : [unten[0], unten[1], o[1], o[0]]);
      ctx.fillStyle = opt.seite(w); ctx.fill();
      if (opt.kante) ctx.stroke();
    }
    const oben = P.map(q => A.p(q[0], q[1], h1));
    ctx.beginPath(); ring(ctx, oben);
    if (opt.loch) ring(ctx, opt.loch.map(q => A.p(q[0], q[1], h1)));
    if (opt.dach) { ctx.fillStyle = opt.dach; if (opt.regel) ctx.fill(opt.regel); else ctx.fill(); }
    if (!opt.kante) return;
    if (opt.ohne) {
      ctx.beginPath();
      for (let i = 0; i < P.length; i++) { const b = (i + 1) % P.length; if (opt.ohne(P[i], P[b])) continue; ctx.moveTo(oben[i][0], oben[i][1]); ctx.lineTo(oben[b][0], oben[b][1]); }
    }
    ctx.stroke();
  }

  /** Ziehen dreht die Ansicht: zug = {x, y, d (Drehung), n (Neigung)} beim Drücken; o = {fd (Grad je Pixel waagrecht, 0,3),
      fn (Grad je Pixel senkrecht, 0,15), nMin (10), nMax (90)} → {drehung (0 … 359, ganzzahlig), neigung (ganzzahlig)} */
  function drehen(zug, x, y, o = {}) {
    const fd = o.fd != null ? o.fd : 0.3, fn = o.fn != null ? o.fn : 0.15, nMin = o.nMin != null ? o.nMin : 10, nMax = o.nMax != null ? o.nMax : 90;
    return { drehung: Math.round(((zug.d - (x - zug.x) * fd) % 360 + 360) % 360), neigung: Math.round(Math.max(nMin, Math.min(nMax, zug.n + (y - zug.y) * fn))) };
  }

  return { D2R, ansicht, schraeg, maler, waende, prisma, drehen };
});
