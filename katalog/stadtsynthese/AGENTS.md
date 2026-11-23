# AGENTS.md · Stadtsynthese

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner samt `katalog/_gemeinsam/` und `simulationen/_gemeinsam/` in der Ordnerstruktur der Website.

## Worum es geht

Fachlich treue Neuumsetzung der Generierungskette aus dem Workshop „SSS12 Workshop | Parametric urban planning with Space Syntax and DeCodingSpaces-toolbox for Grasshopper“ (Reinhard König, Martin Bielik, Yufan Miao, 2019; Eintrag im DeCodingSpaces Lab: https://toolbox.decodingspaces.net/sss12-workshop-parametric-urban-planning-with-space-syntax-and-decodingspaces-toolbox-for-grasshopper/), Dateien `190705_DS_01–03`, mit den Kennzahlen des eCAADe-Workshops 2018 (`180917_Computational Urban Synthesis`). Maßgeblich sind Verfahren, Parameter und Begriffe der Schaltung (siehe `QUELLE.md`), nicht die Oberfläche von Grasshopper.

**Abgrenzung:** Diese App ist die *Workshop-Kette* Straßen → Betweenness → Blöcke → Parzellen → Baufenster → Gebäude mit Space-Syntax-Kennzahlen. Die Gebäudetypologien selbst (Building Generation des Parametric Planning Catalogue, mehr Typen und Regeln) behandelt die Katalog-App `gebaeude-generierung`; hier steht nur, was die Workshop-Dateien nutzen.

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
katalog/stadtsynthese/
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
7. **Namensnennung** bleibt: „Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic“, Lizenz CC BY 4.0; Vorbild (Workshop im DeCodingSpaces Lab, König, Bielik, Miao 2019) nennen.
8. **Lizenz der Toolbox**: Die DeCodingSpaces-Toolbox steht unter GPL-3.0 – Verfahren ablesen ja, Code abschreiben oder Zeile für Zeile übersetzen nein.

## Schnittstelle des Modells

| Funktion | Aufgabe |
|---|---|
| `erzeuge(param, zufall)` | neuer Zustand `z` (enthält `t` = Schrittzahl) |
| `schritt(z, param)` | ein Schritt; erhöht `z.t` |
| `aendere(z, param, id)` | Kette bis zum aktuellen Schritt neu rechnen (`rechneBis`); Darstellungsparameter (`DARSTELLUNG`) ändern nichts |
| `fertig(z)`, `rechneAlles(z, p)`, `rechneBis(z, p, t)` | Ende (Stufe 8), ganze Kette, Kette bis Schritt t |
| `szene(zufall)`, `teileSzene(S, anschluss)` | Umgebung (Szenen.stadt 900 × 640 m), Gebiet, Anschlussstraßen, Park, Hochschule, Haltestelle |
| `grundnetz`, `gene`, `baum`, `armRichtung`, `arm`, `wachstumStart`, `wachstumEbene` | 1 Street Network Synthesis (Instruktionsbaum, Wachstum Ebene für Ebene; aus `../netzoptimierung`) |
| `sackgassenEntfernen(N, n)` | 2 Cul de sac removal |
| `betweenness(N)` | 3 CityGraph, metrisch, Start/Ziel zählen (`Geo.richtungsGraph`, `Geo.segmentBetweennessVon`) |
| `flaechenAusLinien`, `versetzeKanten`, `vereinfache`, `bloeckeAusNetz` | 4 Polygons from lines, Custom offset (BC^0,5 · 0,12), Polyline Collapse/Simplify, Zentralität je Block |
| `parzelliere(block, breite)`, `parzellenBreite(b, p)` | 5 Slicing Tree (aus `../parzellen-slicing-tree`), parcelWidth |
| `kantenRollen`, `baufenster` | 6 Buildable Area (front/side/back, Rücksprünge) |
| `gebaeudeTyp`, `geschosse`, `frontLinie`, `grundriss`, `schneideKonvex`, `ohneKonvex` | 7 Building Generation (Typ, FAR, Geschosse, Grundrisse) |
| `kennzahlen(z, p)`, `netzKennzahlen(z)`, `kreuzungen`, `mittlereIntegration`, `mittlererWeg`, `verknuepft` | 8 Kennzahlen des eCAADe-Workshops |
| `griffBei`, `verschiebe` | Ecken des Gebiets ziehen |

Zustand: `z.stufe` (0…8, siehe `STUFEN`), `z.W` (Wachstum: Graph `G`, Ebene `nr`), `z.N` (Netz nach Sackgassen), `z.bc`, `z.bloecke` (`poly`, `roh`, `kanten`, `versatz`, `c` = größte √BC, `z` = Zentralität 0…1, `breite`), `z.plaetze`, `z.parzellen` (`poly`, `A`, `block`, `rollen`, `ba`), `z.gebaeude` (`teile`, `A`, `typ`, `far`, `geschosse`, `hoehe`), `z.kz`.

Im Browser steht `window.SIM` bereit: `SIM.schritt(100)`, `SIM.zuruecksetzen(7)`, `SIM.setze("<parameter>", wert)`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&<parameter>=…`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 katalog/pruefe_apps.py stadtsynthese` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Blöcke zusammenlegen wie im eCAADe-Workshop (MergeNeighbours: Mindestblockfläche 6000 m², Snap 40 m) – als Wegfall der Straße zwischen kleinem Block und Nachbar vor der Betweenness.
- Die zwei Parametersätze der Parzellierung aus DS_03 (Gruppen nach Blockfläche und Formfaktor, „Graph 1/2“) genauer nachbilden, sobald die Zuordnung lesbar ist.
- Gewichtete Betweenness mit Ursprüngen/Zielen (Hochschule, Haltestelle) wie im eCAADe-Workshop; Distanzabfall (Beta 0,013).
- Evolutionäre Optimierung der Kette (dritter Teil des Workshops) mit den Kennzahlen als Zielen – Muster `../netzoptimierung/`.
- Kontext (Umgebung) für die Betweenness mitrechnen, damit die Anschlussstraßen zu Hauptstraßen werden.
- Export der Baukörper (GeoJSON mit Höhen) für Rhino oder QGIS.
