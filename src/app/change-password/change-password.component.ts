import { Component, OnInit, AfterViewInit, inject, TemplateRef, ElementRef, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../service/api.service';
import { SwalService } from '../service/swal.service';
import { AppComponent } from '../app.component';

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.css']
})
export class ChangePasswordComponent implements OnInit, AfterViewInit {

  changepasswordForm: FormGroup;
  oldPasswordIncorrect: boolean = false;
  @ViewChild('submitbtn') passwordBtn!: ElementRef;
  submitted: boolean = false;
  flag: number = 0;
  isExpanded: boolean = false;

  showOldPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  constructor(private apiservice: ApiService, private formbuilder: FormBuilder, private fb: FormBuilder, private swal: SwalService, private appComponent : AppComponent) {

  }

  ngOnInit(): void {

    this.changepasswordForm = this.formbuilder.group({
      oldPassword: ['', Validators.required],
      password: ['',
        [
          Validators.required,
          Validators.pattern(/^(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[a-zA-Z\d!@#$%^&*(),.?":{}|<>]{6,}$/) // Password regex
        ]
      ],
      confirmpassword: ['', Validators.required]
    });

  }

  toggleOldPasswordVisibility() {
    this.showOldPassword = !this.showOldPassword;
  }

  // Toggle visibility for new password
  toggleNewPasswordVisibility() {
    this.showNewPassword = !this.showNewPassword;
  }

  // Toggle visibility for confirm password
  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  @ViewChild('fabGroup') fabGroup: ElementRef;
  @ViewChild('mainBtn') mainBtn: ElementRef;


  ngAfterViewInit() {
    if (this.mainBtn) {
      this.mainBtn.nativeElement.addEventListener('click', () => {
        this.fabGroup.nativeElement.classList.toggle('active');
      });
    }
  }

  clear() {
    this.changepasswordForm.reset()
    this.ngOnInit()
    this.flag = 1
  }

  newpass : any;
  cpass : any;
  passwordCheck() {

    this.newpass = this.changepasswordForm.value.password
    this.cpass = this.changepasswordForm.value.confirmpassword 
    if (this.newpass == this.cpass) {
      this.flag = 1
    }
    else {
      this.flag = 2
    }
  }

  submit() {
    
    this.submitted = true;
    this.changepasswordForm.markAllAsTouched()
    if (this.changepasswordForm.valid) {
      this.changepasswordForm.markAsUntouched();
      if (this.newpass === this.cpass) {
        let userId = JSON.parse(localStorage.getItem('userID'));
        let obj: any = {
          "userId": userId,
          "oldPassword": this.changepasswordForm.value.oldPassword,
          "password": this.changepasswordForm.value.password,
        }
 
        //const formDataWithId = { obj, userId };

        // Call the API with the combined data
        this.appComponent.showLoading('Password getting changed...');
        this.apiservice.changePassword(obj).subscribe(
          (res: any) => {
            // Handle the API response here
            if (res.status == 1) {
              this.appComponent.hideLoading();
              this.swal.success_ok('Success', res.message, true);
              this.changepasswordForm.reset();
            }
            else {
              this.appComponent.hideLoading();
              this.swal.error('Error', res.message);
            } 
          },
          (error: any) => {
            // Handle API error
            this.appComponent.hideLoading(); 
            this.swal.error('Error', error.message);
          }
        );
      } else {
        // Set a flag to indicate that the old password is incorrect
        this.oldPasswordIncorrect = true;
      }
    }
  }

  moveFocus(currentField: any, nextInput: HTMLInputElement | ElementRef) {
    this.changepasswordForm.markAsUntouched()
    const oldpass = this.changepasswordForm.get('oldPassword');
    const newpass = this.changepasswordForm.get('password');
    const cpass = this.changepasswordForm.get('confirmpassword')

    if (currentField == 'oldpassword' && !oldpass.value.trim()) {
      if (!oldpass.value.trim()) {
        oldpass.markAsTouched();
        return;
      }
    } else if (currentField == 'newpassword' && !newpass.value.trim()) {
      if (!newpass.value.trim()) {
        newpass.markAsTouched();
        return;
      }
    }
    else if (currentField == 'confirmpassword' && !cpass.value.trim()) {
      if (!cpass.value.trim()) {
        cpass.markAsTouched();
        return;
      }
    }

    if (nextInput instanceof ElementRef) {
      if (this.flag != 2) {
        nextInput.nativeElement.focus();
      }

    } else {
      nextInput.focus();
    }
  } 
}

