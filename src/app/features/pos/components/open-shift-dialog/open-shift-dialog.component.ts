import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { WarehouseService } from '../../../settings/services/warehouse.service';

@Component({
  selector: 'app-open-shift-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './open-shift-dialog.component.html',
  styleUrls: ['./open-shift-dialog.component.scss']
})
export class OpenShiftDialogComponent implements OnInit {
  warehouses = signal<any[]>([]);
  selectedWarehouseId = signal<string>('');
  openingBalance = signal<number>(1000);
  notes = signal<string>('');
  loading = signal<boolean>(false);

  constructor(
    private dialogRef: MatDialogRef<OpenShiftDialogComponent>,
    private warehouseService: WarehouseService
  ) {}

  ngOnInit(): void {
    this.loadWarehouses();
    
    // Try to get last used warehouse from localStorage
    const lastWarehouse = localStorage.getItem('pos_warehouse_id');
    if (lastWarehouse) {
      this.selectedWarehouseId.set(lastWarehouse);
    }
  }

  loadWarehouses(): void {
    this.loading.set(true);
    this.warehouseService.getWarehouses().subscribe({
      next: (response) => {
        console.log('Warehouse response:', response);
        // Response is WarehouseListResponse with data property
        const warehousesList = response.data || [];
        console.log('Warehouses list:', warehousesList);
        this.warehouses.set(warehousesList);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading warehouses:', error);
        this.loading.set(false);
      }
    });
  }

  onConfirm(): void {
    if (!this.selectedWarehouseId() || this.openingBalance() < 0) {
      return;
    }

    this.dialogRef.close({
      warehouse_id: this.selectedWarehouseId(),
      opening_balance: this.openingBalance(),
      notes: this.notes()
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
