// wp-content/plugins/pos2025/assets/js/pos-app.js
/**
 * Lógica principal de la interfaz del TPV (POS 2025).
 * Maneja la búsqueda de productos, gestión de clientes (búsqueda/selección),
 * el carrito, los tipos de venta, los métodos de pago y el proceso de checkout.
 *
 * @version 1.1.0 - Integrada lógica de cliente.
 */

// Esperar a que el DOM esté completamente cargado antes de ejecutar el script.
document.addEventListener('DOMContentLoaded', function() {
    'use strict'; // Usar modo estricto para mejor calidad de código.

    // Prefijo para logs de debug específicos de cliente
    const CUST_DEBUG_PREFIX = '[POS_APP_DEBUG_CUST]';

    console.log('POS App Script Loaded and DOM Ready!');
    // Verificar que los parámetros localizados desde PHP están disponibles.
    if (typeof pos2025_pos_params === 'undefined') {
        console.error('Error Crítico: pos2025_pos_params no está definido. Asegúrate de que wp_localize_script se usa correctamente.');
        return; // Detener si faltan parámetros esenciales.
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
    // const openAddCustomerModalButton = document.getElementById('pos-open-add-customer-modal'); // Comentado, ya no se usa modal

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
        selectedCustomerDiv, selectedCustomerInfoSpan, clearCustomerButton, // Cliente (Selección)
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
            !selectedCustomerDiv && 'pos-selected-customer', !selectedCustomerInfoSpan && 'selected-customer-info', !clearCustomerButton && 'clear-customer-button',
            !cartItemsList && 'pos-cart-items', !cartTotalAmount && 'cart-total-amount',
            !checkoutButton && 'pos-checkout-button', !paymentGatewaySelect && 'pos-payment-gateway', !gatewaySpinner && 'pos-gateway-spinner', !saleTypeRadios && 'input[name="pos_sale_type"]', !customerNoteTextarea && 'pos-customer-note',
            !subscriptionTermsDiv && 'pos-subscription-terms', !subscriptionTitleInput && 'pos_subscription_title', !subscriptionStartDateInput && 'pos_subscription_start_date', !subscriptionColorInput && 'pos_subscription_color'
        ].filter(Boolean); // Filtrar los que no faltan (false)
        console.error('Elementos faltantes:', missingIds.join(', '));
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

    // =========================================================================
    // Funciones Auxiliares y de Lógica (Productos y Carrito - Sin cambios)
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
        // Nota: Los listeners para los botones 'Añadir' se manejan mediante delegación en la inicialización.
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

        // Verificar si el clic fue en un botón de añadir (simple o variación).
        if (targetButton.classList.contains('add-simple-to-cart') || targetButton.classList.contains('add-variation-to-cart')) {
            // Encontrar el <li> padre del producto.
            const productLi = targetButton.closest('li[data-product-id]');
            if (!productLi) return; // Salir si no se encuentra el <li>.

            const productId = productLi.dataset.productId;
            // Buscar el producto en los resultados actuales guardados.
            product = currentProducts.find(p => p.id == productId);
            if (!product) return; // Salir si no se encuentra el producto.

            // Si es un botón de añadir variación, encontrar la variación específica.
            if (targetButton.classList.contains('add-variation-to-cart')) {
                const variationId = targetButton.dataset.variationId;
                if (!variationId || !product.variations) return;
                variation = product.variations.find(v => v.variation_id == variationId);
                if (!variation) return; // Salir si no se encuentra la variación.
            }
        } else {
            return; // Salir si no fue un botón de añadir.
        }

        // Construir el objeto de datos para añadir al carrito.
        if (variation) { // Si se seleccionó una variación.
            productDataForCart = {
                id: product.id, variation_id: variation.variation_id, name: product.name,
                variation_name: variation.variation_name || '', // Nombre legible de la variación.
                price: variation.price, quantity: 1,
                sku: variation.sku || '', image_url: variation.image_url || product.image_url,
            };
        } else if (product && product.type === 'simple') { // Si es un producto simple.
            productDataForCart = {
                id: product.id, variation_id: null, name: product.name, variation_name: '',
                price: product.price, quantity: 1, sku: product.sku || '', image_url: product.image_url || '',
            };
        }

        // Si se construyeron datos válidos, añadirlos al carrito.
        if (productDataForCart) {
            productDataForCart.price = parseFloat(productDataForCart.price) || 0; // Asegurar que el precio sea numérico.
            addToCart(productDataForCart);
        }
    }

    /**
     * Añade un producto (o incrementa su cantidad) al estado del carrito.
     * @param {Object} productData - Objeto con los datos del producto a añadir.
     */
    function addToCart(productData) {
        // Crear un ID único para el item en el carrito (producto simple o variación).
        const cartItemId = productData.variation_id ? `${productData.id}-${productData.variation_id}` : `${productData.id}`;
        // Buscar si el item ya existe en el carrito.
        const existingItemIndex = cart.findIndex(item => item.cartItemId === cartItemId);

        if (existingItemIndex > -1) {
            // Si existe, incrementar la cantidad.
            cart[existingItemIndex].quantity += productData.quantity;
        } else {
            // Si no existe, añadirlo como nuevo item.
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
        displayCart(); // Actualizar la visualización del carrito en la UI.
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
            // Crear un <li> por cada item en el carrito.
            cart.forEach((item, index) => {
                const listItem = document.createElement('li');
                listItem.dataset.cartIndex = index; // Guardar índice para referencia.
                // Usar wc_price para formatear (simplificado aquí, idealmente se haría con una función más robusta)
                const itemPriceFormatted = typeof wc_price === 'function' ? wc_price(item.price) : item.price.toFixed(pos2025_pos_params.price_decimals || 2);
                const subtotalFormatted = typeof wc_price === 'function' ? wc_price(item.price * item.quantity) : (item.price * item.quantity).toFixed(pos2025_pos_params.price_decimals || 2);

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
        // Calcular y mostrar el total.
        const total = calculateTotal();
        const totalFormatted = typeof wc_price === 'function' ? wc_price(total) : total.toFixed(pos2025_pos_params.price_decimals || 2);
        cartTotalAmount.textContent = totalFormatted;
        updateCheckoutButtonState(); // Actualizar el estado del botón de pago.
        // Nota: Listeners para botones del carrito (+/-/x/input) se manejan por delegación.
    }

    /**
     * Actualiza la cantidad de un item en el carrito o lo elimina si la cantidad es menor a 1.
     * @param {number} index - Índice del item en el array `cart`.
     * @param {number} newQuantity - Nueva cantidad deseada.
     */
    function updateQuantity(index, newQuantity) {
        if (index < 0 || index >= cart.length) return; // Validar índice.

        if (newQuantity < 1) {
            cart.splice(index, 1); // Eliminar el item si la cantidad es 0 o menor.
        } else {
            // TODO: Considerar añadir validación de stock aquí si es necesario.
            cart[index].quantity = newQuantity; // Actualizar cantidad.
        }
        displayCart(); // Redibujar el carrito.
    }

    /**
     * Maneja clics en los botones de acción del carrito (+, -, x) usando delegación.
     * @param {Event} event - El objeto del evento click.
     */
    function handleCartActions(event) {
        const target = event.target;
        const index = target.dataset.index; // Obtener índice del item desde data-attribute.
        if (index === undefined) return; // Salir si no se hizo clic en un elemento con data-index.

        const cartIndex = parseInt(index, 10);
        if (isNaN(cartIndex) || cartIndex < 0 || cartIndex >= cart.length) return; // Validar índice.

        if (target.classList.contains('decrease-qty')) {
            updateQuantity(cartIndex, cart[cartIndex].quantity - 1);
        } else if (target.classList.contains('increase-qty')) {
            updateQuantity(cartIndex, cart[cartIndex].quantity + 1);
        } else if (target.classList.contains('remove-item')) {
            updateQuantity(cartIndex, 0); // Poner cantidad a 0 para eliminar.
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
            updateQuantity(cartIndex, newQuantity); // Actualizar si es un número válido.
        } else {
            // Si el valor no es un número válido, revertir al valor anterior.
            target.value = cart[cartIndex].quantity;
        }
    }

    // =========================================================================
    // Funciones de Gestión de Clientes (Integradas)
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
        // Opcional: Ocultar selección previa mientras busca
        // if (selectedCustomerDiv) selectedCustomerDiv.style.display = 'none';

        const apiRoute = '/pos2025/v1/customers';
        const queryParams = new URLSearchParams({ role: 'customer', per_page: 5, page: page }); // Limitar a 5 resultados por defecto
        const trimmedSearch = searchTerm.trim();
        if (trimmedSearch) queryParams.set('search', trimmedSearch);
        const fullPath = `${apiRoute}?${queryParams.toString()}`;
        console.log(`${CUST_DEBUG_PREFIX} API Request Path: ${fullPath}`);

        try {
            const customers = await wp.apiFetch({ path: fullPath, method: 'GET' });
            console.log(`${CUST_DEBUG_PREFIX} Customers received:`, customers);
            currentCustomers = customers; // Guardar resultados
            displayCustomerResults(currentCustomers);
        } catch (error) {
            console.error(`${CUST_DEBUG_PREFIX} Error al buscar clientes:`, error);
            let errorMsg = 'Error al buscar clientes.';
            if (error.message) errorMsg += ` Detalles: ${error.message}`;
            customerList.innerHTML = `<li class="error-message">${errorMsg}</li>`;
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
        customerList.innerHTML = ''; // Limpiar siempre antes de mostrar

        if (!Array.isArray(customers) || customers.length === 0) {
            console.log(`${CUST_DEBUG_PREFIX} No customers found or invalid data.`);
            customerList.innerHTML = '<li>No se encontraron clientes.</li>';
            return;
        }

        customers.forEach(customer => {
            const listItem = document.createElement('li');
            // Estilos básicos para legibilidad
            listItem.style.cssText = 'padding: 8px; border-bottom: 1px solid #eee; overflow: hidden; clear: both; cursor: pointer;'; // Añadir cursor pointer
            listItem.dataset.customerId = customer.id; // Guardar ID para selección directa

            // Usar textContent para seguridad básica contra XSS en nombres/emails
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
     * @param {string|number} customerId - El ID del cliente seleccionado.
     */
    function selectCustomer(customerId) {
        console.log(`${CUST_DEBUG_PREFIX} selectCustomer() called for ID: ${customerId}`);
        const customer = currentCustomers.find(c => c.id == customerId); // Usar == para comparación flexible (string/number)

        if (!customer) {
            console.error(`${CUST_DEBUG_PREFIX} selectCustomer: Cliente con ID ${customerId} no encontrado en currentCustomers.`);
            return;
        }
        if (!selectedCustomerInfoSpan || !selectedCustomerDiv || !customerList || !customerSearchInput) {
            console.error(`${CUST_DEBUG_PREFIX} selectCustomer: Faltan elementos DOM esenciales (infoSpan, selectedDiv, list, searchInput).`);
            return;
        }

        selectedCustomerId = customer.id;
        // Usar textContent para seguridad
        const displayName = customer.display_name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.username;
        const displayEmail = customer.email || 'N/A';
        selectedCustomerInfoSpan.textContent = `${displayName} (${displayEmail})`;

        selectedCustomerDiv.style.display = 'block'; // Mostrar la info del seleccionado
        customerList.innerHTML = ''; // Limpiar resultados de búsqueda
        customerSearchInput.value = ''; // Limpiar campo de búsqueda
        console.log(`${CUST_DEBUG_PREFIX} Cliente seleccionado: ID ${selectedCustomerId}, Nombre: ${selectedCustomerInfoSpan.textContent}`);

        // Actualizar estado del botón checkout
        updateCheckoutButtonState();
    }

    /**
     * Limpia la selección actual del cliente y resetea la UI relacionada.
     */
    function clearCustomerSelection() {
        console.log(`${CUST_DEBUG_PREFIX} clearCustomerSelection() called.`);
        if (!selectedCustomerDiv || !selectedCustomerInfoSpan || !customerSearchInput || !customerList) {
            console.error(`${CUST_DEBUG_PREFIX} clearCustomerSelection: Faltan elementos DOM esenciales (selectedDiv, infoSpan, searchInput, list).`);
            return;
        }
        selectedCustomerId = null;
        selectedCustomerDiv.style.display = 'none'; // Ocultar info del seleccionado
        selectedCustomerInfoSpan.textContent = ''; // Limpiar texto
        customerSearchInput.value = ''; // Limpiar campo de búsqueda
        customerList.innerHTML = ''; // Limpiar resultados (por si acaso)
        console.log(`${CUST_DEBUG_PREFIX} Selección de cliente eliminada.`);

        // Actualizar estado del botón checkout
        updateCheckoutButtonState();
    }

    /**
     * Maneja clics en la lista de resultados de clientes (delegación).
     * @param {Event} event
     */
    function handleCustomerListClick(event) {
        const target = event.target;
        // Buscar el botón 'Seleccionar' o el propio 'li'
        const selectButton = target.closest('.select-customer-button');
        const listItem = target.closest('li[data-customer-id]');

        if (selectButton) {
            const customerId = selectButton.dataset.customerId;
            console.log(`${CUST_DEBUG_PREFIX} Botón Seleccionar Cliente CLICADO para ID: ${customerId}`);
            selectCustomer(customerId);
        } else if (listItem && !selectButton) { // Si se hizo clic en el LI pero no en el botón
            const customerId = listItem.dataset.customerId;
            console.log(`${CUST_DEBUG_PREFIX} Clic en LI de Cliente detectado para ID: ${customerId}`);
            selectCustomer(customerId);
        }
    }

    // =========================================================================
    // Funciones de Checkout y Pago (Modificadas)
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
            paymentGatewaySelect.innerHTML = '<option value="">-- Selecciona un método --</option>'; // Opción por defecto.

            if (gateways && gateways.length > 0) {
                // Añadir cada pasarela como una opción en el select.
                gateways.forEach(gateway => {
                    const option = document.createElement('option');
                    option.value = gateway.id;
                    option.textContent = gateway.title;
                    paymentGatewaySelect.appendChild(option);
                });
                paymentGatewaySelect.disabled = false; // Habilitar select.
                console.log('Métodos de pago cargados.');
            } else {
                paymentGatewaySelect.innerHTML = '<option value="">-- No hay métodos disponibles --</option>';
                console.warn('No se encontraron métodos de pago activos.');
            }
        } catch (error) {
            console.error('Error al cargar métodos de pago:', error);
            paymentGatewaySelect.innerHTML = '<option value="">-- Error al cargar --</option>';
        } finally {
            if (gatewaySpinner) gatewaySpinner.classList.remove('is-active');
            updateCheckoutButtonState(); // Actualizar estado del botón de pago.
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
        updateCheckoutButtonState(); // Actualizar botón, ya que la selección de cliente puede ser requerida para 'credit'.
    }

    /**
     * Habilita o deshabilita el botón "Completar Venta" según las condiciones actuales.
     * Condiciones: Carrito no vacío, método de pago seleccionado.
     * Si el tipo de venta es 'credit', también requiere un cliente seleccionado.
     */
    function updateCheckoutButtonState() {
        const cartHasItems = cart.length > 0;
        const paymentMethodSelected = paymentGatewaySelect && paymentGatewaySelect.value !== '';
        const currentSaleType = document.querySelector('input[name="pos_sale_type"]:checked')?.value;

        // Condición base para habilitar: tener items y método de pago.
        let enableButton = cartHasItems && paymentMethodSelected;

        // Requisito adicional: Si es venta a crédito, se necesita un cliente.
        if (currentSaleType === 'credit' && !selectedCustomerId) {
            enableButton = false;
            console.log(`${CUST_DEBUG_PREFIX} updateCheckoutButtonState: Botón deshabilitado (venta a crédito requiere cliente).`);
        }

        // Aplicar el estado al botón.
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

        // --- 1. Validaciones Previas ---
        if (cart.length === 0) {
            alert('El carrito está vacío.');
            return;
        }
        const selectedGatewayId = paymentGatewaySelect.value;
        if (!selectedGatewayId) {
            alert('Por favor, selecciona un método de pago.');
            paymentGatewaySelect.focus();
            return;
        }
        const currentSaleType = document.querySelector('input[name="pos_sale_type"]:checked').value;

        // Validación específica para venta a crédito
        if (currentSaleType === 'credit' && !selectedCustomerId) {
            alert('Para ventas a crédito, por favor, busca y selecciona un cliente.');
            customerSearchInput.focus(); // Enfocar en la búsqueda de cliente
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
            customer_id: selectedCustomerId || 0, // Enviar ID del cliente o 0 si no hay (invitado)
            status: (currentSaleType === 'credit') ? 'on-hold' : 'processing', // Estado según tipo de venta
            sale_type: currentSaleType,
            customer_note: customerNoteTextarea ? customerNoteTextarea.value.trim() : ''
        };

        // Añadir datos de calendario si es tipo 'subscription'.
        if (currentSaleType === 'subscription') {
            const title = subscriptionTitleInput ? subscriptionTitleInput.value.trim() : '';
            const startDate = subscriptionStartDateInput ? subscriptionStartDateInput.value : ''; // El backend espera 'subscription_start_date'
            const color = subscriptionColorInput ? subscriptionColorInput.value : '#3a87ad';

            // Validaciones para campos de calendario.
            if (!title) {
                alert('Por favor, introduce un título para el evento de suscripción.');
                checkoutButton.disabled = false; checkoutButton.textContent = 'Completar Venta';
                if (checkoutSpinner) checkoutSpinner.classList.remove('is-active');
                subscriptionTitleInput.focus();
                return;
            }
            if (!startDate) {
                alert('Por favor, selecciona una fecha para el evento.');
                checkoutButton.disabled = false; checkoutButton.textContent = 'Completar Venta';
                if (checkoutSpinner) checkoutSpinner.classList.remove('is-active');
                subscriptionStartDateInput.focus();
                return;
            }

            // Añadir datos al objeto orderData.
            orderData.subscription_title = title;
            orderData.subscription_start_date = startDate;
            orderData.subscription_color = color;
        }

        console.log('Datos a enviar para crear pedido:', orderData);

        // --- 4. Realizar la llamada a la API ---
        const apiRoute = '/pos2025/v1/orders';
        try {
            // Usar wp.apiFetch para la llamada POST, incluyendo el nonce.
            const response = await wp.apiFetch({
                path: apiRoute,
                method: 'POST',
                data: orderData,
                headers: { 'X-WP-Nonce': pos2025_pos_params.nonce }
            });

            // --- 5. Éxito ---
            console.log('Pedido creado:', response);
            alert(`¡Éxito! ${response.message || 'Operación completada.'} ID: ${response.order_id || ''}`);
            // Limpiar la interfaz de usuario.
            clearCartUI();
            clearCustomerSelection(); // Limpiar también la selección de cliente
            // Resetear campos específicos de suscripción/evento.
            if (subscriptionTitleInput) subscriptionTitleInput.value = '';
            if (subscriptionStartDateInput) subscriptionStartDateInput.valueAsDate = new Date(); // Resetear a hoy.
            if (subscriptionColorInput) subscriptionColorInput.value = '#3a87ad'; // Resetear a color por defecto.
            if (customerNoteTextarea) customerNoteTextarea.value = ''; // Limpiar nota.
            // Resetear tipo de venta a 'directa'.
            const directSaleRadio = document.querySelector('input[name="pos_sale_type"][value="direct"]');
            if (directSaleRadio) {
                directSaleRadio.checked = true;
                // Disparar evento change para ocultar campos de suscripción si estaban visibles.
                directSaleRadio.dispatchEvent(new Event('change'));
            }

        } catch (error) {
            // --- 6. Error ---
            console.error('Error al crear pedido:', error);
            // Mostrar mensaje de error al usuario.
            const errorMessage = error.message || (error.responseJSON && error.responseJSON.message) || 'Ocurrió un error desconocido.';
            alert(`Error: ${errorMessage}`);
            // Reactivar el botón para permitir reintentar.
            checkoutButton.disabled = false;

        } finally {
            // --- 7. Siempre (limpieza final) ---
            if (checkoutSpinner) checkoutSpinner.classList.remove('is-active'); // Ocultar spinner.
            // Restaurar texto del botón si el carrito aún tiene items (caso de error).
            if (cart.length > 0) {
                 checkoutButton.textContent = 'Completar Venta';
            }
            // Asegurar que el estado final del botón sea correcto.
             updateCheckoutButtonState();
        }
    }


    // =========================================================================
    // Event Listeners (Configuración Inicial)
    // =========================================================================
    // Añadir listeners a los elementos interactivos.

    // --- Búsqueda de Productos ---
    if (searchButton) {
        searchButton.addEventListener('click', () => searchProducts(searchInput.value));
    }
    if (searchInput) {
        // Permitir búsqueda al presionar Enter en el input.
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // Evitar envío de formulario si estuviera dentro de uno.
                searchProducts(searchInput.value);
            }
        });
    }
    // Listener para añadir productos/variaciones al carrito (delegación en la lista de resultados).
    if (resultsList) {
        resultsList.addEventListener('click', handleAddProductClick);
    }

    // --- Gestión de Clientes (Integrada) ---
    if (customerSearchButton) {
        customerSearchButton.addEventListener('click', () => searchCustomers(customerSearchInput.value));
        console.log(`${CUST_DEBUG_PREFIX} Listener añadido a customerSearchButton.`);
    }
    if (customerSearchInput) {
        customerSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchCustomers(customerSearchInput.value);
            }
        });
        console.log(`${CUST_DEBUG_PREFIX} Listener añadido a customerSearchInput (Enter).`);
    }
    if (customerList) {
        // Delegación para seleccionar cliente desde la lista
        customerList.addEventListener('click', handleCustomerListClick);
        console.log(`${CUST_DEBUG_PREFIX} Listener añadido a customerList (delegación).`);
    }
    if (clearCustomerButton) {
        clearCustomerButton.addEventListener('click', clearCustomerSelection);
        console.log(`${CUST_DEBUG_PREFIX} Listener añadido a clearCustomerButton.`);
    }

    // --- Gestión del Carrito ---
    if (cartItemsList) {
        // Delegación para botones +, -, x dentro de la lista del carrito.
        cartItemsList.addEventListener('click', handleCartActions);
        // Listener para cambios directos en el input de cantidad.
        cartItemsList.addEventListener('change', handleQuantityInputChange); // 'change' es más estándar que 'input' para inputs numéricos.
    }

    // --- Opciones de Venta y Pago ---
    if (saleTypeRadios) {
        // Actualizar UI cuando cambia el tipo de venta.
        saleTypeRadios.forEach(radio => radio.addEventListener('change', toggleSubscriptionTerms));
    }
    if (paymentGatewaySelect) {
        // Actualizar estado del botón de checkout cuando cambia el método de pago.
        paymentGatewaySelect.addEventListener('change', updateCheckoutButtonState);
    }

    // --- Botón Principal de Checkout ---
    if (checkoutButton) {
        checkoutButton.addEventListener('click', handleCheckout);
    }

    // =========================================================================
    // Inicialización al Cargar la Página
    // =========================================================================
    // Ejecutar funciones necesarias al inicio.

    loadPaymentGateways(); // Cargar métodos de pago disponibles.
    displayCart(); // Mostrar estado inicial del carrito (vacío).
    toggleSubscriptionTerms(); // Asegurar visibilidad correcta de campos de suscripción.
    clearCustomerSelection(); // Asegurar que no haya cliente seleccionado al inicio.

    // Establecer fecha por defecto para el campo de fecha de suscripción/evento.
    if (subscriptionStartDateInput) {
        subscriptionStartDateInput.valueAsDate = new Date(); // Poner fecha actual.
    }
    // Asegurar que el campo de nota esté vacío al inicio.
    if (customerNoteTextarea) {
        customerNoteTextarea.value = '';
    }

    // Nota: updateCheckoutButtonState() se llama dentro de displayCart(), loadPaymentGateways(),
    // clearCustomerSelection() y toggleSubscriptionTerms(), por lo que el estado inicial del botón
    // debería ser correcto (deshabilitado).

    console.log('POS App Initialized.');

}); // Fin de DOMContentLoaded

/**
 * Función global simple para formatear precios (si wc_price no está disponible).
 * Esta es una implementación muy básica.
 * @param {number} price
 * @returns {string}
 */
function wc_price(price) {
    if (typeof pos2025_pos_params !== 'undefined') {
        const decimals = pos2025_pos_params.price_decimals || 2;
        const decimalSep = pos2025_pos_params.decimal_sep || '.';
        const thousandSep = pos2025_pos_params.thousand_sep || ',';
        const currencySymbol = pos2025_pos_params.currency_symbol || '$';
        const format = pos2025_pos_params.price_format || '%1$s%2$s'; // %1$s = symbol, %2$s = price

        let formattedPrice = parseFloat(price).toFixed(decimals);
        // Separador de miles (simplificado, no maneja todos los casos)
        formattedPrice = formattedPrice.replace('.', decimalSep);
        // Añadir símbolo
        return format.replace('%1$s', currencySymbol).replace('%2$s', formattedPrice);
    }
    // Fallback muy básico
    return '$' + parseFloat(price).toFixed(2);
}
