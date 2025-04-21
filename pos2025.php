<?php
/**
 * Plugin Name:       POS 2025
 * Plugin URI:        https://tu-web.com/pos2025
 * Description:       Añade funcionalidades personalizadas a WooCommerce: TPV, Calendario, Proveedores, Suscripciones y Crédito.
 * Version:           1.0.2
 * Author:            Tu Nombre o Empresa
 * Author URI:        https://tu-web.com
 * License:           GPL v2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       pos2025
 * Domain Path:       /languages
 * Requires at least: 5.8
 * Requires PHP:      7.4
 * WC requires at least: 6.0
 * WC tested up to: 8.x
 */

// Prevenir acceso directo al archivo.
defined( 'ABSPATH' ) || exit;

// =============================================================================
// Constantes del Plugin
// =============================================================================
define( 'POS2025_VERSION', '1.0.2' ); // Incrementar versión si hay cambios
define( 'POS2025_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'POS2025_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'POS2025_PLUGIN_FILE', __FILE__ );
define( 'POS2025_PLUGIN_BASENAME', plugin_basename( __FILE__ ) );

// =============================================================================
// Carga Principal y Comprobación de Dependencias
// =============================================================================

/**
 * Inicializa el plugin después de que todos los plugins se hayan cargado.
 * Comprueba si WooCommerce está activo.
 */
function pos2025_init() {
    // Comprobar si WooCommerce está activo.
    if ( ! class_exists( 'WooCommerce' ) ) {
        add_action( 'admin_notices', 'pos2025_woocommerce_missing_notice' );
        return; // Detener la carga si falta WooCommerce.
    }

    // Cargar las funcionalidades principales del plugin.
    pos2025_load_plugin_components();
}
add_action( 'plugins_loaded', 'pos2025_init', 10 );

/**
 * Muestra un aviso en el panel de administración si WooCommerce no está activo.
 */
function pos2025_woocommerce_missing_notice() {
    ?>
    <div class="notice notice-error is-dismissible">
        <p><strong><?php esc_html_e( 'POS 2025 Inactivo:', 'pos2025' ); ?></strong> <?php esc_html_e( 'El plugin requiere que WooCommerce esté instalado y activo.', 'pos2025' ); ?></p>
    </div>
    <?php
}

/**
 * Carga los diferentes componentes y archivos del plugin.
 * Se llama únicamente si WooCommerce está activo.
 */
function pos2025_load_plugin_components() {

    // Cargar archivos de funcionalidades principales.
    //require_once POS2025_PLUGIN_DIR . 'includes/functions.php'; // Archivo para funciones auxiliares generales (si lo creas).
    require_once POS2025_PLUGIN_DIR . 'admin/pos-page.php'; // Define la interfaz del TPV y encola assets.
    require_once POS2025_PLUGIN_DIR . 'api/pos-api-routes.php'; // Define los endpoints de la API REST.
    require_once POS2025_PLUGIN_DIR . 'includes/metabox-order-pos-data.php'; // Añade el metabox a la edición de pedidos.
    // require_once POS2025_PLUGIN_DIR . 'includes/cpt-subscriptions.php'; // Descomentar si se vuelve a usar el CPT.

    // Cargar archivos de traducción.
    load_plugin_textdomain(
        'pos2025',
        false, // No buscar archivo .mo global.
        dirname( POS2025_PLUGIN_BASENAME ) . '/languages/' // Ruta relativa a la carpeta de idiomas.
    );

    // Declarar compatibilidad con HPOS (High-Performance Order Storage).
    add_action( 'before_woocommerce_init', function() {
        if ( class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class ) ) {
            \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', POS2025_PLUGIN_FILE, true );
            // Alternativa para WC >= 7.1:
            // \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'high-performance-order-storage', POS2025_PLUGIN_FILE, true );
        }
    } );

    // Cargar las mejoras de la interfaz de administración (columna, ocultar meta).
    pos2025_load_admin_ui_tweaks();

    // Aquí puedes añadir más hooks o cargar otros componentes.
}

// =============================================================================
// Hooks de Activación / Desactivación del Plugin
// =============================================================================

/**
 * Acciones a ejecutar cuando el plugin se activa.
 * Principalmente para limpiar reglas de reescritura.
 */
function pos2025_activate() {
    // (Opcional) Añadir roles o capacidades personalizadas si son necesarias.
    // pos2025_add_custom_roles_and_caps();

    // Limpiar las reglas de reescritura para asegurar que los endpoints de la API funcionen.
    flush_rewrite_rules();
}
register_activation_hook( POS2025_PLUGIN_FILE, 'pos2025_activate' );

/**
 * Acciones a ejecutar cuando el plugin se desactiva.
 * Principalmente para limpiar reglas de reescritura.
 */
function pos2025_deactivate() {
    // (Opcional) Limpiar tareas programadas (cron jobs) si se crearon.
    // wp_clear_scheduled_hook('pos2025_my_cron_hook');

    // Limpiar las reglas de reescritura.
    flush_rewrite_rules();
}
register_deactivation_hook( POS2025_PLUGIN_FILE, 'pos2025_deactivate' );

// =============================================================================
// Mejoras de la Interfaz de Administración de WooCommerce
// =============================================================================

/**
 * Carga o define las funciones y hooks para las mejoras de la UI del admin.
 * Podría moverse a un archivo 'includes/admin-ui-tweaks.php'.
 */
function pos2025_load_admin_ui_tweaks() {

    // --- Añadir Columna "Origen Venta" a la Lista de Pedidos ---

    /**
     * Añade la cabecera de la columna 'Origen Venta'.
     * @param array $columns Columnas existentes.
     * @return array Columnas modificadas.
     */
    function pos2025_add_order_origin_column_header( array $columns ) : array {
        $new_columns = [];
        foreach ( $columns as $key => $value ) {
            $new_columns[$key] = $value;
            if ( 'order_status' === $key ) { // Insertar después de Estado
                $new_columns['pos_sale_origin'] = __( 'Origen Venta', 'pos2025' );
            }
        }
        // Asegurar que la columna se añade si 'order_status' no existe.
        if ( ! isset( $new_columns['pos_sale_origin'] ) ) {
             $new_columns['pos_sale_origin'] = __( 'Origen Venta', 'pos2025' );
        }
        return $new_columns;
    }
    add_filter( 'manage_edit-shop_order_columns', 'pos2025_add_order_origin_column_header', 20 );
    add_filter( 'manage_woocommerce_page_wc-orders_columns', 'pos2025_add_order_origin_column_header', 20 );

    /**
     * Muestra el contenido de la columna 'Origen Venta'.
     * @param string $column Nombre de la columna actual.
     * @param int|WC_Order $post_id_or_order_object ID del pedido o objeto WC_Order.
     */
    function pos2025_render_order_origin_column_content( string $column, $post_id_or_order_object ) : void {
        if ( 'pos_sale_origin' !== $column ) {
            return;
        }

        $order = null;
        if ( $post_id_or_order_object instanceof WC_Order ) { $order = $post_id_or_order_object; }
        elseif ( is_numeric( $post_id_or_order_object ) ) { $order = wc_get_order( $post_id_or_order_object ); }

        if ( $order ) {
            $sale_type = $order->get_meta( '_pos_sale_type', true );
            if ( $sale_type ) {
                $sale_type_labels = [
                    'direct'       => __('Directa', 'pos2025'),
                    'subscription' => __('Suscripción/Evento', 'pos2025'),
                    'credit'       => __('Crédito', 'pos2025'),
                ];
                $sale_type_display = $sale_type_labels[$sale_type] ?? ucfirst( $sale_type );
                // Usar <mark> para un resaltado visual simple.
                echo '<mark class="pos-origin" style="background-color:#f0f0f0; padding: 2px 5px; border-radius: 3px; display: inline-block;"><strong>POS:</strong> ' . esc_html( $sale_type_display ) . '</mark>';
            } else {
                echo '—'; // Guión para pedidos no POS.
            }
        } else {
            echo '—'; // Error al cargar el pedido.
        }
    }
    add_action( 'manage_shop_order_posts_custom_column', 'pos2025_render_order_origin_column_content', 10, 2 );
    add_action( 'manage_woocommerce_page_wc-orders_custom_column', 'pos2025_render_order_origin_column_content', 10, 2 );

    // --- Ocultar Metadatos POS del Metabox Genérico "Desconocido" ---

    /**
     * Marca nuestros metadatos específicos del POS como protegidos.
     * @param bool   $protected Si el meta está protegido por defecto.
     * @param string $meta_key  El meta key.
     * @param string $meta_type El tipo de objeto ('order', 'post', etc.).
     * @return bool True si debe protegerse, false si no.
     */
    function pos2025_hide_pos_meta_keys( bool $protected, string $meta_key, string $meta_type ) : bool {
        // Actuar solo sobre metadatos de pedidos.
        if ( 'order' === $meta_type || ( 'post' === $meta_type && get_post_type() === 'shop_order' ) ) {
            // Ocultar todos los metadatos que comienzan con '_pos_'
            if ( str_starts_with( $meta_key, '_pos_' ) ) { // str_starts_with requiere PHP 8.0+
            // Alternativa para PHP < 8.0: if ( strpos( $meta_key, '_pos_' ) === 0 ) {
                return true; // Marcar como protegido.
            }
        }
        // Devolver el estado original para otros metadatos.
        return $protected;
    }
    add_filter( 'is_protected_meta', 'pos2025_hide_pos_meta_keys', 10, 3 );

} // Fin pos2025_load_admin_ui_tweaks

?>
