import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useLang } from "@/lib/i18n";
import { usePermissions } from "@/hooks/usePermissions";
import { CheckCircle2, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

export default function ChecklistTickCard({ template, me, isAdmin, onReload, onEdit }) {
  const { t } = useLang();
  const { can } = usePermissions();
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const month = today.slice(0, 7);
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);

  // Admin may tick on behalf of a specifically-assigned manager; the manager ticks their own / all-managers.
  const canTick = isAdmin
    ? (!!template.manager_id || !!template.all_managers)
    : (template.manager_id === me.id || template.all_managers);
  // Whose entry is this? The assigned manager (specific) or the ticking manager (all_managers).
  const entryManagerId = template.all_managers ? me.id : template.manager_id;

  useEffect(() => {
    if (!canTick) { setLoading(false); return; }
    (async () => {
      try {
        const res = await base44.entities.ChecklistEntry.filter(
          { checklist_id: template.id, date: today, manager_id: entryManagerId },
          { limit: 1 }
        );
        if (res.items?.[0]) {
          setEntry(res.items[0]);
        } else {
          const items = (template.items || []).map((it) => ({ label: it.label, done: false, done_at: null }));
          const created = await base44.entities.ChecklistEntry.create({
            checklist_id: template.id,
            checklist_name: template.name,
            date: today,
            month,
            manager_id: entryManagerId,
            manager_name: template.all_managers ? me.full_name : (template.manager_name || me.full_name),
            store_id: template.store_id,
            items,
            completed_pct: 0,
          });
          setEntry(created);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [template.id, today, canTick]);

  const toggle = async (idx) => {
    if (!entry) return;
    const items = [...entry.items];
    const isDone = !items[idx].done;
    items[idx] = { ...items[idx], done: isDone, done_at: isDone ? new Date().toISOString() : null };
    const doneCount = items.filter((i) => i.done).length;
    const pct = items.length ? Math.round((doneCount / items.length) * 100) : 0;
    try {
      const updated = await base44.entities.ChecklistEntry.update(entry.id, { items, completed_pct: pct });
      setEntry(updated);
    } catch (e) { toast.error("Failed"); }
  };

  const remove = async () => {
    if (!window.confirm("Delete this checklist?")) return;
    try {
      await base44.entities.Checklist.update(template.id, { active: false });
      toast.success("Deleted");
      onReload?.();
    } catch (e) { toast.error("Failed"); }
  };

  // Read-only preview (admin viewing all-managers / unassigned, or anyone not the assignee)
  if (!canTick) {
    return (
      <div className="bg-white rounded-2xl p-4 border border-slate-100">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 text-sm truncate">{template.name}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{template.all_managers ? t("allManagers") : (template.manager_name || "—")}</p>
          </div>
          <span className="text-[10px] text-slate-400 whitespace-nowrap">{(template.items || []).length} items</span>
        </div>
        <div className="mt-2 space-y-1">
          {(template.items || []).map((it, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
              <span className={it.required ? "text-red-500 font-bold" : "text-slate-300"}>•</span>
              <span>{it.label}</span>
              {it.required && <span className="text-[9px] text-red-500 font-bold">REQ</span>}
            </div>
          ))}
        </div>
        {(can("checklists", "update") || can("checklists", "delete")) && (
          <div className="mt-3 flex items-center gap-4">
            {can("checklists", "update") && <button onClick={onEdit} className="text-xs font-semibold text-slate-700 flex items-center gap-1"><Pencil className="w-3.5 h-3.5" /> Edit</button>}
            {can("checklists", "delete") && <button onClick={remove} className="text-xs font-semibold text-red-600 flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Delete</button>}
          </div>
        )}
      </div>
    );
  }

  if (loading) return <div className="bg-white rounded-2xl p-4 border border-slate-100 text-sm text-slate-400">Loading...</div>;

  const total = entry?.items?.length || 0;
  const doneCount = (entry?.items || []).filter((i) => i.done).length;
  const pct = entry?.completed_pct || 0;

  // Completed for today → collapses; a fresh checklist appears tomorrow (new date = new entry)
  if (pct === 100 && entry) {
    return (
      <div className="bg-green-50 rounded-2xl p-4 border border-green-100 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-green-800 text-sm">{template.name}</h3>
          <p className="text-[11px] text-green-600">✓ Completed for today — fresh checklist tomorrow</p>
        </div>
        <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-semibold text-slate-900 text-sm">{template.name}</h3>
          <p className="text-[11px] text-slate-400">{new Date().toLocaleDateString()}{isAdmin && template.manager_name ? ` · ${template.manager_name}` : ""}</p>
        </div>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${pct === 100 ? "bg-green-100 text-green-700" : pct > 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>{pct}%</span>
      </div>
      <div className="space-y-2">
        {(entry?.items || []).map((it, idx) => (
          <button key={idx} onClick={() => toggle(idx)} className="flex items-center gap-3 w-full text-left">
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${it.done ? "bg-green-500 border-green-500" : "border-slate-300"}`}>
              {it.done && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
            </div>
            <span className={`text-sm flex-1 ${it.done ? "line-through text-slate-400" : "text-slate-700"}`}>{it.label}</span>
            {template.items?.[idx]?.required && <span className="text-[9px] font-bold text-red-500">REQ</span>}
          </button>
        ))}
      </div>
      <div className="mt-3 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-green-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[11px] text-slate-400 mt-1">{doneCount}/{total} done</p>
      {(can("checklists", "update") || can("checklists", "delete")) && (
        <div className="mt-3 flex items-center gap-4 border-t border-slate-100 pt-2">
          {can("checklists", "update") && <button onClick={onEdit} className="text-xs font-semibold text-slate-700 flex items-center gap-1"><Pencil className="w-3.5 h-3.5" /> Edit</button>}
          {can("checklists", "delete") && <button onClick={remove} className="text-xs font-semibold text-red-600 flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Delete</button>}
        </div>
      )}
    </div>
  );
}