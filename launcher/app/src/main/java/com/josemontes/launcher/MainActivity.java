package com.josemontes.launcher;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.SearchManager;
import android.appwidget.AppWidgetHost;
import android.appwidget.AppWidgetHostView;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProviderInfo;
import android.content.pm.LauncherApps;
import android.content.pm.ShortcutInfo;
import android.os.Process;
import android.content.ActivityNotFoundException;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.ContentUris;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.ColorFilter;
import android.graphics.ColorMatrix;
import android.graphics.ColorMatrixColorFilter;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.PixelFormat;
import android.graphics.PorterDuff;
import android.graphics.PorterDuffColorFilter;
import android.graphics.RadialGradient;
import android.graphics.Rect;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.graphics.drawable.AdaptiveIconDrawable;
import android.graphics.drawable.BitmapDrawable;
import android.graphics.drawable.ColorDrawable;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.AlarmClock;
import android.provider.CalendarContract;
import android.provider.Settings;
import android.text.Editable;
import android.text.InputType;
import android.text.TextUtils;
import android.text.TextWatcher;
import android.text.format.DateFormat;
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
import android.widget.ScrollView;
import android.widget.Switch;
import android.widget.TextClock;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.Normalizer;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Calendar;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Meraki Launcher v2: pantalla de inicio personal de Jose (Meraki Barbershop).
 * Estilos de inicio, íconos monocromos, clima, batería, agenda y ajustes.
 * Guarda todo en las mismas preferencias "meraki" de la versión 1 (favs, fondo_meraki).
 */
public class MainActivity extends Activity {

    static final Locale ES = new Locale("es", "SV");
    static final String[] FAVS_INICIALES = {
            "com.josemontes.academy", "com.josemontes.alumnos", "com.josemontes.proyector",
            "io.github.josemontes20201234_pixel.twa", "com.josemontes.bitacora",
            "com.whatsapp.w4b", "com.whatsapp", "com.instagram.android",
            "com.google.android.calendar", "com.android.chrome"};

    // Opciones (clave guardada, nombre que ve Jose)
    static final String[][] ESTILOS = {{"meraki", "Meraki (reloj, agenda y apps abajo)"}, {"revista", "Revista (letras grandes y lista de apps)"},
            {"reloj", "Reloj (anillo de minutos)"}, {"columna", "Columna (hora vertical e íconos al lado)"}};
    static final String[][] ICONOS = {{"original", "Originales"}, {"mono", "Monocromo"}, {"oro", "Monocromo de color"}, {"circulo", "En círculo"}};
    static final String[][] ACENTOS = {{"D9B55C", "Oro Meraki"}, {"F5F1E8", "Blanco hueso"}, {"D8443A", "Rojo poste"}, {"3F6FD8", "Azul poste"}, {"6FCF97", "Verde menta"}, {"C9A7FF", "Lavanda"}};
    static final String[][] LETRAS = {{"moderna", "Moderna"}, {"clasica", "Clásica (con serifa)"}, {"condensada", "Condensada"}};
    static final String[][] TEMAS = {{"oscuro", "Oscuro"}, {"claro", "Claro"}};
    static final String[][] TAMANOS = {{"0", "Pequeños"}, {"1", "Normales"}, {"2", "Grandes"}};
    static final String[][] FONDOS = {{"meraki", "Meraki (según el tema oscuro o claro)"}, {"foto", "Una foto de mi galería"}, {"sistema", "El fondo de pantalla del teléfono"}};
    static final String[][] INSIGNIAS = {{"punto", "Puntito"}, {"numero", "Número"}, {"no", "No mostrar"}};
    static final String[][] CAJON_ESTILOS = {{"cuadricula", "Cuadrícula"}, {"lista", "Lista"}};
    static final String[][] CAJON_ORDEN = {{"alfa", "Alfabético"}, {"uso", "Las que más usás primero"}};
    static final String[][] ACCIONES = {{"cajon", "Abrir todas las apps"}, {"notificaciones", "Bajar notificaciones"}, {"buscar", "Buscar"},
            {"google", "Abrir Google"}, {"ajustes", "Ajustes del launcher"}, {"bloquear", "Apagar la pantalla"}, {"barra", "Mostrar u ocultar la barra de arriba"}, {"app", "Abrir una app…"}, {"nada", "No hacer nada"}};
    static final String[][] GESTOS = {{"g_arriba", "Deslizar hacia arriba", "cajon"}, {"g_abajo", "Deslizar hacia abajo", "notificaciones"},
            {"g_doble", "Doble toque", "ajustes"}, {"g_derecha", "Deslizar a la derecha", "nada"}, {"g_izquierda", "Deslizar a la izquierda", "nada"}};
    static final String[][] COLUMNAS = {{"4", "4 columnas"}, {"5", "5 columnas"}};

    static class App {
        String label, pkg, cls, busqueda; Drawable icon;
        String key() { return pkg + "/" + cls; }
        ComponentName cn() { return new ComponentName(pkg, cls); }
    }

    SharedPreferences prefs;
    // configuración actual
    String estilo, iconos, letra, nombre;
    String fondo, insignias, cajonEstilo, cajonOrden, paqueteNombre;
    boolean verNombres, verSugeridas, pantallaCompleta;
    AppWidgetManager awm;
    Anfitrion host;
    LinearLayout widgetBox;
    ScrollView scrollMedio;
    PaqueteIconos paquete;
    LinearLayout sugeridasBox;
    float bajoX, bajoY;
    static final int REQ_BIND = 41, REQ_CONFIG = 42, REQ_GUARDAR = 43, REQ_ABRIR = 44;
    boolean claro, fondoMeraki, verClima, verBateria, verAgenda, verBusqueda;
    int acento, tamIcono, columnas;
    int FG, MUTED, CARD, LINEA, CAJON;

    FrameLayout root, homeBox;
    LinearLayout drawer, ajustes, agendaLista;
    View agendaCaja;
    TextView agendaTitulo;
    ViewGroup favBox;
    String favModo = "grid";
    GridView grid;
    EditText buscar;
    TextView buscarWeb, tituloCajon;
    final List<TextView> infoViews = new ArrayList<>();
    final List<Dial> diales = new ArrayList<>();
    final List<TextView> fechas = new ArrayList<>();
    final List<App> todas = new ArrayList<>();
    final List<App> filtradas = new ArrayList<>();
    final Map<String, App> porKey = new HashMap<>();
    final Map<String, Drawable> cacheIconos = new HashMap<>();
    AppAdapter adapter;
    GestureDetector gestos;
    final Handler ui = new Handler(Looper.getMainLooper());
    int bateria = -1; boolean cargando = false;
    String diaConstruido = "";
    int insetArriba, insetAbajo;

    final BroadcastReceiver receptor = new BroadcastReceiver() {
        @Override public void onReceive(Context c, Intent i) {
            if (Intent.ACTION_BATTERY_CHANGED.equals(i.getAction())) { leerBateria(i); actualizarInfo(); }
            else { for (Dial d : diales) d.invalidate(); for (TextView t : fechas) t.setText(textoFecha()); if (!diaConstruido.equals(hoyClave())) construirInicio(); }
        }
    };

    // =====================================================================
    // utilidades
    // =====================================================================
    int dp(float v) { return Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics())); }

    Typeface tf(boolean titulo) {
        switch (letra) {
            case "clasica": return Typeface.create(Typeface.SERIF, titulo ? Typeface.BOLD : Typeface.NORMAL);
            case "condensada": return Typeface.create("sans-serif-condensed", titulo ? Typeface.BOLD : Typeface.NORMAL);
            default: return titulo ? Typeface.create("sans-serif-black", Typeface.NORMAL) : Typeface.create("sans-serif", Typeface.NORMAL);
        }
    }

    TextView texto(String s, float sp, int color, Typeface t) {
        TextView v = new TextView(this);
        v.setText(s); v.setTextSize(sp); v.setTextColor(color); v.setTypeface(t);
        v.setIncludeFontPadding(false);
        return v;
    }

    TextView etiqueta(String s, int color) {
        TextView t = texto(s, 11, color, Typeface.create("sans-serif-medium", Typeface.BOLD));
        t.setLetterSpacing(0.2f); t.setAllCaps(true);
        return t;
    }

    static String sinAcentos(String s) {
        return Normalizer.normalize(s == null ? "" : s, Normalizer.Form.NFD).replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT);
    }

    static String mayus1(String s) { return s == null || s.isEmpty() ? "" : s.substring(0, 1).toUpperCase(ES) + s.substring(1); }

    void toast(String s) { Toast.makeText(this, s, Toast.LENGTH_SHORT).show(); }

    AlertDialog.Builder dialogo() {
        return new AlertDialog.Builder(this, claro ? android.R.style.Theme_DeviceDefault_Light_Dialog_Alert : android.R.style.Theme_DeviceDefault_Dialog_Alert);
    }

    GradientDrawable caja(int color, float radio, int borde) {
        GradientDrawable g = new GradientDrawable();
        g.setColor(color); g.setCornerRadius(dp(radio));
        if (borde != 0) g.setStroke(dp(1), borde);
        return g;
    }

    static int conAlpha(int c, int a) { return (c & 0x00FFFFFF) | (a << 24); }

    LinearLayout.LayoutParams lp(int w, int h, int arriba) {
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(w, h); p.topMargin = dp(arriba); return p;
    }

    String hoyClave() { return new SimpleDateFormat("yyyyMMdd", Locale.ROOT).format(new Date()); }

    String nombre(String[][] ops, String clave) { for (String[] o : ops) if (o[0].equals(clave)) return o[1]; return ops[0][1]; }

    // =====================================================================
    // configuración
    // =====================================================================
    void leerConfig() {
        estilo = prefs.getString("estilo", "meraki");
        iconos = prefs.getString("iconos", "original");
        letra = prefs.getString("letra", "moderna");
        nombre = prefs.getString("nombre", "Jose");
        claro = "claro".equals(prefs.getString("tema", "oscuro"));
        fondoMeraki = prefs.getBoolean("fondo_meraki", true);
        fondo = prefs.getString("fondo", fondoMeraki ? "meraki" : "sistema");
        verClima = prefs.getBoolean("ver_clima", true);
        verBateria = prefs.getBoolean("ver_bateria", true);
        verAgenda = prefs.getBoolean("ver_agenda", true);
        verBusqueda = prefs.getBoolean("ver_busqueda", true);
        verNombres = prefs.getBoolean("ver_nombres", true);
        pantallaCompleta = prefs.getBoolean("pantalla_completa", false);
        verSugeridas = prefs.getBoolean("ver_sugeridas", true);
        insignias = prefs.getString("insignias", "punto");
        cajonEstilo = prefs.getString("cajon_estilo", "cuadricula");
        cajonOrden = prefs.getString("cajon_orden", "alfa");
        paqueteNombre = prefs.getString("paquete_iconos", "");
        try { acento = 0xFF000000 | Integer.parseInt(prefs.getString("acento", "D9B55C"), 16); } catch (Exception e) { acento = 0xFFD9B55C; }
        tamIcono = Integer.parseInt(prefs.getString("tam_icono", "1"));
        columnas = Integer.parseInt(prefs.getString("columnas", "4"));
        // En tema claro, el oro y el blanco hueso no se leen: se oscurecen un poco
        if (claro && acento == 0xFFF5F1E8) acento = 0xFF1A1A1A;
        if (claro && acento == 0xFFD9B55C) acento = 0xFFA8822B;
        FG = claro ? 0xFF141414 : 0xFFF5F1E8;
        MUTED = claro ? 0xFF6E685E : 0xFF9A948A;
        CARD = claro ? 0xB3FFFFFF : 0x99141210;
        LINEA = claro ? 0x22000000 : conAlpha(acento, 0x40);
        CAJON = claro ? 0xF5F4F1EA : 0xF20B0A08;
    }

    void guardar(String k, String v) { prefs.edit().putString(k, v).apply(); aplicarTodo(); }
    void guardar(String k, boolean v) { prefs.edit().putBoolean(k, v).apply(); aplicarTodo(); }

    void aplicarTodo() {
        leerConfig();
        cacheIconos.clear();
        aplicarFondo();
        estilizarCajon();
        construirInicio();
        adapter.notifyDataSetChanged();
        grid.setNumColumns("lista".equals(cajonEstilo) ? 1 : columnas);
        grid.setVerticalSpacing("lista".equals(cajonEstilo) ? 0 : dp(14));
        filtrar();
        if (ajustes.getVisibility() == View.VISIBLE) construirAjustes();
    }

    // =====================================================================
    // ciclo de vida
    // =====================================================================
    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        prefs = getSharedPreferences("meraki", MODE_PRIVATE);
        leerConfig();
        awm = AppWidgetManager.getInstance(this);
        host = new Anfitrion(this, 1024);
        Insignias.alCambiar = () -> { adapter.notifyDataSetChanged(); pintarFavoritos(); pintarSugeridas(); };
        construir();
        aplicarFondo();
        estilizarCajon();
        construirInicio();
        cargarApps();
        cargarPaquete();
    }

    @Override
    protected void onStart() {
        super.onStart();
        try { host.startListening(); } catch (Exception e) { }
    }

    @Override
    protected void onStop() {
        super.onStop();
        try { host.stopListening(); } catch (Exception e) { }
    }

    @Override
    protected void onResume() {
        super.onResume();
        IntentFilter f = new IntentFilter(Intent.ACTION_BATTERY_CHANGED);
        f.addAction(Intent.ACTION_TIME_TICK); f.addAction(Intent.ACTION_TIME_CHANGED); f.addAction(Intent.ACTION_TIMEZONE_CHANGED);
        Intent bat;
        if (Build.VERSION.SDK_INT >= 33) bat = registerReceiver(receptor, f, Context.RECEIVER_NOT_EXPORTED);
        else bat = registerReceiver(receptor, f);
        if (bat != null) leerBateria(bat);
        if (!diaConstruido.equals(hoyClave())) construirInicio();
        actualizarInfo();
        cargarAgenda();
        cargarApps();
        cargarClima(false);
        for (Dial d : diales) d.invalidate();
    }

    @Override
    protected void onPause() {
        super.onPause();
        try { unregisterReceiver(receptor); } catch (Exception e) { }
    }

    @Override
    public void onWindowFocusChanged(boolean foco) {
        super.onWindowFocusChanged(foco);
        if (foco && pantallaCompleta) estilizarCajon();
    }

    @Override
    protected void onNewIntent(Intent i) {
        super.onNewIntent(i);
        // Botón de inicio: siempre volver a la pantalla principal
        cerrarAjustes();
        cerrarCajon();
    }

    @Override
    public void onBackPressed() {
        if (ajustes.getVisibility() == View.VISIBLE) cerrarAjustes();
        else if (drawer.getVisibility() == View.VISIBLE) cerrarCajon();
    }

    @Override
    public void onRequestPermissionsResult(int rc, String[] p, int[] r) {
        super.onRequestPermissionsResult(rc, p, r);
        cargarAgenda();
    }

    // =====================================================================
    // estructura: inicio + cajón + ajustes
    // =====================================================================
    void construir() {
        root = new FrameLayout(this);
        setContentView(root);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);

        homeBox = new FrameLayout(this);
        homeBox.setClickable(true);
        homeBox.setOnLongClickListener(v -> { menuInicio(); return true; });
        root.addView(homeBox, new FrameLayout.LayoutParams(-1, -1));

        // ===== Cajón con todas las apps =====
        drawer = new LinearLayout(this);
        drawer.setOrientation(LinearLayout.VERTICAL);
        drawer.setVisibility(View.GONE);
        drawer.setClickable(true);
        root.addView(drawer, new FrameLayout.LayoutParams(-1, -1));

        LinearLayout cab = new LinearLayout(this);
        cab.setGravity(Gravity.CENTER_VERTICAL);
        tituloCajon = etiqueta("Todas tus apps", acento);
        cab.addView(tituloCajon, new LinearLayout.LayoutParams(0, -2, 1f));
        TextView engrane = texto("⚙  Ajustes", 13, MUTED, Typeface.create("sans-serif-medium", Typeface.NORMAL));
        engrane.setPadding(dp(10), dp(8), dp(4), dp(8));
        engrane.setOnClickListener(v -> abrirAjustes());
        cab.addView(engrane);
        drawer.addView(cab);

        buscar = new EditText(this);
        buscar.setHint("Buscar app…");
        buscar.setTextSize(16);
        buscar.setSingleLine(true);
        buscar.setImeOptions(EditorInfo.IME_ACTION_GO);
        buscar.setPadding(dp(20), dp(12), dp(20), dp(12));
        buscar.addTextChangedListener(new TextWatcher() {
            public void beforeTextChanged(CharSequence s, int a, int b, int c) { }
            public void onTextChanged(CharSequence s, int a, int b, int c) { filtrar(); }
            public void afterTextChanged(Editable e) { }
        });
        buscar.setOnEditorActionListener((v, id, ev) -> {
            if (!filtradas.isEmpty()) lanzar(filtradas.get(0));
            else buscarEnGoogle(buscar.getText().toString());
            return true;
        });
        drawer.addView(buscar, lp(-1, -2, 12));

        buscarWeb = texto("", 14, acento, Typeface.create("sans-serif-medium", Typeface.NORMAL));
        buscarWeb.setPadding(dp(8), dp(10), dp(8), dp(4));
        buscarWeb.setVisibility(View.GONE);
        buscarWeb.setOnClickListener(v -> buscarEnGoogle(buscar.getText().toString()));
        drawer.addView(buscarWeb);

        LinearLayout sug = columnaBase();
        sug.addView(etiqueta("Las que más usás", MUTED), lp(-2, -2, 0));
        sugeridasBox = new LinearLayout(this);
        sug.addView(sugeridasBox, lp(-1, -2, 10));
        View raya = new View(this); raya.setBackgroundColor(0x22888888);
        sug.addView(raya, lp(-1, 1, 12));
        sug.setVisibility(View.GONE);
        drawer.addView(sug, lp(-1, -2, 12));

        grid = new GridView(this);
        grid.setNumColumns("lista".equals(cajonEstilo) ? 1 : columnas);
        grid.setVerticalSpacing(dp(14));
        grid.setSelector(new ColorDrawable(Color.TRANSPARENT));
        grid.setVerticalScrollBarEnabled(false);
        grid.setOverScrollMode(View.OVER_SCROLL_NEVER);
        adapter = new AppAdapter();
        grid.setAdapter(adapter);
        grid.setOnItemClickListener((p, v, pos, id) -> lanzar(filtradas.get(pos)));
        grid.setOnItemLongClickListener((p, v, pos, id) -> { iniciarArrastreCajon(v, filtradas.get(pos).key()); return true; });
        drawer.setTag("cajon");
        drawer.setOnDragListener(this::alArrastrar);
        homeBox.setOnDragListener(this::alArrastrar);
        LinearLayout.LayoutParams lg = new LinearLayout.LayoutParams(-1, 0, 1f); lg.topMargin = dp(10);
        drawer.addView(grid, lg);

        // ===== Ajustes =====
        ajustes = new LinearLayout(this);
        ajustes.setOrientation(LinearLayout.VERTICAL);
        ajustes.setVisibility(View.GONE);
        ajustes.setClickable(true);
        root.addView(ajustes, new FrameLayout.LayoutParams(-1, -1));

        // Respetar la barra de estado y la de navegación
        root.setOnApplyWindowInsetsListener((v, ins) -> {
            insetArriba = ins.getSystemWindowInsetTop(); insetAbajo = ins.getSystemWindowInsetBottom();
            drawer.setPadding(dp(16), insetArriba + dp(18), dp(16), insetAbajo + dp(8));
            ajustes.setPadding(0, insetArriba, 0, 0);
            if (homeBox.getChildCount() > 0) homeBox.getChildAt(0).setPadding(dp(22), insetArriba + dp(24), dp(22), insetAbajo + dp(14));
            return ins.consumeSystemWindowInsets();
        });

        // Gestos configurables (arriba, abajo, doble toque, izquierda, derecha)
        gestos = new GestureDetector(this, new GestureDetector.SimpleOnGestureListener() {
            @Override
            public boolean onFling(MotionEvent a, MotionEvent b, float vx, float vy) {
                if (a == null || b == null || ajustes.getVisibility() == View.VISIBLE) return false;
                float dy = b.getY() - a.getY(), dx = b.getX() - a.getX();
                if (drawer.getVisibility() == View.VISIBLE) {
                    if (dy > dp(60) && Math.abs(dy) > Math.abs(dx) * 1.3f && !grid.canScrollVertically(-1)) { cerrarCajon(); return true; }
                    return false;
                }
                if (Math.abs(dy) > dp(60) && Math.abs(dy) > Math.abs(dx) * 1.3f) {
                    // Si el dedo empezó sobre la zona que se desplaza y todavía puede moverse, dejá que se desplace
                    if (enScrollMedio() && scrollMedio.canScrollVertically(dy < 0 ? 1 : -1)) return false;
                    return accion(dy < 0 ? "g_arriba" : "g_abajo");
                }
                if (Math.abs(dx) > dp(80) && Math.abs(dx) > Math.abs(dy) * 1.5f) {
                    if (dentroDe(dockScroll, bajoX, bajoY)) return false; // la cajita de apps se desliza sola
                    return accion(dx > 0 ? "g_derecha" : "g_izquierda");
                }
                return false;
            }
            @Override
            public boolean onDoubleTap(MotionEvent e) {
                if (drawer.getVisibility() == View.VISIBLE || ajustes.getVisibility() == View.VISIBLE) return false;
                return accion("g_doble");
            }
        });
        gestos.setIsLongpressEnabled(false);
    }

    @Override
    public boolean dispatchTouchEvent(MotionEvent ev) {
        if (ev.getActionMasked() == MotionEvent.ACTION_DOWN) { bajoX = ev.getRawX(); bajoY = ev.getRawY(); }
        if (gestos != null && gestos.onTouchEvent(ev)) {
            MotionEvent cancel = MotionEvent.obtain(ev);
            cancel.setAction(MotionEvent.ACTION_CANCEL);
            super.dispatchTouchEvent(cancel);
            cancel.recycle();
            return true;
        }
        return super.dispatchTouchEvent(ev);
    }

    boolean enScrollMedio() {
        if (scrollMedio == null || !scrollMedio.isShown()) return false;
        int[] xy = new int[2]; scrollMedio.getLocationOnScreen(xy);
        return bajoX >= xy[0] && bajoX <= xy[0] + scrollMedio.getWidth() && bajoY >= xy[1] && bajoY <= xy[1] + scrollMedio.getHeight();
    }

    String accionDe(String gesto) {
        for (String[] g : GESTOS) if (g[0].equals(gesto)) return prefs.getString(gesto, g[2]);
        return "nada";
    }

    /** Ejecuta lo que Jose eligió para ese gesto. Devuelve false si no hace nada. */
    boolean accion(String gesto) {
        String a = accionDe(gesto);
        if (a.startsWith("app:")) {
            App ap = porKey.get(a.substring(4));
            if (ap != null) lanzar(ap); else toast("Esa app ya no está instalada. Cambiá el gesto en Ajustes.");
            return true;
        }
        switch (a) {
            case "cajon": abrirCajon(); return true;
            case "notificaciones": bajarNotificaciones(); return true;
            case "buscar": abrirCajon(); buscar.requestFocus(); mostrarTeclado(); return true;
            case "google": abrirGoogle(); return true;
            case "ajustes": abrirAjustes(); return true;
            case "bloquear": apagarPantalla(); return true;
            case "barra": guardar("pantalla_completa", !pantallaCompleta); toast(pantallaCompleta ? "Pantalla completa" : "Barra de arriba visible"); return true;
            default: return false;
        }
    }

    ComponentName adminCn() { return new ComponentName(this, Admin.class); }

    boolean puedeApagar() {
        android.app.admin.DevicePolicyManager dpm = (android.app.admin.DevicePolicyManager) getSystemService(Context.DEVICE_POLICY_SERVICE);
        return dpm != null && dpm.isAdminActive(adminCn());
    }

    void apagarPantalla() {
        android.app.admin.DevicePolicyManager dpm = (android.app.admin.DevicePolicyManager) getSystemService(Context.DEVICE_POLICY_SERVICE);
        if (dpm != null && dpm.isAdminActive(adminCn())) {
            try { dpm.lockNow(); } catch (Exception e) { toast("No se pudo apagar la pantalla."); }
            return;
        }
        pedirPermisoApagar();
    }

    void pedirPermisoApagar() {
        Intent i = new Intent(android.app.admin.DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN);
        i.putExtra(android.app.admin.DevicePolicyManager.EXTRA_DEVICE_ADMIN, adminCn());
        i.putExtra(android.app.admin.DevicePolicyManager.EXTRA_ADD_EXPLANATION, "Sólo para apagar la pantalla con tu gesto. Ojo: al desbloquear quizás te pida el PIN en vez de la huella.");
        try { startActivity(i); } catch (Exception e) { toast("Tu teléfono no permite este permiso."); }
    }

    void quitarPermisoApagar() {
        android.app.admin.DevicePolicyManager dpm = (android.app.admin.DevicePolicyManager) getSystemService(Context.DEVICE_POLICY_SERVICE);
        try { if (dpm != null) dpm.removeActiveAdmin(adminCn()); toast("Listo, permiso quitado."); } catch (Exception e) { }
        ui.postDelayed(this::construirAjustes, 600);
    }

    void elegirGesto(String clave, String titulo) {
        String actual = accionDe(clave);
        String[] nombres = new String[ACCIONES.length];
        int sel = -1;
        for (int i = 0; i < ACCIONES.length; i++) {
            nombres[i] = ACCIONES[i][1];
            if (ACCIONES[i][0].equals(actual) || (actual.startsWith("app:") && "app".equals(ACCIONES[i][0]))) sel = i;
        }
        dialogo().setTitle(titulo).setSingleChoiceItems(nombres, sel, (d, w) -> {
            d.dismiss();
            String op = ACCIONES[w][0];
            if ("app".equals(op)) {
                elegirApp("¿Qué app abrir?", ap -> guardar(clave, "app:" + ap.key()));
                return;
            }
            if ("bloquear".equals(op) && !puedeApagar()) pedirPermisoApagar();
            guardar(clave, op);
        }).setNegativeButton("Cancelar", null).show();
    }

    String nombreGesto(String clave) {
        String a = accionDe(clave);
        if (a.startsWith("app:")) { App ap = porKey.get(a.substring(4)); return "Abrir " + (ap != null ? ap.label : "una app"); }
        return nombre(ACCIONES, a);
    }

    interface AlElegirApp { void elegida(App a); }

    void elegirApp(String titulo, AlElegirApp cb) {
        String[] nombres = new String[todas.size()];
        for (int i = 0; i < todas.size(); i++) nombres[i] = todas.get(i).label;
        List<App> copia = new ArrayList<>(todas);
        dialogo().setTitle(titulo).setItems(nombres, (d, w) -> cb.elegida(copia.get(w))).setNegativeButton("Cancelar", null).show();
    }

    void estilizarCajon() {
        drawer.setBackgroundColor(CAJON);
        tituloCajon.setTextColor(acento);
        ((TextView) ((ViewGroup) tituloCajon.getParent()).getChildAt(1)).setTextColor(MUTED);
        buscar.setHintTextColor(MUTED); buscar.setTextColor(FG);
        buscar.setBackground(caja(claro ? 0x14000000 : 0x22FFFFFF, 99, LINEA));
        buscarWeb.setTextColor(acento);
        ajustes.setBackgroundColor(claro ? 0xFFF4F1EA : 0xFF0B0A08);
        int vis = View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION;
        if (claro) vis |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        // Pantalla completa: se esconde la barra de notificaciones; deslizando desde arriba aparece un momento
        if (pantallaCompleta) vis |= View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY;
        getWindow().getDecorView().setSystemUiVisibility(vis);
    }

    // =====================================================================
    // pantalla de inicio (según el estilo)
    // =====================================================================
    void construirInicio() {
        homeBox.removeAllViews();
        infoViews.clear(); diales.clear(); fechas.clear();
        agendaLista = null; agendaCaja = null; agendaTitulo = null; widgetBox = null; scrollMedio = null; dockScroll = null; puntosDock = null;
        diaConstruido = hoyClave();
        View v;
        switch (estilo) {
            case "revista": v = inicioRevista(); break;
            case "reloj": v = inicioReloj(); break;
            case "columna": v = inicioColumna(); break;
            default: v = inicioMeraki();
        }
        v.setPadding(dp(22), insetArriba + dp(24), dp(22), insetAbajo + dp(14));
        homeBox.addView(v, new FrameLayout.LayoutParams(-1, -1));
        pintarFavoritos();
        pintarWidgets();
        actualizarInfo();
        cargarAgenda();
    }

    /** Zona central que se puede desplazar: agenda + widgets. */
    ScrollView zonaMedia(boolean conAgenda, boolean agendaCompacta) {
        ScrollView sv = new ScrollView(this);
        sv.setVerticalScrollBarEnabled(false);
        sv.setOverScrollMode(View.OVER_SCROLL_NEVER);
        sv.setFillViewport(true);
        LinearLayout c = columnaBase();
        if (conAgenda && verAgenda) c.addView(tarjetaAgenda(agendaCompacta), lp(-1, -2, 0));
        widgetBox = columnaBase();
        c.addView(widgetBox, lp(-1, -2, 0));
        sv.addView(c);
        scrollMedio = sv;
        return sv;
    }

    LinearLayout columnaBase() {
        LinearLayout l = new LinearLayout(this);
        l.setOrientation(LinearLayout.VERTICAL);
        return l;
    }

    View espacio(LinearLayout padre) { View e = new View(this); padre.addView(e, new LinearLayout.LayoutParams(-1, 0, 1f)); return e; }

    TextClock reloj(float sp, Typeface t, int color, String f12, String f24) {
        TextClock c = new TextClock(this);
        c.setFormat12Hour(f12); c.setFormat24Hour(f24);
        c.setTextSize(sp); c.setTextColor(color); c.setTypeface(t);
        c.setIncludeFontPadding(false);
        c.setOnClickListener(v -> abrir(new Intent(AlarmClock.ACTION_SHOW_ALARMS), "No encontré la app del reloj."));
        return c;
    }

    /** Fecha siempre en español, aunque el teléfono esté en inglés. */
    String textoFecha() { return mayus1(new SimpleDateFormat("EEEE d 'de' MMMM", ES).format(new Date())); }

    TextView fecha(float sp, Typeface t, int color) {
        TextView v = texto(textoFecha(), sp, color, t);
        v.setOnClickListener(x -> abrirCalendario(-1));
        fechas.add(v);
        return v;
    }

    TextView info(float sp, int color) {
        TextView t = texto("", sp, color, tf(false));
        t.setLineSpacing(dp(3), 1f);
        infoViews.add(t);
        return t;
    }

    View barraBusqueda() {
        LinearLayout b = new LinearLayout(this);
        b.setGravity(Gravity.CENTER_VERTICAL);
        b.setBackground(caja(CARD, 99, LINEA));
        b.setPadding(dp(18), dp(12), dp(10), dp(12));
        TextView lupa = texto("⌕", 20, MUTED, Typeface.DEFAULT);
        b.addView(lupa);
        TextView t = texto("Buscar apps o en Google…", 14, MUTED, tf(false));
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(0, -2, 1f); p.leftMargin = dp(10);
        b.addView(t, p);
        TextView g = texto("G", 17, acento, Typeface.create("sans-serif-black", Typeface.NORMAL));
        g.setPadding(dp(12), dp(2), dp(10), dp(2));
        g.setOnClickListener(v -> abrirGoogle());
        b.addView(g);
        b.setOnClickListener(v -> { abrirCajon(); buscar.requestFocus(); mostrarTeclado(); });
        return b;
    }

    View poste(int ancho) {
        View p = new View(this);
        p.setBackground(new Poste());
        p.setLayoutParams(lp(dp(ancho), dp(5), 16));
        return p;
    }

    View marca() {
        LinearLayout m = new LinearLayout(this);
        m.setGravity(Gravity.CENTER_VERTICAL);
        ImageView logo = new ImageView(this);
        logo.setImageResource(R.drawable.logo);
        GradientDrawable redondo = new GradientDrawable(); redondo.setShape(GradientDrawable.OVAL);
        logo.setBackground(redondo); logo.setClipToOutline(true);
        m.addView(logo, new LinearLayout.LayoutParams(dp(28), dp(28)));
        TextView n = etiqueta("Meraki Barbershop", acento);
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-2, -2); p.leftMargin = dp(10);
        m.addView(n, p);
        return m;
    }

    View tarjetaAgenda(boolean compacta) {
        LinearLayout a = columnaBase();
        if (!compacta) { a.setBackground(caja(CARD, 18, LINEA)); a.setPadding(dp(18), dp(14), dp(18), dp(14)); }
        agendaTitulo = etiqueta("Hoy", acento);
        a.addView(agendaTitulo);
        agendaLista = columnaBase();
        a.addView(agendaLista);
        agendaCaja = a;
        a.setOnClickListener(v -> abrirCalendario(-1));
        return a;
    }

    // ---------- Estilo Meraki (el de la versión 1) ----------
    View inicioMeraki() {
        LinearLayout h = columnaBase();
        h.addView(marca());
        TextClock hora = reloj(88, Typeface.create("sans-serif-light", Typeface.NORMAL), FG, "h:mm", "HH:mm");
        hora.setLetterSpacing(-0.02f);
        if ("clasica".equals(letra) || "condensada".equals(letra)) hora.setTypeface(tf(false));
        h.addView(hora, lp(-2, -2, 26));
        TextView fecha = fecha(17, Typeface.create("sans-serif-medium", Typeface.NORMAL), acento);
        h.addView(fecha, lp(-2, -2, 6));
        h.addView(info(13, MUTED), lp(-1, -2, 8));
        h.addView(poste(132));
        LinearLayout.LayoutParams pm = new LinearLayout.LayoutParams(-1, 0, 1f); pm.topMargin = dp(22); pm.bottomMargin = dp(12);
        h.addView(zonaMedia(true, false), pm);
        if (verBusqueda) h.addView(barraBusqueda(), lp(-1, -2, 0));
        else {
            TextView pista = texto("︿\nDeslizá hacia arriba para ver todas tus apps", 11, MUTED, tf(false));
            pista.setGravity(Gravity.CENTER);
            pista.setOnClickListener(v -> abrirCajon());
            h.addView(pista, lp(-1, -2, 0));
        }
        // Cajita de apps: siempre 2 filas; deslizando a los lados pasa de página
        LinearLayout dock = columnaBase();
        dock.setBackground(caja(CARD, 26, LINEA));
        dock.setPadding(dp(6), dp(12), dp(6), dp(8));
        PaginasDock hs = new PaginasDock(this);
        hs.setHorizontalScrollBarEnabled(false);
        hs.setOverScrollMode(View.OVER_SCROLL_NEVER);
        hs.setTag("pager");
        hs.setOnDragListener(this::alArrastrar);
        LinearLayout paginas = new LinearLayout(this);
        hs.addView(paginas);
        dock.addView(hs, new LinearLayout.LayoutParams(-1, -2));
        puntosDock = new LinearLayout(this);
        puntosDock.setGravity(Gravity.CENTER);
        dock.addView(puntosDock, lp(-1, dp(10), 2));
        hs.setOnScrollChangeListener((v, x, y, ox, oy) -> marcarPunto());
        dockScroll = hs;
        favBox = paginas; favModo = "paginas";
        h.addView(dock, lp(-1, -2, 12));
        return h;
    }

    // ---------- Estilo Revista ("Have a NICE Saturday") ----------
    View inicioRevista() {
        LinearLayout h = columnaBase();
        SimpleDateFormat fd = new SimpleDateFormat("dd MMM yyyy", ES);
        TextView badge = texto(fd.format(new Date()).toUpperCase(ES).replace(".", ""), 11, claro ? 0xFFFFFFFF : 0xFF0B0A08, Typeface.create("sans-serif-medium", Typeface.BOLD));
        badge.setLetterSpacing(0.15f);
        badge.setBackground(caja(acento, 4, 0));
        badge.setPadding(dp(8), dp(5), dp(8), dp(5));
        h.addView(badge, new LinearLayout.LayoutParams(-2, -2));

        String dia = new SimpleDateFormat("EEEE", ES).format(new Date()).toUpperCase(ES);
        Typeface tit = tf(true);
        TextView l1 = texto("QUE TENGÁS UN", 34, FG, tit);
        h.addView(l1, lp(-2, -2, 18));
        TextView l2 = texto(" BUEN ", 34, claro ? 0xFFFFFFFF : 0xFF0B0A08, tit);
        l2.setBackgroundColor(acento);
        h.addView(l2, lp(-2, -2, 6));
        TextView l3 = texto(dia + ".", 34, FG, tit);
        h.addView(l3, lp(-2, -2, 6));

        View raya = new View(this); raya.setBackgroundColor(acento);
        h.addView(raya, lp(dp(56), dp(4), 14));

        TextView saludo = texto(saludo() + (nombre.isEmpty() ? "." : ", " + nombre + "."), 14, FG, tf(false));
        h.addView(saludo, lp(-1, -2, 16));
        TextView inf = info(13, MUTED);
        inf.setMaxWidth(dp(300));
        h.addView(inf, lp(-1, -2, 6));
        ScrollView sv = zonaMedia(true, true);
        LinearLayout cont = (LinearLayout) sv.getChildAt(0);
        TextView mis = etiqueta("Mis apps", acento);
        cont.addView(mis, lp(-2, -2, 22));
        LinearLayout lista = columnaBase();
        cont.addView(lista, lp(-1, -2, 8));
        favBox = lista; favModo = "lista";
        LinearLayout.LayoutParams ps = new LinearLayout.LayoutParams(-1, 0, 1f); ps.topMargin = dp(18);
        h.addView(sv, ps);
        if (verBusqueda) h.addView(barraBusqueda(), lp(-1, -2, 10));
        return h;
    }

    // ---------- Estilo Reloj (anillo de minutos) ----------
    View inicioReloj() {
        LinearLayout h = columnaBase();
        h.addView(marca());
        espacio(h);
        Dial d = new Dial(this);
        diales.add(d);
        d.setOnClickListener(v -> abrir(new Intent(AlarmClock.ACTION_SHOW_ALARMS), "No encontré la app del reloj."));
        h.addView(d, new LinearLayout.LayoutParams(-1, dp(250)));
        TextView fecha = fecha(15, tf(false), acento);
        fecha.setGravity(Gravity.CENTER);
        h.addView(fecha, lp(-1, -2, 4));
        TextView inf = info(12.5f, MUTED);
        inf.setGravity(Gravity.CENTER);
        h.addView(inf, lp(-1, -2, 8));
        LinearLayout.LayoutParams pm = new LinearLayout.LayoutParams(-1, 0, 1.4f); pm.topMargin = dp(20); pm.bottomMargin = dp(12);
        h.addView(zonaMedia(true, false), pm);
        if (verBusqueda) h.addView(barraBusqueda(), lp(-1, -2, 0));
        GridLayout fila = new GridLayout(this);
        fila.setColumnCount(5);
        favBox = fila; favModo = "fila";
        h.addView(fila, lp(-1, -2, 14));
        return h;
    }

    // ---------- Estilo Columna (hora vertical e íconos a la derecha) ----------
    View inicioColumna() {
        LinearLayout h = new LinearLayout(this);
        h.setOrientation(LinearLayout.HORIZONTAL);

        LinearLayout izq = columnaBase();
        Typeface fino = "moderna".equals(letra) ? Typeface.create("sans-serif-thin", Typeface.NORMAL) : tf(false);
        izq.addView(reloj(64, fino, acento, "hh", "HH"));
        izq.addView(reloj(64, fino, acento, "mm", "mm"), lp(-2, -2, 0));
        SimpleDateFormat fd = new SimpleDateFormat("d MMM yyyy", ES);
        TextView badge = texto(fd.format(new Date()).replace(".", ""), 11, claro ? 0xFFFFFFFF : 0xFF0B0A08, Typeface.create("sans-serif-medium", Typeface.BOLD));
        badge.setBackground(caja(FG, 99, 0));
        badge.setPadding(dp(10), dp(4), dp(10), dp(4));
        izq.addView(badge, lp(-2, -2, 22));
        String dia = new SimpleDateFormat("EEEE", ES).format(new Date());
        izq.addView(texto("Hoy es", 30, FG, tf(true)), lp(-2, -2, 12));
        izq.addView(texto(dia + ".", 30, FG, tf(true)), lp(-2, -2, 2));
        izq.addView(info(12, MUTED), lp(-1, -2, 12));
        if (verAgenda) izq.addView(tarjetaAgenda(true), lp(-1, -2, 14));
        if (verBusqueda) {
            View bb = barraBusqueda();
            izq.addView(bb, lp(-1, -2, 18));
        }
        LinearLayout.LayoutParams pi = new LinearLayout.LayoutParams(0, -1, 1f);
        h.addView(izq, pi);

        GridLayout der = new GridLayout(this);
        der.setColumnCount(2);
        favBox = der; favModo = "dos";
        LinearLayout derCaja = columnaBase();
        derCaja.setGravity(Gravity.BOTTOM);
        derCaja.addView(der);
        LinearLayout.LayoutParams pd = new LinearLayout.LayoutParams(-2, -1); pd.leftMargin = dp(14);
        h.addView(derCaja, pd);
        LinearLayout todo = columnaBase();
        todo.addView(zonaMedia(false, false), new LinearLayout.LayoutParams(-1, 0, 1f));
        todo.addView(h, new LinearLayout.LayoutParams(-1, -2));
        return todo;
    }

    String saludo() {
        int hr = Calendar.getInstance().get(Calendar.HOUR_OF_DAY);
        return hr < 12 ? "Buenos días" : hr < 18 ? "Buenas tardes" : "Buenas noches";
    }

    /** Reloj con anillo de minutos que gira (estilo "Eternity"). */
    class Dial extends View {
        final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        Dial(Context c) { super(c); }
        @Override protected void onDraw(Canvas c) {
            Calendar cal = Calendar.getInstance();
            boolean h24 = DateFormat.is24HourFormat(getContext());
            int hr = cal.get(h24 ? Calendar.HOUR_OF_DAY : Calendar.HOUR); if (!h24 && hr == 0) hr = 12;
            int mi = cal.get(Calendar.MINUTE);
            float w = getWidth(), hgt = getHeight(), cy = hgt / 2f;
            float R = Math.min(hgt * 0.46f, w * 0.36f);
            p.setTypeface(Typeface.create("sans-serif-light", Typeface.NORMAL));
            if (!"moderna".equals(letra)) p.setTypeface(tf(false));
            p.setTextSize(R * 0.78f);
            p.setColor(FG);
            p.setTextAlign(Paint.Align.LEFT);
            String hs = String.format(Locale.ROOT, "%02d", hr);
            float hw = p.measureText(hs);
            float x0 = Math.max(dp(4), (w - (hw + R * 2 + dp(12))) / 2f);
            Paint.FontMetrics fm = p.getFontMetrics();
            c.drawText(hs, x0, cy - (fm.ascent + fm.descent) / 2f, p);
            float cx = x0 + hw + dp(10) + R;
            // marcas de cada minuto
            p.setStyle(Paint.Style.FILL);
            for (int k = 0; k < 60; k++) {
                double ang = Math.toRadians(180 + (k - mi) * 6);
                float rr = R * 0.97f;
                p.setColor(conAlpha(MUTED, k % 5 == 0 ? 0xAA : 0x55));
                c.drawCircle(cx + (float) Math.cos(ang) * rr, cy + (float) Math.sin(ang) * rr, k % 5 == 0 ? dp(1.6f) : dp(1), p);
            }
            // números de 5 en 5
            p.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
            p.setTextAlign(Paint.Align.CENTER);
            p.setTextSize(R * 0.12f);
            for (int k = 0; k < 60; k += 5) {
                int dif = Math.abs(((k - mi) % 60 + 60) % 60); dif = Math.min(dif, 60 - dif);
                if (dif < 3) continue;
                double ang = Math.toRadians(180 + (k - mi) * 6);
                float rr = R * 0.76f;
                p.setColor(conAlpha(MUTED, 0xDD));
                c.drawText(String.format(Locale.ROOT, "%02d", k), cx + (float) Math.cos(ang) * rr, cy + (float) Math.sin(ang) * rr + p.getTextSize() * 0.35f, p);
            }
            // minuto actual en una pastilla, a la par de la hora
            p.setTextSize(R * 0.26f);
            p.setTypeface(Typeface.create("sans-serif-medium", Typeface.BOLD));
            String ms = String.format(Locale.ROOT, "%02d", mi);
            float mw = p.measureText(ms);
            float px = cx - R * 0.62f;
            RectF pill = new RectF(px - mw / 2 - dp(12), cy - R * 0.2f, px + mw / 2 + dp(12), cy + R * 0.2f);
            p.setStyle(Paint.Style.STROKE); p.setStrokeWidth(dp(1.5f)); p.setColor(acento);
            c.drawRoundRect(pill, pill.height() / 2, pill.height() / 2, p);
            p.setStyle(Paint.Style.FILL); p.setColor(FG);
            c.drawText(ms, px, cy + p.getTextSize() * 0.36f, p);
        }
    }

    void actualizarInfo() {
        if (infoViews.isEmpty()) return;
        List<String> partes = new ArrayList<>();
        String clima = textoClima();
        if (verClima && clima != null) partes.add(clima);
        if (verBateria && bateria >= 0) partes.add("Batería " + bateria + "%" + (cargando ? " · cargando" : ""));
        String s = TextUtils.join("  ·  ", partes);
        if ("revista".equals(estilo) || "columna".equals(estilo)) s = TextUtils.join(".\n", partes) + (partes.isEmpty() ? "" : ".");
        for (TextView t : infoViews) { t.setText(s); t.setVisibility(s.isEmpty() ? View.GONE : View.VISIBLE); }
    }

    void leerBateria(Intent i) {
        int nivel = i.getIntExtra(BatteryManager.EXTRA_LEVEL, -1), escala = i.getIntExtra(BatteryManager.EXTRA_SCALE, 100);
        if (nivel >= 0 && escala > 0) bateria = Math.round(nivel * 100f / escala);
        int st = i.getIntExtra(BatteryManager.EXTRA_STATUS, -1);
        cargando = st == BatteryManager.BATTERY_STATUS_CHARGING || st == BatteryManager.BATTERY_STATUS_FULL;
    }

    // =====================================================================
    // clima (Open-Meteo, gratis y sin cuenta) — Apopa
    // =====================================================================
    void cargarClima(boolean forzar) {
        if (!verClima) return;
        long ult = prefs.getLong("clima_ts", 0);
        if (!forzar && System.currentTimeMillis() - ult < 30 * 60 * 1000) return;
        new Thread(() -> {
            try {
                URL u = new URL("https://api.open-meteo.com/v1/forecast?latitude=13.807&longitude=-89.179&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1");
                HttpURLConnection con = (HttpURLConnection) u.openConnection();
                con.setConnectTimeout(8000); con.setReadTimeout(8000);
                StringBuilder sb = new StringBuilder();
                try (BufferedReader r = new BufferedReader(new InputStreamReader(con.getInputStream(), "UTF-8"))) {
                    String line; while ((line = r.readLine()) != null) sb.append(line);
                }
                JSONObject j = new JSONObject(sb.toString());
                prefs.edit().putString("clima_json", j.toString()).putLong("clima_ts", System.currentTimeMillis()).apply();
                ui.post(this::actualizarInfo);
            } catch (Exception e) { /* sin internet: se queda el último clima */ }
        }).start();
    }

    String textoClima() {
        String s = prefs.getString("clima_json", null);
        if (s == null) return null;
        try {
            JSONObject j = new JSONObject(s), cur = j.getJSONObject("current");
            int t = (int) Math.round(cur.getDouble("temperature_2m"));
            String desc = descClima(cur.getInt("weather_code"));
            String r = "Apopa " + t + "° · " + desc;
            JSONObject d = j.optJSONObject("daily");
            if (d != null && "revista".equals(estilo)) {
                r += " · máx " + Math.round(d.getJSONArray("temperature_2m_max").getDouble(0)) + "° mín " + Math.round(d.getJSONArray("temperature_2m_min").getDouble(0)) + "°";
                r += ".\nHumedad " + cur.getInt("relative_humidity_2m") + "%, viento " + Math.round(cur.getDouble("wind_speed_10m")) + " km/h";
            }
            return r;
        } catch (Exception e) { return null; }
    }

    static String descClima(int c) {
        if (c == 0) return "despejado";
        if (c == 1) return "mayormente despejado";
        if (c == 2) return "parcialmente nublado";
        if (c == 3) return "nublado";
        if (c == 45 || c == 48) return "neblina";
        if (c >= 51 && c <= 57) return "llovizna";
        if (c >= 61 && c <= 67) return "lluvia";
        if (c >= 80 && c <= 82) return "aguaceros";
        if (c >= 95) return "tormenta";
        return "variable";
    }

    // =====================================================================
    // fondos
    // =====================================================================
    void aplicarFondo() {
        if ("foto".equals(fondo)) {
            Bitmap bm = cargarFoto();
            if (bm != null) { root.setBackground(new FondoFoto(bm)); return; }
        }
        if ("sistema".equals(fondo)) root.setBackground(new Velo());
        else root.setBackground(claro ? new FondoClaro() : new FondoMeraki());
    }

    abstract class Fondo extends Drawable {
        final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        @Override public void setAlpha(int a) { }
        @Override public void setColorFilter(ColorFilter f) { }
        @Override public int getOpacity() { return PixelFormat.TRANSLUCENT; }
    }

    /** Negro con un brillo suave del color de acento, como el logo. */
    class FondoMeraki extends Fondo {
        @Override public void draw(Canvas c) {
            Rect r = getBounds();
            p.setShader(new LinearGradient(0, 0, 0, r.height(), 0xFF14120E, 0xFF060505, Shader.TileMode.CLAMP));
            c.drawRect(r, p);
            p.setShader(new RadialGradient(r.width() * 0.85f, r.height() * 0.12f, r.width() * 0.9f, conAlpha(acento, 0x40), conAlpha(acento, 0), Shader.TileMode.CLAMP));
            c.drawRect(r, p);
            p.setShader(new RadialGradient(r.width() * 0.1f, r.height() * 0.95f, r.width() * 0.8f, conAlpha(acento, 0x22), conAlpha(acento, 0), Shader.TileMode.CLAMP));
            c.drawRect(r, p);
        }
    }

    /** Papel claro con una franja negra a la derecha (tipo los videos en blanco y negro). */
    class FondoClaro extends Fondo {
        @Override public void draw(Canvas c) {
            Rect r = getBounds();
            p.setShader(new LinearGradient(0, 0, 0, r.height(), 0xFFF7F4ED, 0xFFE9E4DA, Shader.TileMode.CLAMP));
            c.drawRect(r, p);
            p.setShader(null);
            p.setColor(0x0F000000);
            c.drawRect(r.width() * 0.78f, 0, r.width(), r.height(), p);
            p.setColor(conAlpha(acento, 0x30));
            c.drawRect(r.width() * 0.78f, 0, r.width() * 0.78f + dp(2), r.height(), p);
        }
    }

    /** Sobre tu fondo de pantalla: oscurece (o aclara) arriba y abajo para que se lea todo. */
    class Velo extends Fondo {
        @Override public void draw(Canvas c) {
            Rect r = getBounds();
            int a = claro ? 0x99FFFFFF : 0x99000000, b = claro ? 0x22FFFFFF : 0x22000000, z = claro ? 0xAAFFFFFF : 0xAA000000;
            p.setShader(new LinearGradient(0, 0, 0, r.height(), new int[]{a, b, b, z}, new float[]{0, .35f, .6f, 1}, Shader.TileMode.CLAMP));
            c.drawRect(r, p);
        }
    }

    Bitmap fotoCache; long fotoVersion = -1;

    Bitmap cargarFoto() {
        File f = new File(getFilesDir(), "fondo.jpg");
        if (!f.exists()) return null;
        if (fotoCache != null && fotoVersion == f.lastModified()) return fotoCache;
        try { fotoCache = BitmapFactory.decodeFile(f.getAbsolutePath()); fotoVersion = f.lastModified(); } catch (Throwable e) { fotoCache = null; }
        return fotoCache;
    }

    /** Tu foto llenando la pantalla (recortada al centro), con un velo para que se lea todo. */
    class FondoFoto extends Fondo {
        final Bitmap bm; final Velo velo = new Velo();
        FondoFoto(Bitmap b) { bm = b; }
        @Override public void draw(Canvas c) {
            Rect r = getBounds();
            float esc = Math.max(r.width() / (float) bm.getWidth(), r.height() / (float) bm.getHeight());
            float w = bm.getWidth() * esc, h = bm.getHeight() * esc;
            RectF dst = new RectF((r.width() - w) / 2f, (r.height() - h) / 2f, (r.width() + w) / 2f, (r.height() + h) / 2f);
            p.setShader(null); p.setFilterBitmap(true);
            c.drawBitmap(bm, null, dst, p);
            velo.setBounds(r); velo.draw(c);
        }
        @Override public int getOpacity() { return PixelFormat.OPAQUE; }
    }

    static final int ELEGIR_FOTO = 31;

    void elegirFoto() {
        Intent i = new Intent(Intent.ACTION_GET_CONTENT).setType("image/*").addCategory(Intent.CATEGORY_OPENABLE);
        try { startActivityForResult(Intent.createChooser(i, "Elegí la foto para tu fondo"), ELEGIR_FOTO); }
        catch (Exception e) {
            try { startActivityForResult(new Intent(Intent.ACTION_PICK).setType("image/*"), ELEGIR_FOTO); }
            catch (Exception e2) { toast("No encontré la galería."); }
        }
    }

    @Override
    protected void onActivityResult(int rc, int res, Intent data) {
        super.onActivityResult(rc, res, data);
        if (rc == REQ_BIND) {
            if (res == RESULT_OK && widgetPendiente >= 0 && infoPendiente != null) configurarWidget(widgetPendiente, infoPendiente);
            else if (widgetPendiente >= 0) { host.deleteAppWidgetId(widgetPendiente); toast("No se agregó el widget."); }
            return;
        }
        if (rc == REQ_CONFIG) {
            if (res == RESULT_OK && widgetPendiente >= 0) {
                AppWidgetProviderInfo info = infoPendiente != null ? infoPendiente : awm.getAppWidgetInfo(widgetPendiente);
                if (info != null) widgetListo(widgetPendiente, info);
            } else if (widgetPendiente >= 0) host.deleteAppWidgetId(widgetPendiente);
            return;
        }
        if (rc == REQ_GUARDAR) { if (res == RESULT_OK && data != null && data.getData() != null) escribirRespaldo(data.getData()); return; }
        if (rc == REQ_ABRIR) {
            if (res == RESULT_OK && data != null && data.getData() != null) {
                final Uri u = data.getData();
                dialogo().setTitle("¿Restaurar esta copia?").setMessage("Se reemplaza tu configuración actual del launcher (estilo, apps fijadas, carpetas, gestos…).")
                        .setPositiveButton("Restaurar", (d, w) -> leerRespaldo(u)).setNegativeButton("Cancelar", null).show();
            }
            return;
        }
        if (rc != ELEGIR_FOTO || res != RESULT_OK || data == null || data.getData() == null) return;
        final Uri u = data.getData();
        toast("Poniendo tu foto de fondo…");
        new Thread(() -> {
            boolean ok = false;
            try {
                // Medir y reducir a la resolución de la pantalla para que no pese
                BitmapFactory.Options o = new BitmapFactory.Options(); o.inJustDecodeBounds = true;
                try (InputStream in = getContentResolver().openInputStream(u)) { BitmapFactory.decodeStream(in, null, o); }
                int alto = Math.max(getResources().getDisplayMetrics().heightPixels, 1600);
                int muestra = 1; while (Math.min(o.outWidth, o.outHeight) / (muestra * 2) >= alto / 2) muestra *= 2;
                BitmapFactory.Options o2 = new BitmapFactory.Options(); o2.inSampleSize = muestra;
                Bitmap bm;
                try (InputStream in = getContentResolver().openInputStream(u)) { bm = BitmapFactory.decodeStream(in, null, o2); }
                if (bm != null) {
                    bm = girarSiHaceFalta(u, bm);
                    try (FileOutputStream out = new FileOutputStream(new File(getFilesDir(), "fondo.jpg"))) { bm.compress(Bitmap.CompressFormat.JPEG, 90, out); }
                    ok = true;
                }
            } catch (Throwable e) { ok = false; }
            final boolean listo = ok;
            ui.post(() -> {
                if (listo) { fotoCache = null; prefs.edit().putString("fondo", "foto").putBoolean("fondo_meraki", false).apply(); aplicarTodo(); toast("¡Listo! Ese es tu fondo."); }
                else toast("No pude abrir esa foto. Probá con otra.");
            });
        }).start();
    }

    Bitmap girarSiHaceFalta(Uri u, Bitmap bm) {
        try (InputStream in = getContentResolver().openInputStream(u)) {
            android.media.ExifInterface ex = new android.media.ExifInterface(in);
            int or = ex.getAttributeInt(android.media.ExifInterface.TAG_ORIENTATION, android.media.ExifInterface.ORIENTATION_NORMAL);
            int grados = or == android.media.ExifInterface.ORIENTATION_ROTATE_90 ? 90 : or == android.media.ExifInterface.ORIENTATION_ROTATE_180 ? 180 : or == android.media.ExifInterface.ORIENTATION_ROTATE_270 ? 270 : 0;
            if (grados == 0) return bm;
            android.graphics.Matrix m = new android.graphics.Matrix(); m.postRotate(grados);
            return Bitmap.createBitmap(bm, 0, 0, bm.getWidth(), bm.getHeight(), m, true);
        } catch (Throwable e) { return bm; }
    }

    /** Franja de poste de barbero. */
    class Poste extends Fondo {
        @Override public void draw(Canvas c) {
            Rect r = getBounds();
            float h = r.height(), w = h * 2.2f;
            Path clip = new Path(); clip.addRoundRect(new RectF(r), h / 2, h / 2, Path.Direction.CW);
            c.save(); c.clipPath(clip);
            p.setShader(null);
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
    }

    // =====================================================================
    // íconos con estilo
    // =====================================================================
    int tamIconoPx() { return dp(tamIcono == 0 ? 44 : tamIcono == 2 ? 62 : 52); }

    Drawable icono(App a, int s) {
        Drawable base = a.icon;
        if (paquete != null) { Drawable pk = paquete.icono(a.pkg, a.cls); if (pk != null) base = pk; }
        if ("original".equals(iconos) || base == null) return base;
        String k = a.key() + "@" + s;
        Drawable hecho = cacheIconos.get(k);
        if (hecho != null) return hecho;
        Bitmap bm = Bitmap.createBitmap(s, s, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bm);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        boolean circulo = "circulo".equals(iconos);
        int color = "oro".equals(iconos) || circulo ? acento : FG;
        int g = circulo ? Math.round(s * 0.58f) : s;
        int off = (s - g) / 2;
        if (circulo) {
            p.setColor(claro ? 0xFFFFFFFF : 0xFF15130F);
            c.drawCircle(s / 2f, s / 2f, s / 2f - dp(1), p);
            p.setStyle(Paint.Style.STROKE); p.setStrokeWidth(dp(1.4f)); p.setColor(acento);
            c.drawCircle(s / 2f, s / 2f, s / 2f - dp(1.5f), p);
            p.setStyle(Paint.Style.FILL);
        }
        Drawable mono = monocromo(base);
        if (mono != null) {
            // Ícono temático de Android 13+: sólo el dibujo, pintado del color elegido
            int big = Math.round(g * 1.5f), o = off - (big - g) / 2;
            mono.setBounds(o, o, o + big, o + big);
            mono.setColorFilter(new PorterDuffColorFilter(color, PorterDuff.Mode.SRC_IN));
            c.save(); c.clipRect(off, off, off + g, off + g); mono.draw(c); c.restore();
        } else {
            // Sin ícono temático: el ícono original en escala de grises (teñido si toca)
            Drawable d = base.getConstantState() != null ? base.getConstantState().newDrawable(getResources()).mutate() : base;
            int in = circulo ? Math.round(g * 0.02f) : Math.round(s * 0.04f);
            ColorMatrix cm = new ColorMatrix(); cm.setSaturation(0);
            ColorMatrix contraste = new ColorMatrix(new float[]{1.25f, 0, 0, 0, -20, 0, 1.25f, 0, 0, -20, 0, 0, 1.25f, 0, -20, 0, 0, 0, 1, 0});
            cm.postConcat(contraste);
            if ("oro".equals(iconos) || circulo) {
                float r = Color.red(color) / 255f, gg = Color.green(color) / 255f, b = Color.blue(color) / 255f;
                cm.postConcat(new ColorMatrix(new float[]{r * 1.1f, 0, 0, 0, 0, 0, gg * 1.1f, 0, 0, 0, 0, 0, b * 1.1f, 0, 0, 0, 0, 0, 1, 0}));
            }
            d.setColorFilter(new ColorMatrixColorFilter(cm));
            c.save();
            if (circulo) { Path cp = new Path(); cp.addCircle(s / 2f, s / 2f, g / 2f + dp(2), Path.Direction.CW); c.clipPath(cp); }
            d.setBounds(off + in, off + in, off + g - in, off + g - in);
            d.draw(c);
            c.restore();
        }
        BitmapDrawable res = new BitmapDrawable(getResources(), bm);
        cacheIconos.put(k, res);
        return res;
    }

    Drawable monocromo(Drawable d) {
        if (Build.VERSION.SDK_INT >= 33 && d instanceof AdaptiveIconDrawable) {
            Drawable m = ((AdaptiveIconDrawable) d).getMonochrome();
            if (m != null) return m.getConstantState() != null ? m.getConstantState().newDrawable(getResources()).mutate() : m.mutate();
        }
        return null;
    }

    // =====================================================================
    // apps
    // =====================================================================
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
                boolean cambio = nuevas.size() != todas.size();
                todas.clear(); todas.addAll(nuevas);
                porKey.clear(); for (App a : todas) porKey.put(a.key(), a);
                if (cambio) cacheIconos.clear();
                filtrar();
                pintarFavoritos();
            });
        }).start();
    }

    Set<String> ocultas() { return new HashSet<>(prefs.getStringSet("ocultas", new HashSet<>())); }

    void filtrar() {
        String q = sinAcentos(buscar.getText().toString().trim());
        Set<String> oc = ocultas();
        filtradas.clear();
        for (App a : todas) {
            if (q.isEmpty() && oc.contains(a.key())) continue; // las ocultas sólo salen si las buscás
            if (q.isEmpty() || a.busqueda.contains(q)) filtradas.add(a);
        }
        if (q.isEmpty() && "uso".equals(cajonOrden)) {
            JSONObject u = usos();
            Collections.sort(filtradas, (x, y) -> Integer.compare(u.optInt(y.key(), 0), u.optInt(x.key(), 0)));
        }
        if (!q.isEmpty()) Collections.sort(filtradas, (x, y) -> Boolean.compare(!x.busqueda.startsWith(q), !y.busqueda.startsWith(q)));
        pintarSugeridas();
        String raw = buscar.getText().toString().trim();
        buscarWeb.setVisibility(raw.isEmpty() ? View.GONE : View.VISIBLE);
        buscarWeb.setText("Buscar «" + raw + "» en Google  →");
        adapter.notifyDataSetChanged();
    }

    int maxFavs() {
        switch (estilo) {
            case "revista": return 12;
            case "reloj": return 10;
            case "columna": return 12;
            default: return 32;
        }
    }

    List<String> favoritos() {
        String s = prefs.getString("favs", null);
        List<String> out = new ArrayList<>();
        if (s == null) {
            for (String pkg : FAVS_INICIALES) {
                for (App a : todas) if (a.pkg.equals(pkg)) { out.add(a.key()); break; }
                if (out.size() >= 8) break;
            }
            if (!todas.isEmpty()) guardarFavs(out);
            return out;
        }
        for (String k : s.split("\\|")) if (!k.isEmpty()) out.add(k);
        return out;
    }

    void guardarFavs(List<String> l) { prefs.edit().putString("favs", TextUtils.join("|", l)).apply(); }

    boolean existe(String k) {
        if (k.startsWith("carpeta:")) return carpetas().has(k.substring(8));
        return porKey.containsKey(k);
    }

    static final int POR_PAGINA = 8;
    PaginasDock dockScroll; LinearLayout puntosDock; int paginaDock = 0;
    long ultimoCambioPagina = 0;

    int anchoPagina() { return getResources().getDisplayMetrics().widthPixels - dp(44) - dp(12); }

    void marcarPunto() {
        if (dockScroll == null || puntosDock == null) return;
        int n = puntosDock.getChildCount(), w = Math.max(1, anchoPagina());
        paginaDock = Math.max(0, Math.min(n - 1, Math.round(dockScroll.getScrollX() / (float) w)));
        for (int i = 0; i < n; i++) puntosDock.getChildAt(i).setAlpha(i == paginaDock ? 1f : .3f);
    }

    void irAPagina(int p, boolean animado) {
        if (dockScroll == null || favBox == null) return;
        int n = favBox.getChildCount();
        p = Math.max(0, Math.min(n - 1, p));
        paginaDock = p;
        if (animado) dockScroll.smoothScrollTo(p * anchoPagina(), 0); else dockScroll.scrollTo(p * anchoPagina(), 0);
    }

    /** Desliza de página en página (no se queda a medias). */
    class PaginasDock extends android.widget.HorizontalScrollView {
        float x0; int scroll0;
        PaginasDock(Context c) { super(c); }
        @Override public void fling(int v) { /* sin inercia: se acomoda por páginas */ }
        @Override public boolean onTouchEvent(MotionEvent e) {
            if (e.getActionMasked() == MotionEvent.ACTION_DOWN) { x0 = e.getX(); scroll0 = getScrollX(); }
            boolean r = super.onTouchEvent(e);
            if (e.getActionMasked() == MotionEvent.ACTION_UP || e.getActionMasked() == MotionEvent.ACTION_CANCEL) {
                int w = anchoPagina(), base = Math.round(scroll0 / (float) w), dx = getScrollX() - scroll0;
                int p = dx > w * .15f ? base + 1 : dx < -w * .15f ? base - 1 : base;
                irAPagina(p, true);
            }
            return r;
        }
        @Override public boolean onInterceptTouchEvent(MotionEvent e) {
            if (e.getActionMasked() == MotionEvent.ACTION_DOWN) { x0 = e.getX(); scroll0 = getScrollX(); }
            return super.onInterceptTouchEvent(e);
        }
    }

    boolean dentroDe(View v, float rawX, float rawY) {
        if (v == null || !v.isShown()) return false;
        int[] xy = new int[2]; v.getLocationOnScreen(xy);
        return rawX >= xy[0] && rawX <= xy[0] + v.getWidth() && rawY >= xy[1] && rawY <= xy[1] + v.getHeight();
    }

    /** Arrastrando una app al borde de la cajita: pasa a la página de al lado. */
    void revisarBordeDock(View v, android.view.DragEvent e) {
        if (dockScroll == null || !dockScroll.isShown() || puntosDock == null) return;
        int[] a = new int[2]; v.getLocationOnScreen(a);
        float rx = a[0] + e.getX(), ry = a[1] + e.getY();
        if (!dentroDe(dockScroll, rx, ry)) return;
        int[] d = new int[2]; dockScroll.getLocationOnScreen(d);
        long ahora = System.currentTimeMillis();
        if (ahora - ultimoCambioPagina < 700) return;
        if (rx < d[0] + dp(26) && paginaDock > 0) { ultimoCambioPagina = ahora; irAPagina(paginaDock - 1, true); }
        else if (rx > d[0] + dockScroll.getWidth() - dp(26)) { ultimoCambioPagina = ahora; irAPagina(paginaDock + 1, true); }
    }

    View vistaFav(String k, String modo, int s, boolean conNombre) {
        View v;
        if (k.startsWith("carpeta:")) v = vistaCarpeta(k.substring(8), "lista".equals(modo), conNombre, s);
        else { App a = porKey.get(k); v = "lista".equals(modo) ? filaLista(a) : celdaApp(a, true, conNombre, s); }
        // Mantener presionado: si movés el dedo se arrastra; si soltás sin mover, sale el menú
        v.setTag(k);
        v.setOnLongClickListener(x -> { iniciarArrastre(x, k); return true; });
        v.setOnDragListener(this::alArrastrar);
        return v;
    }

    String arrastreKey; View arrastreVista; boolean arrastreMovido, arrastreTerminado, arrastreDesdeCajon;
    float arrastreX0 = -1, arrastreY0 = -1;

    /** Arrastrar desde la lista de todas las apps hacia el inicio. */
    void iniciarArrastreCajon(View v, String k) {
        arrastreKey = k; arrastreVista = null; arrastreMovido = false; arrastreTerminado = false; arrastreDesdeCajon = true; arrastreX0 = -1;
        v.performHapticFeedback(android.view.HapticFeedbackConstants.LONG_PRESS);
        try { v.startDragAndDrop(android.content.ClipData.newPlainText("app", k), new View.DragShadowBuilder(v), k, 0); }
        catch (Exception e) { arrastreKey = null; App a = porKey.get(k); if (a != null) opcionesApp(a); }
    }

    void iniciarArrastre(View v, String k) {
        arrastreKey = k; arrastreVista = v; arrastreMovido = false; arrastreTerminado = false; arrastreDesdeCajon = false;
        v.performHapticFeedback(android.view.HapticFeedbackConstants.LONG_PRESS);
        try {
            v.startDragAndDrop(android.content.ClipData.newPlainText("app", k), new View.DragShadowBuilder(v), k, 0);
            v.setAlpha(.3f);
        } catch (Exception e) { menuDe(k); }
    }

    void menuDe(String k) {
        if (k.startsWith("carpeta:")) opcionesCarpeta(k.substring(8));
        else { App a = porKey.get(k); if (a != null) opcionesApp(a); }
    }

    boolean alArrastrar(View v, android.view.DragEvent e) {
        String destino = (String) v.getTag();
        switch (e.getAction()) {
            case android.view.DragEvent.ACTION_DRAG_STARTED:
                return arrastreKey != null;
            case android.view.DragEvent.ACTION_DRAG_LOCATION:
                if (!"cajon".equals(destino)) revisarBordeDock(v, e);
                if ("cajon".equals(destino) && arrastreDesdeCajon) {
                    if (arrastreX0 < 0) { arrastreX0 = e.getX(); arrastreY0 = e.getY(); }
                    else if (Math.hypot(e.getX() - arrastreX0, e.getY() - arrastreY0) > dp(28) && drawer.getVisibility() == View.VISIBLE) {
                        // Se movió: se cierra la lista y aparece el inicio para soltar la app
                        arrastreMovido = true;
                        drawer.setVisibility(View.GONE);
                        InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
                        if (imm != null) imm.hideSoftInputFromWindow(buscar.getWindowToken(), 0);
                    }
                }
                return true;
            case android.view.DragEvent.ACTION_DRAG_ENTERED:
                if (v != arrastreVista && destino != null && !"cajon".equals(destino) && !"pager".equals(destino)) { v.animate().scaleX(1.12f).scaleY(1.12f).setDuration(120).start(); arrastreMovido = true; }
                return true;
            case android.view.DragEvent.ACTION_DRAG_EXITED:
                if (v == arrastreVista) arrastreMovido = true;
                else if (destino != null && !"pager".equals(destino)) v.animate().scaleX(1f).scaleY(1f).setDuration(120).start();
                return true;
            case android.view.DragEvent.ACTION_DROP:
                v.animate().scaleX(1f).scaleY(1f).setDuration(80).start();
                if (arrastreKey == null || "cajon".equals(destino)) return true;
                if ("pager".equals(destino)) {
                    // Espacio vacío de la cajita: queda al final
                    List<String> favs = favoritos();
                    favs.remove(arrastreKey);
                    if (favs.size() < 32) favs.add(arrastreKey);
                    guardarFavs(favs);
                    return true;
                }
                if (destino == null) {
                    // Soltada en un espacio vacío del inicio: se agrega al final
                    if (arrastreDesdeCajon) {
                        List<String> favs = favoritos();
                        if (!favs.contains(arrastreKey)) { favs.add(arrastreKey); guardarFavs(favs); }
                    }
                    return true;
                }
                if (destino.equals(arrastreKey)) return true;
                soltarSobre(arrastreKey, destino);
                return true;
            case android.view.DragEvent.ACTION_DRAG_ENDED:
                v.setAlpha(1f); v.setScaleX(1f); v.setScaleY(1f);
                if (!arrastreTerminado) {
                    arrastreTerminado = true;
                    if (arrastreVista != null) arrastreVista.setAlpha(1f);
                    final String k = arrastreKey; final boolean movido = arrastreMovido, delCajon = arrastreDesdeCajon;
                    arrastreKey = null; arrastreVista = null; arrastreDesdeCajon = false;
                    // Respaldo: si venía de la lista de apps y se soltó en el inicio, queda agregada aunque no cayera encima de nada
                    if (delCajon && movido && k != null) {
                        List<String> favs = favoritos();
                        boolean enCarpeta = false;
                        java.util.Iterator<String> it = carpetas().keys();
                        while (it.hasNext()) { String id = it.next(); for (App b : appsCarpeta(id)) if (b.key().equals(k)) enCarpeta = true; }
                        if (!favs.contains(k) && !enCarpeta) {
                            if (favs.size() < 32) { favs.add(k); guardarFavs(favs); App ap = porKey.get(k); toast((ap != null ? ap.label : "App") + " agregada al inicio"); }
                            else toast("Ya tenés 32 apps en el inicio. Quitá una primero.");
                        }
                    }
                    if (movido && buscar.length() > 0) ui.post(() -> buscar.setText(""));
                    if (!movido && k != null) ui.post(() -> menuDe(k));
                    else ui.post(this::pintarFavoritos);
                }
                return true;
        }
        return true;
    }

    void soltarSobre(String origen, String destino) {
        List<String> favs = favoritos();
        // App encima de una carpeta: entra a la carpeta
        if (destino.startsWith("carpeta:") && !origen.startsWith("carpeta:")) {
            String id = destino.substring(8);
            List<String> keys = new ArrayList<>(); for (App b : appsCarpeta(id)) keys.add(b.key());
            if (!keys.contains(origen)) keys.add(origen);
            guardarAppsCarpeta(id, keys);
            favs.remove(origen); guardarFavs(favs);
            App a = porKey.get(origen); toast((a != null ? a.label : "App") + " está en «" + nombreCarpeta(id) + "»");
            return;
        }
        int de = favs.indexOf(origen), a = favs.indexOf(destino);
        if (a < 0) return;
        if (de >= 0) favs.remove(de);
        else if (favs.size() >= 32) { toast("Ya tenés 32 apps en el inicio. Quitá una primero."); return; }
        favs.add(Math.min(a, favs.size()), origen); // queda en el lugar donde la soltaste
        guardarFavs(favs);
    }

    void pintarFavoritos() {
        if (favBox == null) return;
        favBox.removeAllViews();
        List<String> keys = new ArrayList<>();
        for (String k : favoritos()) if (existe(k)) keys.add(k);
        int max = maxFavs();
        if (keys.size() > max) keys = keys.subList(0, max);
        if (keys.isEmpty() && !todas.isEmpty()) {
            TextView t = texto("Mantené presionada una app en la lista de todas tus apps para fijarla aquí.", 12, MUTED, tf(false));
            t.setPadding(dp(8), dp(6), dp(8), dp(10));
            if (favBox instanceof GridLayout) {
                GridLayout.LayoutParams p = new GridLayout.LayoutParams(GridLayout.spec(0), GridLayout.spec(0, ((GridLayout) favBox).getColumnCount()));
                p.width = "dos".equals(favModo) ? dp(140) : -2;
                favBox.addView(t, p);
            } else favBox.addView(t);
            return;
        }
        int s = tamIconoPx();
        switch (favModo) {
            case "paginas": {
                int w = anchoPagina(), celda = w / 4;
                int altoFila = s + (verNombres ? dp(30) : dp(12));
                int nPag = Math.max(1, (keys.size() + POR_PAGINA - 1) / POR_PAGINA);
                for (int pg = 0; pg < nPag; pg++) {
                    GridLayout g = new GridLayout(this);
                    g.setColumnCount(4);
                    g.setMinimumHeight(altoFila * 2 + dp(8));
                    for (int i = pg * POR_PAGINA; i < Math.min(keys.size(), (pg + 1) * POR_PAGINA); i++) {
                        GridLayout.LayoutParams p = new GridLayout.LayoutParams();
                        p.width = celda; p.bottomMargin = dp(8);
                        g.addView(vistaFav(keys.get(i), "grid", s, verNombres), p);
                    }
                    favBox.addView(g, new LinearLayout.LayoutParams(w, -2));
                }
                if (puntosDock != null) {
                    puntosDock.removeAllViews();
                    if (nPag > 1) for (int i = 0; i < nPag; i++) {
                        View pt = new View(this); pt.setBackground(caja(acento, 99, 0));
                        LinearLayout.LayoutParams lpp = new LinearLayout.LayoutParams(dp(6), dp(6)); lpp.leftMargin = lpp.rightMargin = dp(3);
                        puntosDock.addView(pt, lpp);
                    }
                }
                final int volver = Math.min(paginaDock, nPag - 1);
                ui.post(() -> { irAPagina(volver, false); marcarPunto(); });
                break;
            }
            case "lista":
                for (String k : keys) favBox.addView(vistaFav(k, "lista", s, true), lp(-1, -2, 2));
                break;
            case "fila":
                int anchoF = (getResources().getDisplayMetrics().widthPixels - dp(44)) / 5;
                for (String k : keys) {
                    GridLayout.LayoutParams p = new GridLayout.LayoutParams();
                    p.width = anchoF; p.bottomMargin = dp(10);
                    favBox.addView(vistaFav(k, "fila", Math.min(Math.round(s * 0.92f), anchoF - dp(8)), false), p);
                }
                break;
            case "dos":
                int sd = Math.round(s * 0.82f);
                for (String k : keys) {
                    GridLayout.LayoutParams p = new GridLayout.LayoutParams();
                    p.width = sd + dp(16); p.bottomMargin = dp(14);
                    favBox.addView(vistaFav(k, "dos", sd, false), p);
                }
                break;
            default:
                int ancho = (getResources().getDisplayMetrics().widthPixels - dp(44) - dp(12)) / 4;
                for (String k : keys) {
                    GridLayout.LayoutParams p = new GridLayout.LayoutParams();
                    p.width = ancho; p.bottomMargin = dp(8);
                    favBox.addView(vistaFav(k, "grid", s, verNombres), p);
                }
        }
    }

    View filaLista(App a) {
        LinearLayout f = new LinearLayout(this);
        f.setGravity(Gravity.CENTER_VERTICAL);
        f.setPadding(0, dp(7), 0, dp(7));
        int s = Math.round(tamIconoPx() * 0.6f);
        f.addView(conInsignia(icono(a, s), s, Insignias.de(a.pkg)), new LinearLayout.LayoutParams(s, s));
        TextView t = texto(a.label, 15, FG, tf(false));
        t.setSingleLine(true); t.setEllipsize(TextUtils.TruncateAt.END);
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(0, -2, 1f); p.leftMargin = dp(14);
        f.addView(t, p);
        f.setOnClickListener(v -> lanzar(a));
        f.setOnLongClickListener(v -> { opcionesApp(a); return true; });
        return f;
    }

    View celdaApp(App a, boolean enInicio, boolean conNombre, int s) {
        LinearLayout c = new LinearLayout(this);
        c.setOrientation(LinearLayout.VERTICAL);
        c.setGravity(Gravity.CENTER_HORIZONTAL);
        c.setPadding(dp(2), dp(2), dp(2), dp(2));
        c.addView(conInsignia(icono(a, s), s, Insignias.de(a.pkg)), new LinearLayout.LayoutParams(s, s));
        if (conNombre) {
            TextView t = texto(a.label, 11.5f, FG, tf(false));
            t.setSingleLine(true); t.setEllipsize(TextUtils.TruncateAt.END); t.setGravity(Gravity.CENTER);
            if (!claro) t.setShadowLayer(dp(3), 0, dp(1), 0xCC000000);
            c.addView(t, lp(-1, -2, 6));
        }
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
        public View getView(int i, View v, ViewGroup p) {
            if ("lista".equals(cajonEstilo)) { View f = filaLista(filtradas.get(i)); f.setOnClickListener(null); f.setOnLongClickListener(null); f.setClickable(false); f.setLongClickable(false); return f; }
            int s = tamIconoPx(); if (columnas == 5) s = Math.round(s * 0.86f);
            return celdaApp(filtradas.get(i), false, true, s);
        }
    }

    void lanzar(App a) {
        try {
            Intent i = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
                    .setComponent(a.cn()).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
            startActivity(i);
            sumarUso(a.key());
            ui.postDelayed(this::cerrarCajon, 400);
        } catch (Exception e) {
            toast("No se pudo abrir " + a.label);
            cargarApps();
        }
    }

    void opcionesApp(App a) {
        List<String> favs = favoritos();
        boolean fijada = favs.contains(a.key());
        boolean oculta = ocultas().contains(a.key());
        List<String> ops = new ArrayList<>();
        List<ShortcutInfo> ats = atajos(a);
        for (ShortcutInfo si : ats) ops.add("⚡ " + (si.getShortLabel() != null ? si.getShortLabel() : "Atajo"));
        JSONObject cs = carpetas();
        List<String> idsCarpetas = new ArrayList<>();
        java.util.Iterator<String> itc = cs.keys(); while (itc.hasNext()) idsCarpetas.add(itc.next());
        if (fijada) {
            ops.add("Quitar de inicio");
            if (favs.indexOf(a.key()) > 0) ops.add("Mover antes");
            if (favs.indexOf(a.key()) < favs.size() - 1) ops.add("Mover después");
        } else ops.add("Fijar en inicio");
        ops.add("Crear carpeta con esta app");
        if (!idsCarpetas.isEmpty()) ops.add("Meter en una carpeta…");
        ops.add(oculta ? "Mostrar en la lista de apps" : "Ocultar de la lista de apps");
        ops.add("Información de la app");
        ops.add("Desinstalar");
        dialogo().setTitle(a.label).setItems(ops.toArray(new String[0]), (d, w) -> {
            String op = ops.get(w);
            if (w < ats.size()) { abrirAtajo(ats.get(w)); ui.postDelayed(this::cerrarCajon, 400); return; }
            int idx = favs.indexOf(a.key());
            switch (op) {
                case "Crear carpeta con esta app": crearCarpeta(a); break;
                case "Meter en una carpeta…": {
                    String[] n = new String[idsCarpetas.size()];
                    for (int i = 0; i < n.length; i++) n[i] = nombreCarpeta(idsCarpetas.get(i));
                    dialogo().setTitle("¿En cuál carpeta?").setItems(n, (d2, w2) -> {
                        String id = idsCarpetas.get(w2);
                        List<String> keys = new ArrayList<>(); for (App b : appsCarpeta(id)) keys.add(b.key());
                        if (!keys.contains(a.key())) keys.add(a.key());
                        guardarAppsCarpeta(id, keys);
                        List<String> f2 = favoritos(); f2.remove(a.key()); guardarFavs(f2);
                        pintarFavoritos(); toast(a.label + " está en «" + n[w2] + "»");
                    }).show();
                    break;
                }
                case "Fijar en inicio":
                    if (favs.size() >= 32) { toast("Ya tenés 32 apps fijadas. Quitá una primero."); return; }
                    favs.add(a.key()); guardarFavs(favs); pintarFavoritos();
                    toast(favs.size() > maxFavs() ? a.label + " fijada (este estilo muestra sólo " + maxFavs() + ")" : a.label + " fijada en inicio");
                    break;
                case "Quitar de inicio": favs.remove(a.key()); guardarFavs(favs); pintarFavoritos(); break;
                case "Mover antes": Collections.swap(favs, idx, idx - 1); guardarFavs(favs); pintarFavoritos(); break;
                case "Mover después": Collections.swap(favs, idx, idx + 1); guardarFavs(favs); pintarFavoritos(); break;
                case "Ocultar de la lista de apps": case "Mostrar en la lista de apps": {
                    Set<String> oc = ocultas();
                    if (oculta) oc.remove(a.key()); else oc.add(a.key());
                    prefs.edit().putStringSet("ocultas", oc).apply(); filtrar();
                    if (!oculta) toast(a.label + " oculta. La encontrás buscándola por su nombre.");
                    break;
                }
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
        String[] ops = {"Ajustes del launcher", "Cambiar estilo de inicio", "Cambiar íconos", "Poner una foto de fondo", "Ajustes del teléfono", "Agregar widget"};
        dialogo().setTitle("Meraki Launcher").setItems(ops, (d, w) -> {
            if (w == 5) agregarWidget();
            else if (w == 0) abrirAjustes();
            else if (w == 1) elegir("Estilo de inicio", ESTILOS, "estilo", estilo);
            else if (w == 2) elegir("Íconos", ICONOS, "iconos", iconos);
            else if (w == 3) elegirFoto();
            else abrir(new Intent(Settings.ACTION_SETTINGS), "No se pudieron abrir los ajustes.");
        }).show();
    }

    void cambiarFondoPantalla() {
        prefs.edit().putBoolean("fondo_meraki", false).putString("fondo", "sistema").apply(); aplicarTodo();
        abrir(Intent.createChooser(new Intent(Intent.ACTION_SET_WALLPAPER), "Elegí tu fondo"), "No encontré dónde cambiar el fondo.");
    }

    void abrir(Intent i, String error) {
        try { i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); startActivity(i); }
        catch (ActivityNotFoundException | SecurityException e) { toast(error); }
    }

    void abrirGoogle() {
        Intent g = getPackageManager().getLaunchIntentForPackage("com.google.android.googlequicksearchbox");
        if (g != null) abrir(g, "");
        else buscarEnGoogle("");
    }

    void buscarEnGoogle(String q) {
        Intent i = new Intent(Intent.ACTION_WEB_SEARCH);
        i.putExtra(SearchManager.QUERY, q);
        try { i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); startActivity(i); }
        catch (Exception e) { abrir(new Intent(Intent.ACTION_VIEW, Uri.parse("https://www.google.com/search?q=" + Uri.encode(q))), "No encontré navegador."); }
        ui.postDelayed(this::cerrarCajon, 400);
    }

    void mostrarTeclado() {
        ui.postDelayed(() -> {
            InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
            if (imm != null) imm.showSoftInput(buscar, InputMethodManager.SHOW_IMPLICIT);
        }, 200);
    }

    // =====================================================================
    // cajón
    // =====================================================================
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

    void bajarNotificaciones() {
        try {
            @SuppressWarnings("WrongConstant") Object sb = getSystemService("statusbar");
            Class.forName("android.app.StatusBarManager").getMethod("expandNotificationsPanel").invoke(sb);
        } catch (Exception e) { /* algunos teléfonos no lo permiten */ }
    }

    // =====================================================================
    // ajustes del launcher
    // =====================================================================
    void abrirAjustes() {
        cerrarCajon();
        construirAjustes();
        ajustes.setVisibility(View.VISIBLE);
        ajustes.setAlpha(0f);
        ajustes.animate().alpha(1f).setDuration(160).start();
    }

    void cerrarAjustes() {
        if (ajustes.getVisibility() != View.VISIBLE) return;
        ajustes.animate().alpha(0f).setDuration(140).withEndAction(() -> ajustes.setVisibility(View.GONE)).start();
    }

    ScrollView ajustesScroll;

    void construirAjustes() {
        final int y = ajustesScroll != null && ajustes.getVisibility() == View.VISIBLE ? ajustesScroll.getScrollY() : 0;
        ajustes.removeAllViews();
        ajustes.setBackgroundColor(claro ? 0xFFF4F1EA : 0xFF0B0A08);
        LinearLayout cab = new LinearLayout(this);
        cab.setGravity(Gravity.CENTER_VERTICAL);
        cab.setPadding(dp(8), dp(10), dp(16), dp(6));
        TextView atras = texto("←", 24, FG, Typeface.DEFAULT);
        atras.setPadding(dp(12), dp(6), dp(14), dp(6));
        atras.setOnClickListener(v -> cerrarAjustes());
        cab.addView(atras);
        cab.addView(texto("Ajustes del launcher", 20, FG, tf(true)));
        ajustes.addView(cab);

        ScrollView sv = new ScrollView(this);
        ajustesScroll = sv;
        sv.post(() -> sv.scrollTo(0, y));
        LinearLayout l = columnaBase();
        l.setPadding(dp(20), dp(6), dp(20), insetAbajo + dp(30));
        sv.addView(l);
        ajustes.addView(sv, new LinearLayout.LayoutParams(-1, 0, 1f));

        seccion(l, "Pantalla de inicio");
        opcion(l, "Estilo de inicio", nombre(ESTILOS, estilo), () -> elegir("Estilo de inicio", ESTILOS, "estilo", estilo));
        opcion(l, "Tema", nombre(TEMAS, claro ? "claro" : "oscuro"), () -> elegir("Tema", TEMAS, "tema", claro ? "claro" : "oscuro"));
        opcion(l, "Color de acento", nombre(ACENTOS, prefs.getString("acento", "D9B55C")), () -> elegir("Color de acento", ACENTOS, "acento", prefs.getString("acento", "D9B55C")));
        opcion(l, "Letra", nombre(LETRAS, letra), () -> elegir("Letra", LETRAS, "letra", letra));
        opcion(l, "Tu nombre (para el saludo)", nombre.isEmpty() ? "Sin nombre" : nombre, this::editarNombre);

        seccion(l, "Widgets y carpetas");
        opcion(l, "Agregar widget", listaWidgets().size() + " en tu inicio · mantené presionado uno para cambiarlo", this::agregarWidget);
        opcion(l, "Carpetas", carpetas().length() + " carpeta" + (carpetas().length() == 1 ? "" : "s") + " · para crear una, mantené presionada una app", () -> { abrirCajon(); toast("Mantené presionada una app y elegí «Crear carpeta»."); });

        seccion(l, "Íconos");
        opcion(l, "Paquete de íconos", paquete != null || !paqueteNombre.isEmpty() ? PaqueteIconos.instalados(getPackageManager()).getOrDefault(paqueteNombre, "Ninguno") : "Ninguno", this::elegirPaquete);
        opcion(l, "Estilo de íconos", nombre(ICONOS, iconos), () -> elegir("Íconos", ICONOS, "iconos", iconos));
        opcion(l, "Tamaño de íconos", nombre(TAMANOS, String.valueOf(tamIcono)), () -> elegir("Tamaño de íconos", TAMANOS, "tam_icono", String.valueOf(tamIcono)));
        interruptor(l, "Nombres debajo de los íconos del inicio", verNombres, v -> guardar("ver_nombres", v));

        seccion(l, "Lista de todas las apps");
        opcion(l, "Forma", nombre(CAJON_ESTILOS, cajonEstilo), () -> elegir("Forma de la lista", CAJON_ESTILOS, "cajon_estilo", cajonEstilo));
        opcion(l, "Orden", nombre(CAJON_ORDEN, cajonOrden), () -> elegir("Orden", CAJON_ORDEN, "cajon_orden", cajonOrden));
        opcion(l, "Columnas", nombre(COLUMNAS, String.valueOf(columnas)), () -> elegir("Columnas", COLUMNAS, "columnas", String.valueOf(columnas)));
        interruptor(l, "Mostrar «Las que más usás» arriba", verSugeridas, v -> guardar("ver_sugeridas", v));
        opcion(l, "Apps ocultas", ocultas().size() + " oculta" + (ocultas().size() == 1 ? "" : "s"), this::gestionarOcultas);

        seccion(l, "Gestos");
        for (String[] g : GESTOS) opcion(l, g[1], nombreGesto(g[0]), () -> elegirGesto(g[0], g[1]));
        if (puedeApagar()) opcion(l, "Quitar permiso de apagar pantalla", "Hacelo antes de desinstalar el launcher", this::quitarPermisoApagar);
        else opcion(l, "Permitir apagar la pantalla", "Para usar «Apagar la pantalla» en un gesto", this::pedirPermisoApagar);

        seccion(l, "Fondo");
        opcion(l, "Fondo", nombre(FONDOS, fondo), () -> elegir("Fondo", FONDOS, "fondo", fondo));
        opcion(l, "Elegir foto de fondo", "Cualquier foto de tu galería", this::elegirFoto);
        opcion(l, "Fondo de pantalla del teléfono", "Abre el selector de fondos de tu cel", this::cambiarFondoPantalla);

        seccion(l, "Qué mostrar");
        interruptor(l, "Clima de Apopa", verClima, v -> { guardar("ver_clima", v); if (v) cargarClima(true); });
        interruptor(l, "Batería", verBateria, v -> guardar("ver_bateria", v));
        interruptor(l, "Agenda de hoy", verAgenda, v -> guardar("ver_agenda", v));
        interruptor(l, "Barra de búsqueda", verBusqueda, v -> guardar("ver_busqueda", v));
        interruptor(l, "Pantalla completa (ocultar barra de notificaciones)", pantallaCompleta, v -> guardar("pantalla_completa", v));

        seccion(l, "Copia de seguridad");
        opcion(l, "Guardar copia de mi configuración", "Un archivo con tu estilo, apps fijadas, carpetas y gestos", this::guardarRespaldo);
        opcion(l, "Restaurar una copia", "Por si cambiás de cel o reinstalás", this::abrirRespaldo);

        seccion(l, "Teléfono");
        opcion(l, "Pantalla de inicio predeterminada", "Elegir Meraki u otro launcher", () -> abrir(new Intent(Settings.ACTION_HOME_SETTINGS), "Buscalo en Ajustes > Aplicaciones > Aplicaciones predeterminadas."));
        opcion(l, "Ajustes del teléfono", "", () -> abrir(new Intent(Settings.ACTION_SETTINGS), "No se pudieron abrir los ajustes."));

        String ver = "";
        try { PackageInfo pi = getPackageManager().getPackageInfo(getPackageName(), 0); ver = pi.versionName; } catch (Exception e) { }
        TextView pie = texto("Meraki Launcher " + ver + "\nTip: mantené presionado un espacio vacío del inicio para el menú rápido.", 12, MUTED, tf(false));
        pie.setLineSpacing(dp(3), 1f);
        l.addView(pie, lp(-1, -2, 28));
    }

    void seccion(LinearLayout l, String t) {
        TextView s = etiqueta(t, acento);
        l.addView(s, lp(-1, -2, 26));
    }

    void opcion(LinearLayout l, String titulo, String valor, Runnable r) {
        LinearLayout f = columnaBase();
        f.setPadding(0, dp(12), 0, dp(12));
        f.addView(texto(titulo, 16, FG, tf(false)));
        if (!valor.isEmpty()) f.addView(texto(valor, 13, MUTED, tf(false)), lp(-1, -2, 4));
        f.setOnClickListener(v -> r.run());
        l.addView(f);
        View raya = new View(this); raya.setBackgroundColor(claro ? 0x14000000 : 0x14FFFFFF);
        l.addView(raya, new LinearLayout.LayoutParams(-1, 1));
    }

    interface AlCambiar { void cambio(boolean v); }

    void interruptor(LinearLayout l, String titulo, boolean valor, AlCambiar cb) {
        LinearLayout f = new LinearLayout(this);
        f.setGravity(Gravity.CENTER_VERTICAL);
        f.setPadding(0, dp(8), 0, dp(8));
        f.addView(texto(titulo, 16, FG, tf(false)), new LinearLayout.LayoutParams(0, -2, 1f));
        Switch sw = new Switch(this);
        sw.setChecked(valor);
        sw.setOnCheckedChangeListener((b, v) -> cb.cambio(v));
        f.addView(sw);
        l.addView(f);
    }

    void elegir(String titulo, String[][] ops, String clave, String actual) {
        String[] nombres = new String[ops.length];
        int sel = 0;
        for (int i = 0; i < ops.length; i++) { nombres[i] = ops[i][1]; if (ops[i][0].equals(actual)) sel = i; }
        dialogo().setTitle(titulo).setSingleChoiceItems(nombres, sel, (d, w) -> {
            d.dismiss();
            if ("fondo".equals(clave) && "foto".equals(ops[w][0])) { elegirFoto(); return; }
            if ("fondo".equals(clave)) prefs.edit().putBoolean("fondo_meraki", "meraki".equals(ops[w][0])).apply();
            guardar(clave, ops[w][0]);
        }).setNegativeButton("Cancelar", null).show();
    }

    void editarNombre() {
        EditText e = new EditText(this);
        e.setText(nombre); e.setSingleLine(true);
        e.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_WORDS);
        FrameLayout f = new FrameLayout(this); f.setPadding(dp(22), dp(8), dp(22), 0); f.addView(e);
        dialogo().setTitle("Tu nombre").setView(f)
                .setPositiveButton("Guardar", (d, w) -> guardar("nombre", e.getText().toString().trim()))
                .setNegativeButton("Cancelar", null).show();
    }

    void gestionarOcultas() {
        Set<String> oc = ocultas();
        List<App> lista = new ArrayList<>();
        for (App a : todas) if (oc.contains(a.key())) lista.add(a);
        if (lista.isEmpty()) { toast("No tenés apps ocultas. Para ocultar una, mantenela presionada en la lista de apps."); return; }
        String[] nombres = new String[lista.size()];
        boolean[] marcadas = new boolean[lista.size()];
        for (int i = 0; i < lista.size(); i++) { nombres[i] = lista.get(i).label; marcadas[i] = true; }
        dialogo().setTitle("Apps ocultas (desmarcá para mostrar)").setMultiChoiceItems(nombres, marcadas, (d, w, v) -> marcadas[w] = v)
                .setPositiveButton("Listo", (d, w) -> {
                    Set<String> n = ocultas();
                    for (int i = 0; i < lista.size(); i++) if (!marcadas[i]) n.remove(lista.get(i).key());
                    prefs.edit().putStringSet("ocultas", n).apply();
                    filtrar(); construirAjustes();
                }).setNegativeButton("Cancelar", null).show();
    }

    // =====================================================================
    // agenda
    // =====================================================================
    void cargarAgenda() {
        if (agendaLista == null) return;
        agendaLista.removeAllViews();
        if (checkSelfPermission(Manifest.permission.READ_CALENDAR) != PackageManager.PERMISSION_GRANTED) {
            agendaTitulo.setText("HOY");
            TextView t = texto("Tocá aquí para ver tus citas de hoy (Google Calendar).", 14, FG, tf(false));
            t.setLineSpacing(dp(3), 1f);
            agendaLista.addView(t, lp(-1, -2, 8));
            agendaCaja.setOnClickListener(v -> requestPermissions(new String[]{Manifest.permission.READ_CALENDAR}, 7));
            return;
        }
        agendaCaja.setOnClickListener(v -> abrirCalendario(-1));
        final LinearLayout destino = agendaLista;
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
            SimpleDateFormat f = new SimpleDateFormat("h:mm a", ES);
            try (Cursor cur = getContentResolver().query(ub.build(), proj, CalendarContract.Instances.VISIBLE + "=1", null, CalendarContract.Instances.BEGIN + " ASC")) {
                while (cur != null && cur.moveToNext()) {
                    String titulo = cur.getString(0);
                    long b = cur.getLong(1), e = cur.getLong(2);
                    boolean todoDia = cur.getInt(3) == 1;
                    if (!todoDia && e < ahora) continue;
                    String cuando = todoDia ? "Todo el día" : f.format(b).replace(". ", "").replace(".", "");
                    eventos.add(new String[]{cuando, TextUtils.isEmpty(titulo) ? "(Sin título)" : titulo, String.valueOf(cur.getLong(4))});
                }
            } catch (Exception ex) { /* sin calendario */ }
            ui.post(() -> { if (destino == agendaLista) pintarAgenda(eventos); });
        }).start();
    }

    void pintarAgenda(List<String[]> eventos) {
        agendaLista.removeAllViews();
        agendaTitulo.setText(eventos.isEmpty() ? "HOY" : "HOY · " + eventos.size() + (eventos.size() == 1 ? " PENDIENTE" : " PENDIENTES"));
        if (eventos.isEmpty()) {
            agendaLista.addView(texto("Nada más en tu agenda hoy.", 14, MUTED, tf(false)), lp(-1, -2, 8));
            return;
        }
        int max = "meraki".equals(estilo) || "reloj".equals(estilo) ? 4 : 3;
        max = Math.min(max, eventos.size());
        for (int k = 0; k < max; k++) {
            String[] ev = eventos.get(k);
            LinearLayout fila = new LinearLayout(this);
            fila.setGravity(Gravity.CENTER_VERTICAL);
            TextView h = texto(ev[0], 13, acento, Typeface.create("sans-serif-medium", Typeface.BOLD));
            h.setMinWidth(dp("columna".equals(estilo) ? 66 : 84));
            fila.addView(h);
            TextView ti = texto(ev[1], 14.5f, FG, tf(false));
            ti.setSingleLine(true); ti.setEllipsize(TextUtils.TruncateAt.END);
            fila.addView(ti, new LinearLayout.LayoutParams(0, -2, 1f));
            final long id = Long.parseLong(ev[2]);
            fila.setOnClickListener(v -> abrirCalendario(id));
            agendaLista.addView(fila, lp(-1, -2, 10));
        }
        if (eventos.size() > max) agendaLista.addView(texto("+" + (eventos.size() - max) + " más", 12, MUTED, tf(false)), lp(-2, -2, 8));
    }

    void abrirCalendario(long eventoId) {
        Uri u = eventoId >= 0
                ? ContentUris.withAppendedId(CalendarContract.Events.CONTENT_URI, eventoId)
                : CalendarContract.CONTENT_URI.buildUpon().appendPath("time").appendPath(String.valueOf(System.currentTimeMillis())).build();
        abrir(new Intent(Intent.ACTION_VIEW, u), "No encontré la app de calendario.");
    }

    @Override
    public boolean onKeyDown(int code, KeyEvent ev) {
        if (ajustes.getVisibility() != View.VISIBLE && drawer.getVisibility() != View.VISIBLE && ev.isPrintingKey()) {
            abrirCajon(); buscar.requestFocus();
        }
        return super.onKeyDown(code, ev);
    }


    // =====================================================================
    // WIDGETS
    // =====================================================================
    /** Anfitrión de widgets que detecta el toque largo para mostrar el menú del widget. */
    class Anfitrion extends AppWidgetHost {
        Anfitrion(Context c, int id) { super(c, id); }
        @Override protected AppWidgetHostView onCreateView(Context c, int id, AppWidgetProviderInfo info) { return new VistaWidget(c); }
    }

    class VistaWidget extends AppWidgetHostView {
        Runnable largo; float x0, y0; boolean disparado;
        VistaWidget(Context c) { super(c); }
        @Override public boolean onInterceptTouchEvent(MotionEvent e) {
            switch (e.getActionMasked()) {
                case MotionEvent.ACTION_DOWN:
                    x0 = e.getX(); y0 = e.getY(); disparado = false;
                    final int id = getAppWidgetId();
                    largo = () -> { disparado = true; performHapticFeedback(android.view.HapticFeedbackConstants.LONG_PRESS); menuWidget(id); };
                    postDelayed(largo, android.view.ViewConfiguration.getLongPressTimeout());
                    break;
                case MotionEvent.ACTION_MOVE:
                    if (Math.abs(e.getX() - x0) > dp(10) || Math.abs(e.getY() - y0) > dp(10)) removeCallbacks(largo);
                    break;
                case MotionEvent.ACTION_UP: case MotionEvent.ACTION_CANCEL:
                    removeCallbacks(largo);
                    break;
            }
            return disparado;
        }
    }

    /** Widgets guardados como "id:alto|id:alto" (alto en dp). */
    List<int[]> listaWidgets() {
        List<int[]> out = new ArrayList<>();
        for (String w : prefs.getString("widgets", "").split("\\|")) {
            if (w.isEmpty()) continue;
            String[] p = w.split(":");
            try { out.add(new int[]{Integer.parseInt(p[0]), p.length > 1 ? Integer.parseInt(p[1]) : 180}); } catch (Exception e) { }
        }
        return out;
    }

    void guardarWidgets(List<int[]> l) {
        List<String> s = new ArrayList<>();
        for (int[] w : l) s.add(w[0] + ":" + w[1]);
        prefs.edit().putString("widgets", TextUtils.join("|", s)).apply();
    }

    void pintarWidgets() {
        if (widgetBox == null) return;
        widgetBox.removeAllViews();
        List<int[]> l = listaWidgets();
        boolean limpiar = false;
        for (int[] w : l) {
            AppWidgetProviderInfo info = awm.getAppWidgetInfo(w[0]);
            if (info == null) { limpiar = true; continue; }
            AppWidgetHostView hv = host.createView(getApplicationContext(), w[0], info);
            hv.setPadding(0, 0, 0, 0);
            int ancho = Math.round((getResources().getDisplayMetrics().widthPixels - dp(44)) / getResources().getDisplayMetrics().density);
            try { hv.updateAppWidgetSize(null, ancho, w[1], ancho, w[1]); } catch (Exception e) { }
            widgetBox.addView(hv, lp(-1, dp(w[1]), 14));
        }
        if (limpiar) {
            List<int[]> ok = new ArrayList<>();
            for (int[] w : l) if (awm.getAppWidgetInfo(w[0]) != null) ok.add(w);
            guardarWidgets(ok);
        }
    }

    void agregarWidget() {
        List<AppWidgetProviderInfo> ps = new ArrayList<>(awm.getInstalledProviders());
        if (ps.isEmpty()) { toast("No encontré widgets instalados."); return; }
        PackageManager pm = getPackageManager();
        Map<AppWidgetProviderInfo, String> nombres = new HashMap<>();
        for (AppWidgetProviderInfo i : ps) {
            String app;
            try { app = String.valueOf(pm.getApplicationLabel(pm.getApplicationInfo(i.provider.getPackageName(), 0))); } catch (Exception e) { app = i.provider.getPackageName(); }
            String w = i.loadLabel(pm);
            int dw = Math.round(i.minWidth / getResources().getDisplayMetrics().density), dh = Math.round(i.minHeight / getResources().getDisplayMetrics().density);
            nombres.put(i, app + " · " + w + "  (" + Math.max(1, (dw + 30) / 70) + "×" + Math.max(1, (dh + 30) / 70) + ")");
        }
        Collections.sort(ps, (a, b) -> sinAcentos(nombres.get(a)).compareTo(sinAcentos(nombres.get(b))));
        String[] items = new String[ps.size()];
        for (int i = 0; i < ps.size(); i++) items[i] = nombres.get(ps.get(i));
        dialogo().setTitle("Elegí un widget").setItems(items, (d, w) -> {
            AppWidgetProviderInfo info = ps.get(w);
            int id = host.allocateAppWidgetId();
            widgetPendiente = id; infoPendiente = info;
            if (awm.bindAppWidgetIdIfAllowed(id, info.provider)) configurarWidget(id, info);
            else {
                Intent i = new Intent(AppWidgetManager.ACTION_APPWIDGET_BIND);
                i.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id);
                i.putExtra(AppWidgetManager.EXTRA_APPWIDGET_PROVIDER, info.provider);
                try { startActivityForResult(i, REQ_BIND); } catch (Exception e) { host.deleteAppWidgetId(id); toast("Tu teléfono no dejó agregar ese widget."); }
            }
        }).setNegativeButton("Cancelar", null).show();
    }

    int widgetPendiente = -1; AppWidgetProviderInfo infoPendiente;

    void configurarWidget(int id, AppWidgetProviderInfo info) {
        if (info.configure != null) {
            try { host.startAppWidgetConfigureActivityForResult(this, id, 0, REQ_CONFIG, null); return; }
            catch (Exception e) { /* si falla, se agrega sin configurar */ }
        }
        widgetListo(id, info);
    }

    void widgetListo(int id, AppWidgetProviderInfo info) {
        int alto = Math.round(info.minHeight / getResources().getDisplayMetrics().density);
        alto = Math.max(90, Math.min(alto + 20, 320));
        List<int[]> l = listaWidgets();
        l.add(new int[]{id, alto});
        guardarWidgets(l);
        pintarWidgets();
        toast("Widget agregado. Mantenelo presionado para cambiarle el tamaño o quitarlo.");
        if (scrollMedio != null) ui.postDelayed(() -> scrollMedio.fullScroll(View.FOCUS_DOWN), 300);
    }

    void menuWidget(int id) {
        List<int[]> l = listaWidgets();
        int idx = -1;
        for (int i = 0; i < l.size(); i++) if (l.get(i)[0] == id) idx = i;
        if (idx < 0) return;
        final int pos = idx;
        List<String> ops = new ArrayList<>(Arrays.asList("Más alto", "Más bajo"));
        if (pos > 0) ops.add("Subir");
        if (pos < l.size() - 1) ops.add("Bajar");
        ops.add("Quitar widget");
        dialogo().setTitle("Widget").setItems(ops.toArray(new String[0]), (d, w) -> {
            String op = ops.get(w);
            int[] it = l.get(pos);
            switch (op) {
                case "Más alto": it[1] = Math.min(it[1] + 40, 600); break;
                case "Más bajo": it[1] = Math.max(it[1] - 40, 60); break;
                case "Subir": Collections.swap(l, pos, pos - 1); break;
                case "Bajar": Collections.swap(l, pos, pos + 1); break;
                case "Quitar widget": l.remove(pos); host.deleteAppWidgetId(id); break;
            }
            guardarWidgets(l); pintarWidgets();
            if (op.startsWith("Más")) ui.post(() -> menuWidget(id));
        }).show();
    }

    // =====================================================================
    // CARPETAS
    // =====================================================================
    JSONObject carpetas() {
        try { return new JSONObject(prefs.getString("carpetas", "{}")); } catch (Exception e) { return new JSONObject(); }
    }

    void guardarCarpetas(JSONObject j) { prefs.edit().putString("carpetas", j.toString()).apply(); }

    String nombreCarpeta(String id) { JSONObject c = carpetas().optJSONObject(id); return c == null ? "Carpeta" : c.optString("n", "Carpeta"); }

    List<App> appsCarpeta(String id) {
        List<App> out = new ArrayList<>();
        JSONObject c = carpetas().optJSONObject(id);
        if (c == null) return out;
        JSONArray a = c.optJSONArray("a");
        if (a != null) for (int i = 0; i < a.length(); i++) { App ap = porKey.get(a.optString(i)); if (ap != null) out.add(ap); }
        return out;
    }

    void guardarAppsCarpeta(String id, List<String> keys) {
        JSONObject j = carpetas();
        try {
            JSONObject c = j.optJSONObject(id); if (c == null) { c = new JSONObject(); c.put("n", "Carpeta"); }
            c.put("a", new JSONArray(keys)); j.put(id, c);
        } catch (Exception e) { }
        guardarCarpetas(j);
    }

    void crearCarpeta(App primera) {
        EditText e = new EditText(this);
        e.setHint("Ej: Trabajo, Redes, Iglesia");
        e.setSingleLine(true); e.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);
        FrameLayout f = new FrameLayout(this); f.setPadding(dp(22), dp(8), dp(22), 0); f.addView(e);
        dialogo().setTitle("Nombre de la carpeta").setView(f).setPositiveButton("Crear", (d, w) -> {
            String nom = e.getText().toString().trim(); if (nom.isEmpty()) nom = "Carpeta";
            String id = "c" + System.currentTimeMillis();
            JSONObject j = carpetas();
            try { JSONObject c = new JSONObject(); c.put("n", nom); c.put("a", new JSONArray(Collections.singletonList(primera.key()))); j.put(id, c); } catch (Exception ex) { }
            guardarCarpetas(j);
            List<String> favs = favoritos();
            int pos = favs.indexOf(primera.key());
            if (pos >= 0) favs.set(pos, "carpeta:" + id); else favs.add("carpeta:" + id);
            guardarFavs(favs); pintarFavoritos();
            editarAppsCarpeta(id);
        }).setNegativeButton("Cancelar", null).show();
    }

    void editarAppsCarpeta(String id) {
        List<App> dentro = appsCarpeta(id);
        Set<String> sel = new HashSet<>(); for (App a : dentro) sel.add(a.key());
        List<App> l = new ArrayList<>(todas);
        String[] n = new String[l.size()]; boolean[] m = new boolean[l.size()];
        for (int i = 0; i < l.size(); i++) { n[i] = l.get(i).label; m[i] = sel.contains(l.get(i).key()); }
        dialogo().setTitle("Apps en «" + nombreCarpeta(id) + "»").setMultiChoiceItems(n, m, (d, w, v) -> m[w] = v)
                .setPositiveButton("Listo", (d, w) -> {
                    List<String> keys = new ArrayList<>();
                    for (App a : dentro) { int i = l.indexOf(a); if (i >= 0 && m[i]) keys.add(a.key()); } // conserva el orden
                    for (int i = 0; i < l.size(); i++) if (m[i] && !keys.contains(l.get(i).key())) keys.add(l.get(i).key());
                    guardarAppsCarpeta(id, keys);
                    // Si estaban sueltas en el inicio, ya quedan dentro de la carpeta
                    List<String> favs = favoritos(); favs.removeAll(keys); guardarFavs(favs);
                    pintarFavoritos();
                }).setNegativeButton("Cancelar", null).show();
    }

    void abrirCarpeta(String id) {
        List<App> apps = appsCarpeta(id);
        GridLayout g = new GridLayout(this);
        g.setColumnCount(4);
        g.setPadding(dp(14), dp(14), dp(14), dp(6));
        int s = Math.round(tamIconoPx() * 0.92f);
        int ancho = Math.min(getResources().getDisplayMetrics().widthPixels - dp(80), dp(340)) / 4;
        final AlertDialog[] dlg = new AlertDialog[1];
        for (App a : apps) {
            View v = celdaApp(a, false, true, s);
            v.setOnClickListener(x -> { if (dlg[0] != null) dlg[0].dismiss(); lanzar(a); });
            v.setOnLongClickListener(x -> {
                dialogo().setTitle(a.label).setItems(new String[]{"Sacar de la carpeta", "Opciones de la app"}, (d, w) -> {
                    if (dlg[0] != null) dlg[0].dismiss();
                    if (w == 0) {
                        List<String> keys = new ArrayList<>(); for (App b : appsCarpeta(id)) if (!b.key().equals(a.key())) keys.add(b.key());
                        guardarAppsCarpeta(id, keys); pintarFavoritos();
                    } else opcionesApp(a);
                }).show();
                return true;
            });
            GridLayout.LayoutParams p = new GridLayout.LayoutParams(); p.width = ancho; p.bottomMargin = dp(12);
            g.addView(v, p);
        }
        if (apps.isEmpty()) g.addView(texto("Carpeta vacía. Tocá «Editar» para agregar apps.", 13, MUTED, tf(false)));
        ScrollView sv = new ScrollView(this); sv.addView(g);
        dlg[0] = dialogo().setTitle(nombreCarpeta(id)).setView(sv)
                .setPositiveButton("Editar", (d, w) -> opcionesCarpeta(id)).setNegativeButton("Cerrar", null).create();
        dlg[0].show();
    }

    void opcionesCarpeta(String id) {
        List<String> favs = favoritos();
        String k = "carpeta:" + id; int idx = favs.indexOf(k);
        List<String> ops = new ArrayList<>(Arrays.asList("Agregar o quitar apps", "Cambiar nombre"));
        if (idx > 0) ops.add("Mover antes");
        if (idx >= 0 && idx < favs.size() - 1) ops.add("Mover después");
        ops.add("Deshacer carpeta");
        dialogo().setTitle(nombreCarpeta(id)).setItems(ops.toArray(new String[0]), (d, w) -> {
            switch (ops.get(w)) {
                case "Agregar o quitar apps": editarAppsCarpeta(id); break;
                case "Cambiar nombre": {
                    EditText e = new EditText(this); e.setText(nombreCarpeta(id)); e.setSingleLine(true);
                    FrameLayout f = new FrameLayout(this); f.setPadding(dp(22), dp(8), dp(22), 0); f.addView(e);
                    dialogo().setTitle("Nombre").setView(f).setPositiveButton("Guardar", (d2, w2) -> {
                        JSONObject j = carpetas();
                        try { j.getJSONObject(id).put("n", e.getText().toString().trim().isEmpty() ? "Carpeta" : e.getText().toString().trim()); } catch (Exception ex) { }
                        guardarCarpetas(j); pintarFavoritos();
                    }).setNegativeButton("Cancelar", null).show();
                    break;
                }
                case "Mover antes": Collections.swap(favs, idx, idx - 1); guardarFavs(favs); pintarFavoritos(); break;
                case "Mover después": Collections.swap(favs, idx, idx + 1); guardarFavs(favs); pintarFavoritos(); break;
                case "Deshacer carpeta": {
                    List<String> nuevo = new ArrayList<>(favs);
                    int pos = nuevo.indexOf(k); if (pos < 0) pos = nuevo.size(); else nuevo.remove(pos);
                    for (App a : appsCarpeta(id)) if (!nuevo.contains(a.key())) nuevo.add(Math.min(pos++, nuevo.size()), a.key());
                    guardarFavs(nuevo);
                    JSONObject j = carpetas(); j.remove(id); guardarCarpetas(j);
                    pintarFavoritos(); break;
                }
            }
        }).show();
    }

    /** Ícono de carpeta: hasta 4 mini íconos dentro de un cuadro redondeado. */
    Drawable iconoCarpeta(String id, int s) {
        List<App> apps = appsCarpeta(id);
        Bitmap bm = Bitmap.createBitmap(s, s, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bm);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setColor(claro ? 0xCCFFFFFF : 0xCC1C1A16);
        RectF r = new RectF(dp(1), dp(1), s - dp(1), s - dp(1));
        c.drawRoundRect(r, s * 0.28f, s * 0.28f, p);
        p.setStyle(Paint.Style.STROKE); p.setStrokeWidth(dp(1)); p.setColor(conAlpha(acento, 0x99));
        c.drawRoundRect(r, s * 0.28f, s * 0.28f, p);
        int m = Math.round(s * 0.36f), gap = Math.round(s * 0.08f), x0 = (s - m * 2 - gap) / 2;
        for (int i = 0; i < Math.min(4, apps.size()); i++) {
            Drawable d = icono(apps.get(i), m);
            if (d == null) continue;
            int x = x0 + (i % 2) * (m + gap), y = x0 + (i / 2) * (m + gap);
            d = d.getConstantState() != null ? d.getConstantState().newDrawable(getResources()).mutate() : d;
            d.setBounds(x, y, x + m, y + m); d.draw(c);
        }
        return new BitmapDrawable(getResources(), bm);
    }

    View vistaCarpeta(String id, boolean fila, boolean conNombre, int s) {
        int notis = 0; for (App a : appsCarpeta(id)) notis += Insignias.de(a.pkg);
        View v;
        if (fila) {
            LinearLayout f = new LinearLayout(this);
            f.setGravity(Gravity.CENTER_VERTICAL);
            f.setPadding(0, dp(7), 0, dp(7));
            int si = Math.round(tamIconoPx() * 0.6f);
            f.addView(conInsignia(iconoCarpeta(id, si), si, notis), new LinearLayout.LayoutParams(si, si));
            TextView t = texto(nombreCarpeta(id) + "  ›", 15, FG, tf(false));
            LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(0, -2, 1f); p.leftMargin = dp(14);
            f.addView(t, p);
            v = f;
        } else {
            LinearLayout c = columnaBase();
            c.setGravity(Gravity.CENTER_HORIZONTAL);
            c.setPadding(dp(2), dp(2), dp(2), dp(2));
            c.addView(conInsignia(iconoCarpeta(id, s), s, notis), new LinearLayout.LayoutParams(s, s));
            if (conNombre) {
                TextView t = texto(nombreCarpeta(id), 11.5f, FG, tf(false));
                t.setSingleLine(true); t.setEllipsize(TextUtils.TruncateAt.END); t.setGravity(Gravity.CENTER);
                if (!claro) t.setShadowLayer(dp(3), 0, dp(1), 0xCC000000);
                c.addView(t, lp(-1, -2, 6));
            }
            v = c;
        }
        v.setOnClickListener(x -> abrirCarpeta(id));
        v.setOnLongClickListener(x -> { opcionesCarpeta(id); return true; });
        return v;
    }

    // =====================================================================
    // PUNTITOS DE NOTIFICACIÓN
    // =====================================================================
    boolean permisoNotificaciones() {
        String s = Settings.Secure.getString(getContentResolver(), "enabled_notification_listeners");
        return s != null && s.contains(getPackageName());
    }

    View conInsignia(Drawable icono, int s, int n) {
        FrameLayout f = new FrameLayout(this);
        ImageView iv = new ImageView(this);
        iv.setImageDrawable(icono);
        f.addView(iv, new FrameLayout.LayoutParams(s, s));
        if (n > 0 && !"no".equals(insignias)) {
            boolean num = "numero".equals(insignias);
            TextView b = texto(num ? (n > 99 ? "99+" : String.valueOf(n)) : "", 10, 0xFFFFFFFF, Typeface.create("sans-serif-medium", Typeface.BOLD));
            b.setGravity(Gravity.CENTER);
            GradientDrawable g = new GradientDrawable(); g.setColor(0xFFD8443A); g.setCornerRadius(dp(99));
            g.setStroke(dp(1.5f), claro ? 0xFFF4F1EA : 0xFF0B0A08);
            b.setBackground(g);
            int t = num ? dp(18) : dp(11);
            if (num) b.setPadding(dp(4), 0, dp(4), 0);
            FrameLayout.LayoutParams p = new FrameLayout.LayoutParams(num ? -2 : t, t, Gravity.TOP | Gravity.END);
            if (num) b.setMinWidth(t);
            f.addView(b, p);
        }
        return f;
    }

    void configurarInsignias() {
        String[] nombres = new String[INSIGNIAS.length]; int sel = 0;
        for (int i = 0; i < INSIGNIAS.length; i++) { nombres[i] = INSIGNIAS[i][1]; if (INSIGNIAS[i][0].equals(insignias)) sel = i; }
        dialogo().setTitle("Puntitos de notificación").setSingleChoiceItems(nombres, sel, (d, w) -> {
            d.dismiss();
            guardar("insignias", INSIGNIAS[w][0]);
            if (!"no".equals(INSIGNIAS[w][0]) && !permisoNotificaciones()) {
                dialogo().setTitle("Falta un permiso").setMessage("Para saber qué apps tienen notificaciones, activá «Meraki Launcher · puntitos» en Acceso a notificaciones. Sólo cuenta cuántas hay; no guarda ni manda nada.\n\nSi Android dice que es un ajuste restringido: Ajustes > Aplicaciones > Meraki Launcher > ⋮ > Permitir ajustes restringidos.")
                        .setPositiveButton("Activar", (d2, w2) -> abrir(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS), "No pude abrir ese ajuste."))
                        .setNegativeButton("Ahora no", null).show();
            }
        }).setNegativeButton("Cancelar", null).show();
    }

    // =====================================================================
    // PAQUETES DE ÍCONOS
    // =====================================================================
    void cargarPaquete() {
        final String nom = paqueteNombre;
        if (nom == null || nom.isEmpty()) { paquete = null; return; }
        if (paquete != null && paquete.pkg.equals(nom)) return;
        new Thread(() -> {
            PaqueteIconos pi = null;
            try { pi = new PaqueteIconos(getPackageManager(), nom); } catch (Throwable e) { pi = null; }
            final PaqueteIconos listo = pi;
            ui.post(() -> {
                if (!nom.equals(paqueteNombre)) return;
                paquete = listo;
                if (listo == null) toast("No pude leer ese paquete de íconos.");
                cacheIconos.clear(); adapter.notifyDataSetChanged(); pintarFavoritos(); pintarSugeridas();
            });
        }).start();
    }

    void elegirPaquete() {
        Map<String, String> inst = PaqueteIconos.instalados(getPackageManager());
        List<String> pkgs = new ArrayList<>(); List<String> noms = new ArrayList<>();
        pkgs.add(""); noms.add("Ninguno (íconos de cada app)");
        for (Map.Entry<String, String> e : inst.entrySet()) { pkgs.add(e.getKey()); noms.add(e.getValue()); }
        noms.add("Buscar paquetes en la Play Store…");
        int sel = Math.max(0, pkgs.indexOf(paqueteNombre));
        dialogo().setTitle("Paquete de íconos").setSingleChoiceItems(noms.toArray(new String[0]), sel, (d, w) -> {
            d.dismiss();
            if (w == noms.size() - 1) {
                abrir(new Intent(Intent.ACTION_VIEW, Uri.parse("market://search?q=icon pack nova&c=apps")), "No encontré la Play Store.");
                return;
            }
            paquete = null;
            guardar("paquete_iconos", pkgs.get(w));
            cargarPaquete();
            if (inst.isEmpty()) toast("No tenés paquetes de íconos instalados todavía.");
        }).setNegativeButton("Cancelar", null).show();
    }

    // =====================================================================
    // ATAJOS (ej. "Nuevo chat" en WhatsApp)
    // =====================================================================
    List<ShortcutInfo> atajos(App a) {
        List<ShortcutInfo> out = new ArrayList<>();
        try {
            LauncherApps la = (LauncherApps) getSystemService(Context.LAUNCHER_APPS_SERVICE);
            if (la == null || !la.hasShortcutHostPermission()) return out;
            LauncherApps.ShortcutQuery q = new LauncherApps.ShortcutQuery();
            q.setPackage(a.pkg);
            q.setQueryFlags(LauncherApps.ShortcutQuery.FLAG_MATCH_DYNAMIC | LauncherApps.ShortcutQuery.FLAG_MATCH_MANIFEST);
            List<ShortcutInfo> l = la.getShortcuts(q, Process.myUserHandle());
            if (l != null) for (ShortcutInfo si : l) if (si.isEnabled()) out.add(si);
            Collections.sort(out, (x, y) -> Integer.compare(x.getRank(), y.getRank()));
            if (out.size() > 5) out = new ArrayList<>(out.subList(0, 5));
        } catch (Exception e) { }
        return out;
    }

    void abrirAtajo(ShortcutInfo si) {
        try {
            LauncherApps la = (LauncherApps) getSystemService(Context.LAUNCHER_APPS_SERVICE);
            la.startShortcut(si, null, null);
            sumarUso(si.getPackage() + "/" + (si.getActivity() != null ? si.getActivity().getClassName() : ""));
        } catch (Exception e) { toast("No se pudo abrir ese atajo."); }
    }

    // =====================================================================
    // USO (para "más usadas" y sugeridas)
    // =====================================================================
    JSONObject usos() { try { return new JSONObject(prefs.getString("usos", "{}")); } catch (Exception e) { return new JSONObject(); } }

    void sumarUso(String key) {
        JSONObject u = usos();
        try { u.put(key, u.optInt(key, 0) + 1); } catch (Exception e) { }
        prefs.edit().putString("usos", u.toString()).apply();
    }

    List<App> masUsadas(int n) {
        JSONObject u = usos();
        List<App> l = new ArrayList<>();
        for (App a : todas) if (u.optInt(a.key(), 0) > 0) l.add(a);
        Collections.sort(l, (x, y) -> Integer.compare(u.optInt(y.key(), 0), u.optInt(x.key(), 0)));
        return l.size() > n ? l.subList(0, n) : l;
    }

    void pintarSugeridas() {
        if (sugeridasBox == null) return;
        sugeridasBox.removeAllViews();
        boolean ver = verSugeridas && buscar.length() == 0;
        List<App> l = ver ? masUsadas(columnas) : new ArrayList<>();
        ((View) sugeridasBox.getParent()).setVisibility(l.isEmpty() ? View.GONE : View.VISIBLE);
        int s = tamIconoPx(); if (columnas == 5) s = Math.round(s * 0.86f);
        for (App a : l) {
            View v = celdaApp(a, true, true, s);
            v.setOnLongClickListener(x -> { iniciarArrastreCajon(x, a.key()); return true; });
            sugeridasBox.addView(v, new LinearLayout.LayoutParams(0, -2, 1f));
        }
        for (int i = l.size(); i < columnas && !l.isEmpty(); i++) sugeridasBox.addView(new View(this), new LinearLayout.LayoutParams(0, 1, 1f));
    }

    // =====================================================================
    // RESPALDO
    // =====================================================================
    void guardarRespaldo() {
        Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/json")
                .putExtra(Intent.EXTRA_TITLE, "meraki-launcher-respaldo-" + hoyClave() + ".json");
        try { startActivityForResult(i, REQ_GUARDAR); } catch (Exception e) { toast("Tu teléfono no dejó guardar el archivo."); }
    }

    void abrirRespaldo() {
        Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");
        try { startActivityForResult(i, REQ_ABRIR); } catch (Exception e) { toast("Tu teléfono no dejó abrir archivos."); }
    }

    void escribirRespaldo(Uri u) {
        try {
            JSONObject j = new JSONObject();
            j.put("app", "meraki-launcher"); j.put("version", 1);
            JSONObject d = new JSONObject();
            for (Map.Entry<String, ?> e : prefs.getAll().entrySet()) {
                String k = e.getKey(); Object v = e.getValue();
                if (k.startsWith("clima_") || "widgets".equals(k)) continue; // el clima se vuelve a bajar; los widgets dependen del cel
                JSONObject x = new JSONObject();
                if (v instanceof Boolean) { x.put("t", "b"); x.put("v", v); }
                else if (v instanceof Integer) { x.put("t", "i"); x.put("v", v); }
                else if (v instanceof Long) { x.put("t", "l"); x.put("v", v); }
                else if (v instanceof Float) { x.put("t", "f"); x.put("v", ((Float) v).doubleValue()); }
                else if (v instanceof Set) { x.put("t", "s"); x.put("v", new JSONArray((Set<?>) v)); }
                else { x.put("t", "str"); x.put("v", String.valueOf(v)); }
                d.put(k, x);
            }
            j.put("datos", d);
            try (OutputStream out = getContentResolver().openOutputStream(u)) { out.write(j.toString(2).getBytes("UTF-8")); }
            toast("Copia guardada. Guardala también en tu Drive.");
        } catch (Exception e) { toast("No pude guardar la copia."); }
    }

    void leerRespaldo(Uri u) {
        try {
            StringBuilder sb = new StringBuilder();
            try (BufferedReader r = new BufferedReader(new InputStreamReader(getContentResolver().openInputStream(u), "UTF-8"))) {
                String line; while ((line = r.readLine()) != null) sb.append(line);
            }
            JSONObject j = new JSONObject(sb.toString());
            if (!"meraki-launcher".equals(j.optString("app"))) { toast("Ese archivo no es una copia del Meraki Launcher."); return; }
            JSONObject d = j.getJSONObject("datos");
            String widgets = prefs.getString("widgets", "");
            SharedPreferences.Editor ed = prefs.edit().clear();
            ed.putString("widgets", widgets);
            java.util.Iterator<String> it = d.keys();
            while (it.hasNext()) {
                String k = it.next(); JSONObject x = d.getJSONObject(k);
                switch (x.optString("t")) {
                    case "b": ed.putBoolean(k, x.getBoolean("v")); break;
                    case "i": ed.putInt(k, x.getInt("v")); break;
                    case "l": ed.putLong(k, x.getLong("v")); break;
                    case "f": ed.putFloat(k, (float) x.getDouble("v")); break;
                    case "s": { Set<String> s = new HashSet<>(); JSONArray a = x.getJSONArray("v"); for (int i = 0; i < a.length(); i++) s.add(a.getString(i)); ed.putStringSet(k, s); break; }
                    default: ed.putString(k, x.getString("v"));
                }
            }
            ed.apply();
            paquete = null;
            aplicarTodo(); cargarPaquete(); cargarClima(true);
            toast("¡Listo! Tu configuración quedó restaurada.");
        } catch (Exception e) { toast("No pude leer esa copia."); }
    }

    @SuppressWarnings("unused")
    static List<String> lista(String... s) { return Arrays.asList(s); }
}
