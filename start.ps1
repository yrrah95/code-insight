# CodeInsight 啟動腳本
Write-Host "啟動 CodeInsight..." -ForegroundColor Cyan

# 啟動後端
Start-Process powershell -ArgumentList @(
    '-NoExit',
    '-Command',
    "Set-Location 'C:\數字游牧計畫\CodeInsight\backend'; py -3 -m uvicorn main:app --reload --port 8000"
) -WindowStyle Normal

Start-Sleep -Seconds 2

# 啟動前端
Start-Process powershell -ArgumentList @(
    '-NoExit',
    '-Command',
    "Set-Location 'C:\數字游牧計畫\CodeInsight\frontend'; npm run dev"
) -WindowStyle Normal

Start-Sleep -Seconds 3

# 開啟瀏覽器
Start-Process "http://localhost:5173"

Write-Host "已啟動！" -ForegroundColor Green
Write-Host "後端：http://localhost:8000" -ForegroundColor Gray
Write-Host "前端：http://localhost:5173" -ForegroundColor Gray
