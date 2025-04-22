// wp-content/plugins/pos2025/assets/js/pos-app.js
/**
 * Lógica principal de la interfaz del TPV (POS 2025).
 * Maneja la búsqueda de productos, gestión de clientes (búsqueda/selección/creación/edición),
 * el carrito, los tipos de venta, los métodos de pago y el proceso de checkout.
 * Utiliza SweetAlert2 para notificaciones.
 * Carga productos destacados al inicio.
 * Integra FullCalendar para visualizar eventos.
 *
 * @version 1.5.3 - Restored missing cart handling functions and added detailed logs.
 */

document.addEventListener('DOMContentLoaded', function() {
    'use strict'; // Usar modo estricto para mejor calidad de código.

    // Prefijos para logs de debug
    const CUST_DEBUG_PREFIX = '[POS_APP_DEBUG_CUST]';
    const CAL_DEBUG_PREFIX = '[POS_APP_DEBUG_CAL]';
    const PROD_DEBUG_PREFIX = '[POS_APP_DEBUG_PROD]';

    console.log('POS App Script Loaded and DOM Ready!');
    // Verificar parámetros localizados
    if (typeof pos2025_pos_params === 'undefined') {
        console.error('Error Crítico: pos2025_pos_params no está definido.');
        if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'error', title: 'Error Crítico', text: 'Faltan parámetros de configuración.' });
        } else {
            alert('Error Crítico: Faltan parámetros de configuración.');
        }
        return;
    }
    // Verificar SweetAlert
    if (typeof Swal === 'undefined') {
         console.error('Error Crítico: SweetAlert2 (Swal) no está definido.');
         alert('Error Crítico: Falta SweetAlert2.');
    }
    // Verificar FullCalendar
    if (typeof FullCalendar === 'undefined') {
         console.error('Error Crítico: FullCalendar no está definido.');
         alert('Error Crítico: Falta FullCalendar.');
    }

    console.log('API Params:', pos2025_pos_params);

    // =========================================================================
    // Referencias a Elementos del DOM
    // =========================================================================
    const searchInput = document.getElementById('pos-product-search');
    const searchButton = document.getElementById('pos-search-button');
    const resultsList = document.getElementById('pos-products-list');
    const productSearchSpinner = document.querySelector('#pos-search-section .spinner');
    const paginationContainer = document.getElementById('pos-pagination');
    const customerSearchInput = document.getElementById('pos-customer-search');
    const customerSearchButton = document.getElementById('pos-customer-search-button');
    const customerSpinner = document.getElementById('pos-customer-spinner');
    const customerList = document.getElementById('pos-customer-list');
    const selectedCustomerDiv = document.getElementById('pos-selected-customer');
    const selectedCustomerInfoSpan = document.getElementById('selected-customer-info');
    const clearCustomerButton = document.getElementById('clear-customer-button');
    const customerDisplayArea = document.getElementById('pos-customer-display-area');
    const customerFormContainer = document.getElementById('pos-customer-form-container');
    const showAddCustomerFormButton = document.getElementById('pos-show-add-customer-form');
    const editCustomerButton = document.getElementById('pos-edit-customer-button');
    const saveCustomerButton = document.getElementById('pos-save-customer-button');
    const cancelCustomerButton = document.getElementById('pos-cancel-customer-button');
    const customerFormTitle = document.getElementById('pos-customer-form-title');
    const customerIdInput = document.getElementById('pos-customer-id');
    const customerFirstNameInput = document.getElementById('pos-customer-firstname');
    const customerLastNameInput = document.getElementById('pos-customer-lastname');
    const customerEmailInput = document.getElementById('pos-customer-email');
    const customerPhoneInput = document.getElementById('pos-customer-phone');
    const customerSaveSpinner = document.getElementById('pos-customer-save-spinner');
    const customerFormNotice = document.getElementById('pos-customer-form-notice');
    const cartItemsList = document.getElementById('pos-cart-items');
    const cartTotalAmount = document.getElementById('cart-total-amount');
    const checkoutButton = document.getElementById('pos-checkout-button');
    const paymentGatewaySelect = document.getElementById('pos-payment-gateway');
    const gatewaySpinner = document.getElementById('pos-gateway-spinner');
    const saleTypeRadios = document.querySelectorAll('input[name="pos_sale_type"]');
    const customerNoteTextarea = document.getElementById('pos-customer-note');
    const subscriptionTermsDiv = document.getElementById('pos-subscription-terms');
    const subscriptionTitleInput = document.getElementById('pos_subscription_title');
    const subscriptionStartDateInput = document.getElementById('pos_subscription_start_date');
    const subscriptionColorInput = document.getElementById('pos_subscription_color');
    const calendarEl = document.getElementById('pos-calendar');

    // --- Verificación de Elementos Esenciales ---
    const essentialElements = [
        searchInput, searchButton, resultsList, productSearchSpinner, paginationContainer,
        customerSearchInput, customerSearchButton, customerSpinner, customerList,
        selectedCustomerDiv, selectedCustomerInfoSpan, clearCustomerButton, customerDisplayArea,
        customerFormContainer, showAddCustomerFormButton, editCustomerButton, saveCustomerButton, cancelCustomerButton,
        customerFormTitle, customerIdInput, customerFirstNameInput, customerLastNameInput, customerEmailInput, customerPhoneInput,
        customerSaveSpinner, customerFormNotice,
        cartItemsList, cartTotalAmount,
        checkoutButton, paymentGatewaySelect, gatewaySpinner, saleTypeRadios, customerNoteTextarea,
        subscriptionTermsDiv, subscriptionTitleInput, subscriptionStartDateInput, subscriptionColorInput,
        calendarEl
    ];
    if (essentialElements.some(el => !el)) {
        console.error('Error Crítico: No se encontraron algunos elementos esenciales del DOM.');
        const missingIds = essentialElements.map((el, index) => !el ? essentialElements[index]?.id || `Elemento ${index} sin ID` : null).filter(Boolean);
        console.error('Elementos faltantes (o sus IDs):', missingIds.join(', '));
        const errorMsg = 'Faltan elementos de la interfaz. Contacta al administrador.';
        if (typeof Swal !== 'undefined') { Swal.fire({ icon: 'error', title: 'Error Crítico', text: errorMsg }); }
        else { alert(`Error Crítico: ${errorMsg}`); }
        return;
    }

    // =========================================================================
    // Variables de Estado
    // =========================================================================
    let cart = [];
    let currentProducts = [];
    let currentCustomers = [];
    let selectedCustomerId = null;
    let currentSelectedCustomerObject = null;
    let posCalendarInstance = null;

    // =========================================================================
    // Funciones Auxiliares y de Lógica (Productos y Carrito)
    // =========================================================================

    /** Formatea items del carrito para la API */
    function getCartItemsForAPI() {
        console.log(PROD_DEBUG_PREFIX, "Formateando items del carrito para la API..."); // Añadir log
        return cart.map(item => {
            const itemData = { // Crear objeto
                product_id: item.productId,
                variation_id: item.variationId || 0,
                quantity: item.quantity,
                // *** LÍNEA CORREGIDA/AÑADIDA ***
                price: item.price // Enviar el precio final (editado o no)
            };
            console.log(PROD_DEBUG_PREFIX, ` - Item formateado: ${item.name}, Precio enviado: ${item.price}`); // Log por item
            return itemData; // Devolver objeto
        });
    }


    /** Vacía el carrito y actualiza UI */
    function clearCartUI() {
        cart = [];
        displayCart();
        console.log('Carrito limpiado.');
    }

    /** Busca productos vía API */
    async function searchProducts(searchTerm = '', page = 1, isInitialLoad = false) {
        const searchType = isInitialLoad ? 'iniciales (destacados)' : `término "${searchTerm}"`;
        console.log(PROD_DEBUG_PREFIX, `Iniciando searchProducts para ${searchType}, Página: ${page}`);
        if (!resultsList || !productSearchSpinner) { console.error(PROD_DEBUG_PREFIX, "Error crítico: Falta resultsList o productSearchSpinner."); return; }

        console.log(PROD_DEBUG_PREFIX, "Mostrando spinner y mensaje 'Cargando...'");
        productSearchSpinner.classList.add('is-active');
        resultsList.innerHTML = `<li>${pos2025_pos_params.text_loading || 'Buscando...'}</li>`;

        const apiRoute = '/pos2025/v1/products';
        const queryParams = new URLSearchParams({ per_page: isInitialLoad ? 8 : 10, page: page });

        if (isInitialLoad) {
            queryParams.set('featured', 'true');
            console.log(PROD_DEBUG_PREFIX, "Es carga inicial, añadiendo featured=true");
        } else {
            const trimmedSearch = searchTerm.trim();
            if (trimmedSearch) {
                queryParams.set('search', trimmedSearch);
                console.log(PROD_DEBUG_PREFIX, `Búsqueda normal, añadiendo search=${trimmedSearch}`);
            } else {
                 console.log(PROD_DEBUG_PREFIX, "Búsqueda normal sin término.");
            }
        }

        const fullPath = `${apiRoute}?${queryParams.toString()}`;
        console.log(PROD_DEBUG_PREFIX, `Llamando a API: ${fullPath}`);

        try {
            console.log(PROD_DEBUG_PREFIX, "Ejecutando wp.apiFetch...");
            const response = await wp.apiFetch({ path: fullPath, method: 'GET' });
            console.log(PROD_DEBUG_PREFIX, "wp.apiFetch completado. Respuesta recibida:", response);

            if (!Array.isArray(response)) {
                 console.error(PROD_DEBUG_PREFIX, "Error: La respuesta de la API no es un array.", response);
                 throw new Error("Formato de respuesta inesperado de la API.");
            }

            currentProducts = response;
            console.log(PROD_DEBUG_PREFIX, "Llamando a displayResults...");
            displayResults(currentProducts, isInitialLoad);

        } catch (error) {
            console.error(PROD_DEBUG_PREFIX, `Error durante la búsqueda/procesamiento de productos ${searchType}:`, error);
            let errorMessage = `Error al buscar productos ${searchType}.`;
            if (error.message) errorMessage += ` Detalles: ${error.message}`;
            if (error.code) errorMessage += ` (Código: ${error.code})`;
            if (error.data && error.data.status) errorMessage += ` (Status: ${error.data.status})`;
            resultsList.innerHTML = `<li class="error-message">${errorMessage}</li>`;
            console.log(PROD_DEBUG_PREFIX, "Mostrando mensaje de error en la lista.");
            if (typeof Swal !== 'undefined') { Swal.fire({ icon: 'error', title: pos2025_pos_params.swal_error_title || 'Error', text: errorMessage }); }
        } finally {
            console.log(PROD_DEBUG_PREFIX, "Bloque finally: Ocultando spinner.");
            if (productSearchSpinner) { productSearchSpinner.classList.remove('is-active'); }
            else { console.warn(PROD_DEBUG_PREFIX, "Spinner no encontrado en finally."); }
        }
    }

    /** Muestra resultados de productos */
    function displayResults(products, isInitialLoad = false) {
        console.log(PROD_DEBUG_PREFIX, `Iniciando displayResults. ¿Es carga inicial?: ${isInitialLoad}. Número de productos recibidos: ${Array.isArray(products) ? products.length : 'No es array'}`);
        if (!resultsList) { console.error(PROD_DEBUG_PREFIX, "Error crítico en displayResults: Falta resultsList."); return; }

        resultsList.innerHTML = '';
        console.log(PROD_DEBUG_PREFIX, "Lista de resultados limpiada.");

        if (!Array.isArray(products)) {
             console.error(PROD_DEBUG_PREFIX, "Error: 'products' no es un array en displayResults.");
             resultsList.innerHTML = '<li class="error-message">Error interno: Datos de productos inválidos.</li>';
             return;
        }

        if (products.length === 0) {
            console.log(PROD_DEBUG_PREFIX, "No se recibieron productos.");
            if (isInitialLoad) {
                resultsList.innerHTML = '<li>No hay productos destacados para mostrar. Realiza una búsqueda.</li>';
                console.log(PROD_DEBUG_PREFIX, "Mostrando mensaje 'No hay destacados'.");
            } else {
                resultsList.innerHTML = '<li>No se encontraron productos que coincidan con tu búsqueda.</li>';
                console.log(PROD_DEBUG_PREFIX, "Mostrando mensaje 'No se encontraron productos'.");
            }
            return;
        }

        console.log(PROD_DEBUG_PREFIX, `Procesando ${products.length} productos para mostrar...`);
        try {
            products.forEach((product, index) => {
                const listItem = document.createElement('li');
                listItem.dataset.productId = product.id;
                let variationsHtml = '';
                if (product.type === 'variable' && product.variations && Array.isArray(product.variations) && product.variations.length > 0) {
                    variationsHtml = '<ul class="product-variations">';
                    product.variations.forEach(variation => {
                        const variationId = variation.variation_id || 'N/A';
                        const variationName = variation.variation_name || 'Variación';
                        const variationSku = variation.sku || 'N/A';
                        const variationPriceHtml = variation.price_html || variation.price || 'N/A';
                        const stockStatus = variation.stock_status || 'outofstock';
                        const stockQuantity = variation.stock_quantity;
                        const isInstock = stockStatus === 'instock';
                        variationsHtml += `
                            <li data-variation-id="${variationId}">
                                <span class="variation-name">${variationName} (SKU: ${variationSku})</span> -
                                <span class="variation-price">${variationPriceHtml}</span> -
                                <span class="variation-stock ${stockStatus}">${isInstock ? (stockQuantity !== null ? `Stock: ${stockQuantity}` : 'En stock') : 'Agotado'}</span>
                                <span class="variation-actions">
                                    <button class="button button-small add-variation-to-cart" data-variation-id="${variationId}" ${!isInstock ? 'disabled' : ''}>Añadir</button>
                                </span>
                            </li>`;
                    });
                    variationsHtml += '</ul>';
                }
                const productName = product.name || 'Producto sin nombre';
                const productSku = product.sku || 'N/A';
                const productType = product.type || 'simple';
                const productPriceHtml = product.price_html || product.price || 'N/A';
                const productStockStatus = product.stock_status || 'outofstock';
                const productImageUrl = product.image_url || '';
                const isSimpleInstock = productType === 'simple' && productStockStatus === 'instock';
                listItem.innerHTML = `
                    <img src="${productImageUrl}" alt="${productName}" width="50" height="50" style="vertical-align: middle; margin-right: 10px;">
                    <div class="product-info" style="display: inline-block; vertical-align: middle;">
                        <strong>${productName}</strong><br>
                        <span>SKU: ${productSku}</span> - <span>Tipo: ${productType}</span>
                        ${productType === 'simple' ? ` - <span>Precio: ${productPriceHtml}</span>` : ''}
                        ${productType === 'simple' ? ` - <span class="stock-status ${productStockStatus}">${productStockStatus === 'instock' ? 'En stock' : 'Agotado'}</span>` : ''}
                    </div>
                    <div class="product-actions" style="float: right;">
                        ${productType === 'simple' ? `<button class="button button-small add-simple-to-cart" data-product-id="${product.id}" ${!isSimpleInstock ? 'disabled' : ''}>Añadir</button>` : '<span style="font-style: italic; color: #777;">Selecciona variación</span>'}
                    </div>
                    <div style="clear: both;"></div>
                    ${variationsHtml}`;
                resultsList.appendChild(listItem);
            });
            console.log(PROD_DEBUG_PREFIX, "Todos los productos procesados y añadidos a la lista.");
        } catch (renderError) {
             console.error(PROD_DEBUG_PREFIX, "Error durante el renderizado de productos en displayResults:", renderError);
             resultsList.innerHTML = `<li class="error-message">Error al mostrar productos: ${renderError.message}</li>`;
        }
    }

    /** Carga productos iniciales */
    async function loadInitialProducts() {
        console.log(PROD_DEBUG_PREFIX, "Llamando a loadInitialProducts...");
        await searchProducts('', 1, true);
        console.log(PROD_DEBUG_PREFIX, "loadInitialProducts completado.");
    }

    // *** INICIO: FUNCIONES RESTAURADAS ***

    /** Maneja clic en botones "Añadir" */
    function handleAddProductClick(event) {
        console.log(PROD_DEBUG_PREFIX, "handleAddProductClick llamado.");
        const targetButton = event.target;
        let productDataForCart = null;
        let product = null;
        let variation = null;

        if (targetButton.classList.contains('add-simple-to-cart') || targetButton.classList.contains('add-variation-to-cart')) {
            console.log(PROD_DEBUG_PREFIX, "Botón 'Añadir' detectado.");
            const productLi = targetButton.closest('li[data-product-id]');
            if (!productLi) { console.warn(PROD_DEBUG_PREFIX, "No se encontró el LI padre del producto."); return; }
            const productId = productLi.dataset.productId;
            console.log(PROD_DEBUG_PREFIX, `Buscando producto con ID: ${productId}`);
            product = currentProducts.find(p => p.id == productId);
            if (!product) { console.warn(PROD_DEBUG_PREFIX, `Producto con ID ${productId} no encontrado.`); return; }
            console.log(PROD_DEBUG_PREFIX, "Producto encontrado:", product);

            if (targetButton.classList.contains('add-variation-to-cart')) {
                const variationId = targetButton.dataset.variationId;
                console.log(PROD_DEBUG_PREFIX, `Buscando variación con ID: ${variationId}`);
                if (!variationId || !product.variations) { console.warn(PROD_DEBUG_PREFIX, "Falta variationId o variaciones."); return; }
                variation = product.variations.find(v => v.variation_id == variationId);
                if (!variation) { console.warn(PROD_DEBUG_PREFIX, `Variación con ID ${variationId} no encontrada.`); return; }
                 console.log(PROD_DEBUG_PREFIX, "Variación encontrada:", variation);
            }
        } else { return; }

        if (variation) {
            console.log(PROD_DEBUG_PREFIX, "Preparando datos para añadir variación.");
            productDataForCart = {
                id: product.id, variation_id: variation.variation_id, name: product.name,
                variation_name: variation.variation_name || '', price: variation.price, quantity: 1,
                sku: variation.sku || '', image_url: variation.image_url || product.image_url,
            };
        } else if (product && product.type === 'simple') {
             console.log(PROD_DEBUG_PREFIX, "Preparando datos para añadir producto simple.");
            productDataForCart = {
                id: product.id, variation_id: null, name: product.name, variation_name: '',
                price: product.price, quantity: 1, sku: product.sku || '', image_url: product.image_url || '',
            };
        }

        if (productDataForCart) {
            productDataForCart.price = parseFloat(productDataForCart.price) || 0;
            console.log(PROD_DEBUG_PREFIX, "Llamando a addToCart con:", productDataForCart);
            addToCart(productDataForCart);
        } else { console.warn(PROD_DEBUG_PREFIX, "No se generaron datos válidos para añadir al carrito."); }
    }

    /** Añade producto al carrito */
    function addToCart(productData) {
        const cartItemId = productData.variation_id ? `${productData.id}-${productData.variation_id}` : `${productData.id}`;
        console.log(PROD_DEBUG_PREFIX, `addToCart - Cart Item ID: ${cartItemId}`);
        const existingItemIndex = cart.findIndex(item => item.cartItemId === cartItemId);

        // Asegurarse de que el precio es un número
        const price = parseFloat(productData.price) || 0; // <-- Asegurar que sea número

        if (existingItemIndex > -1) {
            console.log(PROD_DEBUG_PREFIX, `Item ${cartItemId} ya existe, incrementando cantidad.`);
            cart[existingItemIndex].quantity += productData.quantity;
            // Nota: No actualizamos el precio aquí. Si el usuario ya editó el precio
            // y añade más cantidad del mismo item, mantenemos el precio editado.
            // Si quisiéramos resetearlo, lo haríamos aquí:
            // cart[existingItemIndex].price = price;
            // cart[existingItemIndex].originalPrice = price;
        } else {
             console.log(PROD_DEBUG_PREFIX, `Añadiendo nuevo item ${cartItemId} al carrito.`);
            cart.push({
                cartItemId: cartItemId,
                productId: productData.id,
                variationId: productData.variation_id || null,
                name: productData.name,
                variationName: productData.variation_name || '',
                // *** MODIFICADO: Guardar ambos precios ***
                originalPrice: price, // Precio original del producto/variación
                price: price,         // Precio efectivo actual (inicialmente igual al original)
                // *** FIN MODIFICADO ***
                quantity: productData.quantity,
                sku: productData.sku,
                image_url: productData.image_url,
            });
        }
        console.log(PROD_DEBUG_PREFIX, 'Carrito actualizado:', cart);
        console.log(PROD_DEBUG_PREFIX, "Llamando a displayCart desde addToCart.");
        displayCart();
    }

    /** Calcula total del carrito */
    function calculateTotal() {
        const total = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
        return total;
    }

    /** Muestra items del carrito y total */
    function displayCart() {
        console.log(PROD_DEBUG_PREFIX, "Iniciando displayCart.");
        if (!cartItemsList || !cartTotalAmount) { console.error(PROD_DEBUG_PREFIX, "Error crítico en displayCart: Falta cartItemsList o cartTotalAmount."); return; }

        cartItemsList.innerHTML = ''; // Limpiar lista actual

        if (cart.length === 0) {
            console.log(PROD_DEBUG_PREFIX, "Carrito vacío, mostrando mensaje.");
            cartItemsList.innerHTML = pos2025_pos_params.text_cart_empty || '<li style="padding: 10px; color: #777;">El carrito está vacío.</li>'; // Usar estilo del HTML si existe
        } else {
             console.log(PROD_DEBUG_PREFIX, `Mostrando ${cart.length} items en el carrito.`);
            cart.forEach((item, index) => {
                const listItem = document.createElement('li');
                listItem.dataset.cartIndex = index; // Guardar índice para acciones

                // *** NUEVO: Input para el precio ***
                const priceInputId = `item-price-${index}`;
                // Formatear el valor inicial del input con los decimales correctos
                const initialPriceValue = (typeof item.price === 'number')
                    ? item.price.toFixed(pos2025_pos_params.price_decimals || 2)
                    : '0.00';

                const priceInputHtml = `
                    <input type="number" class="item-price-input" id="${priceInputId}"
                           value="${initialPriceValue}"
                           min="0" step="0.01" data-index="${index}"
                           aria-label="Precio unitario editable"
                           style="width: 80px; text-align: right; margin-right: 5px; padding: 2px 4px; height: auto; line-height: normal;">
                `;
                // *** FIN NUEVO ***

                // *** NUEVO: Indicador visual y botón de reset si el precio fue editado ***
                let priceIndicatorHtml = '';
                // Comprobar si los precios son diferentes (considerando posible error de punto flotante)
                if (Math.abs(item.price - item.originalPrice) > 0.001) { // Umbral pequeño para comparación
                    priceIndicatorHtml = `
                        <span style="color: orange; font-size: 0.8em; margin-left: 2px;" title="Precio original: ${wc_price(item.originalPrice)}">(Editado)</span>
                        <button class="reset-price" data-index="${index}" title="Restaurar precio original" style="background:none; border:none; color: blue; cursor:pointer; padding: 0 3px; font-size: 0.9em; vertical-align: middle;">&#x21BA;</button> <!-- Símbolo de reset -->
                    `;
                }
                // *** FIN NUEVO ***

                // *** MODIFICADO: Usar item.price (efectivo) para calcular subtotal ***
                const subtotal = (typeof item.price === 'number' && typeof item.quantity === 'number')
                    ? item.price * item.quantity
                    : 0;
                const subtotalFormatted = wc_price(subtotal);
                // *** FIN MODIFICADO ***

                // Construir el HTML del elemento de lista
                listItem.innerHTML = `
                    <span class="item-name">${item.name} ${item.variationName ? `(${item.variationName})` : ''}</span>
                    <span class="item-qty">
                        <button class="button-qty decrease-qty" data-index="${index}" title="Disminuir cantidad">-</button>
                        <input type="number" class="item-quantity-input" value="${item.quantity}" min="1" data-index="${index}" style="width: 50px; text-align: center;" aria-label="Cantidad">
                        <button class="button-qty increase-qty" data-index="${index}" title="Aumentar cantidad">+</button>
                    </span>
                    <span class="item-price-container" style="white-space: nowrap;">
                        ${priceInputHtml} <!-- Input en lugar de texto -->
                        ${priceIndicatorHtml} <!-- Indicador y botón reset -->
                    </span>
                    <span class="item-subtotal">= ${subtotalFormatted}</span>
                    <button class="remove-item" data-index="${index}" title="Eliminar item">&times;</button> <!-- Estilo movido a CSS -->
                `;
                cartItemsList.appendChild(listItem);
            });
        }

        // Calcular y mostrar total (calculateTotal ya usa item.price)
        const total = calculateTotal();
        const totalFormatted = wc_price(total);
        cartTotalAmount.textContent = totalFormatted;
        console.log(PROD_DEBUG_PREFIX, `Total del carrito mostrado: ${totalFormatted}`);

        // Actualizar estado del botón de checkout
        console.log(PROD_DEBUG_PREFIX, "Llamando a updateCheckoutButtonState desde displayCart.");
        updateCheckoutButtonState();
    }

    /** Actualiza cantidad de item en carrito */
    function updateQuantity(index, newQuantity) {
        console.log(PROD_DEBUG_PREFIX, `updateQuantity llamado para índice ${index}, nueva cantidad ${newQuantity}`);
        if (index < 0 || index >= cart.length) { console.warn(PROD_DEBUG_PREFIX, "Índice inválido en updateQuantity."); return; }
        const item = cart[index];
        if (newQuantity < 1) {
            console.log(PROD_DEBUG_PREFIX, `Eliminando item ${item.cartItemId} del carrito.`);
            cart.splice(index, 1);
        } else {
            console.log(PROD_DEBUG_PREFIX, `Actualizando cantidad del item ${item.cartItemId} a ${newQuantity}.`);
            item.quantity = newQuantity;
        }
        console.log(PROD_DEBUG_PREFIX, "Llamando a displayCart desde updateQuantity.");
        displayCart();
    }

     /** Maneja clics en botones del carrito (+, -, x, reset price) */
     function handleCartActions(event) {
        const target = event.target;
        const index = target.dataset.index; // Obtener el índice desde data-index

        // Salir si no hay índice (el clic no fue en un botón con data-index)
        if (index === undefined) return;

        const cartIndex = parseInt(index, 10);

        // Validar el índice
        if (isNaN(cartIndex) || cartIndex < 0 || cartIndex >= cart.length) {
            console.warn(PROD_DEBUG_PREFIX, `Índice inválido ${index} en handleCartActions.`);
            return;
        }

        // Determinar qué botón se presionó
        if (target.classList.contains('decrease-qty')) {
            console.log(PROD_DEBUG_PREFIX, `Clic en '-' para índice ${cartIndex}`);
            updateQuantity(cartIndex, cart[cartIndex].quantity - 1);
        } else if (target.classList.contains('increase-qty')) {
            console.log(PROD_DEBUG_PREFIX, `Clic en '+' para índice ${cartIndex}`);
            updateQuantity(cartIndex, cart[cartIndex].quantity + 1);
        } else if (target.classList.contains('remove-item')) {
            console.log(PROD_DEBUG_PREFIX, `Clic en 'x' para índice ${cartIndex}`);
            updateQuantity(cartIndex, 0); // Elimina el item al poner cantidad 0
        // *** NUEVO: Manejar clic en botón de resetear precio ***
        } else if (target.classList.contains('reset-price')) {
            console.log(PROD_DEBUG_PREFIX, `Clic en 'reset price' para índice ${cartIndex}`);
            // Llamar a updatePrice con el precio original guardado
            updatePrice(cartIndex, cart[cartIndex].originalPrice);
        }
        // *** FIN NUEVO ***
    }

    /** Maneja cambios en input de cantidad */
    function handleQuantityInputChange(event) {
        const target = event.target;
        const index = target.dataset.index;
        if (index === undefined || !target.classList.contains('item-quantity-input')) return;
        const cartIndex = parseInt(index, 10);
        if (isNaN(cartIndex) || cartIndex < 0 || cartIndex >= cart.length) { console.warn(PROD_DEBUG_PREFIX, `Índice inválido ${index} en handleQuantityInputChange.`); return; }
        const newQuantity = parseInt(target.value, 10);
        console.log(PROD_DEBUG_PREFIX, `Cambio en input de cantidad para índice ${cartIndex}, nuevo valor ${target.value}`);
        if (!isNaN(newQuantity)) { updateQuantity(cartIndex, newQuantity); }
        else { console.warn(PROD_DEBUG_PREFIX, `Valor inválido, revirtiendo a ${cart[cartIndex].quantity}`); target.value = cart[cartIndex].quantity; }
    }

    /**
     * Actualiza el precio efectivo de un item en el carrito.
     * Llama a displayCart para refrescar la UI.
     * @param {number} index Índice del item en el array cart.
     * @param {number} newPrice El nuevo precio efectivo.
     */
    function updatePrice(index, newPrice) {
        console.log(PROD_DEBUG_PREFIX, `updatePrice llamado para índice ${index}, nuevo precio ${newPrice}`);

        // Validar índice
        if (index < 0 || index >= cart.length) {
            console.warn(PROD_DEBUG_PREFIX, "Índice inválido en updatePrice.");
            return;
        }

        // Validar que el precio sea un número no negativo
        const price = parseFloat(newPrice);
        if (isNaN(price) || price < 0) {
            console.warn(PROD_DEBUG_PREFIX, `Precio inválido ${newPrice} en updatePrice. No se actualiza.`);
            // Opcional: Mostrar un error al usuario
            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'warning', title: 'Precio Inválido', text: 'Introduce un número positivo.', timer: 1500, showConfirmButton: false });
            }
            // displayCart() se llamará de todos modos (desde el handler) y corregirá el input
        } else {
            console.log(PROD_DEBUG_PREFIX, `Actualizando precio del item ${cart[index].cartItemId} a ${price}.`);
            // Actualizar el precio efectivo en el array del carrito
            cart[index].price = price;
        }

        // Siempre volver a renderizar el carrito para actualizar subtotales, total,
        // y el indicador (Editado)/botón reset.
        console.log(PROD_DEBUG_PREFIX, "Llamando a displayCart desde updatePrice.");
        displayCart();
    }

    /**
     * Maneja cambios en los inputs de precio del carrito (evento 'change').
     * Valida el nuevo valor y llama a updatePrice.
     * @param {Event} event El objeto del evento change.
     */
    function handlePriceInputChange(event) {
        const target = event.target;

        // Asegurarse de que el evento proviene de un input de precio
        if (!target.classList.contains('item-price-input')) {
            return; // No es un input de precio que nos interese
        }

        const index = target.dataset.index;
        if (index === undefined) {
            console.warn(PROD_DEBUG_PREFIX, "Input de precio sin data-index.");
            return;
        }

        const cartIndex = parseInt(index, 10);
        if (isNaN(cartIndex) || cartIndex < 0 || cartIndex >= cart.length) {
            console.warn(PROD_DEBUG_PREFIX, `Índice inválido ${index} en handlePriceInputChange.`);
            return;
        }

        const newValue = target.value;
        console.log(PROD_DEBUG_PREFIX, `Cambio en input de precio para índice ${cartIndex}, nuevo valor ${newValue}`);

        // Llamar a updatePrice para validar y actualizar el estado del carrito
        // updatePrice se encargará de la validación numérica y de refrescar la UI
        updatePrice(cartIndex, newValue);

        // Nota: Si updatePrice encuentra un valor inválido, displayCart()
        // volverá a renderizar el input con el valor válido anterior guardado en cart[cartIndex].price.
    }

    // =========================================================================
    // Funciones de Gestión de Clientes (Con Swal)
    // =========================================================================
    /**
     * Busca clientes vía API REST de WordPress/WooCommerce.
     * @param {string} searchTerm Término de búsqueda (nombre, email, etc.).
     * @param {number} page Número de página para paginación (no implementada aún en UI).
     */
    async function searchCustomers(searchTerm = '', page = 1) {
        console.log(CUST_DEBUG_PREFIX, `Iniciando searchCustomers. Término: "${searchTerm}", Página: ${page}`);
        if (!customerList || !customerSpinner) {
            console.error(CUST_DEBUG_PREFIX, "Error crítico: Falta customerList o customerSpinner.");
            return;
        }

        // Mostrar spinner y limpiar resultados anteriores
        customerSpinner.classList.add('is-active');
        customerList.innerHTML = `<li>${pos2025_pos_params.text_loading || 'Buscando clientes...'}</li>`;
        customerList.style.display = 'block'; // Asegurarse de que la lista sea visible

        // Construir la ruta y parámetros de la API
        // Usaremos el endpoint estándar de WooCommerce para clientes
        // Nota: Asegúrate de que el usuario actual tenga permisos para leer clientes ('view_users' o similar)
        const apiRoute = '/wc/v3/customers'; // Endpoint estándar de WooCommerce
        const queryParams = new URLSearchParams({
            per_page: 15, // Número de resultados por página
            page: page,
            role: 'customer' // Asegurarse de buscar solo clientes
        });

        const trimmedSearch = searchTerm.trim();
        if (trimmedSearch) {
            queryParams.set('search', trimmedSearch);
            console.log(CUST_DEBUG_PREFIX, `Añadiendo search=${trimmedSearch}`);
        } else {
            console.log(CUST_DEBUG_PREFIX, "Búsqueda sin término específico (mostrará los más recientes).");
        }

        const fullPath = `${apiRoute}?${queryParams.toString()}`;
        console.log(CUST_DEBUG_PREFIX, `Llamando a API: ${fullPath}`);

        try {
            // Usar wp.apiFetch (requiere que el script esté encolado con 'wp-api-fetch' como dependencia)
            // O usar el nonce si se usa un endpoint personalizado
            const response = await wp.apiFetch({
                path: fullPath,
                method: 'GET',
                // No necesitamos nonce aquí porque usamos el endpoint estándar de WC
                // y wp.apiFetch lo maneja si el usuario está logueado.
            });

            console.log(CUST_DEBUG_PREFIX, "Respuesta de API recibida:", response);

            if (!Array.isArray(response)) {
                console.error(CUST_DEBUG_PREFIX, "Error: La respuesta de la API de clientes no es un array.", response);
                throw new Error("Formato de respuesta inesperado de la API de clientes.");
            }

            currentCustomers = response; // Guardar los clientes encontrados
            console.log(CUST_DEBUG_PREFIX, "Llamando a displayCustomerResults...");
            displayCustomerResults(currentCustomers);

        } catch (error) {
            console.error(CUST_DEBUG_PREFIX, `Error durante la búsqueda de clientes:`, error);
            let errorMessage = `Error al buscar clientes.`;
            if (error.message) errorMessage += ` Detalles: ${error.message}`;
            if (error.code) errorMessage += ` (Código: ${error.code})`; // Ej: rest_forbidden
            if (error.data && error.data.status) errorMessage += ` (Status: ${error.data.status})`; // Ej: 401, 403

            // Mostrar error específico si es por permisos
            if (error.code === 'rest_forbidden' || (error.data && error.data.status === 403) || (error.data && error.data.status === 401)) {
                 errorMessage = 'No tienes permiso para buscar clientes. Contacta al administrador.';
            }

            customerList.innerHTML = `<li class="error-message" style="color: red; padding: 8px;">${errorMessage}</li>`;
            console.log(CUST_DEBUG_PREFIX, "Mostrando mensaje de error en la lista de clientes.");
            // Opcional: Mostrar también con Swal
            if (typeof Swal !== 'undefined') {
                // No mostrar Swal para errores de permiso, ya que es más un problema de configuración
                if (error.code !== 'rest_forbidden' && (!error.data || (error.data.status !== 403 && error.data.status !== 401))) {
                    Swal.fire({ icon: 'error', title: pos2025_pos_params.swal_error_title || 'Error', text: errorMessage });
                }
            }
        } finally {
            console.log(CUST_DEBUG_PREFIX, "Bloque finally: Ocultando spinner.");
            if (customerSpinner) {
                customerSpinner.classList.remove('is-active');
            } else {
                console.warn(CUST_DEBUG_PREFIX, "Spinner de cliente no encontrado en finally.");
            }
        }
    }

    /**
     * Muestra los resultados de la búsqueda de clientes en la lista ul#pos-customer-list.
     * @param {Array} customers Array de objetos de cliente devueltos por la API.
     */
    function displayCustomerResults(customers) {
        console.log(CUST_DEBUG_PREFIX, `Iniciando displayCustomerResults. Número de clientes recibidos: ${Array.isArray(customers) ? customers.length : 'No es array'}`);
        if (!customerList) {
            console.error(CUST_DEBUG_PREFIX, "Error crítico en displayCustomerResults: Falta customerList.");
            return;
        }

        customerList.innerHTML = ''; // Limpiar resultados anteriores
        console.log(CUST_DEBUG_PREFIX, "Lista de clientes limpiada.");

        // Verificar si la respuesta es un array válido
        if (!Array.isArray(customers)) {
            console.error(CUST_DEBUG_PREFIX, "Error: 'customers' no es un array en displayCustomerResults.");
            customerList.innerHTML = '<li class="error-message" style="color: red; padding: 8px;">Error interno: Datos de clientes inválidos.</li>';
            customerList.style.display = 'block'; // Asegurar visibilidad de la lista con el error
            return;
        }

        // Verificar si no se encontraron clientes
        if (customers.length === 0) {
            console.log(CUST_DEBUG_PREFIX, "No se recibieron clientes.");
            customerList.innerHTML = '<li style="padding: 8px; color: #777;">No se encontraron clientes.</li>';
            customerList.style.display = 'block'; // Asegurar visibilidad de la lista con el mensaje
            return;
        }

        console.log(CUST_DEBUG_PREFIX, `Procesando ${customers.length} clientes para mostrar...`);
        try {
            // Iterar sobre los clientes y crear elementos de lista
            customers.forEach(customer => {
                const listItem = document.createElement('li');
                listItem.dataset.customerId = customer.id; // Guardar el ID del cliente en el dataset
                listItem.style.cursor = 'pointer'; // Indicar visualmente que es seleccionable

                // Construir el texto a mostrar (Nombre Apellido - Email)
                let customerDisplayName = '';
                // Usar nombre y apellido si están disponibles
                if (customer.first_name || customer.last_name) {
                    customerDisplayName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
                } else if (customer.username) {
                    customerDisplayName = customer.username; // Usar username como fallback
                } else {
                    customerDisplayName = `Cliente #${customer.id}`; // Fallback final si no hay nombre ni username
                }

                // Añadir email si existe
                if (customer.email) {
                    customerDisplayName += ` - ${customer.email}`;
                }

                listItem.textContent = customerDisplayName;
                listItem.title = `Seleccionar ${customerDisplayName}`; // Añadir tooltip para accesibilidad

                customerList.appendChild(listItem); // Añadir el elemento a la lista
            });

            customerList.style.display = 'block'; // Asegurar que la lista sea visible ahora que tiene contenido
            console.log(CUST_DEBUG_PREFIX, "Todos los clientes procesados y añadidos a la lista.");

        } catch (renderError) {
            // Capturar errores durante la creación de los elementos LI
            console.error(CUST_DEBUG_PREFIX, "Error durante el renderizado de clientes en displayCustomerResults:", renderError);
            customerList.innerHTML = `<li class="error-message" style="color: red; padding: 8px;">Error al mostrar clientes: ${renderError.message}</li>`;
            customerList.style.display = 'block'; // Asegurar visibilidad de la lista con el error
        }
    }

    /**
     * Selecciona un cliente, actualiza el estado y la interfaz de usuario.
     * @param {number|string} customerId El ID del cliente seleccionado.
     */
    function selectCustomer(customerId) {
        console.log(CUST_DEBUG_PREFIX, `Iniciando selectCustomer con ID: ${customerId}`);

        // 1. Encontrar el objeto cliente completo en el array 'currentCustomers'
        // Usamos '==' para comparar por si el ID viene como string del dataset
        const selectedCustomer = currentCustomers.find(cust => cust.id == customerId);

        if (!selectedCustomer) {
            console.error(CUST_DEBUG_PREFIX, `Cliente con ID ${customerId} no encontrado en currentCustomers.`);
            // Opcional: Mostrar un error con Swal si esto ocurre inesperadamente
            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'error', title: 'Error Interno', text: 'No se pudieron cargar los datos del cliente seleccionado.' });
            }
            return; // No continuar si no se encuentra el cliente
        }
        console.log(CUST_DEBUG_PREFIX, "Cliente encontrado:", selectedCustomer);

        // 2. Actualizar variables de estado globales
        selectedCustomerId = selectedCustomer.id; // Asegurarse de guardar el ID correcto
        currentSelectedCustomerObject = selectedCustomer; // Guardar el objeto completo para editar/checkout
        console.log(CUST_DEBUG_PREFIX, `Estado actualizado: selectedCustomerId=${selectedCustomerId}, currentSelectedCustomerObject establecido.`);

        // 3. Actualizar la interfaz para mostrar la información del cliente seleccionado
        let displayName = '';
        // Construir nombre legible
        if (selectedCustomer.first_name || selectedCustomer.last_name) {
            displayName = `${selectedCustomer.first_name || ''} ${selectedCustomer.last_name || ''}`.trim();
        } else if (selectedCustomer.username) {
            displayName = selectedCustomer.username; // Usar username como fallback
        } else {
            displayName = `Cliente #${selectedCustomer.id}`; // Fallback final
        }
        // Añadir email si existe
        if (selectedCustomer.email) {
            displayName += ` (${selectedCustomer.email})`;
        }

        if (selectedCustomerInfoSpan) {
            selectedCustomerInfoSpan.textContent = displayName;
            console.log(CUST_DEBUG_PREFIX, `Mostrando info del cliente: ${displayName}`);
        } else {
            console.error(CUST_DEBUG_PREFIX, "Elemento selectedCustomerInfoSpan no encontrado.");
        }

        // 4. Mostrar el div de cliente seleccionado y ocultar el área de búsqueda/resultados
        if (selectedCustomerDiv) {
            selectedCustomerDiv.style.display = 'block'; // Mostrar el cuadro con la info y botones Editar/Quitar
            console.log(CUST_DEBUG_PREFIX, "Mostrando selectedCustomerDiv.");
        } else {
            console.error(CUST_DEBUG_PREFIX, "Elemento selectedCustomerDiv no encontrado.");
        }

        // Ocultar el área de búsqueda (input, botón buscar, botón nuevo)
        // Asumiendo que están dentro de 'pos-customer-search-area' como en el HTML que generamos
        const customerSearchArea = document.getElementById('pos-customer-search-area');
        if (customerSearchArea) {
             customerSearchArea.style.display = 'none';
             console.log(CUST_DEBUG_PREFIX, "Ocultando customerSearchArea.");
        } else {
             console.warn(CUST_DEBUG_PREFIX, "Elemento pos-customer-search-area no encontrado para ocultar. Ocultando elementos individuales.");
             // Fallback si el contenedor no existe o tiene otro ID
             if (customerSearchInput) customerSearchInput.style.display = 'none';
             if (customerSearchButton) customerSearchButton.style.display = 'none';
             if (showAddCustomerFormButton) showAddCustomerFormButton.style.display = 'none'; // Ocultar también el botón '+'
        }

        // Limpiar y ocultar la lista de resultados de búsqueda
        if (customerList) {
            customerList.innerHTML = '';
            customerList.style.display = 'none';
            console.log(CUST_DEBUG_PREFIX, "Limpiando y ocultando customerList.");
        }

        // 5. Asegurarse de que el formulario de añadir/editar cliente esté oculto
        // (Podría estar abierto si el usuario estaba editando y luego buscó y seleccionó otro)
        hideCustomerForm();
        console.log(CUST_DEBUG_PREFIX, "Llamando a hideCustomerForm para asegurar que esté oculto.");

        // 6. Actualizar el estado del botón de checkout
        // (Seleccionar un cliente puede habilitar el checkout para ciertos tipos de venta)
        updateCheckoutButtonState();
        console.log(CUST_DEBUG_PREFIX, "Llamando a updateCheckoutButtonState.");

        console.log(CUST_DEBUG_PREFIX, "selectCustomer completado.");
    }

    /**
     * Limpia la selección del cliente actual y restaura la interfaz de búsqueda.
     */
      function clearCustomerSelection() {
        console.log(CUST_DEBUG_PREFIX, "Iniciando clearCustomerSelection.");

        // 1. Resetear variables de estado globales
        selectedCustomerId = null;
        currentSelectedCustomerObject = null;
        console.log(CUST_DEBUG_PREFIX, "Estado reseteado: selectedCustomerId=null, currentSelectedCustomerObject=null.");

        // 2. Ocultar el div de cliente seleccionado y limpiar su contenido
        if (selectedCustomerDiv) {
            selectedCustomerDiv.style.display = 'none';
            console.log(CUST_DEBUG_PREFIX, "Ocultando selectedCustomerDiv.");
        } else {
            console.error(CUST_DEBUG_PREFIX, "Elemento selectedCustomerDiv no encontrado.");
        }
        if (selectedCustomerInfoSpan) {
            selectedCustomerInfoSpan.textContent = '';
            console.log(CUST_DEBUG_PREFIX, "Limpiando selectedCustomerInfoSpan.");
        } else {
            console.error(CUST_DEBUG_PREFIX, "Elemento selectedCustomerInfoSpan no encontrado.");
        }

        // 3. Mostrar el área de búsqueda de cliente y limpiar el input
        // Asumiendo que están dentro de 'pos-customer-search-area'
        const customerSearchArea = document.getElementById('pos-customer-search-area');
        if (customerSearchArea) {
             customerSearchArea.style.display = 'block'; // O 'flex' si usas flexbox directamente en el contenedor
             console.log(CUST_DEBUG_PREFIX, "Mostrando customerSearchArea.");
        } else {
             console.warn(CUST_DEBUG_PREFIX, "Elemento pos-customer-search-area no encontrado para mostrar. Mostrando elementos individuales.");
             // Fallback si el contenedor no existe o tiene otro ID
             if (customerSearchInput) customerSearchInput.style.display = 'inline-block'; // O el display original
             if (customerSearchButton) customerSearchButton.style.display = 'inline-block'; // O el display original
             if (showAddCustomerFormButton) showAddCustomerFormButton.style.display = 'inline-block'; // Mostrar también el botón '+'
        }

        if (customerSearchInput) {
            customerSearchInput.value = ''; // Limpiar el campo de búsqueda
            console.log(CUST_DEBUG_PREFIX, "Limpiando customerSearchInput.");
        } else {
            console.error(CUST_DEBUG_PREFIX, "Elemento customerSearchInput no encontrado.");
        }

        // 4. Limpiar y ocultar la lista de resultados (por si acaso)
        if (customerList) {
            customerList.innerHTML = '';
            customerList.style.display = 'none';
            console.log(CUST_DEBUG_PREFIX, "Limpiando y ocultando customerList.");
        }

        // 5. Asegurarse de que el formulario de añadir/editar cliente esté oculto
        hideCustomerForm();
        console.log(CUST_DEBUG_PREFIX, "Llamando a hideCustomerForm para asegurar que esté oculto.");

        // 6. Actualizar el estado del botón de checkout
        // (Quitar un cliente puede deshabilitar el checkout para ciertos tipos de venta)
        updateCheckoutButtonState();
        console.log(CUST_DEBUG_PREFIX, "Llamando a updateCheckoutButtonState.");

        console.log(CUST_DEBUG_PREFIX, "clearCustomerSelection completado.");
    }

    /**
     * Maneja los clics en la lista de resultados de búsqueda de clientes (ul#pos-customer-list).
     * Identifica el cliente seleccionado y llama a selectCustomer.
     * @param {Event} event El objeto del evento de clic.
     */
    function handleCustomerListClick(event) {
        console.log(CUST_DEBUG_PREFIX, "handleCustomerListClick llamado.");

        // Encontrar el elemento <li> más cercano al que se hizo clic
        const clickedLi = event.target.closest('li');

        // Asegurarse de que se hizo clic en un <li> dentro de nuestra lista de clientes
        // y que tiene el atributo data-customer-id
        if (clickedLi && customerList.contains(clickedLi) && clickedLi.dataset.customerId) {
            const customerId = clickedLi.dataset.customerId;
            console.log(CUST_DEBUG_PREFIX, `Clic detectado en LI. Customer ID: ${customerId}`);

            // Llamar a la función para seleccionar este cliente
            console.log(CUST_DEBUG_PREFIX, "Llamando a selectCustomer...");
            selectCustomer(customerId);

        } else {
            // El clic no fue en un elemento de cliente válido
            console.log(CUST_DEBUG_PREFIX, "Clic fuera de un LI de cliente válido o LI sin data-customer-id.");
        }
    }

    /**
     * Muestra el formulario para añadir o editar un cliente.
     * @param {string} mode 'add' para añadir nuevo, 'edit' para editar existente.
     * @param {object|null} customerData Objeto con los datos del cliente si mode es 'edit'.
     */
    function showCustomerForm(mode = 'add', customerData = null) {
        console.log(CUST_DEBUG_PREFIX, `Iniciando showCustomerForm en modo: ${mode}`);

        // Asegurarse de que los elementos del formulario existen
        if (!customerFormContainer || !customerFormTitle || !customerIdInput || !customerFirstNameInput || !customerLastNameInput || !customerEmailInput || !customerPhoneInput || !customerFormNotice || !customerDisplayArea) {
            console.error(CUST_DEBUG_PREFIX, "Error crítico: Faltan elementos del formulario de cliente.");
            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'error', title: 'Error Interno', text: 'No se pudo mostrar el formulario de cliente.' });
            }
            return;
        }

        // Limpiar notificaciones previas
        customerFormNotice.textContent = '';
        customerFormNotice.style.display = 'none';

        // Ocultar el área de búsqueda/display del cliente
        customerDisplayArea.style.display = 'none';
        console.log(CUST_DEBUG_PREFIX, "Ocultando customerDisplayArea.");

        if (mode === 'edit') {
            console.log(CUST_DEBUG_PREFIX, "Modo Editar.");
            if (!customerData || !customerData.id) {
                console.error(CUST_DEBUG_PREFIX, "Error: Se intentó editar sin datos de cliente válidos.", customerData);
                if (typeof Swal !== 'undefined') {
                    Swal.fire({ icon: 'error', title: 'Error', text: pos2025_pos_params.text_customer_not_found_edit || 'Error: No se encontraron los datos del cliente para editar.' });
                }
                // Volver a mostrar el área de búsqueda por si acaso
                customerDisplayArea.style.display = 'block';
                return;
            }

            // Establecer título y rellenar campos
            customerFormTitle.textContent = pos2025_pos_params.text_edit_customer_title || 'Editar Cliente';
            customerIdInput.value = customerData.id;
            customerFirstNameInput.value = customerData.first_name || '';
            customerLastNameInput.value = customerData.last_name || '';
            customerEmailInput.value = customerData.email || '';
            // WooCommerce a menudo guarda el teléfono en billing.phone
            customerPhoneInput.value = customerData.billing?.phone || customerData.phone || ''; // Usar Optional Chaining y fallback

            console.log(CUST_DEBUG_PREFIX, `Formulario rellenado para editar cliente ID: ${customerData.id}`);

        } else { // Modo 'add'
            console.log(CUST_DEBUG_PREFIX, "Modo Añadir.");
            // Establecer título y limpiar campos
            customerFormTitle.textContent = pos2025_pos_params.text_add_customer_title || 'Añadir Nuevo Cliente';
            customerIdInput.value = ''; // Asegurarse de que el ID esté vacío
            customerFirstNameInput.value = '';
            customerLastNameInput.value = '';
            customerEmailInput.value = '';
            customerPhoneInput.value = '';
            console.log(CUST_DEBUG_PREFIX, "Formulario limpiado para añadir nuevo cliente.");
        }

        // Mostrar el contenedor del formulario
        customerFormContainer.style.display = 'block';
        console.log(CUST_DEBUG_PREFIX, "Mostrando customerFormContainer.");

        // Enfocar el primer campo
        customerFirstNameInput.focus();
        console.log(CUST_DEBUG_PREFIX, "Enfocando campo de nombre.");
    }

    /**
     * Oculta el formulario de añadir/editar cliente y muestra el área de display/búsqueda.
     * Opcionalmente limpia los campos del formulario.
     */
    function hideCustomerForm() {
        console.log(CUST_DEBUG_PREFIX, "Iniciando hideCustomerForm.");

        // 1. Ocultar el contenedor del formulario
        if (customerFormContainer) {
            customerFormContainer.style.display = 'none';
            console.log(CUST_DEBUG_PREFIX, "Ocultando customerFormContainer.");
        } else {
            console.error(CUST_DEBUG_PREFIX, "Elemento customerFormContainer no encontrado.");
        }

        // 2. Mostrar el área de display/búsqueda del cliente
        // Esta área contiene tanto la info del cliente seleccionado como la búsqueda.
        // La lógica en selectCustomer/clearCustomerSelection maneja cuál de las dos partes internas se ve.
        if (customerDisplayArea) {
            customerDisplayArea.style.display = 'block'; // O el display original si era diferente
            console.log(CUST_DEBUG_PREFIX, "Mostrando customerDisplayArea.");
        } else {
            console.error(CUST_DEBUG_PREFIX, "Elemento customerDisplayArea no encontrado.");
        }

        // 3. (Opcional pero recomendado) Limpiar campos y notificaciones del formulario
        // Esto evita que datos antiguos aparezcan si se vuelve a abrir el formulario.
        if (customerFormNotice) {
            customerFormNotice.textContent = '';
            customerFormNotice.style.display = 'none';
        }
        if (customerIdInput) customerIdInput.value = '';
        if (customerFirstNameInput) customerFirstNameInput.value = '';
        if (customerLastNameInput) customerLastNameInput.value = '';
        if (customerEmailInput) customerEmailInput.value = '';
        if (customerPhoneInput) customerPhoneInput.value = '';
        console.log(CUST_DEBUG_PREFIX, "Formulario limpiado (opcional).");

        // 4. Detener el spinner de guardado si estuviera activo
        if (customerSaveSpinner) {
            customerSaveSpinner.classList.remove('is-active');
        }

        console.log(CUST_DEBUG_PREFIX, "hideCustomerForm completado.");
    }

    /**
     * Valida los campos del formulario de cliente (añadir/editar).
     * Muestra mensajes de error en el div 'pos-customer-form-notice'.
     * @returns {boolean} true si el formulario es válido, false en caso contrario.
     */
    function validateCustomerForm() {
        console.log(CUST_DEBUG_PREFIX, "Iniciando validateCustomerForm.");

        // Asegurarse de que los elementos existen
        if (!customerEmailInput || !customerFormNotice) {
            console.error(CUST_DEBUG_PREFIX, "Error crítico en validateCustomerForm: Faltan elementos del formulario (email input o notice).");
            // Mostrar un error más genérico si es posible
            if (customerFormNotice) {
                customerFormNotice.textContent = 'Error interno: No se puede validar el formulario.';
                customerFormNotice.style.display = 'block';
            } else if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'error', title: 'Error Interno', text: 'No se puede validar el formulario.' });
            }
            return false; // No se puede validar
        }

        // Limpiar notificaciones previas
        customerFormNotice.textContent = '';
        customerFormNotice.style.display = 'none';
        console.log(CUST_DEBUG_PREFIX, "Notificación de formulario limpiada.");

        // Obtener y limpiar valores (solo email es estrictamente requerido por WC)
        const email = customerEmailInput.value.trim();
        // Opcional: Obtener otros campos si quieres añadir más validaciones
        // const firstName = customerFirstNameInput.value.trim();
        // const lastName = customerLastNameInput.value.trim();

        // 1. Validar campo obligatorio: Email
        if (!email) {
            const errorMessage = pos2025_pos_params.text_fill_required_fields || 'Por favor, completa los campos requeridos (*).';
            console.warn(CUST_DEBUG_PREFIX, "Validación fallida: Email está vacío.");
            customerFormNotice.textContent = errorMessage + ' (El correo electrónico es obligatorio)';
            customerFormNotice.style.display = 'block';
            customerEmailInput.focus(); // Poner foco en el campo inválido
            return false;
        }

        // 2. Validar formato de Email usando una expresión regular simple
        // Regex estándar para emails (fuente: https://emailregex.com/)
        const emailRegex = new RegExp(
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        );
        if (!emailRegex.test(email)) {
            const errorMessage = pos2025_pos_params.text_invalid_email || 'Por favor, introduce un correo electrónico válido.';
            console.warn(CUST_DEBUG_PREFIX, "Validación fallida: Formato de email inválido.");
            customerFormNotice.textContent = errorMessage;
            customerFormNotice.style.display = 'block';
            customerEmailInput.focus(); // Poner foco en el campo inválido
            return false;
        }

        // 3. (Opcional) Añadir otras validaciones aquí si es necesario
        // Por ejemplo, longitud mínima del nombre, formato del teléfono, etc.
        // if (firstName.length < 2) { ... return false; }

        // Si todas las validaciones pasan
        console.log(CUST_DEBUG_PREFIX, "Validación del formulario de cliente exitosa.");
        return true;
    }

     /**
      * Maneja el clic en el botón "Guardar Cliente".
      * Valida el formulario, prepara los datos y llama a la API para crear o actualizar.
      */
     async function handleSaveCustomer() {
         console.log(CUST_DEBUG_PREFIX, "Iniciando handleSaveCustomer.");
 
         // 1. Validar el formulario primero
         if (!validateCustomerForm()) {
             console.warn(CUST_DEBUG_PREFIX, "Validación del formulario fallida. No se guardará.");
             // El mensaje de error ya se muestra en validateCustomerForm
             return; // Detener si la validación falla
         }
 
         // 2. Mostrar estado de carga
         if (customerSaveSpinner) customerSaveSpinner.classList.add('is-active');
         if (saveCustomerButton) saveCustomerButton.disabled = true;
         if (cancelCustomerButton) cancelCustomerButton.disabled = true;
         console.log(CUST_DEBUG_PREFIX, "Mostrando spinner y deshabilitando botones.");
 
         // 3. Recoger datos del formulario
         const customerId = customerIdInput.value;
         const firstName = customerFirstNameInput.value.trim();
         const lastName = customerLastNameInput.value.trim();
         const email = customerEmailInput.value.trim();
         const phone = customerPhoneInput.value.trim();
 
         // 4. Determinar si es creación o actualización y preparar datos/ruta
         const isUpdate = !!customerId; // True si hay un ID
         const method = isUpdate ? 'PUT' : 'POST'; // PUT para actualizar, POST para crear
         // *** ¡ATENCIÓN! Esta línea aún apunta a la API estándar de WC ***
         // *** Debería apuntar a tu API personalizada si quieres usar la lógica PHP ***
         // *** const path = isUpdate ? `/pos2025/v1/customers/${customerId}` : '/pos2025/v1/customers'; ***
         const path = isUpdate ? `/wc/v3/customers/${customerId}` : '/wc/v3/customers'; // <-- URL actual en el código
 
         // Construir el payload para la API
         const customerPayload = {
             email: email,
             first_name: firstName,
             last_name: lastName,
             billing: {
                 first_name: firstName, // Es buena práctica repetir aquí
                 last_name: lastName,
                 email: email,
                 phone: phone
             },
              // *** Contraseña hardcodeada que mencionaste que funcionó ***
              password: 'password2025'
             // generate_password: true // <-- Alternativa que no funcionó antes
         };
 
         // Quitado el bloque if(!isUpdate) porque la contraseña se añade siempre arriba
         // if (!isUpdate) {
         //     // ...
         // }
 
         console.log(CUST_DEBUG_PREFIX, `Preparado para ${isUpdate ? 'actualizar' : 'crear'} cliente.`);
         console.log(CUST_DEBUG_PREFIX, `Método: ${method}, Ruta: ${path}`); // Verifica esta ruta
         console.log(CUST_DEBUG_PREFIX, "Payload:", customerPayload); // Verifica que 'password' esté aquí
 
         // 5. Realizar la llamada API
         try {
             // *** ¡ATENCIÓN! Esta llamada va a la URL definida en 'path' ***
             const response = await wp.apiFetch({
                 path: path, // <-- Usando la URL definida arriba
                 method: method,
                 data: customerPayload,
                 // El Nonce es necesario para TU API personalizada, no para la estándar de WC
                 // Si 'path' apunta a /wc/v3/..., esta cabecera no es estrictamente necesaria
                 // Si 'path' apunta a /pos2025/v1/..., SÍ es necesaria
                 headers: {
                     'X-WP-Nonce': pos2025_pos_params.nonce
                 }
             });
 
             console.log(CUST_DEBUG_PREFIX, `Cliente ${isUpdate ? 'actualizado' : 'creado'} con éxito:`, response);
 
             // Mostrar mensaje de éxito
             if (typeof Swal !== 'undefined') {
                 // Ajustar mensaje si se usó contraseña hardcodeada
                  let successText = pos2025_pos_params.text_customer_saved || 'Cliente guardado correctamente.';
                  if (!isUpdate) { // Si fue creación
                      successText += ' Se usó una contraseña predefinida.'; // O un mensaje más claro
                  }
                 Swal.fire({
                     icon: 'success',
                     title: pos2025_pos_params.swal_success_title || '¡Éxito!',
                     text: successText,
                     timer: 2500, // Dar un poco más de tiempo
                     showConfirmButton: false
                 });
             }
 
             // 6. Actualizar estado y UI después del guardado
             if (isUpdate) {
                 if (currentSelectedCustomerObject && currentSelectedCustomerObject.id == customerId) {
                     currentSelectedCustomerObject = { ...currentSelectedCustomerObject, ...response };
                     console.log(CUST_DEBUG_PREFIX, "Objeto currentSelectedCustomerObject actualizado.");
                     selectCustomer(customerId);
                 } else {
                     hideCustomerForm();
                 }
             } else { // Es creación
                 currentCustomers.unshift(response);
                 console.log(CUST_DEBUG_PREFIX, "Nuevo cliente añadido a currentCustomers.");
                 selectCustomer(response.id);
             }
 
         } catch (error) {
             console.error(CUST_DEBUG_PREFIX, `Error al ${isUpdate ? 'actualizar' : 'crear'} cliente:`, error);
             let errorMessage = `No se pudo ${isUpdate ? 'actualizar' : 'crear'} el cliente.`;
             let errorDetails = '';
             // ... (Manejo de errores como antes, extrayendo detalles si es posible) ...
             if (error.message) { errorDetails = error.message; }
             if (error.code) {
                 if (error.code === 'woocommerce_rest_customer_email_exists' || error.code === 'registration-error-email-exists') {
                     errorMessage = 'Ya existe un cliente con ese correo electrónico.'; errorDetails = '';
                 } else { errorDetails += ` (Código: ${error.code})`; }
             }
             if (error.data && error.data.message) { if (!errorDetails) errorDetails = error.data.message; }
             if (error.data && error.data.status) {
                 errorDetails += ` (Status: ${error.data.status})`;
                 if (error.data.status === 403 || error.data.status === 401) {
                     errorMessage = 'No tienes permiso para guardar clientes.'; errorDetails = '';
                 }
                  // Capturar el error específico de contraseña faltante si aún aparece
                  if (error.data.status === 400 && error.data.code === 'rest_missing_callback_param' && error.data.data?.params?.includes('password')) {
                      errorMessage = 'El servidor sigue indicando que falta la contraseña, a pesar de enviarla.';
                  }
             }
             const fullErrorMessage = errorDetails ? `${errorMessage} ${errorDetails}` : errorMessage;
             if (customerFormNotice) { /* ... mostrar en notice ... */ }
             if (typeof Swal !== 'undefined') { /* ... mostrar Swal ... */ }
 
         } finally {
             // 7. Ocultar estado de carga (siempre)
             if (customerSaveSpinner) customerSaveSpinner.classList.remove('is-active');
             if (saveCustomerButton) saveCustomerButton.disabled = false;
             if (cancelCustomerButton) cancelCustomerButton.disabled = false;
             console.log(CUST_DEBUG_PREFIX, "Ocultando spinner y habilitando botones.");
         }
     }
 

    // =========================================================================
    // Funciones de Checkout y Pago (Con Swal)
    // =========================================================================
    /**
     * Carga las pasarelas de pago activas desde la API de WooCommerce
     * y las muestra en el select #pos-payment-gateway.
     */
    async function loadPaymentGateways() {
        const PAY_DEBUG_PREFIX = '[POS_APP_DEBUG_PAY]'; // Nuevo prefijo para logs de pago
        console.log(PAY_DEBUG_PREFIX, "Iniciando loadPaymentGateways.");

        // Verificar elementos necesarios
        if (!paymentGatewaySelect || !gatewaySpinner) {
            console.error(PAY_DEBUG_PREFIX, "Error crítico: Falta paymentGatewaySelect o gatewaySpinner.");
            if (paymentGatewaySelect) {
                paymentGatewaySelect.innerHTML = '<option value="">Error al cargar</option>';
            }
            return;
        }

        // Mostrar estado de carga
        gatewaySpinner.classList.add('is-active');
        paymentGatewaySelect.disabled = true;
        paymentGatewaySelect.innerHTML = `<option value="">${pos2025_pos_params.text_loading || 'Cargando métodos...'}</option>`;
        console.log(PAY_DEBUG_PREFIX, "Mostrando spinner y deshabilitando select.");

        try {
            // Llamar a la API estándar de WooCommerce para obtener pasarelas activas
            const path = '/wc/v3/payment_gateways?enabled=true'; // Solo obtener las habilitadas
            console.log(PAY_DEBUG_PREFIX, `Llamando a API: ${path}`);

            const gateways = await wp.apiFetch({
                path: path,
                method: 'GET',
                // No se necesita nonce explícito con wp.apiFetch y endpoints WC estándar
            });

            console.log(PAY_DEBUG_PREFIX, "Pasarelas de pago recibidas:", gateways);

            // Limpiar opciones actuales (excepto el mensaje de carga que ya está)
            paymentGatewaySelect.innerHTML = '';

            // Añadir opción por defecto
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = '-- Selecciona Método --';
            defaultOption.disabled = true; // Hacerla no seleccionable directamente
            defaultOption.selected = true; // Dejarla seleccionada por defecto
            paymentGatewaySelect.appendChild(defaultOption);

            if (Array.isArray(gateways) && gateways.length > 0) {
                console.log(PAY_DEBUG_PREFIX, `Procesando ${gateways.length} pasarelas.`);
                gateways.forEach(gateway => {
                    // Solo añadir si está habilitada (aunque ya filtramos con ?enabled=true)
                    if (gateway.enabled) {
                        const option = document.createElement('option');
                        option.value = gateway.id; // El ID de la pasarela (ej: 'bacs', 'cod', 'stripe')
                        option.textContent = gateway.title; // El título legible (ej: 'Transferencia Bancaria', 'Contra reembolso')
                        paymentGatewaySelect.appendChild(option);
                    }
                });
                paymentGatewaySelect.disabled = false; // Habilitar el select
                console.log(PAY_DEBUG_PREFIX, "Select de pasarelas poblado y habilitado.");
            } else {
                console.warn(PAY_DEBUG_PREFIX, "No se encontraron pasarelas de pago activas.");
                // Mostrar mensaje en el select si no hay pasarelas
                const noGatewaysOption = document.createElement('option');
                noGatewaysOption.value = '';
                noGatewaysOption.textContent = 'No hay métodos disponibles';
                noGatewaysOption.disabled = true;
                paymentGatewaySelect.appendChild(noGatewaysOption);
                // Mantener el select deshabilitado
            }

        } catch (error) {
            console.error(PAY_DEBUG_PREFIX, "Error al cargar las pasarelas de pago:", error);
            paymentGatewaySelect.innerHTML = ''; // Limpiar por si acaso
            const errorOption = document.createElement('option');
            errorOption.value = '';
            errorOption.textContent = 'Error al cargar métodos';
            errorOption.disabled = true;
            paymentGatewaySelect.appendChild(errorOption);
            // Mantener el select deshabilitado

            // Opcional: Mostrar error con Swal
            if (typeof Swal !== 'undefined') {
                let errorMessage = 'No se pudieron cargar los métodos de pago.';
                if (error.message) errorMessage += ` Detalles: ${error.message}`;
                if (error.code) errorMessage += ` (Código: ${error.code})`;
                if (error.data && error.data.status === 403 || error.data.status === 401) {
                    errorMessage = 'No tienes permiso para ver los métodos de pago.';
                }
                Swal.fire({ icon: 'error', title: 'Error', text: errorMessage });
            }
        } finally {
            // Ocultar estado de carga (siempre)
            if (gatewaySpinner) gatewaySpinner.classList.remove('is-active');
            console.log(PAY_DEBUG_PREFIX, "Ocultando spinner.");
            // Actualizar estado del botón de checkout, ya que depende de si hay pasarelas o se selecciona una
            updateCheckoutButtonState();
            console.log(PAY_DEBUG_PREFIX, "Llamando a updateCheckoutButtonState desde finally.");
        }
    }

    /**
     * Muestra u oculta la sección de términos de suscripción/evento
     * basándose en el tipo de venta seleccionado.
     * También actualiza el estado del botón de checkout.
     */
    function toggleSubscriptionTerms() {
        const PAY_DEBUG_PREFIX = '[POS_APP_DEBUG_PAY]'; // Reutilizamos prefijo de pago/checkout
        console.log(PAY_DEBUG_PREFIX, "Iniciando toggleSubscriptionTerms.");

        // Verificar que los elementos necesarios existen
        if (!saleTypeRadios || !subscriptionTermsDiv) {
            console.error(PAY_DEBUG_PREFIX, "Error crítico: Falta saleTypeRadios o subscriptionTermsDiv.");
            return;
        }

        // Encontrar el radio button seleccionado
        let selectedSaleType = 'direct'; // Valor por defecto si no se encuentra nada
        try {
            // Usamos Array.from para poder usar .find() en la NodeList
            const checkedRadio = Array.from(saleTypeRadios).find(radio => radio.checked);
            if (checkedRadio) {
                selectedSaleType = checkedRadio.value;
            }
        } catch (e) {
            console.error(PAY_DEBUG_PREFIX, "Error al buscar el radio button seleccionado:", e);
        }

        console.log(PAY_DEBUG_PREFIX, `Tipo de venta seleccionado: ${selectedSaleType}`);

        // Mostrar u ocultar la sección de términos de suscripción
        if (selectedSaleType === 'subscription') {
            subscriptionTermsDiv.style.display = 'block';
            console.log(PAY_DEBUG_PREFIX, "Mostrando subscriptionTermsDiv.");
            // Opcional: Poner fecha por defecto si no tiene valor
            if (subscriptionStartDateInput && !subscriptionStartDateInput.value) {
                 try {
                    subscriptionStartDateInput.valueAsDate = new Date();
                    console.log(PAY_DEBUG_PREFIX, "Estableciendo fecha de inicio por defecto.");
                 } catch (dateError) {
                     console.error(PAY_DEBUG_PREFIX, "Error al establecer fecha por defecto:", dateError);
                     // Fallback a formato YYYY-MM-DD si valueAsDate falla
                     const today = new Date();
                     const yyyy = today.getFullYear();
                     const mm = String(today.getMonth() + 1).padStart(2, '0'); // Enero es 0!
                     const dd = String(today.getDate()).padStart(2, '0');
                     subscriptionStartDateInput.value = `${yyyy}-${mm}-${dd}`;
                 }
            }
        } else {
            subscriptionTermsDiv.style.display = 'none';
            console.log(PAY_DEBUG_PREFIX, "Ocultando subscriptionTermsDiv.");
            // Opcional: Limpiar campos cuando se oculta
            // if (subscriptionTitleInput) subscriptionTitleInput.value = '';
            // if (subscriptionStartDateInput) subscriptionStartDateInput.value = '';
            // if (subscriptionColorInput) subscriptionColorInput.value = '#3a87ad'; // Reset a color por defecto
        }

        // Actualizar el estado del botón de checkout, ya que depende del tipo de venta
        // y de si los campos de suscripción (si son visibles) están completos.
        updateCheckoutButtonState();
        console.log(PAY_DEBUG_PREFIX, "Llamando a updateCheckoutButtonState desde toggleSubscriptionTerms.");
    }

    /**
     * Habilita o deshabilita el botón de checkout basándose en el estado actual:
     * - El carrito no debe estar vacío.
     * - Se debe haber seleccionado un método de pago.
     * - Si el tipo de venta es 'subscription' o 'credit', se debe haber seleccionado un cliente.
     * - Si el tipo de venta es 'subscription', los campos de título y fecha deben estar completos.
     */
    function updateCheckoutButtonState() {
        const PAY_DEBUG_PREFIX = '[POS_APP_DEBUG_PAY]';
        console.log(PAY_DEBUG_PREFIX, "Iniciando updateCheckoutButtonState.");

        if (!checkoutButton) {
            console.error(PAY_DEBUG_PREFIX, "Error crítico: Falta checkoutButton.");
            return;
        }

        let reasonsToDisable = []; // Array para guardar las razones por las que se deshabilita

        // 1. Verificar si el carrito está vacío
        if (cart.length === 0) {
            reasonsToDisable.push("Carrito vacío");
        }

        // 2. Verificar si se ha seleccionado un método de pago
        if (!paymentGatewaySelect || !paymentGatewaySelect.value) {
            reasonsToDisable.push("Método de pago no seleccionado");
        }

        // 3. Verificar si se ha seleccionado un cliente (si es necesario)
        let selectedSaleType = 'direct'; // Valor por defecto
        try {
            const checkedRadio = Array.from(saleTypeRadios).find(radio => radio.checked);
            if (checkedRadio) {
                selectedSaleType = checkedRadio.value;
            }
        } catch (e) {
            console.error(PAY_DEBUG_PREFIX, "Error al obtener tipo de venta:", e);
        }

        if ((selectedSaleType === 'subscription' || selectedSaleType === 'credit') && !selectedCustomerId) {
            reasonsToDisable.push(`Cliente no seleccionado para venta tipo '${selectedSaleType}'`);
        }

        // 4. Verificar campos de suscripción si el tipo es 'subscription'
        if (selectedSaleType === 'subscription') {
            if (!subscriptionTitleInput || !subscriptionTitleInput.value.trim()) {
                reasonsToDisable.push("Título del evento de suscripción vacío");
            }
            if (!subscriptionStartDateInput || !subscriptionStartDateInput.value) {
                reasonsToDisable.push("Fecha del evento de suscripción vacía");
            }
            // Opcional: Validar formato de fecha si es necesario, aunque type="date" ayuda
            // const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            // if (subscriptionStartDateInput && !dateRegex.test(subscriptionStartDateInput.value)) {
            //     reasonsToDisable.push("Formato de fecha de suscripción inválido");
            // }
        }

        // 5. Habilitar o deshabilitar el botón
        if (reasonsToDisable.length > 0) {
            checkoutButton.disabled = true;
            // Opcional: Añadir un tooltip con las razones
            checkoutButton.title = `No se puede completar la venta: ${reasonsToDisable.join(', ')}.`;
            console.log(PAY_DEBUG_PREFIX, `Botón Checkout DESHABILITADO. Razones: ${reasonsToDisable.join(', ')}`);
        } else {
            checkoutButton.disabled = false;
            checkoutButton.title = 'Completar Venta'; // Tooltip por defecto cuando está habilitado
            console.log(PAY_DEBUG_PREFIX, "Botón Checkout HABILITADO.");
        }
    }
    /**
     * Maneja el clic en el botón "Completar Venta".
     * Reúne toda la información necesaria (carrito, cliente, pago, tipo venta, notas)
     * y la envía a la API personalizada para crear el pedido en WooCommerce.
     * Muestra mensajes de éxito/error y resetea la interfaz.
     */
    async function handleCheckout() {
        const PAY_DEBUG_PREFIX = '[POS_APP_DEBUG_PAY]';
        console.log(PAY_DEBUG_PREFIX, "Iniciando handleCheckout.");

        // 1. Validaciones rápidas (aunque el botón debería estar deshabilitado si no son válidas)
        if (cart.length === 0) {
            console.warn(PAY_DEBUG_PREFIX, "Checkout intentado con carrito vacío.");
            if (typeof Swal !== 'undefined') Swal.fire({ icon: 'warning', title: pos2025_pos_params.swal_warning_title || 'Atención', text: pos2025_pos_params.swal_cart_empty || 'El carrito está vacío.' });
            return;
        }
        if (!paymentGatewaySelect || !paymentGatewaySelect.value) {
            console.warn(PAY_DEBUG_PREFIX, "Checkout intentado sin método de pago.");
            if (typeof Swal !== 'undefined') Swal.fire({ icon: 'warning', title: pos2025_pos_params.swal_warning_title || 'Atención', text: pos2025_pos_params.swal_select_payment || 'Por favor, selecciona un método de pago.' });
            return;
        }

        // Obtener tipo de venta seleccionado
        let selectedSaleType = 'direct';
        try {
            const checkedRadio = Array.from(saleTypeRadios).find(radio => radio.checked);
            if (checkedRadio) selectedSaleType = checkedRadio.value;
        } catch (e) { console.error(PAY_DEBUG_PREFIX, "Error al obtener tipo de venta:", e); }

        // Validar cliente si es necesario
        if ((selectedSaleType === 'subscription' || selectedSaleType === 'credit') && !selectedCustomerId) {
            console.warn(PAY_DEBUG_PREFIX, `Checkout intentado sin cliente para venta tipo ${selectedSaleType}.`);
            if (typeof Swal !== 'undefined') Swal.fire({ icon: 'warning', title: pos2025_pos_params.swal_warning_title || 'Atención', text: pos2025_pos_params.swal_select_customer_for_type?.replace('%s', selectedSaleType) || `Para ventas de tipo "${selectedSaleType}", por favor, busca y selecciona un cliente.` });
            return;
        }

        // Validar campos de suscripción si es necesario
        if (selectedSaleType === 'subscription') {
            if (!subscriptionTitleInput || !subscriptionTitleInput.value.trim()) {
                 console.warn(PAY_DEBUG_PREFIX, "Checkout intentado para suscripción sin título.");
                 if (typeof Swal !== 'undefined') Swal.fire({ icon: 'warning', title: pos2025_pos_params.swal_warning_title || 'Atención', text: pos2025_pos_params.swal_subscription_title_missing || 'Por favor, introduce un título para el evento de suscripción.' });
                 return;
            }
             if (!subscriptionStartDateInput || !subscriptionStartDateInput.value) {
                 console.warn(PAY_DEBUG_PREFIX, "Checkout intentado para suscripción sin fecha.");
                 if (typeof Swal !== 'undefined') Swal.fire({ icon: 'warning', title: pos2025_pos_params.swal_warning_title || 'Atención', text: pos2025_pos_params.swal_subscription_date_missing || 'Por favor, selecciona una fecha para el evento.' });
                 return;
            }
        }

        // 2. Mostrar estado de procesamiento
        console.log(PAY_DEBUG_PREFIX, "Validaciones pasadas. Mostrando estado de procesamiento...");
        if (checkoutButton) checkoutButton.disabled = true;
        // Usar Swal para indicar procesamiento
        Swal.fire({
            title: 'Procesando venta...',
            text: 'Por favor, espera.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        // 3. Recopilar datos para la API
        const lineItems = getCartItemsForAPI();
        const paymentMethod = paymentGatewaySelect.value;
        const customerNote = customerNoteTextarea ? customerNoteTextarea.value.trim() : '';

        const orderData = {
            payment_method: paymentMethod,
            customer_id: selectedCustomerId || 0, // Enviar 0 si no hay cliente seleccionado (invitado)
            line_items: lineItems,
            customer_note: customerNote,
            pos_sale_type: selectedSaleType, // Campo meta personalizado
            // Añadir campos meta de suscripción/evento si aplica
            ...(selectedSaleType === 'subscription' && {
                pos_calendar_event_title: subscriptionTitleInput.value.trim(),
                pos_calendar_event_date: subscriptionStartDateInput.value,
                pos_calendar_event_color: subscriptionColorInput.value || '#3a87ad' // Color por defecto
            })
        };

        console.log(PAY_DEBUG_PREFIX, "Datos del pedido preparados para enviar a la API:", orderData);

        // 4. Llamar a la API personalizada para crear el pedido
        try {
            const path = '/pos2025/v1/orders'; // Tu endpoint personalizado
            console.log(PAY_DEBUG_PREFIX, `Llamando a API: POST ${path}`);

            const response = await wp.apiFetch({
                path: path,
                method: 'POST',
                data: orderData,
                headers: {
                    'X-WP-Nonce': pos2025_pos_params.nonce // ¡Nonce es crucial para tu endpoint personalizado!
                }
            });

            console.log(PAY_DEBUG_PREFIX, "Pedido creado con éxito:", response);

            // Mostrar mensaje de éxito
            Swal.fire({
                icon: 'success',
                title: pos2025_pos_params.swal_success_title || '¡Éxito!',
                text: pos2025_pos_params.swal_order_created_message || 'Pedido creado con éxito.',
                // Opcional: Mostrar ID del pedido: text: `Pedido #${response.order_id} creado con éxito.`,
                timer: 3000, // Cierra automáticamente
                showConfirmButton: false
            });

            // 5. Resetear la interfaz después del éxito
            console.log(PAY_DEBUG_PREFIX, "Reseteando interfaz...");
            clearCartUI(); // Vacía el carrito y actualiza la UI del carrito
            clearCustomerSelection(); // Deselecciona cliente y muestra búsqueda
            // Resetear tipo de venta a 'direct'
            if (saleTypeRadios && saleTypeRadios.length > 0) {
                 const directRadio = Array.from(saleTypeRadios).find(radio => radio.value === 'direct');
                 if (directRadio) directRadio.checked = true;
            }
            toggleSubscriptionTerms(); // Ocultar campos de suscripción
            // Limpiar campos de suscripción (opcional, pero buena idea)
            if (subscriptionTitleInput) subscriptionTitleInput.value = '';
            if (subscriptionStartDateInput) subscriptionStartDateInput.valueAsDate = new Date(); // Reset a hoy
            if (subscriptionColorInput) subscriptionColorInput.value = '#3a87ad'; // Reset a color por defecto
            // Limpiar nota del cliente
            if (customerNoteTextarea) customerNoteTextarea.value = '';
            // Resetear selección de método de pago
            if (paymentGatewaySelect) paymentGatewaySelect.selectedIndex = 0; // Volver a "-- Selecciona Método --"

            // Refrescar eventos del calendario si se creó uno de suscripción
            if (selectedSaleType === 'subscription' && posCalendarInstance) {
                console.log(PAY_DEBUG_PREFIX, "Refrescando eventos del calendario...");
                posCalendarInstance.refetchEvents();
            }

            // Asegurarse de que el botón de checkout se deshabilite (ya que el carrito está vacío)
            updateCheckoutButtonState();

        } catch (error) {
            console.error(PAY_DEBUG_PREFIX, "Error al crear el pedido:", error);

            let errorMessage = 'No se pudo crear el pedido.';
            let errorDetails = '';

            // Intentar extraer mensajes de error específicos
            if (error.message) {
                errorDetails = error.message;
            }
            if (error.code) {
                // Errores comunes de la API de WC o de tu API personalizada
                if (error.code === 'woocommerce_rest_invalid_product_id' || error.code.includes('product_invalid')) {
                    errorMessage = 'Uno o más productos en el carrito son inválidos.';
                } else if (error.code.includes('stock')) {
                    errorMessage = 'Problema de stock con uno o más productos.';
                } else if (error.code.includes('payment_gateway')) {
                    errorMessage = 'Error con la pasarela de pago seleccionada.';
                } else {
                    errorDetails += ` (Código: ${error.code})`;
                }
            }
             if (error.data && error.data.message) { // Mensaje a veces en data
                 if (!errorDetails) errorDetails = error.data.message;
             }
             if (error.data && error.data.status) {
                 errorDetails += ` (Status: ${error.data.status})`;
                 if (error.data.status === 403 || error.data.status === 401) {
                     errorMessage = 'No tienes permiso para crear pedidos.';
                     errorDetails = '';
                 }
             }

            // Mostrar error con Swal
            const fullErrorMessage = errorDetails ? `${errorMessage} ${errorDetails}` : errorMessage;
            Swal.fire({
                icon: 'error',
                title: pos2025_pos_params.swal_error_title || 'Error',
                text: fullErrorMessage,
            });

        } finally {
            // 6. Ocultar estado de procesamiento (siempre)
            // Swal se cierra solo en caso de éxito (por el timer) o lo cierra el usuario en caso de error.
            // Volver a habilitar el botón de checkout (updateCheckoutButtonState lo manejará correctamente)
            if (checkoutButton) checkoutButton.disabled = false; // Habilitar temporalmente, update lo ajustará
            updateCheckoutButtonState(); // Asegurarse de que el estado final sea correcto
            console.log(PAY_DEBUG_PREFIX, "handleCheckout finalizado.");
        }
    }
  
    // =========================================================================
    // Funciones de FullCalendar
    // =========================================================================
    // =========================================================================
    // Funciones de FullCalendar
    // =========================================================================
    /**
     * Inicializa la instancia de FullCalendar en el elemento #pos-calendar.
     * Configura la carga de eventos desde la API REST de POS 2025.
     * Maneja errores de carga y clics en eventos (incluyendo creación y eliminación de personalizados).
     */
    function initializePosCalendar() {
        const CAL_DEBUG_PREFIX = '[POS_APP_DEBUG_CAL]';
        console.log(CAL_DEBUG_PREFIX, 'Attempting to initialize FullCalendar...');

        // Doble verificación de elementos y parámetros necesarios
        if (!calendarEl) {
            console.error(CAL_DEBUG_PREFIX, 'Calendar container #pos-calendar not found during initialization.');
            return; // Salir si el contenedor no existe
        }
        if (typeof pos2025_pos_params === 'undefined' || !pos2025_pos_params.rest_url || !pos2025_pos_params.nonce) {
            console.error(CAL_DEBUG_PREFIX, 'pos2025_pos_params (rest_url or nonce) is not defined during calendar initialization.');
            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'error', title: 'Error de Configuración', text: 'Faltan parámetros de la API para el calendario.' });
            }
            return; // Salir si faltan parámetros esenciales
        }
        if (typeof FullCalendar === 'undefined') {
             console.error(CAL_DEBUG_PREFIX, 'FullCalendar library is not defined during initialization.');
             return;
        }

        try {
            console.log(CAL_DEBUG_PREFIX, 'Creating FullCalendar instance...');
            // Crear y almacenar la instancia del calendario
            posCalendarInstance = new FullCalendar.Calendar(calendarEl, {
                initialView: 'dayGridMonth', // Vista inicial
                locale: pos2025_pos_params.calendar_locale || 'es', // Idioma desde parámetros o español por defecto
                headerToolbar: {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,listWeek' // Opciones de vista
                },
                events: {
                    url: pos2025_pos_params.rest_url + 'events', // URL del endpoint GET /events
                    method: 'GET', // Método HTTP
                    // FullCalendar añade automáticamente los parámetros 'start' y 'end'
                    failure: function(error) {
                        // Callback si la petición AJAX falla
                        console.error(CAL_DEBUG_PREFIX, "Error fetching FullCalendar events via AJAX:", error);
                        if (typeof Swal !== 'undefined') {
                            Swal.fire({
                                icon: 'error',
                                title: pos2025_pos_params.swal_error_title || 'Error',
                                text: pos2025_pos_params.calendar_event_fetch_error || 'Error al cargar los eventos del calendario.',
                            });
                        }
                    },
                    loading: function(isLoading) {
                        // Callback para indicar si se están cargando eventos
                        console.log(CAL_DEBUG_PREFIX, 'Calendar events loading state:', isLoading);
                        // Añadir/quitar clase CSS para mostrar spinner visual
                        if (isLoading) {
                            calendarEl.classList.add('calendar-loading');
                        } else {
                            calendarEl.classList.remove('calendar-loading');
                        }
                    }
                },
                // *** eventClick MODIFICADO para manejar detalles y eliminación ***
                eventClick: function(info) {
                    info.jsEvent.preventDefault(); // Prevenir comportamiento por defecto
                    console.log(CAL_DEBUG_PREFIX, 'Event clicked:', info.event);
                    console.log(CAL_DEBUG_PREFIX, 'Extended Props:', info.event.extendedProps);

                    // Extraer datos del evento
                    const eventId = info.event.id; // ID del evento (ej: 'order_123' o 'custom_uuid-...')
                    const eventTitle = info.event.title;
                    const eventStart = info.event.start ? info.event.start.toLocaleDateString(pos2025_pos_params.calendar_locale || 'es') : 'N/A';
                    const eventUrl = info.event.url; // URL si es un pedido

                    // Determinar si es un evento personalizado (basado en lo que devuelve tu API GET /events)
                    // Ajusta esta línea si usaste 'isCustom' en lugar de 'type' en el PHP
                    const isCustomEvent = info.event.extendedProps?.type === 'custom';

                    // Extraer propiedades extendidas (si existen)
                    const description = info.event.extendedProps?.description || '';
                    const orderId = info.event.extendedProps?.orderId;
                    const customerName = info.event.extendedProps?.customer;

                    // Construir el HTML para el popup de SweetAlert
                    let swalHtml = `
                        <div style="text-align: left; margin-top: 10px;">
                            <p><strong>Fecha:</strong> ${eventStart}</p>
                            ${customerName ? `<p><strong>Cliente:</strong> ${customerName}</p>` : ''}
                            ${orderId ? `<p><strong>Pedido ID:</strong> ${orderId}</p>` : ''}
                            ${description ? `<p><strong>Descripción:</strong><br>${description.replace(/\n/g, '<br>')}</p>` : ''}
                        </div>
                    `;

                    // Configuración base de SweetAlert
                    let swalOptions = {
                        title: eventTitle,
                        html: swalHtml,
                        icon: 'info',
                        showCloseButton: true,
                        showCancelButton: false, // No necesitamos "Cancelar" aquí inicialmente
                        // Botón de Confirmar: Mostrar "Ver Pedido" solo si hay URL (es un pedido)
                        showConfirmButton: !!eventUrl,
                        confirmButtonText: 'Ver Pedido',
                        confirmButtonAriaLabel: 'Ver Pedido',
                    };

                    // *** AÑADIR BOTÓN ELIMINAR SI ES UN EVENTO PERSONALIZADO ***
                    if (isCustomEvent) {
                        console.log(CAL_DEBUG_PREFIX, `Event ${eventId} is custom. Adding delete button.`);
                        // Usaremos el botón "Deny" de SweetAlert como nuestro botón "Eliminar"
                        swalOptions.showDenyButton = true;
                        swalOptions.denyButtonText = 'Eliminar Evento';
                        swalOptions.denyButtonColor = '#d33'; // Color rojo para indicar peligro
                    } else {
                         console.log(CAL_DEBUG_PREFIX, `Event ${eventId} is NOT custom. No delete button.`);
                    }

                    // Mostrar el popup de SweetAlert
                    Swal.fire(swalOptions).then((result) => {
                        if (result.isConfirmed && eventUrl) {
                            // Si se hace clic en "Ver Pedido"
                            console.log(CAL_DEBUG_PREFIX, `Opening event URL: ${eventUrl}`);
                            window.open(eventUrl, '_blank'); // Abrir en nueva pestaña

                        } else if (result.isDenied && isCustomEvent) {
                            // *** SI SE HACE CLIC EN "ELIMINAR EVENTO" ***
                            console.log(CAL_DEBUG_PREFIX, `Delete requested for custom event ID: ${eventId}`);

                            // Mostrar un SEGUNDO popup para CONFIRMAR la eliminación
                            Swal.fire({
                                title: '¿Estás seguro?',
                                text: `Estás a punto de eliminar el evento "${eventTitle}". Esta acción no se puede deshacer.`,
                                icon: 'warning',
                                showCancelButton: true,
                                confirmButtonColor: '#d33', // Rojo para confirmar eliminación
                                cancelButtonColor: '#3085d6', // Azul para cancelar
                                confirmButtonText: 'Sí, eliminarlo',
                                cancelButtonText: 'Cancelar'
                            }).then((deleteResult) => {
                                // Si el usuario confirma la eliminación en el segundo popup
                                if (deleteResult.isConfirmed) {
                                    console.log(CAL_DEBUG_PREFIX, `Confirmed deletion for event ID: ${eventId}`);

                                    // Mostrar estado de carga mientras se elimina
                                    Swal.fire({
                                        title: 'Eliminando...',
                                        text: 'Por favor, espera.',
                                        allowOutsideClick: false,
                                        didOpen: () => { Swal.showLoading(); }
                                    });

                                    // Construir la ruta para la API DELETE
                                    // Usa el endpoint que creaste: /events/custom/{id}
                                    const deletePath = `/pos2025/v1/events/custom/${eventId}`;
                                    console.log(CAL_DEBUG_PREFIX, `Calling API: DELETE ${deletePath}`);

                                    // Realizar la llamada API para eliminar
                                    wp.apiFetch({
                                        path: deletePath,
                                        method: 'DELETE',
                                        headers: {
                                            // ¡¡MUY IMPORTANTE incluir el Nonce para tu API personalizada!!
                                            'X-WP-Nonce': pos2025_pos_params.nonce
                                        }
                                    })
                                    .then(response => {
                                        // Éxito al eliminar
                                        console.log(CAL_DEBUG_PREFIX, 'Event deleted successfully:', response);
                                        Swal.fire({
                                            icon: 'success',
                                            title: '¡Eliminado!',
                                            text: response.message || 'El evento personalizado ha sido eliminado.',
                                            timer: 2000, // Cerrar automáticamente
                                            showConfirmButton: false
                                        });

                                        // *** ¡CRUCIAL! Refrescar el calendario para quitar el evento visualmente ***
                                        if (posCalendarInstance) {
                                            console.log(CAL_DEBUG_PREFIX, 'Refetching calendar events after deletion.');
                                            posCalendarInstance.refetchEvents();
                                        }
                                    })
                                    .catch(error => {
                                        // Error al eliminar
                                        console.error(CAL_DEBUG_PREFIX, 'Error deleting custom event:', error);
                                        let errorMessage = 'No se pudo eliminar el evento.';
                                        // Intentar obtener más detalles del error
                                        if (error.message) errorMessage += ` Detalles: ${error.message}`;
                                        if (error.code) errorMessage += ` (Código: ${error.code})`;
                                        if (error.data?.status) errorMessage += ` (Status: ${error.data.status})`;

                                        Swal.fire({
                                            icon: 'error',
                                            title: pos2025_pos_params.swal_error_title || 'Error',
                                            text: errorMessage,
                                        });
                                    });
                                } else {
                                     // El usuario canceló la confirmación de eliminación
                                     console.log(CAL_DEBUG_PREFIX, 'Deletion cancelled by user.');
                                }
                            }); // Fin del .then() del popup de confirmación
                        } // Fin del else if (result.isDenied)
                    }); // Fin del .then() del popup inicial de detalles
                }, // Fin de eventClick

                // --- Tu callback dateClick para AÑADIR eventos permanece igual ---
                dateClick: function(info) {
                    console.log(CAL_DEBUG_PREFIX, 'Date clicked:', info.dateStr);
                    // Usar SweetAlert2 para mostrar el formulario de nuevo evento
                    Swal.fire({
                        title: 'Añadir Evento Personalizado',
                        html: `
                            <p><strong>Fecha:</strong> ${info.dateStr}</p>
                            <input type="text" id="swal-event-title" class="swal2-input" placeholder="Título del evento *" required>
                            <textarea id="swal-event-description" class="swal2-textarea" placeholder="Descripción (opcional)"></textarea>
                            <label for="swal-event-color" style="display: block; margin-top: 10px;">Color:</label>
                            <input type="color" id="swal-event-color" value="#54a0ff" style="padding: 2px; height: 30px; width: 50px;">
                        `,
                        confirmButtonText: 'Guardar Evento',
                        showCancelButton: true,
                        cancelButtonText: 'Cancelar',
                        focusConfirm: false,
                        didOpen: () => {
                            // Enfocar el campo de título al abrir
                            const titleInput = Swal.getPopup().querySelector('#swal-event-title');
                            if (titleInput) titleInput.focus();
                        },
                        preConfirm: () => {
                            // Recoger y validar datos antes de enviar
                            const title = Swal.getPopup().querySelector('#swal-event-title').value;
                            const description = Swal.getPopup().querySelector('#swal-event-description').value;
                            const color = Swal.getPopup().querySelector('#swal-event-color').value;

                            if (!title) {
                                Swal.showValidationMessage(`Por favor, introduce un título para el evento.`);
                                return false; // Detiene el proceso si falta el título
                            }
                            return {
                                title: title,
                                start: info.dateStr, // La fecha en la que se hizo clic
                                description: description,
                                color: color,
                                allDay: true // Asumimos eventos de día completo por simplicidad
                            };
                        }
                    }).then((result) => {
                        if (result.isConfirmed && result.value) {
                            // Si el usuario confirma y los datos son válidos
                            const newEventData = result.value;
                            console.log(CAL_DEBUG_PREFIX, 'Attempting to save custom event:', newEventData);

                            // Mostrar spinner de guardado
                            Swal.fire({
                                title: 'Guardando evento...',
                                allowOutsideClick: false,
                                didOpen: () => {
                                    Swal.showLoading();
                                }
                            });

                            // Llamada a la API para guardar el evento personalizado
                            wp.apiFetch({
                                path: '/pos2025/v1/events/custom', // Ruta API POST
                                method: 'POST',
                                data: newEventData,
                                headers: {
                                    'X-WP-Nonce': pos2025_pos_params.nonce // Incluir nonce para seguridad
                                }
                            })
                            .then(response => {
                                console.log(CAL_DEBUG_PREFIX, 'Custom event saved successfully:', response);
                                Swal.fire({
                                    icon: 'success',
                                    title: '¡Evento Guardado!',
                                    text: 'El evento personalizado ha sido añadido al calendario.',
                                    timer: 2000, // Cierra automáticamente después de 2 segundos
                                    showConfirmButton: false
                                });
                                // Refrescar los eventos del calendario para mostrar el nuevo
                                if (posCalendarInstance) {
                                    console.log(CAL_DEBUG_PREFIX, 'Refetching calendar events after creation.');
                                    posCalendarInstance.refetchEvents();
                                }
                            })
                            .catch(error => {
                                console.error(CAL_DEBUG_PREFIX, 'Error saving custom event:', error);
                                let errorMessage = 'No se pudo guardar el evento.';
                                if (error.message) {
                                    errorMessage += ` Detalles: ${error.message}`;
                                }
                                Swal.fire({
                                    icon: 'error',
                                    title: pos2025_pos_params.swal_error_title || 'Error',
                                    text: errorMessage,
                                });
                            });
                        }
                    });
                }, // Fin de dateClick

                // Otras opciones útiles (opcional)
                editable: false, // No permitir arrastrar/redimensionar eventos
                selectable: false, // No permitir seleccionar rangos de fechas
                dayMaxEvents: true, // Agrupar eventos si hay muchos en un día (+ more link)

            }); // Fin de la configuración de FullCalendar

            console.log(CAL_DEBUG_PREFIX, 'Rendering calendar...');
            posCalendarInstance.render(); // Renderizar el calendario
            console.log(CAL_DEBUG_PREFIX, 'FullCalendar initialized and rendered successfully.');

        } catch (error) {
            // Capturar errores durante la inicialización de FullCalendar
            console.error(CAL_DEBUG_PREFIX, 'Error initializing FullCalendar instance:', error);
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'error',
                    title: 'Error Crítico del Calendario',
                    text: 'No se pudo inicializar el calendario. Contacta al administrador. Detalles: ' + error.message,
                });
            }
            // Opcional: Ocultar o mostrar un mensaje de error en el div del calendario
            if (calendarEl) {
                calendarEl.innerHTML = '<p style="color: red;">Error al cargar el calendario.</p>';
            }
        }
    } // Fin de initializePosCalendar

    // =========================================================================
    // Event Listeners (Configuración Inicial)
    // =========================================================================
    if (searchButton) { searchButton.addEventListener('click', () => { console.log(PROD_DEBUG_PREFIX, "Clic en botón Buscar."); searchProducts(searchInput.value, 1, false); }); }
    if (searchInput) { searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { console.log(PROD_DEBUG_PREFIX, "Enter presionado."); e.preventDefault(); searchProducts(searchInput.value, 1, false); } }); }
    if (resultsList) resultsList.addEventListener('click', handleAddProductClick); // Ahora debería funcionar
    if (customerSearchButton) customerSearchButton.addEventListener('click', () => searchCustomers(customerSearchInput.value));
    if (customerSearchInput) customerSearchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); searchCustomers(customerSearchInput.value); } });
    if (customerList) customerList.addEventListener('click', handleCustomerListClick);
    if (clearCustomerButton) clearCustomerButton.addEventListener('click', clearCustomerSelection);
    if (showAddCustomerFormButton) showAddCustomerFormButton.addEventListener('click', () => showCustomerForm('add'));
    if (editCustomerButton) editCustomerButton.addEventListener('click', () => { if (currentSelectedCustomerObject) { showCustomerForm('edit', currentSelectedCustomerObject); } else { /* Swal error */ } });
    if (saveCustomerButton) saveCustomerButton.addEventListener('click', handleSaveCustomer);
    if (cancelCustomerButton) cancelCustomerButton.addEventListener('click', () => { hideCustomerForm(); });

  if (cartItemsList) {
        cartItemsList.addEventListener('click', handleCartActions); // Para botones +, -, x, reset
        cartItemsList.addEventListener('change', handleQuantityInputChange); // Para input de cantidad
        // *** NUEVO: Listener para cambios en inputs de precio ***
        cartItemsList.addEventListener('change', handlePriceInputChange);
        // *** FIN NUEVO ***
    }

    if (saleTypeRadios) saleTypeRadios.forEach(radio => radio.addEventListener('change', toggleSubscriptionTerms));
    if (paymentGatewaySelect) paymentGatewaySelect.addEventListener('change', updateCheckoutButtonState);
    if (checkoutButton) checkoutButton.addEventListener('click', handleCheckout);

    // =========================================================================
    // Inicialización al Cargar la Página
    // =========================================================================
    console.log("Iniciando carga de datos iniciales...");
    loadPaymentGateways();
    displayCart();
    toggleSubscriptionTerms();
    clearCustomerSelection();
    hideCustomerForm();
    initializePosCalendar();
    loadInitialProducts();

    if (subscriptionStartDateInput) subscriptionStartDateInput.valueAsDate = new Date();
    if (customerNoteTextarea) customerNoteTextarea.value = '';

    console.log('POS App Initialized.');

});

/** Función global para formatear precios */
function wc_price(price) {
    try {
        if (typeof pos2025_pos_params !== 'undefined') {
            const decimals = parseInt(pos2025_pos_params.price_decimals || 2, 10);
            const decimalSep = pos2025_pos_params.decimal_sep || '.';
            const thousandSep = pos2025_pos_params.thousand_sep || ',';
            const currencySymbol = pos2025_pos_params.currency_symbol || '$';
            const format = pos2025_pos_params.price_format || '%1$s%2$s';
            let number = parseFloat(price);
            if (isNaN(number)) { number = 0; }
            let formattedPrice = number.toFixed(decimals);
            let parts = formattedPrice.split('.');
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandSep);
            formattedPrice = parts.join(decimalSep);
            return format.replace('%1$s', currencySymbol).replace('%2$s', formattedPrice);
        }
    } catch (e) { console.error("Error in wc_price formatting:", e, "Input price:", price); }
    const fallbackPrice = parseFloat(price);
    return '$' + (isNaN(fallbackPrice) ? '0.00' : fallbackPrice.toFixed(2));
}
