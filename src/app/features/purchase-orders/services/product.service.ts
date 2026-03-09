import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of, forkJoin } from 'rxjs';
import { tap, map, switchMap, catchError } from 'rxjs/operators';
import { Product } from '../models/product.model';
import { environment } from '../../../../environments/environment';
import { PriceListService } from '../../pos/services/price-list.service';
import { ProductPhotoService } from '../../pos/services/product-photo.service';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private readonly baseUrl = `${environment.api}/tenant/products`;
  private productsCache$ = new BehaviorSubject<Product[] | null>(null);
  private cacheTimestamp = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(
    private http: HttpClient,
    private priceListService: PriceListService,
    private productPhotoService: ProductPhotoService
  ) {}

  /**
   * Get all products
   * Products are enriched with photos and prices from default price list
   */
  getProducts(): Observable<Product[]> {
    const now = Date.now();
    const cached = this.productsCache$.value;

    if (cached && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
      return of(cached);
    }

    return this.http.get<Product[] | { data: Product[] }>(this.baseUrl).pipe(
      map(response => {
        // Handle both array and {data: array} formats
        return Array.isArray(response) ? response : response.data;
      }),
      // Enrich products with photos and prices
      switchMap(products => this.enrichProducts(products)),
      tap(products => {
        this.productsCache$.next(products);
        this.cacheTimestamp = now;
      })
    );
  }

  /**
   * Search products by name or SKU
   */
  searchProducts(query: string): Observable<Product[]> {
    return this.http.get<Product[] | { data: Product[] }>(this.baseUrl, {
      params: { search: query }
    }).pipe(
      map(response => {
        // Handle both array and {data: array} formats
        return Array.isArray(response) ? response : response.data;
      })
    );
  }

  /**
   * Get product by ID with UOMs
   */
  getProductById(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.baseUrl}/${id}`);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.productsCache$.next(null);
    this.cacheTimestamp = 0;
    this.priceListService.clearCache();
    this.productPhotoService.clearCache();
  }
  
  /**
   * Enrich products with photos and prices in parallel
   */
  private enrichProducts(products: Product[]): Observable<Product[]> {
    // Get the default price list to know which prices to use
    return this.priceListService.getDefaultPriceList().pipe(
      switchMap(priceList => {
        // Enrich each product with photo and extract price from product.prices array
        const enrichedProducts$ = products.map(product =>
          this.enrichSingleProduct(product, priceList?.id)
        );
        
        return forkJoin(enrichedProducts$);
      }),
      catchError(error => {
        console.error('Error enriching products:', error);
        // Return products with prices extracted from their prices array
        return of(products.map(p => this.extractPriceFromProduct(p, null)));
      })
    );
  }
  
  /**
   * Enrich a single product with photo and price
   */
  private enrichSingleProduct(
    product: any,
    priceListId: string | null | undefined
  ): Observable<Product> {
    // Fetch photo URL
    return this.productPhotoService.getPrimaryPhotoUrl(product.id).pipe(
      map(photoUrl => {
        // Extract price from product.prices array
        const enrichedProduct = this.extractPriceFromProduct(product, priceListId);
        
        return {
          ...enrichedProduct,
          primary_photo_url: photoUrl,
          photo_url_expires_at: photoUrl ? new Date(Date.now() + 3600000) : null
        };
      })
    );
  }
  
  /**
   * Extract price from product.prices array based on price list
   */
  private extractPriceFromProduct(product: any, priceListId: string | null | undefined): Product {
    let price: number | null = null;
    
    // Check if product has prices array
    if (product.prices && Array.isArray(product.prices) && product.prices.length > 0) {
      if (priceListId) {
        // Find price for the specific price list
        const priceEntry = product.prices.find((p: any) => p.price_list_id === priceListId);
        if (priceEntry) {
          price = parseFloat(priceEntry.price);
        }
      }
      
      // If no price found for specific list, use first available price
      if (price === null && product.prices.length > 0) {
        price = parseFloat(product.prices[0].price);
      }
    }
    
    return {
      ...product,
      has_price: price !== null,
      cost: price ?? product.cost ?? 0
    };
  }
}
