# AGENTS.md · 03 reakt diffuse

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner vollständig samt `_gemeinsam/`.

## Worum es geht

Fachlich treue Neuumsetzung von `reaktDiffuse02.nlogo` („03_reakt diffuse“, NetLogo 2.1, Reinhard König, 2005; leak-Verfahren nach einem Skript von Paul Coates, CECA) mit der Fassung `reaktDiffuse03.nlogo` („04_repel and reakt diffuse“), wählbar über „Fassung“. Maßgeblich sind die Regeln und Parameter des Originals (siehe `QUELLE.md`), nicht seine Oberfläche. Begriffe des Originals (seed, density, radius, repel-strength, attract, repel, stamp-agents, leak, boundary, s1, s2) bleiben erhalten.

## Aufbau

```
_gemeinsam/          gemeinsamer Rahmen (nicht pro App kopieren)
  zufall.js          Zufall.zufall(saat) → () => [0, 1), dazu .ganz(n), .zwischen(a, b), .dreh()
  sim.js             Sim.starte(cfg): Ablauf, Bedienfeld, Zeichenfläche, Sprache, Hell/Dunkel, window.SIM
  sim.css            Gestaltung wie das KI Lab
nl-reakt-diffuse-1/
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
| `erzeuge(param, zufall)` | neuer Zustand `z` (`t`, `N`, `pcolor` als NetLogo-Farbnummern, `boundary`, `phase` „bewegen“/„leak“, turtles `x`, `y`, `h`, `fertig`) |
| `schritt(z, param)` | ein Zeitschritt; erhöht `z.t` |
| `aendere(z, param, id)` | optional: Parameter ohne Neustart übernehmen |
| `pruefe(z, n)`, `leck(z)` | checkdiffuse und leak des Originals |
| `anziehen`, `abstossen`, `stempeln` | attract, repel, stamp-agents (Fassung 04) |
| `wickle`, `patchIndex`, `delta`, `richtung` | NetLogo-Koordinaten im Torus, heading 0 = Norden |
| `auswertung(z)` | Anteile Regionen/boundary/schwarz, Zahl der Farben und Mischfarben |

Im Browser steht zum Ausprobieren `window.SIM` bereit: `SIM.schritt(100)`, `SIM.zuruecksetzen(7)`, `SIM.setze("fassung", "rd04")`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&fassung=rd04`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 simulationen/pruefe_apps.py nl-reakt-diffuse-1` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Keime per Klick setzen (eigene Farbe je Klick) – eine interaktive Flächenteilung.
- Gewichtete Ausbreitung (unterschiedliche Geschwindigkeiten je Region) für additiv gewichtete Voronoi-Teilungen.
- Die entstandenen Grenzlinien als Vektoren ausgeben (Straßen-/Parzellennetz).
