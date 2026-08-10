@echo off
chcp 65001 >nul
echo ========================================
echo   مشاركة موقع فريق الروضة للعالم
echo ========================================
echo.
echo تأكد ان السيرفر يعمل على المنفذ 3000
echo ثم شغّل cloudflared أو ngrok.
echo.
echo الطريقة الأسهل:
echo 1) حمّل ngrok من: https://ngrok.com/download
echo 2) ضع ngrok.exe بجانب هذا الملف
echo 3) شغّل: ngrok http 3000
echo 4) انسخ الرابط https الذي يظهر وشاركه
echo.
pause
