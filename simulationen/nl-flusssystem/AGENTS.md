# AGENTS.md · 08 flusssystem

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner vollständig samt `_gemeinsam/`.

## Worum es geht

Fachlich treue Neuumsetzung von `05_wegesys_attrakt.nlogo` (NetLogo 2.1, Reinhard König, 2005; nach Tomor Elezkurtaj, TU Wien). Maßgeblich sind die Regeln und Parameter des Originals (siehe `QUELLE.md`), nicht seine Oberfläche. Begriffe des Originals bleiben erhalten (turtle, patch, density, point-dist, repel-strength, attract, repel, leavePath, deletePath, goto-turtle, ownDist). Die Parameter-IDs sind die NetLogo-Namen, in `p` also `p["point-dist"]`.

## Aufbau

```
_gemeinsam/          gemeinsamer Rahmen (nicht pro App kopieren)
  zufall.js          Zufall.zufall(saat) → () => [0, 1), dazu .ganz(n), .zwischen(a, b), .dreh()
  sim.js             Sim.starte(cfg): Ablauf, Bedienfeld, Zeichenfläche, Sprache, Hell/Dunkel, window.SIM
  sim.css            Gestaltung wie das KI Lab
nl-flusssystem/
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
| `erzeuge(param, zufall)` | `setup`: Zustand `z` mit `t` (ticks), turtles `x`, `y` (Float64Array, NetLogo-Koordinaten −100,5…100,5), `pfad` (Uint8Array 201 · 201, Zeilen von oben), Zielpunkt `hx`, `hy` |
| `schritt(z, param)` | ein tick: `attract` und/oder `repel`; erhöht `z.t` |
| `attract(z, p)`, `naechsteNaeher(z, k)`, `makeStep(z, p, k, tx, ty)` | Regel attract: ownDist, goto-turtle, fd 1 mit stamp |
| `repel(z, p)` | Regel repel: bk repel-strength von der nächsten turtle |
| `setzeZiel(z, spalte, zeile)`, `loesche(z)` | Mausklick (neuer Zielpunkt), deletePath |
| `auswertung(z, p)` | Kennzahlen `ruhe`, `mittel`, `pfad`, `buendelung` (auch für Tests und `pruef_ausdruck`) |
| `wickle`, `versatz`, `abstand`, `patchKoord`, `index` | Torus, kürzester Versatz, Abstand, Patch, Feldindex |

Im Browser steht zum Ausprobieren `window.SIM` bereit: `SIM.schritt(100)`, `SIM.zuruecksetzen(7)`, `SIM.setze("<parameter>", wert)`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&<parameter>=…`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 simulationen/pruefe_apps.py nl-flusssystem` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Mehrere Zielpunkte gleichzeitig (jede turtle zum nächstgelegenen) – Flussgebiete mit Wasserscheiden.
- Spuren mit Stärke statt nur an/aus (wie `mark` in den Wegesystemen A und B), damit Hauptströme breiter erscheinen.
- `repel` nur innerhalb eines Radius, damit sich Ketten nicht über das ganze Feld abstoßen.
