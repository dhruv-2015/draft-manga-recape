# Stable Diffusion Setup

## Local SD WebUI (AUTOMATIC1111)

1. Install: https://github.com/AUTOMATIC1111/stable-diffusion-webui
2. Run with API enabled:
   ```bash
   ./webui.sh --api
   ```
3. Verify: http://localhost:7860/docs

## ComfyUI

1. Install: https://github.com/comfyanonymous/ComfyUI
2. Start the server
3. Verify: http://localhost:8188/docs

## Using with this app

Currently, use one of the built-in image providers:
- `flow-local` (if you have flow-agent)
- `nano-banana-api` (Google)
- `fal-ai` (fal.ai)
- `pollinations` (free, no key)

A dedicated Stable Diffusion adapter is planned. If you need it urgently, open an issue.
