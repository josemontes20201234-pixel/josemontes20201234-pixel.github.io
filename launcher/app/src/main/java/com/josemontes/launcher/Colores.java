package com.josemontes.launcher;

import android.app.AlertDialog;
import android.graphics.Color;
import android.view.Gravity;
import android.view.View;
import android.widget.GridLayout;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.SeekBar;
import android.widget.TextView;

import java.util.Locale;

/** Colores: la paleta para escoger, cuentas de color y el selector (cuadritos + «otro color»). */
final class Colores {
    private Colores() { }

    static final int[] PALETA = {
            0xFFD9B55C, 0xFFE8C77A, 0xFFB8862F, 0xFFF5F1E8, 0xFFFFFFFF, 0xFFE9D8B4,
            0xFFD8443A, 0xFFE57373, 0xFFF29E4C, 0xFFF4D35E, 0xFF6FCF97, 0xFF4DB6AC,
            0xFF3F6FD8, 0xFF64B5F6, 0xFFC9A7FF, 0xFFF48FB1, 0xFFA1887F, 0xFF9E9E9E};

    static String hex(int c) { return String.format(Locale.ROOT, "%06X", c & 0xFFFFFF); }

    static float[] hsl(int c) {
        float r = ((c >> 16) & 255) / 255f, g = ((c >> 8) & 255) / 255f, b = (c & 255) / 255f;
        float max = Math.max(r, Math.max(g, b)), min = Math.min(r, Math.min(g, b)), l = (max + min) / 2f, h = 0, s = 0;
        if (max != min) {
            float d = max - min;
            s = l > 0.5f ? d / (2f - max - min) : d / (max + min);
            if (max == r) h = ((g - b) / d + (g < b ? 6 : 0));
            else if (max == g) h = (b - r) / d + 2;
            else h = (r - g) / d + 4;
            h *= 60f;
        }
        return new float[]{h, s, l};
    }

    static int deHsl(float h, float s, float l) {
        float c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60f) % 2 - 1)), m = l - c / 2f;
        float r, g, b;
        if (h < 60) { r = c; g = x; b = 0; } else if (h < 120) { r = x; g = c; b = 0; } else if (h < 180) { r = 0; g = c; b = x; }
        else if (h < 240) { r = 0; g = x; b = c; } else if (h < 300) { r = x; g = 0; b = c; } else { r = c; g = 0; b = x; }
        return Color.rgb(Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255));
    }

    static double luz(int c) { return (0.299 * ((c >> 16) & 255) + 0.587 * ((c >> 8) & 255) + 0.114 * (c & 255)) / 255.0; }

    static int mezclar(int a, int b, float t) {
        int r = Math.round(((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t);
        int g = Math.round(((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t);
        int bl = Math.round((a & 255) * (1 - t) + (b & 255) * t);
        return Color.rgb(r, g, bl);
    }

    /** Que se lea bien sobre fondo oscuro: ni muy apagado ni chillón. */
    static int paraFondoOscuro(int c) {
        float[] x = hsl(c);
        return deHsl(x[0], Math.max(0.3f, Math.min(0.75f, x[1])), Math.max(0.62f, Math.min(0.76f, x[2])));
    }

    /** Un tono claro y suave del color (crema, perla…). */
    static int suave(int c) {
        float[] x = hsl(c);
        return deHsl(x[0], Math.min(0.35f, x[1]), 0.86f);
    }

    static int oscuroDe(int c) {
        float[] x = hsl(c);
        return deHsl(x[0], Math.min(0.45f, x[1]), 0.16f);
    }

    /** El nombre del color en español, para decirle qué escoger en Samsung. */
    static String nombre(int c) {
        float[] x = hsl(c);
        float h = x[0], s = x[1], l = x[2];
        if (l > 0.93f) return "blanco";
        if (l < 0.13f) return "negro";
        if (s < 0.14f) return l > 0.7f ? "blanco hueso" : l > 0.35f ? "gris" : "gris oscuro";
        if (l > 0.8f && s < 0.5f && h >= 20 && h <= 60) return "crema";
        if (h < 15 || h >= 345) return l < 0.35f ? "vino" : "rojo";
        if (h < 40) return l < 0.4f ? "café" : "naranja";
        if (h < 52) return "dorado";
        if (h < 68) return "amarillo";
        if (h < 160) return "verde";
        if (h < 195) return "turquesa";
        if (h < 255) return "azul";
        if (h < 290) return "morado";
        return "rosado";
    }

    interface AlEscoger { void escogido(Integer color); }

    /** Cuadritos de colores, los de tu foto (si hay) y «otro color» con dos barras. */
    static void elegir(MainActivity a, String titulo, int actual, String textoAuto, int[] deFoto, AlEscoger cb) {
        final int[] sel = {actual};
        LinearLayout col = new LinearLayout(a);
        col.setOrientation(LinearLayout.VERTICAL);
        col.setPadding(a.dp(22), a.dp(10), a.dp(22), a.dp(6));

        final View muestra = new View(a);
        final TextView nom = a.texto("", 13, a.MUTED, a.tf(false));
        Runnable pintar = () -> { muestra.setBackground(a.caja(sel[0], 14, 0x33FFFFFF)); nom.setText(nombre(sel[0]) + "  ·  #" + hex(sel[0])); };
        col.addView(muestra, new LinearLayout.LayoutParams(-1, a.dp(46)));
        col.addView(nom, a.lp(-1, -2, 6));

        if (deFoto != null && deFoto.length > 0) {
            col.addView(a.etiqueta("De tu foto", a.acento), a.lp(-2, -2, 16));
            col.addView(cuadritos(a, deFoto, sel, pintar), a.lp(-1, -2, 8));
        }
        col.addView(a.etiqueta("Colores", a.acento), a.lp(-2, -2, 16));
        col.addView(cuadritos(a, PALETA, sel, pintar), a.lp(-1, -2, 8));

        col.addView(a.etiqueta("Otro color", a.acento), a.lp(-2, -2, 16));
        float[] x = hsl(actual);
        final SeekBar tono = new SeekBar(a), clar = new SeekBar(a);
        tono.setMax(359); tono.setProgress(Math.round(x[0]));
        clar.setMax(80); clar.setProgress(Math.max(0, Math.min(80, Math.round(x[2] * 100) - 15)));
        SeekBar.OnSeekBarChangeListener l = new SeekBar.OnSeekBarChangeListener() {
            @Override public void onProgressChanged(SeekBar s, int p, boolean user) {
                if (!user) return;
                sel[0] = deHsl(tono.getProgress(), 0.6f, (clar.getProgress() + 15) / 100f);
                pintar.run();
            }
            @Override public void onStartTrackingTouch(SeekBar s) { }
            @Override public void onStopTrackingTouch(SeekBar s) { }
        };
        tono.setOnSeekBarChangeListener(l); clar.setOnSeekBarChangeListener(l);
        col.addView(a.texto("Tono", 12.5f, a.MUTED, a.tf(false)), a.lp(-2, -2, 8));
        col.addView(tono, a.lp(-1, -2, 2));
        col.addView(a.texto("Claridad", 12.5f, a.MUTED, a.tf(false)), a.lp(-2, -2, 8));
        col.addView(clar, a.lp(-1, -2, 2));
        pintar.run();

        ScrollView sv = new ScrollView(a);
        sv.addView(col);
        AlertDialog.Builder b = a.dialogo().setTitle(titulo).setView(sv)
                .setPositiveButton("Usar", (d, w) -> cb.escogido(sel[0]))
                .setNegativeButton("Cancelar", null);
        if (textoAuto != null) b.setNeutralButton(textoAuto, (d, w) -> cb.escogido(null));
        b.show();
    }

    static View cuadritos(MainActivity a, int[] colores, int[] sel, Runnable pintar) {
        GridLayout g = new GridLayout(a);
        g.setColumnCount(6);
        for (int c : colores) {
            View v = new View(a);
            v.setBackground(a.caja(c, 99, 0x55FFFFFF));
            v.setContentDescription(nombre(c));
            v.setOnClickListener(x -> { sel[0] = c; pintar.run(); });
            GridLayout.LayoutParams p = new GridLayout.LayoutParams();
            p.width = a.dp(36); p.height = a.dp(36);
            p.setMargins(a.dp(4), a.dp(4), a.dp(4), a.dp(4));
            p.setGravity(Gravity.CENTER);
            g.addView(v, p);
        }
        return g;
    }
}
