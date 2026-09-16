import { Menu, Settings as SettingsIcon, Square, Send, Sparkles, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Settings from "./components/Settings";
import Sidebar from "./components/Sidebar";
import Message from "./components/Message";

const defaultConfig = {
  apiKey: "",
  baseUrl: "http://localhost:8000/v1",
  model: "Qwen/Qwen3-14B-AWQ",
  remember: false,
};

function loadConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem("qwen-chat-config") || "null");
    return saved ? { ...defaultConfig, ...saved } : defaultConfig;
  } catch { return defaultConfig; }
}

function loadChats() {
  try { return JSON.parse(localStorage.getItem("qwen-chat-history") || "[]"); }
  catch { return []; }
}

export default function App() {
  const [config, setConfig] = useState(loadConfig);
  const [chats, setChats] = useState(loadChats);
  const [activeId, setActiveId] = useState(null);
  const [input, setInput] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(!config.apiKey && !sessionStorage.getItem("qwen-configured"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState("");
  const abortRef = useRef(null);
  const bottomRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => { localStorage.setItem("qwen-chat-history", JSON.stringify(chats)); }, [chats]);
  useEffect(() => {
    if (config.remember) localStorage.setItem("qwen-chat-config", JSON.stringify(config));
    else localStorage.removeItem("qwen-chat-config");
  }, [config]);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) {
      bottomRef.current?.scrollIntoView();
      return;
    }
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView();
    }
  }, [chats, activeId]);

  const active = useMemo(() => chats.find(c => c.id === activeId) || null, [chats, activeId]);

  const sortedChats = useMemo(() => {
    return [...chats]
      .filter(c => c.messages.length > 0 || c.pinned)
      .sort((a, b) => {
        if (a.pinned === b.pinned) return 0;
        return a.pinned ? -1 : 1;
      });
  }, [chats]);

  const newChat = () => {
    setActiveId(null);
    setMobileOpen(false);
  };

  const deleteChat = id => {
    setChats(prev => prev.filter(c => c.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const renameChat = (id, newTitle) => {
    setChats(prev => prev.map(c => c.id === id ? { ...c, title: newTitle } : c));
  };

  const togglePinChat = id => {
    setChats(prev => prev.map(c => c.id === id ? { ...c, pinned: !c.pinned } : c));
  };

  const updateMessages = (id, fn) => setChats(prev => prev.map(c => c.id === id ? { ...c, messages: fn(c.messages) } : c));

  const ensureChat = () => {
    if (activeId) return activeId;
    const id = crypto.randomUUID();
    setChats(prev => [{ id, title: "New Chat", messages: [], createdAt: Date.now() }, ...prev]);
    setActiveId(id);
    return id;
  };

  async function testConnection() {
    setTesting(true); setStatus("");
    try {
      if (!config.baseUrl.trim() || !config.model.trim()) throw new Error("Base URL and Model are required.");
      const base = config.baseUrl.replace(/\/+$/, "");
      const res = await fetch(`${base}/models`, { headers: config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {} });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      setStatus("Connection successful.");
    } catch (e) { setStatus(`Connection failed: ${e.message}`); }
    finally { setTesting(false); }
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || sending) return;
    if (!config.baseUrl.trim() || !config.model.trim()) { setSettingsOpen(true); return; }

    const id = ensureChat();
    setInput("");
    const userMsg = { role: "user", content: text };
    const assistantMsg = { role: "assistant", content: "", streaming: true };
    updateMessages(id, msgs => [...msgs, userMsg, assistantMsg]);
    setChats(prev => prev.map(c => c.id === id && c.title === "New Chat" ? { ...c, title: text.slice(0, 42) } : c));
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 10);

    const controller = new AbortController();
    abortRef.current = controller; setSending(true);

    try {
      const chat = chats.find(c => c.id === id);
      const previous = chat?.messages || [];
      const messages = [...previous, userMsg]
        .filter(m => !m.isError && !m.content.startsWith("Error: Failed to fetch"))
        .map(m => ({ role: m.role, content: m.content }));
      const base = config.baseUrl.replace(/\/+$/, "");
      const res = await fetch(`${base}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json", ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}) },
        body: JSON.stringify({ model: config.model, messages, stream: true }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      if (!res.body) throw new Error("Streaming is not supported by this endpoint.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let answer = "";

      const push = chunk => {
        updateMessages(id, msgs => {
          const copy = [...msgs];
          const last = copy.length - 1;
          copy[last] = { ...copy[last], content: answer + chunk, streaming: true };
          return copy;
        });
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const s = line.trim();
          if (!s.startsWith("data:")) continue;
          const payload = s.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const data = JSON.parse(payload);
            const delta = data.choices?.[0]?.delta?.content ?? "";
            if (delta) { answer += delta; push(""); }
          } catch {}
        }
      }
      updateMessages(id, msgs => {
        const copy = [...msgs];
        copy[copy.length - 1] = { role: "assistant", content: answer || "(No response returned.)", streaming: false };
        return copy;
      });
    } catch (e) {
      if (e.name !== "AbortError") {
        updateMessages(id, msgs => {
          const copy = [...msgs];
          copy[copy.length - 1] = { role: "assistant", content: `Error: ${e.message}`, streaming: false, isError: true };
          return copy;
        });
      } else {
        updateMessages(id, msgs => {
          const copy = [...msgs];
          copy[copy.length - 1] = { role: "assistant", content: "Generation stopped.", streaming: false, isError: true };
          return copy;
        });
      }
    } finally { setSending(false); abortRef.current = null; }
  }

  function stop() { abortRef.current?.abort(); }

  function retry() {
    if (!active || sending || active.messages.length < 2) return;
    const lastUserIndex = [...active.messages].map(m => m.role).lastIndexOf("user");
    if (lastUserIndex < 0) return;
    const text = active.messages[lastUserIndex].content;
    setChats(prev => prev.map(c => c.id === activeId ? { ...c, messages: c.messages.slice(0, lastUserIndex) } : c));
    setTimeout(() => { setInput(text); }, 0);
  }

  const messages = active?.messages || [];

  return (
    <div className="flex h-screen overflow-hidden bg-[#080b14]">
      <Sidebar chats={sortedChats} activeId={activeId} onSelect={id => { setActiveId(id); setMobileOpen(false); }} onNew={newChat} onDelete={deleteChat} onRename={renameChat} onTogglePin={togglePinChat} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-950/90 px-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 md:hidden"><Menu size={20}/></button>
            <div className="font-semibold text-lg">{active?.title || "Qwen Chat"}</div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setSettingsOpen(true)} title="Settings" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><SettingsIcon size={19}/></button>
          </div>
        </header>

        <section ref={scrollRef} className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="mx-auto flex min-h-full max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-indigo-600/15 text-indigo-300"><Sparkles size={30}/></div>
              <h1 className="text-3xl font-semibold tracking-tight">Chat with your Qwen model</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">Enter your API key, Base URL and model in Settings, then start chatting. Any OpenAI-compatible endpoint can be used.</p>
              <button onClick={() => setSettingsOpen(true)} className="mt-7 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-medium hover:bg-indigo-500">Configure Model</button>
            </div>
          ) : (
            <div className="pb-4">
              {active?.createdAt && (
                <div className="py-6 text-center text-xs font-medium text-slate-500">
                  {new Date(active.createdAt).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })} at {new Date(active.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </div>
              )}
              {messages.map((m, i) => <Message key={i} message={m}/>)}
            </div>
          )}
          <div ref={bottomRef}/>
        </section>

        <div className="border-t border-slate-800 bg-slate-950 p-3">
          <div className="mx-auto max-w-4xl">
            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-xl focus-within:border-slate-600">
              <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder="Message Qwen..." rows={1} className="max-h-40 min-h-12 w-full resize-none bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-slate-500"/>
              <div className="flex items-center justify-between px-2 pb-1">
                <span className="text-[11px] text-slate-600">Enter to send · Shift+Enter for new line</span>
                {sending ? (
                  <button onClick={stop} className="flex items-center gap-2 rounded-xl bg-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-600"><Square size={14} fill="currentColor"/> Stop</button>
                ) : (
                  <button onClick={sendMessage} disabled={!input.trim()} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"><Send size={14}/> Send</button>
                )}
              </div>
            </div>
            <div className="mt-2 flex justify-center text-[10px] text-slate-600">Responses are generated by your configured model.</div>
          </div>
        </div>
      </main>

      {settingsOpen && <Settings config={config} setConfig={setConfig} onClose={() => { sessionStorage.setItem("qwen-configured", "1"); setSettingsOpen(false); }} onTest={testConnection} testing={testing} status={status}/>}
    </div>
  );
}