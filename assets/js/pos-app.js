// wp-content/plugins/pos2025/assets/js/pos-app.js
/**
 * Lógica principal de la interfaz del TPV (POS 2025).
 * Maneja la búsqueda de productos, gestión de clientes (búsqueda/selección/creación/edición),
 * el carrito, los tipos de venta, los métodos de pago y el proceso de checkout.
 * Utiliza SweetAlert2 para notificaciones.
 * Carga productos destacados al inicio.
 *
 * @version 1.4.0
 */

document.addEventListener('DOMContentLoaded', function() {
    'use strict'; // Usar modo estricto para mejor calidad de código.

    // Prefijo para logs de debug específicos de cliente
    const CUST_DEBUG_PREFIX = '[POS_APP_DEBUG_CUST]';

    console.log('POS App Script Loaded and DOM Ready!');
    // Verificar que los parámetros localizados desde PHP están disponibles.
    if (typeof pos2025_pos_params === 'undefined') {
        console.error('Error Crítico: pos2025_pos_params no está definido. Asegúrate de que wp_localize_script se usa correctamente.');
        // Mostrar error al usuario si SweetAlert está disponible (puede que no si el error es en PHP)
        if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'error', title: 'Error Crítico', text: 'Faltan parámetros de configuración. Contacta al administrador.' });
        } else {
            alert('Error Crítico: Faltan parámetros de configuración. Contacta al administrador.'); // Fallback a alert nativo
        }
        return; // Detener si faltan parámetros esenciales.
    }
    // Verificar si SweetAlert está cargado
    if (typeof Swal === 'undefined') {
         console.error('Error Crítico: SweetAlert2 (Swal) no está definido. Verifica el encolado del script.');
         // Mostrar alert nativo como fallback
         alert('Error Crítico: Falta una librería esencial (SweetAlert2). La interfaz puede no funcionar correctamente.');
         // No detenemos la ejecución necesariamente, pero las alertas serán nativas o fallarán.
    }

    console.log('API Params:', pos2025_pos_params);

    // =========================================================================
    // Referencias a Elementos del DOM
    // =========================================================================
    // Guardar referencias a elementos HTML usados frecuentemente para evitar búsquedas repetidas.

    // --- Sección Búsqueda de Productos ---
    const searchInput = document.getElementById('pos-product-search');
    const searchButton = document.getElementById('pos-search-button');
    const resultsList = document.getElementById('pos-products-list');
    const productSearchSpinner = document.querySelector('#pos-search-section .spinner');
    const paginationContainer = document.getElementById('pos-pagination');

    // --- Sección Cliente ---
    const customerSearchInput = document.getElementById('pos-customer-search');
    const customerSearchButton = document.getElementById('pos-customer-search-button');
    const customerSpinner = document.getElementById('pos-customer-spinner');
    const customerList = document.getElementById('pos-customer-list');
    const selectedCustomerDiv = document.getElementById('pos-selected-customer');
    const selectedCustomerInfoSpan = document.getElementById('selected-customer-info');
    const clearCustomerButton = document.getElementById('clear-customer-button');
    const customerDisplayArea = document.getElementById('pos-customer-display-area'); // Contenedor búsqueda/seleccionado

    // --- Formulario Cliente ---
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

    // --- Sección Carrito ---
    const cartItemsList = document.getElementById('pos-cart-items');
    const cartTotalAmount = document.getElementById('cart-total-amount');

    // --- Sección Checkout ---
    const checkoutButton = document.getElementById('pos-checkout-button');
    const paymentGatewaySelect = document.getElementById('pos-payment-gateway');
    const gatewaySpinner = document.getElementById('pos-gateway-spinner');
    const saleTypeRadios = document.querySelectorAll('input[name="pos_sale_type"]');
    const customerNoteTextarea = document.getElementById('pos-customer-note');

    // --- Sección Términos de Suscripción (Calendario) ---
    const subscriptionTermsDiv = document.getElementById('pos-subscription-terms');
    const subscriptionTitleInput = document.getElementById('pos_subscription_title');
    const subscriptionStartDateInput = document.getElementById('pos_subscription_start_date');
    const subscriptionColorInput = document.getElementById('pos_subscription_color');

    // --- Verificación de Elementos Esenciales ---
    // Comprobar si todos los elementos necesarios existen en el DOM.
    const essentialElements = [
        searchInput, searchButton, resultsList, productSearchSpinner, // Productos
        customerSearchInput, customerSearchButton, customerSpinner, customerList, // Cliente (Búsqueda)
        selectedCustomerDiv, selectedCustomerInfoSpan, clearCustomerButton, customerDisplayArea, // Cliente (Selección/Display)
        customerFormContainer, showAddCustomerFormButton, editCustomerButton, saveCustomerButton, cancelCustomerButton, // Cliente (Formulario Btns)
        customerFormTitle, customerIdInput, customerFirstNameInput, customerLastNameInput, customerEmailInput, customerPhoneInput, // Cliente (Formulario Inputs)
        customerSaveSpinner, customerFormNotice, // Cliente (Formulario Feedback)
        cartItemsList, cartTotalAmount, // Carrito
        checkoutButton, paymentGatewaySelect, gatewaySpinner, saleTypeRadios, customerNoteTextarea, // Checkout
        subscriptionTermsDiv, subscriptionTitleInput, subscriptionStartDateInput, subscriptionColorInput // Suscripción
    ];

    if (essentialElements.some(el => !el)) {
        console.error('Error Crítico: No se encontraron algunos elementos esenciales del DOM para el POS. Verifica los IDs en pos-page.php.');
        // Loguear qué elementos faltan
        const missingIds = [
            !searchInput && 'pos-product-search', !searchButton && 'pos-search-button', !resultsList && 'pos-products-list', !productSearchSpinner && '#pos-search-section .spinner',
            !customerSearchInput && 'pos-customer-search', !customerSearchButton && 'pos-customer-search-button', !customerSpinner && 'pos-customer-spinner', !customerList && 'pos-customer-list',
            !selectedCustomerDiv && 'pos-selected-customer', !selectedCustomerInfoSpan && 'selected-customer-info', !clearCustomerButton && 'clear-customer-button', !customerDisplayArea && 'pos-customer-display-area',
            !customerFormContainer && 'pos-customer-form-container', !showAddCustomerFormButton && 'pos-show-add-customer-form', !editCustomerButton && 'pos-edit-customer-button', !saveCustomerButton && 'pos-save-customer-button', !cancelCustomerButton && 'pos-cancel-customer-button',
            !customerFormTitle && 'pos-customer-form-title', !customerIdInput && 'pos-customer-id', !customerFirstNameInput && 'pos-customer-firstname', !customerLastNameInput && 'pos-customer-lastname', !customerEmailInput && 'pos-customer-email', !customerPhoneInput && 'pos-customer-phone',
            !customerSaveSpinner && 'pos-customer-save-spinner', !customerFormNotice && 'pos-customer-form-notice',
            !cartItemsList && 'pos-cart-items', !cartTotalAmount && 'cart-total-amount',
            !checkoutButton && 'pos-checkout-button', !paymentGatewaySelect && 'pos-payment-gateway', !gatewaySpinner && 'pos-gateway-spinner', !saleTypeRadios && 'input[name="pos_sale_type"]', !customerNoteTextarea && 'pos-customer-note',
            !subscriptionTermsDiv && 'pos-subscription-terms', !subscriptionTitleInput && 'pos_subscription_title', !subscriptionStartDateInput && 'pos_subscription_start_date', !subscriptionColorInput && 'pos_subscription_color'
        ].filter(Boolean); // Filtrar los que no faltan (false)
        console.error('Elementos faltantes:', missingIds.join(', '));
        // Usar Swal si está disponible, si no, alert nativo
        const errorMsg = 'Faltan elementos de la interfaz. Contacta al administrador.';
        if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'error', title: 'Error Crítico', text: errorMsg });
        } else {
            alert(`Error Crítico: ${errorMsg}`);
        }
        return; // Detener la ejecución si falta algo fundamental.
    }

    // =========================================================================
    // Variables de Estado
    // =========================================================================
    // Almacenar el estado de la aplicación.

    let cart = []; // Array para almacenar los ítems del carrito [{ cartItemId, productId, variationId, name, variationName, price, quantity, sku, image_url }, ...]
    let currentProducts = []; // Almacena los resultados de la última búsqueda de productos [{ id, name, sku, price, ... }, ...]
    let currentCustomers = []; // Almacena los resultados de la última búsqueda de clientes
    let selectedCustomerId = null; // ID del cliente actualmente seleccionado
    let currentSelectedCustomerObject = null; // Objeto completo del cliente seleccionado (para editar)

    // =========================================================================
    // Funciones Auxiliares y de Lógica (Productos y Carrito)
    // =========================================================================

    /**
     * Formatea los items del carrito para ser enviados a la API de creación de pedidos.
     * @returns {Array<Object>} Array de objetos con product_id, variation_id y quantity.
     */
    function getCartItemsForAPI() {
        return cart.map(item => ({
            product_id: item.productId,
            variation_id: item.variationId || 0, // Enviar 0 si no es una variación.
            quantity: item.quantity,
        }));
    }

    /**
     * Vacía el estado del carrito y actualiza la interfaz de usuario.
     */
    function clearCartUI() {
        cart = []; // Vaciar el array de estado.
        displayCart(); // Redibujar el carrito (mostrará "vacío").
        console.log('Carrito limpiado.');
    }

    /**
     * Realiza una búsqueda de productos llamando a la API REST.
     * @param {string} [searchTerm=''] - Término de búsqueda introducido por el usuario.
     * @param {number} [page=1] - Número de página para paginación (actualmente no implementada en UI).
     */
    async function searchProducts(searchTerm = '', page = 1) {
        console.log(`Buscando productos: "${searchTerm}", Página: ${page}`);
        productSearchSpinner.classList.add('is-active'); // Mostrar spinner.
        resultsList.innerHTML = `<li>${pos2025_pos_params.text_loading || 'Buscando...'}</li>`; // Mensaje de carga.

        const apiRoute = '/pos2025/v1/products';
        // Construir parámetros de consulta para la API.
        const queryParams = new URLSearchParams({ per_page: 10, page: page });
        const trimmedSearch = searchTerm.trim();
        if (trimmedSearch) {
            queryParams.set('search', trimmedSearch);
        }
        const fullPath = `${apiRoute}?${queryParams.toString()}`;

        try {
            // Realizar la petición GET a la API.
            const response = await wp.apiFetch({ path: fullPath, method: 'GET' });
            currentProducts = response; // Guardar los resultados en el estado.
            displayResults(currentProducts); // Mostrar los resultados en la UI.
        } catch (error) {
            console.error('Error al buscar productos:', error);
            // Mostrar mensaje de error en la lista de resultados.
            let errorMessage = 'Error al buscar productos.';
            if (error.message) errorMessage += ` Detalles: ${error.message}`;
            if (error.code) errorMessage += ` (Código: ${error.code})`;
            resultsList.innerHTML = `<li class="error-message">${errorMessage}</li>`;
            // Mostrar SweetAlert de error
            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'error', title: pos2025_pos_params.swal_error_title || 'Error', text: errorMessage });
            }
        } finally {
            productSearchSpinner.classList.remove('is-active'); // Ocultar spinner.
        }
    }

    /**
     * Muestra los resultados de la búsqueda de productos en la lista HTML.
     * @param {Array<Object>} products - Array de objetos de producto recibidos de la API.
     */
    function displayResults(products) {
        resultsList.innerHTML = ''; // Limpiar resultados anteriores.

        if (!products || products.length === 0) {
            resultsList.innerHTML = '<li>No se encontraron productos.</li>';
            return;
        }

        // Crear un elemento <li> por cada producto.
        products.forEach(product => {
            const listItem = document.createElement('li');
            listItem.dataset.productId = product.id; // Guardar ID del producto en el elemento.

            let variationsHtml = '';
            // Si es un producto variable con variaciones, generar HTML para ellas.
            if (product.type === 'variable' && product.variations && product.variations.length > 0) {
                variationsHtml = '<ul class="product-variations">';
                product.variations.forEach(variation => {
                    variationsHtml += `
                        <li data-variation-id="${variation.variation_id}">
                            <span class="variation-name">${variation.variation_name || 'Variación'} (SKU: ${variation.sku || 'N/A'})</span> -
                            <span class="variation-price">${variation.price_html || variation.price}</span> -
                            <span class="variation-stock ${variation.stock_status}">${variation.stock_status === 'instock' ? (variation.stock_quantity !== null ? `Stock: ${variation.stock_quantity}` : 'En stock') : 'Agotado'}</span>
                            <span class="variation-actions">
                                <button class="button button-small add-variation-to-cart" data-variation-id="${variation.variation_id}" ${variation.stock_status !== 'instock' ? 'disabled' : ''}>Añadir</button>
                            </span>
                        </li>`;
                });
                variationsHtml += '</ul>';
            }

            // Construir el HTML interno del <li> del producto.
            listItem.innerHTML = `
                <img src="${product.image_url || ''}" alt="${product.name}" width="50" height="50" style="vertical-align: middle; margin-right: 10px;">
                <div class="product-info" style="display: inline-block; vertical-align: middle;">
                    <strong>${product.name}</strong><br>
                    <span>SKU: ${product.sku || 'N/A'}</span> -
                    <span>Tipo: ${product.type}</span>
                    ${product.type === 'simple' ? ` - <span>Precio: ${product.price_html || product.price}</span>` : ''}
                    ${product.type === 'simple' ? ` - <span class="stock-status ${product.stock_status}">${product.stock_status === 'instock' ? 'En stock' : 'Agotado'}</span>` : ''}
                </div>
                <div class="product-actions" style="float: right;">
                    ${product.type === 'simple' ? `<button class="button button-small add-simple-to-cart" data-product-id="${product.id}" ${product.stock_status !== 'instock' ? 'disabled' : ''}>Añadir</button>` : '<span style="font-style: italic; color: #777;">Selecciona variación</span>'}
                </div>
                <div style="clear: both;"></div>
                ${variationsHtml}`;
            resultsList.appendChild(listItem);
        });
    }

    /**
     * Maneja los clics en los botones "Añadir" (simple o variación) usando delegación de eventos.
     * @param {Event} event - El objeto del evento click.
     */
    function handleAddProductClick(event) {
        const targetButton = event.target;
        let productDataForCart = null;
        let product = null;
        let variation = null;

        if (targetButton.classList.contains('add-simple-to-cart') || targetButton.classList.contains('add-variation-to-cart')) {
            const productLi = targetButton.closest('li[data-product-id]');
            if (!productLi) return;

            const productId = productLi.dataset.productId;
            product = currentProducts.find(p => p.id == productId);
            if (!product) return;

            if (targetButton.classList.contains('add-variation-to-cart')) {
                const variationId = targetButton.dataset.variationId;
                if (!variationId || !product.variations) return;
                variation = product.variations.find(v => v.variation_id == variationId);
                if (!variation) return;
            }
        } else {
            return;
        }

        if (variation) {
            productDataForCart = {
                id: product.id, variation_id: variation.variation_id, name: product.name,
                variation_name: variation.variation_name || '',
                price: variation.price, quantity: 1,
                sku: variation.sku || '', image_url: variation.image_url || product.image_url,
            };
        } else if (product && product.type === 'simple') {
            productDataForCart = {
                id: product.id, variation_id: null, name: product.name, variation_name: '',
                price: product.price, quantity: 1, sku: product.sku || '', image_url: product.image_url || '',
            };
        }

        if (productDataForCart) {
            productDataForCart.price = parseFloat(productDataForCart.price) || 0;
            addToCart(productDataForCart);
        }
    }

    /**
     * Añade un producto (o incrementa su cantidad) al estado del carrito.
     * @param {Object} productData - Objeto con los datos del producto a añadir.
     */
    function addToCart(productData) {
        const cartItemId = productData.variation_id ? `${productData.id}-${productData.variation_id}` : `${productData.id}`;
        const existingItemIndex = cart.findIndex(item => item.cartItemId === cartItemId);

        if (existingItemIndex > -1) {
            cart[existingItemIndex].quantity += productData.quantity;
        } else {
            cart.push({
                cartItemId: cartItemId,
                productId: productData.id,
                variationId: productData.variation_id || null,
                name: productData.name,
                variationName: productData.variation_name || '',
                price: productData.price,
                quantity: productData.quantity,
                sku: productData.sku,
                image_url: productData.image_url,
            });
        }
        console.log('Carrito actualizado:', cart);
        displayCart();
    }

    /**
     * Calcula el importe total del carrito.
     * @returns {number} El total calculado.
     */
    function calculateTotal() {
        return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    /**
     * Actualiza la interfaz de usuario (HTML) para mostrar los items del carrito y el total.
     */
    function displayCart() {
        cartItemsList.innerHTML = ''; // Limpiar la lista actual.

        if (cart.length === 0) {
            cartItemsList.innerHTML = pos2025_pos_params.text_cart_empty || '<li>El carrito está vacío.</li>';
        } else {
            cart.forEach((item, index) => {
                const listItem = document.createElement('li');
                listItem.dataset.cartIndex = index;
                const itemPriceFormatted = wc_price(item.price); // Usar función global wc_price
                const subtotalFormatted = wc_price(item.price * item.quantity); // Usar función global wc_price

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
        const totalFormatted = wc_price(total); // Usar función global wc_price
        cartTotalAmount.textContent = totalFormatted;
        updateCheckoutButtonState();
    }

    /**
     * Actualiza la cantidad de un item en el carrito o lo elimina si la cantidad es menor a 1.
     * @param {number} index - Índice del item en el array `cart`.
     * @param {number} newQuantity - Nueva cantidad deseada.
     */
    function updateQuantity(index, newQuantity) {
        if (index < 0 || index >= cart.length) return;

        if (newQuantity < 1) {
            cart.splice(index, 1);
        } else {
            cart[index].quantity = newQuantity;
        }
        displayCart();
    }

    /**
     * Maneja clics en los botones de acción del carrito (+, -, x) usando delegación.
     * @param {Event} event - El objeto del evento click.
     */
    function handleCartActions(event) {
        const target = event.target;
        const index = target.dataset.index;
        if (index === undefined) return;

        const cartIndex = parseInt(index, 10);
        if (isNaN(cartIndex) || cartIndex < 0 || cartIndex >= cart.length) return;

        if (target.classList.contains('decrease-qty')) {
            updateQuantity(cartIndex, cart[cartIndex].quantity - 1);
        } else if (target.classList.contains('increase-qty')) {
            updateQuantity(cartIndex, cart[cartIndex].quantity + 1);
        } else if (target.classList.contains('remove-item')) {
            updateQuantity(cartIndex, 0);
        }
    }

    /**
     * Maneja cambios en el input de cantidad de un item del carrito.
     * @param {Event} event - El objeto del evento change o input.
     */
    function handleQuantityInputChange(event) {
        const target = event.target;
        const index = target.dataset.index;
        if (index === undefined || !target.classList.contains('item-quantity-input')) return;

        const cartIndex = parseInt(index, 10);
        if (isNaN(cartIndex) || cartIndex < 0 || cartIndex >= cart.length) return;

        const newQuantity = parseInt(target.value, 10);
        if (!isNaN(newQuantity)) {
            updateQuantity(cartIndex, newQuantity);
        } else {
            target.value = cart[cartIndex].quantity;
        }
    }

    // --- NUEVA FUNCIÓN ---
    /**
     * Carga un conjunto inicial de productos (destacados) al iniciar el TPV.
     */
    async function loadInitialProducts() {
        console.log('Cargando productos iniciales (destacados)...');
        // Mostrar un mensaje de carga diferente o usar el spinner
        resultsList.innerHTML = `<li>${pos2025_pos_params.text_loading || 'Cargando productos...'}</li>`;
        if (productSearchSpinner) productSearchSpinner.classList.add('is-active');

        const apiRoute = '/pos2025/v1/products';
        // Llamar a la API pidiendo productos destacados y un límite bajo (ej. 8)
        const queryParams = new URLSearchParams({ featured: 'true', per_page: 8 });
        const fullPath = `${apiRoute}?${queryParams.toString()}`;

        try {
            const initialProducts = await wp.apiFetch({ path: fullPath, method: 'GET' });
            currentProducts = initialProducts; // Guardar como productos actuales
            displayResults(currentProducts); // Mostrar en la lista
            console.log('Productos iniciales cargados:', initialProducts);
        } catch (error) {
            console.error('Error al cargar productos iniciales:', error);
            let errorMessage = 'Error al cargar productos iniciales.';
            if (error.message) errorMessage += ` Detalles: ${error.message}`;
            resultsList.innerHTML = `<li class="error-message">${errorMessage}</li>`;
            // Mostrar SweetAlert de error si está disponible
            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'error', title: pos2025_pos_params.swal_error_title || 'Error', text: errorMessage });
            }
        } finally {
             if (productSearchSpinner) productSearchSpinner.classList.remove('is-active');
        }
    }

    // =========================================================================
    // Funciones de Gestión de Clientes (Búsqueda, Selección, Formulario - Modificadas para Swal)
    // =========================================================================

    /**
     * Realiza una búsqueda de clientes llamando a la API REST.
     * @param {string} [searchTerm=''] - Término de búsqueda.
     * @param {number} [page=1] - Número de página (no implementado en UI).
     */
    async function searchCustomers(searchTerm = '', page = 1) {
        console.log(`${CUST_DEBUG_PREFIX} searchCustomers() called. Term: "${searchTerm}", Page: ${page}`);
        if (!customerSpinner || !customerList) {
            console.error(`${CUST_DEBUG_PREFIX} searchCustomers: Faltan elementos DOM esenciales (spinner, list).`);
            return;
        }

        customerSpinner.classList.add('is-active');
        customerList.innerHTML = `<li>${pos2025_pos_params.text_loading || 'Buscando...'}</li>`;

        const apiRoute = '/pos2025/v1/customers';
        const queryParams = new URLSearchParams({ role: 'customer', per_page: 5, page: page });
        const trimmedSearch = searchTerm.trim();
        if (trimmedSearch) queryParams.set('search', trimmedSearch);
        const fullPath = `${apiRoute}?${queryParams.toString()}`;
        console.log(`${CUST_DEBUG_PREFIX} API Request Path: ${fullPath}`);

        try {
            const customers = await wp.apiFetch({ path: fullPath, method: 'GET' });
            console.log(`${CUST_DEBUG_PREFIX} Customers received:`, customers);
            currentCustomers = customers;
            displayCustomerResults(currentCustomers);
        } catch (error) {
            console.error(`${CUST_DEBUG_PREFIX} Error al buscar clientes:`, error);
            let errorMsg = 'Error al buscar clientes.';
            if (error.message) errorMsg += ` Detalles: ${error.message}`;
            customerList.innerHTML = `<li class="error-message">${errorMsg}</li>`;
            // Mostrar SweetAlert de error
            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'error', title: pos2025_pos_params.swal_error_title || 'Error', text: errorMsg });
            }
        } finally {
            customerSpinner.classList.remove('is-active');
            console.log(`${CUST_DEBUG_PREFIX} searchCustomers() finished.`);
        }
    }

    /**
     * Muestra los resultados de la búsqueda de clientes en la lista HTML.
     * @param {Array<Object>} customers - Array de objetos de cliente.
     */
    function displayCustomerResults(customers) {
        console.log(`${CUST_DEBUG_PREFIX} displayCustomerResults() called with ${customers ? customers.length : 0} customers.`);
        if (!customerList) {
             console.error(`${CUST_DEBUG_PREFIX} displayCustomerResults: customerList element is null.`);
             return;
        }
        customerList.innerHTML = '';

        if (!Array.isArray(customers) || customers.length === 0) {
            console.log(`${CUST_DEBUG_PREFIX} No customers found or invalid data.`);
            customerList.innerHTML = '<li>No se encontraron clientes.</li>';
            return;
        }

        customers.forEach(customer => {
            const listItem = document.createElement('li');
            listItem.style.cssText = 'padding: 8px; border-bottom: 1px solid #eee; overflow: hidden; clear: both; cursor: pointer;';
            listItem.dataset.customerId = customer.id;

            const nameSpan = document.createElement('span');
            nameSpan.className = 'customer-name';
            nameSpan.style.marginRight = '5px';
            nameSpan.textContent = customer.display_name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.username || 'Nombre no disponible';

            const emailSpan = document.createElement('span');
            emailSpan.className = 'customer-email';
            emailSpan.style.fontSize = '0.9em';
            emailSpan.style.color = '#555';
            emailSpan.textContent = `(${(customer.email || 'Email no disponible')})`;

            const selectButton = document.createElement('button');
            selectButton.className = 'button button-small select-customer-button';
            selectButton.dataset.customerId = customer.id;
            selectButton.style.float = 'right';
            selectButton.textContent = 'Seleccionar';

            listItem.appendChild(nameSpan);
            listItem.appendChild(emailSpan);
            listItem.appendChild(selectButton);
            customerList.appendChild(listItem);
        });
        console.log(`${CUST_DEBUG_PREFIX} Customer results displayed.`);
    }

    /**
     * Maneja la selección de un cliente desde la lista de resultados (clic en botón o li).
     * Guarda el objeto completo del cliente seleccionado.
     * @param {string|number} customerId - El ID del cliente seleccionado.
     */
    function selectCustomer(customerId) {
        console.log(`${CUST_DEBUG_PREFIX} selectCustomer() called for ID: ${customerId}`);
        const customer = currentCustomers.find(c => c.id == customerId) || (currentSelectedCustomerObject && currentSelectedCustomerObject.id == customerId ? currentSelectedCustomerObject : null);

        if (!customer) {
            console.error(`${CUST_DEBUG_PREFIX} selectCustomer: Cliente con ID ${customerId} no encontrado.`);
            // Mostrar SweetAlert de error
            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'error', title: pos2025_pos_params.swal_error_title || 'Error', text: `No se encontraron los datos para el cliente ID ${customerId}.` });
            }
            return;
        }
        if (!selectedCustomerInfoSpan || !selectedCustomerDiv || !customerList || !customerSearchInput || !editCustomerButton) {
            console.error(`${CUST_DEBUG_PREFIX} selectCustomer: Faltan elementos DOM esenciales (infoSpan, selectedDiv, list, searchInput, editButton).`);
            return;
        }

        selectedCustomerId = customer.id;
        currentSelectedCustomerObject = customer;

        const displayName = customer.display_name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.username;
        const displayEmail = customer.email || 'N/A';
        selectedCustomerInfoSpan.textContent = `${displayName} (${displayEmail})`;

        selectedCustomerDiv.style.display = 'block';
        editCustomerButton.style.display = 'inline-block';
        customerList.innerHTML = '';
        customerSearchInput.value = '';
        console.log(`${CUST_DEBUG_PREFIX} Cliente seleccionado:`, currentSelectedCustomerObject);

        updateCheckoutButtonState();
    }

    /**
     * Limpia la selección actual del cliente y resetea la UI relacionada.
     */
    function clearCustomerSelection() {
        console.log(`${CUST_DEBUG_PREFIX} clearCustomerSelection() called.`);
        if (!selectedCustomerDiv || !selectedCustomerInfoSpan || !customerSearchInput || !customerList || !editCustomerButton) {
            console.error(`${CUST_DEBUG_PREFIX} clearCustomerSelection: Faltan elementos DOM esenciales (selectedDiv, infoSpan, searchInput, list, editButton).`);
            return;
        }
        selectedCustomerId = null;
        currentSelectedCustomerObject = null;
        selectedCustomerDiv.style.display = 'none';
        editCustomerButton.style.display = 'none';
        selectedCustomerInfoSpan.textContent = '';
        customerSearchInput.value = '';
        customerList.innerHTML = '';
        console.log(`${CUST_DEBUG_PREFIX} Selección de cliente eliminada.`);

        updateCheckoutButtonState();
    }

    /**
     * Maneja clics en la lista de resultados de clientes (delegación).
     * @param {Event} event
     */
    function handleCustomerListClick(event) {
        const target = event.target;
        const selectButton = target.closest('.select-customer-button');
        const listItem = target.closest('li[data-customer-id]');

        if (selectButton) {
            const customerId = selectButton.dataset.customerId;
            console.log(`${CUST_DEBUG_PREFIX} Botón Seleccionar Cliente CLICADO para ID: ${customerId}`);
            selectCustomer(customerId);
        } else if (listItem && !selectButton) {
            const customerId = listItem.dataset.customerId;
            console.log(`${CUST_DEBUG_PREFIX} Clic en LI de Cliente detectado para ID: ${customerId}`);
            selectCustomer(customerId);
        }
    }

    /**
     * Muestra el formulario para añadir o editar un cliente.
     * @param {string} mode - 'add' o 'edit'.
     * @param {object|null} customerData - Datos del cliente para rellenar en modo 'edit'.
     */
    function showCustomerForm(mode = 'add', customerData = null) {
        console.log(`${CUST_DEBUG_PREFIX} showCustomerForm() called. Mode: ${mode}`, customerData);
        if (!customerFormContainer || !customerDisplayArea || !customerFormTitle || !customerIdInput || !customerFirstNameInput || !customerLastNameInput || !customerEmailInput || !customerPhoneInput || !customerFormNotice) {
            console.error(`${CUST_DEBUG_PREFIX} showCustomerForm: Faltan elementos DOM del formulario.`);
            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'error', title: pos2025_pos_params.swal_error_title || 'Error', text: 'Faltan elementos del formulario de cliente.' });
            }
            return;
        }

        customerDisplayArea.style.display = 'none';
        customerFormContainer.style.display = 'block';
        customerFormNotice.textContent = '';
        customerFormNotice.style.color = 'red';

        if (mode === 'add') {
            customerFormTitle.textContent = pos2025_pos_params.text_add_customer_title || 'Añadir Nuevo Cliente';
            customerIdInput.value = '';
            customerFirstNameInput.value = '';
            customerLastNameInput.value = '';
            customerEmailInput.value = '';
            customerPhoneInput.value = '';
            console.log(`${CUST_DEBUG_PREFIX} Formulario preparado para añadir.`);
        } else if (mode === 'edit') {
            if (!customerData || !customerData.id) {
                console.error(`${CUST_DEBUG_PREFIX} showCustomerForm: Faltan datos del cliente para editar.`);
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        icon: 'error',
                        title: pos2025_pos_params.swal_error_title || 'Error',
                        text: pos2025_pos_params.text_customer_not_found_edit || 'Error: Datos del cliente no encontrados para editar.'
                    });
                }
                hideCustomerForm();
                return;
            }
            customerFormTitle.textContent = pos2025_pos_params.text_edit_customer_title || 'Editar Cliente';
            customerIdInput.value = customerData.id;
            customerFirstNameInput.value = customerData.first_name || '';
            customerLastNameInput.value = customerData.last_name || '';
            customerEmailInput.value = customerData.email || '';
            customerPhoneInput.value = customerData.phone || '';
            console.log(`${CUST_DEBUG_PREFIX} Formulario preparado para editar cliente ID: ${customerData.id}`);
        }
        customerFirstNameInput.focus();
    }

    /**
     * Oculta el formulario de cliente y muestra el área de búsqueda/seleccionado.
     */
    function hideCustomerForm() {
        console.log(`${CUST_DEBUG_PREFIX} hideCustomerForm() called.`);
        if (!customerFormContainer || !customerDisplayArea || !customerFormNotice || !customerIdInput) {
             console.error(`${CUST_DEBUG_PREFIX} hideCustomerForm: Faltan elementos DOM del formulario.`);
             return;
        }
        customerFormContainer.style.display = 'none';
        customerDisplayArea.style.display = 'block';
        customerIdInput.value = '';
        customerFirstNameInput.value = '';
        customerLastNameInput.value = '';
        customerEmailInput.value = '';
        customerPhoneInput.value = '';
        customerFormNotice.textContent = '';
        console.log(`${CUST_DEBUG_PREFIX} Formulario ocultado.`);
    }

    /**
     * Valida el formulario de cliente (actualmente solo email).
     * @returns {boolean} True si es válido, False si no.
     */
    function validateCustomerForm() {
        console.log(`${CUST_DEBUG_PREFIX} validateCustomerForm() called.`);
        customerFormNotice.textContent = '';

        const email = customerEmailInput.value.trim();
        if (!email) {
            const message = pos2025_pos_params.text_fill_required_fields || 'Por favor, completa los campos requeridos (*).';
            customerFormNotice.textContent = message;
            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'warning', title: pos2025_pos_params.swal_warning_title || 'Atención', text: message });
            }
            customerEmailInput.focus();
            console.warn(`${CUST_DEBUG_PREFIX} Validación fallida: Email vacío.`);
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            const message = pos2025_pos_params.text_invalid_email || 'Por favor, introduce un correo electrónico válido.';
            customerFormNotice.textContent = message;
            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'warning', title: pos2025_pos_params.swal_warning_title || 'Atención', text: message });
            }
            customerEmailInput.focus();
            console.warn(`${CUST_DEBUG_PREFIX} Validación fallida: Email inválido.`);
            return false;
        }

        console.log(`${CUST_DEBUG_PREFIX} Validación de formulario OK.`);
        return true;
    }

    /**
     * Maneja el guardado (creación o actualización) de un cliente.
     */
    async function handleSaveCustomer() {
        console.log(`${CUST_DEBUG_PREFIX} handleSaveCustomer() called.`);
        if (!validateCustomerForm()) {
            return; // La validación ya muestra Swal
        }

        if (customerSaveSpinner) customerSaveSpinner.classList.add('is-active');
        if (saveCustomerButton) saveCustomerButton.disabled = true;
        if (cancelCustomerButton) cancelCustomerButton.disabled = true;
        customerFormNotice.textContent = pos2025_pos_params.text_saving || 'Guardando...';
        customerFormNotice.style.color = '#555';

        const customerData = {
            first_name: customerFirstNameInput.value.trim(),
            last_name: customerLastNameInput.value.trim(),
            email: customerEmailInput.value.trim(),
            phone: customerPhoneInput.value.trim(),
        };

        const customerId = customerIdInput.value;
        let method, path;

        if (customerId) { method = 'PUT'; path = `/pos2025/v1/customers/${customerId}`; }
        else { method = 'POST'; path = '/pos2025/v1/customers'; }
        console.log(`${CUST_DEBUG_PREFIX} Datos a enviar:`, customerData);

        try {
            const savedCustomer = await wp.apiFetch({ path: path, method: method, data: customerData });
            console.log(`${CUST_DEBUG_PREFIX} Cliente guardado con éxito:`, savedCustomer);

            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'success',
                    title: pos2025_pos_params.swal_success_title || '¡Éxito!',
                    text: pos2025_pos_params.text_customer_saved || 'Cliente guardado correctamente.',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                // Fallback si Swal no está
                customerFormNotice.textContent = pos2025_pos_params.text_customer_saved || 'Cliente guardado correctamente.';
                customerFormNotice.style.color = 'green';
            }


            currentSelectedCustomerObject = savedCustomer;
            selectCustomer(savedCustomer.id);

            setTimeout(() => {
                hideCustomerForm();
            }, 1500); // Ocultar después del timer de Swal (o un tiempo similar si no hay Swal)

        } catch (error) {
            console.error(`${CUST_DEBUG_PREFIX} Error al guardar cliente:`, error);
            let errorMessage = pos2025_pos_params.text_error || 'Error';
            if (error.message) errorMessage += `: ${error.message}`;
            else if (error.responseJSON && error.responseJSON.message) errorMessage += `: ${error.responseJSON.message}`;
            else errorMessage += ': Ocurrió un error desconocido.';
            if (error.code) errorMessage += ` (Código: ${error.code})`;

            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'error',
                    title: pos2025_pos_params.swal_error_title || 'Error',
                    text: errorMessage
                });
            }
            customerFormNotice.textContent = errorMessage;
            customerFormNotice.style.color = 'red';

        } finally {
            if (customerSaveSpinner) customerSaveSpinner.classList.remove('is-active');
            if (saveCustomerButton) saveCustomerButton.disabled = false;
            if (cancelCustomerButton) cancelCustomerButton.disabled = false;
            console.log(`${CUST_DEBUG_PREFIX} handleSaveCustomer() finished.`);
        }
    }

    // =========================================================================
    // Funciones de Checkout y Pago (Modificadas para Swal)
    // =========================================================================

    /**
     * Carga las pasarelas de pago activas desde la API REST.
     */
    async function loadPaymentGateways() {
        console.log('Cargando métodos de pago...');
        if (gatewaySpinner) gatewaySpinner.classList.add('is-active');
        paymentGatewaySelect.disabled = true;
        paymentGatewaySelect.innerHTML = '<option value="">-- Cargando... --</option>';

        const apiRoute = '/pos2025/v1/payment-gateways';
        try {
            const gateways = await wp.apiFetch({ path: apiRoute, method: 'GET' });
            paymentGatewaySelect.innerHTML = '<option value="">-- Selecciona un método --</option>';

            if (gateways && gateways.length > 0) {
                gateways.forEach(gateway => {
                    const option = document.createElement('option');
                    option.value = gateway.id;
                    option.textContent = gateway.title;
                    paymentGatewaySelect.appendChild(option);
                });
                paymentGatewaySelect.disabled = false;
                console.log('Métodos de pago cargados.');
            } else {
                paymentGatewaySelect.innerHTML = '<option value="">-- No hay métodos disponibles --</option>';
                console.warn('No se encontraron métodos de pago activos.');
            }
        } catch (error) {
            console.error('Error al cargar métodos de pago:', error);
            paymentGatewaySelect.innerHTML = '<option value="">-- Error al cargar --</option>';
            // Mostrar SweetAlert de error
            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'error', title: pos2025_pos_params.swal_error_title || 'Error', text: `Error al cargar métodos de pago: ${error.message || ''}` });
            }
        } finally {
            if (gatewaySpinner) gatewaySpinner.classList.remove('is-active');
            updateCheckoutButtonState();
        }
    }

    /**
     * Muestra u oculta la sección de términos de suscripción según el tipo de venta seleccionado.
     */
    function toggleSubscriptionTerms() {
        const selectedType = document.querySelector('input[name="pos_sale_type"]:checked')?.value;
        if (subscriptionTermsDiv) {
            subscriptionTermsDiv.style.display = (selectedType === 'subscription') ? 'block' : 'none';
        }
        updateCheckoutButtonState();
    }

    /**
     * Habilita o deshabilita el botón "Completar Venta" según las condiciones actuales.
     */
    function updateCheckoutButtonState() {
        const cartHasItems = cart.length > 0;
        const paymentMethodSelected = paymentGatewaySelect && paymentGatewaySelect.value !== '';
        const currentSaleType = document.querySelector('input[name="pos_sale_type"]:checked')?.value;

        let enableButton = cartHasItems && paymentMethodSelected;

        if ((currentSaleType === 'credit' || currentSaleType === 'subscription') && !selectedCustomerId) {
            enableButton = false;
            console.log(`${CUST_DEBUG_PREFIX} updateCheckoutButtonState: Botón deshabilitado (venta ${currentSaleType} requiere cliente).`);
        }

        if (checkoutButton) {
            checkoutButton.disabled = !enableButton;
        }
        console.log(`updateCheckoutButtonState: Cart=${cartHasItems}, Payment=${paymentMethodSelected}, SaleType=${currentSaleType}, Customer=${selectedCustomerId}, Enabled=${enableButton}`);
    }

    /**
     * Maneja el proceso de checkout al hacer clic en "Completar Venta".
     * Realiza validaciones, prepara datos y llama a la API para crear el pedido.
     */
    async function handleCheckout() {
        console.log('Iniciando proceso de checkout...');
        const checkoutSpinner = checkoutButton.parentElement.querySelector('.spinner');

        // --- 1. Validaciones Previas (Usando Swal) ---
        if (cart.length === 0) {
            if (typeof Swal !== 'undefined') Swal.fire({ icon: 'warning', title: pos2025_pos_params.swal_warning_title || 'Atención', text: pos2025_pos_params.swal_cart_empty || 'El carrito está vacío.' });
            return;
        }
        const selectedGatewayId = paymentGatewaySelect.value;
        if (!selectedGatewayId) {
            if (typeof Swal !== 'undefined') Swal.fire({ icon: 'warning', title: pos2025_pos_params.swal_warning_title || 'Atención', text: pos2025_pos_params.swal_select_payment || 'Por favor, selecciona un método de pago.' });
            paymentGatewaySelect.focus();
            return;
        }
        const currentSaleType = document.querySelector('input[name="pos_sale_type"]:checked').value;

        if ((currentSaleType === 'credit' || currentSaleType === 'subscription') && !selectedCustomerId) {
            const message = (pos2025_pos_params.swal_select_customer_for_type || 'Para ventas de tipo "%s", por favor, busca y selecciona un cliente.').replace('%s', currentSaleType);
            if (typeof Swal !== 'undefined') Swal.fire({ icon: 'warning', title: pos2025_pos_params.swal_warning_title || 'Atención', text: message });
            customerSearchInput.focus();
            return;
        }

        // --- 2. Deshabilitar botón y mostrar spinner ---
        checkoutButton.disabled = true;
        checkoutButton.textContent = 'Procesando...';
        if (checkoutSpinner) checkoutSpinner.classList.add('is-active');

        // --- 3. Preparar datos para la API ---
        const orderData = {
            line_items: getCartItemsForAPI(),
            payment_method: selectedGatewayId,
            payment_method_title: paymentGatewaySelect.options[paymentGatewaySelect.selectedIndex].text,
            customer_id: selectedCustomerId || 0,
            status: (currentSaleType === 'credit') ? 'on-hold' : 'processing',
            sale_type: currentSaleType,
            customer_note: customerNoteTextarea ? customerNoteTextarea.value.trim() : ''
        };

        if (currentSaleType === 'subscription') {
            const title = subscriptionTitleInput ? subscriptionTitleInput.value.trim() : '';
            const startDate = subscriptionStartDateInput ? subscriptionStartDateInput.value : '';
            const color = subscriptionColorInput ? subscriptionColorInput.value : '#3a87ad';

            if (!title) {
                if (typeof Swal !== 'undefined') Swal.fire({ icon: 'warning', title: pos2025_pos_params.swal_warning_title || 'Atención', text: pos2025_pos_params.swal_subscription_title_missing || 'Por favor, introduce un título para el evento.' });
                checkoutButton.disabled = false; checkoutButton.textContent = 'Completar Venta';
                if (checkoutSpinner) checkoutSpinner.classList.remove('is-active');
                subscriptionTitleInput.focus();
                return;
            }
            if (!startDate) {
                if (typeof Swal !== 'undefined') Swal.fire({ icon: 'warning', title: pos2025_pos_params.swal_warning_title || 'Atención', text: pos2025_pos_params.swal_subscription_date_missing || 'Por favor, selecciona una fecha para el evento.' });
                checkoutButton.disabled = false; checkoutButton.textContent = 'Completar Venta';
                if (checkoutSpinner) checkoutSpinner.classList.remove('is-active');
                subscriptionStartDateInput.focus();
                return;
            }
            orderData.subscription_title = title;
            orderData.subscription_start_date = startDate;
            orderData.subscription_color = color;
        }

        console.log('Datos a enviar para crear pedido:', orderData);

        // --- 4. Realizar la llamada a la API ---
        const apiRoute = '/pos2025/v1/orders';
        try {
            const response = await wp.apiFetch({ path: apiRoute, method: 'POST', data: orderData });

            // --- 5. Éxito (Usando Swal) ---
            console.log('Pedido creado:', response);
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'success',
                    title: pos2025_pos_params.swal_success_title || '¡Éxito!',
                    text: `${response.message || pos2025_pos_params.swal_order_created_message || 'Pedido creado con éxito.'} (ID: ${response.order_id || 'N/A'})`,
                });
            } else {
                alert(`¡Éxito! ${response.message || 'Pedido creado con éxito.'} ID: ${response.order_id || ''}`); // Fallback
            }


            // Limpiar UI
            clearCartUI();
            clearCustomerSelection();
            if (subscriptionTitleInput) subscriptionTitleInput.value = '';
            if (subscriptionStartDateInput) subscriptionStartDateInput.valueAsDate = new Date();
            if (subscriptionColorInput) subscriptionColorInput.value = '#3a87ad';
            if (customerNoteTextarea) customerNoteTextarea.value = '';
            const directSaleRadio = document.querySelector('input[name="pos_sale_type"][value="direct"]');
            if (directSaleRadio) {
                directSaleRadio.checked = true;
                directSaleRadio.dispatchEvent(new Event('change'));
            }

        } catch (error) {
            // --- 6. Error (Usando Swal) ---
            console.error('Error al crear pedido:', error);
            const errorMessage = error.message || (error.responseJSON && error.responseJSON.message) || 'Ocurrió un error desconocido.';
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'error',
                    title: pos2025_pos_params.swal_error_title || 'Error',
                    text: errorMessage
                });
            } else {
                alert(`Error: ${errorMessage}`); // Fallback
            }
            // Reactivar botón
            checkoutButton.disabled = false;

        } finally {
            // --- 7. Siempre ---
            if (checkoutSpinner) checkoutSpinner.classList.remove('is-active');
            if (cart.length > 0 || checkoutButton.disabled === false) {
                 checkoutButton.textContent = 'Completar Venta';
            }
            updateCheckoutButtonState();
        }
    }

    // =========================================================================
    // Event Listeners (Configuración Inicial)
    // =========================================================================
    // Añadir listeners a los elementos interactivos.

    // --- Búsqueda de Productos ---
    if (searchButton) searchButton.addEventListener('click', () => searchProducts(searchInput.value));
    if (searchInput) searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); searchProducts(searchInput.value); } });
    if (resultsList) resultsList.addEventListener('click', handleAddProductClick);

    // --- Gestión de Clientes (Búsqueda, Selección, Formulario) ---
    if (customerSearchButton) customerSearchButton.addEventListener('click', () => searchCustomers(customerSearchInput.value));
    if (customerSearchInput) customerSearchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); searchCustomers(customerSearchInput.value); } });
    if (customerList) customerList.addEventListener('click', handleCustomerListClick);
    if (clearCustomerButton) clearCustomerButton.addEventListener('click', clearCustomerSelection);
    if (showAddCustomerFormButton) showAddCustomerFormButton.addEventListener('click', () => showCustomerForm('add'));
    if (editCustomerButton) editCustomerButton.addEventListener('click', () => {
        if (currentSelectedCustomerObject) { showCustomerForm('edit', currentSelectedCustomerObject); }
        else {
            const errorMsg = pos2025_pos_params.text_customer_not_found_edit || 'Error: No se encontraron los datos del cliente para editar.';
            console.error(`${CUST_DEBUG_PREFIX} Intento de editar sin datos de cliente seleccionados.`);
            if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: pos2025_pos_params.swal_error_title || 'Error', text: errorMsg });
        }
    });
    if (saveCustomerButton) saveCustomerButton.addEventListener('click', handleSaveCustomer);
    if (cancelCustomerButton) cancelCustomerButton.addEventListener('click', () => {
        // Opcional: Confirmación con Swal si hay cambios
        // const hasChanges = customerFirstNameInput.value || customerLastNameInput.value || customerEmailInput.value || customerPhoneInput.value;
        // if (hasChanges && typeof Swal !== 'undefined') {
        //     Swal.fire({
        //         title: '¿Cancelar?',
        //         text: pos2025_pos_params.text_confirm_cancel || 'Los cambios no guardados se perderán.',
        //         icon: 'warning',
        //         showCancelButton: true,
        //         confirmButtonText: 'Sí, cancelar',
        //         cancelButtonText: 'No'
        //     }).then((result) => {
        //         if (result.isConfirmed) {
        //             hideCustomerForm();
        //         }
        //     });
        // } else {
             hideCustomerForm(); // Cancelar directamente si no hay cambios o Swal no está
        // }
    });

    // --- Gestión del Carrito ---
    if (cartItemsList) {
        cartItemsList.addEventListener('click', handleCartActions);
        cartItemsList.addEventListener('change', handleQuantityInputChange);
    }

    // --- Opciones de Venta y Pago ---
    if (saleTypeRadios) saleTypeRadios.forEach(radio => radio.addEventListener('change', toggleSubscriptionTerms));
    if (paymentGatewaySelect) paymentGatewaySelect.addEventListener('change', updateCheckoutButtonState);

    // --- Botón Principal de Checkout ---
    if (checkoutButton) checkoutButton.addEventListener('click', handleCheckout);

    // =========================================================================
    // Inicialización al Cargar la Página
    // =========================================================================
    // Ejecutar funciones necesarias al inicio.

    loadPaymentGateways();
    displayCart();
    toggleSubscriptionTerms();
    clearCustomerSelection();
    hideCustomerForm();

    // --- LLAMADA A LA NUEVA FUNCIÓN ---
    loadInitialProducts(); // Cargar productos destacados al inicio.

    // Establecer fecha por defecto para el campo de fecha de suscripción/evento.
    if (subscriptionStartDateInput) {
        subscriptionStartDateInput.valueAsDate = new Date(); // Poner fecha actual.
    }
    // Asegurar que el campo de nota esté vacío al inicio.
    if (customerNoteTextarea) {
        customerNoteTextarea.value = '';
    }

    console.log('POS App Initialized with SweetAlert2 and Initial Products.');

}); // Fin de DOMContentLoaded

/**
 * Función global simple para formatear precios (si wc_price no está disponible).
 * Esta es una implementación muy básica. Usa los parámetros localizados.
 * @param {number|string} price - El precio a formatear.
 * @returns {string} - El precio formateado con símbolo de moneda.
 */
function wc_price(price) {
    try {
        if (typeof pos2025_pos_params !== 'undefined') {
            const decimals = parseInt(pos2025_pos_params.price_decimals || 2, 10);
            const decimalSep = pos2025_pos_params.decimal_sep || '.';
            const thousandSep = pos2025_pos_params.thousand_sep || ',';
            const currencySymbol = pos2025_pos_params.currency_symbol || '$';
            // Formato: %1$s = símbolo, %2$s = precio
            const format = pos2025_pos_params.price_format || '%1$s%2$s';

            let number = parseFloat(price);
            if (isNaN(number)) {
                console.warn('wc_price: Input price is not a valid number:', price);
                number = 0;
            }

            // Formatear el número con decimales fijos
            let formattedPrice = number.toFixed(decimals);

            // Aplicar separador de miles (expresión regular básica)
            let parts = formattedPrice.split('.');
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandSep);

            // Reconstruir el precio con el separador decimal correcto
            formattedPrice = parts.join(decimalSep);

            // Aplicar el formato de moneda (símbolo antes/después)
            return format.replace('%1$s', currencySymbol).replace('%2$s', formattedPrice);
        }
    } catch (e) {
        console.error("Error in wc_price formatting:", e, "Input price:", price);
    }
    // Fallback muy básico si algo falla o no hay parámetros
    const fallbackPrice = parseFloat(price);
    return '$' + (isNaN(fallbackPrice) ? '0.00' : fallbackPrice.toFixed(2));
}
