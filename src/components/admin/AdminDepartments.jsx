import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminDepartments({ stores }) {
  const [depts, setDepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [storeId, setStoreId] = useState("");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(null);

  const load = async () => {
    try {
      const res = await base44.entities.Department.filter({}, { limit: 200, sort: "name" });
      setDepts(res.items || []);
    } catch (e) { toast.error("Failed to load"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!name.trim()) { toast.error("Name required"); return; }
    setSaving(true);
    try {
      const store = (stores || []).find((s) => s.id === storeId);
      await base44.entities.Department.create({ name: name.trim(), code: code.trim(), store_id: storeId, store_name: store?.name, active: true });
      setName(""); setCode(""); setStoreId("");
      toast.success("Department added");
      load();
    } catch (e) { toast.error("Failed: " + (e.message || "error")); }
    finally { setSaving(false); }
  };

  const toggle = async (d) => {
    setBusy(d.id);
    try {
      await base44.entities.Department.update(d.id, { active: !d.active });
      setDepts(depts.map((x) => (x.id === d.id ? { ...x, active: !x.active } : x)));
    } catch (e) { toast.error("Failed"); }
    finally { setBusy(null); }
  };

  const remove = async (d) => {
    if (!window.confirm(`Delete department "${d.name}"? Users keep their department tag.`)) return;
    setBusy(d.id);
    try {
      await base44.entities.Department.delete(d.id);
      setDepts(depts.filter((x) => x.id !== d.id));
      toast.success("Deleted");
    } catch (e) { toast.error("Failed"); }
    finally { setBusy(null); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Building2 className="w-4 h-4" /> Add Department</div>
        <div className="grid grid-cols-2 gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Department name" className="input" />
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code (optional)" className="input" />
        </div>
        <select value={storeId} onChange={(e) => setStoreId(e.target.value)} className="input">
          <option value="">All stores</option>
          {(stores || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button onClick={add} disabled={saving} className="w-full bg-slate-900 text-white text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50">
          <Plus className="w-4 h-4" /> {saving ? "..." : "Add Department"}
        </button>
      </div>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>
        : depts.length === 0 ? <p className="text-center text-slate-400 text-sm py-8">No departments yet</p>
        : (
          <div className="space-y-2">
            {depts.map((d) => (
              <div key={d.id} className="bg-white rounded-2xl p-3 border border-slate-100 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{d.name}{d.code ? ` · ${d.code}` : ""}</p>
                  <p className="text-[11px] text-slate-500 truncate">{d.store_name || "All stores"}{d.head_name ? ` · Head: ${d.head_name}` : ""}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => toggle(d)} disabled={busy === d.id} className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${d.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>{d.active ? "Active" : "Inactive"}</button>
                  <button onClick={() => remove(d)} disabled={busy === d.id} className="text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}