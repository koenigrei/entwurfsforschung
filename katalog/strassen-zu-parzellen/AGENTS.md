# AGENTS.md · Vom Straßennetz zu Grundstücken

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner samt `katalog/_gemeinsam/` und `simulationen/_gemeinsam/` in der Ordnerstruktur der Website.

## Worum es geht

Fachlich treue Neuumsetzung des Grasshopper-Moduls „Streets to Plots“ aus dem Parametric Planning Catalogue (DeCodingSpaces – Martin Dennemark; https://infar-buw.github.io/parametric-planning-catalogue/docs/StreetsToPlots/). Maßgeblich sind Verfahren, Parameter und Begriffe des Moduls (siehe `QUELLE.md`), nicht die Oberfläche von Grasshopper.

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
katalog/strassen-zu-parzellen/
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
| `szene(zufall, p)` | Beispielszene: Gelände (`Szenen.gelaende`, 1 km²) und Straßennetz (`Szenen.stadt` ohne Gebäude, 18 × 18, runder Umriss mit Stichen); ein Anteil `p.luecken` der Straßen endet 0,3…1,2 m vor der Kreuzung |
| `teileAnSchnitten(S)` | Network to Segments (Split): an Kreuzungen und T-Stößen teilen |
| `verlaengere(S, tol)` | offene Enden um die Toleranz verlängern (für Split Surface) |
| `flaechenAusLinien(N)` | Polygons from lines: kleinste Zyklen über Halbkanten (Sackgassen und Brücken entfallen, Außenrand entfällt) |
| `teilungDCS(S)`, `teilungSplit(S, tol)` | Plot Division „DeCodingSpaces (fast)“ (exakte Endpunkte) bzw. „GH Split Surface“ (Lücken bis `tol` überbrückt) → `{N, plots}` |
| `offeneAnschluesse(N, tol)` | Sackgassen-Enden näher als `tol` an einer anderen Straße (zeichnerische Lücken) |
| `mittelpunkt(poly)`, `plotNeigung(G, poly)` | Polygon Center (Mittel der Ecken); Neigung in Grad dort (Mesh \| Ray → Normale → Angle) |
| `filtere(neigung, n, gewicht)` | Bounds → Remap 0…1 → Smaller Than WeightSlope → `{wert, behalten, lo, hi}` |
| `teile(z, p)`, `leere(z, p)`, `rechneAlles(z, p)`, `fertig(z)` | Plots neu teilen; Neigungen leeren (t = 0); alle auf einmal; alle bestimmt? |
| `plotBei(z, q)`, `bilanz(z)`, `geojson(z)` | Plot unter einem Punkt; Anzahl/Fläche behalten und aussortiert; behaltene Plots als GeoJSON („Bake“) |

Zustand `z`: `S` (Szene), `G` (Gelände), `segmente` (nach Network to Segments), `N` (Netz des gewählten Verfahrens), `plots` (`{poly, kanten}`), `offen` (offene Anschlüsse), `k` (Plots mit Neigung), `neigung` (Grad), `F = {wert, behalten, lo, hi}`, `wahl`.

Im Browser steht `window.SIM` bereit: `SIM.schritt(100)`, `SIM.zuruecksetzen(7)`, `SIM.setze("<parameter>", wert)`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&<parameter>=…`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 katalog/pruefe_apps.py strassen-zu-parzellen` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Eigenes Gelände (Höhenraster, GeoTIFF) und Straßen (GeoJSON) laden statt der Beispielszene.
- Neigung nicht nur im Mittelpunkt, sondern als Mittel oder Höchstwert über die Plotfläche (robuster bei großen Plots am Hangfuß).
- Mindestgröße der Plots (MinBlockSize der Komponente) als Regler; Plots am Netzrand, die nur durch Stiche begrenzt sind, kennzeichnen.
- `flaechenAusLinien`, `teileAnSchnitten` nach `katalog/_gemeinsam/geo.js` verschieben (auch „Parzellen mit eigenem Kantenversatz“ braucht sie).
