import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ApiService } from '../service/api.service';
import { SwalService } from '../service/swal.service';
import { AppComponent } from '../app.component';
import { ReportColumn } from '../components/report-table/report-table.component';

@Component({
  selector: 'app-pre-binning-report',
  templateUrl: './pre-binning-report.component.html',
  styleUrls: ['./pre-binning-report.component.css']
})
export class PreBinningReportComponent implements OnInit {
  flagset: boolean = false;
  filterForm!: FormGroup;
  searchTerm: string = '';
  private defaultFromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  private defaultToDate = new Date().toISOString().split('T')[0];

  columns: ReportColumn[] = [
    { header: 'GRN No', data: 'grnNo', sortable: true },
    { header: 'Warehouse', data: 'whsCode', sortable: true },
    { header: 'GRN Type', data: 'grnType' },
    { header: 'Bin ID', data: 'binId', sortable: true },
    { header: 'Item Code', data: 'itemCode', sortable: true },
    { header: 'Item Name', data: 'itemName', sortable: true },
    { header: 'Item Group', data: 'itemGroup', sortable: true },
    { header: 'Binned Qty', data: 'binnedQty', sortable: true, sum: true },
    { header: 'Requested Qty', data: 'requestedQty', sortable: true, sum: true },
    { header: 'Binning Status', data: 'binningStatus', sortable: true },
    { header: 'Item Status', data: 'itemStatus', sortable: true },
    { header: 'Category', data: 'itemMaster.category' },
    { header: 'Description', data: 'itemMaster.description' },
    { header: 'Color', data: 'itemMaster.color' },
    { header: 'Size', data: 'itemMaster.size' },
    { header: 'Style', data: 'itemMaster.style' },
    { header: 'Bin Capacity', data: 'itemMaster.binCapacity' },
    { header: 'Created By', data: 'createdBy' },
    { header: 'Created Date', data: 'createdDate', sortable: true }
  ];

  rows: any[] = [];
  loading: boolean = false;
  page: number = 1;
  pageSize: number = 25;
  totalRecords: number = 0;
  totalPages: number = 0;
  sortBy: string = 'createdDate';
  sortDir: string = 'DESC';
  totals: { [key: string]: number } = {};

  constructor(private apiservice: ApiService, private swal: SwalService, private appComponent: AppComponent, private fb: FormBuilder) { }

  ngOnInit(): void {
    this.filterForm = this.fb.group({
      grnNo: [''],
      whsCode: [''],
      itemCode: [''],
      itemName: [''],
      binId: [''],
      status: [''],
      fromDate: [this.defaultFromDate],
      toDate: [this.defaultToDate]
    });
    this.load();
  }

  private buildFilters(): any {
    const v = this.filterForm.value;
    return {
      grnNo: v.grnNo, whsCode: v.whsCode, itemCode: v.itemCode, itemName: v.itemName, binId: v.binId,
      status: v.status, fromDate: v.fromDate, toDate: v.toDate,
      search: this.searchTerm
    };
  }

  get activeFilterCount(): number {
    const v = this.filterForm?.value || {};
    let count = 0;
    if (v.grnNo) count++;
    if (v.whsCode) count++;
    if (v.itemCode) count++;
    if (v.itemName) count++;
    if (v.binId) count++;
    if (v.status) count++;
    if (v.fromDate !== this.defaultFromDate) count++;
    if (v.toDate !== this.defaultToDate) count++;
    return count;
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
    this.page = 1;
    this.load();
  }

  load(): void {
    this.loading = true;
    this.appComponent.showLoading('Data Loading !!!');
    this.apiservice.getReportData('prebinning', this.buildFilters(), this.page, this.pageSize, this.sortBy, this.sortDir).subscribe((res: any) => {
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
      this.swal.error('Error', err?.error?.message || 'Failed to load the Pre-Binning report.');
    });
  }

  searchData(): void {
    this.page = 1;
    this.load();
  }

  clear(): void {
    this.searchTerm = '';
    this.filterForm.reset({
      grnNo: '', whsCode: '', itemCode: '', itemName: '', binId: '', status: '',
      fromDate: this.defaultFromDate,
      toDate: this.defaultToDate
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
    this.apiservice.exportReportData('prebinning', this.buildFilters(), this.sortBy, this.sortDir, format, 'Pre_Binning_Report',
      (err: any) => this.swal.error('Export Failed', err?.error?.message || 'Failed to export the Pre-Binning report.'));
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
