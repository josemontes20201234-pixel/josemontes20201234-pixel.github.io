package com.josemontes.launcher;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.ComponentName;
import android.content.ContentUris;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.database.Cursor;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.ColorFilter;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.PixelFormat;
import android.graphics.RadialGradient;
import android.graphics.Rect;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.CalendarContract;
import android.provider.Settings;
import android.text.Editable;
import android.text.TextUtils;
import android.text.TextWatcher;
import android.util.TypedValue;
import android.view.GestureDetector;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputMethodManager;
import android.widget.BaseAdapter;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.GridLayout;
import android.widget.GridView;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextClock;
import android.widget.TextView;
import android.widget.Toast;

import java.text.Normalizer;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** Meraki Launcher: pantalla de inicio personal de Jose (Meraki Barbershop). */
public class MainActivity extends Activity {

    static final int ORO = 0xFFD9B55C, ORO_SUAVE = 0x33D9B55C, NEGRO = 0xFF0B0A08,
            BLANCO = 0xFFF5F1E8, GRIS = 0xFF9A948A, TARJETA = 0x99141210;
    static final int MAX_FAVS = 8;
    static final String[] FAVS_INICIALES = {
            "com.josemontes.academy", "com.josemontes.alumnos", "com.josemontes.proyector",
            "io.github.josemontes20201234_pixel.twa", "com.josemontes.bitacora",
            "com.whatsapp.w4b", "com.whatsapp", "com.instagram.android",
            "com.google.android.calendar", "com.android.chrome"};

    static class App {
        String label, pkg, cls, busqueda; Drawable icon;
        String key() { return pkg + "/" + cls; }
        ComponentName cn() { return new ComponentName(pkg, cls); }
    }

    SharedPreferences prefs;
    FrameLayout root;
    LinearLayout home, drawer, agendaLista;
    GridLayout favGrid;
    GridView grid;
    EditText buscar;
    TextView agendaTitulo;
    final List<App> todas = new ArrayList<>();
    final List<App> filtradas = new ArrayList<>();
    final Map<String, App> porKey = new HashMap<>();
    AppAdapter adapter;
    GestureDetector gestos;
    final Handler ui = new Handler(Looper.getMainLooper());

    // ---------- utilidades ----------
    int dp(float v) { return Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics())); }

    TextView texto(String s, float sp, int color, int estilo) {
        TextView t = new TextView(this);
        t.setText(s); t.setTextSize(sp); t.setTextColor(color);
        t.setTypeface(Typeface.create("sans-serif", estilo));
        t.setIncludeFontPadding(false);
        return t;
    }

    static String sinAcentos(String s) {
        return Normalizer.normalize(s == null ? "" : s, Normalizer.Form.NFD).replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT);
    }

    void toast(String s) { Toast.makeText(this, s, Toast.LENGTH_SHORT).show(); }

    AlertDialog.Builder dialogo() { return new AlertDialog.Builder(this, android.R.style.Theme_DeviceDefault_Dialog_Alert); }

    // ---------- ciclo de vida ----------
    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        prefs = getSharedPreferences("meraki", MODE_PRIVATE);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        construir();
        cargarApps();
    }

    @Override
    protected void onResume() {
        super.onResume();
        aplicarFondo();
        cargarAgenda();
        cargarApps();
    }

    @Override
    protected void onNewIntent(Intent i) {
        super.onNewIntent(i);
        // Botón de inicio: siempre volver a la pantalla principal
        cerrarCajon();
    }

    @Override
    public void onBackPressed() {
        if (drawer.getVisibility() == View.VISIBLE) cerrarCajon();
    }

    @Override
    public void onRequestPermissionsResult(int rc, String[] p, int[] r) {
        super.onRequestPermissionsResult(rc, p, r);
        cargarAgenda();
    }

    // ---------- interfaz ----------
    void construir() {
        root = new FrameLayout(this);
        setContentView(root);

        // ===== Inicio =====
        home = new LinearLayout(this);
        home.setOrientation(LinearLayout.VERTICAL);
        home.setClickable(true);
        home.setOnLongClickListener(v -> { menuInicio(); return true; });
        root.addView(home, new FrameLayout.LayoutParams(-1, -1));

        LinearLayout marca = new LinearLayout(this);
        marca.setGravity(Gravity.CENTER_VERTICAL);
        ImageView logo = new ImageView(this);
        logo.setImageResource(R.drawable.logo);
        GradientDrawable redondo = new GradientDrawable(); redondo.setShape(GradientDrawable.OVAL);
        logo.setBackground(redondo); logo.setClipToOutline(true);
        marca.addView(logo, new LinearLayout.LayoutParams(dp(30), dp(30)));
        TextView nombre = texto("MERAKI BARBERSHOP", 12, ORO, Typeface.BOLD);
        nombre.setLetterSpacing(0.22f);
        LinearLayout.LayoutParams lpN = new LinearLayout.LayoutParams(-2, -2); lpN.leftMargin = dp(10);
        marca.addView(nombre, lpN);
        home.addView(marca);

        TextClock hora = new TextClock(this);
        hora.setFormat12Hour("h:mm"); hora.setFormat24Hour("HH:mm");
        hora.setTextSize(88); hora.setTextColor(BLANCO);
        hora.setTypeface(Typeface.create("sans-serif-light", Typeface.NORMAL));
        hora.setIncludeFontPadding(false); hora.setLetterSpacing(-0.02f);
        LinearLayout.LayoutParams lpH = new LinearLayout.LayoutParams(-2, -2); lpH.topMargin = dp(28);
        hora.setOnClickListener(v -> abrir(new Intent(android.provider.AlarmClock.ACTION_SHOW_ALARMS), "No encontré la app del reloj."));
        home.addView(hora, lpH);

        TextClock fecha = new TextClock(this);
        fecha.setFormat12Hour("EEEE d 'de' MMMM"); fecha.setFormat24Hour("EEEE d 'de' MMMM");
        fecha.setTextSize(17); fecha.setTextColor(ORO);
        fecha.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
        fecha.setAllCaps(false);
        LinearLayout.LayoutParams lpF = new LinearLayout.LayoutParams(-2, -2); lpF.topMargin = dp(6);
        home.addView(fecha, lpF);

        View poste = new View(this);
        poste.setBackground(new Poste());
        LinearLayout.LayoutParams lpP = new LinearLayout.LayoutParams(dp(132), dp(5)); lpP.topMargin = dp(18);
        home.addView(poste, lpP);

        // Agenda del día
        LinearLayout agenda = new LinearLayout(this);
        agenda.setOrientation(LinearLayout.VERTICAL);
        GradientDrawable fondoAg = new GradientDrawable();
        fondoAg.setColor(TARJETA); fondoAg.setCornerRadius(dp(18)); fondoAg.setStroke(dp(1), ORO_SUAVE);
        agenda.setBackground(fondoAg);
        agenda.setPadding(dp(18), dp(14), dp(18), dp(14));
        agenda.setOnClickListener(v -> abrirCalendario(-1));
        agendaTitulo = texto("HOY", 11, ORO, Typeface.BOLD);
        agendaTitulo.setLetterSpacing(0.2f);
        agenda.addView(agendaTitulo);
        agendaLista = new LinearLayout(this);
        agendaLista.setOrientation(LinearLayout.VERTICAL);
        agenda.addView(agendaLista);
        LinearLayout.LayoutParams lpA = new LinearLayout.LayoutParams(-1, -2); lpA.topMargin = dp(26);
        home.addView(agenda, lpA);

        View espacio = new View(this);
        home.addView(espacio, new LinearLayout.LayoutParams(-1, 0, 1f));

        TextView pista = texto("︿\nDeslizá hacia arriba para ver todas tus apps", 11, GRIS, Typeface.NORMAL);
        pista.setGravity(Gravity.CENTER); pista.setLineSpacing(dp(2), 1f);
        pista.setOnClickListener(v -> abrirCajon());
        LinearLayout.LayoutParams lpPi = new LinearLayout.LayoutParams(-1, -2); lpPi.bottomMargin = dp(14);
        home.addView(pista, lpPi);

        favGrid = new GridLayout(this);
        favGrid.setColumnCount(4);
        GradientDrawable fondoDock = new GradientDrawable();
        fondoDock.setColor(TARJETA); fondoDock.setCornerRadius(dp(26)); fondoDock.setStroke(dp(1), ORO_SUAVE);
        favGrid.setBackground(fondoDock);
        favGrid.setPadding(dp(6), dp(12), dp(6), dp(6));
        home.addView(favGrid, new LinearLayout.LayoutParams(-1, -2));

        // ===== Cajón con todas las apps =====
        drawer = new LinearLayout(this);
        drawer.setOrientation(LinearLayout.VERTICAL);
        drawer.setBackgroundColor(0xF20B0A08);
        drawer.setVisibility(View.GONE);
        drawer.setClickable(true);
        root.addView(drawer, new FrameLayout.LayoutParams(-1, -1));

        TextView tituloCajon = texto("TODAS TUS APPS", 12, ORO, Typeface.BOLD);
        tituloCajon.setLetterSpacing(0.22f);
        drawer.addView(tituloCajon);

        buscar = new EditText(this);
        buscar.setHint("Buscar app…");
        buscar.setHintTextColor(GRIS); buscar.setTextColor(BLANCO); buscar.setTextSize(16);
        buscar.setSingleLine(true);
        buscar.setImeOptions(EditorInfo.IME_ACTION_GO);
        GradientDrawable fondoB = new GradientDrawable();
        fondoB.setColor(0x22FFFFFF); fondoB.setCornerRadius(dp(99)); fondoB.setStroke(dp(1), ORO_SUAVE);
        buscar.setBackground(fondoB);
        buscar.setPadding(dp(20), dp(12), dp(20), dp(12));
        buscar.addTextChangedListener(new TextWatcher() {
            public void beforeTextChanged(CharSequence s, int a, int b, int c) { }
            public void onTextChanged(CharSequence s, int a, int b, int c) { filtrar(); }
            public void afterTextChanged(Editable e) { }
        });
        buscar.setOnEditorActionListener((v, id, ev) -> {
            if (!filtradas.isEmpty()) lanzar(filtradas.get(0));
            return true;
        });
        LinearLayout.LayoutParams lpB = new LinearLayout.LayoutParams(-1, -2); lpB.topMargin = dp(14); lpB.bottomMargin = dp(10);
        drawer.addView(buscar, lpB);

        grid = new GridView(this);
        grid.setNumColumns(4);
        grid.setVerticalSpacing(dp(14));
        grid.setSelector(new android.graphics.drawable.ColorDrawable(Color.TRANSPARENT));
        grid.setVerticalScrollBarEnabled(false);
        grid.setOverScrollMode(View.OVER_SCROLL_NEVER);
        adapter = new AppAdapter();
        grid.setAdapter(adapter);
        grid.setOnItemClickListener((p, v, pos, id) -> lanzar(filtradas.get(pos)));
        grid.setOnItemLongClickListener((p, v, pos, id) -> { opcionesApp(filtradas.get(pos)); return true; });
        drawer.addView(grid, new LinearLayout.LayoutParams(-1, 0, 1f));

        // Respetar la barra de estado y la de navegación
        root.setOnApplyWindowInsetsListener((v, ins) -> {
            int t = ins.getSystemWindowInsetTop(), bo = ins.getSystemWindowInsetBottom();
            home.setPadding(dp(22), t + dp(26), dp(22), bo + dp(14));
            drawer.setPadding(dp(16), t + dp(20), dp(16), Math.max(bo, 0) + dp(8));
            return ins.consumeSystemWindowInsets();
        });

        // Gestos: arriba abre el cajón, abajo baja las notificaciones o cierra el cajón
        gestos = new GestureDetector(this, new GestureDetector.SimpleOnGestureListener() {
            @Override
            public boolean onFling(MotionEvent a, MotionEvent b, float vx, float vy) {
                if (a == null || b == null) return false;
                float dy = b.getY() - a.getY(), dx = b.getX() - a.getX();
                if (Math.abs(dy) < dp(60) || Math.abs(dy) < Math.abs(dx) * 1.3f) return false;
                if (drawer.getVisibility() == View.VISIBLE) {
                    if (dy > 0 && !grid.canScrollVertically(-1)) { cerrarCajon(); return true; }
                } else {
                    if (dy < 0) { abrirCajon(); return true; }
                    bajarNotificaciones(); return true;
                }
                return false;
            }
        });
        gestos.setIsLongpressEnabled(false);
    }

    @Override
    public boolean dispatchTouchEvent(MotionEvent ev) {
        if (gestos != null && gestos.onTouchEvent(ev)) {
            MotionEvent cancel = MotionEvent.obtain(ev);
            cancel.setAction(MotionEvent.ACTION_CANCEL);
            super.dispatchTouchEvent(cancel);
            cancel.recycle();
            return true;
        }
        return super.dispatchTouchEvent(ev);
    }

    // ---------- fondo ----------
    void aplicarFondo() {
        boolean meraki = prefs.getBoolean("fondo_meraki", true);
        root.setBackground(meraki ? new FondoMeraki() : new Velo());
    }

    /** Fondo negro con un brillo dorado suave, como el logo. */
    class FondoMeraki extends Drawable {
        final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        @Override public void draw(Canvas c) {
            Rect r = getBounds();
            p.setShader(new LinearGradient(0, 0, 0, r.height(), 0xFF14120E, 0xFF060505, Shader.TileMode.CLAMP));
            c.drawRect(r, p);
            p.setShader(new RadialGradient(r.width() * 0.85f, r.height() * 0.12f, r.width() * 0.9f, 0x40D9B55C, 0x00D9B55C, Shader.TileMode.CLAMP));
            c.drawRect(r, p);
            p.setShader(new RadialGradient(r.width() * 0.1f, r.height() * 0.95f, r.width() * 0.8f, 0x22D9B55C, 0x00D9B55C, Shader.TileMode.CLAMP));
            c.drawRect(r, p);
        }
        @Override public void setAlpha(int a) { }
        @Override public void setColorFilter(ColorFilter f) { }
        @Override public int getOpacity() { return PixelFormat.OPAQUE; }
    }

    /** Sobre tu fondo de pantalla: oscurece arriba y abajo para que se lean el reloj y las apps. */
    class Velo extends Drawable {
        final Paint p = new Paint();
        @Override public void draw(Canvas c) {
            Rect r = getBounds();
            p.setShader(new LinearGradient(0, 0, 0, r.height(), new int[]{0x99000000, 0x22000000, 0x22000000, 0xAA000000}, new float[]{0, .35f, .6f, 1}, Shader.TileMode.CLAMP));
            c.drawRect(r, p);
        }
        @Override public void setAlpha(int a) { }
        @Override public void setColorFilter(ColorFilter f) { }
        @Override public int getOpacity() { return PixelFormat.TRANSLUCENT; }
    }

    /** Franja de poste de barbero. */
    class Poste extends Drawable {
        final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        @Override public void draw(Canvas c) {
            Rect r = getBounds();
            float h = r.height(), w = h * 2.2f;
            Path clip = new Path(); clip.addRoundRect(new RectF(r), h / 2, h / 2, Path.Direction.CW);
            c.save(); c.clipPath(clip);
            p.setColor(0xFFF5F1E8); c.drawRect(r, p);
            int[] cols = {0xFFC8372D, 0xFFF5F1E8, 0xFF2B59C3, 0xFFF5F1E8};
            int k = 0;
            for (float x = -h * 2; x < r.width() + h * 2; x += w, k++) {
                p.setColor(cols[k % 4]);
                Path s = new Path();
                s.moveTo(r.left + x, r.bottom); s.lineTo(r.left + x + h, r.top);
                s.lineTo(r.left + x + h + w, r.top); s.lineTo(r.left + x + w, r.bottom); s.close();
                c.drawPath(s, p);
            }
            c.restore();
        }
        @Override public void setAlpha(int a) { }
        @Override public void setColorFilter(ColorFilter f) { }
        @Override public int getOpacity() { return PixelFormat.TRANSLUCENT; }
    }

    // ---------- apps ----------
    void cargarApps() {
        new Thread(() -> {
            PackageManager pm = getPackageManager();
            Intent i = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER);
            List<ResolveInfo> lista = pm.queryIntentActivities(i, 0);
            List<App> nuevas = new ArrayList<>();
            for (ResolveInfo ri : lista) {
                if (getPackageName().equals(ri.activityInfo.packageName)) continue;
                App a = new App();
                a.pkg = ri.activityInfo.packageName; a.cls = ri.activityInfo.name;
                CharSequence l = ri.loadLabel(pm); a.label = l == null ? a.pkg : l.toString();
                a.busqueda = sinAcentos(a.label);
                App vieja = porKey.get(a.key());
                a.icon = vieja != null ? vieja.icon : ri.loadIcon(pm);
                nuevas.add(a);
            }
            Collections.sort(nuevas, (x, y) -> x.busqueda.compareTo(y.busqueda));
            ui.post(() -> {
                todas.clear(); todas.addAll(nuevas);
                porKey.clear(); for (App a : todas) porKey.put(a.key(), a);
                filtrar();
                pintarFavoritos();
            });
        }).start();
    }

    void filtrar() {
        String q = sinAcentos(buscar.getText().toString().trim());
        filtradas.clear();
        for (App a : todas) if (q.isEmpty() || a.busqueda.contains(q)) filtradas.add(a);
        // Primero las que empiezan con lo que escribiste
        if (!q.isEmpty()) Collections.sort(filtradas, (x, y) -> Boolean.compare(!x.busqueda.startsWith(q), !y.busqueda.startsWith(q)));
        adapter.notifyDataSetChanged();
    }

    List<String> favoritos() {
        String s = prefs.getString("favs", null);
        List<String> out = new ArrayList<>();
        if (s == null) {
            // Primera vez: tus apps de Meraki y las de trabajo, si están instaladas
            for (String pkg : FAVS_INICIALES) {
                for (App a : todas) if (a.pkg.equals(pkg)) { out.add(a.key()); break; }
                if (out.size() >= MAX_FAVS) break;
            }
            if (!todas.isEmpty()) guardarFavs(out);
            return out;
        }
        for (String k : s.split("\\|")) if (!k.isEmpty()) out.add(k);
        return out;
    }

    void guardarFavs(List<String> l) { prefs.edit().putString("favs", TextUtils.join("|", l)).apply(); }

    void pintarFavoritos() {
        favGrid.removeAllViews();
        List<String> favs = favoritos();
        int ancho = (getResources().getDisplayMetrics().widthPixels - dp(44) - dp(12)) / 4;
        int n = 0;
        for (String k : favs) {
            App a = porKey.get(k);
            if (a == null) continue;
            View celda = celdaApp(a, true);
            GridLayout.LayoutParams lp = new GridLayout.LayoutParams();
            lp.width = ancho; lp.bottomMargin = dp(8);
            favGrid.addView(celda, lp);
            n++;
        }
        if (n == 0) {
            TextView t = texto("Mantené presionada una app en la lista de todas tus apps para fijarla aquí.", 12, GRIS, Typeface.NORMAL);
            t.setPadding(dp(12), dp(4), dp(12), dp(14)); t.setGravity(Gravity.CENTER);
            GridLayout.LayoutParams lp = new GridLayout.LayoutParams(GridLayout.spec(0), GridLayout.spec(0, 4));
            lp.width = ancho * 4;
            favGrid.addView(t, lp);
        }
    }

    View celdaApp(App a, boolean enInicio) {
        LinearLayout c = new LinearLayout(this);
        c.setOrientation(LinearLayout.VERTICAL);
        c.setGravity(Gravity.CENTER_HORIZONTAL);
        c.setPadding(dp(2), dp(2), dp(2), dp(2));
        ImageView iv = new ImageView(this);
        iv.setImageDrawable(a.icon);
        c.addView(iv, new LinearLayout.LayoutParams(dp(enInicio ? 54 : 50), dp(enInicio ? 54 : 50)));
        TextView t = texto(a.label, 11.5f, BLANCO, Typeface.NORMAL);
        t.setSingleLine(true); t.setEllipsize(TextUtils.TruncateAt.END); t.setGravity(Gravity.CENTER);
        t.setShadowLayer(dp(3), 0, dp(1), 0xCC000000);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, -2); lp.topMargin = dp(6);
        c.addView(t, lp);
        if (enInicio) {
            c.setOnClickListener(v -> lanzar(a));
            c.setOnLongClickListener(v -> { opcionesApp(a); return true; });
        }
        return c;
    }

    class AppAdapter extends BaseAdapter {
        public int getCount() { return filtradas.size(); }
        public Object getItem(int i) { return filtradas.get(i); }
        public long getItemId(int i) { return i; }
        public View getView(int i, View v, ViewGroup p) { return celdaApp(filtradas.get(i), false); }
    }

    void lanzar(App a) {
        try {
            Intent i = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
                    .setComponent(a.cn()).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
            startActivity(i);
            ui.postDelayed(this::cerrarCajon, 400);
        } catch (Exception e) {
            toast("No se pudo abrir " + a.label);
            cargarApps();
        }
    }

    void opcionesApp(App a) {
        List<String> favs = favoritos();
        boolean fijada = favs.contains(a.key());
        List<String> ops = new ArrayList<>();
        if (fijada) {
            ops.add("Quitar de inicio");
            if (favs.indexOf(a.key()) > 0) ops.add("Mover a la izquierda");
            if (favs.indexOf(a.key()) < favs.size() - 1) ops.add("Mover a la derecha");
        } else ops.add("Fijar en inicio");
        ops.add("Información de la app");
        ops.add("Desinstalar");
        dialogo().setTitle(a.label).setItems(ops.toArray(new String[0]), (d, w) -> {
            String op = ops.get(w);
            int idx = favs.indexOf(a.key());
            switch (op) {
                case "Fijar en inicio":
                    if (favs.size() >= MAX_FAVS) { toast("Ya tenés " + MAX_FAVS + " apps en inicio. Quitá una primero."); return; }
                    favs.add(a.key()); guardarFavs(favs); pintarFavoritos(); toast(a.label + " fijada en inicio"); break;
                case "Quitar de inicio":
                    favs.remove(a.key()); guardarFavs(favs); pintarFavoritos(); break;
                case "Mover a la izquierda":
                    Collections.swap(favs, idx, idx - 1); guardarFavs(favs); pintarFavoritos(); break;
                case "Mover a la derecha":
                    Collections.swap(favs, idx, idx + 1); guardarFavs(favs); pintarFavoritos(); break;
                case "Información de la app":
                    abrir(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + a.pkg)), "No se pudo abrir la información.");
                    break;
                case "Desinstalar":
                    abrir(new Intent(Intent.ACTION_DELETE, Uri.parse("package:" + a.pkg)), "Esta app no se puede desinstalar.");
                    break;
            }
        }).show();
    }

    void menuInicio() {
        boolean meraki = prefs.getBoolean("fondo_meraki", true);
        String[] ops = {
                meraki ? "Usar mi fondo de pantalla" : "Usar fondo Meraki (negro y oro)",
                "Cambiar fondo de pantalla",
                "Ajustes del teléfono",
                "Elegir pantalla de inicio (launcher)"};
        dialogo().setTitle("Meraki Launcher").setItems(ops, (d, w) -> {
            if (w == 0) { prefs.edit().putBoolean("fondo_meraki", !meraki).apply(); aplicarFondo(); }
            else if (w == 1) {
                prefs.edit().putBoolean("fondo_meraki", false).apply(); aplicarFondo();
                abrir(Intent.createChooser(new Intent(Intent.ACTION_SET_WALLPAPER), "Elegí tu fondo"), "No encontré dónde cambiar el fondo.");
            }
            else if (w == 2) abrir(new Intent(Settings.ACTION_SETTINGS), "No se pudieron abrir los ajustes.");
            else abrir(new Intent(Settings.ACTION_HOME_SETTINGS), "Buscalo en Ajustes > Aplicaciones > Aplicaciones predeterminadas.");
        }).show();
    }

    void abrir(Intent i, String error) {
        try { i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); startActivity(i); }
        catch (ActivityNotFoundException | SecurityException e) { toast(error); }
    }

    // ---------- cajón ----------
    void abrirCajon() {
        if (drawer.getVisibility() == View.VISIBLE) return;
        drawer.setVisibility(View.VISIBLE);
        drawer.setAlpha(0f); drawer.setTranslationY(dp(60));
        drawer.animate().alpha(1f).translationY(0).setDuration(180).start();
        grid.setSelection(0);
    }

    void cerrarCajon() {
        if (drawer == null || drawer.getVisibility() != View.VISIBLE) return;
        InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
        if (imm != null) imm.hideSoftInputFromWindow(buscar.getWindowToken(), 0);
        buscar.clearFocus();
        drawer.animate().alpha(0f).translationY(dp(60)).setDuration(150).withEndAction(() -> {
            drawer.setVisibility(View.GONE);
            if (buscar.length() > 0) buscar.setText("");
        }).start();
    }

    @SuppressWarnings({"WrongConstant", "JavaReflectionMemberAccess"})
    void bajarNotificaciones() {
        try {
            Object sb = getSystemService("statusbar");
            Class.forName("android.app.StatusBarManager").getMethod("expandNotificationsPanel").invoke(sb);
        } catch (Exception e) { /* algunos teléfonos no lo permiten */ }
    }

    // ---------- agenda ----------
    void cargarAgenda() {
        agendaLista.removeAllViews();
        if (checkSelfPermission(Manifest.permission.READ_CALENDAR) != PackageManager.PERMISSION_GRANTED) {
            agendaTitulo.setText("HOY");
            TextView t = texto("Tocá aquí para ver tus citas y pendientes de hoy (de tu Google Calendar).", 14, BLANCO, Typeface.NORMAL);
            t.setLineSpacing(dp(3), 1f);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, -2); lp.topMargin = dp(10);
            agendaLista.addView(t, lp);
            ((View) agendaLista.getParent()).setOnClickListener(v -> requestPermissions(new String[]{Manifest.permission.READ_CALENDAR}, 7));
            return;
        }
        ((View) agendaLista.getParent()).setOnClickListener(v -> abrirCalendario(-1));
        new Thread(() -> {
            List<String[]> eventos = new ArrayList<>();
            Calendar c = Calendar.getInstance();
            long ahora = c.getTimeInMillis();
            c.set(Calendar.HOUR_OF_DAY, 0); c.set(Calendar.MINUTE, 0); c.set(Calendar.SECOND, 0); c.set(Calendar.MILLISECOND, 0);
            long ini = c.getTimeInMillis(), fin = ini + 24L * 3600 * 1000;
            Uri.Builder ub = CalendarContract.Instances.CONTENT_URI.buildUpon();
            ContentUris.appendId(ub, ini); ContentUris.appendId(ub, fin);
            String[] proj = {CalendarContract.Instances.TITLE, CalendarContract.Instances.BEGIN, CalendarContract.Instances.END,
                    CalendarContract.Instances.ALL_DAY, CalendarContract.Instances.EVENT_ID};
            SimpleDateFormat f = new SimpleDateFormat("h:mm a", new Locale("es", "SV"));
            try (Cursor cur = getContentResolver().query(ub.build(), proj, CalendarContract.Instances.VISIBLE + "=1", null, CalendarContract.Instances.BEGIN + " ASC")) {
                while (cur != null && cur.moveToNext()) {
                    String titulo = cur.getString(0);
                    long b = cur.getLong(1), e = cur.getLong(2);
                    boolean todoDia = cur.getInt(3) == 1;
                    if (!todoDia && e < ahora) continue; // ya pasó
                    String cuando = todoDia ? "Todo el día" : f.format(b).replace(". ", "").replace(".", "");
                    eventos.add(new String[]{cuando, TextUtils.isEmpty(titulo) ? "(Sin título)" : titulo, String.valueOf(cur.getLong(4)), String.valueOf(b)});
                }
            } catch (Exception ex) { /* sin calendario */ }
            ui.post(() -> pintarAgenda(eventos));
        }).start();
    }

    void pintarAgenda(List<String[]> eventos) {
        agendaLista.removeAllViews();
        agendaTitulo.setText(eventos.isEmpty() ? "HOY" : "HOY · " + eventos.size() + (eventos.size() == 1 ? " PENDIENTE" : " PENDIENTES"));
        if (eventos.isEmpty()) {
            TextView t = texto("Nada más en tu agenda hoy. Tocá para abrir el calendario.", 14, GRIS, Typeface.NORMAL);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, -2); lp.topMargin = dp(10);
            agendaLista.addView(t, lp);
            return;
        }
        int max = Math.min(4, eventos.size());
        for (int k = 0; k < max; k++) {
            String[] ev = eventos.get(k);
            LinearLayout fila = new LinearLayout(this);
            fila.setGravity(Gravity.CENTER_VERTICAL);
            TextView h = texto(ev[0], 13, ORO, Typeface.BOLD);
            h.setMinWidth(dp(84));
            fila.addView(h);
            TextView ti = texto(ev[1], 15, BLANCO, Typeface.NORMAL);
            ti.setSingleLine(true); ti.setEllipsize(TextUtils.TruncateAt.END);
            fila.addView(ti, new LinearLayout.LayoutParams(0, -2, 1f));
            final long id = Long.parseLong(ev[2]);
            fila.setOnClickListener(v -> abrirCalendario(id));
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, -2); lp.topMargin = dp(11);
            agendaLista.addView(fila, lp);
        }
        if (eventos.size() > max) {
            TextView mas = texto("+" + (eventos.size() - max) + " más", 12, GRIS, Typeface.NORMAL);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-2, -2); lp.topMargin = dp(10);
            agendaLista.addView(mas, lp);
        }
    }

    void abrirCalendario(long eventoId) {
        Uri u = eventoId >= 0
                ? ContentUris.withAppendedId(CalendarContract.Events.CONTENT_URI, eventoId)
                : CalendarContract.CONTENT_URI.buildUpon().appendPath("time").appendPath(String.valueOf(System.currentTimeMillis())).build();
        abrir(new Intent(Intent.ACTION_VIEW, u), "No encontré la app de calendario.");
    }

    @Override
    public boolean onKeyDown(int code, KeyEvent ev) {
        // Si escribís con el cajón cerrado, abre la búsqueda directo
        if (drawer.getVisibility() != View.VISIBLE && ev.isPrintingKey()) {
            abrirCajon(); buscar.requestFocus();
        }
        return super.onKeyDown(code, ev);
    }
}
