import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { POSService } from '../../services/pos.service';
import { ProductService } from '../../../purchase-orders/services/product.service';
import { WarehouseService } from '../../../purchase-orders/services/warehouse.service';
import { Product } from '../../../purchase-orders/models/product.model';
import { Warehouse } from '../../../purchase-orders/models/warehouse.model';
import { POSCartItem } from '../../models/pos.model';

@Component({
  selector: 'app-take-order',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './take-order.component.html',
  styleUrls: ['./take-order.component.scss']
})
export class TakeOrderComponent implements OnInit {
  products = signal<Product[]>([]);
  warehouses = signal<Warehouse[]>([]);
  filteredProducts = signal<Product[]>([]);
  
  selectedWarehouse = signal<string>('');
  searchTerm = signal<string>('');
  loading = signal<boolean>(false);
  saving = signal<boolean>(false);
  
  // New signals for photos and prices
  loadingPhotos = signal<boolean>(false);
  loadingPrices = signal<boolean>(false);
  priceListError = signal<boolean>(false);
  activePriceListId = signal<string | null>(null);
  
  // Photo loading state per product
  photoLoadingStates = signal<Map<string, boolean>>(new Map());
  photoErrorStates = signal<Map<string, boolean>>(new Map());

  constructor(
    public posService: POSService,
    private productService: ProductService,
    private warehouseService: WarehouseService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.priceListError.set(false);

    this.productService.getProducts().subscribe({
      next: (products) => {
        const productArray = Array.isArray(products) ? products : (products as any).data || [];
        this.products.set(productArray);
        this.filteredProducts.set(productArray);
        this.loading.set(false);
        
        // Check if any products lack prices
        const productsWithoutPrice = productArray.filter((p: Product) => !p.has_price);
        if (productsWithoutPrice.length > 0) {
          console.warn(
            `${productsWithoutPrice.length} products without prices`,
            productsWithoutPrice.map((p: Product) => p.sku)
          );
        }
        
        // Check if ALL products lack prices (indicates no price list)
        if (productArray.length > 0 && productsWithoutPrice.length === productArray.length) {
          this.priceListError.set(true);
          this.snackBar.open(
            'Error al cargar precios. Modo solo lectura.',
            'Cerrar',
            { duration: 5000 }
          );
        }
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.loading.set(false);
        this.snackBar.open('Error al cargar productos', 'Cerrar', { duration: 5000 });
      }
    });

    this.warehouseService.getWarehouses().subscribe({
      next: (warehouses) => {
        const warehouseArray = Array.isArray(warehouses) ? warehouses : (warehouses as any).data || [];
        this.warehouses.set(warehouseArray);
        if (warehouseArray.length > 0) {
          this.selectedWarehouse.set(warehouseArray[0].id);
        }
      },
      error: (error) => {
        console.error('Error loading warehouses:', error);
        this.snackBar.open('Error al cargar almacenes', 'Cerrar', { duration: 5000 });
      }
    });
  }

  onSearchChange(): void {
    const term = this.searchTerm().toLowerCase();
    if (!term) {
      this.filteredProducts.set(this.products());
      return;
    }

    const filtered = this.products().filter(p => 
      p.name.toLowerCase().includes(term) || 
      p.sku.toLowerCase().includes(term)
    );
    this.filteredProducts.set(filtered);
  }

  addProductToCart(product: Product): void {
    // Validate product has price
    if (!product.has_price) {
      this.snackBar.open('Este producto no tiene precio configurado', 'Cerrar', { duration: 3000 });
      return;
    }
    
    if (!product.uoms || product.uoms.length === 0) {
      this.snackBar.open('Producto sin unidades de medida', 'Cerrar', { duration: 3000 });
      return;
    }

    const baseUom = product.uoms.find(u => u.id === product.base_uom_id) || product.uoms[0];

    const cartItem: POSCartItem = {
      product_id: product.id,
      product_name: product.name,
      product_sku: product.sku,
      uom_id: baseUom.id,
      uom_name: baseUom.name,
      quantity: 1,
      unit_price: product.cost || 0,
      iva_percentage: 16,
      ieps_percentage: 0,
      subtotal: 0,
      iva_amount: 0,
      ieps_amount: 0,
      line_total: 0
    };

    // Recalculate will be done by service
    const subtotal = cartItem.quantity * cartItem.unit_price;
    const iva_amount = subtotal * (cartItem.iva_percentage / 100);
    const ieps_amount = subtotal * (cartItem.ieps_percentage / 100);
    cartItem.subtotal = subtotal;
    cartItem.iva_amount = iva_amount;
    cartItem.ieps_amount = ieps_amount;
    cartItem.line_total = subtotal + iva_amount + ieps_amount;

    this.posService.addItem(cartItem);
    this.snackBar.open(`${product.name} agregado`, 'Cerrar', { duration: 2000 });
  }

  updateQuantity(index: number, quantity: number): void {
    if (quantity <= 0) {
      this.posService.removeItem(index);
    } else {
      this.posService.updateItemQuantity(index, quantity);
    }
  }

  removeItem(index: number): void {
    this.posService.removeItem(index);
  }

  saveOrder(): void {
    if (!this.selectedWarehouse()) {
      this.snackBar.open('Selecciona un almacén', 'Cerrar', { duration: 3000 });
      return;
    }

    const cart = this.posService.cart();
    if (cart.items.length === 0) {
      this.snackBar.open('Agrega productos a la orden', 'Cerrar', { duration: 3000 });
      return;
    }

    this.saving.set(true);

    const orderData = {
      warehouse_id: this.selectedWarehouse(),
      line_items: cart.items.map(item => ({
        product_id: item.product_id,
        uom_id: item.uom_id,
        quantity: item.quantity,
        discount_percentage: 0
      }))
    };

    this.posService.createOrder(orderData).subscribe({
      next: (order) => {
        this.snackBar.open('Orden creada exitosamente', 'Cerrar', { duration: 3000 });
        this.posService.clearCart();
        this.router.navigate(['/pos']);
      },
      error: (error) => {
        this.snackBar.open(error.message || 'Error al crear orden', 'Cerrar', { duration: 5000 });
        this.saving.set(false);
      }
    });
  }

  cancel(): void {
    if (confirm('¿Descartar orden actual?')) {
      this.posService.clearCart();
      this.router.navigate(['/pos']);
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  }
  
  /**
   * Get photo URL for a product
   * Returns placeholder if no photo or error
   */
  getProductPhotoUrl(product: Product): string {
    if (product.primary_photo_url) {
      return product.primary_photo_url;
    }
    return '/images/product-placeholder.svg';
  }
  
  /**
   * Check if product photo is loading
   */
  isPhotoLoading(productId: string): boolean {
    return this.photoLoadingStates().get(productId) || false;
  }
  
  /**
   * Check if product photo has error
   */
  hasPhotoError(productId: string): boolean {
    return this.photoErrorStates().get(productId) || false;
  }
  
  /**
   * Handle photo load error
   */
  onPhotoError(productId: string): void {
    const errorStates = new Map(this.photoErrorStates());
    errorStates.set(productId, true);
    this.photoErrorStates.set(errorStates);
  }
  
  /**
   * Handle photo load success
   */
  onPhotoLoad(productId: string): void {
    const loadingStates = new Map(this.photoLoadingStates());
    loadingStates.set(productId, false);
    this.photoLoadingStates.set(loadingStates);
  }
  
  /**
   * Check if product can be added to cart
   */
  canAddToCart(product: Product): boolean {
    // Disable all products if price list error
    if (this.priceListError()) {
      return false;
    }
    return product.has_price === true;
  }
  
  /**
   * Get tooltip for disabled product
   */
  getDisabledTooltip(product: Product): string {
    if (!product.has_price) {
      return 'Producto sin precio configurado';
    }
    return '';
  }
}
