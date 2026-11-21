// Meraki web: merakibarbershop.com muestra la página que vive en GitHub Pages (/meraki/)
// sin mover las apps (tarjeta, citas, academy) de su dirección de GitHub.
const ORIGEN = "https://josemontes20201234-pixel.github.io";
const DOMINIO = "merakibarbershop.com";
// Apps que se quedan en su dirección de GitHub (sus datos y su instalación dependen de esa dirección)
const APPS = ["/citas", "/academy", "/alumnos", "/privacidad", "/terminos", "/eliminar-datos"];
// Archivos compartidos que sí se sirven desde aquí
const COMPARTIDOS = ["/leo/media/", "/icon-192.png", "/icon-512.png"];
const QUITAR = ["x-github-request-id", "x-served-by", "x-cache", "x-cache-hits", "x-timer", "x-fastly-request-id", "via"];

export default {
  async fetch(req) {
    const url = new URL(req.url);
    const dominioPropio = url.hostname === DOMINIO || url.hostname === "www." + DOMINIO;
    // www y http van siempre a https://merakibarbershop.com
    if (dominioPropio && (url.hostname !== DOMINIO || url.protocol === "http:")) {
      return Response.redirect("https://" + DOMINIO + url.pathname + url.search, 301);
    }
    if (req.method !== "GET" && req.method !== "HEAD") return new Response("Método no permitido", { status: 405 });

    const ruta = url.pathname;
    // Enlaces viejos con /meraki/ → la misma página sin ese pedazo
    if (ruta === "/meraki" || ruta.startsWith("/meraki/")) {
      return Response.redirect(url.origin + (ruta.slice(7) || "/") + url.search, 301);
    }
    if (APPS.some(a => ruta === a || ruta.startsWith(a + "/"))) {
      return Response.redirect(ORIGEN + ruta + url.search, 302);
    }
    const compartido = COMPARTIDOS.some(c => ruta === c || ruta.startsWith(c));
    const destino = ORIGEN + (compartido ? ruta : "/meraki" + ruta) + url.search;

    const pedir = new Headers();
    for (const k of ["range", "if-none-match", "if-modified-since", "accept", "accept-encoding", "user-agent"]) {
      const v = req.headers.get(k);
      if (v) pedir.set(k, v);
    }
    const r = await fetch(destino, { method: req.method, headers: pedir, redirect: "manual", cf: { cacheEverything: true, cacheTtl: 300 } });

    if (r.status >= 300 && r.status < 400) {
      const loc = r.headers.get("location") || "/";
      const nuevo = loc.startsWith(ORIGEN + "/meraki") ? url.origin + loc.slice((ORIGEN + "/meraki").length)
        : loc.startsWith("/meraki") ? loc.slice(7) : loc;
      return new Response(null, { status: r.status, headers: { location: nuevo || "/" } });
    }
    const salida = new Headers(r.headers);
    QUITAR.forEach(k => salida.delete(k));
    salida.set("x-content-type-options", "nosniff");
    salida.set("referrer-policy", "strict-origin-when-cross-origin");
    return new Response(r.body, { status: r.status, headers: salida });
  }
};
