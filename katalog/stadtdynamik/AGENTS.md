# AGENTS.md · Stadtdynamik

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner samt `katalog/_gemeinsam/` und `simulationen/_gemeinsam/` in der Ordnerstruktur der Website.

## Worum es geht

Fachlich treue Neuumsetzung der vier Grasshopper-Modelle von „Urban Simulation with Grasshopper for Rhino3D“ aus dem DeCodingSpaces Lab (Reinhard König, Martin Bielik, Sven Schneider, SimAUD 2018; https://toolbox.decodingspaces.net/urban-simulation-with-grasshopper/): Rasterstadt und Netzstadt (Standortmodelle mit Attraktivität, Roulette-Rad und Verkehrsschätzung) sowie Wolf-Schaf und Stadtsystem (Systemdynamik). Die Auswahl „Modell“ wählt die Fassung und setzt deren Voreinstellungen (`Modell.FASSUNGEN`, Feld `folgen` in app.js). Maßgeblich sind die C#-Skripte und Evaluate-Ausdrücke der Dateien (siehe `QUELLE.md`), nicht die Oberfläche von Grasshopper.

## Aufbau

```
simulationen/_gemeinsam/   Rahmen aller Lab-Apps (nicht pro App kopieren)
  zufall.js                Zufall.zufall(saat) → () => [0, 1), dazu .ganz(n), .zwischen(a, b)
  sim.js                   Sim.starte(cfg): Ablauf, Bedienfeld, Zeichenfläche, Sprache, Hell/Dunkel, window.SIM
  sim.css                  Gestaltung wie das KI Lab
katalog/_gemeinsam/        gemeinsam für die Apps des Parametric Planning Catalogue und des DeCodingSpaces Lab
  geo.js                   Geo: Polygone, Strahlen, Isovist, Voronoi, Netze, Dijkstra, Floyd–Warshall, Betweenness
  szenen.js                Szenen: Stadt (Straßen, Blöcke, Gebäude, Platz) und Gelände (Höhenraster) mit fester Saat
  karte.js                 Karte: Farbskalen, Polygone, Pfeile, Gelände mit Schummerung und Höhenlinien
  axonometrie.js           Axo: Prismen in Axonometrie/Schrägansicht – Projektion, Malerverfahren, Wände und Dach, Drehen per Ziehen (nur app.js)
katalog/stadtdynamik/
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
7. **Namensnennung** bleibt: „Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic“, Lizenz CC BY 4.0; Vorbild (DeCodingSpaces Lab, König/Bielik/Schneider 2018) nennen.
8. **Kein Code aus der DeCodingSpaces-Toolbox (GPL-3.0)** abschreiben; Definitionen und Formeln ablesen ist erlaubt.

## Schnittstelle des Modells

Die Säulen (Schrägansicht, Prismen) in app.js zeichnet `../_gemeinsam/axonometrie.js` (`Axo.schraeg`, `Axo.prisma`).

| Funktion | Aufgabe |
|---|---|
| `erzeuge(param, zufall)` | neuer Zustand `z` (enthält `t` = Schrittzahl) |
| `schritt(z, param)` | ein Schritt; erhöht `z.t` |
| `aendere(z, param, id)` | optional: Parameter ohne Neustart übernehmen |
| `STANDARD`, `FASSUNGEN` | Voreinstellungen; je Modell (`raster`, `netz`, `wolfschaf`, `stadtsystem`) die Werte der .gh-Datei |
| `fertig(z, p)` | Ende nach `iterationen` (Repeat der Anemone-Schleife) |
| `wahrnehmung(d, a, schwelle)`, `summand(p, art)` | `p = (1 − d)^a`, unter der Schwelle 0; „sucht“ → p, „meidet“ → 1 − p |
| `wahrnehmungsMatrizen(Dn, n, p)` | Summanden der vier Beziehungen pp, pw, wp, ww für alle Ortspaare (vorausberechnet) |
| `attraktivitaet(Wm, n, P, W, g)` | C#_Attractivity: Summen, W wie im Original durch maxP geteilt, Normierung `(v − min)/max` |
| `normiere(v)`, `roulette(att, summe, r)`, `verkehr(D, n, P, W)` | Normierung, Roulette-Rad, Verkehrsschätzung `Σ d·P·W/ΣW` |
| `rasterOrte()`, `manhattan(orte)`, `rasterRef(orte, q)` | Rasterstadt 12 × 8 (Index = x · 8 + y), Distanzen, Startzelle zum RefPoint |
| `netzStadt(zufall, p)`, `parzelliere(block, breite)` | Beispielstadt, Blöcke in Parzellen, Zuordnung zum nächsten Segment |
| `segmentDistanzen(N, kL, kW)`, `netzDistanzen(orte, Ds, m)`, `normierteDistanzen(D)` | Netzdistanzen über `Geo.richtungsGraph` (dcs2020) |
| `wolfSchafSchritt(S, W, p)`, `stadtSystemSchritt(P, J, F, p)`, `mangel(x)` | Systemdynamik, Reihenfolge wie die Verdrahtung |
| `setzeStart(z, p, q)`, `naechsterOrt(z, q)` | Startort (RefPoint) per Klick versetzen und neu beginnen |
| `bilanz(z, maxD)` | Kennwerte: Summen, Verkehr, Weg je Einwohner, besetzte/volle Orte, Abstand von Wohnen und Arbeit zur Mitte |

Zustand der Standortmodelle: `z.orte[i] = {poly, mitte, seg?}`, `z.P`, `z.W` (Int32Array), `z.D`/`z.Dn` (Distanzen n × n), `z.attP`/`z.attW`, `z.verlauf = [[ΣP, ΣW, Verkehr], …]`. Systemdynamik: `z.S`, `z.W` bzw. `z.P`, `z.J`, `z.F` und `z.verlauf`.
`app.js` blendet die Regler der nicht gewählten Modelle aus (Feld `nur` je Parameter).

Im Browser steht `window.SIM` bereit: `SIM.schritt(100)`, `SIM.zuruecksetzen(7)`, `SIM.setze("<parameter>", wert)`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&<parameter>=…`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 katalog/pruefe_apps.py stadtdynamik` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Dritte Stufe aus „Dynamic Urban Development Model“ (https://toolbox.decodingspaces.net/dynamic-urban-development-model/): Blöcke, deren Dichte eine Schwelle überschreitet (DensityThresh 5), mit Parzellen und Gebäuden bebauen (Kette der App „stadtsynthese“, sobald vorhanden); dort Wahrnehmung `(1 − d)^2` mit Schwelle 0,25 für beide Nutzungen, 10 + 10 Einheiten, 20 Iterationen.
- Echtes Straßennetz (z. B. Weimar) als GeoJSON laden statt der Beispielstadt.
- Weitere Attraktivitätsfunktionen aus den auskommentierten Zeilen des Originals, z. B. „Leute meiden Leute, suchen aber Arbeit“ (Gewicht 0,3, Exponent 2) – mit den Reglern schon einstellbar, könnte als eigene Fassung in die Auswahl.
- Systemdynamik mit räumlichen Modellen koppeln (Bevölkerungswachstum aus Modell 2 bestimmt die neuen Einwohner je Iteration in Modell 3/4).
