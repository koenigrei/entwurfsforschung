// Tests des Modells (node --test im App-Ordner) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const H = require("../hydraulik.js");
const { zufall } = require("../../../simulationen/_gemeinsam/zufall.js");
const P = Object.assign({}, M.STANDARD);
const mit = o => Object.assign({}, P, o);
const nah = (a, b, tol, was) => assert.ok(Math.abs(a - b) <= tol, `${was || ""}: ${a} ≠ ${b} (±${tol})`);
const fertigGerechnet = p => { const z = M.erzeuge(p, zufall(1)); M.rechneAlles(z, p); return z; };

test("erzeuge: t = 0, elf Punkte (NetworkSegments 10), Behälter vorn, noch keine Ergebnisse", () => {
  const z = M.erzeuge(P, zufall(1));
  assert.equal(z.t, 0); assert.equal(z.P.length, 11); assert.equal(z.erg, null);
  assert.ok(z.netz.knoten[0].behaelter); assert.equal(z.netz.knoten[0].kopf, 0 + 6);
  assert.equal(z.netz.leitungen.length, 10);
});

test("Graph Mapper: Bezier der Datei, Endpunkte und Monotonie", () => {
  nah(M.graphMapper(M.KURVE, 0), 0.6214, 1e-4, "y(0)"); nah(M.graphMapper(M.KURVE, 1), 0.4551, 1e-4, "y(1)");
  // Mitte von Hand: x(u) = 0.5 bei u ≈ 0.594, y ≈ 0.644
  nah(M.graphMapper(M.KURVE, 0.5), 0.644, 0.002, "y(0.5)");
  const K = M.ordneKurve([[0.3, 2], [0.8, -1], [0.2, 0.5], [0.7, 0.5]]);
  assert.deepEqual(K.map(q => q[0]), [0, 0.8, 0.8, 1]); assert.equal(K[0][1], 1); assert.equal(K[1][1], 0);
});

test("Profil: Behälter auf 0, Höhenunterschied = NetworkHeight, x gleichmäßig über NetworkLength", () => {
  const Pr = M.profil(P);
  assert.equal(Pr[0].z, 0); assert.equal(Pr[10].x, 100); nah(Pr[3].x, 30, 1e-9);
  const zs = Pr.map(q => q.z);
  nah(Math.max(...zs) - Math.min(...zs), 30, 1e-9, "Spanne");
  assert.deepEqual(M.profil(mit({ segmente: 0 })), [{ x: 0, z: 0 }]);
  assert.ok(M.profil(mit({ hoehe: 0 })).every(q => q.z === 0));
});

test("Pumpe an Linie Floor(NetworkSegments · Pump Index); Rohrlänge im Raum; Behälterdurchmesser aus dem Volumen", () => {
  assert.equal(M.pumpenLinie(P), 9); assert.equal(M.pumpenLinie(mit({ pumpenIndex: 0.5 })), 5); assert.equal(M.pumpenLinie(mit({ pumpenIndex: 0 })), 0);
  const Pr = [{ x: 0, z: 0 }, { x: 3, z: -4 }, { x: 6, z: -4 }];
  const n = M.netzAus(Pr, mit({ segmente: 2, pumpenIndex: 0.99 }));
  assert.equal(n.leitungen[0].art, "rohr"); assert.equal(n.leitungen[0].L, 5); assert.equal(n.leitungen[1].art, "pumpe");
  assert.equal(n.knoten[1].bedarf, 0.1);
  // Testnet.inp: TankVolume 395, Höhe 5 → Durchmesser 10.029 m
  nah(M.tankDurchmesser(395, 5), 10.0292534135935, 1e-9);
});

test("Schritt = Iteration: verzweigungsfreie Leitung nach zwei Iterationen fertig, Durchflüsse 1000 … 100 L/s", () => {
  const z = M.erzeuge(P, zufall(1));
  M.schritt(z, P); assert.equal(z.t, 1); assert.equal(z.S.iter, 1); assert.ok(!z.fertig);
  M.schritt(z, P); assert.ok(z.fertig); assert.equal(z.S.iter, 2);
  M.schritt(z, P); assert.equal(z.t, 3); assert.equal(z.S.iter, 2, "danach keine Iteration mehr");
  z.erg.leitungen.forEach((l, k) => nah(l.q, 1000 - 100 * k, 1e-6, "Linie " + k));
  assert.ok(H.bilanzfehler(z.netz, z.S) < 1e-9);
  assert.equal(z.verlauf.length, 2);
});

test("Druck = Druckhöhe − Lage; die Pumpe (1 kW, 100 L/s) hebt um ≈ 1,02 m", () => {
  const z = fertigGerechnet(P);
  z.erg.knoten.forEach((k, i) => nah(k.druck, k.kopf - z.P[i].z, 1e-9));
  nah(z.erg.knoten[10].kopf - z.erg.knoten[9].kopf, 1.02, 0.01, "Förderhöhe");
  // fast kein Verlust in 0,9-m-Rohren: Druck ≈ TankHeight − Lage
  for (let i = 1; i <= 9; i++) { nah(z.erg.knoten[i].druck, 6 - z.P[i].z, 0.25, "Knoten " + i); assert.ok(z.erg.knoten[i].druck < 6 - z.P[i].z, "Verlust > 0"); }
});

test("Katalogbeschreibung (Panel „Example“): hinter einem Knoten unter Mindestdruck haben Knoten wieder genug Druck", () => {
  const z = fertigGerechnet(P), low = M.zuWenigDruck(z, P);
  assert.ok(low.length >= 1, "mindestens ein pinker Knoten an der Kuppe");
  const hinten = z.erg.knoten.slice(low[0] + 1).some((k, j) => k.druck >= P.minDruck && !low.includes(low[0] + 1 + j));
  assert.ok(hinten, "dahinter wieder genug Druck – wie EPANET es rechnet");
});

test("Erweiterung „iterativ“: ab negativem Druck kommt nichts mehr an, Verbraucher unter Mindestdruck entnehmen nichts", () => {
  const p = mit({ iterativ: true, tankHoehe: 3 }), z = fertigGerechnet(p);
  assert.ok(z.durchgang >= 2); assert.ok(z.bis < 10);
  for (let i = z.bis + 1; i <= 10; i++) assert.equal(z.versorgt[i], false);
  z.erg.knoten.forEach((k, i) => { if (i > 0 && z.versorgt[i]) assert.ok(k.druck >= p.minDruck - 1e-9); });
  // ohne Erweiterung nimmt jeder Verbraucher seinen Bedarf
  const y = fertigGerechnet(mit({ tankHoehe: 3 }));
  assert.equal(y.erg.knoten.filter((k, i) => i > 0 && k.bedarf > 0).length, 10);
});

test("aendere: nach dem Rechnen wirken Regler sofort; vorher bleibt t = 0", () => {
  const z = M.erzeuge(P, zufall(1)), p = mit({ bedarf: 50 });
  M.aendere(z, p, "bedarf"); assert.equal(z.t, 0); assert.equal(z.erg, null);
  M.rechneAlles(z, p); const t = z.t;
  const q = mit({ bedarf: 20 }); M.aendere(z, q, "bedarf");
  assert.ok(z.fertig && z.t >= t); nah(z.erg.leitungen[0].q, 200, 1e-6);
  M.setzeKurve(z, q, 2, 0.5, 0); assert.ok(z.fertig); assert.equal(z.kurve[2][1], 0);
});

test("Grenzfälle: NetworkSegments 0, Länge 0, Durchmesser 0, Bedarf 0", () => {
  const z0 = M.erzeuge(mit({ segmente: 0 }), zufall(1)); M.schritt(z0, mit({ segmente: 0 }));
  assert.equal(z0.t, 1); assert.ok(z0.fertig); assert.equal(z0.erg, null);
  for (const o of [{ laenge: 0 }, { durchmesser: 0 }, { bedarf: 0 }, { hoehe: 0, laenge: 0 }]) {
    const z = fertigGerechnet(mit(o));
    assert.ok(z.erg.knoten.every(k => Number.isFinite(k.druck)), JSON.stringify(o));
  }
});

test("Wiederholbarkeit: das Modell ist deterministisch (keine Saat nötig) – gleiche Parameter, gleiche Ergebnisse", () => {
  const a = fertigGerechnet(P), b = M.erzeuge(P, zufall(99)); M.rechneAlles(b, P);
  assert.deepEqual(a.erg, b.erg);
  const c = fertigGerechnet(mit({ rauheit: 160, durchmesser: 0.2 }));
  assert.notDeepEqual(a.erg.knoten.map(k => k.druck), c.erg.knoten.map(k => k.druck));
});
