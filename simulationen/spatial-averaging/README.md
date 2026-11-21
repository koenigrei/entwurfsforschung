# Spatial Averaging

Räumliche Mittelung nach Michael Batty (*Cities and Complexity*, Kapitel 1) als Web-App: Eine Zufallsverteilung von −1 und 1 wird über die von-Neumann-Nachbarschaft ausgemittelt, `P_i(t+1) = Σ P_j / 5`. Fassungen mit weißem Rauschen und als Vicsek-Szalay-Modell, in dem Zellen über dem Schwellenwert 4,5 dauerhaft als entwickelt gelten. Neuumsetzung der Delphi-Programme `21_Spatial_Averaging` und `22_Vicsek-Szalay` von Reinhard König (2005).

Online: https://entwurfsforschung.de/lab/simulationen/spatial-averaging/ (während der Durchsicht unter `/neu/lab/…`)

## Starten

- Doppelklick auf `index.html` genügt (klassische Skripte, keine Module, kein Build).
- Oder mit lokalem Server aus dem Ordner **über** diesem App-Ordner (dort liegt `_gemeinsam/`):
  `python -m http.server 8000` → http://localhost:8000/spatial-averaging/
- Außerhalb der Website fehlen nur die Schriften Geist und Geist Mono; der Browser nimmt dann Systemschriften.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite: Kopfzeile, Zeichenfläche, Bedienfeld, Text, Links zu Quellcode und AGENTS.md |
| `modell.js` | Modelllogik ohne DOM (Mittelung, Rauschen, Entwicklung, Auswertung) – in Node testbar |
| `app.js` | Bedienung und Darstellung: Fassungen, Zeichnen, Verlaufsdiagramm, Legende, Kennzahlen |
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
