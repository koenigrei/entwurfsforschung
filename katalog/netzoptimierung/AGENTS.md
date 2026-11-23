# AGENTS.md · Straßennetz-Optimierung

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner samt `katalog/_gemeinsam/` und `simulationen/_gemeinsam/` in der Ordnerstruktur der Website.

## Worum es geht

Fachlich treue Neuumsetzung des Grasshopper-Moduls „Street Network Optimization“ aus dem Parametric Planning Catalogue (DeCodingSpaces – Reinhard König, Martin Bielik, Ekaterina Fuchkina; https://infar-buw.github.io/parametric-planning-catalogue/docs/NetworkOptimization/). Maßgeblich sind Verfahren, Parameter und Begriffe des Moduls (siehe `QUELLE.md`), nicht die Oberfläche von Grasshopper.

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
katalog/netzoptimierung/
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
| `szene()` | Beispielszene: Rand (Fünfeck), drei Startstraßen (Polylinien), Umgebungsstraßen; Meter, y nach unten |
| `grundnetz(S)`, `fuegeStreckeEin(G, a, b, art, tol)` | Rand und Startstraßen als Graph (1 m Fang, Kreuzungen geteilt); Wurzeln = Stützpunkte der Startstraßen |
| `gene(zufall, p)`, `baum(zufall, nWurzeln, p)` | Gene eines Knotens; zufälliger Instruktionsbaum (Street Network Chromosome) |
| `kreuze(a, b, zufall)`, `mutiere(b, zufall, p, pGen)`, `kopiereBaum(b)`, `zaehle(b)` | Kreuzung über Teilbäume der Arm-Plätze; Mutation durch Neuziehen von Genen |
| `armRichtung(P, pv, ref, nb, teiler)` | Richtung eines neuen Arms (geradeaus / größte Lücke / < 80° keiner / ≥ 260° Versatz) |
| `arm(G, S, pv, ziel, minDist, maxArme)` | einen Arm einfügen: Knoten- und Kantenfang, erster Schnitt, Rand schließt → `{v, zu}` oder `null` |
| `wachse(baum, S, p, stat?)` | ChromosomeMapper: Baum → Straßensegmente (`stat` zählt optional die Gründe, aus denen Arme ausbleiben) |
| `naehe(G)`, `bewerte(segmente, p)` | Closeness `n / Σd` je Segment (gerichteter Segmentgraph aus `Geo.richtungsGraph`, norm „dcs2020“); Fitness f₁ = 10 000 / L, f₂ = max. Closeness |
| `dominiert(a, b)`, `front(liste)`, `spea2(pop, mu)` | Pareto-Dominanz (beide Ziele minimiert), nicht dominierte Menge, SPEA2-Umweltauswahl → `{archiv, F}` |
| `nachkommen(eltern, p, zufall, nWurzeln)` | OffspringGenerator: Random Generation, Crossover Rate, Mutation Rate, Shuffle Chromosomes |
| `individuum(z, baum, herkunft, gen, p)`, `generationNull(z, p)` | ein bewertetes Netz (Geometrie kompakt als `Float32Array`); Generation 0 aus Nr Parents Zufallsnetzen |
| `sortiert(z)`, `variante(z, i)`, `finde(z, id)`, `waehle(z, id)` | Archiv in der Reihenfolge von Show Variant (f₁ + f₂ aufsteigend); Auswahl der gezeigten Variante |
| `fertig(z, p)`, `griffBei(z, q, r)`, `verschiebe(z, p, griff, q)` | Ende nach Iterations/Generations; Griff (Randecke, Stützpunkt) suchen und verschieben (beginnt neu) |

Zustand `z`: `S` (Szene), `zufall`, `gen` (Generation), `alle` (alle bewerteten Individuen `{id, g, herkunft, f1, f2, L, n, seg, cc, baum}` – `baum` nur im Archiv), `archiv` (Eltern), `front` (Pareto-Front aller Individuen), `wahl` (id der gezeigten Variante), `wahlFest` (per Klick gewählt).

Im Browser steht `window.SIM` bereit: `SIM.schritt(100)`, `SIM.zuruecksetzen(7)`, `SIM.setze("<parameter>", wert)`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&<parameter>=…`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 katalog/pruefe_apps.py netzoptimierung` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Weitere PISA-Selektoren (NSGA-II, HypE, IBEA) als Auswahl, um den Einfluss des Selektors zu zeigen; Hypervolumen je Generation als Verlaufskurve (wie die Quick Graphs des Rekorder-Clusters).
- Rand und Startstraßen frei zeichnen oder als GeoJSON laden; Gebäude als Hintergrund.
- Zweite Lesart der Closeness (mittlere Tiefe Σd / n) als Schalter, damit die beiden Ziele gegeneinander stehen.
- Bestes Netz als GeoJSON ausgeben (entspricht „Bake“).
