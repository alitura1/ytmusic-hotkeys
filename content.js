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
      $("#play-pause-button") ||
      $(".play-pause-button.ytmusic-player-bar") ||
      $("ytmusic-player-bar tp-yt-paper-icon-button.play-pause-button");
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

  // Beğen butonu. Dil-bağımsız: "like" class token'ı (dislike'tan ayrı bir token olduğu
  // için .like asla dislike'ı yakalamaz). Eski (paper-icon-button) + yeni (yt-button-shape)
  // yapıları kapsar; son çare aria-label ("Beğenme"/"dislike" hariç).
  function clickIn(el) {
    if (!el) return false;
    (el.matches("button") ? el : el.querySelector("button") || el).click();
    return true;
  }
  function like() {
    const bar = $("ytmusic-player-bar");
    if (!bar) return false;
    const selectors = [
      "#button-shape-like",
      "yt-button-shape.like",
      "tp-yt-paper-icon-button.like",
      "button.like",
      ".like"
    ];
    for (const s of selectors) {
      const el = bar.querySelector(s);
      if (el) return clickIn(el);
    }
    const cands = Array.from(bar.querySelectorAll("button, tp-yt-paper-icon-button"));
    const el = cands.find((b) => {
      const cls = b.className && b.className.baseVal !== undefined ? b.className.baseVal : b.className || "";
      const s = ((b.getAttribute("aria-label") || "") + " " + (b.getAttribute("title") || "") + " " + (b.id || "") + " " + cls).toLowerCase();
      return /like|be[ğg]en|j'aime|gefäll|нрав|いい|좋아|喜欢|إعجاب|पसंद/.test(s) &&
        !/dislike|be[ğg]enme|n'aime pas|nicht|不喜欢|싫어|低評価|عدم|नापसंद/.test(s);
    });
    return clickIn(el);
  }

  function albumArt() {
    const bar = $("ytmusic-player-bar");
    if (bar) {
      const imgs = Array.from(bar.querySelectorAll("img"));
      const withSrc = imgs.find((i) => i.src && /^https?:/.test(i.src));
      if (withSrc) return withSrc.src;
    }
    const el = $("#song-image img") || $("img.image.ytmusic-player-bar") || $(".thumbnail img");
    return el && el.src ? el.src : "";
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
