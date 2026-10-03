import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useLang } from "@/lib/i18n";
import { usePermissions } from "@/hooks/usePermissions";
import { Plus, ListChecks } from "lucide-react";
import ChecklistForm from "@/components/checklists/ChecklistForm";
import ChecklistTickCard from "@/components/checklists/ChecklistTickCard";

export default function Checklists() {
  const { t } = useLang();
  const { can } = usePermissions();
  const [me, setMe] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [managers, setManagers] = useState([]);
  const [stores, setStores] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeStoreId, setActiveStoreId] = useState(localStorage.getItem("klassic_store") || "all");

  const load = useCallback(async () => {
    try {
      const user = await base44.auth.me();
      setMe(user);
      const role = user.role === "admin" ? "owner" : user.role;
      const storeRes = await base44.entities.Store.filter({ active: true }, { limit: 50 });
      setStores(storeRes.items || []);

      if (role === "manager") {
        const q = { active: true, $or: [{ manager_id: user.id }, { all_managers: true }] };
        if (activeStoreId !== "all") q.store_id = activeStoreId;
        const res = await base44.entities.Checklist.filter(q, { limit: 50, sort: "-created_date" });
        setTemplates(res.items || []);
      } else {
        const q = { active: true };
        if (activeStoreId !== "all") q.store_id = activeStoreId;
        const res = await base44.entities.Checklist.filter(q, { limit: 100, sort: "-created_date" });
        setTemplates(res.items || []);
        const userRes = await base44.entities.User.list({ limit: 100 });
        setManagers((userRes.items || []).filter((u) => u.role === "manager"));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [activeStoreId]);

  useEffect(() => { load(); }, [load]);

  if (!me) return <div className="p-4 text-center text-slate-400 text-sm">Loading...</div>;
  const role = me.role === "admin" ? "owner" : me.role;
  const isAdmin = ["owner", "mis"].includes(role);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">{t("checklists")}</h2>
        {can("checklists", "create") && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1 bg-slate-900 text-white text-sm font-semibold px-3 py-2 rounded-xl">
            <Plus className="w-4 h-4" /> {t("newChecklist")}
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center text-slate-400 text-sm py-8">Loading...</div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <ListChecks className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No checklists</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((tpl) => (
            <ChecklistTickCard key={tpl.id} template={tpl} me={me} isAdmin={isAdmin} onReload={load} onEdit={() => setEditing(tpl)} />
          ))}
        </div>
      )}

      {showForm && (
        <ChecklistForm
          stores={stores}
          managers={managers}
          onClose={() => setShowForm(false)}
          onDone={() => { setShowForm(false); load(); }}
        />
      )}

      {editing && (
        <ChecklistForm
          stores={stores}
          managers={managers}
          editTemplate={editing}
          onClose={() => setEditing(null)}
          onDone={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}