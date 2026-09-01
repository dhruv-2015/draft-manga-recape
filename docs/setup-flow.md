# Flow-Agent Setup

Flow-agent is Google Labs' local image generation proxy.

## Install

Download from Google Labs (search for "flow-agent CLI" or check your Labs access).

Place `flow.exe` in a PATH directory, e.g.:
- `C:\Users\<you>\.local\bin\flow.exe`

Or note its full path and paste it into Settings as the Flow URL.

## Run

```bash
flow agent
```

It listens on port 8001 by default.

## Chrome Extension

Some flow-agent versions require the Chrome extension bridge for auth/context.

Install the extension from your Labs dashboard, then pin it in Chrome.

## Models

Common model names (check your version):
- `narwhal`
- `gem_pix_2`
- `harbor_seal`

Each model has a separate DAILY quota. If one is exhausted, switch to another in Settings.

## Cast Reference

The app generates a composite `cast_ref.png` automatically from all character sheets.
Flow-agent accepts ONE local reference image per request.

## Troubleshooting

- "The page needs to be reloaded": refresh the Flow tab in Chrome
- CAPTCHA errors: wait and retry
- Connection refused: make sure flow-agent is running on port 8001
