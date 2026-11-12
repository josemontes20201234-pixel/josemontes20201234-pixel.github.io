package com.josemontes.launcher;

import android.content.pm.ApplicationInfo;

import org.json.JSONObject;

/**
 * Categorías automáticas del cajón. Primero manda lo que Jose escogió a mano; si no, se adivina
 * por el nombre y el paquete de la app y, al final, por la categoría que la app le dice a Android.
 */
final class Categorias {
    private Categorias() { }

    static final String[][] LISTA = {
            {"meraki", "Meraki"}, {"fe", "Fe"}, {"redes", "Mensajes y redes"}, {"trabajo", "Trabajo"}, {"dinero", "Dinero"},
            {"fotos", "Fotos"}, {"musica", "Música y video"}, {"compras", "Compras"}, {"viajes", "Mapas y viajes"},
            {"juegos", "Juegos"}, {"herramientas", "Herramientas"}, {"otras", "Otras"}};

    static String nombre(String id) { for (String[] c : LISTA) if (c[0].equals(id)) return c[1]; return "Todas"; }

    // palabras que delatan la categoría (en el paquete o en el nombre, sin tildes y en minúscula)
    static final String[] FE = {"bible", "biblia", "youversion", "devocional", "devotional", "iglesia", "church", "worship", "alabanza", "himnario", "hymn",
            "oracion", "prayer", "sermon", "cristian", "christian", "jesus", "cbn", "gospel", "evangel", "logos", "olive tree", "blue letter", "lifechurch"};
    static final String[] DINERO = {"bank", "banco", "banca", "agricola", "cuscatlan", "davivienda", "promerica", "hipotecario", "baccredomatic", "chivo",
            "binance", "paypal", "wallet", "samsung pay", "samsungpay", "money", "cash", "coinbase", "bybit", "tradingview", "investing", "crypto", "western union", "remitly"};
    static final String[] REDES = {"whatsapp", "telegram", "facebook", "messenger", "instagram", "tiktok", "musically", "twitter", "snapchat", "discord",
            "signal", "linkedin", "pinterest", "threads", "barcelona", "reddit", "messaging", "mensajes", "messages", "viber", "wechat", "dialer", "contacts",
            "contactos", "telefono", "phone", "line.android"};
    static final String[] MUSICA = {"youtube", "spotify", "music", "musica", "netflix", "disney", "primevideo", "prime video", "hbo", "max.android", "deezer",
            "soundcloud", "tidal", "twitch", "podcast", "radio", "vlc", "videoplayer", "video player", "shazam", "vix", "crunchyroll", "plex"};
    static final String[] FOTOS = {"camera", "camara", "gallery", "galeria", "photo", "foto", "lightroom", "snapseed", "picsart", "canva", "capcut",
            "inshot", "vsco", "remini", "photoshop", "editor de video", "screen recorder"};
    static final String[] COMPRAS = {"amazon", "shein", "temu", "aliexpress", "ebay", "walmart", "mercadolibre", "hugo", "pedidosya", "ubereats", "uber eats",
            "rappi", "mcdonald", "pizza", "starbucks", "pricesmart", "super selectos", "selectos", "siman"};
    static final String[] VIAJES = {"maps", "mapas", "waze", "uber", "indrive", "didi", "airbnb", "booking", "expedia", "avianca", "volaris", "copa", "trip"};
    static final String[] TRABAJO = {"gmail", "docs", "sheets", "slides", "drive", "calendar", "calendario", "office", "word", "excel", "powerpoint", "outlook",
            "teams", "zoom", "meet", "notion", "keep", "notes", "notas", "claude", "chatgpt", "openai", "gemini", "copilot", "adobe", "acrobat", "pdf",
            "business", "pages.app", "scanner", "trello", "slack", "dropbox", "onedrive"};
    static final String[] HERRAMIENTAS = {"settings", "ajustes", "configuracion", "calculator", "calculadora", "clock", "reloj", "files", "archivos", "myfiles",
            "chrome", "browser", "internet", "navegador", "weather", "clima", "store", "tienda", "vending", "authenticator", "vpn", "launcher", "flashlight",
            "linterna", "recorder", "grabadora", "compass", "brujula", "smartthings", "wearable", "galaxy", "samsung", "google", "android"};

    static boolean tiene(String s, String[] palabras) { for (String p : palabras) if (s.contains(p)) return true; return false; }

    static String de(MainActivity.App a, JSONObject manual) {
        if (manual != null) { String m = manual.optString(a.key(), ""); if (!m.isEmpty()) return m; }
        String l = MainActivity.sinAcentos(a.label), p = a.pkg.toLowerCase(java.util.Locale.ROOT), s = p + " " + l;
        // Proyector (para la Biblia en la iglesia) va con las de fe, no con las de Meraki
        if (p.equals("com.josemontes.proyector") || tiene(s, FE)) return "fe";
        if (l.contains("meraki") || p.startsWith("com.josemontes.") || p.contains("josemontes20201234")) return "meraki";
        if (a.cat == ApplicationInfo.CATEGORY_GAME) return "juegos";
        if (tiene(s, DINERO)) return "dinero";
        if (tiene(s, REDES)) return "redes";
        if (tiene(s, MUSICA)) return "musica";
        if (tiene(s, FOTOS)) return "fotos";
        if (tiene(s, COMPRAS)) return "compras";
        if (tiene(s, VIAJES)) return "viajes";
        if (tiene(s, TRABAJO)) return "trabajo";
        switch (a.cat) {
            case ApplicationInfo.CATEGORY_SOCIAL: return "redes";
            case ApplicationInfo.CATEGORY_AUDIO: case ApplicationInfo.CATEGORY_VIDEO: return "musica";
            case ApplicationInfo.CATEGORY_IMAGE: return "fotos";
            case ApplicationInfo.CATEGORY_MAPS: return "viajes";
            case ApplicationInfo.CATEGORY_PRODUCTIVITY: return "trabajo";
        }
        if (tiene(s, HERRAMIENTAS) || a.sistema) return "herramientas";
        return "otras";
    }
}
