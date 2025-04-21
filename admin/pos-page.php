<?php
/**
 * Funciones para crear la página de administración del TPV (POS)
 * Versión: Eliminado modal de cliente y script pos-customer-manager.js
 */

// Si este archivo es llamado directamente, abortar.
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Añade la página del TPV al menú de administración de WordPress.
 */
function pos2025_add_pos_admin_menu() {
    add_menu_page(
        __( 'Terminal Punto de Venta', 'pos2025' ), // Título de la página
        __( 'POS 2025', 'pos2025' ),               // Título del menú
        'manage_woocommerce',                      // Capacidad requerida para verla (puedes ajustarla)
        'pos2025-terminal',                        // Slug único para la página
        'pos2025_render_pos_page',                 // Función que mostrará el contenido de la página
        'dashicons-store',                         // Icono del menú (puedes cambiarlo: https://developer.wordpress.org/resource/dashicons/)
        56                                         // Posición en el menú (cerca de WooCommerce)
    );
}
add_action( 'admin_menu', 'pos2025_add_pos_admin_menu' );

/**
 * Renderiza el contenido HTML de la página del TPV.
 */
function pos2025_render_pos_page() {
    ?>
    <div class="wrap" id="pos2025-wrap">
        <h1><?php esc_html_e( 'Terminal Punto de Venta (POS 2025)', 'pos2025' ); ?></h1>

        <div id="pos2025-app-container">

            <!-- Sección de Búsqueda de Productos -->
            <div id="pos-products-column">
                <div id="pos-search-section">
                    <h2><?php esc_html_e( 'Buscar Productos', 'pos2025' ); ?></h2>
                    <label for="pos-product-search"><?php esc_html_e( 'Buscar por nombre o SKU:', 'pos2025' ); ?></label>
                    <input type="search" id="pos-product-search" name="pos_product_search" placeholder="<?php esc_attr_e( 'Escribe para buscar...', 'pos2025' ); ?>">
                    <button id="pos-search-button" class="button button-primary"><?php esc_html_e( 'Buscar', 'pos2025' ); ?></button>
                    <span class="spinner" style="float: none; vertical-align: middle;"></span> <?php // Spinner de carga de WP ?>
                </div>

                <!-- Sección de Resultados de Productos -->
                <div id="pos-products-results">
                    <h2><?php esc_html_e( 'Resultados', 'pos2025' ); ?></h2>
                    <ul id="pos-products-list">
                        <!-- Los productos encontrados se añadirán aquí dinámicamente -->
                        <li><?php esc_html_e( 'Realiza una búsqueda para ver los productos.', 'pos2025' ); ?></li>
                    </ul>
                    <!-- Paginación (opcional, para más adelante) -->
                    <div id="pos-pagination"></div>
                </div>
            </div>

            <!-- Columna Lateral (Cliente y Carrito) -->
            <div id="pos-sidebar-column">

                <!-- Sección de Cliente (Búsqueda y Selección) -->
                <div id="pos-customer-section" style="background-color: #fff; padding: 15px; border: 1px solid #e5e5e5; margin-bottom: 20px;">
                    <h2><?php esc_html_e( 'Cliente', 'pos2025' ); ?></h2>

                    <!-- Info Cliente Seleccionado -->
                    <div id="pos-selected-customer" style="margin-bottom: 15px; padding: 10px; border: 1px solid #eee; background-color: #f9f9f9; display: none;">
                        <strong><?php esc_html_e('Cliente Seleccionado:', 'pos2025'); ?></strong>
                        <span id="selected-customer-info"></span>
                        <button id="clear-customer-button" style="margin-left: 10px; color: red; background: none; border: none; cursor: pointer; font-size: 1.2em; vertical-align: middle;" title="<?php esc_attr_e('Quitar Cliente', 'pos2025'); ?>">&times;</button>
                    </div>

                    <!-- Área de Búsqueda de Cliente -->
                    <div id="pos-customer-search-area">
                        <label for="pos-customer-search" class="screen-reader-text"><?php esc_html_e( 'Buscar Cliente:', 'pos2025' ); ?></label>
                        <input type="search" id="pos-customer-search" name="pos_customer_search" placeholder="<?php esc_attr_e( 'Buscar cliente (nombre, email...)', 'pos2025' ); ?>" style="width: calc(100% - 120px); margin-right: 5px;">
                        <button id="pos-customer-search-button" class="button"><?php esc_html_e( 'Buscar', 'pos2025' ); ?></button>
                        <span id="pos-customer-spinner" class="spinner" style="float: none; vertical-align: middle;"></span>

                        <?php /* --- BOTÓN NUEVO CLIENTE COMENTADO ---
                        // Este botón abría el modal que ha sido eliminado.
                        // Puedes descomentarlo y darle una nueva funcionalidad (ej. mostrar formulario inline o redirigir).
                        <button id="pos-open-add-customer-modal" class="button button-secondary" style="margin-left: 5px;">
                            <?php esc_html_e( 'Nuevo +', 'pos2025' ); ?>
                        </button>
                        */ ?>
                    </div>

                    <!-- Lista de Resultados de Búsqueda de Cliente -->
                    <ul id="pos-customer-list" style="list-style: none; margin: 10px 0 0 0; padding: 0; max-height: 150px; overflow-y: auto; border: 1px solid #ddd; background: #fefefe;">
                        <?php // Los resultados de la búsqueda de clientes aparecerán aquí ?>
                    </ul>

                    <?php
                    // Aquí podrías añadir el HTML para un formulario inline si eliges esa alternativa
                    /*
                    <div id="pos-add-customer-form-inline" style="display: none; margin-top: 15px; border-top: 1px dashed #ccc; padding-top: 15px;">
                        <h3><?php esc_html_e('Añadir Nuevo Cliente (Inline)', 'pos2025'); ?></h3>
                        // ... campos del formulario ...
                        <button id="pos-save-customer-inline-button" class="button button-primary">Guardar</button>
                        <button id="pos-cancel-customer-inline-button" class="button button-secondary">Cancelar</button>
                    </div>
                    */
                    ?>
                </div>

                <!-- Sección del Carrito -->
                <div id="pos-cart-section" style="background-color: #fff; padding: 15px; border: 1px solid #e5e5e5;">
                    <h2><?php esc_html_e( 'Carrito Actual', 'pos2025' ); ?></h2>
                    <ul id="pos-cart-items" style="list-style: none; margin: 0 0 15px 0; padding: 0; min-height: 50px; border: 1px solid #ddd; background: #fefefe; max-height: 300px; overflow-y: auto;">
                        <li style="padding: 10px; color: #777;"><?php esc_html_e( 'El carrito está vacío.', 'pos2025' ); ?></li>
                    </ul>
                    <div id="pos-cart-total" style="font-size: 1.2em; margin-bottom: 15px; text-align: right;">
                        <strong><?php esc_html_e( 'Total:', 'pos2025' ); ?></strong> <span id="cart-total-amount"><?php echo wc_price(0); ?></span>
                    </div>
                    <hr style="margin: 15px 0;">

                    <!-- Selector de Tipo de Venta -->
                    <div id="pos-sale-type-selector" style="margin-bottom: 15px;">
                        <strong><?php esc_html_e( 'Tipo de Venta:', 'pos2025' ); ?></strong><br>
                        <label style="margin-right: 15px;">
                            <input type="radio" name="pos_sale_type" value="direct" checked="checked"> <?php esc_html_e( 'Directa', 'pos2025' ); ?>
                        </label>
                        <label style="margin-right: 15px;">
                            <input type="radio" name="pos_sale_type" value="subscription"> <?php esc_html_e( 'Suscripción/Evento', 'pos2025' ); ?>
                        </label>
                        <label>
                            <input type="radio" name="pos_sale_type" value="credit"> <?php esc_html_e( 'Crédito', 'pos2025' ); ?>
                        </label>
                    </div>

                    <!-- Detalles de Suscripción/Evento (se muestra condicionalmente) -->
                    <div id="pos-subscription-terms" style="display: none; margin-bottom: 15px; padding: 10px; border: 1px dashed #ccc; background-color: #f9f9f9;">
                        <strong><?php esc_html_e( 'Datos Evento Calendario:', 'pos2025' ); ?></strong><br>
                        <label for="pos_subscription_title" style="display: block; margin-top: 10px; margin-bottom: 2px;">
                            <?php esc_html_e( 'Título Evento:', 'pos2025' ); ?> <span style="color:red;">*</span>
                        </label>
                        <input type="text" id="pos_subscription_title" name="pos_subscription_title" placeholder="<?php esc_attr_e( 'Ej: Evento Cliente X', 'pos2025' ); ?>" style="width: 100%; margin-bottom: 10px;">

                        <label for="pos_subscription_start_date" style="display: block; margin-bottom: 2px;">
                            <?php esc_html_e( 'Fecha de Inicio:', 'pos2025' ); ?> <span style="color:red;">*</span>
                        </label>
                        <input type="date" id="pos_subscription_start_date" name="pos_subscription_start_date" style="width: 100%; margin-bottom: 10px;">

                        <label for="pos_subscription_color" style="display: block; margin-bottom: 2px;">
                            <?php esc_html_e( 'Color Evento:', 'pos2025' ); ?>
                        </label>
                        <input type="color" id="pos_subscription_color" name="pos_subscription_color" value="#3a87ad" style="width: 50px; height: 30px; padding: 2px; vertical-align: middle; margin-bottom: 10px;">
                    </div>
                    <hr style="margin: 15px 0;">

                    <!-- Selector de Método de Pago -->
                    <div class="pos-payment-gateway-selector" style="margin-bottom: 15px;">
                        <label for="pos-payment-gateway"><strong><?php esc_html_e( 'Método de Pago:', 'pos2025' ); ?></strong></label>
                        <select id="pos-payment-gateway" name="pos_payment_gateway" style="width: 100%;" disabled> <?php // Empezar deshabilitado ?>
                            <option value=""><?php esc_html_e( '-- Cargando métodos... --', 'pos2025' ); ?></option>
                            <?php // Las opciones se cargarán con JavaScript ?>
                        </select>
                        <span id="pos-gateway-spinner" class="spinner" style="float: none; vertical-align: middle;"></span>
                    </div>
                    <hr style="margin: 15px 0;">

                    <!-- Nota para el Cliente -->
                    <div id="pos-customer-note-section" style="margin-bottom: 15px;">
                         <label for="pos-customer-note"><strong><?php esc_html_e( 'Nota para el Cliente (Opcional):', 'pos2025' ); ?></strong></label>
                         <textarea id="pos-customer-note" name="pos_customer_note" rows="3" style="width: 100%;" placeholder="<?php esc_attr_e( 'Instrucciones especiales, recordatorios, etc.', 'pos2025' ); ?>"></textarea>
                    </div>

                    <!-- Botón de Checkout -->
                    <button id="pos-checkout-button" class="button button-primary button-large" style="width: 100%; padding: 10px; font-size: 1.3em;" disabled><?php esc_html_e( 'Completar Venta', 'pos2025' ); ?></button>
                    <span id="pos-checkout-spinner" class="spinner" style="float: none; vertical-align: middle; margin-left: 10px;"></span>
                </div> <!-- Fin pos-cart-section -->

            </div> <!-- Fin pos-sidebar-column -->

        </div> <!-- Fin pos2025-app-container -->

    </div> <!-- Fin wrap -->

    <?php
    // --- EL MODAL HA SIDO ELIMINADO ---
}

/**
 * Enqueue scripts y estilos específicos para la página del POS.
 */
function pos2025_enqueue_pos_assets( $hook_suffix ) {
    // Comprueba si estamos en nuestra página específica del TPV
    // 'toplevel_page_pos2025-terminal' es el hook generado por add_menu_page
    if ( 'toplevel_page_pos2025-terminal' !== $hook_suffix ) {
        return;
    }

    // --- ENCOLAR ESTILOS ---
    wp_enqueue_style(
        'pos2025-pos-style', // Handle único para el estilo
        POS2025_PLUGIN_URL . 'assets/css/pos-style.css', // Ruta al archivo CSS
        array(), // Dependencias (ninguna por ahora)
        POS2025_VERSION // Versión (para control de caché)
    );

    // --- ENCOLAR SCRIPT PRINCIPAL (pos-app.js) ---
    // NOTA: pos-customer-manager.js ha sido eliminado.
    wp_enqueue_script(
        'pos2025-pos-script', // Handle único para el script
        POS2025_PLUGIN_URL . 'assets/js/pos-app.js', // Ruta al archivo JS
        array('jquery', 'wp-api-fetch'), // Dependencias: jQuery y el módulo API Fetch de WP
        POS2025_VERSION, // Versión
        true // Cargar en el footer
    );

     // --- PASAR DATOS DE PHP A JAVASCRIPT (para pos-app.js) ---
     // Asegúrate de que pos-app.js todavía necesite estos parámetros.
     $script_params = array(
        'rest_url'        => esc_url_raw( rest_url( 'pos2025/v1/' ) ), // URL base de tu API personalizada
        'wc_api_url'      => esc_url_raw( rest_url( 'wc/v3/' ) ),      // URL base de la API de WooCommerce
        'nonce'           => wp_create_nonce( 'wp_rest' ),
        'text_loading'    => __('Cargando...', 'pos2025'),
        'text_error'      => __('Error', 'pos2025'),
        'text_cart_empty' => '<li style="padding: 10px; color: #777;">' . esc_html__( 'El carrito está vacío.', 'pos2025' ) . '</li>',
        'currency_symbol' => get_woocommerce_currency_symbol(),
        'price_format'    => get_woocommerce_price_format(),
        'price_decimals'  => wc_get_price_decimals(),
        'thousand_sep'    => wc_get_price_thousand_separator(),
        'decimal_sep'     => wc_get_price_decimal_separator(),
        // Puedes añadir más parámetros aquí si pos-app.js los necesita
    );

    // Localizar SOLO para pos-app.js
    wp_localize_script( 'pos2025-pos-script', 'pos2025_pos_params', $script_params );

}
add_action( 'admin_enqueue_scripts', 'pos2025_enqueue_pos_assets' );

?>
