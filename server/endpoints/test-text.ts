import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { readConfig, type TextProvider } from "../config.ts";

export async function POST() {
  try {
    const cfg = readConfig();
    const p = cfg.textProviders[cfg.activeTextProvider];
    if (!p) return new Response(JSON.stringify({ ok: false, error: "No active text provider configured." }), { status: 400, headers: { "Content-Type": "application/json" } });

    let model;
    if (p.kind === "google") {
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
      prompt: "Reply with exactly: OK",
      maxOutputTokens: 10,
    });
    return new Response(JSON.stringify({ ok: true, reply: res.text.trim() }), { headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message ?? String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
