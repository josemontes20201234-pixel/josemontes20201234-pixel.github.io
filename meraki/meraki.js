// La dirección vieja (github.io/meraki/…) lleva a la nueva, merakibarbershop.com
if (location.hostname === "josemontes20201234-pixel.github.io" && location.pathname.indexOf("/meraki/") === 0) {
  location.replace("https://merakibarbershop.com" + location.pathname.slice(7) + location.search + location.hash);
}

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

/* Leo, el asistente de IA, en la página: burbuja flotante y chat.
   Los mensajes van a /api/leo (mismo dominio); la plática se guarda en el teléfono del cliente solo por el día. */
(function () {
  var raiz = document.body.getAttribute("data-raiz") || "./";
  var avatar = raiz + "img/leo-avatar.webp";
  var WA = "https://wa.me/50360618603?text=" + encodeURIComponent("Hola Meraki, vengo de la página web");
  var HOY = new Date(Date.now() - 6 * 3600 * 1000).toISOString().slice(0, 10);
  var SALUDO = ["Hola, soy Leo, el asistente de IA de Meraki Barbershop 🦁💈", "Te doy precios, reviso los horarios libres y te aparto tu cita. ¿En qué te ayudo?"];
  var RAPIDOS = ["💈 Precios", "📅 Apartar cita", "📍 Ubicación"];
  var leerLocal = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var ponerLocal = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };
  var leerSesion = function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } };
  var ponerSesion = function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} };

  var ID = leerLocal("leo-id");
  if (!ID || !/^[a-f0-9]{24}$/.test(ID)) {
    var bytes = new Uint8Array(12);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(bytes);
    else for (var i = 0; i < 12; i++) bytes[i] = Math.floor(Math.random() * 256);
    ID = Array.prototype.map.call(bytes, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
    ponerLocal("leo-id", ID);
  }
  var estado = null;
  try { estado = JSON.parse(leerLocal("leo-platica") || "null"); } catch (e) {}
  if (!estado || estado.dia !== HOY || !Array.isArray(estado.msgs)) estado = { dia: HOY, msgs: [], botones: [] };
  var guardar = function () { ponerLocal("leo-platica", JSON.stringify(estado)); };

  var burbuja = document.createElement("button");
  burbuja.type = "button";
  burbuja.className = "leo-burbuja" + (leerLocal("leo-visto") ? "" : " leo-burbuja--nuevo");
  burbuja.setAttribute("aria-label", "Chatear con Leo, el asistente de Meraki");
  burbuja.setAttribute("aria-haspopup", "dialog");
  burbuja.setAttribute("aria-expanded", "false");
  burbuja.setAttribute("aria-controls", "leo-panel");
  burbuja.innerHTML = '<img src="' + avatar + '" alt="" width="96" height="96" decoding="async">';

  var aviso = document.createElement("p");
  aviso.className = "leo-aviso";
  aviso.hidden = true;
  aviso.textContent = "¿Te ayudo? Soy Leo 🦁";

  var panel = document.createElement("section");
  panel.className = "leo-panel";
  panel.id = "leo-panel";
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Chat con Leo, el asistente de Meraki");
  panel.innerHTML =
    '<header class="leo-panel__cabeza">' +
      '<img class="leo-panel__foto" src="' + avatar + '" alt="" width="44" height="44">' +
      '<div class="leo-panel__quien"><p class="leo-panel__nombre">Leo</p><p class="leo-panel__rol">Asistente de IA de Meraki Barbershop</p></div>' +
      '<button class="leo-panel__cerrar" type="button" aria-label="Cerrar el chat"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
    "</header>" +
    '<div class="leo-panel__mensajes" role="log" aria-live="polite"></div>' +
    '<div class="leo-panel__rapidos" hidden></div>' +
    '<form class="leo-panel__form" novalidate>' +
      '<label class="sr" for="leo-texto">Escribile a Leo</label>' +
      '<input id="leo-texto" type="text" maxlength="600" autocomplete="off" enterkeyhint="send" placeholder="Escribile a Leo…">' +
      '<button class="leo-panel__enviar" type="submit" aria-label="Enviar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.4 20.4 21 12 3.4 3.6 3.4 10.2 15 12 3.4 13.8z"/></svg></button>' +
    "</form>" +
    '<p class="leo-panel__nota">Leo es una IA y puede equivocarse. <a href="/privacidad/">Privacidad</a></p>';

  document.body.appendChild(aviso);
  document.body.appendChild(burbuja);
  document.body.appendChild(panel);

  var lista = panel.querySelector(".leo-panel__mensajes");
  var rapidos = panel.querySelector(".leo-panel__rapidos");
  var form = panel.querySelector("form");
  var campo = panel.querySelector("input");
  var enviar = panel.querySelector(".leo-panel__enviar");

  // Texto con links que se pueden tocar (se arma con nodos, nunca con HTML)
  function conLinks(el, texto) {
    String(texto).split(/(https?:\/\/[^\s<>"]+)/g).forEach(function (p, i) {
      if (!p) return;
      if (i % 2 === 0) { el.appendChild(document.createTextNode(p)); return; }
      var limpio = p.replace(/[.,;:!?)\]»”]+$/, "");
      var a = document.createElement("a");
      a.href = limpio;
      a.textContent = limpio.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
      if (!/^https:\/\/merakibarbershop\.com(\/|$)/.test(limpio)) { a.target = "_blank"; a.rel = "noopener"; }
      el.appendChild(a);
      if (p.length > limpio.length) el.appendChild(document.createTextNode(p.slice(limpio.length)));
    });
  }
  function pintar(m) {
    var div = document.createElement("div");
    div.className = "leo-msj leo-msj--" + (m.de === "yo" ? "yo" : "leo");
    conLinks(div, m.texto);
    if (m.wa) {
      var a = document.createElement("a");
      a.className = "leo-msj__wa"; a.href = WA; a.target = "_blank"; a.rel = "noopener";
      a.textContent = "Escribir por WhatsApp";
      div.appendChild(document.createElement("br"));
      div.appendChild(a);
    }
    lista.appendChild(div);
  }
  function bajar() { lista.scrollTop = lista.scrollHeight; }
  function agregar(m) {
    estado.msgs.push(m);
    estado.msgs = estado.msgs.slice(-40);
    guardar();
    pintar(m);
    bajar();
  }
  function ponerRapidos(botones) {
    estado.botones = (botones || []).slice(0, 4);
    guardar();
    rapidos.innerHTML = "";
    estado.botones.forEach(function (b) {
      var bt = document.createElement("button");
      bt.type = "button"; bt.className = "leo-rapido"; bt.textContent = b;
      bt.addEventListener("click", function () { mandar(b); });
      rapidos.appendChild(bt);
    });
    rapidos.hidden = !estado.botones.length;
  }
  estado.msgs.forEach(pintar);
  ponerRapidos(estado.botones);

  var ocupado = false;
  function mandar(texto) {
    texto = String(texto || "").trim().slice(0, 600);
    if (!texto || ocupado) return;
    ocupado = true;
    enviar.disabled = true;
    agregar({ de: "yo", texto: texto });
    ponerRapidos([]);
    var puntos = document.createElement("div");
    puntos.className = "leo-msj leo-msj--leo leo-escribiendo";
    puntos.setAttribute("aria-label", "Leo está escribiendo");
    puntos.innerHTML = "<span></span><span></span><span></span>";
    lista.appendChild(puntos);
    bajar();
    var ctrl = window.AbortController ? new AbortController() : null;
    var reloj = setTimeout(function () { if (ctrl) ctrl.abort(); }, 60000);
    fetch("/api/leo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: ID, texto: texto }), signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) {
        return r.json().then(function (j) {
          if (!j || !Array.isArray(j.burbujas) || !j.burbujas.length) throw new Error("sin respuesta " + r.status);
          return j;
        });
      })
      .then(function (j) {
        j.burbujas.forEach(function (t, i) { agregar({ de: "leo", texto: t, wa: !!j.lleno && i === j.burbujas.length - 1 }); });
        ponerRapidos(j.botones);
      })
      .catch(function () {
        agregar({ de: "leo", texto: "No me pude conectar ahorita 😕 Probá otra vez en un momento, o escribile a Jose por WhatsApp.", wa: true });
      })
      .then(function () {
        clearTimeout(reloj);
        if (puntos.parentNode) puntos.parentNode.removeChild(puntos);
        ocupado = false;
        enviar.disabled = false;
        if (!panel.hidden && window.matchMedia("(pointer: fine)").matches) campo.focus();
      });
  }

  function abrir(enfocar) {
    panel.hidden = false;
    aviso.hidden = true;
    burbuja.setAttribute("aria-expanded", "true");
    burbuja.classList.remove("leo-burbuja--nuevo");
    document.documentElement.classList.add("leo-abierto");
    ponerLocal("leo-visto", "1");
    ponerSesion("leo-abierto", "1");
    if (!estado.msgs.length) {
      SALUDO.forEach(function (t) { agregar({ de: "leo", texto: t }); });
      ponerRapidos(RAPIDOS);
    }
    bajar();
    if (enfocar !== false && window.matchMedia("(pointer: fine)").matches) campo.focus();
  }
  function cerrar() {
    panel.hidden = true;
    burbuja.setAttribute("aria-expanded", "false");
    document.documentElement.classList.remove("leo-abierto");
    ponerSesion("leo-abierto", "");
    burbuja.focus();
  }
  /* La burbuja se puede mover con el dedo o el mouse. Al soltarla se pega al borde más cercano
     (izquierdo o derecho) y el teléfono recuerda dónde quedó. Un toque sin mover abre el chat. */
  var lugar = null, arrastre = null, sinClick = false;
  try { lugar = JSON.parse(leerLocal("leo-lugar") || "null"); } catch (e) {}
  if (!lugar || (lugar.lado !== "izq" && lugar.lado !== "der") || typeof lugar.y !== "number") lugar = null;
  var limites = function () {
    var tam = burbuja.offsetWidth || 50, margen = window.innerWidth >= 960 ? 24 : 16;
    var cab = document.querySelector(".cabecera");
    var arriba = Math.max(8, (cab ? cab.getBoundingClientRect().bottom : 0) + 8);
    var abajo = Math.max(arriba, window.innerHeight - tam - margen);
    return { tam: tam, margen: margen, arriba: arriba, abajo: abajo };
  };
  var ponerEn = function (x, y) {
    burbuja.style.left = x + "px";
    burbuja.style.top = y + "px";
    burbuja.style.right = "auto";
    burbuja.style.bottom = "auto";
  };
  var acomodar = function (animar) {
    if (!lugar) return;
    var l = limites();
    var y = l.arriba + Math.min(1, Math.max(0, lugar.y)) * (l.abajo - l.arriba);
    var x = lugar.lado === "izq" ? l.margen : window.innerWidth - l.tam - l.margen;
    if (animar) {
      burbuja.classList.add("leo-burbuja--pegando");
      setTimeout(function () { burbuja.classList.remove("leo-burbuja--pegando"); }, 320);
    }
    ponerEn(x, y);
    // el saludito, a la par de la burbuja
    aviso.style.top = Math.max(0, y + l.tam / 2 - 17) + "px";
    aviso.style.bottom = "auto";
    aviso.style.left = lugar.lado === "izq" ? (l.margen + l.tam + 10) + "px" : "auto";
    aviso.style.right = lugar.lado === "izq" ? "auto" : (l.margen + l.tam + 10) + "px";
  };
  acomodar(false);
  window.addEventListener("resize", function () { acomodar(false); });

  burbuja.addEventListener("pointerdown", function (e) {
    if (e.button !== undefined && e.button !== 0) return;
    var r = burbuja.getBoundingClientRect();
    arrastre = { id: e.pointerId, x: e.clientX, y: e.clientY, izq: r.left, arriba: r.top, movio: false };
    try { burbuja.setPointerCapture(e.pointerId); } catch (err) {}
  });
  burbuja.addEventListener("pointermove", function (e) {
    if (!arrastre || e.pointerId !== arrastre.id) return;
    var dx = e.clientX - arrastre.x, dy = e.clientY - arrastre.y;
    if (!arrastre.movio && Math.abs(dx) + Math.abs(dy) < 8) return;
    arrastre.movio = true;
    burbuja.classList.add("leo-burbuja--moviendo");
    aviso.hidden = true;
    var l = limites();
    ponerEn(Math.min(window.innerWidth - l.tam - 4, Math.max(4, arrastre.izq + dx)),
            Math.min(window.innerHeight - l.tam - 4, Math.max(l.arriba, arrastre.arriba + dy)));
  });
  var soltar = function (e) {
    if (!arrastre || e.pointerId !== arrastre.id) return;
    var movio = arrastre.movio;
    arrastre = null;
    burbuja.classList.remove("leo-burbuja--moviendo");
    if (!movio) return;
    sinClick = true; // al soltar después de mover, no se abre el chat
    setTimeout(function () { sinClick = false; }, 400);
    var r = burbuja.getBoundingClientRect(), l = limites();
    lugar = {
      lado: r.left + r.width / 2 < window.innerWidth / 2 ? "izq" : "der",
      y: l.abajo > l.arriba ? (r.top - l.arriba) / (l.abajo - l.arriba) : 1
    };
    lugar.y = Math.round(Math.min(1, Math.max(0, lugar.y)) * 1000) / 1000;
    ponerLocal("leo-lugar", JSON.stringify(lugar));
    acomodar(true);
  };
  burbuja.addEventListener("pointerup", soltar);
  burbuja.addEventListener("pointercancel", soltar);

  burbuja.addEventListener("click", function (e) {
    if (sinClick) { sinClick = false; e.preventDefault(); return; }
    abrir();
  });
  aviso.addEventListener("click", function () { abrir(); });
  // Enlaces «Escribirle a Leo» de la página: abren este chat (sin JavaScript siguen a Instagram)
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("[data-leo]");
    if (!a) return;
    e.preventDefault();
    abrir();
  });
  panel.querySelector(".leo-panel__cerrar").addEventListener("click", cerrar);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !panel.hidden) cerrar(); });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var t = campo.value;
    campo.value = "";
    mandar(t);
  });

  // Si venía platicando en otra página, el chat sigue abierto
  if (leerSesion("leo-abierto") === "1") abrir(false);
  // La primera vez, un saludito al lado de la burbuja (una sola vez por visita)
  else if (!leerLocal("leo-visto") && !leerSesion("leo-aviso")) {
    ponerSesion("leo-aviso", "1");
    setTimeout(function () {
      if (!panel.hidden) return;
      aviso.hidden = false;
      // Se va solo, o apenas la persona se mueve por la página o toca algo
      var quitar = function (e) {
        if (e && e.target === aviso) return; // tocar el saludito abre el chat
        aviso.hidden = true;
        window.removeEventListener("scroll", quitar);
        document.removeEventListener("pointerdown", quitar);
      };
      window.addEventListener("scroll", quitar, { passive: true });
      document.addEventListener("pointerdown", quitar);
      setTimeout(quitar, 7000);
    }, 2500);
  }

  // Para otras partes de la página (por ejemplo, el escáner de visagismo)
  window.MerakiLeo = { abrir: abrir, mandar: function (t) { abrir(false); mandar(t); } };
})();
