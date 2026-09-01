import path from "node:path";
import fs from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { generateTextWith } from "./providers/text.ts";
import { generateImage } from "./providers/image.ts";
import { generateTTS } from "./providers/tts.ts";
import { jobs } from "./jobManager.ts";
import { loadProject, saveProject, type Project, type Section } from "./projects.ts";
import { readConfig } from "./config.ts";

const exec = promisify(execFile);
const FFMPEG = "ffmpeg";

function ffprobeDur(p: string): Promise<number> {
  return exec(FFMPEG.replace("ffmpeg", "ffprobe"), [
    "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p,
  ])
    .then((r) => parseFloat(r.stdout.trim()))
    .catch(() => 0);
}

const TOPIC_SYSTEM = `You are an expert YouTube content strategist for viral manhwa/manga recap videos (Isekai, System, Cultivation, weak-to-strong, revenge, apocalypse). Originality over copying. Output rules are given per-request.`;

const SCRIPT_SYSTEM = `You are an expert YouTube Manhwa recap scriptwriter. Rules: cold-open hook in first 20-40s (no greetings), curiosity loops (2-4 active), weak-to-strong progression with ONE unique cheat/system mechanic, mini-arcs (goal->obstacle->payoff->new problem), twists, micro-cliffhangers every few minutes, comedy beats, escalation, ending on a cliffhanger tease (never "like and subscribe"), conversational American English narration, ~150 spoken words per minute of video. Write the complete script, no outline, no labels.`;

export async function runPipeline(projectId: string, folder: string, part: number) {
  const cfg = readConfig();
  const project = loadProject(folder);
  if (!project) throw new Error("project not found");

  const partObj = project.parts.find((p) => p.partNumber === part) ?? { partNumber: part, sections: [] as Section[] };
  const isContinuation = part > 1;
  const targetMinutes = cfg.partLengthMinutes;
  const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

  const j = (patch: any) => jobs.update(projectId, patch);
  const log = (m: string) => jobs.logMsg(projectId, m);
  const signal = jobs.controller(projectId).signal;
  const check = () => { if (signal.aborted) throw new Error("cancelled"); };

  try {
    j({ running: true, stage: "title", error: undefined });

    // 1. TITLE
    let title = part === 1 ? project.title : `Part ${part}`;
    if (!isContinuation && !project.storyBible) {
      log("Generating story premise + title…");
      const premise = await generateTextWith({
        system: TOPIC_SYSTEM,
        prompt: `Generate ONE original viral manhwa recap video concept. Reply in exactly this format:
TITLE: <clickable YouTube title, one line>
PREMISE: <3-4 sentence story premise with the cheat/system mechanic, the MC disadvantage, and the escalation arc>`,
        signal,
      });
      check();
      const m = premise.match(/TITLE:\s*(.+)/);
      const p = premise.match(/PREMISE:\s*([\s\S]+)/);
      title = (m?.[1] ?? project.title).trim();
      project.storyBible = (p?.[1] ?? premise).trim();
      project.title = title;
      saveProject(project);
      log(`Title: ${title}`);
    }
    j({ stage: "script", progress: 0.05 });

    // 2. SCRIPT
    if (partObj.sections.length === 0) {
      log(`Writing part ${part} script (~${targetMinutes} min at 2x => ~${Math.round(wordsPerTarget(targetMinutes))} words)…`);
      const continuationNote = isContinuation
        ? `\n\nCONTINUATION: This is part ${part}. Story so far:\n${project.storyBible}\nPrevious sections ended with section ${project.lastSectionId}. Continue the SAME story seamlessly from exactly where it stopped, escalating further. Do not repeat previous events; reference them briefly. End with a NEW cliffhanger.`
        : "";
      const scriptText = await generateTextWith({
        system: SCRIPT_SYSTEM,
        prompt: `Write a complete manhwa recap narration script for a ${targetMinutes}-minute video at ~150 wpm (≈${wordsPerTarget(targetMinutes)} words).

TITLE: ${title}
PREMISE/STORY BIBLE: ${project.storyBible}
${continuationNote}

OUTPUT FORMAT: Split the story into numbered sections of 180-260 words each. Format each exactly like:
##SECTION 1##
<narration text>
##SCENE## <one-line visual scene description for image generation>

Write ${Math.ceil(wordsPerTarget(targetMinutes) / 220)} sections.`,
        maxTokens: 16000,
        signal,
      });
      check();
      const sections = parseSections(scriptText);
      let id = project.lastSectionId;
      for (const s of sections) {
        id += 1;
        partObj.sections.push({ id, text: s.text, sceneDescription: s.scene });
      }
      project.lastSectionId = id;
      if (!project.parts.find((x) => x.partNumber === part)) project.parts.push(partObj);
      const ex = project.parts.find((x) => x.partNumber === part)!;
      ex.sections = partObj.sections;
      project.status = "generating";
      saveProject(project);
      log(`Script: ${sections.length} sections, ${sections.reduce((a, s) => a + words(s.text), 0)} words`);
    }
    j({ stage: "characters", progress: 0.15 });

    // 3. CHARACTER SHEETS
    if (project.characters.length === 0) {
      log("Designing characters…");
      const charsRaw = await generateTextWith({
        system: "You are a character designer for dark fantasy manhwa.",
        prompt: `From this story, extract the 2-4 most important characters. For each, output exactly:
##NAME## <name>
##LOOK## <detailed visual description: age, hair, eyes, build, clothing, signature details — for consistent AI generation>`,
        signal,
      });
      check();
      project.characters = parseCharacters(charsRaw);
      saveProject(project);
      log(`Characters: ${project.characters.map((c) => c.name).join(", ")}`);
    }

    const charDir = path.join(folder, "characters");
    fs.mkdirSync(charDir, { recursive: true });
    const refs: string[] = [];
    for (const c of project.characters) {
      const refPath = c.refImagePath ?? path.join(charDir, `${c.name.replace(/\W+/g, "_")}_ref.png`);
      if (!fs.existsSync(refPath)) {
        check();
        log(`Character sheet: ${c.name}…`);
        await generateImage({
          prompt: `character reference sheet, ${project.stylePreset}: ${c.name}, ${c.description}, full body front view plus face close-up, neutral grey background, crisp character design sheet`,
          outPath: refPath,
          signal,
        });
        c.refImagePath = refPath;
        saveProject(project);
      }
      refs.push(refPath);
    }
    let castRef = path.join(charDir, "cast_ref.png");
    if (refs.length > 1 && !fs.existsSync(castRef)) {
      await compositeImages(refs, castRef);
    } else if (refs.length === 1) {
      castRef = refs[0];
    }
    j({ stage: "scene-planning", progress: 0.22 });

    // 4. SCENE PLANNING
    const ex = project.parts.find((x) => x.partNumber === part)!;
    const needScenes = ex.sections.filter((s) => !s.sceneDescription);
    if (needScenes.length > 0) {
      log("Planning scene descriptions…");
      const listed = ex.sections.map((s) => `Section ${s.id}: ${s.text.slice(0, 200)}…`).join("\n");
      const plan = await generateTextWith({
        prompt: `For each section below, write ONE line of visual scene description (for AI image generation) capturing the most dramatic moment. Output exactly:
##<section id>## <scene description>

${listed}`,
        maxTokens: 4000,
        signal,
      });
      check();
      for (const s of ex.sections) {
        const m = plan.match(new RegExp(`##${s.id}##\\s*(.+)`));
        if (m) s.sceneDescription = m[1].trim();
      }
      saveProject(project);
    }
    j({ stage: "images", progress: 0.25 });

    // 5. IMAGES
    const imgDir = path.join(folder, "images");
    const sections = ex.sections;
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      const nShots = shotsFor(s.text, cfg.imageChangeSeconds);
      const have = listImages(folder, part, s.id);
      if (have.length >= Math.min(nShots, 4)) continue;
      const perReq = 4;
      const reqs = Math.ceil(Math.min(nShots, 8) / perReq);
      for (let r = 0; r < reqs; r++) {
        check();
        log(`Images section ${s.id} (${i + 1}/${sections.length}) request ${r + 1}/${reqs}…`);
        const shot = shotVariants[(r + s.id) % shotVariants.length];
        const prompt = `${s.sceneDescription ?? "dramatic story scene"}. ${shot}. ${project.stylePreset}`;
        await generateImage({
          prompt,
          outPath: path.join(imgDir, `p${part}_s${s.id}_${r}_1.png`),
          refs: [castRef],
          signal,
        });
        await new Promise((res) => setTimeout(res, 2000));
      }
      j({ progress: 0.25 + 0.4 * ((i + 1) / sections.length) });
    }

    // 6. AUDIO
    j({ stage: "audio", progress: 0.68 });
    const audDir = path.join(folder, "audio");
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      const mp3 = path.join(audDir, `p${part}_s${s.id}.mp3`);
      const srt = mp3.replace(".mp3", ".srt");
      if (!fs.existsSync(mp3)) {
        check();
        log(`Voiceover section ${s.id} (${i + 1}/${sections.length})…`);
        await generateTTS({ text: s.text, mp3Path: mp3, srtPath: srt, voice: cfg.ttsVoice, rate: cfg.ttsRate });
      }
      j({ progress: 0.68 + 0.12 * ((i + 1) / sections.length) });
    }

    // 7. SEGMENTS
    j({ stage: "segments", progress: 0.8 });
    const segDir = path.join(folder, "segments");
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      const seg = path.join(segDir, `p${part}_s${s.id}.mp4`);
      if (fs.existsSync(seg)) continue;
      check();
      log(`Rendering section ${s.id} (${i + 1}/${sections.length})…`);
      await renderSegment({
        folder, part, sid: s.id, outPath: seg,
        imageChangeSeconds: cfg.imageChangeSeconds,
      });
      j({ progress: 0.8 + 0.15 * ((i + 1) / sections.length) });
    }

    // 8. FINAL
    j({ stage: "final", progress: 0.95 });
    log("Building final video…");
    const finalPath = await renderFinal({ folder, part, sections: ex.sections });
    ex.finalVideo = finalPath;
    project.status = "done";
    saveProject(project);
    j({ stage: "done", progress: 1, running: false, detail: finalPath });
    log(`DONE: ${finalPath}`);
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    log(`ERROR: ${msg}`);
    j({ running: false, stage: msg === "cancelled" ? "idle" : "error", error: msg });
    const p = loadProject(folder);
    if (p && msg !== "cancelled") {
      p.status = "error";
      saveProject(p);
    }
    jobs.cleanup(projectId);
    return;
  }
  jobs.cleanup(projectId);
}

function wordsPerTarget(minutes: number): number {
  return Math.round(minutes * 150 * 2);
}

function shotsFor(text: string, changeSec: number): number {
  const w = text.split(/\s+/).length;
  const spoken = (w / 150) * 60 / 2.05;
  return Math.max(2, Math.ceil(spoken / changeSec));
}

const shotVariants = [
  "wide establishing shot, epic scale",
  "medium shot, characters visible, detailed background",
  "dramatic close-up on faces, intense emotion",
  "low angle hero shot, dynamic composition",
  "action moment, motion energy, environmental debris",
];

function parseSections(raw: string): { text: string; scene: string }[] {
  const out: { text: string; scene: string }[] = [];
  const re = /##SECTION\s*(\d+)##\s*([\s\S]*?)(?=##SECTION\s*\d+##|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    const body = m[2];
    const sceneMatch = body.match(/##SCENE##\s*(.+)/i);
    const text = body.replace(/##SCENE##[\s\S]*/i, "").trim();
    if (text) out.push({ text, scene: (sceneMatch?.[1] ?? "").trim() });
  }
  if (out.length === 0) out.push({ text: raw.trim(), scene: "" });
  return out;
}

function parseCharacters(raw: string) {
  const chars: { name: string; description: string }[] = [];
  const re = /##NAME##\s*(.+)\s*##LOOK##\s*([\s\S]*?)(?=##NAME##|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    chars.push({ name: m[1].trim(), description: m[2].trim() });
  }
  return chars.slice(0, 4);
}

async function compositeImages(refs: string[], outPath: string) {
  const py = `
from PIL import Image
import sys
paths = sys.argv[1:-1]
out = sys.argv[-1]
imgs = [Image.open(p).convert("RGB") for p in paths]
H = 720
imgs = [im.resize((int(im.width*H/im.height), H)) for im in imgs]
W = sum(im.width for im in imgs) + 20*(len(imgs)-1)
combo = Image.new("RGB", (W, H), (128,128,128))
x = 0
for im in imgs:
    combo.paste(im, (x, 0)); x += im.width + 20
combo.save(out, quality=92)
`;
  const tmp = path.join(path.dirname(outPath), "_composite.py");
  fs.writeFileSync(tmp, py, "utf-8");
  await exec(process.env.YTR_PYTHON || "python", [tmp, ...refs, outPath], { timeout: 120000 });
  fs.rmSync(tmp, { force: true });
}

function listImages(folder: string, part: number, sid: number): string[] {
  const dir = path.join(folder, "images");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.startsWith(`p${part}_s${sid}_`));
}

async function renderSegment(opts: {
  folder: string; part: number; sid: number; outPath: string; imageChangeSeconds: number;
}) {
  const { folder, part, sid, outPath } = opts;
  const imgDir = path.join(folder, "images");
  const audDir = path.join(folder, "audio");
  const workDir = path.join(folder, "work");
  fs.mkdirSync(workDir, { recursive: true });

  const imgs = listImages(folder, part, sid).map((f) => path.join(imgDir, f)).sort();
  const mp3 = path.join(audDir, `p${part}_s${sid}.mp3`);
  const dur = (await ffprobeDur(mp3)) + 0.5;
  if (!imgs.length) throw new Error(`no images for section ${sid}`);

  const n = imgs.length;
  const shotDur = dur / n;
  const frames = Math.max(2, Math.round(shotDur * 25));
  const motions = [
    `zoompan=z='min(zoom+0.0009,1.15)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1280x720:fps=25`,
    `zoompan=z='max(1.15-0.0009*on,1.0)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1280x720:fps=25`,
    `zoompan=z='1.08':x='iw/2-(iw/zoom/2)+on*0.6':y='ih/2-(ih/zoom/2)':d=${frames}:s=1280x720:fps=25`,
    `zoompan=z='1.08':x='iw/2-(iw/zoom/2)-on*0.6':y='ih/2-(ih/zoom/2)':d=${frames}:s=1280x720:fps=25`,
  ];
  const clips: string[] = [];
  for (let i = 0; i < n; i++) {
    const clip = path.join(workDir, `p${part}_s${sid}_shot${String(i).padStart(2, "0")}.mp4`);
    if (!fs.existsSync(clip)) {
      await exec(FFMPEG, ["-y", "-loop", "1", "-framerate", "25", "-i", imgs[i],
        "-vf", motions[i % 4], "-t", shotDur.toFixed(3), "-an",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", clip], { timeout: 300000 });
    }
    clips.push(clip);
  }
  const listFile = path.join(workDir, `p${part}_s${sid}_list.txt`);
  fs.writeFileSync(listFile, clips.map((c) => `file '${c.replace(/\\/g, "/")}'`).join("\n"), "utf-8");
  await exec(FFMPEG, ["-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", "-t", dur.toFixed(3), outPath], { timeout: 300000 });
}

async function renderFinal(opts: { folder: string; part: number; sections: Section[] }) {
  const { folder, part, sections } = opts;
  const workDir = path.join(folder, "work");
  const segDir = path.join(folder, "segments");
  const audDir = path.join(folder, "audio");

  const GAP = 0.5;
  const padded: string[] = [];
  for (const s of sections) {
    const seg = path.join(segDir, `p${part}_s${s.id}.mp4`);
    const pad = path.join(workDir, `p${part}_s${s.id}_pad.mp4`);
    await exec(FFMPEG, ["-y", "-i", seg, "-vf", `tpad=stop_mode=clone:stop_duration=${GAP}`,
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-an", pad], { timeout: 600000 });
    padded.push(pad);
  }
  const vlist = path.join(workDir, `p${part}_vlist.txt`);
  fs.writeFileSync(vlist, padded.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n"), "utf-8");
  const videoNoSub = path.join(workDir, `p${part}_video_nosub.mp4`);
  await exec(FFMPEG, ["-y", "-f", "concat", "-safe", "0", "-i", vlist, "-c", "copy", videoNoSub], { timeout: 600000 });

  const cues: string[] = [];
  let t = 0;
  const toSec = (ts: string) => {
    const [h, m, rest] = ts.split(":");
    const [s, ms] = rest.split(",");
    return +h * 3600 + +m * 60 + +s + +ms / 1000;
  };
  const toSrt = (x: number) => {
    x = Math.max(0, x);
    const h = Math.floor(x / 3600), m = Math.floor((x % 3600) / 60), s = Math.floor(x % 60);
    const ms = Math.min(Math.round((x - Math.floor(x)) * 1000), 999);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
  };
  for (const s of sections) {
    const srtPath = path.join(audDir, `p${part}_s${s.id}.srt`);
    const mp3 = path.join(audDir, `p${part}_s${s.id}.mp3`);
    if (fs.existsSync(srtPath)) {
      const raw = fs.readFileSync(srtPath, "utf-8");
      const re = /(\d\d:\d\d:\d\d,\d+)\s*-->\s*(\d\d:\d\d:\d\d,\d+)\s*\n([\s\S]*?)(?:\n\n|$)/g;
      let m2: RegExpExecArray | null;
      const words: { st: number; en: number; w: string }[] = [];
      while ((m2 = re.exec(raw))) {
        const w = m2[3].replace(/\n/g, " ").trim();
        if (w) words.push({ st: toSec(m2[1]), en: toSec(m2[2]), w });
      }
      let st = 0, buf: string[] = [], last = 0;
      for (const x of words) {
        if (buf.length === 0) st = x.st;
        buf.push(x.w);
        last = x.en;
        if (buf.length >= 9 || last - st >= 2.2 || /[.!?]$/.test(x.w)) {
          cues.push(`${toSrt(st + t)} --> ${toSrt(last + t)}\n${buf.join(" ")}`);
          buf = [];
        }
      }
      if (buf.length) cues.push(`${toSrt(st + t)} --> ${toSrt(last + t)}\n${buf.join(" ")}`);
    }
    t += (await ffprobeDur(mp3)) + GAP;
  }
  const srtFile = path.join(workDir, `p${part}_global.srt`);
  fs.writeFileSync(srtFile, cues.map((c, i) => `${i + 1}\n${c}`).join("\n\n"), "utf-8");

  const wavs: string[] = [];
  for (const s of sections) {
    const mp3 = path.join(audDir, `p${part}_s${s.id}.mp3`);
    const wav = path.join(workDir, `p${part}_s${s.id}_pad.wav`);
    await exec(FFMPEG, ["-y", "-i", mp3, "-af", `apad=pad_dur=${GAP}`, "-ar", "44100", "-ac", "2", wav], { timeout: 300000 });
    wavs.push(wav);
  }
  const nlist = path.join(workDir, `p${part}_nlist.txt`);
  fs.writeFileSync(nlist, wavs.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n"), "utf-8");
  const narration = path.join(workDir, `p${part}_narration.wav`);
  await exec(FFMPEG, ["-y", "-f", "concat", "-safe", "0", "-i", nlist, "-c", "copy", narration], { timeout: 600000 });

  const music = findMusic();
  const finalOut = path.join(folder, `part${part}.mp4`);
  const musicIn = music ? ["-i", music] : [];
  const musicFilter = music
    ? `[3:a]volume=0.32[m];[1:a][m]amix=inputs=2:duration=first:dropout_transition=3[a]`
    : `[1:a]anull[a]`;
  const maps = ["-map", "[v]", "-map", "[a]"];
  await exec(FFMPEG, [
    "-y", "-i", videoNoSub, "-i", narration, ...musicIn,
    "-filter_complex",
    `[0:v]subtitles='${srtFile.replace(/\\/g, "/").replace(":", "\\:")}':force_style='FontSize=16,Outline=1,Shadow=1,MarginV=30,Alignment=2'[v];` + musicFilter,
    ...maps,
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "21",
    "-c:a", "aac", "-b:a", "160k",
    "-movflags", "+faststart",
    "-t", (await ffprobeDur(narration)).toFixed(3),
    finalOut,
  ], { timeout: 3600000, maxBuffer: 32 * 1024 * 1024 });
  return finalOut;
}

function findMusic(): string | null {
  const candidates = [
    path.join(process.env.USERPROFILE || "", "YouTube", "manhwa_series", "audio", "music.wav"),
    path.join(process.env.LOCALAPPDATA || "", "Temp", "manhwa_video", "audio", "music.wav"),
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return null;
}
