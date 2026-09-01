import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readConfig } from "../config.ts";

const exec = promisify(execFile);

export async function generateImage(opts: {
  prompt: string;
  outPath: string;
  refs?: string[];
  signal?: AbortSignal;
}): Promise<string> {
  const cfg = readConfig();
  const p = cfg.imageProvider;
  fs.mkdirSync(path.dirname(opts.outPath), { recursive: true });

  switch (p.type) {
    case "flow-local":
      return flowLocal(p, opts);
    case "pollinations":
      return pollinations(opts);
    case "nano-banana-api":
      return nanoBananaApi(p, opts);
    case "fal-ai":
      return falAi(p, opts);
    default:
      throw new Error(`Unknown image provider: ${(p as any).type}`);
  }
}

async function flowLocal(
  p: { type: "flow-local"; model: string; refPath?: string; flowUrl?: string },
  opts: { prompt: string; outPath: string; refs?: string[]; signal?: AbortSignal }
) {
  const cfg = readConfig();
  const args = ["image", opts.prompt, "--output", opts.outPath, "--aspect", "landscape", "-c", "1", "-m", p.model];
  const ref = opts.refs?.[0] ?? p.refPath;
  if (ref && fs.existsSync(ref)) args.push("--ref", ref);
  if (opts.signal?.aborted) throw new Error("cancelled");
  const flowBin = () => path.join(process.env.USERPROFILE || process.env.HOME || "", ".local", "bin", "flow.exe");
  await exec(cfg.flowUrl ?? flowBin(), args, { timeout: 600000 });
  if (!fs.existsSync(opts.outPath)) throw new Error("flow produced no output");
  return opts.outPath;
}

async function pollinations(opts: { prompt: string; outPath: string; signal?: AbortSignal }) {
  const url = "https://image.pollinations.ai/prompt/" + encodeURIComponent(opts.prompt);
  const res = await fetch(url + "?width=1280&height=720&model=flux&nologo=true&seed=42", {
    signal: opts.signal,
  });
  if (!res.ok) throw new Error(`pollinations ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(opts.outPath, buf);
  return opts.outPath;
}

async function nanoBananaApi(
  p: { type: "nano-banana-api"; apiKey?: string; model?: string },
  opts: { prompt: string; outPath: string; signal?: AbortSignal }
) {
  const key = p.apiKey;
  if (!key) throw new Error("missing nano-banana api key");
  const model = p.model || "gemini-2.5-flash-image-preview";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: opts.prompt + " Aspect ratio 16:9." }] }],
        generationConfig: { responseModalities: ["IMAGE"] },
      }),
      signal: opts.signal,
    }
  );
  if (!res.ok) throw new Error(`nano-banana ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json: any = await res.json();
  const part = json?.candidates?.[0]?.content?.parts?.find((x: any) => x.inlineData?.data);
  if (!part) throw new Error("nano-banana: no image in response");
  fs.writeFileSync(opts.outPath, Buffer.from(part.inlineData.data, "base64"));
  return opts.outPath;
}

async function falAi(
  p: { type: "fal-ai"; apiKey?: string; model: string },
  opts: { prompt: string; outPath: string; signal?: AbortSignal }
) {
  const key = p.apiKey;
  if (!key) throw new Error("missing fal.ai api key");
  const res = await fetch(`https://fal.run/${p.model}`, {
    method: "POST",
    headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: opts.prompt, image_size: "landscape_16_9", num_images: 1 }),
    signal: opts.signal,
  });
  if (!res.ok) throw new Error(`fal ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json: any = await res.json();
  const url = json?.images?.[0]?.url;
  if (!url) throw new Error("fal: no image url");
  const img = await fetch(url, { signal: opts.signal });
  fs.writeFileSync(opts.outPath, Buffer.from(await img.arrayBuffer()));
  return opts.outPath;
}
