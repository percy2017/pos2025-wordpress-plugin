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
        return cart.map(item => ({
            product_id: item.productId,
            variation_id: item.variationId || 0,
            quantity: item.quantity,
        }));
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
        if (existingItemIndex > -1) {
            console.log(PROD_DEBUG_PREFIX, `Item ${cartItemId} ya existe, incrementando cantidad.`);
            cart[existingItemIndex].quantity += productData.quantity;
        } else {
             console.log(PROD_DEBUG_PREFIX, `Añadiendo nuevo item ${cartItemId} al carrito.`);
            cart.push({
                cartItemId: cartItemId, productId: productData.id, variationId: productData.variation_id || null,
                name: productData.name, variationName: productData.variation_name || '', price: productData.price,
                quantity: productData.quantity, sku: productData.sku, image_url: productData.image_url,
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
        cartItemsList.innerHTML = '';
        if (cart.length === 0) {
            console.log(PROD_DEBUG_PREFIX, "Carrito vacío, mostrando mensaje.");
            cartItemsList.innerHTML = pos2025_pos_params.text_cart_empty || '<li>El carrito está vacío.</li>';
        } else {
             console.log(PROD_DEBUG_PREFIX, `Mostrando ${cart.length} items en el carrito.`);
            cart.forEach((item, index) => {
                const listItem = document.createElement('li');
                listItem.dataset.cartIndex = index;
                const itemPriceFormatted = wc_price(item.price);
                const subtotalFormatted = wc_price(item.price * item.quantity);
                listItem.innerHTML = `
                    <span class="item-name">${item.name} ${item.variationName ? `(${item.variationName})` : ''}</span>
                    <span class="item-qty">
                        <button class="button-qty decrease-qty" data-index="${index}" title="Disminuir cantidad">-</button>
                        <input type="number" class="item-quantity-input" value="${item.quantity}" min="1" data-index="${index}" style="width: 50px; text-align: center;" aria-label="Cantidad">
                        <button class="button-qty increase-qty" data-index="${index}" title="Aumentar cantidad">+</button>
                    </span>
                    <span class="item-price">@ ${itemPriceFormatted}</span>
                    <span class="item-subtotal">= ${subtotalFormatted}</span>
                    <button class="remove-item" data-index="${index}" style="color: red; background: none; border: none; cursor: pointer; float: right; font-size: 1.2em;" title="Eliminar item">&times;</button>
                `;
                cartItemsList.appendChild(listItem);
            });
        }
        const total = calculateTotal();
        const totalFormatted = wc_price(total);
        cartTotalAmount.textContent = totalFormatted;
        console.log(PROD_DEBUG_PREFIX, `Total del carrito mostrado: ${totalFormatted}`);
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

    /** Maneja clics en botones del carrito */
    function handleCartActions(event) {
        const target = event.target;
        const index = target.dataset.index;
        if (index === undefined) return;
        const cartIndex = parseInt(index, 10);
        if (isNaN(cartIndex) || cartIndex < 0 || cartIndex >= cart.length) { console.warn(PROD_DEBUG_PREFIX, `Índice inválido ${index} en handleCartActions.`); return; }
        if (target.classList.contains('decrease-qty')) { console.log(PROD_DEBUG_PREFIX, `Clic en '-' para índice ${cartIndex}`); updateQuantity(cartIndex, cart[cartIndex].quantity - 1); }
        else if (target.classList.contains('increase-qty')) { console.log(PROD_DEBUG_PREFIX, `Clic en '+' para índice ${cartIndex}`); updateQuantity(cartIndex, cart[cartIndex].quantity + 1); }
        else if (target.classList.contains('remove-item')) { console.log(PROD_DEBUG_PREFIX, `Clic en 'x' para índice ${cartIndex}`); updateQuantity(cartIndex, 0); }
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

    // *** FIN: FUNCIONES RESTAURADAS ***

    // =========================================================================
    // Funciones de Gestión de Clientes (Con Swal)
    // =========================================================================
    async function searchCustomers(searchTerm = '', page = 1) { /* ... (código completo como antes) ... */ }
    function displayCustomerResults(customers) { /* ... (código completo como antes) ... */ }
    function selectCustomer(customerId) { /* ... (código completo como antes) ... */ }
    function clearCustomerSelection() { /* ... (código completo como antes) ... */ }
    function handleCustomerListClick(event) { /* ... (código completo como antes) ... */ }
    function showCustomerForm(mode = 'add', customerData = null) { /* ... (código completo como antes) ... */ }
    function hideCustomerForm() { /* ... (código completo como antes) ... */ }
    function validateCustomerForm() { /* ... (código completo como antes) ... */ }
    async function handleSaveCustomer() { /* ... (código completo como antes) ... */ }

    // =========================================================================
    // Funciones de Checkout y Pago (Con Swal)
    // =========================================================================
    async function loadPaymentGateways() { /* ... (código completo como antes) ... */ }
    function toggleSubscriptionTerms() { /* ... (código completo como antes) ... */ }
    function updateCheckoutButtonState() { /* ... (código completo como antes) ... */ }
    async function handleCheckout() { /* ... (código completo como antes, incluyendo refresh de calendario) ... */ }

    // =========================================================================
    // Funciones de FullCalendar
    // =========================================================================
      // =========================================================================
    // Funciones de FullCalendar
    // =========================================================================
    /**
     * Inicializa la instancia de FullCalendar en el elemento #pos-calendar.
     * Configura la carga de eventos desde la API REST de POS 2025.
     * Maneja errores de carga y clics en eventos.
     */
    function initializePosCalendar() {
        const CAL_DEBUG_PREFIX = '[POS_APP_DEBUG_CAL]';
        console.log(CAL_DEBUG_PREFIX, 'Attempting to initialize FullCalendar...');

        // Doble verificación de elementos y parámetros necesarios
        if (!calendarEl) {
            console.error(CAL_DEBUG_PREFIX, 'Calendar container #pos-calendar not found during initialization.');
            return; // Salir si el contenedor no existe
        }
        if (typeof pos2025_pos_params === 'undefined' || !pos2025_pos_params.rest_url) {
            console.error(CAL_DEBUG_PREFIX, 'pos2025_pos_params or rest_url is not defined during calendar initialization.');
            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'error', title: 'Error de Configuración', text: 'Falta la URL de la API para el calendario.' });
            }
            return; // Salir si faltan parámetros esenciales
        }
        if (typeof FullCalendar === 'undefined') {
             console.error(CAL_DEBUG_PREFIX, 'FullCalendar library is not defined during initialization.');
             // La verificación global ya debería haber detenido esto, pero es una salvaguarda.
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
                    url: pos2025_pos_params.rest_url + 'events', // URL del endpoint de la API
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
                        // Aquí podrías añadir/quitar una clase CSS al calendario para mostrar un spinner visual
                        if (isLoading) {
                            calendarEl.classList.add('calendar-loading');
                        } else {
                            calendarEl.classList.remove('calendar-loading');
                        }
                    }
                },
                eventClick: function(info) {
                    // Callback cuando se hace clic en un evento
                    info.jsEvent.preventDefault(); // Prevenir comportamiento por defecto (si el evento tiene URL propia)
                    console.log(CAL_DEBUG_PREFIX, 'Event clicked:', info.event);
                    if (info.event.url) {
                        console.log(CAL_DEBUG_PREFIX, `Opening event URL in new tab: ${info.event.url}`);
                        window.open(info.event.url, '_blank'); // Abrir la URL del pedido en una nueva pestaña
                    } else {
                        console.log(CAL_DEBUG_PREFIX, 'Clicked event does not have a URL.');
                        // Opcional: Mostrar detalles del evento con Swal si no hay URL
                        if (typeof Swal !== 'undefined') {
                             Swal.fire({
                                 title: info.event.title,
                                 html: `<b>Fecha:</b> ${info.event.start.toLocaleDateString()}<br>` +
                                       (info.event.extendedProps.customer ? `<b>Cliente:</b> ${info.event.extendedProps.customer}<br>` : '') +
                                       (info.event.extendedProps.orderId ? `<b>Pedido ID:</b> ${info.event.extendedProps.orderId}` : ''),
                                 icon: 'info'
                             });
                        }
                    }
                },
                // Otras opciones útiles (opcional)
                editable: false, // No permitir arrastrar/redimensionar eventos
                selectable: false, // No permitir seleccionar rangos de fechas
                dayMaxEvents: true, // Agrupar eventos si hay muchos en un día (+ more link)
                // eventDidMount: function(info) {
                //     // Útil para añadir tooltips personalizados si lo necesitas
                //     console.log(CAL_DEBUG_PREFIX, 'Event did mount:', info.event.title);
                // }

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
            calendarEl.innerHTML = '<p style="color: red;">Error al cargar el calendario.</p>';
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
    if (cartItemsList) { cartItemsList.addEventListener('click', handleCartActions); cartItemsList.addEventListener('change', handleQuantityInputChange); }
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

}); // Fin de DOMContentLoaded

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
