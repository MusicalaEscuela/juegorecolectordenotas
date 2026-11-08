# Musi · Cazador de melodías

Juego de lectura musical de Musicala con rutas de líneas, espacios y lectura mixta, práctica libre, desafío de precisión y colección de melodías. El progreso se guarda en el navegador.

## Ejecutar localmente

Desde esta carpeta, ejecuta `python -m http.server 8765` y abre `http://localhost:8765`. El juego carga Phaser desde un CDN y necesita conexión para iniciar.

## Pruebas

Ejecuta `npm ci` y después `npm test`. La suite usa Playwright y Microsoft Edge instalado; se puede configurar otro canal mediante `MUSI_BROWSER_CHANNEL`.
