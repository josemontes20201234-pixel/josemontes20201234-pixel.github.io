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
import android.graphics.Rect;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.CalendarContract;
import android.service.wallpaper.WallpaperService;
import android.text.Layout;
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
 * el versículo del día, cómo va la barbería, la próxima cita y el clima.
 * Va DETRÁS del bloqueo de Samsung: la huella, el PIN y la contraseña siguen siendo de Samsung.
 */
public class FondoVivo extends WallpaperService {
    static final String FOTO = "bloqueo.jpg";

    @Override public Engine onCreateEngine() { return new Motor(); }

    class Motor extends Engine implements SharedPreferences.OnSharedPreferenceChangeListener {
        final Handler h = new Handler(Looper.getMainLooper());
        SharedPreferences prefs;
        boolean visible;
        int ancho, alto;
        Bitmap foto, logo;
        long fotoVer = -1;
        float den;
        // datos que se buscan aparte (calendario) y se guardan para dibujar al instante
        volatile String proxima;

        final Runnable cadaMinuto = new Runnable() {
            @Override public void run() {
                h.removeCallbacks(this);
                if (!visible) return;
                cargarDatos();
                h.postDelayed(this, 60_000);
            }
        };

        final BroadcastReceiver rx = new BroadcastReceiver() {
            @Override public void onReceive(Context c, Intent i) { if (visible) dibujar(); }
        };

        @Override public void onCreate(SurfaceHolder s) {
            super.onCreate(s);
            den = getResources().getDisplayMetrics().density;
            prefs = getSharedPreferences("meraki", MODE_PRIVATE);
            prefs.registerOnSharedPreferenceChangeListener(this);
            IntentFilter f = new IntentFilter();
            f.addAction(Intent.ACTION_USER_PRESENT); f.addAction(Intent.ACTION_SCREEN_ON); f.addAction(Intent.ACTION_SCREEN_OFF);
            try {
                if (Build.VERSION.SDK_INT >= 33) registerReceiver(rx, f, Context.RECEIVER_NOT_EXPORTED); else registerReceiver(rx, f);
            } catch (Exception e) { }
            try { logo = BitmapFactory.decodeResource(getResources(), R.drawable.logo); } catch (Exception e) { }
        }

        @Override public void onDestroy() {
            h.removeCallbacksAndMessages(null);
            try { unregisterReceiver(rx); } catch (Exception e) { }
            prefs.unregisterOnSharedPreferenceChangeListener(this);
            super.onDestroy();
        }

        @Override public void onVisibilityChanged(boolean v) {
            visible = v;
            if (v) { dibujar(); cadaMinuto.run(); } else h.removeCallbacks(cadaMinuto);
        }

        @Override public void onSurfaceChanged(SurfaceHolder s, int format, int w, int hh) {
            super.onSurfaceChanged(s, format, w, hh);
            ancho = w; alto = hh;
            fotoVer = -1; // volver a cargar la foto al tamaño nuevo
            dibujar();
        }

        @Override public void onSurfaceRedrawNeeded(SurfaceHolder s) { dibujar(); }

        @Override public void onSharedPreferenceChanged(SharedPreferences p, String k) {
            if (k == null || k.startsWith("bloqueo_") || k.startsWith("caja_") || k.equals("tm_resumen") || k.equals("clima_json") || k.equals("acento"))
                h.post(() -> { if (visible) dibujar(); });
        }

        int dp(float v) { return Math.round(v * den); }

        /** ¿Se está viendo en la pantalla de bloqueo? (en el inicio sólo se ve la foto) */
        boolean enBloqueo() {
            if (isPreview()) return true;
            if (Build.VERSION.SDK_INT >= 34) {
                try { if (getWallpaperFlags() == WallpaperManager.FLAG_LOCK) return true; } catch (Throwable t) { }
            }
            KeyguardManager km = (KeyguardManager) getSystemService(KEYGUARD_SERVICE);
            return km != null && km.isKeyguardLocked();
        }

        // ============================================================ datos
        void cargarDatos() {
            new Thread(() -> {
                String p = proximaCita();
                proxima = p;
                h.post(this::dibujar);
            }).start();
        }

        /** Lo siguiente del calendario (hoy o mañana). */
        String proximaCita() {
            try {
                long ahora = System.currentTimeMillis();
                long ini = Barberia.inicioDia(ahora), fin = Barberia.masDias(ini, 2);
                Uri.Builder ub = CalendarContract.Instances.CONTENT_URI.buildUpon();
                ContentUris.appendId(ub, ini); ContentUris.appendId(ub, fin);
                String[] proj = {CalendarContract.Instances.TITLE, CalendarContract.Instances.BEGIN, CalendarContract.Instances.END, CalendarContract.Instances.ALL_DAY};
                try (Cursor c = getContentResolver().query(ub.build(), proj, CalendarContract.Instances.VISIBLE + "=1", null, CalendarContract.Instances.BEGIN + " ASC")) {
                    while (c != null && c.moveToNext()) {
                        boolean todo = c.getInt(3) == 1;
                        long b = c.getLong(1), e = c.getLong(2);
                        if (todo || e < ahora) continue;
                        String t = c.getString(0);
                        if (TextUtils.isEmpty(t)) t = "(Sin título)";
                        String hora = new SimpleDateFormat("h:mm a", MainActivity.ES).format(new Date(b)).replace(". ", "").replace(".", "");
                        String dia = b < Barberia.masDias(ini, 1) ? (b <= ahora ? "Ahora" : "") : "Mañana ";
                        return (dia.equals("Ahora") ? "Ahora · " : dia + hora + " · ") + t;
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
                Calendar c = Calendar.getInstance();
                if (n == 0 && c.get(Calendar.DAY_OF_WEEK) == Calendar.MONDAY) return "Hoy es tu día de descanso";
                return "Hoy  " + Barberia.plata(Barberia.suma(l)) + " · " + n + (n == 1 ? " servicio" : " servicios");
            } catch (Exception e) { return null; }
        }

        List<String> avisosTarjeta() {
            List<String> r = new ArrayList<>();
            try {
                JSONObject o = new JSONObject(prefs.getString("tm_resumen", "{}"));
                int in = o.optInt("inactivos"), pr = o.optInt("premio"), cu = o.optInt("cumple");
                if (cu > 0) r.add("🎂 " + cu + (cu == 1 ? " cumple años" : " cumplen años"));
                if (pr > 0) r.add("🎁 " + pr + (pr == 1 ? " premio listo" : " premios listos"));
                if (in > 0) r.add("⏰ " + in + (in == 1 ? " cliente inactivo" : " clientes inactivos"));
            } catch (Exception e) { }
            return r;
        }

        String textoClima() {
            try {
                JSONObject j = new JSONObject(prefs.getString("clima_json", "")), cur = j.getJSONObject("current");
                return "Apopa " + Math.round(cur.getDouble("temperature_2m")) + "° · " + MainActivity.descClima(cur.getInt("weather_code"));
            } catch (Exception e) { return null; }
        }

        int acento() {
            try { return 0xFF000000 | Integer.parseInt(prefs.getString("acento", "D9B55C"), 16); } catch (Exception e) { return 0xFFD9B55C; }
        }

        boolean ver(String k) { return prefs.getBoolean("bloqueo_" + k, true); }

        // ============================================================ foto
        void cargarFoto() {
            long v = prefs.getLong("bloqueo_foto_v", 0);
            if (v == fotoVer && (foto != null || v == 0)) return;
            fotoVer = v;
            foto = null;
            File f = new File(getFilesDir(), FOTO);
            if (v == 0 || !f.exists() || ancho == 0) return;
            try {
                BitmapFactory.Options o = new BitmapFactory.Options(); o.inJustDecodeBounds = true;
                BitmapFactory.decodeFile(f.getPath(), o);
                int s = 1;
                while (o.outWidth / (s * 2) >= ancho && o.outHeight / (s * 2) >= alto) s *= 2;
                BitmapFactory.Options o2 = new BitmapFactory.Options(); o2.inSampleSize = s;
                foto = BitmapFactory.decodeFile(f.getPath(), o2);
            } catch (Throwable e) { foto = null; }
        }

        // ============================================================ dibujar
        void dibujar() {
            SurfaceHolder s = getSurfaceHolder();
            if (s == null || ancho == 0) return;
            Canvas c = null;
            try {
                c = s.lockCanvas();
                if (c == null) return;
                cargarFoto();
                pintarFondo(c);
                if (enBloqueo()) pintarBloqueo(c);
            } catch (Throwable e) {
                // si algo falla, que por lo menos quede un fondo oscuro
                if (c != null) c.drawColor(0xFF0B0A08);
            } finally {
                if (c != null) try { s.unlockCanvasAndPost(c); } catch (Exception e) { }
            }
        }

        void pintarFondo(Canvas c) {
            Paint p = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG);
            if (foto != null) {
                // la foto llena la pantalla sin deformarse (recortando lo que sobra)
                float k = Math.max((float) ancho / foto.getWidth(), (float) alto / foto.getHeight());
                float w = foto.getWidth() * k, hh = foto.getHeight() * k;
                c.drawColor(0xFF000000);
                c.drawBitmap(foto, null, new RectF((ancho - w) / 2f, (alto - hh) / 2f, (ancho + w) / 2f, (alto + hh) / 2f), p);
            } else {
                // sin foto: el fondo Meraki, oscuro con un brillo dorado y la M de marca de agua
                p.setShader(new LinearGradient(0, 0, 0, alto, 0xFF1C1A16, 0xFF0B0A08, Shader.TileMode.CLAMP));
                c.drawRect(0, 0, ancho, alto, p);
                p.setShader(new RadialGradient(ancho * 0.5f, alto * 0.42f, ancho * 0.75f, MainActivity.conAlpha(acento(), 0x30), 0x00000000, Shader.TileMode.CLAMP));
                c.drawRect(0, 0, ancho, alto, p);
                if (logo != null) {
                    Paint pl = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG);
                    pl.setAlpha(46);
                    int t = (int) (ancho * 0.62f);
                    circulo(c, logo, ancho / 2f, alto * 0.42f, t / 2f, pl);
                }
            }
        }

        /** Lo de Meraki encima de la foto, sólo en la pantalla de bloqueo. */
        void pintarBloqueo(Canvas c) {
            int ac = acento();
            String pos = prefs.getString("bloqueo_pos", "abajo");
            int oscuro = prefs.getInt("bloqueo_oscuro", 2); // 1 poco · 2 normal · 3 mucho
            int a1 = oscuro == 1 ? 0x55 : oscuro == 3 ? 0xCC : 0x99;

            // sombra para que se lea: arriba (reloj de Samsung) y en la zona de la información
            Paint sombra = new Paint();
            sombra.setShader(new LinearGradient(0, 0, 0, alto * 0.3f, (a1 / 2) << 24, 0, Shader.TileMode.CLAMP));
            c.drawRect(0, 0, ancho, alto * 0.3f, sombra);

            // lo que va en el bloque
            int margen = dp(28), anchoTexto = ancho - margen * 2;
            List<Pieza> piezas = new ArrayList<>();
            if (ver("logo")) piezas.add(new Pieza(Pieza.LOGO, "MERAKI BARBERSHOP"));
            if (ver("versiculo")) {
                String[] v = Versiculos.deHoy(0);
                piezas.add(new Pieza(Pieza.VERSO, "«" + v[1] + "»"));
                piezas.add(new Pieza(Pieza.REF, v[0] + "  ·  RVR1960"));
            }
            List<String> chips = new ArrayList<>();
            if (ver("hoy")) { String t = textoHoy(); if (t != null) chips.add(t); chips.addAll(avisosTarjeta()); }
            if (ver("cita")) { String p = proxima; if (p != null) chips.add("Próxima: " + p); }
            if (ver("clima")) { String t = textoClima(); if (t != null) chips.add(t); }

            TextPaint pLogo = texto(11.5f, ac, Typeface.create("sans-serif-black", Typeface.NORMAL));
            pLogo.setLetterSpacing(0.22f);
            TextPaint pVerso = texto(18, 0xFFFFFFFF, Typeface.create(Typeface.SERIF, Typeface.NORMAL));
            pVerso.setShadowLayer(dp(6), 0, dp(1), 0xAA000000);
            TextPaint pRef = texto(12.5f, ac, Typeface.create("sans-serif-medium", Typeface.NORMAL));
            pRef.setShadowLayer(dp(4), 0, dp(1), 0x99000000);
            TextPaint pChip = texto(13.5f, 0xFFF5F1E8, Typeface.create("sans-serif-medium", Typeface.NORMAL));

            StaticLayout verso = null;
            for (Pieza p : piezas) if (p.tipo == Pieza.VERSO) {
                verso = StaticLayout.Builder.obtain(p.texto, 0, p.texto.length(), pVerso, anchoTexto)
                        .setLineSpacing(dp(3), 1f).setMaxLines(5).setEllipsize(TextUtils.TruncateAt.END).build();
            }

            // medir el alto del bloque
            int logoAlto = dp(30);
            float altoBloque = 0;
            for (Pieza p : piezas) {
                if (p.tipo == Pieza.LOGO) altoBloque += logoAlto + dp(14);
                else if (p.tipo == Pieza.VERSO && verso != null) altoBloque += verso.getHeight() + dp(8);
                else if (p.tipo == Pieza.REF) altoBloque += dp(18) + dp(14);
            }
            List<float[]> filas = acomodarChips(chips, pChip, anchoTexto);
            int chipAlto = dp(32);
            if (!filas.isEmpty()) altoBloque += filas.size() * (chipAlto + dp(8));
            if (altoBloque <= 0) return;

            // dónde va: abajo queda encima de la huella y los atajos de Samsung
            float y0;
            if ("arriba".equals(pos)) y0 = alto * 0.30f;
            else if ("centro".equals(pos)) y0 = (alto - altoBloque) / 2f;
            else y0 = alto * 0.76f - altoBloque;
            y0 = Math.max(alto * 0.22f, y0);

            // sombra detrás del bloque
            float sTop = y0 - dp(60), sBot = y0 + altoBloque + dp(60);
            sombra.setShader(new LinearGradient(0, sTop, 0, sBot, new int[]{0, a1 << 24, a1 << 24, 0}, new float[]{0f, 0.25f, 0.75f, 1f}, Shader.TileMode.CLAMP));
            c.drawRect(0, sTop, ancho, sBot, sombra);

            float y = y0;
            for (Pieza p : piezas) {
                if (p.tipo == Pieza.LOGO) {
                    if (logo != null) circulo(c, logo, margen + logoAlto / 2f, y + logoAlto / 2f, logoAlto / 2f, new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG));
                    Paint.FontMetrics fm = pLogo.getFontMetrics();
                    c.drawText(p.texto, margen + logoAlto + dp(10), y + logoAlto / 2f - (fm.ascent + fm.descent) / 2f, pLogo);
                    y += logoAlto + dp(14);
                } else if (p.tipo == Pieza.VERSO && verso != null) {
                    c.save(); c.translate(margen, y); verso.draw(c); c.restore();
                    y += verso.getHeight() + dp(8);
                } else if (p.tipo == Pieza.REF) {
                    c.drawText(p.texto, margen, y + dp(14), pRef);
                    y += dp(18) + dp(14);
                }
            }
            // las pastillas: hoy en Meraki, cumpleaños, próxima cita, clima
            Paint fondoChip = new Paint(Paint.ANTI_ALIAS_FLAG);
            fondoChip.setColor(0x8C000000);
            Paint borde = new Paint(Paint.ANTI_ALIAS_FLAG);
            borde.setStyle(Paint.Style.STROKE); borde.setStrokeWidth(dp(1)); borde.setColor(MainActivity.conAlpha(ac, 0x66));
            Paint.FontMetrics fm = pChip.getFontMetrics();
            int i = 0;
            for (float[] fila : filas) {
                float x = margen;
                for (int k = 0; k < fila.length; k++, i++) {
                    String t = chips.get(i);
                    float w = fila[k];
                    RectF r = new RectF(x, y, x + w, y + chipAlto);
                    c.drawRoundRect(r, chipAlto / 2f, chipAlto / 2f, fondoChip);
                    c.drawRoundRect(r, chipAlto / 2f, chipAlto / 2f, borde);
                    String mostrar = TextUtils.ellipsize(t, pChip, w - dp(28), TextUtils.TruncateAt.END).toString();
                    c.drawText(mostrar, x + dp(14), y + chipAlto / 2f - (fm.ascent + fm.descent) / 2f, pChip);
                    x += w + dp(8);
                }
                y += chipAlto + dp(8);
            }
        }

        /** Reparte las pastillas en filas según el ancho; devuelve el ancho de cada una por fila. */
        List<float[]> acomodarChips(List<String> chips, TextPaint p, int max) {
            List<float[]> filas = new ArrayList<>();
            List<Float> fila = new ArrayList<>();
            float usado = 0;
            for (String t : chips) {
                float w = Math.min(max, p.measureText(t) + dp(28));
                if (!fila.isEmpty() && usado + dp(8) + w > max) { filas.add(aArreglo(fila)); fila.clear(); usado = 0; }
                usado += (fila.isEmpty() ? 0 : dp(8)) + w;
                fila.add(w);
            }
            if (!fila.isEmpty()) filas.add(aArreglo(fila));
            return filas;
        }

        float[] aArreglo(List<Float> l) { float[] r = new float[l.size()]; for (int i = 0; i < r.length; i++) r[i] = l.get(i); return r; }

        TextPaint texto(float sp, int color, Typeface t) {
            TextPaint p = new TextPaint(Paint.ANTI_ALIAS_FLAG);
            p.setTextSize(sp * getResources().getDisplayMetrics().scaledDensity);
            p.setColor(color);
            p.setTypeface(t);
            return p;
        }

        void circulo(Canvas c, Bitmap b, float cx, float cy, float r, Paint p) {
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

    static final class Pieza {
        static final int LOGO = 0, VERSO = 1, REF = 2;
        final int tipo; final String texto;
        Pieza(int tipo, String texto) { this.tipo = tipo; this.texto = texto; }
    }
}
