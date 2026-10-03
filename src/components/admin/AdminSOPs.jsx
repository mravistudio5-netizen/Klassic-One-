import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminSOPs({ stores, user }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sourceStore, setSourceStore] = useState("all");
  const [destStore, setDestStore] = useState("");
  const [copying, setCopying] = useState(false);

  const load = async () => {
    try {
      const res = await base44.entities.Task.filter({ template_name: { $exists: true, $ne: "" } }, { limit: 200 });
      setTemplates(res.items || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const sourceTemplates = templates.filter((t) => sourceStore === "all" || t.store_id === sourceStore);

  const doCopy = async () => {
    if (!destStore) { toast.error("Select a destination store"); return; }
    if (sourceTemplates.length === 0) { toast.error("No templates to copy from source"); return; }
    if (!window.confirm(`Copy ${sourceTemplates.length} template(s) to the selected store? Manager assignments will be cleared for the new store to assign its own.`)) return;
    setCopying(true);
    try {
      const dest = stores.find((s) => s.id === destStore);
      const copies = sourceTemplates.map((t) => ({
        title: t.title,
        description: t.description,
        priority: t.priority || "Medium",
        category: t.category || "General",
        store_id: dest.id,
        store_name: dest.name,
        assigned_to_id: "",
        assigned_to_name: "",
        location_tag: "",
        start_date: null,
        due_date: null,
        must_finish_before_opening: !!t.must_finish_before_opening,
        buzzer: !!t.buzzer,
        validations: t.validations || [],
        required_proof_photos: t.required_proof_photos || 0,
        require_video_proof: !!t.require_video_proof,
        require_geo_tag_proof: !!t.require_geo_tag_proof,
        checklist: t.checklist || [],
        subtasks: t.subtasks || [],
        status: "Pending",
        recurring: false,
        repeat_type: "None",
        shift: t.shift || "None",
        template_name: t.template_name,
        reminder_minutes: t.reminder_minutes || 0,
        geo_fence: !!t.geo_fence,
        highlight: !!t.highlight,
      }));
      await base44.entities.Task.bulkCreate(copies);
      await base44.entities.AuditLog.create({
        module: "Tasks",
        action: "SOP Templates Copied",
        entity_name: dest.name,
        actor_id: user?.id,
        actor_name: user?.full_name,
        store_id: dest.id,
        details: `${copies.length} template(s) copied from ${sourceStore === "all" ? "all stores" : "a source store"}`,
      });
      toast.success(`Copied ${copies.length} template(s) to ${dest.name}`);
      await load();
    } catch (e) { toast.error("Copy failed: " + (e.message || "error")); }
    finally { setCopying(false); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-3">
        <h3 className="text-sm font-semibold text-slate-800">Copy SOP templates to a store</h3>
        <p className="text-xs text-slate-500">Copy task templates from a source so a new store starts with your SOPs already loaded. Manager assignments are cleared for the new store to assign its own.</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Source</label>
            <select value={sourceStore} onChange={(e) => setSourceStore(e.target.value)} className="input">
              <option value="all">All stores</option>
              {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Destination</label>
            <select value={destStore} onChange={(e) => setDestStore(e.target.value)} className="input">
              <option value="">Select store</option>
              {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <button onClick={doCopy} disabled={copying} className="w-full bg-slate-900 text-white font-semibold py-3 rounded-2xl text-sm flex items-center justify-center gap-2 disabled:opacity-50">
          {copying ? <><Loader2 className="w-4 h-4 animate-spin" /> Copying...</> : <><Copy className="w-4 h-4" /> Copy {sourceTemplates.length} template(s)</>}
        </button>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-800 mb-2">Templates ({templates.length})</h3>
        {loading ? <p className="text-sm text-slate-400">Loading...</p> : (
          <div className="space-y-2">
            {templates.map((t) => (
              <div key={t.id} className="bg-white rounded-xl p-3 border border-slate-100 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{t.template_name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{t.title}</p>
                </div>
                <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full shrink-0 ml-2">{t.store_name || "—"}</span>
              </div>
            ))}
            {templates.length === 0 && <p className="text-sm text-slate-400">No templates yet. Save a task as a template first.</p>}
          </div>
        )}
      </div>
    </div>
  );
}