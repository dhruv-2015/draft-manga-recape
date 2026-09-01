import fs from "node:fs";
import path from "node:path";
import type { Project, Part, StoryBible, Character, Scene, Shot, Asset, GenerationRun, GenerationJob, GenerationEvent, StoryStateSnapshot, CharacterVariant, CharacterReference, ProjectCharacter, CharacterAppearanceEvent, Timeline, ProviderConnection, ProviderModelCache, GenerationProfile } from "./types.ts";

const DATA_DIR = path.join(process.cwd(), "data", "db");

function ensure(): void { fs.mkdirSync(DATA_DIR, { recursive: true }); }
function file(name: string): string { return path.join(DATA_DIR, `${name}.json`); }
function readJson<T>(name: string, fallback: T[]): T[] {
  try { return JSON.parse(fs.readFileSync(file(name), "utf-8")) as T[]; }
  catch { return fallback; }
}
function writeJson<T>(name: string, data: T[]): void {
  fs.writeFileSync(file(name), JSON.stringify(data, null, 2), "utf-8");
}

function id(): string { return crypto.randomUUID(); }

export const db = {
  projects: {
    list(): Project[] { return readJson("projects", []); },
    save(p: Project) { const all = readJson("projects", []); const i = all.findIndex(x => x._id === p._id); if (i >= 0) all[i] = p; else all.push(p); writeJson("projects", all); },
    get(projectId: string): Project | undefined { return readJson("projects", []).find(x => x._id === projectId); },
  },
  parts: {
    list(projectId: string): Part[] { return readJson("parts", []).filter(x => x.projectId === projectId); },
    save(p: Part) { const all = readJson("parts", []); const i = all.findIndex(x => x._id === p._id); if (i >= 0) all[i] = p; else all.push(p); writeJson("parts", all); },
  },
  storyBibles: {
    save(s: StoryBible) { const all = readJson("storyBibles", []); const i = all.findIndex(x => x._id === s._id); if (i >= 0) all[i] = s; else all.push(s); writeJson("storyBibles", all); },
    get(projectId: string): StoryBible | undefined { return readJson("storyBibles", []).find(x => x.projectId === projectId); },
  },
  characters: {
    list(): Character[] { return readJson("characters", []); },
    save(c: Character) { const all = readJson("characters", []); const i = all.findIndex(x => x._id === c._id); if (i >= 0) all[i] = c; else all.push(c); writeJson("characters", all); },
  },
  characterVariants: {
    list(characterId: string): CharacterVariant[] { return readJson("characterVariants", []).filter(x => x.characterId === characterId); },
    save(v: CharacterVariant) { const all = readJson("characterVariants", []); const i = all.findIndex(x => x._id === v._id); if (i >= 0) all[i] = v; else all.push(v); writeJson("characterVariants", all); },
  },
  characterReferences: {
    list(characterId: string, variantId?: string): CharacterReference[] { return readJson("characterReferences", []).filter(x => x.characterId === characterId && (!variantId || x.variantId === variantId)); },
    save(r: CharacterReference) { const all = readJson("characterReferences", []); const i = all.findIndex(x => x._id === r._id); if (i >= 0) all[i] = r; else all.push(r); writeJson("characterReferences", all); },
  },
  projectCharacters: {
    list(projectId: string): ProjectCharacter[] { return readJson("projectCharacters", []).filter(x => x.projectId === projectId); },
    save(pc: ProjectCharacter) { const all = readJson("projectCharacters", []); const i = all.findIndex(x => x._id === pc._id); if (i >= 0) all[i] = pc; else all.push(pc); writeJson("projectCharacters", all); },
    delete(projectCharacterId: string) { writeJson("projectCharacters", readJson("projectCharacters", []).filter(x => x._id !== projectCharacterId)); },
  },
  scenes: {
    list(projectId: string, partId: string): Scene[] { return readJson("scenes", []).filter(x => x.projectId === projectId && x.partId === partId); },
    save(s: Scene) { const all = readJson("scenes", []); const i = all.findIndex(x => x._id === s._id); if (i >= 0) all[i] = s; else all.push(s); writeJson("scenes", all); },
  },
  shots: {
    list(projectId: string, partId: string): Shot[] { return readJson("shots", []).filter(x => x.projectId === projectId && x.partId === partId); },
    save(s: Shot) { const all = readJson("shots", []); const i = all.findIndex(x => x._id === s._id); if (i >= 0) all[i] = s; else all.push(s); writeJson("shots", all); },
  },
  assets: {
    list(projectId?: string): Asset[] { const all = readJson("assets", []); return projectId ? all.filter(x => x.projectId === projectId) : all; },
    save(a: Asset) { const all = readJson("assets", []); const i = all.findIndex(x => x._id === a._id); if (i >= 0) all[i] = a; else all.push(a); writeJson("assets", all); },
  },
  generationRuns: {
    list(projectId?: string): GenerationRun[] { const all = readJson("generationRuns", []); return projectId ? all.filter(x => x.projectId === projectId) : all; },
    save(r: GenerationRun) { const all = readJson("generationRuns", []); const i = all.findIndex(x => x._id === r._id); if (i >= 0) all[i] = r; else all.push(r); writeJson("generationRuns", all); },
  },
  generationJobs: {
    list(runId: string): GenerationJob[] { return readJson("generationJobs", []).filter(x => x.runId === runId); },
    save(j: GenerationJob) { const all = readJson("generationJobs", []); const i = all.findIndex(x => x._id === j._id); if (i >= 0) all[i] = j; else all.push(j); writeJson("generationJobs", all); },
  },
  generationEvents: {
    list(runId: string): GenerationEvent[] { return readJson("generationEvents", []).filter(x => x.runId === runId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)); },
    save(e: GenerationEvent) { const all = readJson("generationEvents", []); all.push(e); if (all.length > 1000) all.splice(0, all.length - 1000); writeJson("generationEvents", all); },
  },
  timelines: {
    list(projectId: string, partId: string): Timeline[] { return readJson("timelines", []).filter(x => x.projectId === projectId && x.partId === partId); },
    save(t: Timeline) { const all = readJson("timelines", []); const i = all.findIndex((x: Timeline) => x._id === t._id); if (i >= 0) all[i] = t; else all.push(t); writeJson("timelines", all); },
  },
  storyStateSnapshots: {
    list(projectId: string): StoryStateSnapshot[] { return readJson("storyStateSnapshots", []).filter(x => x.projectId === projectId); },
    save(s: StoryStateSnapshot) { const all = readJson("storyStateSnapshots", []); const i = all.findIndex((x: StoryStateSnapshot) => x._id === s._id); if (i >= 0) all[i] = s; else all.push(s); writeJson("storyStateSnapshots", all); },
  },
  providerConnections: {
    list(): ProviderConnection[] { return readJson("providerConnections", []); },
    save(c: ProviderConnection) { const all = readJson("providerConnections", []); const i = all.findIndex((x: ProviderConnection) => x._id === c._id); if (i >= 0) all[i] = c; else all.push(c); writeJson("providerConnections", all); },
  },
  providerModelCaches: {
    get(providerId: string): ProviderModelCache | undefined { return readJson("providerModelCaches", []).find((x: ProviderModelCache) => x.providerId === providerId); },
    save(c: ProviderModelCache) { const all = readJson("providerModelCaches", []); const i = all.findIndex((x: ProviderModelCache) => x.providerId === c.providerId); if (i >= 0) all[i] = c; else all.push(c); writeJson("providerModelCaches", all); },
  },
  generationProfiles: {
    list(projectId?: string): GenerationProfile[] { const all = readJson("generationProfiles", []); return projectId ? all.filter(x => x.projectId === projectId) : all; },
    save(p: GenerationProfile) { const all = readJson("generationProfiles", []); const i = all.findIndex((x: GenerationProfile) => x._id === p._id); if (i >= 0) all[i] = p; else all.push(p); writeJson("generationProfiles", all); },
  },
  characterAppearanceEvents: {
    list(projectId: string): CharacterAppearanceEvent[] { return readJson("characterAppearanceEvents", []).filter(x => x.projectId === projectId); },
    save(e: CharacterAppearanceEvent) { const all = readJson("characterAppearanceEvents", []); const i = all.findIndex((x: CharacterAppearanceEvent) => x._id === e._id); if (i >= 0) all[i] = e; else all.push(e); writeJson("characterAppearanceEvents", all); },
  },
};
