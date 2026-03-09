# Design Document: POS Prices and Photos Integration

## Overview

Este documento describe el diseño técnico para integrar el sistema de precios y fotos de productos en el módulo POS. La actualización permitirá mostrar fotos de productos, obtener precios desde listas de precios configuradas, y calcular totales correctos basados en estos precios.

### Objetivos del Diseño

1. Integrar fotos de productos con URLs firmadas de S3 en la vista de selección del POS
2. Implementar sistema de listas de precios para obtener precios correctos por producto y UoM
3. Actualizar el modelo de datos para soportar fotos y precios dinámicos
4. Optimizar la carga de fotos y precios mediante caché y carga paralela
5. Manejar errores gracefully para mantener la funcionalidad del POS

### Alcance

**Incluye:**
- Nuevos servicios: `PriceListService` y `ProductPhotoService`
- Actualización del modelo `Product` para incluir campos de foto
- Actualización del modelo `POSCartItem` para usar `unit_price` de listas de precios
- Modificación del componente `TakeOrderComponent` para mostrar fotos y precios
- Sistema de caché para URLs firmadas y listas de precios
- Manejo de errores y estados de carga

**No incluye:**
- Edición de fotos de productos (módulo de Settings)
- Gestión de listas de precios (módulo de Settings)
- Múltiples listas de precios por sesión (solo lista por defecto)
- Descuentos o promociones especiales

## Architecture

### Component Diagram

```mermaid
graph TB
    subgraph "POS Module"
        TOC[Take Order Component]
        POSC[POS Service]
    end
    
    subgraph "New Services"
        PLS[Price List Service]
        PPS[Product Photo Service]
    end
    
    subgraph "Existing Services"
        PS[Product Service]
        WS[Warehouse Service]
        SOS[Sales Order Service]
    end
    
    subgraph "Backend API"
        PAPI[Products API]
        PLAPI[Price Lists API]
        PHAPI[Photos API]
    end
    
    TOC -->|get products| PS
    TOC -->|get warehouses| WS
    TOC -->|create order| SOS
    TOC -->|manage cart| POSC
    
    PS -->|enrich with photos| PPS
    PS -->|enrich with prices| PLS
    
    PLS -->|fetch default list| PLAPI
    PLS -->|fetch product prices| PLAPI
    PPS -->|fetch signed URLs| PHAPI
    
    PS -->|fetch products| PAPI
    
    style TOC fill:#e1f5ff
    style PLS fill:#fff4e1
    style PPS fill:#fff4e1
```

### Data Flow

```mermaid
sequenceDiagram
    participant User
    participant TakeOrder
    participant ProductService
    participant PriceListService
    participant ProductPhotoService
    participant Backend
    
    User->>TakeOrder: Load POS
    TakeOrder->>ProductService: getProducts()
    
    ProductService->>Backend: GET /api/tenant/products
    Backend-->>ProductService: {data: Product[]}
    
    par Parallel Enrichment
        ProductService->>PriceListService: getDefaultPriceList()
        PriceListService->>Backend: GET /api/tenant/price-lists?is_default=true
        Backend-->>PriceListService: PriceList
        
        loop For each product
            ProductService->>PriceListService: getProductPrice(productId, uomId, priceListId)
            PriceListService-->>ProductService: ProductPrice | null
            
            ProductService->>ProductPhotoService: getPrimaryPhotoUrl(productId)
            ProductPhotoService->>Backend: GET /api/products/{id}/photos/primary
            Backend-->>ProductPhotoService: {signed_url, expires_at}
            ProductPhotoService-->>ProductService: signed_url | null
        end
    end
    
    ProductService-->>TakeOrder: Enriched Products
    TakeOrder->>User: Display products with photos and prices
    
    User->>TakeOrder: Add product to cart
    TakeOrder->>TakeOrder: Validate price exists
    TakeOrder->>POSService: addItem(cartItem)
```

### Service Architecture

#### Price List Service

**Responsabilidades:**
- Obtener la lista de precios por defecto del tenant
- Consultar precios de productos por UoM
- Cachear lista de precios y precios de productos
- Manejar expiración de caché

**Caché Strategy:**
- Lista de precios por defecto: 5 minutos
- Precios de productos: 5 minutos
- Invalidación manual disponible

#### Product Photo Service

**Responsabilidades:**
- Obtener URLs firmadas de fotos primarias
- Cachear URLs con timestamps de expiración
- Renovar URLs próximas a expirar (< 5 minutos)
- Limpiar URLs expiradas del caché

**Caché Strategy:**
- URLs firmadas: hasta expiración (típicamente 1 hora)
- Prefetch automático cuando quedan < 5 minutos
- Limpieza periódica de URLs expiradas

#### Product Service (Updated)

**Nuevas responsabilidades:**
- Enriquecer productos con fotos primarias
- Enriquecer productos con precios de lista por defecto
- Coordinar carga paralela de fotos y precios
- Mantener compatibilidad con código existente

## Components and Interfaces

### Data Models

#### Updated Product Model (purchase-orders module)

```typescript
/**
 * Product entity used in POS module
 * Extended to support photos and price lists
 */
export interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string;
  
  // Deprecated: will be removed in favor of price lists
  // @deprecated Use price from PriceListService instead
  cost?: number;
  
  base_uom_id: string;
  uoms: UnitOfMeasure[];
  
  // Photo fields (new)
  primary_photo_id?: string | null;
  primary_photo_url?: string | null;
  photo_url_expires_at?: Date | null;
  
  // Price availability flag (new)
  has_price?: boolean;
}
```

#### Updated POSCartItem Model

```typescript
/**
 * POS Cart Item
 * Updated to use unit_price from price lists
 */
export interface POSCartItem {
  product_id: string;
  product_name: string;
  product_sku: string;
  uom_id: string;
  uom_name: string;
  quantity: number;
  
  // Price from active price list (locked at add-to-cart time)
  unit_price: number;
  
  iva_percentage: number;
  ieps_percentage: number;
  
  // Calculated fields
  subtotal: number;
  iva_amount: number;
  ieps_amount: number;
  line_total: number;
}
```

#### Price List Models

```typescript
/**
 * Price List entity
 */
export interface PriceList {
  id: string;
  tenant_id: string;
  name: string;
  description?: string | null;
  is_default: boolean;
  is_active: boolean;
  valid_from?: string | null;
  valid_to?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Product Price entity
 */
export interface ProductPrice {
  id: string;
  price_list_id: string;
  product_id: string;
  uom_id: string;
  price: number;
  created_at: string;
  updated_at: string;
}

/**
 * Response from price list products endpoint
 */
export interface ProductPricesResponse {
  product_id: string;
  prices: ProductPrice[];
}
```

#### Product Photo Models

```typescript
/**
 * Product Photo entity
 */
export interface ProductPhoto {
  id: string;
  product_id: string;
  s3_key: string;
  s3_bucket: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  alt_text?: string | null;
  display_order: number;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Response from primary photo endpoint
 */
export interface PrimaryPhotoResponse {
  photo: ProductPhoto;
  signed_url: string;
  expires_at: string; // ISO 8601 timestamp
}
```

#### Cache Models

```typescript
/**
 * Cached photo URL with expiration
 */
interface CachedPhotoUrl {
  url: string;
  expires_at: Date;
  product_id: string;
}

/**
 * Cached price list with timestamp
 */
interface CachedPriceList {
  price_list: PriceList;
  cached_at: Date;
}

/**
 * Cached product price
 */
interface CachedProductPrice {
  price: number;
  cached_at: Date;
  product_id: string;
  uom_id: string;
  price_list_id: string;
}
```

### Service Interfaces

#### PriceListService

```typescript
@Injectable({
  providedIn: 'root'
})
export class PriceListService {
  private readonly API_URL = '/api/tenant/price-lists';
  private readonly CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
  
  // Cache
  private defaultPriceListCache = signal<CachedPriceList | null>(null);
  private productPricesCache = new Map<string, CachedProductPrice>();
  
  constructor(private http: HttpClient) {}
  
  /**
   * Get the default price list for the tenant
   * Returns cached value if available and not expired
   */
  getDefaultPriceList(): Observable<PriceList | null> {
    const cached = this.defaultPriceListCache();
    
    if (cached && !this.isCacheExpired(cached.cached_at)) {
      return of(cached.price_list);
    }
    
    return this.http.get<PriceList[]>(`${this.API_URL}?is_default=true`).pipe(
      map(lists => lists.length > 0 ? lists[0] : null),
      tap(priceList => {
        if (priceList) {
          this.defaultPriceListCache.set({
            price_list: priceList,
            cached_at: new Date()
          });
        }
      }),
      catchError(error => {
        console.error('Error fetching default price list:', error);
        return of(null);
      })
    );
  }
  
  /**
   * Get price for a specific product, UoM, and price list
   * Returns null if no price is configured
   */
  getProductPrice(
    productId: string,
    uomId: string,
    priceListId: string
  ): Observable<number | null> {
    const cacheKey = `${productId}-${uomId}-${priceListId}`;
    const cached = this.productPricesCache.get(cacheKey);
    
    if (cached && !this.isCacheExpired(cached.cached_at)) {
      return of(cached.price);
    }
    
    return this.http.get<ProductPricesResponse>(
      `${this.API_URL}/products/${productId}/prices`
    ).pipe(
      map(response => {
        const priceEntry = response.prices.find(
          p => p.uom_id === uomId && p.price_list_id === priceListId
        );
        return priceEntry ? priceEntry.price : null;
      }),
      tap(price => {
        if (price !== null) {
          this.productPricesCache.set(cacheKey, {
            price,
            cached_at: new Date(),
            product_id: productId,
            uom_id: uomId,
            price_list_id: priceListId
          });
        }
      }),
      catchError(error => {
        console.error(`Error fetching price for product ${productId}:`, error);
        return of(null);
      })
    );
  }
  
  /**
   * Clear all caches
   */
  clearCache(): void {
    this.defaultPriceListCache.set(null);
    this.productPricesCache.clear();
  }
  
  /**
   * Check if cache entry is expired
   */
  private isCacheExpired(cachedAt: Date): boolean {
    return Date.now() - cachedAt.getTime() > this.CACHE_DURATION_MS;
  }
}
```



#### ProductPhotoService

```typescript
@Injectable({
  providedIn: 'root'
})
export class ProductPhotoService {
  private readonly API_URL = '/api/products';
  private readonly PREFETCH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
  
  // Cache: Map<product_id, CachedPhotoUrl>
  private photoUrlCache = new Map<string, CachedPhotoUrl>();
  
  constructor(private http: HttpClient) {
    // Clean expired URLs every minute
    setInterval(() => this.cleanExpiredUrls(), 60 * 1000);
  }
  
  /**
   * Get primary photo signed URL for a product
   * Returns cached URL if available and not expired
   * Prefetches new URL if expiring soon
   */
  getPrimaryPhotoUrl(productId: string): Observable<string | null> {
    const cached = this.photoUrlCache.get(productId);
    
    // Check if we have a valid cached URL
    if (cached && !this.isUrlExpired(cached.expires_at)) {
      // Prefetch if expiring soon
      if (this.isUrlExpiringSoon(cached.expires_at)) {
        this.prefetchPhotoUrl(productId);
      }
      return of(cached.url);
    }
    
    // Fetch new URL
    return this.fetchPhotoUrl(productId);
  }
  
  /**
   * Fetch photo URL from backend
   */
  private fetchPhotoUrl(productId: string): Observable<string | null> {
    return this.http.get<PrimaryPhotoResponse>(
      `${this.API_URL}/${productId}/photos/primary`
    ).pipe(
      map(response => {
        const url = response.signed_url;
        const expiresAt = new Date(response.expires_at);
        
        this.photoUrlCache.set(productId, {
          url,
          expires_at: expiresAt,
          product_id: productId
        });
        
        return url;
      }),
      catchError(error => {
        // 404 means no photo exists
        if (error.status === 404) {
          return of(null);
        }
        console.error(`Error fetching photo for product ${productId}:`, error);
        return of(null);
      })
    );
  }
  
  /**
   * Prefetch photo URL in background
   */
  private prefetchPhotoUrl(productId: string): void {
    this.fetchPhotoUrl(productId).subscribe();
  }
  
  /**
   * Check if URL is expired
   */
  private isUrlExpired(expiresAt: Date): boolean {
    return Date.now() >= expiresAt.getTime();
  }
  
  /**
   * Check if URL is expiring soon (within threshold)
   */
  private isUrlExpiringSoon(expiresAt: Date): boolean {
    return expiresAt.getTime() - Date.now() < this.PREFETCH_THRESHOLD_MS;
  }
  
  /**
   * Clean expired URLs from cache
   */
  private cleanExpiredUrls(): void {
    const now = Date.now();
    for (const [productId, cached] of this.photoUrlCache.entries()) {
      if (now >= cached.expires_at.getTime()) {
        this.photoUrlCache.delete(productId);
      }
    }
  }
  
  /**
   * Clear all cached URLs
   */
  clearCache(): void {
    this.photoUrlCache.clear();
  }
  
  /**
   * Get cache statistics (for debugging)
   */
  getCacheStats(): { total: number; expired: number } {
    const now = Date.now();
    let expired = 0;
    
    for (const cached of this.photoUrlCache.values()) {
      if (now >= cached.expires_at.getTime()) {
        expired++;
      }
    }
    
    return {
      total: this.photoUrlCache.size,
      expired
    };
  }
}
```

#### Updated ProductService

```typescript
@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private readonly API_URL = '/api/tenant/products';
  
  constructor(
    private http: HttpClient,
    private priceListService: PriceListService,
    private productPhotoService: ProductPhotoService
  ) {}
  
  /**
   * Get all products enriched with photos and prices
   */
  getProducts(): Observable<Product[]> {
    return this.http.get<{ data: Product[] } | Product[]>(this.API_URL).pipe(
      // Handle both array and paginated responses
      map(response => Array.isArray(response) ? response : response.data),
      
      // Enrich with photos and prices
      switchMap(products => this.enrichProducts(products)),
      
      catchError(error => {
        console.error('Error fetching products:', error);
        return throwError(() => error);
      })
    );
  }
  
  /**
   * Enrich products with photos and prices in parallel
   */
  private enrichProducts(products: Product[]): Observable<Product[]> {
    // First, get the default price list
    return this.priceListService.getDefaultPriceList().pipe(
      switchMap(priceList => {
        if (!priceList) {
          console.warn('No default price list found');
          return of(products.map(p => ({ ...p, has_price: false })));
        }
        
        // Enrich each product with photo and price in parallel
        const enrichedProducts$ = products.map(product =>
          this.enrichSingleProduct(product, priceList.id)
        );
        
        return forkJoin(enrichedProducts$);
      })
    );
  }
  
  /**
   * Enrich a single product with photo and price
   */
  private enrichSingleProduct(
    product: Product,
    priceListId: string
  ): Observable<Product> {
    const baseUomId = product.base_uom_id;
    
    // Fetch photo and price in parallel
    return forkJoin({
      photoUrl: this.productPhotoService.getPrimaryPhotoUrl(product.id),
      price: this.priceListService.getProductPrice(
        product.id,
        baseUomId,
        priceListId
      )
    }).pipe(
      map(({ photoUrl, price }) => ({
        ...product,
        primary_photo_url: photoUrl,
        photo_url_expires_at: photoUrl ? new Date(Date.now() + 3600000) : null,
        has_price: price !== null,
        cost: price ?? product.cost ?? 0 // Fallback for backward compatibility
      }))
    );
  }
  
  /**
   * Clear all caches
   */
  clearCache(): void {
    this.priceListService.clearCache();
    this.productPhotoService.clearCache();
  }
}
```

### Component Updates

#### Updated TakeOrderComponent

```typescript
@Component({
  selector: 'app-take-order',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './take-order.component.html',
  styleUrls: ['./take-order.component.scss']
})
export class TakeOrderComponent implements OnInit {
  // Existing signals
  products = signal<Product[]>([]);
  warehouses = signal<Warehouse[]>([]);
  filteredProducts = signal<Product[]>([]);
  selectedWarehouse = signal<string>('');
  searchTerm = signal<string>('');
  loading = signal<boolean>(false);
  saving = signal<boolean>(false);
  
  // New signals for photos and prices
  loadingPhotos = signal<boolean>(false);
  loadingPrices = signal<boolean>(false);
  priceListError = signal<boolean>(false);
  activePriceListId = signal<string | null>(null);
  
  // Photo loading state per product
  photoLoadingStates = signal<Map<string, boolean>>(new Map());
  photoErrorStates = signal<Map<string, boolean>>(new Map());
  
  constructor(
    public posService: POSService,
    private productService: ProductService,
    private warehouseService: WarehouseService,
    private salesOrderService: SalesOrderService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}
  
  ngOnInit(): void {
    this.loadData();
  }
  
  /**
   * Load products and warehouses
   * Products are enriched with photos and prices by ProductService
   */
  loadData(): void {
    this.loading.set(true);
    this.priceListError.set(false);
    
    // Load products (already enriched with photos and prices)
    this.productService.getProducts().subscribe({
      next: (products) => {
        this.products.set(products);
        this.filteredProducts.set(products);
        this.loading.set(false);
        
        // Check if any products lack prices
        const productsWithoutPrice = products.filter(p => !p.has_price);
        if (productsWithoutPrice.length > 0) {
          console.warn(
            `${productsWithoutPrice.length} products without prices`,
            productsWithoutPrice.map(p => p.sku)
          );
        }
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.loading.set(false);
        this.snackBar.open(
          'Error al cargar productos',
          'Cerrar',
          { duration: 5000 }
        );
      }
    });
    
    // Load warehouses
    this.warehouseService.getWarehouses().subscribe({
      next: (warehouses) => {
        const warehouseArray = Array.isArray(warehouses) 
          ? warehouses 
          : (warehouses as any).data || [];
        this.warehouses.set(warehouseArray);
        if (warehouseArray.length > 0) {
          this.selectedWarehouse.set(warehouseArray[0].id);
        }
      },
      error: (error) => {
        console.error('Error loading warehouses:', error);
        this.snackBar.open(
          'Error al cargar almacenes',
          'Cerrar',
          { duration: 5000 }
        );
      }
    });
  }
  
  /**
   * Handle search input
   */
  onSearchChange(): void {
    const term = this.searchTerm().toLowerCase();
    if (!term) {
      this.filteredProducts.set(this.products());
      return;
    }
    
    const filtered = this.products().filter(p =>
      p.name.toLowerCase().includes(term) ||
      p.sku.toLowerCase().includes(term)
    );
    this.filteredProducts.set(filtered);
  }
  
  /**
   * Add product to cart
   * Validates that product has a price before adding
   */
  addProductToCart(product: Product): void {
    // Validate product has price
    if (!product.has_price) {
      this.snackBar.open(
        'Este producto no tiene precio configurado',
        'Cerrar',
        { duration: 3000 }
      );
      return;
    }
    
    // Validate UoMs
    if (!product.uoms || product.uoms.length === 0) {
      this.snackBar.open(
        'Producto sin unidades de medida',
        'Cerrar',
        { duration: 3000 }
      );
      return;
    }
    
    const baseUom = product.uoms.find(u => u.id === product.base_uom_id) 
      || product.uoms[0];
    
    const cartItem: POSCartItem = {
      product_id: product.id,
      product_name: product.name,
      product_sku: product.sku,
      uom_id: baseUom.id,
      uom_name: baseUom.name,
      quantity: 1,
      unit_price: product.cost || 0, // Price from enriched product
      iva_percentage: 16,
      ieps_percentage: 0,
      subtotal: 0,
      iva_amount: 0,
      ieps_amount: 0,
      line_total: 0
    };
    
    // Calculate totals
    const subtotal = cartItem.quantity * cartItem.unit_price;
    const iva_amount = subtotal * (cartItem.iva_percentage / 100);
    const ieps_amount = subtotal * (cartItem.ieps_percentage / 100);
    cartItem.subtotal = subtotal;
    cartItem.iva_amount = iva_amount;
    cartItem.ieps_amount = ieps_amount;
    cartItem.line_total = subtotal + iva_amount + ieps_amount;
    
    this.posService.addItem(cartItem);
    this.snackBar.open(
      `${product.name} agregado`,
      'Cerrar',
      { duration: 2000 }
    );
  }
  
  /**
   * Get photo URL for a product
   * Returns placeholder if no photo or error
   */
  getProductPhotoUrl(product: Product): string {
    if (product.primary_photo_url) {
      return product.primary_photo_url;
    }
    return 'assets/images/product-placeholder.png';
  }
  
  /**
   * Check if product photo is loading
   */
  isPhotoLoading(productId: string): boolean {
    return this.photoLoadingStates().get(productId) || false;
  }
  
  /**
   * Check if product photo has error
   */
  hasPhotoError(productId: string): boolean {
    return this.photoErrorStates().get(productId) || false;
  }
  
  /**
   * Handle photo load error
   */
  onPhotoError(productId: string): void {
    const errorStates = new Map(this.photoErrorStates());
    errorStates.set(productId, true);
    this.photoErrorStates.set(errorStates);
  }
  
  /**
   * Handle photo load success
   */
  onPhotoLoad(productId: string): void {
    const loadingStates = new Map(this.photoLoadingStates());
    loadingStates.set(productId, false);
    this.photoLoadingStates.set(loadingStates);
  }
  
  /**
   * Check if product can be added to cart
   */
  canAddToCart(product: Product): boolean {
    return product.has_price === true;
  }
  
  /**
   * Get tooltip for disabled product
   */
  getDisabledTooltip(product: Product): string {
    if (!product.has_price) {
      return 'Producto sin precio configurado';
    }
    return '';
  }
  
  // Existing methods remain unchanged
  updateQuantity(index: number, quantity: number): void {
    if (quantity <= 0) {
      this.posService.removeItem(index);
    } else {
      this.posService.updateItemQuantity(index, quantity);
    }
  }
  
  removeItem(index: number): void {
    this.posService.removeItem(index);
  }
  
  saveOrder(): void {
    if (!this.selectedWarehouse()) {
      this.snackBar.open('Selecciona un almacén', 'Cerrar', { duration: 3000 });
      return;
    }
    
    const cart = this.posService.cart();
    if (cart.items.length === 0) {
      this.snackBar.open('Agrega productos a la orden', 'Cerrar', { duration: 3000 });
      return;
    }
    
    this.saving.set(true);
    const orderData = this.posService.getCartForOrder(this.selectedWarehouse());
    
    this.salesOrderService.createOrder(orderData).subscribe({
      next: (order) => {
        this.snackBar.open('Orden creada exitosamente', 'Cerrar', { duration: 3000 });
        this.posService.clearCart();
        this.router.navigate(['/pos']);
      },
      error: (error) => {
        this.snackBar.open(
          error.message || 'Error al crear orden',
          'Cerrar',
          { duration: 5000 }
        );
        this.saving.set(false);
      }
    });
  }
  
  cancel(): void {
    if (confirm('¿Descartar orden actual?')) {
      this.posService.clearCart();
      this.router.navigate(['/pos']);
    }
  }
  
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  }
}
```



### Template Structure

#### Updated take-order.component.html

```html
<div class="take-order-container">
  <!-- Header -->
  <div class="header">
    <h1>Nueva Orden</h1>
    <div class="actions">
      <button class="btn-secondary" (click)="cancel()">Cancelar</button>
      <button 
        class="btn-primary" 
        (click)="saveOrder()"
        [disabled]="saving() || posService.cart().items.length === 0">
        {{ saving() ? 'Guardando...' : 'Guardar Orden' }}
      </button>
    </div>
  </div>

  <!-- Main Content -->
  <div class="content">
    <!-- Left Panel: Product Selection -->
    <div class="products-panel">
      <!-- Search Bar -->
      <div class="search-bar">
        <input
          type="text"
          placeholder="Buscar productos..."
          [ngModel]="searchTerm()"
          (ngModelChange)="searchTerm.set($event); onSearchChange()"
          class="search-input"
        />
      </div>

      <!-- Loading State -->
      <div *ngIf="loading()" class="loading-state">
        <div class="spinner"></div>
        <p>Cargando productos...</p>
      </div>

      <!-- Products Grid -->
      <div *ngIf="!loading()" class="products-grid">
        <div
          *ngFor="let product of filteredProducts()"
          class="product-card"
          [class.disabled]="!canAddToCart(product)"
          [title]="getDisabledTooltip(product)"
        >
          <!-- Product Photo -->
          <div class="product-photo">
            <img
              [src]="getProductPhotoUrl(product)"
              [alt]="product.name"
              (error)="onPhotoError(product.id)"
              (load)="onPhotoLoad(product.id)"
              class="photo-img"
            />
            <div *ngIf="isPhotoLoading(product.id)" class="photo-loading">
              <div class="spinner-small"></div>
            </div>
          </div>

          <!-- Product Info -->
          <div class="product-info">
            <h3 class="product-name">{{ product.name }}</h3>
            <p class="product-sku">SKU: {{ product.sku }}</p>
            
            <!-- Price Display -->
            <div class="product-price">
              <span *ngIf="product.has_price" class="price">
                {{ formatCurrency(product.cost || 0) }}
              </span>
              <span *ngIf="!product.has_price" class="no-price">
                Sin precio
              </span>
            </div>
          </div>

          <!-- Add Button -->
          <button
            class="btn-add"
            (click)="addProductToCart(product)"
            [disabled]="!canAddToCart(product)"
          >
            <span *ngIf="canAddToCart(product)">+</span>
            <span *ngIf="!canAddToCart(product)">⚠</span>
          </button>
        </div>

        <!-- Empty State -->
        <div *ngIf="filteredProducts().length === 0" class="empty-state">
          <p>No se encontraron productos</p>
        </div>
      </div>
    </div>

    <!-- Right Panel: Cart -->
    <div class="cart-panel">
      <h2>Carrito</h2>

      <!-- Warehouse Selection -->
      <div class="warehouse-select">
        <label>Almacén:</label>
        <select
          [ngModel]="selectedWarehouse()"
          (ngModelChange)="selectedWarehouse.set($event)"
        >
          <option *ngFor="let warehouse of warehouses()" [value]="warehouse.id">
            {{ warehouse.name }}
          </option>
        </select>
      </div>

      <!-- Cart Items -->
      <div class="cart-items">
        <div *ngIf="posService.cart().items.length === 0" class="empty-cart">
          <p>El carrito está vacío</p>
        </div>

        <div
          *ngFor="let item of posService.cart().items; let i = index"
          class="cart-item"
        >
          <div class="item-info">
            <h4>{{ item.product_name }}</h4>
            <p class="item-sku">{{ item.product_sku }}</p>
            <p class="item-price">
              {{ formatCurrency(item.unit_price) }} / {{ item.uom_name }}
            </p>
          </div>

          <div class="item-controls">
            <input
              type="number"
              min="1"
              [value]="item.quantity"
              (change)="updateQuantity(i, +$any($event.target).value)"
              class="quantity-input"
            />
            <button class="btn-remove" (click)="removeItem(i)">×</button>
          </div>

          <div class="item-total">
            {{ formatCurrency(item.line_total) }}
          </div>
        </div>
      </div>

      <!-- Cart Totals -->
      <div class="cart-totals">
        <div class="total-row">
          <span>Subtotal:</span>
          <span>{{ formatCurrency(posService.cart().total_subtotal) }}</span>
        </div>
        <div class="total-row">
          <span>IVA:</span>
          <span>{{ formatCurrency(posService.cart().total_iva) }}</span>
        </div>
        <div class="total-row">
          <span>IEPS:</span>
          <span>{{ formatCurrency(posService.cart().total_ieps) }}</span>
        </div>
        <div class="total-row grand-total">
          <span>Total:</span>
          <span>{{ formatCurrency(posService.cart().grand_total) }}</span>
        </div>
      </div>
    </div>
  </div>
</div>
```

#### Updated take-order.component.scss

```scss
.take-order-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  
  h1 {
    margin: 0;
    font-size: 1.5rem;
  }
  
  .actions {
    display: flex;
    gap: 1rem;
  }
}

.content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

// Products Panel
.products-panel {
  flex: 2;
  display: flex;
  flex-direction: column;
  background: white;
  border-right: 1px solid #e0e0e0;
}

.search-bar {
  padding: 1rem;
  border-bottom: 1px solid #e0e0e0;
  
  .search-input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
    
    &:focus {
      outline: none;
      border-color: #2196f3;
    }
  }
}

.products-grid {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  align-content: start;
}

.product-card {
  display: flex;
  flex-direction: column;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  
  &:hover:not(.disabled) {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }
  
  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: #f9f9f9;
  }
}

.product-photo {
  position: relative;
  width: 80px;
  height: 80px;
  margin: 0 auto 0.75rem;
  border-radius: 4px;
  overflow: hidden;
  background: #f5f5f5;
  
  .photo-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .photo-loading {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.8);
  }
}

.product-info {
  flex: 1;
  
  .product-name {
    margin: 0 0 0.25rem;
    font-size: 0.95rem;
    font-weight: 600;
    color: #333;
  }
  
  .product-sku {
    margin: 0 0 0.5rem;
    font-size: 0.8rem;
    color: #666;
  }
  
  .product-price {
    .price {
      font-size: 1.1rem;
      font-weight: 700;
      color: #2196f3;
    }
    
    .no-price {
      font-size: 0.9rem;
      color: #f44336;
      font-style: italic;
    }
  }
}

.btn-add {
  width: 100%;
  padding: 0.5rem;
  margin-top: 0.75rem;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1.2rem;
  cursor: pointer;
  transition: background 0.2s;
  
  &:hover:not(:disabled) {
    background: #45a049;
  }
  
  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
}

// Cart Panel
.cart-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
  padding: 1.5rem;
  min-width: 350px;
  
  h2 {
    margin: 0 0 1rem;
    font-size: 1.25rem;
  }
}

.warehouse-select {
  margin-bottom: 1.5rem;
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
  }
  
  select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
  }
}

.cart-items {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 1rem;
}

.empty-cart {
  text-align: center;
  padding: 2rem;
  color: #999;
}

.cart-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  margin-bottom: 0.75rem;
  
  .item-info {
    flex: 1;
    
    h4 {
      margin: 0 0 0.25rem;
      font-size: 0.95rem;
    }
    
    .item-sku {
      margin: 0 0 0.25rem;
      font-size: 0.8rem;
      color: #666;
    }
    
    .item-price {
      margin: 0;
      font-size: 0.85rem;
      color: #2196f3;
    }
  }
  
  .item-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    
    .quantity-input {
      width: 60px;
      padding: 0.25rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      text-align: center;
    }
    
    .btn-remove {
      width: 30px;
      height: 30px;
      background: #f44336;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 1.5rem;
      cursor: pointer;
      line-height: 1;
      
      &:hover {
        background: #d32f2f;
      }
    }
  }
  
  .item-total {
    font-weight: 700;
    color: #333;
  }
}

.cart-totals {
  border-top: 2px solid #e0e0e0;
  padding-top: 1rem;
  
  .total-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
    font-size: 0.95rem;
    
    &.grand-total {
      font-size: 1.25rem;
      font-weight: 700;
      color: #2196f3;
      margin-top: 0.5rem;
      padding-top: 0.5rem;
      border-top: 1px solid #e0e0e0;
    }
  }
}

// Loading States
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  
  .spinner {
    width: 50px;
    height: 50px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #2196f3;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  p {
    margin-top: 1rem;
    color: #666;
  }
}

.spinner-small {
  width: 20px;
  height: 20px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #2196f3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 3rem;
  color: #999;
}

// Buttons
.btn-primary,
.btn-secondary {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.btn-primary {
  background: #2196f3;
  color: white;
  
  &:hover:not(:disabled) {
    background: #1976d2;
  }
}

.btn-secondary {
  background: #f5f5f5;
  color: #333;
  
  &:hover:not(:disabled) {
    background: #e0e0e0;
  }
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I identified the following testable properties and performed redundancy elimination:

**Redundant Properties Identified:**
- Properties 4.3, 11.1: Both test that Product_Photo_Service caches URLs → Combined into Property 1
- Properties 3.3, 11.2: Both test that Price_List_Service caches price lists → Combined into Property 2
- Properties 4.4, 6.4, 11.5, 12.4: All test URL expiration and refresh → Combined into Property 3
- Properties 7.4, 10.2: Both test currency formatting → Combined into Property 4
- Properties 5.1, 5.2: Both test product enrichment → Combined into Property 5

**Properties to Implement:**

### Property 1: Photo URL Caching

*For any* product ID, when requesting the primary photo URL multiple times within the cache validity period, the Product_Photo_Service should return the cached URL without making additional HTTP requests.

**Validates: Requirements 4.3, 11.1**

### Property 2: Price List Caching

*For any* tenant, when requesting the default price list multiple times within 5 minutes, the Price_List_Service should return the cached price list without making additional HTTP requests.

**Validates: Requirements 3.3, 11.2**

### Property 3: URL Expiration and Refresh

*For any* cached photo URL, when the URL is expired or will expire within 5 minutes, the Product_Photo_Service should automatically request a new signed URL.

**Validates: Requirements 4.4, 6.4, 11.5, 12.4**

### Property 4: Currency Formatting Consistency

*For any* numeric price value, when formatted for display, the result should include the currency symbol (MXN) and exactly 2 decimal places.

**Validates: Requirements 7.4, 10.2**

### Property 5: Product Enrichment Completeness

*For any* product fetched by Product_Service, the returned product should be enriched with both photo URL (or null if no photo exists) and price availability flag.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

### Property 6: Missing Price Returns Null

*For any* product and UoM combination that does not have a configured price in the price list, the Price_List_Service should return null.

**Validates: Requirements 3.4**

### Property 7: Missing Photo Returns Null

*For any* product that has no primary photo, the Product_Photo_Service should return null without throwing an error.

**Validates: Requirements 4.5**

### Property 8: Cart Price from Price List

*For any* product added to cart, the POSCartItem should use the unit_price obtained from the Default_Price_List at the time of addition.

**Validates: Requirements 2.3, 9.1**

### Property 9: Base UoM Price Display

*For any* product with multiple UoMs, when displayed in the product selection view, the component should show the price for the base UoM.

**Validates: Requirements 7.2**

### Property 10: Products Without Prices Are Disabled

*For any* product that has no price in the Default_Price_List, the add-to-cart button should be disabled.

**Validates: Requirements 8.1**

### Property 11: Line Total Calculation

*For any* cart item, the line total should equal quantity multiplied by unit_price, plus IVA and IEPS amounts.

**Validates: Requirements 9.2**

### Property 12: Cart Total Calculation

*For any* cart state, the grand total should equal the sum of all line totals.

**Validates: Requirements 9.3**

### Property 13: Cart Price Stability

*For any* cart item, the unit_price should remain unchanged even if the price list is updated after the item was added to cart.

**Validates: Requirements 9.4, 9.5**

### Property 14: Parallel Data Loading

*For any* product list load operation, photo URLs and prices should be fetched in parallel (not sequentially) to minimize total loading time.

**Validates: Requirements 11.3**

### Property 15: Photo Error Graceful Degradation

*For any* product with a photo loading error, the component should still allow the product to be selected and added to cart.

**Validates: Requirements 12.3**

### Property 16: Price Service Error Handling

*For any* error returned by the price service, the Price_List_Service should log the error and return null without throwing an exception.

**Validates: Requirements 13.1**

### Property 17: No Price List Disables Cart

*For any* state where the Default_Price_List cannot be loaded, all products should have disabled add-to-cart buttons.

**Validates: Requirements 13.4**

### Property 18: Paginated Response Handling

*For any* API response from `/api/tenant/products`, whether it's a plain array or a paginated object with a `data` field, the Product_Service should correctly extract the products array.

**Validates: Requirements 14.1, 14.2**

### Property 19: Backward Compatibility

*For any* existing code that uses the Product interface, the updated Product model should maintain all existing fields and behaviors to ensure no breaking changes.

**Validates: Requirements 1.4, 14.3**

### Property 20: Cache Coordination

*For any* cache clear operation on Product_Service, all related caches (photos and prices) should also be cleared.

**Validates: Requirements 5.6**

## Error Handling

### Photo Loading Errors

**Strategy: Graceful Degradation**

1. **Network Errors**: Service returns `null` instead of throwing, component displays placeholder image, product remains selectable, error logged to console
2. **404 Not Found (No Photo)**: Treated as normal case, service returns `null`, component displays placeholder, no error logging
3. **Expired URLs**: Automatic refresh triggered, temporary placeholder shown during refresh, retry logic with exponential backoff, after 3 failed retries use placeholder permanently
4. **Invalid URL Format**: Service validates URL format before caching, invalid URLs treated as missing photos, error logged for investigation

### Price Loading Errors

**Strategy: Fail-Safe with User Notification**

1. **Price List Not Found**: Show error notification to user, disable all add-to-cart buttons, allow browsing products (read-only mode), provide retry button
2. **Individual Price Not Found**: Treated as normal case (product not priced), display "Sin precio" message, disable add-to-cart for that product, other products remain functional
3. **Network Errors**: Retry with exponential backoff (3 attempts), show error notification after retries exhausted, cache last successful price list (if available), provide manual refresh option
4. **Invalid Price Data**: Validate price is positive number, log validation errors, treat as "no price" case

### Error Notification Strategy

| Error Type | Message | Action | Severity |
|------------|---------|--------|----------|
| Price list load failed | "Error al cargar precios. Modo solo lectura." | Retry button | High |
| Product load failed | "Error al cargar productos" | Retry button | Critical |
| Photo load failed | (Silent - show placeholder) | None | Low |
| Individual price missing | "Sin precio" on product card | None | Info |
| Network timeout | "Error de conexión. Reintentando..." | Auto-retry | Medium |

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests:** Focus on specific examples, edge cases, and integration points
**Property Tests:** Verify universal properties across all inputs using randomized testing

### Property-Based Testing Configuration

**Library:** `@fast-check/jest` (for Angular/TypeScript)

**Configuration:**
- Minimum 100 iterations per property test
- Each test tagged with feature name and property number
- Seed-based reproducibility for failed tests
- Tag Format: `// Feature: pos-prices-and-photos, Property 1: Photo URL Caching`

### Test Organization

```
src/app/features/pos/
├── services/
│   ├── price-list.service.spec.ts          # Unit + Property tests
│   ├── product-photo.service.spec.ts       # Unit + Property tests
│   └── pos.service.spec.ts                 # Existing tests (update)
├── pages/
│   └── take-order/
│       ├── take-order.component.spec.ts    # Unit + Property tests
│       └── take-order.component.pbt.spec.ts # Property-based tests
└── models/
    └── pos.model.spec.ts                   # Model validation tests
```

### Unit Test Coverage

**Critical Unit Tests:**

1. **PriceListService**: Cache expiration after 5 minutes, null return for missing prices, error handling with retry logic, cache clearing
2. **ProductPhotoService**: URL expiration detection, prefetch trigger at 5-minute threshold, 404 handling (no photo), cache cleanup
3. **ProductService**: Product enrichment with photos and prices, parallel loading coordination, response format handling (array vs paginated), cache coordination
4. **TakeOrderComponent**: Product display with photos, placeholder for missing photos, price display formatting, disabled state for products without prices, cart addition with correct prices, error notifications
5. **POSService**: Cart item calculations, cart total calculations, price stability (no updates after adding)

### Integration Tests

**Key Integration Scenarios:**

1. **Full Product Load Flow**: Load products → fetch price list → enrich with prices → enrich with photos
2. **Add to Cart Flow**: Select product → verify price → add to cart → verify cart item, verify price is locked at add time
3. **Error Recovery Flow**: Simulate price list error → verify read-only mode → retry → verify recovery
4. **Cache Invalidation Flow**: Load data → clear cache → reload → verify fresh data

### Performance Tests

**Benchmarks:**

1. **Photo Loading**: Target < 200ms per photo URL fetch, cache hit < 1ms
2. **Price Loading**: Target < 300ms for default price list, target < 100ms per product price (cached list)
3. **Product Enrichment**: Target < 2s for 100 products (parallel loading), target < 5s for 500 products

## Optimizations

### Caching Strategy

**Photo URL Cache:**
- Storage: In-memory Map, Key: product_id, TTL: Until URL expiration (typically 1 hour)
- Optimization: Prefetch when < 5 minutes to expiration, background cleanup every 60 seconds

**Price List Cache:**
- Storage: Signal-based reactive cache, TTL: 5 minutes
- Optimization: Aggressive caching, synchronous cache reads, async cache updates

**Product Price Cache:**
- Storage: In-memory Map, Key: `${product_id}-${uom_id}-${price_list_id}`, TTL: 5 minutes, Max Size: 1000 entries (LRU eviction)
- Optimization: Batch price fetching, parallel requests, preload for visible products

### Parallel Loading Benefits

- 100 products with sequential loading: ~30 seconds
- 100 products with parallel loading: ~2 seconds
- 15x performance improvement

## Implementation Notes

### Migration Path

1. **Phase 1: Add New Services** - Implement PriceListService, ProductPhotoService, add unit tests
2. **Phase 2: Update Models** - Add photo fields to Product model, mark `cost` field as deprecated, update TypeScript interfaces
3. **Phase 3: Update ProductService** - Add enrichment logic, maintain backward compatibility, add integration tests
4. **Phase 4: Update TakeOrderComponent** - Add photo display, add price validation, update template and styles
5. **Phase 5: Testing & Optimization** - Add property-based tests, performance testing, cache tuning

### Backward Compatibility

The `cost` field in Product interface is marked as `@deprecated` but maintained for backward compatibility. Existing code will continue to work, but the value now comes from the price list service.

## Conclusion

This design provides a robust, performant, and maintainable solution for integrating photos and prices into the POS module. Key highlights:

- **Separation of Concerns**: New services handle photos and prices independently
- **Performance**: Parallel loading, aggressive caching, lazy loading
- **Reliability**: Graceful error handling, retry logic, fallbacks
- **Testability**: Comprehensive property-based and unit test strategy
- **Maintainability**: Clear interfaces, backward compatibility, good documentation

The implementation follows Angular best practices and maintains consistency with the existing codebase while adding significant new functionality.

