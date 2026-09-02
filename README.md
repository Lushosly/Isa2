# Aventura de Números — Isabelle

Aplicación infantil completamente en español para aprender los números del 1 al 100 en iPad.

## Incluye

- Selector visual de los 100 números, organizado en grupos de 20.
- Nombre correcto de cada número en español, incluidas las tildes de *dieciséis*, *veintidós*, *veintitrés* y *veintiséis*.
- Explicación hablada: “Este es el número… Se escribe…”.
- Práctica por partes para nombres como *treinta y cinco*.
- Práctica de voz con transcripción visible, coincidencia exacta y recuperación automática del micrófono después de 15 segundos.
- Escritura con teclado, pistas y comprobación que acepta respuestas sin tilde, pero siempre muestra la ortografía correcta.
- Reto de voz: aparece un número sorpresa y Isabelle debe decir su nombre en español; muestra lo que Safari entendió y solo acepta ese número.
- Estrellas, ocho logros y progreso guardado en el iPad.
- Interfaz completamente en español latinoamericano.
- Sin Google, OpenAI ni otros servicios de pago.

## Publicar con GitHub Pages

1. Descomprime `aventura-de-numeros-isabelle.zip`.
2. Crea un repositorio nuevo en GitHub, por ejemplo `aventura-de-numeros-isabelle`.
3. Sube **el contenido de esta carpeta** a la raíz. `index.html` debe quedar en la raíz.
4. Abre **Settings → Pages**.
5. En **Build and deployment**, selecciona **Deploy from a branch**.
6. Elige la rama **main**, la carpeta **/(root)** y pulsa **Save**.
7. Espera a que GitHub muestre el enlace publicado.

No hay dependencias ni proceso de compilación.

### Si Safari muestra una versión anterior

Esta entrega muestra **Versión 1.1.0** al final. Si no aparece:

1. Confirma que `index.html`, `app.js`, `styles.css` y `assets` estén en la raíz del repositorio.
2. Espera a que **Actions → pages build and deployment** termine con una marca verde.
3. Abre el enlace agregando `?v=110` al final, por ejemplo: `https://usuario.github.io/repositorio/?v=110`.
4. Si estaba añadida a la pantalla de inicio, elimínala y vuelve a añadirla después de confirmar la versión nueva en Safari.

## Práctica de voz

En **Habla**, Isabelle practica el número que escogió. En **Reto**, aparece un número sorpresa sin mostrar su nombre y ella debe decirlo en español. La aplicación acepta la palabra correcta o una transcripción numérica equivalente de Safari; también admite que Safari separe *veintiuno* como *veinte y uno*. No acepta otro número.

Safari convierte la voz en texto. La aplicación comprueba ese texto, pero no es una evaluación profesional del acento. La escucha puede detenerse manualmente y termina automáticamente después de 15 segundos.

## Voces

La aplicación prioriza voces femeninas latinoamericanas Premium o mejoradas instaladas en el iPad. Para descargar una, abre **Ajustes → Accesibilidad → Contenido leído (o Leer y hablar) → Voces → Español**. Después cierra y vuelve a abrir Safari.

## Privacidad y costo

El progreso se guarda con `localStorage` en el dispositivo. Safari y los servicios de voz del iPad gestionan el micrófono; la aplicación no guarda grabaciones. No hay claves de API ni cargos de OpenAI, Google u otros servicios.

## Reiniciar

Abre **Mis logros** y pulsa **Reiniciar todo el progreso**.

## Recursos visuales

Los SVG decorativos provienen de [OpenMoji](https://openmoji.org/) bajo licencia [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Consulta `THIRD_PARTY_ASSETS.md`.
