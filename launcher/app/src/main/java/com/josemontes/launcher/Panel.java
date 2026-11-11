package com.josemontes.launcher;

import android.app.NotificationManager;
import android.bluetooth.BluetoothAdapter;
import android.content.ComponentName;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.content.res.ColorStateList;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.BitmapShader;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.ColorFilter;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.PixelFormat;
import android.graphics.Rect;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.GradientDrawable;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraManager;
import android.location.LocationManager;
import android.media.AudioManager;
import android.net.Uri;
import android.net.wifi.WifiManager;
import android.nfc.NfcAdapter;
import android.os.BatteryManager;
import android.os.Build;
import android.os.PowerManager;
import android.provider.AlarmClock;
import android.provider.MediaStore;
import android.provider.Settings;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.HorizontalScrollView;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.SeekBar;
import android.widget.Switch;
import android.widget.TextView;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Panel Meraki: ajustes rápidos propios, con temas, fondos y formas que Jose escoge viendo cómo queda. */
class Panel {
    static final int REQ_FOTO = 46;
    static final String[][] BOTONES = {
            {"wifi", "Wi-Fi"}, {"bt", "Bluetooth"}, {"linterna", "Linterna"}, {"datos", "Datos móviles"}, {"sonido", "Sonido"},
            {"rotacion", "Rotación"}, {"ubicacion", "Ubicación"}, {"ahorro", "Ahorro de batería"}, {"nomolestar", "No molestar"},
            {"apagar", "Apagar pantalla"}, {"samsung", "Panel de Samsung"}, {"ajustes", "Ajustes del cel"}, {"avion", "Modo avión"},
            {"oscuro", "Modo oscuro"}, {"hotspot", "Zona Wi-Fi"}, {"espejo", "Duplicar pantalla"}, {"nfc", "NFC"}, {"volumen", "Volumen"},
            {"camara", "Cámara"}, {"alarma", "Alarmas"}, {"calc", "Calculadora"}, {"notis", "Notificaciones"}};
    static final String POR_DEFECTO = "wifi,bt,linterna,datos,sonido,rotacion,ubicacion,ahorro,nomolestar,apagar,notis,ajustes";
    // {nombre, fondo, color encendido, forma, borde, resplandor}
    static final String[][] TEMAS = {
            {"Meraki Oro", "grad:2A2214,0B0A08", "D9B55C", "circulo", "color", "1"},
            {"Noche azul", "grad:16295A,05070F", "4F8CFF", "squircle", "fino", "1"},
            {"Neón", "grad:2A0050,05000C", "FF2BD6", "circulo", "color", "1"},
            {"Mar turquesa", "grad:0B3D4A,061A21", "1FBFB8", "gota", "no", "0"},
            {"Atardecer", "grad:FF7E5F,FEB47B", "2A1A12", "squircle", "no", "0"},
            {"Mármol", "solido:F4F1EA", "1A1A1A", "cuadro", "fino", "0"},
            {"Madera", "grad:6B4426,2E1B0E", "E8B27A", "cuadrado", "fino", "0"},
            {"Bosque", "grad:1E3B2A,0B1610", "3DB46D", "hexagono", "no", "0"},
            {"Rosa pastel", "grad:FFE3EA,F6CBE6", "E0559A", "circulo", "no", "0"},
            {"Lavanda", "grad:ECE4FF,CDBEFF", "6A4BD8", "squircle", "no", "0"},
            {"Cristal oscuro", "cristal:141210", "F5F1E8", "circulo", "fino", "0"},
            {"Cristal claro", "cristal:FFFFFF", "1A1A1A", "circulo", "fino", "0"},
            {"Fuego", "grad:4A1200,120400", "FF6A1F", "diamante", "color", "1"},
            {"Océano", "grad:0052D4,4364F7,6FB1FC", "FFFFFF", "gota", "no", "0"},
            {"Medianoche", "solido:000000", "F5F1E8", "cuadrado", "fino", "0"},
            {"Café", "grad:3B2A20,1C140F", "C8A27A", "squircle", "no", "0"},
            {"Barbería clásica", "grad:8A1218,1B0B0D", "F5F1E8", "circulo", "color", "0"},
            {"Menta", "grad:E3FAF1,B8EBD8", "138A64", "circulo", "no", "0"},
            {"Galaxia", "grad:3A1C71,1D0B3B,0B0620", "B98CFF", "hexagono", "color", "1"},
            {"Grafito", "solido:2B2D31", "4F8CFF", "cuadro", "no", "0"},
            {"Arena", "grad:F5EBD8,E2CFA9", "8A5A2B", "cuadrado", "no", "0"},
            {"Cereza", "grad:5A0018,200008", "FF4D6D", "gota", "color", "1"},
            {"Limón", "grad:FFF9C4,FFE082", "5C4400", "circulo", "no", "0"},
            {"Mi foto", "foto", "D9B55C", "circulo", "fino", "0"}};
    static final String[] DEGRADADOS = {"2A2214,0B0A08", "16295A,05070F", "2A0050,05000C", "0B3D4A,061A21", "FF7E5F,FEB47B", "6B4426,2E1B0E", "1E3B2A,0B1610",
            "FFE3EA,F6CBE6", "ECE4FF,CDBEFF", "4A1200,120400", "0052D4,4364F7,6FB1FC", "3B2A20,1C140F", "8A1218,1B0B0D", "E3FAF1,B8EBD8", "3A1C71,1D0B3B,0B0620",
            "F5EBD8,E2CFA9", "5A0018,200008", "FFF9C4,FFE082", "11998E,38EF7D", "FC5C7D,6A82FB", "232526,414345", "C33764,1D2671", "F7971E,FFD200", "0F2027,203A43,2C5364"};
    static final String[] SOLIDOS = {"0B0A08", "000000", "1A1917", "2B2D31", "16295A", "0B3D4A", "1E3B2A", "4A0E14", "3A1C71", "F4F1EA", "FFFFFF", "F5EBD8", "FFE3EA", "E3FAF1"};
    static final String[] ENCENDIDOS = {"auto", "D9B55C", "1FBFB8", "4F8CFF", "E5484D", "3DB46D", "E86FB0", "9B7BFF", "FF8A3D", "FF2BD6", "FFD200", "F5F1E8", "1A1A1A", "8A5A2B"};
    static final String[][] FORMAS = {{"circulo", "Círculo"}, {"squircle", "Redondito"}, {"cuadro", "Cuadro"}, {"cuadrado", "Cuadrado"}, {"hexagono", "Hexágono"},
            {"gota", "Gota"}, {"diamante", "Diamante"}, {"anillo", "Anillo"}};
    static final String[][] TAMANOS = {{"chico", "Chicos"}, {"normal", "Normales"}, {"grande", "Grandes"}};
    static final String[][] BORDES = {{"no", "Sin borde"}, {"fino", "Borde fino"}, {"color", "Borde de color"}};
    static final String[][] OPACIDAD = {{"100", "Sólido"}, {"92", "Poquito"}, {"80", "Medio"}, {"65", "Mucho"}};
    static final String[][] GESTOS_PANEL = {{"g_abajo", "Deslizar abajo"}, {"g_derecha", "A la derecha"}, {"g_izquierda", "A la izquierda"}, {"g_doble", "Doble toque"}, {"", "Ninguno"}};

    final MainActivity a;
    FrameLayout capa;
    LinearLayout hoja;
    View asa;
    final List<Runnable> refrescos = new ArrayList<>();
    boolean linternaOn;
    String camaraFlash;
    CameraManager.TorchCallback torchCb;
    final Runnable tic = new Runnable() { public void run() { refrescar(); if (abierto()) a.ui.postDelayed(this, 1000); } };

    Panel(MainActivity a) { this.a = a; }

    boolean abierto() { return capa != null && capa.getParent() != null; }
    boolean editando() { return ed != null && ed.getParent() != null; }

    // ================================================================ preferencias
    String pref(String k, String d) { return a.prefs.getString(k, d); }
    boolean prefB(String k, boolean d) { return a.prefs.getBoolean(k, d); }
    void poner(String k, String v) { a.prefs.edit().putString(k, v).apply(); }
    void poner(String k, boolean v) { a.prefs.edit().putBoolean(k, v).apply(); }
    List<String> botones() {
        List<String> l = new ArrayList<>();
        for (String x : pref("panel_botones", POR_DEFECTO).split(",")) if (!x.trim().isEmpty()) l.add(x.trim());
        return l;
    }
    void guardarBotones(List<String> l) { poner("panel_botones", String.join(",", l)); }
    String fondo() {
        String f = a.prefs.getString("panel_fondo", null);
        if (f != null) return f;
        String e = pref("panel_estilo", "meraki"); // lo que había antes
        switch (e) { case "cristal": return "cristal:141210"; case "solido": return "solido:1A1917"; case "claro": return "solido:F7F3EA"; case "tema": return a.claro ? "solido:F4F1EA" : "solido:0B0A08"; }
        return "grad:2A2214,0B0A08";
    }
    static int hex(String h, int d) { try { return 0xFF000000 | Integer.parseInt(h.trim(), 16); } catch (Exception e) { return d; } }
    static int[] coloresDe(String f) {
        String v = f.contains(":") ? f.substring(f.indexOf(':') + 1) : "0B0A08";
        String[] p = v.split(",");
        int[] c = new int[p.length];
        for (int i = 0; i < p.length; i++) c[i] = hex(p[i], 0xFF0B0A08);
        return c;
    }
    static double luz(int c) { return (0.299 * Color.red(c) + 0.587 * Color.green(c) + 0.114 * Color.blue(c)) / 255.0; }
    static boolean esClaro(String f) {
        if (f.startsWith("foto")) return false;
        int[] c = coloresDe(f); double s = 0; for (int x : c) s += luz(x); return s / c.length > 0.6;
    }
    int colorOn() { String c = pref("panel_color", "auto"); return "auto".equals(c) ? a.acento : hex(c, a.acento); }
    boolean claro() { return esClaro(fondo()); }
    int fg() { return claro() ? 0xFF141414 : 0xFFF5F1E8; }
    int muted() { return claro() ? 0xFF5E584E : 0xFFA8A297; }
    int botonApagado() { return claro() ? 0x1A000000 : 0x26FFFFFF; }
    static int tintaSobre(int c) { return luz(c) > 0.6 ? 0xFF141414 : 0xFFFFFFFF; }
    static String nombre(String[][] ops, String k) { for (String[] o : ops) if (o[0].equals(k)) return o[1]; return ops[0][1]; }
    String nombreBoton(String id) {
        if (id.startsWith("app:")) { MainActivity.App ap = a.porKey.get(id.substring(4)); return ap != null ? ap.label : "App"; }
        return nombre(BOTONES, id);
    }

    // ================================================================ dibujos: fondo del panel y formas de botón
    Bitmap fotoBmp; long fotoV = -1;
    Bitmap foto() {
        long v = a.prefs.getLong("panel_foto_v", 0);
        if (fotoBmp == null || fotoV != v) {
            fotoV = v;
            File f = new File(a.getFilesDir(), "panel_foto.jpg");
            fotoBmp = f.exists() ? BitmapFactory.decodeFile(f.getAbsolutePath()) : null;
        }
        return fotoBmp;
    }
    Drawable fondoDe(String f, int opac, float radio, int borde) {
        int alfa = Math.round(255 * opac / 100f);
        if (f.startsWith("foto")) { Bitmap b = foto(); if (b != null) return new FotoDrawable(b, radio, borde, a.dp(1)); f = "solido:1A1917"; }
        int[] c = coloresDe(f);
        GradientDrawable g;
        if (f.startsWith("grad") && c.length > 1) {
            int[] cc = new int[c.length]; for (int i = 0; i < c.length; i++) cc[i] = MainActivity.conAlpha(c[i], alfa);
            g = new GradientDrawable(GradientDrawable.Orientation.TL_BR, cc);
        } else if (f.startsWith("cristal")) {
            g = new GradientDrawable(); g.setColor(MainActivity.conAlpha(c[0], Math.min(alfa, 150)));
            if (borde == 0) borde = esClaro(f) ? 0x40000000 : 0x40FFFFFF;
        } else { g = new GradientDrawable(); g.setColor(MainActivity.conAlpha(c[0], alfa)); }
        g.setCornerRadius(radio);
        if (borde != 0) g.setStroke(a.dp(1), borde);
        return g;
    }
    int colorBorde() {
        String b = pref("panel_borde", "color");
        return "no".equals(b) ? 0 : "fino".equals(b) ? (claro() ? 0x22000000 : 0x2EFFFFFF) : MainActivity.conAlpha(colorOn(), 0x66);
    }

    static class FotoDrawable extends Drawable {
        final Bitmap b; final float r; final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG), velo = new Paint(Paint.ANTI_ALIAS_FLAG), linea = new Paint(Paint.ANTI_ALIAS_FLAG);
        FotoDrawable(Bitmap b, float r, int borde, float ancho) {
            this.b = b; this.r = r;
            p.setShader(new BitmapShader(b, Shader.TileMode.CLAMP, Shader.TileMode.CLAMP));
            velo.setColor(0x80000000);
            linea.setStyle(Paint.Style.STROKE); linea.setStrokeWidth(ancho); linea.setColor(borde);
        }
        @Override public void draw(Canvas c) {
            Rect bo = getBounds(); if (bo.isEmpty()) return;
            float k = Math.max(bo.width() / (float) b.getWidth(), bo.height() / (float) b.getHeight());
            Matrix m = new Matrix(); m.setScale(k, k); m.postTranslate(bo.left + (bo.width() - b.getWidth() * k) / 2f, bo.top + (bo.height() - b.getHeight() * k) / 2f);
            p.getShader().setLocalMatrix(m);
            RectF rf = new RectF(bo);
            c.drawRoundRect(rf, r, r, p); c.drawRoundRect(rf, r, r, velo);
            if (linea.getColor() != 0) c.drawRoundRect(rf, r, r, linea);
        }
        @Override public void setAlpha(int x) { }
        @Override public void setColorFilter(ColorFilter cf) { }
        @Override public int getOpacity() { return PixelFormat.TRANSLUCENT; }
    }

    /** Fondo de un botón con la forma escogida (círculo, gota, hexágono…), con borde y resplandor opcionales. */
    static class Forma extends Drawable {
        final String f; final int relleno, borde; final float grosor, brillo;
        final Paint pf = new Paint(Paint.ANTI_ALIAS_FLAG), pb = new Paint(Paint.ANTI_ALIAS_FLAG);
        Forma(String f, int relleno, int borde, float grosor, float brillo) {
            this.f = f; this.relleno = relleno; this.borde = borde; this.grosor = grosor; this.brillo = brillo;
            pf.setColor(relleno);
            if (brillo > 0 && Color.alpha(relleno) > 200) pf.setShadowLayer(brillo, 0, 0, MainActivity.conAlpha(relleno, 0xAA));
            pb.setStyle(Paint.Style.STROKE); pb.setStrokeWidth(grosor); pb.setColor(borde);
        }
        @Override public void draw(Canvas c) {
            Rect b = getBounds(); if (b.isEmpty()) return;
            float m = brillo + grosor / 2f;
            RectF r = new RectF(b.left + m, b.top + m, b.right - m, b.bottom - m);
            Path p = camino(f, r);
            if (Color.alpha(relleno) > 0) c.drawPath(p, pf);
            if (grosor > 0 && borde != 0) c.drawPath(p, pb);
        }
        @Override public void setAlpha(int x) { }
        @Override public void setColorFilter(ColorFilter cf) { }
        @Override public int getOpacity() { return PixelFormat.TRANSLUCENT; }
    }
    static Path camino(String f, RectF r) {
        Path p = new Path();
        float w = r.width(), h = r.height(), s = Math.min(w, h), cx = r.centerX(), cy = r.centerY();
        switch (f) {
            case "squircle": p.addRoundRect(r, s * .34f, s * .34f, Path.Direction.CW); break;
            case "cuadro": p.addRoundRect(r, s * .22f, s * .22f, Path.Direction.CW); break;
            case "cuadrado": p.addRoundRect(r, s * .08f, s * .08f, Path.Direction.CW); break;
            case "pastilla": p.addRoundRect(r, h / 2f, h / 2f, Path.Direction.CW); break;
            case "ancho": p.addRoundRect(r, s * .32f, s * .32f, Path.Direction.CW); break;
            case "hexagono":
                for (int i = 0; i < 6; i++) { double t = Math.toRadians(-90 + 60 * i); float x = cx + (float) Math.cos(t) * w / 2f, y = cy + (float) Math.sin(t) * h / 2f; if (i == 0) p.moveTo(x, y); else p.lineTo(x, y); }
                p.close(); break;
            case "gota": { float g = s / 2f, k = s * .12f; p.addRoundRect(r, new float[]{g, g, k, k, g, g, g, g}, Path.Direction.CW); break; }
            case "diamante": { float k = s * .1f; p.moveTo(cx, r.top + k * .3f); p.quadTo(cx, r.top, cx + k, r.top + k); p.lineTo(r.right - k, cy - k); p.quadTo(r.right, cy, r.right - k, cy + k); p.lineTo(cx + k, r.bottom - k); p.quadTo(cx, r.bottom, cx - k, r.bottom - k); p.lineTo(r.left + k, cy + k); p.quadTo(r.left, cy, r.left + k, cy - k); p.lineTo(cx - k, r.top + k); p.quadTo(cx, r.top, cx, r.top + k * .3f); p.close(); break; }
            default: p.addOval(r, Path.Direction.CW);
        }
        return p;
    }
    Drawable formaBoton(boolean act, boolean ancho) {
        String f = ancho ? "ancho" : pref("panel_forma", "circulo");
        int on = colorOn();
        boolean anillo = "anillo".equals(f);
        int relleno = act ? (anillo ? MainActivity.conAlpha(on, 0x33) : on) : botonApagado();
        int borde = anillo ? (act ? on : MainActivity.conAlpha(fg(), 0x55)) : colorBordeBoton(act);
        float grosor = anillo ? a.dp(2) : borde != 0 ? a.dp(1.3f) : 0;
        float brillo = act && prefB("panel_resplandor", true) && !anillo ? a.dp(7) : 0;
        if (anillo) f = "circulo";
        return new Forma(f, relleno, borde, grosor, brillo);
    }
    int colorBordeBoton(boolean act) {
        String b = pref("panel_borde", "color");
        if ("no".equals(b)) return 0;
        if ("fino".equals(b)) return act ? 0 : (claro() ? 0x26000000 : 0x33FFFFFF);
        return act ? 0 : MainActivity.conAlpha(colorOn(), 0x88);
    }

    // ================================================================ abrir y cerrar
    void abrir() {
        if (abierto()) return;
        a.cerrarCajon();
        capa = new FrameLayout(a);
        capa.setBackgroundColor(0x73000000);
        capa.setClickable(true);
        capa.setOnClickListener(v -> cerrar());
        hoja = crearHoja(false);
        FrameLayout.LayoutParams lh = new FrameLayout.LayoutParams(-1, -2, Gravity.TOP);
        lh.setMargins(a.dp(10), a.insetArriba + a.dp(8), a.dp(10), 0);
        capa.addView(hoja, lh);
        cerrarDeslizando(hoja);
        a.root.addView(capa, new FrameLayout.LayoutParams(-1, -1));
        hoja.setTranslationY(-a.dp(500)); hoja.setAlpha(0f); capa.setAlpha(0f);
        capa.animate().alpha(1f).setDuration(160).start();
        hoja.animate().translationY(0).alpha(1f).setDuration(240).setInterpolator(new android.view.animation.DecelerateInterpolator(2f)).start();
        prepararLinterna();
        a.ui.removeCallbacks(tic); a.ui.post(tic);
    }

    void cerrar() {
        if (!abierto()) return;
        a.ui.removeCallbacks(tic);
        final FrameLayout c = capa;
        capa = null;
        hoja.animate().translationY(-hoja.getHeight() - a.dp(20)).alpha(0f).setDuration(180).start();
        c.animate().alpha(0f).setDuration(200).withEndAction(() -> { if (c.getParent() != null) ((ViewGroup) c.getParent()).removeView(c); }).start();
        soltarLinterna();
    }

    void cerrarDeslizando(View v) {
        final float[] y0 = {0};
        v.setOnTouchListener((vv, e) -> {
            if (e.getActionMasked() == MotionEvent.ACTION_DOWN) y0[0] = e.getRawY();
            else if (e.getActionMasked() == MotionEvent.ACTION_MOVE) { float d = e.getRawY() - y0[0]; if (d < 0) hoja.setTranslationY(d); }
            else if (e.getActionMasked() == MotionEvent.ACTION_UP || e.getActionMasked() == MotionEvent.ACTION_CANCEL) {
                if (e.getRawY() - y0[0] < -a.dp(70)) cerrar(); else hoja.animate().translationY(0).setDuration(150).start();
            }
            return false;
        });
    }

    /** La rayita arriba del inicio: un toque o deslizar hacia abajo abre el panel. */
    void actualizarAsa() {
        if (a.externo) return;
        boolean ver = prefB("panel_asa", true);
        if (!ver) { if (asa != null && asa.getParent() != null) a.root.removeView(asa); return; }
        if (asa == null) {
            FrameLayout f = new FrameLayout(a);
            View p = new View(a);
            f.addView(p, new FrameLayout.LayoutParams(a.dp(44), a.dp(5), Gravity.CENTER));
            f.setContentDescription("Abrir el Panel Meraki");
            final float[] y0 = {0};
            f.setOnTouchListener((v, e) -> {
                if (e.getActionMasked() == MotionEvent.ACTION_DOWN) y0[0] = e.getRawY();
                if (e.getActionMasked() == MotionEvent.ACTION_UP) abrir();
                return true;
            });
            asa = f;
        }
        ((FrameLayout) asa).getChildAt(0).setBackground(a.caja(MainActivity.conAlpha(a.FG, 0x99), 9, 0));
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(a.dp(110), a.dp(30), Gravity.TOP | Gravity.CENTER_HORIZONTAL);
        lp.topMargin = a.insetArriba + a.dp(2);
        if (asa.getParent() == null) a.root.addView(asa, Math.min(1, a.root.getChildCount()), lp);
        else asa.setLayoutParams(lp);
    }

    // ================================================================ la hoja del panel (también se usa como vista previa)
    LinearLayout crearHoja(boolean vista) {
        refrescos.clear();
        final MainActivity A = a;
        int op = 92; try { op = Integer.parseInt(pref("panel_opacidad", "92")); } catch (Exception e) { }
        LinearLayout h = new LinearLayout(a);
        h.setOrientation(LinearLayout.VERTICAL);
        h.setBackground(fondoDe(fondo(), op, a.dp(30), colorBorde()));
        h.setClickable(true);
        h.setPadding(a.dp(18), a.dp(16), a.dp(18), a.dp(16));

        // encabezado
        LinearLayout cab = new LinearLayout(a);
        cab.setGravity(Gravity.CENTER_VERTICAL);
        LinearLayout tl = new LinearLayout(a); tl.setOrientation(LinearLayout.VERTICAL);
        final TextView hora = A.texto("", prefB("panel_reloj", true) ? 40 : 22, fg(), A.tf(true));
        final TextView fecha = A.texto("", 13.5f, muted(), A.tf(false));
        tl.addView(hora); tl.addView(fecha, A.lp(-2, -2, 4));
        cab.addView(tl, new LinearLayout.LayoutParams(0, -2, 1f));
        Runnable rh = () -> {
            hora.setText(new SimpleDateFormat(android.text.format.DateFormat.is24HourFormat(a) ? "HH:mm" : "h:mm", MainActivity.ES).format(new Date()));
            BatteryManager bm = (BatteryManager) a.getSystemService(Context.BATTERY_SERVICE);
            int bat = bm != null ? bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY) : -1;
            String f = MainActivity.mayus1(new SimpleDateFormat("EEEE d 'de' MMMM", MainActivity.ES).format(new Date()));
            fecha.setText(bat > 0 && bm != null ? f + "  ·  " + bat + "%" + (bm.isCharging() ? " ⚡" : "") : f);
        };
        rh.run(); if (!vista) refrescos.add(rh);
        cab.addView(iconoBoton("M12 20h9 M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z", "Personalizar el panel", () -> { cerrar(); a.ui.postDelayed(a::personalizarPanel, 200); }, vista));
        cab.addView(iconoBoton("M18 6L6 18 M6 6l12 12", "Cerrar", this::cerrar, vista));
        h.addView(cab);

        // botones
        List<String> ids = botones();
        boolean ancho = prefB("panel_anchos", false);
        int cols = ancho ? 2 : Math.max(3, Math.min(5, Integer.parseInt(pref("panel_columnas", "4"))));
        LinearLayout fila = null;
        for (int i = 0; i < ids.size(); i++) {
            if (i % cols == 0) { fila = new LinearLayout(a); fila.setGravity(Gravity.TOP); h.addView(fila, A.lp(-1, -2, ancho ? 8 : 14)); }
            View b = boton(ids.get(i), ancho, cols, vista);
            LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(0, -2, 1f);
            if (ancho) { p.leftMargin = i % 2 == 1 ? a.dp(4) : 0; p.rightMargin = i % 2 == 0 ? a.dp(4) : 0; }
            fila.addView(b, p);
        }
        if (fila != null && ids.size() % cols != 0) for (int k = ids.size() % cols; k < cols; k++) fila.addView(new View(a), new LinearLayout.LayoutParams(0, 1, 1f));
        if (ids.isEmpty()) h.addView(A.texto("No hay botones. Tocá el lápiz para agregar.", 14, muted(), A.tf(false)), A.lp(-2, -2, 14));

        if (prefB("panel_brillo", true)) h.addView(barraBrillo(vista), A.lp(-1, -2, 16));
        if (prefB("panel_volumen", true)) h.addView(barraVolumen(vista), A.lp(-1, -2, 10));

        View raya = new View(a); raya.setBackground(A.caja(MainActivity.conAlpha(fg(), 0x55), 9, 0));
        LinearLayout.LayoutParams lr = new LinearLayout.LayoutParams(a.dp(42), a.dp(4)); lr.gravity = Gravity.CENTER_HORIZONTAL; lr.topMargin = a.dp(14);
        h.addView(raya, lr);
        return h;
    }

    View iconoBoton(String d, String desc, Runnable r, boolean vista) {
        FrameLayout f = new FrameLayout(a);
        f.setBackground(a.caja(botonApagado(), 99, 0));
        f.addView(new Glifo(a, d, fg()), new FrameLayout.LayoutParams(a.dp(20), a.dp(20), Gravity.CENTER));
        f.setContentDescription(desc);
        if (!vista) f.setOnClickListener(v -> r.run());
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(a.dp(42), a.dp(42)); lp.leftMargin = a.dp(8);
        f.setLayoutParams(lp);
        return f;
    }

    View boton(String id, boolean ancho, int cols, boolean vista) {
        final MainActivity A = a;
        String tamP = pref("panel_tam", "normal");
        float base = "chico".equals(tamP) ? .84f : "grande".equals(tamP) ? 1.18f : 1f;
        int tam = Math.round(a.dp(cols == 3 ? 68 : cols == 5 ? 52 : 60) * base);
        boolean nombres = prefB("panel_nombres", true);
        final FrameLayout circulo = new FrameLayout(a);
        final View ico;
        final boolean esApp = id.startsWith("app:");
        if (esApp) {
            MainActivity.App ap = a.porKey.get(id.substring(4));
            ImageView iv = new ImageView(a);
            if (ap != null) iv.setImageDrawable(a.icono(ap, a.dp(64)));
            ico = iv;
        } else ico = new Glifo(a, glifo(id), fg());
        int ti = ancho ? a.dp(22) : Math.round(tam * (esApp ? .6f : .4f));
        circulo.addView(ico, new FrameLayout.LayoutParams(ti, ti, Gravity.CENTER));
        final TextView nom = a.texto(nombreBoton(id), ancho ? 14 : 11.5f, fg(), a.tf(ancho));
        nom.setMaxLines(ancho ? 1 : 2);
        nom.setEllipsize(android.text.TextUtils.TruncateAt.END);
        final TextView sub = ancho ? a.texto("", 12, muted(), a.tf(false)) : null;
        if (sub != null) { sub.setMaxLines(1); sub.setEllipsize(android.text.TextUtils.TruncateAt.END); }
        LinearLayout cont = new LinearLayout(a);
        final View fondoV;
        if (ancho) {
            cont.setOrientation(LinearLayout.HORIZONTAL);
            cont.setGravity(Gravity.CENTER_VERTICAL);
            cont.setPadding(a.dp(14), a.dp(12), a.dp(12), a.dp(12));
            cont.addView(circulo, new LinearLayout.LayoutParams(a.dp(30), a.dp(30)));
            LinearLayout tx = new LinearLayout(a); tx.setOrientation(LinearLayout.VERTICAL);
            tx.addView(nom); tx.addView(sub, A.lp(-2, -2, 2));
            LinearLayout.LayoutParams pt = new LinearLayout.LayoutParams(0, -2, 1f); pt.leftMargin = a.dp(10);
            cont.addView(tx, pt);
            fondoV = cont;
        } else {
            cont.setOrientation(LinearLayout.VERTICAL);
            cont.setGravity(Gravity.CENTER_HORIZONTAL);
            cont.addView(circulo, new LinearLayout.LayoutParams(tam, tam));
            if (nombres) { nom.setGravity(Gravity.CENTER); cont.addView(nom, A.lp(-2, -2, 6)); }
            fondoV = circulo;
        }
        fondoV.setLayerType(View.LAYER_TYPE_SOFTWARE, null); // para el resplandor
        Runnable pintar = () -> {
            Boolean st = esApp ? null : estado(id);
            boolean act = st != null && st;
            fondoV.setBackground(formaBoton(act, ancho));
            int tinta = act && !"anillo".equals(pref("panel_forma", "circulo")) ? tintaSobre(colorOn()) : (act ? colorOn() : fg());
            if (ico instanceof Glifo) ((Glifo) ico).color(tinta);
            if (ancho) { nom.setTextColor(act ? tinta : fg()); sub.setTextColor(act ? MainActivity.conAlpha(tinta, 0xCC) : muted()); sub.setText(subtitulo(id, st)); }
        };
        pintar.run();
        if (!vista) {
            refrescos.add(pintar);
            cont.setOnClickListener(v -> { tocar(id); a.ui.postDelayed(this::refrescar, 300); a.ui.postDelayed(this::refrescar, 1200); });
            cont.setOnLongClickListener(v -> { mantener(id); return true; });
        }
        cont.setContentDescription(nombreBoton(id));
        return cont;
    }

    String subtitulo(String id, Boolean st) {
        if (st == null) return "Abrir";
        if (id.equals("sonido")) { AudioManager am = (AudioManager) a.getSystemService(Context.AUDIO_SERVICE); int m = am.getRingerMode(); return m == AudioManager.RINGER_MODE_NORMAL ? "Con sonido" : m == AudioManager.RINGER_MODE_VIBRATE ? "Vibrar" : "Silencio"; }
        return st ? "Encendido" : "Apagado";
    }

    void refrescar() { for (Runnable r : new ArrayList<>(refrescos)) try { r.run(); } catch (Exception e) { } }

    // ================================================================ estados
    Boolean estado(String id) {
        ContentResolver cr = a.getContentResolver();
        try {
            switch (id) {
                case "wifi": { WifiManager w = (WifiManager) a.getApplicationContext().getSystemService(Context.WIFI_SERVICE); return w != null && w.isWifiEnabled(); }
                case "bt": { BluetoothAdapter b = BluetoothAdapter.getDefaultAdapter(); return b != null && b.isEnabled(); }
                case "linterna": return linternaOn;
                case "datos": return Settings.Global.getInt(cr, "mobile_data", 0) == 1;
                case "sonido": { AudioManager am = (AudioManager) a.getSystemService(Context.AUDIO_SERVICE); return am.getRingerMode() == AudioManager.RINGER_MODE_NORMAL; }
                case "rotacion": return Settings.System.getInt(cr, Settings.System.ACCELEROMETER_ROTATION, 0) == 1;
                case "ubicacion": { LocationManager lm = (LocationManager) a.getSystemService(Context.LOCATION_SERVICE); return Build.VERSION.SDK_INT >= 28 && lm != null && lm.isLocationEnabled(); }
                case "ahorro": { PowerManager pm = (PowerManager) a.getSystemService(Context.POWER_SERVICE); return pm != null && pm.isPowerSaveMode(); }
                case "nomolestar": { NotificationManager nm = (NotificationManager) a.getSystemService(Context.NOTIFICATION_SERVICE); return nm != null && nm.getCurrentInterruptionFilter() > NotificationManager.INTERRUPTION_FILTER_ALL; }
                case "avion": return Settings.Global.getInt(cr, Settings.Global.AIRPLANE_MODE_ON, 0) == 1;
                case "oscuro": return (a.getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
                case "nfc": { NfcAdapter n = NfcAdapter.getDefaultAdapter(a); return n != null && n.isEnabled(); }
                default: return null;
            }
        } catch (Exception e) { return false; }
    }

    // ================================================================ acciones
    boolean abrirIntent(Intent... opciones) {
        if (a.externo) cerrar(); // la ventana del panel queda encima de todo: hay que quitarla primero
        for (Intent i : opciones) {
            if (i == null) continue;
            try { i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); a.startActivity(i); return true; } catch (Exception e) { }
        }
        a.toast("Tu cel no deja abrir eso desde aquí.");
        return false;
    }
    static Intent accion(String s) { return new Intent(s); }
    static Intent componente(String pkg, String cls) { Intent i = new Intent(); i.setComponent(new ComponentName(pkg, cls)); return i; }

    boolean permisoAjustes() { return Settings.System.canWrite(a); }
    boolean permisoNoMolestar() { NotificationManager nm = (NotificationManager) a.getSystemService(Context.NOTIFICATION_SERVICE); return nm != null && nm.isNotificationPolicyAccessGranted(); }
    void pedirAjustes() { abrirIntent(new Intent(Settings.ACTION_MANAGE_WRITE_SETTINGS, Uri.parse("package:" + a.getPackageName()))); a.toast("Activá «Meraki Launcher» y regresá."); }
    void pedirNoMolestar() { abrirIntent(accion(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS)); a.toast("Buscá «Meraki Launcher», activalo y regresá."); }
    boolean necesitaAjustes() {
        if (permisoAjustes()) return true;
        a.dialogo().setTitle("Falta un permiso").setMessage("Para cambiar el brillo y la rotación desde el panel, activá «Modificar ajustes del sistema» para Meraki Launcher. Sólo se usa para eso.")
                .setPositiveButton("Activar", (d, w) -> pedirAjustes()).setNegativeButton("Ahora no", null).show();
        return false;
    }
    boolean necesitaNoMolestar() {
        if (permisoNoMolestar()) return true;
        a.dialogo().setTitle("Falta un permiso").setMessage("Para poner el cel en silencio o en No molestar desde el panel, activá «Acceso a No molestar» para Meraki Launcher. No lee tus notificaciones.")
                .setPositiveButton("Activar", (d, w) -> pedirNoMolestar()).setNegativeButton("Ahora no", null).show();
        return false;
    }

    void tocar(String id) {
        ContentResolver cr = a.getContentResolver();
        if (id.startsWith("app:")) { MainActivity.App ap = a.porKey.get(id.substring(4)); cerrar(); if (ap != null) a.lanzar(ap); else a.toast("Esa app ya no está."); return; }
        switch (id) {
            case "wifi": abrirIntent(Build.VERSION.SDK_INT >= 29 ? accion(Settings.Panel.ACTION_WIFI) : null, accion(Settings.ACTION_WIFI_SETTINGS)); break;
            case "bt": abrirIntent(accion(Settings.ACTION_BLUETOOTH_SETTINGS)); break;
            case "linterna": cambiarLinterna(); break;
            case "datos": abrirIntent(Build.VERSION.SDK_INT >= 29 ? accion(Settings.Panel.ACTION_INTERNET_CONNECTIVITY) : null, accion(Settings.ACTION_WIRELESS_SETTINGS)); break;
            case "sonido": {
                AudioManager am = (AudioManager) a.getSystemService(Context.AUDIO_SERVICE);
                int m = am.getRingerMode();
                try {
                    if (m == AudioManager.RINGER_MODE_NORMAL) { am.setRingerMode(AudioManager.RINGER_MODE_VIBRATE); a.toast("Vibrar"); }
                    else if (m == AudioManager.RINGER_MODE_VIBRATE && permisoNoMolestar()) { am.setRingerMode(AudioManager.RINGER_MODE_SILENT); a.toast("Silencio"); }
                    else { am.setRingerMode(AudioManager.RINGER_MODE_NORMAL); a.toast("Con sonido"); }
                } catch (Exception e) { necesitaNoMolestar(); }
                break;
            }
            case "rotacion":
                if (necesitaAjustes()) { boolean r = Settings.System.getInt(cr, Settings.System.ACCELEROMETER_ROTATION, 0) == 1; Settings.System.putInt(cr, Settings.System.ACCELEROMETER_ROTATION, r ? 0 : 1); a.toast(r ? "Rotación bloqueada" : "Rotación automática"); }
                break;
            case "ubicacion": abrirIntent(accion(Settings.ACTION_LOCATION_SOURCE_SETTINGS)); break;
            case "ahorro": abrirIntent(accion(Settings.ACTION_BATTERY_SAVER_SETTINGS), accion(Settings.ACTION_SETTINGS)); break;
            case "nomolestar":
                if (necesitaNoMolestar()) {
                    NotificationManager nm = (NotificationManager) a.getSystemService(Context.NOTIFICATION_SERVICE);
                    boolean act = nm.getCurrentInterruptionFilter() > NotificationManager.INTERRUPTION_FILTER_ALL;
                    nm.setInterruptionFilter(act ? NotificationManager.INTERRUPTION_FILTER_ALL : NotificationManager.INTERRUPTION_FILTER_PRIORITY);
                    a.toast(act ? "No molestar apagado" : "No molestar encendido");
                }
                break;
            case "apagar": cerrar(); a.ui.postDelayed(a::apagarPantalla, 300); break;
            case "samsung": cerrar(); expandirAjustesSamsung(); break;
            case "notis": cerrar(); a.bajarNotificaciones(); break;
            case "ajustes": abrirIntent(accion(Settings.ACTION_SETTINGS)); break;
            case "avion": abrirIntent(accion(Settings.ACTION_AIRPLANE_MODE_SETTINGS)); break;
            case "oscuro": abrirIntent(accion(Settings.ACTION_DISPLAY_SETTINGS)); break;
            case "hotspot": abrirIntent(componente("com.android.settings", "com.android.settings.TetherSettings"), componente("com.android.settings", "com.android.settings.Settings$TetherSettingsActivity"), accion(Settings.ACTION_WIRELESS_SETTINGS)); break;
            case "espejo": abrirIntent(a.getPackageManager().getLaunchIntentForPackage("com.samsung.android.smartmirroring"), accion("android.settings.CAST_SETTINGS"), accion(Settings.ACTION_WIRELESS_SETTINGS)); break;
            case "nfc": abrirIntent(accion(Settings.ACTION_NFC_SETTINGS), accion(Settings.ACTION_WIRELESS_SETTINGS)); break;
            case "volumen": abrirIntent(Build.VERSION.SDK_INT >= 29 ? accion(Settings.Panel.ACTION_VOLUME) : null, accion(Settings.ACTION_SOUND_SETTINGS)); break;
            case "camara": cerrar(); abrirIntent(accion(MediaStore.INTENT_ACTION_STILL_IMAGE_CAMERA)); break;
            case "alarma": cerrar(); abrirIntent(accion(AlarmClock.ACTION_SHOW_ALARMS)); break;
            case "calc": cerrar(); abrirIntent(Intent.makeMainSelectorActivity(Intent.ACTION_MAIN, Intent.CATEGORY_APP_CALCULATOR), a.getPackageManager().getLaunchIntentForPackage("com.sec.android.app.popupcalculator")); break;
        }
    }

    void mantener(String id) {
        switch (id) {
            case "wifi": abrirIntent(accion(Settings.ACTION_WIFI_SETTINGS)); break;
            case "bt": abrirIntent(accion(Settings.ACTION_BLUETOOTH_SETTINGS)); break;
            case "datos": abrirIntent(accion(Settings.ACTION_DATA_ROAMING_SETTINGS), accion(Settings.ACTION_WIRELESS_SETTINGS)); break;
            case "sonido": case "volumen": abrirIntent(accion(Settings.ACTION_SOUND_SETTINGS)); break;
            case "nomolestar": abrirIntent(accion("android.settings.ZEN_MODE_SETTINGS"), accion(Settings.ACTION_SOUND_SETTINGS)); break;
            case "rotacion": case "oscuro": abrirIntent(accion(Settings.ACTION_DISPLAY_SETTINGS)); break;
            case "ahorro": abrirIntent(accion(Intent.ACTION_POWER_USAGE_SUMMARY), accion(Settings.ACTION_BATTERY_SAVER_SETTINGS)); break;
            default: tocar(id);
        }
    }

    void expandirAjustesSamsung() {
        if (a.ajustesRapidos()) return;
        try {
            @SuppressWarnings("WrongConstant") Object sb = a.getSystemService("statusbar");
            Class.forName("android.app.StatusBarManager").getMethod("expandSettingsPanel").invoke(sb);
        } catch (Exception e) { a.bajarNotificaciones(); }
    }

    // ================================================================ linterna
    void prepararLinterna() {
        try {
            CameraManager cm = (CameraManager) a.getSystemService(Context.CAMERA_SERVICE);
            if (cm == null) return;
            if (camaraFlash == null) for (String c : cm.getCameraIdList()) {
                Boolean f = cm.getCameraCharacteristics(c).get(CameraCharacteristics.FLASH_INFO_AVAILABLE);
                if (f != null && f) { camaraFlash = c; break; }
            }
            if (torchCb == null) torchCb = new CameraManager.TorchCallback() {
                @Override public void onTorchModeChanged(String id, boolean on) { if (id.equals(camaraFlash)) { linternaOn = on; refrescar(); } }
            };
            cm.registerTorchCallback(torchCb, a.ui);
        } catch (Exception e) { }
    }
    void soltarLinterna() {
        try { CameraManager cm = (CameraManager) a.getSystemService(Context.CAMERA_SERVICE); if (cm != null && torchCb != null) cm.unregisterTorchCallback(torchCb); } catch (Exception e) { }
    }
    void cambiarLinterna() {
        try {
            CameraManager cm = (CameraManager) a.getSystemService(Context.CAMERA_SERVICE);
            if (camaraFlash == null) prepararLinterna();
            if (camaraFlash == null) { a.toast("Este cel no tiene flash."); return; }
            cm.setTorchMode(camaraFlash, !linternaOn);
            linternaOn = !linternaOn;
        } catch (Exception e) { a.toast("La linterna está ocupada (¿la cámara está abierta?)."); }
    }

    // ================================================================ barras
    View barra(String glifo, int max, int valor, SeekBar.OnSeekBarChangeListener l, Runnable alTocarIcono, String desc, boolean vista) {
        LinearLayout f = new LinearLayout(a);
        f.setGravity(Gravity.CENTER_VERTICAL);
        f.setPadding(a.dp(12), a.dp(4), a.dp(10), a.dp(4));
        f.setBackground(a.caja(botonApagado(), 99, 0));
        Glifo g = new Glifo(a, glifo, fg());
        g.setContentDescription(desc);
        if (!vista) g.setOnClickListener(v -> alTocarIcono.run());
        f.addView(g, new LinearLayout.LayoutParams(a.dp(22), a.dp(22)));
        SeekBar s = new SeekBar(a);
        s.setMax(max); s.setProgress(valor);
        int on = colorOn();
        s.setProgressTintList(ColorStateList.valueOf(on));
        s.setThumbTintList(ColorStateList.valueOf(on));
        s.setProgressBackgroundTintList(ColorStateList.valueOf(MainActivity.conAlpha(fg(), 0x40)));
        if (vista) s.setEnabled(false); else s.setOnSeekBarChangeListener(l);
        s.setContentDescription(desc);
        f.addView(s, new LinearLayout.LayoutParams(0, a.dp(40), 1f));
        return f;
    }

    View barraBrillo(boolean vista) {
        final ContentResolver cr = a.getContentResolver();
        int v = Settings.System.getInt(cr, Settings.System.SCREEN_BRIGHTNESS, 128);
        final boolean[] avisado = {false};
        return barra("M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8 M12 2v2 M12 20v2 M4.93 4.93l1.41 1.41 M17.66 17.66l1.41 1.41 M2 12h2 M20 12h2 M6.34 17.66l-1.41 1.41 M19.07 4.93l-1.41 1.41",
                255, v, new SeekBar.OnSeekBarChangeListener() {
                    public void onProgressChanged(SeekBar s, int p, boolean user) {
                        if (!user) return;
                        if (!permisoAjustes()) { if (!avisado[0]) { avisado[0] = true; necesitaAjustes(); } return; }
                        try {
                            Settings.System.putInt(cr, Settings.System.SCREEN_BRIGHTNESS_MODE, Settings.System.SCREEN_BRIGHTNESS_MODE_MANUAL);
                            Settings.System.putInt(cr, Settings.System.SCREEN_BRIGHTNESS, Math.max(1, p));
                        } catch (Exception e) { }
                    }
                    public void onStartTrackingTouch(SeekBar s) { }
                    public void onStopTrackingTouch(SeekBar s) { }
                }, () -> {
                    if (!necesitaAjustes()) return;
                    boolean auto = Settings.System.getInt(cr, Settings.System.SCREEN_BRIGHTNESS_MODE, 0) == 1;
                    Settings.System.putInt(cr, Settings.System.SCREEN_BRIGHTNESS_MODE, auto ? 0 : 1);
                    a.toast(auto ? "Brillo manual" : "Brillo automático");
                }, "Brillo. Tocá el sol para brillo automático", vista);
    }

    View barraVolumen(boolean vista) {
        final AudioManager am = (AudioManager) a.getSystemService(Context.AUDIO_SERVICE);
        return barra("M11 5L6 9H2v6h4l5 4V5z M15.54 8.46a5 5 0 0 1 0 7.07 M19.07 4.93a10 10 0 0 1 0 14.14",
                am.getStreamMaxVolume(AudioManager.STREAM_MUSIC), am.getStreamVolume(AudioManager.STREAM_MUSIC), new SeekBar.OnSeekBarChangeListener() {
                    public void onProgressChanged(SeekBar s, int p, boolean user) { if (user) try { am.setStreamVolume(AudioManager.STREAM_MUSIC, p, 0); } catch (Exception e) { } }
                    public void onStartTrackingTouch(SeekBar s) { }
                    public void onStopTrackingTouch(SeekBar s) { }
                }, () -> tocar("volumen"), "Volumen de música y videos. Tocá la bocina para ver todos los volúmenes", vista);
    }

    // ================================================================ editor con vista previa
    FrameLayout ed, vistaBox;
    LinearLayout contenido, pestanas;
    String pestana = "temas";
    final int EF = 0xFFF5F1E8, EM = 0xFFA8A297;

    void abrirEditor(String p) {
        if (editando()) return;
        if (abierto()) cerrar();
        a.cerrarAjustes(); a.cerrarCajon();
        pestana = p == null ? "temas" : p;
        ed = new FrameLayout(a);
        ed.setClickable(true);
        ed.setBackground(new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, new int[]{0xFF1C1A16, 0xFF0B0A08}));
        LinearLayout col = new LinearLayout(a);
        col.setOrientation(LinearLayout.VERTICAL);
        col.setPadding(0, a.insetArriba, 0, 0);
        ed.addView(col, new FrameLayout.LayoutParams(-1, -1));

        LinearLayout cab = new LinearLayout(a);
        cab.setGravity(Gravity.CENTER_VERTICAL);
        cab.setPadding(a.dp(8), a.dp(8), a.dp(12), a.dp(4));
        TextView atras = a.texto("←", 24, EF, android.graphics.Typeface.DEFAULT);
        atras.setPadding(a.dp(12), a.dp(6), a.dp(12), a.dp(6));
        atras.setOnClickListener(v -> cerrarEditor());
        cab.addView(atras);
        cab.addView(a.texto("Personalizar panel", 20, EF, a.tf(true)), new LinearLayout.LayoutParams(0, -2, 1f));
        TextView probar = a.texto("Probar", 14, tintaSobre(a.acento), a.tf(true));
        probar.setPadding(a.dp(16), a.dp(9), a.dp(16), a.dp(9));
        probar.setBackground(a.caja(a.acento, 99, 0));
        probar.setOnClickListener(v -> { cerrarEditor(); a.ui.postDelayed(this::abrir, 150); });
        cab.addView(probar);
        col.addView(cab);

        // vista previa
        vistaBox = new FrameLayout(a);
        vistaBox.setClipChildren(true);
        int alto = Math.round(a.getResources().getDisplayMetrics().heightPixels * .40f);
        LinearLayout.LayoutParams lv = new LinearLayout.LayoutParams(-1, alto);
        lv.setMargins(a.dp(14), a.dp(6), a.dp(14), 0);
        vistaBox.setBackground(a.caja(0x22FFFFFF, 22, 0x22FFFFFF));
        col.addView(vistaBox, lv);

        // pestañas
        HorizontalScrollView hs = new HorizontalScrollView(a);
        hs.setHorizontalScrollBarEnabled(false);
        pestanas = new LinearLayout(a);
        pestanas.setPadding(a.dp(14), a.dp(12), a.dp(14), a.dp(6));
        hs.addView(pestanas);
        col.addView(hs);

        ScrollView sv = new ScrollView(a);
        contenido = new LinearLayout(a);
        contenido.setOrientation(LinearLayout.VERTICAL);
        contenido.setPadding(a.dp(18), a.dp(6), a.dp(18), a.insetAbajo + a.dp(30));
        sv.addView(contenido);
        col.addView(sv, new LinearLayout.LayoutParams(-1, 0, 1f));

        a.root.addView(ed, new FrameLayout.LayoutParams(-1, -1));
        ed.setAlpha(0f); ed.animate().alpha(1f).setDuration(160).start();
        repintarVista();
        construirPestanas();
    }

    void cerrarEditor() {
        if (!editando()) return;
        final FrameLayout e = ed;
        ed = null;
        e.animate().alpha(0f).setDuration(140).withEndAction(() -> { if (e.getParent() != null) ((ViewGroup) e.getParent()).removeView(e); }).start();
        actualizarAsa();
    }

    void cambio() { repintarVista(); construirPestanas(); }

    void repintarVista() {
        if (vistaBox == null) return;
        vistaBox.removeAllViews();
        final LinearLayout h = crearHoja(true);
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(a.getResources().getDisplayMetrics().widthPixels - a.dp(20), -2, Gravity.TOP | Gravity.CENTER_HORIZONTAL);
        vistaBox.addView(h, lp);
        h.setVisibility(View.INVISIBLE);
        h.post(() -> {
            float k = Math.min((vistaBox.getWidth() - a.dp(16)) / (float) Math.max(1, h.getWidth()), (vistaBox.getHeight() - a.dp(16)) / (float) Math.max(1, h.getHeight()));
            k = Math.min(1f, k);
            h.setPivotX(h.getWidth() / 2f); h.setPivotY(0);
            h.setScaleX(k); h.setScaleY(k);
            h.setTranslationY(a.dp(8));
            h.setVisibility(View.VISIBLE);
        });
    }

    void construirPestanas() {
        pestanas.removeAllViews();
        String[][] ps = {{"temas", "Temas"}, {"fondo", "Fondo"}, {"forma", "Botones"}, {"cuales", "Cuáles botones"}, {"mas", "Más"}};
        for (String[] p : ps) pestanas.addView(chip(p[1], p[0].equals(pestana), () -> { pestana = p[0]; construirPestanas(); }), margen(8));
        contenido.removeAllViews();
        switch (pestana) {
            case "temas": pestanaTemas(); break;
            case "fondo": pestanaFondo(); break;
            case "forma": pestanaForma(); break;
            case "cuales": pestanaCuales(); break;
            default: pestanaMas();
        }
    }

    LinearLayout.LayoutParams margen(int der) { LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-2, -2); p.rightMargin = a.dp(der); return p; }
    TextView chip(String t, boolean sel, Runnable r) {
        TextView v = a.texto(t, 14, sel ? tintaSobre(a.acento) : EF, a.tf(sel));
        v.setPadding(a.dp(14), a.dp(9), a.dp(14), a.dp(9));
        v.setBackground(a.caja(sel ? a.acento : 0x1FFFFFFF, 99, sel ? 0 : 0x22FFFFFF));
        v.setOnClickListener(x -> r.run());
        return v;
    }
    void titulo(String t) { TextView v = a.etiqueta(t, a.acento); contenido.addView(v, a.lp(-2, -2, 18)); }
    void nota(String t) { contenido.addView(a.texto(t, 13, EM, a.tf(false)), a.lp(-1, -2, 6)); }
    LinearLayout filaChips(String[][] ops, String actual, AlEscoger cb) {
        LinearLayout f = new LinearLayout(a);
        f.setOrientation(LinearLayout.VERTICAL);
        LinearLayout r = null; int n = 0;
        for (String[] o : ops) {
            if (n % 3 == 0) { r = new LinearLayout(a); f.addView(r, a.lp(-1, -2, 8)); }
            r.addView(chip(o[1], o[0].equals(actual), () -> cb.escoger(o[0])), margen(8));
            n++;
        }
        return f;
    }
    interface AlEscoger { void escoger(String v); }
    void interruptor(String t, boolean v, AlCambiar cb) {
        LinearLayout f = new LinearLayout(a);
        f.setGravity(Gravity.CENTER_VERTICAL);
        f.setPadding(0, a.dp(6), 0, a.dp(6));
        f.addView(a.texto(t, 15.5f, EF, a.tf(false)), new LinearLayout.LayoutParams(0, -2, 1f));
        Switch s = new Switch(a); s.setChecked(v);
        s.setOnCheckedChangeListener((b, x) -> { cb.cambio(x); repintarVista(); });
        f.addView(s);
        contenido.addView(f, a.lp(-1, -2, 4));
    }
    interface AlCambiar { void cambio(boolean v); }

    /** Cuadrícula de muestras (colores, degradados, temas). */
    LinearLayout cuadricula(int cols) { LinearLayout l = new LinearLayout(a); l.setOrientation(LinearLayout.VERTICAL); contenido.addView(l, a.lp(-1, -2, 8)); l.setTag(cols); return l; }
    void agregarA(LinearLayout cuad, View v, int altoDp) {
        int cols = (Integer) cuad.getTag();
        LinearLayout fila;
        if (cuad.getChildCount() == 0 || ((LinearLayout) cuad.getChildAt(cuad.getChildCount() - 1)).getChildCount() >= cols) {
            fila = new LinearLayout(a);
            cuad.addView(fila, a.lp(-1, -2, 8));
        } else fila = (LinearLayout) cuad.getChildAt(cuad.getChildCount() - 1);
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(0, a.dp(altoDp), 1f);
        p.rightMargin = a.dp(8);
        fila.addView(v, p);
    }
    void completar(LinearLayout cuad) {
        if (cuad.getChildCount() == 0) return;
        int cols = (Integer) cuad.getTag();
        LinearLayout fila = (LinearLayout) cuad.getChildAt(cuad.getChildCount() - 1);
        while (fila.getChildCount() < cols) { LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(0, 1, 1f); p.rightMargin = a.dp(8); fila.addView(new View(a), p); }
    }

    void pestanaTemas() {
        nota("Tocá un tema y mirá arriba cómo queda. Después lo podés ajustar en Fondo y Botones.");
        LinearLayout cuad = cuadricula(2);
        String fActual = fondo(), cActual = pref("panel_color", "auto");
        for (final String[] t : TEMAS) {
            FrameLayout card = new FrameLayout(a);
            boolean sel = t[1].equals(fActual) && t[2].equalsIgnoreCase(cActual);
            Drawable bg = "foto".equals(t[1]) && foto() == null ? a.caja(0xFF2A2724, 18, 0) : fondoDe(t[1], 100, a.dp(18), sel ? a.acento : 0x22FFFFFF);
            card.setBackground(bg);
            int on = hex(t[2], a.acento); boolean cl = esClaro(t[1]);
            LinearLayout dentro = new LinearLayout(a); dentro.setOrientation(LinearLayout.VERTICAL); dentro.setPadding(a.dp(12), a.dp(10), a.dp(12), a.dp(10));
            LinearLayout puntos = new LinearLayout(a);
            for (int i = 0; i < 4; i++) {
                View d = new View(a);
                d.setLayerType(View.LAYER_TYPE_SOFTWARE, null);
                boolean act = i % 2 == 0;
                d.setBackground(new Forma(t[3].equals("anillo") ? "circulo" : t[3], act ? on : (cl ? 0x1A000000 : 0x26FFFFFF), 0, 0, act && "1".equals(t[5]) ? a.dp(3) : 0));
                LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(a.dp(24), a.dp(24)); lp.rightMargin = a.dp(6);
                puntos.addView(d, lp);
            }
            dentro.addView(puntos);
            dentro.addView(a.texto(("foto".equals(t[1]) && foto() == null ? "📷 " : "") + t[0] + (sel ? "  ✓" : ""), 14, cl ? 0xFF141414 : 0xFFF5F1E8, a.tf(true)), a.lp(-2, -2, 12));
            card.addView(dentro);
            card.setOnClickListener(v -> {
                if ("foto".equals(t[1]) && foto() == null) { a.toast("Escogé la foto para tu panel."); escogerFoto(); return; }
                a.prefs.edit().putString("panel_fondo", t[1]).putString("panel_color", t[2]).putString("panel_forma", t[3]).putString("panel_borde", t[4]).putBoolean("panel_resplandor", "1".equals(t[5])).apply();
                cambio();
            });
            agregarA(cuad, card, 84);
        }
        completar(cuad);
    }

    View muestra(Drawable d, boolean sel, Runnable r) {
        FrameLayout f = new FrameLayout(a);
        View c = new View(a);
        c.setBackground(d);
        f.addView(c, new FrameLayout.LayoutParams(-1, -1));
        if (sel) { View m = new View(a); m.setBackground(a.caja(0, 14, a.acento)); ((GradientDrawable) m.getBackground()).setStroke(a.dp(3), a.acento); f.addView(m, new FrameLayout.LayoutParams(-1, -1)); }
        f.setOnClickListener(v -> r.run());
        return f;
    }

    void pestanaFondo() {
        String f = fondo();
        titulo("Degradados");
        LinearLayout c1 = cuadricula(4);
        for (String g : DEGRADADOS) agregarA(c1, muestra(fondoDe("grad:" + g, 100, a.dp(14), 0), f.equals("grad:" + g), () -> { poner("panel_fondo", "grad:" + g); cambio(); }), 56);
        completar(c1);
        titulo("Colores lisos");
        LinearLayout c2 = cuadricula(7);
        for (String s : SOLIDOS) agregarA(c2, muestra(fondoDe("solido:" + s, 100, a.dp(12), 0x33FFFFFF), f.equals("solido:" + s), () -> { poner("panel_fondo", "solido:" + s); cambio(); }), 40);
        completar(c2);
        titulo("Cristal y foto");
        LinearLayout c3 = cuadricula(3);
        agregarA(c3, muestra(fondoDe("cristal:141210", 100, a.dp(14), 0), f.equals("cristal:141210"), () -> { poner("panel_fondo", "cristal:141210"); cambio(); }), 56);
        agregarA(c3, muestra(fondoDe("cristal:FFFFFF", 100, a.dp(14), 0), f.equals("cristal:FFFFFF"), () -> { poner("panel_fondo", "cristal:FFFFFF"); cambio(); }), 56);
        TextView ft = a.texto(foto() != null ? "Cambiar\nmi foto" : "📷\nMi foto", 13, EF, a.tf(true));
        ft.setGravity(Gravity.CENTER);
        agregarA(c3, muestra(foto() != null ? fondoDe("foto", 100, a.dp(14), 0) : a.caja(0x1FFFFFFF, 14, 0x33FFFFFF), f.startsWith("foto"), this::escogerFoto), 56);
        ((FrameLayout) ((LinearLayout) c3.getChildAt(0)).getChildAt(2)).addView(ft, new FrameLayout.LayoutParams(-1, -1));
        completar(c3);
        nota("Con tu foto, el panel le pone una sombra encima para que se lean los botones.");
        titulo("Transparencia");
        contenido.addView(filaChips(OPACIDAD, pref("panel_opacidad", "92"), v -> { poner("panel_opacidad", v); cambio(); }));
        titulo("Borde del panel y botones");
        contenido.addView(filaChips(BORDES, pref("panel_borde", "color"), v -> { poner("panel_borde", v); cambio(); }));
    }

    void pestanaForma() {
        titulo("Forma de los botones");
        LinearLayout cf = cuadricula(4);
        String fa = pref("panel_forma", "circulo");
        for (String[] f : FORMAS) {
            LinearLayout box = new LinearLayout(a); box.setOrientation(LinearLayout.VERTICAL); box.setGravity(Gravity.CENTER);
            boolean sel = f[0].equals(fa);
            box.setBackground(a.caja(sel ? MainActivity.conAlpha(a.acento, 0x33) : 0x14FFFFFF, 14, sel ? a.acento : 0));
            View d = new View(a);
            boolean anillo = "anillo".equals(f[0]);
            d.setBackground(new Forma(anillo ? "circulo" : f[0], anillo ? 0 : colorOn(), anillo ? colorOn() : 0, anillo ? a.dp(2) : 0, 0));
            box.addView(d, new LinearLayout.LayoutParams(a.dp(34), a.dp(34)));
            box.addView(a.texto(f[1], 12, EF, a.tf(false)), a.lp(-2, -2, 6));
            box.setOnClickListener(v -> { poner("panel_forma", f[0]); poner("panel_anchos", false); cambio(); });
            agregarA(cf, box, 82);
        }
        completar(cf);
        interruptorSinVista("Botones anchos con nombre (2 por fila)", prefB("panel_anchos", false), v -> { poner("panel_anchos", v); cambio(); });
        titulo("Color de los botones encendidos");
        LinearLayout cc = cuadricula(7);
        String ca = pref("panel_color", "auto");
        for (String c : ENCENDIDOS) {
            int col = "auto".equals(c) ? a.acento : hex(c, a.acento);
            GradientDrawable g = new GradientDrawable(); g.setShape(GradientDrawable.OVAL); g.setColor(col); g.setStroke(a.dp(1), 0x44FFFFFF);
            View m = muestra(g, c.equalsIgnoreCase(ca), () -> { poner("panel_color", c); cambio(); });
            if ("auto".equals(c)) m.setContentDescription("El color del launcher");
            agregarA(cc, m, 40);
        }
        completar(cc);
        nota("El primero es el mismo color de tu launcher.");
        titulo("Tamaño");
        contenido.addView(filaChips(TAMANOS, pref("panel_tam", "normal"), v -> { poner("panel_tam", v); cambio(); }));
        titulo("Botones por fila");
        contenido.addView(filaChips(new String[][]{{"3", "3"}, {"4", "4"}, {"5", "5"}}, pref("panel_columnas", "4"), v -> { poner("panel_columnas", v); cambio(); }));
        titulo("Detalles");
        interruptor("Resplandor en los encendidos", prefB("panel_resplandor", true), v -> poner("panel_resplandor", v));
        interruptor("Nombres debajo de los botones", prefB("panel_nombres", true), v -> poner("panel_nombres", v));
    }

    void interruptorSinVista(String t, boolean v, AlCambiar cb) {
        LinearLayout f = new LinearLayout(a);
        f.setGravity(Gravity.CENTER_VERTICAL);
        f.setPadding(0, a.dp(6), 0, a.dp(6));
        f.addView(a.texto(t, 15.5f, EF, a.tf(false)), new LinearLayout.LayoutParams(0, -2, 1f));
        Switch s = new Switch(a); s.setChecked(v);
        s.setOnCheckedChangeListener((b, x) -> cb.cambio(x));
        f.addView(s);
        contenido.addView(f, a.lp(-1, -2, 10));
    }

    void pestanaCuales() {
        final List<String> l = botones();
        nota("Ordenalos con las flechas. Podés agregar tus apps (Proyector, Academy, WhatsApp…).");
        for (int i = 0; i < l.size(); i++) {
            final int k = i; final String id = l.get(i);
            LinearLayout f = new LinearLayout(a); f.setGravity(Gravity.CENTER_VERTICAL); f.setPadding(a.dp(12), a.dp(4), a.dp(4), a.dp(4));
            f.setBackground(a.caja(0x14FFFFFF, 14, 0));
            View ic;
            if (id.startsWith("app:")) { ImageView iv = new ImageView(a); MainActivity.App ap = a.porKey.get(id.substring(4)); if (ap != null) iv.setImageDrawable(a.icono(ap, a.dp(48))); ic = iv; }
            else ic = new Glifo(a, glifo(id), EF);
            f.addView(ic, new LinearLayout.LayoutParams(a.dp(22), a.dp(22)));
            TextView n = a.texto(nombreBoton(id), 15.5f, EF, a.tf(false));
            LinearLayout.LayoutParams pn = new LinearLayout.LayoutParams(0, -2, 1f); pn.leftMargin = a.dp(12);
            f.addView(n, pn);
            f.addView(chico("↑", k > 0, () -> { l.add(k - 1, l.remove(k)); guardarBotones(l); cambio(); }));
            f.addView(chico("↓", k < l.size() - 1, () -> { l.add(k + 1, l.remove(k)); guardarBotones(l); cambio(); }));
            f.addView(chico("✕", true, () -> { l.remove(k); guardarBotones(l); cambio(); }));
            contenido.addView(f, a.lp(-1, -2, 6));
        }
        titulo("Agregar");
        LinearLayout cuad = cuadricula(2);
        for (String[] b : BOTONES) {
            if (l.contains(b[0])) continue;
            agregarA(cuad, chip("+ " + b[1], false, () -> { l.add(b[0]); guardarBotones(l); cambio(); }), 42);
        }
        agregarA(cuad, chip("+ Una app…", false, () -> a.elegirApp("¿Qué app agregar al panel?", ap -> { l.add("app:" + ap.key()); guardarBotones(l); cambio(); })), 42);
        completar(cuad);
        TextView r = a.texto("Volver a los botones de siempre", 14, a.acento, a.tf(true));
        r.setPadding(0, a.dp(16), 0, a.dp(8));
        r.setOnClickListener(v -> { poner("panel_botones", POR_DEFECTO); cambio(); });
        contenido.addView(r);
    }

    View chico(String s, boolean activo, Runnable r) {
        TextView t = a.texto(s, 18, EF, a.tf(true));
        t.setPadding(a.dp(12), a.dp(8), a.dp(12), a.dp(8));
        t.setAlpha(activo ? 1f : .3f);
        if (activo) t.setOnClickListener(v -> r.run());
        return t;
    }

    void pestanaMas() {
        if (a.externo) {
            titulo("Desde dónde se baja");
            contenido.addView(filaChips(new String[][]{{"derecha", "Mitad derecha"}, {"izquierda", "Mitad izquierda"}, {"toda", "Todo arriba"}}, pref("zona", "derecha"), v -> { poner("zona", v); a.actualizarTiles(); construirPestanas(); }));
            nota("Deslizá hacia abajo desde arriba de la pantalla en ese lado. Del otro lado siguen saliendo las notificaciones de Samsung.");
        } else pestanaMasLauncher();
        pestanaMasComun();
    }

    void pestanaMasLauncher() {
        titulo("Cómo se abre el panel");
        String actual = "";
        for (String[] g : MainActivity.GESTOS) if ("panel".equals(a.accionDe(g[0]))) { actual = g[0]; break; }
        contenido.addView(filaChips(GESTOS_PANEL, actual, v -> {
            android.content.SharedPreferences.Editor e = a.prefs.edit();
            for (String[] g : MainActivity.GESTOS) if ("panel".equals(a.accionDe(g[0]))) e.putString(g[0], "g_abajo".equals(g[0]) ? "notificaciones" : g[2]);
            if (!v.isEmpty()) e.putString(v, "panel");
            e.apply();
            construirPestanas();
        }));
        nota("Deslizá desde la mitad de la pantalla de inicio. Si deslizás desde el borde de arriba, Samsung abre el suyo.");
        interruptorSinVista("Rayita arriba en el inicio para abrirlo", prefB("panel_asa", true), v -> { poner("panel_asa", v); actualizarAsa(); });
    }

    void pestanaMasComun() {
        titulo("Qué mostrar");
        interruptor("Hora grande", prefB("panel_reloj", true), v -> poner("panel_reloj", v));
        interruptor("Barra de brillo", prefB("panel_brillo", true), v -> poner("panel_brillo", v));
        interruptor("Barra de volumen", prefB("panel_volumen", true), v -> poner("panel_volumen", v));

        titulo("Permisos (para que todo funcione)");
        permiso("Brillo y rotación", "Modificar ajustes del sistema", permisoAjustes(), this::pedirAjustes);
        permiso("Silencio y No molestar", "Acceso a No molestar", permisoNoMolestar(), this::pedirNoMolestar);
        permiso("Apagar pantalla", "Administrador del dispositivo", a.puedeApagar(), a::pedirPermisoApagar);
        nota("Wi-Fi, Bluetooth y datos abren la ventanita de Android: desde Android 10, ninguna app los puede prender sola.");

        if (!a.externo) pestanaTiles();
        pestanaFinal();
    }

    void pestanaTiles() {
        titulo("Botones Meraki en el panel de Samsung");
        nota("Bajá el panel de Samsung → lápiz ✏️ → arrastrá los de Meraki: Panel Meraki, Apagar pantalla y estas 3 apps:");
        for (int n = 1; n <= 3; n++) {
            final int k = n;
            String key = pref("tile_app" + k, "");
            MainActivity.App ap = key.isEmpty() ? null : a.porKey.get(key);
            TextView t = a.texto("Botón " + k + ":  " + (ap != null ? ap.label : "escoger app"), 15, ap != null ? EF : a.acento, a.tf(false));
            t.setPadding(a.dp(12), a.dp(12), a.dp(12), a.dp(12));
            t.setBackground(a.caja(0x14FFFFFF, 12, 0));
            t.setOnClickListener(v -> a.elegirApp("Botón " + k + " del panel de Samsung", x -> { poner("tile_app" + k, x.key()); a.actualizarTiles(); construirPestanas(); }));
            contenido.addView(t, a.lp(-1, -2, 6));
        }
    }

    void pestanaFinal() {
        titulo("El panel de Samsung");
        nota(a.externo ? "Esta app tapa el panel de Samsung con el tuyo. El de Samsung lo podés seguir arreglando con su lápiz ✏️ y con QuickStar (de Good Lock, gratis)."
                : "Para que el Panel Meraki salga al bajar desde arriba en cualquier pantalla, instalá la app «Meraki Panel». El de Samsung lo podés arreglar con su lápiz ✏️ y con QuickStar (de Good Lock, gratis).");
        TextView gl = a.texto("Abrir Good Lock en la Galaxy Store", 14, a.acento, a.tf(true));
        gl.setPadding(0, a.dp(10), 0, a.dp(4));
        gl.setOnClickListener(v -> abrirIntent(new Intent(Intent.ACTION_VIEW, Uri.parse("samsungapps://ProductDetail/com.samsung.android.goodlock")), new Intent(Intent.ACTION_VIEW, Uri.parse("https://galaxystore.samsung.com/detail/com.samsung.android.goodlock"))));
        contenido.addView(gl);

        TextView r = a.texto("Restablecer todo el panel", 14, 0xFFE5484D, a.tf(true));
        r.setPadding(0, a.dp(24), 0, a.dp(8));
        r.setOnClickListener(v -> a.dialogo().setTitle("¿Restablecer el Panel Meraki?").setMessage("Vuelve al tema, botones y formas de fábrica. Lo demás del launcher no se toca.")
                .setPositiveButton("Sí", (d, w) -> {
                    android.content.SharedPreferences.Editor e = a.prefs.edit();
                    for (String k : new String[]{"panel_botones", "panel_estilo", "panel_fondo", "panel_forma", "panel_color", "panel_opacidad", "panel_columnas", "panel_nombres", "panel_reloj", "panel_brillo", "panel_volumen", "panel_tam", "panel_borde", "panel_resplandor", "panel_anchos"}) e.remove(k);
                    e.apply(); cambio();
                }).setNegativeButton("No", null).show());
        contenido.addView(r);
    }

    void permiso(String que, String nombre, boolean ok, Runnable pedir) {
        LinearLayout f = new LinearLayout(a);
        f.setGravity(Gravity.CENTER_VERTICAL);
        f.setPadding(a.dp(12), a.dp(10), a.dp(12), a.dp(10));
        f.setBackground(a.caja(0x14FFFFFF, 12, 0));
        LinearLayout tx = new LinearLayout(a); tx.setOrientation(LinearLayout.VERTICAL);
        tx.addView(a.texto(que, 15, EF, a.tf(false)));
        tx.addView(a.texto(nombre, 12, EM, a.tf(false)), a.lp(-2, -2, 2));
        f.addView(tx, new LinearLayout.LayoutParams(0, -2, 1f));
        TextView b = a.texto(ok ? "✓ Listo" : "Activar", 13.5f, ok ? 0xFF3DB46D : tintaSobre(a.acento), a.tf(true));
        b.setPadding(a.dp(14), a.dp(8), a.dp(14), a.dp(8));
        if (!ok) { b.setBackground(a.caja(a.acento, 99, 0)); b.setOnClickListener(v -> pedir.run()); }
        f.addView(b);
        contenido.addView(f, a.lp(-1, -2, 6));
    }

    // ================================================================ foto de fondo del panel
    void escogerFoto() {
        Intent i = new Intent(Intent.ACTION_GET_CONTENT).setType("image/*").addCategory(Intent.CATEGORY_OPENABLE);
        try { a.startActivityForResult(Intent.createChooser(i, "Foto para el Panel Meraki"), REQ_FOTO); }
        catch (Exception e) { try { a.startActivityForResult(new Intent(Intent.ACTION_PICK).setType("image/*"), REQ_FOTO); } catch (Exception e2) { a.toast("No encontré la galería."); } }
    }
    void guardarFoto(final Uri u) {
        a.toast("Poniendo tu foto…");
        new Thread(() -> {
            boolean ok = false;
            try {
                BitmapFactory.Options o = new BitmapFactory.Options(); o.inJustDecodeBounds = true;
                try (InputStream in = a.getContentResolver().openInputStream(u)) { BitmapFactory.decodeStream(in, null, o); }
                int muestra = 1; while (Math.min(o.outWidth, o.outHeight) / (muestra * 2) >= 900) muestra *= 2;
                BitmapFactory.Options o2 = new BitmapFactory.Options(); o2.inSampleSize = muestra;
                Bitmap bm;
                try (InputStream in = a.getContentResolver().openInputStream(u)) { bm = BitmapFactory.decodeStream(in, null, o2); }
                if (bm != null) {
                    bm = a.girarSiHaceFalta(u, bm);
                    try (FileOutputStream out = new FileOutputStream(new File(a.getFilesDir(), "panel_foto.jpg"))) { bm.compress(Bitmap.CompressFormat.JPEG, 88, out); }
                    ok = true;
                }
            } catch (Exception e) { }
            final boolean listo = ok;
            a.ui.post(() -> {
                if (!listo) { a.toast("No se pudo usar esa foto."); return; }
                a.prefs.edit().putString("panel_fondo", "foto").putLong("panel_foto_v", System.currentTimeMillis()).apply();
                if (editando()) cambio();
            });
        }).start();
    }

    // ================================================================ dibujos de los botones (caminos tipo SVG en una cuadrícula de 24)
    static String glifo(String id) {
        switch (id) {
            case "wifi": return "M5 12.55a11 11 0 0 1 14.08 0 M1.42 9a16 16 0 0 1 21.16 0 M8.53 16.11a6 6 0 0 1 6.95 0 M12 20h.01";
            case "bt": return "M7 7l10 10-5 5V2l5 5L7 17";
            case "linterna": return "M18 6c0 2-2 2-2 4v10a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V10c0-2-2-2-2-4V2h12z M6 6h12 M12 12v.01";
            case "datos": return "M7 3v18 M3 7l4-4 4 4 M17 21V3 M21 17l-4 4-4-4";
            case "sonido": return "M11 5L6 9H2v6h4l5 4V5z M15.54 8.46a5 5 0 0 1 0 7.07 M19.07 4.93a10 10 0 0 1 0 14.14";
            case "rotacion": return "M21 12a9 9 0 1 1-3-6.7L21 8 M21 3v5h-5";
            case "ubicacion": return "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z M12 7a3 3 0 1 0 0 6a3 3 0 1 0 0-6";
            case "ahorro": return "M6 7h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z M22 11v2 M11 9l-2 3h4l-2 3";
            case "nomolestar": return "M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20 M8 12h8";
            case "apagar": return "M12 2v10 M18.4 6.6a9 9 0 1 1-12.77.04";
            case "samsung": return "M3 3h18v6H3z M3 13h8v8H3z M13 13h8v8h-8z";
            case "ajustes": return "M4 21v-7 M4 10V3 M12 21v-9 M12 8V3 M20 21v-5 M20 12V3 M1 14h6 M9 8h6 M17 16h6";
            case "avion": return "M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z";
            case "oscuro": return "M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z";
            case "hotspot": return "M4.9 19.1C1 15.2 1 8.8 4.9 4.9 M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5 M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5 M19.1 4.9C23 8.8 23 15.1 19.1 19 M12 10a2 2 0 1 0 0 4a2 2 0 1 0 0-4";
            case "espejo": return "M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6 M2 12a9 9 0 0 1 8 8 M2 16a5 5 0 0 1 4 4 M2 20h.01";
            case "nfc": return "M6 8.32a7.43 7.43 0 0 1 0 7.36 M9.46 6.21a11.76 11.76 0 0 1 0 11.58 M12.91 4.1a15.91 15.91 0 0 1 .01 15.8 M16.37 2a20.16 20.16 0 0 1 0 20";
            case "volumen": return "M4 21v-7 M4 10V3 M12 21v-9 M12 8V3 M20 21v-5 M20 12V3 M1 14h6 M9 8h6 M17 16h6";
            case "camara": return "M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z M12 10a3 3 0 1 0 0 6a3 3 0 1 0 0-6";
            case "alarma": return "M12 4a9 9 0 1 0 0 18a9 9 0 1 0 0-18 M12 9v4l2 2 M5 3L2 6 M22 6l-3-3";
            case "calc": return "M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z M8 6h8 M8 10h.01 M12 10h.01 M16 10h.01 M8 14h.01 M12 14h.01 M16 14h.01 M8 18h.01 M12 18h.01 M16 18h.01";
            case "notis": return "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9 M10.3 21a1.94 1.94 0 0 0 3.4 0";
        }
        return "M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20";
    }

    /** Dibuja un ícono de líneas a partir de un camino tipo SVG (sin librerías). */
    static class Glifo extends View {
        static final Map<String, Path> CACHE = new HashMap<>();
        final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        Path ruta;
        Glifo(Context c, String d, int color) {
            super(c);
            p.setStyle(Paint.Style.STROKE); p.setStrokeCap(Paint.Cap.ROUND); p.setStrokeJoin(Paint.Join.ROUND); p.setStrokeWidth(2f); p.setColor(color);
            ruta(d);
        }
        void ruta(String d) { Path r = CACHE.get(d); if (r == null) { r = parsear(d); CACHE.put(d, r); } ruta = r; invalidate(); }
        void color(int c) { if (p.getColor() != c) { p.setColor(c); invalidate(); } }
        @Override protected void onDraw(Canvas c) {
            float k = Math.min(getWidth(), getHeight()) / 24f;
            c.save(); c.translate((getWidth() - 24 * k) / 2f, (getHeight() - 24 * k) / 2f); c.scale(k, k);
            c.drawPath(ruta, p);
            c.restore();
        }
        static final Pattern TOK = Pattern.compile("[MmLlHhVvCcSsQqAaZz]|-?(?:\\d*\\.\\d+|\\d+\\.?)(?:[eE][-+]?\\d+)?");
        static Path parsear(String d) {
            Path p = new Path();
            List<String> t = new ArrayList<>();
            Matcher m = TOK.matcher(d); while (m.find()) t.add(m.group());
            int i = 0; char cmd = 'M'; float x = 0, y = 0, sx = 0, sy = 0, cx2 = 0, cy2 = 0;
            while (i < t.size()) {
                String s = t.get(i);
                if (Character.isLetter(s.charAt(0))) { cmd = s.charAt(0); i++; if (cmd == 'Z' || cmd == 'z') { p.close(); x = sx; y = sy; continue; } }
                boolean rel = Character.isLowerCase(cmd);
                float ox = rel ? x : 0, oy = rel ? y : 0;
                try {
                    switch (Character.toUpperCase(cmd)) {
                        case 'M': x = ox + f(t, i); y = oy + f(t, i + 1); i += 2; p.moveTo(x, y); sx = x; sy = y; cmd = rel ? 'l' : 'L'; break;
                        case 'L': x = ox + f(t, i); y = oy + f(t, i + 1); i += 2; p.lineTo(x, y); break;
                        case 'H': x = ox + f(t, i); i++; p.lineTo(x, y); break;
                        case 'V': y = oy + f(t, i); i++; p.lineTo(x, y); break;
                        case 'C': { float x1 = ox + f(t, i), y1 = oy + f(t, i + 1); cx2 = ox + f(t, i + 2); cy2 = oy + f(t, i + 3); x = ox + f(t, i + 4); y = oy + f(t, i + 5); i += 6; p.cubicTo(x1, y1, cx2, cy2, x, y); break; }
                        case 'S': { float x1 = 2 * x - cx2, y1 = 2 * y - cy2; cx2 = ox + f(t, i); cy2 = oy + f(t, i + 1); x = ox + f(t, i + 2); y = oy + f(t, i + 3); i += 4; p.cubicTo(x1, y1, cx2, cy2, x, y); break; }
                        case 'Q': { float x1 = ox + f(t, i), y1 = oy + f(t, i + 1); x = ox + f(t, i + 2); y = oy + f(t, i + 3); i += 4; p.quadTo(x1, y1, x, y); break; }
                        case 'A': {
                            float rx = f(t, i), ry = f(t, i + 1); boolean fa = f(t, i + 3) != 0, fs = f(t, i + 4) != 0;
                            float nx = ox + f(t, i + 5), ny = oy + f(t, i + 6); i += 7;
                            arco(p, x, y, rx, ry, fa, fs, nx, ny); x = nx; y = ny; break;
                        }
                        default: i++;
                    }
                } catch (Exception e) { break; }
            }
            return p;
        }
        static float f(List<String> t, int i) { return Float.parseFloat(t.get(i)); }
        static void arco(Path p, float x1, float y1, float rx, float ry, boolean fa, boolean fs, float x2, float y2) {
            rx = Math.abs(rx); ry = Math.abs(ry);
            if (rx == 0 || ry == 0 || (x1 == x2 && y1 == y2)) { p.lineTo(x2, y2); return; }
            double dx = (x1 - x2) / 2.0, dy = (y1 - y2) / 2.0;
            double lam = dx * dx / (rx * rx) + dy * dy / (ry * ry);
            if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
            double num = (double) rx * rx * ry * ry - (double) rx * rx * dy * dy - (double) ry * ry * dx * dx;
            double den = (double) rx * rx * dy * dy + (double) ry * ry * dx * dx;
            double co = Math.sqrt(Math.max(0, num / den)) * (fa == fs ? -1 : 1);
            double cxp = co * rx * dy / ry, cyp = -co * ry * dx / rx;
            double cx = cxp + (x1 + x2) / 2.0, cy = cyp + (y1 + y2) / 2.0;
            double t1 = Math.atan2((dy - cyp) / ry, (dx - cxp) / rx);
            double t2 = Math.atan2((-dy - cyp) / ry, (-dx - cxp) / rx);
            double dt = t2 - t1;
            if (!fs && dt > 0) dt -= 2 * Math.PI; else if (fs && dt < 0) dt += 2 * Math.PI;
            p.arcTo(new RectF((float) (cx - rx), (float) (cy - ry), (float) (cx + rx), (float) (cy + ry)), (float) Math.toDegrees(t1), (float) Math.toDegrees(dt), false);
        }
    }
}
