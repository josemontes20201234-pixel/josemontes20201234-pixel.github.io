package com.josemontes.enfoque;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.speech.RecognizerIntent;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import org.json.JSONObject;
import java.util.ArrayList;

public class MainActivity extends Activity {
    private static final int REQ_VOZ = 7;
    private WebView web;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        Alarmas.canal(this);
        web = new WebView(this);
        web.setBackgroundColor(0xFF0B0B0B);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setTextZoom(100);
        web.addJavascriptInterface(new Puente(), "Android");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if ("file".equals(u.getScheme())) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception e) { }
                return true;
            }
        });
        web.loadUrl("file:///android_asset/index.html");
        setContentView(web);

        if (Build.VERSION.SDK_INT >= 33
                && checkSelfPermission("android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"}, 1);
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) web.evaluateJavascript("window.alVolver&&window.alVolver()", null);
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req != REQ_VOZ) return;
        if (res == RESULT_OK && data != null) {
            ArrayList<String> r = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
            if (r != null && !r.isEmpty()) {
                web.evaluateJavascript("window.onDictado&&window.onDictado(" + JSONObject.quote(r.get(0)) + ")", null);
            }
        }
    }

    private class Puente {
        @JavascriptInterface
        public void dictar() {
            runOnUiThread(() -> {
                Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "es-SV");
                i.putExtra(RecognizerIntent.EXTRA_PROMPT, "¿Qué te pidieron?");
                try {
                    startActivityForResult(i, REQ_VOZ);
                } catch (Exception e) {
                    web.evaluateJavascript("window.onDictadoError&&window.onDictadoError()", null);
                }
            });
        }

        @JavascriptInterface
        public void vibrar(String patron) {
            try {
                String[] p = patron.split(",");
                Vibrator v = getSystemService(Vibrator.class);
                if (v == null || !v.hasVibrator()) return;
                if (p.length == 1) {
                    v.vibrate(VibrationEffect.createOneShot(Long.parseLong(p[0].trim()), VibrationEffect.DEFAULT_AMPLITUDE));
                } else {
                    long[] t = new long[p.length + 1];
                    t[0] = 0;
                    for (int i = 0; i < p.length; i++) t[i + 1] = Long.parseLong(p[i].trim());
                    v.vibrate(VibrationEffect.createWaveform(t, -1));
                }
            } catch (Exception e) { }
        }

        @JavascriptInterface
        public void sincronizar(String json) {
            Alarmas.sincronizar(MainActivity.this, json);
        }
    }
}
