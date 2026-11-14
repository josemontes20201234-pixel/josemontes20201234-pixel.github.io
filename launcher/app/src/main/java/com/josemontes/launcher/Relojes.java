package com.josemontes.launcher;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.text.SpannableStringBuilder;
import android.text.format.DateFormat;
import android.text.style.ForegroundColorSpan;
import android.text.style.RelativeSizeSpan;
import android.view.Gravity;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.GridLayout;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextClock;
import android.widget.TextView;

import java.io.File;
import java.util.Calendar;
import java.util.Locale;

/** Los relojes del inicio y el panel «Relojes y colores». */
final class Relojes {
    private Relojes() { }

    static final String[][] LISTA = {
            {"clasico", "Clásico", "El de tu estilo de inicio"},
            {"apilado", "Grande apilado", "La hora encima de los minutos, bien gruesa"},
            {"fino", "Fino", "Una línea delgada y elegante"},
            {"analogico", "Analógico Meraki", "Manecillas con marcas doradas"},
            {"anillo", "Anillo de minutos", "Los minutos dan la vuelta"},
            {"palabras", "En palabras", "«Son las siete y cuarto»"},
            {"tarjetas", "Tarjetas", "Hora y minutos en dos tarjetas"}};

    static String actual(MainActivity a) { return a.prefs.getString("reloj_estilo", "clasico"); }

    /**
     * El reloj escogido. angosto = va en una columna (estilo Columna); esc = tamaño (1 = normal).
     * vivo = se actualiza cada minuto (en el panel de muestras no hace falta).
     */
    static View crear(MainActivity a, String id, boolean angosto, float esc, int color, boolean vivo) {
        switch (id) {
            case "apilado": {
                LinearLayout l = new LinearLayout(a);
                l.setOrientation(LinearLayout.VERTICAL);
                Typeface t = Typeface.create("sans-serif-black", Typeface.NORMAL);
                TextClock h = a.reloj(88 * esc, t, color, "hh", "HH");
                TextClock m = a.reloj(88 * esc, t, color, "mm", "mm");
                l.addView(h);
                LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-2, -2); p.topMargin = -a.dp(16 * esc);
                l.addView(m, p);
                return l;
            }
            case "fino": {
                TextClock c = a.reloj((angosto ? 58 : 84) * esc, Typeface.create("sans-serif-thin", Typeface.NORMAL), color, "h:mm", "HH:mm");
                c.setLetterSpacing(-0.02f);
                return c;
            }
            case "analogico": {
                Analogico v = new Analogico(a, color);
                if (vivo) a.alMinuto.add(v::invalidate);
                int t = a.dp((angosto ? 170 : 210) * esc);
                v.setLayoutParams(new LinearLayout.LayoutParams(t, t));
                v.setOnClickListener(x -> a.abrirAlarmas());
                return v;
            }
            case "anillo": {
                MainActivity.Dial d = a.new Dial(a);
                if (vivo) a.diales.add(d);
                d.setLayoutParams(new LinearLayout.LayoutParams(angosto ? a.dp(200 * esc) : -1, a.dp((angosto ? 170 : 230) * esc)));
                d.setOnClickListener(x -> a.abrirAlarmas());
                return d;
            }
            case "palabras": {
                final TextView t = a.texto("", (angosto ? 26 : 34) * esc, a.FG, a.tf(true));
                t.setLineSpacing(0, 0.95f);
                Runnable r = () -> t.setText(enPalabras(a, Calendar.getInstance(), color));
                r.run();
                if (vivo) a.alMinuto.add(r);
                t.setOnClickListener(x -> a.abrirAlarmas());
                return t;
            }
            case "tarjetas": {
                LinearLayout l = new LinearLayout(a);
                l.setOrientation(angosto ? LinearLayout.VERTICAL : LinearLayout.HORIZONTAL);
                Typeface t = Typeface.create("sans-serif-black", Typeface.NORMAL);
                String[][] f = {{"hh", "HH"}, {"mm", "mm"}};
                for (int i = 0; i < 2; i++) {
                    FrameLayout card = new FrameLayout(a);
                    card.setBackground(a.caja(a.CARD, 20, a.LINEA));
                    card.setPadding(a.dp(14 * esc), a.dp(4 * esc), a.dp(14 * esc), a.dp(4 * esc));
                    TextClock c = a.reloj((angosto ? 54 : 70) * esc, t, color, f[i][0], f[i][1]);
                    c.setGravity(Gravity.CENTER);
                    card.addView(c, new FrameLayout.LayoutParams(-2, -2, Gravity.CENTER));
                    LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-2, -2);
                    if (i == 1) { if (angosto) p.topMargin = a.dp(8 * esc); else p.leftMargin = a.dp(10 * esc); }
                    l.addView(card, p);
                }
                return l;
            }
        }
        return null;
    }

    // ================================================================ la hora en palabras (como se dice aquí)
    static final String[] HORAS = {"doce", "una", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce"};
    static final String[] MIN = {"cero", "un", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce", "trece", "catorce",
            "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve", "veinte", "veintiuno", "veintidós", "veintitrés", "veinticuatro", "veinticinco",
            "veintiséis", "veintisiete", "veintiocho", "veintinueve", "treinta"};

    static String laHora(int h12) { return h12 == 1 ? "la una" : "las " + HORAS[h12]; }

    static CharSequence enPalabras(MainActivity a, Calendar c, int color) {
        int h24 = c.get(Calendar.HOUR_OF_DAY), m = c.get(Calendar.MINUTE);
        int h12 = h24 % 12 == 0 ? 12 : h24 % 12;
        String l1, l2;
        int hMomento = h24;
        if (m == 0) { l1 = h12 == 1 ? "Es la una" : "Son las " + HORAS[h12]; l2 = "en punto"; }
        else if (m <= 30) {
            l1 = h12 == 1 ? "Es la una" : "Son las " + HORAS[h12];
            l2 = m == 15 ? "y cuarto" : m == 30 ? "y media" : "y " + (m == 1 ? "uno" : MIN[m]);
        } else {
            int sig = h12 % 12 + 1, faltan = 60 - m;
            hMomento = (h24 + 1) % 24;
            if (faltan == 15) { l1 = "Un cuarto para"; l2 = laHora(sig); }
            else if (faltan == 1) { l1 = "Falta un minuto para"; l2 = laHora(sig); }
            else { l1 = "Faltan " + MIN[faltan] + " para"; l2 = laHora(sig); }
        }
        String l3 = hMomento < 5 ? "de la madrugada" : hMomento < 12 ? "de la mañana" : hMomento < 19 ? "de la tarde" : "de la noche";
        SpannableStringBuilder sb = new SpannableStringBuilder();
        sb.append(l1).append("\n");
        int i = sb.length();
        sb.append(l2);
        sb.setSpan(new ForegroundColorSpan(color), i, sb.length(), 0);
        sb.setSpan(new RelativeSizeSpan(1.25f), i, sb.length(), 0);
        sb.append("\n");
        i = sb.length();
        sb.append(l3);
        sb.setSpan(new ForegroundColorSpan(a.MUTED), i, sb.length(), 0);
        sb.setSpan(new RelativeSizeSpan(0.5f), i, sb.length(), 0);
        return sb;
    }

    // ================================================================ analógico Meraki
    static final class Analogico extends View {
        final MainActivity a;
        final int color;
        final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);

        Analogico(MainActivity a, int color) { super(a); this.a = a; this.color = color; }

        @Override protected void onDraw(Canvas c) {
            float w = getWidth(), h = getHeight(), r = Math.min(w, h) / 2f - a.dp(2), cx = w / 2f, cy = h / 2f;
            p.setStyle(Paint.Style.FILL);
            p.setColor(a.CARD);
            c.drawCircle(cx, cy, r, p);
            p.setStyle(Paint.Style.STROKE); p.setStrokeWidth(a.dp(1.2f)); p.setColor(MainActivity.conAlpha(a.acento, 0x66));
            c.drawCircle(cx, cy, r, p);
            // marcas
            p.setStrokeCap(Paint.Cap.ROUND);
            for (int k = 0; k < 60; k++) {
                double ang = Math.toRadians(k * 6 - 90);
                boolean cinco = k % 5 == 0;
                float r1 = r * (cinco ? 0.80f : 0.86f), r2 = r * 0.91f;
                p.setStrokeWidth(a.dp(cinco ? 2.2f : 1f));
                p.setColor(cinco ? a.acento : MainActivity.conAlpha(a.MUTED, 0x88));
                c.drawLine(cx + (float) Math.cos(ang) * r1, cy + (float) Math.sin(ang) * r1, cx + (float) Math.cos(ang) * r2, cy + (float) Math.sin(ang) * r2, p);
            }
            // la M al centro, chiquita
            p.setStyle(Paint.Style.FILL);
            p.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD_ITALIC));
            p.setTextAlign(Paint.Align.CENTER);
            p.setTextSize(r * 0.2f);
            p.setColor(MainActivity.conAlpha(a.acento, 0x99));
            c.drawText("M", cx, cy + r * 0.45f, p);
            // manecillas
            Calendar cal = Calendar.getInstance();
            float min = cal.get(Calendar.MINUTE), hor = cal.get(Calendar.HOUR) + min / 60f;
            p.setStyle(Paint.Style.STROKE);
            p.setStrokeCap(Paint.Cap.ROUND);
            p.setStrokeWidth(a.dp(5));
            p.setColor(color);
            double ah = Math.toRadians(hor * 30 - 90);
            c.drawLine(cx, cy, cx + (float) Math.cos(ah) * r * 0.5f, cy + (float) Math.sin(ah) * r * 0.5f, p);
            p.setStrokeWidth(a.dp(3));
            p.setColor(a.FG);
            double am = Math.toRadians(min * 6 - 90);
            c.drawLine(cx, cy, cx + (float) Math.cos(am) * r * 0.74f, cy + (float) Math.sin(am) * r * 0.74f, p);
            p.setStyle(Paint.Style.FILL);
            p.setColor(a.acento);
            c.drawCircle(cx, cy, a.dp(5), p);
        }
    }

    // ================================================================ panel «Relojes y colores»
    static void abrirPanel(MainActivity a) {
        final FrameLayout capa = new FrameLayout(a);
        capa.setClickable(true);
        a.abrirCapa(capa);
        pintarPanel(a, capa);
    }

    static void pintarPanel(MainActivity a, FrameLayout capa) {
        capa.removeAllViews();
        capa.setBackgroundColor(a.claro ? 0xFFF4F1EA : 0xFF0B0A08);
        ScrollView sv = new ScrollView(a);
        LinearLayout col = new LinearLayout(a);
        col.setOrientation(LinearLayout.VERTICAL);
        col.setPadding(a.dp(18), a.insetArriba + a.dp(16), a.dp(18), a.insetAbajo + a.dp(30));
        sv.addView(col);
        capa.addView(sv, new FrameLayout.LayoutParams(-1, -1));

        LinearLayout cab = new LinearLayout(a);
        cab.setGravity(Gravity.CENTER_VERTICAL);
        LinearLayout tt = new LinearLayout(a);
        tt.setOrientation(LinearLayout.VERTICAL);
        tt.addView(a.etiqueta("Inicio", a.acento));
        tt.addView(a.texto("Relojes y colores", 26, a.FG, a.tf(true)), a.lp(-2, -2, 6));
        cab.addView(tt, new LinearLayout.LayoutParams(0, -2, 1f));
        TextView x = a.texto("✕", 20, a.FG, Typeface.DEFAULT_BOLD);
        x.setGravity(Gravity.CENTER);
        x.setBackground(a.caja(a.CARD, 99, a.LINEA));
        x.setOnClickListener(v -> a.cerrarCapa());
        cab.addView(x, new LinearLayout.LayoutParams(a.dp(44), a.dp(44)));
        col.addView(cab);

        // sugerencias según la foto del bloqueo
        if (new File(a.getFilesDir(), FondoVivo.FOTO).exists() && a.prefs.getLong("bloqueo_foto_v", 0) > 0) {
            TextView sug = a.texto("✨  Sugerencias según tu foto", 15.5f, Musica.Barras.tintaSobre(a.acento), a.tf(true));
            sug.setGravity(Gravity.CENTER);
            sug.setPadding(a.dp(16), a.dp(13), a.dp(16), a.dp(13));
            sug.setBackground(a.caja(a.acento, 99, 0));
            sug.setOnClickListener(v -> Sugerencias.abrir(a));
            col.addView(sug, a.lp(-1, -2, 18));
        }

        col.addView(a.etiqueta("Escogé tu reloj", a.MUTED), a.lp(-2, -2, 22));
        GridLayout g = new GridLayout(a);
        g.setColumnCount(2);
        String act = actual(a);
        int anchoCelda = (a.getResources().getDisplayMetrics().widthPixels - a.dp(36) - a.dp(12)) / 2;
        for (String[] r : LISTA) {
            boolean sel = r[0].equals(act);
            LinearLayout card = new LinearLayout(a);
            card.setOrientation(LinearLayout.VERTICAL);
            card.setPadding(a.dp(10), a.dp(10), a.dp(10), a.dp(12));
            card.setBackground(a.caja(a.CARD, 18, sel ? a.acento : a.LINEA));
            FrameLayout muestra = new FrameLayout(a);
            muestra.setClipChildren(true);
            View v = "clasico".equals(r[0]) ? a.texto("Según tu estilo", 13, a.MUTED, a.tf(false)) : crear(a, r[0], false, 0.42f, a.colorReloj(a.FG), false);
            if (v != null) {
                if ("anillo".equals(r[0])) v.setLayoutParams(new FrameLayout.LayoutParams(-1, a.dp(100), Gravity.CENTER));
                FrameLayout.LayoutParams pm = v.getLayoutParams() instanceof FrameLayout.LayoutParams ? (FrameLayout.LayoutParams) v.getLayoutParams()
                        : new FrameLayout.LayoutParams(v.getLayoutParams() != null ? v.getLayoutParams().width : -2, v.getLayoutParams() != null ? v.getLayoutParams().height : -2, Gravity.CENTER);
                pm.gravity = Gravity.CENTER;
                apagarToques(v);
                muestra.addView(v, pm);
            }
            card.addView(muestra, new LinearLayout.LayoutParams(-1, a.dp(104)));
            card.addView(a.texto((sel ? "✓ " : "") + r[1], 14.5f, sel ? a.acento : a.FG, a.tf(true)), a.lp(-1, -2, 8));
            TextView d = a.texto(r[2], 11.5f, a.MUTED, a.tf(false));
            d.setMaxLines(2);
            card.addView(d, a.lp(-1, -2, 3));
            card.setOnClickListener(z -> {
                a.prefs.edit().putString("reloj_estilo", r[0]).apply();
                a.construirInicio();
                pintarPanel(a, capa);
            });
            GridLayout.LayoutParams gp = new GridLayout.LayoutParams();
            gp.width = anchoCelda; gp.height = -2;
            gp.setMargins(0, a.dp(6), a.dp(6), a.dp(6));
            g.addView(card, gp);
        }
        col.addView(g, a.lp(-1, -2, 8));

        col.addView(a.etiqueta("Colores", a.MUTED), a.lp(-2, -2, 22));
        int[] deFoto = Sugerencias.coloresGuardados(a);
        filaColor(a, col, "Color del reloj", a.prefs.getString("reloj_color", null), a.colorReloj(a.FG), "Automático", deFoto, c -> {
            if (c == null) a.prefs.edit().remove("reloj_color").apply(); else a.prefs.edit().putString("reloj_color", Colores.hex(c)).apply();
            a.aplicarTodo(); pintarPanel(a, capa);
        });
        filaColor(a, col, "Color de los textos", a.prefs.getString("color_texto", null), a.FG, "Según el tema", deFoto, c -> {
            if (c == null) a.prefs.edit().remove("color_texto").apply(); else a.prefs.edit().putString("color_texto", Colores.hex(c)).apply();
            a.aplicarTodo(); pintarPanel(a, capa);
        });
        filaColor(a, col, "El dorado de todo (acento)", a.prefs.getString("acento", "D9B55C"), a.acento, "Oro Meraki", deFoto, c -> {
            a.prefs.edit().putString("acento", c == null ? "D9B55C" : Colores.hex(c)).apply();
            a.aplicarTodo(); pintarPanel(a, capa);
        });
        col.addView(a.texto("El acento se usa en el inicio, el cajón, el Panel Meraki y la pantalla de bloqueo.", 12, a.MUTED, a.tf(false)), a.lp(-1, -2, 10));
    }

    static void filaColor(MainActivity a, LinearLayout col, String nombre, String guardado, int actual, String auto, int[] deFoto, Colores.AlEscoger cb) {
        LinearLayout f = new LinearLayout(a);
        f.setGravity(Gravity.CENTER_VERTICAL);
        f.setPadding(a.dp(14), a.dp(12), a.dp(14), a.dp(12));
        f.setBackground(a.caja(a.CARD, 16, a.LINEA));
        LinearLayout t = new LinearLayout(a);
        t.setOrientation(LinearLayout.VERTICAL);
        t.addView(a.texto(nombre, 15, a.FG, a.tf(true)));
        t.addView(a.texto(guardado == null ? auto : Colores.nombre(actual) + " · #" + Colores.hex(actual), 12, a.MUTED, a.tf(false)), a.lp(-2, -2, 3));
        f.addView(t, new LinearLayout.LayoutParams(0, -2, 1f));
        View m = new View(a);
        m.setBackground(a.caja(actual, 99, 0x55FFFFFF));
        f.addView(m, new LinearLayout.LayoutParams(a.dp(32), a.dp(32)));
        f.setOnClickListener(v -> Colores.elegir(a, nombre, actual, auto, deFoto, cb));
        col.addView(f, a.lp(-1, -2, 8));
    }

    /** En las muestras, tocar el reloj escoge la tarjeta (no abre las alarmas). */
    static void apagarToques(View v) {
        v.setOnClickListener(null);
        v.setClickable(false);
        v.setLongClickable(false);
        if (v instanceof android.view.ViewGroup) {
            android.view.ViewGroup g = (android.view.ViewGroup) v;
            for (int i = 0; i < g.getChildCount(); i++) apagarToques(g.getChildAt(i));
        }
    }

    static boolean h24(Context c) { return DateFormat.is24HourFormat(c); }
    static String dosDigitos(int n) { return String.format(Locale.ROOT, "%02d", n); }
}
