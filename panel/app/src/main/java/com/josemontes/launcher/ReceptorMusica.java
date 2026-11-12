package com.josemontes.launcher;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** El launcher pide qué suena o toca un control (sólo apps con la misma firma pueden mandarlo). */
public class ReceptorMusica extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        if (i == null || !Musica.ACCION_CONTROL.equals(i.getAction())) return;
        String cmd = i.getStringExtra("c");
        if (cmd != null) Oyente.control(c.getApplicationContext(), cmd);
    }
}
