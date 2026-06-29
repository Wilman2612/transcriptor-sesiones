@echo off
:: Lanza el instalador en una ventana de PowerShell con colores y progreso
PowerShell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process PowerShell -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File ""%~dp0instalar.ps1""' -Verb RunAs"
