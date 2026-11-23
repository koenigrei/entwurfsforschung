// Tests des Modells (node --test im App-Ordner) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const Geo = require("../../_gemeinsam/geo.js");
const { zufall } = require("../../../simulationen/_gemeinsam/zufall.js");

const P = (x = {}) => Object.assign({}, M.STANDARD, x);
const nah = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b} (±${tol})`);
const keine = { a1: "keine", a2: "keine", a3: "keine", a4: "keine", a5: "keine", a6: "keine" };
/** nur eine Aktion in der Folge; z nach Grundform und dieser Aktion */
function mit(aktion, x = {}, saat = 1) {
  const p = P(Object.assign({}, keine, { a1: aktion }, x)), z = M.erzeuge(p, zufall(saat));
  const vor = { GR: z.kz.GR, BGF: z.kz.BGF, st: z.st.map(s => Object.assign({}, s)) };
  M.schritt(z, p);
  return { z, p, vor };
}
const flaecheSumme = z => z.st.reduce((s, st) => s + Geo.flaeche(st.poly), 0);
/** keine zwei Baukörper überlappen sich */
function ueberlappungsfrei(z) {
  for (let i = 0; i < z.st.length; i++) for (let j = i + 1; j < z.st.length; j++) {
    const c = M.schnitt(z.st[i].poly, z.st[j].poly);
    assert.ok(!c.length || Geo.flaeche(c) < 0.06, `Teile ${i} und ${j} überlappen (${c.length && Geo.flaeche(c)} m²)`);
  }
}
/** kleinster Abstand zweier konvexer, sich nicht schneidender Polygone */
function polyAbstand(A, B) {
  let d = Infinity;
  for (const [X, Y] of [[A, B], [B, A]]) for (const q of X) for (let i = 0; i < Y.length; i++) d = Math.min(d, Geo.abstandSegment(q, Y[i], Y[(i + 1) % Y.length]).d);
  return d;
}

/* ---------------------------------------------------------------- Abstandsflächen */
test("Abstandsfläche T = max(Mindestmaß, Faktor · H) nach Land und Baugebiet", () => {
  nah(M.abstandsTiefe(15, P({ land: "MBO", gebiet: "WA" })), 6);          // 0,4 · 15
  nah(M.abstandsTiefe(6, P({ land: "MBO", gebiet: "WA" })), 3);           // Mindestmaß 3 m
  nah(M.abstandsTiefe(15, P({ land: "MBO", gebiet: "GE" })), 3);          // 0,2 · 15 = 3
  nah(M.abstandsTiefe(5, P({ land: "BW", gebiet: "WA" })), 2.5);          // BW: mind. 2,5 m
  nah(M.abstandsTiefe(20, P({ land: "BW", gebiet: "MU" })), 4);           // BW: MU 0,2 H
  nah(M.abstandsTiefe(15, P({ land: "BY250", gebiet: "WA" })), 15);       // Art. 6 Abs. 5a: 1 H
  nah(M.abstandsTiefe(15, P({ land: "BY250", gebiet: "MK" })), 6);        // Kerngebiet ausgenommen
});

test("Abstand vom Rand: Straße bis zur Mitte, Baulinie ohne Abstand", () => {
  const p = P({ strasse: 20 });
  nah(M.randAbstand("nachbar", 7.2, p), 7.2);
  nah(M.randAbstand("strasse", 7.2, p), 0);           // 7,2 − 10 < 0
  nah(M.randAbstand("strasse", 15, p), 5);            // 15 − 10
  nah(M.randAbstand("baulinie", 15, p), 0);
});

test("Grundstück je Kante versetzen (Rechteck: Straßen oben/unten, Nachbarn links/rechts)", () => {
  const plot = [[0, 0], [120, 0], [120, 90], [0, 90]], U = M.versetzeGrundstueck(plot, [0, 7.2, 0, 7.2]);
  const bb = Geo.bbox(U);
  nah(bb.x0, 7.2); nah(bb.x1, 112.8); nah(bb.y0, 0); nah(bb.y1, 90); nah(Geo.flaeche(U), 105.6 * 90);
});

/* ---------------------------------------------------------------- Polygone */
test("konvexe Differenz: Quadrat ohne inneres Quadrat", () => {
  const A = [[0, 0], [10, 0], [10, 10], [0, 10]], B = [[2, 2], [6, 2], [6, 6], [2, 6]];
  const teile = M.ohne(A, M.halbebenen(B));
  nah(teile.reduce((s, q) => s + Geo.flaeche(q), 0), 100 - 16);
  nah(Geo.flaeche(M.schnitt(A, B)), 16);
  assert.deepEqual(M.freieAbschnitte(0, 10, [[2, 3], [5, 7], [6, 8]]), [[0, 2], [3, 5], [8, 10]]);
  assert.deepEqual(M.teileAbschnitt(0, 100, 50, 12, 10).map(x => x.map(v => Math.round(v * 10) / 10)), [[0, 45], [55, 100]]);
});

/* ---------------------------------------------------------------- Grundform */
test("Basisblock: Ring der Tiefe t, Flügel und Ecken, Fläche = Umriss − Hof", () => {
  const U = [[0, 0], [100, 0], [100, 80], [0, 80]], R = M.ring(U, 12);
  assert.equal(R.fluegel.length, 4); assert.equal(R.ecken.length, 4);
  for (const e of R.ecken) nah(Geo.flaeche(e), 144);
  nah(Geo.flaeche(R.fluegel[0]), (100 - 24) * 12); nah(Geo.flaeche(R.fluegel[1]), (80 - 24) * 12);
  const ring = R.fluegel.concat(R.ecken).reduce((s, q) => s + Geo.flaeche(q), 0);
  nah(ring, 100 * 80 - 76 * 56); nah(Geo.flaeche(R.hof), 76 * 56);
});

test("Grundform im Zustand t = 0: Geschosse im Bereich, GRZ, GFZ und BGF stimmen", () => {
  const p = P(), z = M.erzeuge(p, zufall(1));
  assert.equal(z.t, 0);
  assert.ok(z.G >= p.gMin && z.G <= p.gMax);
  nah(z.T, Math.max(3, 0.4 * z.G * p.gh));
  const U = z.umriss, bb = Geo.bbox(U), t = p.tiefe, ring = bb.b * bb.h - (bb.b - 2 * t) * (bb.h - 2 * t);
  nah(z.kz.GR, ring, 1e-6); nah(z.kz.BGF, ring * z.G, 1e-5);
  nah(z.kz.GRZ, ring / 10800, 1e-9); nah(z.kz.GFZ, ring * z.G / 10800, 1e-9);
  ueberlappungsfrei(z);
  assert.ok(z.st.every(s => !s.markiert));
});

test("Baulinie: an dieser Kante steht der Block auf der Grenze", () => {
  const p = P(), z = M.erzeuge(p, zufall(1));
  const links = () => Geo.bbox(z.umriss).x0;
  assert.ok(links() > 1);
  M.wechsleKante(z, p, 3);                                      // nachbar → baulinie
  assert.equal(z.arten[3], "baulinie"); nah(links(), 0);
});

/* ---------------------------------------------------------------- Aktionen */
test("Kanten löschen: Flügel der Startkante fällt weg, die Ecken bleiben bei den Nachbarn", () => {
  const { z, vor, p } = mit("kanten", { kStart: 1, kAnzahl: 1 });
  const t = p.tiefe, L = Geo.abstand(z.umriss[0], z.umriss[1]);
  nah(vor.GR - z.kz.GR, (L - 2 * t) * t, 1e-6);
  assert.ok(!z.st.some(s => s.kante === 0) && z.st.filter(s => s.ecke >= 0).length === 4);
  const zwei = mit("kanten", { kStart: 1, kAnzahl: 2 });
  assert.ok(!zwei.z.st.some(s => s.ecke === 1), "Ecke zwischen zwei gelöschten Kanten fällt mit weg");
});

test("Rücksprünge an Kanten: das Stück rückt nach innen, die Grundfläche bleibt gleich", () => {
  const { z, vor } = mit("rsKante", { rkAnzahl: 3 });
  nah(z.kz.GR, vor.GR, 1e-6);
  assert.match(z.log[1].de, /3 von 3/);
  ueberlappungsfrei(z);
  // ein neues Stück liegt im Hof (jenseits der Gebäudetiefe)
  const innen = z.st.filter(s => s.kante >= 0 && M.uv(z.rahmen[s.kante], Geo.schwerpunkt(s.poly))[1] > M.STANDARD.tiefe);
  assert.ok(innen.length >= 3);
});

test("Rücksprünge an Ecken: im rechten Winkel fehlt je Ecke genau a · b", () => {
  const { z, vor } = mit("rsEcke", { reMin: 5, reMax: 5, reAnzahl: 2 });
  nah(vor.GR - z.kz.GR, 2 * 25, 1e-6);
});

test("Eckdurchgänge: je Durchgang fehlt w · t (rechter Winkel), „beide“ macht die Ecke frei", () => {
  const p0 = { ebBreite: 6, ebAnzahl: 0 };
  const a = mit("eck", Object.assign({ ebRichtung: "davor" }, p0));
  nah(a.vor.GR - a.z.kz.GR, 4 * 6 * 12, 1e-6);
  const b = mit("eck", Object.assign({ ebRichtung: "beide" }, p0));
  nah(b.vor.GR - b.z.kz.GR, 8 * 6 * 12, 1e-6);
  // die Ecke berührt keinen Flügel mehr
  for (const e of b.z.st.filter(s => s.ecke >= 0)) for (const k of b.z.st.filter(s => s.kante >= 0)) assert.ok(polyAbstand(e.poly, k.poly) >= 6 - 1e-6);
});

test("Zufallsdurchgänge: Gesamtbreite bzw. abzuziehende Fläche werden eingehalten", () => {
  const a = mit("durch", { zdModus: "breite", zdBreite: 18, zdEinzel: 6 });
  nah(a.vor.GR - a.z.kz.GR, 18 * 12, 1e-6);
  assert.match(a.z.log[1].de, /3 à 6 m/);
  const b = mit("durch", { zdModus: "flaeche", zdFlaeche: 3000, zdEinzel: 6 });
  const weg = b.vor.BGF - b.z.kz.BGF;
  assert.ok(weg >= 3000 && weg < 3000 + 6 * 12 * b.z.G + 1e-6, `abgezogen ${weg}`);
});

test("Höhe reduzieren: BGF sinkt um mindestens die Vorgabe, nie unter die Mindestgeschosse", () => {
  const { z, vor } = mit("hoehe", { rhFlaeche: 2500, rhMin: 3 });
  const weg = vor.BGF - z.kz.BGF;
  assert.ok(weg >= 2500 - 1e-6, `abgezogen ${weg}`);
  assert.ok(z.st.every(s => s.g >= 3));
  assert.ok(z.st.some(s => s.g < z.G), "verschiedene Höhenprofile");
  assert.equal(z.kz.GR, vor.GR);
});

test("Türme: Zusatzgeschosse ≤ Vorgabe und unter der Höhengrenze der Abstandsflächen", () => {
  const { z, p, vor } = mit("turm", { tuAnzahl: 2, tuMax: 6, tuAttr: false });
  const T = z.st.filter(s => s.art === "turm");
  assert.ok(T.length >= 2);
  for (const s of T) {
    assert.ok(s.g - z.G >= 1 && s.g - z.G <= 6);
    assert.ok(s.g * p.gh <= M.huellHoehe(z, p, s.poly) + 1e-6);
  }
  assert.ok(z.kz.BGF > vor.BGF, "Türme fügen Fläche hinzu");
  // Bayern, Großstadt (1 H): an den Nachbargrenzen und an der 20-m-Straße ist kein Turm mehr möglich
  const by = mit("turm", { land: "BY250", gebiet: "WA" });
  assert.ok(!by.z.st.some(s => s.art === "turm"));
});

test("Türme am Attraktor: der erste Turm steht beim Attraktorpunkt", () => {
  const p = P(Object.assign({}, keine, { a1: "turm", tuAnzahl: 1, tuAttr: true })), z = M.erzeuge(p, zufall(3));
  M.setzeAttraktor(z, p, [60, 4]); M.schritt(z, p);
  const t = z.st.find(s => s.art === "turm");
  assert.ok(t && Geo.abstand(Geo.schwerpunkt(t.poly), [60, 6]) < 15);
});

test("Hofgebäude: Geschosse im Bereich, Abstand zum Blockrand ≥ beide Abstandsflächen", () => {
  const { z, p } = mit("hof", { hoGmin: 3, hoGmax: 5, hoZuschneiden: true });
  const H = z.st.filter(s => s.art === "hof");
  assert.ok(H.length >= 1);
  for (const h of H) {
    assert.ok(h.g >= 3 && h.g <= 5);
    const c = M.abstandsTiefe(h.g * p.gh, p) + z.T;
    for (const r of z.st.filter(s => s.art !== "hof")) assert.ok(polyAbstand(h.poly, r.poly) >= c - 1e-6);
  }
  const an = mit("hof", { hoZuschneiden: false });
  const h2 = an.z.st.filter(s => s.art === "hof");
  assert.ok(h2.length && h2.some(h => an.z.st.some(r => r.art !== "hof" && polyAbstand(h.poly, r.poly) < 1e-6)), "ohne Zuschneiden schließt es an");
  ueberlappungsfrei(an.z);
});

test("Dachgeschosse: Anteil, Tiefe und Vollgeschoss-Regel (≥ 2/3 des Geschosses darunter)", () => {
  const a = mit("dach", { daAnteil: 100, daTiefe: 8 });
  assert.ok(a.z.st.filter(s => s.art === "rand").every(s => s.dach.length));
  assert.ok(a.z.kz.GFZ > a.z.kz.BGF / a.z.kz.A - 0.6 && a.z.kz.BGFvoll > a.vor.BGF);
  const b = mit("dach", { daAnteil: 100, daTiefe: 6 });           // 6/12 < 2/3: kein Vollgeschoss
  assert.ok(b.z.kz.BGF > b.vor.BGF);
  nah(b.z.kz.BGFvoll, b.vor.BGF, 1e-6);
  const c = mit("dach", { daAnteil: 40 });
  const r = c.z.st.filter(s => s.art === "rand" || s.art === "ecke"), mitD = r.filter(s => s.dach.length);
  const anteil = mitD.reduce((s, x) => s + Geo.flaeche(x.poly), 0) / r.reduce((s, x) => s + Geo.flaeche(x.poly), 0);
  assert.ok(anteil >= 0.4 && anteil < 0.8, `Anteil ${anteil}`);
});

/* ---------------------------------------------------------------- Zeilen */
test("charakteristische Kanten: Fünfeck → 4, Rechteck → 4, Dreieck → 3", () => {
  assert.equal(M.charakteristischeKanten(M.GRUNDSTUECKE.fuenfeck.punkte).length, 4);
  assert.equal(M.charakteristischeKanten(M.GRUNDSTUECKE.rechteck.punkte).length, 4);
  assert.equal(M.charakteristischeKanten([[0, 0], [100, 0], [0, 80]]).length, 3);
  const K = M.charakteristischeKanten(M.GRUNDSTUECKE.keil.punkte);
  assert.equal(K.reduce((s, k) => s + k.kette.length - 1, 0), 5);     // alle fünf Kanten sind verteilt
});

test("Zeilen: im Umriss, ohne Überlappung, Abstand untereinander ≥ 2 T; die Reihenfolge der Kanten ändert das Muster", () => {
  for (const form of ["rechteck", "fuenfeck", "trapez"]) {
    const p = P({ typ: "zeilen", form }), z = M.erzeuge(p, zufall(2));
    const Z = z.st.filter(s => s.art === "zeile");
    assert.ok(Z.length >= 3, form);
    for (const s of Z) nah(Geo.flaeche(M.schnitt(s.poly, z.umriss)), Geo.flaeche(s.poly), 1e-6);
    for (let i = 0; i < Z.length; i++) for (let j = i + 1; j < Z.length; j++) assert.ok(polyAbstand(Z[i].poly, Z[j].poly) >= 2 * z.T - 1e-6, form);
  }
  const lage = f => M.erzeuge(P({ typ: "zeilen", form: "fuenfeck", zFolge: f }), zufall(2)).st.map(s => Geo.schwerpunkt(s.poly).map(Math.round).join(",")).sort().join(" ");
  assert.notEqual(lage("1234"), lage("3412"));
});

/* ---------------------------------------------------------------- Ablauf */
test("Schritt = eine Aktion; nach der Folge beginnt die nächste Variante; Ende nach allen Varianten", () => {
  const p = P({ varianten: 3 }), z = M.erzeuge(p, zufall(4)), n = M.folge(p).length;
  assert.equal(n, 6);
  for (let i = 1; i <= n; i++) { M.schritt(z, p); assert.equal(z.t, i); assert.equal(z.log.length, i + 1); }
  assert.equal(z.v, 0);
  M.schritt(z, p); assert.equal(z.v, 1); assert.equal(z.log.length, 1); assert.equal(z.varianten.length, 1);
  while (!M.fertig(z, p)) M.schritt(z, p);
  assert.equal(z.t, 3 * (n + 1) - 1); assert.equal(z.v, 2);
  const t = z.t; M.schritt(z, p); assert.equal(z.t, t);
  // Varianten unterscheiden sich, Neuaufbau ergibt dieselben Werte
  const G = z.varianten.map(v => v.GFZ); assert.ok(new Set(G.map(g => g.toFixed(4))).size > 1);
  M.baue(z, p); assert.deepEqual(z.varianten.map(v => v.GFZ), G);
  M.zeigeVariante(z, p, 0); assert.equal(z.v, 0); assert.equal(z.t, n); nah(z.kz.GFZ, G[0], 1e-12);
  assert.deepEqual(z.varianten.map(r => r.v), [1, 2], "die übrigen fertigen Varianten bleiben in der Reihe");
  M.schritt(z, p); assert.equal(z.v, 1); assert.deepEqual(z.varianten.map(r => r.v), [0, 1, 2]);
});

test("Parameter wirken ohne Neustart (t bleibt), Ansichtsregler bauen nicht neu", () => {
  const p = P(), z = M.erzeuge(p, zufall(5));
  M.schritt(z, p); M.schritt(z, p);
  const bgf = z.kz.BGF;
  const q = Object.assign({}, p, { tiefe: 14 }); M.aendere(z, q, "tiefe");
  assert.equal(z.t, 2); assert.notEqual(z.kz.BGF, bgf);
  const st = z.st; M.aendere(z, Object.assign({}, q, { drehung: 90 }), "drehung"); assert.equal(z.st, st);
  // kürzere Folge: t wird begrenzt
  M.schritt(z, q); M.schritt(z, q); M.aendere(z, Object.assign({}, q, keine, { a1: "turm" }), "a2"); assert.equal(z.t, 1);
});

test("gleiche Saat → gleicher Lauf, andere Saat → anderer; Saat je Aktion wirkt nur auf diese Aktion", () => {
  const lauf = (s, x = {}) => { const p = P(x), z = M.erzeuge(p, zufall(s)); for (let i = 0; i < 6; i++) M.schritt(z, p); return z.st.map(st => [st.g, Geo.flaeche(st.poly).toFixed(3)].join()).join(" "); };
  assert.equal(lauf(7), lauf(7));
  assert.notEqual(lauf(7), lauf(8));
  const p = P(Object.assign({}, keine, { a1: "durch", a2: "turm" }));
  const nach = (x) => { const q = Object.assign({}, p, x), z = M.erzeuge(q, zufall(9)); M.schritt(z, q); const a = z.st.map(s => Geo.flaeche(s.poly).toFixed(3)).join(); M.schritt(z, q); return [a, z.kz.BGF]; };
  const a = nach({}), b = nach({ tuSaat: 2 }), c = nach({ zdSaat: 2 });
  assert.equal(a[0], b[0]); assert.notEqual(a[1], b[1]); assert.notEqual(a[0], c[0]);
});

test("Ecken ziehen: das Grundstück bleibt konvex", () => {
  const p = P(), z = M.erzeuge(p, zufall(1));
  assert.equal(M.verschiebeEcke(z, p, 2, [60, 40]), false);       // würde konkav
  assert.equal(M.verschiebeEcke(z, p, 2, [130, 100]), true);
  assert.deepEqual(z.plot[2], [130, 100]); assert.ok(z.kz.A > 10800);
});

test("Katalogbeschreibung: Aktionen in beliebiger Reihenfolge; jede fügt Fläche hinzu oder zieht sie ab", () => {
  const A = ["kanten", "rsKante", "rsEcke", "eck", "durch", "hoehe", "turm", "hof", "dach"], plus = ["turm", "hof", "dach"];
  for (const form of Object.keys(M.GRUNDSTUECKE)) {
    for (const a of A) {
      const { z, vor } = mit(a, { form }, 11);
      if (plus.includes(a)) assert.ok(z.kz.BGF >= vor.BGF - 1e-6, `${form} ${a}`);
      else if (a !== "rsKante") assert.ok(z.kz.BGF <= vor.BGF + 1e-6, `${form} ${a}`);
      ueberlappungsfrei(z);
    }
  }
  // umgekehrte Folge: anderes, gültiges Ergebnis
  const p1 = P(), p2 = P({ a1: "dach", a2: "hof", a3: "turm", a4: "hoehe", a5: "rsKante", a6: "durch" });
  const z1 = M.erzeuge(p1, zufall(1)), z2 = M.erzeuge(p2, zufall(1));
  for (let i = 0; i < 6; i++) { M.schritt(z1, p1); M.schritt(z2, p2); }
  assert.notEqual(z1.kz.BGF.toFixed(2), z2.kz.BGF.toFixed(2));
  ueberlappungsfrei(z2);
});
