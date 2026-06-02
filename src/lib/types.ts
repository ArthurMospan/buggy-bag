export type BugStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type BugSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Annotation {
  x: number;        // percentage 0–100 of image width
  y: number;        // percentage 0–100 of image height
  text: string;
  index?: number;
}

// Technical context captured by the widget
export interface NetworkRequest {
  url: string;
  method: string;
  status: number;
  durationMs: number;
  isError: boolean;
}

export interface ConsoleEntry {
  level: 'error' | 'warn';
  message: string;
  source?: string;
}

export interface EventLogEntry {
  type: 'navigation' | 'click' | 'network_error' | 'console_error' | 'store_change';
  description: string;
  timestamp: number;
}

export interface ComponentInfo {
  name: string;
  props?: Record<string, unknown>;
  filePath?: string;
}

export interface TechContext {
  route: string;
  viewport: string;
  userAgent: string;
  component: ComponentInfo | null;
  storeSnapshot: Record<string, unknown> | null;
  networkRequests: NetworkRequest[];
  consoleErrors: ConsoleEntry[];
  eventLog: EventLogEntry[];
  autoSeverity: BugSeverity;
}

export interface Bug {
  id: string;
  project_id: string;
  image_url: string | null;
  json_annotations: Annotation[];
  status: BugStatus;
  severity: BugSeverity;
  description: string | null;
  tech_context: TechContext | null;
  created_at: string;
}

// POSTed by the NPM widget to /api/bugs/submit
export interface SubmitBugPayload {
  api_key: string;
  base64_image: string;
  annotations: Annotation[];
  description?: string;
  tech_context?: TechContext;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  api_key: string;
  created_at: string;
}
