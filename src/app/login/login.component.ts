import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { SwalService } from '../service/swal.service';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms'; 
import { AppComponent } from '../app.component';
import { environment } from 'src/environments/environment';
@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})


export class LoginComponent implements OnInit {

  model: any = {};
  @ViewChild('loginbtn') loginBtn!: ElementRef;
  loginForm: FormGroup; 
  submitted: boolean = false;  
  showPassword: boolean = false; 
  appVesrion: any = 0

  constructor(private router: Router, private authService: AuthService, private swal: SwalService, private formBuilder: FormBuilder, private elementRef : ElementRef, private appComponent : AppComponent) { }

  ngOnInit(): void {
    this.loginForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });    
    if(this.formset == 0)
    {
      this.set()  
      this.formset = 0
    }

    this.appVesrion = environment.appVesrion
  }

  get f() { 
    return this.loginForm.controls; 
  }

formset : number = 0
clearForm()
{
  this.loginForm.reset() 
  this.formset = 1
  this.ngOnInit()
}

set()
{
  const usernameControl = this.loginForm.get('username');
  const passwordControl = this.loginForm.get('password'); 
   

  this.submitted = true;
  if(!usernameControl)
  {
    usernameControl?.markAsTouched(); // Mark the field as touched to trigger validation message
    this.submitted = false
    return; 
    
  }
  if(!passwordControl)
    {
      passwordControl?.markAsTouched(); // Mark the field as touched to trigger validation message
      this.submitted = false
    return; 
    }
    
}



// Function to handle long-press start
startLongPress() {
  this.showPassword = true;
}

// Function to handle long-press end
endLongPress() {
  this.showPassword = false;
}

getCurrentDateTime(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = this.pad(now.getMonth() + 1); // Months are zero-based
  const day = this.pad(now.getDate());
  const hours = this.pad(now.getHours());
  const minutes = this.pad(now.getMinutes());
  const seconds = this.pad(now.getSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

pad(number: number): string {
  return number < 10 ? '0' + number : number.toString();
}

  login() {    
   
    const usernameValue = this.loginForm.get('username')?.value;
    const passwordValue = this.loginForm.get('password')?.value;
    this.loginForm.markAllAsTouched();

     if (this.loginForm.invalid) { 
      return;
    } 

    this.appComponent.showLoading('Getting Logged In')
    this.authService.login(usernameValue, passwordValue).subscribe(
      
      (res) => {
        this.appComponent.hideLoading()
        if (res.status === 1) 
        {
            localStorage.setItem('Token', res.token);
            if (res.rights != '' && res.rights != null && res.rights != undefined) 
            {
                this.authService.sendUserName(res.data.UserName)
                localStorage.setItem('WMS-Rights', JSON.stringify(JSON.parse(res.rights))); 
            }

            let currentTab: any = {
                'menu': 'mainpage',
                'submenu': 'home'
            }

            localStorage.setItem('WMS-ActivePage', JSON.stringify(currentTab));
            localStorage.setItem('passwordResponse', JSON.stringify(res));
            localStorage.setItem('userID', res.data['id']);
            localStorage.setItem('UserName', res.data['UserName']); 
           
            localStorage.setItem('UserGroup', res.data['UserGroup']);
            localStorage.setItem('UserRights', res['rights']);
            localStorage.setItem('session_id', JSON.stringify(res['sessionData']));
            this.router.navigate(['mainpage/home']);

        } 
        else 
        {
          this.appComponent.hideLoading()
          this.swal.error('Error', res.message);  
        }
      },
      (error) => {
        this.appComponent.hideLoading() 
        this.swal.error('Error', error.message);
       
      }
    );
  }

moveFocus(currentField:any,nextInput: HTMLInputElement | ElementRef) {

  this.loginForm.markAsUntouched();
 
  const usernameInput = this.loginForm.get('username');
  const passwordInput = this.loginForm.get('password');   

  if (currentField == 'username' && !usernameInput.value.trim() ) { 
    if (!usernameInput.value.trim()) 
    { 
      usernameInput.markAsTouched(); 
    } 
    if (passwordInput?.touched) {
      // passwordInput.markAsUntouched(); 
    }
    return;
  }else if (currentField == 'password' && !passwordInput.value.trim() ) { 
    if (!passwordInput.value.trim())
    { 
      passwordInput.markAsTouched(); 
    }
    if (usernameInput?.touched) {
      // usernameInput.markAsUntouched();
      usernameInput.setErrors(null)
    } 
    return;
  }

  if (nextInput instanceof ElementRef) {
    nextInput.nativeElement.focus(); 
  } else {
    nextInput.focus();  
  }
}

}
