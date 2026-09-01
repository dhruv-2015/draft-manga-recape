import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { readConfig, saveConfig } from "../src/lib/config.ts";
import { createProject, listProjects, loadProject, saveProject, deleteProject, browseFolders } from "../src/lib/projects.ts";
import { jobs } from "../src/lib/jobManager.ts";
import { runPipeline } from "../src/lib/pipeline.ts";
import { generateImage } from "../src/lib/providers/image.ts";
import { generateTTS } from "../src/lib/providers/tts.ts";
import type { Project } from "../src/lib/projects.ts";

const PORT = 3001;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

const MIME: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp",
  mp3: "audio/mpeg", wav: "audio/wav", mp4: "video/mp4", srt: "text/plain", json: "application/json",
};

async function readBody<T>(req: http.IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf-8") || "{}") as T;
  } catch {
    return {} as T;
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const parts = url.pathname.split("/").filter(Boolean);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  try {
    if (parts[0] !== "api") { res.writeHead(404); res.end("not found"); return; }
    const action = parts[1] ?? "";

    if (req.method === "GET") {
      if (action === "config") return void resEnd(res, json(readConfig()));
      if (action === "folders") return void resEnd(res, json(browseFolders(url.searchParams.get("path") ?? undefined)));
      if (action === "projects") return void resEnd(res, json(listProjects()));
      if (action === "project") return void resEnd(res, json(loadProject(url.searchParams.get("folder") ?? "")));
      if (action === "job") return void resEnd(res, json(jobs.get(url.searchParams.get("id") ?? "") ?? null));
      if (action === "file") {
        const p = url.searchParams.get("path") ?? "";
        const ext = p.split(".").pop()?.toLowerCase() ?? "";
        if (!p || !MIME[ext]) { res.writeHead(415); res.end(); return; }
        const buf = await fs.readFile(p);
        res.writeHead(200, { "Content-Type": MIME[ext], "Content-Length": buf.length });
        res.end(buf);
        return;
      }
      if (action === "docs") {
        const doc = url.searchParams.get("page") ?? "index";
        const docPath = path.join(process.cwd(), "docs", `${doc}.md`);
        try {
          const content = await fs.readFile(docPath, "utf-8");
          res.writeHead(200, { "Content-Type": "text/markdown; charset=utf-8" });
          res.end(content);
        } catch {
          res.writeHead(404); res.end("doc not found");
        }
        return;
      }
    }

    if (req.method === "POST") {
      if (action === "config") return void resEnd(res, json(saveConfig(await readBody(req))));
      if (action === "project-create") return void resEnd(res, json(createProject(await readBody(req))));
      if (action === "project-save") { saveProject(await readBody<Project>(req)); return void resEnd(res, json({ ok: true })); }
      if (action === "project-delete") { const b = await readBody<{ folder: string }>(req); deleteProject(b.folder); return void resEnd(res, json({ ok: true })); }
      if (action === "start") {
        const b = await readBody<{ folder: string; part: number }>(req);
        const p = loadProject(b.folder);
        if (!p) return void resEnd(res, json({ error: "project not found" }, 404));
        const projectId = `${b.folder}::${b.part}`;
        jobs.start(projectId, b.folder, b.part);
        runPipeline(projectId, b.folder, b.part).catch((e) => jobs.logMsg(projectId, `fatal: ${e?.message ?? e}`));
        return void resEnd(res, json({ projectId }));
      }
      if (action === "cancel") {
        const b = await readBody<{ id: string }>(req);
        return void resEnd(res, json({ ok: jobs.requestCancel(b.id) }));
      }
      if (action === "gen-image") {
        const b = await readBody<{ prompt: string; outPath: string; ref?: string }>(req);
        const out = await generateImage({ prompt: b.prompt, outPath: b.outPath, refs: b.ref ? [b.ref] : [] });
        return void resEnd(res, json({ out }));
      }
      if (action === "gen-tts") {
        const b = await readBody<{ text: string; mp3Path: string; voice?: string; rate?: string }>(req);
        await generateTTS(b);
        return void resEnd(res, json({ ok: true }));
      }
      if (action === "test-text") {
        const mod = await import("./endpoints/test-text.ts");
        const r = await mod.POST();
        return void resEnd(res, r);
      }
    }

    res.writeHead(404); res.end("unknown action");
  } catch (e: any) {
    resEnd(res, json({ error: e?.message ?? String(e) }, 500));
  }
});

function resEnd(res: http.ServerResponse, r: Response) {
  res.writeHead(r.status, { "Content-Type": "application/json" });
  r.text().then((t) => res.end(t));
}

server.listen(PORT, () => console.log(`[api] listening on http://localhost:${PORT}`));
