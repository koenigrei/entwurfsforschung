# Erreichbarkeit und Gravitationsmodell

Gezeichneter Graph aus Knoten und Verbindungen: Zeilensummen der Distanzmatrix als Maß der Erreichbarkeit, Streuwert und mittlere Verbindungslänge; Ströme zwischen den Orten nach dem Gravitationsmodell `F = P_i · P_j / d`. Neuumsetzung von `310_Gravitation` (= `18_Gravitation`) und `17_Erreichbarkeit` (Delphi, 2005) von Reinhard König.

Online: https://entwurfsforschung.de/lab/simulationen/gravitation/ (während der Durchsicht unter `/neu/lab/…`)

## Starten

- Doppelklick auf `index.html` genügt (klassische Skripte, keine Module, kein Build).
- Oder mit lokalem Server aus dem Ordner **über** diesem App-Ordner (dort liegt `_gemeinsam/`):
  `python -m http.server 8000` → http://localhost:8000/gravitation/
- Außerhalb der Website fehlen nur die Schriften Geist und Geist Mono; der Browser nimmt dann Systemschriften.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite: Kopfzeile, Zeichenfläche, Bedienfeld, Text, Links zu Quellcode und AGENTS.md |
| `modell.js` | Graph, A*, Erreichbarkeitsanalyse, Gravitationsmodell – ohne DOM, in Node testbar |
| `app.js` | Bedienung und Darstellung: Werkzeuge, Aktionen, Zeichnen, Legende, Kennzahlen |
| `../_gemeinsam/sim.js`, `sim.css`, `zufall.js` | gemeinsamer Rahmen aller Frühen Simulationen (Ablauf, Regler, Hell/Dunkel, DE/EN, Saat) |
| `test/modell.test.mjs` | Tests der Modellregeln |
| `app.json` | Metadaten für die Übersichtsseite (Titel, Vorschautext, Datum, Archivseite, `repo`) |
| `QUELLE.md` | Originalprogramme, was übernommen und was geändert wurde |
| `AGENTS.md` | Anleitung für Coding-Agenten (und Menschen), die weiterentwickeln |

## Testen

```
node --test
```
(Node 20 oder neuer, im App-Ordner; keine Abhängigkeiten.)

## Lizenz

CC BY 4.0 – Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic (siehe `LICENSE.md`).
