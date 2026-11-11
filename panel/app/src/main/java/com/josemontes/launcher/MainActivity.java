package com.josemontes.launcher;

import android.accessibilityservice.AccessibilityService;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ComponentName;
import android.content.Context;
import android.content.ContextWrapper;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.Typeface;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.util.TypedValue;
import android.view.ContextThemeWrapper;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * En la app «Meraki Panel» no hay launcher: esta clase le da al Panel (el mismo código del launcher)
 * todo lo que necesita, ya sea dentro de una pantalla normal o encima de todo desde el servicio.
 */
class MainActivity extends ContextWrapper {
    static final Locale ES = new Locale("es", "SV");
    static final String[][] GESTOS = {};
    static final String LAUNCHER = "com.josemontes.launcher";
    static final Uri PREFS = Uri.parse("content://com.josemontes.launcher.panel/prefs");
    static final Uri FOTO = Uri.parse("content://com.josemontes.launcher.panel/foto");

    final boolean externo = true;
    final Handler ui = new Handler(Looper.getMainLooper());
    final SharedPreferences prefs;
    final Activity act;
    final AccessibilityService srv;
    final FrameLayout root;
    int insetArriba, insetAbajo;
    int acento = 0xFFD9B55C, FG = 0xFFF5F1E8;
    boolean claro;
    String letra = "moderna";
    Map<String, App> porKey = new HashMap<>();
    List<App> apps = new ArrayList<>();
    Panel panel;

    static class App {
        String pkg, cls, label;
        String key() { return pkg + "/" + cls; }
    }
    interface AlElegirApp { void elegida(App a); }

    MainActivity(Context base, Activity act, AccessibilityService srv, FrameLayout root) {
        super(base);
        this.act = act; this.srv = srv; this.root = root;
        prefs = getSharedPreferences("meraki", MODE_PRIVATE);
        int sb = getResources().getIdentifier("status_bar_height", "dimen", "android");
        int nb = getResources().getIdentifier("navigation_bar_height", "dimen", "android");
        insetArriba = sb > 0 ? getResources().getDimensionPixelSize(sb) : dp(28);
        insetAbajo = nb > 0 ? getResources().getDimensionPixelSize(nb) : dp(16);
        leerConfig();
        if (act != null) { sincronizar(); leerConfig(); cargarApps(); }
        else refrescarEnFondo(); // en el servicio nada pesado al abrir: se prepara antes, en segundo plano
    }

    final java.util.concurrent.atomic.AtomicBoolean refrescando = new java.util.concurrent.atomic.AtomicBoolean();
    /** Copia el estilo del launcher y la lista de apps sin trabar la pantalla. */
    void refrescarEnFondo() {
        if (!refrescando.compareAndSet(false, true)) return;
        new Thread(() -> {
            try {
                sincronizar();
                final List<App> l = leerApps();
                ui.post(() -> { setApps(l); leerConfig(); refrescando.set(false); });
            } catch (Throwable t) { refrescando.set(false); }
        }).start();
    }

    Panel panel() { if (panel == null) panel = new Panel(this); return panel; }

    // ================================================================ estilo compartido con el launcher
    boolean hayLauncher() {
        try { getPackageManager().getPackageInfo(LAUNCHER, 0); return true; } catch (Exception e) { return false; }
    }

    /** Copia del launcher el estilo del panel (temas, botones, foto…). Si no hay launcher, se queda con lo propio. */
    void sincronizar() {
        if (!hayLauncher()) return;
        try (Cursor c = getContentResolver().query(PREFS, null, null, null, null)) {
            if (c == null) return;
            SharedPreferences.Editor e = prefs.edit();
            for (String k : prefs.getAll().keySet())
                if (k.startsWith("panel_") || k.equals("tema") || k.equals("acento") || k.equals("letra")) e.remove(k);
            long fotoV = 0;
            while (c.moveToNext()) {
                String k = c.getString(0), t = c.getString(1), v = c.getString(2);
                switch (t) {
                    case "b": e.putBoolean(k, Boolean.parseBoolean(v)); break;
                    case "l": e.putLong(k, Long.parseLong(v)); if (k.equals("panel_foto_v")) fotoV = Long.parseLong(v); break;
                    case "i": e.putInt(k, Integer.parseInt(v)); break;
                    default: e.putString(k, v);
                }
            }
            if (fotoV != 0 && fotoV != prefs.getLong("foto_copiada", 0)) {
                try (InputStream in = getContentResolver().openInputStream(FOTO);
                     OutputStream out = new FileOutputStream(new File(getFilesDir(), "panel_foto.jpg"))) {
                    byte[] b = new byte[16384]; int n; while ((n = in.read(b)) > 0) out.write(b, 0, n);
                    e.putLong("foto_copiada", fotoV);
                } catch (Exception x) { }
            }
            e.apply();
        } catch (Exception e) { /* el launcher es viejo o no dejó: se usa lo que ya había */ }
    }

    void leerConfig() {
        claro = "claro".equals(prefs.getString("tema", "oscuro"));
        letra = prefs.getString("letra", "moderna");
        try { acento = 0xFF000000 | Integer.parseInt(prefs.getString("acento", "D9B55C"), 16); } catch (Exception e) { acento = 0xFFD9B55C; }
        if (claro && acento == 0xFFF5F1E8) acento = 0xFF1A1A1A;
        if (claro && acento == 0xFFD9B55C) acento = 0xFFA8822B;
        FG = claro ? 0xFF141414 : 0xFFF5F1E8;
    }

    void cargarApps() { setApps(leerApps()); }
    List<App> leerApps() {
        List<App> l = new ArrayList<>();
        PackageManager pm = getPackageManager();
        Intent i = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER);
        for (ResolveInfo r : pm.queryIntentActivities(i, 0)) {
            App a = new App();
            a.pkg = r.activityInfo.packageName; a.cls = r.activityInfo.name;
            CharSequence t = r.loadLabel(pm); a.label = t == null ? a.pkg : t.toString();
            l.add(a);
        }
        Collections.sort(l, (x, y) -> x.label.compareToIgnoreCase(y.label));
        return l;
    }
    void setApps(List<App> l) {
        Map<String, App> m = new HashMap<>();
        for (App a : l) m.put(a.key(), a);
        apps = l; porKey = m;
    }

    // ================================================================ utilidades (iguales a las del launcher)
    int dp(float v) { return Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics())); }
    Typeface tf(boolean titulo) {
        switch (letra) {
            case "clasica": return Typeface.create(Typeface.SERIF, titulo ? Typeface.BOLD : Typeface.NORMAL);
            case "condensada": return Typeface.create("sans-serif-condensed", titulo ? Typeface.BOLD : Typeface.NORMAL);
            default: return titulo ? Typeface.create("sans-serif-black", Typeface.NORMAL) : Typeface.create("sans-serif", Typeface.NORMAL);
        }
    }
    Context vistaCtx() { return act != null ? act : this; }
    TextView texto(String s, float sp, int color, Typeface t) {
        TextView v = new TextView(vistaCtx());
        v.setText(s); v.setTextSize(sp); v.setTextColor(color); v.setTypeface(t);
        v.setIncludeFontPadding(false);
        return v;
    }
    TextView etiqueta(String s, int color) {
        TextView t = texto(s, 11, color, Typeface.create("sans-serif-medium", Typeface.BOLD));
        t.setLetterSpacing(0.2f); t.setAllCaps(true);
        return t;
    }
    static String mayus1(String s) { return s == null || s.isEmpty() ? "" : s.substring(0, 1).toUpperCase(ES) + s.substring(1); }
    void toast(String s) { Toast.makeText(this, s, Toast.LENGTH_SHORT).show(); }
    GradientDrawable caja(int color, float radio, int borde) {
        GradientDrawable g = new GradientDrawable();
        g.setColor(color); g.setCornerRadius(dp(radio));
        if (borde != 0) g.setStroke(dp(1), borde);
        return g;
    }
    static int conAlpha(int c, int a) { return (c & 0x00FFFFFF) | (a << 24); }
    LinearLayout.LayoutParams lp(int w, int h, int arriba) {
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(w, h); p.topMargin = dp(arriba); return p;
    }

    AlertDialog.Builder dialogo() {
        int tema = claro ? android.R.style.Theme_DeviceDefault_Light_Dialog_Alert : android.R.style.Theme_DeviceDefault_Dialog_Alert;
        if (act != null) return new AlertDialog.Builder(act, tema);
        // Desde el servicio no hay pantalla: el diálogo va en una ventana encima de todo
        return new AlertDialog.Builder(new ContextThemeWrapper(this, tema)) {
            @Override public AlertDialog show() {
                AlertDialog d = create();
                if (d.getWindow() != null) d.getWindow().setType(WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY);
                d.show();
                return d;
            }
        };
    }

    // ================================================================ lo que el panel le pide al "launcher"
    void cerrarCajon() { }
    void cerrarAjustes() { }
    String accionDe(String g) { return "nada"; }

    void bajarNotificaciones() {
        Servicio s = Servicio.yo;
        if (s != null) s.pausarFranja();
        if (s != null && s.performGlobalAction(AccessibilityService.GLOBAL_ACTION_NOTIFICATIONS)) return;
        try {
            @SuppressWarnings("WrongConstant") Object sb = getSystemService("statusbar");
            Class.forName("android.app.StatusBarManager").getMethod("expandNotificationsPanel").invoke(sb);
        } catch (Exception e) { }
    }
    boolean ajustesRapidos() {
        Servicio s = Servicio.yo;
        if (s == null) return false;
        s.pausarFranja(); // para que Samsung pueda bajar su panel sin que la franja estorbe
        return s.performGlobalAction(AccessibilityService.GLOBAL_ACTION_QUICK_SETTINGS);
    }
    boolean puedeApagar() { return Servicio.yo != null; }
    void pedirPermisoApagar() { abrirAccesibilidad(this); }
    void apagarPantalla() {
        Servicio s = Servicio.yo;
        if (s == null || !s.performGlobalAction(AccessibilityService.GLOBAL_ACTION_LOCK_SCREEN)) toast("Activá Meraki Panel en Accesibilidad para apagar la pantalla.");
    }
    static void abrirAccesibilidad(Context c) {
        try { c.startActivity(new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); } catch (Exception e) { }
    }

    Drawable icono(App a, int tam) {
        try { return getPackageManager().getActivityIcon(new ComponentName(a.pkg, a.cls)); }
        catch (Exception e) { return getPackageManager().getDefaultActivityIcon(); }
    }
    void lanzar(App a) {
        try {
            startActivity(new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER).setComponent(new ComponentName(a.pkg, a.cls))
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED));
        } catch (Exception e) { toast("No se pudo abrir " + a.label + "."); }
    }
    void elegirApp(String titulo, AlElegirApp cb) {
        String[] n = new String[apps.size()];
        for (int i = 0; i < n.length; i++) n[i] = apps.get(i).label;
        dialogo().setTitle(titulo).setItems(n, (d, w) -> cb.elegida(apps.get(w))).setNegativeButton("Cancelar", null).show();
    }

    void personalizarPanel() {
        if (hayLauncher()) {
            try {
                startActivity(new Intent().setClassName(LAUNCHER, LAUNCHER + ".MainActivity").putExtra("editor_panel", true).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
                return;
            } catch (Exception e) { }
        }
        startActivity(new Intent(this, Inicio.class).putExtra("editor", true).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
    }
    boolean abrirPanelExterno() { return false; } // aquí el panel ya es este
    void estiloCambiado() { if (Servicio.yo != null && Servicio.yo.host != null) Servicio.yo.host.refrescarEnFondo(); }

    /**
     * Cambiar algo sin abrir la ventanita de Android. Wi-Fi y Bluetooth se cambian directo (la app está hecha
     * en modo Android 9, que todavía lo permite). Lo demás lo toca el servicio en el panel de Samsung.
     */
    boolean alternar(String id, Runnable ventanita) {
        switch (id) {
            case "wifi": {
                final android.net.wifi.WifiManager w = (android.net.wifi.WifiManager) getApplicationContext().getSystemService(WIFI_SERVICE);
                if (w == null) return false;
                final boolean on = w.isWifiEnabled();
                boolean ok;
                try { ok = w.setWifiEnabled(!on); } catch (Throwable e) { ok = false; }
                if (!ok) return false;
                if (!on) ui.postDelayed(() -> {
                    // Si Android pidió permiso para prenderlo, el aviso queda debajo del panel: se cierra para que se vea
                    int st = w.getWifiState();
                    if (st != android.net.wifi.WifiManager.WIFI_STATE_ENABLED && st != android.net.wifi.WifiManager.WIFI_STATE_ENABLING && panel != null) panel.cerrar();
                }, 1800);
                return true;
            }
            case "bt": {
                android.bluetooth.BluetoothAdapter b = android.bluetooth.BluetoothAdapter.getDefaultAdapter();
                if (b == null) return false;
                try { return b.isEnabled() ? b.disable() : b.enable(); } catch (Throwable e) { return false; }
            }
            case "datos": case "avion": case "ubicacion": case "ahorro": case "hotspot": case "nfc": case "oscuro": case "tenue": {
                Servicio s = Servicio.yo;
                if (s == null || srv == null) { Servicio.anotar("«" + id + "»: " + (s == null ? "el servicio no está activo" : "el panel no está encima de todo") + " → ventanita"); return false; }
                return s.tocarBotonSamsung(id, ventanita);
            }
        }
        return false;
    }

    void actualizarTiles() { if (Servicio.yo != null) Servicio.yo.actualizarFranja(); }

    void startActivityForResult(Intent i, int rc) {
        if (act != null) act.startActivityForResult(i, rc); else toast("Abrí Meraki Panel para escoger la foto.");
    }

    Bitmap girarSiHaceFalta(Uri u, Bitmap bm) {
        try (InputStream in = getContentResolver().openInputStream(u)) {
            android.media.ExifInterface ex = new android.media.ExifInterface(in);
            int or = ex.getAttributeInt(android.media.ExifInterface.TAG_ORIENTATION, android.media.ExifInterface.ORIENTATION_NORMAL);
            int grados = or == android.media.ExifInterface.ORIENTATION_ROTATE_90 ? 90 : or == android.media.ExifInterface.ORIENTATION_ROTATE_180 ? 180 : or == android.media.ExifInterface.ORIENTATION_ROTATE_270 ? 270 : 0;
            if (grados == 0) return bm;
            android.graphics.Matrix m = new android.graphics.Matrix(); m.postRotate(grados);
            return Bitmap.createBitmap(bm, 0, 0, bm.getWidth(), bm.getHeight(), m, true);
        } catch (Throwable e) { return bm; }
    }
}
