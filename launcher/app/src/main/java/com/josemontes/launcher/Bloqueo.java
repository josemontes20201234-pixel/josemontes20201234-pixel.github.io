package com.josemontes.launcher;

import android.accessibilityservice.AccessibilityService;
import android.os.Build;
import android.view.accessibility.AccessibilityEvent;

/** Sólo sirve para apagar la pantalla con un gesto (doble toque). No lee nada de la pantalla. */
public class Bloqueo extends AccessibilityService {
    static Bloqueo activo;
    @Override protected void onServiceConnected() { activo = this; }
    @Override public boolean onUnbind(android.content.Intent i) { activo = null; return super.onUnbind(i); }
    @Override public void onAccessibilityEvent(AccessibilityEvent e) { }
    @Override public void onInterrupt() { }
    static boolean apagar() {
        if (activo == null || Build.VERSION.SDK_INT < 28) return false;
        return activo.performGlobalAction(GLOBAL_ACTION_LOCK_SCREEN);
    }
}
