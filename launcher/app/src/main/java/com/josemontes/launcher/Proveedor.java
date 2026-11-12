package com.josemontes.launcher;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;

import java.io.File;
import java.io.FileNotFoundException;
import java.util.Map;

/** Comparte con la app «Meraki Panel» (firmada con la misma llave) el estilo del panel que Jose escogió aquí. */
public class Proveedor extends ContentProvider {
    @Override public boolean onCreate() { return true; }

    @Override
    public Cursor query(Uri uri, String[] p, String s, String[] a, String o) {
        MatrixCursor c = new MatrixCursor(new String[]{"k", "t", "v"});
        SharedPreferences pr = getContext().getSharedPreferences("meraki", 0);
        for (Map.Entry<String, ?> e : pr.getAll().entrySet()) {
            String k = e.getKey();
            if (!(k.startsWith("panel_") || k.equals("tema") || k.equals("acento") || k.equals("letra") || k.equals("modo_on"))) continue;
            Object v = e.getValue();
            String t = v instanceof Boolean ? "b" : v instanceof Long ? "l" : v instanceof Integer ? "i" : "s";
            c.addRow(new Object[]{k, t, String.valueOf(v)});
        }
        return c;
    }

    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        File f = new File(getContext().getFilesDir(), "panel_foto.jpg");
        if (!f.exists()) throw new FileNotFoundException();
        return ParcelFileDescriptor.open(f, ParcelFileDescriptor.MODE_READ_ONLY);
    }

    @Override public String getType(Uri uri) { return null; }
    @Override public Uri insert(Uri uri, ContentValues v) { return null; }
    @Override public int delete(Uri uri, String s, String[] a) { return 0; }
    @Override public int update(Uri uri, ContentValues v, String s, String[] a) { return 0; }
}
