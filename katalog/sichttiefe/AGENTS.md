# AGENTS.md · Sichttiefe (Visibility Step Depth)

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner samt `katalog/_gemeinsam/` und `simulationen/_gemeinsam/` in der Ordnerstruktur der Website.

## Worum es geht

Fachlich treue Neuumsetzung des Grasshopper-Snippets „Visual Distance“ (`stops_step_depth.gh`) aus dem Eintrag „Grasshopper snippets for Urban Design and Analysis“ im DeCodingSpaces Lab (Bauhaus-Universität Weimar, 2018; https://toolbox.decodingspaces.net/grasshopper-snippets-for-urban-design-and-analysis/). Zellraster → Sichtbarkeitsgraph (Turner et al. 2001, https://doi.org/10.1068/b2684) → Breitensuche ab Startpunkten = Sichttiefe, Richtungswechsel = Tiefe − 1. Maßgeblich sind Verfahren, Parameter und Begriffe des Snippets (siehe `QUELLE.md`).

## Aufbau

```
simulationen/_gemeinsam/   Rahmen aller Lab-Apps (nicht pro App kopieren)
  zufall.js                Zufall.zufall(saat) → () => [0, 1), dazu .ganz(n), .zwischen(a, b)
  sim.js                   Sim.starte(cfg): Ablauf, Bedienfeld, Zeichenfläche, Sprache, Hell/Dunkel, window.SIM
  sim.css                  Gestaltung wie das KI Lab
katalog/_gemeinsam/        gemeinsam für die Apps des Katalogs
  geo.js                   Geo: Polygone (Punkt im Polygon, Schwerpunkt, Hülle) u. a.
  szenen.js                Szenen: Stadt (Straßen, Blöcke, Gebäude, Platz) mit fester Saat
  karte.js                 Karte: Farbskalen, Polygone, Linien, Text
  raster.js                Raster: Priority-Flood (ueberlauf), Shadowcasting (sichtbar, sieht), Marching Squares (kontur),
                           begrenzte Abstandstransformation (abstandsTransformation); Tests in _gemeinsam/test/raster.test.mjs
katalog/sichttiefe/
  index.html               statische Seite; lädt die Rahmen-Skripte, die gemeinsamen Dateien, modell.js, app.js
  modell.js                reine Logik, kein DOM
  app.js                   Sim.starte({...}): Parameter, zeichne, legende, kennzahlen, klick, aktionen
  test/*.test.mjs          node --test
```

## Regeln

1. **modell.js bleibt ohne DOM** (`document`, `window`, `canvas` sind tabu) und ohne Abhängigkeiten außer `../_gemeinsam/geo.js`, `szenen.js` und `raster.js` (gemeinsam mit anderen Apps; Änderungen dort mit eigenem Test in `_gemeinsam/test/`, danach `node --test` in `_gemeinsam` und in allen Apps, die die Datei nutzen). Zufall nur über die übergebene Funktion `zufall` (feste Saat → gleicher Lauf). Kein `Math.random()`.
2. **Jede Regeländerung bekommt einen Test** in `test/`. Vor dem Abschluss: `node --test` im App-Ordner muss grün sein.
3. **Abweichungen vom Original** in `QUELLE.md` unter „Bewusst geändert“ eintragen.
4. **Keine Inhalte fremder Server**: keine CDNs, keine Webfonts von Dritten, keine iframes.
5. **Texte** auf Deutsch, Bedienung zweisprachig: `{de, en}`-Objekte in `app.js`, in `index.html` Paare `<span lang="de">…</span><span lang="en">…</span>`.
6. **Gestaltung** nur über `sim.css` und die Farben im Objekt `F` (wechselt mit Hell/Dunkel); Farbskalen aus `Karte`.
7. **Namensnennung** bleibt: „Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic“, Lizenz CC BY 4.0; Vorbild (DeCodingSpaces Lab, SpiderWeb von Richard Schaffranek) nennen.

## Schnittstelle des Modells

| Funktion | Aufgabe |
|---|---|
| `erzeuge(param, zufall)` | neuer Zustand `z`: Szene, Raster `z.R`, Tiefen `z.tiefe` (−1 = noch nicht erreicht / +∞), Vorgänger `z.vor`, `t = 0` |
| `schritt(z, param)` | eine Tiefenstufe der Breitensuche; erhöht `z.t` |
| `aendere(z, param, id)` | Zellgröße → neues Raster, Suche von vorn |
| `raster(b, h, cs, gebaeude)` | Zellraster („visualGraphGrid“): gesperrt, wenn die Zellmitte in einem Gebäude liegt |
| `sichtbar(R, s, sieh)` | symmetrisches Shadowcasting (`Raster.sichtbar`): ruft `sieh(k)` für jede von Zelle `s` sichtbare freie Zelle |
| `sieht(R, a, b)` | sieht Zelle a die Zelle b? (`Raster.sieht`) |
| `naechsteFreie(R, q)`, `zellMitte`, `zelleBei` | „Closest Point“ auf die Zellmitten; Umrechnung Zelle ↔ Punkt |
| `neu(z)`, `fertig(z)`, `rechneAlle(z)` | Suche neu beginnen; keine neue Stufe mehr; alle Stufen rechnen |
| `weg(z, k)`, `zielZelle(z)` | Weg der wenigsten Richtungswechsel (Startzelle zuerst); gewählte oder tiefste Zelle |
| `mittel(z)` | mittlere Sichttiefe der erreichten Zellen ohne Startzellen |
| `setzeStart(z, q, dazu)`, `verschiebeStart(z, q)`, `waehleZiel(z, q)` | Startpunkt setzen/hinzufügen, den letzten verschieben, Zielzelle wählen |
| `rechteckSzene(zufall, n)` | Szene „Zufallsrechtecke“ wie „Populate 2D“ + „Rectangle“ der Datei |

Im Browser steht `window.SIM` bereit: `SIM.schritt(100)`, `SIM.zuruecksetzen(7)`, `SIM.setze("zelle", 3)`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&zelle=3`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 katalog/pruefe_apps.py sichttiefe` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Weitere Kennwerte des Sichtbarkeitsgraphen (Turner et al. 2001): Verbundenheit (Zahl der sichtbaren Zellen), Integration als mittlere Tiefe von jeder Zelle aus, Clustering-Koeffizient.
- Sichtbarkeit exakt gegen die Gebäudekanten (Strahlen wie `isovist-feld`) statt auf dem Raster – zum Vergleich als Schalter.
- „overlapDistance“ deuten, sobald der Quelltext von SpiderWeb vorliegt (vermutlich Abstand, ab dem eine Zelle als von einem Hindernis überdeckt gilt).
- Metrische Tiefe (Weglänge in m) neben der Sichttiefe zeigen; Ziele („destinations“) mit Ranking nach Tiefe.
