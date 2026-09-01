import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ApiService } from '../service/api.service';
import { SwalService } from '../service/swal.service';
import { AppComponent } from '../app.component';
import { ReportColumn } from '../components/report-table/report-table.component';

@Component({
  selector: 'app-pallet-mapping-report',
  templateUrl: './pallet-mapping-report.component.html',
  styleUrls: ['./pallet-mapping-report.component.css']
})
export class PalletMappingReportComponent implements OnInit {
  flagset: boolean = false;
  filterForm!: FormGroup;

  columns: ReportColumn[] = [
    { header: 'Pallet ID', data: 'palletId', sortable: true },
    { header: 'Pallet Status', data: 'palletStatus', sortable: true },
    { header: 'Box Number', data: 'boxNumber', sortable: true },
    { header: 'Warehouse', data: 'warehouseCode', sortable: true },
    { header: 'Box Total Qty', data: 'boxTotalQty', sortable: true },
    { header: 'Item Code', data: 'itemCode', sortable: true },
    { header: 'Item Qty', data: 'itemQty', sortable: true },
    { header: 'Item Name', data: 'itemMaster.itemName' },
    { header: 'Item Group', data: 'itemMaster.itemGroup' },
    { header: 'Category', data: 'itemMaster.category' },
    { header: 'Color', data: 'itemMaster.color' },
    { header: 'Size', data: 'itemMaster.size' },
    { header: 'Style', data: 'itemMaster.style' },
    { header: 'Mapped By', data: 'mappedBy' },
    { header: 'Mapped At', data: 'mappedAt', sortable: true }
  ];

  rows: any[] = [];
  loading: boolean = false;
  page: number = 1;
  pageSize: number = 25;
  totalRecords: number = 0;
  totalPages: number = 0;
  sortBy: string = 'mappedAt';
  sortDir: string = 'DESC';

  constructor(private apiservice: ApiService, private swal: SwalService, private appComponent: AppComponent, private fb: FormBuilder) { }

  ngOnInit(): void {
    this.filterForm = this.fb.group({
      palletId: [''],
      boxNumber: [''],
      itemCode: [''],
      itemName: [''],
      warehouseCode: [''],
      status: [''],
      fromDate: [new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]],
      toDate: [new Date().toISOString().split('T')[0]]
    });
    this.load();
  }

  private buildFilters(): any {
    const v = this.filterForm.value;
    return {
      palletId: v.palletId, boxNumber: v.boxNumber, itemCode: v.itemCode, itemName: v.itemName,
      warehouseCode: v.warehouseCode, status: v.status, fromDate: v.fromDate, toDate: v.toDate
    };
  }

  load(): void {
    this.loading = true;
    this.appComponent.showLoading('Data Loading !!!');
    this.apiservice.getReportData('palletmapping', this.buildFilters(), this.page, this.pageSize, this.sortBy, this.sortDir).subscribe((res: any) => {
      this.loading = false;
      this.appComponent.hideLoading();
      if (res.success) {
        this.rows = res.data;
        this.totalRecords = res.pagination.totalRecords;
        this.totalPages = res.pagination.totalPages;
      } else {
        this.rows = [];
        this.totalRecords = 0;
        this.totalPages = 0;
        this.swal.error('Error', res.message);
      }
    }, (err: any) => {
      this.loading = false;
      this.appComponent.hideLoading();
      this.rows = [];
      this.swal.error('Error', err?.error?.message || 'Failed to load the Pallet Mapping report.');
    });
  }

  searchData(): void {
    this.page = 1;
    this.load();
  }

  clear(): void {
    this.filterForm.reset({
      palletId: '', boxNumber: '', itemCode: '', itemName: '', warehouseCode: '', status: '',
      fromDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      toDate: new Date().toISOString().split('T')[0]
    });
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
    this.apiservice.exportReportData('palletmapping', this.buildFilters(), this.sortBy, this.sortDir, format, 'Pallet_Mapping_Report');
  }

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
