/* Página «Tarjeta de regalo»: vista previa en vivo y pedido por WhatsApp.
   El pedido le llega a Jose como texto; él la activa en la app de la Tarjeta Meraki cuando le pagan. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var form = $("rg-form");
  if (!form) return;
  var WA = "50360618603";
  var caja = $("rg-servicios"), lienzo = $("rg-lienzo");
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var limpio = function (s) { return String(s || "").replace(/\s+/g, " ").trim(); };

  // Servicios y precios del día (desde el 15 de diciembre salen los nuevos, igual que en la página de inicio)
  var precios = window.MerakiPrecios;
  if (precios && precios.length) {
    var antes = (form.querySelector('input[name="servicio"]:checked') || {}).value || "Corte moderno";
    caja.innerHTML = precios.map(function (s) {
      return '<label class="regalo__opcion"><input type="radio" name="servicio" value="' + esc(s[0]) + '" data-precio="' + s[1] + '"' + (s[0] === antes ? " checked" : "") + '>' +
        '<span class="regalo__texto"><span class="regalo__nombre">' + esc(s[0]) + '</span><span class="regalo__desc">' + esc(s[2]) + '</span></span>' +
        '<span class="regalo__precio">$' + s[1].toFixed(2) + '</span></label>';
    }).join("");
    if (!form.querySelector('input[name="servicio"]:checked')) form.querySelector('input[name="servicio"]').checked = true;
  }

  function datos() {
    var s = form.querySelector('input[name="servicio"]:checked');
    return {
      servicio: s ? s.value : "",
      precio: s ? Number(s.getAttribute("data-precio")) : 0,
      para: limpio($("rg-para").value),
      de: limpio($("rg-de").value),
      mensaje: limpio($("rg-mensaje").value)
    };
  }

  var pendiente = false;
  function pintar() {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(function () {
      pendiente = false;
      var d = datos();
      if (window.MerakiRegalo) window.MerakiRegalo.dibujar(lienzo, d);
      lienzo.setAttribute("aria-label", "Vista previa de la tarjeta de regalo: " + (d.servicio || "sin servicio") +
        (d.para ? ", para " + d.para : "") + (d.de ? ", de " + d.de : "") + (d.mensaje ? ". Mensaje: " + d.mensaje : "") + ".");
    });
  }

  function marcar(id, mal) {
    var campo = $(id), aviso = $(id + "-error");
    if (mal) campo.setAttribute("aria-invalid", "true"); else campo.removeAttribute("aria-invalid");
    aviso.hidden = !mal;
  }

  var cuenta = $("rg-cuenta"), mensaje = $("rg-mensaje");
  function contar() {
    var n = mensaje.value.length;
    cuenta.textContent = n ? "Llevás " + n + " de 90 letras." : "Hasta 90 letras.";
  }

  form.addEventListener("input", function (e) {
    if (e.target.id === "rg-para" || e.target.id === "rg-de") { if (limpio(e.target.value)) marcar(e.target.id, false); }
    if (e.target === mensaje) contar();
    pintar();
  });
  form.addEventListener("change", pintar);

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var d = datos(), primero = null;
    [["rg-para", d.para], ["rg-de", d.de]].forEach(function (c) {
      marcar(c[0], !c[1]);
      if (!c[1] && !primero) primero = $(c[0]);
    });
    if (primero) { primero.focus(); return; }
    var texto = "Hola Meraki, quiero una tarjeta de regalo 🎁\n" +
      "Servicio: " + d.servicio + " ($" + d.precio.toFixed(2) + ")\n" +
      "Para: " + d.para + "\n" +
      "De: " + d.de + (d.mensaje ? "\nMensaje: " + d.mensaje : "");
    var url = "https://wa.me/" + WA + "?text=" + encodeURIComponent(texto);
    var w = window.open(url, "_blank");
    if (w) { try { w.opener = null; } catch (err) {} } else location.href = url;
    $("rg-listo").hidden = false;
  });

  contar();
  pintar();
  // Si las fuentes tardan, se vuelve a dibujar cuando ya están
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(pintar);
})();
