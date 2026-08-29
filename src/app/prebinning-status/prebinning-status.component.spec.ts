import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrebinningStatusComponent } from './prebinning-status.component';

describe('PrebinningStatusComponent', () => {
  let component: PrebinningStatusComponent;
  let fixture: ComponentFixture<PrebinningStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PrebinningStatusComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PrebinningStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
