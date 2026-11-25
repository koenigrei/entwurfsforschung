"""Bilder der KREMLAS-Dokumentation: Abbildungen aus doku_quelle/figuren.html und Bildschirmfotos der App (gebaute Seite in site/).
Aufruf (im Repo entwurfsforschung, nach python bauen.py):  py -3.14 kremlas/werkzeuge/doku_bilder.py
Schreibt kremlas/doku_quelle/bilder/<name>.png. Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic · 24.11.2026 · CC BY 4.0
"""
import functools, http.server, os, threading, time
from playwright.sync_api import sync_playwright

HIER = os.path.dirname(os.path.abspath(__file__)); K = os.path.dirname(HIER); REPO = os.path.dirname(K)
QUELLE = os.path.join(K, "doku_quelle"); OUT = os.path.join(QUELLE, "bilder"); SITE = os.path.join(REPO, "site")
os.makedirs(OUT, exist_ok=True)

srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(http.server.SimpleHTTPRequestHandler, directory=SITE))
srv.RequestHandlerClass.log_message = lambda *a: None
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASIS = f"http://127.0.0.1:{srv.server_address[1]}"


def warte_suche(pg, max_s=120):
    t0 = time.time()
    while time.time() - t0 < max_s:
        if pg.evaluate("document.getElementById('l-stopp').disabled"):
            return
        time.sleep(0.5)


with sync_playwright() as p:
    b = p.chromium.launch()
    # ---------- Abbildungen (figuren.html, als Datei geladen) ----------
    pg = b.new_page(viewport={"width": 1200, "height": 900}, device_scale_factor=2)
    pg.goto("file:///" + os.path.join(QUELLE, "figuren.html").replace("\\", "/"))
    pg.wait_for_function("window.FERTIG === true", timeout=60000)
    for el in pg.query_selector_all(".fig"):
        name = el.get_attribute("id").replace("fig_", "fig_")
        el.screenshot(path=os.path.join(OUT, name + ".png"))
    pg.close()

    # ---------- Bildschirmfotos der App (helle Darstellung, 1440 px) ----------
    def seite(pfad, hash_="", hoehe=1000):
        ctx = b.new_context(viewport={"width": 1440, "height": hoehe}, device_scale_factor=1.5)
        ctx.add_init_script('try { localStorage.setItem("entwurfsforschung-theme", "light"); localStorage.setItem("entwurfsforschung-sprache", "de"); } catch (e) {}')
        pg = ctx.new_page(); pg.goto(f"{BASIS}/{pfad}{hash_}", wait_until="load"); pg.wait_for_function("window.SIM && window.SIM.zustand", timeout=20000)
        # feste Kopfzeilen fließen lassen, sonst verdecken sie hohe Bühnen (Haus) beim Ausschnitt
        pg.evaluate("document.querySelectorAll('*').forEach(e => { const p = getComputedStyle(e).position; if (p === 'sticky' || p === 'fixed') e.style.position = 'static'; })")
        return ctx, pg

    # Dichte Packung: Grundriss mit sechs Räumen (Wohnung), Saat 2, 400 Generationen
    ctx, pg = seite("lab/kremlas/")
    pg.evaluate("SIM.zuruecksetzen(2); SIM.schritt(400)")
    pg.locator("main.sim").screenshot(path=os.path.join(OUT, "a_packung.png"))
    pg.locator("#steuerung").screenshot(path=os.path.join(OUT, "a_regler.png"), timeout=20000)
    # Lösungen suchen
    pg.click("#l-suche"); warte_suche(pg)
    pg.locator("#loesungen").screenshot(path=os.path.join(OUT, "a_loesungen.png"))
    # L-förmige Räume: Flur und Wohnen
    pg.evaluate("SIM.setze('lform', 3)"); time.sleep(0.5)
    pg.locator("#l-wahl").screenshot(path=os.path.join(OUT, "a_lwahl.png"))
    pg.click("#l-suche"); warte_suche(pg)
    pg.evaluate("document.querySelectorAll('.l-karte')[0].click()"); time.sleep(0.6)
    pg.locator(".buehne canvas#leinwand").screenshot(path=os.path.join(OUT, "a_lform.png"))
    ctx.close()

    # Palladio: Villa Emo, Saat 2, 400 Generationen, Vorbild darunter
    ctx, pg = seite("lab/kremlas/palladio/")
    pg.evaluate("SIM.zuruecksetzen(2); SIM.schritt(400)"); time.sleep(0.5)
    pg.locator(".buehne").screenshot(path=os.path.join(OUT, "a_palladio.png"))
    # Varianten (Nähe 0)
    pg.evaluate("SIM.setze('naehe', 0)"); pg.click("#l-suche"); warte_suche(pg)
    pg.locator("#loesungen").screenshot(path=os.path.join(OUT, "a_palladio_varianten.png"))
    ctx.close()

    # Siza: Haus Typ Bb (EG und OG gekoppelt), 300 Generationen
    ctx, pg = seite("lab/kremlas/siza/", "#saat=1&fassung=sz_bb", 2000)   # Haus: Bühne höher als 1000 px
    pg.evaluate("for (let i = 0; i < 300; i++) SIM.schritt()"); time.sleep(0.8)
    pg.locator(".buehne").screenshot(path=os.path.join(OUT, "a_siza.png"))
    ctx.close()
    b.close()
srv.shutdown()
print("Bilder:", sorted(os.listdir(OUT)))
