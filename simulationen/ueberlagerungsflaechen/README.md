# Überlagerungsflächen

Zufällige Rechtecke werden paarweise geschnitten und die Überlagerungsflächen addiert. Neuumsetzung von `05_rechtClipping` (Delphi, Reinhard König, 15.05.2005, Schnitt mit `IntersectRect`) mit der Fassung `04_rechtClipping` (gleiche Rechnung mit Cohen-Sutherland-Clipcodes) als Auswahl. Die Prüfung läuft Paar für Paar; Klick setzt, Rechtsklick entfernt ein Rechteck.

Online: https://entwurfsforschung.de/lab/simulationen/ueberlagerungsflaechen/ (während der Durchsicht unter `/neu/lab/…`)

## Starten

- Doppelklick auf `index.html` genügt (klassische Skripte, keine Module, kein Build).
- Oder mit lokalem Server aus dem Ordner **über** diesem App-Ordner (dort liegt `_gemeinsam/`):
  `python -m http.server 8000` → http://localhost:8000/ueberlagerungsflaechen/
- Außerhalb der Website fehlen nur die Schriften Geist und Geist Mono; der Browser nimmt dann Systemschriften.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite: Kopfzeile, Zeichenfläche, Bedienfeld, Text, Links zu Quellcode und AGENTS.md |
| `modell.js` | Modelllogik ohne DOM (Rechtecke, IntersectRect, Clipcodes und Fallunterscheidung von Cohen-Sutherland, Paar-für-Paar-Ablauf) – in Node testbar |
| `app.js` | Bedienung und Darstellung: Parameter, Knöpfe des Originals, Zeichnen mit Clipcodes, Maus, Legende, Kennzahlen |
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
