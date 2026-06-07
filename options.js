// Ayarlar sayfası — dil seçimi + kombinasyon yakalama + parametreler → chrome.storage.sync
(() => {
  "use strict";

  let I18N = { t: (k) => k, dir: "ltr", locale: "auto" };
  const t = (k) => I18N.t(k);

  const rowsEl = document.getElementById("rows");
  const volumeStepEl = document.getElementById("volumeStep");
  const seekSecondsEl = document.getElementById("seekSeconds");
  const statusEl = document.getElementById("status");
  const langEl = document.getElementById("uiLocale");

  let state = {
    keymap: { ...YTM_DEFAULTS.keymap },
    volumeStep: YTM_DEFAULTS.volumeStep,
    seekSeconds: YTM_DEFAULTS.seekSeconds
  };

  async function applyI18n() {
    I18N = await ytmBuildI18n();
    document.dir = I18N.dir;
    document.documentElement.lang =
      I18N.locale === "auto" ? chrome.i18n.getMessage("@@ui_locale") || "en" : I18N.locale;
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const msg = t(el.getAttribute("data-i18n"));
      if (msg) el.textContent = msg;
    });
    document.title = t("extName");
  }

  function populateLangSelect() {
    langEl.innerHTML = "";
    const auto = document.createElement("option");
    auto.value = "auto";
    auto.textContent = t("lang_auto");
    langEl.appendChild(auto);
    Object.keys(YTM_LOCALE_NAMES).forEach((code) => {
      const o = document.createElement("option");
      o.value = code;
      o.textContent = YTM_LOCALE_NAMES[code];
      langEl.appendChild(o);
    });
    langEl.value = I18N.locale;
    langEl.addEventListener("change", () => {
      chrome.storage.sync.set({ uiLocale: langEl.value }, () => location.reload());
    });
  }

  function showStatus(text) {
    statusEl.textContent = text;
    statusEl.classList.add("show");
    clearTimeout(showStatus._t);
    showStatus._t = setTimeout(() => statusEl.classList.remove("show"), 1400);
  }

  function save(msgKey) {
    chrome.storage.sync.set(
      { keymap: state.keymap, volumeStep: state.volumeStep, seekSeconds: state.seekSeconds },
      () => showStatus(t(msgKey || "opt_saved"))
    );
  }

  function makeRow(action) {
    const row = document.createElement("div");
    row.className = "row";

    const label = document.createElement("div");
    label.className = "label";
    const main = document.createElement("span");
    main.textContent = t(action.i18n);
    label.appendChild(main);
    if (action.global) {
      const note = document.createElement("small");
      note.textContent = t("opt_globalRowNote");
      label.appendChild(note);
    }

    const box = document.createElement("div");
    box.className = "keybox";

    const keyBtn = document.createElement("button");
    keyBtn.className = "key";
    keyBtn.type = "button";

    const clearBtn = document.createElement("button");
    clearBtn.className = "clear";
    clearBtn.type = "button";
    clearBtn.textContent = "✕";

    function render() {
      const combo = state.keymap[action.id];
      keyBtn.textContent = combo ? ytmPrettyCombo(combo) : t("key_unassigned");
      keyBtn.classList.toggle("empty", !combo);
    }
    render();

    let capturing = false;
    function startCapture() {
      capturing = true;
      keyBtn.classList.add("capturing");
      keyBtn.textContent = t("key_press");
    }
    function stopCapture() {
      capturing = false;
      keyBtn.classList.remove("capturing");
      render();
    }

    keyBtn.addEventListener("click", () => (capturing ? stopCapture() : startCapture()));

    keyBtn.addEventListener("keydown", (e) => {
      if (!capturing) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape") {
        stopCapture();
        return;
      }
      if (ytmIsModifierOnly(e)) return;
      state.keymap[action.id] = ytmComboFromEvent(e);
      stopCapture();
      save();
    });

    keyBtn.addEventListener("blur", () => {
      if (capturing) stopCapture();
    });

    clearBtn.addEventListener("click", () => {
      state.keymap[action.id] = "";
      render();
      save();
    });

    box.appendChild(keyBtn);
    box.appendChild(clearBtn);
    row.appendChild(label);
    row.appendChild(box);
    return row;
  }

  function renderRows() {
    rowsEl.innerHTML = "";
    YTM_ACTIONS.forEach((a) => rowsEl.appendChild(makeRow(a)));
  }

  function load() {
    chrome.storage.sync.get(["keymap", "volumeStep", "seekSeconds"], (data) => {
      state.keymap = { ...YTM_DEFAULTS.keymap, ...(data.keymap || {}) };
      state.volumeStep =
        typeof data.volumeStep === "number" ? data.volumeStep : YTM_DEFAULTS.volumeStep;
      state.seekSeconds =
        typeof data.seekSeconds === "number" ? data.seekSeconds : YTM_DEFAULTS.seekSeconds;
      volumeStepEl.value = state.volumeStep;
      seekSecondsEl.value = state.seekSeconds;
      renderRows();
    });
  }

  volumeStepEl.addEventListener("change", () => {
    const v = parseInt(volumeStepEl.value, 10);
    state.volumeStep = isNaN(v) ? YTM_DEFAULTS.volumeStep : Math.min(50, Math.max(1, v));
    volumeStepEl.value = state.volumeStep;
    save();
  });

  seekSecondsEl.addEventListener("change", () => {
    const v = parseInt(seekSecondsEl.value, 10);
    state.seekSeconds = isNaN(v) ? YTM_DEFAULTS.seekSeconds : Math.min(60, Math.max(1, v));
    seekSecondsEl.value = state.seekSeconds;
    save();
  });

  document.getElementById("open-shortcuts").addEventListener("click", () => {
    if (chrome.commands && chrome.commands.openShortcutSettings) {
      chrome.commands.openShortcutSettings();
    } else {
      chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
    }
  });

  document.getElementById("reset").addEventListener("click", () => {
    state.keymap = { ...YTM_DEFAULTS.keymap };
    state.volumeStep = YTM_DEFAULTS.volumeStep;
    state.seekSeconds = YTM_DEFAULTS.seekSeconds;
    volumeStepEl.value = state.volumeStep;
    seekSecondsEl.value = state.seekSeconds;
    renderRows();
    save("opt_resetDone");
  });

  async function init() {
    await applyI18n();
    populateLangSelect();
    load();
  }

  init();
})();
