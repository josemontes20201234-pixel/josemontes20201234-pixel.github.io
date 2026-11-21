(function () {
  // El Salvador está en UTC-6 todo el año (sin horario de verano)
  var sv = new Date(Date.now() - 6 * 3600 * 1000);
  var hoy = sv.toISOString().slice(0, 10);
  var dia = sv.getUTCDay();
  var hora = sv.getUTCHours() + sv.getUTCMinutes() / 60;
  var entre = function (a, b) { return hoy >= a && hoy <= b; };
  var $ = function (id) { return document.getElementById(id); };

  // Menú del teléfono
  var abrir = $("menu-abrir"), menu = $("menu-movil"), cerrar = $("menu-cerrar");
  function ponerMenu(abierto) {
    if (!menu) return;
    menu.hidden = !abierto;
    abrir.setAttribute("aria-expanded", String(abierto));
    document.body.classList.toggle("menu-abierto", abierto);
    (abierto ? cerrar : abrir).focus();
  }
  if (abrir && menu) {
    abrir.addEventListener("click", function () { ponerMenu(true); });
    cerrar.addEventListener("click", function () { ponerMenu(false); });
    menu.addEventListener("click", function (e) { if (e.target.closest("a")) ponerMenu(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !menu.hidden) ponerMenu(false); });
  }

  // Aviso de arriba
  var cinta = $("cinta");
  if (cinta) {
    var raiz = document.body.getAttribute("data-raiz") || "./";
    var aniv = function (t) { cinta.innerHTML = '<a href="' + raiz + 'aniversario/">' + t + "</a>"; };
    if (entre("2026-12-01", "2026-12-07")) aniv("Semana Aniversario Meraki, del martes 8 al domingo 13 de diciembre: con cada visita, un boleto para la rifa de un Servicio full detalle.");
    else if (entre("2026-12-08", "2026-12-13")) aniv("Estamos de aniversario: con cada visita te llevás un boleto para la rifa de un Servicio full detalle, el domingo 13.");
    else if (entre("2026-12-15", "2027-01-31")) cinta.textContent = "¿Tu Tarjeta Meraki es de antes del 15 de diciembre? Te respetamos el precio anterior hasta el 31 de enero.";
    else cinta.textContent = "Ahora aceptamos tarjeta de crédito y débito.";
  }

  // Cosas que solo se muestran hasta cierta fecha
  Array.prototype.forEach.call(document.querySelectorAll("[data-hasta]"), function (el) {
    if (hoy > el.getAttribute("data-hasta")) el.hidden = true;
  });

  // Semana Aniversario: antes (cuenta regresiva), durante (8 al 13 de diciembre) y después
  var INICIO = Date.UTC(2026, 11, 8, 12), FIN = Date.UTC(2026, 11, 14, 6); // 8 dic 6:00 a. m. y 14 dic 0:00 en El Salvador
  var fase = Date.now() < INICIO ? "antes" : Date.now() < FIN ? "durante" : "despues";
  Array.prototype.forEach.call(document.querySelectorAll("[data-fase]"), function (el) {
    el.hidden = el.getAttribute("data-fase").split(" ").indexOf(fase) < 0;
  });
  var cuentas = document.querySelectorAll(".cuenta");
  if (cuentas.length && fase === "antes") {
    var tic = function () {
      var r = Math.max(0, INICIO - Date.now()), t = Math.floor(r / 1000);
      var v = [Math.floor(t / 86400), Math.floor(t % 86400 / 3600), Math.floor(t % 3600 / 60), t % 60];
      Array.prototype.forEach.call(cuentas, function (c) {
        Array.prototype.forEach.call(c.querySelectorAll("b"), function (n, i) { n.textContent = (v[i] < 10 ? "0" : "") + v[i]; });
      });
      if (r === 0) location.reload();
    };
    tic(); setInterval(tic, 1000);
  }

  // ¿Abierto ahora?
  var estado = $("estado"), texto = $("estado-texto");
  if (estado && texto) {
    if (dia === 1) texto.textContent = "Hoy lunes descansamos. Mañana abrimos a las 6:00 a. m.";
    else if (hora < 6) texto.textContent = "Hoy abrimos a las 6:00 a. m.";
    else if (hora < 17) { texto.textContent = "Abierto ahora, hasta las 5:00 p. m."; estado.classList.add("estado--abierto"); }
    else if (dia === 0) texto.textContent = "Ya cerramos. Mañana lunes descansamos; abrimos el martes a las 6:00 a. m.";
    else texto.textContent = "Ya cerramos. Mañana abrimos a las 6:00 a. m.";
  }

  // Precios: desde el martes 15 de diciembre de 2026 entran los nuevos
  var lista = $("servicios-lista");
  if (lista && hoy >= "2026-12-15") {
    var NUEVOS = [
      ["Corte clásico", 4, "Corte a tijera o máquina, acabado limpio y perfilado de patillas."],
      ["Corte moderno", 5, "Degradados, cortes a cero, técnicas de tendencia y acabado con producto."],
      ["Combo el patrón", 6.5, "Corte moderno o clásico, perfilado de cejas y tónico refrescante."],
      ["Servicio full detalle", 8, "Corte moderno o clásico, barba perfilada con navaja y toalla tibia."],
      ["Diseño de barba Meraki", 4.5, "Diseño y definición de barba."],
      ["Perfilado express", 2.5, "Perfilado rápido."],
      ["Ritual Meraki Spa", 6.5, "Cuidado y relajación. Preguntanos los detalles."]
    ];
    lista.innerHTML = NUEVOS.map(function (s) {
      return '<li class="servicio"><div class="servicio__fila"><h3 class="servicio__nombre">' + s[0] +
        '</h3><span class="servicio__puntos" aria-hidden="true"></span><span class="servicio__precio">$' + s[1].toFixed(2) +
        '</span></div><p class="servicio__desc">' + s[2] + '</p></li>';
    }).join("");
  }
  var nota = $("nota-precios");
  if (nota) {
    if (entre("2026-12-08", "2026-12-13")) nota.textContent = "Semana Aniversario: con cada visita te llevás un boleto para la rifa de un Servicio full detalle, el domingo 13 de diciembre.";
    else if (entre("2026-12-15", "2027-01-31")) nota.textContent = "Precios nuevos desde el 15 de diciembre. Si tu Tarjeta Meraki es de antes de esa fecha, te respetamos el precio anterior hasta el 31 de enero.";
    if (nota.textContent) nota.hidden = false;
  }

  // Galería: lo último de Instagram (se actualiza sola cada mañana)
  var galeria = $("galeria"), adCaja = $("antes-despues");
  if ((galeria || adCaja) && window.fetch) {
    var MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    var PLAY = '<span class="galeria__play" aria-hidden="true"><svg viewBox="0 0 12 14"><path d="M0 0l12 7-12 7z" fill="currentColor"/></svg></span>';
    fetch("ig/galeria.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (g) {
      var ad = (g.antesDespues || []).slice(0, 4);
      if (adCaja && ad.length) {
        adCaja.innerHTML = ad.map(function (x) {
          return '<div class="comparar"><img src="' + x.despues + '" width="' + x.ancho + '" height="' + x.alto + '" loading="lazy" decoding="async" alt="Después del corte">' +
            '<div class="comparar__antes"><img src="' + x.antes + '" loading="lazy" decoding="async" alt="Antes del corte"></div>' +
            '<input class="comparar__rango" type="range" min="0" max="100" value="50" aria-label="Deslizá para comparar el antes y el después">' +
            '<span class="comparar__linea" aria-hidden="true"></span><span class="comparar__etiqueta comparar__etiqueta--antes">Antes</span>' +
            '<span class="comparar__etiqueta comparar__etiqueta--despues">Después</span></div>';
        }).join("");
        Array.prototype.forEach.call(adCaja.querySelectorAll(".comparar__rango"), function (r) {
          r.addEventListener("input", function () { r.parentNode.style.setProperty("--corte", r.value + "%"); });
        });
        $("antes-despues-seccion").hidden = false;
      }
      var fotos = (g.fotos || []).slice(0, 9);
      if (!galeria || !fotos.length) return;
      galeria.innerHTML = fotos.map(function (f) {
        var p = String(f.fecha).split("-");
        var cuando = p.length === 3 ? Number(p[2]) + " de " + MESES[Number(p[1]) - 1] + " de " + p[0] : "";
        var alt = (f.tipo === "video" ? "Video" : "Foto") + " de Meraki en Instagram" + (cuando ? ", " + cuando : "");
        return '<li><a class="galeria__item" href="' + f.enlace + '" target="_blank" rel="noopener"><img src="' + f.img +
          '" width="' + f.ancho + '" height="' + f.alto + '" loading="lazy" decoding="async" alt="' + alt + '">' +
          (f.tipo === "video" ? PLAY : "") + "</a></li>";
      }).join("");
    }).catch(function () {});
  }

  var anio = $("anio");
  if (anio) anio.textContent = sv.getUTCFullYear();

  // Barra fija abajo (en el teléfono), solo cuando ya pasaste la portada
  var dock = $("dock"), portada = document.querySelector(".portada");
  if (dock && portada && "IntersectionObserver" in window) {
    new IntersectionObserver(function (e) {
      var ver = !e[0].isIntersecting;
      dock.classList.toggle("dock--visible", ver);
      if (ver) dock.removeAttribute("inert"); else dock.setAttribute("inert", "");
    }).observe(portada);
  }
})();
