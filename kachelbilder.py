"""Kachelbilder der Lab-Projekte als Screenshots in dunkler Darstellung (Nutzer 21.11.2026: Bilder schwarz).
Aufruf: py -3.14 kachelbilder.py [projekt …]   (Playwright nur unter py -3.14; vorher python bauen.py, die Apps kommen aus site/lab/)
Schreibt bilder/<id>.png (roh, ganze Ansicht) – bauen.py nimmt bilder/<id>.png vor dem Bild aus projekte.json.
Gartenatelier: Ausschnitt mit den Parallelkoordinaten aus dem vorhandenen Bild „Explorer“ des KI Lernlabors (dunkel, gemerkte Varianten gelb; Nutzer: „wie gehabt“).
"""
import functools, http.server, os, sys, threading, time
from playwright.sync_api import sync_playwright

HIER = os.path.dirname(os.path.abspath(__file__)); SITE = os.path.join(HIER, "site"); OUT = os.path.join(HIER, "bilder")
os.makedirs(OUT, exist_ok=True)
AUFTRAG = {"campus": ("lab/campus/spielwiese.html", None), "duarte-siza": ("lab/duarte-siza/malagueira.html", None), "palladio": ("lab/palladio/palladio.html#malcontenta&holz", None), "bergdoerfer": ("lab/bergdoerfer/index.html", None), "procedural-cities": ("lab/procedural-cities/procedural_cities.html#vorlage:stadt&saat:4&tab:parzellen", None), "zweispaenner": ("lab/zweispaenner/index.html#v4", None)}
SCHNITT = {"campus": {"x": 340, "y": 200, "width": 1090, "height": 640}, "duarte-siza": {"x": 280, "y": 170, "width": 1144, "height": 430},
           "palladio": {"x": 280, "y": 186, "width": 1144, "height": 470},
           "bergdoerfer": {"x": 200, "y": 120, "width": 960, "height": 720},
           "procedural-cities": {"x": 346, "y": 300, "width": 704, "height": 528},
           "zweispaenner": {"x": 430, "y": 590, "width": 870, "height": 710}}
from PIL import Image                                             # Gartenatelier aus dem vorhandenen Explorer-Bild (1500 × 1000)
_ex = Image.open("C:/LocalOnlyData/GitHub/Planungsgrundlagen/Apps/konzeptstudie/bilder/ks_explorer.png").convert("RGB"); _f = _ex.width / 1500
_ex.crop((int(330 * _f), int(430 * _f), int(1400 * _f), int(820 * _f))).save(os.path.join(OUT, "gartenatelier.png"))
# Studie Formgrammatik (seit 26.11.2026): aus den Bildern duarte-siza.png (EG, OG) und palladio.png (Grundriss, Ansicht) vom 21./22.11.;
# die Aufträge „duarte-siza“/„palladio“ unten zeigen noch auf die alten Adressen (jetzt Weiterleitungen) und brauchen neue Ausschnitte, bevor man sie wieder laufen lässt.
def formgrammatik():
    d, q = Image.open(os.path.join(OUT, "duarte-siza.png")).convert("RGB"), Image.open(os.path.join(OUT, "palladio.png")).convert("RGB")
    a, s = d.crop((0, 0, 578, 430)), 430 / 470; b = q.crop((0, 0, 922, 470)).resize((round(922 * s), 430), Image.LANCZOS)
    im = Image.new("RGB", (a.width + b.width + 6, 430), d.getpixel((570, 420))); im.paste(a, (0, 0)); im.paste(b, (a.width + 6, 0))
    im.save(os.path.join(OUT, "formgrammatik.png"))
formgrammatik()
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(http.server.SimpleHTTPRequestHandler, directory=SITE))
srv.RequestHandlerClass.log_message = lambda *a: None
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"])
    for pid in (sys.argv[1:] or AUFTRAG):
        url, warte = AUFTRAG[pid]
        pg = b.new_context(viewport={"width": 1440, "height": 900}, color_scheme="dark", device_scale_factor=1).new_page()
        pg.goto(f"http://127.0.0.1:{srv.server_address[1]}/{url}", timeout=120000)
        if warte: pg.wait_for_function(warte, timeout=600000)
        time.sleep(4)
        pg.screenshot(path=os.path.join(OUT, pid + "_roh.png"))
        ziel = os.path.join(OUT, pid + ".png")
        pg.screenshot(path=ziel, clip=SCHNITT[pid], full_page=SCHNITT[pid]["y"] + SCHNITT[pid]["height"] > 900)   # Zweispänner: Plan liegt unter der Falz
        print(pid, "ok"); pg.close()
    b.close()
srv.shutdown()
