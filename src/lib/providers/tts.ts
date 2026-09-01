import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

const PY = process.env.YTR_PYTHON || "python";

export async function generateTTS(opts: {
  text: string;
  mp3Path: string;
  srtPath?: string;
  voice?: string;
  rate?: string;
  signal?: AbortSignal;
}): Promise<void> {
  fs.mkdirSync(path.dirname(opts.mp3Path), { recursive: true });
  const script = `
import asyncio, sys
import edge_tts

voice, rate, mp3, srt = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
text = sys.stdin.read()

async def main():
    sub = edge_tts.SubMaker()
    c = edge_tts.Communicate(text, voice, rate=rate, boundary="WordBoundary")
    with open(mp3, "wb") as f:
        async for chunk in c.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                try: sub.feed(chunk)
                except Exception: pass
    with open(srt, "w", encoding="utf-8") as f:
        f.write(sub.get_srt() or "")

asyncio.run(main())
`;
  const tmp = path.join(path.dirname(opts.mp3Path), "_tts_tmp.py");
  fs.writeFileSync(tmp, script, "utf-8");
  await exec(PY, [
    tmp,
    opts.voice ?? "en-US-GuyNeural",
    opts.rate ?? "+100%",
    opts.mp3Path,
    opts.srtPath ?? opts.mp3Path.replace(/\.mp3$/, ".srt"),
  ], { input: opts.text, timeout: 600000, maxBuffer: 10 * 1024 * 1024 });
  fs.rmSync(tmp, { force: true });
}
