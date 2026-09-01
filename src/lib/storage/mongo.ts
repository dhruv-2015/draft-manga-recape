import { MongoClient, type Db } from "mongodb";
import type { Project, Part, StoryBible, Character, Scene, Shot, Asset, GenerationRun, GenerationJob, GenerationEvent, StoryStateSnapshot, CharacterVariant, CharacterReference, ProjectCharacter, CharacterAppearanceEvent, Timeline, ProviderConnection, ProviderModelCache, GenerationProfile } from "#/lib/domain/types";

const MONGO_URI = "mongodb://localhost:27017/manga-recap-studio";
let client: MongoClient | null = null;
let dbPromise: Promise<Db> | null = null;

async function getDb(): Promise<Db> {
  if (!dbPromise) {
    client = new MongoClient(MONGO_URI);
    dbPromise = client.connect().then(() => client!.db("manga-recap-studio"));
  }
  return dbPromise;
}

async function col(name: string) {
  const d = await getDb();
  return d.collection<any>(name);
}

export const db = {
  async projects() {
    const c = await col("projects");
    return {
      async list(): Promise<Project[]> { return c.find().toArray(); },
      async save(p: Project): Promise<void> { await c.updateOne({ _id: p._id }, { $set: p }, { upsert: true }); },
      async get(projectId: string): Promise<Project | undefined> { return c.findOne({ _id: projectId }).then((r) => r as Project | undefined); },
    };
  },
  async parts() {
    const c = await col("parts");
    return {
      async list(projectId: string): Promise<Part[]> { return c.find({ projectId }).toArray(); },
      async save(p: Part): Promise<void> { await c.updateOne({ _id: p._id }, { $set: p }, { upsert: true }); },
    };
  },
  async storyBibles() {
    const c = await col("storyBibles");
    return {
      async save(s: StoryBible): Promise<void> { await c.updateOne({ _id: s._id }, { $set: s }, { upsert: true }); },
      async get(projectId: string): Promise<StoryBible | undefined> { return c.findOne({ projectId }).then((r) => r as StoryBible | undefined); },
    };
  },
  async characters() {
    const c = await col("characters");
    return {
      async list(): Promise<Character[]> { return c.find().toArray(); },
      async save(c_: Character): Promise<void> { await c.updateOne({ _id: c_._id }, { $set: c_ }, { upsert: true }); },
    };
  },
  async characterVariants() {
    const c = await col("characterVariants");
    return {
      async list(characterId: string): Promise<CharacterVariant[]> { return c.find({ characterId }).toArray(); },
      async save(v: CharacterVariant): Promise<void> { await c.updateOne({ _id: v._id }, { $set: v }, { upsert: true }); },
    };
  },
  async characterReferences() {
    const c = await col("characterReferences");
    return {
      async list(characterId: string, variantId?: string): Promise<CharacterReference[]> { const q: any = { characterId }; if (variantId) q.variantId = variantId; return c.find(q).toArray(); },
      async save(r: CharacterReference): Promise<void> { await c.updateOne({ _id: r._id }, { $set: r }, { upsert: true }); },
    };
  },
  async projectCharacters() {
    const c = await col("projectCharacters");
    return {
      async list(projectId: string): Promise<ProjectCharacter[]> { return c.find({ projectId }).toArray(); },
      async save(pc: ProjectCharacter): Promise<void> { await c.updateOne({ _id: pc._id }, { $set: pc }, { upsert: true }); },
      async delete(projectCharacterId: string): Promise<void> { await c.deleteOne({ _id: projectCharacterId }); },
    };
  },
  async scenes() {
    const c = await col("scenes");
    return {
      async list(projectId: string, partId: string): Promise<Scene[]> { return c.find({ projectId, partId }).toArray(); },
      async save(s: Scene): Promise<void> { await c.updateOne({ _id: s._id }, { $set: s }, { upsert: true }); },
    };
  },
  async shots() {
    const c = await col("shots");
    return {
      async list(projectId: string, partId: string): Promise<Shot[]> { return c.find({ projectId, partId }).toArray(); },
      async save(s: Shot): Promise<void> { await c.updateOne({ _id: s._id }, { $set: s }, { upsert: true }); },
    };
  },
  async assets() {
    const c = await col("assets");
    return {
      async list(projectId?: string): Promise<Asset[]> { return projectId ? c.find({ projectId }).toArray() : c.find().toArray(); },
      async save(a: Asset): Promise<void> { await c.updateOne({ _id: a._id }, { $set: a }, { upsert: true }); },
    };
  },
  async generationRuns() {
    const c = await col("generationRuns");
    return {
      async list(projectId?: string): Promise<GenerationRun[]> { return projectId ? c.find({ projectId }).toArray() : c.find().toArray(); },
      async save(r: GenerationRun): Promise<void> { await c.updateOne({ _id: r._id }, { $set: r }, { upsert: true }); },
    };
  },
  async generationJobs() {
    const c = await col("generationJobs");
    return {
      async list(runId: string): Promise<GenerationJob[]> { return c.find({ runId }).toArray(); },
      async save(j: GenerationJob): Promise<void> { await c.updateOne({ _id: j._id }, { $set: j }, { upsert: true }); },
    };
  },
  async generationEvents() {
    const c = await col("generationEvents");
    return {
      async list(runId: string): Promise<GenerationEvent[]> { return c.find({ runId }).sort({ createdAt: 1 }).toArray(); },
      async save(e: GenerationEvent): Promise<void> { await c.insertOne(e); },
    };
  },
  async timelines() {
    const c = await col("timelines");
    return {
      async list(projectId: string, partId: string): Promise<Timeline[]> { return c.find({ projectId, partId }).toArray(); },
      async save(t: Timeline): Promise<void> { await c.updateOne({ _id: t._id }, { $set: t }, { upsert: true }); },
    };
  },
  async storyStateSnapshots() {
    const c = await col("storyStateSnapshots");
    return {
      async list(projectId: string): Promise<StoryStateSnapshot[]> { return c.find({ projectId }).toArray(); },
      async save(s: StoryStateSnapshot): Promise<void> { await c.updateOne({ _id: s._id }, { $set: s }, { upsert: true }); },
    };
  },
  async providerConnections() {
    const c = await col("providerConnections");
    return {
      async list(): Promise<ProviderConnection[]> { return c.find().toArray(); },
      async save(conn: ProviderConnection): Promise<void> { await c.updateOne({ _id: conn._id }, { $set: conn }, { upsert: true }); },
    };
  },
  async providerModelCaches() {
    const c = await col("providerModelCaches");
    return {
      async get(providerId: string): Promise<ProviderModelCache | undefined> { return c.findOne({ providerId }).then((r) => r as ProviderModelCache | undefined); },
      async save(cache: ProviderModelCache): Promise<void> { await c.updateOne({ providerId: cache.providerId }, { $set: cache }, { upsert: true }); },
    };
  },
  async generationProfiles() {
    const c = await col("generationProfiles");
    return {
      async list(projectId?: string): Promise<GenerationProfile[]> { return projectId ? c.find({ projectId }).toArray() : c.find().toArray(); },
      async save(p: GenerationProfile): Promise<void> { await c.updateOne({ _id: p._id }, { $set: p }, { upsert: true }); },
    };
  },
  async characterAppearanceEvents() {
    const c = await col("characterAppearanceEvents");
    return {
      async list(projectId: string): Promise<CharacterAppearanceEvent[]> { return c.find({ projectId }).toArray(); },
      async save(e: CharacterAppearanceEvent): Promise<void> { await c.updateOne({ _id: e._id }, { $set: e }, { upsert: true }); },
    };
  },
};
