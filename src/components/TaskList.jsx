import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useLang } from "@/lib/i18n";
import { usePermissions } from "@/hooks/usePermissions";
import { Plus, Clock, CheckCircle2, AlertTriangle } from "lucide-react";

const priorityColors = {
  Urgent: "bg-red-100 text-red-700",
  High: "bg-orange-100 text-orange-700",
  Medium: "bg-blue-100 text-blue-700",
  Low: "bg-slate-100 text-slate-600",
};

const statusColors = {
  Pending: "bg-amber-100 text-amber-700",
  "In Progress": "bg-blue-100 text-blue-700",
  Done: "bg-purple-100 text-purple-700",
  Approved: "bg-green-100 text-green-700",
  Rejected: "bg-red-100 text-red-700",
  Overdue: "bg-red-100 text-red-700",
};

export default function TaskList({ scope = "all" }) {
  // scope: "all" (owner/mis) or "mine" (manager)
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState("active");
  const [loading, setLoading] = useState(true);
  const { t } = useLang();
  const [me, setMe] = useState(null);
  const { can } = usePermissions();

  useEffect(() => {
    (async () => {
      try {
        const user = await base44.auth.me();
        setMe(user);
        loadTasks(user);
      } catch (e) { console.error(e); setLoading(false); }
    })();
  }, []);

  const loadTasks = async (user) => {
    try {
      const storeId = localStorage.getItem("klassic_store") || "all";
      const query = { active: { $ne: true } };
      if (scope === "mine") {
        query.assigned_to_id = user.id;
      } else if (storeId !== "all") {
        query.store_id = storeId;
      }
      const res = await base44.entities.Task.filter(query, { sort: "-due_date", limit: 50 });
      setTasks(res.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const isToday = (iso) => {
    if (!iso) return false;
    const d = new Date(iso);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  };

  const isPastDue = (task) => task.due_date && new Date(task.due_date) < new Date() && !["Done", "Approved", "Cancelled", "Rejected"].includes(task.status);

  const filtered = tasks.filter((task) => {
    if (filter === "active") {
      if (["Done", "Approved", "Cancelled", "Rejected"].includes(task.status)) return false;
      if (task.start_date && new Date(task.start_date) > new Date()) return false;
      if (isPastDue(task)) return false;
      return true;
    }
    if (filter === "all") return true;
    if (filter === "done") return task.status === "Done" && isToday(task.completed_at || task.due_date);
    if (filter === "approved") return task.status === "Approved" && isToday(task.approved_at || task.completed_at || task.due_date);
    if (filter === "overdue") return isPastDue(task);
    if (isPastDue(task)) return false;
    return task.status.toLowerCase().replace(" ", "") === filter;
  });

  const canCreate = can("tasks", "create");

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">{scope === "mine" ? t("myTasks") : t("todayTasks")}</h2>
        {canCreate && (
          <Link to="/tasks/new" className="flex items-center gap-1 bg-slate-900 text-white text-sm font-semibold px-3 py-2 rounded-xl">
            <Plus className="w-4 h-4" /> {t("newTask")}
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {["active", "pending", "inprogress", "done", "approved", "overdue"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap font-medium ${filter === f ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200"}`}
          >
            {f === "active" ? t("active") : f === "inprogress" ? t("inProgress") : t(f)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm">{t("noTasks")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((task) => (
            <Link
              key={task.id}
              to={`/tasks/${task.id}`}
              className="block bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-slate-900 text-sm leading-snug flex-1">{task.title}</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${priorityColors[task.priority] || ""}`}>
                  {task.priority}
                </span>
              </div>
              {task.assigned_to_name && scope !== "mine" && (
                <p className="text-xs text-slate-500 mt-1">{t("assignTo")}: {task.assigned_to_name}</p>
              )}
              <div className="flex items-center justify-between mt-2">
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusColors[task.status] || ""}`}>
                  {t(task.status?.toLowerCase()?.replace(/\s/g, "")) || task.status}
                </span>
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  {task.due_date && <Clock className="w-3 h-3" />}
                  <span>{task.due_date ? new Date(task.due_date).toLocaleString([], { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" }) : ""}</span>
                </div>
              </div>
              {task.location_tag && (
                <p className="text-[11px] text-slate-400 mt-1.5">📍 {task.location_tag}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}