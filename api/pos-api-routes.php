<?php
    /**
     * Registra los endpoints de la API REST para el TPV (POS 2025)
     */

    // Si este archivo es llamado directamente, abortar.
    if ( ! defined( 'ABSPATH' ) ) {
        exit;
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
            'permission_callback' => '__return_true', // TODO: Reemplazar con 'pos2025_api_permissions_check'
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
                    'default'           => 10,
                    'sanitize_callback' => 'absint',
                ),
                'page' => array(
                    'description'       => __( 'Página actual de resultados.', 'pos2025' ),
                    'type'              => 'integer',
                    'default'           => 1,
                    'sanitize_callback' => 'absint',
                ),
            ),
        ) );

        // --- Endpoint para obtener pasarelas de pago ---
        register_rest_route( $namespace, '/payment-gateways', array(
            'methods'             => WP_REST_Server::READABLE, // Método GET
            'callback'            => 'pos2025_api_get_payment_gateways',
            'permission_callback' => '__return_true', // TODO: Reemplazar con 'pos2025_api_permissions_check'
        ) );

        // --- Endpoint para buscar clientes ---
        register_rest_route( $namespace, '/customers', array(
            'methods'             => WP_REST_Server::READABLE, // Método GET
            'callback'            => 'pos2025_api_search_customers',
            'permission_callback' => '__return_true', // TODO: Reemplazar con 'pos2025_api_permissions_check'
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

        // --- Endpoint para CREAR pedidos/suscripciones/créditos ---
        register_rest_route( $namespace, '/orders', array(
            'methods'             => WP_REST_Server::CREATABLE, // Método POST
            'callback'            => 'pos2025_api_create_order',
            'permission_callback' => '__return_true', // TODO: ¡¡MUY IMPORTANTE!! Reemplazar con 'pos2025_api_permissions_check'
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
                // --- INTERVALO Y PERIODO YA NO SON ARGUMENTOS ESPERADOS ---
            ),
        ) );

        // --- FIN DE REGISTRO DE RUTAS ---

    } // <--- FIN de la función pos2025_register_rest_routes
    add_action( 'rest_api_init', 'pos2025_register_rest_routes' );


    // --- FUNCIONES DE CALLBACK ---

    /**
     * Callback para el endpoint de búsqueda de productos.
     * (Código como en la versión anterior)
     */
    function pos2025_api_search_products( WP_REST_Request $request ) {
        $search_term = $request->get_param( 'search' );
        $per_page    = $request->get_param( 'per_page' );
        $page        = $request->get_param( 'page' );

        $args = array(
            'status'    => 'publish', // Solo productos publicados
            'limit'     => $per_page,
            'page'      => $page,
            'orderby'   => 'title',
            'order'     => 'ASC',
            'type'      => array('simple', 'variable'), // Incluir simples y variables
            'return'    => 'objects', // Obtener objetos WC_Product
        );

        // Si hay término de búsqueda, lo añadimos
        if ( ! empty( $search_term ) ) {
            $args['s'] = $search_term; // Búsqueda por palabra clave (título, contenido)

            // Opcional: Añadir búsqueda por SKU
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
                    'price'        => $product->get_price(), // Precio base o rango
                    'price_html'   => $product->get_price_html(), // Precio formateado
                    'type'         => $product->get_type(),
                    'stock_status' => $product->get_stock_status(),
                    'image_url'    => $image_url,
                    'variations'   => array(),
                );

                if ( $product->is_type('variable') && $product instanceof WC_Product_Variable ) {
                    $available_variations = $product->get_available_variations('objects'); // Obtener objetos WC_Product_Variation

                    foreach ( $available_variations as $variation ) {
                         if ( ! $variation instanceof WC_Product_Variation ) continue;

                         $variation_image_id = $variation->get_image_id();
                         $variation_image_url = $variation_image_id ? wp_get_attachment_image_url( $variation_image_id, 'thumbnail' ) : $image_url; // Usar imagen padre si no hay

                         // Construir nombre de variación desde atributos
                         $variation_attributes = $variation->get_variation_attributes( true ); // true para obtener nombres legibles
                         $variation_name_parts = [];
                         foreach ($variation_attributes as $attr_name => $attr_value) {
                             if (!empty($attr_value)) {
                                 // Intentar obtener el nombre legible del atributo y término
                                 $taxonomy = str_replace('attribute_', '', $attr_name); // pa_color -> color
                                 $term = get_term_by('slug', $attr_value, $taxonomy);
                                 $attribute_label = wc_attribute_label($taxonomy);
                                 $term_name = $term ? $term->name : $attr_value;
                                 $variation_name_parts[] = $attribute_label . ': ' . $term_name;
                             }
                         }
                         $variation_display_name = implode(', ', $variation_name_parts);


                         $product_item['variations'][] = array(
                            'variation_id'   => $variation->get_id(),
                            'attributes'     => $variation->get_variation_attributes(), // Slugs: ['attribute_pa_color' => 'rojo']
                            'variation_name' => $variation_display_name, // Nombre legible: "Color: Rojo, Talla: L"
                            'sku'            => $variation->get_sku(),
                            'price'          => $variation->get_price(), // Precio numérico
                            'price_html'     => $variation->get_price_html(), // Precio formateado
                            'stock_status'   => $variation->get_stock_status(),
                            'stock_quantity' => $variation->get_stock_quantity(), // null si no gestiona stock
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
        // Re-ejecutar la consulta solo para obtener el total (WC_Product_Query no facilita esto directamente)
        $args['return'] = 'ids'; // Más eficiente para contar
        $args['limit'] = -1; // Contar todos
        unset($args['page']);
        $total_query = new WC_Product_Query( $args );
        $total_products = count($total_query->get_products());
        $total_pages = ($per_page > 0) ? ceil( $total_products / $per_page ) : 1;

        $response->header( 'X-WP-Total', $total_products );
        $response->header( 'X-WP-TotalPages', $total_pages );

        return $response;
    }

    /**
     * Callback para obtener las pasarelas de pago activas.
     * (Código como en la versión anterior)
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
     * (Código como en la versión anterior, con búsqueda meta mejorada)
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

        // Añadir rol si se especificó
        if ( ! empty( $role ) ) {
            $args['role__in'] = (array) $role; // Usar role__in para permitir múltiples roles si fuera necesario
        }

        // Construir la búsqueda
        if ( ! empty( $search_term ) ) {
            //$search_term_safe = '%' . $wpdb->esc_like( $search_term ) . '%'; // Escapar para SQL LIKE
            $args['search'] = '*' . esc_attr( $search_term ) . '*';
            //$args['search'] = $search_term_safe; // Busca en login, nicename, email, url, display_name
            $args['search_columns'] = array( 'user_login', 'user_email', 'user_nicename', 'display_name' );

            // Añadir búsqueda en metadatos (nombre, apellido)
            $args['meta_query'] = array(
                'relation' => 'OR',
                array(
                    'key'     => 'first_name',
                    'value'   => $search_term, // WP_User_Query maneja el escape LIKE aquí
                    'compare' => 'LIKE'
                ),
                array(
                    'key'     => 'last_name',
                    'value'   => $search_term,
                    'compare' => 'LIKE'
                ),
                 array(
                    'key'     => 'billing_first_name',
                    'value'   => $search_term,
                    'compare' => 'LIKE'
                ),
                array(
                    'key'     => 'billing_last_name',
                    'value'   => $search_term,
                    'compare' => 'LIKE'
                ),
                 array(
                    'key'     => 'billing_email', // Buscar también en email de facturación
                    'value'   => $search_term,
                    'compare' => 'LIKE'
                ),
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
                );
            }
        }

        $response = new WP_REST_Response( $results, 200 );

        // Añadir cabeceras de paginación
        $total_pages = ($per_page > 0) ? ceil( $total_customers / $per_page ) : 1;
        $response->header( 'X-WP-Total', $total_customers );
        $response->header( 'X-WP-TotalPages', $total_pages );

        return $response;
    }

     /**
      * Callback para crear un nuevo pedido/suscripción/crédito de WooCommerce desde el TPV.
      * VERSIÓN CORREGIDA: Asegura guardado de notas/dirección y añade logs.
      */
     function pos2025_api_create_order( WP_REST_Request $request ) {
         // Obtener los datos ya validados y sanitizados
         $params = $request->get_params();

         // Asignar variables locales
         $line_items           = $params['line_items'];
         $payment_method       = $params['payment_method'];
         $payment_method_title = $params['payment_method_title'];
         $customer_id          = $params['customer_id'];
         $status               = $params['status'];
         $sale_type            = $params['sale_type'];
         $customer_note        = $params['customer_note'];

         // Variables específicas de suscripción/calendario
         $subscription_title        = $params['subscription_title'] ?? null;
         $subscription_event_date_str = $params['subscription_start_date'] ?? null;
         $subscription_color        = $params['subscription_color'] ?? null;

         error_log("POS2025 CREATE ORDER - Inicio. Sale Type: {$sale_type}, Customer ID: {$customer_id}, Nota Recibida: '{$customer_note}'"); // Log inicial

         try {
             // --- Crear el objeto de pedido ---
             $order = wc_create_order( array(
                 'customer_id' => $customer_id,
                 'status'      => 'pending', // Empezar como pendiente
             ) );

             if ( is_wp_error( $order ) ) {
                 error_log("POS2025 Error: wc_create_order falló. " . $order->get_error_message());
                 return new WP_Error( 'rest_order_creation_failed', __( 'No se pudo crear el objeto de pedido.', 'pos2025' ), array( 'status' => 500 ) );
             }
             error_log("POS2025 CREATE ORDER - Objeto Pedido Creado (ID Temporal/Nuevo): " . $order->get_id());


             // --- Añadir nota del cliente al pedido ---
             if ( ! empty( $customer_note ) ) {
                // Añadir como una nota visible para el cliente (y admin)
                $order->add_order_note( $customer_note, true ); // <-- LÍNEA CORRECTA
                error_log("POS2025 CREATE ORDER - Nota Cliente añadida al historial del pedido (visible para cliente).");
            } else {
                 error_log("POS2025 CREATE ORDER - Nota Cliente vacía, no se añade al historial.");
            }

             // --- Añadir artículos (Line Items) ---
             $has_valid_items = false;
             foreach ( $line_items as $item ) {
                 $product_id   = $item['product_id'];
                 $variation_id = $item['variation_id'] ?? 0;
                 $quantity     = $item['quantity'];

                 $product = wc_get_product( $variation_id ?: $product_id );
                 if ( ! $product ) {
                     error_log("POS2025 Advertencia: Producto ID {$product_id} / Variación ID {$variation_id} no encontrado. Saltando item.");
                     continue;
                 }
                 $order->add_product( $product, $quantity );
                 $has_valid_items = true;
             }

              if ( !$has_valid_items ) {
                  $order->delete(true);
                  error_log("POS2025 Error: No se añadieron productos válidos.");
                  return new WP_Error( 'rest_no_valid_products', __( 'No se pudieron añadir productos válidos al pedido.', 'pos2025' ), array( 'status' => 400 ) );
              }
              error_log("POS2025 CREATE ORDER - Productos añadidos al objeto Order.");


             // --- Establecer Dirección ---
             if ( $customer_id > 0 ) {
                  error_log("POS2025 CREATE ORDER - Intentando obtener dirección para Customer ID: {$customer_id}");
                  $customer = new WC_Customer( $customer_id );
                  if ( $customer && $customer->get_id() > 0 ) { // Verificar que el cliente existe
                      $billing_address = $customer->get_billing_address();
                      $shipping_address = $customer->get_shipping_address();
                      error_log("POS2025 CREATE ORDER - Dirección Facturación Obtenida: " . print_r($billing_address, true));

                      if (!empty($billing_address) && !empty($billing_address['email'])) { // Comprobar si la dirección no está vacía
                          $order->set_address( $billing_address, 'billing' );
                          error_log("POS2025 CREATE ORDER - Dirección Facturación establecida en el objeto Order.");
                      } else {
                           error_log("POS2025 CREATE ORDER - Dirección Facturación del cliente está vacía o incompleta. No se establece.");
                      }

                      // Usar dirección de envío o fallback a facturación
                      if (!empty($shipping_address) && !empty($shipping_address['first_name'])) { // Comprobar si hay algo en envío
                           $order->set_address( $shipping_address, 'shipping' );
                           error_log("POS2025 CREATE ORDER - Dirección Envío establecida en el objeto Order.");
                      } elseif (!empty($billing_address) && !empty($billing_address['email'])) {
                           $order->set_address( $billing_address, 'shipping' ); // Fallback a facturación si envío está vacío
                           error_log("POS2025 CREATE ORDER - Dirección Envío (fallback a facturación) establecida en el objeto Order.");
                      } else {
                           error_log("POS2025 CREATE ORDER - Dirección Envío del cliente está vacía. No se establece.");
                      }

                  } else {
                       error_log("POS2025 CREATE ORDER - No se pudo encontrar el objeto WC_Customer para ID: {$customer_id}");
                  }
             } else {
                  error_log("POS2025 CREATE ORDER - No hay Customer ID, no se establecen direcciones.");
             }

             // --- Establecer Método de Pago ---
             $order->set_payment_method( $payment_method );
             $order->set_payment_method_title( $payment_method_title );
             error_log("POS2025 CREATE ORDER - Método de pago establecido.");


             // --- Calcular Totales ---
             $order->calculate_totals();
             error_log("POS2025 CREATE ORDER - Totales calculados.");


             // --- Lógica específica por tipo de venta ---
             $order_id = null; // Inicializar order_id

             if ( $sale_type === 'subscription' ) {
                 error_log("POS2025 CREATE ORDER - Procesando tipo: subscription");
                 // --- Validar datos específicos de calendario y cliente ---
                 if ( empty($subscription_title) ) { /* ... error título ... */ }
                 $event_date_valid = false;
                 if ( $subscription_event_date_str && preg_match('/^\d{4}-\d{2}-\d{2}$/', $subscription_event_date_str) ) {
                      $d = DateTime::createFromFormat('Y-m-d', $subscription_event_date_str);
                      if ($d && $d->format('Y-m-d') === $subscription_event_date_str) { $event_date_valid = true; }
                 }
                 if ( !$event_date_valid ) { /* ... error fecha ... */ }
                 if ( $customer_id <= 0 ) { /* ... error cliente ... */ }

                 // --- Añadir Metadatos al Pedido ---
                 $order->update_meta_data( '_pos_sale_type', 'subscription' );
                 $order->update_meta_data( '_pos_calendar_event_title', $subscription_title );
                 $order->update_meta_data( '_pos_calendar_event_date', $subscription_event_date_str );
                 $order->update_meta_data( '_pos_calendar_event_color', $subscription_color ?: '#3a87ad' );
                 error_log("POS2025 CREATE ORDER - Metadatos de suscripción/evento añadidos al objeto Order.");

                 // --- Actualizar estado ---
                 $order->update_status( $status, __( 'Pedido POS con datos de evento.', 'pos2025' ), true );
                 error_log("POS2025 CREATE ORDER - Estado del pedido actualizado a: {$status}");

                 // --- GUARDAR EL PEDIDO ---
                 $order_id = $order->save(); // Guardar todos los cambios
                 error_log("POS2025 CREATE ORDER - Pedido guardado. ID final: {$order_id}");

                 if ( ! $order_id ) {
                     error_log("POS2025 Error: $order->save() falló para suscripción.");
                     return new WP_Error( 'rest_order_save_failed', __( 'No se pudo guardar el pedido de suscripción/evento.', 'pos2025' ), array( 'status' => 500 ) );
                 }

                 // --- Éxito (Solo se creó el pedido con metadatos) ---
                 $response_data = array(
                     'success'           => true,
                     'order_id'          => $order_id,
                     'message'           => __('Pedido con datos de evento creado con éxito.', 'pos2025')
                 );
                 return new WP_REST_Response( $response_data, 201 );

             } elseif ( $sale_type === 'credit' ) {
                 error_log("POS2025 CREATE ORDER - Procesando tipo: credit");
                 // --- Lógica Crédito ---
                 if ( $customer_id <= 0 ) { /* ... error cliente ... */ }
                 $order->update_meta_data( '_pos_sale_type', 'credit' );
                 error_log("POS2025 CREATE ORDER - Metadato _pos_sale_type=credit añadido.");

                 // --- Actualizar estado ---
                 $order->update_status( 'on-hold', __( 'Pedido a crédito creado desde TPV.', 'pos2025' ), true );
                 error_log("POS2025 CREATE ORDER - Estado del pedido actualizado a: on-hold");

                 // --- GUARDAR EL PEDIDO ---
                 $order_id = $order->save(); // Guardar todos los cambios
                 error_log("POS2025 CREATE ORDER - Pedido guardado. ID final: {$order_id}");

                 if ( ! $order_id ) {
                     error_log("POS2025 Error: $order->save() falló para crédito.");
                     return new WP_Error( 'rest_order_save_failed', __( 'No se pudo guardar el pedido a crédito.', 'pos2025' ), array( 'status' => 500 ) );
                 }

                 // --- Éxito Crédito ---
                 $response_data = array(
                     'success'  => true,
                     'order_id' => $order_id,
                     'message'  => __('Pedido a crédito creado con éxito.', 'pos2025')
                 );
                 return new WP_REST_Response( $response_data, 201 );

             } else { // Venta Directa
                 error_log("POS2025 CREATE ORDER - Procesando tipo: direct");
                 // --- Lógica Venta Directa ---
                 $order->update_meta_data( '_pos_sale_type', 'direct' );
                 error_log("POS2025 CREATE ORDER - Metadato _pos_sale_type=direct añadido.");

                 // --- Actualizar estado ---
                 $order->update_status( $status, __( 'Pedido creado desde TPV POS 2025.', 'pos2025' ), true );
                 error_log("POS2025 CREATE ORDER - Estado del pedido actualizado a: {$status}");

                 // --- GUARDAR EL PEDIDO ---
                 $order_id = $order->save(); // Guardar todos los cambios
                 error_log("POS2025 CREATE ORDER - Pedido guardado. ID final: {$order_id}");

                 if ( ! $order_id ) {
                     error_log("POS2025 Error: $order->save() falló para venta directa.");
                     return new WP_Error( 'rest_order_save_failed', __( 'No se pudo guardar el pedido.', 'pos2025' ), array( 'status' => 500 ) );
                 }

                 // --- Éxito Directa ---
                 $response_data = array(
                     'success'  => true,
                     'order_id' => $order_id,
                     'message'  => __('Pedido creado con éxito.', 'pos2025')
                 );
                 return new WP_REST_Response( $response_data, 201 );
             }

         } catch ( Exception $e ) {
             // ... (manejo de excepción) ...
              error_log("POS2025 Error Crítico al procesar pedido ({$sale_type}): " . $e->getMessage() . "\nTrace: " . $e->getTraceAsString());
              // No intentar borrar aquí, puede causar más problemas si $order no está bien definido
              return new WP_Error( 'rest_order_exception', __( 'Ocurrió un error inesperado al procesar el pedido: ', 'pos2025' ) . $e->getMessage(), array( 'status' => 500 ) );
         }
     }

?>
