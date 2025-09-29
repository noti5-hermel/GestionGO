# Descripción de Funcionalidades del Sistema GestiónGo

Este documento detalla las características principales y el propósito de cada vista dentro de la aplicación.

---

### 1. Dashboard (`/`)

-   **Página de Inicio Principal:** Es la primera vista que ven los administradores al iniciar sesión.
-   **Accesos Directos:** Proporciona una serie de tarjetas interactivas que funcionan como accesos directos a las secciones más importantes y utilizadas de la aplicación, como Clientes, Despachos, Facturación, etc.
-   **Navegación Intuitiva:** Facilita la navegación y mejora la experiencia de usuario al centralizar las funciones clave en un solo lugar.

---

### 2. Clientes (`/customers`)

-   **Gestión Integral (CRUD):** Permite crear, leer, actualizar y eliminar clientes.
-   **Formulario de Edición/Creación:** Un diálogo modal permite añadir nuevos clientes o modificar los existentes. Los campos incluyen código, nombre, ruta, impuesto y término de pago.
-   **Búsqueda y Filtrado Avanzado:** Se puede buscar un cliente por código o nombre. Además, se puede filtrar la lista por ruta, término de pago o tipo de impuesto.
-   **Paginación del Lado del Servidor:** Para manejar grandes volúmenes de datos de manera eficiente, solo se carga la porción de clientes visible en la tabla, mejorando el rendimiento.
-   **Importación Masiva:** Permite subir un archivo Excel (`.xlsx`) para crear o actualizar múltiples clientes de una sola vez, con validación de datos robusta para prevenir errores.
-   **Visualización de Geocerca:** En el modo de edición, se puede ver la información de la geocerca y la última ubicación conocida del cliente (si existen), aunque estos campos son de solo lectura.

---

### 3. Despachos (`/shipments`)

-   **Visualización de Despachos:** Muestra una tabla con todos los despachos, incluyendo ID, ruta, motorista, auxiliar, fecha y totales.
-   **Gestión (CRUD):** Permite crear nuevos despachos, editarlos o eliminarlos.
-   **Filtrado por Fecha y Estado:**
    -   **Para Administradores:** Se puede filtrar la lista para ver todos los despachos, los de "hoy" o los de una fecha específica.
    -   **Para Roles de Revisión (Bodega, Cobros, etc.):** El filtro cambia para mostrar despachos "Pendientes" de revisión o ya "Revisados" por ese rol.
-   **Vista Detallada:** Cada despacho tiene un enlace para navegar a su página de detalle (`/shipments/[id]`).
-   **Lógica de Roles:** La vista y las acciones disponibles se adaptan según el rol del usuario.
    -   **Motoristas/Auxiliares:** Solo ven los despachos a los que están asignados.
    -   **Roles de Revisión:** Ven una lista filtrada por el estado de su etapa en el proceso.
    -   **Administradores:** Tienen control total.

---

### 4. Detalle de Despacho (`/shipments/[id]`)

-   **Página Central de Operaciones:** Esta es la vista más importante para la gestión diaria del reparto.
-   **Inicio y Fin de Recorrido:**
    -   Para los motoristas, se muestran los botones **"Iniciar Recorrido"** y **"Finalizar Recorrido"**.
    -   Al iniciar, el sistema comienza a grabar el historial de ubicaciones asociado **exclusivamente a ese despacho**.
    -   Al finalizar, el rastreo para ese despacho se detiene. Esto permite un seguimiento preciso por cada viaje.
-   **Información General:** Muestra un resumen del despacho, incluyendo ruta, personal asignado, fecha y totales de pago.
-   **Estado del Proceso:** Presenta una serie de insignias que muestran qué etapa del proceso ha sido completada (Bodega, Reparto, Cobros, etc.).
-   **Listado de Facturas Agrupadas:** Las facturas asociadas al despacho se dividen en tablas según el tipo de cliente ("Crédito Fiscal" y "Consumidor Final") para mayor claridad.
-   **Registro de Pagos y Entregas:** Permite editar cada factura individualmente para:
    -   Registrar el **monto pagado** y la **forma de pago** (Efectivo, Tarjeta, etc.).
    -   Marcar el **estado** como "Pagado".
    -   Subir una **imagen del comprobante** desde los archivos del dispositivo o **capturar una foto directamente con la cámara**.
-   **Restricción por Geocerca:** Para los motoristas, las acciones de editar o tomar foto solo se habilitan si se encuentran físicamente dentro de la geocerca del cliente. Si el cliente no tiene geocerca, se guarda la ubicación actual del motorista.
-   **Generación de Informe PDF:** Un botón permite generar y previsualizar un informe completo del despacho en formato PDF, listo para descargar.
-   **Exportación de Ruta a Google Maps:** Permite exportar la ruta optimizada de los puntos de entrega a Google Maps para la navegación.

---

### 5. Facturación (`/invoicing`)

-   **Gestión Integral de Facturas (CRUD):** Permite crear, editar y eliminar facturas de forma individual.
-   **Búsqueda y Filtrado:** Se puede buscar por número de factura, referencia o cliente. También se puede filtrar por fecha de entrega y fecha de importación.
-   **Paginación del Lado del Servidor:** Optimizado para manejar miles de facturas sin comprometer el rendimiento de la interfaz.
-   **Importación Masiva desde Excel:** Facilita la carga de grandes volúmenes de facturas desde un archivo `.xlsx`. El sistema cruza la información para asignar automáticamente el nombre del cliente, la ruta y el término de pago basándose en el código del cliente.
-   **Selector de Cliente Asíncrono:** Al crear o editar una factura, el campo de cliente permite buscar en tiempo real en la base de datos sin cargar la lista completa de clientes, mejorando la eficiencia.

---

### 6. Facturación por Despacho (`/shipment-invoicing`)

-   **Asignación de Facturas a Despachos:** Es la interfaz principal para construir un despacho.
-   **Asignación Masiva Inteligente:**
    -   Al seleccionar un despacho, el sistema filtra automáticamente las facturas que están disponibles para ser asignadas.
    -   **Criterios de Filtro:**
        1.  La fecha de la factura debe coincidir con la fecha del despacho.
        2.  La factura no debe estar ya asignada a otro despacho.
        3.  El cliente de la factura debe estar dentro de la geocerca de la ruta del despacho (o no tener geocerca asignada).
    -   Permite seleccionar múltiples facturas y asignarlas todas a la vez.
-   **Gestión de Asignaciones Individuales:** Muestra una tabla con todas las facturas ya asignadas, permitiendo editarlas (registrar pago, subir comprobante) o eliminarlas de un despacho.
-   **Sincronización de Totales:** Cada vez que se añade, modifica o elimina una factura de un despacho, el sistema recalcula automáticamente los totales (contado, crédito, general) del despacho correspondiente.

---

### 7. Geocercas (`/geofences`)

-   **Gestión de Áreas Geográficas:** Permite asignar o actualizar la geometría poligonal (geocerca) de cada cliente.
-   **Formulario de Creación/Edición:** Un diálogo permite seleccionar un cliente y pegar los datos de la geocerca en formato WKT (`POLYGON` o `GEOMETRYCOLLECTION`).
-   **Visualización Rápida:** La tabla principal muestra qué clientes ya tienen una geocerca asignada y cuáles no.
-   **Base para la Logística:** Estas geocercas son fundamentales para la asignación inteligente de facturas en `/shipment-invoicing` y para la validación de ubicación de los motoristas.

---

### 8. Generación de Ruta (`/route-generation`)

-   **Planificación de Rutas Manuales:** Herramienta para crear rutas personalizadas.
-   **Selección de Clientes:** Muestra una lista de todos los clientes que tienen una geocerca definida.
-   **Generación de URL de Google Maps:** Al seleccionar uno o más clientes y hacer clic en "Generar Ruta", el sistema calcula el centroide de cada geocerca y construye una URL para Google Maps con todos los puntos como destinos.
-   **Navegación Externa:** La URL se abre en una nueva pestaña, permitiendo usar la navegación de Google Maps con los puntos seleccionados.

---

### 9. Mapa en Vivo (`/live-map`)

-   **Seguimiento en Tiempo Real:** Muestra un mapa interactivo para el monitoreo de las operaciones.
-   **Filtro por Despacho:** Permite seleccionar un despacho específico por fecha para visualizar su información geográfica.
-   **Capas de Información:**
    -   **Ruta Planificada (Azul):** Muestra un trazado optimizado de la ruta que conecta la bodega con todos los clientes del despacho.
    -   **Recorrido Real del Despacho (Naranja):** Dibuja la ruta que el motorista ha seguido **específicamente para ese despacho**, basándose en el historial de ubicaciones guardado desde que se inició hasta que se finalizó el recorrido.
    -   **Ubicación Actual:** Un ícono de vehículo muestra la posición más reciente del motorista.
    -   **Puntos de Cliente:** Marcadores numerados y coloreados indican la ubicación de cada cliente en la ruta (verde para completado, rojo para pendiente).

---

### 10. Usuarios (`/users`) y Roles (`/user-roles`)

-   **Gestión de Acceso:** Permite crear, editar y eliminar usuarios del sistema.
-   **Asignación de Roles:** A cada usuario se le puede asignar un rol (Admin, Motorista, Bodega, etc.), que define sus permisos y las vistas a las que puede acceder.
-   **Seguridad de Contraseñas:** Las contraseñas se guardan siempre hasheadas (cifradas) utilizando un secreto HMAC-SHA256 para máxima seguridad.
-   **Gestión de Roles:** Una vista separada (`/user-roles`) permite definir los roles disponibles en el sistema.

---

### 11. Configuración (`/settings`)

-   **Parámetros del Sistema:** Un lugar centralizado para gestionar catálogos básicos.
-   **Pestañas de Gestión:**
    -   **Términos de Pago:** Permite añadir, editar o eliminar los términos de pago (ej: "Pago a 30 días", "Contado").
    -   **Impuestos:** Permite gestionar los tipos de impuesto (ej: "Crédito Fiscal", "Consumidor Final") que se asignan a los clientes.
-   **Mantenimiento Sencillo:** Facilita la administración de opciones que se usan en otros módulos como Clientes y Facturación.

---

### 12. Instalar App (`/install`)

-   **Página de Instrucciones PWA:** Ofrece una guía clara y visual para que los usuarios puedan instalar la aplicación en la pantalla de inicio de sus dispositivos móviles (Android e iOS).
-   **Botón de Instalación:** Incluye un botón que intenta disparar la instalación automática si el navegador lo soporta, facilitando el proceso.
