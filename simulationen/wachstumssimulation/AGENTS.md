# AGENTS.md · Wachstumssimulation urbaner Strukturen

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner vollständig samt `_gemeinsam/`.

## Worum es geht

Fachlich treue Neuumsetzung von `600_Wachstumssimulation` (Delphi, Reinhard König). Maßgeblich sind die Regeln und Parameter des Originals (siehe `QUELLE.md`), nicht seine Oberfläche. Begriffe des Originals bleiben erhalten.

## Aufbau

```
_gemeinsam/          gemeinsamer Rahmen (nicht pro App kopieren)
  zufall.js          Zufall.zufall(saat) → () => [0, 1), dazu .ganz(n), .zwischen(a, b), .dreh()
  sim.js             Sim.starte(cfg): Ablauf, Bedienfeld, Zeichenfläche, Sprache, Hell/Dunkel, window.SIM
  sim.css            Gestaltung wie das KI Lab
wachstumssimulation/
  index.html         statische Seite (Kopf, Bühne, Text, Fuß); lädt zufall.js, sim.js, modell.js, app.js
  modell.js          reine Logik, kein DOM: erzeuge(param, zufall), schritt(z, param), aendere(z, param, id)
  app.js             Sim.starte({...}): Parameter, zeichne, legende, kennzahlen, klick, aktionen
  test/*.test.mjs    node --test
```

## Regeln

1. **modell.js bleibt ohne DOM** (`document`, `window`, `canvas` sind tabu) und ohne Abhängigkeiten. Zufall nur über die übergebene Funktion `zufall` (feste Saat → gleicher Lauf). Kein `Math.random()`.
2. **Jede Regeländerung bekommt einen Test** in `test/`. Vor dem Abschluss: `node --test` im App-Ordner muss grün sein.
3. **Abweichungen vom Original** in `QUELLE.md` unter „Bewusst geändert“ eintragen.
4. **Keine Inhalte fremder Server**: keine CDNs, keine Webfonts von Dritten, keine iframes. Alles liegt im Ordner oder in `_gemeinsam/`.
5. **Texte** auf Deutsch, Bedienung zweisprachig: `{de, en}`-Objekte in `app.js`, in `index.html` Paare `<span lang="de">…</span><span lang="en">…</span>`.
6. **Gestaltung** nur über die Klassen und Variablen aus `_gemeinsam/sim.css` (`--paper`, `--ink`, `--line`, `--accent`, `--accent-text` …); Farben im Canvas über das Objekt `F` in `zeichne` (wechselt mit Hell/Dunkel).
7. **Namensnennung** bleibt: „Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic“, Lizenz CC BY 4.0.

## Schnittstelle des Modells

| Funktion | Aufgabe |
|---|---|
| `erzeuge(param, zufall)` | neuer Zustand `z` (enthält `t` = Schrittzahl) |
| `schritt(z, param)` | ein Zeitschritt; erhöht `z.t` |
| `aendere(z, param, id)` | optional: Parameter ohne Neustart übernehmen |
| `testNeighState`, `develop`, `lookForOtherNodes`, `calcConnections`, `interlink`, `findPath` | Erschließungsgraph (Main.pas, calc_AStern.pas) |
| `connect`, `transLine`, `subdivideEdge`, `buildStreet` | Kanten und Straßen auf dem feinen Raster (transferLine.pas, potentialField.pas) |
| `equiPot`, `entwickleZelle(z, p, cluster)` | Potentialfeld und Wahl der zu bebauenden Zelle (dev_Cell, dev_ClusterCell) |
| `buildingsCalc`, `zufallsBebauung`, `clusterAnalyse` | 2D-Bebauungsautomat und Clusteranalyse |
| `konnektivitaet`, `grade`, `auswertung` | Erreichbarkeit (ML, lokales Maß), Kanten je Knoten, Kennzahlen |
| `setzeKnoten`, `zieheStrasse`, `bebaue` | Maus: Knoten, Straße ziehen, Zelle bebauen |
| `rundeD`, `sortiereDelphi` | Delphis Round (,5 zur geraden Zahl) und TList.Sort (QuickSort) |

Zustand: grobe Zellen `state`, `pot` (Float32), `buildDense`, `streetDense`, Index `I · sp + K`; feines Raster `cState` (0 frei, 1 Straße, 2 bebaut), `subState` (2 bebaut, 3 grün), `clustSize`, Index `i · sb + k` (`sb = 3 · sp`); Knoten als Felder `nk`, `ni` (Zelle), `nx`, `ny` (px), `nb`/`nd` (Nachbarn, Abstand). `z.version` steigt bei jeder Änderung – `app.js` zeichnet das Rasterbild und berechnet die Erreichbarkeit nur dann neu.

Das Loslassen der Maus (Straße ziehen) hört `app.js` selbst ab, weil `Sim.starte` nur „unten“ und „ziehen“ meldet.

Im Browser steht zum Ausprobieren `window.SIM` bereit: `SIM.schritt(100)`, `SIM.zuruecksetzen(7)`, `SIM.setze("<parameter>", wert)`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&<parameter>=…`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 simulationen/pruefe_apps.py wachstumssimulation` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Analysen des Originals ergänzen: fraktale Dimension (radial und Raster), Rang-Größe der Cluster, Dissimilaritätsindex, Potential/Dichte je Knoten (`Main.pas`: fractalRad, fractalGrid, IDissimilar, measureDensity).
- Regelreihe „buildAna“ des Originals: die Regeln 8114, 7013, 5012, 3011, 3010 nacheinander in mehreren Läufen vergleichen.
- Schneller für sehr große Felder: Kandidatenlisten des Highwayman schrittweise führen statt das feine Raster je Zelle neu zu durchsuchen (Reihenfolge der Zufallszahlen beachten).
