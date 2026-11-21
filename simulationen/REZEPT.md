# Rezept: eine neue App der Frühen Simulationen

Die Simulationsprogramme der alten Website (Delphi, NetLogo, AutoCAD-VBA, Flash) werden einzeln als Web-Apps neu umgesetzt. Diese Anleitung beschreibt, wie die nächste App entsteht – so, dass mehrere Agenten parallel arbeiten können, ohne sich in die Quere zu kommen.

Muster zum Abschauen (die vier Piloten der ersten Runde, 21.11.2026):

| App | Original | zeigt im Rahmen |
|---|---|---|
| `thuenen-ringe/` | Delphi 412 | Rasterfeld mit `Sim.raster`, Klick setzt/entfernt Märkte, Parameter wirken ohne Neustart (`aendere`), Aktion „Märkte löschen“ |
| `segregation-standort/` | Delphi 521 | Agenten im Raster, Ende bei Ruhe (`ende`), Verlaufsdiagramm neben dem Feld, Optionen aus einer zweiten Fassung |
| `nl-wegesystem-b/` | NetLogo | Turtles mit stetigen Koordinaten und heading, Spuren mit Verfall, Wege mit der Maus zeichnen, Auswahl „Fassung“ mit eigenen Voreinstellungen |
| `vba-rekursion/` | AutoCAD-VBA | 3D-Würfel in eigener Axonometrie, drehen per Ziehen, ein Schritt = ein Würfel, drei Fassungen |

## Grundsätze

- **Fachlich treu, nicht pixelgleich**: Regeln, Parameter (Bereiche und Voreinstellungen), Ablauf und Begriffe des Originals übernehmen; die Oberfläche folgt dem Lab. Jede Abweichung steht mit Grund in `QUELLE.md`.
- **Fehler des Originals**: Was das Modell ausmacht, bleibt – auch Eigenheiten wie Rundungen oder die Reihenfolge der Aktualisierung. Offensichtliche Programmfehler (Absturz, Endlosschleife, zwei Agenten auf einer Zelle, unbegrenzt wachsende Geschwindigkeit) werden behoben und in `QUELLE.md` unter „Bewusst geändert“ benannt.
- **Keine .exe ausführen.** Nur Quelltext (`.pas`, `.dfm`, `.nlogo`, VBA-Text auf den Seiten), Beschreibungen und Bilder lesen. ZIPs in ein eigenes leeres Verzeichnis außerhalb des Repos entpacken (Scratchpad), nichts davon ins Repo kopieren. Delphi-Quellen sind meist cp1252: `iconv -f cp1252 -t utf-8 datei.pas`.
- **Eine App = ein Ordner** `simulationen/<id>/`. Außerhalb davon ändert ein App-Agent nichts – auch nicht `_gemeinsam/`, `bauen.py`, `pruefe.py`, `projekte.json`.
- **Zentrale Datei ist nur `bestand.json`.** Status und Zuordnung ändert, wer die Arbeit verteilt (Koordinator): vor dem Start `in_arbeit`, nach Durchsicht `umgesetzt`. Ein App-Agent meldet Fertigstellung, statt `bestand.json` selbst zu ändern. Braucht eine App etwas Neues in `_gemeinsam/`, schreibt sie es zunächst in ihre `app.js` und meldet den Vorschlag.
- **Keine Inhalte fremder Server**: keine CDNs, Webfonts, iframes, `fetch` nach außen. Vanilla JS, Canvas oder SVG, kein Build.
- **Wer nur den Link hat, kann weiterarbeiten**: Jede App-Seite verlinkt sichtbar „Quellcode · Weiterentwickeln“ (`quellcode.zip`, erzeugt `bauen.py`) und `AGENTS.md` und trägt im `<head>` `<link rel="help" href="AGENTS.md">` und `<meta name="source" content="quellcode.zip">`. Die Vorlage enthält das schon – nicht entfernen.
- Texte auf Deutsch, Bedienung DE/EN. Namensnennung „Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic“, Lizenz CC BY 4.0.

## Schritte

1. **Programm wählen** in `bestand.json` (Felder siehe dort; `welle` 1 zuerst). Der Koordinator setzt `status: "in_arbeit"` und `app: "<id>"`.
2. **Ordner anlegen**: `python simulationen/neue_app.py <id>` – kopiert `_vorlage/` und setzt Titel, Original, Herkunft, Jahr, Archivseite und Kurzbeschreibung aus `bestand.json` ein. Die Vorlage läuft sofort (Platzhaltermodell), Tests sind grün.
3. **Original lesen**: Quelle laut `quellpfad`, Beschreibung laut `alt_seite` (zwischengespeichert unter `alt_inhalte/cache/alt/…`) und die neue Archivseite (`archiv_inhalte/*.json`, Felder `inhalt` und `unterseiten[].inhalt`). Bei Delphi: Regeln in den Units (`agenten.pas`, `cell*.pas`, `Calcer.pas` …), Parameter und Voreinstellungen in `*.dfm` (`Min`, `Max`, `Position`, `Checked`), Ablauf in der Idle- oder Timer-Prozedur. Bei NetLogo: `to setup`/`to go`, Schieberegler im Abschnitt nach dem Code (`SLIDER`-Blöcke: Name, Min, Max, Wert). Bei VBA: Code steht auf der Seite.
4. **`modell.js` schreiben** – reine Logik, kein DOM, keine Abhängigkeiten:
   - `STANDARD` (Voreinstellungen des Originals), `erzeuge(param, zufall)` → Zustand `z` mit `z.t = 0`, `schritt(z, param)` (erhöht `z.t`), optional `aendere(z, param, id)` für Parameter ohne Neustart.
   - Zufall nur über die übergebene Funktion (`zufall()`, `zufall.ganz(n)`, `zufall.zwischen(a, b)`, `zufall.dreh()` = −1/0/1 wie Delphis `random(3) - 1`). Nie `Math.random()`.
   - Regeln als einzelne exportierte Funktionen, damit sie testbar sind. Kommentar mit Verweis auf die Originalstelle.
   - Schnell genug für 60 Bilder/s bei der Voreinstellung (große Felder: Typed Arrays, keine Objekte je Zelle; Tabellen vorausberechnen).
5. **Tests** in `test/*.test.mjs` (Node-Testrunner, `createRequire` wie in der Vorlage): je Regel ein nachgerechnetes Beispiel, Grenzfälle, Wiederholbarkeit (gleiche Saat → gleicher Lauf, andere Saat → anderer), ein erwartetes Verhalten aus der Beschreibung des Originals (z. B. „Segregationsgrad steigt“, „Ringfolge A–C–B“). Ausführen im App-Ordner: `node --test`.
6. **`app.js`**: `Sim.starte({...})` mit `parameter` (Regler/Schalter/Auswahl mit Namen `{de, en}`, Bereichen und Voreinstellungen des Originals, `neustart: true` wo nötig), `groesse`, `zeichne(ctx, z, p, F)` (Zeichnen im Modellmaßstab; Farben aus `F`, damit Hell/Dunkel stimmt; Rasterfelder mit `Sim.raster`), optional `klick`, `aktionen`, `ende`, `legende`, `kennzahlen`. Originalfarben dürfen bleiben, müssen aber in beiden Darstellungen lesbar sein.
7. **`index.html`**: Titel, Bedienhinweis, Text DE/EN (zwei bis vier Absätze, Regeln gern als `<code>`-Formel), Originalzeile. Kopf, Fuß und Pflichtlinks unverändert lassen.
8. **`app.json`** (der Ausdruck darf `SIM` und `Modell` benutzen): Vorschautext DE/EN für die Kachel (ein bis zwei Sätze), `jahr`, `vorschau_saat`, `vorschau_schritte` und `vorschau_param` (Zustand fürs Kachelbild), `pruef_ausdruck` (JavaScript, wahr nach diesen Schritten, z. B. eine Kennzahl im erwarteten Bereich), `repo: null` (öffentliches Repo folgt).
9. **`QUELLE.md`, `README.md`, `AGENTS.md`** ausfüllen (alle TODO ersetzen). `QUELLE.md`: Original, Jahr, Seite, Archivlink `../../../archiv/<archiv>`, Übernommen, Bewusst geändert.
10. **Prüfen**:
    - `node --test` im App-Ordner – grün.
    - `py -3.14 simulationen/pruefe_apps.py <id>` – Browser, dunkel/hell, 1440/390 px: keine Laufzeitfehler, kein waagerechtes Scrollen, Start/Pause/Schritt/Zurücksetzen, Pflichtlinks, `pruef_ausdruck`; schreibt `<id>/vorschau.png` (Kachelbild) und Bildschirmfotos nach `simulationen/_pruefung/`. Bildschirmfotos ansehen: Verhält sich das Modell wie beschrieben?
    - Kein `TODO` und kein `{{…}}` mehr im Ordner: `grep -rn "TODO\|{{" simulationen/<id>/`.
    - Zustände, die `pruefe_apps.py` nicht abdeckt (andere Fassung, gedrehte Ansicht, eingezeichnete Wege), mit einem eigenen kurzen Playwright-Skript im Scratchpad ansehen – nicht im Repo ablegen.
    - `bauen.py`/`pruefe.py` startet nur der Koordinator (`bauen.py` löscht `site/` und baut neu – parallel aufgerufen stören sich die Läufe). `pruefe_apps.py` braucht keinen Bau.
11. **Melden** an den Koordinator: was umgesetzt ist, was am Original geändert wurde, offene Fragen. Der Koordinator setzt den Status auf `umgesetzt`, erneuert `BESTAND.md` (`python simulationen/bestand_md.py`), startet `py -3.14 simulationen/pruefe_apps.py` (alle, erneuert das Mosaik `bilder/simulationen.png` der Lab-Kachel), `python bauen.py`, `python pruefe.py`.

## Was der Rahmen erledigt

| Datei | Aufgabe |
|---|---|
| `_gemeinsam/sim.js` | Bedienfeld (Start, Pause, Schritt, Zurück, Saat, Schritte je Bild, Parameter, Kennzahlen), Ablaufschleife, Zeichenfläche mit Maßstab und hoher Auflösung, Maus/Finger in Modellkoordinaten, DE/EN, Hell/Dunkel (`entwurfsforschung-theme`), Saat und geänderte Parameter in der Adresse (`#saat=7&…`), `window.SIM` für Prüfungen |
| `_gemeinsam/sim.css` | Gestaltung wie das Lab: Geist/Geist Mono, schwarz als Voreinstellung, feine Linien, Akzent #4649e1/#9ea0f3, Mono-Beschriftungen in Großbuchstaben |
| `_gemeinsam/zufall.js` | `Zufall.zufall(saat)` (mulberry32), Browser und Node |
| `neue_app.py` | neuer App-Ordner aus `_vorlage/` |
| `bestand_md.py` | `BESTAND.md` aus `bestand.json` |
| `pruefe_apps.py` | Browserprüfung und Kachelbilder ohne Bau |
| `bauen.py` (Repo) | kopiert jede App mit Status `umgesetzt` nach `site/lab/simulationen/<id>/`, erzeugt `quellcode.zip` (App-Ordner + `_gemeinsam/`), Kachelbild, Übersichtsseite |
| `pruefe.py` (Repo) | Pflichtdateien, `quellcode.zip`, Pflichtlinks, kein DOM in `modell.js`, `node --test` je App |

## Schnittstelle `Sim.starte(cfg)`

| Feld | Pflicht | Bedeutung |
|---|---|---|
| `modell` | ja | Objekt mit `erzeuge`, `schritt`, optional `aendere` |
| `parameter` | – | `[{id, name:{de,en}, gruppe?, art?: "regler"\|"schalter"\|"auswahl", min, max, schritt, wert, optionen?, neustart?, groesseNeu?, folgen?, format?}]` – `folgen: {"<optionswert>": {andererParameter: wert}}` setzt beim Wechsel einer Auswahl abhängige Voreinstellungen (z. B. eine „Fassung“ des Originals); `groesseNeu: true` berechnet danach die Zeichenfläche neu |
| `groesse(z, p)` | ja | `{b, h}` – Ausdehnung der Zeichnung in Modelleinheiten |
| `zeichne(ctx, z, p, F)` | ja | zeichnet im Modellmaßstab; `F.px` = Modelleinheiten je Bildschirmpixel (für Linienstärken) |
| `klick(z, p, x, y, taste, phase)` | – | Maus/Finger; `taste` `"links"`/`"rechts"` (Rechtsklick oder Umschalt), `phase` `"unten"`/`"ziehen"` |
| `aktionen` | – | zusätzliche Knöpfe `[{name, tue(z, p)}]` |
| `ende(z, p)` | – | `true` hält den Lauf an (z. B. Wachstum fertig) |
| `legende(F, p, z)` | – | `[[farbe, {de,en}]]` |
| `kennzahlen(z, p)` | – | `[[{de,en}, "Wert" oder {de,en}]]` – wird bei jedem Bild aufgerufen, also billig halten |
| `saat`, `tempo`, `autostart` | – | Voreinstellungen |

Nach einem Sprachwechsel zeichnet der Rahmen neu (Beschriftungen im Canvas über `document.documentElement.lang`). `window.SIM`: `zustand`, `param`, `saat`, `schritt(n)`, `zuruecksetzen(saat)`, `setze(id, wert)` (wie eine Eingabe im Bedienfeld, schreibt auch die Adresse), `groesse()`, `start()`, `pause()`, `laeuft`, `zeichne()`. In `pruef_ausdruck` (app.json) stehen `SIM` und `Modell` zur Verfügung.

## Parallel arbeiten

Gruppen in `bestand.json` (`gruppe`) eignen sich als Pakete für je einen Agenten, weil sich die Modelle einer Gruppe Bausteine teilen (z. B. Segregation 24/25/34/35, Wegesysteme 36/37/38, Wachstumsautomaten 19–22/28–33). Innerhalb eines Pakets darf ein Agent mehrere Apps anlegen; gemeinsamer Code zwischen Apps wandert erst nach Absprache nach `_gemeinsam/`. Fassungen desselben Modells (z. B. `nl-wegesystem-b-update`, `vba-rekursion-3d`) besser als Option in die vorhandene App aufnehmen und in `bestand.json` vermerken, statt eine fast gleiche App zu bauen.
