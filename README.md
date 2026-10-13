Para Completar por grupo

🌐 Nombre del Proyecto
Paletas de Hielo

👥 Integrantes
Samara Camila Leon Boyaca(1202760)
Juliana Salazar Mendez (1202755)
Carlos Mateo Chimunja (1203044)

🎯 1. Objetivo General
El proyecto consiste en el desarrollo de una plataforma web para una paletería especializada en la venta y distribución de paletas artesanales. La página está diseñada para facilitar la compra de productos tanto a clientes individuales como a empresas, organizadores de eventos y negocios que requieren pedidos al mayoreo.
La plataforma busca ofrecer una experiencia de compra rápida, intuitiva y visualmente atractiva, permitiendo a los usuarios conocer el catálogo completo de productos, consultar promociones, realizar pedidos en grandes cantidades y solicitar cotizaciones para eventos especiales.


🌍 2. Contexto de Uso
La plataforma está dirigida a clientes particulares que desean adquirir paletas de forma individual, así como a empresas y negocios que requieren compras al por mayor. También está orientada a organizadores de eventos, escuelas, universidades, empresas de catering y organizadores de fiestas infantiles que buscan productos para sus celebraciones. Además, ofrece soluciones para empresas que realizan eventos corporativos y para cualquier persona interesada en contratar un servicio personalizado de paletas para bodas, cumpleaños, graduaciones, reuniones sociales y otras ocasiones especiales. 


📋 3. Requerimientos del Sistema
3.1 Requerimientos Funcionales

Visualización del catálogo de productos. El sistema debe permitir a los usuarios visualizar un catálogo de paletas y gelatinas organizado por categorías (Frutales, Cremosas, Especiales/Gourmet y Temporada), mostrando para cada producto una imagen, nombre, descripción, precio según su tamaño (grande o pequeño) y disponibilidad. 

Búsqueda y filtrado de productos La plataforma debe permitir a los usuarios buscar productos mediante una barra de búsqueda y filtrarlos por categoría para facilitar la localización de las paletas o gelatinas deseadas. 

Selección de cantidad y compra de productos El sistema debe permitir al usuario seleccionar la cantidad de productos mediante controles de incremento y decremento, agregarlos al carrito de compras y generar pedidos tanto individuales como al por mayor. 

Solicitud de cotización para eventos La plataforma debe permitir que los usuarios soliciten una cotización para eventos a través de un formulario donde registren el tipo de evento, número de invitados, fecha, ubicación y datos de contacto. 

Visualización de tipos de eventos El sistema debe mostrar una sección con los servicios disponibles para diferentes tipos de eventos, como cumpleaños, bodas, eventos corporativos, graduaciones, fiestas infantiles y eventos sociales, incluyendo una breve descripción de cada servicio. 

Galería de eventos realizados La plataforma debe mostrar una galería de imágenes con eventos previamente atendidos por la empresa, permitiendo a los usuarios conocer los montajes, carritos de paletas y presentaciones disponibles. 

Formulario de contacto El sistema debe permitir que los usuarios envíen consultas, solicitudes o comentarios mediante un formulario que solicite nombre, correo electrónico, teléfono, tipo de evento y mensaje. 

Gestión de usuarios administradores El sistema debe permitir el acceso mediante autenticación a los administradores de la plataforma, garantizando que únicamente los usuarios autorizados puedan ingresar al panel de administración. 

Gestión de pedidos
El sistema debe permitir al administrador visualizar un listado con todos los pedidos realizados por los clientes, mostrando información como el nombre del cliente, productos solicitados, cantidad, fecha, estado del pedido y total de la compra. 

Actualización del estado de los pedidos El sistema debe permitir al administrador cambiar el estado de un pedido desde el panel de control. Al realizar la actualización, el sistema guardará los cambios directamente en la base de datos para que la información quede disponible en el historial de compras del cliente dentro de la plataforma. 

Gestión de cotizaciones para eventos La plataforma debe permitir al administrador visualizar las solicitudes de cotización de eventos recibidas (con detalles como tipo de evento, número de invitados, fecha, ubicación y datos de contacto), permitiéndole ingresar la respuesta con la propuesta económica y cambiar su estado (Pendiente, Cotizado, Aprobado, Rechazado) para su consulta en el sistema.

Diseño adaptable La plataforma debe adaptarse correctamente a computadoras, tabletas y dispositivos móviles sin afectar la distribución de los elementos ni la funcionalidad de la página. 

Tiempo de respuesta La página debe cargar su contenido principal en un tiempo máximo de tres segundos bajo condiciones normales de conexión a Internet. 

Usabilidad La plataforma debe presentar una interfaz intuitiva con un menú de navegación visible, botones claramente identificados y una estructura que facilite el acceso al catálogo, eventos y formulario de contacto. 

Seguridad de la información El sistema debe proteger los datos personales ingresados por los usuarios en los formularios de contacto y cotización mediante conexiones seguras (HTTPS) y almacenamiento adecuado de la información. 


🧠 4. Diagramas UML

Diagrama de Casos de Uso
Este diagrama representa las interacciones entre los actores del sistema y sus funcionalidades principales. Incluye las acciones que pueden realizar los clientes, como consultar productos, gestionar su compra y solicitar cotizaciones, así como las tareas administrativas relacionadas con pedidos y solicitudes de eventos.

Diagrama de Secuencia
Este diagrama representa el orden temporal de las interacciones entre los participantes del sistema para completar un proceso específico, por ejemplo, la solicitud de una cotización para un evento, desde el ingreso de los datos hasta el registro de la solicitud.

🎨 5. URL del Prototipo
https://www.figma.com/design/yYbdCEPb4kcu9FcK6U2ptk/PROTOTIPO?node-id=4177-20&t=pS4Pk7z6Dpsq69C0-1

🗄️ 6. Diseño de Base de Datos

🧩 7. Documentación del Sistema
El proyecto es un sitio estático (HTML, CSS y JavaScript) sin proceso de compilación.
Cada página vive en la raíz del repositorio y comparte estilos y componentes.

```
paletas/
├── assets/
│   ├── iconos/
│   └── imagenes/
│       ├── paletas/
│       ├── publicidad1.png
│       └── publicidad2.png
├── components/
│   ├── header.html
│   ├── footer.html
│   └── sidebar.html
├── css/
│   └── style.css
├── js/
│   ├── components.js
│   ├── cantidad.js
│   ├── carrito.js
│   └── galeria.js
├── home.html
├── paletas.html
├── mi-carrito.html
├── eventos.html
├── entradaadministrador.html
├── perfiladministrador-*.html
└── README.md
```

### /css

Contiene `style.css`, la hoja de estilos única y compartida por todas las páginas.

- Está organizada por secciones, cada una separada por un comentario con el nombre de la página o del componente (por ejemplo `/* ===== PÁGINA PALETAS: CATÁLOGO ===== */`).
- Los estilos de cada integrante se agregan al final del archivo, para evitar conflictos al unir ramas.
- Las clases siguen una nomenclatura tipo BEM (`bloque__elemento--modificador`), por ejemplo `paleta__nombre` o `cantidad__boton`.
- Incluye utilidades de accesibilidad compartidas, como `.visually-hidden` y `.skip-link`.
- El diseño es responsive: se escribe primero para móvil y se amplía con `@media (min-width: …)`.

### /assets

Contiene los recursos estáticos que usan las páginas.

- **`assets/iconos/`**: íconos del sitio, como los de redes sociales, el carrito y el usuario.
- **`assets/imagenes/`**: imágenes del sitio.
  - **`paletas/`**: fotografías de cada producto (frutas frescas, chamoy, coco, halloween, etc.), en formato PNG con nombres en minúsculas y separados por guiones, sin tildes ni `ñ`.
  - **`publicidad1.png` y `publicidad2.png`**: piezas publicitarias de la columna lateral del catálogo.

### Otras carpetas

- **`/components`**: fragmentos HTML reutilizables (`header`, `footer`, `sidebar`) que se insertan en cada página con `js/components.js`, para no duplicarlos.
- **`/js`**:
  - `components.js` carga los componentes compartidos.
  - `cantidad.js` maneja los controles de cantidad y guarda la selección en `localStorage`.
  - `carrito.js` muestra el carrito y calcula el subtotal.
  - `galeria.js` controla la galería.
- **Raíz**: una página `.html` por vista (`home`, `paletas`, `mi-carrito`, `eventos` y las del perfil de administrador).

🚀 8. Instalación y Ejecución
