import { Routes } from '@angular/router';
import { MainLayout } from './layout/main-layout/main-layout';
import { AuthGuard } from './core/guards/auth.guard';
import { LoggedGuard } from './core/guards/logged.guard';
import { AdminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  // LOGIN (público)
  {
    path: 'login',
    canActivate: [LoggedGuard],
    loadComponent: () =>
      import('./features/auth/pages/login/login')
        .then(m => m.Login),
  },

  // POS - Tomar Orden y Cobrar Orden (pantalla completa, sin layout)
  {
    path: 'pos/take-order',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./features/pos/pages/take-order/take-order.component')
        .then(m => m.TakeOrderComponent),
    data: { 
      permission: 'pos:Create',
      title: 'Tomar Orden'
    }
  },
  {
    path: 'pos/pending-orders',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./features/pos/pages/pending-orders/pending-orders.component')
        .then(m => m.PendingOrdersComponent),
    data: { 
      permission: 'pos:Read',
      title: 'Órdenes Pendientes'
    }
  },
  {
    path: 'pos/payment',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./features/pos/pages/payment/payment.component')
        .then(m => m.PaymentComponent),
    data: { 
      permission: 'pos:Update',
      title: 'Cobrar Orden'
    }
  },

  // APP PROTEGIDA
  {
    path: '',
    component: MainLayout,
    canActivate: [AuthGuard],
    children: [
      {
        path: 'leads',
        loadChildren: () =>
          import('./features/leads/leads.routes')
            .then(m => m.LEADS_ROUTES),
      },
      {
        path: 'customers',
        loadChildren: () =>
          import('./features/customers/customers.routes')
            .then(m => m.CUSTOMERS_ROUTES),
      },
      {
        path: 'properties',
        loadChildren: () =>
          import('./features/properties/properties.routes')
            .then(m => m.PROPERTIES_ROUTES),
      },
      {
        path: 'contracts',
        loadChildren: () =>
          import('./features/contracts/contracts.routes')
            .then(m => m.CONTRACTS_ROUTES),
      },
      {
        path: 'settings',
        canActivate: [AdminGuard],
        loadChildren: () =>
          import('./features/rbac-tenant-ui/rbac-tenant-ui.routes')
            .then(m => m.RBAC_TENANT_UI_ROUTES),
      },
      {
        path: 'marketing',
        loadChildren: () =>
          import('./features/marketing/marketing.routes')
            .then(m => m.MARKETING_ROUTES),
      },
      {
        path: 'purchase-orders',
        loadChildren: () =>
          import('./features/purchase-orders/purchase-orders.routes')
            .then(m => m.PURCHASE_ORDERS_ROUTES),
      },
      {
        path: 'inventory',
        loadChildren: () =>
          import('./features/inventory/inventory.routes')
            .then(m => m.INVENTORY_ROUTES),
      },
      {
        path: 'sales-orders',
        loadChildren: () =>
          import('./features/sales-orders/sales-orders.routes')
            .then(m => m.SALES_ORDERS_ROUTES),
      },
      {
        path: 'pos',
        loadComponent: () =>
          import('./features/pos/pages/pos-home/pos-home.component')
            .then(m => m.POSHomeComponent),
        data: { 
          permission: 'pos:Read',
          title: 'Punto de Venta'
        }
      },
      {
        path: '',
        redirectTo: 'leads',
        pathMatch: 'full',
      },
    ],
  },

  { path: '**', redirectTo: 'login' },
];
