// Meraki Barbershop — tarjeta de fidelidad (app para barbero y clientes)
import { firebaseConfig, ADMIN_EMAIL } from "./config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut, deleteUser } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, updateDoc, deleteDoc, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ---------------- Constantes ---------------- */
const DEFAULT_CFG = {
  meta: 8, premio: "corte gratis", diasInactivo: 30, telBarberia: "",
  plantillas: {
    sello: "¡Qué onda {nombre}! Gracias por venir a Meraki Barbershop 💈\nYa llevás {sellos} de {meta} sellos en tu tarjeta. Te faltan {faltan} para tu {premio}.",
    premio: "{nombre}, ¡completaste tu tarjeta Meraki! 🏆\nEn tu próxima visita tenés {premio}. Escribinos para apartarte tu espacio.",
    extranamos: "¡{nombre}! Hace rato no te vemos por Meraki 👀\nTu tarjeta va en {sellos}/{meta} sellos. Esta semana te esperamos, ¿te apartamos un espacio?",
    cumple: "¡Feliz cumpleaños, {nombre}! 🎂\nDe parte de Meraki Barbershop: en tu visita de este mes te damos sello doble.",
    promo: "Hola {nombre}, te escribimos de Meraki Barbershop.\n",
    tarjeta: "¡{nombre}, aquí va tu tarjeta Meraki! 💈\nGuardala en tu galería y enseñala cada vez que vengás para sumar tu sello. Llevás {sellos} de {meta}.",
    app: "¡{nombre}! Ya tenemos app de Meraki Barbershop 💈 Descargala, entrá con tu Gmail y ahí ves tus sellos en vivo: [link de la Play Store]"
  }
};
const TPL_NAMES = {sello:"Sello agregado", premio:"Premio listo", extranamos:"Te extrañamos", cumple:"Cumpleaños", promo:"Promoción libre", tarjeta:"Enviar tarjeta (imagen)"};
const VARS = ["{nombre}","{sellos}","{meta}","{faltan}","{premio}","{visitas}","{telefono}"];
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const ICON = {
  scissors:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"/></svg>',
  star:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/></svg>',
  wa:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.6-.3Z"/></svg>',
  mail:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  scan:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M7 12h10"/></svg>',
  google:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.6 3.8-5.4 3.8-3.3 0-5.9-2.7-5.9-6s2.6-6 5.9-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.6 2.3 2.3 6.6 2.3 12s4.3 9.7 9.7 9.7c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.6H12z"/></svg>'
};

/* ---------------- Utilidades ---------------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const nowISO = () => new Date().toISOString();
const daysSince = iso => iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 864e5) : null;
const fmtDate = iso => iso ? new Date(iso).toLocaleDateString("es-SV",{day:"numeric",month:"short",year:"numeric"}) : "—";
const tier = v => v >= 25 ? "oro" : v >= 10 ? "plata" : "bronce";
const tierName = t => ({oro:"Oro",plata:"Plata",bronce:"Bronce"}[t]);
const cardNo = c => String(c.id||"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(-8);
const waNumber = tel => { const d = String(tel||"").replace(/\D/g,""); if (!d) return ""; return d.length === 8 ? "503"+d : d; };
const fmtTel = tel => { const d = String(tel||"").replace(/\D/g,""); return d.length===8 ? d.slice(0,4)+" "+d.slice(4) : (tel||""); };
const firstName = c => (c.nombre||"").trim().split(/\s+/)[0] || "";
const isBirthMonth = c => !!c.cumple && Number(c.cumple.split("-")[0]) === new Date().getMonth()+1;
const qrText = c => "MERAKI:" + c.id;
const idFromText = t => { const s = String(t||"").trim(); const m = s.match(/^MERAKI:([A-Za-z0-9_-]+)$/) || s.match(/#c-([A-Za-z0-9_-]+)/); return m ? m[1] : null; };
const waLink = (tel, text) => waNumber(tel) ? "https://wa.me/"+waNumber(tel)+"?text="+encodeURIComponent(text) : null;
const gmailLink = ({to="",bcc="",su,body}) => "https://mail.google.com/mail/?view=cm&fs=1"+(to?"&to="+encodeURIComponent(to):"")+(bcc?"&bcc="+encodeURIComponent(bcc):"")+"&su="+encodeURIComponent(su)+"&body="+encodeURIComponent(body);

let cfg = structuredClone(DEFAULT_CFG);
function estado(c){
  if ((c.sellos||0) >= cfg.meta) return "premio";
  const d = daysSince(c.ultimaVisita || c.creado);
  return d !== null && d >= cfg.diasInactivo ? "inactivo" : "activo";
}
const ESTADO_TXT = {premio:"Premio listo", inactivo:"Inactivo", activo:"Activo"};
function fill(tpl, c){
  const s = c.sellos||0;
  return String(tpl||"").replaceAll("{nombre}", firstName(c))
    .replaceAll("{sellos}", Math.min(s,cfg.meta)).replaceAll("{meta}", cfg.meta)
    .replaceAll("{faltan}", Math.max(cfg.meta-s,0)).replaceAll("{premio}", cfg.premio)
    .replaceAll("{visitas}", c.visitasTotales||0).replaceAll("{telefono}", fmtTel(cfg.telBarberia));
}
function mergeCfg(v){ return {...structuredClone(DEFAULT_CFG), ...v, plantillas:{...DEFAULT_CFG.plantillas, ...(v?.plantillas||{})}}; }

let toastTimer;
function toast(msg, actionHTML){
  $("#toast-root").innerHTML = '<div class="toast" role="status"><span>'+esc(msg)+'</span>'+(actionHTML||"")+'</div>';
  clearTimeout(toastTimer); toastTimer = setTimeout(() => $("#toast-root").innerHTML = "", actionHTML ? 7000 : 2800);
}
async function copy(text, ok){
  try { await navigator.clipboard.writeText(text); toast(ok||"Copiado"); }
  catch { toast("No se pudo copiar. Mantené presionado el texto para copiarlo."); }
}
function stampsHTML(c, big, fresh){
  const n = cfg.meta, s = Math.min(c.sellos||0, n);
  let h = '<div class="stamps'+(big?" big":"")+'" style="--n:'+n+'" aria-label="'+s+' de '+n+' sellos">';
  for (let i=1;i<=n;i++){
    const on=i<=s, last=i===n, f = on && i===s && fresh ? " fresh":"";
    h += '<span class="stamp'+(on?" on":"")+(last?" last":"")+f+'">'+(on?ICON.scissors:(last?ICON.star:""))+'</span>';
  }
  return h+'</div>';
}
function qrSVG(text){
  if (!window.qrcode) return '<span class="muted">El código no cargó. Revisá tu internet.</span>';
  const q = qrcode(0,"M"); q.addData(text); q.make();
  return q.createSvgTag({cellSize:6, margin:2, scalable:true});
}
const sheet = inner => { $("#sheet-root").innerHTML = '<div class="scrim" data-close></div><div class="sheet" role="dialog" aria-modal="true"><button class="x" data-close aria-label="Cerrar">×</button>'+inner+'</div>'; };
const closeSheetEl = () => { $("#sheet-root").innerHTML = ""; };

/* ---------------- Arranque ---------------- */
const configured = firebaseConfig && firebaseConfig.apiKey && !String(firebaseConfig.apiKey).startsWith("PEGA");
if (!configured){
  $("#app").innerHTML = '<div class="hero"><h1>Meraki <em>Barbershop</em></h1><div class="panel"><h2>Falta configurar</h2><p>Abrí el archivo <b>config.js</b> y pegá los datos de tu proyecto de Firebase y tu correo de barbero. La guía te dice paso a paso.</p></div></div>';
  throw new Error("Falta config.js");
}
const fbApp = initializeApp(firebaseConfig);
const auth = getAuth(fbApp);
const db = getFirestore(fbApp);
const isAdminUser = u => !!u && !!u.email && u.emailVerified && u.email.toLowerCase() === String(ADMIN_EMAIL).toLowerCase();
let stopFns = [];
const stopAll = () => { stopFns.forEach(f => { try{f()}catch{} }); stopFns = []; };

getRedirectResult(auth).catch(e => toast(loginError(e)));
onAuthStateChanged(auth, u => {
  stopAll(); closeSheetEl();
  if (!u) return renderLogin();
  if (isAdminUser(u)) return Admin.start(u);
  $("#app").innerHTML = '<div class="hero"><h1>Meraki <em>Barbershop</em></h1><div class="panel"><h2>App privada</h2><p>Esta app es solo para el barbero de Meraki. Entraste con '+esc(u.email||"otra cuenta")+'.</p><div class="actions"><button class="btn gold" data-logout>Entrar con otra cuenta</button></div></div></div>';
});
function loginError(e){
  const c = e && e.code || "";
  if (c.includes("popup-closed")||c.includes("cancelled")) return "Cancelaste el inicio de sesión.";
  if (c.includes("network")) return "Sin internet. Revisá tu conexión y probá otra vez.";
  if (c.includes("unauthorized-domain")) return "Este sitio no está autorizado en Firebase. Revisá el paso de dominios en la guía.";
  return "No se pudo entrar ("+c+"). Probá otra vez.";
}
async function login(){
  const p = new GoogleAuthProvider(); p.setCustomParameters({prompt:"select_account"});
  try { await signInWithPopup(auth, p); }
  catch (e) {
    const c = e && e.code || "";
    if (c.includes("popup-blocked") || c.includes("operation-not-supported")) return signInWithRedirect(auth, p);
    toast(loginError(e));
  }
}
document.addEventListener("click", ev => {
  const t = ev.target.closest("[data-login],[data-logout],[data-close]"); if (!t) return;
  if (t.hasAttribute("data-login")) login();
  if (t.hasAttribute("data-logout")) signOut(auth);
  if (t.hasAttribute("data-close")) { closeSheetEl(); Admin.onSheetClosed?.(); }
});

function renderLogin(){
  $("#app").innerHTML =
    '<div class="hero">'+
      '<div><div class="label">Apopa · El Salvador</div><h1>Meraki <em>Barbershop</em></h1></div>'+
      '<p>Panel de tarjetas de fidelidad. Entrá con tu Gmail de barbero.</p>'+
      '<button class="btn lg" data-login style="background:#fff;color:#1f1f1f;border-color:#fff">'+ICON.google+'Entrar con Google</button>'+
    '</div>';
}

/* ================================================================
   CLIENTE
   ================================================================ */
const Client = {
  me: null, user: null, editing: false, lastSellos: null,
  start(u){
    this.user = u; this.me = null; this.editing = false;
    $("#app").innerHTML = '<div class="loading">Cargando tu tarjeta…</div>';
    const slow = setTimeout(() => { if (!this.me) $("#app").innerHTML = '<div class="loading">No se puede conectar todavía. Revisá tu internet.</div>'; }, 10000);
    stopFns.push(onSnapshot(doc(db,"config","programa"), s => { cfg = mergeCfg(s.exists() ? s.data() : {}); this.render(); }, () => {}));
    stopFns.push(onSnapshot(doc(db,"clientes",u.uid), s => {
      clearTimeout(slow);
      this.me = s.exists() ? {id:s.id, ...s.data()} : false;
      this.render();
    }, e => { clearTimeout(slow); $("#app").innerHTML = '<div class="loading">No se pudo abrir tu tarjeta ('+esc(e.code)+').</div>'; }));
  },
  render(){
    if (this.me === null) return;
    if (this.me === false || this.editing) return this.renderForm();
    const c = this.me, e = estado(c), t = tier(c.visitasTotales||0);
    const fresh = this.lastSellos !== null && (c.sellos||0) > this.lastSellos;
    if (fresh) toast("¡Sello nuevo! Llevás "+Math.min(c.sellos,cfg.meta)+" de "+cfg.meta);
    this.lastSellos = c.sellos||0;
    const wa = cfg.telBarberia ? waLink(cfg.telBarberia, "Hola Meraki, quiero apartar un espacio. Soy "+c.nombre+".") : null;
    const hist = (c.historial||[]).slice(0,6).map(h=>'<li><span>'+({visita:"Visita",canje:"Premio canjeado",ajuste:"Ajuste"}[h.t]||h.t)+(h.nota?" · "+esc(h.nota):"")+'</span><span>'+fmtDate(h.fecha)+'</span></li>').join("") || '<li><span>Todavía no hay visitas</span><span></span></li>';
    $("#app").innerHTML =
      '<header class="top"><div class="brand"><h1>Meraki <em>Barbershop</em></h1><button class="linkbtn" data-logout>Salir</button></div></header>'+
      '<div class="client">'+
        '<h2 style="font-size:28px">Hola, '+esc(firstName(c))+'</h2>'+
        (e==="premio" ? '<div class="premio-banner"><h3>¡Llenaste tu tarjeta!</h3><span>En tu próxima visita tenés '+esc(cfg.premio)+'. Enseñá tu código al llegar.</span></div>' : '')+
        '<div class="loyal"><div class="head"><span class="wm">Meraki</span><span class="tier '+t+'">'+tierName(t)+'</span></div>'+
          stampsHTML(c,true,fresh)+
          '<div class="head"><span class="count num">'+Math.min(c.sellos||0,cfg.meta)+' / '+cfg.meta+'</span><span class="label">'+(e==="premio"?"Premio listo":"Faltan "+(cfg.meta-(c.sellos||0))+" · "+esc(cfg.premio))+'</span></div></div>'+
        '<div class="qrbox">'+qrSVG(qrText(c))+'<span class="num">Nº '+esc(cardNo(c))+'</span><span style="font-size:13px;text-align:center">Enseñá este código en cada visita para sumar tu sello.</span></div>'+
        (wa ? '<a class="btn wa lg" href="'+esc(wa)+'" target="_blank" rel="noopener">'+ICON.wa+'Apartar espacio por WhatsApp</a>' : '')+
        '<dl class="kv"><dt>Visitas totales</dt><dd class="num">'+(c.visitasTotales||0)+'</dd><dt>Premios ganados</dt><dd class="num">'+(c.premiosCanjeados||0)+'</dd><dt>Nivel</dt><dd>'+tierName(t)+' · Plata desde 10 visitas, Oro desde 25</dd></dl>'+
        '<div><div class="label" style="margin-bottom:6px">Tus visitas</div><ul class="hist">'+hist+'</ul></div>'+
        '<div class="actions"><button class="btn ghost" data-c-edit>Editar mis datos</button><a class="btn ghost" href="privacidad.html">Privacidad</a><span id="c-del"><button class="btn danger" data-c-askdel>Eliminar mi cuenta</button></span></div>'+
      '</div>';
  },
  renderForm(){
    const c = this.me || {nombre: this.user.displayName||"", telefono:"", cumple:""};
    const [cm, cd] = (c.cumple||"-").split("-");
    const isNew = this.me === false;
    $("#app").innerHTML =
      '<header class="top"><div class="brand"><h1>Meraki <em>Barbershop</em></h1><button class="linkbtn" data-logout>Salir</button></div></header>'+
      '<div class="client"><div class="panel"><h2>'+(isNew?"Creá tu tarjeta":"Tus datos")+'</h2>'+
      (isNew?'<p>Solo te pedimos esto para avisarte de tus sellos y premios.</p>':'')+
      '<form class="grid" id="c-form">'+
        '<div class="field full"><label class="label" for="c-nombre">Nombre completo</label><input id="c-nombre" required maxlength="60" value="'+esc(c.nombre)+'"></div>'+
        '<div class="field full"><label class="label" for="c-tel">WhatsApp</label><input id="c-tel" type="tel" inputmode="tel" placeholder="7XXX XXXX" value="'+esc(c.telefono)+'"><small>Para avisarte cuando ganés tu premio.</small></div>'+
        '<div class="field"><label class="label" for="c-mes">Cumpleaños (mes)</label><select id="c-mes"><option value="">—</option>'+MESES.map((m,i)=>{const v=String(i+1).padStart(2,"0");return '<option value="'+v+'"'+(cm===v?" selected":"")+'>'+m+'</option>';}).join("")+'</select></div>'+
        '<div class="field"><label class="label" for="c-dia">Día</label><input id="c-dia" type="number" min="1" max="31" value="'+esc(cd?Number(cd):"")+'"></div>'+
        '<div class="actions full"><button class="btn gold" type="submit">'+(isNew?"Crear mi tarjeta":"Guardar")+'</button>'+(isNew?"":'<button class="btn ghost" type="button" data-c-cancel>Cancelar</button>')+'</div>'+
      '</form></div></div>';
  },
  async save(){
    const nombre = $("#c-nombre").value.trim(); if (!nombre) return;
    const mes = $("#c-mes").value, dia = $("#c-dia").value;
    const datos = {nombre, telefono: $("#c-tel").value.trim(), cumple: mes && dia ? mes+"-"+String(dia).padStart(2,"0") : ""};
    try {
      if (this.me === false){
        await setDoc(doc(db,"clientes",this.user.uid), {...datos, email: this.user.email||"", sellos:0, visitasTotales:0, premiosCanjeados:0, creado: nowISO(), ultimaVisita: null, historial: [], notas:"", conApp: true});
        toast("¡Listo! Ya tenés tu tarjeta Meraki");
      } else {
        await updateDoc(doc(db,"clientes",this.user.uid), datos);
        toast("Datos guardados");
      }
      this.editing = false; this.render();
    } catch(e){ toast("No se pudo guardar ("+(e.code||"error")+"). Probá otra vez."); }
  },
  async deleteAccount(){
    try {
      await deleteDoc(doc(db,"clientes",this.user.uid));
      await deleteUser(this.user);
      toast("Tu cuenta y tu tarjeta se eliminaron");
    } catch(e){
      if ((e.code||"").includes("requires-recent-login")) toast("Por seguridad, salí, volvé a entrar y probá otra vez.");
      else toast("No se pudo eliminar ("+(e.code||"error")+").");
    }
  }
};
document.addEventListener("submit", ev => { if (ev.target.id==="c-form"){ ev.preventDefault(); Client.save(); } });
document.addEventListener("click", ev => {
  const t = ev.target.closest("button"); if (!t) return;
  if (t.hasAttribute("data-c-edit")){ Client.editing = true; Client.render(); }
  if (t.hasAttribute("data-c-cancel")){ Client.editing = false; Client.render(); }
  if (t.hasAttribute("data-c-askdel")) $("#c-del").innerHTML = '<span class="confirm">¿Borrar tu tarjeta y tus sellos para siempre? <button class="btn sm danger" data-c-del>Sí, borrar</button><button class="btn sm ghost" data-c-nodel>No</button></span>';
  if (t.hasAttribute("data-c-nodel")) Client.render();
  if (t.hasAttribute("data-c-del")) Client.deleteAccount();
});

/* ================================================================
   BARBERO (ADMIN)
   ================================================================ */
const SEGMENTS = {
  todos: {label:"Todos", test:()=>true},
  premio: {label:"Premio listo", test:c=>estado(c)==="premio"},
  casi: {label:"A 1–2 del premio", test:c=>{const f=cfg.meta-(c.sellos||0); return f>0 && f<=2;}},
  inactivo: {label:"Inactivos", test:c=>estado(c)==="inactivo"},
  cumple: {label:"Cumplen este mes", test:isBirthMonth},
  oro: {label:"Nivel Oro", test:c=>tier(c.visitasTotales||0)==="oro"}
};
const Admin = {
  clientes: [], filtro:"todos", query:"", openId:null, scannedId:null, lastStamped:null, freshId:null, sent:new Set(), tab:"clientes", loaded:false, cardCache:{},
  start(u){
    this.clientes = []; this.loaded = false;
    // El Meraki Launcher abre la app directo en un grupo (por ejemplo ?seg=inactivo)
    try { const seg = new URLSearchParams(location.search).get("seg"); if (seg && SEGMENTS[seg]) this.filtro = seg; } catch(e){}
    this.shell(u);
    const slow = setTimeout(() => { if (!this.loaded) this.banner("No se puede conectar a la base de datos todavía. Revisá tu internet.","warn"); }, 10000);
    stopFns.push(onSnapshot(collection(db,"clientes"), snap => {
      this.clientes = snap.docs.map(d => ({id:d.id, ...d.data()}));
      if (!snap.metadata.fromCache){ this.loaded = true; clearTimeout(slow); this.banner(""); }
      this.render();
      if (this.loaded) this.publicarResumen();
    }, e => { clearTimeout(slow); this.banner("No se pudo leer la lista ("+e.code+"). Revisá las reglas de Firestore en la guía.","warn"); }));
    stopFns.push(onSnapshot(doc(db,"config","programa"), s => { cfg = mergeCfg(s.exists() ? s.data() : {}); this.render(); this.fillConfig(); if (this.loaded) this.publicarResumen(); }, () => {}));
    this.regalos = []; this.regListos = false; this.regError = "";
    this.escucharRegalos();
    stopFns.push(() => { this.regStop?.(); this.regStop = null; });
  },
  // Sólo números para la tarjeta «Hoy en Meraki» del launcher: nunca nombres ni teléfonos
  publicarResumen(){
    const L = this.clientes, hoy = new Date().toDateString();
    const r = {
      inactivos: L.filter(SEGMENTS.inactivo.test).length,
      premio: L.filter(SEGMENTS.premio.test).length,
      casi: L.filter(SEGMENTS.casi.test).length,
      cumple: L.filter(SEGMENTS.cumple.test).length,
      total: L.length,
      hoy: L.reduce((a,c)=>a+(c.historial||[]).filter(h=>h.t==="visita"&&new Date(h.fecha).toDateString()===hoy).length,0),
      dias: cfg.diasInactivo
    };
    const k = JSON.stringify(r);
    if (k === this._resumen) return;
    this._resumen = k;
    setDoc(doc(db,"resumen","barberia"), {...r, actualizado: nowISO()}).catch(()=>{ this._resumen = ""; });
  },
  shell(u){
    $("#app").innerHTML =
    '<div class="wrap">'+
      '<header class="top"><div class="brand"><h1>Meraki <em>Barbershop</em></h1><span class="sub">Panel del barbero · <button class="linkbtn" data-logout>Salir</button></span></div>'+
      '<nav class="tabs" role="tablist"><button role="tab" aria-selected="true" data-tab="clientes">Clientes</button><button role="tab" aria-selected="false" data-tab="regalos">Regalos</button><button role="tab" aria-selected="false" data-tab="avisos">Avisos</button><button role="tab" aria-selected="false" data-tab="ajustes">Ajustes</button></nav></header>'+
      '<div id="banner" class="banner" hidden></div>'+
      '<section class="view" id="v-clientes">'+
        '<div class="stats" id="stats"></div>'+
        '<button class="btn gold lg" data-scan>'+ICON.scan+'Escanear tarjeta</button>'+
        '<div class="toolbar"><input id="q" class="search" type="search" placeholder="Nombre, teléfono o Nº de tarjeta" aria-label="Buscar cliente"><button class="btn" data-nuevo>+ Nuevo cliente</button></div>'+
        '<div class="chips" id="filtros"></div><div class="list" id="lista"></div>'+
      '</section>'+
      '<section class="view" id="v-regalos" hidden>'+
        '<div class="actions"><button class="btn gold lg" data-reg-nueva>+ Nueva tarjeta de regalo</button><button class="btn lg" data-scan>'+ICON.scan+'Escanear</button></div>'+
        '<div id="reg-aviso"></div>'+
        '<div class="toolbar"><input id="rq" class="search" type="search" placeholder="Código o nombre" aria-label="Buscar tarjeta de regalo" autocomplete="off"></div>'+
        '<div class="chips" id="reg-filtros"></div><div class="list" id="reg-lista"></div>'+
      '</section>'+
      '<section class="view" id="v-avisos" hidden><div class="panel"><h2>Enviar avisos</h2>'+
        '<p>Elegí a quién y qué mensaje. WhatsApp abre el chat de cada cliente con el texto listo; vos tocás enviar. El correo se manda a todos de un solo, en copia oculta.</p>'+
        '<form class="grid" id="f-campana"><div class="field"><label class="label" for="c-seg">Para quién</label><select id="c-seg">'+Object.entries(SEGMENTS).map(([k,s])=>'<option value="'+k+'">'+s.label+'</option>').join("")+'</select></div>'+
        '<div class="field"><label class="label" for="c-tpl">Mensaje</label><select id="c-tpl">'+Object.entries(TPL_NAMES).map(([k,n])=>'<option value="'+k+'">'+n+'</option>').join("")+'</select></div>'+
        '<div class="field full"><label class="label" for="c-txt">Texto (podés editarlo)</label><textarea id="c-txt"></textarea><div class="vars">'+VARS.map(v=>"<code>"+v+"</code>").join("")+'</div></div></form>'+
        '<div class="actions"><a class="btn" id="c-gmail" target="_blank" rel="noopener">'+ICON.mail+'Correo a todos (copia oculta)</a><button class="btn ghost" data-copymails>Copiar correos</button></div>'+
        '<div class="label" id="c-count"></div><div class="recips" id="c-list"></div></div></section>'+
      '<section class="view" id="v-ajustes" hidden>'+
        '<div class="panel"><h2>Reglas de la tarjeta</h2><form class="grid" id="f-config">'+
          '<div class="field"><label class="label" for="cf-meta">Sellos para el premio</label><input id="cf-meta" type="number" min="3" max="15"></div>'+
          '<div class="field"><label class="label" for="cf-premio">Premio</label><input id="cf-premio" type="text"></div>'+
          '<div class="field"><label class="label" for="cf-inact">Días para considerar inactivo</label><input id="cf-inact" type="number" min="7" max="180"></div>'+
          '<div class="field"><label class="label" for="cf-tel">WhatsApp de la barbería</label><input id="cf-tel" type="tel" placeholder="7XXX XXXX"><small>Los clientes lo usan para apartar espacio desde la app.</small></div>'+
          '<div class="field full"><span class="label">Niveles</span><small>Bronce: 0–9 visitas · Plata: 10–24 · Oro: 25 o más</small></div></form></div>'+
        '<div class="panel"><h2>Plantillas de mensajes</h2><div class="vars">Variables: '+VARS.map(v=>"<code>"+v+"</code>").join("")+'</div><form class="grid" id="f-tpls"></form>'+
          '<div class="actions"><button class="btn gold" data-savecfg>Guardar ajustes</button></div></div>'+
      '</section>'+
    '</div>';
    $("#c-txt").value = cfg.plantillas.premio; $("#c-seg").value = "premio"; $("#c-tpl").value = "premio";
    this.fillConfig();
    let qT; $("#q").addEventListener("input", e => { clearTimeout(qT); qT = setTimeout(()=>{ this.query = e.target.value; this.renderLista(); }, 120); });
    let rT; $("#rq").addEventListener("input", e => { clearTimeout(rT); rT = setTimeout(()=>{ this.regQuery = e.target.value; this.renderRegalos(); }, 120); });
    let tT; $("#c-txt").addEventListener("input", () => { clearTimeout(tT); tT = setTimeout(()=>this.renderAvisos(), 250); });
  },
  banner(msg, kind){ const b = $("#banner"); if (!b) return; if (!msg){ b.hidden = true; return; } b.textContent = msg; b.dataset.kind = kind||""; b.hidden = false; },
  render(){
    if (!$("#stats")) return;
    this.renderStats(); this.renderFiltros(); this.renderLista();
    if (this.tab==="avisos") this.renderAvisos();
    if (this.openId && !document.activeElement?.closest?.(".sheet form")) this.renderDetail();
  },
  renderStats(){
    const L = this.clientes, mes = new Date().getMonth(), y = new Date().getFullYear();
    const visitasMes = L.reduce((a,c)=>a+(c.historial||[]).filter(h=>h.t==="visita"&&new Date(h.fecha).getMonth()===mes&&new Date(h.fecha).getFullYear()===y).length,0);
    $("#stats").innerHTML =
      '<div class="stat"><span class="label">Clientes</span><b class="num">'+L.length+'</b><span class="hint">con tarjeta</span></div>'+
      '<div class="stat"><span class="label">Visitas este mes</span><b class="num">'+visitasMes+'</b><span class="hint">sellos puestos</span></div>'+
      '<button class="stat click" data-seg="premio"><span class="label">Premio listo</span><b class="num" style="color:var(--gold-hi)">'+L.filter(SEGMENTS.premio.test).length+'</b><span class="hint">por canjear</span></button>'+
      '<button class="stat click" data-seg="inactivo"><span class="label">Inactivos</span><b class="num" style="color:var(--warn)">'+L.filter(SEGMENTS.inactivo.test).length+'</b><span class="hint">+'+cfg.diasInactivo+' días sin venir</span></button>';
  },
  renderFiltros(){ $("#filtros").innerHTML = Object.entries(SEGMENTS).map(([k,s])=>'<button class="chip" data-f="'+k+'" aria-pressed="'+(this.filtro===k)+'">'+s.label+'</button>').join(""); },
  renderLista(){
    const q = this.query.trim().toLowerCase(), qd = q.replace(/\D/g,""), qn = q.replace(/^n[ºo°]?\s*/,"").replace(/[^a-z0-9]/g,"");
    const rows = this.clientes.filter(SEGMENTS[this.filtro].test)
      .filter(c => !q || (c.nombre||"").toLowerCase().includes(q) || (qd.length>=3 && String(c.telefono||"").replace(/\D/g,"").includes(qd)) || (qn.length>=3 && cardNo(c).toLowerCase().includes(qn)))
      .sort((a,b)=>(a.nombre||"").localeCompare(b.nombre||"","es",{sensitivity:"base"}) || a.id.localeCompare(b.id));
    if (!this.clientes.length){ $("#lista").innerHTML = this.loaded ? '<div class="empty" style="grid-column:1/-1"><h3>Todavía no hay tarjetas</h3><span>Registrá a tu primer cliente y ponele su primer sello.</span><button class="btn gold" data-nuevo>+ Nuevo cliente</button></div>' : '<div class="empty" style="grid-column:1/-1">Cargando clientes…</div>'; return; }
    if (!rows.length){ $("#lista").innerHTML = '<div class="empty" style="grid-column:1/-1">Nadie coincide con esa búsqueda.</div>'; return; }
    $("#lista").innerHTML = rows.map(c => {
      const e = estado(c), t = tier(c.visitasTotales||0), d = daysSince(c.ultimaVisita);
      return '<article class="card'+(c.id===this.lastStamped?" just":"")+'">'+
        '<button class="row" data-open="'+c.id+'" style="background:none;border:0;padding:0;text-align:left;width:100%">'+
          '<div style="min-width:0"><h3>'+esc(c.nombre)+'</h3><div class="meta num">Nº '+esc(cardNo(c))+' · '+(d===null?"sin visitas":d===0?"vino hoy":"hace "+d+" d")+'</div></div>'+
          '<span class="badges">'+''+'<span class="tier '+t+'">'+tierName(t)+'</span></span></button>'+
        stampsHTML(c,false,this.freshId===c.id)+
        '<div class="row" style="align-items:center"><span class="state '+e+'">'+ESTADO_TXT[e]+'</span>'+
          (e==="premio" ? '<button class="btn sm gold" data-redeem="'+c.id+'">Canjear premio</button>' : '<button class="btn sm gold" data-stamp="'+c.id+'">+ Sello</button>')+
        '</div></article>';
    }).join("");
    this.freshId = null;
  },
  async save(c){ const {id, ...data} = c; await setDoc(doc(db,"clientes",id), data); },
  hist(c,t,nota){ c.historial = [{t, fecha: nowISO(), nota: nota||""}, ...(c.historial||[])].slice(0,60); },
  async stamp(id, n){
    const c = structuredClone(this.clientes.find(x=>x.id===id)); if (!c) return;
    c.sellos=(c.sellos||0)+n; c.visitasTotales=(c.visitasTotales||0)+1; c.ultimaVisita=nowISO(); this.hist(c,"visita",n>1?"Sello doble":"");
    this.freshId = id; this.lastStamped = id; if (this.scannedId===id) this.scannedId = null;
    try { await this.save(c); } catch(e){ return toast("No se pudo guardar ("+(e.code||"error")+")."); }
    const link = waLink(c.telefono, fill(cfg.plantillas[c.sellos>=cfg.meta?"premio":"sello"], c));
    toast(c.sellos>=cfg.meta ? "¡"+firstName(c)+" completó la tarjeta!" : "Sello "+Math.min(c.sellos,cfg.meta)+" de "+cfg.meta+" para "+firstName(c),
      link && !c.conApp ? '<a href="'+esc(link)+'" target="_blank" rel="noopener">Avisar por WhatsApp</a>' : "");
  },
  async unstamp(id){
    const c = structuredClone(this.clientes.find(x=>x.id===id)); if (!c || !(c.sellos>0)) return;
    c.sellos-=1; c.visitasTotales=Math.max((c.visitasTotales||1)-1,0); this.hist(c,"ajuste","Sello quitado");
    try { await this.save(c); toast("Sello quitado"); } catch(e){ toast("No se pudo guardar."); }
  },
  async redeem(id){
    const c = structuredClone(this.clientes.find(x=>x.id===id)); if (!c || c.sellos<cfg.meta) return;
    c.sellos-=cfg.meta; c.premiosCanjeados=(c.premiosCanjeados||0)+1; this.hist(c,"canje",cfg.premio);
    try { await this.save(c); toast("Premio canjeado. Tarjeta nueva para "+firstName(c)); } catch(e){ toast("No se pudo guardar."); }
  },
  onSheetClosed(){ this.openId = null; this.scannedId = null; this.regOpen = null; this.regScanned = null; },
  renderDetail(){
    const c = this.clientes.find(x=>x.id===this.openId); if (!c){ closeSheetEl(); this.onSheetClosed(); return; }
    const e = estado(c), t = tier(c.visitasTotales||0);
    const sug = e==="premio"?"premio":e==="inactivo"?"extranamos":isBirthMonth(c)?"cumple":"sello";
    const sel = document.getElementById("d-tpl")?.value || sug;
    const msg = fill(cfg.plantillas[sel], c), wa = waLink(c.telefono, msg);
    const hist = (c.historial||[]).slice(0,10).map(h=>'<li><span>'+({visita:"Visita",canje:"Premio canjeado",ajuste:"Ajuste"}[h.t]||h.t)+(h.nota?" · "+esc(h.nota):"")+'</span><span>'+fmtDate(h.fecha)+'</span></li>').join("") || '<li><span>Sin movimientos todavía</span><span></span></li>';
    sheet(
      '<h2>'+esc(c.nombre)+'</h2><div class="label num" style="margin-top:-10px">Tarjeta Nº '+esc(cardNo(c))+""+'</div>'+
      (this.scannedId===c.id ? '<div class="scanned">Tarjeta escaneada. Tocá "+ Sello" para registrar la visita.</div>' : '')+
      '<div class="loyal"><div class="head"><span class="wm">Meraki</span><span class="tier '+t+'">'+tierName(t)+'</span></div>'+stampsHTML(c,true)+
        '<div class="head"><span class="count num">'+Math.min(c.sellos||0,cfg.meta)+' / '+cfg.meta+'</span><span class="label">'+(e==="premio"?"Ganó "+esc(cfg.premio):"Faltan "+(cfg.meta-(c.sellos||0))+" · "+esc(cfg.premio))+'</span></div></div>'+
      '<div class="actions">'+(e==="premio"?'<button class="btn gold" data-redeem="'+c.id+'">Canjear premio</button>':'<button class="btn gold" data-stamp="'+c.id+'">+ Sello</button>')+
        '<button class="btn" data-stamp2="'+c.id+'">+ Sello doble</button><button class="btn ghost" data-unstamp="'+c.id+'"'+((c.sellos||0)>0?"":" disabled")+'>Quitar sello</button></div>'+
      '<div class="notify"><div class="field"><label class="label" for="d-tpl">Avisarle</label><select id="d-tpl">'+Object.keys(TPL_NAMES).map(k=>'<option value="'+k+'"'+(k===sel?" selected":"")+'>'+TPL_NAMES[k]+'</option>').join("")+'</select></div>'+
        '<div class="preview" id="d-msg">'+esc(msg)+'</div><div class="actions">'+
        (sel==="tarjeta" ? '<button class="btn wa" data-sharecard="'+c.id+'">'+ICON.wa+'Compartir tarjeta</button>' : (wa ? '<a class="btn wa" href="'+esc(wa)+'" target="_blank" rel="noopener">'+ICON.wa+'WhatsApp</a>' : '<span class="btn" style="opacity:.5">Sin teléfono</span>'))+
        (c.email ? '<a class="btn" href="'+esc(gmailLink({to:c.email,su:"Tu tarjeta Meraki Barbershop",body:msg}))+'" target="_blank" rel="noopener">'+ICON.mail+'Correo</a>' : '')+
        '<button class="btn ghost" data-copymsg>Copiar texto</button></div>'+
        (sel==="tarjeta" ? '<span class="hint-sm">Abre el menú de compartir con la imagen de su tarjeta y el QR. Escogé WhatsApp y su chat.</span>' : '')+'</div>'+
      '<dl class="kv"><dt>WhatsApp</dt><dd class="num">'+esc(fmtTel(c.telefono)||"—")+'</dd><dt>Correo</dt><dd>'+esc(c.email||"—")+'</dd>'+
        '<dt>Cumpleaños</dt><dd>'+(c.cumple?Number(c.cumple.split("-")[1])+" de "+MESES[Number(c.cumple.split("-")[0])-1]:"—")+'</dd>'+
        '<dt>Visitas totales</dt><dd class="num">'+(c.visitasTotales||0)+'</dd><dt>Premios canjeados</dt><dd class="num">'+(c.premiosCanjeados||0)+'</dd>'+
        '<dt>Cliente desde</dt><dd>'+fmtDate(c.creado)+'</dd>'+(c.notas?'<dt>Notas</dt><dd>'+esc(c.notas)+'</dd>':'')+'</dl>'+
      '<div><div class="label" style="margin-bottom:6px">Historial</div><ul class="hist">'+hist+'</ul></div>'+
      '<div class="actions"><button class="btn ghost" data-edit="'+c.id+'">Editar datos</button><span id="del-zone"><button class="btn danger" data-askdel>Eliminar cliente</button></span></div>'
    );
  },
  openForm(c){
    const isNew = !c; c = c || {nombre:"",telefono:"",email:"",cumple:"",notas:""};
    const [cm, cd] = (c.cumple||"-").split("-");
    this.openId = null;
    sheet('<h2>'+(isNew?"Nuevo cliente":"Editar cliente")+'</h2>'+''+
      '<form class="grid" id="f-cliente">'+
        '<div class="field full"><label class="label" for="fc-nombre">Nombre</label><input id="fc-nombre" required value="'+esc(c.nombre)+'" autocomplete="off"></div>'+
        '<div class="field"><label class="label" for="fc-tel">WhatsApp</label><input id="fc-tel" type="tel" inputmode="tel" placeholder="7XXX XXXX" value="'+esc(c.telefono)+'"></div>'+
        '<div class="field"><label class="label" for="fc-email">Correo</label><input id="fc-email" type="email" value="'+esc(c.email)+'"></div>'+
        '<div class="field"><label class="label" for="fc-mes">Cumpleaños (mes)</label><select id="fc-mes"><option value="">—</option>'+MESES.map((m,i)=>{const v=String(i+1).padStart(2,"0");return '<option value="'+v+'"'+(cm===v?" selected":"")+'>'+m+'</option>';}).join("")+'</select></div>'+
        '<div class="field"><label class="label" for="fc-dia">Día</label><input id="fc-dia" type="number" min="1" max="31" value="'+esc(cd?Number(cd):"")+'"></div>'+
        '<div class="field full"><label class="label" for="fc-notas">Notas (estilo, preferencias)</label><textarea id="fc-notas">'+esc(c.notas)+'</textarea></div>'+
        (isNew?'<div class="field full"><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="fc-primer" checked style="width:auto"> Ponerle su primer sello hoy</label></div>':'')+
        '<div class="actions full"><button class="btn gold" type="submit">'+(isNew?"Crear tarjeta":"Guardar cambios")+'</button><button class="btn ghost" type="button" data-close>Cancelar</button></div></form>');
    $("#f-cliente").addEventListener("submit", async ev => {
      ev.preventDefault();
      const nombre = $("#fc-nombre").value.trim(); if (!nombre) return;
      const mes = $("#fc-mes").value, dia = $("#fc-dia").value;
      const data = isNew ? {id:"m"+Date.now().toString(36)+Math.random().toString(36).slice(2,6), sellos:0, visitasTotales:0, premiosCanjeados:0, creado:nowISO(), ultimaVisita:null, historial:[], conApp:false} : structuredClone(c);
      Object.assign(data, {nombre, telefono:$("#fc-tel").value.trim(), email:$("#fc-email").value.trim(), cumple: mes&&dia ? mes+"-"+String(dia).padStart(2,"0") : "", notas:$("#fc-notas").value.trim()});
      if (isNew && $("#fc-primer").checked){ data.sellos=1; data.visitasTotales=1; data.ultimaVisita=nowISO(); this.hist(data,"visita","Primera visita"); }
      try { await this.save(data); } catch(e){ return toast("No se pudo guardar ("+(e.code||"error")+")."); }
      this.openId = data.id; this.renderDetail();
      toast(isNew ? "Tarjeta creada para "+firstName(data) : "Datos guardados");
    });
  },
  renderAvisos(){
    const seg = $("#c-seg").value, tplK = $("#c-tpl").value, tpl = $("#c-txt").value;
    const list = this.clientes.filter(SEGMENTS[seg].test).sort((a,b)=>(a.nombre||"").localeCompare(b.nombre||"","es"));
    const emails = list.map(c=>c.email).filter(Boolean);
    $("#c-count").textContent = list.length+(list.length===1?" cliente":" clientes")+" · "+list.filter(c=>waNumber(c.telefono)).length+" con WhatsApp · "+emails.length+" con correo";
    const gm = $("#c-gmail");
    if (emails.length){ gm.href = gmailLink({bcc:emails.join(","), su:"Noticias de Meraki Barbershop", body: tpl.replaceAll("{nombre}","").replace(/^[¡!,\s]+/,"")}); gm.style.opacity=""; gm.style.pointerEvents=""; }
    else { gm.removeAttribute("href"); gm.style.opacity=".45"; gm.style.pointerEvents="none"; }
    $("#c-list").innerHTML = list.length ? list.map(c => {
      const m = fill(tpl,c), wa = waLink(c.telefono,m), key = c.id+"|"+seg+"|"+tplK;
      return '<div class="recip'+(this.sent.has(key)?" sent":"")+'"><div class="who"><b>'+esc(c.nombre)+'</b><span class="num">'+esc(fmtTel(c.telefono)||"sin WhatsApp")+' · '+Math.min(c.sellos||0,cfg.meta)+'/'+cfg.meta+'</span></div>'+
        (wa?'<a class="btn sm wa" data-sent="'+esc(key)+'" href="'+esc(wa)+'" target="_blank" rel="noopener">'+ICON.wa+'WhatsApp</a>':'')+
        (c.email?'<a class="btn sm" data-sent="'+esc(key)+'" href="'+esc(gmailLink({to:c.email,su:"Meraki Barbershop",body:m}))+'" target="_blank" rel="noopener">'+ICON.mail+'Correo</a>':'')+'</div>';
    }).join("") : '<div class="empty">Nadie en este grupo por ahora.</div>';
  },
  fillConfig(){
    if (!$("#cf-meta") || document.activeElement?.closest?.("#v-ajustes")) return;
    $("#cf-meta").value = cfg.meta; $("#cf-premio").value = cfg.premio; $("#cf-inact").value = cfg.diasInactivo; $("#cf-tel").value = cfg.telBarberia||"";
    $("#f-tpls").innerHTML = Object.entries(TPL_NAMES).map(([k,n])=>'<div class="field full"><label class="label" for="tp-'+k+'">'+n+'</label><textarea id="tp-'+k+'">'+esc(cfg.plantillas[k])+'</textarea></div>').join("");
  },
  async saveConfig(){
    const v = {
      meta: Math.min(Math.max(parseInt($("#cf-meta").value)||8,3),15),
      premio: $("#cf-premio").value.trim() || DEFAULT_CFG.premio,
      diasInactivo: Math.min(Math.max(parseInt($("#cf-inact").value)||30,7),180),
      telBarberia: $("#cf-tel").value.trim(),
      plantillas: Object.fromEntries(Object.keys(TPL_NAMES).map(k=>[k, $("#tp-"+k).value]))
    };
    try { await setDoc(doc(db,"config","programa"), v); cfg = mergeCfg(v); toast("Ajustes guardados"); this.render(); }
    catch(e){ toast("No se pudo guardar ("+(e.code||"error")+")."); }
  },
  openScanned(id){
    if (!this.clientes.some(x=>x.id===id)) return false;
    this.switchTab("clientes"); this.scannedId = id; this.openId = id; this.renderDetail(); return true;
  },
  switchTab(tab){
    this.tab = tab;
    document.querySelectorAll("nav.tabs button").forEach(b=>b.setAttribute("aria-selected", b.dataset.tab===tab));
    ["clientes","regalos","avisos","ajustes"].forEach(v=>$("#v-"+v).hidden = v!==tab);
    if (tab==="regalos") this.renderRegalos();
    if (tab==="avisos") this.renderAvisos();
    if (tab==="ajustes") this.fillConfig();
  },

  /* ---- Tarjeta como imagen (para clientes sin app) ---- */
  async buildCard(c){
    const key = c.id+"|"+c.nombre; if (this.cardCache[key]) return this.cardCache[key];
    try { await Promise.all([document.fonts.load('italic 500 80px "Bodoni Moda"'), document.fonts.load('500 60px "Bodoni Moda"'), document.fonts.load('600 24px "Manrope"')]); } catch {}
    const W=1080,H=680,cv=document.createElement("canvas"); cv.width=W; cv.height=H; const g=cv.getContext("2d");
    const bg=g.createLinearGradient(0,0,W,H); bg.addColorStop(0,"#211d14"); bg.addColorStop(1,"#0c0b09"); g.fillStyle=bg; g.fillRect(0,0,W,H);
    const gl=g.createRadialGradient(W,0,0,W,0,700); gl.addColorStop(0,"rgba(201,162,74,.28)"); gl.addColorStop(1,"rgba(201,162,74,0)"); g.fillStyle=gl; g.fillRect(0,0,W,H);
    g.strokeStyle="#c9a24a"; g.lineWidth=2; g.strokeRect(24,24,W-48,H-48);
    g.fillStyle="#c9a24a"; g.font='italic 500 84px "Bodoni Moda", Didot, serif'; g.fillText("Meraki",72,150);
    g.fillStyle="#a59b84"; g.font='600 22px Manrope, sans-serif'; if ("letterSpacing" in g) g.letterSpacing="6px"; g.fillText("BARBERSHOP · APOPA",76,196); g.fillText("TARJETA DE FIDELIDAD",76,420); if ("letterSpacing" in g) g.letterSpacing="0px";
    g.fillStyle="#f1ead9"; let fs=58; g.font='500 '+fs+'px "Bodoni Moda", Didot, serif';
    while (g.measureText(c.nombre).width>470 && fs>30){ fs-=2; g.font='500 '+fs+'px "Bodoni Moda", Didot, serif'; }
    g.fillText(c.nombre,72,488);
    g.fillStyle="#a59b84"; g.font='500 22px "JetBrains Mono", monospace'; g.fillText("Nº "+cardNo(c),76,540);
    g.font='500 22px Manrope, sans-serif'; g.fillText("Enseñá este código en cada visita",76,600);
    const q=qrcode(0,"M"); q.addData(qrText(c)); q.make();
    const n=q.getModuleCount(), box=420, bx=W-72-box, by=(H-box)/2, pad=26, cell=(box-pad*2)/n;
    g.fillStyle="#fff"; g.beginPath(); if (g.roundRect) g.roundRect(bx,by,box,box,22); else g.rect(bx,by,box,box); g.fill();
    g.fillStyle="#0d0c0a"; for (let r=0;r<n;r++) for (let k=0;k<n;k++) if (q.isDark(r,k)) g.fillRect(Math.floor(bx+pad+k*cell),Math.floor(by+pad+r*cell),Math.ceil(cell),Math.ceil(cell));
    return this.cardCache[key] = cv;
  },
  async shareCard(id){
    const c = this.clientes.find(x=>x.id===id); if (!c) return;
    if (!window.qrcode) return toast("No cargó el generador de QR. Revisá tu internet.");
    const cv = await this.buildCard(c);
    const blob = await new Promise(r => cv.toBlob(r, "image/png"));
    const file = new File([blob], "Tarjeta Meraki - "+c.nombre.replace(/[^\p{L}\p{N} ]/gu,"")+".png", {type:"image/png"});
    const text = fill(cfg.plantillas.tarjeta, c);
    if (navigator.canShare && navigator.canShare({files:[file]})){
      try { await navigator.share({files:[file], text}); } catch(e){ if (e.name!=="AbortError") toast("No se pudo compartir."); }
    } else {
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
      toast("Imagen descargada. Adjuntala en su chat de WhatsApp.");
    }
  }
};

/* ================================================================
   TARJETAS DE REGALO
   La persona la pide en merakibarbershop.com/regalo/ (le llega a Jose por WhatsApp), paga,
   y Jose la activa aquí: sale la imagen con su código y QR para mandarla. Al usarla, se escanea.
   ================================================================ */
// Los mismos servicios y precios de la página (meraki/meraki.js) y de Leo. Vale el precio del día en que se paga.
const REGALO_SERV = [["Corte clásico",3.5],["Corte moderno",4],["Combo el patrón",5],["Servicio full detalle",6],["Diseño de barba el patrón",3.5],["Perfilado express",2],["Ritual Meraki Spa",5]];
const REGALO_SERV_NUEVOS = [["Corte clásico",4],["Corte moderno",5],["Combo el patrón",6.5],["Servicio full detalle",8],["Diseño de barba Meraki",4.5],["Perfilado express",2.5],["Ritual Meraki Spa",6.5]];
const CAMBIO_PRECIOS = "2026-12-15", REGALO_MESES = 3;
const ABC = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sin 0/O, 1/I/L, para que no se confundan al dictarlos
const PAGOS = {efectivo:"Efectivo", tarjeta:"Tarjeta", transferencia:"Transferencia"};
const ESTADO_REG = {activa:"Activa", usada:"Usada", vencida:"Vencida"};
const hoySV = () => new Date(Date.now() - 6*3600e3).toISOString().slice(0,10); // El Salvador: UTC-6 todo el año
const serviciosRegalo = () => hoySV() >= CAMBIO_PRECIOS ? REGALO_SERV_NUEVOS : REGALO_SERV;
const sumarMeses = (ymd, m) => { const [y,mo,d] = ymd.split("-").map(Number); const ult = new Date(Date.UTC(y, mo-1+m+1, 0)).getUTCDate(); return new Date(Date.UTC(y, mo-1+m, Math.min(d, ult))).toISOString().slice(0,10); };
const fmtCodigo = c => { c = String(c||""); return c.length === 8 ? c.slice(0,4)+"-"+c.slice(4) : c; };
const fmtDia = ymd => ymd ? new Date(ymd+"T12:00:00Z").toLocaleDateString("es-SV",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"}) : "—";
const money = n => "$" + Number(n||0).toFixed(2);
const estadoRegalo = r => r.usada ? "usada" : (r.vence && hoySV() > r.vence ? "vencida" : "activa");
const qrRegalo = c => "MERAKI-REGALO:" + c;
// Lo que lee el escáner: tarjeta de cliente o tarjeta de regalo
const leerQR = t => { const s = String(t||"").trim(); const m = s.match(/^MERAKI-REGALO:([A-Za-z0-9]{8})$/); if (m) return {tipo:"regalo", id:m[1].toUpperCase()}; const id = idFromText(s); return id ? {tipo:"cliente", id} : null; };
const nuevoCodigo = usados => { for (;;) { const c = Array.from(crypto.getRandomValues(new Uint32Array(8)), n => ABC[n % ABC.length]).join(""); if (!usados.has(c)) return c; } };
const reglaRegalos = () => "    match /regalos/{codigo} {\n      allow read, write: if request.auth != null && request.auth.token.email_verified == true && request.auth.token.email.lower() == \"" + String(ADMIN_EMAIL).toLowerCase() + "\";\n    }";
// El pedido que manda la página: «Servicio: X ($4.00)», «Para: …», «De: …», «Mensaje: …»
function leerPedido(t){
  const v = k => { const m = String(t||"").match(new RegExp("^[ \\t*_]*" + k + "[ \\t*_]*:[ \\t]*(.+)$", "mi")); return m ? m[1].replace(/[*_]+$/,"").trim() : ""; };
  const serv = v("Servicio"), p = serv.match(/\(\s*\$\s*([\d]+(?:[.,]\d{1,2})?)\s*\)\s*$/);
  return { servicio: serv.replace(/\s*\(\s*\$\s*[\d.,]+\s*\)\s*$/, ""), precio: p ? Number(p[1].replace(",", ".")) : null, para: v("Para"), de: v("De"), mensaje: v("Mensaje") };
}
const buscarServicio = nombre => { const n = String(nombre||"").toLowerCase().trim(); const L = serviciosRegalo(); return L.find(s => s[0].toLowerCase() === n) || (n.startsWith("diseño de barba") ? L.find(s => s[0].toLowerCase().startsWith("diseño de barba")) : null); };

Object.assign(Admin, {
  regalos: [], regListos: false, regError: "", regFiltro: "activa", regQuery: "", regOpen: null, regScanned: null, regImg: {}, regStop: null,

  escucharRegalos(){
    this.regStop?.();
    this.regStop = onSnapshot(collection(db,"regalos"), snap => {
      this.regalos = snap.docs.map(d => ({id:d.id, ...d.data()}));
      if (!snap.metadata.fromCache){ this.regListos = true; this.regError = ""; }
      this.renderRegalos();
      if (this.regOpen && !document.activeElement?.closest?.(".sheet form") && !document.querySelector("#reg-zona .confirm, #reg-del .confirm")) this.renderRegalo();
    }, e => { this.regError = e.code || "error"; this.regListos = true; this.renderRegalos(); });
  },
  errorRegalo(e){
    if ((e && e.code) === "permission-denied"){
      this.regError = "permission-denied"; closeSheetEl(); this.onSheetClosed(); this.switchTab("regalos");
      toast("Falta un permiso en Firebase. Mirá las instrucciones arriba.");
    } else toast("No se pudo guardar ("+((e && e.code)||"error")+"). Revisá tu internet.");
  },

  renderRegalos(){
    const box = $("#reg-lista"); if (!box) return;
    $("#reg-aviso").innerHTML = !this.regError ? "" : this.regError === "permission-denied"
      ? '<div class="panel"><h2>Falta un permiso en Firebase</h2><p>Para guardar las tarjetas de regalo, entrá a Firebase → Firestore → Reglas, pegá esto debajo de <code>match /databases/{database}/documents {</code> y tocá Publicar:</p>'+
        '<pre class="regla">'+esc(reglaRegalos())+'</pre><div class="actions"><button class="btn gold" data-reg-copiar>Copiar regla</button><button class="btn" data-reg-reintentar>Ya la puse</button></div></div>'
      : '<div class="banner" data-kind="warn">No se pudieron leer las tarjetas de regalo ('+esc(this.regError)+'). Revisá tu internet.</div>';
    const n = {activa:0, usada:0, vencida:0}; this.regalos.forEach(r => n[estadoRegalo(r)]++);
    $("#reg-filtros").innerHTML = [["activa","Activas"],["vencida","Vencidas"],["usada","Usadas"],["todas","Todas"]]
      .map(([k,t]) => '<button class="chip" data-reg-f="'+k+'" aria-pressed="'+(this.regFiltro===k)+'">'+t+(k==="todas"?"":" · "+n[k])+'</button>').join("");
    if (this.regError === "permission-denied"){ box.innerHTML = ""; return; }
    if (!this.regListos){ box.innerHTML = '<div class="empty" style="grid-column:1/-1">Cargando tarjetas de regalo…</div>'; return; }
    if (!this.regalos.length){ box.innerHTML = '<div class="empty" style="grid-column:1/-1"><h3>Todavía no hay tarjetas de regalo</h3><span>Cuando alguien te pague una, creala aquí y mandala por WhatsApp.</span><button class="btn gold" data-reg-nueva>+ Nueva tarjeta de regalo</button></div>'; return; }
    // Buscando se ve en todas (para encontrar un código aunque ya esté usada o vencida)
    const q = this.regQuery.trim().toLowerCase(), qc = q.toUpperCase().replace(/[^A-Z0-9]/g,"");
    const rows = (q ? this.regalos.filter(r => (qc.length >= 3 && r.id.includes(qc)) || String(r.para||"").toLowerCase().includes(q) || String(r.de||"").toLowerCase().includes(q))
                    : this.regalos.filter(r => this.regFiltro === "todas" || estadoRegalo(r) === this.regFiltro))
      .sort((a,b) => String(b.creado||"").localeCompare(String(a.creado||"")));
    if (!rows.length){ box.innerHTML = '<div class="empty" style="grid-column:1/-1">'+(q ? "Ninguna tarjeta de regalo coincide con esa búsqueda." : "No hay tarjetas en este grupo.")+'</div>'; return; }
    box.innerHTML = rows.map(r => {
      const e = estadoRegalo(r);
      const cuando = e === "usada" ? "usada el "+fmtDate(r.usada) : (e === "vencida" ? "venció el " : "vence el ")+fmtDia(r.vence);
      return '<article class="card"><button class="row" data-reg-abrir="'+esc(r.id)+'" style="background:none;border:0;padding:0;text-align:left;width:100%">'+
        '<div style="min-width:0"><h3>Para '+esc(r.para||"—")+'</h3><div class="meta">De '+esc(r.de||"—")+' · <span class="num">'+esc(fmtCodigo(r.id))+'</span></div></div>'+
        '<span class="state '+e+'">'+ESTADO_REG[e]+'</span></button>'+
        '<div class="meta">'+esc(r.servicio||"")+' · '+money(r.precio)+' · '+cuando+'</div></article>';
    }).join("");
  },

  abrirRegalo(id, escaneada){
    this.switchTab("regalos");
    if (!this.regalos.some(r => r.id === id)){
      toast(this.regListos ? "Ese código no es de ninguna tarjeta de regalo. No la aceptés sin revisar." : "Todavía se están cargando las tarjetas. Probá otra vez.");
      return;
    }
    this.openId = null; this.regOpen = id; this.regScanned = escaneada ? id : null; this.renderRegalo();
  },

  // La imagen de la tarjeta (con su QR), hecha con la misma función de la página web
  async imagenRegalo(r){
    const key = [r.id, r.servicio, r.para, r.de, r.mensaje, r.vence].join("|");
    if (this.regImg[key]) return this.regImg[key];
    if (!window.MerakiRegalo || !window.qrcode) throw new Error("sin-librerias");
    const q = qrcode(0,"M"); q.addData(qrRegalo(r.id)); q.make();
    const cv = document.createElement("canvas");
    await MerakiRegalo.dibujar(cv, {servicio:r.servicio, para:r.para, de:r.de, mensaje:r.mensaje, codigo:r.id, vence:r.vence, qr:q});
    const blob = await new Promise(ok => cv.toBlob(ok, "image/png"));
    return this.regImg[key] = {blob, url: URL.createObjectURL(blob)};
  },

  renderRegalo(){
    const r = this.regalos.find(x => x.id === this.regOpen); if (!r){ closeSheetEl(); this.onSheetClosed(); return; }
    const e = estadoRegalo(r), aviso = this.regScanned === r.id;
    const banner = !aviso ? "" : e === "activa" ? '<div class="scanned">✓ Tarjeta válida: '+esc(r.servicio)+'. Marcala como usada cuando termines.</div>'
      : e === "usada" ? '<div class="scanned bad">Esta tarjeta YA SE USÓ el '+fmtDate(r.usada)+'.</div>'
      : '<div class="scanned bad">Esta tarjeta venció el '+fmtDia(r.vence)+'.</div>';
    sheet('<h2>Para '+esc(r.para||"—")+'</h2><div class="label num" style="margin-top:-10px">Tarjeta de regalo '+esc(fmtCodigo(r.id))+'</div>'+banner+
      '<img class="regalo-img'+(e === "activa" ? "" : " apagada")+'" id="reg-img" alt="Tarjeta de regalo de '+esc(r.servicio)+' para '+esc(r.para)+'">'+
      '<div class="actions" id="reg-zona">'+
        (e === "usada" ? '<button class="btn" data-reg-reactivar="'+esc(r.id)+'">Reactivar</button>' : '<button class="btn gold" data-reg-usar="'+esc(r.id)+'">Marcar como usada</button>')+
        (e === "usada" ? '' : '<button class="btn wa" data-reg-compartir="'+esc(r.id)+'">'+ICON.wa+'Compartir tarjeta</button>')+'</div>'+
      '<dl class="kv"><dt>Servicio</dt><dd>'+esc(r.servicio)+'</dd><dt>Pagó</dt><dd>'+money(r.precio)+(r.pago ? ' · '+esc(PAGOS[r.pago]||r.pago) : '')+'</dd>'+
        '<dt>De</dt><dd>'+esc(r.de||"—")+'</dd>'+(r.mensaje ? '<dt>Mensaje</dt><dd>'+esc(r.mensaje)+'</dd>' : '')+
        '<dt>Activada</dt><dd>'+fmtDate(r.creado)+'</dd><dt>Vence</dt><dd>'+fmtDia(r.vence)+'</dd>'+(r.usada ? '<dt>Usada</dt><dd>'+fmtDate(r.usada)+'</dd>' : '')+'</dl>'+
      '<span class="hint-sm">Si prefiere otro servicio, se le toma a cuenta lo que pagó ('+money(r.precio)+'); si cuesta más, paga la diferencia.</span>'+
      '<div class="actions"><button class="btn ghost" data-reg-editar="'+esc(r.id)+'">Editar datos</button><span id="reg-del"><button class="btn danger" data-reg-askdel>Eliminar</button></span></div>');
    this.imagenRegalo(r).then(img => { const im = $("#reg-img"); if (im && this.regOpen === r.id) im.src = img.url; })
      .catch(() => { const im = $("#reg-img"); if (im) im.alt = "La imagen no cargó. Revisá tu internet."; });
  },

  formRegalo(r){
    const nueva = !r, L = serviciosRegalo().slice();
    if (r && !L.some(s => s[0] === r.servicio)) L.push([r.servicio, r.precio]);
    const sel = r ? r.servicio : "Corte moderno", precio = r ? r.precio : (L.find(s => s[0] === sel) || [0,0])[1];
    this.openId = null; this.regOpen = null; this.regScanned = null;
    sheet('<h2>'+(nueva ? "Nueva tarjeta de regalo" : "Editar tarjeta de regalo")+'</h2>'+
      (nueva ? '<div class="field"><label class="label" for="rg-pegar">¿Te llegó el pedido por WhatsApp?</label><textarea id="rg-pegar" rows="3" placeholder="Copiá el mensaje del pedido y pegalo aquí: los datos se llenan solos."></textarea><small id="rg-pegado"></small></div>' : '')+
      '<form class="grid" id="f-regalo">'+
        '<div class="field"><label class="label" for="rg-serv">Servicio</label><select id="rg-serv">'+L.map(s => '<option value="'+esc(s[0])+'" data-precio="'+s[1]+'"'+(s[0] === sel ? " selected" : "")+'>'+esc(s[0])+' · '+money(s[1])+'</option>').join("")+'</select></div>'+
        '<div class="field"><label class="label" for="rg-precio">Precio que pagó ($)</label><input id="rg-precio" type="number" inputmode="decimal" min="0" step="0.25" required value="'+esc(precio)+'"></div>'+
        '<div class="field"><label class="label" for="rg-para">Para</label><input id="rg-para" required maxlength="40" autocomplete="off" value="'+esc(r ? r.para : "")+'"></div>'+
        '<div class="field"><label class="label" for="rg-de">De</label><input id="rg-de" required maxlength="40" autocomplete="off" value="'+esc(r ? r.de : "")+'"></div>'+
        '<div class="field full"><label class="label" for="rg-msj">Mensaje (si quieren)</label><textarea id="rg-msj" maxlength="90" rows="2">'+esc(r ? r.mensaje : "")+'</textarea></div>'+
        '<div class="field"><label class="label" for="rg-pago">Pagó con</label><select id="rg-pago">'+Object.entries(PAGOS).map(([k,t]) => '<option value="'+k+'"'+((r ? r.pago : "efectivo") === k ? " selected" : "")+'>'+t+'</option>').join("")+'</select></div>'+
        '<div class="field"><span class="label">Vence</span><span style="padding:10px 0">'+fmtDia(r ? r.vence : sumarMeses(hoySV(), REGALO_MESES))+(nueva ? " (3 meses)" : "")+'</span></div>'+
        '<div class="actions full"><button class="btn gold" type="submit">'+(nueva ? "Activar tarjeta" : "Guardar cambios")+'</button><button class="btn ghost" type="button" data-close>Cancelar</button></div>'+
        (nueva ? '<span class="hint-sm full">Activala solo cuando ya te pagaron. Sale con un código único y vale 3 meses desde hoy.</span>' : '')+
      '</form>');
    $("#rg-pegar")?.addEventListener("input", ev => {
      const p = leerPedido(ev.target.value), s = buscarServicio(p.servicio), nota = $("#rg-pegado");
      if (s){ $("#rg-serv").value = s[0]; $("#rg-precio").value = s[1]; }
      if (p.precio !== null && p.precio >= 0) $("#rg-precio").value = p.precio; // el precio que vio la persona en la página
      if (p.para) $("#rg-para").value = p.para.slice(0,40);
      if (p.de) $("#rg-de").value = p.de.slice(0,40);
      if (p.mensaje) $("#rg-msj").value = p.mensaje.slice(0,90);
      const ok = !!(s || p.para || p.de);
      nota.textContent = !ev.target.value.trim() ? "" : ok ? "✓ Listo, revisá los datos" + (p.servicio && !s ? " (el servicio no lo reconocí: escogelo vos)" : "") + "." : "No encontré los datos del pedido. Llenalos a mano.";
    });
    $("#f-regalo").addEventListener("submit", ev => { ev.preventDefault(); this.guardarRegalo(r); });
  },

  async guardarRegalo(r){
    const limpio = s => String(s||"").replace(/\s+/g," ").trim();
    const datos = { servicio: $("#rg-serv").value, precio: Math.round((parseFloat($("#rg-precio").value)||0)*100)/100,
      para: limpio($("#rg-para").value), de: limpio($("#rg-de").value), mensaje: limpio($("#rg-msj").value), pago: $("#rg-pago").value };
    if (!datos.para || !datos.de) return toast("Escribí para quién es y de parte de quién.");
    const boton = document.querySelector('#f-regalo button[type="submit"]'); if (boton) boton.disabled = true;
    try {
      if (!r){
        const id = nuevoCodigo(new Set(this.regalos.map(x => x.id)));
        Object.assign(datos, { creado: nowISO(), vence: sumarMeses(hoySV(), REGALO_MESES), usada: null });
        await setDoc(doc(db,"regalos",id), datos);
        if (!this.regalos.some(x => x.id === id)) this.regalos.push({id, ...datos});
        this.regOpen = id; this.renderRegalo(); this.renderRegalos();
        toast("Tarjeta activada. Tocá «Compartir tarjeta» para mandarla.");
      } else {
        await updateDoc(doc(db,"regalos",r.id), datos);
        this.regOpen = r.id; this.renderRegalo();
        toast("Datos guardados");
      }
    } catch(e){ if (boton) boton.disabled = false; this.errorRegalo(e); }
  },

  async compartirRegalo(id){
    const r = this.regalos.find(x => x.id === id); if (!r) return;
    let img; try { img = await this.imagenRegalo(r); } catch { return toast("No cargó la tarjeta. Revisá tu internet."); }
    const file = new File([img.blob], "Tarjeta de regalo Meraki - "+String(r.para||"").replace(/[^\p{L}\p{N} ]/gu,"").trim()+".png", {type:"image/png"});
    const text = "🎁 Tarjeta de regalo Meraki para "+r.para+": "+r.servicio+".\nVale hasta el "+MerakiRegalo.fechaLarga(r.vence)+". Para usarla, apartá tu cita en merakibarbershop.com o al WhatsApp 6061-8603 y enseñá la tarjeta en la barbería.";
    if (navigator.canShare && navigator.canShare({files:[file]})){
      try { await navigator.share({files:[file], text}); } catch(e){ if (e.name !== "AbortError") toast("No se pudo compartir."); }
    } else {
      const a = document.createElement("a"); a.href = img.url; a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
      toast("Imagen descargada. Mandala por WhatsApp.");
    }
  },

  async marcarRegalo(id, usada){
    try {
      await updateDoc(doc(db,"regalos",id), {usada: usada ? nowISO() : null});
      if (this.regOpen === id && !document.querySelector("#reg-zona .confirm")) this.renderRegalo();
      if (usada) toast("Tarjeta marcada como usada", '<button data-reg-deshacer="'+esc(id)+'">Deshacer</button>');
      else toast("La tarjeta quedó activa otra vez");
    } catch(e){ this.errorRegalo(e); }
  },

  // Botones de la pestaña Regalos. Devuelve true si el clic era de aquí.
  async clicRegalo(t){
    const d = t.dataset;
    if (t.hasAttribute("data-reg-nueva")){ this.formRegalo(null); return true; }
    if (d.regF){ this.regFiltro = d.regF; this.regQuery = ""; const q = $("#rq"); if (q) q.value = ""; this.renderRegalos(); return true; }
    if (d.regAbrir){ this.abrirRegalo(d.regAbrir, false); return true; }
    if (d.regCompartir){ this.compartirRegalo(d.regCompartir); return true; }
    if (d.regEditar){ this.formRegalo(this.regalos.find(x => x.id === d.regEditar)); return true; }
    if (d.regUsar){
      const r = this.regalos.find(x => x.id === d.regUsar); if (!r) return true;
      const vencida = estadoRegalo(r) === "vencida";
      $("#reg-zona").innerHTML = '<span class="confirm">'+(vencida ? "Venció el "+fmtDia(r.vence)+". ¿La aceptás igual?" : "¿Ya usó la tarjeta? Queda marcada y no se puede volver a usar.")+
        ' <button class="btn sm gold" data-reg-si="'+esc(r.id)+'">'+(vencida ? "Sí, aceptarla" : "Sí, ya la usó")+'</button><button class="btn sm ghost" data-reg-no>No</button></span>';
      return true;
    }
    if (d.regSi){ $("#reg-zona").innerHTML = '<span class="hint-sm">Guardando…</span>'; await this.marcarRegalo(d.regSi, true); return true; }
    if (t.hasAttribute("data-reg-no")){ this.renderRegalo(); return true; }
    if (d.regReactivar){ await this.marcarRegalo(d.regReactivar, false); return true; }
    if (d.regDeshacer){ $("#toast-root").innerHTML = ""; await this.marcarRegalo(d.regDeshacer, false); return true; }
    if (t.hasAttribute("data-reg-askdel")){ $("#reg-del").innerHTML = '<span class="confirm">¿Eliminar esta tarjeta? Ya no se va a poder usar. <button class="btn sm danger" data-reg-del>Sí, eliminar</button><button class="btn sm ghost" data-reg-no>No</button></span>'; return true; }
    if (t.hasAttribute("data-reg-del")){
      const id = this.regOpen; closeSheetEl(); this.onSheetClosed();
      try { await deleteDoc(doc(db,"regalos",id)); toast("Tarjeta de regalo eliminada"); } catch(e){ this.errorRegalo(e); }
      return true;
    }
    if (t.hasAttribute("data-reg-copiar")){ copy(reglaRegalos(), "Regla copiada. Pegala en Firebase."); return true; }
    if (t.hasAttribute("data-reg-reintentar")){ this.regError = ""; this.regListos = false; this.renderRegalos(); this.escucharRegalos(); return true; }
    return false;
  }
});

/* ---- Eventos del panel ---- */
document.addEventListener("click", async ev => {
  if (!$("#v-clientes")) return;
  const t = ev.target.closest("button, a"); if (!t) return;
  const A = Admin;
  if (t.dataset.tab) return A.switchTab(t.dataset.tab);
  if (t.dataset.f){ A.filtro = t.dataset.f; return A.render(); }
  if (t.dataset.seg){ A.filtro = t.dataset.seg; return A.render(); }
  if (t.hasAttribute("data-nuevo")) return A.openForm(null);
  if (t.hasAttribute("data-scan")) return Scanner.open(r => {
    if (r.tipo === "regalo") return A.abrirRegalo(r.id, true);
    if (!A.openScanned(r.id)) toast("Esa tarjeta no está registrada.");
  });
  if (await A.clicRegalo(t)) return;
  if (t.dataset.open){ A.openId = t.dataset.open; return A.renderDetail(); }
  if (t.dataset.stamp) return A.stamp(t.dataset.stamp, 1);
  if (t.dataset.stamp2) return A.stamp(t.dataset.stamp2, 2);
  if (t.dataset.unstamp) return A.unstamp(t.dataset.unstamp);
  if (t.dataset.redeem) return A.redeem(t.dataset.redeem);
  if (t.dataset.edit) return A.openForm(A.clientes.find(x=>x.id===t.dataset.edit));
  if (t.dataset.sharecard) return A.shareCard(t.dataset.sharecard);
  if (t.hasAttribute("data-copymsg")) return copy($("#d-msg").textContent, "Mensaje copiado");
  if (t.hasAttribute("data-askdel")) { $("#del-zone").innerHTML = '<span class="confirm">¿Borrar tarjeta e historial? <button class="btn sm danger" data-del>Sí, borrar</button><button class="btn sm ghost" data-nodel>No</button></span>'; return; }
  if (t.hasAttribute("data-nodel")) return A.renderDetail();
  if (t.hasAttribute("data-del")){ const id = A.openId; closeSheetEl(); A.onSheetClosed(); try { await deleteDoc(doc(db,"clientes",id)); toast("Cliente eliminado"); } catch(e){ toast("No se pudo eliminar."); } return; }
  if (t.dataset.sent){ A.sent.add(t.dataset.sent); setTimeout(()=>A.renderAvisos(), 300); return; }
  if (t.hasAttribute("data-copymails")){ const em = A.clientes.filter(SEGMENTS[$("#c-seg").value].test).map(c=>c.email).filter(Boolean); return em.length ? copy(em.join(", "), em.length+" correos copiados") : toast("Nadie de este grupo tiene correo"); }
  if (t.hasAttribute("data-savecfg")) return A.saveConfig();
});
document.addEventListener("change", ev => {
  if (!$("#v-clientes")) return;
  if (ev.target.id==="rg-serv"){ const o = ev.target.selectedOptions[0]; if (o) $("#rg-precio").value = o.dataset.precio; return; }
  if (ev.target.id==="d-tpl") Admin.renderDetail();
  if (ev.target.id==="c-tpl"){ $("#c-txt").value = cfg.plantillas[ev.target.value]; Admin.renderAvisos(); }
  if (ev.target.id==="c-seg") Admin.renderAvisos();
});
document.addEventListener("keydown", e => { if (e.key==="Escape" && $("#sheet-root").innerHTML){ closeSheetEl(); Admin.onSheetClosed(); } });

/* ================================================================
   ESCÁNER EN VIVO
   ================================================================ */
const Scanner = {
  stream:null, raf:null, el:null, done:null,
  async open(onFound){
    this.done = onFound;
    if (!window.jsQR) return toast("El lector no cargó. Revisá tu internet.");
    this.el = document.createElement("div"); this.el.className = "scanner";
    this.el.innerHTML = '<video playsinline muted></video><div class="frame"></div><div class="bar"><span id="sc-msg">Apuntá al código QR de la tarjeta Meraki o de la tarjeta de regalo</span><button class="btn lg" id="sc-close">Cancelar</button></div>';
    document.body.appendChild(this.el);
    this.el.querySelector("#sc-close").onclick = () => this.close();
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}, width:{ideal:1280}, height:{ideal:720}}, audio:false});
    } catch(e){
      this.el.querySelector("#sc-msg").textContent = e && e.name==="NotAllowedError" ? "La app no tiene permiso de cámara. Activalo en Ajustes del teléfono > Apps > Meraki > Permisos." : "No se pudo abrir la cámara.";
      return;
    }
    const v = this.el.querySelector("video"); v.srcObject = this.stream; await v.play().catch(()=>{});
    const cv = document.createElement("canvas"), g = cv.getContext("2d", {willReadFrequently:true});
    let last = 0;
    const tick = ts => {
      if (!this.stream) return;
      if (ts - last > 180 && v.readyState >= 2){
        last = ts;
        const s = Math.min(1, 720/Math.max(v.videoWidth, v.videoHeight));
        cv.width = Math.round(v.videoWidth*s); cv.height = Math.round(v.videoHeight*s);
        g.drawImage(v,0,0,cv.width,cv.height);
        const code = jsQR(g.getImageData(0,0,cv.width,cv.height).data, cv.width, cv.height, {inversionAttempts:"dontInvert"});
        if (code){
          const r = leerQR(code.data);
          if (r){ navigator.vibrate?.(60); this.close(); this.done(r); return; }
          this.el.querySelector("#sc-msg").textContent = "Ese QR no es de Meraki.";
        }
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  },
  close(){
    cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach(t=>t.stop()); this.stream = null;
    this.el?.remove(); this.el = null;
  }
};
