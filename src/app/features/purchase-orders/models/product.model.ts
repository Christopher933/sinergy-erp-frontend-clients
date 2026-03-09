import { UnitOfMeasure } from './line-item.model';

/**
 * Product entity (from external module)
 * Extended to support photos and price lists
 */
export interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string;
  
  /**
   * @deprecated Use price from PriceListService instead
   * Maintained for backward compatibility
   */
  cost?: number;
  
  base_uom_id: string;
  uoms: UnitOfMeasure[];
  
  // Photo fields
  /** ID of the primary photo for this product */
  primary_photo_id?: string | null;
  
  /** Cached signed URL for the primary photo */
  primary_photo_url?: string | null;
  
  /** Expiration timestamp for the cached photo URL */
  photo_url_expires_at?: Date | null;
  
  // Price availability flag
  /** Indicates if this product has a price configured in the active price list */
  has_price?: boolean;
}
