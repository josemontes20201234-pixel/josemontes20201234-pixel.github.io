package com.josemontes.launcher;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Meraki Panel avisa qué suena (sólo apps con la misma firma pueden mandarlo). */
public class ReceptorMusica extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        if (i == null || !Musica.ACCION_ESTADO.equals(i.getAction())) return;
        c.getSharedPreferences("meraki", Context.MODE_PRIVATE).edit().putBoolean("musica_acceso", i.getBooleanExtra("acceso", true)).apply();
        Musica.poner(Musica.deIntent(i));
    }
}
