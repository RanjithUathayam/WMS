import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import Swal from 'sweetalert2';
import { AppComponent } from '../app.component';
import { ApiService } from '../service/api.service';
import { SwalService } from '../service/swal.service';

interface GrnPushingTab {
  key: 'Pending' | 'Retrieval Status';
  label: string;
}

interface GrnTableColumn {
  label: string;
  sortKey: string;
  sortType: string;
  keys: string[];
  searchable?: boolean;
  fallback?: string;
}

@Component({
  selector: 'app-grn-pushing',
  templateUrl: './grn-pushing.component.html',
  styleUrls: ['./grn-pushing.component.css']
})
export class GrnPushingComponent implements OnInit {
  @ViewChild('tableBody') tableBody!: ElementRef;

  tabs: GrnPushingTab[] = [
    { key: 'Pending', label: 'Pending Queue' },
    { key: 'Retrieval Status', label: 'Retrieval Status' }
  ];

  activeTab: 'Pending' | 'Retrieval Status' = 'Pending';
  p = 1;
  detailPage = 1;
  itemsPerPage = 10;
  detailItemsPerPage = 10;
  lastUpdatedDateTime: any = new Date().toLocaleString();
  filters: { [key: string]: string } = {};
  detailFilters: { [key: string]: string } = {};
  debounceTimer: any;

  listData: any[] = [];
  filteredData: any[] = [];
  detailData: any[] = [];
  filteredDetailData: any[] = [];

  selectedRow: any = null;
  showDetailModal = false;
  isLoading = false;
  isDetailLoading = false;
  loadError = '';
  detailError = '';

  listSortKey = '';
  detailSortKey = '';
  isListAscending = true;
  isDetailAscending = true;

  readonly grnColumns: GrnTableColumn[] = [
    { label: 'Doc Date', sortKey: 'DocDate', sortType: 'text', keys: ['DocDate', 'docDate'] },
    { label: 'Doc Entry', sortKey: 'DocEntry', sortType: 'number', keys: ['DocEntry', 'docEntry'], searchable: true },
    { label: 'Doc Num', sortKey: 'DocNum', sortType: 'text', keys: ['DocNum', 'docNum'], searchable: true },
    { label: 'Type', sortKey: 'Type', sortType: 'text', keys: ['Type', 'type', 'DocType', 'docType', 'Process'], searchable: true },
    { label: 'Party Name', sortKey: 'PartyName', sortType: 'text', keys: ['PartyName', 'partyName', 'CardName'] },    
    { label: 'Quantity', sortKey: 'Quantity', sortType: 'number', keys: ['Quantity', 'quantity', 'Qty'] },
    { label: 'Binned', sortKey: 'Binned', sortType: 'number', keys: ['Binned', 'binned', 'BinnedQty'], fallback: '0' },
    { label: 'Status', sortKey: 'status', sortType: 'text', keys: ['status', 'status'], searchable: true },
    { label: 'Id', sortKey: 'Id', sortType: 'number', keys: ['Id', 'id'] },
    { label: 'Req Date', sortKey: 'ReqDate', sortType: 'text', keys: ['ReqDate', 'reqDate'] },
    { label: 'Requested', sortKey: 'Requested', sortType: 'number', keys: ['Requested', 'requested', 'RequestQty', 'ReqQty'] },
    
  ];

  constructor(
    private apiservice: ApiService,
    private swal: SwalService,
    private appComponent: AppComponent
  ) {}

  ngOnInit(): void {
    this.calculateItemsPerPageOnResize();
    this.loadListData();
  }

  calculateItemsPerPage(): number {
    if (!this.tableBody?.nativeElement) {
      return 10;
    }

    const tableElement = this.tableBody.nativeElement;
    const tableRowHeight = 52;
    const availableHeight = tableElement.clientHeight || 520;
    return Math.max(5, Math.floor(availableHeight / tableRowHeight));
  }

  calculateItemsPerPageOnResize() {
    window.addEventListener('resize', () => {
      this.itemsPerPage = this.calculateItemsPerPage();
    });
  }

  setActiveTab(tab: 'Pending' | 'Retrieval Status') {
    this.activeTab = tab;
    this.filters = {};
    this.selectedRow = null;
    this.listData = [];
    this.filteredData = [];
    this.loadError = '';

    if (tab === 'Pending') {
      this.loadListData();
    }
  }

  loadListData() {
    if (this.activeTab !== 'Pending') {
      return;
    }

    this.lastUpdatedDateTime = new Date().toLocaleString();
    this.isLoading = true;
    this.loadError = '';

    const requestBody = {
      type: 'Binning'
    };

    this.appComponent.showLoading('GRN Pushing Data Loading...');
    this.apiservice.getGrnPushingList(requestBody).subscribe(
      (res: any) => {
        this.appComponent.hideLoading();
        this.isLoading = false;

        const rawData = this.normalizeCollectionResponse(res);
        if (rawData.length > 0 || res?.status === 1) {
          this.listData = rawData.map((item: any, index: number) => ({
            ...item,
            sno: index + 1,
            selected: false
          }));
          this.filteredData = [...this.listData];
          this.itemsPerPage = this.calculateItemsPerPage();
          return;
        }

        this.listData = [];
        this.filteredData = [];
        this.loadError = this.getErrorMessage(res, 'No GRN pushing records were returned by the backend.');
      },
      (error) => {
        this.appComponent.hideLoading();
        this.isLoading = false;
        this.listData = [];
        this.filteredData = [];
        this.loadError = this.getErrorMessage(error, 'Unable to load GRN pushing data.');
      }
    );
  }

  applyFilters() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.filteredData = this.listData.filter((record) =>
        Object.keys(this.filters).every((key) => {
          const filterValue = (this.filters[key] || '').trim().toLowerCase();
          if (!filterValue) {
            return true;
          }

          const recordValue = String(record[key] ?? '').toLowerCase();
          return recordValue.includes(filterValue);
        })
      );
      this.p = 1;
    }, 250);
  }

  applyDetailFilters() {
    this.filteredDetailData = this.detailData.filter((record) =>
      Object.keys(this.detailFilters).every((key) => {
        const filterValue = (this.detailFilters[key] || '').trim().toLowerCase();
        if (!filterValue) {
          return true;
        }

        const recordValue = String(record[key] ?? '').toLowerCase();
        return recordValue.includes(filterValue);
      })
    );
    this.detailPage = 1;
  }

  onRowSelect(item: any) {
    this.listData.forEach((row) => {
      row.selected = row === item;
    });
    this.filteredData.forEach((row) => {
      row.selected = row === item;
    });
    this.selectedRow = item;
  }

  openOrderDetails() {
    if (!this.selectedRow) {
      Swal.fire({
        title: 'Warning',
        text: 'Please select a row to view order details.',
        icon: 'info'
      });
      return;
    }

    const requestBody = {
      type: 'Binning',
      process: this.selectedRow.Type || this.selectedRow.type || this.selectedRow.DocType || this.selectedRow.docType || this.selectedRow.Process || 'GRPO',
      status: this.selectedRow.Status || this.selectedRow.status || 'Pending',
      docEntry: this.selectedRow.DocEntry || this.selectedRow.docEntry
    };

    this.detailError = '';
    this.isDetailLoading = true;
    this.appComponent.showLoading('Order Details Loading...');
    this.apiservice.getGrnPushingDetails(requestBody).subscribe(
      (res: any) => {
        this.appComponent.hideLoading();
        this.isDetailLoading = false;

        const rawData = this.normalizeCollectionResponse(res);
        if (rawData.length > 0 || res?.status === 1) {
          this.detailData = rawData.map((item: any, index: number) => ({
            ...item,
            sno: index + 1,
            selected: true
          }));
          this.filteredDetailData = [...this.detailData];
          this.detailFilters = {};
          this.showDetailModal = true;
          return;
        }

        this.detailData = [];
        this.filteredDetailData = [];
        this.detailError = this.getErrorMessage(res, 'No order details were returned by the backend.');
        this.showDetailModal = true;
      },
      (error) => {
        this.appComponent.hideLoading();
        this.isDetailLoading = false;
        this.detailData = [];
        this.filteredDetailData = [];
        this.detailError = this.getErrorMessage(error, 'Unable to load order details.');
        this.showDetailModal = true;
      }
    );
  }

  closeOrderDetails() {
    this.showDetailModal = false;
  }

  submitRequest() {
    if (!this.selectedRow) {
      Swal.fire({
        title: 'Warning',
        text: 'Please select a row to submit the request.',
        icon: 'info'
      });
      return;
    }

    const requestBody = {
      type: 'Binning',
      docEntry: this.selectedRow.DocEntry || this.selectedRow.docEntry,
      docNum: this.selectedRow.DocNum || this.selectedRow.docNum,
      process: this.selectedRow.Type || this.selectedRow.type || this.selectedRow.DocType || this.selectedRow.docType || 'GRPO'
    };

    Swal.fire({
      title: 'Push selected GRN?',
      text: 'This will create the GRN pushing request for the selected document.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#0f766e',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, continue'
    }).then((result) => {
      if (!result.isConfirmed) {
        return;
      }

      this.appComponent.showLoading('Submitting GRN Pushing Request...');
      this.apiservice.submitGrnPushingRequest(requestBody).subscribe(
        (res: any) => {
          this.appComponent.hideLoading();

          if (res?.status === 1) {
            Swal.fire({
              title: 'Success',
              text: res?.message || 'GRN pushing request submitted successfully.',
              icon: 'success',
              showConfirmButton: false,
              timer: 1200,
              timerProgressBar: true
            });
            this.selectedRow = null;
            this.loadListData();
            return;
          }

          this.swal.error('Error', this.getErrorMessage(res, 'Unable to submit the GRN pushing request.'));
        },
        (error) => {
          this.appComponent.hideLoading();
          this.swal.error('Error', this.getErrorMessage(error, 'Unable to submit the GRN pushing request.'));
        }
      );
    });
  }

  sortArrayByKey(data: any[], key: string, type: string): any[] {
    return data.sort((a, b) => {
      const aValue = a[key];
      const bValue = b[key];

      if (type === 'number') {
        return Number(aValue || 0) - Number(bValue || 0);
      }

      if (type === 'date') {
        return new Date(aValue).getTime() - new Date(bValue).getTime();
      }

      return String(aValue || '').localeCompare(String(bValue || ''));
    });
  }

  onSort(key: string, type: string) {
    if (this.listSortKey === key) {
      this.isListAscending = !this.isListAscending;
    } else {
      this.listSortKey = key;
      this.isListAscending = true;
    }

    this.filteredData = this.sortArrayByKey(this.filteredData, key, type);
    if (!this.isListAscending) {
      this.filteredData.reverse();
    }
  }

  onDetailSort(key: string, type: string) {
    if (this.detailSortKey === key) {
      this.isDetailAscending = !this.isDetailAscending;
    } else {
      this.detailSortKey = key;
      this.isDetailAscending = true;
    }

    this.filteredDetailData = this.sortArrayByKey(this.filteredDetailData, key, type);
    if (!this.isDetailAscending) {
      this.filteredDetailData.reverse();
    }
  }

  getListValue(item: any, keys: string[], fallback = '-') {
    for (const key of keys) {
      const value = item?.[key];
      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
    }

    return fallback;
  }

  get pendingCount(): number {
    return this.filteredData.length;
  }

  getFilterValue(key: string): string {
    return this.filters[key] || '';
  }

  get selectedDocLabel(): string {
    if (!this.selectedRow) {
      return 'No document selected';
    }

    return `${this.getListValue(this.selectedRow, ['DocNum', 'docNum'])} / ${this.getListValue(this.selectedRow, ['PartyName', 'partyName', 'CardName'])}`;
  }

  private normalizeCollectionResponse(res: any): any[] {
    const candidates = [
      res?.data,
      res?.rows,
      res?.result,
      res?.result?.data,
      res?.result?.rows,
      res?.response?.data,
      res
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate;
      }
    }

    return [];
  }

  private getErrorMessage(source: any, fallback: string): string {
    return source?.error?.message || source?.message || source?.error?.error || fallback;
  }
}
