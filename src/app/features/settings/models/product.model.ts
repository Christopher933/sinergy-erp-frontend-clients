export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface SubCategory {
  id: string;
  category_id: string;
  name: string;
  description?: string;
}

export interface UoM {
  id: string;
  code: string;
  name: string;
}

export interface Product {
  id: string;
  tenant_id: string;
  sku: string;
  name: string;
  description?: string | null;
  category_id?: string;
  subcategory_id?: string;
  base_uom_id?: string | null;
  base_uom?: UoM | null;
  uoms?: any[];
  uom_relationships?: any[];
  vendor_prices?: any[];
  created_at: string;
  updated_at: string;
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
