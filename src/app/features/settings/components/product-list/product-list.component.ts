import { Component, signal, TemplateRef, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProductService } from '../../services/product.service';
import { Product } from '../../models/product.model';
import { DatatableWrapperComponent } from '../../../../core/components/datatable-wrapper/datatable-wrapper.component';
import { IDatatableConfig, ISortEvent } from '../../../../core/components/datatable-wrapper/datatable-wrapper.interface';
import { SearchComponent } from '../../../../core/components/search/search.component';
import { ButtonComponent } from '../../../../core/components/button/button.component';
import { ProductDetailModalComponent } from '../product-detail-modal/product-detail-modal.component';
import { CategoriesDialogComponent } from '../categories-dialog/categories-dialog.component';
import { UomsDialogComponent } from '../uoms-dialog/uoms-dialog.component';
import { AlertDialogComponent } from '../../../../core/components/alert-dialog/alert-dialog.component';
import { CustomSnackbarComponent } from '../../../../core/components/custom-snackbar/custom-snackbar.component';
import { ArrowRight } from 'lucide-angular';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CommonModule,
    DatatableWrapperComponent,
    SearchComponent,
    ButtonComponent
  ],
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.scss'
})
export class ProductListComponent implements OnDestroy {
  @ViewChild('tableTemplate') tableTemplate: TemplateRef<any>;
  table_config = signal<IDatatableConfig>({
    rows: [],
    columns: [
      { name: 'SKU', prop: 'sku', sortable: true, canAutoResize: true, width: 110 },
      { name: 'Nombre', prop: 'name', sortable: true, canAutoResize: true, width: 180 },
      { name: 'Categoría', prop: 'category', sortable: false, canAutoResize: true, width: 130 },
      { name: 'Subcategoría', prop: 'subcategory', sortable: false, canAutoResize: true, width: 130 },
      { name: 'Base UoM', prop: 'base_uom_id', sortable: true, canAutoResize: true, width: 100 },
      { name: 'Detalle', prop: 'detail', sortable: false, canAutoResize: true, width: 100 },
    ],
    externalPaging: false,
    externalSorting: false,
    page: 1,
    limit: 20,
    totalResults: 0,
    loading: false,
    emptyState: { title: 'Sin resultados', subtitle: 'No se encontraron productos' },
    columnMode: 'force',
    reorderable: false,
  });

  products = signal<Product[]>([]);
  ArrowRight = ArrowRight;
  search = '';
  currentSort: ISortEvent | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private productService: ProductService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.loadProducts();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadProducts() {
    this.table_config.update(c => ({ ...c, loading: true }));

    const params: any = {};
    if (this.search && this.search.trim()) {
      params.search = this.search;
    }

    this.productService.getProducts(params).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (res) => {
        this.table_config.update(c => ({
          ...c,
          rows: res.data,
          totalResults: res.total,
          loading: false,
        }));
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.table_config.update(c => ({ ...c, loading: false }));
        this.snackBar.openFromComponent(CustomSnackbarComponent, {
          data: { message: 'Error al cargar productos', type: 'error' },
          duration: 5000
        });
      }
    });
  }

  onSearchChange(searchTerm: string) {
    this.search = searchTerm;
    this.loadProducts();
  }

  onSortChange(event: ISortEvent) {
    this.currentSort = event;
    this.sortProducts();
  }

  private sortProducts() {
    if (!this.currentSort || !this.currentSort.direction) {
      // No sorting, reload original data
      this.loadProducts();
      return;
    }

    const sortedRows = [...this.table_config().rows];
    const { prop } = this.currentSort.column;
    const { direction } = this.currentSort;

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

    this.table_config.update(c => ({
      ...c,
      rows: sortedRows
    }));
  }

  getBaseUoMDisplay(product: Product): string {
    if (product.base_uom && product.base_uom.abbreviation) {
      return product.base_uom.abbreviation;
    }
    if (product.base_uom && product.base_uom.name) {
      return product.base_uom.name;
    }
    return product.base_uom_id ? product.base_uom_id : '—';
  }

  openCreateProductModal() {
    const dialogRef = this.dialog.open(ProductDetailModalComponent, {
      width: '600px',
      height: '650px',
      disableClose: false,
      data: { product: null }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadProducts();
      }
    });
  }

  viewDetail(product: Product) {
    const dialogRef = this.dialog.open(ProductDetailModalComponent, {
      width: '600px',
      height: '650px',
      disableClose: false,
      data: { product }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadProducts();
      }
    });
  }

  deleteProduct(product: Product, event: Event) {
    event.stopPropagation();

    const dialogRef = this.dialog.open(AlertDialogComponent, {
      width: '400px',
      data: {
        title: 'Eliminar Producto',
        message: `¿Estás seguro de que deseas eliminar el producto "${product.name}"? Esta acción no se puede deshacer.`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        type: 'danger'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.productService.deleteProduct(product.id).subscribe({
          next: () => {
            this.snackBar.openFromComponent(CustomSnackbarComponent, {
              data: { message: 'Producto eliminado correctamente', type: 'success' },
              duration: 3000
            });
            this.loadProducts();
          },
          error: (error) => {
            this.snackBar.openFromComponent(CustomSnackbarComponent, {
              data: { message: error.error?.message || 'Error al eliminar producto', type: 'error' },
              duration: 5000
            });
          }
        });
      }
    });
  }

  openCategoriesDialog() {
    this.dialog.open(CategoriesDialogComponent, {
      width: '500px',
      height: '600px',
      disableClose: false
    });
  }

  openUOMsDialog() {
    this.dialog.open(UomsDialogComponent, {
      width: '400px',
      disableClose: false
    });
  }

  duplicateProduct(product: Product) {
    this.productService.duplicateProduct(product.id).subscribe({
      next: (duplicatedProduct) => {
        this.snackBar.openFromComponent(CustomSnackbarComponent, {
          data: { message: 'Producto duplicado correctamente', type: 'success' },
          duration: 3000
        });
        this.loadProducts();
      },
      error: (error) => {
        const errorMessage = error.error?.message || 'Error al duplicar producto';
        this.snackBar.openFromComponent(CustomSnackbarComponent, {
          data: { message: errorMessage, type: 'error' },
          duration: 5000
        });
      }
    });
  }
}
