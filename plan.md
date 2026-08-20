# ANETİL Ses Avı — "Ön İzleme Açılmıyor" Sorununun Çözüm Planı

## Kök Neden (TESPİT EDİLDİ)

Sorun uygulamanın çökmesi değil; **hata kartının hiç kapanmamasıydı.**

`index.html` içindeki açılış hata kartı `#boot-error`, `hidden` niteliğiyle gizli
başlıyor:

```html
<div id="boot-error" hidden> ... </div>
```

Ancak aynı dosyadaki CSS kuralı:

```css
#boot-error { position: fixed; inset: 0; z-index: 9999; display: flex; ... }
```

tarayıcının `[hidden] { display: none }` (user-agent) kuralını **geçersiz kılıyor**,
çünkü yazar (author) stilleri UA stillerinden öncelikli. Sonuç:

- Kart, sayfa yüklenir yüklenmez z-index 9999 ile **ekranın tamamını kaplıyor**.
- Uygulama aslında altta çalışıyor, ama kullanıcı yalnızca
  "Oyun yüklenirken bir sorun oldu" kartını görüyor → "ön izleme açılmıyor".
- `#boot-splash` da aynı potansiyele sahipti.
- Bu, kullanıcının "HALA AYNI" deme sebebini de açıklıyor: hata kartı hep aynıydı.

## Uygulanan Düzeltme

`index.html` CSS bloğuna şu kural eklendi (kalıcı çözüm):

```css
#boot-error[hidden],
#boot-splash[hidden] {
  display: none !important;
}
```

Ayrıca açılış aşamalarını izleyen `window.__bootStage` bayrağı eklendi.

## Kalan Adımlar (Onay Sonrası Uygulanacak)

1. `src/main.tsx` içine aşama bayrakları ekle:
   - createRoot öncesi: `window.__bootStage = "main-evaluated"`
   - render sonrası: `window.__bootStage = "rendered"`
2. `index.html` sonuna 7 sn'lik bekçi ekle: `#root` hâlâ boşsa tanı kartında
   aşamayı + yakalanan hataları göster (yalnızca sigorta; normal akışı etkilemez).
3. `npm run build` ile derle ve dist çıktısını doğrula.

## Doğrulama

- Ön izleme açıldığında hata kartı görünmemeli, doğrudan oyun gelmeli.
- Gerçek bir hata oluşursa (betik 404 vb.) kart doğru şekilde açılmalı
  (hidden kaldırıldığında görünür olmalı — `!important` kuralı iki yönlü çalışır:
  hidden varken gizler, yokken gösterir).

## Not: Önceki Sağlamlık İyileştirmeleri Yerinde

- `speech.ts` ve `sfx.ts` tamamen try/catch korumalı (kısıtlı iframe'de çökmez).
- Tüm `localStorage` çağrıları güvenli sarmalayıcılarda.
- Kök düzeyde `AppBoundary` + etkinlik düzeyinde `ActivityBoundary` mevcut.
- Google Fonts engellemeyen yöntemle yükleniyor (ağ yoksa yedek font).
