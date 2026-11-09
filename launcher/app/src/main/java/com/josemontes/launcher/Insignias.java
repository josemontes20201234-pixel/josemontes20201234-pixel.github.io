package com.josemontes.launcher;

import android.app.Notification;
import android.os.Handler;
import android.os.Looper;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

import java.util.HashMap;
import java.util.Map;

/** Cuenta las notificaciones de cada app para mostrar puntitos en los íconos. */
public class Insignias extends NotificationListenerService {
    static final Map<String, Integer> conteo = new HashMap<>();
    static Runnable alCambiar;
    static boolean conectado = false;
    final Handler ui = new Handler(Looper.getMainLooper());

    @Override public void onListenerConnected() { conectado = true; recontar(); }
    @Override public void onListenerDisconnected() { conectado = false; synchronized (conteo) { conteo.clear(); } avisar(); }
    @Override public void onNotificationPosted(StatusBarNotification sbn) { recontar(); }
    @Override public void onNotificationRemoved(StatusBarNotification sbn) { recontar(); }

    void recontar() {
        Map<String, Integer> nuevo = new HashMap<>();
        try {
            StatusBarNotification[] act = getActiveNotifications();
            if (act != null) for (StatusBarNotification s : act) {
                if (s.isOngoing()) continue;
                Notification n = s.getNotification();
                if (n != null && (n.flags & Notification.FLAG_GROUP_SUMMARY) != 0) continue;
                Integer v = nuevo.get(s.getPackageName());
                nuevo.put(s.getPackageName(), v == null ? 1 : v + 1);
            }
        } catch (Exception e) { /* sin permiso todavía */ }
        synchronized (conteo) { conteo.clear(); conteo.putAll(nuevo); }
        avisar();
    }

    void avisar() { ui.post(() -> { if (alCambiar != null) alCambiar.run(); }); }

    static int de(String pkg) { synchronized (conteo) { Integer v = conteo.get(pkg); return v == null ? 0 : v; } }
}
