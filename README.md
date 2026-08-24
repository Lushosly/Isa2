# Aventura de Inglés — Isabelle

Aplicación bilingüe para iPad creada para practicar las frases del examen de Isabelle.

## Incluye

- Pronunciación en inglés y español con las voces del dispositivo.
- Frases y traducciones del material de estudio.
- Escritura con teclado y comprobación de respuestas.
- Cuaderno para escribir con el dedo o Apple Pencil.
- Retos, estrellas, logros y progreso guardado en el dispositivo.
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

## Usar como una app en iPad

Abre el enlace en Safari y selecciona **Compartir → Añadir a pantalla de inicio**.

## Privacidad

El progreso se guarda con `localStorage` únicamente en el navegador del dispositivo. El repositorio y la página serán visibles según la configuración de privacidad que elijas en GitHub.

## Archivos

- `index.html`: página principal.
- `styles.css`: diseño adaptable para iPad y móvil.
- `app.js`: lecciones, voz, juegos, escritura y progreso.
- `assets/og.png`: ilustración original del colibrí.
- `.nojekyll`: indica a GitHub Pages que sirva los archivos directamente.
