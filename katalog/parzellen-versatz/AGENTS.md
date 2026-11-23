# AGENTS.md · Parzellen mit eigenem Kantenversatz

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner samt `katalog/_gemeinsam/` und `simulationen/_gemeinsam/` in der Ordnerstruktur der Website.

## Worum es geht

Fachlich treue Neuumsetzung des Grasshopper-Moduls „Parcel Custom Offset“ aus dem Parametric Planning Catalogue (DeCodingSpaces – Martin Bielik; https://infar-buw.github.io/parametric-planning-catalogue/docs/ParcelCustomOffset/). Maßgeblich sind Verfahren, Parameter und Begriffe des Moduls (siehe `QUELLE.md`), nicht die Oberfläche von Grasshopper.

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
katalog/parzellen-versatz/
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
| `szene(zufall)` | Beispielszene: Stadt als Hintergrund (nur Darstellung) und ein Gebiet mit geschwungenen Wegen (6 × 5 Knoten, Diagonalen, Stichwege) |
| `vereinfache(P, winkel, umwandeln)` | Network to Segments, Teil 1: Kurve → Strecken nach dem Umwandlungswinkel (ConversionAngle); `umwandeln = false`: Sehne |
| `teileAnSchnitten(S)` | Network to Segments, Teil 2 (Split): Strecken an Kreuzungen und T-Stößen teilen |
| `zuSegmenten(kurven, p)`, `glaette(S, fang)` | beides zusammen; Network Smooth (Knoten im Snap threshold zusammenlegen, danach eben halten) |
| `betweenness(N)` | CityGraph: Betweenness je Segment (`Geo.segmentGraph(N, 1, 0)`, `Geo.betweennessVon`, geordnete Paare) |
| `flaechenAusLinien(N)` | Polygons from lines: geschlossene Flächen über Halbkanten (Sackgassen und Brücken entfallen), je Plotkante die Netzkante |
| `remap(x, lo, hi, a, b)`, `zielbereich(p)` | Bounds/Remap Numbers; Zielbereich Offset Min … Max × Negative Offset |
| `versetzeKanten(poly, d)` | Custom offset: jede Kante um ihren eigenen Wert (d > 0 außen, d < 0 innen), Ecken neu geschnitten, verschwundene Kanten entfernt; `null`, wenn der Plot verschwindet |
| `baueNetz(z, p)`, `plotWerte(z, p, plot)` | ganze Kette bis zu den Plots; Versatzwerte der Kanten eines Plots |
| `leere(z)`, `rechneAlles(z, p)`, `fertig(z)` | Versatz leeren (t = 0); alle Plots auf einmal; alle versetzt? |
| `plotBei(z, q)`, `bilanz(z)` | Plot unter einem Punkt; Flächen vorher/nachher, verschwundene Plots |

Zustand `z`: `S` (Szene: `kurven`, `gebiet`, `stadt`), `segmente0` (nach Network to Segments), `N` (Netz nach Network Smooth), `bc` (Betweenness je Netzkante), `bounds`, `farbwert` (log, 0…1), `plots` (`{poly, kanten}`), `k` (versetzte Plots), `erg` (versetzte Polygone oder `null`), `werte` (Versatz je Kante), `wahl`.

Im Browser steht `window.SIM` bereit: `SIM.schritt(100)`, `SIM.zuruecksetzen(7)`, `SIM.setze("<parameter>", wert)`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&<parameter>=…`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 katalog/pruefe_apps.py parzellen-versatz` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Wege selbst zeichnen (Polylinien mit der Maus) statt der Beispielszene; Wege als GeoJSON laden und die Plots als GeoJSON ausgeben (entspricht „Bake“).
- Angular Coefficient und Radius des CityGraph als Regler, damit der Versatz der Winkelanalyse oder einer lokalen Analyse folgt.
- `versetzeKanten` für stark nichtkonvexe Plots robuster machen (Straight Skeleton mit Teilungsereignissen; heute können sich bei sehr großem Versatz einzelne Plots selbst schneiden).
- `flaechenAusLinien` und `teileAnSchnitten` nach `katalog/_gemeinsam/geo.js` verschieben (auch „Vom Straßennetz zu Grundstücken“ braucht sie).
