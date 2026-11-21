# AGENTS.md · Active Walker

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner vollständig samt `_gemeinsam/`.

## Worum es geht

Fachlich treue Neuumsetzung von `40_activeWalker` (Active Walker 1.0, Delphi, Reinhard König, 2006) mit `41_multiWalker` (1.1) als Fassung (`p.fassung` = `"1.0"` oder `"1.1"`). Maßgeblich sind die Regeln und Parameter des Originals (siehe `QUELLE.md`), nicht seine Oberfläche. Begriffe des Originals bleiben erhalten (walker, landscape, mark, angle threshold, wiggle threshold, hill climbing, roulette wheel, diffusion strength, noise strength, distance scaling, timesteps). Koordinaten wie im Delphi-Canvas: Zelle (x, y), y nach unten, heading 0° = Osten im Uhrzeigersinn.

## Aufbau

```
_gemeinsam/          gemeinsamer Rahmen (nicht pro App kopieren)
  zufall.js          Zufall.zufall(saat) → () => [0, 1), dazu .ganz(n), .zwischen(a, b), .dreh()
  sim.js             Sim.starte(cfg): Ablauf, Bedienfeld, Zeichenfläche, Sprache, Hell/Dunkel, window.SIM
  sim.css            Gestaltung wie das KI Lab
active-walker/
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
| `erzeuge(param, zufall)` | Setup: Zustand `z` mit `t`, `N` (Zellen je Richtung), `mark` (Float64Array N · N, Zeilen von oben), `begangen`, Walker `x`, `y`, `h` (Int32Array), `maxM`, `minM` |
| `schritt(z, param)` | ein `calculate`: (Diffusion,) Landscape Rule, Max/Min (Normierung in 1.1), Walker bewegen; erhöht `z.t` |
| `aendere(z, param, id)` | `dScale` ohne Neustart (Tabelle neu) |
| `landschaft(z, wx, wy)`, `tabelle(z, dScale)` | Landscape Rule für einen Walker; Tabelle √(dScale · round(Zellgröße · Abstand)) |
| `diffundiere(z, d)` | Diffusion über die Moore-Nachbarschaft |
| `sichtfeld(heading, horizon)`, `sektor`, `NACHBAR` | betrachtete Nachbarzellen (Sektoren 1–8) |
| `bewegeWalker(z, p, k)` | Stepping Rule: hill climbing / roulette wheel / random walk, wiggle, Schritt |
| `dunkel(z, mark)` | Grauwert 0…255 wie `TCell.Paint` |
| `auswertung(z)` | Kennzahlen `begangen`, `ziel`, `naechster`, `spanne` (auch für Tests und `pruef_ausdruck`) |
| `rundeD(x)`, `zellen(zg)`, `falte(d, n)` | Delphis Round, Feldgröße, Abstand im Torus |

Im Browser steht zum Ausprobieren `window.SIM` bereit: `SIM.schritt(100)`, `SIM.zuruecksetzen(7)`, `SIM.setze("<parameter>", wert)`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&<parameter>=…`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 simulationen/pruefe_apps.py active-walker` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Batty misst Erreichbarkeit auch mit Manhattan-Distanz (im Code als Kommentar vorhanden) – als Auswahl ergänzen.
- Verlauf der Kennzahlen (Abstand zum Ziel, Cluster) als kleines Diagramm.
- Mausinteraktion wie in den Wegesystemen: Werte der Landscape anheben oder löschen (im Original vorbereitet, `markCell`).
