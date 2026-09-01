import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data", "db");
const FILE = path.join(DATA_DIR, "characters.json");

function ensure(): void { fs.mkdirSync(DATA_DIR, { recursive: true }); }
function read(): any[] { try { return JSON.parse(fs.readFileSync(FILE, "utf-8")); } catch { ensure(); return []; } }
function write(data: any[]): void { ensure(); fs.writeFileSync(FILE, JSON.stringify(data, null, 2), "utf-8"); }

export function listCharacters(): any[] { return read(); }
export function saveCharacter(c: any): any { const all = read(); const i = all.findIndex(x => x._id === c._id); if (i >= 0) all[i] = c; else { c._id = c._id || crypto.randomUUID(); all.push(c); } write(all); return c; }
export function createCharacter(input: { name: string; description?: string; refImagePath?: string }): any { const c = { _id: crypto.randomUUID(), name: input.name, description: input.description ?? "", refImagePath: input.refImagePath ?? "", createdAt: new Date().toISOString() }; saveCharacter(c); return c; }
