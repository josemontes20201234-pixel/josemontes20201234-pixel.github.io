/* Escáner facial de Meraki: con la cámara (o una foto) mide la forma de la cara y muestra qué cortes le quedan.
   Todo corre en el teléfono: MediaPipe Face Landmarker (Google, Apache 2.0) está alojado en esta misma página
   y la imagen nunca se envía. Las medidas y la forma de la cara salen de medidas.js. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var M = window.MerakiMedidas, V = window.MerakiVisagismo;
  if (!M || !V || !$("esc-caja")) return;

  var BASE = new URL("escaner/", location.href).href;
  var PESO = { wasm: 14665716, modelo: 3758596 };
  var NECESARIOS = 36; // cuadros buenos para dar el resultado (uno o dos segundos)

  // MediaPipe manda a Google métricas de uso de la librería. Se bloquean para que la página no mande nada.
  (function () {
    var original = window.fetch;
    if (!original || original.merakiSinMetricas) return;
    var envuelto = function (entrada, opciones) {
      var url = String(typeof entrada === "string" ? entrada : (entrada && entrada.url) || "");
      if (url.indexOf("https://odml.pa.googleapis.com/") === 0) return Promise.reject(new TypeError("Métricas bloqueadas"));
      return original.call(window, entrada, opciones);
    };
    envuelto.merakiSinMetricas = true;
    window.fetch = envuelto;
  })();

  var intro = $("esc-intro"), vista = $("esc-vista"), cajaError = $("esc-error");
  var video = $("esc-video"), lienzo = $("esc-lienzo"), ctx = lienzo.getContext("2d"), marco = $("esc-marco");
  var guia = $("esc-guia"), barra = $("esc-barra"), estado = $("esc-estado");
  var botonCamara = $("esc-camara"), botonFoto = $("esc-subir"), archivo = $("esc-foto");

  // ¿Este teléfono puede correr el escáner? (MediaPipe necesita WebAssembly con SIMD)
  var simd = false;
  try {
    simd = WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]));
  } catch (e) { simd = false; }
  var hayCamara = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && window.isSecureContext !== false;
  if (!simd) {
    botonCamara.hidden = true;
    botonFoto.hidden = true;
    avisar("Este teléfono o navegador no puede correr el escáner. Contestá las 3 preguntas de abajo: también te dicen tu forma de cara.");
  } else if (!hayCamara) {
    botonCamara.hidden = true;
    botonFoto.className = "boton";
  }

  function avisar(texto) { estado.hidden = !texto; estado.textContent = texto || ""; }

  /* ---------- cargar MediaPipe (una sola vez) ---------- */
  var cargando = null, vision = null, detector = null, modo = "";
  function bajar(url, total, alAvanzar) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error("No se pudo bajar " + url + " (" + r.status + ")");
      if (!r.body || !r.body.getReader) return r.arrayBuffer().then(function (b) { alAvanzar(b.byteLength); return b; });
      var lector = r.body.getReader(), partes = [], n = 0;
      return (function leer() {
        return lector.read().then(function (x) {
          if (x.done) {
            var out = new Uint8Array(n), o = 0;
            partes.forEach(function (p) { out.set(p, o); o += p.length; });
            return out.buffer;
          }
          partes.push(x.value);
          n += x.value.length;
          alAvanzar(Math.min(n, total));
          return leer();
        });
      })();
    });
  }
  function cargar(alAvanzar) {
    if (detector) return Promise.resolve(detector);
    if (cargando) return cargando;
    var hecho = { wasm: 0, modelo: 0 };
    var avance = function (k) {
      return function (n) { hecho[k] = n; alAvanzar((hecho.wasm + hecho.modelo) / (PESO.wasm + PESO.modelo)); };
    };
    cargando = Promise.all([
      import(BASE + "vision_bundle.mjs"),
      bajar(BASE + "wasm/vision_wasm_internal.wasm", PESO.wasm, avance("wasm")),
      bajar(BASE + "face_landmarker.task", PESO.modelo, avance("modelo"))
    ]).then(function (r) {
      vision = r[0];
      // El wasm ya está bajado: se le pasa a MediaPipe directo, sin pedirlo otra vez
      var binario = URL.createObjectURL(new Blob([r[1]], { type: "application/wasm" }));
      var archivos = { wasmLoaderPath: BASE + "wasm/vision_wasm_internal.js", wasmBinaryPath: binario };
      var crear = function (delegado) {
        return vision.FaceLandmarker.createFromOptions(archivos, {
          baseOptions: { modelAssetBuffer: new Uint8Array(r[2].slice(0)), delegate: delegado },
          runningMode: "VIDEO", numFaces: 1,
          minFaceDetectionConfidence: 0.5, minFacePresenceConfidence: 0.5, minTrackingConfidence: 0.5
        });
      };
      return crear("GPU").catch(function () { return crear("CPU"); }).then(function (d) {
        URL.revokeObjectURL(binario);
        detector = d;
        modo = "VIDEO";
        return d;
      }, function (e) { URL.revokeObjectURL(binario); throw e; });
    });
    cargando.catch(function () { cargando = null; });
    return cargando;
  }
  function usarModo(m) {
    if (modo === m) return Promise.resolve();
    return detector.setOptions({ runningMode: m }).then(function () { modo = m; });
  }

  /* ---------- pantallas ---------- */
  function ver(cual) {
    intro.hidden = cual !== "intro";
    vista.hidden = cual !== "vista";
    cajaError.hidden = cual !== "error";
  }
  function fallar(texto) {
    detener();
    $("esc-error-texto").textContent = texto;
    ver("error");
    cajaError.scrollIntoView({ block: "nearest" });
  }
  function reiniciar() {
    detener();
    avisar("");
    ver("intro");
    $("escaner").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }
  $("esc-reintentar").addEventListener("click", reiniciar);
  $("esc-cancelar").addEventListener("click", reiniciar);

  /* ---------- cámara ---------- */
  var corriente = null, activo = false, cuadro = 0, ultimoTiempo = -1, ultimoTs = 0;
  var muestras = [], antes = null, sinCara = 0, inicio = 0, mensaje = "";

  function apagarCamara() {
    if (corriente) corriente.getTracks().forEach(function (t) { t.stop(); });
    corriente = null;
    video.srcObject = null;
  }
  function detener() {
    activo = false;
    cancelAnimationFrame(cuadro);
    apagarCamara();
  }
  function decir(texto) {
    if (texto === mensaje) return;
    mensaje = texto;
    guia.textContent = texto;
  }

  function errorCamara(e) {
    var n = e && e.name;
    if (n === "NotAllowedError" || n === "SecurityError") return "No tenemos permiso para usar la cámara. Podés darlo en la configuración del navegador, usar una foto o contestar 3 preguntas.";
    if (n === "NotFoundError" || n === "OverconstrainedError") return "No encontramos una cámara en este aparato. Probá con una foto o contestá 3 preguntas.";
    if (n === "NotReadableError") return "La cámara la está usando otra aplicación. Cerrala y probá otra vez.";
    return "No se pudo abrir la cámara. Probá con una foto o contestá 3 preguntas.";
  }

  function empezarCamara() {
    avisar("");
    ver("vista");
    decir("Abriendo la cámara…");
    barra.style.width = "0%";
    muestras = []; antes = null; sinCara = 0; ultimoTiempo = -1; mensaje = "";
    vista.scrollIntoView({ block: "nearest" });
    var pedir = function (c) { return navigator.mediaDevices.getUserMedia({ audio: false, video: c }); };
    var camara = pedir({ facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } })
      .catch(function (e) { if (e && e.name === "OverconstrainedError") return pedir(true); throw e; })
      .then(function (s) {
        corriente = s;
        video.srcObject = s;
        return video.play();
      });
    var listo = cargar(function (p) {
      if (!detector) { decir("Cargando el escáner… " + Math.round(p * 100) + " %"); barra.style.width = Math.round(p * 100) + "%"; }
    });
    activo = true;
    cuadro = requestAnimationFrame(ciclo);
    camara.catch(function (e) { if (activo) fallar(errorCamara(e)); });
    listo.catch(function () { if (activo) fallar("No se pudo cargar el escáner. Revisá tu internet y probá otra vez."); });
    Promise.all([camara, listo]).then(function () { return usarModo("VIDEO"); }).then(function () {
      if (!activo) return;
      barra.style.width = "0%";
      inicio = performance.now();
      decir("Poné tu cara dentro del óvalo");
    }).catch(function () {});
  }

  // Parte del video que se ve en el marco (el video llena el marco y se recorta)
  function visible() {
    var vw = video.videoWidth, vh = video.videoHeight;
    var cw = marco.clientWidth || vw, ch = marco.clientHeight || vh;
    var s = Math.max(cw / vw, ch / vh), w = cw / s, h = ch / s;
    return { x: (vw - w) / 2, y: (vh - h) / 2, w: w, h: h, s: s };
  }

  function ciclo() {
    if (!activo) return;
    cuadro = requestAnimationFrame(ciclo);
    if (video.readyState < 2 || !video.videoWidth) return;
    if (lienzo.width !== video.videoWidth || lienzo.height !== video.videoHeight) {
      lienzo.width = video.videoWidth;
      lienzo.height = video.videoHeight;
    }
    var vis = visible();
    if (!detector || modo !== "VIDEO") { dibujar(null, vis, 0, false); return; }
    if (video.currentTime === ultimoTiempo) return;
    ultimoTiempo = video.currentTime;
    var ts = Math.max(performance.now(), ultimoTs + 1);
    ultimoTs = ts;
    var r;
    try { r = detector.detectForVideo(video, ts); } catch (e) { fallar("El escáner tuvo un problema. Probá otra vez."); return; }
    var lm = r && r.faceLandmarks && r.faceLandmarks[0];
    revisar(lm, vis);
  }

  function revisar(lm, vis) {
    var vw = video.videoWidth, vh = video.videoHeight;
    if (!lm) {
      sinCara++;
      antes = null;
      decir(performance.now() - inicio > 12000 ? "No te encuentro. Buscá buena luz y que tu cara quepa en el óvalo." : "Poné tu cara dentro del óvalo");
      dibujar(null, vis, muestras.length / NECESARIOS, false);
      return;
    }
    sinCara = 0;
    var ancho = Math.abs(lm[454].x - lm[234].x) * vw / vis.w;
    var cx = ((lm[234].x + lm[454].x) / 2 * vw - vis.x) / vis.w;
    var cy = ((lm[10].y + lm[152].y) / 2 * vh - vis.y) / vis.h;
    var p = M.pose(lm, vw, vh);
    var quieto = !antes || Math.abs(cx - antes.x) + Math.abs(cy - antes.y) < 0.025;
    antes = { x: cx, y: cy };
    var bien = false;
    if (ancho < 0.34) decir("Acercate un poco");
    else if (ancho > 0.8) decir("Alejate un poco");
    else if (Math.abs(cx - 0.5) > 0.15 || Math.abs(cy - 0.47) > 0.16) decir("Poné tu cara en el centro del óvalo");
    else if (Math.abs(p.yaw) > 12 || Math.abs(p.pitch) > 15) decir("Mirá de frente a la cámara, con la cara derecha");
    else if (!quieto) decir("Quedate quieto un momento");
    else { bien = true; decir("Escaneando… quedate quieto"); }
    if (bien) {
      muestras.push(M.medir(lm, vw, vh));
      barra.style.width = Math.round(muestras.length / NECESARIOS * 100) + "%";
    }
    dibujar(lm, vis, muestras.length / NECESARIOS, bien);
    if (muestras.length >= NECESARIOS) terminar(lm, vis);
  }

  /* ---------- dibujo en vivo: malla azul y línea de escaneo ---------- */
  function dibujar(lm, vis, progreso, bien) {
    var W = lienzo.width, H = lienzo.height, e = 1 / vis.s;
    ctx.clearRect(0, 0, W, H);
    var cx = vis.x + vis.w / 2, cy = vis.y + vis.h * 0.47;
    var rx = vis.w * 0.3, ry = Math.min(vis.h * 0.37, rx * 1.4);
    ctx.lineCap = "round";
    ctx.setLineDash([9 * e, 8 * e]);
    ctx.lineWidth = 2 * e;
    ctx.strokeStyle = bien ? "rgba(230,196,109,.9)" : "rgba(241,234,217,.6)";
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    if (progreso > 0) {
      ctx.lineWidth = 4 * e;
      ctx.strokeStyle = "#e6c46d";
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, progreso)); ctx.stroke();
    }
    if (!lm) return;
    var T = vision.FaceLandmarker.FACE_LANDMARKS_TESSELATION, O = vision.FaceLandmarker.FACE_LANDMARKS_FACE_OVAL;
    ctx.lineWidth = 1 * e;
    ctx.strokeStyle = "rgba(86,190,255,.32)";
    ctx.beginPath();
    for (var i = 0; i < T.length; i++) {
      var a = lm[T[i].start], b = lm[T[i].end];
      ctx.moveTo(a.x * W, a.y * H); ctx.lineTo(b.x * W, b.y * H);
    }
    ctx.stroke();
    ctx.lineWidth = 2 * e;
    ctx.strokeStyle = "rgba(125,215,255,.95)";
    ctx.beginPath();
    for (var j = 0; j < O.length; j++) {
      var c = lm[O[j].start], d = lm[O[j].end];
      ctx.moveTo(c.x * W, c.y * H); ctx.lineTo(d.x * W, d.y * H);
    }
    ctx.stroke();
    // línea de escaneo que baja por la cara
    var x0 = lm[234].x * W, x1 = lm[454].x * W, y0 = lm[10].y * H, y1 = lm[152].y * H;
    if (x0 > x1) { var t0 = x0; x0 = x1; x1 = t0; }
    var y = y0 + (y1 - y0) * ((performance.now() % 1700) / 1700);
    var g = ctx.createLinearGradient(0, y - 22 * e, 0, y);
    g.addColorStop(0, "rgba(86,190,255,0)");
    g.addColorStop(1, "rgba(150,225,255,.55)");
    ctx.fillStyle = g;
    ctx.fillRect(x0 - 8 * e, y - 22 * e, x1 - x0 + 16 * e, 22 * e);
    ctx.fillStyle = "rgba(190,238,255,.95)";
    ctx.fillRect(x0 - 8 * e, y - 1.5 * e, x1 - x0 + 16 * e, 1.5 * e);
  }

  function terminar(lm, vis) {
    activo = false;
    cancelAnimationFrame(cuadro);
    var m = M.juntar(muestras);
    if (!M.razonable(m)) { fallar("No pude medir bien tu cara. Probá otra vez con buena luz y mirando de frente."); return; }
    pintarResultado(video, video.videoWidth, video.videoHeight, vis, lm, true);
    apagarCamara();
    entregar(m, "escaner", "");
    ver("intro");
  }

  /* ---------- foto ---------- */
  // Ángulo de la cámara que tomó la foto (distancia focal equivalente en 35 mm, de los datos EXIF del JPG).
  // Sirve para corregir bien la perspectiva: no es lo mismo una selfie que un retrato con zoom.
  function anguloDeFoto(f) {
    if (!f.slice || !window.DataView) return Promise.resolve(0);
    return f.slice(0, 131072).arrayBuffer().then(function (buf) {
      var v = new DataView(buf), n = v.byteLength, o = 2;
      if (n < 4 || v.getUint16(0) !== 0xFFD8) return 0;
      while (o + 4 < n) {
        var marca = v.getUint16(o), largo = v.getUint16(o + 2);
        if (marca === 0xFFE1 && v.getUint32(o + 4) === 0x45786966) { // "Exif"
          var t = o + 10, le = v.getUint16(t) === 0x4949;
          var u16 = function (i) { return v.getUint16(t + i, le); }, u32 = function (i) { return v.getUint32(t + i, le); };
          var buscar = function (ifd, etiqueta) {
            if (t + ifd + 2 > n) return null;
            for (var k = 0, cant = u16(ifd); k < cant; k++) {
              var e = ifd + 2 + k * 12;
              if (t + e + 12 > n) return null;
              if (u16(e) === etiqueta) return e;
            }
            return null;
          };
          var exif = buscar(u32(4), 0x8769);
          if (exif === null) return 0;
          var focal = buscar(u32(exif + 8), 0xA405);
          var mm = focal === null ? 0 : u16(focal + 8);
          return mm >= 10 && mm <= 300 ? 2 * Math.atan(43.27 / (2 * mm)) * 180 / Math.PI : 0;
        }
        if ((marca & 0xFF00) !== 0xFF00) return 0;
        o += 2 + largo;
      }
      return 0;
    }).catch(function () { return 0; });
  }
  botonFoto.addEventListener("click", function () { archivo.value = ""; archivo.click(); });
  archivo.addEventListener("change", function () {
    var f = archivo.files && archivo.files[0];
    if (!f) return;
    ver("intro");
    avisar("Preparando el escáner…");
    var img = new Image(), url = URL.createObjectURL(f), fov = 0, angulo = anguloDeFoto(f);
    var imagen = new Promise(function (ok, mal) { img.onload = ok; img.onerror = mal; img.src = url; });
    cargar(function (p) { if (!detector) avisar("Cargando el escáner… " + Math.round(p * 100) + " %"); })
      .then(function () { return Promise.all([imagen, angulo]); })
      .then(function (r) { fov = r[1]; return usarModo("IMAGE"); })
      .then(function () {
        URL.revokeObjectURL(url);
        avisar("Analizando tu foto…");
        var escala = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight));
        var cw = Math.round(img.naturalWidth * escala), ch = Math.round(img.naturalHeight * escala);
        var c = document.createElement("canvas");
        c.width = cw; c.height = ch;
        c.getContext("2d").drawImage(img, 0, 0, cw, ch);
        var r = detector.detect(c);
        var lm = r && r.faceLandmarks && r.faceLandmarks[0];
        if (!lm) { avisar(""); fallar("No encontré una cara en la foto. Usá una foto de frente, con buena luz y sin gorra."); return; }
        var m = M.medir(lm, cw, ch, fov), p = M.pose(lm, cw, ch);
        if (!M.razonable(m)) { avisar(""); fallar("No pude medir bien la cara de la foto. Probá con otra foto de frente o con la cámara."); return; }
        // Recorte alrededor de la cara (3 de ancho por 4 de alto)
        var fw = Math.abs(lm[454].x - lm[234].x) * cw;
        var w = Math.min(cw, fw * 1.9), h = Math.min(ch, w * 4 / 3);
        w = Math.min(w, h * 3 / 4);
        var x = Math.max(0, Math.min(cw - w, (lm[234].x + lm[454].x) / 2 * cw - w / 2));
        var y = Math.max(0, Math.min(ch - h, (lm[10].y + lm[152].y) / 2 * ch - h * 0.47));
        pintarResultado(c, cw, ch, { x: x, y: y, w: w, h: h }, lm, false);
        avisar("");
        entregar(m, "foto", Math.abs(p.yaw) > 14 || Math.abs(p.pitch) > 18 ? "La foto no está de frente, así que el resultado puede variar. Con la cámara sale más exacto." : "");
      })
      .catch(function () {
        URL.revokeObjectURL(url);
        avisar("");
        fallar(detector ? "No pude abrir esa foto. Probá con otra." : "No se pudo cargar el escáner. Revisá tu internet y probá otra vez.");
      });
  });

  /* ---------- resultado: la cara con las medidas en dorado ---------- */
  function pintarResultado(fuente, fw, fh, vis, lm, espejo) {
    var lienzoR = $("r-foto");
    var esc = Math.min(1, 900 / vis.w);
    var W = Math.round(vis.w * esc), H = Math.round(vis.h * esc);
    lienzoR.width = W; lienzoR.height = H;
    var c = lienzoR.getContext("2d");
    c.save();
    if (espejo) { c.translate(W, 0); c.scale(-1, 1); }
    c.drawImage(fuente, vis.x, vis.y, vis.w, vis.h, 0, 0, W, H);
    c.restore();
    var P = function (i) {
      var x = (lm[i].x * fw - vis.x) * esc, y = (lm[i].y * fh - vis.y) * esc;
      return { x: espejo ? W - x : x, y: y };
    };
    var medio = function (a, b) { var p = P(a), q = P(b); return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }; };
    var u = W / 360;
    // fuera de la cara, más oscuro
    var O = vision.FaceLandmarker.FACE_LANDMARKS_FACE_OVAL;
    c.beginPath();
    c.rect(0, 0, W, H);
    O.forEach(function (k, i) { var p = P(k.start); if (i) c.lineTo(p.x, p.y); else c.moveTo(p.x, p.y); });
    c.closePath();
    c.fillStyle = "rgba(13,12,10,.55)";
    c.fill("evenodd");
    c.lineJoin = "round";
    c.lineCap = "round";
    c.shadowColor = "rgba(0,0,0,.7)";
    c.shadowBlur = 4 * u;
    c.strokeStyle = "rgba(230,196,109,.85)";
    c.lineWidth = 1.5 * u;
    c.beginPath();
    O.forEach(function (k, i) { var p = P(k.start); if (i) c.lineTo(p.x, p.y); else c.moveTo(p.x, p.y); });
    c.closePath();
    c.stroke();
    var linea = function (a, b, texto) {
      c.strokeStyle = "#e6c46d";
      c.lineWidth = 2 * u;
      c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
      [a, b].forEach(function (p) { c.fillStyle = "#e6c46d"; c.beginPath(); c.arc(p.x, p.y, 3 * u, 0, Math.PI * 2); c.fill(); });
      var der = a.x > b.x ? a : b;
      c.font = "700 " + Math.round(13 * u) + "px Manrope, system-ui, sans-serif";
      c.textBaseline = "middle";
      var tw = c.measureText(texto).width, x = der.x + 7 * u, y = der.y;
      if (x + tw > W - 4 * u) { x = Math.min(der.x, W - 4 * u) - tw; y = der.y - 13 * u; }
      c.fillStyle = "#f1ead9";
      c.fillText(texto, x, y);
    };
    var arriba = P(10), abajo = P(152);
    c.strokeStyle = "#e6c46d";
    c.lineWidth = 1.5 * u;
    c.setLineDash([5 * u, 5 * u]);
    c.beginPath(); c.moveTo(arriba.x, arriba.y); c.lineTo(abajo.x, abajo.y); c.stroke();
    c.setLineDash([]);
    linea(medio(54, 21), medio(284, 251), "Frente");
    linea(P(234), P(454), "Pómulos");
    linea(P(58), P(288), "Quijada");
    c.font = "700 " + Math.round(13 * u) + "px Manrope, system-ui, sans-serif";
    c.textBaseline = "bottom";
    c.fillStyle = "#f1ead9";
    c.fillText("Largo", arriba.x + 6 * u, arriba.y - 4 * u);
    c.shadowBlur = 0;
  }

  function entregar(m, fuente, nota) {
    var r = M.clasificar(m), d = M.describir(m);
    var max = Math.max(m.frente, 1, m.quijada);
    var filas = [["Frente", m.frente], ["Pómulos", 1], ["Quijada", m.quijada]];
    var caja = $("r-medidas");
    caja.textContent = "";
    filas.forEach(function (f) {
      var p = Math.round(f[1] / max * 100);
      var fila = document.createElement("div"); fila.className = "medida";
      var nombre = document.createElement("span"); nombre.className = "medida__nombre"; nombre.textContent = f[0];
      var b = document.createElement("span"); b.className = "medida__barra";
      var lleno = document.createElement("span"); lleno.style.width = p + "%"; b.appendChild(lleno);
      var valor = document.createElement("span"); valor.className = "medida__valor"; valor.textContent = p + " %";
      fila.appendChild(nombre); fila.appendChild(b); fila.appendChild(valor);
      caja.appendChild(fila);
    });
    $("r-frases").textContent = [d.largo, d.quijada, d.barbilla, nota].filter(Boolean).join(" ");
    V.mostrar(r.forma, { fuente: fuente, segunda: r.segunda });
  }

  /* ---------- arranque ---------- */
  botonCamara.addEventListener("click", function () {
    if (!hayCamara) return;
    empezarCamara();
  });
  // Si la persona se va a otra app o pestaña, la cámara se apaga
  document.addEventListener("visibilitychange", function () {
    if (document.hidden && activo) reiniciar();
  });
  window.addEventListener("pagehide", detener);

  // Peso de la descarga (con compresión baja bastante menos)
  window.MerakiEscaner = { reiniciar: reiniciar };
})();
