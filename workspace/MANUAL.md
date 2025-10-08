# Manual de Usuario: GestiónGo

---

## 1. Inicio de Sesión y Primer Acceso

El inicio de sesión es el portal de entrada a **GestiónGo**. Cada usuario accederá con sus credenciales únicas, las cuales determinarán las funcionalidades y vistas a las que tendrá permiso dentro de la aplicación.

### Acceso al Sistema

Para ingresar a la aplicación, sigue estos pasos:

1.  **Correo Electrónico:** Ingresa el correo electrónico con el que fuiste registrado en el sistema.
2.  **Contraseña:** Escribe tu contraseña personal. Por seguridad, los caracteres no se mostrarán en pantalla.
3.  Haz clic en el botón **"Iniciar Sesión"**.

Al autenticarte correctamente, el sistema te redirigirá automáticamente a la pantalla principal correspondiente a tu rol asignado (por ejemplo, el Dashboard para administradores o la lista de Despachos para un motorista).

**¿Olvidaste tu contraseña?**
Si no recuerdas tu contraseña, puedes hacer clic en el enlace **"¿Olvidaste tu contraseña?"** para iniciar el proceso de recuperación.

![Vista de Inicio de Sesión](https://placehold.co/600x400?text=Login+Screen)

---

### Caso Especial: Creación del Primer Usuario Administrador

Si es la primera vez que se ejecuta la aplicación en un entorno nuevo y no existe ningún usuario en la base de datos, el sistema lo detectará automáticamente y mostrará un formulario especial.

**Propósito:**
Este formulario está diseñado para crear el **primer usuario**, al cual se le asignará automáticamente el rol de **ADMIN**. Este usuario tendrá todos los permisos para configurar el resto del sistema, incluyendo la creación de otros usuarios y roles.

**Pasos para el primer usuario:**
1.  **Nombre Completo:** Ingresa tu nombre.
2.  **Correo Electrónico:** Define el correo que usarás para acceder.
3.  **Contraseña:** Crea una contraseña segura.
4.  Haz clic en **"Crear Usuario Administrador"**.

Una vez creado, serás redirigido a la pantalla de inicio de sesión normal para que puedas acceder con tus nuevas credenciales.
---

### 2. Vista General: Dashboard (Rol: Administrador)

Al iniciar sesión como Administrador, la primera pantalla que verás es el **Dashboard**. Esta es tu central de operaciones y el punto de partida para navegar por todas las funcionalidades clave de **GestiónGo**.

**¿Qué encontrarás aquí?**

El Dashboard está diseñado para ser intuitivo y eficiente, presentando una serie de **tarjetas de acceso directo**. Cada tarjeta representa una sección principal de la aplicación y te permite saltar directamente a ella con un solo clic.

Las secciones principales incluyen:
*   **Clientes:** Para administrar tu base de clientes.
*   **Despachos:** Para organizar y seguir las rutas de entrega.
*   **Facturación:** Para gestionar todas las facturas del sistema.
*   **Asignar Facturas:** Para asociar facturas a despachos específicos.
*   **Mapa en Vivo:** Para monitorear la ubicación de los motoristas en tiempo real.
*   **Configuración:** Para administrar parámetros del sistema como términos de pago o impuestos.

**Propósito Principal:**
El objetivo del Dashboard es **simplificar la navegación y agilizar tu flujo de trabajo**, permitiéndote acceder a las herramientas más importantes de forma rápida y visual.

![Vista del Dashboard de Administrador](https://placehold.co/600x400?text=Admin+Dashboard)
---

### 3. Vista General: Módulo de Facturación (Rol: Facturacion)

Si tu rol es **Facturacion**, tu pantalla de inicio es directamente el módulo de **Facturación**. Esta es tu área de trabajo principal, diseñada para que gestiones todos los documentos de cobro de manera centralizada antes de que salgan a reparto.

**¿Qué encontrarás aquí?**

Tu vista principal es una tabla completa que muestra todas las facturas del sistema. Desde aquí, puedes realizar todas las tareas relacionadas con la creación y administración de estos documentos.

Tus funciones clave en esta pantalla son:

*   **Creación y Edición:** Puedes generar **nuevas facturas** una por una, llenando todos los detalles necesarios, o **editar** la información de facturas ya existentes.
*   **Importación Masiva:** Una de las herramientas más potentes a tu disposición. Te permite cargar cientos o miles de facturas de una sola vez desde un archivo **Excel (.xlsx)**, agilizando enormemente el proceso de ingreso de datos.
*   **Búsqueda y Filtrado:** Localiza rápidamente cualquier factura usando la barra de búsqueda (por número de factura, referencia o cliente) o aplica filtros por fecha para acotar los resultados.
*   **Paginación Eficiente:** La tabla está optimizada para manejar grandes volúmenes de información, cargando las facturas por páginas para mantener la aplicación rápida y fluida.

**Propósito Principal:**
Esta vista es tu centro de operaciones para preparar todos los documentos que, en un paso posterior, serán organizados y asignados a los motoristas en el módulo de **"Facturación por Despacho"**.

![Vista del Módulo de Facturación](https://placehold.co/600x400?text=Invoicing+Module+Screen)
---

### 4. Vista General: Mis Despachos (Rol: Motorista)

Al iniciar sesión como **Motorista** o **Auxiliar**, serás dirigido directamente a tu hoja de ruta: la pantalla de **Despachos**. Esta vista está personalizada para mostrar únicamente los viajes que te han sido asignados.

**¿Qué encontrarás aquí?**

Verás una lista clara y concisa de tus despachos pendientes o del día. Cada fila en la tabla representa un viaje completo, con la información esencial que necesitas de un vistazo:

*   **ID del Despacho:** Un identificador único para tu viaje.
*   **Ruta:** El nombre de la zona que cubrirás.
*   **Fecha:** El día programado para la entrega.
*   **Totales:** Un resumen de los montos a gestionar.

**Tu Flujo de Trabajo:**

1.  **Identifica tu Despacho:** Ubica el despacho que vas a realizar (generalmente el del día de hoy).
2.  **Accede al Detalle:** Haz clic en el ícono del ojo (<span style="font-family: 'Lucida Sans', 'Lucida Sans Regular', 'Lucida Grande', 'Lucida Sans Unicode', Geneva, Verdana, sans-serif;">👁️</span>) para navegar a la pantalla de **"Detalle de Despacho"**.
3.  **Inicia tu Recorrido:** En la pantalla de detalle es donde comienza la acción. Aquí podrás **iniciar el recorrido** (activando el seguimiento GPS), ver la lista de clientes, registrar entregas y pagos, y mucho más.

**Propósito Principal:**
Esta vista es tu punto de partida para cada jornada. Te permite organizarte y acceder rápidamente a los detalles de cada ruta de entrega que tienes asignada, sin distracciones de otros despachos.

![Vista de Despachos para Motorista](https://placehold.co/600x400?text=Driver+Shipments+View)
---
### 9. Mapa en Vivo

El módulo de **Mapa en Vivo** es el centro de monitoreo en tiempo real de la aplicación. Ofrece una vista geográfica interactiva que permite a los administradores y supervisores hacer un seguimiento preciso de las operaciones de reparto a medida que ocurren.

**¿Qué encontrarás aquí?**

Al seleccionar un despacho específico por fecha, el mapa se puebla con varias capas de información visual que, en conjunto, ofrecen una imagen completa del progreso de la ruta.

*   **Filtro por Despacho:** La funcionalidad principal de esta vista es la capacidad de seleccionar un despacho activo o pasado. Al hacerlo, todos los datos geográficos que se muestran en el mapa corresponderán exclusivamente a ese viaje.

*   **Capas de Información Geográfica:**
    *   **Ruta Planificada (Línea Azul):** Muestra un trazado optimizado que conecta la bodega con las ubicaciones de todos los clientes asignados a ese despacho. Representa la ruta ideal que el motorista debería seguir.
    *   **Recorrido Real del Despacho (Línea Naranja):** Dibuja el camino exacto que el motorista ha seguido. Este trazado se basa en el historial de ubicaciones GPS que el sistema ha grabado **específicamente para este despacho**, desde que el motorista presionó "Iniciar Recorrido" hasta que lo finalizó.
    *   **Ubicación Actual del Motorista:** Un ícono distintivo (un vehículo) muestra la posición más reciente del motorista en el mapa, actualizándose periódicamente.
    *   **Puntos de Entrega (Marcadores):** La ubicación de cada cliente en la ruta se indica con un marcador numerado, permitiendo una fácil identificación del orden de visita. Los marcadores cambian de color para reflejar su estado:
        *   **Verde:** Entrega completada (factura pagada o con comprobante).
        *   **Rojo:** Entrega pendiente.

**Propósito Principal:**
Esta herramienta proporciona una supervisión visual y en tiempo real, permitiendo tomar decisiones informadas, verificar el cumplimiento de las rutas, y tener una visibilidad completa del estado de las operaciones de campo.

![Vista del Mapa en Vivo](https://placehold.co/600x400?text=Live+Tracking+Map)
