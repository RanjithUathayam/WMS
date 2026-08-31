import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../service/api.service';
import { SwalService } from '../service/swal.service';
import { AppComponent } from '../app.component';
import Swal from 'sweetalert2';

// NOTE: Per the documented /api/location contract, only Location/Position has
// real create/update/activate/deactivate endpoints. Warehouse and Row are
// read-only here (GET /warehouses, GET /warehouse/:code/rows) — there is no
// backend route to create/edit/activate a Warehouse or Row, so this component
// only lets you pick them, not manage them.

@Component({
  selector: 'app-location-master',
  templateUrl: './location-master.component.html',
  styleUrls: ['./location-master.component.css']
})
export class LocationMasterComponent implements OnInit {

  activeView: 'list' | 'structure' = 'list';
  btnRights: any = {};

  // ---------- List view ----------
  locationList: any[] = [];
  totalCount: number = 0;
  p: number = 1;
  itemsPerPage: number = 20;
  filters: { [key: string]: string } = { WarehouseCode: '', RowCode: '' };
  filterRowOptions: any[] = [];
  filterRowsError: string = '';

  // ---------- Structure view ----------
  warehouseListCache: any[] = [];
  warehousesLoaded: boolean = false;
  rowListCache: { [warehouseId: string]: any[] } = {};
  selectedWarehouse: any = null;
  selectedRow: any = null;
  rowList: any[] = [];
  rowsError: string = '';
  positionList: any[] = [];

  // ---------- Create / Edit popup modal ----------
  modalMode: 'create' | 'edit' | '' = '';
  positionForm!: FormGroup;
  editPositionForm!: FormGroup;
  editingLocation: any = null;
  submitted: boolean = false;

  // Create modal has its own Warehouse/Row pickers so it can be opened
  // straight from the List tab, without first browsing Manage Structure.
  // Row is a free-text field (with existing rows suggested) rather than a
  // strict select, because a Row only "exists" once a Location under it
  // exists — a brand-new warehouse/row combination has nothing to select.
  createWarehouseCode: string = '';
  createRowCode: string = '';
  createRowOptions: any[] = [];
  createRowsError: string = '';

  constructor(
    private formbuilder: FormBuilder,
    private apiservice: ApiService,
    private swal: SwalService,
    private appComponent: AppComponent
  ) { }

  ngOnInit(): void {
    this.positionForm = this.formbuilder.group({
      PositionFrom: ['', [Validators.required, Validators.min(1)]],
      PositionTo: [''],
    });
    this.editPositionForm = this.formbuilder.group({
      RowCode: ['', Validators.required],
      PositionNo: ['', [Validators.required, Validators.min(1)]],
    });

    let user_rights: any = localStorage.getItem('WMS-Rights');
    if (user_rights != null) {
      const data = JSON.parse(user_rights);
      const resultss = data.map((key: any) => ({ [key]: true }))
        .reduce((acc: any, obj: any) => ({ ...acc, ...obj }), {});

      this.btnRights = {
        master_location_creates: data.some((right: any) => right.includes('master_location_creates')),
        master_location_modifies: data.some((right: any) => right.includes('master_location_modifies')),
        ...resultss
      };
    }

    // Backend rights for this module aren't set up yet, so the Admin login is
    // granted full access here on the frontend until master_location_creates /
    // master_location_modifies are added to the rights API response.
    const loggedInUser = (localStorage.getItem('UserName') || '').toLowerCase();
    if (loggedInUser === 'admin') {
      this.btnRights.master_location_creates = true;
      this.btnRights.master_location_modifies = true;
    }

    this.loadWarehouseCache();
    this.getLocationList();
  }

  switchView(view: 'list' | 'structure') {
    this.activeView = view;
  }

  // ---------- Cached master data (Warehouse) ----------
  loadWarehouseCache() {
    this.appComponent.showLoading('Warehouse Data Loading...');
    this.apiservice.getWarehouseList().subscribe((res: any) => {
      this.appComponent.hideLoading();
      this.warehousesLoaded = true;
      if (res.success) {
        this.warehouseListCache = res.data;
      } else {
        this.swal.error('Error', res.message);
      }
    }, (err: any) => {
      this.appComponent.hideLoading();
      this.warehousesLoaded = true;
      this.swal.error('Error', err.message);
    });
  }

  // ---------- List view ----------
  onFilterWarehouseChange() {
    this.filters['RowCode'] = '';
    this.filterRowOptions = [];
    this.filterRowsError = '';
    this.locationList = [];
    this.totalCount = 0;
    if (this.filters['WarehouseCode']) {
      this.loadRowsForFilter(this.filters['WarehouseCode']);
    }
  }

  loadRowsForFilter(warehouseCode: string) {
    this.filterRowsError = '';
    if (this.rowListCache[warehouseCode]) {
      this.filterRowOptions = this.rowListCache[warehouseCode];
      return;
    }
    this.apiservice.getRowList(warehouseCode).subscribe((res: any) => {
      if (res.success) {
        this.rowListCache[warehouseCode] = res.data;
        this.filterRowOptions = res.data;
      } else {
        this.filterRowOptions = [];
        this.filterRowsError = res.message || 'Failed to load rows for this warehouse.';
      }
    }, (err: any) => {
      this.filterRowOptions = [];
      this.filterRowsError = err.error?.message || err.message || 'Failed to load rows for this warehouse.';
    });
  }

  applyFilters() {
    this.p = 1;
    this.getLocationList();
  }

  getLocationList() {
    const warehouseCode = this.filters['WarehouseCode'];
    const rowCode = this.filters['RowCode'];
    if (!warehouseCode || !rowCode) {
      this.locationList = [];
      this.totalCount = 0;
      return;
    }
    this.appComponent.showLoading('Location Data Loading...');
    this.apiservice.getLocationList(warehouseCode, rowCode).subscribe((res: any) => {
      this.appComponent.hideLoading();
      if (res.success) {
        this.locationList = res.data;
        this.totalCount = res.data.length;
      } else {
        this.locationList = [];
        this.totalCount = 0;
        this.swal.error('Error', res.message);
      }
    }, (err: any) => {
      this.appComponent.hideLoading();
      this.swal.error('Error', err.message);
    });
  }

  get pagedLocationList(): any[] {
    const start = (this.p - 1) * this.itemsPerPage;
    return this.locationList.slice(start, start + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCount / this.itemsPerPage));
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages || page === this.p) {
      return;
    }
    this.p = page;
  }

  changeLocationStatus(item: any) {
    if (item.status === 'OCCUPIED') {
      this.swal.error('Error', 'Occupied locations cannot be changed manually.');
      return;
    }
    const isActive = item.status === 'AVAILABLE';
    const action = isActive ? 'deactivate' : 'activate';
    Swal.fire({
      title: `Are you sure you want to ${action} this location?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: `Yes, ${action} it!`
    }).then((result) => {
      if (result.isConfirmed) {
        this.appComponent.showLoading('Updating Status...');
        const request = isActive
          ? this.apiservice.deactivateLocation(item.locationId)
          : this.apiservice.activateLocation(item.locationId);
        request.subscribe((res: any) => {
          this.appComponent.hideLoading();
          if (res.success) {
            this.swal.success_ok('Success', `Location ${isActive ? 'deactivated' : 'activated'} successfully`, true);
            this.refreshCurrentLocations();
          } else {
            this.swal.error('Error', res.message);
          }
        }, (err: any) => {
          this.appComponent.hideLoading();
          this.swal.error('Error', err.message);
        });
      }
    });
  }

  private refreshCurrentLocations() {
    if (this.activeView === 'structure' && this.selectedRow) {
      this.loadPositions(this.selectedRow.rowCode);
    } else {
      this.getLocationList();
    }
  }

  // ---------- Structure view: Row panel ----------
  selectWarehouse(warehouse: any) {
    this.selectedWarehouse = warehouse;
    this.selectedRow = null;
    this.positionList = [];
    this.rowsError = '';
    this.loadRows(warehouse.warehouseCode);
  }

  loadRows(warehouseCode: string) {
    this.rowsError = '';
    if (this.rowListCache[warehouseCode]) {
      this.rowList = this.rowListCache[warehouseCode];
      return;
    }
    this.appComponent.showLoading('Row Data Loading...');
    this.apiservice.getRowList(warehouseCode).subscribe((res: any) => {
      this.appComponent.hideLoading();
      if (res.success) {
        this.rowListCache[warehouseCode] = res.data;
        this.rowList = res.data;
      } else {
        this.rowList = [];
        this.rowsError = res.message || 'Failed to load rows for this warehouse.';
      }
    }, (err: any) => {
      this.appComponent.hideLoading();
      this.rowList = [];
      this.rowsError = err.error?.message || err.message || 'Failed to load rows for this warehouse.';
    });
  }

  // ---------- Structure view: Position panel ----------
  selectRow(row: any) {
    this.selectedRow = row;
    this.loadPositions(row.rowCode);
  }

  loadPositions(rowCode: string) {
    const row = this.rowList.find((r: any) => r.rowCode === rowCode);
    if (!row) {
      return;
    }
    this.appComponent.showLoading('Position Data Loading...');
    this.apiservice.getLocationList(this.selectedWarehouse.warehouseCode, row.rowCode).subscribe((res: any) => {
      this.appComponent.hideLoading();
      if (res.success) {
        this.positionList = res.data;
      } else {
        this.swal.error('Error', res.message);
      }
    }, (err: any) => {
      this.appComponent.hideLoading();
      this.swal.error('Error', err.message);
    });
  }

  // ---------- Create modal ----------
  openCreateModal() {
    this.modalMode = 'create';
    this.submitted = false;
    this.positionForm.reset();
    this.createRowsError = '';

    // Default to whichever Warehouse/Row is already in context (Manage
    // Structure selection, or the List tab's filters), but the pickers
    // below let the user change either from scratch.
    this.createWarehouseCode = this.selectedWarehouse?.warehouseCode || this.filters['WarehouseCode'] || '';
    this.createRowCode = this.selectedRow?.rowCode || this.filters['RowCode'] || '';
    this.createRowOptions = [];
    if (this.createWarehouseCode) {
      this.loadRowsForCreateModal(this.createWarehouseCode);
    }
  }

  onCreateWarehouseChange() {
    this.createRowCode = '';
    this.createRowOptions = [];
    this.createRowsError = '';
    if (this.createWarehouseCode) {
      this.loadRowsForCreateModal(this.createWarehouseCode);
    }
  }

  loadRowsForCreateModal(warehouseCode: string) {
    this.createRowsError = '';
    if (this.rowListCache[warehouseCode]) {
      this.createRowOptions = this.rowListCache[warehouseCode];
      return;
    }
    this.apiservice.getRowList(warehouseCode).subscribe((res: any) => {
      if (res.success) {
        this.rowListCache[warehouseCode] = res.data;
        this.createRowOptions = res.data;
      } else {
        this.createRowOptions = [];
        this.createRowsError = res.message || 'Failed to load rows for this warehouse.';
      }
    }, (err: any) => {
      this.createRowOptions = [];
      this.createRowsError = err.error?.message || err.message || 'Failed to load rows for this warehouse.';
    });
  }

  get positionCodePreview(): string {
    if (!this.createWarehouseCode || !this.createRowCode) {
      return '';
    }
    const from = this.positionForm?.value?.PositionFrom;
    if (!from) {
      return '';
    }
    return this.generateLocationCode(this.createWarehouseCode, this.createRowCode, from);
  }

  generateLocationCode(warehouseCode: string, rowCode: string, positionNo: number | string): string {
    const paddedPos = String(positionNo).padStart(3, '0');
    return `${warehouseCode}-${rowCode}-${paddedPos}`;
  }

  submitPosition() {
    this.submitted = true;
    this.createRowCode = (this.createRowCode || '').trim();
    if (!this.createWarehouseCode || !this.createRowCode || this.positionForm.invalid) {
      return;
    }
    const formValue = this.positionForm.value;
    const from = Number(formValue.PositionFrom);
    const to = formValue.PositionTo ? Number(formValue.PositionTo) : from;
    const warehouseCode = this.createWarehouseCode;
    const rowCode = this.createRowCode;
    const isBulk = to !== from;
    this.appComponent.showLoading('Saving Position...');
    const request = isBulk
      ? this.apiservice.generateLocationPositions({ warehouseCode, rowCode, startPosition: from, endPosition: to })
      : this.apiservice.createLocation({ warehouseCode, rowCode, positionNo: from });
    request.subscribe((res: any) => {
      this.appComponent.hideLoading();
      if (res.success) {
        this.swal.success_ok('Success', res.message, true);
        this.closeModal();
        if (this.selectedWarehouse?.warehouseCode === warehouseCode && this.selectedRow?.rowCode === rowCode) {
          this.loadPositions(rowCode);
        }
        if (this.filters['WarehouseCode'] === warehouseCode && this.filters['RowCode'] === rowCode) {
          this.getLocationList();
        }
      } else {
        this.swal.error('Error', res.message);
      }
    }, (err: any) => {
      this.appComponent.hideLoading();
      this.swal.error('Error', err.message);
    });
  }

  // ---------- Edit modal ----------
  openEditModal(pos: any) {
    if (pos.status !== 'AVAILABLE') {
      return;
    }
    this.modalMode = 'edit';
    this.submitted = false;
    this.editingLocation = pos;
    this.editPositionForm.patchValue({ RowCode: pos.rowCode, PositionNo: pos.positionNo });
  }

  get editPositionCodePreview(): string {
    if (!this.selectedWarehouse || !this.editingLocation) {
      return '';
    }
    const formValue = this.editPositionForm?.value;
    if (!formValue?.RowCode || !formValue?.PositionNo) {
      return '';
    }
    return this.generateLocationCode(this.selectedWarehouse.warehouseCode, formValue.RowCode, formValue.PositionNo);
  }

  submitEditPosition() {
    this.submitted = true;
    if (this.editPositionForm.invalid) {
      return;
    }
    const formValue = this.editPositionForm.value;
    const obj: any = { rowCode: formValue.RowCode, positionNo: Number(formValue.PositionNo) };
    this.appComponent.showLoading('Updating Position...');
    this.apiservice.updateLocationDetails(this.editingLocation.locationId, obj).subscribe((res: any) => {
      this.appComponent.hideLoading();
      if (res.success) {
        this.swal.success_ok('Success', res.message, true);
        this.closeModal();
        this.loadPositions(this.selectedRow.rowCode);
      } else {
        this.swal.error('Error', res.message);
      }
    }, (err: any) => {
      this.appComponent.hideLoading();
      this.swal.error('Error', err.message);
    });
  }

  // ---------- Popup modal helper ----------
  closeModal() {
    this.modalMode = '';
    this.editingLocation = null;
    this.createWarehouseCode = '';
    this.createRowCode = '';
    this.createRowOptions = [];
    this.createRowsError = '';
  }

  get pf(): { [key: string]: AbstractControl } {
    return this.positionForm.controls;
  }
  get epf(): { [key: string]: AbstractControl } {
    return this.editPositionForm.controls;
  }
}
