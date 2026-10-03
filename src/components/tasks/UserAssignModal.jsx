import React, { useState, useMemo } from "react";
import { Search, X, Check } from "lucide-react";

export default function UserAssignModal({ open, onClose, onAssign, users, selectedId, storeName }) {
  const [tab, setTab] = useState("users");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState(selectedId || null);

  React.useEffect(() => { setPicked(selectedId || null); }, [selectedId, open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.full_name, u.email, u.role].filter(Boolean).some((v) => v.toLowerCase().includes(q))
    );
  }, [users, query]);

  const teams = useMemo(() => {
    const map = {};
    users.forEach((u) => { const k = u.role || "Staff"; (map[k] = map[k] || []).push(u); });
    return Object.entries(map).map(([role, list]) => ({ role, list }));
  }, [users]);

  if (!open) return null;

  const list = tab === "users" ? filtered : teams.flatMap((t) => t.list);

  const confirm = () => {
    const u = users.find((x) => x.id === picked);
    onAssign(u || null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          {["users", "teams"].map((tb) => (
            <button
              key={tb}
              onClick={() => setTab(tb)}
              className={`flex-1 py-3 text-sm font-semibold relative ${tab === tb ? "text-green-700" : "text-slate-400"}`}
            >
              {tb === "users" ? "Assign Users" : "Assign Teams"}
              {tab === tb && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600" />}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="p-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, phone, email ..."
              className="w-full text-sm pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-green-500"
            />
          </div>
        </div>

        {/* List */}
        <div className="max-h-72 overflow-y-auto px-3 pb-2">
          {tab === "teams" && (
            teams.map(({ role, list }) => (
              <div key={role} className="mb-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1.5 px-1">{role} · {list.length}</p>
                {list.map((u) => <UserRow key={u.id} u={u} picked={picked} onPick={setPicked} />)}
              </div>
            ))
          )}
          {tab === "users" && list.length === 0 && (
            <p className="text-center text-slate-400 text-sm py-8">No users found</p>
          )}
          {tab === "users" && list.map((u) => <UserRow key={u.id} u={u} picked={picked} onPick={setPicked} />)}
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-3 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200">Cancel</button>
          <button onClick={confirm} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-green-700">Assign</button>
        </div>
      </div>
    </div>
  );
}

function UserRow({ u, picked, onPick }) {
  const initials = (u.full_name || "?").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  return (
    <button
      onClick={() => onPick(u.id)}
      className="w-full flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-slate-50 text-left"
    >
      <div className="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0" style={{ borderColor: picked === u.id ? "#15803d" : "#cbd5e1", background: picked === u.id ? "#15803d" : "transparent" }}>
        {picked === u.id && <Check className="w-3 h-3 text-white" />}
      </div>
      <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">{initials}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{u.full_name || "Unnamed"}</p>
        <p className="text-[11px] text-slate-400 uppercase tracking-wide">{u.role || "staff"}</p>
      </div>
    </button>
  );
}