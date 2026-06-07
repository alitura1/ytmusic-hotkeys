// Chrome ve Firefox paketlerini üretir:
//   node build/build.js
// Çıktı: dist/chrome/, dist/firefox/ ve dist/ytmusic-hotkeys-{chrome,firefox}.zip
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const DIST = path.join(ROOT, "dist");

// Her iki tarayıcıda ortak (manifest hariç) dosyalar
const SHARED = [
  "background.js",
  "content.js",
  "defaults.js",
  "options.html",
  "options.js",
  "options.css",
  "popup.html",
  "popup.js",
  "popup.css",
  "_locales",
  "icons"
];

function clean(p) {
  fs.rmSync(p, { recursive: true, force: true });
  fs.mkdirSync(p, { recursive: true });
}

// fs.cpSync'in özyinelemeli dizin kopyası bazı Windows kurulumlarında EIO veriyor;
// manuel özyineleme ile kopyalıyoruz.
function copyRecursive(src, dest) {
  if (fs.statSync(src).isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function copyShared(destDir) {
  for (const item of SHARED) {
    const src = path.join(ROOT, item);
    if (!fs.existsSync(src)) throw new Error("Eksik dosya: " + item);
    copyRecursive(src, path.join(destDir, item));
  }
}

function zipDir(srcDir, outFile) {
  fs.rmSync(outFile, { force: true });
  if (process.platform === "win32") {
    execSync(
      `powershell -NoProfile -Command "Compress-Archive -Path '${srcDir}\\*' -DestinationPath '${outFile}' -Force"`,
      { stdio: "inherit" }
    );
  } else {
    execSync(`cd "${srcDir}" && zip -r -q "${outFile}" .`, { stdio: "inherit" });
  }
}

function buildTarget(name, manifestSrc) {
  const dir = path.join(DIST, name);
  clean(dir);
  copyShared(dir);
  fs.copyFileSync(manifestSrc, path.join(dir, "manifest.json"));
  const zip = path.join(DIST, `ytmusic-hotkeys-${name}.zip`);
  zipDir(dir, zip);
  console.log(`✓ ${name}: ${dir}  +  ${path.basename(zip)}`);
}

fs.mkdirSync(DIST, { recursive: true });
buildTarget("chrome", path.join(ROOT, "manifest.json"));
buildTarget("firefox", path.join(__dirname, "manifest.firefox.json"));
console.log("Build tamamlandı.");
