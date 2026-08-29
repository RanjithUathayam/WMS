import { Component, OnInit, AfterViewInit, inject, TemplateRef, ElementRef, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SwalService } from '../../service/swal.service';
import { ApiService } from '../../service/api.service';
import { ModalDismissReasons, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AppComponent } from 'src/app/app.component';
// @ViewChild('myModal', { static: false }) modal: ElementRef;

@Component({
  selector: 'app-user-control',
  templateUrl: './user-control.component.html',
  styleUrls: ['./user-control.component.css']
})
export class UserControlComponent implements OnInit {

  @ViewChild('focusGrp') inputElement: ElementRef;

  userGroupList: any = [];
  userManagementList: any = [];
  groupSubmitted: boolean = false;
  userSubmitted: boolean = false;
  groupId: any = '';
  userId: any = '';
  userGroupForm !: FormGroup;
  userForm !: FormGroup;
  selectedUserGroup: any = '';
  displayAccessPopup = "none";
  menuList: any = [];
  accessMode: any = 'insert';
  checkedRights: any = []; myForm: FormGroup;
  oldPasswordIncorrect: boolean = false;
  flagset: boolean = false;
  showPassword: boolean = false;
  setList: boolean = true;
  constructor(private formbuilder: FormBuilder, private modalService: NgbModal,
    private apiservice: ApiService, private router: Router, private swal: SwalService, private fb: FormBuilder, private appComponent: AppComponent) {

  }

  ngOnInit(): void {
    this.checkedRights = [];
    this.groupId = '';
    this.userGroupForm = this.formbuilder.group({
      group_name: ['', Validators.required],
    })
    this.get_Grouplist();

    this.userId = '';
    this.userForm = this.formbuilder.group({
      user_name: ['', Validators.required],
      password: ['',
        [
          Validators.required,
          Validators.pattern(/^(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[a-zA-Z\d!@#$%^&*(),.?":{}|<>]{6,}$/) // Password regex
        ]
      ],
      // email: ['', Validators.required],
      usergroup: ['', Validators.required],
    })
    this.myForm = this.formbuilder.group({
      oldPassword: ['', Validators.required],
      password: ['', Validators.required],
      confirmpassword: ['', Validators.required]
    });

  }


  falseSet() {
    this.flagset = false;

  }

  focusInput() {
    // Focus the input element
    this.inputElement.nativeElement.focus();
  }


  clearForm() {
    this.myForm.reset();
  }

  userIdFilter: string = ''

  get_Grouplist() {
    this.userGroupList = [];
    this.appComponent.showLoading('User Group List Loading')
    this.apiservice.getUserGroupData('master/UserGroup').subscribe((res: any) => {
      if (res.status == 1) {
        this.appComponent.hideLoading()
        this.userGroupList = res.data;
      }
      else {
        this.appComponent.hideLoading()
        this.swal.error('Error', res.message);
      } 
    }, (err: any) => {
      this.appComponent.hideLoading()
      this.swal.error('Error', err.message);
    })
    /*************  ✨ Codeium Command ⭐  *************/
    /**
     * Return the controls of the userGroupForm.
     *
     * @returns an object whose keys are the names of the controls in the form and whose values are the controls themselves.
     *          The object has the same type as the controls object returned by the form group.
     */
    /******  11e082d7-cfe8-4442-a257-9c308d0d9ab7  *******/
  }

  get f(): { [key: string]: AbstractControl } {
    return this.userGroupForm.controls;
  }



  get_Userlist() {
    this.linectrl = 0;
    this.userManagementList = [];
    this.userGroupForm.reset()
    this.groupId = ''
    this.appComponent.showLoading('User Management List Loading')
    this.apiservice.getUserManagementData('master/UserManagement').subscribe((res: any) => {
      if (res.status == 1) {
        this.appComponent.hideLoading()
        this.userManagementList = res.data;
      }
      else {
        this.appComponent.hideLoading()
        this.swal.error('Error', res.message);
      }
 
    }, (err: any) => {
      this.appComponent.hideLoading()
      this.swal.error('Error', err.message);
    })
  }
  get u(): { [key: string]: AbstractControl } {
    return this.userForm.controls;
  }

  linectrl: any = 1;
  get_usergrp() {
    this.linectrl = 1;
    this.userForm.reset()
    this.userId = ''
  }

  submitGroup() {
    this.groupSubmitted = true;
    if (this.userGroupForm.valid) {
      if (this.groupId == '') {
        let obj: any = {
          "groupname": this.userGroupForm.value.group_name
        }
        this.appComponent.showLoading('User Group Saving...')
        this.apiservice.addUserGroup(obj).pipe(
          catchError((error: any) => {
            // Handle API call errors here
            this.swal.error(error.message, '');
            return throwError(error); // Rethrow the error to propagate it further
          })
        ).subscribe((res: any) => {
          if (res.status == 1) {
            this.appComponent.hideLoading()
            this.swal.success_ok('Success', res.message, true);
            this.groupSubmitted = false;
            this.userGroupForm.reset();
            this.userForm.reset();
            this.groupId = '';
            this.get_Grouplist();
          } else {
            this.appComponent.hideLoading()
            this.swal.error(res.message, '');
          }
        }, (err: any) => {
          this.appComponent.hideLoading()
          this.swal.error('Error', err.message);
        });
      } else {
        let obj: any = {
          "id": this.groupId,
          "groupname": this.userGroupForm.value.group_name
        }
        this.appComponent.showLoading('User Group Saving...')
        this.apiservice.updateUserGroup(obj).pipe(
          catchError((error: any) => {
            // Handle API call errors here
            this.swal.error(error.message, '');
            return throwError(error); // Rethrow the error to propagate it further
          })
        ).subscribe((res: any) => {
          if (res.status == 1) {
            this.appComponent.hideLoading()
            this.swal.success_ok('Success', res.message, true);
            this.groupSubmitted = false;
            this.userGroupForm.reset();
            this.groupId = '';
            this.get_Grouplist();
          } else {
            this.appComponent.hideLoading()
            this.swal.error(res.message, '');
          }
        }, (err: any) => {
          this.appComponent.hideLoading()
          this.swal.error('Error', err.message);
        });
      }
    } else {
      return;
    }
  }
  openEditGrp(data: any) {
    if (data.Status == 1) {
      this.groupId = data.Id;
      this.userGroupForm.controls['group_name'].setValue(data.groupname);
    } else {
      this.swal.error('Error', 'Selected User Group is Inactivated');
    }
  }



  submitUser() {
    this.userSubmitted = true;
    if (this.userForm.valid) {
      if (this.userId == '') {
        let obj: any = {
          "UserName": this.userForm.value.user_name,
          "Pwd": this.userForm.value.password,
          // "Mail": this.userForm.value.email,
          "UserGroup": this.userForm.value.usergroup,
          // "UserGroupID": this.groupId
        }
        this.appComponent.showLoading('User Saving...')
        this.apiservice.addUser(obj).pipe(
          catchError((error: any) => {
            // Handle API call errors here
            this.swal.error('Error', error.message);
            return throwError(error); // Rethrow the error to propagate it further
          })
        ).subscribe((res: any) => {
          if (res.status == 1) {
            this.appComponent.hideLoading()
            this.swal.success_ok('Success', res.message, true);
            this.userSubmitted = false;
            this.userForm.reset();
            this.userId = '';
            this.get_Userlist();
          } else {
            this.appComponent.hideLoading()
            this.swal.error('Error', res.message);
          }
        }, (err: any) => {
          this.appComponent.hideLoading()
          this.swal.error('Error', err.message);
        });
      } else {
        let obj: any = {
          "id": this.userId,
          "UserName": this.userForm.value.user_name,
          "Pwd": this.userForm.value.password,
          // "Mail": this.userForm.value.email,
          "UserGroup": this.userForm.value.usergroup,
          //"UserGroupID": this.groupId
        }
        this.appComponent.showLoading('User Saving...')
        this.apiservice.updateUser(obj).pipe(
          catchError((error: any) => {
            // Handle API call errors here
            this.swal.error('Error', error.message);
            return throwError(error); // Rethrow the error to propagate it further
          })
        ).subscribe((res: any) => {
          if (res.status == 1) {
            this.appComponent.hideLoading()
            this.swal.success_ok('Success', res.message, true);
            this.userSubmitted = false;
            this.userForm.reset();
            this.userId = '';
            this.get_Userlist();
          } else {
            this.appComponent.hideLoading()
            this.swal.error('Error', res.message);
          }
        }, (err: any) => {
          this.appComponent.hideLoading()
          this.swal.error('Error', err.message);
        });
      }
    } else {
      return;
    }
  }
  openUserEdit(data: any) {
    this.userId = data.id;
    this.userForm.controls['user_name'].setValue(data.UserName);
    this.userForm.controls['password'].setValue(data.Pwd);
    // this.userForm.controls['email'].setValue(data.Mail);
    this.userForm.controls['usergroup'].setValue(data.UserGroup);
  }
  clearGroup() {
    this.groupId = '';
    this.userGroupForm.reset();
    this.groupSubmitted = false;
  }
  clearuser() {
    this.userId = '';
    this.userForm.reset();
    this.userSubmitted = false;
  }

  inactiveUserManagement() {
    this.swal.error('Error', 'Selected User Management is Inactive');
  }

  activeInactiveGroup(id: any, status: any) {

    let msg = '';
    let confirm = '';
    let newStatus: number;

    if (status == 1) {
      msg = 'Are you sure you want to Deactivate it?';
      confirm = 'Yes, Deactivate it!';
      // newStatus = 0; // Deactivate
    } else {
      msg = 'Are you sure you want to Activate it?';
      confirm = 'Yes, Activate it!';
      // newStatus = 1; // Activate
    }

    Swal.fire({
      title: msg,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: confirm
    }).then((result) => {
      if (result.isConfirmed) {
        let obj: any = {
          id: id,
          isDelete: status // Update status
        };
        // this.appCompone-p0nt.
        this.appComponent.showLoading('Updating...')
        this.apiservice.userGrpStatusUpdate(obj).subscribe((res: any) => {
          if (res.status == 1) {
            this.appComponent.hideLoading();
            let successMsg = status ? 'Deactivated' : 'Activated';
            this.swal.success_ok('Success', `Item ${successMsg} successfully`, true);
            this.get_Grouplist();
          } else {
            this.appComponent.hideLoading();
            this.swal.error('Error', res.message);
          }
        }, (err => {
          this.appComponent.hideLoading();
          this.swal.error('Error', err.message);
        }));
      }
      else {
        const checkbox = document.getElementById('cbx' + id) as HTMLInputElement;
        checkbox.checked = !checkbox.checked;
      }
    });
  }
  activeInactiveUser(id: any, status: any) {
    let msg = '';
    let confirm = '';
    let newStatus: number;

    if (status == 1) {
      msg = 'Are you sure you want to Deactivate it?';
      confirm = 'Yes, Deactivate it!';
      // newStatus = 0; // Deactivate
    } else {
      msg = 'Are you sure you want to Activate it?';
      confirm = 'Yes, Activate it!';
      // newStatus = 1; // Activate
    }

    Swal.fire({
      title: msg,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: confirm
    }).then((result) => {
      if (result.isConfirmed) {
        let obj: any = {
          Id: id,
          IsDelete: status // Update status
        };
        this.appComponent.showLoading('Updating...');
        this.apiservice.userStatusUpdate(obj).subscribe((res: any) => {
          if (res.status == 1) {
            this.appComponent.hideLoading();
            let successMsg = status ? 'Deactivated' : 'Activated';
            this.swal.success_ok('Success', res.message, true);
            this.get_Userlist();
          } else {
            this.appComponent.hideLoading();
            this.swal.error('Error', res.message);
          }
        }, (err => {
          this.appComponent.hideLoading();
          this.swal.error('Error', err.message);
        }));
      }
      else {
        const checkbox = document.getElementById('cbx' + id) as HTMLInputElement;
        checkbox.checked = !checkbox.checked;
      }
    });
  }
  selectGroup(ev: any) { 
  }

  showAccessModal(data: any) {


    if (data.Status == 1) {
      //if (data.rights != null) 
      {

        this.groupId = data.Id; 
        this.menuList = [];


        this.appComponent.showLoading('Loading...')
        this.apiservice.getRights(this.groupId).subscribe((res: any) => {
          if (res.status == 1) {
            this.appComponent.hideLoading();
            if (res.data != undefined) {
              this.flagset = true;
              this.accessMode = 'update';
              let rightsList = [];
              let groupRights = JSON.parse(res.rights);

              // Grouping by module
              const groupedData = res.data.reduce((acc, currentItem) => {
                const { module, ...rest } = currentItem;
                if (!acc[module]) {
                  acc[module] = { module, sub_module: [] };
                }
                if(groupRights)
                {
                  let chkList =   groupRights.filter(itm => itm == rest.pattern + '_list');
                  let chkCreate = groupRights.filter(itm => itm == rest.pattern + '_creates');
                  let chkDelete = groupRights.filter(itm => itm == rest.pattern + '_deletes');
                  let chkModify = groupRights.filter(itm => itm == rest.pattern + '_modifies');
                  let chkExport = groupRights.filter(itm => itm == rest.pattern + '_exports');
                  rest.list_checked = chkList.length > 0 ? true && this.checkedRights.push(chkList[0]) : false;
                  rest.create_checked = chkCreate.length > 0 ? true && this.checkedRights.push(chkCreate[0]) : false;
                  rest.modify_checked = chkModify.length > 0 ? true && this.checkedRights.push(chkModify[0]) : false;
                  rest.export_checked = chkExport.length > 0 ? true && this.checkedRights.push(chkExport[0]) : false;
                  rest.delete_checked = chkDelete.length > 0 ? true && this.checkedRights.push(chkDelete[0]) : false;
                }
                else
                {
                  let chkList = []
                  let chkCreate = []
                  let chkDelete = []
                  let chkModify = [];
                  let chkExport = []
                  rest.list_checked = chkList.length > 0 ? true && this.checkedRights.push(chkList[0]) : false;
                  rest.create_checked = chkCreate.length > 0 ? true && this.checkedRights.push(chkCreate[0]) : false;
                  rest.modify_checked = chkModify.length > 0 ? true && this.checkedRights.push(chkModify[0]) : false;
                  rest.export_checked = chkExport.length > 0 ? true && this.checkedRights.push(chkExport[0]) : false;
                  rest.delete_checked = chkDelete.length > 0 ? true && this.checkedRights.push(chkDelete[0]) : false;
                  // rest.list_checked =   false;
                  // rest.create_checked = false;
                  // rest.modify_checked = false;
                  // rest.export_checked = false;
                  // rest.delete_checked = false;
                } 
                // let chkList = groupRights.filter(itm => itm == rest.pattern + '_list');
                // let chkCreate = groupRights.filter(itm => itm == rest.pattern + '_creates');
                // let chkDelete = groupRights.filter(itm => itm == rest.pattern + '_deletes');
                // let chkModify = groupRights.filter(itm => itm == rest.pattern + '_modifies');
                // let chkExport = groupRights.filter(itm => itm == rest.pattern + '_exports');
                // rest.list_checked = chkList.length > 0 ? true && this.checkedRights.push(chkList[0]) : false;
                // rest.create_checked = chkCreate.length > 0 ? true && this.checkedRights.push(chkCreate[0]) : false;
                // rest.modify_checked = chkModify.length > 0 ? true && this.checkedRights.push(chkModify[0]) : false;
                // rest.export_checked = chkExport.length > 0 ? true && this.checkedRights.push(chkExport[0]) : false;
                // rest.delete_checked = chkDelete.length > 0 ? true && this.checkedRights.push(chkDelete[0]) : false;

                const findIndexs = rightsList.findIndex(row => row.module === module);
                if (findIndexs >= 0) {
                  rightsList[findIndexs].sub_module.push(rest);
                }
                else {
                  rightsList.push({ module: module, sub_module: [{ ...rest }] })
                }
                return acc;
              }, {});
 
              this.menuList = rightsList;

              // this.menuList.forEach((element: any) => {
              //   if (element.reportList.length > 0) {
              //     element.reportList = element.reportList ? JSON.parse(element.reportList) : [];
              //   }
              // });
              this.displayAccessPopup = "block";
              // const modal = document.getElementById('myModal');
              // modal.style.display = 'block';
            }
          } else {
            this.appComponent.hideLoading();
            this.swal.error('Error', res.message);
          }
        }, (err: any) => {
          this.appComponent.hideLoading()
          this.swal.error('Error', err.message);
        })
      } 
      // else 
      // {
      //   const rights = JSON.parse(data.rights);
      // }
    } else {
      this.swal.error('Error', 'Selected User Group is Inactive');
    }

  }
  submitAccess() {
    let obj: any = {
      id: this.groupId,
      rights: JSON.stringify(this.checkedRights)
    };
    this.appComponent.showLoading('Submitting...') 
    this.apiservice.userGrpStatusUpdate(obj).subscribe((res: any) => {
      if (res.status == 1) {
        this.appComponent.hideLoading();
        this.swal.success_ok('Success', res.message, true);
        this.displayAccessPopup = "none";
        this.groupId = '';
        this.checkedRights = [];
      } else {
        this.appComponent.hideLoading();
        this.swal.error('Error', res.message);
      }
    }, (err => {
      this.appComponent.hideLoading();
      this.swal.error('Error', err.message);
    }));
  }
  closePopup() {
    this.displayAccessPopup = "none";
    this.groupId = '';
  }
  checkMenu(ev: any, usergrp: any, user: any) {
    if (ev.target.checked == true) {
      user.checked = true;
      usergrp.checked = true;
    } else {
      user.checked = false;
    }
    usergrp.reportList.forEach((element: any) => {
      if (element.checked == false) {
        usergrp.checked = false;
      }
    });
  }
  close() {
    this.displayAccessPopup = "none";
    this.checkedRights = [];
    this.flagset = false
  }

  clearRights() {
    const checkboxes = document.querySelectorAll('[id^="checkbox"]');
    checkboxes.forEach((checkbox: HTMLInputElement) => {
      checkbox.checked = false;
    });
    this.checkedRights = []
  }

  selectRights(ev: any, pattern: any) {
    if (ev.target.checked == true) { 
      this.checkedRights.push(pattern);
    }
    else {
      this.checkedRights = this.checkedRights.filter(item => item !== pattern);
    }
  }


  isChecked: boolean = false

  markAllCheck(event: Event, module: any) {
    this.isChecked = (event.target as HTMLInputElement).checked;  
 

    module.sub_module.forEach((subModule: any) => {  
      this.checkedRights.push(module.module + '_module')
      subModule.list_checked = this.isChecked;
      subModule.export_checked = this.isChecked;
      subModule.create_checked = this.isChecked;
      subModule.modify_checked = this.isChecked;
      subModule.delete_checked = this.isChecked;
      if (this.isChecked) { 
        this.checkedRights.push(subModule.pattern + '_list')
        this.checkedRights.push(subModule.pattern + '_exports')
        this.checkedRights.push(subModule.pattern + '_creates')
        this.checkedRights.push(subModule.pattern + '_modifies')
        this.checkedRights.push(subModule.pattern + '_deletes')
      }
      else {
        this.checkedRights = this.checkedRights.filter(item => item !== subModule.pattern + '_list');
        this.checkedRights = this.checkedRights.filter(item => item !== subModule.pattern + '_exports');
        this.checkedRights = this.checkedRights.filter(item => item !== subModule.pattern + '_creates');
        this.checkedRights = this.checkedRights.filter(item => item !== subModule.pattern + '_modifies');
        this.checkedRights = this.checkedRights.filter(item => item !== subModule.pattern + '_deletes');
      }
    });
  }
}
