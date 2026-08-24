# Aventura de Inglés — Isabelle

Aplicación bilingüe para iPad creada para practicar las frases del examen de Isabelle.

## Incluye

- Selección preferente de voces femeninas y voces mejoradas cuando están instaladas en el iPad.
- Frases y traducciones del material de estudio.
- Escritura con teclado y comprobación de respuestas.
- Cuaderno de pantalla completa para escribir con el dedo o Apple Pencil, con bloqueo de selección accidental y comparación amable con el modelo.
- Retos que abren primero en modo de voz y usan el micrófono para comprobar si el iPad entendió la frase en inglés; también incluyen el modo de escoger.
- Misión Extra convertida en un examen de 9 preguntas con pestañas de escritura y voz, puntuación privada hasta el final, lista de frases para repasar y celebración especial de examen perfecto.
- Retos, estrellas, 10 logros y progreso guardado en el dispositivo.
- Sin Google Translate API, sin OpenAI API y sin claves secretas.

## Publicar con GitHub Pages

1. Descomprime `aventura-ingles-isabelle.zip`.
2. En GitHub, crea un repositorio nuevo, por ejemplo `aventura-ingles-isabelle`.
3. Sube **el contenido de esta carpeta** a la raíz del repositorio. `index.html` debe quedar en la raíz.
4. Abre **Settings → Pages**.
5. En **Build and deployment**, selecciona **Deploy from a branch**.
6. Elige la rama **main**, la carpeta **/(root)** y pulsa **Save**.
7. Espera uno o dos minutos. GitHub mostrará el enlace publicado en esa misma pantalla.

No hay proceso de compilación ni dependencias que instalar.

### Si GitHub muestra la versión anterior

Esta entrega muestra **Versión 1.7.0** al final de la página. Si no aparece:

1. Confirma que `index.html`, `app.js`, `styles.css` y la carpeta `assets` estén directamente en la raíz del repositorio, no dentro de otra carpeta.
2. En **Settings → Pages**, selecciona **Deploy from a branch**, la rama `main` y la carpeta `/(root)`.
3. Abre la pestaña **Actions** y espera a que `pages build and deployment` termine con una marca verde.
4. En el iPad, abre la dirección agregando `?v=170` al final. Por ejemplo: `https://usuario.github.io/repositorio/?v=170`.
5. Si la guardaste en la pantalla de inicio, elimina ese acceso y vuelve a añadirlo después de ver **Versión 1.7.0** en Safari.

Los enlaces a `app.js` y `styles.css` incluyen un número de versión para evitar que Safari reutilice archivos antiguos.

## Usar como una app en iPad

Abre el enlace en Safari y selecciona **Compartir → Añadir a pantalla de inicio**.

## Micrófono y pronunciación

En **Reto**, elige **Decir**, pulsa **Hablar ahora** y permite el acceso al micrófono. Safari compara las palabras que reconoce con la frase esperada. Esto confirma que la frase fue entendida, pero no es una calificación profesional del acento. En iPad, Siri debe estar activado para que Safari pueda usar el reconocimiento de voz.

## Escritura a mano

El cuaderno ya no rechaza una frase por no estar exactamente encima de las letras claras. Después de escribir, Isabelle compara su frase con el modelo y confirma que terminó. Una página estática no puede leer con fiabilidad la escritura infantil dibujada en un canvas; la comprobación automática exacta sigue disponible en el modo **Teclado**.

## Misión Extra: examen

La Misión Extra ofrece dos exámenes de nueve preguntas: **Escritura** y **Hablar**. Durante el examen no se indica si una respuesta está bien o mal. Al terminar se muestra la puntuación, las respuestas que necesitan práctica y los botones para repetir el examen o volver directamente a la primera frase fallada. Un resultado perfecto entrega cinco estrellas, desbloquea **Maestra del inglés** y muestra la celebración grande con globos.

## Voces más naturales

La página usa las mejores voces femeninas instaladas que Safari permite seleccionar. Para mejorar la calidad, abre **Ajustes → Accesibilidad → Contenido leído → Voces**, entra en **Inglés (Estados Unidos)** y **Español (México)** y descarga una voz **mejorada** o **premium**. Después cierra y vuelve a abrir la página.

No se usa Google Translate ni OpenAI, por lo que no hay cargos de API.

## Reiniciar las pruebas

Abre **Mis logros** y pulsa **Reiniciar todo el progreso**. Después de confirmar, se borran estrellas, logros, respuestas, puntuaciones de examen y progreso guardado en ese dispositivo.

## Privacidad

El progreso se guarda con `localStorage` únicamente en el navegador del dispositivo. Cuando se usa el reto de voz, Safari y los servicios de voz del iPad gestionan el audio y devuelven una transcripción temporal; la aplicación no guarda grabaciones. El repositorio y la página serán visibles según la configuración de privacidad que elijas en GitHub.

## Archivos

- `index.html`: página principal.
- `styles.css`: diseño adaptable para iPad y móvil.
- `app.js`: lecciones, voz, juegos, escritura y progreso.
- `assets/og.png`: ilustración original del colibrí.
- `.nojekyll`: indica a GitHub Pages que sirva los archivos directamente.
