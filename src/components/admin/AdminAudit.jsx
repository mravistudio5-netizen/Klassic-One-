import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";

const MODULES = ["All", "Tasks", "Sheets", "Tailor", "Auth"];

export default function AdminAudit() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mod, setMod] = useState("All");

  const load = async (module) => {
    setLoading(true);
    try {
      const query = module === "All" ? {} : { module };
      const res = await base44.entities.AuditLog.filter(query, { sort: "-created_date", limit: 50 });
      setLogs(res.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(mod); }, [mod]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {MODULES.map((m) => (
          <button
            key={m}
            onClick={() => setMod(m)}
            className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap font-medium ${mod === m ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200"}`}
          >
            {m}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
      ) : logs.length === 0 ? (
        <p className="text-center text-sm text-slate-400 py-12">No activity logged.</p>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="bg-white rounded-2xl p-3 border border-slate-100">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-900">{log.action}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{log.module}</span>
              </div>
              {log.entity_name && <p className="text-xs text-slate-600 mt-1">{log.entity_name}</p>}
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[11px] text-slate-400">{log.actor_name || "system"}</span>
                <span className="text-[11px] text-slate-400">
                  {log.created_date ? new Date(log.created_date).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}