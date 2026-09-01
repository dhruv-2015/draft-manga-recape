import os from "node:os";
import path from "node:path";
import fs from "node:fs";

export type TextProvider = {
  id: string;
  kind: "openai-compatible" | "google";
  baseURL?: string;
  apiKey?: string;
  model: string;
};

export type ImageProvider =
  | { id: string; type: "flow-local"; model: string; refPath?: string; flowUrl?: string }
  | { id: string; type: "nano-banana-api"; apiKey: string; model?: string }
  | { id: string; type: "fal-ai"; apiKey: string; model: string }
  | { id: string; type: "pollinations" };

export type AppConfig = {
  projectsRoot: string;
  textProviders: Record<string, TextProvider>;
  activeTextProvider: string;
  imageProvider: ImageProvider;
  ttsVoice: string;
  ttsRate: string;
  imageChangeSeconds: number;
  partLengthMinutes: number;
  flowUrl?: string;
};

const CONFIG_FILE = "app-config.json";

function configDir(): string {
  return path.join(os.homedir(), ".manga-recap-studio");
}
function configPath(): string {
  return path.join(configDir(), CONFIG_FILE);
}

export function defaultConfig(): AppConfig {
  return {
    projectsRoot: path.join(os.homedir(), "Videos", "Manga Recap Studio"),
    textProviders: {},
    activeTextProvider: "",
    imageProvider: { id: "pollinations", type: "pollinations" },
    ttsVoice: "en-US-GuyNeural",
    ttsRate: "+100%",
    imageChangeSeconds: 3.5,
    partLengthMinutes: 30,
    flowUrl: "",
  };
}

export function loadConfig(): AppConfig {
  try {
    const raw = fs.readFileSync(path.join(configDir(), CONFIG_FILE), "utf-8");
    return { ...defaultConfig(), ...JSON.parse(raw) };
  } catch {
    const d = defaultConfig();
    saveConfig(d);
    return d;
  }
}

export function saveConfig(cfg: AppConfig) {
  fs.mkdirSync(configDir(), { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify(cfg, null, 2), "utf-8");
}

export function readConfig(): AppConfig {
  return loadConfig();
}
