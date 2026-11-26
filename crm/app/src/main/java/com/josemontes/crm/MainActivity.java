package com.josemontes.crm;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.ImageDecoder;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;

/** Meraki CRM: la pantalla es index.html; aquí está lo que el navegador no puede hacer solo. */
public class MainActivity extends Activity {
    private static final int REQ_FOTO = 11;
    private static final String LOGIN = "https://josemontes20201234-pixel.github.io/crm/login.html";
    private WebView web;
    private String pendienteLogin;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        Alarmas.canal(this);
        Leo.canal(this);
        Leo.armar(this, 5000);
        web = new WebView(this);
        web.setBackgroundColor(0xFF0B0A08);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setTextZoom(100);
        web.addJavascriptInterface(new Puente(), "Android");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if ("file".equals(u.getScheme())) return false;
                abrirFuera(u.toString());
                return true;
            }
            @Override
            public void onPageFinished(WebView v, String url) {
                if (pendienteLogin != null) { entregarLogin(pendienteLogin); pendienteLogin = null; }
            }
        });
        web.loadUrl("file:///android_asset/index.html");
        setContentView(web);
        leerLogin(getIntent());

        if (Build.VERSION.SDK_INT >= 33
                && checkSelfPermission("android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"}, 1);
        }
    }

    @Override
    protected void onNewIntent(Intent i) {
        super.onNewIntent(i);
        leerLogin(i);
    }

    /** Vuelve de la página de inicio de sesión (merakicrm://login) con la llave de Tarjeta Meraki. */
    private void leerLogin(Intent i) {
        if (i == null) return;
        Uri dl = i.getData();
        if (dl != null && "merakicrm".equals(dl.getScheme()) && "leo".equals(dl.getHost())) {
            String clave = dl.getQueryParameter("clave");
            if (clave != null && clave.length() >= 20) {
                Leo.guardarClave(this, clave);
                Toast.makeText(this, "🦁 Listo: los avisos de Leo te van a llegar aquí", Toast.LENGTH_LONG).show();
                // Samsung duerme las apps en segundo plano: se pide (una vez) dejarla revisar siempre, para que los avisos no se atrasen.
                android.os.PowerManager pm = getSystemService(android.os.PowerManager.class);
                if (pm != null && !pm.isIgnoringBatteryOptimizations(getPackageName())) {
                    try { startActivity(new Intent(android.provider.Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + getPackageName()))); } catch (Exception ignored) { }
                }
            }
            return;
        }
        String rt = i.getStringExtra("rt");
        Uri d = i.getData();
        if (rt == null && d != null && "merakicrm".equals(d.getScheme())) rt = d.getQueryParameter("rt");
        if (rt == null || rt.isEmpty()) return;
        if (web != null && web.getProgress() == 100) entregarLogin(rt); else pendienteLogin = rt;
    }

    private void entregarLogin(String rt) {
        web.evaluateJavascript("window.alEntrar&&window.alEntrar(" + JSONObject.quote(rt) + ")", null);
    }

    @Override
    public void onBackPressed() {
        web.evaluateJavascript("window.atras?window.atras():false", r -> {
            if (!"true".equals(r)) MainActivity.super.onBackPressed();
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) web.evaluateJavascript("window.alVolver&&window.alVolver()", null);
    }

    void abrirFuera(String url) {
        try {
            Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(i);
        } catch (Exception e) {
            Toast.makeText(this, "No hay app para abrir eso", Toast.LENGTH_SHORT).show();
        }
    }

    void js(String codigo) { runOnUiThread(() -> web.evaluateJavascript(codigo, null)); }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req != REQ_FOTO) return;
        if (res != RESULT_OK || data == null || data.getData() == null) { js("window.onFoto&&window.onFoto(null)"); return; }
        final Uri u = data.getData();
        new Thread(() -> {
            try {
                Bitmap bm;
                if (Build.VERSION.SDK_INT >= 28) {
                    bm = ImageDecoder.decodeBitmap(ImageDecoder.createSource(getContentResolver(), u), (dec, info, src) -> {
                        int w = info.getSize().getWidth(), h = info.getSize().getHeight(), m = Math.max(w, h);
                        if (m > 1600) dec.setTargetSize(w * 1600 / m, h * 1600 / m);
                        dec.setAllocator(ImageDecoder.ALLOCATOR_SOFTWARE);
                    });
                } else {
                    InputStream in = getContentResolver().openInputStream(u);
                    bm = BitmapFactory.decodeStream(in);
                    if (in != null) in.close();
                }
                ByteArrayOutputStream o = new ByteArrayOutputStream();
                bm.compress(Bitmap.CompressFormat.JPEG, 88, o);
                String url = "data:image/jpeg;base64," + Base64.encodeToString(o.toByteArray(), Base64.NO_WRAP);
                js("window.onFoto&&window.onFoto(" + JSONObject.quote(url) + ")");
            } catch (Throwable t) {
                js("window.onFoto&&window.onFoto(null)");
            }
        }).start();
    }

    static byte[] deDataUrl(String d) {
        int c = d.indexOf(',');
        return Base64.decode(c >= 0 ? d.substring(c + 1) : d, Base64.DEFAULT);
    }

    /** Guarda la foto en la galería (Pictures/Meraki CRM) y devuelve su dirección para compartirla. */
    Uri guardarEnGaleria(String dataUrl) throws Exception {
        ContentValues v = new ContentValues();
        v.put(MediaStore.Images.Media.DISPLAY_NAME, "meraki-" + System.currentTimeMillis() + ".jpg");
        v.put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg");
        v.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/Meraki CRM");
        Uri u = getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, v);
        if (u == null) throw new Exception("sin galería");
        try (OutputStream o = getContentResolver().openOutputStream(u)) { o.write(deDataUrl(dataUrl)); }
        return u;
    }

    private class Puente {
        /** Pedido a internet sin las trabas del navegador (Claude, Meta y Firebase). La respuesta llega a window.__http(id, estado, texto). */
        @JavascriptInterface
        public void http(final String id, final String metodo, final String url, final String encabezados, final String cuerpo, final String tipo) {
            new Thread(() -> {
                int estado = 0; String texto;
                HttpURLConnection c = null;
                try {
                    c = (HttpURLConnection) new URL(url).openConnection();
                    c.setRequestMethod(metodo);
                    c.setConnectTimeout(20000);
                    c.setReadTimeout(90000);
                    if (encabezados != null && !encabezados.isEmpty()) {
                        JSONObject h = new JSONObject(encabezados);
                        for (Iterator<String> k = h.keys(); k.hasNext(); ) { String n = k.next(); c.setRequestProperty(n, h.getString(n)); }
                    }
                    if ("multipart".equals(tipo)) {
                        String borde = "----meraki" + System.nanoTime();
                        c.setDoOutput(true);
                        c.setRequestProperty("Content-Type", "multipart/form-data; boundary=" + borde);
                        JSONObject campos = new JSONObject(cuerpo);
                        try (OutputStream o = c.getOutputStream()) {
                            for (Iterator<String> k = campos.keys(); k.hasNext(); ) {
                                String n = k.next(), val = campos.getString(n);
                                o.write(("--" + borde + "\r\n").getBytes(StandardCharsets.UTF_8));
                                if (val.startsWith("data:")) {
                                    o.write(("Content-Disposition: form-data; name=\"" + n + "\"; filename=\"foto.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n").getBytes(StandardCharsets.UTF_8));
                                    o.write(deDataUrl(val));
                                } else {
                                    o.write(("Content-Disposition: form-data; name=\"" + n + "\"\r\n\r\n" + val).getBytes(StandardCharsets.UTF_8));
                                }
                                o.write("\r\n".getBytes(StandardCharsets.UTF_8));
                            }
                            o.write(("--" + borde + "--\r\n").getBytes(StandardCharsets.UTF_8));
                        }
                    } else if (cuerpo != null && !cuerpo.isEmpty()) {
                        c.setDoOutput(true);
                        if (c.getRequestProperty("Content-Type") == null)
                            c.setRequestProperty("Content-Type", "form".equals(tipo) ? "application/x-www-form-urlencoded" : "application/json");
                        try (OutputStream o = c.getOutputStream()) { o.write(cuerpo.getBytes(StandardCharsets.UTF_8)); }
                    }
                    estado = c.getResponseCode();
                    InputStream in = estado >= 400 ? c.getErrorStream() : c.getInputStream();
                    ByteArrayOutputStream b = new ByteArrayOutputStream();
                    if (in != null) { byte[] buf = new byte[16384]; int n; while ((n = in.read(buf)) > 0) b.write(buf, 0, n); in.close(); }
                    texto = b.toString("UTF-8");
                } catch (Throwable t) {
                    texto = "{\"error\":{\"message\":" + JSONObject.quote("Sin conexión: " + t.getMessage()) + "}}";
                } finally {
                    if (c != null) c.disconnect();
                }
                js("window.__http&&window.__http(" + JSONObject.quote(id) + "," + estado + "," + JSONObject.quote(texto) + ")");
            }).start();
        }

        @JavascriptInterface
        public void elegirFoto() {
            runOnUiThread(() -> {
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.setType("image/*");
                i.addCategory(Intent.CATEGORY_OPENABLE);
                try { startActivityForResult(Intent.createChooser(i, "Elegí la foto"), REQ_FOTO); }
                catch (Exception e) { js("window.onFoto&&window.onFoto(null)"); }
            });
        }

        /** Copia el texto, guarda la foto en la galería y abre la app (Instagram, TikTok, WhatsApp, Facebook) para publicar. */
        @JavascriptInterface
        public String compartir(final String texto, final String foto, final String paquete) {
            try {
                copiar(texto);
                Intent i = new Intent(Intent.ACTION_SEND);
                if (foto != null && foto.startsWith("data:")) {
                    Uri u = guardarEnGaleria(foto);
                    i.setType("image/jpeg");
                    i.putExtra(Intent.EXTRA_STREAM, u);
                    i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                } else {
                    i.setType("text/plain");
                }
                i.putExtra(Intent.EXTRA_TEXT, texto);
                if (paquete != null && !paquete.isEmpty()) {
                    for (String p : paquete.split(",")) {
                        try { getPackageManager().getPackageInfo(p, 0); i.setPackage(p); break; } catch (Exception e) { }
                    }
                }
                final Intent fin = i.getPackage() == null ? Intent.createChooser(i, "Publicar en…") : i;
                runOnUiThread(() -> { try { startActivity(fin); } catch (Exception e) { Toast.makeText(MainActivity.this, "No se pudo abrir la app", Toast.LENGTH_SHORT).show(); } });
                return "ok";
            } catch (Exception e) {
                return "error: " + e.getMessage();
            }
        }

        @JavascriptInterface
        public boolean tiene(String paquete) {
            for (String p : paquete.split(",")) {
                try { getPackageManager().getPackageInfo(p, 0); return true; } catch (Exception e) { }
            }
            return false;
        }

        @JavascriptInterface
        public void copiar(String texto) {
            ClipboardManager cm = getSystemService(ClipboardManager.class);
            if (cm != null) cm.setPrimaryClip(ClipData.newPlainText("Meraki CRM", texto));
        }

        @JavascriptInterface
        public void abrir(String url) { abrirFuera(url); }

        @JavascriptInterface
        public void entrarTarjeta() { abrirFuera(LOGIN); }

        @JavascriptInterface
        public void aviso(String t) { runOnUiThread(() -> Toast.makeText(MainActivity.this, t, Toast.LENGTH_SHORT).show()); }

        @JavascriptInterface
        public void sincronizar(String json) { Alarmas.sincronizar(MainActivity.this, json); }

        /** ¿Ya está la clave de Leo (la del enlace de activación)? */
        @JavascriptInterface
        public boolean leoActivo() { return Leo.activo(MainActivity.this); }

        /** Avisos para Leo (GET o POST a /ajustes). La clave la pone Java: nunca pasa al JavaScript. Respuesta en window.__http. */
        @JavascriptInterface
        public void leo(final String id, final String metodo, final String cuerpo) { leoPedir(id, metodo, cuerpo, Leo.URL_AJUSTES); }

        /** Leo en WhatsApp: encender/apagar, clave de YCloud y números que Leo no contesta. */
        @JavascriptInterface
        public void leoWa(final String id, final String metodo, final String cuerpo) { leoPedir(id, metodo, cuerpo, Leo.URL_WA); }

        /** Horario especial (cerrado un día, abro más tarde, cierro más temprano, varios días): GET o POST a /horario. */
        @JavascriptInterface
        public void leoHorario(final String id, final String metodo, final String cuerpo) { leoPedir(id, metodo, cuerpo, Leo.URL_HORARIO); }

        private void leoPedir(String id, String metodo, String cuerpo, String url) {
            String clave = Leo.prefs(MainActivity.this).getString("clave", "");
            if (clave.isEmpty()) {
                js("window.__http&&window.__http(" + JSONObject.quote(id) + ",0," + JSONObject.quote("{\"error\":{\"message\":\"Falta activar los avisos de Leo en este teléfono\"}}") + ")");
                return;
            }
            String encabezados;
            try { encabezados = new JSONObject().put("x-avisos", clave).toString(); } catch (Exception e) { encabezados = "{}"; }
            http(id, "POST".equals(metodo) ? "POST" : "GET", url, encabezados, "POST".equals(metodo) ? cuerpo : "", "json");
        }

        @JavascriptInterface
        public String version() {
            try { return getPackageManager().getPackageInfo(getPackageName(), 0).versionName; } catch (Exception e) { return "?"; }
        }
    }
}
