# AGENTS.md · FACS – Free Agents in Cellular Space

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner vollständig samt `_gemeinsam/`.

## Worum es geht

Fachlich treue Neuumsetzung von drei Ständen des Delphi-Projekts `FACS.dpr` (Reinhard König, Mai 2005): `01_FACS`, `02_Swarming` („Einfaches Schwarmverhalten“) und `03_Swarming` („Schwarmverhalten“), wählbar als Fassung (`p.fassung` = `"01"`, `"02"`, `"03"`). Maßgeblich sind die Regeln und Parameter des Originals (siehe `QUELLE.md`), nicht seine Oberfläche. Begriffe des Originals bleiben erhalten (Knotenpunkte, Create Pts, Delete 100 Pts, Attract/Repel, MausRadius, InteraktionsRadius, Mindestabstand, Sichtfeld, Swarming, Zellen markieren, Bewegungsvektoren, Cells Black). Bewusst übernommene Eigenheiten: Delphis Round (zur geraden Zahl), Sichtfeld mit ArcSin, `freieSicht` nur vom letzten Agenten der Liste, in 02 nur Nachbarn mit höherer Listennummer.

## Aufbau

```
_gemeinsam/          gemeinsamer Rahmen (nicht pro App kopieren)
  zufall.js          Zufall.zufall(saat) → () => [0, 1), dazu .ganz(n), .zwischen(a, b), .dreh()
  sim.js             Sim.starte(cfg): Ablauf, Bedienfeld, Zeichenfläche, Sprache, Hell/Dunkel, window.SIM
  sim.css            Gestaltung wie das KI Lab
facs/
  index.html         statische Seite (Kopf, Bühne, Text, Fuß); lädt zufall.js, sim.js, modell.js, app.js
  modell.js          reine Logik, kein DOM: erzeuge(param, zufall), schritt(z, param), aendere(z, param, id)
  app.js             Sim.starte({...}): Parameter (Fassung mit „folgen“), zeichne, legende, kennzahlen, aktionen; Maus über der Zeichenfläche
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
| `erzeuge(param, zufall)` | neuer Zustand `z`: `t`, `n`, je Agent `x`, `y` (Int32), `sx`, `sy` (Vektor), `lx`, `ly` (limbo), `ox`, `oy` (Position vor dem Schritt), `nb`, `sd` (nächster Nachbar und Abstand); `marke` (01/02), `begangen` (03), `maus` |
| `schritt(z, param)` | ein Durchlauf der Idle-Prozedur: `nachbarn` für alle (Swarming), `bewege` für alle, dann `markiere` bzw. `begehe`; erhöht `z.t` |
| `aendere(z, param, id)` | „Zellen markieren“ ohne Neustart |
| `FASSUNGEN`, `VOR` | feste Konstanten je Fassung (Zufallsstärke, Rand, Mischung …) und Voreinstellungen der Regler je Fassung |
| `erzeugeAgenten(z, n)`, `loescheAgenten(z)`, `zellenSchwarz(z)` | Create Pts, Delete 100 Pts, Cells Black |
| `setzeMaus(z, x, y, aktiv)` | Mausposition in Pixeln des Originals (800 × 600) |
| `nachbarn(z, i, p, f)`, `sichtWinkel(…)` | NeigborCheck: limbo, nächster Nachbar, Sichtfeld (ArcSin bzw. ArcCos) |
| `bewege(z, i, p, f)`, `begrenze(z, i, vmax)` | Mischung, Maus oder Zufallsänderung, Höchstgeschwindigkeit, Rand, Schritt |
| `markiere(z)`, `begehe(z)`, `zelleVon(x, y)` | Zellen: Moore-Markierung (01/02), Begehungszähler (03) |
| `rund(v)`, `abstand(…)` | Delphis Round und gerundeter Abstand |
| `ordnung(z)`, `lokaleOrdnung(z, r)`, `tempo(z)`, `zellAnteil(z, f)` | Kennzahlen |

Im Browser steht zum Ausprobieren `window.SIM` bereit: `SIM.schritt(100)`, `SIM.zuruecksetzen(7)`, `SIM.setze("fassung", "02")`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&fassung=02&radius=60`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 simulationen/pruefe_apps.py facs` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Sichtfeld über die Richtung zum Nachbarn (Peilung) statt über den Vergleich der Bewegungsrichtungen, Trennung/Zusammenhalt nach Reynolds (Boids) als weitere Fassung.
- Rückkopplung Zelle → Agent: Agenten folgen den hellen, oft begangenen Zellen (der Schritt zum Wegesystem, vgl. die NetLogo-Wegesysteme).
- Nachbarsuche mit Rasterfächern (Zellen als Index), damit auch mehrere tausend Agenten flüssig laufen.
