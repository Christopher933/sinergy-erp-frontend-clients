import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';

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

/**
 * Service for managing price lists and product prices
 * Implements caching strategy with 5-minute TTL
 */
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
    
    return this.http.get<{ data: PriceList[] } | PriceList[]>(`${this.API_URL}?is_default=true`).pipe(
      map(response => {
        // Handle both array and paginated responses
        const lists = Array.isArray(response) ? response : response.data;
        return lists.length > 0 ? lists[0] : null;
      }),
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
