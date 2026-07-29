export enum NotificationEvent {
  EMPLOYEE_CREATED = 'EMPLOYEE_CREATED',
  EMPLOYEE_UPDATED = 'EMPLOYEE_UPDATED',
  EMPLOYEE_SUSPENDED = 'EMPLOYEE_SUSPENDED',
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  COMPANY_CREATED = 'COMPANY_CREATED',
  COMPANY_UPDATED = 'COMPANY_UPDATED',
  COMPANY_DELETED = 'COMPANY_DELETED',
  DEPARTMENT_CREATED = 'DEPARTMENT_CREATED',
  DEPARTMENT_UPDATED = 'DEPARTMENT_UPDATED',
  DEPARTMENT_DELETED = 'DEPARTMENT_DELETED',
  POSITION_CREATED = 'POSITION_CREATED',
  POSITION_UPDATED = 'POSITION_UPDATED',
  POSITION_DELETED = 'POSITION_DELETED',
  LEAVE_REQUESTED = 'LEAVE_REQUESTED',
  LEAVE_APPROVED = 'LEAVE_APPROVED',
  LEAVE_REJECTED = 'LEAVE_REJECTED',
  LEAVE_CANCELLED = 'LEAVE_CANCELLED',
  LEAVE_BALANCE_GLOBAL_UPDATED = 'LEAVE_BALANCE_GLOBAL_UPDATED',
  LEAVE_BALANCE_INDIVIDUAL_UPDATED = 'LEAVE_BALANCE_INDIVIDUAL_UPDATED',
  ROLE_CREATED = 'ROLE_CREATED',
  ROLE_UPDATED = 'ROLE_UPDATED',
  ROLE_DELETED = 'ROLE_DELETED',
  PERMISSION_UPDATED = 'PERMISSION_UPDATED',
  SYSTEM = 'SYSTEM'
}

export enum NotificationType {
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  ERROR = 'ERROR'
}

export enum NotificationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export interface AppNotification {
  id: string;
  recipientId: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  event: NotificationEvent;
  read: boolean;
  createdAt: string;
  createdBy: string;
  companyId?: string;
  departmentId?: string;
  employeeId?: string;
  entityId?: string;
  entityType?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export interface NotificationFilter {
  recipientId?: string;
  companyId?: string;
  departmentId?: string;
  read?: boolean;
  event?: NotificationEvent;
  type?: NotificationType;
  priority?: NotificationPriority;
  fromDate?: string;
  toDate?: string;
}

export interface NotificationPageResponse {
  content: AppNotification[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}