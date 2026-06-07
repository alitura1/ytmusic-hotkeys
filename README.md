# YouTube Music Hotkeys

Control [YouTube Music](https://music.youtube.com) with keyboard shortcuts — play/pause,
next/previous, volume, mute, seek and like. Works on **Chrome, Edge, Brave** (and a
**Firefox** build). Available in **13 languages**.

> 🇹🇷 Türkçe açıklama için aşağı kaydır.

<p align="center"><img src="icons/icon128.png" width="96" alt="logo"></p>

## Features

- **Global shortcuts** (work even when the browser is in the background): Play/Pause, Next,
  Previous, Mute.
- **In-page combo shortcuts** (while the YouTube Music tab is focused) for everything,
  fully rebindable from the options page — uses layout-independent physical keys (`e.code`),
  so it works the same on QWERTY/Q/F keyboards.
- **Popup** with album art, track info, transport buttons and a **global-shortcut status**
  panel (shows whether each global key is assigned, with a one-click fix link).
- **13 languages** — auto-follows the browser language, or pick one manually in the options page:
  English, Türkçe, العربية (RTL), Español, Français, Deutsch, Русский, Português (BR), Italiano,
  日本語, 한국어, 简体中文, हिन्दी.

## Install (Chrome / Edge / Brave)

**From source (unpacked):**
1. Download/clone this repo (or grab `ytmusic-hotkeys-chrome.zip` from
   [Releases](../../releases) and unzip).
2. Open `chrome://extensions` (Edge: `edge://extensions`, Brave: `brave://extensions`).
3. Enable **Developer mode** (top right).
4. **Load unpacked** → select the extension folder.
5. Open `music.youtube.com`, play a song. Done.

## Install (Firefox)

1. Grab `ytmusic-hotkeys-firefox.zip` from [Releases](../../releases) (or run the build, see below).
2. Open `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on** → pick
   `manifest.json` inside the unzipped `firefox` folder.
3. ⚠️ Firefox does **not** support background-global shortcuts, so the four "global" keys work
   only while Firefox is focused. Hardware media keys and the in-page combos still work.

## Shortcuts

### Global (work everywhere — even with the browser in the background)

| Default key    | Action            |
| -------------- | ----------------- |
| `Ctrl+Shift+1` | Play / Pause      |
| `Ctrl+Shift+2` | Previous track    |
| `Ctrl+Shift+3` | Next track        |
| `Ctrl+Shift+4` | Mute / Unmute     |

Edit these in `chrome://extensions/shortcuts` (the popup and options page both have a button
that opens it). If a key shows as **unassigned** in the popup's status panel, just click
**Fix** and set it — browsers sometimes don't auto-assign suggested keys when there's a conflict.

### In-page (only while the YouTube Music tab is focused — rebindable in options)

| Default key | Action        |
| ----------- | ------------- |
| `K`         | Play / Pause  |
| `P`         | Previous      |
| `N`         | Next          |
| `↑`         | Volume up     |
| `↓`         | Volume down   |
| `→`         | Seek forward  |
| `←`         | Seek backward |
| `M`         | Mute          |
| `L`         | Like          |

> Prefer key combos? Each binding accepts modifiers too — just hold e.g. `Alt+Shift` while capturing in options.

Change any of these (and the volume step / seek seconds) from the extension's **options page**
(popup → "Key settings").

## About the Fn key

The laptop **`Fn` key cannot be detected** by any website or extension — it's handled inside the
keyboard's firmware and never reaches the browser as a key event. So it's technically impossible
to bind. Good news: the **media keys** you press *with* Fn (▶⏸⏭⏮, usually F7/F8/F9) already
control YouTube Music everywhere via the browser's Media Session — use those.

## Build (Chrome + Firefox zips)

```bash
node build/build.js
```
Produces `dist/chrome/`, `dist/firefox/` and `dist/ytmusic-hotkeys-{chrome,firefox}.zip`.

## Troubleshooting

- **Nothing works after install:** reload the extension (`chrome://extensions` → ↻). Existing
  YouTube Music tabs are auto-injected on install; if not, refresh the tab.
- **Global keys don't fire:** open the popup → check the **Global shortcut status** panel. If a
  key is unassigned, click **Fix** and assign it. Beware: `Ctrl+Shift+1..4` can clash with
  Windows keyboard-layout switching — rebind if needed.
- **Like doesn't work:** YouTube Music's UI may have changed. Open the YTM tab → F12 → Console
  and check `document.querySelector('ytmusic-player-bar ytmusic-like-button-renderer')`.

---

## 🇹🇷 Türkçe

YouTube Music'i klavye kısayollarıyla kontrol et: oynat/duraklat, sonraki/önceki, ses, sustur,
sarma, beğen. **Chrome, Edge, Brave** (ve bir **Firefox** sürümü). **13 dil** desteği.

### Özellikler
- **Global kısayollar** (tarayıcı arka plandayken bile çalışır): Oynat/Duraklat, Sonraki, Önceki, Sustur.
- **Sayfa-içi kombinasyon kısayolları** (YTM sekmesi öndeyken) — her aksiyon için, ayarlar
  sayfasından tamamen değiştirilebilir. Fiziksel tuş (`e.code`) kullanır; Türkçe Q/F klavyede de aynı çalışır.
- **Popup**: albüm görseli, şarkı bilgisi, transport butonları ve **global kısayol durumu** paneli
  (her global tuşun atanıp atanmadığını gösterir, tek tıkla "Düzelt").
- **13 dil** (tarayıcı dilini otomatik izler).

### Kurulum (Chrome / Edge / Brave)
1. `chrome://extensions` → sağ üst **Geliştirici modu** açık.
2. **Paketlenmemiş öğe yükle** → eklenti klasörünü seç.
3. `music.youtube.com` aç, şarkı başlat.

### Kurulum (Firefox)
`about:debugging` → **Geçici Eklenti Yükle** → `firefox` klasöründeki `manifest.json`.
⚠️ Firefox'ta arka-plan global kısayol yok; "global" tuşlar yalnız Firefox öndeyken çalışır
(medya tuşları + sayfa-içi kombinasyonlar geçerli).

### Kısayollar
**Global** (varsayılan, değiştirilebilir → `chrome://extensions/shortcuts`):
`Ctrl+Shift+1` Oynat/Duraklat · `Ctrl+Shift+2` Önceki · `Ctrl+Shift+3` Sonraki · `Ctrl+Shift+4` Sustur

**Sayfa-içi** (varsayılan, ayarlardan değiştirilebilir):
`K` Oynat/Duraklat · `P/N` Önceki/Sonraki · `↑/↓` Ses +/− · `→/←` İleri/Geri sar · `M` Sustur · `L` Beğen
(istersen options'ta yakalarken `Alt+Shift` gibi bir modifier basılı tutarak kombinasyon da atayabilirsin)

### Fn tuşu hakkında
Laptop **`Fn` tuşu algılanamaz** — klavye firmware'inde işlenir, tarayıcıya tuş olayı göndermez.
Bu yüzden ona kısayol atanamaz. Ama Fn ile bastığın **medya tuşları** (▶⏸⏭⏮) YouTube Music'i
zaten her yerde kontrol eder.

### Sorun giderme
- Çalışmıyorsa: `chrome://extensions` → eklentiyi yeniden yükle (↻), YTM sekmesini yenile.
- Global tuşlar tetiklenmiyorsa: popup → **Global kısayol durumu** → boşsa **Düzelt** ile ata.
  `Ctrl+Shift+1..4` Windows dil değiştirmeyle çakışabilir; gerekirse başka tuşa al.

## License
[MIT](LICENSE) © 2026 Ali Tura Çetin
