import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useLang } from "@/lib/i18n";
import { CheckSquare, Clock, AlertTriangle, CheckCircle2, Scissors, FileSpreadsheet, TrendingUp, ListChecks } from "lucide-react";

export default function Home() {
  const { user, activeStoreId, modules } = useOutletContext();
  const can = (m) => !modules || modules.includes(m);
  const { t } = useLang();
  const [stats, setStats] = useState({ today: 0, completed: 0, overdue: 0, pending: 0 });
  const [tailorStats, setTailorStats] = useState({ alterActive: 0, stitchActive: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user) return;
      try {
        const storeFilter = activeStoreId === "all" ? {} : { store_id: activeStoreId };
        const taskQuery = { ...storeFilter, active: { $ne: true } };
        if (role === "manager") taskQuery.assigned_to_id = user.id;

        const now = new Date();
        const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
        const todayAgg = await base44.entities.Task.aggregate({ query: { ...taskQuery, due_date: { $gte: startToday, $lt: endToday } }, groupBy: "status", count: true, limit: 20 });
        const tc = {};
        (todayAgg.rows || []).forEach((r) => { tc[r.status] = r.count; });
        const pendingCount = (tc["Pending"] || 0) + (tc["In Progress"] || 0);
        const doneCount = (tc["Done"] || 0) + (tc["Approved"] || 0);
        const overdueCount = await base44.entities.Task.count({ ...taskQuery, status: { $in: ["Pending", "In Progress"] }, due_date: { $lt: startToday } });
        setStats({
          today: pendingCount + doneCount,
          completed: doneCount,
          overdue: overdueCount,
          pending: pendingCount,
        });

        const [alterActive, stitchActive] = await Promise.all([
          base44.entities.Alteration.count({ ...storeFilter, status: { $in: ["Received", "Completed"] } }),
          base44.entities.PantStitch.count({ ...storeFilter, status: { $in: ["Received", "Given to Tailor", "Completed"] } }),
        ]);
        setTailorStats({ alterActive, stitchActive, overdue: 0 });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, activeStoreId]);

  const role = user?.role === "admin" ? "owner" : (user?.role || "manager");
  const isTailorRole = ["tailoring_manager", "tailoring_operator"].includes(role);

  return (
    <div className="p-4 space-y-4">
      <div>
        <p className="text-sm text-slate-500">{t("welcome")}</p>
        <h2 className="text-2xl font-bold text-slate-900">{user?.full_name || "Staff"}</h2>
      </div>

      {!isTailorRole && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={CheckSquare} label={t("todayTasks")} value={stats.today} color="bg-blue-50 text-blue-700" />
            <StatCard icon={Clock} label={t("pending")} value={stats.pending} color="bg-amber-50 text-amber-700" />
            <StatCard icon={AlertTriangle} label={t("overdue")} value={stats.overdue} color="bg-red-50 text-red-700" />
            <StatCard icon={CheckCircle2} label={t("completed")} value={stats.completed} color="bg-green-50 text-green-700" />
          </div>
        </>
      )}

      {isTailorRole && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={Scissors} label={t("alterations")} value={tailorStats.alterActive} color="bg-purple-50 text-purple-700" />
          <StatCard icon={Scissors} label={t("pantStitching")} value={tailorStats.stitchActive} color="bg-indigo-50 text-indigo-700" />
        </div>
      )}

      <div className="pt-2">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Quick Actions</h3>
        <div className="grid grid-cols-3 gap-3">
          {can("myTasks") && <QuickLink to="/my-tasks" icon={CheckSquare} label={t("myTasks")} />}
          {can("tasks") && <QuickLink to="/tasks" icon={CheckSquare} label={t("tasks")} />}
          {can("reports") && <QuickLink to="/reports" icon={TrendingUp} label={t("reports")} />}
          {can("sheets") && <QuickLink to="/sheets" icon={FileSpreadsheet} label={t("sheets")} />}
          {can("tailor") && <QuickLink to="/tailor" icon={Scissors} label={t("tailor")} />}
          {["owner", "mis", "manager"].includes(role) && (
            <QuickLink to="/task-admin" icon={ListChecks} label="Task Admin" />
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color} mb-2`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function QuickLink({ to, icon: Icon, label }) {
  return (
    <a href={to} className="flex flex-col items-center gap-1.5 bg-white rounded-2xl p-3 border border-slate-100 shadow-sm hover:border-slate-300 transition-colors">
      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-[11px] font-medium text-slate-600 text-center leading-tight">{label}</span>
    </a>
  );
}