export interface ProjectStory {
  id: string;
  project_id: string;
  title: string;
  logline: string;
  synopsis: string;
  genre: string;
  themes: string[];
  created_at: string;
  updated_at: string;
}

export interface ProjectCharacter {
  id: string;
  project_id: string;
  story_id: string;
  name: string;
  role: string;
  age: string;
  description: string;
  backstory: string;
  personality: string;
  character_arc: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectEpisode {
  id: string;
  project_id: string;
  story_id: string;
  episode_number: number;
  title: string;
  synopsis: string;
  status: 'draft' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface ProjectScript {
  id: string;
  project_id: string;
  story_id: string;
  episode_id: string;
  title: string;
  content: string;
  version: number;
  created_at: string;
  updated_at: string;
}