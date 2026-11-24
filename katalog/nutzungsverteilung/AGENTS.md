# AGENTS.md · Nutzungsverteilung

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner samt `katalog/_gemeinsam/` und `simulationen/_gemeinsam/` in der Ordnerstruktur der Website.

## Worum es geht

Fachlich treue Neuumsetzung des Grasshopper-Moduls „Land Use Distribution“ aus dem Parametric Planning Catalogue (DeCodingSpaces – Reinhard König, Martin Dennemark; https://infar-buw.github.io/parametric-planning-catalogue/docs/LandUseDistribution/). Maßgeblich sind Verfahren, Parameter und Begriffe des Moduls (siehe `QUELLE.md`), nicht die Oberfläche von Grasshopper.

## Aufbau

```
simulationen/_gemeinsam/   Rahmen aller Lab-Apps (nicht pro App kopieren)
  zufall.js                Zufall.zufall(saat) → () => [0, 1), dazu .ganz(n), .zwischen(a, b)
  sim.js                   Sim.starte(cfg): Ablauf, Bedienfeld, Zeichenfläche, Sprache, Hell/Dunkel, window.SIM
  sim.css                  Gestaltung wie das KI Lab
katalog/_gemeinsam/        gemeinsam für die Apps des Parametric Planning Catalogue
  geo.js                   Geo: Polygone, Strahlen, Isovist, Voronoi, Netze, Dijkstra, Floyd–Warshall, Betweenness
  szenen.js                Szenen: Stadt (Straßen, Blöcke, Gebäude, Platz) und Gelände (Höhenraster) mit fester Saat
  karte.js                 Karte: Farbskalen, Polygone, Pfeile, Gelände mit Schummerung und Höhenlinien; Gelände-Zwischenspeicher gelaendeGespeichert (genutzt in app.js)
katalog/nutzungsverteilung/
  index.html               statische Seite; lädt die Rahmen-Skripte, modell.js, app.js
  modell.js                reine Logik, kein DOM: erzeuge(param, zufall), schritt(z, param), aendere(z, param, id)
  app.js                   Sim.starte({...}): Parameter, zeichne, legende, kennzahlen, klick, aktionen
  test/*.test.mjs          node --test
```

## Regeln

1. **modell.js bleibt ohne DOM** (`document`, `window`, `canvas` sind tabu) und ohne Abhängigkeiten außer `../_gemeinsam/geo.js`, `szenen.js` und `../../simulationen/_gemeinsam/zufall.js`. Die Szene zieht ihren Zufall aus der übergebenen Funktion `zufall`; das Glücksrad der Verteilung hat einen eigenen Zufall `Zufall.zufall(z.laufSaat)` (Saat aus `zufall`), damit ein Lauf nach einer Parameteränderung gleich wiederholt werden kann. Kein `Math.random()`.
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
| `matrixAusText(s)`, `matrixAlsText(M)`, `setzeMatrix(s, i, n, v)` | Gewichtsmatrix Nutzung × Nutzung (Relations, Zeile = Nutzung, Spalte = Bezug) ↔ Text der Adresse `m=…`; Grenzen −1…1, Raster 0.05, ungültig = Original. In `app.js` ersetzt eine Tabelle die (versteckte) Auswahl des Parameters `m`; Änderungen gehen über `SIM.setze("m", text)` |
| `szene(zufall)` | Beispielstadt (`Szenen.stadt`, 16 × 12 Knoten), Blöcke = Parzellen, Hierarchie der Straßen (1 = Rand, mittlere Zeile/Spalte; sonst 2), Gelände |
| `netzGraph(strassen, hierarchie, p)` | `Geo.netz` → `Geo.segmentGraph(kL, kW)`, Kosten + `kH · (h_i + h_j) / 2` (Additional Edge Weight) |
| `segmentJeParzelle(mitten, schwerpunkte)` | Segment, dessen Mitte dem Parzellenschwerpunkt am nächsten liegt (Closest Point) |
| `netzKennwerte(n, adj, seg)` | Closeness n/Σd und Betweenness (Brandes, Gewicht = Parzellen je Segment, Endsegmente zählen mit); Kosten je Ursprung |
| `kriterien(K, seg, neigung)` | Weight Criteria je Parzelle auf 0…1: Closeness, log(Betweenness), flache Lage |
| `gewichteteWerte(V, w)` | Mittel von Gewicht × Kriterium, gemeinsam auf 0…1 (C# „weightedValues“, Average, Remap) |
| `ersteVerteilung(W)` | First Profile Distribution: 1 auf der (den) besten Parzelle(n) je Profil |
| `distanzen(seg, mitten, kosten, variante)` | Abstände Parzelle–Parzelle (Luftlinie der Segmentmitten oder Netzkosten), normiert auf 0…1 |
| `formel(p)`, `wahrnehmung(d, p)` | Ausdruck der Perceived Distance Function und ihr Wert |
| `attraktivitaet(D, W, Pw, rel)` | Attraktivität je Profil und Parzelle (beide C#-Skripte, normiert) |
| `jeIteration(maxPop, it)`, `maxDichte(flaechen, maxPop, leer)` | Einheiten je Iteration; Kapazität je Parzelle |
| `verteile(D, att, add, dichte, rnd, det)` | eine Verteilung: volle Parzellen 0, Glücksrad oder deterministisch, density control |
| `wegeSchaetzung(D, dn)`, `wegeGleich(D, dn)` | simple traffic estimation (EstimTripDist), aktuell und bei gleichmäßiger Verteilung |
| `neuerLauf(z, p)`, `rechneBis(z, p, k)`, `fertig(z, p)` | Lauf von vorn (erste Verteilung); bis Iteration k rechnen; Iterations erreicht? |
| `parzelleBei(z, q)`, `bilanz(z)` | Parzelle am Punkt; Kennzahlen je Profil (Summe, Parzellen, Fläche, Zentralität …) |

Zustand `z`: `parz` ({poly, flaeche, mitte}), `netz` ({N, G, hier, adj}), `seg`, `K` ({cc, bc, kosten}), `V` (3 Kriterien), `W` (gewichtete Werte je Profil), `dn` (normierte Abstände nP·nP), `Pw` (wahrgenommen), `D` (Verteilung je Profil, Int32Array), `att`, `dichte`, `add`, `iter`, `verlauf` ([{summe, wege, gleich}]), `verfallen`, `auswahl`.

Im Browser steht `window.SIM` bereit: `SIM.schritt(100)`, `SIM.zuruecksetzen(7)`, `SIM.setze("<parameter>", wert)`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&<parameter>=…`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 katalog/pruefe_apps.py nutzungsverteilung` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Parzellen statt Blöcken: Blöcke mit dem Slicing Tree oder Voronoi teilen (wie andere Apps des Katalogs), echtes Kataster als GeoJSON laden.
- Weitere Kriterien („To New Profile“, „Add new Profile“ in der .gh-Datei): ein viertes Profil, weitere Weight Criteria (Lärm, Grün, Wasser).
- Attraktivität während einer Iteration nachführen, damit keine Einheiten an voller Parzelle verfallen (im Skript als Hinweis vermerkt).
- Ergebnis als GeoJSON (Nutzungsanteile je Parzelle) ausgeben.
