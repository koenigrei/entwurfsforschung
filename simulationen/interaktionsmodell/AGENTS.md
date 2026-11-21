# AGENTS.md · Agentenbasiertes Interaktionsmodell (Interaction Pattern)

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner vollständig samt `_gemeinsam/`.

## Worum es geht

Fachlich treue Neuumsetzung von `320_AgInteraktModell` („Interaction Patterns“ 1.0, Delphi, Reinhard König, 2006; gleicher Quellcode wie `42_interactionPatterns`). Maßgeblich sind die Regeln und Parameter des Originals (siehe `QUELLE.md`), nicht seine Oberfläche. Begriffe des Originals bleiben erhalten (origin, destination, angle threshold, wiggle threshold, return noise, decay rate, hill climbing, roulette wheel, markA = alle Wege, markB = Rückwege, gravity lines, stop at time). Koordinaten wie im Delphi-Canvas: Zelle (x, y), y nach unten, heading 0° = Osten im Uhrzeigersinn.

## Aufbau

```
_gemeinsam/          gemeinsamer Rahmen (nicht pro App kopieren)
  zufall.js          Zufall.zufall(saat) → () => [0, 1), dazu .ganz(n), .zwischen(a, b), .dreh()
  sim.js             Sim.starte(cfg): Ablauf, Bedienfeld, Zeichenfläche, Sprache, Hell/Dunkel, window.SIM
  sim.css            Gestaltung wie das KI Lab
interaktionsmodell/
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
| `erzeuge(param, zufall)` | Setup: Zustand `z` mit `t`, `N`, `markA`, `markB` (Float64Array N · N, Zeilen von oben), `zustand` (0 frei, 1 Ursprung, 2 Ziel), `zielNr`, `ziele`, `zahl` (Rückkehrer je Ziel), Agenten `x`, `y`, `h`, `modus`, `erfolg`, `ziel`, `verlauf` |
| `schritt(z, param)` | ein `calculate`: findMaxMin, alle Agenten, Verfall, Diagrammwerte; erhöht `z.t` |
| `aendere(z, param, id)` | „nur Rückwege zeigen“ ändert sofort die Normierung (`maxMin`) |
| `setzeZiele(z, art)` | Zielorte `zufall`, `kreis`, `raster` |
| `sichtfeld(heading, horizon)`, `sektor`, `NACHBAR` | betrachtete Nachbarzellen (Sektoren 1–8) |
| `bewegeAgent(z, p, k)` | checkArea + ChangeHeading + Schritt + Markieren + Moduswechsel |
| `maxMin(z, p)`, `grau(z, mark)` | Normierung und Grauwert wie `TCell.rePaint` |
| `auswertung(z)` | Kennzahlen `erfolgreich`, `rueckweg` (Prozent), `gefunden`, `rueckkehr` (auch für Tests und `pruef_ausdruck`) |

Im Browser steht zum Ausprobieren `window.SIM` bereit: `SIM.schritt(100)`, `SIM.zuruecksetzen(7)`, `SIM.setze("<parameter>", wert)`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&<parameter>=…`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 simulationen/pruefe_apps.py interaktionsmodell` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- „Update 1.1 Probabilistic Interaction & Manhattan Landscape“ (nur als .exe erhalten) nachbauen: Rückweg probabilistisch über einen Home-Gradienten (`markH`) mit Manhattan-Distanz.
- Zielorte mit der Maus setzen oder verschieben.
- Mehrere Ursprungsorte (Siedlungen) – Brücke zu „44_SettlementLandUse“.
