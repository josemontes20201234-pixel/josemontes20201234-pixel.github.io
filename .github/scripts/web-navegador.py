# Prueba la página en vivo con un navegador de verdad: el escáner (con la foto de Leo, no de una persona)
# y el chat con Leo. Guarda capturas en ./capturas. Lo corre GitHub Actions.
import asyncio, json, os
from playwright.async_api import async_playwright

URL = "https://merakibarbershop.com"
os.makedirs("capturas", exist_ok=True)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--enable-unsafe-swiftshader"])
        ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        pg = await ctx.new_page()
        errores, fuera = [], set()
        pg.on("pageerror", lambda e: errores.append(str(e)[:200]))
        pg.on("request", lambda r: fuera.add(r.url.split("/")[2]) if not r.url.startswith((URL, "data:", "blob:")) else None)

        # 1) Escáner con una foto
        await pg.goto(URL + "/visagismo/", wait_until="networkidle")
        await pg.set_input_files("#esc-foto", ".github/scripts/leo-prueba.jpg")
        for _ in range(90):
            await pg.wait_for_timeout(1000)
            listo = await pg.evaluate("!document.getElementById('resultado').hidden || !document.getElementById('esc-error').hidden")
            if listo: break
        info = await pg.evaluate("""() => ({
            forma: document.getElementById('resultado').hidden ? null : document.getElementById('r-nombre').textContent,
            error: document.getElementById('esc-error').hidden ? null : document.getElementById('esc-error-texto').textContent,
            medidas: [...document.querySelectorAll('.medida')].map(x => x.textContent),
            frases: document.getElementById('r-frases').textContent })""")
        print("Escáner con foto:", json.dumps(info, ensure_ascii=False))
        await pg.screenshot(path="capturas/1-escaner-resultado.png")

        # 2) Chat con Leo (una pregunta real)
        await pg.click(".leo-burbuja")
        await pg.wait_for_timeout(500)
        await pg.fill("#leo-texto", "¿Qué horario tienen?")
        await pg.keyboard.press("Enter")
        for _ in range(60):
            await pg.wait_for_timeout(1000)
            n = await pg.evaluate("document.querySelectorAll('.leo-msj--leo:not(.leo-escribiendo)').length")
            if n >= 3: break
        respuesta = await pg.evaluate("[...document.querySelectorAll('.leo-msj--leo')].slice(2).map(x => x.textContent)")
        print("Leo respondió:", json.dumps(respuesta, ensure_ascii=False))
        await pg.screenshot(path="capturas/2-chat-leo.png")

        print("Sitios fuera de merakibarbershop.com que se contactaron:", sorted(fuera) or "ninguno")
        print("Errores de la página:", errores or "ninguno")
        await b.close()

asyncio.run(main())
