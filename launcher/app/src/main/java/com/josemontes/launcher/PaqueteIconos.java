package com.josemontes.launcher;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.content.res.Resources;
import android.graphics.drawable.Drawable;
import android.util.Xml;

import org.xmlpull.v1.XmlPullParser;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Lee paquetes de íconos de la Play Store (los mismos que usa Nova, ADW, Apex…). */
public class PaqueteIconos {
    static final String[] ACCIONES = {"com.novalauncher.THEME", "org.adw.launcher.THEMES", "com.gau.go.launcherex.theme",
            "com.teslacoilsw.launcher.THEME", "com.anddoes.launcher.THEME", "com.fede.launcher.THEME_ICONPACK"};

    final String pkg;
    final Resources res;
    final Map<String, String> mapa = new HashMap<>();

    /** Paquetes instalados: nombre del paquete -> nombre visible. */
    static Map<String, String> instalados(PackageManager pm) {
        Map<String, String> out = new LinkedHashMap<>();
        for (String a : ACCIONES) {
            List<ResolveInfo> l;
            try { l = pm.queryIntentActivities(new Intent(a), PackageManager.GET_META_DATA); } catch (Exception e) { continue; }
            for (ResolveInfo ri : l) {
                String p = ri.activityInfo.packageName;
                if (!out.containsKey(p)) out.put(p, String.valueOf(ri.loadLabel(pm)));
            }
        }
        return out;
    }

    PaqueteIconos(PackageManager pm, String pkg) throws Exception {
        this.pkg = pkg;
        res = pm.getResourcesForApplication(pkg);
        XmlPullParser x = null;
        int id = res.getIdentifier("appfilter", "xml", pkg);
        InputStream in = null;
        if (id != 0) x = res.getXml(id);
        else {
            in = res.getAssets().open("appfilter.xml");
            x = Xml.newPullParser();
            x.setInput(in, "UTF-8");
        }
        try {
            int ev = x.getEventType();
            while (ev != XmlPullParser.END_DOCUMENT) {
                if (ev == XmlPullParser.START_TAG && "item".equals(x.getName())) {
                    String comp = x.getAttributeValue(null, "component"), dr = x.getAttributeValue(null, "drawable");
                    if (comp != null && dr != null && comp.startsWith("ComponentInfo{") && comp.endsWith("}")) {
                        mapa.put(comp.substring(14, comp.length() - 1), dr);
                    }
                }
                ev = x.next();
            }
        } finally { if (in != null) try { in.close(); } catch (Exception e) { } }
    }

    final Map<String, Drawable> cache = new HashMap<>();
    final List<String> sinIcono = new ArrayList<>();

    Drawable icono(String paquete, String clase) {
        String k = paquete + "/" + clase;
        if (cache.containsKey(k)) return cache.get(k);
        String dr = mapa.get(k);
        if (dr == null && clase.startsWith(paquete)) dr = mapa.get(paquete + "/" + clase.substring(paquete.length()));
        Drawable d = null;
        if (dr != null) {
            int id = res.getIdentifier(dr, "drawable", pkg);
            if (id == 0) id = res.getIdentifier(dr, "mipmap", pkg);
            if (id != 0) try { d = res.getDrawable(id, null); } catch (Exception e) { d = null; }
        }
        cache.put(k, d);
        return d;
    }
}
