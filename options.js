// Ayarlar sayfası — kombinasyon yakalama + parametreler → chrome.storage.sync
(() => {
  "use strict";

  // --- i18n ---
  const t = (k) => chrome.i18n.getMessage(k) || k;
  function applyI18n() {
    document.documentElement.lang = chrome.i18n.getMessage("@@ui_locale") || "en";
    document.dir = chrome.i18n.getMessage("@@bidi_dir") || "ltr";
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const msg = t(el.getAttribute("data-i18n"));
      if (msg) el.textContent = msg;
    });
    document.title = t("extName");
  }

  const rowsEl = document.getElementById("rows");
  const volumeStepEl = document.getElementById("volumeStep");
  const seekSecondsEl = document.getElementById("seekSeconds");
  const statusEl = document.getElementById("status");

  let state = {
    keymap: { ...YTM_DEFAULTS.keymap },
    volumeStep: YTM_DEFAULTS.volumeStep,
    seekSeconds: YTM_DEFAULTS.seekSeconds
  };

  function showStatus(text) {
    statusEl.textContent = text;
    statusEl.classList.add("show");
    clearTimeout(showStatus._t);
    showStatus._t = setTimeout(() => statusEl.classList.remove("show"), 1400);
  }

  function save(msgKey) {
    chrome.storage.sync.set(
      {
        keymap: state.keymap,
        volumeStep: state.volumeStep,
        seekSeconds: state.seekSeconds
      },
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
      if (ytmIsModifierOnly(e)) return; // tam kombinasyonu bekle
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
    // Firefox: openShortcutSettings; Chrome/Edge/Brave: kısayol sayfası
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

  applyI18n();
  load();
})();
