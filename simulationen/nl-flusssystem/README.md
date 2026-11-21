# 08 flusssystem

Viele Quellen streben einem per Mausklick gesetzten Ziel zu: jede turtle geht zur nächsten turtle, die dem Ziel schon näher ist, und färbt ihre Spur orange; die Spuren bündeln sich wie ein Flusslauf (nach Tomor Elezkurtaj, TU Wien). Neuumsetzung von `05_wegesys_attrakt.nlogo` (NetLogo, 2005) von Reinhard König.

Online: https://entwurfsforschung.de/lab/simulationen/nl-flusssystem/ (während der Durchsicht unter `/neu/lab/…`)

## Starten

- Doppelklick auf `index.html` genügt (klassische Skripte, keine Module, kein Build).
- Oder mit lokalem Server aus dem Ordner **über** diesem App-Ordner (dort liegt `_gemeinsam/`):
  `python -m http.server 8000` → http://localhost:8000/nl-flusssystem/
- Außerhalb der Website fehlen nur die Schriften Geist und Geist Mono; der Browser nimmt dann Systemschriften.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite: Kopfzeile, Zeichenfläche, Bedienfeld, Text, Links zu Quellcode und AGENTS.md |
| `modell.js` | Modelllogik ohne DOM (attract, repel, Spur, Zielpunkt, Kennzahlen) – in Node testbar |
| `app.js` | Bedienung und Darstellung: Regler, Schalter, deletePath, Zielpunkt per Maus, Zeichnen, Legende, Kennzahlen |
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
