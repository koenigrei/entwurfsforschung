# AGENTS.md · Isovist 3D

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner samt `katalog/_gemeinsam/` und `simulationen/_gemeinsam/` in der Ordnerstruktur der Website.

## Worum es geht

Fachlich treue Neuumsetzung des Grasshopper-Moduls „Isovist 3D“ aus dem Parametric Planning Catalogue (DeCodingSpaces – Martin Bielik, Ekaterina Fuchkina; https://infar-buw.github.io/parametric-planning-catalogue/docs/Isovist3D/). Maßgeblich sind Verfahren, Parameter und Begriffe des Moduls (siehe `QUELLE.md`), nicht die Oberfläche von Grasshopper.

## Aufbau

```
simulationen/_gemeinsam/   Rahmen aller Lab-Apps (nicht pro App kopieren)
  zufall.js                Zufall.zufall(saat) → () => [0, 1), dazu .ganz(n), .zwischen(a, b)
  sim.js                   Sim.starte(cfg): Ablauf, Bedienfeld, Zeichenfläche, Sprache, Hell/Dunkel, window.SIM
  sim.css                  Gestaltung wie das KI Lab
katalog/_gemeinsam/        gemeinsam für die Apps des Parametric Planning Catalogue
  geo.js                   Geo: Polygone, Strahlen, Isovist, Voronoi, Netze, Dijkstra, Floyd–Warshall, Betweenness
  szenen.js                Szenen: Stadt (Straßen, Blöcke, Gebäude, Platz) und Gelände (Höhenraster) mit fester Saat
  karte.js                 Karte: Farbskalen, Polygone, Pfeile, Gelände mit Schummerung und Höhenlinien
katalog/isovist-3d/
  index.html               statische Seite; lädt die Rahmen-Skripte, modell.js, app.js
  modell.js                reine Logik, kein DOM: erzeuge(param, zufall), schritt(z, param), aendere(z, param, id)
  app.js                   Sim.starte({...}): Parameter, zeichne, legende, kennzahlen, klick, aktionen
  test/*.test.mjs          node --test
```

## Regeln

1. **modell.js bleibt ohne DOM** (`document`, `window`, `canvas` sind tabu) und ohne Abhängigkeiten außer `../_gemeinsam/geo.js` und `szenen.js`. Zufall nur über die übergebene Funktion `zufall` (feste Saat → gleicher Lauf). Kein `Math.random()`.
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
| `buendel(p, blick)` | Winkel des Strahlenbündels: `nh` Himmelsrichtungen und `nv` Neigungen (beide = Precision) in Zellmitten, Raumwinkel je Zeile |
| `baue(szene, zufall)` | Prismen der Beispielstadt (3–7 Geschosse à 3,2 m; Kirche = Schiff 18 m + Turm 42 m, ein Objekt); Hüllfläche je Objekt |
| `abschnitte(o, u, poly)` | Abschnitte [ein, aus] eines Grundriss-Strahls im Polygon (waagerechter Abstand) |
| `trefferHoehe(ein, aus, H, e, k, tmax)` | erster Treffer eines geneigten Strahls (Augenhöhe e, k = tan Neigung) in einem Abschnitt eines Prismas der Höhe H – Wand oder Dach |
| `strahlen(o, e, blick, p, S)` | die Komponente Isovist3D: Kategorie (0 Himmel, 1 Hindernis, 2 Boden), Länge, Objekt und Endpunkt je Strahl, Treffer je Objekt |
| `anteile(E)` | Anteile der Kategorien (nach Strahlenzahl wie in der Datei und nach Raumwinkel) |
| `statistik(len)` | Strahllängen: min, max, Mittel, Summe, Standardabweichung √(Σ(x − Mittel)² ÷ n), Median |
| `volumen(E)` | Isovist-Volumen aus den Strahlen (Σ L³/3 · Raumwinkel) |
| `gebaeudeWerte(E, S, mass)` | Object Visibility je Gebäude (Treffer oder je 100 m² Hüllfläche), Bounds, t für den Gradient (−1 = nicht gesehen) |
| `verlauf(t)` | Farbe des Gradient der .gh-Datei |
| `grundrichtung(a)`, `richtungZu(o, q)` | Blickrichtung in Grad (0 = Osten, gegen den Uhrzeigersinn) ↔ Vektor im Plan (y nach Süden) |
| `rundweg(szene)`, `naechsterAnteil(P, q)` | Rundweg auf den Straßenmitten um den Platz; nächster Wegpunkt |
| `rechne(z, p)`, `setzeStandpunkt(z, p, q)`, `imGebaeude(z, q)`, `auswertung(z)` | neu rechnen; Standpunkt setzen; Kennzahlen der Gebäude |

Zustand `z`: `S` (Objekte und Prismen), `o` (Standpunkt im Plan), `blick` (aktuelle Blickrichtung in Grad), `pfad`, `anteil`, `E` (Ergebnis von `strahlen`), `A` (`anteile`), `L` (`statistik`), `V` (`volumen`).
Strahl `r = i · nv + j` (Spalte i = Himmelsrichtung, Zeile j = Neigung). Weil alle Strahlen einer Spalte denselben Grundriss-Strahl haben, schneidet `strahlen` je Spalte nur einmal in 2D und prüft je Neigung nur noch die Höhe.

`app.js`: eigene Parallelprojektion `ansicht(z, p)` (Drehung, Neigung, Vergrößerung), Prismen nach Tiefe sortiert (Maleralgorithmus), Strahlen darüber (gezeichnet höchstens etwa 50 × 50, gerechnet alle), Draufsicht unten rechts (`einsatz`) für Klick und Rechtsklick.

Im Browser steht `window.SIM` bereit: `SIM.schritt(100)`, `SIM.zuruecksetzen(7)`, `SIM.setze("<parameter>", wert)`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&<parameter>=…`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 katalog/pruefe_apps.py isovist-3d` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Sichtbarkeit über einen ganzen Weg aufsummieren (welche Fassaden prägen den Weg zur Kirche?) und Treffer auf die einzelnen Fassadenflächen statt aufs Gebäude legen.
- Gelände statt Ebene z = 0 (`Szenen.gelaende`) als Boden, Dachformen statt Flachdächern.
- Strahlen nach Raumwinkel gleichmäßig verteilen (Fibonacci-Kugel) statt im Winkelraster – das Raster drängt die Strahlen am Zenit zusammen.
- Strahlen tiefenrichtig zwischen den Gebäuden zeichnen (stückweise in die Tiefensortierung aufnehmen).
