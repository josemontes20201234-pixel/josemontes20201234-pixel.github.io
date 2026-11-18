// Compara qué tan rápido contesta Leo con cada "cerebro" en una conversación completa de prueba
// (sin datos de clientes). Lo corre GitHub Actions.
// La agenda se lee de verdad (solo lectura). apartar_cita y avisar_a_jose NO se ejecutan: se simulan.
import fs from "node:fs";
fs.writeFileSync("/tmp/leo.mjs", fs.readFileSync("leo/src/index.js", "utf8") + "\nexport { sistema, HERRAMIENTAS, horasLibres, soloTexto };\n");
const { sistema, HERRAMIENTAS, horasLibres, soloTexto } = await import("/tmp/leo.mjs");

const configs = [
  { nombre: "A) Sonnet 5.5 como está ahora", model: "claude-sonnet-5-5", extra: {} },
  { nombre: "B) Sonnet 5.5 sin pensar antes de contestar", model: "claude-sonnet-5-5", extra: { thinking: { type: "between_tools" } } },
  { nombre: "C) Sonnet 5.5 sin pensar + esfuerzo bajo", model: "claude-sonnet-5-5", extra: { thinking: { type: "between_tools" }, output_config: { effort: "low" } } },
  { nombre: "D) Haiku 5.5", model: "claude-haiku-5-5", extra: { thinking: { type: "disabled" }, output_config: { effort: "low" } } },
];
const charla = [
  "Hola, ¿cuánto cuesta un corte?",
  "¿Qué incluye el combo el patrón?",
  "¿Tenés espacio hoy?",
  "Ya te escribo otro rato para confirmar",
];

async function claude(c, mensajes) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": process.env.K, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: c.model, max_tokens: 700, system: sistema({}, "instagram"), tools: HERRAMIENTAS, messages: mensajes, ...c.extra }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(r.status + " " + JSON.stringify(j.error || j).slice(0, 300));
  return j;
}

const resumen = [];
for (const c of configs) {
  console.log("\n===== " + c.nombre + " =====");
  let previo = [];
  const tiempos = [];
  try {
    for (const texto of charla) {
      const t0 = Date.now();
      let hist = soloTexto([...previo, { role: "user", content: texto }]);
      let salida = "", llamadas = 0;
      const usadas = [];
      for (let i = 0; i < 5; i++) {
        const res = await claude(c, hist); llamadas++;
        hist.push({ role: "assistant", content: res.content });
        const usos = res.content.filter((b) => b.type === "tool_use");
        salida = res.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim() || salida;
        if (!usos.length) break;
        const resultados = [];
        for (const u of usos) {
          usadas.push(u.name);
          const out = u.name === "horas_libres" ? await horasLibres(u.input.fecha) : { ok: true, prueba: true };
          resultados.push({ type: "tool_result", tool_use_id: u.id, content: JSON.stringify(out) });
        }
        hist.push({ role: "user", content: resultados });
      }
      const s = (Date.now() - t0) / 1000;
      tiempos.push(s);
      previo = soloTexto([...previo, { role: "user", content: texto }, { role: "assistant", content: salida }]);
      console.log("\n» Cliente: " + texto);
      console.log("  [" + s.toFixed(1) + " s · " + llamadas + " llamada(s)" + (usadas.length ? " · usó: " + usadas.join(", ") : "") + "]");
      console.log(salida.split("\n").map((l) => "  " + l).join("\n"));
    }
    const prom = tiempos.reduce((a, b) => a + b, 0) / tiempos.length;
    resumen.push(c.nombre + ": " + tiempos.map((t) => t.toFixed(1)).join(" / ") + " s · promedio " + prom.toFixed(1) + " s");
  } catch (e) {
    console.log("ERROR: " + e.message);
    resumen.push(c.nombre + ": ERROR");
  }
}
console.log("\n===== RESUMEN (segundos por mensaje: precios / combo / espacio hoy / despedida) =====");
for (const r of resumen) console.log(r);
