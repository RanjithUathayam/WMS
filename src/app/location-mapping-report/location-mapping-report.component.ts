import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ApiService } from '../service/api.service';
import { SwalService } from '../service/swal.service';
import { AppComponent } from '../app.component';
import { ReportColumn } from '../components/report-table/report-table.component';

@Component({
  selector: 'app-location-mapping-report',
  templateUrl: './location-mapping-report.component.html',
  styleUrls: ['./location-mapping-report.component.css']
})
export class LocationMappingReportComponent implements OnInit {
  flagset: boolean = false;
  filterForm!: FormGroup;

  columns: ReportColumn[] = [
    { header: 'Location Code', data: 'locationCode', sortable: true },
    { header: 'Warehouse', data: 'warehouseCode', sortable: true },
    { header: 'Row', data: 'rowCode', sortable: true },
    { header: 'Position No', data: 'positionNo', sortable: true },
    { header: 'Pallet ID', data: 'palletId', sortable: true },
    { header: 'Pallet Mapping ID', data: 'palletMappingId' },
    { header: 'Action', data: 'action' },
    { header: 'Mapping Status', data: 'mappingStatus', sortable: true },
    { header: 'Current Location Status', data: 'currentLocationStatus' },
    { header: 'Currently Occupying Pallet', data: 'currentOccupyingPalletId' },
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
      warehouseCode: [''],
      rowCode: [''],
      locationCode: [''],
      palletId: [''],
      status: [''],
      itemCode: [''],
      fromDate: [new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]],
      toDate: [new Date().toISOString().split('T')[0]]
    });
    this.load();
  }

  private buildFilters(): any {
    const v = this.filterForm.value;
    return {
      warehouseCode: v.warehouseCode, rowCode: v.rowCode, locationCode: v.locationCode, palletId: v.palletId,
      status: v.status, itemCode: v.itemCode, fromDate: v.fromDate, toDate: v.toDate
    };
  }

  load(): void {
    this.loading = true;
    this.appComponent.showLoading('Data Loading !!!');
    this.apiservice.getReportData('locationmapping', this.buildFilters(), this.page, this.pageSize, this.sortBy, this.sortDir).subscribe((res: any) => {
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
      this.swal.error('Error', err?.error?.message || 'Failed to load the Location Mapping report.');
    });
  }

  searchData(): void {
    this.page = 1;
    this.load();
  }

  clear(): void {
    this.filterForm.reset({
      warehouseCode: '', rowCode: '', locationCode: '', palletId: '', status: '', itemCode: '',
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
    this.apiservice.exportReportData('locationmapping', this.buildFilters(), this.sortBy, this.sortDir, format, 'Location_Mapping_Report');
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
