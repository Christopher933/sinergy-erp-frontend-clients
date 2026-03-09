# Implementation Plan: POS Prices and Photos Integration

## Overview

This implementation plan breaks down the integration of product photos and prices from the backend into the POS module. The approach follows a phased migration strategy: first adding new services, then updating models, enriching the ProductService, and finally updating the UI components. All code will be written in TypeScript using Angular framework.

## Tasks

- [x] 1. Create Price List Service
  - [x] 1.1 Create PriceListService with cache infrastructure
    - Create `src/app/features/pos/services/price-list.service.ts`
    - Implement cache using signals for default price list
    - Implement Map-based cache for product prices with 5-minute TTL
    - Add cache expiration checking logic
    - _Requirements: 3.1, 3.3_
  
  - [x] 1.2 Implement getDefaultPriceList method
    - Add HTTP GET to `/api/tenant/price-lists?is_default=true`
    - Return cached value if not expired
    - Handle empty response (no default price list)
    - Cache successful responses with timestamp
    - _Requirements: 3.1, 3.3_
  
  - [x] 1.3 Implement getProductPrice method
    - Add HTTP GET to `/api/tenant/price-lists/products/{productId}/prices`
    - Accept productId, uomId, and priceListId parameters
    - Find matching price entry by uomId and priceListId
    - Return null if no price found
    - Cache successful price lookups
    - _Requirements: 3.2, 3.4, 3.5_
  
  - [x] 1.4 Add error handling and cache clearing
    - Wrap HTTP calls in catchError operators
    - Log errors to console and return null
    - Implement clearCache method
    - _Requirements: 13.1_
  
  - [ ]* 1.5 Write property test for Price List Service
    - **Property 2: Price List Caching**
    - **Validates: Requirements 3.3, 11.2**
  
  - [ ]* 1.6 Write property test for missing prices
    - **Property 6: Missing Price Returns Null**
    - **Validates: Requirements 3.4**
  
  - [ ]* 1.7 Write property test for error handling
    - **Property 16: Price Service Error Handling**
    - **Validates: Requirements 13.1**

- [x] 2. Create Product Photo Service
  - [x] 2.1 Create ProductPhotoService with cache infrastructure
    - Create `src/app/features/pos/services/product-photo.service.ts`
    - Implement Map-based cache for photo URLs with expiration tracking
    - Add periodic cleanup interval (every 60 seconds)
    - Add prefetch threshold constant (5 minutes)
    - _Requirements: 4.3, 4.6_
  
  - [x] 2.2 Implement getPrimaryPhotoUrl method
    - Add HTTP GET to `/api/products/{productId}/photos/primary`
    - Check cache for valid URL before fetching
    - Return cached URL if not expired
    - Trigger prefetch if URL expiring soon (< 5 minutes)
    - Handle 404 responses (no photo) by returning null
    - _Requirements: 4.1, 4.2, 4.4, 4.5_
  
  - [x] 2.3 Implement cache management methods
    - Add fetchPhotoUrl private method
    - Add prefetchPhotoUrl for background refresh
    - Add isUrlExpired and isUrlExpiringSoon helpers
    - Add cleanExpiredUrls method
    - Implement clearCache method
    - _Requirements: 4.3, 4.4, 4.6_
  
  - [ ]* 2.4 Write property test for Photo URL Service
    - **Property 1: Photo URL Caching**
    - **Validates: Requirements 4.3, 11.1**
  
  - [ ]* 2.5 Write property test for URL expiration
    - **Property 3: URL Expiration and Refresh**
    - **Validates: Requirements 4.4, 6.4, 11.5, 12.4**
  
  - [ ]* 2.6 Write property test for missing photos
    - **Property 7: Missing Photo Returns Null**
    - **Validates: Requirements 4.5**

- [x] 3. Update Product Model
  - [x] 3.1 Add photo fields to Product interface
    - Open `src/app/features/purchase-orders/models/product.model.ts` (or equivalent)
    - Add `primary_photo_id?: string | null`
    - Add `primary_photo_url?: string | null`
    - Add `photo_url_expires_at?: Date | null`
    - Add `has_price?: boolean`
    - Add JSDoc comments for new fields
    - _Requirements: 1.1, 1.2, 1.3, 5.4_
  
  - [x] 3.2 Mark cost field as deprecated
    - Add `@deprecated` JSDoc comment to cost field
    - Add comment: "Use price from PriceListService instead"
    - Keep field for backward compatibility
    - _Requirements: 1.4, 2.2, 14.3_

- [x] 4. Update Product Service with Enrichment
  - [x] 4.1 Inject new services into ProductService
    - Open `src/app/features/purchase-orders/services/product.service.ts`
    - Add PriceListService to constructor
    - Add ProductPhotoService to constructor
    - _Requirements: 5.1, 5.2_
  
  - [x] 4.2 Implement enrichProducts method
    - Create private enrichProducts method
    - Fetch default price list first
    - Handle null price list (log warning, set has_price=false)
    - Map products to enrichSingleProduct calls
    - Use forkJoin for parallel enrichment
    - _Requirements: 5.1, 5.2, 11.3_
  
  - [x] 4.3 Implement enrichSingleProduct method
    - Create private enrichSingleProduct method
    - Use forkJoin to fetch photo and price in parallel
    - Fetch photo URL using ProductPhotoService
    - Fetch price using PriceListService with base UoM
    - Merge results into product object
    - Set has_price flag based on price availability
    - Set cost field for backward compatibility
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [x] 4.4 Update getProducts method
    - Add switchMap to enrichProducts after fetching
    - Handle both array and paginated responses
    - Maintain existing error handling
    - _Requirements: 5.1, 5.2, 14.1, 14.2_
  
  - [x] 4.5 Add cache coordination
    - Implement clearCache method
    - Call priceListService.clearCache()
    - Call productPhotoService.clearCache()
    - _Requirements: 5.6_
  
  - [ ]* 4.6 Write property test for product enrichment
    - **Property 5: Product Enrichment Completeness**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
  
  - [ ]* 4.7 Write property test for parallel loading
    - **Property 14: Parallel Data Loading**
    - **Validates: Requirements 11.3**
  
  - [ ]* 4.8 Write property test for paginated responses
    - **Property 18: Paginated Response Handling**
    - **Validates: Requirements 14.1, 14.2**
  
  - [ ]* 4.9 Write property test for cache coordination
    - **Property 20: Cache Coordination**
    - **Validates: Requirements 5.6**

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Update TakeOrderComponent - State and Logic
  - [x] 6.1 Add new signals for photo and price state
    - Open `src/app/features/pos/pages/take-order/take-order.component.ts`
    - Add `loadingPhotos = signal<boolean>(false)`
    - Add `loadingPrices = signal<boolean>(false)`
    - Add `priceListError = signal<boolean>(false)`
    - Add `activePriceListId = signal<string | null>(null)`
    - Add `photoLoadingStates = signal<Map<string, boolean>>(new Map())`
    - Add `photoErrorStates = signal<Map<string, boolean>>(new Map())`
    - _Requirements: 6.5, 13.3_
  
  - [x] 6.2 Update loadData method
    - Products are already enriched by ProductService (no changes needed)
    - Add warning log for products without prices
    - Update error handling to set priceListError signal
    - _Requirements: 5.1, 5.2, 13.3_
  
  - [x] 6.3 Implement photo helper methods
    - Add getProductPhotoUrl method (returns URL or placeholder)
    - Add isPhotoLoading method
    - Add hasPhotoError method
    - Add onPhotoError handler
    - Add onPhotoLoad handler
    - _Requirements: 6.1, 6.2, 12.1, 12.3_
  
  - [x] 6.4 Implement price validation in addProductToCart
    - Check product.has_price before adding
    - Show snackbar error if no price: "Este producto no tiene precio configurado"
    - Validate UoMs exist
    - Use product.cost (enriched from price list) for unit_price
    - _Requirements: 8.1, 9.1, 2.3_
  
  - [x] 6.5 Add product state helper methods
    - Add canAddToCart method (checks has_price)
    - Add getDisabledTooltip method
    - _Requirements: 8.1, 8.2_
  
  - [ ]* 6.6 Write property test for cart price source
    - **Property 8: Cart Price from Price List**
    - **Validates: Requirements 2.3, 9.1**
  
  - [ ]* 6.7 Write property test for disabled products
    - **Property 10: Products Without Prices Are Disabled**
    - **Validates: Requirements 8.1**
  
  - [ ]* 6.8 Write property test for photo error handling
    - **Property 15: Photo Error Graceful Degradation**
    - **Validates: Requirements 12.3**

- [x] 7. Update TakeOrderComponent - Template
  - [x] 7.1 Update product card photo section
    - Open `src/app/features/pos/pages/take-order/take-order.component.html`
    - Add product-photo div with img element
    - Bind [src] to getProductPhotoUrl(product)
    - Add (error) handler calling onPhotoError
    - Add (load) handler calling onPhotoLoad
    - Add loading spinner overlay with *ngIf="isPhotoLoading(product.id)"
    - _Requirements: 6.1, 6.2, 6.3, 6.5_
  
  - [x] 7.2 Update product card price display
    - Add product-price div
    - Show price with *ngIf="product.has_price"
    - Format using formatCurrency(product.cost || 0)
    - Show "Sin precio" with *ngIf="!product.has_price"
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [x] 7.3 Update product card disabled state
    - Add [class.disabled]="!canAddToCart(product)" to product-card
    - Add [title]="getDisabledTooltip(product)" for tooltip
    - Update add button [disabled]="!canAddToCart(product)"
    - Show warning icon (⚠) when disabled
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [x] 7.4 Update cart item display
    - Add unit price display in cart items
    - Format: "{{ formatCurrency(item.unit_price) }} / {{ item.uom_name }}"
    - _Requirements: 10.1, 10.2, 10.3_
  
  - [ ]* 7.5 Write property test for base UoM price display
    - **Property 9: Base UoM Price Display**
    - **Validates: Requirements 7.2**
  
  - [ ]* 7.6 Write property test for currency formatting
    - **Property 4: Currency Formatting Consistency**
    - **Validates: Requirements 7.4, 10.2**

- [x] 8. Update TakeOrderComponent - Styles
  - [x] 8.1 Add photo styles to component SCSS
    - Open `src/app/features/pos/pages/take-order/take-order.component.scss`
    - Add .product-photo styles (80x80px, border-radius, overflow hidden)
    - Add .photo-img styles (object-fit: cover)
    - Add .photo-loading overlay styles
    - Add .spinner-small animation
    - _Requirements: 6.3_
  
  - [x] 8.2 Add price display styles
    - Add .product-price styles
    - Add .price styles (color: #2196f3, font-weight: 700)
    - Add .no-price styles (color: #f44336, italic)
    - _Requirements: 7.3_
  
  - [x] 8.3 Add disabled state styles
    - Add .product-card.disabled styles (opacity: 0.5, cursor: not-allowed)
    - Add disabled button styles
    - _Requirements: 8.3_
  
  - [x] 8.4 Add cart item price styles
    - Add .item-price styles in cart-item section
    - _Requirements: 10.1_

- [x] 9. Add Placeholder Image Asset
  - [x] 9.1 Add product placeholder image
    - Create or copy placeholder image to `src/assets/images/product-placeholder.png`
    - Ensure image is 80x80px or scalable
    - _Requirements: 6.2_

- [x] 10. Update POSService Cart Calculations
  - [x] 10.1 Verify cart calculation logic
    - Open `src/app/features/pos/services/pos.service.ts`
    - Verify line_total = subtotal + iva_amount + ieps_amount
    - Verify grand_total = sum of all line_totals
    - Ensure unit_price is not modified after adding to cart
    - _Requirements: 9.2, 9.3, 9.4, 9.5_
  
  - [ ]* 10.2 Write property test for line total calculation
    - **Property 11: Line Total Calculation**
    - **Validates: Requirements 9.2**
  
  - [ ]* 10.3 Write property test for cart total calculation
    - **Property 12: Cart Total Calculation**
    - **Validates: Requirements 9.3**
  
  - [ ]* 10.4 Write property test for price stability
    - **Property 13: Cart Price Stability**
    - **Validates: Requirements 9.4, 9.5**

- [x] 11. Add Error Handling for No Price List
  - [x] 11.1 Handle missing default price list
    - In TakeOrderComponent.loadData, check if enrichment failed
    - Set priceListError signal to true if no price list
    - Show error snackbar: "Error al cargar precios. Modo solo lectura."
    - Disable all add-to-cart buttons when priceListError is true
    - _Requirements: 13.3, 13.4_
  
  - [ ]* 11.2 Write property test for no price list scenario
    - **Property 17: No Price List Disables Cart**
    - **Validates: Requirements 13.4**

- [x] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Add Backward Compatibility Tests
  - [ ]* 13.1 Write property test for backward compatibility
    - **Property 19: Backward Compatibility**
    - **Validates: Requirements 1.4, 14.3**
    - Test that existing code using Product interface still works
    - Test that cost field is still accessible

- [ ] 14. Integration Testing
  - [ ]* 14.1 Write integration test for full product load flow
    - Test: Load products → fetch price list → enrich with prices → enrich with photos
    - Verify all products have photo URLs or null
    - Verify all products have has_price flag set correctly
  
  - [ ]* 14.2 Write integration test for add to cart flow
    - Test: Select product → verify price → add to cart → verify cart item
    - Verify unit_price is locked at add time
    - Verify cart calculations are correct
  
  - [ ]* 14.3 Write integration test for error recovery
    - Test: Simulate price list error → verify read-only mode → retry → verify recovery
    - Verify error notifications are shown
    - Verify products remain browsable

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The implementation follows a phased approach: services → models → enrichment → UI
- All code uses TypeScript with Angular framework
- Cache durations: Price list (5 min), Photo URLs (until expiration, typically 1 hour)
- Parallel loading is critical for performance with large product catalogs
