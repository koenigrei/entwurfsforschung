# AGENTS.md · 10 territory fight 01

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner vollständig samt `_gemeinsam/`.

## Worum es geht

Fachlich treue Neuumsetzung von `07_territoryFight_3.nlogo` („10_territory fight 01“, NetLogo 2.1, Reinhard König, 11.03.2005), einem Grundmodell zur Flächenteilung aus den Strukturexperimenten. Maßgeblich sind die Regeln und Parameter des Originals (siehe `QUELLE.md`), nicht seine Oberfläche. Die Namen der Regler (`num-turtles`, `number-of-colors`, `start-with-color`) und Variablen (`tMark`, `homeX`, `homeY`, `mark`) bleiben erhalten.

## Aufbau

```
_gemeinsam/          gemeinsamer Rahmen (nicht pro App kopieren)
  zufall.js          Zufall.zufall(saat) → () => [0, 1), dazu .ganz(n), .zwischen(a, b), .dreh()
  sim.js             Sim.starte(cfg): Ablauf, Bedienfeld, Zeichenfläche, Sprache, Hell/Dunkel, window.SIM
  sim.css            Gestaltung wie das KI Lab
nl-territorien/
  index.html         statische Seite (Kopf, Bühne, Text, Fuß); lädt zufall.js, sim.js, modell.js, app.js
  modell.js          reine Logik, kein DOM: erzeuge(param, zufall), schritt(z, param), aendere(z, param, id)
  app.js             Sim.starte({...}): Regler, zeichne (Patches, turtles, Verlauf), legende, kennzahlen; NetLogo-Farbzahlen → RGB
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
| `erzeuge(param, zufall)` | neuer Zustand `z`: `t`, `mark` (Float32Array je Patch, 150 = ohne Farbe; Zeile 0 = pycor 100), je turtle `x`, `y`, `h` (heading), `hx`, `hy` (Heimat), `tMark`; `farben`, `gefaerbt`, `verlauf` (Flächenanteile je Farbe) |
| `schritt(z, param)` | ein Zeitschritt (to go): alle turtles in zufälliger Reihenfolge `bewege`; erhöht `z.t` |
| `bewege(z, i)` | Regel einer turtle |
| `territoriumsfarbe(start, k, farben)`, `wrapColor(c)` | Farbe eines Territoriums |
| `falte(v)`, `patch(x, y)` | Torus und Patch eines Punkts |
| `flaechen(z)` | Flächenanteile je Farbe |

Im Browser steht zum Ausprobieren `window.SIM` bereit: `SIM.schritt(1000)`, `SIM.zuruecksetzen(7)`, `SIM.setze("farben", 4)`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&anzahl=300&farben=4`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 simulationen/pruefe_apps.py nl-territorien` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Turtles verschiedener Stärke oder Reichweite, damit sich Territorien verschieben.
- Heimat mit der Maus setzen und verschieben.
- Vergleich mit den Reaktions-Diffusions-Modellen (`nl-reakt-diffuse-1`) zur Flächenteilung.
