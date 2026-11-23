# entwurfsforschung.de · KI Lab · Konzept

Stand 21.11.2026 · Struktur vom Nutzer am 21.11.2026 freigegeben.

## Absicht

entwurfsforschung.de wird das KI Lab für Reinhard Königs KI-Experimente: eine neue Startseite mit einem Raster der Projekte, die Projekte selbst als Unterordner. Das bisherige WordPress bleibt erreichbar, bis seine Inhalte übernommen sind; danach wird es ganz entfernt (Nutzer 21.11.2026). Keine Daten von Studierenden.

## Entscheidungen des Nutzers (21.11.2026)

- Hosting: Host Europe, cPanel Webhosting Deluxe; Zugang per SSH-Schlüssel, Deploy per SSH.
- Startseite nach dem Vorbild https://bauhaus-infau.github.io/infau-website/ (Geist, feine Linien, Kartenraster, große dünne Navigation in Großbuchstaben, DE/EN).
- **Dunkel (schwarz) als Voreinstellung**, Umschalter Hell/Dunkel wie auf den bisherigen Seiten (KI Lernlabor, Tutorials).
- Kacheln mit Bild und **optional kurzem Vorschautext**.
- **Unterordner je Projekt** (`/lab/<projekt>/`), keine Subdomains.
- Zuerst ins Lab: Konzeptstudie Gartenatelier, Konzeptstudie Campus, Duarte/Siza (Malagueira), Bergdörfer. Gartenatelier und Campus werden später durch einfachere Fassungen für Studierende ersetzt. Design Explorer folgt, sobald Cron-Jobs auf dem Webspace funktionieren. Tutorials und übriges KI Lernlabor bleiben vorerst auf GitLab der Uni.
- Neue Startseite zuerst unter `/neu/` zur Durchsicht; sie ersetzt die alte erst nach Freigabe. Die alte Startseite bleibt verlinkt.

## Ergänzungen des Nutzers (21.11.2026, nach dem ersten Entwurf)

- Kachelbilder schwarz: Screenshots der Apps in dunkler Darstellung (kachelbilder.py); Gartenatelier zeigt das Parallelkoordinaten-Diagramm wie im KI Lernlabor.
- Impressum klein unten, neu erstellt mit einem Impressum-Generator (Angaben vom Nutzer); „Alte Website“ klein unten.
- „Archiv“ oben bleibt, mit eigener Kachelseite: 1. Räumliche Prozesse (/alt/RaumProzesse), 2. Strukturexperimente (/alt/Strukturfor), dann die sechs Blog-Beiträge (/small/), vorletzt Lehre (/teaching/), zuletzt Working Papers (/working-papers/). Inhalte werden in die neue Struktur übernommen (konvertiere.py), eingebettete Videos werden Links.
- Die WordPress-Installation wird nach der Umstellung ganz entfernt.
- Archiv ergänzt (21.11.2026): „Stadtplanung“ (WordPress-Seite /large/) vor Lehre, „Traversin“ (/alt/traversin/) als letzter Eintrag. Alles, worauf das Archiv verlinkt, wird übernommen (tiefere Seiten als Unterseiten); Links auf Lebenslauf, alte Startseiten und Publikationslisten entfallen (Text bleibt). Links auf NetLogo-/VBA-Seiten bleiben, bis die Web-Apps unter lab/simulationen/ fertig sind (archiv_offen.json).

## Aufbau

| Pfad | Inhalt |
|---|---|
| `projekte.json` | Kacheln: id, Titel, Autoren, Kategorie, Jahr, Bild, Vorschautext (DE/EN, optional), Ziel (Unterordner oder externe Adresse), Quelle der Dateien |
| `vorlage.html` | Startseite (Vanilla HTML/CSS/JS), Daten werden beim Bau eingesetzt |
| `bauen.py` | baut `site/`: Startseite, Schrift (Geist, selbst ausgeliefert, OFL), Kachelbilder, Projektordner `lab/<id>/` aus den Quellen in Planungsgrundlagen |
| `deploy.py` | lädt `site/` per SSH (tar) in den Web-Ordner; `--ziel neu` für die Durchsicht, später `--ziel start`; ersetzt nur Pfade, die das Lab verwaltet, nie WordPress |
| `pruefe.py` | prüft den Bau: jede Kachel hat Bild und Ziel, jedes Ziel existiert, keine externen Schriften |
| `simulationen/` | Frühe Simulationen (21.11.2026): alte Programme (Delphi, NetLogo, AutoCAD-VBA, Flash) als Web-Apps; Bestandsliste `bestand.json`, Rahmen `_gemeinsam/`, Vorlage `_vorlage/`, Anleitung `REZEPT.md`; gebaut nach `lab/simulationen/` mit `quellcode.zip` je App |
| `katalog/` | Parametric Planning Catalogue (23.11.2026): Grasshopper-Module des Katalogs (InfAR, Bauhaus-Universität Weimar, 2020, MIT) als Web-Apps; `bestand.json` mit Stand aller 27 Module, `_gemeinsam/` (Geometrie, Szenen, Zeichenhilfen), Anleitung `REZEPT.md`; gebaut nach `lab/parametric-planning-catalogue/`. Lab-Kachel mit `vorletzt: true` steht immer direkt vor „Frühe Simulationen“ |

## Gestaltung

- Kopfzeile: Wortmarke „Entwurfsforschung“ mit Marke „KI Lab“, Navigation Lab · Archiv (alte Website) · Über, DE / EN, Hell/Dunkel.
- Filterzeile: Suche, Kategorie, Sortierung, Schalter „Vorschautext“.
- Raster: Karten mit Autoren und Kategorie oben (Mono, klein), Bild, optional Vorschautext, Titel und Jahr unten; Linien statt Flächen.
- Dunkel: Papier #000, Linien #2a2a2e; Hell wie KI Lernlabor; ein Akzent #4649e1 / #9ea0f3.

## Offen

- Impressum und Datenschutz für die Domain (Angaben macht der Nutzer).
- Adresse der alten Startseite nach dem Umschalten (der Ordner `/alt/` ist schon belegt).
- Remote für das Repo (GitLab der Uni oder privat).
