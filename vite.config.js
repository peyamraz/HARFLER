import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { writeFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const ROOT = dirname(fileURLToPath(import.meta.url));
const STANDALONE = "standalone.html";

/**
 * Uygulamanın tamamını (JS + CSS) tek bir HTML dosyasına gömer.
 * Böylece "İNDİR" düğmesi her ortamda ÇALIŞAN bir dosya verir:
 * geliştirme sunucusunda ham TypeScript yerine gerçek derleme gömülür.
 */
async function buildStandaloneHtml() {
  const { build } = await import("vite");
  // Geliştirme sunucusu NODE_ENV=development ile çalışır; bu değer içeri
  // sızarsa dosyaya React'in geliştirme sürümü ve jsxDEV çalışma zamanı
  // girer (~50 KB fazlalık). İç derleme boyunca production'a sabitlenir.
  const prevEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  let out;
  try {
    out = await build({
      root: ROOT,
      configFile: false,
      logLevel: "warn",
      mode: "production",
      define: { "process.env.NODE_ENV": JSON.stringify("production") },
      plugins: [react(), tailwindcss()],
      build: {
        write: false,
        cssCodeSplit: false,
        assetsInlineLimit: 100_000_000,
        reportCompressedSize: false,
        rollupOptions: {
          output: {
            inlineDynamicImports: true,
            entryFileNames: "assets/app.js",
            assetFileNames: "assets/app.[ext]",
          },
        },
      },
    });
  } finally {
    if (prevEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevEnv;
  }

  const outputs = (Array.isArray(out) ? out : [out]).flatMap((o) => o.output);
  const find = (name) => outputs.find((a) => a.fileName === name || a.fileName.endsWith(`/${name}`));

  const htmlAsset = find("index.html");
  if (!htmlAsset || htmlAsset.type !== "asset") {
    throw new Error("standalone: index.html bulunamadı");
  }
  const decode = (v) => (typeof v === "string" ? v : Buffer.from(v).toString("utf8"));
  let html = decode(htmlAsset.source);

  const textOf = (name) => {
    const a = find(name);
    if (!a) throw new Error(`standalone: ${name} derlemede yok`);
    return a.type === "asset" ? decode(a.source) : a.code;
  };

  // Harici betiği ve stili dosyanın içine taşı.
  // Betik KLASİK betik olarak <body> sonuna yazılır: file:// üzerinde
  // modül betikler CORS'a takılabiliyor, klasik betik her yerde çalışır.
  // (Demet ESM sözdizimi içermez; içerirse bu adım hata fırlatır.)
  let jsCode = "";
  html = html.replace(/<script[^>]*\ssrc="([^"]+)"[^>]*>\s*<\/script>/g, (_m, src) => {
    jsCode = textOf(src.split("/").pop()).replace(/<\/script/gi, "<\\/script");
    return "";
  });
  if (!jsCode) throw new Error("standalone: gömülecek betik bulunamadı");

  html = html.replace(
    /<link[^>]*\srel="stylesheet"[^>]*\shref="([^"]+)"[^>]*>/g,
    (_m, href) => `<style>\n${textOf(href.split("/").pop())}\n</style>`,
  );
  html = html.replace(/<link[^>]*\srel="modulepreload"[^>]*>/g, "");

  if (!/<\/body>/i.test(html)) throw new Error("standalone: </body> bulunamadı");
  // DEĞİŞTİRME FONKSİYONLA yapılır: düz metin verilirse JS içindeki "$&" gibi
  // diziler replace kalıpları sanılıp HTML parçalarıyla değiştirilir (dosya bozulur).
  html = html.replace(/<\/body>/i, () => `<script>\n${jsCode}\n</script>\n</body>`);

  // NOT: Buraya <base href="./" /> EKLENMEMELİ. Belge file:// üzerinde bir
  // klasörde dururken taban URL klasöre çözülür ve menüdeki "#etkinlikler"
  // gibi çapa bağlantıları belgenin kendisine değil klasöre gider: tarayıcı
  // uygulamadan çıkar ve bölüm hiç açılmaz. Göreceli kaynak zaten yok
  // (CSS/JS gömülü, fontlar mutlak https), dolayısıyla taban etiketi gereksiz.

  return html;
}

/** Geliştirme sunucusunda /standalone.html isteğini karşılar (önbellekli). */
function standalonePlugin() {
  let cache = null;
  let pending = null;
  let serving = false;

  const get = () => {
    if (cache) return Promise.resolve(cache);
    if (!pending) {
      pending = buildStandaloneHtml()
        .then((html) => {
          cache = html;
          return html;
        })
        .finally(() => {
          pending = null;
        });
    }
    return pending;
  };

  return {
    name: "harfler:standalone-html",
    configureServer(server) {
      serving = true;
      const invalidate = (file) => {
        if (!file) return;
        const f = file.replace(/\\/g, "/");
        if (f.includes("/src/") || f.endsWith("/index.html")) cache = null;
      };
      server.watcher.on("change", invalidate);
      server.watcher.on("add", invalidate);

      server.middlewares.use(async (req, res, next) => {
        const path = (req.url || "").split("?")[0];
        if (path !== `/${STANDALONE}` && !path.endsWith(`/${STANDALONE}`)) return next();
        try {
          const html = await get();
          res.statusCode = 200;
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.setHeader("Cache-Control", "no-store");
          res.end(html);
        } catch (err) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.end(`Tek dosya hazırlanamadı: ${err && err.message ? err.message : err}`);
        }
      });
    },
    closeBundle() {
      // geliştirme sunucusu kapanırken de bu kanca çağrılır; orada derleme yapma
      if (serving) return;
      return buildStandaloneHtml().then((html) => {
        writeFileSync(resolve(ROOT, "dist", STANDALONE), html, "utf8");
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), standalonePlugin()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/__tests__/**/*.test.{ts,tsx}"],
    css: false,
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    // önizleme/derleme ortamlarındaki dinamik ana makine adlarına izin ver
    allowedHosts: true,
    hmr: {
      port: 3000,
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    allowedHosts: true,
  },
});
