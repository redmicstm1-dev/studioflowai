export interface ProjectOverview {
  id: string;
  title: string;
  genre: string;
  logline: string;
  setting: string;
  format: string;
  targetRuntime: string;
  rating: string;
  createdAt: string;
}

export interface Episode {
  id: string;
  storyId: string;
  episodeNumber: number;
  title: string;
  synopsis: string;
  cliffhanger?: string;
}

export interface ScriptScene {
  id: string;
  storyId: string;
  episodeNumber: number;
  sceneNumber: number;
  heading: string;
  actionText: string;
  dialogue: string[];
  shotType: string;
  cameraMovement: string;
  visualPrompt: string;
}

export interface CharacterProfile {
  id: string;
  storyId: string;
  name: string;
  role: "Protagonist" | "Antagonist" | "Supporting" | "Minor";
  age: number;
  bio: string;
  occurrences: number;
  dialogueSample: string;
}

export interface CharacterContinuity {
  id: string;
  characterId: string;
  skinTone: string;
  build: string;
  hairStyle: string;
  distinguishingFeatures: string;
  wardrobe: string[];
  propAccessory: string;
}