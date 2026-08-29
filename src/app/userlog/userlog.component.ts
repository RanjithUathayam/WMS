import { Component, OnInit } from '@angular/core';
import { ApiService } from '../service/api.service';
import { DataService } from '../service/data.service';
import { SwalService } from '../service/swal.service';
import { AppComponent } from '../app.component';

@Component({
  selector: 'app-userlog',
  templateUrl: './userlog.component.html',
  styleUrls: ['./userlog.component.css']
})
export class UserlogComponent implements OnInit {

  logList: any = [];
  fromDate: any = new Date().toISOString().split('T')[0];
  toDate: any = new Date().toISOString().split('T')[0];
  tableHeader: any = [];
  exportTitle: any = 'User-Log';
  searchApiCall: any = '';
  isShowExportBtn: boolean = false;
  flagset : boolean = false;
  maxDate: Date = new Date();
  lastUpdatedDateTime: any = new Date().toLocaleString();
  minDate: Date;
  constructor(private apiservice: ApiService,private dataService: DataService, private swal: SwalService, private appComponent : AppComponent) {

  }
  ngOnInit(): void {
    this.dataService.getUserlogData().subscribe((data: any) => {
      if (data == 'open') {
        this.openSidebar();
      }
    });
    this.searchData();
    let user_rights: any = localStorage.getItem('WMS-Rights');
    if (user_rights != null) {
      const data = JSON.parse(user_rights);
      const resultss = data.map(key => ({ [key]: true }))
        .reduce((acc, obj) => ({ ...acc, ...obj }), {});
      this.isShowExportBtn = resultss?.history_userlog_exports ? true : false;
    }
    this.closesidebar()
  }


  userLogApiData: any;

  searchData() {
    this.logList = [];
    this.lastUpdatedDateTime = new Date().toLocaleString();
    this.tableHeader = [];
    let obj = {
      fromDate: this.fromDate,
      toDate: this.toDate
    }
    this.userLogApiData = obj;
    // this.searchApiCall = 'history/userLog?fromDate=' + this.fromDate + '&toDate=' + this.toDate;
    this.searchApiCall = 'history/userLog';
    this.minDate = this.fromDate;
    this.appComponent.showLoading("Data Loading...");
    this.apiservice.getAlarmHistoryData(this.searchApiCall, obj).subscribe((res: any) => {
      if (res.status == 1) {
        this.logList = res.data;
        this.tableHeader = JSON.parse(res.header);
        let currentPage = 1;
        let start: any = (currentPage * 10) - 9;
        if (this.logList) {
          this.logList.forEach((element: any) => {
            element.sno = start;
            start++;
          })
        }
        
        this.appComponent.hideLoading();
      }
      else if (res.status == 0) {
        this.appComponent.hideLoading();
        this.swal.error('Error', res.message);
      }
    }, (err: any) => {
      this.appComponent.hideLoading()
      this.swal.error('Error', err.message);
    })
    this.closesidebar() 
  }

  selectDate(){
    this.minDate = this.fromDate;
  }

  clear() {
    this.fromDate = new Date().toISOString().split('T')[0];
    this.toDate = new Date().toISOString().split('T')[0];
  }
  openSidebar() {
    const sidebar = document.querySelector<HTMLElement>('.sidebar');
    this.flagset = true
    sidebar?.classList.toggle('close');
  }

  closeModal() {
    const sidebar = document.querySelector<HTMLElement>('.sidebar');
    sidebar.classList.toggle('close');
  }
  closesidebar() {
    const sidebar = document.querySelector<HTMLElement>('.sidebar');
    this.flagset = false
    sidebar.classList.toggle('close');
  }
  falseSet(){
    this.closesidebar()
  }
}
