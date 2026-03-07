import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { Product, CreateProductDto, UpdateProductDto, ProductListResponse, ProductQueryParams, Category, SubCategory } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private api = environment.api;

  constructor(private http: HttpClient) {}

  getProducts(params?: ProductQueryParams): Observable<ProductListResponse> {
    return this.http.get<any>(`${this.api}/tenant/products`, { params: params as any }).pipe(
      map(response => {
        // Handle both wrapped and unwrapped responses
        if (Array.isArray(response)) {
          return {
            data: response,
            total: response.length,
            page: 1,
            limit: 20,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          };
        }
        return response;
      })
    );
  }

  getProduct(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.api}/tenant/products/${id}`);
  }

  createProduct(data: CreateProductDto): Observable<Product> {
    return this.http.post<Product>(`${this.api}/tenant/products`, data);
  }

  updateProduct(id: string, data: UpdateProductDto): Observable<Product> {
    return this.http.patch<Product>(`${this.api}/tenant/products/${id}`, data);
  }

  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/tenant/products/${id}`);
  }

  getCategories(): Observable<{ data: Category[] }> {
    return this.http.get<{ data: Category[] }>(`${this.api}/tenant/categories`);
  }

  getSubCategories(categoryId: string): Observable<{ data: SubCategory[] }> {
    return this.http.get<{ data: SubCategory[] }>(`${this.api}/tenant/subcategories`, { params: { category_id: categoryId } });
  }

  createUOM(productId: string, data: any): Observable<any> {
    return this.http.post<any>(`${this.api}/tenant/products/${productId}/uoms`, data);
  }

  updateUOM(productId: string, uomId: string, data: any): Observable<any> {
    return this.http.patch<any>(`${this.api}/tenant/products/${productId}/uoms/${uomId}`, data);
  }

  deleteUOM(productId: string, uomId: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/tenant/products/${productId}/uoms/${uomId}`);
  }

  createUOMRelationship(productId: string, data: any): Observable<any> {
    return this.http.post<any>(`${this.api}/tenant/products/${productId}/uom-relationships`, data);
  }

  deleteUOMRelationship(productId: string, relationshipId: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/tenant/products/${productId}/uom-relationships/${relationshipId}`);
  }

  getUOMRelationships(productId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/tenant/products/${productId}/uom-relationships`);
  }

  createCategory(data: any): Observable<Category> {
    return this.http.post<Category>(`${this.api}/tenant/categories`, data);
  }

  createSubCategory(data: any): Observable<SubCategory> {
    return this.http.post<SubCategory>(`${this.api}/tenant/subcategories`, data);
  }

  createTenantUOM(data: any): Observable<any> {
    return this.http.post<any>(`${this.api}/tenant/uoms`, data);
  }

  getUOMCatalog(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/uom-catalog`);
  }

  createUOMCatalogItem(data: any): Observable<any> {
    return this.http.post<any>(`${this.api}/uom-catalog`, data);
  }

  updateUOMCatalogItem(id: string, data: any): Observable<any> {
    return this.http.patch<any>(`${this.api}/uom-catalog/${id}`, data);
  }

  deleteUOMCatalogItem(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/uom-catalog/${id}`);
  }

  getAssignedUoMs(productId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/tenant/products/${productId}/uoms`);
  }

  checkInventoryMovements(productId: string): Observable<{ has_movements: boolean }> {
    return this.http.get<{ has_movements: boolean }>(`${this.api}/tenant/products/${productId}/inventory-movements`);
  }

  validateBaseUoM(productId: string, baseUoMId: string): Observable<{ valid: boolean }> {
    return this.http.post<{ valid: boolean }>(`${this.api}/tenant/products/${productId}/validate-base-uom`, { base_uom_id: baseUoMId });
  }

  duplicateProduct(productId: string): Observable<Product> {
    return this.http.post<Product>(`${this.api}/tenant/products/${productId}/duplicate`, {});
  }
}
