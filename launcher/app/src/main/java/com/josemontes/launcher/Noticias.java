package com.josemontes.launcher;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Outline;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.text.Html;
import android.text.TextUtils;
import android.util.LruCache;
import android.util.Xml;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewOutlineProvider;
import android.view.animation.DecelerateInterpolator;
import android.widget.FrameLayout;
import android.widget.HorizontalScrollView;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;
import org.xmlpull.v1.XmlPullParser;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TimeZone;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Página de noticias: sale desde el borde siguiendo el dedo, como la de Samsung.
 * CNN (español e inglés), Forbes (Centroamérica y EE. UU.) y el noticiero Mundo Cristiano de CBN.
 */
class Noticias {
    final MainActivity a;
    Noticias(MainActivity a) { this.a = a; }

    // ================================================================ fuentes
    static final String GN = "https://news.google.com/rss/search?";
    static class Fuente {
        final String id, nombre, corto; final int color; final String[] urls;
        Fuente(String id, String nombre, String corto, int color, String... urls) { this.id = id; this.nombre = nombre; this.corto = corto; this.color = color; this.urls = urls; }
    }
    /** CNN ya no tiene canal propio que funcione: se lee por Google Noticias filtrado a su sitio. Forbes y CBN sí tienen el suyo. */
    static final Fuente[] FUENTES = {
            new Fuente("cnne", "CNN en Español", "CNN en Español", 0xFFE5483F,
                    GN + "q=when:2d+site:cnnespanol.cnn.com&hl=es-419&gl=US&ceid=US:es-419"),
            new Fuente("cnn", "CNN (inglés)", "CNN", 0xFFE5483F,
                    GN + "q=when:1d+site:cnn.com+-site:cnnespanol.cnn.com+-intitle:sitemap&hl=en-US&gl=US&ceid=US:en"),
            new Fuente("forbesca", "Forbes Centroamérica", "Forbes Centroamérica", 0xFF5B8DEF,
                    "https://forbescentroamerica.com/feed/",
                    GN + "q=when:7d+site:forbescentroamerica.com&hl=es-419&gl=US&ceid=US:es-419"),
            new Fuente("forbes", "Forbes (EE. UU.)", "Forbes", 0xFF5B8DEF,
                    "https://www.forbes.com/business/feed/",
                    GN + "q=when:2d+site:forbes.com&hl=en-US&gl=US&ceid=US:en"),
            new Fuente("mc", "Mundo Cristiano (CBN)", "Mundo Cristiano", 0,
                    "https://podcast.cbn.com/CBN_Video_Podcast_Mundo_Cristiano.aspx",
                    "http://podcast.cbn.com/CBN_Video_Podcast_Mundo_Cristiano.aspx"),
    };
    static final int POR_FUENTE = 15;

    static Fuente fuente(String id) { for (Fuente f : FUENTES) if (f.id.equals(id)) return f; return null; }

    Set<String> activas() {
        String s = a.prefs.getString("noticias_fuentes", null);
        Set<String> r = new HashSet<>();
        if (s == null) { for (Fuente f : FUENTES) r.add(f.id); return r; }
        for (String k : s.split(",")) if (!k.isEmpty()) r.add(k);
        return r;
    }

    void elegirFuentes() {
        Set<String> act = activas();
        String[] n = new String[FUENTES.length];
        boolean[] sel = new boolean[FUENTES.length];
        for (int i = 0; i < FUENTES.length; i++) { n[i] = FUENTES[i].nombre; sel[i] = act.contains(FUENTES[i].id); }
        a.dialogo().setTitle("Fuentes de noticias").setMultiChoiceItems(n, sel, (d, w, c) -> sel[w] = c).setPositiveButton("Guardar", (d, w) -> {
            List<String> k = new ArrayList<>();
            for (int i = 0; i < FUENTES.length; i++) if (sel[i]) k.add(FUENTES[i].id);
            a.prefs.edit().putString("noticias_fuentes", TextUtils.join(",", k)).putLong("noticias_leido", 0).apply();
            if (!k.contains(filtro) && !"todas".equals(filtro)) filtro = "todas";
            if (a.ajustes.getVisibility() == View.VISIBLE) a.construirAjustes();
            if (abierta()) { pintar(); actualizar(true); }
        }).setNegativeButton("Cancelar", null).show();
    }

    // ================================================================ notas
    static class Nota {
        String fuente, titulo, link, img, resumen, video, dur;
        long fecha;
        JSONObject json() throws Exception {
            JSONObject o = new JSONObject();
            o.put("t", titulo); o.put("l", link); o.put("f", fecha);
            if (img != null) o.put("i", img);
            if (resumen != null) o.put("r", resumen);
            if (video != null) o.put("v", video);
            if (dur != null) o.put("d", dur);
            return o;
        }
        static Nota de(String fuente, JSONObject o) {
            Nota n = new Nota();
            n.fuente = fuente; n.titulo = o.optString("t"); n.link = o.optString("l"); n.fecha = o.optLong("f");
            n.img = o.has("i") ? o.optString("i") : null; n.resumen = o.has("r") ? o.optString("r") : null;
            n.video = o.has("v") ? o.optString("v") : null; n.dur = o.has("d") ? o.optString("d") : null;
            return n;
        }
    }

    final Map<String, List<Nota>> porFuente = new HashMap<>();
    final Set<String> fallaron = new HashSet<>();
    boolean cacheLeida, cargando;

    File archivo() { return new File(a.getFilesDir(), "noticias.json"); }

    void leerCache() {
        if (cacheLeida) return;
        cacheLeida = true;
        try {
            JSONObject o = new JSONObject(new String(leer(archivo()), "UTF-8"));
            for (Fuente f : FUENTES) {
                JSONArray arr = o.optJSONArray(f.id);
                if (arr == null) continue;
                List<Nota> l = new ArrayList<>();
                for (int i = 0; i < arr.length(); i++) l.add(Nota.de(f.id, arr.getJSONObject(i)));
                porFuente.put(f.id, l);
            }
        } catch (Exception e) { }
    }

    void guardarCache() {
        try {
            JSONObject o = new JSONObject();
            for (Map.Entry<String, List<Nota>> e : porFuente.entrySet()) {
                JSONArray arr = new JSONArray();
                for (Nota n : e.getValue()) arr.put(n.json());
                o.put(e.getKey(), arr);
            }
            FileOutputStream out = new FileOutputStream(archivo());
            out.write(o.toString().getBytes("UTF-8"));
            out.close();
        } catch (Exception e) { }
    }

    /** Baja las fuentes activas (todas a la vez). Sin forzar, espera 15 minutos entre una y otra. */
    void actualizar(boolean forzar) {
        if (cargando) return;
        leerCache();
        long ult = a.prefs.getLong("noticias_leido", 0);
        if (!forzar && System.currentTimeMillis() - ult < 15 * 60_000L && !porFuente.isEmpty()) return;
        cargando = true;
        pintarEstado();
        final Set<String> act = activas();
        new Thread(() -> {
            ExecutorService red = Executors.newFixedThreadPool(5);
            List<Callable<Object[]>> tareas = new ArrayList<>();
            for (Fuente f : FUENTES) if (act.contains(f.id)) tareas.add(() -> new Object[]{f.id, bajarFuente(f)});
            final Map<String, List<Nota>> nuevas = new HashMap<>();
            final Set<String> malas = new HashSet<>();
            try {
                for (java.util.concurrent.Future<Object[]> fu : red.invokeAll(tareas)) {
                    try {
                        Object[] r = fu.get();
                        @SuppressWarnings("unchecked") List<Nota> l = (List<Nota>) r[1];
                        if (l == null || l.isEmpty()) malas.add((String) r[0]); else nuevas.put((String) r[0], l);
                    } catch (Exception e) { }
                }
            } catch (Exception e) { }
            red.shutdown();
            limpiarImagenesViejas();
            a.ui.post(() -> {
                cargando = false;
                porFuente.putAll(nuevas);
                fallaron.clear(); fallaron.addAll(malas);
                if (!nuevas.isEmpty()) { guardarCache(); a.prefs.edit().putLong("noticias_leido", System.currentTimeMillis()).apply(); }
                if (abierta()) pintar();
            });
        }).start();
    }

    List<Nota> bajarFuente(Fuente f) {
        for (String u : f.urls) {
            try {
                List<Nota> l = parsear(bajar(u, 4_000_000), f.id);
                if (l.isEmpty()) continue;
                Collections.sort(l, (x, y) -> Long.compare(y.fecha, x.fecha));
                return l.size() > POR_FUENTE ? new ArrayList<>(l.subList(0, POR_FUENTE)) : l;
            } catch (Exception e) { }
        }
        return null;
    }

    static final String UA = "Mozilla/5.0 (Linux; Android 14; SM-A346M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";

    static byte[] bajar(String u, int max) throws IOException {
        for (int i = 0; i < 6; i++) {
            HttpURLConnection c = (HttpURLConnection) new URL(u).openConnection();
            c.setConnectTimeout(9000); c.setReadTimeout(15000);
            c.setInstanceFollowRedirects(false);
            c.setRequestProperty("User-Agent", UA);
            c.setRequestProperty("Accept-Language", "es-419,es;q=0.9,en;q=0.8");
            int code = c.getResponseCode();
            if (code >= 300 && code < 400) {
                String loc = c.getHeaderField("Location");
                c.disconnect();
                if (loc == null) throw new IOException("sin destino");
                u = new URL(new URL(u), loc).toString();
                continue;
            }
            if (code != 200) { c.disconnect(); throw new IOException("HTTP " + code); }
            try (InputStream in = c.getInputStream()) {
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                byte[] b = new byte[16384]; int n;
                while ((n = in.read(b)) > 0) { out.write(b, 0, n); if (out.size() > max) break; }
                return out.toByteArray();
            } finally { c.disconnect(); }
        }
        throw new IOException("demasiadas vueltas");
    }

    // ================================================================ lector de RSS / Atom
    static final Pattern IMG = Pattern.compile("<img[^>]+src=[\"']([^\"']+)[\"']", Pattern.CASE_INSENSITIVE);
    static final Pattern FECHA_TITULO = Pattern.compile("(\\d{1,2})/(\\d{1,2})/(\\d{2,4})");

    static List<Nota> parsear(byte[] data, String fuente) throws Exception {
        XmlPullParser p = Xml.newPullParser();
        try { p.setFeature("http://xmlpull.org/v1/doc/features.html#relaxed", true); } catch (Exception e) { }
        p.setInput(new ByteArrayInputStream(data), null);
        List<Nota> r = new ArrayList<>();
        Set<String> vistos = new HashSet<>();
        Nota n = null; String medio = null;
        try {
            int ev = p.getEventType();
            while (ev != XmlPullParser.END_DOCUMENT) {
                if (ev == XmlPullParser.START_TAG) {
                    String t = p.getName() == null ? "" : p.getName().toLowerCase(Locale.ROOT);
                    if (t.equals("item") || t.equals("entry")) { n = new Nota(); n.fuente = fuente; medio = null; }
                    else if (n != null) switch (t) {
                        case "title": n.titulo = limpio(texto(p)); break;
                        case "link": {
                            String h = p.getAttributeValue(null, "href");
                            if (h != null) { String rel = p.getAttributeValue(null, "rel"); if (n.link == null && (rel == null || rel.equals("alternate"))) n.link = h; }
                            else { String s = texto(p).trim(); if (!s.isEmpty()) n.link = s; }
                            break;
                        }
                        case "pubdate": case "published": case "updated": case "dc:date":
                            if (n.fecha == 0) n.fecha = fecha(texto(p).trim()); break;
                        case "description": case "summary": case "content:encoded": case "content": {
                            String h = texto(p);
                            if (n.img == null) { Matcher m = IMG.matcher(h); if (m.find()) n.img = Html.fromHtml(m.group(1), Html.FROM_HTML_MODE_LEGACY).toString(); }
                            if (n.resumen == null || n.resumen.isEmpty() || t.equals("description")) { String s = limpio(h); if (!s.isEmpty()) n.resumen = s; }
                            break;
                        }
                        case "media:thumbnail": if (n.img == null) n.img = p.getAttributeValue(null, "url"); break;
                        case "media:content": case "enclosure": {
                            String u = p.getAttributeValue(null, "url"), ty = p.getAttributeValue(null, "type"), me = p.getAttributeValue(null, "medium");
                            if (u == null) break;
                            boolean img = (ty != null && ty.startsWith("image")) || "image".equals(me) || (ty == null && me == null && esImagen(u));
                            boolean vid = (ty != null && (ty.startsWith("video") || ty.startsWith("audio"))) || "video".equals(me) || esVideo(u);
                            if (img) { if (n.img == null) n.img = u; } else if (vid && n.video == null) n.video = u;
                            break;
                        }
                        case "itunes:image": if (n.img == null) n.img = p.getAttributeValue(null, "href"); break;
                        case "itunes:duration": n.dur = texto(p).trim(); break;
                        case "itunes:summary": case "itunes:subtitle": if (n.resumen == null || n.resumen.isEmpty()) n.resumen = limpio(texto(p)); break;
                        case "source": medio = texto(p).trim(); break;
                    }
                } else if (ev == XmlPullParser.END_TAG && n != null) {
                    String t = p.getName() == null ? "" : p.getName().toLowerCase(Locale.ROOT);
                    if (t.equals("item") || t.equals("entry")) {
                        if (n.titulo != null && !n.titulo.isEmpty() && n.link != null) {
                            // Google Noticias pone « - CNN en Español» al final del título
                            if (medio != null && n.titulo.endsWith(" - " + medio)) n.titulo = n.titulo.substring(0, n.titulo.length() - medio.length() - 3).trim();
                            if (n.link.contains("news.google.com")) n.resumen = null; // su resumen sólo repite el título
                            if (n.fecha == 0) { Matcher m = FECHA_TITULO.matcher(n.titulo); if (m.find()) n.fecha = fechaTitulo(m); }
                            if (n.resumen != null && n.resumen.length() > 400) n.resumen = n.resumen.substring(0, 400).trim() + "…";
                            if (vistos.add(n.titulo.toLowerCase(Locale.ROOT))) r.add(n);
                        }
                        n = null;
                    }
                }
                ev = p.next();
            }
        } catch (Exception e) { if (r.isEmpty()) throw e; }
        return r;
    }

    /** Todo el texto de un elemento, aunque traiga etiquetas adentro. */
    static String texto(XmlPullParser p) throws Exception {
        StringBuilder sb = new StringBuilder();
        int d = p.getDepth();
        while (true) {
            int e = p.next();
            if (e == XmlPullParser.TEXT) sb.append(p.getText());
            else if (e == XmlPullParser.END_TAG && p.getDepth() == d) break;
            else if (e == XmlPullParser.END_DOCUMENT) break;
        }
        return sb.toString();
    }

    static String limpio(String html) {
        if (html == null) return "";
        String s = html.indexOf('<') >= 0 || html.indexOf('&') >= 0 ? Html.fromHtml(html, Html.FROM_HTML_MODE_LEGACY).toString() : html;
        return s.replace('￼', ' ').replaceAll("\\s+", " ").trim();
    }

    static boolean esImagen(String u) { String s = u.toLowerCase(Locale.ROOT); return s.contains(".jpg") || s.contains(".jpeg") || s.contains(".png") || s.contains(".webp") || s.contains("format=jpg"); }
    static boolean esVideo(String u) { String s = u.toLowerCase(Locale.ROOT); return s.contains(".mp4") || s.contains(".m4v") || s.contains(".mov") || s.contains(".m3u8"); }

    static final String[] FORMATOS = {"EEE, dd MMM yyyy HH:mm:ss Z", "EEE, d MMM yyyy HH:mm:ss Z", "EEE, dd MMM yyyy HH:mm:ss zzz", "EEE, d MMM yyyy HH:mm:ss zzz",
            "EEE, dd MMM yyyy HH:mm Z", "dd MMM yyyy HH:mm:ss Z", "yyyy-MM-dd'T'HH:mm:ss.SSSXXX", "yyyy-MM-dd'T'HH:mm:ssXXX", "yyyy-MM-dd'T'HH:mm:ss", "yyyy-MM-dd HH:mm:ss", "yyyy-MM-dd"};

    static long fecha(String s) {
        if (s == null || s.isEmpty()) return 0;
        for (String f : FORMATOS) {
            try {
                SimpleDateFormat sdf = new SimpleDateFormat(f, Locale.US);
                if (!f.contains("Z") && !f.contains("X") && !f.contains("z")) sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
                Date d = sdf.parse(s);
                if (d != null) return d.getTime();
            } catch (Exception e) { }
        }
        return 0;
    }

    /** «Mundo Cristiano - 11/05/26» → 5 de noviembre de 2026 (mes/día/año, como en EE. UU.). */
    static long fechaTitulo(Matcher m) {
        try {
            int mes = Integer.parseInt(m.group(1)), dia = Integer.parseInt(m.group(2)), an = Integer.parseInt(m.group(3));
            if (an < 100) an += 2000;
            if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return 0;
            Calendar c = Calendar.getInstance(); c.clear(); c.set(an, mes - 1, dia, 12, 0);
            return c.getTimeInMillis();
        } catch (Exception e) { return 0; }
    }

    // ================================================================ fotos chicas
    final LruCache<String, Bitmap> fotos = new LruCache<String, Bitmap>(16 * 1024 * 1024) {
        @Override protected int sizeOf(String k, Bitmap b) { return b.getByteCount(); }
    };
    final ExecutorService hilos = Executors.newFixedThreadPool(3);

    File carpetaFotos() { File d = new File(a.getCacheDir(), "noticias"); if (!d.exists()) d.mkdirs(); return d; }

    void limpiarImagenesViejas() {
        try {
            long lim = System.currentTimeMillis() - 4 * 86_400_000L;
            File[] fs = carpetaFotos().listFiles();
            if (fs != null) for (File f : fs) if (f.lastModified() < lim) f.delete();
        } catch (Exception e) { }
    }

    void cargarFoto(ImageView iv, String url, int lado) {
        iv.setTag(url);
        Bitmap b = fotos.get(url);
        if (b != null) { iv.setImageBitmap(b); return; }
        hilos.execute(() -> {
            Bitmap bm = null;
            try {
                File f = new File(carpetaFotos(), Integer.toHexString(url.hashCode()) + "_" + url.length());
                byte[] d = f.exists() ? leer(f) : null;
                if (d == null || d.length == 0) {
                    d = bajar(url, 3_000_000);
                    try (FileOutputStream out = new FileOutputStream(f)) { out.write(d); }
                }
                BitmapFactory.Options o = new BitmapFactory.Options();
                o.inJustDecodeBounds = true;
                BitmapFactory.decodeByteArray(d, 0, d.length, o);
                int s = 1;
                while (o.outWidth / (s * 2) >= lado && o.outHeight / (s * 2) >= lado) s *= 2;
                BitmapFactory.Options o2 = new BitmapFactory.Options();
                o2.inSampleSize = s;
                bm = BitmapFactory.decodeByteArray(d, 0, d.length, o2);
            } catch (Exception e) { }
            final Bitmap fb = bm;
            if (fb != null) fotos.put(url, fb);
            a.ui.post(() -> {
                if (!url.equals(iv.getTag())) return;
                if (fb == null) { iv.setVisibility(View.GONE); return; }
                iv.setImageBitmap(fb);
                iv.setAlpha(0f); iv.animate().alpha(1f).setDuration(160).start();
            });
        });
    }

    static byte[] leer(File f) throws IOException {
        try (FileInputStream in = new FileInputStream(f)) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] b = new byte[16384]; int n;
            while ((n = in.read(b)) > 0) out.write(b, 0, n);
            return out.toByteArray();
        }
    }

    // ================================================================ la página
    Capa capa;
    LinearLayout lista, chips;
    HorizontalScrollView chipsScroll;
    ScrollView scroll;
    TextView estado;
    String filtro = "todas";
    int dir = 1; // 1: sale desde la izquierda (dedo a la derecha); -1: desde la derecha

    boolean abierta() { return capa != null && capa.getParent() != null; }
    int ancho() { int w = a.root.getWidth(); return w > 0 ? w : a.getResources().getDisplayMetrics().widthPixels; }

    int fg() { return a.FG; }
    int sub() { return a.MUTED; }
    int suave() { return a.claro ? 0x12000000 : 0x16FFFFFF; }
    int raya() { return a.claro ? 0x14000000 : 0x14FFFFFF; }
    int colorDe(Fuente f) { return f == null || f.color == 0 ? a.acento : f.color; }

    void crear() {
        if (abierta()) return;
        a.cerrarCajon();
        if (a.panel != null && a.panel.abierto()) a.panel.cerrar();
        leerCache();
        capa = new Capa();
        capa.setClickable(true);
        capa.setBackground(new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM,
                a.claro ? new int[]{0xFFF8F5EF, 0xFFEDE8DE} : new int[]{0xFF1C1A16, 0xFF0B0A08}));
        capa.setElevation(a.dp(12));
        LinearLayout col = new LinearLayout(a);
        col.setOrientation(LinearLayout.VERTICAL);
        col.setPadding(0, a.insetArriba, 0, 0);
        capa.addView(col, new FrameLayout.LayoutParams(-1, -1));

        // cabecera: fecha y botón para actualizar
        LinearLayout cab = new LinearLayout(a);
        cab.setGravity(Gravity.CENTER_VERTICAL);
        cab.setPadding(a.dp(22), a.dp(18), a.dp(14), 0);
        LinearLayout tit = new LinearLayout(a);
        tit.setOrientation(LinearLayout.VERTICAL);
        tit.addView(a.etiqueta("Noticias", a.acento));
        tit.addView(a.texto(MainActivity.mayus1(new SimpleDateFormat("EEEE d 'de' MMMM", MainActivity.ES).format(new Date())), 24, fg(), a.tf(true)), a.lp(-2, -2, 8));
        cab.addView(tit, new LinearLayout.LayoutParams(0, -2, 1f));
        TextView recargar = a.texto("↻", 22, fg(), Typeface.DEFAULT_BOLD);
        recargar.setGravity(Gravity.CENTER);
        recargar.setBackground(a.caja(suave(), 99, 0));
        recargar.setContentDescription("Actualizar");
        recargar.setOnClickListener(v -> { v.animate().rotationBy(360).setDuration(500).start(); actualizar(true); });
        cab.addView(recargar, new LinearLayout.LayoutParams(a.dp(46), a.dp(46)));
        col.addView(cab);
        estado = a.texto("", 12.5f, sub(), a.tf(false));
        estado.setPadding(a.dp(22), a.dp(6), a.dp(22), 0);
        col.addView(estado);

        chipsScroll = new HorizontalScrollView(a);
        chipsScroll.setHorizontalScrollBarEnabled(false);
        chips = new LinearLayout(a);
        chips.setPadding(a.dp(18), a.dp(14), a.dp(18), a.dp(8));
        chipsScroll.addView(chips);
        col.addView(chipsScroll);

        scroll = new ScrollView(a);
        scroll.setVerticalScrollBarEnabled(false);
        lista = new LinearLayout(a);
        lista.setOrientation(LinearLayout.VERTICAL);
        lista.setPadding(a.dp(18), a.dp(4), a.dp(18), a.insetAbajo + a.dp(30));
        scroll.addView(lista);
        col.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1f));

        a.root.addView(capa, new FrameLayout.LayoutParams(-1, -1));
        pintar();
    }

    /** Empieza a salir desde el borde siguiendo el dedo. */
    void abrirSiguiendo(int d) {
        dir = d;
        crear();
        capa.animate().cancel();
        capa.setTranslationX(-dir * ancho());
    }

    void seguir(float dx) {
        if (capa == null) return;
        float w = ancho();
        capa.setTranslationX(dir > 0 ? Math.min(0, -w + dx) : Math.max(0, w + dx));
    }

    void soltar(float dx, float vx) {
        if (capa == null) return;
        if (dir * dx > ancho() * 0.3f || dir * vx > a.dp(800)) asentar(); else quitar();
    }

    void abrir(int d) {
        if (!abierta()) { dir = d; crear(); capa.setTranslationX(-dir * ancho()); }
        asentar();
    }

    void asentar() {
        capa.animate().translationX(0).setDuration(230).setInterpolator(new DecelerateInterpolator(1.6f)).start();
        actualizar(false);
    }

    void cerrar() {
        if (!abierta()) return;
        quitar();
    }

    void quitar() {
        if (capa == null) return;
        final Capa c = capa; capa = null;
        float hacia = -dir * ancho();
        c.animate().translationX(hacia).setDuration(Math.max(90, (long) (200 * (1 - Math.abs(c.getTranslationX()) / ancho())))).setInterpolator(new DecelerateInterpolator())
                .withEndAction(() -> { if (c.getParent() != null) ((ViewGroup) c.getParent()).removeView(c); }).start();
    }

    /** La capa se cierra deslizándola de vuelta hacia su borde. */
    class Capa extends FrameLayout {
        float x0, y0, ultX, vel; long ultT; boolean arrastrando, enChips;
        Capa() { super(a); }

        @Override public boolean onInterceptTouchEvent(MotionEvent e) {
            switch (e.getActionMasked()) {
                case MotionEvent.ACTION_DOWN: inicio(e); break;
                case MotionEvent.ACTION_MOVE: if (empieza(e)) return true; break;
            }
            return false;
        }

        @Override public boolean onTouchEvent(MotionEvent e) {
            switch (e.getActionMasked()) {
                case MotionEvent.ACTION_DOWN: inicio(e); return true;
                case MotionEvent.ACTION_MOVE:
                    medir(e);
                    if (!arrastrando && !empieza(e)) return true;
                    float dx = e.getRawX() - x0;
                    setTranslationX(dir > 0 ? Math.min(0, dx) : Math.max(0, dx));
                    return true;
                case MotionEvent.ACTION_UP: case MotionEvent.ACTION_CANCEL:
                    if (arrastrando) {
                        arrastrando = false;
                        float d = e.getRawX() - x0;
                        if (-dir * d > getWidth() * 0.3f || -dir * vel > a.dp(800)) quitar();
                        else animate().translationX(0).setDuration(180).start();
                    }
                    return true;
            }
            return true;
        }

        void inicio(MotionEvent e) {
            x0 = e.getRawX(); y0 = e.getRawY(); ultX = x0; ultT = e.getEventTime(); vel = 0; arrastrando = false;
            enChips = a.dentroDe(chipsScroll, x0, y0) && chipsScroll.canScrollHorizontally(dir);
        }

        void medir(MotionEvent e) {
            long dt = e.getEventTime() - ultT;
            if (dt > 0) vel = vel * 0.4f + (e.getRawX() - ultX) * 1000f / dt * 0.6f;
            ultX = e.getRawX(); ultT = e.getEventTime();
        }

        boolean empieza(MotionEvent e) {
            medir(e);
            if (arrastrando) return true;
            if (enChips) return false;
            float dx = e.getRawX() - x0, dy = e.getRawY() - y0;
            if (-dir * dx > a.dp(20) && Math.abs(dx) > Math.abs(dy) * 1.6f) { arrastrando = true; getParent().requestDisallowInterceptTouchEvent(true); return true; }
            return false;
        }
    }

    // ================================================================ pintar
    void pintarEstado() {
        if (estado == null) return;
        long ult = a.prefs.getLong("noticias_leido", 0);
        String s = cargando ? "Actualizando…" : ult == 0 ? "" : "Actualizado " + hace(ult);
        if (!cargando && !fallaron.isEmpty()) {
            List<String> n = new ArrayList<>();
            for (String id : fallaron) { Fuente f = fuente(id); if (f != null) n.add(f.corto); }
            s += (s.isEmpty() ? "" : " · ") + "no respondió: " + TextUtils.join(", ", n);
        }
        estado.setText(s);
    }

    void pintar() {
        if (lista == null) return;
        pintarEstado();
        Set<String> act = activas();
        // filtros por fuente
        chips.removeAllViews();
        chip("todas", "Todas");
        for (Fuente f : FUENTES) if (act.contains(f.id)) chip(f.id, f.corto);

        lista.removeAllViews();
        List<Nota> mc = act.contains("mc") ? porFuente.get("mc") : null;
        if ("mc".equals(filtro)) {
            if (mc == null || mc.isEmpty()) vacio();
            else { boolean primero = true; for (Nota n : mc) { programa(n, primero); primero = false; } }
            pie();
            return;
        }
        if ("todas".equals(filtro) && mc != null && !mc.isEmpty()) programa(mc.get(0), true);

        List<Nota> l = new ArrayList<>();
        for (Fuente f : FUENTES) {
            if (f.id.equals("mc") || !act.contains(f.id)) continue;
            if (!"todas".equals(filtro) && !f.id.equals(filtro)) continue;
            List<Nota> x = porFuente.get(f.id);
            if (x != null) l.addAll(x);
        }
        Collections.sort(l, (x, y) -> Long.compare(y.fecha, x.fecha));
        if (l.isEmpty() && (mc == null || mc.isEmpty() || !"todas".equals(filtro))) { vacio(); pie(); return; }
        String dia = null;
        for (Nota n : l) {
            String d = nombreDia(n.fecha);
            if (!d.equals(dia)) { dia = d; lista.addView(a.etiqueta(d, sub()), a.lp(-2, -2, 22)); }
            fila(n);
        }
        pie();
    }

    void chip(String id, String t) {
        boolean sel = id.equals(filtro);
        TextView v = a.texto(t, 14, sel ? (Barberia.luz(a.acento) > 0.6 ? 0xFF141414 : 0xFFFFFFFF) : fg(), a.tf(sel));
        v.setPadding(a.dp(15), a.dp(9), a.dp(15), a.dp(9));
        v.setBackground(a.caja(sel ? a.acento : suave(), 99, 0));
        v.setOnClickListener(x -> { filtro = id; pintar(); scroll.scrollTo(0, 0); });
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-2, -2); p.rightMargin = a.dp(8);
        chips.addView(v, p);
    }

    void vacio() {
        String t = cargando ? "Buscando noticias…" : "Todavía no hay noticias aquí. Revisá el internet y tocá ↻ arriba.";
        TextView v = a.texto(t, 15, sub(), a.tf(false));
        v.setGravity(Gravity.CENTER);
        v.setPadding(a.dp(20), a.dp(60), a.dp(20), a.dp(20));
        lista.addView(v, new LinearLayout.LayoutParams(-1, -2));
    }

    void pie() {
        TextView t = a.texto("CNN por Google Noticias · Forbes · Mundo Cristiano de CBN\nTocá una noticia para leerla · mantenela presionada para compartirla", 11.5f, sub(), a.tf(false));
        t.setLineSpacing(a.dp(3), 1f);
        t.setGravity(Gravity.CENTER);
        lista.addView(t, a.lp(-1, -2, 28));
    }

    void fila(Nota n) {
        Fuente f = fuente(n.fuente);
        LinearLayout fila = new LinearLayout(a);
        fila.setPadding(0, a.dp(13), 0, a.dp(13));
        fila.setGravity(Gravity.CENTER_VERTICAL);
        LinearLayout txt = new LinearLayout(a);
        txt.setOrientation(LinearLayout.VERTICAL);
        TextView meta = a.texto("", 12, sub(), a.tf(false));
        android.text.SpannableStringBuilder sb = new android.text.SpannableStringBuilder("● ");
        sb.setSpan(new android.text.style.ForegroundColorSpan(colorDe(f)), 0, 1, 0);
        sb.append(f != null ? f.corto : "").append(n.fecha > 0 ? "  ·  " + hace(n.fecha) : "");
        meta.setText(sb);
        txt.addView(meta);
        TextView t = a.texto(n.titulo, 16, fg(), Typeface.create("sans-serif-medium", Typeface.NORMAL));
        t.setMaxLines(4); t.setEllipsize(TextUtils.TruncateAt.END);
        t.setLineSpacing(a.dp(2.5f), 1f);
        txt.addView(t, a.lp(-1, -2, 6));
        fila.addView(txt, new LinearLayout.LayoutParams(0, -2, 1f));
        if (n.img != null && !n.img.isEmpty()) {
            ImageView iv = foto(a.dp(80), a.dp(80), 14);
            LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(a.dp(80), a.dp(80)); p.leftMargin = a.dp(14);
            fila.addView(iv, p);
            cargarFoto(iv, n.img, a.dp(80));
        }
        fila.setOnClickListener(v -> abrirEnlace(n.link));
        fila.setOnLongClickListener(v -> { compartir(n); return true; });
        lista.addView(fila);
        View r = new View(a); r.setBackgroundColor(raya());
        lista.addView(r, new LinearLayout.LayoutParams(-1, 1));
    }

    ImageView foto(int w, int h, int radio) {
        ImageView iv = new ImageView(a);
        iv.setScaleType(ImageView.ScaleType.CENTER_CROP);
        iv.setBackground(a.caja(suave(), radio, 0));
        final int r = a.dp(radio);
        iv.setOutlineProvider(new ViewOutlineProvider() {
            @Override public void getOutline(View v, Outline o) { o.setRoundRect(0, 0, v.getWidth(), v.getHeight(), r); }
        });
        iv.setClipToOutline(true);
        return iv;
    }

    /** El noticiero de la semana de Mundo Cristiano, con su botón para verlo. */
    void programa(Nota n, boolean grande) {
        LinearLayout c = new LinearLayout(a);
        c.setOrientation(LinearLayout.VERTICAL);
        c.setPadding(a.dp(18), a.dp(16), a.dp(18), a.dp(18));
        c.setBackground(a.caja(a.claro ? 0xCCFFFFFF : 0x1AFFFFFF, 22, MainActivity.conAlpha(a.acento, 0x55)));
        LinearLayout arriba = new LinearLayout(a);
        arriba.setGravity(Gravity.CENTER_VERTICAL);
        if (n.img != null && !n.img.isEmpty() && grande) {
            ImageView iv = foto(a.dp(58), a.dp(58), 14);
            LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(a.dp(58), a.dp(58)); p.rightMargin = a.dp(14);
            arriba.addView(iv, p);
            cargarFoto(iv, n.img, a.dp(58));
        }
        LinearLayout tt = new LinearLayout(a);
        tt.setOrientation(LinearLayout.VERTICAL);
        tt.addView(a.etiqueta(grande ? "Mundo Cristiano · CBN" : "Programa anterior", a.acento));
        String cuando = n.fecha > 0 ? "Programa del " + new SimpleDateFormat("d 'de' MMMM", MainActivity.ES).format(new Date(n.fecha)) : n.titulo;
        tt.addView(a.texto(cuando, grande ? 20 : 17, fg(), a.tf(true)), a.lp(-2, -2, 7));
        String meta = "Noticiero semanal" + (duracion(n.dur).isEmpty() ? "" : " · " + duracion(n.dur)) + (n.fecha > 0 ? " · " + hace(n.fecha) : "");
        tt.addView(a.texto(meta, 12.5f, sub(), a.tf(false)), a.lp(-2, -2, 5));
        arriba.addView(tt, new LinearLayout.LayoutParams(0, -2, 1f));
        c.addView(arriba);
        if (n.resumen != null && !n.resumen.isEmpty()) {
            TextView r = a.texto(n.resumen, 14.5f, fg(), a.tf(false));
            r.setAlpha(0.85f);
            r.setLineSpacing(a.dp(3), 1f);
            r.setMaxLines(grande ? 5 : 3); r.setEllipsize(TextUtils.TruncateAt.END);
            c.addView(r, a.lp(-1, -2, 12));
        }
        LinearLayout bot = new LinearLayout(a);
        TextView ver = a.texto("▶  Ver programa", 15, Barberia.luz(a.acento) > 0.6 ? 0xFF141414 : 0xFFFFFFFF, a.tf(true));
        ver.setGravity(Gravity.CENTER);
        ver.setPadding(a.dp(18), a.dp(12), a.dp(18), a.dp(12));
        ver.setBackground(a.caja(a.acento, 99, 0));
        ver.setOnClickListener(v -> abrirEnlace(n.video != null ? n.video : n.link));
        bot.addView(ver, new LinearLayout.LayoutParams(0, -2, 1f));
        if (grande && !"mc".equals(filtro)) {
            TextView ant = a.texto("Anteriores", 15, fg(), a.tf(true));
            ant.setGravity(Gravity.CENTER);
            ant.setPadding(a.dp(18), a.dp(12), a.dp(18), a.dp(12));
            ant.setBackground(a.caja(0, 99, a.claro ? 0x33000000 : 0x40FFFFFF));
            ant.setOnClickListener(v -> { filtro = "mc"; pintar(); scroll.scrollTo(0, 0); });
            LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-2, -2); p.leftMargin = a.dp(10);
            bot.addView(ant, p);
        }
        c.addView(bot, a.lp(-1, -2, 16));
        c.setOnLongClickListener(v -> { compartir(n); return true; });
        lista.addView(c, a.lp(-1, -2, grande ? 10 : 12));
    }

    static String duracion(String d) {
        if (d == null || d.isEmpty()) return "";
        try {
            int s;
            if (d.contains(":")) { String[] p = d.split(":"); s = 0; for (String x : p) s = s * 60 + Integer.parseInt(x.trim()); }
            else s = Integer.parseInt(d.trim());
            int m = Math.round(s / 60f);
            return m >= 60 ? (m / 60) + " h " + (m % 60) + " min" : m + " min";
        } catch (Exception e) { return ""; }
    }

    static String hace(long t) {
        long m = (System.currentTimeMillis() - t) / 60000;
        if (m < 1) return "ahora";
        if (m < 60) return "hace " + m + " min";
        long h = m / 60;
        if (h < 24) return "hace " + h + " h";
        long d = h / 24;
        if (d == 1) return "ayer";
        if (d < 7) return "hace " + d + " días";
        return new SimpleDateFormat("d MMM", MainActivity.ES).format(new Date(t));
    }

    static String nombreDia(long t) {
        if (t <= 0) return "Sin fecha";
        Calendar hoy = Calendar.getInstance();
        Calendar c = Calendar.getInstance(); c.setTimeInMillis(t);
        if (c.get(Calendar.YEAR) == hoy.get(Calendar.YEAR) && c.get(Calendar.DAY_OF_YEAR) == hoy.get(Calendar.DAY_OF_YEAR)) return "Hoy";
        hoy.add(Calendar.DAY_OF_YEAR, -1);
        if (c.get(Calendar.YEAR) == hoy.get(Calendar.YEAR) && c.get(Calendar.DAY_OF_YEAR) == hoy.get(Calendar.DAY_OF_YEAR)) return "Ayer";
        return new SimpleDateFormat("EEEE d 'de' MMMM", MainActivity.ES).format(new Date(t));
    }

    // ================================================================ abrir y compartir
    /** Abre la noticia en una ventana de Chrome encima del launcher; con «atrás» se vuelve a las noticias. */
    void abrirEnlace(String url) {
        if (url == null || url.isEmpty()) return;
        Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
        Bundle b = new Bundle();
        b.putBinder("android.support.customtabs.extra.SESSION", null);
        i.putExtras(b);
        i.putExtra("android.support.customtabs.extra.TOOLBAR_COLOR", a.claro ? 0xFFF8F5EF : 0xFF141210);
        i.putExtra("androidx.browser.customtabs.extra.COLOR_SCHEME", a.claro ? 1 : 2);
        i.putExtra("android.support.customtabs.extra.ENABLE_URLBAR_HIDING", true);
        i.putExtra("androidx.browser.customtabs.extra.SHARE_STATE", 1);
        i.putExtra("android.support.customtabs.extra.TITLE_VISIBILITY", 1);
        try { i.setPackage("com.android.chrome"); a.startActivity(i); return; } catch (ActivityNotFoundException e) { }
        try { i.setPackage(null); a.startActivity(i); } catch (Exception e) { a.toast("No encontré navegador."); }
    }

    void compartir(Nota n) {
        Intent i = new Intent(Intent.ACTION_SEND);
        i.setType("text/plain");
        String t = "mc".equals(n.fuente) && n.fecha > 0 ? "Mundo Cristiano · programa del " + new SimpleDateFormat("d 'de' MMMM", MainActivity.ES).format(new Date(n.fecha)) : n.titulo;
        i.putExtra(Intent.EXTRA_TEXT, t + "\n" + n.link);
        try { a.startActivity(Intent.createChooser(i, "Compartir noticia")); } catch (Exception e) { }
    }
}
