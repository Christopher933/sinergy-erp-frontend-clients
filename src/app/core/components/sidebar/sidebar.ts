import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  LucideAngularModule,
  Home,
  Users,
  CreditCard,
  Bell,
  Settings,
  LogOut,
  FileText,
  MapPin,
  FileCheck,
  DollarSign,
  Megaphone,
  LandPlot,
  ShoppingCart,
} from 'lucide-angular';
import { AuthService } from '../../services/auth.service';
import { IsAdminDirective } from '../../directives/is-admin.directive';

interface MenuItem {
  label: string;
  icon?: any;
  route: string;
  id?: string;
}

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterModule, LucideAngularModule, IsAdminDirective],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {

  menu: MenuItem[] = [
    {
      label: 'Leads',
      route: '/leads',
      icon: Users,
      id: 'menu-leads'
    },
    {
      label: 'Clientes',
      route: '/customers',
      icon: CreditCard,
      id: 'menu-customers'
    },
    {
      label: 'Lotes',
      route: '/properties',
      icon: LandPlot,
      id: 'menu-properties'
    },
    {
      label: 'Contratos',
      route: '/contracts',
      icon: FileCheck,
      id: 'menu-contracts'
    },
    {
      label: 'Órdenes de Compra',
      route: '/purchase-orders',
      icon: ShoppingCart,
      id: 'menu-purchase-orders'
    },
    {
      label: 'Marketing',
      route: '/marketing',
      icon: Megaphone,
      id: 'menu-marketing'
    }
  ];

  private menuIdCounter = 0;

  icons = { Home, Users, CreditCard, Bell, Settings, LogOut, FileText, MapPin, FileCheck, DollarSign, Megaphone, LandPlot, ShoppingCart };

  constructor(public auth_service:AuthService){

  }

  getUserName(): string {
    if (!this.auth_service.user_info) {
      return 'Usuario';
    }
    
    const email = this.auth_service.user_info.email;
    if (!email) {
      return 'Usuario';
    }
    
    // Extract name from email (part before @)
    const namePart = email.split('@')[0];
    // Convert to title case (capitalize first letter of each word)
    return namePart
      .split('.')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  getInitials(email?: string): string {
    if (!email) {
      return 'U';
    }
    
    const namePart = email.split('@')[0];
    const words = namePart.split('.');
    
    if (words.length >= 2) {
      return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
    }
    
    return namePart.substring(0, 2).toUpperCase();
  }

}
