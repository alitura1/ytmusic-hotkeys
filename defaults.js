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
