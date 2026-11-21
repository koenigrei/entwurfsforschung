# AGENTS.md · Interaktionsmodell Standortwahl und Skalenerträge

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner vollständig samt `_gemeinsam/`.

## Worum es geht

Fachlich treue Neuumsetzung von `570_Interakt_Standort_Skalenertr` „Segregation and Economies of Scale“ (Delphi, Reinhard König, März 2006; Dissertation 2008, Kapitel 5.7): das Skalenertragsmodell (Märkte, Angebotspreis, Fahrtkosten, Einzugsgebiete) gekoppelt mit der Segregation durch Standortwahl und der Suche nach zentralen Orten. Maßgeblich sind die Regeln und Parameter des Originals (siehe `QUELLE.md`), nicht seine Oberfläche. Begriffe des Originals (Produktionskosten, Fahrtkosten, Skalenertrag, Angebotspreis, Einzugsgebiet, Schwellenwert) bleiben erhalten. Gleicher Quellcode wie `35_segregation_04_scalen` im Laboratorium für räumliche Prozesse.

## Aufbau

```
_gemeinsam/          gemeinsamer Rahmen (nicht pro App kopieren)
  zufall.js          Zufall.zufall(saat) → () => [0, 1), dazu .ganz(n), .zwischen(a, b), .dreh()
  sim.js             Sim.starte(cfg): Ablauf, Bedienfeld, Zeichenfläche, Sprache, Hell/Dunkel, window.SIM
  sim.css            Gestaltung wie das KI Lab
standort-skalenertraege/
  index.html         statische Seite (Kopf, Bühne, Text, Fuß); lädt zufall.js, sim.js, modell.js, app.js
  modell.js          reine Logik, kein DOM: erzeuge(param, zufall), schritt(z, param), aendere(z, param, id)
  app.js             Sim.starte({...}): Parameter, zeichne (Feld, Märkte, Diagramm), legende, kennzahlen
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
| `erzeuge(param, zufall)` | neuer Zustand `z`: `t`, `maerkte`, `distM` (Entfernung jeder Zelle zu jedem Markt), `preis`, `kunden`, `ortspreis`, `gebiet`, `zelle`, je Agent `x`, `y`, `typ`, `sucht`, `anteil`; `suchend`, `umzuege`, `verlauf` ([Kunden je Markt, Angebotspreise] je Schritt) |
| `schritt(z, param)` | ein Zeitschritt (execPerStep): `bietpreise`, `ortspreise`, `ziehe`, `bewerte`, `vergleiche`; erhöht `z.t` |
| `angebotspreis(kunden, s, produktionskosten)` | Angebotspreis eines Marktes (calcBidPrice) |
| `ortspreise(z, p)` | Ortspreis und Einzugsgebiet je Zelle, Kunden je Markt (setLocP, changeArea) |
| `ziehe(z)`, `bewerte(z, p)`, `vergleiche(z)` | calcAgents, calcCells, compareLoc |
| `sprung(zufall)` | Sprungweite random(20) − 10 |
| `aktiveMaerkte(z)`, `groessterAnteil(z)`, `gleicheNachbarn(z)`, `mittlererOrtspreis(z)` | Kennzahlen |

Im Browser steht zum Ausprobieren `window.SIM` bereit: `SIM.schritt(300)`, `SIM.zuruecksetzen(7)`, `SIM.setze("skalen", 1.1)`, `SIM.setze("zentren", false)`, `SIM.zustand.kunden`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&skalen=1.1&ansicht=preise`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 simulationen/pruefe_apps.py standort-skalenertraege` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Märkte mit der Maus setzen und verschieben, wie im Skalenertragsmodell.
- Märkte ohne Kunden schließen und an anderer Stelle neu gründen lassen.
- Mietpreise als dritten Faktor der Standortwahl einbeziehen (siehe `mietpreisdynamik`).
