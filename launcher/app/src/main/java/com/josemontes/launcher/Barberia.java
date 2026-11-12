package com.josemontes.launcher;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.media.AudioManager;
import android.net.Uri;
import android.provider.Settings;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.HorizontalScrollView;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** Lo de la barbería en el launcher: caja rápida, tarjeta «Hoy en Meraki», modo barbería y los números de Tarjeta Meraki. */
class Barberia {
    final MainActivity a;
    Barberia(MainActivity a) { this.a = a; }

    static final String[][] METODOS = {{"efectivo", "Efectivo"}, {"transferencia", "Transferencia"}, {"tarjeta", "Tarjeta"}};
    static final String PROPINA = "Propina";
    static final String SERV_DEF = "[{\"n\":\"Corte\",\"p\":0},{\"n\":\"Corte + barba\",\"p\":0},{\"n\":\"Barba\",\"p\":0},{\"n\":\"Cejas\",\"p\":0},{\"n\":\"Diseño\",\"p\":0},{\"n\":\"Corte de niño\",\"p\":0}]";
    static final int EF = 0xFFF5F1E8, EM = 0xFFA8A297;

    // ================================================================ servicios y ventas
    static class Serv { String n; double p; Serv(String n, double p) { this.n = n; this.p = p; } }
    static class Venta {
        long t; String s, m, c; double p;
        JSONObject json() { JSONObject o = new JSONObject(); try { o.put("t", t); o.put("s", s); o.put("p", p); o.put("m", m); if (c != null && !c.isEmpty()) o.put("c", c); } catch (Exception e) { } return o; }
        static Venta de(JSONObject o) { Venta v = new Venta(); v.t = o.optLong("t"); v.s = o.optString("s"); v.p = o.optDouble("p", 0); v.m = o.optString("m", "efectivo"); v.c = o.optString("c", ""); return v; }
    }

    List<Serv> servicios() {
        List<Serv> l = new ArrayList<>();
        try { JSONArray j = new JSONArray(a.prefs.getString("caja_servicios", SERV_DEF)); for (int i = 0; i < j.length(); i++) { JSONObject o = j.getJSONObject(i); l.add(new Serv(o.optString("n"), o.optDouble("p", 0))); } } catch (Exception e) { }
        return l;
    }
    void guardarServicios(List<Serv> l) {
        JSONArray j = new JSONArray();
        for (Serv s : l) { JSONObject o = new JSONObject(); try { o.put("n", s.n); o.put("p", s.p); } catch (Exception e) { } j.put(o); }
        a.prefs.edit().putString("caja_servicios", j.toString()).apply();
    }

    static String claveMes(long t) { return "caja_" + new SimpleDateFormat("yyyy-MM", Locale.ROOT).format(new Date(t)); }
    List<Venta> mes(String k) {
        List<Venta> l = new ArrayList<>();
        try { JSONArray j = new JSONArray(a.prefs.getString(k, "[]")); for (int i = 0; i < j.length(); i++) l.add(Venta.de(j.getJSONObject(i))); } catch (Exception e) { }
        return l;
    }
    void guardarMes(String k, List<Venta> l) { JSONArray j = new JSONArray(); for (Venta v : l) j.put(v.json()); a.prefs.edit().putString(k, j.toString()).apply(); }
    void anotar(Venta v) { String k = claveMes(v.t); List<Venta> l = mes(k); l.add(v); guardarMes(k, l); }
    void reemplazar(Venta v) { String k = claveMes(v.t); List<Venta> l = mes(k); for (int i = 0; i < l.size(); i++) if (l.get(i).t == v.t) l.set(i, v); guardarMes(k, l); }
    void borrar(Venta v) { String k = claveMes(v.t); List<Venta> l = mes(k); for (int i = l.size() - 1; i >= 0; i--) if (l.get(i).t == v.t) l.remove(i); guardarMes(k, l); }
    List<Venta> entre(long desde, long hasta) {
        List<Venta> r = new ArrayList<>();
        Calendar c = Calendar.getInstance(); c.setTimeInMillis(desde); c.set(Calendar.DAY_OF_MONTH, 1);
        for (int n = 0; n < 14 && c.getTimeInMillis() <= hasta; n++) {
            for (Venta v : mes(claveMes(c.getTimeInMillis()))) if (v.t >= desde && v.t < hasta) r.add(v);
            c.add(Calendar.MONTH, 1);
        }
        Collections.sort(r, (x, y) -> Long.compare(y.t, x.t));
        return r;
    }
    static long inicioDia(long t) { Calendar c = Calendar.getInstance(); c.setTimeInMillis(t); c.set(Calendar.HOUR_OF_DAY, 0); c.set(Calendar.MINUTE, 0); c.set(Calendar.SECOND, 0); c.set(Calendar.MILLISECOND, 0); return c.getTimeInMillis(); }
    static long masDias(long t, int d) { Calendar c = Calendar.getInstance(); c.setTimeInMillis(t); c.add(Calendar.DAY_OF_MONTH, d); return c.getTimeInMillis(); }
    /** La semana de Meraki empieza el martes (el lunes es descanso). */
    static long inicioSemana(long t) { Calendar c = Calendar.getInstance(); c.setTimeInMillis(inicioDia(t)); int d = (c.get(Calendar.DAY_OF_WEEK) - Calendar.TUESDAY + 7) % 7; c.add(Calendar.DAY_OF_MONTH, -d); return c.getTimeInMillis(); }
    static long inicioMes(long t) { Calendar c = Calendar.getInstance(); c.setTimeInMillis(inicioDia(t)); c.set(Calendar.DAY_OF_MONTH, 1); return c.getTimeInMillis(); }
    static double suma(List<Venta> l) { double s = 0; for (Venta v : l) s += v.p; return s; }
    static double propinas(List<Venta> l) { double s = 0; for (Venta v : l) if (PROPINA.equals(v.s)) s += v.p; return s; }
    static int servicios(List<Venta> l) { int n = 0; for (Venta v : l) if (!PROPINA.equals(v.s)) n++; return n; }
    static String plata(double v) { return Math.abs(v - Math.rint(v)) < 0.005 ? "$" + (long) Math.rint(v) : String.format(Locale.US, "$%.2f", v); }
    static String nombreMetodo(String m) { for (String[] x : METODOS) if (x[0].equals(m)) return x[1]; return "Efectivo"; }

    // ================================================================ tarjeta «Hoy en Meraki» del inicio
    LinearLayout tarjeta;
    View tarjetaHoy() {
        tarjeta = new LinearLayout(a);
        tarjeta.setOrientation(LinearLayout.VERTICAL);
        tarjeta.setBackground(a.caja(a.CARD, 18, a.LINEA));
        tarjeta.setPadding(a.dp(18), a.dp(14), a.dp(18), a.dp(14));
        tarjeta.setOnClickListener(v -> abrirCaja("hoy"));
        pintarTarjeta();
        return tarjeta;
    }

    void pintarTarjeta() {
        if (tarjeta == null) return;
        tarjeta.removeAllViews();
        long hoy = inicioDia(System.currentTimeMillis());
        List<Venta> l = entre(hoy, masDias(hoy, 1));
        boolean modo = modoActivo(a);
        // encabezado
        LinearLayout cab = new LinearLayout(a); cab.setGravity(Gravity.CENTER_VERTICAL);
        cab.addView(a.etiqueta("Hoy en Meraki", a.acento), new LinearLayout.LayoutParams(0, -2, 1f));
        TextView chip = a.texto((modo ? "● " : "○ ") + "Modo barbería", 12, modo ? MainActivity.conAlpha(0xFF141414, 0xFF) : a.MUTED, a.tf(true));
        chip.setPadding(a.dp(10), a.dp(5), a.dp(10), a.dp(5));
        chip.setBackground(a.caja(modo ? a.acento : 0, 99, modo ? 0 : a.LINEA));
        if (modo) chip.setTextColor(luz(a.acento) > 0.6 ? 0xFF141414 : 0xFFFFFFFF);
        chip.setOnClickListener(v -> alternarConPermisos());
        cab.addView(chip);
        tarjeta.addView(cab);
        // números del día
        LinearLayout fila = new LinearLayout(a); fila.setGravity(Gravity.BOTTOM);
        fila.addView(a.texto(plata(suma(l)), 34, a.FG, a.tf(true)));
        int n = servicios(l);
        TextView sub = a.texto("  " + n + (n == 1 ? " servicio" : " servicios") + (propinas(l) > 0 ? " · " + plata(propinas(l)) + " propinas" : ""), 14, a.MUTED, a.tf(false));
        sub.setPadding(0, 0, 0, a.dp(5));
        fila.addView(sub);
        tarjeta.addView(fila, a.lp(-1, -2, 6));
        // Tarjeta Meraki
        String tm = textoTarjetaMeraki();
        if (tm != null) {
            TextView t = a.texto(tm, 13.5f, a.FG, a.tf(false));
            t.setPadding(0, a.dp(2), 0, a.dp(2));
            t.setOnClickListener(v -> abrirTarjetaMeraki());
            tarjeta.addView(t, a.lp(-1, -2, 6));
        }
        // apps de trabajo en modo barbería
        if (modo) {
            List<MainActivity.App> apps = new ArrayList<>(appsTrabajo());
            // las que ya están en la fila de accesos grandes no se repiten aquí
            if (a.prefs.getBoolean("ver_accesos", true)) apps.removeAll(a.accesos());
            if (!apps.isEmpty()) {
                LinearLayout fa = new LinearLayout(a);
                for (MainActivity.App ap : apps) {
                    ImageView iv = new ImageView(a);
                    iv.setImageDrawable(a.icono(ap, a.dp(44)));
                    iv.setContentDescription(ap.label);
                    iv.setOnClickListener(v -> a.lanzar(ap));
                    LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(a.dp(42), a.dp(42)); p.rightMargin = a.dp(12);
                    fa.addView(iv, p);
                }
                HorizontalScrollView hs = new HorizontalScrollView(a); hs.setHorizontalScrollBarEnabled(false); hs.addView(fa);
                tarjeta.addView(hs, a.lp(-1, -2, 10));
            }
        }
        // botones
        LinearLayout bs = new LinearLayout(a);
        TextView anotar = boton("＋ Anotar", true, a.acento);
        anotar.setOnClickListener(v -> abrirCaja("hoy"));
        bs.addView(anotar, new LinearLayout.LayoutParams(0, -2, 1f));
        TextView caja = boton("Caja de la semana", false, a.acento);
        caja.setOnClickListener(v -> abrirCaja("semana"));
        LinearLayout.LayoutParams pc = new LinearLayout.LayoutParams(0, -2, 1f); pc.leftMargin = a.dp(8);
        bs.addView(caja, pc);
        tarjeta.addView(bs, a.lp(-1, -2, 12));
    }

    TextView boton(String t, boolean fuerte, int acento) {
        TextView b = a.texto(t, 14, fuerte ? (luz(acento) > 0.6 ? 0xFF141414 : 0xFFFFFFFF) : a.FG, a.tf(true));
        b.setGravity(Gravity.CENTER);
        b.setPadding(a.dp(10), a.dp(10), a.dp(10), a.dp(10));
        b.setBackground(a.caja(fuerte ? acento : 0, 99, fuerte ? 0 : a.LINEA));
        return b;
    }
    static double luz(int c) { return (0.299 * ((c >> 16) & 255) + 0.587 * ((c >> 8) & 255) + 0.114 * (c & 255)) / 255.0; }

    // ================================================================ Tarjeta Meraki (sólo números: nunca nombres ni teléfonos)
    static final String TM_URL = "https://firestore.googleapis.com/v1/projects/meraki-barbershop/databases/(default)/documents/resumen/barberia?key=AIzaSyCysp_Pr9o-LYM5td9wOGLNNvsSKaEx2MQ";
    static final String TM_APP = "https://josemontes20201234-pixel.github.io/?seg=inactivo";

    String textoTarjetaMeraki() {
        String err = a.prefs.getString("tm_error", "");
        try {
            String s = a.prefs.getString("tm_resumen", "");
            if (s.isEmpty()) return "permiso".equals(err) ? "Tarjeta Meraki: falta un permiso en Firebase (Ajustes → Barbería)"
                    : "vacio".equals(err) ? "👥 Abrí Tarjeta Meraki una vez para ver aquí tus clientes" : null;
            JSONObject o = new JSONObject(s);
            int in = o.optInt("inactivos"), pr = o.optInt("premio"), cu = o.optInt("cumple");
            List<String> p = new ArrayList<>();
            if (in > 0) p.add("⏰ " + in + (in == 1 ? " cliente no viene" : " clientes no vienen") + " hace +" + o.optInt("dias", 30) + " días");
            if (pr > 0) p.add("🎁 " + pr + (pr == 1 ? " premio listo" : " premios listos"));
            if (cu > 0) p.add("🎂 " + cu + (cu == 1 ? " cumple años este mes" : " cumplen años este mes"));
            if (p.isEmpty()) return "Tarjeta Meraki: todos tus clientes al día ✓";
            return android.text.TextUtils.join("  ·  ", p);
        } catch (Exception e) { return null; }
    }

    /** El grupo de Tarjeta Meraki que corresponde a lo que dice la línea (inactivos, premios o cumpleaños). */
    String grupoTarjetaMeraki() {
        try {
            JSONObject o = new JSONObject(a.prefs.getString("tm_resumen", "{}"));
            if (o.optInt("inactivos") > 0) return "inactivo";
            if (o.optInt("premio") > 0) return "premio";
            if (o.optInt("cumple") > 0) return "cumple";
        } catch (Exception e) { }
        return "todos";
    }

    void abrirTarjetaMeraki() {
        String url = TM_APP.substring(0, TM_APP.indexOf('?')) + "?seg=" + grupoTarjetaMeraki();
        try { a.startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); }
        catch (Exception e) { a.toast("No encontré Tarjeta Meraki."); }
    }

    /** Lee los números que publica Tarjeta Meraki (cada 10 minutos como mucho). */
    void cargarTarjetaMeraki(boolean forzar) {
        long ult = a.prefs.getLong("tm_leido", 0);
        // Si la última vez falló, se reintenta al minuto; si salió bien, cada 10 minutos
        long espera = a.prefs.getString("tm_error", "").isEmpty() && !a.prefs.getString("tm_resumen", "").isEmpty() ? 10 * 60 * 1000 : 60 * 1000;
        if (!forzar && System.currentTimeMillis() - ult < espera) return;
        a.prefs.edit().putLong("tm_leido", System.currentTimeMillis()).apply();
        new Thread(() -> {
            String err = "";
            try {
                HttpURLConnection c = (HttpURLConnection) new URL(TM_URL).openConnection();
                c.setConnectTimeout(8000); c.setReadTimeout(8000);
                int code = c.getResponseCode();
                if (code == 200) {
                    StringBuilder sb = new StringBuilder();
                    try (BufferedReader r = new BufferedReader(new InputStreamReader(c.getInputStream(), "UTF-8"))) { String x; while ((x = r.readLine()) != null) sb.append(x); }
                    JSONObject f = new JSONObject(sb.toString()).getJSONObject("fields"), o = new JSONObject();
                    for (String k : new String[]{"inactivos", "premio", "casi", "cumple", "hoy", "total", "dias"}) if (f.has(k)) o.put(k, Long.parseLong(f.getJSONObject(k).optString("integerValue", "0")));
                    if (f.has("actualizado")) o.put("actualizado", f.getJSONObject("actualizado").optString("stringValue", ""));
                    a.prefs.edit().putString("tm_resumen", o.toString()).apply();
                } else err = code == 403 ? "permiso" : code == 404 ? "vacio" : "red";
            } catch (Exception e) { err = "red"; }
            final String fe = err;
            a.ui.post(() -> { a.prefs.edit().putString("tm_error", fe).apply(); pintarTarjeta(); });
        }).start();
    }

    // ================================================================ modo barbería
    static SharedPreferences prefs(Context c) { return c.getSharedPreferences("meraki", Context.MODE_PRIVATE); }
    static boolean modoActivo(Context c) { return prefs(c).getBoolean("modo_on", false); }

    static void activar(Context c) {
        SharedPreferences p = prefs(c);
        SharedPreferences.Editor e = p.edit();
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        AudioManager am = (AudioManager) c.getSystemService(Context.AUDIO_SERVICE);
        ContentResolver cr = c.getContentResolver();
        boolean dnd = nm != null && nm.isNotificationPolicyAccessGranted();
        String son = p.getString("modo_sonido", "vibrar");
        if (!"igual".equals(son) && am != null) {
            e.putInt("modo_prev_ringer", am.getRingerMode());
            try { am.setRingerMode("silencio".equals(son) && dnd ? AudioManager.RINGER_MODE_SILENT : AudioManager.RINGER_MODE_VIBRATE); } catch (Exception x) { }
        }
        if (p.getBoolean("modo_dnd", true) && dnd) {
            e.putInt("modo_prev_dnd", nm.getCurrentInterruptionFilter());
            try { nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_PRIORITY); } catch (Exception x) { }
        }
        String br = p.getString("modo_brillo", "igual");
        if (!"igual".equals(br) && Settings.System.canWrite(c)) {
            try {
                e.putInt("modo_prev_brillo_modo", Settings.System.getInt(cr, Settings.System.SCREEN_BRIGHTNESS_MODE, 0));
                e.putInt("modo_prev_brillo", Settings.System.getInt(cr, Settings.System.SCREEN_BRIGHTNESS, 128));
                if ("auto".equals(br)) Settings.System.putInt(cr, Settings.System.SCREEN_BRIGHTNESS_MODE, 1);
                else {
                    Settings.System.putInt(cr, Settings.System.SCREEN_BRIGHTNESS_MODE, 0);
                    Settings.System.putInt(cr, Settings.System.SCREEN_BRIGHTNESS, Math.max(5, Integer.parseInt(br) * 255 / 100));
                }
            } catch (Exception x) { }
        }
        e.putBoolean("modo_on", true).putLong("modo_desde", System.currentTimeMillis()).apply();
    }

    static void desactivar(Context c) {
        SharedPreferences p = prefs(c);
        SharedPreferences.Editor e = p.edit();
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        AudioManager am = (AudioManager) c.getSystemService(Context.AUDIO_SERVICE);
        ContentResolver cr = c.getContentResolver();
        if (p.contains("modo_prev_dnd") && nm != null && nm.isNotificationPolicyAccessGranted()) {
            try { nm.setInterruptionFilter(p.getInt("modo_prev_dnd", NotificationManager.INTERRUPTION_FILTER_ALL)); } catch (Exception x) { }
        }
        if (p.contains("modo_prev_ringer") && am != null) {
            try { am.setRingerMode(p.getInt("modo_prev_ringer", AudioManager.RINGER_MODE_NORMAL)); } catch (Exception x) { }
        }
        if (p.contains("modo_prev_brillo") && Settings.System.canWrite(c)) {
            try {
                Settings.System.putInt(cr, Settings.System.SCREEN_BRIGHTNESS_MODE, p.getInt("modo_prev_brillo_modo", 0));
                Settings.System.putInt(cr, Settings.System.SCREEN_BRIGHTNESS, p.getInt("modo_prev_brillo", 128));
            } catch (Exception x) { }
        }
        e.remove("modo_prev_dnd").remove("modo_prev_ringer").remove("modo_prev_brillo").remove("modo_prev_brillo_modo").putBoolean("modo_on", false).apply();
    }

    static boolean alternar(Context c) { if (modoActivo(c)) { desactivar(c); return false; } activar(c); return true; }

    /** Desde el launcher: pide los permisos que falten antes de activar. */
    void alternarConPermisos() {
        if (!modoActivo(a)) {
            SharedPreferences p = a.prefs;
            if (p.getBoolean("modo_dnd", true) && !a.panel().permisoNoMolestar()) { a.panel().necesitaNoMolestar(); return; }
            if (!"igual".equals(p.getString("modo_brillo", "igual")) && !a.panel().permisoAjustes()) { a.panel().necesitaAjustes(); return; }
        }
        boolean on = alternar(a);
        a.toast(on ? "Modo barbería activado" : "Modo barbería apagado: todo como estaba");
        pintarTarjeta();
        if (a.panel != null && a.panel.abierto()) a.panel.refrescar();
    }

    /** Las apps de trabajo: las que Jose escoja, o sus apps Meraki y WhatsApp. */
    List<MainActivity.App> appsTrabajo() {
        List<MainActivity.App> r = new ArrayList<>();
        String g = a.prefs.getString("modo_apps", null);
        if (g != null) { for (String k : g.split(",")) { MainActivity.App ap = a.porKey.get(k); if (ap != null) r.add(ap); } return r; }
        for (MainActivity.App ap : a.todas) {
            String l = ap.label == null ? "" : ap.label.toLowerCase(Locale.ROOT);
            // Meraki Panel y el launcher no son apps de trabajo
            if (ap.pkg.equals("com.josemontes.panel") || ap.pkg.equals(a.getPackageName())) continue;
            if (l.contains("meraki") || ap.pkg.equals("com.whatsapp") || ap.pkg.equals("com.whatsapp.w4b")) r.add(ap);
            if (r.size() >= 8) break;
        }
        return r;
    }

    // ================================================================ caja rápida (pantalla completa)
    FrameLayout capa;
    LinearLayout contenido, pestanas;
    String pestana = "hoy", metodo = "efectivo";

    boolean abierta() { return capa != null && capa.getParent() != null; }

    void abrirCaja(String p) {
        if (p != null) pestana = p;
        if (abierta()) { pintar(); return; }
        a.cerrarCajon();
        if (a.panel != null && a.panel.abierto()) a.panel.cerrar();
        capa = new FrameLayout(a);
        capa.setClickable(true);
        capa.setBackground(new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, new int[]{0xFF1C1A16, 0xFF0B0A08}));
        LinearLayout col = new LinearLayout(a);
        col.setOrientation(LinearLayout.VERTICAL);
        col.setPadding(0, a.insetArriba, 0, 0);
        capa.addView(col, new FrameLayout.LayoutParams(-1, -1));
        LinearLayout cab = new LinearLayout(a);
        cab.setGravity(Gravity.CENTER_VERTICAL);
        cab.setPadding(a.dp(8), a.dp(8), a.dp(12), a.dp(4));
        TextView atras = a.texto("←", 24, EF, Typeface.DEFAULT);
        atras.setPadding(a.dp(12), a.dp(6), a.dp(12), a.dp(6));
        atras.setOnClickListener(v -> cerrarCaja());
        cab.addView(atras);
        cab.addView(a.texto("Caja", 22, EF, a.tf(true)), new LinearLayout.LayoutParams(0, -2, 1f));
        TextView serv = a.texto("Servicios", 14, EF, a.tf(true));
        serv.setPadding(a.dp(14), a.dp(8), a.dp(14), a.dp(8));
        serv.setBackground(a.caja(0x1FFFFFFF, 99, 0x33FFFFFF));
        serv.setOnClickListener(v -> { pestana = "servicios"; pintar(); });
        cab.addView(serv);
        col.addView(cab);
        pestanas = new LinearLayout(a);
        pestanas.setPadding(a.dp(18), a.dp(8), a.dp(18), a.dp(4));
        col.addView(pestanas);
        ScrollView sv = new ScrollView(a);
        contenido = new LinearLayout(a);
        contenido.setOrientation(LinearLayout.VERTICAL);
        contenido.setPadding(a.dp(18), a.dp(8), a.dp(18), a.insetAbajo + a.dp(30));
        sv.addView(contenido);
        col.addView(sv, new LinearLayout.LayoutParams(-1, 0, 1f));
        a.root.addView(capa, new FrameLayout.LayoutParams(-1, -1));
        capa.setAlpha(0f); capa.animate().alpha(1f).setDuration(150).start();
        pintar();
    }

    void cerrarCaja() {
        if (!abierta()) return;
        final FrameLayout c = capa; capa = null;
        c.animate().alpha(0f).setDuration(130).withEndAction(() -> { if (c.getParent() != null) ((ViewGroup) c.getParent()).removeView(c); }).start();
        pintarTarjeta();
    }

    void pintar() {
        if (contenido == null) return;
        pestanas.removeAllViews();
        String[][] ps = {{"hoy", "Hoy"}, {"semana", "Semana"}, {"mes", "Mes"}};
        for (String[] p : ps) { TextView c = chip(p[1], p[0].equals(pestana)); c.setOnClickListener(v -> { pestana = p[0]; pintar(); }); pestanas.addView(c, margen(8)); }
        contenido.removeAllViews();
        switch (pestana) {
            case "semana": resumen(inicioSemana(System.currentTimeMillis()), 7, "Esta semana", "la semana pasada"); break;
            case "mes": { long d = inicioMes(System.currentTimeMillis()); Calendar c = Calendar.getInstance(); c.setTimeInMillis(d); resumen(d, c.getActualMaximum(Calendar.DAY_OF_MONTH), "Este mes", "el mes pasado"); break; }
            case "servicios": pintarServicios(); break;
            default: pintarHoy();
        }
    }

    LinearLayout.LayoutParams margen(int der) { LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-2, -2); p.rightMargin = a.dp(der); return p; }
    TextView chip(String t, boolean sel) {
        TextView v = a.texto(t, 14, sel ? (luz(a.acento) > 0.6 ? 0xFF141414 : 0xFFFFFFFF) : EF, a.tf(sel));
        v.setPadding(a.dp(14), a.dp(9), a.dp(14), a.dp(9));
        v.setBackground(a.caja(sel ? a.acento : 0x1FFFFFFF, 99, sel ? 0 : 0x22FFFFFF));
        return v;
    }
    void titulo(String t) { contenido.addView(a.etiqueta(t, a.acento), a.lp(-2, -2, 20)); }
    TextView nota(String t) { TextView v = a.texto(t, 13, EM, a.tf(false)); contenido.addView(v, a.lp(-1, -2, 6)); return v; }

    void pintarHoy() {
        long hoy = inicioDia(System.currentTimeMillis());
        List<Venta> l = entre(hoy, masDias(hoy, 1));
        contenido.addView(a.texto(plata(suma(l)), 52, a.acento, a.tf(true)), a.lp(-2, -2, 4));
        int n = servicios(l);
        nota(n + (n == 1 ? " servicio" : " servicios") + " hoy" + (propinas(l) > 0 ? " · " + plata(propinas(l)) + " en propinas" : ""));
        // método de pago para lo próximo que anote
        titulo("Cómo paga");
        LinearLayout ms = new LinearLayout(a);
        for (String[] m : METODOS) { TextView c = chip(m[1], m[0].equals(metodo)); c.setOnClickListener(v -> { metodo = m[0]; pintar(); }); ms.addView(c, margen(8)); }
        contenido.addView(ms, a.lp(-1, -2, 8));
        // servicios
        titulo("Tocá lo que hiciste");
        List<Serv> ss = servicios();
        LinearLayout fila = null;
        for (int i = 0; i < ss.size(); i++) {
            if (i % 2 == 0) { fila = new LinearLayout(a); contenido.addView(fila, a.lp(-1, -2, 8)); }
            final Serv s = ss.get(i);
            LinearLayout b = new LinearLayout(a);
            b.setOrientation(LinearLayout.VERTICAL);
            b.setPadding(a.dp(14), a.dp(14), a.dp(14), a.dp(14));
            b.setBackground(a.caja(0x1AFFFFFF, 16, 0x26FFFFFF));
            b.addView(a.texto(s.n, 16, EF, a.tf(true)));
            b.addView(a.texto(s.p > 0 ? plata(s.p) : "Poné el precio", 13.5f, s.p > 0 ? a.acento : EM, a.tf(false)), a.lp(-2, -2, 4));
            b.setOnClickListener(v -> anotarServicio(s.n, s.p));
            LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(0, -2, 1f);
            if (i % 2 == 0) p.rightMargin = a.dp(4); else p.leftMargin = a.dp(4);
            fila.addView(b, p);
        }
        if (fila != null && ss.size() % 2 == 1) fila.addView(new View(a), new LinearLayout.LayoutParams(0, 1, 1f));
        LinearLayout ex = new LinearLayout(a);
        TextView otro = boton("＋ Otro monto", false, a.acento); otro.setTextColor(EF); otro.setBackground(a.caja(0, 99, 0x33FFFFFF));
        otro.setOnClickListener(v -> otroMonto());
        ex.addView(otro, new LinearLayout.LayoutParams(0, -2, 1f));
        TextView prop = boton("＋ Propina", false, a.acento); prop.setTextColor(EF); prop.setBackground(a.caja(0, 99, 0x33FFFFFF));
        prop.setOnClickListener(v -> pedirMonto("Propina", 0, m -> guardarNueva(PROPINA, m)));
        LinearLayout.LayoutParams pp = new LinearLayout.LayoutParams(0, -2, 1f); pp.leftMargin = a.dp(8);
        ex.addView(prop, pp);
        contenido.addView(ex, a.lp(-1, -2, 10));
        // lo anotado hoy
        if (!l.isEmpty()) {
            titulo("Anotado hoy");
            nota("Tocá uno para cambiarlo o borrarlo.");
            SimpleDateFormat hf = new SimpleDateFormat(android.text.format.DateFormat.is24HourFormat(a) ? "HH:mm" : "h:mm a", MainActivity.ES);
            for (Venta v : l) contenido.addView(filaVenta(hf.format(new Date(v.t)), v), a.lp(-1, -2, 6));
        }
    }

    View filaVenta(String hora, Venta v) {
        LinearLayout f = new LinearLayout(a);
        f.setGravity(Gravity.CENTER_VERTICAL);
        f.setPadding(a.dp(14), a.dp(10), a.dp(14), a.dp(10));
        f.setBackground(a.caja(0x14FFFFFF, 12, 0));
        LinearLayout tx = new LinearLayout(a); tx.setOrientation(LinearLayout.VERTICAL);
        tx.addView(a.texto(v.s + (v.c != null && !v.c.isEmpty() ? " · " + v.c : ""), 15, EF, a.tf(false)));
        tx.addView(a.texto(hora + " · " + nombreMetodo(v.m), 12, EM, a.tf(false)), a.lp(-2, -2, 2));
        f.addView(tx, new LinearLayout.LayoutParams(0, -2, 1f));
        f.addView(a.texto(plata(v.p), 16, PROPINA.equals(v.s) ? EM : EF, a.tf(true)));
        f.setOnClickListener(x -> opciones(v));
        return f;
    }

    interface AlMonto { void monto(double m); }
    void pedirMonto(String titulo, double actual, AlMonto cb) {
        EditText e = new EditText(a);
        e.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL);
        e.setHint("0.00");
        if (actual > 0) e.setText(String.format(Locale.US, "%.2f", actual));
        FrameLayout fl = new FrameLayout(a); fl.setPadding(a.dp(22), a.dp(8), a.dp(22), 0); fl.addView(e);
        a.dialogo().setTitle(titulo).setView(fl).setPositiveButton("Anotar", (d, w) -> {
            double m = num(e.getText().toString());
            if (m > 0) cb.monto(m); else a.toast("Poné un monto.");
        }).setNegativeButton("Cancelar", null).show();
        e.requestFocus();
        a.ui.postDelayed(() -> { android.view.inputmethod.InputMethodManager im = (android.view.inputmethod.InputMethodManager) a.getSystemService(Context.INPUT_METHOD_SERVICE); if (im != null) im.showSoftInput(e, 0); }, 200);
    }
    static double num(String s) { try { return Double.parseDouble(s.replace(',', '.').replace("$", "").trim()); } catch (Exception x) { return 0; } }

    void anotarServicio(String n, double p) {
        if (p > 0) guardarNueva(n, p);
        else pedirMonto(n + ": ¿cuánto cobraste?", 0, m -> guardarNueva(n, m));
    }

    void guardarNueva(String s, double p) {
        Venta v = new Venta(); v.t = System.currentTimeMillis(); v.s = s; v.p = p; v.m = metodo; v.c = "";
        anotar(v);
        a.toast(s + " · " + plata(p) + " anotado");
        pintar();
        pintarTarjeta();
    }

    void otroMonto() {
        LinearLayout f = new LinearLayout(a); f.setOrientation(LinearLayout.VERTICAL); f.setPadding(a.dp(22), a.dp(8), a.dp(22), 0);
        EditText q = new EditText(a); q.setHint("¿Qué fue? (producto, servicio…)"); q.setSingleLine(true); q.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);
        EditText m = new EditText(a); m.setHint("Monto"); m.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL);
        f.addView(q); f.addView(m);
        a.dialogo().setTitle("Otro monto").setView(f).setPositiveButton("Anotar", (d, w) -> {
            double v = num(m.getText().toString());
            String n = q.getText().toString().trim();
            if (v > 0) guardarNueva(n.isEmpty() ? "Otro" : n, v); else a.toast("Poné un monto.");
        }).setNegativeButton("Cancelar", null).show();
    }

    void opciones(Venta v) {
        String[] ops = {"Cambiar a Efectivo", "Cambiar a Transferencia", "Cambiar a Tarjeta", "Cambiar el monto", "Nombre del cliente", "Borrar"};
        a.dialogo().setTitle(v.s + " · " + plata(v.p)).setItems(ops, (d, w) -> {
            switch (w) {
                case 0: case 1: case 2: v.m = METODOS[w][0]; reemplazar(v); pintar(); pintarTarjeta(); break;
                case 3: pedirMonto("Nuevo monto", v.p, m -> { v.p = m; reemplazar(v); pintar(); pintarTarjeta(); }); break;
                case 4: {
                    EditText e = new EditText(a); e.setSingleLine(true); e.setText(v.c); e.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_WORDS);
                    FrameLayout fl = new FrameLayout(a); fl.setPadding(a.dp(22), a.dp(8), a.dp(22), 0); fl.addView(e);
                    a.dialogo().setTitle("Nombre del cliente").setView(fl).setPositiveButton("Guardar", (dd, ww) -> { v.c = e.getText().toString().trim(); reemplazar(v); pintar(); }).setNegativeButton("Cancelar", null).show();
                    break;
                }
                case 5:
                    a.dialogo().setTitle("¿Borrar " + v.s + " de " + plata(v.p) + "?").setPositiveButton("Borrar", (dd, ww) -> { borrar(v); pintar(); pintarTarjeta(); }).setNegativeButton("No", null).show();
                    break;
            }
        }).setNegativeButton("Cerrar", null).show();
    }

    /** Semana o mes: total, comparación, días, por servicio y por forma de pago. */
    void resumen(long desde, int dias, String nombre, String anterior) {
        long ahora = System.currentTimeMillis(), hasta = masDias(desde, dias);
        List<Venta> l = entre(desde, hasta);
        double tot = suma(l);
        contenido.addView(a.etiqueta(nombre, a.acento), a.lp(-2, -2, 6));
        contenido.addView(a.texto(plata(tot), 52, a.acento, a.tf(true)), a.lp(-2, -2, 4));
        int n = servicios(l);
        nota(n + (n == 1 ? " servicio" : " servicios") + (n > 0 ? " · promedio " + plata((tot - propinas(l)) / n) : "") + (propinas(l) > 0 ? " · " + plata(propinas(l)) + " propinas" : ""));
        // comparación con el período anterior hasta el mismo punto
        long dur = Math.min(ahora, hasta) - desde;
        long antD = "Este mes".equals(nombre) ? inicioMes(masDias(desde, -1)) : masDias(desde, -7);
        double antes = suma(entre(antD, antD + dur));
        if (antes > 0) {
            double dif = tot - antes;
            TextView c = nota((dif >= 0 ? "▲ " : "▼ ") + plata(Math.abs(dif)) + " " + (dif >= 0 ? "más" : "menos") + " que " + anterior + " a esta altura (" + Math.round(Math.abs(dif) / antes * 100) + "%)");
            c.setTextColor(dif >= 0 ? 0xFF3DB46D : 0xFFE5484D);
        }
        // por día
        titulo("Por día");
        double[] porDia = new double[dias];
        for (Venta v : l) { int d = (int) ((inicioDia(v.t) - desde) / 86400000L); if (d >= 0 && d < dias) porDia[d] += v.p; }
        double max = 0; for (double x : porDia) max = Math.max(max, x);
        SimpleDateFormat df = new SimpleDateFormat(dias <= 7 ? "EEE d" : "d", MainActivity.ES);
        int mejor = -1; for (int i = 0; i < dias; i++) if (porDia[i] > 0 && (mejor < 0 || porDia[i] > porDia[mejor])) mejor = i;
        if (dias <= 7) {
            for (int i = 0; i < dias; i++) contenido.addView(barra(MainActivity.mayus1(df.format(new Date(masDias(desde, i)))), porDia[i], max, masDias(desde, i) > ahora), a.lp(-1, -2, 6));
        } else {
            // mes: columnas chiquitas
            LinearLayout cols = new LinearLayout(a); cols.setGravity(Gravity.BOTTOM);
            int alto = a.dp(90);
            for (int i = 0; i < dias; i++) {
                View b = new View(a);
                b.setBackground(a.caja(porDia[i] > 0 ? a.acento : 0x22FFFFFF, 3, 0));
                int h = max > 0 ? Math.max(a.dp(3), (int) (alto * porDia[i] / max)) : a.dp(3);
                LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(0, h, 1f); p.leftMargin = a.dp(1); p.rightMargin = a.dp(1);
                cols.addView(b, p);
            }
            contenido.addView(cols, new LinearLayout.LayoutParams(-1, alto));
            int trabajados = 0; for (double x : porDia) if (x > 0) trabajados++;
            if (trabajados > 0) nota("Promedio por día trabajado: " + plata(tot / trabajados) + (mejor >= 0 ? " · Mejor día: " + MainActivity.mayus1(new SimpleDateFormat("EEEE d", MainActivity.ES).format(new Date(masDias(desde, mejor)))) + " (" + plata(porDia[mejor]) + ")" : ""));
        }
        if (l.isEmpty()) { nota("Todavía no hay nada anotado en este período."); return; }
        // por servicio
        titulo("Por servicio");
        Map<String, double[]> ps = new LinkedHashMap<>();
        for (Venta v : l) { double[] x = ps.get(v.s); if (x == null) { x = new double[2]; ps.put(v.s, x); } x[0]++; x[1] += v.p; }
        List<Map.Entry<String, double[]>> es = new ArrayList<>(ps.entrySet());
        Collections.sort(es, (x, y) -> Double.compare(y.getValue()[1], x.getValue()[1]));
        for (Map.Entry<String, double[]> e : es) contenido.addView(linea(e.getKey() + "  ×" + (int) e.getValue()[0], plata(e.getValue()[1])), a.lp(-1, -2, 4));
        // por forma de pago
        titulo("Por forma de pago");
        for (String[] m : METODOS) {
            double s = 0; for (Venta v : l) if (m[0].equals(v.m)) s += v.p;
            if (s > 0) contenido.addView(linea(m[1], plata(s)), a.lp(-1, -2, 4));
        }
    }

    View linea(String izq, String der) {
        LinearLayout f = new LinearLayout(a);
        f.setPadding(a.dp(14), a.dp(10), a.dp(14), a.dp(10));
        f.setBackground(a.caja(0x14FFFFFF, 12, 0));
        f.addView(a.texto(izq, 15, EF, a.tf(false)), new LinearLayout.LayoutParams(0, -2, 1f));
        f.addView(a.texto(der, 15, EF, a.tf(true)));
        return f;
    }

    View barra(String dia, double v, double max, boolean futuro) {
        LinearLayout f = new LinearLayout(a);
        f.setGravity(Gravity.CENTER_VERTICAL);
        f.addView(a.texto(dia, 13, futuro ? 0x55FFFFFF : EF, a.tf(false)), new LinearLayout.LayoutParams(a.dp(70), -2));
        FrameLayout pista = new FrameLayout(a);
        pista.setBackground(a.caja(0x14FFFFFF, 99, 0));
        View b = new View(a);
        b.setBackground(a.caja(a.acento, 99, 0));
        pista.addView(b, new FrameLayout.LayoutParams(0, -1));
        f.addView(pista, new LinearLayout.LayoutParams(0, a.dp(12), 1f));
        f.addView(a.texto(v > 0 ? plata(v) : "—", 13, EF, a.tf(true)), new LinearLayout.LayoutParams(a.dp(70), -2));
        ((TextView) f.getChildAt(2)).setGravity(Gravity.END);
        pista.post(() -> { ViewGroup.LayoutParams p = b.getLayoutParams(); p.width = max > 0 ? (int) (pista.getWidth() * v / max) : 0; b.setLayoutParams(p); });
        return f;
    }

    void pintarServicios() {
        final List<Serv> l = servicios();
        contenido.addView(a.etiqueta("Tus servicios y precios", a.acento), a.lp(-2, -2, 6));
        nota("Tocá uno para cambiar su nombre o precio. Si el precio está en 0, te pregunta cuánto cobraste cada vez.");
        for (int i = 0; i < l.size(); i++) {
            final int k = i; final Serv s = l.get(i);
            LinearLayout f = new LinearLayout(a);
            f.setGravity(Gravity.CENTER_VERTICAL);
            f.setPadding(a.dp(14), a.dp(6), a.dp(4), a.dp(6));
            f.setBackground(a.caja(0x14FFFFFF, 12, 0));
            LinearLayout tx = new LinearLayout(a); tx.setOrientation(LinearLayout.VERTICAL);
            tx.addView(a.texto(s.n, 15.5f, EF, a.tf(false)));
            tx.addView(a.texto(s.p > 0 ? plata(s.p) : "Sin precio fijo", 12.5f, s.p > 0 ? a.acento : EM, a.tf(false)), a.lp(-2, -2, 2));
            tx.setOnClickListener(v -> editarServicio(l, k));
            f.addView(tx, new LinearLayout.LayoutParams(0, -2, 1f));
            f.addView(chico("↑", k > 0, () -> { l.add(k - 1, l.remove(k)); guardarServicios(l); pintar(); }));
            f.addView(chico("↓", k < l.size() - 1, () -> { l.add(k + 1, l.remove(k)); guardarServicios(l); pintar(); }));
            f.addView(chico("✕", true, () -> { l.remove(k); guardarServicios(l); pintar(); }));
            contenido.addView(f, a.lp(-1, -2, 6));
        }
        TextView mas = boton("＋ Agregar servicio", true, a.acento);
        mas.setOnClickListener(v -> editarServicio(l, -1));
        contenido.addView(mas, a.lp(-1, -2, 14));
        TextView listo = boton("Listo", false, a.acento); listo.setTextColor(EF); listo.setBackground(a.caja(0, 99, 0x33FFFFFF));
        listo.setOnClickListener(v -> { pestana = "hoy"; pintar(); });
        contenido.addView(listo, a.lp(-1, -2, 8));
    }

    View chico(String s, boolean activo, Runnable r) {
        TextView t = a.texto(s, 18, EF, a.tf(true));
        t.setPadding(a.dp(12), a.dp(8), a.dp(12), a.dp(8));
        t.setAlpha(activo ? 1f : .3f);
        if (activo) t.setOnClickListener(v -> r.run());
        return t;
    }

    void editarServicio(List<Serv> l, int k) {
        LinearLayout f = new LinearLayout(a); f.setOrientation(LinearLayout.VERTICAL); f.setPadding(a.dp(22), a.dp(8), a.dp(22), 0);
        EditText n = new EditText(a); n.setHint("Nombre (ej. Corte + barba)"); n.setSingleLine(true); n.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);
        EditText p = new EditText(a); p.setHint("Precio (0 = preguntar cada vez)"); p.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL);
        if (k >= 0) { n.setText(l.get(k).n); if (l.get(k).p > 0) p.setText(String.format(Locale.US, "%.2f", l.get(k).p)); }
        f.addView(n); f.addView(p);
        a.dialogo().setTitle(k >= 0 ? "Cambiar servicio" : "Nuevo servicio").setView(f).setPositiveButton("Guardar", (d, w) -> {
            String nn = n.getText().toString().trim();
            if (nn.isEmpty()) { a.toast("Poné el nombre."); return; }
            Serv s = new Serv(nn, num(p.getText().toString()));
            if (k >= 0) l.set(k, s); else l.add(s);
            guardarServicios(l); pintar();
        }).setNegativeButton("Cancelar", null).show();
    }

    // ================================================================ ajustes del launcher → «Barbería»
    static final String[][] SONIDOS = {{"vibrar", "Vibrar"}, {"silencio", "Silencio"}, {"igual", "No cambiar"}};
    static final String[][] BRILLOS = {{"igual", "No cambiar"}, {"auto", "Automático"}, {"30", "30%"}, {"50", "50%"}, {"70", "70%"}, {"100", "100%"}};
    static String nombre(String[][] ops, String k) { for (String[] o : ops) if (o[0].equals(k)) return o[1]; return ops[0][1]; }

    void elegirAppsTrabajo() {
        final List<MainActivity.App> todas = new ArrayList<>(a.todas);
        final List<MainActivity.App> act = appsTrabajo();
        String[] n = new String[todas.size()];
        boolean[] sel = new boolean[todas.size()];
        for (int i = 0; i < todas.size(); i++) { n[i] = todas.get(i).label; sel[i] = act.contains(todas.get(i)); }
        a.dialogo().setTitle("Apps de trabajo").setMultiChoiceItems(n, sel, (d, w, c) -> sel[w] = c).setPositiveButton("Guardar", (d, w) -> {
            List<String> k = new ArrayList<>();
            for (int i = 0; i < todas.size(); i++) if (sel[i]) k.add(todas.get(i).key());
            a.prefs.edit().putString("modo_apps", android.text.TextUtils.join(",", k)).apply();
            pintarTarjeta();
            a.toast(k.size() + " apps de trabajo");
        }).setNegativeButton("Cancelar", null).show();
    }

    static final String REGLA = "    match /resumen/{d} {\n      allow read: if true;\n      allow write: if request.auth != null && request.auth.token.email_verified == true && request.auth.token.email.lower() == \"josemontes20201234@gmail.com\";\n    }";
}
