# AGENTS.md · 07 wegesystem B

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner vollständig samt `_gemeinsam/`.

## Worum es geht

Fachlich treue Neuumsetzung von `wegesystem02direction.nlogo` (NetLogo 2.1, Reinhard König, 2005), mit „B update 1“ (`wegesystem04.nlogo`) und „06 wegesystem A“ (`wegesystem01.nlogo`) als Fassungen (`p.fassung` = `"b"`, `"update1"`, `"a"`). Maßgeblich sind die Regeln und Parameter des Originals (siehe `QUELLE.md`), nicht seine Oberfläche. Begriffe des Originals bleiben erhalten (turtle, patch, mark, path-attract, mark-strenght – so geschrieben –, max-mark, decrease-per-tick, show-mark-over, Clock/ticks). Die Parameter-IDs sind die NetLogo-Namen mit Bindestrich, in `p` also `p["path-attract"]`.

## Aufbau

```
_gemeinsam/          gemeinsamer Rahmen (nicht pro App kopieren)
  zufall.js          Zufall.zufall(saat) → () => [0, 1), dazu .ganz(n), .zwischen(a, b), .dreh()
  sim.js             Sim.starte(cfg): Ablauf, Bedienfeld, Zeichenfläche, Sprache, Hell/Dunkel, window.SIM
  sim.css            Gestaltung wie das KI Lab
nl-wegesystem-b/
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
| `erzeuge(param, zufall)` | `setup`: Zustand `z` mit `t` (ticks), `mark` (Float64Array 101 · 101, Zeilen von oben), turtles als Typed Arrays `x`, `y` (stetig, NetLogo-Koordinaten −50,5…50,5), `h` (heading in Grad), `n` |
| `schritt(z, param)` | ein `go`: turtles in zufälliger Reihenfolge (`bewegeTurtle`), dann `verfall`; erhöht `z.t` |
| `aendere(z, param, id)` | optional: Parameter ohne Neustart übernehmen |
| `patchVorne(x, y, heading, winkel)` | `patch-left-and-ahead winkel 1` als Feldindex |
| `bereiche(m0, m1, m2, pathAttract)`, `wahl(mV, randV)` | Wahrscheinlichkeitsbereiche und Richtungswahl (−45, 0, +45) |
| `bereicheA(m[8], pathAttract)`, `wahlA(mV, randV)` | Fassung A: acht Nachbarn, absolute Richtungen 0…315 (−1 = heading bleibt) |
| `verfall(mark, d)`, `grau(mark, p)` | Verfall je tick, Grauwert 0…1 wie `pcolor` (mit `show-mark-over`) |
| `zeichneWeg(z, spalte, zeile, neu)` | update 1: Wege mit der Maus einzeichnen (mark 100) |
| `auswertung(z, p)` | Kennzahlen `markiert`, `stark`, `aufWeg`, `orthogonal` (auch für Tests und `pruef_ausdruck`) |
| `wickle`, `patchKoord`, `index` | Torus, Patch eines Punkts, Feldindex |

Im Browser steht zum Ausprobieren `window.SIM` bereit: `SIM.schritt(100)`, `SIM.zuruecksetzen(7)`, `SIM.setze("path-attract", 20)`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&path-attract=20`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 simulationen/pruefe_apps.py nl-wegesystem-b` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Verlauf der Kennzahlen als kleines Diagramm (Einpendeln nach Parameteränderung, „einige hundert Schritte“).
- Ziele/Quellen (Häuser, Eingänge) wie in den Delphi-Wegesystemen `331_SelbstorgaWegeSys`.
