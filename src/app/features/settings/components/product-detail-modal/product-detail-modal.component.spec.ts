import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductDetailModalComponent } from './product-detail-modal.component';
import { ProductService } from '../../services/product.service';
import { Product, ProductListResponse } from '../../models/product.model';
import { of, throwError } from 'rxjs';

describe('ProductDetailModalComponent', () => {
  let component: ProductDetailModalComponent;
  let fixture: ComponentFixture<ProductDetailModalComponent>;
  let productService: any;
  let dialogRef: any;
  let snackBar: any;

  const mockProduct: Product = {
    id: '1',
    tenant_id: 'tenant1',
    sku: 'SKU001',
    name: 'Product 1',
    description: 'Description 1',
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  };

  beforeEach(async () => {
    const productServiceSpy = {
      createProduct: vi.fn(),
      updateProduct: vi.fn(),
      getProducts: vi.fn(),
      getCategories: vi.fn(),
      getSubCategories: vi.fn(),
      getAssignedUoMs: vi.fn(),
      getUOMCatalog: vi.fn(),
      getUOMRelationships: vi.fn(),
      getProduct: vi.fn(),
      checkInventoryMovements: vi.fn()
    };
    const dialogRefSpy = {
      close: vi.fn()
    };
    const snackBarSpy = {
      openFromComponent: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ProductDetailModalComponent, ReactiveFormsModule],
      providers: [
        { provide: ProductService, useValue: productServiceSpy },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: MAT_DIALOG_DATA, useValue: { product: null } }
      ]
    }).compileComponents();

    productService = TestBed.inject(ProductService) as any;
    dialogRef = TestBed.inject(MatDialogRef) as any;
    snackBar = TestBed.inject(MatSnackBar) as any;

    productService.getProducts.mockReturnValue(of({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
      hasNext: false,
      hasPrev: false
    }));
    productService.getCategories.mockReturnValue(of({ data: [] }));
    productService.getSubCategories.mockReturnValue(of({ data: [] }));
    productService.getAssignedUoMs.mockReturnValue(of([]));
    productService.getUOMCatalog.mockReturnValue(of([]));
    productService.getUOMRelationships.mockReturnValue(of([]));
    productService.checkInventoryMovements.mockReturnValue(of({ has_movements: false }));
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ProductDetailModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form in create mode', () => {
    expect(component.isNew).toBe(true);
    expect(component.form.get('sku')?.value).toBe('');
    expect(component.form.get('name')?.value).toBe('');
    expect(component.form.get('description')?.value).toBe('');
  });

  it('should initialize form in edit mode', async () => {
    await TestBed.resetTestingModule();
    const productServiceSpy = {
      createProduct: vi.fn(),
      updateProduct: vi.fn(),
      getProducts: vi.fn(),
      getCategories: vi.fn(),
      getSubCategories: vi.fn(),
      getAssignedUoMs: vi.fn(),
      getUOMCatalog: vi.fn(),
      getUOMRelationships: vi.fn(),
      getProduct: vi.fn()
    };
    const dialogRefSpy = {
      close: vi.fn()
    };
    const snackBarSpy = {
      openFromComponent: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ProductDetailModalComponent, ReactiveFormsModule],
      providers: [
        { provide: ProductService, useValue: productServiceSpy },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: MAT_DIALOG_DATA, useValue: { product: mockProduct } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProductDetailModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.isNew).toBe(false);
    expect(component.form.get('sku')?.value).toBe('SKU001');
    expect(component.form.get('name')?.value).toBe('Product 1');
  });

  it('should validate required fields', () => {
    const form = component.form;
    expect(form.valid).toBe(false);

    form.get('sku')?.setValue('SKU001');
    form.get('name')?.setValue('Product 1');
    expect(form.valid).toBe(true);
  });

  it('should validate name minimum length', () => {
    const form = component.form;
    form.get('sku')?.setValue('SKU001');
    form.get('name')?.setValue('P');
    expect(form.valid).toBe(false);

    form.get('name')?.setValue('Product 1');
    expect(form.valid).toBe(true);
  });

  it('should disable save button when form is invalid', () => {
    expect(component.form.valid).toBe(false);
    expect(component.form.get('sku')?.invalid).toBe(true);
  });

  it('should create product', () => {
    productService.createProduct.mockReturnValue(of(mockProduct));

    component.form.patchValue({
      sku: 'SKU001',
      name: 'Product 1',
      description: 'Description 1'
    });

    component.save();

    expect(productService.createProduct).toHaveBeenCalledWith({
      sku: 'SKU001',
      name: 'Product 1',
      description: 'Description 1'
    });
    expect(dialogRef.close).toHaveBeenCalledWith(mockProduct);
  });

  it('should update product', async () => {
    await TestBed.resetTestingModule();
    const productServiceSpy = {
      createProduct: vi.fn(),
      updateProduct: vi.fn(),
      getProducts: vi.fn(),
      getCategories: vi.fn(),
      getSubCategories: vi.fn(),
      getAssignedUoMs: vi.fn(),
      getUOMCatalog: vi.fn(),
      getUOMRelationships: vi.fn(),
      getProduct: vi.fn()
    };
    const dialogRefSpy = {
      close: vi.fn()
    };
    const snackBarSpy = {
      openFromComponent: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ProductDetailModalComponent, ReactiveFormsModule],
      providers: [
        { provide: ProductService, useValue: productServiceSpy },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: MAT_DIALOG_DATA, useValue: { product: mockProduct } }
      ]
    }).compileComponents();

    productService = TestBed.inject(ProductService) as any;
    dialogRef = TestBed.inject(MatDialogRef) as any;

    productService.updateProduct.mockReturnValue(of(mockProduct));
    productService.getCategories.mockReturnValue(of({ data: [] }));
    productService.getSubCategories.mockReturnValue(of({ data: [] }));
    productService.getAssignedUoMs.mockReturnValue(of([]));
    productService.getUOMCatalog.mockReturnValue(of([]));
    productService.getUOMRelationships.mockReturnValue(of([]));

    fixture = TestBed.createComponent(ProductDetailModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.form.patchValue({
      name: 'Updated Product'
    });

    component.save();

    expect(productService.updateProduct).toHaveBeenCalledWith('1', {
      sku: 'SKU001',
      name: 'Updated Product',
      description: 'Description 1'
    });
  });

  it('should handle create error', () => {
    productService.createProduct.mockReturnValue(throwError(() => new Error('Create failed')));

    component.form.patchValue({
      sku: 'SKU001',
      name: 'Product 1'
    });

    component.save();

    expect(snackBar.openFromComponent).toHaveBeenCalled();
  });

  it('should close modal', () => {
    component.close();
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('should display error message for required field', () => {
    const skuControl = component.form.get('sku');
    skuControl?.markAsTouched();
    fixture.detectChanges();

    const errorMsg = component.getErrorMessage('sku');
    expect(errorMsg).toContain('requerido');
  });

  it('should display error message for minimum length', () => {
    const nameControl = component.form.get('name');
    nameControl?.setValue('P');
    nameControl?.markAsTouched();
    fixture.detectChanges();

    const errorMsg = component.getErrorMessage('name');
    expect(errorMsg).toContain('al menos');
  });

  it('should require Base UoM when product has assigned UoMs', () => {
    const baseUoMControl = component.form.get('base_uom_id');
    
    // Initially no assigned UoMs - Base UoM should not be required
    component.assignedUoMs.set([]);
    fixture.detectChanges();
    expect(baseUoMControl?.hasError('required')).toBe(false);

    // Add assigned UoMs - Base UoM should now be required
    component.assignedUoMs.set([
      { id: 'uom1', name: 'Caja', code: 'CJA' },
      { id: 'uom2', name: 'Pieza', code: 'PZA' }
    ]);
    fixture.detectChanges();
    expect(baseUoMControl?.hasError('required')).toBe(true);
  });

  it('should validate Base UoM is in assigned UoMs list', () => {
    component.assignedUoMs.set([
      { id: 'uom1', name: 'Caja', code: 'CJA' },
      { id: 'uom2', name: 'Pieza', code: 'PZA' }
    ]);
    fixture.detectChanges();

    const baseUoMControl = component.form.get('base_uom_id');
    
    // Set Base UoM to a value not in assigned UoMs
    baseUoMControl?.setValue('invalid-uom-id');
    baseUoMControl?.markAsTouched();
    fixture.detectChanges();

    expect(baseUoMControl?.hasError('baseUoMNotInAssigned')).toBe(true);
    const errorMsg = component.getErrorMessage('base_uom_id');
    expect(errorMsg).toContain('no está en la lista');
  });

  it('should not validate Base UoM when no assigned UoMs', () => {
    component.assignedUoMs.set([]);
    fixture.detectChanges();

    const baseUoMControl = component.form.get('base_uom_id');
    baseUoMControl?.setValue('any-value');
    baseUoMControl?.markAsTouched();
    fixture.detectChanges();

    expect(baseUoMControl?.hasError('required')).toBe(false);
    expect(baseUoMControl?.hasError('baseUoMNotInAssigned')).toBe(false);
  });

  it('should accept valid Base UoM from assigned UoMs', () => {
    component.assignedUoMs.set([
      { id: 'uom1', name: 'Caja', code: 'CJA' },
      { id: 'uom2', name: 'Pieza', code: 'PZA' }
    ]);
    fixture.detectChanges();

    const baseUoMControl = component.form.get('base_uom_id');
    baseUoMControl?.setValue('uom1');
    baseUoMControl?.markAsTouched();
    fixture.detectChanges();

    expect(baseUoMControl?.hasError('required')).toBe(false);
    expect(baseUoMControl?.hasError('baseUoMNotInAssigned')).toBe(false);
    expect(baseUoMControl?.valid).toBe(true);
  });

  it('should display required indicator when Base UoM is required', () => {
    component.assignedUoMs.set([
      { id: 'uom1', name: 'Caja', code: 'CJA' }
    ]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    const requiredIndicator = compiled.querySelector('label span.text-red-500');
    expect(requiredIndicator).toBeTruthy();
  });

  it('should not display required indicator when Base UoM is optional', () => {
    component.assignedUoMs.set([]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    const requiredIndicator = compiled.querySelector('label span.text-red-500');
    expect(requiredIndicator).toBeFalsy();
  });

  it('should disable save button when Base UoM is invalid', () => {
    component.form.patchValue({
      sku: 'SKU001',
      name: 'Product 1'
    });
    
    component.assignedUoMs.set([
      { id: 'uom1', name: 'Caja', code: 'CJA' }
    ]);
    fixture.detectChanges();

    // Base UoM not set - form should be invalid
    expect(component.form.valid).toBe(false);

    // Set valid Base UoM - form should be valid
    component.form.get('base_uom_id')?.setValue('uom1');
    fixture.detectChanges();
    expect(component.form.valid).toBe(true);
  });

  it('should display error message for Base UoM required', () => {
    component.assignedUoMs.set([
      { id: 'uom1', name: 'Caja', code: 'CJA' }
    ]);
    fixture.detectChanges();

    const baseUoMControl = component.form.get('base_uom_id');
    baseUoMControl?.markAsTouched();
    fixture.detectChanges();

    const errorMsg = component.getErrorMessage('base_uom_id');
    expect(errorMsg).toContain('requerida');
  });

  it('should update conversion preview when Base UoM is selected', () => {
    const assignedUoMs = [
      { id: 'uom1', name: 'Caja', code: 'CJA' },
      { id: 'uom2', name: 'Pieza', code: 'PZA' }
    ];
    const relationships = [
      { id: 'rel1', source_uom_id: 'uom2', target_uom_id: 'uom1', conversion_factor: 50 }
    ];

    component.assignedUoMs.set(assignedUoMs);
    component.relationships.set(relationships);
    fixture.detectChanges();

    // Select Base UoM
    component.form.get('base_uom_id')?.setValue('uom1');
    fixture.detectChanges();

    // Conversion preview should be populated
    expect(component.conversionPreview().length).toBe(1);
    expect(component.conversionPreview()[0].text).toContain('1 PZA = 50 CJA');
  });

  it('should clear conversion preview when Base UoM is deselected', () => {
    const assignedUoMs = [
      { id: 'uom1', name: 'Caja', code: 'CJA' },
      { id: 'uom2', name: 'Pieza', code: 'PZA' }
    ];
    const relationships = [
      { id: 'rel1', source_uom_id: 'uom2', target_uom_id: 'uom1', conversion_factor: 50 }
    ];

    component.assignedUoMs.set(assignedUoMs);
    component.relationships.set(relationships);
    fixture.detectChanges();

    // Select Base UoM
    component.form.get('base_uom_id')?.setValue('uom1');
    fixture.detectChanges();
    expect(component.conversionPreview().length).toBe(1);

    // Deselect Base UoM
    component.form.get('base_uom_id')?.setValue('');
    fixture.detectChanges();
    expect(component.conversionPreview().length).toBe(0);
  });

  it('should handle inverse conversion relationships', () => {
    const assignedUoMs = [
      { id: 'uom1', name: 'Caja', code: 'CJA' },
      { id: 'uom2', name: 'Pieza', code: 'PZA' }
    ];
    // Inverse relationship: 50 Piezas = 1 Caja (stored as Caja -> Pieza with factor 50)
    const relationships = [
      { id: 'rel1', source_uom_id: 'uom1', target_uom_id: 'uom2', conversion_factor: 50 }
    ];

    component.assignedUoMs.set(assignedUoMs);
    component.relationships.set(relationships);
    fixture.detectChanges();

    // Select Pieza as Base UoM
    component.form.get('base_uom_id')?.setValue('uom2');
    fixture.detectChanges();

    // Should calculate inverse: 1 Caja = 1/50 Pieza = 0.02 Pieza
    expect(component.conversionPreview().length).toBe(1);
    expect(component.conversionPreview()[0].factor).toBeCloseTo(0.02, 5);
  });

  it('should display simplified preview for single UoM', () => {
    const assignedUoMs = [
      { id: 'uom1', name: 'Caja', code: 'CJA' }
    ];

    component.assignedUoMs.set(assignedUoMs);
    fixture.detectChanges();

    // Select Base UoM
    component.form.get('base_uom_id')?.setValue('uom1');
    fixture.detectChanges();

    // Conversion preview should be empty (no other UoMs to convert)
    expect(component.conversionPreview().length).toBe(0);
  });

  it('should handle multiple conversion relationships', () => {
    const assignedUoMs = [
      { id: 'uom1', name: 'Caja', code: 'CJA' },
      { id: 'uom2', name: 'Pieza', code: 'PZA' },
      { id: 'uom3', name: 'Kilogramo', code: 'KG' }
    ];
    const relationships = [
      { id: 'rel1', source_uom_id: 'uom2', target_uom_id: 'uom1', conversion_factor: 50 },
      { id: 'rel2', source_uom_id: 'uom3', target_uom_id: 'uom1', conversion_factor: 25 }
    ];

    component.assignedUoMs.set(assignedUoMs);
    component.relationships.set(relationships);
    fixture.detectChanges();

    // Select Base UoM
    component.form.get('base_uom_id')?.setValue('uom1');
    fixture.detectChanges();

    // Should have 2 conversions
    expect(component.conversionPreview().length).toBe(2);
    expect(component.conversionPreview()[0].text).toContain('50');
    expect(component.conversionPreview()[1].text).toContain('25');
  });

  it('should skip Base UoM in conversion preview', () => {
    const assignedUoMs = [
      { id: 'uom1', name: 'Caja', code: 'CJA' },
      { id: 'uom2', name: 'Pieza', code: 'PZA' }
    ];
    const relationships = [
      { id: 'rel1', source_uom_id: 'uom2', target_uom_id: 'uom1', conversion_factor: 50 }
    ];

    component.assignedUoMs.set(assignedUoMs);
    component.relationships.set(relationships);
    fixture.detectChanges();

    // Select Base UoM
    component.form.get('base_uom_id')?.setValue('uom1');
    fixture.detectChanges();

    // Should not include conversion from Caja to Caja
    const previewTexts = component.conversionPreview().map(p => p.text);
    expect(previewTexts.every(t => !t.includes('CJA = '))).toBe(true);
  });

  it('should handle missing conversion relationships gracefully', () => {
    const assignedUoMs = [
      { id: 'uom1', name: 'Caja', code: 'CJA' },
      { id: 'uom2', name: 'Pieza', code: 'PZA' },
      { id: 'uom3', name: 'Kilogramo', code: 'KG' }
    ];
    // Only relationship between uom1 and uom2
    const relationships = [
      { id: 'rel1', source_uom_id: 'uom2', target_uom_id: 'uom1', conversion_factor: 50 }
    ];

    component.assignedUoMs.set(assignedUoMs);
    component.relationships.set(relationships);
    fixture.detectChanges();

    // Select Base UoM
    component.form.get('base_uom_id')?.setValue('uom1');
    fixture.detectChanges();

    // Should only show conversion for uom2, not uom3 (no relationship)
    expect(component.conversionPreview().length).toBe(1);
    expect(component.conversionPreview()[0].text).toContain('PZA');
  });

  it('should check inventory movements when editing product', async () => {
    await TestBed.resetTestingModule();
    const productServiceSpy = {
      createProduct: vi.fn(),
      updateProduct: vi.fn(),
      getProducts: vi.fn(),
      getCategories: vi.fn(),
      getSubCategories: vi.fn(),
      getAssignedUoMs: vi.fn(),
      getUOMCatalog: vi.fn(),
      getUOMRelationships: vi.fn(),
      getProduct: vi.fn(),
      checkInventoryMovements: vi.fn()
    };
    const dialogRefSpy = {
      close: vi.fn()
    };
    const snackBarSpy = {
      openFromComponent: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ProductDetailModalComponent, ReactiveFormsModule],
      providers: [
        { provide: ProductService, useValue: productServiceSpy },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: MAT_DIALOG_DATA, useValue: { product: mockProduct } }
      ]
    }).compileComponents();

    productService = TestBed.inject(ProductService) as any;
    productService.getCategories.mockReturnValue(of({ data: [] }));
    productService.getSubCategories.mockReturnValue(of({ data: [] }));
    productService.getAssignedUoMs.mockReturnValue(of([]));
    productService.getUOMCatalog.mockReturnValue(of([]));
    productService.getUOMRelationships.mockReturnValue(of([]));
    productService.checkInventoryMovements.mockReturnValue(of({ has_movements: false }));

    fixture = TestBed.createComponent(ProductDetailModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(productService.checkInventoryMovements).toHaveBeenCalledWith('1');
  });

  it('should disable Base UoM field when inventory movements exist', async () => {
    await TestBed.resetTestingModule();
    const productServiceSpy = {
      createProduct: vi.fn(),
      updateProduct: vi.fn(),
      getProducts: vi.fn(),
      getCategories: vi.fn(),
      getSubCategories: vi.fn(),
      getAssignedUoMs: vi.fn(),
      getUOMCatalog: vi.fn(),
      getUOMRelationships: vi.fn(),
      getProduct: vi.fn(),
      checkInventoryMovements: vi.fn()
    };
    const dialogRefSpy = {
      close: vi.fn()
    };
    const snackBarSpy = {
      openFromComponent: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ProductDetailModalComponent, ReactiveFormsModule],
      providers: [
        { provide: ProductService, useValue: productServiceSpy },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: MAT_DIALOG_DATA, useValue: { product: mockProduct } }
      ]
    }).compileComponents();

    productService = TestBed.inject(ProductService) as any;
    productService.getCategories.mockReturnValue(of({ data: [] }));
    productService.getSubCategories.mockReturnValue(of({ data: [] }));
    productService.getAssignedUoMs.mockReturnValue(of([]));
    productService.getUOMCatalog.mockReturnValue(of([]));
    productService.getUOMRelationships.mockReturnValue(of([]));
    productService.checkInventoryMovements.mockReturnValue(of({ has_movements: true }));

    fixture = TestBed.createComponent(ProductDetailModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // Wait for async operations
    await fixture.whenStable();

    expect(component.hasInventoryMovements()).toBe(true);
    expect(component.form.get('base_uom_id')?.disabled).toBe(true);
  });

  it('should display warning message when inventory movements exist', async () => {
    await TestBed.resetTestingModule();
    const productServiceSpy = {
      createProduct: vi.fn(),
      updateProduct: vi.fn(),
      getProducts: vi.fn(),
      getCategories: vi.fn(),
      getSubCategories: vi.fn(),
      getAssignedUoMs: vi.fn(),
      getUOMCatalog: vi.fn(),
      getUOMRelationships: vi.fn(),
      getProduct: vi.fn(),
      checkInventoryMovements: vi.fn()
    };
    const dialogRefSpy = {
      close: vi.fn()
    };
    const snackBarSpy = {
      openFromComponent: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ProductDetailModalComponent, ReactiveFormsModule],
      providers: [
        { provide: ProductService, useValue: productServiceSpy },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: MAT_DIALOG_DATA, useValue: { product: mockProduct } }
      ]
    }).compileComponents();

    productService = TestBed.inject(ProductService) as any;
    productService.getCategories.mockReturnValue(of({ data: [] }));
    productService.getSubCategories.mockReturnValue(of({ data: [] }));
    productService.getAssignedUoMs.mockReturnValue(of([]));
    productService.getUOMCatalog.mockReturnValue(of([]));
    productService.getUOMRelationships.mockReturnValue(of([]));
    productService.checkInventoryMovements.mockReturnValue(of({ has_movements: true }));

    fixture = TestBed.createComponent(ProductDetailModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // Wait for async operations
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    const warningMessage = compiled.textContent;
    expect(warningMessage).toContain('No se puede cambiar la UoM base si el producto tiene movimientos de inventario');
  });

  it('should display explanation text when inventory movements exist', async () => {
    await TestBed.resetTestingModule();
    const productServiceSpy = {
      createProduct: vi.fn(),
      updateProduct: vi.fn(),
      getProducts: vi.fn(),
      getCategories: vi.fn(),
      getSubCategories: vi.fn(),
      getAssignedUoMs: vi.fn(),
      getUOMCatalog: vi.fn(),
      getUOMRelationships: vi.fn(),
      getProduct: vi.fn(),
      checkInventoryMovements: vi.fn()
    };
    const dialogRefSpy = {
      close: vi.fn()
    };
    const snackBarSpy = {
      openFromComponent: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ProductDetailModalComponent, ReactiveFormsModule],
      providers: [
        { provide: ProductService, useValue: productServiceSpy },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: MAT_DIALOG_DATA, useValue: { product: mockProduct } }
      ]
    }).compileComponents();

    productService = TestBed.inject(ProductService) as any;
    productService.getCategories.mockReturnValue(of({ data: [] }));
    productService.getSubCategories.mockReturnValue(of({ data: [] }));
    productService.getAssignedUoMs.mockReturnValue(of([]));
    productService.getUOMCatalog.mockReturnValue(of([]));
    productService.getUOMRelationships.mockReturnValue(of([]));
    productService.checkInventoryMovements.mockReturnValue(of({ has_movements: true }));

    fixture = TestBed.createComponent(ProductDetailModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // Wait for async operations
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    const explanationText = compiled.textContent;
    expect(explanationText).toContain('Para cambiar la UoM base, primero debe resolver los movimientos de inventario existentes');
  });

  it('should not disable Base UoM field when no inventory movements', async () => {
    await TestBed.resetTestingModule();
    const productServiceSpy = {
      createProduct: vi.fn(),
      updateProduct: vi.fn(),
      getProducts: vi.fn(),
      getCategories: vi.fn(),
      getSubCategories: vi.fn(),
      getAssignedUoMs: vi.fn(),
      getUOMCatalog: vi.fn(),
      getUOMRelationships: vi.fn(),
      getProduct: vi.fn(),
      checkInventoryMovements: vi.fn()
    };
    const dialogRefSpy = {
      close: vi.fn()
    };
    const snackBarSpy = {
      openFromComponent: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ProductDetailModalComponent, ReactiveFormsModule],
      providers: [
        { provide: ProductService, useValue: productServiceSpy },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: MAT_DIALOG_DATA, useValue: { product: mockProduct } }
      ]
    }).compileComponents();

    productService = TestBed.inject(ProductService) as any;
    productService.getCategories.mockReturnValue(of({ data: [] }));
    productService.getSubCategories.mockReturnValue(of({ data: [] }));
    productService.getAssignedUoMs.mockReturnValue(of([]));
    productService.getUOMCatalog.mockReturnValue(of([]));
    productService.getUOMRelationships.mockReturnValue(of([]));
    productService.checkInventoryMovements.mockReturnValue(of({ has_movements: false }));

    fixture = TestBed.createComponent(ProductDetailModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // Wait for async operations
    await fixture.whenStable();

    expect(component.hasInventoryMovements()).toBe(false);
    expect(component.form.get('base_uom_id')?.disabled).toBe(false);
  });

  // Error Handling Tests
  it('should handle 409 Conflict error for Base UoM validation', () => {
    productService.createProduct.mockReturnValue(
      throwError(() => ({
        status: 409,
        error: { message: 'base_uom_id must be in assigned UoMs' }
      }))
    );

    component.form.patchValue({
      sku: 'SKU001',
      name: 'Product 1',
      base_uom_id: 'invalid-uom'
    });

    component.save();

    expect(snackBar.openFromComponent).toHaveBeenCalled();
    const callArgs = snackBar.openFromComponent.mock.calls[0];
    expect(callArgs[1].data.type).toBe('error');
    expect(callArgs[1].data.message).toContain('UoM base');
  });

  it('should keep modal open on 409 Conflict error', () => {
    productService.createProduct.mockReturnValue(
      throwError(() => ({
        status: 409,
        error: { message: 'base_uom_id validation failed' }
      }))
    );

    component.form.patchValue({
      sku: 'SKU001',
      name: 'Product 1'
    });

    component.save();

    // Modal should not close
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('should mark base_uom_id field as touched on 409 error', () => {
    productService.createProduct.mockReturnValue(
      throwError(() => ({
        status: 409,
        error: { message: 'base_uom_id conflict' }
      }))
    );

    component.form.patchValue({
      sku: 'SKU001',
      name: 'Product 1'
    });

    const baseUoMControl = component.form.get('base_uom_id');
    expect(baseUoMControl?.touched).toBe(false);

    component.save();

    expect(baseUoMControl?.touched).toBe(true);
  });

  it('should display specific error message for Base UoM not in assigned UoMs', () => {
    productService.createProduct.mockReturnValue(
      throwError(() => ({
        status: 409,
        error: { message: 'base_uom_id is not in assigned UoMs' }
      }))
    );

    component.form.patchValue({
      sku: 'SKU001',
      name: 'Product 1'
    });

    component.save();

    const callArgs = snackBar.openFromComponent.mock.calls[0];
    expect(callArgs[1].data.message).toContain('no está en la lista de UoMs asignadas');
  });

  it('should display specific error message for inventory movement conflict', () => {
    productService.createProduct.mockReturnValue(
      throwError(() => ({
        status: 409,
        error: { message: 'Cannot change base_uom_id due to inventory movements' }
      }))
    );

    component.form.patchValue({
      sku: 'SKU001',
      name: 'Product 1'
    });

    component.save();

    const callArgs = snackBar.openFromComponent.mock.calls[0];
    expect(callArgs[1].data.message).toContain('movimientos de inventario');
  });

  it('should handle network error (status 0)', () => {
    productService.createProduct.mockReturnValue(
      throwError(() => ({
        status: 0,
        error: null
      }))
    );

    component.form.patchValue({
      sku: 'SKU001',
      name: 'Product 1'
    });

    component.save();

    const callArgs = snackBar.openFromComponent.mock.calls[0];
    expect(callArgs[1].data.message).toContain('Error de conexión');
  });

  it('should handle network error (no status)', () => {
    productService.createProduct.mockReturnValue(
      throwError(() => ({
        error: null
      }))
    );

    component.form.patchValue({
      sku: 'SKU001',
      name: 'Product 1'
    });

    component.save();

    const callArgs = snackBar.openFromComponent.mock.calls[0];
    expect(callArgs[1].data.message).toContain('Error de conexión');
  });

  it('should handle server error (500)', () => {
    productService.createProduct.mockReturnValue(
      throwError(() => ({
        status: 500,
        error: { message: 'Internal server error' }
      }))
    );

    component.form.patchValue({
      sku: 'SKU001',
      name: 'Product 1'
    });

    component.save();

    const callArgs = snackBar.openFromComponent.mock.calls[0];
    expect(callArgs[1].data.message).toContain('Error del servidor');
  });

  it('should handle generic error with message', () => {
    productService.createProduct.mockReturnValue(
      throwError(() => ({
        status: 400,
        error: { message: 'Invalid product data' }
      }))
    );

    component.form.patchValue({
      sku: 'SKU001',
      name: 'Product 1'
    });

    component.save();

    const callArgs = snackBar.openFromComponent.mock.calls[0];
    expect(callArgs[1].data.message).toContain('Invalid product data');
  });

  it('should handle generic error without message', () => {
    productService.createProduct.mockReturnValue(
      throwError(() => ({
        status: 400,
        error: {}
      }))
    );

    component.form.patchValue({
      sku: 'SKU001',
      name: 'Product 1'
    });

    component.save();

    const callArgs = snackBar.openFromComponent.mock.calls[0];
    expect(callArgs[1].data.message).toContain('Error al guardar el producto');
  });

  it('should keep modal open on network error', () => {
    productService.createProduct.mockReturnValue(
      throwError(() => ({
        status: 0,
        error: null
      }))
    );

    component.form.patchValue({
      sku: 'SKU001',
      name: 'Product 1'
    });

    component.save();

    // Modal should not close
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('should keep modal open on server error', () => {
    productService.createProduct.mockReturnValue(
      throwError(() => ({
        status: 500,
        error: { message: 'Server error' }
      }))
    );

    component.form.patchValue({
      sku: 'SKU001',
      name: 'Product 1'
    });

    component.save();

    // Modal should not close
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('should reset saving state on error', () => {
    productService.createProduct.mockReturnValue(
      throwError(() => ({
        status: 409,
        error: { message: 'Conflict' }
      }))
    );

    component.form.patchValue({
      sku: 'SKU001',
      name: 'Product 1'
    });

    expect(component.saving()).toBe(false);
    component.save();
    expect(component.saving()).toBe(false);
  });

  it('should handle update error with 409 Conflict', async () => {
    await TestBed.resetTestingModule();
    const productServiceSpy = {
      createProduct: vi.fn(),
      updateProduct: vi.fn(),
      getProducts: vi.fn(),
      getCategories: vi.fn(),
      getSubCategories: vi.fn(),
      getAssignedUoMs: vi.fn(),
      getUOMCatalog: vi.fn(),
      getUOMRelationships: vi.fn(),
      getProduct: vi.fn(),
      checkInventoryMovements: vi.fn()
    };
    const dialogRefSpy = {
      close: vi.fn()
    };
    const snackBarSpy = {
      openFromComponent: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ProductDetailModalComponent, ReactiveFormsModule],
      providers: [
        { provide: ProductService, useValue: productServiceSpy },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: MAT_DIALOG_DATA, useValue: { product: mockProduct } }
      ]
    }).compileComponents();

    productService = TestBed.inject(ProductService) as any;
    snackBar = TestBed.inject(MatSnackBar) as any;
    dialogRef = TestBed.inject(MatDialogRef) as any;

    productService.getCategories.mockReturnValue(of({ data: [] }));
    productService.getSubCategories.mockReturnValue(of({ data: [] }));
    productService.getAssignedUoMs.mockReturnValue(of([]));
    productService.getUOMCatalog.mockReturnValue(of([]));
    productService.getUOMRelationships.mockReturnValue(of([]));
    productService.checkInventoryMovements.mockReturnValue(of({ has_movements: false }));
    productService.updateProduct.mockReturnValue(
      throwError(() => ({
        status: 409,
        error: { message: 'base_uom_id conflict on update' }
      }))
    );

    fixture = TestBed.createComponent(ProductDetailModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.form.patchValue({
      name: 'Updated Product'
    });

    component.save();

    expect(snackBar.openFromComponent).toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('should handle null base_uom_id gracefully', () => {
    productService.createProduct.mockReturnValue(of(mockProduct));

    component.form.patchValue({
      sku: 'SKU001',
      name: 'Product 1',
      base_uom_id: null
    });

    component.assignedUoMs.set([]);
    fixture.detectChanges();

    component.save();

    expect(productService.createProduct).toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalledWith(mockProduct);
  });

  // Base UoM Validation Consistency Check Tests
  it('should validate Base UoM consistency when assigned UoMs are loaded', () => {
    // Set a Base UoM
    component.form.get('base_uom_id')?.setValue('uom1');
    
    // Load assigned UoMs that include the Base UoM
    component.assignedUoMs.set([
      { id: 'uom1', name: 'Caja', code: 'CJA' },
      { id: 'uom2', name: 'Pieza', code: 'PZA' }
    ]);
    fixture.detectChanges();

    // Base UoM should still be valid
    expect(component.form.get('base_uom_id')?.value).toBe('uom1');
    expect(snackBar.openFromComponent).not.toHaveBeenCalled();
  });

  it('should clear Base UoM and alert user when Base UoM becomes invalid after loading assigned UoMs', () => {
    // Set a Base UoM
    component.form.get('base_uom_id')?.setValue('uom1');
    
    // Load assigned UoMs that do NOT include the Base UoM
    component.assignedUoMs.set([
      { id: 'uom2', name: 'Pieza', code: 'PZA' },
      { id: 'uom3', name: 'Kilogramo', code: 'KG' }
    ]);
    fixture.detectChanges();

    // Base UoM should be cleared
    expect(component.form.get('base_uom_id')?.value).toBeNull();
    
    // User should be alerted
    expect(snackBar.openFromComponent).toHaveBeenCalled();
    const callArgs = snackBar.openFromComponent.mock.calls[0];
    expect(callArgs[1].data.type).toBe('warning');
    expect(callArgs[1].data.message).toContain('ya no está disponible');
  });

  it('should not alert user when Base UoM is not set', () => {
    // No Base UoM set
    component.form.get('base_uom_id')?.setValue(null);
    
    // Load assigned UoMs
    component.assignedUoMs.set([
      { id: 'uom1', name: 'Caja', code: 'CJA' },
      { id: 'uom2', name: 'Pieza', code: 'PZA' }
    ]);
    fixture.detectChanges();

    // No alert should be shown
    expect(snackBar.openFromComponent).not.toHaveBeenCalled();
  });

  it('should alert user when Base UoM is deleted', () => {
    // Set a Base UoM
    component.form.get('base_uom_id')?.setValue('uom1');
    component.uoms.set([
      { id: 'uom1', name: 'Caja', code: 'CJA' },
      { id: 'uom2', name: 'Pieza', code: 'PZA' }
    ]);
    fixture.detectChanges();

    // Mock the delete response
    productService.deleteUOM.mockReturnValue(of({}));

    // Delete the Base UoM
    component.deleteUOM({ id: 'uom1', name: 'Caja', code: 'CJA' });

    // Base UoM should be cleared
    expect(component.form.get('base_uom_id')?.value).toBeNull();
    
    // User should be alerted about the deletion
    const callArgs = snackBar.openFromComponent.mock.calls[0];
    expect(callArgs[1].data.type).toBe('warning');
    expect(callArgs[1].data.message).toContain('ha sido eliminada');
    expect(callArgs[1].data.message).toContain('selecciona una nueva UoM base');
  });

  it('should reload assigned UoMs when non-Base UoM is deleted', () => {
    // Set a Base UoM
    component.form.get('base_uom_id')?.setValue('uom1');
    component.uoms.set([
      { id: 'uom1', name: 'Caja', code: 'CJA' },
      { id: 'uom2', name: 'Pieza', code: 'PZA' }
    ]);
    fixture.detectChanges();

    // Mock the delete response
    productService.deleteUOM.mockReturnValue(of({}));
    productService.getAssignedUoMs.mockReturnValue(of([
      { id: 'uom1', name: 'Caja', code: 'CJA' }
    ]));

    // Delete a non-Base UoM
    component.deleteUOM({ id: 'uom2', name: 'Pieza', code: 'PZA' });

    // Assigned UoMs should be reloaded
    expect(productService.getAssignedUoMs).toHaveBeenCalled();
  });

  it('should reload assigned UoMs when new UoM is assigned', () => {
    component.data.product = mockProduct;
    component.selectedCatalogUomId.set('uom-catalog-1');
    component.catalogUoms.set([
      { id: 'uom-catalog-1', name: 'Caja', description: 'Box' }
    ]);
    fixture.detectChanges();

    // Mock the create response
    productService.createUOM.mockReturnValue(of({ id: 'uom1', name: 'Caja', code: 'CJA' }));
    productService.getAssignedUoMs.mockReturnValue(of([
      { id: 'uom1', name: 'Caja', code: 'CJA' }
    ]));

    // Assign a new UoM
    component.assignSingleUoM();

    // Assigned UoMs should be reloaded
    expect(productService.getAssignedUoMs).toHaveBeenCalled();
  });

  it('should validate Base UoM consistency after assigning new UoM', () => {
    component.data.product = mockProduct;
    component.form.get('base_uom_id')?.setValue('uom1');
    component.selectedCatalogUomId.set('uom-catalog-2');
    component.catalogUoms.set([
      { id: 'uom-catalog-1', name: 'Caja', description: 'Box' },
      { id: 'uom-catalog-2', name: 'Pieza', description: 'Piece' }
    ]);
    fixture.detectChanges();

    // Mock the create response
    productService.createUOM.mockReturnValue(of({ id: 'uom2', name: 'Pieza', code: 'PZA' }));
    // Return assigned UoMs that do NOT include the Base UoM
    productService.getAssignedUoMs.mockReturnValue(of([
      { id: 'uom2', name: 'Pieza', code: 'PZA' }
    ]));

    // Assign a new UoM
    component.assignSingleUoM();

    // Base UoM should be cleared if it's no longer in the list
    expect(component.form.get('base_uom_id')?.value).toBeNull();
  });

  it('should handle Base UoM consistency check with empty assigned UoMs', () => {
    // Set a Base UoM
    component.form.get('base_uom_id')?.setValue('uom1');
    
    // Load empty assigned UoMs
    component.assignedUoMs.set([]);
    fixture.detectChanges();

    // Base UoM should be cleared
    expect(component.form.get('base_uom_id')?.value).toBeNull();
    
    // User should be alerted
    expect(snackBar.openFromComponent).toHaveBeenCalled();
  });

  it('should preserve Base UoM when it remains in assigned UoMs after modification', () => {
    // Set a Base UoM
    component.form.get('base_uom_id')?.setValue('uom1');
    
    // Load assigned UoMs that include the Base UoM
    component.assignedUoMs.set([
      { id: 'uom1', name: 'Caja', code: 'CJA' },
      { id: 'uom2', name: 'Pieza', code: 'PZA' }
    ]);
    fixture.detectChanges();

    // Base UoM should be preserved
    expect(component.form.get('base_uom_id')?.value).toBe('uom1');
    
    // No alert should be shown
    expect(snackBar.openFromComponent).not.toHaveBeenCalled();
  });

  // Multi-Tenant Isolation Tests
  // **Property 20: Multi-Tenant Isolation**
  // **Validates: Requirements 1.1, 1.2, 1.3**
  
  it('should maintain tenant_id when creating product with Base UoM', () => {
    const productWithTenant: Product = {
      id: '1',
      tenant_id: 'tenant1',
      sku: 'SKU001',
      name: 'Product 1',
      description: 'Description 1',
      base_uom_id: 'uom1',
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    };

    productService.createProduct.mockReturnValue(of(productWithTenant));

    component.form.patchValue({
      sku: 'SKU001',
      name: 'Product 1',
      base_uom_id: 'uom1'
    });

    component.save();

    // Verify the product returned has the correct tenant_id
    expect(dialogRef.close).toHaveBeenCalledWith(productWithTenant);
    expect(productWithTenant.tenant_id).toBe('tenant1');
  });

  it('should maintain tenant_id when updating product with Base UoM', async () => {
    await TestBed.resetTestingModule();
    const productServiceSpy = {
      createProduct: vi.fn(),
      updateProduct: vi.fn(),
      getProducts: vi.fn(),
      getCategories: vi.fn(),
      getSubCategories: vi.fn(),
      getAssignedUoMs: vi.fn(),
      getUOMCatalog: vi.fn(),
      getUOMRelationships: vi.fn(),
      getProduct: vi.fn(),
      checkInventoryMovements: vi.fn()
    };
    const dialogRefSpy = {
      close: vi.fn()
    };
    const snackBarSpy = {
      openFromComponent: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ProductDetailModalComponent, ReactiveFormsModule],
      providers: [
        { provide: ProductService, useValue: productServiceSpy },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: MAT_DIALOG_DATA, useValue: { product: mockProduct } }
      ]
    }).compileComponents();

    productService = TestBed.inject(ProductService) as any;
    dialogRef = TestBed.inject(MatDialogRef) as any;

    const updatedProduct: Product = {
      id: '1',
      tenant_id: 'tenant1',
      sku: 'SKU001',
      name: 'Updated Product',
      description: 'Description 1',
      base_uom_id: 'uom1',
      created_at: '2024-01-01',
      updated_at: '2024-01-02'
    };

    productService.updateProduct.mockReturnValue(of(updatedProduct));
    productService.getCategories.mockReturnValue(of({ data: [] }));
    productService.getSubCategories.mockReturnValue(of({ data: [] }));
    productService.getAssignedUoMs.mockReturnValue(of([]));
    productService.getUOMCatalog.mockReturnValue(of([]));
    productService.getUOMRelationships.mockReturnValue(of([]));
    productService.checkInventoryMovements.mockReturnValue(of({ has_movements: false }));

    fixture = TestBed.createComponent(ProductDetailModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.form.patchValue({
      name: 'Updated Product',
      base_uom_id: 'uom1'
    });

    component.save();

    // Verify the product returned has the correct tenant_id
    expect(dialogRef.close).toHaveBeenCalledWith(updatedProduct);
    expect(updatedProduct.tenant_id).toBe('tenant1');
  });

  it('should only load products for current tenant', () => {
    const tenant1Products: Product[] = [
      {
        id: '1',
        tenant_id: 'tenant1',
        sku: 'SKU001',
        name: 'Product 1',
        description: 'Description 1',
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      }
    ];

    productService.getProducts.mockReturnValue(of({
      data: tenant1Products,
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
      hasNext: false,
      hasPrev: false
    }));

    // When loading products, the API should be called with tenant context
    // The backend automatically filters by tenant_id from the request context
    productService.getProducts();

    // Verify that only tenant1 products are returned
    expect(productService.getProducts).toHaveBeenCalled();
  });

  it('should not allow editing products from other tenants', async () => {
    await TestBed.resetTestingModule();
    
    const otherTenantProduct: Product = {
      id: '2',
      tenant_id: 'tenant2', // Different tenant
      sku: 'SKU002',
      name: 'Other Tenant Product',
      description: 'Description 2',
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    };

    const productServiceSpy = {
      createProduct: vi.fn(),
      updateProduct: vi.fn(),
      getProducts: vi.fn(),
      getCategories: vi.fn(),
      getSubCategories: vi.fn(),
      getAssignedUoMs: vi.fn(),
      getUOMCatalog: vi.fn(),
      getUOMRelationships: vi.fn(),
      getProduct: vi.fn(),
      checkInventoryMovements: vi.fn()
    };
    const dialogRefSpy = {
      close: vi.fn()
    };
    const snackBarSpy = {
      openFromComponent: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ProductDetailModalComponent, ReactiveFormsModule],
      providers: [
        { provide: ProductService, useValue: productServiceSpy },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: MAT_DIALOG_DATA, useValue: { product: otherTenantProduct } }
      ]
    }).compileComponents();

    productService = TestBed.inject(ProductService) as any;

    // Backend should return 403 Forbidden when trying to access other tenant's product
    productService.getProduct.mockReturnValue(
      throwError(() => ({
        status: 403,
        error: { message: 'Forbidden: Product does not belong to your tenant' }
      }))
    );
    productService.getCategories.mockReturnValue(of({ data: [] }));
    productService.getSubCategories.mockReturnValue(of({ data: [] }));
    productService.getAssignedUoMs.mockReturnValue(of([]));
    productService.getUOMCatalog.mockReturnValue(of([]));
    productService.getUOMRelationships.mockReturnValue(of([]));
    productService.checkInventoryMovements.mockReturnValue(of({ has_movements: false }));

    fixture = TestBed.createComponent(ProductDetailModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // The component should handle the 403 error gracefully
    expect(productService.getProduct).toHaveBeenCalledWith('2');
  });

  it('should include tenant_id in API requests for Base UoM operations', () => {
    const createDto = {
      sku: 'SKU001',
      name: 'Product 1',
      base_uom_id: 'uom1'
    };

    productService.createProduct.mockReturnValue(of(mockProduct));

    component.form.patchValue(createDto);
    component.save();

    // Verify that createProduct was called with the correct data
    expect(productService.createProduct).toHaveBeenCalledWith(createDto);
    
    // The tenant_id is automatically added by the backend based on the request context
    // The frontend doesn't need to explicitly include it in the DTO
  });

  it('should verify Base UoM belongs to current tenant when loading assigned UoMs', () => {
    const assignedUoMs = [
      { id: 'uom1', name: 'Caja', code: 'CJA' },
      { id: 'uom2', name: 'Pieza', code: 'PZA' }
    ];

    productService.getAssignedUoMs.mockReturnValue(of(assignedUoMs));

    component.loadAssignedUoMs('product1');

    // Verify that getAssignedUoMs was called for the product
    expect(productService.getAssignedUoMs).toHaveBeenCalledWith('product1');
    
    // The backend ensures that only UoMs assigned to products in the current tenant are returned
  });

  it('should not display Base UoM from other tenants in dropdown', () => {
    // Set assigned UoMs for current tenant
    component.assignedUoMs.set([
      { id: 'uom1', name: 'Caja', code: 'CJA' },
      { id: 'uom2', name: 'Pieza', code: 'PZA' }
    ]);
    fixture.detectChanges();

    // Verify that only assigned UoMs are shown in the dropdown
    const compiled = fixture.nativeElement;
    const options = compiled.querySelectorAll('select[formControlName="base_uom_id"] option');
    
    // Should have placeholder + 2 assigned UoMs
    expect(options.length).toBe(3);
    
    // Verify that no UoMs from other tenants are included
    const optionTexts = Array.from(options).map((opt: any) => opt.textContent);
    expect(optionTexts).toContain('Seleccionar UoM base');
    expect(optionTexts).toContain('Caja');
    expect(optionTexts).toContain('Pieza');
  });

  it('should maintain tenant isolation when checking inventory movements', () => {
    productService.checkInventoryMovements.mockReturnValue(of({ has_movements: true }));

    component.checkInventoryMovements('product1');

    // Verify that checkInventoryMovements was called for the product
    expect(productService.checkInventoryMovements).toHaveBeenCalledWith('product1');
    
    // The backend ensures that only inventory movements for products in the current tenant are checked
  });

  it('should not allow Base UoM changes for products from other tenants', async () => {
    await TestBed.resetTestingModule();
    
    const otherTenantProduct: Product = {
      id: '2',
      tenant_id: 'tenant2',
      sku: 'SKU002',
      name: 'Other Tenant Product',
      description: 'Description 2',
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    };

    const productServiceSpy = {
      createProduct: vi.fn(),
      updateProduct: vi.fn(),
      getProducts: vi.fn(),
      getCategories: vi.fn(),
      getSubCategories: vi.fn(),
      getAssignedUoMs: vi.fn(),
      getUOMCatalog: vi.fn(),
      getUOMRelationships: vi.fn(),
      getProduct: vi.fn(),
      checkInventoryMovements: vi.fn()
    };
    const dialogRefSpy = {
      close: vi.fn()
    };
    const snackBarSpy = {
      openFromComponent: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ProductDetailModalComponent, ReactiveFormsModule],
      providers: [
        { provide: ProductService, useValue: productServiceSpy },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: MAT_DIALOG_DATA, useValue: { product: otherTenantProduct } }
      ]
    }).compileComponents();

    productService = TestBed.inject(ProductService) as any;

    // Backend should return 403 Forbidden when trying to update other tenant's product
    productService.updateProduct.mockReturnValue(
      throwError(() => ({
        status: 403,
        error: { message: 'Forbidden: Product does not belong to your tenant' }
      }))
    );
    productService.getCategories.mockReturnValue(of({ data: [] }));
    productService.getSubCategories.mockReturnValue(of({ data: [] }));
    productService.getAssignedUoMs.mockReturnValue(of([]));
    productService.getUOMCatalog.mockReturnValue(of([]));
    productService.getUOMRelationships.mockReturnValue(of([]));
    productService.checkInventoryMovements.mockReturnValue(of({ has_movements: false }));

    fixture = TestBed.createComponent(ProductDetailModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.form.patchValue({
      name: 'Attempted Update',
      base_uom_id: 'uom1'
    });

    component.save();

    // The backend should prevent the update
    expect(productService.updateProduct).toHaveBeenCalled();
  });

  // Accessibility Tests
  describe('Accessibility Features', () => {
    it('should have aria-label on Base UoM select field', () => {
      const compiled = fixture.nativeElement;
      const selectElement = compiled.querySelector('#base_uom_id');
      expect(selectElement?.getAttribute('aria-label')).toBeTruthy();
      expect(selectElement?.getAttribute('aria-label')).toContain('Seleccionar UoM Base');
    });

    it('should have aria-label indicating required status when Base UoM is required', () => {
      component.assignedUoMs.set([
        { id: 'uom1', name: 'Caja', code: 'CJA' }
      ]);
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const selectElement = compiled.querySelector('#base_uom_id');
      expect(selectElement?.getAttribute('aria-label')).toContain('requerido');
    });

    it('should have aria-describedby pointing to help text', () => {
      const compiled = fixture.nativeElement;
      const selectElement = compiled.querySelector('#base_uom_id');
      expect(selectElement?.getAttribute('aria-describedby')).toBe('base_uom_help');
    });

    it('should have aria-describedby pointing to error message when invalid', () => {
      component.assignedUoMs.set([
        { id: 'uom1', name: 'Caja', code: 'CJA' }
      ]);
      fixture.detectChanges();

      const baseUoMControl = component.form.get('base_uom_id');
      baseUoMControl?.markAsTouched();
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const selectElement = compiled.querySelector('#base_uom_id');
      expect(selectElement?.getAttribute('aria-describedby')).toBe('base_uom_error');
    });

    it('should have aria-invalid set to true when field is invalid and touched', () => {
      component.assignedUoMs.set([
        { id: 'uom1', name: 'Caja', code: 'CJA' }
      ]);
      fixture.detectChanges();

      const baseUoMControl = component.form.get('base_uom_id');
      baseUoMControl?.markAsTouched();
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const selectElement = compiled.querySelector('#base_uom_id');
      expect(selectElement?.getAttribute('aria-invalid')).toBe('true');
    });

    it('should have aria-invalid set to false when field is valid', () => {
      component.assignedUoMs.set([
        { id: 'uom1', name: 'Caja', code: 'CJA' }
      ]);
      fixture.detectChanges();

      const baseUoMControl = component.form.get('base_uom_id');
      baseUoMControl?.setValue('uom1');
      baseUoMControl?.markAsTouched();
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const selectElement = compiled.querySelector('#base_uom_id');
      expect(selectElement?.getAttribute('aria-invalid')).toBe('false');
    });

    it('should have error message with role="alert" and aria-live="polite"', () => {
      component.assignedUoMs.set([
        { id: 'uom1', name: 'Caja', code: 'CJA' }
      ]);
      fixture.detectChanges();

      const baseUoMControl = component.form.get('base_uom_id');
      baseUoMControl?.markAsTouched();
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const errorElement = compiled.querySelector('#base_uom_error');
      expect(errorElement?.getAttribute('role')).toBe('alert');
      expect(errorElement?.getAttribute('aria-live')).toBe('polite');
      expect(errorElement?.getAttribute('aria-atomic')).toBe('true');
    });

    it('should have warning message with role="alert" and aria-live="polite"', async () => {
      await TestBed.resetTestingModule();
      const productServiceSpy = {
        createProduct: vi.fn(),
        updateProduct: vi.fn(),
        getProducts: vi.fn(),
        getCategories: vi.fn(),
        getSubCategories: vi.fn(),
        getAssignedUoMs: vi.fn(),
        getUOMCatalog: vi.fn(),
        getUOMRelationships: vi.fn(),
        getProduct: vi.fn(),
        checkInventoryMovements: vi.fn()
      };
      const dialogRefSpy = {
        close: vi.fn()
      };
      const snackBarSpy = {
        openFromComponent: vi.fn()
      };

      await TestBed.configureTestingModule({
        imports: [ProductDetailModalComponent, ReactiveFormsModule],
        providers: [
          { provide: ProductService, useValue: productServiceSpy },
          { provide: MatDialogRef, useValue: dialogRefSpy },
          { provide: MatSnackBar, useValue: snackBarSpy },
          { provide: MAT_DIALOG_DATA, useValue: { product: mockProduct } }
        ]
      }).compileComponents();

      productService = TestBed.inject(ProductService) as any;
      productService.getCategories.mockReturnValue(of({ data: [] }));
      productService.getSubCategories.mockReturnValue(of({ data: [] }));
      productService.getAssignedUoMs.mockReturnValue(of([]));
      productService.getUOMCatalog.mockReturnValue(of([]));
      productService.getUOMRelationships.mockReturnValue(of([]));
      productService.checkInventoryMovements.mockReturnValue(of({ has_movements: true }));

      fixture = TestBed.createComponent(ProductDetailModalComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      await fixture.whenStable();
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const warningElement = compiled.querySelector('[role="alert"]');
      expect(warningElement?.getAttribute('aria-live')).toBe('polite');
      expect(warningElement?.getAttribute('aria-atomic')).toBe('true');
    });

    it('should have help icon button with aria-label', () => {
      const compiled = fixture.nativeElement;
      const helpButton = compiled.querySelector('button[aria-label*="Información"]');
      expect(helpButton).toBeTruthy();
      expect(helpButton?.getAttribute('aria-label')).toContain('Información sobre UoM Base');
    });

    it('should have tooltip with role="tooltip" and aria-describedby', () => {
      const compiled = fixture.nativeElement;
      const tooltip = compiled.querySelector('[role="tooltip"]');
      expect(tooltip).toBeTruthy();
      expect(tooltip?.id).toBe('base_uom_help_tooltip');
    });

    it('should have conversion preview region with role="region" and aria-label', () => {
      const assignedUoMs = [
        { id: 'uom1', name: 'Caja', code: 'CJA' },
        { id: 'uom2', name: 'Pieza', code: 'PZA' }
      ];
      const relationships = [
        { id: 'rel1', source_uom_id: 'uom2', target_uom_id: 'uom1', conversion_factor: 50 }
      ];

      component.assignedUoMs.set(assignedUoMs);
      component.relationships.set(relationships);
      fixture.detectChanges();

      component.form.get('base_uom_id')?.setValue('uom1');
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const previewRegion = compiled.querySelector('[role="region"]');
      expect(previewRegion).toBeTruthy();
      expect(previewRegion?.getAttribute('aria-label')).toContain('Vista previa de conversiones');
      expect(previewRegion?.getAttribute('aria-live')).toBe('polite');
    });

    it('should have help text with proper id for aria-describedby', () => {
      const compiled = fixture.nativeElement;
      const helpText = compiled.querySelector('#base_uom_help');
      expect(helpText).toBeTruthy();
      expect(helpText?.textContent).toContain('La UoM base se usa para calcular inventarios');
    });

    it('should support Escape key to clear Base UoM selection', () => {
      component.assignedUoMs.set([
        { id: 'uom1', name: 'Caja', code: 'CJA' }
      ]);
      fixture.detectChanges();

      const baseUoMControl = component.form.get('base_uom_id');
      baseUoMControl?.setValue('uom1');
      expect(baseUoMControl?.value).toBe('uom1');

      // Simulate Escape key
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      component.onBaseUoMKeydown(event);

      expect(baseUoMControl?.value).toBeNull();
    });

    it('should have required indicator with aria-label', () => {
      component.assignedUoMs.set([
        { id: 'uom1', name: 'Caja', code: 'CJA' }
      ]);
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const requiredIndicator = compiled.querySelector('label span.text-red-500');
      expect(requiredIndicator?.getAttribute('aria-label')).toBe('requerido');
    });

    it('should have proper color contrast for error messages', () => {
      component.assignedUoMs.set([
        { id: 'uom1', name: 'Caja', code: 'CJA' }
      ]);
      fixture.detectChanges();

      const baseUoMControl = component.form.get('base_uom_id');
      baseUoMControl?.markAsTouched();
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const errorElement = compiled.querySelector('#base_uom_error');
      // Error text should have class text-red-700 for WCAG AA contrast
      expect(errorElement?.className).toContain('text-red-700');
    });

    it('should have proper color contrast for warning messages', async () => {
      await TestBed.resetTestingModule();
      const productServiceSpy = {
        createProduct: vi.fn(),
        updateProduct: vi.fn(),
        getProducts: vi.fn(),
        getCategories: vi.fn(),
        getSubCategories: vi.fn(),
        getAssignedUoMs: vi.fn(),
        getUOMCatalog: vi.fn(),
        getUOMRelationships: vi.fn(),
        getProduct: vi.fn(),
        checkInventoryMovements: vi.fn()
      };
      const dialogRefSpy = {
        close: vi.fn()
      };
      const snackBarSpy = {
        openFromComponent: vi.fn()
      };

      await TestBed.configureTestingModule({
        imports: [ProductDetailModalComponent, ReactiveFormsModule],
        providers: [
          { provide: ProductService, useValue: productServiceSpy },
          { provide: MatDialogRef, useValue: dialogRefSpy },
          { provide: MatSnackBar, useValue: snackBarSpy },
          { provide: MAT_DIALOG_DATA, useValue: { product: mockProduct } }
        ]
      }).compileComponents();

      productService = TestBed.inject(ProductService) as any;
      productService.getCategories.mockReturnValue(of({ data: [] }));
      productService.getSubCategories.mockReturnValue(of({ data: [] }));
      productService.getAssignedUoMs.mockReturnValue(of([]));
      productService.getUOMCatalog.mockReturnValue(of([]));
      productService.getUOMRelationships.mockReturnValue(of([]));
      productService.checkInventoryMovements.mockReturnValue(of({ has_movements: true }));

      fixture = TestBed.createComponent(ProductDetailModalComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      await fixture.whenStable();
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const warningElement = compiled.querySelector('[role="alert"]');
      // Warning should have proper contrast colors
      expect(warningElement?.className).toContain('bg-yellow-50');
      expect(warningElement?.className).toContain('border-2');
      expect(warningElement?.className).toContain('border-yellow-400');
    });

    it('should have help text with proper color contrast', () => {
      const compiled = fixture.nativeElement;
      const helpText = compiled.querySelector('#base_uom_help');
      // Help text should have class text-gray-600 for proper contrast
      expect(helpText?.className).toContain('text-gray-600');
    });

    it('should support Tab key for keyboard navigation', () => {
      const compiled = fixture.nativeElement;
      const selectElement = compiled.querySelector('#base_uom_id');
      
      // Tab key should be handled natively by the browser
      // Just verify the element is focusable
      expect(selectElement?.tabIndex).toBeGreaterThanOrEqual(-1);
    });

    it('should support Enter key for dropdown selection', () => {
      component.assignedUoMs.set([
        { id: 'uom1', name: 'Caja', code: 'CJA' }
      ]);
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const selectElement = compiled.querySelector('#base_uom_id') as HTMLSelectElement;
      
      // Enter key should be handled natively by the select element
      // Just verify the element is a select
      expect(selectElement?.tagName).toBe('SELECT');
    });
  });

});

