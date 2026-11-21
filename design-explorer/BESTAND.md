# Design Explorer und AutoPublish · Bestand

Stand 21.11.2026, aufgenommen aus dem Repository `Planungsgrundlagen/AutoPublish` (GitLab cora4753/autopublisher, letzter Commit 0aa20170) und vom Webspace. Anlass: Der Uni-Runner fällt aus, der tägliche Post am 21.11.2026 um 04:53 ist ausgefallen.

## Teile

| Teil | Heute | Quelle |
|---|---|---|
| Viewer „Design Explorations“ | GitLab Pages, https://autopublisher-5b234f.pages.uni-weimar.de (Job `pages` bei jedem Push auf main) | `viewer/` (index.html, app.js, bilderwand.js, stil.css), gebaut von `autopublish/viewer.py` |
| Archiv aller Varianten | `Archive/<JJJJ-MM-TT_uid>/` im Repository, Bilder per Git LFS; PDF/PLN nicht im Repository, sondern in der Paketablage (Generic Package Registry) | `ABLAGE.md`, `autopublish/archiv.py`, `paketablage.py` |
| Medien fürs Posten | `medien/<id>/<stamm>.jpg` (1440 px) und `_vorschau.jpg` (480 px), im Repository (LFS) | `autopublish/medien.py` |
| Täglicher Lauf | GitLab-Zeitplan `44 4 * * *` (Berlin), Job `posten` → `python -m autopublish.lauf` | `.gitlab-ci.yml`, `autopublish/lauf.py` |
| Geschichte der Posts | `logbuch/<plattform>.jsonl` (eine Zeile je Versuch) und `status.json`, vom Lauf über die GitLab-API zurückcommittet | `autopublish/logbuch.py`, `status.py`, `gitlab.py` |
| Pflegelauf (lokal) | Eingang, Texte, Push nach GitLab; Desktop-Verknüpfung „Pflegelauf“ | `PFLEGE.md`, `autopublish/eingang.py`, `pflege.py` |

## Umfang des Archivs (21.11.2026)

| | Dateien | Größe |
|---|---|---|
| `Archive/` lokal gesamt (145 Ordner, 144 gültige Varianten) | 3.012 | 6,7 GB |
| davon Bilder PNG/JPG (im Repository, LFS) | 1.609 | 1,87 GB |
| davon PDF-Pläne / Archicad-Modelle (nur Paketablage) | 746 / 141 | 1,61 GB / 3,52 GB |
| davon JSON/TXT (variante.json, bauteile.json, beschreibung.txt, code.txt) | 515 | < 10 MB |
| `medien/` (Post-Bilder und Vorschauen) | 3.212 | 334 MB |
| `karten/` (Kleinbilder für Karte und Atlas), `texte/`, `befunde/` | 145 / 144 / 144 | 2 / 3 / 1 MB |
| Im Repository verfolgt (Archive, medien, texte, karten, befunde) | 5.763 | ≈ 2,2 GB |
| `.git/lfs` lokal | – | 7,4 GB (alle Bildstände) |

Je Variante kommen heute ≈ 11 Bilder, 22 Medien, 1 variante.json, 1 Kleinbild, 1 Textdatei, 1 Befund und ≈ 6 Downloads hinzu. Zugang seit 9.11.: 176 Eingänge in 13 Tagen, im Mittel ≈ 13 Varianten am Tag (Spitze 49 am 10.11.).

Geschichte der Posts: 51 Logbuchzeilen, 49 gepostete Varianten (Instagram 12, Facebook 11 + 2 Fehler, Bluesky 11, LinkedIn 11, Mastodon 4 seit 17.11.). Letzter Lauf: 20.11.2026 04:53. Reichweite laut status.json: 86 offene Varianten, ≈ 17 Tage.

## Ablauf eines Laufs (`lauf.hauptlauf`)

1. **Zugang prüfen:** `GITLAB_TOKEN` gegen die API (`personal_access_tokens/self`). Ohne GitLab postet der Lauf nicht, sonst ginge das Logbuch verloren.
2. **Laden:** `konfiguration.json`, Stilkatalog, Projekte, `Archive/` (Prüfliste aus ABLAGE.md, Bilder werden geöffnet), Texte; **Logbuch und Status liest er über die API vom Branch**, nicht aus dem Checkout.
3. **Auswahl je aktiver Plattform** (Reihenfolge der Konfiguration): höchstens ein Post am Tag; Kandidaten = postbar, nie gepostet, nicht vorgemerkt; nach Projektgewicht geordnet; Stilfamilie abwechselnd; bis zu 3 Versuche.
4. **Komponieren:** Text + Vermerk + Link (`seiten_url#/p/<projekt>`) + Hashtags; Bild-URLs = `medien_basis_url/<id>/<stamm>.jpg`.
5. **Medien prüfen:** HEAD auf jede Bild-URL (heute GitLab-Raw); nicht erreichbar → nächster Kandidat.
6. **Senden** (`plattformen/*.py`, Zugangsdaten aus CI-Variablen). Unklarer Ausgang zählt als gepostet.
7. **Token pflegen:** Plattform-Token erneuern, wenn sie bald ablaufen; neue Werte als CI-Variablen über die API.
8. **Stand zurückschreiben:** neue Logbuchzeilen + `status.json` als ein Commit über die API (`gitlab.committe`, Konfliktwiederholung). Scheitert der Commit: Job-Artefakt + Issue. Warnungen werden als Issues (Label `autopublish-warnung`) geöffnet und geschlossen.

Danach baut erst der nächste Push den Viewer neu (Job `pages`); die Geschichte im Viewer hinkt bis dahin nach.

## Wo der Stand der geposteten Varianten liegt

- `logbuch/<plattform>.jsonl` im Repository (Branch main) – die maßgebliche Geschichte; der Viewer liest sie beim Bau (`status.posts`, `gepostet` je Variante).
- `status.json` – letzter Versuch je Plattform, Token-Laufzeiten, Vorrat, Warnungen.
- `protokoll/entfernen.json` – Vormerkungen aus dem Viewer („Remove variant“).
- `Archive/_gepostet.json` – nur lokal, für die App der Konzeptstudie; schreibt der Eingang aus dem Logbuch.
- Job-Artefakte (30 Tage) als Rückfallebene, wenn der Commit scheitert.

## GitLab-spezifische Teile

| Teil | Wo | Was es tut |
|---|---|---|
| CI-Zeitplan und Jobs | `.gitlab-ci.yml` (`test`, `pages`, `posten`, `posten_von_hand`, `entfernen_von_hand`) | braucht den Runner der Uni |
| `resource_group` | `.gitlab-ci.yml` | nie zwei Läufe gleichzeitig |
| Raw-Adressen | `konfiguration.json` `medien_basis_url` = `gitlab.uni-weimar.de/…/-/raw/main/medien`; `viewer._original_basis` → `…/raw/main/Archive` | Bilder für Viewer und Plattformen |
| Commit des Stands | `gitlab.py` `committe` (Logbuch, Status, Vormerkungen) | Geschichte der Posts |
| CI-Variablen | `gitlab.py` `setze_variable`; Schlüssel aller Plattformen | Zugangsdaten, erneuerte Token |
| Issues | `gitlab.py` `synchronisiere_issues` | Warnungen |
| „Post now“ | `viewer.post_url` → Seite „New pipeline“ mit `POST_VARIANTE` usw., Job `posten_von_hand` → `lauf --einzeln` | Handpost |
| „Remove variant“ | `viewer.entfernen_url` → Job `entfernen_von_hand` → `entfernen.py` (Commit in `protokoll/entfernen.json`) | Vormerkung |
| Paketablage | `paketablage.py`, Eingang | Downloads (PDF, PLN) unter `gitlab.uni-weimar.de/api/v4/projects/…/packages/generic/…` |
| Pull/Push im Eingang | `eingang.Git` | holt den Stand des Laufs, lädt angenommene Varianten hoch |
| Pages | Job `pages`, `viewer.MINI_GRENZE` (100 MB) | Viewer |

Nicht GitLab-spezifisch und unverändert nutzbar: Archivprüfung, Auswahl, Komposition, Plattform-Bausteine, Logbuchformat, Viewer-Bau.

## Webspace (entwurfsforschung.de)

Host Europe cPanel, CloudLinux; Serverzeit **MST (UTC−7, ohne Sommerzeit)**, `/etc/localtime` am 20.11. gesetzt; Python 3.11.18 unter `/opt/alt/python311/bin/python3` (kein 3.12; das Paket läuft trotzdem, `requires-python` wird umgangen, indem es per `PYTHONPATH` statt `pip install` geladen wird); rsync, git, curl, flock, crontab vorhanden; Crontab war leer. Home vor dem Umzug ≈ 34.100 Einträge (Dateien und Ordner). Vor dem Webspace sitzt Cloudflare (cacht statische Dateien 4 h, siehe bauen.py), JSON wird nicht gecacht. Unter dem Docroot liegen WordPress, `alt/`, `archiv/`, `neu/` und `lab/` (Gartenatelier, Campus, Duarte/Siza, Bergdörfer).
