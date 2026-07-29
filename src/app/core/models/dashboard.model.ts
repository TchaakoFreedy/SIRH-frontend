export interface DashboardWidget {
  id: string;
  title: string;
  description?: string;
  type: WidgetType;
  permissionRequired: string | string[];
  size: WidgetSize;
  position: number;
  data?: any;
  icon?: string;
  color?: string;
  badge?: number;
  route?: string;
  config?: WidgetConfig;
}

export type WidgetType = 
  | 'profile'
  | 'info'
  | 'stat'
  | 'chart'
  | 'table'
  | 'list'
  | 'timeline'
  | 'calendar'
  | 'quick-actions'
  | 'notifications'
  | 'team'
  | 'org-chart'
  | 'anniversaries'
  | 'holidays'
  | 'events';

export type WidgetSize = 'small' | 'medium' | 'large' | 'full';

export interface WidgetConfig {
  columns?: number;
  height?: number;
  refreshInterval?: number;
  showHeader?: boolean;
  showFooter?: boolean;
  expandable?: boolean;
  [key: string]: any;
}

export interface StatisticData {
  label: string;
  value: number | string;
  change?: number;
  icon?: string;
  color?: string;
  subtext?: string;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
  type: 'bar' | 'line' | 'pie' | 'doughnut' | 'radar';
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
}

export interface Activity {
  id: string;
  user: string;
  userAvatar?: string;
  action: string;
  target?: string;
  timestamp: Date | string;
  icon?: string;
  color?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  timestamp: Date | string;
  icon?: string;
  action?: string;
  route?: string;
}

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'primary';

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  route?: string;
  action?: () => void;
  permissionRequired?: string | string[];
  color?: string;
}