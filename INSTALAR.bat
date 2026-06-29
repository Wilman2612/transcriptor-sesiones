@echo off
:: Lanza el instalador en una ventana de PowerShell elevada (permisos de admin).
:: Pasa la ruta como un elemento de array para que funcione aunque la carpeta
:: tenga espacios (Documentos, OneDrive, Escritorio, etc.).
set "PS1=%~dp0instalar.ps1"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell -Verb RunAs -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File','%PS1%')"
