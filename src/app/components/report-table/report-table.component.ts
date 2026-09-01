import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface ReportColumn {
  header: string;
  data: string;
  sortable?: boolean;
}

@Component({
  selector: 'app-report-table',
  templateUrl: './report-table.component.html',
  styleUrls: ['./report-table.component.css']
})
export class ReportTableComponent {
  @Input() columns: ReportColumn[] = [];
  @Input() rows: any[] = [];
  @Input() loading: boolean = false;
  @Input() page: number = 1;
  @Input() pageSize: number = 25;
  @Input() totalRecords: number = 0;
  @Input() totalPages: number = 0;
  @Input() sortBy: string = '';
  @Input() sortDir: string = 'ASC';

  @Output() pageChange = new EventEmitter<number>();
  @Output() sortChange = new EventEmitter<{ sortBy: string, sortDir: string }>();

  getValue(row: any, path: string): any {
    if (!path || row == null) return null;
    const value = path.split('.').reduce((acc: any, key: string) => (acc == null ? acc : acc[key]), row);
    return value === undefined ? null : value;
  }

  sortIcon(column: ReportColumn): string {
    if (!column.sortable) return '';
    if (this.sortBy !== column.data) return 'fa-sort';
    return this.sortDir === 'ASC' ? 'fa-sort-asc' : 'fa-sort-desc';
  }

  onSort(column: ReportColumn): void {
    if (!column.sortable) return;
    const nextDir = (this.sortBy === column.data && this.sortDir === 'ASC') ? 'DESC' : 'ASC';
    this.sortChange.emit({ sortBy: column.data, sortDir: nextDir });
  }

  goToPage(p: number): void {
    if (p < 1 || (this.totalPages > 0 && p > this.totalPages) || p === this.page) return;
    this.pageChange.emit(p);
  }
}
