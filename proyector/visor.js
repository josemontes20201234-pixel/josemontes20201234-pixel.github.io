// Visor: lo que se ve en la tele o el proyector. No pide cuenta; sólo lee lo que manda el control.
import { firebaseConfig } from "../config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, onSnapshot, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { crearEscena, pintar, ESCENA_CSS } from "./shared.js";
import { configurarAlmacen, pintarPres, reencajarPres, cargarEscena, archivosEscena, archivo } from "./diapos.js";

document.getElementById("escena-css").textContent = ESCENA_CSS;
const esc = crearEscena(document.getElementById("pantalla"));
const aviso = document.getElementById("aviso"), inicio = document.getElementById("inicio");
let actual = null, fondos = {}, ultimoTs = 0;
const mostrarAviso = (txt, ms) => { aviso.textContent = txt; aviso.classList.remove("off"); clearTimeout(mostrarAviso.t); if (ms) mostrarAviso.t = setTimeout(() => aviso.classList.add("off"), ms); };
mostrarAviso("Tocá la pantalla para ponerla completa", 6000);

async function imagenFondo(st) {
  const f = st && st.fondo;
  if (!f || !f.img) return null;
  if (fondos[f.id] !== undefined) return fondos[f.id];
  try { const d = await getDoc(doc(db, "proyector", f.id)); fondos[f.id] = d.exists() ? d.data().img || null : null; }
  catch (e) { fondos[f.id] = null; }
  return fondos[f.id];
}
async function aplicar(st, origen) {
  if (!st || !st.ts) return;
  if (st.ts < ultimoTs) return;
  ultimoTs = st.ts; actual = st;
  inicio.classList.add("off");
  const img = await imagenFondo(st);
  if (actual !== st) return;
  pintar(esc, st, img);
  pintarPres(esc, st, { alCargar: function (m) { mostrarAviso(m, 6000); } });
  if (st.modo === "pres" && st.pres) precargar(st.pres, st.pv, false);
  if (st.prep && st.prep.id && st.prep.ts && Date.now() - st.prep.ts < 6 * 3600e3) precargar(st.prep.id, st.prep.pv, true);
  void origen;
}

// Diapositivas: la tele baja todo (fotos y videos) en segundo plano para que no haya esperas
let precargando = null;
const listas = {};
async function precargar(id, pv, avisar) {
  const k = id + "@" + (pv || 0);
  if (precargando === k || listas[k]) { if (avisar && listas[k] && !avisarHecho[k]) { avisarHecho[k] = 1; mostrarAviso("Diapositivas listas ✓", 4000); } return; }
  precargando = k;
  let sc; try { sc = await cargarEscena(id, pv); } catch (e) { precargando = null; return; }
  const lista = archivosEscena(sc); let hechos = 0;
  for (let i = 0; i < lista.length; i++) {
    if (precargando !== k) return;
    try { await archivo(lista[i]); } catch (e) { }
    hechos++;
    if (avisar && lista.length > 1) mostrarAviso("Preparando diapositivas… " + Math.round(hechos / lista.length * 100) + "%", 0);
  }
  listas[k] = true; precargando = null;
  if (avisar) { avisarHecho[k] = 1; mostrarAviso("Diapositivas listas ✓", 4000); }
}
const avisarHecho = {};

// Mismo aparato (otra pestaña o ventana): llega al instante, aun sin internet
try { const bc = new BroadcastChannel("proyector-meraki"); bc.onmessage = e => { if (e.data && e.data.tipo === "estado") { if (e.data.fondoImg && e.data.estado.fondo) fondos[e.data.estado.fondo.id] = e.data.fondoImg; aplicar(e.data.estado, "local"); } }; } catch (e) { }

// Otro aparato: por internet
const app = initializeApp(firebaseConfig, "visor");
const db = getFirestore(app);
configurarAlmacen({ leerDoc: async (id) => { const d = await getDoc(doc(db, "proyector", id)); return d.exists() ? d.data() : null; } });
onSnapshot(doc(db, "proyector", "en_vivo"), s => { if (s.exists()) aplicar(s.data(), "red"); },
  e => {
    const sub = inicio.querySelector("small");
    if ((e.code || "").includes("permission")) { errorFijo = true; sub.textContent = "Falta el permiso en Firebase: agregá la regla de \"proyector\" y recargá esta página."; sub.style.color = "#ff7a6b"; }
    else { sub.textContent = "Sin conexión a internet. Reintentando…"; }
  });
let errorFijo = false;

// Pantalla completa y que no se apague
let lock = null;
const pedirLock = async () => { try { if ("wakeLock" in navigator && document.visibilityState === "visible") lock = await navigator.wakeLock.request("screen"); } catch (e) { } };
pedirLock(); document.addEventListener("visibilitychange", pedirLock);
document.addEventListener("click", () => {
  try { if (!document.fullscreenElement) { const p = document.documentElement.requestFullscreen(); if (p && p.catch) p.catch(() => { }); } } catch (e) { }
  aviso.classList.add("off"); pedirLock();
});
document.addEventListener("keydown", e => { if (e.key === "f" || e.key === "F") { const de = document.documentElement; if (de.requestFullscreen) de.requestFullscreen().catch(() => { }); } });
let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { if (actual) { esc.key = null; const t = Object.assign({}, actual, { estilo: Object.assign({}, actual.estilo, { trans: "ninguna" }) }); pintar(esc, t, esc._img); reencajarPres(esc); } }, 150); });
window.addEventListener("online", () => aviso.classList.add("off"));
