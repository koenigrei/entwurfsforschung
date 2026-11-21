// Tests der Modellregeln (node --test) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../_gemeinsam/zufall.js");

test("erzeuge liefert t = 0", () => {
  assert.equal(M.erzeuge({}, zufall(1)).t, 0);
});

test("gleiche Saat, gleicher Lauf; andere Saat, anderer Lauf", () => {
  const lauf = s => { const z = M.erzeuge({}, zufall(s)); for (let i = 0; i < 100; i++) M.schritt(z, M.STANDARD); return Array.from(z.feld).join(""); };
  assert.equal(lauf(7), lauf(7));
  assert.notEqual(lauf(7), lauf(8));
});

// TODO: je Regel des Originals mindestens ein Test mit nachgerechnetem Ergebnis
// (z. B. Formel an einem Beispiel, Grenzfälle, ein erwartetes Muster nach n Schritten).
