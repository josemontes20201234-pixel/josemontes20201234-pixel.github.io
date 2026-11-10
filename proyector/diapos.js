/* Proyector · motor de diapositivas. Lo usan el control (cel) y el visor (tele).
   Escrito para navegadores viejos de teles (Chrome 79 de LG): sin "?." ni "??",
   sin "gap" en flex, sin "inset" ni "aspect-ratio" en el CSS. */

export const PT = 96 / 72; // puntos tipográficos → píxeles de la diapositiva

export const DIAPOS_CSS = `
.esc-pres{position:absolute;top:0;left:0;right:0;bottom:0;background:#000;overflow:hidden;display:none}
.esc.pres-on .esc-pres{display:block}
.esc.pres-on .esc-capa{visibility:hidden}
.esc.pres-on.pres-oculto .esc-pres{display:none}
.dp-esc{position:absolute;top:0;left:0;right:0;bottom:0;overflow:hidden;background:#000}
.dp-marco{position:absolute;top:0;left:0;right:0;bottom:0;overflow:hidden}
.dp-slide{position:absolute;top:0;left:0;transform-origin:0 0;overflow:hidden;background:#fff}
.dp-el{position:absolute}
.dp-in{position:absolute;top:0;left:0;width:100%;height:100%}
.dp-in > svg{position:absolute;top:0;left:0;width:100%;height:100%;overflow:visible}
.dp-recorte{position:absolute;top:0;left:0;width:100%;height:100%;overflow:hidden}
.dp-img{position:absolute;display:block;max-width:none;max-height:none}
.dp-vid{position:absolute;top:0;left:0;width:100%;height:100%;background:#000}
.dp-tx{position:absolute;top:0;left:0;width:100%;height:100%;display:flex;flex-direction:column;box-sizing:border-box;overflow-wrap:break-word;word-wrap:break-word}
.dp-p{margin:0;white-space:pre-wrap}
.dp-bu{display:inline-block;text-indent:0;white-space:nowrap}
.dp-tbl{border-collapse:collapse;table-layout:fixed;position:absolute;top:0;left:0}
.dp-tbl td{vertical-align:top;padding:0;position:relative;overflow:hidden}
.dp-oculto{visibility:hidden!important}
.dp-aviso{position:absolute;z-index:9;background:rgba(0,0,0,.72);color:#fff;font:600 15px/1.35 system-ui,-apple-system,sans-serif;padding:7px 14px;border-radius:99px;pointer-events:none}
.dp-aviso.abajo{right:2%;bottom:3%}
.dp-aviso.arriba{left:50%;top:4%;-webkit-transform:translateX(-50%);transform:translateX(-50%)}
.dp-yt{position:absolute;top:0;left:0;width:100%;height:100%;border:0;background:#000}
@keyframes dpFade{from{opacity:0}}
@keyframes dpFly{from{transform:translate(var(--dx),var(--dy))}}
@keyframes dpZoom{from{opacity:0;transform:scale(.3)}}
@keyframes dpFlotar{from{opacity:0;transform:translateY(var(--fy))}}
@keyframes dpGirar{from{opacity:0;transform:rotate(-200deg) scale(.2)}}
@keyframes dpSwivel{from{opacity:0;transform:perspective(900px) rotateY(90deg)}}
@keyframes dpRebote{0%{opacity:0;transform:translateY(-60%)}50%{opacity:1;transform:translateY(0)}68%{transform:translateY(-12%)}84%{transform:translateY(0)}92%{transform:translateY(-4%)}100%{transform:translateY(0)}}
@keyframes dpWipeL{from{clip-path:inset(0 100% 0 0);-webkit-clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0);-webkit-clip-path:inset(0 0 0 0)}}
@keyframes dpWipeR{from{clip-path:inset(0 0 0 100%);-webkit-clip-path:inset(0 0 0 100%)}to{clip-path:inset(0 0 0 0);-webkit-clip-path:inset(0 0 0 0)}}
@keyframes dpWipeU{from{clip-path:inset(100% 0 0 0);-webkit-clip-path:inset(100% 0 0 0)}to{clip-path:inset(0 0 0 0);-webkit-clip-path:inset(0 0 0 0)}}
@keyframes dpWipeD{from{clip-path:inset(0 0 100% 0);-webkit-clip-path:inset(0 0 100% 0)}to{clip-path:inset(0 0 0 0);-webkit-clip-path:inset(0 0 0 0)}}
@keyframes dpSplitH{from{clip-path:inset(0 50% 0 50%);-webkit-clip-path:inset(0 50% 0 50%)}to{clip-path:inset(0 0 0 0);-webkit-clip-path:inset(0 0 0 0)}}
@keyframes dpSplitV{from{clip-path:inset(50% 0 50% 0);-webkit-clip-path:inset(50% 0 50% 0)}to{clip-path:inset(0 0 0 0);-webkit-clip-path:inset(0 0 0 0)}}
@keyframes dpCirculo{from{clip-path:circle(0% at 50% 50%);-webkit-clip-path:circle(0% at 50% 50%)}to{clip-path:circle(75% at 50% 50%);-webkit-clip-path:circle(75% at 50% 50%)}}
@keyframes dpPulso{0%{transform:scale(1)}45%{transform:scale(1.14)}100%{transform:scale(1)}}
@keyframes dpVuelta{to{transform:rotate(360deg)}}
@keyframes dpBalanceo{0%,100%{transform:rotate(0)}20%{transform:rotate(-8deg)}40%{transform:rotate(7deg)}60%{transform:rotate(-5deg)}80%{transform:rotate(3deg)}}
@keyframes dpParpadeo{0%,100%{opacity:1}50%{opacity:.15}}
@keyframes tFade{from{opacity:0}}
@keyframes tPushL{from{transform:translateX(100%)}}
@keyframes tPushR{from{transform:translateX(-100%)}}
@keyframes tPushU{from{transform:translateY(100%)}}
@keyframes tPushD{from{transform:translateY(-100%)}}
@keyframes tSaleL{to{transform:translateX(-100%)}}
@keyframes tSaleR{to{transform:translateX(100%)}}
@keyframes tSaleU{to{transform:translateY(-100%)}}
@keyframes tSaleD{to{transform:translateY(100%)}}
@keyframes tZoom{from{opacity:0;transform:scale(.82)}}
@keyframes tSaleFade{to{opacity:0}}
@media (prefers-reduced-motion: reduce){.dp-esc *{animation-duration:1ms!important}}
`;

/* =====================================================================
   Archivos (imágenes, videos): memoria → IndexedDB del aparato → Firestore
   ===================================================================== */
let ALM = null; // { leerDoc(id) → Promise<datos|null> }
export function configurarAlmacen(fns) { ALM = fns; }

const MEM = {};   // id → { url, mime, size }
const PEND = {};  // id → Promise<url>
let idbP = null;
function idb() {
  if (idbP) return idbP;
  idbP = new Promise(function (ok) {
    try {
      if (!window.indexedDB) return ok(null);
      const r = indexedDB.open("proyector-archivos", 1);
      r.onupgradeneeded = function () { try { r.result.createObjectStore("a"); } catch (e) { } };
      r.onsuccess = function () { ok(r.result); };
      r.onerror = function () { ok(null); };
      r.onblocked = function () { ok(null); };
    } catch (e) { ok(null); }
  });
  return idbP;
}
function idbGet(k) {
  return idb().then(function (db) {
    if (!db) return null;
    return new Promise(function (ok) {
      try { const q = db.transaction("a", "readonly").objectStore("a").get(k); q.onsuccess = function () { ok(q.result || null); }; q.onerror = function () { ok(null); }; }
      catch (e) { ok(null); }
    });
  });
}
function idbPut(k, v) {
  return idb().then(function (db) {
    if (!db) return false;
    return new Promise(function (ok) {
      try { const t = db.transaction("a", "readwrite"); t.objectStore("a").put(v, k); t.oncomplete = function () { ok(true); }; t.onerror = function () { ok(false); }; t.onabort = function () { ok(false); }; }
      catch (e) { ok(false); }
    });
  });
}
export function borrarArchivoLocal(id) {
  if (MEM[id]) { try { URL.revokeObjectURL(MEM[id].url); } catch (e) { } delete MEM[id]; }
  return idb().then(function (db) { if (!db) return; try { db.transaction("a", "readwrite").objectStore("a").delete(id); } catch (e) { } });
}
function aBytes(b) {
  if (!b) return new Uint8Array(0);
  if (b instanceof Uint8Array) return b;
  if (typeof b.toUint8Array === "function") return b.toUint8Array();
  if (b instanceof ArrayBuffer) return new Uint8Array(b);
  return new Uint8Array(0);
}
/** Guarda en este aparato un archivo recién subido (para no volver a bajarlo). */
export function registrarArchivo(id, blob, mime) {
  const url = URL.createObjectURL(blob);
  MEM[id] = { url: url, mime: mime || blob.type, size: blob.size };
  idbPut(id, blob);
  return url;
}
export function urlArchivo(id) { return id && MEM[id] ? MEM[id].url : null; }
/** Devuelve la URL local del archivo, bajándolo si hace falta. avance(0..1) opcional. */
export function archivo(id, avance) {
  if (!id) return Promise.resolve(null);
  if (MEM[id]) return Promise.resolve(MEM[id].url);
  if (PEND[id]) return PEND[id];
  PEND[id] = (async function () {
    const local = await idbGet(id);
    if (local && local.size) { MEM[id] = { url: URL.createObjectURL(local), mime: local.type, size: local.size }; return MEM[id].url; }
    if (!ALM) throw new Error("Sin almacén");
    const h = await ALM.leerDoc("a_" + id);
    if (!h) throw new Error("Falta un archivo de la presentación");
    const partes = [aBytes(h.b)];
    const n = h.partes || 1;
    if (avance) avance(1 / n);
    // Bajamos de a 3 pedazos a la vez
    const resto = []; for (let k = 1; k < n; k++) resto.push(k);
    let hechos = 1;
    async function trabajador() {
      while (resto.length) {
        const k = resto.shift();
        const d = await ALM.leerDoc("a_" + id + "_" + k);
        partes[k] = aBytes(d && d.b);
        hechos++; if (avance) avance(hechos / n);
      }
    }
    await Promise.all([trabajador(), trabajador(), trabajador()]);
    const blob = new Blob(partes, { type: h.mime || "application/octet-stream" });
    idbPut(id, blob);
    MEM[id] = { url: URL.createObjectURL(blob), mime: blob.type, size: blob.size };
    return MEM[id].url;
  })();
  PEND[id].then(function () { delete PEND[id]; }, function () { delete PEND[id]; });
  return PEND[id];
}

/* =====================================================================
   Presentaciones (la "escena": diapositivas en JSON)
   ===================================================================== */
const ESC = {}; // "id@ver" → escena
export function recordarEscena(id, ver, sc) { ESC[id + "@" + (ver || 0)] = sc; }
export async function cargarEscena(id, ver) {
  const k = id + "@" + (ver || 0);
  if (ESC[k]) return ESC[k];
  if (!ALM) throw new Error("Sin almacén");
  const h = await ALM.leerDoc("pres_" + id);
  if (!h) throw new Error("No encontré la presentación");
  let json = h.json || "";
  for (let i = 1; i < (h.partes || 1); i++) { const p = await ALM.leerDoc("pres_" + id + "_p" + i); json += (p && p.json) || ""; }
  const sc = JSON.parse(json);
  ESC[k] = sc;
  return sc;
}
/** Todos los archivos que usa una diapositiva (o toda la escena). */
export function archivosDe(sl, sinMedios) {
  const out = [];
  const add = function (x) { if (x && out.indexOf(x) < 0) out.push(x); };
  const ver = function (el) {
    if (!el) return;
    if (!(sinMedios && (el.t === "vid" || el.t === "aud"))) add(el.src);
    add(el.poster); if (el.fill && el.fill.img) add(el.fill.img);
    if (el.kids) el.kids.forEach(ver);
    if (el.rows) el.rows.forEach(function (r) { r.forEach(function (c) { if (c && c.fill && c.fill.img) add(c.fill.img); }); });
  };
  if (sl.bg && sl.bg.img) add(sl.bg.img);
  (sl.els || []).forEach(ver);
  return out;
}
export function archivosEscena(sc) {
  const out = [];
  (sc.slides || []).forEach(function (sl) { archivosDe(sl).forEach(function (a) { if (out.indexOf(a) < 0) out.push(a); }); });
  return out;
}
/** Elementos de video/YouTube/audio de una diapositiva. */
export function mediosDe(sl) {
  const out = [];
  const ver = function (el) { if (!el) return; if (el.t === "vid" || el.t === "yt" || el.t === "aud") out.push(el); if (el.kids) el.kids.forEach(ver); };
  (sl.els || []).forEach(ver);
  return out;
}

/* =====================================================================
   Tipos de letra: equivalentes gratis de Google Fonts
   ===================================================================== */
const EQUIV = {
  "calibri": "Carlito", "calibri light": "Carlito", "cambria": "Caladea", "arial": "Arimo", "helvetica": "Arimo", "arial narrow": "Arimo",
  "times new roman": "Tinos", "times": "Tinos", "courier new": "Cousine", "georgia": "Gelasio", "segoe ui": "Noto Sans", "segoe ui light": "Noto Sans",
  "verdana": "Noto Sans", "tahoma": "Noto Sans", "aptos": "Noto Sans", "aptos display": "Noto Sans", "century gothic": "Didact Gothic",
  "franklin gothic medium": "Libre Franklin", "franklin gothic book": "Libre Franklin", "garamond": "EB Garamond", "trebuchet ms": "Fira Sans",
  "impact": "Anton", "comic sans ms": "Comic Neue", "book antiqua": "EB Garamond", "palatino linotype": "EB Garamond", "bookman old style": "Libre Baskerville",
  "gill sans mt": "Lato", "gill sans": "Lato", "avenir": "Nunito Sans", "avenir next": "Nunito Sans", "corbel": "Open Sans", "candara": "Open Sans",
  "constantia": "Gelasio", "rockwell": "Arvo", "baskerville old face": "Libre Baskerville", "lucida sans": "Open Sans", "consolas": "Cousine",
  "dejavu sans": "Noto Sans", "liberation sans": "Arimo", "liberation serif": "Tinos", "source sans pro": "Source Sans 3", "open sans": "Open Sans",
  "montserrat": "Montserrat", "roboto": "Roboto", "lato": "Lato", "oswald": "Oswald", "poppins": "Poppins", "raleway": "Raleway", "playfair display": "Playfair Display",
  "bebas neue": "Bebas Neue", "anton": "Anton", "merriweather": "Merriweather", "nunito": "Nunito", "quicksand": "Quicksand", "cinzel": "Cinzel",
  "league spartan": "League Spartan", "inter": "Inter", "dm sans": "DM Sans", "work sans": "Work Sans", "rubik": "Rubik", "noto sans": "Noto Sans",
  "noto serif": "Noto Serif", "pt sans": "PT Sans", "pt serif": "PT Serif", "ubuntu": "Ubuntu", "josefin sans": "Josefin Sans", "abril fatface": "Abril Fatface",
  "great vibes": "Great Vibes", "dancing script": "Dancing Script", "pacifico": "Pacifico", "lobster": "Lobster", "caveat": "Caveat", "archivo black": "Archivo Black",
  "fira sans": "Fira Sans", "barlow": "Barlow", "mulish": "Mulish", "karla": "Karla", "cormorant garamond": "Cormorant Garamond", "libre baskerville": "Libre Baskerville",
  "alegreya": "Alegreya", "arvo": "Arvo", "bitter": "Bitter", "crimson text": "Crimson Text", "eb garamond": "EB Garamond", "exo 2": "Exo 2", "kanit": "Kanit"
};
const SERIF = /times|georgia|cambria|garamond|serif|antiqua|palatino|bookman|baskerville|constantia|rockwell|playfair|merriweather|cinzel/i;
const CARGADAS = {};
export function familiaCss(nombre) {
  const n = String(nombre || "").trim();
  if (!n) return "Arimo, Arial, sans-serif";
  const eq = EQUIV[n.toLowerCase()];
  const gen = SERIF.test(n) ? "serif" : "sans-serif";
  const lista = ["'" + n.replace(/'/g, "") + "'"];
  if (eq && eq.toLowerCase() !== n.toLowerCase()) lista.push("'" + eq + "'");
  if (eq === "Carlito") lista.push("'Lato'");
  lista.push(gen);
  return lista.join(",");
}
/** Carga desde Google Fonts las letras que usa la presentación (si existen allá). */
export function cargarFuentes(nombres) {
  (nombres || []).forEach(function (n) {
    const eq = EQUIV[String(n).toLowerCase()] || n;
    [eq, eq === "Carlito" ? "Lato" : null].forEach(function (f) {
      if (!f || CARGADAS[f]) return; CARGADAS[f] = true;
      const fam = encodeURIComponent(f).replace(/%20/g, "+");
      const l = document.createElement("link"); l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=" + fam + ":ital,wght@0,400;0,700;1,400;1,700&display=swap";
      l.onerror = function () { const s = document.createElement("link"); s.rel = "stylesheet"; s.href = "https://fonts.googleapis.com/css2?family=" + fam + "&display=swap"; document.head.appendChild(s); };
      document.head.appendChild(l);
    });
  });
}

/* =====================================================================
   Dibujar una diapositiva
   ===================================================================== */
function h(tag, cls, css) { const e = document.createElement(tag); if (cls) e.className = cls; if (css) e.style.cssText = css; return e; }
const SVGNS = "http://www.w3.org/2000/svg";
function s(tag, attrs) { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]); return e; }
let NID = 0;
function relleno(f, defs, w, hgt, url) {
  // f: "#rrggbb" | {c, a} | {g:{ang, stops:[[pos,color,alpha]], rad}} | {img, fit} | null
  if (!f) return "none";
  if (typeof f === "string") return f;
  if (f.c) return f.c;
  if (f.g) {
    const id = "dpg" + (NID++);
    let gr;
    if (f.g.rad) gr = s("radialGradient", { id: id, cx: "50%", cy: "50%", r: "70%" });
    else {
      const a = (f.g.ang || 0) * Math.PI / 180;
      const x = Math.cos(a), y = Math.sin(a);
      gr = s("linearGradient", { id: id, x1: (50 - x * 50) + "%", y1: (50 - y * 50) + "%", x2: (50 + x * 50) + "%", y2: (50 + y * 50) + "%" });
    }
    (f.g.stops || []).forEach(function (st) { gr.appendChild(s("stop", { offset: st[0], "stop-color": st[1], "stop-opacity": st[2] == null ? 1 : st[2] })); });
    defs.appendChild(gr);
    return "url(#" + id + ")";
  }
  if (f.img) {
    const u = url(f.img); if (!u) return "none";
    const id = "dpp" + (NID++);
    const p = s("pattern", { id: id, patternUnits: "userSpaceOnUse", width: w, height: hgt });
    const im = s("image", { width: w, height: hgt, preserveAspectRatio: f.fit === "stretch" || !f.fit ? "none" : "xMidYMid slice" });
    im.setAttributeNS("http://www.w3.org/1999/xlink", "href", u); im.setAttribute("href", u);
    p.appendChild(im); defs.appendChild(p);
    return "url(#" + id + ")";
  }
  return "none";
}
function alfa(f) { return f && typeof f === "object" && f.a != null ? f.a : 1; }
function cssFondo(f, url) {
  if (!f) return "";
  if (typeof f === "string") return "background:" + f + ";";
  if (f.g) {
    const st = (f.g.stops || []).map(function (x) { return rgba(x[1], x[2]) + " " + Math.round(x[0] * 100) + "%"; }).join(",");
    return "background:" + (f.g.rad ? "radial-gradient(circle," + st + ")" : "linear-gradient(" + ((f.g.ang || 0) + 90) + "deg," + st + ")") + ";";
  }
  if (f.c) return "background:" + rgba(f.c, f.a) + ";";
  return "";
}
export function rgba(hex, a) {
  if (a == null || a >= 1 || !/^#[0-9a-f]{6}$/i.test(hex || "")) return hex || "transparent";
  const n = parseInt(hex.slice(1), 16);
  return "rgba(" + (n >> 16) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
}

function pintarTexto(tx, cont, opt) {
  // tx: { paras:[...], anchor, ins:[l,t,r,b], wrap, vert, cols, fit:{s,l}, shrink }
  const d = h("div", "dp-tx");
  const ins = tx.ins || [9.6, 4.8, 9.6, 4.8];
  d.style.padding = ins[1] + "px " + ins[2] + "px " + ins[3] + "px " + ins[0] + "px";
  d.style.justifyContent = tx.anchor === "ctr" ? "center" : tx.anchor === "b" ? "flex-end" : "flex-start";
  if (tx.wrap === false) d.style.whiteSpace = "pre";
  if (tx.vert === "vert" || tx.vert === "eaVert") d.style.writingMode = "vertical-rl";
  if (tx.vert === "vert270") { d.style.writingMode = "vertical-rl"; d.style.transform = "rotate(180deg)"; }
  const caja = h("div", "", tx.cols > 1 ? "column-count:" + tx.cols + ";column-gap:" + (tx.colGap || 20) + "px" : "");
  d.appendChild(caja);
  const escala = (tx.fit && tx.fit.s) || 1, redLin = (tx.fit && tx.fit.l) || 0;
  const nodos = [];
  const num = {};
  (tx.paras || []).forEach(function (p, pi) {
    const nivel = p.lvl || 0;
    const conTexto = (p.runs || []).some(function (r) { return r.t && r.t.trim(); });
    Object.keys(num).forEach(function (k) { const lv = +k.split("|")[1]; if (lv > nivel || (conTexto && lv === nivel && !(p.bu && p.bu.num))) delete num[k]; });
    const pd = h("div", "dp-p");
    pd.style.textAlign = p.al === "ctr" ? "center" : p.al === "r" ? "right" : p.al === "just" || p.al === "dist" ? "justify" : "left";
    const marL = p.marL || 0, ind = p.ind || 0;
    pd.style.paddingLeft = marL + "px";
    pd.style.textIndent = ind + "px";
    if (p.sb) pd.style.marginTop = (p.sb.pct != null ? (p.sb.pct * 1.2 * ((primerTam(p) || 18) * PT * escala)) : p.sb.pt * PT * escala) + "px";
    if (p.sa) pd.style.marginBottom = (p.sa.pct != null ? (p.sa.pct * 1.2 * ((primerTam(p) || 18) * PT * escala)) : p.sa.pt * PT * escala) + "px";
    let lh = 1.2;
    if (p.ls) { if (p.ls.pct != null) lh = 1.2 * p.ls.pct * (1 - redLin); else if (p.ls.pt != null) lh = null; }
    else if (redLin) lh = 1.2 * (1 - redLin);
    if (lh != null) pd.style.lineHeight = lh.toFixed(3);
    else pd.style.lineHeight = (p.ls.pt * PT) + "px";
    // viñeta
    if (p.bu && conTexto) {
      let txt = p.bu.ch;
      if (p.bu.num) { const k = p.bu.num + "|" + nivel; num[k] = (num[k] || (p.bu.start || 1) - 1) + 1; txt = numerar(p.bu.num, num[k]); }
      const r0 = (p.runs || [])[0] || {};
      const b = h("span", "dp-bu");
      b.textContent = txt;
      const tam = (p.bu.sz || 1) * (r0.sz || p.sz || 18) * PT * escala;
      b.style.fontSize = tam + "px";
      b.style.color = p.bu.c || r0.c || "#000";
      if (p.bu.f) b.style.fontFamily = familiaCss(p.bu.f); else if (r0.f) b.style.fontFamily = familiaCss(r0.f);
      if (ind < 0) { b.style.width = (-ind) + "px"; }
      else { b.style.paddingRight = "0.4em"; }
      pd.appendChild(b);
    }
    const runs = p.runs || [];
    if (!runs.length || runs.every(function (r) { return !r.t; })) {
      const vacio = h("span"); vacio.innerHTML = "&#8203;";
      vacio.style.fontSize = ((p.sz || 18) * PT * escala) + "px";
      pd.appendChild(vacio);
    }
    runs.forEach(function (r) {
      if (r.br) { pd.appendChild(document.createElement("br")); return; }
      const sp = h("span");
      sp.textContent = r.cap === "all" ? String(r.t || "").toUpperCase() : (r.t || "");
      let tam = (r.sz || p.sz || 18) * PT * escala;
      if (r.base) { tam *= 0.66; sp.style.verticalAlign = r.base > 0 ? "super" : "sub"; }
      sp.style.fontSize = tam + "px";
      if (r.b) sp.style.fontWeight = "700";
      if (r.i) sp.style.fontStyle = "italic";
      const deco = []; if (r.u) deco.push("underline"); if (r.st) deco.push("line-through");
      if (deco.length) sp.style.textDecoration = deco.join(" ");
      if (r.c) sp.style.color = rgba(r.c, r.a);
      if (r.f) sp.style.fontFamily = familiaCss(r.f);
      if (r.hl) sp.style.background = r.hl;
      if (r.spc) sp.style.letterSpacing = (r.spc * PT) + "px";
      if (r.cap === "small") sp.style.fontVariant = "small-caps";
      if (r.sh) sp.style.textShadow = r.sh;
      if (r.ol) { sp.style.webkitTextStroke = r.ol.w + "px " + r.ol.c; }
      pd.appendChild(sp);
    });
    caja.appendChild(pd);
    if (p.an) nodos.push({ n: pd, an: p.an });
  });
  cont.appendChild(d);
  if (tx.shrink && !opt.mini) cont._encoger = d;
  return nodos;
}
function primerTam(p) { const r = (p.runs || [])[0]; return (r && r.sz) || p.sz; }
function numerar(tipo, n) {
  const rom = function (x) { const v = [[1000, "m"], [900, "cm"], [500, "d"], [400, "cd"], [100, "c"], [90, "xc"], [50, "l"], [40, "xl"], [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"]]; let o = ""; v.forEach(function (p) { while (x >= p[0]) { o += p[1]; x -= p[0]; } }); return o; };
  const alf = function (x) { let o = ""; while (x > 0) { x--; o = String.fromCharCode(97 + (x % 26)) + o; x = Math.floor(x / 26); } return o; };
  let base = String(n);
  if (/^alphaLc/.test(tipo)) base = alf(n); else if (/^alphaUc/.test(tipo)) base = alf(n).toUpperCase();
  else if (/^romanLc/.test(tipo)) base = rom(n); else if (/^romanUc/.test(tipo)) base = rom(n).toUpperCase();
  if (/ParenBoth$/.test(tipo)) return "(" + base + ")";
  if (/ParenR$/.test(tipo)) return base + ")";
  if (/Period$/.test(tipo)) return base + ".";
  if (/Plain$/.test(tipo)) return base;
  return base + ".";
}

/** Crea el DOM de un elemento. Devuelve la lista de nodos animables. */
function pintarElemento(el, padre, opt, nodos) {
  if (el.t === "grp") {
    const g = h("div", "dp-el", "left:" + el.x + "px;top:" + el.y + "px;width:" + el.w + "px;height:" + el.h + "px;" + (el.rot ? "transform:rotate(" + el.rot + "deg);" : ""));
    padre.appendChild(g);
    if (el.an) nodos.push({ n: g, an: el.an, el: el });
    (el.kids || []).forEach(function (k) { pintarElemento(k, g, opt, nodos); });
    return;
  }
  const w = Math.max(el.w || 0, 1), hh = Math.max(el.h || 0, 1);
  const box = h("div", "dp-el", "left:" + el.x + "px;top:" + el.y + "px;width:" + w + "px;height:" + hh + "px;" + (el.op != null && el.op < 1 ? "opacity:" + el.op + ";" : ""));
  const tr = [];
  if (el.rot) tr.push("rotate(" + el.rot + "deg)");
  if (el.fh) tr.push("scaleX(-1)");
  if (el.fv) tr.push("scaleY(-1)");
  const inn = h("div", "dp-in", tr.length ? "transform:" + tr.join(" ") + ";" : "");
  if (el.sh) inn.style.filter = "drop-shadow(" + el.sh + ")";
  if (el.fx) inn.style.filter = (inn.style.filter ? inn.style.filter + " " : "") + el.fx;
  box.appendChild(inn);
  const url = opt.url;
  if (el.t === "img") {
    const u = url(el.src);
    const rc = h("div", "dp-recorte");
    if (el.geo && el.geo !== "rect" && el.path) {
      // imagen dentro de una forma (por ejemplo, círculo): se dibuja con SVG
      const sv = s("svg", { viewBox: "0 0 " + w + " " + hh, preserveAspectRatio: "none" });
      const defs = s("defs", {}); sv.appendChild(defs);
      const cid = "dpc" + (NID++);
      const cp = s("clipPath", { id: cid }); cp.appendChild(s("path", { d: el.path })); defs.appendChild(cp);
      if (u) {
        const c = el.crop || { l: 0, t: 0, r: 0, b: 0 };
        const fw = w / Math.max(0.01, 1 - c.l - c.r), fh = hh / Math.max(0.01, 1 - c.t - c.b);
        const im = s("image", { x: -c.l * fw, y: -c.t * fh, width: fw, height: fh, preserveAspectRatio: "none", "clip-path": "url(#" + cid + ")" });
        im.setAttributeNS("http://www.w3.org/1999/xlink", "href", u); im.setAttribute("href", u);
        sv.appendChild(im);
      }
      if (el.ln) sv.appendChild(s("path", { d: el.path, fill: "none", stroke: el.ln.c, "stroke-width": el.ln.w }));
      inn.appendChild(sv);
    } else {
      if (u) {
        const im = h("img", "dp-img"); im.alt = ""; im.src = u; im.draggable = false;
        if (el.fit === "contain" || el.fit === "cover") { im.style.cssText += "left:0;top:0;width:100%;height:100%;object-fit:" + el.fit + ";"; }
        else {
          const c = el.crop || { l: 0, t: 0, r: 0, b: 0 };
          const fw = 100 / Math.max(0.01, 1 - c.l - c.r), fh = 100 / Math.max(0.01, 1 - c.t - c.b);
          im.style.width = fw + "%"; im.style.height = fh + "%";
          im.style.left = (-c.l * fw) + "%"; im.style.top = (-c.t * fh) + "%";
        }
        rc.appendChild(im);
      }
      inn.appendChild(rc);
      if (el.ln && el.ln.w) { inn.style.boxShadow = "inset 0 0 0 " + el.ln.w + "px " + el.ln.c; }
    }
  } else if (el.t === "vid" || el.t === "aud") {
    if (opt.mini || el.t === "aud") {
      const p = el.esconder && !opt.mini ? null : url(el.poster);
      if (p) { const im = h("img", "dp-img", "left:0;top:0;width:100%;height:100%;object-fit:" + (el.fit === "fill" ? "fill" : el.fit || "contain")); im.src = p; im.alt = ""; inn.appendChild(im); }
      else if (el.t === "vid") inn.appendChild(h("div", "dp-vid"));
      if (opt.mini && el.t === "vid") inn.appendChild(iconoPlay());
      if (el.t === "aud" && !opt.mini) {
        const a = document.createElement("audio"); a.preload = "auto"; const u = url(el.src); if (u) a.src = u; a.setAttribute("data-medio", el.id); if (el.loop) a.loop = true; if (el.ini) a.setAttribute("data-ini", el.ini); inn.appendChild(a);
      }
    } else {
      const v = document.createElement("video");
      v.className = "dp-vid"; v.setAttribute("playsinline", ""); v.setAttribute("webkit-playsinline", ""); v.preload = "auto";
      v.style.objectFit = el.fit || "contain";
      const u = url(el.src); if (u) v.src = u;
      const p = url(el.poster); if (p) v.poster = p;
      if (el.loop) v.loop = true;
      if (el.mudo) { v.muted = true; v.setAttribute("data-mudo", ""); }
      if (el.ini) v.setAttribute("data-ini", el.ini);
      if (el.esconder) {
        v.style.visibility = "hidden";
        v.addEventListener("play", function () { v.style.visibility = ""; });
        v.addEventListener("ended", function () { v.style.visibility = "hidden"; });
      }
      v.setAttribute("data-medio", el.id);
      inn.appendChild(v);
    }
  } else if (el.t === "yt") {
    if (opt.mini) {
      const im = h("img", "dp-img", "left:0;top:0;width:100%;height:100%;object-fit:cover"); im.alt = ""; im.src = "https://i.ytimg.com/vi/" + el.yt + "/hqdefault.jpg"; inn.appendChild(im);
      inn.appendChild(iconoPlay());
    } else {
      const f = document.createElement("iframe");
      f.className = "dp-yt"; f.setAttribute("allow", "autoplay; encrypted-media; fullscreen");
      f.src = "https://www.youtube.com/embed/" + el.yt + "?enablejsapi=1&controls=0&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&disablekb=1" + (el.ini ? "&start=" + Math.floor(el.ini) : "") + (el.auto === 0 ? "&autoplay=1" : "") + (el.loop ? "&loop=1&playlist=" + el.yt : "");
      f.setAttribute("data-medio", el.id);
      inn.appendChild(f);
    }
  } else if (el.t === "tbl") {
    const t = h("table", "dp-tbl");
    t.style.width = w + "px";
    const cg = document.createElement("colgroup");
    (el.colW || []).forEach(function (cw) { const c = document.createElement("col"); c.style.width = cw + "px"; cg.appendChild(c); });
    t.appendChild(cg);
    (el.rows || []).forEach(function (row, ri) {
      const tr2 = document.createElement("tr");
      tr2.style.height = ((el.rowH || [])[ri] || 20) + "px";
      row.forEach(function (c) {
        if (!c || c.skip) return;
        const td = document.createElement("td");
        if (c.cs > 1) td.colSpan = c.cs; if (c.rs > 1) td.rowSpan = c.rs;
        if (c.fill) td.style.background = typeof c.fill === "string" ? c.fill : (c.fill.c ? rgba(c.fill.c, c.fill.a) : "");
        ["L", "R", "T", "B"].forEach(function (k) { const b = c["b" + k]; if (b) td.style["border" + { L: "Left", R: "Right", T: "Top", B: "Bottom" }[k]] = b.w + "px solid " + b.c; });
        const inner = h("div", "", "position:relative;width:100%;min-height:" + (((el.rowH || [])[ri] || 20)) + "px");
        if (c.tx) { const nn = pintarTexto(c.tx, inner, opt); inner.firstChild.style.position = "relative"; inner.firstChild.style.height = "auto"; inner.firstChild.style.minHeight = (((el.rowH || [])[ri] || 20)) + "px"; nn.forEach(function (x) { nodos.push(x); }); }
        td.appendChild(inner);
        tr2.appendChild(td);
      });
      t.appendChild(tr2);
    });
    inn.appendChild(t);
  } else if (el.t === "svg") {
    inn.innerHTML = el.svg || "";
    const sv = inn.firstElementChild; if (sv) { sv.setAttribute("width", "100%"); sv.setAttribute("height", "100%"); sv.setAttribute("preserveAspectRatio", "none"); }
  } else if (el.t === "shp" || el.t === "line") {
    const sv = s("svg", { viewBox: "0 0 " + w + " " + hh, preserveAspectRatio: "none" });
    const defs = s("defs", {}); sv.appendChild(defs);
    const d = el.path || ("M0 0H" + w + "V" + hh + "H0Z");
    if (el.fill || el.t === "shp") {
      const f = relleno(el.fill, defs, w, hh, url);
      if (f !== "none") sv.appendChild(s("path", { d: d, fill: f, "fill-opacity": alfa(el.fill), stroke: "none" }));
    }
    if (el.ln && el.ln.w) {
      const attrs = { d: el.pathLn || d, fill: "none", stroke: el.ln.c, "stroke-width": el.ln.w, "stroke-opacity": el.ln.a == null ? 1 : el.ln.a, "stroke-linejoin": "round", "vector-effect": "non-scaling-stroke" };
      if (el.ln.dash) attrs["stroke-dasharray"] = el.ln.dash;
      if (el.ln.ini || el.ln.fin) {
        const mk = function (cual) {
          const id = "dpm" + (NID++);
          const m = s("marker", { id: id, viewBox: "0 0 10 10", refX: cual === "fin" ? 9 : 1, refY: 5, markerWidth: 4, markerHeight: 4, orient: "auto-start-reverse" });
          m.appendChild(s("path", { d: "M0 0L10 5L0 10Z", fill: el.ln.c }));
          defs.appendChild(m); return "url(#" + id + ")";
        };
        if (el.ln.fin) attrs["marker-end"] = mk("fin");
        if (el.ln.ini) attrs["marker-start"] = mk("ini");
      }
      sv.appendChild(s("path", attrs));
    }
    inn.appendChild(sv);
  }
  if (el.tx) {
    const tb = h("div", "", "position:absolute;top:0;left:0;width:100%;height:100%" + (el.txRot ? ";transform:rotate(" + el.txRot + "deg)" : ""));
    if (el.fh || el.fv) tb.style.transform = (el.fh ? "scaleX(-1) " : "") + (el.fv ? "scaleY(-1)" : ""); // el texto no se voltea
    inn.appendChild(tb);
    const nn = pintarTexto(el.tx, tb, opt);
    if (tb._encoger) box._encoger = tb._encoger;
    nn.forEach(function (x) { if (!x.el) x.el = el; nodos.push(x); });
  }
  padre.appendChild(box);
  if (el.an) nodos.push({ n: box, an: el.an, el: el });
}
function iconoPlay() {
  const d = h("div", "", "position:absolute;left:50%;top:50%;width:18%;max-width:120px;min-width:24px;transform:translate(-50%,-50%);opacity:.9");
  d.innerHTML = '<svg viewBox="0 0 48 48" style="width:100%;display:block"><circle cx="24" cy="24" r="23" fill="rgba(0,0,0,.55)"/><path d="M19 15l15 9-15 9z" fill="#fff"/></svg>';
  return d;
}

/** Dibuja la diapositiva completa (sin escalar: mide sc.w × sc.h píxeles). */
export function crearDiapo(sc, sl, opt) {
  opt = opt || {};
  if (!opt.url) opt.url = urlArchivo;
  const W = sl.w || sc.w, H = sl.h || sc.h;
  const d = h("div", "dp-slide", "width:" + W + "px;height:" + H + "px;");
  d._w = W; d._h = H;
  const bg = sl.bg || {};
  let css = "";
  if (bg.c) css += "background-color:" + bg.c + ";";
  if (bg.g) css += cssFondo({ g: bg.g });
  d.style.cssText += css;
  if (!bg.c && !bg.g) d.style.background = bg.img ? "#000" : "#fff";
  if (bg.img) {
    const u = opt.url(bg.img);
    if (u) {
      const im = h("img", "dp-img", "left:0;top:0;width:100%;height:100%;object-fit:" + (bg.fit === "contain" ? "contain" : bg.fit === "stretch" ? "fill" : "cover"));
      im.src = u; im.alt = ""; im.draggable = false; d.appendChild(im);
    }
  }
  const nodos = [];
  (sl.els || []).forEach(function (el) { pintarElemento(el, d, opt, nodos); });
  d._nodos = nodos;
  return d;
}

/** Ajusta los textos que PowerPoint encoge para que quepan (por si la letra de la tele es distinta). */
export function encogerTextos(slideDom) {
  const cajas = slideDom.querySelectorAll(".dp-el");
  for (let i = 0; i < cajas.length; i++) {
    const b = cajas[i]; const t = b._encoger; if (!t) continue;
    const alto = b.clientHeight; if (!alto) continue;
    const sps = t.querySelectorAll("span");
    for (let j = 0; j < sps.length; j++) { const o = sps[j].getAttribute("data-fs"); if (o) sps[j].style.fontSize = o; else if (sps[j].style.fontSize) sps[j].setAttribute("data-fs", sps[j].style.fontSize); }
    let k = 0, esc = 1;
    while (t.scrollHeight > alto + 2 && k < 12) {
      esc *= 0.92; k++;
      for (let j = 0; j < sps.length; j++) { const o = parseFloat(sps[j].getAttribute("data-fs")); if (o) sps[j].style.fontSize = (o * esc) + "px"; }
    }
  }
}

/* =====================================================================
   Animaciones por pasos (clics)
   ===================================================================== */
const EFECTOS_IN = {
  fade: function (n) { return "dpFade"; }, appear: function () { return "dpFade"; }, zoom: function () { return "dpZoom"; },
  float: function () { return "dpFlotar"; }, spin: function () { return "dpGirar"; }, swivel: function () { return "dpSwivel"; },
  bounce: function () { return "dpRebote"; }, circle: function () { return "dpCirculo"; },
  wipe: function (n, dir) { return { l: "dpWipeL", r: "dpWipeR", u: "dpWipeU", d: "dpWipeD" }[dir || "l"] || "dpWipeL"; },
  split: function (n, dir) { return dir === "v" ? "dpSplitV" : "dpSplitH"; }, fly: function () { return "dpFly"; }
};
function visible(an, paso) {
  if (!an) return true;
  if (an.in && paso < an.in.p) return false;
  if (an.out && paso >= an.out.p) return false;
  return true;
}
function preparaVuelo(nodo, efecto, sc) {
  const el = nodo.el; let x = 0, y = 0, w = 0, hh = 0;
  if (el) { x = el.x; y = el.y; w = el.w; hh = el.h; }
  else { const r = nodo.n.getBoundingClientRect(); w = r.width; hh = r.height; }
  const dir = efecto.dir || "d";
  const SW = sc._w || sc.w, SH = sc._h || sc.h;
  let dx = 0, dy = 0;
  if (dir === "l") dx = -(x + w + 20); else if (dir === "r") dx = SW - x + 20; else if (dir === "u") dy = -(y + hh + 20); else dy = SH - y + 20;
  if (dir === "lu") { dx = -(x + w + 20); dy = -(y + hh + 20); } if (dir === "ru") { dx = SW - x + 20; dy = -(y + hh + 20); }
  if (dir === "ld") { dx = -(x + w + 20); dy = SH - y + 20; } if (dir === "rd") { dx = SW - x + 20; dy = SH - y + 20; }
  nodo.n.style.setProperty("--dx", dx + "px"); nodo.n.style.setProperty("--dy", dy + "px");
}
function animar(nodo, efecto, salida, sc, alTerminar) {
  const n = nodo.n;
  let nombre;
  const dur = Math.max(1, efecto.t == null ? 500 : efecto.t), espera = efecto.w || 0;
  if (efecto.e === "appear") { setTimeout(function () { if (salida) n.classList.add("dp-oculto"); else n.classList.remove("dp-oculto"); if (alTerminar) alTerminar(); }, espera); return; }
  if (efecto.e === "pulse") nombre = "dpPulso"; else if (efecto.e === "spinE") nombre = "dpVuelta"; else if (efecto.e === "teeter") nombre = "dpBalanceo"; else if (efecto.e === "blink") nombre = "dpParpadeo";
  else nombre = (EFECTOS_IN[efecto.e] || EFECTOS_IN.fade)(n, efecto.dir);
  if (nombre === "dpFly") preparaVuelo(nodo, efecto, sc);
  if (nombre === "dpFlotar") n.style.setProperty("--fy", (efecto.dir === "u" ? -50 : 50) + "px");
  n.style.animation = "none"; void n.offsetWidth;
  n.style.animation = nombre + " " + dur + "ms " + (nombre === "dpRebote" ? "linear" : "cubic-bezier(.25,.7,.3,1)") + " " + espera + "ms " + (salida ? "reverse forwards" : "both");
  if (!salida) n.classList.remove("dp-oculto");
  setTimeout(function () {
    if (salida) n.classList.add("dp-oculto");
    n.style.animation = "";
    if (alTerminar) alTerminar();
  }, dur + espera + 40);
}
/** Muestra el estado del paso indicado. Si "anima" es true, anima lo que cambió desde "previo". */
export function aplicarPaso(slideDom, sc, paso, anima, previo) {
  const nodos = slideDom._nodos || [];
  sc = { w: sc.w, h: sc.h, _w: slideDom._w, _h: slideDom._h };
  nodos.forEach(function (nd) {
    const an = nd.an;
    const ahora = visible(an, paso);
    if (!anima) { nd.n.classList.toggle("dp-oculto", !ahora); nd.n.style.animation = ""; return; }
    const antes = previo == null ? (an.in ? false : true) : visible(an, previo);
    if (an.in && an.in.p === paso && ahora && (previo == null || previo < paso)) animar(nd, an.in, false, sc);
    else if (an.out && an.out.p === paso && !ahora && antes) animar(nd, an.out, true, sc);
    else nd.n.classList.toggle("dp-oculto", !ahora);
    (an.em || []).forEach(function (em) { if (em.p === paso && (previo == null || previo < paso) && ahora) animar(nd, em, false, sc); });
  });
}

/* =====================================================================
   Encajar en la pantalla y transiciones entre diapositivas
   ===================================================================== */
export function encajar(slideDom, sc, ancho, alto) {
  const W = slideDom._w || sc.w, H = slideDom._h || sc.h;
  const k = Math.min(ancho / W, alto / H);
  const x = (ancho - W * k) / 2, y = (alto - H * k) / 2;
  slideDom.style.transform = "translate(" + x + "px," + y + "px) scale(" + k + ")";
  return k;
}
const TRANS = {
  fade: ["tFade", null], dissolve: ["tFade", null], zoom: ["tZoom", null],
  push: function (d) { return [{ l: "tPushL", r: "tPushR", u: "tPushU", d: "tPushD" }[d || "l"], { l: "tSaleL", r: "tSaleR", u: "tSaleU", d: "tSaleD" }[d || "l"]]; },
  cover: function (d) { return [{ l: "tPushL", r: "tPushR", u: "tPushU", d: "tPushD" }[d || "l"], null]; },
  uncover: function (d) { return [null, { l: "tSaleL", r: "tSaleR", u: "tSaleU", d: "tSaleD" }[d || "l"]]; },
  wipe: function (d) { return [{ l: "dpWipeR", r: "dpWipeL", u: "dpWipeU", d: "dpWipeD" }[d || "l"], null]; },
  split: function (d) { return [d === "v" ? "dpSplitV" : "dpSplitH", null]; },
  circle: ["dpCirculo", null]
};
function nombresTrans(t) {
  if (!t || !t.e || t.e === "none") return null;
  const x = TRANS[t.e] || TRANS.fade;
  return typeof x === "function" ? x(t.dir) : x;
}

/* =====================================================================
   Presentar en una "escena" del proyector (tele o vista previa del cel)
   ===================================================================== */
function aviso(cont, txt, donde) {
  let a = cont.querySelector(".dp-aviso." + donde);
  if (!txt) { if (a) a.remove(); return; }
  if (!a) { a = h("div", "dp-aviso " + donde); cont.appendChild(a); }
  a.textContent = txt;
}
function enviarYT(f, func, args) {
  try { f.contentWindow.postMessage(JSON.stringify({ event: "command", func: func, args: args || [] }), "*"); } catch (e) { }
}
let SONIDO_OK = false;
document.addEventListener("click", function () { SONIDO_OK = true; }, true);
document.addEventListener("keydown", function () { SONIDO_OK = true; }, true);

function reproducir(nodo, cont, t) {
  if (!nodo) return;
  if (nodo.tagName === "IFRAME") {
    if (t != null) enviarYT(nodo, "seekTo", [t, true]);
    enviarYT(nodo, "playVideo"); return;
  }
  const ini = parseFloat(nodo.getAttribute("data-ini") || "0") || 0;
  if (t == null && ini && (nodo.currentTime || 0) < ini) t = ini;
  if (t != null && Math.abs((nodo.currentTime || 0) - t) > 0.8) { try { nodo.currentTime = t; } catch (e) { } }
  nodo.muted = nodo.hasAttribute("data-mudo");
  const p = nodo.play();
  if (p && p.catch) p.catch(function () {
    nodo.muted = true;
    const p2 = nodo.play(); if (p2 && p2.catch) p2.catch(function () { });
    aviso(cont, "Tocá la pantalla una vez para activar el sonido", "arriba");
    const activar = function () { nodo.muted = false; aviso(cont, "", "arriba"); document.removeEventListener("click", activar, true); };
    document.addEventListener("click", activar, true);
  });
}
function pausar(nodo, t) {
  if (!nodo) return;
  if (nodo.tagName === "IFRAME") { enviarYT(nodo, "pauseVideo"); if (t != null) enviarYT(nodo, "seekTo", [t, true]); return; }
  try { nodo.pause(); if (t != null) nodo.currentTime = t; } catch (e) { }
}

/**
 * Pinta el estado "en vivo" de una presentación dentro de una escena del proyector.
 * st: { modo:"pres", pres, pv, i, paso, vid:{seq, el, cmd, t, mudo}, oculto }
 * opciones: { mini: true en el cel (sin sonido ni video), alCargar(texto) }
 */
export function pintarPres(esc, st, opciones) {
  const E0 = esc._p || (esc._p = { sc: null, id: null, i: -1, paso: -1, marco: null, dom: null, vseq: 0, token: 0 });
  if (E0.tic) { clearInterval(E0.tic); E0.tic = null; }
  if (st && st.modo === "pres" && st.pres && st.auto && st.auto.cada && !st.oculto) {
    // Anuncios en bucle: cada pantalla calcula sola qué diapositiva toca, así no depende del cel
    E0.autoI = -1;
    const tic = function () {
      cargarEscena(st.pres, st.pv).then(function (sc) {
        const i = indiceAuto(st, (sc.slides || []).length);
        if (E0.autoI !== i) { E0.autoI = i; dibujarPres(esc, Object.assign({}, st, { i: i, paso: 0 }), opciones); }
      }).catch(function () { });
    };
    tic(); E0.tic = setInterval(tic, 400);
    return;
  }
  dibujarPres(esc, st, opciones);
}
function dibujarPres(esc, st, opciones) {
  opciones = opciones || {};
  const activo = st && st.modo === "pres" && st.pres;
  esc.root.classList.toggle("pres-on", !!activo);
  esc.root.classList.toggle("pres-oculto", !!(activo && st.oculto));
  if (!esc.pres) return;
  const E = esc._p || (esc._p = { sc: null, id: null, i: -1, paso: -1, marco: null, dom: null, vseq: 0, token: 0 });
  if (!activo) {
    if (E.marco) { pausarTodo(E.marco); E.marco.remove(); }
    E.marco = null; E.dom = null; E.id = null; E.i = -1; E.paso = -1;
    return;
  }
  const token = ++E.token;
  const pid = st.pres + "@" + (st.pv || 0);
  (async function () {
    let sc;
    try { sc = await cargarEscena(st.pres, st.pv); }
    catch (er) { if (opciones.alCargar) opciones.alCargar("No se pudo abrir la presentación"); return; }
    if (token !== E.token) return;
    const i = Math.max(0, Math.min((sc.slides || []).length - 1, st.i || 0));
    const sl = sc.slides[i]; if (!sl) return;
    const paso = Math.max(0, Math.min(sl.pasos || 0, st.paso || 0));
    if (sc.fuentes) cargarFuentes(sc.fuentes);
    // Archivos que necesita esta diapositiva (los videos no se esperan: se ve su portada y arrancan al terminar de bajar)
    const faltan = archivosDe(sl, true).filter(function (a) { return !urlArchivo(a); });
    if (faltan.length && !opciones.mini) {
      let hechos = 0;
      aviso(esc.pres, "Cargando diapositiva…", "abajo");
      await Promise.all(faltan.map(function (a) {
        return archivo(a, function (x) { aviso(esc.pres, faltan.length > 1 ? "Cargando " + (hechos + 1) + " de " + faltan.length + "…" : "Cargando " + Math.round(x * 100) + "%", "abajo"); })
          .then(function () { hechos++; }, function () { hechos++; });
      }));
      aviso(esc.pres, "", "abajo");
      if (token !== E.token) return;
    } else if (faltan.length) {
      await Promise.all(faltan.map(function (a) { return archivo(a).catch(function () { }); }));
      if (token !== E.token) return;
    }
    const mismaPres = E.id === pid, mismaDiapo = mismaPres && E.i === i && E.dom;
    if (mismaDiapo) {
      if (E.paso !== paso) {
        const adelante = paso > E.paso && paso - E.paso === 1;
        aplicarPaso(E.dom, sc, paso, adelante && !opciones.sinAnim, E.paso);
        medioPorPaso(E, sl, paso, esc.pres, opciones);
        E.paso = paso;
      }
    } else {
      // Diapositiva nueva
      const viejo = E.marco;
      const marco = h("div", "dp-marco");
      const dom = crearDiapo(sc, sl, { mini: !!opciones.mini });
      marco.appendChild(dom);
      const cont = esc.pres;
      let escenario = cont.querySelector(".dp-esc");
      if (!escenario) { escenario = h("div", "dp-esc"); cont.appendChild(escenario); }
      const adelante = !mismaPres || i > E.i;
      const tr = adelante && !opciones.sinAnim && mismaPres ? nombresTrans(sl.trans) : null;
      const dur = (sl.trans && sl.trans.t) || 700;
      escenario.appendChild(marco);
      encajar(dom, sc, escenario.clientWidth || cont.clientWidth, escenario.clientHeight || cont.clientHeight);
      encogerTextos(dom);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (E.dom === dom) encogerTextos(dom); });
      aplicarPaso(dom, sc, paso, false);
      E.marco = marco; E.dom = dom; E.id = pid; E.i = i; E.paso = paso; E.sc = sc; E.pend = {};
      if (!opciones.mini) cargarMedios(E, sl, cont);
      if (viejo) {
        pausarTodo(viejo);
        if (tr) {
          if (tr[0]) marco.style.animation = tr[0] + " " + dur + "ms cubic-bezier(.3,.7,.3,1) both";
          if (tr[1]) { viejo.style.animation = tr[1] + " " + dur + "ms cubic-bezier(.3,.7,.3,1) forwards"; if (!tr[0]) viejo.style.zIndex = "2"; }
          setTimeout(function () { viejo.remove(); marco.style.animation = ""; }, dur + 60);
        } else viejo.remove();
      }
      // Animaciones automáticas al entrar (paso 0)
      if (paso === 0 && !opciones.sinAnim) {
        const esperar = tr && viejo ? dur : 0;
        dom._nodos.forEach(function (nd) { if (nd.an && nd.an.in && nd.an.in.p === 0) nd.n.classList.add("dp-oculto"); });
        setTimeout(function () { if (E.dom === dom && E.paso === 0) aplicarPaso(dom, sc, 0, true, -1); }, esperar);
      }
      if (!opciones.mini) medioPorPaso(E, sl, paso, cont, opciones, true);
    }
    // Comandos de video que mandó el cel
    if (!opciones.mini && st.vid && st.vid.seq && st.vid.seq !== E.vseq) {
      E.vseq = st.vid.seq;
      const nodo = E.marco && E.marco.querySelector('[data-medio="' + st.vid.el + '"]');
      if (nodo) {
        if (nodo.tagName !== "IFRAME" && st.vid.mudo != null) { nodo.muted = !!st.vid.mudo; if (st.vid.mudo) nodo.setAttribute("data-mudo", ""); else nodo.removeAttribute("data-mudo"); }
        if (nodo.tagName === "IFRAME" && st.vid.mudo != null) enviarYT(nodo, st.vid.mudo ? "mute" : "unMute");
        if (nodo.tagName !== "IFRAME" && !nodo.getAttribute("src")) E.pend[st.vid.el] = { cmd: st.vid.cmd, t: st.vid.t };
        else if (st.vid.cmd === "play") reproducir(nodo, esc.pres, st.vid.t);
        else if (st.vid.cmd === "pause") pausar(nodo, st.vid.t);
      }
    }
  })();
}
/** Baja los videos y audios de la diapositiva sin frenar el dibujo; cuando llegan, arrancan si les tocaba. */
function cargarMedios(E, sl, cont) {
  mediosDe(sl).forEach(function (m) {
    if (m.t === "yt" || !m.src || urlArchivo(m.src)) return;
    const marco = E.marco;
    archivo(m.src, function (x) { if (E.marco === marco) aviso(cont, (m.t === "aud" ? "Cargando audio " : "Cargando video ") + Math.round(x * 100) + "%", "abajo"); })
      .then(function (u) {
        if (E.marco !== marco) return;
        aviso(cont, "", "abajo");
        const nodo = marco.querySelector('[data-medio="' + m.id + '"]');
        if (!nodo || !u) return;
        nodo.src = u;
        const pend = E.pend[m.id];
        if (pend) {
          delete E.pend[m.id];
          if (pend.cmd === "play") reproducir(nodo, cont, pend.t);
          else if (pend.t != null) { try { nodo.currentTime = pend.t; } catch (e) { } }
        }
      }, function () { if (E.marco === marco) aviso(cont, "No se pudo cargar el video", "abajo"); });
  });
}
function pausarTodo(marco) {
  const ms = marco.querySelectorAll("[data-medio]");
  for (let i = 0; i < ms.length; i++) pausar(ms[i]);
}
function medioPorPaso(E, sl, paso, cont, opciones, entrando) {
  // Videos que arrancan solos al llegar a cierto paso (o al entrar a la diapositiva)
  mediosDe(sl).forEach(function (m) {
    if (m.auto == null) return;
    if ((entrando && m.auto <= paso && m.auto === paso) || (!entrando && m.auto === paso)) {
      const nodo = E.marco && E.marco.querySelector('[data-medio="' + m.id + '"]');
      if (!nodo) return;
      if (nodo.tagName === "IFRAME") { if (!entrando) enviarYT(nodo, "playVideo"); }
      else if (!nodo.getAttribute("src")) E.pend[m.id] = { cmd: "play", t: null };
      else reproducir(nodo, cont, null);
    }
  });
}
/** Vuelve a encajar la diapositiva cuando cambia el tamaño de la pantalla. */
export function reencajarPres(esc) {
  const E = esc._p; if (!E || !E.dom || !E.sc) return;
  const escn = esc.pres.querySelector(".dp-esc"); if (!escn) return;
  encajar(E.dom, E.sc, escn.clientWidth, escn.clientHeight);
}

/** Dibuja una miniatura de una diapositiva dentro de un contenedor (para el cel). */
export function miniatura(cont, sc, sl, paso) {
  cont.innerHTML = "";
  if (window.getComputedStyle(cont).position === "static") cont.style.position = "relative";
  cont.style.overflow = "hidden";
  const dom = crearDiapo(sc, sl, { mini: true });
  cont.appendChild(dom);
  const ajustar = function () { encajar(dom, sc, cont.clientWidth, cont.clientHeight); };
  ajustar();
  if (paso != null) aplicarPaso(dom, sc, paso, false);
  dom._ajustar = ajustar;
  return dom;
}

/** Si la presentación pasa sola (anuncios en bucle), qué diapositiva toca ahora. */
export function indiceAuto(st, n) {
  if (!st || !st.auto || !st.auto.cada || !n) return st ? st.i || 0 : 0;
  const pasadas = Math.floor(Math.max(0, Date.now() - (st.auto.desde || 0)) / st.auto.cada);
  return ((st.auto.i0 || 0) + pasadas) % n;
}
