package com.josemontes.enfoque;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class Receptor extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        String a = i.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(a) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(a)) {
            Alarmas.reprogramarTodo(c);
            return;
        }
        String id = i.getStringExtra("id");
        if (id == null) return;
        Alarmas.mostrar(c, id, i.getStringExtra("texto") == null ? "Tenés una tarea pendiente" : i.getStringExtra("texto"));
    }
}
