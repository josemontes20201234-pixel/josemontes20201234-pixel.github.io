// Proyector: control desde el cel. Biblia, canciones, anuncios, fondos y estilo.
import { firebaseConfig, ADMIN_EMAIL } from "../config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, addDoc, updateDoc, deleteDoc, collection, onSnapshot, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { LIBROS, VERSIONES, FUENTES, FONDOS, TRANSICIONES, ESTILO_BASE, norm, esc, parseCita, nombreLibro, crearEscena, pintar, ESCENA_CSS } from "./shared.js";

document.getElementById("escena-css").textContent = ESCENA_CSS;
const fb = initializeApp(firebaseConfig, "proyector");
const auth = getAuth(fb);
const db = getFirestore(fb);
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const toast = m => { const t = document.createElement("div"); t.className = "toast"; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2400); };
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch { return d } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch { } } };

const IC = {
  biblia: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3M12 6.5v6M9.5 9h5"/></svg>',
  cancion: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/></svg>',
  anuncio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10v4a1 1 0 0 0 1 1h3l6 4V5L7 9H4a1 1 0 0 0-1 1z"/><path d="M17 8.5a5 5 0 0 1 0 7M19.5 6a8.5 8.5 0 0 1 0 12"/></svg>',
  fondo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/></svg>',
  estilo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>',
  prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
  ocultar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 8.5 4.5 9.5 6a17 17 0 0 1-2.7 3.2M6.6 6.6C4.4 8 3 10 2.5 12c1 1.5 4.5 6 9.5 6 1.6 0 3-.4 4.3-1.1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>',
  negro: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="5" width="18" height="14" rx="2"/></svg>',
  tv: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
  out: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l-4-4 4-4M6 12h10"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  google: '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8.1z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.8 0-5.2-1.9-6.1-4.5H2.2v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.9 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.2a11 11 0 0 0 0 9.9z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.1 1.6l3.1-3.1A11 11 0 0 0 2.2 7.1l3.7 2.8C6.8 7.3 9.2 5.4 12 5.4z"/></svg>'
};

/* ---------- himno de dominio público incluido (traducción de Juan B. Cabrera) ---------- */
const HIMNOS = [{ id: "pd-santo", titulo: "¡Santo! ¡Santo! ¡Santo!", autor: "R. Heber · trad. J. B. Cabrera (dominio público)", fijo: true,
  letra: "¡Santo! ¡Santo! ¡Santo! Señor omnipotente,\nsiempre el labio mío loores te dará;\n¡Santo! ¡Santo! ¡Santo! te adoro reverente,\nDios en tres personas, bendita Trinidad.\n\n¡Santo! ¡Santo! ¡Santo! la inmensa muchedumbre\nde ángeles que cumplen tu santa voluntad,\nante ti se postra bañada de tu lumbre,\nante ti que has sido, que eres y serás.\n\n¡Santo! ¡Santo! ¡Santo! por más que estés velado\ne imposible sea tu gloria contemplar,\nsanto tú eres solo, y nada hay a tu lado\nen poder perfecto, pureza y caridad.\n\n¡Santo! ¡Santo! ¡Santo! la gloria de tu nombre\nvemos en tus obras en cielo, tierra y mar;\n¡Santo! ¡Santo! ¡Santo! te adora todo hombre,\nDios en tres personas, bendita Trinidad." }];

/* ---------- estado ---------- */
let LIVE = { ts: 0, modo: "fondo", texto: "", ref: "", titulo: "", img: null, fondo: { id: "noche" }, estilo: { ...ESTILO_BASE }, negro: false, oculto: false };
let CTX = null;                          // de dónde vino lo que está en vivo, para Anterior / Siguiente
let CANCIONES = [], ANUNCIOS = [], FONDOS_IMG = [];
const BIB = {}, IDX = {};
let TAB = store.get("pr-tab", "biblia");
const B = { ver: store.get("pr-ver", "rv1909"), vista: "libros", libro: 42, cap: 3, q: "", filtro: "todo" };
const S = { vista: "lista", id: null, q: "" };
let FAVS = store.get("pr-favs", []);
let escena = null, bc = null, stopFns = [];
try { bc = new BroadcastChannel("proyector-meraki"); } catch { }

/* ---------- enviar a la pantalla ---------- */
let tGuardar = null;
function fondoImgActual() { const f = LIVE.fondo; if (!f || !f.img) return null; const x = FONDOS_IMG.find(d => d.id === f.id); return x ? x.img : null; }
function enviar(cambio, lento) {
  LIVE = Object.assign({}, LIVE, cambio, { ts: Date.now() });
  pintar(escena, LIVE, fondoImgActual());
  actualizarLive();
  try { bc && bc.postMessage({ tipo: "estado", estado: LIVE, fondoImg: fondoImgActual() }); } catch { }
  clearTimeout(tGuardar);
  const guardar = () => setDoc(doc(db, "proyector", "en_vivo"), LIVE).catch(e => toast("No se pudo enviar a la tele: " + (e.code || e.message)));
  if (lento) tGuardar = setTimeout(guardar, 350); else guardar();
}
function proyectarTexto(texto, ref, titulo, ctx) {
  CTX = ctx || null;
  const c = { modo: "texto", texto, ref: ref || "", titulo: titulo || "", img: null, negro: false, oculto: false };
  enviar(c);
}

/* ---------- Biblia ---------- */
async function cargarVersion(id) {
  if (BIB[id]) return BIB[id];
  const r = await fetch(`biblia/${id}.json`); if (!r.ok) throw new Error("No se pudo cargar la Biblia");
  const d = await r.json();
  BIB[id] = d.map(l => l.map(c => c.map(v => v.normalize("NFC"))));
  return BIB[id];
}
const verInfo = id => VERSIONES.find(v => v.id === id) || VERSIONES[0];
function citaTexto(ver, l, c, v) { const vi = verInfo(ver); return `${nombreLibro(l, vi.en)} ${c}:${v} · ${vi.corto}`; }
function proyectarVerso(ver, l, c, v) {
  const t = BIB[ver]?.[l]?.[c - 1]?.[v - 1]; if (t == null) return;
  proyectarTexto(t, citaTexto(ver, l, c, v), "", { tipo: "biblia", ver, l, c, v });
  if (TAB === "biblia" && B.vista === "vers" && B.libro === l && B.cap === c) marcarVerso();
}
function pasoBiblia(d) {
  const { ver } = CTX; let { l, c, v } = CTX; const bib = BIB[ver];
  v += d;
  if (v < 1) { c--; if (c < 1) { l--; if (l < 0) return; c = bib[l].length; } v = bib[l][c - 1].length; }
  else if (v > bib[l][c - 1].length) { v = 1; c++; if (c > bib[l].length) { l++; if (l >= bib.length) return; c = 1; } }
  if (TAB === "biblia" && B.vista === "vers" && (B.libro !== l || B.cap !== c)) { B.libro = l; B.cap = c; proyectarVerso(ver, l, c, v); renderMain(); marcarVerso(true); return; }
  proyectarVerso(ver, l, c, v); marcarVerso(true);
}
function marcarVerso(scroll) {
  $$(".v[data-v]").forEach(el => el.classList.toggle("on", !!CTX && CTX.tipo === "biblia" && CTX.ver === B.ver && CTX.l === B.libro && CTX.c === B.cap && +el.dataset.v === CTX.v));
  const on = $(".v.on"); if (scroll && on) on.scrollIntoView({ block: "center", behavior: "smooth" });
}
function buscarBiblia(ver, q, filtro) {
  const bib = BIB[ver]; if (!bib) return [];
  if (!IDX[ver]) { IDX[ver] = []; bib.forEach((lib, l) => lib.forEach((cap, c) => cap.forEach((t, v) => IDX[ver].push([l, c + 1, v + 1, norm(t)])))); }
  const ws = norm(q).split(/\s+/).filter(w => w.length > 1); if (!ws.length) return [];
  const out = [];
  for (const it of IDX[ver]) {
    if (filtro === "at" && it[0] > 38) continue; if (filtro === "nt" && it[0] < 39) continue;
    if (ws.every(w => it[3].includes(w))) { out.push(it); if (out.length >= 150) break; }
  }
  return out.map(([l, c, v]) => ({ l, c, v, t: bib[l][c - 1][v - 1] }));
}
function resaltar(t, q) {
  const ws = norm(q).split(/\s+/).filter(w => w.length > 1); if (!ws.length) return esc(t);
  const n = norm(t); const marks = new Array(t.length).fill(false);
  ws.forEach(w => { let i = n.indexOf(w); while (i >= 0) { for (let k = i; k < i + w.length; k++) marks[k] = true; i = n.indexOf(w, i + w.length); } });
  let out = "", open = false;
  for (let i = 0; i < t.length; i++) { if (marks[i] && !open) { out += "<mark>"; open = true } if (!marks[i] && open) { out += "</mark>"; open = false } out += esc(t[i]); }
  return out + (open ? "</mark>" : "");
}
const esFav = (l, c, v) => FAVS.some(f => f.l === l && f.c === c && f.v === v);
function toggleFav(l, c, v) { FAVS = esFav(l, c, v) ? FAVS.filter(f => !(f.l === l && f.c === c && f.v === v)) : [{ l, c, v }, ...FAVS].slice(0, 200); store.set("pr-favs", FAVS); }

function vBiblia() {
  const bib = BIB[B.ver];
  const vers = `<div class="chips" role="group" aria-label="Versión">${VERSIONES.map(v => `<button type="button" data-ver="${v.id}" aria-pressed="${B.ver === v.id}">${v.corto}</button>`).join("")}</div>`;
  if (!bib) return `<div class="sec">${vers}<div class="empty">Cargando ${esc(verInfo(B.ver).nombre)}…</div></div>`;
  const modos = `<div class="chips">${[["libros", "Libros"], ["buscar", "Buscar palabras"], ["favs", "Favoritos" + (FAVS.length ? " · " + FAVS.length : "")]].map(m => `<button type="button" data-bv="${m[0]}" aria-pressed="${B.vista === m[0] || (m[0] === "libros" && (B.vista === "caps" || B.vista === "vers"))}">${m[1]}</button>`).join("")}</div>`;
  const ir = `<form class="go" id="irForm"><input class="input" id="ir" placeholder="Ir a… Juan 3:16, Sal 23, 1 Co 13:4" autocomplete="off" aria-label="Ir a una cita"><button class="btn" type="submit">Ir</button></form>`;
  let body = "";
  if (B.vista === "libros") {
    const g = (a, b, cls) => `<div class="grid-libros ${cls}">${LIBROS.slice(a, b).map((x, i) => `<button type="button" data-libro="${a + i}" aria-label="${esc(x[0])}">${esc(x[1])}<small>${esc(x[0])}</small></button>`).join("")}</div>`;
    body = `<span class="lbl">Antiguo Testamento</span>${g(0, 39, "")}<span class="lbl">Nuevo Testamento</span>${g(39, 66, "nt")}`;
  } else if (B.vista === "caps") {
    const n = bib[B.libro].length;
    body = `<div class="crumbs"><button type="button" data-bv="libros">Libros</button><span>›</span>${esc(LIBROS[B.libro][0])}</div>
      <div class="grid-caps">${Array.from({ length: n }, (_, i) => `<button type="button" data-cap="${i + 1}">${i + 1}</button>`).join("")}</div>`;
  } else if (B.vista === "vers") {
    const cap = bib[B.libro][B.cap - 1] || [];
    body = `<div class="crumbs"><button type="button" data-bv="libros">Libros</button><span>›</span><button type="button" data-libro="${B.libro}">${esc(LIBROS[B.libro][0])}</button><span>›</span>Capítulo ${B.cap}</div>
      <div class="vlist">${cap.map((t, i) => t ? `<div class="v" data-v="${i + 1}" role="button" tabindex="0"><span class="n">${i + 1}</span><span class="x">${esc(t)}</span><button type="button" class="star ${esFav(B.libro, B.cap, i + 1) ? "on" : ""}" data-fav="${i + 1}" aria-label="Favorito">★</button></div>` : "").join("")}</div>
      <div class="row" style="display:flex;gap:8px;justify-content:space-between"><button type="button" class="btn ghost sm" data-capd="-1" ${B.libro === 0 && B.cap === 1 ? "disabled" : ""}>← Cap. anterior</button><button type="button" class="btn ghost sm" data-capd="1">Cap. siguiente →</button></div>`;
  } else if (B.vista === "buscar") {
    const res = B.q.trim().length > 1 ? buscarBiblia(B.ver, B.q, B.filtro) : null;
    body = `<input class="input" id="bq" type="search" placeholder="Palabras a buscar: caridad sufrida" value="${esc(B.q)}" aria-label="Buscar en la Biblia">
      <div class="chips">${[["todo", "Toda la Biblia"], ["at", "A.T."], ["nt", "N.T."]].map(f => `<button type="button" data-bf="${f[0]}" aria-pressed="${B.filtro === f[0]}">${f[1]}</button>`).join("")}</div>
      ${res === null ? '<p class="muted" style="font-size:14px">Escribí dos letras o más.</p>' : res.length ? `<span class="lbl">${res.length >= 150 ? "Primeros 150 resultados" : res.length === 1 ? "1 resultado" : res.length + " resultados"}</span><div class="vlist">${res.map(r => `<div class="v" role="button" tabindex="0" data-go="${r.l},${r.c},${r.v}"><span class="n">${esc(LIBROS[r.l][1])}<br>${r.c}:${r.v}</span><span class="x">${resaltar(r.t, B.q)}</span><span></span></div>`).join("")}</div>` : '<div class="empty">No encontré esas palabras.</div>'}`;
  } else if (B.vista === "favs") {
    body = FAVS.length ? `<div class="vlist">${FAVS.map(f => { const t = bib[f.l]?.[f.c - 1]?.[f.v - 1] || ""; return `<div class="v" role="button" tabindex="0" data-go="${f.l},${f.c},${f.v}"><span class="n">${esc(LIBROS[f.l][1])}<br>${f.c}:${f.v}</span><span class="x">${esc(t)}</span><button type="button" class="star on" data-unfav="${f.l},${f.c},${f.v}" aria-label="Quitar de favoritos">★</button></div>` }).join("")}</div>`
      : '<div class="empty">Marcá versículos con la estrella ★ para tenerlos a mano en el culto.</div>';
  }
  return `<div class="sec">${vers}${ir}${modos}${body}</div>`;
}

/* ---------- Canciones ---------- */
const estrofas = c => String(c.letra || "").split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
const todasCanciones = () => [...CANCIONES, ...HIMNOS];
function proyectarEstrofa(id, i) {
  const c = todasCanciones().find(x => x.id === id); if (!c) return; const e = estrofas(c); if (!e[i]) return;
  proyectarTexto(e[i], `${c.titulo}  ·  ${i + 1}/${e.length}`, "", { tipo: "cancion", id, i, n: e.length });
  $$(".estrofa").forEach(el => el.classList.toggle("on", +el.dataset.i === i && S.id === id));
  const on = $(".estrofa.on"); if (on) on.scrollIntoView({ block: "nearest", behavior: "smooth" });
}
function vCanciones() {
  if (S.vista === "ver") {
    const c = todasCanciones().find(x => x.id === S.id);
    if (!c) { S.vista = "lista"; return vCanciones(); }
    const e = estrofas(c);
    return `<div class="sec"><div class="crumbs"><button type="button" data-sv="lista">Canciones</button><span>›</span></div>
      <div class="head"><h2>${esc(c.titulo)}</h2>${c.fijo ? "" : `<button class="btn ghost sm" type="button" data-editc="${c.id}">Editar</button>`}</div>
      ${c.autor ? `<p class="muted" style="font-size:13.5px;margin-top:-6px">${esc(c.autor)}</p>` : ""}
      <p class="muted" style="font-size:13px">Tocá una estrofa para proyectarla. Con ▶ pasás a la siguiente.</p>
      <div class="estrofas">${e.map((t, i) => `<button type="button" class="estrofa ${CTX && CTX.tipo === "cancion" && CTX.id === c.id && CTX.i === i ? "on" : ""}" data-i="${i}" data-est="${i}"><span class="k">${i + 1}</span>${esc(t)}</button>`).join("")}</div></div>`;
  }
  const q = norm(S.q);
  const L = todasCanciones().filter(c => !q || norm(c.titulo + " " + (c.autor || "") + " " + c.letra).includes(q)).sort((a, b) => a.titulo.localeCompare(b.titulo, "es"));
  return `<div class="sec"><div class="head"><h2>Canciones</h2><button class="btn sm" type="button" data-newc>+ Nueva</button></div>
    <input class="input" id="sq" type="search" placeholder="Buscar por título o letra" value="${esc(S.q)}" aria-label="Buscar canción">
    ${L.length ? `<div class="list">${L.map(c => `<button type="button" class="row-item" data-cancion="${c.id}"><span style="min-width:0"><b>${esc(c.titulo)}</b><small>${esc(c.autor || "")}${c.autor ? " · " : ""}${estrofas(c).length} estrofas</small></span><span class="muted">›</span></button>`).join("")}</div>` : '<div class="empty">No hay canciones con ese nombre.</div>'}
    ${CANCIONES.length ? "" : '<p class="muted" style="font-size:13.5px">Agregá las letras que cantan en tu iglesia con "+ Nueva". Dejá una línea en blanco entre cada estrofa.</p>'}</div>`;
}
function formCancion(c) {
  const n = !c; c = c || { titulo: "", autor: "", letra: "" };
  abrirHoja(n ? "Nueva canción" : "Editar canción", `<form class="form" id="fc">
    <label>Título<input id="c_t" required maxlength="100" value="${esc(c.titulo)}"></label>
    <label>Autor o nota (opcional)<input id="c_a" maxlength="100" value="${esc(c.autor || "")}"></label>
    <label>Letra · dejá una línea en blanco entre estrofas<textarea id="c_l" placeholder="Primera estrofa…&#10;&#10;Coro…">${esc(c.letra)}</textarea></label>
    <button class="btn wide" type="submit">${n ? "Guardar canción" : "Guardar cambios"}</button>
    ${n ? "" : '<button class="btn danger wide" type="button" id="c_del">Borrar canción</button><div id="cdel"></div>'}</form>`, s => {
    $("#fc", s).onsubmit = async e => {
      e.preventDefault(); const d = { titulo: $("#c_t", s).value.trim(), autor: $("#c_a", s).value.trim(), letra: $("#c_l", s).value.replace(/\r/g, "").trim() };
      if (!d.titulo || !d.letra) return toast("Poné el título y la letra.");
      try { if (n) { d.creado = Date.now(); const r = await addDoc(collection(db, "proyector_canciones"), d); S.id = r.id } else { await updateDoc(doc(db, "proyector_canciones", c.id), d); S.id = c.id }
        S.vista = "ver"; cerrarHoja(); toast("Canción guardada."); renderMain(); }
      catch (er) { toast("No se pudo guardar: " + (er.code || er.message)) }
    };
    const del = $("#c_del", s); if (del) del.onclick = () => {
      $("#cdel", s).innerHTML = `<div class="confirm"><b>¿Borrar "${esc(c.titulo)}"?</b><div style="display:flex;gap:8px"><button class="btn danger sm" type="button" id="cd2">Sí, borrar</button><button class="btn ghost sm" type="button" id="cd0">Cancelar</button></div></div>`;
      $("#cd0", s).onclick = () => $("#cdel", s).innerHTML = "";
      $("#cd2", s).onclick = async () => { try { await deleteDoc(doc(db, "proyector_canciones", c.id)); S.vista = "lista"; cerrarHoja(); toast("Canción borrada."); renderMain() } catch (er) { toast("No se pudo borrar: " + (er.code || er.message)) } };
    };
  });
}

/* ---------- Anuncios ---------- */
function vAnuncios() {
  return `<div class="sec"><div class="head"><h2>Anuncios</h2><button class="btn sm" type="button" data-newa>+ Nuevo</button></div>
    <div class="field"><span>Texto rápido</span><textarea class="input" id="rapido" rows="3" placeholder="Bienvenidos · Culto de oración el jueves 7 p.m." style="resize:vertical;background:var(--surface-2)">${esc(store.get("pr-rapido", ""))}</textarea><button class="btn" type="button" id="rapidoBtn">Proyectar texto</button></div>
    ${ANUNCIOS.length ? `<span class="lbl">Guardados</span><div class="list">${ANUNCIOS.map(a => `<div class="row-item" style="grid-template-columns:${a.img ? "64px " : ""}minmax(0,1fr) auto auto">${a.img ? `<img src="${a.img}" alt="" style="width:64px;height:36px;object-fit:cover;border-radius:6px">` : ""}<span style="min-width:0"><b>${esc(a.titulo || "Imagen")}</b><small>${esc((a.texto || "").replace(/\n/g, " ")) || (a.img ? "Imagen" : "")}</small></span><button class="btn ghost sm" type="button" data-edita="${a.id}">Editar</button><button class="btn sm" type="button" data-anuncio="${a.id}">Proyectar</button></div>`).join("")}</div>`
      : '<div class="empty">Guardá anuncios que repetís: bienvenida, ofrendas, actividades de la semana. También pueden ser una imagen.</div>'}</div>`;
}
function proyectarAnuncio(a) {
  CTX = null;
  if (a.img) enviar({ modo: "img", img: a.img, texto: "", ref: "", titulo: "", negro: false, oculto: false });
  else enviar({ modo: "texto", texto: a.texto || "", titulo: a.titulo || "", ref: "", img: null, negro: false, oculto: false });
}
function formAnuncio(a) {
  const n = !a; a = a || { titulo: "", texto: "", img: null }; let img = a.img || null;
  abrirHoja(n ? "Nuevo anuncio" : "Editar anuncio", `<form class="form" id="fa">
    <label>Título<input id="a_t" maxlength="80" value="${esc(a.titulo)}" placeholder="Bienvenidos"></label>
    <label>Texto<textarea id="a_x" style="min-height:110px" placeholder="Domingo 10 a.m. · Escuela dominical">${esc(a.texto)}</textarea></label>
    <label>Imagen (opcional, se proyecta en lugar del texto)<input id="a_i" type="file" accept="image/*"></label>
    <div id="a_prev">${img ? `<img src="${img}" alt="" style="width:100%;border-radius:10px">` : ""}</div>
    ${img ? '<button class="btn ghost sm" type="button" id="a_q">Quitar imagen</button>' : ""}
    <button class="btn wide" type="submit">${n ? "Guardar anuncio" : "Guardar cambios"}</button>
    ${n ? "" : '<button class="btn danger wide" type="button" id="a_del">Borrar anuncio</button><div id="adel"></div>'}</form>`, s => {
    $("#a_i", s).onchange = async e => { const f = e.target.files[0]; if (!f) return; try { img = await comprimir(f, 1600, 700000); $("#a_prev", s).innerHTML = `<img src="${img}" alt="" style="width:100%;border-radius:10px">` } catch { toast("No pude leer esa imagen.") } };
    const q = $("#a_q", s); if (q) q.onclick = () => { img = null; $("#a_prev", s).innerHTML = ""; q.remove() };
    $("#fa", s).onsubmit = async e => {
      e.preventDefault(); const d = { titulo: $("#a_t", s).value.trim(), texto: $("#a_x", s).value.trim(), img: img || null };
      if (!d.titulo && !d.texto && !d.img) return toast("Poné un texto o una imagen.");
      try { if (n) { d.creado = Date.now(); await addDoc(collection(db, "proyector_anuncios"), d) } else await updateDoc(doc(db, "proyector_anuncios", a.id), d); cerrarHoja(); toast("Anuncio guardado.") }
      catch (er) { toast("No se pudo guardar: " + (er.code || er.message)) }
    };
    const del = $("#a_del", s); if (del) del.onclick = () => {
      $("#adel", s).innerHTML = `<div class="confirm"><b>¿Borrar este anuncio?</b><div style="display:flex;gap:8px"><button class="btn danger sm" type="button" id="ad2">Sí, borrar</button><button class="btn ghost sm" type="button" id="ad0">Cancelar</button></div></div>`;
      $("#ad0", s).onclick = () => $("#adel", s).innerHTML = "";
      $("#ad2", s).onclick = async () => { try { await deleteDoc(doc(db, "proyector_anuncios", a.id)); cerrarHoja(); toast("Anuncio borrado.") } catch (er) { toast("No se pudo borrar: " + (er.code || er.message)) } };
    };
  });
}
function comprimir(file, maxLado, maxBytes) {
  return new Promise((ok, mal) => {
    const fr = new FileReader(); fr.onerror = mal;
    fr.onload = () => { const im = new Image(); im.onerror = mal; im.onload = () => {
      const k = Math.min(1, maxLado / Math.max(im.width, im.height)); const c = document.createElement("canvas");
      c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
      let q = .82, url = c.toDataURL("image/jpeg", q); while (url.length > maxBytes && q > .4) { q -= .08; url = c.toDataURL("image/jpeg", q) } ok(url);
    }; im.src = fr.result; }; fr.readAsDataURL(file);
  });
}

/* ---------- Fondos ---------- */
function vFondos() {
  const e = Object.assign({}, ESTILO_BASE, LIVE.estilo); const cur = LIVE.fondo && LIVE.fondo.id;
  return `<div class="sec"><div class="head"><h2>Fondos</h2><label class="btn sm" style="cursor:pointer">+ Subir imagen<input type="file" accept="image/*" id="subirFondo" hidden></label></div>
    <div class="fgrid">${FONDOS.map(f => `<button type="button" class="fondo ${cur === f.id ? "on" : ""}" data-fondo="${f.id}" style="background:${f.css}"><span>${esc(f.nombre)}</span></button>`).join("")}</div>
    <span class="lbl">Tus imágenes</span>
    ${FONDOS_IMG.length ? `<div class="fgrid">${FONDOS_IMG.map(f => `<div class="fondo ${cur === f.id ? "on" : ""}" role="button" tabindex="0" data-fondoimg="${f.id}"><img src="${f.img}" alt=""><button type="button" class="del" data-delfondo="${f.id}" aria-label="Borrar fondo">✕</button></div>`).join("")}</div>`
      : '<p class="muted" style="font-size:13.5px">Subí fotos de paisajes, cruces o el logo de tu iglesia. Se ven en la tele sin que tengás que hacer nada más.</p>'}
    <label class="sw"><span>Fondo con movimiento suave</span><input type="checkbox" id="e_mov" ${e.mov ? "checked" : ""}></label>
    <label class="sw"><span>Ocultar el texto al cambiar de fondo</span><input type="checkbox" id="e_borrar" ${e.borrarAlFondo ? "checked" : ""}></label></div>`;
}
function ponerFondo(id, esImg) {
  const e = Object.assign({}, ESTILO_BASE, LIVE.estilo);
  const c = { fondo: esImg ? { id, img: true } : { id } }; if (e.borrarAlFondo) c.oculto = true;
  enviar(c); renderMain();
}

/* ---------- Estilo ---------- */
function vEstilo() {
  const e = Object.assign({}, ESTILO_BASE, LIVE.estilo);
  return `<div class="sec"><div class="head"><h2>Estilo del texto</h2><button class="btn ghost sm" type="button" id="e_reset">Restablecer</button></div>
    <div class="field"><span>Tipo de letra</span><select id="e_fuente">${FUENTES.map(f => `<option value="${esc(f[0])}" ${e.fuente === f[0] ? "selected" : ""} style="font-family:${f[1]}">${esc(f[0])}</option>`).join("")}</select></div>
    <div class="two st"><div class="field"><span>Tamaño máximo <b class="mono" id="v_tam">${e.tam}</b></span><input type="range" id="e_tam" min="5" max="22" step="1" value="${e.tam}"></div>
    <div class="field"><span>Márgenes <b class="mono" id="v_margen">${e.margen}%</b></span><input type="range" id="e_margen" min="2" max="18" step="1" value="${e.margen}"></div></div>
    <div class="field"><span>Alineación</span><div class="chips">${[["left", "Izquierda"], ["center", "Centro"], ["right", "Derecha"]].map(a => `<button type="button" data-alin="${a[0]}" aria-pressed="${e.alin === a[0]}">${a[1]}</button>`).join("")}</div></div>
    <div class="two st"><label class="sw"><span>Negrita</span><input type="checkbox" id="e_negrita" ${e.negrita ? "checked" : ""}></label><label class="sw"><span>Mayúsculas</span><input type="checkbox" id="e_mayus" ${e.mayus ? "checked" : ""}></label></div>
    <div class="field"><span>Colores</span><div class="colors"><label style="display:flex;gap:8px;align-items:center">Letra <input type="color" id="e_color" value="${e.color}"></label>
      <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="e_sombra" ${e.sombra ? "checked" : ""} style="width:20px;height:20px;accent-color:var(--accent)"> Sombra <input type="color" id="e_sombraColor" value="${e.sombraColor}"></label></div></div>
    <label class="sw"><span>Mostrar la cita o el título abajo</span><input type="checkbox" id="e_cita" ${e.cita ? "checked" : ""}></label>
    <div class="field"><span>Efecto al cambiar</span><select id="e_trans">${TRANSICIONES.map(t => `<option value="${t[0]}" ${e.trans === t[0] ? "selected" : ""}>${t[1]}</option>`).join("")}</select><button class="btn ghost sm" type="button" id="e_prueba">Probar efecto</button></div></div>`;
}
function setEstilo(c, lento) { enviar({ estilo: Object.assign({}, ESTILO_BASE, LIVE.estilo, c) }, lento); }

/* ---------- barra en vivo ---------- */
function montarShell() {
  $("#app").innerHTML = `<div class="live" id="live"><div class="prev" id="prev" title="Agrandar vista previa"><span class="badge">EN VIVO</span></div>
    <div class="livebox"><div style="display:flex;gap:8px;align-items:center"><div class="now" style="flex:1"><b id="nowT">Nada en pantalla</b><small id="nowS">Escogé un versículo, canción o anuncio</small></div>
      <button class="iconbtn" type="button" id="visorBtn" aria-label="Conectar la tele">${IC.tv}</button></div>
      <div class="ctl"><button type="button" id="bPrev" aria-label="Anterior">${IC.prev}Atrás</button><button type="button" id="bNext" aria-label="Siguiente">${IC.next}Sigue</button>
      <button type="button" id="bOcultar">${IC.ocultar}Ocultar</button><button type="button" id="bNegro">${IC.negro}Negro</button></div></div></div>
    <main id="main"></main>`;
  escena = crearEscena($("#prev"));
  $("#prev").appendChild(Object.assign(document.createElement("span"), { className: "badge", textContent: "EN VIVO" }));
  $("#prev").onclick = () => { $("#live").classList.toggle("grande"); setTimeout(() => { escena.key = null; escena.fondoKey = null; pintar(escena, Object.assign({}, LIVE, { estilo: Object.assign({}, LIVE.estilo, { trans: "ninguna" }) }), fondoImgActual()) }, 30) };
  $("#bPrev").onclick = () => paso(-1); $("#bNext").onclick = () => paso(1);
  $("#bOcultar").onclick = () => enviar({ oculto: !LIVE.oculto });
  $("#bNegro").onclick = () => enviar({ negro: !LIVE.negro });
  $("#visorBtn").onclick = hojaVisor;
  $("#tabs").hidden = false;
  pintar(escena, LIVE, fondoImgActual()); actualizarLive();
}
function actualizarLive() {
  const t = $("#nowT"), s = $("#nowS"); if (!t) return;
  if (LIVE.modo === "texto") { t.textContent = LIVE.ref || LIVE.titulo || "Texto"; s.textContent = (LIVE.texto || "").replace(/\n/g, " "); }
  else if (LIVE.modo === "img") { t.textContent = "Imagen"; s.textContent = "Anuncio con imagen"; }
  else { t.textContent = "Sólo el fondo"; s.textContent = "Escogé un versículo, canción o anuncio"; }
  if (LIVE.negro) s.textContent = "Pantalla en negro";
  else if (LIVE.oculto) s.textContent = "Texto oculto · se ve sólo el fondo";
  $("#bNegro").classList.toggle("on", !!LIVE.negro); $("#bOcultar").classList.toggle("on", !!LIVE.oculto);
  $("#bPrev").disabled = $("#bNext").disabled = !CTX;
}
function paso(d) {
  if (!CTX) return;
  if (CTX.tipo === "biblia") pasoBiblia(d);
  else if (CTX.tipo === "cancion") { const i = CTX.i + d; if (i >= 0 && i < CTX.n) proyectarEstrofa(CTX.id, i); }
}
function hojaVisor() {
  const url = new URL("visor.html", location.href).href;
  abrirHoja("Conectar la tele", `<p>En la tele, el proyector o la laptop, abrí este link en el navegador. Lo que mandés desde aquí aparece allá al instante.</p>
    <div class="link"><code id="vurl">${esc(url)}</code><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm" type="button" id="copiar">Copiar link</button><a class="btn ghost sm" href="${esc(url)}" target="_blank" rel="noopener" style="text-decoration:none">Abrir aquí</a></div></div>
    <ol style="margin:0;padding-left:20px;display:grid;gap:6px;color:var(--muted);font-size:14.5px"><li>En la tele, tocá o hacé clic una vez para ponerla en pantalla completa.</li><li>La tele no necesita tu cuenta: sólo lee lo que mandás.</li><li>Si la tele tiene teclado, la tecla F también la pone completa.</li></ol>`, s => {
    $("#copiar", s).onclick = async () => { try { await navigator.clipboard.writeText(url); toast("Link copiado.") } catch { const r = document.createRange(); r.selectNodeContents($("#vurl", s)); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); toast("Mantené presionado para copiar.") } };
  });
}

/* ---------- hojas ---------- */
function abrirHoja(t, html, bind) {
  $("#sheet").innerHTML = `<div class="scrim"><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(t)}"><div class="sheet-h"><h2>${esc(t)}</h2><button class="iconbtn" type="button" data-close aria-label="Cerrar">${IC.x}</button></div>${html}</div></div>`;
  $("#sheet .scrim").addEventListener("click", e => { if (e.target.classList.contains("scrim") || e.target.closest("[data-close]")) cerrarHoja() });
  bind && bind($("#sheet .sheet"));
}
function cerrarHoja() { $("#sheet").innerHTML = "" }

/* ---------- pestañas ---------- */
function renderTabs() {
  const T = [["biblia", "Biblia"], ["canciones", "Canciones"], ["anuncios", "Anuncios"], ["fondos", "Fondos"], ["estilo", "Estilo"]];
  const ic = { biblia: IC.biblia, canciones: IC.cancion, anuncios: IC.anuncio, fondos: IC.fondo, estilo: IC.estilo };
  $("#tabs nav").innerHTML = T.map(t => `<button type="button" data-tab="${t[0]}" ${TAB === t[0] ? 'aria-current="page"' : ""}>${ic[t[0]]}${t[1]}</button>`).join("");
}
function renderMain() {
  const m = $("#main"); if (!m) return;
  m.innerHTML = TAB === "biblia" ? vBiblia() : TAB === "canciones" ? vCanciones() : TAB === "anuncios" ? vAnuncios() : TAB === "fondos" ? vFondos() : vEstilo();
  renderTabs(); bindMain(); if (TAB === "biblia") marcarVerso();
}
function bindMain() {
  const ir = $("#irForm"); if (ir) ir.onsubmit = e => {
    e.preventDefault(); const p = parseCita($("#ir").value); const bib = BIB[B.ver];
    if (!p || !bib[p.libro] || !bib[p.libro][p.cap - 1]) return toast("No encontré esa cita. Probá así: Juan 3:16");
    B.libro = p.libro; B.cap = p.cap; B.vista = "vers"; renderMain();
    if (p.vers && bib[p.libro][p.cap - 1][p.vers - 1] != null) { proyectarVerso(B.ver, p.libro, p.cap, p.vers); marcarVerso(true); }
  };
  const bq = $("#bq"); if (bq) { bq.oninput = () => { B.q = bq.value; clearTimeout(bindMain.t); bindMain.t = setTimeout(() => { const pos = bq.selectionStart; renderMain(); const n = $("#bq"); n.focus(); n.setSelectionRange(pos, pos) }, 250) }; }
  const sq = $("#sq"); if (sq) sq.oninput = () => { S.q = sq.value; const pos = sq.selectionStart; renderMain(); const n = $("#sq"); n.focus(); n.setSelectionRange(pos, pos) };
  const rb = $("#rapidoBtn"); if (rb) rb.onclick = () => { const t = $("#rapido").value.trim(); store.set("pr-rapido", t); if (!t) return toast("Escribí el texto primero."); CTX = null; enviar({ modo: "texto", texto: t, titulo: "", ref: "", img: null, negro: false, oculto: false }) };
  const sf = $("#subirFondo"); if (sf) sf.onchange = async e => {
    const f = e.target.files[0]; if (!f) return; if (FONDOS_IMG.length >= 20) return toast("Ya tenés 20 fondos. Borrá alguno primero.");
    toast("Subiendo fondo…");
    try { const img = await comprimir(f, 1920, 750000); const id = "fondo_" + Date.now(); await setDoc(doc(db, "proyector", id), { tipo: "fondo", img, creado: Date.now() }); toast("Fondo listo.") }
    catch (er) { toast("No se pudo subir: " + (er.code || er.message)) }
  };
  // estilo
  const on = (id, ev, fn) => { const el = $("#" + id); if (el) el[ev] = fn; };
  on("e_fuente", "onchange", e => setEstilo({ fuente: e.target.value }));
  on("e_tam", "oninput", e => { $("#v_tam").textContent = e.target.value; setEstilo({ tam: +e.target.value }, true) });
  on("e_margen", "oninput", e => { $("#v_margen").textContent = e.target.value + "%"; setEstilo({ margen: +e.target.value }, true) });
  on("e_negrita", "onchange", e => setEstilo({ negrita: e.target.checked }));
  on("e_mayus", "onchange", e => setEstilo({ mayus: e.target.checked }));
  on("e_color", "oninput", e => setEstilo({ color: e.target.value }, true));
  on("e_sombra", "onchange", e => setEstilo({ sombra: e.target.checked }));
  on("e_sombraColor", "oninput", e => setEstilo({ sombraColor: e.target.value }, true));
  on("e_cita", "onchange", e => setEstilo({ cita: e.target.checked }));
  on("e_trans", "onchange", e => setEstilo({ trans: e.target.value }));
  on("e_mov", "onchange", e => setEstilo({ mov: e.target.checked }));
  on("e_borrar", "onchange", e => setEstilo({ borrarAlFondo: e.target.checked }));
  on("e_prueba", "onclick", () => { escena.key = null; pintar(escena, LIVE, fondoImgActual()); });
  on("e_reset", "onclick", () => { setEstilo(Object.assign({}, ESTILO_BASE, { mov: (LIVE.estilo || {}).mov, borrarAlFondo: (LIVE.estilo || {}).borrarAlFondo })); renderMain(); toast("Estilo restablecido.") });
}

document.addEventListener("click", e => {
  const t = e.target;
  const g = (sel) => t.closest(sel);
  let x;
  if ((x = g("[data-tab]"))) { TAB = x.dataset.tab; store.set("pr-tab", TAB); renderMain(); scrollTo({ top: 0 }); return; }
  // Biblia
  if ((x = g("[data-ver]"))) { B.ver = x.dataset.ver; store.set("pr-ver", B.ver); renderMain(); cargarVersion(B.ver).then(renderMain).catch(er => toast(er.message)); return; }
  if ((x = g("[data-bv]"))) { B.vista = x.dataset.bv; renderMain(); if (B.vista === "buscar") $("#bq")?.focus(); return; }
  if ((x = g("[data-libro]"))) { B.libro = +x.dataset.libro; B.vista = "caps"; renderMain(); scrollTo({ top: 0 }); return; }
  if ((x = g("[data-cap]"))) { B.cap = +x.dataset.cap; B.vista = "vers"; renderMain(); scrollTo({ top: 0 }); return; }
  if ((x = g("[data-capd]"))) { const bib = BIB[B.ver]; let l = B.libro, c = B.cap + +x.dataset.capd; if (c < 1) { if (l === 0) return; l--; c = bib[l].length } else if (c > bib[l].length) { if (l === 65) return; l++; c = 1 } B.libro = l; B.cap = c; renderMain(); scrollTo({ top: 0 }); return; }
  if ((x = g("[data-fav]"))) { toggleFav(B.libro, B.cap, +x.dataset.fav); x.classList.toggle("on"); return; }
  if ((x = g("[data-unfav]"))) { const [l, c, v] = x.dataset.unfav.split(",").map(Number); toggleFav(l, c, v); renderMain(); return; }
  if ((x = g("[data-bf]"))) { B.filtro = x.dataset.bf; renderMain(); return; }
  if ((x = g("[data-go]"))) { const [l, c, v] = x.dataset.go.split(",").map(Number); proyectarVerso(B.ver, l, c, v); $$(".v[data-go]").forEach(el => el.classList.toggle("on", el === x)); return; }
  if ((x = g(".v[data-v]"))) { proyectarVerso(B.ver, B.libro, B.cap, +x.dataset.v); return; }
  // Canciones
  if ((x = g("[data-cancion]"))) { S.id = x.dataset.cancion; S.vista = "ver"; renderMain(); scrollTo({ top: 0 }); return; }
  if ((x = g("[data-sv]"))) { S.vista = x.dataset.sv; renderMain(); return; }
  if ((x = g("[data-est]"))) { proyectarEstrofa(S.id, +x.dataset.est); return; }
  if (g("[data-newc]")) { formCancion(); return; }
  if ((x = g("[data-editc]"))) { formCancion(CANCIONES.find(c => c.id === x.dataset.editc)); return; }
  // Anuncios
  if (g("[data-newa]")) { formAnuncio(); return; }
  if ((x = g("[data-edita]"))) { formAnuncio(ANUNCIOS.find(a => a.id === x.dataset.edita)); return; }
  if ((x = g("[data-anuncio]"))) { const a = ANUNCIOS.find(a => a.id === x.dataset.anuncio); if (a) proyectarAnuncio(a); return; }
  // Fondos
  if ((x = g("[data-delfondo]"))) {
    const id = x.dataset.delfondo;
    abrirHoja("Borrar fondo", `<p>¿Borrar esta imagen de tus fondos?</p><div style="display:flex;gap:8px"><button class="btn danger" type="button" id="df2">Sí, borrar</button><button class="btn ghost" type="button" data-close>Cancelar</button></div>`, s => {
      $("#df2", s).onclick = async () => { try { await deleteDoc(doc(db, "proyector", id)); if (LIVE.fondo && LIVE.fondo.id === id) enviar({ fondo: { id: "noche" } }); cerrarHoja(); toast("Fondo borrado.") } catch (er) { toast("No se pudo borrar: " + (er.code || er.message)) } };
    }); return;
  }
  if ((x = g("[data-fondo]"))) { ponerFondo(x.dataset.fondo, false); return; }
  if ((x = g("[data-fondoimg]"))) { ponerFondo(x.dataset.fondoimg, true); return; }
  if ((x = g("[data-alin]"))) { setEstilo({ alin: x.dataset.alin }); $$("[data-alin]").forEach(b => b.setAttribute("aria-pressed", b === x)); return; }
});
document.addEventListener("keydown", e => {
  if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || "")) return;
  if (e.key === "Escape") return cerrarHoja();
  if ($("#sheet .scrim")) return;
  if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "PageDown") { e.preventDefault(); paso(1) }
  else if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp") { e.preventDefault(); paso(-1) }
  else if (e.key === "b" || e.key === "B") enviar({ negro: !LIVE.negro });
  else if (e.key === "Enter" && document.activeElement?.dataset) { document.activeElement.click(); }
});
let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { if (escena) { escena.key = null; pintar(escena, Object.assign({}, LIVE, { estilo: Object.assign({}, LIVE.estilo, { trans: "ninguna" }) }), fondoImgActual()) } }, 150) });

/* ---------- sesión ---------- */
const esAdmin = u => !!u && !!u.email && u.emailVerified && u.email.toLowerCase() === String(ADMIN_EMAIL).toLowerCase();
getRedirectResult(auth).catch(e => toast(errLogin(e)));
function errLogin(e) { const c = e && e.code || ""; if (c.includes("popup-closed") || c.includes("cancelled")) return "Cancelaste el inicio de sesión."; if (c.includes("network")) return "Sin internet. Revisá tu conexión."; return "No se pudo entrar (" + c + ")."; }
async function entrar() { const p = new GoogleAuthProvider(); p.setCustomParameters({ prompt: "select_account" }); try { await signInWithPopup(auth, p) } catch (e) { const c = e && e.code || ""; if (c.includes("popup-blocked") || c.includes("operation-not-supported")) return signInWithRedirect(auth, p); toast(errLogin(e)) } }
onAuthStateChanged(auth, async u => {
  stopFns.forEach(f => { try { f() } catch { } }); stopFns = []; cerrarHoja();
  if (!u) { $("#tabs").hidden = true; $("#app").innerHTML = `<div class="hero"><h1>Proyector<span>.</span></h1><p class="muted">Biblia, canciones y anuncios en la pantalla de tu iglesia. Vos controlás desde el cel y la tele abre el visor.</p><button class="btn" id="login" type="button" style="background:#fff;color:#1f1f1f">${IC.google} Entrar con Google</button></div>`; $("#login").onclick = entrar; return; }
  if (!esAdmin(u)) { $("#tabs").hidden = true; $("#app").innerHTML = `<div class="hero"><h1>Proyector<span>.</span></h1><p>Esta app es privada. Entraste con ${esc(u.email || "otra cuenta")}.</p><button class="btn" id="lo" type="button">Entrar con otra cuenta</button></div>`; $("#lo").onclick = () => signOut(auth); return; }
  try { const d = await getDoc(doc(db, "proyector", "en_vivo")); if (d.exists()) { const x = d.data(); LIVE = Object.assign({}, LIVE, x, { estilo: Object.assign({}, ESTILO_BASE, x.estilo || {}) }); } } catch { }
  montarShell(); renderMain();
  cargarVersion(B.ver).then(() => { if (TAB === "biblia") renderMain() }).catch(er => toast(er.message));
  stopFns.push(onSnapshot(collection(db, "proyector_canciones"), s => { CANCIONES = s.docs.map(d => ({ id: d.id, ...d.data() })); if (TAB === "canciones") renderMain() }, er => toast("Canciones: " + (er.code || er.message))));
  stopFns.push(onSnapshot(collection(db, "proyector_anuncios"), s => { ANUNCIOS = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.creado || 0) - (a.creado || 0)); if (TAB === "anuncios") renderMain() }, er => toast("Anuncios: " + (er.code || er.message))));
  stopFns.push(onSnapshot(query(collection(db, "proyector"), where("tipo", "==", "fondo")), s => { FONDOS_IMG = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.creado || 0) - (b.creado || 0)); if (TAB === "fondos") renderMain(); pintar(escena, LIVE, fondoImgActual()) }, er => toast("Fondos: " + (er.code || er.message))));
  const salir = document.createElement("button"); salir.className = "iconbtn"; salir.type = "button"; salir.setAttribute("aria-label", "Cerrar sesión"); salir.innerHTML = IC.out; salir.onclick = () => signOut(auth);
  $("#visorBtn").after(salir);
});
