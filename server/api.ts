import http from "node:http";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { readConfig, saveConfig } from "../src/lib/config.ts";
import { createProject, listProjects, loadProject, saveProject, deleteProject, browseFolders } from "../src/lib/projects.ts";
import { jobs } from "../src/lib/jobManager.ts";
import { startRun } from "../src/lib/runs/runPipeline.ts";
import { generateImage } from "../src/lib/providers/image.ts";
import { generateTTS } from "../src/lib/providers/tts.ts";
import { discoverModels, getCachedOrStatic } from "../src/lib/models/discovery.ts";
import { loadCache, saveCache } from "../src/lib/models/cache.ts";
import { worker } from "../src/lib/workers/runWorker.ts";
import { createCharacter, listCharacters, createVariant, listVariants, createProjectCharacter, listProjectCharacters } from "./character-data.ts";
import { approveRun as serverApproveRun, rejectRun as serverRejectRun, getRun as serverGetRun, listRuns as serverListRuns, saveRun as serverSaveRun, addEvent as serverAddEvent, listEvents as serverListEvents, listJobs as serverListJobs, saveJob as serverSaveJob, startRun as serverStartRun } from "./runs.ts";
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
      if (action === "models") {
        const providerId = url.searchParams.get("providerId") ?? "";
        const cfg = readConfig();
        const text = cfg.textProviders[providerId];
        const cached = loadCache(providerId);
        if (cached) return void resEnd(res, json(cached));
        if (text) return void resEnd(res, json({ providerId, models: [], fetchedAt: new Date().toISOString() }));
        return void resEnd(res, json({ providerId, models: [], fetchedAt: new Date().toISOString() }));
      }
      if (action === "file") {
        const p = url.searchParams.get("path");
        if (!p) { res.writeHead(400); res.end("missing path"); return; }
        const abs = path.isAbsolute(p) ? p : path.join(process.cwd(), p);
        if (!fsSync.existsSync(abs)) { res.writeHead(404); res.end("not found"); return; }
        const ext = path.extname(abs).slice(1).toLowerCase();
        const mime = MIME[ext] ?? "application/octet-stream";
        const stat = fsSync.statSync(abs);
        res.writeHead(200, { "Content-Type": mime, "Content-Length": stat.size, "Cache-Control": "no-store" });
        fsSync.createReadStream(abs).pipe(res);
        return;
      }
      if (action === "characters") return void resEnd(res, json(listCharacters()));
      if (action === "character-variants") {
        const characterId = url.searchParams.get("characterId") ?? ""
        return void resEnd(res, json(listVariants(characterId)))
      }
      if (action === "project-characters") {
        const projectId = url.searchParams.get("projectId") ?? ""
        return void resEnd(res, json(listProjectCharacters(projectId)))
      }
      if (action === "runs") {
        const projectId = url.searchParams.get("projectId") ?? undefined;
        const id = url.searchParams.get("id");
        if (id) return void resEnd(res, json(await serverGetRun(id) ?? null));
        const runs = await serverListRuns(projectId);
        return void resEnd(res, json(runs));
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
        const started = await serverStartRun(projectId, b.part.toString(), {
          status: "pending",
          stages: ["story", "script", "scene", "image", "voice", "timeline", "render", "qa"],
          approvalState: "not_required",
        });
        if (started) {
          startRun({ projectId, folder: b.folder, part: b.part }).catch((e) => jobs.logMsg(projectId, `fatal: ${e?.message ?? e}`));
        }
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
      if (action === "models-refresh") {
        const b = await readBody<{ providerId: string; kind: "openai-compatible" | "google"; baseURL?: string; apiKey?: string }>(req);
        try {
          const cache = await discoverModels(b.providerId);
          return void resEnd(res, json(cache));
        } catch (e: any) {
          const cached = loadCache(b.providerId);
          return void resEnd(res, json({ error: e?.message ?? String(e), cached: cached ?? null }, 500));
        }
      }
      if (action === "characters") {
        const body = await readBody<{ name: string; description?: string; refImagePath?: string }>(req);
        return void resEnd(res, json(createCharacter(body)));
      }
      if (action === "character-variants") {
        const body = await readBody<{ characterId: string; name: string; description?: string }>(req);
        return void resEnd(res, json(createVariant(body)));
      }
      if (action === "project-characters") {
        const body = await readBody<{ projectId: string; characterId: string; role?: string; aliases?: string[]; description?: string }>(req);
        return void resEnd(res, json(createProjectCharacter(body)));
      }
      if (action === "runs") {
        const body = await readBody<{ runId: string; status?: string; patch?: Record<string, unknown> }>(req);
        if (body?.runId) {
          const run = await serverGetRun(body.runId);
          if (!run) return void resEnd(res, json({ error: "run not found" }, 404));
          if (body.patch) await serverSaveRun({ ...run, ...(body.patch as any), updatedAt: new Date().toISOString() });
          return void resEnd(res, json({ ok: true, run }));
        }
        return void resEnd(res, json({ error: "runId required" }, 400));
      }
      if (action === "runs-approve") {
        const b = await readBody<{ runId: string; artifactVersion: string }>(req);
        await serverApproveRun(b.runId, b.artifactVersion);
        return void resEnd(res, json({ ok: true }));
      }
      if (action === "runs-reject") {
        const b = await readBody<{ runId: string }>(req);
        await serverRejectRun(b.runId);
        return void resEnd(res, json({ ok: true }));
      }
    }

    res.writeHead(404); res.end("unknown action");
  } catch (e: any) {
    resEnd(res, json({ error: e?.message ?? String(e) }, 500));
  }
});

function resEnd(res: http.ServerResponse, r: Response) {
  const status = r.status;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  res.writeHead(status, headers);
  r.text().then((t) => res.end(t));
}

async function startServer() {
  await new Promise<void>((resolve) => {
    server.on("error", (err: any) => {
      console.error(`[api] listen failed: ${err?.message ?? err}`);
      process.exit(1);
    });
    server.listen(PORT, resolve);
  });
  console.log(`[api] listening on http://localhost:${PORT}`);
}

startServer();
