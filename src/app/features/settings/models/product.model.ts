export interface Category {
  id: string;
  tenant_id?: string;
  name: string;
  description?: string | null;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

export interface SubCategory {
  id: string;
  tenant_id?: string;
  category_id: string;
  name: string;
  description?: string | null;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

export interface UoMCatalog {
  id: string;
  name: string;
  abbreviation: string;
  type?: string;
}

export interface UoM {
  id: string;
  product_id?: string;
  uom_catalog_id?: string;
  name?: string;
  abbreviation?: string;
  created_at?: string;
  uom_catalog?: UoMCatalog;
}

export interface UoMRelationship {
  id: string;
  product_id: string;
  source_uom_id: string;
  target_uom_id: string;
  conversion_factor: number;
  source_uom?: UoM;
  target_uom?: UoM;
  is_calculated?: boolean;
  created_at?: string;
}

export interface VendorProductPrice {
  id: string;
  vendor_id: string;
  product_id: string;
  uom_id: string;
  price: number;
  created_at?: string;
  updated_at?: string;
}

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
  signed_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PriceList {
  id: string;
  tenant_id?: string;
  name: string;
  description?: string | null;
  is_default: boolean;
  is_active?: boolean;
  valid_from?: string | null;
  valid_to?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProductPrice {
  id: string;
  price_list_id: string;
  product_id: string;
  uom_id: string;
  price: number;
  price_list?: PriceList;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: string;
  tenant_id: string;
  sku: string;
  name: string;
  description?: string | null;
  category_id?: string | null;
  subcategory_id?: string | null;
  base_uom_id?: string | null;
  created_at: string;
  updated_at: string;

  // Nested relations
  category?: Category | null;
  subcategory?: SubCategory | null;
  base_uom?: UoMCatalog | null;
  uoms?: UoM[];
  uom_relationships?: UoMRelationship[];
  vendor_prices?: VendorProductPrice[];
  photos?: ProductPhoto[];
  prices?: ProductPrice[];
}

export interface CreateProductDto {
  sku: string;
  name: string;
  description?: string;
  category_id?: string;
  subcategory_id?: string;
  base_uom_id?: string;
}

export interface UpdateProductDto extends Partial<CreateProductDto> {
  base_uom_id?: string | null;
}

export interface ProductListResponse {
  data: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
}

export interface CategoryQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive';
}

export interface SubCategoryQueryParams {
  page?: number;
  limit?: number;
  category_id?: string;
  status?: 'active' | 'inactive';
}

export interface ConvertUoMRequest {
  quantity: number;
  from_uom_id: string;
  to_uom_id: string;
}

export interface ConvertUoMResponse {
  converted_quantity: number;
}

export interface CreatePriceListDto {
  name: string;
  description?: string;
  is_default?: boolean;
  valid_from?: string | null;
  valid_to?: string | null;
}

export interface CreateProductPriceDto {
  price_list_id: string;
  product_id: string;
  uom_id: string;
  price: number;
}

export interface CreateVendorPriceDto {
  vendor_id: string;
  product_id: string;
  uom_id: string;
  price: number;
}
