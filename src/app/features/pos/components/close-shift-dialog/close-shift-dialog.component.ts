import { Component, Inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { POSService } from '../../services/pos.service';

export interface CloseShiftDialogData {
  shift: any;
}

@Component({
  selector: 'app-close-shift-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './close-shift-dialog.component.html',
  styleUrls: ['./close-shift-dialog.component.scss']
})
export class CloseShiftDialogComponent implements OnInit {
  closingBalance = signal<number>(0);
  notes = signal<string>('');
  shiftReport = signal<any | null>(null);
  loadingReport = signal<boolean>(false);
  Math = Math; // Expose Math to template
  parseFloat = parseFloat; // Expose parseFloat to template
  
  constructor(
    private dialogRef: MatDialogRef<CloseShiftDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CloseShiftDialogData,
    private posService: POSService
  ) {
    // Debug: Log the shift data to verify what we're receiving
    console.log('Close Shift Dialog - Shift data:', data.shift);
    console.log('Close Shift Dialog - initial_cash:', data.shift?.initial_cash);
    console.log('Close Shift Dialog - initial_cash type:', typeof data.shift?.initial_cash);
    
    // Set initial closing balance to initial_cash as a starting point
    if (data.shift?.initial_cash) {
      const parsedValue = parseFloat(data.shift.initial_cash);
      console.log('Close Shift Dialog - Parsed initial_cash:', parsedValue);
      this.closingBalance.set(parsedValue);
    }
  }
  
  ngOnInit(): void {
    // Load shift report
    this.loadShiftReport();
  }
  
  loadShiftReport(): void {
    if (!this.data.shift?.id) {
      return;
    }
    
    this.loadingReport.set(true);
    this.posService.getCashShiftReport(this.data.shift.id).subscribe({
      next: (report) => {
        console.log('Shift report loaded:', report);
        this.shiftReport.set(report);
        
        // Update expected cash from report if available
        if (report.cash_summary?.expected_cash) {
          this.closingBalance.set(report.cash_summary.expected_cash);
        }
        
        this.loadingReport.set(false);
      },
      error: (error) => {
        console.error('Error loading shift report:', error);
        this.loadingReport.set(false);
      }
    });
  }

  get shift() {
    return this.data.shift;
  }

  get expectedCash(): number {
    // Use expected_cash from report if available
    const report = this.shiftReport();
    if (report?.cash_summary?.expected_cash) {
      return parseFloat(report.cash_summary.expected_cash);
    }
    
    // Fallback to shift data
    if (this.shift?.expected_cash) {
      return parseFloat(this.shift.expected_cash);
    }
    return this.shift?.initial_cash ? parseFloat(this.shift.initial_cash) : 0;
  }

  get difference(): number {
    return this.closingBalance() - this.expectedCash;
  }

  get differenceType(): 'surplus' | 'shortage' | 'exact' {
    const diff = this.difference;
    if (diff > 0) return 'surplus';
    if (diff < 0) return 'shortage';
    return 'exact';
  }

  onConfirm(): void {
    if (this.closingBalance() < 0) {
      return;
    }

    this.dialogRef.close({
      closing_balance: this.closingBalance(),
      notes: this.notes()
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
