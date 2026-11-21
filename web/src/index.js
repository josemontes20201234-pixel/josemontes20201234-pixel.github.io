// Meraki web: merakibarbershop.com muestra la página que vive en GitHub Pages (/meraki/)
// sin mover las apps (tarjeta, citas, academy) de su dirección de GitHub.
const ORIGEN = "https://josemontes20201234-pixel.github.io";
const DOMINIO = "merakibarbershop.com";
// Apps que se quedan en su dirección de GitHub (sus datos y su instalación dependen de esa dirección)
const APPS = ["/citas", "/academy", "/alumnos", "/privacidad", "/terminos", "/eliminar-datos"];
// Archivos compartidos que sí se sirven desde aquí
const COMPARTIDOS = ["/leo/media/", "/icon-192.png", "/icon-512.png"];
const QUITAR = ["x-github-request-id", "x-served-by", "x-cache", "x-cache-hits", "x-timer", "x-fastly-request-id", "via"];

// Chat con Leo desde la página: la página le escribe aquí (mismo dominio) y este worker se lo pasa a Leo por un
// enlace interno (service binding "LEO"). Límites por conexión y por persona para cuidar el saldo de Claude;
// Leo además tiene su propio tope del día entre todas las personas.
const LEO_TOPE_IP = 40;
const LEO_TOPE_PERSONA = 25;
const LEO_LLENO = { lleno: true, burbujas: ["Por hoy ya platicamos bastante por aquí 🙏", "Si necesitás algo más, escribile a Jose al WhatsApp 6061-8603 💈"], botones: [] };

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const dominioPropio = url.hostname === DOMINIO || url.hostname === "www." + DOMINIO;
    // www y http van siempre a https://merakibarbershop.com
    if (dominioPropio && (url.hostname !== DOMINIO || url.protocol === "http:")) {
      return Response.redirect("https://" + DOMINIO + url.pathname + url.search, 301);
    }
    if (url.pathname === "/api/leo") {
      return url.hostname === DOMINIO ? chatLeo(req, env) : new Response("No encontrado", { status: 404 });
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
    // Una dirección que no existe muestra la página 404 de Meraki; un archivo que falta (foto, css) sigue con el 404 normal.
    const pareceArchivo = /\.[a-z0-9]{1,5}$/i.test(ruta) && !/\.html?$/i.test(ruta);
    if (r.status === 404 && !compartido && !pareceArchivo) {
      const p = await fetch(ORIGEN + "/meraki/404.html", { cf: { cacheEverything: true, cacheTtl: 300 } });
      if (p.ok) {
        const h = limpiar(p.headers);
        h.set("cache-control", "no-cache");
        return new Response(req.method === "HEAD" ? null : p.body, { status: 404, headers: h });
      }
    }
    const salida = limpiar(r.headers);
    if (r.status === 200 || r.status === 304 || r.status === 206) salida.set("cache-control", cacheNavegador(ruta, url, salida.get("content-type") || ""));
    return new Response(r.body, { status: r.status, headers: salida });
  }
};

// Cuánto guarda el navegador cada cosa. Las páginas se revisan siempre (si no cambiaron, la respuesta es mínima),
// así los cambios se ven de inmediato. El CSS y el JS llevan ?v= en la página: cuando cambian, cambia la dirección.
function cacheNavegador(ruta, url, tipo) {
  if (/text\/html/i.test(tipo)) return "no-cache";
  if (url.searchParams.has("v")) return "public, max-age=31536000, immutable";
  if (/\.json$/i.test(ruta)) return "public, max-age=300";
  return "public, max-age=3600";
}

async function chatLeo(req, env) {
  const salida = (o, s = 200) => new Response(JSON.stringify(o), {
    status: s, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" },
  });
  if (req.method !== "POST") return salida({ error: "metodo" }, 405);
  if ((req.headers.get("origin") || "") !== "https://" + DOMINIO) return salida({ error: "origen" }, 403);
  if (!env || !env.LEO) return salida({ error: "sin-leo" }, 503);
  if (Number(req.headers.get("content-length") || 0) > 4000) return salida({ error: "muy-largo" }, 413);
  let cuerpo = {};
  try { cuerpo = await req.json(); } catch { return salida({ error: "invalido" }, 400); }
  const id = String((cuerpo && cuerpo.id) || "");
  const texto = String((cuerpo && cuerpo.texto) || "").trim().slice(0, 600);
  if (!/^[a-z0-9-]{16,40}$/i.test(id) || !texto) return salida({ error: "invalido" }, 400);
  const dia = new Date(Date.now() - 6 * 3600e3).toISOString().slice(0, 10); // día en El Salvador
  const ip = req.headers.get("cf-connecting-ip") || "sin-ip";
  if (!(await contar("ip-" + (await huella(ip)) + "-" + dia, LEO_TOPE_IP))) return salida(LEO_LLENO);
  if (!(await contar("p-" + id + "-" + dia, LEO_TOPE_PERSONA))) return salida(LEO_LLENO);
  let r;
  try {
    r = await env.LEO.fetch("https://interno.leo/web/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, texto }) });
  } catch { return salida({ error: "leo" }, 502); }
  const j = await r.json().catch(() => ({ error: "leo" }));
  return salida(j, r.ok ? 200 : 502);
}

// Contador por día con la caché de Cloudflare (gratis y sin escrituras en KV). Cuenta por centro de datos; para estos topes basta.
async function contar(clave, tope) {
  const cache = caches.default;
  const k = new Request("https://" + DOMINIO + "/__limites/" + encodeURIComponent(clave));
  const previo = await cache.match(k);
  const n = previo ? Number(await previo.text()) || 0 : 0;
  if (n >= tope) return false;
  await cache.put(k, new Response(String(n + 1), { headers: { "cache-control": "public, max-age=172800" } }));
  return true;
}

async function huella(t) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return [...new Uint8Array(d)].slice(0, 12).map(b => b.toString(16).padStart(2, "0")).join("");
}

function limpiar(h) {
  const salida = new Headers(h);
  QUITAR.forEach(k => salida.delete(k));
  salida.set("x-content-type-options", "nosniff");
  salida.set("referrer-policy", "strict-origin-when-cross-origin");
  return salida;
}
