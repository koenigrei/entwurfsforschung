# Design Explorer und AutoPublish auf entwurfsforschung.de · Konzept

Stand 21.11.2026. Bestand und Zahlen: [BESTAND.md](BESTAND.md). Der Umzug ist bis zum Probelauf vorbereitet; **umgeschaltet ist noch nichts**: Der GitLab-Zeitplan ist unverändert, auf dem Server liegen keine Plattform-Schlüssel, und es steht kein Produktions-Cron in der Crontab.

## Ziel

Viewer „Design Explorations“, Archiv aller Varianten und die Geschichte aller Posts liegen unter **https://entwurfsforschung.de/lab/design-explorer/**. Der tägliche Post läuft per Cron auf dem eigenen Webspace statt über den Runner der Uni. GitLab bleibt Quelle und Sicherung des Repositorys, ist aber für Posten und Anzeigen nicht mehr nötig.

## Zielarchitektur

```
 lokal (Reinhards PC)                                   Webspace (Host Europe, hinter Cloudflare)
 ───────────────────                                   ──────────────────────────────────────────
 AutoPublish/  Pflegelauf (Eingang, Texte)              <docroot>/lab/design-explorer/   öffentlich
      │                                                   index.html app.js bilderwand.js stil.css
      │  python design-explorer/sync.py hochladen         schrift/ (Geist, OFL)  marke/  karten/mini/
      ├── 1. hole: Logbuch/Status/Vormerkungen  ◄───────  daten/ index.json meta.json status.json v/<id>.json bilder/
      ├── 2. bauen: Viewer für den Unterordner            medien/<id>/<bild>.jpg, _vorschau.jpg   (für Viewer und Plattformen)
      └── 3. Änderungen hochladen (tar über SSH) ──────►  Archive/<id>/variante.json + Bilder      (Originale, Großansicht)
                                                                 ▲ Symlink               ▲ nachführen nach jedem Lauf
 fern.py post|entfernen  ── SSH ──►  ~/autopublish/   privat     │                       │
                                       ap.sh  venv/ (Python 3.11: requests, Pillow, tzdata)  code/autopublish/
                                       daten/ konfiguration(.webspace).json stile/ projekte/ texte/ protokoll/
                                              Archive -> <docroot>/lab/design-explorer/Archive
                                              logbuch/*.jsonl  status.json  verlauf.jsonl  warnungen.json  (gehören dem Server)
                                       geheim.env (600, erst bei der Umschaltung)   trocken/   protokolle/   lauf.lock
                                       Cron: stündlich :44, läuft nur, wenn es in Berlin 4 Uhr ist
```

- **Viewer und Archiv:** derselbe Viewer wie bisher, gebaut mit der Überlagerung `konfiguration.webspace.json` (AutoPublish-Repo): `seiten_url` und `medien_basis_url` zeigen auf entwurfsforschung.de, Bilder, Kleinbilder und Originale kommen vom Webspace. `sync.py` setzt wie `bauen.py` für die anderen Lab-Apps die Schrift vom eigenen Server ein (statt Google Fonts), stellt **dunkel als Voreinstellung** ein (Speicher `entwurfsforschung-theme` wie die Lab-Startseite, Umschalter Hell/Dunkel bleibt), ergänzt den Rückweg „← Lab“ und hängt Cache-Kennungen (`?v=`) an js/css. `pruefe_viewer` bricht ab, wenn noch ein eingebetteter Inhalt fremder Server oder ein Bild außerhalb des Webspace übrig ist. Links (Uni, GitLab-Paketablage für PDF/PLN, Posts auf den Plattformen) bleiben Links.
- **Geschichte der Posts:** Logbuch und Status liegen auf dem Server in `~/autopublish/daten/`. Nach jedem Lauf und Handpost schreibt `webspace.fuehre_viewer_nach` `daten/status.json` (mit `posts` je Plattform, also der ganzen Geschichte seit 9.11.2026) sowie „gepostet“ in `index.json` und den Einzeldateien neu – die Statusseite ist damit sofort aktuell, ohne lokalen Neubau. Der Rest des Viewers (neue Varianten, Karten, Bilderwand) kommt mit dem nächsten `sync.py hochladen`.
- **Lauf:** `ap.sh lauf` → `autopublish.webspace` → derselbe `lauf.hauptlauf` wie in der CI, nur mit `LokaleAblage` statt GitLab-API: Logbuch und Status werden atomar in Dateien geschrieben (statt Commit), jede Änderung bekommt eine Zeile in `verlauf.jsonl`, erneuerte Token gehen in `geheim.env` (statt CI-Variablen), Warnungen in `warnungen.json` und auf die Statusseite (statt Issues). `flock` auf `lauf.lock` ersetzt `resource_group`. Fehlt `geheim.env`, postet der Lauf nichts.
- **Schlüssel:** `~/autopublish/geheim.env`, Rechte 600, außerhalb des Web-Ordners, `NAME=wert` je Zeile mit denselben Namen wie die CI-Variablen. `lies_geheimnisse` verweigert die Datei bei offeneren Rechten. Kein Skript liest oder überträgt Schlüssel; sie kommen bei der Umschaltung von Hand auf den Server.
- **Ersatz für „Post now“ und „Remove variant“:** Statt der vorausgefüllten GitLab-Pipeline zeigt die Einzelansicht im Webspace-Betrieb den Befehl zum Kopieren, z. B. `python design-explorer/fern.py post 2026-11-18_G9-K142 bluesky dada`. `fern.py` (Website-Repo) ruft per SSH `ap.sh post …` bzw. `ap.sh vormerken …` auf; geprüft wird wie bisher (`lauf.einzelpost`, `entfernen.merke_vor`). Ausführen kann nur, wer den SSH-Schlüssel hat; im öffentlichen Viewer steht kein Host. Ein Web-Knopf mit Passwort (kleines PHP-Skript + Auftragsdatei, die Cron abholt) wäre später möglich, ist aber bewusst nicht gebaut.
- **Neue Varianten:** Der Pflegelauf bleibt lokal. Danach `python design-explorer/sync.py hochladen`: holt zuerst den Stand vom Server (nur, wenn der Server weiter ist; Logbücher müssen sich als Anfang/Fortsetzung decken, sonst Abbruch), baut den Viewer und lädt nur neue und geänderte Dateien (Größe/Zeit) als tar-Strom hoch, Reihenfolge Archive → medien → Viewer → Arbeitsdaten. Gelöschte Varianten (FehlerhafteV) verschwinden auch auf dem Server. Hochgeladen wird, was im Repository liegt (heute schon öffentlich): Bilder und `variante.json`, keine PDF/PLN.
- **Vormerkungen** (`protokoll/entfernen.json`): `hole` übernimmt neue Vormerkungen vom Server, solange der Archivordner lokal noch liegt; `hochladen` schreibt die vereinigte Datei zurück. Was der Eingang erledigt hat, fällt so heraus.
- **Sicherung (optional):** Logbuch und Status sind klein. Nach `sync.py hole` im Pflegelauf mit `git add logbuch status.json protokoll/entfernen.json` committen; der nächste Eingang pusht sie nach GitLab. Ein Spiegel auf GitHub ginge genauso.

## Dateigrenze und Speicher

| | Dateien | Speicher |
|---|---|---|
| Home vor dem Umzug | ≈ 34.100 Einträge (Dateien + Ordner) | – |
| `lab/design-explorer/` heute (144 Varianten) | ≈ 5.300 (Archive 1.750, medien 3.212, Viewer 312) | ≈ 2,2 GB |
| `~/autopublish/` (venv ≈ 2.700, Code, Daten) | ≈ 3.000 | ≈ 0,1 GB |
| je weitere Variante | ≈ 37 (11 Originale, 22 Medien, variante.json, Einzeldatei, Kleinbild, Text) | ≈ 15 MB |

Nach dem Umzug ≈ 42.000 von 250.000 Dateien; Platz für ≈ 5.500 weitere Varianten. Enger ist der **Speicher**: 50 GB reichen für ≈ 3.000 Varianten (Originale 13 MB, Medien 2 MB je Variante). Beim heutigen Zugang (≈ 13 Varianten am Tag) reicht das gut ein halbes Jahr, bei weniger Zugang entsprechend länger. Die Downloads (PDF/PLN, ≈ 36 MB je Variante) bleiben deshalb in der GitLab-Paketablage und werden nur verlinkt. Vorsorge, wenn es eng wird: Originale nur noch für gepostete Varianten oder als WebP; das Entfernen von WordPress gibt zusätzlich Dateien frei. `sync.py status` zeigt die Zahlen und warnt ab 200.000 Dateien.

## Cron

Serverzeit ist **MST (UTC−7, ohne Sommerzeit)**; 04:44 Berlin ist im Winter 20:44, im Sommer 19:44 Serverzeit (Vortag). Statt die Zeit umzurechnen, läuft der Eintrag stündlich und `--nur-stunde 4` lässt nur den Lauf um 04:44 Berlin durch (unabhängig von Zeitzone und Sommerzeit des Servers; ein doppelter Aufruf postet wegen „heute schon gepostet“ nichts doppelt).

Vorbereitete Produktionszeile (**nicht eingetragen**):

```
44 * * * * $HOME/autopublish/ap.sh lauf --nur-stunde 4 >> $HOME/autopublish/protokolle/lauf.log 2>&1
```

## Umgesetzt (21.11.2026)

AutoPublish-Repo (`Planungsgrundlagen/AutoPublish`, nicht committet; GitLab-Betrieb unverändert, ohne die Variable `AUTOPUBLISH_KONFIGURATION_ZUSATZ` greift nichts davon):

- `autopublish/webspace.py` (neu): Befehle `lauf [--trocken] [--nur-stunde]`, `post`, `vormerken`, `nachfuehren`, `netz`; `LokaleAblage`, `TrockenPlattform`, `GesperrteSession` (Trockenlauf: Verbindungen nur zum eigenen Webspace), Schlüsseldatei, Sperre, `fuehre_viewer_nach`.
- `autopublish/konfiguration.py`: optionale Überlagerung über `AUTOPUBLISH_KONFIGURATION_ZUSATZ`, Felder `betrieb`, `handpost_befehl`, `entfernen_befehl` (mit Voreinstellung).
- `konfiguration.webspace.json` (neu): Adressen auf entwurfsforschung.de, Befehle für „Post now“/„Remove variant“.
- `autopublish/lauf.py`: `hauptlauf`/`einzelpost` nehmen optional `bauer` (Plattform-Bausteine); die Protokollzeile steht jetzt im `try` (vorher NameError bzw. fremde Zeile, wenn eine Plattform vor dem Senden scheiterte).
- `autopublish/viewer.py`, `viewer/app.js`, `viewer/stil.css`: im Webspace-Betrieb Befehl zum Kopieren statt GitLab-Link; `meta.betrieb`.
- `tests/test_webspace.py` (neu, 14 Tests).

Website-Repo (`entwurfsforschung/design-explorer/`, nicht committet): `sync.py`, `fern.py`, `BESTAND.md`, dieses Konzept, `.gitignore` (build/).

Server: `~/autopublish/` (ap.sh, venv, code, daten mit Symlink aufs Archiv, Kopie von Logbuch und Status vom 20.11. für den Probelauf), `<docroot>/lab/design-explorer/` (Viewer, medien, Archive). Crontab nach dem Test wieder leer.

## Probelauf

Ergebnisse siehe Abschnitt „Ergebnisse 21.11.2026“ unten.

## Checkliste Umschaltung (nach Freigabe durch Reinhard)

1. **GitLab-Zeitplan deaktivieren** (Build → Pipeline schedules, `44 4 * * *` auf inaktiv). Erst danach weiter, sonst posten zwei Läufe mit getrennten Logbüchern.
2. **Letzten GitLab-Stand holen:** im AutoPublish-Repo `git pull` (Logbuch und Status eines etwaigen letzten CI-Laufs).
3. **Stand übertragen:** `python design-explorer/sync.py stand-uebernehmen` (verweigert, wenn der Server Zeilen hat, die lokal fehlen), dann `python design-explorer/sync.py hochladen` (Viewer mit aktueller Geschichte).
4. **Schlüssel übertragen (von Hand):** auf dem Server `~/autopublish/geheim.env` anlegen, `chmod 600`, je Zeile `NAME=wert` aus den GitLab-CI-Variablen: `INSTAGRAM_TOKEN`, `INSTAGRAM_USER_ID`, `BLUESKY_HANDLE`, `BLUESKY_APP_PASSWORT`, `MASTODON_URL`, `MASTODON_TOKEN`, `FACEBOOK_PAGE_ID`, `FACEBOOK_PAGE_TOKEN`, `LINKEDIN_TOKEN`, `LINKEDIN_PERSON`, `LINKEDIN_ABLAUF`. `GITLAB_TOKEN` wird nicht gebraucht.
5. **Bilder für Meta prüfen:** Instagram und Facebook holen die Bilder selbst über die URL. Sicherstellen, dass Cloudflare (Bot-Schutz) `…/lab/design-explorer/medien/` für die Meta-Crawler nicht sperrt; im Zweifel zuerst einen Handpost auf Facebook mit `fern.py post …` machen und das Ergebnis ansehen.
6. **Produktions-Cron eintragen** (Zeile oben, cPanel → Cron Jobs oder `crontab -e`). Am selben Tag, falls 04:44 schon vorbei ist, den ausgefallenen Post mit `ssh … ~/autopublish/ap.sh lauf` von Hand nachholen.
7. **Erster echter Lauf:** am nächsten Morgen `python design-explorer/sync.py status` (Protokoll, Warnungen), Statusseite unter https://entwurfsforschung.de/lab/design-explorer/#/status, je Plattform den Post ansehen.
8. **Verweise umstellen:** Bio-Link Instagram, Profile Mastodon/Bluesky/LinkedIn/Facebook (PLATTFORMEN.md, Schritt 9 u. a.) auf die neue Adresse; README.md, PLATTFORMEN.md, PFLEGE.md im AutoPublish-Repo anpassen; Kachel auf der Lab-Seite (aufrufende Sitzung).
9. **Pflegelauf ergänzen:** vor dem Eingang `sync.py hole` (+ optional Commit von Logbuch/Status als Sicherung), nach dem Push `sync.py hochladen` (pflegelauf/auftrag.md, PFLEGE.md Schritt 7).
10. **Aufräumen später:** Jobs `posten`, `posten_von_hand`, `entfernen_von_hand` in `.gitlab-ci.yml` entfernen oder auf manuell stellen; alter Pages-Viewer: Hinweis auf die neue Adresse, sobald der Runner wieder läuft.

## Konflikt mit dem Deploy der Lab-Seite (21.11.2026 beobachtet)

Der Deploy der Startseite ersetzt `lab/` als Ganzes und rettet `lab/design-explorer` dabei mit `cp -a` in den neuen Baum. Das geht, hat aber zwei Folgen: (1) Jeder Deploy kopiert das ganze Archiv (heute ≈ 2,2 GB, wächst; Speicher kurzzeitig doppelt, Dauer Minuten). (2) Läuft gleichzeitig `sync.py hochladen` oder ein Lauf, der `daten/` nachführt, landet alles, was nach dem Kopieren geschrieben wird, im alten Baum und wird mit ihm gelöscht – am 21.11. zweimal passiert (der Upload wurde danach neu gestartet; `hochladen` lädt fehlende Dateien beim nächsten Mal nach). Vorschlag für den Deploy: `lab/design-explorer` nicht kopieren, sondern mit `mv` vom alten in den neuen Baum hängen (gleiches Dateisystem: sofort, ohne Kopie; laufende Schreiber schreiben in denselben Ordner weiter), oder `lab/` gar nicht als Ganzes ersetzen, sondern nur die eigenen Unterordner. Zusätzlich könnte der Deploy dieselbe Sperre nehmen (`flock ~/autopublish/lauf.lock`), die `sync.py` und der Lauf benutzen. Bis dahin: Lab-Deploy und `sync.py hochladen` nicht gleichzeitig starten und nie um 04:44.

## Ergebnisse 21.11.2026

- **Tests:** AutoPublish lokal 428 grün, 1 übersprungen (Rechteprüfung nur unter Linux); `tests/test_webspace.py` auf dem Server unter Python 3.11: 14 grün (in einer vorübergehenden venv in `~/autopublish/_test`, danach gelöscht).
- **Upload:** 5.274 Dateien, 2,2 GB unter `lab/design-explorer/` (Archive 1.750, medien 3.212, Viewer 312); `~/autopublish/` 2.862 Einträge, 52 MB. Home danach 43.116 Einträge. Die Seite antwortet mit 200 (index, daten/, Archive, medien), auch für den User-Agent `facebookexternalhit`. Browserprüfung (Playwright): dunkel, Geist vom eigenen Server, keine Anfrage an fremde Hosts, keine Konsolenfehler, Einzelansicht mit Befehl statt GitLab-Link, Statusseite mit allen 49 Posts seit 9.11.
- **Trockenlauf** (`sync.py trocken`, 15:43 Berlin): Exit 0. Fünf Plattformen, fünf verschiedene Varianten (Instagram G25-K055 klassik/Schiller, Bluesky G25-K034 science, Mastodon G25-K017 dada/Lear, Facebook G25-K078 dada/Limerick, LinkedIn G25-K059 science/Adorno), Bild-URLs unter `https://entwurfsforschung.de/lab/design-explorer/medien/…` (per HEAD vom Server erreichbar), Links im Text auf die neue Seite. Probezeilen nur in `~/autopublish/trocken/logbuch/` (56 Zeilen); das echte Logbuch auf dem Server bleibt bei 51 Zeilen; keine Warnungen.
- **Cron-Test:** vorübergehender minütlicher Eintrag, lief um 06:45:01 MST (= 14:45 Berlin): Python der venv aus Cron ok, HTTPS nach außen ok (bsky.social 302, graph.facebook.com 400, fediscience.org 200, api.linkedin.com 404, graph.instagram.com 400, alle ohne Anmeldung). Eintrag danach entfernt, Crontab leer.
- **Offen:** Der Dunkel-Ton Schwarz (#000) wie auf der Lab-Startseite steht in `sync.py`, ist aber noch nicht hochgeladen (der Server hat ab ca. 15:45 SSH-Verbindungen abgewiesen, vermutlich wegen zu vieler Verbindungen in kurzer Zeit). Nachholen mit einem einzigen `python design-explorer/sync.py hochladen`. **SSH sparsam verwenden:** `hochladen` öffnet etwa 15 Verbindungen nacheinander; keine Wiederholungsschleifen, sonst sperrt die Brute-Force-Abwehr (cPHulk) die IP. Verbesserung für später: `hole` und die Dateilisten in je eine Verbindung bündeln.
