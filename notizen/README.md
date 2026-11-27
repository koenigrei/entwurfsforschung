# Notizen – Kommentare und Achsen der Apps auf dem Server

Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · 27.11.2026 · CC BY 4.0

Wunsch Reinhard 27.11.2026: Kommentare und Achsen der Konzeptstudie Zweispänner auf entwurfsforschung.de speichern.
Nur er schreibt (Schlüssel), Besucher sehen die Ebene nicht, Claude liest die offenen Einträge, setzt sie um und
markiert sie mit `status: "erledigt"` und einer kurzen Antwort `reply`. Später sollen Skizzen als weitere Sammlung folgen.

- `api.php` → online `lab/notizen/api.php` (kopiert von `bauen.py`). Schnittstelle im Kopf der Datei.
- Daten **außerhalb des Web im Home des Kontos**: `~/ki_notizen/` (0700; Pfad über `posix_getpwuid(posix_geteuid())`, PHP läuft
  unter CloudLinux als Kontobenutzer, PHP 8.3) mit `schluessel.txt` (SHA-256 des Schlüssels, hex, eine Zeile, 0600) und
  `<projekt>.json` (0600, dazu `<projekt>.json.vorher`, der Stand vor der letzten Änderung). `bauen.py`, `deploy.py` und der
  Design-Explorer-Sync fassen den Ordner nie an; in die Sicherung vor einem Upload gehört er trotzdem.
- `test_api.php`: `php notizen/test_api.php` startet den eingebauten PHP-Server in einem Temp-Ordner und prüft alles (ALLES OK).

## Einrichten (einmal, per SSH, mit Reinhards OK)

```sh
mkdir -p ~/ki_notizen && chmod 700 ~/ki_notizen
echo <sha256-hex des Schlüssels> > ~/ki_notizen/schluessel.txt && chmod 600 ~/ki_notizen/schluessel.txt
```

Der Schlüssel selbst steht nirgends im Repo. Reinhard öffnet einmal die App mit `#notizen=<Schlüssel>` (hinter dem #, geht nie
an den Server, steht in keinem Log); die App merkt ihn sich im Browser (`localStorage`, Eintrag `entwurfsforschung-notizen`),
entfernt ihn sofort aus der Adresse und schickt ihn nur im Kopf `X-Notizen-Schluessel`.
Claude liest mit `Grundrisse/werkzeuge/notizen.py` (Repo Planungsgrundlagen), Schlüssel aus einer lokalen Datei.
