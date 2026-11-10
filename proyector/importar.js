// Proyector · importar diapositivas. Corre sólo en el cel (la tele nunca carga este archivo).
// Lee PowerPoint (.pptx .ppsx .potx), PDF (Canva, Google Slides, Keynote…), fotos, videos y links de YouTube
// y los convierte en una "escena" (JSON) que dibuja diapos.js en el cel y en la tele.
import { familiaCss, PT } from "./diapos.js";

const EMU = 9525; // EMU por píxel (96 ppp)
const NS_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const LIB = new URL("./lib/", import.meta.url).href;

/* =============================== utilidades =============================== */
export function nuevoId(n = 10) {
  const a = "abcdefghijkmnpqrstuvwxyz23456789"; const r = crypto.getRandomValues(new Uint8Array(n));
  let s = ""; for (let i = 0; i < n; i++) s += a[r[i] % a.length]; return s;
}
const r2 = (x, d = 2) => { const k = Math.pow(10, d); return Math.round((+x || 0) * k) / k; };
const num = (v, d) => { const n = parseFloat(v); return isFinite(n) ? n : d; };
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const respirar = () => new Promise(r => setTimeout(r, 0));
const ext = n => { const m = /\.([a-z0-9]+)$/i.exec(String(n || "")); return m ? m[1].toLowerCase() : ""; };
const MIME = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", jpe: "image/jpeg", jfif: "image/jpeg", gif: "image/gif", bmp: "image/bmp", svg: "image/svg+xml", webp: "image/webp",
  tif: "image/tiff", tiff: "image/tiff", emf: "image/x-emf", wmf: "image/x-wmf", wdp: "image/vnd.ms-photo", jxr: "image/vnd.ms-photo", heic: "image/heic", heif: "image/heif",
  mp4: "video/mp4", m4v: "video/mp4", mov: "video/quicktime", webm: "video/webm", ogv: "video/ogg", wmv: "video/x-ms-wmv", avi: "video/x-msvideo", mpg: "video/mpeg",
  mpeg: "video/mpeg", mkv: "video/x-matroska", "3gp": "video/3gpp", asf: "video/x-ms-asf",
  mp3: "audio/mpeg", m4a: "audio/mp4", wav: "audio/wav", ogg: "audio/ogg", oga: "audio/ogg", aac: "audio/aac", wma: "audio/x-ms-wma", mid: "audio/midi", midi: "audio/midi"
};
const IMG_OK = /^image\/(png|jpeg|gif|bmp|svg\+xml|webp)$/;
const VID_OK = /^video\/(mp4|webm|ogg|quicktime|3gpp)$/;
const AUD_OK = /^audio\/(mpeg|mp4|wav|ogg|aac)$/;

function cargarScript(src) {
  return new Promise((ok, mal) => {
    const s = document.createElement("script"); s.src = src; s.onload = ok;
    s.onerror = () => mal(new Error("No se pudo cargar una pieza de la app. Revisá el internet y probá otra vez."));
    document.head.appendChild(s);
  });
}
async function libZip() { if (!window.JSZip) await cargarScript(LIB + "jszip.min.js"); return window.JSZip; }
let PDFJS = null;
async function libPdf() {
  if (!PDFJS) { PDFJS = await import(LIB + "pdf.min.js"); PDFJS.GlobalWorkerOptions.workerSrc = LIB + "pdf.worker.min.js"; }
  return PDFJS;
}

/* ---- XML ---- */
const PARSER = new DOMParser();
function xmlDe(txt) {
  const d = PARSER.parseFromString(String(txt).replace(/^﻿/, ""), "application/xml");
  if (!d.documentElement || d.documentElement.localName === "parsererror") return null;
  return d;
}
function hijos(el, nombre) { const o = []; if (!el) return o; for (let c = el.firstElementChild; c; c = c.nextElementSibling) if (!nombre || c.localName === nombre) o.push(c); return o; }
function hijo(el, nombre) { if (!el) return null; for (let c = el.firstElementChild; c; c = c.nextElementSibling) if (c.localName === nombre) return c; return null; }
function ruta(el, ...ns) { for (const n of ns) { el = hijo(el, n); if (!el) return null; } return el; }
function todos(el, nombre) { return el ? Array.from(el.getElementsByTagNameNS("*", nombre)) : []; }
const at = (el, n) => (el ? el.getAttribute(n) : null);
function atL(el, local) { if (!el) return null; for (const a of el.attributes) if (a.localName === local) return a.value; return null; }
const rid = (el, n) => (el ? (el.getAttributeNS(NS_R, n) || el.getAttribute("r:" + n)) : null);
const si = v => v === "1" || v === "true" || v === "on";
function resolver(dir, tgt) {
  try { tgt = decodeURIComponent(tgt); } catch (e) { }
  tgt = tgt.replace(/\\/g, "/");
  if (tgt.startsWith("/")) return tgt.slice(1);
  const out = [];
  for (const x of (dir + tgt).split("/")) { if (x === "..") out.pop(); else if (x !== "." && x !== "") out.push(x); }
  return out.join("/");
}

/* =============================== colores =============================== */
function hexRgb(h) { const n = parseInt(String(h || "000000").replace("#", "").slice(0, 6), 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgbHex(r, g, b) { return "#" + [r, g, b].map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0")).join(""); }
function rgbHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; }
  return [h, s, l];
}
function hslRgb(h, s, l) {
  if (!s) return [l * 255, l * 255, l * 255];
  const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = t => { t = ((t % 1) + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}
const aLin = c => { c /= 255; return c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); };
const deLin = v => 255 * (v <= .0031308 ? v * 12.92 : 1.055 * Math.pow(clamp(v, 0, 1), 1 / 2.4) - .055);
const PRST = { black: "#000000", white: "#ffffff", red: "#ff0000", green: "#008000", lime: "#00ff00", blue: "#0000ff", yellow: "#ffff00", cyan: "#00ffff", magenta: "#ff00ff", gray: "#808080", grey: "#808080", silver: "#c0c0c0", maroon: "#800000", navy: "#000080", olive: "#808000", orange: "#ffa500", purple: "#800080", teal: "#008080", darkGray: "#a9a9a9", ltGray: "#d3d3d3", dkGray: "#a9a9a9", gold: "#ffd700", pink: "#ffc0cb", brown: "#a52a2a", darkBlue: "#00008b", darkRed: "#8b0000", darkGreen: "#006400", lightBlue: "#add8e6", skyBlue: "#87ceeb" };
const TIPOS_COLOR = new Set(["srgbClr", "schemeClr", "sysClr", "prstClr", "scrgbClr", "hslClr"]);

function esquema(nombre, C) {
  const mapa = C.mapa || {};
  const real = nombre === "phClr" ? null : (mapa[nombre] || nombre);
  if (nombre === "phClr") return C.phClr || "#000000";
  return C.tema.colores[real] || C.tema.colores[nombre] || (/^(bg|lt)/.test(real) ? "#ffffff" : "#000000");
}
function modificar(hex, el) {
  let [r, g, b] = hexRgb(hex); let a = 1;
  for (const m of hijos(el)) {
    const n = m.localName, v = num(at(m, "val"), 0) / 100000;
    if (n === "alpha") a = clamp(v, 0, 1);
    else if (n === "alphaMod") a = clamp(a * v, 0, 1);
    else if (n === "alphaOff") a = clamp(a + v, 0, 1);
    else if (n === "tint") { r = deLin(aLin(r) * v + (1 - v)); g = deLin(aLin(g) * v + (1 - v)); b = deLin(aLin(b) * v + (1 - v)); }
    else if (n === "shade") { r = deLin(aLin(r) * v); g = deLin(aLin(g) * v); b = deLin(aLin(b) * v); }
    else if (n === "inv") { r = 255 - r; g = 255 - g; b = 255 - b; }
    else if (n === "gray") { const y = .299 * r + .587 * g + .114 * b; r = g = b = y; }
    else if (/^(lumMod|lumOff|lum|satMod|satOff|sat|hueMod|hueOff|hue|comp)$/.test(n)) {
      let [h, s, l] = rgbHsl(r, g, b);
      if (n === "lumMod") l *= v; else if (n === "lumOff") l += v; else if (n === "lum") l = v;
      else if (n === "satMod") s *= v; else if (n === "satOff") s += v; else if (n === "sat") s = v;
      else if (n === "hueMod") h *= v; else if (n === "hueOff") h += num(at(m, "val"), 0) / 60000 / 360; else if (n === "hue") h = num(at(m, "val"), 0) / 60000 / 360;
      else if (n === "comp") h += .5;
      [r, g, b] = hslRgb(h, clamp(s, 0, 1), clamp(l, 0, 1));
    }
  }
  return { c: rgbHex(r, g, b), a: r2(a, 3) };
}
function color(el, C) {
  if (!el) return null;
  let hex = null;
  switch (el.localName) {
    case "srgbClr": hex = "#" + (at(el, "val") || "000000"); break;
    case "sysClr": hex = "#" + (at(el, "lastClr") || (at(el, "val") === "window" ? "FFFFFF" : "000000")); break;
    case "schemeClr": hex = esquema(at(el, "val"), C); break;
    case "prstClr": hex = PRST[at(el, "val")] || "#000000"; break;
    case "scrgbClr": { const f = k => deLin(num(at(el, k), 0) / 100000); hex = rgbHex(f("r"), f("g"), f("b")); break; }
    case "hslClr": { const c = hslRgb(num(at(el, "hue"), 0) / 60000 / 360, num(at(el, "sat"), 0) / 100000, num(at(el, "lum"), 0) / 100000); hex = rgbHex(c[0], c[1], c[2]); break; }
    default: return null;
  }
  return modificar(hex, el);
}
function colorDe(cont, C) { if (!cont) return null; for (const k of hijos(cont)) if (TIPOS_COLOR.has(k.localName)) return color(k, C); return null; }
function rgbaCss(c) { if (!c) return "transparent"; if (c.a == null || c.a >= 1) return c.c; const [r, g, b] = hexRgb(c.c); return `rgba(${r},${g},${b},${c.a})`; }
function mezclar(c1, c2, k = .5) { if (!c1) return c2; if (!c2) return c1; const a = hexRgb(c1.c), b = hexRgb(c2.c); return { c: rgbHex(a[0] * k + b[0] * (1 - k), a[1] * k + b[1] * (1 - k), a[2] * k + b[2] * (1 - k)), a: 1 }; }
const salidaColor = c => (!c ? null : c.a != null && c.a < 1 ? { c: c.c, a: c.a } : c.c);

/* =============================== rellenos, líneas y sombras =============================== */
function degradado(g, C) {
  const stops = hijos(hijo(g, "gsLst"), "gs").map(s => { const c = colorDe(s, C) || { c: "#000000", a: 1 }; return [r2(num(at(s, "pos"), 0) / 100000, 4), c.c, c.a]; }).sort((a, b) => a[0] - b[0]);
  if (!stops.length) return null;
  if (stops.length === 1) return { c: stops[0][1], a: stops[0][2] };
  if (hijo(g, "path")) return { g: { rad: true, stops } };
  return { g: { ang: r2(num(at(hijo(g, "lin"), "ang"), 0) / 60000), stops } };
}
const ES_RELLENO = new Set(["noFill", "solidFill", "gradFill", "blipFill", "pattFill", "grpFill"]);
/** Relleno de un elemento tipo a:solidFill… Devuelve null (sin relleno) o el objeto que usa diapos.js. */
async function rellenoElem(k, C, L, rels) {
  switch (k.localName) {
    case "noFill": return null;
    case "solidFill": { const c = colorDe(k, C); return c ? (c.a < 1 ? { c: c.c, a: c.a } : c.c) : null; }
    case "gradFill": { const g = degradado(k, C); return g && g.c ? (g.a < 1 ? g : g.c) : g; }
    case "blipFill": { const id = await L.imagenDeBlip(hijo(k, "blip"), rels); return id ? { img: id, fit: hijo(k, "tile") ? "tile" : "stretch" } : null; }
    case "pattFill": { const m = mezclar(colorDe(hijo(k, "fgClr"), C), colorDe(hijo(k, "bgClr"), C), .35); return m ? m.c : null; }
    case "grpFill": return C.grpFill === undefined ? null : C.grpFill;
  }
  return undefined;
}
/** Busca el relleno dentro de un spPr/bgPr/tcPr. undefined = no dice nada (hay que heredar). */
async function rellenoDe(cont, C, L, rels) {
  if (!cont) return undefined;
  for (const k of hijos(cont)) if (ES_RELLENO.has(k.localName)) return rellenoElem(k, C, L, rels);
  return undefined;
}
async function rellenoEstilo(ref, C, L) {
  if (!ref) return undefined;
  const idx = num(at(ref, "idx"), 0); if (!idx) return null;
  const ph = colorDe(ref, C);
  const C2 = Object.assign({}, C, { phClr: ph ? ph.c : C.phClr });
  const lista = idx >= 1001 ? C.tema.fondos : C.tema.rellenos;
  const el = lista[(idx >= 1001 ? idx - 1001 : idx - 1)]; if (!el) return null;
  return rellenoElem(el, C2, L, C.tema.rels || {});
}
const DASH = { dash: [4, 3], dot: [1, 1], sysDot: [1, 1], sysDash: [3, 1], lgDash: [8, 3], dashDot: [4, 3, 1, 3], lgDashDot: [8, 3, 1, 3], lgDashDotDot: [8, 3, 1, 3, 1, 3], sysDashDot: [3, 1, 1, 1], sysDashDotDot: [3, 1, 1, 1, 1, 1] };
function leerLn(ln, C) {
  const o = {}; if (!ln) return o;
  if (at(ln, "w") != null) o.w = num(at(ln, "w"), 0) / EMU;
  for (const k of hijos(ln)) {
    const n = k.localName;
    if (n === "noFill") o.no = true;
    else if (n === "solidFill") { const c = colorDe(k, C); if (c) { o.c = c.c; o.a = c.a; o.no = false; } }
    else if (n === "gradFill") { const g = degradado(k, C); if (g) { const s = g.g ? g.g.stops[0] : [0, g.c, g.a]; o.c = s[1]; o.a = s[2]; o.no = false; } }
    else if (n === "prstDash") o.dash = at(k, "val");
    else if (n === "headEnd") { const t = at(k, "type"); o.ini = t && t !== "none" ? t : null; }
    else if (n === "tailEnd") { const t = at(k, "type"); o.fin = t && t !== "none" ? t : null; }
  }
  return o;
}
/** Línea final de una figura: combina el estilo del tema (lnRef) y las propiedades propias. */
function lineaFinal(lns, refEl, C) {
  let o = {};
  if (refEl) {
    const idx = num(at(refEl, "idx"), 0), base = C.tema.lineas[idx - 1];
    if (idx > 0 && base) { const ph = colorDe(refEl, C); o = leerLn(base, Object.assign({}, C, { phClr: ph ? ph.c : C.phClr })); }
    else if (idx === 0) o.no = true;
  }
  for (let i = lns.length - 1; i >= 0; i--) { const x = leerLn(lns[i], C); for (const k in x) if (x[k] !== undefined) o[k] = x[k]; }
  if (o.no || !o.c) return null;
  const w = Math.max(.75, o.w == null ? 1 : o.w);
  const out = { c: o.c, w: r2(w) };
  if (o.a != null && o.a < 1) out.a = o.a;
  if (o.dash && DASH[o.dash]) out.dash = DASH[o.dash].map(x => r2(x * w)).join(" ");
  if (o.ini) out.ini = o.ini; if (o.fin) out.fin = o.fin;
  return out;
}
function sombraDe(lst, C) {
  const s = hijo(lst, "outerShdw"); if (!s) return null;
  const blur = num(at(s, "blurRad"), 0) / EMU, dist = num(at(s, "dist"), 0) / EMU, dir = num(at(s, "dir"), 0) / 60000 * Math.PI / 180;
  const c = colorDe(s, C) || { c: "#000000", a: .4 };
  return `${r2(Math.cos(dir) * dist, 1)}px ${r2(Math.sin(dir) * dist, 1)}px ${r2(blur * .6, 1)}px ${rgbaCss(c)}`;
}
function efectosDe(spPrs, estilo, C) {
  for (const s of spPrs) { const e = s && hijo(s, "effectLst"); if (e) return sombraDe(e, C); }
  const ref = estilo && hijo(estilo, "effectRef");
  if (ref) { const idx = num(at(ref, "idx"), 0), es = C.tema.efectos[idx - 1]; const e = es && hijo(es, "effectLst"); if (e) { const ph = colorDe(ref, C); return sombraDe(e, Object.assign({}, C, { phClr: ph ? ph.c : C.phClr })); } }
  return null;
}

/* =============================== tema =============================== */
function leerTema(doc, rels) {
  const T = { colores: {}, mayor: "Calibri Light", menor: "Calibri", rellenos: [], fondos: [], lineas: [], efectos: [], rels: rels || {} };
  if (!doc) return T;
  const r = doc.documentElement;
  const cs = todos(r, "clrScheme")[0];
  if (cs) for (const c of hijos(cs)) { const v = hijos(c)[0]; if (v) { const x = color(v, { tema: { colores: {} }, mapa: {} }); if (x) T.colores[c.localName] = x.c; } }
  const fs = todos(r, "fontScheme")[0];
  if (fs) { const mj = ruta(fs, "majorFont", "latin"), mn = ruta(fs, "minorFont", "latin"); if (mj && at(mj, "typeface")) T.mayor = at(mj, "typeface"); if (mn && at(mn, "typeface")) T.menor = at(mn, "typeface"); }
  const fm = todos(r, "fmtScheme")[0];
  if (fm) { T.rellenos = hijos(hijo(fm, "fillStyleLst")); T.fondos = hijos(hijo(fm, "bgFillStyleLst")); T.lineas = hijos(hijo(fm, "lnStyleLst")); T.efectos = hijos(hijo(fm, "effectStyleLst")); }
  return T;
}
function mapaColores(el) {
  if (!el) return null; const m = {};
  for (const a of el.attributes) m[a.localName] = a.value;
  return m;
}

/* =============================== geometría =============================== */
const P = pts => "M" + pts.map(p => r2(p[0]) + " " + r2(p[1])).join("L") + "Z";
const rango = n => Array.from({ length: n }, (_, i) => i);
function elipse(cx, cy, rx, ry, inverso) {
  const s = inverso ? 0 : 1;
  return `M${r2(cx - rx)} ${r2(cy)}A${r2(rx)} ${r2(ry)} 0 1 ${s} ${r2(cx + rx)} ${r2(cy)}A${r2(rx)} ${r2(ry)} 0 1 ${s} ${r2(cx - rx)} ${r2(cy)}Z`;
}
function redondo(w, h, tl, tr, br, bl, snip) {
  // esquinas: número = radio; snip[i] = true → esquina cortada
  const s = snip || [];
  const c = (i, r, x0, y0, x1, y1, cx, cy) => (r <= 0 ? `L${r2(cx)} ${r2(cy)}` : s[i] ? `L${r2(x0)} ${r2(y0)}L${r2(x1)} ${r2(y1)}` : `L${r2(x0)} ${r2(y0)}A${r2(r)} ${r2(r)} 0 0 1 ${r2(x1)} ${r2(y1)}`);
  return `M${r2(tl)} 0` + c(1, tr, w - tr, 0, w, tr, w, 0) + c(2, br, w, h - br, w - br, h, w, h) + c(3, bl, bl, h, 0, h - bl, 0, h) + c(0, tl, 0, tl, tl, 0, 0, 0) + "Z";
}
const poligono = (n, w, h) => P(rango(n).map(i => { const a = (-90 + i * 360 / n) * Math.PI / 180; return [w / 2 + w / 2 * Math.cos(a), h / 2 + h / 2 * Math.sin(a)]; }));
const estrella = (n, w, h, k) => P(rango(2 * n).map(i => { const a = (-90 + i * 180 / n) * Math.PI / 180, r = i % 2 ? k : 1; return [w / 2 + w / 2 * r * Math.cos(a), h / 2 + h / 2 * r * Math.sin(a)]; }));
function punto(cx, cy, rx, ry, ang) { const a = ang * Math.PI / 180; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; }
function anillo(w, h, a1, a2, grosor) {
  const cx = w / 2, cy = h / 2, rx = w / 2, ry = h / 2, irx = Math.max(.1, rx - grosor), iry = Math.max(.1, ry - grosor);
  let sw = a2 - a1; while (sw <= 0) sw += 360;
  const p1 = punto(cx, cy, rx, ry, a1), p2 = punto(cx, cy, rx, ry, a1 + sw), p3 = punto(cx, cy, irx, iry, a1 + sw), p4 = punto(cx, cy, irx, iry, a1);
  const lg = sw > 180 ? 1 : 0;
  return `M${r2(p1[0])} ${r2(p1[1])}A${r2(rx)} ${r2(ry)} 0 ${lg} 1 ${r2(p2[0])} ${r2(p2[1])}L${r2(p3[0])} ${r2(p3[1])}A${r2(irx)} ${r2(iry)} 0 ${lg} 0 ${r2(p4[0])} ${r2(p4[1])}Z`;
}
function arco(w, h, a1, a2, cerrar) {
  const cx = w / 2, cy = h / 2; let sw = a2 - a1; while (sw <= 0) sw += 360;
  const p1 = punto(cx, cy, w / 2, h / 2, a1), p2 = punto(cx, cy, w / 2, h / 2, a1 + sw);
  const base = `M${r2(p1[0])} ${r2(p1[1])}A${r2(w / 2)} ${r2(h / 2)} 0 ${sw > 180 ? 1 : 0} 1 ${r2(p2[0])} ${r2(p2[1])}`;
  return cerrar === "pie" ? base + `L${r2(cx)} ${r2(cy)}Z` : cerrar ? base + "Z" : base;
}
function flecha(w, h, dir, a1, a2, doble) {
  // flecha horizontal hacia la derecha y luego se gira con coordenadas
  const horiz = dir === "r" || dir === "l";
  const W = horiz ? w : h, H = horiz ? h : w, ss = Math.min(w, h);
  const t = H * a1 / 200000, hl = Math.min(W / (doble ? 2 : 1), ss * a2 / 100000);
  let pts = doble
    ? [[0, H / 2], [hl, 0], [hl, H / 2 - t], [W - hl, H / 2 - t], [W - hl, 0], [W, H / 2], [W - hl, H], [W - hl, H / 2 + t], [hl, H / 2 + t], [hl, H]]
    : [[0, H / 2 - t], [W - hl, H / 2 - t], [W - hl, 0], [W, H / 2], [W - hl, H], [W - hl, H / 2 + t], [0, H / 2 + t]];
  if (dir === "l") pts = pts.map(p => [W - p[0], p[1]]);
  if (dir === "d") pts = pts.map(p => [p[1], p[0]]);
  if (dir === "u") pts = pts.map(p => [p[1], W - p[0]]);
  return P(pts);
}
function globo(w, h, a1, a2, forma) {
  // globo de diálogo con colita hacia (tx, ty)
  const tx = w / 2 + w * a1 / 100000, ty = h / 2 + h * a2 / 100000;
  const r = forma === "round" ? Math.min(w, h) * .16667 : 0;
  if (forma === "ellipse") {
    const ang = Math.atan2((ty - h / 2) / h, (tx - w / 2) / w) * 180 / Math.PI;
    const p1 = punto(w / 2, h / 2, w / 2, h / 2, ang + 12), p2 = punto(w / 2, h / 2, w / 2, h / 2, ang - 12);
    return `M${r2(p1[0])} ${r2(p1[1])}A${r2(w / 2)} ${r2(h / 2)} 0 1 1 ${r2(p2[0])} ${r2(p2[1])}L${r2(tx)} ${r2(ty)}Z`;
  }
  const dx = (tx - w / 2) / w, dy = (ty - h / 2) / h;
  const dentro = tx >= 0 && tx <= w && ty >= 0 && ty <= h;
  if (dentro) return redondo(w, h, r, r, r, r);
  const pts = [];
  if (Math.abs(dy) >= Math.abs(dx)) {
    const a = tx < w / 2 ? .2 : .6, b = a + .17;
    if (dy > 0) { pts.push([w * b, h], [tx, ty], [w * a, h]); return `M${r} 0H${r2(w - r)}${r ? `A${r} ${r} 0 0 1 ${r2(w)} ${r}` : ""}V${r2(h - r)}${r ? `A${r} ${r} 0 0 1 ${r2(w - r)} ${r2(h)}` : ""}L${pts.map(p => r2(p[0]) + " " + r2(p[1])).join("L")}H${r}${r ? `A${r} ${r} 0 0 1 0 ${r2(h - r)}` : ""}V${r}${r ? `A${r} ${r} 0 0 1 ${r} 0` : ""}Z`; }
    pts.push([w * a, 0], [tx, ty], [w * b, 0]);
    return `M${r} 0L${pts.map(p => r2(p[0]) + " " + r2(p[1])).join("L")}H${r2(w - r)}${r ? `A${r} ${r} 0 0 1 ${r2(w)} ${r}` : ""}V${r2(h - r)}${r ? `A${r} ${r} 0 0 1 ${r2(w - r)} ${r2(h)}` : ""}H${r}${r ? `A${r} ${r} 0 0 1 0 ${r2(h - r)}` : ""}V${r}${r ? `A${r} ${r} 0 0 1 ${r} 0` : ""}Z`;
  }
  const a = ty < h / 2 ? .2 : .6, b = a + .17;
  if (dx > 0) return `M${r} 0H${r2(w - r)}${r ? `A${r} ${r} 0 0 1 ${r2(w)} ${r}` : ""}L${r2(w)} ${r2(h * a)}L${r2(tx)} ${r2(ty)}L${r2(w)} ${r2(h * b)}V${r2(h - r)}${r ? `A${r} ${r} 0 0 1 ${r2(w - r)} ${r2(h)}` : ""}H${r}${r ? `A${r} ${r} 0 0 1 0 ${r2(h - r)}` : ""}V${r}${r ? `A${r} ${r} 0 0 1 ${r} 0` : ""}Z`;
  return `M${r} 0H${r2(w - r)}${r ? `A${r} ${r} 0 0 1 ${r2(w)} ${r}` : ""}V${r2(h - r)}${r ? `A${r} ${r} 0 0 1 ${r2(w - r)} ${r2(h)}` : ""}H${r}${r ? `A${r} ${r} 0 0 1 0 ${r2(h - r)}` : ""}L0 ${r2(h * b)}L${r2(tx)} ${r2(ty)}L0 ${r2(h * a)}V${r}${r ? `A${r} ${r} 0 0 1 ${r} 0` : ""}Z`;
}
const NUBE = "M.25 .9C.1 .9 .02 .78 .07 .66C0 .58 .03 .42 .14 .4C.12 .25 .26 .14 .38 .2C.43 .06 .62 .04 .68 .16C.78 .08 .92 .14 .9 .3C1 .36 1 .52 .93 .58C1 .7 .9 .86 .78 .82C.72 .95 .55 .98 .46 .88C.4 .94 .3 .94 .25 .9Z";
const CORAZON = "M.5 .25C.5 .1 .35 0 .22 0C.1 0 0 .1 0 .28C0 .5 .25 .7 .5 1C.75 .7 1 .5 1 .28C1 .1 .9 0 .78 0C.65 0 .5 .1 .5 .25Z";
const RAYO = [[8458, 0], [0, 3923], [7564, 8416], [4993, 9720], [12197, 13904], [9987, 14934], [21600, 21600], [14768, 12911], [16558, 12016], [11030, 6840], [12016, 6120]];
function escalarCamino(d, w, h) { return d.replace(/[\d.]+\s[\d.]+/g, m => { const [x, y] = m.split(" ").map(Number); return r2(x * w) + " " + r2(y * h); }); }

/** Camino SVG de una figura de PowerPoint. Devuelve {d, ln?, sinRelleno?}. */
function figura(prst, w, h, av) {
  const ss = Math.min(w, h), A = (k, d) => (av[k] != null ? av[k] : d);
  const rect = `M0 0H${r2(w)}V${r2(h)}H0Z`;
  switch (prst) {
    case "rect": case "flowChartProcess": case "flowChartPredefinedProcess": case "flowChartInternalStorage": case "squareTabs": case "cornerTabs": case "plaqueTabs":
    case "borderCallout1": case "borderCallout2": case "borderCallout3": case "callout1": case "callout2": case "callout3": case "accentCallout1": case "accentCallout2": case "accentCallout3":
    case "accentBorderCallout1": case "accentBorderCallout2": case "accentBorderCallout3": case "chartPlus": case "chartStar": case "chartX": case "ribbon": case "ribbon2":
    case "ellipseRibbon": case "ellipseRibbon2": case "leftRightRibbon": case "textBox":
      return { d: rect };
    case "roundRect": { const r = Math.min(ss / 2, ss * A("adj", 16667) / 100000); return { d: redondo(w, h, r, r, r, r) }; }
    case "flowChartAlternateProcess": { const r = ss / 6; return { d: redondo(w, h, r, r, r, r) }; }
    case "verticalScroll": case "horizontalScroll": { const r = ss / 8; return { d: redondo(w, h, r, r, r, r) }; }
    case "round1Rect": { const r = ss * A("adj", 16667) / 100000; return { d: redondo(w, h, 0, r, 0, 0) }; }
    case "round2SameRect": { const a = ss * A("adj1", 16667) / 100000, b = ss * A("adj2", 0) / 100000; return { d: redondo(w, h, a, a, b, b) }; }
    case "round2DiagRect": { const a = ss * A("adj1", 16667) / 100000, b = ss * A("adj2", 0) / 100000; return { d: redondo(w, h, a, b, a, b) }; }
    case "snip1Rect": { const r = ss * A("adj", 16667) / 100000; return { d: redondo(w, h, 0, r, 0, 0, [0, 1, 0, 0]) }; }
    case "snip2SameRect": { const a = ss * A("adj1", 16667) / 100000, b = ss * A("adj2", 0) / 100000; return { d: redondo(w, h, a, a, b, b, [1, 1, 1, 1]) }; }
    case "snip2DiagRect": { const a = ss * A("adj1", 0) / 100000, b = ss * A("adj2", 16667) / 100000; return { d: redondo(w, h, a, b, a, b, [1, 1, 1, 1]) }; }
    case "snipRoundRect": { const a = ss * A("adj1", 16667) / 100000, b = ss * A("adj2", 16667) / 100000; return { d: redondo(w, h, a, b, 0, 0, [0, 1, 0, 0]) }; }
    case "flowChartTerminator": { const rx = Math.min(w * .161, w / 2), ry = h / 2; return { d: `M${r2(rx)} 0H${r2(w - rx)}A${r2(rx)} ${r2(ry)} 0 0 1 ${r2(w - rx)} ${r2(h)}H${r2(rx)}A${r2(rx)} ${r2(ry)} 0 0 1 ${r2(rx)} 0Z` }; }
    case "ellipse": case "flowChartConnector": case "flowChartOr": case "flowChartSummingJunction": case "smileyFace": case "flowChartOnlineStorage":
      return { d: elipse(w / 2, h / 2, w / 2, h / 2) };
    case "triangle": case "flowChartExtract": { const x = w * A("adj", 50000) / 100000; return { d: P([[x, 0], [w, h], [0, h]]) }; }
    case "flowChartMerge": return { d: P([[0, 0], [w, 0], [w / 2, h]]) };
    case "rtTriangle": return { d: P([[0, 0], [w, h], [0, h]]) };
    case "diamond": case "flowChartDecision": case "flowChartSort": return { d: P([[w / 2, 0], [w, h / 2], [w / 2, h], [0, h / 2]]) };
    case "parallelogram": { const x = Math.min(w, ss * A("adj", 25000) / 100000); return { d: P([[x, 0], [w, 0], [w - x, h], [0, h]]) }; }
    case "flowChartInputOutput": return { d: P([[w / 5, 0], [w, 0], [w * .8, h], [0, h]]) };
    case "trapezoid": case "nonIsoscelesTrapezoid": { const x = Math.min(w / 2, ss * A("adj", 25000) / 100000); return { d: P([[0, h], [x, 0], [w - x, 0], [w, h]]) }; }
    case "flowChartManualOperation": case "funnel": return { d: P([[0, 0], [w, 0], [w * .8, h], [w * .2, h]]) };
    case "pentagon": return { d: P([[w / 2, 0], [w, h * .382], [w * .809, h], [w * .191, h], [0, h * .382]]) };
    case "hexagon": { const x = Math.min(w / 2, ss * A("adj", 25000) / 100000); return { d: P([[x, 0], [w - x, 0], [w, h / 2], [w - x, h], [x, h], [0, h / 2]]) }; }
    case "flowChartPreparation": return { d: P([[w / 5, 0], [w * .8, 0], [w, h / 2], [w * .8, h], [w / 5, h], [0, h / 2]]) };
    case "heptagon": return { d: poligono(7, w, h) };
    case "octagon": { const x = Math.min(w / 2, h / 2, ss * A("adj", 29289) / 100000); return { d: P([[x, 0], [w - x, 0], [w, x], [w, h - x], [w - x, h], [x, h], [0, h - x], [0, x]]) }; }
    case "decagon": return { d: poligono(10, w, h) };
    case "dodecagon": return { d: poligono(12, w, h) };
    case "star4": return { d: estrella(4, w, h, A("adj", 12500) / 50000) };
    case "star5": return { d: estrella(5, w, h, A("adj", 19098) / 50000) };
    case "star6": return { d: estrella(6, w, h, A("adj", 28868) / 50000) };
    case "star7": return { d: estrella(7, w, h, A("adj", 34601) / 50000) };
    case "star8": return { d: estrella(8, w, h, A("adj", 37500) / 50000) };
    case "star10": return { d: estrella(10, w, h, A("adj", 42533) / 50000) };
    case "star12": return { d: estrella(12, w, h, A("adj", 37500) / 50000) };
    case "star16": return { d: estrella(16, w, h, A("adj", 37500) / 50000) };
    case "star24": return { d: estrella(24, w, h, A("adj", 37500) / 50000) };
    case "star32": return { d: estrella(32, w, h, A("adj", 37500) / 50000) };
    case "irregularSeal1": case "irregularSeal2": return { d: estrella(12, w, h, .62) };
    case "sun": return { d: estrella(16, w, h, .72) };
    case "gear6": return { d: estrella(6, w, h, .8) };
    case "gear9": return { d: estrella(9, w, h, .82) };
    case "plus": case "quadArrow": case "leftRightUpArrow": case "quadArrowCallout": {
      const x = Math.min(w / 2, h / 2, ss * A("adj", 25000) / 100000);
      return { d: P([[x, 0], [w - x, 0], [w - x, x], [w, x], [w, h - x], [w - x, h - x], [w - x, h], [x, h], [x, h - x], [0, h - x], [0, x], [x, x]]) };
    }
    case "mathPlus": { const t = ss * A("adj1", 23520) / 200000, cx = w / 2, cy = h / 2, l = ss * .4; return { d: P([[cx - t, cy - l], [cx + t, cy - l], [cx + t, cy - t], [cx + l, cy - t], [cx + l, cy + t], [cx + t, cy + t], [cx + t, cy + l], [cx - t, cy + l], [cx - t, cy + t], [cx - l, cy + t], [cx - l, cy - t], [cx - t, cy - t]]) }; }
    case "mathMinus": { const t = h * A("adj1", 23520) / 200000; return { d: P([[w * .07, h / 2 - t], [w * .93, h / 2 - t], [w * .93, h / 2 + t], [w * .07, h / 2 + t]]) }; }
    case "mathEqual": case "mathNotEqual": { const t = h * A("adj1", 23520) / 200000, g = h * A("adj2", 11760) / 200000; return { d: P([[w * .07, h / 2 - g - 2 * t], [w * .93, h / 2 - g - 2 * t], [w * .93, h / 2 - g], [w * .07, h / 2 - g]]) + P([[w * .07, h / 2 + g], [w * .93, h / 2 + g], [w * .93, h / 2 + g + 2 * t], [w * .07, h / 2 + g + 2 * t]]) }; }
    case "mathMultiply": { const t = ss * .12; return { d: P([[t, 0], [w / 2, h / 2 - t], [w - t, 0], [w, t], [w / 2 + t, h / 2], [w, h - t], [w - t, h], [w / 2, h / 2 + t], [t, h], [0, h - t], [w / 2 - t, h / 2], [0, t]]) }; }
    case "mathDivide": { const t = h * .08; return { d: P([[w * .07, h / 2 - t], [w * .93, h / 2 - t], [w * .93, h / 2 + t], [w * .07, h / 2 + t]]) + elipse(w / 2, h * .2, ss * .1, ss * .1) + elipse(w / 2, h * .8, ss * .1, ss * .1) }; }
    case "heart": return { d: escalarCamino(CORAZON, w, h) };
    case "cloud": return { d: escalarCamino(NUBE, w, h) };
    case "cloudCallout": { const tx = w / 2 + w * A("adj1", -20833) / 100000, ty = h / 2 + h * A("adj2", 62500) / 100000; return { d: escalarCamino(NUBE, w, h) + elipse(tx + (w / 2 - tx) * .3, ty + (h / 2 - ty) * .3, ss * .05, ss * .05) + elipse(tx, ty, ss * .025, ss * .025) }; }
    case "lightningBolt": return { d: P(RAYO.map(p => [p[0] / 21600 * w, p[1] / 21600 * h])) };
    case "teardrop": return { d: `M${r2(w / 2)} 0H${r2(w)}V${r2(h / 2)}A${r2(w / 2)} ${r2(h / 2)} 0 1 1 ${r2(w / 2)} 0Z` };
    case "rightArrow": case "stripedRightArrow": case "notchedRightArrow": case "bentArrow": case "uturnArrow": case "curvedRightArrow": case "rightArrowCallout": case "circularArrow":
      return { d: flecha(w, h, "r", A("adj1", 50000), A("adj2", 50000)) };
    case "leftArrow": case "curvedLeftArrow": case "leftArrowCallout": case "leftCircularArrow": return { d: flecha(w, h, "l", A("adj1", 50000), A("adj2", 50000)) };
    case "upArrow": case "curvedUpArrow": case "upArrowCallout": case "bentUpArrow": return { d: flecha(w, h, "u", A("adj1", 50000), A("adj2", 50000)) };
    case "downArrow": case "curvedDownArrow": case "downArrowCallout": return { d: flecha(w, h, "d", A("adj1", 50000), A("adj2", 50000)) };
    case "leftRightArrow": case "leftRightArrowCallout": case "leftRightCircularArrow": return { d: flecha(w, h, "r", A("adj1", 50000), A("adj2", 50000), true) };
    case "upDownArrow": case "upDownArrowCallout": return { d: flecha(w, h, "d", A("adj1", 50000), A("adj2", 50000), true) };
    case "chevron": { const x = Math.min(w, ss * A("adj", 50000) / 100000); return { d: P([[0, 0], [w - x, 0], [w, h / 2], [w - x, h], [0, h], [x, h / 2]]) }; }
    case "homePlate": { const x = Math.min(w, ss * A("adj", 50000) / 100000); return { d: P([[0, 0], [w - x, 0], [w, h / 2], [w - x, h], [0, h]]) }; }
    case "flowChartDocument": case "flowChartMultidocument": return { d: `M0 0H${r2(w)}V${r2(h * .83)}C${r2(w * .7)} ${r2(h * .62)} ${r2(w * .45)} ${r2(h * 1.08)} 0 ${r2(h * .9)}Z` };
    case "flowChartPunchedTape": case "wave": case "doubleWave": { const y = h * A("adj1", 12500) / 100000; return { d: `M0 ${r2(y)}C${r2(w / 3)} ${r2(-y)} ${r2(2 * w / 3)} ${r2(3 * y)} ${r2(w)} ${r2(y)}V${r2(h - y)}C${r2(2 * w / 3)} ${r2(h - 3 * y)} ${r2(w / 3)} ${r2(h + y)} 0 ${r2(h - y)}Z` }; }
    case "flowChartDelay": return { d: `M0 0H${r2(w / 2)}A${r2(w / 2)} ${r2(h / 2)} 0 0 1 ${r2(w / 2)} ${r2(h)}H0Z` };
    case "flowChartManualInput": return { d: P([[0, h * .2], [w, 0], [w, h], [0, h]]) };
    case "flowChartOffpageConnector": return { d: P([[0, 0], [w, 0], [w, h * .8], [w / 2, h], [0, h * .8]]) };
    case "flowChartPunchedCard": return { d: P([[w * .2, 0], [w, 0], [w, h], [0, h], [0, h * .2]]) };
    case "flowChartCollate": return { d: P([[0, 0], [w, 0], [0, h], [w, h]]) };
    case "flowChartDisplay": return { d: `M0 ${r2(h / 2)}L${r2(w / 6)} 0H${r2(w * 5 / 6)}A${r2(w / 6)} ${r2(h / 2)} 0 0 1 ${r2(w * 5 / 6)} ${r2(h)}H${r2(w / 6)}Z` };
    case "can": case "flowChartMagneticDisk": {
      const ry = Math.min(h / 2, ss * A("adj", 25000) / 200000);
      const cuerpo = `M0 ${r2(ry)}A${r2(w / 2)} ${r2(ry)} 0 0 1 ${r2(w)} ${r2(ry)}V${r2(h - ry)}A${r2(w / 2)} ${r2(ry)} 0 0 1 0 ${r2(h - ry)}Z`;
      return { d: cuerpo, ln: cuerpo + `M0 ${r2(ry)}A${r2(w / 2)} ${r2(ry)} 0 0 0 ${r2(w)} ${r2(ry)}` };
    }
    case "cube": { const x = Math.min(w, h, ss * A("adj", 25000) / 100000); const d = P([[0, x], [w - x, x], [w - x, h], [0, h]]) + P([[0, x], [x, 0], [w, 0], [w - x, x]]) + P([[w - x, x], [w, 0], [w, h - x], [w - x, h]]); return { d }; }
    case "bevel": { const x = ss * A("adj", 12500) / 100000; return { d: rect, ln: rect + P([[x, x], [w - x, x], [w - x, h - x], [x, h - x]]) }; }
    case "donut": case "noSmoking": { const t = Math.min(ss / 2, ss * A("adj", 25000) / 100000); return { d: elipse(w / 2, h / 2, w / 2, h / 2) + elipse(w / 2, h / 2, w / 2 - t, h / 2 - t, true) }; }
    case "blockArc": { const a1 = A("adj1", 10800000) / 60000, a2 = A("adj2", 0) / 60000, t = ss * A("adj3", 25000) / 100000; return { d: anillo(w, h, a1, a2, t) }; }
    case "arc": return { d: "", ln: arco(w, h, A("adj1", 16200000) / 60000, A("adj2", 0) / 60000), sinRelleno: true };
    case "pie": return { d: arco(w, h, A("adj1", 0) / 60000, A("adj2", 16200000) / 60000, "pie") };
    case "pieWedge": return { d: `M0 ${r2(h)}A${r2(w)} ${r2(h)} 0 0 1 ${r2(w)} 0V${r2(h)}Z` };
    case "chord": return { d: arco(w, h, A("adj1", 2700000) / 60000, A("adj2", 16200000) / 60000, true) };
    case "moon": { const x = w * A("adj", 50000) / 100000; return { d: `M${r2(w)} 0A${r2(w)} ${r2(h / 2)} 0 0 0 ${r2(w)} ${r2(h)}A${r2(Math.max(1, w - x))} ${r2(h / 2)} 0 0 1 ${r2(w)} 0Z` }; }
    case "frame": { const t = Math.min(ss / 2, ss * A("adj1", 12500) / 100000); return { d: rect + `M${r2(t)} ${r2(t)}V${r2(h - t)}H${r2(w - t)}V${r2(t)}Z` }; }
    case "halfFrame": case "corner": { const x = Math.min(w, ss * A("adj1", 50000) / 100000 * (prst === "corner" ? 1 : .66)), y = Math.min(h, ss * A("adj2", 50000) / 100000 * (prst === "corner" ? 1 : .66)); return prst === "corner" ? { d: P([[0, 0], [x, 0], [x, h - y], [w, h - y], [w, h], [0, h]]) } : { d: P([[0, 0], [w, 0], [w - x, y], [y, y], [y, h - x], [0, h]]) }; }
    case "diagStripe": { const a = A("adj", 50000) / 100000; return { d: P([[0, h * a], [w * a, 0], [w, 0], [0, h]]) }; }
    case "plaque": { const r = ss * A("adj", 16667) / 100000; return { d: `M${r2(r)} 0H${r2(w - r)}A${r2(r)} ${r2(r)} 0 0 0 ${r2(w)} ${r2(r)}V${r2(h - r)}A${r2(r)} ${r2(r)} 0 0 0 ${r2(w - r)} ${r2(h)}H${r2(r)}A${r2(r)} ${r2(r)} 0 0 0 0 ${r2(h - r)}V${r2(r)}A${r2(r)} ${r2(r)} 0 0 0 ${r2(r)} 0Z` }; }
    case "foldedCorner": { const x = ss * A("adj", 16667) / 100000; return { d: P([[0, 0], [w, 0], [w, h - x], [w - x, h], [0, h]]), ln: P([[0, 0], [w, 0], [w, h - x], [w - x, h], [0, h]]) + `M${r2(w)} ${r2(h - x)}L${r2(w - x * .8)} ${r2(h - x * .8)}L${r2(w - x)} ${r2(h)}` }; }
    case "wedgeRectCallout": return { d: globo(w, h, A("adj1", -20833), A("adj2", 62500), "rect") };
    case "wedgeRoundRectCallout": return { d: globo(w, h, A("adj1", -20833), A("adj2", 62500), "round") };
    case "wedgeEllipseCallout": return { d: globo(w, h, A("adj1", -20833), A("adj2", 62500), "ellipse") };
    case "leftBracket": { const r = Math.min(h / 2, ss * A("adj", 8333) / 100000); return { d: "", ln: `M${r2(w)} 0A${r2(w)} ${r2(r)} 0 0 0 0 ${r2(r)}V${r2(h - r)}A${r2(w)} ${r2(r)} 0 0 0 ${r2(w)} ${r2(h)}`, sinRelleno: true }; }
    case "rightBracket": { const r = Math.min(h / 2, ss * A("adj", 8333) / 100000); return { d: "", ln: `M0 0A${r2(w)} ${r2(r)} 0 0 1 ${r2(w)} ${r2(r)}V${r2(h - r)}A${r2(w)} ${r2(r)} 0 0 1 0 ${r2(h)}`, sinRelleno: true }; }
    case "leftBrace": { const r = Math.min(h / 4, ss * A("adj1", 8333) / 100000), y = h * A("adj2", 50000) / 100000, x = w / 2; return { d: "", ln: `M${r2(w)} 0A${r2(x)} ${r2(r)} 0 0 0 ${r2(x)} ${r2(r)}V${r2(y - r)}A${r2(x)} ${r2(r)} 0 0 1 0 ${r2(y)}A${r2(x)} ${r2(r)} 0 0 1 ${r2(x)} ${r2(y + r)}V${r2(h - r)}A${r2(x)} ${r2(r)} 0 0 0 ${r2(w)} ${r2(h)}`, sinRelleno: true }; }
    case "rightBrace": { const r = Math.min(h / 4, ss * A("adj1", 8333) / 100000), y = h * A("adj2", 50000) / 100000, x = w / 2; return { d: "", ln: `M0 0A${r2(x)} ${r2(r)} 0 0 1 ${r2(x)} ${r2(r)}V${r2(y - r)}A${r2(x)} ${r2(r)} 0 0 0 ${r2(w)} ${r2(y)}A${r2(x)} ${r2(r)} 0 0 0 ${r2(x)} ${r2(y + r)}V${r2(h - r)}A${r2(x)} ${r2(r)} 0 0 1 0 ${r2(h)}`, sinRelleno: true }; }
    case "bracketPair": { const r = Math.min(w / 2, h / 2, ss * A("adj", 16667) / 100000); return { d: "", ln: `M${r2(r)} ${r2(h)}A${r2(r)} ${r2(r)} 0 0 1 0 ${r2(h - r)}V${r2(r)}A${r2(r)} ${r2(r)} 0 0 1 ${r2(r)} 0M${r2(w - r)} 0A${r2(r)} ${r2(r)} 0 0 1 ${r2(w)} ${r2(r)}V${r2(h - r)}A${r2(r)} ${r2(r)} 0 0 1 ${r2(w - r)} ${r2(h)}`, sinRelleno: true }; }
    case "bracePair": { const r = Math.min(w / 4, h / 4, ss * A("adj", 8333) / 100000); return { d: "", ln: `M${r2(2 * r)} ${r2(h)}A${r2(r)} ${r2(r)} 0 0 1 ${r2(r)} ${r2(h - r)}V${r2(h / 2 + r)}A${r2(r)} ${r2(r)} 0 0 0 0 ${r2(h / 2)}A${r2(r)} ${r2(r)} 0 0 0 ${r2(r)} ${r2(h / 2 - r)}V${r2(r)}A${r2(r)} ${r2(r)} 0 0 1 ${r2(2 * r)} 0M${r2(w - 2 * r)} 0A${r2(r)} ${r2(r)} 0 0 1 ${r2(w - r)} ${r2(r)}V${r2(h / 2 - r)}A${r2(r)} ${r2(r)} 0 0 0 ${r2(w)} ${r2(h / 2)}A${r2(r)} ${r2(r)} 0 0 0 ${r2(w - r)} ${r2(h / 2 + r)}V${r2(h - r)}A${r2(r)} ${r2(r)} 0 0 1 ${r2(w - 2 * r)} ${r2(h)}`, sinRelleno: true }; }
    case "line": case "straightConnector1": return { d: "", ln: `M0 0L${r2(w)} ${r2(h)}`, sinRelleno: true };
    case "lineInv": return { d: "", ln: `M0 ${r2(h)}L${r2(w)} 0`, sinRelleno: true };
    case "bentConnector2": return { d: "", ln: `M0 0H${r2(w)}V${r2(h)}`, sinRelleno: true };
    case "bentConnector3": case "bentConnector5": { const x = w * A("adj1", 50000) / 100000; return { d: "", ln: `M0 0H${r2(x)}V${r2(h)}H${r2(w)}`, sinRelleno: true }; }
    case "bentConnector4": { const x = w * A("adj1", 50000) / 100000, y = h * A("adj2", 50000) / 100000; return { d: "", ln: `M0 0H${r2(x)}V${r2(y)}H${r2(w)}V${r2(h)}`, sinRelleno: true }; }
    case "curvedConnector2": return { d: "", ln: `M0 0C${r2(w / 2)} 0 ${r2(w)} ${r2(h / 2)} ${r2(w)} ${r2(h)}`, sinRelleno: true };
    case "curvedConnector3": case "curvedConnector4": case "curvedConnector5": { const x = w * A("adj1", 50000) / 100000; return { d: "", ln: `M0 0C${r2(x)} 0 ${r2(x)} ${r2(h)} ${r2(w)} ${r2(h)}`, sinRelleno: true }; }
  }
  if (/^actionButton|^flowChart/.test(prst)) return { d: rect };
  return { d: rect };
}

/** Camino de una geometría libre (a:custGeom). */
function figuraLibre(cg, w, h) {
  const gd = {};
  for (const g of todos(hijo(cg, "gdLst"), "gd")) { const m = /^val\s+(-?[\d.]+)/.exec(at(g, "fmla") || ""); if (m) gd[at(g, "name")] = +m[1]; }
  const v = x => { if (x == null) return 0; const n = parseFloat(x); if (isFinite(n) && String(n) === String(x).trim()) return n; if (x in gd) return gd[x]; return isFinite(n) ? n : 0; };
  let d = "", ln = "", relleno = false, todosCierran = true;
  for (const p of hijos(hijo(cg, "pathLst"), "path")) {
    const pw = num(at(p, "w"), 0), ph = num(at(p, "h"), 0);
    const sx = pw ? w / pw : 1 / EMU, sy = ph ? h / ph : 1 / EMU;
    let s = "", cx = 0, cy = 0, x0 = 0, y0 = 0;
    for (const c of hijos(p)) {
      const pts = hijos(c, "pt").map(q => [v(at(q, "x")), v(at(q, "y"))]);
      const f = q => r2(q[0] * sx) + " " + r2(q[1] * sy);
      switch (c.localName) {
        case "moveTo": if (pts[0]) { s += "M" + f(pts[0]); [cx, cy] = pts[0]; [x0, y0] = pts[0]; } break;
        case "lnTo": if (pts[0]) { s += "L" + f(pts[0]); [cx, cy] = pts[0]; } break;
        case "cubicBezTo": if (pts.length === 3) { s += "C" + pts.map(f).join(" "); [cx, cy] = pts[2]; } break;
        case "quadBezTo": if (pts.length === 2) { s += "Q" + pts.map(f).join(" "); [cx, cy] = pts[1]; } break;
        case "arcTo": {
          const wR = v(at(c, "wR")), hR = v(at(c, "hR")), st = v(at(c, "stAng")) / 60000 * Math.PI / 180, sw = v(at(c, "swAng")) / 60000 * Math.PI / 180;
          if (!wR || !hR) break;
          const par = a => Math.atan2(wR * Math.sin(a), hR * Math.cos(a));
          const t1 = par(st), t2 = par(st + sw);
          const ox = cx - wR * Math.cos(t1), oy = cy - hR * Math.sin(t1);
          const ex = ox + wR * Math.cos(t2), ey = oy + hR * Math.sin(t2);
          if (Math.abs(sw) >= 2 * Math.PI - 1e-6) { const mx = ox - wR * Math.cos(t1), my = oy - hR * Math.sin(t1); s += `A${r2(wR * sx)} ${r2(hR * sy)} 0 1 ${sw > 0 ? 1 : 0} ${r2(mx * sx)} ${r2(my * sy)}`; }
          s += `A${r2(wR * sx)} ${r2(hR * sy)} 0 ${Math.abs(sw) > Math.PI ? 1 : 0} ${sw > 0 ? 1 : 0} ${r2(ex * sx)} ${r2(ey * sy)}`;
          cx = ex; cy = ey; break;
        }
        case "close": s += "Z"; cx = x0; cy = y0; break;
      }
    }
    if (!/Z\s*$/.test(s)) todosCierran = false;
    const fill = at(p, "fill"), stroke = at(p, "stroke");
    if (fill !== "none") { d += s; relleno = true; }
    if (stroke !== "0" && stroke !== "false") ln += s;
  }
  return { d, ln: ln !== d ? ln : undefined, sinRelleno: !relleno, abierto: !todosCierran };
}
function ajustes(geo) {
  const av = {};
  for (const g of todos(hijo(geo, "avLst"), "gd")) { const m = /^val\s+(-?[\d.]+)/.exec(at(g, "fmla") || ""); if (m) av[at(g, "name")] = +m[1]; }
  return av;
}
/** Después de ubicar todo (grupos incluidos), calcula los caminos con el tamaño final. */
function cerrarGeometria(el) {
  if (el.kids) el.kids.forEach(cerrarGeometria);
  const geo = el._geo; delete el._geo;
  if (!geo) return;
  const w = Math.max(el.w, .01), h = Math.max(el.h, .01);
  const g = geo.localName === "custGeom" ? figuraLibre(geo, w, h) : figura(at(geo, "prst") || "rect", w, h, ajustes(geo));
  if (el.t === "img") { if (geo.localName !== "prstGeom" || at(geo, "prst") !== "rect") { el.geo = 1; el.path = g.d || g.ln; } return; }
  el.path = g.d || g.ln || "";
  if (g.ln && g.ln !== g.d) el.pathLn = g.ln;
  if (g.sinRelleno) el.fill = null;
  if (el.t === "shp" && !el.fill && !el.ln && !el.tx && !el.sh) el._vacio = true;
}

/* =============================== texto =============================== */
const WINGDINGS = { "§": "▪", "Ø": "➢", "ü": "✔", "q": "❑", "v": "❖", "n": "■", "l": "●", "o": "□", "Ú": "►", "è": "➔", "à": "➢", "w": "⬥", "u": "◆", "ð": "➡", "þ": "☑", "¨": "◻", "Ü": "✓", "Ÿ": "•", "ª": "★", "«": "★", "Ł": "◆", "": "▪", "": "➢", "": "✔", "": "❑", "": "❖", "": "■", "": "●" };
const SYMBOL = { "·": "•", "": "•", "-": "–", "Þ": "⇒", "®": "®", "o": "○" };
function vinieta(ch, fuente) {
  const f = String(fuente || "").toLowerCase();
  if (f.startsWith("wingdings")) return { ch: WINGDINGS[ch] || "•", f: null };
  if (f === "symbol") return { ch: SYMBOL[ch] || ch, f: null };
  return { ch, f: fuente || null };
}
function leerPPr(el, C) {
  const o = {}; if (!el) return o;
  const al = at(el, "algn"); if (al) o.al = al;
  if (at(el, "marL") != null) o.marL = num(at(el, "marL"), 0) / EMU;
  if (at(el, "indent") != null) o.ind = num(at(el, "indent"), 0) / EMU;
  for (const k of hijos(el)) {
    const n = k.localName;
    if (n === "lnSpc") o.ls = espacio(k); else if (n === "spcBef") o.sb = espacio(k); else if (n === "spcAft") o.sa = espacio(k);
    else if (n === "buNone") o.bu = false;
    else if (n === "buChar") o.bu = { ch: at(k, "char") || "•" };
    else if (n === "buAutoNum") o.bu = { num: at(k, "type") || "arabicPeriod", start: num(at(k, "startAt"), 1) };
    else if (n === "buBlip") o.bu = { ch: "•" };
    else if (n === "buClr") { const c = colorDe(k, C); if (c) o.buC = c.c; }
    else if (n === "buClrTx") o.buC = null;
    else if (n === "buSzPct") { o.buSz = num(at(k, "val"), 100000) / 100000; o.buPts = null; }
    else if (n === "buSzPts") o.buPts = num(at(k, "val"), 0) / 100;
    else if (n === "buSzTx") { o.buSz = 1; o.buPts = null; }
    else if (n === "buFont") o.buF = at(k, "typeface");
    else if (n === "buFontTx") o.buF = null;
    else if (n === "defRPr") o.def = leerRPr(k, C);
  }
  return o;
}
function espacio(k) { const p = hijo(k, "spcPct"), t = hijo(k, "spcPts"); if (p) return { pct: num(at(p, "val"), 100000) / 100000 }; if (t) return { pt: num(at(t, "val"), 0) / 100 }; return null; }
function leerRPr(el, C) {
  const o = {}; if (!el) return o;
  const sz = at(el, "sz"); if (sz != null) o.sz = num(sz, 1800) / 100;
  const b = at(el, "b"); if (b != null) o.b = si(b);
  const i = at(el, "i"); if (i != null) o.i = si(i);
  const u = at(el, "u"); if (u != null) o.u = u !== "none";
  const st = at(el, "strike"); if (st != null) o.st = st !== "noStrike";
  const cap = at(el, "cap"); if (cap != null) o.cap = cap === "none" ? "" : cap;
  const spc = at(el, "spc"); if (spc != null) o.spc = num(spc, 0) / 100;
  const base = at(el, "baseline"); if (base != null) o.base = num(base, 0);
  for (const k of hijos(el)) {
    const n = k.localName;
    if (n === "solidFill") { const c = colorDe(k, C); if (c) o.c = c; }
    else if (n === "noFill") o.c = { c: "#000000", a: 0 };
    else if (n === "gradFill") { const g = degradado(k, C); if (g) o.c = g.g ? { c: g.g.stops[0][1], a: g.g.stops[0][2] } : { c: g.c, a: g.a }; }
    else if (n === "latin") o.f = at(k, "typeface");
    else if (n === "highlight") { const c = colorDe(k, C); if (c) o.hl = c.c; }
    else if (n === "effectLst") { const s = hijo(k, "outerShdw"); if (s) { const x = sombraDe(k, C); if (x) o.sh = x; } else o.sh = ""; }
    else if (n === "ln") { const l = leerLn(k, C); if (l.c && !l.no) o.ol = { w: r2(Math.max(.5, l.w || 1)), c: l.c }; else if (l.no) o.ol = null; }
    else if (n === "hlinkClick") o.link = true;
  }
  return o;
}
function cuerpoTexto(bodyPrs) {
  const o = { anchor: "t", ins: [91440, 45720, 91440, 45720].map(v => v / EMU), wrap: true, vert: null, cols: 1, colGap: 0, fit: null, shrink: false };
  for (const b of bodyPrs) {
    if (!b) continue;
    if (at(b, "anchor")) o.anchor = at(b, "anchor");
    ["lIns", "tIns", "rIns", "bIns"].forEach((k, i) => { if (at(b, k) != null) o.ins[i] = num(at(b, k), 0) / EMU; });
    if (at(b, "wrap")) o.wrap = at(b, "wrap") !== "none";
    if (at(b, "vert")) o.vert = at(b, "vert") === "horz" ? null : at(b, "vert");
    if (at(b, "numCol")) o.cols = num(at(b, "numCol"), 1);
    if (at(b, "spcCol")) o.colGap = num(at(b, "spcCol"), 0) / EMU;
    const na = hijo(b, "normAutofit");
    if (na) { o.shrink = true; o.fit = { s: num(at(na, "fontScale"), 100000) / 100000, l: num(at(na, "lnSpcReduction"), 0) / 100000 }; }
    else if (hijo(b, "spAutoFit") || hijo(b, "noAutofit")) { o.shrink = false; o.fit = null; }
  }
  return o;
}
function textoPlano(txBody) { return hijos(txBody, "p").map(p => todos(p, "t").map(t => t.textContent).join("")).join("\n").trim(); }

/* =============================== animaciones =============================== */
const EFECTO_ID = { 1: "appear", 2: "fly", 3: "fade", 4: "zoom", 5: "fade", 6: "circle", 7: "fly", 8: "circle", 9: "fade", 10: "fade", 11: "appear", 12: "fly", 13: "zoom", 14: "fade", 15: "spin", 16: "split", 17: "zoom", 18: "wipe", 19: "swivel", 20: "circle", 21: "circle", 22: "wipe", 23: "zoom", 24: "fade", 25: "swivel", 26: "bounce", 27: "appear", 28: "fly", 29: "zoom", 30: "float", 31: "spin", 34: "fly", 35: "spin", 37: "float", 38: "swivel", 39: "spin", 40: "float", 41: "swivel", 42: "float", 43: "swivel", 45: "fade", 47: "float", 48: "swivel", 49: "spin", 50: "zoom", 51: "zoom", 52: "zoom", 53: "zoom", 54: "zoom", 55: "zoom", 56: "zoom" };
const VUELO = { 1: "u", 2: "r", 4: "d", 8: "l", 3: "ru", 6: "rd", 9: "lu", 12: "ld" };
function tipoEfecto(ec, clase) {
  const pid = num(at(ec, "presetID"), 0), sub = num(at(ec, "presetSubtype"), 0);
  const filtros = todos(ec, "animEffect").map(e => at(e, "filter") || "").join(" ");
  if (clase === "emph") {
    const e = { 6: "pulse", 28: "pulse", 26: "pulse", 33: "pulse", 8: "spinE", 32: "teeter", 34: "teeter", 35: "blink", 27: "blink", 10: "blink" }[pid] || "pulse";
    return { e };
  }
  let e = EFECTO_ID[pid] || null, dir = null;
  if (!e) {
    if (/wipe/.test(filtros)) e = "wipe"; else if (/barn/.test(filtros)) e = "split"; else if (/circle|wheel|wedge|diamond|plus|box/.test(filtros)) e = "circle";
    else if (todos(ec, "animScale").length) e = "zoom"; else if (todos(ec, "animRot").length) e = "spin";
    else if (todos(ec, "anim").some(a => /ppt_[xy]/.test(todos(a, "attrName").map(n => n.textContent).join(" ")))) e = "fly";
    else e = "fade";
  }
  if (e === "fly") dir = VUELO[sub] || "d";
  if (e === "wipe") {
    const m = /wipe\((up|down|left|right)\)/.exec(filtros);
    dir = m ? { up: "u", down: "d", left: "r", right: "l" }[m[1]] : ({ 1: "d", 2: "r", 4: "u", 8: "l" }[sub] || "u");
    if (clase === "exit") dir = { u: "d", d: "u", l: "r", r: "l" }[dir];
  }
  if (e === "split") dir = /Horizontal/.test(filtros) ? "v" : "h";
  if (e === "float") dir = pid === 47 ? "u" : "d";
  return { e, dir };
}
function demora(ctn) {
  let d = 0;
  for (const c of hijos(hijo(ctn, "stCondLst"), "cond")) { const v = at(c, "delay"); if (v && v !== "indefinite") d = Math.max(d, num(v, 0)); }
  return d;
}
/** Lee la línea de tiempo de una diapositiva y marca en cada elemento en qué clic entra o sale. */
function leerAnimaciones(timing, ids) {
  const res = { pasos: 0 };
  if (!timing) return res;
  // medios: repetir, silencio, ocultar cuando no suena
  for (const m of todos(timing, "cMediaNode")) {
    const sp = todos(m, "spTgt")[0]; const info = sp && ids[at(sp, "spid")]; if (!info) continue;
    const ct = hijo(m, "cTn");
    if (at(ct, "repeatCount") === "indefinite") info.el.loop = true;
    if (si(at(m, "mute"))) info.el.mudo = true;
    if (at(m, "showWhenStopped") === "0") info.el.esconder = true;
  }
  const raices = todos(timing, "cTn").filter(c => at(c, "nodeType") === "mainSeq" || at(c, "nodeType") === "interactiveSeq");
  let paso = 0;
  const marcar = (ec, k, espera) => {
    const clase = at(ec, "presetClass");
    const tgt = todos(ec, "spTgt")[0]; if (!tgt) return;
    const info = ids[at(tgt, "spid")]; if (!info) return;
    if (clase === "mediacall") {
      const cmd = todos(ec, "cmd")[0]; const c = cmd ? at(cmd, "cmd") || "" : "";
      if (/^playFrom/.test(c) && info.el.auto == null && (info.el.t === "vid" || info.el.t === "aud" || info.el.t === "yt")) info.el.auto = k;
      return;
    }
    if (clase !== "entr" && clase !== "exit" && clase !== "emph") return;
    let dur = 0;
    for (const c of todos(ec, "cTn")) { const d = num(at(c, "dur"), NaN); if (isFinite(d)) dur = Math.max(dur, d + demora(c)); }
    const tipo = tipoEfecto(ec, clase);
    const ef = { p: k, e: tipo.e, t: Math.round(clamp(dur || 500, 1, 20000)) };
    if (tipo.dir) ef.dir = tipo.dir;
    if (espera) ef.w = Math.round(espera);
    const aplicar = obj => {
      const an = obj.an || (obj.an = {});
      if (clase === "entr") { if (!an.in && !an.out) an.in = ef; }
      else if (clase === "exit") { if (!an.out && (!an.in || an.in.p <= k)) an.out = ef; }
      else (an.em || (an.em = [])).push(ef);
    };
    const pRg = todos(tgt, "pRg")[0];
    if (pRg && info.el.tx) {
      const ps = info.el.tx.paras || [];
      for (let i = num(at(pRg, "st"), 0); i <= num(at(pRg, "end"), 0) && i < ps.length; i++) aplicar(ps[i]);
    } else aplicar(info.el);
  };
  for (const raiz of raices) {
    const interactiva = at(raiz, "nodeType") === "interactiveSeq";
    let primero = true;
    for (const g of hijos(hijo(raiz, "childTnLst"), "par")) {
      const gc = hijo(g, "cTn");
      const auto = !interactiva && primero && hijos(hijo(gc, "stCondLst"), "cond").some(c => at(c, "evt") === "onBegin");
      primero = false;
      const k = auto ? 0 : ++paso;
      for (const sub of hijos(hijo(gc, "childTnLst"), "par")) {
        const sc = hijo(sub, "cTn"); const d1 = demora(sc);
        for (const ef of hijos(hijo(sc, "childTnLst"), "par")) { const ec = hijo(ef, "cTn"); if (ec) marcar(ec, k, d1 + demora(ec)); }
      }
    }
  }
  res.pasos = paso;
  return res;
}
const TRANS = {
  fade: "fade", dissolve: "fade", randomBar: "fade", blinds: "fade", checker: "fade", comb: "push", strips: "wipe", newsflash: "zoom", zoom: "zoom", random: "fade",
  push: "push", wipe: "wipe", cover: "cover", pull: "uncover", split: "split", circle: "circle", diamond: "circle", plus: "circle", wedge: "circle", wheel: "circle",
  vortex: "zoom", ripple: "zoom", glitter: "fade", honeycomb: "zoom", flash: "fade", prism: "push", doors: "split", window: "split", shred: "fade", ferris: "push",
  flythrough: "zoom", warp: "zoom", gallery: "push", conveyor: "push", pan: "push", reveal: "fade", switch: "push", flip: "push", wheelReverse: "circle",
  prstTrans: "fade", morph: "fade", cut: "none"
};
function leerTransicion(sld) {
  let tr = null;
  for (const ac of hijos(sld, "AlternateContent")) {
    for (const ch of hijos(ac, "Choice")) { const t = hijo(ch, "transition"); if (t) { tr = t; break; } }
    if (!tr) { const t = ruta(ac, "Fallback", "transition"); if (t) tr = t; }
  }
  if (!tr) tr = hijo(sld, "transition");
  if (!tr) return {};
  const out = {};
  const adv = at(tr, "advTm"); if (adv != null) out.avanzar = num(adv, 0);
  const spd = at(tr, "spd");
  const dur = num(atL(tr, "dur"), spd === "slow" ? 1000 : spd === "med" ? 750 : 500);
  const k = hijos(tr).find(x => x.localName !== "sndAc" && x.localName !== "extLst");
  if (!k) return out;
  const tipo = TRANS[k.localName] || "fade";
  if (tipo === "none") { if (si(at(k, "thruBlk"))) out.trans = { e: "fade", t: dur }; return out; }
  const t = { e: tipo, t: Math.round(clamp(dur, 200, 3000)) };
  let dir = at(k, "dir");
  if (tipo === "split") dir = at(k, "orient") === "vert" ? "h" : "v";
  else if (dir) dir = { l: "l", r: "r", u: "u", d: "d", lu: "l", ru: "r", ld: "l", rd: "r", horz: "l", vert: "u", in: "l", out: "l" }[dir] || "l";
  if (dir) t.dir = dir;
  out.trans = t;
  return out;
}

/* =============================== gráficos (se dibujan como SVG) =============================== */
const escX = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function puntosCache(el) {
  const c = todos(el, "numCache")[0] || todos(el, "strCache")[0] || todos(el, "numLit")[0] || todos(el, "strLit")[0] || todos(el, "lvl")[0];
  const out = []; if (!c) return out;
  for (const p of hijos(c, "pt")) out[num(at(p, "idx"), out.length)] = ruta(p, "v") ? ruta(p, "v").textContent : "";
  const n = num(at(hijo(c, "ptCount"), "val"), out.length); for (let i = 0; i < n; i++) if (out[i] === undefined) out[i] = "";
  return out;
}
function pasoBonito(max) {
  if (max <= 0) return 1; const bruto = max / 5, e = Math.pow(10, Math.floor(Math.log10(bruto))), f = bruto / e;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e;
}
function formatoNum(v) { const a = Math.abs(v); return a >= 1e6 ? r2(v / 1e6, 1) + "M" : a >= 1e4 ? r2(v / 1e3, 1) + "k" : String(r2(v, 2)); }
function graficoSvg(doc, W, H, C) {
  const cs = doc && doc.documentElement; const chart = hijo(cs, "chart"); const plot = hijo(chart, "plotArea"); if (!plot) return null;
  const fuente = familiaCss(C.tema.menor).replace(/"/g, "'");
  const dr = todos(hijo(cs, "txPr"), "defRPr")[0];
  const cTx = (dr && colorDe(hijo(dr, "solidFill"), C)) || { c: "#595959" };
  const fs = clamp(dr && at(dr, "sz") ? num(at(dr, "sz"), 1000) / 100 * PT : Math.min(W, H) / 26, 9, 40);
  const acentos = ["accent1", "accent2", "accent3", "accent4", "accent5", "accent6"].map(a => esquema(a, C));
  const colorN = i => { const b = acentos[i % 6]; if (i < 6) return b; const k = Math.floor(i / 6); const x = hexRgb(b); return rgbHex(x[0] * (1 - .25 * k), x[1] * (1 - .25 * k), x[2] * (1 - .25 * k)); };
  let titulo = null;
  const tEl = hijo(chart, "title"); if (tEl) titulo = todos(tEl, "t").map(t => t.textContent).join("") || null;
  const series = [];
  const grupos = hijos(plot).filter(k => /Chart$/.test(k.localName));
  grupos.forEach(g => {
    const tipo = g.localName.replace("3D", "").replace("Chart", "");
    const dir = at(hijo(g, "barDir"), "val") || "col", grp = at(hijo(g, "grouping"), "val") || "clustered";
    const varyColors = si(at(hijo(g, "varyColors"), "val"));
    hijos(g, "ser").forEach(s => {
      const i = series.length;
      const nombre = puntosCache(hijo(s, "tx"))[0] || (hijo(s, "tx") ? hijo(s, "tx").textContent : "") || "Serie " + (i + 1);
      const cats = puntosCache(hijo(s, "cat") || hijo(s, "xVal"));
      const vals = puntosCache(hijo(s, "val") || hijo(s, "yVal")).map(v => num(v, 0));
      const sp = hijo(s, "spPr");
      const col = (sp && colorDe(hijo(sp, "solidFill"), C)) || (sp && colorDe(hijo(hijo(sp, "ln"), "solidFill"), C));
      const puntos = {};
      hijos(s, "dPt").forEach(d => { const c = colorDe(hijo(hijo(d, "spPr"), "solidFill"), C); if (c) puntos[num(at(hijo(d, "idx"), "val"), 0)] = c.c; });
      const dl = hijo(s, "dLbls") || hijo(g, "dLbls");
      series.push({ tipo, dir, grp, varyColors, nombre, cats, vals, color: col ? col.c : colorN(i), puntos, valores: dl && si(at(hijo(dl, "showVal"), "val")), porc: dl && si(at(hijo(dl, "showPercent"), "val")), hueco: num(at(hijo(g, "holeSize"), "val"), 50), ang: num(at(hijo(g, "firstSliceAng"), "val"), 0), gap: num(at(hijo(g, "gapWidth"), "val"), 150) });
    });
  });
  if (!series.length) return null;
  if (tEl && !titulo && series.length === 1) titulo = series[0].nombre;
  if (!tEl && !si(at(hijo(chart, "autoTitleDeleted"), "val")) && series.length === 1) titulo = series[0].nombre;
  let o = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r2(W)} ${r2(H)}" font-family="${escX(fuente)}" font-size="${r2(fs)}" fill="${cTx.c}">`;
  const bgc = colorDe(hijo(hijo(cs, "spPr"), "solidFill"), C); if (bgc) o += `<rect width="${r2(W)}" height="${r2(H)}" fill="${bgc.c}"/>`;
  let top = fs * .6, bottom = H - fs * .6, left = fs * .6, right = W - fs * .6;
  if (titulo) { o += `<text x="${r2(W / 2)}" y="${r2(top + fs * 1.3)}" text-anchor="middle" font-size="${r2(fs * 1.45)}">${escX(titulo)}</text>`; top += fs * 2.4; }
  const torta = series[0].tipo === "pie" || series[0].tipo === "doughnut" || series[0].tipo === "ofPie";
  const leg = hijo(chart, "legend");
  const legPos = leg ? at(hijo(leg, "legendPos"), "val") || "r" : null;
  const items = torta ? series[0].cats.map((c, i) => [c || String(i + 1), series[0].puntos[i] || colorN(i)]) : series.map(s => [s.nombre, s.color]);
  if (legPos) {
    if (legPos === "r" || legPos === "l") {
      const lw = Math.min(W * .35, Math.max(...items.map(x => String(x[0]).length)) * fs * .6 + fs * 2);
      const x0 = legPos === "r" ? right - lw : left; const y0 = (top + bottom) / 2 - items.length * fs * .75;
      items.forEach((it, i) => { const y = y0 + i * fs * 1.5; o += `<rect x="${r2(x0)}" y="${r2(y)}" width="${r2(fs * .8)}" height="${r2(fs * .8)}" fill="${it[1]}"/><text x="${r2(x0 + fs * 1.2)}" y="${r2(y + fs * .75)}">${escX(it[0])}</text>`; });
      if (legPos === "r") right -= lw + fs; else left += lw + fs;
    } else {
      const anchoItem = items.map(x => String(x[0]).length * fs * .6 + fs * 2.2), total = anchoItem.reduce((a, b) => a + b, 0);
      let x = Math.max(left, W / 2 - total / 2); const y = legPos === "t" ? top + fs * .2 : bottom - fs * 1.1;
      items.forEach((it, i) => { o += `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(fs * .8)}" height="${r2(fs * .8)}" fill="${it[1]}"/><text x="${r2(x + fs * 1.1)}" y="${r2(y + fs * .75)}">${escX(it[0])}</text>`; x += anchoItem[i]; });
      if (legPos === "t") top += fs * 1.8; else bottom -= fs * 1.8;
    }
  }
  if (torta) {
    const s = series[0]; const tot = s.vals.reduce((a, b) => a + Math.max(0, b), 0) || 1;
    const cx = (left + right) / 2, cy = (top + bottom) / 2, r = Math.max(5, Math.min(right - left, bottom - top) / 2 - fs * .5), ri = s.tipo === "doughnut" ? r * s.hueco / 100 : 0;
    let a = (s.ang - 90) * Math.PI / 180;
    s.vals.forEach((v, i) => {
      if (v <= 0) return; const da = v / tot * 2 * Math.PI, b = a + da, lg = da > Math.PI ? 1 : 0;
      const P1 = [cx + r * Math.cos(a), cy + r * Math.sin(a)], P2 = [cx + r * Math.cos(b), cy + r * Math.sin(b)];
      let d = da >= 2 * Math.PI - 1e-6 ? elipse(cx, cy, r, r) : `M${r2(cx)} ${r2(cy)}L${r2(P1[0])} ${r2(P1[1])}A${r2(r)} ${r2(r)} 0 ${lg} 1 ${r2(P2[0])} ${r2(P2[1])}Z`;
      if (ri) { const Q1 = [cx + ri * Math.cos(b), cy + ri * Math.sin(b)], Q2 = [cx + ri * Math.cos(a), cy + ri * Math.sin(a)]; d = `M${r2(P1[0])} ${r2(P1[1])}A${r2(r)} ${r2(r)} 0 ${lg} 1 ${r2(P2[0])} ${r2(P2[1])}L${r2(Q1[0])} ${r2(Q1[1])}A${r2(ri)} ${r2(ri)} 0 ${lg} 0 ${r2(Q2[0])} ${r2(Q2[1])}Z`; }
      o += `<path d="${d}" fill="${s.puntos[i] || colorN(i)}" stroke="#ffffff" stroke-width="1.5"/>`;
      if (s.valores || s.porc) { const m = (a + b) / 2, rr = ri ? (r + ri) / 2 : r * .65; o += `<text x="${r2(cx + rr * Math.cos(m))}" y="${r2(cy + rr * Math.sin(m) + fs * .35)}" text-anchor="middle" fill="#ffffff" font-weight="700">${escX(s.porc ? Math.round(v / tot * 100) + "%" : formatoNum(v))}</text>`; }
      a = b;
    });
    return o + "</svg>";
  }
  // ejes
  const horizontal = series.some(s => s.tipo === "bar" && s.dir === "bar");
  const cats = series.reduce((m, s) => (s.cats.length > m.length ? s.cats : m), []);
  const n = Math.max(cats.length, ...series.map(s => s.vals.length));
  const apilado = series.some(s => /stacked/i.test(s.grp));
  const porciento = series.some(s => s.grp === "percentStacked");
  let max = 0, min = 0;
  for (let i = 0; i < n; i++) {
    if (apilado) { let p = 0, q = 0; series.forEach(s => { const v = s.vals[i] || 0; if (v >= 0) p += v; else q += v; }); max = Math.max(max, p); min = Math.min(min, q); }
    else series.forEach(s => { const v = s.vals[i] || 0; max = Math.max(max, v); min = Math.min(min, v); });
  }
  if (porciento) { max = 100; min = 0; }
  const paso = pasoBonito(Math.max(max - min, 1e-9)); max = Math.ceil(max / paso) * paso || paso; min = Math.floor(min / paso) * paso;
  const etiquetaAncho = Math.max(formatoNum(max).length, formatoNum(min).length) * fs * .62 + fs * .6;
  const catAncho = horizontal ? Math.min((right - left) * .3, Math.max(...cats.map(c => String(c).length)) * fs * .6 + fs) : 0;
  if (horizontal) left += catAncho; else left += etiquetaAncho;
  if (!horizontal) bottom -= fs * 1.6; else bottom -= fs * 1.4;
  const PW = right - left, PH = bottom - top; if (PW < 10 || PH < 10) return o + "</svg>";
  const escV = v => (horizontal ? left + (v - min) / (max - min) * PW : bottom - (v - min) / (max - min) * PH);
  for (let v = min; v <= max + paso / 2; v += paso) {
    const p = escV(v);
    o += horizontal ? `<line x1="${r2(p)}" y1="${r2(top)}" x2="${r2(p)}" y2="${r2(bottom)}" stroke="#d9d9d9" stroke-width="1"/><text x="${r2(p)}" y="${r2(bottom + fs * 1.2)}" text-anchor="middle">${escX(formatoNum(v))}${porciento ? "%" : ""}</text>`
      : `<line x1="${r2(left)}" y1="${r2(p)}" x2="${r2(right)}" y2="${r2(p)}" stroke="#d9d9d9" stroke-width="1"/><text x="${r2(left - fs * .4)}" y="${r2(p + fs * .35)}" text-anchor="end">${escX(formatoNum(v))}${porciento ? "%" : ""}</text>`;
  }
  const banda = (horizontal ? PH : PW) / Math.max(1, n);
  cats.forEach((c, i) => {
    const m = (horizontal ? top : left) + banda * (i + .5);
    o += horizontal ? `<text x="${r2(left - fs * .4)}" y="${r2(m + fs * .35)}" text-anchor="end">${escX(c)}</text>` : `<text x="${r2(m)}" y="${r2(bottom + fs * 1.2)}" text-anchor="middle">${escX(c)}</text>`;
  });
  const barras = series.filter(s => s.tipo === "bar");
  const totales = rango(n).map(i => series.reduce((a, s) => a + Math.abs(s.vals[i] || 0), 0) || 1);
  if (barras.length) {
    const gap = (barras[0].gap || 150) / 100; const grupo = banda / (1 + gap); const anchoB = apilado ? grupo : grupo / barras.length;
    const acum = rango(n).map(() => [0, 0]);
    barras.forEach((s, k) => {
      for (let i = 0; i < n; i++) {
        let v = s.vals[i] || 0; if (porciento) v = v / totales[i] * 100;
        let v0 = 0; if (apilado) { if (v >= 0) { v0 = acum[i][0]; acum[i][0] += v; } else { v0 = acum[i][1]; acum[i][1] += v; } }
        const base = (horizontal ? top : left) + banda * i + (banda - grupo) / 2 + (apilado ? 0 : k * anchoB);
        const a = escV(v0), b = escV(v0 + v);
        const col = s.varyColors && barras.length === 1 ? (s.puntos[i] || colorN(i)) : (s.puntos[i] || s.color);
        o += horizontal ? `<rect x="${r2(Math.min(a, b))}" y="${r2(base)}" width="${r2(Math.abs(b - a))}" height="${r2(anchoB)}" fill="${col}"/>` : `<rect x="${r2(base)}" y="${r2(Math.min(a, b))}" width="${r2(anchoB)}" height="${r2(Math.abs(b - a))}" fill="${col}"/>`;
        if (s.valores) o += horizontal ? `<text x="${r2(Math.max(a, b) + fs * .3)}" y="${r2(base + anchoB / 2 + fs * .35)}">${escX(formatoNum(s.vals[i] || 0))}</text>` : `<text x="${r2(base + anchoB / 2)}" y="${r2(Math.min(a, b) - fs * .3)}" text-anchor="middle">${escX(formatoNum(s.vals[i] || 0))}</text>`;
      }
    });
  }
  const acumL = rango(n).map(() => 0);
  series.filter(s => s.tipo === "line" || s.tipo === "area" || s.tipo === "scatter" || s.tipo === "radar").forEach(s => {
    const pts = rango(n).map(i => { let v = s.vals[i] || 0; if (porciento) v = v / totales[i] * 100; if (apilado) { acumL[i] += v; v = acumL[i]; } return [left + banda * (i + .5), escV(v)]; });
    if (s.tipo === "area") o += `<path d="M${r2(pts[0][0])} ${r2(escV(Math.max(min, 0)))}L${pts.map(p => r2(p[0]) + " " + r2(p[1])).join("L")}L${r2(pts[pts.length - 1][0])} ${r2(escV(Math.max(min, 0)))}Z" fill="${s.color}" fill-opacity=".75"/>`;
    else o += `<polyline points="${pts.map(p => r2(p[0]) + "," + r2(p[1])).join(" ")}" fill="none" stroke="${s.color}" stroke-width="${r2(Math.max(2, fs * .22))}" stroke-linejoin="round" stroke-linecap="round"/>` + pts.map(p => `<circle cx="${r2(p[0])}" cy="${r2(p[1])}" r="${r2(Math.max(2.5, fs * .25))}" fill="${s.color}"/>`).join("");
    if (s.valores) pts.forEach((p, i) => { o += `<text x="${r2(p[0])}" y="${r2(p[1] - fs * .6)}" text-anchor="middle">${escX(formatoNum(s.vals[i] || 0))}</text>`; });
  });
  o += horizontal ? `<line x1="${r2(escV(Math.max(min, 0)))}" y1="${r2(top)}" x2="${r2(escV(Math.max(min, 0)))}" y2="${r2(bottom)}" stroke="#a6a6a6"/>` : `<line x1="${r2(left)}" y1="${r2(escV(Math.max(min, 0)))}" x2="${r2(right)}" y2="${r2(escV(Math.max(min, 0)))}" stroke="#a6a6a6"/>`;
  return o + "</svg>";
}

/* =============================== imágenes =============================== */
async function aBitmap(blob) {
  try { return await createImageBitmap(blob); }
  catch (e) {
    return new Promise((ok, mal) => { const u = URL.createObjectURL(blob); const im = new Image(); im.onload = () => { URL.revokeObjectURL(u); ok(im); }; im.onerror = () => { URL.revokeObjectURL(u); mal(new Error("imagen")); }; im.src = u; });
  }
}
function canvasDe(img, max) {
  const iw = img.width || img.naturalWidth, ih = img.height || img.naturalHeight;
  const k = Math.min(1, max / Math.max(iw, ih));
  const cv = document.createElement("canvas"); cv.width = Math.max(1, Math.round(iw * k)); cv.height = Math.max(1, Math.round(ih * k));
  const g = cv.getContext("2d"); g.imageSmoothingQuality = "high"; g.drawImage(img, 0, 0, cv.width, cv.height);
  return { cv, g, k };
}
function tieneAlfa(g, w, h) {
  const paso = Math.max(1, Math.floor(Math.sqrt(w * h / 250000)));
  const d = g.getImageData(0, 0, w, h).data;
  for (let y = 0; y < h; y += paso) for (let x = 0; x < w; x += paso) if (d[(y * w + x) * 4 + 3] < 250) return true;
  return false;
}
const aBlob = (cv, tipo, q) => new Promise(ok => cv.toBlob(ok, tipo, q));
/** Achica fotos muy grandes para que suban rápido y quepan en la tele. */
async function medidas(blob, mime) {
  try {
    const b = new Uint8Array(await blob.slice(0, Math.min(blob.size, 256 * 1024)).arrayBuffer());
    if (mime === "image/png" && b.length > 24) return [(b[16] << 24 | b[17] << 16 | b[18] << 8 | b[19]) >>> 0, (b[20] << 24 | b[21] << 16 | b[22] << 8 | b[23]) >>> 0];
    if (mime === "image/jpeg") { let i = 2; while (i < b.length - 9) { if (b[i] !== 0xFF) { i++; continue; } const m = b[i + 1]; if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) return [b[i + 7] << 8 | b[i + 8], b[i + 5] << 8 | b[i + 6]]; i += 2 + (b[i + 2] << 8 | b[i + 3]); } }
  } catch (e) { }
  return null;
}
async function prepararImagen(blob, mime, op = {}) {
  if (mime === "image/svg+xml" || mime === "image/gif") return { blob, mime };
  let pesada = blob.size > (op.limite || 900 * 1024) || mime === "image/bmp" || op.quitar || op.forzar;
  if (!pesada) { const m = await medidas(blob, mime); if (m && Math.max(m[0], m[1]) > (op.max || 2560)) pesada = true; }
  if (!pesada) return { blob, mime };
  let img; try { img = await aBitmap(blob); } catch (e) { return mime === "image/bmp" ? null : { blob, mime }; }
  const { cv, g, k } = canvasDe(img, op.max || 2560);
  if (img.close) img.close();
  if (op.quitar) {
    const [qr, qg, qb] = hexRgb(op.quitar); const id = g.getImageData(0, 0, cv.width, cv.height); const d = id.data;
    for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - qr) < 10 && Math.abs(d[i + 1] - qg) < 10 && Math.abs(d[i + 2] - qb) < 10) d[i + 3] = 0;
    g.putImageData(id, 0, 0);
  }
  const alfa = !!op.quitar || (mime !== "image/jpeg" && tieneAlfa(g, cv.width, cv.height));
  const tipo = alfa ? "image/png" : "image/jpeg";
  const out = await aBlob(cv, tipo, .86);
  if (!out) return { blob, mime };
  if (!op.quitar && !op.forzar && k === 1 && out.size >= blob.size && mime !== "image/bmp") return { blob, mime };
  return { blob: out, mime: tipo, w: cv.width, h: cv.height };
}
async function portadaDe(blob, ancho = 360) {
  try { const img = await aBitmap(blob); const { cv } = canvasDe(img, ancho); if (img.close) img.close(); return cv.toDataURL("image/jpeg", .72); } catch (e) { return null; }
}
/** Saca una foto de un cuadro del video para usarla de portada; también da la duración. */
export function datosVideo(blob) {
  return new Promise(ok => {
    const v = document.createElement("video"); v.muted = true; v.playsInline = true; v.preload = "auto";
    const url = URL.createObjectURL(blob); let listo = false;
    const fin = r => { if (listo) return; listo = true; try { v.removeAttribute("src"); v.load(); } catch (e) { } URL.revokeObjectURL(url); ok(r); };
    v.onloadedmetadata = () => { const d = v.duration; if (!v.videoWidth) return fin({ dur: isFinite(d) ? d : 0 }); try { v.currentTime = Math.min(1.2, (isFinite(d) ? d : 3) / 3); } catch (e) { fin({ dur: d }); } };
    v.onseeked = async () => {
      try {
        const k = Math.min(1, 1280 / Math.max(v.videoWidth, v.videoHeight)); const cv = document.createElement("canvas");
        cv.width = Math.round(v.videoWidth * k); cv.height = Math.round(v.videoHeight * k); cv.getContext("2d").drawImage(v, 0, 0, cv.width, cv.height);
        const b = await aBlob(cv, "image/jpeg", .8);
        fin({ poster: b, w: v.videoWidth, h: v.videoHeight, dur: isFinite(v.duration) ? v.duration : 0 });
      } catch (e) { fin({ w: v.videoWidth, h: v.videoHeight, dur: v.duration }); }
    };
    v.onerror = () => fin(null);
    setTimeout(() => fin(null), 15000);
    v.src = url;
  });
}
/** ¿El video viene en HEVC (H.265)? Muchas teles no lo reproducen en el navegador. */
export async function esHevc(blob) {
  const buscar = async (b) => { const t = new Uint8Array(await b.arrayBuffer()); for (let i = 0; i < t.length - 4; i++) if (t[i] === 104 && ((t[i + 1] === 118 && t[i + 2] === 99 && t[i + 3] === 49) || (t[i + 1] === 101 && t[i + 2] === 118 && t[i + 3] === 49))) return true; return false; };
  const n = 3 * 1024 * 1024;
  try { return (await buscar(blob.slice(0, n))) || (blob.size > n && await buscar(blob.slice(Math.max(n, blob.size - n)))); } catch (e) { return false; }
}

/* =============================== YouTube =============================== */
export function parsearYouTube(txt) {
  const s = String(txt || "").trim();
  const m = /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/.exec(s) || /^([A-Za-z0-9_-]{11})$/.exec(s);
  if (!m) return null;
  let t = 0; const q = /[?&#](?:t|start)=([\dhms]+)/.exec(s);
  if (q) { const x = q[1]; if (/^\d+$/.test(x)) t = +x; else { const h = /(\d+)h/.exec(x), mi = /(\d+)m/.exec(x), se = /(\d+)s/.exec(x); t = (h ? +h[1] * 3600 : 0) + (mi ? +mi[1] * 60 : 0) + (se ? +se[1] : 0); } }
  return { id: m[1], t };
}

/* =============================== el lector de PowerPoint =============================== */
class Recursos {
  constructor(lote) { this.lote = lote; this.n = 0; this.lista = []; this.memo = {}; }
  agregar(blob, mime, extra) { const id = this.lote + (this.n++).toString(36); this.lista.push(Object.assign({ id, blob, mime: mime || blob.type, size: blob.size }, extra || {})); return id; }
  una(clave, fn) { if (!(clave in this.memo)) this.memo[clave] = fn().catch(() => null); return this.memo[clave]; }
}
class LectorPptx {
  constructor(zip, rec, avance) { this.zip = zip; this.rec = rec; this.avance = avance || (() => { }); this.docs = {}; this.relsCache = {}; this.relsDoc = new WeakMap(); this.layouts = {}; this.masters = {}; this.avisos = new Set(); this.fuentes = new Set(); this.estilosTabla = null; }
  async xml(p) {
    if (!p) return null;
    if (!(p in this.docs)) {
      this.docs[p] = (async () => { const f = this.zip.file(p); if (!f) return null; const d = xmlDe(await f.async("string")); if (d) this.relsDoc.set(d, await this.rels(p)); return d; })();
    }
    return this.docs[p];
  }
  async rels(p) {
    if (this.relsCache[p]) return this.relsCache[p];
    const dir = p.slice(0, p.lastIndexOf("/") + 1), base = p.slice(p.lastIndexOf("/") + 1);
    const f = this.zip.file(dir + "_rels/" + base + ".rels"); const m = {};
    if (f) { const d = xmlDe(await f.async("string")); if (d) for (const r of todos(d.documentElement, "Relationship")) { const ex = at(r, "TargetMode") === "External"; const t = at(r, "Target") || ""; m[at(r, "Id")] = { tipo: (at(r, "Type") || "").split("/").pop(), destino: ex ? t : resolver(dir, t), externo: ex }; } }
    return (this.relsCache[p] = m);
  }
  relsDe(el) { return (el && this.relsDoc.get(el.ownerDocument)) || {}; }
  fuente(f, C) {
    if (!f) return null;
    if (/^\+mj/.test(f)) f = C.tema.mayor; else if (/^\+mn/.test(f)) f = C.tema.menor;
    if (f) this.fuentes.add(f);
    return f;
  }
  /** Imagen usada por un a:blip. Devuelve el id del archivo (o null si el formato no sirve en el navegador). */
  async imagenDeBlip(blip, rels) {
    if (!blip) return null;
    const cand = [];
    const svg = todos(blip, "svgBlip")[0]; const rs = svg && rid(svg, "embed");
    if (rs && rels[rs] && !rels[rs].externo) cand.push(rels[rs].destino);
    const r = rid(blip, "embed") || rid(blip, "link");
    if (r && rels[r] && !rels[r].externo) cand.push(rels[r].destino);
    const cc = hijo(blip, "clrChange"); let quitar = null;
    if (cc) { const c = colorDe(hijo(cc, "clrFrom"), { tema: { colores: {} }, mapa: {} }); const to = hijo(cc, "clrTo"); const a = to && todos(to, "alpha")[0]; if (c && (!a || num(at(a, "val"), 0) === 0)) quitar = c.c; }
    for (const p of cand) { const id = await this.imagen(p, quitar); if (id) return id; }
    return null;
  }
  imagen(p, quitar) {
    return this.rec.una("img:" + p + "|" + (quitar || ""), async () => {
      const f = this.zip.file(p); if (!f) return null;
      const mime = MIME[ext(p)] || "application/octet-stream";
      if (!IMG_OK.test(mime)) { this.avisos.add(mime === "image/x-emf" || mime === "image/x-wmf" ? "Algunas imágenes estaban en formato EMF/WMF (de Windows) y no se pueden mostrar en la tele." : "Algunas imágenes estaban en un formato que la tele no muestra (" + ext(p) + ")."); return null; }
      const blob = await f.async("blob");
      const pr = await prepararImagen(new Blob([blob], { type: mime }), mime, quitar ? { quitar } : {});
      if (!pr) return null;
      return this.rec.agregar(pr.blob, pr.mime);
    });
  }
  medio(p) {
    return this.rec.una("media:" + p, async () => {
      const f = this.zip.file(p); if (!f) return null;
      const mime = MIME[ext(p)] || "application/octet-stream";
      if (!VID_OK.test(mime) && !AUD_OK.test(mime)) { this.avisos.add(`Un video o audio está en formato .${ext(p)}, que la tele no reproduce. Convertilo a MP4 (videos) o MP3 (audio).`); return null; }
      const blob = new Blob([await f.async("blob")], { type: mime === "video/quicktime" ? "video/mp4" : mime });
      const extra = {};
      if (/^video/.test(mime)) { const d = await datosVideo(blob); if (d) extra.dur = d.dur; if (await esHevc(blob)) this.avisos.add("Un video está en formato HEVC (H.265). Puede que la tele no lo reproduzca; si pasa, convertilo a MP4 H.264."); }
      return this.rec.agregar(blob, blob.type, extra);
    });
  }
  async layout(p) {
    if (this.layouts[p]) return this.layouts[p];
    const doc = await this.xml(p); const rels = await this.rels(p); const r = doc && doc.documentElement;
    const mp = Object.values(rels).find(x => x.tipo === "slideMaster");
    return (this.layouts[p] = { doc, rels, raiz: r, master: mp ? mp.destino : null, ph: listaPh(r), mostrarMaestro: at(r, "showMasterSp") !== "0", mapa: mapaOverride(r), bg: ruta(r, "cSld", "bg"), arbol: ruta(r, "cSld", "spTree") });
  }
  async master(p) {
    if (this.masters[p]) return this.masters[p];
    const doc = await this.xml(p); const rels = await this.rels(p); const r = doc && doc.documentElement;
    const tp = Object.values(rels).find(x => x.tipo === "theme");
    const tdoc = tp ? await this.xml(tp.destino) : null;
    const tema = leerTema(tdoc, tp ? await this.rels(tp.destino) : {});
    const tx = hijo(r, "txStyles");
    return (this.masters[p] = { doc, rels, raiz: r, tema, mapa: mapaColores(hijo(r, "clrMap")) || { bg1: "lt1", tx1: "dk1", bg2: "lt2", tx2: "dk2" }, ph: listaPh(r), titulo: hijo(tx, "titleStyle"), cuerpo: hijo(tx, "bodyStyle"), otro: hijo(tx, "otherStyle"), bg: ruta(r, "cSld", "bg"), arbol: ruta(r, "cSld", "spTree") });
  }
  async leerEstilosTabla() {
    if (this.estilosTabla) return this.estilosTabla;
    const p = Object.values(await this.rels("ppt/presentation.xml")).find(x => x.tipo === "tableStyles");
    const d = p ? await this.xml(p.destino) : null; const m = {};
    if (d) for (const s of todos(d.documentElement, "tblStyle")) m[at(s, "styleId")] = s;
    return (this.estilosTabla = m);
  }
}
function listaPh(raiz) {
  const out = [];
  for (const ph of todos(ruta(raiz, "cSld", "spTree"), "ph")) {
    let sp = ph.parentNode; while (sp && !/^(sp|pic|graphicFrame|cxnSp)$/.test(sp.localName)) sp = sp.parentNode;
    if (sp) out.push({ tipo: at(ph, "type") || "obj", idx: at(ph, "idx"), sp });
  }
  return out;
}
function mapaOverride(raiz) { const o = ruta(raiz, "clrMapOvr", "overrideClrMapping"); return o ? mapaColores(o) : null; }
const TIPO_MAESTRO = { ctrTitle: "title", title: "title", subTitle: "body", obj: "body", body: "body", dt: "dt", ftr: "ftr", sldNum: "sldNum", hdr: "hdr" };
function buscarPh(ph, lay, mas) {
  const tipo = at(ph, "type") || "obj", idx = at(ph, "idx");
  let l = null;
  if (lay) {
    if (idx != null) l = lay.ph.find(p => p.idx === idx && (tipo === "obj" || p.tipo === tipo || TIPO_MAESTRO[p.tipo] === TIPO_MAESTRO[tipo]));
    if (!l && idx != null) l = lay.ph.find(p => p.idx === idx);
    if (!l) l = lay.ph.find(p => p.tipo === tipo) || lay.ph.find(p => TIPO_MAESTRO[p.tipo] && TIPO_MAESTRO[p.tipo] === TIPO_MAESTRO[tipo] && (tipo === "title" || tipo === "ctrTitle"));
  }
  const tm = TIPO_MAESTRO[l ? l.tipo : tipo] || "body";
  const m = mas ? (mas.ph.find(p => (TIPO_MAESTRO[p.tipo] || p.tipo) === tm) || null) : null;
  return { lay: l ? l.sp : null, mas: m ? m.sp : null, tipo };
}

/** Lo que se necesita para procesar las figuras de una parte (diapositiva, diseño o patrón). */
class Contexto {
  constructor(L, C, lay, mas, op) { Object.assign(this, { L, C, lay, mas, numero: op.numero || 1, plantilla: !!op.plantilla, ids: op.ids || null, res: { titulo: null, primerTexto: null }, w: op.w, h: op.h, defecto: op.defecto }); }
  hijo(cambios) { const x = Object.create(this); Object.assign(x, cambios); return x; }
}
function leerXfrm(x) {
  if (!x) return null;
  const off = hijo(x, "off"), e = hijo(x, "ext");
  return { x: num(at(off, "x"), 0) / EMU, y: num(at(off, "y"), 0) / EMU, w: num(at(e, "cx"), 0) / EMU, h: num(at(e, "cy"), 0) / EMU, rot: num(at(x, "rot"), 0) / 60000, fh: si(at(x, "flipH")), fv: si(at(x, "flipV")) };
}
function ubicar(el, xf) {
  el.x = r2(xf.x); el.y = r2(xf.y); el.w = r2(xf.w); el.h = r2(xf.h);
  if (xf.rot) el.rot = r2(xf.rot); if (xf.fh) el.fh = 1; if (xf.fv) el.fv = 1;
  return el;
}
const oculto = cNvPr => si(at(cNvPr, "hidden"));

/** Convierte un párrafo de PowerPoint al formato de diapos.js */
function procesarTexto(txBody, capas, bodyPrs, X) {
  const C = X.C, L = X.L;
  const cuerpo = cuerpoTexto(bodyPrs);
  const tx = { paras: [] };
  if (cuerpo.anchor !== "t") tx.anchor = cuerpo.anchor;
  tx.ins = cuerpo.ins.map(v => r2(v, 1));
  if (!cuerpo.wrap) tx.wrap = false;
  if (cuerpo.vert) tx.vert = cuerpo.vert;
  if (cuerpo.cols > 1) { tx.cols = cuerpo.cols; tx.colGap = r2(cuerpo.colGap); }
  if (cuerpo.fit && (cuerpo.fit.s < 1 || cuerpo.fit.l > 0)) tx.fit = { s: r2(cuerpo.fit.s, 3), l: r2(cuerpo.fit.l, 3) };
  if (cuerpo.shrink) tx.shrink = true;
  const cache = new Map();
  const nivelProps = lvl => {
    if (cache.has(lvl)) return cache.get(lvl);
    let pp = {}, rp = {};
    for (const capa of capas) {
      if (!capa) continue;
      if (capa.rp) { Object.assign(rp, capa.rp); continue; }
      if (!capa.lst) continue;
      for (const el of [hijo(capa.lst, "defPPr"), hijo(capa.lst, "lvl" + (lvl + 1) + "pPr")]) {
        if (!el) continue; const x = leerPPr(el, C); const def = x.def; delete x.def; Object.assign(pp, x); if (def) Object.assign(rp, def);
      }
    }
    const r = { pp, rp }; cache.set(lvl, r); return r;
  };
  let alguno = false;
  for (const p of hijos(txBody, "p")) {
    const pPr = hijo(p, "pPr"); const lvl = clamp(num(at(pPr, "lvl"), 0), 0, 8);
    const base = nivelProps(lvl);
    const pp = Object.assign({}, base.pp), rpBase = Object.assign({}, base.rp);
    if (pPr) { const x = leerPPr(pPr, C); const def = x.def; delete x.def; Object.assign(pp, x); if (def) Object.assign(rpBase, def); }
    const runs = [];
    for (const k of hijos(p)) {
      const n = k.localName;
      if (n === "r" || n === "fld") {
        const propio = leerRPr(hijo(k, "rPr"), C);
        const r = Object.assign({}, rpBase, propio);
        let t = (hijo(k, "t") || { textContent: "" }).textContent.replace(/\u000b/g, "\n");
        if (n === "fld" && /^slidenum$/i.test(at(k, "type") || "")) t = String(X.numero);
        if (!t) continue;
        if (r.link && !propio.c) { r.c = { c: esquema("hlink", C), a: 1 }; r.u = true; }
        runs.push(salidaRun(r, t, X));
      } else if (n === "br") runs.push({ br: 1 });
    }
    const fin = Object.assign({}, rpBase, leerRPr(hijo(p, "endParaRPr"), C));
    const para = {};
    if (pp.al && pp.al !== "l") para.al = pp.al;
    if (pp.marL) para.marL = r2(pp.marL, 1);
    if (pp.ind) para.ind = r2(pp.ind, 1);
    if (pp.sb && (pp.sb.pct || pp.sb.pt)) para.sb = pp.sb;
    if (pp.sa && (pp.sa.pct || pp.sa.pt)) para.sa = pp.sa;
    if (pp.ls && !(pp.ls.pct === 1)) para.ls = pp.ls;
    if (lvl) para.lvl = lvl;
    para.sz = r2((runs.find(r => r.sz) || {}).sz || fin.sz || 18, 1);
    const hayTexto = runs.some(r => r.t && r.t.trim());
    if (pp.bu && hayTexto) {
      const r0 = runs.find(r => r.t) || {};
      const b = {};
      if (pp.bu.num) { b.num = pp.bu.num; if (pp.bu.start && pp.bu.start !== 1) b.start = pp.bu.start; }
      else { const v = vinieta(pp.bu.ch, pp.buF); b.ch = v.ch; if (v.f) b.f = v.f; }
      if (pp.buPts) b.sz = r2(pp.buPts / (r0.sz || para.sz || 18), 2); else if (pp.buSz && pp.buSz !== 1) b.sz = r2(pp.buSz, 2);
      if (pp.buC) b.c = pp.buC;
      para.bu = b;
    }
    para.runs = runs;
    if (hayTexto) alguno = true;
    tx.paras.push(para);
    if (hayTexto && !X.res.primerTexto) X.res.primerTexto = runs.map(r => r.t || "").join("").trim();
  }
  return alguno ? tx : null;
}
function salidaRun(r, t, X) {
  const o = { t };
  if (r.sz) o.sz = r2(r.sz, 1);
  if (r.b) o.b = 1; if (r.i) o.i = 1; if (r.u) o.u = 1; if (r.st) o.st = 1;
  const c = r.c || { c: esquema("tx1", X.C), a: 1 };
  o.c = c.c; if (c.a != null && c.a < 1) o.a = c.a;
  const f = X.L.fuente(r.f || "+mn-lt", X.C); if (f) o.f = f;
  if (r.cap) o.cap = r.cap; if (r.spc) o.spc = r2(r.spc, 1); if (r.base) o.base = r.base;
  if (r.hl) o.hl = r.hl; if (r.sh) o.sh = r.sh; if (r.ol) o.ol = r.ol;
  return o;
}

/** Procesa un nodo del árbol de figuras. Devuelve una lista de elementos. */
async function nodo(n, X) {
  try {
    switch (n.localName) {
      case "sp": return lista(await forma(n, X));
      case "pic": return lista(await imagen(n, X));
      case "grpSp": return lista(await grupo(n, X));
      case "cxnSp": return lista(await forma(n, X, true));
      case "graphicFrame": return lista(await marco(n, X));
      case "AlternateContent": { const fb = hijo(n, "Fallback"); const ch = hijo(n, "Choice"); const out = []; for (const k of hijos(fb || ch)) out.push(...await nodo(k, X)); return out; }
    }
  } catch (e) { console.warn("Figura no leída", e); }
  return [];
}
const lista = x => (x ? [x] : []);
async function arbol(spTree, X) {
  const out = [];
  for (const k of hijos(spTree)) { if (k.localName === "nvGrpSpPr" || k.localName === "grpSpPr" || k.localName === "extLst") continue; out.push(...await nodo(k, X)); }
  return out;
}
function registrar(X, cNvPr, el) { if (X.ids && cNvPr && el) X.ids[at(cNvPr, "id")] = { el }; }

async function forma(sp, X, conector) {
  const nv = hijo(sp, conector ? "nvCxnSpPr" : "nvSpPr"), cNvPr = hijo(nv, "cNvPr");
  if (oculto(cNvPr)) return null;
  const ph = ruta(nv, "nvPr", "ph");
  if (ph && X.plantilla) return null;
  const her = ph ? buscarPh(ph, X.lay, X.mas) : {};
  const spPr = hijo(sp, "spPr");
  const spPrs = [spPr, her.lay && hijo(her.lay, "spPr"), her.mas && hijo(her.mas, "spPr")].filter(Boolean);
  let xf = null; for (const s of spPrs) { xf = leerXfrm(hijo(s, "xfrm")); if (xf) break; }
  if (!xf) return null;
  const estilo = hijo(sp, "style") || (her.lay && hijo(her.lay, "style")) || (her.mas && hijo(her.mas, "style"));
  const el = ubicar({ t: conector ? "line" : "shp" }, xf);
  let geo = null; for (const s of spPrs) { geo = hijo(s, "prstGeom") || hijo(s, "custGeom"); if (geo) break; }
  el._geo = geo || (conector ? xmlDe('<a:prstGeom xmlns:a="x" prst="line"/>').documentElement : null);
  if (!conector) {
    let f; for (const s of spPrs) { f = await rellenoDe(s, X.C, X.L, X.L.relsDe(s)); if (f !== undefined) break; }
    if (f === undefined && estilo) f = await rellenoEstilo(hijo(estilo, "fillRef"), X.C, X.L);
    if (f) el.fill = f;
  }
  const ln = lineaFinal(spPrs.map(s => hijo(s, "ln")), estilo && hijo(estilo, "lnRef"), X.C);
  if (ln) el.ln = ln;
  const sh = efectosDe(spPrs, estilo, X.C); if (sh) el.sh = sh;
  const txBody = hijo(sp, "txBody");
  if (txBody && !conector) {
    const tipo = ph ? (at(ph, "type") || "obj") : null;
    const base = !ph ? X.defecto : (tipo === "title" || tipo === "ctrTitle") ? X.mas.titulo : /^(dt|ftr|sldNum|hdr)$/.test(tipo) ? X.mas.otro : X.mas.cuerpo;
    const fr = estilo && hijo(estilo, "fontRef");
    const capaFont = fr ? { rp: Object.assign({}, colorDe(fr, X.C) ? { c: colorDe(fr, X.C) } : {}, { f: at(fr, "idx") === "major" ? "+mj-lt" : "+mn-lt" }) } : null;
    const capas = [{ lst: base }, her.mas && { lst: ruta(her.mas, "txBody", "lstStyle") }, her.lay && { lst: ruta(her.lay, "txBody", "lstStyle") }, capaFont, { lst: hijo(txBody, "lstStyle") }];
    const bodyPrs = [her.mas && ruta(her.mas, "txBody", "bodyPr"), her.lay && ruta(her.lay, "txBody", "bodyPr"), hijo(txBody, "bodyPr")];
    const tx = procesarTexto(txBody, capas, bodyPrs, X);
    if (tx) {
      el.tx = tx;
      if ((tipo === "title" || tipo === "ctrTitle") && !X.res.titulo) X.res.titulo = textoPlano(txBody);
    }
  }
  // En la presentación, PowerPoint no muestra los marcadores vacíos (ni su relleno)
  if ((ph && !el.tx) || (!el.fill && !el.ln && !el.tx && !el.sh && !conector)) { registrar(X, cNvPr, el); return null; }
  registrar(X, cNvPr, el);
  return el;
}

async function imagen(pic, X) {
  const nv = hijo(pic, "nvPicPr"), cNvPr = hijo(nv, "cNvPr");
  if (oculto(cNvPr)) return null;
  const nvPr = hijo(nv, "nvPr"); const ph = hijo(nvPr, "ph");
  if (ph && X.plantilla) return null;
  const her = ph ? buscarPh(ph, X.lay, X.mas) : {};
  const spPr = hijo(pic, "spPr");
  const spPrs = [spPr, her.lay && hijo(her.lay, "spPr"), her.mas && hijo(her.mas, "spPr")].filter(Boolean);
  let xf = null; for (const s of spPrs) { xf = leerXfrm(hijo(s, "xfrm")); if (xf) break; }
  if (!xf) return null;
  const rels = X.L.relsDe(pic);
  const blipFill = hijo(pic, "blipFill"), blip = hijo(blipFill, "blip");
  const vf = hijo(nvPr, "videoFile"), af = hijo(nvPr, "audioFile"), qt = hijo(nvPr, "quickTimeFile"), media = todos(nvPr, "media")[0];
  let el;
  if (vf || af || qt || media) {
    const cand = [media && rid(media, "embed"), media && rid(media, "link"), vf && rid(vf, "link"), af && rid(af, "link"), qt && rid(qt, "link")].filter(Boolean);
    let interno = null, externo = null;
    for (const r of cand) { const x = rels[r]; if (!x) continue; if (!x.externo && !interno) interno = x.destino; else if (x.externo && !externo) externo = x.destino; }
    const poster = await X.L.imagenDeBlip(blip, rels);
    const yt = externo ? parsearYouTube(externo) : null;
    if (interno) {
      const src = await X.L.medio(interno);
      if (src) {
        const esAudio = !!af || /^audio/.test(MIME[ext(interno)] || "");
        el = ubicar({ t: esAudio ? "aud" : "vid", id: "m" + at(cNvPr, "id"), src, fit: "fill" }, xf);
        if (poster) el.poster = poster;
        const info = X.L.rec.lista.find(a => a.id === src); if (info && info.dur) el.dur = r2(info.dur, 1);
        const trim = todos(media, "trim")[0]; if (trim && num(at(trim, "st"), 0)) el.ini = r2(num(at(trim, "st"), 0) / 1000, 1);
      }
    } else if (yt) {
      el = ubicar({ t: "yt", id: "m" + at(cNvPr, "id"), yt: yt.id }, xf); if (yt.t) el.ini = yt.t;
    } else if (externo) X.L.avisos.add("Un video estaba enlazado a un archivo de la compu (no venía dentro del PowerPoint). Insertalo de nuevo o subilo aparte como video.");
    if (!el && poster) el = ubicar({ t: "img", src: poster }, xf);
    if (!el) return null;
  } else {
    const src = await X.L.imagenDeBlip(blip, rels);
    if (!src) return null;
    el = ubicar({ t: "img", src }, xf);
    const sr = hijo(blipFill, "srcRect");
    if (sr) { const c = { l: num(at(sr, "l"), 0) / 100000, t: num(at(sr, "t"), 0) / 100000, r: num(at(sr, "r"), 0) / 100000, b: num(at(sr, "b"), 0) / 100000 }; if (c.l || c.t || c.r || c.b) el.crop = { l: r2(c.l, 4), t: r2(c.t, 4), r: r2(c.r, 4), b: r2(c.b, 4) }; }
    let geo = null; for (const s of spPrs) { geo = hijo(s, "prstGeom") || hijo(s, "custGeom"); if (geo) break; }
    if (geo) el._geo = geo;
  }
  // efectos de imagen
  const am = hijo(blip, "alphaModFix"); if (am) el.op = r2(num(at(am, "amt"), 100000) / 100000, 3);
  const fx = [];
  if (hijo(blip, "grayscl")) fx.push("grayscale(1)");
  const lum = hijo(blip, "lum"); if (lum) { const b = num(at(lum, "bright"), 0) / 100000, c = num(at(lum, "contrast"), 0) / 100000; if (b) fx.push(`brightness(${r2(1 + b, 2)})`); if (c) fx.push(`contrast(${r2(1 + c, 2)})`); }
  if (hijo(blip, "biLevel")) fx.push("grayscale(1) contrast(4)");
  if (hijo(blip, "duotone")) fx.push("grayscale(.6)");
  if (fx.length) el.fx = fx.join(" ");
  const ln = lineaFinal(spPrs.map(s => hijo(s, "ln")), hijo(hijo(pic, "style"), "lnRef"), X.C); if (ln) el.ln = ln;
  const sh = efectosDe(spPrs, hijo(pic, "style"), X.C); if (sh) el.sh = sh;
  registrar(X, cNvPr, el);
  return el;
}

function transformar(e, dx, dy, sx, sy) {
  e.x = r2((e.x + dx) * sx); e.y = r2((e.y + dy) * sy); e.w = r2(e.w * sx); e.h = r2(e.h * sy);
  if (e.kids) e.kids.forEach(k => transformar(k, 0, 0, sx, sy));
  if (e.colW) { e.colW = e.colW.map(v => r2(v * sx)); e.rowH = e.rowH.map(v => r2(v * sy)); }
}
async function grupo(g, X) {
  const nv = hijo(g, "nvGrpSpPr"), cNvPr = hijo(nv, "cNvPr");
  if (oculto(cNvPr)) return null;
  const gp = hijo(g, "grpSpPr"), x = hijo(gp, "xfrm");
  const grpFill = await rellenoDe(gp, X.C, X.L, X.L.relsDe(gp));
  const X2 = X.hijo({ C: Object.assign({}, X.C, { grpFill: grpFill === undefined ? X.C.grpFill : grpFill }), ids: null });
  const kids = await arbol(g, X2);
  if (!kids.length) return null;
  if (!x) { const el = { t: "grp", x: 0, y: 0, w: X.w, h: X.h, kids }; registrar(X, cNvPr, el); return el; }
  const xf = leerXfrm(x);
  const cho = hijo(x, "chOff"), che = hijo(x, "chExt");
  const cx = num(at(cho, "x"), 0) / EMU, cy = num(at(cho, "y"), 0) / EMU, cw = num(at(che, "cx"), 0) / EMU, chh = num(at(che, "cy"), 0) / EMU;
  const sx = cw ? xf.w / cw : 1, sy = chh ? xf.h / chh : 1;
  kids.forEach(k => transformar(k, -cx, -cy, sx, sy));
  const el = ubicar({ t: "grp", kids }, xf);
  delete el.fh; delete el.fv;
  registrar(X, cNvPr, el);
  return el;
}

async function marco(gf, X) {
  const nv = hijo(gf, "nvGraphicFramePr"), cNvPr = hijo(nv, "cNvPr");
  if (oculto(cNvPr)) return null;
  const ph = ruta(nv, "nvPr", "ph"); if (ph && X.plantilla) return null;
  let xf = leerXfrm(hijo(gf, "xfrm"));
  if (!xf && ph) { const her = buscarPh(ph, X.lay, X.mas); const s = her.lay || her.mas; xf = s && leerXfrm(ruta(s, "spPr", "xfrm")); }
  if (!xf) return null;
  const gd = ruta(gf, "graphic", "graphicData"); const uri = at(gd, "uri") || "";
  const rels = X.L.relsDe(gf);
  let el = null;
  if (/\/table$/.test(uri)) el = await tabla(hijo(gd, "tbl"), xf, X);
  else if (/\/chart$/.test(uri)) {
    const c = hijo(gd, "chart"); const r = c && rels[rid(c, "id")];
    const doc = r ? await X.L.xml(r.destino) : null;
    const svg = doc ? graficoSvg(doc, xf.w, xf.h, X.C) : null;
    if (svg) el = ubicar({ t: "svg", svg }, xf); else X.L.avisos.add("Un gráfico no se pudo leer.");
  } else if (/\/diagram$/.test(uri)) {
    const ids = todos(gd, "relIds")[0]; const dm = ids && rels[rid(ids, "dm")];
    let dibujo = null;
    if (dm) { const dd = await X.L.xml(dm.destino); const ext2 = dd && todos(dd.documentElement, "dataModelExt")[0]; const rr = ext2 && rels[at(ext2, "relId")]; if (rr) dibujo = rr.destino; }
    if (!dibujo) { const r = Object.values(rels).find(x => x.tipo === "diagramDrawing"); if (r) dibujo = r.destino; }
    const doc = dibujo ? await X.L.xml(dibujo) : null;
    const st = doc && todos(doc.documentElement, "spTree")[0];
    if (st) { const kids = await arbol(st, X.hijo({ ids: null })); if (kids.length) el = ubicar({ t: "grp", kids }, xf); }
    if (!el) X.L.avisos.add("Un diagrama SmartArt no se pudo leer.");
  } else {
    const p = todos(gd, "pic")[0];
    if (p) { el = await imagen(p, X.hijo({ ids: null })); if (el) ubicar(el, xf); }
  }
  if (el) registrar(X, cNvPr, el);
  return el;
}

/* ---- tablas ---- */
function estiloTablaPorDefecto(C) {
  const ac = esquema("accent1", C), lt = esquema("lt1", C), dk = esquema("dk1", C);
  const tinte = (hex, v) => { const [r, g, b] = hexRgb(hex); return rgbHex(deLin(aLin(r) * v + (1 - v)), deLin(aLin(g) * v + (1 - v)), deLin(aLin(b) * v + (1 - v))); };
  const b = { w: 1.33, c: lt };
  return {
    wholeTbl: { c: dk, fill: tinte(ac, .2), bd: { left: b, right: b, top: b, bottom: b, insideH: b, insideV: b } },
    band1H: { fill: tinte(ac, .4) }, band1V: { fill: tinte(ac, .4) },
    firstRow: { b: true, c: lt, fill: ac, bd: { bottom: { w: 4, c: lt } } }, lastRow: { b: true, c: lt, fill: ac, bd: { top: { w: 4, c: lt } } },
    firstCol: { b: true, c: lt, fill: ac }, lastCol: { b: true, c: lt, fill: ac }
  };
}
function leerEstiloTabla(el, C) {
  const out = {};
  for (const parte of hijos(el)) {
    const o = {};
    const tx = hijo(parte, "tcTxStyle");
    if (tx) { if (at(tx, "b") === "on") o.b = true; else if (at(tx, "b") === "off") o.b = false; const c = colorDe(tx, C) || colorDe(hijo(tx, "fontRef"), C); if (c) o.c = c.c; }
    const tcs = hijo(parte, "tcStyle");
    if (tcs) {
      const f = hijo(tcs, "fill");
      if (f) { const k = hijos(f)[0]; if (k && k.localName === "solidFill") { const c = colorDe(k, C); if (c) o.fill = c.a < 1 ? { c: c.c, a: c.a } : c.c; } else if (k && k.localName === "noFill") o.fill = null; }
      const fr = hijo(tcs, "fillRef"); if (fr && !f) { const c = colorDe(fr, C); if (c) o.fill = c.c; }
      const bdr = hijo(tcs, "tcBdr");
      if (bdr) {
        o.bd = {};
        for (const k of ["left", "right", "top", "bottom", "insideH", "insideV"]) {
          const e = hijo(bdr, k); if (!e) continue;
          const ln = hijo(e, "ln"), lr = hijo(e, "lnRef");
          let l = null;
          if (ln) { const x = leerLn(ln, C); l = x.no || !x.c ? null : { w: r2(Math.max(.75, x.w == null ? 1 : x.w)), c: x.c }; }
          else if (lr) { const c = colorDe(lr, C); const base = C.tema.lineas[num(at(lr, "idx"), 1) - 1]; const x = base ? leerLn(base, C) : {}; l = c ? { w: r2(Math.max(.75, x.w || 1)), c: c.c } : null; }
          o.bd[k] = l;
        }
      }
    }
    out[parte.localName] = o;
  }
  return out;
}
async function tabla(tbl, xf, X) {
  if (!tbl) return null;
  const C = X.C;
  const cols = hijos(hijo(tbl, "tblGrid"), "gridCol").map(c => num(at(c, "w"), 0) / EMU);
  const tblPr = hijo(tbl, "tblPr");
  const F = k => si(at(tblPr, k));
  const idEl = hijo(tblPr, "tableStyleId"); const styleId = idEl ? idEl.textContent.trim() : "";
  const estilos = await X.L.leerEstilosTabla();
  const est = styleId ? (estilos[styleId] ? leerEstiloTabla(estilos[styleId], C) : estiloTablaPorDefecto(C)) : {};
  const filas = hijos(tbl, "tr"); const nR = filas.length, nC = cols.length;
  const rowH = filas.map(r => num(at(r, "h"), 0) / EMU);
  const rows = [];
  const defecto = X.defecto;
  for (let ri = 0; ri < nR; ri++) {
    const fila = []; let ci = 0;
    for (const tc of hijos(filas[ri], "tc")) {
      if (si(at(tc, "hMerge")) || si(at(tc, "vMerge"))) { fila.push({ skip: 1 }); ci++; continue; }
      const cs = num(at(tc, "gridSpan"), 1), rs = num(at(tc, "rowSpan"), 1);
      const partes = [["wholeTbl", 0, nR - 1, 0, nC - 1]];
      if (F("bandRow")) { const k = ri - (F("firstRow") ? 1 : 0); if (k >= 0 && !(F("lastRow") && ri === nR - 1)) partes.push([k % 2 === 0 ? "band1H" : "band2H", ri, ri, 0, nC - 1]); }
      if (F("bandCol")) { const k = ci - (F("firstCol") ? 1 : 0); if (k >= 0 && !(F("lastCol") && ci === nC - 1)) partes.push([k % 2 === 0 ? "band1V" : "band2V", 0, nR - 1, ci, ci]); }
      if (F("firstCol") && ci === 0) partes.push(["firstCol", 0, nR - 1, 0, 0]);
      if (F("lastCol") && ci + cs - 1 === nC - 1) partes.push(["lastCol", 0, nR - 1, nC - 1, nC - 1]);
      if (F("lastRow") && ri + rs - 1 === nR - 1) partes.push(["lastRow", nR - 1, nR - 1, 0, nC - 1]);
      if (F("firstRow") && ri === 0) partes.push(["firstRow", 0, 0, 0, nC - 1]);
      let fill = null, txc = null, txb = null; const bd = {};
      for (const [nom, r0, r1, c0, c1] of partes) {
        const s = est[nom]; if (!s) continue;
        if (s.fill !== undefined) fill = s.fill; if (s.c) txc = s.c; if (s.b != null) txb = s.b;
        if (s.bd) {
          const pon = (lado, clave) => { if (clave in s.bd) bd[lado] = s.bd[clave]; };
          pon("T", ri === r0 ? "top" : "insideH"); pon("B", ri + rs - 1 === r1 ? "bottom" : "insideH");
          pon("L", ci === c0 ? "left" : "insideV"); pon("R", ci + cs - 1 === c1 ? "right" : "insideV");
        }
      }
      const tcPr = hijo(tc, "tcPr");
      const f2 = await rellenoDe(tcPr, C, X.L, X.L.relsDe(tc)); if (f2 !== undefined) fill = f2 && f2.g ? f2.g.stops[0][1] : f2;
      for (const [lado, n] of [["L", "lnL"], ["R", "lnR"], ["T", "lnT"], ["B", "lnB"]]) {
        const ln = hijo(tcPr, n); if (!ln) continue; const x = leerLn(ln, C);
        if (x.no) bd[lado] = null; else if (x.c) bd[lado] = { w: r2(Math.max(.75, x.w == null ? 1 : x.w)), c: x.c };
      }
      const cell = {};
      if (cs > 1) cell.cs = cs; if (rs > 1) cell.rs = rs;
      if (fill) cell.fill = fill;
      for (const k of ["L", "R", "T", "B"]) if (bd[k]) cell["b" + k] = bd[k];
      const txBody = hijo(tc, "txBody");
      if (txBody) {
        const capa = { rp: Object.assign({}, txc ? { c: { c: txc, a: 1 } } : {}, txb != null ? { b: txb } : {}) };
        const bodyPr = xmlDe(`<a:bodyPr xmlns:a="x" lIns="${num(at(tcPr, "marL"), 91440)}" rIns="${num(at(tcPr, "marR"), 91440)}" tIns="${num(at(tcPr, "marT"), 45720)}" bIns="${num(at(tcPr, "marB"), 45720)}" anchor="${at(tcPr, "anchor") || "t"}"/>`).documentElement;
        const tx = procesarTexto(txBody, [{ lst: defecto }, capa, { lst: hijo(txBody, "lstStyle") }], [bodyPr], X);
        if (tx) cell.tx = tx;
      }
      fila.push(cell); ci += cs;
    }
    rows.push(fila);
  }
  return ubicar({ t: "tbl", colW: cols.map(v => r2(v)), rowH: rowH.map(v => r2(v)), rows }, xf);
}

/* ---- fondos ---- */
async function fondo(bgs, X) {
  for (const bg of bgs) {
    if (!bg) continue;
    const pr = hijo(bg, "bgPr"), ref = hijo(bg, "bgRef");
    let f;
    if (pr) f = await rellenoDe(pr, X.C, X.L, X.L.relsDe(pr));
    else if (ref) f = await rellenoEstilo(ref, X.C, X.L);
    if (f === undefined) continue;
    if (!f) return { c: "#ffffff" };
    if (typeof f === "string") return { c: f };
    if (f.c) return { c: rgbaCss(f) };
    if (f.g) return { g: f.g, c: f.g.stops[0][1] };
    if (f.img) return { img: f.img, fit: f.fit === "tile" ? "cover" : "stretch", c: "#000000" };
  }
  return { c: "#ffffff" };
}
function limpiar(el) {
  if (el.kids) { el.kids = el.kids.filter(k => !k._vacio); el.kids.forEach(limpiar); }
  for (const k in el) if (k[0] === "_") delete el[k];
  return el;
}

/** Lee un PowerPoint completo. */
async function importarPptx(file, lote, avance) {
  const JSZip = await libZip();
  avance(0.02, "Abriendo el PowerPoint…");
  let zip;
  try { zip = await JSZip.loadAsync(file); } catch (e) { throw new Error("No pude abrir ese archivo. ¿Es un PowerPoint .pptx?"); }
  const rec = new Recursos(lote);
  const L = new LectorPptx(zip, rec);
  const pres = await L.xml("ppt/presentation.xml");
  if (!pres) throw new Error("Ese archivo no parece un PowerPoint (.pptx).");
  const pr = pres.documentElement;
  const sz = hijo(pr, "sldSz");
  const W = r2(num(at(sz, "cx"), 12192000) / EMU), H = r2(num(at(sz, "cy"), 6858000) / EMU);
  const relsP = await L.rels("ppt/presentation.xml");
  const rutas = hijos(hijo(pr, "sldIdLst"), "sldId").map(s => relsP[rid(s, "id")]).filter(Boolean).map(r => r.destino);
  if (!rutas.length) throw new Error("Ese PowerPoint no tiene diapositivas.");
  const defecto = hijo(pr, "defaultTextStyle");
  const slides = [], notas = [], titulos = [];
  let ocultas = 0;
  for (let i = 0; i < rutas.length; i++) {
    avance(.05 + .85 * i / rutas.length, `Leyendo diapositiva ${i + 1} de ${rutas.length}…`);
    const p = rutas[i];
    const doc = await L.xml(p); if (!doc) continue;
    const sld = doc.documentElement;
    if (at(sld, "show") === "0") { ocultas++; continue; }
    const rels = await L.rels(p);
    const lr = Object.values(rels).find(x => x.tipo === "slideLayout");
    const lay = lr ? await L.layout(lr.destino) : null;
    const mas = lay && lay.master ? await L.master(lay.master) : null;
    if (!mas) continue;
    const mapa = mapaOverride(sld) || (lay && lay.mapa) || mas.mapa;
    const C = { tema: mas.tema, mapa, phClr: null };
    const ids = {};
    const base = { numero: i + 1, w: W, h: H, defecto: defecto || mas.otro };
    const Xm = new Contexto(L, C, null, mas, Object.assign({ plantilla: true }, base));
    const Xl = new Contexto(L, C, null, mas, Object.assign({ plantilla: true }, base));
    const Xs = new Contexto(L, C, lay, mas, Object.assign({ ids }, base));
    const sl = {};
    sl.bg = await fondo([ruta(sld, "cSld", "bg"), lay && lay.bg, mas.bg], Xs);
    const els = [];
    const verMaestro = at(sld, "showMasterSp") !== "0";
    if (verMaestro && lay && lay.mostrarMaestro && mas.arbol) els.push(...await arbol(mas.arbol, Xm));
    if (verMaestro && lay && lay.arbol) els.push(...await arbol(lay.arbol, Xl));
    els.push(...await arbol(ruta(sld, "cSld", "spTree"), Xs));
    const an = leerAnimaciones(hijo(sld, "timing"), ids);
    els.forEach(cerrarGeometria);
    sl.els = els.filter(e => !e._vacio).map(limpiar);
    if (an.pasos) sl.pasos = an.pasos;
    const tr = leerTransicion(sld);
    if (tr.trans) sl.trans = tr.trans;
    if (tr.avanzar != null && tr.avanzar > 0) sl.avanzar = tr.avanzar;
    slides.push(sl);
    titulos.push((Xs.res.titulo || Xs.res.primerTexto || "").replace(/\s+/g, " ").slice(0, 90));
    // notas del orador
    let nota = "";
    const nr = Object.values(rels).find(x => x.tipo === "notesSlide");
    if (nr) { const nd = await L.xml(nr.destino); if (nd) for (const sp of todos(nd.documentElement, "sp")) { const ph = todos(sp, "ph")[0]; if (ph && at(ph, "type") === "body") { nota = hijos(hijo(sp, "txBody"), "p").map(pp => todos(pp, "t").map(t => t.textContent).join("")).join("\n").trim(); break; } } }
    notas.push(nota);
    await respirar();
  }
  if (!slides.length) throw new Error("Todas las diapositivas de ese PowerPoint están ocultas.");
  if (ocultas) L.avisos.add(`${ocultas} diapositiva${ocultas === 1 ? " estaba oculta" : "s estaban ocultas"} en PowerPoint y no ${ocultas === 1 ? "se agregó" : "se agregaron"}.`);
  // La portada se dibuja en vivo con la primera diapositiva (la miniatura que guardan algunos programas puede estar vieja)
  avance(.95, "Casi listo…");
  return { sc: { v: 1, w: W, h: H, slides, fuentes: Array.from(L.fuentes) }, notas, titulos, archivos: rec.lista, portada: null, origen: "pptx", avisos: Array.from(L.avisos) };
}

/* =============================== PDF =============================== */
async function importarPdf(file, lote, avance) {
  avance(.02, "Abriendo el PDF…");
  const pdfjs = await libPdf();
  const data = new Uint8Array(await file.arrayBuffer());
  let pdf;
  try { pdf = await pdfjs.getDocument({ data, isEvalSupported: false }).promise; }
  catch (e) { throw new Error(/password/i.test(e && e.name || "") ? "Ese PDF tiene contraseña. Quitásela y probá otra vez." : "No pude abrir ese PDF."); }
  const rec = new Recursos(lote);
  const slides = [], titulos = [], notas = [];
  let W = 1920, H = 1080, portada = null;
  for (let p = 1; p <= pdf.numPages; p++) {
    avance(.05 + .9 * (p - 1) / pdf.numPages, `Página ${p} de ${pdf.numPages}…`);
    const page = await pdf.getPage(p);
    const vp1 = page.getViewport({ scale: 1 });
    const k = 1920 / Math.max(vp1.width, vp1.height);
    const vp = page.getViewport({ scale: k });
    const cv = document.createElement("canvas"); cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
    const g = cv.getContext("2d"); g.fillStyle = "#ffffff"; g.fillRect(0, 0, cv.width, cv.height);
    await page.render({ canvasContext: g, viewport: vp }).promise;
    if (p === 1) { W = cv.width; H = cv.height; const m = document.createElement("canvas"); const kk = 360 / cv.width; m.width = 360; m.height = Math.round(cv.height * kk); m.getContext("2d").drawImage(cv, 0, 0, m.width, m.height); portada = m.toDataURL("image/jpeg", .72); }
    const blob = await aBlob(cv, "image/jpeg", .9);
    const id = rec.agregar(blob, "image/jpeg");
    slides.push({ bg: { c: "#000000", img: id, fit: "contain" }, els: [] });
    let t = ""; try { const tc = await page.getTextContent(); t = tc.items.map(x => x.str).join(" ").replace(/\s+/g, " ").trim().slice(0, 90); } catch (e) { }
    titulos.push(t); notas.push("");
    page.cleanup(); cv.width = cv.height = 0;
    await respirar();
  }
  try { pdf.destroy(); } catch (e) { }
  return { sc: { v: 1, w: W, h: H, slides, fuentes: [] }, notas, titulos, archivos: rec.lista, portada, origen: "pdf", avisos: [] };
}

/* =============================== fotos y videos =============================== */
async function importarMedios(files, lote, avance, op) {
  const rec = new Recursos(lote);
  const slides = [], titulos = [], notas = [], avisos = new Set();
  const W = 1920, H = 1080; let portada = null;
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const mime = f.type || MIME[ext(f.name)] || "";
    avance(.05 + .9 * i / files.length, `Preparando ${i + 1} de ${files.length}…`);
    if (/^image\//.test(mime)) {
      if (!IMG_OK.test(mime)) { avisos.add(/heic|heif/.test(mime) ? "Las fotos HEIC (de iPhone) no se pueden leer aquí. Cambialas a JPG." : `"${f.name}" está en un formato de imagen que no sirve.`); continue; }
      const pr = await prepararImagen(f, mime, { max: 2560, forzar: mime !== "image/gif" && mime !== "image/svg+xml" });
      if (!pr) { avisos.add(`No pude leer "${f.name}".`); continue; }
      const id = rec.agregar(pr.blob, pr.mime);
      if (!portada) portada = await portadaDe(pr.blob);
      slides.push({ bg: { c: "#000000", img: id, fit: "contain" }, els: [] });
      titulos.push(f.name.replace(/\.[^.]+$/, "")); notas.push("");
    } else if (/^video\//.test(mime) || /^(mp4|m4v|mov|webm)$/.test(ext(f.name))) {
      if (!VID_OK.test(mime) && !/^(mp4|m4v|mov|webm)$/.test(ext(f.name))) { avisos.add(`"${f.name}" está en un formato de video que la tele no reproduce. Convertilo a MP4.`); continue; }
      const blob = new Blob([f], { type: /quicktime/.test(mime) || ext(f.name) === "mov" ? "video/mp4" : (mime || "video/mp4") });
      const d = await datosVideo(blob);
      if (!d) avisos.add(`No pude leer "${f.name}" en este cel. Puede que tampoco se vea en la tele.`);
      if (await esHevc(blob)) avisos.add(`"${f.name}" está en formato HEVC (H.265). Puede que la tele no lo reproduzca; si pasa, convertilo a MP4 H.264.`);
      const src = rec.agregar(blob, blob.type, { dur: d && d.dur });
      const el = { t: "vid", id: "v" + i, x: 0, y: 0, w: W, h: H, src, fit: "contain" };
      if (op.auto !== false) el.auto = 0;
      if (op.repetir) el.loop = true;
      if (d && d.dur) el.dur = r2(d.dur, 1);
      if (d && d.poster) { el.poster = rec.agregar(d.poster, "image/jpeg"); if (!portada) portada = await portadaDe(d.poster); }
      slides.push({ bg: { c: "#000000" }, els: [el] });
      titulos.push("Video · " + f.name.replace(/\.[^.]+$/, "")); notas.push("");
    } else if (/^audio\//.test(mime)) {
      if (!AUD_OK.test(mime)) { avisos.add(`"${f.name}" está en un formato de audio que no sirve. Usá MP3.`); continue; }
      const src = rec.agregar(f, mime);
      slides.push({ bg: { c: "#000000" }, els: [{ t: "aud", id: "a" + i, x: 0, y: 0, w: 1, h: 1, src, auto: 0, esconder: true }] });
      titulos.push("Audio · " + f.name); notas.push("");
    } else avisos.add(`"${f.name}" no es una foto ni un video.`);
    await respirar();
  }
  if (!slides.length) throw new Error(Array.from(avisos)[0] || "No había nada que se pudiera usar.");
  return { sc: { v: 1, w: W, h: H, slides, fuentes: [] }, notas, titulos, archivos: rec.lista, portada, origen: slides.every(s => s.els.length) ? "video" : "img", avisos: Array.from(avisos) };
}

/** Punto de entrada: decide qué hacer según los archivos escogidos. */
export async function importarArchivos(files, op = {}, avance = () => { }) {
  files = Array.from(files || []);
  if (!files.length) throw new Error("Escogé un archivo.");
  const lote = op.lote || nuevoId(6);
  const e = ext(files[0].name);
  const pesado = files.find(f => f.size > 450 * 1048576);
  if (pesado) throw new Error(`"${pesado.name}" pesa ${Math.round(pesado.size / 1048576)} MB. El máximo es 450 MB; si es un video, achicalo o subilo a YouTube y pegá el link.`);
  if (/^(pptx|ppsx|potx|pptm|ppsm|potm)$/.test(e)) { if (files.length > 1) throw new Error("Subí un PowerPoint a la vez."); return importarPptx(files[0], lote, avance); }
  if (e === "pdf" || files[0].type === "application/pdf") { if (files.length > 1) throw new Error("Subí un PDF a la vez."); return importarPdf(files[0], lote, avance); }
  if (/^(ppt|pps|pot)$/.test(e)) throw new Error("Ese es un PowerPoint viejo (.ppt). Abrilo en PowerPoint o Google Slides y guardalo como .pptx, o exportalo como PDF.");
  if (e === "key") throw new Error("Los archivos de Keynote no se pueden leer directo. En Keynote: Archivo → Exportar a → PowerPoint o PDF.");
  if (e === "odp") throw new Error("Ese archivo es de LibreOffice. Guardalo como .pptx (PowerPoint) o exportalo como PDF.");
  if (/^(doc|docx|xls|xlsx)$/.test(e)) throw new Error("Ese archivo es de Word o Excel. Para proyectarlo, exportalo como PDF.");
  return importarMedios(files, lote, avance, op);
}
export function importarYouTube(url, op = {}) {
  const y = parsearYouTube(url); if (!y) throw new Error("Ese link no parece de YouTube.");
  const el = { t: "yt", id: "y0", x: 0, y: 0, w: 1920, h: 1080, yt: y.id };
  if (y.t) el.ini = y.t; if (op.auto !== false) el.auto = 0;
  return { sc: { v: 1, w: 1920, h: 1080, slides: [{ bg: { c: "#000000" }, els: [el] }], fuentes: [] }, notas: [""], titulos: ["YouTube"], archivos: [], portada: null, origen: "yt", avisos: [], yt: y.id };
}
export { prepararImagen, portadaDe };
