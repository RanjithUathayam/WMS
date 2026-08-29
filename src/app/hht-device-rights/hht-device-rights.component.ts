import { Component, OnInit } from '@angular/core';
import { ApiService } from '../service/api.service';
import { SwalService } from '../service/swal.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-hht-device-rights',
  templateUrl: './hht-device-rights.component.html',
  styleUrls: ['./hht-device-rights.component.css']
})
export class HhtDeviceRightsComponent implements OnInit {

  constructor(private apiService: ApiService, private swalService: SwalService) { }
  deviceData: any[] = [];

  ngOnInit() {
    this.getDeviceData();
  }

  getDeviceData()
  {
    this.apiService.getDeviceList().subscribe((res: any) => {
      if(res.status === 1) {
        this.deviceData = res.data;
      }
      else {
        this.swalService.error('Error', res.message);
      }
    });
 
  }

  toggleRights(item: any) {
    Swal.fire({
      title: 'Are you sure?',
      text: "Do you want to change the rights for this device?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, change it!',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        item.Rights = !item.Rights;
        const obj = {
          deviceRefID: item.deviceRefID,
          deviceId: item.deviceId,
          Rights: item.Rights,
          currentUser: localStorage.getItem('UserName')
        };
  
        this.apiService.updateDeviceRights(obj).subscribe((res: any) => {
          if (res.status === 1) {
            Swal.fire('Success', res.message, 'success');
          } else if(res.status == 0) {  
            this.swalService.error('Error', res.message); 
            item.Rights = !item.Rights;
          }
        }); 
      } else { 
        this.getDeviceData();
      }
    });
  }
  
}
