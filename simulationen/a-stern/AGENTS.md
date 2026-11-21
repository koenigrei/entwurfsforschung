# AGENTS.md · Shortest Path with A*

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner vollständig samt `_gemeinsam/`.

## Worum es geht

Fachlich treue Neuumsetzung des Delphi-Programms `13_Pathfinding` (Reinhard König, 2005). Maßgeblich sind die Regeln des Originals (siehe `QUELLE.md`), nicht seine Oberfläche. Begriffe des Originals (offene Liste, geschlossene Liste, F = G + H, Vorgänger, „find Path“, „kein Pfad möglich!“) bleiben erhalten – auch seine Eigenheiten: Manhattan-Schätzung, Abbruch beim Aufnehmen des Ziels, strenge Prüfung gegen diagonales Schneiden.

## Aufbau

```
_gemeinsam/          gemeinsamer Rahmen (nicht pro App kopieren)
  zufall.js          Zufall.zufall(saat) → () => [0, 1), dazu .ganz(n), .zwischen(a, b), .dreh()
  sim.js             Sim.starte(cfg): Ablauf, Bedienfeld, Zeichenfläche, Sprache, Hell/Dunkel, window.SIM
  sim.css            Gestaltung wie das KI Lab
a-stern/
  index.html         statische Seite (Kopf, Bühne, Text, Fuß); lädt zufall.js, sim.js, modell.js, app.js
  modell.js          reine Logik, kein DOM: erzeuge(param, zufall), schritt(z, param)
  app.js             Sim.starte({...}): Werkzeug, Aktionen, zeichne, legende, kennzahlen, klick, ende
  test/*.test.mjs    node --test
```

## Regeln

1. **modell.js bleibt ohne DOM** (`document`, `window`, `canvas` sind tabu) und ohne Abhängigkeiten. Das Modell ist deterministisch; falls Zufall dazukommt, nur über die übergebene Funktion `zufall`. Kein `Math.random()`.
2. **Jede Regeländerung bekommt einen Test** in `test/`. Vor dem Abschluss: `node --test` im App-Ordner muss grün sein.
3. **Abweichungen vom Original** in `QUELLE.md` unter „Bewusst geändert“ eintragen.
4. **Keine Inhalte fremder Server**: keine CDNs, keine Webfonts von Dritten, keine iframes. Alles liegt im Ordner oder in `_gemeinsam/`.
5. **Texte** auf Deutsch, Bedienung zweisprachig: `{de, en}`-Objekte in `app.js`, in `index.html` Paare `<span lang="de">…</span><span lang="en">…</span>`.
6. **Gestaltung** nur über die Klassen und Variablen aus `_gemeinsam/sim.css` (`--paper`, `--ink`, `--line`, `--accent`, `--accent-text` …); Farben im Canvas über das Objekt `F` in `zeichne` (wechselt mit Hell/Dunkel).
7. **Namensnennung** bleibt: „Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic“, Lizenz CC BY 4.0.

## Schnittstelle des Modells

| Funktion | Aufgabe |
|---|---|
| `erzeuge(param, zufall)` | Ausgangslage wie `RectanglCreate`: `zelle` (Uint8Array, 0 frei / 1 Wand, Zeilen von oben), `start`, `ziel` (Zellenindex), Suchzustand `F`, `G`, `H`, `vorg`, `geschlossen`, `offen`, `inOffen`, `iter`, `status` („sucht“, „gefunden“, „keinPfad“), `pfad`, `kosten`, `optimum` |
| `schritt(z, param)` | ein Durchlauf der Suchschleife (`suchSchritt`); erhöht `z.t` |
| `neueSuche(z)`, `suchSchritt(z)`, `sucheGanz(z)` | deletePath + Startzelle in die offene Liste; ein expandierter Knoten; Suche bis zum Ende (wie „find Path“) |
| `pruefeNachbarn(z, knoten)` | `checkNeighbour` |
| `berechneF(z, vorg, me)`, `wandDaneben(z, zeile, spalte)` | `calcF` (liefert `cutWall`) und die Prüfung gegen diagonales Schneiden |
| `kuerzester(z)` | Vergleichswert: kürzester Weg nach denselben Zugregeln (Dijkstra) – nicht Teil des Originals |
| `zelleBei(x, y)`, `setzeWand`, `wandLinie`, `setzeStart`, `setzeZiel`, `waendeLoeschen` | Maus und Aktionen |

Im Browser steht zum Ausprobieren `window.SIM` bereit: `SIM.schritt(100)`, `SIM.zuruecksetzen()`, `SIM.setze("werkzeug", "punkte")`, `SIM.zustand`.

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 simulationen/pruefe_apps.py a-stern` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Andere Schätzfunktionen zum Vergleich (diagonale Distanz, euklidisch, H = 0 → Dijkstra) als Auswahl, mit Zahl der expandierten Knoten.
- F, G, H in die Zellen schreiben, wie in Lesters Tutorial, bei vergrößerter Ansicht.
- Gelände mit Kosten je Zelle statt nur Wand/frei.
