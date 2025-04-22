<?php
    /**
     * Registra los endpoints de la API REST para el TPV (POS 2025)
    */

    // Si este archivo es llamado directamente, abortar.
    if ( ! defined( 'ABSPATH' ) ) {
        exit;
    }

    /**
    * Comprueba si el usuario actual tiene permisos para usar la API del TPV
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
            'permission_callback' => '__return_true', // ¡CAMBIAR PARA PRODUCCIÓN!
            'args'                => array(
                'search' => array(
                    'description'       => __('Término de búsqueda (nombre, SKU).', 'pos2025'),
                    'type'              => 'string',
                    'required'          => false,
                    'sanitize_callback' => 'sanitize_text_field',
                ),
                'per_page' => array(
                    'description'       => __('Resultados por página.', 'pos2025'),
                    'type'              => 'integer',
                    'default'           => 15,
                    'minimum'           => 1,
                    'maximum'           => 100,
                    'sanitize_callback' => 'absint',
                ),
                'page' => array(
                    'description'       => __('Página actual.', 'pos2025'),
                    'type'              => 'integer',
                    'default'           => 1,
                    'minimum'           => 1,
                    'sanitize_callback' => 'absint',
                ),
                'featured' => array(
                    'description'       => __('Filtrar por productos destacados.', 'pos2025'),
                    'type'              => 'boolean',
                    'default'           => false,
                    'sanitize_callback' => 'rest_sanitize_boolean',
                ),
            ),
        ) );

        // --- Endpoint para obtener pasarelas de pago ---
        register_rest_route( $namespace, '/payment-gateways', array(
            'methods'             => WP_REST_Server::READABLE, // Método GET
            'callback'            => 'pos2025_api_get_payment_gateways',
            'permission_callback' => '__return_true', // ¡CAMBIAR PARA PRODUCCIÓN!
        ) );

        // --- Endpoint para buscar clientes (GET) ---
        register_rest_route( $namespace, '/customers', array(
            'methods'             => WP_REST_Server::READABLE, // Método GET
            'callback'            => 'pos2025_api_search_customers', // <--- Callback ahora definido abajo
            'permission_callback' => '__return_true', // ¡CAMBIAR PARA PRODUCCIÓN!
            'args'                => array(
                'search' => array(
                    'description'       => __('Término de búsqueda para clientes (nombre, apellido, email).', 'pos2025'),
                    'type'              => 'string',
                    'required'          => false,
                    'sanitize_callback' => 'sanitize_text_field',
                ),
                'per_page' => array(
                    'description'       => __('Número de clientes por página.', 'pos2025'),
                    'type'              => 'integer',
                    'default'           => 15,
                    'minimum'           => 1,
                    'maximum'           => 100,
                    'sanitize_callback' => 'absint',
                ),
                'page' => array(
                    'description'       => __('Página actual de resultados.', 'pos2025'),
                    'type'              => 'integer',
                    'default'           => 1,
                    'minimum'           => 1,
                    'sanitize_callback' => 'absint',
                ),
            ),
        ) );

        // --- Endpoint para CREAR un nuevo cliente (POST) ---
        register_rest_route( $namespace, '/customers', array(
            'methods'             => WP_REST_Server::CREATABLE, // POST
            'callback'            => 'pos2025_api_create_customer', // <--- Callback ahora definido abajo
            'permission_callback' => '__return_true', // ¡CAMBIAR PARA PRODUCCIÓN!
            'args'                => array(
                'email' => array(
                    'required'          => true,
                    'type'              => 'string',
                    'format'            => 'email',
                    'description'       => __('Correo electrónico del cliente.', 'pos2025'),
                    'validate_callback' => 'rest_validate_request_arg',
                    'sanitize_callback' => 'sanitize_email',
                ),
                'first_name' => array(
                    'required'          => false,
                    'type'              => 'string',
                    'description'       => __('Nombre del cliente.', 'pos2025'),
                    'sanitize_callback' => 'sanitize_text_field',
                ),
                'last_name' => array(
                    'required'          => false,
                    'type'              => 'string',
                    'description'       => __('Apellidos del cliente.', 'pos2025'),
                    'sanitize_callback' => 'sanitize_text_field',
                ),
                // 'password' => array(
                //     'required'          => true, // Requerido porque lo enviamos desde JS (workaround)
                //     'type'              => 'string',
                //     'description'       => __('Contraseña temporal del cliente.', 'pos2025'),
                // ),
                'billing' => array(
                    'type' => 'object',
                    'properties' => array(
                        'phone' => array(
                            'type' => 'string',
                            'description' => __('Teléfono de facturación.', 'pos2025'),
                            'sanitize_callback' => 'sanitize_text_field',
                        ),
                    ),
                ),
            ),
        ) );

        // --- Endpoint para ACTUALIZAR un cliente existente (PUT) ---
        register_rest_route( $namespace, '/customers/(?P<id>\d+)', array(
            'methods'             => WP_REST_Server::EDITABLE, // PUT/PATCH
            'callback'            => 'pos2025_api_update_customer', // <--- Callback ahora definido abajo
            'permission_callback' => '__return_true', // ¡CAMBIAR PARA PRODUCCIÓN!
            'args'                => array(
                'id' => array(
                    'description'       => __('ID único del cliente.', 'pos2025'),
                    'type'              => 'integer',
                    'validate_callback' => function( $param, $request, $key ) {
                        return is_numeric( $param ) && $param > 0;
                    },
                    'required'          => true,
                ),
                'email' => array(
                    'required'          => false,
                    'type'              => 'string',
                    'format'            => 'email',
                    'description'       => __('Correo electrónico del cliente.', 'pos2025'),
                    'validate_callback' => 'rest_validate_request_arg',
                    'sanitize_callback' => 'sanitize_email',
                ),
                'first_name' => array(
                    'required'          => false,
                    'type'              => 'string',
                    'description'       => __('Nombre del cliente.', 'pos2025'),
                    'sanitize_callback' => 'sanitize_text_field',
                ),
                'last_name' => array(
                    'required'          => false,
                    'type'              => 'string',
                    'description'       => __('Apellidos del cliente.', 'pos2025'),
                    'sanitize_callback' => 'sanitize_text_field',
                ),
                'billing' => array(
                    'type' => 'object',
                    'properties' => array(
                        'phone' => array(
                            'type' => 'string',
                            'description' => __('Teléfono de facturación.', 'pos2025'),
                            'sanitize_callback' => 'sanitize_text_field',
                        ),
                    ),
                ),
            ),
        ) );

        // --- Endpoint para CREAR pedidos/suscripciones/créditos ---
        register_rest_route( $namespace, '/orders', array(
            'methods'             => WP_REST_Server::CREATABLE, // Método POST
            'callback'            => 'pos2025_api_create_order',
            'permission_callback' => '__return_true', // ¡CAMBIAR PARA PRODUCCIÓN!
            'args'                => array(
                'payment_method' => array( 'required' => true, 'type' => 'string', 'sanitize_callback' => 'sanitize_key' ),
                'customer_id'    => array( 'required' => false, 'type' => 'integer', 'sanitize_callback' => 'absint', 'default' => 0 ),
                'line_items'     => array( 'required' => true, 'type' => 'array', /* Añadir validación de items si es necesario */ ),
                'customer_note'  => array( 'required' => false, 'type' => 'string', 'sanitize_callback' => 'sanitize_textarea_field' ),
                'pos_sale_type'  => array( 'required' => true, 'type' => 'string', 'sanitize_callback' => 'sanitize_key' ),
                'pos_calendar_event_title' => array( 'required' => false, 'type' => 'string', 'sanitize_callback' => 'sanitize_text_field' ),
                'pos_calendar_event_date'  => array( 'required' => false, 'type' => 'string', 'validate_callback' => 'pos2025_validate_date_format' ),
                'pos_calendar_event_color' => array( 'required' => false, 'type' => 'string', 'sanitize_callback' => 'sanitize_hex_color' ),
            ),
        ) );

        // --- Endpoint para OBTENER eventos del calendario ---
        register_rest_route( $namespace, '/events', array(
            'methods'             => WP_REST_Server::READABLE, // GET
            'callback'            => 'pos2025_api_get_calendar_events',
            'permission_callback' => '__return_true', // ¡CAMBIAR PARA PRODUCCIÓN!
            'args'                => array(
                'start' => array( /* ... */ ),
                'end'   => array( /* ... */ ),
            ),
        ) );

        // --- Endpoint para CREAR eventos personalizados ---
        register_rest_route( $namespace, '/events/custom', array(
            'methods'             => WP_REST_Server::CREATABLE, // POST
            'callback'            => 'pos2025_api_create_custom_event',
            'permission_callback' => function () {
                return current_user_can( 'manage_woocommerce' );
            },
            'args'                => array(
                'title' => array( /* ... */ ),
                'start' => array( /* ... */ ),
                'description' => array( /* ... */ ),
                'color' => array( /* ... */ ),
                'allDay' => array( /* ... */ ),
            ),
        ) );

        // --- Endpoint para ELIMINAR un evento personalizado ---
        register_rest_route( $namespace, '/events/custom/(?P<id>[a-zA-Z0-9_-]+)', array(
            // La regex captura IDs como 'custom_uuid-...'
            'methods'             => WP_REST_Server::DELETABLE, // DELETE
            'callback'            => 'pos2025_api_delete_custom_event',
            'permission_callback' => '__return_true', //'pos2025_api_permissions_check', // <-- ¡USA ESTA!
            'args'                => array(
                'id' => array(
                    'description'       => __('ID único del evento personalizado a eliminar (ej: custom_uuid).', 'pos2025'),
                    'type'              => 'string',
                    'required'          => true,
                    'validate_callback' => function( $param, $request, $key ) {
                        // Validación simple: no vacío y es string
                        return ! empty( $param ) && is_string( $param );
                    }
                ),
            ),
        ) );
    }
    add_action( 'rest_api_init', 'pos2025_register_rest_routes' );

    // --- FUNCIONES DE CALLBACK ---
    //------------------------------

    /**
     * Callback para el endpoint de búsqueda de productos.
     */
    function pos2025_api_search_products( WP_REST_Request $request ) {
        // ... (Código completo de pos2025_api_search_products como antes) ...
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
            // Añadir búsqueda por SKU
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
        }

        error_log('[POS API Products] - WC_Query Args: ' . print_r($args, true));

        $products_query = new WC_Product_Query( $args );
        $products_data = $products_query->get_products();

        error_log('[POS API Products] - WC_Query Result Count: ' . count($products_data));

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

        $response = new WP_REST_Response( $results, 200 );

        // Calcular totales para paginación
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
    function pos2025_api_get_payment_gateways( WP_REST_Request $request ) {
        // ... (Código completo de pos2025_api_get_payment_gateways como antes) ...
        error_log("[POS API Gateways] - get_payment_gateways request received.");
        if ( ! class_exists( 'WooCommerce' ) || ! isset( WC()->payment_gateways ) ) {
            error_log("[POS API Gateways] - Error: WooCommerce or Payment Gateways class not available.");
            return new WP_Error('woocommerce_not_active', __('WooCommerce no está activo.', 'pos2025'), array('status' => 503));
        }
        $available_gateways = WC()->payment_gateways->get_available_payment_gateways();
        $active_gateways_data = array();
        if (!empty($available_gateways)) {
            error_log("[POS API Gateways] - Found " . count($available_gateways) . " available gateways.");
            foreach ($available_gateways as $gateway) {
                if ($gateway->enabled === 'yes') {
                    $active_gateways_data[] = array(
                        'id'          => $gateway->id,
                        'title'       => $gateway->get_title(),
                        'description' => $gateway->get_description(),
                        'icon'        => $gateway->get_icon(),
                        'chosen'      => $gateway->chosen,
                    );
                    error_log("[POS API Gateways] - Adding gateway: {$gateway->id} - {$gateway->get_title()}");
                } else {
                    error_log("[POS API Gateways] - Skipping disabled gateway: {$gateway->id}");
                }
            }
        } else {
            error_log("[POS API Gateways] - No available payment gateways found.");
        }
        return new WP_REST_Response($active_gateways_data, 200);
    }

    /**
     * Callback para buscar usuarios (clientes).
     */
    function pos2025_api_search_customers( WP_REST_Request $request ) {
        // ... (Código completo de pos2025_api_search_customers como antes) ...
        error_log("[POS API Customer] - search_customers request received.");
        $search_term = $request->get_param('search');
        $per_page    = $request->get_param('per_page');
        $page        = $request->get_param('page');
        $args = array(
            'role'    => 'customer',
            'number'  => $per_page,
            'paged'   => $page,
            'orderby' => 'display_name',
            'order'   => 'ASC',
        );
        if (!empty($search_term)) {
            $args['search'] = '*' . esc_sql($search_term) . '*';
            $args['meta_query'] = array(
                'relation' => 'OR',
                array('key' => 'first_name', 'value' => $search_term, 'compare' => 'LIKE'),
                array('key' => 'last_name', 'value' => $search_term, 'compare' => 'LIKE'),
                array('key' => 'billing_phone', 'value' => $search_term, 'compare' => 'LIKE'),
            );
            $args['search_columns'] = array('user_login', 'user_email', 'user_nicename', 'display_name');
            error_log("[POS API Customer] - Searching customers with term: {$search_term}");
        } else {
            error_log("[POS API Customer] - Fetching customers (no search term). Page: {$page}, PerPage: {$per_page}");
        }
        $user_query = new WP_User_Query($args);
        $customers = $user_query->get_results();
        $total_customers = $user_query->get_total();
        $results = array();
        if (!empty($customers)) {
            error_log("[POS API Customer] - Found " . count($customers) . " customers on this page.");
            $controller = new WC_REST_Customers_Controller();
            foreach ($customers as $customer_user) {
                $customer_data = $controller->prepare_item_for_response($customer_user, $request);
                $results[] = $customer_data->get_data();
            }
        } else {
            error_log("[POS API Customer] - No customers found matching criteria.");
        }
        $response = new WP_REST_Response($results, 200);
        $total_pages = ($per_page > 0 && $total_customers > 0) ? ceil($total_customers / $per_page) : 1;
        $response->header('X-WP-Total', $total_customers);
        $response->header('X-WP-TotalPages', $total_pages);
        error_log("[POS API Customer] - search_customers request finished. Returning " . count($results) . " customers. Total found: {$total_customers}. Total pages: {$total_pages}.");
        return $response;
    }

    /**
     * Callback para CREAR un nuevo cliente.
     */
    function pos2025_api_create_customer( WP_REST_Request $request ) {
        error_log("[POS API Customer] - create_customer request received (PHP password generation).");

        // Obtener parámetros (password ya no viene del request)
        $email      = $request->get_param('email');
        $first_name = $request->get_param('first_name');
        $last_name  = $request->get_param('last_name');
        $billing    = $request->get_param('billing');
        $phone      = isset($billing['phone']) ? $billing['phone'] : '';

        // Usar email como base para username
        $username = sanitize_user( explode( '@', $email )[0] . rand(1, 99) );

        // *** Generar contraseña en PHP ***
        $password = wp_generate_password( 12, true, true ); // 12 caracteres, con especiales y extra
        error_log("[POS API Customer] - Generated temporary password for {$email}.");
        // *** FIN Generar ***

        // *** ¡LÍNEA ERRÓNEA ELIMINADA! ***
        // return $password;

        error_log("[POS API Customer] - Attempting to create customer. Email: {$email}, Username: {$username}");

        $new_customer_data = array(
            'first_name' => $first_name,
            'last_name'  => $last_name,
            'role'       => 'customer',
        );

        try {
            // Crear el nuevo cliente/usuario usando la contraseña generada
            $customer_id = wc_create_new_customer( $email, $username, $password, $new_customer_data );

            // Verificar si hubo errores (devuelve WP_Error en caso de fallo)
            if ( is_wp_error( $customer_id ) ) {
                $error_code = $customer_id->get_error_code();
                $error_message = $customer_id->get_error_message();
                error_log("[POS API Customer] - Error creating customer: [{$error_code}] {$error_message}");

                // Mapear errores comunes a mensajes más amigables
                $status_code = 400; // Bad Request por defecto para errores de creación
                if ( $error_code === 'registration-error-email-exists' ) {
                    $error_message = __('Ya existe una cuenta con este correo electrónico.', 'pos2025');
                    $status_code = 409; // Conflict
                } elseif ( $error_code === 'registration-error-username-exists' ) {
                    $error_message = __('Ya existe un usuario con ese nombre de usuario (intenta de nuevo).', 'pos2025');
                    $status_code = 409; // Conflict
                }

                return new WP_Error( $error_code, $error_message, array( 'status' => $status_code ) );
            }

            // Éxito - $customer_id contiene el ID del nuevo usuario
            error_log("[POS API Customer] - Customer created successfully with ID: {$customer_id}");

            // Opcional pero recomendado: Guardar teléfono y otros datos de facturación
            if ( $customer_id > 0 ) {
                $customer = new WC_Customer( $customer_id );
                if ( $customer->get_id() ) {
                    if ( ! empty( $phone ) ) {
                        $customer->set_billing_phone( $phone );
                        error_log("[POS API Customer] - Billing phone set for customer {$customer_id}");
                    }
                    // Asegurar que nombre/apellido se guarden también en billing
                    $customer->set_billing_first_name($first_name);
                    $customer->set_billing_last_name($last_name);
                    $customer->set_billing_email($email); // Confirmar email en billing

                    $customer->save();
                    error_log("[POS API Customer] - Customer data saved for ID: {$customer_id}");
                }
            }

            // Obtener los datos completos del cliente recién creado para devolverlos
            // Usamos el controlador de la API REST de WC para obtener el formato estándar
            $controller = new WC_REST_Customers_Controller();
            $customer_obj = get_user_by( 'id', $customer_id );
            $response_data = $controller->prepare_item_for_response( $customer_obj, $request );

            // Devolver respuesta exitosa
            return new WP_REST_Response( $response_data->get_data(), 201 ); // 201 Created

        } catch ( Exception $e ) {
            error_log("[POS API Customer] - Exception caught during customer creation: " . $e->getMessage());
            return new WP_Error( 'rest_customer_creation_exception', __( 'Ocurrió un error inesperado al crear el cliente.', 'pos2025' ), array( 'status' => 500 ) );
        }
    }

    /**
     * Callback para ACTUALIZAR un cliente existente.
     */
    function pos2025_api_update_customer( WP_REST_Request $request ) {
        // ... (Código completo de pos2025_api_update_customer como antes) ...
        error_log("[POS API Customer] - update_customer request received.");
        $customer_id = (int) $request['id'];
        $customer = new WC_Customer($customer_id);
        if (!$customer || 0 === $customer->get_id()) {
            error_log("[POS API Customer] - Error: Customer not found with ID: {$customer_id}");
            return new WP_Error('rest_customer_invalid_id', __('Cliente no encontrado.', 'pos2025'), array('status' => 404));
        }
        error_log("[POS API Customer] - Attempting to update customer ID: {$customer_id}");
        $update_data = array();
        $billing_data = array();
        if ($request->has_param('email')) {
            $new_email = $request->get_param('email');
            $existing_user = get_user_by('email', $new_email);
            if ($existing_user && $existing_user->ID !== $customer_id) {
                error_log("[POS API Customer] - Error: Email '{$new_email}' already in use by user ID {$existing_user->ID}.");
                return new WP_Error('rest_customer_email_exists', __('El correo electrónico ya está en uso por otra cuenta.', 'pos2025'), array('status' => 409));
            }
            $update_data['user_email'] = $new_email;
            $billing_data['email'] = $new_email;
        }
        if ($request->has_param('first_name')) {
            $update_data['first_name'] = $request->get_param('first_name');
            $billing_data['first_name'] = $request->get_param('first_name');
        }
        if ($request->has_param('last_name')) {
            $update_data['last_name'] = $request->get_param('last_name');
            $billing_data['last_name'] = $request->get_param('last_name');
        }
        if ($request->has_param('billing')) {
            $billing_param = $request->get_param('billing');
            if (isset($billing_param['phone'])) {
                $billing_data['phone'] = $billing_param['phone'];
            }
        }
        try {
            if (!empty($update_data)) {
                $update_data['ID'] = $customer_id;
                $user_updated = wp_update_user($update_data);
                if (is_wp_error($user_updated)) {
                    error_log("[POS API Customer] - Error updating WP user data for ID {$customer_id}: " . $user_updated->get_error_message());
                    return new WP_Error('rest_customer_user_update_failed', __('Error al actualizar los datos base del usuario.', 'pos2025'), array('status' => 500));
                }
                error_log("[POS API Customer] - WP user data updated for ID {$customer_id}.");
            }
            if (!empty($billing_data)) {
                foreach ($billing_data as $key => $value) {
                    $setter = "set_billing_{$key}";
                    if (is_callable(array($customer, $setter))) {
                        $customer->$setter($value);
                        error_log("[POS API Customer] - Billing field '{$key}' updated for customer {$customer_id}.");
                    }
                }
            }
            $customer->save();
            error_log("[POS API Customer] - Customer data saved for ID: {$customer_id}");
            $controller = new WC_REST_Customers_Controller();
            $customer_user_obj = get_user_by('id', $customer_id);
            $response_data = $controller->prepare_item_for_response($customer_user_obj, $request);
            return new WP_REST_Response($response_data->get_data(), 200);
        } catch (Exception $e) {
            error_log("[POS API Customer] - Exception caught during customer update for ID {$customer_id}: " . $e->getMessage());
            return new WP_Error('rest_customer_update_exception', __('Ocurrió un error inesperado al actualizar el cliente.', 'pos2025'), array('status' => 500));
        }
    }

    /**
     * Callback para crear un nuevo pedido/suscripción/crédito de WooCommerce desde el TPV.
     */
    function pos2025_api_create_order( WP_REST_Request $request ) {
        // ... (Código completo de pos2025_api_create_order como antes) ...
        error_log("[POS API Orders] - create_order request received.");
        $payment_method = $request->get_param('payment_method');
        $customer_id    = absint($request->get_param('customer_id'));
        $line_items     = $request->get_param('line_items');
        $customer_note  = $request->get_param('customer_note');
        $pos_sale_type  = $request->get_param('pos_sale_type');
        $event_title    = $request->get_param('pos_calendar_event_title');
        $event_date     = $request->get_param('pos_calendar_event_date');
        $event_color    = $request->get_param('pos_calendar_event_color');
        if (empty($line_items) || !is_array($line_items)) {
            error_log("[POS API Orders] - Error: Line items are missing or invalid.");
            return new WP_Error('rest_invalid_line_items', __('Los artículos del pedido son inválidos.', 'pos2025'), array('status' => 400));
        }
        if (empty($payment_method)) {
            error_log("[POS API Orders] - Error: Payment method is missing.");
            return new WP_Error('rest_invalid_payment_method', __('El método de pago es requerido.', 'pos2025'), array('status' => 400));
        }
        if ($pos_sale_type === 'subscription' && (empty($event_title) || empty($event_date))) {
            error_log("[POS API Orders] - Error: Subscription title or date missing.");
            return new WP_Error('rest_invalid_subscription_data', __('Faltan datos para el evento de suscripción (título o fecha).', 'pos2025'), array('status' => 400));
        }
        if (($pos_sale_type === 'subscription' || $pos_sale_type === 'credit') && $customer_id <= 0) {
            error_log("[POS API Orders] - Error: Customer required for sale type {$pos_sale_type}.");
            return new WP_Error('rest_customer_required', __('Se requiere un cliente para este tipo de venta.', 'pos2025'), array('status' => 400));
        }
        try {
            error_log("[POS API Orders] - Creating new WC_Order object.");
            $order = wc_create_order(array('customer_id' => $customer_id, 'status' => 'wc-pending'));
            if (is_wp_error($order)) {
                error_log("[POS API Orders] - Error creating WC_Order: " . $order->get_error_message());
                return new WP_Error('rest_order_creation_failed', __('No se pudo inicializar el pedido.', 'pos2025'), array('status' => 500));
            }
            $order_id = $order->get_id();
            error_log("[POS API Orders] - WC_Order created with ID: {$order_id}");
            if ($customer_id > 0) {
                $customer = new WC_Customer($customer_id);
                if ($customer->get_id()) {
                    $order->set_address($customer->get_billing(), 'billing');
                    if (!$customer->get_shipping_address_1()) {
                        $order->set_address($customer->get_billing(), 'shipping');
                    } else {
                        $order->set_address($customer->get_shipping(), 'shipping');
                    }
                    error_log("[POS API Orders] - Addresses set for customer ID: {$customer_id}");
                } else {
                    error_log("[POS API Orders] - Warning: Customer ID {$customer_id} provided but customer not found.");
                }
            } else {
                error_log("[POS API Orders] - Processing as guest order (customer ID 0).");
            }
            error_log("[POS API Orders] - Received line_items data: " . print_r($line_items, true));
            error_log("[POS API Orders] - Adding line items...");
            foreach ($line_items as $item_data) {
                $product_id   = isset($item_data['product_id']) ? absint($item_data['product_id']) : 0;
                $variation_id = isset($item_data['variation_id']) ? absint($item_data['variation_id']) : 0;
                $quantity     = isset($item_data['quantity']) ? absint($item_data['quantity']) : 0;
                $pos_price    = isset($item_data['price']) ? wc_format_decimal($item_data['price']) : null;
                $product = $variation_id ? wc_get_product($variation_id) : wc_get_product($product_id);
                if (!$product || $quantity <= 0) {
                    error_log("[POS API Orders] - Skipping invalid product/quantity: " . print_r($item_data, true));
                    continue;
                }
                $args = array();
                if ($pos_price !== null && $pos_price >= 0) {
                    $line_subtotal = $pos_price * $quantity;
                    $line_total    = $line_subtotal;
                    $args['subtotal'] = $line_subtotal;
                    $args['total']    = $line_total;
                    error_log("[POS API Orders] - Applying POS price {$pos_price} to product ID {$product->get_id()}. Line total (pre-tax): {$line_total}");
                } else {
                    error_log("[POS API Orders] - Using default product price for product ID {$product->get_id()}.");
                }
                $item_id = $order->add_product($product, $quantity, $args);
                if (!$item_id) {
                    error_log("[POS API Orders] - Error adding product ID {$product->get_id()} to order {$order_id}.");
                } else {
                    error_log("[POS API Orders] - Added product ID {$product->get_id()} with item ID {$item_id}.");
                }
            }
            $payment_gateways = WC()->payment_gateways->payment_gateways();
            if (isset($payment_gateways[$payment_method])) {
                $order->set_payment_method($payment_gateways[$payment_method]);
                error_log("[POS API Orders] - Payment method set to: {$payment_method}");
            } else {
                error_log("[POS API Orders] - Error: Invalid payment method ID: {$payment_method}");
                wp_delete_post($order_id, true);
                return new WP_Error('rest_invalid_payment_gateway', __('El método de pago seleccionado no es válido.', 'pos2025'), array('status' => 400));
            }
            if (!empty($customer_note)) {
                $order->add_order_note($customer_note, false, true);
                error_log("[POS API Orders] - Customer note added.");
            }
            $order->update_meta_data('_pos_sale', 'yes');
            $order->update_meta_data('_pos_sale_type', $pos_sale_type);
            $order->update_meta_data('_pos_operator_id', get_current_user_id());
            if ($pos_sale_type === 'subscription') {
                $order->update_meta_data('_pos_calendar_event_title', sanitize_text_field($event_title));
                if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $event_date)) {
                    $order->update_meta_data('_pos_calendar_event_date', $event_date);
                } else {
                    error_log("[POS API Orders] - Warning: Invalid event date format '{$event_date}' received for order {$order_id}.");
                }
                $order->update_meta_data('_pos_calendar_event_color', sanitize_hex_color($event_color) ?: '#3a87ad');
                error_log("[POS API Orders] - Subscription meta added for order {$order_id}.");
            }
            $order->calculate_totals();
            error_log("[POS API Orders] - Totals calculated for order {$order_id}.");
            $final_status = 'processing';
            if ($pos_sale_type === 'credit') {
                $final_status = 'on-hold';
            } elseif ($payment_method === 'cod' || $payment_method === 'bacs') {
                $final_status = 'on-hold';
            } else {
                $final_status = 'completed';
            }
            $order->set_status($final_status);
            error_log("[POS API Orders] - Setting final order status to: {$final_status}");
            $order->save();
            error_log("[POS API Orders] - Order {$order_id} saved successfully.");
            return new WP_REST_Response(array('success' => true, 'order_id' => $order_id, 'status' => $order->get_status()), 201);
        } catch (Exception $e) {
            error_log("[POS API Orders] - Exception caught: " . $e->getMessage());
            if (isset($order_id) && $order_id > 0) {
                $order = wc_get_order($order_id);
                if ($order) {
                    $order->update_status('wc-failed', 'Error durante creación vía API POS: ' . $e->getMessage());
                }
            }
            return new WP_Error('rest_order_creation_exception', __('Ocurrió un error inesperado al crear el pedido.', 'pos2025') . ' ' . $e->getMessage(), array('status' => 500));
        }
    }

    /**
     * Función de validación para fechas YYYY-MM-DD.
     */
    function pos2025_validate_date_format( $param, $request, $key ) {
        // ... (Código completo de pos2025_validate_date_format como antes) ...
        if (!is_string($param)) {
            return new WP_Error('rest_invalid_param', sprintf(esc_html__('%s is not a string.', 'pos2025'), $key), array('status' => 400));
        }
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $param)) {
            return new WP_Error('rest_invalid_param', sprintf(esc_html__('%s must be in YYYY-MM-DD format.', 'pos2025'), $key), array('status' => 400));
        }
        return true;
    }

    /**
     * Callback para OBTENER eventos del calendario (Pedidos + Personalizados).
     */
    function pos2025_api_get_calendar_events( WP_REST_Request $request ) {
        // ... (Código completo de pos2025_api_get_calendar_events como antes) ...
        $start_date_str = $request->get_param('start');
        $end_date_str   = $request->get_param('end');
        $events = array();
        $order_query_args = array(
            'limit'      => -1,
            'status'     => array_keys(wc_get_order_statuses()),
            'meta_query' => array(
                'relation' => 'AND',
                array('key' => '_pos_sale_type', 'value' => 'subscription', 'compare' => '='),
                array('key' => '_pos_calendar_event_date', 'compare' => 'EXISTS'),
                array('key' => '_pos_calendar_event_date', 'value' => '', 'compare' => '!='),
            ),
            'orderby'    => 'date',
            'order'      => 'DESC',
        );
        if ($start_date_str && $end_date_str) {
            $start_ts = strtotime($start_date_str);
            $end_ts   = strtotime($end_date_str);
            if ($start_ts && $end_ts) {
                $order_query_args['meta_query'][] = array(
                    'key'     => '_pos_calendar_event_date',
                    'value'   => array(date('Y-m-d', $start_ts), date('Y-m-d', $end_ts)),
                    'compare' => 'BETWEEN',
                    'type'    => 'DATE',
                );
            }
        }
        $orders = wc_get_orders($order_query_args);
        if (!empty($orders)) {
            foreach ($orders as $order) {
                $event_title = $order->get_meta('_pos_calendar_event_title', true);
                $event_date  = $order->get_meta('_pos_calendar_event_date', true);
                $event_color = $order->get_meta('_pos_calendar_event_color', true) ?: '#3a87ad';
                if ($event_title && $event_date && preg_match('/^\d{4}-\d{2}-\d{2}$/', $event_date)) {
                    $customer_name = $order->get_billing_first_name() . ' ' . $order->get_billing_last_name();
                    $events[] = array(
                        'id'    => 'order_' . $order->get_id(),
                        'title' => $event_title,
                        'start' => $event_date,
                        'color' => $event_color,
                        'allDay'=> true,
                        'url'   => $order->get_edit_order_url(),
                        'extendedProps' => array(
                            'orderId' => $order->get_id(),
                            'customer' => trim($customer_name) ?: __('Invitado', 'pos2025'),
                            'type' => 'order'
                        )
                    );
                }
            }
        }
        $custom_events = get_option('pos2025_custom_events', array());
        if (!empty($custom_events)) {
            $filtered_custom_events = array();
            if ($start_date_str && $end_date_str) {
                $start_ts = strtotime($start_date_str);
                $end_ts   = strtotime($end_date_str);
                if ($start_ts && $end_ts) {
                    foreach ($custom_events as $custom_event) {
                        $event_ts = strtotime($custom_event['start']);
                        if ($event_ts >= $start_ts && $event_ts < $end_ts) {
                            $filtered_custom_events[] = $custom_event;
                        }
                    }
                } else {
                    $filtered_custom_events = $custom_events;
                }
            } else {
                $filtered_custom_events = $custom_events;
            }
            foreach ($filtered_custom_events as $cust_event) {
                $events[] = array(
                    'id'            => $cust_event['id'],
                    'title'         => $cust_event['title'],
                    'start'         => $cust_event['start'],
                    'color'         => $cust_event['color'] ?? '#54a0ff',
                    'allDay'        => $cust_event['allDay'] ?? true,
                    'extendedProps' => array(
                        'description' => $cust_event['description'] ?? '',
                        'type'        => 'custom'
                    )
                );
            }
        }
        return new WP_REST_Response($events, 200);
    }

    /**
     * Callback para CREAR un evento personalizado.
     */
    function pos2025_api_create_custom_event( WP_REST_Request $request ) {
        // ... (Código completo de pos2025_api_create_custom_event como antes) ...
        $title       = $request->get_param('title');
        $start_date  = $request->get_param('start');
        $description = $request->get_param('description');
        $color       = $request->get_param('color');
        $allDay      = $request->get_param('allDay');
        $existing_events = get_option('pos2025_custom_events', array());
        $new_event = array(
            'id'          => 'custom_' . wp_generate_uuid4(),
            'title'       => $title,
            'start'       => $start_date,
            'description' => $description,
            'color'       => $color,
            'allDay'      => $allDay,
            'type'        => 'custom'
        );
        $existing_events[] = $new_event;
        $updated = update_option('pos2025_custom_events', $existing_events, 'yes');
        if ($updated) {
            return new WP_REST_Response($new_event, 201);
        } else {
            return new WP_Error('rest_custom_event_save_error', __('Could not save the custom event.', 'pos2025'), array('status' => 500));
        }
    }

    /**
    * Callback para ELIMINAR un evento personalizado por su ID.
    */
    function pos2025_api_delete_custom_event( WP_REST_Request $request ) {
        $event_id_to_delete = $request['id']; // Obtiene el ID de la URL
    
        error_log("[POS API Events] - Attempting to delete custom event with ID: {$event_id_to_delete}");
    
        // Obtener la lista actual de eventos personalizados
        $custom_events = get_option( 'pos2025_custom_events', array() );
    
        // Verificar si hay eventos para buscar
        if ( empty( $custom_events ) || ! is_array( $custom_events ) ) {
            error_log("[POS API Events] - No custom events found in options. Cannot delete ID: {$event_id_to_delete}");
            return new WP_Error(
                'pos2025_event_not_found',
                __( 'Evento personalizado no encontrado (lista vacía).', 'pos2025' ),
                array( 'status' => 404 )
            );
        }
    
        $found_index = -1; // Índice del evento a eliminar
        // Buscar el evento por su ID dentro del array
        foreach ( $custom_events as $index => $event ) {
            // Asegurarse de que el elemento es un array y tiene 'id'
            if ( is_array( $event ) && isset( $event['id'] ) && $event['id'] === $event_id_to_delete ) {
                $found_index = $index;
                break; // Evento encontrado, salir del bucle
            }
        }
    
        // Verificar si se encontró el evento
        if ( $found_index === -1 ) {
            error_log("[POS API Events] - Custom event with ID {$event_id_to_delete} not found in the list.");
            return new WP_Error(
                'pos2025_event_not_found',
                __( 'El evento personalizado especificado no fue encontrado.', 'pos2025' ),
                array( 'status' => 404 )
            );
        }
    
        // Eliminar el evento del array usando su índice
        array_splice( $custom_events, $found_index, 1 );
        error_log("[POS API Events] - Event with ID {$event_id_to_delete} removed from array at index {$found_index}.");
    
        // Guardar la matriz actualizada en wp_options
        $updated = update_option( 'pos2025_custom_events', $custom_events, 'yes' ); // 'yes' para autoload
    
        if ( ! $updated ) {
            // Esto podría pasar si la opción no cambió realmente (ej: borrar algo que ya no estaba)
            // o si hubo un error de base de datos. Asumimos que si llegamos aquí sin error previo, está bien.
            error_log("[POS API Events] - update_option returned false for 'pos2025_custom_events'. This might be okay if the array content didn't change after removal, or could indicate a save issue.");
            // Consideramos éxito si el evento fue encontrado y eliminado del array, incluso si update_option devuelve false.
        } else {
             error_log("[POS API Events] - Successfully updated 'pos2025_custom_events' option after deleting event ID: {$event_id_to_delete}");
        }
    
        // Éxito
        return new WP_REST_Response(
            array(
                'success'    => true,
                'message'    => __( 'Evento personalizado eliminado correctamente.', 'pos2025' ),
                'deleted_id' => $event_id_to_delete
            ),
            200 // OK
        );
    }
    
?>
