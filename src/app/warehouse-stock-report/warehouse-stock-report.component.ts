import { Component, HostListener, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ApiService } from '../service/api.service';
import { SwalService } from '../service/swal.service';
import { AppComponent } from '../app.component';
import { ReportColumn } from '../components/report-table/report-table.component';
import { SearchSelectOption } from '../components/search-select/search-select.component';

/**
 * Warehouse Stock Report — on-hand stock grouped warehouse-wise, item-wise
 * (GET /reports/warehousestock). Clicking a row opens a drill-down listing the
 * location / pallet / box rows behind that warehouse + item (GET /reports/warehousestockdetails).
 */
@Component({
  selector: 'app-warehouse-stock-report',
  templateUrl: './warehouse-stock-report.component.html',
  styleUrls: ['./warehouse-stock-report.component.css']
})
export class WarehouseStockReportComponent implements OnInit {
  flagset: boolean = false;
  filterForm!: FormGroup;
  searchTerm: string = '';

  columns: ReportColumn[] = [
    { header: 'Warehouse', data: 'warehouseCode', sortable: true },
    { header: 'Item Code', data: 'itemCode', sortable: true, link: true },
    { header: 'Item Name', data: 'itemMaster.itemName', sortable: true },
    { header: 'Item Group', data: 'itemGroup' },
    { header: 'Category', data: 'itemMaster.category' },
    { header: 'Color', data: 'itemMaster.color' },
    { header: 'Size', data: 'itemMaster.size' },
    { header: 'Style', data: 'itemMaster.style' },
    { header: 'Total Stock Qty', data: 'quantity', sortable: true, sum: true },
    { header: 'Boxes', data: 'boxCount', sortable: true },
    { header: 'Pallets', data: 'palletCount', sortable: true },
    { header: 'Locations', data: 'locationCount', sortable: true },
    { header: 'Pre-Binned Qty (No Pallet)', data: 'preBinnedQty', sortable: true, sum: true },
    { header: 'Pallet Qty (No Location)', data: 'palletMappedQty', sortable: true, sum: true },
    { header: 'In Location Qty', data: 'inLocationQty', sortable: true, sum: true },
    { header: 'Allocated Qty', data: 'allocatedQty', sortable: true, sum: true },
    { header: 'Available Qty', data: 'availableQty', sortable: true, sum: true }
  ];

  /** Stock stages returned by the API (backend whitelists exactly these values). */
  stages = [
    { value: 'PRE-BINNED', label: 'Pre-Binned (No Pallet)' },
    { value: 'PALLET MAPPED', label: 'Pallet Mapped (No Location)' },
    { value: 'IN LOCATION', label: 'In Location' }
  ];

  rows: any[] = [];
  loading: boolean = false;
  page: number = 1;
  pageSize: number = 25;
  totalRecords: number = 0;
  totalPages: number = 0;
  sortBy: string = 'warehouseCode';
  sortDir: string = 'ASC';
  totals: { [key: string]: number } = {};
  warehouses: any[] = [];
  warehouseOptions: SearchSelectOption[] = [];

  // ---- Drill-down (location / pallet / box) ----
  detailOpen: boolean = false;
  selectedItem: any = null;
  detailColumns: ReportColumn[] = [
    { header: 'Stage', data: 'stage', sortable: true },
    { header: 'Box Number', data: 'boxNumber', sortable: true },
    { header: 'Pallet ID', data: 'palletId', sortable: true },
    { header: 'Location', data: 'locationCode', sortable: true },
    { header: 'Row', data: 'rowCode', sortable: true },
    { header: 'Stock Qty', data: 'quantity', sortable: true, sum: true },
    { header: 'Allocated Qty', data: 'allocatedQty', sortable: true, sum: true },
    { header: 'Available Qty', data: 'availableQty', sortable: true, sum: true },
    { header: 'Stock Date', data: 'stockDate', sortable: true }
  ];
  detailStage: string = '';
  detailRows: any[] = [];
  detailLoading: boolean = false;
  detailPage: number = 1;
  detailPageSize: number = 25;
  detailTotalRecords: number = 0;
  detailTotalPages: number = 0;
  detailSortBy: string = 'locationCode';
  detailSortDir: string = 'ASC';
  detailTotals: { [key: string]: number } = {};
  detailSearch: string = '';

  constructor(private apiservice: ApiService, private swal: SwalService, private appComponent: AppComponent, private fb: FormBuilder) { }

  ngOnInit(): void {
    this.filterForm = this.fb.group({
      warehouseCode: [''],
      itemCode: [''],
      itemName: [''],
      itemGroup: [''],
      category: [''],
      stage: ['']
    });
    this.loadWarehouses();
    this.load();
  }

  loadWarehouses(): void {
    this.apiservice.getWarehouseList().subscribe((res: any) => {
      this.warehouses = res.success ? res.data : [];
      this.warehouseOptions = this.warehouses.map((wh: any) => ({ value: wh.warehouseCode, label: `${wh.warehouseName} (${wh.warehouseCode})` }));
    }, () => {
      this.warehouses = [];
      this.warehouseOptions = [];
    });
  }

  private buildFilters(): any {
    const v = this.filterForm.value;
    return {
      warehouseCode: v.warehouseCode, itemCode: v.itemCode, itemName: v.itemName,
      itemGroup: v.itemGroup, category: v.category, stage: v.stage, search: this.searchTerm
    };
  }

  get activeFilterCount(): number {
    const v = this.filterForm?.value || {};
    return ['warehouseCode', 'itemCode', 'itemName', 'itemGroup', 'category', 'stage'].filter((k) => !!v[k]).length;
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
    this.page = 1;
    this.load();
  }

  load(): void {
    this.loading = true;
    this.appComponent.showLoading('Data Loading !!!');
    this.apiservice.getReportData('warehousestock', this.buildFilters(), this.page, this.pageSize, this.sortBy, this.sortDir).subscribe((res: any) => {
      this.loading = false;
      this.appComponent.hideLoading();
      if (res.success) {
        this.rows = res.data;
        this.totalRecords = res.pagination.totalRecords;
        this.totalPages = res.pagination.totalPages;
        this.totals = res.totals || {};
      } else {
        this.rows = [];
        this.totalRecords = 0;
        this.totalPages = 0;
        this.totals = {};
        this.swal.error('Error', res.message);
      }
    }, (err: any) => {
      this.loading = false;
      this.appComponent.hideLoading();
      this.rows = [];
      this.totals = {};
      this.swal.error('Error', err?.error?.message || 'Failed to load the Warehouse Stock report.');
    });
  }

  searchData(): void {
    this.page = 1;
    this.load();
    if (this.flagset) this.closesidebar();
  }

  clear(): void {
    this.searchTerm = '';
    this.filterForm.reset({ warehouseCode: '', itemCode: '', itemName: '', itemGroup: '', category: '', stage: '' });
    this.searchData();
  }

  onPageChange(p: number): void {
    this.page = p;
    this.load();
  }

  onSortChange(evt: { sortBy: string, sortDir: string }): void {
    this.sortBy = evt.sortBy;
    this.sortDir = evt.sortDir;
    this.page = 1;
    this.load();
  }

  export(format: string): void {
    this.apiservice.exportReportData('warehousestock', this.buildFilters(), this.sortBy, this.sortDir, format, 'Warehouse_Stock_Report',
      (err: any) => this.swal.error('Export Failed', err?.error?.message || 'Failed to export the Warehouse Stock report.'));
  }

  // ---------------------------------------------------------------------------
  // Drill-down
  // ---------------------------------------------------------------------------
  openDetails(row: any): void {
    this.selectedItem = row;
    this.detailOpen = true;
    this.detailPage = 1;
    this.detailSearch = '';
    // Carry the main report's Stage filter into the drill-down so its rows match the clicked totals.
    this.detailStage = this.filterForm.value.stage || '';
    this.detailSortBy = 'locationCode';
    this.detailSortDir = 'ASC';
    this.detailRows = [];
    this.loadDetails();
  }

  closeDetails(): void {
    this.detailOpen = false;
    this.selectedItem = null;
    this.detailRows = [];
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.detailOpen) this.closeDetails();
  }

  private buildDetailFilters(): any {
    return {
      warehouseCode: this.selectedItem?.warehouseCode,
      itemCode: this.selectedItem?.itemCode,
      stage: this.detailStage,
      search: this.detailSearch
    };
  }

  /** Boxes not yet on a pallet / pallets not yet in a location come back with nulls — label them clearly. */
  private toDetailDisplayRow(row: any): any {
    return {
      ...row,
      palletId: row.palletId || 'Not Mapped',
      locationCode: row.locationCode || 'Not Mapped',
      rowCode: row.rowCode || '-',
      stockDate: row.stockDate ? new Date(row.stockDate).toLocaleString() : null
    };
  }

  onDetailStageChange(stage: string): void {
    this.detailStage = stage;
    this.detailPage = 1;
    this.loadDetails();
  }

  loadDetails(): void {
    if (!this.selectedItem) return;
    this.detailLoading = true;
    this.apiservice.getReportData('warehousestockdetails', this.buildDetailFilters(), this.detailPage, this.detailPageSize, this.detailSortBy, this.detailSortDir).subscribe((res: any) => {
      this.detailLoading = false;
      if (res.success) {
        this.detailRows = (res.data || []).map((r: any) => this.toDetailDisplayRow(r));
        this.detailTotalRecords = res.pagination.totalRecords;
        this.detailTotalPages = res.pagination.totalPages;
        this.detailTotals = res.totals || {};
      } else {
        this.detailRows = [];
        this.detailTotalRecords = 0;
        this.detailTotalPages = 0;
        this.detailTotals = {};
        this.swal.error('Error', res.message);
      }
    }, (err: any) => {
      this.detailLoading = false;
      this.detailRows = [];
      this.detailTotals = {};
      this.swal.error('Error', err?.error?.message || 'Failed to load the stock details.');
    });
  }

  onDetailSearchChange(term: string): void {
    this.detailSearch = term;
    this.detailPage = 1;
    this.loadDetails();
  }

  clearDetailSearch(): void {
    this.onDetailSearchChange('');
  }

  onDetailPageChange(p: number): void {
    this.detailPage = p;
    this.loadDetails();
  }

  onDetailSortChange(evt: { sortBy: string, sortDir: string }): void {
    this.detailSortBy = evt.sortBy;
    this.detailSortDir = evt.sortDir;
    this.detailPage = 1;
    this.loadDetails();
  }

  exportDetails(format: string): void {
    const prefix = `Warehouse_Stock_${this.selectedItem?.warehouseCode}_${this.selectedItem?.itemCode}`;
    this.apiservice.exportReportData('warehousestockdetails', this.buildDetailFilters(), this.detailSortBy, this.detailSortDir, format, prefix,
      (err: any) => this.swal.error('Export Failed', err?.error?.message || 'Failed to export the stock details.'));
  }

  // ---------------------------------------------------------------------------
  // Filter sidebar
  // ---------------------------------------------------------------------------
  openSidebar(): void {
    const sidebar = document.querySelector<HTMLElement>('.sidebar_Request');
    this.flagset = true;
    sidebar?.classList.toggle('close');
  }

  closesidebar(): void {
    const sidebar = document.querySelector<HTMLElement>('.sidebar_Request');
    this.flagset = false;
    sidebar?.classList.toggle('close');
  }

  falseSet(): void {
    this.closesidebar();
  }
}
