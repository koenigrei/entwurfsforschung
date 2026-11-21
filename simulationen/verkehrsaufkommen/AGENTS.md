# AGENTS.md · Verkehrsaufkommen

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner vollständig samt `_gemeinsam/`.

## Worum es geht

Fachlich treue Neuumsetzung des Delphi-Programms `343_Verkehrsaufkommen` („traffic rhythms“, Reinhard König, 2007). Maßgeblich sind die Regeln und Parameter des Originals (siehe `QUELLE.md`), nicht seine Oberfläche. Begriffe des Originals (Arbeitsbevölkerung, Arbeitsplätze, Einzelhandelseinheiten, connect/repel distance, morning/evening dep., STD, time scale, scale, traffic, steps) bleiben erhalten.

## Aufbau

```
_gemeinsam/          gemeinsamer Rahmen (nicht pro App kopieren)
  zufall.js          Zufall.zufall(saat) → () => [0, 1), dazu .ganz(n), .zwischen(a, b), .dreh()
  sim.js             Sim.starte(cfg): Ablauf, Bedienfeld, Zeichenfläche, Sprache, Hell/Dunkel, window.SIM
  sim.css            Gestaltung wie das KI Lab
verkehrsaufkommen/
  index.html         statische Seite (Kopf, Bühne, Text, Fuß); lädt zufall.js, sim.js, modell.js, app.js
  modell.js          reine Logik, kein DOM: erzeuge(param, zufall), schritt(z, param), aendere(z, param, id); Zelldaten DATEN
  app.js             Sim.starte({...}): Parameter, zeichne (Plan, Verkehr, Diagramm), legende, kennzahlen
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
| `erzeuge(param, zufall)` | Zustand `z`: Arbeiter `heim`, `arbeit` (Zellen), `morgenZeit`, `abendZeit`, `route` (Knotenfolge oder leer), Graph `n`, `x`, `y`, `ox`, `oy`, `nb`, `nah` (Knoten je Zelle), `belastung` (n · n, Zeile = Zielknoten), `reisende`, `fahrplan`, `histogramm`, `zeit`, `unterwegs`, `verlaufUnterwegs` |
| `schritt(z, param)` | `execute`: Uhr, Abfahrten, `reise`; erhöht `z.t` |
| `aendere(z, param, id)` | „timeScale“: Fahrplan neu |
| `verteile(zufall)`, `graph(z, p)`, `naechsteKnoten(z)`, `findePfad(z, s, ziel)` | AssignWorkers, agents create, CellsNearNode, A* |
| `uhrzeit(t, ts)`, `abfahrtsSchritt(v, ts)`, `fahrplan(z, p)`, `reise(z)` | Zeit, Abfahrtsintervalle, travel |
| `summen()`, `maxBelastung(z)`, `linie(u, tScale)` | Kennzahlen und Linienstärke |

Im Browser steht zum Ausprobieren `window.SIM` bereit: `SIM.schritt(48)` (bis 8 Uhr), `SIM.zuruecksetzen(7)`, `SIM.setze("std", 0.5)`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&std=0.5`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 simulationen/pruefe_apps.py verkehrsaufkommen` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Einkaufsfahrten zum Einzelhandel (die Daten werden im Original geladen, aber noch nicht genutzt).
- Kapazitäten und Staus: Fahrzeit je Kante steigt mit der Belastung, Routen weichen aus.
- Eigene Verteilungen zeichnen statt der drei Bilder.
