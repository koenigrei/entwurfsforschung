# Konkurrenz um zentrale Orte

Segregation mit zentralen Orten als Web-App: Schwarze und weiße Agenten ziehen um, solange zu wenige Gleiche in ihrer Moore-Nachbarschaft wohnen; zufriedene Agenten rücken näher an das nächste Zentrum. Die Quartiere verdichten sich um die Zentren und trennen sich nach Zentren. Neuumsetzung des Delphi-Programms `560_KonkurrenzZentrOrte` von Reinhard König (März 2006, Dissertation 2008, Kapitel 5.6).

Online: https://entwurfsforschung.de/lab/simulationen/zentrale-orte-konkurrenz/ (während der Durchsicht unter `/neu/lab/…`)

## Starten

- Doppelklick auf `index.html` genügt (klassische Skripte, keine Module, kein Build).
- Oder mit lokalem Server aus dem Ordner **über** diesem App-Ordner (dort liegt `_gemeinsam/`):
  `python -m http.server 8000` → http://localhost:8000/zentrale-orte-konkurrenz/
- Außerhalb der Website fehlen nur die Schriften Geist und Geist Mono; der Browser nimmt dann Systemschriften.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite: Kopfzeile, Zeichenfläche, Bedienfeld, Text, Links zu Quellcode und AGENTS.md |
| `modell.js` | Modelllogik ohne DOM (Abstandsfeld der Zentren, Nachbarschaft, Schwellenwert, Umzug, Näherrücken) – in Node testbar |
| `app.js` | Bedienung und Darstellung: Parameter, Feld mit Zentren und Diagramm, Legende, Kennzahlen |
| `../_gemeinsam/sim.js`, `sim.css`, `zufall.js` | gemeinsamer Rahmen aller Frühen Simulationen (Ablauf, Regler, Hell/Dunkel, DE/EN, Saat) |
| `test/modell.test.mjs` | Tests der Modellregeln |
| `app.json` | Metadaten für die Übersichtsseite (Titel, Vorschautext, Archivseite, Entstehungsdatum, `repo`) |
| `QUELLE.md` | Originalprogramm, was übernommen und was geändert wurde |
| `AGENTS.md` | Anleitung für Coding-Agenten (und Menschen), die weiterentwickeln |

## Testen

```
node --test
```
(Node 20 oder neuer, im App-Ordner; keine Abhängigkeiten.)

## Lizenz

CC BY 4.0 – Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic (siehe `LICENSE.md`).
