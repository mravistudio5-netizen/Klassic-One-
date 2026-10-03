import React, { useState } from "react";
import { Flag, Folder, Repeat, Star, MapPin, Save, ChevronDown } from "lucide-react";

const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const CATEGORIES = ["General", "Sales", "Cleaning", "Warehouse", "Security", "Tailoring", "MIS"];

export default function AdvancedOptions({ form, set, onSaveTemplate }) {
  const [openPanel, setOpenPanel] = useState(null);

  const toggle = (panel) => setOpenPanel((p) => (p === panel ? null : panel));

  const setField = (k, v) => set(k, v);

  return (
    <div className="border-t border-slate-100 pt-3">
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
        <span className="text-xs font-semibold text-slate-400 shrink-0">Advanced Options</span>
        <IconBtn icon={Flag} active={form.priority !== "Medium"} onClick={() => toggle("priority")} />
        <IconBtn icon={Folder} active={form.category !== "General"} onClick={() => toggle("category")} />
        <IconBtn icon={Repeat} active={form.repeat_type !== "None"} onClick={() => toggle("repeat")} />
        <IconBtn icon={Star} active={!!form.highlight} onClick={() => setField("highlight", !form.highlight)} />
        <IconBtn icon={MapPin} active={!!form.geo_fence} onClick={() => setField("geo_fence", !form.geo_fence)} />
        <IconBtn icon={Save} onClick={onSaveTemplate} />
        <ChevronDown className="w-4 h-4 text-slate-300 shrink-0" />
      </div>

      {openPanel === "priority" && (
        <div className="mt-2 flex gap-2 flex-wrap">
          {PRIORITIES.map((p) => (
            <button
              key={p}
              onClick={() => { setField("priority", p); setOpenPanel(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${form.priority === p ? "bg-green-700 text-white" : "bg-slate-100 text-slate-600"}`}
            >{p}</button>
          ))}
        </div>
      )}

      {openPanel === "category" && (
        <div className="mt-2 flex gap-2 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => { setField("category", c); setOpenPanel(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${form.category === c ? "bg-green-700 text-white" : "bg-slate-100 text-slate-600"}`}
            >{c}</button>
          ))}
        </div>
      )}

      {openPanel === "repeat" && (
        <div className="mt-2 flex gap-2 flex-wrap">
          {["None", "Daily", "Weekdays", "Weekly", "Monthly"].map((r) => (
            <button
              key={r}
              onClick={() => { setField("repeat_type", r); setField("recurring", r !== "None"); setOpenPanel(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${form.repeat_type === r ? "bg-green-700 text-white" : "bg-slate-100 text-slate-600"}`}
            >{r}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function IconBtn({ icon: Icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${active ? "bg-green-50 text-green-700" : "text-slate-500 hover:bg-slate-100"}`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}