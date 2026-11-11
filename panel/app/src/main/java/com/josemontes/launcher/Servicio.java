package com.josemontes.launcher;

import android.accessibilityservice.AccessibilityService;
import android.app.KeyguardManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.graphics.PixelFormat;
import android.graphics.Rect;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.VelocityTracker;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.view.accessibility.AccessibilityWindowInfo;
import android.widget.FrameLayout;

import java.text.Normalizer;
import java.util.ArrayDeque;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Pone una franja invisible arriba de la pantalla: al deslizar hacia abajo sobre ella baja el Panel Meraki
 * (siguiendo el dedo) y el de Samsung se cierra detrás. Para Datos, Modo avión, etc., toca por Jose el botón
 * en el panel de Samsung. Sólo lee las ventanas de Samsung (com.android.systemui); nunca las de otras apps.
 */
public class Servicio extends AccessibilityService {
    static Servicio yo;
    static final String SYSTEMUI = "com.android.systemui";
    final Handler ui = new Handler(Looper.getMainLooper());
    WindowManager wm;
    View franja;
    FrameLayout raiz;
    boolean raizPuesta;
    MainActivity host;
    boolean pausada, tocando, ocupado;

    final Runnable reanudar = new Runnable() {
        @Override public void run() {
            ui.removeCallbacks(this);
            if (!pausada) return;
            if (sombraAbierta()) { ui.postDelayed(this, 1000); return; } // el de Samsung sigue abierto: esperar
            pausada = false;
            actualizarFranja();
        }
    };

    final BroadcastReceiver rx = new BroadcastReceiver() {
        @Override public void onReceive(Context c, Intent i) {
            if (Intent.ACTION_SCREEN_OFF.equals(i.getAction())) { cerrarPanel(); quitarFranja(); }
            else { actualizarFranja(); if (Intent.ACTION_USER_PRESENT.equals(i.getAction()) && host != null) host.refrescarEnFondo(); }
        }
    };

    /** Avisos del Meraki Launcher (firmado con la misma llave): abrir el panel o volver a copiar el estilo. */
    final BroadcastReceiver rxLauncher = new BroadcastReceiver() {
        @Override public void onReceive(Context c, Intent i) {
            String a = i.getAction();
            if (a == null) return;
            if (host == null) crearRaiz();
            if (a.endsWith(".ESTILO")) host.refrescarEnFondo();
            else if (a.endsWith(".ABRIR")) { host.sincronizar(); host.leerConfig(); abrirPanel(false); }
        }
    };

    SharedPreferences prefs() { return getSharedPreferences("meraki", MODE_PRIVATE); }
    int dp(float v) { return Math.round(v * getResources().getDisplayMetrics().density); }

    @Override
    protected void onServiceConnected() {
        yo = this;
        wm = (WindowManager) getSystemService(WINDOW_SERVICE);
        crearRaiz();
        IntentFilter f = new IntentFilter();
        f.addAction(Intent.ACTION_SCREEN_OFF); f.addAction(Intent.ACTION_USER_PRESENT); f.addAction(Intent.ACTION_SCREEN_ON);
        f.addAction(Intent.ACTION_CONFIGURATION_CHANGED);
        registerReceiver(rx, f);
        IntentFilter fl = new IntentFilter();
        fl.addAction("com.josemontes.panel.ABRIR"); fl.addAction("com.josemontes.panel.ESTILO");
        registerReceiver(rxLauncher, fl, "com.josemontes.launcher.permission.PANEL", null);
        actualizarFranja();
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent e) {
        if (e == null || e.getPackageName() == null) return;
        // Cuando sale algo de Samsung (su panel, la pantalla de bloqueo) la franja se aparta para no estorbar
        if (SYSTEMUI.contentEquals(e.getPackageName())) { if (!raizPuesta && !tocando && !ocupado) pausarFranja(); }
        else if (pausada) reanudar.run();
    }

    @Override public void onInterrupt() { }

    @Override
    public boolean onUnbind(Intent i) { apagar(); return super.onUnbind(i); }

    @Override
    public void onDestroy() { apagar(); super.onDestroy(); }

    void apagar() {
        try { unregisterReceiver(rx); } catch (Exception e) { }
        try { unregisterReceiver(rxLauncher); } catch (Exception e) { }
        cerrarPanel(); quitarFranja();
        ui.removeCallbacksAndMessages(null);
        if (yo == this) yo = null;
    }

    // ================================================================ franja de arriba
    void pausarFranja() {
        pausada = true; quitarFranja();
        ui.removeCallbacks(reanudar); ui.postDelayed(reanudar, 1500);
    }

    void quitarFranja() {
        if (franja != null) { try { wm.removeView(franja); } catch (Exception e) { } franja = null; }
    }

    /** ¿Está abierto el panel de Samsung (o la pantalla de bloqueo)? */
    boolean sombraAbierta() {
        try {
            int alto = getResources().getDisplayMetrics().heightPixels;
            Rect r = new Rect();
            for (AccessibilityWindowInfo w : getWindows()) {
                if (w.getType() != AccessibilityWindowInfo.TYPE_SYSTEM) continue;
                w.getBoundsInScreen(r);
                if (r.height() < alto / 2) continue;
                AccessibilityNodeInfo n = w.getRoot();
                if (n != null && n.getPackageName() != null && SYSTEMUI.contentEquals(n.getPackageName())) return true;
            }
        } catch (Exception e) { }
        return false;
    }

    void actualizarFranja() {
        quitarFranja();
        if (wm == null || pausada || raizPuesta || !prefs().getBoolean("activo", true)) return;
        KeyguardManager km = (KeyguardManager) getSystemService(KEYGUARD_SERVICE);
        if (km != null && km.isKeyguardLocked()) return;
        String zona = prefs().getString("zona", "derecha");
        int ancho = getResources().getDisplayMetrics().widthPixels;
        int sb = getResources().getIdentifier("status_bar_height", "dimen", "android");
        int alto = Math.max(sb > 0 ? getResources().getDimensionPixelSize(sb) : 0, dp(26)) + dp(4);
        WindowManager.LayoutParams lp = new WindowManager.LayoutParams(
                "toda".equals(zona) ? WindowManager.LayoutParams.MATCH_PARENT : ancho / 2, alto,
                WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT);
        lp.gravity = Gravity.TOP | ("izquierda".equals(zona) ? Gravity.LEFT : Gravity.RIGHT);
        lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        View v = new View(this);
        v.setOnTouchListener(new View.OnTouchListener() {
            float y0;
            boolean abierto;
            VelocityTracker vt;
            @Override public boolean onTouch(View x, MotionEvent e) {
                switch (e.getActionMasked()) {
                    case MotionEvent.ACTION_DOWN:
                        y0 = e.getRawY(); abierto = false; tocando = true;
                        if (vt != null) vt.recycle();
                        vt = VelocityTracker.obtain(); vt.addMovement(e);
                        break;
                    case MotionEvent.ACTION_MOVE: {
                        if (vt != null) vt.addMovement(e);
                        float dy = e.getRawY() - y0;
                        if (!abierto && dy > dp(8)) { abierto = abrirPanel(true); if (abierto) cerrarSamsung(0); }
                        if (abierto && host != null) host.panel().seguir(dy);
                        break;
                    }
                    case MotionEvent.ACTION_UP:
                    case MotionEvent.ACTION_CANCEL: {
                        tocando = false;
                        float vy = 0;
                        if (vt != null) { vt.addMovement(e); vt.computeCurrentVelocity(1000); vy = vt.getYVelocity(); vt.recycle(); vt = null; }
                        if (abierto && host != null) {
                            host.panel().soltar(e.getRawY() - y0, e.getActionMasked() == MotionEvent.ACTION_CANCEL ? 0 : vy);
                            cerrarSamsung(0); cerrarSamsung(350);
                        }
                        abierto = false;
                        break;
                    }
                }
                return true;
            }
        });
        try { wm.addView(v, lp); franja = v; } catch (Exception e) { franja = null; }
    }

    /** Cierra el panel de Samsung si se abrió detrás del nuestro. */
    void cerrarSamsung(long espera) {
        if (Build.VERSION.SDK_INT < 31) return;
        ui.postDelayed(() -> performGlobalAction(GLOBAL_ACTION_DISMISS_NOTIFICATION_SHADE), espera);
    }

    // ================================================================ el panel encima de todo
    void crearRaiz() {
        raiz = new FrameLayout(this) {
            @Override public boolean dispatchKeyEvent(KeyEvent k) {
                if (k.getKeyCode() == KeyEvent.KEYCODE_BACK) {
                    if (k.getAction() == KeyEvent.ACTION_UP && host != null) host.panel().cerrar();
                    return true;
                }
                return super.dispatchKeyEvent(k);
            }
        };
        raiz.setOnHierarchyChangeListener(new ViewGroup.OnHierarchyChangeListener() {
            @Override public void onChildViewAdded(View p, View c) { }
            @Override public void onChildViewRemoved(View p, View c) { if (raiz.getChildCount() == 0) ui.post(Servicio.this::quitarRaiz); }
        });
        host = new MainActivity(this, null, this, raiz);
    }

    boolean abrirPanel(boolean siguiendo) {
        if (wm == null) return false;
        if (host == null) crearRaiz();
        if (host.panel().abierto()) return false;
        if (!raizPuesta) {
            WindowManager.LayoutParams lp = new WindowManager.LayoutParams(
                    WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.MATCH_PARENT,
                    WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
                    WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS | WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
                    PixelFormat.TRANSLUCENT);
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            try { wm.addView(raiz, lp); raizPuesta = true; } catch (Exception e) { return false; }
        }
        if (siguiendo) host.panel().abrirSiguiendo(); else host.panel().abrir();
        return true;
    }

    void quitarRaiz() {
        if (!raizPuesta || raiz.getChildCount() > 0) return;
        try { wm.removeView(raiz); } catch (Exception e) { }
        raizPuesta = false;
        actualizarFranja();
        if (host != null) host.refrescarEnFondo(); // listo y al día para la próxima vez
    }

    void cerrarPanel() {
        if (host != null && host.panel != null) host.panel.cerrar();
        if (raiz != null) raiz.removeAllViews();
        quitarRaiz();
    }

    // ================================================================ tocar botones del panel de Samsung
    static final Map<String, String[]> NOMBRES = new HashMap<>();
    static {
        NOMBRES.put("datos", new String[]{"mobile data", "datos moviles", "datos del movil", "datos de celular"});
        NOMBRES.put("avion", new String[]{"airplane mode", "flight mode", "aeroplane mode", "modo avion", "modo de vuelo", "modo vuelo"});
        NOMBRES.put("ubicacion", new String[]{"location", "ubicacion"});
        NOMBRES.put("ahorro", new String[]{"power saving", "battery saver", "ahorro de energia", "ahorro de bateria"});
        NOMBRES.put("hotspot", new String[]{"mobile hotspot", "hotspot", "zona wi-fi", "zona wifi", "zona portatil", "punto de acceso"});
        NOMBRES.put("nfc", new String[]{"nfc"});
        NOMBRES.put("oscuro", new String[]{"dark mode", "dark theme", "modo oscuro", "tema oscuro"});
        NOMBRES.put("tenue", new String[]{"extra dim", "extra tenue", "atenuacion extra", "atenuacion adicional", "reduce bright colors", "reducir colores brillantes", "reducir brillo extra"});
    }
    static final String[] CONFIRMAR = {"turn off", "turn on", "apagar", "desactivar", "activar", "encender", "ok", "aceptar"};

    static String limpio(CharSequence c) {
        if (c == null) return "";
        String s = Normalizer.normalize(c.toString(), Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return s.toLowerCase(Locale.ROOT).replace(' ', ' ').trim().replaceAll("\\s+", " ");
    }

    /** 3 = es exactamente ese nombre; 2 = empieza con ese nombre («Mobile data, On»); 0 = no. */
    static int puntos(AccessibilityNodeInfo n, String[] nombres) {
        int mejor = 0;
        for (CharSequence c : new CharSequence[]{n.getContentDescription(), n.getText()}) {
            String t = limpio(c);
            if (t.isEmpty()) continue;
            for (String x : nombres) {
                if (t.equals(x)) return 3;
                if (t.startsWith(x + ",") || t.startsWith(x + " ") || t.startsWith(x + ".")) mejor = Math.max(mejor, 2);
            }
        }
        return mejor;
    }

    /** Recorre sólo las ventanas de Samsung (systemui). */
    interface Visita { boolean ver(AccessibilityNodeInfo n); }
    void recorrerSamsung(Visita v) {
        List<AccessibilityWindowInfo> ws;
        try { ws = getWindows(); } catch (Exception e) { return; }
        for (AccessibilityWindowInfo w : ws) {
            AccessibilityNodeInfo r = w.getRoot();
            if (r == null || r.getPackageName() == null || !SYSTEMUI.contentEquals(r.getPackageName())) continue;
            ArrayDeque<AccessibilityNodeInfo> q = new ArrayDeque<>();
            q.add(r);
            int vistos = 0;
            while (!q.isEmpty() && vistos++ < 3000) {
                AccessibilityNodeInfo n = q.poll();
                if (v.ver(n)) return;
                for (int i = 0; i < n.getChildCount(); i++) { AccessibilityNodeInfo c = n.getChild(i); if (c != null) q.add(c); }
            }
        }
    }

    AccessibilityNodeInfo buscar(final String[] nombres) {
        final AccessibilityNodeInfo[] mejor = {null};
        final int[] pts = {1};
        recorrerSamsung(n -> {
            int p = puntos(n, nombres);
            if (p > pts[0]) { pts[0] = p; mejor[0] = n; }
            return p == 3;
        });
        return mejor[0];
    }

    AccessibilityNodeInfo buscarBoton(final String[] textos) {
        final AccessibilityNodeInfo[] r = {null};
        recorrerSamsung(n -> {
            CharSequence cls = n.getClassName();
            if (cls == null || !cls.toString().endsWith("Button")) return false;
            String t = limpio(n.getText());
            for (String x : textos) if (t.equals(x)) { r[0] = n; return true; }
            return false;
        });
        return r[0];
    }

    void pasarPagina() {
        recorrerSamsung(n -> {
            CharSequence cls = n.getClassName();
            if (n.isScrollable() && cls != null && cls.toString().contains("Pager")) { n.performAction(AccessibilityNodeInfo.ACTION_SCROLL_FORWARD); return true; }
            return false;
        });
    }

    static boolean clic(AccessibilityNodeInfo n) {
        AccessibilityNodeInfo x = n;
        for (int i = 0; i < 6 && x != null; i++) {
            if (x.isClickable() && x.isEnabled() && x.performAction(AccessibilityNodeInfo.ACTION_CLICK)) return true;
            x = x.getParent();
        }
        return false;
    }

    Boolean estadoDe(String id) {
        try { return host != null ? host.panel().estado(id) : null; } catch (Exception e) { return null; }
    }

    /**
     * Abre el panel de Samsung debajo del nuestro, toca el botón y lo vuelve a cerrar. Si no lo encuentra,
     * cierra el de Samsung y abre la ventanita de Android como antes.
     */
    boolean tocarBotonSamsung(final String id, final Runnable ventanita) {
        final String[] nombres = NOMBRES.get(id);
        if (nombres == null || Build.VERSION.SDK_INT < 31) return false;
        if (ocupado) { if (host != null) host.toast("Un momentito…"); return true; }
        ocupado = true;
        final Boolean antes = estadoDe(id);
        performGlobalAction(GLOBAL_ACTION_QUICK_SETTINGS);
        final long t0 = SystemClock.uptimeMillis();
        ui.postDelayed(new Runnable() {
            boolean paso;
            @Override public void run() {
                AccessibilityNodeInfo n = buscar(nombres);
                if (n != null && clic(n)) { final long t1 = SystemClock.uptimeMillis(); ui.postDelayed(() -> verificar(id, antes, t1), 300); return; }
                long t = SystemClock.uptimeMillis() - t0;
                if (!paso && t > 800) { paso = true; pasarPagina(); }
                if (t < 2400) { ui.postDelayed(this, 130); return; }
                terminar(true);
                ui.postDelayed(ventanita, 250);
            }
        }, 220);
        return true;
    }

    void verificar(final String id, final Boolean antes, final long t1) {
        AccessibilityNodeInfo b = buscarBoton(CONFIRMAR); // algunos Samsung preguntan antes de apagar los datos
        if (b != null) clic(b);
        Boolean ahora = estadoDe(id);
        if (antes == null || ahora == null || !antes.equals(ahora)) { terminar(true); return; }
        if (SystemClock.uptimeMillis() - t1 < 2600) { ui.postDelayed(() -> verificar(id, antes, t1), 160); return; }
        // No cambió: puede que Samsung esté pidiendo algo. Se quita el Panel Meraki para que lo veás.
        terminar(false);
        if (host != null && host.panel != null) host.panel.cerrar();
    }

    void terminar(boolean cerrarElDeSamsung) {
        if (cerrarElDeSamsung) performGlobalAction(GLOBAL_ACTION_DISMISS_NOTIFICATION_SHADE);
        ocupado = false;
        if (host != null && host.panel != null) { host.panel.refrescar(); ui.postDelayed(() -> { if (host != null && host.panel != null) host.panel.refrescar(); }, 700); }
    }
}
