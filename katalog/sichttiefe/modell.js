/* Sichttiefe (Visibility Step Depth) · Modelllogik (ohne DOM, in Node testbar)
   Neuumsetzung des Snippets „Visual Distance“ (stops_step_depth.gh) aus dem Eintrag „Grasshopper snippets for Urban Design
   and Analysis“ im DeCodingSpaces Lab (Bauhaus-Universität Weimar, 2018; benutzt SpiderWeb 4.2 von Richard Schaffranek).
   Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · CC BY 4.0

   Verfahren wie in der .gh-Datei (gelesen, nichts ausgeführt):
   1. „visualGraphGrid“ legt ein Zellraster der Zellgröße gridSize (2 [0..10]) über das Gebiet (Area) mit Hindernissen
      (Obstacles, hier die Gebäude); Zellen in Gebäuden gehören nicht zum Graphen.
   2. „recursiveShadowCasting“ bestimmt, welche Zellen einander sehen (Sichtbarkeitsgraph, Turner et al. 2001).
   3. „Closest Point“ sucht die Zelle am Startpunkt (Start points), „Breadth-first Search“ läuft von dort über die Kanten des
      Sichtbarkeitsgraphen; Kosten = Zahl der Schritte (Sichttiefe, step depth). Mehrere Startpunkte: „Flip Matrix“ + „Sort List“
      + „List Item 0“ nehmen je Zelle den kleinsten Wert. Nicht erreichbare Zellen bekommen „+Infinity“ (Panel → Replace Items).
   Sichttiefe 1 = vom Start direkt sichtbar, 2 = ein Richtungswechsel nötig usw. („number of turns“).
   Die Sichtbarkeit rechnet diese Datei mit symmetrischem Shadowcasting (Zellmitte zu Zellmitte, nach dem Verfahren von
   Albert Ford, 2021, eigene Umsetzung; Raster.sichtbar in ../_gemeinsam/raster.js): Zelle B ist von A sichtbar genau dann,
   wenn A von B sichtbar ist. */
(function (wurzel, fabrik) {
  const node = typeof module === "object" && module.exports;
  const M = fabrik(node ? require("../_gemeinsam/geo.js") : wurzel.Geo, node ? require("../_gemeinsam/szenen.js") : wurzel.Szenen,
                   node ? require("../_gemeinsam/raster.js") : wurzel.Raster);
  if (node) module.exports = M;
  else wurzel.Modell = M;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Geo, Szenen, Raster) {
  "use strict";

  /** Voreinstellungen der .gh-Datei: gridSize 2 (0…10), 100 Rechtecke (Number Slider 100 [0..100]) für die Szene „Rechtecke“;
      szene: „stadt“ (Beispielstadt wie die Isovist-Apps) oder „rechtecke“ (wie die Gruppe „synthetize buildings“ der Datei) */
  const STANDARD = { zelle: 2, szene: "stadt", rechtecke: 100, mehrere: false, zeigeWeg: true };
  /** Gebiet der Szene „Rechtecke“ in m */
  const GEBIET = { b: 260, h: 180 };

  /* ---------------------------------------------------------------- Szenen */
  /** „synthetize buildings“: Populate 2D (n zufällige Punkte im Gebiet) + Rectangle mit zufälliger Breite und Tiefe */
  function rechteckSzene(zufall, n) {
    const gebaeude = [];
    for (let i = 0; i < n; i++) {
      const x = zufall() * GEBIET.b, y = zufall() * GEBIET.h, w = 4 + 16 * zufall(), h = 4 + 16 * zufall();
      gebaeude.push([[x, y], [Math.min(GEBIET.b, x + w), y], [Math.min(GEBIET.b, x + w), Math.min(GEBIET.h, y + h)], [x, Math.min(GEBIET.h, y + h)]]);
    }
    return { b: GEBIET.b, h: GEBIET.h, gebaeude, platz: null };
  }

  /* ---------------------------------------------------------------- Raster */
  /** Zellraster über [0, b] × [0, h] mit Zellgröße cs; Zelle k = j·nx + i gesperrt, wenn ihre Mitte in einem Gebäude liegt */
  function raster(b, h, cs, gebaeude) {
    const nx = Math.max(1, Math.floor(b / cs + 1e-9)), ny = Math.max(1, Math.floor(h / cs + 1e-9));
    const gesperrt = new Uint8Array(nx * ny);
    for (const g of gebaeude) {
      const bb = Geo.bbox(g);
      const i0 = Math.max(0, Math.floor(bb.x0 / cs - 0.5)), i1 = Math.min(nx - 1, Math.ceil(bb.x1 / cs - 0.5));
      const j0 = Math.max(0, Math.floor(bb.y0 / cs - 0.5)), j1 = Math.min(ny - 1, Math.ceil(bb.y1 / cs - 0.5));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const k = j * nx + i;
        if (!gesperrt[k] && Geo.punktInPoly([(i + 0.5) * cs, (j + 0.5) * cs], g)) gesperrt[k] = 1;
      }
    }
    let frei = 0; for (let k = 0; k < gesperrt.length; k++) if (!gesperrt[k]) frei++;
    return { nx, ny, cs, gesperrt, frei };
  }
  const zellMitte = (R, k) => { const i = k % R.nx, j = (k - i) / R.nx; return [(i + 0.5) * R.cs, (j + 0.5) * R.cs]; };
  function zelleBei(R, q) {
    const i = Math.floor(q[0] / R.cs), j = Math.floor(q[1] / R.cs);
    return i >= 0 && j >= 0 && i < R.nx && j < R.ny ? j * R.nx + i : -1;
  }
  /** freie Zelle, deren Mitte q am nächsten liegt („Closest Point“ auf die Zellmitten), oder −1 */
  function naechsteFreie(R, q) {
    let best = -1, bd = Infinity;
    const k0 = zelleBei(R, [Math.max(0, Math.min(R.nx * R.cs - 1e-9, q[0])), Math.max(0, Math.min(R.ny * R.cs - 1e-9, q[1]))]);
    if (k0 >= 0 && !R.gesperrt[k0]) return k0;
    for (let k = 0; k < R.gesperrt.length; k++) {
      if (R.gesperrt[k]) continue;
      const m = zellMitte(R, k), d = (m[0] - q[0]) ** 2 + (m[1] - q[1]) ** 2;
      if (d < bd) { bd = d; best = k; }
    }
    return best;
  }

  /* ---------------------------------------------------------------- Sichtbarkeit: symmetrisches Shadowcasting */
  /** Ruft sieh(k) für jede freie Zelle auf, die von der Zelle s aus sichtbar ist (ohne s selbst; Raster.sichtbar). Eine Zelle gilt
      als sichtbar, wenn ihre Mitte von der Mitte von s aus frei zu sehen ist; gesperrte Zellen und der Rand verdecken als volle Quadrate. */
  const sichtbar = Raster.sichtbar;
  /** sieht Zelle a die Zelle b? (für Tests und die Anzeige; Raster.sieht) */
  const sieht = Raster.sieht;

  /* ---------------------------------------------------------------- Zustand und Breitensuche */
  function erzeuge(param, zufall) {
    const p = Object.assign({}, STANDARD, param);
    const szene = p.szene === "rechtecke" ? rechteckSzene(zufall, Math.max(0, Math.min(100, Math.round(p.rechtecke)))) : Szenen.stadt(zufall);
    const z = { t: 0, szene, b: szene.b, h: szene.h, ziel: -1 };
    let q0 = [szene.b / 2, szene.h / 2];
    if (szene.platz) { const c = Geo.schwerpunkt(szene.platz), bb = Geo.bbox(szene.platz); q0 = [c[0] - bb.b * 0.25, c[1] + bb.h * 0.33]; }
    z.startPunkte = [q0];
    baueRaster(z, p);
    return z;
  }

  /** Raster neu anlegen (Zellgröße geändert) und die Suche neu beginnen */
  function baueRaster(z, p) {
    z.R = raster(z.b, z.h, Math.max(1, Math.min(10, p.zelle)), z.szene.gebaeude);
    neu(z);
  }

  /** Breitensuche neu beginnen: Startzellen = freie Zellen an den Startpunkten (Tiefe 0), t = 0 */
  function neu(z) {
    const n = z.R.nx * z.R.ny;
    z.tiefe = new Int32Array(n).fill(-1); z.vor = new Int32Array(n).fill(-1);
    z.start = [];
    for (const q of z.startPunkte) { const k = naechsteFreie(z.R, q); if (k >= 0 && z.tiefe[k] < 0) { z.tiefe[k] = 0; z.start.push(k); } }
    z.front = z.start.slice(); z.stufe = 0; z.erreicht = z.start.length; z.summe = 0; z.jeStufe = [z.start.length];
    z.t = 0;
    if (z.ziel >= 0 && (z.ziel >= n || z.R.gesperrt[z.ziel])) z.ziel = -1;
  }

  const fertig = z => z.front.length === 0;

  /** Ein Schritt = eine Tiefenstufe: alle Zellen, die von einer Zelle der letzten Stufe aus sichtbar und noch nicht erreicht sind,
      bekommen die Tiefe stufe + 1; ihr Vorgänger ist die erste Zelle der letzten Stufe, die sie sieht. Erhöht z.t. */
  function schritt(z) {
    if (!fertig(z)) {
      const d = z.stufe + 1, neue = [];
      for (const s of z.front) sichtbar(z.R, s, k => { if (z.tiefe[k] < 0) { z.tiefe[k] = d; z.vor[k] = s; neue.push(k); } });
      z.front = neue;
      if (neue.length) { z.stufe = d; z.erreicht += neue.length; z.summe += d * neue.length; z.jeStufe.push(neue.length); }
    }
    z.t++;
    return z;
  }
  function rechneAlle(z) { while (!fertig(z)) schritt(z); return z; }

  /** Weg der wenigsten Richtungswechsel von einem Start zur Zelle k: Folge der Zellen (Start zuerst) über die Vorgänger */
  function weg(z, k) {
    if (k < 0 || z.tiefe[k] < 0) return [];
    const w = [k];
    while (z.vor[w[w.length - 1]] >= 0 && w.length <= z.stufe + 1) w.push(z.vor[w[w.length - 1]]);
    return w.reverse();
  }
  /** Zelle, zu der der Weg gezeigt wird: die gewählte oder sonst die erste der tiefsten erreichten Zellen */
  function zielZelle(z) {
    if (z.ziel >= 0 && z.tiefe[z.ziel] >= 0) return z.ziel;
    let best = -1;
    for (let k = 0; k < z.tiefe.length; k++) if (z.tiefe[k] > (best < 0 ? 0 : z.tiefe[best])) best = k;
    return best;
  }
  /** mittlere Sichttiefe der erreichten Zellen ohne die Startzellen (Turner: mean depth) */
  const mittel = z => z.erreicht > z.start.length ? z.summe / (z.erreicht - z.start.length) : NaN;

  /** liegt der Punkt in einem Gebäude? */
  function imGebaeude(z, q) { return z.szene.gebaeude.some(g => Geo.punktInPoly(q, g)); }
  /** Startpunkt setzen (ersetzt alle) oder hinzufügen; true, wenn gesetzt. Beginnt die Suche neu. */
  function setzeStart(z, q, dazu = false) {
    if (q[0] < 0 || q[1] < 0 || q[0] > z.b || q[1] > z.h || imGebaeude(z, q)) return false;
    if (dazu) z.startPunkte.push([q[0], q[1]]); else z.startPunkte = [[q[0], q[1]]];
    neu(z); return true;
  }
  /** den zuletzt gesetzten Startpunkt verschieben (Ziehen); true, wenn versetzt */
  function verschiebeStart(z, q) {
    if (q[0] < 0 || q[1] < 0 || q[0] > z.b || q[1] > z.h || imGebaeude(z, q)) return false;
    z.startPunkte[z.startPunkte.length - 1] = [q[0], q[1]]; neu(z); return true;
  }
  /** Zielzelle für die Anzeige des Wegs wählen (−1: keine eigene Wahl) */
  function waehleZiel(z, q) { const k = zelleBei(z.R, q); z.ziel = k >= 0 && !z.R.gesperrt[k] ? k : -1; return z.ziel >= 0; }

  function aendere(z, p, id) { if (id === "zelle") baueRaster(z, p); }

  return { STANDARD, GEBIET, rechteckSzene, raster, zellMitte, zelleBei, naechsteFreie, sichtbar, sieht,
           erzeuge, baueRaster, neu, fertig, schritt, rechneAlle, weg, zielZelle, mittel, imGebaeude, setzeStart, verschiebeStart, waehleZiel, aendere };
});
