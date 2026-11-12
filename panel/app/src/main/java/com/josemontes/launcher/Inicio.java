package com.josemontes.launcher;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Switch;
import android.widget.TextView;

/** Pantalla de Meraki Panel: activarlo, escoger desde dónde se baja y personalizarlo. */
public class Inicio extends Activity {
    FrameLayout root;
    MainActivity h;
    LinearLayout l;
    static final int EF = 0xFFF5F1E8, EM = 0xFFA8A297;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        Servicio.registrarErrores(this);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        root = new FrameLayout(this);
        root.setBackground(new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, new int[]{0xFF1C1A16, 0xFF0B0A08}));
        setContentView(root);
        h = new MainActivity(this, this, null, root);
        if (getIntent() != null && getIntent().getBooleanExtra("editor", false)) h.ui.postDelayed(() -> h.panel().abrirEditor("temas"), 200);
    }

    @Override
    protected void onNewIntent(Intent i) {
        super.onNewIntent(i);
        if (i != null && i.getBooleanExtra("editor", false)) h.ui.postDelayed(() -> h.panel().abrirEditor("temas"), 150);
    }

    @Override
    protected void onResume() {
        super.onResume();
        h.sincronizar(); h.leerConfig();
        construir();
    }

    @Override
    public void onBackPressed() {
        if (h.panel != null && h.panel.editando()) { h.panel.cerrarEditor(); construir(); }
        else if (h.panel != null && h.panel.abierto()) h.panel.cerrar();
        else super.onBackPressed();
    }

    @Override
    protected void onActivityResult(int rc, int res, Intent data) {
        super.onActivityResult(rc, res, data);
        if (rc == Panel.REQ_FOTO && res == RESULT_OK && data != null && data.getData() != null) h.panel().guardarFoto(data.getData());
    }

    boolean activo() {
        if (Servicio.yo != null) return true;
        String s = Settings.Secure.getString(getContentResolver(), Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
        return s != null && s.contains(new ComponentName(this, Servicio.class).flattenToShortString().replace(".launcher.Servicio", ".launcher.Servicio"));
    }

    void construir() {
        if (h.panel != null && h.panel.editando()) return;
        View vieja = root.findViewWithTag("inicio");
        if (vieja != null) root.removeView(vieja);
        ScrollView sv = new ScrollView(this);
        sv.setTag("inicio");
        l = new LinearLayout(this);
        l.setOrientation(LinearLayout.VERTICAL);
        l.setPadding(h.dp(22), h.insetArriba + h.dp(26), h.dp(22), h.insetAbajo + h.dp(30));
        sv.addView(l);
        root.addView(sv, 0, new FrameLayout.LayoutParams(-1, -1));

        l.addView(h.etiqueta("Meraki Barbershop", h.acento));
        l.addView(h.texto("Meraki Panel", 34, EF, h.tf(true)), h.lp(-2, -2, 8));
        l.addView(h.texto("Tu panel dorado sale cuando deslizás hacia abajo desde arriba, en cualquier pantalla.", 15, EM, h.tf(false)), h.lp(-1, -2, 8));

        boolean ok = activo();
        LinearLayout c1 = tarjeta(ok ? "✓  Está funcionando" : "1.  Activalo", ok ? 0xFF3DB46D : h.acento);
        if (ok) nota(c1, "Deslizá hacia abajo desde arriba en el lado que escogiste. Si después de actualizar deja de salir, revisá que siga activado en Accesibilidad.");
        else {
            nota(c1, "Ajustes → Accesibilidad → Apps instaladas → «Meraki Panel» → activalo y aceptá.");
            c1.addView(boton("Abrir Accesibilidad", true, () -> MainActivity.abrirAccesibilidad(this)), h.lp(-1, -2, 12));
            nota(c1, "¿Sale gris o dice «Ajuste restringido»? Es porque no viene de Play Store. Tocá el botón de abajo → ⋮ arriba a la derecha → «Permitir ajustes restringidos» → tu PIN. Después volvé al botón de arriba.");
            c1.addView(boton("Abrir info de la app", false, () -> {
                try { startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getPackageName()))); } catch (Exception e) { }
            }), h.lp(-1, -2, 10));
        }

        LinearLayout c2 = tarjeta("Desde dónde se baja", h.acento);
        String z = h.prefs.getString("zona", "derecha");
        LinearLayout fila = new LinearLayout(this);
        String[][] zs = {{"izquierda", "Izquierda"}, {"derecha", "Derecha"}, {"toda", "Todo"}};
        for (String[] o : zs) {
            TextView t = chip(o[1], o[0].equals(z));
            t.setOnClickListener(v -> { h.prefs.edit().putString("zona", o[0]).apply(); h.actualizarTiles(); construir(); });
            LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(0, -2, 1f); p.rightMargin = h.dp(8);
            fila.addView(t, p);
        }
        c2.addView(fila, h.lp(-1, -2, 10));
        nota(c2, "toda".equals(z) ? "Todo lo de arriba abre el Panel Meraki. Las notificaciones están en su botón."
                : "Del lado " + ("derecha".equals(z) ? "izquierdo" : "derecho") + " siguen bajando las notificaciones de Samsung.");
        LinearLayout sw = new LinearLayout(this);
        sw.setGravity(Gravity.CENTER_VERTICAL);
        sw.addView(h.texto("Panel Meraki encendido", 15.5f, EF, h.tf(false)), new LinearLayout.LayoutParams(0, -2, 1f));
        Switch s = new Switch(this);
        s.setChecked(h.prefs.getBoolean("activo", true));
        s.setOnCheckedChangeListener((x, v) -> { h.prefs.edit().putBoolean("activo", v).apply(); h.actualizarTiles(); });
        sw.addView(s);
        c2.addView(sw, h.lp(-1, -2, 14));
        nota(c2, "Apagalo un rato si un juego o video necesita la parte de arriba.");

        LinearLayout c3 = tarjeta("Cómo se ve", h.acento);
        boolean hay = h.hayLauncher();
        nota(c3, hay ? "Se personaliza en tu Meraki Launcher (temas, fondos, formas, botones) y aquí se copia solito."
                : "Escogé tema, fondo, formas y botones viendo cómo queda.");
        c3.addView(boton("Personalizar el panel", true, () -> { if (hay) h.personalizarPanel(); else h.panel().abrirEditor("temas"); }), h.lp(-1, -2, 12));
        c3.addView(boton("Probar el panel", false, () -> {
            if (Servicio.yo != null) { moveTaskToBack(true); h.ui.postDelayed(() -> { if (Servicio.yo != null) Servicio.yo.abrirPanel(false); }, 350); }
            else h.panel().abrir();
        }), h.lp(-1, -2, 10));

        LinearLayout c4 = tarjeta("Permisos de los botones", h.acento);
        permiso(c4, "Brillo y rotación", Settings.System.canWrite(this), () -> h.panel().pedirAjustes());
        permiso(c4, "Silencio y No molestar", h.panel().permisoNoMolestar(), () -> h.panel().pedirNoMolestar());
        nota(c4, "Wi-Fi y Bluetooth se prenden directo. Datos, modo avión, ubicación, ahorro, zona Wi-Fi, NFC, modo oscuro y extra tenue: Meraki Panel toca por vos ese botón en el panel de Samsung (sólo lee ese panel). Si no lo encuentra, abre la ventanita de Android.");

        boolean mus = Oyente.tieneAcceso(this);
        LinearLayout c6 = tarjeta(mus ? "✓  Música lista" : "Música que suena", mus ? 0xFF3DB46D : h.acento);
        nota(c6, "La canción que suena (Spotify, YouTube Music…) sale con ⏮ ⏯ ⏭ en tu panel y en el inicio del launcher. Sólo mira los reproductores: no lee ni guarda tus notificaciones.");
        if (!mus) {
            c6.addView(boton("Activar acceso a notificaciones", true, this::abrirAccesoNotis), h.lp(-1, -2, 12));
            nota(c6, "Buscá «Meraki Panel» y activalo. Si sale gris o «Ajuste restringido»: botón «Abrir info de la app» de arriba → ⋮ → «Permitir ajustes restringidos».");
        } else if (Musica.actual != null) nota(c6, "Sonando ahora: " + Musica.actual.titulo + (Musica.actual.app.isEmpty() ? "" : " · " + Musica.actual.app));

        LinearLayout c5 = tarjeta("Revisar", h.acento);
        String ver = "?";
        try { ver = getPackageManager().getPackageInfo(getPackageName(), 0).versionName; } catch (Exception e) { }
        nota(c5, "Meraki Panel " + ver + " · servicio " + (Servicio.yo != null ? "activo" : "apagado") + ". Si un botón abre la ventanita en vez de cambiar, tocá «Ver los botones de Samsung» y mandale captura de esto a Claude.");
        c5.addView(boton("Ver los botones de Samsung", true, () -> {
            if (Servicio.yo == null) { h.toast("Primero activá Meraki Panel en Accesibilidad."); return; }
            Servicio.yo.revisarBotones(this::construir);
        }), h.lp(-1, -2, 12));
        final String err = h.prefs.getString("ultimo_error", "");
        if (!err.isEmpty()) {
            nota(c5, "Último error (mandale captura a Claude):");
            TextView te = h.texto(err, 11, 0xFFFF8A80, android.graphics.Typeface.MONOSPACE);
            te.setTextIsSelectable(true);
            te.setMaxLines(14);
            te.setPadding(h.dp(12), h.dp(10), h.dp(12), h.dp(10));
            te.setBackground(h.caja(0x33000000, 12, 0));
            c5.addView(te, h.lp(-1, -2, 8));
            c5.addView(boton("Borrar el error", false, () -> { h.prefs.edit().remove("ultimo_error").apply(); construir(); }), h.lp(-1, -2, 8));
        }
        String reg = Servicio.registro();
        TextView log = h.texto(reg.isEmpty() ? "Todavía no hay nada anotado. Tocá un botón en tu panel y volvé aquí." : reg, 12, EF, android.graphics.Typeface.MONOSPACE);
        log.setTextIsSelectable(true);
        log.setPadding(h.dp(12), h.dp(10), h.dp(12), h.dp(10));
        log.setBackground(h.caja(0x33000000, 12, 0));
        c5.addView(log, h.lp(-1, -2, 12));
        c5.addView(boton("Borrar lo anotado", false, () -> { synchronized (Servicio.REGISTRO) { Servicio.REGISTRO.clear(); } construir(); }), h.lp(-1, -2, 10));
    }

    void abrirAccesoNotis() {
        try {
            if (android.os.Build.VERSION.SDK_INT >= 30) {
                Intent i = new Intent("android.settings.NOTIFICATION_LISTENER_DETAIL_SETTINGS");
                i.putExtra("android.provider.extra.NOTIFICATION_LISTENER_COMPONENT_NAME", new ComponentName(this, Oyente.class).flattenToString());
                startActivity(i);
                return;
            }
        } catch (Exception e) { }
        try { startActivity(new Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS")); } catch (Exception e) { h.toast("Buscalo en Ajustes → Notificaciones → Acceso a notificaciones."); }
    }

    LinearLayout tarjeta(String titulo, int color) {
        LinearLayout c = new LinearLayout(this);
        c.setOrientation(LinearLayout.VERTICAL);
        c.setPadding(h.dp(18), h.dp(16), h.dp(18), h.dp(18));
        c.setBackground(h.caja(0x14FFFFFF, 22, 0x1FFFFFFF));
        c.addView(h.texto(titulo, 18, color, h.tf(true)));
        l.addView(c, h.lp(-1, -2, 18));
        return c;
    }
    void nota(LinearLayout c, String t) { c.addView(h.texto(t, 14, EM, h.tf(false)), h.lp(-1, -2, 8)); }
    TextView chip(String t, boolean sel) {
        TextView v = h.texto(t, 14, sel ? 0xFF141414 : EF, h.tf(sel));
        v.setGravity(Gravity.CENTER);
        v.setPadding(h.dp(8), h.dp(11), h.dp(8), h.dp(11));
        v.setBackground(h.caja(sel ? h.acento : 0x1FFFFFFF, 99, sel ? 0 : 0x22FFFFFF));
        return v;
    }
    TextView boton(String t, boolean fuerte, Runnable r) {
        TextView v = h.texto(t, 15, fuerte ? 0xFF141414 : EF, h.tf(true));
        v.setGravity(Gravity.CENTER);
        v.setPadding(h.dp(14), h.dp(13), h.dp(14), h.dp(13));
        v.setBackground(h.caja(fuerte ? h.acento : 0x1FFFFFFF, 99, fuerte ? 0 : 0x33FFFFFF));
        v.setOnClickListener(x -> r.run());
        return v;
    }
    void permiso(LinearLayout c, String que, boolean ok, Runnable pedir) {
        LinearLayout f = new LinearLayout(this);
        f.setGravity(Gravity.CENTER_VERTICAL);
        f.addView(h.texto(que, 15, EF, h.tf(false)), new LinearLayout.LayoutParams(0, -2, 1f));
        TextView b = h.texto(ok ? "✓ Listo" : "Activar", 13.5f, ok ? 0xFF3DB46D : 0xFF141414, h.tf(true));
        b.setPadding(h.dp(14), h.dp(8), h.dp(14), h.dp(8));
        if (!ok) { b.setBackground(h.caja(h.acento, 99, 0)); b.setOnClickListener(v -> pedir.run()); }
        f.addView(b);
        c.addView(f, h.lp(-1, -2, 12));
    }
}
