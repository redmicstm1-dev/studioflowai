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

export interface ProjectCharacterContinuity {
  id: string;
  project_id: string;
  story_id: string;
  character_id: string;
  character_name: string;
  skin_tone: string;
  build: string;
  hair_style: string;
  distinguishing_features: string;
  wardrobe: string[];
  props_and_accessories: string[];
  created_at: string;
  updated_at: string;
}

export type EpisodeStatus = "draft" | "in_progress" | "completed";

export interface ProjectEpisode {
  id: string;
  project_id: string;
  story_id: string;
  episode_number: number;
  title: string;
  synopsis: string;
  status: EpisodeStatus;
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

export type ShotStatus = "planned" | "storyboarded" | "approved";

export interface ProjectShot {
  id: string;
  project_id: string;
  story_id: string;
  episode_id?: string | null;
  episode_number: number;
  shot_number: number;
  scene_heading: string;
  camera_angle: string;
  camera_movement: string;
  lighting_mood: string;
  visual_prompt: string;
  continuity_notes: string;
  status: ShotStatus | string;
  created_at?: string;
  updated_at?: string;
}

export type ShotDraft = Omit<ProjectShot, "id" | "created_at" | "updated_at">;

export interface StudioWorkspacePayload {
  story: Partial<ProjectStory>;
  episodes: Omit<ProjectEpisode, "id" | "created_at" | "updated_at">[];
  scripts: Omit<ProjectScript, "id" | "created_at" | "updated_at">[];
  characters: Omit<ProjectCharacter, "id" | "created_at" | "updated_at">[];
  continuity: Omit<ProjectCharacterContinuity, "id" | "character_id" | "created_at" | "updated_at">[];
  shots?: ShotDraft[];
}