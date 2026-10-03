import React from "react";
import { Plus, Trash2, X } from "lucide-react";
import { ITEM_VALIDATIONS } from "./ValidationPicker";

export default function ChecklistBuilder({ items, setItems }) {
  const add = () => setItems([...items, { label: "", done: false, required: false, validations: [] }]);
  const update = (idx, patch) => setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const remove = (idx) => setItems(items.filter((_, i) => i !== idx));

  const toggleVal = (idx, key) => {
    const v = items[idx].validations || [];
    update(idx, { validations: v.includes(key) ? v.filter((x) => x !== key) : [...v, key] });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-slate-800">Checklist</span>
        <button onClick={add} className="text-xs font-semibold text-green-700 flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> Add Checklist
        </button>
      </div>

      <div className="space-y-3">
        {items.map((item, idx) => (
          <div key={idx} className="bg-white rounded-xl border border-slate-200 p-3">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <span>Required:</span>
                <button
                  onClick={() => update(idx, { required: !item.required })}
                  className={`relative w-9 h-5 rounded-full transition-colors ${item.required ? "bg-green-600" : "bg-slate-300"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${item.required ? "translate-x-4" : ""}`} />
                </button>
              </label>
              <button onClick={() => remove(idx)} className="text-slate-300 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="relative mb-2">
              <input
                value={item.label}
                onChange={(e) => update(idx, { label: e.target.value })}
                placeholder="Enter field title here"
                className="w-full text-sm px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-green-500 pr-8"
              />
              {item.label && (
                <button
                  onClick={() => update(idx, { label: "" })}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <p className="text-[11px] font-semibold text-slate-500 mb-1.5">Validations:</p>
            <div className="grid grid-cols-4 gap-1.5">
              {ITEM_VALIDATIONS.map(({ key, icon: Icon }) => {
                const active = (item.validations || []).includes(key);
                return (
                  <button
                    key={key}
                    onClick={() => toggleVal(idx, key)}
                    className={`flex flex-col items-center gap-1 py-2 rounded-lg border text-[10px] font-medium ${
                      active ? "border-green-600 bg-green-50 text-green-700" : "border-slate-200 text-slate-500"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {key}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}