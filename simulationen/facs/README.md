# FACS – Free Agents in Cellular Space

Freie Agenten über einem Zellenraster (nach Portugali), in drei Fassungen: 01 FACS – Zufallsbewegung, die Zellen unter den Agenten und ihre Moore-Nachbarn werden markiert; 02 Einfaches Schwarmverhalten – die Bewegungsvektoren im Interaktionsradius werden aneinander angepasst; 03 Schwarmverhalten – mit Sichtfeld und Mindestabstand, die Zellen zeichnen die Häufigkeit der Begehung auf. Die Maus stößt Agenten ab oder zieht sie an. Neuumsetzung der Delphi-Programme `01_FACS`, `02_Swarming` und `03_Swarming` (Mai 2005) von Reinhard König.

Online: https://entwurfsforschung.de/lab/simulationen/facs/ (während der Durchsicht unter `/neu/lab/…`)

## Starten

- Doppelklick auf `index.html` genügt (klassische Skripte, keine Module, kein Build).
- Oder mit lokalem Server aus dem Ordner **über** diesem App-Ordner (dort liegt `_gemeinsam/`):
  `python -m http.server 8000` → http://localhost:8000/facs/
- Außerhalb der Website fehlen nur die Schriften Geist und Geist Mono; der Browser nimmt dann Systemschriften.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite: Kopfzeile, Zeichenfläche, Bedienfeld, Text, Links zu Quellcode und AGENTS.md |
| `modell.js` | Modelllogik ohne DOM (Bewegung, Maus, Swarming, Sichtfeld, Zellen) – in Node testbar |
| `app.js` | Bedienung und Darstellung: Parameter, Fassungen, Zellen, Linien, Agenten, Maus über der Zeichenfläche, Kennzahlen |
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
