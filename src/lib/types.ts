export type BugStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface Annotation {
  x: number;        // percentage 0–100 of image width
  y: number;        // percentage 0–100 of image height
  text: string;     // pin description
  index?: number;   // display number shown on the pin dot
}

export interface Bug {
  id: string;
  project_id: string;
  image_url: string | null;
  json_annotations: Annotation[];
  status: BugStatus;
  description: string | null;
  created_at: string; // ISO 8601 timestamp
}

// Shape POSTed by the NPM widget to /api/bugs/submit
export interface SubmitBugPayload {
  api_key: string;             // replaces project_id — resolved server-side
  base64_image: string;        // "data:image/png;base64,..."
  annotations: Annotation[];
  description?: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  api_key: string;
  created_at: string;
}
