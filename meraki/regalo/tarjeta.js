/* Tarjeta de regalo de Meraki Barbershop.
   La misma función la dibuja en la página (vista previa, todavía sin código) y en la app del barbero
   (la de verdad, con su código y su QR), para que la persona vea exactamente lo que va a regalar. */
(function () {
  "use strict";
  var W = 1080, H = 1350;
  var BASE = (document.currentScript && document.currentScript.src) || location.href;
  var ruta = function (p) { return new URL(p, BASE).href; };
  var MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  var C = { oro: "#c9a24a", oroAlto: "#e6c46d", hueso: "#f1ead9", ceniza: "#a59b84", tenue: "#d6caae", fondo: "#0c0b08" };
  var SERIF = '"Meraki Bodoni", "Bodoni Moda", Didot, "Times New Roman", serif';
  var SANS = '"Meraki Manrope", Manrope, system-ui, sans-serif';

  // Fuentes y logo de la misma página web (sirve igual en merakibarbershop.com y en la app)
  var listo = null;
  function cargar() {
    if (listo) return listo;
    var fuentes = [
      ["Meraki Bodoni", "../fuentes/bodoni-moda.woff2", { weight: "400 900" }],
      ["Meraki Bodoni", "../fuentes/bodoni-moda-italic.woff2", { weight: "400 900", style: "italic" }],
      ["Meraki Manrope", "../fuentes/manrope.woff2", { weight: "200 800" }]
    ].map(function (f) {
      if (!window.FontFace) return Promise.resolve();
      var ff = new FontFace(f[0], "url(" + ruta(f[1]) + ") format('woff2')", f[2]);
      return ff.load().then(function () { document.fonts.add(ff); }).catch(function () {});
    });
    var logo = new Promise(function (ok) {
      var im = new Image();
      im.onload = function () { ok(im); };
      im.onerror = function () { ok(null); };
      im.src = ruta("../img/logo-meraki.png");
    });
    listo = Promise.all([logo, Promise.all(fuentes)]).then(function (r) {
      if (!r[0]) listo = null; // sin internet: se vuelve a intentar la próxima vez
      return { logo: r[0] };
    });
    return listo;
  }

  // "2027-02-21" → "21 de febrero de 2027"
  function fechaLarga(ymd) {
    var p = String(ymd || "").split("-");
    return p.length === 3 ? Number(p[2]) + " de " + MESES[Number(p[1]) - 1] + " de " + p[0] : "";
  }
  // Código "7Q4P9XHD" → "7Q4P-9XHD"
  function codigoBonito(c) {
    c = String(c || "").toUpperCase();
    return c.length === 8 ? c.slice(0, 4) + "-" + c.slice(4) : c;
  }

  function partir(g, texto, ancho) {
    var out = [], linea = "";
    String(texto).split(/\s+/).filter(Boolean).forEach(function (p) {
      var prueba = linea ? linea + " " + p : p;
      if (linea && g.measureText(prueba).width > ancho) { out.push(linea); linea = p; } else linea = prueba;
    });
    if (linea) out.push(linea);
    return out;
  }
  function recortar(g, s, ancho) {
    if (g.measureText(s).width <= ancho) return s;
    while (s.length > 1 && g.measureText(s + "…").width > ancho) s = s.slice(0, -1);
    return s.replace(/\s+$/, "") + "…";
  }
  // Dos líneas parejas (que no quede una palabra sola abajo)
  function parejo(g, l) {
    if (l.length !== 2) return l;
    var p = (l[0] + " " + l[1]).split(" "), mejor = l, peor = Infinity;
    for (var i = 1; i < p.length; i++) {
      var a = p.slice(0, i).join(" "), b = p.slice(i).join(" ");
      var m = Math.max(g.measureText(a).width, g.measureText(b).width);
      if (m < peor) { peor = m; mejor = [a, b]; }
    }
    return mejor;
  }
  // El tamaño más grande en que el texto cabe: primero en una sola línea (hasta unaMin), luego en varias
  function acomodar(g, texto, fuente, max, min, ancho, maxLineas, unaMin) {
    var cabe = function (l) { return l.every(function (x) { return g.measureText(x).width <= ancho; }); };
    var t, l;
    for (t = max; t >= (unaMin || max); t -= 2) {
      g.font = fuente(t);
      if (g.measureText(texto).width <= ancho) return { t: t, l: [texto] };
    }
    for (t = max; t >= min; t -= 2) {
      g.font = fuente(t);
      l = partir(g, texto, ancho);
      if (l.length <= maxLineas && cabe(l)) return { t: t, l: parejo(g, l) };
    }
    g.font = fuente(min);
    l = partir(g, texto, ancho);
    if (l.length > maxLineas) { l = l.slice(0, maxLineas); l[maxLineas - 1] += "…"; }
    return { t: min, l: l.map(function (x) { return recortar(g, x, ancho); }) };
  }
  function espaciado(g, px) { if ("letterSpacing" in g) g.letterSpacing = px + "px"; }

  function rombo(g, x, y, r) {
    g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r, y); g.lineTo(x, y + r); g.lineTo(x - r, y); g.closePath(); g.fill();
  }
  function caja(g, x, y, w, h, r) {
    g.beginPath();
    if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h);
  }

  // «Para» y «De» en una columna dorada; los nombres alineados a su lado, y el conjunto centrado
  function paraDe(g, filas, y) {
    var ETQ = "600 30px " + SANS, ESP = 18;
    g.font = ETQ; espaciado(g, 1);
    var we = Math.max.apply(null, filas.map(function (f) { return g.measureText(f[0]).width; }));
    espaciado(g, 0);
    var fits = filas.map(function (f) {
      return acomodar(g, f[1], function (t) { return "600 " + t + "px " + SERIF; }, 44, 30, 900 - we - ESP, 1, 30);
    });
    var wn = Math.max.apply(null, fits.map(function (f) { g.font = "600 " + f.t + "px " + SERIF; return g.measureText(f.l[0]).width; }));
    var x = (W - (we + ESP + wn)) / 2 + we;
    filas.forEach(function (f, i) {
      var yy = y + i * 54;
      g.textAlign = "right"; g.font = ETQ; espaciado(g, 1); g.fillStyle = C.oro; g.fillText(f[0], x, yy);
      g.textAlign = "left"; espaciado(g, 0); g.font = "600 " + fits[i].t + "px " + SERIF; g.fillStyle = C.hueso; g.fillText(fits[i].l[0], x + ESP, yy);
    });
    g.textAlign = "center";
  }

  /* datos: {servicio, para, de, mensaje, codigo, vence ("AAAA-MM-DD"), qr (objeto de qrcode-generator)}
     Sin código ni QR dibuja la vista previa de la página. */
  function dibujar(cv, d) {
    d = d || {};
    return cargar().then(function (rec) {
      cv.width = W; cv.height = H;
      var g = cv.getContext("2d");
      g.textAlign = "center"; g.textBaseline = "alphabetic"; espaciado(g, 0);

      // Fondo: negro cálido con luz dorada arriba
      var fondo = g.createLinearGradient(0, 0, 0, H);
      fondo.addColorStop(0, "#1c1710"); fondo.addColorStop(.55, "#110f0b"); fondo.addColorStop(1, C.fondo);
      g.fillStyle = fondo; g.fillRect(0, 0, W, H);
      var luz = g.createRadialGradient(W / 2, 230, 0, W / 2, 230, 640);
      luz.addColorStop(0, "rgba(201,162,74,.24)"); luz.addColorStop(1, "rgba(201,162,74,0)");
      g.fillStyle = luz; g.fillRect(0, 0, W, H);

      // Marco doble
      g.strokeStyle = C.oro; g.lineWidth = 3; g.strokeRect(34.5, 34.5, W - 69, H - 69);
      g.strokeStyle = "rgba(201,162,74,.38)"; g.lineWidth = 1.5; g.strokeRect(48, 48, W - 96, H - 96);

      // Logo
      if (rec.logo) {
        var lw = 250, lh = Math.round(lw * rec.logo.naturalHeight / rec.logo.naturalWidth);
        g.drawImage(rec.logo, (W - lw) / 2, 84, lw, lh);
      }
      g.fillStyle = C.oroAlto; g.font = "italic 500 54px " + SERIF;
      g.fillText("Tarjeta de regalo", W / 2, 404);
      g.fillStyle = C.oro; g.fillRect(W / 2 - 110, 434, 88, 1.5); g.fillRect(W / 2 + 22, 434, 88, 1.5); rombo(g, W / 2, 434.75, 7);

      // Centro: servicio, para quién, de quién y el mensaje
      var serv = acomodar(g, d.servicio || "Escogé un servicio", function (t) { return "600 " + t + "px " + SERIF; }, 86, 56, 900, 2, 70);
      var msj = String(d.mensaje || "").trim();
      var men = msj ? acomodar(g, "“" + msj + "”", function (t) { return "italic 500 " + t + "px " + SERIF; }, 38, 28, 860, 3) : null;
      var hServ = serv.l.length * serv.t * 1.08, hMen = men ? men.l.length * men.t * 1.34 : 0;
      var alto = hServ + 40 + 54 * 2 + (men ? 34 + hMen : 0);
      var y = 478 + Math.max(0, (452 - alto) / 2);
      g.fillStyle = d.servicio ? C.hueso : C.ceniza;
      g.font = "600 " + serv.t + "px " + SERIF;
      serv.l.forEach(function (l, i) { g.fillText(l, W / 2, y + serv.t * 0.82 + i * serv.t * 1.08); });
      y += hServ + 40;
      paraDe(g, [["Para", String(d.para || "").trim() || "…"], ["De", String(d.de || "").trim() || "…"]], y + 34);
      y += 54 * 2;
      if (men) {
        y += 34; g.fillStyle = C.tenue; g.font = "italic 500 " + men.t + "px " + SERIF;
        men.l.forEach(function (l, i) { g.fillText(l, W / 2, y + men.t * 0.9 + i * men.t * 1.34); });
      }

      // Talón: línea punteada y muescas como de boleto
      var yt = 966;
      g.strokeStyle = "rgba(201,162,74,.55)"; g.lineWidth = 2; g.setLineDash([12, 10]);
      g.beginPath(); g.moveTo(72, yt); g.lineTo(W - 72, yt); g.stroke(); g.setLineDash([]);
      [34.5, W - 34.5].forEach(function (x) {
        g.fillStyle = C.fondo; g.beginPath(); g.arc(x, yt, 20, 0, Math.PI * 2); g.fill();
        g.strokeStyle = C.oro; g.lineWidth = 3; g.beginPath();
        if (x < W / 2) g.arc(x, yt, 20, -Math.PI / 2, Math.PI / 2); else g.arc(x, yt, 20, Math.PI / 2, Math.PI * 1.5);
        g.stroke();
      });

      // QR (o el espacio donde va)
      var qx = 104, qy = 1010, qs = 252;
      if (d.qr && d.qr.getModuleCount) {
        g.fillStyle = "#fff"; caja(g, qx, qy, qs, qs, 20); g.fill();
        var n = d.qr.getModuleCount(), pad = 22, cel = (qs - pad * 2) / n;
        g.fillStyle = "#0d0c0a";
        for (var r = 0; r < n; r++) for (var k = 0; k < n; k++) {
          if (d.qr.isDark(r, k)) g.fillRect(Math.floor(qx + pad + k * cel), Math.floor(qy + pad + r * cel), Math.ceil(cel), Math.ceil(cel));
        }
      } else {
        g.strokeStyle = "rgba(201,162,74,.7)"; g.lineWidth = 2.5; g.setLineDash([10, 8]);
        caja(g, qx + 1.5, qy + 1.5, qs - 3, qs - 3, 20); g.stroke(); g.setLineDash([]);
        g.fillStyle = C.oroAlto; g.font = "700 26px " + SANS; g.fillText("Aquí va", qx + qs / 2, qy + 112);
        g.fillText("el código QR", qx + qs / 2, qy + 146);
      }

      // Código, vigencia y cómo usarla
      var tx = 398, ta = W - 70 - tx;
      g.textAlign = "left";
      if (d.codigo) { g.fillStyle = C.hueso; g.font = "800 58px " + SANS; espaciado(g, 5); g.fillText(codigoBonito(d.codigo), tx, 1066); }
      else { g.fillStyle = C.ceniza; g.font = "600 34px " + SANS; g.fillText("Se activa al pagarla", tx, 1062); }
      espaciado(g, 0);
      var vence = d.vence ? "Válida hasta el " + fechaLarga(d.vence) : "Válida por 3 meses";
      var vf = acomodar(g, vence, function (t) { return "700 " + t + "px " + SANS; }, 29, 22, ta, 1);
      g.fillStyle = C.oroAlto; g.font = "700 " + vf.t + "px " + SANS; g.fillText(vf.l[0], tx, 1116);
      g.fillStyle = C.ceniza; g.font = "500 26px " + SANS;
      g.fillText("Apartá tu cita en merakibarbershop.com", tx, 1172);
      g.fillText("o al WhatsApp 6061-8603.", tx, 1208);
      g.fillStyle = "rgba(165,155,132,.8)"; g.font = "500 22px " + SANS;
      g.fillText("Se usa una vez y no se cambia por dinero.", tx, 1256);
      g.textAlign = "center";
      return cv;
    });
  }

  window.MerakiRegalo = { ANCHO: W, ALTO: H, cargar: cargar, dibujar: dibujar, fechaLarga: fechaLarga, codigoBonito: codigoBonito };
})();
