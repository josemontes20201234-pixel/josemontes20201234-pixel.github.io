// Visor: lo que se ve en la tele o el proyector. No pide cuenta; sólo lee lo que manda el control.
import { firebaseConfig } from "../config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, onSnapshot, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { crearEscena, pintar, ESCENA_CSS } from "./shared.js";

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
  catch { fondos[f.id] = null; }
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
  void origen;
}

// Mismo aparato (otra pestaña o ventana): llega al instante, aun sin internet
try { const bc = new BroadcastChannel("proyector-meraki"); bc.onmessage = e => { if (e.data && e.data.tipo === "estado") { if (e.data.fondoImg && e.data.estado.fondo) fondos[e.data.estado.fondo.id] = e.data.fondoImg; aplicar(e.data.estado, "local"); } }; } catch { }

// Otro aparato: por internet
const app = initializeApp(firebaseConfig, "visor");
const db = getFirestore(app);
onSnapshot(doc(db, "proyector", "en_vivo"), s => { if (s.exists()) aplicar(s.data(), "red"); },
  e => {
    if ((e.code || "").includes("permission")) mostrarAviso("Falta un permiso en Firebase para el visor. Revisá la regla de lectura de \"proyector\".");
    else mostrarAviso("Sin conexión. Reintentando…");
  });

// Pantalla completa y que no se apague
let lock = null;
const pedirLock = async () => { try { if ("wakeLock" in navigator && document.visibilityState === "visible") lock = await navigator.wakeLock.request("screen"); } catch { } };
pedirLock(); document.addEventListener("visibilitychange", pedirLock);
document.addEventListener("click", () => {
  try { if (!document.fullscreenElement) { const p = document.documentElement.requestFullscreen(); if (p && p.catch) p.catch(() => { }); } } catch { }
  aviso.classList.add("off"); pedirLock();
});
document.addEventListener("keydown", e => { if (e.key === "f" || e.key === "F") document.documentElement.requestFullscreen?.().catch(() => { }); });
let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { if (actual) { esc.key = null; const t = Object.assign({}, actual, { estilo: Object.assign({}, actual.estilo, { trans: "ninguna" }) }); pintar(esc, t, esc._img); } }, 150); });
window.addEventListener("online", () => aviso.classList.add("off"));
