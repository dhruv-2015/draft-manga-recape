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

export const db = {
  projects: {
    list(): Project[] { return readJson<Project>("projects", []); },
    save(p: Project) { const all = readJson<Project>("projects", []); const i = all.findIndex(x => x._id === p._id); if (i >= 0) all[i] = p; else all.push(p); writeJson<Project>("projects", all); },
    get(projectId: string): Project | undefined { return readJson<Project>("projects", []).find(x => x._id === projectId); },
  },
  parts: {
    list(projectId: string): Part[] { return readJson<Part>("parts", []).filter(x => x.projectId === projectId); },
    save(p: Part) { const all = readJson<Part>("parts", []); const i = all.findIndex(x => x._id === p._id); if (i >= 0) all[i] = p; else all.push(p); writeJson<Part>("parts", all); },
  },
  storyBibles: {
    save(s: StoryBible) { const all = readJson<StoryBible>("storyBibles", []); const i = all.findIndex(x => x._id === s._id); if (i >= 0) all[i] = s; else all.push(s); writeJson<StoryBible>("storyBibles", all); },
    get(projectId: string): StoryBible | undefined { return readJson<StoryBible>("storyBibles", []).find(x => x.projectId === projectId); },
  },
  characters: {
    list(): Character[] { return readJson<Character>("characters", []); },
    save(c: Character) { const all = readJson<Character>("characters", []); const i = all.findIndex(x => x._id === c._id); if (i >= 0) all[i] = c; else all.push(c); writeJson<Character>("characters", all); },
  },
  characterVariants: {
    list(characterId: string): CharacterVariant[] { return readJson<CharacterVariant>("characterVariants", []).filter(x => x.characterId === characterId); },
    save(v: CharacterVariant) { const all = readJson<CharacterVariant>("characterVariants", []); const i = all.findIndex(x => x._id === v._id); if (i >= 0) all[i] = v; else all.push(v); writeJson<CharacterVariant>("characterVariants", all); },
  },
  characterReferences: {
    list(characterId: string, variantId?: string): CharacterReference[] { return readJson<CharacterReference>("characterReferences", []).filter(x => x.characterId === characterId && (!variantId || x.variantId === variantId)); },
    save(r: CharacterReference) { const all = readJson<CharacterReference>("characterReferences", []); const i = all.findIndex(x => x._id === r._id); if (i >= 0) all[i] = r; else all.push(r); writeJson<CharacterReference>("characterReferences", all); },
  },
  projectCharacters: {
    list(projectId: string): ProjectCharacter[] { return readJson<ProjectCharacter>("projectCharacters", []).filter(x => x.projectId === projectId); },
    save(pc: ProjectCharacter) { const all = readJson<ProjectCharacter>("projectCharacters", []); const i = all.findIndex(x => x._id === pc._id); if (i >= 0) all[i] = pc; else all.push(pc); writeJson<ProjectCharacter>("projectCharacters", all); },
    delete(projectCharacterId: string) { writeJson<ProjectCharacter>("projectCharacters", readJson<ProjectCharacter>("projectCharacters", []).filter(x => x._id !== projectCharacterId)); },
  },
  scenes: {
    list(projectId: string, partId: string): Scene[] { return readJson<Scene>("scenes", []).filter(x => x.projectId === projectId && x.partId === partId); },
    save(s: Scene) { const all = readJson<Scene>("scenes", []); const i = all.findIndex(x => x._id === s._id); if (i >= 0) all[i] = s; else all.push(s); writeJson<Scene>("scenes", all); },
  },
  shots: {
    list(projectId: string, partId: string): Shot[] { return readJson<Shot>("shots", []).filter(x => x.projectId === projectId && x.partId === partId); },
    save(s: Shot) { const all = readJson<Shot>("shots", []); const i = all.findIndex(x => x._id === s._id); if (i >= 0) all[i] = s; else all.push(s); writeJson<Shot>("shots", all); },
  },
  assets: {
    list(projectId?: string): Asset[] { const all = readJson<Asset>("assets", []); return projectId ? all.filter(x => x.projectId === projectId) : all; },
    save(a: Asset) { const all = readJson<Asset>("assets", []); const i = all.findIndex(x => x._id === a._id); if (i >= 0) all[i] = a; else all.push(a); writeJson<Asset>("assets", all); },
  },
  generationRuns: {
    list(projectId?: string): GenerationRun[] { const all = readJson<GenerationRun>("generationRuns", []); return projectId ? all.filter(x => x.projectId === projectId) : all; },
    save(r: GenerationRun) { const all = readJson<GenerationRun>("generationRuns", []); const i = all.findIndex(x => x._id === r._id); if (i >= 0) all[i] = r; else all.push(r); writeJson<GenerationRun>("generationRuns", all); },
  },
  generationJobs: {
    list(runId: string): GenerationJob[] { return readJson<GenerationJob>("generationJobs", []).filter(x => x.runId === runId); },
    save(j: GenerationJob) { const all = readJson<GenerationJob>("generationJobs", []); const i = all.findIndex(x => x._id === j._id); if (i >= 0) all[i] = j; else all.push(j); writeJson<GenerationJob>("generationJobs", all); },
  },
  generationEvents: {
    list(runId: string): GenerationEvent[] { return readJson<GenerationEvent>("generationEvents", []).filter(x => x.runId === runId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)); },
    save(e: GenerationEvent) { const all = readJson<GenerationEvent>("generationEvents", []); all.push(e); if (all.length > 1000) all.splice(0, all.length - 1000); writeJson<GenerationEvent>("generationEvents", all); },
  },
  timelines: {
    list(projectId: string, partId: string): Timeline[] { return readJson<Timeline>("timelines", []).filter(x => x.projectId === projectId && x.partId === partId); },
    save(t: Timeline) { const all = readJson<Timeline>("timelines", []); const i = all.findIndex(x => x._id === t._id); if (i >= 0) all[i] = t; else all.push(t); writeJson<Timeline>("timelines", all); },
  },
  storyStateSnapshots: {
    list(projectId: string): StoryStateSnapshot[] { return readJson<StoryStateSnapshot>("storyStateSnapshots", []).filter(x => x.projectId === projectId); },
    save(s: StoryStateSnapshot) { const all = readJson<StoryStateSnapshot>("storyStateSnapshots", []); const i = all.findIndex(x => x._id === s._id); if (i >= 0) all[i] = s; else all.push(s); writeJson<StoryStateSnapshot>("storyStateSnapshots", all); },
  },
  providerConnections: {
    list(): ProviderConnection[] { return readJson<ProviderConnection>("providerConnections", []); },
    save(c: ProviderConnection) { const all = readJson<ProviderConnection>("providerConnections", []); const i = all.findIndex(x => x._id === c._id); if (i >= 0) all[i] = c; else all.push(c); writeJson<ProviderConnection>("providerConnections", all); },
  },
  providerModelCaches: {
    get(providerId: string): ProviderModelCache | undefined { return readJson<ProviderModelCache>("providerModelCaches", []).find(x => x.providerId === providerId); },
    save(c: ProviderModelCache) { const all = readJson<ProviderModelCache>("providerModelCaches", []); const i = all.findIndex(x => x.providerId === c.providerId); if (i >= 0) all[i] = c; else all.push(c); writeJson<ProviderModelCache>("providerModelCaches", all); },
  },
  generationProfiles: {
    list(projectId?: string): GenerationProfile[] { const all = readJson<GenerationProfile>("generationProfiles", []); return projectId ? all.filter(x => x.projectId === projectId) : all; },
    save(p: GenerationProfile) { const all = readJson<GenerationProfile>("generationProfiles", []); const i = all.findIndex(x => x._id === p._id); if (i >= 0) all[i] = p; else all.push(p); writeJson<GenerationProfile>("generationProfiles", all); },
  },
  characterAppearanceEvents: {
    list(projectId: string): CharacterAppearanceEvent[] { return readJson<CharacterAppearanceEvent>("characterAppearanceEvents", []).filter(x => x.projectId === projectId); },
    save(e: CharacterAppearanceEvent) { const all = readJson<CharacterAppearanceEvent>("characterAppearanceEvents", []); const i = all.findIndex(x => x._id === e._id); if (i >= 0) all[i] = e; else all.push(e); writeJson<CharacterAppearanceEvent>("characterAppearanceEvents", all); },
  },
};
