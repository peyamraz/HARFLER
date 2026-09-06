# HARFLER · Ses Avı

MEB Türkiye Yüzyılı **Maarif Modeli** 1. sınıf ilk okuma-yazma **ses gruplarıyla** çalışan,
tarayıcıda oynanan sesli bir oyun. Çocuk sesi duyar, aklında tutar, doğru harfe dokunur.

Sesler cihazın kendi Türkçe konuşma motoruyla (Web Speech API) okunur, efekt sesleri
WebAudio ile üretilir: **hiçbir ses dosyası indirilmez, sunucu gerekmez, kurulum yok.**
Tek dosyalık çevrimdışı sürüm ZIP olarak iner; içindeki `.bat`'e çift tıklayınca oyun
açılır — sınıfta akıllı tahtada, evde internetsiz bilgisayarda çalışır.

## Hızlı başlangıç

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # dist/ + dist/standalone.html (tek dosya)
npm run preview    # derlenmiş sürümü yerelde dene
npm test           # 107 test (vitest + jsdom)
npm run typecheck  # tsc --noEmit
npm run pack       # HARFLER-Ses-Avi.zip üretir
npm run check      # typecheck + build + testler + paket (tek komutla hepsi)
```

> `npm run check` bilerek **build → test** sırasıyla çalışır: tek dosya testleri
> `dist/standalone.html`'i okuduğu için önce derleme gerekir.

## Bölümler

| Bölüm | Ne yapar |
| --- | --- |
| **Ses Blokları** | Grubun harfleri veriliş sırasıyla. Harfe dokun → yalnızca sesi (`a`), altındaki kelimeye dokun → yalnızca kelime (`arı`). "Sırayla Dinle" hepsini tek tek okur. |
| **Ses Avı** | Ana oyun, 10 tur. Ses okunur → 5 saniye akılda tut → doğru harfe dokun. |
| **Etkinlik Merkezi** | 13 ayrı oyun, toplam 90 tur. Her biri ayrı bir beceriyi çalıştırır. |
| **Kelime Bahçesi** | Grubun harfleriyle okunabilen kelimeler ve ilk cümleler. |
| **İndir** | `HARFLER-Ses-Avi.zip`: oyun dosyası + **çift tıklayınca açan .bat** + Türkçe açıklama. |

Beş ses grubu: **ANETİL · OKURIM · ÜSÖYDZ · ÇBGCŞ · PHVĞFJ** — toplam **29 ses**.
Grup değiştirince etkinlikler, kelimeler ve rekorlar o gruba uyar.

### 13 etkinlik

| Etkinlik | Beceri | Tur |
| --- | --- | --- |
| Harf Sırası | Sıralama | 6 |
| Kelime Avı | Dinleme | 8 |
| Baş Harf | Ses–Harf | 8 |
| Son Harf | Ses–Harf | 8 |
| Kelime mi, Uydurma mı? | Okuma | 8 |
| Hece Say | Heceleme | 8 |
| Harf Say | Sayma | 8 |
| Harf Izgarası | Dikkat | 5 |
| Kelimeyi Diz | Yazma | 6 |
| Harfi Tamamla | Okuma | 8 |
| Cümlede Kelime | Dinleme | 6 |
| Hafıza Kartları | Hafıza | 3 |
| Ses Nerede? | Ses–Harf | 8 |

Uygulamanın söylediği **her metnin listesi**: [`SESLENDIRME-METINLERI.md`](SESLENDIRME-METINLERI.md).

## Puanlama

Tek yerden yönetilir: [`src/game/scoring.ts`](src/game/scoring.ts).

- Doğru cevap: **+10**
- Hızlı cevap (Ses Avı ≤ 3 sn, etkinlikler ≤ 4 sn): **+5**
- 3 ve üzeri seri: **+5**
- Yanlış cevap puan götürmez; seriyi sıfırlar.

Puanlar, rekorlar, yıldızlar, sessize alma ve ses tercihi `localStorage`'da saklanır
(`ses-avi-rekor-*`, `etk-puan-*`, `etk-yildiz-*`, `ses-avi-sessiz`, `harfler-ses-tercihi`).
Depolama kapalıysa (ör. bazı `file://` durumları) hepsi oturumluk tutulur — hiçbir erişim
`try/catch` dışında değildir.

## Ses

### Söylem ilkeleri

Konuşmalar **kısa ve tek işli**dir; uzun cümleler cihaz ses motorlarında kesiliyor ve
çocuk söylenenin sonunu duyamıyor.

- **Bir dokunuş = bir bilgi.** Harfe dokununca yalnızca ses, kelimeye dokununca yalnızca
  kelime okunur.
- **Komut/meta kelime söylenmez.** `örnek:`, `Kulaklar hazır mı?`, `Sıra 1. seste.`,
  `Dinle:`, `Dinle ve tekrar et:` gibi girişler yok. Tur söylemi doğrudan harfin sesi
  (`te`); öncesindeki zil zaten "dinle" demek.
- **Aynı kelime bir söylemde iki kez geçmez** (`arı. arı, a sesiyle başlar.` →
  `arı. a sesiyle başlar.`).
- **Her söylem 70 karakteri aşmaz.**

Bu üç kural `scan.test.tsx` tarafından 65 kombinasyonda otomatik denetlenir; tur söylemini
`useSoundGame.test.tsx` birebir kilitler.

### Ses seçimi ve kalite

Cihazda birden çok Türkçe ses olabiliyor ve kaliteleri çok farklı. `voiceScore` sesleri
sıralayıp en anlaşılır olanı seçer:

| Ölçüt | Puan |
| --- | --- |
| `tr-TR` tam eşleşme | +4 |
| Google sesi | +6 |
| `Natural` / `Neural` / `Online` / `Premium` | +5 |
| Çevrimiçi motor (`localService: false`) | +3 |
| Varsayılan ses | +1 |
| SAPI / Microsoft (eski Windows sesi) | −2 |

Öğretmen başlıktaki **Ses** listesinden elle de seçebilir; seçim anında test cümlesi
okunur, tercih `localStorage`'da saklanır. **Türkçe ses yoksa `voice` alanı boş bırakılır**
— Türkçe olmayan bir ses Türkçe metne verilirse kelimeler yanlış telaffuzla okunur; bu
durumda arayüz kurulum adımlarını gösterir.

Güvenlik önlemleri:

- Chrome `cancel()` sonrası ilk `speak()` çağrısını bazen sessizce yutar. Konuşma 300 ms
  içinde başlamazsa **bir kez** daha denenir.
- `onend` hiç gelmezse bir bekçi zamanlayıcı akışı ilerletir (tur takılı kalmaz).
- Konuşurken `resume()` çağrılmaz (bazı tarayıcılarda cümleyi başa sarıyor); yalnızca
  gerçekten durakladıysa devam ettirilir.

## İndirme paketi

`vite.config.js` içindeki `harfler:standalone-html` eklentisi uygulamanın gerçek üretim
derlemesini (JS + CSS) tek HTML'e gömer:

- `npm run build` → `dist/standalone.html`
- geliştirme sunucusunda `GET /standalone.html` aynı dosyayı anında üretir; böylece İNDİR
  düğmesi geliştirme ortamında da çalışan bir dosya verir.
- Betik **klasik betik** olarak `#root`'tan sonra yazılır: `file://` üzerinde modül betikler
  CORS'a takılabiliyor, klasik betik çift tıklayınca her yerde çalışır.
- HTML'e **`<base href="./">` eklenmez.** Belge `file://` üzerinde bir klasörde dururken
  taban URL klasöre çözülür; menüdeki `#etkinlikler` gibi çapa bağlantıları belgenin
  kendisine değil klasöre gider, tarayıcı uygulamadan çıkar ve bölüm hiç açılmaz. Göreceli
  kaynak zaten yok (CSS/JS gömülü, fontlar mutlak `https`), dolayısıyla taban etiketi
  gereksiz. `standalone.test.ts` bunu kilitler.

ZIP üç dosya içerir (`src/game/package.ts`):

| Dosya | Ne işe yarar |
| --- | --- |
| `HARFLER-Ses-Avi.html` | Oyunun kendisi. Çift tıklayınca açılır, internet gerekmez. |
| `HARFLER-Ses-Avi.bat` | Windows başlatıcı: oyunu varsayılan tarayıcıda açar. Oyun dosyasını bulamazsa anlaşılır hata verir. |
| `OKU-BENI.txt` | Türkçe kurulum/kullanım notu (Not Defteri için BOM'lu UTF-8). |

BAT dosyası bilerek **salt ASCII** ve **CRLF** satır sonuyla yazılır: CMD, UTF-8 Türkçe
karakterleri yanlış yorumlayabiliyor. ZIP, `src/game/zip.ts` içindeki bağımlılıksız
üreticiyle hazırlanır (CRC-32 standart kontrol değeri `0xCBF43926` ile doğrulanır) ve
`unzip` / Python `zipfile` ile test edilir.

### İndirme düğmesi

Düğme dosyayı hazırlayıp hem otomatik indirmeyi tetikler hem **tıklanabilir bir bağlantı**
gösterir. Sayfa bir çerçeve (iframe) içindeyse — örneğin canlı önizleme — tarayıcı
indirmeyi sessizce engeller; uygulama bunu `window.self !== window.top` ile anlar ve
"sağ tıkla → farklı kaydet" uyarısını gösterir. Düğme asla emin olmadığı bir başarı
iddia etmez (`İNDİRİLDİ!` değil, `DOSYA HAZIR`).

## Kod yapısı

```
src/
  game/
    letters.ts        ses grubu verisi (5 grup, 29 ses, kelimeler, cümleler)
    scoring.ts        puan/yıldız kuralları — saf fonksiyonlar
    speech.ts         Türkçe TTS sarmalayıcısı (ses seçimi, iptal/kesinti güvenli)
    sfx.ts            WebAudio ile üretilen efekt sesleri (tümü try/catch içinde)
    useSoundGame.ts   Ses Avı tur makinesi
    zip.ts            bağımlılıksız ZIP üreticisi (CRC-32)
    package.ts        ZIP içeriği: oyun + .bat + açıklama
  activities/
    shared.tsx        tur/puan motoru (useEngine) + ortak parçalar
    activities.tsx    13 etkinlik, etkinlik merkezi, hata sınırı
  components/         LetterTile, CountdownRing, Confetti, Icons
  App.tsx             sayfa, gezinme, ses ayarları, indirme
packaging/            .bat ve OKU-BENI.txt kaynakları
scripts/make-package.ts  dist/standalone.html → ZIP
```

Hata dayanıklılığı: hem uygulama hem her etkinlik bir **hata sınırı** içindedir. Sınır
yakaladığında "Tekrar Dene" düğmesi taze bir örnek kurar (aynı etkinliğe tekrar girince
anahtar sayacı arttığı için eski hata kalıcı olmaz).

## Testler

`npm test` — **12 dosya, 107 test**: puan kuralları, ses grubu verisinin bütünlüğü,
hece/harf sayacı, tur motoru, `useSoundGame` tur akışı, konuşma katmanı (ses seçimi,
yabancı ses atanmaması, yutulan konuşmanın tekrar denenmesi), ZIP üreticisi, indirme
akışının uçtan uca sağlaması ve tek dosyanın gerçekten çalışıp render olduğu.

Ek güvenceler:

- **5 grup × 13 etkinlik = 65 kombinasyon** taranır: çökme, hata ekranı ve bozuk söylem
  (`undefined`, `NaN`, `[object`) yoktur.
- **13 kartın hepsi 5 grupta da** karttan açılır, geri dönülüp tekrar girilir.
- Sıralı/hafızalı dört etkinlik (Harf Sırası, Harf Izgarası, Kelimeyi Diz, Hafıza Kartları)
  gerçek çözücülerle **sonuna kadar oynanıp** tamamlanabildikleri kanıtlanır.

Konuşma sentezi taklidi `src/test/setup.ts` içindedir: gerçek Chrome gibi `cancel()`
çağrısında `onend` tetikler, böylece oyun durdurma sırasındaki yarışlar da test edilir.

## Bilinen sınırlar

- **Yazı tipleri** ilk açılışta Google Fonts'tan gelir; çevrimdışıysa yedek sistem yazı
  tipi kullanılır. Oyun, sesler ve puanlar tamamen çevrimdışı çalışır.
- **Ses kalitesi cihaza bağlıdır.** Uygulama en iyi Türkçe sesi seçer ama cihazda Türkçe
  ses yoksa kurulum gerekir (arayüzde adımları yazar).
- **Canlı önizleme çerçevesinde indirme** tarayıcı tarafından engellenir; dosyayı
  bağlantıdan ya da doğrudan depodan/sohbetten almak gerekir.
- Testler jsdom'da çalışır; gerçek tarayıcıda sesin kulağa nasıl geldiği ve `.bat`'in
  Windows'ta davranışı otomatik doğrulanamaz.

---

**Geliştirici: Mehmet Reşat Raz** — Ücretsiz indir ve kullan. Ticari amaçla kullanılamaz.
