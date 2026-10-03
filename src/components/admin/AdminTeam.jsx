import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const ROLE_OPTIONS = ["owner", "admin", "mis", "manager", "tailoring_manager", "tailoring_operator"];

export default function AdminTeam() {
  const [users, setUsers] = useState([]);
  const [depts, setDepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(null);

  const load = async () => {
    try {
      const [u, d] = await Promise.all([
        base44.entities.User.list({ limit: 200 }),
        base44.entities.Department.filter({ active: true }, { limit: 100, sort: "name" }),
      ]);
      setUsers(u.items || []);
      setDepts(d.items || []);
    } catch (e) { toast.error("Failed to load"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const update = async (id, data) => {
    setBusy(id);
    try {
      await base44.entities.User.update(id, data);
      setUsers(users.map((u) => (u.id === id ? { ...u, ...data } : u)));
    } catch (e) { toast.error("Update failed"); }
    finally { setBusy(null); }
  };

  const filtered = filter === "all" ? users : users.filter((u) => (u.department || "") === filter);
  const grouped = {};
  filtered.forEach((u) => { const k = u.department || "Unassigned"; (grouped[k] = grouped[k] || []).push(u); });

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        <button onClick={() => setFilter("all")} className={`text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap ${filter === "all" ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>All</button>
        {depts.map((d) => (
          <button key={d.id} onClick={() => setFilter(d.name)} className={`text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap ${filter === d.name ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>{d.name}</button>
        ))}
      </div>

      {Object.keys(grouped).length === 0 ? <p className="text-center text-slate-400 text-sm py-8">No users</p>
        : Object.entries(grouped).map(([dept, list]) => (
          <div key={dept}>
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1.5 px-1">{dept} · {list.length}</p>
            <div className="space-y-2">
              {list.map((u) => (
                <div key={u.id} className="bg-white rounded-2xl p-3 border border-slate-100 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{u.full_name || u.email}</p>
                    <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <select value={u.department || ""} onChange={(e) => update(u.id, { department: e.target.value })} disabled={busy === u.id} className="text-[11px] border border-slate-200 rounded-lg px-1.5 py-1.5 bg-white max-w-[110px]">
                      <option value="">— Dept —</option>
                      {depts.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                    </select>
                    <select value={u.role || "manager"} onChange={(e) => update(u.id, { role: e.target.value })} disabled={busy === u.id} className="text-[11px] border border-slate-200 rounded-lg px-1.5 py-1.5 bg-white max-w-[120px]">
                      {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}