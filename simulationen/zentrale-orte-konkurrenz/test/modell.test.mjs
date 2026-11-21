// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");
const P = M.STANDARD;
const mit = q => Object.assign({}, P, q);

/** Zustand mit Agenten an festen Orten: [[x, y, typ], …] */
function feld(agenten, q = {}) {
  const z = M.erzeuge(mit({ anzahl: 0, ...q }), zufall(1));
  z.n = agenten.length;
  z.x = Int16Array.from(agenten, a => a[0]); z.y = Int16Array.from(agenten, a => a[1]); z.typ = Uint8Array.from(agenten, a => a[2]);
  z.sucht = new Uint8Array(z.n).fill(1); z.anteil = new Float32Array(z.n); z.nachbarn = new Uint8Array(z.n);
  agenten.forEach((a, i) => { z.zelle[a[1] * z.spalten + a[0]] = i; });
  return z;
}

test("Voreinstellungen aus CellForm.dfm", () => {
  assert.equal(P.schwelle, 3);
  assert.equal(P.anzahl, 800);
  assert.equal(P.zentren, "zehn");
  assert.equal(M.SPALTEN * M.ZEILEN, 1600);
  assert.equal(M.prozent(3), 37.5);             // Lbl_P = Position · 12,5
});

test("Schwellenwert: anhalten nur über Position · 12,5 %", () => {
  assert.equal(M.zufrieden(M.aehnlich(3, 5), 3), false);   // genau 37,5 % reicht nicht
  assert.equal(M.zufrieden(M.aehnlich(2, 3), 3), true);    // 40 %
  assert.equal(M.zufrieden(0, 0), false);                  // ohne Nachbarn: similar = 0
});

test("Abstandsfeld: ein Zentrum in der Mitte, in Bildpunkten gemessen", () => {
  const z = M.erzeuge(mit({ zentren: "eins", anzahl: 0 }), zufall(1));
  assert.deepEqual(z.zentren, [[20, 20]]);                 // round(40/2)
  assert.equal(z.dist[20 * 40 + 20], 0);
  assert.equal(z.dist[20 * 40 + 23], 30);
  assert.equal(z.dist[21 * 40 + 21], 14);                  // round(√200)
  assert.equal(z.dist[0], 283);                            // kein Torus: Ecke weit weg
});

test("Abstandsfeld: zehn Zentren, Abstand in Zellen zum nächsten", () => {
  const z = M.erzeuge(mit({ anzahl: 0 }), zufall(5));
  assert.equal(z.zentren.length, 10);
  for (let y = 0; y < 40; y += 7) for (let x = 0; x < 40; x += 5) {
    const d = Math.min(...z.zentren.map(([cx, cy]) => M.abstand(x, y, cx, cy)));
    assert.equal(z.dist[y * 40 + x], d);
  }
  for (const [cx, cy] of z.zentren) assert.equal(z.dist[cy * 40 + cx], 0);
});

test("Moore-Nachbarschaft zählt Gleiche und Andere über den Rand", () => {
  const z = feld([[0, 0, 1], [39, 39, 1], [39, 0, 0], [1, 1, 1]]);
  assert.deepEqual(M.zaehle(z, 0, 0, 1), [2, 1]);
});

test("Näherrücken: ein angehaltener Agent zieht nur auf eine freie Zelle näher am Zentrum", () => {
  const z = feld([[30, 20, 0]], { zentren: "eins" });
  z.sucht[0] = 0;
  const d0 = z.dist[20 * 40 + 30];
  for (let i = 0; i < 20; i++) M.naehere(z, P);
  assert.ok(z.dist[z.y[0] * 40 + z.x[0]] < d0);
  // ein suchender Agent rückt nicht näher
  const s = feld([[30, 20, 0]], { zentren: "eins" });
  M.naehere(s, P);
  assert.deepEqual([s.x[0], s.y[0]], [30, 20]);
});

test("Umzug nur auf freie Zellen, höchstens weite + 1 Zellen je Achse", () => {
  const z = M.erzeuge(mit({ anzahl: 1400 }), zufall(3));
  const vx = Int16Array.from(z.x), vy = Int16Array.from(z.y);
  M.ziehe(z, P);
  const belegt = new Set();
  const d = (a, b) => Math.min(Math.abs(a - b), 40 - Math.abs(a - b));
  for (let i = 0; i < z.n; i++) {
    const c = z.y[i] * 40 + z.x[i];
    assert.ok(!belegt.has(c)); belegt.add(c);
    assert.equal(z.zelle[c], i);
    assert.ok(d(z.x[i], vx[i]) <= 11 && d(z.y[i], vy[i]) <= 11);
  }
});

test("gleiche Saat, gleicher Lauf; andere Saat, anderer Lauf", () => {
  const lauf = s => { const z = M.erzeuge(P, zufall(s)); for (let i = 0; i < 40; i++) M.schritt(z, P); return Array.from(z.x).join() + Array.from(z.y).join() + JSON.stringify(z.zentren); };
  assert.equal(lauf(7), lauf(7));
  assert.notEqual(lauf(7), lauf(8));
});

test("Voreinstellung: Segregation, Verdichtung um die Zentren, Ruhe", () => {
  for (const s of [1, 2, 3]) {
    const z = M.erzeuge(P, zufall(s));
    const g0 = M.gleicheNachbarn(z), d0 = M.mittlererAbstand(z);
    for (let i = 0; i < 600 && z.fertig == null; i++) M.schritt(z, P);
    assert.ok(z.fertig != null, `Saat ${s}: keine Ruhe`);
    assert.ok(M.gleicheNachbarn(z) > g0 + 30, `gleiche ${M.gleicheNachbarn(z)}`);
    assert.ok(M.mittlererAbstand(z) < d0 * 0.75, `Abstand ${d0} → ${M.mittlererAbstand(z)}`);
  }
});

test("ein Zentrum: die Agenten verdichten sich in einem Kreis um die Mitte", () => {
  const p = mit({ zentren: "eins" }), z = M.erzeuge(p, zufall(1));
  const d0 = M.mittlererAbstand(z);
  for (let i = 0; i < 300; i++) M.schritt(z, p);
  const innen = Array.from(z.x).filter((x, i) => Math.hypot(x - 20, z.y[i] - 20) < 12).length;
  assert.ok(M.mittlererAbstand(z) < d0 - 3);
  assert.ok(innen / (Math.PI * 144) > 0.75, `Dichte innen ${innen / (Math.PI * 144)}`);
});

test("höhere Toleranzgrenze: nur noch eine Sorte je Zentrum (Segregation nach Zentren)", () => {
  const rein = q => { const p = mit(q), z = M.erzeuge(p, zufall(1)); for (let i = 0; i < 400; i++) M.schritt(z, p); return M.reinheit(z); };
  assert.ok(rein({ schwelle: 5 }) > 0.9);
  assert.ok(rein({ schwelle: 5 }) > rein({ schwelle: 1 }));
});

test("Schwellenwert ändern wirkt sofort auf Suchen/Anhalten", () => {
  const z = M.erzeuge(P, zufall(1));
  for (let i = 0; i < 5; i++) M.schritt(z, P);
  const vorher = z.suchend;
  M.aendere(z, mit({ schwelle: 0 }), "schwelle");
  assert.ok(z.suchend < vorher);
});

test("Parameter ohne weite (wie aus dem Bedienfeld) nutzt die Voreinstellung", () => {
  const p = { schwelle: 3, anzahl: 800, zentren: "zehn", verlauf: true }, z = M.erzeuge(p, zufall(1));
  const x0 = Array.from(z.x).join();
  M.schritt(z, p);
  assert.notEqual(Array.from(z.x).join(), x0);
});
