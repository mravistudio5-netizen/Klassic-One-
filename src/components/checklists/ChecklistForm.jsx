import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useLang } from "@/lib/i18n";
import { X, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function ChecklistForm({ stores, managers, editTemplate, onClose, onDone }) {
  const { t } = useLang();
  const [me, setMe] = useState(null);
  const [form, setForm] = useState(() => editTemplate
    ? {
        name: editTemplate.name || "",
        store_id: editTemplate.store_id || "",
        manager_id: editTemplate.manager_id || "",
        all_managers: !!editTemplate.all_managers,
        items: (editTemplate.items || []).map((it) => ({ label: it.label, required: !!it.required })),
      }
    : {
        name: "",
        store_id: "",
        manager_id: "",
        all_managers: false,
        items: [{ label: "", required: false }],
      });

  useEffect(() => { base44.auth.me().then(setMe).catch(() => {}); }, []);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const updateItem = (i, k, v) => setForm((f) => ({ ...f, items: f.items.map((it, idx) => idx === i ? { ...it, [k]: v } : it) }));
  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { label: "", required: false }] }));
  const removeItem = (i) => setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));

  const save = async () => {
    if (!form.name.trim()) { toast.error("Name required"); return; }
    if (!form.store_id) { toast.error("Store required"); return; }
    const items = form.items.filter((it) => it.label.trim()).map((it) => ({ label: it.label.trim(), required: !!it.required }));
    if (items.length === 0) { toast.error("At least one item required"); return; }
    try {
      const store = stores.find((s) => s.id === form.store_id);
      const manager = managers.find((m) => m.id === form.manager_id);
      const payload = {
        name: form.name.trim(),
        store_id: form.store_id,
        store_name: store?.name,
        manager_id: form.all_managers ? "" : (form.manager_id || ""),
        manager_name: form.all_managers ? "" : (manager?.full_name || ""),
        all_managers: form.all_managers,
        items,
      };
      if (editTemplate) {
        await base44.entities.Checklist.update(editTemplate.id, payload);
        await base44.entities.AuditLog.create({
          module: "Tasks",
          action: "Checklist Updated",
          entity_id: editTemplate.id,
          entity_name: form.name.trim(),
          actor_id: me?.id,
          actor_name: me?.full_name,
          store_id: form.store_id,
          details: `${items.length} items · ${form.all_managers ? t("allManagers") : manager?.full_name || "—"}`,
        });
        toast.success("Checklist updated");
      } else {
        await base44.entities.Checklist.create({
          ...payload,
          active: true,
          created_by_id: me?.id,
          created_by_name: me?.full_name,
        });
        await base44.entities.AuditLog.create({
          module: "Tasks",
          action: "Checklist Created",
          entity_name: form.name.trim(),
          actor_id: me?.id,
          actor_name: me?.full_name,
          store_id: form.store_id,
          details: `${items.length} items · ${form.all_managers ? t("allManagers") : manager?.full_name || "—"}`,
        });
        toast.success("Checklist created");
      }
      onDone();
    } catch (e) { toast.error("Failed"); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-3 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-slate-900">{editTemplate ? "Edit Checklist" : t("newChecklist")}</h3>
          <button onClick={onClose} className="text-slate-400"><X className="w-5 h-5" /></button>
        </div>

        <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Checklist name (e.g. Opening Checklist)" className="input" />

        <select value={form.store_id} onChange={(e) => set("store_id", e.target.value)} className="input">
          <option value="">Select store</option>
          {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={form.all_managers} onChange={(e) => set("all_managers", e.target.checked)} className="w-4 h-4" />
          {t("allManagers")}
        </label>

        {!form.all_managers && (
          <select value={form.manager_id} onChange={(e) => set("manager_id", e.target.value)} className="input">
            <option value="">Select manager</option>
            {managers.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
          </select>
        )}

        <div>
          <p className="text-xs font-semibold text-slate-500 mb-1.5">{t("checklist")} {t("checklist") && ""}</p>
          <div className="space-y-2">
            {form.items.map((it, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  value={it.label}
                  onChange={(e) => updateItem(idx, "label", e.target.value)}
                  placeholder="Item label"
                  className="input flex-1"
                />
                <label className="flex items-center gap-1 text-[10px] text-slate-500 whitespace-nowrap">
                  <input type="checkbox" checked={it.required} onChange={(e) => updateItem(idx, "required", e.target.checked)} className="w-4 h-4" />
                  REQ
                </label>
                <button onClick={() => removeItem(idx)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
          <button onClick={addItem} className="mt-2 text-xs font-semibold text-green-700 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> {t("addChecklistItem")}</button>
        </div>

        <button onClick={save} className="w-full bg-slate-900 text-white text-sm font-semibold py-3.5 rounded-xl">{t("save")}</button>
      </div>
    </div>
  );
}