import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HhtDeviceRightsComponent } from './hht-device-rights.component';

describe('HhtDeviceRightsComponent', () => {
  let component: HhtDeviceRightsComponent;
  let fixture: ComponentFixture<HhtDeviceRightsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [HhtDeviceRightsComponent]
    });
    fixture = TestBed.createComponent(HhtDeviceRightsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
