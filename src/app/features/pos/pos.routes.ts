import { Routes } from '@angular/router';

export const POS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => 
      import('./pages/pos-home/pos-home.component')
        .then(m => m.POSHomeComponent),
    data: { 
      permission: 'pos:Read',
      title: 'Punto de Venta'
    }
  },
  {
    path: 'take-order',
    loadComponent: () => 
      import('./pages/take-order/take-order.component')
        .then(m => m.TakeOrderComponent),
    data: { 
      permission: 'pos:Create',
      title: 'Tomar Orden'
    }
  },
  {
    path: 'pending-orders',
    loadComponent: () => 
      import('./pages/pending-orders/pending-orders.component')
        .then(m => m.PendingOrdersComponent),
    data: { 
      permission: 'pos:Read',
      title: 'Órdenes Pendientes'
    }
  },
  {
    path: 'payment',
    loadComponent: () => 
      import('./pages/payment/payment.component')
        .then(m => m.PaymentComponent),
    data: { 
      permission: 'pos:Update',
      title: 'Cobrar Orden'
    }
  }
];
