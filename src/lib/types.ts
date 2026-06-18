export type BugStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type BugSeverity = 'low' | 'medium' | 'high' | 'critical' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | string;

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
  /** Request body (first 500 chars) — only for error responses */
  requestBody?: string;
  /** Response body (first 500 chars) — only for error responses */
  responseBody?: string;
  /** Safe request headers (Auth/Cookie stripped) — only for error responses */
  requestHeaders?: Record<string, string>;
}

export interface ConsoleEntry {
  level: 'error' | 'warn';
  message: string;
  source?: string;
}

export interface EventLogEntry {
  type: 'navigation' | 'click' | 'network_error' | 'console_error' | 'store_change'
      | 'form_change' | 'scroll' | 'focus';
  description: string;
  timestamp: number;
  /** How many ms before the report this event happened */
  relativeMs?: number;
}

export interface ComponentInfo {
  name: string;
  props?: Record<string, unknown>;
  filePath?: string;
  lineNumber?: number;
}

export interface DesignAuditResult {
  fonts: { value: string; count: number }[];
  fontSizes: { value: string; count: number }[];
  colors: { value: string; count: number }[];
  spacings: { value: string; count: number }[];
  borderRadii: { value: string; count: number }[];
}

/**
 * DOM context captured when a pin is placed on a specific element.
 * Provides developers exact element info without guessing.
 */
export interface PinElementContext {
  tagName: string;
  id?: string;
  classes: string[];
  selector: string;        // e.g. "button#add-to-cart"
  ariaLabel?: string;
  innerText?: string;      // first 80 chars
  role?: string;
  href?: string;
  inputType?: string;
  inputName?: string;
  placeholder?: string;
  dataSources?: string[];  // data-buggy-source attribute values
  sourceFile?: string;
  sourceLine?: number;
  reactComponent?: {
    name: string;
    filePath?: string;     // from fiber._debugSource (dev builds)
    lineNumber?: number;
    props?: Record<string, unknown>;
  };
  boundingRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface DrawShape {
  id: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: [number, number, number, number];
  pinNumber?: number;
  /** DOM context — only set for pin type shapes */
  elementContext?: PinElementContext;
}

export interface TechContext {
  route: string;
  viewport: string;
  userAgent: string;
  component: ComponentInfo | null;
  storeSnapshot: Record<string, unknown> | null;
  /** Task 6: fields that changed between page load and bug report */
  storeDiff?: Record<string, { before: unknown; after: unknown }>;
  networkRequests: NetworkRequest[];
  consoleErrors: ConsoleEntry[];
  eventLog: EventLogEntry[];
  autoSeverity: BugSeverity;
  designAudit?: DesignAuditResult | null;
}

export interface Bug {
  id: string;
  project_id: string;
  image_url: string | null;
  json_annotations: Annotation[];
  /** Raw shapes including elementContext with DOM info per pin — stored in json_shapes column */
  json_shapes: DrawShape[] | null;
  status: BugStatus;
  severity: BugSeverity;
  description: string | null;
  tech_context: TechContext | null;
  github_issue_url: string | null;
  created_at: string;
}

// POSTed by the NPM widget to /api/bugs/submit
export interface SubmitBugPayload {
  api_key: string;
  base64_image: string;
  shapes?: DrawShape[];
  annotations: Annotation[];
  description?: string;
  tech_context?: TechContext;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  api_key: string;
  is_active: boolean;
  last_seen_at: string | null;
  connected_domain: string | null;
  /** Favicon URL reported by the widget itself (client-side DOM read) — works for localhost too */
  favicon_url: string | null;
  /** Dominant accent color extracted client-side from the favicon */
  favicon_color: string | null;
  created_at: string;
  invite_token: string | null;
  members: ProjectMember[];
  github_token: string | null;
  github_repo: string | null;
  google_access_token?: string | null;
  google_refresh_token?: string | null;
  google_token_expiry?: string | null;
  widget_password?: string | null;
}

export interface ProjectMember {
  user_id: string;
  email: string;
  joined_at: string;
}

export interface ActivityLog {
  id: string;
  project_id: string;
  action: 'widget_connected' | 'bug_received' | 'widget_disabled' | 'widget_enabled';
  details: any;
  created_at: string;
}
