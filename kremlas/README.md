# KREMLAS · Dichte Packung

Grundrisse durch dichte Packung: Eine hybride Evolutionsstrategie (μ+λ) bzw. (μ,λ) mit Kollisionserkennung ordnet Räume fester Fläche überlappungsfrei in einem Umgebungsrechteck an; virtuelle Federn sorgen für gewünschte Nachbarschaften (Stern, Gang mit drei Wohnungen oder Raumprogramm einer Wohnung). Die Grundriss-Fassungen leiten aus der Packung einen Grundriss mit Wänden, Türen und Eingang ab. Neuumsetzung des C#-Programms „Einpassung“ (`Source/Kremlas/` im Repository cpg_all) von Reinhard König aus dem DFG-Projekt KREMLAS (2009–2011).

Online: https://entwurfsforschung.de/lab/kremlas/ (eigenes Projekt im KI Lab; bis 23.11.2026 unter den Frühen Simulationen, die alte Adresse leitet weiter)

## Fassungen

| Fassung | Ablauf im Original | Voreinstellung |
|---|---|---|
| Einpassung | `REvo.RunAdjust` + `NextGeneration` (Stand des Programms) | 25 Räume, μ = 1, Druck 2 |
| Kollision allein | derselbe Ablauf mit μ = 1, Druck 1: nur Kollisionserkennung, keine Selektion | 10 Räume, α 0,1, ρG 0,5, β 0,5, ρL 1 |
| Topologie: Stern | `REvo.RunTopo` + `NextGenerationProportionate`, `SetNeighbours` | 8 Räume, μ = 10 |
| Topologie: Gang | dasselbe mit `SetSzenario` (Gang, drei Wohnungen zu fünf Räumen) | 16 Räume, μ = 10 |
| Grundriss: 6 Räume (Voreinstellung) | dasselbe mit einem angenommenen Programm (Flur, Wohnen, Küche, Eltern, Zimmer, Bad, 86 m²) | Belegung 96 %, Mindestmaße an, μ = 20 |
| Grundriss: 8 Räume | dasselbe mit dem Raumprogramm aus Buch Tab. 8 (= `GrowPolys`, auskommentiert, 86 m²), Sterntopologie um den Flur wie im Buch, wahlweise Wohnung mit Eingang; Grundriss mit Wänden und Türen (neu) | Belegung 96 % mit Mindestmaßen (100 % wie im Buch ohne), kürzeste Seite 0,4 · √Fläche, μ = 20 |
| Grundriss: 10 Räume | dasselbe mit Buch Tab. 9 (Essen, zweites Bad) | wie oben |

Regler **Belegung**: Anteil des Umgebungsrechtecks, den die Räume zusammen einnehmen (30–100 %, im Original fest 75 %). Regler **kürzeste Seite**: Untergrenze als Anteil von √Fläche (Original fest 0,75). Regler **Federrunden**: wie oft je Kind Federn und Kollisionserkennung abwechseln (Original 2; Topologie und Gang 10, Grundriss 5). Die Wahl Stern/Wohnung erscheint nur in den Grundriss-Fassungen; „Topologie zeigen“ legt die Nachbarschaften dort als Linien über den Grundriss. Schalter **Mindestmaße** (neu, Grundriss-Fassungen): Mindestbreite je Raum (Flur 1,20 m nach DIN 18040-2, sonst angenommen), Fläche ≥ 95 %, Plan-Bewertung f3 in der Selektion. **Lösungen** unter der Zeichenfläche: *Grundrisse suchen* sammelt die eingestellte Zahl gültiger Grundrisse (voreingestellt 3) aus vielen kurzen Läufen; ein Klick auf eine Karte lädt den Grundriss in die Einzelansicht. **L-förmig erlaubt** (Kästchen je Raum unter „Mindestmaße“): ein Raum aus zwei bündigen Rechtecken, wenn seine Fläche dafür reicht.

## Starten

- Doppelklick auf `index.html` genügt (klassische Skripte, keine Module, kein Build).
- Oder mit lokalem Server aus dem Ordner **über** diesem App-Ordner (dort liegen `kremlas/` und `simulationen/_gemeinsam/`):
  `python -m http.server 8000` → http://localhost:8000/kremlas/
- Außerhalb der Website fehlen nur die Schriften Geist und Geist Mono; der Browser nimmt dann Systemschriften.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite: Kopfzeile, Zeichenfläche, Bedienfeld, Text, Links zu Quellcode und AGENTS.md |
| `modell.js` | Modelllogik ohne DOM – in Node testbar |
| `app.js` | Bedienung und Darstellung: Parameter, Zeichnen, Verlauf, Legende, Kennzahlen, Ziehen mit der Maus |
| `../simulationen/_gemeinsam/sim.js`, `sim.css`, `zufall.js` | gemeinsamer Rahmen der Frühen Simulationen, den KREMLAS mitnutzt (Ablauf, Regler, Hell/Dunkel, DE/EN, Saat) |
| `test/modell.test.mjs` | Tests der Modellregeln und des erwarteten Verhaltens |
| `app.json` | Metadaten für die Übersichtsseite (Titel, Vorschautext, Datum, Archivseite, `repo`) |
| `QUELLE.md` | Originalprogramm, was übernommen und was geändert wurde |
| `AGENTS.md` | Anleitung für Coding-Agenten (und Menschen), die weiterentwickeln |

## Testen

```
node --test
```
(Node 20 oder neuer, im App-Ordner; keine Abhängigkeiten.)

## Lizenz

CC BY 4.0 – Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic (siehe `LICENSE.md`).
