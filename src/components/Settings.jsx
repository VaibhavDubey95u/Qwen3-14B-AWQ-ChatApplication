import { Eye, EyeOff, KeyRound, Server, Cpu, ShieldAlert, X } from "lucide-react";
import { useState } from "react";

export default function Settings({ config, setConfig, onClose, onTest, testing, status }) {
  const [showKey, setShowKey] = useState(false);

  const update = (key, value) => setConfig(c => ({ ...c, [key]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">Model Settings</h2>
            <p className="text-xs text-slate-400">Use any OpenAI-compatible Qwen endpoint.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><X size={19}/></button>
        </div>

        <div className="space-y-5 p-5">
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-medium"><KeyRound size={15}/> API Key</span>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={config.apiKey}
                onChange={e => update("apiKey", e.target.value)}
                placeholder="Paste your API key"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 pr-11 outline-none focus:border-indigo-500"
              />
              <button onClick={() => setShowKey(v => !v)} className="absolute right-2 top-2.5 rounded-lg p-1.5 text-slate-400 hover:text-white">
                {showKey ? <EyeOff size={18}/> : <Eye size={18}/>}
              </button>
            </div>
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-medium"><Server size={15}/> Base URL</span>
            <input
              value={config.baseUrl}
              onChange={e => update("baseUrl", e.target.value)}
              placeholder="https://your-server.example/v1"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none focus:border-indigo-500"
            />
            <span className="mt-1 block text-xs text-slate-500">Example: http://localhost:8000/v1</span>
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-medium"><Cpu size={15}/> Model</span>
            <input
              value={config.model}
              onChange={e => update("model", e.target.value)}
              placeholder="Qwen/Qwen3-4B"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none focus:border-indigo-500"
            />
          </label>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <input type="checkbox" checked={config.remember} onChange={e => update("remember", e.target.checked)} className="h-4 w-4 accent-indigo-500"/>
            <div><div className="text-sm font-medium">Remember settings on this device</div><div className="text-xs text-slate-500">API keys are stored only in this browser when enabled.</div></div>
          </label>

          <div className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-3 text-xs text-amber-200">
            <div className="mb-1 flex items-center gap-2 font-medium"><ShieldAlert size={15}/> Browser-side API key warning</div>
            Never use a valuable secret key on a public website unless you trust the endpoint and understand its CORS/security policy. For public production use, put the key behind your own server.
          </div>

          {status && <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm">{status}</div>}

          <div className="flex gap-3">
            <button onClick={onTest} disabled={testing} className="flex-1 rounded-xl border border-slate-700 px-4 py-3 font-medium hover:bg-slate-900 disabled:opacity-50">
              {testing ? "Testing..." : "Test Connection"}
            </button>
            <button onClick={onClose} className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 font-medium hover:bg-indigo-500">Save & Start</button>
          </div>
        </div>
      </div>
    </div>
  );
}