import { NotificationEvent, NotificationPriority, NotificationType } from './notification.model';

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