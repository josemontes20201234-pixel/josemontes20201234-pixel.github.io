package com.josemontes.launcher;

import android.accessibilityservice.AccessibilityService;
import android.app.KeyguardManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.view.accessibility.AccessibilityEvent;
import android.widget.FrameLayout;

/**
 * Pone una franja invisible arriba de la pantalla. Al deslizar hacia abajo sobre ella sale el Panel Meraki
 * en vez del panel de Samsung. No lee nada de lo que hay en la pantalla.
 */
public class Servicio extends AccessibilityService {
    static Servicio yo;
    final Handler ui = new Handler(Looper.getMainLooper());
    WindowManager wm;
    View franja;
    FrameLayout raiz;
    MainActivity host;
    boolean pausada;
    final Runnable reanudar = () -> { pausada = false; actualizarFranja(); };

    final BroadcastReceiver rx = new BroadcastReceiver() {
        @Override public void onReceive(Context c, Intent i) {
            if (Intent.ACTION_SCREEN_OFF.equals(i.getAction())) { cerrarPanel(); quitarFranja(); }
            else actualizarFranja();
        }
    };

    SharedPreferences prefs() { return getSharedPreferences("meraki", MODE_PRIVATE); }
    int dp(float v) { return Math.round(v * getResources().getDisplayMetrics().density); }

    @Override
    protected void onServiceConnected() {
        yo = this;
        wm = (WindowManager) getSystemService(WINDOW_SERVICE);
        IntentFilter f = new IntentFilter();
        f.addAction(Intent.ACTION_SCREEN_OFF); f.addAction(Intent.ACTION_USER_PRESENT); f.addAction(Intent.ACTION_SCREEN_ON);
        f.addAction(Intent.ACTION_CONFIGURATION_CHANGED);
        registerReceiver(rx, f);
        actualizarFranja();
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent e) {
        if (e == null || e.getPackageName() == null) return;
        // Cuando sale algo de Samsung (su panel, la pantalla de bloqueo) la franja se aparta para no estorbar
        if ("com.android.systemui".contentEquals(e.getPackageName())) { if (raiz == null) pausarFranja(); }
        else if (pausada) { ui.removeCallbacks(reanudar); reanudar.run(); }
    }

    @Override public void onInterrupt() { }

    @Override
    public boolean onUnbind(Intent i) { apagar(); return super.onUnbind(i); }

    @Override
    public void onDestroy() { apagar(); super.onDestroy(); }

    void apagar() {
        try { unregisterReceiver(rx); } catch (Exception e) { }
        cerrarPanel(); quitarFranja();
        if (yo == this) yo = null;
    }

    // ================================================================ franja de arriba
    void pausarFranja() {
        pausada = true; quitarFranja();
        ui.removeCallbacks(reanudar); ui.postDelayed(reanudar, 6000);
    }

    void quitarFranja() {
        if (franja != null) { try { wm.removeView(franja); } catch (Exception e) { } franja = null; }
    }

    void actualizarFranja() {
        quitarFranja();
        if (wm == null || pausada || raiz != null || !prefs().getBoolean("activo", true)) return;
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
        final float[] y0 = {0};
        final boolean[] listo = {false};
        v.setOnTouchListener((x, e) -> {
            switch (e.getActionMasked()) {
                case MotionEvent.ACTION_DOWN: y0[0] = e.getRawY(); listo[0] = false; break;
                case MotionEvent.ACTION_MOVE:
                    if (!listo[0] && e.getRawY() - y0[0] > dp(14)) { listo[0] = true; abrirPanel(); }
                    break;
            }
            return true;
        });
        try { wm.addView(v, lp); franja = v; } catch (Exception e) { franja = null; }
    }

    // ================================================================ el panel encima de todo
    void abrirPanel() {
        if (raiz != null) return;
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
            @Override public void onChildViewRemoved(View p, View c) { if (raiz != null && raiz.getChildCount() == 0) ui.post(Servicio.this::quitarRaiz); }
        });
        host = new MainActivity(this, null, this, raiz);
        WindowManager.LayoutParams lp = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS | WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
                PixelFormat.TRANSLUCENT);
        lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        try { wm.addView(raiz, lp); } catch (Exception e) { raiz = null; host = null; return; }
        quitarFranja();
        host.panel().abrir();
    }

    void quitarRaiz() {
        if (raiz == null || raiz.getChildCount() > 0) return;
        try { wm.removeView(raiz); } catch (Exception e) { }
        raiz = null; host = null;
        actualizarFranja();
    }

    void cerrarPanel() {
        if (raiz == null) return;
        FrameLayout r = raiz;
        raiz = null;
        if (host != null && host.panel != null) host.panel.cerrar();
        try { wm.removeView(r); } catch (Exception e) { }
        host = null;
    }
}
