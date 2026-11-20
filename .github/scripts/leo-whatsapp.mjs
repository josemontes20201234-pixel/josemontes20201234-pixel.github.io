// Leo en WhatsApp con el cerebro real y herramientas SIMULADAS (no aparta nada de verdad). Lo corre GitHub Actions.
import fs from "node:fs";
fs.writeFileSync("/tmp/leo.mjs", fs.readFileSync("leo/src/index.js", "utf8") + "\nexport { sistema, HERRAMIENTAS, notaWhatsApp };\n");
const { sistema, HERRAMIENTAS, notaWhatsApp } = await import("/tmp/leo.mjs");
const CLIENTE = "50371234567";
const manana = new Date(Date.now() - 6 * 3600e3 + 86400e3).toISOString().slice(0, 10);

async function claude(mensajes) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": process.env.K, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-sonnet-5-5", max_tokens: 700, system: sistema({}, "whatsapp", notaWhatsApp(CLIENTE)), tools: HERRAMIENTAS, messages: mensajes }),
  });
  const j = await r.json(); if (!r.ok) throw new Error(JSON.stringify(j.error || j).slice(0, 300)); return j;
}
function herramienta(u) {
  if (u.name === "horas_libres") return { fecha: u.input.fecha, libres: [{ hora: 9, texto: "9:00 a. m." }, { hora: 11, texto: "11:00 a. m." }] };
  if (u.name === "apartar_cita") return { ok: true, resumen: "(simulada) " + u.input.servicio + " el " + u.input.fecha + " a las " + u.input.hora + ":00 a nombre de " + u.input.nombre, precio: 3.5 };
  return { ok: true };
}
async function escena(titulo, turnos) {
  console.log("\n===== " + titulo + " =====");
  let hist = [];
  for (const texto of turnos) {
    hist.push({ role: "user", content: texto });
    let salida = "", usadas = [];
    for (let i = 0; i < 4; i++) {
      const res = await claude(hist);
      hist.push({ role: "assistant", content: res.content });
      const usos = res.content.filter((b) => b.type === "tool_use");
      salida = res.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim() || salida;
      if (!usos.length) break;
      hist.push({ role: "user", content: usos.map((u) => { usadas.push(u.name + JSON.stringify(u.input)); return { type: "tool_result", tool_use_id: u.id, content: JSON.stringify(herramienta(u)) }; }) });
    }
    hist = hist.map((m) => ({ role: m.role, content: typeof m.content === "string" ? m.content : m.content.filter((b) => b.type === "text").map((b) => b.text).join("\n") || "(ok)" }))
      .filter((m, i, a) => !(m.content === "(ok)" && m.role === "user"));
    console.log("» Cliente: " + texto + (usadas.length ? "\n  [usó: " + usadas.join(" | ") + "]" : "") + "\n" + salida.split("\n").map((l) => "  " + l).join("\n"));
  }
}
await escena("1) Cita por WhatsApp (no debe pedir el número)", ["Buenas, quiero cita para mañana " + manana + " a las 9 para corte clásico", "Me llamo Carlos"]);
await escena("2) Ubicación por WhatsApp", ["¿Dónde quedan? Mandame la ubicación"]);
