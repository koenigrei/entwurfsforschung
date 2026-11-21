# Wachstum und räumliche Umverteilung durch Skalenerträge

Zellulärer Automat nach Michael Batty (*Cities and Complexity*, Kapitel 1) als Web-App: Zufallswerte je Zelle werden mit dem Exponenten α umverteilt, `P_i(t+1) = (P_i / P̄)^α` – hohe Werte wachsen auf Kosten der übrigen, bis eine Zelle alles besitzt. Als zweite Fassung die Umverteilung über die Moore-Nachbarschaft. Neuumsetzung der Delphi-Programme `19_Growth_01` und `20_Growth_02` von Reinhard König (2005).

Online: https://entwurfsforschung.de/lab/simulationen/wachstum-skalenertraege/ (während der Durchsicht unter `/neu/lab/…`)

## Starten

- Doppelklick auf `index.html` genügt (klassische Skripte, keine Module, kein Build).
- Oder mit lokalem Server aus dem Ordner **über** diesem App-Ordner (dort liegt `_gemeinsam/`):
  `python -m http.server 8000` → http://localhost:8000/wachstum-skalenertraege/
- Außerhalb der Website fehlen nur die Schriften Geist und Geist Mono; der Browser nimmt dann Systemschriften.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite: Kopfzeile, Zeichenfläche, Bedienfeld, Text, Links zu Quellcode und AGENTS.md |
| `modell.js` | Modelllogik ohne DOM (beide Umverteilungsregeln, Schritt, Auswertung) – in Node testbar |
| `app.js` | Bedienung und Darstellung: Parameter, Takt, Zeichnen, Legende, Kennzahlen |
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
