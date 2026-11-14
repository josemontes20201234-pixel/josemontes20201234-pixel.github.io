package com.josemontes.launcher;

import android.app.KeyguardManager;
import android.app.WallpaperManager;
import android.content.BroadcastReceiver;
import android.content.ContentUris;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.BitmapShader;
import android.graphics.Canvas;
import android.graphics.LinearGradient;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.graphics.RadialGradient;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.CalendarContract;
import android.service.wallpaper.WallpaperService;
import android.text.StaticLayout;
import android.text.TextPaint;
import android.text.TextUtils;
import android.view.SurfaceHolder;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.List;

/**
 * Fondo vivo Meraki: la foto que escojás con el estilo Meraki, y en la pantalla de bloqueo
 * el versículo del día, cómo va la barbería, la próxima cita y el clima (compacto, abajo).
 * Va DETRÁS del bloqueo de Samsung: la huella, el PIN y la contraseña siguen siendo de Samsung.
 */
public class FondoVivo extends WallpaperService {
    static final String FOTO = "bloqueo.jpg";

    @Override public Engine onCreateEngine() { return new Motor(); }

    class Motor extends Engine implements SharedPreferences.OnSharedPreferenceChangeListener {
        final Handler h = new Handler(Looper.getMainLooper());
        Pintor pintor;
        boolean visible;
        int ancho, alto;

        final Runnable cadaMinuto = new Runnable() {
            @Override public void run() {
                h.removeCallbacks(this);
                if (!visible) return;
                new Thread(() -> { pintor.proxima = Pintor.proximaCita(FondoVivo.this); h.post(Motor.this::dibujar); }).start();
                h.postDelayed(this, 60_000);
            }
        };

        final BroadcastReceiver rx = new BroadcastReceiver() {
            @Override public void onReceive(Context c, Intent i) { if (visible) dibujar(); }
        };
        final Runnable alCambiarMusica = () -> { if (visible) dibujar(); };

        @Override public void onCreate(SurfaceHolder s) {
            super.onCreate(s);
            pintor = new Pintor(FondoVivo.this);
            pintor.prefs.registerOnSharedPreferenceChangeListener(this);
            Musica.oyentes.add(alCambiarMusica);
            IntentFilter f = new IntentFilter();
            f.addAction(Intent.ACTION_USER_PRESENT); f.addAction(Intent.ACTION_SCREEN_ON); f.addAction(Intent.ACTION_SCREEN_OFF);
            try {
                if (Build.VERSION.SDK_INT >= 33) registerReceiver(rx, f, Context.RECEIVER_NOT_EXPORTED); else registerReceiver(rx, f);
            } catch (Exception e) { }
        }

        @Override public void onDestroy() {
            h.removeCallbacksAndMessages(null);
            try { unregisterReceiver(rx); } catch (Exception e) { }
            pintor.prefs.unregisterOnSharedPreferenceChangeListener(this);
            Musica.oyentes.remove(alCambiarMusica);
            super.onDestroy();
        }

        @Override public void onVisibilityChanged(boolean v) {
            visible = v;
            if (v) { dibujar(); cadaMinuto.run(); } else h.removeCallbacks(cadaMinuto);
        }

        @Override public void onSurfaceChanged(SurfaceHolder s, int format, int w, int hh) {
            super.onSurfaceChanged(s, format, w, hh);
            ancho = w; alto = hh;
            dibujar();
        }

        @Override public void onSurfaceRedrawNeeded(SurfaceHolder s) { dibujar(); }

        @Override public void onSharedPreferenceChanged(SharedPreferences p, String k) {
            if (k == null || k.startsWith("bloqueo_") || k.startsWith("caja_") || k.equals("tm_resumen") || k.equals("clima_json") || k.equals("acento"))
                h.post(() -> { if (visible) dibujar(); });
        }

        /** ¿Se está viendo en la pantalla de bloqueo? (en el inicio sólo se ve la foto) */
        boolean enBloqueo() {
            if (isPreview()) return true;
            if (Build.VERSION.SDK_INT >= 34) {
                try { if (getWallpaperFlags() == WallpaperManager.FLAG_LOCK) return true; } catch (Throwable t) { }
            }
            KeyguardManager km = (KeyguardManager) getSystemService(KEYGUARD_SERVICE);
            return km != null && km.isKeyguardLocked();
        }

        void dibujar() {
            SurfaceHolder s = getSurfaceHolder();
            if (s == null || ancho == 0) return;
            Canvas c = null;
            try {
                c = s.lockCanvas();
                if (c == null) return;
                pintor.pintar(c, ancho, alto, enBloqueo());
            } catch (Throwable e) {
                if (c != null) c.drawColor(0xFF0B0A08); // si algo falla, que por lo menos quede un fondo oscuro
            } finally {
                if (c != null) try { s.unlockCanvasAndPost(c); } catch (Exception e) { }
            }
        }
    }

    /** Dibuja el fondo: lo usan el fondo vivo y la vista previa de Ajustes (para acomodar la foto). */
    static final class Pintor {
        final Context ctx;
        final SharedPreferences prefs;
        final float den, sp;
        Bitmap foto, logo;
        long fotoVer = -1;
        int fotoPara;
        volatile String proxima;
        /** Mientras se acomoda la foto en Ajustes, se usan estos valores en vez de los guardados. */
        Float x, y, zoom;
        /** Para ver una sugerencia antes de usarla. */
        Integer acentoF, oscuroF;

        Pintor(Context c) {
            ctx = c;
            prefs = c.getSharedPreferences("meraki", Context.MODE_PRIVATE);
            den = c.getResources().getDisplayMetrics().density;
            sp = c.getResources().getDisplayMetrics().scaledDensity;
            try { logo = BitmapFactory.decodeResource(c.getResources(), R.drawable.logo); } catch (Exception e) { }
        }

        int dp(float v) { return Math.round(v * den); }
        boolean ver(String k) { return prefs.getBoolean("bloqueo_" + k, true); }
        int acento() { if (acentoF != null) return acentoF; try { return 0xFF000000 | Integer.parseInt(prefs.getString("acento", "D9B55C"), 16); } catch (Exception e) { return 0xFFD9B55C; } }
        float fx() { return x != null ? x : prefs.getFloat("bloqueo_foto_x", 0f); }
        float fy() { return y != null ? y : prefs.getFloat("bloqueo_foto_y", 0f); }
        float fz() { return zoom != null ? zoom : prefs.getFloat("bloqueo_foto_zoom", 1f); }

        /** ¿Hay música? Samsung pone su barrita de música abajo y no hay que taparla. */
        boolean hayMusica() {
            try {
                android.media.AudioManager am = (android.media.AudioManager) ctx.getSystemService(Context.AUDIO_SERVICE);
                if (am != null && am.isMusicActive()) return true;
            } catch (Exception e) { }
            return Musica.actual != null;
        }

        // ------------------------------------------------------------ datos
        /** Lo siguiente del calendario (hoy o mañana). */
        static String proximaCita(Context ctx) {
            try {
                long ahora = System.currentTimeMillis();
                long ini = Barberia.inicioDia(ahora), fin = Barberia.masDias(ini, 2);
                Uri.Builder ub = CalendarContract.Instances.CONTENT_URI.buildUpon();
                ContentUris.appendId(ub, ini); ContentUris.appendId(ub, fin);
                String[] proj = {CalendarContract.Instances.TITLE, CalendarContract.Instances.BEGIN, CalendarContract.Instances.END, CalendarContract.Instances.ALL_DAY};
                try (Cursor c = ctx.getContentResolver().query(ub.build(), proj, CalendarContract.Instances.VISIBLE + "=1", null, CalendarContract.Instances.BEGIN + " ASC")) {
                    while (c != null && c.moveToNext()) {
                        boolean todo = c.getInt(3) == 1;
                        long b = c.getLong(1), e = c.getLong(2);
                        if (todo || e < ahora) continue;
                        String t = c.getString(0);
                        if (TextUtils.isEmpty(t)) t = "(Sin título)";
                        if (b <= ahora) return "Ahora · " + t;
                        String hora = new SimpleDateFormat("h:mm a", MainActivity.ES).format(new Date(b)).replace(". ", "").replace(".", "");
                        return (b < Barberia.masDias(ini, 1) ? "" : "Mañana ") + hora + " · " + t;
                    }
                }
            } catch (Exception e) { }
            return null;
        }

        String textoHoy() {
            try {
                long hoy = Barberia.inicioDia(System.currentTimeMillis());
                JSONArray j = new JSONArray(prefs.getString(Barberia.claveMes(hoy), "[]"));
                List<Barberia.Venta> l = new ArrayList<>();
                for (int i = 0; i < j.length(); i++) { Barberia.Venta v = Barberia.Venta.de(j.getJSONObject(i)); if (v.t >= hoy) l.add(v); }
                int n = Barberia.servicios(l);
                if (n == 0 && Calendar.getInstance().get(Calendar.DAY_OF_WEEK) == Calendar.MONDAY) return "Hoy descansás";
                return "Hoy " + Barberia.plata(Barberia.suma(l)) + " · " + n + (n == 1 ? " servicio" : " servicios");
            } catch (Exception e) { return null; }
        }

        List<String> avisosTarjeta() {
            List<String> r = new ArrayList<>();
            try {
                JSONObject o = new JSONObject(prefs.getString("tm_resumen", "{}"));
                int in = o.optInt("inactivos"), pr = o.optInt("premio"), cu = o.optInt("cumple");
                if (cu > 0) r.add("🎂 " + cu + (cu == 1 ? " cumple años" : " cumplen años"));
                if (pr > 0) r.add("🎁 " + pr + (pr == 1 ? " premio" : " premios"));
                if (in > 0) r.add("⏰ " + in + (in == 1 ? " inactivo" : " inactivos"));
            } catch (Exception e) { }
            return r;
        }

        String textoClima() {
            try {
                JSONObject j = new JSONObject(prefs.getString("clima_json", "")), cur = j.getJSONObject("current");
                return Math.round(cur.getDouble("temperature_2m")) + "° " + MainActivity.descClima(cur.getInt("weather_code"));
            } catch (Exception e) { return null; }
        }

        // ------------------------------------------------------------ foto
        void cargarFoto(int ancho, int alto) {
            long v = prefs.getLong("bloqueo_foto_v", 0);
            int para = Math.max(ancho, alto);
            if (v == fotoVer && para == fotoPara && (foto != null || v == 0)) return;
            fotoVer = v; fotoPara = para;
            foto = null;
            File f = new File(ctx.getFilesDir(), FOTO);
            if (v == 0 || !f.exists() || ancho == 0) return;
            try {
                BitmapFactory.Options o = new BitmapFactory.Options(); o.inJustDecodeBounds = true;
                BitmapFactory.decodeFile(f.getPath(), o);
                int s = 1;
                // se deja más grande que la pantalla para poder acercarla sin que se vea borrosa
                while (o.outWidth / (s * 2) >= ancho * 1.5f && o.outHeight / (s * 2) >= alto * 1.5f) s *= 2;
                BitmapFactory.Options o2 = new BitmapFactory.Options(); o2.inSampleSize = s;
                foto = BitmapFactory.decodeFile(f.getPath(), o2);
            } catch (Throwable e) { foto = null; }
        }

        /** Dónde queda la foto: llena la pantalla, con el acercamiento y el corrimiento que escogiste. */
        RectF marcoFoto(int ancho, int alto) {
            float k = Math.max((float) ancho / foto.getWidth(), (float) alto / foto.getHeight()) * Math.max(1f, Math.min(3f, fz()));
            float w = foto.getWidth() * k, h = foto.getHeight() * k;
            float sx = (w - ancho) / 2f, sy = (h - alto) / 2f; // lo que sobra a cada lado
            float left = -sx + Math.max(-1f, Math.min(1f, fx())) * sx;
            float top = -sy + Math.max(-1f, Math.min(1f, fy())) * sy;
            return new RectF(left, top, left + w, top + h);
        }

        // ------------------------------------------------------------ dibujar
        void pintar(Canvas c, int ancho, int alto, boolean bloqueo) {
            cargarFoto(ancho, alto);
            Paint p = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG);
            if (foto != null) {
                c.drawColor(0xFF000000);
                c.drawBitmap(foto, null, marcoFoto(ancho, alto), p);
            } else {
                // sin foto: el fondo Meraki, oscuro con un brillo dorado y la M de marca de agua
                p.setShader(new LinearGradient(0, 0, 0, alto, 0xFF1C1A16, 0xFF0B0A08, Shader.TileMode.CLAMP));
                c.drawRect(0, 0, ancho, alto, p);
                p.setShader(new RadialGradient(ancho * 0.5f, alto * 0.42f, ancho * 0.75f, MainActivity.conAlpha(acento(), 0x30), 0x00000000, Shader.TileMode.CLAMP));
                c.drawRect(0, 0, ancho, alto, p);
                if (logo != null) {
                    Paint pl = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG);
                    pl.setAlpha(46);
                    circulo(c, logo, ancho / 2f, alto * 0.42f, ancho * 0.31f, pl);
                }
            }
            if (bloqueo) pintarBloqueo(c, ancho, alto);
        }

        /** Lo de Meraki encima de la foto, compacto, sólo en la pantalla de bloqueo. */
        void pintarBloqueo(Canvas c, int ancho, int alto) {
            int ac = acento();
            String pos = prefs.getString("bloqueo_pos", "abajo");
            int oscuro = oscuroF != null ? oscuroF : prefs.getInt("bloqueo_oscuro", 2); // 1 poco · 2 normal · 3 mucho
            int a1 = oscuro == 1 ? 0x66 : oscuro == 3 ? 0xD9 : 0xA6;
            int margen = dp(24), anchoTexto = ancho - margen * 2;

            TextPaint pLogo = texto(10, ac, Typeface.create("sans-serif-black", Typeface.NORMAL));
            pLogo.setLetterSpacing(0.24f);
            TextPaint pVerso = texto(15, 0xFFFFFFFF, Typeface.create(Typeface.SERIF, Typeface.NORMAL));
            pVerso.setShadowLayer(dp(5), 0, dp(1), 0xAA000000);
            TextPaint pRef = texto(11.5f, ac, Typeface.create("sans-serif-medium", Typeface.NORMAL));
            pRef.setShadowLayer(dp(4), 0, dp(1), 0x99000000);
            TextPaint pChip = texto(12.5f, 0xFFF5F1E8, Typeface.create("sans-serif-medium", Typeface.NORMAL));

            boolean conLogo = ver("logo"), conVerso = ver("versiculo");
            String[] v = Versiculos.deHoy(0);
            StaticLayout verso = null;
            if (conVerso) {
                // el versículo siempre completo: si es largo, la letra se achica un poquito
                String tv = "«" + v[1] + "»";
                for (float tam : new float[]{15, 14, 13, 12}) {
                    pVerso.setTextSize(tam * sp);
                    verso = StaticLayout.Builder.obtain(tv, 0, tv.length(), pVerso, anchoTexto).setLineSpacing(dp(2), 1f).build();
                    if (verso.getLineCount() <= 4) break;
                }
            }

            List<String> chips = new ArrayList<>();
            if (ver("hoy")) { String t = textoHoy(); if (t != null) chips.add(t); chips.addAll(avisosTarjeta()); }
            if (ver("cita")) { String t = proxima; if (t != null) chips.add("📅 " + t); }
            if (ver("clima")) { String t = textoClima(); if (t != null) chips.add(t); }
            int chipAlto = dp(28), sep = dp(6);
            List<float[]> filas = acomodarChips(chips, pChip, anchoTexto, sep);

            int logoAlto = dp(22);
            float altoBloque = 0;
            if (conLogo) altoBloque += logoAlto + dp(10);
            if (verso != null) altoBloque += verso.getHeight() + dp(4) + dp(16) + dp(10);
            if (!filas.isEmpty()) altoBloque += filas.size() * (chipAlto + sep) - sep;
            if (altoBloque <= 0) return;

            // abajo: pegado encima de la huella y los atajos de Samsung
            float y0;
            if ("arriba".equals(pos)) y0 = alto * 0.24f;
            else if ("centro".equals(pos)) y0 = (alto - altoBloque) / 2f;
            else y0 = alto * (hayMusica() ? 0.685f : 0.80f) - altoBloque;
            y0 = Math.max(alto * 0.18f, y0);

            // sombra detrás del bloque (hasta abajo si va abajo)
            Paint sombra = new Paint();
            float sTop = y0 - dp(56), sBot = "abajo".equals(pos) ? alto : y0 + altoBloque + dp(56);
            sombra.setShader(new LinearGradient(0, sTop, 0, sBot,
                    "abajo".equals(pos) ? new int[]{0, a1 << 24, a1 << 24} : new int[]{0, a1 << 24, a1 << 24, 0},
                    "abajo".equals(pos) ? new float[]{0f, 0.3f, 1f} : new float[]{0f, 0.25f, 0.75f, 1f}, Shader.TileMode.CLAMP));
            c.drawRect(0, sTop, ancho, sBot, sombra);

            float y = y0;
            if (conLogo) {
                if (logo != null) circulo(c, logo, margen + logoAlto / 2f, y + logoAlto / 2f, logoAlto / 2f, new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG));
                Paint.FontMetrics fm = pLogo.getFontMetrics();
                c.drawText("MERAKI BARBERSHOP", margen + logoAlto + dp(8), y + logoAlto / 2f - (fm.ascent + fm.descent) / 2f, pLogo);
                y += logoAlto + dp(10);
            }
            if (verso != null) {
                c.save(); c.translate(margen, y); verso.draw(c); c.restore();
                y += verso.getHeight() + dp(4);
                c.drawText(v[0] + "  ·  RVR1960", margen, y + dp(12), pRef);
                y += dp(16) + dp(10);
            }
            Paint fondoChip = new Paint(Paint.ANTI_ALIAS_FLAG);
            fondoChip.setColor(0x80000000);
            Paint borde = new Paint(Paint.ANTI_ALIAS_FLAG);
            borde.setStyle(Paint.Style.STROKE); borde.setStrokeWidth(dp(1)); borde.setColor(MainActivity.conAlpha(ac, 0x59));
            Paint.FontMetrics fm = pChip.getFontMetrics();
            int i = 0;
            for (float[] fila : filas) {
                float x = margen;
                for (float w : fila) {
                    String t = chips.get(i++);
                    RectF r = new RectF(x, y, x + w, y + chipAlto);
                    c.drawRoundRect(r, chipAlto / 2f, chipAlto / 2f, fondoChip);
                    c.drawRoundRect(r, chipAlto / 2f, chipAlto / 2f, borde);
                    String mostrar = TextUtils.ellipsize(t, pChip, w - dp(22), TextUtils.TruncateAt.END).toString();
                    c.drawText(mostrar, x + dp(11), y + chipAlto / 2f - (fm.ascent + fm.descent) / 2f, pChip);
                    x += w + sep;
                }
                y += chipAlto + sep;
            }
        }

        /** Reparte las pastillas en filas según el ancho; devuelve el ancho de cada una por fila. */
        List<float[]> acomodarChips(List<String> chips, TextPaint p, int max, int sep) {
            List<float[]> filas = new ArrayList<>();
            List<Float> fila = new ArrayList<>();
            float usado = 0;
            for (String t : chips) {
                float w = Math.min(max, p.measureText(t) + dp(22));
                if (!fila.isEmpty() && usado + sep + w > max) { filas.add(aArreglo(fila)); fila.clear(); usado = 0; }
                usado += (fila.isEmpty() ? 0 : sep) + w;
                fila.add(w);
            }
            if (!fila.isEmpty()) filas.add(aArreglo(fila));
            return filas;
        }

        static float[] aArreglo(List<Float> l) { float[] r = new float[l.size()]; for (int i = 0; i < r.length; i++) r[i] = l.get(i); return r; }

        TextPaint texto(float tam, int color, Typeface t) {
            TextPaint p = new TextPaint(Paint.ANTI_ALIAS_FLAG);
            p.setTextSize(tam * sp);
            p.setColor(color);
            p.setTypeface(t);
            return p;
        }

        static void circulo(Canvas c, Bitmap b, float cx, float cy, float r, Paint p) {
            BitmapShader sh = new BitmapShader(b, Shader.TileMode.CLAMP, Shader.TileMode.CLAMP);
            Matrix m = new Matrix();
            // el logo trae su círculo dorado al centro: se agranda para que ese círculo llene el espacio
            float k = 2 * r / (0.62f * Math.min(b.getWidth(), b.getHeight()));
            m.setScale(k, k);
            m.postTranslate(cx - b.getWidth() * k / 2f, cy - b.getHeight() * k / 2f);
            sh.setLocalMatrix(m);
            p.setShader(sh);
            c.drawCircle(cx, cy, r, p);
            p.setShader(null);
        }
    }
}
