// Tests des Modells (node --test im App-Ordner) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../../simulationen/_gemeinsam/zufall.js");

test("erzeuge liefert t = 0", () => {
  assert.equal(M.erzeuge({}, zufall(1)).t, 0);
});

// TODO: je Verfahrensschritt mindestens ein Test mit nachgerechnetem Ergebnis, Grenzfälle, Wiederholbarkeit,
// ein erwartetes Verhalten aus der Beschreibung des Katalogeintrags.
