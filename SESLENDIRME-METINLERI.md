# Seslendirme metinleri — tam liste

Uygulamanın söylediği **her** metin. Örnekler ANETİL grubundan; diğer gruplarda
aynı kalıp o grubun harf/kelimeleriyle doldurulur.

Kural: bir dokunuş = bir bilgi, kısa cümle (uzun cümleler cihaz ses motorunda kesiliyor).

## A · Harf blokları (ana sayfa)

| # | Ne zaman | Söylenen |
|---|---|---|
| A1 | Harfe dokununca | sadece ses: `a` · `ne` · `e` · `te` · `i` · `le` |
| A2 | Harfin altındaki kelimeye dokununca | sadece kelime: `arı` · `nane` · `ete` … |
| A3 | "Sırayla Dinle" düğmesi | ses + kelime: `ne. nane` |
| A4 | "Örnek harfi değiştir" | söylem yok, yalnızca ekran değişir |
| A5 | "Sesi dene" düğmesi | `Ses denemesi. A, anne, nane, anneanne.` |

## B · Ses Avı (ana oyun)

| # | Ne zaman | Söylenen |
|---|---|---|
| B1 | Her tur başında | sadece ses: `te` (öncesinde zil çalar) |
| B2 | Doğru harfe dokununca | sadece ses: `te` |
| B3 | Yanlış harfe dokununca | `Olmadı, tekrar dene!` |
| B4 | Süre dolunca | `Doğru ses: te` |

## C · Kelime Bahçesi

| # | Ne zaman | Söylenen |
|---|---|---|
| C1 | Kelimeye dokununca | sadece kelime: `anne` · `lale` · `ninni` … |
| C2 | Cümleye dokununca | `Anne nane al.` · `Ata et ye.` · `Nil inat etme.` · `Lale al, ata ver.` |

## D · 13 etkinlik

| # | Etkinlik | Tur sayısı | Söylenenler |
|---|---|---|---|
| D1 | Harf Sırası | 6 | Tur başı: `Harflere öğrenme sırasıyla dokun.` — her doğru dokunuşta harf sesi: `a`, `ne`, `te` … |
| D2 | Kelime Avı | 8 | Sadece kelime: `ilan`, `nine`, `net`, `an`, `ete`, `anne` |
| D3 | Baş Harf | 8 | Kelime: `ata` — doğru cevapta: `ata. a sesiyle başlar.` |
| D4 | Son Harf | 8 | Kelime: `an` — doğru cevapta: `an. ne sesiyle biter.` |
| D5 | Kelime mi, Uydurma mı? | 8 | Sadece kelime: `ninni`, `nal`, `tat` (uydurmalar: `tııllin`, `tatınet`) |
| D6 | Hece Say | 8 | Sadece kelime: `net`, `nine`, `anneanne`, `lale` |
| D7 | Harf Say | 8 | Sadece kelime: `net`, `tat`, `nane`, `tel` |
| D8 | Harf Izgarası | 5 | Tur başı: `Izgaradaki bütün A harflerini bul!` — tekrar dinle: `A harflerini bul` |
| D9 | Kelimeyi Diz | 6 | Sadece kelime: `lale`, `nane` |
| D10 | Harfi Tamamla | 8 | Sadece kelime: `ninni`, `lale`, `ete`, `tatlı` |
| D11 | Cümlede Kelime | 6 | Cümle: `Nil inat etme.` · `Anne nane al.` · `Lale al, ata ver.` · `Ata et ye.` |
| D12 | Hafıza Kartları | 3 | Tur başı: `Kartları çevir, eş harfleri bul!` — her açılan kartta harf sesi: `a`, `te`, `ne` |
| D13 | Ses Nerede? | 8 | Sadece kelime: `ilan`, `net`, `anne`, `nal` |

## E · Her turda tekrarlanan talimatlar (kısaltma adayı)

Bu üçü her turda baştan söyleniyor; çocuk kuralı bir kez öğrendikten sonra
gereksiz olabilir:

- **D1** `Harflere öğrenme sırasıyla dokun.` → 6 turda 6 kez
- **D8** `Izgaradaki bütün A harflerini bul!` → 5 turda 5 kez
- **D12** `Kartları çevir, eş harfleri bul!` → 3 turda 3 kez

## F · Bilinen sınır

Bir söylem başladıktan sonraki **90 ms** içinde başka bir dokunuş olursa ilk
söylem hiç konuşulmaz (Chrome'un iptal/yeniden başlatma yarışına karşı kasıtlı
bekleme). Yani çocuk tur talimatı başlarken hemen bir karta dokunursa talimatı
duymaz; talimat ekranda yazılı olarak durur.
