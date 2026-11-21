# AGENTS.md · Konkurrenz um zentrale Orte

Anleitung für Coding-Agenten und Menschen, die diese App weiterentwickeln. Wer nur den Link zur App hat, findet hier alles Nötige: `quellcode.zip` neben der `index.html` enthält diesen Ordner vollständig samt `_gemeinsam/`.

## Worum es geht

Fachlich treue Neuumsetzung von `560_KonkurrenzZentrOrte` (Delphi, Reinhard König, März 2006; Dissertation 2008, Kapitel 5.6): Segregation durch Ortsveränderung nach Schelling, ergänzt um zentrale Orte, denen zufriedene Agenten näher kommen wollen. Maßgeblich sind die Regeln und Parameter des Originals (siehe `QUELLE.md`), nicht seine Oberfläche. Begriffe des Originals (Schwellenwert, Anzahl Agenten für Setup, angelagert, Zentrum) bleiben erhalten. Gleicher Quellcode wie `34_Segregation_03_center` im Laboratorium für räumliche Prozesse.

## Aufbau

```
_gemeinsam/          gemeinsamer Rahmen (nicht pro App kopieren)
  zufall.js          Zufall.zufall(saat) → () => [0, 1), dazu .ganz(n), .zwischen(a, b), .dreh()
  sim.js             Sim.starte(cfg): Ablauf, Bedienfeld, Zeichenfläche, Sprache, Hell/Dunkel, window.SIM
  sim.css            Gestaltung wie das KI Lab
zentrale-orte-konkurrenz/
  index.html         statische Seite (Kopf, Bühne, Text, Fuß); lädt zufall.js, sim.js, modell.js, app.js
  modell.js          reine Logik, kein DOM: erzeuge(param, zufall), schritt(z, param), aendere(z, param, id)
  app.js             Sim.starte({...}): Parameter, zeichne (Feld, Zentren, Diagramm), legende, kennzahlen, ende
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
| `erzeuge(param, zufall)` | neuer Zustand `z`: `t`, `zentren`, `dist` (Abstand zum nächsten Zentrum je Zelle), `naechstes`, `zelle`, je Agent `x`, `y`, `typ`, `sucht`, `anteil`, `nachbarn`; `suchend`, `naeher`, `verlauf`, `fertig` |
| `schritt(z, param)` | ein Zeitschritt: `ziehe`, `bewerte`, `naehere` (Timer1Timer); erhöht `z.t` |
| `zentrenFeld(z, art, zufall)` | Zentren und Abstandsfeld (setupCells) |
| `ziehe(z, p)`, `bewerte(z, p)`, `naehere(z, p)` | calcAgents, calcCells, compareLoc |
| `zaehle(z, x, y, typ)` | Nachbarn [gleich, anders] (checkNei) |
| `prozent(achtel)`, `zufrieden(anteil, achtel)` | Schwellenwert in Prozent, Anhalten |
| `gleicheNachbarn(z)`, `mittlererAbstand(z)`, `reinheit(z, r)` | Kennzahlen |

Im Browser steht zum Ausprobieren `window.SIM` bereit: `SIM.schritt(100)`, `SIM.zuruecksetzen(7)`, `SIM.setze("schwelle", 5)`, `SIM.setze("zentren", "eins")`, `SIM.zustand`.
Die Adresse merkt sich Saat und geänderte Parameter (`#saat=7&schwelle=5&zentren=eins`).

## Prüfen

- `node --test` (im App-Ordner)
- Im Repo der Website zusätzlich: `py -3.14 simulationen/pruefe_apps.py zentrale-orte-konkurrenz` (Browser, hell/dunkel, 1440/390 px) und `python bauen.py && python pruefe.py`.

## Ideen für Weiterentwicklung

- Zentren mit der Maus setzen und verschieben.
- Zentren unterschiedlicher Größe oder Anziehung – Übergang zum Modell mit Skalenerträgen (570).
- Analyse der Segregation nach Zentren über den Schwellenwert hinweg (Phasenübergang).
