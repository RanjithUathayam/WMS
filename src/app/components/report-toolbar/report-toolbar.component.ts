import { Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, Output } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

export type ExportFormat = 'csv' | 'excel' | 'pdf';

@Component({
  selector: 'app-report-toolbar',
  templateUrl: './report-toolbar.component.html',
  styleUrls: ['./report-toolbar.component.css']
})
export class ReportToolbarComponent implements OnDestroy {
  @Input() searchPlaceholder = 'Search...';
  @Input() searchValue = '';
  @Input() activeFilterCount = 0;

  @Output() searchChange = new EventEmitter<string>();
  @Output() filterClick = new EventEmitter<void>();
  @Output() exportClick = new EventEmitter<ExportFormat>();
  @Output() clearAll = new EventEmitter<void>();

  exportMenuOpen = false;

  private searchInput$ = new Subject<string>();

  constructor(private elementRef: ElementRef) {
    this.searchInput$.pipe(debounceTime(300), distinctUntilChanged()).subscribe((value) => {
      this.searchChange.emit(value);
    });
  }

  get hasActive(): boolean {
    return this.activeFilterCount > 0 || !!this.searchValue;
  }

  onSearchInput(value: string): void {
    this.searchValue = value;
    this.searchInput$.next(value);
  }

  toggleExportMenu(): void {
    this.exportMenuOpen = !this.exportMenuOpen;
  }

  onExport(format: ExportFormat): void {
    this.exportMenuOpen = false;
    this.exportClick.emit(format);
  }

  onClearAll(): void {
    this.searchValue = '';
    this.clearAll.emit();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.exportMenuOpen && !this.elementRef.nativeElement.contains(event.target)) {
      this.exportMenuOpen = false;
    }
  }

  ngOnDestroy(): void {
    this.searchInput$.complete();
  }
}
