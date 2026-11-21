// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");
const P = M.STANDARD;
const mit = q => Object.assign({}, P, q);
const leer = (p = P) => { const z = M.erzeuge(mit({ anzahlRot: 0, aufbau: "hand" }), zufall(1)); return z; };

test("Aufbau: 50 Rote zu Beginn, Blau nach 150, Gelb nach 300 Schritten", () => {
  const z = M.erzeuge({}, zufall(1));
  assert.deepEqual(M.zaehle(z).n, [50, 0, 0]);
  assert.ok(z.ag.every(a => a.x >= 0 && a.x < 760 && a.y >= 0 && a.y < 450 && [-1, 0, 1].includes(a.vx)));
  for (let i = 0; i < 151; i++) M.schritt(z, P);
  assert.deepEqual(M.zaehle(z).n, [50, 90, 0]);
  for (let i = 0; i < 150; i++) M.schritt(z, P);
  assert.deepEqual(M.zaehle(z).n, [50, 90, 90]);
});

test("Nachbarn: Radius nach Rang, nächster und nächster gleichfarbiger Nachbar", () => {
  const z = leer();
  M.neuerAgent(z, 100, 100, 1); M.neuerAgent(z, 120, 100, 0); M.neuerAgent(z, 100, 140, 1); M.neuerAgent(z, 300, 300, 2);
  const n = M.nachbarn(z, P, 0);                     // blauer Agent, Anlagerungsdistanz 30
  assert.deepEqual(n.liste, [1]);
  assert.equal(n.naechster, 1); assert.equal(n.dNaechster, 20);
  assert.equal(n.gleich, 2); assert.equal(n.dGleich, 40);
});

test("Rot an Rot: anhalten und verbinden", () => {
  const z = leer();
  M.neuerAgent(z, 100, 100, 0); M.neuerAgent(z, 170, 100, 0);   // Abstand 70: im Radius 75, nicht unter 75 − 10
  z.ag[0].vx = 1; z.ag[0].vy = 1;
  M.anlagern(z, P, 0, M.nachbarn(z, P, 0));
  assert.equal(z.ag[0].vx, 0); assert.equal(z.ag[0].vy, 0);
  assert.equal(z.ag[0].connect, 2); assert.equal(z.ag[1].connect, 2);
  assert.deepEqual(z.ag[0].bindSelf, [1]);
});

test("zu nahe gleichfarbige Nachbarn stoßen sich ab (Repel)", () => {
  const z = leer();
  M.neuerAgent(z, 100, 100, 0); M.neuerAgent(z, 140, 100, 0);   // 40 < 75 − 10
  M.anlagern(z, P, 0, M.nachbarn(z, P, 0));
  assert.ok(z.ag[0].vx <= -1);                                   // −40/20 + {−1, 0, 1} → nach links
});

test("Blau lagert an Rot an, solange Bindungen frei sind", () => {
  const z = leer();
  M.neuerAgent(z, 200, 200, 0);
  for (let i = 0; i < 8; i++) M.neuerAgent(z, 200 + 20 * Math.cos(i), 200 + 20 * Math.sin(i), 1);
  z.ag[0].vx = 0; z.ag[0].vy = 0;
  const p = mit({ repelBlau: 29 });                              // keine Abstoßung unter Blauen
  for (let i = 1; i <= 8; i++) M.anlagern(z, p, i, M.nachbarn(z, p, i));
  assert.equal(z.ag[0].bindSet, 6);                              // Bindungen Rot: 6
  assert.equal(z.ag.filter(a => a.rang === 1 && a.connect === 1).length, 6);
  assert.ok(z.ag.filter(a => a.connect === 1).every(a => a.vx === 0 && a.vy === 0));   // übernimmt die Bewegung des Roten
});

test("Gelb lagert nicht an Rot an (nur an den nächsthöheren Rang)", () => {
  const z = leer();
  M.neuerAgent(z, 200, 200, 0); M.neuerAgent(z, 205, 200, 2);
  M.anlagern(z, P, 1, M.nachbarn(z, P, 1));
  assert.equal(z.ag[1].connect, 0);
  assert.deepEqual(z.ag[1].bindOther, []);
});

test("Geschwindigkeit bleibt begrenzt", () => {
  const z = M.erzeuge(mit({ aufbau: "alle" }), zufall(2));
  for (let i = 0; i < 300; i++) M.schritt(z, P);
  assert.ok(z.ag.every(a => Math.abs(a.vx) <= M.VMAX && Math.abs(a.vy) <= M.VMAX));
  assert.ok(z.ag.every(a => a.x >= 0 && a.x < M.BREITE && a.y >= 0 && a.y < M.HOEHE));
});

test("Rote ordnen sich in Abständen zwischen Distanz − Abstoßdistanz und Distanz an (Christaller-Gitter)", () => {
  const z = M.erzeuge(mit({ aufbau: "hand" }), zufall(1));
  const vor = M.rotAbstand(z);
  for (let i = 0; i < 300; i++) M.schritt(z, P);
  const nach = M.rotAbstand(z);
  assert.ok(vor < 50 && nach > 60 && nach < 75, `${vor} → ${nach}`);
});

test("hierarchische Anlagerung: fast alle Blauen an Rot, fast alle Gelben an Blau, dann Ruhe", () => {
  const z = M.erzeuge({}, zufall(1));
  for (let i = 0; i < 1200 && !(z.t > 300 && z.bewegt === 0); i++) M.schritt(z, P);
  const c = M.zaehle(z);
  assert.ok(c.an[1] >= 85 && c.an[2] >= 80, JSON.stringify(c));
  assert.equal(z.bewegt, 0);
});

test("neue Anlagerungsdistanz stößt alle Agenten an (wie im Original)", () => {
  const z = M.erzeuge({}, zufall(3));
  for (let i = 0; i < 120; i++) M.schritt(z, P);
  M.aendere(z, mit({ distRot: 60 }), "distRot");
  assert.ok(z.ag.some(a => a.vx !== 0 || a.vy !== 0));
});

test("Zellen markieren: −55 je Blau, +50 je Gelb in der Moore-Nachbarschaft", () => {
  const z = leer();
  M.neuerAgent(z, 105, 105, 1); M.neuerAgent(z, 115, 105, 2); M.neuerAgent(z, 125, 105, 2);
  M.zellenMarkieren(z);
  assert.equal(z.zellen[10 * M.SPALTEN + 11], -55 + 50 + 50);
  assert.equal(z.zellen[10 * M.SPALTEN + 9], -55);
});

test("gleiche Saat, gleicher Lauf; andere Saat, anderer Lauf", () => {
  const lauf = s => { const z = M.erzeuge({}, zufall(s)); for (let i = 0; i < 200; i++) M.schritt(z, P); return z.ag.map(a => a.x + "," + a.y).join(";"); };
  assert.equal(lauf(7), lauf(7));
  assert.notEqual(lauf(7), lauf(8));
});
