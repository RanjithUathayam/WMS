import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  

  //private apiUrl = 'http://172.16.8.154:3300/api';
  baseURL = environment.baseURL; 
  private readonly authKey = 'isLoggedIn';

  constructor(private http: HttpClient) { }

  login(username: string, password: string): Observable<any> {
    const loginUrl = `${this.baseURL}login`;
    const credentials = {
      username: username,
      password: password,
    };

    return this.http.post(loginUrl, credentials);
  }

  username : string = ''
  sendUserName(uname : string)
  { 
    sessionStorage.setItem(this.authKey, 'true');
    this.username = uname
  }

  setUserName()
  {
    return this.username
  }

  isAuthenticated(): boolean {
    return sessionStorage.getItem(this.authKey) === 'true';
  }

  clearSessionLogout() {
    sessionStorage.removeItem(this.authKey);
  }

}
