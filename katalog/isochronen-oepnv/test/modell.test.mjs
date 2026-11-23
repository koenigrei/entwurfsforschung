// Tests des Modells (node --test im App-Ordner) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const Geo = require("../../_gemeinsam/geo.js");
const { zufall } = require("../../../simulationen/_gemeinsam/zufall.js");
const P = Object.assign({}, M.STANDARD);
const mit = o => Object.assign({}, P, o);
const nahe = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b}`);

/** Gerade Straße 0 – 400 – 800 – 1200 m (Knoten 0…3), Gehen 80 m/min */
function gerade() { return Geo.netz([[[0, 0], [400, 0]], [[400, 0], [800, 0]], [[800, 0], [1200, 0]]]); }
const linieAuf = (halte, laengen, takt, tempo) => ({ id: "x", art: "tram", halte, laengen, takt, tempo });
/** Reisezeiten je Straßenknoten ab Knoten 0 (Startpunkt genau auf Knoten 0) */
function zeiten(N, linien, p) {
  const G = M.baueGraph(N, linien, p), anker = [M.verankere(N, [0, 0])];
  const S = M.sucheBis(G, M.neueSuche(G, M.startZeiten(N, anker, G.v)), Infinity);
  return { G, S, t: M.knotenZeiten(G, S) };
}

test("Gehen: Länge / Gehgeschwindigkeit (4,8 km/h = 80 m/min)", () => {
  const { t } = zeiten(gerade(), [], P);
  nahe(t[0], 0); nahe(t[1], 5); nahe(t[2], 10); nahe(t[3], 15);
});

test("Einstieg kostet Takt/2, Fahrt Abschnitt/Tempo + Haltezeit", () => {
  // Linie 0 → 3 (1200 m) mit 24 km/h = 400 m/min, Takt 10: 5 min warten + 3 min fahren + 0,5 min Halt = 8,5 min
  const { t, G, S } = zeiten(gerade(), [linieAuf([0, 3], [1200], 10, 24)], P);
  nahe(t[3], 8.5);
  nahe(t[2], 10);                                    // zurückgehen (8,5 + 5) ist länger als direkt (10)
  const w = M.reiseweg(G, S, 3);
  assert.equal(w.fahrten, 1); assert.equal(w.umstiege, 0);
  // Wartezeitanteil 0 (Fahrplan bekannt): nur noch 3,5 min; Anteil 1: ganzer Takt
  nahe(zeiten(gerade(), [linieAuf([0, 3], [1200], 10, 24)], mit({ warte: 0 })).t[3], 3.5);
  nahe(zeiten(gerade(), [linieAuf([0, 3], [1200], 10, 24)], mit({ warte: 1 })).t[3], 13.5);
});

test("Umstieg kostet wieder Takt × Anteil, der Zuschlag gilt nur beim Umsteigen", () => {
  // Linie x: 0 → 2 (800 m, 400 m/min, Takt 10); Linie y: 2 → 3 (400 m, 4000 m/min, Takt 2)
  const L = [linieAuf([0, 2], [800], 10, 24), Object.assign(linieAuf([2, 3], [400], 2, 240), { id: "y" })];
  // 0 → 2: 5 + 2 + 0,5 = 7,5; umsteigen: + 1 + 0,1 + 0,5 = 9,1 (zu Fuß ab Knoten 2: 12,5)
  let R = zeiten(gerade(), L, P);
  nahe(R.t[2], 7.5); nahe(R.t[3], 9.1);
  const w = M.reiseweg(R.G, R.S, 3); assert.equal(w.fahrten, 2); assert.equal(w.umstiege, 1);
  // Zuschlag 4 min: Umsteigen 13,1; besser 10 min zu Fuß zu Knoten 2 und dort erstmals einsteigen (ohne Zuschlag): 10 + 1 + 0,6 = 11,6
  R = zeiten(gerade(), L, mit({ umstieg: 4 }));
  nahe(R.t[2], 7.5); nahe(R.t[3], 11.6);
  const w4 = M.reiseweg(R.G, R.S, 3); assert.equal(w4.fahrten, 1); assert.equal(w4.umstiege, 0);
});

test("Linien fahren in beiden Richtungen; Fahrzeit = Summe der Abschnitte", () => {
  const N = gerade(), G = M.baueGraph(N, [linieAuf([0, 1, 3], [400, 800], 10, 24)], P);
  const start = [[3, 0]], S = M.sucheBis(G, M.neueSuche(G, start), Infinity), t = M.knotenZeiten(G, S);
  nahe(t[0], 5 + (2 + 0.5) + (1 + 0.5));            // 3 → 1 → 0 mit der Linie: 9 min (zu Fuß 15)
  assert.equal(G.n, 2 * 4 + 2 * 3);
});

test("schrittweise Suche: nach sucheBis(h) sind genau die Knoten ≤ h fest; Ergebnis = Geo.dijkstra", () => {
  const z = M.erzeuge(P, zufall(3)), G = z.sz.b.G, start = M.startZeiten(z.N, z.anker, G.v);
  const S = M.neueSuche(G, start), ref = M.reisezeiten(G, start);
  for (const h of [2, 7.5, 13]) {
    M.sucheBis(G, S, h);
    for (let i = 0; i < G.n; i++) {
      if (S.fest[i]) { assert.ok(S.dist[i] <= h + 1e-9); nahe(S.dist[i], ref[i], 1e-9); }
      else assert.ok(ref[i] > h - 1e-9, `Knoten ${i}: ${ref[i]} ≤ ${h}, aber nicht fest`);
    }
  }
  M.sucheBis(G, S, Infinity);
  for (let i = 0; i < G.n; i++) nahe(S.dist[i], ref[i], 1e-9);
  assert.ok(S.leer);
});

test("Schritt: Front wächst um dt; fertig bei der letzten Isochrone (4 × Stufe)", () => {
  const z = M.erzeuge(P, zufall(1));
  assert.equal(z.t, 0); assert.equal(z.horizont, 0); assert.equal(z.sz.a.S.festZahl, 0);
  assert.ok(!M.fertig(z, P));
  M.schritt(z, P); assert.equal(z.t, 1); assert.equal(z.horizont, 1);
  const f1 = z.sz.a.S.festZahl;
  for (let i = 1; i < 19; i++) M.schritt(z, P);
  assert.ok(!M.fertig(z, P)); assert.ok(z.sz.a.S.festZahl > f1);
  M.schritt(z, P); assert.equal(z.horizont, 20); assert.ok(M.fertig(z, P));
  const q = mit({ dt: 2.5, stufe: 4 }), z2 = M.sofort(M.erzeuge(q, zufall(1)), q);
  assert.equal(z2.t, 7); assert.equal(z2.horizont, 16);
  M.baue(z2, q); assert.equal(z2.t, 0);
});

test("Raster: Reisezeit entlang der Straße und quer zu Fuß, höchstens QUER m von der Straße", () => {
  const N = gerade(), R = { nx: 80, ny: 30, zelle: 15 }, v = 80;
  const N2 = Geo.netz([[[0, 15], [1200, 15]]]);    // Straße auf y = 15 m (Grenze zwischen Zeilen 0 und 1)
  const anker = [M.verankere(N2, [0, 15])];
  const tK = new Float64Array([0, 15]);
  const T = M.reiseRaster(N2, tK, anker, v, R);
  const zelle = (x, y) => T[Math.floor(y / 15) * R.nx + Math.floor(x / 15)];
  // Zelle bei x ≈ 407,5 m, y ≈ 22,5 m: 407,5 m entlang + 7,5 m quer ≈ 5,19 min
  nahe(zelle(407, 22), (407.5 + 7.5) / v, 0.02);
  // 67,5 m quer: bester Weg verlässt die Straße schräg, aber höchstens QUER m Luftlinie; Abstandstransformation ≤ 8 % darüber
  const t60 = zelle(600, 82), quer = Math.sqrt(M.QUER ** 2 - 67.5 ** 2), ideal = (607.5 - quer + M.QUER) / v;
  assert.ok(t60 >= ideal - 0.02 && t60 <= ideal * 1.08, `${t60} vs ${ideal}`);
  assert.ok(t60 < (607.5 + 67.5) / v);             // kürzer als erst entlang, dann rechtwinklig
  // weiter als QUER von der Straße: nicht erreichbar
  assert.equal(zelle(600, 15 + M.QUER + 40), Infinity);
  // Horizont: alles über h wird Infinity
  const Th = M.reiseRaster(N2, tK, anker, v, R, 5);
  assert.ok(Th.every(t => t <= 5 || t === Infinity));
  assert.equal(Th[1 * R.nx + Math.floor(600 / 15)], Infinity);
  void N;
});

test("Startpunkt mitten auf einer Straße: Zeit wächst von dort in beide Richtungen", () => {
  const N = Geo.netz([[[0, 0], [400, 0]]]), a = M.verankere(N, [200, 30]);
  nahe(a.d, 30); nahe(a.t, 0.5);
  const S = M.startZeiten(N, [a], 80);
  nahe(S[0][1], (30 + 200) / 80); nahe(S[1][1], (30 + 200) / 80);
  // auf der Kante direkt am Fußpunkt: nur der Weg quer (30 m), nicht über einen Knoten
  const sk = new Map([[0, [a]]]);
  nahe(M.zeitAufKante(N, 0, 200, new Float64Array([S[0][1], S[1][1]]), sk, 80), 30 / 80);
  nahe(M.zeitAufKante(N, 0, 100, new Float64Array([S[0][1], S[1][1]]), sk, 80), 130 / 80);
});

test("Isochrone (marching squares): Linie gleicher Zeit liegt dort, wo die Zeit den Wert erreicht", () => {
  const R = { nx: 10, ny: 4, zelle: 10 }, T = new Float32Array(40);
  for (let j = 0; j < 4; j++) for (let i = 0; i < 10; i++) T[j * 10 + i] = i;   // Zeit = Spaltenindex
  const S = M.kontur(T, R, 4.5);
  assert.equal(S.length, 3);
  for (const s of S) for (const q of s) nahe(q[0], (4.5 + 0.5) * 10, 1e-6);
  assert.equal(M.kontur(T, R, 20).length, 0);
});

test("Stufen der Isochronen: 0–5, 5–10, 10–15, 15–20 min, später, nicht erreicht", () => {
  assert.equal(M.stufeVon(0, 5), 0); assert.equal(M.stufeVon(4.99, 5), 0); assert.equal(M.stufeVon(5, 5), 1);
  assert.equal(M.stufeVon(19.9, 5), 3); assert.equal(M.stufeVon(20, 5), 3); assert.equal(M.stufeVon(20.1, 5), 4);
  assert.equal(M.stufeVon(Infinity, 5), -1);
});

test("Beispielstadt: 3 × 2 km, vier Linien entlang der Straßen, Haltestellen auf Netzknoten", () => {
  const z = M.erzeuge(P, zufall(1));
  assert.equal(z.b, 3000); assert.equal(z.h, 2000);
  assert.deepEqual(z.linien.map(l => l.id), ["1", "2", "3", "N"]);
  const kante = new Set(z.N.kanten.map(e => Math.min(e.a, e.b) + "-" + Math.max(e.a, e.b)));
  for (const l of z.linien) {
    assert.ok(l.halte.length >= 5);
    assert.equal(l.abschnitte.length, l.halte.length - 1);
    for (const r of l.abschnitte) for (let i = 0; i + 1 < r.knoten.length; i++)
      assert.ok(kante.has(Math.min(r.knoten[i], r.knoten[i + 1]) + "-" + Math.max(r.knoten[i], r.knoten[i + 1])), "Fahrweg verlässt das Straßennetz");
  }
  // Umsteigepunkte: 1 und 2 teilen einen Halt, N und 2 ebenso
  const L = id => new Set(z.linien.find(l => l.id === id).halte);
  assert.ok([...L("1")].some(h => L("2").has(h)));
  assert.ok([...L("N")].some(h => L("2").has(h)));
  assert.ok(z.ewGesamt > 50000);
});

test("Szenarien: A ohne N; B neu mit N, takt halbiert, tempo × 1,5, ohne1 ohne Linie 1", () => {
  const z = M.erzeuge(P, zufall(1)), ids = (p, w) => M.wirksameLinien(z.linien, p, w).map(l => l.id).join("");
  assert.equal(ids(P, "a"), "123"); assert.equal(ids(P, "b"), "123N");
  assert.equal(ids(mit({ szenario: "ohne1" }), "b"), "23");
  const t = M.wirksameLinien(z.linien, mit({ szenario: "takt" }), "b"), v = M.wirksameLinien(z.linien, mit({ szenario: "tempo" }), "b");
  assert.deepEqual(t.map(l => l.takt), [P.takt1 / 2, P.takt2 / 2, P.takt3 / 2]);
  assert.deepEqual(v.map(l => l.tempo), [P.tempoBahn * 1.5, P.tempoTram * 1.5, P.tempoBus * 1.5]);
});

test("Erwartetes Verhalten: neue Linie, dichterer Takt und mehr Tempo vergrößern die Isochronen, ohne Linie 1 schrumpfen sie", () => {
  for (const saat of [1, 2, 3]) {
    const z = M.erzeuge(P, zufall(saat));
    const flaeche = (p, w, min) => { M.sofort(z, p); return M.bilanz(z, w, min).flaeche; };
    const a = flaeche(P, "a", 20);
    assert.ok(flaeche(P, "b", 20) > a * 1.05, "neue Linie N bringt zu wenig");
    for (const s of ["takt", "tempo"]) assert.ok(flaeche(mit({ szenario: s }), "b", 20) >= a);
    // Start am Kreuz der Linien 1 und 2: ohne Linie 1 wird es deutlich kleiner
    const kreuz = z.N.knoten[z.linien[0].halte[3]];
    M.setzeStart(z, P, [kreuz[0] + 20, kreuz[1] + 20]);
    const a1 = flaeche(mit({ szenario: "ohne1" }), "a", 15), b1 = M.bilanz(z, "b", 15).flaeche;
    assert.ok(b1 < a1 * 0.9, `ohne Linie 1: ${b1} vs ${a1}`);
  }
});

test("Kennzahlen reagieren folgerichtig: schneller gehen → größere Fläche, längerer Takt → kleinere", () => {
  const z = M.erzeuge(P, zufall(2)), f = p => { M.sofort(z, p); return M.bilanz(z, "a", 15).flaeche; };
  const basis = f(P);
  assert.ok(f(mit({ gehen: 5.5 })) > basis);
  assert.ok(f(mit({ takt1: 30, takt2: 30, takt3: 30 })) <= basis);
  assert.ok(basis > 0.5 && basis < 6);
});

test("mehrere Startpunkte: jede Zeit ist höchstens so groß wie ab einem Startpunkt", () => {
  const z = M.erzeuge(P, zufall(1)); M.sofort(z, P);
  const t1 = Float64Array.from(M.ergebnis(z, "a").tK);
  M.setzeStart(z, P, [2500, 400], true);
  assert.equal(z.starts.length, 2);
  const t2 = M.ergebnis(z, "a").tK;
  for (let i = 0; i < t1.length; i++) assert.ok(t2[i] <= t1[i] + 1e-9);
  assert.ok([...t2].some((t, i) => t < t1[i] - 1));
  M.setzeStart(z, P, [2505, 405], true, 40);        // nahe am zweiten: entfernt ihn wieder
  assert.equal(z.starts.length, 1);
  M.setzeStart(z, P, [1500, 1000]);                 // ohne Umschalt: ersetzt alle
  assert.deepEqual(z.starts, [[1500, 1000]]);
  assert.ok(M.fertig(z, P));
});

test("Haltestellen bearbeiten: anhängen, einfügen, verschieben, entfernen, Linie leeren", () => {
  const z = M.erzeuge(P, zufall(1)), N = z.linien.find(l => l.id === "N"), K = z.N.knoten;
  const n0 = N.halte.length, letzter = K[N.halte[n0 - 1]];
  // jenseits des letzten Halts → wird angehängt
  const i = M.setzeHalt(z, P, "N", [Math.min(z.b - 10, letzter[0] + 450), letzter[1]]);
  assert.equal(i, n0); assert.equal(N.halte.length, n0 + 1);
  assert.equal(N.abschnitte.length, n0);
  // zwischen Halt 1 und 2 → wird dort eingefügt
  const m = Geo.lerp(K[N.halte[1]], K[N.halte[2]], 0.5);
  const j = M.setzeHalt(z, P, "N", [m[0], m[1] + 5]);
  assert.equal(j, 2);
  // derselbe Knoten noch einmal: kein neuer Halt
  assert.equal(M.setzeHalt(z, P, "N", K[N.halte[0]]), 0); assert.equal(N.halte.length, n0 + 2);
  // verschieben und finden
  const ziel = K[M.naechsterKnoten(z.N, [300, 1900])];
  const k = M.verschiebeHalt(z, P, "N", 0, ziel);
  assert.equal(N.halte[k], M.naechsterKnoten(z.N, ziel));
  assert.equal(M.haltBei(z, "N", ziel, 30), k);
  assert.equal(M.haltBei(z, "N", [ziel[0] + 500, ziel[1] - 500], 30), -1);
  // entfernen
  assert.ok(M.entferneHalt(z, P, "N", k)); assert.equal(N.halte.length, n0 + 1);
  // leeren: Linie fällt aus Szenario B heraus
  M.leereLinie(z, P, "N");
  assert.equal(N.halte.length, 0);
  assert.equal(M.wirksameLinien(z.linien, P, "b").map(l => l.id).join(""), "123");
  assert.ok(M.fertig(z, P));
});

test("Wiederholbarkeit: gleiche Saat → gleiche Stadt und Zeiten, andere Saat → andere", () => {
  const lauf = s => { const z = M.erzeuge(P, zufall(s)); M.sofort(z, P); return Array.from(M.ergebnis(z, "b").T); };
  assert.deepEqual(lauf(5), lauf(5));
  assert.notDeepEqual(lauf(5), lauf(6));
});

test("Darstellungsparameter rechnen nicht neu; Netzparameter schon (sofort fertig)", () => {
  const z = M.erzeuge(P, zufall(1));
  M.aendere(z, mit({ ansicht: "diff" }), "ansicht"); assert.equal(z.t, 0);
  M.aendere(z, mit({ takt1: 7 }), "takt1"); assert.equal(z.t, 20); assert.ok(M.fertig(z, P));
});
