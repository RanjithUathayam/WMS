import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class SwalService {

  constructor() { }

  success_timer(title: string,) {
    Swal.fire({
      icon: "success",
      title: title,
      showConfirmButton: false,
      timer: 1000
    });
  }
  success_ok(title: string, text: string, showConfirmButton: boolean) {
    Swal.fire({
      title: title,
      text: text,
      icon: "success",
      showConfirmButton: showConfirmButton
    });
  }

  error(title: string, text: string) {
    Swal.fire({
      icon: "error",
      title: title,
      text: text,
    });
  }

  confirm_dialogue(title: string, text: string, confirmButtonText: any) {
    Swal.fire({
      title: title,
      text: text,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: confirmButtonText
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: "Deleted!",
          text: "Your file has been deleted.",
          icon: "success"
        });
      }
    });
  }

  warning(title: string, text: string) {

  }

  dialogue_3buttons(title: string, button1: any, button2: any, button3: any) {
    Swal.fire({
      title: title,
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: button1,
      denyButtonText: button2
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire("Saved!", "", "success");
      } else if (result.isDenied) {
        Swal.fire("Changes are not saved", "", "info");
      }
    });
  }
}
