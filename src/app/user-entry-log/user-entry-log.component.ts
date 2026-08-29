import { Component, OnInit, AfterViewInit } from '@angular/core';
import { ApiService } from '../service/api.service';
import { SwalService } from '../service/swal.service';
import { DataService } from '../service/data.service';
import { Options } from 'select2';
import { Select2OptionData } from 'ng-select2';
import { AppComponent } from '../app.component';

@Component({
  selector: 'app-user-entry-log',
  templateUrl: './user-entry-log.component.html',
  styleUrls: ['./user-entry-log.component.css']
})
export class UserEntryLogComponent implements OnInit {
  userEntryList: any = [];
  fromDate: any = new Date().toISOString().split('T')[0];
  toDate: any = new Date().toISOString().split('T')[0];

  public equipmentData: Array<Select2OptionData>;

  craneList: Select2OptionData[] = [];;
  minDate: Date;
  maxDate: Date = new Date();
  equipmentKeyword = 'equipment_name';
  craneKeyword = 'EquipmentName';
  errorKeyword = 'ErrorCode';

  errorCodeData: any = [];
  selected_equipment_type: any = '';
  selected_craneId: any = '';
  selected_errorCode: any = 'All';
  enableCraneId: boolean = true;
  pagination: number = 1;
  searchErrorCode: any = '';
  tableHeader: any = [];
  exportTitle: any = 'UserEntry-Log';
  searchApiCall: any = '';
  isShowExportBtn: boolean = false;

  isShowfield: boolean = false;

  selected_equipment_no: any = '';

  public options: Options = {
    theme: 'classic',
    width: '330',
  }
  flagset: boolean = false;
  typeValue: any = [{ id: 'All', text: 'All' }];
  selectedType: any = 'All';
  lastUpdatedDateTime: any = new Date().toLocaleString();


  constructor(private apiservice: ApiService, private swal: SwalService, private dataService: DataService, private appComponent: AppComponent) {

  }
  ngOnInit(): void {
    this.dataService.getAlarmHistoryData().subscribe((data: any) => {
      if (data == 'open') {
        this.openSidebar();
      }
    });
    // this.searchData('onLoad');
    this.userEntryLogData();
    // this.getErrorList();
    let user_rights: any = localStorage.getItem('WMS-Rights');
    if (user_rights != null) {
      const data = JSON.parse(user_rights);
      const resultss = data.map(key => ({ [key]: true }))
        .reduce((acc, obj) => ({ ...acc, ...obj }), {});
      this.isShowExportBtn = resultss?.history_userentryLog_exports ? true : false;
    }
    this.isShowfield = false;
    this.equipmentData = [];
  }

  userEntryStatus: any;
  
  falseSet() {
    // this.closeModal()
    this.closesidebar()
  }

  selectedItem: any;


  clear() {

  }

  userEntryLogData() {
    this.lastUpdatedDateTime = new Date().toLocaleString();
    this.userEntryList = []; 
    if (!this.fromDate || !this.toDate) {
      this.swal.error('Error', 'Please select both From and To dates.');
      return;  
    }
    this.appComponent.showLoading('Data Loading...');
  
    let obj = {
      fromDate: this.fromDate,
      toDate: this.toDate,
      type: this.selectedType
    };
  
    this.apiservice.getUserEntryLogList(obj).subscribe(
      (res: any) => {
        if (res.status === 1) {
          // this.appComponent.hideLoading();
          this.userEntryList = res.data;
          this.tableHeader = JSON.parse(res.header);
          this.userEntryList.forEach((element: any) => {
            this.typeValue.push({ id: element.Type, text: element.Type });  
          })
          this.appComponent.hideLoading();
        } else {
          this.appComponent.hideLoading();
          this.swal.error('Error', res.message);
        }
      },
      (err: any) => {
        this.appComponent.hideLoading();   
        this.swal.error('Error', err.message);
      }
    ); 
  }

  selectDate(){
    this.minDate = this.fromDate;
  }
  

  selectCraneId(ev: any) {
    // this.selected_craneId = ev.EquipmentNo;
    this.selected_craneId = ev;
    // this.getErrorList();
  }
  selectErrorCode(ev: any) {
    this.selected_errorCode = ev.name;
  }

  selectFieldValue(ev: any) {
    this.selected_equipment_no = ev;
  }
  // renderPage(event: number) {
  //   this.pagination = event;
  //   this.searchData();
  // }
  changeFromTo() {
    // this.getErrorList();
  }
  
  openSidebar() {
    const sidebar = document.querySelector<HTMLElement>('.sidebar');
    this.flagset = true
    sidebar?.classList.toggle('close');
  }

  closeModal() {
    const sidebar = document.querySelector<HTMLElement>('.sidebar');
    this.flagset = false
    sidebar.classList.toggle('close');
  }
  closesidebar() {
    const sidebar = document.querySelector<HTMLElement>('.sidebar');
    this.flagset = false
    sidebar.classList.toggle('close');
  }
}
