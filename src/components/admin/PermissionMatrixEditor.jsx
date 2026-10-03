import React from "react";
import { MODULES, ACTIONS } from "@/lib/permissions";

const ACTION_LABELS = { create: "CREATE", read: "READ", update: "UPDATE", delete: "DELETE", export: "EXPORT" };

// Reusable forest-green permission matrix editor.
// Props: matrix (object), onToggle(modKey, action), disabled
export default function PermissionMatrixEditor({ matrix, onToggle, disabled }) {
  return (
    <div className="rounded-3xl overflow-hidden" style={{ backgroundColor: "#0B4C33" }}>
      <div className="px-4 pt-4 pb-2">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-white/70">PERMISSION MATRIX</p>
        <p className="text-xs text-white/60">Tap to toggle. Empty modules grant no access.</p>
      </div>
      <div className="px-3 pb-3 space-y-2.5">
        {MODULES.map((mod) => {
          const row = matrix?.[mod.key] || {};
          return (
            <div key={mod.key} className="rounded-2xl p-3.5" style={{ backgroundColor: "#135D43" }}>
              <p className="text-sm font-bold text-white mb-2.5">{mod.label}</p>
              <div className="flex flex-wrap gap-2">
                {ACTIONS.map((a) => {
                  const on = !!row[a];
                  return (
                    <button
                      key={a}
                      type="button"
                      disabled={disabled}
                      onClick={() => onToggle(mod.key, a)}
                      className="text-[11px] font-semibold tracking-wide px-3 py-1.5 rounded-lg transition-colors text-white disabled:opacity-50"
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
    </div>
  );
}