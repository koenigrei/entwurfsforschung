"""Design Explorer und AutoPublish auf entwurfsforschung.de: bauen, abgleichen, prüfen (Aufruf im Repo entwurfsforschung).

  python design-explorer/sync.py hole          Logbuch, Status, Vormerkungen vom Server ins lokale AutoPublish holen
                                               (nur wenn der Server weiter ist; vor der Umschaltung passiert nichts)
  python design-explorer/sync.py hochladen     hole → Viewer bauen → Viewer, medien/, Archive/ nach lab/design-explorer/
                                               und die Arbeitsdaten des Laufs nach ~/autopublish/daten/ (nur Änderungen)
  python design-explorer/sync.py bauen         nur den Viewer für den Unterordner bauen (design-explorer/build/)
  python design-explorer/sync.py code          Paket autopublish, ap.sh und venv in ~/autopublish/ einrichten bzw. erneuern
  python design-explorer/sync.py stand-uebernehmen   Logbuch und Status von lokal auf den Server (bei der Umschaltung;
                                               verweigert, wenn der Server Zeilen hat, die lokal fehlen)
  python design-explorer/sync.py trocken       Trockenlauf auf dem Server (keine Schlüssel, keine Plattform-Aufrufe)
  python design-explorer/sync.py cron-test     vorübergehender Cron-Eintrag: Python aus Cron und HTTPS nach außen prüfen,
                                               danach wird der Eintrag wieder entfernt
  python design-explorer/sync.py status        Dateien auf dem Webspace, Crontab, letzte Protokollzeilen

Zugang wie deploy.py: ../deploy.local.json (host, schluessel, docroot). Geschrieben wird nur in ~/autopublish/ und in
<docroot>/lab/design-explorer/; WordPress, andere Ordner und .htaccess bleiben unberührt. Plattform-Schlüssel liest und
überträgt dieses Skript nie (sie kommen bei der Umschaltung von Hand in ~/autopublish/geheim.env, Rechte 600).
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import shlex
import shutil
import subprocess
import sys
import tarfile
import tempfile
import time
from pathlib import Path

HIER = Path(__file__).resolve().parent
REPO = HIER.parent
AUTOPUBLISH = Path(os.environ.get("AUTOPUBLISH_REPO", REPO.parent / "Planungsgrundlagen" / "AutoPublish"))
BUILD = HIER / "build"
_CFG = REPO / "deploy.local.json"
_C = json.loads(_CFG.read_text(encoding="utf-8")) if _CFG.exists() else {}
HOST = os.environ.get("ENTWURFSFORSCHUNG_SSH", _C.get("host", ""))
SCHLUESSEL = os.path.expanduser(_C.get("schluessel", "~/.ssh/entwurfsforschung_ed25519"))
DOCROOT = _C.get("docroot", "public_html")
ZIEL = f"{DOCROOT}/lab/design-explorer"          # relativ zu ~ auf dem Server
AP = "autopublish"                                # ~/autopublish
PYTHON_SERVER = "/opt/alt/python311/bin/python3"
ABHAENGIGKEITEN = ["requests>=2.31", "Pillow>=10", "tzdata"]   # numpy braucht nur der Viewer-Bau (lokal)
SPERRE = f"$HOME/{AP}/lauf.lock"
SEITE = "https://entwurfsforschung.de/lab/design-explorer/"
BILD_ENDUNGEN = (".png", ".jpg", ".jpeg", ".webp")
DATEI_GRENZE = 250_000
WARN_AB = 200_000
CRON_MARKE = "# autopublish-crontest"
THEMA_ALT, THEMA_NEU = "infau-tutorials-theme", "entwurfsforschung-theme"
SCHRIFTEN = [("Geist", 300, "Geist-Light"), ("Geist", 400, "Geist-Regular"), ("Geist", 500, "Geist-Medium"),
             ("Geist", 600, "Geist-SemiBold"), ("Geist", 700, "Geist-Bold"), ("Geist Mono", 400, "GeistMono-Regular"),
             ("Geist Mono", 500, "GeistMono-Medium"), ("Geist Mono", 600, "GeistMono-SemiBold")]
SCHRIFT_QUELLEN = [REPO / "site" / "schrift", Path(os.environ.get("LOCALAPPDATA", "")) / "Microsoft" / "Windows" / "Fonts",
                   Path("C:/Windows/Fonts")]
RUECKWEG = ('<a class="ef-zurueck" href="../../" style="position:fixed;left:12px;bottom:12px;z-index:2147483000;font:500 11px/1 Geist Mono,ui-monospace,monospace;'
            'letter-spacing:.04em;text-transform:uppercase;text-decoration:none;color:#fff;background:rgba(0,0,0,.78);border:1px solid #3a3a3e;'
            'border-radius:999px;padding:7px 12px" title="Zurück zum KI Lab auf entwurfsforschung.de">← Lab</a>')
RAUSCHEN = ("post-quantum", "store now", "upgraded", "pq.html", "tput")


# ── SSH ──────────────────────────────────────────────────────────────────────────────────────────────────────────────

def _ssh_aufruf(befehl: str) -> list[str]:
    if not HOST:
        sys.exit("Kein Zugang: deploy.local.json fehlt oder ENTWURFSFORSCHUNG_SSH setzen.")
    return ["ssh", "-i", SCHLUESSEL, "-o", "BatchMode=yes", "-o", "ServerAliveInterval=30", HOST, befehl]


def _sauber(roh: bytes) -> str:
    return "\n".join(z for z in roh.decode("utf-8", "replace").splitlines() if not any(r in z for r in RAUSCHEN))


def ssh(befehl: str, eingabe: bytes | None = None, pruefen: bool = True) -> str:
    r = subprocess.run(_ssh_aufruf(befehl), input=eingabe, capture_output=True)
    aus = _sauber(r.stdout)
    if r.returncode and pruefen:
        sys.exit(f"Fehler auf dem Server ({r.returncode}):\n{aus}\n{_sauber(r.stderr)}")
    return aus


def liste_server(wurzel: str) -> dict[str, tuple[int, int]]:
    """Dateien unter ~/<wurzel> mit Größe und Änderungszeit (ganze Sekunden)."""
    aus = ssh(f"cd ~ && if [ -d {shlex.quote(wurzel)} ]; then cd {shlex.quote(wurzel)} && find . -type f -printf '%P\\t%s\\t%T@\\n'; fi")
    dateien = {}
    for z in aus.splitlines():
        teile = z.split("\t")
        if len(teile) == 3:
            dateien[teile[0]] = (int(teile[1]), int(float(teile[2])))
    return dateien


def lies_server(pfad: str) -> bytes | None:
    r = subprocess.run(_ssh_aufruf(f"cd ~ && if [ -f {shlex.quote(pfad)} ]; then cat {shlex.quote(pfad)}; else exit 3; fi"),
                       capture_output=True)
    if r.returncode == 3:
        return None
    if r.returncode:
        sys.exit(f"Lesen von {pfad} fehlgeschlagen: {_sauber(r.stderr)}")
    return r.stdout


def lade_hoch(lokal: dict[str, Path], wurzel: str, loeschen: bool = False, schuetze: tuple[str, ...] = (),
              modus: int = 0o644, sperren: bool = False, ordner_modus: str | None = None) -> tuple[int, int]:
    """Nur neue und geänderte Dateien (Größe oder Zeit) als tar-Strom nach ~/<wurzel>; mit loeschen fallen Dateien weg,
    die lokal fehlen (außer unter schuetze). Liefert (hochgeladen, gelöscht)."""
    server = liste_server(wurzel)
    neu = []
    for rel, pfad in sorted(lokal.items()):
        st = pfad.stat()
        if server.get(rel) != (st.st_size, int(st.st_mtime)):
            neu.append(rel)
    weg = sorted(r for r in server if r not in lokal and not r.startswith(schuetze)) if loeschen else []
    ziel = shlex.quote(wurzel)
    if neu:
        summe = sum(lokal[r].stat().st_size for r in neu)
        print(f"  {wurzel}: {len(neu)} Dateien, {summe / 1e6:.1f} MB hochladen …", flush=True)
        entpacken = f"tar -xf - -C {ziel}"
        if sperren:
            entpacken = f"flock -w 900 {SPERRE} {entpacken}"
        befehl = f"set -e; cd ~; mkdir -p {AP} {ziel}; {entpacken}"
        if ordner_modus:   # im Web-Ordner: Ordner 755 wie deploy.py
            befehl += f"; find {ziel} -type d ! -perm {ordner_modus} -exec chmod {ordner_modus} {{}} +"
        with tempfile.TemporaryFile() as fehler:
            proc = subprocess.Popen(_ssh_aufruf(befehl), stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=fehler)
            with tarfile.open(fileobj=proc.stdin, mode="w|", format=tarfile.GNU_FORMAT) as tar:
                for rel in neu:
                    info = tar.gettarinfo(str(lokal[rel]), arcname=rel)
                    info.mode, info.uid, info.gid, info.uname, info.gname = modus, 0, 0, "", ""
                    with open(lokal[rel], "rb") as f:
                        tar.addfile(info, f)
            proc.stdin.close()
            if proc.wait():
                fehler.seek(0)
                sys.exit(f"Hochladen nach {wurzel} fehlgeschlagen:\n{_sauber(fehler.read())}")
    if weg:
        print(f"  {wurzel}: {len(weg)} Dateien entfernen (lokal nicht mehr vorhanden)", flush=True)
        ssh(f"cd ~/{ziel} && xargs -0 -r rm -f -- && find . -mindepth 1 -type d -empty -delete",
            eingabe=b"\0".join(r.encode("utf-8") for r in weg))
    return len(neu), len(weg)


# ── lokale Auswahl ───────────────────────────────────────────────────────────────────────────────────────────────────

def git_dateien(*pfade: str) -> list[str]:
    r = subprocess.run(["git", "-C", str(AUTOPUBLISH), "ls-files", "-z", "--", *pfade], capture_output=True, check=True)
    return [p for p in r.stdout.decode("utf-8").split("\0") if p]


def _kein_lfs_zeiger(pfad: Path) -> bool:
    if pfad.stat().st_size > 400:
        return True
    return not pfad.read_bytes().startswith(b"version https://git-lfs")


def auswahl_archiv() -> dict[str, Path]:
    """Was im Repository liegt (also heute schon öffentlich ist): Bilder und variante.json je Variante; keine PDF/PLN."""
    dateien, zeiger = {}, []
    for rel in git_dateien("Archive"):
        teile = rel.split("/")
        if len(teile) != 3 or teile[1].startswith((".", "_")):
            continue
        if not (teile[2] == "variante.json" or teile[2].lower().endswith(BILD_ENDUNGEN)):
            continue
        pfad = AUTOPUBLISH / rel
        if not pfad.is_file():
            continue
        if not _kein_lfs_zeiger(pfad):
            zeiger.append(rel)
            continue
        dateien["/".join(teile[1:])] = pfad
    if zeiger:
        sys.exit(f"{len(zeiger)} Bilder sind nur Git-LFS-Zeiger (erst git lfs pull im AutoPublish-Repo), z. B. {zeiger[0]}")
    return dateien


def auswahl_medien() -> dict[str, Path]:
    return {rel.split("/", 1)[1]: AUTOPUBLISH / rel for rel in git_dateien("medien") if (AUTOPUBLISH / rel).is_file()}


def auswahl_daten() -> dict[str, Path]:
    """Arbeitsdaten des Laufs in ~/autopublish/daten (ohne Logbuch und Status: die gehören dem Server)."""
    dateien = {"konfiguration.json": AUTOPUBLISH / "konfiguration.json",
               "konfiguration.webspace.json": AUTOPUBLISH / "konfiguration.webspace.json"}
    for rel in git_dateien("stile", "projekte", "texte"):
        if rel.endswith(".json") and (AUTOPUBLISH / rel).is_file():
            dateien[rel] = AUTOPUBLISH / rel
    return dateien


# ── hole / Stand ─────────────────────────────────────────────────────────────────────────────────────────────────────

def _zeilen(text: str) -> list[str]:
    return [z for z in text.splitlines() if z.strip()]


def _plattformen() -> list[str]:
    return list(json.loads((AUTOPUBLISH / "konfiguration.json").read_text(encoding="utf-8-sig"))["plattformen"])


def hole() -> None:
    """Server → lokal, je Logbuch nur, wenn die lokalen Zeilen der Anfang der Server-Zeilen sind (der Server ist weiter)."""
    print("hole: Stand vom Webspace", flush=True)
    weiter = False
    for p in _plattformen():
        server = lies_server(f"{AP}/daten/logbuch/{p}.jsonl")
        if server is None:
            continue
        lokal_pfad = AUTOPUBLISH / "logbuch" / f"{p}.jsonl"
        lokal = lokal_pfad.read_text(encoding="utf-8") if lokal_pfad.is_file() else ""
        s, l = _zeilen(server.decode("utf-8")), _zeilen(lokal)
        if s == l:
            continue
        if s[:len(l)] == l:
            lokal_pfad.parent.mkdir(exist_ok=True)
            lokal_pfad.write_bytes(server.replace(b"\r\n", b"\n"))
            print(f"  logbuch/{p}.jsonl: {len(s) - len(l)} neue Zeilen vom Server", flush=True)
            weiter = True
        elif l[:len(s)] == s:
            print(f"  logbuch/{p}.jsonl: lokal {len(l) - len(s)} Zeilen weiter (GitLab-Betrieb; bei der Umschaltung: stand-uebernehmen)")
        else:
            sys.exit(f"logbuch/{p}.jsonl: Server und lokal sind auseinandergelaufen. Nichts geändert; von Hand zusammenführen.")
    if weiter:
        for rel in ("status.json", "protokoll/entfernen.json"):
            inhalt = lies_server(f"{AP}/daten/{rel}")
            if inhalt is not None:
                (AUTOPUBLISH / rel).parent.mkdir(exist_ok=True)
                (AUTOPUBLISH / rel).write_bytes(inhalt.replace(b"\r\n", b"\n"))
                print(f"  {rel} vom Server")
    else:
        # Vormerkungen können auch ohne Post entstehen (fern.py entfernen)
        inhalt = lies_server(f"{AP}/daten/protokoll/entfernen.json")
        lokal = AUTOPUBLISH / "protokoll" / "entfernen.json"
        if inhalt is not None and lokal.is_file() and inhalt.replace(b"\r\n", b"\n") != lokal.read_bytes().replace(b"\r\n", b"\n"):
            alt = json.loads(lokal.read_text(encoding="utf-8")).get("eintraege", {})
            neu = json.loads(inhalt.decode("utf-8")).get("eintraege", {})
            if set(alt) <= set(neu):
                lokal.write_bytes(inhalt.replace(b"\r\n", b"\n"))
                print(f"  protokoll/entfernen.json: {len(set(neu) - set(alt))} neue Vormerkungen vom Server")


def stand_uebernehmen() -> None:
    """Lokal → Server: Logbuch und Status. Nur, wenn jedes Server-Logbuch der Anfang des lokalen ist."""
    for p in _plattformen():
        lokal_pfad = AUTOPUBLISH / "logbuch" / f"{p}.jsonl"
        server = lies_server(f"{AP}/daten/logbuch/{p}.jsonl")
        l = _zeilen(lokal_pfad.read_text(encoding="utf-8")) if lokal_pfad.is_file() else []
        s = _zeilen(server.decode("utf-8")) if server else []
        if l[:len(s)] != s:
            sys.exit(f"logbuch/{p}.jsonl: Der Server hat Zeilen, die lokal fehlen. Erst hole, nichts übertragen.")
    dateien = {f"logbuch/{p}.jsonl": AUTOPUBLISH / "logbuch" / f"{p}.jsonl" for p in _plattformen()
               if (AUTOPUBLISH / "logbuch" / f"{p}.jsonl").is_file()}
    dateien["status.json"] = AUTOPUBLISH / "status.json"
    if (AUTOPUBLISH / "protokoll" / "entfernen.json").is_file():
        dateien["protokoll/entfernen.json"] = AUTOPUBLISH / "protokoll" / "entfernen.json"
    n, _ = lade_hoch(dateien, f"{AP}/daten", sperren=True)
    print(f"stand-uebernehmen: {n} Dateien (Logbuch, Status, Vormerkungen) übertragen")


# ── Viewer bauen ─────────────────────────────────────────────────────────────────────────────────────────────────────

def _autopublish_python() -> str:
    for p in (AUTOPUBLISH / ".venv" / "Scripts" / "python.exe", AUTOPUBLISH / ".venv" / "bin" / "python"):
        if p.exists():
            return str(p)
    sys.exit(f"Keine venv in {AUTOPUBLISH} (siehe dort README.md)")


def _schrift(name: str) -> Path:
    for d in SCHRIFT_QUELLEN:
        if (d / name).is_file():
            return d / name
    sys.exit(f"Schrift {name} nicht gefunden (Geist installieren oder im Website-Repo python bauen.py)")


def _version(ordner: Path, html: str) -> str:
    """?v=<Inhaltskennung> an lokalen js/css: Cloudflare vor dem Webspace cacht statische Dateien 4 h."""
    def ersetze(m):
        attr, url = m.group(1), m.group(2)
        f = ordner / url
        if "://" in url or "?" in url or not f.is_file():
            return m.group(0)
        return f'{attr}="{url}?v={hashlib.sha1(f.read_bytes()).hexdigest()[:10]}"'
    return re.sub(r'(src|href)="([^"]+\.(?:js|css|svg|png))"', ersetze, html)


def bearbeite_viewer(build: Path) -> None:
    """Wie die anderen Lab-Apps (bauen.py, lokal()): Schrift vom eigenen Server, dunkel als Voreinstellung mit demselben
    Speicher wie das Lab, Rückweg ins Lab, Cache-Kennungen."""
    (build / "schrift").mkdir(exist_ok=True)
    css = []
    for familie, gewicht, datei in SCHRIFTEN:
        shutil.copy(_schrift(f"{datei}.ttf"), build / "schrift" / f"{datei}.ttf")
        css.append(f'@font-face{{font-family:"{familie}";font-weight:{gewicht};font-style:normal;font-display:swap;'
                   f'src:url("{datei}.ttf") format("truetype")}}')
    (build / "schrift" / "geist.css").write_text("\n".join(css) + "\n", encoding="utf-8")
    (build / "schrift" / "LIZENZ.txt").write_text(
        "Geist und Geist Mono: Copyright Vercel, SIL Open Font License 1.1 – https://openfontlicense.org\n", encoding="utf-8")

    html = (build / "index.html").read_text(encoding="utf-8")
    html = re.sub(r'<link[^>]+href="https://fonts\.(?:googleapis|gstatic)\.com"[^>]*>\s*', "", html)
    html = re.sub(r'<link[^>]+href="https://fonts\.googleapis\.com/css2[^"]*"[^>]*>', '<link rel="stylesheet" href="schrift/geist.css">', html)
    neu_skript = (f'<script>document.documentElement.dataset.theme = "dark"; try {{ const t = localStorage.getItem("{THEMA_NEU}"); '
                  'if (t === "light" || t === "dark") document.documentElement.dataset.theme = t; } catch (e) {}</script>')
    html, n = re.subn(r"<script>try \{ const t = localStorage\.getItem\(\"" + THEMA_ALT + r"\"\).*?</script>", neu_skript, html, count=1)
    if n != 1:
        sys.exit("index.html: Zeile für die Darstellung nicht gefunden (Viewer geändert?)")
    if "ef-zurueck" not in html:
        html = html.replace("</body>", RUECKWEG + "</body>", 1)
    html = _version(build, html)
    (build / "index.html").write_text(html, encoding="utf-8")
    app = (build / "app.js").read_text(encoding="utf-8")
    if THEMA_ALT not in app:
        sys.exit("app.js: Speicher der Darstellung nicht gefunden (Viewer geändert?)")
    (build / "app.js").write_text(app.replace(THEMA_ALT, THEMA_NEU), encoding="utf-8")
    pruefe_viewer(build)


def pruefe_viewer(build: Path) -> None:
    """Keine Inhalte fremder Server: in HTML, CSS und JS keine externen src/href/url() und keine Google Fonts; alle Bilder
    in den Daten vom eigenen Webspace."""
    fehler = []
    for f in [*build.glob("*.html"), *build.glob("*.css"), *build.glob("*.js"), *(build / "schrift").glob("*.css")]:
        t = f.read_text(encoding="utf-8")
        for m in re.finditer(r'(?:src|href)\s*=\s*"(https?://[^"]+)"|url\(\s*["\']?(https?://[^)"\']+)', t):
            url = m.group(1) or m.group(2)
            tag = t[max(0, t.rfind("<", 0, m.start())):m.start()]
            if f.suffix == ".html" and tag.startswith("<a "):
                continue   # Links sind erlaubt, nur eingebettete Inhalte nicht
            fehler.append(f"{f.name}: {url}")
        if "fonts.googleapis" in t or "fonts.gstatic" in t:
            fehler.append(f"{f.name}: Google Fonts")
    meta = json.loads((build / "daten" / "meta.json").read_text(encoding="utf-8"))
    if meta.get("seiten_url") != SEITE or not meta.get("medien_basis_url", "").startswith(SEITE):
        fehler.append(f"meta.json: seiten_url/medien_basis_url zeigen nicht auf {SEITE} (Überlagerung nicht aktiv?)")
    index = json.loads((build / "daten" / "index.json").read_text(encoding="utf-8"))
    fremd = [b[k] for e in index for b in e.get("bilder", []) for k in ("vorschau", "gross") if not b[k].startswith(SEITE)]
    if fremd:
        fehler.append(f"index.json: {len(fremd)} Bilder nicht vom Webspace, z. B. {fremd[0]}")
    if fehler:
        sys.exit("Prüfung des Viewers:\n  " + "\n  ".join(fehler))
    print(f"  Prüfung ok: {len(index)} Varianten, nur eigene Inhalte, Bilder unter {SEITE}")


def bauen() -> Path:
    print("bauen: Viewer für lab/design-explorer/", flush=True)
    if BUILD.exists():
        shutil.rmtree(BUILD)
    umgebung = {**os.environ, "AUTOPUBLISH_KONFIGURATION_ZUSATZ": str(AUTOPUBLISH / "konfiguration.webspace.json"),
                "PYTHONIOENCODING": "utf-8"}
    r = subprocess.run([_autopublish_python(), "-m", "autopublish.viewer", str(BUILD)], cwd=AUTOPUBLISH, env=umgebung)
    if r.returncode:
        sys.exit("Viewer-Bau fehlgeschlagen")
    bearbeite_viewer(BUILD)
    return BUILD


def auswahl_build(build: Path) -> dict[str, Path]:
    return {p.relative_to(build).as_posix(): p for p in build.rglob("*") if p.is_file()}


# ── Befehle ──────────────────────────────────────────────────────────────────────────────────────────────────────────

def hochladen() -> None:
    hole()
    build = bauen()
    print("hochladen:", flush=True)
    medien, archiv = auswahl_medien(), auswahl_archiv()
    n1, w1 = lade_hoch(archiv, f"{ZIEL}/Archive", loeschen=True, ordner_modus="755")
    n2, w2 = lade_hoch(medien, f"{ZIEL}/medien", loeschen=True, ordner_modus="755")
    viewer = auswahl_build(build)
    # zuletzt der Viewer: Er verweist erst auf Bilder, wenn sie schon da sind; Archive/ und medien/ nie löschen
    n3, w3 = lade_hoch(viewer, ZIEL, loeschen=True, schuetze=("Archive/", "medien/"), sperren=True, ordner_modus="755")
    n4, w4 = lade_hoch(auswahl_daten(), f"{AP}/daten", loeschen=True,
                       schuetze=("logbuch/", "status.json", "protokoll/", "warnungen.json", "verlauf.jsonl", "Archive"), sperren=True)
    ssh(f"cd ~ && ln -sfn \"$HOME/{ZIEL}/Archive\" {AP}/daten/Archive && test -d {AP}/daten/Archive/.")
    print(f"fertig: {n1 + n2 + n3 + n4} Dateien hochgeladen, {w1 + w2 + w3 + w4} entfernt → {SEITE}")
    status(kurz=True)


AP_SH = """#!/bin/sh
# AutoPublish auf entwurfsforschung.de: Aufruf für Cron und SSH, z. B.  ~/autopublish/ap.sh lauf --trocken
# Erzeugt von design-explorer/sync.py (Repo entwurfsforschung); Änderungen dort, nicht hier.
HIER="$HOME/autopublish"
cd "$HIER" || exit 2
export PYTHONPATH="$HIER/code" PYTHONIOENCODING=utf-8 LANG=C.UTF-8
exec "$HIER/venv/bin/python" -m autopublish.webspace --daten "$HIER/daten" --geheim "$HIER/geheim.env" \\
  --viewer "$HOME/{ziel}" --trocken-ordner "$HIER/trocken" --sperre "$HIER/lauf.lock" "$@"
"""


def code() -> None:
    """Paket nach ~/autopublish/code (ganz ersetzt), ap.sh, venv mit den Abhängigkeiten (nur beim ersten Mal)."""
    print("code: Paket und venv in ~/autopublish/", flush=True)
    paket = {f"autopublish/{p.relative_to(AUTOPUBLISH / 'autopublish').as_posix()}": p
             for p in (AUTOPUBLISH / "autopublish").rglob("*.py")}
    with tempfile.TemporaryDirectory() as tmp:
        sh = Path(tmp) / "ap.sh"
        sh.write_bytes(AP_SH.format(ziel=ZIEL).encode("utf-8"))
        n, w = lade_hoch({**paket, "pyproject.toml": AUTOPUBLISH / "pyproject.toml"}, f"{AP}/code", loeschen=True,
                         schuetze=("autopublish/__pycache__", "autopublish/plattformen/__pycache__"), sperren=True)
        lade_hoch({"ap.sh": sh}, AP, modus=0o700)
    print(f"  code: {n} Dateien neu, {w} entfernt")
    aus = ssh(f"set -e; cd ~/{AP}; chmod 700 . ap.sh; mkdir -p protokolle trocken daten; "
              f"if [ ! -x venv/bin/python ]; then {PYTHON_SERVER} -m venv venv; fi; "
              f"venv/bin/python -m pip install -q --disable-pip-version-check {' '.join(shlex.quote(a) for a in ABHAENGIGKEITEN)}; "
              "find code -name __pycache__ -prune -exec rm -rf {} +; "
              "venv/bin/python -c 'import sys, requests, PIL; print(\"venv ok\", sys.version.split()[0], \"requests\", requests.__version__, \"Pillow\", PIL.__version__)'; "
              "PYTHONPATH=code venv/bin/python -c 'import autopublish.webspace, autopublish.lauf, autopublish.entfernen; print(\"Paket ok\")'")
    print("  " + aus.replace("\n", "\n  "))


def trocken() -> None:
    print("trocken: Probelauf auf dem Server (ohne Schlüssel, ohne Plattform-Aufrufe)", flush=True)
    aus = ssh(f"cd ~/{AP} && {{ echo \"== $(date -Is) Trockenlauf\"; ./ap.sh lauf --trocken; echo \"Exit $?\"; }} 2>&1 | tee -a protokolle/trocken.log",
              pruefen=False)
    print(aus)
    posts = ssh(f"cd ~/{AP}/trocken/posts 2>/dev/null && for f in *.json; do echo \"== $f\"; cat \"$f\"; echo; done", pruefen=False)
    for block in posts.split("== ")[1:]:
        name, _, inhalt = block.partition("\n")
        try:
            d = json.loads(inhalt)
        except ValueError:
            continue
        print(f"\n{name}: {d['variante_id']} · {d['familie']}/{d['stimme']}/{d['laenge']} · {len(d['bilder'])} Bilder")
        print(f"  {d['bilder'][0]}")
        print("  " + d["text"].replace("\n", "\n  ")[:700])


def cron_test(warten: int = 200) -> None:
    """Trägt vorübergehend einen minütlichen Cron-Eintrag ein, wartet auf sein Protokoll und entfernt ihn wieder."""
    log = f"$HOME/{AP}/protokolle/cron-test.log"
    zeile = (f"* * * * * {{ echo \"== $(date -Is) cron, TZ=$TZ, $(id -un)\"; $HOME/{AP}/ap.sh netz; echo \"Exit $?\"; }} "
             f">> {log} 2>&1 {CRON_MARKE}")
    zeile = zeile.replace("%", "\\%")
    print("cron-test: Eintrag setzen", flush=True)
    ssh(f"mkdir -p ~/{AP}/protokolle; rm -f {log}; (crontab -l 2>/dev/null | grep -v -F {shlex.quote(CRON_MARKE)}; "
        f"echo {shlex.quote(zeile)}) | crontab -")
    try:
        ende = time.time() + warten
        while time.time() < ende:
            time.sleep(15)
            aus = ssh(f"cat {log} 2>/dev/null", pruefen=False)
            if "Exit " in aus:
                print(aus)
                break
            print("  … warte auf Cron", flush=True)
        else:
            print("  Cron hat in der Wartezeit nichts geschrieben.")
    finally:
        ssh(f"crontab -l 2>/dev/null | grep -v -F {shlex.quote(CRON_MARKE)} | crontab -; "
            f"echo \"crontab danach: $(crontab -l 2>/dev/null | grep -c .) Zeilen\"", pruefen=False)
        print("cron-test: Eintrag entfernt")
        print(ssh("crontab -l 2>&1 | sed 's/^/  /'", pruefen=False) or "  (crontab leer)")


def status(kurz: bool = False) -> None:
    aus = ssh(f"cd ~; echo \"Serverzeit: $(date) · Berlin: $(TZ=Europe/Berlin date)\"; "
              f"echo \"Dateien (inkl. Ordner) im Home: $(find ~ -xdev 2>/dev/null | wc -l)\"; "
              f"echo \"design-explorer: $(find {ZIEL} -type f 2>/dev/null | wc -l) Dateien, $(du -sh {ZIEL} 2>/dev/null | cut -f1)\"; "
              f"echo \"autopublish: $(find {AP} 2>/dev/null | wc -l) Einträge, $(du -sh {AP} 2>/dev/null | cut -f1)\"", pruefen=False)
    print(aus)
    zahl = re.search(r"im Home: (\d+)", aus)
    if zahl and int(zahl.group(1)) > WARN_AB:
        print(f"WARNUNG: mehr als {WARN_AB} Dateien, Grenze {DATEI_GRENZE}")
    if not kurz:
        print(ssh(f"echo '--- crontab'; crontab -l 2>&1; echo '--- letzte Läufe'; tail -n 20 ~/{AP}/protokolle/*.log 2>/dev/null; "
                  f"echo '--- Warnungen'; cat ~/{AP}/daten/warnungen.json 2>/dev/null", pruefen=False))


BEFEHLE = {"hole": hole, "hochladen": hochladen, "bauen": bauen, "code": code, "stand-uebernehmen": stand_uebernehmen,
           "trocken": trocken, "cron-test": cron_test, "status": status}

if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in BEFEHLE:
        sys.exit(__doc__)
    BEFEHLE[sys.argv[1]]()
