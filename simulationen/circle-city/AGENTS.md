# AGENTS.md · Modell „Circle City“

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner vollständig samt `_gemeinsam/`.

## Worum es geht

Fachlich treue Neuumsetzung von `590_Circle_City` (Projekt HieNet_5, Delphi, Reinhard König, 2007/2008; Dissertation 2008, Kapitel 5.9): Segregation nach Schelling in einem hierarchischen Netz aus Straßen, Häusern und Wohnungen. Maßgeblich sind die Regeln und Parameter des Originals (siehe `QUELLE.md`), nicht seine Oberfläche. Die Namen der Steuerparameter (`weigthStreets`, `weigthHouses`, `leavePlace`, `settleDown`, Schreibweise wie im Original) bleiben erhalten.

## Aufbau

```
_gemeinsam/          gemeinsamer Rahmen (nicht pro App kopieren)
  zufall.js          Zufall.zufall(saat) → () => [0, 1), dazu .ganz(n), .zwischen(a, b), .dreh()
  sim.js             Sim.starte(cfg): Ablauf, Bedienfeld, Zeichenfläche, Sprache, Hell/Dunkel, window.SIM
  sim.css            Gestaltung wie das KI Lab
circle-city/
  index.html         statische Seite (Kopf, Bühne, Text, Fuß); lädt zufall.js, sim.js, modell.js, app.js
  modell.js          reine Logik, kein DOM: erzeuge(param, zufall), schritt(z, param), aendere(z, param, id)
  app.js             Sim.starte({...}): Parameter, Aktion „Verbindungen löschen“, zeichne (Netz, Agenten, Diagramm), legende, kennzahlen, ende
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
| `erzeuge(param, zufall)` | neuer Zustand `z`: `t`, `geo` (Straßen, Häuser, Wohnungen in Bildpunkten 766 × 766), `kanten`, `n` (Straßenknoten auf dem kürzesten Weg je Straßenpaar), `zustand` (Gruppe je Wohnung, −1 frei), `frei` (FreeList), `agenten`, `zaehlung`, `unzufrieden`, `umzuege`, `fertig`, `verlauf` |
| `schritt(z, param)` | ein Zeitschritt (Execute): `zaehle`, Zufriedenheit in zufälliger Reihenfolge, Umzüge; erhöht `z.t` |
| `geometrie(S, H, W)`, `kanten(S, verbindungen)`, `wege(strassen, kanten)` | CreateNetwork, AssignNeighb, StreetPathes |
| `gewicht(n, wH, wS)` | SetWeights |
| `zaehle(z, p)`, `anteil(z, p, f, g)` | AggregateFractions, CalcFraction |
| `loesche(z, p)` | DeleteConnection |
| `segregationsindex(z)`, `mittlereWeglaenge(z)`, `mittlererAnteil(z, p)` | Kennzahlen (IDissimilar, GraphConnectivity) |

Im Browser steht zum Ausprobieren `window.SIM` bereit: `SIM.schritt(20)`, `SIM.zuruecksetzen(7)`, `SIM.setze("ansiedeln", 0.4)`, `Modell.loesche(SIM.zustand, SIM.param)`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&gruppen=4&gewichtStrasse=0.3`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 simulationen/pruefe_apps.py circle-city` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Analysen des Originals: Phasenübergang über die Schwellen (phaseTransAna), räumliche Effekte (spatialAnalysis), erweiterte Analyse.
- Straßenverbindungen mit der Maus hinzufügen oder löschen; andere Netze (Raster, Baum, Zufallsgraph).
- Segregationsindex auch auf Hausebene (im Original vorbereitet, aber auskommentiert).
