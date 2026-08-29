import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrebinningApprovalComponent } from './prebinning-approval.component';

describe('PrebinningApprovalComponent', () => {
  let component: PrebinningApprovalComponent;
  let fixture: ComponentFixture<PrebinningApprovalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PrebinningApprovalComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(PrebinningApprovalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
