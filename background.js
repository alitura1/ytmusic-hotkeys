// Service worker (Chrome) / event page (Firefox):
// - global kısayol komutlarını YTM sekmesine iletir
// - kurulumda/başlangıçta açık YTM sekmelerine content script'i enjekte eder
//   (böylece sekme yenilemeye gerek kalmaz)
const MEDIA_ACTIONS = new Set(["play-pause", "next", "previous", "mute"]);
const YTM_URL = "https://music.youtube.com/*";

async function findYtmTab() {
  const tabs = await chrome.tabs.query({ url: YTM_URL });
  if (!tabs.length) return null;
  return tabs.find((t) => t.audible) || tabs.find((t) => t.active) || tabs[0];
}

chrome.commands.onCommand.addListener(async (command) => {
  if (!MEDIA_ACTIONS.has(command)) return;
  const tab = await findYtmTab();
  if (!tab) return; // YTM açık değilse sessiz geç
  try {
    await chrome.tabs.sendMessage(tab.id, { type: "ytm-action", action: command });
  } catch (_) {
    // içerik betiği henüz hazır değilse enjekte edip tekrar dene
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["defaults.js", "content.js"]
      });
      await chrome.tabs.sendMessage(tab.id, { type: "ytm-action", action: command });
    } catch (_) {
      /* sessiz geç */
    }
  }
});

async function injectExisting() {
  try {
    const tabs = await chrome.tabs.query({ url: YTM_URL });
    for (const t of tabs) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: t.id },
          files: ["defaults.js", "content.js"]
        });
      } catch (_) {
        /* bazı sekmelere enjekte edilemeyebilir — geç */
      }
    }
  } catch (_) {
    /* scripting yoksa geç */
  }
}

chrome.runtime.onInstalled.addListener(injectExisting);
chrome.runtime.onStartup.addListener(injectExisting);
