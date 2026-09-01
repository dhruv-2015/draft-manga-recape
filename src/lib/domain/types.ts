export type ObjectId = string;

export type Project = {
  _id: ObjectId;
  title: string;
  description?: string;
  status: "draft" | "active" | "completed" | "archived";
  storyBibleId: ObjectId;
  defaultGenerationProfileId?: ObjectId;
  createdAt: string;
  updatedAt: string;
};

export type Part = {
  _id: ObjectId;
  projectId: ObjectId;
  partNumber: number;
  title: string;
  status: "draft" | "planned" | "generating" | "rendering" | "done" | "error";
  generationVersion: number;
  storySummary?: string;
  endingState?: string;
  finalVideoAssetId?: ObjectId;
  createdAt: string;
  updatedAt: string;
};

export type StoryBible = {
  _id: ObjectId;
  projectId: ObjectId;
  premise: string;
  world?: string;
  locations?: string[];
  factions?: string[];
  powers?: string[];
  characterRelationships?: string;
  importantFacts?: string[];
  currentArc?: string;
  unresolvedThreads?: string[];
  updatedAt: string;
};

export type StoryStateSnapshot = {
  _id: ObjectId;
  projectId: ObjectId;
  partId: ObjectId;
  summary: string;
  currentArc?: string;
  currentLocation?: string;
  importantEvents?: string[];
  unresolvedThreads?: string[];
  characterStates?: Record<string, unknown>;
  importantFacts?: string[];
  createdAt: string;
};

export type Character = {
  _id: ObjectId;
  canonicalName: string;
  aliases?: string[];
  personality?: string;
  backstory?: string;
  physicalTraits?: string;
  distinctiveFeatures?: string[];
  defaultVoiceProfile?: string;
  createdAt: string;
  updatedAt: string;
};

export type CharacterVariant = {
  _id: ObjectId;
  characterId: ObjectId;
  name: string;
  description: string;
  createdAt: string;
};

export type CharacterReference = {
  _id: ObjectId;
  characterId: ObjectId;
  variantId?: ObjectId;
  kind: "face" | "full body" | "profile" | "action" | "expression";
  storageKey: string;
  mimeType: string;
  dimensions?: { width: number; height: number };
  createdAt: string;
};

export type ProjectCharacter = {
  _id: ObjectId;
  projectId: ObjectId;
  characterId: ObjectId;
  role?: string;
  aliases?: string[];
  description?: string;
  defaultVariantId?: ObjectId;
  currentVariantId?: ObjectId;
  storyState?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type CharacterAppearanceEvent = {
  _id: ObjectId;
  projectId: ObjectId;
  characterId: ObjectId;
  variantFromId?: ObjectId;
  variantToId: ObjectId;
  partId?: ObjectId;
  sceneId?: ObjectId;
  reason?: string;
  createdAt: string;
};

export type Scene = {
  _id: ObjectId;
  projectId: ObjectId;
  partId: ObjectId;
  sequence: number;
  title?: string;
  purpose?: string;
  summary?: string;
  emotionalTone?: string;
  location?: string;
  characters: ObjectId[];
  narrationSegments: ObjectId[];
  createdAt: string;
  updatedAt: string;
};

export type NarrationSegment = {
  _id: ObjectId;
  sceneId: ObjectId;
  text: string;
  emotion?: string;
  estimatedDurationSeconds?: number;
  audioAssetId?: ObjectId;
  status: "pending" | "generating" | "done" | "error";
  createdAt: string;
  updatedAt: string;
};

export type Shot = {
  _id: ObjectId;
  projectId: ObjectId;
  partId: ObjectId;
  sceneId: ObjectId;
  sequence: number;
  visualDescription?: string;
  imagePrompt?: string;
  characters: ObjectId[];
  variants: ObjectId[];
  camera?: string;
  lighting?: string;
  mood?: string;
  imageAssetId?: ObjectId;
  createdAt: string;
  updatedAt: string;
};

export type Asset = {
  _id: ObjectId;
  projectId: ObjectId;
  partId?: ObjectId;
  type: "image" | "audio" | "video" | "reference" | "subtitle";
  storageKey: string;
  mimeType: string;
  dimensions?: { width: number; height: number };
  durationSeconds?: number;
  provider?: string;
  model?: string;
  generationMetadata?: Record<string, unknown>;
  promptVersion?: string;
  createdAt: string;
};

export type GenerationRun = {
  _id: ObjectId;
  projectId: ObjectId;
  partId: ObjectId;
  status: "pending" | "running" | "paused" | "cancelling" | "cancelled" | "failed" | "completed";
  progress: number;
  stages: string[];
  startedAt?: string;
  finishedAt?: string;
  costEstimatedCents?: number;
  costWarningThresholdCents?: number;
  costHardLimitCents?: number;
  costActualCents?: number;
  approvalState: "not_required" | "pending" | "approved" | "rejected";
  approvalArtifactVersion?: string;
  createdAt: string;
  updatedAt: string;
};

export type GenerationJob = {
  _id: ObjectId;
  runId: ObjectId;
  projectId: ObjectId;
  partId: ObjectId;
  type: "story" | "script" | "scene" | "shot" | "image" | "voice" | "timeline" | "render" | "qa";
  status: "pending" | "running" | "paused" | "cancelling" | "cancelled" | "failed" | "completed";
  inputHash?: string;
  outputAssetId?: ObjectId;
  provider?: string;
  model?: string;
  estimatedCostCents?: number;
  actualCostCents?: number;
  attempt: number;
  retryOfJobId?: ObjectId;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

export type GenerationEvent = {
  _id: ObjectId;
  runId: ObjectId;
  jobId?: ObjectId;
  type: "started" | "progress" | "completed" | "failed" | "paused" | "resumed" | "cancelled" | "retrying" | "approval_required" | "budget_blocked";
  detail?: Record<string, unknown>;
  createdAt: string;
};

export type Timeline = {
  _id: ObjectId;
  projectId: ObjectId;
  partId: ObjectId;
  sequence: number;
  shotId: ObjectId;
  imageAssetId: ObjectId;
  audioAssetId?: ObjectId;
  startSeconds: number;
  durationSeconds: number;
  createdAt: string;
};

export type ProviderConnection = {
  _id: ObjectId;
  kind: "text" | "image" | "tts";
  providerId: string;
  displayName: string;
  baseURL?: string;
  apiKeyRef?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProviderModelCache = {
  _id: ObjectId;
  providerId: string;
  models: Array<{
    providerModelId: string;
    name: string;
    capability: Record<string, boolean>;
    contextWindow?: number;
    metadata?: Record<string, unknown>;
    source: "dynamic" | "static";
  }>;
  fetchedAt: string;
  refreshMetadata?: Record<string, unknown>;
};

export type GenerationProfile = {
  _id: ObjectId;
  projectId?: ObjectId;
  name: string;
  textProviderId?: string;
  imageProviderId?: string;
  ttsVoice?: string;
  ttsRate?: string;
  imageChangeSeconds?: number;
  targetPartMinutes?: number;
  costWarningThresholdCents?: number;
  costHardLimitCents?: number;
  createdAt: string;
  updatedAt: string;
};
