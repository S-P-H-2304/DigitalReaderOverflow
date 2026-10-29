# Guía Maestra y Contexto Técnico del Proyecto: **Overflow: Diarios de un prófugo**

> **Propósito de este documento**: Este archivo está diseñado como **contexto de sistema e instrucciones técnicas completas** para cualquier Inteligencia Artificial (o desarrollador) que colabore en el proyecto. Contiene la arquitectura, el flujo de todas las pantallas, el funcionamiento detallado de todos los sistemas (Base de Datos, Autenticación, Lector Inmersivo, Audio Adaptativo, Comunidad, Perfiles, Recorte Táctil de Imágenes, Animaciones GSAP y Reglas de Firestore) para que puedas continuar el desarrollo sin romper ninguna funcionalidad existente.

---

## 1. Contexto General del Proyecto

- **Nombre del Proyecto**: *Overflow: Diarios de un prófugo*
- **ID del Proyecto en Firebase**: `overflow-digital-reader`
- **Tipo de Aplicación**: Web App Progresiva (Mobile-First) de lectura digital interactiva transmedia con red social / comunidad integrada en tiempo real.
- **Concepto**: Es una plataforma diseñada para leer el cómic/novela gráfica digital **"Overflow"** en dispositivos móviles. Combina:
  1. **Un selector de capítulos interactivo** cuyas paletas de colores transforman toda la interfaz de la aplicación según el capítulo activo (`data-chapter="1..4"`).
  2. **Un lector vertical inmersivo** con banda sonora ambiental adaptativa (que hace *crossfade* automático según la página que el usuario está leyendo) y **hotspots de efectos de sonido (SFX)** incrustados sobre las viñetas.
  3. **Una red social / comunidad en tiempo real** donde los lectores publican teorías, imágenes o GIFs, reaccionan (*Like*, *Dislike*, *Repost*), comentan, personalizan sus perfiles (con recorte táctil *pinch-to-zoom* de avatar y portada) y siguen a otros lectores.

### Stack Tecnológico
- **Frontend**: HTML5 semántico, CSS3 nativo avanzado (Variables CSS dinámicas, Glassmorphism, `@view-transition`, soporte de `safe-area-inset` y `100dvh`), JavaScript Vanilla (ES6+).
- **Animaciones**: **GSAP 3.12.5** (`gsap.min.js` vía CDN) centralizado en `Scripts/motion.js` + transiciones CSS con curvas elásticas (`--ease-spring`, `--ease-bounce`, `--ease-smooth`).
- **Backend / Persistencia (Serverless)**:
  - **Firebase Authentication (v11.0.1)**: Inicio de sesión con Google (`GoogleAuthProvider`) + Sistema propio de cuentas con `@username` / correo y contraseña almacenado en Firestore.
  - **Cloud Firestore (v11.0.1)**: Base de datos NoSQL en tiempo real (`onSnapshot`) para usuarios (`users`), publicaciones (`posts`) y métricas globales de capítulos (`chapters`).
  - **LocalStorage Cache (0ms Hydration)**: Capa de caché local (`overflow_*`) que hidrata el DOM **síncronamente en 0ms antes del primer pintado del navegador**, evitando parpadeos (FOUC) mientras Firebase sincroniza en segundo plano.
  - **Firebase Hosting**: Configurado en `firebase.json` con cabeceras `Cache-Control: no-cache` para HTML, JS y CSS.

---

## 2. Estructura de Archivos del Proyecto

El código fuente principal se encuentra dentro de la carpeta `DigitalReaderOverflow/`:

```text
DigitalReaderOverflow/
├── .firebaserc                   # Vinculación con el proyecto Firebase "overflow-digital-reader"
├── firebase.json                 # Configuración de Firebase Hosting y ruta a firestore.rules
├── firestore.rules               # Reglas de seguridad y validación de esquemas de Cloud Firestore
│
├── index.html                    # Pantalla Principal (Home): Carrusel 3D de capítulos y cambio de tema
├── chapterOneOverview.html       # Pantalla de Antesala (Overview) del Capítulo 1: A la deriva
├── chapterReader.html            # Lector Vertical Inmersivo del Capítulo 1 (12 páginas + Audio + HUD)
├── community.html                # Red Social / Feed de Comunidad + Overlay de Publicación + Comentarios
├── myprofile.html                # Perfil Propio (Modo Normal c/ Lightbox + Modo Edición c/ Cropper Táctil)
├── otherprofile.html             # Perfil Público de Otros Usuarios (?uid=...) + Sistema de Seguir
├── settings.html                 # Configuración de Cuenta, Edición de Datos, Notificaciones y Logout
│
├── Styles/
│   └── styles.css                # Hoja de estilos única (~3170 líneas): Temas 1-4, Layout, Componentes, Modales
│
├── Scripts/
│   ├── db.js                     # Núcleo de Datos y Auth: Hidratación 0ms, LocalStorage + Cloud Firestore Sync
│   ├── motion.js                 # Controlador de animaciones elásticas y micro-interacciones con GSAP
│   ├── navigation.js             # Lógica de la barra inferior (.bottom-nav), estado activo y animación contextual
│   ├── carrousel.js              # Carrusel 3D táctil del Home (scrubbing, rotación de tarjetas, crossfade de tema)
│   ├── overview-carrousel.js     # Carrusel de diapositivas en chapterOneOverview.html y métricas en vivo
│   ├── reader.js                 # Motor del Lector: Scroll, HUD inmersivo, ReaderAudioManager, Volumen, Likes
│   ├── publish.js                # Lógica de Comunidad: Feed, crear post con foto/GIF, likes/dislikes/reposts, comentarios
│   ├── profile.js                # Lógica de Mi Perfil: Modo Edición, Cropper táctil en Canvas, Lightbox, Tabs
│   ├── otherprofile.js           # Lógica de Perfil Ajeno: Cargar por ?uid=, Seguir/Dejar de seguir, Feed del usuario
│   └── log-out.js                # Lógica de Configuración (settings.html): Edición de campos, validaciones y Logout
│
├── Audio/
│   ├── ambient-calm.wav          # Música ambiental para las páginas 1 a 4 del Capítulo 1
│   ├── ambient-tension.wav       # Música ambiental para las páginas 5 a 8 del Capítulo 1
│   ├── ambient-climax.wav        # Música ambiental para las páginas 9 a 12 del Capítulo 1
│   ├── sfx-wind.wav              # Efecto sonoro interactivo (Hotspot en página 3)
│   └── sfx-pulse.wav             # Efecto sonoro interactivo (Hotspot en página 7)
│
└── Images/
    ├── default-avatar.svg        # Avatar por defecto obligatorio para usuarios sin foto personalizada
    ├── default-banner.svg        # Portada/banner por defecto obligatorio
    ├── cap1Cover.jpg             # Portada del Capítulo 1 (y referencias a cap2Cover, cap3Cover, cap4Cover)
    └── Cap 1 Imgs/
        └── Cap (1).png .. Cap (12).png # Las 12 páginas/paneles verticales del Capítulo 1
```

---

## 3. Explicación Detallada de Cada Página y sus Funciones

### 3.1. `index.html` — Inicio y Selector de Capítulos
- **Propósito**: Es la puerta de entrada de la aplicación. Muestra el título de la novela (`Overflow`), un acceso directo a Ajustes (`settings.html`) en la esquina superior derecha, el carrusel central de capítulos y la barra de navegación inferior.
- **Funciones Clave (`Scripts/carrousel.js`)**:
  - **Carrusel de 4 Capítulos**: Maneja 4 tarjetas (`article[data-chapter-id="1..4"]`) mediante las clases `.chapter-card-active`, `.chapter-card-prev`, `.chapter-card-next` y `.chapter-card-hidden`.
  - **Arrastre Sincronizado (Touch Scrubbing)**: Al deslizar el dedo horizontalmente (`touchstart`, `touchmove`, `touchend`), interpola en tiempo real la posición `translate`, la escala (`0.88` a `1.0`) y la opacidad (`0.6` a `1.0`) de las tarjetas según el progreso del gesto.
  - **Cambio de Tema con Crossfade**: Cada vez que cambia la tarjeta activa, actualiza `<html data-chapter="X">`, guarda la preferencia en `DB.setActiveChapter(id)` y crea un `div` temporal (`fader`) con el gradiente anterior que se desvanece en `0.6s` para lograr una transición suave del fondo.
  - **Navegación al Capítulo**:
    - Tocar el botón de *Play* sobre la tarjeta activa del Capítulo 1 lleva directamente al lector (`chapterReader.html`).
    - Tocar el cuerpo de la tarjeta activa del Capítulo 1 lleva a la pantalla de resumen (`chapterOneOverview.html`).
    - Los capítulos 2, 3 y 4 están preparados visualmente pero muestran un aviso de *"Capítulo X próximamente disponible"*.

### 3.2. `chapterOneOverview.html` — Resumen del Capítulo 1 ("A la deriva")
- **Propósito**: Pantalla previa a la lectura del Capítulo 1.
- **Funciones Clave (`Scripts/overview-carrousel.js`)**:
  - **Carrusel de 3 Diapositivas**: Permite deslizar (swipe táctil o clic en los indicadores `.carousel-indicator`) entre Portada, Reseñas y Créditos del capítulo.
  - **Métricas Sincronizadas en Tiempo Real**: Muestra tres indicadores conectados a Firestore (`chapters/chapter_1` y `users/{uid}`):
    1. **Likes del capítulo** (`#overview-chapter-likes`): Contador global de "Me gusta" del capítulo (resalta el corazón en verde/activo si el usuario actual ya dio like).
    2. **Visualizaciones** (`#overview-chapter-views`): Contador global de lecturas del capítulo.
    3. **Progreso de lectura** (`#overview-chapter-progress`): Muestra cuántos paneles ha leído el usuario actual en formato `X/12` (ej. `7/12` o `12/12`).
  - **CTA "Empezar a leer"**: Enlace directo a `chapterReader.html`.

### 3.3. `chapterReader.html` — Lector Vertical Inmersivo y Motor de Audio
- **Propósito**: Experiencia principal de lectura del cómic (12 paneles verticales en `#visor`).
- **Funciones Clave (`Scripts/reader.js`)**:
  1. **HUD Inmersivo Auto-Ocultable**:
     - La barra superior (`header.reader-header`) y la barra inferior (`#down-bar`) se ocultan suavemente (`.hud-hidden`) cuando el usuario hace scroll manual para leer sin distracciones.
     - Un toque rápido (tap sin arrastre, `< 450ms`) en cualquier parte del visor alterna la visibilidad del HUD (`toggleReaderHUD()`).
  2. **Controles de Desplazamiento Asistido**:
     - Los botones inferiores `#btn-prev` y `#btn-next` desplazan el visor suavemente un `75%` de la altura de la pantalla (`window.innerHeight * 0.75`) sin ocultar el HUD (`isProgrammaticScroll`).
  3. **Motor de Audio Adaptativo (`ReaderAudioManager`)**:
     - **Banda Sonora por Secciones**: Monitorea qué página ocupa mayor área visible en el viewport y reproduce en bucle la pista correspondiente:
       - Páginas **1 a 4**: `Audio/ambient-calm.wav`
       - Páginas **5 a 8**: `Audio/ambient-tension.wav`
       - Páginas **9 a 12**: `Audio/ambient-climax.wav`
     - **Crossfade de Doble Canal**: Al cruzar de una sección a otra (ej. de la página 4 a la 5), realiza un fundido cruzado (*crossfade*) de `1.2 segundos` entre dos instancias de `Audio` (`ambientA` y `ambientB`).
     - **Hotspots Sonoros Interactivos con Audio Ducking**:
       - En la **página 3** (`Audio/sfx-wind.wav`) y en la **página 7** (`Audio/sfx-pulse.wav`) hay botones flotantes `.audio-hotspot` con animación de onda expansiva.
       - Al tocarlos, el motor atenúa automáticamente la música ambiental al `25%` de su volumen (*ducking*), reproduce el efecto de sonido y restaura el volumen ambiental al finalizar.
     - **Gestión de Ciclo de Vida**: Desbloquea el audio en el primer toque o scroll del usuario (cumpliendo políticas de autoplay móvil) y pausa/reanuda automáticamente cuando la pestaña pasa a segundo plano (`visibilitychange`).
  4. **Popover Vertical de Volumen (`#volume-popover`)**:
     - Control deslizable vertical con soporte de puntero táctil/mouse (`setPointerCapture`), teclado (`ArrowUp`, `ArrowDown`, `Home`, `End`) y botón de *Mute* (`#btn-volume-mute`).
     - Sincroniza el volumen maestro en tiempo real y persiste la preferencia del usuario (`0-100`) en `localStorage` y en su documento de Firestore (`users/{uid}.volume`).
  5. **Popover de Acceso Rápido a Capítulos (`#chapters-popover`)**:
     - Muestra el estado de los 4 capítulos (`1 / 4 disponibles`). Si el usuario toca un capítulo bloqueado (`data-available="false"`), ejecuta una animación de vibración (`Motion.shakeLocked`) y muestra un toast informativo (`"Capítulo X: Contenido no disponible"`).
  6. **Tracking de Vistas, Likes y Progreso**:
     - Al abrir el lector, incrementa en `+1` las vistas globales del capítulo una vez por sesión (`DB.incrementChapterView('chapter_1')`).
     - A medida que el usuario avanza por las viñetas, guarda automáticamente el máximo panel alcanzado (`DB.saveChapterProgress('chapter_1', readCount, 12)`).
     - El botón de corazón inferior (`#btn-chapter-like`) permite dar/quitar Like global al capítulo con animación GSAP (`Motion.popLike`).

### 3.4. `community.html` — Red Social y Feed de la Comunidad
- **Propósito**: Espacio social donde todos los lectores interactúan.
- **Funciones Clave (`Scripts/publish.js` + `Scripts/navigation.js`)**:
  - **Autenticación Requerida**: Al entrar, verifica la sesión mediante `DB.requireAuth()`. Si no hay sesión iniciada, despliega el modal de login/registro.
  - **Feed Dinámico en Tiempo Real**: Renderiza todas las publicaciones ordenadas de más reciente a más antigua. Escucha el evento `overflow:posts-synced` (disparado por `onSnapshot` de Firestore) para actualizar el feed en vivo cuando cualquier usuario publica o interactúa.
  - **Sistema de Reacciones por Publicación**:
    - **Like (`.btn-like`)**: Incrementa/decrementa likes y activa animación `Motion.popLike`. Si el usuario tenía Dislike activo, lo remueve automáticamente.
    - **Dislike (`.btn-dislike`)**: Incrementa/decrementa dislikes con animación `Motion.tiltDislike`. Es mutuamente excluyente con el Like.
    - **Repost (`.btn-repost`)**: Añade o quita la publicación de la lista de reposts del usuario (`users/{uid}.reposts` y `posts/{postId}.reposts`) con animación de giro `180°` (`Motion.spinRepost`).
    - **Comentarios (`.btn-comment`)**: Abre la hoja modal inferior (`#comments-backdrop`) donde se listan los comentarios del post y se pueden enviar nuevos comentarios (máx. 300 caracteres).
  - **Overlay de Creación de Publicaciones (`#publish-overlay`)**:
    - Se abre con el botón `+` de la barra inferior.
    - Permite escribir texto con auto-ajuste de altura (`textarea#post-input`), **adjuntar imágenes desde la galería/disco** (comprimidas automáticamente a JPEG Base64 de máx. `800px` y calidad `0.7` vía `DB.compressImage`) o **adjuntar GIFs por URL**.
  - **Navegación Contextual de Perfiles**: Tocar el avatar o nombre de cualquier autor redirige a `myprofile.html` (si el autor es el usuario actual) o a `otherprofile.html?uid=<authorId>` (si es otro usuario).

### 3.5. `myprofile.html` — Perfil del Usuario Actual
- **Propósito**: Centro de identidad del lector autenticado.
- **Funciones Clave (`Scripts/profile.js`)**:
  - **Doble Modo de Interacción (Modo Normal vs. Modo Edición)**:
    - **Modo Normal (Por defecto)**:
      - Tocar la foto de perfil o el banner abre el **Visor Lightbox (`#image-lightbox-backdrop`)** para inspeccionar la imagen en tamaño completo.
    - **Modo Edición (Activado con el botón del lápiz `#edit-profile` en el header)**:
      - El ícono del lápiz cambia a un check (`✓`), aparece un banner guía (`#profile-edit-hint`) y se muestran insignias flotantes sobre las fotos y píldoras `"Editar"` junto al nombre y la descripción.
      - **Edición Inline de `@username` y `Descripción`**: Tocar el nombre de usuario o la biografía abre `#profile-edit-backdrop` con validación (username de 3 a 20 caracteres; descripción de hasta 200 caracteres con contador en vivo).
      - **Recorte y Encuadre Táctil de Imágenes (`#image-cropper-backdrop`)**: Al elegir una nueva foto de perfil o portada desde el dispositivo, se abre un **Editor de Recorte Interactivo en HTML5 Canvas**:
        - Soporta **arrastre con 1 dedo (pan)** y **pellizco con 2 dedos (pinch-to-zoom)** en móviles, además de arrastre con mouse y zoom con rueda (`wheel`) en escritorio.
        - Restringe matemáticamente los bordes (`clampCropperPosition`) para que nunca queden espacios vacíos dentro de la máscara circular (avatar) o rectangular (portada).
        - Al pulsar **"Aplicar"**, recorta la región exacta en un `<canvas>` de alta calidad (`400x400` para avatar, `900x...` para portada) y lo guarda en Base64 JPEG (`0.82`) en Firestore, marcando `customAvatar: true` o `customBanner: true`.
  - **Pestañas *Posts* y *Reposts***: Alterna con una píldora deslizante (`.active-pill`) entre las publicaciones creadas por el usuario y las publicaciones que ha reposteado.

### 3.6. `otherprofile.html` — Perfil Público de Otros Usuarios
- **Propósito**: Permite explorar el perfil, estadísticas, posts y reposts de cualquier miembro de la comunidad.
- **Funciones Clave (`Scripts/otherprofile.js`)**:
  - Lee el parámetro URL `?uid=<userId>` (por defecto `user_other` si se omite).
  - Si el `uid` corresponde al usuario actualmente autenticado, redirige automáticamente a `myprofile.html`.
  - **Sistema de Seguir / Dejar de Seguir (`#btn-toggle-follow`)**: Actualiza instantáneamente la lista `following` y `followingCount` del usuario actual y el `followersCount` del usuario visitado tanto en caché local como en Cloud Firestore (`DB.toggleFollow`).
  - Incluye inspección de avatar y banner mediante Lightbox, pestañas de *Posts* y *Reposts*, y soporte completo de reacciones y comentarios.

### 3.7. `settings.html` — Configuración de Cuenta y Sesión
- **Propósito**: Gestión de datos personales, preferencias y cierre de sesión.
- **Funciones Clave (`Scripts/log-out.js`)**:
  - Muestra y permite editar mediante modal (`#edit-backdrop`):
    - `Username` (3-20 caracteres; al cambiarlo se actualiza denormalizadamente en todos los posts y comentarios del usuario).
    - `Descripción` (textarea de 6 filas, máx. 200 caracteres con contador).
    - `Nombres`, `Apellidos`, `Email`.
    - `Contraseña`: Incluye doble campo de confirmación. **Nota importante**: Si la cuenta fue iniciada con Google (`DB.isGoogleAccount(user) === true`), la fila de contraseña se oculta automáticamente (`display: none`) y se bloquea su edición.
  - **Switch de Notificaciones (`#notifications-toggle`)**: Guarda el booleano `notificationsEnabled` en el perfil del usuario.
  - **Cerrar Sesión (`#logout-backdrop`)**: Modal de confirmación que ejecuta `DB.logout()`, limpiando la sesión de `localStorage` y de Firebase Auth y redirigiendo a `index.html`.

---

## 4. Sistemas Internos Clave (Cómo funciona por dentro)

### 4.1. Sistema de Hidratación Síncrona (0ms) + Sincronización Cloud (`Scripts/db.js`)
Para que la navegación entre páginas HTML sea instantánea y nunca se vean datos de plantilla vacíos o parpadeos:
1. Apenas se carga `Scripts/db.js`, se ejecuta de forma **síncrona e inmediata** `hydrateCurrentViewSynchronously()`.
2. Esta función lee `localStorage` (`overflow_current_user_id`, `overflow_users`, `overflow_chapters`) e inyecta los textos, avatares, banners y contadores en el DOM en **0 milisegundos**.
3. En paralelo, `initFirebase()` importa dinámicamente los módulos oficiales de Firebase `11.0.1`, verifica el estado de autenticación (`onAuthStateChanged`), siembra los datos semilla si la base de datos está vacía (`ensureSeedDataInFirestore`) y conecta dos listeners en tiempo real (`onSnapshot`) sobre las colecciones `chapters` y `posts`.
4. Cuando llegan cambios desde la nube, `db.js` actualiza `localStorage` y emite los eventos globales `window.dispatchEvent(new CustomEvent('overflow:posts-synced'))` y `overflow:chapters-synced` para que la vista activa se refresque automáticamente.

### 4.2. Sistema de Autenticación Dual y Regla Estricta de Avatares
El servicio `window.DB` soporta dos métodos de autenticación que conviven en la colección `users` de Firestore:
1. **Cuentas Propias con Usuario y Contraseña (`authProvider: 'password'`)**:
   - Se crean con IDs con prefijo `user_<timestamp>_<random>`.
   - Pueden iniciar sesión ingresando su `@username` o su correo electrónico más su contraseña (`DB.loginWithCredentials`).
2. **Cuentas de Google (`authProvider: 'google'`)**:
   - Autenticadas mediante `signInWithPopup` con `GoogleAuthProvider`.
   - **Paso obligatorio de `@username`**: Al iniciar sesión por primera vez con Google (`usernameConfirmed: false`), el modal de autenticación cambia automáticamente al paso `"Elige tu @username"` (`#form-google-username`) para que el usuario elija un nombre de usuario corto (3-20 caracteres) en lugar de usar su nombre completo de Google.
3. **Regla Estricta de Avatar por Defecto (¡MUY IMPORTANTE!)**:
   - **NUNCA** se debe usar la foto de perfil por defecto de Google (`googleusercontent.com` / `lh3.google.com`) ni antiguos placeholders (`Images/Maclovin.png`) como avatar del usuario.
   - Todo usuario nuevo (sea de Google o de contraseña) utiliza obligatoriamente `Images/default-avatar.svg` y `Images/default-banner.svg` hasta que suba y recorte explícitamente una imagen propia en `myprofile.html` (lo cual establece `customAvatar: true` o `customBanner: true`).
   - La función `sanitizeLegacyPlaceholders()` limpia automáticamente cualquier URL de Google si `customAvatar` no es `true`.

### 4.3. Sistema de Temas Dinámicos por Capítulo (`Styles/styles.css`)
El atributo `data-chapter` en la etiqueta `<html>` controla toda la atmósfera visual de la aplicación mediante variables CSS:
- **Capítulo 1 (`:root[data-chapter="1"]`)**: Gradiente radial azul grisáceo (`#7393AC` a `#2F3C46`), acento `#6391be`.
- **Capítulo 2 (`:root[data-chapter="2"]`)**: Gradiente azul profundo (`#1B5AA0` a `#081742`), acento dorado/ámbar `#D5A260`.
- **Capítulo 3 (`:root[data-chapter="3"]`)**: Gradiente azul cobalto (`#4070B8` a `#353A4D`), acento celeste `#50ACE5`.
- **Capítulo 4 (`:root[data-chapter="4"]`)**: Gradiente nocturno (`#3A6890` a `#132435`), acento carmesí `#8B0333`.
- Todas las páginas HTML incluyen en su `<head>` un pequeño script inline (*Theme Loader*) que lee `localStorage.getItem('activeChapter')` antes de renderizar el `<body>` para mantener el tema elegido sin parpadeos.

### 4.4. Barra de Navegación Inferior Contextual (`Scripts/navigation.js`)
- Presente en `index.html`, `community.html`, `myprofile.html` y `otherprofile.html`.
- Detecta automáticamente la página actual y aplica `.active-nav-item` y `aria-current="page"`.
- Si el usuario pulsa el ícono de la vista en la que ya se encuentra, previene la recarga y hace un scroll suave hacia arriba (`window.scrollTo({ top: 0, behavior: 'smooth' })`).
- **Animación en Comunidad**: Al entrar a `community.html`, añade la clase `.is-community` para desplazar la píldora de navegación y hacer brotar con efecto resorte el botón flotante `+` de crear publicación. Al salir de `community.html` hacia otra pestaña, ejecuta una transición de salida de `200ms` (`.is-leaving`) antes de cambiar de ruta.

---

## 5. Modelo de Datos en Cloud Firestore y Reglas (`firestore.rules`)

La base de datos en Cloud Firestore cuenta con reglas estrictas de validación de esquema en `firestore.rules`. Cualquier documento creado o actualizado **debe** cumplir exactamente con estos campos permitidos (`hasOnlyAllowedFields`), de lo contrario Firestore rechazará la operación con ` custom permission-denied`:

### 5.1. Colección `users/{userId}`
- **Campos requeridos**: `id` (string, igual a `{userId}`), `username` (string, 1..60 chars).
- **Campos opcionales permitidos**:
  - `nombres` (string, 0..100), `apellidos` (string, 0..100), `email` (string, 0..254), `password` (string, 0..100)
  - `authProvider` (`'google'` | `'password'`), `usernameConfirmed` (bool)
  - `customAvatar` (bool), `customBanner` (bool)
  - `bio` (string, 0..1000)
  - `avatar` (string, 0..800,000 chars — soporta ruta local o Data URL Base64 comprimido)
  - `banner` (string, 0..800,000 chars — soporta ruta local o Data URL Base64 comprimido)
  - `activeChapter` (string, `'1'`..`'4'`), `chapterProgress` (map, ej. `{ chapter_1: 12 }`)
  - `notificationsEnabled` (bool), `volume` (number, `0..100`)
  - `followersCount` (number >= 0), `followingCount` (number >= 0)
  - `following` (list of strings, máx 2000), `reposts` (list of strings, máx 2000)
  - `createdAt` (number, inmutable tras creación)

### 5.2. Colección `posts/{postId}`
- **Campos requeridos**: `id`, `authorId`, `authorUsername`, `createdAt`, `content`, `likes`, `dislikes`, `reposts`, `comments`.
- **Campos opcionales permitidos**: `authorAvatar` (string, máx 800,000 chars), `media` (`null` o mapa `{ type: 'image' | 'gif', url: string }`).
- **Estructura de cada elemento en `comments`**: Mapa con exactamente las llaves `['id', 'authorId', 'authorUsername', 'authorAvatar', 'text', 'createdAt']`.
- **Campos inmutables en updates**: `id`, `authorId`, `createdAt`.

### 5.3. Colección `chapters/{chapterId}`
- **Documento actual**: `chapter_1`
- **Campos requeridos**: `id` (`'chapter_1'`), `likes` (array de UIDs), `likesCount` (number >= 0).
- **Campos opcionales permitidos**: `title` (string), `viewsCount` (number >= 0), `totalPanels` (number >= 0, actualmente `12`).

---

## 6. Reglas de Oro e Instrucciones para la IA al Modificar el Proyecto

Si vas a realizar cambios, agregar capítulos o crear nuevas funciones en este proyecto, sigue estas reglas rigurosamente:

1. **No agregues campos no declarados a los documentos de Firestore sin actualizar `firestore.rules`**:
   - `firestore.rules` utiliza `hasOnlyAllowedFields(...)` tanto en `users`, `posts` como en `chapters`. Si agregas una propiedad nueva en `db.js` al guardar un usuario, post o capítulo, **debes** añadirla también a la lista `allowedFields` y su validador en `firestore.rules`.
2. **Respeta la Regla de Avatar por Defecto**:
   - Nunca asignes `authUser.photoURL` de Google como avatar. Usa siempre `Images/default-avatar.svg` a menos que `user.customAvatar === true`.
3. **Mantén la Hidratación Síncrona (0ms) + Cloud Sync**:
   - Siempre que leas o modifiques datos desde la UI, utiliza los métodos de `window.DB` (`Scripts/db.js`). `window.DB` actualiza primero el caché local (`localStorage`) para respuesta instantánea en la interfaz y luego sincroniza asíncronamente con Cloud Firestore.
4. **Propagación Denormalizada**:
   - Los posts y comentarios guardan `authorUsername` y `authorAvatar` denormalizados para renderizar el feed sin hacer $N$ consultas adicionales. `DB.updateProfile()` ya se encarga de actualizar automáticamente todos los posts y comentarios del usuario cuando este cambia su `username` o su `avatar`. Mantén este comportamiento.
5. **Compresión de Imágenes en Base64**:
   - El proyecto no utiliza Firebase Cloud Storage (buckets) para evitar costos/bloqueos de CORS; en su lugar, convierte las imágenes de posts, avatares y portadas en **Data URLs JPEG comprimidas en Canvas** (< 800 KB, validadas por `firestore.rules`). Siempre pasa cualquier imagen subida por el usuario por el compresor (`DB.compressImage` o el Canvas del Cropper) antes de guardarla en Firestore.
6. **Diseño Mobile-First y Tematizado**:
   - Usa siempre las variables CSS definidas en `:root` (`--bg-gradient`, `--card-bg`, `--button-bg`, `--accent-color`, `--text-primary`, `--text-secondary`, `--on-surface`) para que cualquier componente nuevo se adapte automáticamente a las 4 paletas de capítulos (`data-chapter="1..4"`).
7. **Comandos de Despliegue**:
   - Para desplegar cambios a producción en Firebase Hosting y/o actualizar reglas de Firestore, ejecuta desde la carpeta `DigitalReaderOverflow`:
     ```bash
     firebase deploy
     ```
   - O únicamente para reglas de base de datos:
     ```bash
     firebase deploy --only firestore:rules
     ```
