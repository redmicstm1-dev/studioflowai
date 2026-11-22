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

export type VoiceCastStatus = "cast" | "auditioning" | "locked";

export interface ProjectVoice {
  id: string;
  project_id: string;
  story_id: string;
  character_id?: string | null;
  character_name: string;
  voice_uri: string;
  voice_name: string;
  lang: string;
  pitch: number;
  speaking_rate: number;
  tone_direction: string;
  sample_line: string;
  status: VoiceCastStatus | string;
  created_at?: string;
  updated_at?: string;
}

export type VoiceDraft = Omit<ProjectVoice, "id" | "created_at" | "updated_at">;

export type DialogueLineStatus = "ready" | "approved";

export interface ProjectDialogueLine {
  id: string;
  project_id: string;
  story_id: string;
  episode_number: number;
  line_number: number;
  character_name: string;
  parenthetical: string;
  dialogue_text: string;
  status: DialogueLineStatus | string;
  created_at?: string;
  updated_at?: string;
}

export type DialogueLineDraft = Omit<ProjectDialogueLine, "id" | "created_at" | "updated_at">;

export type AssetCategory =
  | "character"
  | "scene"
  | "location"
  | "prop"
  | "wardrobe"
  | "reference";

export type AssetStatus = "draft" | "ready" | "locked";

export interface ProjectAsset {
  id: string;
  project_id: string;
  story_id: string;
  category: AssetCategory | string;
  name: string;
  linked_entity: string;
  episode_number: number;
  description: string;
  continuity_notes: string;
  reference_url_or_prompt: string;
  image_url?: string;
  status: AssetStatus | string;
  created_at?: string;
  updated_at?: string;
}

export type AssetDraft = Omit<ProjectAsset, "id" | "created_at" | "updated_at">;

export type VideoAspectRatio = "16:9" | "9:16" | "1:1";
export type VideoTransitionType = "cut" | "crossfade" | "ken_burns";
export type VideoClipStatus = "draft" | "ready" | "approved";

export interface ProjectVideoClip {
  id: string;
  project_id: string;
  story_id: string;
  episode_id?: string | null;
  episode_number: number;
  shot_number: number;
  clip_order: number;
  scene_heading: string;
  character_name: string;
  dialogue_summary: string;
  visual_prompt: string;
  continuity_notes: string;
  image_url: string;
  duration_sec: number;
  transition_type: VideoTransitionType | string;
  status: VideoClipStatus | string;
  created_at?: string;
  updated_at?: string;
}

export type VideoClipDraft = Omit<ProjectVideoClip, "id" | "created_at" | "updated_at">;

export interface ProjectVideoRender {
  id: string;
  project_id: string;
  story_id: string;
  title: string;
  aspect_ratio: VideoAspectRatio | string;
  clip_count: number;
  total_duration_sec: number;
  export_format: string;
  notes: string;
  created_at?: string;
}

export type VideoRenderDraft = Omit<ProjectVideoRender, "id" | "created_at">;

export interface StudioWorkspacePayload {
  story: Partial<ProjectStory>;
  episodes: Omit<ProjectEpisode, "id" | "created_at" | "updated_at">[];
  scripts: Omit<ProjectScript, "id" | "created_at" | "updated_at">[];
  characters: Omit<ProjectCharacter, "id" | "created_at" | "updated_at">[];
  continuity: Omit<ProjectCharacterContinuity, "id" | "character_id" | "created_at" | "updated_at">[];
  shots?: ShotDraft[];
  voices?: VoiceDraft[];
  dialogueLines?: DialogueLineDraft[];
  assets?: AssetDraft[];
  videoClips?: VideoClipDraft[];
  videoRenders?: VideoRenderDraft[];
}