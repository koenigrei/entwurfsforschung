# AGENTS.md · Parzellierung nach Fläche

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner samt `katalog/_gemeinsam/` und `simulationen/_gemeinsam/` in der Ordnerstruktur der Website.

## Worum es geht

Fachlich treue Neuumsetzung des Grasshopper-Moduls „Parcellation By Area“ aus dem Parametric Planning Catalogue (DeCodingSpaces – Martin Dennemark; https://infar-buw.github.io/parametric-planning-catalogue/docs/ParcellationByArea/). Maßgeblich sind Verfahren, Parameter und Begriffe des Moduls (siehe `QUELLE.md`), nicht die Oberfläche von Grasshopper.

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
katalog/parzellen-flaeche/
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
| `quartier(zufall)` | Beispielquartier aus `Szenen.stadt` (nur Blöcke, gegen den Uhrzeigersinn) |
| `flaechenListe(stufen)` | Anteile der Liste „Individual Area“: Range → Consecutive Domains → Remap = `k / (1 + … + s)` |
| `richtungVonLaengsterKante(poly)` | `dir` = längste Kante × Z (Einheitsvektor) |
| `schar(P, i, j, T)` | Linienschar zwischen Kante i und j mit Seitenfläche T: u → {pA, pB, u, v} |
| `gueltig(P, i, j, pA, pB)` | Schnitt kreuzt den Rand nur an Kante i und j, Mitte im Polygon |
| `besterSchnittPaar(P, i, j, T, modus, dir)` | beste Linie eines Kantenpaares (Abtasten + Goldener Schnitt) |
| `teileAn(P, i, j, pA, pB)` | Polygon an der Linie teilen → [zwischen, außen] |
| `schneide(P, ziel, modus, dir)` | ein Schnitt (split der C#-Skripte) → {parzelle, rest, linie, laenge} oder null |
| `zielflaechen(A, p)` | Zielflächen je Schnitt (gleich A/n oder Liste) |
| `parzelliere(poly, p)` | ganzen Block teilen (Tests) |
| `fertig(z)`, `parzellenVon(b)`, `blockBei(z, q)` | Ende des Plans, Parzellen eines Blocks, Block unter einem Punkt |

Im Browser steht `window.SIM` bereit: `SIM.schritt(100)`, `SIM.zuruecksetzen(7)`, `SIM.setze("<parameter>", wert)`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&<parameter>=…`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 katalog/pruefe_apps.py parzellen-flaeche` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Die Dreieck-/Trapez-Formeln von polysplit genau übernehmen und mit der Linienschar vergleichen (sollten gleich kurze oder kürzere Schnitte liefern).
- Flächenliste frei eingeben (Werte statt Range), Mindestbreite an der Straße als weiteres Gültigkeitskriterium.
- Eigene Blöcke zeichnen; Ergebnis als GeoJSON herunterladen.
