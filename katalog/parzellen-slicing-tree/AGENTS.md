# AGENTS.md · Parzellierung mit Slicing Tree

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner samt `katalog/_gemeinsam/` und `simulationen/_gemeinsam/` in der Ordnerstruktur der Website.

## Worum es geht

Fachlich treue Neuumsetzung des Grasshopper-Moduls „Parcellation Slicing Tree“ aus dem Parametric Planning Catalogue (DeCodingSpaces – Martin Dennemark; https://infar-buw.github.io/parametric-planning-catalogue/docs/ParcellationSlicingTree/). Maßgeblich sind Verfahren, Parameter und Begriffe des Moduls (siehe `QUELLE.md`), nicht die Oberfläche von Grasshopper.

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
  generierung.js           Generierung: Instruktionsbaum und Straßenwachstum, Slicing Tree (STreeExtended) und Parcels (PG)
katalog/parzellen-slicing-tree/
  index.html               statische Seite; lädt die Rahmen-Skripte, modell.js, app.js
  modell.js                reine Logik, kein DOM: erzeuge(param, zufall), schritt(z, param), aendere(z, param, id)
  app.js                   Sim.starte({...}): Parameter, zeichne, legende, kennzahlen, klick, aktionen
  test/*.test.mjs          node --test
```

## Regeln

1. **modell.js bleibt ohne DOM** (`document`, `window`, `canvas` sind tabu) und ohne Abhängigkeiten außer `../_gemeinsam/geo.js`, `generierung.js` und `szenen.js`. Zufall nur über die übergebene Funktion `zufall` (feste Saat → gleicher Lauf). Kein `Math.random()`.
2. **Jede Regeländerung bekommt einen Test** in `test/`. Vor dem Abschluss: `node --test` im App-Ordner muss grün sein.
3. **Abweichungen vom Original** in `QUELLE.md` unter „Bewusst geändert“ eintragen.
4. **Keine Inhalte fremder Server**: keine CDNs, keine Webfonts von Dritten, keine iframes.
5. **Texte** auf Deutsch, Bedienung zweisprachig: `{de, en}`-Objekte in `app.js`, in `index.html` Paare `<span lang="de">…</span><span lang="en">…</span>`.
6. **Gestaltung** nur über `sim.css` und die Farben im Objekt `F` (wechselt mit Hell/Dunkel); Farbskalen aus `Karte`.
7. **Namensnennung** bleibt: „Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic“, Lizenz CC BY 4.0; Vorbild Parametric Planning Catalogue (MIT) nennen.

## Schnittstelle des Modells

Drehung, Straßenkanten, Teilungsregel (Variante „stx“), Schnitt und Baum stehen in `../_gemeinsam/generierung.js` (Generierung: `sliceRegel`, `sliceTeile`, `sliceBaum`); das Quartier ist `Szenen.quartier`. Die Namen bleiben als Exporte von modell.js erhalten.

| Funktion | Aufgabe |
|---|---|
| `erzeuge(param, zufall)` | neuer Zustand `z` (enthält `t` = Schrittzahl) |
| `schritt(z, param)` | ein Schritt; erhöht `z.t` |
| `aendere(z, param, id)` | optional: Parameter ohne Neustart übernehmen |
| `quartier(zufall)` | Beispielquartier aus `Szenen.stadt` (nur Blöcke, gegen den Uhrzeigersinn) |
| `rechteckWinkel(poly)` | Drehwinkel, der die lange Seite des kleinsten umschließenden Rechtecks waagrecht legt |
| `kantenVon(poly)`, `istStrasse(k, wurzel, skal)`, `teileKanten(poly, wurzel, skal)` | Kanten; Straßenkante = quasi-kollinear (< 0,01 rad, Abstand < scalingFactor) mit einer Blockkante; Straßen- und Innenkanten, längste zuerst |
| `front(poly, block, skal)` | Länge der Straßenkanten eines Teils |
| `regel(poly, wurzel, p)` | Teilungsregel: längste Straßenkante mit splitRate·|e| > parcelWidth → Schnitt „V“ oder „H“; Rücken-an-Rücken-Regel; sonst Blatt |
| `teile(poly, r)` | Zweiteilung an der achsparallelen Geraden → {kinder, linie} oder null |
| `baum(block, p)` | Slicing Tree eines Blocks (gedrehter Rahmen, Ergebnis in Weltkoordinaten) → Knoten {id, poly, ebene, eltern, kinder, op, linie, ruecken} |
| `blaetter(K)` | Parzellen (Blätter) |
| `teileZurZeit(b, t)`, `geschnitten(k, t)`, `letzter(z)` | Zustand zur Schrittzahl t |
| `baumLayout(K)` | Lage der Knoten im Baumdiagramm |
| `CUSTOMIZED`, `BEDEUTUNG` | die 18 Werte der Komponente „Customized Parameters“ und wofür die vom Slicing Tree nicht gelesenen da sind |

Im Browser steht `window.SIM` bereit: `SIM.schritt(100)`, `SIM.zuruecksetzen(7)`, `SIM.setze("<parameter>", wert)`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&<parameter>=…`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 katalog/pruefe_apps.py parzellen-slicing-tree` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Wahlweise das Verfahren der neuen Toolbox (Parcels, Methode `recursive`: Schnitt an der Flächenmitte ± Unregelmäßigkeit, Ziel-Fläche) daneben zeigen.
- NoStreets und StreetOffset der Komponente „Parcels“ ergänzen (Blockkanten ohne Straße, Versatz).
- Restflächen ohne Straße einem Nachbarn mit Straßenfront zuschlagen.
