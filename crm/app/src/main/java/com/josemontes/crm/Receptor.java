package com.josemontes.crm;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class Receptor extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        String a = i.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(a) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(a)) {
            Alarmas.reprogramarTodo(c);
            Leo.armar(c, 60000);
            return;
        }
        if (Leo.ACCION.equals(a)) { Leo.revisar(c, goAsync()); return; }
        String id = i.getStringExtra("id");
        if (id == null) return;
        Alarmas.mostrar(c, id, i.getStringExtra("texto") == null ? "Toca publicar en Meraki" : i.getStringExtra("texto"));
    }
}
