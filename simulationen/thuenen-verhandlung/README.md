# Verhandlungsmodell für die Landnutzung nach v. Thünen

Verhandlungsmodell der Landnutzung nach Johann Heinrich von Thünen als Web-App: Landwirte mit festem Produkt tauschen Parzellen im Tauschradius, wenn sie dort eine höhere Lagerente erzielen als der Besitzer; bei Konkurrenz gewinnt das höchste Gebot. Neuumsetzung des Delphi-Programms `413_ThuenenVerhandel` von Reinhard König (2005, Dissertation 2008, Kapitel 4.1.3).

Online: https://entwurfsforschung.de/lab/simulationen/thuenen-verhandlung/ (während der Durchsicht unter `/neu/lab/…`)

## Starten

- Doppelklick auf `index.html` genügt (klassische Skripte, keine Module, kein Build).
- Oder mit lokalem Server aus dem Ordner **über** diesem App-Ordner (dort liegt `_gemeinsam/`):
  `python -m http.server 8000` → http://localhost:8000/thuenen-verhandlung/
- Außerhalb der Website fehlen nur die Schriften Geist und Geist Mono; der Browser nimmt dann Systemschriften.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite: Kopfzeile, Zeichenfläche, Bedienfeld, Text, Links zu Quellcode und AGENTS.md |
| `modell.js` | Modelllogik ohne DOM (Lagerente, Vergleichszellen, Bewerbung, Annahme, Tausch, Märkte) – in Node testbar |
| `app.js` | Bedienung und Darstellung: Parameter, Beispiele der Dissertation, Zeichnen, Legende, Kennzahlen, Klick |
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
