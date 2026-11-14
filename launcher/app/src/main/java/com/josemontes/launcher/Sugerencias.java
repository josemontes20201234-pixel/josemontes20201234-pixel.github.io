package com.josemontes.launcher;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.PointF;
import android.graphics.RectF;
import android.graphics.Typeface;
import android.media.FaceDetector;
import android.util.DisplayMetrics;
import android.view.Gravity;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import org.json.JSONArray;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

/**
 * «Inteligencia» para la foto del bloqueo, toda dentro del cel (la foto no sale del teléfono):
 * saca sus colores, busca las caras, mide la luz y propone colores, acomodo y oscuridad.
 * Jose ve cada sugerencia en la vista previa y escoge cuál usar.
 */
final class Sugerencias {
    private Sugerencias() { }

    // ================================================================ análisis
    static final class Analisis {
        int[] colores = new int[0];   // de más a menos presente
        float[] cuanto = new float[0];
        final List<RectF> caras = new ArrayList<>(); // en fracciones de la foto (0..1)
        Bitmap chica;                 // la foto reducida, para medir la luz
    }

    static Analisis analizar(Bitmap foto) {
        Analisis r = new Analisis();
        // 1. colores: se achica la foto y se agrupan los colores parecidos (k-medias)
        int w = 72, h = Math.max(8, Math.round(72f * foto.getHeight() / foto.getWidth()));
        Bitmap mini = Bitmap.createScaledBitmap(foto, w, h, true);
        r.chica = Bitmap.createScaledBitmap(foto, 180, Math.max(8, Math.round(180f * foto.getHeight() / foto.getWidth())), true);
        int[] px = new int[w * h];
        mini.getPixels(px, 0, w, 0, 0, w, h);
        int k = 6;
        float[][] cen = new float[k][3];
        // arrancar con colores repartidos de oscuro a claro
        Integer[] orden = new Integer[px.length];
        for (int i = 0; i < px.length; i++) orden[i] = px[i];
        java.util.Arrays.sort(orden, (x, y) -> Double.compare(Colores.luz(x), Colores.luz(y)));
        for (int i = 0; i < k; i++) { int c = orden[(int) ((i + 0.5f) * orden.length / k)]; cen[i] = new float[]{(c >> 16) & 255, (c >> 8) & 255, c & 255}; }
        int[] grupo = new int[px.length];
        for (int it = 0; it < 10; it++) {
            float[][] suma = new float[k][3]; int[] n = new int[k];
            for (int i = 0; i < px.length; i++) {
                int c = px[i]; float rr = (c >> 16) & 255, gg = (c >> 8) & 255, bb = c & 255;
                int mejor = 0; float dm = Float.MAX_VALUE;
                for (int j = 0; j < k; j++) { float d = (rr - cen[j][0]) * (rr - cen[j][0]) + (gg - cen[j][1]) * (gg - cen[j][1]) + (bb - cen[j][2]) * (bb - cen[j][2]); if (d < dm) { dm = d; mejor = j; } }
                grupo[i] = mejor; suma[mejor][0] += rr; suma[mejor][1] += gg; suma[mejor][2] += bb; n[mejor]++;
            }
            for (int j = 0; j < k; j++) if (n[j] > 0) cen[j] = new float[]{suma[j][0] / n[j], suma[j][1] / n[j], suma[j][2] / n[j]};
        }
        int[] n = new int[k];
        for (int g : grupo) n[g]++;
        Integer[] idx = new Integer[k];
        for (int i = 0; i < k; i++) idx[i] = i;
        java.util.Arrays.sort(idx, (x, y) -> n[y] - n[x]);
        r.colores = new int[k]; r.cuanto = new float[k];
        for (int i = 0; i < k; i++) {
            float[] c = cen[idx[i]];
            r.colores[i] = 0xFF000000 | (Math.round(c[0]) << 16) | (Math.round(c[1]) << 8) | Math.round(c[2]);
            r.cuanto[i] = n[idx[i]] / (float) px.length;
        }
        // 2. caras (el detector de Android trabaja con fotos 565 de ancho par)
        try {
            int fw = Math.min(480, foto.getWidth()) & ~1, fh = Math.round((float) fw * foto.getHeight() / foto.getWidth());
            Bitmap b565 = Bitmap.createScaledBitmap(foto, fw, fh, true).copy(Bitmap.Config.RGB_565, false);
            FaceDetector fd = new FaceDetector(fw, fh, 8);
            FaceDetector.Face[] f = new FaceDetector.Face[8];
            int nc = fd.findFaces(b565, f);
            PointF mid = new PointF();
            for (int i = 0; i < nc; i++) {
                if (f[i] == null || f[i].confidence() < 0.3f) continue;
                f[i].getMidPoint(mid);
                float e = f[i].eyesDistance();
                r.caras.add(new RectF((mid.x - e * 1.5f) / fw, (mid.y - e * 1.6f) / fh, (mid.x + e * 1.5f) / fw, (mid.y + e * 2.2f) / fh));
            }
        } catch (Throwable e) { }
        return r;
    }

    /** Los colores de la última foto analizada (para el selector de colores). */
    static int[] coloresGuardados(MainActivity a) {
        try {
            JSONArray j = new JSONArray(a.prefs.getString("bloqueo_paleta", "[]"));
            int[] r = new int[j.length()];
            for (int i = 0; i < r.length; i++) r[i] = 0xFF000000 | Integer.parseInt(j.getString(i), 16);
            return r;
        } catch (Exception e) { return null; }
    }

    // ================================================================ propuestas
    static final class Combo {
        final String nombre; final int acento, reloj;
        Combo(String nombre, int acento, int reloj) { this.nombre = nombre; this.acento = acento; this.reloj = reloj; }
    }

    static List<Combo> combos(Analisis an) {
        List<Combo> l = new ArrayList<>();
        int vivo = 0, calido = 0, suave = 0; double sv = -1, sc = -1, ss = -1;
        for (int i = 0; i < an.colores.length; i++) {
            int c = an.colores[i]; float[] x = Colores.hsl(c); float pob = an.cuanto[i];
            double s1 = x[1] * Math.sqrt(pob) * (x[2] > 0.18f && x[2] < 0.85f ? 1 : 0.2);
            if (s1 > sv) { sv = s1; vivo = c; }
            double s2 = (x[0] >= 15 && x[0] <= 60 ? 1 : 0.15) * Math.sqrt(pob) * (x[1] + 0.1);
            if (s2 > sc) { sc = s2; calido = c; }
            double s3 = (1 - x[1]) * x[2] * Math.sqrt(pob);
            if (s3 > ss) { ss = s3; suave = c; }
        }
        l.add(new Combo("Dorado que combina", Colores.paraFondoOscuro(Colores.mezclar(0xFFD9B55C, calido, 0.3f)), 0xFFF5F1E8));
        int principal = Colores.paraFondoOscuro(vivo);
        l.add(new Combo("El color de la foto", principal, principal));
        l.add(new Combo("Suave y elegante", Colores.suave(suave), 0xFFFFFFFF));
        return l;
    }

    /** La luz promedio (0..1) de una franja de la pantalla, con la foto acomodada como quedaría. */
    static float luzEn(Analisis an, RectF marco, int W, int H, float y1, float y2) {
        Bitmap b = an.chica;
        double s = 0; int n = 0;
        for (int iy = 0; iy < 10; iy++) for (int ix = 0; ix < 16; ix++) {
            float sx = (ix + 0.5f) / 16f * W, sy = (y1 + (iy + 0.5f) / 10f * (y2 - y1)) * H;
            int px = (int) ((sx - marco.left) / marco.width() * b.getWidth()), py = (int) ((sy - marco.top) / marco.height() * b.getHeight());
            if (px < 0 || py < 0 || px >= b.getWidth() || py >= b.getHeight()) continue;
            s += Colores.luz(b.getPixel(px, py)); n++;
        }
        return n == 0 ? 0.3f : (float) (s / n);
    }

    /** Acomodo: sube o baja (y acerca si hace falta) para que las caras queden entre el reloj de Samsung y lo de Meraki. */
    static float[] acomodo(Analisis an, Bitmap foto, int W, int H) {
        if (an.caras.isEmpty()) return null;
        RectF u = new RectF(an.caras.get(0));
        for (RectF r : an.caras) u.union(r);
        float zonaArriba = 0.26f, zonaAbajo = 0.54f, centroY = 0.40f;
        float[] mejor = null; float mejorMal = Float.MAX_VALUE;
        for (float z = 1f; z <= 1.81f; z += 0.05f) {
            float k = Math.max((float) W / foto.getWidth(), (float) H / foto.getHeight()) * z;
            float pw = foto.getWidth() * k, ph = foto.getHeight() * k;
            float sx = (pw - W) / 2f, sy = (ph - H) / 2f;
            float cxs = u.centerX() * pw, cys = u.centerY() * ph;
            float left = W * 0.5f - cxs, top = H * centroY - cys;
            float fx = sx > 1 ? Math.max(-1f, Math.min(1f, (left + sx) / sx)) : 0f;
            float fy = sy > 1 ? Math.max(-1f, Math.min(1f, (top + sy) / sy)) : 0f;
            float l = -sx + fx * sx, t = -sy + fy * sy;
            float top1 = (t + u.top * ph) / H, bot1 = (t + u.bottom * ph) / H, izq = (l + u.left * pw) / W, der = (l + u.right * pw) / W;
            // qué tanto se sale de la zona libre (y castigo chiquito por acercar)
            float mal = Math.max(0, zonaArriba - top1) + Math.max(0, bot1 - zonaAbajo) + Math.max(0, -izq) + Math.max(0, der - 1) + (z - 1f) * 0.05f;
            if (mal < mejorMal - 0.001f) { mejorMal = mal; mejor = new float[]{fx, fy, z}; }
            if (mal < 0.02f) break;
        }
        return mejor;
    }

    static int oscuroPara(float luz) { return luz > 0.6f ? 3 : luz > 0.38f ? 2 : 1; }
    static final String[] OSCURO = {"", "Poquito", "Normal", "Bastante"};

    // ================================================================ pantalla de sugerencias
    static void abrir(MainActivity a) {
        File f = new File(a.getFilesDir(), FondoVivo.FOTO);
        if (!f.exists()) { a.toast("Primero poné una foto en la pantalla de bloqueo."); return; }
        final FrameLayout capa = new FrameLayout(a);
        capa.setClickable(true);
        capa.setBackgroundColor(a.claro ? 0xFFF4F1EA : 0xFF0B0A08);
        TextView cargando = a.texto("Analizando tu foto…\nSe queda en tu cel, no sale a ningún lado.", 15, a.FG, a.tf(false));
        cargando.setGravity(Gravity.CENTER);
        capa.addView(cargando, new FrameLayout.LayoutParams(-1, -1));
        a.abrirCapa(capa);
        new Thread(() -> {
            Analisis an = null; Bitmap foto = null;
            try {
                BitmapFactory.Options o = new BitmapFactory.Options(); o.inJustDecodeBounds = true;
                BitmapFactory.decodeFile(f.getPath(), o);
                int s = 1; while (Math.max(o.outWidth, o.outHeight) / (s * 2) >= 1400) s *= 2;
                BitmapFactory.Options o2 = new BitmapFactory.Options(); o2.inSampleSize = s;
                foto = BitmapFactory.decodeFile(f.getPath(), o2);
                if (foto != null) an = analizar(foto);
            } catch (Throwable e) { }
            final Analisis fin = an; final Bitmap ft = foto;
            a.ui.post(() -> {
                if (fin == null || ft == null) { a.cerrarCapa(); a.toast("No pude analizar la foto."); return; }
                // guardar los colores para el selector de colores
                JSONArray j = new JSONArray();
                for (int c : fin.colores) j.put(Colores.hex(c));
                a.prefs.edit().putString("bloqueo_paleta", j.toString()).apply();
                pintar(a, capa, fin, ft);
            });
        }).start();
    }

    static void pintar(MainActivity a, FrameLayout capa, Analisis an, Bitmap foto) {
        capa.removeAllViews();
        DisplayMetrics dm = new DisplayMetrics();
        a.getWindowManager().getDefaultDisplay().getRealMetrics(dm);
        final int W = dm.widthPixels, H = dm.heightPixels;

        final FondoVivo.Pintor pt = new FondoVivo.Pintor(a);
        pt.foto = foto; pt.fotoVer = a.prefs.getLong("bloqueo_foto_v", 0); pt.fotoPara = Math.max(W, H);
        final float[] ahora = {a.prefs.getFloat("bloqueo_foto_x", 0f), a.prefs.getFloat("bloqueo_foto_y", 0f), a.prefs.getFloat("bloqueo_foto_zoom", 1f)};
        pt.x = ahora[0]; pt.y = ahora[1]; pt.zoom = ahora[2];
        new Thread(() -> pt.proxima = FondoVivo.Pintor.proximaCita(a)).start();

        final float[] sugAco = acomodo(an, foto, W, H);
        final List<Combo> combos = combos(an);

        ScrollView sv = new ScrollView(a);
        LinearLayout col = new LinearLayout(a);
        col.setOrientation(LinearLayout.VERTICAL);
        col.setPadding(a.dp(18), a.insetArriba + a.dp(14), a.dp(18), a.insetAbajo + a.dp(30));
        sv.addView(col);
        capa.addView(sv, new FrameLayout.LayoutParams(-1, -1));

        LinearLayout cab = new LinearLayout(a);
        cab.setGravity(Gravity.CENTER_VERTICAL);
        LinearLayout tt = new LinearLayout(a);
        tt.setOrientation(LinearLayout.VERTICAL);
        tt.addView(a.etiqueta("Pantalla de bloqueo", a.acento));
        tt.addView(a.texto("✨ Sugerencias", 26, a.FG, a.tf(true)), a.lp(-2, -2, 6));
        cab.addView(tt, new LinearLayout.LayoutParams(0, -2, 1f));
        TextView x = a.texto("✕", 20, a.FG, Typeface.DEFAULT_BOLD);
        x.setGravity(Gravity.CENTER);
        x.setBackground(a.caja(a.CARD, 99, a.LINEA));
        x.setOnClickListener(v -> a.cerrarCapa());
        cab.addView(x, new LinearLayout.LayoutParams(a.dp(44), a.dp(44)));
        col.addView(cab);

        // vista previa: el bloqueo en chiquito, tal cual se vería
        final float esc = 0.5f;
        final View previa = new View(a) {
            @Override protected void onDraw(Canvas c) {
                float k = getWidth() / (float) W;
                c.save(); c.scale(k, k);
                c.clipRect(0, 0, W, H);
                pt.pintar(c, W, H, true);
                c.restore();
            }
        };
        FrameLayout marco = new FrameLayout(a);
        marco.setBackground(a.caja(0xFF000000, 22, a.acento));
        marco.setPadding(a.dp(3), a.dp(3), a.dp(3), a.dp(3));
        marco.setClipToOutline(true);
        marco.addView(previa, new FrameLayout.LayoutParams(-1, -1));
        LinearLayout.LayoutParams pm = new LinearLayout.LayoutParams(Math.round(W * esc), Math.round(H * esc));
        pm.gravity = Gravity.CENTER_HORIZONTAL; pm.topMargin = a.dp(14);
        col.addView(marco, pm);
        TextView nota = a.texto(an.caras.isEmpty() ? "No encontré caras claras en la foto: las sugerencias de acomodo no aplican." :
                "Encontré " + an.caras.size() + (an.caras.size() == 1 ? " cara." : " caras.") + " La foto se queda en tu cel.", 12.5f, a.MUTED, a.tf(false));
        nota.setGravity(Gravity.CENTER);
        col.addView(nota, a.lp(-1, -2, 8));

        // 1. acomodo
        if (sugAco != null) {
            LinearLayout c1 = tarjeta(a, col, "📐 Acomodo", "Muevo la foto" + (sugAco[2] > 1.01f ? " (y la acerco un poco)" : "") + " para que sus caras queden entre el reloj de Samsung y lo de Meraki.");
            botones(a, c1,
                    new String[]{"Ver como está", "Ver sugerido", "Usar"},
                    new Runnable[]{
                            () -> { pt.x = ahora[0]; pt.y = ahora[1]; pt.zoom = ahora[2]; previa.invalidate(); },
                            () -> { pt.x = sugAco[0]; pt.y = sugAco[1]; pt.zoom = sugAco[2]; previa.invalidate(); },
                            () -> {
                                pt.x = sugAco[0]; pt.y = sugAco[1]; pt.zoom = sugAco[2]; previa.invalidate();
                                ahora[0] = sugAco[0]; ahora[1] = sugAco[1]; ahora[2] = sugAco[2];
                                a.prefs.edit().putFloat("bloqueo_foto_x", sugAco[0]).putFloat("bloqueo_foto_y", sugAco[1]).putFloat("bloqueo_foto_zoom", sugAco[2]).apply();
                                a.toast("Acomodo guardado ✓");
                            }});
        }

        // 2. colores
        LinearLayout c2 = tarjeta(a, col, "🎨 Colores que combinan", "Tocá una para verla. «Usar» cambia el dorado de todo y el color del reloj del inicio.");
        final int[] escogido = {-1};
        LinearLayout opciones = new LinearLayout(a);
        opciones.setOrientation(LinearLayout.VERTICAL);
        c2.addView(opciones, a.lp(-1, -2, 10));
        final List<View> filas = new ArrayList<>();
        for (int i = 0; i < combos.size(); i++) {
            final int idx = i; final Combo cb = combos.get(i);
            LinearLayout f = new LinearLayout(a);
            f.setGravity(Gravity.CENTER_VERTICAL);
            f.setPadding(a.dp(12), a.dp(10), a.dp(12), a.dp(10));
            f.setBackground(a.caja(0, 14, a.LINEA));
            View s1 = new View(a); s1.setBackground(a.caja(cb.acento, 99, 0x55FFFFFF));
            View s2 = new View(a); s2.setBackground(a.caja(cb.reloj, 99, 0x55FFFFFF));
            f.addView(s1, new LinearLayout.LayoutParams(a.dp(26), a.dp(26)));
            LinearLayout.LayoutParams p2 = new LinearLayout.LayoutParams(a.dp(26), a.dp(26)); p2.leftMargin = a.dp(6);
            f.addView(s2, p2);
            TextView t = a.texto(cb.nombre + "\nacento " + Colores.nombre(cb.acento) + " · reloj " + Colores.nombre(cb.reloj), 13.5f, a.FG, a.tf(false));
            LinearLayout.LayoutParams pt2 = new LinearLayout.LayoutParams(0, -2, 1f); pt2.leftMargin = a.dp(12);
            f.addView(t, pt2);
            f.setOnClickListener(v -> {
                escogido[0] = idx;
                pt.acentoF = cb.acento;
                for (int k = 0; k < filas.size(); k++) filas.get(k).setBackground(a.caja(0, 14, k == idx ? cb.acento : a.LINEA));
                previa.invalidate();
            });
            filas.add(f);
            opciones.addView(f, a.lp(-1, -2, i == 0 ? 0 : 8));
        }
        botones(a, c2, new String[]{"Ver como está", "Usar la escogida"}, new Runnable[]{
                () -> { pt.acentoF = null; escogido[0] = -1; for (View v : filas) v.setBackground(a.caja(0, 14, a.LINEA)); previa.invalidate(); },
                () -> {
                    if (escogido[0] < 0) { a.toast("Primero tocá una de las tres."); return; }
                    Combo cb = combos.get(escogido[0]);
                    a.prefs.edit().putString("acento", Colores.hex(cb.acento)).putString("reloj_color", Colores.hex(cb.reloj)).apply();
                    a.aplicarTodo();
                    a.toast("Colores puestos ✓");
                }});

        // 3. oscuridad, medida donde va lo de Meraki
        RectF mf = pt.marcoFoto(W, H);
        int recom = oscuroPara(luzEn(an, mf, W, H, 0.55f, 0.85f));
        int actual = a.prefs.getInt("bloqueo_oscuro", 2);
        LinearLayout c3 = tarjeta(a, col, "🌗 Qué tan oscuro", "Donde van las letras tu foto es " + (recom == 3 ? "clara" : recom == 2 ? "media" : "oscura")
                + ": te recomiendo «" + OSCURO[recom] + "»" + (recom == actual ? " (ya lo tenés así ✓)." : " (ahora está en «" + OSCURO[actual] + "»)."));
        botones(a, c3, new String[]{"Ver", "Usar «" + OSCURO[recom] + "»"}, new Runnable[]{
                () -> { pt.oscuroF = recom; previa.invalidate(); },
                () -> { pt.oscuroF = recom; previa.invalidate(); a.prefs.edit().putInt("bloqueo_oscuro", recom).apply(); a.toast("Listo ✓"); }});

        // 4. color para el reloj de Samsung (eso se cambia en el editor de Samsung)
        float luzArriba = luzEn(an, mf, W, H, 0.06f, 0.26f);
        int sam = luzArriba > 0.58f ? 0xFF1A1A1A : (combos.isEmpty() ? 0xFFF5F1E8 : combos.get(0).reloj);
        LinearLayout c4 = tarjeta(a, col, "🕐 Reloj de Samsung", "Arriba tu foto es " + (luzArriba > 0.58f ? "clara" : "oscura") + ": en el editor de Samsung escogé el color "
                + Colores.nombre(sam) + " (#" + Colores.hex(sam) + ") para el reloj, y subilo y achicalo para que no tape sus caras.");
        View m4 = new View(a);
        m4.setBackground(a.caja(sam, 99, 0x55FFFFFF));
        c4.addView(m4, new LinearLayout.LayoutParams(a.dp(36), a.dp(36)));
    }

    static LinearLayout tarjeta(MainActivity a, LinearLayout col, String titulo, String texto) {
        LinearLayout c = new LinearLayout(a);
        c.setOrientation(LinearLayout.VERTICAL);
        c.setPadding(a.dp(16), a.dp(14), a.dp(16), a.dp(16));
        c.setBackground(a.caja(a.CARD, 18, a.LINEA));
        c.addView(a.texto(titulo, 16.5f, a.FG, a.tf(true)));
        TextView t = a.texto(texto, 13.5f, a.MUTED, a.tf(false));
        t.setLineSpacing(a.dp(2), 1f);
        c.addView(t, a.lp(-1, -2, 6));
        col.addView(c, a.lp(-1, -2, 14));
        return c;
    }

    static void botones(MainActivity a, LinearLayout c, String[] textos, Runnable[] acciones) {
        LinearLayout f = new LinearLayout(a);
        for (int i = 0; i < textos.length; i++) {
            boolean fuerte = i == textos.length - 1;
            TextView b = a.texto(textos[i], 13.5f, fuerte ? Musica.Barras.tintaSobre(a.acento) : a.FG, a.tf(true));
            b.setGravity(Gravity.CENTER);
            b.setPadding(a.dp(10), a.dp(10), a.dp(10), a.dp(10));
            b.setBackground(a.caja(fuerte ? a.acento : 0, 99, fuerte ? 0 : a.LINEA));
            final Runnable r = acciones[i];
            b.setOnClickListener(v -> r.run());
            LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(0, -2, 1f);
            if (i > 0) p.leftMargin = a.dp(8);
            f.addView(b, p);
        }
        c.addView(f, a.lp(-1, -2, 12));
    }
}
