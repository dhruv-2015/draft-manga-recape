import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { readConfig } from "../config.ts";
import { saveCache, loadCache, staticFallbackModels } from "./cache.ts";
import type { ProviderModelCache } from "../domain/types.ts";

export async function discoverModels(providerId: string): Promise<ProviderModelCache> {
  const cfg = readConfig();
  const p = cfg.textProviders[providerId];
  if (!p) throw new Error(`Provider not found: ${providerId}`);
  let models: ProviderModelCache["models"] = [];
  try {
    if (p.kind === "google") {
      const google = createGoogleGenerativeAI({ apiKey: p.apiKey ?? "" });
      const out = await (google as any).listModels?.();
      models = (out?.models ?? []).map((m: any) => ({
        providerModelId: (m.name || "").replace("models/", ""),
        name: m.displayName ?? m.name,
        capability: { text: true, structuredOutput: true },
        contextWindow: m.inputTokenLimit ?? m.contextWindow,
        source: "dynamic" as const,
      }));
      if (!models.length) throw new Error("empty google model list");
    } else {
      const prov = createOpenAICompatible({ name: p.id, baseURL: p.baseURL ?? "https://openrouter.ai/api/v1", apiKey: p.apiKey ?? "" });
      const out = await (prov as any).listModels?.();
      models = (out?.models ?? []).map((m: any) => ({
        providerModelId: m.id,
        name: m.name ?? m.id,
        capability: normalizeOpenAICapabilities(m),
        contextWindow: (m as any).contextLength,
        metadata: { pricing: (m as any).pricing },
        source: "dynamic" as const,
      }));
      if (!models.length) throw new Error("empty model list");
    }
  } catch {
    models = staticFallbackModels(providerId, p.kind);
  }
  const cache: ProviderModelCache = { _id: providerId, providerId, models, fetchedAt: new Date().toISOString() };
  saveCache(cache);
  return cache;
}

export function getCachedOrStatic(providerId: string, staticModels?: ProviderModelCache["models"]): ProviderModelCache["models"] {
  const cached = loadCache(providerId);
  if (cached?.models?.length) return cached.models;
  if (staticModels?.length) return staticModels;
  return [];
}

function normalizeOpenAICapabilities(m: any): ProviderModelCache["models"][number]["capability"] {
  const supports = m.supportedParameters ?? [];
  return {
    text: true,
    vision: !!m.vision,
    toolCalling: supports.some((x: string) => /tools|function_calling/i.test(x)),
    structuredOutput: supports.some((x: string) => /json_schema|structured/i.test(x)),
    imageGeneration: !!m.imageGeneration,
  };
}
