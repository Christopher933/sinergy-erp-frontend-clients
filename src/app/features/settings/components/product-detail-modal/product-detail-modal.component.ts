import { Component, Inject, signal, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors, FormsModule, ValidatorFn } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProductService } from '../../services/product.service';
import { Product, CreateProductDto, Category, SubCategory } from '../../models/product.model';
import { CustomSnackbarComponent } from '../../../../core/components/custom-snackbar/custom-snackbar.component';
import { Observable, of } from 'rxjs';
import { map, catchError, debounceTime, first, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-product-detail-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './product-detail-modal.component.html',
  styleUrl: './product-detail-modal.component.scss'
})
export class ProductDetailModalComponent implements OnInit {
  form: FormGroup;
  saving = signal(false);
  isNew = true;
  categories = signal<Category[]>([]);
  subcategories = signal<SubCategory[]>([]);
  loadingCategories = signal(false);
  loadingSubcategories = signal(false);
  selectedTabIndex = signal(0);
  uoms = signal<any[]>([]);
  editingUomId = signal<string | null>(null);
  editingUomForm: FormGroup;
  catalogUoms = signal<any[]>([]);
  selectedCatalogUomId = signal<string | null>(null);
  loadingCatalog = signal(false);
  relationships = signal<any[]>([]);
  loadingRelationships = signal(false);
  creatingRelationship = signal(false);
  relationshipForm: FormGroup;
  newRelationshipForm: FormGroup;
  assignedUoMs = signal<any[]>([]);
  loadingAssignedUoMs = signal(false);
  conversionPreview = signal<any[]>([]);
  hasInventoryMovements = signal(false);
  loadingInventoryMovements = signal(false);

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<ProductDetailModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { product: Product | null }
  ) {
    this.isNew = !data.product;
    this.form = this.createForm();
    this.newRelationshipForm = this.fb.group({
      source_uom_id: ['', Validators.required],
      target_uom_id: ['', Validators.required],
      conversion_factor: ['', [Validators.required, Validators.min(0.001)]]
    });

    // Watch for changes to assigned UoMs and update validators
    effect(() => {
      const assigned = this.assignedUoMs();
      const baseUoMControl = this.form.get('base_uom_id');
      if (baseUoMControl) {
        if (assigned.length > 0) {
          // Product has assigned UoMs - make Base UoM required and validate it's in the list
          baseUoMControl.setValidators([
            Validators.required,
            this.validateBaseUoMInAssignedUoMs(assigned)
          ]);
        } else {
          // No assigned UoMs - Base UoM is optional
          baseUoMControl.clearValidators();
        }
        baseUoMControl.updateValueAndValidity({ emitEvent: false });
      }
    });

    // Watch for changes to base_uom_id and update conversion preview
    effect(() => {
      const baseUoMId = this.form.get('base_uom_id')?.value;
      const assigned = this.assignedUoMs();
      const relationships = this.relationships();
      
      if (baseUoMId && assigned.length > 0) {
        this.updateConversionPreview(baseUoMId, assigned, relationships);
      } else {
        this.conversionPreview.set([]);
      }
    });
  }

  ngOnInit(): void {
    this.loadCategories();
    if (this.data.product) {
      // Load full product details to get UOMs
      this.productService.getProduct(this.data.product.id).subscribe({
        next: (fullProduct) => {
          this.form.patchValue(fullProduct);
          if (fullProduct.category_id) {
            this.loadSubcategories(fullProduct.category_id);
          }
          this.loadUOMs(fullProduct);
          this.loadAssignedUoMs(fullProduct.id);
          this.checkInventoryMovements(fullProduct.id);
          // Populate Base UoM field when editing
          if (fullProduct.base_uom_id) {
            this.form.patchValue({ base_uom_id: fullProduct.base_uom_id }, { emitEvent: false });
          }
        },
        error: () => {
          // Fallback to provided product if fetch fails
          this.form.patchValue(this.data.product);
          if (this.data.product.category_id) {
            this.loadSubcategories(this.data.product.category_id);
          }
          this.loadAssignedUoMs(this.data.product.id);
          this.checkInventoryMovements(this.data.product.id);
          // Populate Base UoM field when editing (fallback)
          if (this.data.product.base_uom_id) {
            this.form.patchValue({ base_uom_id: this.data.product.base_uom_id }, { emitEvent: false });
          }
        }
      });
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      sku: ['', [Validators.required], [this.skuUniqueValidator.bind(this)]],
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      category_id: [''],
      subcategory_id: [''],
      base_uom_id: ['']
    });
  }

  private loadCategories(): void {
    this.loadingCategories.set(true);
    this.productService.getCategories().subscribe({
      next: (res) => {
        this.categories.set(res.data);
        this.loadingCategories.set(false);
      },
      error: () => {
        this.loadingCategories.set(false);
        this.snackBar.openFromComponent(CustomSnackbarComponent, {
          data: { message: 'Error al cargar categorías', type: 'error' },
          duration: 3000
        });
      }
    });
  }

  private loadSubcategories(categoryId: string): void {
    this.loadingSubcategories.set(true);
    this.subcategories.set([]);
    this.form.get('subcategory_id')?.setValue('');
    
    this.productService.getSubCategories(categoryId).subscribe({
      next: (res) => {
        this.subcategories.set(res.data);
        this.loadingSubcategories.set(false);
      },
      error: () => {
        this.loadingSubcategories.set(false);
        this.snackBar.openFromComponent(CustomSnackbarComponent, {
          data: { message: 'Error al cargar subcategorías', type: 'error' },
          duration: 3000
        });
      }
    });
  }

  onCategoryChange(categoryId: string): void {
    if (categoryId) {
      this.loadSubcategories(categoryId);
    } else {
      this.subcategories.set([]);
      this.form.get('subcategory_id')?.setValue('');
    }
  }

  private skuUniqueValidator(control: AbstractControl): Observable<ValidationErrors | null> {
    if (!control.value) {
      return of(null);
    }

    // If editing and SKU hasn't changed, don't validate
    if (!this.isNew && control.value === this.data.product?.sku) {
      return of(null);
    }

    return this.productService.getProducts({ search: control.value }).pipe(
      debounceTime(300),
      first(),
      map(response => {
        const exists = response.data.some(p => p.sku === control.value);
        return exists ? { skuExists: true } : null;
      }),
      catchError(() => of(null))
    );
  }

  private validateBaseUoMInAssignedUoMs(assignedUoMs: any[]): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        // Empty value is handled by required validator
        return null;
      }

      const isValid = assignedUoMs.some(uom => uom.id === control.value);
      return isValid ? null : { baseUoMNotInAssigned: true };
    };
  }

  private updateConversionPreview(baseUoMId: string, assignedUoMs: any[], relationships: any[]): void {
    const baseUoM = assignedUoMs.find(uom => uom.id === baseUoMId);
    if (!baseUoM) {
      this.conversionPreview.set([]);
      return;
    }

    const preview: any[] = [];

    // For each assigned UoM (except the base UoM), calculate the conversion factor
    for (const otherUoM of assignedUoMs) {
      if (otherUoM.id === baseUoMId) {
        // Skip the base UoM itself
        continue;
      }

      // Find the conversion factor from otherUoM to baseUoM
      const factor = this.getConversionFactor(otherUoM.id, baseUoMId, relationships);
      
      if (factor !== null) {
        preview.push({
          otherUoM: otherUoM,
          baseUoM: baseUoM,
          factor: factor,
          text: `1 ${otherUoM.code || otherUoM.name} = ${factor} ${baseUoM.code || baseUoM.name}`
        });
      }
    }

    this.conversionPreview.set(preview);
  }

  private getConversionFactor(fromUoMId: string, toUoMId: string, relationships: any[]): number | null {
    // Look for a direct relationship from fromUoMId to toUoMId
    const directRelationship = relationships.find(
      rel => rel.source_uom_id === fromUoMId && rel.target_uom_id === toUoMId
    );

    if (directRelationship) {
      return directRelationship.conversion_factor;
    }

    // Look for an inverse relationship (toUoMId to fromUoMId) and invert the factor
    const inverseRelationship = relationships.find(
      rel => rel.source_uom_id === toUoMId && rel.target_uom_id === fromUoMId
    );

    if (inverseRelationship) {
      return 1 / inverseRelationship.conversion_factor;
    }

    // No relationship found
    return null;
  }

  save() {
    if (this.form.invalid || this.saving()) return;

    this.saving.set(true);
    const formValue = this.form.value;

    // Validate base_uom_id if product has assigned UoMs
    if (this.assignedUoMs().length > 0 && !formValue.base_uom_id) {
      this.snackBar.openFromComponent(CustomSnackbarComponent, {
        data: { message: 'La UoM base es requerida cuando el producto tiene UoMs asignadas', type: 'error' },
        duration: 5000
      });
      this.saving.set(false);
      return;
    }

    // Validate base_uom_id is in assigned UoMs list
    if (formValue.base_uom_id && !this.assignedUoMs().some(uom => uom.id === formValue.base_uom_id)) {
      this.snackBar.openFromComponent(CustomSnackbarComponent, {
        data: { message: 'La UoM base seleccionada no está en la lista de UoMs asignadas', type: 'error' },
        duration: 5000
      });
      this.saving.set(false);
      return;
    }

    if (this.isNew) {
      this.productService.createProduct(formValue).subscribe({
        next: (product) => {
          this.snackBar.openFromComponent(CustomSnackbarComponent, {
            data: { message: 'Producto guardado exitosamente', type: 'success' },
            duration: 3000
          });
          this.saving.set(false);
          this.dialogRef.close(product);
        },
        error: (error) => {
          this.handleSaveError(error);
          this.saving.set(false);
        }
      });
    } else {
      this.productService.updateProduct(this.data.product!.id, formValue).subscribe({
        next: (product) => {
          this.snackBar.openFromComponent(CustomSnackbarComponent, {
            data: { message: 'Producto guardado exitosamente', type: 'success' },
            duration: 3000
          });
          this.saving.set(false);
          this.dialogRef.close(product);
        },
        error: (error) => {
          this.handleSaveError(error);
          this.saving.set(false);
        }
      });
    }
  }

  private handleSaveError(error: any): void {
    // Handle 409 Conflict - Base UoM validation error
    if (error.status === 409) {
      const errorMessage = this.getConflictErrorMessage(error);
      this.snackBar.openFromComponent(CustomSnackbarComponent, {
        data: { message: errorMessage, type: 'error' },
        duration: 5000
      });
      // Mark base_uom_id field as touched to show validation error
      this.form.get('base_uom_id')?.markAsTouched();
      return;
    }

    // Handle network errors (no response)
    if (!error.status || error.status === 0) {
      this.snackBar.openFromComponent(CustomSnackbarComponent, {
        data: { message: 'Error de conexión. Por favor, verifica tu conexión a internet e intenta de nuevo.', type: 'error' },
        duration: 5000
      });
      return;
    }

    // Handle other HTTP errors
    if (error.status >= 500) {
      this.snackBar.openFromComponent(CustomSnackbarComponent, {
        data: { message: 'Error del servidor. Por favor, intenta de nuevo más tarde.', type: 'error' },
        duration: 5000
      });
      return;
    }

    // Handle generic errors
    const errorMessage = error.error?.message || 'Error al guardar el producto. Por favor, intenta de nuevo.';
    this.snackBar.openFromComponent(CustomSnackbarComponent, {
      data: { message: errorMessage, type: 'error' },
      duration: 5000
    });
  }

  private getConflictErrorMessage(error: any): string {
    const errorMessage = error.error?.message || '';
    
    // Check for Base UoM specific conflict messages
    if (errorMessage.toLowerCase().includes('base_uom') || 
        errorMessage.toLowerCase().includes('base uom') ||
        errorMessage.toLowerCase().includes('uom base')) {
      
      // If it's a validation error about Base UoM not being in assigned UoMs
      if (errorMessage.toLowerCase().includes('assigned') || 
          errorMessage.toLowerCase().includes('asignada')) {
        return 'La UoM base seleccionada no está en la lista de UoMs asignadas. Por favor, selecciona una UoM válida.';
      }
      
      // If it's about inventory movements
      if (errorMessage.toLowerCase().includes('inventory') || 
          errorMessage.toLowerCase().includes('movimiento')) {
        return 'No se puede cambiar la UoM base si el producto tiene movimientos de inventario.';
      }
      
      // Generic Base UoM conflict
      return 'Conflicto en la UoM base: ' + errorMessage;
    }
    
    // Return the original error message if it's not Base UoM related
    return errorMessage || 'Error al guardar el producto. Por favor, intenta de nuevo.';
  }

  close() {
    this.dialogRef.close();
  }

  private loadUOMs(product: any): void {
    if (product.uoms && product.uoms.length > 0) {
      this.uoms.set(product.uoms);
    }
    this.loadCatalogUoMs();
  }

  private loadAssignedUoMs(productId: string): void {
    this.loadingAssignedUoMs.set(true);
    this.productService.getAssignedUoMs(productId).subscribe({
      next: (data) => {
        this.assignedUoMs.set(data);
        this.loadingAssignedUoMs.set(false);
        // Validate Base UoM consistency after loading assigned UoMs
        this.validateBaseUoMConsistency();
      },
      error: () => {
        this.loadingAssignedUoMs.set(false);
        this.snackBar.openFromComponent(CustomSnackbarComponent, {
          data: { message: 'Error al cargar UoMs asignadas', type: 'error' },
          duration: 3000
        });
      }
    });
  }

  private checkInventoryMovements(productId: string): void {
    this.loadingInventoryMovements.set(true);
    this.productService.checkInventoryMovements(productId).subscribe({
      next: (response) => {
        this.hasInventoryMovements.set(response.has_movements);
        this.loadingInventoryMovements.set(false);
        
        // Disable Base UoM field if movements exist
        const baseUoMControl = this.form.get('base_uom_id');
        if (baseUoMControl && response.has_movements) {
          baseUoMControl.disable({ emitEvent: false });
        }
      },
      error: () => {
        this.loadingInventoryMovements.set(false);
      }
    });
  }

  private validateBaseUoMConsistency(): void {
    const currentBaseUoMId = this.form.get('base_uom_id')?.value;
    const assignedUoMs = this.assignedUoMs();

    // If no Base UoM is selected, nothing to validate
    if (!currentBaseUoMId) {
      return;
    }

    // Check if the current Base UoM is still in the assigned UoMs list
    const isBaseUoMValid = assignedUoMs.some(uom => uom.id === currentBaseUoMId);

    if (!isBaseUoMValid) {
      // Base UoM is no longer valid - clear it and alert user
      this.form.get('base_uom_id')?.setValue(null, { emitEvent: false });
      this.snackBar.openFromComponent(CustomSnackbarComponent, {
        data: { 
          message: 'La UoM base seleccionada ya no está disponible. Por favor, selecciona una nueva UoM base.', 
          type: 'warning' 
        },
        duration: 5000
      });
    }
  }

  private loadCatalogUoMs(): void {
    this.loadingCatalog.set(true);
    this.productService.getUOMCatalog().subscribe({
      next: (data) => {
        this.catalogUoms.set(data);
        this.loadingCatalog.set(false);
      },
      error: () => {
        this.loadingCatalog.set(false);
        this.snackBar.openFromComponent(CustomSnackbarComponent, {
          data: { message: 'Error al cargar catálogo de UoMs', type: 'error' },
          duration: 3000
        });
      }
    });
    this.loadRelationships();
  }

  private loadRelationships(): void {
    if (!this.data.product) return;
    this.loadingRelationships.set(true);
    this.productService.getUOMRelationships(this.data.product.id).subscribe({
      next: (data) => {
        this.relationships.set(data);
        this.loadingRelationships.set(false);
      },
      error: () => {
        this.loadingRelationships.set(false);
      }
    });
  }

  assignSingleUoM(): void {
    if (!this.data.product || !this.selectedCatalogUomId()) return;

    const catalogUom = this.catalogUoms().find(u => u.id === this.selectedCatalogUomId());
    if (!catalogUom) return;

    this.saving.set(true);
    this.productService.createUOM(this.data.product.id, {
      uom_catalog_id: this.selectedCatalogUomId(),
      name: catalogUom.name
    }).subscribe({
      next: (newUom) => {
        this.uoms.set([...this.uoms(), newUom]);
        this.selectedCatalogUomId.set(null);
        this.saving.set(false);
        // Reload assigned UoMs to update the list and validate consistency
        this.loadAssignedUoMs(this.data.product.id);
        this.snackBar.openFromComponent(CustomSnackbarComponent, {
          data: { message: 'Unidad asignada correctamente', type: 'success' },
          duration: 3000
        });
      },
      error: () => {
        this.saving.set(false);
        this.snackBar.openFromComponent(CustomSnackbarComponent, {
          data: { message: 'Error al asignar unidad', type: 'error' },
          duration: 3000
        });
      }
    });
  }

  createRelationship(): void {
    if (!this.newRelationshipForm.valid || !this.data.product) return;

    const { source_uom_id, target_uom_id, conversion_factor } = this.newRelationshipForm.value;

    if (source_uom_id === target_uom_id) {
      this.snackBar.openFromComponent(CustomSnackbarComponent, {
        data: { message: 'No puedes crear una relación con la misma unidad', type: 'error' },
        duration: 3000
      });
      return;
    }

    this.creatingRelationship.set(true);
    this.productService.createUOMRelationship(this.data.product.id, {
      source_uom_id,
      target_uom_id,
      conversion_factor
    }).subscribe({
      next: () => {
        this.newRelationshipForm.reset();
        this.loadRelationships();
        this.creatingRelationship.set(false);
        this.snackBar.openFromComponent(CustomSnackbarComponent, {
          data: { message: 'Relación creada correctamente', type: 'success' },
          duration: 3000
        });
      },
      error: () => {
        this.creatingRelationship.set(false);
        this.snackBar.openFromComponent(CustomSnackbarComponent, {
          data: { message: 'Error al crear relación', type: 'error' },
          duration: 3000
        });
      }
    });
  }

  deleteRelationship(relationshipId: string): void {
    if (!this.data.product) return;
    if (!confirm('¿Eliminar esta relación de conversión?')) return;

    this.productService.deleteUOMRelationship(this.data.product.id, relationshipId).subscribe({
      next: () => {
        this.loadRelationships();
        this.snackBar.openFromComponent(CustomSnackbarComponent, {
          data: { message: 'Relación eliminada correctamente', type: 'success' },
          duration: 3000
        });
      },
      error: () => {
        this.snackBar.openFromComponent(CustomSnackbarComponent, {
          data: { message: 'Error al eliminar relación', type: 'error' },
          duration: 3000
        });
      }
    });
  }

  editUOM(uom: any): void {
    this.editingUomId.set(uom.id);
    this.editingUomForm = this.fb.group({
      name: [uom.name, Validators.required],
      code: [uom.code, Validators.required]
    });
  }

  saveUOMEdit(uom: any): void {
    if (!this.editingUomForm.valid) return;

    this.productService.updateUOM(this.data.product.id, uom.id, this.editingUomForm.value).subscribe({
      next: (updated) => {
        const index = this.uoms().findIndex(u => u.id === uom.id);
        if (index !== -1) {
          const updated_uoms = [...this.uoms()];
          updated_uoms[index] = updated;
          this.uoms.set(updated_uoms);
        }
        this.editingUomId.set(null);
        this.snackBar.openFromComponent(CustomSnackbarComponent, {
          data: { message: 'UOM actualizado correctamente', type: 'success' },
          duration: 3000
        });
      },
      error: (error) => {
        this.snackBar.openFromComponent(CustomSnackbarComponent, {
          data: { message: error.error?.message || 'Error al actualizar UOM', type: 'error' },
          duration: 5000
        });
      }
    });
  }

  cancelUOMEdit(): void {
    this.editingUomId.set(null);
  }

  deleteUOM(uom: any): void {
    if (!confirm(`¿Eliminar la unidad de medida "${uom.name}"?`)) return;

    this.productService.deleteUOM(this.data.product.id, uom.id).subscribe({
      next: () => {
        this.uoms.set(this.uoms().filter(u => u.id !== uom.id));
        
        // Check if the deleted UoM was the Base UoM
        const currentBaseUoMId = this.form.get('base_uom_id')?.value;
        if (currentBaseUoMId === uom.id) {
          // Base UoM was deleted - alert user and require new selection
          this.form.get('base_uom_id')?.setValue(null, { emitEvent: false });
          this.snackBar.openFromComponent(CustomSnackbarComponent, {
            data: { 
              message: `La UoM base "${uom.name}" ha sido eliminada. Por favor, selecciona una nueva UoM base.`, 
              type: 'warning' 
            },
            duration: 5000
          });
        } else {
          // Reload assigned UoMs to update the list
          this.loadAssignedUoMs(this.data.product.id);
        }
        
        this.snackBar.openFromComponent(CustomSnackbarComponent, {
          data: { message: 'UOM eliminado correctamente', type: 'success' },
          duration: 3000
        });
      },
      error: (error) => {
        this.snackBar.openFromComponent(CustomSnackbarComponent, {
          data: { message: error.error?.message || 'Error al eliminar UOM', type: 'error' },
          duration: 5000
        });
      }
    });
  }

  getErrorMessage(fieldName: string): string {
    const control = this.form.get(fieldName);
    if (!control || !control.errors || !control.touched) {
      return '';
    }

    if (control.errors['required']) {
      if (fieldName === 'base_uom_id') {
        return 'La UoM base es requerida cuando el producto tiene UoMs asignadas';
      }
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} es requerido`;
    }
    if (control.errors['minlength']) {
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} debe tener al menos ${control.errors['minlength'].requiredLength} caracteres`;
    }
    if (control.errors['skuExists']) {
      return 'Este SKU ya existe';
    }
    if (control.errors['baseUoMNotInAssigned']) {
      return 'La UoM base seleccionada no está en la lista de UoMs asignadas';
    }
    return '';
  }

  onBaseUoMKeydown(event: KeyboardEvent): void {
    // Handle Escape key to clear selection
    if (event.key === 'Escape') {
      event.preventDefault();
      this.form.get('base_uom_id')?.reset();
    }
    // Tab key is handled natively by the browser
    // Enter key is handled natively by the select element
  }
}