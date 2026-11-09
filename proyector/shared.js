// Proyector: piezas compartidas entre el control (cel) y el visor (tele).

export const LIBROS = [
  ["Génesis","Gn"],["Éxodo","Ex"],["Levítico","Lv"],["Números","Nm"],["Deuteronomio","Dt"],["Josué","Jos"],["Jueces","Jue"],["Rut","Rt"],
  ["1 Samuel","1S"],["2 Samuel","2S"],["1 Reyes","1R"],["2 Reyes","2R"],["1 Crónicas","1Cr"],["2 Crónicas","2Cr"],["Esdras","Esd"],["Nehemías","Neh"],
  ["Ester","Est"],["Job","Job"],["Salmos","Sal"],["Proverbios","Pr"],["Eclesiastés","Ec"],["Cantares","Cnt"],["Isaías","Is"],["Jeremías","Jer"],
  ["Lamentaciones","Lm"],["Ezequiel","Ez"],["Daniel","Dn"],["Oseas","Os"],["Joel","Jl"],["Amós","Am"],["Abdías","Abd"],["Jonás","Jon"],
  ["Miqueas","Mi"],["Nahúm","Nah"],["Habacuc","Hab"],["Sofonías","Sof"],["Hageo","Hag"],["Zacarías","Zac"],["Malaquías","Mal"],
  ["Mateo","Mt"],["Marcos","Mr"],["Lucas","Lc"],["Juan","Jn"],["Hechos","Hch"],["Romanos","Ro"],["1 Corintios","1Co"],["2 Corintios","2Co"],
  ["Gálatas","Gá"],["Efesios","Ef"],["Filipenses","Fil"],["Colosenses","Col"],["1 Tesalonicenses","1Ts"],["2 Tesalonicenses","2Ts"],
  ["1 Timoteo","1Ti"],["2 Timoteo","2Ti"],["Tito","Tit"],["Filemón","Flm"],["Hebreos","He"],["Santiago","Stg"],["1 Pedro","1P"],["2 Pedro","2P"],
  ["1 Juan","1Jn"],["2 Juan","2Jn"],["3 Juan","3Jn"],["Judas","Jud"],["Apocalipsis","Ap"]
];
export const BOOKS_EN = ["Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth","1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra","Nehemiah","Esther","Job","Psalms","Proverbs","Ecclesiastes","Song of Solomon","Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos","Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi","Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians","Colossians","1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon","Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"];

export const VERSIONES = [
  { id: "rv1909", nombre: "Reina Valera 1909", corto: "RV1909", en: false },
  { id: "rv1865", nombre: "Reina Valera 1865", corto: "RV1865", en: false },
  { id: "kjv", nombre: "King James (inglés)", corto: "KJV", en: true }
];

export const FUENTES = [
  ["Montserrat", "'Montserrat',sans-serif"], ["Oswald", "'Oswald',sans-serif"], ["Bebas Neue", "'Bebas Neue',Impact,sans-serif"],
  ["Anton", "'Anton',Impact,sans-serif"], ["Raleway", "'Raleway',sans-serif"], ["Lato", "'Lato',sans-serif"], ["Quicksand", "'Quicksand',sans-serif"],
  ["Roboto Slab", "'Roboto Slab',serif"], ["Merriweather", "'Merriweather',serif"], ["Playfair Display", "'Playfair Display',serif"], ["Cinzel", "'Cinzel',serif"]
];
export const FONTS_CSS = "https://fonts.googleapis.com/css2?family=Anton&family=Bebas+Neue&family=Cinzel:wght@400;700&family=Lato:wght@400;700&family=Merriweather:wght@400;700&family=Montserrat:wght@400;700&family=Oswald:wght@400;700&family=Playfair+Display:wght@400;700&family=Quicksand:wght@400;700&family=Raleway:wght@400;700&family=Roboto+Slab:wght@400;700&display=swap";

export const FONDOS = [
  { id: "negro", nombre: "Negro", css: "#000" },
  { id: "noche", nombre: "Noche", css: "radial-gradient(ellipse at 50% 25%, #23345a 0%, #0b1224 55%, #04060c 100%)" },
  { id: "oceano", nombre: "Océano", css: "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)" },
  { id: "cielo", nombre: "Cielo", css: "linear-gradient(180deg, #10264d 0%, #2e5c9e 55%, #7fa6dc 100%)" },
  { id: "aurora", nombre: "Aurora", css: "linear-gradient(160deg, #0b1d2e 0%, #134e5e 45%, #2f8f6b 75%, #0b1d2e 100%)" },
  { id: "bosque", nombre: "Bosque", css: "linear-gradient(160deg, #0b2418 0%, #14532d 55%, #0a1f15 100%)" },
  { id: "dorado", nombre: "Dorado", css: "radial-gradient(circle at 50% 38%, #5c4614 0%, #2a1f08 45%, #0b0804 100%)" },
  { id: "vino", nombre: "Vino", css: "radial-gradient(circle at 30% 20%, #6a1d31 0%, #2a0a13 55%, #0e0306 100%)" },
  { id: "morado", nombre: "Morado", css: "linear-gradient(135deg, #1f0636 0%, #4b1c7a 50%, #6c47b8 100%)" },
  { id: "amanecer", nombre: "Amanecer", css: "linear-gradient(180deg, #1a0b2e 0%, #5b2a6e 40%, #d9735b 80%, #f3b562 100%)" },
  { id: "gloria", nombre: "Gloria", css: "radial-gradient(circle at 50% 115%, #ffe9a8 0%, #f2b45a 18%, #8a3d52 45%, #2a1035 75%, #0d0614 100%)" },
  { id: "piedra", nombre: "Piedra", css: "linear-gradient(135deg, #232526 0%, #414345 100%)" }
];

export const TRANSICIONES = [["fade", "Desvanecer"], ["zoom", "Zoom"], ["subir", "Deslizar arriba"], ["izq", "Deslizar lado"], ["flip", "Voltear"], ["rebote", "Rebote"], ["pulso", "Pulso"], ["ninguna", "Sin efecto"]];

export const ESTILO_BASE = { fuente: "Montserrat", tam: 12, margen: 7, alin: "center", mayus: false, negrita: true, color: "#ffffff", sombra: true, sombraColor: "#000000", trans: "fade", cita: true, mov: false, borrarAlFondo: false };

export const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---- Citas ---- */
const ALIAS = { sl: 18, salmo: 18, ps: 18, cant: 21, cantar: 21, cantico: 21, jn: 42, jua: 42, mc: 40, mr: 40, mar: 40, mat: 39, lc: 41, luc: 41, hch: 43, hech: 43, act: 43, ro: 44, rom: 44, ga: 47, gal: 47, ef: 48, fil: 49, flp: 49, col: 50, heb: 57, he: 57, stg: 58, sant: 58, ap: 65, apoc: 65, rev: 65, gn: 0, gen: 0, ex: 1, lv: 2, nm: 3, dt: 4, deut: 4, jue: 6, jdg: 6, pr: 19, prov: 19, ec: 20, ecl: 20, is: 22, isa: 22, jer: 23, lm: 24, lam: 24, ez: 25, eze: 25, dn: 26, os: 27, jl: 28, am: 29, abd: 30, jon: 31, mi: 32, miq: 32, nah: 33, hab: 34, sof: 35, hag: 36, zac: 37, mal: 38, mt: 39, jud: 64, tit: 55, flm: 56, file: 56 };
const NOMBRES_N = LIBROS.map(l => norm(l[0]).replace(/\s+/g, ""));
export function buscarLibro(txt) {
  const t = norm(txt).replace(/\s+/g, "").replace(/\.$/, "");
  if (!t) return -1;
  const m = t.match(/^([123])(.*)$/); const pre = m ? m[1] : ""; const rest = m ? m[2] : t;
  if (!pre && ALIAS[t] !== undefined) return ALIAS[t];
  if (pre && ["jn", "jua", "juan"].includes(rest)) return { 1: 61, 2: 62, 3: 63 }[pre];
  if (pre && ["s", "sa", "sam"].includes(rest)) return ({ 1: 8, 2: 9 }[pre] || -1);
  if (pre && ["r", "re", "rey"].includes(rest)) return ({ 1: 10, 2: 11 }[pre] || -1);
  if (pre && ["cr", "cro"].includes(rest)) return ({ 1: 12, 2: 13 }[pre] || -1);
  if (pre && ["co", "cor"].includes(rest)) return ({ 1: 45, 2: 46 }[pre] || -1);
  if (pre && ["ts", "tes"].includes(rest)) return ({ 1: 51, 2: 52 }[pre] || -1);
  if (pre && ["ti", "tim"].includes(rest)) return ({ 1: 53, 2: 54 }[pre] || -1);
  if (pre && ["p", "pe", "ped"].includes(rest)) return ({ 1: 59, 2: 60 }[pre] || -1);
  const full = pre + rest;
  let i = NOMBRES_N.findIndex(n => n === full); if (i >= 0) return i;
  i = NOMBRES_N.findIndex(n => n.startsWith(full) && full.length >= (pre ? 2 : 2)); if (i >= 0) return i;
  i = LIBROS.findIndex(l => norm(l[1]) === full); return i;
}
// "Juan 3:16", "jn 3 16", "1 cor 13", "sal 23:1-3"
export function parseCita(txt) {
  const s = String(txt || "").trim();
  const m = s.match(/^([123]?\s*[^\d:.,]+?)\s*(\d+)(?:\s*[:., ]\s*(\d+))?(?:\s*-\s*(\d+))?\s*$/);
  if (!m) { const b = buscarLibro(s); return b >= 0 ? { libro: b, cap: 1, vers: null } : null; }
  const b = buscarLibro(m[1]); if (b < 0) return null;
  return { libro: b, cap: +m[2], vers: m[3] ? +m[3] : null };
}
export const nombreLibro = (i, en) => en ? BOOKS_EN[i] : LIBROS[i][0];

/* ---- Pantalla (se usa en el visor y en la vista previa) ---- */
export function crearEscena(root) {
  root.classList.add("esc");
  root.innerHTML = '<div class="esc-bg"></div><div class="esc-img" hidden></div><div class="esc-capa"></div><div class="esc-negro"></div>';
  return { root, bg: root.querySelector(".esc-bg"), capa: root.querySelector(".esc-capa"), negro: root.querySelector(".esc-negro"), key: null, fondoKey: null };
}
export const ESCENA_CSS = `
.esc{position:relative;overflow:hidden;background:#000;container-type:size;color:#fff}
.esc-bg{position:absolute;top:-8%;left:-8%;right:-8%;bottom:-8%;background:#000;background-size:cover;background-position:center;transition:opacity .6s}
.esc-bg.mov{animation:escMov 40s ease-in-out infinite alternate;background-size:160% 160%}
@keyframes escMov{0%{transform:scale(1) translate(0,0)}100%{transform:scale(1.08) translate(-2%,-1.5%)}}
.esc-capa{position:absolute;top:0;left:0;right:0;bottom:0}
.esc-item{position:absolute;top:0;left:0;right:0;bottom:0;display:flex;flex-direction:column;justify-content:center;gap:2.2cqh}
.esc-item .t{white-space:pre-line;line-height:1.22;overflow-wrap:break-word}
.esc-item .r{opacity:.86;line-height:1.2}
.esc-item.img{padding:0!important}
.esc-item.img img{width:100%;height:100%;object-fit:contain}
.esc-negro{position:absolute;top:0;left:0;right:0;bottom:0;background:#000;opacity:0;pointer-events:none;transition:opacity .5s}
.esc-negro.on{opacity:1}
.esc-item.out{animation:escOut .45s ease forwards}
@keyframes escOut{to{opacity:0}}
.in-fade{animation:iFade .7s ease both}@keyframes iFade{from{opacity:0}}
.in-zoom{animation:iZoom .7s cubic-bezier(.2,.8,.2,1) both}@keyframes iZoom{from{opacity:0;transform:scale(.82)}}
.in-subir{animation:iSub .7s cubic-bezier(.2,.8,.2,1) both}@keyframes iSub{from{opacity:0;transform:translateY(12%)}}
.in-izq{animation:iIzq .7s cubic-bezier(.2,.8,.2,1) both}@keyframes iIzq{from{opacity:0;transform:translateX(14%)}}
.in-flip{animation:iFlip .8s ease both;backface-visibility:hidden}@keyframes iFlip{from{opacity:0;transform:perspective(1200px) rotateX(70deg)}}
.in-rebote{animation:iReb .9s both}@keyframes iReb{0%{opacity:0;transform:scale(.6)}55%{opacity:1;transform:scale(1.06)}75%{transform:scale(.97)}100%{transform:scale(1)}}
.in-pulso{animation:iPul .9s both}@keyframes iPul{0%{opacity:0;transform:scale(1)}40%{opacity:1;transform:scale(1.05)}100%{transform:scale(1)}}
@media (prefers-reduced-motion: reduce){.esc *{animation:none!important;transition:none!important}}
`;

function fuenteCss(nombre) { const f = FUENTES.find(x => x[0] === nombre); return (f ? f[1] : FUENTES[0][1]) + ",'Noto Serif','Noto Serif Hebrew',serif"; }

// Ajusta el tamaño de letra para que todo quepa en la pantalla
function ajustar(item, maxPx) {
  const t = item.querySelector(".t"), r = item.querySelector(".r");
  if (!t) return;
  const H = item.clientHeight, W = item.clientWidth;
  if (!H || !W) return;
  let lo = 6, hi = Math.max(8, maxPx), best = lo;
  const cs = getComputedStyle(item);
  const altoUtil = H - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const gap = parseFloat(cs.rowGap) || 0;
  const cabe = () => (t.offsetHeight + (r ? r.offsetHeight + gap : 0)) <= altoUtil + 1 && t.scrollWidth <= t.clientWidth + 1;
  const set = px => { t.style.fontSize = px + "px"; if (r) r.style.fontSize = Math.max(8, Math.min(px * .5, maxPx * .5)) + "px"; };
  for (let k = 0; k < 18; k++) {
    const mid = (lo + hi) / 2; set(mid);
    if (cabe()) { best = mid; lo = mid } else hi = mid;
    if (hi - lo < .5) break;
  }
  set(best);
}

export function pintar(esc, st, fondoImg) {
  st = st || {}; const e = Object.assign({}, ESTILO_BASE, st.estilo || {}); esc._img = fondoImg;
  // Fondo
  const f = st.fondo || { id: "negro" };
  const fk = f.id + "|" + (fondoImg ? fondoImg.length : 0) + "|" + e.mov;
  if (esc.fondoKey !== fk) {
    esc.fondoKey = fk;
    const base = FONDOS.find(x => x.id === f.id);
    esc.bg.style.background = fondoImg ? `#000 url("${fondoImg}") center/cover no-repeat` : (base ? base.css : "#000");
    if (!fondoImg && base && e.mov) esc.bg.style.backgroundSize = "160% 160%";
    esc.bg.classList.toggle("mov", !!e.mov);
  }
  esc.negro.classList.toggle("on", !!st.negro);
  // Contenido
  const key = st.oculto ? "oculto" : [st.modo, st.texto, st.ref, st.titulo, st.img ? st.img.length : 0, st.fin || ""].join("¦");
  const W = esc.root.clientWidth, H = esc.root.clientHeight;
  const maxPx = H * (e.tam / 100);
  const pad = `${(e.margen / 100) * H}px ${(e.margen / 100) * W}px`;
  const estilizar = el => {
    el.style.padding = pad; el.style.textAlign = e.alin;
    el.style.alignItems = e.alin === "left" ? "flex-start" : e.alin === "right" ? "flex-end" : "center";
    el.style.fontFamily = fuenteCss(e.fuente); el.style.fontWeight = e.negrita ? 700 : 400; el.style.color = e.color;
    el.style.textTransform = e.mayus ? "uppercase" : "none";
    el.style.textShadow = e.sombra ? `0 0.06em 0.18em ${e.sombraColor}, 0 0 0.5em ${e.sombraColor}aa` : "none";
  };
  if (key === esc.key) { // mismo contenido: sólo estilo
    const cur = esc.capa.querySelector(".esc-item:not(.out)");
    if (cur && !cur.classList.contains("img")) { estilizar(cur); ajustar(cur, maxPx); }
    return;
  }
  esc.key = key;
  clearInterval(esc._reloj);
  esc.capa.querySelectorAll(".esc-item").forEach(o => { o.classList.add("out"); setTimeout(() => o.remove(), 500); });
  if (st.oculto || (st.modo !== "texto" && st.modo !== "img" && st.modo !== "cuenta")) return;
  const it = document.createElement("div"); it.className = "esc-item";
  if (st.modo === "img" && st.img) {
    it.classList.add("img"); it.innerHTML = `<img alt="" src="${st.img}">`;
  } else if (st.modo === "cuenta") {
    // Cuenta regresiva: el reloj se calcula en cada pantalla a partir de la hora de fin
    it.innerHTML = `<div class="t">${st.titulo ? `<span style="font-size:.5em;font-weight:600;letter-spacing:.02em">${esc_(st.titulo)}</span>\n` : ""}<span class="cd" style="font-variant-numeric:tabular-nums;font-size:1.9em;line-height:1.05">00:00</span></div>`;
    estilizar(it);
    const cd = it.querySelector(".cd");
    const tic = () => {
      const ms = Math.max(0, (st.fin || 0) - Date.now()); const tot = Math.ceil(ms / 1000);
      const m = Math.floor(tot / 60), sg = tot % 60;
      cd.textContent = ms > 0 ? `${String(m).padStart(2, "0")}:${String(sg).padStart(2, "0")}` : (st.texto || "00:00");
      if (ms <= 0) { clearInterval(esc._reloj); if (st.texto) ajustar(it, maxPx); }
    };
    if (e.trans !== "ninguna") it.classList.add("in-" + e.trans);
    esc.capa.appendChild(it);
    cd.textContent = "00:00"; ajustar(it, maxPx); tic();
    esc._reloj = setInterval(tic, 250);
    return;
  } else {
    const ref = e.cita && st.ref ? `<div class="r">${esc_(st.ref)}</div>` : "";
    it.innerHTML = (st.titulo ? `<div class="t">${esc_(st.titulo)}${st.texto ? "\n" : ""}<span style="font-weight:400;font-size:.62em">${esc_(st.texto || "")}</span></div>` : `<div class="t">${esc_(st.texto || "")}</div>`) + ref;
    estilizar(it);
  }
  if (e.trans !== "ninguna") it.classList.add("in-" + e.trans);
  esc.capa.appendChild(it);
  if (!it.classList.contains("img")) ajustar(it, maxPx);
}
const esc_ = esc;

export function reajustar(escObj, st) { escObj.key = null; pintar(escObj, Object.assign({}, st, { estilo: Object.assign({}, st && st.estilo, { trans: "ninguna" }) }), escObj._img); }
