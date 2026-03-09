import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { POSService } from '../../services/pos.service';

@Component({
  selector: 'app-pending-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pending-orders.component.html',
  styleUrls: ['./pending-orders.component.scss']
})
export class PendingOrdersComponent implements OnInit {
  orders = signal<any[]>([]);
  loading = signal<boolean>(false);

  constructor(
    private posService: POSService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading.set(true);
    this.posService.getOrders().subscribe({
      next: (response) => {
        const ordersArray = Array.isArray(response) ? response : response.data || [];
        console.log('Orders loaded:', ordersArray);
        console.log('First order items_count:', ordersArray[0]?.items_count);
        this.orders.set(ordersArray);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading orders:', error);
        this.loading.set(false);
      }
    });
  }

  viewOrder(orderId: string): void {
    // Navigate to order detail or payment
    this.router.navigate(['/pos/payment'], { queryParams: { orderId } });
  }

  goBack(): void {
    this.router.navigate(['/pos']);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  getStatusLabel(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pending': 'Pendiente',
      'completed': 'Completada',
      'cancelled': 'Cancelada',
      'in_progress': 'En Proceso'
    };
    return statusMap[status] || status;
  }
}
