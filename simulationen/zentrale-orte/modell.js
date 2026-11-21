/* Zentralität und zentrale Orte · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung von 09_christaller (Delphi, Juni 2005, Reinhard König) aus dem „Laboratorium für räumliche Prozesse“,
   nach W. Christallers Theorie der zentralen Orte (1933); Dissertation 2008, Kapitel 4.1.1.
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Agenten dreier Ränge: rot (0), blau (1), gelb (2). Je Schritt (facsSteer.pas, ApplicationEvents1Idle → Swarming;
   agenten.pas, NeigborCheck / Anlagern):
     – Nachbarn innerhalb der Anlagerungsdistanz des eigenen Rangs sammeln, nächsten Nachbarn bestimmen.
     – Liegt ein Nachbar im Radius, lagert der Agent an: an einen Agenten des nächsthöheren Rangs mit freier Bindung
       (übernimmt dessen Bewegung), rot an rot (hält an); sonst zufällige Richtungsänderung (SetRndDir 1,1).
     – Ist der nächste gleichfarbige Nachbar näher als Anlagerungsdistanz − Abstoßdistanz, weicht er aus (Repel).
     – Ist irgendein Nachbar näher als der Mindestabstand: SetRndDir(0,8).
   Danach bewegen sich alle um ihren gerundeten Schritt, Rand als Torus. */
(function (wurzel, fabrik) {
  const M = fabrik();
  if (typeof module === "object" && module.exports) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const BREITE = 769, HOEHE = 456;      // ImagePaint des Originals
  const ZELLE = 10, SPALTEN = 77, ZEILEN = 46;   // cellScal 10 → round(76,9) × round(45,6)
  const VMAX = 5;                       // Neu: Höchstgeschwindigkeit (SetRndDir(1,1) beschleunigt im Original unbegrenzt)
  const RANG = ["rot", "blau", "gelb"];
  const ZUSATZ_BLAU = 150, ZUSATZ_GELB = 300;   // Neu: Schritte, nach denen „nacheinander“ Blau und Gelb hinzukommen

  /** Voreinstellungen wie im Original (facsSteer.dfm) */
  const STANDARD = {
    anzahlRot: 50, anzahlBlau: 90, anzahlGelb: 90, aufbau: "nacheinander",
    distRot: 75, distBlau: 30, distGelb: 14, repelRot: 10, repelBlau: 10, repelGelb: 6,
    bindRot: 6, bindBlau: 6, bindGelb: 6, minAbstand: 5,
    verbindungen: true, zellen: false, radien: false
  };
  const NAME = ["Rot", "Blau", "Gelb"];
  const dist = (p, s) => p["dist" + NAME[s]], repel = (p, s) => p["repel" + NAME[s]], bind = (p, s) => p["bind" + NAME[s]];

  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const z = { t: 0, zufall, breite: BREITE, hoehe: HOEHE, spalten: SPALTEN, zeilen: ZEILEN, zelle: ZELLE,
                ag: [], zellen: new Int16Array(SPALTEN * ZEILEN), bewegt: 0, blau: false, gelb: false };
    hinzufuegen(z, p, 0, p.anzahlRot);                          // „Create Reds“
    if (p.aufbau === "alle") { hinzufuegen(z, p, 1, p.anzahlBlau); hinzufuegen(z, p, 2, p.anzahlGelb); z.blau = z.gelb = true; }
    return z;
  }

  /** Agenten eines Rangs erzeugen (Button_Create…Click): Lage random(760 bzw. 750) × random(450), Schritt random(3) − 1 */
  function hinzufuegen(z, p, rang, n) {
    const bx = rang === 2 ? 750 : 760;
    for (let i = 0; i < n; i++) neuerAgent(z, z.zufall.ganz(bx), z.zufall.ganz(450), rang);
  }
  function neuerAgent(z, x, y, rang) {
    z.ag.push({ x: Math.round(x), y: Math.round(y), vx: z.zufall.dreh(), vy: z.zufall.dreh(), rang,
                connect: 0, bindSet: 0, bindSelf: [], bindOther: [] });
  }

  const entf = (a, b) => Math.round(Math.hypot(a.x - b.x, a.y - b.y));   // CalcDistance (gerundet)
  const begrenze = v => v > VMAX ? VMAX : v < -VMAX ? -VMAX : v;
  /** SetRndDir: Schritt + random(3) − 1, mal damp */
  function rndDir(a, damp, zufall) { a.vx = begrenze((a.vx + zufall.dreh()) * damp); a.vy = begrenze((a.vy + zufall.dreh()) * damp); }

  /** Nachbarn eines Agenten (NeigborCheck): {liste, naechster, dNaechster, gleich, dGleich} – liste = Indizes im Radius */
  function nachbarn(z, p, i) {
    const a = z.ag[i], r = dist(p, a.rang), liste = [];
    let naechster = -1, dN = 1000, gleich = -1, dG = 1000;
    for (let k = 0; k < z.ag.length; k++) {
      if (k === i) continue;
      const b = z.ag[k], d = entf(a, b);
      if (d < r) liste.push(k);
      if (d < dN) { dN = d; naechster = k; }
      if (b.rang === a.rang && d < dG) { dG = d; gleich = k; }
    }
    return { liste, naechster, dNaechster: dN, gleich, dGleich: dG };
  }

  /** Anlagern (agenten.pas): Bindung an den nächsthöheren Rang, Rot an Rot, sonst Zufall; danach Abstoßung vom nächsten Gleichfarbigen */
  function anlagern(z, p, i, n) {
    const a = z.ag[i];
    a.connect = 0;
    for (const k of n.liste) {
      const b = z.ag[k];
      if (a.rang > 0 && b.rang === a.rang - 1 && b.bindSet < bind(p, b.rang)) {
        b.bindSet++; a.connect = 1;
        anlagerRichtung(z, a, n);                               // Bewegung des ranghöchsten Nachbarn übernehmen (SetAnlDir)
        a.bindOther.push(k);
      } else if (a.rang === 0 && b.rang === 0) {
        a.connect = 2; b.connect = 2; a.vx = 0; a.vy = 0;       // Rot an Rot: anhalten
        a.bindSelf.push(k);
      } else if (a.connect === 0) rndDir(a, 1.1, z.zufall);
      // Repel: nächster Nachbar gleicher Farbe zu nah → ausweichen (im Original innerhalb der Schleife, je Nachbar neu gewürfelt)
      if (n.gleich >= 0 && n.dGleich < dist(p, a.rang) - repel(p, a.rang)) {
        const c = z.ag[n.gleich];
        a.vx = begrenze(z.zufall.dreh() - (c.x - a.x) / 20);
        a.vy = begrenze(z.zufall.dreh() - (c.y - a.y) / 20);
      }
    }
  }

  /** SetAnlDir: Bewegung des Nachbarn mit dem kleinsten Rang (= ranghöchstes Zentrum) übernehmen; Kandidaten wie im Original:
      der nächste Nachbar, der nächste Gleichfarbige und alle Nachbarn im Radius */
  function anlagerRichtung(z, a, n) {
    const kand = [n.naechster, n.gleich, ...n.liste].filter(k => k >= 0);
    let who = kand[0];
    for (const k of kand) if (z.ag[k].rang < z.ag[who].rang) who = k;
    a.vx = z.ag[who].vx; a.vy = z.ag[who].vy;
  }

  /** Zellen markieren (lookCell, cellStates): Zelle unter einem Agenten trägt dessen Rang; Innenzellen summieren in der
      Moore-Nachbarschaft −55 je blauem und +50 je gelbem Agenten */
  function zellenMarkieren(z) {
    const belegt = new Int8Array(SPALTEN * ZEILEN).fill(-1);
    for (const a of z.ag) {
      const xc = Math.round((a.x - ZELLE / 2) / ZELLE), yc = Math.round((a.y - ZELLE / 2) / ZELLE);
      if (xc >= 0 && xc < SPALTEN && yc >= 0 && yc < ZEILEN) belegt[yc * SPALTEN + xc] = a.rang;
    }
    z.zellen.fill(0);
    for (let i = 1; i < ZEILEN - 1; i++) for (let k = 1; k < SPALTEN - 1; k++) {
      let s = 0;
      for (let di = -1; di <= 1; di++) for (let dk = -1; dk <= 1; dk++) {
        const r = belegt[(i + di) * SPALTEN + k + dk];
        if (r === 1) s -= 55; else if (r === 2) s += 50;
      }
      z.zellen[i * SPALTEN + k] = s;
    }
  }

  function schritt(z, p) {
    if (p.aufbau === "nacheinander") {
      if (!z.blau && z.t >= ZUSATZ_BLAU) { hinzufuegen(z, p, 1, p.anzahlBlau); z.blau = true; }
      if (!z.gelb && z.t >= ZUSATZ_GELB) { hinzufuegen(z, p, 2, p.anzahlGelb); z.gelb = true; }
    }
    for (const a of z.ag) { a.bindSet = 0; a.bindSelf = []; a.bindOther = []; }   // BindungSet := 0 (CommonPaint)
    for (let i = 0; i < z.ag.length; i++) {                                      // Swarming: der Reihe nach
      const a = z.ag[i], n = nachbarn(z, p, i);
      if (n.dNaechster < dist(p, a.rang)) anlagern(z, p, i, n);
      if (n.dNaechster < p.minAbstand) rndDir(a, 0.8, z.zufall);
    }
    let bewegt = 0;
    for (const a of z.ag) {                                                      // Position aktualisieren, Rand als Torus
      const dx = Math.round(a.vx), dy = Math.round(a.vy);
      if (dx || dy) bewegt++;
      a.x = ((a.x + dx) % BREITE + BREITE) % BREITE;
      a.y = ((a.y + dy) % HOEHE + HOEHE) % HOEHE;
    }
    z.bewegt = bewegt;
    if (p.zellen) zellenMarkieren(z);
    z.t++;
    return z;
  }

  /** Parameteränderung: wie im Original stößt eine neue Anlagerungsdistanz ALLE Agenten an (Connect := 0, Schritt random(3) − 1),
      damit sich das System neu ordnet */
  function aendere(z, p, id) {
    if (id === "distRot" || id === "distBlau" || id === "distGelb")
      for (const a of z.ag) { a.connect = 0; a.vx = z.zufall.dreh(); a.vy = z.zufall.dreh(); }
    if (id === "zellen" && p.zellen) zellenMarkieren(z);
  }

  /** Zählung: Agenten je Rang, angelagerte Blaue/Gelbe, Rot-Rot-Verbindungen */
  function zaehle(z) {
    const n = [0, 0, 0], an = [0, 0, 0]; let rr = 0;
    for (const a of z.ag) { n[a.rang]++; if (a.bindOther.length) an[a.rang]++; rr += a.bindSelf.length; }
    return { n, an, rotRot: rr };
  }

  /** mittlerer Abstand eines roten Zentrums zu seinem nächsten roten Nachbarn */
  function rotAbstand(z) {
    const rot = z.ag.filter(a => a.rang === 0); if (rot.length < 2) return NaN;
    let s = 0;
    for (const a of rot) { let d = Infinity; for (const b of rot) if (b !== a) d = Math.min(d, Math.hypot(a.x - b.x, a.y - b.y)); s += d; }
    return s / rot.length;
  }

  return { STANDARD, BREITE, HOEHE, ZELLE, SPALTEN, ZEILEN, VMAX, RANG, ZUSATZ_BLAU, ZUSATZ_GELB,
           erzeuge, schritt, aendere, hinzufuegen, neuerAgent, nachbarn, anlagern, rndDir, zellenMarkieren, zaehle, rotAbstand };
});
