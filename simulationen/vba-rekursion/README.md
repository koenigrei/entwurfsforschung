# Rekursive Strukturen 01 – Verzweigungsstrukturen

Jeder Würfel verzweigt sich rekursiv in eine Anzahl weiterer Würfel, Geschoss für Geschoss wie eine Baumstruktur. Neuumsetzung des AutoCAD-VBA-Skripts `iteration01.htm` von Reinhard König (spätestens 2004), mit den Folgefassungen `iteration02.htm` (Ebene mit Belegungsprüfung) und `iteration03.htm` (Höhenstaffelung) als Auswahl. Darstellung als schattierte Würfel in Axonometrie, drehbar per Ziehen.

Online: https://entwurfsforschung.de/lab/simulationen/vba-rekursion/ (während der Durchsicht unter `/neu/lab/…`)

## Starten

- Doppelklick auf `index.html` genügt (klassische Skripte, keine Module, kein Build).
- Oder mit lokalem Server aus dem Ordner **über** diesem App-Ordner (dort liegt `_gemeinsam/`):
  `python -m http.server 8000` → http://localhost:8000/vba-rekursion/
- Außerhalb der Website fehlen nur die Schriften Geist und Geist Mono; der Browser nimmt dann Systemschriften.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite: Kopfzeile, Zeichenfläche, Bedienfeld, Text, Links zu Quellcode und AGENTS.md |
| `modell.js` | Modelllogik ohne DOM (Verzweigung als Breitensuche, Richtung, Geschosse, Fassungen 01–03) – in Node testbar |
| `app.js` | Bedienung und Darstellung: Parameter, Axonometrie mit Zeichenreihenfolge von hinten nach vorn, AutoCAD-Farbindex, Ziehen zum Drehen, Legende, Kennzahlen |
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
