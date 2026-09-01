import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data", "db");
const CHAR_FILE = path.join(DATA_DIR, "characters.json");
const VARIANT_FILE = path.join(DATA_DIR, "characterVariants.json");
const PROJECT_CHAR_FILE = path.join(DATA_DIR, "projectCharacters.json");

function ensure(): void { fs.mkdirSync(DATA_DIR, { recursive: true }); }
function readJson(file: string, fallback: any[]): any[] { try { return JSON.parse(fs.readFileSync(file, "utf-8")) as any[]; } catch { ensure(); return fallback; } }
function writeJson(file: string, data: any[]): void { ensure(); fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8"); }

export function listCharacters(): any[] { return readJson(CHAR_FILE, []); }
export function createCharacter(input: { name: string; description?: string; refImagePath?: string }): any {
  const c = { _id: crypto.randomUUID(), ...input, createdAt: new Date().toISOString() }
  const all = readJson(CHAR_FILE, [])
  all.push(c)
  writeJson(CHAR_FILE, all)
  return c
}

export function listVariants(characterId: string): any[] { return readJson(VARIANT_FILE, []).filter((x: any) => x.characterId === characterId) }
export function createVariant(input: { characterId: string; name: string; description?: string }): any {
  const v = { _id: crypto.randomUUID(), ...input, createdAt: new Date().toISOString() }
  const all = readJson(VARIANT_FILE, [])
  all.push(v)
  writeJson(VARIANT_FILE, all)
  return v
}

export function listProjectCharacters(projectId: string): any[] { return readJson(PROJECT_CHAR_FILE, []).filter((x: any) => x.projectId === projectId) }
export function createProjectCharacter(input: { projectId: string; characterId: string; role?: string; aliases?: string[]; description?: string }): any {
  const pc = { _id: crypto.randomUUID(), ...input, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  const all = readJson(PROJECT_CHAR_FILE, [])
  all.push(pc)
  writeJson(PROJECT_CHAR_FILE, all)
  return pc
}
