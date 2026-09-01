import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/settings')({ component: Settings })

function Settings() {
  const [cfg, setCfg] = useState<any>(null)
  const [saved, setSaved] = useState(false)
  const [newProvName, setNewProvName] = useState('')
  const [showKey, setShowKey] = useState<Record<string, boolean>>({})
  const [testResult, setTestResult] = useState('')
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    fetch('/api/config').then((r) => r.json()).then(setCfg)
  }, [])

  async function save() {
    await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  function upd(patch: any) { setCfg({ ...cfg, ...patch }) }

  function updActive(patch: any) {
    const id = cfg.activeTextProvider || 'default'
    const existing = cfg.textProviders?.[id] ?? { id }
    const providers = { ...(cfg.textProviders ?? {}), [id]: { ...existing, ...patch } }
    upd({ textProviders: providers, activeTextProvider: id })
  }

  function activeProviderField(field: string): string {
    return cfg.textProviders?.[cfg.activeTextProvider ?? 'default']?.[field] ?? ''
  }

  async function testProvider() {
    setTesting(true)
    setTestResult('')
    try {
      await save()
      const r = await fetch('/api/test-text', { method: 'POST' })
      const j = await r.json()
      setTestResult(j.ok ? `✓ ${j.reply}` : `✗ ${j.error}`)
    } catch (e: any) {
      setTestResult(`✗ ${e.message}`)
    }
    setTesting(false)
  }

  if (!cfg) return <div className="p-8 text-zinc-500">Loading…</div>

  const provIds = Object.keys(cfg.textProviders ?? {})

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      <section className="space-y-3">
        <h2 className="font-semibold text-fuchsia-400">Storage</h2>
        <div className="flex gap-2">
          <input value={cfg.projectsRoot} onChange={(e) => upd({ projectsRoot: e.target.value })} className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm" />
        </div>
        <p className="text-xs text-zinc-500">Each video project gets its own subfolder here (script, images, audio, videos).</p>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-fuchsia-400">Text provider (title + script)</h2>
        {provIds.length > 0 && (
          <div className="space-y-2">
            {provIds.map((id) => {
              const p = cfg.textProviders[id]
              const isActive = cfg.activeTextProvider === id
              return (
                <div key={id} className={`rounded-xl border p-3 space-y-2 ${isActive ? 'border-fuchsia-600 bg-zinc-900' : 'border-zinc-800 bg-zinc-900/50'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm flex items-center gap-2">
                      {id}
                      {isActive && <span className="text-[10px] px-2 py-0.5 rounded-full bg-fuchsia-600">ACTIVE</span>}
                    </span>
                    <div className="flex gap-1">
                      {!isActive && (
                        <button onClick={() => upd({ activeTextProvider: id })} className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs">Use</button>
                      )}
                      <button
                        onClick={() => {
                          const providers = { ...cfg.textProviders }
                          delete providers[id]
                          upd({ textProviders: providers, activeTextProvider: isActive ? '' : cfg.activeTextProvider })
                        }}
                        className="px-2 py-1 rounded bg-zinc-800 hover:bg-red-900 text-xs">✕</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select value={p.kind ?? 'openai-compatible'} onChange={(e) => upd({ textProviders: { ...cfg.textProviders, [id]: { ...p, kind: e.target.value } } })} className="px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs">
                      <option value="openai-compatible">OpenAI-compatible</option>
                      <option value="google">Google AI</option>
                    </select>
                    <input value={p.model ?? ''} onChange={(e) => upd({ textProviders: { ...cfg.textProviders, [id]: { ...p, model: e.target.value } } })} placeholder="model (z-ai/glm-4.6, gemini-2.0-flash…)" className="px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs" />
                    <input value={p.baseURL ?? ''} onChange={(e) => upd({ textProviders: { ...cfg.textProviders, [id]: { ...p, baseURL: e.target.value } } })} placeholder="base URL" className="px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs" />
                    <div className="relative">
                      <input type={showKey[id] ? 'text' : 'password'} value={p.apiKey ?? ''} onChange={(e) => upd({ textProviders: { ...cfg.textProviders, [id]: { ...p, apiKey: e.target.value } } })} placeholder="API key" className="w-full px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs pr-8" />
                      <button onClick={() => setShowKey({ ...showKey, [id]: !showKey[id] })} className="absolute right-2 top-1.5 text-zinc-500 hover:text-white text-xs">{showKey[id] ? '🙈' : '👁'}</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <div className="flex items-center gap-2">
          <input placeholder="new provider name (openrouter, together…)" value={newProvName} onChange={(e) => setNewProvName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { const id = newProvName.trim().toLowerCase().replace(/\s+/g, '-'); if (!id || cfg.textProviders?.[id]) return; upd({ textProviders: { ...(cfg.textProviders ?? {}), [id]: { id, kind: 'openai-compatible', baseURL: 'https://openrouter.ai/api/v1', apiKey: '', model: '' } }, activeTextProvider: cfg.activeTextProvider || id }); setNewProvName('') } }} className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm w-64" />
          <button onClick={() => { const id = newProvName.trim().toLowerCase().replace(/\s+/g, '-'); if (!id || cfg.textProviders?.[id]) return; upd({ textProviders: { ...(cfg.textProviders ?? {}), [id]: { id, kind: 'openai-compatible', baseURL: 'https://openrouter.ai/api/v1', apiKey: '', model: '' } }, activeTextProvider: cfg.activeTextProvider || id }); setNewProvName('') }} className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm">+ Add</button>
          <button onClick={testProvider} disabled={testing || !cfg.activeTextProvider} className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm disabled:opacity-40">{testing ? 'Testing…' : 'Test connection'}</button>
        </div>
        {testResult && <p className={`text-sm ${testResult.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>{testResult}</p>}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-fuchsia-400">Image provider</h2>
        <select value={cfg.imageProvider?.type} onChange={(e) => { const t = e.target.value; const defaults: Record<string, any> = { 'flow-local': { id: 'flow', type: 'flow-local', model: 'narwhal', refPath: '' }, 'nano-banana-api': { id: 'nano', type: 'nano-banana-api', apiKey: '', model: 'gemini-2.5-flash-image-preview' }, 'fal-ai': { id: 'fal', type: 'fal-ai', apiKey: '', model: 'fal-ai/flux/schnell' }, 'pollinations': { id: 'pollinations', type: 'pollinations' } }; upd({ imageProvider: defaults[t] }) }} className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm">
          <option value="flow-local">Google Labs proxy (flow-agent local) — your setup</option>
          <option value="nano-banana-api">Official Nano Banana API (Google key)</option>
          <option value="fal-ai">fal.ai (API key)</option>
          <option value="pollinations">Pollinations (free, no key)</option>
        </select>

        {cfg.imageProvider?.type === 'flow-local' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400">Flow model (narwhal / gem_pix_2 / harbor_seal)</label>
              <input value={cfg.imageProvider.model ?? ''} onChange={(e) => upd({ imageProvider: { ...cfg.imageProvider, model: e.target.value } })} className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm" />
            </div>
            <div>
              <label className="text-xs text-zinc-400">Cast reference image (optional)</label>
              <input value={cfg.imageProvider.refPath ?? ''} onChange={(e) => upd({ imageProvider: { ...cfg.imageProvider, refPath: e.target.value } })} placeholder="C:\\path\\cast_ref.png" className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm" />
            </div>
          </div>
        )}
        {cfg.imageProvider?.type === 'nano-banana-api' && (
          <input type="password" placeholder="Google AI API key" value={cfg.imageProvider.apiKey ?? ''} onChange={(e) => upd({ imageProvider: { ...cfg.imageProvider, apiKey: e.target.value } })} className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm" />
        )}
        {cfg.imageProvider?.type === 'fal-ai' && (
          <div className="grid grid-cols-2 gap-3">
            <input type="password" placeholder="fal.ai key" value={cfg.imageProvider.apiKey ?? ''} onChange={(e) => upd({ imageProvider: { ...cfg.imageProvider, apiKey: e.target.value } })} className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm" />
            <input placeholder="fal-ai/flux/schnell" value={cfg.imageProvider.model ?? ''} onChange={(e) => upd({ imageProvider: { ...cfg.imageProvider, model: e.target.value } })} className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm" />
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-fuchsia-400">Video defaults</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-400">TTS voice</label>
            <input value={cfg.ttsVoice} onChange={(e) => upd({ ttsVoice: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm" />
          </div>
          <div>
            <label className="text-xs text-zinc-400">TTS rate</label>
            <input value={cfg.ttsRate} onChange={(e) => upd({ ttsRate: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm" />
          </div>
          <div>
            <label className="text-xs text-zinc-400">Image changes every (sec)</label>
            <input type="number" step="0.5" value={cfg.imageChangeSeconds} onChange={(e) => upd({ imageChangeSeconds: +e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm" />
          </div>
          <div>
            <label className="text-xs text-zinc-400">Target length (min/part)</label>
            <input type="number" value={cfg.partLengthMinutes} onChange={(e) => upd({ partLengthMinutes: +e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm" />
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button onClick={save} className="px-5 py-2.5 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 font-medium">Save settings</button>
        {saved && <span className="text-emerald-400 text-sm">Saved ✓</span>}
      </div>
    </div>
  )
}
