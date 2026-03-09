import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

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

/**
 * Cached photo URL with expiration
 */
interface CachedPhotoUrl {
  url: string;
  expires_at: Date;
  product_id: string;
}

/**
 * Service for managing product photos and signed URLs
 * Implements caching with expiration-based refresh
 */
@Injectable({
  providedIn: 'root'
})
export class ProductPhotoService {
  private readonly API_URL = '/api/products';
  private readonly PREFETCH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
  
  // Cache: Map<product_id, CachedPhotoUrl>
  private photoUrlCache = new Map<string, CachedPhotoUrl>();
  private cleanupInterval: any;
  
  constructor(private http: HttpClient) {
    // Clean expired URLs every minute
    this.cleanupInterval = setInterval(() => this.cleanExpiredUrls(), 60 * 1000);
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
  
  /**
   * Cleanup on service destroy
   */
  ngOnDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}
