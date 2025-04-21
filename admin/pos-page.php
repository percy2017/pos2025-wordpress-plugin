<?php
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
        'manage_woocommerce',                      // Capacidad requerida (ajustable)
        'pos2025-terminal',                        // Slug único
        'pos2025_render_pos_page',                 // Función de renderizado
        'dashicons-store',                         // Icono
        56                                         // Posición
    );
}
add_action( 'admin_menu', 'pos2025_add_pos_admin_menu' );


/**
 * Renderiza el contenido HTML de la página del TPV.
 * MEJORADO: Reorganización de la interfaz.
 * - Búsqueda de productos/clientes en una línea.
 * - Sidebar dividida en Cliente, Carrito y Procesar Pago.
 */
function pos2025_render_pos_page() {
    ?>
    <div class="wrap" id="pos2025-wrap">
        <!-- <h1><?php esc_html_e( 'Terminal Punto de Venta (POS 2025)', 'pos2025' ); ?></h1> -->

        <div id="pos2025-app-container">

            <!-- Columna Izquierda (Productos y Calendario) -->
            <div id="pos-products-column">
                <!-- Sección de Búsqueda de Productos -->
                <div id="pos-search-section">
                    <h2><?php esc_html_e( 'Buscar Productos', 'pos2025' ); ?></h2>
                    <!-- Contenedor para alinear input y botón -->
                    <div class="pos-search-controls" style="display: flex; align-items: center; gap: 5px; margin-bottom: 10px;">
                        <label for="pos-product-search" class="screen-reader-text"><?php esc_html_e( 'Buscar por nombre o SKU:', 'pos2025' ); ?></label>
                        <input type="search" id="pos-product-search" name="pos_product_search" placeholder="<?php esc_attr_e( 'Escribe para buscar...', 'pos2025' ); ?>" style="flex-grow: 1;">
                        <button id="pos-search-button" class="button button-primary"><?php esc_html_e( 'Buscar', 'pos2025' ); ?></button>
                        <span class="spinner" style="float: none; vertical-align: middle;"></span>
                    </div>
                </div>

                <!-- Sección de Resultados de Productos -->
                <div id="pos-products-results">
                    
                    <ul id="pos-products-list">
                        <li><?php esc_html_e( 'Cargando productos...', 'pos2025' ); ?></li>
                    </ul>
                    <div id="pos-pagination"></div>
                </div>

                <!-- Contenedor para el Calendario -->
                <div id="pos-calendar-section" style="margin-top: 20px; background-color: #fff; padding: 15px; border: 1px solid #e5e5e5;">
                    <h2><?php esc_html_e( 'Calendario de Eventos', 'pos2025' ); ?></h2>
                    <div id="pos-calendar">
                        <p><?php esc_html_e('Cargando calendario...', 'pos2025'); ?></p>
                    </div>
                </div>

            </div> <!-- Fin pos-products-column -->


            <!-- Columna Lateral (Cliente, Carrito y Pago) -->
            <div id="pos-sidebar-column">

                <!-- Sección de Cliente -->
                <div id="pos-customer-section" class="pos-sidebar-section"> <!-- Añadida clase común -->
                    <h2><?php esc_html_e( 'Cliente', 'pos2025' ); ?></h2>
                    <div id="pos-customer-display-area">
                        <!-- Info Cliente Seleccionado -->
                        <div id="pos-selected-customer" style="margin-bottom: 15px; padding: 10px; border: 1px solid #eee; background-color: #f9f9f9; display: none;">
                            <strong><?php esc_html_e('Cliente Seleccionado:', 'pos2025'); ?></strong>
                            <span id="selected-customer-info"></span>
                            <button id="pos-edit-customer-button" class="button button-small" style="margin-left: 10px; vertical-align: middle;" title="<?php esc_attr_e('Editar Cliente', 'pos2025'); ?>">
                                <span class="dashicons dashicons-edit" style="vertical-align: text-bottom;"></span>
                            </button>
                            <button id="clear-customer-button" style="margin-left: 5px; color: red; background: none; border: none; cursor: pointer; font-size: 1.2em; vertical-align: middle;" title="<?php esc_attr_e('Quitar Cliente', 'pos2025'); ?>">&times;</button>
                        </div>
                        <!-- Área de Búsqueda de Cliente -->
                        <div id="pos-customer-search-area">
                            <!-- Contenedor para alinear input y botones -->
                            <div class="pos-customer-search-controls" style="display: flex; align-items: center; gap: 5px;">
                                <label for="pos-customer-search" class="screen-reader-text"><?php esc_html_e( 'Buscar Cliente:', 'pos2025' ); ?></label>
                                <input type="search" id="pos-customer-search" name="pos_customer_search" placeholder="<?php esc_attr_e( 'Buscar cliente...', 'pos2025' ); ?>" style="flex-grow: 1;">
                                <button id="pos-customer-search-button" class="button button-primary"><?php esc_html_e( 'Buscar', 'pos2025' ); ?></button>
                                <span id="pos-customer-spinner" class="spinner" style="float: none; vertical-align: middle;"></span>
                                <button id="pos-show-add-customer-form" class="button button-primary" title="<?php esc_attr_e('Añadir Nuevo Cliente', 'pos2025'); ?>">
                                    <?php esc_html_e( 'Nuevo', 'pos2025' ); ?>
                                </button>
                            </div>
                        </div>
                        <!-- Lista de Resultados de Búsqueda de Cliente -->
                        <ul id="pos-customer-list" style="list-style: none; margin: 10px 0 0 0; padding: 0; max-height: 150px; overflow-y: auto; border: 1px solid #ddd; background: #fefefe;"></ul>
                    </div>
                    <!-- FORMULARIO AÑADIR/EDITAR CLIENTE -->
                    <div id="pos-customer-form-container" style="display: none; margin-top: 15px; border-top: 1px dashed #ccc; padding-top: 15px;">
                        <h3 id="pos-customer-form-title"><?php esc_html_e('Añadir Nuevo Cliente', 'pos2025'); ?></h3>
                        <input type="hidden" id="pos-customer-id" name="pos_customer_id" value="">
                        <p><label for="pos-customer-firstname"><?php esc_html_e('Nombre:', 'pos2025'); ?></label><br><input type="text" id="pos-customer-firstname" name="pos_customer_firstname" class="regular-text" style="width: 100%;"></p>
                        <p><label for="pos-customer-lastname"><?php esc_html_e('Apellidos:', 'pos2025'); ?></label><br><input type="text" id="pos-customer-lastname" name="pos_customer_lastname" class="regular-text" style="width: 100%;"></p>
                        <p><label for="pos-customer-email"><?php esc_html_e('Correo Electrónico:', 'pos2025'); ?> <span style="color:red;">*</span></label><br><input type="email" id="pos-customer-email" name="pos_customer_email" class="regular-text" required style="width: 100%;"></p>
                        <p><label for="pos-customer-phone"><?php esc_html_e('Teléfono:', 'pos2025'); ?></label><br><input type="tel" id="pos-customer-phone" name="pos_customer_phone" class="regular-text" style="width: 100%;"></p>
                        <p>
                            <button id="pos-save-customer-button" class="button button-primary"><?php esc_html_e('Guardar Cliente', 'pos2025'); ?></button>
                            <button id="pos-cancel-customer-button" class="button button-secondary" type="button"><?php esc_html_e('Cancelar', 'pos2025'); ?></button>
                            <span id="pos-customer-save-spinner" class="spinner" style="float: none; vertical-align: middle;"></span>
                        </p>
                        <div id="pos-customer-form-notice" style="color: red; margin-top: 10px;"></div>
                    </div>
                </div> <!-- Fin pos-customer-section -->

                <!-- Sección del Carrito -->
                <div id="pos-cart-section" class="pos-sidebar-section"> <!-- Añadida clase común -->
                    <h2><?php esc_html_e( 'Carrito Actual', 'pos2025' ); ?></h2>
                    <ul id="pos-cart-items" style="list-style: none; margin: 0 0 15px 0; padding: 0; min-height: 50px; border: 1px solid #ddd; background: #fefefe; max-height: 300px; overflow-y: auto;">
                        <li style="padding: 10px; color: #777;"><?php esc_html_e( 'El carrito está vacío.', 'pos2025' ); ?></li>
                    </ul>
                    <div id="pos-cart-total" style="font-size: 1.2em; margin-bottom: 15px; text-align: right;">
                        <strong><?php esc_html_e( 'Total:', 'pos2025' ); ?></strong> <span id="cart-total-amount"><?php echo wc_price(0); ?></span>
                    </div>
                </div> <!-- Fin pos-cart-section -->

                <!-- *** NUEVA SECCIÓN: Procesar Pago *** -->
                <div id="pos-checkout-section" class="pos-sidebar-section"> <!-- Añadida clase común -->
                    <h2><?php esc_html_e( 'Procesar Pago', 'pos2025' ); ?></h2>

                    <!-- Selector de Tipo de Venta -->
                    <div id="pos-sale-type-selector" style="margin-bottom: 15px;">
                        <strong><?php esc_html_e( 'Tipo de Venta:', 'pos2025' ); ?></strong><br>
                        <label style="margin-right: 15px;"><input type="radio" name="pos_sale_type" value="direct" checked="checked"> <?php esc_html_e( 'Directa', 'pos2025' ); ?></label>
                        <label style="margin-right: 15px;"><input type="radio" name="pos_sale_type" value="subscription"> <?php esc_html_e( 'Suscripción/Evento', 'pos2025' ); ?></label>
                        <label><input type="radio" name="pos_sale_type" value="credit"> <?php esc_html_e( 'Crédito', 'pos2025' ); ?></label>
                    </div>

                    <!-- Detalles de Suscripción/Evento -->
                    <div id="pos-subscription-terms" style="display: none; margin-bottom: 15px; padding: 10px; border: 1px dashed #ccc; background-color: #f9f9f9;">
                        <strong><?php esc_html_e( 'Datos Evento Calendario:', 'pos2025' ); ?></strong><br>
                        <label for="pos_subscription_title" style="display: block; margin-top: 10px; margin-bottom: 2px;"><?php esc_html_e( 'Título Evento:', 'pos2025' ); ?> <span style="color:red;">*</span></label>
                        <input type="text" id="pos_subscription_title" name="pos_subscription_title" placeholder="<?php esc_attr_e( 'Ej: Evento Cliente X', 'pos2025' ); ?>" style="width: 100%; margin-bottom: 10px;">
                        <label for="pos_subscription_start_date" style="display: block; margin-bottom: 2px;"><?php esc_html_e( 'Fecha de Inicio:', 'pos2025' ); ?> <span style="color:red;">*</span></label>
                        <input type="date" id="pos_subscription_start_date" name="pos_subscription_start_date" style="width: 100%; margin-bottom: 10px;">
                        <label for="pos_subscription_color" style="display: block; margin-bottom: 2px;"><?php esc_html_e( 'Color Evento:', 'pos2025' ); ?></label>
                        <input type="color" id="pos_subscription_color" name="pos_subscription_color" value="#3a87ad" style="width: 50px; height: 30px; padding: 2px; vertical-align: middle; margin-bottom: 10px;">
                    </div>

                    <!-- Selector de Método de Pago -->
                    <div class="pos-payment-gateway-selector" style="margin-bottom: 15px;"> <!-- Aumentado margen inferior -->
                        <label for="pos-payment-gateway"><strong><?php esc_html_e( 'Método de Pago:', 'pos2025' ); ?></strong></label>
                        <select id="pos-payment-gateway" name="pos_payment_gateway" style="width: 100%;" disabled>
                            <option value=""><?php esc_html_e( '-- Cargando métodos... --', 'pos2025' ); ?></option>
                        </select>
                        <span id="pos-gateway-spinner" class="spinner" style="float: none; vertical-align: middle;"></span>
                    </div>

                    <!-- Nota para el Cliente -->
                    <div id="pos-customer-note-section" style="margin-bottom: 15px;">
                         <label for="pos-customer-note"><strong><?php esc_html_e( 'Nota para el Cliente (Opcional):', 'pos2025' ); ?></strong></label>
                         <textarea id="pos-customer-note" name="pos_customer_note" rows="3" style="width: 100%;" placeholder="<?php esc_attr_e( 'Instrucciones especiales, recordatorios, etc.', 'pos2025' ); ?>"></textarea>
                    </div>

                    <!-- Botón de Checkout -->
                    <button id="pos-checkout-button" class="button button-primary button-large" style="width: 100%; padding: 10px; font-size: 1.3em;" disabled><?php esc_html_e( 'Completar Venta', 'pos2025' ); ?></button>
                    <span id="pos-checkout-spinner" class="spinner" style="float: none; vertical-align: middle; margin-left: 10px;"></span>

                </div> <!-- Fin pos-checkout-section -->

            </div> <!-- Fin pos-sidebar-column -->

        </div> <!-- Fin pos2025-app-container -->

    </div> <!-- Fin wrap -->

    <?php
}

/**
 * Enqueue scripts y estilos específicos para la página del POS.
 * CORREGIDO: Eliminado encolado de CSS de FullCalendar y añadida dependencia JS correcta.
 */
function pos2025_enqueue_pos_assets( $hook_suffix ) {
    // Comprueba si estamos en nuestra página específica del TPV
    if ( 'toplevel_page_pos2025-terminal' !== $hook_suffix ) {
        return;
    }

    // --- ENCOLAR ESTILOS ---

    // Estilo de SweetAlert2
    wp_enqueue_style(
        'pos2025-sweetalert2-style',
        POS2025_PLUGIN_URL . 'assets/vendor/sweetalert2/sweetalert2.min.css',
        array(),
        '11.0' // Ajusta la versión
    );

    // Estilo principal del POS (ya NO depende de FullCalendar CSS)
    wp_enqueue_style(
        'pos2025-pos-style',
        POS2025_PLUGIN_URL . 'assets/css/pos-style.css',
        array('pos2025-sweetalert2-style'), // Solo depende de SweetAlert2
        POS2025_VERSION
    );

    // --- ENCOLAR SCRIPTS ---

    // Script de SweetAlert2
    wp_enqueue_script(
        'pos2025-sweetalert2-script',
        POS2025_PLUGIN_URL . 'assets/vendor/sweetalert2/sweetalert2.all.min.js',
        array(),
        '11.0', // Ajusta la versión
        true
    );

    // Script de FullCalendar Core (Asumiendo renombrado a main.min.js)
    wp_enqueue_script(
        'pos2025-fullcalendar-script',
        POS2025_PLUGIN_URL . 'assets/vendor/fullcalendar/index.global.min.js', // Usando main.min.js
        array(), // Sin dependencias JS aquí
        '6.0', // O la versión que descargaste
        true
    );

    // Script Principal del POS
    wp_enqueue_script(
        'pos2025-pos-script',
        POS2025_PLUGIN_URL . 'assets/js/pos-app.js',
        // *** CORREGIDO: Añadida dependencia de FullCalendar JS ***
        array('jquery', 'wp-api-fetch', 'pos2025-sweetalert2-script', 'pos2025-fullcalendar-script'),
        POS2025_VERSION,
        true
    );

     // --- PASAR DATOS DE PHP A JAVASCRIPT ---
     $script_params = array(
        'rest_url'        => esc_url_raw( rest_url( 'pos2025/v1/' ) ),
        'wc_api_url'      => esc_url_raw( rest_url( 'wc/v3/' ) ),
        'nonce'           => wp_create_nonce( 'wp_rest' ),
        'text_loading'    => __('Cargando...', 'pos2025'),
        'text_error'      => __('Error', 'pos2025'),
        'text_cart_empty' => '<li style="padding: 10px; color: #777;">' . esc_html__( 'El carrito está vacío.', 'pos2025' ) . '</li>',
        'currency_symbol' => get_woocommerce_currency_symbol(),
        'price_format'    => get_woocommerce_price_format(),
        'price_decimals'  => wc_get_price_decimals(),
        'thousand_sep'    => wc_get_price_thousand_separator(),
        'decimal_sep'     => wc_get_price_decimal_separator(),
        // Textos formulario cliente
        'text_add_customer_title' => esc_html__('Añadir Nuevo Cliente', 'pos2025'),
        'text_edit_customer_title' => esc_html__('Editar Cliente', 'pos2025'),
        'text_save_customer' => esc_html__('Guardar Cliente', 'pos2025'),
        'text_saving' => esc_html__('Guardando...', 'pos2025'),
        'text_customer_saved' => esc_html__('Cliente guardado correctamente.', 'pos2025'),
        'text_fill_required_fields' => esc_html__('Por favor, completa los campos requeridos (*).', 'pos2025'),
        'text_invalid_email' => esc_html__('Por favor, introduce un correo electrónico válido.', 'pos2025'),
        'text_confirm_cancel' => esc_html__('¿Estás seguro de que quieres cancelar? Los cambios no guardados se perderán.', 'pos2025'),
        'text_customer_not_found_edit' => esc_html__('Error: No se encontraron los datos del cliente para editar.', 'pos2025'),
        // Textos para SweetAlert
        'swal_success_title' => esc_html__('¡Éxito!', 'pos2025'),
        'swal_error_title' => esc_html__('Error', 'pos2025'),
        'swal_warning_title' => esc_html__('Atención', 'pos2025'),
        'swal_order_created_message' => esc_html__('Pedido creado con éxito.', 'pos2025'),
        'swal_cart_empty' => esc_html__('El carrito está vacío.', 'pos2025'),
        'swal_select_payment' => esc_html__('Por favor, selecciona un método de pago.', 'pos2025'),
        'swal_select_customer_for_type' => esc_html__('Para ventas de tipo "%s", por favor, busca y selecciona un cliente.', 'pos2025'),
        'swal_subscription_title_missing' => esc_html__('Por favor, introduce un título para el evento de suscripción.', 'pos2025'),
        'swal_subscription_date_missing' => esc_html__('Por favor, selecciona una fecha para el evento.', 'pos2025'),
        // Textos para FullCalendar
        'calendar_locale' => substr( get_locale(), 0, 2 ), // Obtener código de idioma (ej. 'es')
        'calendar_event_fetch_error' => esc_html__('Error al cargar los eventos del calendario.', 'pos2025'),
     );

    wp_localize_script( 'pos2025-pos-script', 'pos2025_pos_params', $script_params );
}
add_action( 'admin_enqueue_scripts', 'pos2025_enqueue_pos_assets' );

?>
