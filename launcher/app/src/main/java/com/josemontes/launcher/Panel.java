package com.josemontes.launcher;

import android.app.NotificationManager;
import android.bluetooth.BluetoothAdapter;
import android.content.ComponentName;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
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
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.SeekBar;
import android.widget.TextView;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Panel Meraki: ajustes rápidos propios, con el estilo que Jose escoja. Se abre desde el inicio con un gesto. */
class Panel {
    static final String[][] BOTONES = {
            {"wifi", "Wi-Fi"}, {"bt", "Bluetooth"}, {"linterna", "Linterna"}, {"datos", "Datos móviles"}, {"sonido", "Sonido"},
            {"rotacion", "Rotación"}, {"ubicacion", "Ubicación"}, {"ahorro", "Ahorro de batería"}, {"nomolestar", "No molestar"},
            {"apagar", "Apagar pantalla"}, {"samsung", "Panel de Samsung"}, {"ajustes", "Ajustes del cel"}, {"avion", "Modo avión"},
            {"oscuro", "Modo oscuro"}, {"hotspot", "Zona Wi-Fi"}, {"espejo", "Duplicar pantalla"}, {"nfc", "NFC"}, {"volumen", "Volumen"},
            {"camara", "Cámara"}, {"alarma", "Alarmas"}, {"calc", "Calculadora"}, {"notis", "Notificaciones"}};
    static final String POR_DEFECTO = "wifi,bt,linterna,datos,sonido,rotacion,ubicacion,ahorro,nomolestar,apagar,samsung,ajustes";
    static final String[][] ESTILOS = {{"meraki", "Meraki (oscuro con brillo)"}, {"cristal", "Cristal (transparente)"}, {"solido", "Sólido"}, {"claro", "Claro"}, {"tema", "Igual que el launcher"}};
    static final String[][] FORMAS = {{"circulo", "Círculos"}, {"cuadro", "Cuadros redondeados"}, {"pastilla", "Botones anchos con nombre (2 por fila)"}};
    static final String[][] COLORES = {{"auto", "El color del launcher"}, {"D9B55C", "Oro Meraki"}, {"1FBFB8", "Turquesa"}, {"4F8CFF", "Azul"}, {"E5484D", "Rojo"},
            {"3DB46D", "Verde"}, {"E86FB0", "Rosa"}, {"9B7BFF", "Morado"}, {"FF8A3D", "Naranja"}, {"F5F1E8", "Blanco hueso"}};
    static final String[][] OPACIDAD = {{"100", "Nada transparente"}, {"92", "Un poquito transparente"}, {"80", "Transparente"}, {"65", "Muy transparente"}};
    static final String[][] COLUMNAS = {{"3", "3 por fila (más grandes)"}, {"4", "4 por fila"}, {"5", "5 por fila"}};
    static final String[][] GESTOS_PANEL = {{"g_abajo", "Deslizar hacia abajo"}, {"g_derecha", "Deslizar a la derecha"}, {"g_izquierda", "Deslizar a la izquierda"}, {"g_doble", "Doble toque"}};

    final MainActivity a;
    FrameLayout capa;
    LinearLayout hoja;
    final List<Runnable> refrescos = new ArrayList<>();
    boolean linternaOn;
    String camaraFlash;
    CameraManager.TorchCallback torchCb;
    final Runnable tic = new Runnable() { public void run() { refrescar(); if (abierto()) a.ui.postDelayed(this, 1000); } };

    Panel(MainActivity a) { this.a = a; }

    boolean abierto() { return capa != null && capa.getParent() != null; }

    // ================================================================ preferencias
    String pref(String k, String d) { return a.prefs.getString(k, d); }
    boolean prefB(String k, boolean d) { return a.prefs.getBoolean(k, d); }
    List<String> botones() {
        String s = pref("panel_botones", POR_DEFECTO);
        List<String> l = new ArrayList<>();
        for (String x : s.split(",")) if (!x.trim().isEmpty()) l.add(x.trim());
        return l;
    }
    void guardarBotones(List<String> l) { a.prefs.edit().putString("panel_botones", String.join(",", l)).apply(); }
    int colorOn() {
        String c = pref("panel_color", "auto");
        if ("auto".equals(c)) return a.acento;
        try { return 0xFF000000 | Integer.parseInt(c, 16); } catch (Exception e) { return a.acento; }
    }
    boolean estiloClaro() { String e = pref("panel_estilo", "meraki"); return "claro".equals(e) || ("tema".equals(e) && a.claro); }
    int fg() { return estiloClaro() ? 0xFF141414 : 0xFFF5F1E8; }
    int muted() { return estiloClaro() ? 0xFF6E685E : 0xFF9A948A; }
    int botonApagado() { return estiloClaro() ? 0x14000000 : 0x1FFFFFFF; }
    static int tintaSobre(int c) { double l = (0.299 * Color.red(c) + 0.587 * Color.green(c) + 0.114 * Color.blue(c)) / 255.0; return l > 0.6 ? 0xFF141414 : 0xFFFFFFFF; }
    static String nombre(String[][] ops, String k) { for (String[] o : ops) if (o[0].equals(k)) return o[1]; return ops[0][1]; }
    String nombreBoton(String id) {
        if (id.startsWith("app:")) { MainActivity.App ap = a.porKey.get(id.substring(4)); return ap != null ? ap.label : "App"; }
        return nombre(BOTONES, id);
    }

    // ================================================================ abrir y cerrar
    void abrir() {
        if (abierto()) return;
        a.cerrarCajon();
        construir();
        a.root.addView(capa, new FrameLayout.LayoutParams(-1, -1));
        hoja.setTranslationY(-a.dp(500)); hoja.setAlpha(0f);
        capa.setAlpha(0f);
        capa.animate().alpha(1f).setDuration(160).start();
        hoja.animate().translationY(0).alpha(1f).setDuration(240).setInterpolator(new android.view.animation.DecelerateInterpolator(2f)).start();
        prepararLinterna();
        a.ui.removeCallbacks(tic); a.ui.post(tic);
    }

    void cerrar() {
        if (!abierto()) return;
        a.ui.removeCallbacks(tic);
        final FrameLayout c = capa;
        hoja.animate().translationY(-hoja.getHeight() - a.dp(20)).alpha(0f).setDuration(180).start();
        c.animate().alpha(0f).setDuration(200).withEndAction(() -> { if (c.getParent() != null) ((ViewGroup) c.getParent()).removeView(c); }).start();
        soltarLinterna();
    }

    void reconstruir() { if (!abierto()) return; int i = a.root.indexOfChild(capa); a.root.removeView(capa); construir(); a.root.addView(capa, i, new FrameLayout.LayoutParams(-1, -1)); }

    // ================================================================ construir la vista
    void construir() {
        refrescos.clear();
        final MainActivity A = a;
        capa = new FrameLayout(a);
        capa.setBackgroundColor(0x73000000);
        capa.setClickable(true);
        capa.setOnClickListener(v -> cerrar());

        String estilo = pref("panel_estilo", "meraki");
        int op = 92; try { op = Integer.parseInt(pref("panel_opacidad", "92")); } catch (Exception e) { }
        int alfa = Math.round(255 * op / 100f);
        boolean claro = estiloClaro();
        GradientDrawable fondo;
        switch (estilo) {
            case "cristal": fondo = new GradientDrawable(); fondo.setColor(MainActivity.conAlpha(claro ? 0xFFFFFFFF : 0xFF141210, Math.min(alfa, 150))); break;
            case "solido": fondo = new GradientDrawable(); fondo.setColor(MainActivity.conAlpha(0xFF1A1917, alfa)); break;
            case "claro": fondo = new GradientDrawable(); fondo.setColor(MainActivity.conAlpha(0xFFF7F3EA, alfa)); break;
            case "tema": fondo = new GradientDrawable(); fondo.setColor(MainActivity.conAlpha(a.claro ? 0xFFF4F1EA : 0xFF0B0A08, alfa)); break;
            default:
                fondo = new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, new int[]{MainActivity.conAlpha(mezcla(0xFF0B0A08, colorOn(), .16f), alfa), MainActivity.conAlpha(0xFF0B0A08, alfa)});
        }
        fondo.setCornerRadius(a.dp(30));
        if ("meraki".equals(estilo) || "cristal".equals(estilo)) fondo.setStroke(a.dp(1), MainActivity.conAlpha(colorOn(), 0x55));

        hoja = new LinearLayout(a);
        hoja.setOrientation(LinearLayout.VERTICAL);
        hoja.setBackground(fondo);
        hoja.setClickable(true);
        hoja.setPadding(a.dp(18), a.dp(16), a.dp(18), a.dp(16));
        FrameLayout.LayoutParams lh = new FrameLayout.LayoutParams(-1, -2, Gravity.TOP);
        lh.setMargins(a.dp(10), a.insetArriba + a.dp(8), a.dp(10), 0);
        capa.addView(hoja, lh);
        cerrarDeslizando(hoja);

        // ---- encabezado: hora, fecha y batería
        LinearLayout cab = new LinearLayout(a);
        cab.setGravity(Gravity.CENTER_VERTICAL);
        LinearLayout tl = new LinearLayout(a); tl.setOrientation(LinearLayout.VERTICAL);
        final TextView hora = A.texto("", prefB("panel_reloj", true) ? 40 : 22, fg(), A.tf(true));
        final TextView fecha = A.texto("", 13.5f, muted(), A.tf(false));
        tl.addView(hora); tl.addView(fecha, A.lp(-2, -2, 4));
        cab.addView(tl, new LinearLayout.LayoutParams(0, -2, 1f));
        refrescos.add(() -> {
            hora.setText(android.text.format.DateFormat.is24HourFormat(a) ? new SimpleDateFormat("HH:mm", MainActivity.ES).format(new Date()) : new SimpleDateFormat("h:mm", MainActivity.ES).format(new Date()));
            BatteryManager bm = (BatteryManager) a.getSystemService(Context.BATTERY_SERVICE);
            int bat = bm != null ? bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY) : -1;
            String f = MainActivity.mayus1(new SimpleDateFormat("EEEE d 'de' MMMM", MainActivity.ES).format(new Date()));
            fecha.setText(bat > 0 ? f + "  ·  " + bat + "%" + (bm.isCharging() ? " cargando" : "") : f);
        });
        cab.addView(iconoBoton("M12 20h9 M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z", "Personalizar el panel", () -> { cerrar(); A.abrirAjustes(); A.ui.postDelayed(A::irAjustesPanel, 250); }));
        cab.addView(iconoBoton("M18 6L6 18 M6 6l12 12", "Cerrar", this::cerrar));
        hoja.addView(cab);

        // ---- botones
        List<String> ids = botones();
        boolean pastilla = "pastilla".equals(pref("panel_forma", "circulo"));
        int cols = pastilla ? 2 : Math.max(3, Math.min(5, Integer.parseInt(pref("panel_columnas", "4"))));
        LinearLayout fila = null;
        for (int i = 0; i < ids.size(); i++) {
            if (i % cols == 0) { fila = new LinearLayout(a); fila.setGravity(Gravity.TOP); hoja.addView(fila, A.lp(-1, -2, pastilla ? 8 : 14)); }
            View b = boton(ids.get(i), pastilla);
            LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(0, -2, 1f);
            if (pastilla) { p.leftMargin = i % 2 == 1 ? a.dp(4) : 0; p.rightMargin = i % 2 == 0 ? a.dp(4) : 0; }
            fila.addView(b, p);
        }
        if (fila != null) for (int k = ids.size() % cols; k > 0 && k < cols; k++) fila.addView(new View(a), new LinearLayout.LayoutParams(0, 1, 1f));
        if (ids.isEmpty()) hoja.addView(A.texto("No hay botones. Tocá el lápiz para agregar.", 14, muted(), A.tf(false)), A.lp(-2, -2, 14));

        // ---- barras de brillo y volumen
        if (prefB("panel_brillo", true)) hoja.addView(barraBrillo(), A.lp(-1, -2, 16));
        if (prefB("panel_volumen", true)) hoja.addView(barraVolumen(), A.lp(-1, -2, 10));

        // ---- abajo
        LinearLayout pie = new LinearLayout(a);
        pie.setGravity(Gravity.CENTER_VERTICAL);
        pie.addView(pastillaTexto("Notificaciones", () -> { cerrar(); A.bajarNotificaciones(); }), new LinearLayout.LayoutParams(0, -2, 1f));
        View sep = new View(a); pie.addView(sep, new LinearLayout.LayoutParams(a.dp(8), 1));
        pie.addView(pastillaTexto("Panel de Samsung", () -> { cerrar(); expandirAjustesSamsung(); }), new LinearLayout.LayoutParams(0, -2, 1f));
        hoja.addView(pie, A.lp(-1, -2, 16));
        View raya = new View(a); raya.setBackground(A.caja(MainActivity.conAlpha(fg(), 0x55), 9, 0));
        LinearLayout.LayoutParams lr = new LinearLayout.LayoutParams(a.dp(42), a.dp(4)); lr.gravity = Gravity.CENTER_HORIZONTAL; lr.topMargin = a.dp(12);
        hoja.addView(raya, lr);
    }

    static int mezcla(int c1, int c2, float k) {
        return Color.rgb(Math.round(Color.red(c1) * (1 - k) + Color.red(c2) * k), Math.round(Color.green(c1) * (1 - k) + Color.green(c2) * k), Math.round(Color.blue(c1) * (1 - k) + Color.blue(c2) * k));
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

    View iconoBoton(String d, String desc, Runnable r) {
        FrameLayout f = new FrameLayout(a);
        f.setBackground(a.caja(botonApagado(), 99, 0));
        Glifo g = new Glifo(a, d, fg());
        FrameLayout.LayoutParams p = new FrameLayout.LayoutParams(a.dp(20), a.dp(20), Gravity.CENTER);
        f.addView(g, p);
        f.setContentDescription(desc);
        f.setOnClickListener(v -> r.run());
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(a.dp(42), a.dp(42)); lp.leftMargin = a.dp(8);
        f.setLayoutParams(lp);
        return f;
    }

    View pastillaTexto(String t, Runnable r) {
        TextView v = a.texto(t, 13.5f, fg(), a.tf(false));
        v.setGravity(Gravity.CENTER);
        v.setPadding(a.dp(10), a.dp(12), a.dp(10), a.dp(12));
        v.setBackground(a.caja(botonApagado(), 99, 0));
        v.setOnClickListener(x -> r.run());
        return v;
    }

    // ================================================================ un botón
    View boton(String id, boolean pastilla) {
        final MainActivity A = a;
        final int on = colorOn();
        String forma = pref("panel_forma", "circulo");
        boolean nombres = prefB("panel_nombres", true);
        int cols = Math.max(3, Math.min(5, Integer.parseInt(pref("panel_columnas", "4"))));
        int tam = a.dp(cols == 3 ? 70 : cols == 5 ? 52 : 60);

        final FrameLayout circulo = new FrameLayout(a);
        final View ico;
        if (id.startsWith("app:")) {
            MainActivity.App ap = a.porKey.get(id.substring(4));
            ImageView iv = new ImageView(a);
            if (ap != null) iv.setImageDrawable(a.icono(ap, a.dp(64)));
            ico = iv;
        } else ico = new Glifo(a, glifo(id), fg());
        int ti = pastilla ? a.dp(22) : Math.round(tam * (id.startsWith("app:") ? .62f : .4f));
        circulo.addView(ico, new FrameLayout.LayoutParams(ti, ti, Gravity.CENTER));

        final TextView nom = a.texto(nombreBoton(id), pastilla ? 14 : 11.5f, fg(), a.tf(pastilla));
        nom.setMaxLines(pastilla ? 1 : 2);
        nom.setEllipsize(android.text.TextUtils.TruncateAt.END);
        final TextView sub = pastilla ? a.texto("", 12, muted(), a.tf(false)) : null;
        if (sub != null) { sub.setMaxLines(1); sub.setEllipsize(android.text.TextUtils.TruncateAt.END); }

        LinearLayout cont = new LinearLayout(a);
        final View fondoV;
        if (pastilla) {
            cont.setOrientation(LinearLayout.HORIZONTAL);
            cont.setGravity(Gravity.CENTER_VERTICAL);
            cont.setPadding(a.dp(12), a.dp(12), a.dp(12), a.dp(12));
            circulo.setBackground(a.caja(0x00000000, 99, 0));
            cont.addView(circulo, new LinearLayout.LayoutParams(a.dp(36), a.dp(36)));
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
        final float radio = pastilla ? 20 : "cuadro".equals(forma) ? 18 : 99;
        final boolean esApp = id.startsWith("app:");
        Runnable pintar = () -> {
            Boolean st = esApp ? null : estado(id);
            boolean act = st != null && st;
            fondoV.setBackground(a.caja(act ? on : botonApagado(), radio, 0));
            int tinta = act ? tintaSobre(on) : fg();
            if (ico instanceof Glifo) ((Glifo) ico).color(tinta);
            if (pastilla) { nom.setTextColor(act ? tinta : fg()); sub.setTextColor(act ? MainActivity.conAlpha(tinta, 0xCC) : muted()); sub.setText(subtitulo(id, st)); }
            if (id.equals("sonido") && ico instanceof Glifo) ((Glifo) ico).ruta(glifo(id));
        };
        pintar.run();
        refrescos.add(pintar);
        cont.setOnClickListener(v -> { tocar(id); a.ui.postDelayed(this::refrescar, 250); });
        cont.setOnLongClickListener(v -> { mantener(id); return true; });
        cont.setContentDescription(nombreBoton(id));
        return cont;
    }

    String subtitulo(String id, Boolean st) {
        if (st == null) return "Abrir";
        if (id.equals("sonido")) { AudioManager am = (AudioManager) a.getSystemService(Context.AUDIO_SERVICE); int m = am.getRingerMode(); return m == AudioManager.RINGER_MODE_NORMAL ? "Con sonido" : m == AudioManager.RINGER_MODE_VIBRATE ? "Vibrar" : "Silencio"; }
        return st ? "Encendido" : "Apagado";
    }

    void refrescar() { for (Runnable r : refrescos) try { r.run(); } catch (Exception e) { } }

    // ================================================================ estados
    /** null = es un botón que sólo abre algo (no se enciende ni se apaga). */
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
    void abrirIntent(Intent... opciones) {
        for (Intent i : opciones) {
            if (i == null) continue;
            try { i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); a.startActivity(i); return; } catch (Exception e) { }
        }
        a.toast("Tu cel no deja abrir eso desde aquí.");
    }
    static Intent accion(String s) { return new Intent(s); }
    static Intent componente(String pkg, String cls) { Intent i = new Intent(); i.setComponent(new ComponentName(pkg, cls)); return i; }

    boolean puedeEscribirAjustes() {
        if (Settings.System.canWrite(a)) return true;
        a.dialogo().setTitle("Un permiso más").setMessage("Para cambiar el brillo y la rotación desde el Panel Meraki, Android pide activar «Modificar ajustes del sistema» para Meraki Launcher. Sólo se usa para eso.")
                .setPositiveButton("Activar", (d, w) -> abrirIntent(new Intent(Settings.ACTION_MANAGE_WRITE_SETTINGS, Uri.parse("package:" + a.getPackageName()))))
                .setNegativeButton("Ahora no", null).show();
        return false;
    }

    boolean puedeNoMolestar() {
        NotificationManager nm = (NotificationManager) a.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null && nm.isNotificationPolicyAccessGranted()) return true;
        a.dialogo().setTitle("Un permiso más").setMessage("Para poner el cel en silencio o en No molestar desde el panel, Android pide permitir «Acceso a No molestar» para Meraki Launcher. No lee tus notificaciones.")
                .setPositiveButton("Permitir", (d, w) -> abrirIntent(accion(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS)))
                .setNegativeButton("Ahora no", null).show();
        return false;
    }

    void tocar(String id) {
        ContentResolver cr = a.getContentResolver();
        if (id.startsWith("app:")) { MainActivity.App ap = a.porKey.get(id.substring(4)); cerrar(); if (ap != null) a.lanzar(ap); else a.toast("Esa app ya no está."); return; }
        switch (id) {
            case "wifi": abrirIntent(Build.VERSION.SDK_INT >= 29 ? accion(Settings.Panel.ACTION_WIFI) : null, accion(Settings.ACTION_WIFI_SETTINGS)); break;
            case "bt": abrirIntent(accion(Settings.ACTION_BLUETOOTH_SETTINGS)); break;
            case "linterna": cambiarLinterna(); break;
            case "datos": abrirIntent(Build.VERSION.SDK_INT >= 29 ? accion(Settings.Panel.ACTION_INTERNET_CONNECTIVITY) : null, accion(Settings.ACTION_DATA_ROAMING_SETTINGS)); break;
            case "sonido": {
                AudioManager am = (AudioManager) a.getSystemService(Context.AUDIO_SERVICE);
                int m = am.getRingerMode();
                try {
                    if (m == AudioManager.RINGER_MODE_NORMAL) { am.setRingerMode(AudioManager.RINGER_MODE_VIBRATE); a.toast("Vibrar"); }
                    else if (m == AudioManager.RINGER_MODE_VIBRATE) {
                        NotificationManager nm = (NotificationManager) a.getSystemService(Context.NOTIFICATION_SERVICE);
                        if (nm != null && nm.isNotificationPolicyAccessGranted()) { am.setRingerMode(AudioManager.RINGER_MODE_SILENT); a.toast("Silencio"); }
                        else { am.setRingerMode(AudioManager.RINGER_MODE_NORMAL); a.toast("Con sonido"); }
                    } else { am.setRingerMode(AudioManager.RINGER_MODE_NORMAL); a.toast("Con sonido"); }
                } catch (Exception e) { if (puedeNoMolestar()) a.toast("No se pudo cambiar el sonido."); }
                break;
            }
            case "rotacion":
                if (puedeEscribirAjustes()) { boolean r = Settings.System.getInt(cr, Settings.System.ACCELEROMETER_ROTATION, 0) == 1; Settings.System.putInt(cr, Settings.System.ACCELEROMETER_ROTATION, r ? 0 : 1); a.toast(r ? "Rotación bloqueada" : "Rotación automática"); }
                break;
            case "ubicacion": abrirIntent(accion(Settings.ACTION_LOCATION_SOURCE_SETTINGS)); break;
            case "ahorro": abrirIntent(accion(Settings.ACTION_BATTERY_SAVER_SETTINGS), accion(Settings.ACTION_SETTINGS)); break;
            case "nomolestar":
                if (puedeNoMolestar()) {
                    NotificationManager nm = (NotificationManager) a.getSystemService(Context.NOTIFICATION_SERVICE);
                    boolean act = nm.getCurrentInterruptionFilter() > NotificationManager.INTERRUPTION_FILTER_ALL;
                    nm.setInterruptionFilter(act ? NotificationManager.INTERRUPTION_FILTER_ALL : NotificationManager.INTERRUPTION_FILTER_PRIORITY);
                    a.toast(act ? "No molestar apagado" : "No molestar encendido");
                }
                break;
            case "apagar": cerrar(); a.ui.postDelayed(a::apagarPantalla, 250); break;
            case "samsung": cerrar(); expandirAjustesSamsung(); break;
            case "notis": cerrar(); a.bajarNotificaciones(); break;
            case "ajustes": abrirIntent(accion(Settings.ACTION_SETTINGS)); break;
            case "avion": abrirIntent(accion(Settings.ACTION_AIRPLANE_MODE_SETTINGS)); break;
            case "oscuro": abrirIntent(accion(Settings.ACTION_DISPLAY_SETTINGS)); break;
            case "hotspot": abrirIntent(componente("com.android.settings", "com.android.settings.TetherSettings"), componente("com.android.settings", "com.android.settings.Settings$TetherSettingsActivity"), accion(Settings.ACTION_WIRELESS_SETTINGS)); break;
            case "espejo": {
                Intent sv = a.getPackageManager().getLaunchIntentForPackage("com.samsung.android.smartmirroring");
                abrirIntent(sv, accion("android.settings.CAST_SETTINGS"), accion(Settings.ACTION_WIRELESS_SETTINGS));
                break;
            }
            case "nfc": abrirIntent(accion(Settings.ACTION_NFC_SETTINGS), accion(Settings.ACTION_WIRELESS_SETTINGS)); break;
            case "volumen": abrirIntent(Build.VERSION.SDK_INT >= 29 ? accion(Settings.Panel.ACTION_VOLUME) : null, accion(Settings.ACTION_SOUND_SETTINGS)); break;
            case "camara": cerrar(); abrirIntent(accion(MediaStore.INTENT_ACTION_STILL_IMAGE_CAMERA)); break;
            case "alarma": cerrar(); abrirIntent(accion(AlarmClock.ACTION_SHOW_ALARMS)); break;
            case "calc": cerrar(); abrirIntent(Intent.makeMainSelectorActivity(Intent.ACTION_MAIN, Intent.CATEGORY_APP_CALCULATOR), a.getPackageManager().getLaunchIntentForPackage("com.sec.android.app.popupcalculator")); break;
        }
    }

    /** Mantener presionado: abre la pantalla de ajustes de ese botón. */
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
            for (String c : cm.getCameraIdList()) {
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
            if (camaraFlash == null) { a.toast("Este cel no tiene flash."); return; }
            cm.setTorchMode(camaraFlash, !linternaOn);
            linternaOn = !linternaOn;
        } catch (Exception e) { a.toast("La linterna está ocupada (¿la cámara está abierta?)."); }
    }

    // ================================================================ barras
    View barra(String glifo, int max, int valor, SeekBar.OnSeekBarChangeListener l, Runnable alTocarIcono, String desc) {
        LinearLayout f = new LinearLayout(a);
        f.setGravity(Gravity.CENTER_VERTICAL);
        f.setPadding(a.dp(12), a.dp(4), a.dp(10), a.dp(4));
        f.setBackground(a.caja(botonApagado(), 99, 0));
        Glifo g = new Glifo(a, glifo, fg());
        g.setContentDescription(desc);
        g.setOnClickListener(v -> alTocarIcono.run());
        f.addView(g, new LinearLayout.LayoutParams(a.dp(22), a.dp(22)));
        SeekBar s = new SeekBar(a);
        s.setMax(max); s.setProgress(valor);
        int on = colorOn();
        s.setProgressTintList(android.content.res.ColorStateList.valueOf(on));
        s.setThumbTintList(android.content.res.ColorStateList.valueOf(on));
        s.setProgressBackgroundTintList(android.content.res.ColorStateList.valueOf(MainActivity.conAlpha(fg(), 0x40)));
        s.setOnSeekBarChangeListener(l);
        s.setContentDescription(desc);
        f.addView(s, new LinearLayout.LayoutParams(0, a.dp(40), 1f));
        return f;
    }

    View barraBrillo() {
        final ContentResolver cr = a.getContentResolver();
        int v = Settings.System.getInt(cr, Settings.System.SCREEN_BRIGHTNESS, 128);
        final boolean[] avisado = {false};
        return barra("M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8 M12 2v2 M12 20v2 M4.93 4.93l1.41 1.41 M17.66 17.66l1.41 1.41 M2 12h2 M20 12h2 M6.34 17.66l-1.41 1.41 M19.07 4.93l-1.41 1.41",
                255, v, new SeekBar.OnSeekBarChangeListener() {
                    public void onProgressChanged(SeekBar s, int p, boolean user) {
                        if (!user) return;
                        if (!Settings.System.canWrite(a)) { if (!avisado[0]) { avisado[0] = true; puedeEscribirAjustes(); } return; }
                        try {
                            Settings.System.putInt(cr, Settings.System.SCREEN_BRIGHTNESS_MODE, Settings.System.SCREEN_BRIGHTNESS_MODE_MANUAL);
                            Settings.System.putInt(cr, Settings.System.SCREEN_BRIGHTNESS, Math.max(1, p));
                        } catch (Exception e) { }
                    }
                    public void onStartTrackingTouch(SeekBar s) { }
                    public void onStopTrackingTouch(SeekBar s) { }
                }, () -> {
                    if (!puedeEscribirAjustes()) return;
                    boolean auto = Settings.System.getInt(cr, Settings.System.SCREEN_BRIGHTNESS_MODE, 0) == 1;
                    Settings.System.putInt(cr, Settings.System.SCREEN_BRIGHTNESS_MODE, auto ? 0 : 1);
                    a.toast(auto ? "Brillo manual" : "Brillo automático");
                }, "Brillo. Tocá el sol para brillo automático");
    }

    View barraVolumen() {
        final AudioManager am = (AudioManager) a.getSystemService(Context.AUDIO_SERVICE);
        return barra("M11 5L6 9H2v6h4l5 4V5z M15.54 8.46a5 5 0 0 1 0 7.07 M19.07 4.93a10 10 0 0 1 0 14.14",
                am.getStreamMaxVolume(AudioManager.STREAM_MUSIC), am.getStreamVolume(AudioManager.STREAM_MUSIC), new SeekBar.OnSeekBarChangeListener() {
                    public void onProgressChanged(SeekBar s, int p, boolean user) { if (user) try { am.setStreamVolume(AudioManager.STREAM_MUSIC, p, 0); } catch (Exception e) { } }
                    public void onStartTrackingTouch(SeekBar s) { }
                    public void onStopTrackingTouch(SeekBar s) { }
                }, () -> tocar("volumen"), "Volumen de música y videos. Tocá la bocina para ver todos los volúmenes");
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

    // ================================================================ editor de botones (desde Ajustes)
    void editarBotones(Runnable alCambiar) {
        final MainActivity A = a;
        final List<String> l = new ArrayList<>(botones());
        final LinearLayout lista = new LinearLayout(a);
        lista.setOrientation(LinearLayout.VERTICAL);
        lista.setPadding(a.dp(18), a.dp(6), a.dp(18), a.dp(6));
        android.widget.ScrollView sv = new android.widget.ScrollView(a);
        sv.addView(lista);
        final android.app.AlertDialog[] dlg = new android.app.AlertDialog[1];
        final Runnable[] pintar = new Runnable[1];
        pintar[0] = () -> {
            lista.removeAllViews();
            for (int i = 0; i < l.size(); i++) {
                final int k = i; final String id = l.get(i);
                LinearLayout f = new LinearLayout(a); f.setGravity(Gravity.CENTER_VERTICAL); f.setPadding(0, a.dp(6), 0, a.dp(6));
                f.addView(A.texto((i + 1) + ".  " + nombreBoton(id), 16, A.FG, A.tf(false)), new LinearLayout.LayoutParams(0, -2, 1f));
                f.addView(chico("↑", k > 0, () -> { l.add(k - 1, l.remove(k)); pintar[0].run(); }));
                f.addView(chico("↓", k < l.size() - 1, () -> { l.add(k + 1, l.remove(k)); pintar[0].run(); }));
                f.addView(chico("✕", true, () -> { l.remove(k); pintar[0].run(); }));
                lista.addView(f);
            }
            TextView mas = A.texto("+  Agregar botón", 16, A.acento, A.tf(true));
            mas.setPadding(0, a.dp(14), 0, a.dp(10));
            mas.setOnClickListener(v -> {
                List<String> faltan = new ArrayList<>();
                for (String[] b : BOTONES) if (!l.contains(b[0])) faltan.add(b[0]);
                String[] nombres = new String[faltan.size() + 1];
                for (int i = 0; i < faltan.size(); i++) nombres[i] = nombre(BOTONES, faltan.get(i));
                nombres[faltan.size()] = "Una app (Proyector, Academy, WhatsApp…)";
                A.dialogo().setTitle("Agregar al panel").setItems(nombres, (d, w) -> {
                    if (w == faltan.size()) A.elegirApp("¿Qué app?", ap -> { l.add("app:" + ap.key()); pintar[0].run(); });
                    else { l.add(faltan.get(w)); pintar[0].run(); }
                }).show();
            });
            lista.addView(mas);
        };
        pintar[0].run();
        dlg[0] = A.dialogo().setTitle("Botones del Panel Meraki").setView(sv)
                .setPositiveButton("Guardar", (d, w) -> { guardarBotones(l); alCambiar.run(); A.toast("Panel guardado."); })
                .setNeutralButton("Los de siempre", (d, w) -> { a.prefs.edit().putString("panel_botones", POR_DEFECTO).apply(); alCambiar.run(); })
                .setNegativeButton("Cancelar", null).show();
    }

    View chico(String s, boolean activo, Runnable r) {
        TextView t = a.texto(s, 18, activo ? a.FG : a.MUTED, a.tf(true));
        t.setPadding(a.dp(12), a.dp(6), a.dp(12), a.dp(6));
        t.setAlpha(activo ? 1f : .35f);
        if (activo) t.setOnClickListener(v -> r.run());
        return t;
    }
}
