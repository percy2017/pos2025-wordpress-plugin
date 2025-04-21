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
 */
function pos2025_register_rest_routes() {
    $namespace = 'pos2025/v1'; // Namespace de nuestra API

    // --- Endpoint para buscar productos ---
    register_rest_route( $namespace, '/products', array(
        'methods'             => WP_REST_Server::READABLE, // Método GET
        'callback'            => 'pos2025_api_search_products',
        'permission_callback' => '__return_true', // Permisos desactivados temporalmente
        'args'                => array( // Argumentos esperados para /products
            'search' => array(
                'description'       => __( 'Término de búsqueda para productos (título o SKU).', 'pos2025' ),
                'type'              => 'string',
                'required'          => false,
                'sanitize_callback' => 'sanitize_text_field',
            ),
            'per_page' => array(
                'description'       => __( 'Número de resultados por página.', 'pos2025' ),
                'type'              => 'integer',
                'default'           => 10, // Mantenemos 10 por defecto para búsquedas
                'sanitize_callback' => 'absint',
            ),
            'page' => array(
                'description'       => __( 'Página actual de resultados.', 'pos2025' ),
                'type'              => 'integer',
                'default'           => 1,
                'sanitize_callback' => 'absint',
            ),
            // --- NUEVO ARGUMENTO ---
            'featured' => array(
                'description'       => __( 'Indica si se deben devolver solo productos destacados.', 'pos2025' ),
                'type'              => 'boolean',
                'default'           => false,
                'sanitize_callback' => 'wp_validate_boolean', // Convierte 'true', 1, etc. a booleano
            ),
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
        'args'                => array( // Argumentos esperados para /customers
            'search' => array(
                'description'       => __( 'Término de búsqueda para clientes (nombre, apellido, email, usuario).', 'pos2025' ),
                'type'              => 'string',
                'required'          => false,
                'sanitize_callback' => 'sanitize_text_field',
            ),
            'per_page' => array(
                'description'       => __( 'Número de resultados por página.', 'pos2025' ),
                'type'              => 'integer',
                'default'           => 10,
                'sanitize_callback' => 'absint',
            ),
            'page' => array(
                'description'       => __( 'Página actual de resultados.', 'pos2025' ),
                'type'              => 'integer',
                'default'           => 1,
                'sanitize_callback' => 'absint',
            ),
            'role' => array(
                'description'       => __( 'Filtrar por rol de usuario.', 'pos2025' ),
                'type'              => 'string',
                'default'           => 'customer',
                'sanitize_callback' => 'sanitize_key',
            ),
        ),
    ) );

    // --- Endpoint para CREAR un nuevo cliente (POST) ---
    register_rest_route( $namespace, '/customers', array(
        'methods'             => WP_REST_Server::CREATABLE, // POST
        'callback'            => 'pos2025_api_create_customer',
        'permission_callback' => '__return_true', // Permisos desactivados temporalmente
        'args'                => array(
            'email' => array(
                'required'          => true,
                'type'              => 'string',
                'format'            => 'email',
                'description'       => __( 'Correo electrónico del cliente (obligatorio).', 'pos2025' ),
                'validate_callback' => 'rest_validate_request_arg',
                'sanitize_callback' => 'sanitize_email',
            ),
            'first_name' => array(
                'required'          => false,
                'type'              => 'string',
                'description'       => __( 'Nombre del cliente.', 'pos2025' ),
                'sanitize_callback' => 'sanitize_text_field',
            ),
            'last_name' => array(
                'required'          => false,
                'type'              => 'string',
                'description'       => __( 'Apellidos del cliente.', 'pos2025' ),
                'sanitize_callback' => 'sanitize_text_field',
            ),
            'phone' => array(
                'required'          => false,
                'type'              => 'string',
                'description'       => __( 'Teléfono del cliente (se guardará en billing_phone).', 'pos2025' ),
                'sanitize_callback' => 'sanitize_text_field',
            ),
            // Añadir aquí más args si incluyes campos de dirección en el formulario
        ),
    ) );

    // --- Endpoint para ACTUALIZAR un cliente existente (PUT) ---
    register_rest_route( $namespace, '/customers/(?P<id>\d+)', array(
        'methods'             => WP_REST_Server::EDITABLE, // PUT/PATCH
        'callback'            => 'pos2025_api_update_customer',
        'permission_callback' => '__return_true', // Permisos desactivados temporalmente
        'args'                => array(
            'id' => array(
                'description'       => __( 'ID del cliente a actualizar.', 'pos2025' ),
                'type'              => 'integer',
                'validate_callback' => function( $param, $request, $key ) {
                    return is_numeric( $param ) && $param > 0;
                },
                'sanitize_callback' => 'absint',
            ),
            'email' => array(
                'required'          => true,
                'type'              => 'string',
                'format'            => 'email',
                'description'       => __( 'Correo electrónico del cliente.', 'pos2025' ),
                'validate_callback' => 'rest_validate_request_arg',
                'sanitize_callback' => 'sanitize_email',
            ),
            'first_name' => array(
                'required'          => false,
                'type'              => 'string',
                'description'       => __( 'Nombre del cliente.', 'pos2025' ),
                'sanitize_callback' => 'sanitize_text_field',
            ),
            'last_name' => array(
                'required'          => false,
                'type'              => 'string',
                'description'       => __( 'Apellidos del cliente.', 'pos2025' ),
                'sanitize_callback' => 'sanitize_text_field',
            ),
            'phone' => array(
                'required'          => false,
                'type'              => 'string',
                'description'       => __( 'Teléfono del cliente (se guardará en billing_phone).', 'pos2025' ),
                'sanitize_callback' => 'sanitize_text_field',
            ),
            // Añadir aquí más args si incluyes campos de dirección en el formulario
        ),
    ) );

    // --- Endpoint para CREAR pedidos/suscripciones/créditos ---
    register_rest_route( $namespace, '/orders', array(
        'methods'             => WP_REST_Server::CREATABLE, // Método POST
        'callback'            => 'pos2025_api_create_order',
        'permission_callback' => '__return_true', // Permisos desactivados temporalmente
        'args'                => array( // Definir argumentos esperados y validación/sanitización
            'line_items' => array(
                'required' => true,
                'description' => __('Array de artículos del pedido.', 'pos2025'),
                'type' => 'array',
                'items' => [
                    'type' => 'object',
                    'properties' => [
                        'product_id' => ['type' => 'integer', 'required' => true],
                        'variation_id' => ['type' => 'integer'],
                        'quantity' => ['type' => 'integer', 'required' => true],
                    ],
                ],
                'validate_callback' => function($param, $request, $key) {
                    if ( !is_array($param) || empty($param) ) return new WP_Error('rest_invalid_param', __('line_items debe ser un array no vacío.', 'pos2025'), ['status' => 400]);
                    foreach ($param as $item) {
                        if ( empty($item['product_id']) || !isset($item['quantity']) || !is_numeric($item['product_id']) || !is_numeric($item['quantity']) || $item['quantity'] < 1 ) {
                            return new WP_Error('rest_invalid_param', __('Cada item en line_items debe tener product_id y quantity (numéricos, quantity >= 1).', 'pos2025'), ['status' => 400]);
                        }
                        if ( isset($item['variation_id']) && !is_numeric($item['variation_id']) ) {
                            return new WP_Error('rest_invalid_param', __('variation_id debe ser numérico si se proporciona.', 'pos2025'), ['status' => 400]);
                        }
                    }
                    return true;
                },
            ),
            'payment_method' => array(
                'required' => true, 'type' => 'string', 'description' => __('ID de la pasarela de pago.', 'pos2025'),
                'sanitize_callback' => 'sanitize_text_field',
            ),
            'payment_method_title' => array(
                'required' => true, 'type' => 'string', 'description' => __('Título de la pasarela de pago.', 'pos2025'),
                'sanitize_callback' => 'sanitize_text_field',
            ),
            'status' => array(
                'required' => false, 'type' => 'string', 'default' => 'processing', 'description' => __('Estado deseado para el pedido.', 'pos2025'),
                'sanitize_callback' => 'sanitize_key',
            ),
            'customer_id' => array(
                'required' => false, 'type' => 'integer', 'default' => 0, 'description' => __('ID del cliente (0 para invitado).', 'pos2025'),
                'sanitize_callback' => 'absint',
            ),
            'sale_type' => array(
                'required' => false, 'type' => 'string', 'default' => 'direct', 'enum' => ['direct', 'subscription', 'credit'], 'description' => __('Tipo de venta.', 'pos2025'),
                'sanitize_callback' => 'sanitize_key',
            ),
            'customer_note' => array(
                'required' => false, 'type' => 'string', 'default' => '', 'description' => __('Nota para el cliente.', 'pos2025'),
                'sanitize_callback' => 'sanitize_textarea_field',
            ),
            // Argumentos específicos de suscripción (Calendario)
            'subscription_title' => array(
                'required' => false, 'type' => 'string', 'description' => __('Título para el evento de calendario.', 'pos2025'),
                'sanitize_callback' => 'sanitize_text_field',
            ),
             'subscription_start_date' => array(
                'required' => false, 'type' => 'string', 'format' => 'date', 'description' => __('Fecha de inicio (YYYY-MM-DD).', 'pos2025'),
                'sanitize_callback' => 'sanitize_text_field', // Se valida formato después
            ),
             'subscription_color' => array(
                'required' => false, 'type' => 'string', 'description' => __('Color hexadecimal para el evento.', 'pos2025'),
                'sanitize_callback' => 'sanitize_hex_color',
            ),
        ),
    ) );

    // --- FIN DE REGISTRO DE RUTAS ---

} // <--- FIN de la función pos2025_register_rest_routes
add_action( 'rest_api_init', 'pos2025_register_rest_routes' );


// --- FUNCIONES DE CALLBACK ---

/**
 * Callback para el endpoint de búsqueda de productos.
 * MODIFICADO: Añadido soporte para parámetro 'featured'.
 */
function pos2025_api_search_products( WP_REST_Request $request ) {
    $search_term = $request->get_param( 'search' );
    $per_page    = $request->get_param( 'per_page' );
    $page        = $request->get_param( 'page' );
    $featured    = $request->get_param( 'featured' ); // Obtener el nuevo parámetro

    $args = array(
        'status'    => 'publish',
        'limit'     => $per_page,
        'page'      => $page,
        'orderby'   => 'title', // Orden por defecto
        'order'     => 'ASC',
        'type'      => array('simple', 'variable'),
        'return'    => 'objects',
    );

    // --- MODIFICACIÓN: Aplicar filtro 'featured' si se solicitó ---
    if ( $featured === true ) {
        $args['featured'] = true;
        // Opcional: Cambiar orden para destacados (ej. por fecha)
        // $args['orderby'] = 'date';
        // $args['order'] = 'DESC';
    }

    // Si hay término de búsqueda, lo añadimos (sobrescribe 'featured' si ambos están presentes)
    if ( ! empty( $search_term ) ) {
        $args['s'] = $search_term;
        // Quitar 'featured' si estamos buscando por término, para evitar conflictos
        unset( $args['featured'] );
        // La meta query para SKU sigue igual
        $args['meta_query'] = array(
            'relation' => 'OR',
             array( // Necesario para que 's' funcione junto con meta_query
                 'key' => '_sku',
                 'compare' => 'EXISTS' // O una condición que siempre sea verdadera si no buscas SKU
             ),
            array(
                'key'     => '_sku',
                'value'   => $search_term,
                'compare' => 'LIKE',
            )
        );
    }

    // El resto de la función sigue igual...
    $products_query = new WC_Product_Query( $args );
    $products_data = $products_query->get_products();

    $results = array();
    if ( ! empty( $products_data ) ) {
        foreach ( $products_data as $product ) {
             if ( ! $product instanceof WC_Product ) continue;

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

    // Preparamos la respuesta
    $response = new WP_REST_Response( $results, 200 );

    // Añadir cabeceras de paginación
    // Re-ejecutar la consulta solo para obtener el total
    $count_args = $args; // Copiar argumentos
    $count_args['return'] = 'ids'; // Más eficiente para contar
    $count_args['limit'] = -1; // Contar todos
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
function pos2025_api_get_payment_gateways( WP_REST_Request $request ) {
    if ( ! class_exists( 'WooCommerce' ) ) {
        return new WP_Error( 'woocommerce_inactive', __( 'WooCommerce no está activo.', 'pos2025' ), array( 'status' => 503 ) );
    }
    $available_gateways = WC()->payment_gateways->get_available_payment_gateways();
    $formatted_gateways = array();
    if ( $available_gateways ) {
        foreach ( $available_gateways as $gateway ) {
            if ( $gateway->enabled == 'yes' ) {
                $formatted_gateways[] = array(
                    'id'    => $gateway->id,
                    'title' => $gateway->get_title(),
                );
            }
        }
    }
    return new WP_REST_Response( $formatted_gateways, 200 );
}


/**
 * Callback para buscar usuarios (clientes).
 */
function pos2025_api_search_customers( WP_REST_Request $request ) {
    global $wpdb;
    $search_term = $request->get_param( 'search' );
    $per_page    = $request->get_param( 'per_page' );
    $page        = $request->get_param( 'page' );
    $role        = $request->get_param( 'role' );

    $args = array(
        'number'    => $per_page,
        'paged'     => $page,
        'orderby'   => 'display_name',
        'order'     => 'ASC',
    );

    if ( ! empty( $role ) ) {
        $args['role__in'] = (array) $role;
    }

    if ( ! empty( $search_term ) ) {
        $args['search'] = '*' . esc_attr( $search_term ) . '*';
        $args['search_columns'] = array( 'user_login', 'user_email', 'user_nicename', 'display_name' );
        $args['meta_query'] = array(
            'relation' => 'OR',
            array( 'key' => 'first_name', 'value' => $search_term, 'compare' => 'LIKE' ),
            array( 'key' => 'last_name', 'value' => $search_term, 'compare' => 'LIKE' ),
            array( 'key' => 'billing_first_name', 'value' => $search_term, 'compare' => 'LIKE' ),
            array( 'key' => 'billing_last_name', 'value' => $search_term, 'compare' => 'LIKE' ),
            array( 'key' => 'billing_email', 'value' => $search_term, 'compare' => 'LIKE' ),
        );
    }

    $user_query = new WP_User_Query( $args );
    $customers = $user_query->get_results();
    $total_customers = $user_query->get_total();

    $results = array();
    if ( ! empty( $customers ) ) {
        foreach ( $customers as $customer ) {
            $results[] = array(
                'id'           => $customer->ID,
                'display_name' => $customer->display_name,
                'email'        => $customer->user_email,
                'first_name'   => $customer->first_name,
                'last_name'    => $customer->last_name,
                'phone'        => get_user_meta( $customer->ID, 'billing_phone', true ),
            );
        }
    }

    $response = new WP_REST_Response( $results, 200 );
    $total_pages = ($per_page > 0 && $total_customers > 0) ? ceil( $total_customers / $per_page ) : 1;
    $response->header( 'X-WP-Total', $total_customers );
    $response->header( 'X-WP-TotalPages', $total_pages );

    return $response;
}

/**
 * Callback para CREAR un nuevo cliente.
 */
function pos2025_api_create_customer( WP_REST_Request $request ) {
    $params = $request->get_params();
    $email = $params['email'];

    if ( email_exists( $email ) ) {
        return new WP_Error( 'rest_customer_email_exists', __( 'Ya existe un usuario con este correo electrónico.', 'pos2025' ), array( 'status' => 409 ) );
    }

    $username = sanitize_user( explode( '@', $email )[0], true );
    $original_username = $username;
    $count = 1;
    while ( username_exists( $username ) ) { $username = $original_username . $count; $count++; }
    $password = wp_generate_password( 12, true );

    $customer_id = wc_create_new_customer( $email, $username, $password );

    if ( is_wp_error( $customer_id ) ) {
        error_log( "POS2025 Error al crear cliente (wc_create_new_customer): " . $customer_id->get_error_message() );
        return new WP_Error( 'rest_customer_creation_failed', __( 'No se pudo crear el cliente.', 'pos2025' ) . ' ' . $customer_id->get_error_message(), array( 'status' => 500 ) );
    }

    $userdata = array( 'ID' => $customer_id );
    if ( isset( $params['first_name'] ) && !empty($params['first_name']) ) {
        $userdata['first_name'] = $params['first_name'];
        update_user_meta( $customer_id, 'billing_first_name', $params['first_name'] );
        update_user_meta( $customer_id, 'shipping_first_name', $params['first_name'] );
    }
    if ( isset( $params['last_name'] ) && !empty($params['last_name']) ) {
        $userdata['last_name'] = $params['last_name'];
        update_user_meta( $customer_id, 'billing_last_name', $params['last_name'] );
        update_user_meta( $customer_id, 'shipping_last_name', $params['last_name'] );
    }
    if (count($userdata) > 1) { wp_update_user($userdata); }
    if ( isset( $params['phone'] ) ) { update_user_meta( $customer_id, 'billing_phone', $params['phone'] ); }

    $customer_data = get_userdata( $customer_id );
    $response_data = array(
        'id'           => $customer_id,
        'email'        => $customer_data->user_email,
        'first_name'   => $customer_data->first_name,
        'last_name'    => $customer_data->last_name,
        'display_name' => $customer_data->display_name,
        'phone'        => get_user_meta( $customer_id, 'billing_phone', true ),
    );

    $response = new WP_REST_Response( $response_data, 201 );
    $response->header( 'Location', rest_url( sprintf( '%s/customers/%d', 'pos2025/v1', $customer_id ) ) );
    return $response;
}


/**
 * Callback para ACTUALIZAR un cliente existente.
 */
function pos2025_api_update_customer( WP_REST_Request $request ) {
    $params = $request->get_params();
    $customer_id = absint( $params['id'] );
    $email = $params['email'];

    $customer = get_userdata( $customer_id );
    if ( ! $customer ) {
        return new WP_Error( 'rest_customer_not_found', __( 'Cliente no encontrado.', 'pos2025' ), array( 'status' => 404 ) );
    }

    if ( strtolower( $email ) !== strtolower( $customer->user_email ) && email_exists( $email ) ) {
        return new WP_Error( 'rest_customer_email_exists', __( 'Ya existe otro usuario con este correo electrónico.', 'pos2025' ), array( 'status' => 409 ) );
    }

    $userdata = array( 'ID' => $customer_id, 'user_email' => $email );
    if ( isset( $params['first_name'] ) ) { $userdata['first_name'] = $params['first_name']; }
    if ( isset( $params['last_name'] ) ) { $userdata['last_name'] = $params['last_name']; }

    $updated_user_id = wp_update_user( $userdata );

    if ( is_wp_error( $updated_user_id ) ) {
        error_log( "POS2025 Error al actualizar cliente (wp_update_user): " . $updated_user_id->get_error_message() );
        return new WP_Error( 'rest_customer_update_failed', __( 'No se pudo actualizar el cliente.', 'pos2025' ) . ' ' . $updated_user_id->get_error_message(), array( 'status' => 500 ) );
    }

    if ( isset( $params['first_name'] ) ) {
        update_user_meta( $customer_id, 'billing_first_name', $params['first_name'] );
        update_user_meta( $customer_id, 'shipping_first_name', $params['first_name'] );
    }
    if ( isset( $params['last_name'] ) ) {
        update_user_meta( $customer_id, 'billing_last_name', $params['last_name'] );
        update_user_meta( $customer_id, 'shipping_last_name', $params['last_name'] );
    }
    if ( isset( $params['phone'] ) ) {
        update_user_meta( $customer_id, 'billing_phone', $params['phone'] );
    } else {
        // delete_user_meta($customer_id, 'billing_phone'); // Opcional: borrar si no se envía
    }

    $customer_data = get_userdata( $customer_id );
    $response_data = array(
        'id'           => $customer_id,
        'email'        => $customer_data->user_email,
        'first_name'   => $customer_data->first_name,
        'last_name'    => $customer_data->last_name,
        'display_name' => $customer_data->display_name,
        'phone'        => get_user_meta( $customer_id, 'billing_phone', true ),
    );

    return new WP_REST_Response( $response_data, 200 );
}


 /**
  * Callback para crear un nuevo pedido/suscripción/crédito de WooCommerce desde el TPV.
  */
 function pos2025_api_create_order( WP_REST_Request $request ) {
     $params = $request->get_params();
     $line_items           = $params['line_items'];
     $payment_method       = $params['payment_method'];
     $payment_method_title = $params['payment_method_title'];
     $customer_id          = $params['customer_id'];
     $status               = $params['status'];
     $sale_type            = $params['sale_type'];
     $customer_note        = $params['customer_note'];
     $subscription_title        = $params['subscription_title'] ?? null;
     $subscription_event_date_str = $params['subscription_start_date'] ?? null;
     $subscription_color        = $params['subscription_color'] ?? null;

     error_log("POS2025 CREATE ORDER - Inicio. Sale Type: {$sale_type}, Customer ID: {$customer_id}, Nota Recibida: '{$customer_note}'");

     try {
         $order = wc_create_order( array( 'customer_id' => $customer_id, 'status' => 'pending' ) );
         if ( is_wp_error( $order ) ) {
             error_log("POS2025 Error: wc_create_order falló. " . $order->get_error_message());
             return new WP_Error( 'rest_order_creation_failed', __( 'No se pudo crear el objeto de pedido.', 'pos2025' ), array( 'status' => 500 ) );
         }
         $order_id_temp = $order->get_id();
         error_log("POS2025 CREATE ORDER - Objeto Pedido Creado (ID: {$order_id_temp})");

         if ( ! empty( $customer_note ) ) {
            $order->add_order_note( $customer_note, true );
            error_log("POS2025 CREATE ORDER - Nota Cliente añadida al historial del pedido.");
         } else { error_log("POS2025 CREATE ORDER - Nota Cliente vacía."); }

         $has_valid_items = false;
         foreach ( $line_items as $item ) {
             $product_id   = $item['product_id'];
             $variation_id = $item['variation_id'] ?? 0;
             $quantity     = $item['quantity'];
             $product = wc_get_product( $variation_id ?: $product_id );
             if ( ! $product ) { error_log("POS2025 Advertencia: Producto ID {$product_id} / Variación ID {$variation_id} no encontrado."); continue; }
             $order->add_product( $product, $quantity );
             $has_valid_items = true;
         }
         if ( !$has_valid_items ) {
              $order->delete(true);
              error_log("POS2025 Error: No se añadieron productos válidos. Pedido {$order_id_temp} borrado.");
              return new WP_Error( 'rest_no_valid_products', __( 'No se pudieron añadir productos válidos al pedido.', 'pos2025' ), array( 'status' => 400 ) );
         }
         error_log("POS2025 CREATE ORDER - Productos añadidos.");

         if ( $customer_id > 0 ) {
              error_log("POS2025 CREATE ORDER - Intentando obtener dirección para Customer ID: {$customer_id}");
              $customer = new WC_Customer( $customer_id );
              if ( $customer && $customer->get_id() > 0 ) {
                  $billing_address = $customer->get_billing(); // Obtener array completo
                  $shipping_address = $customer->get_shipping(); // Obtener array completo
                  error_log("POS2025 CREATE ORDER - Dirección Facturación Obtenida: " . print_r($billing_address, true));
                  if (!empty($billing_address) && (!empty($billing_address['email']) || !empty($billing_address['first_name']))) {
                      $order->set_address( $billing_address, 'billing' ); error_log("POS2025 CREATE ORDER - Dirección Facturación establecida.");
                  } else { error_log("POS2025 CREATE ORDER - Dirección Facturación incompleta."); }
                  if (!empty($shipping_address) && (!empty($shipping_address['first_name']) || !empty($shipping_address['address_1']))) {
                       $order->set_address( $shipping_address, 'shipping' ); error_log("POS2025 CREATE ORDER - Dirección Envío establecida.");
                  } elseif (!empty($billing_address) && (!empty($billing_address['email']) || !empty($billing_address['first_name']))) {
                       $order->set_address( $billing_address, 'shipping' ); error_log("POS2025 CREATE ORDER - Dirección Envío (fallback a facturación) establecida.");
                  } else { error_log("POS2025 CREATE ORDER - Dirección Envío incompleta."); }
              } else { error_log("POS2025 CREATE ORDER - WC_Customer no encontrado para ID: {$customer_id}"); }
         } else { error_log("POS2025 CREATE ORDER - No hay Customer ID."); }

         $order->set_payment_method( $payment_method );
         $order->set_payment_method_title( $payment_method_title );
         error_log("POS2025 CREATE ORDER - Método de pago establecido.");
         $order->calculate_totals();
         error_log("POS2025 CREATE ORDER - Totales calculados.");

         $order_id = null;

         if ( $sale_type === 'subscription' ) {
             error_log("POS2025 CREATE ORDER - Procesando tipo: subscription");
             if ( empty($subscription_title) ) { $order->delete(true); error_log("POS2025 Error: Título evento vacío."); return new WP_Error('rest_invalid_subscription_data', __('El título del evento es obligatorio.', 'pos2025'), ['status' => 400]); }
             $event_date_valid = false;
             if ( $subscription_event_date_str && preg_match('/^\d{4}-\d{2}-\d{2}$/', $subscription_event_date_str) ) { $d = DateTime::createFromFormat('Y-m-d', $subscription_event_date_str); if ($d && $d->format('Y-m-d') === $subscription_event_date_str) { $event_date_valid = true; } }
             if ( !$event_date_valid ) { $order->delete(true); error_log("POS2025 Error: Fecha evento inválida."); return new WP_Error('rest_invalid_subscription_data', __('La fecha de inicio es obligatoria (YYYY-MM-DD).', 'pos2025'), ['status' => 400]); }
             if ( $customer_id <= 0 ) { $order->delete(true); error_log("POS2025 Error: Cliente no seleccionado para suscripción."); return new WP_Error('rest_invalid_subscription_data', __('Se requiere un cliente.', 'pos2025'), ['status' => 400]); }

             $order->update_meta_data( '_pos_sale_type', 'subscription' );
             $order->update_meta_data( '_pos_calendar_event_title', $subscription_title );
             $order->update_meta_data( '_pos_calendar_event_date', $subscription_event_date_str );
             $order->update_meta_data( '_pos_calendar_event_color', $subscription_color ?: '#3a87ad' );
             error_log("POS2025 CREATE ORDER - Metadatos de evento añadidos.");
             $order->update_status( $status, __( 'Pedido POS con datos de evento.', 'pos2025' ), true );
             error_log("POS2025 CREATE ORDER - Estado actualizado a: {$status}");
             $order_id = $order->save();
             error_log("POS2025 CREATE ORDER - Pedido guardado. ID final: {$order_id}");
             if ( ! $order_id ) { error_log("POS2025 Error: $order->save() falló."); return new WP_Error( 'rest_order_save_failed', __( 'No se pudo guardar el pedido de evento.', 'pos2025' ), array( 'status' => 500 ) ); }
             $response_data = array( 'success' => true, 'order_id' => $order_id, 'message' => __('Pedido con datos de evento creado.', 'pos2025') );
             return new WP_REST_Response( $response_data, 201 );

         } elseif ( $sale_type === 'credit' ) {
             error_log("POS2025 CREATE ORDER - Procesando tipo: credit");
             if ( $customer_id <= 0 ) { $order->delete(true); error_log("POS2025 Error: Cliente no seleccionado para crédito."); return new WP_Error('rest_invalid_credit_data', __('Se requiere un cliente para crédito.', 'pos2025'), ['status' => 400]); }
             $order->update_meta_data( '_pos_sale_type', 'credit' ); error_log("POS2025 CREATE ORDER - Metadato _pos_sale_type=credit añadido.");
             $order->update_status( 'on-hold', __( 'Pedido a crédito TPV.', 'pos2025' ), true ); error_log("POS2025 CREATE ORDER - Estado actualizado a: on-hold");
             $order_id = $order->save(); error_log("POS2025 CREATE ORDER - Pedido guardado. ID final: {$order_id}");
             if ( ! $order_id ) { error_log("POS2025 Error: $order->save() falló."); return new WP_Error( 'rest_order_save_failed', __( 'No se pudo guardar el pedido a crédito.', 'pos2025' ), array( 'status' => 500 ) ); }
             $response_data = array( 'success' => true, 'order_id' => $order_id, 'message' => __('Pedido a crédito creado.', 'pos2025') );
             return new WP_REST_Response( $response_data, 201 );

         } else { // Venta Directa
             error_log("POS2025 CREATE ORDER - Procesando tipo: direct");
             $order->update_meta_data( '_pos_sale_type', 'direct' ); error_log("POS2025 CREATE ORDER - Metadato _pos_sale_type=direct añadido.");
             $order->update_status( $status, __( 'Pedido TPV POS 2025.', 'pos2025' ), true ); error_log("POS2025 CREATE ORDER - Estado actualizado a: {$status}");
             $order_id = $order->save(); error_log("POS2025 CREATE ORDER - Pedido guardado. ID final: {$order_id}");
             if ( ! $order_id ) { error_log("POS2025 Error: $order->save() falló."); return new WP_Error( 'rest_order_save_failed', __( 'No se pudo guardar el pedido.', 'pos2025' ), array( 'status' => 500 ) ); }
             $response_data = array( 'success' => true, 'order_id' => $order_id, 'message' => __('Pedido creado con éxito.', 'pos2025') );
             return new WP_REST_Response( $response_data, 201 );
         }

     } catch ( Exception $e ) {
          error_log("POS2025 Error Crítico al procesar pedido ({$sale_type}): " . $e->getMessage() . "\nTrace: " . $e->getTraceAsString());
          if ( isset($order) && $order instanceof WC_Order ) {
              $order->add_order_note( sprintf( __('Error TPV: %s', 'pos2025'), $e->getMessage() ), false );
              $order->update_status('failed', __('Error creación TPV.', 'pos2025'));
              $order->save();
          }
          return new WP_Error( 'rest_order_exception', __( 'Error inesperado: ', 'pos2025' ) . $e->getMessage(), array( 'status' => 500 ) );
     }
 }

?>
