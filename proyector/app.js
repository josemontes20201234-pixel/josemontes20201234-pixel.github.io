// Proyector: control desde el cel. Biblia, canciones, diapositivas, anuncios, fondos y estilo.
import { firebaseConfig, ADMIN_EMAIL } from "../config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, addDoc, updateDoc, deleteDoc, collection, onSnapshot, query, where, Bytes, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { LIBROS, VERSIONES, FUENTES, FONDOS, TRANSICIONES, ESTILO_BASE, norm, esc, parseCita, nombreLibro, crearEscena, pintar, ESCENA_CSS } from "./shared.js";
import { configurarAlmacen, registrarArchivo, recordarEscena, cargarEscena, pintarPres, reencajarPres, miniatura, archivo, archivosDe, archivosEscena, borrarArchivoLocal, mediosDe, cargarFuentes } from "./diapos.js";

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
  culto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 5.5l1 1 1.5-2M4 11.5l1 1 1.5-2"/><circle cx="5" cy="18" r="1.2"/></svg>',
  arriba: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15l6-6 6 6"/></svg>',
  abajo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  reloj: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/></svg>',
  lupa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21M8 10.5h5M10.5 8v5"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  diapos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M10 8.2v4.6l4-2.3z" fill="currentColor"/><path d="M8 21h8"/></svg>',
  subir: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>',
  mas: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
  vPlay: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l10.5-6.5z"/></svg>',
  vPausa: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="5" width="4" height="14" rx="1"/><rect x="13.5" y="5" width="4" height="14" rx="1"/></svg>',
  vInicio: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="2.6" height="14" rx="1"/><path d="M19 5.5v13L9 12z"/></svg>',
  vSonido: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10v4h3.5L13 18V6L7.5 10z" fill="currentColor"/><path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11"/></svg>',
  vMudo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10v4h3.5L13 18V6L7.5 10z" fill="currentColor"/><path d="M17 9.5l5 5M22 9.5l-5 5"/></svg>',
  google: '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8.1z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.8 0-5.2-1.9-6.1-4.5H2.2v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.9 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.2a11 11 0 0 0 0 9.9z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.1 1.6l3.1-3.1A11 11 0 0 0 2.2 7.1l3.7 2.8C6.8 7.3 9.2 5.4 12 5.4z"/></svg>'
};

/* ---------- himno de dominio público incluido (traducción de Juan B. Cabrera) ---------- */
const HIMNOS = [{ id: "pd-santo", titulo: "¡Santo! ¡Santo! ¡Santo!", autor: "R. Heber · trad. J. B. Cabrera (dominio público)", fijo: true,
  letra: "¡Santo! ¡Santo! ¡Santo! Señor omnipotente,\nsiempre el labio mío loores te dará;\n¡Santo! ¡Santo! ¡Santo! te adoro reverente,\nDios en tres personas, bendita Trinidad.\n\n¡Santo! ¡Santo! ¡Santo! la inmensa muchedumbre\nde ángeles que cumplen tu santa voluntad,\nante ti se postra bañada de tu lumbre,\nante ti que has sido, que eres y serás.\n\n¡Santo! ¡Santo! ¡Santo! por más que estés velado\ne imposible sea tu gloria contemplar,\nsanto tú eres solo, y nada hay a tu lado\nen poder perfecto, pureza y caridad.\n\n¡Santo! ¡Santo! ¡Santo! la gloria de tu nombre\nvemos en tus obras en cielo, tierra y mar;\n¡Santo! ¡Santo! ¡Santo! te adora todo hombre,\nDios en tres personas, bendita Trinidad." }];

/* ---------- estado ---------- */
let LIVE = { ts: 0, modo: "fondo", texto: "", ref: "", titulo: "", img: null, fondo: { id: "noche" }, estilo: { ...ESTILO_BASE }, negro: false, oculto: false };
let CTX = null;                          // de dónde vino lo que está en vivo, para Anterior / Siguiente
let CANCIONES = [], ANUNCIOS = [], FONDOS_IMG = [], PASAJES = [];
let CULTO = { items: [] };
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
  pintarVistas();
  actualizarLive();
  try { bc && bc.postMessage({ tipo: "estado", estado: LIVE, fondoImg: fondoImgActual() }); } catch { }
  clearTimeout(tGuardar);
  const guardar = () => setDoc(doc(db, "proyector", "en_vivo"), LIVE).catch(e => toast("No se pudo enviar a la tele: " + (e.code || e.message)));
  if (lento) tGuardar = setTimeout(guardar, 350); else guardar();
}
function pintarVistas() {
  const img = fondoImgActual();
  if (escena) { pintar(escena, LIVE, img); pintarPres(escena, LIVE, { mini: true }); }
  if (TELE) { pintar(TELE, LIVE, img); pintarPres(TELE, LIVE); }
  if (PZ) { pintar(PZ.esc, LIVE, img); pintarPres(PZ.esc, LIVE, { mini: true }); }
}
function proyectarTexto(texto, ref, titulo, ctx) {
  CTX = ctx || null;
  const c = { modo: "texto", texto, ref: ref || "", titulo: titulo || "", img: null, negro: false, oculto: false };
  enviar(c);
}

/* ---------- Biblia ---------- */
/* YouVersion Platform: la clave y las versiones escogidas se guardan en tu Firebase privado */
const USFM = ["GEN","EXO","LEV","NUM","DEU","JOS","JDG","RUT","1SA","2SA","1KI","2KI","1CH","2CH","EZR","NEH","EST","JOB","PSA","PRO","ECC","SNG","ISA","JER","LAM","EZK","DAN","HOS","JOL","AMO","OBA","JON","MIC","NAM","HAB","ZEP","HAG","ZEC","MAL","MAT","MRK","LUK","JHN","ACT","ROM","1CO","2CO","GAL","EPH","PHP","COL","1TH","2TH","1TI","2TI","TIT","PHM","HEB","JAS","1PE","2PE","1JN","2JN","3JN","JUD","REV"];
let YV = { key: "", versiones: [] };
const esYV = id => String(id).startsWith("yv:");
const todasVersiones = () => { const n = {}; YV.versiones.forEach(v => n[v.corto] = (n[v.corto] || 0) + 1); return [...VERSIONES, ...YV.versiones.map(v => ({ id: "yv:" + v.id, nombre: v.nombre, corto: n[v.corto] > 1 ? `${v.corto} (${v.id})` : v.corto, en: false, yv: v.id }))]; };
async function yvGet(path) {
  if (!YV.key) throw new Error("Falta la App Key de YouVersion.");
  const r = await fetch("https://api.youversion.com" + path, { headers: { "X-YVP-App-Key": YV.key, "Accept": "application/json" } });
  const txt = await r.text(); let j = null; try { j = JSON.parse(txt) } catch { }
  if (!r.ok) { const e = new Error(`YouVersion respondió ${r.status}: ${(j && (j.message || j.error || JSON.stringify(j.detail || j))) || txt.slice(0, 160)}`); e.status = r.status; throw e; }
  return j ?? txt;
}
const QUITAR = /(^|\s)(note|notes|label|heading|headings|s|s1|s2|s3|ms|ms1|mr|r|d|sp|fr|ft|fq|fqa|fk|xo|xt|x|f|cl|qa)(\s|$)/;
function versosDeHtml(html) {
  const docu = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  docu.querySelectorAll("*").forEach(el => { const c = (el.getAttribute("class") || "").toLowerCase(); if (QUITAR.test(c) || el.tagName === "SUP" && /note|fn|f\b/.test(c)) el.remove(); });
  const porVerso = {};
  // Formato de YouVersion Platform: <span class="yv-v" v="5"></span><span class="yv-vlbl">5</span>texto…
  const raiz = docu.body.firstElementChild;
  if (raiz && raiz.querySelector(".yv-v[v]")) {
    raiz.querySelectorAll(".yv-h, .yv-vlbl, .va, .yv-n, [data-verse-footnote], .yv-chapter").forEach(el => el.remove());
    let cur = 0;
    const tw = docu.createTreeWalker(raiz, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    while (tw.nextNode()) {
      const n = tw.currentNode;
      if (n.nodeType === 1) {
        if (n.classList.contains("yv-v") && n.hasAttribute("v")) { const v = parseInt(n.getAttribute("v"), 10); if (v > 0) cur = v; }
        else if (cur && /^(P|DIV|BR|LI)$/.test(n.tagName)) porVerso[cur] = (porVerso[cur] || "") + " ";
      } else if (cur) porVerso[cur] = (porVerso[cur] || "") + n.nodeValue;
    }
    const ks = Object.keys(porVerso).map(Number);
    if (ks.length) { const max = Math.max(...ks); return Array.from({ length: max }, (_, i) => (porVerso[i + 1] || "").replace(/\s+/g, " ").replace(/\s+([,.;:!?»”])/g, "$1").trim()); }
  }
  docu.querySelectorAll("[data-usfm]").forEach(el => {
    const m = String(el.getAttribute("data-usfm")).split("+")[0].match(/\.(\d+)\.(\d+)$/); if (!m) return;
    if (el.querySelector("[data-usfm]")) return;
    const v = +m[2]; porVerso[v] = ((porVerso[v] || "") + " " + el.textContent).trim();
  });
  const ks = Object.keys(porVerso).map(Number);
  if (ks.length) { const max = Math.max(...ks); return Array.from({ length: max }, (_, i) => (porVerso[i + 1] || "").replace(/\s+/g, " ").trim()); }
  return null;
}
function versosDeTexto(t) {
  t = String(t || "").replace(/\r/g, "");
  const marcas = []; let pos = 0, n = 1;
  while (n < 200) { const re = new RegExp(`(^|[\\s"“«(\\[])${n}(?=[\\s.)\\]]*[\\p{L}"“«¿¡(])`, "u"); const m = re.exec(t.slice(pos)); if (!m) break; const at = pos + m.index + m[1].length; marcas.push({ at, fin: at + String(n).length }); pos = at + String(n).length; n++; }
  if (marcas.length < 2) return null;
  return marcas.map((m, i) => t.slice(m.fin, i + 1 < marcas.length ? marcas[i + 1].at : undefined).replace(/^[\s.)\]]+/, "").replace(/\s+/g, " ").trim());
}
async function cargarCapYV(ver, l, c) {
  const id = ver.slice(3); const ref = `${USFM[l]}.${c}`;
  let d = await yvGet(`/v1/bibles/${id}/passages/${ref}?format=html&include_headings=false&include_notes=false`);
  const d1 = d;
  let vs = d && d.content ? versosDeHtml(d.content) : null;
  if (!vs) { d = await yvGet(`/v1/bibles/${id}/passages/${ref}?format=text`); vs = versosDeTexto(d && (d.content ?? d)); }
  if (!vs) { const crudo = String((d1 && (d1.content ?? JSON.stringify(d1))) || "").replace(/\s+/g, " ").slice(0, 260); throw new Error("[v8] No pude separar los versículos. Mandale esta captura a Claude: " + crudo); }
  return vs.map(v => v.normalize("NFC"));
}
async function asegurarCap(ver, l, c) {
  if (!esYV(ver)) { await cargarVersion(ver); return BIB[ver][l]?.[c - 1]; }
  const bib = await cargarVersion(ver);
  if (!bib[l] || c < 1 || c > bib[l].length) return null;
  if (!bib[l][c - 1]) bib[l][c - 1] = await cargarCapYV(ver, l, c);
  return bib[l][c - 1];
}
async function cargarVersion(id) {
  if (BIB[id]) return BIB[id];
  if (esYV(id)) { const base = await cargarVersion("rv1909"); BIB[id] = base.map(lib => lib.map(() => null)); return BIB[id]; }
  const r = await fetch(`biblia/${id}.json`); if (!r.ok) throw new Error("No se pudo cargar la Biblia");
  const d = await r.json();
  BIB[id] = d.map(l => l.map(c => c.map(v => v.normalize("NFC"))));
  return BIB[id];
}
const verInfo = id => todasVersiones().find(v => v.id === id) || VERSIONES[0];
function citaTexto(ver, l, c, v) { const vi = verInfo(ver); return `${nombreLibro(l, vi.en)} ${c}:${v} · ${vi.corto}`; }
async function proyectarVerso(ver, l, c, v) {
  let t = BIB[ver]?.[l]?.[c - 1]?.[v - 1];
  if (t == null && esYV(ver)) { try { const cap = await asegurarCap(ver, l, c); t = cap?.[v - 1]; } catch (er) { return toast(er.message); } }
  if (t == null) return;
  proyectarTexto(t, citaTexto(ver, l, c, v), "", { tipo: "biblia", ver, l, c, v });
  if (TAB === "biblia" && B.vista === "vers" && B.libro === l && B.cap === c) marcarVerso();
}
async function pasoBiblia(d) {
  const { ver } = CTX; let { l, c, v } = CTX; const bib = BIB[ver];
  v += d;
  try {
    const actual = await asegurarCap(ver, l, c);
    if (v < 1) { c--; if (c < 1) { l--; if (l < 0) return; c = bib[l].length; } v = (await asegurarCap(ver, l, c)).length; }
    else if (v > actual.length) { v = 1; c++; if (c > bib[l].length) { l++; if (l >= bib.length) return; c = 1; } await asegurarCap(ver, l, c); }
  } catch (er) { return toast(er.message); }
  if (TAB === "biblia" && B.vista === "vers" && (B.libro !== l || B.cap !== c)) { B.libro = l; B.cap = c; proyectarVerso(ver, l, c, v); renderMain(); marcarVerso(true); return; }
  await proyectarVerso(ver, l, c, v); marcarVerso(true);
}
function marcarVerso(scroll) {
  $$(".v[data-v]").forEach(el => el.classList.toggle("on", !!CTX && CTX.tipo === "biblia" && CTX.ver === B.ver && CTX.l === B.libro && CTX.c === B.cap && +el.dataset.v === CTX.v));
  const on = $(".v.on"); if (scroll && on) on.scrollIntoView({ block: "center", behavior: "smooth" });
}
function buscarBiblia(ver, q, filtro) {
  const bib = BIB[ver]; if (!bib || esYV(ver)) return [];
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
  const vers = `<div class="chips" role="group" aria-label="Versión">${todasVersiones().map(v => `<button type="button" data-ver="${v.id}" aria-pressed="${B.ver === v.id}">${esc(v.corto)}</button>`).join("")}<button type="button" data-yvcfg aria-pressed="false">+ YouVersion</button></div>`;
  const modos = `<div class="chips">${[["libros", "Libros"], ["pasajes", "Pasajes del culto" + (PASAJES.length ? " · " + PASAJES.length : "")], ["buscar", "Buscar palabras"], ["favs", "Favoritos" + (FAVS.length ? " · " + FAVS.length : "")]].map(m => `<button type="button" data-bv="${m[0]}" aria-pressed="${B.vista === m[0] || (m[0] === "libros" && (B.vista === "caps" || B.vista === "vers"))}">${m[1]}</button>`).join("")}</div>`;
  if (B.vista === "pasajes") return vPasajes(modos);
  if (!bib) return `<div class="sec">${vers}<div class="empty">Cargando ${esc(verInfo(B.ver).nombre)}…</div></div>`;
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
    if (esYV(B.ver) && !bib[B.libro][B.cap - 1]) {
      asegurarCap(B.ver, B.libro, B.cap).then(() => { if (TAB === "biblia" && B.vista === "vers") renderMain() }).catch(er => { toast(er.message); const el = $("#yvload"); if (el) el.textContent = er.message; });
      return `<div class="sec">${vers}${ir}${modos}<div class="crumbs"><button type="button" data-bv="libros">Libros</button><span>›</span><button type="button" data-libro="${B.libro}">${esc(LIBROS[B.libro][0])}</button><span>›</span>Capítulo ${B.cap}</div><div class="empty" id="yvload">Cargando ${esc(verInfo(B.ver).corto)} desde YouVersion…</div></div>`;
    }
    const cap = bib[B.libro][B.cap - 1] || [];
    body = `<div class="crumbs"><button type="button" data-bv="libros">Libros</button><span>›</span><button type="button" data-libro="${B.libro}">${esc(LIBROS[B.libro][0])}</button><span>›</span>Capítulo ${B.cap}</div>
      <div class="vlist">${cap.map((t, i) => t ? `<div class="v" data-v="${i + 1}" role="button" tabindex="0"><span class="n">${i + 1}</span><span class="x">${esc(t)}</span><span class="acc"><button type="button" class="star ${esFav(B.libro, B.cap, i + 1) ? "on" : ""}" data-fav="${i + 1}" aria-label="Favorito">★</button><button type="button" class="studybtn" data-study="${B.libro},${B.cap},${i + 1}" aria-label="Estudiar en griego o hebreo">${IC.lupa}</button></span></div>` : "").join("")}</div>
      <div class="row" style="display:flex;gap:8px;justify-content:space-between"><button type="button" class="btn ghost sm" data-capd="-1" ${B.libro === 0 && B.cap === 1 ? "disabled" : ""}>← Cap. anterior</button><button type="button" class="btn ghost sm" data-capd="1">Cap. siguiente →</button></div>`;
  } else if (B.vista === "buscar") {
    if (esYV(B.ver)) return `<div class="sec">${vers}${ir}${modos}<div class="empty">La búsqueda por palabras funciona con las versiones RV1909, RV1865 y KJV. Para ${esc(verInfo(B.ver).corto)}, usá "Ir a…" o Libros.</div></div>`;
    const res = B.q.trim().length > 1 ? buscarBiblia(B.ver, B.q, B.filtro) : null;
    body = `<input class="input" id="bq" type="search" placeholder="Palabras a buscar: caridad sufrida" value="${esc(B.q)}" aria-label="Buscar en la Biblia">
      <div class="chips">${[["todo", "Toda la Biblia"], ["at", "A.T."], ["nt", "N.T."]].map(f => `<button type="button" data-bf="${f[0]}" aria-pressed="${B.filtro === f[0]}">${f[1]}</button>`).join("")}</div>
      ${res === null ? '<p class="muted" style="font-size:14px">Escribí dos letras o más.</p>' : res.length ? `<span class="lbl">${res.length >= 150 ? "Primeros 150 resultados" : res.length === 1 ? "1 resultado" : res.length + " resultados"}</span><div class="vlist">${res.map(r => `<div class="v" role="button" tabindex="0" data-go="${r.l},${r.c},${r.v}"><span class="n">${esc(LIBROS[r.l][1])}<br>${r.c}:${r.v}</span><span class="x">${resaltar(r.t, B.q)}</span><span></span></div>`).join("")}</div>` : '<div class="empty">No encontré esas palabras.</div>'}`;
  } else if (B.vista === "favs") {
    body = FAVS.length ? `<div class="vlist">${FAVS.map(f => { const t = bib[f.l]?.[f.c - 1]?.[f.v - 1] || (esYV(B.ver) ? "Tocá para cargar el texto" : ""); return `<div class="v" role="button" tabindex="0" data-go="${f.l},${f.c},${f.v}"><span class="n">${esc(LIBROS[f.l][1])}<br>${f.c}:${f.v}</span><span class="x">${esc(t)}</span><button type="button" class="star on" data-unfav="${f.l},${f.c},${f.v}" aria-label="Quitar de favoritos">★</button></div>` }).join("")}</div>`
      : '<div class="empty">Marcá versículos con la estrella ★ para tenerlos a mano en el culto.</div>';
  }
  return `<div class="sec">${vers}${ir}${modos}${body}</div>`;
}


/* ---------- Pasajes del culto (versiones con derechos: el usuario pega su texto) ---------- */
const VERS_PASAJE = ["RVR1960", "NVI", "NTV", "LBLA", "NBLA", "DHH", "TLA", "RVC", "RV1995"];
function limpiarPegado(txt, cita) {
  let t = String(txt || "").replace(/\r/g, "").replace(/https?:\/\/\S+/g, "").replace(/[¹²³⁰-⁹]+/g, m => " " + m.replace(/[¹]/g, "1").replace(/[²]/g, "2").replace(/[³]/g, "3").replace(/[⁰-⁹]/g, c => String(c.charCodeAt(0) - 0x2070)) + " ");
  const lineas = t.split("\n");
  // quita una primera o última línea que sea sólo la cita ("Juan 3:16-18 RVR1960")
  const esCita = l => { const x = l.trim(); return x && x.length < 50 && /\d+\s*[:.]\s*\d+/.test(x) && parseCita(x.replace(/\b(RVR?\d{2,4}|NVI|NTV|LBLA|NBLA|DHH|TLA|RVC)\b/gi, "").replace(/-\s*\d+/, "").trim()); };
  while (lineas.length && !lineas[0].trim()) lineas.shift();
  if (lineas.length > 1 && esCita(lineas[0])) lineas.shift();
  while (lineas.length && !lineas[lineas.length - 1].trim()) lineas.pop();
  if (lineas.length > 1 && esCita(lineas[lineas.length - 1])) lineas.pop();
  return lineas.join("\n").trim();
}
function dividirPasaje(texto, cita) {
  const p = parseCita(String(cita || "").replace(/-\s*\d+.*$/, ""));
  const t = texto;
  if (p && p.vers) {
    const marcas = []; let pos = 0, n = p.vers;
    while (true) {
      const re = new RegExp(`(^|[\\s"“«(\\[])${n}(?=[\\s.)\\]]*[\\p{L}"“«¿¡(])`, "u");
      const m = re.exec(t.slice(pos)); if (!m) break;
      const at = pos + m.index + m[1].length;
      marcas.push({ n, at, fin: at + String(n).length }); pos = at + String(n).length; n++;
      if (n - p.vers > 200) break;
    }
    if (marcas.length >= 2 || (marcas.length === 1 && marcas[0].at < 3)) {
      return marcas.map((m, i) => ({ v: m.n, texto: t.slice(m.fin, i + 1 < marcas.length ? marcas[i + 1].at : undefined).replace(/^[\s.)\]]+/, "").replace(/\s+/g, " ").trim() })).filter(x => x.texto);
    }
  }
  const bloques = t.split(/\n\s*\n/).map(x => x.replace(/\s*\n\s*/g, " ").trim()).filter(Boolean);
  return bloques.map(b => ({ v: null, texto: b }));
}
function laminasDe(ps) { return dividirPasaje(ps.texto, ps.cita); }
function refLamina(ps, lam) {
  const p = parseCita(String(ps.cita || "").replace(/-\s*\d+.*$/, ""));
  if (p && lam.v) return `${LIBROS[p.libro][0]} ${p.cap}:${lam.v} · ${ps.version}`;
  return `${ps.cita} · ${ps.version}`;
}
function proyectarPasaje(id, i) {
  const ps = PASAJES.find(x => x.id === id); if (!ps) return; const L = laminasDe(ps); if (!L[i]) return;
  proyectarTexto(L[i].texto, refLamina(ps, L[i]), "", { tipo: "pasaje", id, i, n: L.length });
  $$("[data-plam]").forEach(el => el.classList.toggle("on", el.dataset.pid === id && +el.dataset.plam === i));
  const on = $("[data-plam].on"); if (on) on.scrollIntoView({ block: "nearest", behavior: "smooth" });
}
function vPasajes(modos) {
  const lista = PASAJES.length ? PASAJES.map((ps, k) => {
    const L = laminasDe(ps); const abierto = B.pasaje === ps.id;
    return `<div class="field" style="gap:8px"><div style="display:flex;gap:8px;align-items:center"><button type="button" data-popen="${ps.id}" style="flex:1;min-width:0;text-align:left;border:0;background:none;padding:0"><b style="display:block;font-size:16px">${k + 1}. ${esc(ps.cita)} <span class="muted" style="font-weight:600;font-size:13px">${esc(ps.version)}</span></b><small class="muted">${L.length} ${L.length === 1 ? "lámina" : "láminas"} · ${abierto ? "tocá una para proyectar" : "tocá para abrir"}</small></button>
      <button class="btn sm" type="button" data-pplay="${ps.id}">Proyectar</button></div>
      ${abierto ? `<div class="vlist">${L.map((l, i) => `<div class="v ${CTX && CTX.tipo === "pasaje" && CTX.id === ps.id && CTX.i === i ? "on" : ""}" role="button" tabindex="0" data-pid="${ps.id}" data-plam="${i}"><span class="n">${l.v ?? i + 1}</span><span class="x">${esc(l.texto)}</span><span></span></div>`).join("")}</div>
        <div style="display:flex;gap:8px;justify-content:space-between"><button class="btn ghost sm" type="button" data-pedit="${ps.id}">Editar</button></div>` : ""}</div>`;
  }).join("") : `<div class="empty">Pegá aquí los versículos de la RV1960 (u otra versión) que vas a leer en el culto.<button class="btn sm" type="button" data-pnew>+ Agregar pasaje</button></div>`;
  return `<div class="sec">${modos}
    <div class="head"><h2>Pasajes del culto</h2><button class="btn sm" type="button" data-pnew>+ Pasaje</button></div>
    <p class="muted" style="font-size:13.5px">En tu app de Biblia, seleccioná los versículos, tocá <b>Copiar</b> y pegalos aquí. La app los separa uno por uno y les pone la versión.</p>
    <div class="list">${lista}</div>
    ${PASAJES.length ? '<button class="btn danger sm" type="button" id="pClear" style="justify-self:start">Borrar todos al terminar el culto</button><div id="pClearBox"></div>' : ""}
    </div>`;
}
function formPasaje(ps) {
  const n = !ps; ps = ps || { cita: "", version: store.get("pr-pver", "RVR1960"), texto: "" };
  abrirHoja(n ? "Nuevo pasaje" : "Editar pasaje", `<form class="form" id="fp">
    <div class="two"><label>Cita<input id="p_c" required maxlength="40" placeholder="Juan 3:16-18" value="${esc(ps.cita)}"></label>
    <label>Versión<input id="p_v" list="dl_pv" maxlength="12" value="${esc(ps.version)}"></label></div>
    <datalist id="dl_pv">${VERS_PASAJE.map(v => `<option value="${v}">`).join("")}</datalist>
    <label>Texto copiado de tu Biblia<textarea id="p_t" placeholder="16 Porque de tal manera amó Dios al mundo…&#10;17 Porque no envió Dios…">${esc(ps.texto)}</textarea></label>
    <p class="muted" id="p_info" style="font-size:13px"></p>
    <button class="btn wide" type="submit">${n ? "Guardar pasaje" : "Guardar cambios"}</button>
    ${n ? "" : '<button class="btn danger wide" type="button" id="p_del">Borrar pasaje</button>'}</form>`, s => {
    const info = () => {
      const c = $("#p_c", s).value.trim(); const t = limpiarPegado($("#p_t", s).value, c);
      const p = parseCita(c.replace(/-\s*\d+.*$/, ""));
      const L = t ? dividirPasaje(t, c) : [];
      $("#p_info", s).textContent = !c ? "Escribí la cita, por ejemplo Juan 3:16-18." : !p ? "No reconozco esa cita. Probá así: Juan 3:16-18" : !t ? "Pegá el texto." : `Se va a proyectar en ${L.length} ${L.length === 1 ? "lámina" : "láminas"}${L[0] && L[0].v ? ` (versículos ${L[0].v} al ${L[L.length - 1].v})` : ""}.`;
    };
    // si pegan "Juan 3:16-18 RVR1960" arriba del texto, llena la cita sola
    $("#p_t", s).addEventListener("input", () => {
      const raw = $("#p_t", s).value.replace(/https?:\/\/\S+/g, ""); const pri = raw.split("\n").map(x => x.trim()).filter(Boolean);
      for (const linea of pri) {
        if (!linea || linea.length > 50) continue;
        const mv = linea.match(/\b(RVR?\d{2,4}|NVI|NTV|LBLA|NBLA|DHH|TLA|RVC)\b/i);
        const sin = linea.replace(/\b(RVR?\d{2,4}|NVI|NTV|LBLA|NBLA|DHH|TLA|RVC)\b/gi, "").trim();
        if (/\d+\s*[:.]\s*\d+/.test(sin) && parseCita(sin.replace(/-\s*\d+/, "").trim())) {
          if (!$("#p_c", s).value.trim()) $("#p_c", s).value = sin;
          if (mv) $("#p_v", s).value = mv[1].toUpperCase().replace(/^RV1960$/, "RVR1960");
          break;
        }
      }
      info();
    });
    $("#p_c", s).oninput = info; info();
    $("#fp", s).onsubmit = async e => {
      e.preventDefault();
      const cita = $("#p_c", s).value.trim(), version = ($("#p_v", s).value.trim() || "RVR1960").toUpperCase();
      const texto = limpiarPegado($("#p_t", s).value, cita);
      if (!cita || !parseCita(cita.replace(/-\s*\d+.*$/, ""))) return toast("Revisá la cita. Ejemplo: Juan 3:16-18");
      if (!texto) return toast("Pegá el texto del pasaje.");
      store.set("pr-pver", version);
      try {
        if (n) { const r = await addDoc(collection(db, "proyector_pasajes"), { cita, version, texto, creado: Date.now() }); B.pasaje = r.id; }
        else { await updateDoc(doc(db, "proyector_pasajes", ps.id), { cita, version, texto }); B.pasaje = ps.id; }
        cerrarHoja(); toast("Pasaje guardado."); renderMain();
      } catch (er) { toast("No se pudo guardar: " + (er.code || er.message)) }
    };
    const d = $("#p_del", s); if (d) d.onclick = async () => { try { await deleteDoc(doc(db, "proyector_pasajes", ps.id)); cerrarHoja(); toast("Pasaje borrado.") } catch (er) { toast("No se pudo borrar: " + (er.code || er.message)) } };
  });
}



/* ---------- Orden del culto ---------- */
function iniciarCuenta(min, titulo, fin) {
  enviar({ modo: "cuenta", fin: Date.now() + Math.round(min * 60000), titulo: titulo || "", texto: fin || "", ref: "", img: null, negro: false, oculto: false });
}
function guardarCulto() { return setDoc(doc(db, "proyector_cfg", "culto"), { items: CULTO.items, cambiado: Date.now() }).catch(er => toast("No se pudo guardar el culto: " + (er.code || er.message))); }
const corta = (t, n = 60) => { t = String(t || "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1) + "…" : t; };
function slidesCulto() {
  const out = [];
  CULTO.items.forEach((it, k) => {
    if (it.t === "biblia") { for (let v = it.v1; v <= (it.v2 || it.v1); v++) out.push({ k, t: "biblia", ver: it.ver, l: it.l, c: it.c, v, label: `${LIBROS[it.l][1]} ${it.c}:${v}` }); }
    else if (it.t === "cancion") { const c = todasCanciones().find(x => x.id === it.id); if (!c) { out.push({ k, t: "falta", label: "Canción borrada" }); return; } const e = estrofas(c); e.forEach((x, i) => out.push({ k, t: "texto", texto: x, ref: `${c.titulo}  ·  ${i + 1}/${e.length}`, label: corta(x.split("\n")[0], 50) })); }
    else if (it.t === "pasaje") { const ps = PASAJES.find(x => x.id === it.id); if (!ps) { out.push({ k, t: "falta", label: "Pasaje borrado" }); return; } laminasDe(ps).forEach(lam => out.push({ k, t: "texto", texto: lam.texto, ref: refLamina(ps, lam), label: `${lam.v ?? ""} ${corta(lam.texto, 46)}`.trim() })); }
    else if (it.t === "anuncio") { const a = ANUNCIOS.find(x => x.id === it.id); out.push(a ? { k, t: "anuncio", a, label: a.titulo || corta(a.texto, 40) || "Imagen" } : { k, t: "falta", label: "Anuncio borrado" }); }
    else if (it.t === "texto") { (it.partes || []).forEach(pz => out.push({ k, t: "texto", texto: pz, titulo: it.titulo || "", ref: "", label: corta(pz, 50) })); }
    else if (it.t === "cuenta") out.push({ k, t: "cuenta", min: it.min, titulo: it.titulo, fin: it.fin, label: `${it.min} min · ${it.titulo || "Cuenta regresiva"}` });
    else if (it.t === "pres") { const m = DIAPOS.find(x => x.id === it.id); out.push(m ? { k, t: "pres", id: it.id, label: `▶ ${m.n} ${m.n === 1 ? "diapositiva" : "diapositivas"} · se abre el presentador` } : { k, t: "falta", label: "Diapositivas borradas" }); }
  });
  return out;
}
function nombreItem(it) {
  if (it.t === "biblia") return { tipo: "Lectura", nom: `${LIBROS[it.l][0]} ${it.c}:${it.v1}${it.v2 && it.v2 !== it.v1 ? "-" + it.v2 : ""} · ${verInfo(it.ver).corto}` };
  if (it.t === "cancion") { const c = todasCanciones().find(x => x.id === it.id); return { tipo: "Canto", nom: c ? c.titulo : "Canción borrada" }; }
  if (it.t === "pasaje") { const p = PASAJES.find(x => x.id === it.id); return { tipo: "Pasaje", nom: p ? `${p.cita} · ${p.version}` : "Pasaje borrado" }; }
  if (it.t === "anuncio") { const a = ANUNCIOS.find(x => x.id === it.id); return { tipo: "Anuncio", nom: a ? (a.titulo || corta(a.texto, 40) || "Imagen") : "Anuncio borrado" }; }
  if (it.t === "texto") return { tipo: "Texto", nom: it.titulo || corta((it.partes || [])[0], 40) };
  if (it.t === "cuenta") return { tipo: "Cuenta regresiva", nom: `${it.min} minutos` };
  if (it.t === "pres") { const m = DIAPOS.find(x => x.id === it.id); return { tipo: "Diapositivas", nom: m ? m.nombre : "Diapositivas borradas" }; }
  return { tipo: "", nom: "" };
}
async function proyectarSlide(i, atras) {
  const S = slidesCulto(); const sl = S[i]; if (!sl) return;
  if (sl.t === "pres") { await presentar(sl.id, { culto: i, alFinal: !!atras }); $$("[data-slide]").forEach(el => el.classList.toggle("on", +el.dataset.slide === i)); return; }
  const ctx = { tipo: "culto", i, n: S.length };
  if (sl.t === "biblia") {
    let cap; try { cap = await asegurarCap(sl.ver, sl.l, sl.c); } catch (er) { return toast(er.message); }
    const t = cap?.[sl.v - 1]; if (t == null) return toast("No encontré " + sl.label);
    proyectarTexto(t, citaTexto(sl.ver, sl.l, sl.c, sl.v), "", ctx);
  } else if (sl.t === "texto") proyectarTexto(sl.texto, sl.ref || "", sl.titulo || "", ctx);
  else if (sl.t === "anuncio") { proyectarAnuncio(sl.a); CTX = ctx; actualizarLive(); }
  else if (sl.t === "cuenta") { CTX = ctx; iniciarCuenta(sl.min, sl.titulo, sl.fin); }
  else { CTX = ctx; toast(sl.label + ": ya no existe. Quitalo del culto."); actualizarLive(); }
  $$("[data-slide]").forEach(el => el.classList.toggle("on", +el.dataset.slide === i));
  const on = $("[data-slide].on"); if (on) on.scrollIntoView({ block: "nearest", behavior: "smooth" });
}
function vCulto() {
  const S = slidesCulto(); let idx = 0;
  const actual = CTX && CTX.tipo === "culto" ? CTX.i : CTX && CTX.tipo === "pres" && CTX.culto != null ? CTX.culto : -1;
  const items = CULTO.items.map((it, k) => {
    const n = nombreItem(it); const mis = S.filter(x => x.k === k);
    const html = `<div class="field" style="gap:8px"><div style="display:flex;gap:6px;align-items:center"><span style="flex:1;min-width:0"><span class="lbl" style="color:var(--accent)">${k + 1} · ${esc(n.tipo)}</span><b style="display:block;font-size:15.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(n.nom)}</b></span>
      <button class="iconbtn" style="width:32px;height:32px" type="button" data-cmov="${k},-1" aria-label="Subir" ${k === 0 ? "disabled" : ""}>${IC.arriba}</button><button class="iconbtn" style="width:32px;height:32px" type="button" data-cmov="${k},1" aria-label="Bajar" ${k === CULTO.items.length - 1 ? "disabled" : ""}>${IC.abajo}</button><button class="iconbtn" style="width:32px;height:32px" type="button" data-cdel="${k}" aria-label="Quitar">${IC.x}</button></div>
      <div class="vlist">${mis.map(sl => { const i = idx++; return `<div class="v ${i === actual ? "on" : ""}" role="button" tabindex="0" data-slide="${i}" style="padding:8px 10px"><span class="n">${i + 1}</span><span class="x" style="font-size:14px">${esc(sl.label)}</span><span></span></div>`; }).join("")}</div></div>`;
    return html;
  }).join("");
  return `<div class="sec"><div class="head"><h2>Orden del culto</h2><button class="btn sm" type="button" data-cadd>+ Agregar</button></div>
    <div class="field"><span>${IC.reloj.replace("<svg", '<svg style="width:16px;height:16px;vertical-align:-3px"')} Cuenta regresiva rápida</span>
      <input class="input" id="cdTit" style="background:var(--surface-2)" value="${esc(store.get("pr-cdtit", "El culto inicia en"))}" aria-label="Texto arriba del reloj">
      <div class="chips">${[1, 3, 5, 10, 15, 20, 30, 45, 60].map(m => `<button type="button" data-cdmin="${m}">${m === 60 ? "1 hora" : m + " min"}</button>`).join("")}</div></div>
    ${CULTO.items.length ? `<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" type="button" id="cStart">▶ Empezar desde el inicio</button></div><div class="list">${items}</div>
      <p class="muted" style="font-size:13px">Con <b>Sigue</b> ▶ pasás por todo el culto en orden: versículos, estrofas, anuncios y cuentas regresivas.</p>
      <button class="btn danger sm" type="button" id="cClear" style="justify-self:start">Nuevo culto (borrar la lista)</button><div id="cClearBox"></div>`
      : `<div class="empty">Armá el orden del servicio antes del culto: bienvenida, cantos, lecturas, puntos de la prédica y anuncios. Después sólo tocás <b>Sigue</b>.<button class="btn sm" type="button" data-cadd>+ Agregar el primero</button></div>`}</div>`;
}
function hojaAgregarCulto() {
  let tipo = "biblia";
  const T = [["biblia", "Versículos"], ["cancion", "Canto"], ["texto", "Texto o bosquejo"], ["pres", "Diapositivas"], ["anuncio", "Anuncio"], ["pasaje", "Pasaje del culto"], ["cuenta", "Cuenta regresiva"]];
  const form = () => {
    if (tipo === "biblia") return `<label>Cita<input id="ca_cita" placeholder="Juan 3:16-18" autocomplete="off"></label><label>Versión<select id="ca_ver">${todasVersiones().map(v => `<option value="${esc(v.id)}" ${v.id === B.ver ? "selected" : ""}>${esc(v.corto)} · ${esc(v.nombre)}</option>`).join("")}</select></label>`;
    if (tipo === "cancion") { const L = todasCanciones().sort((a, b) => a.titulo.localeCompare(b.titulo, "es")); return L.length ? `<label>Canto<select id="ca_id">${L.map(c => `<option value="${esc(c.id)}">${esc(c.titulo)}</option>`).join("")}</select></label>` : `<p class="muted">Primero agregá cantos en la pestaña Cantos.</p>`; }
    if (tipo === "pres") return DIAPOS.length ? `<label>Presentación<select id="ca_id">${[...DIAPOS].sort((a, b) => (b.usado || b.creado || 0) - (a.usado || a.creado || 0)).map(m => `<option value="${esc(m.id)}">${esc(m.nombre)} · ${m.n} diapositivas</option>`).join("")}</select></label>` : `<p class="muted">Primero subí diapositivas en la pestaña Diapos.</p>`;
    if (tipo === "pasaje") return PASAJES.length ? `<label>Pasaje<select id="ca_id">${PASAJES.map(p => `<option value="${esc(p.id)}">${esc(p.cita)} · ${esc(p.version)}</option>`).join("")}</select></label>` : `<p class="muted">Primero pegá un pasaje en Biblia → Pasajes del culto.</p>`;
    if (tipo === "anuncio") return ANUNCIOS.length ? `<label>Anuncio<select id="ca_id">${ANUNCIOS.map(a => `<option value="${esc(a.id)}">${esc(a.titulo || corta(a.texto, 40) || "Imagen")}</option>`).join("")}</select></label>` : `<p class="muted">Primero guardá un anuncio en la pestaña Anuncios.</p>`;
    if (tipo === "texto") return `<label>Título (opcional, sale arriba en cada pantalla)<input id="ca_tit" placeholder="La fe que obedece"></label><label>Texto · dejá una línea en blanco para pasar a otra pantalla<textarea id="ca_txt" style="min-height:150px" placeholder="Bienvenidos a la casa de Dios&#10;&#10;1. La fe escucha&#10;&#10;2. La fe obedece"></textarea></label>`;
    if (tipo === "cuenta") return `<label>Texto arriba del reloj<input id="ca_tit" value="El culto inicia en"></label><label>Minutos<input id="ca_min" type="number" min="1" max="120" value="5" inputmode="numeric"></label><label>Texto al llegar a cero (opcional)<input id="ca_fin" placeholder="¡Bienvenidos!"></label>`;
  };
  abrirHoja("Agregar al culto", `<div class="chips" id="caT">${T.map(t => `<button type="button" data-cat="${t[0]}" aria-pressed="${t[0] === tipo}">${t[1]}</button>`).join("")}</div><form class="form" id="caF"><div id="caBody">${form()}</div><button class="btn wide" type="submit">Agregar al final</button></form>`, s => {
    s.addEventListener("click", e => { const b = e.target.closest("[data-cat]"); if (!b) return; tipo = b.dataset.cat; $$("[data-cat]", s).forEach(x => x.setAttribute("aria-pressed", x === b)); $("#caBody", s).innerHTML = form(); });
    $("#caF", s).onsubmit = async e => {
      e.preventDefault(); let it = null;
      if (tipo === "biblia") {
        const raw = $("#ca_cita", s).value.trim(); const m = raw.match(/-\s*(\d+)\s*$/); const p = parseCita(raw.replace(/-\s*\d+\s*$/, ""));
        if (!p) return toast("No reconozco esa cita. Probá así: Juan 3:16-18");
        const bib = BIB.rv1909 || await cargarVersion("rv1909"); if (!bib[p.libro] || p.cap > bib[p.libro].length) return toast("Ese capítulo no existe.");
        const v1 = p.vers || 1, v2 = m ? +m[1] : (p.vers || bib[p.libro][p.cap - 1].length);
        if (v2 < v1) return toast("El versículo final debe ser mayor que el inicial.");
        it = { t: "biblia", ver: $("#ca_ver", s).value, l: p.libro, c: p.cap, v1, v2 };
      } else if (tipo === "cancion" || tipo === "pasaje" || tipo === "anuncio" || tipo === "pres") { const sel = $("#ca_id", s); if (!sel) return; it = { t: tipo, id: sel.value }; }
      else if (tipo === "texto") { const partes = $("#ca_txt", s).value.replace(/\r/g, "").split(/\n\s*\n/).map(x => x.trim()).filter(Boolean); if (!partes.length) return toast("Escribí el texto."); it = { t: "texto", titulo: $("#ca_tit", s).value.trim(), partes }; }
      else if (tipo === "cuenta") { const min = Math.max(1, Math.min(120, +$("#ca_min", s).value || 5)); it = { t: "cuenta", min, titulo: $("#ca_tit", s).value.trim(), fin: $("#ca_fin", s).value.trim() }; }
      CULTO.items = [...CULTO.items, it]; await guardarCulto(); toast("Agregado al culto."); cerrarHoja(); renderMain();
    };
  });
}

/* ---------- Estudio: texto original, Strong y gramática (datos STEPBible.org, CC BY 4.0) ---------- */
const EST = {}, LEX = {};
async function libroEstudio(l) { if (!EST[l]) { const r = await fetch(`estudio/${l}.json`); if (!r.ok) throw new Error("No se pudo cargar el texto original."); EST[l] = await r.json(); } return EST[l]; }
async function lexico(t) { if (!LEX[t]) { const r = await fetch(`estudio/lex-${t}.json`); if (!r.ok) throw new Error("No se pudo cargar el diccionario."); LEX[t] = await r.json(); } return LEX[t]; }
function buscarLex(lx, s) {
  if (!s || !lx) return null; if (lx[s]) return lx[s];
  const m = String(s).match(/^([GH])(\d+)([A-Za-z]?)$/); if (!m) return null;
  return lx[m[1] + m[2] + m[3].toLowerCase()] || lx[m[1] + m[2]] || lx[m[1] + m[2] + "a"] || null;
}
const strongCorto = s => String(s || "").replace(/^([GH])0*(\d+)([A-Za-z]?)$/, (m, a, n, x) => a + n + (x ? x.toLowerCase() : ""));
const LK = { 0: "Gn", 39: "Mt" };
function linkLogos(l, c, v) { return `https://logosklogos.com/${l >= 39 ? "NT" : "AT"}/${LK[l] || LIBROS[l][1]}/${c}/${v}`; }

// Gramática griega (códigos Robinson) en español
function morfoG(code) {
  if (!code) return "";
  const P = { ADV: "adverbio", CONJ: "conjunción", COND: "partícula condicional", PRT: "partícula", PREP: "preposición", INJ: "interjección", ARAM: "palabra aramea", HEB: "palabra hebrea" };
  const base = code.split("-");
  if (P[base[0]]) return P[base[0]] + (base[1] === "N" ? " negativa" : base[1] === "I" ? " interrogativa" : "");
  const CAS = { N: "nominativo", G: "genitivo", D: "dativo", A: "acusativo", V: "vocativo" }, NUM = { S: "singular", P: "plural" }, GEN = { M: "masculino", F: "femenino", N: "neutro" };
  const cng = x => { if (!x) return ""; const m = x.match(/^([123])?([NGDAV])([SP])([MFN])?/); if (!m) return ""; return [m[1] ? m[1] + "ª persona" : "", CAS[m[2]], NUM[m[3]], GEN[m[4]]].filter(Boolean).join(", "); };
  const POS = { N: "sustantivo", A: "adjetivo", T: "artículo", P: "pronombre personal", R: "pronombre relativo", C: "pronombre recíproco", D: "pronombre demostrativo", K: "pronombre correlativo", I: "pronombre interrogativo", X: "pronombre indefinido", Q: "pronombre correlativo", F: "pronombre reflexivo", S: "pronombre posesivo" };
  if (base[0] === "V") {
    const m = (base[1] || "").match(/^(2)?([PIFARL])([AMPEDON])([ISOMNPR])$/);
    const T = { P: "presente", I: "imperfecto", F: "futuro", A: "aoristo", R: "perfecto", L: "pluscuamperfecto" }, VZ = { A: "activa", M: "media", P: "pasiva", E: "media o pasiva", D: "media deponente", O: "pasiva deponente", N: "media o pasiva deponente" }, MO = { I: "indicativo", S: "subjuntivo", O: "optativo", M: "imperativo", N: "infinitivo", P: "participio", R: "participio imperativo" };
    if (!m) return "verbo";
    let out = `verbo, ${m[1] ? "segundo " : ""}${T[m[2]]}, voz ${VZ[m[3]]}, ${MO[m[4]]}`;
    const r = base[2] || "";
    if (/^[123][SP]$/.test(r)) out += `, ${r[0]}ª persona ${NUM[r[1]]}`; else if (r) out += ", " + cng(r);
    return out;
  }
  if (POS[base[0]]) { const rest = cng(base[1]); return POS[base[0]] + (rest ? ", " + rest : "") + (base.includes("PRI") || base[1] === "PRI" ? " (nombre propio)" : ""); }
  return code;
}
// Gramática hebrea (códigos OpenScriptures) en español
function morfoH(code) {
  if (!code) return "";
  const lang = code[0] === "A" ? "arameo: " : "";
  const G = { m: "masculino", f: "femenino", b: "ambos géneros", c: "común" }, N = { s: "singular", p: "plural", d: "dual" }, ST = { a: "absoluto", c: "constructo", d: "determinado" };
  const STEM = { q: "qal", N: "nifal", p: "piel", P: "pual", h: "hifil", H: "hofal", t: "hitpael", o: "polel", O: "polal", r: "hitpolel", m: "poel", M: "poal", k: "palel", K: "pulal", Q: "qal pasivo", l: "pilpel", L: "polpal", f: "hitpalpel", D: "nitpael", j: "pealal", i: "pilel", u: "hotpaal", c: "tifil", v: "hishtafel", w: "nitpael", y: "hitpoel", z: "hitpael", e: "peal", E: "peil", a: "hafel", b: "hufal", g: "shafel", s: "hitpeel", x: "itpeal" };
  const TY = { p: "perfecto (qatal)", q: "perfecto consecutivo (weqatal)", i: "imperfecto (yiqtol)", w: "imperfecto consecutivo (wayyiqtol)", h: "cohortativo", j: "yusivo", v: "imperativo", r: "participio activo", s: "participio pasivo", a: "infinitivo absoluto", c: "infinitivo constructo" };
  const seg = s => {
    const t = s[0], r = s.slice(1);
    if (t === "V") { const p = r.match(/^(.)(.)([123])?([mfbc])?([spd])?([acd])?/); if (!p) return "verbo"; return ["verbo " + (STEM[p[1]] || ""), TY[p[2]] || "", p[3] ? p[3] + "ª persona" : "", G[p[4]], N[p[5]]].filter(Boolean).join(", "); }
    if (t === "N") { const p = r.match(/^([cgpx])?([mfbc])?([spd])?([acd])?/) || []; return [p[1] === "p" ? "nombre propio" : p[1] === "g" ? "gentilicio" : "sustantivo", G[p[2]], N[p[3]], ST[p[4]]].filter(Boolean).join(", "); }
    if (t === "A") { const p = r.match(/^([acgo])?([mfbc])?([spd])?([acd])?/) || []; return [{ a: "adjetivo", c: "número cardinal", g: "gentilicio", o: "número ordinal" }[p[1]] || "adjetivo", G[p[2]], N[p[3]], ST[p[4]]].filter(Boolean).join(", "); }
    if (t === "P") { const p = r.match(/^([dfipr])?([123])?([mfbc])?([spd])?/) || []; return [{ d: "pronombre demostrativo", f: "pronombre indefinido", i: "pronombre interrogativo", p: "pronombre personal", r: "pronombre relativo" }[p[1]] || "pronombre", p[2] ? p[2] + "ª persona" : "", G[p[3]], N[p[4]]].filter(Boolean).join(", "); }
    if (t === "S") { const p = r.match(/^([dhnp])([123])?([mfbc])?([spd])?/) || []; return p[1] === "p" ? ["sufijo pronominal", p[2] ? p[2] + "ª persona" : "", G[p[3]], N[p[4]]].filter(Boolean).join(", ") : { d: "he direccional", h: "he paragógica", n: "nun paragógica" }[p[1]] || "sufijo"; }
    if (t === "T") return { a: "partícula afirmativa", d: "artículo definido", e: "partícula exhortativa", i: "partícula interrogativa", j: "interjección", m: "partícula demostrativa", n: "partícula negativa", o: "marca de objeto directo", r: "partícula relativa" }[r[0]] || "partícula";
    if (t === "R") return r[0] === "d" ? "preposición con artículo" : "preposición";
    if (t === "C") return "conjunción";
    if (t === "D") return "adverbio";
    return s;
  };
  return lang + code.slice(1).split("/").map(seg).join(" + ");
}

async function estudiar(l, c, v) {
  const nt = l >= 39;
  abrirHoja(`${LIBROS[l][0]} ${c}:${v}`, `<div id="estbox" style="display:grid;gap:12px"><p class="muted">Cargando el ${nt ? "griego" : "hebreo"}…</p></div>`);
  const box = $("#estbox"); if (!box) return;
  let ws, lx;
  try { const r = await Promise.all([libroEstudio(l), lexico(nt ? "g" : "h")]); ws = r[0]?.[c]?.[v]; lx = r[1]; }
  catch (er) { box.innerHTML = `<div class="confirm">${esc(er.message)}</div>`; return; }
  if (!ws || !ws.length) { box.innerHTML = `<div class="empty">No hay texto original para este versículo.</div><a class="btn ghost sm" href="${linkLogos(l, c, v)}" target="_blank" rel="noopener">Abrir en LogosKLogos</a>`; return; }
  const trad = BIB[B.ver]?.[l]?.[c - 1]?.[v - 1] || BIB.rv1909?.[l]?.[c - 1]?.[v - 1] || "";
  const original = ws.map(w => w[0]).join(" ");
  const glosa = w => nt ? (w[4] || w[5]) : w[5];
  box.innerHTML = `${trad ? `<p style="font-size:15px">${esc(trad)} <span class="muted" style="font-size:12px">· ${esc(verInfo(B.ver).corto)}</span></p>` : ""}
    <p class="orig" dir="${nt ? "ltr" : "rtl"}">${esc(original)}</p>
    <span class="lbl">${nt ? "Griego · tocá una palabra" : "Hebreo · se lee de derecha a izquierda · tocá una palabra"}</span>
    <div class="inter ${nt ? "" : "rtl"}">${ws.map((w, i) => `<button type="button" class="pal" data-pal="${i}"><span class="o" dir="${nt ? "ltr" : "rtl"}">${esc(w[0])}</span><span class="tr">${esc(w[1])}</span><span class="gl">${esc(glosa(w) || "—")}</span>${nt && w[4] && w[5] ? `<span class="tr" style="font-style:normal">${esc(w[5])}</span>` : ""}<span class="sn">${esc(strongCorto(w[2]))}</span></button>`).join("")}</div>
    <div id="det"></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm" type="button" id="projOrig">Proyectar el ${nt ? "griego" : "hebreo"}</button><a class="btn ghost sm" href="${linkLogos(l, c, v)}" target="_blank" rel="noopener" style="text-decoration:none">Abrir en LogosKLogos</a></div>
    <p class="credit">Texto original, Strong y gramática: STEPBible.org (Tyndale House), licencia CC BY 4.0.${nt ? "" : " Las traducciones palabra por palabra del hebreo están en inglés."}</p>`;
  $("#projOrig").onclick = () => { CTX = { tipo: "biblia", ver: B.ver, l, c, v }; enviar({ modo: "texto", texto: original, ref: `${LIBROS[l][0]} ${c}:${v} · ${nt ? "Griego" : "Hebreo"}`, titulo: "", img: null, negro: false, oculto: false }); toast("Proyectando el texto original."); };
  box.addEventListener("click", e => {
    const b = e.target.closest("[data-pal]"); if (!b) return;
    $$(".pal", box).forEach(x => x.classList.toggle("on", x === b));
    const w = ws[+b.dataset.pal]; const L = buscarLex(lx, w[2]) || [];
    const lema = L[0] || w[6] || w[0], tr = String(L[1] || w[1]).replace(/\./g, ""), gl = (nt ? w[4] : "") || L[2] || w[5] || "";
    const sig = L[2] ? L[2] + " (inglés)" : gl;
    const det = $("#det", box);
    det.innerHTML = `<div class="det"><div class="lem" dir="${nt ? "ltr" : "rtl"}">${esc(lema)}</div><span class="muted" style="font-style:italic">${esc(tr)}</span>
      <dl><dt>Strong</dt><dd class="mono">${esc(strongCorto(w[2]))}</dd><dt>Significado</dt><dd>${esc(sig)}</dd><dt>En este versículo</dt><dd>${esc(w[0])} · ${esc(glosa(w) || "")}${nt && w[4] && w[5] ? ` <span class="muted" style="font-weight:500">(inglés: ${esc(w[5])})</span>` : ""}</dd><dt>Gramática</dt><dd style="font-weight:600">${esc(nt ? morfoG(w[3]) : morfoH(w[3]))}</dd></dl>
      ${L[3] ? `<span class="lbl">Definición del diccionario (en inglés)</span><div class="def">${esc(L[3])}</div>` : ""}
      <label style="display:grid;gap:4px;font-size:13px;font-weight:700;color:var(--muted)">Texto para la pantalla<input id="palGl" class="input" value="${esc(gl)}"></label>
      <button class="btn sm" type="button" id="projPal">Proyectar esta palabra</button></div>`;
    $("#projPal", det).onclick = () => { const g = $("#palGl", det).value.trim(); CTX = null; enviar({ modo: "texto", titulo: lema, texto: `${tr}${g ? "\n«" + g + "»" : ""}`, ref: `${strongCorto(w[2])} · ${LIBROS[l][0]} ${c}:${v}`, img: null, negro: false, oculto: false }); toast("Proyectando " + lema); };
    det.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
}

/* ---------- configurar YouVersion ---------- */
async function guardarYV() { await setDoc(doc(db, "proyector_cfg", "youversion"), { key: YV.key, versiones: YV.versiones }); }
function hojaYouVersion() {
  abrirHoja("Versiones de YouVersion", `<p class="muted" style="font-size:14px">Con tu App Key de YouVersion Platform podés agregar versiones con licencia, como la RVR1960, si YouVersion las tiene habilitadas para tu app. El texto se trae de YouVersion cada vez y no se guarda.</p>
    <form class="form" id="yvf"><label>App Key<input id="yv_key" autocomplete="off" placeholder="Pegá aquí tu App Key" value="${YV.key ? "•".repeat(12) + YV.key.slice(-4) : ""}"></label>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm" type="submit">Guardar clave</button><button class="btn ghost sm" type="button" id="yv_buscar">Buscar versiones en español</button></div></form>
    <div id="yv_out"></div>
    ${YV.versiones.length ? `<span class="lbl">Agregadas</span><div class="list">${YV.versiones.map(v => `<div class="row-item"><span style="min-width:0"><b>${esc(v.corto)}</b><small>${esc(v.nombre)} · id ${esc(v.id)}</small></span><button class="btn danger sm" type="button" data-yvdel="${esc(v.id)}">Quitar</button></div>`).join("")}</div>` : ""}`, s => {
    $("#yvf", s).onsubmit = async e => { e.preventDefault(); const k = $("#yv_key", s).value.trim(); if (!k || k.startsWith("•")) return toast("Pegá la App Key completa."); YV.key = k; try { await guardarYV(); toast("Clave guardada en tu Firebase."); $("#yv_key", s).value = "•".repeat(12) + k.slice(-4); } catch (er) { toast("No se pudo guardar: " + (er.code || er.message)) } };
    $("#yv_buscar", s).onclick = async () => {
      const out = $("#yv_out", s); out.innerHTML = '<p class="muted">Buscando…</p>';
      try {
        const [hab, todas] = await Promise.all([yvGet("/v1/bibles?language_ranges[]=spa").catch(() => null), yvGet("/v1/bibles?language_ranges[]=spa&all_available=true")]);
        const lista = (todas && (todas.data || todas.bibles || todas)) || [];
        const habIds = new Set(((hab && (hab.data || hab.bibles || hab)) || []).map(b => String(b.id)));
        if (!Array.isArray(lista) || !lista.length) { out.innerHTML = `<div class="empty">YouVersion no devolvió versiones en español.<br><small>${esc(JSON.stringify(todas).slice(0, 300))}</small></div>`; return; }
        const nombre = b => b.title || b.name || b.local_title || "Versión " + b.id;
        const corto = b => b.abbreviation || b.local_abbreviation || b.abbr || ("YV" + b.id);
        lista.sort((a, b) => (String(corto(b)).includes("1960") - String(corto(a)).includes("1960")) || (habIds.has(String(b.id)) - habIds.has(String(a.id))) || nombre(a).localeCompare(nombre(b), "es"));
        out.innerHTML = `<span class="lbl">${lista.length} versiones en español</span><div class="list">${lista.map(b => { const ya = YV.versiones.some(v => String(v.id) === String(b.id)); return `<div class="row-item"><span style="min-width:0"><b>${esc(corto(b))}</b><small>${esc(nombre(b))} · id ${esc(b.id)}${habIds.size ? (habIds.has(String(b.id)) ? " · habilitada" : " · no habilitada") : ""}</small></span><span style="display:flex;gap:6px"><button class="btn ghost sm" type="button" data-yvtest="${esc(b.id)}">Probar</button><button class="btn sm" type="button" data-yvadd="${esc(b.id)}" data-yvn="${esc(nombre(b))}" data-yvc="${esc(corto(b))}" ${ya ? "disabled" : ""}>${ya ? "Agregada" : "Agregar"}</button></span></div>` }).join("")}</div><div id="yv_test"></div>`;
      } catch (er) { out.innerHTML = `<div class="confirm"><b>No se pudo conectar</b><span style="font-size:14px">${esc(er.message)}</span></div>`; }
    };
    s.addEventListener("click", async e => {
      const a = e.target.closest("[data-yvadd]"); const t = e.target.closest("[data-yvtest]"); const d = e.target.closest("[data-yvdel]");
      if (a) { YV.versiones.push({ id: a.dataset.yvadd, nombre: a.dataset.yvn, corto: a.dataset.yvc }); try { await guardarYV(); a.textContent = "Agregada"; a.disabled = true; toast(a.dataset.yvc + " agregada."); renderMain(); } catch (er) { toast("No se pudo guardar: " + (er.code || er.message)) } }
      if (t) { const box = $("#yv_test", s); box.innerHTML = '<p class="muted">Probando Juan 3…</p>'; try { const vs = await cargarCapYV("yv:" + t.dataset.yvtest, 42, 3); box.innerHTML = `<div class="field"><span>Juan 3:16 · funciona ✅ (${vs.length} versículos)</span><p>${esc(vs[15] || "")}</p></div>`; } catch (er) { box.innerHTML = `<div class="confirm"><b>No funcionó</b><span style="font-size:14px">${esc(er.message)}</span></div>`; } box.scrollIntoView({ block: "nearest" }); }
      if (d) { YV.versiones = YV.versiones.filter(v => String(v.id) !== d.dataset.yvdel); delete BIB["yv:" + d.dataset.yvdel]; if (B.ver === "yv:" + d.dataset.yvdel) { B.ver = "rv1909"; store.set("pr-ver", B.ver); } try { await guardarYV(); cerrarHoja(); renderMain(); toast("Versión quitada.") } catch (er) { toast("No se pudo guardar: " + (er.code || er.message)) } }
    });
  });
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

/* ---------- Diapositivas: PowerPoint, PDF, fotos, videos y YouTube ---------- */
const PARTE_BYTES = 900000, PARTE_TXT = 300000, GRATIS = 1024 * 1024 * 1024;
let DIAPOS = [], DIAPOS_LISTAS = false;
let PRES = null;                                  // presentación abierta: { id, pv, sc, meta }
const POS = store.get("pr-pos", {});              // dónde quedó cada presentación
const VID = { el: null, sonando: false, base: 0, desde: 0, dur: 0, mudo: false };
let T_AUTO = null, PZ = null;
configurarAlmacen({ leerDoc: async id => { const d = await getDoc(doc(db, "proyector", id)); return d.exists() ? d.data() : null; } });
const tam = b => b >= 1e9 ? (b / 1073741824).toFixed(2).replace(".", ",") + " GB" : b >= 1048576 ? Math.round(b / 1048576) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB";
const ORIGEN = { pptx: "PowerPoint", pdf: "PDF", img: "Fotos", video: "Video", yt: "YouTube", mix: "Varias" };
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const venceEn = m => Math.max(m.creado || 0, m.usado || 0) + 48 * 3600e3;
function textoVence(m) {
  const d = new Date(venceEn(m)), hoy = new Date();
  const hora = d.toLocaleTimeString("es", { hour: "numeric", minute: "2-digit" });
  const dd = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())) / 864e5);
  return "Se borra sola " + (dd <= 0 ? "hoy" : dd === 1 ? "mañana" : "el " + DIAS[d.getDay()]) + " a las " + hora;
}
async function enParalelo(tareas, n) { let i = 0; const corre = async () => { while (i < tareas.length) { const k = i++; await tareas[k](); } }; await Promise.all(Array.from({ length: Math.min(n, tareas.length) }, corre)); }
async function subirArchivo(a, alSubir) {
  const partes = Math.max(1, Math.ceil(a.blob.size / PARTE_BYTES));
  const pedazo = async k => new Uint8Array(await a.blob.slice(k * PARTE_BYTES, (k + 1) * PARTE_BYTES).arrayBuffer());
  const tareas = [];
  for (let k = 1; k < partes; k++) tareas.push(async () => { const b = await pedazo(k); await setDoc(doc(db, "proyector", `a_${a.id}_${k}`), { b: Bytes.fromUint8Array(b) }); alSubir(b.length); });
  await enParalelo(tareas, 3);
  const b0 = await pedazo(0);
  await setDoc(doc(db, "proyector", "a_" + a.id), { tipo: "archivo", mime: a.mime || "", size: a.blob.size, partes, b: Bytes.fromUint8Array(b0) });
  alSubir(b0.length);
  return partes;
}
async function guardarEscena(id, sc) {
  const json = JSON.stringify(sc); const partes = Math.max(1, Math.ceil(json.length / PARTE_TXT));
  for (let k = 1; k < partes; k++) await setDoc(doc(db, "proyector", `pres_${id}_p${k}`), { json: json.slice(k * PARTE_TXT, (k + 1) * PARTE_TXT) });
  await setDoc(doc(db, "proyector", "pres_" + id), { tipo: "pres", partes, json: json.slice(0, PARTE_TXT) });
  return partes;
}
async function borrarDocs(ids) {
  for (let i = 0; i < ids.length; i += 400) { const b = writeBatch(db); ids.slice(i, i + 400).forEach(x => b.delete(doc(db, "proyector", x))); await b.commit(); }
}
const docsDeArchivo = a => { const o = ["a_" + a.id]; for (let k = 1; k < (a.partes || 1); k++) o.push(`a_${a.id}_${k}`); return o; };
async function borrarPres(m, callado) {
  if (LIVE.modo === "pres" && LIVE.pres === m.id) { CTX = null; enviar({ modo: "fondo", texto: "", ref: "", titulo: "", img: null, auto: null }); }
  if (PRES && PRES.id === m.id) cerrarPresentador();
  const ids = ["pres_" + m.id];
  for (let k = 1; k < (m.partesMax || m.partes || 1) + 2; k++) ids.push(`pres_${m.id}_p${k}`);
  (m.assets || []).forEach(a => { ids.push(...docsDeArchivo(a)); borrarArchivoLocal(a.id); });
  await borrarDocs(ids);
  await deleteDoc(doc(db, "proyector_diapos", m.id));
  CULTO.items.some(it => it.t === "pres" && it.id === m.id) && (CULTO.items = CULTO.items.filter(it => !(it.t === "pres" && it.id === m.id)), guardarCulto());
  delete POS[m.id]; store.set("pr-pos", POS);
  if (!callado) toast("Presentación borrada.");
}
function limpiarSubidaCortada() {
  const x = store.get("pr-subiendo", null); if (!x) return;
  const usados = new Set(DIAPOS.flatMap(m => (m.assets || []).map(a => a.id)));
  const ids = [];
  (x.assets || []).filter(a => !usados.has(a.id)).forEach(a => { ids.push(...docsDeArchivo(a)); borrarArchivoLocal(a.id); });
  if (x.pres && !DIAPOS.some(m => m.id === x.pres)) { ids.push("pres_" + x.pres); for (let k = 1; k < 12; k++) ids.push(`pres_${x.pres}_p${k}`); }
  store.set("pr-subiendo", null);
  if (ids.length) borrarDocs(ids).catch(() => { });
}
function limpiarVencidas() {
  DIAPOS.filter(m => m.temporal && venceEn(m) < Date.now() && !(LIVE.modo === "pres" && LIVE.pres === m.id)).forEach(m => borrarPres(m, true).catch(() => { }));
}
async function escenaDe(m) { const sc = await cargarEscena(m.id, m.pv || 1); if (sc.fuentes) cargarFuentes(sc.fuentes); return sc; }
async function bajarDiapo(sc, i) { await Promise.all(archivosDe(sc.slides[i] || {}, true).map(a => archivo(a).catch(() => null))); }

/* importar un archivo y subirlo */
async function importarYSubir({ files, yt, op, nombre, temporal, agregarA }, avanceUI) {
  const imp = await import("./importar.js");
  avanceUI(.01, "Preparando…");
  const r = yt ? imp.importarYouTube(yt, op) : await imp.importarArchivos(files, op, (x, msg) => avanceUI(x * .45, msg));
  const total = r.archivos.reduce((a, b) => a + b.blob.size, 0);
  const libre = GRATIS - DIAPOS.reduce((a, m) => a + (m.tam || 0), 0);
  if (total > libre - 30 * 1048576) throw new Error(`No cabe: ocupa ${tam(total)} y te quedan ${tam(Math.max(0, libre))} libres. Borrá alguna presentación vieja.`);
  let hecho = 0; const assets = [];
  const idNuevo = agregarA ? null : imp.nuevoId(10);
  // si se corta la subida, la próxima vez se borra lo que quedó a medias
  store.set("pr-subiendo", { pres: idNuevo, assets: r.archivos.map(a => ({ id: a.id, partes: Math.max(1, Math.ceil(a.blob.size / PARTE_BYTES)) })) });
  for (const a of r.archivos) {
    registrarArchivo(a.id, a.blob, a.mime);
    const partes = await subirArchivo(a, n => { hecho += n; avanceUI(.45 + .5 * (total ? hecho / total : 1), `Subiendo… ${tam(hecho)} de ${tam(total)}`); });
    const x = { id: a.id, partes, size: a.blob.size, mime: a.mime || "" }; if (a.dur) x.dur = Math.round(a.dur * 10) / 10;
    assets.push(x);
  }
  avanceUI(.97, "Guardando…");
  if (agregarA) {
    const m = DIAPOS.find(x => x.id === agregarA); if (!m) throw new Error("Esa presentación ya no existe.");
    const sc = await escenaDe(m);
    const nuevas = r.sc.slides.map(s => (r.sc.w !== sc.w || r.sc.h !== sc.h) ? Object.assign({ w: r.sc.w, h: r.sc.h }, s) : s);
    const sc2 = Object.assign({}, sc, { slides: sc.slides.concat(nuevas), fuentes: Array.from(new Set([...(sc.fuentes || []), ...(r.sc.fuentes || [])])) });
    const partes = await guardarEscena(m.id, sc2); const pv = (m.pv || 1) + 1; recordarEscena(m.id, pv, sc2);
    await updateDoc(doc(db, "proyector_diapos", m.id), { n: sc2.slides.length, tam: (m.tam || 0) + total, notas: [...(m.notas || []), ...r.notas], titulos: [...(m.titulos || []), ...r.titulos], assets: [...(m.assets || []), ...assets], partes, partesMax: Math.max(partes, m.partesMax || m.partes || 1), pv, origen: m.origen === r.origen ? m.origen : "mix" });
    store.set("pr-subiendo", null);
    return { id: m.id, r, n: nuevas.length };
  }
  const id = idNuevo;
  const partes = await guardarEscena(id, r.sc); recordarEscena(id, 1, r.sc);
  await setDoc(doc(db, "proyector_diapos", id), { nombre, creado: Date.now(), usado: 0, temporal: !!temporal, n: r.sc.slides.length, tam: total, portada: r.portada || null, origen: r.origen, notas: r.notas, titulos: r.titulos, assets, partes, partesMax: partes, pv: 1, yt: r.yt || null, w: r.sc.w, h: r.sc.h });
  store.set("pr-subiendo", null);
  return { id, r, n: r.sc.slides.length };
}

function hojaSubir(agregarA) {
  const m = agregarA ? DIAPOS.find(x => x.id === agregarA) : null;
  let files = [], temporal = store.get("pr-dptemp", false);
  abrirHoja(m ? "Agregar a «" + corta(m.nombre, 28) + "»" : "Subir diapositivas", `<form class="form" id="dpF">
    <label class="dp-escoger"><input type="file" id="dpFile" accept=".pptx,.ppsx,.potx,.pptm,.pdf,image/*,video/*,audio/*,.mov,.mp4,.m4v" multiple hidden>
      <span class="dp-escoger-ic">${IC.subir}</span><b id="dpFileT">Escoger archivo</b><small id="dpFileS">PowerPoint, PDF (Canva, Google Slides), fotos o videos</small></label>
    <div class="dp-o"><span>o un video de YouTube</span></div>
    <input id="dpYt" placeholder="Pegá el link de YouTube" autocomplete="off" inputmode="url">
    ${m ? "" : `<label>Nombre<input id="dpNom" maxlength="80" placeholder="Prédica del domingo"></label>
    <div class="chips" id="dpTemp"><button type="button" data-dptemp="0" aria-pressed="${!temporal}">Guardar en la biblioteca</button><button type="button" data-dptemp="1" aria-pressed="${temporal}">Usar y borrar</button></div>
    <p class="muted" id="dpTempInfo" style="font-size:13px;margin-top:-4px"></p>`}
    <div id="dpOpVid" hidden><label class="sw" style="font-weight:600;color:var(--fg)"><span>El video arranca solo al mostrarlo</span><input type="checkbox" id="dpAuto" checked></label><label class="sw" style="font-weight:600;color:var(--fg)"><span>Repetir el video sin parar</span><input type="checkbox" id="dpLoop"></label></div>
    <details class="dp-ayuda"><summary>¿Cómo lo bajo de Canva o Google Slides?</summary>
      <p><b>Canva:</b> Compartir → Descargar → <b>PDF estándar</b> (o PowerPoint). Si tu diseño tiene videos o animaciones de Canva, bajalo como <b>Video MP4</b> y subilo aquí.</p>
      <p><b>Google Slides:</b> Archivo → Descargar → <b>Microsoft PowerPoint (.pptx)</b>. Así se conservan las animaciones.</p>
      <p><b>PowerPoint:</b> subí el .pptx tal cual. Las animaciones, transiciones, videos y notas vienen incluidos.</p>
      <p><b>Keynote:</b> Archivo → Exportar a → PowerPoint.</p></details>
    <div id="dpProg" hidden><div class="dp-barra"><i id="dpBarra"></i></div><small class="muted" id="dpProgT">Preparando…</small></div>
    <div id="dpAvisos"></div>
    <button class="btn wide" type="submit" id="dpGo">${m ? "Agregar" : "Subir"}</button></form>`, s => {
    const info = () => { const t = $("#dpTempInfo", s); if (t) t.textContent = temporal ? "Para algo de una sola vez: se borra sola 2 días después de usarla, para no llenar el espacio." : "Queda guardada para usarla cuando querás."; };
    info();
    $("#dpFile", s).onchange = e => {
      files = Array.from(e.target.files || []); if (!files.length) return;
      $("#dpFileT", s).textContent = files.length === 1 ? files[0].name : files.length + " archivos";
      $("#dpFileS", s).textContent = tam(files.reduce((a, f) => a + f.size, 0)) + " · tocá para cambiar";
      const nom = $("#dpNom", s); if (nom && !nom.value) nom.value = files.length === 1 ? files[0].name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() : "Fotos " + new Date().toLocaleDateString("es");
      $("#dpOpVid", s).hidden = !files.some(f => /^video\//.test(f.type) || /\.(mp4|mov|m4v|webm)$/i.test(f.name));
      $("#dpYt", s).value = "";
    };
    $("#dpYt", s).oninput = () => { const v = $("#dpYt", s).value.trim(); $("#dpOpVid", s).hidden = !v && !files.some(f => /^video\//.test(f.type)); const nom = $("#dpNom", s); if (v && nom && !nom.value) nom.value = "Video de YouTube"; };
    s.addEventListener("click", e => { const b = e.target.closest("[data-dptemp]"); if (!b) return; temporal = b.dataset.dptemp === "1"; store.set("pr-dptemp", temporal); $$("[data-dptemp]", s).forEach(x => x.setAttribute("aria-pressed", x === b)); info(); });
    $("#dpF", s).onsubmit = async e => {
      e.preventDefault();
      const yt = $("#dpYt", s).value.trim();
      if (!files.length && !yt) return toast("Escogé un archivo o pegá un link de YouTube.");
      const nombre = (($("#dpNom", s) || {}).value || "").trim() || (files[0] ? files[0].name.replace(/\.[^.]+$/, "") : "Video de YouTube");
      const go = $("#dpGo", s); go.disabled = true; go.textContent = "Trabajando…";
      $("#dpProg", s).hidden = false; $("#dpAvisos", s).innerHTML = "";
      let lock = null; try { lock = await navigator.wakeLock.request("screen"); } catch { }
      const av = (x, t) => { $("#dpBarra", s).style.width = Math.round(x * 100) + "%"; if (t) $("#dpProgT", s).textContent = t; };
      try {
        const res = await importarYSubir({ files, yt: files.length ? null : yt, op: { auto: $("#dpAuto", s).checked, repetir: $("#dpLoop", s).checked }, nombre, temporal, agregarA }, av);
        av(1, "¡Listo!");
        const avisos = res.r.avisos || [];
        if (avisos.length) {
          $("#dpAvisos", s).innerHTML = `<div class="confirm" style="background:rgba(243,198,77,.12)"><b>Listo, con ${avisos.length === 1 ? "un detalle" : "unos detalles"}:</b>${avisos.map(a => `<span style="font-size:14px">• ${esc(a)}</span>`).join("")}<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm" type="button" id="dpVer">Presentar</button><button class="btn ghost sm" type="button" data-close>Cerrar</button></div></div>`;
          $("#dpVer", s).onclick = () => { cerrarHoja(); presentar(res.id); };
          go.hidden = true;
        } else { cerrarHoja(); toast(agregarA ? `Se agregaron ${res.n} diapositivas.` : `«${nombre}» lista: ${res.n} ${res.n === 1 ? "diapositiva" : "diapositivas"}.`); }
        TAB = "diapos"; store.set("pr-tab", TAB); renderMain();
      } catch (er) {
        console.error(er);
        $("#dpAvisos", s).innerHTML = `<div class="confirm"><b>No se pudo</b><span style="font-size:14px">${esc(er.message || String(er))}</span></div>`;
        limpiarSubidaCortada();
        go.disabled = false; go.textContent = "Probar otra vez"; $("#dpProg", s).hidden = true;
      } finally { try { lock && lock.release(); } catch { } }
    };
  });
}

/* biblioteca */
function vDiapos() {
  const usado = DIAPOS.reduce((a, m) => a + (m.tam || 0), 0), pct = Math.min(100, usado / GRATIS * 100);
  const lista = [...DIAPOS].sort((a, b) => (b.usado || b.creado || 0) - (a.usado || a.creado || 0));
  const enVivo = LIVE.modo === "pres" ? LIVE.pres : null;
  const items = lista.map(m => {
    const pos = POS[m.id];
    const seguir = pos && pos.i > 0 && Date.now() - pos.t < 6 * 3600e3 && pos.i < (m.n || 1);
    return `<div class="dp-item ${enVivo === m.id ? "on" : ""}">
      <button type="button" class="dp-portada" data-dppres="${m.id}" aria-label="Presentar ${esc(m.nombre)}" ${m.portada ? "" : `data-vivo="${m.id}"`}>${m.portada ? `<img src="${m.portada}" alt="">` : m.yt ? `<img src="https://i.ytimg.com/vi/${esc(m.yt)}/mqdefault.jpg" alt="">` : ""}<span class="dp-n">${m.n || 0}</span></button>
      <div class="dp-info"><b>${esc(m.nombre)}</b><small>${m.n || 0} ${m.n === 1 ? "diapositiva" : "diapositivas"} · ${ORIGEN[m.origen] || "Archivo"} · ${tam(m.tam || 0)}</small>${m.temporal ? `<small class="dp-vence">${esc(textoVence(m))}</small>` : ""}
        <div class="dp-acc"><button class="btn sm" type="button" data-dppres="${m.id}">▶ ${enVivo === m.id ? "Abrir" : "Presentar"}</button>${seguir && enVivo !== m.id ? `<button class="btn ghost sm" type="button" data-dpseguir="${m.id}">Seguir en la ${pos.i + 1}</button>` : ""}<button class="iconbtn" type="button" data-dpmenu="${m.id}" aria-label="Más opciones">${IC.mas}</button></div></div></div>`;
  }).join("");
  return `<div class="sec"><div class="head"><h2>Diapositivas</h2><button class="btn sm" type="button" data-dpsubir>+ Subir</button></div>
    ${DIAPOS.length ? `<div class="dp-medidor"><div class="dp-barra"><i style="width:${pct.toFixed(1)}%;${pct > 85 ? "background:var(--bad)" : ""}"></i></div><small class="muted">Usás ${tam(usado)} de 1 GB gratis${pct > 85 ? " · ya casi se llena: borrá lo que no usés" : ""}</small></div><div class="list">${items}</div>
      <p class="muted" style="font-size:13px">Tocá una presentación para proyectarla. Con <b>Sigue</b> ▶ pasás cada animación y cada diapositiva. Las notas sólo las ves vos.</p>`
      : DIAPOS_LISTAS ? `<div class="empty">Subí un PowerPoint, un PDF de Canva o Google Slides, fotos o videos, o pegá un link de YouTube.<br>Se ven en la tele con sus animaciones, transiciones y videos.<button class="btn sm" type="button" data-dpsubir>+ Subir la primera</button></div>` : '<div class="empty">Cargando…</div>'}</div>`;
}
function bindDiapos() {
  $$(".dp-portada[data-vivo]").forEach(async b => {
    const m = DIAPOS.find(x => x.id === b.dataset.vivo); if (!m) return;
    try { const sc = await escenaDe(m); await bajarDiapo(sc, 0); if (!b.isConnected) return; const c = document.createElement("div"); c.className = "dp-mini"; b.prepend(c); miniatura(c, sc, sc.slides[0]); } catch { }
  });
}
function hojaMenuDiapos(id) {
  const m = DIAPOS.find(x => x.id === id); if (!m) return;
  abrirHoja(m.nombre, `<div class="list dp-menu">
    <button type="button" class="row-item" data-dpop="inicio"><span><b>▶ Presentar desde el inicio</b><small>Abre el presentador con tus notas</small></span></button>
    <button type="button" class="row-item" data-dpop="preparar"><span><b>Preparar en la tele</b><small>La tele baja todo antes, para que no haya esperas</small></span></button>
    <button type="button" class="row-item" data-dpop="bucle"><span><b>Pasar sola en bucle</b><small>Para anuncios antes del culto: cambia sola cada pocos segundos</small></span></button>
    <button type="button" class="row-item" data-dpop="culto"><span><b>Agregar al orden del culto</b><small>Queda en la lista junto a los cantos y lecturas</small></span></button>
    <button type="button" class="row-item" data-dpop="editar"><span><b>Ver, ordenar y escribir notas</b><small>Quitá diapositivas, cambialas de orden o escribí lo que vas a decir</small></span></button>
    <button type="button" class="row-item" data-dpop="agregar"><span><b>Agregar más diapositivas</b><small>Sumale fotos, un video, un PDF u otro PowerPoint</small></span></button>
    <button type="button" class="row-item" data-dpop="nombre"><span><b>Cambiar nombre</b></span></button>
    <button type="button" class="row-item" data-dpop="temporal"><span><b>${m.temporal ? "Guardar en la biblioteca" : "Usar y borrar"}</b><small>${m.temporal ? "Para que no se borre sola" : "Que se borre sola 2 días después de usarla"}</small></span></button>
    <button type="button" class="row-item" data-dpop="borrar" style="border-color:var(--bad)"><span><b style="color:var(--bad)">Borrar</b><small>Libera ${tam(m.tam || 0)}</small></span></button></div><div id="dpMenuBox"></div>`, s => {
    s.addEventListener("click", async e => {
      const b = e.target.closest("[data-dpop]"); if (!b) return; const op = b.dataset.dpop;
      if (op === "inicio") { cerrarHoja(); presentar(id); }
      else if (op === "preparar") { enviar({ prep: { id, pv: m.pv || 1, ts: Date.now() } }); cerrarHoja(); toast("La tele está bajando las diapositivas. En la tele sale cuando estén listas."); }
      else if (op === "bucle") {
        $("#dpMenuBox", s).innerHTML = `<div class="field"><span>Cambiar cada…</span><div class="chips">${[5, 8, 10, 15, 20, 30].map(x => `<button type="button" data-dpcada="${x}">${x} seg</button>`).join("")}</div></div>`;
        $("#dpMenuBox", s).scrollIntoView({ block: "nearest" });
      }
      else if (op === "culto") { CULTO.items = [...CULTO.items, { t: "pres", id }]; await guardarCulto(); cerrarHoja(); toast("Agregada al orden del culto."); }
      else if (op === "editar") hojaEditarDiapos(id);
      else if (op === "agregar") hojaSubir(id);
      else if (op === "nombre") {
        $("#dpMenuBox", s).innerHTML = `<form class="form" id="dpRen"><label>Nombre<input id="dpRenI" maxlength="80" value="${esc(m.nombre)}"></label><button class="btn" type="submit">Guardar</button></form>`;
        const i = $("#dpRenI", s); i.focus(); i.select();
        $("#dpRen", s).onsubmit = async ev => { ev.preventDefault(); const v = i.value.trim(); if (!v) return; try { await updateDoc(doc(db, "proyector_diapos", id), { nombre: v }); cerrarHoja(); toast("Nombre cambiado."); } catch (er) { toast("No se pudo: " + (er.code || er.message)); } };
      }
      else if (op === "temporal") { try { await updateDoc(doc(db, "proyector_diapos", id), { temporal: !m.temporal, usado: Date.now() }); cerrarHoja(); toast(m.temporal ? "Guardada en la biblioteca." : "Se borra sola 2 días después de usarla."); } catch (er) { toast("No se pudo: " + (er.code || er.message)); } }
      else if (op === "borrar") {
        $("#dpMenuBox", s).innerHTML = `<div class="confirm"><b>¿Borrar «${esc(m.nombre)}»?</b><span style="font-size:14px">Se borra de la biblioteca y del orden del culto. No se puede deshacer.</span><div style="display:flex;gap:8px"><button class="btn danger sm" type="button" id="dpB2">Sí, borrar</button><button class="btn ghost sm" type="button" id="dpB0">Cancelar</button></div></div>`;
        $("#dpMenuBox", s).scrollIntoView({ block: "nearest" });
        $("#dpB0", s).onclick = () => $("#dpMenuBox", s).innerHTML = "";
        $("#dpB2", s).onclick = async () => { try { $("#dpB2", s).disabled = true; await borrarPres(m); cerrarHoja(); } catch (er) { toast("No se pudo borrar: " + (er.code || er.message)); } };
      }
    });
    s.addEventListener("click", e => { const b = e.target.closest("[data-dpcada]"); if (!b) return; cerrarHoja(); presentar(id, { bucle: +b.dataset.dpcada * 1000 }); });
  });
}

/* editar: ordenar, quitar diapositivas y escribir notas */
async function hojaEditarDiapos(id) {
  const m = DIAPOS.find(x => x.id === id); if (!m) return;
  abrirHoja("Ordenar y notas", '<p class="muted">Cargando diapositivas…</p>');
  let sc; try { sc = await escenaDe(m); } catch (er) { toast("No se pudo abrir: " + er.message); return cerrarHoja(); }
  let orden = sc.slides.map((_, i) => i); const notas = [...(m.notas || [])]; const quitadas = new Set(); let cambio = false;
  const pintarLista = s => {
    $("#dpEd", s).innerHTML = orden.map((i, k) => `<div class="dp-ed ${quitadas.has(i) ? "fuera" : ""}" data-edi="${i}"><div class="dp-ed-mini" data-edmini="${i}"><span class="dp-n">${k + 1}</span></div>
      <div class="dp-ed-der"><div class="dp-ed-bar"><b>${esc(corta((m.titulos || [])[i] || "Diapositiva " + (i + 1), 40))}</b><span><button type="button" class="iconbtn" data-edmov="${k},-1" ${k === 0 ? "disabled" : ""} aria-label="Subir">${IC.arriba}</button><button type="button" class="iconbtn" data-edmov="${k},1" ${k === orden.length - 1 ? "disabled" : ""} aria-label="Bajar">${IC.abajo}</button><button type="button" class="iconbtn" data-edq="${i}" aria-label="${quitadas.has(i) ? "Volver a poner" : "Quitar"}">${quitadas.has(i) ? "↺" : IC.x}</button></span></div>
      <textarea data-ednota="${i}" rows="2" placeholder="Notas para vos (no salen en la tele)">${esc(notas[i] || "")}</textarea></div></div>`).join("");
    const obs = new IntersectionObserver(ents => ents.forEach(async en => {
      if (!en.isIntersecting) return; obs.unobserve(en.target); const i = +en.target.dataset.edmini;
      await bajarDiapo(sc, i); const c = document.createElement("div"); c.className = "dp-mini"; en.target.prepend(c); miniatura(c, sc, sc.slides[i]);
    }), { root: s });
    $$("[data-edmini]", s).forEach(x => obs.observe(x));
  };
  abrirHoja("Ordenar y notas", `<p class="muted" style="font-size:13.5px">${m.n} diapositivas. Cambiá el orden con las flechas, quitá las que no vas a usar y escribí tus notas.</p><div id="dpEd" class="dp-edlist"></div>
    <div class="dp-ed-guardar"><button class="btn wide" type="button" id="dpEdOk">Guardar cambios</button></div>`, s => {
    pintarLista(s);
    s.addEventListener("input", e => { const t = e.target.closest("[data-ednota]"); if (t) { notas[+t.dataset.ednota] = t.value; cambio = true; } });
    s.addEventListener("click", e => {
      const mv = e.target.closest("[data-edmov]"), q = e.target.closest("[data-edq]");
      if (mv) { const [k, d] = mv.dataset.edmov.split(",").map(Number); const j = k + d; [orden[k], orden[j]] = [orden[j], orden[k]]; cambio = true; pintarLista(s); }
      if (q) { const i = +q.dataset.edq; if (quitadas.has(i)) quitadas.delete(i); else { if (orden.length - quitadas.size <= 1) return toast("Tiene que quedar al menos una."); quitadas.add(i); } cambio = true; pintarLista(s); }
    });
    $("#dpEdOk", s).onclick = async () => {
      if (!cambio) return cerrarHoja();
      const b = $("#dpEdOk", s); b.disabled = true; b.textContent = "Guardando…";
      try {
        const final = orden.filter(i => !quitadas.has(i));
        const reordenado = final.some((i, k) => i !== k) || final.length !== sc.slides.length;
        const upd = { notas: final.map(i => notas[i] || ""), titulos: final.map(i => (m.titulos || [])[i] || "") };
        if (reordenado) {
          const sc2 = Object.assign({}, sc, { slides: final.map(i => sc.slides[i]) });
          const usados = new Set(archivosEscena(sc2));
          const sobran = (m.assets || []).filter(a => !usados.has(a.id));
          const partes = await guardarEscena(id, sc2); const pv = (m.pv || 1) + 1; recordarEscena(id, pv, sc2);
          Object.assign(upd, { n: sc2.slides.length, pv, partes, partesMax: Math.max(partes, m.partesMax || m.partes || 1), assets: (m.assets || []).filter(a => usados.has(a.id)), tam: Math.max(0, (m.tam || 0) - sobran.reduce((x, a) => x + (a.size || 0), 0)) });
          if (sobran.length) { await borrarDocs(sobran.flatMap(docsDeArchivo)); sobran.forEach(a => borrarArchivoLocal(a.id)); }
          if (PRES && PRES.id === id) { PRES = null; if (CTX && CTX.tipo === "pres" && CTX.id === id) { CTX = null; actualizarLive(); } }
        }
        await updateDoc(doc(db, "proyector_diapos", id), upd);
        cerrarHoja(); toast("Cambios guardados.");
      } catch (er) { toast("No se pudo guardar: " + (er.code || er.message)); b.disabled = false; b.textContent = "Guardar cambios"; }
    };
  });
}

/* presentar */
async function presentar(id, op = {}) {
  const m = DIAPOS.find(x => x.id === id); if (!m) return toast("Esa presentación ya no existe.");
  let sc; try { sc = await escenaDe(m); } catch (er) { return toast("No se pudo abrir: " + (er.message || er)); }
  PRES = { id, pv: m.pv || 1, sc, meta: m };
  const n = sc.slides.length;
  let i = op.i != null ? op.i : 0, ps = op.paso || 0;
  if (op.alFinal) { i = n - 1; ps = sc.slides[i].pasos || 0; }
  i = Math.max(0, Math.min(n - 1, i));
  CTX = { tipo: "pres", id, i, paso: ps, culto: op.culto != null ? op.culto : null };
  if (op.bucle) { CTX.bucle = op.bucle; }
  if (!m.usado || Date.now() - m.usado > 3600e3) updateDoc(doc(db, "proyector_diapos", id), { usado: Date.now() }).catch(() => { });
  irA(i, ps, true);
  if (op.abrir !== false) abrirPresentador();
}
function irA(i, ps, nuevo) {
  if (!PRES || !CTX || CTX.tipo !== "pres") return;
  const sc = PRES.sc, sl = sc.slides[i]; if (!sl) return;
  const otraDiapo = nuevo || CTX.i !== i;
  CTX = Object.assign({}, CTX, { i, paso: ps });
  const auto = CTX.bucle ? { cada: CTX.bucle, desde: Date.now(), i0: i } : null;
  enviar({ modo: "pres", pres: PRES.id, pv: PRES.pv, i, paso: ps, vid: null, auto, texto: "", ref: "", titulo: "", img: null, negro: false, oculto: false });
  POS[PRES.id] = { i, paso: ps, t: Date.now() }; store.set("pr-pos", POS);
  // video: el cel calcula por dónde va (la tele no le puede contestar)
  const medios = mediosDe(sl), arranca = medios.find(x => x.auto === ps);
  if (otraDiapo) { const m0 = medios[0] || null; Object.assign(VID, { el: m0 ? m0.id : null, dur: m0 ? (m0.dur || duracionDe(m0)) : 0, mudo: false, sonando: false, base: m0 && m0.ini ? m0.ini : 0, desde: Date.now() }); }
  if (arranca) Object.assign(VID, { el: arranca.id, dur: arranca.dur || duracionDe(arranca), sonando: true, base: arranca.ini || 0, desde: Date.now() });
  // pasar sola, como venía en PowerPoint
  clearTimeout(T_AUTO);
  if (sl.avanzar && ps >= (sl.pasos || 0) && !CTX.bucle) { const yo = CTX; T_AUTO = setTimeout(() => { if (CTX === yo) paso(1); }, sl.avanzar + ((sl.trans && sl.trans.t) || 0)); }
  bajarDiapo(sc, Math.min(sc.slides.length - 1, i + 1));
  refrescarPresentador();
}
function duracionDe(el) { const a = PRES && (PRES.meta.assets || []).find(x => x.id === el.src); return a && a.dur ? a.dur : 0; }
function pasoPres(d) {
  if (!PRES || PRES.id !== CTX.id) { const m = DIAPOS.find(x => x.id === CTX.id); if (!m) return; return presentar(CTX.id, { i: CTX.i, paso: CTX.paso, culto: CTX.culto, abrir: false }).then(() => pasoPres(d)); }
  const sc = PRES.sc, n = sc.slides.length; let { i, paso: ps } = CTX;
  if (CTX.bucle) { CTX = Object.assign({}, CTX, { bucle: null }); }
  if (d > 0) {
    if (ps < (sc.slides[i].pasos || 0)) ps++;
    else if (i < n - 1) { i++; ps = 0; }
    else if (CTX.culto != null && CTX.culto + 1 < slidesCulto().length) { cerrarPresentador(); return proyectarSlide(CTX.culto + 1); }
    else return toast("Es la última diapositiva.");
  } else {
    if (ps > 0) ps--;
    else if (i > 0) { i--; ps = sc.slides[i].pasos || 0; }
    else if (CTX.culto != null && CTX.culto > 0) { cerrarPresentador(); return proyectarSlide(CTX.culto - 1, true); }
    else return;
  }
  irA(i, ps);
}
let VSEQ = 0;
function videoEst() { return VID.sonando ? VID.base + (Date.now() - VID.desde) / 1000 : VID.base; }
function cmdVideo(cmd, t) {
  if (!VID.el) return;
  if (t != null) t = Math.max(0, VID.dur ? Math.min(VID.dur - .2, t) : t);
  VID.base = t != null ? t : videoEst(); VID.desde = Date.now(); VID.sonando = cmd === "play";
  VSEQ = Math.max(Date.now(), VSEQ + 1);
  enviar({ vid: { seq: VSEQ, el: VID.el, cmd, t: t != null ? t : VID.base, mudo: VID.mudo } });
  refrescarPresentador();
}

/* la pantalla del presentador */
function abrirPresentador() {
  if (!PRES) return;
  if ($("#presentador")) return refrescarPresentador();
  const ov = document.createElement("div"); ov.id = "presentador";
  ov.innerHTML = `<div class="pz-top"><button type="button" class="iconbtn" data-pz="cerrar" aria-label="Volver al menú">${IC.prev}</button><div class="pz-tit"><b id="pzNom"></b><small id="pzNum"></small></div>
      <button type="button" class="pz-reloj" data-pz="crono" title="Tocá para empezar de cero"><span class="lbl">Prédica</span><b id="pzCrono">0:00</b></button><div class="pz-reloj"><span class="lbl">Hora</span><b id="pzHora"></b></div></div>
    <div class="pz-cuerpo">
      <div class="pz-izq">
        <div class="pz-actual" id="pzActual"></div>
        <div class="pz-vid" id="pzVid" hidden><div class="pz-vbar"><i id="pzVbar"></i></div><div class="pz-vctl"><button type="button" data-pz="v0" aria-label="Desde el inicio">${IC.vInicio}</button><button type="button" data-pz="v-10" aria-label="Atrás 10 segundos">−10s</button><button type="button" data-pz="vplay" id="pzVplay" class="pz-vplay" aria-label="Reproducir">${IC.vPlay}</button><button type="button" data-pz="v+10" aria-label="Adelante 10 segundos">+10s</button><button type="button" data-pz="vmudo" id="pzVmudo" aria-label="Silenciar">${IC.vSonido}</button></div><small class="muted" id="pzVt"></small></div>
        <div class="pz-sig"><div class="pz-sigmini" id="pzSig"></div><div class="pz-siginfo"><span class="lbl" id="pzSigL">Sigue</span><b id="pzSigT"></b></div></div>
      </div>
      <div class="pz-der">
        <div class="pz-notas"><div class="pz-nh"><span class="lbl">Notas</span><span><button type="button" data-pz="menos" aria-label="Letra más chica">A−</button><button type="button" data-pz="mas" aria-label="Letra más grande">A+</button><button type="button" data-pz="nota">Escribir</button></span></div><div class="pz-nt" id="pzNotas"></div></div>
        <div class="pz-tira" id="pzTira"></div>
      </div>
    </div>
    <div class="pz-ctl"><button type="button" data-pz="prev" class="pz-g">${IC.prev}Atrás</button><button type="button" data-pz="negro" id="pzNegro">${IC.negro}Negro</button><button type="button" data-pz="ocultar" id="pzOcultar">${IC.ocultar}Ocultar</button><button type="button" data-pz="next" class="pz-g pz-sigue">Sigue${IC.next}</button></div>`;
  document.body.appendChild(ov);
  PZ = { esc: crearEscena($("#pzActual", ov)), crono: Date.now(), letra: store.get("pr-pzletra", 19), tira: null, tic: null };
  pintar(PZ.esc, LIVE, fondoImgActual()); pintarPres(PZ.esc, LIVE, { mini: true });
  try { navigator.wakeLock && navigator.wakeLock.request("screen").then(l => PZ && (PZ.lock = l)).catch(() => { }); } catch { }
  PZ.tic = setInterval(relojes, 500); relojes();
  // deslizar sobre la diapositiva
  let x0 = null, y0 = null;
  const act = $("#pzActual", ov);
  act.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  act.addEventListener("touchend", e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) paso(dx < 0 ? 1 : -1); x0 = null; }, { passive: true });
  ov.addEventListener("click", e => {
    const b = e.target.closest("[data-pz]"); if (!b) { const t = e.target.closest("[data-pzir]"); if (t) { const i = +t.dataset.pzir; CTX = Object.assign({}, CTX, { bucle: null }); irA(i, 0); } return; }
    const a = b.dataset.pz;
    if (a === "cerrar") cerrarPresentador();
    else if (a === "prev") paso(-1); else if (a === "next") paso(1);
    else if (a === "negro") enviar({ negro: !LIVE.negro }); else if (a === "ocultar") enviar({ oculto: !LIVE.oculto });
    else if (a === "crono") { PZ.crono = Date.now(); relojes(); toast("Cronómetro en cero."); }
    else if (a === "menos" || a === "mas") { PZ.letra = Math.max(13, Math.min(34, PZ.letra + (a === "mas" ? 2 : -2))); store.set("pr-pzletra", PZ.letra); $("#pzNotas").style.fontSize = PZ.letra + "px"; }
    else if (a === "nota") hojaNota();
    else if (a === "vplay") cmdVideo(VID.sonando ? "pause" : "play", VID.sonando ? null : (VID.dur && videoEst() >= VID.dur - .5 ? 0 : videoEst()));
    else if (a === "v0") cmdVideo("play", 0);
    else if (a === "v-10") cmdVideo(VID.sonando ? "play" : "pause", videoEst() - 10);
    else if (a === "v+10") cmdVideo(VID.sonando ? "play" : "pause", videoEst() + 10);
    else if (a === "vmudo") { VID.mudo = !VID.mudo; cmdVideo(VID.sonando ? "play" : "pause", null); }
  });
  PZ.resize = () => { if (PZ) { reencajarPres(PZ.esc); refrescarPresentador(true); } }; addEventListener("resize", PZ.resize);
  armarTira();
  refrescarPresentador();
}
function cerrarPresentador() {
  const ov = $("#presentador"); if (!ov) return;
  clearInterval(PZ && PZ.tic); removeEventListener("resize", PZ && PZ.resize);
  try { PZ && PZ.lock && PZ.lock.release(); } catch { }
  if (PZ && PZ.tira) PZ.tira.disconnect();
  ov.remove(); PZ = null;
  if (TAB === "diapos") renderMain();
}
function relojes() {
  if (!PZ) return;
  const s = Math.floor((Date.now() - PZ.crono) / 1000), h = Math.floor(s / 3600), mi = Math.floor(s / 60) % 60;
  const c = $("#pzCrono"); if (c) c.textContent = (h ? h + ":" + String(mi).padStart(2, "0") : mi) + ":" + String(s % 60).padStart(2, "0");
  const hr = $("#pzHora"); if (hr) hr.textContent = new Date().toLocaleTimeString("es", { hour: "numeric", minute: "2-digit" });
  if (VID.el && !$("#pzVid").hidden) {
    const t = Math.max(0, videoEst()); const fmt = x => Math.floor(x / 60) + ":" + String(Math.floor(x % 60)).padStart(2, "0");
    if (VID.dur && t >= VID.dur && VID.sonando) { VID.sonando = false; VID.base = VID.dur; }
    $("#pzVbar").style.width = VID.dur ? Math.min(100, t / VID.dur * 100) + "%" : "0";
    $("#pzVt").textContent = VID.dur ? `${fmt(Math.min(t, VID.dur))} de ${fmt(VID.dur)} · aproximado` : (VID.sonando ? "Reproduciendo" : "En pausa");
    const bp = $("#pzVplay"), quiere = VID.sonando ? "pausa" : "play"; if (bp.dataset.ic !== quiere) { bp.dataset.ic = quiere; bp.innerHTML = VID.sonando ? IC.vPausa : IC.vPlay; bp.setAttribute("aria-label", VID.sonando ? "Pausa" : "Reproducir"); }
  }
}
function armarTira() {
  const tira = $("#pzTira"); if (!tira || !PRES) return;
  tira.innerHTML = PRES.sc.slides.map((_, i) => `<button type="button" class="pz-th" data-pzir="${i}" aria-label="Ir a la diapositiva ${i + 1}"><span class="dp-n">${i + 1}</span></button>`).join("");
  if (PZ.tira) PZ.tira.disconnect();
  PZ.tira = new IntersectionObserver(ents => ents.forEach(async en => {
    if (!en.isIntersecting || !PRES) return; PZ.tira.unobserve(en.target); const i = +en.target.dataset.pzir;
    await bajarDiapo(PRES.sc, i); const c = document.createElement("div"); c.className = "dp-mini"; en.target.prepend(c); miniatura(c, PRES.sc, PRES.sc.slides[i]);
  }), { root: tira, rootMargin: "0px 200px" });
  $$(".pz-th", tira).forEach(x => PZ.tira.observe(x));
}
async function refrescarPresentador(soloTam) {
  const ov = $("#presentador"); if (!ov || !PRES || !CTX || CTX.tipo !== "pres") return;
  const sc = PRES.sc, n = sc.slides.length, { i, paso: ps } = CTX, sl = sc.slides[i];
  const m = DIAPOS.find(x => x.id === PRES.id) || PRES.meta;
  $("#pzNom").textContent = m.nombre || "Diapositivas";
  $("#pzNum").textContent = `Diapositiva ${i + 1} de ${n}` + (sl.pasos ? ` · animación ${ps} de ${sl.pasos}` : "") + (CTX.bucle ? ` · pasa sola cada ${CTX.bucle / 1000} s` : "");
  const nt = $("#pzNotas"); const nota = (m.notas || [])[i] || "";
  nt.style.fontSize = PZ.letra + "px";
  nt.innerHTML = nota ? esc(nota).replace(/\n/g, "<br>") : `<span class="muted" style="font-size:15px">Sin notas para esta diapositiva. Tocá <b>Escribir</b> para agregar.</span>`;
  $("#pzNegro").classList.toggle("on", !!LIVE.negro); $("#pzOcultar").classList.toggle("on", !!LIVE.oculto);
  // siguiente
  let si = i, sp = ps + 1, et = "";
  if (ps >= (sl.pasos || 0)) { si = i + 1; sp = null; }
  const sig = $("#pzSig");
  if (si < n) {
    $("#pzSigL").textContent = sp != null ? "Sigue: animación " + sp + " de " + sl.pasos : "Sigue: diapositiva " + (si + 1);
    et = (m.titulos || [])[si] || "";
    const clave = si + "|" + sp;
    if (sig._clave !== clave || soloTam) { sig._clave = clave; await bajarDiapo(sc, si); if (sig._clave !== clave) return; sig.innerHTML = ""; miniatura(sig, sc, sc.slides[si], sp != null ? sp : undefined); }
  } else { sig._clave = null; sig.innerHTML = `<div class="pz-fin">${CTX.culto != null && CTX.culto + 1 < slidesCulto().length ? "Sigue el culto" : "Fin"}</div>`; $("#pzSigL").textContent = CTX.culto != null ? "Después" : "Última diapositiva"; }
  $("#pzSigT").textContent = et;
  // tira
  $$(".pz-th", ov).forEach(b => b.classList.toggle("on", +b.dataset.pzir === i));
  const on = $(".pz-th.on", ov); if (on && !soloTam) on.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  // video
  const hayVid = !!VID.el; $("#pzVid").hidden = !hayVid;
  if (hayVid) { $("#pzVmudo").innerHTML = VID.mudo ? IC.vMudo : IC.vSonido; relojes(); }
}
function hojaNota() {
  if (!PRES || !CTX) return; const id = PRES.id, i = CTX.i; const m = DIAPOS.find(x => x.id === id); if (!m) return;
  abrirHoja(`Notas · diapositiva ${i + 1}`, `<form class="form" id="ntF"><textarea id="ntT" style="min-height:220px" placeholder="Lo que querés decir en esta diapositiva">${esc((m.notas || [])[i] || "")}</textarea><button class="btn wide" type="submit">Guardar nota</button></form>`, s => {
    const t = $("#ntT", s); t.focus();
    $("#ntF", s).onsubmit = async e => { e.preventDefault(); const notas = [...(m.notas || [])]; while (notas.length < (m.n || 0)) notas.push(""); notas[i] = t.value.trim(); try { await updateDoc(doc(db, "proyector_diapos", id), { notas }); m.notas = notas; cerrarHoja(); refrescarPresentador(); toast("Nota guardada."); } catch (er) { toast("No se pudo guardar: " + (er.code || er.message)); } };
  });
}

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
  $("#prev").onclick = () => { $("#live").classList.toggle("grande"); setTimeout(() => { escena.key = null; escena.fondoKey = null; pintar(escena, Object.assign({}, LIVE, { estilo: Object.assign({}, LIVE.estilo, { trans: "ninguna" }) }), fondoImgActual()); reencajarPres(escena); }, 30) };
  $("#bPrev").onclick = () => paso(-1); $("#bNext").onclick = () => paso(1);
  $("#bOcultar").onclick = () => enviar({ oculto: !LIVE.oculto });
  $("#bNegro").onclick = () => enviar({ negro: !LIVE.negro });
  $("#visorBtn").onclick = hojaVisor;
  $("#tabs").hidden = false;
  pintarVistas(); actualizarLive();
}
function actualizarLive() {
  const t = $("#nowT"), s = $("#nowS"); if (!t) return;
  if (LIVE.modo === "texto") { t.textContent = LIVE.ref || LIVE.titulo || "Texto"; s.textContent = (LIVE.texto || "").replace(/\n/g, " "); }
  else if (LIVE.modo === "img") { t.textContent = "Imagen"; s.textContent = "Anuncio con imagen"; }
  else if (LIVE.modo === "pres") { const m = DIAPOS.find(x => x.id === LIVE.pres); t.textContent = `${m ? m.nombre : "Diapositivas"} · ${(LIVE.i || 0) + 1}/${m ? m.n : "?"}`; s.textContent = LIVE.auto ? `Pasa sola cada ${LIVE.auto.cada / 1000} segundos` : (m && (m.titulos || [])[LIVE.i || 0]) || `Diapositiva ${(LIVE.i || 0) + 1}`; }
  else if (LIVE.modo === "cuenta") { const f = new Date(LIVE.fin || 0); t.textContent = "Cuenta regresiva"; s.textContent = `${LIVE.titulo || ""} · termina ${f.toLocaleTimeString("es", { hour: "numeric", minute: "2-digit" })}`; }
  else { t.textContent = "Sólo el fondo"; s.textContent = "Escogé un versículo, canción o anuncio"; }
  if (LIVE.negro) s.textContent = "Pantalla en negro";
  else if (LIVE.oculto) s.textContent = "Texto oculto · se ve sólo el fondo";
  $("#bNegro").classList.toggle("on", !!LIVE.negro); $("#bOcultar").classList.toggle("on", !!LIVE.oculto);
  $("#bPrev").disabled = $("#bNext").disabled = !CTX;
  if (PZ && (!CTX || CTX.tipo !== "pres")) cerrarPresentador();
  else if (PZ) refrescarPresentador();
}
function paso(d) {
  if (!CTX) return;
  if (CTX.tipo === "pres") return pasoPres(d);
  if (CTX.tipo === "biblia") pasoBiblia(d);
  else if (CTX.tipo === "cancion") { const i = CTX.i + d; if (i >= 0 && i < CTX.n) proyectarEstrofa(CTX.id, i); }
  else if (CTX.tipo === "culto") { proyectarSlide(CTX.i + d, d < 0); return; }
  else if (CTX.tipo === "pasaje") {
    const i = CTX.i + d;
    if (i >= 0 && i < CTX.n) return proyectarPasaje(CTX.id, i);
    // al terminar un pasaje, sigue con el próximo de la lista
    const k = PASAJES.findIndex(x => x.id === CTX.id) + (d > 0 ? 1 : -1);
    const sig = PASAJES[k]; if (!sig) return;
    const L = laminasDe(sig); B.pasaje = sig.id; if (TAB === "biblia" && B.vista === "pasajes") renderMain();
    proyectarPasaje(sig.id, d > 0 ? 0 : L.length - 1);
  }
}
function hojaVisor() {
  const url = new URL("visor.html", location.href).href;
  abrirHoja("Conectar la tele", `<div class="link" style="gap:10px"><b style="font-size:16px">Duplicar la pantalla del cel</b><p class="muted" style="font-size:14px">Conectá el cel a la tele con Screen Share, Smart View o "Transmitir pantalla". Después abrí el Modo tele: tu cel muestra sólo lo que estás proyectando.</p><button class="btn" type="button" id="abrirTele">Abrir Modo tele</button></div>
    <span class="lbl" style="margin-top:4px">O con el navegador de la tele</span>
    <p>En la tele, el proyector o la laptop, abrí este link en el navegador. Lo que mandés desde aquí aparece allá al instante.</p>
    <div class="link"><code id="vurl">${esc(url)}</code><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm" type="button" id="copiar">Copiar link</button><a class="btn ghost sm" href="${esc(url)}" target="_blank" rel="noopener" style="text-decoration:none">Abrir aquí</a></div></div>
    <ol style="margin:0;padding-left:20px;display:grid;gap:6px;color:var(--muted);font-size:14.5px"><li>En la tele, tocá o hacé clic una vez para ponerla en pantalla completa.</li><li>La tele no necesita tu cuenta: sólo lee lo que mandás.</li><li>Si la tele tiene teclado, la tecla F también la pone completa.</li></ol>`, s => {
    $("#abrirTele", s).onclick = () => { cerrarHoja(); modoTele(); };
    $("#copiar", s).onclick = async () => { try { await navigator.clipboard.writeText(url); toast("Link copiado.") } catch { const r = document.createRange(); r.selectNodeContents($("#vurl", s)); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); toast("Mantené presionado para copiar.") } };
  });
}

/* ---------- Modo tele (duplicar pantalla) ---------- */
let TELE = null;
function modoTele() {
  if ($("#modotele")) return;
  const ov = document.createElement("div"); ov.id = "modotele";
  ov.innerHTML = `<div class="mt-esc"></div>
    <div class="mt-ayuda">Tocá a la derecha para seguir · a la izquierda para regresar · en medio para opciones</div>
    <div class="mt-bar" hidden><button type="button" data-mt="prev">${IC.prev}Atrás</button><button type="button" data-mt="negro">${IC.negro}Negro</button><button type="button" data-mt="ocultar">${IC.ocultar}Ocultar</button><button type="button" data-mt="next">${IC.next}Sigue</button><button type="button" data-mt="salir" class="mt-salir">${IC.x}Salir</button></div>`;
  document.body.appendChild(ov);
  TELE = crearEscena(ov.querySelector(".mt-esc"));
  const repintar = () => { if (!TELE) return; TELE.key = null; TELE.fondoKey = null; pintar(TELE, Object.assign({}, LIVE, { estilo: Object.assign({}, LIVE.estilo, { trans: "ninguna" }) }), fondoImgActual()); pintarPres(TELE, LIVE); reencajarPres(TELE); };
  requestAnimationFrame(repintar);
  try { const p = ov.requestFullscreen && ov.requestFullscreen({ navigationUI: "hide" }); if (p && p.then) p.then(() => { try { screen.orientation.lock("landscape").catch(() => { }) } catch { } setTimeout(repintar, 300) }).catch(() => { }); } catch { }
  try { navigator.wakeLock && navigator.wakeLock.request("screen").then(l => ov._lock = l).catch(() => { }); } catch { }
  setTimeout(() => ov.querySelector(".mt-ayuda")?.classList.add("off"), 3500);
  const bar = ov.querySelector(".mt-bar"); let tb;
  const mostrarBar = () => { bar.hidden = false; clearTimeout(tb); tb = setTimeout(() => bar.hidden = true, 4000); };
  let x0 = null, y0 = null, swiped = false;
  ov.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; swiped = false; }, { passive: true });
  ov.addEventListener("touchend", e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) { swiped = true; paso(dx < 0 ? 1 : -1); } x0 = null; }, { passive: true });
  ov.addEventListener("click", e => {
    const b = e.target.closest("[data-mt]");
    if (b) { const a = b.dataset.mt; if (a === "prev") paso(-1); else if (a === "next") paso(1); else if (a === "negro") enviar({ negro: !LIVE.negro }); else if (a === "ocultar") enviar({ oculto: !LIVE.oculto }); else if (a === "salir") salirTele(); if (a !== "salir") mostrarBar(); return; }
    if (swiped) { swiped = false; return; }
    const w = innerWidth, x = e.clientX;
    if (x > w * .68) paso(1); else if (x < w * .32) paso(-1); else mostrarBar();
  });
  ov._resize = () => setTimeout(repintar, 120); addEventListener("resize", ov._resize);
  ov._fs = () => { if (!document.fullscreenElement) salirTele(); }; document.addEventListener("fullscreenchange", ov._fs);
}
function salirTele() {
  const ov = $("#modotele"); if (!ov) return;
  document.removeEventListener("fullscreenchange", ov._fs); removeEventListener("resize", ov._resize);
  try { ov._lock && ov._lock.release(); } catch { }
  try { screen.orientation.unlock(); } catch { }
  try { if (document.fullscreenElement) document.exitFullscreen().catch(() => { }); } catch { }
  ov.remove(); TELE = null;
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
  const T = [["culto", "Culto"], ["biblia", "Biblia"], ["canciones", "Cantos"], ["diapos", "Diapos"], ["anuncios", "Anuncios"], ["fondos", "Fondos"], ["estilo", "Estilo"]];
  const ic = { culto: IC.culto, biblia: IC.biblia, canciones: IC.cancion, diapos: IC.diapos, anuncios: IC.anuncio, fondos: IC.fondo, estilo: IC.estilo };
  $("#tabs nav").innerHTML = T.map(t => `<button type="button" data-tab="${t[0]}" ${TAB === t[0] ? 'aria-current="page"' : ""}>${ic[t[0]]}${t[1]}</button>`).join("");
}
function renderMain() {
  const m = $("#main"); if (!m) return;
  m.innerHTML = TAB === "culto" ? vCulto() : TAB === "biblia" ? vBiblia() : TAB === "canciones" ? vCanciones() : TAB === "diapos" ? vDiapos() : TAB === "anuncios" ? vAnuncios() : TAB === "fondos" ? vFondos() : vEstilo();
  renderTabs(); bindMain(); if (TAB === "biblia") marcarVerso(); if (TAB === "diapos") bindDiapos();
}
function bindMain() {
  const ir = $("#irForm"); if (ir) ir.onsubmit = e => {
    e.preventDefault(); const p = parseCita($("#ir").value); const bib = BIB[B.ver];
    if (!p || !bib[p.libro] || p.cap < 1 || p.cap > bib[p.libro].length) return toast("No encontré esa cita. Probá así: Juan 3:16");
    B.libro = p.libro; B.cap = p.cap; B.vista = "vers"; renderMain();
    if (p.vers) asegurarCap(B.ver, p.libro, p.cap).then(cap => { if (cap && cap[p.vers - 1] != null) { if (esYV(B.ver)) renderMain(); proyectarVerso(B.ver, p.libro, p.cap, p.vers).then(() => marcarVerso(true)); } else toast("Ese capítulo no tiene el versículo " + p.vers + "."); }).catch(er => toast(er.message));
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
  if (g("[data-yvcfg]")) { hojaYouVersion(); return; }
  if ((x = g("[data-ver]"))) { B.ver = x.dataset.ver; store.set("pr-ver", B.ver); renderMain(); cargarVersion(B.ver).then(renderMain).catch(er => toast(er.message)); return; }
  if ((x = g("[data-bv]"))) { B.vista = x.dataset.bv; renderMain(); if (B.vista === "buscar") $("#bq")?.focus(); return; }
  if ((x = g("[data-libro]"))) { B.libro = +x.dataset.libro; B.vista = "caps"; renderMain(); scrollTo({ top: 0 }); return; }
  if ((x = g("[data-cap]"))) { B.cap = +x.dataset.cap; B.vista = "vers"; renderMain(); scrollTo({ top: 0 }); return; }
  if ((x = g("[data-capd]"))) { const bib = BIB[B.ver]; let l = B.libro, c = B.cap + +x.dataset.capd; if (c < 1) { if (l === 0) return; l--; c = bib[l].length } else if (c > bib[l].length) { if (l === 65) return; l++; c = 1 } B.libro = l; B.cap = c; renderMain(); scrollTo({ top: 0 }); return; }
  if (g("[data-cadd]")) { hojaAgregarCulto(); return; }
  if ((x = g("[data-slide]"))) { proyectarSlide(+x.dataset.slide); return; }
  if ((x = g("[data-cmov]"))) { const [k, d] = x.dataset.cmov.split(",").map(Number); const a = [...CULTO.items]; const j = k + d; if (j < 0 || j >= a.length) return; [a[k], a[j]] = [a[j], a[k]]; CULTO.items = a; if (CTX && CTX.tipo === "culto") CTX = null; guardarCulto(); renderMain(); actualizarLive(); return; }
  if ((x = g("[data-cdel]"))) { CULTO.items = CULTO.items.filter((_, i) => i !== +x.dataset.cdel); if (CTX && CTX.tipo === "culto") CTX = null; guardarCulto(); renderMain(); actualizarLive(); return; }
  if ((x = g("[data-cdmin]"))) { const t = ($("#cdTit")?.value || "").trim(); store.set("pr-cdtit", t); CTX = null; iniciarCuenta(+x.dataset.cdmin, t); toast(`Cuenta regresiva de ${x.dataset.cdmin === "60" ? "1 hora" : x.dataset.cdmin + " min"} en pantalla.`); return; }
  if (g("#cStart")) { proyectarSlide(0); return; }
  if (g("#cClear")) { $("#cClearBox").innerHTML = `<div class="confirm"><b>¿Borrar toda la lista del culto?</b><span style="font-size:14px">Los cantos, pasajes y anuncios no se borran; sólo la lista.</span><div style="display:flex;gap:8px"><button class="btn danger sm" type="button" id="cClear2">Sí, empezar de nuevo</button><button class="btn ghost sm" type="button" id="cClear0">Cancelar</button></div></div>`; return; }
  if (g("#cClear0")) { $("#cClearBox").innerHTML = ""; return; }
  if (g("#cClear2")) { CULTO.items = []; if (CTX && CTX.tipo === "culto") CTX = null; guardarCulto(); renderMain(); actualizarLive(); return; }
  if ((x = g("[data-study]"))) { const [l, c, v] = x.dataset.study.split(",").map(Number); estudiar(l, c, v); return; }
  if ((x = g("[data-fav]"))) { toggleFav(B.libro, B.cap, +x.dataset.fav); x.classList.toggle("on"); return; }
  if ((x = g("[data-unfav]"))) { const [l, c, v] = x.dataset.unfav.split(",").map(Number); toggleFav(l, c, v); renderMain(); return; }
  if (g("[data-pnew]")) { formPasaje(); return; }
  if ((x = g("[data-pedit]"))) { formPasaje(PASAJES.find(p => p.id === x.dataset.pedit)); return; }
  if ((x = g("[data-popen]"))) { B.pasaje = B.pasaje === x.dataset.popen ? null : x.dataset.popen; renderMain(); return; }
  if ((x = g("[data-pplay]"))) { B.pasaje = x.dataset.pplay; renderMain(); proyectarPasaje(x.dataset.pplay, 0); return; }
  if ((x = g("[data-plam]"))) { proyectarPasaje(x.dataset.pid, +x.dataset.plam); return; }
  if (g("#pClear")) { $("#pClearBox").innerHTML = `<div class="confirm"><b>¿Borrar los ${PASAJES.length} pasajes?</b><div style="display:flex;gap:8px"><button class="btn danger sm" type="button" id="pClear2">Sí, borrar todos</button><button class="btn ghost sm" type="button" id="pClear0">Cancelar</button></div></div>`; return; }
  if (g("#pClear0")) { $("#pClearBox").innerHTML = ""; return; }
  if (g("#pClear2")) { Promise.all(PASAJES.map(p => deleteDoc(doc(db, "proyector_pasajes", p.id)))).then(() => toast("Pasajes borrados.")).catch(er => toast("No se pudo borrar: " + (er.code || er.message))); return; }
  if ((x = g("[data-bf]"))) { B.filtro = x.dataset.bf; renderMain(); return; }
  if ((x = g("[data-go]"))) { const [l, c, v] = x.dataset.go.split(",").map(Number); proyectarVerso(B.ver, l, c, v); $$(".v[data-go]").forEach(el => el.classList.toggle("on", el === x)); return; }
  if ((x = g(".v[data-v]"))) { proyectarVerso(B.ver, B.libro, B.cap, +x.dataset.v); return; }
  // Diapositivas
  if (g("[data-dpsubir]")) { hojaSubir(); return; }
  if ((x = g("[data-dppres]"))) { const id = x.dataset.dppres; if (LIVE.modo === "pres" && LIVE.pres === id && CTX && CTX.tipo === "pres") { if (PRES && PRES.id === id) abrirPresentador(); else presentar(id, { i: CTX.i, paso: CTX.paso, culto: CTX.culto }); } else presentar(id); return; }
  if ((x = g("[data-dpseguir]"))) { const p = POS[x.dataset.dpseguir] || {}; presentar(x.dataset.dpseguir, { i: p.i || 0, paso: p.paso || 0 }); return; }
  if ((x = g("[data-dpmenu]"))) { hojaMenuDiapos(x.dataset.dpmenu); return; }
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
  if (e.key === "Escape") { if (TELE) return salirTele(); if ($("#sheet .scrim")) return cerrarHoja(); if (PZ) return cerrarPresentador(); return; }
  if ($("#sheet .scrim")) return;
  if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "PageDown") { e.preventDefault(); paso(1) }
  else if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp") { e.preventDefault(); paso(-1) }
  else if (e.key === "b" || e.key === "B" || e.key === ".") enviar({ negro: !LIVE.negro });
  else if (e.key === "Enter" && document.activeElement?.dataset) { document.activeElement.click(); }
});
let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { if (escena) { escena.key = null; pintar(escena, Object.assign({}, LIVE, { estilo: Object.assign({}, LIVE.estilo, { trans: "ninguna" }) }), fondoImgActual()); reencajarPres(escena); } }, 150) });

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
  try { const c = await getDoc(doc(db, "proyector_cfg", "youversion")); if (c.exists()) YV = Object.assign({ key: "", versiones: [] }, c.data()); } catch { }
  if (esYV(B.ver) && !todasVersiones().some(v => v.id === B.ver)) B.ver = "rv1909";
  cargarVersion(B.ver).then(() => { if (TAB === "biblia") renderMain() }).catch(er => toast(er.message));
  stopFns.push(onSnapshot(collection(db, "proyector_canciones"), s => { CANCIONES = s.docs.map(d => ({ id: d.id, ...d.data() })); if (TAB === "canciones") renderMain() }, er => toast("Canciones: " + (er.code || er.message))));
  stopFns.push(onSnapshot(doc(db, "proyector_cfg", "culto"), d => { CULTO = d.exists() ? Object.assign({ items: [] }, d.data()) : { items: [] }; if (TAB === "culto") renderMain(); }, er => toast("Culto: " + (er.code || er.message))));
  stopFns.push(onSnapshot(collection(db, "proyector_pasajes"), s => { PASAJES = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.creado || 0) - (b.creado || 0)); if (TAB === "biblia") renderMain() }, er => toast("Pasajes: " + (er.code || er.message))));
  stopFns.push(onSnapshot(collection(db, "proyector_anuncios"), s => { ANUNCIOS = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.creado || 0) - (a.creado || 0)); if (TAB === "anuncios") renderMain() }, er => toast("Anuncios: " + (er.code || er.message))));
  stopFns.push(onSnapshot(query(collection(db, "proyector"), where("tipo", "==", "fondo")), s => { FONDOS_IMG = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.creado || 0) - (b.creado || 0)); if (TAB === "fondos") renderMain(); pintar(escena, LIVE, fondoImgActual()) }, er => toast("Fondos: " + (er.code || er.message))));
  stopFns.push(onSnapshot(collection(db, "proyector_diapos"), s => {
    DIAPOS = s.docs.map(d => ({ id: d.id, ...d.data() }));
    const primera = !DIAPOS_LISTAS; DIAPOS_LISTAS = true;
    if (primera) {
      limpiarVencidas(); limpiarSubidaCortada();
      if (!CTX && LIVE.modo === "pres" && DIAPOS.some(m => m.id === LIVE.pres)) CTX = { tipo: "pres", id: LIVE.pres, i: LIVE.i || 0, paso: LIVE.paso || 0, culto: null };
    }
    if (PRES) { const m = DIAPOS.find(x => x.id === PRES.id); if (m) PRES.meta = m; }
    actualizarLive();
    if (TAB === "diapos" || TAB === "culto") renderMain();
  }, er => toast("Diapositivas: " + (er.code || er.message))));
  const salir = document.createElement("button"); salir.className = "iconbtn"; salir.type = "button"; salir.setAttribute("aria-label", "Cerrar sesión"); salir.innerHTML = IC.out; salir.onclick = () => signOut(auth);
  $("#visorBtn").after(salir);
});
