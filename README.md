# HARFLER · Ses Avı

MEB Türkiye Yüzyılı Maarif Modeli 1. sınıf ilk okuma-yazma **ses gruplarıyla** çalışan,
tarayıcıda oynanan sesli bir oyun. Çocuk sesi duyar, akılda tutar, doğru harfe dokunur;
öğretmen/veli tek dosyalık çevrimdışı sürümü indirip akıllı tahtada ya da internetsiz
bilgisayarda açabilir.

Sesler cihazın kendi Türkçe konuşma motoruyla (Web Speech API) okunur, efekt sesleri
WebAudio ile üretilir: **hiçbir ses dosyası indirilmez, sunucu gerekmez.**

## Çalıştırma

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # dist/ + dist/standalone.html
npm run preview    # derlenmiş sürümü yerelde dene
npm test           # birim + arayüz testleri (vitest + jsdom)
npm run typecheck  # tsc --noEmit
npm run check      # typecheck + test + build + tek dosya sağlaması
```

## Bölümler

| Bölüm | Ne yapar |
| --- | --- |
| **Ses Blokları** | Grubun harfleri veriliş sırasıyla; dokun, sesi ve örnek kelimeyi dinle. "Sırayla Dinle" hepsini tek tek okur. |
| **Ses Avı** | Ana oyun: 10 tur. Ses okunur → 5 saniye akılda tut → doğru harfe dokun. Hızlı cevap +5, 3+ seri +5. |
| **Etkinlik Merkezi** | 13 ayrı oyun (harf sırası, kelime avı, baş/son harf, hece say, kelimeyi diz, hafıza kartları, ses nerede? …). |
| **Kelime Bahçesi** | Grubun harfleriyle okunabilen kelimeler ve ilk cümleler. |
| **İndir** | Oyunun tamamını tek `harfler-ses-avi.html` dosyası olarak indirir. |

Beş ses grubu: **ANETİL · OKURIM · ÜSÖYDZ · ÇBGCŞ · PHVĞFJ** (29 ses). Grup değiştirince
tüm etkinlikler, kelimeler ve rekorlar o gruba uyar.

## Puanlama

Tek yerden yönetilir: [`src/game/scoring.ts`](src/game/scoring.ts).

- Doğru cevap: **+10**
- Hızlı cevap (Ses Avı ≤ 3 sn, etkinlikler ≤ 4 sn): **+5**
- 3 ve üzeri seri: **+5**
- Yanlış cevap puan götürmez; seriyi sıfırlar.

Puanlar, rekorlar ve yıldızlar `localStorage`'da grup bazında saklanır
(`ses-avi-rekor-*`, `etk-puan-*`, `etk-yildiz-*`, `ses-avi-sessiz`).

## Kod yapısı

```
src/
  game/
    letters.ts        ses grubu verisi (29 ses, kelimeler, cümleler)
    scoring.ts        puan/yıldız kuralları — saf fonksiyonlar
    speech.ts         Türkçe TTS sarmalayıcısı (iptal/kesinti güvenli)
    sfx.ts            WebAudio ile üretilen efekt sesleri
    useSoundGame.ts   Ses Avı tur makinesi
  activities/
    shared.tsx        tur/puan motoru (useEngine) + ortak parçalar
    activities.tsx    13 etkinlik ve etkinlik merkezi
  components/         LetterTile, CountdownRing, Confetti, Icons
  App.tsx             sayfa, gezinme, indirme
```

### Tek dosyalık indirme nasıl çalışır

`vite.config.js` içindeki `harfler:standalone-html` eklentisi uygulamanın gerçek üretim
derlemesini (JS + CSS) tek HTML'e gömer:

- `npm run build` → `dist/standalone.html`
- geliştirme sunucusunda → `GET /standalone.html` isteği aynı dosyayı anında üretir
  (kaynak değişince önbellek geçersiz olur). Böylece İNDİR düğmesi geliştirme ortamında
  da çalışan bir dosya verir.

## Testler

`npm test` — 64 test: puan kuralları, ses grubu verisinin bütünlüğü, hece/harf sayacı,
tur motoru, `useSoundGame` tur akışı (sahte zamanlayıcı ve taklit ses motoruyla),
arayüzden oynanan tam tur ve indirilen tek dosyanın gerçekten render olduğuna dair sağlama.

Konuşma sentezi taklidi `src/test/setup.ts` içindedir; gerçek Chrome gibi `cancel()`
çağrısında `onend` tetikler, böylece oyun durdurma sırasındaki yarışlar da test edilir.
