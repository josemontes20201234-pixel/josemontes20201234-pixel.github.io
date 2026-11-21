# Escáner facial de Meraki

Archivos del escáner de la página «¿Qué corte te queda?» (merakibarbershop.com/visagismo/).
Todo corre en el teléfono del cliente: la imagen de la cámara no se envía ni se guarda.

- `vision_bundle.mjs` y `wasm/`: MediaPipe Tasks Vision 1.2.3 (paquete npm `@mediapipe/tasks-vision`).
- `face_landmarker.task`: modelo oficial Face Landmarker de MediaPipe (float16, versión 1).
  Lo baja el workflow «Meraki web — modelo del escáner facial».

Ambos son de Google LLC, con licencia Apache 2.0: https://www.apache.org/licenses/LICENSE-2.0

MediaPipe trae un registro de métricas de uso que se manda a Google (odml.pa.googleapis.com).
El escáner de Meraki lo bloquea en `../escaner.js`, así que la página no manda nada a Google.
