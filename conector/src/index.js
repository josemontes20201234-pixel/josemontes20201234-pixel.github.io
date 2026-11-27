// Meraki · conector de Claude (servidor MCP) para la Caja del CRM
// Lee y escribe en Firebase (colección «crm», la misma copia de seguridad que usa la app Meraki CRM).
const FB_KEY = "AIzaSyCysp_Pr9o-LYM5td9wOGLNNvsSKaEx2MQ";
const ADMIN = "josemontes20201234@gmail.com";
const FS = "https://firestore.googleapis.com/v1/projects/meraki-barbershop/databases/(default)/documents";
const DIA = 86400000, SV = 6 * 3600000;

const SERV_ANTES = [["Corte clásico",3.5],["Corte moderno",4],["Combo el patrón",5],["Servicio full detalle",6],["Diseño de barba el patrón",3.5],["Perfilado express",2],["Ritual Meraki Spa",5]];
const SERV_NUEVOS = [["Corte clásico",4],["Corte moderno",5],["Combo el patrón",6.5],["Servicio full detalle",8],["Diseño de barba Meraki",4.5],["Perfilado express",2.5],["Ritual Meraki Spa",6.5]];
const INV_BASE = [{id:"cafe",n:"Café",p:0.3,stock:0,min:5},{id:"gaseosa",n:"Gaseosa",p:0.7,stock:0,min:6},{id:"jugo",n:"Jugo",p:0.6,stock:0,min:6},{id:"energy",n:"Energizante",p:0.65,stock:0,min:4}];
const CAT_G = {renta:"Renta", bebidas:"Bebidas y productos", insumos:"Insumos de barbería", servicios:"Luz, agua, internet", apps:"Apps y publicidad", tarjeta:"Pago de tarjeta", otro:"Otro"};
const PAGOS = ["efectivo","tarjeta","transferencia","regalo","fiado"];

const ymdSV = t => new Date(t - SV).toISOString().slice(0, 10);
const servicios = () => ymdSV(Date.now()) >= "2026-12-15" ? SERV_NUEVOS : SERV_ANTES;
const r2 = n => Math.round((Number(n) || 0) * 100) / 100;
const plata = n => (n < 0 ? "-$" : "$") + Math.abs(r2(n)).toFixed(2);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const sinTilde = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const hoy0 = () => { const d = ymdSV(Date.now()); return new Date(d + "T00:00:00Z").getTime() + SV; };
const inicioSemana = () => { const h = hoy0(); const dow = new Date(h - SV).getUTCDay(); return h - ((dow + 6) % 7) * DIA; };
const inicioMes = () => { const d = ymdSV(Date.now()); return new Date(d.slice(0, 8) + "01T00:00:00Z").getTime() + SV; };
const rango = p => p === "semana" ? [inicioSemana(), Date.now() + DIA] : p === "mes" ? [inicioMes(), Date.now() + DIA] : p === "ayer" ? [hoy0() - DIA, hoy0()] : [hoy0(), hoy0() + DIA];
const hora = t => new Date(t - SV).toISOString().slice(11, 16);
const fecha = t => { const s = ymdSV(t); return s.slice(8) + "/" + s.slice(5, 7); };

// ---------- sesión de Jose → token de Firebase
async function idToken(env) {
  const c = await env.KV.get("ficha", "json");
  if (c && c.hasta > Date.now() + 60000) return c.t;
  const rt = await env.KV.get("rt"); if (!rt) throw new Error("Falta vincular: en Meraki CRM → Ajustes → Conectar con Claude.");
  const r = await fetch("https://securetoken.googleapis.com/v1/token?key=" + FB_KEY, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "grant_type=refresh_token&refresh_token=" + encodeURIComponent(rt) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.id_token) throw new Error("La sesión de Meraki CRM venció. Volvé a tocar «Conectar con Claude» en Ajustes del CRM.");
  if (j.refresh_token && j.refresh_token !== rt) await env.KV.put("rt", j.refresh_token);
  await env.KV.put("ficha", JSON.stringify({ t: j.id_token, hasta: Date.now() + Number(j.expires_in || 3600) * 1000 }));
  return j.id_token;
}
const emailDe = jwt => { try { return JSON.parse(atob(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).email || ""; } catch { return ""; } };

function val(v) {
  if (!v) return null;
  if ("stringValue" in v) return v.stringValue; if ("integerValue" in v) return Number(v.integerValue); if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue; if ("timestampValue" in v) return v.timestampValue; if ("nullValue" in v) return null;
  if ("mapValue" in v) { const o = {}; const f = v.mapValue.fields || {}; for (const k in f) o[k] = val(f[k]); return o; }
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(val);
  return null;
}
async function listar(env, col) {
  const t = await idToken(env); let todos = [], pag = "";
  for (let i = 0; i < 30; i++) {
    const r = await fetch(FS + "/" + col + "?pageSize=300" + (pag ? "&pageToken=" + encodeURIComponent(pag) : ""), { headers: { authorization: "Bearer " + t } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error("Firebase (" + col + "): " + ((j.error && j.error.message) || r.status));
    for (const d of j.documents || []) { const o = {}; const f = d.fields || {}; for (const k in f) o[k] = val(f[k]); o.__id = d.name.split("/").pop(); todos.push(o); }
    if (!j.nextPageToken) break; pag = j.nextPageToken;
  }
  return todos;
}
async function cargar(env) {
  const docs = await listar(env, "crm"), D = { ventas: [], gastos: [], fiados: [], inv: [], personas: [] };
  const map = { v_: "ventas", g_: "gastos", f_: "fiados", i_: "inv", p_: "personas" };
  for (const d of docs) { const k = map[d.__id.slice(0, 2)]; if (!k) continue; try { D[k].push(JSON.parse(d.d)); } catch {} }
  for (const b of INV_BASE) if (!D.inv.some(x => x.id === b.id)) D.inv.push(Object.assign({}, b));
  return D;
}
async function guardar(env, pref, obj) {
  obj.u = Date.now(); const t = await idToken(env);
  const r = await fetch(FS + "/crm/" + pref + obj.id, { method: "PATCH", headers: { authorization: "Bearer " + t, "content-type": "application/json" }, body: JSON.stringify({ fields: { d: { stringValue: JSON.stringify(obj) }, u: { integerValue: String(obj.u) } } }) });
  if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error("No se pudo guardar: " + ((j.error && j.error.message) || r.status)); }
}

// ---------- cálculos (los mismos del CRM)
const vivas = D => D.ventas.filter(v => !v.borrado);
const gVivos = D => D.gastos.filter(g => !g.borrado);
const dinero = v => v.pago === "regalo" || v.pago === "fiado" ? 0 : (Number(v.total) || 0);
const esServ = n => SERV_ANTES.concat(SERV_NUEVOS).some(s => s[0] === n);
const saldo = f => r2((Number(f.monto) || 0) - (f.abonos || []).reduce((s, a) => s + (Number(a.m) || 0), 0));
const buscar = (lista, txt, nom) => { const q = sinTilde(txt); return lista.find(x => sinTilde(nom(x)) === q) || lista.find(x => sinTilde(nom(x)).includes(q)) || lista.find(x => q.includes(sinTilde(nom(x)))); };

function resumen(D, periodo) {
  const [a, b] = rango(periodo), V = vivas(D).filter(v => v.t >= a && v.t < b), G = gVivos(D).filter(g => g.t >= a && g.t < b);
  const ing = V.reduce((s, v) => s + dinero(v), 0), gas = G.reduce((s, g) => s + (Number(g.monto) || 0), 0);
  const porP = {}; V.forEach(v => porP[v.pago] = (porP[v.pago] || 0) + (Number(v.total) || 0));
  const porS = {}; V.forEach(v => (v.items || []).forEach(i => { porS[i.n] = porS[i.n] || [0, 0]; porS[i.n][0]++; porS[i.n][1] += i.m; }));
  const cortes = V.reduce((s, v) => s + (v.items || []).filter(i => esServ(i.n)).length, 0);
  const fp = D.fiados.filter(f => !f.borrado && saldo(f) > 0.001), bajo = D.inv.filter(x => !x.borrado && (Number(x.stock) || 0) <= (Number(x.min) || 0));
  const mesT = vivas(D).filter(v => v.t >= inicioMes()).reduce((s, v) => s + dinero(v), 0);
  let t = "Caja de Meraki · " + ({ hoy: "hoy", ayer: "ayer", semana: "esta semana", mes: "este mes" }[periodo] || "hoy") + "\n";
  t += "Ventas que entraron: " + plata(ing) + " (" + V.length + " cobros, " + cortes + " servicios)\nGastos: " + plata(gas) + "\nGanancia: " + plata(ing - gas) + "\n";
  if (Object.keys(porP).length) t += "Por forma de pago: " + Object.entries(porP).map(([k, m]) => k + " " + plata(m)).join(", ") + "\n";
  if (Object.keys(porS).length) t += "Lo vendido: " + Object.entries(porS).sort((x, y) => y[1][1] - x[1][1]).map(([k, o]) => k + " ×" + o[0] + " (" + plata(o[1]) + ")").join(", ") + "\n";
  t += "Este mes lleva " + plata(mesT) + ".\n";
  if (fp.length) t += "Te deben (fiados): " + plata(fp.reduce((s, f) => s + saldo(f), 0)) + " entre " + fp.length + (fp.length === 1 ? " persona.\n" : " personas.\n");
  if (bajo.length) t += "Inventario bajo: " + bajo.map(x => x.n + " (" + (Number(x.stock) || 0) + ")").join(", ") + ".\n";
  return t;
}

// ---------- herramientas
const HERR = [
  { name: "resumen_caja", description: "Resumen de la Caja de Meraki Barbershop: ventas, gastos, ganancia, formas de pago, lo más vendido, fiados pendientes e inventario bajo.", inputSchema: { type: "object", properties: { periodo: { type: "string", enum: ["hoy", "ayer", "semana", "mes"], description: "Por defecto hoy" } } }, annotations: { readOnlyHint: true } },
  { name: "precios", description: "Lista de servicios con sus precios vigentes hoy (el 15 de diciembre de 2026 suben solos) y de bebidas/productos del inventario.", inputSchema: { type: "object", properties: {} }, annotations: { readOnlyHint: true } },
  { name: "anotar_venta", description: "Anota un cobro en la Caja del CRM. Los precios salen solos de la lista vigente. Si el pago es 'fiado' queda en Fiados (necesita cliente). Las bebidas se descuentan del inventario. Confirmá con Jose lo que vas a anotar si algo no está claro.", inputSchema: { type: "object", required: ["pago"], properties: {
      servicios: { type: "array", items: { type: "string" }, description: "Nombres de servicios, ej. ['Combo el patrón']" },
      bebidas: { type: "array", items: { type: "string" }, description: "Nombres de bebidas o productos del inventario, ej. ['Gaseosa']" },
      extras: { type: "array", items: { type: "object", required: ["nombre", "monto"], properties: { nombre: { type: "string" }, monto: { type: "number" } } }, description: "Cobros que no están en la lista, ej. recargo de domicilio" },
      pago: { type: "string", enum: PAGOS }, cliente: { type: "string", description: "Nombre del cliente (opcional; obligatorio si es fiado)" } } } },
  { name: "anotar_gasto", description: "Anota un gasto en la Caja del CRM.", inputSchema: { type: "object", required: ["monto"], properties: {
      monto: { type: "number" }, categoria: { type: "string", enum: Object.keys(CAT_G), description: "renta, bebidas, insumos, servicios (luz/agua/internet), apps, tarjeta, otro" },
      detalle: { type: "string" }, pago: { type: "string", enum: ["efectivo", "tarjeta", "transferencia"] } } } },
  { name: "ver_movimientos", description: "Lista las ventas y gastos de un periodo con su id (para poder borrar uno).", inputSchema: { type: "object", properties: { periodo: { type: "string", enum: ["hoy", "ayer", "semana", "mes"] } } }, annotations: { readOnlyHint: true } },
  { name: "borrar_movimiento", description: "Borra una venta o un gasto por su id (de ver_movimientos). Devuelve las bebidas al inventario. Solo hacelo si Jose lo pide.", inputSchema: { type: "object", required: ["id"], properties: { id: { type: "string" } } }, annotations: { destructiveHint: true } },
  { name: "ver_fiados", description: "Quién le debe a Meraki y cuánto.", inputSchema: { type: "object", properties: {} }, annotations: { readOnlyHint: true } },
  { name: "registrar_pago_fiado", description: "Registra que alguien pagó (todo o un abono) lo que debía. Suma a la caja.", inputSchema: { type: "object", required: ["cliente"], properties: { cliente: { type: "string" }, monto: { type: "number", description: "Si no se da, paga todo lo que debe" }, pago: { type: "string", enum: ["efectivo", "tarjeta", "transferencia"] } } } },
  { name: "ver_inventario", description: "Cuántas bebidas y productos quedan.", inputSchema: { type: "object", properties: {} }, annotations: { readOnlyHint: true } },
  { name: "recibir_producto", description: "Suma unidades al inventario (compra de bebidas o productos). Si se da el costo, se anota también como gasto.", inputSchema: { type: "object", required: ["producto", "cantidad"], properties: { producto: { type: "string" }, cantidad: { type: "integer" }, costo_total: { type: "number" } } } },
  { name: "ajustar_inventario", description: "Pone la cantidad exacta que hay de un producto (cuando Jose cuenta lo que tiene).", inputSchema: { type: "object", required: ["producto", "cantidad"], properties: { producto: { type: "string" }, cantidad: { type: "integer" } } } },
  { name: "clientes_que_toca_corte", description: "Clientes de la Tarjeta Meraki y del CRM a los que ya les toca volver (pasaron su frecuencia, por defecto 3 semanas), con su teléfono.", inputSchema: { type: "object", properties: {} }, annotations: { readOnlyHint: true } }
];

async function llamar(env, n, a) {
  a = a || {};
  if (n === "precios") { const D = await cargar(env); return "Precios vigentes (" + ymdSV(Date.now()) + "):\n" + servicios().map(s => "- " + s[0] + ": " + plata(s[1])).join("\n") + "\nBebidas/productos:\n" + D.inv.filter(x => !x.borrado).map(x => "- " + x.n + ": " + plata(x.p) + " (quedan " + (Number(x.stock) || 0) + ")").join("\n"); }
  if (n === "resumen_caja") return resumen(await cargar(env), a.periodo || "hoy");
  if (n === "anotar_venta") {
    const D = await cargar(env), items = [], malos = [];
    for (const s of a.servicios || []) { const x = buscar(servicios(), s, y => y[0]); if (x) items.push({ n: x[0], m: x[1] }); else malos.push(s); }
    for (const s of a.bebidas || []) { const x = buscar(D.inv.filter(y => !y.borrado), s, y => y.n); if (x) items.push({ n: x.n, m: x.p, inv: x.id }); else malos.push(s); }
    for (const e of a.extras || []) if (Number(e.monto) > 0) items.push({ n: String(e.nombre || "Otro"), m: r2(e.monto) });
    if (malos.length) return "No anoté nada: no encontré " + malos.join(", ") + ". Servicios válidos: " + servicios().map(s => s[0]).join(", ") + ". Bebidas: " + D.inv.map(x => x.n).join(", ") + ".";
    if (!items.length) return "No anoté nada: falta qué servicio o producto se cobró.";
    const pago = PAGOS.includes(a.pago) ? a.pago : "efectivo", nom = String(a.cliente || "").trim();
    if (pago === "fiado" && !nom) return "Para fiar necesito el nombre del cliente.";
    const quien = nom ? buscar(D.personas.filter(p => !p.borrado && p.nombre), nom, p => p.nombre) : null;
    const v = { id: uid(), t: Date.now(), items, total: r2(items.reduce((s, i) => s + i.m, 0)), pago, pid: quien ? quien.id : null, nombre: nom, via: "claude" };
    await guardar(env, "v_", v);
    for (const i of items) if (i.inv) { const x = D.inv.find(y => y.id === i.inv); if (x) { x.stock = (Number(x.stock) || 0) - 1; await guardar(env, "i_", x); } }
    if (pago === "fiado") await guardar(env, "f_", { id: uid(), t: Date.now(), pid: v.pid, nombre: nom, tel: quien ? quien.tel || "" : "", monto: v.total, desc: items.map(i => i.n).join(", "), abonos: [], venta: v.id });
    const hoy = vivas(D).concat([v]).filter(x => x.t >= hoy0()).reduce((s, x) => s + dinero(x), 0);
    return "✓ Anotado: " + items.map(i => i.n + " " + plata(i.m)).join(" + ") + " = " + plata(v.total) + " (" + pago + ")" + (nom ? " · " + nom : "") + ". Hoy lleva " + plata(hoy) + " en caja. (En el CRM aparece al tocar ↻.)";
  }
  if (n === "anotar_gasto") {
    const m = r2(a.monto); if (!(m > 0)) return "Falta el monto del gasto.";
    const cat = CAT_G[a.categoria] ? a.categoria : "otro";
    await guardar(env, "g_", { id: uid(), t: Date.now(), cat, monto: m, desc: String(a.detalle || ""), pago: a.pago || "efectivo", via: "claude" });
    return "✓ Gasto anotado: " + plata(m) + " en " + CAT_G[cat] + (a.detalle ? " (" + a.detalle + ")" : "") + ".";
  }
  if (n === "ver_movimientos") {
    const D = await cargar(env), [x, y] = rango(a.periodo || "hoy"), f = (a.periodo || "hoy") === "hoy" ? hora : fecha;
    const M = vivas(D).filter(v => v.t >= x && v.t < y).map(v => ({ t: v.t, s: f(v.t) + " +" + plata(v.total) + " " + v.pago + " · " + (v.items || []).map(i => i.n).join(", ") + (v.nombre ? " · " + v.nombre : "") + " [id v_" + v.id + "]" }))
      .concat(gVivos(D).filter(g => g.t >= x && g.t < y).map(g => ({ t: g.t, s: f(g.t) + " -" + plata(g.monto) + " gasto " + (CAT_G[g.cat] || g.cat) + (g.desc ? " · " + g.desc : "") + " [id g_" + g.id + "]" }))).sort((p, q) => q.t - p.t);
    return M.length ? M.map(m => m.s).join("\n") : "Sin movimientos en ese periodo.";
  }
  if (n === "borrar_movimiento") {
    const D = await cargar(env), id = String(a.id || ""), pref = id.slice(0, 2), lid = id.slice(2);
    if (pref === "v_") { const v = D.ventas.find(x => x.id === lid); if (!v) return "No encontré esa venta."; v.borrado = true; await guardar(env, "v_", v);
      for (const i of v.items || []) if (i.inv) { const x = D.inv.find(y => y.id === i.inv); if (x) { x.stock = (Number(x.stock) || 0) + 1; await guardar(env, "i_", x); } }
      const fi = D.fiados.find(f => f.venta === v.id); if (fi) { fi.borrado = true; await guardar(env, "f_", fi); }
      return "✓ Venta de " + plata(v.total) + " borrada."; }
    if (pref === "g_") { const g = D.gastos.find(x => x.id === lid); if (!g) return "No encontré ese gasto."; g.borrado = true; await guardar(env, "g_", g); return "✓ Gasto de " + plata(g.monto) + " borrado."; }
    return "El id debe empezar con v_ o g_ (sacalo de ver_movimientos).";
  }
  if (n === "ver_fiados") { const D = await cargar(env), P = D.fiados.filter(f => !f.borrado && saldo(f) > 0.001); return P.length ? "Te deben " + plata(P.reduce((s, f) => s + saldo(f), 0)) + ":\n" + P.map(f => "- " + f.nombre + ": " + plata(saldo(f)) + (f.desc ? " (" + f.desc + ")" : "") + (f.tel ? " · tel " + f.tel : "") + " · desde " + fecha(f.t)).join("\n") : "Nadie le debe a Meraki."; }
  if (n === "registrar_pago_fiado") {
    const D = await cargar(env), P = D.fiados.filter(f => !f.borrado && saldo(f) > 0.001), f = buscar(P, a.cliente, x => x.nombre);
    if (!f) return "No encontré un fiado pendiente de «" + a.cliente + "». Pendientes: " + (P.map(x => x.nombre).join(", ") || "ninguno") + ".";
    const m = Math.min(saldo(f), a.monto ? r2(a.monto) : saldo(f)); if (!(m > 0)) return "Monto inválido.";
    const pago = a.pago || "efectivo"; f.abonos = f.abonos || []; f.abonos.push({ t: Date.now(), m, pago }); if (saldo(f) <= 0.001) f.pagado = Date.now();
    await guardar(env, "f_", f);
    await guardar(env, "v_", { id: uid(), t: Date.now(), items: [{ n: "Pago de fiado: " + f.nombre, m }], total: m, pago, pid: f.pid, nombre: f.nombre, abono: f.id, via: "claude" });
    return "✓ " + f.nombre + " pagó " + plata(m) + " (" + pago + "). " + (saldo(f) <= 0.001 ? "Ya está al día." : "Todavía debe " + plata(saldo(f)) + ".");
  }
  if (n === "ver_inventario") { const D = await cargar(env); return D.inv.filter(x => !x.borrado).map(x => "- " + x.n + ": " + (Number(x.stock) || 0) + (Number(x.stock) <= Number(x.min) ? " ⚠️ bajo" : "") + " · se vende a " + plata(x.p)).join("\n"); }
  if (n === "recibir_producto" || n === "ajustar_inventario") {
    const D = await cargar(env), x = buscar(D.inv.filter(y => !y.borrado), a.producto, y => y.n), c = parseInt(a.cantidad, 10);
    if (!x) return "No encontré «" + a.producto + "». Hay: " + D.inv.map(y => y.n).join(", ") + ". (Productos nuevos se crean en la app.)";
    if (isNaN(c) || (n === "recibir_producto" && c <= 0)) return "Cantidad inválida.";
    x.stock = n === "recibir_producto" ? (Number(x.stock) || 0) + c : c; await guardar(env, "i_", x);
    if (n === "recibir_producto" && Number(a.costo_total) > 0) await guardar(env, "g_", { id: uid(), t: Date.now(), cat: "bebidas", monto: r2(a.costo_total), desc: c + " " + x.n, pago: "efectivo", via: "claude" });
    return "✓ " + x.n + ": ahora hay " + x.stock + "." + (n === "recibir_producto" && Number(a.costo_total) > 0 ? " Gasto de " + plata(a.costo_total) + " anotado." : "");
  }
  if (n === "clientes_que_toca_corte") {
    const D = await cargar(env); let tm = []; try { tm = await listar(env, "clientes"); } catch {}
    const out = [], hoy = hoy0();
    for (const c of tm) {
      if (!c.ultimaVisita) continue; const p = D.personas.find(x => x.tmId === c.__id), fr = Number(p && p.frec) || 21;
      const dv = Math.floor((hoy - new Date(c.ultimaVisita).getTime()) / DIA); if (dv >= fr && dv < 60) out.push({ n: c.nombre, tel: c.telefono, dv, fr });
    }
    for (const p of D.personas.filter(x => !x.borrado && !x.tmId)) {
      const u = vivas(D).filter(v => v.pid === p.id).reduce((m, v) => Math.max(m, v.t), 0); if (!u) continue;
      const fr = Number(p.frec) || 21, dv = Math.floor((hoy - u) / DIA); if (dv >= fr && dv < 60) out.push({ n: p.nombre, tel: p.tel, dv, fr });
    }
    out.sort((x, y) => y.dv - x.dv);
    return out.length ? "Les toca su corte:\n" + out.map(o => "- " + o.n + (o.tel ? " (" + o.tel + ")" : "") + ": vino hace " + o.dv + " días (viene cada " + o.fr + ")").join("\n") : "A nadie le toca todavía.";
  }
  throw new Error("Herramienta desconocida: " + n);
}

// ---------- MCP (HTTP sin sesión)
async function rpc(env, m) {
  const ok = result => ({ jsonrpc: "2.0", id: m.id, result }), err = (code, message) => ({ jsonrpc: "2.0", id: m.id, error: { code, message } });
  if (m.id === undefined || m.id === null) return null; // notificación
  if (m.method === "initialize") return ok({ protocolVersion: (m.params && m.params.protocolVersion) || "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "Meraki Caja", version: "1.0.0" },
    instructions: "Caja de Meraki Barbershop (Apopa, El Salvador), la misma de la app Meraki CRM de Jose. Usá estas herramientas cuando Jose pida anotar un cobro, un gasto, un fiado, ver cuánto lleva, quién le debe, inventario o a quién le toca su corte. Montos en dólares. Respondé corto y en español salvadoreño." });
  if (m.method === "ping") return ok({});
  if (m.method === "tools/list") return ok({ tools: HERR });
  if (m.method === "tools/call") {
    try { const t = await llamar(env, m.params.name, m.params.arguments); return ok({ content: [{ type: "text", text: t }] }); }
    catch (e) { return ok({ content: [{ type: "text", text: "Error: " + e.message }], isError: true }); }
  }
  if (m.method === "resources/list") return ok({ resources: [] });
  if (m.method === "prompts/list") return ok({ prompts: [] });
  return err(-32601, "Método no soportado: " + m.method);
}
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", "access-control-allow-origin": "*", "access-control-allow-headers": "content-type" } });
const hex = n => [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, "0")).join("");

export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    if (req.method === "OPTIONS") return json({});
    if (u.pathname === "/") return json({ ok: true, servicio: "Meraki · conector de Claude" });
    // La app Meraki CRM manda la sesión de Jose. Solo se acepta si es de verdad la cuenta de Jose.
    if (u.pathname === "/vincular" && req.method === "POST") {
      const b = await req.json().catch(() => ({})); if (!b.rt) return json({ error: "falta rt" }, 400);
      const r = await fetch("https://securetoken.googleapis.com/v1/token?key=" + FB_KEY, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "grant_type=refresh_token&refresh_token=" + encodeURIComponent(b.rt) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.id_token || emailDe(j.id_token).toLowerCase() !== ADMIN) return json({ error: "Sesión no válida" }, 403);
      await env.KV.put("rt", j.refresh_token || b.rt); await env.KV.delete("ficha");
      let tok = await env.KV.get("tok"); if (!tok || b.nueva) { tok = hex(24); await env.KV.put("tok", tok); }
      return json({ url: u.origin + "/mcp/" + tok });
    }
    const m = u.pathname.match(/^\/mcp\/([a-f0-9]{48})\/?$/);
    if (m) {
      const tok = await env.KV.get("tok"); if (!tok || m[1] !== tok) return json({ error: "no" }, 404);
      if (req.method === "GET") return new Response("Method Not Allowed", { status: 405, headers: { allow: "POST" } });
      if (req.method === "DELETE") return new Response(null, { status: 204 });
      if (req.method !== "POST") return json({ error: "no" }, 405);
      const body = await req.json().catch(() => null); if (!body) return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "JSON inválido" } }, 400);
      if (Array.isArray(body)) { const out = (await Promise.all(body.map(x => rpc(env, x)))).filter(Boolean); return out.length ? json(out) : new Response(null, { status: 202 }); }
      const out = await rpc(env, body); return out ? json(out) : new Response(null, { status: 202 });
    }
    return json({ error: "no" }, 404);
  }
};
