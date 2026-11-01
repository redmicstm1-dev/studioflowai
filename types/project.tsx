export type Project = {
  id?: string;
  owner_id: string;
  title: string;
  description: string;
  project_type: string;
  status: string;
  progress: number;
  created_at?: string;
  updated_at?: string;
};