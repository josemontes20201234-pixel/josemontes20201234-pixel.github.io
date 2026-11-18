// Compara qué tan rápido contesta Leo con cada "cerebro" (sin datos de clientes). Lo corre GitHub Actions.
import fs from "node:fs";
fs.writeFileSync("/tmp/leo.mjs", fs.readFileSync("leo/src/index.js", "utf8") + "\nexport { sistema, HERRAMIENTAS };\n");
const { sistema, HERRAMIENTAS } = await import("/tmp/leo.mjs");
const configs = [
  { nombre: "A) Sonnet 5.5 como está ahora", model: "claude-sonnet-5-5", extra: {} },
  { nombre: "B) Sonnet 5.5 sin pensar de más", model: "claude-sonnet-5-5", extra: { thinking: { type: "between_tools" }, output_config: { effort: "low" } } },
  { nombre: "C) Haiku 5.5", model: "claude-haiku-5-5", extra: { thinking: { type: "disabled" }, output_config: { effort: "low" } } },
];
const preguntas = ["¿A qué hora abren?", "Hola, ¿cuánto cuesta un corte?"];
for (const c of configs) {
  const tiempos = []; let ejemplo = ""; let error = "";
  for (let vuelta = 0; vuelta < 2 && !error; vuelta++) for (const p of preguntas) {
    const t0 = Date.now();
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": process.env.K, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: c.model, max_tokens: 700, system: sistema({}, "instagram"), tools: HERRAMIENTAS, messages: [{ role: "user", content: p }], ...c.extra }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { error = r.status + " " + JSON.stringify(j.error || j).slice(0, 300); break; }
    tiempos.push((Date.now() - t0) / 1000);
    if (vuelta === 1 && p === preguntas[1]) ejemplo = (j.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
  }
  console.log("\n===== " + c.nombre + " =====");
  if (error) { console.log("ERROR: " + error); continue; }
  const prom = tiempos.reduce((a, b) => a + b, 0) / tiempos.length;
  console.log("segundos: " + tiempos.map((t) => t.toFixed(1)).join(", ") + " | promedio " + prom.toFixed(1));
  console.log("--- ejemplo («Hola, ¿cuánto cuesta un corte?») ---\n" + ejemplo);
}
