// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");
const P = M.STANDARD;
const mit = q => Object.assign({}, P, q);
const lauf = (q, n, saat = 1) => { const p = mit(q), z = M.erzeuge(p, zufall(saat)); for (let i = 0; i < n; i++) M.schritt(z, p); return z; };

/** Der Index-Mechanismus des Originals (Sub create, loser(), f, u, max) wörtlich nachgerechnet:
    liefert je Würfel den Basisast (Index) und den durchlauf, mit dem er gesetzt wurde. */
function originalIndizes(astZahl, mengeWuerfel) {
  const w = [{ eltern: -1, d: 0, etage: null }];
  let f = 1, u = 0, max = 1, durchlauf = 0, etage = 0, i = 0;
  if (f === mengeWuerfel) return w;
  for (;;) {                                                     // create(i)
    for (let m = 0; m < astZahl; m++) {
      w.push({ eltern: i, d: durchlauf, etage });                // setzeQuad mitte → loser(f), f = f + 1
      if (++f === mengeWuerfel) return w;                        // If f = mengeWuerfel Then End
    }
    if (u >= max - 1) { u = 0; etage += 22; durchlauf++; } else u++;
    max = astZahl ** durchlauf;
    i = f - ((u * astZahl - u) + max);                           // create (f - ((u * astZahl - u) + max))
  }
}

test("VBA-Round rundet .5 zur geraden Zahl", () => {
  assert.deepEqual([1.5, 2.5, 3.5, 4.5, 1.49, 4.51, -0.5].map(M.vbaRound), [2, 2, 4, 4, 1, 5, 0]);
});

test("Richtungsfaktor Round(Rnd · 4 + 1) liegt in 1 … 5, jede der vier Richtungen hat Anteil 1/4", () => {
  assert.equal(M.richtungsFaktor(0), 1);
  assert.equal(M.richtungsFaktor(0.1249), 1);
  assert.equal(M.richtungsFaktor(0.125), 2);      // 1,5 → 2
  assert.equal(M.richtungsFaktor(0.375), 2);      // 2,5 → 2
  assert.equal(M.richtungsFaktor(0.5), 3);
  assert.equal(M.richtungsFaktor(0.625), 4);      // 3,5 → 4
  assert.equal(M.richtungsFaktor(0.875), 4);      // 4,5 → 4
  assert.equal(M.richtungsFaktor(0.9999), 5);
  // Anteile über ein feines Gitter von Rnd: k = 1 und 5 (beide +y) zusammen 1/4, k = 2, 3, 4 je 1/4
  const n = 80000, c = [0, 0, 0, 0];
  for (let j = 0; j < n; j++) c[M.richtungsFaktor((j + 0.5) / n) % 4]++;
  for (const v of c) assert.ok(Math.abs(v / n - 0.25) < 1e-3, String(c));
});

test("Versatz: gerundete Koordinaten in den vier Hauptrichtungen", () => {
  assert.deepEqual(M.versatz(1, 22), [0, 22]);
  assert.deepEqual(M.versatz(2, 33), [-33, 0]);
  assert.deepEqual(M.versatz(3, 44), [0, -44]);
  assert.deepEqual(M.versatz(4, 22), [22, 0]);
  assert.deepEqual(M.versatz(5, 22), [0, 22]);
  assert.deepEqual([0, 1, 2].map(m => M.abstand("geschosse", m)), [22, 33, 44]);
  assert.equal(M.abstand("staffel", 2), 11);
});

test("Würfelzahl nach n Schritten = n + 1 (Samen zählt mit), z.t = n", () => {
  for (const n of [0, 1, 2, 3, 10, 57]) {
    const z = lauf({}, n);
    assert.equal(z.wuerfel.length, n + 1);
    assert.equal(z.t, n);
  }
});

test("Index-Mechanismus des Originals = Breitensuche (Basisast und durchlauf je Würfel)", () => {
  for (const ast of [1, 2, 3, 4, 5]) {
    const menge = 200, o = originalIndizes(ast, menge), z = lauf({ astZahl: ast, mengeWuerfel: menge }, 1000);
    assert.equal(z.wuerfel.length, menge);
    assert.deepEqual(z.wuerfel.map(w => [w.eltern, w.d]), o.map(w => [w.eltern, w.d]), "astZahl " + ast);
    for (let k = 1; k < menge; k++) assert.equal(z.wuerfel[k].z, o[k].etage - 5);   // Mitte = etage − elevation/2
  }
});

test("Geschossregel: durchlauf d liegt auf etage 22 · d, Samen darunter; Kind = durchlauf des Basisastes + 1", () => {
  const z = lauf({}, 299);
  assert.deepEqual([z.wuerfel[0].x, z.wuerfel[0].y, z.wuerfel[0].z], [0, 0, -15]);
  for (let k = 1; k < z.wuerfel.length; k++) {
    const w = z.wuerfel[k], e = z.wuerfel[w.eltern];
    assert.equal(w.z, 22 * w.d - 5);
    assert.equal(w.d, e.g);
    assert.equal(w.g, e.g + 1);
  }
  // Voreinstellung 300 / 3: Stufen 0 … 4 mit 1 + 3, 9, 27, 81 und dem Rest 179 Würfeln (Farben Rot, Gelb, Grün, Cyan, Blau)
  const c = [0, 0, 0, 0, 0];
  for (const w of z.wuerfel) c[w.d]++;
  assert.deepEqual(c, [4, 9, 27, 81, 179]);
  assert.equal(M.hoechsterDurchlauf(z), 4);
  assert.equal(M.geschosse(z), 6);
  assert.deepEqual([0, 1, 4, 254, 255].map(M.farbNummer), [1, 2, 5, 255, 1]);
});

test("Abstände und Winkel: m-ter Ast im Abstand (m + 2) · 11 in einer der vier Richtungen", () => {
  const z = lauf({ astZahl: 3 }, 299), kinder = new Map();
  for (let k = 1; k < z.wuerfel.length; k++) {
    const w = z.wuerfel[k], e = z.wuerfel[w.eltern];
    const m = (kinder.get(w.eltern) || 0); kinder.set(w.eltern, m + 1);
    const dx = w.x - e.x, dy = w.y - e.y;
    assert.ok(dx === 0 || dy === 0, `nur Hauptrichtungen (${dx}, ${dy})`);
    assert.equal(Math.abs(dx) + Math.abs(dy), (m + 2) * 11);
    assert.ok(Number.isInteger(w.x) && Number.isInteger(w.y));
  }
  for (const [e, n] of kinder) assert.ok(n <= 3, "höchstens astZahl Äste je Würfel");
});

test("Elternbezug jeder Linie: vom Schwerpunkt des Basisastes zur Oberseite des neuen Würfels", () => {
  const z = lauf({}, 150);
  assert.equal(z.linien.length, z.wuerfel.length - 1);
  z.linien.forEach((l, j) => {
    const e = z.wuerfel[l.eltern], k = z.wuerfel[l.kind];
    assert.equal(l.kind, j + 1);
    assert.equal(k.eltern, l.eltern);
    assert.ok(l.eltern < l.kind);
    assert.deepEqual(l.a, [e.x, e.y, e.z]);
    assert.deepEqual(l.b, [k.x, k.y, 22 * k.d]);
    assert.equal(l.d, k.d);
  });
});

test("Abbruch bei mengeWuerfel; mehr Schritte ändern nichts; höhere mengeWuerfel wächst weiter", () => {
  const p = mit({ mengeWuerfel: 300 }), z = M.erzeuge(p, zufall(5));
  for (let i = 0; i < 1000; i++) M.schritt(z, p);
  assert.equal(z.wuerfel.length, 300);
  assert.equal(z.t, 299);
  assert.ok(M.fertig(z, p));
  p.mengeWuerfel = 320;
  assert.ok(!M.fertig(z, p));
  for (let i = 0; i < 100; i++) M.schritt(z, p);
  assert.equal(z.wuerfel.length, 320);
  const eins = lauf({ mengeWuerfel: 1 }, 10);
  assert.equal(eins.wuerfel.length, 1);
  assert.equal(eins.t, 0);
});

test("gleiche Saat → gleiche Struktur; andere Saat → andere", () => {
  const bild = s => JSON.stringify(lauf({}, 299, s).wuerfel);
  assert.equal(bild(7), bild(7));
  assert.notEqual(bild(7), bild(8));
});

test("Fassung 02 (Ebene): Würfel 6 in einer Ebene, Abstand 11, keine Doppelbelegung", () => {
  const z = lauf({ variante: "ebene", astZahl: 2 }, 299, 3);
  assert.equal(z.kante, 6);
  const pos = new Set();
  for (let k = 0; k < z.wuerfel.length; k++) {
    const w = z.wuerfel[k];
    assert.equal(w.z, 40);
    const s = w.x + "," + w.y; assert.ok(!pos.has(s), "doppelt: " + s); pos.add(s);
    if (k) { const e = z.wuerfel[w.eltern]; assert.equal(Math.abs(w.x - e.x) + Math.abs(w.y - e.y), 11); }
  }
  assert.equal(z.linien.length, z.wuerfel.length - 1);
  assert.ok(z.verworfen > 0);
});

test("Fassung 03 (Höhenstaffelung): höchstens 4 Geschosse, nichts schwebt, keine Linien", () => {
  const z = lauf({ variante: "staffel", astZahl: 2 }, 299, 2), pos = new Set(z.wuerfel.map(w => [w.x, w.y, w.z].join(",")));
  assert.equal(pos.size, z.wuerfel.length);
  assert.equal(z.linien.length, 0);
  for (const w of z.wuerfel) {
    assert.ok([0, 11, 22, 33].includes(w.z), "Höhe " + w.z);
    if (w.z > 0) assert.ok(pos.has([w.x, w.y, w.z - 11].join(",")), "schwebt: " + [w.x, w.y, w.z]);
  }
  assert.ok(M.geschosse(z) >= 2);
});

test("abgestorbene Struktur (Warteschlange leer) hält an", () => {
  let z = null;
  for (let s = 1; s < 50 && !(z && z.fertig); s++) z = lauf({ variante: "ebene", astZahl: 1 }, 400, s);
  assert.ok(z.fertig);
  const t = z.t, n = z.wuerfel.length;
  M.schritt(z, P);
  assert.equal(z.t, t);
  assert.equal(z.wuerfel.length, n);
  assert.ok(M.fertig(z, P));
});
