# Imágenes de Musi

Adjunta `assets/muñequito.png` como referencia para la primera imagen. Para las demás, adjunta la imagen principal aprobada. Entrega PNG con transparencia real: el tablero de cuadros no debe formar parte de la imagen. Usa el mismo encuadre, tamaño y centro del personaje en todas las variantes. No añadas sombras grandes fuera de la silueta.

## 1. Musi explorador — imagen principal

Personaje 2D para un videojuego educativo musical: Musi, el pequeño monstruo rosado de la imagen de referencia. Conservar su identidad, ojos grandes, expresión alegre, color rosado y antenita. Vista frontal, cuerpo completo, de pie, con ambos brazos sosteniendo una canasta abierta a la altura de la cintura, preparada para recoger notas que caen desde arriba. Pequeño accesorio de explorador, sin tapar la cara. Silueta clara y compacta, ilustración vectorial suave con bordes nítidos y colores planos con sombreado discreto, sin pixel art. Canasta claramente visible, interior abierto y vacío. Sin notas flotantes, sin texto, sin suelo ni escenario. Fondo transparente, PNG de 1024 × 1024, personaje centrado con margen alrededor y pies completos. Diseñado para seguir siendo legible a 80 píxeles de altura.

## 2. Musi recogiendo — hoja de animación

Crear una hoja de sprites del personaje Musi explorador de la referencia, manteniendo exactamente su diseño y su canasta. Una sola fila con 4 cuadros cuadrados iguales: 1) sosteniendo la canasta en reposo; 2) elevando ligeramente la canasta y mirando hacia arriba; 3) recogiendo con expresión de alegría y canasta elevada; 4) regresando a reposo. Mismo tamaño, posición de los pies y centro del personaje en todos los cuadros, sin movimiento de cámara. Personaje completo en cada cuadro, sin recortes ni elementos entre cuadros. Ilustración 2D nítida, sin pixel art, fondo transparente. PNG de 2048 × 512, cada cuadro de 512 × 512. Sin texto, números, líneas divisorias, notas ni destellos; los efectos se añadirán en el juego.

Si el generador no respeta los cuatro cuadros, entrega cuatro imágenes individuales con el mismo encuadre; se pueden preparar al integrarlas.

## 3. Skin astronauta

Usar a Musi explorador de la referencia para crear una variante astronauta. Conservar exactamente cara, color rosado, proporciones y tamaño del personaje. Traje espacial blanco con detalles violeta y turquesa; cara completamente visible. Sostiene con ambas manos un recipiente espacial abierto para recoger notas desde arriba. Vista frontal, cuerpo completo, misma pose y encuadre que la imagen principal. Ilustración 2D suave y nítida, sin pixel art. Fondo transparente, PNG de 1024 × 1024. Sin escenario, texto, notas ni efectos externos.

## 4. Skin director de orquesta

Usar a Musi explorador de la referencia para crear una variante director de orquesta. Conservar exactamente cara, color rosado, proporciones y tamaño del personaje. Frac azul oscuro y moño magenta, expresión alegre. Sostiene una canasta elegante abierta con detalles dorados para recoger notas desde arriba. Ambas manos sujetan la canasta, sin batuta. Vista frontal, cuerpo completo, misma pose y encuadre que la imagen principal. Ilustración 2D suave y nítida, sin pixel art. Fondo transparente, PNG de 1024 × 1024. Sin escenario, texto, notas ni efectos externos.

## Imágenes recibidas e integradas

Los cuatro PNG entregados están en `assets/characters/`, sin alterar los archivos originales. La imagen individual de explorador se usa como vista previa del vestuario; su hoja de cuatro poses se usa durante la partida. Astronauta y director también usan sus hojas de cuatro poses para animar la captura.

La hoja recibida mide 2172 × 724: sus cuatro celdas son de 543 × 724. `CHARACTER_ART` en `data.adventure.js` define los recuadros de textura para quitar margen transparente al dibujar, manteniendo proporciones y pies alineados. Todos los trajes comparten una zona de captura de 42 × 18 unidades; la canasta XL amplía el ancho a 94 y dibuja un aro dorado visible. Los accesorios provisionales se ocultan al usar estas imágenes.

## 5. Hoja de animación: Musi astronauta

Adjunta como referencia `assets/characters/astronaut.png` y, si el generador admite una segunda referencia, `assets/characters/explorer-catch.png` para el ritmo de poses.

> Hoja de sprites 2D para un videojuego educativo musical. Usa exactamente el personaje de la referencia: Musi rosada astronauta, casco blanco y violeta, detalles turquesa, ojos y antena idénticos, sosteniendo con ambas manos el recipiente espacial abierto. Crear una sola fila horizontal de cuatro cuadros iguales: 1) reposo, recipiente a la cintura; 2) mira hacia arriba y eleva ligeramente el recipiente; 3) sonríe con alegría y recibe una nota invisible elevando el recipiente; 4) regresa a reposo. Cuerpo completo en cada cuadro, vista frontal, pies a la misma altura y personaje centrado en el mismo lugar. Mantener idénticos tamaño, colores, vestuario, recipiente y proporciones en los cuatro cuadros. Ilustración 2D nítida, sin pixel art. Fondo completamente transparente, sin tablero de cuadros, sin suelo, texto, números, bordes, divisiones, notas ni efectos. PNG de 2172 × 724, cuatro celdas de 543 × 724. Dejar margen transparente y no cortar antena, manos ni pies.

## 6. Hoja de animación: Musi director de orquesta

Adjunta como referencia `assets/characters/conductor.png` y, si es posible, `assets/characters/explorer-catch.png` como referencia de las poses.

> Hoja de sprites 2D para un videojuego educativo musical. Usa exactamente el personaje de la referencia: Musi rosada directora de orquesta con frac azul oscuro, moño magenta y recipiente granate con borde dorado, ambos brazos sujetándolo. Una sola fila horizontal de cuatro cuadros iguales: 1) reposo con el recipiente a la cintura; 2) mira hacia arriba y lo eleva un poco; 3) expresión alegre al recoger una nota invisible con el recipiente levantado; 4) vuelve a reposo. Vista frontal y cuerpo completo en cada cuadro; mantener pies alineados, centro y escala constantes, mismo traje, cara, antena, colores y proporciones. Ilustración 2D limpia y nítida, sin pixel art. Fondo totalmente transparente, sin escenario, tablero de cuadros, texto, números, líneas divisorias, notas ni efectos. PNG de 2172 × 724, cuatro celdas de 543 × 724. No recortar antena, brazos ni pies.

Si no salen cuatro celdas uniformes, entrega cuatro PNG separados con las mismas dimensiones y encuadre. Los sprites recibidos ya se integraron y comprobaron en el juego.
