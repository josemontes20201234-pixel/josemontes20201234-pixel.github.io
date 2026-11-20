// Pruebas de los avisos de Jose (Meraki CRM → Ajustes → Avisos para Leo) con el cerebro real de Leo
// y herramientas SIMULADAS: no aparta nada de verdad ni toca los avisos guardados. Lo corre GitHub Actions.
import fs from "node:fs";
fs.writeFileSync("/tmp/leo.mjs", fs.readFileSync("leo/src/index.js", "utf8") + "\nexport { sistema, HERRAMIENTAS };\n");
const { sistema, HERRAMIENTAS } = await import("/tmp/leo.mjs");

const hoySV = new Date(Date.now() - 6 * 3600e3);
const masDias = (n) => new Date(hoySV.getTime() + n * 86400e3).toISOString().slice(0, 10);
const sabado = masDias((6 - hoySV.getUTCDay() + 7) % 7 || 7);
const domingo = masDias(((6 - hoySV.getUTCDay() + 7) % 7 || 7) + 1);
const AVISOS = [
  { id: "a1", texto: "El sábado " + Number(sabado.slice(8)) + " cierro a las 2:00 p. m.: ese día no hay citas después de esa hora.", hasta: sabado },
  { id: "a2", texto: "Promo de la semana: Combo el patrón a $4.50 (en vez de $5).", hasta: domingo },
];

async function claude(mensajes, avisos) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": process.env.K, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-sonnet-5-5", max_tokens: 700, system: sistema({}, "instagram", "", avisos), tools: HERRAMIENTAS, messages: mensajes }),
  });
  const j = await r.json(); if (!r.ok) throw new Error(JSON.stringify(j.error || j).slice(0, 300)); return j;
}
function herramienta(u) {
  // A propósito incluye las 3:00 p. m. del sábado: el aviso dice que ese día cierra a las 2
  if (u.name === "horas_libres") return { fecha: u.input.fecha, libres: [{ hora: 9, texto: "9:00 a. m." }, { hora: 11, texto: "11:00 a. m." }, { hora: 13, texto: "1:00 p. m." }, { hora: 15, texto: "3:00 p. m." }] };
  if (u.name === "apartar_cita") return { ok: true, resumen: "(simulada) " + JSON.stringify(u.input), precio: 4 };
  return { ok: true };
}
async function escena(titulo, texto, avisos) {
  let hist = [{ role: "user", content: texto }], salida = "", usadas = [];
  for (let i = 0; i < 4; i++) {
    const res = await claude(hist, avisos);
    hist.push({ role: "assistant", content: res.content });
    const usos = res.content.filter((b) => b.type === "tool_use");
    salida = res.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim() || salida;
    if (!usos.length) break;
    hist.push({ role: "user", content: usos.map((u) => { usadas.push(u.name + JSON.stringify(u.input)); return { type: "tool_result", tool_use_id: u.id, content: JSON.stringify(herramienta(u)) }; }) });
  }
  console.log("\n===== " + titulo + " =====\n» Cliente: " + texto + (usadas.length ? "\n  [usó: " + usadas.join(" | ") + "]" : "") + "\n" + salida.split("\n").map((l) => "  " + l).join("\n"));
}

console.log("Avisos de prueba:\n" + AVISOS.map((a) => "- " + a.texto + " (hasta " + a.hasta + ")").join("\n"));
await escena("1) Pide el sábado a las 3 (con avisos: cierra a las 2)", "Buenas, ¿tenés espacio el sábado " + Number(sabado.slice(8)) + " a las 3 de la tarde para corte moderno?", AVISOS);
await escena("2) Pregunta por el combo (con avisos: hay promo)", "¿Cuánto cuesta el combo el patrón?", AVISOS);
await escena("3) Solo saluda (con avisos)", "Hola, buenas", AVISOS);
await escena("4) Control: lo mismo que la 1, SIN avisos", "Buenas, ¿tenés espacio el sábado " + Number(sabado.slice(8)) + " a las 3 de la tarde para corte moderno?", []);
