import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Loader2, Power } from "lucide-react";
import { toast } from "sonner";

export default function AdminStores({ stores: initialStores }) {
  const [stores, setStores] = useState(initialStores || []);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", city: "", address: "", opening_time: "10:00" });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const create = async () => {
    if (!form.name.trim()) { toast.error("Store name required"); return; }
    setSaving(true);
    try {
      const created = await base44.entities.Store.create({
        ...form,
        locations: ["Basement", "Ground Floor", "Floor 1", "Floor 2", "Floor 3", "4th Floor Warehouse", "Washroom", "Terrace"],
        active: true,
      });
      toast.success("Store created");
      setStores([...stores, created]);
      setForm({ name: "", code: "", city: "", address: "", opening_time: "10:00" });
      setShowForm(false);
    } catch (e) {
      toast.error("Create failed: " + (e.message || "error"));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (s) => {
    try {
      await base44.entities.Store.update(s.id, { active: !s.active });
      setStores(stores.map((x) => (x.id === s.id ? { ...x, active: !x.active } : x)));
    } catch (e) {
      toast.error("Update failed");
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowForm((v) => !v)}
        className="flex items-center gap-1 bg-slate-900 text-white text-sm font-semibold px-3 py-2 rounded-xl"
      >
        <Plus className="w-4 h-4" /> Add Store
      </button>

      {showForm && (
        <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-3">
          <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Store name" className="input" />
          <div className="grid grid-cols-2 gap-2">
            <input value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="Code" className="input" />
            <input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="City" className="input" />
          </div>
          <input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Address" className="input" />
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">Opening</label>
            <input type="time" value={form.opening_time} onChange={(e) => set("opening_time", e.target.value)} className="input flex-1" />
          </div>
          <button onClick={create} disabled={saving} className="w-full bg-slate-900 text-white font-semibold py-3 rounded-2xl disabled:opacity-50">
            {saving ? "Saving..." : "Save Store"}
          </button>
        </div>
      )}

      <div className="space-y-2">
        {stores.map((s) => (
          <div key={s.id} className="bg-white rounded-2xl p-3 border border-slate-100 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{s.name}</p>
              <p className="text-xs text-slate-500 truncate">{s.city} · {s.opening_time}</p>
            </div>
            <button
              onClick={() => toggleActive(s)}
              className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium ${s.active ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}
            >
              <Power className="w-3.5 h-3.5" /> {s.active ? "Active" : "Inactive"}
            </button>
          </div>
        ))}
        {stores.length === 0 && <p className="text-center text-sm text-slate-400 py-8">No stores yet.</p>}
      </div>
    </div>
  );
}