# Leo, la mascota de Meraki Barbershop

Decisiones de Jose (19 de noviembre de 2026):

- **Imagen oficial:** `leo-oficial.jpg` (caricatura, fondo gris carbón con brillo dorado, saludando, maquinita en una pata, camiseta negra con la M dorada).
- **Voz oficial:** Emiliano, de HeyGen (`voice_id` `70bc24b8126c446c8cf50fc1a01eb834`, "Punchy & Confident").
- **Para la miniserie:** Leo tiene que verse y sonar igual en todos los episodios.

## Cómo se hace un video de Leo

1. Guion corto (15 a 30 segundos), aprobado por Jose.
2. Voz de referencia: texto a voz con Emiliano (`HEYGEN_GENERATE_TEXT_TO_SPEECH`, cuesta centavos).
3. Video con el modelo de HeyGen (`POST /v3/models/videos`, `model: heygen-video-1`, `mode: reference_to_video`):
   - `reference_images`: la imagen oficial (URL pública de este repositorio).
   - `reference_audio`: el audio de Emiliano del paso 2.
   - `aspect_ratio: 9:16`, `resolution: 768p`, `duration`: lo que dure el guion (8 a 15 s).
   - En el prompt: el guion entre comillas, "una sola maquinita, nunca cambia de mano", fondo liso, cámara fija, sin texto ni música.
   - Costo medido: 8 s = $0.50 (unos $0.06 por segundo).
4. Revisar cuadro por cuadro (que no salgan dos maquinitas) y pasar el audio a texto para confirmar lo que dice.
5. Reel 1080x1920 con subtítulos (Poppins Bold, crema con contorno negro).

Lo que **no** sirve:
- La foto que habla de HeyGen (Avatar IV) rechaza a Leo: solo acepta caras humanas.
- Pegarle una voz encima a un video de Gemini: la boca no cuadra.
