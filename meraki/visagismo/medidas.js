/* Medidas de la cara para el escáner de Meraki. Sin dependencias: recibe los 478 puntos de MediaPipe
   (x e y de 0 a 1 en la imagen, z de profundidad en la misma escala que x) y dice qué forma tiene la cara. */
(function (global) {
  "use strict";

  // Cara promedio: modelo canónico de MediaPipe (canonical_face_model.obj), medido sin perspectiva
  var PROMEDIO = { largo: 1.1527, frente: 0.8722, quijada: 0.8767, cuerpo: 0.7567, barbilla: 0.4777 };
  var FOV_DIAGONAL = 78; // grados: cámara frontal típica de teléfono o compu

  // Qué tanto se aleja cada forma del promedio (en pasos de 4 %): largo, frente, quijada,
  // cuerpo de la quijada (qué tan ancha sigue hacia la barbilla) y ancho de la barbilla
  var PASO = 0.04;
  var FORMAS = {
    ovalada: { l: 0.6, f: 0.3, j: -0.3, b: 0, c: 0 },
    redonda: { l: -2.0, f: 0.2, j: 0.6, b: -0.6, c: 0.4 },
    cuadrada: { l: -1.4, f: 0.6, j: 1.6, b: 1.6, c: 1.0 },
    alargada: { l: 2.4, f: 0, j: 0, b: 0, c: 0 },
    corazon: { l: 0.2, f: 1.6, j: -1.4, b: -1.0, c: -1.6 },
    diamante: { l: 0.6, f: -1.6, j: -1.4, b: -0.6, c: -1.4 },
    triangular: { l: -0.2, f: -1.6, j: 1.6, b: 1.0, c: 0.6 }
  };
  var PESO = { l: 1, f: 0.9, j: 0.9, b: 0.5, c: 0.5 };
  var CERCA = 0.9; // si la segunda forma queda así de cerca, se menciona

  function factorK(ancho, alto, fov) {
    return 2 * Math.tan((fov || FOV_DIAGONAL) * Math.PI / 360) * ancho / Math.sqrt(ancho * ancho + alto * alto);
  }

  // La cámara cerca de la cara agranda lo que está adelante (nariz, frente) y achica los lados.
  // Con la profundidad de cada punto se deshace ese efecto, como si la foto se tomara de lejos.
  function corregir(lm, ancho, alto, fov) {
    var k = factorK(ancho, alto, fov), rel = alto / ancho;
    var zref = (lm[10].z + lm[152].z + lm[234].z + lm[454].z) / 4;
    var out = new Array(lm.length);
    for (var i = 0; i < lm.length; i++) {
      var p = lm[i], f = 1 + k * (p.z - zref);
      out[i] = { x: (p.x - 0.5) * f, y: (p.y - 0.5) * rel * f, z: p.z };
    }
    return out;
  }

  function dist(a, b) {
    var dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  // Giro de la cabeza (grados): de lado (yaw) y hacia arriba o abajo (pitch)
  function pose(lm, ancho, alto) {
    var rel = alto / ancho;
    return {
      yaw: Math.atan2(lm[454].z - lm[234].z, Math.abs(lm[454].x - lm[234].x)) * 180 / Math.PI,
      pitch: Math.atan2(lm[152].z - lm[10].z, Math.abs(lm[152].y - lm[10].y) * rel) * 180 / Math.PI
    };
  }

  // fov: ángulo de la cámara en grados (diagonal), si se sabe (por ejemplo, de los datos de la foto)
  function medir(lm, ancho, alto, fov) {
    var c = corregir(lm, ancho, alto, fov);
    var W = dist(c[234], c[454]);
    var J = dist(c[58], c[288]);
    return {
      largo: dist(c[10], c[152]) / W,
      frente: (dist(c[54], c[284]) + dist(c[21], c[251])) / 2 / W,
      quijada: J / W,
      cuerpo: dist(c[136], c[365]) / J,
      barbilla: dist(c[149], c[378]) / J
    };
  }

  function mediana(lista, clave) {
    var v = lista.map(function (m) { return m[clave]; }).sort(function (a, b) { return a - b; });
    var n = v.length, m = Math.floor(n / 2);
    return n % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
  }
  function juntar(lista) {
    var out = {};
    Object.keys(PROMEDIO).forEach(function (k) { out[k] = mediana(lista, k); });
    return out;
  }

  // ¿Las medidas tienen sentido? (si no, la cara salió mal detectada y hay que repetir)
  function razonable(m) {
    return m.largo > 0.85 && m.largo < 1.6 && m.frente > 0.6 && m.frente < 1.15 &&
      m.quijada > 0.6 && m.quijada < 1.15 && m.cuerpo > 0.5 && m.cuerpo < 1 && m.barbilla > 0.25 && m.barbilla < 0.8;
  }

  function clasificar(m) {
    var d = {
      l: (m.largo / PROMEDIO.largo - 1) / PASO,
      f: (m.frente / PROMEDIO.frente - 1) / PASO,
      j: (m.quijada / PROMEDIO.quijada - 1) / PASO,
      b: (m.cuerpo / PROMEDIO.cuerpo - 1) / PASO,
      c: (m.barbilla / PROMEDIO.barbilla - 1) / PASO
    };
    var lista = Object.keys(FORMAS).map(function (forma) {
      var p = FORMAS[forma], e = 0;
      Object.keys(PESO).forEach(function (k) { e += PESO[k] * (d[k] - p[k]) * (d[k] - p[k]); });
      return { forma: forma, error: e };
    }).sort(function (a, b) { return a.error - b.error; });
    return {
      forma: lista[0].forma,
      segunda: lista[1].error - lista[0].error < CERCA ? lista[1].forma : null,
      desvio: d,
      orden: lista
    };
  }

  // Frases para el cliente
  function describir(m) {
    var l = m.largo / PROMEDIO.largo, c = m.barbilla / PROMEDIO.barbilla, b = m.cuerpo / PROMEDIO.cuerpo;
    var largo = l >= 1.07 ? "Tu cara es más larga que el promedio."
      : l >= 1.03 ? "Tu cara es un poco más larga que el promedio."
      : l > 0.97 ? "El largo de tu cara está en el promedio."
      : l > 0.93 ? "Tu cara es un poco más corta y ancha que el promedio."
      : "Tu cara es más corta y ancha que el promedio.";
    var barbilla = c <= 0.92 ? "Tu barbilla es angosta, casi en punta."
      : c >= 1.08 ? "Tu barbilla es ancha."
      : "Tu barbilla es de ancho medio.";
    var quijada = b >= 1.05 ? "Tu quijada es marcada." : b <= 0.95 ? "Tu quijada es suave." : "";
    return { largo: largo, barbilla: barbilla, quijada: quijada };
  }

  global.MerakiMedidas = {
    PROMEDIO: PROMEDIO, FORMAS: FORMAS,
    medir: medir, pose: pose, juntar: juntar, razonable: razonable, clasificar: clasificar, describir: describir
  };
})(typeof window !== "undefined" ? window : globalThis);
