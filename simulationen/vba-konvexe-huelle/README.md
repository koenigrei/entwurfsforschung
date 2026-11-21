# convexHull – Hülle um beliebig verteilte Punkte

Eine konvexe Polylinie umschließt 201 zufällige Punkte, Kante für Kante gesucht wie beim Geschenkpapier-Algorithmus (Jarvis-Marsch). Neuumsetzung des AutoCAD-VBA-Skripts `04convexHull.htm` von Reinhard König (April 2004), mit zwei behobenen Programmfehlern (Arkuskosinus von −1, Pendeln am Ende des Rückwegs). Die Suche läuft Punkt für Punkt; Klick setzt, Rechtsklick entfernt einen Punkt.

Online: https://entwurfsforschung.de/lab/simulationen/vba-konvexe-huelle/ (während der Durchsicht unter `/neu/lab/…`)

## Starten

- Doppelklick auf `index.html` genügt (klassische Skripte, keine Module, kein Build).
- Oder mit lokalem Server aus dem Ordner **über** diesem App-Ordner (dort liegt `_gemeinsam/`):
  `python -m http.server 8000` → http://localhost:8000/vba-konvexe-huelle/
- Außerhalb der Website fehlen nur die Schriften Geist und Geist Mono; der Browser nimmt dann Systemschriften.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite: Kopfzeile, Zeichenfläche, Bedienfeld, Text, Links zu Quellcode und AGENTS.md |
| `modell.js` | Modelllogik ohne DOM (Punkte, Sortieren wie im Original, Winkelwert, Hüllkette Punkt für Punkt) – in Node testbar |
| `app.js` | Bedienung und Darstellung: Feld mit y nach oben, Kanten im AutoCAD-Farbindex, Suchstrahl, Maus, Legende, Kennzahlen |
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
