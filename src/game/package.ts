import LAUNCHER_BAT from "../../packaging/HARFLER-Ses-Avi.bat?raw";
import README_TXT from "../../packaging/OKU-BENI.txt?raw";
import { makeZipFromText } from "./zip";

/** İndirilen paketteki dosya adları. BAT, oyun dosyasını bu adla arar. */
export const GAME_FILE = "HARFLER-Ses-Avi.html";
export const LAUNCHER_FILE = "HARFLER-Ses-Avi.bat";
export const README_FILE = "OKU-BENI.txt";
export const PACKAGE_NAME = "HARFLER-Ses-Avi.zip";

/** Windows Not Defteri ve CMD için CRLF; metin dosyasına BOM eklenir. */
const crlf = (t: string) => t.replace(/\r?\n/g, "\r\n");

/**
 * İndirilebilir paketi üretir:
 * oyun dosyası + çift tıklanınca oyunu açan .bat + Türkçe açıklama.
 */
export function buildPackage(html: string): Uint8Array<ArrayBuffer> {
  return makeZipFromText([
    { name: GAME_FILE, text: html },
    { name: LAUNCHER_FILE, text: crlf(LAUNCHER_BAT) },
    { name: README_FILE, text: `\uFEFF${crlf(README_TXT)}` },
  ]);
}
