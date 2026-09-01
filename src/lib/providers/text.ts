import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { readConfig, type TextProvider } from "../config.ts";

export function textModel(id?: string) {
  const cfg = readConfig();
  const p = cfg.textProviders[id ?? cfg.activeTextProvider];
  if (!p) throw new Error("No text provider configured. Add one in Settings.");
  if (p.kind === "google") {
    const g = createGoogleGenerativeAI({ apiKey: p.apiKey ?? "" });
    return g(p.model);
  }
  const c = createOpenAICompatible({
    name: p.id,
    baseURL: p.baseURL ?? "https://openrouter.ai/api/v1",
    apiKey: p.apiKey ?? "",
  });
  return p.model ? c.chatModel(p.model) : undefined;
}

export async function generateTextWith(opts: {
  providerId?: string;
  system?: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}): Promise<string> {
  const cfg = readConfig();
  const p: TextProvider | undefined = cfg.textProviders[opts.providerId ?? cfg.activeTextProvider];
  if (!p) throw new Error("No active text provider configured (Settings).");

  let model;
  if (p.kind === "google") {
    const { createGoogleGenerativeAI: g } = await import("@ai-sdk/google");
    const google = createGoogleGenerativeAI({ apiKey: p.apiKey ?? "" });
    model = google(p.model);
  } else {
    const prov = createOpenAICompatible({
      name: p.id,
      baseURL: p.baseURL ?? "https://openrouter.ai/api/v1",
      apiKey: p.apiKey ?? "",
    });
    model = prov.chatModel(p.model);
  }

  const res = await generateText({
    model,
    system: opts.system,
    prompt: opts.prompt,
    maxOutputTokens: opts.maxTokens ?? 4096,
    temperature: opts.temperature ?? 0.8,
    abortSignal: opts.signal,
  });
  return res.text;
}
