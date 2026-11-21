# 07 wegesystem B

Selbstorganisierendes Wegesystem: turtles prüfen nur die drei Zellen vor sich (schräg links, geradeaus, schräg rechts), folgen bevorzugt Markierungen (path-attract) und markieren selbst; Markierungen verfallen (decrease-per-tick). Nach einigen tausend Schritten entsteht ein relativ orthogonales Hauptwegesystem. Neuumsetzung von `wegesystem02direction.nlogo` (NetLogo, 2005) von Reinhard König, mit „B update 1“ (`wegesystem04.nlogo`: Wege einzeichnen, show-mark-over) und dem Vorgänger „06 wegesystem A“ (`wegesystem01.nlogo`: acht Nachbarn, absolute Richtungen) als Fassungen.

Online: https://entwurfsforschung.de/lab/simulationen/nl-wegesystem-b/ (während der Durchsicht unter `/neu/lab/…`)

## Starten

- Doppelklick auf `index.html` genügt (klassische Skripte, keine Module, kein Build).
- Oder mit lokalem Server aus dem Ordner **über** diesem App-Ordner (dort liegt `_gemeinsam/`):
  `python -m http.server 8000` → http://localhost:8000/nl-wegesystem-b/
- Außerhalb der Website fehlen nur die Schriften Geist und Geist Mono; der Browser nimmt dann Systemschriften.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite: Kopfzeile, Zeichenfläche, Bedienfeld, Text, Links zu Quellcode und AGENTS.md |
| `modell.js` | Modelllogik ohne DOM (turtles, Markierung, Verfall, Kennzahlen) – in Node testbar |
| `app.js` | Bedienung und Darstellung: Regler, Fassung, Zeichnen, Wege einzeichnen, Legende, Kennzahlen |
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
