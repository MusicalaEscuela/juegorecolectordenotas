# Musi · Cazador de melodías

Versión local revisada el 8 de noviembre de 2026. Conserva la lectura exclusivamente en pentagrama desde el nivel 1 y el flujo continuo de notas al acertar. Las opciones que caen muestran nombres; el objetivo no muestra nombre ni número de línea/espacio. Tras un error se muestra la corrección.

## Personajes

Integrados los seis PNG entregados: retrato y hoja de cuatro poses para explorador, astronauta y director. Los originales se copian a `assets/characters/` sin modificarlos. Los recortes de textura conservan la proporción y eliminan márgenes vacíos al dibujar. La altura visible ronda 100 unidades y el personaje queda completo sobre los controles. Las cuatro poses tienen pies alineados. Una sola zona de captura para todos los trajes mantiene las mismas condiciones de juego.

## Progresión en cada una de las tres rutas

| Nivel | Velocidad de caída (unidades/s) | Aciertos | Novedad |
|---|---|---|---|
| 1 | 72–90 | 6 | Aprender a recoger y cargar energía |
| 2 | 96–114 | 6 | Mayor velocidad |
| 3 | 123–141 | 7 | Más opciones y frecuencia |
| 4 | 151–169 | 7 | Bolas de ruido |
| 5 | 180–198 | 8 | Ráfagas de tres, lluvia continua de siete y descansos |
| 6 | 210–228 | 8 | Ráfagas más rápidas |
| 7 | 240–258 | 9 | Algunas notas oscilan lateralmente |
| 8 | 270–288 | 9 | Viento anunciado 1,8 segundos antes |
| 9 | 300–318 | 10 | Charcos anunciados que frenan a Musi |
| 10 | 330–348 | 12 | Tres oleadas de cuatro aciertos, con descansos de aparición |

Cada nivel explica su reto antes de comenzar. Los descansos frenan la aparición de nuevas notas; las existentes siguen cayendo. Las notas objetivo aparecen al menos una vez cada tres apariciones. Dejar pasar una nota no resta vida. Hay un breve margen tras una captura para evitar que dos colisiones simultáneas se penalicen cuando cambia el objetivo.

## Poderes y obstáculos

Tres aciertos cargan la energía. Se elige con los botones o las teclas 1/2/3:

- Tiempo lento: caída al 45% durante 5 segundos.
- Escudo: protege de un error durante un máximo de 9 segundos. El error sí cuenta para precisión y corta la racha.
- Canasta XL: zona de captura ampliada de 42 a 94 unidades durante 6 segundos. El aro dorado muestra el alcance adicional; también recoge notas incorrectas.

No se pueden activar dos poderes a la vez. La energía puede reservarse durante un poder. Los errores y el ruido vacían la energía y rompen la racha. El ruido no resta vida. Los charcos reducen la velocidad de Musi al 48%; el efecto desaparece poco después de salir. Pausar congela física, aparición, duración de poderes, viento y charcos. Tocar un botón de poder no mueve al personaje.

## Recompensas

Una estrella por completar, dos con al menos 75% de precisión y tres desde 90%. Los aciertos suman de 10 a 20 puntos según la racha. Se guardan máximos independientes de puntuación, precisión, estrellas y racha por nivel. Completar una ruta da su insignia y el astronauta; completar las tres desbloquea al director. Los desbloqueos anteriores se conservan. La frase de celebración reproduce hasta ocho nombres de notas recogidas en una octava fija; no es una reproducción de las octavas exactas mostradas en los pentagramas mixtos.

## Validación

`npm test` levanta un servidor temporal y un contexto de navegador aislado; no modifica el progreso real del usuario. Prueba los 30 niveles mediante colisiones físicas, continuidad de notas al acertar, energía, poderes y caducidad, pausa, ruido, aviso de viento, charcos y recuperación, velocidades crecientes, ráfagas, estrellas, trajes desbloqueados, reinicio desde pausa, persistencia y controles táctiles emulados. Sin excepciones de JavaScript en la ejecución final. Capturas revisadas en escritorio y viewport móvil horizontal. Los PNG del vestuario y los cuadros de animación se validan dentro del motor.

Pruebas de escritorio en Edge sin interfaz. No se ha hecho una sesión con estudiantes ni una prueba en teléfono físico: el equilibrio de dificultad puede afinarse con uso real. En vertical el lienzo conserva 4:3 y se ve más pequeño; horizontal es preferible.

## Ejecutar y probar

Para jugar: `python -m http.server 8765` y abrir http://localhost:8765.

Para pruebas: `npm install` y `npm test`. Requiere Edge instalado; se puede seleccionar otro canal instalado con `MUSI_BROWSER_CHANNEL`. Las capturas de prueba quedan en `test-results/`.

Cambios guardados localmente, sin publicación remota. Phaser sigue cargándose desde el CDN; requiere conexión para la primera carga. Los prompts originales están en `PROMPTS-MUSI.md`.


## Nuevos modos

La práctica libre permite seleccionar una o más notas, no resta vidas ni termina automáticamente y se finaliza desde Pausa. No altera los récords de las rutas. El desafío de precisión propone 12 aciertos en 60 segundos, con al menos 80% de precisión y tres vidas; su récord se guarda por separado. El reloj se pausa con la partida. Tres fragmentos de melodías se desbloquean al completar el nivel 3 de cada ruta y pueden escucharse desde la colección.

Las velocidades se revisaron con movimiento real durante 400 ms en Edge: en una ejecución, el nivel 10 recorrió 4,04 veces la distancia del nivel 1. La experiencia humana y el equilibrio de dificultad todavía requieren prueba con jugadores. `npm test` incluye pruebas para los nuevos modos y la colección.
