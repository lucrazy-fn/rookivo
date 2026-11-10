@echo off
setlocal
 title Rookivo
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 goto missing_node
where npm.cmd >nul 2>&1
if errorlevel 1 goto missing_node
node -e "const [major,minor]=process.versions.node.split('.').map(Number);process.exit(major>22 || (major===22 && minor>=13) ? 0 : 1)"
if errorlevel 1 goto missing_node
if not exist "package.json" goto missing_project
if not exist "node_modules\.package-lock.json" (
    echo Instalando dependencias. A primeira vez pode demorar e precisa de internet...
    call npm.cmd ci
    if errorlevel 1 goto failed
)
node scripts/prepare-engine.mjs
if errorlevel 1 goto failed
echo.
echo Iniciando Rookivo...
echo O navegador abrira automaticamente quando o site estiver pronto.
echo Se necessario, acesse: http://localhost:5173
echo Mantenha esta janela aberta enquanto usa o site.
echo Para encerrar, pressione Ctrl+C ou feche esta janela.
echo.
set "CHESSLAB_OPEN_BROWSER=1"
call npm.cmd run dev
if errorlevel 1 goto failed
exit /b 0

:missing_node
echo Instale o Node.js 22.13 ou superior, com npm, e tente novamente.
echo Download: https://nodejs.org/
pause
exit /b 1

:missing_project
echo Extraia o projeto completo e mantenha este BAT junto do package.json.
pause
exit /b 1

:failed
echo.
echo Nao foi possivel iniciar o Rookivo. Confira o erro acima.
pause
exit /b 1