package com.josemontes.launcher;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.widget.Toast;

/** Lo pide Meraki Panel (botón «Modo barbería» del panel de arriba). Sólo apps con la misma firma pueden mandarlo. */
public class ReceptorModo extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        if (i == null || i.getAction() == null || !i.getAction().endsWith(".MODO")) return;
        boolean on = Barberia.alternar(c);
        Toast.makeText(c, on ? "Modo barbería activado" : "Modo barbería apagado: todo como estaba", Toast.LENGTH_SHORT).show();
    }
}
