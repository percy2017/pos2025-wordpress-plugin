<?php
/**
 * Añade un Metabox a la pantalla de edición de pedidos para mostrar datos de la venta POS.
 * Versión CORREGIDA: Siempre añade el metabox, el contenido es condicional.
 */

// Si este archivo es llamado directamente, abortar.
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Función que se engancha a los hooks 'add_meta_boxes_*' para añadir nuestro metabox.
 */
function pos2025_register_order_pos_metabox( $post_or_screen_id ) { // Nombre consistente

    // Obtener el ID de la pantalla actual donde se ejecuta el hook
    $current_screen = get_current_screen();
    if ( ! $current_screen ) {
        // error_log('POS2025 METABOX REGISTER: No se pudo obtener el objeto de pantalla actual.');
        return; // Salir si no podemos determinar la pantalla
    }
    $screen_id = $current_screen->id;

    // Lista de IDs de pantalla donde queremos mostrar el metabox
    $allowed_screens = [
        'shop_order',                  // Pantalla clásica
        'woocommerce_page_wc-orders'   // Pantalla HPOS nativa (común)
    ];

    // Solo continuar si estamos en una de las pantallas permitidas
    if ( ! in_array( $screen_id, $allowed_screens ) ) {
        return;
    }

    // --- ELIMINADA LA CONDICIÓN get_post_meta ---
    // Siempre intentamos añadir el metabox si estamos en la pantalla correcta.
    // La lógica de si mostrar contenido útil estará en la función de renderizado.

    error_log('POS2025 METABOX REGISTER: Intentando añadir metabox en Screen ID: ' . $screen_id);

    // Comprobar si ya se añadió el metabox en esta carga de página (evitar duplicados)
    global $wp_meta_boxes;
    $metabox_id = 'pos2025_order_pos_details';
    if ( isset( $wp_meta_boxes[$screen_id]['side']['high'][$metabox_id] ) ) {
         error_log('POS2025 METABOX REGISTER: Metabox ya existe para esta pantalla, saltando add_meta_box.');
        return; // Ya añadido
    }

    add_meta_box(
        $metabox_id,
        __( 'Detalles Venta POS 2025', 'pos2025' ), // Título General
        'pos2025_render_order_pos_metabox_content', // Función de renderizado
        $screen_id, // Usar el ID de pantalla actual verificado
        'side',
        'high'
    );
}

// --- Registrar los Hooks ---
// (Los hooks permanecen igual que en la versión anterior)
add_action( 'add_meta_boxes_shop_order', 'pos2025_register_order_pos_metabox', 10, 1 );
$hpos_native_screen_id = 'woocommerce_page_wc-orders';
add_action( 'add_meta_boxes_' . $hpos_native_screen_id, 'pos2025_register_order_pos_metabox', 10, 1 );
// (Puedes mantener los logs de registro de hooks si quieres)


/**
 * Renderiza el contenido HTML del Metabox de Detalles de Venta POS.
 */
function pos2025_render_order_pos_metabox_content( $post_or_order_or_id ) { // Nombre consistente

    // ... (Lógica para obtener $order como en la versión anterior) ...
     $order = null;
     if ( $post_or_order_or_id instanceof WC_Order ) { $order = $post_or_order_or_id; }
     elseif ( $post_or_order_or_id instanceof WP_Post && $post_or_order_or_id->post_type === 'shop_order' ) { $order = wc_get_order( $post_or_order_or_id->ID ); }
     elseif ( is_numeric( $post_or_order_or_id ) ) { $order = wc_get_order( $post_or_order_or_id ); }
    // ... (Fin lógica obtener $order) ...

    if ( ! $order ) {
        echo '<p>' . esc_html__( 'No se pudo cargar la información del pedido.', 'pos2025' ) . '</p>';
        error_log('POS2025 METABOX RENDER: No se pudo obtener el objeto WC_Order.');
        return;
    }

    // Obtener el tipo de venta POS
    $sale_type = $order->get_meta( '_pos_sale_type', true );
    error_log('POS2025 METABOX RENDER: Renderizando. Order ID: ' . $order->get_id() . ' | Sale Type Meta: "' . ($sale_type ?: 'N/A') . '"');

    // Si no hay tipo de venta POS, no mostrar nada útil en este metabox.
    if ( ! $sale_type ) {
        echo '<p>' . esc_html__( 'Este pedido no se originó en el POS.', 'pos2025' ) . '</p>';
        return; // Salir temprano
    }

    // Mapeo de tipos de venta a nombres legibles
    $sale_type_labels = [
        'direct' => __('Directa', 'pos2025'),
        'subscription' => __('Suscripción/Evento', 'pos2025'),
        'credit' => __('Crédito', 'pos2025'),
    ];
    $sale_type_display = isset($sale_type_labels[$sale_type]) ? $sale_type_labels[$sale_type] : ucfirst($sale_type);

    ?>
    <div class="pos-sale-details">
        <p>
            <strong><?php esc_html_e( 'Tipo de Venta POS:', 'pos2025' ); ?></strong><br>
            <span style="font-weight: bold; color: #2271b1;"><?php echo esc_html( $sale_type_display ); ?></span>
        </p>

        <?php // Mostrar detalles del evento SOLO si es tipo 'subscription' ?>
        <?php if ( $sale_type === 'subscription' ) : ?>
            <hr style="margin: 10px 0;">
            <h4><?php esc_html_e( 'Detalles del Evento:', 'pos2025' ); ?></h4>
            <?php
            // Obtener los metadatos del evento
            $event_title = $order->get_meta( '_pos_calendar_event_title', true );
            $event_date_str = $order->get_meta( '_pos_calendar_event_date', true );
            $event_color = $order->get_meta( '_pos_calendar_event_color', true );

            // Formatear la fecha
            $formatted_date = '-';
            if ( $event_date_str ) {
                 try {
                     $date_obj = wc_string_to_datetime( $event_date_str );
                     $formatted_date = $date_obj ? date_i18n( get_option( 'date_format' ), $date_obj->getTimestamp() ) : $event_date_str;
                 } catch ( Exception $e ) { $formatted_date = $event_date_str; }
            }
            ?>
            <p>
                <strong><?php esc_html_e( 'Título:', 'pos2025' ); ?></strong><br>
                <?php echo esc_html( $event_title ?: '-' ); ?>
            </p>
            <p>
                <strong><?php esc_html_e( 'Fecha Evento:', 'pos2025' ); ?></strong><br>
                <?php echo esc_html( $formatted_date ); ?>
            </p>
            <p>
                <strong><?php esc_html_e( 'Color:', 'pos2025' ); ?></strong><br>
                <?php if ( $event_color ) : ?>
                    <span style="display: inline-block; width: 20px; height: 20px; background-color: <?php echo esc_attr( $event_color ); ?>; border: 1px solid #ccc; vertical-align: middle; margin-right: 5px;"></span>
                    <code><?php echo esc_html( $event_color ); ?></code>
                <?php else : ?>
                    -
                <?php endif; ?>
            </p>
        <?php endif; // Fin del if $sale_type === 'subscription' ?>
    </div>
    <?php
}

?>
