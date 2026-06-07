// music.youtube.com üzerinde çalışır (ISOLATED world).
// - background.js'ten gelen komut mesajlarını çalıştırır
// - sayfa-içi kombinasyon kısayollarını dinler
// - popup için şarkı bilgisi/durumunu döndürür
(() => {
  "use strict";

  // Çift enjeksiyon koruması (manifest + scripting.executeScript birlikte tetiklenirse)
  if (window.__ytmHK) return;
  window.__ytmHK = true;

  const $ = (sel, root = document) => root.querySelector(sel);
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

  // --- Oynatıcı aksiyonları (doğrulanmış seçiciler) ---
  const video = () => $("video");

  function playPause() {
    const btn =
      $("button.video-button.ytmusic-av-toggle") ||
      $(".play-pause-button.ytmusic-player-bar") ||
      $("#play-pause-button");
    if (btn) {
      btn.click();
      return true;
    }
    const v = video();
    if (v) {
      v.paused ? v.play() : v.pause();
      return true;
    }
    return false;
  }

  function next() {
    const b =
      $(".next-button.ytmusic-player-bar") ||
      $("tp-yt-paper-icon-button.next-button");
    if (b) {
      b.click();
      return true;
    }
    return false;
  }

  function previous() {
    const b =
      $(".previous-button.ytmusic-player-bar") ||
      $("tp-yt-paper-icon-button.previous-button");
    if (b) {
      b.click();
      return true;
    }
    return false;
  }

  // Ses değişimini YTM slider'ına da yansıt (şarkı değişiminde eski sese dönmesini önler)
  function syncSlider(vol01) {
    const s = $("#volume-slider");
    if (!s) return;
    try {
      const pct = Math.round(vol01 * 100);
      s.value = pct;
      if ("immediateValue" in s) s.immediateValue = pct;
      s.dispatchEvent(new Event("immediate-value-change", { bubbles: true }));
      s.dispatchEvent(new Event("change", { bubbles: true }));
    } catch (_) {
      /* slider API'si değişmişse sessiz geç */
    }
  }

  function changeVolume(delta01) {
    const v = video();
    if (!v) return false;
    v.muted = false;
    v.volume = clamp(v.volume + delta01, 0, 1);
    syncSlider(v.volume);
    return true;
  }

  function toggleMute() {
    const v = video();
    if (!v) return false;
    v.muted = !v.muted;
    return true;
  }

  function seek(sec) {
    const v = video();
    if (!v) return false;
    const dur = isNaN(v.duration) ? v.currentTime + sec : v.duration;
    v.currentTime = clamp(v.currentTime + sec, 0, dur);
    return true;
  }

  // Beğen: aria-label TR/AR vb. lokalize olabilir → varsa aria-label, yoksa son buton
  function like() {
    const renderer = $("ytmusic-player-bar ytmusic-like-button-renderer");
    if (!renderer) return false;
    const buttons = Array.from(renderer.querySelectorAll("button"));
    if (!buttons.length) return false;
    const byLabel = buttons.find((b) =>
      /like|be[ğg]en|j'aime|gefällt|мне нравится|いいね|좋아요|喜欢|إعجاب/i.test(
        b.getAttribute("aria-label") || ""
      )
    );
    (byLabel || buttons[buttons.length - 1]).click();
    return true;
  }

  function albumArt() {
    const img =
      $("#song-image img") ||
      $("ytmusic-player-bar img.image") ||
      $("img.ytmusic-player-bar") ||
      $("ytmusic-player-bar img");
    return img ? img.src : "";
  }

  function runAction(action) {
    const step = (settings.volumeStep || 5) / 100;
    const sec = settings.seekSeconds || 5;
    switch (action) {
      case "play-pause": return playPause();
      case "next": return next();
      case "previous": return previous();
      case "mute": return toggleMute();
      case "volume-up": return changeVolume(step);
      case "volume-down": return changeVolume(-step);
      case "seek-forward": return seek(sec);
      case "seek-back": return seek(-sec);
      case "like": return like();
      default: return false;
    }
  }

  // --- Ayarlar ---
  let settings = {
    keymap: { ...YTM_DEFAULTS.keymap },
    volumeStep: YTM_DEFAULTS.volumeStep,
    seekSeconds: YTM_DEFAULTS.seekSeconds
  };

  function loadSettings() {
    chrome.storage.sync.get(["keymap", "volumeStep", "seekSeconds"], (data) => {
      settings.keymap = { ...YTM_DEFAULTS.keymap, ...(data.keymap || {}) };
      settings.volumeStep =
        typeof data.volumeStep === "number" ? data.volumeStep : YTM_DEFAULTS.volumeStep;
      settings.seekSeconds =
        typeof data.seekSeconds === "number" ? data.seekSeconds : YTM_DEFAULTS.seekSeconds;
    });
  }
  loadSettings();
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync") loadSettings();
  });

  // --- Mesajlar ---
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg) return;
    if (msg.type === "ytm-action") {
      runAction(msg.action);
      return;
    }
    if (msg.type === "ytm-get-track") {
      const v = video();
      const titleEl = $(".title.ytmusic-player-bar");
      const bylineEl = $(".byline.ytmusic-player-bar");
      sendResponse({
        title: titleEl ? titleEl.textContent.trim() : "",
        artist: bylineEl ? bylineEl.textContent.trim() : "",
        albumArt: albumArt(),
        paused: v ? v.paused : true,
        muted: v ? v.muted : false
      });
      return; // senkron yanıt
    }
  });

  // --- Sayfa-içi kombinasyon kısayolları ---
  function isTyping(el) {
    if (!el) return false;
    const tag = el.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable === true;
  }

  document.addEventListener(
    "keydown",
    (e) => {
      if (ytmIsModifierOnly(e)) return; // kombinasyon henüz tamamlanmadı
      if (e.repeat) return;
      if (isTyping(e.target)) return; // arama kutusu vb. yazarken tetikleme yok

      const combo = ytmComboFromEvent(e);
      for (const action in settings.keymap) {
        if (settings.keymap[action] && settings.keymap[action] === combo) {
          const did = runAction(action);
          if (did) {
            e.preventDefault();
            e.stopPropagation();
          }
          return;
        }
      }
    },
    true // capture: YTM kendi handler'larından önce yakala
  );
})();
