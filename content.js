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
    // <video> doğrudan: mute (video.muted) çalıştığına göre bu da garanti çalışır
    const v = video();
    if (v) {
      try {
        if (v.paused) v.play();
        else v.pause();
        return true;
      } catch (_) {
        /* fallback'e düş */
      }
    }
    const btn =
      $("#play-pause-button") ||
      $(".play-pause-button.ytmusic-player-bar") ||
      $("ytmusic-player-bar tp-yt-paper-icon-button.play-pause-button");
    if (btn) {
      btn.click();
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
    const target =
      el.matches && el.matches("button") ? el : (el.querySelector && el.querySelector("button")) || el;
    target.click();
    return true;
  }
  // Beğen: ETİKET-temelli, ÖNCE dislike'ı ele (TR "Beğen" vs "Beğenme" çakışmasını çözer).
  function like() {
    const bar = $("ytmusic-player-bar");
    if (!bar) return false;
    const dislikeRe = /dislike|be[ğg]enme|no me gusta|n'aime pas|mag ich nicht|не нрав|低評価|嫌い|싫어|不喜[欢歡]|عدم الإعجاب|नापसंद|non mi piace|não curtir/i;
    const likeRe = /\blike\b|be[ğg]en|me gusta|j'aime|gefäll|нрав|いいね|高く評価|좋아|喜[欢歡]|إعجاب|पसंद|mi piace|curtir/i;
    const btns = Array.from(bar.querySelectorAll("button, tp-yt-paper-icon-button, yt-button-shape"));
    let likeBtn = null;
    for (const b of btns) {
      const lab = (b.getAttribute("aria-label") || b.getAttribute("title") || "").trim();
      if (!lab) continue;
      if (dislikeRe.test(lab)) continue; // dislike — atla
      if (likeRe.test(lab)) {
        likeBtn = b;
        break;
      }
    }
    // Yedek: 'like' class token'ı (dislike asla eşleşmez — farklı token)
    if (!likeBtn) {
      likeBtn = bar.querySelector(
        "#button-shape-like, yt-button-shape.like, tp-yt-paper-icon-button.like, button.like, .like"
      );
    }
    return clickIn(likeBtn);
  }

  function albumArt() {
    const bar = $("ytmusic-player-bar");
    if (bar) {
      const i = Array.from(bar.querySelectorAll("img")).find((x) => x.src && /^https?:/.test(x.src));
      if (i) return i.src;
    }
    const el =
      $("img#song-image") ||
      $("#song-image img") ||
      $("img.image.ytmusic-player-bar") ||
      $("#thumbnail img") ||
      $("ytmusic-player-bar img");
    if (el && el.src && /^https?:/.test(el.src)) return el.src;
    // son çare: sayfadaki ilk YTM kapak görseli
    const any = Array.from(document.querySelectorAll("img")).find(
      (x) => x.src && /(googleusercontent|ytimg)/.test(x.src)
    );
    return any ? any.src : "";
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
