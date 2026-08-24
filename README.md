# Aventura de Inglés — Isabelle

Aplicación bilingüe para iPad creada para practicar las frases del examen de Isabelle.

## Incluye

- Selección preferente de voces femeninas Premium o mejoradas cuando están instaladas en el iPad, con un ritmo más natural y claro.
- Frases y traducciones del material de estudio.
- Escritura con teclado y comprobación de respuestas.
- Tres opciones de escritura: teclado, Apple Pencil inteligente con Scribble y cuaderno libre con validación de un adulto.
- Retos que abren primero en modo de voz y usan el micrófono para comprobar si el iPad entendió la frase completa en inglés; también incluyen el modo de escoger. La corrección usa únicamente la transcripción principal y no acepta palabras faltantes.
- Protección contra bloqueos del micrófono: la escucha termina automáticamente después de 15 segundos y siempre muestra un botón para detenerla manualmente.
- Misión Extra convertida en un examen de 9 preguntas con pestañas de escritura y voz, puntuación privada hasta el final, lista de frases para repasar y celebración especial de examen perfecto.
- Retos, estrellas, 12 logros y progreso guardado en el dispositivo.
- Decoración infantil suave con arcoíris, mariposas, corazones y destellos, sin distraer del contenido de estudio.
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

Esta entrega muestra **Versión 1.9.3** al final de la página. Si no aparece:

1. Confirma que `index.html`, `app.js`, `styles.css` y la carpeta `assets` estén directamente en la raíz del repositorio, no dentro de otra carpeta.
2. En **Settings → Pages**, selecciona **Deploy from a branch**, la rama `main` y la carpeta `/(root)`.
3. Abre la pestaña **Actions** y espera a que `pages build and deployment` termine con una marca verde.
4. En el iPad, abre la dirección agregando `?v=193` al final. Por ejemplo: `https://usuario.github.io/repositorio/?v=193`.
5. Si la guardaste en la pantalla de inicio, elimina ese acceso y vuelve a añadirlo después de ver **Versión 1.9.3** en Safari.

Los enlaces a `app.js` y `styles.css` incluyen un número de versión para evitar que Safari reutilice archivos antiguos.

## Usar como una app en iPad

Abre el enlace en Safari y selecciona **Compartir → Añadir a pantalla de inicio**.

## Micrófono y pronunciación

En **Reto**, elige **Decir**, pulsa **Hablar ahora** y permite el acceso al micrófono. Safari compara su transcripción principal con la frase esperada, en el mismo orden, y exige todas las palabras, incluida la respuesta final como *purple*, *soccer* o *Isabelle*. Esto confirma que la frase fue entendida, pero no es una calificación profesional del acento. En iPad, Siri debe estar activado para que Safari pueda usar el reconocimiento de voz.

La escucha se detiene al detectar que Isabelle terminó de hablar. Si Safari no responde, el botón cambia a **Detener escucha** y la aplicación vuelve automáticamente al estado normal después de 15 segundos. No hace falta cerrar la página.

## Escritura a mano

El modo **Escribe** tiene tres opciones:

- **Teclado:** escribe normalmente y la aplicación comprueba la respuesta.
- **Pencil inteligente:** Isabelle escribe dentro del recuadro con Apple Pencil; Scribble convierte su letra en texto y la aplicación comprueba ese texto automáticamente. Scribble debe estar activado en **Ajustes → Apple Pencil → Escribir a mano**.
- **Cuaderno libre:** permite dibujar las letras con el dedo o Apple Pencil. Al pulsar **Terminé de escribir**, una voz en español le pide entregar el iPad a un adulto. El adulto compara la escritura con el modelo y selecciona **Necesita practicar** o **Está correcta**.

## Misión Extra: examen

La Misión Extra ofrece dos exámenes de nueve preguntas: **Escritura** y **Hablar**. Durante el examen no se indica si una respuesta está bien o mal. Al terminar se muestra la puntuación, las respuestas que necesitan práctica y los botones para repetir el examen o volver directamente a la primera frase fallada. Un resultado perfecto entrega cinco estrellas, desbloquea **Maestra del inglés** y muestra la celebración grande con globos.

## Voces más naturales

La página usa primero las voces femeninas **Premium**, **mejoradas**, **naturales** o **neuronales** que Safari permite seleccionar, y después usa una voz femenina estándar. Para mejorar la calidad, abre **Ajustes → Accesibilidad → Contenido leído (o Leer y hablar) → Voces**, entra en **Inglés (Estados Unidos)** y **Español (México)** y descarga una voz **mejorada** o **premium**. Después cierra y vuelve a abrir Safari. El botón de español muestra la bandera de Puerto Rico, mientras la voz mantiene pronunciación latinoamericana.

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
- `assets/openmoji/`: decoraciones SVG de OpenMoji.
- `THIRD_PARTY_ASSETS.md`: atribución y licencia de los recursos visuales.
- `.nojekyll`: indica a GitHub Pages que sirva los archivos directamente.

## Recursos visuales

Los SVG decorativos se incluyen sin modificar desde [OpenMoji](https://openmoji.org/), bajo licencia [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Consulta `THIRD_PARTY_ASSETS.md` para la atribución completa.
