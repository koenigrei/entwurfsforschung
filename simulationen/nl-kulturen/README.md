# 11 Krieg der Kulturen

Krieg der Kulturen als Web-App: Sechs Kulturen mit je neun 8-Bit-Gencodes breiten sich auf einem Zellenfeld aus, wo das Muster der Nachbarn zu einem ihrer Codes passt, mutieren und verdrängen schwächere; ausgestorbene werden mit geerbten Codes neu gegründet. Neuumsetzung des NetLogo-Modells `08_culturesFight09.nlogo` („11_Krieg der Kulturen“, 06.04.2005) von Reinhard König, nach Peter Jossen und Daniel Eyer.

Online: https://entwurfsforschung.de/lab/simulationen/nl-kulturen/ (während der Durchsicht unter `/neu/lab/…`)

## Starten

- Doppelklick auf `index.html` genügt (klassische Skripte, keine Module, kein Build).
- Oder mit lokalem Server aus dem Ordner **über** diesem App-Ordner (dort liegt `_gemeinsam/`):
  `python -m http.server 8000` → http://localhost:8000/nl-kulturen/
- Außerhalb der Website fehlen nur die Schriften Geist und Geist Mono; der Browser nimmt dann Systemschriften.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite: Kopfzeile, Zeichenfläche, Bedienfeld, Text, Links zu Quellcode und AGENTS.md |
| `modell.js` | Modelllogik ohne DOM (Nachbarschaftsmuster, Gencodes, Rand, Auslöschung, Neugründung, Mutation) – in Node testbar |
| `app.js` | Bedienung und Darstellung: Regler, Feld, Verlauf der Populationen, Legende, Kennzahlen mit den Gencodes der stärksten Kultur |
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
