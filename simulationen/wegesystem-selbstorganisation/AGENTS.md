# AGENTS.md · Selbstorganisation bei Wegesystemen und Slime Mold

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner vollständig samt `_gemeinsam/`.

## Worum es geht

Fachlich treue Neuumsetzung der Delphi-Programme `331_SelbstorgaWegeSys` (= `36_pathSystem_01`) und `37_slimeMold` von Reinhard König, 2006. Maßgeblich sind die Regeln und Parameter des Originals (siehe `QUELLE.md`), nicht seine Oberfläche. Begriffe des Originals (angle threshold, wiggle threshold, sniff threshold, mark strenght, evaporate rate, visibility threshold, rulette wheel, hill climbing, timesteps, sum of marked cells) bleiben erhalten – auch die Eigenheiten von Delphis Rundung im Sichtbereich und bei den Schrittrichtungen.

## Aufbau

```
_gemeinsam/          gemeinsamer Rahmen (nicht pro App kopieren)
  zufall.js          Zufall.zufall(saat) → () => [0, 1), dazu .ganz(n), .zwischen(a, b), .dreh()
  sim.js             Sim.starte(cfg): Ablauf, Bedienfeld, Zeichenfläche, Sprache, Hell/Dunkel, window.SIM
  sim.css            Gestaltung wie das KI Lab
wegesystem-selbstorganisation/
  index.html         statische Seite (Kopf, Bühne, Text, Fuß); lädt zufall.js, sim.js, modell.js, app.js
  modell.js          reine Logik, kein DOM: erzeuge(param, zufall), schritt(z, param)
  app.js             Sim.starte({...}): Parameter, zeichne (Feld und Diagramm), legende, kennzahlen, klick
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
| `erzeuge(param, zufall)` | Zustand `z`: Feld `mark` (Float64Array n · n, Zeilen von oben), `n`, Agenten `x`, `y` (Zelle), `h` (heading in Grad), Schritt `sx`, `sy`, `spur` (folgt einer Spur), `A` (Anzahl), `summe`, `verlauf` |
| `schritt(z, param)` | `calculate`: Verfall, Agenten, ggf. Diffusion; erhöht `z.t` |
| `sichtbereich(heading, angle)` | `checkArea`: Liste der Nachbarzellen 1 … 8 (`NB`) |
| `richtung(z, i, p)` | `ChangeHeading`: Roulette Wheel, Hill Climbing oder Random Walk |
| `verfall(z, p)`, `diffusion(z, p)` | `repaintAll` (liefert die Zahl der markierten Zellen) und `diffuse` |
| `markiere(z, x, y, an)` | Maus: mark 255 bzw. 1 |
| `cluster(z, schwelle)`, `aufSpur(z)`, `rundeD(x)`, `sektor(w)` | Kennzahlen, Delphi-Rundung, Sektor eines Winkels |

Im Browser steht zum Ausprobieren `window.SIM` bereit: `SIM.schritt(1000)`, `SIM.zuruecksetzen(7)`, `SIM.setze("fassung", "37")`, `SIM.setze("angle", 20)`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&fassung=37`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 simulationen/pruefe_apps.py wegesystem-selbstorganisation` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Quellen und Ziele der Bewegungen (Programm `332_Quellen_Ziele`) und optimierte Wegesysteme (`333_OptiWege`) auf derselben Grundlage.
- Parameterraum: Zahl der Wegenetze nach angle threshold und Agentendichte als Karte (Clusterbildung braucht eine ausreichende Dichte).
