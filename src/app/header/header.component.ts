import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
setInterval(myTimer, 1000);

function myTimer() {
  const d = new Date();
  // document.getElementById("clock").innerHTML = d.toLocaleTimeString();
  // document.getElementById("date").innerHTML = d.toDateString();
}