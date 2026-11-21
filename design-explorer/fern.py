"""„Post now“ und „Remove variant“ für den Design Explorer auf entwurfsforschung.de (Ersatz für die GitLab-Pipelines).

  python design-explorer/fern.py post <variante> <plattform> <familie> [--trocken]
  python design-explorer/fern.py entfernen <variante> "<Grund>"

Der Viewer zeigt diese Befehle in der Einzelansicht zum Kopieren. Sie laufen per SSH auf dem Webspace
(~/autopublish/ap.sh post … bzw. vormerken …), mit derselben Prüfung wie früher in der CI: nur postbare Varianten,
höchstens ein Handpost je Variante, gepostete können nicht entfernt werden. Wer den SSH-Schlüssel nicht hat, kann nichts
auslösen. Zugang wie deploy.py: ../deploy.local.json.
"""
from __future__ import annotations

import shlex
import subprocess
import sys

sys.path.insert(0, __import__("os").path.dirname(__file__))
from sync import _ssh_aufruf, _sauber  # noqa: E402

AP_SH = "~/autopublish/ap.sh"


def main(argv: list[str]) -> int:
    if len(argv) >= 4 and argv[0] == "post":
        befehl = [AP_SH, "post", argv[1], argv[2], argv[3]] + (["--trocken"] if "--trocken" in argv[4:] else [])
    elif len(argv) >= 2 and argv[0] == "entfernen":
        grund = argv[2] if len(argv) > 2 else ""
        if grund.strip() in ("", "<Grund>"):
            print("Bitte einen Grund angeben, z. B.: fern.py entfernen <variante> \"Dach falsch\"")
            return 2
        befehl = [AP_SH, "vormerken", argv[1], "entfernen", grund]
    else:
        print(__doc__)
        return 2
    zeile = " ".join([befehl[0]] + [shlex.quote(a) for a in befehl[1:]])
    r = subprocess.run(_ssh_aufruf(zeile), capture_output=True)
    print(_sauber(r.stdout + r.stderr))
    return r.returncode


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
