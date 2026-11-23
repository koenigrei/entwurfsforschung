# Isochronen im ÖPNV

Wie weit kommt man in 5, 10, 15 und 20 Minuten zu Fuß und mit Stadtbahn, Straßenbahn und Bus? Die App rechnet Isochronen aus einem Graphen mit Gehwegen, Linien, Takt (mittlere Wartezeit Takt/2) und Umstiegen, vergleicht zwei Szenarien und lässt Startpunkte und Haltestellen mit der Maus setzen. Neuumsetzung des Werkzeugs „Public Transport Isochronal Map“ aus dem [DeCodingSpaces Lab](https://toolbox.decodingspaces.net/public-transport-isochronal-map/) (Ondřej Veselý, Reinhard König, AIT, 2018) nach dessen Beschreibung.

Online: https://entwurfsforschung.de/lab/parametric-planning-catalogue/isochronen-oepnv/

## Starten

- Mit lokalem Server aus dem Ordner, der `katalog/` und `simulationen/` enthält (so liegt `quellcode.zip` entpackt vor):
  `python -m http.server 8000` → http://localhost:8000/katalog/isochronen-oepnv/
- Doppelklick auf `index.html` geht ebenfalls (klassische Skripte, keine Module, kein Build); außerhalb der Website fehlen nur die Schriften Geist und Geist Mono.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite: Kopfzeile, Zeichenfläche, Bedienfeld, Text, Links zu Quellcode und AGENTS.md |
| `modell.js` | Modelllogik ohne DOM – in Node testbar: multimodaler Graph, schrittweiser Dijkstra, Raster, Isochronen, Bearbeiten der Linien |
| `app.js` | Bedienung und Darstellung: Parameter, Maus, Tafeln A/B/Differenz, Legende, Kennzahlen |
| `../_gemeinsam/geo.js`, `szenen.js`, `karte.js` | Geometrie und Graphen, Beispielszenen (Stadt, Gelände), Zeichenhilfen – gemeinsam für alle Apps des Katalogs |
| `../../simulationen/_gemeinsam/sim.js`, `sim.css`, `zufall.js` | Rahmen der Lab-Apps (Ablauf, Regler, Hell/Dunkel, DE/EN, Saat) |
| `test/modell.test.mjs` | Tests des Modells |
| `app.json` | Metadaten für die Übersichtsseite (Titel, Vorschautext, Eintrag im DeCodingSpaces Lab) |
| `QUELLE.md` | Original, was übernommen und was geändert wurde |
| `AGENTS.md` | Anleitung für Coding-Agenten (und Menschen), die weiterentwickeln |

## Testen

```
node --test
```
(Node 20 oder neuer, im App-Ordner; keine Abhängigkeiten.)

## Lizenz

CC BY 4.0 – Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic (siehe `LICENSE.md`). Vorbild: Eintrag „Public Transport Isochronal Map“ im DeCodingSpaces Lab (ohne Lizenzangabe; Dateien nicht verwendet).
