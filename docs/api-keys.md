# API Keys Guide

## Text Providers

### Google AI
1. Go to https://aistudio.google.com/apikey
2. Click "Get API Key"
3. Copy the key into Settings → Text provider → API key

### OpenAI
1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy the key
4. In Settings: kind = `openai-compatible`, base URL = `https://api.openai.com/v1`, model = `gpt-4o-mini`

### Anthropic (Claude)
1. Go to https://console.anthropic.com/settings/keys
2. Create a key
3. In Settings: kind = `openai-compatible`, base URL = `https://api.anthropic.com/v1`, model = `claude-sonnet-4-20250514`

### OpenRouter
1. Go to https://openrouter.ai/keys
2. Create a key
3. In Settings: kind = `openai-compatible`, base URL = `https://openrouter.ai/api/v1`
4. Model format: `openai/gpt-4o-mini` (prefix with provider)

## Image Providers

### Flow-agent (Google Labs)
- No API key
- Requires flow-agent CLI + Chrome extension
- See `setup-flow.md`

### Nano Banana (Google)
- Same key as Google AI above
- In Settings: type = `nano-banana-api`

### fal.ai
1. Go to https://fal.ai/dashboard/keys
2. Copy the key
3. In Settings: type = `fal-ai`

### Pollinations
- Free, no key needed
