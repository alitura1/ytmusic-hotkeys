// Eklentiyi yayımdan önce doğrular: JSON geçerliliği, dil anahtar kapsaması,
// i18n anahtar kullanımı ve JS sözdizimi.
//   node build/validate.js
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
let errors = 0;
const fail = (m) => { console.error("✗ " + m); errors++; };
const ok = (m) => console.log("✓ " + m);

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

// 1) Diller — en referans, hepsi aynı anahtarlara sahip mi?
const localesDir = path.join(ROOT, "_locales");
const locales = fs.readdirSync(localesDir);
const en = readJson(path.join(localesDir, "en", "messages.json"));
const enKeys = Object.keys(en).sort();
for (const loc of locales) {
  const mp = path.join(localesDir, loc, "messages.json");
  let m;
  try { m = readJson(mp); } catch (e) { fail(`${loc}/messages.json geçersiz JSON: ${e.message}`); continue; }
  const keys = Object.keys(m).sort();
  const missing = enKeys.filter((k) => !keys.includes(k));
  const extra = keys.filter((k) => !enKeys.includes(k));
  const noMsg = keys.filter((k) => !m[k] || typeof m[k].message !== "string" || !m[k].message.length);
  if (missing.length) fail(`${loc}: eksik anahtar(lar): ${missing.join(", ")}`);
  if (extra.length) fail(`${loc}: fazla anahtar(lar): ${extra.join(", ")}`);
  if (noMsg.length) fail(`${loc}: boş/hatalı message: ${noMsg.join(", ")}`);
  if (!missing.length && !extra.length && !noMsg.length) ok(`${loc}: ${keys.length} anahtar`);
}

// 2) Manifestler — geçerli JSON + __MSG__ anahtarları en içinde var mı?
const manifests = [
  path.join(ROOT, "manifest.json"),
  path.join(ROOT, "build", "manifest.firefox.json")
];
for (const mf of manifests) {
  let raw;
  try { raw = fs.readFileSync(mf, "utf8"); readJson(mf); } catch (e) { fail(`${path.basename(mf)} geçersiz JSON: ${e.message}`); continue; }
  const used = [...raw.matchAll(/__MSG_([A-Za-z0-9_]+)__/g)].map((m) => m[1]);
  const miss = used.filter((k) => !(k in en));
  if (miss.length) fail(`${path.basename(mf)}: en'de olmayan __MSG__: ${miss.join(", ")}`);
  else ok(`${path.basename(mf)}: JSON + __MSG__ anahtarları tamam`);
}

// 3) HTML data-i18n + JS getMessage/t() anahtarları en içinde mi?
function scanKeys() {
  const set = new Set();
  for (const f of ["options.html", "popup.html"]) {
    const html = fs.readFileSync(path.join(ROOT, f), "utf8");
    for (const m of html.matchAll(/data-i18n="([^"]+)"/g)) set.add(m[1]);
  }
  for (const f of ["options.js", "popup.js"]) {
    const js = fs.readFileSync(path.join(ROOT, f), "utf8");
    for (const m of js.matchAll(/(?:getMessage|[^A-Za-z]t)\(\s*"([A-Za-z0-9_]+)"\s*\)/g)) set.add(m[1]);
  }
  return [...set];
}
const usedKeys = scanKeys();
const missKeys = usedKeys.filter((k) => !(k in en) && !k.startsWith("@@"));
if (missKeys.length) fail(`UI'da kullanılan ama en'de olmayan anahtarlar: ${missKeys.join(", ")}`);
else ok(`UI i18n anahtarları (${usedKeys.length}) en içinde mevcut`);

// 4) act_* türetmeleri (popup global durum) en içinde mi?
for (const n of ["play-pause", "next", "previous", "mute"]) {
  const key = "act_" + n.replace(/-([a-z])/g, (_, x) => x.toUpperCase());
  if (!(key in en)) fail(`türetilen anahtar yok: ${key}`);
}

// 5) JS sözdizimi
for (const f of ["background.js", "content.js", "defaults.js", "options.js", "popup.js", "build/build.js", "build/validate.js"]) {
  try {
    execSync(`node --check "${path.join(ROOT, f)}"`, { stdio: "pipe" });
    ok(`syntax: ${f}`);
  } catch (e) {
    fail(`syntax HATASI ${f}: ${e.stderr ? e.stderr.toString() : e.message}`);
  }
}

console.log(errors ? `\nBAŞARISIZ: ${errors} hata` : "\nHEPSİ GEÇTİ ✓");
process.exit(errors ? 1 : 0);
