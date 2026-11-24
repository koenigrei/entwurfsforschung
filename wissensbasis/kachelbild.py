"""Kachelbild der Wissensbasis (Nutzer 25.11.2026): schlichtes Schaubild im dunklen Stil des Lab, kein KI-Bild.

Aufruf: python wissensbasis/kachelbild.py → bilder/wissensbasis.png (1200 × 800). Links die Bausteine der Wissensbasis,
in der Mitte die Startdatei für den Agenten, rechts das neue Projekt; der gestrichelte Bogen führt Ergebnisse zurück.
Schrift Geist / Geist Mono aus den lokal installierten Schriften (wie bauen.py).
"""
import math, os, sys
from PIL import Image, ImageDraw, ImageFont

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HIER))
from bauen import schrift   # noqa: E402

S = 2                                                                  # Überabtastung, am Ende verkleinert
B, H = 1200, 800
PAPIER, LINIE, GRAU, WEISS, AKZENT = "#000000", "#3a3a40", "#8e8e96", "#ffffff", "#9ea0f3"


def f(name, px):
    return ImageFont.truetype(schrift(name), px * S)


def kasten(d, x, y, w, h, text, farbe, schriftart, rand=2, fuell=None):
    d.rounded_rectangle((x * S, y * S, (x + w) * S, (y + h) * S), radius=14 * S, outline=farbe, width=rand * S, fill=fuell)
    tw = d.textlength(text, font=schriftart)
    bb = schriftart.getbbox(text)
    d.text(((x + w / 2) * S - tw / 2, (y + h / 2) * S - (bb[1] + bb[3]) / 2), text, font=schriftart, fill=farbe if farbe != LINIE else WEISS)


def pfeil(d, x0, y0, x1, y1, farbe, breite=2):
    d.line((x0 * S, y0 * S, x1 * S, y1 * S), fill=farbe, width=breite * S)
    a = math.atan2(y1 - y0, x1 - x0); L = 16
    for s in (-1, 1):
        d.line((x1 * S, y1 * S, (x1 - L * math.cos(a + s * .45)) * S, (y1 - L * math.sin(a + s * .45)) * S), fill=farbe, width=breite * S)


def main():
    im = Image.new("RGB", (B * S, H * S), PAPIER); d = ImageDraw.Draw(im)
    mono, gross, mittel = f("GeistMono-Regular.ttf", 26), f("Geist-Light.ttf", 46), f("Geist-Light.ttf", 40)
    d.text((60 * S, 48 * S), "KI LAB · WISSENSBASIS", font=mono, fill=GRAU)
    links = ["METHODE.md", "KATALOG", "SKILLS", "QUELLCODE"]
    lx, lw, lh, y0, abst = 60, 330, 92, 130, 128
    for i, t in enumerate(links):
        kasten(d, lx, y0 + i * abst, lw, lh, t, LINIE, mittel)
    mx, my, mw, mh = 505, 300, 300, 130                                   # Startdatei
    kasten(d, mx, my, mw, mh, "AGENTS.md", AKZENT, gross, rand=3)
    for i in range(len(links)):
        ys = y0 + i * abst + lh / 2
        pfeil(d, lx + lw + 8, ys, mx - 10, my + 30 + i * (mh - 60) / (len(links) - 1), GRAU)
    rx, rw = 900, 250                                                     # neues Projekt
    kasten(d, rx, my - 10, rw, mh + 20, "", WEISS, gross, rand=3)
    for j, zeile in enumerate(("NEUES", "PROJEKT")):
        tw = d.textlength(zeile, font=gross)
        d.text(((rx + rw / 2) * S - tw / 2, (my + 22 + j * 52) * S), zeile, font=gross, fill=WEISS)
    pfeil(d, mx + mw + 8, my + mh / 2, rx - 10, my + mh / 2, WEISS, 3)
    # gestrichelter Bogen zurück in die Wissensbasis (METHODE.md, Katalogzeile)
    ax, ay, bx_, by_ = rx + rw / 2, my + mh + 12, lx + lw / 2 + 40, y0 + 3 * abst + lh + 8   # unten an den Bausteinen
    pts = []
    for k in range(0, 101):
        t = k / 100
        x = (1 - t) ** 2 * ax + 2 * (1 - t) * t * ((ax + bx_) / 2 + 60) + t ** 2 * bx_
        y = (1 - t) ** 2 * ay + 2 * (1 - t) * t * 880 + t ** 2 * by_
        pts.append((x, y))
    for k in range(0, len(pts) - 1, 4):
        d.line((pts[k][0] * S, pts[k][1] * S, pts[min(k + 2, len(pts) - 1)][0] * S, pts[min(k + 2, len(pts) - 1)][1] * S), fill=AKZENT, width=3 * S)
    pfeil(d, pts[-4][0], pts[-4][1], pts[-1][0], pts[-1][1], AKZENT, 3)
    tw = d.textlength("ZURÜCKFÜHREN", font=mono)
    d.text(((ax + bx_) / 2 * S + 60 * S - tw / 2, 722 * S), "ZURÜCKFÜHREN", font=mono, fill=AKZENT)
    im = im.resize((B, H), Image.LANCZOS)
    ziel = os.path.join(os.path.dirname(HIER), "bilder", "wissensbasis.png")
    im.save(ziel, optimize=True)
    print(ziel)


if __name__ == "__main__":
    main()
