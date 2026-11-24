"""Prüft die Apps der Frühen Simulationen im Browser und erzeugt ihre Kachelbilder.

Aufruf (Playwright nur unter py -3.14):
    py -3.14 simulationen/pruefe_apps.py                  alle Apps mit Status „umgesetzt“ in bestand.json, danach Mosaik bilder/simulationen.png
    py -3.14 simulationen/pruefe_apps.py <id> [<id> …]    nur diese Apps (auch wenn noch „in_arbeit“), ohne Mosaik
    py -3.14 simulationen/pruefe_apps.py kremlas          eigenes Lab-Projekt im selben Rahmen (EIGENE: kremlas/ → lab/kremlas/)

Braucht keinen Bau: ein kleiner Server liefert /lab/simulationen/… direkt aus simulationen/ und die Schrift Geist aus den
installierten Windows-Schriften (wie bauen.py). Mehrere Agenten können so gleichzeitig prüfen, ohne site/ anzufassen.

Je App, dunkel und hell, 1440 und 390 px breit:
  - keine Laufzeitfehler (pageerror, console.error), keine fehlgeschlagenen Anfragen außer Schriften
  - kein waagerechtes Scrollen (scrollWidth ≤ innerWidth)
  - Start → läuft, Pause, Schritt (+1), Zurücksetzen (t = 0); Pflichtlinks und Hinweise im <head> vorhanden
  - optional app.json "pruef_ausdruck": JavaScript-Ausdruck, der nach "vorschau_schritte" Schritten wahr sein muss
Ergebnisse: Bildschirmfotos in simulationen/_pruefung/ (nicht im Repo), Kachelbild <id>/vorschau.png (dunkel, nur Zeichenfläche).
"""
import functools, http.server, json, os, sys, threading, time, urllib.parse

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
AUS = os.path.join(HIER, "_pruefung")
# Eigene Lab-Projekte im Rahmen der Frühen Simulationen (KREMLAS, eigene Kachel seit 23.11.2026): Quellordner, Adresse, Archivpräfix
EIGENE = {"kremlas": (os.path.join(REPO, "kremlas"), "/lab/kremlas/", "../../archiv/", ""),
          "kremlas-palladio": (os.path.join(REPO, "kremlas", "palladio"), "/lab/kremlas/palladio/", "../../../archiv/", "../")}   # Ordner, Adresse, Archiv, Präfix der Projektdateien
sys.path.insert(0, REPO)
import bauen  # noqa: E402  (Schrift-Quellen und geist.css wie im Bau)


class Server(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def translate_path(self, pfad):
        p = urllib.parse.unquote(urllib.parse.urlsplit(pfad).path)
        if p.startswith("/lab/simulationen/"):
            return os.path.join(HIER, *p[len("/lab/simulationen/"):].split("/"))
        for ordner, adresse, _, _ in sorted(EIGENE.values(), key=lambda e: -len(e[1])):   # längste Adresse zuerst
            if p.startswith(adresse):
                return os.path.join(ordner, *p[len(adresse):].split("/"))
        if p.startswith("/schrift/") and p.endswith(".ttf"):
            try:
                return bauen.schrift(os.path.basename(p))
            except FileNotFoundError:
                return os.path.join(AUS, "fehlt")
        return os.path.join(REPO, "site", *p.lstrip("/").split("/"))

    def do_GET(self):
        if self.path.split("?")[0] == "/schrift/geist.css":
            b = bauen.GEIST_CSS.encode("utf-8")
            self.send_response(200); self.send_header("Content-Type", "text/css; charset=utf-8"); self.send_header("Content-Length", str(len(b))); self.end_headers()
            self.wfile.write(b); return
        return super().do_GET()


def apps_aus_bestand():
    B = json.load(open(os.path.join(HIER, "bestand.json"), encoding="utf-8"))
    return [e["id"] for e in B["programme"] if e.get("status") == "umgesetzt"]


def pruefe_app(browser, basis, aid):
    befunde = []
    ordner, adresse, archiv, pre = EIGENE.get(aid, (os.path.join(HIER, aid), f"/lab/simulationen/{aid}/", "../../../archiv/", ""))
    meta = json.load(open(os.path.join(ordner, "app.json"), encoding="utf-8"))
    for thema in ("dark", "light"):
        for breite in (1440, 390):
            ctx = browser.new_context(viewport={"width": breite, "height": 900}, color_scheme=thema, device_scale_factor=1)
            ctx.add_init_script(f'try {{ localStorage.setItem("entwurfsforschung-theme", "{thema}"); }} catch (e) {{}}')
            pg = ctx.new_page(); fehler = []
            pg.on("pageerror", lambda e: fehler.append(f"pageerror: {e}"))
            pg.on("console", lambda m: fehler.append(f"console: {m.text}") if m.type == "error" else None)
            pg.on("requestfailed", lambda r: None if "/schrift/" in r.url else fehler.append(f"Anfrage fehlgeschlagen: {r.url}"))
            pg.on("response", lambda r: fehler.append(f"HTTP {r.status}: {r.url}") if r.status >= 400 and "/schrift/" not in r.url and not r.url.endswith("quellcode.zip") else None)
            pg.goto(f"{basis}{adresse}", wait_until="load")
            pg.wait_for_function("window.SIM && window.SIM.zustand", timeout=15000)
            ort = f"{aid} {thema} {breite}px"
            t0 = pg.evaluate("SIM.zustand.t")
            pg.click("#k-start"); time.sleep(1.2)
            if not pg.evaluate("SIM.laeuft") and pg.evaluate(f"SIM.zustand.t") == t0:
                befunde.append(f"{ort}: Start läuft nicht")
            pg.click("#k-pause"); t1 = pg.evaluate("SIM.zustand.t")
            if pg.evaluate("SIM.laeuft"):
                befunde.append(f"{ort}: Pause hält nicht an")
            pg.click("#k-schritt")
            if meta.get("schritt_pflicht", True) and pg.evaluate("SIM.zustand.t") != t1 + 1:
                befunde.append(f"{ort}: Schritt zählt nicht um 1 weiter")
            pg.click("#k-neu")
            if pg.evaluate("SIM.zustand.t") != 0:
                befunde.append(f"{ort}: Zurücksetzen setzt t nicht auf 0")
            sw = pg.evaluate("[document.documentElement.scrollWidth, window.innerWidth]")
            if sw[0] > sw[1]:
                befunde.append(f"{ort}: waagerechtes Scrollen ({sw[0]} > {sw[1]} px)")
            if thema == "dark" and breite == 1440:
                kopf = pg.evaluate("""[!!document.querySelector('link[rel=help][href="PREAGENTS.md"]'), !!document.querySelector('meta[name=source][content="PREquellcode.zip"]'),
                                       !!document.querySelector('a[href="PREquellcode.zip"]'), !!document.querySelector('a[href="PREAGENTS.md"]'),
                                       !!document.querySelector('a[href^="ARCHIV"]'), getComputedStyle(document.body).backgroundColor]""".replace("ARCHIV", archiv).replace("PRE", pre))
                for ok, was in zip(kopf[:5], ("<link rel=help href=AGENTS.md>", "<meta name=source content=quellcode.zip>", "Link quellcode.zip", "Link AGENTS.md", "Link zur Archivseite")):
                    if not ok:
                        befunde.append(f"{aid}: {was} fehlt")
                if kopf[5] not in ("rgb(0, 0, 0)",):
                    befunde.append(f"{aid}: dunkle Darstellung ist nicht schwarz ({kopf[5]})")
            os.makedirs(AUS, exist_ok=True)
            pg.screenshot(path=os.path.join(AUS, f"{aid}_{thema}_{breite}.png"), full_page=True)
            if thema == "dark" and breite == 1440:                       # Kachelbild und fachliche Prüfung
                pg.evaluate(f"SIM.zuruecksetzen({int(meta.get('vorschau_saat', 1))})")
                for k, v in (meta.get("vorschau_param") or {}).items():
                    pg.evaluate("([k, v]) => SIM.setze(k, v)", [k, v])
                n = int(meta.get("vorschau_schritte", 0))
                while n > 0:
                    m = min(n, 200); pg.evaluate(f"SIM.schritt({m})"); n -= m
                if meta.get("pruef_ausdruck") and not pg.evaluate(meta["pruef_ausdruck"]):
                    befunde.append(f"{aid}: pruef_ausdruck nicht erfüllt: {meta['pruef_ausdruck']}")
                pg.locator("#leinwand").screenshot(path=os.path.join(ordner, "vorschau.png"))
            befunde += [f"{ort}: {f}" for f in fehler]
            ctx.close()
    return befunde


def mosaik(ids):
    """Kachelbild des Bereichs fürs Lab: bis zu vier Vorschaubilder im Raster, schwarz, feine Linien."""
    from PIL import Image
    W, H, n = 900, 600, min(4, len(ids))
    if not n:
        return
    im = Image.new("RGB", (W, H), "#000000")
    spalten = 1 if n == 1 else 2; zeilen = 1 if n <= 2 else 2
    zw, zh = (W - (spalten - 1)) // spalten, (H - (zeilen - 1)) // zeilen
    for i, aid in enumerate(ids[:n]):
        q = Image.open(os.path.join(HIER, aid, "vorschau.png")).convert("RGB")
        f = max(zw / q.width, zh / q.height); q = q.resize((round(q.width * f), round(q.height * f)), Image.LANCZOS)
        l, o = (q.width - zw) // 2, (q.height - zh) // 2
        im.paste(q.crop((l, o, l + zw, o + zh)), ((i % spalten) * (zw + 1), (i // spalten) * (zh + 1)))
    from PIL import ImageDraw
    d = ImageDraw.Draw(im)
    if spalten == 2: d.line([(zw, 0), (zw, H)], fill="#2a2a2e")
    if zeilen == 2: d.line([(0, zh), (W, zh)], fill="#2a2a2e")
    im.save(os.path.join(REPO, "bilder", "simulationen.png"))


def main():
    from playwright.sync_api import sync_playwright
    ids = sys.argv[1:] or apps_aus_bestand()
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Server)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    basis = f"http://127.0.0.1:{srv.server_address[1]}"
    befunde = []
    with sync_playwright() as p:
        b = p.chromium.launch()
        for aid in ids:
            bf = pruefe_app(b, basis, aid)
            print(aid, "ok" if not bf else f"{len(bf)} Befunde"); befunde += bf
        b.close()
    srv.shutdown()
    if not sys.argv[1:] and not befunde:
        mosaik(ids); print("Mosaik: bilder/simulationen.png")
    print("\n".join(befunde) if befunde else "ok")
    sys.exit(1 if befunde else 0)


if __name__ == "__main__":
    main()
