# AGENTS.md · Schneeflocken-Wachstum

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner vollständig samt `_gemeinsam/`.

## Worum es geht

Fachlich treue Neuumsetzung von `32_snowFlake` (Delphi, Reinhard König, 2006; nach C. A. Reiter, *A local cellular model for snow crystal growth*, 2005). Maßgeblich sind die Regeln und Parameter des Originals (siehe `QUELLE.md`), nicht seine Oberfläche. Begriffe des Originals (beta, gamma, receptive/nonreceptive, Transition Rule, Timesteps, number of developed cells) bleiben erhalten. Das Modell kennt keinen Zufall.

## Aufbau

```
_gemeinsam/          gemeinsamer Rahmen (nicht pro App kopieren)
  zufall.js          Zufall.zufall(saat) → () => [0, 1), dazu .ganz(n), .zwischen(a, b), .dreh()
  sim.js             Sim.starte(cfg): Ablauf, Bedienfeld, Zeichenfläche, Sprache, Hell/Dunkel, window.SIM
  sim.css            Gestaltung wie das KI Lab
schneeflocke/
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
| `erzeuge(param, zufall)` | neuer Zustand `z` (`t` = Schrittzahl, `state`, `pot`, `rec`, `non`, `anzahl`, `verlauf`); `zufall` wird nicht gebraucht |
| `schritt(z, param)` | ein Zeitschritt; erhöht `z.t` |
| `aendere(z, param, id)` | optional: Parameter ohne Neustart übernehmen |
| `rezeptiv(z, n)`, `ausgleich(z, p)`, `entwickle(z)` | Regeln des Originals (checkNei, equiPot, dev_Cell), einzeln testbar |
| `GEWICHTE` | `programm` (orthogonal 1/12, diagonal 1/6, wie der Quelltext) und `beschreibung` (umgekehrt, wie die alte Seite) |
| `grau(z, n)`, `auswertung(z)` | Grauwert des Originals; Armlängen und Symmetrie (neue Kennzahlen) |

Im Browser steht zum Ausprobieren `window.SIM` bereit: `SIM.schritt(100)`, `SIM.zuruecksetzen(7)`, `SIM.setze("gamma", 0.006)`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=1&gamma=0.006`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 simulationen/pruefe_apps.py schneeflocke` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Hexagonales Raster wie bei Reiter (sechszählige Kristalle statt vierzähliger).
- Diffusionsrate α als Parameter (hier fest: der nichtrezeptive Teil wird ganz durch das gewichtete Mittel ersetzt) und wirklich mehrere Iterationen je Schritt.
- Gemeinsamer Baustein „Verlaufsdiagramm“ mit den anderen Wachstumsautomaten in `_gemeinsam/`.
