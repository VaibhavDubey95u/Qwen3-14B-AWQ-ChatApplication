import { Bot, Copy, User, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function parseThink(text) {
  const parts = [];
  let current = text;
  
  while (current.length > 0) {
    const startIdx = current.indexOf('<think>');
    if (startIdx === -1) {
      parts.push({ type: 'text', content: current });
      break;
    }
    
    if (startIdx > 0) {
      parts.push({ type: 'text', content: current.slice(0, startIdx) });
    }
    
    const endIdx = current.indexOf('</think>', startIdx + 7);
    if (endIdx === -1) {
      parts.push({ type: 'think', content: current.slice(startIdx + 7) });
      break;
    } else {
      parts.push({ type: 'think', content: current.slice(startIdx + 7, endIdx) });
      current = current.slice(endIdx + 8);
    }
  }
  
  return parts;
}

function ThinkBlock({ content }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-4 rounded-xl border border-slate-700/50 bg-slate-900/40 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-slate-300 hover:bg-slate-800/50 transition-colors">
        {open ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
        Thinking Process
      </button>
      {open && (
        <div className="border-t border-slate-700/50 p-4 text-[14px] italic leading-relaxed text-slate-400">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

export default function Message({ message }) {
  const [copied, setCopied] = useState(false);
  const user = message.role === "user";
  const parsed = parseThink(message.content);

  const copy = async () => {
    const textToCopy = parsed.filter(p => p.type === 'text').map(p => p.content).join('').trim();
    await navigator.clipboard?.writeText(textToCopy);
    setCopied(true); setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className={`mx-auto flex w-full max-w-4xl gap-3 px-4 py-5 ${user ? "" : "bg-slate-900/30"}`}>
      <div className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${user ? "bg-slate-700" : "bg-indigo-600"}`}>
        {user ? <User size={16}/> : <Bot size={17}/>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 text-xs font-semibold text-slate-400">{user ? "You" : "Qwen"}</div>
        <div className="markdownish break-words text-[15px] leading-7 text-slate-100">
          {parsed.map((part, i) => 
            part.type === 'think' ? (
              <ThinkBlock key={i} content={part.content} />
            ) : (
              <ReactMarkdown key={i} remarkPlugins={[remarkGfm]}>
                {part.content}
              </ReactMarkdown>
            )
          )}
          {message.streaming && <span className="ml-1 inline-block h-4 w-1.5 animate-pulse rounded bg-indigo-400 align-middle"/>}
        </div>
        {!user && message.content && !message.streaming && (
          <button onClick={copy} className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-200"><Copy size={13}/>{copied ? "Copied" : "Copy"}</button>
        )}
      </div>
    </div>
  );
}