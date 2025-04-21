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

    // Ruta para OBTENER eventos (Modificada para incluir personalizados)
    register_rest_route( 'pos2025/v1', '/events', array(
        'methods'             => WP_REST_Server::READABLE, // GET
        'callback'            => 'pos2025_api_get_calendar_events', // Misma función callback
        'permission_callback' => '__return_true', // O tu callback de permisos real
        'args'                => array(
            'start' => array(
                'description'       => 'Start date for event filtering (YYYY-MM-DD).',
                'type'              => 'string',
                'format'            => 'date',
                'required'          => false,
                'validate_callback' => 'rest_validate_request_arg',
            ),
            'end'   => array(
                'description'       => 'End date for event filtering (YYYY-MM-DD).',
                'type'              => 'string',
                'format'            => 'date',
                'required'          => false,
                'validate_callback' => 'rest_validate_request_arg',
            ),
        ),
    ) );

    // *** NUEVA RUTA para CREAR eventos personalizados ***
    register_rest_route( 'pos2025/v1', '/events/custom', array(
        'methods'             => WP_REST_Server::CREATABLE, // POST
        'callback'            => 'pos2025_api_create_custom_event',
        'permission_callback' => function () {
            // ¡IMPORTANTE! Asegúrate de que solo usuarios autorizados puedan crear eventos
            return current_user_can( 'manage_woocommerce' ); // O la capacidad que definas
        },
        'args'                => array(
            'title' => array(
                'description'       => 'Event title.',
                'type'              => 'string',
                'required'          => true,
                'sanitize_callback' => 'sanitize_text_field',
            ),
            'start' => array(
                'description'       => 'Event start date (YYYY-MM-DD).',
                'type'              => 'string',
                'format'            => 'date',
                'required'          => true,
                'validate_callback' => 'pos2025_validate_date_format', // Función de validación personalizada
            ),
            'description' => array(
                'description'       => 'Event description (optional).',
                'type'              => 'string',
                'required'          => false,
                'sanitize_callback' => 'sanitize_textarea_field',
            ),
            'color' => array(
                'description'       => 'Event color (hex).',
                'type'              => 'string',
                'required'          => false,
                'default'           => '#54a0ff', // Color por defecto si no se envía
                'sanitize_callback' => 'sanitize_hex_color',
            ),
             'allDay' => array( // Aunque lo forzamos en JS, lo aceptamos aquí
                'description'       => 'Is it an all-day event?',
                'type'              => 'boolean',
                'required'          => false,
                'default'           => true,
            ),
        ),
    ) );


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

/**
 * Función de validación para fechas YYYY-MM-DD.
 */
function pos2025_validate_date_format( $param, $request, $key ) {
    if ( ! is_string( $param ) ) {
        return new WP_Error( 'rest_invalid_param', sprintf( esc_html__( '%s is not a string.', 'pos2025' ), $key ), array( 'status' => 400 ) );
    }
    // Expresión regular simple para YYYY-MM-DD
    if ( ! preg_match( '/^\d{4}-\d{2}-\d{2}$/', $param ) ) {
        return new WP_Error( 'rest_invalid_param', sprintf( esc_html__( '%s must be in YYYY-MM-DD format.', 'pos2025' ), $key ), array( 'status' => 400 ) );
    }
    // Podrías añadir validación más estricta (checkdate) si es necesario
    return true;
}


/**
 * Callback para OBTENER eventos del calendario (Pedidos + Personalizados).
 * MODIFICADO: Añade eventos personalizados desde wp_options.
 *
 * @param WP_REST_Request $request Datos de la solicitud.
 * @return WP_REST_Response|WP_Error Respuesta con los eventos o error.
 */
function pos2025_api_get_calendar_events( WP_REST_Request $request ) {
    $start_date_str = $request->get_param( 'start' );
    $end_date_str   = $request->get_param( 'end' );
    $events = array();

    // --- 1. Obtener eventos desde Pedidos de WooCommerce ---
    $order_query_args = array(
        'limit'      => -1, // Obtener todos los pedidos que coincidan
        'status'     => array_keys( wc_get_order_statuses() ), // Considerar todos los estados
        'meta_query' => array(
            'relation' => 'AND',
            array(
                'key'     => '_pos_sale_type',
                'value'   => 'subscription', // Solo tipo suscripción/evento
                'compare' => '=',
            ),
            array(
                'key'     => '_pos_calendar_event_date', // Asegurarse de que la fecha exista y no esté vacía
                'compare' => 'EXISTS',
            ),
             array(
                'key'     => '_pos_calendar_event_date',
                'value'   => '',
                'compare' => '!=',
            ),
        ),
        'orderby'    => 'date',
        'order'      => 'DESC',
    );

    // Añadir filtro de fecha si se proporcionan start y end
    if ( $start_date_str && $end_date_str ) {
        // Convertir a timestamp para comparación segura
        $start_ts = strtotime( $start_date_str );
        $end_ts   = strtotime( $end_date_str );

        if ( $start_ts && $end_ts ) {
             $order_query_args['meta_query'][] = array(
                'key'     => '_pos_calendar_event_date',
                'value'   => array( date('Y-m-d', $start_ts), date('Y-m-d', $end_ts) ),
                'compare' => 'BETWEEN',
                'type'    => 'DATE', // Importante para comparar fechas correctamente
            );
        }
    }

    $orders = wc_get_orders( $order_query_args );

    if ( ! empty( $orders ) ) {
        foreach ( $orders as $order ) {
            $event_title = $order->get_meta( '_pos_calendar_event_title', true );
            $event_date  = $order->get_meta( '_pos_calendar_event_date', true );
            $event_color = $order->get_meta( '_pos_calendar_event_color', true ) ?: '#3a87ad'; // Color por defecto

            // Validar fecha y título
            if ( $event_title && $event_date && preg_match('/^\d{4}-\d{2}-\d{2}$/', $event_date) ) {
                 $customer_name = $order->get_billing_first_name() . ' ' . $order->get_billing_last_name();
                 $events[] = array(
                    'id'    => 'order_' . $order->get_id(), // Prefijo para distinguir
                    'title' => $event_title,
                    'start' => $event_date,
                    'color' => $event_color,
                    'allDay'=> true,
                    'url'   => $order->get_edit_order_url(), // Enlace para editar el pedido
                    'extendedProps' => array(
                        'orderId' => $order->get_id(),
                        'customer' => trim($customer_name) ?: __('Invitado', 'pos2025'),
                        'type' => 'order' // Tipo de evento
                    )
                );
            }
        }
    }

    // --- 2. Obtener eventos personalizados desde wp_options ---
    $custom_events = get_option( 'pos2025_custom_events', array() );

    if ( ! empty( $custom_events ) ) {
        // Filtrar eventos personalizados por fecha si es necesario
        $filtered_custom_events = array();
        if ( $start_date_str && $end_date_str ) {
            $start_ts = strtotime( $start_date_str );
            $end_ts   = strtotime( $end_date_str );

            if ( $start_ts && $end_ts ) {
                foreach ( $custom_events as $custom_event ) {
                    $event_ts = strtotime( $custom_event['start'] );
                    // FullCalendar pide eventos que *terminan* en o después de 'start'
                    // y *empiezan* en o antes de 'end'. Para eventos de día completo,
                    // simplemente comprobamos si la fecha 'start' está dentro del rango.
                    if ( $event_ts >= $start_ts && $event_ts < $end_ts ) { // FullCalendar usa un rango semi-abierto [start, end)
                        $filtered_custom_events[] = $custom_event;
                    }
                }
            } else {
                 $filtered_custom_events = $custom_events; // Si las fechas no son válidas, devolver todos
            }
        } else {
            $filtered_custom_events = $custom_events; // Si no hay filtro de fecha, devolver todos
        }

        // Añadir eventos personalizados filtrados al array final
        // Asegurarse de que tienen las propiedades esperadas por FullCalendar
        foreach ($filtered_custom_events as $cust_event) {
             $events[] = array(
                'id'            => $cust_event['id'], // ID único generado al crear
                'title'         => $cust_event['title'],
                'start'         => $cust_event['start'],
                'color'         => $cust_event['color'] ?? '#54a0ff', // Color por defecto
                'allDay'        => $cust_event['allDay'] ?? true,
                // 'url'        => '', // Los eventos personalizados no tienen URL por defecto
                'extendedProps' => array(
                    'description' => $cust_event['description'] ?? '',
                    'type'        => 'custom' // Tipo de evento
                )
            );
        }
    }


    return new WP_REST_Response( $events, 200 );
}


/**
 * Callback para CREAR un evento personalizado.
 * Guarda el evento en la opción 'pos2025_custom_events'.
 *
 * @param WP_REST_Request $request Datos de la solicitud.
 * @return WP_REST_Response|WP_Error Respuesta con el evento creado o error.
 */
function pos2025_api_create_custom_event( WP_REST_Request $request ) {
    // Los parámetros ya han sido validados y sanitizados por la definición de 'args'
    $title       = $request->get_param('title');
    $start_date  = $request->get_param('start');
    $description = $request->get_param('description');
    $color       = $request->get_param('color');
    $allDay      = $request->get_param('allDay');

    // Obtener eventos existentes
    $existing_events = get_option( 'pos2025_custom_events', array() );

    // Crear nuevo evento
    $new_event = array(
        'id'          => 'custom_' . wp_generate_uuid4(), // Generar ID único con prefijo
        'title'       => $title,
        'start'       => $start_date,
        'description' => $description,
        'color'       => $color,
        'allDay'      => $allDay,
        'type'        => 'custom' // Marcar como tipo personalizado
    );

    // Añadir al array
    $existing_events[] = $new_event;

    // Guardar el array actualizado en wp_options
    // El tercer argumento (autoload) se puede poner a 'no' si no necesitas que se carguen siempre
    $updated = update_option( 'pos2025_custom_events', $existing_events, 'yes' );

    if ( $updated ) {
        // Devolver el evento recién creado con estado 201 (Created)
        return new WP_REST_Response( $new_event, 201 );
    } else {
        // Error al guardar en la base de datos
        return new WP_Error(
            'rest_custom_event_save_error',
            __( 'Could not save the custom event to the database.', 'pos2025' ),
            array( 'status' => 500 )
        );
    }
}

?>
