import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useLang } from "@/lib/i18n";
import { usePermissions } from "@/hooks/usePermissions";
import { Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import SheetExport from "@/components/reports/SheetExport";

export default function Reports() {
  const { t } = useLang();
  const { can } = usePermissions();
  const [tab, setTab] = useState("tasks");
  const [me, setMe] = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [u, userRes] = await Promise.all([
          base44.auth.me(),
          base44.entities.User.list({ limit: 100 }),
        ]);
        setMe(u);
        setUsers((userRes.items || []).filter((x) => ["manager", "tailoring_manager", "tailoring_operator", "admin", "mis"].includes(x.role)));
      } catch (e) { console.error(e); }
    })();
  }, []);

  const isAdmin = me && ["owner", "admin"].includes(me.role);
  const isReviewer = me && ["owner", "admin", "mis"].includes(me.role);
  const tabs = [["tasks", t("taskReport")], ["notdone", "Not Done"], ["tailor", t("tailorReport")], ["checklists", t("checklistReport")]];
  if (isReviewer) tabs.push(["scorecard", "Scorecard"]);
  if (can("reports", "export")) tabs.push(["sheet", "Sheet Export"]);
  if (isAdmin) tabs.push(["data", "Manage Data"]);

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold text-slate-900">{t("reports")}</h2>
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {tabs.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap font-medium ${tab === k ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>{label}</button>
        ))}
      </div>
      {tab === "tasks" && <TaskReport users={users} />}
      {tab === "notdone" && <NotDoneReport users={users} />}
      {tab === "tailor" && <TailorReport />}
      {tab === "checklists" && <ChecklistReport users={users} />}
      {tab === "scorecard" && isReviewer && <Scorecard users={users} />}
      {tab === "sheet" && can("reports", "export") && <SheetExport />}
      {tab === "data" && isAdmin && <DeletePriorData />}
    </div>
  );
}

function storeQuery() {
  const storeId = localStorage.getItem("klassic_store");
  return storeId && storeId !== "all" ? { store_id: storeId } : {};
}

function Scorecard({ users }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const q = { ...storeQuery(), active: { $ne: true } };
        const [totalAgg, completedAgg, onTimeAgg, escAgg] = await Promise.all([
          base44.entities.Task.aggregate({ query: q, groupBy: "assigned_to_id", count: true, limit: 100 }),
          base44.entities.Task.aggregate({ query: { ...q, status: { $in: ["Done", "Approved"] } }, groupBy: "assigned_to_id", count: true, avg: "variance_minutes", limit: 100 }),
          base44.entities.Task.aggregate({ query: { ...q, on_time: true }, groupBy: "assigned_to_id", count: true, limit: 100 }),
          base44.entities.Task.aggregate({ query: { ...q, variance_minutes: { $gt: 0 } }, groupBy: "assigned_to_id", count: true, limit: 100 }),
        ]);
        const nameMap = {};
        (users || []).forEach((u) => { nameMap[u.id] = u.full_name || u.email; });
        const completedMap = {}; const varMap = {}; const onTimeMap = {}; const escMap = {};
        (completedAgg.rows || []).forEach((r) => { completedMap[r.assigned_to_id] = r.count; varMap[r.assigned_to_id] = r.avg_variance_minutes; });
        (onTimeAgg.rows || []).forEach((r) => { onTimeMap[r.assigned_to_id] = r.count; });
        (escAgg.rows || []).forEach((r) => { escMap[r.assigned_to_id] = r.count; });
        const out = (totalAgg.rows || []).map((r) => {
          const uid = r.assigned_to_id;
          const completed = completedMap[uid] || 0;
          const onTime = onTimeMap[uid] || 0;
          const escalation = escMap[uid] || 0;
          const variance = varMap[uid];
          const onTimePct = completed ? Math.round((onTime / completed) * 100) : 0;
          return { uid, name: nameMap[uid] || "Unassigned", total: r.count, completed, onTime, escalation, onTimePct, variance };
        }).filter((r) => r.uid).sort((a, b) => b.onTimePct - a.onTimePct);
        setRows(out);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [users]);

  const fmtVariance = (v) => {
    if (v == null || isNaN(v)) return "—";
    if (Math.abs(v) < 1) return "On time";
    const hrs = Math.abs(v) / 60;
    return `${hrs.toFixed(1)}h ${v > 0 ? "late" : "early"}`;
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">On-time completion, escalations (late tasks) and avg variance per manager.</p>
      {loading ? <div className="text-center text-slate-400 text-sm py-4">Loading...</div>
        : rows.length === 0 ? <p className="text-center text-slate-400 text-sm py-4">No data</p>
        : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.uid} className="bg-white rounded-2xl p-4 border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-800">{r.name}</span>
                  <span className="text-[11px] text-slate-400">{r.total} task(s)</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div><p className="text-lg font-bold text-green-700">{r.onTimePct}%</p><p className="text-[10px] text-slate-500">On-time</p></div>
                  <div><p className="text-lg font-bold text-red-600">{r.escalation}</p><p className="text-[10px] text-slate-500">Escalations</p></div>
                  <div><p className="text-sm font-bold text-slate-800 leading-6">{fmtVariance(r.variance)}</p><p className="text-[10px] text-slate-500">Variance</p></div>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Completed: {r.completed}</span>
                  <span>On-time: {r.onTime}</span>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

function PeriodToggle({ unit, setUnit }) {
  const { t } = useLang();
  return (
    <div className="flex gap-2">
      {[["day", t("daily")], ["month", t("monthly")]].map(([u, l]) => (
        <button key={u} onClick={() => setUnit(u)} className={`text-xs px-3 py-1.5 rounded-full font-medium ${unit === u ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>{l}</button>
      ))}
    </div>
  );
}

function ManagerFilter({ users, value, onChange }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="text-xs px-3 py-1.5 rounded-full border border-slate-200 bg-white max-w-[160px]">
      <option value="all">All Managers</option>
      {users.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
    </select>
  );
}

function TaskReport({ users }) {
  const { t } = useLang();
  const [unit, setUnit] = useState("day");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [managerId, setManagerId] = useState("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const q = { ...storeQuery(), active: { $ne: true } };
        if (managerId !== "all") q.assigned_to_id = managerId;
        const [totalAgg, doneAgg] = await Promise.all([
          base44.entities.Task.aggregate({ query: { ...q, status: { $ne: "Cancelled" } }, dateBucket: { field: "due_date", unit }, count: true, limit: 60 }),
          base44.entities.Task.aggregate({ query: { ...q, status: { $in: ["Done", "Approved"] } }, dateBucket: { field: "due_date", unit }, count: true, limit: 60 }),
        ]);
        const doneMap = {};
        (doneAgg.rows || []).forEach((r) => { doneMap[r.due_date] = r.count; });
        setRows((totalAgg.rows || []).map((r) => ({ key: r.due_date, count: r.count, done: doneMap[r.due_date] || 0, missed: r.count - (doneMap[r.due_date] || 0) })).sort((a, b) => b.key.localeCompare(a.key)));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [unit, managerId]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <PeriodToggle unit={unit} setUnit={setUnit} />
        <ManagerFilter users={users} value={managerId} onChange={setManagerId} />
      </div>
      {loading ? <div className="text-center text-slate-400 text-sm py-4">Loading...</div>
        : rows.length === 0 ? <p className="text-center text-slate-400 text-sm py-4">No data</p>
        : (
          <div className="space-y-2">
            {rows.map((r) => {
              const pct = r.count ? Math.round((r.done / r.count) * 100) : 0;
              const label = unit === "day" ? new Date(r.key).toLocaleDateString() : r.key.slice(0, 7);
              return (
                <div key={r.key} className="bg-white rounded-2xl p-4 border border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-800">{label}</span>
                    <span className="text-xs text-slate-500">{r.done}/{r.count}{r.missed > 0 ? ` · ${r.missed} missed` : ""}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-600 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[11px] mt-1">{r.missed > 0 ? <span className="text-red-600 font-medium">{r.missed} not done</span> : <span className="text-slate-400">{t("completed")}: {pct}%</span>}</p>
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}

function NotDoneReport({ users }) {
  const { t } = useLang();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [managerId, setManagerId] = useState("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const q = { ...storeQuery(), active: { $ne: true }, status: { $nin: ["Done", "Approved", "Cancelled", "Rejected"] }, due_date: { $lt: new Date().toISOString() } };
        if (managerId !== "all") q.assigned_to_id = managerId;
        const res = await base44.entities.Task.filter(q, { sort: "-due_date", limit: 100, fields: ["title", "assigned_to_id", "assigned_to_name", "due_date", "status", "store_name"] });
        const nameMap = {};
        (users || []).forEach((u) => { nameMap[u.id] = u.full_name || u.email; });
        setRows((res.items || []).map((r) => ({ ...r, _name: nameMap[r.assigned_to_id] || r.assigned_to_name || "Unassigned" })));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [managerId, users]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs text-slate-500">Tasks past their deadline, not completed — removed from today's view.</p>
        <ManagerFilter users={users} value={managerId} onChange={setManagerId} />
      </div>
      {loading ? <div className="text-center text-slate-400 text-sm py-4">Loading...</div>
        : rows.length === 0 ? <p className="text-center text-slate-400 text-sm py-4">No missed tasks</p>
        : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl p-3 border border-red-100">
                <p className="text-sm font-semibold text-slate-800">{r.title}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[11px] text-slate-500">{r._name}{r.store_name ? ` · ${r.store_name}` : ""}</span>
                  <span className="text-[11px] text-red-600 font-medium">Due {r.due_date ? new Date(r.due_date).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

function TailorReport() {
  const { t } = useLang();
  const [unit, setUnit] = useState("month");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const q = storeQuery();
        const [pantsAgg, onTimeAgg, alterAgg] = await Promise.all([
          base44.entities.PantStitch.aggregate({ query: { ...q, status: { $in: ["Completed", "Delivered"] } }, dateBucket: { field: "completed_at", unit }, count: true, limit: 60 }),
          base44.entities.PantStitch.aggregate({ query: { ...q, on_time: true }, dateBucket: { field: "completed_at", unit }, count: true, limit: 60 }),
          base44.entities.Alteration.aggregate({ query: { ...q, status: { $in: ["Completed", "Delivered"] } }, dateBucket: { field: "completed_at", unit }, count: true, limit: 60 }),
        ]);
        const onTimeMap = {}; (onTimeAgg.rows || []).forEach((r) => { onTimeMap[r.completed_at] = r.count; });
        const alterMap = {}; (alterAgg.rows || []).forEach((r) => { alterMap[r.completed_at] = r.count; });
        const pantsMap = {}; (pantsAgg.rows || []).forEach((r) => { pantsMap[r.completed_at] = r.count; });
        const keys = [...new Set([...Object.keys(onTimeMap), ...Object.keys(pantsMap), ...Object.keys(alterMap)])].sort().reverse();
        setRows(keys.map((k) => ({ key: k, pants: pantsMap[k] || 0, onTime: onTimeMap[k] || 0, alter: alterMap[k] || 0 })));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [unit]);

  return (
    <div className="space-y-3">
      <PeriodToggle unit={unit} setUnit={setUnit} />
      {loading ? <div className="text-center text-slate-400 text-sm py-4">Loading...</div>
        : rows.length === 0 ? <p className="text-center text-slate-400 text-sm py-4">No data</p>
        : (
          <div className="space-y-2">
            {rows.map((r) => {
              const onTimePct = r.pants ? Math.round((r.onTime / r.pants) * 100) : 0;
              const label = unit === "day" ? new Date(r.key).toLocaleDateString() : r.key.slice(0, 7);
              return (
                <div key={r.key} className="bg-white rounded-2xl p-4 border border-slate-100">
                  <p className="text-sm font-semibold text-slate-800 mb-2">{label}</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div><p className="text-lg font-bold text-slate-900">{r.pants}</p><p className="text-[10px] text-slate-500">{t("pantsDone")}</p></div>
                    <div><p className="text-lg font-bold text-green-700">{r.onTime}</p><p className="text-[10px] text-slate-500">{t("onTime")}</p></div>
                    <div><p className="text-lg font-bold text-purple-700">{r.alter}</p><p className="text-[10px] text-slate-500">{t("alterations")}</p></div>
                  </div>
                  <div className="mt-2 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-600 rounded-full" style={{ width: `${onTimePct}%` }} />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{t("onTime")}: {onTimePct}%</p>
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}

function ChecklistReport({ users }) {
  const { t } = useLang();
  const [unit, setUnit] = useState("day");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [managerId, setManagerId] = useState("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const q = { ...storeQuery() };
        const periodField = unit === "day" ? "date" : "month";
        let aggRows = [];
        if (managerId === "all") {
          const agg = await base44.entities.ChecklistEntry.aggregate({ query: q, groupBy: [periodField, "manager_id"], avg: "completed_pct", count: true, limit: 300 });
          aggRows = agg.rows || [];
        } else {
          q.manager_id = managerId;
          const agg = await base44.entities.ChecklistEntry.aggregate({ query: q, groupBy: periodField, avg: "completed_pct", count: true, sort: `-${periodField}`, limit: 60 });
          aggRows = (agg.rows || []).map((r) => ({ ...r, manager_id: managerId }));
        }
        const nameMap = {};
        (users || []).forEach((u) => { nameMap[u.id] = u.full_name || u.email; });
        const periods = {};
        aggRows.forEach((r) => {
          const p = r[periodField];
          if (!p) return;
          if (!periods[p]) periods[p] = { period: p, rows: [] };
          periods[p].rows.push({ manager_id: r.manager_id, name: nameMap[r.manager_id] || r.manager_name || "—", pct: Math.round(r.avg_completed_pct || 0), count: r.count });
        });
        setRows(Object.values(periods).sort((a, b) => b.period.localeCompare(a.period)));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [unit, managerId, users]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <PeriodToggle unit={unit} setUnit={setUnit} />
        <ManagerFilter users={users} value={managerId} onChange={setManagerId} />
      </div>
      <p className="text-xs text-slate-500">Day-wise / month-wise completion % per manager.</p>
      {loading ? <div className="text-center text-slate-400 text-sm py-4">Loading...</div>
        : rows.length === 0 ? <p className="text-center text-slate-400 text-sm py-4">No data</p>
        : (
          <div className="space-y-2">
            {rows.map((p) => (
              <div key={p.period} className="bg-white rounded-2xl p-4 border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-800">{unit === "day" ? new Date(p.period).toLocaleDateString() : p.period}</span>
                  <span className="text-xs text-slate-500">{p.rows.length} manager(s)</span>
                </div>
                <div className="space-y-1.5">
                  {p.rows.map((r) => (
                    <div key={r.manager_id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-slate-700 flex-1 truncate">{r.name}</span>
                      <div className="flex items-center gap-2 w-32">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full" style={{ width: `${r.pct}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-slate-700 w-9 text-right">{r.pct}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

function DeletePriorData() {
  const [cutoff, setCutoff] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (entity, query, label) => {
    if (!cutoff) { toast.error("Pick a cutoff date first"); return; }
    if (!window.confirm(`Permanently delete all completed ${label} records before ${cutoff}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      let total = 0; let hasMore = true; let i = 0;
      while (hasMore && i < 10) {
        const res = await base44.entities[entity].deleteMany({ ...query });
        total += res.count || 0;
        hasMore = res.has_more;
        i++;
      }
      toast.success(total > 0 ? `Deleted ${total} ${label} record(s)` : `Completed ${label} records cleared`);
    } catch (e) { toast.error("Failed: " + (e.message || "error")); }
    finally { setBusy(false); }
  };

  const cutoffIso = cutoff ? new Date(cutoff + "T00:00:00").toISOString() : "";
  const buttons = [
    { entity: "Task", label: "Tasks", query: { status: { $in: ["Done", "Approved"] }, completed_at: { $lt: cutoffIso } } },
    { entity: "Alteration", label: "Alterations", query: { status: { $in: ["Completed", "Delivered"] }, completed_at: { $lt: cutoffIso } } },
    { entity: "PantStitch", label: "Pant Stitching", query: { status: { $in: ["Completed", "Delivered"] }, completed_at: { $lt: cutoffIso } } },
    { entity: "ChecklistEntry", label: "Checklist Entries", query: { completed_pct: 100, date: { $lt: cutoff } } },
  ];

  return (
    <div className="space-y-3">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-2">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700">Permanently deletes completed records older than the cutoff date. Only Done/Approved/Delivered records are removed — active records are kept. This cannot be undone.</p>
      </div>
      <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-3">
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Delete completed records before</label>
          <input type="date" value={cutoff} onChange={(e) => setCutoff(e.target.value)} className="input" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {buttons.map((b) => (
            <button key={b.entity} disabled={busy || !cutoff} onClick={() => run(b.entity, b.query, b.label)} className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-semibold border border-red-200 bg-red-50 text-red-700 disabled:opacity-50">
              <Trash2 className="w-4 h-4" /> Delete {b.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}