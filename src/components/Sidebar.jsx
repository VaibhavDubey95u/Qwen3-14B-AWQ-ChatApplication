import { MessageSquare, Plus, Trash2, X, Edit2, Pin, PinOff, MoreHorizontal } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export default function Sidebar({ chats, activeId, onSelect, onNew, onDelete, onRename, onTogglePin, mobileOpen, onClose }) {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [menuOpenId, setMenuOpenId] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingId]);

  const handleEdit = (chat, e) => {
    e.stopPropagation();
    setEditingId(chat.id);
    setEditTitle(chat.title || "New Chat");
  };

  const saveEdit = (e) => {
    if (e) e.stopPropagation();
    if (editingId) {
      onRename(editingId, editTitle.trim() || "New Chat");
      setEditingId(null);
    }
  };

  const handleDelete = (chatId, e) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this chat?")) {
      onDelete(chatId);
    }
  };

  return (
    <aside className={`${mobileOpen ? "fixed inset-y-0 left-0 z-40 flex" : "hidden md:flex"} w-72 flex-col border-r border-slate-800 bg-slate-950`}>
      <div className="flex items-center justify-between border-b border-slate-800 p-4">
        <div className="flex items-center gap-2 font-semibold"><div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600">Q</div> Qwen Chat</div>
        <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 md:hidden"><X size={18}/></button>
      </div>
      <div className="p-3">
        <button onClick={onNew} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium hover:bg-slate-800">
          <Plus size={17}/> New Chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {chats.length === 0 && <div className="px-3 py-8 text-center text-xs text-slate-500">No chats yet.</div>}
        {chats.map(chat => (
          <div 
            key={chat.id} 
            className={`group relative mb-1 flex items-center gap-1 rounded-xl ${activeId === chat.id ? "bg-slate-800" : "hover:bg-slate-900"}`}
            onMouseLeave={() => setMenuOpenId(null)}
          >
            <button onClick={() => onSelect(chat.id)} className="min-w-0 flex-1 px-3 py-3 text-left flex items-center gap-2">
              {chat.pinned ? (
                <Pin size={15} className="shrink-0 text-indigo-400" fill="currentColor" />
              ) : (
                <MessageSquare size={15} className="shrink-0 text-slate-500" />
              )}
              {editingId === chat.id ? (
                <input 
                  ref={inputRef}
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  onBlur={saveEdit}
                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(e); }}
                  onClick={e => e.stopPropagation()}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-sm outline-none focus:border-indigo-500"
                />
              ) : (
                <span className="truncate text-sm">{chat.title || "New Chat"}</span>
              )}
            </button>
            
            {editingId !== chat.id && (
              <div className={`mr-2 flex items-center shrink-0 transition-opacity ${menuOpenId === chat.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                <button 
                  onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === chat.id ? null : chat.id); }} 
                  className="rounded p-1.5 text-slate-500 hover:bg-slate-700 hover:text-slate-200"
                >
                  <MoreHorizontal size={16}/>
                </button>
              </div>
            )}

            {menuOpenId === chat.id && (
              <div className="absolute right-2 top-10 z-50 w-28 overflow-hidden rounded-lg border border-slate-700 bg-slate-800 shadow-xl">
                <button onClick={(e) => { e.stopPropagation(); onTogglePin(chat.id); setMenuOpenId(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700">
                  {chat.pinned ? <PinOff size={14}/> : <Pin size={14}/>} {chat.pinned ? "Unpin" : "Pin"}
                </button>
                <button onClick={(e) => { handleEdit(chat, e); setMenuOpenId(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700">
                  <Edit2 size={14}/> Rename
                </button>
                <button onClick={(e) => { handleDelete(chat.id, e); setMenuOpenId(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-slate-700">
                  <Trash2 size={14}/> Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}