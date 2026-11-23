# AGENTS.md · Vom Straßennetz zum Gebäude

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner samt `katalog/_gemeinsam/` und `simulationen/_gemeinsam/` in der Ordnerstruktur der Website.

## Worum es geht

Fachlich treue Neuumsetzung des Grasshopper-Moduls „Building Generation“ aus dem Parametric Planning Catalogue (DeCodingSpaces; https://infar-buw.github.io/parametric-planning-catalogue/docs/BuildingGeneration/) mit dem Modul „Placement on Parcel“ (DeCodingSpaces – Martin Dennemark; https://infar-buw.github.io/parametric-planning-catalogue/docs/BuildingPlacementOnParcels/) als Option. Maßgeblich sind Verfahren, Parameter und Begriffe des Moduls (siehe `QUELLE.md`), nicht die Oberfläche von Grasshopper.

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
katalog/gebaeude-generierung/
  index.html               statische Seite; lädt die Rahmen-Skripte, modell.js, app.js
  modell.js                reine Logik, kein DOM: erzeuge(param, zufall), schritt(z, param), aendere(z, param, id)
  app.js                   Sim.starte({...}): Parameter, zeichne, legende, kennzahlen, klick, aktionen
  test/*.test.mjs          node --test
```

## Regeln

1. **modell.js bleibt ohne DOM** (`document`, `window`, `canvas` sind tabu) und ohne Abhängigkeiten außer `../_gemeinsam/geo.js` und `../../simulationen/_gemeinsam/zufall.js` (für den inneren Zufallsstrom, damit Verschieben und Parameteränderungen reproduzierbar neu rechnen). Zufall nur über die übergebene Funktion `zufall` (feste Saat → gleicher Lauf). Kein `Math.random()`.
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
| `rechne(z, param)` | ganze Kette neu → `z.K` (strassen, bloecke, behalten, je Block {parzellen, baufenster, gebaeude}, gebaeude, summe), `z.grenzen` (Schrittgrenzen der fünf Stufen), `z.T` |
| `stand(z)`, `sichtbar(z, s)`, `fertig(z)`, `naechsteStufe(z)` | Stufe 0–4 (5 = fertig) und Elemente je Stufe zur Zeit `t` |
| `szene()` | Baufeld (Rand), Startstraßen (IniStreets, fünf Segmente) und Umgebungsstraßen nach dem Katalogbild, Meter, y nach unten |
| `gene`, `baum`, `armRichtung`, `arm`, `wachse`, `grundnetz`, `fuegeStreckeEin`, `imAussenrand` | 1. Street Network Generator: Instruktionsbaum und Wachstum (aus `katalog/netzoptimierung/modell.js`); `wachse` liefert zusätzlich die Arme in Setz-Reihenfolge |
| `flaechenAusLinien(N)` | geschlossene Flächen eines Liniennetzes (aus `katalog/strassen-zu-parzellen/modell.js`) |
| `versetzeKanten(poly, d)` | jede Kante um ihren eigenen Wert versetzen (aus `katalog/parzellen-versatz/modell.js`) |
| `einfach(P)`, `liegtIn(Q, P)` | Prüfungen: einfaches Polygon, Q in P |
| `bloeckeAus(G, p)` | 2. Blocks: Flächen, Versatz −blockOffset, Filter minBlockArea, nach Fläche sortiert |
| `parzellen(block, p)`, `regel`, `teileAchse`, `rechteckWinkel`, `teileKanten`, `istStrasse`, `parzelle`, `amBlock` | 3. Parcels: rekursive Zweiteilung nach Straßenfront (Muster `katalog/parzellen-slicing-tree/`); Parzelle mit Frontkanten, Kante 0 = längste Front |
| `kantenRollen(P, front, tol)`, `baufenster(par, p)` | 4. Buildable Area: Rollen front/seite/hinten, Versatz je Kante |
| `baufensterFront`, `grundflaeche(B, par, p)`, `beschneide`, `rechteck`, `geschosse(far, A_parz, A_grund, fh)` | 5. Building Generation: Typ 0/1/2, Geschosse mit ceil |
| `VORLAGEN`, `vorlageZuordnen(V)`, `kantenRahmen`, `setzeVorlage(par, Z)`, `raenderSchneiden` | Placement on Parcel: Vorlagen, Zuordnung Baukörper → Kante, Übertragung auf die Parzelle |
| `verschiebe(z, p, griff, q)`, `griffBei(z, q, r)` | Ecke des Baufelds oder Stützpunkt einer Startstraße ziehen |

Im Browser steht `window.SIM` bereit: `SIM.schritt(100)`, `SIM.zuruecksetzen(7)`, `SIM.setze("<parameter>", wert)`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&<parameter>=…`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 katalog/pruefe_apps.py gebaeude-generierung` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ablauf und Darstellung

- Ein Schritt ist ein Element der laufenden Stufe: 1 Straßen – ein Arm (in Setz-Reihenfolge des Wachstums), 2 Blöcke – ein Block (behaltene zuerst, nach Fläche), 3–5 Parzellen, Baufenster, Gebäude – je ein Block. Aktionen „Stufe ▸“ (Ende der laufenden Stufe) und „Alles ▸▸“.
- Die Kette wird bei jeder Parameteränderung ganz neu gerechnet (`aendere` → `rechne`); das Straßenwachstum ist zwischengespeichert und wird nur bei geänderten Straßenparametern oder verschobenen Griffen neu gerechnet. Der innere Zufallsstrom hängt an `z.saatIntern` (aus der Saat gezogen).
- `app.js`: Plan links, Axonometrie rechts (unter 900 px Fensterbreite untereinander). Axonometrie = eigene Parallelprojektion (Drehung, Neigung), sichtbare Wände von hinten nach vorn, Dach mit Hof (`evenodd`).

## Ideen für Weiterentwicklung

- Höchstzahl der Geschosse bzw. `floor` statt `ceil` als Schalter (Vorschlag der Toolbox-Doku, legacy-generation.md §8).
- Mehrere Teile eines Blockrands (bei gegenüberliegenden Fronten) einzeln mit Mindestfläche prüfen; Hof als echte Boolesche Differenz.
- Vorlagen selbst zeichnen (rechteckige Grundfläche, Baukörper mit Höhe) wie in der .gh-Datei („Reference new blocks“).
- Kennzahlen je Block (GRZ, GFZ) und Ausgabe als GeoJSON.
- Die neue Toolbox-Kette (Street Growth/Grid, Blocks aus Straßenbreiten, Parcels „frontage strips“, Building Generator mit Abstandsflächen) als zweite Fassung daneben.
