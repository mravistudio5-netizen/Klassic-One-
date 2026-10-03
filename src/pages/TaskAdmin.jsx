import React, { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Calendar, Repeat, Clock, Power, Loader2, User as UserIcon, Plus, Pencil, Trash2, MapPin } from "lucide-react";
import { toast } from "sonner";

const SHIFT_TIMES = { Morning: "09:00", Afternoon: "13:00", Opening: "10:00", Closing: "21:00", Nightly: "23:59", None: "10:00" };

function nextAppearance(tpl) {
  const rt = tpl.repeat_type || "None";
  if (rt === "None") return "Manual only";
  const now = new Date();
  const time = SHIFT_TIMES[tpl.shift] || "10:00";
  const [hh, mm] = time.split(":");
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const name = dayNames[d.getDay()];
    let match = false;
    if (rt === "Daily") match = true;
    else if (rt === "Weekdays") match = ["Mon", "Tue", "Wed", "Thu", "Fri"].includes(name);
    else if (rt === "Weekly") match = (tpl.repeat_days || []).includes(name);
    else if (rt === "Monthly") {
      const startDay = tpl.start_date ? new Date(tpl.start_date).getDate() : 1;
      match = d.getDate() === startDay;
    }
    if (match) {
      d.setHours(Number(hh), Number(mm), 0, 0);
      if (d > now) return d.toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    }
  }
  return "—";
}

export default function TaskAdmin() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const canEdit = user && ["owner", "admin", "mis"].includes(user.role);
  const canDelete = user && ["owner", "admin"].includes(user.role);

  const load = async () => {
    try {
      const res = await base44.entities.Task.filter({ template_name: { $exists: true, $ne: "" } }, { limit: 200 });
      setTemplates(res.items || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (tpl) => {
    if (!canEdit) { toast.error("Only admins can change active status"); return; }
    setToggling(tpl.id);
    try {
      await base44.entities.Task.update(tpl.id, { active: !tpl.active });
      setTemplates(templates.map((t) => (t.id === tpl.id ? { ...t, active: !t.active } : t)));
      toast.success(tpl.active ? "Template paused" : "Template activated");
    } catch (e) { toast.error("Failed"); }
    finally { setToggling(null); }
  };

  const handleDelete = async (tpl) => {
    if (!window.confirm(`Delete template "${tpl.template_name}"? This cannot be undone.`)) return;
    setDeleting(tpl.id);
    try {
      await base44.entities.Task.delete(tpl.id);
      setTemplates(templates.filter((t) => t.id !== tpl.id));
      toast.success("Template deleted");
    } catch (e) { toast.error("Failed: " + (e.message || "error")); }
    finally { setDeleting(null); }
  };

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Task Administration</h2>
          <p className="text-sm text-slate-500">Recurring task templates · active templates generate daily tasks automatically</p>
        </div>
        {canEdit && (
          <button onClick={() => navigate("/tasks/new?template=1")} className="flex items-center gap-1 text-xs font-semibold text-white bg-green-700 px-3 py-2 rounded-full shrink-0">
            <Plus className="w-4 h-4" /> New Template
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-8">Loading...</div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p className="text-sm">No templates yet.</p>
          {canEdit && (
            <button onClick={() => navigate("/tasks/new?template=1")} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-white bg-green-700 px-3 py-2 rounded-full">
              <Plus className="w-4 h-4" /> Create your first template
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((tpl) => (
            <div key={tpl.id} className="bg-white rounded-2xl p-4 border border-slate-100">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{tpl.template_name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{tpl.title}</p>
                </div>
                <button
                  onClick={() => toggleActive(tpl)}
                  disabled={toggling === tpl.id || !canEdit}
                  className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${tpl.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}
                >
                  {toggling === tpl.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Power className="w-3 h-3" />}
                  {tpl.active ? "Active" : "Inactive"}
                </button>
              </div>
              <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-slate-500">
                <span className="flex items-center gap-1"><Repeat className="w-3 h-3" /> {tpl.repeat_type || "None"}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {tpl.shift || "None"}</span>
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Next: {tpl.active ? nextAppearance(tpl) : "Paused"}</span>
                {tpl.assigned_to_name && <span className="flex items-center gap-1"><UserIcon className="w-3 h-3" /> {tpl.assigned_to_name}</span>}
                {tpl.store_name && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {tpl.store_name}</span>}
              </div>
              {!tpl.active && <p className="text-[11px] text-amber-600 mt-2">Inactive — will not generate tasks.</p>}
              {canEdit && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                  <button onClick={() => navigate(`/tasks/${tpl.id}/edit`)} className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 py-2 rounded-xl">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  {canDelete && (
                    <button onClick={() => handleDelete(tpl)} disabled={deleting === tpl.id} className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold text-red-700 bg-red-50 py-2 rounded-xl disabled:opacity-50">
                      {deleting === tpl.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}