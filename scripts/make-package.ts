/**
 * Oyunu tek ZIP paketine toplar: oyun dosyası + .bat başlatıcı + açıklama.
 * Kullanım:  npm run pack   (önce derleme yapar)
 * Çıktı:     HARFLER-Ses-Avi.zip
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { GAME_FILE, PACKAGE_NAME, buildPackage } from "../src/game/package";

const dist = resolve(process.cwd(), "dist", "standalone.html");
let html: string;
try {
  html = readFileSync(dist, "utf8");
} catch {
  console.error(`Bulunamadı: ${dist}\nÖnce 'npm run build' çalıştırın.`);
  process.exit(1);
}

if (!/<div id="root"/.test(html) || !/<script/.test(html)) {
  console.error("standalone.html eksik görünüyor, paket üretilmedi.");
  process.exit(1);
}

const zip = buildPackage(html);
const out = resolve(process.cwd(), PACKAGE_NAME);
writeFileSync(out, zip);
console.log(`Hazır: ${out} (${zip.length} bayt, içinde ${GAME_FILE} + .bat + OKU-BENI.txt)`);
