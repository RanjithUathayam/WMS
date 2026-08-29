import { Component, OnInit } from '@angular/core';
import { ApiService } from '../service/api.service';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { AppComponent } from '../app.component';
import { SwalService } from '../service/swal.service';

@Component({
  selector: 'app-inventory-list',
  templateUrl: './inventory-list.component.html',
  styleUrls: ['./inventory-list.component.css']
})
export class InventoryListComponent implements OnInit {

  tableData: any = [];
  exportTitle: string = 'Inventory-List';
  listType = [{ type: 'Inventory' }];
  typeKeyword = 'type';
  selected_type: string = 'Inventory';  
  tableHeader: any = [];
  currentRoute: string;
  searchApiCall: any = '';
  isShowExportBtn: boolean = false;
  lastUpdatedDateTime: any = new Date().toLocaleString();
  TotalRecords: any = 0;

  constructor(private apiservice: ApiService, private activatedRoute: ActivatedRoute, 
    private router: Router, private appComponent: AppComponent, private swal: SwalService) { 
      activatedRoute.params.subscribe(params => {
        this.selected_type = params['id'];
        this.searchData()
      })
    }

  ngOnInit(): void {
    let user_rights: any = localStorage.getItem('WMS-Rights');
    if (user_rights != null) {
      const data = JSON.parse(user_rights);
      const resultss = data.map(key => ({ [key]: true }))
        .reduce((acc, obj) => ({ ...acc, ...obj }), {});
      this.isShowExportBtn = resultss?.inventory_item_exports ? true : false;
    }
  }

//   searchData(): void {
//     //this.appComponent.showLoading("Loading Inventory Page")
//     this.lastUpdatedDateTime = new Date().toLocaleString();
//     this.tableHeader = [];
//     this.tableData = [];
//     let obj =
//     {
//       type: this.selected_type,
//       itemCode: '',
//       itemname: '',
//       itemgroup: '',
//       craneid: '',
//       binid: ''
//     } 
//     this.searchApiCall = `transaction/inventory`;
//     this.appComponent.showLoading('Inventory Data Loading...'); 
//     this.apiservice.getInventoryData(this.searchApiCall, obj).subscribe((res: any) => {
//       if (res.status == 1) {
       
//         this.tableHeader = JSON.parse(res.header);
//         this.tableData = res.data.map((element: any, index: number) => {
//           return { ...element, sno: index + 1 };
//         });
//         setTimeout(()=>{
//           this.appComponent.hideLoading();
//         },500)
       
//       }
//       else if (res.status == 0) {
//         this.appComponent.hideLoading();
//         this.swal.error('Error', res.message);
//       }
//     }, (err: any) => {
//       this.appComponent.hideLoading()
//       this.swal.error('Error', err.message);
//     });

//     //this.appComponent.hideLoading()
//   }

    searchData(): void {
        this.lastUpdatedDateTime = new Date().toLocaleString();
        this.tableHeader = [];
        this.tableData = [];
    
        let obj = {
            type: this.selected_type,
            itemCode: '',
            itemname: '',
            itemgroup: '',
            craneid: '',
            binid: ''
        };
        
        this.searchApiCall = `transaction/inventory`;
        this.appComponent.showLoading('Inventory Data Loading...');
    
        this.apiservice.getInventoryData(this.searchApiCall, obj).subscribe(
            (res: any) => {
                if (res.status == 1) {
                this.tableHeader = JSON.parse(res.header);
                this.TotalRecords = res.totalRecord;        
                this.tableData = res.data.map((element: any, index: number) => {
                    const loc = element.LocationID || '';
                    let formattedLocation = loc;
        
                    // Format LocationID: 01-001-01-01
                    if (loc.length === 9) {
                    formattedLocation = `${loc.substring(0, 2)}-${loc.substring(2, 5)}-${loc.substring(5, 7)}-${loc.substring(7, 9)}`;
                    }
        
                    return {
                    ...element,
                    sno: index + 1,
                    LocationID: formattedLocation // Override original with formatted
                    };
                });
        
                setTimeout(() => {
                    this.appComponent.hideLoading();
                }, 500);
                } else if (res.status == 0) {
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

    selectType(ev: any): void {
        this.selected_type = ev.type;
        this.searchData();
    }
}
