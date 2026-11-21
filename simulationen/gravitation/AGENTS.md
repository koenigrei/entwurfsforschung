# AGENTS.md · Erreichbarkeit und Gravitationsmodell

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner vollständig samt `_gemeinsam/`.

## Worum es geht

Fachlich treue Neuumsetzung der Delphi-Programme `310_Gravitation` (= `18_Gravitation`, Version 1.1) und `17_Erreichbarkeit` (Version 1.0) von Reinhard König, 2005. Maßgeblich sind die Regeln des Originals (siehe `QUELLE.md`), nicht seine Oberfläche. Begriffe des Originals (Node, Zeilensumme, Streuwert, dLänge, Ströme, Popul/P, „fP“) bleiben erhalten.

## Aufbau

```
_gemeinsam/          gemeinsamer Rahmen (nicht pro App kopieren)
  zufall.js          Zufall.zufall(saat) → () => [0, 1), dazu .ganz(n), .zwischen(a, b), .dreh()
  sim.js             Sim.starte(cfg): Ablauf, Bedienfeld, Zeichenfläche, Sprache, Hell/Dunkel, window.SIM
  sim.css            Gestaltung wie das KI Lab
gravitation/
  index.html         statische Seite (Kopf, Bühne, Text, Fuß); lädt zufall.js, sim.js, modell.js, app.js
  modell.js          reine Logik, kein DOM: erzeuge(param, zufall), schritt(z, param)
  app.js             Sim.starte({...}): Parameter, Werkzeuge, zeichne, legende, kennzahlen, klick, ende
  test/*.test.mjs    node --test
```

## Regeln

1. **modell.js bleibt ohne DOM** (`document`, `window`, `canvas` sind tabu) und ohne Abhängigkeiten. Zufall nur über die übergebene Funktion `zufall` (feste Saat → gleicher Startgraph). Kein `Math.random()`.
2. **Jede Regeländerung bekommt einen Test** in `test/`. Vor dem Abschluss: `node --test` im App-Ordner muss grün sein.
3. **Abweichungen vom Original** in `QUELLE.md` unter „Bewusst geändert“ eintragen.
4. **Keine Inhalte fremder Server**: keine CDNs, keine Webfonts von Dritten, keine iframes. Alles liegt im Ordner oder in `_gemeinsam/`.
5. **Texte** auf Deutsch, Bedienung zweisprachig: `{de, en}`-Objekte in `app.js`, in `index.html` Paare `<span lang="de">…</span><span lang="en">…</span>`.
6. **Gestaltung** nur über die Klassen und Variablen aus `_gemeinsam/sim.css` (`--paper`, `--ink`, `--line`, `--accent`, `--accent-text` …); Farben im Canvas über das Objekt `F` in `zeichne` (wechselt mit Hell/Dunkel).
7. **Namensnennung** bleibt: „Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic“, Lizenz CC BY 4.0.

## Schnittstelle des Modells

| Funktion | Aufgabe |
|---|---|
| `erzeuge(param, zufall)` | Zustand `z`: `nodes` (`{x, y, P}` in Bildpunkten), `kanten` (`[a, b]`), `analyse` (Matrix `k`, Fortschritt `paar`/`gesamt`, letzter Pfad) |
| `schritt(z, param)` | ein Knotenpaar der Erreichbarkeitsanalyse (`analyseSchritt`); erhöht `z.t` |
| `findePfad(z, s, ziel)` | A* wie `findPath`: pfadList vom Ziel zurück, ohne Start; `[]` ohne Weg |
| `analyseGanz(z)`, `auswertung(z)`, `fertig(z)` | Knopf „fP“; Zeilensummen, positive Werte, dLänge, Streuwert, mittlere Länge |
| `strom(a, b, beta)`, `linie(F, faktor)` | Gravitationsmodell `P_i · P_j / d^β`, Linienstärke `1 + round(faktor · F)` |
| `verbinde`, `trenne`, `neuerKnoten`, `loescheKnoten`, `groesse`, `knotenBei`, `geaendert` | Maus und Aktionen |

Im Browser steht zum Ausprobieren `window.SIM` bereit: `SIM.schritt(10)`, `SIM.zuruecksetzen(7)`, `SIM.setze("exponent", "2")`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&knoten=15`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 simulationen/pruefe_apps.py gravitation` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Ströme zwischen allen Paaren (die im Original auskommentierte Fassung) und Umlegung entlang der kürzesten Wege – das führt zu `342_kuerzestePfade`.
- Metrische statt topologischer Entfernung (Summe der Streckenlängen) als zweite Matrix.
- Die vollständige Distanzmatrix als Tabelle unter der Zeichenfläche.
