import fs from "node:fs";
import path from "node:path";
import type { ProviderModelCache, ProviderConnection } from "../domain/types.ts";

const CACHE_DIR = path.join(process.cwd(), "data", "provider-models");

export function modelCachePath(providerId: string): string {
  return path.join(CACHE_DIR, `${providerId}.json`);
}

export function loadCache(providerId: string): ProviderModelCache | null {
  try {
    const raw = fs.readFileSync(modelCachePath(providerId), "utf-8");
    return JSON.parse(raw) as ProviderModelCache;
  } catch {
    return null;
  }
}

export function saveCache(cache: ProviderModelCache) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(modelCachePath(cache.providerId), JSON.stringify(cache, null, 2), "utf-8");
}

export function staticFallbackModels(providerId: string, kind: "openai-compatible" | "google"): ProviderModelCache["models"] {
  if (kind === "google") {
    return [
      { providerModelId: "gemini-2.5-flash-image-preview", name: "Gemini 2.5 Flash Image", capability: { text: true, structuredOutput: true }, source: "static" },
      { providerModelId: "gemini-2.5-flash", name: "Gemini 2.5 Flash", capability: { text: true, structuredOutput: true }, source: "static" },
    ];
  }
  const map: Record<string, ProviderModelCache["models"]> = {
    openrouter: [
      { providerModelId: "openrouter/auto", name: "Auto", capability: { text: true, toolCalling: true }, source: "static" },
      { providerModelId: "openai/gpt-4o-mini", name: "GPT-4o mini", capability: { text: true, toolCalling: true, structuredOutput: true }, source: "static" },
      { providerModelId: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", capability: { text: true, toolCalling: true, structuredOutput: true }, source: "static" },
    ],
    default: [
      { providerModelId: "gpt-4o-mini", name: "GPT-4o mini", capability: { text: true, toolCalling: true, structuredOutput: true }, source: "static" },
      { providerModelId: "gpt-4o", name: "GPT-4o", capability: { text: true, toolCalling: true, structuredOutput: true }, source: "static" },
    ],
  };
  return map[providerId] ?? map.default;
}
