package com.josemontes.crm;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * Avisos de Leo (el asistente de Instagram): citas nuevas y clientes que piden hablar con Jose.
 * Cada 5 minutos, aunque la app esté cerrada, le pregunta a Leo si hay algo nuevo y lo muestra como notificación.
 * La clave para leer los avisos llega una sola vez por el enlace merakicrm://leo?clave=… (no va dentro de la app).
 */
public class Leo {
    static final String CANAL = "leo_v1";
    static final String ACCION = "com.josemontes.crm.LEO";
    static final String URL_AVISOS = "https://meraki-leo.merakibarbershop.workers.dev/avisos";
    static final String URL_AJUSTES = "https://meraki-leo.merakibarbershop.workers.dev/ajustes";   // avisos de Jose para Leo
    static final String URL_WA = "https://meraki-leo.merakibarbershop.workers.dev/whatsapp-ajustes";   // Leo en WhatsApp
    static final long CADA = 5 * 60 * 1000L;

    static SharedPreferences prefs(Context c) { return c.getSharedPreferences("leo", Context.MODE_PRIVATE); }

    static boolean activo(Context c) { return !prefs(c).getString("clave", "").isEmpty(); }

    /** Guarda la clave (desde el enlace) y empieza a revisar. Los avisos de antes de hoy no se muestran. */
    static void guardarClave(Context c, String clave) {
        prefs(c).edit().putString("clave", clave.trim()).putLong("desde", System.currentTimeMillis()).apply();
        armar(c, 3000);
    }

    static void canal(Context c) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm == null || nm.getNotificationChannel(CANAL) != null) return;
        NotificationChannel ch = new NotificationChannel(CANAL, "Avisos de Leo", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("Citas nuevas y clientes que piden hablar con vos");
        ch.enableVibration(true);
        ch.setVibrationPattern(new long[]{0, 300, 150, 300});
        nm.createNotificationChannel(ch);
    }

    private static PendingIntent pi(Context c) {
        Intent i = new Intent(c, Receptor.class).setAction(ACCION);
        return PendingIntent.getBroadcast(c, 4242, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static void armar(Context c) { armar(c, CADA); }

    static void armar(Context c, long en) {
        if (!activo(c)) return;
        AlarmManager am = c.getSystemService(AlarmManager.class);
        if (am == null) return;
        long ms = System.currentTimeMillis() + en;
        try {
            if (Build.VERSION.SDK_INT >= 31 && !am.canScheduleExactAlarms()) am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, ms, pi(c));
            else am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, ms, pi(c));
        } catch (SecurityException e) {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, ms, pi(c));
        }
    }

    /** Lo llama la alarma: pregunta a Leo (en otro hilo) y vuelve a programarse. */
    static void revisar(Context c, BroadcastReceiver.PendingResult fin) {
        final Context app = c.getApplicationContext();
        new Thread(() -> {
            try { traer(app); } catch (Exception ignored) { }
            armar(app);
            if (fin != null) fin.finish();
        }).start();
    }

    private static void traer(Context c) throws Exception {
        SharedPreferences p = prefs(c);
        String clave = p.getString("clave", "");
        if (clave.isEmpty()) return;
        long desde = p.getLong("desde", System.currentTimeMillis());
        HttpURLConnection h = (HttpURLConnection) new URL(URL_AVISOS + "?desde=" + desde).openConnection();
        h.setConnectTimeout(8000);
        h.setReadTimeout(8000);
        h.setRequestProperty("x-avisos", clave);
        if (h.getResponseCode() != 200) { h.disconnect(); return; }
        InputStream in = h.getInputStream();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] b = new byte[4096];
        for (int n; (n = in.read(b)) > 0; ) out.write(b, 0, n);
        h.disconnect();
        JSONArray avisos = new JSONObject(out.toString(StandardCharsets.UTF_8.name())).optJSONArray("avisos");
        if (avisos == null) return;
        long ultimo = desde;
        for (int i = 0; i < avisos.length(); i++) {
            JSONObject a = avisos.getJSONObject(i);
            long ts = a.optLong("ts");
            if (ts <= desde) continue;
            mostrar(c, ts, a.optString("texto"));
            ultimo = Math.max(ultimo, ts);
        }
        p.edit().putLong("desde", ultimo).apply();
    }

    static void mostrar(Context c, long ts, String texto) {
        canal(c);
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm == null || texto == null || texto.isEmpty()) return;
        String titulo = texto.startsWith("📅") ? "📅 Cita nueva por Leo" : "🦁 Leo te avisa";
        String cuerpo = texto.replaceFirst("^\\S+ [^:]*: ", "");
        Intent abrir = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pa = PendingIntent.getActivity(c, (int) (ts % 100000), abrir, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification n = new Notification.Builder(c, CANAL)
                .setSmallIcon(R.drawable.ic_noti)
                .setContentTitle(titulo)
                .setContentText(cuerpo)
                .setStyle(new Notification.BigTextStyle().bigText(cuerpo))
                .setColor(0xFFC9A24A)
                .setCategory(Notification.CATEGORY_MESSAGE)
                .setWhen(ts)
                .setShowWhen(true)
                .setContentIntent(pa)
                .setAutoCancel(true)
                .build();
        nm.notify((int) (ts % 1000000000L), n);
    }
}
