package com.josemontes.enfoque;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import org.json.JSONArray;
import org.json.JSONObject;

/** Recordatorios reales: suenan aunque la app esté cerrada o el teléfono bloqueado. */
public class Alarmas {
    static final String CANAL = "recordatorios_v1";

    static void canal(Context c) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm == null || nm.getNotificationChannel(CANAL) != null) return;
        NotificationChannel ch = new NotificationChannel(CANAL, "Recordatorios de tareas", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("Te avisa a la hora que pusiste en cada tarea");
        ch.enableVibration(true);
        ch.setVibrationPattern(new long[]{0, 400, 200, 400, 200, 700});
        Uri sonido = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        if (sonido == null) sonido = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        ch.setSound(sonido, new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
        nm.createNotificationChannel(ch);
    }

    static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences("alarmas", Context.MODE_PRIVATE);
    }

    static synchronized void sincronizar(Context c, String json) {
        try {
            SharedPreferences p = prefs(c);
            JSONArray viejo = new JSONArray(p.getString("lista", "[]"));
            for (int i = 0; i < viejo.length(); i++) cancelar(c, viejo.getJSONObject(i).getString("id"));
            JSONArray nuevo = new JSONArray(json), guardar = new JSONArray();
            long ahora = System.currentTimeMillis();
            for (int i = 0; i < nuevo.length(); i++) {
                JSONObject o = nuevo.getJSONObject(i);
                if (o.getLong("ms") > ahora) {
                    programar(c, o.getString("id"), o.getLong("ms"), o.optString("texto"));
                    guardar.put(o);
                }
            }
            p.edit().putString("lista", guardar.toString()).apply();
        } catch (Exception e) { }
    }

    static void reprogramarTodo(Context c) {
        try {
            JSONArray l = new JSONArray(prefs(c).getString("lista", "[]"));
            long ahora = System.currentTimeMillis();
            for (int i = 0; i < l.length(); i++) {
                JSONObject o = l.getJSONObject(i);
                if (o.getLong("ms") > ahora) programar(c, o.getString("id"), o.getLong("ms"), o.optString("texto"));
            }
        } catch (Exception e) { }
    }

    private static PendingIntent pi(Context c, String id, String texto) {
        Intent i = new Intent(c, Receptor.class);
        i.setAction("com.josemontes.enfoque.ALARMA." + id);
        i.putExtra("id", id);
        i.putExtra("texto", texto);
        return PendingIntent.getBroadcast(c, id.hashCode(), i,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static void programar(Context c, String id, long ms, String texto) {
        AlarmManager am = c.getSystemService(AlarmManager.class);
        if (am == null) return;
        PendingIntent p = pi(c, id, texto);
        try {
            if (Build.VERSION.SDK_INT >= 31 && !am.canScheduleExactAlarms()) {
                am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, ms, p);
            } else {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, ms, p);
            }
        } catch (SecurityException e) {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, ms, p);
        }
    }

    static void cancelar(Context c, String id) {
        AlarmManager am = c.getSystemService(AlarmManager.class);
        if (am != null) am.cancel(pi(c, id, ""));
    }

    static void mostrar(Context c, String id, String texto) {
        canal(c);
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm == null) return;
        Intent abrir = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pa = PendingIntent.getActivity(c, id.hashCode(), abrir,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification n = new Notification.Builder(c, CANAL)
                .setSmallIcon(R.drawable.ic_noti)
                .setContentTitle("⏰ " + texto)
                .setContentText("No lo pensés: arrancá 10 minutos.")
                .setStyle(new Notification.BigTextStyle().bigText(texto + "\n\nNo lo pensés: abrí la app y arrancá 10 minutos."))
                .setColor(0xFFC9A24A)
                .setCategory(Notification.CATEGORY_ALARM)
                .setContentIntent(pa)
                .setAutoCancel(true)
                .build();
        nm.notify(id.hashCode(), n);
    }
}
