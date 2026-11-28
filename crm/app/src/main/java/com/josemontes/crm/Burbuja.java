package com.josemontes.crm;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.PixelFormat;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.IBinder;
import android.provider.Settings;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.TextView;

/** Micrófono flotante: una burbuja dorada encima de cualquier app. Al tocarla abre el dictado del CRM. */
public class Burbuja extends Service {
    static final String CANAL = "burbuja";
    private WindowManager wm;
    private TextView vista;
    private WindowManager.LayoutParams lp;

    static boolean puede(Context c) { return Settings.canDrawOverlays(c); }
    static boolean activa(Context c) { return c.getSharedPreferences("crm", MODE_PRIVATE).getBoolean("burbuja", false); }
    static void guardar(Context c, boolean on) { c.getSharedPreferences("crm", MODE_PRIVATE).edit().putBoolean("burbuja", on).apply(); }
    static void encender(Context c) {
        if (!puede(c)) return;
        Intent i = new Intent(c, Burbuja.class);
        if (Build.VERSION.SDK_INT >= 26) c.startForegroundService(i); else c.startService(i);
    }
    static void apagar(Context c) { c.stopService(new Intent(c, Burbuja.class)); }

    @Override public IBinder onBind(Intent i) { return null; }

    @Override
    public int onStartCommand(Intent intent, int flags, int id) {
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm != null && nm.getNotificationChannel(CANAL) == null) {
            NotificationChannel ch = new NotificationChannel(CANAL, "Micrófono flotante", NotificationManager.IMPORTANCE_MIN);
            ch.setShowBadge(false);
            nm.createNotificationChannel(ch);
        }
        Intent abrir = new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        PendingIntent pi = PendingIntent.getActivity(this, 7, abrir, PendingIntent.FLAG_IMMUTABLE);
        Notification n = new Notification.Builder(this, CANAL)
                .setSmallIcon(R.drawable.ic_noti)
                .setContentTitle("Micrófono de Meraki activo")
                .setContentText("Tocá la burbuja dorada para dictar un cobro")
                .setContentIntent(pi).setOngoing(true).build();
        if (Build.VERSION.SDK_INT >= 34) startForeground(71, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        else startForeground(71, n);
        if (vista == null) mostrar();
        return START_STICKY;
    }

    private void mostrar() {
        if (!puede(this)) { stopSelf(); return; }
        wm = getSystemService(WindowManager.class);
        float d = getResources().getDisplayMetrics().density;
        int tam = (int) (58 * d);
        vista = new TextView(this);
        vista.setText("🎙");
        vista.setTextSize(24);
        vista.setGravity(Gravity.CENTER);
        GradientDrawable g = new GradientDrawable(GradientDrawable.Orientation.TL_BR, new int[]{0xFFE9C46A, 0xFFC9A24A});
        g.setShape(GradientDrawable.OVAL);
        g.setStroke((int) (2 * d), 0xFF14110B);
        vista.setBackground(g);
        vista.setElevation(10 * d);
        lp = new WindowManager.LayoutParams(tam, tam, WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS, PixelFormat.TRANSLUCENT);
        lp.gravity = Gravity.TOP | Gravity.START;
        int ancho = getResources().getDisplayMetrics().widthPixels, alto = getResources().getDisplayMetrics().heightPixels;
        lp.x = getSharedPreferences("crm", MODE_PRIVATE).getInt("bx", ancho - tam - (int) (12 * d));
        lp.y = getSharedPreferences("crm", MODE_PRIVATE).getInt("by", (int) (alto * 0.55));
        vista.setOnTouchListener(new View.OnTouchListener() {
            int x0, y0; float tx, ty; boolean movio;
            @Override public boolean onTouch(View v, MotionEvent e) {
                switch (e.getAction()) {
                    case MotionEvent.ACTION_DOWN: x0 = lp.x; y0 = lp.y; tx = e.getRawX(); ty = e.getRawY(); movio = false; v.setAlpha(0.8f); return true;
                    case MotionEvent.ACTION_MOVE:
                        int dx = (int) (e.getRawX() - tx), dy = (int) (e.getRawY() - ty);
                        if (Math.abs(dx) > 12 || Math.abs(dy) > 12) movio = true;
                        if (movio) { lp.x = x0 + dx; lp.y = y0 + dy; wm.updateViewLayout(vista, lp); }
                        return true;
                    case MotionEvent.ACTION_UP:
                        v.setAlpha(1f);
                        if (movio) {
                            int w = getResources().getDisplayMetrics().widthPixels;
                            lp.x = (lp.x + tam / 2 < w / 2) ? (int) (8 * d) : w - tam - (int) (8 * d);
                            wm.updateViewLayout(vista, lp);
                            getSharedPreferences("crm", MODE_PRIVATE).edit().putInt("bx", lp.x).putInt("by", lp.y).apply();
                        } else {
                            Intent i = new Intent(Burbuja.this, MainActivity.class).putExtra("voz", true)
                                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
                            startActivity(i);
                        }
                        return true;
                }
                return false;
            }
        });
        try { wm.addView(vista, lp); } catch (Exception e) { stopSelf(); }
    }

    @Override
    public void onDestroy() {
        if (vista != null && wm != null) try { wm.removeView(vista); } catch (Exception ignored) { }
        vista = null;
        super.onDestroy();
    }
}
