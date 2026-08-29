import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BinwisePrebininningActionComponent } from './binwise-prebininning-action.component';

describe('BinwisePrebininningActionComponent', () => {
  let component: BinwisePrebininningActionComponent;
  let fixture: ComponentFixture<BinwisePrebininningActionComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BinwisePrebininningActionComponent]
    });
    fixture = TestBed.createComponent(BinwisePrebininningActionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
