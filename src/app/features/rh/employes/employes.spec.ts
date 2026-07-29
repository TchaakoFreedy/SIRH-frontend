import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Employes } from './employes.component';

describe('Employes', () => {
  let component: Employes;
  let fixture: ComponentFixture<Employes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Employes],
    }).compileComponents();

    fixture = TestBed.createComponent(Employes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
