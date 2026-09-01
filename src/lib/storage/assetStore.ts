import fs from "node:fs";
import path from "node:path";
import type { Asset } from "../domain/types.ts";

const ASSET_ROOT = path.join(process.cwd(), "data", "assets");

export function assetDir(projectId: string, partId?: string) {
  const p = path.join(ASSET_ROOT, projectId);
  if (partId) return path.join(p, "parts", partId);
  return p;
}

export function putAsset(input: { projectId: string; partId?: string; type: Asset["type"]; mimeType: string; buffer: Buffer; filename?: string }): Asset {
  const dir = assetDir(input.projectId, input.partId);
  fs.mkdirSync(dir, { recursive: true });
  const ext = (input.filename ? path.extname(input.filename) : "").slice(1) || mimeToExt(input.mimeType);
  const file = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const rel = path.join("projects", input.projectId, input.partId ? path.join("parts", input.partId) : "", file);
  fs.writeFileSync(path.join(ASSET_ROOT, rel), input.buffer);
  return {
    _id: crypto.randomUUID(),
    projectId: input.projectId,
    partId: input.partId,
    type: input.type,
    storageKey: rel,
    mimeType: input.mimeType,
    createdAt: new Date().toISOString(),
  };
}

export function getAssetBuffer(storageKey: string): Buffer {
  return fs.readFileSync(path.join(ASSET_ROOT, storageKey));
}

export function assetExists(storageKey: string): boolean {
  return fs.existsSync(path.join(ASSET_ROOT, storageKey));
}

export function deleteAsset(storageKey: string) {
  fs.rmSync(path.join(ASSET_ROOT, storageKey), { force: true });
}

function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "video/mp4": "mp4",
    "text/plain": "txt",
    "application/json": "json",
  };
  return map[mime] ?? "bin";
}
