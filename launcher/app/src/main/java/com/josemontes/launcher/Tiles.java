package com.josemontes.launcher;

import android.app.PendingIntent;
import android.app.admin.DevicePolicyManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.service.quicksettings.Tile;
import android.service.quicksettings.TileService;

/** Botones de Meraki para el panel de ajustes rápidos de Samsung (se agregan con el lápiz del panel). */
public class Tiles {
    static void abrir(TileService s, Intent i, int codigo) {
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            if (Build.VERSION.SDK_INT >= 34) {
                s.startActivityAndCollapse(PendingIntent.getActivity(s, codigo, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT));
            } else {
                startViejo(s, i);
            }
        } catch (Exception e) {
            try { s.startActivity(i); } catch (Exception e2) { }
        }
    }

    @SuppressWarnings("deprecation")
    static void startViejo(TileService s, Intent i) { s.startActivityAndCollapse(i); }

    static void actualizar(Context c) {
        for (Class<?> k : new Class<?>[]{App1.class, App2.class, App3.class, PanelMeraki.class, Apagar.class}) {
            try { TileService.requestListeningState(c, new ComponentName(c, k)); } catch (Exception e) { }
        }
    }

    static void pintar(TileService s, String nombre, String sub, int estado) {
        Tile t = s.getQsTile();
        if (t == null) return;
        t.setLabel(nombre);
        if (Build.VERSION.SDK_INT >= 29) t.setSubtitle(sub);
        t.setState(estado);
        t.updateTile();
    }

    public static class PanelMeraki extends TileService {
        @Override public void onStartListening() { pintar(this, "Panel Meraki", "Tus ajustes", Tile.STATE_INACTIVE); }
        @Override public void onClick() { abrir(this, new Intent(this, MainActivity.class).putExtra("panel", true), 10); }
    }

    /**
     * Apagar la pantalla con Meraki Panel (como el botón de encendido): así la huella sigue funcionando.
     * Con el permiso de administrador, Android exige el patrón al desbloquear.
     */
    static boolean apagarConMerakiPanel(Context c) {
        try {
            String s = android.provider.Settings.Secure.getString(c.getContentResolver(), android.provider.Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
            if (s == null || !s.contains("com.josemontes.panel/")) return false;
            c.sendBroadcast(new Intent("com.josemontes.panel.APAGAR").setPackage("com.josemontes.panel"));
            return true;
        } catch (Exception e) { return false; }
    }

    public static class Apagar extends TileService {
        @Override public void onStartListening() { pintar(this, "Apagar pantalla", "Meraki", Tile.STATE_INACTIVE); }
        @Override public void onClick() {
            if (apagarConMerakiPanel(this)) return;
            DevicePolicyManager dpm = (DevicePolicyManager) getSystemService(Context.DEVICE_POLICY_SERVICE);
            if (dpm != null && dpm.isAdminActive(new ComponentName(this, Admin.class))) {
                try { dpm.lockNow(); return; } catch (Exception e) { }
            }
            abrir(this, new Intent(this, MainActivity.class).putExtra("pedir_apagar", true), 11);
        }
    }

    public abstract static class App extends TileService {
        abstract int n();
        String clave() { SharedPreferences p = getSharedPreferences("meraki", MODE_PRIVATE); return p.getString("tile_app" + n(), ""); }
        ComponentName cn() { String k = clave(); int i = k.indexOf('/'); return i > 0 ? new ComponentName(k.substring(0, i), k.substring(i + 1)) : null; }
        @Override public void onStartListening() {
            ComponentName cn = cn();
            String nombre = "App " + n();
            if (cn != null) {
                try { PackageManager pm = getPackageManager(); nombre = pm.getActivityInfo(cn, 0).loadLabel(pm).toString(); } catch (Exception e) { }
                pintar(this, nombre, "Meraki", Tile.STATE_INACTIVE);
            } else pintar(this, nombre, "Escogela en el launcher", Tile.STATE_INACTIVE);
        }
        @Override public void onClick() {
            ComponentName cn = cn();
            if (cn == null) { abrir(this, new Intent(this, MainActivity.class).putExtra("ajustes_panel", true), 20 + n()); return; }
            Intent i = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER).setComponent(cn).addFlags(Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
            abrir(this, i, 20 + n());
        }
    }
    public static class App1 extends App { int n() { return 1; } }
    public static class App2 extends App { int n() { return 2; } }
    public static class App3 extends App { int n() { return 3; } }
}
