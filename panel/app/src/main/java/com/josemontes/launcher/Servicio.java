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

    // ===== registro de lo que hace (se ve en la app, para encontrar fallas sin adivinar)
    static final java.util.LinkedList<String> REGISTRO = new java.util.LinkedList<>();
    static void anotar(String t) {
        String h = new java.text.SimpleDateFormat("HH:mm:ss", Locale.ROOT).format(new java.util.Date());
        synchronized (REGISTRO) { REGISTRO.add(h + "  " + t); while (REGISTRO.size() > 60) REGISTRO.removeFirst(); }
    }
    static String registro() { synchronized (REGISTRO) { return android.text.TextUtils.join("\n", REGISTRO); } }
    final Handler ui = new Handler(Looper.getMainLooper());
    WindowManager wm;
    View franja;
    FrameLayout raiz;
    boolean raizPuesta;
    WindowManager.LayoutParams lpRaiz;
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
            try { wm.addView(raiz, lp); raizPuesta = true; lpRaiz = lp; } catch (Exception e) { return false; }
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

    /** 3 = es exactamente ese nombre; 2 = empieza con ese nombre («Mobile data, On»); 1 = lo contiene (botón chico); 0 = no. */
    int puntos(AccessibilityNodeInfo n, String[] nombres) {
        int mejor = 0;
        CharSequence[] textos = Build.VERSION.SDK_INT >= 30
                ? new CharSequence[]{n.getContentDescription(), n.getText(), n.getStateDescription()}
                : new CharSequence[]{n.getContentDescription(), n.getText()};
        for (CharSequence c : textos) {
            String t = limpio(c);
            if (t.isEmpty()) continue;
            for (String x : nombres) {
                if (t.equals(x)) return 3;
                if (t.startsWith(x + ",") || t.startsWith(x + " ") || t.startsWith(x + ".") || t.startsWith(x + ":")) mejor = Math.max(mejor, 2);
                else if (t.contains(x) && esChico(n)) mejor = Math.max(mejor, 1);
            }
        }
        return mejor;
    }
    final Rect cuadro = new Rect();
    boolean esChico(AccessibilityNodeInfo n) {
        n.getBoundsInScreen(cuadro);
        return cuadro.width() > 0 && cuadro.width() < getResources().getDisplayMetrics().widthPixels * 0.6f;
    }
    static String etiqueta(AccessibilityNodeInfo n) {
        CharSequence c = n.getContentDescription();
        if (c == null || c.length() == 0) c = n.getText();
        return c == null ? "" : c.toString().replace('\n', ' ');
    }
    /** Nombres de los botones que se ven en el panel de Samsung (para revisar). */
    List<String> etiquetasSamsung(final int max) {
        final java.util.LinkedHashSet<String> l = new java.util.LinkedHashSet<>();
        recorrerSamsung(n -> {
            if (n.isClickable()) {
                String t = etiqueta(n).trim();
                if (t.isEmpty()) for (int i = 0; i < n.getChildCount() && t.isEmpty(); i++) { AccessibilityNodeInfo c = n.getChild(i); if (c != null) t = etiqueta(c).trim(); }
                if (!t.isEmpty()) l.add(t.length() > 40 ? t.substring(0, 40) + "…" : t);
            }
            return l.size() >= max;
        });
        return new java.util.ArrayList<>(l);
    }
    String resumenVentanas() {
        int total = 0, samsung = 0;
        try {
            for (AccessibilityWindowInfo w : getWindows()) {
                total++;
                AccessibilityNodeInfo r = w.getRoot();
                if (r != null && r.getPackageName() != null && SYSTEMUI.contentEquals(r.getPackageName())) samsung++;
            }
        } catch (Exception e) { return "no pude ver las ventanas: " + e.getClass().getSimpleName(); }
        return "ventanas: " + total + ", de Samsung: " + samsung;
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
        final int[] pts = {0};
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

    boolean pasarPagina() {
        final boolean[] ok = {false};
        // primero un paginador (las páginas de botones); si no hay, cualquier cosa de Samsung que se pueda mover
        recorrerSamsung(n -> {
            CharSequence cls = n.getClassName();
            if (n.isScrollable() && cls != null && cls.toString().contains("Pager")) { ok[0] = n.performAction(AccessibilityNodeInfo.ACTION_SCROLL_FORWARD); return ok[0]; }
            return false;
        });
        if (!ok[0]) recorrerSamsung(n -> { if (n.isScrollable() && esChico(n) == false) { ok[0] = n.performAction(AccessibilityNodeInfo.ACTION_SCROLL_FORWARD); return ok[0]; } return false; });
        return ok[0];
    }

    static final String[] EXPANDIR = {"expand", "expandir", "ampliar", "mostrar todo", "mostrar mas", "ver todo"};
    /** Botones que casi siempre están en la cuadrícula: sirven para saber dónde deslizar para pasar de página. */
    static final String[] CUADRICULA = {"flashlight", "linterna", "airplane mode", "modo avion", "mobile data", "datos moviles", "location", "ubicacion", "power saving", "ahorro de energia"};

    /** Desliza la cuadrícula de botones de Samsung hacia la izquierda, como con el dedo, para ver la página siguiente. */
    boolean deslizarCuadricula() {
        AccessibilityNodeInfo ref = buscar(CUADRICULA);
        if (ref == null) return false;
        Rect r = new Rect(); ref.getBoundsInScreen(r);
        int ancho = getResources().getDisplayMetrics().widthPixels;
        android.graphics.Path camino = new android.graphics.Path();
        camino.moveTo(ancho * 0.85f, r.centerY());
        camino.lineTo(ancho * 0.15f, r.centerY());
        return gesto(camino, 280);
    }

    /** Mientras el «dedo» de Meraki Panel toca el panel de Samsung, el Panel Meraki deja pasar los toques. */
    void atravesar(boolean si) {
        if (!raizPuesta || lpRaiz == null) return;
        int f = si ? lpRaiz.flags | WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE : lpRaiz.flags & ~WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE;
        if (f == lpRaiz.flags) return;
        lpRaiz.flags = f;
        try { wm.updateViewLayout(raiz, lpRaiz); } catch (Exception e) { }
    }
    final Runnable devolverToques = () -> atravesar(false);

    boolean gesto(final android.graphics.Path camino, final long ms) {
        atravesar(true);
        ui.removeCallbacks(devolverToques);
        ui.postDelayed(() -> {
            boolean ok;
            try {
                ok = dispatchGesture(new android.accessibilityservice.GestureDescription.Builder()
                        .addStroke(new android.accessibilityservice.GestureDescription.StrokeDescription(camino, 0, ms)).build(),
                        new GestureResultCallback() {
                            @Override public void onCompleted(android.accessibilityservice.GestureDescription g) { ui.postDelayed(devolverToques, 150); }
                            @Override public void onCancelled(android.accessibilityservice.GestureDescription g) { ui.postDelayed(devolverToques, 150); }
                        }, null);
            } catch (Exception e) { ok = false; }
            if (!ok) atravesar(false);
        }, 90);
        ui.postDelayed(devolverToques, ms + 900); // por si acaso, nunca se queda sin poder tocarse
        return true;
    }

    /** Tocar un botón de Samsung: primero «por dentro»; si no se deja, moverlo a la vista y tocarlo con el dedo. */
    String comoToque = "";
    boolean tocarNodo(AccessibilityNodeInfo n) {
        if (clic(n)) { comoToque = "por dentro"; return true; }
        AccessibilityNodeInfo c = clicable(n);
        AccessibilityNodeInfo blanco = c != null ? c : n;
        Rect r = new Rect(); blanco.getBoundsInScreen(r);
        android.util.DisplayMetrics dm = getResources().getDisplayMetrics();
        boolean enPantalla = blanco.isVisibleToUser() && r.width() > 0 && r.height() > 0 && r.top >= 0 && r.bottom <= dm.heightPixels && r.left >= 0 && r.right <= dm.widthPixels;
        if (!enPantalla) {
            boolean movio = blanco.performAction(AccessibilityNodeInfo.AccessibilityAction.ACTION_SHOW_ON_SCREEN.getId()) || n.performAction(AccessibilityNodeInfo.AccessibilityAction.ACTION_SHOW_ON_SCREEN.getId());
            comoToque = movio ? "lo moví para que se vea" : "no está a la vista (" + r.toShortString() + ")";
            return false;
        }
        android.graphics.Path p = new android.graphics.Path();
        p.moveTo(r.centerX(), r.centerY());
        p.lineTo(r.centerX() + 1, r.centerY() + 1);
        gesto(p, 60);
        comoToque = "con el dedo en " + r.centerX() + "," + r.centerY();
        return true;
    }

    /** El botón que de verdad se toca (el mismo o uno de sus «papás»). */
    static AccessibilityNodeInfo clicable(AccessibilityNodeInfo n) {
        AccessibilityNodeInfo x = n;
        for (int i = 0; i < 6 && x != null; i++) { if (x.isClickable()) return x; x = x.getParent(); }
        return null;
    }

    /** Lee si un botón de Samsung está encendido (marcado, o dice On/Off). */
    static Boolean estadoDeNodo(AccessibilityNodeInfo n) {
        if (n == null) return null;
        if (n.isCheckable()) return n.isChecked();
        String t = limpio(Build.VERSION.SDK_INT >= 30 && n.getStateDescription() != null ? n.getStateDescription() : n.getContentDescription());
        if (t.endsWith(" on") || t.endsWith(",on") || t.equals("on") || t.contains("encendido") || t.contains("activado") && !t.contains("desactivado")) return true;
        if (t.endsWith(" off") || t.endsWith(",off") || t.equals("off") || t.contains("apagado") || t.contains("desactivado")) return false;
        return null;
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
        anotar("Tocar «" + id + "»");
        if (nombres == null || Build.VERSION.SDK_INT < 31) { anotar("  este Android no lo permite"); return false; }
        if (ocupado) { anotar("  ya estaba ocupado con otro"); if (host != null) host.toast("Un momentito…"); return true; }
        ocupado = true;
        final Boolean antes = estadoDe(id);
        boolean abrio = performGlobalAction(GLOBAL_ACTION_QUICK_SETTINGS);
        anotar("  abrir el panel de Samsung: " + (abrio ? "sí" : "NO") + " · estaba " + (antes == null ? "?" : antes ? "encendido" : "apagado"));
        final long t0 = SystemClock.uptimeMillis();
        ui.postDelayed(new Runnable() {
            int paginas; long otraPagina = 1000; boolean primera = true, expandido, avisado, visto; String ultimo = "";
            @Override public void run() {
                if (primera) { primera = false; anotar("  " + resumenVentanas()); }
                AccessibilityNodeInfo n = buscar(nombres);
                long t = SystemClock.uptimeMillis() - t0;
                if (n != null) {
                    AccessibilityNodeInfo c = clicable(n);
                    final Boolean st = estadoDeNodo(c != null ? c : n);
                    if (!visto) { visto = true; anotar("  encontrado: «" + etiqueta(n) + "»" + (st == null ? "" : st ? " (encendido)" : " (apagado)")); }
                    if (tocarNodo(n)) {
                        anotar("  lo toqué " + comoToque);
                        if (st != null) recordar(id, !st);
                        final long t1 = SystemClock.uptimeMillis(); ui.postDelayed(() -> verificar(id, antes, t1, nombres, st), 450); return;
                    }
                    if (!comoToque.equals(ultimo)) { ultimo = comoToque; anotar("  todavía no: " + comoToque); }
                    if (t < 5000) { ui.postDelayed(this, 220); return; }
                }
                if (!expandido && t > 300) {
                    expandido = true;
                    AccessibilityNodeInfo e = buscar(EXPANDIR);
                    if (e != null && clic(e)) { anotar("  toqué «" + etiqueta(e) + "» para ver todos los botones"); ui.postDelayed(this, 450); return; }
                }
                if (t > otraPagina && paginas < 5) {
                    if (pasarPagina()) { paginas++; anotar("  pasé a la página " + (paginas + 1)); }
                    else if (deslizarCuadricula()) { paginas++; anotar("  deslicé a la página " + (paginas + 1)); }
                    otraPagina = t + 550;
                }
                if (t > 1000 && !avisado) { avisado = true; if (host != null) host.toast("Buscando el botón en el panel de Samsung…"); }
                if (t < 5000) { ui.postDelayed(this, 140); return; }
                anotar("  NO lo encontré. " + resumenVentanas());
                anotar("  botones que vi: " + android.text.TextUtils.join(" | ", etiquetasSamsung(30)));
                terminar(true);
                ui.postDelayed(ventanita, 250);
            }
        }, 250);
        return true;
    }

    /** Para revisar: abre el panel de Samsung, anota cómo se llaman sus botones (todas las páginas) y lo cierra. */
    void revisarBotones(final Runnable listo) {
        if (Build.VERSION.SDK_INT < 31 || ocupado) { anotar("Revisar: ahora no se puede"); listo.run(); return; }
        ocupado = true;
        anotar("Revisar botones de Samsung");
        performGlobalAction(GLOBAL_ACTION_QUICK_SETTINGS);
        ui.postDelayed(new Runnable() {
            int paso = 1;
            @Override public void run() {
                if (paso == 1) anotar("  " + resumenVentanas());
                anotar("  vista " + paso + ": " + android.text.TextUtils.join(" | ", etiquetasSamsung(45)));
                paso++;
                if (paso == 2) {
                    AccessibilityNodeInfo e = buscar(EXPANDIR);
                    if (e != null && clic(e)) { anotar("  toqué «" + etiqueta(e) + "»"); ui.postDelayed(this, 700); return; }
                    paso++;
                }
                if (paso <= 5) {
                    if (pasarPagina()) { anotar("  pasé de página"); ui.postDelayed(this, 650); return; }
                    if (deslizarCuadricula()) { anotar("  deslicé la página"); ui.postDelayed(this, 750); return; }
                }
                performGlobalAction(GLOBAL_ACTION_DISMISS_NOTIFICATION_SHADE);
                ocupado = false;
                ui.postDelayed(listo, 400);
            }
        }, 800);
    }

    /** Lo último que se supo de un botón (para pintarlo encendido o apagado aunque Android no deje leerlo). */
    void recordar(String id, boolean on) { if (host != null) host.prefs.edit().putBoolean("conocido_" + id, on).apply(); }

    void verificar(final String id, final Boolean antes, final long t1, final String[] nombres, final Boolean antesBoton) {
        AccessibilityNodeInfo b = buscarBoton(CONFIRMAR); // algunos Samsung preguntan antes de apagar los datos
        if (b != null) clic(b);
        if (b != null) anotar("  confirmé «" + limpio(b.getText()) + "»");
        Boolean ahora = estadoDe(id);
        Boolean ahoraBoton = null;
        if ((antes == null || ahora == null) && antesBoton != null) {
            AccessibilityNodeInfo n = buscar(nombres);
            if (n != null) { AccessibilityNodeInfo c = clicable(n); ahoraBoton = estadoDeNodo(c != null ? c : n); }
        }
        boolean cambio;
        if (antes != null && ahora != null) cambio = !antes.equals(ahora);
        else if (antesBoton != null && ahoraBoton != null) cambio = !antesBoton.equals(ahoraBoton);
        else cambio = true; // no hay cómo saberlo: se da por hecho
        if (cambio) {
            Boolean fin = ahora != null ? ahora : ahoraBoton;
            if (fin != null) recordar(id, fin);
            anotar("  listo: ahora está " + (fin == null ? "?" : fin ? "encendido" : "apagado"));
            terminar(true); return;
        }
        if (SystemClock.uptimeMillis() - t1 < 2600) { ui.postDelayed(() -> verificar(id, antes, t1, nombres, antesBoton), 160); return; }
        // No cambió: puede que Samsung esté pidiendo algo. Se quita el Panel Meraki para que lo veás.
        anotar("  lo toqué pero no cambió; dejo el de Samsung a la vista");
        terminar(false);
        if (host != null && host.panel != null) host.panel.cerrar();
    }

    void terminar(boolean cerrarElDeSamsung) {
        if (cerrarElDeSamsung) performGlobalAction(GLOBAL_ACTION_DISMISS_NOTIFICATION_SHADE);
        ocupado = false;
        if (host != null && host.panel != null) { host.panel.refrescar(); ui.postDelayed(() -> { if (host != null && host.panel != null) host.panel.refrescar(); }, 700); }
    }
}
