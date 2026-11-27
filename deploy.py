"""Lädt site/ per SSH auf entwurfsforschung.de (Aufruf: python deploy.py --ziel neu).

--ziel neu    → https://entwurfsforschung.de/neu/ (Durchsicht; der Ordner wird als Ganzes ersetzt, erst nach vollständigem Entpacken)
--ziel start  → https://entwurfsforschung.de/ (Hauptadresse, freigegeben 21.11.2026): ersetzt nur die verwalteten Pfade (VERWALTET); WordPress, /alt/
                und Ordner anderer Werkzeuge (BEHALTEN, z. B. lab/design-explorer/ aus dem Sync der Design Explorations) bleiben unberührt.
                Vorher bauen mit: python bauen.py --alt "/?alte-startseite"
Zugang: deploy.local.json (nicht im Repo) mit SSH-Ziel und Schlüssel. Kein Passwort, nichts wird gelöscht außer dem eigenen Zielordner.
"""
import io, os, subprocess, sys, tarfile

HIER = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(HIER, "site")
_CFG = os.path.join(HIER, "deploy.local.json")                       # Zugang zum Webspace, nicht im Repo: {"host": "benutzer@server", "schluessel": "~/.ssh/…", "docroot": "…"}
_C = __import__("json").load(open(_CFG, encoding="utf-8")) if os.path.exists(_CFG) else {}
HOST = os.environ.get("ENTWURFSFORSCHUNG_SSH", _C.get("host", ""))
SCHLUESSEL = os.path.expanduser(_C.get("schluessel", "~/.ssh/entwurfsforschung_ed25519"))
DOCROOT = _C.get("docroot", "public_html")
ZIELE = {"neu": "neu", "start": "."}
VERWALTET = ["index.html", "favicon.svg", "favicon.ico", "apple-touch-icon.png", "lab", "archiv", "impressum", "bilder", "schrift", "vendor"]
BEHALTEN = ["lab/design-explorer", "lab/zweispaenner/sammlung/daten"]   # Daten der Grundrisssammlung (≈ 73.000 Dateien) lädt planungsgrundlagen-bd gezielt hoch, nicht über bauen.py (27.11.2026)


def deploy(ziel):
    if not HOST:
        sys.exit("Kein Zugang: deploy.local.json fehlt (siehe Kommentar oben) oder ENTWURFSFORSCHUNG_SSH setzen.")
    if ziel not in ZIELE:
        sys.exit(f"Ziel „{ziel}“ ist nicht eingerichtet (nur: {', '.join(ZIELE)}).")
    if not os.path.exists(os.path.join(SITE, "index.html")):
        sys.exit("site/ fehlt – erst python bauen.py")
    puffer = io.BytesIO()
    with tarfile.open(fileobj=puffer, mode="w:gz") as t:
        t.add(SITE, arcname=".")
    if ziel == "start":
        return deploy_start(puffer.getvalue())
    d = f"{DOCROOT}/{ZIELE[ziel]}"
    befehl = (f"set -e; cd ~; rm -rf {d}.tmp; mkdir -p {d}.tmp; tar -xzf - -C {d}.tmp; "
              f"rm -rf {d}.alt; if [ -d {d} ]; then mv {d} {d}.alt; fi; mv {d}.tmp {d}; rm -rf {d}.alt; "
              f"find {d} -type d -exec chmod 755 {{}} +; find {d} -type f -exec chmod 644 {{}} +; echo ok $(find {d} -type f | wc -l) Dateien")
    r = subprocess.run(["ssh", "-i", SCHLUESSEL, "-o", "BatchMode=yes", HOST, befehl], input=puffer.getvalue(), capture_output=True)
    aus = (r.stdout + r.stderr).decode("utf-8", "replace")
    print("\n".join(z for z in aus.splitlines() if "post-quantum" not in z and "store now" not in z and "upgraded" not in z and "pq.html" not in z and "tput" not in z))
    if r.returncode:
        sys.exit("Deploy fehlgeschlagen")
    print(f"online: https://entwurfsforschung.de/{ZIELE[ziel]}/")


def deploy_start(daten):
    """Hauptadresse: neues Paket nach .ki_neu entpacken, BEHALTEN-Ordner hinüberretten, dann je verwalteten Pfad tauschen."""
    # mv statt cp -a: gleicher Datenträger, sofort und ohne Kopie; ein gleichzeitig laufender Upload (Design-Explorer-Sync) schreibt in denselben Ordner weiter (21.11.2026)
    # BEHALTEN gewinnt immer: steht im Paket versehentlich derselbe Pfad, wird die Paketfassung verworfen (22.11.2026, Kachel Design Explorer)
    behalte = " ".join(f'if [ -e "{b}" ]; then rm -rf ".ki_neu/{b}"; mkdir -p ".ki_neu/$(dirname {b})"; mv "{b}" ".ki_neu/{b}"; fi;' for b in BEHALTEN)
    tausch = " ".join(f'if [ -e ".ki_neu/{v}" ]; then rm -rf ".ki_alt/{v}"; if [ -e "{v}" ]; then mv "{v}" ".ki_alt/{v}"; fi; mv ".ki_neu/{v}" "{v}"; fi;' for v in VERWALTET)
    befehl = (f"set -e; cd ~/{DOCROOT}; rm -rf .ki_neu .ki_alt; mkdir .ki_neu .ki_alt; tar -xzf - -C .ki_neu; {behalte} {tausch} "
              f"rm -rf .ki_neu .ki_alt; find {' '.join(VERWALTET)} -type d -exec chmod 755 {{}} +; find {' '.join(VERWALTET)} -type f -exec chmod 644 {{}} +; "
              f"echo ok $(find {' '.join(VERWALTET)} -type f | wc -l) Dateien")
    r = subprocess.run(["ssh", "-i", SCHLUESSEL, "-o", "BatchMode=yes", HOST, befehl], input=daten, capture_output=True)
    aus = (r.stdout + r.stderr).decode("utf-8", "replace")
    print("\n".join(z for z in aus.splitlines() if "post-quantum" not in z and "store now" not in z and "upgraded" not in z and "pq.html" not in z and "tput" not in z))
    if r.returncode:
        sys.exit("Deploy fehlgeschlagen")
    print("online: https://entwurfsforschung.de/")


if __name__ == "__main__":
    a = sys.argv
    deploy(a[a.index("--ziel") + 1] if "--ziel" in a else "neu")
