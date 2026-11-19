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
// Precios nuevos desde el martes 15 de diciembre de 2026 (aprobados por Jose el 18 nov). Valen según el DÍA DE LA CITA.
// Antes va la «Semana Aniversario Meraki» (8 al 13 de diciembre): precios de siempre + boleto para rifar un full detalle.
const CAMBIO_PRECIOS = "2026-12-15";
const ANIVERSARIO = { desde: "2026-12-08", hasta: "2026-12-13" };
const SERVICIOS_NUEVOS = [
  ["Corte clásico", 4, "corte a tijera o máquina, acabado limpio y perfilado de patillas"],
  ["Corte moderno", 5, "degradados, cortes a cero, técnicas de tendencia y acabado con producto"],
  ["Combo el patrón", 6.5, "corte moderno o clásico, perfilado de cejas y aplicación de tónico refrescante"],
  ["Servicio full detalle", 8, "corte moderno o clásico, barba perfilada con navaja y toalla tibia de limpieza"],
  ["Diseño de barba Meraki", 4.5, "diseño y definición de barba"],
  ["Perfilado express", 2.5, "perfilado rápido"],
  ["Ritual Meraki Spa", 6.5, "servicio de cuidado y relajación; si piden más detalle, Jose se lo explica"],
];
const preciosPara = (fecha) => (String(fecha) >= CAMBIO_PRECIOS ? SERVICIOS_NUEVOS : SERVICIOS);
const buscarServicio = (lista, nombre) => {
  const n = String(nombre || "").toLowerCase().trim();
  return lista.find((s) => s[0].toLowerCase() === n) || (n.startsWith("diseño de barba") ? lista.find((s) => s[0].toLowerCase().startsWith("diseño de barba")) : null);
};
const listaPrecios = (lista) => lista.map((s) => "  • " + s[0] + " $" + s[1].toFixed(2) + ": " + s[2] + ".");
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

// Citas que ya apartó cada cliente (KV). Así Leo siempre sabe que el cliente ya tiene cita, aunque la plática sea larga,
// y no la aparta dos veces (pasó: al pedir «comprobante» Leo volvió a intentar apartarla, vio la hora ocupada y creyó que no estaba hecha).
async function citasDelCliente(env, ctx) {
  if (!ctx || !ctx.usuario) return [];
  try {
    const l = JSON.parse((await env.LEO.get("citas:" + ctx.canal + ":" + ctx.usuario)) || "[]");
    const hoy = ymdSV(Date.now());
    return (Array.isArray(l) ? l : []).filter((c) => c && c.fecha >= hoy);
  } catch { return []; }
}

async function apartarCita({ fecha, hora, nombre, tel, servicio, nota, otra }, env, ctx) {
  hora = Number(hora);
  const previas = await citasDelCliente(env, ctx);
  const misma = previas.find((c) => c.fecha === fecha && Number(c.hora) === hora);
  if (misma) return { ok: true, ya_estaba_apartada: true, resumen: misma.resumen, precio: misma.precio };
  if (previas.length && !otra) return { error: "Este cliente ya tiene cita apartada: " + previas.map((c) => c.resumen).join("; ") + ". Preguntale si quiere OTRA cita además de esa (si dice que sí, usá otra=true). Si quiere cambiarla o cancelarla, usá avisar_a_jose." };
  nombre = String(nombre || "").trim();
  tel = String(tel || "").replace(/\D/g, "").replace(/^503/, "");
  nota = String(nota || "").slice(0, 180);
  const serv = buscarServicio(preciosPara(fecha), servicio); // el precio es el del día de la cita
  if (!serv) return { error: "Servicio no válido. Opciones: " + preciosPara(fecha).map((s) => s[0]).join(", ") };
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
  const resumen = serv[0] + " · " + DL[diaSemana(fecha)] + " " + fecha + " a las " + hTxt(hora) + " · " + nombre + " · " + tel;
  if (env && ctx && ctx.usuario) { // se anota para este cliente; se borra sola un día después de la última cita
    const lista = [...previas, { fecha, hora, resumen, precio: serv[1] }];
    const hasta = Math.max(...lista.map((c) => instante(c.fecha, Number(c.hora)).getTime())) + 86400e3;
    try { await env.LEO.put("citas:" + ctx.canal + ":" + ctx.usuario, JSON.stringify(lista), { expirationTtl: Math.max(3600, Math.round((hasta - Date.now()) / 1000)) }); } catch {}
  }
  return { ok: true, resumen, precio: serv[1] };
}

/* ---------- cerebro de Leo ---------- */
function sistema(env, canal, extra = "") {
  const hoy = ymdSV(Date.now());
  const ahora = new Date(Date.now() - SV_MS);
  const lineas = [
    "Sos Leo, el asistente de IA de Meraki Barbershop 🦁💈. Hablás en español salvadoreño con voseo (vos, tenés, vení), con estilo cálido, seguro y premium.",
    "",
    "CÓMO ESCRIBIR (es un chat; a la gente le aburre mucha letra):",
    "- Cada respuesta va en 1 o 2 mensajitos cortos. Separá los mensajitos con una línea en blanco. Nunca párrafos largos.",
    "- Si das una lista, la frase que la presenta va en el mismo mensajito que la lista, sin línea en blanco entre ellas (nunca mandés la frase sola).",
    "- Andá directo a la respuesta: no gastés un mensajito en relleno (como «te lo repito por acá» o «claro, con gusto»).",
    "- Sin negritas, asteriscos ni títulos con #: el chat los muestra tal cual.",
    "- Usá de 2 a 4 emojis con estilo en toda la respuesta (por ejemplo 💈 ✂️ 🔥 ✨ 📅 📍 💳 🦁), no en cada línea.",
    "- Para listas (precios, servicios, horas) poné una cosa por línea con un emoji al inicio, por ejemplo «💈 Corte clásico — $8.00». Si piden el detalle de un servicio, explicalo en una o dos líneas.",
    "- Si ayuda, al final podés poner botones para que el cliente toque, en una línea aparte con este formato exacto: [[botones: 💈 Precios | 📅 Agendar | 📍 Ubicación]]. Máximo 4 botones, cada uno de pocas palabras. Usalos en el saludo y cuando des a escoger (horas libres, servicios, sí/no); no en todos los mensajes.",
    "En el primer mensaje de una conversación te presentás así: «Hola, soy Leo, el asistente de IA de Meraki Barbershop 🦁💈». Nunca fingís ser una persona. Si te preguntan, decís que sos una IA y que Jose, el barbero y dueño, atiende en persona.",
    "",
    "DATOS DEL NEGOCIO (no inventés nada fuera de esto):",
    "- Meraki Barbershop, barbería premium en Apopa, San Salvador, El Salvador. Dueño y barbero: Jose.",
    "- Horario: martes a domingo, de 6:00 a. m. a 5:00 p. m. Lunes cerrado. Almuerzo de 12:00 a 1:00 p. m. (no hay citas a esa hora).",
    "- Citas de una hora. Se pueden apartar hasta " + DIAS_ADELANTE + " días adelante y con al menos una hora de aviso.",
    "- Servicios y precios (con lo que incluye cada uno; explicalo con tus palabras, de forma profesional, sin agregar nada que no esté acá):",
    ...listaPrecios(preciosPara(hoy)),
    "- Se paga en efectivo o con tarjeta (cobro por tap en el teléfono).",
    "- WhatsApp del negocio: 6061-8603.",
    "- Tarjeta Meraki: tarjeta de fidelización con sellos por visita. Si preguntan por premios o sellos, decí que Jose se los revisa en persona.",
    env.UBICACION ? "- Ubicación: " + env.UBICACION : "- Ubicación exacta: todavía no la tenés; decí que está en Apopa y que Jose les manda la ubicación por WhatsApp (6061-8603).",
    "",
    "CÓMO APARTAR UNA CITA:",
    "1) Preguntá qué servicio quiere y para qué día. Cada vez que vayás a mencionar horas libres, usá la herramienta horas_libres en ese momento, aunque ya la hayas usado antes en la conversación (la agenda cambia y la regla de una hora de aviso también). Nunca digás horas libres de memoria ni de mensajes anteriores.",
    "2) Pedí nombre y número de WhatsApp de 8 dígitos si aún no los tenés (si el cliente manda un número de 8 dígitos que empieza con 6 o 7, ese es su WhatsApp)" + (canal === "whatsapp" ? " (en WhatsApp ya conocés el número de quien escribe, pero confirmalo)." : "."),
    "3) Antes de guardar, repetí servicio, día, hora y nombre y esperá un «sí». Luego usá apartar_cita.",
    "4) Si no se puede, ofrecé otras horas. Para cancelar o cambiar una cita, usá avisar_a_jose (todavía no podés cancelar vos).",
    "5) Comprobante: vos no podés mandar mensajes por WhatsApp, correos ni archivos; nunca lo prometás. Si piden comprobante, deciles que este chat es su confirmación (pueden tomarle captura) y repetiles servicio, día, hora, nombre y precio.",
    "",
    "AUDIOS, FOTOS Y STICKERS:",
    "- Si una parte del mensaje empieza con «🎤 Audio:», es un audio del cliente pasado a texto automáticamente (puede traer alguna palabra mal). Contestá normal, como si lo hubieras escuchado, sin decir que lo transcribiste. Si no queda claro algo importante (día, hora, nombre o número), preguntá solo eso.",
    "- «[Audio que no se pudo escuchar]»: disculpate corto y pedile que te lo escriba o que lo mande otra vez.",
    "- «[Foto]», «[Video]» o «[Publicación compartida]»: vos no podés verlas, pero Jose sí (ya se le avisó; no usés avisar_a_jose para eso). Decilo en pocas palabras y seguí con lo que el cliente necesita; si parece que quiere ese corte o estilo, preguntá para qué día lo quiere.",
    "- «[Sticker]» solo: contestá con un mensajito muy corto y amable, sin preguntas. «[Te mencionó en su historia]»: agradecé con cariño en un mensajito corto.",
    "",
    "DATOS PERSONALES: si alguien pide borrar sus datos (por ejemplo «BORRAR MIS DATOS»), usá avisar_a_jose con el motivo «Pide borrar sus datos» y decile que se borran en un máximo de 30 días y que le confirmamos por este mismo medio. Si preguntan qué hacemos con sus datos, explicalo corto y pasales la política: https://josemontes20201234-pixel.github.io/privacidad/",
    "",
    "REGLAS: no cierres todos los mensajes ofreciendo una cita; ofrecela solo cuando la persona muestre interés en venir, pregunte por disponibilidad o ya te haya preguntado precios y servicios, y no la repitas si ya la ofreciste. Si el cliente dice que te escribe después o se despide, despedite en un solo mensajito corto y amable, sin presionar (no le digás que las horas se van a ocupar) y sin revisar la agenda. No inventés precios, promociones ni horarios. No digás la hora actual a menos que te la pregunten. No des consejos médicos. Si hay un reclamo, algo que no sabés, o piden hablar con una persona, usá avisar_a_jose y decí que Jose les responde pronto. Si el mensaje no tiene que ver con la barbería, respondé amable y volvé al tema.",
    "",
    "Hoy es " + DL[ahora.getUTCDay()] + " " + hoy + ", y son las " + (ahora.getUTCHours() % 12 || 12) + ":" + String(ahora.getUTCMinutes()).padStart(2, "0") + (ahora.getUTCHours() < 12 ? " a. m." : " p. m.") + " (hora de El Salvador).",
  ];
  const avisos = [];
  // Desde que se puede apartar para el 15 de diciembre (14 días antes) Leo necesita saber los precios nuevos
  if (hoy < CAMBIO_PRECIOS && hoy >= ymdSV(Date.parse(CAMBIO_PRECIOS + "T18:00:00Z") - DIAS_ADELANTE * 86400e3)) {
    if (hoy >= ANIVERSARIO.desde && hoy <= ANIVERSARIO.hasta) avisos.push(
      "SEMANA ANIVERSARIO MERAKI (del martes 8 al domingo 13 de diciembre): Meraki cumple un año en su local. Esta semana se cobran los precios de siempre y cada cliente que venga recibe un boleto para la rifa de un Servicio full detalle gratis el domingo 13. Desde el martes 15 de diciembre entran los precios nuevos (abajo). Contalo con alegría cuando hablen de precios o aparten cita esta semana, sin repetirlo en cada mensaje.");
    avisos.push("Precios para citas del martes 15 de diciembre en adelante (" + (hoy >= ANIVERSARIO.desde ? "ya se pueden anunciar" : "todavía no los anunciés; usalos solo si alguien aparta para esas fechas") + "):", ...listaPrecios(SERVICIOS_NUEVOS));
  }
  const hora = lineas.pop() + (avisos.length ? "\n" + avisos.join("\n") : "") + (extra ? "\n" + extra : "");
  return [
    { type: "text", text: lineas.join("\n"), cache_control: { type: "ephemeral" } }, // fijo: se reutiliza entre mensajes
    { type: "text", text: hora },
  ];
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
        servicio: { type: "string", enum: [...new Set([...SERVICIOS, ...SERVICIOS_NUEVOS].map((s) => s[0]))] },
        nota: { type: "string" },
        otra: { type: "boolean", description: "true solo si el cliente ya tiene una cita y confirmó que quiere OTRA además de esa" },
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

async function llamarClaude(env, mensajes, canal, extra = "") {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": env.LEO_ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: env.LEO_MODELO || MODELO, max_tokens: 700, system: sistema(env, canal, extra), tools: HERRAMIENTAS, messages: mensajes,
      ...(env.LEO_PENSAR ? { thinking: { type: env.LEO_PENSAR } } : {}),
      ...(env.LEO_ESFUERZO ? { output_config: { effort: env.LEO_ESFUERZO } } : {}),
    }),
  });
  if (!r.ok) throw new Error("Claude " + r.status + ": " + (await r.text()).slice(0, 200));
  return r.json();
}

async function ejecutar(env, nombre, input, ctx) {
  if (nombre === "horas_libres") return horasLibres(input.fecha);
  if (nombre === "apartar_cita") {
    const r = await apartarCita(input, env, ctx);
    if (r.ok && !r.ya_estaba_apartada) await avisarJose(env, "📅 Nueva cita por Leo (" + ctx.canal + "): " + r.resumen + (ctx.alias ? " · " + ctx.alias : ""));
    return r;
  }
  if (nombre === "avisar_a_jose") {
    await avisarJose(env, "🦁 Leo te avisa (" + ctx.canal + "): " + input.motivo + (input.contacto ? " · Contacto: " + input.contacto : "") + " · Cliente: " + (ctx.alias || ctx.usuario));
    return { ok: true };
  }
  return { error: "Herramienta desconocida." };
}

// El historial se guarda solo con el texto de cada turno. Los resultados de herramientas (horas libres, etc.)
// se vuelven viejos rápido y Leo los reusaba en vez de revisar de nuevo; además pesan y lo hacen más lento.
function soloTexto(hist) {
  const out = [];
  for (const m of hist || []) {
    const t = String(typeof m.content === "string" ? m.content
      : (m.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n")).trim();
    if (!t || (m.role !== "user" && m.role !== "assistant")) continue;
    const prev = out[out.length - 1];
    if (prev && prev.role === m.role) prev.content += "\n\n" + t;
    else out.push({ role: m.role, content: t });
  }
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}

// Corre la conversación: historial en KV + ciclo de herramientas.
// Una plática dura el día (hora de El Salvador): al día siguiente Leo saluda y empieza de cero, como un CRM.
async function responder(env, canal, usuario, texto, alias = "") {
  const clave = "h:" + canal + ":" + usuario;
  const hoy = ymdSV(Date.now());
  let previo = [];
  try {
    const g = JSON.parse((await env.LEO.get(clave)) || "null");
    if (g && !Array.isArray(g) && g.dia === hoy) previo = soloTexto(g.hist); // la de otro día (o el formato viejo) no se usa
  } catch {}
  let hist = soloTexto([...previo, { role: "user", content: texto }]);
  const citas = await citasDelCliente(env, { canal, usuario });
  const extra = citas.length ? "Este cliente YA tiene cita apartada (es real, está en la agenda): " + citas.map((c) => c.resumen + " · $" + Number(c.precio).toFixed(2)).join("; ") + ". No la volvás a apartar; si pide comprobante, repetile estos datos." : "";
  let salida = "";
  for (let i = 0; i < 5; i++) {
    let res;
    try { res = await llamarClaude(env, hist, canal, extra); }
    catch (e) {
      if (!/Claude 400/.test(String(e.message)) || hist.length <= 1) throw e;
      previo = []; // el historial guardado no sirve: se empieza limpio
      hist = [{ role: "user", content: texto }];
      res = await llamarClaude(env, hist, canal, extra);
    }
    hist.push({ role: "assistant", content: res.content });
    const usos = res.content.filter((b) => b.type === "tool_use");
    salida = res.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim() || salida;
    if (!usos.length) break;
    const resultados = [];
    for (const u of usos) {
      let out;
      try { out = await ejecutar(env, u.name, u.input, { canal, usuario, alias }); } catch (e) { out = { error: String(e.message || e) }; }
      resultados.push({ type: "tool_result", tool_use_id: u.id, content: JSON.stringify(out) });
    }
    hist.push({ role: "user", content: resultados });
  }
  // Se guarda lo que dijo el cliente y lo que Leo le mandó (últimos 20 turnos, empezando en el cliente).
  const corte = soloTexto(soloTexto([...previo, { role: "user", content: texto }, { role: "assistant", content: salida }]).slice(-20));
  await env.LEO.put(clave, JSON.stringify({ dia: hoy, hist: corte }), { expirationTtl: 2 * 86400 });
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

async function enviarMeta(env, canal, cuenta, para, texto, botones) { // Instagram DM y Messenger
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
    const mensaje = { text: texto };
    if (botones && botones.length) mensaje.quick_replies = botones.map((b, i) => ({ content_type: "text", title: b, payload: "BOTON_" + (i + 1) }));
    const cuerpo = { recipient: { id: para }, message: mensaje };
    if (r.pagina) cuerpo.messaging_type = "RESPONSE";
    let res;
    try {
      res = await fetch(r.u, { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + r.t }, body: JSON.stringify(cuerpo) });
      leerUso(res);
    } catch (e) { fallos.push(r.n + ": " + String(e).slice(0, 120)); continue; }
    if (res.ok) {
      // Solo se anota cuando cambia la ruta (KV gratis: 1000 escrituras al día; los fallos sí se anotan siempre)
      if (r.n !== buena) { try { await env.LEO.put("ruta:" + canal, r.n); } catch {} await diag(env, "envio", { canal, ruta: r.n, ok: true }); }
      let mid = ""; try { mid = String((await res.json()).message_id || ""); } catch {}
      return mid || true; // el número del mensaje en Meta: así Leo reconoce después lo que él mandó
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
      leerUso(r);
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
  const conv = await pedir("https://graph.facebook.com/v23.0/" + cuenta + "/conversations?platform=instagram&fields=updated_time&limit=3");
  out.mensajes_directos = conv.ok ? "sirve" : conv.error;
  if (conv.ok) out.ultimas_conversaciones = (conv.j.data || []).map((c) => c.updated_time); // sólo la hora, sin contenido
  // Avisos que Meta le manda a Leo (configurados en la app), leído como la app
  if (app.ok && env.META_APP_SECRET) {
    try {
      const r = await fetch("https://graph.facebook.com/v23.0/" + app.j.id + "/subscriptions?access_token=" + encodeURIComponent(app.j.id + "|" + env.META_APP_SECRET));
      const j = await r.json().catch(() => ({}));
      out.avisos_app = r.ok ? (j.data || []).map((x) => ({ objeto: x.object, activo: x.active, url: x.callback_url, campos: (x.fields || []).map((f) => f.name) })) : (j.error ? (j.error.code || "") + " " + (j.error.message || "") : String(r.status));
    } catch (e) { out.avisos_app = String(e).slice(0, 120); }
  }
  // ¿La cuenta de Instagram le manda sus avisos a la app?
  const sa = await pedir("https://graph.facebook.com/v23.0/" + cuenta + "/subscribed_apps");
  out.cuenta_suscrita = sa.ok ? (sa.j.data || []).map((x) => ({ app: x.name || x.id, campos: x.subscribed_fields || [] })) : sa.error;
  return out;
}

async function avisarJose(env, texto) {
  const ts = Date.now();
  const aviso = "[" + new Date(ts).toISOString() + "] " + texto;
  const cabe = new TextEncoder().encode(JSON.stringify({ t: texto })).length <= 1000; // los metadatos de KV llegan hasta 1024 bytes
  try {
    await env.LEO.put("aviso:" + ts, aviso, { expirationTtl: 30 * 86400, ...(cabe ? { metadata: { t: texto } } : {}) });
    await env.LEO.put("aviso:ultimo", String(ts), { expirationTtl: 30 * 86400 });
  } catch {}
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
  let revisarIG = false;
  for (const e of dato.entry || []) {
    // WhatsApp
    for (const c of e.changes || []) {
      for (const m of (c.value && c.value.messages) || []) {
        if (m.type !== "text") { tareas.push(enviarWhatsApp(env, m.from, "Por ahora solo leo mensajes de texto 🙏 Escribime tu consulta y con gusto te ayudo.")); continue; }
        tareas.push(responder(env, "whatsapp", m.from, m.text.body).then((t) => enviarWhatsApp(env, m.from, sinBotones(t))));
      }
    }
    // Instagram: se revisa la bandeja (mismas reglas que cada minuto). Messenger: se contesta directo.
    for (const ev of e.messaging || []) {
      if (!ev.message || ev.message.is_echo || !ev.message.text) continue;
      if (dato.object === "instagram") { revisarIG = true; continue; }
      if (ev.sender && ev.sender.id === e.id) continue; // lo que manda la misma cuenta del negocio
      const cuenta = (ev.recipient && ev.recipient.id) || e.id;
      tareas.push(responder(env, "messenger", ev.sender.id, ev.message.text).then((t) => enviarMeta(env, "messenger", cuenta, ev.sender.id, sinBotones(t))));
    }
  }
  if (revisarIG) tareas.push(revisarInstagram(env, "aviso de Meta"));
  await Promise.allSettled(tareas);
}

/* ---------- Instagram: Leo revisa la bandeja (cada minuto y cuando Meta avise) ---------- */
const VENTANA_MS = 2 * 3600e3;       // no se contestan mensajes de más de 2 horas
const REINTENTO_MS = 90e3;           // si un intento de contestar se cayó antes de mandar, se reintenta una vez a los 90 s
const tiempo = (s) => Date.parse(String(s || "").replace(/([+-]\d\d)(\d\d)$/, "$1:$2")) || 0;

// Instagram acepta hasta 1000 letras por mensaje: lo largo se manda en partes
function trozos(texto, max = 950) {
  let resto = String(texto || "").trim();
  const partes = [];
  while (resto.length > max) {
    let corte = resto.lastIndexOf("\n", max);
    if (corte < max * 0.5) corte = resto.lastIndexOf(". ", max) + 1;
    if (corte < max * 0.5) corte = resto.lastIndexOf(" ", max);
    if (corte <= 0) corte = max;
    partes.push(resto.slice(0, corte).trim());
    resto = resto.slice(corte).trim();
  }
  if (resto) partes.push(resto);
  return partes;
}

// Meta tiene dos límites (medido el 18 nov 2026):
// - el de la app, por hora: lo gasta ABRIR un chat (~3% cada vez). Por eso Meta bloqueó a Leo.
// - el del negocio: la LISTA de chats (aunque traiga los mensajes adentro). Es muy amplio.
// Se lleva la cuenta de los dos (0 a 100) según lo que Meta dice en cada respuesta.
let usoAppDato = 0, usoAppT = 0, usoNegocio = 0, usoMeta = 0;
// El de la app solo se sabe al mandar mensajes: si el dato tiene más de 5 minutos ya no vale (el límite es por hora y baja solo)
const usoAppAhora = () => (Date.now() - usoAppT < 5 * 60e3 ? usoAppDato : 0);
function leerUso(r) {
  try {
    const app = r.headers.get("x-app-usage");
    if (app) { const a = JSON.parse(app); usoAppDato = Math.max(a.call_count || 0, a.total_time || 0, a.total_cputime || 0); usoAppT = Date.now(); }
    const buc = r.headers.get("x-business-use-case-usage");
    if (buc) { let m = 0; const b = JSON.parse(buc); for (const k in b) for (const u of b[k] || []) m = Math.max(m, u.call_count || 0, u.total_time || 0, u.total_cputime || 0); usoNegocio = m; }
    usoMeta = Math.max(usoAppAhora(), usoNegocio);
  } catch {}
}

// Separa lo que escribió Leo en mensajitos (línea en blanco) y saca los botones [[botones: a | b]]
function prepararRespuesta(texto) {
  let botones = [];
  const t = String(texto || "").replace(/\[\[\s*botones?\s*:([^\]]*)\]\]/gi, (_, lista) => {
    botones = lista.split("|").map((b) => corto(b.trim(), 20)).filter(Boolean).slice(0, 4);
    return "";
  }).replace(/\*\*(.+?)\*\*/g, "$1").replace(/__(.+?)__/g, "$1").replace(/^#{1,6}\s+/gm, ""); // Instagram no muestra negritas: se verían los asteriscos
  let burbujas = t.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  // Una frase corta que presenta una lista («Los cortes cuestan:») va en el mismo mensajito que la lista
  const esLista = (b) => /^[^\p{L}\p{N}¿¡"'(]/u.test(b);
  for (let i = 0; i < burbujas.length - 1; i++) {
    if (!burbujas[i].includes("\n") && burbujas[i].length <= 80 && (burbujas[i].endsWith(":") || esLista(burbujas[i + 1]))) {
      burbujas.splice(i, 2, burbujas[i] + "\n" + burbujas[i + 1]); i--;
    }
  }
  if (burbujas.length > 2) burbujas = [burbujas[0], burbujas.slice(1).join("\n\n")]; // cada mensajito es una llamada a Meta
  if (!burbujas.length) burbujas = ["Dame un momento, por favor 🙏"];
  return { burbujas, botones };
}
// Corta sin partir un emoji a la mitad (Instagram: botones de máximo 20 caracteres)
function corto(t, max) {
  let out = "";
  for (const ch of Array.from(t)) { if ((out + ch).length > max) break; out += ch; }
  return out.trim();
}
// Para canales sin botones (WhatsApp, Messenger, página de prueba)
const sinBotones = (t) => prepararRespuesta(t).burbujas.join("\n\n");

// "Escribiendo…" y otras acciones del chat (si falla, no pasa nada)
async function accionMeta(env, cuenta, para, accion) {
  if (!env.META_IG_TOKEN) return;
  try {
    const ruta = await env.LEO.get("ruta:instagram");
    const u = ruta === "ig-cuenta" ? "https://graph.instagram.com/v23.0/" + cuenta + "/messages"
      : ruta === "fb-me" ? "https://graph.facebook.com/v23.0/me/messages"
      : ruta === "ig-me" ? "https://graph.instagram.com/v23.0/me/messages"
      : "https://graph.facebook.com/v23.0/" + cuenta + "/messages";
    const r = await fetch(u, { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + env.META_IG_TOKEN }, body: JSON.stringify({ recipient: { id: para }, sender_action: accion }) });
    leerUso(r);
    if (!r.ok) { const j = await r.json().catch(() => ({})); await diag(env, "accion", { accion, ok: false, error: j.error ? (j.error.code || "") + " " + (j.error.message || "") : String(r.status) }); }
  } catch {}
}

// ---------- Audios, fotos y stickers ----------
// Campos de cada mensaje en la lista de chats (con adjuntos). Probado con Meta: estos nombres sí existen.
const CAMPOS_MSG = "id,created_time,from,message,attachments{mime_type,name,size,file_url,image_data,video_data},shares{name,link},story";
const EXT_AUDIO = /\.(m4a|aac|mp3|mpga|ogg|oga|opus|wav|amr|weba)$/;
function adjuntosDe(m) {
  const out = [];
  for (const a of ((m.attachments || {}).data) || []) {
    const mime = String(a.mime_type || "").toLowerCase(), nombre = String(a.name || "").toLowerCase();
    const img = a.image_data || null, vid = a.video_data || null;
    const url = a.file_url || (vid && vid.url) || (img && img.url) || "";
    let ruta = ""; try { ruta = new URL(url).pathname.toLowerCase(); } catch {}
    const ext = (ruta.match(/\.([a-z0-9]{2,4})$/) || [])[1] || "";
    let tipo = "archivo";
    if (mime.startsWith("audio/") || /audioclip|voice|audio/.test(nombre) || EXT_AUDIO.test(ruta)) tipo = "audio";
    else if (img) tipo = img.render_as_sticker || /sticker/.test(nombre + " " + String(img.image_type || "")) ? "sticker" : "foto";
    else if (vid || mime.startsWith("video/")) tipo = "video";
    else if (mime.startsWith("image/")) tipo = "foto";
    out.push({ tipo, url, mime: mime.slice(0, 30), ext, kb: a.size ? Math.round(a.size / 1024) : null });
  }
  if (((m.shares || {}).data || []).length) out.push({ tipo: "compartido" });
  if ((m.story || {}).mention) out.push({ tipo: "mencion" });
  return out;
}
const tieneContenido = (m) => !!m.message || adjuntosDe(m).length > 0;

// Leo «escucha» los audios: se pasan a texto con Whisper en Cloudflare (Workers AI, sin llaves nuevas).
async function escucharAudio(env, url) {
  if (!env.AI) throw new Error("Workers AI no está conectado");
  if (!url) throw new Error("el audio no trae enlace");
  const r = await fetch(url);
  if (!r.ok) throw new Error("no se pudo bajar el audio (" + r.status + ")");
  const buf = new Uint8Array(await r.arrayBuffer());
  if (buf.length > 2e6) throw new Error("audio muy largo (" + Math.round(buf.length / 1024) + " KB)");
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  const audio = btoa(bin);
  let res;
  try { res = await env.AI.run("@cf/openai/whisper-large-v3-turbo", { audio, language: "es", vad_filter: true }); }
  catch { res = await env.AI.run("@cf/openai/whisper-large-v3-turbo", { audio, language: "es" }); }
  let texto = String((res && res.text) || "").replace(/\s+/g, " ").trim();
  // En el silencio Whisper a veces «oye» frases de YouTube: eso no cuenta como audio entendido
  if (/^[\s.,¡!¿?]*((subt[ií]tulos|subtitulado)[^.]*|gracias por (ver|su atenci[oó]n)[^.]*|suscr[ií]bete[^.]*)?[\s.,¡!¿?]*$/i.test(texto)) texto = "";
  return { texto: texto.slice(0, 1200), kb: Math.round(buf.length / 1024) };
}

// Lo que el cliente mandó (textos, audios pasados a texto, fotos…) en un solo mensaje para Leo,
// y lo que hay que avisarle a Jose (fotos, videos, audios que no se entendieron, menciones).
async function mensajeDelCliente(env, pendientes, informe) {
  const partes = [], paraJose = [];
  const cuenta = { foto: 0, video: 0, compartido: 0 };
  for (const m of pendientes) {
    if (m.message) partes.push(((m.story || {}).reply_to ? "(respondiendo a una historia de Meraki) " : "") + m.message);
    for (const a of adjuntosDe(m)) {
      if (a.tipo === "audio") {
        const t0 = Date.now();
        try {
          const { texto, kb } = await escucharAudio(env, a.url);
          informe.push({ paso: "audio", kb, ext: a.ext, mime: a.mime, seg_audio: Math.round((Date.now() - t0) / 100) / 10, entendido: !!texto });
          if (texto) { partes.push("🎤 Audio: " + texto); continue; }
        } catch (e) {
          informe.push({ paso: "audio", ext: a.ext, mime: a.mime, kb: a.kb, error: String(e.message || e).slice(0, 160) });
        }
        partes.push("[Audio que no se pudo escuchar]");
        paraJose.push("te mandó un audio que Leo no pudo escuchar");
      } else if (a.tipo === "sticker") partes.push("[Sticker]");
      else if (a.tipo === "mencion") { partes.push("[Te mencionó en su historia]"); paraJose.push("te mencionó en su historia 🙌"); }
      else if (a.tipo === "archivo") { partes.push("[Archivo]"); paraJose.push("te mandó un archivo"); informe.push({ paso: "adjunto", tipo: a.tipo, mime: a.mime, ext: a.ext }); }
      else { partes.push(a.tipo === "foto" ? "[Foto]" : a.tipo === "video" ? "[Video]" : "[Publicación compartida]"); cuenta[a.tipo]++; }
    }
  }
  const n = (k, uno, varios) => (cuenta[k] === 1 ? uno : cuenta[k] > 1 ? cuenta[k] + " " + varios : "");
  const media = [n("foto", "una foto", "fotos"), n("video", "un video", "videos"), n("compartido", "una publicación", "publicaciones")].filter(Boolean);
  if (media.length) paraJose.unshift("te mandó " + media.join(" y "));
  return { texto: partes.join("\n"), paraJose };
}

function motivoFalla(e) {
  const t = String((e && e.message) || e || "");
  if (/credit|balance|billing|payment/i.test(t)) return "se acabó el saldo de la cuenta de Claude";
  if (/Claude (429|5\d\d)|overloaded/i.test(t)) return "Claude estaba saturado";
  if (/Claude 40[13]/.test(t)) return "la llave de Claude no está funcionando";
  return "falló algo al pensar la respuesta";
}

async function graphIG(env, ruta) {
  const r = await fetch("https://graph.facebook.com/v23.0/" + ruta, { headers: { authorization: "Bearer " + env.META_IG_TOKEN } });
  leerUso(r);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ? (j.error.code || "") + " " + (j.error.message || "") : String(r.status));
  return j;
}

// Cloudflare despierta a Leo cada minuto; adentro revisa varias veces. Cada revisión es UNA consulta a la lista
// de chats (con el último mensaje adentro), que no gasta el límite por hora de la app. El ritmo se ajusta solo:
// más rápido si hay una conversación activa, y más lento si el límite del negocio se llena.
const MARCA_LEO = "\u2063"; // separador invisible al final de cada mensaje de Leo: así reconoce lo suyo aunque se pierdan los apuntes
const ACTIVA_MS = 3 * 60e3; // una conversación con movimiento en los últimos 3 minutos se revisa más seguido
function pausaRevision(uso, activa) { // segundos hasta la siguiente revisión (0 = ya no más en este minuto)
  if (uso >= 90) return 0;
  if (uso >= 75) return activa ? 15 : 30;
  if (uso >= 50) return activa ? 8 : 12;
  return activa ? 5 : 7; // 8 a 11 revisiones por minuto: lo que aguanta el CPU que da Cloudflare gratis (10 ms)
}
async function revisarSeguido(env) {
  const t0 = Date.now();
  const memo = new Map(); // lo leído de KV en esta ronda (KV gratis: 100 000 lecturas al día)
  let ultimaActividad = 0, pausa = 0, primera = true;
  for (let proxima = t0; ; ) {
    const falta = proxima - Date.now();
    if (falta > 0) await new Promise((r) => setTimeout(r, falta));
    const inicioRevision = Date.now();
    const act = await revisarInstagram(env, primera ? "cada minuto" : "seguido (cada " + pausa + " s)", memo);
    if (act) ultimaActividad = Math.max(ultimaActividad, act);
    primera = false;
    pausa = pausaRevision(usoNegocio, Date.now() - ultimaActividad < ACTIVA_MS);
    console.log("revision " + new Date(inicioRevision - SV_MS).toISOString().slice(11, 19) + " (a los " + Math.round((inicioRevision - t0) / 1000) + " s) · Meta negocio " + usoNegocio + "% app " + usoAppAhora() + "% · siguiente en " + (pausa || "-") + " s");
    proxima = Math.max(inicioRevision + pausa * 1000, Date.now() + 500);
    // Con el reloj real. Cloudflare arranca cada ronda ~60 s después de la anterior: revisando hasta los 56 s el hueco queda
    // en ~4 s (antes 11 s). Si una respuesta se alarga y se cruza con la siguiente ronda, la marca y la revisión antes de mandar lo cuidan.
    if (!pausa || proxima - t0 > 56e3) break;
  }
}

async function revisarInstagram(env, motivo, memo = new Map()) {
  if (!env.META_IG_TOKEN || !env.IG_ID) return;
  const leer = async (k) => { if (!memo.has(k)) memo.set(k, await env.LEO.get(k)); return memo.get(k); };
  const poner = (k, v, o) => { memo.set(k, v); return env.LEO.put(k, v, o); };
  const ahora = Date.now();
  let inicio = Number(await leer("ig:inicio"));
  if (!inicio) { inicio = ahora - (ahora % 1000); await poner("ig:inicio", String(inicio)); } // lo de antes no se contesta (Meta da la hora en segundos)
  const yo = String(env.IG_ID), yoUsuario = String(env.IG_USUARIO || "").toLowerCase();
  const solo = String(env.LEO_SOLO || "").toLowerCase().split(",").map((x) => x.trim()).filter(Boolean);
  // Modo prueba: además de LEO_SOLO, las cuentas que se activaron con /permitir (guardadas en KV, sin mostrarlas)
  if (solo.length) { try { for (const u of JSON.parse((await leer("solo:extra")) || "[]")) solo.push(String(u).toLowerCase()); } catch {} }
  const esNegocio = (f) => !!f && (String(f.id) === yo || (!!yoUsuario && String(f.username || "").toLowerCase() === yoUsuario));

  const lista = (campos) => graphIG(env, yo + "/conversations?platform=instagram&fields=" + encodeURIComponent(campos) + "&limit=10").then((j) => j.data || []);
  let convs;
  try { convs = await lista("updated_time"); } // lo más liviano posible (cada revisión gasta CPU de Cloudflare)
  catch (e) { await diag(env, "revision", { motivo, error: String(e.message || e).slice(0, 200) }); return; }
  const ultimaActividad = Math.max(0, ...convs.map((c) => tiempo(c.updated_time)));
  // Los últimos 15 mensajes de cada chat, también por la lista (abrir el chat gasta ~3% del límite por hora de la app).
  // Se pide una sola vez por revisión y solo si hace falta.
  let completos = null;
  const leerChat = async (id) => {
    if (!completos) completos = new Map((await lista("updated_time,messages.limit(15){" + CAMPOS_MSG + "}")).map((x) => [x.id, x]));
    const x = completos.get(id);
    if (x) return (x.messages || {}).data || [];
    if (usoAppAhora() >= 80) throw new Error("no apareció en la lista y el límite de la app va en " + usoAppAhora() + "%");
    return ((await graphIG(env, id + "?fields=" + encodeURIComponent("messages.limit(15){" + CAMPOS_MSG + "}"))).messages || {}).data || [];
  };

  const informe = [];
  for (const c of convs) {
    const act = tiempo(c.updated_time);
    if (act < inicio || ahora - act > VENTANA_MS) continue;
    const clave = "conv:" + c.id;
    if (!memo.has(clave)) { let o = {}; try { o = JSON.parse((await env.LEO.get(clave)) || "{}"); } catch {} memo.set(clave, o); }
    const estado = memo.get(clave);
    // ¿Quedó a medias un intento de contestar (Cloudflare lo cortó o falló Claude/Meta antes de mandar)?
    const aMedias = !!estado.ultimo && estado.listo !== estado.ultimo && estado.reintento !== estado.ultimo
      && ahora - (estado.intento || 0) > REINTENTO_MS && ahora - (estado.intento || 0) < 15 * 60e3 && usoAppAhora() < 90;
    if (estado.visto === c.updated_time && !aMedias) continue; // nada nuevo en este chat
    // Cloudflare a veces corre dos revisiones a la vez: al guardar se junta con lo último guardado, para no borrar
    // lo que la otra anotó (si se borraba, Leo creía que sus propios mensajes los había mandado Jose y se callaba).
    const guardar = async (o) => {
      let fresco = {}; try { fresco = JSON.parse((await env.LEO.get(clave)) || "{}"); } catch {}
      const junta = (a, b, n) => [...new Set([...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])])].slice(-n);
      o.dicho = junta(fresco.dicho, o.dicho, 12); o.mios = junta(fresco.mios, o.mios, 30);
      if (fresco.ultimo && fresco.ultimo === o.ultimo && fresco.listo === fresco.ultimo) o.listo = fresco.listo;
      memo.set(clave, o);
      return env.LEO.put(clave, JSON.stringify(o), { expirationTtl: 7 * 86400 });
    };
    const dicho = Array.isArray(estado.dicho) ? estado.dicho : [];
    const mios = Array.isArray(estado.mios) ? estado.mios : [];
    const nuevo = { ...estado, visto: c.updated_time, listo: estado.ultimo }; // si no se contesta ahora, lo anterior queda cerrado

    let msgs;
    try { msgs = await leerChat(c.id); }
    catch (e) { informe.push({ paso: "leer chat", error: String(e.message || e).slice(0, 160) }); continue; }
    // Con el último mensaje casi siempre se sabe si hay algo que contestar
    const ult = msgs[0];
    const tUlt = ult ? tiempo(ult.created_time) : 0;
    if (!ult || esNegocio(ult.from) || tUlt < inicio || ahora - tUlt > VENTANA_MS || (ult.id === estado.ultimo && !aMedias)) { await guardar(nuevo); continue; }
    if (solo.length && !solo.includes(String((ult.from || {}).username || "").toLowerCase())) {
      informe.push({ paso: "sin contestar", por: "modo prueba: no es la cuenta de prueba" }); // sin datos del cliente
      await guardar(nuevo); continue;
    }
    msgs = [...msgs].reverse().sort((x, y) => tiempo(x.created_time) - tiempo(y.created_time)); // Meta los da del más nuevo al más viejo: se ponen en orden

    // Lo que el cliente escribió después de la última respuesta del negocio
    let iNeg = -1;
    for (let i = msgs.length - 1; i >= 0; i--) if (esNegocio(msgs[i].from)) { iNeg = i; break; }
    const pendientes = msgs.slice(iNeg + 1).filter((m) => !esNegocio(m.from) && tieneContenido(m) && tiempo(m.created_time) >= inicio && ahora - tiempo(m.created_time) <= VENTANA_MS);
    const idUltimo = pendientes.length ? pendientes[pendientes.length - 1].id : null;
    if (!idUltimo || (idUltimo === estado.ultimo && !aMedias)) { await guardar(nuevo); continue; }

    const cliente = pendientes[pendientes.length - 1].from || {};
    if (solo.length && !solo.includes(String(cliente.username || "").toLowerCase())) {
      informe.push({ paso: "sin contestar", por: "modo prueba: no es la cuenta de prueba" }); // sin datos del cliente
      await guardar(nuevo); continue;
    }
    // Si Jose contestó a mano HOY en este chat (mensaje del negocio que no mandó Leo), Leo no se mete hasta mañana.
    // Lo de Leo se reconoce por el número de mensaje de Meta, o por el texto. Solo cuenta lo de después del arranque.
    const plano = (t) => String(t || "").replace(/\u2063/g, "").replace(/\s+/g, " ").trim();
    const deJoseHoy = (lista) => msgs.filter((m) => esNegocio(m.from) && tiempo(m.created_time) >= inicio && ymdSV(tiempo(m.created_time)) === ymdSV(ahora)
      && !String(m.message || "").includes(MARCA_LEO) && !lista.mios.includes(String(m.id)) && !lista.dicho.map(plano).includes(plano(m.message)));
    let manual = deJoseHoy({ mios, dicho }).length > 0;
    if (manual) { // antes de callarse, se confirma con lo último guardado (otra revisión pudo haber mandado esos mensajes)
      let fresco = {}; try { fresco = JSON.parse((await env.LEO.get(clave)) || "{}"); } catch {}
      manual = deJoseHoy({ mios: [...mios, ...(fresco.mios || [])], dicho: [...dicho, ...(fresco.dicho || [])] }).length > 0;
    }
    if (manual) { informe.push({ paso: "sin contestar", por: "Jose está atendiendo ese chat" }); await guardar(nuevo); continue; }

    const esReintento = idUltimo === estado.ultimo;
    const alias = cliente.username ? "@" + cliente.username : "un cliente";
    const yaEscrita = esReintento && estado.respuesta ? estado.respuesta : null;
    if (idUltimo === estado.ultimo) { nuevo.reintento = idUltimo; informe.push({ paso: "reintento (el intento anterior se cayó)" }); }
    nuevo.ultimo = idUltimo; nuevo.intento = Date.now(); delete nuevo.listo; delete nuevo.respuesta;
    await guardar(nuevo); // se marca antes de contestar para no contestar dos veces
    const tMsg = tiempo(pendientes[pendientes.length - 1].created_time), tVisto = Date.now(); // para medir cuánto tarda (sin datos del cliente)
    // «escribiendo…» mientras Leo piensa (si Meta va cargado se omite: cada llamada cuenta)
    const escribiendo = usoAppAhora() < 60 && !yaEscrita ? accionMeta(env, yo, String(cliente.id), "typing_on") : Promise.resolve();
    let respuesta = yaEscrita;
    if (!respuesta) {
      let texto = "", paraJose = [];
      try { ({ texto, paraJose } = await mensajeDelCliente(env, pendientes, informe)); }
      catch (e) { informe.push({ paso: "adjuntos", error: String(e.message || e).slice(0, 160) }); texto = pendientes.map((m) => m.message || "[Mensaje sin texto]").join("\n"); }
      if (paraJose.length && !esReintento) await avisarJose(env, "🦁 Leo te avisa (instagram): " + alias + " " + paraJose.join(" y ") + ". Revisalo en el chat de Instagram.");
      try { respuesta = await responder(env, "instagram", String(cliente.id), texto.slice(0, 1500), cliente.username ? "@" + cliente.username : ""); }
      catch (e) {
        informe.push({ paso: "pensar", error: String(e.message || e).slice(0, 160) });
        // Al segundo intento ya no se reintenta: se le avisa a Jose para que nadie se quede esperando
        if (esReintento) await avisarJose(env, "⚠️ Leo no pudo contestar (instagram): " + alias + " te escribió y Leo no le pudo contestar (" + motivoFalla(e) + "). Contestale vos en Instagram.");
        continue;
      }
    }
    // Se revisa que nadie haya contestado mientras Leo pensaba (Jose a mano, o la revisión del minuto anterior).
    // En las revisiones de cada 8 s, si pensó rápido, no hace falta: así se ahorra 1 a 2 s de Meta.
    if (!motivo.startsWith("seguido") || Date.now() - tVisto > 6000) try {
      const tCliente = tiempo(pendientes[pendientes.length - 1].created_time);
      const recientes = ((((await lista("updated_time,messages.limit(3){id,created_time,from}")).find((x) => x.id === c.id)) || {}).messages || {}).data || [];
      if (recientes.some((m) => esNegocio(m.from) && tiempo(m.created_time) > tCliente)) { memo.delete(clave); informe.push({ paso: "ya estaba contestado" }); continue; }
    } catch {}
    await escribiendo;
    const tPensado = Date.now();
    let tPrimero = 0;
    const { burbujas, botones } = prepararRespuesta(respuesta);
    const partes = burbujas.flatMap((b) => trozos(b));
    let ok = true, mandadas = 0;
    for (let i = 0; i < partes.length && ok; i++) {
      const ultima = i === partes.length - 1; // sin pausa: cada envío a Meta ya tarda 1 a 2 s
      let fue = await enviarMeta(env, "instagram", yo, String(cliente.id), partes[i] + MARCA_LEO, ultima ? botones : null);
      if (!fue && ultima && botones.length) { // si Instagram no acepta los botones, se manda el texto solo
        fue = await enviarMeta(env, "instagram", yo, String(cliente.id), partes[i] + MARCA_LEO);
        if (fue) informe.push({ paso: "botones no funcionaron" });
      }
      if (fue) { dicho.push(partes[i]); if (typeof fue === "string") mios.push(fue); mandadas++; if (!tPrimero) tPrimero = Date.now(); } else ok = false;
    }
    nuevo.dicho = dicho.slice(-12);
    nuevo.mios = mios.slice(-30);
    if (ok) nuevo.listo = idUltimo;
    else if (!mandadas) nuevo.respuesta = String(respuesta).slice(0, 2000); // para el reintento, sin volver a pensar
    if (!ok && esReintento) await avisarJose(env, "⚠️ Leo no pudo contestar (instagram): " + alias + " te escribió y Instagram no dejó pasar la respuesta de Leo. Contestale vos en Instagram.");
    await guardar(nuevo);
    const seg = (x) => Math.round(x / 100) / 10;
    informe.push({ paso: ok ? "contestado" : "no se pudo mandar (ver ultimo_envio)", motivo, segundos: { en_verlo: seg(tVisto - tMsg), pensando: seg(tPensado - tVisto), mandando: seg(Date.now() - tPensado), primer_mensajito: tPrimero ? seg(tPrimero - tMsg) : null, total: seg(Date.now() - tMsg) }, burbujas: partes.length, botones: botones.length });
  }
  if (informe.length) {
    console.log("informe " + motivo + " " + JSON.stringify(informe)); // solo pasos y segundos, sin datos de clientes
    const importante = informe.some((x) => x.segundos || x.paso === "pensar" || x.paso === "audio" || x.paso === "adjunto" || String(x.paso).startsWith("reintento") || x.paso === "ya estaba contestado");
    if (importante) {
      await diag(env, "revision", { motivo, informe });
      // Cronómetro de las últimas 10 respuestas
      let h = []; try { h = JSON.parse((await env.LEO.get("diag:revisiones")) || "[]"); } catch {}
      h.push({ cuando: new Date().toISOString(), motivo, informe });
      try { await env.LEO.put("diag:revisiones", JSON.stringify(h.slice(-10)), { expirationTtl: 30 * 86400 }); } catch {}
    } else if (Date.now() - Number((await env.LEO.get("diag:aviso_t")) || 0) > 10 * 60e3) {
      // «sin contestar», errores de lectura o Meta lleno: se anotan como mucho cada 10 minutos (KV gratis: 1000 escrituras al día)
      try { await env.LEO.put("diag:aviso_t", String(Date.now()), { expirationTtl: 3600 }); } catch {}
      await diag(env, "revision", { motivo, informe });
    }
  }
  return ultimaActividad;
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
  // Se espera aquí mismo (no con waitUntil): waitUntil se corta a los 30 s y las revisiones de 32, 40 y 48 s no corrían.
  async scheduled(controller, env, ctx) {
    await revisarSeguido(env).catch((e) => console.log("revision error", String(e)));
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json; charset=utf-8" } });

    if (url.pathname === "/salud") return json({ ok: true, quien: "Leo", negocio: "Meraki Barbershop", cerebro: !!env.LEO_ANTHROPIC_KEY, meta: !!env.META_APP_SECRET });

    // Avisos para la app Meraki CRM (citas nuevas, clientes que piden hablar con Jose). Tienen datos de clientes:
    // van protegidos con su propia clave, que solo tiene la app de Jose. Casi siempre cuesta una sola lectura.
    if (url.pathname === "/avisos") {
      // En el código público solo está la huella (SHA-256) de la clave; la clave la tiene únicamente la app de Jose.
      const huella = [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(request.headers.get("x-avisos") || "")))].map((b) => b.toString(16).padStart(2, "0")).join("");
      if (!env.AVISOS_HASH || huella !== env.AVISOS_HASH) return new Response("No autorizado", { status: 403 });
      const desde = Number(url.searchParams.get("desde")) || 0;
      const ultimo = Number(await env.LEO.get("aviso:ultimo")) || 0;
      const avisos = [];
      if (ultimo > desde) {
        const l = await env.LEO.list({ prefix: "aviso:1" });
        const nuevas = l.keys.map((k) => ({ k, ts: Number(k.name.slice(6)) })).filter((x) => x.ts > desde).slice(-20);
        for (const { k, ts } of nuevas) {
          const texto = k.metadata && k.metadata.t ? k.metadata.t : String((await env.LEO.get(k.name)) || "").replace(/^\[[^\]]*\]\s*/, "");
          if (texto) avisos.push({ ts, texto });
        }
      }
      return new Response(JSON.stringify({ avisos, ahora: Date.now() }), { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
    }

    // Aviso de prueba (sin datos de clientes) para revisar que le llegan a la app de Jose
    if (url.pathname === "/aviso-prueba" && request.method === "POST") {
      if (!env.META_APP_SECRET || request.headers.get("x-diag") !== env.META_APP_SECRET) return new Response("No autorizado", { status: 403 });
      await avisarJose(env, "🦁 Leo te avisa (prueba): Así te van a llegar los avisos de Leo. Si ves esto, ya quedó 👌");
      return json({ ok: true });
    }

    // Diagnóstico para revisar desde GitHub (sin llaves ni mensajes de clientes)
    if (url.pathname === "/diag") {
      if (!env.META_APP_SECRET || request.headers.get("x-diag") !== env.META_APP_SECRET) return new Response("No autorizado", { status: 403 });
      const leer = async (k) => { try { return JSON.parse((await env.LEO.get(k)) || "null"); } catch { return null; } };
      return json({
        claves: { cerebro: !!env.LEO_ANTHROPIC_KEY, secreto_meta: !!env.META_APP_SECRET, secreto_ig: !!env.IG_APP_SECRET, llave_instagram: !!env.META_IG_TOKEN, llave_pagina: !!env.META_PAGE_TOKEN, whatsapp: !!env.WA_TOKEN, avisos_app: !!env.AVISOS_HASH, oido_audios: !!env.AI },
        ultimo_recibido: await leer("diag:recibido"),
        ultimo_envio: await leer("diag:envio"),
        firmas_rechazadas: await leer("diag:firma"),
        ruta_instagram: await env.LEO.get("ruta:instagram"),
        modo: env.LEO_SOLO ? "solo contesta a: " + env.LEO_SOLO : "contesta a todos",
        uso_meta_ultimo: usoMeta + "%",
        revisa_desde: (await env.LEO.get("ig:inicio")) ? new Date(Number(await env.LEO.get("ig:inicio"))).toISOString() : null,
        ultima_revision: await leer("diag:revision"),
        ultimas_respuestas: await leer("diag:revisiones"),
        llave: url.searchParams.get("ligero") ? "(no revisada: modo ligero, para no gastar llamadas de Meta)" : await revisarLlave(env),
      });
    }

    // Suscribir la cuenta de Instagram para que Meta le mande los mensajes a Leo (protegido)
    if (url.pathname === "/reiniciar" && request.method === "POST") {
      if (!env.META_APP_SECRET || request.headers.get("x-diag") !== env.META_APP_SECRET) return new Response("No autorizado", { status: 403 });
      // Desde qué hora cuenta (por defecto, ahora). Los mensajes de antes ya no se contestan ni cuentan, y se borran los apuntes de cada chat.
      const pedido = Date.parse(url.searchParams.get("desde") || "");
      const desde = (isNaN(pedido) ? Date.now() : pedido) - ((isNaN(pedido) ? Date.now() : pedido) % 1000);
      await env.LEO.put("ig:inicio", String(desde));
      let borrados = 0, cursor;
      do {
        const l = await env.LEO.list({ prefix: "conv:", cursor });
        for (const k of l.keys) { await env.LEO.delete(k.name); borrados++; }
        cursor = l.list_complete ? null : l.cursor;
      } while (cursor);
      return json({ ok: true, revisa_desde: new Date(desde).toISOString(), apuntes_borrados: borrados });
    }
    if (url.pathname === "/permitir" && request.method === "POST") {
      // Modo prueba: activa a la persona que mandó un mensaje (se busca por un pedazo del texto y la hora),
      // sin mostrar su usuario, y hace que Leo vuelva a revisar ese chat.
      if (!env.META_APP_SECRET || request.headers.get("x-diag") !== env.META_APP_SECRET) return new Response("No autorizado", { status: 403 });
      const texto = String(url.searchParams.get("texto") || "").toLowerCase().trim();
      const desde = Date.parse(url.searchParams.get("desde") || ""), hasta = Date.parse(url.searchParams.get("hasta") || "");
      if (texto.length < 6 || isNaN(desde) || isNaN(hasta)) return json({ ok: false, error: "Faltan texto (6+ letras), desde y hasta" }, 400);
      const yo = String(env.IG_ID);
      const data = (await graphIG(env, yo + "/conversations?platform=instagram&fields=" + encodeURIComponent("updated_time,messages.limit(15){id,created_time,from,message}") + "&limit=10")).data || [];
      const hallados = new Map(); // usuario -> id del chat
      for (const c of data) for (const m of (c.messages || {}).data || []) {
        const t = tiempo(m.created_time), de = m.from || {};
        if (String(de.id) !== yo && de.username && t >= desde && t <= hasta && String(m.message || "").toLowerCase().includes(texto)) hallados.set(String(de.username).toLowerCase(), c.id);
      }
      const tapar = (u) => u.slice(0, 2) + "***" + u.slice(-1);
      if (hallados.size !== 1) return json({ ok: false, encontrados: [...hallados.keys()].map(tapar) });
      const [usuario, chat] = [...hallados.entries()][0];
      let extra = []; try { extra = JSON.parse((await env.LEO.get("solo:extra")) || "[]"); } catch {}
      if (!extra.includes(usuario)) extra.push(usuario);
      await env.LEO.put("solo:extra", JSON.stringify(extra));
      await env.LEO.delete("conv:" + chat); // así Leo vuelve a revisar ese chat y contesta lo pendiente
      return json({ ok: true, permitido: tapar(usuario), cuentas_activadas: extra.length });
    }
    if (url.pathname === "/diag-chat") { // ¿Leo reconoce sus propios mensajes? Solo conteos (sin textos ni números completos)
      if (!env.META_APP_SECRET || request.headers.get("x-diag") !== env.META_APP_SECRET) return new Response("No autorizado", { status: 403 });
      const yo = String(env.IG_ID);
      const plano = (t) => String(t || "").replace(/\u2063/g, "").replace(/\s+/g, " ").trim();
      const data = (await graphIG(env, yo + "/conversations?platform=instagram&fields=" + encodeURIComponent("updated_time,messages.limit(15){id,created_time,from,message}") + "&limit=3")).data || [];
      const out = [];
      for (const c of data) {
        let est = {}; try { est = JSON.parse((await env.LEO.get("conv:" + c.id)) || "{}"); } catch {}
        const ms = ((c.messages || {}).data || []).filter((m) => String((m.from || {}).id) === yo);
        const mios = (est.mios || []).map(String), dicho = (est.dicho || []).map(plano);
        let dif = null;
        if (ms[0] && dicho.length && !dicho.includes(plano(ms[0].message))) { // dónde difiere el texto (solo los códigos de 2 letras)
          const a = plano(ms[0].message);
          let mejor = "", n = -1;
          for (const d of dicho) { let i = 0; while (i < a.length && i < d.length && a[i] === d[i]) i++; if (i > n) { n = i; mejor = d; } }
          const cod = (x) => (x ? "U+" + x.codePointAt(0).toString(16).toUpperCase() : "fin");
          dif = { igual_hasta: n, de_meta: cod(a[n]), guardado: cod(mejor[n]), largo_meta: a.length, largo_guardado: mejor.length };
        }
        out.push({ actualizado: c.updated_time, del_negocio: ms.length,
          con_marca: ms.filter((m) => String(m.message || "").includes("\u2063")).length,
          en_mios: ms.filter((m) => mios.includes(String(m.id))).length,
          en_dicho: ms.filter((m) => dicho.includes(plano(m.message))).length,
          mios_guardados: mios.length, dicho_guardado: dicho.length,
          id_meta: ms[0] ? String(ms[0].id).slice(0, 12) + "… (" + String(ms[0].id).length + ")" : null,
          id_guardado: mios.length ? mios[mios.length - 1].slice(0, 12) + "… (" + mios[mios.length - 1].length + ")" : null,
          diferencia_texto: dif });
      }
      return json(out);
    }
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
        const { burbujas, botones } = prepararRespuesta(await responder(env, "prueba", String(id || "x").slice(0, 40), t));
        return json({ respuesta: burbujas.join("\n\n") + (botones.length ? "\n\n" + botones.map((b) => "[ " + b + " ]").join("  ") : "") });
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
        ctx.waitUntil(procesarMeta(env, cuerpo).catch((e) => console.log("webhook error", String(e))));
        return new Response("ok");
      }
    }

    return new Response("Hola, soy Leo, el asistente de IA de Meraki Barbershop 🦁💈", { headers: { "content-type": "text/plain; charset=utf-8" } });
  },
};
