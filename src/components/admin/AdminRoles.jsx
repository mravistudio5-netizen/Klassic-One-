import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, X, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { MODULES, ACTIONS, defaultMatrixForRole, modulesFromMatrix } from "@/lib/permissions";
import { clearPermissionsCache } from "@/hooks/usePermissions";

const ROLES = ["owner", "admin", "mis", "manager", "tailoring_manager", "tailoring_operator"];
const ACTION_LABELS = { create: "CREATE", read: "READ", update: "UPDATE", delete: "DELETE", export: "EXPORT" };

export default function AdminRoles() {
  const [perms, setPerms] = useState({});
  const [selected, setSelected] = useState("manager");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  const load = async () => {
    try {
      const res = await base44.entities.RolePermission.filter({}, { limit: 50 });
      const map = {};
      (res.items || []).forEach((p) => { map[p.role] = p; });
      setPerms(map);
    } catch (e) { toast.error("Failed to load"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const matrixFor = (role) => {
    const p = perms[role];
    if (p?.matrix && Object.keys(p.matrix).length) return p.matrix;
    return defaultMatrixForRole(role);
  };

  const save = async (role, matrix) => {
    setBusy(role);
    const modules = modulesFromMatrix(matrix) || [];
    const existing = perms[role];
    try {
      if (existing?.id) {
        const updated = await base44.entities.RolePermission.update(existing.id, { matrix, modules });
        setPerms({ ...perms, [role]: updated });
      } else {
        const created = await base44.entities.RolePermission.create({ role, matrix, modules, can_assign_cross_department: false });
        setPerms({ ...perms, [role]: created });
      }
      clearPermissionsCache();
      toast.success("Permission updated");
    } catch (e) { toast.error("Failed"); }
    finally { setBusy(null); }
  };

  const toggle = (role, modKey, action) => {
    const matrix = JSON.parse(JSON.stringify(matrixFor(role)));
    if (!matrix[modKey]) matrix[modKey] = {};
    matrix[modKey][action] = !matrix[modKey][action];
    save(role, matrix);
  };

  const toggleCross = async (role) => {
    setBusy(role + "cross");
    const existing = perms[role];
    const val = !(existing?.can_assign_cross_department);
    try {
      if (existing?.id) {
        const updated = await base44.entities.RolePermission.update(existing.id, { can_assign_cross_department: val });
        setPerms({ ...perms, [role]: updated });
      } else {
        const dm = defaultMatrixForRole(role);
        const created = await base44.entities.RolePermission.create({ role, matrix: dm, modules: modulesFromMatrix(dm) || [], can_assign_cross_department: val });
        setPerms({ ...perms, [role]: created });
      }
      clearPermissionsCache();
      toast.success("Updated");
    } catch (e) { toast.error("Failed"); }
    finally { setBusy(null); }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>;

  const matrix = selected ? matrixFor(selected) : null;

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {ROLES.map((r) => (
          <button key={r} onClick={() => setSelected(r)} className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap font-medium capitalize ${selected === r ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>{r}</button>
        ))}
      </div>

      {!selected ? (
        <div className="text-center py-10 text-slate-400 text-sm">Select a role to edit its permissions.</div>
      ) : (
        <div className="rounded-3xl overflow-hidden" style={{ backgroundColor: "#0B4C33" }}>
          <div className="flex items-center justify-between px-5 pt-5">
            <h3 className="text-lg font-bold text-white capitalize flex items-center gap-2"><ShieldCheck className="w-5 h-5" /> System Role: {selected}</h3>
            <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-full border border-white/40 text-white flex items-center justify-center"><X className="w-4 h-4" /></button>
          </div>
          <div className="px-5 pt-1 pb-3">
            <p className="text-[11px] font-semibold tracking-[0.2em] text-white/70">PERMISSION MATRIX</p>
            <p className="text-xs text-white/60">Tap to toggle. Empty modules grant no access.</p>
          </div>

          <div className="px-3 pb-3 space-y-2.5">
            {MODULES.map((mod) => {
              const row = matrix[mod.key] || {};
              return (
                <div key={mod.key} className="rounded-2xl p-3.5" style={{ backgroundColor: "#135D43" }}>
                  <p className="text-sm font-bold text-white mb-2.5">{mod.label}</p>
                  <div className="flex flex-wrap gap-2">
                    {ACTIONS.map((a) => {
                      const on = !!row[a];
                      return (
                        <button
                          key={a}
                          onClick={() => toggle(selected, mod.key, a)}
                          disabled={busy === selected}
                          className="text-[11px] font-semibold tracking-wide px-3 py-1.5 rounded-lg transition-colors text-white"
                          style={on ? { backgroundColor: "#2C7A63", border: "1px solid #FFFFFF" } : { backgroundColor: "#0E4D38", border: "1px solid transparent" }}
                        >
                          {ACTION_LABELS[a]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-5 pb-5 pt-1">
            <button onClick={() => toggleCross(selected)} disabled={busy === selected + "cross"} className="w-full flex items-center justify-between rounded-2xl px-4 py-3" style={{ backgroundColor: "#135D43" }}>
              <span className="text-sm font-semibold text-white">Assign cross-department</span>
              <span className={`w-11 h-6 rounded-full relative transition-colors ${perms[selected]?.can_assign_cross_department ? "bg-emerald-400" : "bg-white/20"}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${perms[selected]?.can_assign_cross_department ? "left-[22px]" : "left-0.5"}`} />
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}