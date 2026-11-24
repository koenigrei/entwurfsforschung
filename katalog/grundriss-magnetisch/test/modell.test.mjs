// Tests des Modells (node --test im App-Ordner) · CC BY 4.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../modell.js");
const { zufall } = require("../../../simulationen/_gemeinsam/zufall.js");
const { FREI, FLUR, AUSSEN } = M;

/** Zufall mit festen Werten (für nachgerechnete Beispiele) */
const fest = (...w) => { let i = 0; const f = () => w[i++ % w.length]; f.ganz = n => Math.floor(f() * n); return f; };
const P = (o = {}) => Object.assign({}, M.STANDARD, o);
const lauf = (o = {}, saat = 1) => { const p = P(o), z = M.erzeuge(p, zufall(saat)); let n = 0; while (!z.fertig && n++ < 1e6) M.schritt(z, p); return { z, p }; };
/** leeres Gitter aus Zeichenkette: . frei, # Flur, x außen, Ziffer = Raum */
function gitter(zeilen) {
  const H = zeilen.length, W = zeilen[0].length, g = new Int16Array(W * H);
  zeilen.forEach((s, y) => [...s].forEach((c, x) => { g[y * W + x] = c === "." ? FREI : c === "#" ? FLUR : c === "x" ? AUSSEN : Number(c); }));
  return { g, W, H };
}

test("erzeuge: t = 0, Raster nach Umriss, Startpunkt frei, Raumprogramm Haus am Horn", () => {
  const z = M.erzeuge(P(), zufall(1));
  assert.equal(z.t, 0);
  assert.equal(z.W, 21); assert.equal(z.H, 21);
  assert.equal(z.prog.N, 14); assert.equal(z.prog.kanten.length, 17); assert.equal(z.prog.flaeche, 153);
  assert.equal(z.prog.raeume[z.prog.eingang].name, "Windfang");
  assert.deepEqual(z.eingangsPunkt, [10, 20]); assert.equal(z.start, 20 * 21 + 10);
  assert.ok(z.basis.every(v => v === FREI));
});

test("Raumprogramme: Nachbarlisten symmetrisch, jedes Beispiel mit Eingangsraum", () => {
  for (const k of Object.keys(M.BEISPIELE)) {
    const pr = M.programm(k);
    assert.ok(pr.eingang >= 0, k);
    for (const [a, b] of pr.kanten) { assert.ok(pr.nachbarn[a].includes(b)); assert.ok(pr.nachbarn[b].includes(a)); assert.notEqual(a, b); }
  }
  assert.equal(M.programm("bad").flaeche, 2994);                 // Summe der RoomInstance-Flächen der .gh-Datei
});

test("grundraster: L-Form und Innenhof schneiden Zellen aus, Sperrungen werden außen", () => {
  const L = M.grundraster(10, 10, "L", []), hof = M.grundraster(10, 10, "hof", [5]);
  assert.equal(L[0 * 10 + 9], AUSSEN); assert.equal(L[9 * 10 + 9], FREI); assert.equal(L[0], FREI);
  assert.equal(L.filter(v => v === AUSSEN).length, 5 * 4);       // x ≥ 6 (round 5,5), y < 5 (round 4,5)
  assert.equal(hof[5 * 10 + 5], AUSSEN); assert.equal(hof[5], AUSSEN); assert.equal(hof[0], FREI);
});

test("abmessungen: Seitenverhältnis 1 … MaxRatio, gerundet wie im Plugin, zufällig gedreht", () => {
  // Fläche 12, ratio = 1 + 0,5·0,9 = 1,45 → √(12/1,45) = 2,877 → 3; 1,45·2,877 = 4,17 → 4; zweiter Zufall 0,7 ≥ 0,5: nicht gedreht
  assert.deepEqual(M.abmessungen(12, 1.9, fest(0.5, 0.7)), [3, 4]);
  assert.deepEqual(M.abmessungen(12, 1.9, fest(0.5, 0.2)), [4, 3]);
  assert.deepEqual(M.abmessungen(1, 1.9, fest(0, 0.9)), [1, 1]);
  assert.deepEqual(M.abmessungen(0.1, 1.9, fest(0, 0.9)), [1, 1]); // nie 0
});

test("schablone: Flur an zwei Seiten, einer Seite, ringsum; Halle immer ringsum; ohne Zusatz kleiner", () => {
  const zwei = M.schablone(3, 4, "zwei", true, false, fest(0));
  assert.equal(zwei.w, 4); assert.equal(zwei.h, 5);
  assert.ok(zwei.flur(0, 0) && zwei.flur(0, 3) && zwei.flur(2, 0) && !zwei.flur(1, 1) && !zwei.flur(3, 4));
  const ein = M.schablone(3, 4, "ein", true, false, fest(0.2));
  assert.equal(ein.w, 4); assert.equal(ein.h, 4); assert.ok(ein.flur(0, 2) && !ein.flur(1, 0));
  const ein2 = M.schablone(3, 4, "ein", true, false, fest(0.8));
  assert.equal(ein2.w, 3); assert.equal(ein2.h, 5); assert.ok(ein2.flur(2, 0) && !ein2.flur(0, 1));
  const alle = M.schablone(3, 4, "alle", true, false, fest(0));
  assert.equal(alle.w, 5); assert.equal(alle.h, 6); assert.ok(alle.flur(4, 5) && alle.flur(0, 2) && !alle.flur(1, 1));
  const halle = M.schablone(3, 4, "zwei", true, true, fest(0));
  assert.equal(halle.w, 5); assert.equal(halle.h, 6);
  const ohne = M.schablone(3, 4, "zwei", false, false, fest(0));
  assert.equal(ohne.w, 3); assert.equal(ohne.h, 4);                  // Flur von der Fläche abgezogen
  // Raumzellen der Voreinstellung = Fläche: 3 · 4 = 12
  let n = 0; for (let j = 0; j < zwei.h; j++) for (let i = 0; i < zwei.w; i++) if (!zwei.flur(i, j)) n++;
  assert.equal(n, 12);
});

test("flurAbstand: Wege nur über Flurzellen, diagonal √2, begrenzt auf MaxAdjDistance", () => {
  const { g, W, H } = gitter([
    "11##..",
    "11.#..",
    "......"]);
  const d = M.flurAbstand(g, W, H, 1, [0, 0, 2, 2], 3);
  const nah = (a, b) => Math.abs(a - b) < 1e-9;
  assert.equal(d.get(2), 1);                                         // Flurzelle (2,0) direkt neben dem Raum
  assert.equal(d.get(3), 2);                                         // Flurzelle (3,0)
  assert.equal(d.get(4), 3);                                         // freie Zelle (4,0) hinter zwei Flurzellen
  assert.ok(nah(d.get(1 * 6 + 3), 1 + Math.SQRT2));                  // Flur (3,1) diagonal von (2,0)
  assert.equal(d.get(1 * 6 + 2), 1);                                 // freie Nachbarzelle (2,1)
  assert.ok(nah(d.get(2 * 6 + 2), Math.SQRT2));                      // (2,2) diagonal vom Raum
  assert.ok(!d.has(2 * 6 + 3));                                      // (3,2): über die freie Zelle (2,1) ginge es mit 2,41 – kein Weg über freie Zellen
  assert.ok(!d.has(1 * 6 + 4) && !d.has(5));                         // weiter als 3
  const kurz = M.flurAbstand(g, W, H, 1, [0, 0, 2, 2], 1);
  assert.ok(kurz.has(2) && !kurz.has(3));                            // Abstand 2 > 1
});

test("andockzellen: nur freie Zellen seitlich am Flur, die alle Nachbarbedingungen erfüllen", () => {
  const { g, W, H } = gitter([
    "......",
    "..#...",
    "......"]);
  assert.deepEqual(M.andockzellen(g, W, H, [], 3).sort((a, b) => a - b), [2, 7, 9, 14]);
  const nah = new Map([[7, 1], [9, 4]]);                             // Abstandsfeld eines Nachbarn
  assert.deepEqual(M.andockzellen(g, W, H, [nah], 3), [7]);
});

test("bewerteLage: belegte Zellen auf den Linien neben dem Kasten, vom Andockpunkt bis zum Rand", () => {
  const { g, W, H } = gitter([
    "......",
    ".#2...",
    "......",
    "......",
    "...3.."]);
  const T = M.tabellen(g, W, H), s = { w: 2, h: 2, flur: () => false };
  // Kasten bei (2,2)–(3,3), wächst nach rechts unten: Zeile 1 von x=2 bis Rand → „2“ (1 Zelle); Zeile 4 von x=2 → „3“; Spalte 1 ab y=2 → 0; Spalte 4 → 0
  assert.equal(M.bewerteLage(T, 2, 2, 1, 1, s), 2);
  // gleicher Andockpunkt, wächst nach links unten: Kasten (1,2)–(2,3); Zeile 1 von x=0 bis 2 → „#“ und „2“; Spalte 3 ab y=2 → „3“
  assert.equal(M.bewerteLage(T, 2, 2, -1, 1, s), 3);
  assert.deepEqual(M.kastenVon(2, 2, -1, -1, s), [1, 1, 2, 2]);
});

test("platziere: Eingangsraum dockt am Startpunkt an, Ecke ist Flur, alle Zellen waren frei", () => {
  const p = P(), z = M.erzeuge(p, zufall(3)), L = M.leereLoesung(z, "neu", 0), r = z.prog.eingang;
  assert.ok(M.platziere(L, z.W, z.H, z.prog, r, p, z.zufall));
  const [x0, y0, w, h] = L.kasten[r];
  assert.ok(x0 >= 0 && y0 >= 0 && x0 + w <= z.W && y0 + h <= z.H);
  assert.equal(L.gitter[L.anker[r]], FLUR);
  const ax = L.anker[r] % z.W, ay = Math.floor(L.anker[r] / z.W);
  assert.equal(Math.abs(ax - 10) + Math.abs(ay - 20), 1);            // Anker grenzt seitlich an den Startpunkt (10, 20)
  let raum = 0, flur = 0;
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const v = L.gitter[y * z.W + x]; if (v === r + 1) raum++; else if (v === FLUR) flur++; }
  assert.equal(raum + flur, w * h); assert.equal(raum, 1);            // Windfang 1 m²
});

test("platziere: geforderter Nachbar höchstens MaxAdjDistance entfernt, sonst kein Platz", () => {
  // Raum 1 links oben, Flur nur bis x = 3; ein Raum mit Nachbar 1 darf nicht weit rechts andocken
  const prog = { raeume: [{ name: "A", flaeche: 4 }, { name: "B", flaeche: 1 }], nachbarn: [[1], [0]], kanten: [[0, 1]], N: 2, eingang: -1 };
  const { g, W, H } = gitter([
    "11########..",
    "11..........",
    "............"]);
  const L = { gitter: g, kasten: [[0, 0, 2, 2], null], anker: [0, -1], folge: [0] };
  assert.ok(M.platziere(L, W, H, prog, 1, P({ maxAdj: 2 }), fest(0.3)));
  const ax = L.anker[1] % W;
  assert.ok(ax <= 3, "Anker nah am Nachbarn: " + ax);
  const L2 = { gitter: gitter(["11..######..", "11..........", "............"]).g, kasten: [[0, 0, 2, 2], null], anker: [0, -1], folge: [0] };
  assert.equal(M.platziere(L2, W, H, prog, 1, P({ maxAdj: 2 }), fest(0.3)), false); // Flur nicht am Nachbarn: unmöglich
});

test("naechsterRaum: Eingang zuerst, dann der mit den meisten Verbindungen zu platzierten", () => {
  const pr = M.programm("horn"), L = { kasten: pr.raeume.map(() => null), folge: [] };
  assert.equal(M.naechsterRaum(pr, L, fest(0.5)), 12);              // Windfang
  L.kasten[12] = [0, 0, 1, 1]; L.folge.push(12);
  assert.equal(M.naechsterRaum(pr, L, fest(0.5)), 9);               // einziger Nachbar des Windfangs: Flur (Halle)
  L.kasten[9] = [0, 0, 1, 1]; L.folge.push(9);
  // Nachbarn von Flur 9: Wohnzimmer 6, Küche 8, WC 10, Fremdenz. 11, Treppe 13 – je eine Verbindung; Rauschen 0,1·Zufall entscheidet
  // bei gleichem Rauschen (fester Zufall) gewinnt der erste: Wohnzimmer 6
  assert.equal(M.naechsterRaum(pr, L, fest(0.5)), 6);
  L.kasten[6] = [0, 0, 1, 1]; L.folge.push(6);
  L.kasten[8] = [0, 0, 1, 1]; L.folge.push(8);
  // Esszimmer 7 hängt an Wohnzimmer 6 und Küche 8 (2 Verbindungen), alle anderen offenen an höchstens einer
  assert.equal(M.naechsterRaum(pr, L, fest(0.5)), 7);
  // ohne Verbindung zu Platzierten: der insgesamt am stärksten vernetzte (Flur 9 mit 6 Verbindungen, Wohnzimmer hat 5)
  const leer = { kasten: pr.raeume.map(() => null), folge: [0] };
  assert.equal(M.naechsterRaum(Object.assign({}, pr, { eingang: -1 }), leer, fest(0.5)), 9);
});

test("entferneLetzte: nimmt die letzten Räume samt Flur heraus, einer bleibt", () => {
  const { z, p } = lauf({ iterationen: 1 });
  const L = z.best[0], n = L.folge.length, k = M.entferneLetzte(L, z.W, 3);
  assert.equal(k, Math.min(3, n - 1)); assert.equal(L.folge.length, n - k);
  const weg = z.prog.raeume.map((_, r) => r).filter(r => !L.folge.includes(r));
  for (const r of weg) { assert.equal(L.kasten[r], null); assert.ok(!L.gitter.includes(r + 1)); }
  const L1 = { gitter: new Int16Array(4), kasten: [[0, 0, 1, 1]], anker: [0], folge: [0] };
  assert.equal(M.entferneLetzte(L1, 2, 5), 0);
});

test("wert und besser: Zahl oder Fläche zuerst, die andere Größe bei Gleichstand", () => {
  const pr = M.programm("horn"), L = { folge: [0, 6] };
  assert.deepEqual(M.wert(L, pr, "anzahl"), [2, 80]);
  assert.deepEqual(M.wert(L, pr, "flaeche"), [80, 2]);
  assert.ok(M.besser([3, 10], [2, 99])); assert.ok(M.besser([2, 11], [2, 10])); assert.ok(!M.besser([2, 10], [2, 10]));
});

test("fehlendeNachbarn: zählt geforderte Nachbarn, die nicht platziert sind", () => {
  const pr = M.programm("horn"), kasten = pr.raeume.map(() => null);
  kasten[9] = [0, 0, 1, 1]; kasten[12] = [0, 0, 1, 1];
  const f = M.fehlendeNachbarn({ kasten }, pr);
  assert.equal(f[12], 0); assert.equal(f[9], 5);                     // Flur 9 hat 6 Nachbarn, Windfang platziert
});

test("entferneSackgassen: totes Flurende wird dem Raum zugeschlagen, der es mitgebracht hat – außer ein Raum verlöre den Zugang", () => {
  const prog = { raeume: [{ name: "A", flaeche: 4 }, { name: "B", flaeche: 1 }], N: 2 };
  // Raum 1 mit Flurstreifen in Zeile 2; Raum 2 (1 m², ohne eigenen Flur) erreicht den Flur nur über (0,2)
  const { g, W, H } = gitter([
    "11..",
    "11..",
    "##..",
    "2..."]);
  const L = { gitter: g, kasten: [[0, 0, 2, 3], [0, 3, 1, 1]], folge: [0, 1] };
  const n = M.entferneSackgassen(L, W, H, prog);
  assert.equal(n[2 * W + 1], 1);                                     // (1,2): Sackgasse → Raum 1
  assert.equal(n[2 * W + 0], FLUR);                                  // (0,2): bliebe sonst Raum 2 ohne Zugang
  assert.ok(M.hatZugang(n, W, H, L.kasten[0], 1, prog) && M.hatZugang(n, W, H, L.kasten[1], 2, prog));
  const zwei = gitter(["11.22", "11.22", "#####"]);
  const L2 = { gitter: zwei.g, kasten: [[0, 0, 2, 3], [3, 0, 2, 3]], folge: [0, 1] };
  // beide Streifen schrumpfen bis zur gemeinsamen Zelle (2,2), die keinem Raum gehört
  assert.deepEqual([...M.entferneSackgassen(L2, 5, 3, prog).slice(10)], [1, 1, FLUR, 2, 2]);
  assert.deepEqual([...M.alleFlureZuRaeumen(L, W, H).slice(2 * W, 3 * W)], [1, 1, FREI, FREI]);
});

test("Lauf: jeder Raum am Flursystem, Netz zusammenhängend, nichts auf gesperrten oder äußeren Zellen", () => {
  for (const [o, saat] of [[{}, 1], [{ beispiel: "savoye", breite: 26, tiefe: 24, flurmodus: "alle" }, 2], [{ form: "L", flurmodus: "ein" }, 3]]) {
    const { z, p } = lauf(Object.assign({ iterationen: 30 }, o), saat);
    for (const L of z.best) {
      for (let i = 0; i < L.gitter.length; i++) if (z.basis[i] === AUSSEN) assert.equal(L.gitter[i], AUSSEN);
      const roh = M.erschliessung(L.gitter, z.W, z.H, L, z.prog);
      assert.ok(roh.zusammenhaengend, JSON.stringify(o)); assert.equal(roh.ohneZugang.length, 0);
    }
    for (const modus of ["sackgassen", "alleFlure", "keine"]) {
      const g = M.nachbearbeite(z.best[0], z.W, z.H, z.prog, modus), e = M.erschliessung(g, z.W, z.H, z.best[0], z.prog);
      if (modus !== "alleFlure") { assert.ok(e.zusammenhaengend, modus); assert.equal(e.ohneZugang.length, 0, modus); }
    }
  }
});

test("Sperren mit der Maus: gesperrte Zellen bleiben leer, Eingangspunkt verlegbar", () => {
  const p = P({ iterationen: 20 }), z = M.erzeuge(p, zufall(1));
  M.malen(z, p, 5.5, 5.5, "unten"); M.malen(z, p, 6.5, 5.5, "ziehen"); M.malen(z, p, 7.5, 5.5, "ziehen");
  assert.equal(p.sperre.zellen.length, 3); assert.equal(z.t, 0);
  M.malen(z, p, 6.5, 5.5, "unten");                                  // auf gesperrter Zelle beginnen: freigeben
  assert.equal(p.sperre.zellen.length, 2);
  M.setzeEingang(z, p, 0.2, 8.7);
  assert.deepEqual(z.eingangsPunkt, [0, 8]);
  while (!z.fertig) M.schritt(z, p);
  for (const i of p.sperre.zellen) for (const L of z.best) assert.equal(L.gitter[i], AUSSEN);
  const z2 = M.erzeuge(p, zufall(1));                                 // Zurücksetzen behält Sperrungen
  assert.equal(z2.basis[5 * 21 + 5], AUSSEN); assert.equal(z2.basis[5 * 21 + 6], FREI);
  M.sperrenLoeschen(z2, p); assert.equal(z2.basis[5 * 21 + 5], FREI);
  const anders = M.erzeuge(P({ breite: 22, sperre: p.sperre }), zufall(1)); // anderer Umriss: Sperrungen gelten nicht
  assert.ok(anders.basis.every(v => v === FREI));
});

test("Schritt: ein Raum je Schritt bzw. eine Iteration je Schritt; Ende nach den Iterationen", () => {
  const p = P({ iterationen: 4 }), z = M.erzeuge(p, zufall(5));
  M.schritt(z, p);
  assert.equal(z.t, 1); assert.equal((z.lauf || z.letzte).folge.length, 1);   // Eingangsraum
  M.schritt(z, p);
  assert.ok((z.lauf || z.letzte).folge.length >= 1);
  const q = P({ iterationen: 4, ablauf: "iteration" }), y = M.erzeuge(q, zufall(5));
  for (let i = 0; i < 4; i++) { M.schritt(y, q); assert.equal(y.it, i + 1); }
  assert.ok(y.fertig); assert.equal(y.bewertet, 20); assert.equal(y.t, 4);
  M.schritt(y, q); assert.equal(y.bewertet, 20);                          // fertig: nichts mehr
  M.aendere(y, Object.assign(q, { iterationen: 6 }), "iterationen"); assert.ok(!y.fertig);
});

test("quasi-evolutionär: jede dritte Iteration Verbesserungen, Bestenliste fünf, Bestwert fällt nie", () => {
  const { z } = lauf({ iterationen: 60 }, 4);
  assert.equal(z.best.length, M.KAPAZITAET);
  assert.equal(z.bewertet, 60 * 5);
  for (let i = 1; i < z.verlauf.length; i++) assert.ok(z.verlauf[i] >= z.verlauf[i - 1]);
  assert.ok(z.verbessert > 0);
  for (let i = 1; i < z.best.length; i++) assert.ok(!M.besser(z.best[i].wert, z.best[i - 1].wert));
});

test("Katalogverhalten: im Haus am Horn (21 × 21 m) passen nach 250 Iterationen in der Regel alle 14 Räume, im Hallenbad alle bis auf höchstens zwei", () => {
  const horn = lauf({}, 1).z, bad = lauf({ beispiel: "bad", breite: 78, tiefe: 66, iterationen: 60 }, 1).z;
  assert.equal(horn.best[0].folge.length, 14);
  let voll = 0;                                                       // Saaten 1–10: gemessen 9 von 10 (Saat 10: Fremdenzimmer fehlt)
  for (let s = 1; s <= 10; s++) if (lauf({}, s).z.best[0].folge.length === 14) voll++;
  assert.ok(voll >= 8, "alle 14 Räume in " + voll + " von 10 Läufen");
  let alt = 0;                                                        // alter Umriss 17 × 17 m: Kinder 50 m² passt nie
  for (let s = 1; s <= 3; s++) if (lauf({ breite: 17, tiefe: 17 }, s).z.best[0].folge.length === 14) alt++;
  assert.equal(alt, 0);
  assert.ok(horn.verlauf[horn.verlauf.length - 1] >= horn.verlauf[0]);
  assert.ok(bad.best[0].folge.length >= 19, String(bad.best[0].folge.length));
  const kleiner = lauf({ breite: 13, tiefe: 13, iterationen: 60 }, 1).z;   // zu kleiner Umriss: weniger Räume
  assert.ok(kleiner.best[0].folge.length < horn.best[0].folge.length);
});

test("Wiederholbarkeit: gleiche Saat → gleicher Grundriss, andere Saat → anderer", () => {
  const a = lauf({ iterationen: 20 }, 7).z, b = lauf({ iterationen: 20 }, 7).z, c = lauf({ iterationen: 20 }, 8).z;
  assert.deepEqual([...a.best[0].gitter], [...b.best[0].gitter]);
  assert.notDeepEqual([...a.best[0].gitter], [...c.best[0].gitter]);
});

test("graphLage: feste Lage im Einheitsquadrat, verbundene Räume näher als unverbundene im Mittel", () => {
  const l = M.graphLage("bad"), pr = M.programm("bad");
  assert.equal(l.length, 21);
  assert.ok(l.every(([x, y]) => x >= 0 && x <= 1 && y >= 0 && y <= 1));
  assert.deepEqual(M.graphLage("bad"), l);
  const d = (a, b) => Math.hypot(l[a][0] - l[b][0], l[a][1] - l[b][1]);
  const kanten = pr.kanten.map(([a, b]) => d(a, b)), alle = [];
  for (let i = 0; i < 21; i++) for (let j = i + 1; j < 21; j++) alle.push(d(i, j));
  const mittel = v => v.reduce((s, x) => s + x, 0) / v.length;
  assert.ok(mittel(kanten) < mittel(alle) * 0.6);
});
