# Vom Straßennetz zum Gebäude

Eine Kette von Komponenten erzeugt Straßen, Blöcke, Parzellen, Baufenster und Gebäude – Stufe für Stufe, im Plan und als drehbare Axonometrie. Neuumsetzung des Grasshopper-Moduls „Building Generation“ aus dem [Parametric Planning Catalogue](https://infar-buw.github.io/parametric-planning-catalogue/docs/BuildingGeneration/) (DeCodingSpaces), mit dem Modul [„Placement on Parcel“](https://infar-buw.github.io/parametric-planning-catalogue/docs/BuildingPlacementOnParcels/) (DeCodingSpaces – Martin Dennemark) als Option „Gebäude aus Vorlagen“.

Online: https://entwurfsforschung.de/lab/parametric-planning-catalogue/gebaeude-generierung/

## Starten

- Mit lokalem Server aus dem Ordner, der `katalog/` und `simulationen/` enthält (so liegt `quellcode.zip` entpackt vor):
  `python -m http.server 8000` → http://localhost:8000/katalog/gebaeude-generierung/
- Doppelklick auf `index.html` geht ebenfalls (klassische Skripte, keine Module, kein Build); außerhalb der Website fehlen nur die Schriften Geist und Geist Mono.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite: Kopfzeile, Zeichenfläche, Bedienfeld, Text, Links zu Quellcode und AGENTS.md |
| `modell.js` | Modelllogik ohne DOM – in Node testbar |
| `app.js` | Bedienung und Darstellung: Parameter, Zeichnen, Legende, Kennzahlen |
| `../_gemeinsam/geo.js`, `szenen.js`, `karte.js` | Geometrie und Graphen, Beispielszenen (Stadt, Gelände), Zeichenhilfen – gemeinsam für alle Apps des Katalogs |
| `../_gemeinsam/flaechen.js` | Flächen aus Linien, Teilen an Schnitten, Kantenversatz je Kante, konvexe Polygonoperationen (Flaechen) – gemeinsam für mehrere Apps des Katalogs |
| `../_gemeinsam/generierung.js` | Instruktionsbaum, Straßenwachstum und Slicing Tree (Generierung) – gemeinsam für mehrere Apps des Katalogs |
| `../_gemeinsam/axonometrie.js` | Prismen-Axonometrie für app.js: Projektion, Malerverfahren, Prisma zeichnen, Drehen (Axo) – gemeinsam für mehrere Apps des Katalogs |
| `../../simulationen/_gemeinsam/sim.js`, `sim.css`, `zufall.js` | Rahmen der Lab-Apps (Ablauf, Regler, Hell/Dunkel, DE/EN, Saat) |
| `test/modell.test.mjs` | Tests des Modells |
| `app.json` | Metadaten für die Übersichtsseite (Titel, Vorschautext, Katalogeintrag) |
| `QUELLE.md` | Original, was übernommen und was geändert wurde |
| `AGENTS.md` | Anleitung für Coding-Agenten (und Menschen), die weiterentwickeln |

## Testen

```
node --test
```
(Node 20 oder neuer, im App-Ordner; keine Abhängigkeiten.)

## Lizenz

CC BY 4.0 – Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic (siehe `LICENSE.md`). Vorbild: Parametric Planning Catalogue, MIT-Lizenz; Verfahren der kompilierten Komponenten abgeglichen mit der DeCodingSpaces-Toolbox (GPL-3.0), kein Code übernommen.
