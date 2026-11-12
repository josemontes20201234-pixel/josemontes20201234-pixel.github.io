package com.josemontes.launcher;

import android.app.PendingIntent;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.media.MediaMetadata;
import android.media.session.MediaController;
import android.media.session.MediaSessionManager;
import android.media.session.PlaybackState;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.service.notification.NotificationListenerService;

import java.util.ArrayList;
import java.util.List;

/**
 * Lee qué música suena (Spotify, YouTube Music…) para mostrarla en el Panel Meraki y en el inicio del launcher.
 * Sólo mira los reproductores; no lee ni guarda las notificaciones.
 */
public class Oyente extends NotificationListenerService {
    static Oyente yo;
    MediaSessionManager msm;
    MediaController ctrl;
    Musica.Estado ultimo;
    boolean mandado;
    final Handler h = new Handler(Looper.getMainLooper());

    final MediaSessionManager.OnActiveSessionsChangedListener cambio = l -> elegir(l);
    final MediaController.Callback cb = new MediaController.Callback() {
        @Override public void onPlaybackStateChanged(PlaybackState s) { elegir(sesiones()); }
        @Override public void onMetadataChanged(MediaMetadata m) { publicar(false); }
        @Override public void onSessionDestroyed() { elegir(sesiones()); }
    };

    static boolean tieneAcceso(Context c) {
        String s = Settings.Secure.getString(c.getContentResolver(), "enabled_notification_listeners");
        return s != null && s.contains(c.getPackageName() + "/");
    }

    ComponentName cn() { return new ComponentName(this, Oyente.class); }

    @Override
    public void onListenerConnected() {
        Servicio.registrarErrores(this);
        yo = this;
        msm = (MediaSessionManager) getSystemService(Context.MEDIA_SESSION_SERVICE);
        try { msm.addOnActiveSessionsChangedListener(cambio, cn(), h); } catch (Exception e) { }
        elegir(sesiones());
    }

    @Override
    public void onListenerDisconnected() {
        try { if (msm != null) msm.removeOnActiveSessionsChangedListener(cambio); } catch (Exception e) { }
        if (ctrl != null) try { ctrl.unregisterCallback(cb); } catch (Exception e) { }
        ctrl = null;
        yo = null;
        ultimo = null;
        Musica.poner(null);
        mandar(null, false);
    }

    @Override
    public void onDestroy() {
        if (yo == this) yo = null;
        super.onDestroy();
    }

    List<MediaController> sesiones() {
        try { return msm == null ? new ArrayList<>() : msm.getActiveSessions(cn()); } catch (Exception e) { return new ArrayList<>(); }
    }

    static int estado(MediaController c) {
        try { PlaybackState s = c.getPlaybackState(); return s == null ? PlaybackState.STATE_NONE : s.getState(); } catch (Exception e) { return PlaybackState.STATE_NONE; }
    }

    static boolean sonando(int st) {
        return st == PlaybackState.STATE_PLAYING || st == PlaybackState.STATE_BUFFERING || st == PlaybackState.STATE_CONNECTING
                || st == PlaybackState.STATE_FAST_FORWARDING || st == PlaybackState.STATE_REWINDING
                || st == PlaybackState.STATE_SKIPPING_TO_NEXT || st == PlaybackState.STATE_SKIPPING_TO_PREVIOUS;
    }

    /** Se queda con el reproductor que está sonando; si ninguno suena, con el último que tenga canción. */
    void elegir(List<MediaController> l) {
        MediaController mejor = null;
        if (l != null) {
            for (MediaController c : l) if (sonando(estado(c))) { mejor = c; break; }
            if (mejor == null && ctrl != null) for (MediaController c : l) if (c.getSessionToken().equals(ctrl.getSessionToken())) { mejor = c; break; }
            if (mejor == null) for (MediaController c : l) if (c.getMetadata() != null) { mejor = c; break; }
        }
        boolean igual = ctrl != null && mejor != null && ctrl.getSessionToken().equals(mejor.getSessionToken());
        if (!igual) {
            if (ctrl != null) try { ctrl.unregisterCallback(cb); } catch (Exception e) { }
            ctrl = mejor;
            if (ctrl != null) try { ctrl.registerCallback(cb, h); } catch (Exception e) { }
        }
        publicar(false);
    }

    void publicar(boolean forzar) {
        Musica.Estado e = null;
        MediaController c = ctrl;
        if (c != null) {
            MediaMetadata m = c.getMetadata();
            int st = estado(c);
            if (m != null && st != PlaybackState.STATE_STOPPED && st != PlaybackState.STATE_NONE && st != PlaybackState.STATE_ERROR) {
                e = new Musica.Estado();
                e.titulo = texto(m, MediaMetadata.METADATA_KEY_DISPLAY_TITLE, MediaMetadata.METADATA_KEY_TITLE);
                e.artista = texto(m, MediaMetadata.METADATA_KEY_DISPLAY_SUBTITLE, MediaMetadata.METADATA_KEY_ARTIST, MediaMetadata.METADATA_KEY_ALBUM_ARTIST, MediaMetadata.METADATA_KEY_ALBUM);
                Bitmap b = null;
                for (String k : new String[]{MediaMetadata.METADATA_KEY_ALBUM_ART, MediaMetadata.METADATA_KEY_ART, MediaMetadata.METADATA_KEY_DISPLAY_ICON}) {
                    try { b = m.getBitmap(k); } catch (Exception x) { }
                    if (b != null) break;
                }
                e.arte = Musica.achicar(b);
                e.pkg = c.getPackageName();
                e.app = etiqueta(e.pkg);
                e.sonando = sonando(st);
            }
        }
        if (!forzar && mandado && (e == null ? ultimo == null : e.igual(ultimo))) return;
        ultimo = e;
        Musica.poner(e);
        mandar(e, true);
    }

    void mandar(Musica.Estado e, boolean acceso) {
        mandado = true;
        try { sendBroadcast(Musica.aIntent(e).putExtra("acceso", acceso), Musica.PERMISO); } catch (Exception x) { }
    }

    static String texto(MediaMetadata m, String... ks) {
        for (String k : ks) { try { CharSequence s = m.getText(k); if (s != null && s.toString().trim().length() > 0) return s.toString().trim(); } catch (Exception e) { } }
        return "";
    }

    String etiqueta(String pkg) {
        try { PackageManager pm = getPackageManager(); return pm.getApplicationLabel(pm.getApplicationInfo(pkg, 0)).toString(); } catch (Exception e) { return ""; }
    }

    /** Los controles que mandan el Panel Meraki o el inicio del launcher. */
    static void control(Context ctx, String c) {
        Oyente o = yo;
        if (o == null) {
            if ("pedir".equals(c)) try { ctx.sendBroadcast(Musica.aIntent(null).putExtra("acceso", tieneAcceso(ctx)), Musica.PERMISO); } catch (Exception e) { }
            return;
        }
        if ("pedir".equals(c)) { o.publicar(true); return; }
        MediaController m = o.ctrl;
        if (m == null) return;
        MediaController.TransportControls t = m.getTransportControls();
        try {
            switch (c) {
                case "play": t.play(); break;
                case "pausa": t.pause(); break;
                case "alternar": if (sonando(estado(m))) t.pause(); else t.play(); break;
                case "siguiente": t.skipToNext(); break;
                case "anterior": t.skipToPrevious(); break;
                case "abrir": o.abrirApp(); break;
            }
        } catch (Exception e) { }
    }

    void abrirApp() {
        MediaController m = ctrl;
        if (m == null) return;
        try {
            PendingIntent pi = m.getSessionActivity();
            if (pi != null) { pi.send(); return; }
        } catch (Exception e) { }
        try {
            Intent i = getPackageManager().getLaunchIntentForPackage(m.getPackageName());
            if (i != null) { i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); startActivity(i); }
        } catch (Exception e) { }
    }
}
