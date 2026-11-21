# AGENTS.md · Kristallwachstum

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner vollständig samt `_gemeinsam/`.

## Worum es geht

Fachlich treue Neuumsetzung von `33_crystalGrowth` (Delphi, Reinhard König, 2006; nach M. Batty, *Cities and Complexity*, Kap. 3). Maßgeblich sind die Regeln und Parameter des Originals (siehe `QUELLE.md`), nicht seine Oberfläche. Begriffe und Formelzeichen des Originals (undercooling threshold U, interface size θ, noise amplitude δ, iteration steps T, diffusion const. ξ, interface const. ς, pot. multi., just the field, random seed, entire potential) bleiben erhalten.

## Aufbau

```
_gemeinsam/          gemeinsamer Rahmen (nicht pro App kopieren)
  zufall.js          Zufall.zufall(saat) → () => [0, 1), dazu .ganz(n), .zwischen(a, b), .dreh()
  sim.js             Sim.starte(cfg): Ablauf, Bedienfeld, Zeichenfläche, Sprache, Hell/Dunkel, window.SIM
  sim.css            Gestaltung wie das KI Lab
kristallwachstum/
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
| `erzeuge(param, zufall)` | neuer Zustand `z` (`t` = Schrittzahl, `state`, `pot`, `birth`, `age`, `anzahl`, `verlauf`; `T`, `xi`, `zeta` werden wie im Original nur hier gelesen) |
| `schritt(z, param)` | ein Zeitschritt; erhöht `z.t` |
| `aendere(z, param, id)` | optional: Parameter ohne Neustart übernehmen |
| `altern`, `ausgleich`, `nachbarn`, `schwelle`, `entwickle` | Regeln des Originals (ageCheck, equiPot, checkNei, Kristallisationsbedingung, dev_Cell), einzeln testbar |
| `grau(z, n, p)` | Grauwert des Originals mit Überlauf mod 256 („pot. multi.“ als Höhenlinien) |
| `gesamtpotential(z)` | „entire potential“; ohne Altern gleich der Zahl der Kristallzellen |

Im Browser steht zum Ausprobieren `window.SIM` bereit: `SIM.schritt(100)`, `SIM.zuruecksetzen(7)`, `SIM.setze("U", 0.06)`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&U=0.06`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 simulationen/pruefe_apps.py kristallwachstum` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Kristallzellen per Klick setzen (mehrere Keime an gewählten Orten statt „random seed“).
- Wärmeabgabe als Parameter (fest +1) und offener Rand statt Torus, damit das Wachstum nicht durch Erwärmung des ganzen Feldes endet.
- Gemeinsamer Baustein „Verlaufsdiagramm“ mit den anderen Wachstumsautomaten in `_gemeinsam/`.
