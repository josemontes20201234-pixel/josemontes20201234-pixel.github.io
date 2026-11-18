// Leo, el asistente de IA de Meraki Barbershop 🦁💈
// Cerebro (Claude) + citas (Firestore) + canales de Meta (WhatsApp, Instagram, Messenger).

const MODELO = "claude-sonnet-5-5";
const FS_BASE = "https://firestore.googleapis.com/v1/projects/meraki-barbershop/databases/(default)/documents";
const FS_KEY = "AIzaSyCysp_Pr9o-LYM5td9wOGLNNvsSKaEx2MQ"; // llave web pública de Firebase (las reglas protegen los datos)
// [nombre, precio, qué incluye]. Las descripciones salen de la lista de precios de la pared.
const SERVICIOS = [
  ["Corte clásico", 3.5, "corte a tijera o máquina, acabado limpio y perfilado de patillas"],
  ["Corte moderno", 4, "degradados, cortes a cero, técnicas de tendencia y acabado con producto"],
  ["Combo el patrón", 5, "corte moderno o clásico, perfilado de cejas y aplicación de tónico refrescante"],
  ["Servicio full detalle", 6, "corte moderno o clásico, barba perfilada con navaja y toalla tibia de limpieza"],
  ["Diseño de barba el patrón", 3.5, "diseño y definición de barba"],
  ["Perfilado express", 2, "perfilado rápido"],
  ["Ritual Meraki Spa", 5, "servicio de cuidado y relajación; si piden más detalle, Jose se lo explica"],
];
const HORAS = [6, 7, 8, 9, 10, 11, 13, 14, 15, 16]; // bloques de una hora; 12 a 1 es almuerzo
const DIAS_ADELANTE = 14;
const DL = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const SV_MS = 6 * 3600e3; // El Salvador es UTC-6 todo el año

/* ---------- fechas ---------- */
const ymdSV = (t) => new Date(t - SV_MS).toISOString().slice(0, 10);
const instante = (f, h) => new Date(f + "T" + String(h).padStart(2, "0") + ":00:00-06:00");
const diaSemana = (f) => new Date(f + "T12:00:00-06:00").getUTCDay();
const hTxt = (h) => (h % 12 || 12) + ":00 " + (h < 12 ? "a. m." : "p. m.");
const sumarDias = (f, n) => ymdSV(instante(f, 12).getTime() + n * 86400e3);

/* ---------- Firestore (reglas públicas de citas y ocupado) ---------- */
async function horasLibres(fecha) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { error: "Fecha inválida. Usá el formato AAAA-MM-DD." };
  const hoy = ymdSV(Date.now());
  if (fecha < hoy) return { error: "Esa fecha ya pasó." };
  if (fecha > sumarDias(hoy, DIAS_ADELANTE)) return { error: "Solo se puede apartar hasta " + DIAS_ADELANTE + " días adelante." };
  if (diaSemana(fecha) === 1) return { libres: [], nota: "Los lunes Meraki está cerrado." };
  const r = await fetch(FS_BASE + ":runQuery?key=" + FS_KEY, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "ocupado" }],
        where: { compositeFilter: { op: "AND", filters: [
          { fieldFilter: { field: { fieldPath: "cuando" }, op: "GREATER_THAN_OR_EQUAL", value: { timestampValue: instante(fecha, 0).toISOString() } } },
          { fieldFilter: { field: { fieldPath: "cuando" }, op: "LESS_THAN", value: { timestampValue: instante(sumarDias(fecha, 1), 0).toISOString() } } },
        ] } },
      },
    }),
  });
  if (!r.ok) return { error: "No pude revisar la agenda ahora mismo." };
  const filas = await r.json();
  const ocupadas = new Set(
    filas.filter((x) => x.document).map((x) => x.document.name.split("/").pop())
  );
  const minimo = Date.now() + 3600e3; // mínimo una hora de aviso
  const libres = HORAS.filter((h) => !ocupadas.has(fecha + "_" + String(h).padStart(2, "0")) && instante(fecha, h).getTime() >= minimo);
  return { fecha, dia: DL[diaSemana(fecha)], libres: libres.map((h) => ({ hora: h, texto: hTxt(h) })) };
}

async function apartarCita({ fecha, hora, nombre, tel, servicio, nota }) {
  hora = Number(hora);
  nombre = String(nombre || "").trim();
  tel = String(tel || "").replace(/\D/g, "").replace(/^503/, "");
  nota = String(nota || "").slice(0, 180);
  const serv = SERVICIOS.find((s) => s[0].toLowerCase() === String(servicio || "").toLowerCase());
  if (!serv) return { error: "Servicio no válido. Opciones: " + SERVICIOS.map((s) => s[0]).join(", ") };
  if (nombre.length < 2 || nombre.length > 50) return { error: "Falta el nombre del cliente." };
  if (!/^[67]\d{7}$/.test(tel)) return { error: "El WhatsApp debe tener 8 dígitos y empezar con 6 o 7." };
  if (!HORAS.includes(hora)) return { error: "Esa hora no es de atención." };
  const dispo = await horasLibres(fecha);
  if (dispo.error) return dispo;
  if (!dispo.libres.some((x) => x.hora === hora)) return { error: "Esa hora ya no está libre.", libres: dispo.libres };
  const id = fecha + "_" + String(hora).padStart(2, "0");
  const cuando = { timestampValue: instante(fecha, hora).toISOString() };
  const s = (v) => ({ stringValue: v });
  const r = await fetch(FS_BASE + ":commit?key=" + FS_KEY, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ writes: [
      {
        update: { name: "projects/meraki-barbershop/databases/(default)/documents/citas/" + id, fields: { nombre: s(nombre), tel: s(tel), servicio: s(serv[0]), nota: s(nota), cuando } },
        updateTransforms: [{ fieldPath: "creado", setToServerValue: "REQUEST_TIME" }],
        currentDocument: { exists: false },
      },
      {
        update: { name: "projects/meraki-barbershop/databases/(default)/documents/ocupado/" + id, fields: { cuando } },
        currentDocument: { exists: false },
      },
    ] }),
  });
  if (!r.ok) return { error: r.status === 409 ? "Esa hora se acaba de ocupar." : "No se pudo guardar la cita (" + r.status + ")." };
  return { ok: true, resumen: serv[0] + " · " + DL[diaSemana(fecha)] + " " + fecha + " a las " + hTxt(hora) + " · " + nombre + " · " + tel, precio: serv[1] };
}

/* ---------- cerebro de Leo ---------- */
function sistema(env, canal) {
  const hoy = ymdSV(Date.now());
  const ahora = new Date(Date.now() - SV_MS);
  return [
    "Sos Leo, el asistente de IA de Meraki Barbershop 🦁💈. Hablás en español salvadoreño con voseo (vos, tenés, vení), con estilo cálido, seguro y premium, sin exagerar con emojis (máximo 2 por mensaje). Mensajes cortos, como en WhatsApp.",
    "En el primer mensaje de una conversación te presentás así: «Hola, soy Leo, el asistente de IA de Meraki Barbershop 🦁💈». Nunca fingís ser una persona. Si te preguntan, decís que sos una IA y que Jose, el barbero y dueño, atiende en persona.",
    "",
    "DATOS DEL NEGOCIO (no inventés nada fuera de esto):",
    "- Meraki Barbershop, barbería premium en Apopa, San Salvador, El Salvador. Dueño y barbero: Jose.",
    "- Horario: martes a domingo, de 6:00 a. m. a 5:00 p. m. Lunes cerrado. Almuerzo de 12:00 a 1:00 p. m. (no hay citas a esa hora).",
    "- Citas de una hora. Se pueden apartar hasta " + DIAS_ADELANTE + " días adelante y con al menos una hora de aviso.",
    "- Servicios y precios (con lo que incluye cada uno; explicalo con tus palabras, de forma profesional, sin agregar nada que no esté acá):",
    ...SERVICIOS.map((s) => "  • " + s[0] + " $" + s[1].toFixed(2) + ": " + s[2] + "."),
    "- Se paga en efectivo o con tarjeta (cobro por tap en el teléfono).",
    "- WhatsApp del negocio: 6061-8603.",
    "- Tarjeta Meraki: tarjeta de fidelización con sellos por visita. Si preguntan por premios o sellos, decí que Jose se los revisa en persona.",
    env.UBICACION ? "- Ubicación: " + env.UBICACION : "- Ubicación exacta: todavía no la tenés; decí que está en Apopa y que Jose les manda la ubicación por WhatsApp (6061-8603).",
    "",
    "CÓMO APARTAR UNA CITA:",
    "1) Preguntá qué servicio quiere, para qué día, y mostrá solo horas libres usando la herramienta horas_libres (nunca adivinés disponibilidad).",
    "2) Pedí nombre y número de WhatsApp de 8 dígitos si aún no los tenés" + (canal === "whatsapp" ? " (en WhatsApp ya conocés el número de quien escribe, pero confirmalo)." : "."),
    "3) Antes de guardar, repetí servicio, día, hora y nombre y esperá un «sí». Luego usá apartar_cita.",
    "4) Si no se puede, ofrecé otras horas. Para cancelar o cambiar una cita, usá avisar_a_jose (todavía no podés cancelar vos).",
    "",
    "REGLAS: no cierres todos los mensajes ofreciendo una cita; ofrecela solo cuando la persona muestre interés en venir, pregunte por disponibilidad o ya te haya preguntado precios y servicios, y no la repitas si ya la ofreciste. No inventés precios, promociones ni horarios. No des consejos médicos. Si hay un reclamo, algo que no sabés, o piden hablar con una persona, usá avisar_a_jose y decí que Jose les responde pronto. Si el mensaje no tiene que ver con la barbería, respondé amable y volvé al tema.",
    "",
    "Hoy es " + DL[ahora.getUTCDay()] + " " + hoy + ", y son las " + String(ahora.getUTCHours()).padStart(2, "0") + ":" + String(ahora.getUTCMinutes()).padStart(2, "0") + " (hora de El Salvador).",
  ].join("\n");
}

const HERRAMIENTAS = [
  {
    name: "horas_libres",
    description: "Devuelve las horas libres de un día (formato AAAA-MM-DD).",
    input_schema: { type: "object", properties: { fecha: { type: "string" } }, required: ["fecha"] },
  },
  {
    name: "apartar_cita",
    description: "Aparta una cita confirmada. Usala solo después de que el cliente confirmó con un sí.",
    input_schema: {
      type: "object",
      properties: {
        fecha: { type: "string", description: "AAAA-MM-DD" },
        hora: { type: "integer", description: "Hora en formato 24 h: 6,7,8,9,10,11,13,14,15,16" },
        nombre: { type: "string" },
        tel: { type: "string", description: "WhatsApp de 8 dígitos" },
        servicio: { type: "string", enum: SERVICIOS.map((s) => s[0]) },
        nota: { type: "string" },
      },
      required: ["fecha", "hora", "nombre", "tel", "servicio"],
    },
  },
  {
    name: "avisar_a_jose",
    description: "Le manda un aviso a Jose (cancelaciones, cambios, reclamos o dudas que no podés resolver).",
    input_schema: { type: "object", properties: { motivo: { type: "string" }, contacto: { type: "string" } }, required: ["motivo"] },
  },
];

async function llamarClaude(env, mensajes, canal) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": env.LEO_ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODELO, max_tokens: 700, system: sistema(env, canal), tools: HERRAMIENTAS, messages: mensajes }),
  });
  if (!r.ok) throw new Error("Claude " + r.status + ": " + (await r.text()).slice(0, 200));
  return r.json();
}

async function ejecutar(env, nombre, input, ctx) {
  if (nombre === "horas_libres") return horasLibres(input.fecha);
  if (nombre === "apartar_cita") {
    const r = await apartarCita(input);
    if (r.ok) await avisarJose(env, "📅 Nueva cita por Leo (" + ctx.canal + "): " + r.resumen);
    return r;
  }
  if (nombre === "avisar_a_jose") {
    await avisarJose(env, "🦁 Leo te avisa (" + ctx.canal + "): " + input.motivo + (input.contacto ? " · Contacto: " + input.contacto : "") + " · Cliente: " + ctx.usuario);
    return { ok: true };
  }
  return { error: "Herramienta desconocida." };
}

// Quita los bloques de "pensamiento" (están atados a una conversación y no deben guardarse).
function limpiar(hist) {
  const out = [];
  for (const m of hist) {
    if (typeof m.content === "string") { out.push(m); continue; }
    const c = (m.content || []).filter((b) => b.type !== "thinking" && b.type !== "redacted_thinking");
    if (c.length) out.push({ role: m.role, content: c });
  }
  return out;
}

// Corre la conversación: historial en KV + ciclo de herramientas.
async function responder(env, canal, usuario, texto) {
  const clave = "h:" + canal + ":" + usuario;
  let hist = [];
  try { hist = limpiar(JSON.parse((await env.LEO.get(clave)) || "[]")); } catch {}
  hist.push({ role: "user", content: texto });
  let salida = "";
  for (let i = 0; i < 5; i++) {
    let res;
    try { res = await llamarClaude(env, hist, canal); }
    catch (e) {
      if (!/Claude 400/.test(String(e.message)) || hist.length <= 1) throw e;
      hist = [{ role: "user", content: texto }]; // el historial guardado no sirve: se empieza limpio
      res = await llamarClaude(env, hist, canal);
    }
    hist.push({ role: "assistant", content: res.content });
    const usos = res.content.filter((b) => b.type === "tool_use");
    salida = res.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim() || salida;
    if (!usos.length) break;
    const resultados = [];
    for (const u of usos) {
      let out;
      try { out = await ejecutar(env, u.name, u.input, { canal, usuario }); } catch (e) { out = { error: String(e.message || e) }; }
      resultados.push({ type: "tool_result", tool_use_id: u.id, content: JSON.stringify(out) });
    }
    hist.push({ role: "user", content: resultados });
  }
  // Se guardan solo los últimos mensajes y se empieza siempre en un turno de texto del usuario.
  let corte = limpiar(hist).slice(-24);
  while (corte.length && !(corte[0].role === "user" && typeof corte[0].content === "string")) corte.shift();
  await env.LEO.put(clave, JSON.stringify(corte), { expirationTtl: 7 * 86400 });
  return salida || "Dame un momento, por favor 🙏";
}

/* ---------- Meta: envío y aviso a Jose ---------- */
async function enviarWhatsApp(env, para, texto) {
  if (!env.WA_TOKEN || !env.WA_PHONE_ID) return false;
  const r = await fetch("https://graph.facebook.com/v23.0/" + env.WA_PHONE_ID + "/messages", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + env.WA_TOKEN },
    body: JSON.stringify({ messaging_product: "whatsapp", to: para, type: "text", text: { body: texto } }),
  });
  return r.ok;
}
/* Diagnóstico sin datos de clientes (sólo horas, rutas y errores): se lee en /diag */
async function diag(env, clave, dato) {
  try { await env.LEO.put("diag:" + clave, JSON.stringify({ cuando: new Date().toISOString(), ...dato }), { expirationTtl: 30 * 86400 }); } catch {}
}

async function enviarMeta(env, canal, cuenta, para, texto) { // Instagram DM y Messenger
  const rutas = [];
  if (canal === "instagram" && env.META_IG_TOKEN) {
    const t = env.META_IG_TOKEN;
    // La llave del «inicio de sesión unificado» de Meta: se prueba por dónde acepta mandar y se recuerda la que sirvió
    rutas.push(
      { n: "fb-cuenta", u: "https://graph.facebook.com/v23.0/" + cuenta + "/messages", t },
      { n: "ig-cuenta", u: "https://graph.instagram.com/v23.0/" + cuenta + "/messages", t },
      { n: "fb-me", u: "https://graph.facebook.com/v23.0/me/messages", t },
      { n: "ig-me", u: "https://graph.instagram.com/v23.0/me/messages", t },
    );
  }
  if (env.META_PAGE_TOKEN) rutas.push({ n: "pagina", u: "https://graph.facebook.com/v23.0/me/messages", t: env.META_PAGE_TOKEN, pagina: true });
  if (!rutas.length) { await diag(env, "envio", { canal, ok: false, fallos: ["no hay llave para " + canal] }); return false; }
  let buena = null;
  try { buena = await env.LEO.get("ruta:" + canal); } catch {}
  rutas.sort((x, y) => (y.n === buena) - (x.n === buena));
  const fallos = [];
  for (const r of rutas) {
    const cuerpo = { recipient: { id: para }, message: { text: texto } };
    if (r.pagina) cuerpo.messaging_type = "RESPONSE";
    let res;
    try {
      res = await fetch(r.u, { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + r.t }, body: JSON.stringify(cuerpo) });
    } catch (e) { fallos.push(r.n + ": " + String(e).slice(0, 120)); continue; }
    if (res.ok) {
      if (r.n !== buena) { try { await env.LEO.put("ruta:" + canal, r.n); } catch {} }
      await diag(env, "envio", { canal, ruta: r.n, ok: true });
      return true;
    }
    let err = "";
    try { const j = await res.json(); err = j.error ? (j.error.code || "") + " " + (j.error.message || "") : ""; } catch {}
    fallos.push(r.n + ": " + res.status + " " + err.slice(0, 160));
  }
  await diag(env, "envio", { canal, ok: false, fallos });
  return false;
}

/* Revisa la llave de Instagram sin mostrarla (para /diag) */
async function revisarLlave(env) {
  const t = env.META_IG_TOKEN;
  if (!t) return { hay: false };
  const pedir = async (u) => {
    try {
      const r = await fetch(u, { headers: { authorization: "Bearer " + t } });
      const j = await r.json().catch(() => ({}));
      return r.ok ? { ok: true, j } : { ok: false, error: j.error ? (j.error.code || "") + " " + (j.error.message || "") : String(r.status) };
    } catch (e) { return { ok: false, error: String(e).slice(0, 120) }; }
  };
  const out = { hay: true, empieza: t.slice(0, 3) };
  // Para saber qué tipo de llave es y cuándo vence se pregunta como la app (id|secreto), sin mostrar nada
  const app = await pedir("https://graph.facebook.com/v23.0/app?fields=id,name");
  if (app.ok && env.META_APP_SECRET) {
    out.app = app.j.name;
    try {
      const r = await fetch("https://graph.facebook.com/v23.0/debug_token?input_token=" + encodeURIComponent(t) + "&access_token=" + encodeURIComponent(app.j.id + "|" + env.META_APP_SECRET));
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.data) {
        const x = j.data;
        out.tipo = x.type; out.valida = x.is_valid;
        out.vence = x.expires_at ? new Date(x.expires_at * 1000).toISOString() : "no vence";
        out.permisos = x.scopes || [];
      } else out.debug = j.error ? (j.error.code || "") + " " + (j.error.message || "") : String(r.status);
    } catch (e) { out.debug = String(e).slice(0, 120); }
  } else out.debug = app.ok ? "falta el secreto de la app" : app.error;
  const cuenta = env.IG_ID || "me";
  const fb = await pedir("https://graph.facebook.com/v23.0/" + cuenta + "?fields=id,username");
  out.facebook = fb.ok ? "sirve (" + (fb.j.username || fb.j.id || "?") + ")" : fb.error;
  const ig = await pedir("https://graph.instagram.com/v23.0/me?fields=user_id,username");
  out.instagram = ig.ok ? "sirve (" + (ig.j.username || ig.j.user_id || "?") + ")" : ig.error;
  // ¿Puede leer los mensajes directos? (sólo se cuenta, no se lee nada)
  const conv = await pedir("https://graph.facebook.com/v23.0/" + cuenta + "/conversations?platform=instagram&limit=5");
  out.mensajes_directos = conv.ok ? "sirve (" + ((conv.j.data || []).length) + " conversaciones vistas)" : conv.error;
  // Avisos que Meta le manda a Leo (configurados en la app), leído como la app
  if (app.ok && env.META_APP_SECRET) {
    try {
      const r = await fetch("https://graph.facebook.com/v23.0/" + app.j.id + "/subscriptions?access_token=" + encodeURIComponent(app.j.id + "|" + env.META_APP_SECRET));
      const j = await r.json().catch(() => ({}));
      out.avisos_app = r.ok ? (j.data || []).map((x) => ({ objeto: x.object, activo: x.active, campos: (x.fields || []).map((f) => f.name) })) : (j.error ? (j.error.code || "") + " " + (j.error.message || "") : String(r.status));
    } catch (e) { out.avisos_app = String(e).slice(0, 120); }
  }
  // ¿La cuenta de Instagram le manda sus avisos a la app?
  const sa = await pedir("https://graph.facebook.com/v23.0/" + cuenta + "/subscribed_apps");
  out.cuenta_suscrita = sa.ok ? (sa.j.data || []).map((x) => ({ app: x.name || x.id, campos: x.subscribed_fields || [] })) : sa.error;
  return out;
}

async function avisarJose(env, texto) {
  const aviso = "[" + new Date().toISOString() + "] " + texto;
  try { await env.LEO.put("aviso:" + Date.now(), aviso, { expirationTtl: 30 * 86400 }); } catch {}
  if (env.JOSE_WA) { try { await enviarWhatsApp(env, env.JOSE_WA, texto); } catch {} }
}

async function firmaCon(secreto, cuerpo) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secreto), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const f = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(cuerpo));
  return "sha256=" + [...new Uint8Array(f)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function firmaValida(env, request, cuerpo) {
  const h = request.headers.get("x-hub-signature-256") || "";
  for (const s of [env.META_APP_SECRET, env.IG_APP_SECRET]) { // sin secreto no se acepta nada
    if (s && h.length === 71 && (await firmaCon(s, cuerpo)) === h) return true;
  }
  return false;
}

async function procesarMeta(env, cuerpo) {
  const dato = JSON.parse(cuerpo);
  const tareas = [];
  await diag(env, "recibido", { tipo: dato.object, entradas: (dato.entry || []).length, mensajes: (dato.entry || []).reduce((n, e) => n + (e.messaging || []).length + (e.changes || []).length, 0) });
  for (const e of dato.entry || []) {
    // WhatsApp
    for (const c of e.changes || []) {
      for (const m of (c.value && c.value.messages) || []) {
        if (m.type !== "text") { tareas.push(enviarWhatsApp(env, m.from, "Por ahora solo leo mensajes de texto 🙏 Escribime tu consulta y con gusto te ayudo.")); continue; }
        tareas.push(responder(env, "whatsapp", m.from, m.text.body).then((t) => enviarWhatsApp(env, m.from, t)));
      }
    }
    // Instagram y Messenger
    for (const ev of e.messaging || []) {
      if (!ev.message || ev.message.is_echo || !ev.message.text) continue;
      if (ev.sender && ev.sender.id === e.id) continue; // lo que manda la misma cuenta del negocio
      const canal = dato.object === "instagram" ? "instagram" : "messenger";
      const cuenta = (ev.recipient && ev.recipient.id) || e.id;
      tareas.push(responder(env, canal, ev.sender.id, ev.message.text).then((t) => enviarMeta(env, canal, cuenta, ev.sender.id, t)));
    }
  }
  await Promise.allSettled(tareas);
}

/* ---------- página de prueba (solo mientras PROBAR=1) ---------- */
const PAGINA_PRUEBA = `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Probar a Leo</title>
<style>body{margin:0;background:#0b0b0c;color:#f3ead6;font:16px system-ui;display:flex;flex-direction:column;height:100dvh}
h1{margin:0;padding:14px 16px;font-size:18px;color:#d4af37;border-bottom:1px solid #2a2a2a}
#c{flex:1;overflow:auto;padding:12px 16px;display:flex;flex-direction:column;gap:8px}
.m{max-width:85%;padding:10px 12px;border-radius:14px;line-height:1.4;white-space:pre-wrap}
.u{align-self:flex-end;background:#d4af37;color:#111}.l{align-self:flex-start;background:#1c1c1e}
form{display:flex;gap:8px;padding:10px 16px;border-top:1px solid #2a2a2a}
input{flex:1;padding:12px;border-radius:12px;border:1px solid #333;background:#151516;color:inherit;font:inherit}
button{padding:12px 16px;border:0;border-radius:12px;background:#d4af37;font-weight:700}</style>
<h1>🦁 Probar a Leo (sin Meta)</h1><div id="c"></div>
<form id="f"><input id="t" placeholder="Escribile a Leo…" autocomplete="off"><button>Enviar</button></form>
<script>
const id=(()=>{try{let v=localStorage.leo_id;if(!v){v=Math.random().toString(36).slice(2);localStorage.leo_id=v}return v}catch(e){return"x"+Math.random()}})();
const c=document.getElementById("c");
const add=(t,k)=>{const d=document.createElement("div");d.className="m "+k;d.textContent=t;c.appendChild(d);c.scrollTop=c.scrollHeight;return d};
document.getElementById("f").onsubmit=async e=>{e.preventDefault();const i=document.getElementById("t"),t=i.value.trim();if(!t)return;i.value="";add(t,"u");const w=add("…","l");
try{const r=await fetch("/probar/chat",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({id,texto:t})});const j=await r.json();w.textContent=j.respuesta||j.error||"(sin respuesta)"}catch(x){w.textContent="Error de conexión"}};
add("Escribí como si fueras un cliente. Por ejemplo: «hola, cuánto cuesta un corte?»","l");
</script></html>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json; charset=utf-8" } });

    if (url.pathname === "/salud") return json({ ok: true, quien: "Leo", negocio: "Meraki Barbershop", cerebro: !!env.LEO_ANTHROPIC_KEY, meta: !!env.META_APP_SECRET });

    // Diagnóstico para revisar desde GitHub (sin llaves ni mensajes de clientes)
    if (url.pathname === "/diag") {
      if (!env.META_APP_SECRET || request.headers.get("x-diag") !== env.META_APP_SECRET) return new Response("No autorizado", { status: 403 });
      const leer = async (k) => { try { return JSON.parse((await env.LEO.get(k)) || "null"); } catch { return null; } };
      return json({
        claves: { cerebro: !!env.LEO_ANTHROPIC_KEY, secreto_meta: !!env.META_APP_SECRET, secreto_ig: !!env.IG_APP_SECRET, llave_instagram: !!env.META_IG_TOKEN, llave_pagina: !!env.META_PAGE_TOKEN, whatsapp: !!env.WA_TOKEN },
        ultimo_recibido: await leer("diag:recibido"),
        ultimo_envio: await leer("diag:envio"),
        firmas_rechazadas: await leer("diag:firma"),
        ruta_instagram: await env.LEO.get("ruta:instagram"),
        llave: await revisarLlave(env),
      });
    }

    // Suscribir la cuenta de Instagram para que Meta le mande los mensajes a Leo (protegido)
    if (url.pathname === "/suscribir" && request.method === "POST") {
      if (!env.META_APP_SECRET || request.headers.get("x-diag") !== env.META_APP_SECRET) return new Response("No autorizado", { status: 403 });
      if (!env.META_IG_TOKEN) return json({ ok: false, error: "todavía no hay llave de Instagram" });
      const cuenta = env.IG_ID || "me";
      const intentos = [];
      for (const campos of ["messages,comments", "messages"]) {
        try {
          const r = await fetch("https://graph.facebook.com/v23.0/" + cuenta + "/subscribed_apps?subscribed_fields=" + campos, { method: "POST", headers: { authorization: "Bearer " + env.META_IG_TOKEN } });
          const j = await r.json().catch(() => ({}));
          intentos.push({ campos, ok: r.ok, respuesta: r.ok ? j : (j.error ? (j.error.code || "") + " " + (j.error.message || "") : String(r.status)) });
          if (r.ok) break;
        } catch (e) { intentos.push({ campos, ok: false, respuesta: String(e).slice(0, 120) }); }
      }
      return json({ intentos });
    }

    // Página y endpoint de prueba (límite de 60 mensajes por día para cuidar el gasto)
    if (env.PROBAR === "1" && url.pathname === "/probar") return new Response(PAGINA_PRUEBA, { headers: { "content-type": "text/html; charset=utf-8" } });
    if (env.PROBAR === "1" && url.pathname === "/probar/chat" && request.method === "POST") {
      if (!env.LEO_ANTHROPIC_KEY) return json({ error: "Falta la clave de Claude en el servidor." }, 500);
      const dia = "cupo:" + ymdSV(Date.now());
      const usados = Number((await env.LEO.get(dia)) || 0);
      if (usados >= 60) return json({ respuesta: "Hoy se llegó al límite de pruebas. Seguimos mañana 🦁" });
      await env.LEO.put(dia, String(usados + 1), { expirationTtl: 172800 });
      try {
        const { id, texto } = await request.json();
        const t = String(texto || "").slice(0, 800);
        if (!t) return json({ error: "Mensaje vacío" }, 400);
        return json({ respuesta: await responder(env, "prueba", String(id || "x").slice(0, 40), t) });
      } catch (e) { return json({ error: String(e.message || e).slice(0, 300) }, 500); }
    }

    // Webhook de Meta
    if (url.pathname === "/webhook") {
      if (request.method === "GET") {
        const ok = env.META_VERIFY_TOKEN && url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === env.META_VERIFY_TOKEN;
        return ok ? new Response(url.searchParams.get("hub.challenge")) : new Response("No autorizado", { status: 403 });
      }
      if (request.method === "POST") {
        const cuerpo = await request.text();
        if (!(await firmaValida(env, request, cuerpo))) {
          let n = 0;
          try { n = Number(JSON.parse((await env.LEO.get("diag:firma")) || "{}").veces || 0); } catch {}
          await diag(env, "firma", { rechazada: true, veces: n + 1 });
          return new Response("Firma inválida", { status: 403 });
        }
        try { await procesarMeta(env, cuerpo); } catch (e) { console.log("webhook error", String(e)); }
        return new Response("ok");
      }
    }

    return new Response("Hola, soy Leo, el asistente de IA de Meraki Barbershop 🦁💈", { headers: { "content-type": "text/plain; charset=utf-8" } });
  },
};
