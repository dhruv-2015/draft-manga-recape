# Manga Recap Studio — Setup Docs

## What is this?

A local, single-user AI video production tool. You enter a title and the system produces a complete recap video:
story → script → scenes → shots → images → voice → timeline → render → final video.

---

## Requirements

- Node.js >= 18
- pnpm >= 10
- ffmpeg (must be on PATH)
- Python >= 3.10 with `edge-tts` and `pillow` installed
- Optional: Google Labs flow-agent CLI (`flow.exe`) for local image generation
- Optional: Stable Diffusion WebUI (AUTOMATIC1111 / ComfyUI) for local image generation
- Optional: GPU recommended for local image generation

---

## Install

```bash
pnpm install
```

If pnpm blocks postinstall scripts (esbuild/tsx), run:

```bash
pnpm approve-builds
```

---

## Run

Terminal 1 — API server (port 3001):

```bash
pnpm api
# Windows: if it exits immediately, use:
pnpm api:win
```

Terminal 2 — Web UI (port 3000):

```bash
pnpm dev
```

Open http://localhost:3000

---

## Configure providers

Open Settings in the UI, or edit the config file directly:

- Windows: `%USERPROFILE%\.manga-recap-studio\app-config.json`
- macOS/Linux: `~/.manga-recap-studio/app-config.json`

---

## API Keys & Endpoints

### Text providers (story + script)

**Google AI**
- Get key: https://aistudio.google.com/apikey
- Kind: `google`
- Model: `gemini-2.0-flash` or `gemini-1.5-pro`
- No base URL needed

**OpenAI**
- Get key: https://platform.openai.com/api-keys
- Kind: `openai-compatible`
- Base URL: `https://api.openai.com/v1`
- Model: `gpt-4o-mini` or `gpt-4o`

**Anthropic (Claude)**
- Get key: https://console.anthropic.com/settings/keys
- Kind: `openai-compatible`
- Base URL: `https://api.anthropic.com/v1`
- Model: `claude-sonnet-4-20250514` or `claude-3-5-haiku-20241022`

**OpenRouter** (single API key for many models)
- Get key: https://openrouter.ai/keys
- Kind: `openai-compatible`
- Base URL: `https://openrouter.ai/api/v1`
- Model: `openai/gpt-4o-mini` or any supported model ID
- Good for trying different models without multiple accounts

---

### Image providers

**Option A: Flow-agent (Google Labs local proxy) — recommended if you have it**
- This is the local `flow.exe` CLI proxy. No cloud API key needed.
- Prerequisites:
  1. Install the flow-agent CLI from Google Labs
  2. Make sure `flow.exe` is on PATH, or set `flowUrl` in config
  3. Launch the flow agent (it listens on port 8001 by default)
  4. Install the Chrome extension bridge if required by your flow-agent version
- In Settings: type = `flow-local`
- Models: `narwhal`, `gem_pix_2`, `harbor_seal` (check your flow-agent for available models)
- Cast reference: one local reference image max per request. Use the composite `cast_ref.png` generated automatically.

**Option B: Official Nano Banana API (Google)**
- Get key: https://aistudio.google.com/apikey
- In Settings: type = `nano-banana-api`
- Model: `gemini-2.5-flash-image-preview` (default) or other supported image models
- No local proxy needed

**Option C: fal.ai**
- Get key: https://fal.ai/dashboard/keys
- In Settings: type = `fal-ai`
- Model: `fal-ai/flux/schnell` (fast, cheap) or other fal.ai models
- Requires network access to fal.run

**Option D: Stable Diffusion-compatible endpoint**
- Currently not a dedicated adapter. Use `openai-compatible` with a text provider that supports image gen, or request a dedicated SD adapter.
- For local SD (AUTOMATIC1111):
  - Enable API in settings (`--api` flag)
  - Base URL: `http://localhost:7860`
  - Requires a custom image provider adapter (not yet implemented)

**Option E: Pollinations (free, no key)**
- In Settings: type = `pollinations`
- No API key needed
- Free but rate-limited and lower quality than paid options

---

### Voice (TTS)

No API key needed. Uses Microsoft Edge TTS via the `edge-tts` Python package.

Install:

```bash
pip install edge-tts
```

Common voices:
- `en-US-GuyNeural` (male, American)
- `en-US-JennyNeural` (female, American)
- `en-GB-RyanNeural` (male, British)

List all voices:

```bash
edge-tts --list-voices
```

Rate adjustment: `+100%` means 2x speed (recommended for manhwa recaps where the AI writes ~2x the final word count).

---

## Stable Diffusion Setup (future)

If you want to use a local Stable Diffusion endpoint instead of the built-in providers:

1. Run your SD WebUI with `--api` enabled
2. Add a dedicated `stable-diffusion` image provider in Settings (not yet implemented — open an issue if you need this)
3. The app expects an endpoint that accepts a prompt and returns an image file

---

## Project Storage

Projects are stored under:

- Windows: `%USERPROFILE%\Videos\Manga Recap Studio\<Project Title>\`
- Config: `%USERPROFILE%\.manga-recap-studio\app-config.json`

You can change the root folder in Settings.

---

## Troubleshooting

**"The page needs to be reloaded" (yt-dlp / TTS)**
- Update: `pip install --upgrade edge-tts yt-dlp`
- No JS runtime warning is harmless; subs still download.

**Images not generating (flow-agent)**
- Make sure flow-agent is running and reachable
- Daily per-model quotas exist. If one model is exhausted, switch to another in Settings.
- CAPTCHA errors: wait a few minutes and retry; refresh the Flow tab if needed.

**ffmpeg not found**
- Install ffmpeg and make sure it's on PATH
- Verify with: `ffmpeg -version`

**Python not found**
- Install Python 3.10+
- The app uses `python` by default. Set `YTR_PYTHON` env var if needed.
