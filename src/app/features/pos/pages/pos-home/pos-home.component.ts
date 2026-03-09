import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-pos-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pos-home.component.html',
  styleUrls: ['./pos-home.component.scss']
})
export class POSHomeComponent {
  constructor(private router: Router) {}

  navigateToTakeOrder(): void {
    this.router.navigate(['/pos/take-order']);
  }

  navigateToPayment(): void {
    this.router.navigate(['/pos/payment']);
  }
  
  navigateToPendingOrders(): void {
    this.router.navigate(['/pos/pending-orders']);
  }
}
