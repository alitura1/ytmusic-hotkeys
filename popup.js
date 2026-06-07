// Popup: albüm görseli + transport kontrolleri + global kısayol durumu.
(() => {
  "use strict";

  let I18N = { t: (k) => k, dir: "ltr", locale: "auto" };
  const t = (k) => I18N.t(k);
  const ICON_PLAY = '<svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
  const ICON_PAUSE = '<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';

  async function applyI18n() {
    I18N = await ytmBuildI18n();
    document.dir = I18N.dir;
    document.documentElement.lang =
      I18N.locale === "auto" ? chrome.i18n.getMessage("@@ui_locale") || "en" : I18N.locale;
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const msg = t(el.getAttribute("data-i18n"));
      if (msg) el.textContent = msg;
    });
    // transport tooltipleri (aksiyon etiketleri)
    const labelOf = {};
    YTM_ACTIONS.forEach((a) => (labelOf[a.id] = t(a.i18n)));
    document.querySelectorAll(".t[data-action]").forEach((b) => {
      b.title = labelOf[b.dataset.action] || "";
    });
  }

  const els = {
    now: document.getElementById("now"),
    art: document.getElementById("art"),
    title: document.getElementById("title"),
    artist: document.getElementById("artist"),
    play: document.getElementById("t-play"),
    mute: document.getElementById("t-mute"),
    globalList: document.getElementById("global-list")
  };

  let ytmTabId = null;

  async function getYtmTab() {
    const tabs = await chrome.tabs.query({ url: "https://music.youtube.com/*" });
    return tabs.find((t) => t.audible) || tabs.find((t) => t.active) || tabs[0] || null;
  }

  function setEmpty(msgKey) {
    els.now.classList.add("empty");
    els.art.style.backgroundImage = "";
    els.title.textContent = t(msgKey);
    els.artist.textContent = "";
    els.play.innerHTML = ICON_PLAY;
  }

  function refreshTrack() {
    if (ytmTabId == null) return;
    chrome.tabs.sendMessage(ytmTabId, { type: "ytm-get-track" }, (resp) => {
      if (chrome.runtime.lastError || !resp) {
        setEmpty("pp_noTrack");
        return;
      }
      if (!resp.title && !resp.artist) {
        setEmpty("pp_noTrack");
        return;
      }
      els.now.classList.remove("empty");
      els.title.textContent = resp.title || "—";
      els.artist.textContent = resp.artist || "";
      els.art.style.backgroundImage = resp.albumArt ? `url("${resp.albumArt}")` : "";
      els.play.innerHTML = resp.paused ? ICON_PLAY : ICON_PAUSE;
      els.mute.classList.toggle("active", !!resp.muted);
    });
  }

  function wireTransport() {
    document.querySelectorAll(".t[data-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (ytmTabId == null) return;
        chrome.tabs.sendMessage(ytmTabId, { type: "ytm-action", action: btn.dataset.action }, () => {
          void chrome.runtime.lastError; // sessiz
          setTimeout(refreshTrack, 150);
        });
      });
    });
  }

  function openShortcuts() {
    if (chrome.commands && chrome.commands.openShortcutSettings) {
      chrome.commands.openShortcutSettings();
    } else {
      chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
    }
  }

  function loadGlobalStatus() {
    if (!chrome.commands || !chrome.commands.getAll) {
      els.globalList.parentElement.style.display = "none";
      return;
    }
    chrome.commands.getAll((cmds) => {
      const byName = {};
      (cmds || []).forEach((c) => (byName[c.name] = c));
      els.globalList.innerHTML = "";
      YTM_GLOBAL_COMMANDS.forEach((name) => {
        const c = byName[name];
        const labelText =
          (c && c.description) ||
          t(("act_" + name.replace(/-([a-z])/g, (_, x) => x.toUpperCase())));
        const row = document.createElement("div");
        row.className = "grow";
        const lab = document.createElement("span");
        lab.textContent = labelText;
        row.appendChild(lab);
        if (c && c.shortcut) {
          const k = document.createElement("span");
          k.className = "gkey";
          k.textContent = c.shortcut;
          row.appendChild(k);
        } else {
          const fix = document.createElement("button");
          fix.className = "gfix";
          fix.innerHTML = '<span class="warn">⚠</span> ' + t("pp_globalUnassigned") + " · " + t("pp_globalFix");
          fix.addEventListener("click", openShortcuts);
          row.appendChild(fix);
        }
        els.globalList.appendChild(row);
      });
    });
  }

  document.getElementById("open-options").addEventListener("click", () => chrome.runtime.openOptionsPage());
  document.getElementById("open-shortcuts").addEventListener("click", openShortcuts);

  async function init() {
    await applyI18n();
    wireTransport();
    loadGlobalStatus();
    const tab = await getYtmTab();
    if (!tab) {
      setEmpty("pp_notOpen");
      return;
    }
    ytmTabId = tab.id;
    refreshTrack();
    // popup açıkken canlı tut (kapanınca otomatik durur)
    setInterval(refreshTrack, 1000);
  }

  init();
})();
