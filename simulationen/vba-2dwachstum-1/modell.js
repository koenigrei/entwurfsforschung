/* 2Dwachstum 01–03 · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung der AutoCAD-VBA-Skripte experiment01.htm („2Dwachstum01“), experiment02.htm („2Dwachstum02 –
   weiterbearbeitete Struktur“) und experiment03.htm („2Dwachstum03 – wander Würfel“), Reinhard König, Februar 2004.
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Gemeinsame Regel (Sub main): ein Würfel (Kante 10) wandert in Sprüngen von 11 in eine zufällige Richtung
     angle = Round(Rnd() · num + 1) · 2π/num   (num = 4: die vier Hauptrichtungen)
   und setzt an jedem Ort einen Würfel in zufälliger AutoCAD-Farbe (setzeQuad, wuerfel.color = random(…)).
   - 01: zehn Ebenen (u = 1 … 10) übereinander, in jeder ein Weg aus loops = 100 Würfeln ab (0, 0); keine Prüfung,
         Würfel überschneiden sich. Koordinaten ungerundet.
   - 02: ein Weg aus 200 Würfeln, Koordinaten gerundet; checkList prüft, ob der zuletzt gesetzte Würfel auf einem
         besetzten Platz steht – dann wechselt die Ebene (etage ± 10) für den nächsten Würfel. Doppelbelegungen
         werden so nicht verhindert („werden trotzdem noch zweifach besetzt?“).
   - 03: 400 Durchgänge; geprüft wird der nächste Platz, bevor ein Würfel entsteht. Ist er besetzt, ändert sich nur
         die Höhe (je Treffer etage + random(−1, 1) · 10), und der nächste Durchgang prüft erneut – keine
         Doppelbelegung, die Struktur wandert frei im Raum.
   Ein Schritt = ein Durchgang der Schleife For i (in 01 und 02 ein Würfel, in 03 ein Würfel oder ein Höhenwechsel). */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const KANTE = 10, SPRUNG = 11, GESCHOSS = 10;

  /** Fassungen: loops wie im jeweiligen Skript */
  const FASSUNGEN = { "01": { loops: 100 }, "02": { loops: 200 }, "03": { loops: 400 } };

  /** Voreinstellungen wie im Original (experiment01: num = 4, loops = 100, For u = 1 To 10) */
  const STANDARD = { fassung: "01", loops: 100, ebenen: 10, num: 4, farbe: "zufall", doppelte: false, drehung: 30, neigung: 35 };

  /** VBA-Round: bei genau .5 zur geraden Zahl („Banker's Rounding“), sonst zur nächsten ganzen Zahl */
  function vbaRound(x) {
    const f = Math.floor(x), r = x - f;
    if (Math.abs(r - 0.5) < 1e-9) return f % 2 === 0 ? f : f + 1;
    return r < 0.5 ? f : f + 1;
  }

  /** Function random(lower, upper) = Int((upper − lower + 1) · Rnd + lower) */
  const random = (r, lower, upper) => Math.floor((upper - lower + 1) * r + lower);

  /** Richtung: angle = Round(Rnd · num + 1) · 2π/num; liefert den Versatz (Cos · 11, Sin · 11) */
  function sprung(r, num) {
    const w = vbaRound(r * num + 1) * 2 * Math.PI / num;
    return [Math.cos(w) * SPRUNG, Math.sin(w) * SPRUNG];
  }

  /** Platzvergleich wie If mitte(0) = checkList(u)(0) And … (in 01 ungerundet: auf 1e-6 genau) */
  const schluessel = (x, y, h) => Math.round(x * 1e6) / 1e6 + "," + Math.round(y * 1e6) / 1e6 + "," + h;
  const gleich = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const fassung = FASSUNGEN[p.fassung] ? p.fassung : "01";
    return {
      t: 0, zufall, fassung, num: Math.max(2, Math.round(p.num)), loops: Math.max(1, Math.round(p.loops)),
      ebenen: fassung === "01" ? Math.max(1, Math.round(p.ebenen)) : 1,
      wuerfel: [], belegt: new Map(), xW: 0, yW: 0, etage: 0, mitte: [0, 0, 0],
      checkList: [[1, 0, 0]],                    // checkList(0) = mitte: checkList(0)(0) = 1#
      u: 1, i: 1, fertig: false, doppelt: 0, hoehenwechsel: 0, leer: 0
    };
  }

  /** setzeQuad: Würfel mit Oberseite auf mittelPunkt(2), Mitte elevation/2 tiefer; doppelt = Platz war schon besetzt */
  function setzeQuad(z, m, farbe) {
    const k = schluessel(m[0], m[1], m[2]), n = z.belegt.get(k) || 0;
    if (n) z.doppelt++;
    z.belegt.set(k, n + 1);
    z.wuerfel.push({ x: m[0], y: m[1], z: m[2] - KANTE / 2, farbe, doppelt: n > 0 });
  }

  /** 01: For u = 1 To 10 · For i = 1 To loops – Weg ab (0, 0) auf Höhe u · 10, ohne Prüfung */
  function schritt01(z) {
    const r = z.zufall, [dx, dy] = sprung(r(), z.num);
    const m = [z.xW, z.yW, z.u * GESCHOSS];
    z.xW += dx; z.yW += dy;
    setzeQuad(z, m, random(r(), 1, 255));
    if (++z.i > z.loops) { z.i = 1; z.u++; z.xW = 0; z.yW = 0; }
    if (z.u > z.ebenen) z.fertig = true;
  }

  /** 02: zuerst prüfen, ob der zuletzt gesetzte Platz (mitte) schon in der checkList steht; dann Ebene wechseln, Würfel setzen */
  function schritt02(z) {
    const r = z.zufall;
    let test = false;
    for (const c of z.checkList) if (gleich(z.mitte, c)) test = true;   // For u = 0 To i − 1
    z.checkList.push(z.mitte.slice());                                   // checkList(i) = mitte (in beiden Zweigen)
    if (test) { const d = random(r(), -1, 1); z.etage += d * GESCHOSS; if (d) z.hoehenwechsel++; }
    const [dx, dy] = sprung(r(), z.num);
    z.mitte = [z.xW, z.yW, z.etage];
    z.xW = vbaRound(z.xW + dx); z.yW = vbaRound(z.yW + dy);
    setzeQuad(z, z.mitte, random(r(), 1, 255));
    if (++z.i > z.loops) z.fertig = true;
  }

  /** 03: den nächsten Platz prüfen; besetzt → je Treffer etage + random(−1, 1) · 10, kein Würfel; frei → Würfel setzen */
  function schritt03(z) {
    const r = z.zufall;
    let check = true;
    for (const c of z.checkList) {
      if (gleich(z.mitte, c)) { const d = random(r(), -1, 1); z.etage += d * GESCHOSS; if (d) z.hoehenwechsel++; check = false; }
    }
    if (check) {
      const [dx, dy] = sprung(r(), z.num);
      z.mitte = [z.xW, z.yW, z.etage];
      z.checkList.push(z.mitte.slice());
      z.xW = vbaRound(z.xW + dx); z.yW = vbaRound(z.yW + dy);
      setzeQuad(z, z.mitte, random(r(), 0, 255));
      z.mitte = [z.xW, z.yW, z.etage];                                  // nächster Platz für die Prüfung
    } else {
      z.mitte[2] = z.etage;                                             // nur die Höhe ändert sich
      z.checkList.push(z.checkList[z.checkList.length - 1].slice());    // checkList(i) = checkList(i − 1)
      z.leer++;
    }
    if (++z.i > z.loops) z.fertig = true;
  }

  /** Ein Durchgang der Schleife; erhöht z.t. Nichts mehr, wenn alle Durchgänge gelaufen sind. */
  function schritt(z, p) {
    if (z.fertig) return z;
    if (z.fassung === "01") schritt01(z); else if (z.fassung === "02") schritt02(z); else schritt03(z);
    z.t++;
    return z;
  }

  /** Darstellung (Farben, Ansicht) wirkt ohne Neustart; Regeln stehen im Zustand */
  function aendere(z, p, id) {}

  /** Kennzahlen */
  const geschosse = z => new Set(z.wuerfel.map(w => w.z)).size;
  const plaetze = z => z.belegt.size;
  const durchgaenge = z => (z.fassung === "01" ? z.ebenen : 1) * z.loops;

  return { STANDARD, FASSUNGEN, KANTE, SPRUNG, GESCHOSS, vbaRound, random, sprung, schluessel, erzeuge, schritt, aendere,
           geschosse, plaetze, durchgaenge };
});
