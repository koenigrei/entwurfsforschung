# AGENTS.md · Diffusion Connect Model

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner vollständig samt `_gemeinsam/`.

## Worum es geht

Fachlich treue Neuumsetzung von `23_diffusion-contract` („Diffusion-Contact Model“ 1.0, Delphi, Reinhard König, 17.12.2005), nach Batty, *Cities and Complexity*, Kapitel 1. Maßgeblich sind die Regeln und Parameter des Originals (siehe `QUELLE.md`), nicht seine Oberfläche. Begriffe des Originals bleiben erhalten (Schwellenwert für Anlagerung, Anzahl Agenten für Setup, new Setup, freie Agenten, entwickelt, Moore-Nachbarschaft, Torus). Bewusst übernommene Eigenheiten: Heading in Grad an sin/cos (Bogenmaß), `rndN` mit −2 … 3, entwickelte Zellen zählen weiter.

## Aufbau

```
_gemeinsam/          gemeinsamer Rahmen (nicht pro App kopieren)
  zufall.js          Zufall.zufall(saat) → () => [0, 1), dazu .ganz(n), .zwischen(a, b), .dreh()
  sim.js             Sim.starte(cfg): Ablauf, Bedienfeld, Zeichenfläche, Sprache, Hell/Dunkel, window.SIM
  sim.css            Gestaltung wie das KI Lab
diffusion-connect/
  index.html         statische Seite (Kopf, Bühne, Text, Fuß); lädt zufall.js, sim.js, modell.js, app.js
  modell.js          reine Logik, kein DOM: erzeuge(param, zufall), schritt(z, param)
  app.js             Sim.starte({...}): Parameter, zeichne (Feld und Diagramm), legende, kennzahlen, ende
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
| `erzeuge(param, zufall)` | neuer Zustand `z`: `t`, `n`, je Agent `x`, `y`, `h` (Heading in Grad), `frei`; je Zelle `state` (Agentenzähler), `entw` (entwickelt); `anzahlFrei`, `verlauf` (freie Agenten je Schritt), `fertig` |
| `schritt(z, param)` | ein Zeitschritt (Timer1Timer): Zellen zurücksetzen, Agenten gehen und zählen, Anlagerung prüfen; erhöht `z.t` |
| `schrittVon(heading, korrigiert)` | `[round(sin), round(cos)]` – mit oder ohne Umrechnung in Bogenmaß |
| `nachbarSumme(z, x, y)` | Moore-Summe der States mit der Zelle selbst (checkNei, Torus) |
| `rndN(zufall, u, o)`, `rund(v)`, `torus(v)` | Zufallszahl, Delphis Round und Randbehandlung wie im Original |
| `entwickelt(z)`, `cluster(z)` | Zahl entwickelter Zellen; [Zahl der Cluster, größter Cluster] |

Im Browser steht zum Ausprobieren `window.SIM` bereit: `SIM.schritt(100)`, `SIM.zuruecksetzen(7)`, `SIM.setze("schwelle", 5)`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&schwelle=5&anzahl=4000`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 simulationen/pruefe_apps.py diffusion-connect` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Fraktale Dimension der Cluster (Box-Counting) als Kennzahl, Vergleich mit der diffusionsbegrenzten Anlagerung (DLA, Witten/Sander).
- Parameterraum Schwellenwert × Anzahl als Bild: Zahl und Größe der Cluster, Zeit bis zur Ruhe.
- Agenten, die nur entlang entwickelter Zellen weitergehen (Verbindungen statt Flecken), oder Quellen am Rand wie bei Batty.
