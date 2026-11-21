# Segregation durch Standortwahl

Segregation nach Schelling als Web-App: Schwarze und weiße Agenten ziehen um, solange in ihrer Moore-Nachbarschaft der Anteil Gleicher nicht über dem Schwellenwert liegt; aus der Zufallsverteilung entstehen getrennte Quartiere. Neuumsetzung des Delphi-Programms `521_SegragationStandort` „Segregation by Move“ von Reinhard König (2005, Dissertation 2008, Kapitel 5.2.1), mit Optionen aus der erweiterten Fassung.

Online: https://entwurfsforschung.de/lab/simulationen/segregation-standort/ (während der Durchsicht unter `/neu/lab/…`)

## Starten

- Doppelklick auf `index.html` genügt (klassische Skripte, keine Module, kein Build).
- Oder mit lokalem Server aus dem Ordner **über** diesem App-Ordner (dort liegt `_gemeinsam/`):
  `python -m http.server 8000` → http://localhost:8000/segregation-standort/
- Außerhalb der Website fehlen nur die Schriften Geist und Geist Mono; der Browser nimmt dann Systemschriften.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite: Kopfzeile, Zeichenfläche, Bedienfeld, Text, Links zu Quellcode und AGENTS.md |
| `modell.js` | Modelllogik ohne DOM (Nachbarschaft, Schwellenwert, Umzug, Schritt) – in Node testbar |
| `app.js` | Bedienung und Darstellung: Parameter, Feld und Diagramm, Legende, Kennzahlen |
| `../_gemeinsam/sim.js`, `sim.css`, `zufall.js` | gemeinsamer Rahmen aller Frühen Simulationen (Ablauf, Regler, Hell/Dunkel, DE/EN, Saat) |
| `test/modell.test.mjs` | Tests der Modellregeln |
| `app.json` | Metadaten für die Übersichtsseite (Titel, Vorschautext, Archivseite, `repo`) |
| `QUELLE.md` | Originalprogramm, was übernommen und was geändert wurde |
| `AGENTS.md` | Anleitung für Coding-Agenten (und Menschen), die weiterentwickeln |

## Testen

```
node --test
```
(Node 20 oder neuer, im App-Ordner; keine Abhängigkeiten.)

## Lizenz

CC BY 4.0 – Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic (siehe `LICENSE.md`).
