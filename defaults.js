// Ortak varsayılanlar + yardımcılar — content.js, options.js, popup.js bu dosyayı yükler.

// Sayfa-içi (YTM sekmesi öndeyken) KOMBİNASYON kısayolları.
// Kanonik biçim: modifier'lar (Ctrl,Alt,Shift,Meta sırasıyla) + KeyboardEvent.code
// e.code kullanılır (layout-bağımsız: Türkçe Q/F klavyede de aynı fiziksel tuş).
// "" = atanmamış.
var YTM_DEFAULTS = {
  keymap: {
    "play-pause": "Alt+Shift+KeyP",
    "next": "Alt+Shift+ArrowRight",
    "previous": "Alt+Shift+ArrowLeft",
    "volume-up": "Alt+Shift+ArrowUp",
    "volume-down": "Alt+Shift+ArrowDown",
    "mute": "Alt+Shift+KeyM",
    "seek-forward": "Alt+Shift+KeyF",
    "seek-back": "Alt+Shift+KeyB",
    "like": "Alt+Shift+KeyL"
  },
  volumeStep: 5, // yüzde
  seekSeconds: 5 // saniye
};

// Aksiyon listesi. i18n = messages.json anahtarı. global:true → chrome.commands ile de çalışır.
var YTM_ACTIONS = [
  { id: "play-pause", i18n: "act_playPause", global: true },
  { id: "next", i18n: "act_next", global: true },
  { id: "previous", i18n: "act_previous", global: true },
  { id: "mute", i18n: "act_mute", global: true },
  { id: "volume-up", i18n: "act_volumeUp", global: false },
  { id: "volume-down", i18n: "act_volumeDown", global: false },
  { id: "seek-forward", i18n: "act_seekForward", global: false },
  { id: "seek-back", i18n: "act_seekBack", global: false },
  { id: "like", i18n: "act_like", global: false }
];

// chrome.commands'taki global komut id'leri (manifest ile aynı sırada)
var YTM_GLOBAL_COMMANDS = ["play-pause", "next", "previous", "mute"];

// Bir klavye olayından kanonik kombinasyon üret
function ytmComboFromEvent(e) {
  var parts = [];
  if (e.ctrlKey) parts.push("Ctrl");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");
  if (e.metaKey) parts.push("Meta");
  parts.push(e.code);
  return parts.join("+");
}

// Olay sadece modifier'a mı basıldı? (kombinasyon henüz tamamlanmadı)
function ytmIsModifierOnly(e) {
  return e.key === "Shift" || e.key === "Control" || e.key === "Alt" || e.key === "Meta";
}

// "Alt+Shift+ArrowRight" -> "Alt + Shift + →" (okunaklı gösterim)
function ytmPrettyCombo(combo) {
  if (!combo) return "";
  var map = {
    ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→",
    Space: "Space", Escape: "Esc", Enter: "Enter", Backspace: "⌫",
    Comma: ",", Period: ".", Slash: "/", Backslash: "\\",
    Minus: "-", Equal: "=", Semicolon: ";", Quote: "'",
    BracketLeft: "[", BracketRight: "]"
  };
  return combo.split("+").map(function (p) {
    if (p === "Ctrl" || p === "Alt" || p === "Shift" || p === "Meta") return p;
    if (map[p]) return map[p];
    if (p.indexOf("Key") === 0) return p.slice(3); // KeyP -> P
    if (p.indexOf("Digit") === 0) return p.slice(5); // Digit1 -> 1
    if (p.indexOf("Numpad") === 0) return "Num" + p.slice(6);
    return p;
  }).join(" + ");
}

// --- i18n (manuel dil seçimi) ---
// Desteklenen diller, kendi adlarıyla. "auto" = tarayıcı dili (chrome.i18n).
var YTM_LOCALE_NAMES = {
  en: "English",
  tr: "Türkçe",
  ar: "العربية",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  ru: "Русский",
  pt_BR: "Português (BR)",
  it: "Italiano",
  ja: "日本語",
  ko: "한국어",
  zh_CN: "中文 (简体)",
  hi: "हिन्दी"
};
var YTM_RTL_LOCALES = ["ar"];

function ytmFetchMessages(loc) {
  return fetch(chrome.runtime.getURL("_locales/" + loc + "/messages.json"))
    .then(function (r) { return r.json(); })
    .catch(function () { return null; });
}

// Seçilen dile göre {t, dir, locale} döndürür (Promise).
// uiLocale="auto" ise chrome.i18n (tarayıcı dili) kullanılır.
async function ytmBuildI18n() {
  let data = {};
  try { data = await chrome.storage.sync.get(["uiLocale"]); } catch (e) { /* yoksa auto */ }
  const choice = (data && data.uiLocale) || "auto";
  if (choice === "auto" || !YTM_LOCALE_NAMES[choice]) {
    return {
      t: (k) => chrome.i18n.getMessage(k) || k,
      dir: chrome.i18n.getMessage("@@bidi_dir") || "ltr",
      locale: "auto"
    };
  }
  const msgs = (await ytmFetchMessages(choice)) || {};
  const en = choice === "en" ? msgs : ((await ytmFetchMessages("en")) || {});
  const t = (k) =>
    (msgs[k] && msgs[k].message) ||
    (en[k] && en[k].message) ||
    chrome.i18n.getMessage(k) ||
    k;
  return { t, dir: YTM_RTL_LOCALES.indexOf(choice) >= 0 ? "rtl" : "ltr", locale: choice };
}
