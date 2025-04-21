<?php
/**
 * Registra los endpoints de la API REST para el TPV (POS 2025)
 */

// Si este archivo es llamado directamente, abortar.
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Comprueba si el usuario actual tiene permisos para usar la API del TPV.
 *
 * @return bool|WP_Error True si tiene permisos, WP_Error si no.
 */
function pos2025_api_permissions_check() {
    // Puedes ajustar la capacidad si necesitas algo más específico que 'manage_woocommerce'
    if ( ! current_user_can( 'manage_woocommerce' ) ) {
        return new WP_Error(
            'rest_forbidden',
            esc_html__( 'No tienes permiso para realizar esta acción.', 'pos2025' ),
            array( 'status' => rest_authorization_required_code() ) // Devuelve 401 o 403
        );
    }
    return true;
}


/**
 * Registra TODAS las rutas de la API REST personalizadas para POS2025.
 * CORREGIDO: Añadido endpoint para eventos del calendario.
 */
function pos2025_register_rest_routes() {
    $namespace = 'pos2025/v1'; // Namespace de nuestra API

    // --- Endpoint para buscar productos ---
    register_rest_route( $namespace, '/products', array(
        'methods'             => WP_REST_Server::READABLE, // Método GET
        'callback'            => 'pos2025_api_search_products',
        'permission_callback' => '__return_true', // Permisos desactivados temporalmente
        'args'                => array(
            'search' => array( /* ... */ ),
            'per_page' => array( /* ... */ ),
            'page' => array( /* ... */ ),
            'featured' => array( /* ... */ ),
        ),
    ) );

    // --- Endpoint para obtener pasarelas de pago ---
    register_rest_route( $namespace, '/payment-gateways', array(
        'methods'             => WP_REST_Server::READABLE, // Método GET
        'callback'            => 'pos2025_api_get_payment_gateways',
        'permission_callback' => '__return_true', // Permisos desactivados temporalmente
    ) );

    // --- Endpoint para buscar clientes (GET) ---
    register_rest_route( $namespace, '/customers', array(
        'methods'             => WP_REST_Server::READABLE, // Método GET
        'callback'            => 'pos2025_api_search_customers',
        'permission_callback' => '__return_true', // Permisos desactivados temporalmente
        'args'                => array( /* ... args clientes ... */ ),
    ) );

    // --- Endpoint para CREAR un nuevo cliente (POST) ---
    register_rest_route( $namespace, '/customers', array(
        'methods'             => WP_REST_Server::CREATABLE, // POST
        'callback'            => 'pos2025_api_create_customer',
        'permission_callback' => '__return_true', // Permisos desactivados temporalmente
        'args'                => array( /* ... args crear cliente ... */ ),
    ) );

    // --- Endpoint para ACTUALIZAR un cliente existente (PUT) ---
    register_rest_route( $namespace, '/customers/(?P<id>\d+)', array(
        'methods'             => WP_REST_Server::EDITABLE, // PUT/PATCH
        'callback'            => 'pos2025_api_update_customer',
        'permission_callback' => '__return_true', // Permisos desactivados temporalmente
        'args'                => array( /* ... args actualizar cliente ... */ ),
    ) );

    // --- Endpoint para CREAR pedidos/suscripciones/créditos ---
    register_rest_route( $namespace, '/orders', array(
        'methods'             => WP_REST_Server::CREATABLE, // Método POST
        'callback'            => 'pos2025_api_create_order',
        'permission_callback' => '__return_true', // Permisos desactivados temporalmente
        'args'                => array( /* ... args crear pedido ... */ ),
    ) );

    // *** INICIO: Endpoint para eventos del calendario ***
    register_rest_route( $namespace, '/events', array(
        'methods'             => WP_REST_Server::READABLE, // GET
        'callback'            => 'pos2025_api_get_calendar_events',
        'permission_callback' => '__return_true', // O 'pos2025_api_permissions_check'
        'args'                => array(
             // Parámetros de fecha que FullCalendar envía automáticamente
             'start' => array(
                'description'       => 'Fecha de inicio para filtrar eventos (YYYY-MM-DDThh:mm:ss).',
                'type'              => 'string',
                'format'            => 'date-time', // Indica formato esperado
                'required'          => false,
                'sanitize_callback' => 'sanitize_text_field', // Sanitización básica
             ),
             'end' => array(
                'description'       => 'Fecha de fin para filtrar eventos (YYYY-MM-DDThh:mm:ss).',
                'type'              => 'string',
                'format'            => 'date-time',
                'required'          => false,
                'sanitize_callback' => 'sanitize_text_field',
             ),
        ),
    ) );
    // *** FIN: Endpoint para eventos del calendario ***


    // --- FIN DE REGISTRO DE RUTAS ---

} // <--- FIN de la función pos2025_register_rest_routes
add_action( 'rest_api_init', 'pos2025_register_rest_routes' );


// --- FUNCIONES DE CALLBACK ---

/**
 * Callback para el endpoint de búsqueda de productos.
 * CORREGIDO: Manejo de 'featured' y 'search' mejorado.
 */
function pos2025_api_search_products( WP_REST_Request $request ) {
    $search_term = $request->get_param( 'search' );
    $per_page    = $request->get_param( 'per_page' );
    $page        = $request->get_param( 'page' );
    $featured    = $request->get_param( 'featured' );

    $args = array(
        'status'    => 'publish',
        'limit'     => $per_page,
        'page'      => $page,
        'orderby'   => 'title',
        'order'     => 'ASC',
        'type'      => array('simple', 'variable'),
        'return'    => 'objects',
    );

    if ( ! empty( $search_term ) ) {
        $args['s'] = $search_term;
        $args['meta_query'] = array(
            'relation' => 'OR',
             array(
                 'key' => '_sku',
                 'value'   => $search_term,
                 'compare' => 'LIKE',
             ),
        );
    }
    elseif ( $featured === true ) {
        $args['featured'] = true;
        // $args['orderby'] = 'menu_order';
        // $args['order'] = 'ASC';
    }

    error_log('[POS API Products] - WC_Query Args: ' . print_r($args, true));

    $products_query = new WC_Product_Query( $args );
    $products_data = $products_query->get_products();

    error_log('[POS API Products] - WC_Query Result Count: ' . count($products_data));

    $results = array();
    if ( ! empty( $products_data ) ) {
        foreach ( $products_data as $product ) {
             if ( ! $product instanceof WC_Product ) continue;
            // ... (construcción de $product_item como antes) ...
             $image_id = $product->get_image_id();
            $image_url = $image_id ? wp_get_attachment_image_url( $image_id, 'thumbnail' ) : wc_placeholder_img_src('thumbnail');

            $product_item = array(
                'id'           => $product->get_id(),
                'name'         => $product->get_name(),
                'sku'          => $product->get_sku(),
                'price'        => $product->get_price(),
                'price_html'   => $product->get_price_html(),
                'type'         => $product->get_type(),
                'stock_status' => $product->get_stock_status(),
                'image_url'    => $image_url,
                'variations'   => array(),
            );

            if ( $product->is_type('variable') && $product instanceof WC_Product_Variable ) {
                $available_variations = $product->get_available_variations('objects');
                foreach ( $available_variations as $variation ) {
                     if ( ! $variation instanceof WC_Product_Variation ) continue;
                     $variation_image_id = $variation->get_image_id();
                     $variation_image_url = $variation_image_id ? wp_get_attachment_image_url( $variation_image_id, 'thumbnail' ) : $image_url;
                     $variation_attributes = $variation->get_variation_attributes( true );
                     $variation_name_parts = [];
                     foreach ($variation_attributes as $attr_name => $attr_value) {
                         if (!empty($attr_value)) {
                             $taxonomy = str_replace('attribute_', '', $attr_name);
                             $term = get_term_by('slug', $attr_value, $taxonomy);
                             $attribute_label = wc_attribute_label($taxonomy);
                             $term_name = $term ? $term->name : $attr_value;
                             $variation_name_parts[] = $attribute_label . ': ' . $term_name;
                         }
                     }
                     $variation_display_name = implode(', ', $variation_name_parts);
                     $product_item['variations'][] = array(
                        'variation_id'   => $variation->get_id(),
                        'attributes'     => $variation->get_variation_attributes(),
                        'variation_name' => $variation_display_name,
                        'sku'            => $variation->get_sku(),
                        'price'          => $variation->get_price(),
                        'price_html'     => $variation->get_price_html(),
                        'stock_status'   => $variation->get_stock_status(),
                        'stock_quantity' => $variation->get_stock_quantity(),
                        'image_url'      => $variation_image_url,
                     );
                }
            }
            $results[] = $product_item;
        }
    }

    $response = new WP_REST_Response( $results, 200 );

    $count_args = $args;
    $count_args['return'] = 'ids';
    $count_args['limit'] = -1;
    unset($count_args['page']);
    $total_query = new WC_Product_Query( $count_args );
    $total_products = count($total_query->get_products());
    $total_pages = ($per_page > 0 && $total_products > 0) ? ceil( $total_products / $per_page ) : 1;

    $response->header( 'X-WP-Total', $total_products );
    $response->header( 'X-WP-TotalPages', $total_pages );

    return $response;
}

/**
 * Callback para obtener las pasarelas de pago activas.
 */
function pos2025_api_get_payment_gateways( WP_REST_Request $request ) { /* ... (sin cambios) ... */ }

/**
 * Callback para buscar usuarios (clientes).
 */
function pos2025_api_search_customers( WP_REST_Request $request ) { /* ... (sin cambios) ... */ }

/**
 * Callback para CREAR un nuevo cliente.
 */
function pos2025_api_create_customer( WP_REST_Request $request ) { /* ... (sin cambios) ... */ }

/**
 * Callback para ACTUALIZAR un cliente existente.
 */
function pos2025_api_update_customer( WP_REST_Request $request ) { /* ... (sin cambios) ... */ }

 /**
  * Callback para crear un nuevo pedido/suscripción/crédito de WooCommerce desde el TPV.
  */
 function pos2025_api_create_order( WP_REST_Request $request ) { /* ... (sin cambios) ... */ }


// *** INICIO: Callback para eventos del calendario ***
/**
 * Callback para obtener los pedidos de tipo 'subscription' como eventos para FullCalendar.
 *
 * @param WP_REST_Request $request Datos de la petición (puede incluir 'start' y 'end').
 * @return WP_REST_Response|WP_Error Respuesta JSON con array de eventos o error.
 */
function pos2025_api_get_calendar_events( WP_REST_Request $request ) {
    error_log('[POS CAL API] - get_calendar_events called.'); // Log inicial

    $start_date_str = $request->get_param('start');
    $end_date_str   = $request->get_param('end');
    error_log("[POS CAL API] - Received Start: {$start_date_str}, End: {$end_date_str}"); // Log fechas

    $args = array(
        'limit' => -1, // Obtener todos los pedidos que coincidan
        'status' => array_keys( wc_get_order_statuses() ), // Considerar todos los estados
        'meta_query' => array(
            'relation' => 'AND', // Asegurar que ambas condiciones meta se cumplan
            array(
                'key'     => '_pos_sale_type',
                'value'   => 'subscription',
                'compare' => '=',
            ),
            array(
                'key'     => '_pos_calendar_event_date', // Asegurarse que la fecha exista
                'compare' => 'EXISTS',
            ),
            array(
                'key'     => '_pos_calendar_event_date', // Y que no esté vacía
                'value'   => '',
                'compare' => '!=',
            ),
        ),
        'orderby' => 'date',
        'order'   => 'DESC',
    );

    // --- Filtrado por Fechas (si se proporcionan start/end) ---
    $date_query_conditions = array();
    if ( $start_date_str && preg_match('/^\d{4}-\d{2}-\d{2}/', $start_date_str) ) {
         $start_date = substr($start_date_str, 0, 10);
         $date_query_conditions[] = array(
             'key'     => '_pos_calendar_event_date',
             'compare' => '>=',
             'value'   => $start_date,
             'type'    => 'DATE',
         );
         error_log("[POS CAL API] - Applying date filter: >= {$start_date}");
    }
     if ( $end_date_str && preg_match('/^\d{4}-\d{2}-\d{2}/', $end_date_str) ) {
         $end_date = substr($end_date_str, 0, 10);
         $date_query_conditions[] = array(
             'key'     => '_pos_calendar_event_date',
             'compare' => '<', // FullCalendar end date es exclusivo
             'value'   => $end_date,
             'type'    => 'DATE',
         );
         error_log("[POS CAL API] - Applying date filter: < {$end_date}");
    }

    // Añadir las condiciones de fecha a la meta_query principal
    if (!empty($date_query_conditions)) {
        // Añadimos las condiciones de fecha dentro de la 'meta_query' existente
        foreach ($date_query_conditions as $condition) {
            $args['meta_query'][] = $condition;
        }
        // Aseguramos que todas las condiciones se cumplan
        $args['meta_query']['relation'] = 'AND';
    }

    error_log('[POS CAL API] - WC_Order_Query Args: ' . print_r($args, true)); // Log argumentos consulta

    $orders = wc_get_orders( $args );
    error_log('[POS CAL API] - Orders found: ' . count($orders)); // Log cantidad encontrada

    $events = array();
    if ( ! empty( $orders ) ) {
        foreach ( $orders as $order ) {
            $order_id = $order->get_id(); // Obtener ID para logs
            $event_title = $order->get_meta( '_pos_calendar_event_title', true );
            $event_date  = $order->get_meta( '_pos_calendar_event_date', true ); // Formato YYYY-MM-DD
            $event_color = $order->get_meta( '_pos_calendar_event_color', true ) ?: '#3a87ad'; // Color por defecto

            // Log detallado por pedido
            error_log("[POS CAL API] - Processing Order ID {$order_id}: Title='{$event_title}', Date='{$event_date}', Color='{$event_color}'");

            // Validar que tenemos fecha y título
            if ( $event_date && $event_title && preg_match('/^\d{4}-\d{2}-\d{2}$/', $event_date) ) { // Validar formato fecha
                $events[] = array(
                    'id'    => $order_id, // ID del pedido
                    'title' => $event_title,
                    'start' => $event_date, // FullCalendar entiende YYYY-MM-DD
                    'color' => $event_color,
                    'allDay'=> true, // Marcar como evento de día completo
                    'url'   => $order->get_edit_order_url(), // Enlace para editar el pedido
                    // 'extendedProps' => [ 'customer' => $order->get_formatted_billing_full_name() ] // Opcional
                );
            } else {
                 error_log("[POS CAL API] - Skipping Order ID {$order_id}: Missing title or invalid/missing date ('{$event_date}').");
            }
        }
    }

    error_log('[POS CAL API] - Final events array: ' . print_r($events, true)); // Log array final
    return new WP_REST_Response( $events, 200 );
}
// *** FIN: Callback para eventos del calendario ***

?>
