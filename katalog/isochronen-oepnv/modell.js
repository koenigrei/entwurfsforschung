/* Isochronen im ÖPNV · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung des Werkzeugs „Public Transport Isochronal Map“ aus dem DeCodingSpaces Lab
   (Ondřej Veselý, Reinhard König, AIT Smart Spatial Planning Systems, 2018; Grasshopper mit SpiderWeb).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Die Originaldateien sind passwortgeschützt; umgesetzt ist das Verfahren nach der Beschreibung des Lab-Eintrags:
   Ein multimodaler Graph verbindet das Fußwegnetz (Gehgeschwindigkeit) mit Linien des öffentlichen Verkehrs (Haltestellen,
   Fahrgeschwindigkeit, Haltezeit, Takt). Einsteigen kostet die mittlere Wartezeit (Anteil × Takt, Voreinstellung Takt/2),
   Umsteigen ebenso – optional mit Zuschlag. Dazu hat das Fußwegnetz zwei Ebenen: „noch nicht gefahren“ und „schon gefahren“;
   wer auf der zweiten Ebene wieder einsteigt, steigt um. Dijkstra ab einem oder mehreren Startpunkten liefert die Reisezeit je
   Knoten; daraus entstehen Reisezeiten auf Straßen, Gebäuden und einem Raster sowie Isochronen in Stufen (5/10/15/20 min).
   Zwei Szenarien (A = Bestand, B = mit neuer Linie, dichterem Takt, schnelleren Fahrzeugen oder ohne Linie 1) werden
   gleichzeitig gerechnet und verglichen. Ein Schritt = die Front beider Suchen wächst um ein Zeitintervall Δt. */
(function (wurzel, fabrik) {
  const node = typeof module === "object" && module.exports;
  const M = fabrik(node ? require("../_gemeinsam/geo.js") : wurzel.Geo, node ? require("../_gemeinsam/szenen.js") : wurzel.Szenen);
  if (node) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Geo, Szenen) {
  "use strict";

  /** Voreinstellungen (Original nicht zugänglich: Werte nach der Modellbeschreibung und üblichen Planungsannahmen).
      gehen km/h · warte = Anteil des Takts als Wartezeit (0,5 = Takt/2) · umstieg = Zuschlag je Umstieg (min) · halt = Haltezeit je
      Haltestelle (min) · takt1…taktN (min) · tempoBahn/tempoTram/tempoBus (km/h, Reisegeschwindigkeit zwischen den Halten) · szenario = Szenario B ·
      stufe = Stufenweite der Isochronen (min, vier Stufen) · dt = Zeitintervall je Schritt (min). */
  const STANDARD = {
    gehen: 4.8, warte: 0.5, umstieg: 0, halt: 0.5,
    takt1: 5, takt2: 10, takt3: 15, taktN: 5, tempoBahn: 30, tempoTram: 20, tempoBus: 15,
    szenario: "neu", stufe: 5, dt: 1,
    ansicht: "a", darstellung: "flaechen", maus: "start", bearbeite: "N"
  };
  const STUFEN = 4;                 // Isochronen 1…4 × stufe
  const ZELLE = 15;                 // Rasterweite (m)
  const QUER = 150;                 // größter Fußweg quer von der Straße in den Block (m)
  const GESCHOSSE = 4, NUTZ = 0.8, WOHNFLAECHE = 40;   // Einwohnerschätzung: Grundfläche × Geschosse × Nutzanteil / m² je Person
  const ARTEN = { GEHEN: 0, EINSTIEG: 1, FAHRT: 2, AUSSTIEG: 3, START: 4 };
  const SZENARIEN = ["neu", "takt", "tempo", "ohne1"];

  /* ---------------------------------------------------------------- Stadt und Netz */
  /** Beispielstadt 3 × 2 km (Szenen.stadt, verzogenes Raster 21 × 14 Knoten, Blockweite rund 150 m, Blockrand) */
  const STADT = { b: 3000, h: 2000, nx: 21, ny: 14, rand: 20, jitter: 0.2, strasse: 12, tiefe: 16, breite: [14, 28], luecke: 0.15, zusammen: 0.15, platz: true, kirche: true, gebaeude: true };

  /** nächster Netzknoten zu q */
  function naechsterKnoten(N, q) {
    let best = -1, bd = Infinity;
    N.knoten.forEach((k, i) => { const d = Geo.abstand(k, q); if (d < bd) { bd = d; best = i; } });
    return best;
  }

  /** Weg im Straßennetz zwischen zwei Knoten (Geo.dijkstra nach Länge) → {knoten: [...], laenge} */
  function route(N, adj, a, b) {
    if (a === b) return { knoten: [a], laenge: 0 };
    const R = Geo.dijkstra(N.knoten.length, i => adj[i].map(({ j, k }) => [j, N.kanten[k].l, k]), a, b);
    if (R.dist[b] === Infinity) return { knoten: [a, b], laenge: Geo.abstand(N.knoten[a], N.knoten[b]) };
    return { knoten: Geo.weg(R.vor, b), laenge: R.dist[b] };
  }

  /** Haltestellenfolge → Fahrwege zwischen den Halten (dem Straßennetz entlang); doppelte Nachbarhalte entfallen */
  function verlege(N, adj, linie) {
    const s = linie.halte.filter((h, i, A) => i === 0 || h !== A[i - 1]);
    linie.halte = s;
    linie.abschnitte = [];
    for (let i = 0; i + 1 < s.length; i++) linie.abschnitte.push(route(N, adj, s[i], s[i + 1]));
    linie.laenge = linie.abschnitte.reduce((x, r) => x + r.laenge, 0);
    return linie;
  }

  /** Voreingestellte Linien auf dem Raster der Beispielstadt (Rasterindex i, j → nächster Netzknoten):
      1 Stadtbahn West–Ost im Norden (U-Bahn-artig, schnell, dichter Takt), 2 Straßenbahn Nord–Süd am Platz (Umstieg mit 1),
      3 Bus im Osten und Süden (Umstieg mit 1 und 2), N neue Straßenbahn West–Ost durch den Süden (nur Szenario B, Umstieg mit 2 und 3). */
  function standardLinien(szene, N, adj) {
    const o = szene.opt, K = szene.knoten, k = (i, j) => naechsterKnoten(N, K[j * o.nx + i]);
    const def = [
      { id: "1", art: "bahn", ij: [[0, 4], [4, 4], [7, 4], [11, 4], [14, 4], [17, 4], [20, 4]] },
      { id: "2", art: "tram", ij: [[11, 0], [11, 2], [11, 4], [11, 7], [11, 10], [11, 13]] },
      { id: "3", art: "bus", ij: [[17, 0], [17, 2], [17, 4], [17, 7], [17, 10], [17, 13], [14, 13], [11, 13]] },
      { id: "N", art: "tram", ij: [[0, 10], [3, 10], [6, 10], [8, 10], [11, 10], [14, 10], [17, 10]] }
    ];
    return def.map(d => verlege(N, adj, { id: d.id, art: d.art, halte: d.ij.map(([i, j]) => k(i, j)) }));
  }

  /** voreingestellter Startpunkt: Wohnblock im Südwesten, nahe der geplanten Linie N, fern der Stadtbahn */
  function standardStart(szene) { const o = szene.opt, K = szene.knoten; return Geo.lerp(K[11 * o.nx + 4], K[12 * o.nx + 5], 0.5); }

  /* ---------------------------------------------------------------- Szenarien */
  /** Linien eines Szenarios mit Takt und Tempo. welches "a" (Bestand: 1, 2, 3) oder "b" (je nach p.szenario):
      neu = zusätzlich Linie N · takt = alle Linien doppelt so oft (Takt halbiert) · tempo = alle Linien 1,5 × schneller · ohne1 = ohne Linie 1 */
  function wirksameLinien(linien, p, welches) {
    const takt = { 1: p.takt1, 2: p.takt2, 3: p.takt3, N: p.taktN }, b = welches === "b";
    return linien
      .filter(l => (l.id !== "N" || (b && p.szenario === "neu")) && !(b && p.szenario === "ohne1" && l.id === "1"))
      .filter(l => l.halte.length >= 2)
      .map(l => ({ id: l.id, art: l.art, halte: l.halte, laengen: l.abschnitte.map(r => r.laenge),
                   takt: takt[l.id] * (b && p.szenario === "takt" ? 0.5 : 1),
                   tempo: (l.art === "bus" ? p.tempoBus : l.art === "bahn" ? p.tempoBahn : p.tempoTram) * (b && p.szenario === "tempo" ? 1.5 : 1) }));
  }

  /* ---------------------------------------------------------------- Multimodaler Graph */
  /** Graph aus Fußwegnetz N und Linien [{halte: [Knoten], laengen: [m je Abschnitt], takt (min), tempo (km/h)}].
      Knoten: 0…n0−1 Fußweg „noch nicht gefahren“, n0…2n0−1 Fußweg „schon gefahren“, danach je Linie 2 × Halte Fahrzustände
      (Halt i, Richtung r: 0 = vorwärts, 1 = rückwärts). Kanten [ziel, minuten, art]:
        Gehen      Länge / Gehgeschwindigkeit (beide Ebenen)
        Einstieg   warte × Takt (Ebene 0) bzw. warte × Takt + umstieg (Ebene 1 = Umstieg)
        Fahrt      Abschnittslänge / Tempo + Haltezeit
        Ausstieg   0, immer auf Ebene 1 */
  function baueGraph(N, linien, p) {
    const n0 = N.knoten.length, v = p.gehen * 1000 / 60, nb = [];
    for (let i = 0; i < 2 * n0; i++) nb.push([]);
    for (const e of N.kanten) for (const L of [0, n0]) {
      const c = e.l / v; nb[L + e.a].push([L + e.b, c, ARTEN.GEHEN]); nb[L + e.b].push([L + e.a, c, ARTEN.GEHEN]);
    }
    const fahrt = [];                         // fahrt[k - 2n0] = {linie, halt, r}
    linien.forEach((l, li) => {
      const m = l.halte.length, basis = nb.length, vf = l.tempo * 1000 / 60, w = p.warte * l.takt;
      for (let i = 0; i < m; i++) for (let r = 0; r < 2; r++) { nb.push([]); fahrt.push({ linie: li, id: l.id, halt: i, r }); }
      const fz = (i, r) => basis + 2 * i + r;
      for (let i = 0; i < m; i++) {
        const s = l.halte[i];
        for (let r = 0; r < 2; r++) {
          if ((r === 0 && i < m - 1) || (r === 1 && i > 0)) {
            nb[s].push([fz(i, r), w, ARTEN.EINSTIEG]);
            nb[n0 + s].push([fz(i, r), w + p.umstieg, ARTEN.EINSTIEG]);
          }
          nb[fz(i, r)].push([n0 + s, 0, ARTEN.AUSSTIEG]);
        }
        if (i < m - 1) {
          const c = l.laengen[i] / vf + p.halt;
          nb[fz(i, 0)].push([fz(i + 1, 0), c, ARTEN.FAHRT]);
          nb[fz(i + 1, 1)].push([fz(i, 1), c, ARTEN.FAHRT]);
        }
      }
    });
    return { n: nb.length, n0, nb, fahrt, linien, v };
  }

  /** Startpunkt q → Fußpunkt auf der nächsten Straße: {q, kante, t (0…1 ab Knoten a), d (m bis zur Straße), fuss} */
  function verankere(N, q) {
    const k = Geo.naechstesSegment(N, q), e = N.kanten[k], A = Geo.abstandSegment(q, N.knoten[e.a], N.knoten[e.b]);
    return { q: [q[0], q[1]], kante: k, t: A.t, d: A.d, fuss: A.q };
  }
  /** Anfangszeiten der Suche: von jedem Startpunkt zur Straße und entlang der Straße zu deren beiden Knoten (Ebene 0) → [[knoten, min]] */
  function startZeiten(N, anker, v) {
    const S = [];
    for (const a of anker) {
      const e = N.kanten[a.kante];
      S.push([e.a, (a.d + a.t * e.l) / v], [e.b, (a.d + (1 - a.t) * e.l) / v]);
    }
    return S;
  }

  /* ---------------------------------------------------------------- Suche */
  /** Dijkstra Schritt für Schritt: neue Suche mit Anfangszeiten [[knoten, min]] */
  function neueSuche(G, start) {
    const S = { dist: new Float64Array(G.n).fill(Infinity), vor: new Int32Array(G.n).fill(-1), art: new Int8Array(G.n).fill(-1),
                fest: new Uint8Array(G.n), H: new Geo.Heap(), horizont: 0, festZahl: 0, leer: false };
    for (const [k, d] of start) if (d < S.dist[k]) { S.dist[k] = d; S.art[k] = ARTEN.START; S.H.push(d, k); }
    return S;
  }
  /** Front bis zur Zeit h ausbreiten: alle Knoten mit Reisezeit ≤ h werden fest (danach haben alle übrigen > h) */
  function sucheBis(G, S, h) {
    S.horizont = h;
    while (!S.H.leer) {
      const i = S.H.pop(), d = S.H.letzterSchluessel;
      if (S.fest[i]) continue;
      if (d > h) { S.H.push(d, i); break; }
      S.fest[i] = 1; S.festZahl++;
      for (const [j, c, art] of G.nb[i]) {
        const nd = d + c;
        if (nd < S.dist[j] - 1e-12) { S.dist[j] = nd; S.vor[j] = i; S.art[j] = art; S.H.push(nd, j); }
      }
    }
    S.leer = S.H.leer;
    return S;
  }
  /** Reisezeiten auf einmal mit Geo.dijkstra (virtueller Quellknoten mit den Anfangszeiten) – Vergleich für die schrittweise Suche */
  function reisezeiten(G, start) {
    const q = G.n, R = Geo.dijkstra(G.n + 1, i => i === q ? start.map(([k, d]) => [k, d]) : G.nb[i], q);
    return R.dist.subarray(0, G.n);
  }
  /** Reisezeit je Straßenknoten (Minimum beider Ebenen); Knoten jenseits des Horizonts = Infinity */
  function knotenZeiten(G, S) {
    const t = new Float64Array(G.n0);
    for (let i = 0; i < G.n0; i++) {
      const d = Math.min(S.dist[i], S.dist[G.n0 + i]);
      t[i] = d <= S.horizont ? d : Infinity;
    }
    return t;
  }
  /** Weg zu einem Straßenknoten als Folge von Abschnitten [{art: "gehen"|"fahrt", linie, von, bis, punkte}] (für Anzeige und Tests) */
  function reiseweg(G, S, knoten) {
    let i = S.dist[knoten] <= S.dist[G.n0 + knoten] ? knoten : G.n0 + knoten;
    const kette = []; for (let k = i; k !== -1; k = S.vor[k]) { kette.push(k); if (kette.length > G.n) break; }
    kette.reverse();
    let umstiege = -1, fahrten = 0;
    for (const k of kette) if (S.art[k] === ARTEN.EINSTIEG) { umstiege++; fahrten++; }
    return { kette, fahrten, umstiege: Math.max(0, umstiege), zeit: S.dist[i] };
  }

  /* ---------------------------------------------------------------- Raster, Straßen, Gebäude */
  /** Reisezeit auf einer Straßenkante an der Stelle s (m ab Knoten a): über die Knoten oder direkt von einem Startpunkt auf dieser Kante */
  function zeitAufKante(N, k, s, tK, startAufKante, v) {
    const e = N.kanten[k];
    let t = Math.min(tK[e.a] + s / v, tK[e.b] + (e.l - s) / v);
    const L = startAufKante && startAufKante.get(k);
    if (L) for (const a of L) t = Math.min(t, (a.d + Math.abs(s - a.t * e.l)) / v);
    return t;
  }
  function startKarte(anker) {
    const m = new Map();
    for (const a of anker) { if (!m.has(a.kante)) m.set(a.kante, []); m.get(a.kante).push(a); }
    return m;
  }
  /** Reisezeit-Raster (Zellen der Weite R.zelle über b × h): Proben entlang aller Straßen (Abstand zelle/2) und auf dem Weg von jedem
      Startpunkt zur Straße; von dort quer zu Fuß in die Blöcke (Luftlinie, Abstandstransformation mit zwei Durchläufen, Nachbarn gerade
      und diagonal), aber höchstens quer m weit – sonst liefe man durch die Häuser. Werte > h (Horizont) werden Infinity. → Float32Array nx · ny */
  function reiseRaster(N, tK, anker, v, R, h = Infinity, quer = QUER) {
    const { nx, ny, zelle } = R, T = new Float32Array(nx * ny).fill(Infinity), D = new Float32Array(nx * ny).fill(Infinity);
    const probe = (x, y, t) => {
      if (!(t < Infinity)) return;
      const i = Math.floor(x / zelle), j = Math.floor(y / zelle); if (i < 0 || j < 0 || i >= nx || j >= ny) return;
      const o = j * nx + i, d = Math.hypot((i + 0.5) * zelle - x, (j + 0.5) * zelle - y), w = t + d / v;
      if (w < T[o]) { T[o] = w; D[o] = d; }
    };
    const sk = startKarte(anker);
    N.kanten.forEach((e, k) => {
      const a = N.knoten[e.a], b = N.knoten[e.b], n = Math.max(1, Math.ceil(e.l / (zelle / 2)));
      for (let q = 0; q <= n; q++) { const s = e.l * q / n; probe(a[0] + (b[0] - a[0]) * q / n, a[1] + (b[1] - a[1]) * q / n, zeitAufKante(N, k, s, tK, sk, v)); }
    });
    for (const a of anker) {               // Weg vom Startpunkt zur Straße
      const n = Math.max(1, Math.ceil(a.d / (zelle / 2)));
      for (let q = 0; q <= n; q++) probe(a.q[0] + (a.fuss[0] - a.q[0]) * q / n, a.q[1] + (a.fuss[1] - a.q[1]) * q / n, a.d * q / n / v);
    }
    const dg = zelle * Math.SQRT2;
    const nimm = (o, u, l) => { const d = D[u] + l; if (d <= quer) { const t = T[u] + l / v; if (t < T[o]) { T[o] = t; D[o] = d; } } };
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const o = j * nx + i;
      if (i > 0) nimm(o, o - 1, zelle);
      if (j > 0) { nimm(o, o - nx, zelle); if (i > 0) nimm(o, o - nx - 1, dg); if (i < nx - 1) nimm(o, o - nx + 1, dg); }
    }
    for (let j = ny - 1; j >= 0; j--) for (let i = nx - 1; i >= 0; i--) {
      const o = j * nx + i;
      if (i < nx - 1) nimm(o, o + 1, zelle);
      if (j < ny - 1) { nimm(o, o + nx, zelle); if (i < nx - 1) nimm(o, o + nx + 1, dg); if (i > 0) nimm(o, o + nx - 1, dg); }
    }
    if (h < Infinity) for (let o = 0; o < T.length; o++) if (T[o] > h) T[o] = Infinity;
    return T;
  }
  /** Isochrone (Höhenlinie der Reisezeit) zum Wert w auf dem Raster (marching squares über die Zellmitten) → [[[x, y], [x, y]], …].
      Unerreichte Zellen zählen als deckel. */
  function kontur(T, R, w, deckel = 1e6) {
    const { nx, ny, zelle } = R, S = [], val = o => Math.min(T[o], deckel);
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = val(j * nx + i), b = val(j * nx + i + 1), c = val((j + 1) * nx + i + 1), d = val((j + 1) * nx + i), P = [];
      const kante = (h1, h2, x1, y1, x2, y2) => { if ((h1 < w) !== (h2 < w)) { const t = (w - h1) / (h2 - h1); P.push([(x1 + (x2 - x1) * t + 0.5) * zelle, (y1 + (y2 - y1) * t + 0.5) * zelle]); } };
      kante(a, b, i, j, i + 1, j); kante(b, c, i + 1, j, i + 1, j + 1); kante(c, d, i + 1, j + 1, i, j + 1); kante(d, a, i, j + 1, i, j);
      if (P.length >= 2) S.push([P[0], P[1]]);
      if (P.length === 4) S.push([P[2], P[3]]);
    }
    return S;
  }
  /** Stufe einer Reisezeit: k = 0…STUFEN−1 für k·stufe ≤ t < (k+1)·stufe (die letzte schließt STUFEN·stufe ein), STUFEN = später,
      −1 = (noch) nicht erreicht */
  const stufeVon = (t, stufe) => t === Infinity || t !== t ? -1 : t > STUFEN * stufe ? STUFEN : Math.min(STUFEN - 1, Math.floor(t / stufe));

  /** Einwohnerschätzung je Gebäude und Rasterzelle des Schwerpunkts */
  function gebaeudeDaten(gebaeude, R) {
    return gebaeude.map(g => {
      const c = Geo.schwerpunkt(g), i = Math.min(R.nx - 1, Math.max(0, Math.floor(c[0] / R.zelle))), j = Math.min(R.ny - 1, Math.max(0, Math.floor(c[1] / R.zelle)));
      return { c, zelle: j * R.nx + i, ew: Geo.flaeche(g) * GESCHOSSE * NUTZ / WOHNFLAECHE };
    });
  }
  /** Fläche (km²) und Einwohner innerhalb der Reisezeit w */
  function erreicht(T, R, geb, w) {
    let n = 0; for (let o = 0; o < T.length; o++) if (T[o] <= w) n++;
    let ew = 0; for (const g of geb) if (T[g.zelle] <= w) ew += g.ew;
    return { flaeche: n * R.zelle * R.zelle / 1e6, ew };
  }

  /* ---------------------------------------------------------------- Zustand */
  /** Neuer Zustand: Stadt, Fußwegnetz, Linien, ein Startpunkt; Suche noch nicht begonnen (t = 0) */
  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const szene = Szenen.stadt(zufall, STADT), N = Geo.netz(szene.strassen), adj = Geo.adjazenz(N);
    const R = { nx: Math.ceil(szene.b / ZELLE), ny: Math.ceil(szene.h / ZELLE), zelle: ZELLE };
    const z = { t: 0, szene, b: szene.b, h: szene.h, N, adj, R, version: 0,
                linien: standardLinien(szene, N, adj), starts: [standardStart(szene)] };
    z.geb = gebaeudeDaten(szene.gebaeude, R);
    z.ewGesamt = z.geb.reduce((s, g) => s + g.ew, 0);
    baue(z, p);
    return z;
  }
  /** Graphen beider Szenarien und Suchen neu anlegen (t = 0, Horizont 0) */
  function baue(z, p) {
    z.anker = z.starts.map(q => verankere(z.N, q));
    z.sz = {};
    for (const w of ["a", "b"]) {
      const G = baueGraph(z.N, wirksameLinien(z.linien, p, w), p);
      z.sz[w] = { G, S: neueSuche(G, startZeiten(z.N, z.anker, G.v)) };
    }
    z.t = 0; z.horizont = 0; z.version++;
    return z;
  }
  const hmax = p => STUFEN * p.stufe;
  /** Ein Schritt: die Front beider Suchen wächst um dt Minuten */
  function schritt(z, p) {
    z.t++;
    z.horizont = Math.min(hmax(p), z.t * p.dt);
    for (const w of ["a", "b"]) sucheBis(z.sz[w].G, z.sz[w].S, z.horizont);
    z.version++;
    return z;
  }
  /** fertig, wenn die Front die letzte Isochrone erreicht hat oder nichts mehr zu erreichen ist */
  const fertig = (z, p) => z.horizont >= hmax(p) || (z.sz.a.S.leer && z.sz.b.S.leer && z.t > 0);
  /** Neu rechnen und sofort zu Ende führen (wie Grasshopper nach einer Änderung) */
  function sofort(z, p) {
    baue(z, p);
    while (!fertig(z, p)) schritt(z, p);
    return z;
  }
  /** Parameter ohne Neustart: Netz und Zeiten rechnen sofort neu, reine Darstellung nicht */
  function aendere(z, p, id) {
    if (["ansicht", "darstellung", "maus", "bearbeite"].includes(id)) return;
    sofort(z, p);
  }

  /** Reisezeiten eines Szenarios bis zum aktuellen Horizont: je Straßenknoten und als Raster (mit Zwischenspeicher je Version) */
  function ergebnis(z, w) {
    const X = z.sz[w];
    if (X.version !== z.version) {
      X.tK = knotenZeiten(X.G, X.S);
      X.T = reiseRaster(z.N, X.tK, z.anker, X.G.v, z.R, z.horizont);
      X.version = z.version;
    }
    return X;
  }

  /* ---------------------------------------------------------------- Bearbeiten mit der Maus */
  /** Startpunkt setzen: hinzu = false ersetzt alle Startpunkte; hinzu = true fügt einen hinzu bzw. entfernt den nächsten im Radius r */
  function setzeStart(z, p, q, hinzu = false, r = 40) {
    if (!hinzu) z.starts = [[q[0], q[1]]];
    else {
      const i = z.starts.findIndex(s => Geo.abstand(s, q) <= r);
      if (i >= 0 && z.starts.length > 1) z.starts.splice(i, 1);
      else if (i < 0) z.starts.push([q[0], q[1]]);
    }
    return sofort(z, p);
  }
  function verschiebeStart(z, p, i, q) { z.starts[i] = [q[0], q[1]]; return sofort(z, p); }
  const linie = (z, id) => z.linien.find(l => l.id === id);
  /** Haltestelle am nächsten Straßenknoten zu q in Linie id einfügen – an der Stelle, die den kürzesten Umweg ergibt
      (Luftlinie; an den Enden zählt nur der neue Abschnitt). → Index der neuen Haltestelle (oder der vorhandenen am selben Knoten) */
  function setzeHalt(z, p, id, q) {
    const L = linie(z, id), s = naechsterKnoten(z.N, q), P = z.N.knoten, H = L.halte;
    const vorhanden = H.indexOf(s);
    if (vorhanden >= 0) return vorhanden;
    let best = H.length, bc = Infinity;
    if (H.length === 0) best = 0;
    else {
      const d = (a, b) => Geo.abstand(P[a], P[b]);
      for (let i = 0; i <= H.length; i++) {
        const c = i === 0 ? d(s, H[0]) : i === H.length ? d(H[i - 1], s) : d(H[i - 1], s) + d(s, H[i]) - d(H[i - 1], H[i]);
        if (c < bc - 1e-9) { bc = c; best = i; }
      }
    }
    H.splice(best, 0, s);
    verlege(z.N, z.adj, L); sofort(z, p);
    return L.halte.indexOf(s);
  }
  /** Haltestelle i der Linie id an den nächsten Straßenknoten zu q verschieben → neuer Index (Nachbarhalte am selben Knoten verschmelzen) */
  function verschiebeHalt(z, p, id, i, q) {
    const L = linie(z, id), s = naechsterKnoten(z.N, q);
    if (L.halte[i] === s) return i;
    L.halte[i] = s;
    const neu = []; let ni = -1;
    L.halte.forEach((h, k) => { if (!neu.length || neu[neu.length - 1] !== h) neu.push(h); if (k === i) ni = neu.length - 1; });
    L.halte = neu; verlege(z.N, z.adj, L); sofort(z, p);
    return ni;
  }
  /** nächste Haltestelle der Linie id im Radius r um q → Index oder −1 */
  function haltBei(z, id, q, r) {
    const L = linie(z, id); let best = -1, bd = r;
    L.halte.forEach((h, i) => { const d = Geo.abstand(z.N.knoten[h], q); if (d <= bd) { bd = d; best = i; } });
    return best;
  }
  /** Haltestelle i der Linie id entfernen */
  function entferneHalt(z, p, id, i) {
    const L = linie(z, id); if (i < 0 || i >= L.halte.length) return false;
    L.halte.splice(i, 1); verlege(z.N, z.adj, L); sofort(z, p);
    return true;
  }
  /** alle Haltestellen der Linie id löschen (Linie neu zeichnen) */
  function leereLinie(z, p, id) { const L = linie(z, id); L.halte = []; verlege(z.N, z.adj, L); sofort(z, p); }

  /** Kennzahlen eines Szenarios: Fläche und Einwohner innerhalb w Minuten, erreichte Haltestellen */
  function bilanz(z, w, minuten) {
    const X = ergebnis(z, w), E = erreicht(X.T, z.R, z.geb, minuten);
    const halte = new Set(); for (const l of X.G.linien) for (const h of l.halte) if (X.tK[h] < Infinity) halte.add(h);
    return Object.assign(E, { halte: halte.size, fest: X.S.festZahl, knoten: X.G.n });
  }

  return { STANDARD, STUFEN, ZELLE, QUER, STADT, ARTEN, SZENARIEN, GESCHOSSE, NUTZ, WOHNFLAECHE,
           naechsterKnoten, route, verlege, standardLinien, standardStart, wirksameLinien, baueGraph, verankere, startZeiten,
           neueSuche, sucheBis, reisezeiten, knotenZeiten, reiseweg, zeitAufKante, reiseRaster, kontur, stufeVon, gebaeudeDaten, erreicht,
           erzeuge, baue, schritt, fertig, sofort, aendere, ergebnis, hmax,
           setzeStart, verschiebeStart, setzeHalt, verschiebeHalt, haltBei, entferneHalt, leereLinie, bilanz };
});
