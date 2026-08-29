import { ChangeDetectorRef, Component, ElementRef, OnInit, Renderer2, Type } from '@angular/core';
import Swal from 'sweetalert2';
import { ApiService } from '../service/api.service';
import { SwalService } from '../service/swal.service';
import { Options } from 'select2';
import { AppComponent } from '../app.component';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-prebinning-summary',
  templateUrl: './prebinning-summary.component.html',
  styleUrls: ['./prebinning-summary.component.css']
})
export class PrebinningSummaryComponent {
  p: number = 1; 
  itemsPerPage: any = 15;
  fromDate: any = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  toDate: any = new Date().toISOString().split('T')[0];   
  minDate: Date;
  maxDate: Date = new Date(); 
  flagset: boolean = false;
  exportTitle: any = "Pre-Binning Summary";
  isShowExportBtn: boolean = false;

  tableHeader: any[] = [];
  
  tableData: any = []
  filterForm!: FormGroup; 
  scannedStatus: any[] = ['All', 'G', 'C', 'E'];

  public options: Options = {
      theme: 'classic',
      placeholder: "Select an option",
  }

  constructor(private apiservice: ApiService, private swal: SwalService, private cdr: ChangeDetectorRef,private appComponent: AppComponent, private fb: FormBuilder) {}
    ngOnInit(): void { 
        
        this.filterForm = this.fb.group({
            fromDate: [new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]], 
            toDate: [new Date().toISOString().split('T')[0]],
            scanStatus: ['All'], 
        });  
         
        this.getTableData(); 
        let user_rights: any = localStorage.getItem('WMS-Rights');
        if (user_rights != null) {
            const data = JSON.parse(user_rights);
            const resultss = data.map(key => ({ [key]: true }))
                .reduce((acc, obj) => ({ ...acc, ...obj }), {});
            this.isShowExportBtn = resultss?.equipment_loadStationBuffer_exports ? true : false;
        }
    } 

    getTableData()
    { 
        this.appComponent.showLoading('Data Loading !!!')
        let obj = {
            fromDate: this.filterForm.value.fromDate,
            toDate: this.filterForm.value.toDate 
        }
        this.apiservice.getPreBinningSummary(obj, '').subscribe((res: any)=>{
            if(res.status)
            {
            this.tableData = res.data;
            this.tableHeader = JSON.parse(res.header)
            this.appComponent.hideLoading()
            }
            else{
            this.appComponent.hideLoading()
            }
        }, (error: any)=>{
        this.appComponent.hideLoading()
        })
    }

  selectType(event: any) {
    
  }

  openSidebar() {
    const sidebar = document.querySelector<HTMLElement>('.sidebar_Request');
    this.flagset = true
    sidebar?.classList.toggle('close');
  } 

  export(type: any)
  { 
  }
 
  // Filter Code
  searchData(){ 
    this.appComponent.showLoading('Data Loading !!!')
      let obj = {
        fromDate: this.filterForm.value.fromDate,
        toDate: this.filterForm.value.toDate 
    }
    this.apiservice.getPreBinningSummary(obj, '').subscribe((res: any)=>{
        if(res.status)
        {
          this.tableData = res.data;
          this.tableHeader = JSON.parse(res.header)
          this.appComponent.hideLoading()
        }
        else
        {
          this.appComponent.hideLoading()
        }
    }, (err)=>{
      this.appComponent.hideLoading()
    })
  }

  clear(){

    this.filterForm.reset();
  }  
closesidebar() {
  const sidebar = document.querySelector<HTMLElement>('.sidebar');
  this.flagset = false
  sidebar.classList.toggle('close');
} 

falseSet()
{
  this.closesidebar()
}
}
