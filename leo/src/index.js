// Leo, el asistente de IA de Meraki Barbershop 🦁💈
// Esqueleto inicial: comprueba que el servidor vive en Cloudflare.
export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/salud") {
      return new Response(JSON.stringify({ ok: true, quien: "Leo", negocio: "Meraki Barbershop" }), {
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }
    return new Response("Hola, soy Leo, el asistente de IA de Meraki Barbershop 🦁💈", {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  },
};
