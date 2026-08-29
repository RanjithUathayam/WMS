import { Component, Input } from '@angular/core';
import { NgbModal, NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-export-modal',
  templateUrl: './export-modal.component.html',
  styleUrls: ['./export-modal.component.css']
})
export class ExportModalComponent {

  @Input() title: string;
  selectedFileType: any = '';

  constructor(public activeModal: NgbActiveModal, private modalService: NgbModal) {

  }
  close() {
    this.activeModal.close(this.selectedFileType); // Close the modal with a result
  }


}
