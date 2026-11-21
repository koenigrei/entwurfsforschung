# AGENTS.md · 05 voting with four colors

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner vollständig samt `_gemeinsam/`.

## Worum es geht

Fachlich treue Neuumsetzung von `vote4col.nlogo` („05_voting with four colors“, NetLogo 2.1, Reinhard König, 18.01.2005), einem zellulären Automaten mit vier Zuständen aus den Strukturexperimenten. Maßgeblich sind die Regeln und Parameter des Originals (siehe `QUELLE.md`), nicht seine Oberfläche. Die Namen der Regler (`genYellow`, `genBlue`, `genGreen`, `genRed`, `initial-density`) und der Setup-Prozeduren (`setup-random`, `setup-blank`) bleiben erhalten.

## Aufbau

```
_gemeinsam/          gemeinsamer Rahmen (nicht pro App kopieren)
  zufall.js          Zufall.zufall(saat) → () => [0, 1), dazu .ganz(n), .zwischen(a, b), .dreh()
  sim.js             Sim.starte(cfg): Ablauf, Bedienfeld, Zeichenfläche, Sprache, Hell/Dunkel, window.SIM
  sim.css            Gestaltung wie das KI Lab
nl-voting/
  index.html         statische Seite (Kopf, Bühne, Text, Fuß); lädt zufall.js, sim.js, modell.js, app.js
  modell.js          reine Logik, kein DOM: erzeuge(param, zufall), schritt(z, param), aendere(z, param, id)
  app.js             Sim.starte({...}): Regler, zeichne (Feld und Verlauf), legende, kennzahlen, ende
  test/*.test.mjs    node --test
```

## Regeln

1. **modell.js bleibt ohne DOM** (`document`, `window`, `canvas` sind tabu) und ohne Abhängigkeiten. Zufall nur über die übergebene Funktion `zufall` (feste Saat → gleicher Lauf). Kein `Math.random()`.
2. **Jede Regeländerung bekommt einen Test** in `test/`. Vor dem Abschluss: `node --test` im App-Ordner muss grün sein.
3. **Abweichungen vom Original** in `QUELLE.md` unter „Bewusst geändert“ eintragen.
4. **Keine Inhalte fremder Server**: keine CDNs, keine Webfonts von Dritten, keine iframes. Alles liegt im Ordner oder in `_gemeinsam/`.
5. **Texte** auf Deutsch und Englisch: `{de, en}`-Objekte in `app.js`, in `index.html` Paare `<span lang="de">…</span><span lang="en">…</span>`.
6. **Gestaltung** nur über die Klassen und Variablen aus `_gemeinsam/sim.css` (`--paper`, `--ink`, `--line`, `--accent`, `--accent-text` …); Farben im Canvas über das Objekt `F` in `zeichne` (wechselt mit Hell/Dunkel).
7. **Namensnennung** bleibt: „Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic“, Lizenz CC BY 4.0.

## Schnittstelle des Modells

| Funktion | Aufgabe |
|---|---|
| `erzeuge(param, zufall)` | neuer Zustand `z`: `t`, `feld` (Uint8Array, 0 rot, 1 blau, 2 gelb, 3 grün; Zeile 0 = pycor 80), `summe`, `geaendert`, `fertig`, `periode`, `verlauf` (Anteile je Schritt) |
| `schritt(z, param)` | ein Zeitschritt (to go): `zaehle`, dann `regel` für alle Patches; erhöht `z.t` |
| `regel(counter, alt, p)` | neue Farbe aus der Nachbarsumme |
| `zaehle(z)` | Nachbarsummen (Torus) |
| `index(px, py)` | Patchkoordinaten → Index |
| `anteile(z)` | Anteile der vier Farben |

Im Browser steht zum Ausprobieren `window.SIM` bereit: `SIM.schritt(30)`, `SIM.zuruecksetzen(7)`, `SIM.setze("genGreen", 15)`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&genGreen=15&genRed=8`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 simulationen/pruefe_apps.py nl-voting` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Parameterkarte: für alle Paare (genYellow, genBlue) die Zeit bis zur Ruhe und die Anteile als Bild.
- Malen mit der Maus, um Störungen einzubringen.
- Asynchrone Aktualisierung (Patches in zufälliger Reihenfolge) zum Vergleich.
