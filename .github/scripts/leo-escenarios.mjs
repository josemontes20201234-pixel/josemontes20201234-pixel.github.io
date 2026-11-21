// Pruebas de conversación con el cerebro real de Leo y herramientas SIMULADAS (no aparta nada de verdad).
// Datos inventados (Carlos, 71234567). Lo corre GitHub Actions.
import fs from "node:fs";
fs.writeFileSync("/tmp/leo.mjs", fs.readFileSync("leo/src/index.js", "utf8") + "\nexport { sistema, HERRAMIENTAS };\n");
const { sistema, HERRAMIENTAS } = await import("/tmp/leo.mjs");
const manana = new Date(Date.now() - 6 * 3600e3 + 86400e3).toISOString().slice(0, 10);
const yaApartada = "Corte clásico · jueves " + manana + " a las 10:00 a. m. · Carlos · 71234567";

async function claude(mensajes, extra) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": process.env.K, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-sonnet-5-5", max_tokens: 700, system: sistema({}, "instagram", extra), tools: HERRAMIENTAS, messages: mensajes, thinking: { type: "between_tools" } }),
  });
  const j = await r.json(); if (!r.ok) throw new Error(JSON.stringify(j.error || j).slice(0, 300)); return j;
}
function herramienta(u, tieneCita) {
  if (u.name === "horas_libres") return { fecha: u.input.fecha, libres: [{ hora: 9, texto: "9:00 a. m." }, { hora: 11, texto: "11:00 a. m." }, { hora: 13, texto: "1:00 p. m." }] };
  if (u.name === "apartar_cita") {
    if (tieneCita && Number(u.input.hora) === 10 && u.input.fecha === manana) return { ok: true, ya_estaba_apartada: true, resumen: yaApartada, precio: 3.5 };
    if (tieneCita && !u.input.otra) return { error: "Este cliente ya tiene cita apartada: " + yaApartada + ". Preguntale si quiere OTRA cita además de esa (si dice que sí, usá otra=true). Si quiere cambiarla o cancelarla, usá avisar_a_jose." };
    return { ok: true, resumen: "(simulada) " + JSON.stringify(u.input), precio: 3.5 };
  }
  return { ok: true };
}
async function escena(titulo, previo, texto, tieneCita) {
  const extra = tieneCita ? "Este cliente YA tiene cita apartada (es real, está en la agenda): " + yaApartada + " · $3.50. No la volvás a apartar; si pide comprobante, repetile estos datos." : "";
  let hist = [...previo, { role: "user", content: texto }], salida = "", usadas = [];
  for (let i = 0; i < 4; i++) {
    const res = await claude(hist, extra);
    hist.push({ role: "assistant", content: res.content });
    const usos = res.content.filter((b) => b.type === "tool_use");
    salida = res.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim() || salida;
    if (!usos.length) break;
    hist.push({ role: "user", content: usos.map((u) => { usadas.push(u.name + JSON.stringify(u.input)); return { type: "tool_result", tool_use_id: u.id, content: JSON.stringify(herramienta(u, tieneCita)) }; }) });
  }
  console.log("\n===== " + titulo + " =====\n» Cliente: " + texto + (usadas.length ? "\n  [usó: " + usadas.join(" | ") + "]" : "") + "\n" + salida.split("\n").map((l) => "  " + l).join("\n"));
}
const reserva = [
  { role: "user", content: "Hola, ¿tenés espacio mañana a las 10 para corte clásico?" },
  { role: "assistant", content: "Hola, soy Leo, el asistente de IA de Meraki Barbershop 🦁💈\n\nSí, mañana a las 10:00 a. m. está libre 🔥 ¿A nombre de quién la aparto y cuál es tu WhatsApp de 8 dígitos?" },
];
await escena("1) Manda solo el número", reserva, "71234567", false);
const hecha = [...reserva,
  { role: "user", content: "Carlos, 71234567" },
  { role: "assistant", content: "Te la repito: 📅 Corte clásico, mañana 10:00 a. m., a nombre de Carlos. ¿Te la aparto? Decime «sí» 🦁" },
  { role: "user", content: "Sí, apartala" },
  { role: "assistant", content: "Listo, Carlos, tu cita quedó apartada 🔥\n📅 Corte clásico, mañana 10:00 a. m. — $3.50" },
];
await escena("2) Pide comprobante por WhatsApp (cita ya hecha)", hecha, "Excelente, ¿me mandás el comprobante por WhatsApp?", true);
await escena("3) Quiere otra cita para su hermano", hecha, "Y también quiero apartar una para mi hermano mañana a las 11", true);
// Página web (21 nov 2026): Leo pasa los links solo cuando vienen al caso
await escena("4) Pregunta por la página", [], "Hola, ¿tienen página web?", false);
await escena("5) No sabe qué corte le queda", [], "No sé qué corte me queda bien 😅", false);
await escena("6) Pregunta dónde quedan", [], "¿Dónde quedan ustedes?", false);
await escena("7) Pregunta por clases", [], "¿Dan clases de barbería?", false);
await escena("8) Quiere cita (no debe mandarlo a la página)", [], "Quiero un corte para el sábado", false);
// Tarjetas de regalo (21 nov 2026)
await escena("9) Quiere regalar un corte", [], "Quiero regalarle un corte a mi novio para su cumpleaños, ¿cómo hago?", false);
await escena("10) Cómo se paga la tarjeta de regalo", [], "¿Cómo pago la tarjeta de regalo? ¿Me das la cuenta para transferir?", false);
await escena("11) Trae tarjeta de regalo y quiere cita", [], "Hola, me regalaron una tarjeta de regalo de corte moderno, código 7Q4P-9XHD. Quiero ir mañana a las 9", false);
await escena("12) Perdió su tarjeta de regalo", [], "Se me borró la foto de la tarjeta de regalo que me regalaron, ¿qué hago?", false);
