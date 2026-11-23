# AGENTS.md · Kürzester Weg im Straßennetz

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner samt `katalog/_gemeinsam/` und `simulationen/_gemeinsam/` in der Ordnerstruktur der Website.

## Worum es geht

Fachlich treue Neuumsetzung des Grasshopper-Moduls „Street Network Shortest Path“ aus dem Parametric Planning Catalogue (DeCodingSpaces – Reinhard König, Martin Bielik, Ekaterina Fuchkina; https://infar-buw.github.io/parametric-planning-catalogue/docs/NetworkShortestPath/). Maßgeblich sind Verfahren, Parameter und Begriffe des Moduls (siehe `QUELLE.md`), nicht die Oberfläche von Grasshopper.

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
katalog/kuerzester-weg/
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
| `strassennetz(zufall, opt)` | Beispielnetz: verzogenes Raster aus `Szenen.stadt` |
| `graph(N, kL, kW)` | dualer Graph (`Geo.segmentGraph`); `nb[i] = [[j, kosten, meter, grad]]`, Kosten mit kleinem Gleichstandsanteil (Länge) |
| `neueSuche(G, art, a, b, fw)` | Suche „einfach“, „dijkstra“ oder „floyd“ von Segment a nach b (Floyd–Warshall nutzt die Matrix `fw`, falls vorhanden) |
| `sucheSchritt(G, S)`, `loese(G, S)` | ein Expansionsschritt (Knoten fest bzw. Runde k); bis zum Ende |
| `kuerzesterWeg(G, art, a, b, fw)` | Segment-IDs des Weges („shortest path segment IDs“) |
| `wegKosten(G, weg, kL, kW)` | custom costs, metric costs (m, Mitte zu Mitte), Summe der Richtungsänderungen |
| `neueMatrix(G)` | Floyd–Warshall-Matrix vor der ersten Runde |
| `betweenness(G)` | Betweenness aller Segmente („Run Calculation“) |
| `setzePunkt(z, p, art, q)` (art "o" oder "d"), `sofort(z, p)` | Ursprung/Ziel versetzen und sofort rechnen |
| `starteSuche(z, p, neueMatrix)`, `bekannt(z)`, `fertig(z)` | Suche neu (t = 0); Abstände vom Ursprung, so weit bekannt; Weg gefunden? |

Zustand `z`: `N`, `G`, `o`, `d` (Punkte), `so`, `sd` (Segmente), `suche` (`art`, `weg`, `fertig`, `schritte`, `dist`/`fest` bzw. `fw`), `fw` (Matrix, bleibt beim Versetzen erhalten), `bc`.
Rechenzeiten misst nur `app.js` (`performance.now()`), das Modell bleibt zeitfrei und testbar.

Im Browser steht `window.SIM` bereit: `SIM.schritt(100)`, `SIM.zuruecksetzen(7)`, `SIM.setze("<parameter>", wert)`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&<parameter>=…`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 katalog/pruefe_apps.py kuerzester-weg` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Mehrere Ursprungs-/Zielpaare gleichzeitig (wie die drei Gruppen der .gh-Datei nebeneinander).
- Echtes Straßennetz laden (GeoJSON) und größere Netze, an denen der Unterschied der Verfahren deutlicher wird.
- Weitere Wertelisten der PInfo-Komponente (z. B. Wegpunkte) und Closeness/Gravity aus FWGetPaths.
