package com.josemontes.launcher;

import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Outline;
import android.os.Handler;
import android.os.Looper;
import android.text.TextUtils;
import android.view.Gravity;
import android.view.View;
import android.view.ViewOutlineProvider;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * La canción que suena y su tarjetita con ⏮ ⏯ ⏭.
 * Meraki Panel la lee (con el acceso a notificaciones) y se la pasa al launcher; este archivo lo usan los dos.
 */
final class Musica {
    private Musica() { }

    static final String PERMISO = "com.josemontes.launcher.permission.PANEL";
    static final String LAUNCHER = "com.josemontes.launcher", PANEL = "com.josemontes.panel";
    /** Meraki Panel → launcher: lo que suena. */
    static final String ACCION_ESTADO = "com.josemontes.launcher.MUSICA";
    /** Launcher → Meraki Panel: pedir lo que suena o tocar un control. */
    static final String ACCION_CONTROL = "com.josemontes.panel.MUSICA";

    static final class Estado {
        String titulo = "", artista = "", pkg = "", app = "";
        boolean sonando;
        Bitmap arte;

        boolean igual(Estado o) {
            return o != null && titulo.equals(o.titulo) && artista.equals(o.artista) && pkg.equals(o.pkg) && sonando == o.sonando
                    && (arte == null) == (o.arte == null) && (arte == null || arte.getWidth() == o.arte.getWidth() && arte.getHeight() == o.arte.getHeight());
        }
    }

    static volatile Estado actual;
    static final List<Runnable> oyentes = new CopyOnWriteArrayList<>();
    static final Handler ui = new Handler(Looper.getMainLooper());

    static void poner(Estado e) {
        actual = e;
        ui.post(() -> { for (Runnable r : oyentes) try { r.run(); } catch (Exception x) { } });
    }

    static Intent aIntent(Estado e) {
        Intent i = new Intent(ACCION_ESTADO).setPackage(LAUNCHER);
        if (e == null) return i.putExtra("nada", true);
        i.putExtra("t", e.titulo).putExtra("ar", e.artista).putExtra("pkg", e.pkg).putExtra("app", e.app).putExtra("son", e.sonando);
        if (e.arte != null) {
            try {
                ByteArrayOutputStream o = new ByteArrayOutputStream();
                e.arte.compress(Bitmap.CompressFormat.JPEG, 82, o);
                i.putExtra("arte", o.toByteArray());
            } catch (Exception x) { }
        }
        return i;
    }

    static Estado deIntent(Intent i) {
        if (i == null || i.getBooleanExtra("nada", false)) return null;
        Estado e = new Estado();
        e.titulo = n(i.getStringExtra("t")); e.artista = n(i.getStringExtra("ar"));
        e.pkg = n(i.getStringExtra("pkg")); e.app = n(i.getStringExtra("app"));
        e.sonando = i.getBooleanExtra("son", false);
        byte[] b = i.getByteArrayExtra("arte");
        if (b != null) try { e.arte = BitmapFactory.decodeByteArray(b, 0, b.length); } catch (Exception x) { }
        return e;
    }

    static String n(String s) { return s == null ? "" : s; }

    static Bitmap achicar(Bitmap b) {
        if (b == null) return null;
        try {
            int max = 192, w = b.getWidth(), h = b.getHeight();
            if (w <= max && h <= max) return b.copy(Bitmap.Config.ARGB_8888, false);
            float k = (float) max / Math.max(w, h);
            return Bitmap.createScaledBitmap(b, Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k)), true);
        } catch (Exception x) { return null; }
    }

    // ================================================================ la tarjetita
    static final String G_ANTERIOR = "M19 20L9 12l10-8z M5 19V5";
    static final String G_SIGUIENTE = "M5 4l10 8-10 8z M19 5v14";
    static final String G_PLAY = "M7 4.5l13 7.5-13 7.5z";
    static final String G_PAUSA = "M8 5v14 M16 5v14";
    static final String G_NOTA = "M9 18V5l12-2v13 M9 18a3 3 0 1 1-6 0a3 3 0 1 1 6 0z M21 16a3 3 0 1 1-6 0a3 3 0 1 1 6 0z";

    /** Carátula, canción y controles. Tocarla abre la app que está sonando. */
    static View tarjeta(MainActivity a, Estado e, int fg, int sub, int fondo, int borde, int acento, Runnable despuesDeAbrir) {
        LinearLayout c = new LinearLayout(a);
        c.setGravity(Gravity.CENTER_VERTICAL);
        c.setPadding(a.dp(12), a.dp(10), a.dp(10), a.dp(10));
        c.setBackground(a.caja(fondo, 18, borde));

        FrameLayout portada = new FrameLayout(a);
        portada.setBackground(a.caja(MainActivity.conAlpha(fg, 0x1A), 12, 0));
        final int r = a.dp(12);
        portada.setOutlineProvider(new ViewOutlineProvider() {
            @Override public void getOutline(View v, Outline o) { o.setRoundRect(0, 0, v.getWidth(), v.getHeight(), r); }
        });
        portada.setClipToOutline(true);
        if (e.arte != null) {
            ImageView iv = new ImageView(a);
            iv.setScaleType(ImageView.ScaleType.CENTER_CROP);
            iv.setImageBitmap(e.arte);
            portada.addView(iv, new FrameLayout.LayoutParams(-1, -1));
        } else portada.addView(new Panel.Glifo(a, G_NOTA, sub), new FrameLayout.LayoutParams(a.dp(24), a.dp(24), Gravity.CENTER));
        c.addView(portada, new LinearLayout.LayoutParams(a.dp(50), a.dp(50)));

        LinearLayout tx = new LinearLayout(a);
        tx.setOrientation(LinearLayout.VERTICAL);
        TextView t = a.texto(e.titulo.isEmpty() ? "Sonando" : e.titulo, 15, fg, a.tf(true));
        t.setMaxLines(1); t.setEllipsize(TextUtils.TruncateAt.END);
        tx.addView(t);
        String linea = e.artista.isEmpty() ? e.app : e.app.isEmpty() ? e.artista : e.artista + "  ·  " + e.app;
        TextView s = a.texto(linea, 12.5f, sub, a.tf(false));
        s.setMaxLines(1); s.setEllipsize(TextUtils.TruncateAt.END);
        LinearLayout.LayoutParams ps = new LinearLayout.LayoutParams(-1, -2); ps.topMargin = a.dp(4);
        tx.addView(s, ps);
        LinearLayout.LayoutParams pt = new LinearLayout.LayoutParams(0, -2, 1f); pt.leftMargin = a.dp(12); pt.rightMargin = a.dp(4);
        c.addView(tx, pt);

        c.addView(control(a, G_ANTERIOR, fg, 0, "Anterior", () -> a.musicaControl("anterior")), new LinearLayout.LayoutParams(a.dp(38), a.dp(42)));
        final boolean[] son = {e.sonando};
        int tinta = Barras.tintaSobre(acento);
        final FrameLayout play = control(a, son[0] ? G_PAUSA : G_PLAY, tinta, acento, son[0] ? "Pausar" : "Reproducir", null);
        play.setOnClickListener(v -> {
            son[0] = !son[0];
            ((Panel.Glifo) play.getChildAt(0)).ruta(son[0] ? G_PAUSA : G_PLAY);
            play.setContentDescription(son[0] ? "Pausar" : "Reproducir");
            a.musicaControl(son[0] ? "play" : "pausa");
        });
        LinearLayout.LayoutParams pp = new LinearLayout.LayoutParams(a.dp(44), a.dp(44)); pp.leftMargin = a.dp(2); pp.rightMargin = a.dp(2);
        c.addView(play, pp);
        c.addView(control(a, G_SIGUIENTE, fg, 0, "Siguiente", () -> a.musicaControl("siguiente")), new LinearLayout.LayoutParams(a.dp(38), a.dp(42)));

        c.setOnClickListener(v -> { a.musicaControl("abrir"); if (despuesDeAbrir != null) despuesDeAbrir.run(); });
        return c;
    }

    static FrameLayout control(MainActivity a, String glifo, int color, int fondo, String desc, Runnable r) {
        FrameLayout f = new FrameLayout(a);
        if (fondo != 0) f.setBackground(a.caja(fondo, 99, 0));
        Panel.Glifo g = new Panel.Glifo(a, glifo, color);
        f.addView(g, new FrameLayout.LayoutParams(a.dp(fondo != 0 ? 20 : 22), a.dp(fondo != 0 ? 20 : 22), Gravity.CENTER));
        f.setContentDescription(desc);
        if (r != null) f.setOnClickListener(v -> r.run());
        return f;
    }

    /** Texto oscuro o claro según el color de fondo. */
    static final class Barras {
        static int tintaSobre(int c) {
            double l = (0.299 * ((c >> 16) & 255) + 0.587 * ((c >> 8) & 255) + 0.114 * (c & 255)) / 255.0;
            return l > 0.6 ? 0xFF141414 : 0xFFFFFFFF;
        }
    }
}
