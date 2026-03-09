# Requirements Document

## Introduction

Este documento especifica los requisitos para actualizar el módulo POS (Point of Sale) para integrar el sistema de precios y fotos de productos del backend. El módulo actual utiliza un modelo simplificado de productos que no incluye fotos ni maneja listas de precios, lo que impide mostrar información visual de productos y calcular precios correctos según la lista de precios activa.

La actualización permitirá al módulo POS mostrar fotos de productos en la vista de selección, obtener precios correctos desde la lista de precios por defecto del tenant, y calcular totales precisos basados en estos precios.

## Glossary

- **POS_Module**: El módulo de Point of Sale que permite crear órdenes de venta rápidamente
- **Product_Service**: Servicio Angular que gestiona la comunicación con la API de productos
- **Price_List_Service**: Servicio Angular que gestiona listas de precios y precios de productos
- **Product_Photo_Service**: Servicio Angular que gestiona fotos de productos y URLs firmadas
- **Product_Model**: Modelo TypeScript que representa un producto
- **POSCartItem_Model**: Modelo TypeScript que representa un item en el carrito POS
- **Backend_API**: API REST del backend que provee endpoints de productos, precios y fotos
- **Signed_URL**: URL temporal firmada de S3 para acceder a fotos de productos
- **Default_Price_List**: Lista de precios configurada como predeterminada para el tenant
- **UoM**: Unit of Measure (Unidad de Medida) - ej: pieza, caja, kilogramo
- **Take_Order_Component**: Componente Angular principal del módulo POS
- **Product_Card**: Elemento visual que muestra información de un producto en la vista de selección

## Requirements

### Requirement 1: Integrar Fotos de Productos en el Modelo

**User Story:** Como desarrollador, quiero que el modelo de Product incluya información de fotos, para que el módulo POS pueda mostrar imágenes de productos.

#### Acceptance Criteria

1. THE Product_Model SHALL include a `primary_photo_id` field of type string or null
2. THE Product_Model SHALL include a `primary_photo_url` field of type string or null for caching signed URLs
3. THE Product_Model SHALL include a `photo_url_expires_at` field of type Date or null to track URL expiration
4. THE Product_Model SHALL maintain backward compatibility with existing code that uses the current Product interface

### Requirement 2: Integrar Listas de Precios en el Modelo

**User Story:** Como desarrollador, quiero que el módulo POS maneje listas de precios, para que pueda obtener precios correctos según la configuración del tenant.

#### Acceptance Criteria

1. THE POSCartItem_Model SHALL use `unit_price` field to store the price from the active price list
2. THE Product_Model SHALL remove the deprecated `cost` field from the interface
3. WHEN a product is added to cart, THE POS_Module SHALL obtain the unit price from the Default_Price_List
4. THE POS_Module SHALL store the active price list ID in component state

### Requirement 3: Servicio de Listas de Precios

**User Story:** Como desarrollador, quiero un servicio que gestione listas de precios, para que el módulo POS pueda obtener precios de productos.

#### Acceptance Criteria

1. THE Price_List_Service SHALL provide a method to get the Default_Price_List
2. WHEN requesting product prices, THE Price_List_Service SHALL call the endpoint `/api/tenant/price-lists/products/{productId}/prices`
3. THE Price_List_Service SHALL cache the Default_Price_List for 5 minutes
4. WHEN a price is not found for a product and UoM combination, THE Price_List_Service SHALL return null
5. THE Price_List_Service SHALL provide a method to get price for a specific product, UoM, and price list

### Requirement 4: Servicio de Fotos de Productos

**User Story:** Como desarrollador, quiero un servicio que gestione fotos de productos, para que el módulo POS pueda obtener y cachear URLs firmadas.

#### Acceptance Criteria

1. THE Product_Photo_Service SHALL provide a method to get the primary photo Signed_URL for a product
2. WHEN requesting a photo URL, THE Product_Photo_Service SHALL call the endpoint `/api/products/{productId}/photos/primary`
3. THE Product_Photo_Service SHALL cache Signed_URLs with their expiration timestamps
4. WHEN a cached Signed_URL is expired or will expire within 5 minutes, THE Product_Photo_Service SHALL request a new Signed_URL
5. WHEN a product has no primary photo, THE Product_Photo_Service SHALL return null
6. THE Product_Photo_Service SHALL provide a method to clear expired URLs from cache

### Requirement 5: Actualizar Product Service

**User Story:** Como desarrollador, quiero que el Product Service integre fotos y precios, para que provea datos completos al módulo POS.

#### Acceptance Criteria

1. WHEN fetching products, THE Product_Service SHALL enrich each product with its primary photo URL
2. WHEN fetching products, THE Product_Service SHALL enrich each product with its price from the Default_Price_List
3. THE Product_Service SHALL handle products without photos by setting `primary_photo_url` to null
4. THE Product_Service SHALL handle products without prices by setting a flag indicating price unavailability
5. THE Product_Service SHALL maintain the existing cache mechanism for products
6. WHEN cache is cleared, THE Product_Service SHALL also clear photo and price caches

### Requirement 6: Mostrar Fotos en la Vista de Selección de Productos

**User Story:** Como usuario del POS, quiero ver fotos de los productos, para que pueda identificarlos visualmente y seleccionarlos más rápido.

#### Acceptance Criteria

1. WHEN displaying products in the selection view, THE Take_Order_Component SHALL show the primary photo for each product
2. WHEN a product has no photo, THE Take_Order_Component SHALL display a placeholder image
3. THE Product_Card SHALL display the photo with dimensions of 80x80 pixels
4. WHEN a photo URL is expired, THE Take_Order_Component SHALL request a new Signed_URL automatically
5. THE Product_Card SHALL show a loading indicator while the photo is being fetched

### Requirement 7: Mostrar Precios en la Vista de Selección

**User Story:** Como usuario del POS, quiero ver el precio de cada producto, para que pueda conocer el costo antes de agregarlo al carrito.

#### Acceptance Criteria

1. WHEN displaying products in the selection view, THE Take_Order_Component SHALL show the unit price from the Default_Price_List
2. WHEN a product has multiple UoMs, THE Take_Order_Component SHALL show the price for the base UoM
3. WHEN a product has no price in the Default_Price_List, THE Take_Order_Component SHALL display "Sin precio"
4. THE Product_Card SHALL format prices with currency symbol and 2 decimal places

### Requirement 8: Deshabilitar Productos Sin Precio

**User Story:** Como usuario del POS, quiero que los productos sin precio no se puedan agregar al carrito, para que evite errores en las órdenes de venta.

#### Acceptance Criteria

1. WHEN a product has no price in the Default_Price_List, THE Take_Order_Component SHALL disable the add-to-cart button
2. WHEN hovering over a disabled product, THE Take_Order_Component SHALL show a tooltip explaining "Producto sin precio configurado"
3. THE Product_Card SHALL visually indicate when a product is disabled with reduced opacity

### Requirement 9: Calcular Totales con Precios de Lista

**User Story:** Como usuario del POS, quiero que los totales se calculen con los precios correctos, para que las órdenes reflejen los precios actuales.

#### Acceptance Criteria

1. WHEN adding a product to cart, THE Take_Order_Component SHALL use the unit price from the Default_Price_List
2. WHEN calculating line totals, THE Take_Order_Component SHALL multiply quantity by unit_price
3. WHEN calculating cart totals, THE Take_Order_Component SHALL sum all line totals correctly
4. THE POSCartItem_Model SHALL store the unit_price used at the time of adding to cart
5. WHEN the price list is updated, THE Take_Order_Component SHALL not update prices of items already in cart

### Requirement 10: Mostrar Precio Unitario en el Carrito

**User Story:** Como usuario del POS, quiero ver el precio unitario de cada item en el carrito, para que pueda verificar los precios antes de completar la venta.

#### Acceptance Criteria

1. WHEN displaying cart items, THE Take_Order_Component SHALL show the unit_price for each item
2. THE Take_Order_Component SHALL format unit prices with currency symbol and 2 decimal places
3. WHEN displaying cart items with different UoMs, THE Take_Order_Component SHALL show the UoM name next to the unit price

### Requirement 11: Optimizar Carga de Fotos y Precios

**User Story:** Como usuario del POS, quiero que la interfaz cargue rápidamente, para que pueda atender clientes sin demoras.

#### Acceptance Criteria

1. THE Product_Photo_Service SHALL cache Signed_URLs to minimize API calls
2. THE Price_List_Service SHALL cache the Default_Price_List to minimize API calls
3. WHEN loading the product list, THE Take_Order_Component SHALL load photos and prices in parallel
4. THE Take_Order_Component SHALL implement lazy loading for product photos when scrolling
5. WHEN a Signed_URL is about to expire, THE Product_Photo_Service SHALL prefetch a new URL in background

### Requirement 12: Manejo de Errores en Carga de Fotos

**User Story:** Como usuario del POS, quiero que el sistema maneje errores de carga de fotos gracefully, para que pueda seguir trabajando aunque las fotos no carguen.

#### Acceptance Criteria

1. WHEN a photo fails to load, THE Take_Order_Component SHALL display the placeholder image
2. WHEN the photo service returns an error, THE Product_Photo_Service SHALL log the error and return null
3. THE Take_Order_Component SHALL not block product selection if photos fail to load
4. WHEN a Signed_URL is invalid or expired, THE Product_Photo_Service SHALL request a new URL automatically

### Requirement 13: Manejo de Errores en Carga de Precios

**User Story:** Como usuario del POS, quiero que el sistema maneje errores de precios claramente, para que sepa cuándo un producto no tiene precio configurado.

#### Acceptance Criteria

1. WHEN the price service returns an error, THE Price_List_Service SHALL log the error and return null
2. WHEN a product has no price, THE Take_Order_Component SHALL show a clear message to the user
3. WHEN the Default_Price_List cannot be loaded, THE Take_Order_Component SHALL show an error notification
4. IF the Default_Price_List fails to load, THEN THE Take_Order_Component SHALL disable adding products to cart

### Requirement 14: Actualizar Product Service para Respuesta Paginada

**User Story:** Como desarrollador, quiero que el Product Service maneje correctamente la respuesta paginada del backend, para que obtenga todos los productos disponibles.

#### Acceptance Criteria

1. WHEN calling `/api/tenant/products`, THE Product_Service SHALL extract products from the `data` field of the response
2. THE Product_Service SHALL handle both array responses and paginated responses with `{data: Product[]}`
3. THE Product_Service SHALL maintain backward compatibility with existing code expecting an array of products
