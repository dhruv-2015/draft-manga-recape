import path from "node:path";
import fs from "node:fs";
import { loadConfig } from "./config.ts";

export type Character = {
  name: string;
  description: string;
  refImagePath?: string;
};

export type Section = {
  id: number;
  text: string;
  sceneDescription?: string;
};

export type Part = {
  partNumber: number;
  sections: Section[];
  finalVideo?: string;
};

export type Project = {
  title: string;
  folder: string;
  createdAt: string;
  storyBible: string;
  stylePreset: string;
  characters: Character[];
  parts: Part[];
  lastSectionId: number;
  status: "draft" | "generating" | "paused" | "error" | "done";
  currentPart: number;
  continuationFrom?: { videoFile: string; note: string };
};

const MANIFEST = "project.json";

export function projectsRoot(): string {
  return loadConfig().projectsRoot;
}

export function projectFolder(title: string): string {
  const safe = title.replace(/[<>:"/\\|?*]+/g, "-").trim() || "Untitled";
  return path.join(projectsRoot(), safe);
}

export function createProject(opts: {
  title: string;
  folder?: string;
  storyBible?: string;
  stylePreset?: string;
  characters?: Character[];
}): Project {
  const folder = opts.folder?.trim() || projectFolder(opts.title);
  fs.mkdirSync(folder, { recursive: true });
  for (const d of ["images", "audio", "segments", "work", "characters"]) {
    fs.mkdirSync(path.join(folder, d), { recursive: true });
  }
  const p: Project = {
    title: opts.title,
    folder,
    createdAt: new Date().toISOString(),
    storyBible: opts.storyBible ?? "",
    stylePreset: opts.stylePreset ?? "dark fantasy Korean manhwa webtoon art style, cinematic dramatic lighting, rich colors, sharp lineart, high detail. No text, no speech bubbles, no watermark.",
    characters: opts.characters ?? [],
    parts: [{ partNumber: 1, sections: [] }],
    lastSectionId: 0,
    status: "draft",
    currentPart: 1,
  };
  saveProject(p);
  return p;
}

export function saveProject(p: Project) {
  fs.writeFileSync(path.join(p.folder, MANIFEST), JSON.stringify(p, null, 2), "utf-8");
}

export function loadProject(folder: string): Project | null {
  try {
    const raw = fs.readFileSync(path.join(folder, MANIFEST), "utf-8");
    return JSON.parse(raw) as Project;
  } catch {
    return null;
  }
}

export function listProjects(): Project[] {
  const root = projectsRoot();
  if (!fs.existsSync(root)) return [];
  const out: Project[] = [];
  for (const dir of fs.readdirSync(root)) {
    const full = path.join(root, dir);
    if (fs.statSync(full).isDirectory()) {
      const p = loadProject(full);
      if (p) out.push(p);
    }
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function deleteProject(folder: string) {
  fs.rmSync(folder, { recursive: true, force: true });
}

export function browseFolders(startPath?: string): { path: string; parent: string | null; dirs: string[] } {
  let p = startPath?.trim() || loadConfig().projectsRoot;
  try {
    if (p === "~") p = os.homedir();
    if (!p) p = os.homedir();
    const resolved = path.resolve(p);
    const entries = fs.readdirSync(resolved, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith("$") && e.name !== "node_modules")
      .map((e) => path.join(resolved, e.name))
      .sort();
    const parent = path.dirname(resolved) === resolved ? null : path.dirname(resolved);
    return { path: resolved, parent, dirs: entries };
  } catch (e) {
    return { path: p, parent: null, dirs: [], error: String(e) } as any;
  }
}
