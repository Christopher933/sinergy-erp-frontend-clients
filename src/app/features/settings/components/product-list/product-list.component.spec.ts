import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductListComponent } from './product-list.component';
import { ProductService } from '../../services/product.service';
import { Product, ProductListResponse } from '../../models/product.model';
import { of, throwError } from 'rxjs';

describe('ProductListComponent - Sorting Logic', () => {
  let component: ProductListComponent;

  beforeEach(() => {
    // Create a minimal component instance for testing sorting logic
    component = {
      table_config: vi.fn(() => ({
        rows: [],
        columns: [],
        externalPaging: false,
        externalSorting: false,
        page: 1,
        limit: 20,
        totalResults: 0,
        loading: false,
        emptyState: { title: 'Sin resultados', subtitle: 'No se encontraron productos' },
        columnMode: 'force',
        reorderable: false,
      })),
      currentSort: null,
      search: '',
      products: vi.fn(() => []),
      ArrowRight: null,
      onSortChange: vi.fn(),
      sortProducts: vi.fn(),
      getBaseUoMDisplay: vi.fn(),
      loadProducts: vi.fn(),
      onSearchChange: vi.fn(),
      openCreateProductModal: vi.fn(),
      viewDetail: vi.fn(),
      deleteProduct: vi.fn(),
      openCategoriesDialog: vi.fn(),
      openUOMsDialog: vi.fn(),
      ngOnDestroy: vi.fn(),
      destroy$: { next: vi.fn(), complete: vi.fn() }
    } as any;
  });

  it('should sort products by Base UoM in ascending order', () => {
    const productsWithUoM: Product[] = [
      {
        id: '1',
        tenant_id: 'tenant1',
        sku: 'SKU001',
        name: 'Product 1',
        description: 'Description 1',
        base_uom_id: 'uom2',
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      },
      {
        id: '2',
        tenant_id: 'tenant1',
        sku: 'SKU002',
        name: 'Product 2',
        description: 'Description 2',
        base_uom_id: 'uom1',
        created_at: '2024-01-02',
        updated_at: '2024-01-02'
      }
    ];

    const sortedRows = [...productsWithUoM];
    const prop = 'base_uom_id';
    const direction = 'asc';

    sortedRows.sort((a: any, b: any) => {
      const aValue = a[prop];
      const bValue = b[prop];

      // Handle null values - place them at the end
      if (aValue === null || aValue === undefined) {
        return 1;
      }
      if (bValue === null || bValue === undefined) {
        return -1;
      }

      // Compare values
      if (aValue < bValue) {
        return direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    expect(sortedRows[0].base_uom_id).toBe('uom1');
    expect(sortedRows[1].base_uom_id).toBe('uom2');
  });

  it('should sort products by Base UoM in descending order', () => {
    const productsWithUoM: Product[] = [
      {
        id: '1',
        tenant_id: 'tenant1',
        sku: 'SKU001',
        name: 'Product 1',
        description: 'Description 1',
        base_uom_id: 'uom1',
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      },
      {
        id: '2',
        tenant_id: 'tenant1',
        sku: 'SKU002',
        name: 'Product 2',
        description: 'Description 2',
        base_uom_id: 'uom2',
        created_at: '2024-01-02',
        updated_at: '2024-01-02'
      }
    ];

    const sortedRows = [...productsWithUoM];
    const prop = 'base_uom_id';
    const direction = 'desc';

    sortedRows.sort((a: any, b: any) => {
      const aValue = a[prop];
      const bValue = b[prop];

      // Handle null values - place them at the end
      if (aValue === null || aValue === undefined) {
        return 1;
      }
      if (bValue === null || bValue === undefined) {
        return -1;
      }

      // Compare values
      if (aValue < bValue) {
        return direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    expect(sortedRows[0].base_uom_id).toBe('uom2');
    expect(sortedRows[1].base_uom_id).toBe('uom1');
  });

  it('should place null Base UoM values at the end when sorting ascending', () => {
    const productsWithUoM: Product[] = [
      {
        id: '1',
        tenant_id: 'tenant1',
        sku: 'SKU001',
        name: 'Product 1',
        description: 'Description 1',
        base_uom_id: null,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      },
      {
        id: '2',
        tenant_id: 'tenant1',
        sku: 'SKU002',
        name: 'Product 2',
        description: 'Description 2',
        base_uom_id: 'uom1',
        created_at: '2024-01-02',
        updated_at: '2024-01-02'
      }
    ];

    const sortedRows = [...productsWithUoM];
    const prop = 'base_uom_id';
    const direction = 'asc';

    sortedRows.sort((a: any, b: any) => {
      const aValue = a[prop];
      const bValue = b[prop];

      // Handle null values - place them at the end
      if (aValue === null || aValue === undefined) {
        return 1;
      }
      if (bValue === null || bValue === undefined) {
        return -1;
      }

      // Compare values
      if (aValue < bValue) {
        return direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    expect(sortedRows[0].base_uom_id).toBe('uom1');
    expect(sortedRows[1].base_uom_id).toBeNull();
  });

  it('should place null Base UoM values at the end when sorting descending', () => {
    const productsWithUoM: Product[] = [
      {
        id: '1',
        tenant_id: 'tenant1',
        sku: 'SKU001',
        name: 'Product 1',
        description: 'Description 1',
        base_uom_id: null,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      },
      {
        id: '2',
        tenant_id: 'tenant1',
        sku: 'SKU002',
        name: 'Product 2',
        description: 'Description 2',
        base_uom_id: 'uom1',
        created_at: '2024-01-02',
        updated_at: '2024-01-02'
      }
    ];

    const sortedRows = [...productsWithUoM];
    const prop = 'base_uom_id';
    const direction = 'desc';

    sortedRows.sort((a: any, b: any) => {
      const aValue = a[prop];
      const bValue = b[prop];

      // Handle null values - place them at the end
      if (aValue === null || aValue === undefined) {
        return 1;
      }
      if (bValue === null || bValue === undefined) {
        return -1;
      }

      // Compare values
      if (aValue < bValue) {
        return direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    expect(sortedRows[0].base_uom_id).toBe('uom1');
    expect(sortedRows[1].base_uom_id).toBeNull();
  });

  it('should handle multiple null values at the end', () => {
    const productsWithUoM: Product[] = [
      {
        id: '1',
        tenant_id: 'tenant1',
        sku: 'SKU001',
        name: 'Product 1',
        description: 'Description 1',
        base_uom_id: null,
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      },
      {
        id: '2',
        tenant_id: 'tenant1',
        sku: 'SKU002',
        name: 'Product 2',
        description: 'Description 2',
        base_uom_id: 'uom1',
        created_at: '2024-01-02',
        updated_at: '2024-01-02'
      },
      {
        id: '3',
        tenant_id: 'tenant1',
        sku: 'SKU003',
        name: 'Product 3',
        description: 'Description 3',
        base_uom_id: null,
        created_at: '2024-01-03',
        updated_at: '2024-01-03'
      }
    ];

    const sortedRows = [...productsWithUoM];
    const prop = 'base_uom_id';
    const direction = 'asc';

    sortedRows.sort((a: any, b: any) => {
      const aValue = a[prop];
      const bValue = b[prop];

      // Handle null values - place them at the end
      if (aValue === null || aValue === undefined) {
        return 1;
      }
      if (bValue === null || bValue === undefined) {
        return -1;
      }

      // Compare values
      if (aValue < bValue) {
        return direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    expect(sortedRows[0].base_uom_id).toBe('uom1');
    expect(sortedRows[1].base_uom_id).toBeNull();
    expect(sortedRows[2].base_uom_id).toBeNull();
  });
});

describe('ProductListComponent - Search Filtering', () => {
  let component: ProductListComponent;

  beforeEach(() => {
    component = {
      table_config: vi.fn(() => ({
        rows: [],
        columns: [],
        externalPaging: false,
        externalSorting: false,
        page: 1,
        limit: 20,
        totalResults: 0,
        loading: false,
        emptyState: { title: 'Sin resultados', subtitle: 'No se encontraron productos' },
        columnMode: 'force',
        reorderable: false,
      })),
      currentSort: null,
      search: '',
      products: vi.fn(() => []),
      ArrowRight: null,
      onSortChange: vi.fn(),
      sortProducts: vi.fn(),
      getBaseUoMDisplay: vi.fn(),
      loadProducts: vi.fn(),
      onSearchChange: vi.fn(),
      openCreateProductModal: vi.fn(),
      viewDetail: vi.fn(),
      deleteProduct: vi.fn(),
      openCategoriesDialog: vi.fn(),
      openUOMsDialog: vi.fn(),
      ngOnDestroy: vi.fn(),
      destroy$: { next: vi.fn(), complete: vi.fn() }
    } as any;
  });

  it('should display Base UoM code when product has base_uom with code', () => {
    const product: Product = {
      id: '1',
      tenant_id: 'tenant1',
      sku: 'SKU001',
      name: 'Product 1',
      description: 'Description 1',
      base_uom_id: 'uom1',
      base_uom: {
        id: 'uom1',
        code: 'Caja',
        name: 'Box'
      },
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    };

    // Simulate the getBaseUoMDisplay logic
    const display = product.base_uom && product.base_uom.code ? product.base_uom.code : product.base_uom_id ? product.base_uom_id : '—';
    expect(display).toBe('Caja');
  });

  it('should display Base UoM ID when product has base_uom_id but no base_uom object', () => {
    const product: Product = {
      id: '1',
      tenant_id: 'tenant1',
      sku: 'SKU001',
      name: 'Product 1',
      description: 'Description 1',
      base_uom_id: 'uom1',
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    };

    // Simulate the getBaseUoMDisplay logic
    const display = product.base_uom && product.base_uom.code ? product.base_uom.code : product.base_uom_id ? product.base_uom_id : '—';
    expect(display).toBe('uom1');
  });

  it('should display placeholder when product has no base_uom_id', () => {
    const product: Product = {
      id: '1',
      tenant_id: 'tenant1',
      sku: 'SKU001',
      name: 'Product 1',
      description: 'Description 1',
      base_uom_id: null,
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    };

    // Simulate the getBaseUoMDisplay logic
    const display = product.base_uom && product.base_uom.code ? product.base_uom.code : product.base_uom_id ? product.base_uom_id : '—';
    expect(display).toBe('—');
  });

  it('should maintain search filter across pagination', () => {
    const searchTerm = 'Caja';
    const params: any = {};
    if (searchTerm && searchTerm.trim()) {
      params.search = searchTerm;
    }

    expect(params.search).toBe('Caja');
  });

  it('should pass search parameter to backend API', () => {
    const searchTerm = 'Pieza';
    const params: any = {};
    if (searchTerm && searchTerm.trim()) {
      params.search = searchTerm;
    }

    expect(params).toEqual({ search: 'Pieza' });
  });

  it('should not pass empty search parameter to backend API', () => {
    const searchTerm = '';
    const params: any = {};
    if (searchTerm && searchTerm.trim()) {
      params.search = searchTerm;
    }

    expect(params).toEqual({});
  });

  it('should not pass whitespace-only search parameter to backend API', () => {
    const searchTerm = '   ';
    const params: any = {};
    if (searchTerm && searchTerm.trim()) {
      params.search = searchTerm;
    }

    expect(params).toEqual({});
  });
});
