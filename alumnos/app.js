// Meraki Alumnos: inscripciones, alumnos y mensualidades de Meraki Academy.
// Usa el mismo Firebase de la app de tarjetas. Sólo entra el correo del barbero.
import { firebaseConfig, ADMIN_EMAIL } from "../config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, updateDoc, deleteDoc, addDoc, collection, onSnapshot, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const fb = initializeApp(firebaseConfig, "alumnos");
const auth = getAuth(fb);
const db = getFirestore(fb);
const A = "academia_alumnos", PG = "academia_pagos";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = n => "$" + (Math.round((+n || 0) * 100) / 100).toFixed(2);
const pad = n => String(n).padStart(2, "0");
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const thisMonth = () => today().slice(0, 7);
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MESES_L = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const mLabel = (ym, long) => { const [y, m] = ym.split("-"); return (long ? MESES_L : MESES)[+m - 1] + " " + y; };
const fLabel = d => { if (!d) return ""; const [y, m, dd] = d.split("-"); return `${+dd} ${MESES[+m - 1]} ${y}`; };
const addMonth = (ym, k) => { let [y, m] = ym.split("-").map(Number); m += k; while (m > 12) { m -= 12; y++ } while (m < 1) { m += 12; y-- } return `${y}-${pad(m)}`; };
const monthsBetween = (a, b) => { const out = []; let c = a; while (c <= b && out.length < 120) { out.push(c); c = addMonth(c, 1) } return out; };
const initials = n => (n || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
const toast = msg => { const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); };

const IC = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  people: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.6c2 .7 3.2 2.5 3.6 5.4"/></svg>',
  cash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/></svg>',
  out: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l-4-4 4-4M6 12h10"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
  google: '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8.1z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.8 0-5.2-1.9-6.1-4.5H2.2v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.9 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.2a11 11 0 0 0 0 9.9z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.1 1.6l3.1-3.1A11 11 0 0 0 2.2 7.1l3.7 2.8C6.8 7.3 9.2 5.4 12 5.4z"/></svg>'
};

/* ---------- datos ---------- */
let ALUMNOS = [], PAGOS = [], stop = [];
let V = { tab: "home", filtro: "activo", q: "" };

function estadoDe(a) {
  const pagos = PAGOS.filter(p => p.alumnoId === a.id);
  const insc = +a.inscripcion || 0;
  const inscPag = pagos.filter(p => p.tipo === "inscripcion").reduce((s, p) => s + (+p.monto || 0), 0);
  const mens = +a.mensualidad || 0;
  const inicio = (a.inicio || today()).slice(0, 7);
  const fin = a.estado === "activo" ? thisMonth() : (a.fin || a.inicio || today()).slice(0, 7);
  const meses = (mens > 0 && inicio <= fin) ? monthsBetween(inicio, fin) : [];
  const porMes = {};
  pagos.filter(p => p.tipo === "mensualidad").forEach(p => { porMes[p.mes] = (porMes[p.mes] || 0) + (+p.monto || 0) });
  const detalle = meses.map(m => ({ mes: m, pagado: porMes[m] || 0, falta: Math.max(0, mens - (porMes[m] || 0)) }));
  const pendientes = detalle.filter(d => d.falta > 0.009);
  const deudaMens = pendientes.reduce((s, d) => s + d.falta, 0);
  const deudaInsc = Math.max(0, insc - inscPag);
  const atrasados = pendientes.filter(d => d.mes < thisMonth()).length;
  return { pagos, detalle, pendientes, deuda: deudaMens + deudaInsc, deudaInsc, deudaMens, atrasados, mesActualPagado: !pendientes.some(d => d.mes === thisMonth()) };
}
function pillDe(a, e) {
  if (a.estado === "pausado") return '<span class="pill off">Pausado</span>';
  if (a.estado === "terminado") return e.deuda > 0.009 ? `<span class="pill bad">Debe ${money(e.deuda)}</span>` : '<span class="pill off">Terminó</span>';
  if (e.atrasados > 0) return `<span class="pill bad">Debe ${e.atrasados + (e.mesActualPagado ? 0 : 1)} mes${e.atrasados + (e.mesActualPagado ? 0 : 1) > 1 ? "es" : ""}</span>`;
  if (e.deuda > 0.009) return `<span class="pill warn">Pendiente</span>`;
  return '<span class="pill ok">Al día</span>';
}

/* ---------- sesión ---------- */
const esAdmin = u => !!u && !!u.email && u.emailVerified && u.email.toLowerCase() === String(ADMIN_EMAIL).toLowerCase();
getRedirectResult(auth).catch(e => toast(errLogin(e)));
onAuthStateChanged(auth, u => {
  stop.forEach(f => { try { f() } catch { } }); stop = [];
  closeSheet();
  if (!u) return pantallaLogin();
  if (!esAdmin(u)) return pantallaNoAdmin(u);
  arrancar();
});
function errLogin(e) {
  const c = e && e.code || "";
  if (c.includes("popup-closed") || c.includes("cancelled")) return "Cancelaste el inicio de sesión.";
  if (c.includes("network")) return "Sin internet. Revisá tu conexión y probá otra vez.";
  return "No se pudo entrar (" + c + "). Probá otra vez.";
}
async function entrar() {
  const p = new GoogleAuthProvider(); p.setCustomParameters({ prompt: "select_account" });
  try { await signInWithPopup(auth, p) }
  catch (e) { const c = e && e.code || ""; if (c.includes("popup-blocked") || c.includes("operation-not-supported")) return signInWithRedirect(auth, p); toast(errLogin(e)) }
}
function pantallaLogin() {
  $("#tabs").hidden = true; $("#fab").hidden = true;
  $("#app").innerHTML = `<div class="hero"><div class="pole"></div><span class="lbl">Meraki Academy · Control</span><h1>Meraki <em>Alumnos</em></h1>
  <p class="muted">Inscripciones, lista de alumnos y mensualidades. Entrá con tu Gmail de barbero.</p>
  <button class="btn" id="login" type="button" style="background:#fff;color:#1f1f1f">${IC.google} Entrar con Google</button></div>`;
  $("#login").onclick = entrar;
}
function pantallaNoAdmin(u) {
  $("#tabs").hidden = true; $("#fab").hidden = true;
  $("#app").innerHTML = `<div class="hero"><h1>Meraki <em>Alumnos</em></h1><p>Esta app es privada. Entraste con ${esc(u.email || "otra cuenta")}.</p><button class="btn" id="lo" type="button">Entrar con otra cuenta</button></div>`;
  $("#lo").onclick = () => signOut(auth);
}

function arrancar() {
  const listo = { a: false, p: false }; const go = () => { if (listo.a && listo.p) render() };
  stop.push(onSnapshot(collection(db, A), s => { ALUMNOS = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es")); listo.a = true; go() }, err));
  stop.push(onSnapshot(collection(db, PG), s => { PAGOS = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.fecha || "").localeCompare(a.fecha || "") || (b.creado || 0) - (a.creado || 0)); listo.p = true; go() }, err));
}
const err = e => toast("No se pudo leer los datos: " + (e.code || e.message));

/* ---------- vistas ---------- */
function render() {
  const sheetOpen = !!$("#sheet .scrim");
  $("#tabs").hidden = false; $("#fab").hidden = false;
  const T = [["home", "Resumen", IC.home], ["alumnos", "Alumnos", IC.people], ["pagos", "Pagos", IC.cash]];
  $("#tabs nav").innerHTML = T.map(t => `<button type="button" data-tab="${t[0]}" ${V.tab === t[0] ? 'aria-current="page"' : ""}>${t[2]}${t[1]}</button>`).join("");
  $("#fab").setAttribute("aria-label", V.tab === "pagos" ? "Registrar pago" : "Inscribir alumno");
  const top = `<div class="top"><span class="brand">Meraki <span>Alumnos</span></span><button class="iconbtn" type="button" id="csv" aria-label="Descargar respaldo">${IC.down}</button><button class="iconbtn" type="button" id="salir" aria-label="Cerrar sesión">${IC.out}</button></div>`;
  $("#app").innerHTML = top + (V.tab === "home" ? vHome() : V.tab === "alumnos" ? vAlumnos() : vPagos());
  $("#salir").onclick = () => signOut(auth);
  $("#csv").onclick = exportar;
  const q = $("#q"); if (q) { q.oninput = e => { V.q = e.target.value; const p = q.selectionStart; render(); const n = $("#q"); n.focus(); n.setSelectionRange(p, p) } }
  if (sheetOpen && SHEET.refresh) SHEET.refresh();
}

function vHome() {
  const act = ALUMNOS.filter(a => a.estado === "activo");
  const mes = thisMonth();
  const cobradoMes = PAGOS.filter(p => (p.fecha || "").startsWith(mes)).reduce((s, p) => s + (+p.monto || 0), 0);
  const ests = ALUMNOS.map(a => [a, estadoDe(a)]);
  const porCobrar = ests.reduce((s, [, e]) => s + e.deuda, 0);
  const esperado = act.reduce((s, a) => s + (+a.mensualidad || 0), 0);
  const deben = ests.filter(([a, e]) => e.deuda > 0.009 && a.estado !== "pausado").sort((x, y) => y[1].deuda - x[1].deuda);
  if (!ALUMNOS.length) return `<div class="page-h"><span class="lbl">${mLabel(mes, true)}</span><h1>Resumen</h1></div>
   <div class="empty"><b style="color:var(--fg)">Todavía no tenés alumnos</b><span>Cuando inscribás al primero, aquí vas a ver cuánto cobraste en el mes y quién te debe.</span><button class="btn" type="button" data-new="alumno">Inscribir primer alumno</button></div>`;
  return `<div class="page-h"><span class="lbl">${mLabel(mes, true)}</span><h1>Resumen</h1></div>
  <div class="stats">
   <div class="stat gold"><span>Cobrado este mes</span><b>${money(cobradoMes)}</b></div>
   <div class="stat ${porCobrar > 0.009 ? "bad" : ""}"><span>Por cobrar</span><b>${money(porCobrar)}</b></div>
   <div class="stat"><span>Alumnos activos</span><b>${act.length}</b></div>
   <div class="stat"><span>Mensualidades del mes</span><b>${money(esperado)}</b></div>
  </div>
  <section class="block"><h2>Te deben</h2>${deben.length ? `<div class="list">${deben.map(([a, e]) => itemAlumno(a, e, `${e.pendientes.length ? e.pendientes.map(d => mLabel(d.mes)).join(", ") : ""}${e.deudaInsc > 0.009 ? (e.pendientes.length ? " · " : "") + "inscripción" : ""}`)).join("")}</div>` : '<div class="empty">Todos están al día. 👌</div>'}</section>
  <section class="block"><h2>Últimos pagos</h2>${PAGOS.length ? `<div class="list">${PAGOS.slice(0, 5).map(itemPago).join("")}</div>` : '<div class="empty">Todavía no hay pagos registrados.</div>'}</section>`;
}
function itemAlumno(a, e, sub) {
  return `<button type="button" class="item" data-alumno="${a.id}"><span class="av">${esc(initials(a.nombre))}</span><span style="min-width:0"><b>${esc(a.nombre)}</b><small>${esc(sub ?? [a.grupo, a.tel].filter(Boolean).join(" · "))}</small></span>${pillDe(a, e)}</button>`;
}
function itemPago(p) {
  const a = ALUMNOS.find(x => x.id === p.alumnoId);
  const que = p.tipo === "mensualidad" ? "Mensualidad " + mLabel(p.mes) : p.tipo === "inscripcion" ? "Inscripción" : (p.nota || "Otro");
  return `<button type="button" class="pay" data-pago="${p.id}"><span style="min-width:0"><b>${esc(a ? a.nombre : "Alumno borrado")}</b><small>${esc(que)} · ${fLabel(p.fecha)} · ${esc(p.metodo || "")}</small></span><span class="amt">${money(p.monto)}</span></button>`;
}
function vAlumnos() {
  const F = [["activo", "Activos"], ["deben", "Deben"], ["pausado", "Pausados"], ["terminado", "Terminaron"], ["todos", "Todos"]];
  const q = V.q.trim().toLowerCase();
  let L = ALUMNOS.map(a => [a, estadoDe(a)]);
  if (V.filtro === "deben") L = L.filter(([a, e]) => e.deuda > 0.009 && a.estado !== "pausado");
  else if (V.filtro !== "todos") L = L.filter(([a]) => a.estado === V.filtro);
  if (q) L = L.filter(([a]) => [a.nombre, a.tel, a.grupo].join(" ").toLowerCase().includes(q));
  const grupos = {}; L.forEach(x => { const g = x[0].grupo || "Sin grupo"; (grupos[g] = grupos[g] || []).push(x) });
  return `<div class="page-h"><span class="lbl">${ALUMNOS.length} inscritos en total</span><h1>Alumnos</h1></div>
  <div style="display:grid;gap:10px"><input class="search" id="q" type="search" placeholder="Buscar por nombre, teléfono o grupo" value="${esc(V.q)}" aria-label="Buscar alumno">
  <div class="filters">${F.map(f => `<button type="button" data-f="${f[0]}" aria-pressed="${V.filtro === f[0]}">${f[1]}</button>`).join("")}</div></div>
  ${L.length ? Object.keys(grupos).sort().map(g => `<section class="block"><span class="lbl">${esc(g)} · ${grupos[g].length}</span><div class="list">${grupos[g].map(([a, e]) => itemAlumno(a, e)).join("")}</div></section>`).join("")
      : `<div class="empty" style="margin-top:16px">${ALUMNOS.length ? "Nadie en esta lista." : "Todavía no hay alumnos."}<button class="btn sm" type="button" data-new="alumno">Inscribir alumno</button></div>`}`;
}
function vPagos() {
  if (!PAGOS.length) return `<div class="page-h"><h1>Pagos</h1></div><div class="empty">Todavía no hay pagos registrados.${ALUMNOS.length ? '<button class="btn sm" type="button" data-new="pago">Registrar pago</button>' : ""}</div>`;
  const por = {}; PAGOS.forEach(p => { const m = (p.fecha || "").slice(0, 7) || "sin fecha"; (por[m] = por[m] || []).push(p) });
  return `<div class="page-h"><span class="lbl">Historial</span><h1>Pagos</h1></div>` +
    Object.keys(por).sort().reverse().map(m => { const tot = por[m].reduce((s, p) => s + (+p.monto || 0), 0); return `<div class="row month-h" style="justify-content:space-between"><span>${m === "sin fecha" ? m : mLabel(m, true).toUpperCase()}</span><span class="num">${money(tot)}</span></div><div class="list">${por[m].map(itemPago).join("")}</div>` }).join("");
}

/* ---------- hoja inferior ---------- */
let SHEET = {};
function openSheet(title, html, bind, refresh) {
  $("#sheet").innerHTML = `<div class="scrim"><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="sheet-h"><h2>${esc(title)}</h2><button class="iconbtn" type="button" data-close aria-label="Cerrar">${IC.x}</button></div><div id="sb">${html}</div></div></div>`;
  SHEET = { refresh };
  $("#sheet .scrim").addEventListener("click", e => { if (e.target.classList.contains("scrim") || e.target.closest("[data-close]")) closeSheet() });
  bind && bind($("#sheet .sheet"));
  const f = $("#sheet input"); if (f && !f.value) setTimeout(() => f.focus(), 50);
}
function closeSheet() { const s = $("#sheet"); if (s) s.innerHTML = ""; SHEET = {} }

function formAlumno(a) {
  const n = !a; a = a || { estado: "activo", inicio: today(), inscripcion: 25, mensualidad: 85, grupo: (ALUMNOS[0] && ALUMNOS[0].grupo) || "Grupo 1" };
  const grupos = [...new Set(ALUMNOS.map(x => x.grupo).filter(Boolean))];
  openSheet(n ? "Inscribir alumno" : "Editar alumno", `<form class="form" id="fa">
   <label>Nombre completo<input id="a_nombre" required maxlength="80" value="${esc(a.nombre)}" autocomplete="off"></label>
   <label>WhatsApp<input id="a_tel" inputmode="tel" maxlength="20" placeholder="7000 0000" value="${esc(a.tel)}"></label>
   <label>Grupo<input id="a_grupo" list="dl_grupos" maxlength="40" value="${esc(a.grupo)}" placeholder="Grupo 1 · Lunes"></label><datalist id="dl_grupos">${grupos.map(g => `<option value="${esc(g)}">`).join("")}</datalist>
   <div class="two"><label>Fecha de inscripción<input id="a_inicio" type="date" required value="${esc(a.inicio)}"></label><label>Estado<select id="a_estado">${[["activo", "Activo"], ["pausado", "Pausado"], ["terminado", "Terminó"]].map(o => `<option value="${o[0]}" ${a.estado === o[0] ? "selected" : ""}>${o[1]}</option>`).join("")}</select></label></div>
   <div class="two"><label>Inscripción ($)<input id="a_insc" type="number" min="0" step="0.5" inputmode="decimal" value="${esc(a.inscripcion)}"></label><label>Mensualidad ($)<input id="a_mens" type="number" min="0" step="0.5" inputmode="decimal" value="${esc(a.mensualidad)}"></label></div>
   ${n ? `<label style="display:flex;gap:10px;align-items:center;color:var(--fg)"><input id="a_pagoinsc" type="checkbox" checked style="width:20px;height:20px"> Ya pagó la inscripción hoy</label>` : ""}
   <label>Notas<textarea id="a_notas" maxlength="500" placeholder="Nivel, kit, horario…">${esc(a.notas)}</textarea></label>
   <button class="btn wide" type="submit">${n ? "Inscribir" : "Guardar cambios"}</button></form>`, s => {
    $("#fa", s).onsubmit = async e => {
      e.preventDefault();
      const est = $("#a_estado", s).value;
      const d = { nombre: $("#a_nombre", s).value.trim(), tel: $("#a_tel", s).value.trim(), grupo: $("#a_grupo", s).value.trim(), inicio: $("#a_inicio", s).value, estado: est, inscripcion: +$("#a_insc", s).value || 0, mensualidad: +$("#a_mens", s).value || 0, notas: $("#a_notas", s).value.trim() };
      if (!d.nombre) return toast("Poné el nombre del alumno.");
      if (est !== "activo" && (!a.estado || a.estado === "activo")) d.fin = today();
      if (est === "activo") d.fin = null;
      const btn = $("button[type=submit]", s); btn.disabled = true;
      try {
        if (n) {
          d.creado = Date.now();
          const ref = await addDoc(collection(db, A), d);
          if ($("#a_pagoinsc", s).checked && d.inscripcion > 0) await addDoc(collection(db, PG), { alumnoId: ref.id, tipo: "inscripcion", mes: thisMonth(), monto: d.inscripcion, fecha: today(), metodo: "Efectivo", creado: Date.now() });
          toast("Alumno inscrito."); closeSheet(); verAlumno(ref.id);
        } else { await updateDoc(doc(db, A, a.id), d); toast("Cambios guardados."); verAlumno(a.id) }
      } catch (er) { btn.disabled = false; toast("No se pudo guardar: " + (er.code || er.message)) }
    };
  });
}

function verAlumno(id) {
  const html = () => {
    const a = ALUMNOS.find(x => x.id === id); if (!a) return '<p class="muted">Este alumno ya no existe.</p>';
    const e = estadoDe(a);
    const tel = (a.tel || "").replace(/\D/g, ""); const wa = tel ? (tel.length === 8 ? "503" + tel : tel) : "";
    const meses = e.detalle.slice(-12);
    const msg = encodeURIComponent(`Hola ${a.nombre.split(" ")[0]}, te saluda Jose de Meraki Academy. Te recuerdo que tenés pendiente ${e.pendientes.length ? "la mensualidad de " + e.pendientes.map(d => mLabel(d.mes, true)).join(", ") : "la inscripción"} por ${money(e.deuda)}. ¡Gracias!`);
    return `<div class="detail-h"><span class="av">${esc(initials(a.nombre))}</span><div style="min-width:0;display:grid;gap:4px"><b style="font-size:19px">${esc(a.nombre)}</b><div class="row">${pillDe(a, e)}<span class="muted" style="font-size:13px">${esc(a.grupo || "")}</span></div></div></div>
    <dl class="kv"><dt>WhatsApp</dt><dd class="num">${esc(a.tel || "—")}</dd><dt>Inscrito</dt><dd>${fLabel(a.inicio)}</dd><dt>Inscripción</dt><dd class="num">${money(a.inscripcion)}${e.deudaInsc > 0.009 ? ` <span style="color:var(--bad)">(falta ${money(e.deudaInsc)})</span>` : ' <span style="color:var(--ok)">✓</span>'}</dd><dt>Mensualidad</dt><dd class="num">${money(a.mensualidad)}</dd><dt>Debe en total</dt><dd class="num" style="color:${e.deuda > 0.009 ? "var(--bad)" : "var(--ok)"}">${money(e.deuda)}</dd></dl>
    ${meses.length ? `<div style="display:grid;gap:6px"><span class="lbl">Mensualidades</span><div class="months">${meses.map(d => `<span class="${d.falta < 0.01 ? "ok" : d.pagado > 0 ? "warn" : "bad"}">${mLabel(d.mes)} ${d.falta < 0.01 ? "✓" : d.pagado > 0 ? "½" : "✗"}</span>`).join("")}</div></div>` : ""}
    ${a.notas ? `<p class="muted" style="font-size:14.5px;white-space:pre-wrap">${esc(a.notas)}</p>` : ""}
    <div class="row"><button class="btn" type="button" data-pay="${a.id}" style="flex:1">Registrar pago</button>${wa && e.deuda > 0.009 ? `<a class="btn ghost" href="https://wa.me/${wa}?text=${msg}" target="_blank" rel="noopener" style="text-decoration:none;flex:1">Recordar por WhatsApp</a>` : ""}</div>
    ${e.pagos.length ? `<div style="display:grid;gap:8px"><span class="lbl">Pagos de ${esc(a.nombre.split(" ")[0])}</span>${e.pagos.map(itemPago).join("")}</div>` : ""}
    <div class="row" style="justify-content:space-between;border-top:1px solid var(--line);padding-top:12px"><button class="btn ghost sm" type="button" data-edit="${a.id}">Editar datos</button><button class="btn danger sm" type="button" id="del">Borrar alumno</button></div><div id="delbox"></div>`;
  };
  const bind = s => {
    const d = $("#del", s); if (d) d.onclick = () => {
      $("#delbox", s).innerHTML = `<div class="confirm"><b>¿Borrar a este alumno y todos sus pagos?</b><span class="muted" style="font-size:14px">No se puede deshacer. Si sólo dejó de venir, mejor cambiá su estado a "Terminó".</span><div class="row"><button class="btn danger sm" type="button" id="del2">Sí, borrar</button><button class="btn ghost sm" type="button" id="del0">Cancelar</button></div></div>`;
      $("#del0", s).onclick = () => $("#delbox", s).innerHTML = "";
      $("#del2", s).onclick = async () => { try { const b = writeBatch(db); PAGOS.filter(p => p.alumnoId === id).forEach(p => b.delete(doc(db, PG, p.id))); b.delete(doc(db, A, id)); await b.commit(); toast("Alumno borrado."); closeSheet() } catch (er) { toast("No se pudo borrar: " + (er.code || er.message)) } };
    };
  };
  openSheet("Alumno", html(), bind, () => { $("#sb").innerHTML = html(); bind($("#sheet .sheet")) });
}

function formPago(alumnoId, p) {
  const n = !p;
  if (!ALUMNOS.length) return toast("Primero inscribí un alumno.");
  let tipo = p ? p.tipo : "mensualidad";
  const sel = alumnoId || (p && p.alumnoId) || "";
  const sugerirMes = id => { const a = ALUMNOS.find(x => x.id === id); if (!a) return thisMonth(); const e = estadoDe(a); return e.pendientes.length ? e.pendientes[0].mes : thisMonth(); };
  const sugerirMonto = (id, t) => { const a = ALUMNOS.find(x => x.id === id); if (!a) return ""; const e = estadoDe(a); if (t === "inscripcion") return e.deudaInsc || a.inscripcion || ""; if (t === "mensualidad") { const m = e.pendientes[0]; return m ? m.falta : a.mensualidad || "" } return "" };
  const activos = ALUMNOS.filter(a => a.estado !== "terminado" || a.id === sel);
  openSheet(n ? "Registrar pago" : "Editar pago", `<form class="form" id="fp">
   <label>Alumno<select id="p_al" required><option value="">Escogé un alumno</option>${(activos.length ? activos : ALUMNOS).map(a => `<option value="${a.id}" ${a.id === sel ? "selected" : ""}>${esc(a.nombre)}${a.grupo ? " · " + esc(a.grupo) : ""}</option>`).join("")}</select></label>
   <div style="display:grid;gap:5px"><span style="font-size:13px;font-weight:700;color:var(--muted)">¿Qué paga?</span><div class="seg" id="p_tipo">${[["mensualidad", "Mensualidad"], ["inscripcion", "Inscripción"], ["otro", "Otro"]].map(o => `<button type="button" data-t="${o[0]}" aria-pressed="${tipo === o[0]}">${o[1]}</button>`).join("")}</div></div>
   <label id="l_mes">Mes que paga<input id="p_mes" type="month" value="${esc(p ? p.mes : sugerirMes(sel))}"></label>
   <div class="two"><label>Monto ($)<input id="p_monto" type="number" min="0.01" step="0.01" inputmode="decimal" required value="${esc(p ? p.monto : sugerirMonto(sel, tipo))}"></label><label>Fecha<input id="p_fecha" type="date" required value="${esc(p ? p.fecha : today())}"></label></div>
   <label>Forma de pago<select id="p_met">${["Efectivo", "Transferencia", "Tarjeta", "Otro"].map(m => `<option ${p && p.metodo === m ? "selected" : ""}>${m}</option>`).join("")}</select></label>
   <label id="l_nota">Detalle<input id="p_nota" maxlength="80" placeholder="Kit, material, examen…" value="${esc(p ? p.nota : "")}"></label>
   <button class="btn wide" type="submit">${n ? "Guardar pago" : "Guardar cambios"}</button>
   ${n ? "" : '<button class="btn danger wide" type="button" id="p_del">Borrar este pago</button><div id="pdelbox"></div>'}</form>`, s => {
    const sync = () => { $("#l_mes", s).hidden = tipo !== "mensualidad"; $("#l_nota", s).hidden = tipo !== "otro"; $$("#p_tipo button", s).forEach(b => b.setAttribute("aria-pressed", b.dataset.t === tipo)) };
    $$("#p_tipo button", s).forEach(b => b.onclick = () => { tipo = b.dataset.t; if (n) $("#p_monto", s).value = sugerirMonto($("#p_al", s).value, tipo); sync() });
    $("#p_al", s).onchange = e => { if (n) { $("#p_mes", s).value = sugerirMes(e.target.value); $("#p_monto", s).value = sugerirMonto(e.target.value, tipo) } };
    sync();
    $("#fp", s).onsubmit = async e => {
      e.preventDefault();
      const d = { alumnoId: $("#p_al", s).value, tipo, mes: tipo === "mensualidad" ? $("#p_mes", s).value : ($("#p_fecha", s).value || today()).slice(0, 7), monto: Math.round((+$("#p_monto", s).value || 0) * 100) / 100, fecha: $("#p_fecha", s).value, metodo: $("#p_met", s).value, nota: tipo === "otro" ? $("#p_nota", s).value.trim() : "" };
      if (!d.alumnoId) return toast("Escogé el alumno.");
      if (!(d.monto > 0)) return toast("Poné el monto.");
      if (!d.mes) return toast("Escogé el mes.");
      const btn = $("button[type=submit]", s); btn.disabled = true;
      try {
        if (n) { d.creado = Date.now(); await addDoc(collection(db, PG), d); toast("Pago guardado: " + money(d.monto)) }
        else { await updateDoc(doc(db, PG, p.id), d); toast("Pago actualizado.") }
        verAlumno(d.alumnoId);
      } catch (er) { btn.disabled = false; toast("No se pudo guardar: " + (er.code || er.message)) }
    };
    const del = $("#p_del", s); if (del) del.onclick = () => {
      $("#pdelbox", s).innerHTML = `<div class="confirm"><b>¿Borrar este pago de ${money(p.monto)}?</b><div class="row"><button class="btn danger sm" type="button" id="pd2">Sí, borrar</button><button class="btn ghost sm" type="button" id="pd0">Cancelar</button></div></div>`;
      $("#pd0", s).onclick = () => $("#pdelbox", s).innerHTML = "";
      $("#pd2", s).onclick = async () => { try { await deleteDoc(doc(db, PG, p.id)); toast("Pago borrado."); verAlumno(p.alumnoId) } catch (er) { toast("No se pudo borrar: " + (er.code || er.message)) } };
    };
  });
}

/* ---------- respaldo ---------- */
function exportar() {
  const q = v => '"' + String(v ?? "").replace(/"/g, '""') + '"';
  const filas = [["Alumno", "WhatsApp", "Grupo", "Estado", "Inscrito", "Inscripción", "Mensualidad", "Debe"].map(q).join(",")];
  ALUMNOS.forEach(a => { const e = estadoDe(a); filas.push([a.nombre, a.tel, a.grupo, a.estado, a.inicio, a.inscripcion, a.mensualidad, e.deuda.toFixed(2)].map(q).join(",")) });
  filas.push(""); filas.push(["Fecha", "Alumno", "Tipo", "Mes", "Monto", "Forma de pago", "Detalle"].map(q).join(","));
  PAGOS.forEach(p => { const a = ALUMNOS.find(x => x.id === p.alumnoId); filas.push([p.fecha, a ? a.nombre : "", p.tipo, p.mes, p.monto, p.metodo, p.nota].map(q).join(",")) });
  const blob = new Blob(["﻿" + filas.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob); const l = document.createElement("a"); l.href = url; l.download = `meraki-alumnos-${today()}.csv`; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast("Respaldo descargado.");
}

/* ---------- eventos ---------- */
document.addEventListener("click", e => {
  const t = e.target;
  const tab = t.closest("[data-tab]"); if (tab) { V.tab = tab.dataset.tab; render(); scrollTo({ top: 0 }); return }
  const f = t.closest("[data-f]"); if (f) { V.filtro = f.dataset.f; render(); return }
  const al = t.closest("[data-alumno]"); if (al) { verAlumno(al.dataset.alumno); return }
  const pg = t.closest("[data-pago]"); if (pg) { const p = PAGOS.find(x => x.id === pg.dataset.pago); if (p) formPago(null, p); return }
  const pay = t.closest("[data-pay]"); if (pay) { formPago(pay.dataset.pay); return }
  const ed = t.closest("[data-edit]"); if (ed) { formAlumno(ALUMNOS.find(x => x.id === ed.dataset.edit)); return }
  const nw = t.closest("[data-new]"); if (nw) { nw.dataset.new === "pago" ? formPago() : formAlumno(); return }
  if (t.closest("#fab")) { V.tab === "pagos" ? formPago() : formAlumno(); return }
});
document.addEventListener("keydown", e => { if (e.key === "Escape") closeSheet() });
