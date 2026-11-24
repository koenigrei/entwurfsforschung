# AGENTS.md · Wassernetz: Erzeugung und Analyse

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner samt `katalog/_gemeinsam/` und `simulationen/_gemeinsam/` in der Ordnerstruktur der Website.

## Worum es geht

Fachlich treue Neuumsetzung des Grasshopper-Moduls „Water Network Generation and Analysis“ aus dem Parametric Planning Catalogue (DeCodingSpaces – Martin Dennemark; https://infar-buw.github.io/parametric-planning-catalogue/docs/WaterNetworkGenerationAndAnalysis/). Maßgeblich sind Verfahren, Parameter und Begriffe des Moduls (siehe `QUELLE.md`), nicht die Oberfläche von Grasshopper.

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
  hierarchie.js            Hierarchie: Straßenhierarchie aus gewichteter Betweenness (hier die vereinfachte Fassung analyseEinfach)
  hydraulik.js             Hydraulik: Rohrnetzlöser ohne DOM (neu, iteration, loese, ergebnisse) – auch von ../wasserleitung/ benutzt;
                           Tests in _gemeinsam/test/hydraulik.test.mjs mit den Prüfnetzen Testnet.inp, hydroanalysis1.inp
katalog/wassernetz/
  index.html               statische Seite; lädt die Rahmen-Skripte, die gemeinsamen Dateien, modell.js, app.js
  modell.js                reine Logik, kein DOM: erzeuge(param, zufall), schritt(z, param), aendere(z, param, id)
  app.js                   Sim.starte({...}): Parameter, zeichne, legende, kennzahlen, klick, aktionen
  test/*.test.mjs          node --test
```

## Regeln

1. **modell.js bleibt ohne DOM** (`document`, `window`, `canvas` sind tabu) und ohne Abhängigkeiten außer `../_gemeinsam/geo.js`, `szenen.js`, `hierarchie.js` und `hydraulik.js` (gemeinsam mit anderen Apps; Änderungen dort mit eigenem Test in `_gemeinsam/test/`, danach `node --test` in `_gemeinsam` und in allen Apps, die die Datei nutzen). Zufall nur über die übergebene Funktion `zufall` (feste Saat → gleicher Lauf). Kein `Math.random()`.
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
| `szene(zufall)` | Gelände, Stadt, Straßennetz mit Höhen je Knoten, Kantenlängen im Raum, Straßenhierarchie, Blöcke mit Schwerpunkt, Fläche, nächstem Knoten |
| `strassenhierarchie(N, poi, eingang)`, `gewichteHierarchie`, `betweenness`, `klassifiziere`, `naechstesSegment` | Straßenhierarchie: Verweise auf `../_gemeinsam/hierarchie.js` (`Hierarchie.analyseEinfach`, `gewichteSumme`, `betweennessEinfach`, `klassifiziere(…).klasse`) und `Geo.naechstesSegment` |
| `kantenGewicht(klasse, p)`, `bedarfBlock(A, p)` | Gewicht je Straßenklasse; Bedarf eines Blocks in L/s = DemandPerHousehold [L/Tag] × Haushalte / 86 400 × Spitzenfaktor (5 ergibt den Faktor 0.00005787 der Datei) |
| `wegebaum(Sz, s, cost)`, `kantenweg(baum, N, t)` | Dijkstra-Baum vom Behälter; Kanten des Weges zu einem Knoten |
| `kombiniere(wegeL, wegeH, laenge, schwelle)` | Wassernetz: Hierarchiewege + Zusatzkanten der Längenwege bis zur Schwelle (Set Difference, Mass Addition, Remap, Cull) |
| `hydraulikNetz(z, p)` | EPANET-Netz wie Write Hydrology Network (Behälter, Verbraucher am nächsten Knoten, Rohre) |
| `dimensioniere(z, p)` | ein Durchgang der Schleife: Analyse, Rohre mit v > Max. Velocity einen Durchmesser größer |
| `schritt`, `rechneAlles`, `fertig` | Phasen „wege“ → „netz“ → „dimension“ → „analyse“ |
| `setzeTank(z, p, q)` | Hochbehälter versetzen (nächster Straßenknoten) |
| `druckBar(z, c)`, `knotenWert(z, c, art)`, `bilanz(z, p)` | Druck je Verbraucher in bar (Round(m) / 10), Knotenwerte, Kennzahlen (Maschen, Durchmesser, Druckbereich …) |
| `Hydraulik.neu/iteration/loese/ergebnisse/bilanzfehler` | Löser (`../_gemeinsam/hydraulik.js`) |

Zustand `z`: `Sz` (Szene), `tank`, `tankKnoten`, `verbraucher`, `baumL`/`baumH`, `wegeL`/`wegeH`, `phase`, `k`, `K` (Kombination), `rohre` (Kantenindizes), `dIdx` (Index im Gene Pool je Rohr), `durchgang`, `vergroessert`, `netz`, `S`, `erg`, `fertig`.

Im Browser steht `window.SIM` bereit: `SIM.schritt(100)`, `SIM.zuruecksetzen(7)`, `SIM.setze("<parameter>", wert)`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&<parameter>=…`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 katalog/pruefe_apps.py wassernetz` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Echtes Straßennetz und Gelände laden (GeoJSON, Höhenmodell); Behälter als Reservoir oder mehrere Behälter.
- Kosten des Netzes (Rohrlänge × Preis je Durchmesser) gegen Ausfallsicherheit (Maschen) abwägen; Ausfall einzelner Rohre simulieren.
- Druckzonen oder Druckminderer, wenn Drücke über 16 bar liegen.
