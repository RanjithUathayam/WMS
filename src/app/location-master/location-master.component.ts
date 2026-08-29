import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../service/api.service';
import { SwalService } from '../service/swal.service';
import { AppComponent } from '../app.component';
import Swal from 'sweetalert2';

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

  // ---------- Structure view ----------
  warehouseListCache: any[] = [];
  rowListCache: { [warehouseId: string]: any[] } = {};
  selectedWarehouse: any = null;
  selectedRow: any = null;
  rowList: any[] = [];
  positionList: any[] = [];

  // ---------- Sidebar ----------
  sidebarMode: 'warehouse' | 'row' | 'position' | '' = '';
  warehouseForm!: FormGroup;
  rowForm!: FormGroup;
  positionForm!: FormGroup;
  editId: any = '';
  submitted: boolean = false;

  constructor(
    private formbuilder: FormBuilder,
    private apiservice: ApiService,
    private swal: SwalService,
    private appComponent: AppComponent
  ) { }

  ngOnInit(): void {
    this.warehouseForm = this.formbuilder.group({
      WarehouseCode: ['', Validators.required],
      WarehouseName: ['', Validators.required],
    });
    this.rowForm = this.formbuilder.group({
      RowCode: ['', Validators.required],
    });
    this.positionForm = this.formbuilder.group({
      PositionFrom: ['', [Validators.required, Validators.min(1)]],
      PositionTo: [''],
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
      if (res.success) {
        this.warehouseListCache = res.data;
      } else {
        this.swal.error('Error', res.message);
      }
    }, (err: any) => {
      this.appComponent.hideLoading();
      this.swal.error('Error', err.message);
    });
  }

  // ---------- List view ----------
  onFilterWarehouseChange() {
    this.filters['RowCode'] = '';
    this.filterRowOptions = [];
    this.locationList = [];
    this.totalCount = 0;
    if (this.filters['WarehouseCode']) {
      this.loadRowsForFilter(this.filters['WarehouseCode']);
    }
  }

  loadRowsForFilter(warehouseCode: string) {
    if (this.rowListCache[warehouseCode]) {
      this.filterRowOptions = this.rowListCache[warehouseCode];
      return;
    }
    this.apiservice.getRowList(warehouseCode).subscribe((res: any) => {
      if (res.success) {
        this.rowListCache[warehouseCode] = res.data;
        this.filterRowOptions = res.data;
      } else {
        this.swal.error('Error', res.message);
      }
    }, (err: any) => {
      this.swal.error('Error', err.message);
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
    if (item.status === 'Occupied') {
      this.swal.error('Error', 'Occupied locations cannot be changed manually.');
      return;
    }
    const isActive = item.status === 'Active';
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
          ? this.apiservice.deactivateLocation(item.id)
          : this.apiservice.activateLocation(item.id);
        request.subscribe((res: any) => {
          this.appComponent.hideLoading();
          if (res.success) {
            this.swal.success_ok('Success', `Location ${isActive ? 'deactivated' : 'activated'} successfully`, true);
            this.getLocationList();
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

  // ---------- Structure view: Warehouse panel ----------
  openWarehouseSidebar(data: any) {
    this.sidebarMode = 'warehouse';
    this.submitted = false;
    if (!data) {
      this.editId = '';
      this.warehouseForm.reset();
    } else {
      this.editId = data.warehouseCode;
      this.warehouseForm.patchValue({
        WarehouseCode: data.warehouseCode,
        WarehouseName: data.warehouseName
      });
    }
    this.showSidebar();
  }

  submitWarehouse() {
    this.submitted = true;
    if (this.warehouseForm.invalid) {
      return;
    }
    const formValue = this.warehouseForm.value;
    const obj: any = { warehouseCode: formValue.WarehouseCode, warehouseName: formValue.WarehouseName };
    this.appComponent.showLoading('Saving Warehouse...');
    const request = this.editId === ''
      ? this.apiservice.createWarehouse(obj)
      : this.apiservice.updateWarehouse({ ...obj, warehouseCode: this.editId });
    request.subscribe((res: any) => {
      this.appComponent.hideLoading();
      if (res.success) {
        this.swal.success_ok('Success', res.message, true);
        this.closeSidebar();
        this.loadWarehouseCache();
      } else {
        this.swal.error('Error', res.message);
      }
    }, (err: any) => {
      this.appComponent.hideLoading();
      this.swal.error('Error', err.message);
    });
  }

  changeWarehouseStatus(item: any) {
    const newStatus = item.Status == 1 ? 0 : 1;
    const action = newStatus == 0 ? 'deactivate' : 'activate';
    Swal.fire({
      title: `Are you sure you want to ${action} this warehouse?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: `Yes, ${action} it!`
    }).then((result) => {
      if (result.isConfirmed) {
        this.appComponent.showLoading('Updating Warehouse...');
        this.apiservice.updateWarehouseStatus({ Status: newStatus }, item.warehouseCode).subscribe((res: any) => {
          this.appComponent.hideLoading();
          if (res.success) {
            this.swal.success_ok('Success', `Warehouse ${newStatus ? 'activated' : 'deactivated'} successfully`, true);
            this.loadWarehouseCache();
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

  // ---------- Structure view: Row panel ----------
  selectWarehouse(warehouse: any) {
    this.selectedWarehouse = warehouse;
    this.selectedRow = null;
    this.positionList = [];
    this.loadRows(warehouse.warehouseCode);
  }

  loadRows(warehouseCode: string) {
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
        this.swal.error('Error', res.message);
      }
    }, (err: any) => {
      this.appComponent.hideLoading();
      this.swal.error('Error', err.message);
    });
  }

  openRowSidebar(data: any) {
    if (!this.selectedWarehouse) {
      return;
    }
    this.sidebarMode = 'row';
    this.submitted = false;
    if (!data) {
      this.editId = '';
      this.rowForm.reset();
    } else {
      this.editId = data.rowCode;
      this.rowForm.patchValue({ RowCode: data.rowCode });
    }
    this.showSidebar();
  }

  submitRow() {
    this.submitted = true;
    if (this.rowForm.invalid) {
      return;
    }
    const obj: any = { warehouseCode: this.selectedWarehouse.warehouseCode, rowCode: this.rowForm.value.RowCode };
    this.appComponent.showLoading('Saving Row...');
    const request = this.editId === ''
      ? this.apiservice.createRow(obj)
      : this.apiservice.updateRow({ ...obj, rowCode: this.editId });
    request.subscribe((res: any) => {
      this.appComponent.hideLoading();
      if (res.success) {
        this.swal.success_ok('Success', res.message, true);
        this.closeSidebar();
        delete this.rowListCache[this.selectedWarehouse.warehouseCode];
        this.loadRows(this.selectedWarehouse.warehouseCode);
      } else {
        this.swal.error('Error', res.message);
      }
    }, (err: any) => {
      this.appComponent.hideLoading();
      this.swal.error('Error', err.message);
    });
  }

  changeRowStatus(item: any) {
    const newStatus = item.Status == 1 ? 0 : 1;
    const action = newStatus == 0 ? 'deactivate' : 'activate';
    Swal.fire({
      title: `Are you sure you want to ${action} this row?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: `Yes, ${action} it!`
    }).then((result) => {
      if (result.isConfirmed) {
        this.appComponent.showLoading('Updating Row...');
        this.apiservice.updateRowStatus({ Status: newStatus }, item.rowCode).subscribe((res: any) => {
          this.appComponent.hideLoading();
          if (res.success) {
            this.swal.success_ok('Success', `Row ${newStatus ? 'activated' : 'deactivated'} successfully`, true);
            delete this.rowListCache[this.selectedWarehouse.warehouseCode];
            this.loadRows(this.selectedWarehouse.warehouseCode);
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

  openPositionSidebar() {
    if (!this.selectedRow) {
      return;
    }
    this.sidebarMode = 'position';
    this.submitted = false;
    this.editId = '';
    this.positionForm.reset();
    this.showSidebar();
  }

  get positionCodePreview(): string {
    if (!this.selectedWarehouse || !this.selectedRow) {
      return '';
    }
    const from = this.positionForm?.value?.PositionFrom;
    if (!from) {
      return '';
    }
    return this.generateLocationCode(this.selectedWarehouse.warehouseCode, this.selectedRow.rowCode, from);
  }

  generateLocationCode(warehouseCode: string, rowCode: string, positionNo: number | string): string {
    const paddedPos = String(positionNo).padStart(3, '0');
    return `${warehouseCode}-${rowCode}-P${paddedPos}`;
  }

  submitPosition() {
    this.submitted = true;
    if (this.positionForm.invalid) {
      return;
    }
    const formValue = this.positionForm.value;
    const obj: any = {
      warehouseCode: this.selectedWarehouse.warehouseCode,
      rowCode: this.selectedRow.rowCode,
      positionFrom: formValue.PositionFrom,
      positionTo: formValue.PositionTo || formValue.PositionFrom
    };
    this.appComponent.showLoading('Saving Position...');
    this.apiservice.createLocation(obj).subscribe((res: any) => {
      this.appComponent.hideLoading();
      if (res.success) {
        this.swal.success_ok('Success', res.message, true);
        this.closeSidebar();
        this.loadPositions(this.selectedRow.rowCode);
      } else {
        this.swal.error('Error', res.message);
      }
    }, (err: any) => {
      this.appComponent.hideLoading();
      this.swal.error('Error', err.message);
    });
  }

  // ---------- Sidebar helpers ----------
  showSidebar() {
    const sidebar = document.querySelector<HTMLElement>('#locationMasterSidebar');
    sidebar?.classList.remove('close');
  }

  closeSidebar() {
    const sidebar = document.querySelector<HTMLElement>('#locationMasterSidebar');
    sidebar?.classList.add('close');
    this.sidebarMode = '';
  }

  get wf(): { [key: string]: AbstractControl } {
    return this.warehouseForm.controls;
  }
  get rf(): { [key: string]: AbstractControl } {
    return this.rowForm.controls;
  }
  get pf(): { [key: string]: AbstractControl } {
    return this.positionForm.controls;
  }
}
