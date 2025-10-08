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

### 5. Facturación

El módulo de **Facturación** es la interfaz dedicada a la gestión integral de todos los documentos fiscales individuales. Aquí se pueden crear, consultar, modificar y eliminar facturas antes de que sean asignadas a un despacho para su entrega. Es una herramienta clave para el personal administrativo y de facturación.

**Funcionalidades Principales:**

*   **Gestión Integral de Facturas (CRUD):** Permite realizar el ciclo completo de operaciones sobre las facturas, incluyendo su creación, edición y eliminación de forma individual.

*   **Búsqueda y Filtrado:** Para una localización eficiente de documentos, el módulo ofrece:
    *   **Búsqueda por Texto:** Se puede buscar una factura por su número, número de referencia o por el cliente asociado.
    *   **Filtros por Fecha:** Es posible acotar la lista de facturas por su **fecha de entrega** o por la **fecha en que fueron importadas** al sistema.

*   **Paginación del Lado del Servidor:** La interfaz está optimizada para manejar un gran volumen de facturas de manera eficiente. La paginación del lado del servidor asegura que la aplicación se mantenga rápida y responsiva, sin importar la cantidad de registros.

*   **Importación Masiva desde Excel:** Esta potente funcionalidad facilita la carga de grandes volúmenes de facturas directamente desde un archivo `.xlsx`. El sistema es capaz de procesar el archivo y cruzar la información para asignar automáticamente datos clave como el nombre del cliente, su ruta y su término de pago, basándose en el código de cliente proporcionado en el archivo.

*   **Selector de Cliente Asíncrono:** Al crear o editar una factura manualmente, el campo de cliente es un buscador inteligente. Permite buscar en tiempo real en toda la base de datos de clientes sin necesidad de cargar la lista completa, haciendo que la selección sea rápida y eficiente.

![Vista de Gestión de Facturas](https://placehold.co/600x400?text=Invoicing+Screen)
---

### **Facturación por Despacho**

Este módulo es el puente operativo entre la facturación y la logística de reparto. Su propósito principal es **construir el manifiesto de cada despacho**, asignando de manera eficiente las facturas que deben ser entregadas en una ruta específica.

**Funcionalidades Principales:**

*   **Asignación Masiva Inteligente:** Esta es la herramienta central para la construcción rápida de un despacho.
    *   Al seleccionar un despacho de la lista, el sistema filtra y presenta automáticamente todas las facturas que están disponibles para ser asignadas a esa ruta y fecha.
    *   **Criterios de Filtro Automático:**
        1.  La fecha de la factura debe coincidir con la fecha del despacho.
        2.  La factura no debe estar ya asignada a otro despacho.
        3.  El cliente de la factura debe estar geográficamente dentro de la geocerca de la ruta del despacho (o bien, el cliente no debe tener una geocerca asignada, permitiendo su inclusión manual).
    *   Esta lógica asegura que solo se muestren las facturas pertinentes, permitiendo al usuario seleccionar múltiples documentos y asignarlos al despacho con un solo clic.

*   **Gestión de Asignaciones Individuales:**
    *   Una vez que las facturas están asignadas, se muestran en una tabla detallada. Desde aquí, los usuarios pueden gestionar cada factura de manera individual, ya sea para **editar** detalles como el registro de un pago o la subida de un comprobante, o para **eliminar** la factura del despacho si fue asignada por error.

*   **Sincronización Automática de Totales:**
    *   El sistema mantiene la integridad de los datos en todo momento. Cada vez que se añade, modifica o elimina una factura de un despacho, el sistema **recalcula y actualiza automáticamente los totales** (contado, crédito y general) en el registro del despacho correspondiente. Esto asegura que los montos que ve el motorista y los que se reflejan en los informes sean siempre precisos.

![Vista de Asignación de Facturas a Despacho](https://placehold.co/600x400?text=Shipment+Invoicing+Screen)
---

### Módulo de Despachos

El módulo de **Despachos** es el centro neurálgico para la planificación, asignación y seguimiento de las rutas de entrega. Esta interfaz se adapta dinámicamente según el rol del usuario, mostrando la información más relevante para cada perfil, desde la vista global del administrador hasta la lista de tareas diaria del motorista.

**Funcionalidades Principales:**

*   **Visualización de Despachos:** Presenta una tabla con todos los despachos pertinentes, incluyendo información clave como ID, ruta, personal asignado (motorista y auxiliar), fecha y totales monetarios.

*   **Gestión de Despachos (CRUD):** Los usuarios con los permisos adecuados pueden crear nuevos despachos, editar los existentes para ajustar detalles, o eliminarlos.

*   **Filtrado Inteligente por Rol:** La funcionalidad de filtro se ajusta automáticamente según el rol del usuario:
    *   **Administradores:** Pueden visualizar todos los despachos, o filtrar la lista para ver los de "hoy" o los de una fecha específica, permitiendo una supervisión completa.
    *   **Roles de Revisión (Bodega, Cobros, etc.):** El filtro cambia para mostrar los despachos "Pendientes" de su revisión o los que ya han sido "Revisados", agilizando su flujo de trabajo específico.

*   **Lógica de Acceso por Rol:** La vista y las acciones disponibles están estrictamente controladas por el rol del usuario:
    *   **Motoristas y Auxiliares:** Solo pueden ver los despachos a los que han sido asignados, proporcionando una vista clara de sus responsabilidades diarias.
    *   **Administradores:** Tienen acceso total para gestionar y supervisar todos los despachos del sistema.

*   **Acceso a la Vista Detallada:** Cada despacho en la tabla incluye un acceso directo (<span style="font-family: 'Lucida Sans', 'Lucida Sans Regular', 'Lucida Grande', 'Lucida Sans Unicode', Geneva, Verdana, sans-serif;">👁️</span>) que lleva a la página de **Detalle de Despacho**, donde se realiza la gestión operativa de la ruta (iniciar recorrido, registrar entregas, etc.).

![Vista del Módulo de Despachos](https://placehold.co/600x400?text=Shipments+List+Screen)

---
### **Detalle de Despacho**

Esta es la pantalla más dinámica y operativa del sistema, donde se gestiona el progreso de un despacho en tiempo real. Es la principal herramienta de trabajo para los motoristas y un punto de consulta clave para los supervisores.

**Funcionalidades Principales:**

*   **Inicio y Fin de Recorrido:**
    *   Para los motoristas, esta pantalla presenta los botones críticos **"Iniciar Recorrido"** y **"Finalizar Recorrido"**.
    *   Al **iniciar**, el sistema comienza a grabar el historial de ubicaciones GPS asociado **exclusivamente a este despacho**. Una validación de seguridad impide iniciar un nuevo recorrido si ya existe otro activo, garantizando un seguimiento por viaje único.
    *   Al **finalizar**, el rastreo para este despacho se detiene.

*   **Información General:** Muestra un resumen del despacho, incluyendo la ruta, el personal asignado, la fecha y los totales de pago actualizados.

*   **Estado del Proceso:** Presenta una serie de insignias visuales que indican qué etapas del proceso de revisión han sido completadas (Bodega, Reparto, Cobros, etc.), ofreciendo una vista rápida del estado administrativo del despacho.

*   **Listado de Facturas Agrupadas:** Para una mayor claridad, las facturas asociadas al despacho se organizan en tablas separadas según el tipo de cliente ("Crédito Fiscal" y "Consumidor Final").

*   **Registro de Pagos y Entregas:** Permite editar cada factura individualmente para:
    *   Registrar el **monto pagado** y la **forma de pago** (Efectivo, Tarjeta, etc.).
    *   Marcar el **estado** de la entrega como "Pagado".
    *   Subir una **imagen del comprobante** de pago desde los archivos del dispositivo o **capturar una foto directamente con la cámara**.

*   **Restricción por Geocerca:** Para los motoristas, las acciones de editar o tomar una foto solo se habilitan si su ubicación GPS se encuentra dentro de la geocerca del cliente. Si el cliente no tiene una geocerca definida, el sistema guarda la ubicación actual del motorista al momento de la acción.

*   **Generación de Informe PDF:** Un botón permite generar y previsualizar un informe completo del despacho en formato PDF, listo para ser descargado o impreso.

*   **Orden de Visita y Exportación:**
    *   **Ver Orden de Visita:** Un botón permite al motorista consultar una lista ordenada de los clientes que debe visitar, basada en la secuencia de entrega óptima (sea manual o calculada por el sistema).
    *   **Exportar Ruta a Google Maps:** Permite exportar la ruta optimizada con todos los puntos de entrega a la aplicación de Google Maps para facilitar la navegación GPS.

![Vista de Detalle de Despacho](https://placehold.co/600x400?text=Shipment+Detail+Screen)
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
```