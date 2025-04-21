# POS 2025 - Plugin para WooCommerce

> Añade funcionalidades personalizadas a WooCommerce: TPV (Punto de Venta), Calendario, Proveedores, Suscripciones y Crédito.

[![Versión del Plugin](https://img.shields.io/badge/Versión-1.0.2-blue)](https://github.com/[TU_USUARIO_GITHUB]/[TU_REPOSITORIO])
[![Licencia](https://img.shields.io/badge/Licencia-GPLv2%2B-green)](https://www.gnu.org/licenses/gpl-2.0.html)
[![WordPress Compatible](https://img.shields.io/badge/WordPress-%3E%3D5.8-blue)](https://wordpress.org/download/)
[![WooCommerce Compatible](https://img.shields.io/badge/WooCommerce-%3E%3D6.0%20(Probado%208.x)-purple)](https://woocommerce.com/)
[![PHP Compatible](https://img.shields.io/badge/PHP-%3E%3D7.4-blue)](https://www.php.net/)

Este plugin extiende WooCommerce añadiendo un sistema de Punto de Venta (TPV) integrado y otras funcionalidades clave para gestionar negocios físicos y online de forma unificada.

## Descripción Detallada

POS 2025 busca centralizar operaciones comerciales dentro de tu panel de WordPress/WooCommerce. Incluye módulos para:

*   **Punto de Venta (TPV):** Una interfaz rápida y sencilla para registrar ventas en persona directamente desde el administrador de WordPress.
*   **Calendario:** (Descripción de la funcionalidad del calendario, si está implementada)
*   **Proveedores:** (Descripción de la gestión de proveedores, si está implementada)
*   **Suscripciones:** (Descripción de la funcionalidad de suscripciones, si está implementada o si se integra con WooCommerce Subscriptions)
*   **Crédito de Cliente:** (Descripción del sistema de crédito, si está implementado)

Además, mejora la interfaz de administración de pedidos de WooCommerce para identificar fácilmente las ventas realizadas a través del TPV.

## Características Principales

*   Interfaz de Punto de Venta (TPV) integrada en el admin de WordPress.
*   API REST personalizada para la comunicación con la interfaz del TPV.
*   [Añadir aquí otras características principales de los módulos de Calendario, Proveedores, Suscripciones, Crédito cuando estén implementadas]
*   Añade una columna "Origen Venta" en la lista de pedidos de WooCommerce para identificar ventas del TPV.
*   Muestra información relevante del TPV en un metabox dedicado en la página de edición del pedido.
*   Oculta automáticamente los metadatos internos del TPV (`_pos_*`) de la vista genérica de "Campos Personalizados".
*   Declaración de compatibilidad con HPOS (High-Performance Order Storage) de WooCommerce.
*   Preparado para traducción (Text Domain: `pos2025`).

## Requisitos

*   **WordPress:** 5.8 o superior
*   **PHP:** 7.4 o superior
*   **WooCommerce:** 6.0 o superior (Probado hasta la versión 8.x)

**¡Importante!** WooCommerce debe estar instalado y activo para que POS 2025 funcione.

## Instalación

Puedes instalar el plugin de varias maneras:

**1. Subiendo el archivo ZIP (Método recomendado para usuarios):**

1.  Descarga la última versión del plugin como archivo `.zip` desde la [página de Releases de GitHub](https://github.com/[TU_USUARIO_GITHUB]/[TU_REPOSITORIO]/releases).
2.  Ve a tu panel de administración de WordPress: `Plugins` > `Añadir nuevo`.
3.  Haz clic en `Subir plugin`.
4.  Selecciona el archivo `.zip` descargado y haz clic en `Instalar ahora`.
5.  Activa el plugin.

**2. Desde el repositorio de WordPress.org (Si lo publicas allí):**

1.  Ve a `Plugins` > `Añadir nuevo`.
2.  Busca "POS 2025".
3.  Haz clic en `Instalar ahora` y luego en `Activar`.

**3. Manualmente vía FTP/SFTP:**

1.  Descarga el archivo `.zip` y descomprímelo.
2.  Sube la carpeta `pos2025` resultante al directorio `/wp-content/plugins/` de tu instalación de WordPress.
3.  Ve a `Plugins` en tu panel de administración y activa "POS 2025".

**4. Usando Git (Para desarrolladores):**

1.  Clona este repositorio directamente en tu carpeta `wp-content/plugins/`:
    ```bash
    git clone https://github.com/[TU_USUARIO_GITHUB]/[TU_REPOSITORIO].git pos2025
    ```
2.  Ve a `Plugins` en tu panel de administración y activa "POS 2025".

**Recuerda:** Asegúrate de que WooCommerce esté instalado y activo *antes* de activar POS 2025.

## Uso Básico

1.  Una vez activado, busca el nuevo menú del TPV en tu panel de administración de WordPress (por ejemplo, bajo "WooCommerce" o un nuevo menú principal llamado "POS 2025" - *[Especifica aquí dónde aparece el menú del TPV]*).
2.  Accede a la interfaz del TPV para empezar a registrar ventas.
3.  En la lista de pedidos de WooCommerce (`WooCommerce` > `Pedidos`), verás la nueva columna "Origen Venta" que indicará "POS: Directa" (u otros tipos) para los pedidos creados desde el TPV.
4.  Al editar un pedido creado desde el TPV, encontrarás un metabox llamado "[Nombre del Metabox - ej: Datos Venta POS]" con información específica de esa venta.

*[Añade aquí más detalles sobre cómo usar las otras funcionalidades: Calendario, Proveedores, etc., cuando estén disponibles]*

## Capturas de Pantalla

*(Aquí puedes añadir imágenes de la interfaz del TPV, la columna personalizada, el metabox, etc. Usa la sintaxis de Markdown para imágenes: `!Texto alternativo`)*

**Ejemplo:**
`!Interfaz del TPV`
`!Columna Origen Venta`

## Desarrollo y Contribuciones

Este proyecto se gestiona en GitHub. Si encuentras algún error, tienes alguna sugerencia o quieres contribuir al código:

1.  **Reportar Errores (Issues):** Por favor, revisa si ya existe un issue similar antes de crear uno nuevo. Describe el problema detalladamente, incluyendo pasos para reproducirlo, versión de WP/WC/PHP y capturas de pantalla si es posible. Abre un issue [aquí](https://github.com/[TU_USUARIO_GITHUB]/[TU_REPOSITORIO]/issues).
2.  **Pull Requests:** Las contribuciones son bienvenidas. Por favor, sigue las WordPress Coding Standards y asegúrate de que tu código está bien documentado. Realiza tus cambios en una rama separada y crea un Pull Request hacia la rama `main` (o `develop` si la usas).

## Soporte

Para soporte general o preguntas sobre el uso del plugin, por favor, utiliza la sección de [Issues de GitHub](https://github.com/[TU_USUARIO_GITHUB]/[TU_REPOSITORIO]/issues).

*[Opcional: Añade aquí otros canales de soporte si los tienes, como un foro, email, etc.]*

## Licencia

POS 2025 es software libre. Puedes redistribuirlo y/o modificarlo bajo los términos de la Licencia Pública General GNU v2 o posterior publicada por la Free Software Foundation.

## Historial de Versiones (Changelog)

**1.0.2 (Fecha - [DD/MM/AAAA])**
*   Declaración de compatibilidad con HPOS.
*   Mejora: Ocultar metadatos `_pos_*` del metabox genérico de campos personalizados.
*   Mejora: Añadida columna "Origen Venta" a la lista de pedidos (compatible con interfaz clásica y HPOS).
*   Refactorización menor y limpieza de código.

**1.0.1 (Fecha - [DD/MM/AAAA])**
*   [Descripción de los cambios de la versión 1.0.1]

**1.0.0 (Fecha - [DD/MM/AAAA])**
*   Lanzamiento inicial del plugin.
*   Funcionalidad básica de TPV.
*   Endpoints API REST iniciales.
*   Metabox básico en pedidos.

---

*Desarrollado por [Tu Nombre o Empresa]([https://tu-web.com])*
