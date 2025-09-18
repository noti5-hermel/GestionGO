# GestiónGo: Aplicación de Gestión Integral

GestiónGo es una aplicación web completa construida con Next.js y Supabase, diseñada para proporcionar una solución robusta para la gestión de clientes, facturación, despachos y más. La interfaz está creada con Shadcn/ui y Tailwind CSS para una experiencia de usuario moderna y adaptable.

## Stack Tecnológico

- **Framework**: [Next.js](https://nextjs.org/) (con App Router)
- **Lenguaje**: [TypeScript](https://www.typescriptlang.org/)
- **Base de Datos y Backend**: [Supabase](https://supabase.io/) (PostgreSQL, Autenticación, Storage, Geometría con PostGIS)
- **UI**: [Shadcn/ui](https://ui.shadcn.com/)
- **Estilos**: [Tailwind CSS](https://tailwindcss.com/)
- **Gestión de Formularios**: [React Hook Form](https://react-hook-form.com/) y [Zod](https://zod.dev/)
- **Mapas**: [React-Leaflet](https://react-leaflet.js.org/) y [OpenStreetMap](https://www.openstreetmap.org/)
- **Inteligencia Artificial**: [Genkit](https://firebase.google.com/docs/genkit) (para futuras integraciones)

## Características Principales

- **Autenticación y Roles de Usuario**: Sistema de login seguro con gestión de roles (Admin, Motorista, Auxiliar, etc.). La interfaz se adapta según los permisos del rol.
- **Gestión de Clientes (CRUD)**: Creación, lectura, actualización y eliminación de clientes con paginación del lado del servidor.
- **Gestión de Facturación (CRUD)**: Creación, lectura, actualización y eliminación de facturas con paginación y búsqueda.
- **Gestión de Despachos**: Planificación y seguimiento de despachos por etapas (Bodega, Reparto, Cobros, etc.), con vistas personalizadas y filtros según el rol del usuario.
- **Asignación de Facturas por Despacho**: Interfaz para asociar facturas a un despacho específico, con lógica para filtrar facturas disponibles por fecha y geocerca de la ruta.
- **Registro de Pagos y Comprobantes**: Funcionalidad para registrar pagos, actualizar el estado de las facturas y subir imágenes (comprobantes de pago) a Supabase Storage. Incluso permite capturar fotos directamente desde la cámara.
- **Geocercas y Geoposicionamiento**:
    - **Gestión de Geocercas**: Módulo para crear y asignar geometrías (polígonos) a clientes y rutas.
    - **Mapa de Seguimiento en Tiempo Real**: Visualización en vivo de la ubicación de los motoristas en un mapa, con actualizaciones en tiempo real a través de Supabase Realtime.
    - **Generación de Rutas**: Herramienta para seleccionar clientes con geocerca y generar una URL de ruta optimizada en Google Maps.
    - **Restricción por Geocerca**: Los motoristas solo pueden registrar entregas si se encuentran físicamente dentro de la geocerca del cliente.
- **Configuraciones**: Módulos para gestionar entidades como Rutas, Vehículos, Términos de Pago e Impuestos.
- **Importación de Datos**: Capacidad para importar datos masivamente desde archivos Excel en los módulos de Clientes y Facturación, con validación de datos robusta.
- **Generación de PDF**: Creación de informes de despacho en formato PDF listos para descargar o imprimir.

---

## Guía de Inicio Rápido

Sigue estos pasos para configurar y ejecutar el proyecto en tu entorno de desarrollo local.

### Prerrequisitos

- [Node.js](https://nodejs.org/) (versión 20.x o superior)
- [npm](https://www.npmjs.com/) o [yarn](https://yarnpkg.com/)

### 1. Instalación de Dependencias

Una vez que tengas el código del proyecto, instala todas las dependencias necesarias ejecutando:

```bash
npm install
```

### 2. Configuración de Variables de Entorno

Para que la aplicación se conecte a Supabase, necesitas proporcionar tus credenciales del proyecto.

1.  Crea un archivo llamado `.env.local` en la raíz del proyecto.
2.  Añade las siguientes variables a este archivo, reemplazando los valores de ejemplo con tus propias claves de Supabase:

    ```env
    # URL de tu proyecto de Supabase (la encuentras en Project Settings > API)
    NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co

    # Clave anónima pública de tu proyecto (la encuentras en Project Settings > API)
    NEXT_PUBLIC_SUPABASE_ANON_KEY=ey...

    # Clave secreta para hashear contraseñas (puedes generar una tú mismo)
    # Ejemplo: openssl rand -hex 32 en tu terminal
    NEXT_PUBLIC_HMAC_SECRET_KEY=tusecretoaquisuperseguro1234567890
    ```

    **Importante**: Puedes encontrar la `URL` y la `anon key` en el panel de tu proyecto de Supabase, en la sección **Settings > API**.

### 3. Ejecutar la Aplicación

Con las dependencias instaladas y las variables de entorno configuradas, inicia el servidor de desarrollo:

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:9002` (o el puerto que hayas configurado).

### 4. Primer Inicio de Sesión

La primera vez que ejecutes la aplicación, no habrá usuarios en la base de datos. La página de login detectará esto y te mostrará un formulario especial para crear el primer usuario con el rol **ADMIN**. Una vez creado, podrás iniciar sesión con esas credenciales.
