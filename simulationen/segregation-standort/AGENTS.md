# AGENTS.md · Segregation durch Standortwahl

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner vollständig samt `_gemeinsam/`.

## Worum es geht

Fachlich treue Neuumsetzung von `521_SegragationStandort` „Segregation by Move“ (Delphi, Reinhard König, 2005; Dissertation 2008, Kapitel 5.2.1), einem Segregationsmodell nach Schelling. Maßgeblich sind die Regeln und Parameter des Originals (siehe `QUELLE.md`), nicht seine Oberfläche. Begriffe des Originals (Schwellenwert, Anzahl Agenten für Setup, angelagert, Moore-Nachbarschaft, Torus) bleiben erhalten. Die Regler unter „Erweitert“ stammen aus der zweiten Fassung `521_SegragationStandort2`.

## Aufbau

```
_gemeinsam/          gemeinsamer Rahmen (nicht pro App kopieren)
  zufall.js          Zufall.zufall(saat) → () => [0, 1), dazu .ganz(n), .zwischen(a, b), .dreh()
  sim.js             Sim.starte(cfg): Ablauf, Bedienfeld, Zeichenfläche, Sprache, Hell/Dunkel, window.SIM
  sim.css            Gestaltung wie das KI Lab
segregation-standort/
  index.html         statische Seite (Kopf, Bühne, Text, Fuß); lädt zufall.js, sim.js, modell.js, app.js
  modell.js          reine Logik, kein DOM: erzeuge(param, zufall), schritt(z, param), aendere(z, param, id)
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
| `erzeuge(param, zufall)` | neuer Zustand `z`: `t`, `zelle` (Agentennummer je Zelle oder `FREI`), je Agent `x`, `y`, `typ`, `sucht`, `anteil`, `nachbarn` (Typed Arrays), `suchend`, `verlauf` ([angelagert, suchend, gleiche Nachbarn %] je Schritt), `fertig` |
| `schritt(z, param)` | ein Zeitschritt: `ziehe`, dann `bewerte`; erhöht `z.t` |
| `aendere(z, param, id)` | Schwellenwert und Radius ohne Neustart übernehmen |
| `zaehle(z, x, y, typ, r, ohne)` | Nachbarn [gleich, anders] in der Moore-Nachbarschaft mit Radius r (checkNei) |
| `aehnlich(g, a)`, `zufrieden(anteil, schwelle)` | Anteil gleicher Nachbarn in %; Anhalten bei Anteil > Schwellenwert (calcCells) |
| `ziehe(z, p)`, `bewerte(z, p)` | Umzug aller Suchenden (calcAgents), Bewertung aller Agenten (calcCells) |
| `rndN(zufall, u, o)`, `torus(v, n)` | Zufallsversatz und Randbehandlung wie im Original |
| `gleicheNachbarn(z)` | mittlerer Anteil gleicher Nachbarn (%) |

Im Browser steht zum Ausprobieren `window.SIM` bereit: `SIM.schritt(100)`, `SIM.zuruecksetzen(7)`, `SIM.setze("schwelle", 50)`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&schwelle=50&gruppen=4`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 simulationen/pruefe_apps.py segregation-standort` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Kennzahlen der erweiterten Fassung: Dissimilaritätsindex in Kacheln (`countInTiles`, `IDissimilar`) und Clustergrößen (`startCAna`).
- Analyse des Parameterraums (`Parameterspace.pas`): Ruhezeit und Segregationsgrad über Schwellenwert × Anzahl Agenten als Bild.
- Folgemodelle als eigene Apps: Segregation durch Eigenschaftsanpassung (522), Konkurrenz um zentrale Orte (560).
