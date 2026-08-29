import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrebinningSummaryComponent } from './prebinning-summary.component';

describe('PrebinningSummaryComponent', () => {
  let component: PrebinningSummaryComponent;
  let fixture: ComponentFixture<PrebinningSummaryComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PrebinningSummaryComponent]
    });
    fixture = TestBed.createComponent(PrebinningSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
