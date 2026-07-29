// src/app/features/shared/permission.directive.ts

import { Directive, Input, TemplateRef, ViewContainerRef } from '@angular/core';
import { AuthService } from '../services/auth.service';

@Directive({
  selector: '[appHasPermission]',
  standalone: true
})
export class PermissionDirective {
  private hasView = false;

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private authService: AuthService
  ) {}

  @Input() set appHasPermission(permission: string) {
    const permissions = this.authService.getCurrentUser()?.permissions || [];
    const hasPerm = permissions.includes(permission);

    if (hasPerm && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!hasPerm && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}