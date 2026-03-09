# Plan de Actualización del Módulo POS

## Objetivo
Actualizar el módulo POS para mostrar precios de productos (según lista de precios) y fotos de productos usando la nueva API del backend.

## Cambios Necesarios

### 1. Actualizar Modelo de Product
**Archivo**: `src/app/features/purchase-orders/models/product.model.ts`

**Cambios**:
- Agregar campos: `category_id`, `subcategory_id`, `tenant_id`, `created_at`, `updated_at`
- Agregar relaciones: `category`, `subcategory`, `base_uom`, `photos`, `prices`
- Eliminar campo `cost` (no existe en backend)
- Agregar interfaces: `ProductPhoto`, `ProductPrice`, `PriceList`

### 2. Actualizar ProductService
**Archivo**: `src/app/features/purchase-orders/services/product.service.ts`

**Nuevos métodos necesarios**:
```typescript
// Obtener foto principal de un producto
getPrimaryPhoto(productId: string): Observable<ProductPhoto>

// Obtener URL firmada de foto
getPhotoSignedUrl(productId: string, photoId: string): Observable<{ signed_url: string }>

// Obtener precios de un producto
getProductPrices(productId: string): Observable<ProductPrice[]>

// Obtener lista de precios por defecto
getDefaultPriceList(): Observable<PriceList>

// Obtener precio específico de un producto en una lista
getProductPrice(priceListId: string, productId: string, uomId: string): Observable<number>
```

### 3. Actualizar Componente Take Order
**Archivo**: `src/app/features/pos/pages/take-order/take-order.component.ts`

**Cambios**:
- Cargar lista de precios por defecto al iniciar
- Para cada producto, cargar:
  - Foto principal (si existe)
  - Precio según lista de precios por defecto
- Agregar signals para:
  - `defaultPriceList: PriceList | null`
  - `productPhotos: Map<string, string>` (productId -> signed_url)
  - `productPrices: Map<string, number>` (productId -> price)

**Nuevos métodos**:
```typescript
loadDefaultPriceList(): void
loadProductPhotos(): void
loadProductPrices(): void
getProductPhoto(productId: string): string | null
getProductPrice(productId: string, uomId: string): number
```

### 4. Actualizar Template Take Order
**Archivo**: `src/app/features/pos/pages/take-order/take-order.component.html`

**Cambios**:
- Mostrar foto del producto (o placeholder si no tiene)
- Mostrar precio del producto según UoM seleccionada
- Agregar indicador de carga para fotos
- Mejorar diseño visual con cards para productos

### 5. Actualizar Modelo POSCartItem
**Archivo**: `src/app/features/pos/models/pos.model.ts`

**Agregar campos**:
```typescript
export interface POSCartItem {
  // ... campos existentes
  unit_price: number;        // Precio unitario según lista de precios
  price_list_id?: string;    // ID de la lista de precios usada
  photo_url?: string;        // URL de la foto (opcional)
}
```

## Flujo de Datos

### Al Cargar Componente:
1. Cargar lista de precios por defecto
2. Cargar productos
3. Para cada producto:
   - Cargar foto principal (async)
   - Cargar precio según lista por defecto y base_uom

### Al Agregar Producto al Carrito:
1. Obtener precio según UoM seleccionada
2. Agregar al carrito con precio y foto
3. Calcular subtotal (quantity × unit_price)

### Al Crear Orden:
1. Incluir `price_list_id` en la orden
2. Backend calculará precios automáticamente si no se especifican

## Endpoints del Backend a Usar

```typescript
// Productos
GET /api/tenant/products
GET /api/tenant/products/{id}

// Fotos
GET /api/products/{productId}/photos/primary
GET /api/products/{productId}/photos/{photoId}/signed-url

// Listas de Precios
GET /api/tenant/price-lists/default
GET /api/tenant/price-lists/products/{productId}/prices
GET /api/tenant/price-lists/{priceListId}/products/{productId}/price
```

## Consideraciones de Performance

1. **Caché de Fotos**: Guardar URLs firmadas en memoria (válidas por tiempo limitado)
2. **Caché de Precios**: Guardar precios en Map para evitar múltiples requests
3. **Lazy Loading**: Cargar fotos solo cuando sean visibles (opcional)
4. **Batch Requests**: Considerar cargar múltiples fotos/precios en una sola request (si backend lo soporta)

## Manejo de Errores

1. **Sin foto**: Mostrar placeholder/imagen por defecto
2. **Sin precio**: Mostrar "Precio no disponible" y deshabilitar agregar al carrito
3. **Sin lista de precios**: Mostrar advertencia y permitir crear una

## UI/UX Mejoras

1. **Cards de Productos**:
   - Foto arriba
   - Nombre y SKU
   - Precio destacado
   - Botón "Agregar"

2. **Carrito**:
   - Mostrar foto miniatura
   - Precio unitario y subtotal
   - Total general

3. **Estados de Carga**:
   - Skeleton loaders para fotos
   - Spinners para precios

## Prioridad de Implementación

1. ✅ **Alta**: Actualizar modelo y servicio
2. ✅ **Alta**: Cargar y mostrar precios
3. ✅ **Media**: Cargar y mostrar fotos
4. ⚠️ **Baja**: Optimizaciones de performance
5. ⚠️ **Baja**: Mejoras visuales avanzadas

## Compatibilidad

- Mantener compatibilidad con código existente
- Agregar campos opcionales para no romper funcionalidad actual
- Migración gradual de `cost` a `unit_price`
