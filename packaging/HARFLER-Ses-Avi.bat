@echo off
rem ============================================================
rem  HARFLER Ses Avi - baslatici
rem  Cift tiklayin: oyun varsayilan tarayicida hemen acilir.
rem  (Bu dosya ASCII olarak yazildi; Turkce karakterler CMD'de
rem   bozulmasin diye kullanilmadi.)
rem ============================================================
setlocal EnableExtensions
title HARFLER Ses Avi

set "HERE=%~dp0"
set "GAME=%HERE%HARFLER-Ses-Avi.html"

if not exist "%GAME%" (
  echo.
  echo  HATA: HARFLER-Ses-Avi.html bu klasorde bulunamadi.
  echo  Bu dosya ile oyun dosyasi ayni klasorde olmali.
  echo  ZIP icinden cikardiysaniz ikisini birlikte tasiyin.
  echo.
  pause
  exit /b 1
)

echo  HARFLER Ses Avi baslatiliyor...
echo  Tarayici acilmazsa su dosyayi elle acin:
echo    %GAME%
echo  Tam ekran icin tarayicida F11.

start "" "%GAME%"

timeout /t 3 >nul 2>nul
endlocal
exit /b 0
