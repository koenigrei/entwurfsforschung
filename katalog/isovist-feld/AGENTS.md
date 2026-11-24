# AGENTS.md · Isovistenfeld

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner samt `katalog/_gemeinsam/` und `simulationen/_gemeinsam/` in der Ordnerstruktur der Website.

## Worum es geht

Fachlich treue Neuumsetzung des Grasshopper-Moduls „Isovist Field“ aus dem Parametric Planning Catalogue (DeCodingSpaces – Martin Bielik, Ekaterina Fuchkina; https://infar-buw.github.io/parametric-planning-catalogue/docs/IsovistField/). Maßgeblich sind Verfahren, Parameter und Begriffe des Moduls (siehe `QUELLE.md`), nicht die Oberfläche von Grasshopper.

## Aufbau

```
simulationen/_gemeinsam/   Rahmen aller Lab-Apps (nicht pro App kopieren)
  zufall.js                Zufall.zufall(saat) → () => [0, 1), dazu .ganz(n), .zwischen(a, b)
  sim.js                   Sim.starte(cfg): Ablauf, Bedienfeld, Zeichenfläche, Sprache, Hell/Dunkel, window.SIM
  sim.css                  Gestaltung wie das KI Lab
katalog/_gemeinsam/        gemeinsam für die Apps des Parametric Planning Catalogue
  geo.js                   Geo: Polygone, Strahlen, Isovist, Voronoi, Netze, Dijkstra, Floyd–Warshall, Betweenness; schneller Isovist (segmentRaster, isovistRaster); Kennzeichnung der Isovist-Kenngrößen (ISOVIST_EIGENE_DEFINITION, ISOVIST_FUSSNOTE, isovistMassName, isovistMassOption)
  szenen.js                Szenen: Stadt (Straßen, Blöcke, Gebäude, Platz) und Gelände (Höhenraster) mit fester Saat
  karte.js                 Karte: Farbskalen, Polygone, Pfeile, Gelände mit Schummerung und Höhenlinien; Verlauf mit frei liegenden Griffen (verlauf, GRADIENT_GH – ohne DOM, auch in modell.js)
katalog/isovist-feld/
  index.html               statische Seite; lädt die Rahmen-Skripte, modell.js, app.js
  modell.js                reine Logik, kein DOM: erzeuge(param, zufall), schritt(z, param), aendere(z, param, id)
  app.js                   Sim.starte({...}): Parameter, zeichne, legende, kennzahlen, klick, aktionen
  test/*.test.mjs          node --test
```

## Regeln

1. **modell.js bleibt ohne DOM** (`document`, `window`, `canvas` sind tabu) und ohne Abhängigkeiten außer `../_gemeinsam/geo.js`, `szenen.js` und `karte.js` (nur die DOM-freie Farbfunktion `Karte.verlauf`). Zufall nur über die übergebene Funktion `zufall` (feste Saat → gleicher Lauf). Kein `Math.random()`.
2. **Jede Regeländerung bekommt einen Test** in `test/`. Vor dem Abschluss: `node --test` im App-Ordner muss grün sein.
3. **Abweichungen vom Original** in `QUELLE.md` unter „Bewusst geändert“ eintragen.
4. **Keine Inhalte fremder Server**: keine CDNs, keine Webfonts von Dritten, keine iframes.
5. **Texte** auf Deutsch, Bedienung zweisprachig: `{de, en}`-Objekte in `app.js`, in `index.html` Paare `<span lang="de">…</span><span lang="en">…</span>`.
6. **Gestaltung** nur über `sim.css` und die Farben im Objekt `F` (wechselt mit Hell/Dunkel); Farbskalen aus `Karte`.
7. **Namensnennung** bleibt: „Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic“, Lizenz CC BY 4.0; Vorbild Parametric Planning Catalogue (MIT) nennen.

## Schnittstelle des Modells

| Funktion | Aufgabe |
|---|---|
| `erzeuge(param, zufall)` | neuer Zustand `z` (enthält `t` = Schrittzahl) |
| `schritt(z, param)` | ein Schritt; erhöht `z.t` |
| `aendere(z, param, id)` | optional: Parameter ohne Neustart übernehmen |
| `analyseRaster(hindernisse, cs, fuell, R)`, `blockiert(a, b, hindernisse, R)` | Analysis Grid wie docs/visibility.md §3 der Toolbox: Gitter durch den Füllpunkt, Flutung in vier Richtungen, Schritt gesperrt, wenn er ein Hindernis berührt → `aktiv`, `zeilen` (von Süden nach Norden), `anzahl`, `start` |
| `zellMitte(G, k)`, `zelleBei(G, q)` | Mitte der Zelle k (Analysis Point), Zelle unter dem Punkt q |
| `segmentRaster(hindernisse, g)`, `isovistRaster(o, hindernisse, R, opt)` | schneller Isovist mit Segmentraster – gleiches Ergebnis wie `Geo.isovist` (aus `Geo`, `../_gemeinsam/geo.js`) |
| `segmentRechteck(a, b, x0, y0, x1, y1, rand)` | schneidet ein Segment ein Rechteck? (Liang–Barsky) |
| `rechneZelle(z, p, k)`, `rechneAlle(z, p)`, `fertig(z)` | eine Zelle, alle restlichen Zeilen, Ende erreicht? |
| `waehle(z, p, k)`, `setzeFuellpunkt(z, p, q)` | Zelle auswählen (Isovist und Werte), Füllpunkt versetzen (baut das Raster neu) |
| `baueRaster(z, p)`, `leere(z)` | Raster neu anlegen / Werte verwerfen (t = 0) |
| `anteil(z, key, v)`, `mittel(z, key)`, `verlauf(t)` | Lage im Bereich kleinster–größter Wert, Mittelwert, Farbe des Gradient der .gh-Datei (`Karte.verlauf`) |

Zustand `z`: `raster` (siehe oben), `werte[key]` (Float64Array je Kenngröße, `NaN` = noch nicht gerechnet), `min`, `max`, `summe`, `zeile` (nächste Rasterzeile), `berechnet`, `fuell`, `auswahl`, `auswahlIso`, `auswahlMasse`, `hindernisse` (Gebäudekanten + Rahmen).

Im Browser steht `window.SIM` bereit: `SIM.schritt(100)`, `SIM.zuruecksetzen(7)`, `SIM.setze("<parameter>", wert)`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&<parameter>=…`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 katalog/pruefe_apps.py isovist-feld` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Analyserahmen als Rechteck mit der Maus aufziehen (im Original frei gezeichnet) – spart Rechenzeit bei feinen Zellen.
- Verteilung der gewählten Kenngröße als Histogramm neben dem Feld; Zellen eines Wertebereichs hervorheben.
- Sichtbarkeitsgraph (Visibility Graph Analysis, Turner et al. 2001): je Zelle zählen, wie viele andere Zellen sichtbar sind.
